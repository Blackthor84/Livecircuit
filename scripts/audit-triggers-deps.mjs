#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(
  import.meta.dirname,
  '../supabase/migrations/20260725000000_initial_schema.sql'
);
const sql = fs.readFileSync(file, 'utf8');
const line = (idx) => sql.slice(0, idx).split('\n').length;

const issues = [];
const fixes = [];

// --- Functions ---
const functions = new Map();
for (const m of sql.matchAll(
  /CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)\s*(?:\([\s\S]*?\))?\s*(?:RETURNS[\s\S]*?)?(?:AS \$\$|RETURNS)/gi
)) {
  // simpler pass
}
for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)/gi)) {
  if (!functions.has(m[1].toLowerCase())) functions.set(m[1].toLowerCase(), line(m.index));
}

// Better function parse with AS $$ or LANGUAGE
const fnBlocks = [];
for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)[\s\S]*?(?:\$\$;|\$\$\s+LANGUAGE)/gi)) {
  fnBlocks.push({ name: m[1].toLowerCase(), line: line(m.index), end: line(m.index + m[0].length) });
}

// --- Triggers ---
const explicitTriggers = [];
for (const m of sql.matchAll(
  /CREATE TRIGGER (\w+)\s+([\s\S]*?)EXECUTE FUNCTION (?:public\.)?(\w+)\s*\(\)/gi
)) {
  explicitTriggers.push({
    name: m[1].toLowerCase(),
    fn: m[3].toLowerCase(),
    line: line(m.index),
    raw: m[0].slice(0, 120),
  });
}

// DO block set_updated_at tables
const doTriggerTables = [];
for (const m of sql.matchAll(
  /EXECUTE format\(\s*'CREATE TRIGGER (\w+) BEFORE UPDATE ON public\.%I[\s\S]*?SELECT unnest\(ARRAY\[([\s\S]*?)\]\)/gi
)) {
  // wrong order - find DO blocks differently
}
for (const m of sql.matchAll(
  /SELECT unnest\(ARRAY\[([\s\S]*?)\]\)\s*\n\s*LOOP\s*\n\s*EXECUTE format\(\s*'CREATE TRIGGER (\w+)/gi
)) {
  const tables = [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1].toLowerCase());
  for (const t of tables) {
    doTriggerTables.push({ trigger: m[2].toLowerCase(), table: t, fn: 'set_updated_at' });
  }
}

// handle_new_user / on_auth_user_created
const handleNewUser = fnBlocks.find((f) => f.name === 'handle_new_user');
const authTrigger = explicitTriggers.find((t) => t.name === 'on_auth_user_created');

if (!handleNewUser) issues.push({ type: 'missing_function', name: 'handle_new_user' });
if (!authTrigger) issues.push({ type: 'missing_trigger', name: 'on_auth_user_created' });
if (handleNewUser && authTrigger && authTrigger.line < handleNewUser.line) {
  issues.push({
    type: 'trigger_before_function',
    trigger: 'on_auth_user_created',
    fn: 'handle_new_user',
    triggerLine: authTrigger.line,
    fnLine: handleNewUser.line,
  });
}
if (authTrigger && authTrigger.fn !== 'handle_new_user') {
  issues.push({ type: 'wrong_trigger_fn', trigger: authTrigger.name, fn: authTrigger.fn });
}

// Trigger/function integrity
for (const t of explicitTriggers) {
  const fnLine = functions.get(t.fn);
  if (!fnLine && t.fn !== 'moddatetime') {
    issues.push({ type: 'missing_trigger_function', trigger: t.name, fn: t.fn, line: t.line });
  } else if (fnLine && fnLine > t.line) {
    issues.push({ type: 'trigger_before_function', trigger: t.name, fn: t.fn, triggerLine: t.line, fnLine });
  }
}

// Duplicate triggers (same name + table approximation)
const triggerNames = explicitTriggers.map((t) => t.name);
const dupTriggerNames = triggerNames.filter((n, i) => triggerNames.indexOf(n) !== i);
if (dupTriggerNames.length) {
  issues.push({ type: 'duplicate_trigger_names', names: [...new Set(dupTriggerNames)] });
}

// Duplicate on_auth_user_created count
const authCount = explicitTriggers.filter((t) => t.name === 'on_auth_user_created').length;
if (authCount > 1) issues.push({ type: 'duplicate_auth_trigger', count: authCount });

// Types before tables
const types = new Map();
for (const m of sql.matchAll(/^CREATE TYPE (?:public\.)?(\w+)/gm)) {
  types.set(m[1].toLowerCase(), line(m.index));
}
const tables = new Map();
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gm)) {
  tables.set(m[1].toLowerCase(), line(m.index));
}

for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gm)) {
  const tbl = m[1].toLowerCase();
  const tblLine = line(m.index);
  for (const typeUse of m[2].matchAll(/public\.(\w+)/g)) {
    const t = typeUse[1].toLowerCase();
    if (types.has(t) && types.get(t) > tblLine) {
      issues.push({ type: 'type_after_table', table: tbl, enum: t, tableLine: tblLine, typeLine: types.get(t) });
    }
  }
}

// FK order in CREATE TABLE
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gm)) {
  const src = m[1].toLowerCase();
  const srcLine = line(m.index);
  for (const ref of m[2].matchAll(/REFERENCES (?:public\.)?(\w+)\(/gi)) {
    const tgt = ref[1].toLowerCase();
    if (tgt === 'auth') continue;
    const tgtLine = tables.get(tgt);
    if (!tgtLine) issues.push({ type: 'fk_missing_table', src, tgt, line: srcLine });
    else if (tgtLine > srcLine && src !== tgt) {
      // allow tickets->orders pattern if constraint added later
      const hasDeferred = sql.includes(`ALTER TABLE public.${src} ADD CONSTRAINT`);
    }
  }
}

// Publication vs tables
for (const m of sql.matchAll(/ALTER PUBLICATION supabase_realtime ADD TABLE (?:public\.)?(\w+)/gi)) {
  const t = m[1].toLowerCase();
  const pubLine = line(m.index);
  const tblLine = tables.get(t);
  if (!tblLine) issues.push({ type: 'publication_missing_table', table: t, line: pubLine });
  else if (tblLine > pubLine) issues.push({ type: 'publication_before_table', table: t, tableLine: tblLine, pubLine });
}

const pubTables = [...sql.matchAll(/ALTER PUBLICATION supabase_realtime ADD TABLE (?:public\.)?(\w+)/gi)].map((m) => m[1].toLowerCase());
const dupPub = pubTables.filter((t, i) => pubTables.indexOf(t) !== i);

console.log(
  JSON.stringify(
    {
      handleNewUser,
      authTrigger,
      explicitTriggers,
      doTriggerTablesCount: doTriggerTables.length,
      functions: [...functions.entries()],
      fnBlocks,
      issues,
      dupPub: [...new Set(dupPub)],
      publicationCount: pubTables.length,
    },
    null,
    2
  )
);
