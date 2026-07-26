#!/usr/bin/env node
/**
 * Audit consolidated Supabase migration for duplicates and dependency issues.
 */
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION = path.resolve(
  import.meta.dirname,
  '../supabase/migrations/20260725000000_initial_schema.sql'
);
const sql = fs.readFileSync(MIGRATION, 'utf8');
const lines = sql.split('\n');

function findAll(regex, label) {
  const matches = [];
  let m;
  const re = new RegExp(regex, 'gim');
  while ((m = re.exec(sql)) !== null) {
    matches.push({ label, match: m[0], index: m.index, groups: m.slice(1) });
  }
  return matches;
}

function lineNum(index) {
  return sql.slice(0, index).split('\n').length;
}

function groupDuplicates(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].filter(([, v]) => v.length > 1);
}

// --- Parse schema objects ---
const tables = new Set();
for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gi)) {
  tables.add(m[1].toLowerCase());
}

const types = new Set();
for (const m of sql.matchAll(/CREATE TYPE (?:public\.)?(\w+)/gi)) {
  types.add(m[1].toLowerCase());
}

const functions = new Map(); // name -> [{line}]
for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)\s*\(/gi)) {
  const name = m[1].toLowerCase();
  if (!functions.has(name)) functions.set(name, []);
  functions.get(name).push(lineNum(m.index));
}

const triggers = [];
for (const m of sql.matchAll(
  /CREATE TRIGGER (\w+)\s+[\s\S]*?ON (?:public\.)?(\w+)/gi
)) {
  triggers.push({ name: m[1].toLowerCase(), table: m[2].toLowerCase(), line: lineNum(m.index) });
}

const policies = [];
for (const m of sql.matchAll(
  /CREATE POLICY "([^"]+)" ON (?:public\.)?(\w+)/gi
)) {
  policies.push({ name: m[1], table: m[2].toLowerCase(), line: lineNum(m.index) });
}

const indexes = [];
for (const m of sql.matchAll(
  /CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)\s+ON (?:public\.)?(\w+)\s*\(([^)]+)\)/gi
)) {
  indexes.push({ name: m[1].toLowerCase(), table: m[2].toLowerCase(), cols: m[3], line: lineNum(m.index) });
}

const addColumns = [];
for (const m of sql.matchAll(
  /ALTER TABLE (?:public\.)?(\w+)\s*\n\s*ADD COLUMN IF NOT EXISTS (\w+)/gi
)) {
  addColumns.push({ table: m[1].toLowerCase(), column: m[2].toLowerCase(), line: lineNum(m.index) });
}

const publications = [];
for (const m of sql.matchAll(
  /ALTER PUBLICATION supabase_realtime ADD TABLE (?:public\.)?(\w+)/gi
)) {
  publications.push({ table: m[1].toLowerCase(), line: lineNum(m.index) });
}

// Table columns from CREATE TABLE blocks (simplified parser)
const tableColumns = new Map();
const createTableRe = /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
let ct;
while ((ct = createTableRe.exec(sql)) !== null) {
  const tname = ct[1].toLowerCase();
  const body = ct[2];
  const cols = new Set();
  for (const line of body.split('\n')) {
    const col = line.trim().match(/^(\w+)\s+/);
    if (col && !['primary', 'unique', 'check', 'constraint', 'foreign'].includes(col[1].toLowerCase())) {
      cols.add(col[1].toLowerCase());
    }
    const inline = line.match(/^\s*(\w+)\s+[A-Z]/i);
    if (inline) cols.add(inline[1].toLowerCase());
  }
  tableColumns.set(tname, cols);
}

// Apply ADD COLUMN to tableColumns
for (const ac of addColumns) {
  if (!tableColumns.has(ac.table)) tableColumns.set(ac.table, new Set());
  tableColumns.get(ac.table).add(ac.column);
}

// FK references
const fkIssues = [];
for (const m of sql.matchAll(
  /REFERENCES (?:public\.)?(\w+)\((\w+)\)/gi
)) {
  const refTable = m[1].toLowerCase();
  if (refTable !== 'auth' && !tables.has(refTable)) {
    fkIssues.push({ refTable, line: lineNum(m.index), text: m[0] });
  }
}

// Trigger function refs
const triggerFnIssues = [];
for (const m of sql.matchAll(
  /EXECUTE FUNCTION (?:public\.)?(\w+)\s*\(\)/gi
)) {
  const fn = m[1].toLowerCase();
  if (!functions.has(fn) && fn !== 'moddatetime') {
    triggerFnIssues.push({ fn, line: lineNum(m.index) });
  }
}

// Policy table refs
const policyIssues = policies.filter((p) => !tables.has(p.table));

// Publication table refs
const publicationIssues = publications.filter((p) => !tables.has(p.table));

// Duplicates
const dupTables = groupDuplicates(
  [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gi)].map((m) => ({
    name: m[1].toLowerCase(),
    line: lineNum(m.index),
  })),
  (x) => x.name
);

const dupTypes = groupDuplicates(
  [...sql.matchAll(/CREATE TYPE (?:public\.)?(\w+)/gi)].map((m) => ({
    name: m[1].toLowerCase(),
    line: lineNum(m.index),
  })),
  (x) => x.name
);

const dupFunctions = groupDuplicates(
  [...functions.entries()].flatMap(([name, lines]) => lines.map((l) => ({ name, line: l }))),
  (x) => x.name
);

const dupTriggers = groupDuplicates(triggers, (x) => `${x.table}.${x.name}`);

const dupPolicies = groupDuplicates(policies, (x) => `${x.table}|${x.name}`);

const dupIndexes = groupDuplicates(indexes, (x) => x.name);

const dupAddColumns = groupDuplicates(addColumns, (x) => `${x.table}.${x.column}`);

const dupPublications = groupDuplicates(publications, (x) => x.table);

// Index column check (basic)
const indexIssues = [];
for (const idx of indexes) {
  const cols = tableColumns.get(idx.table);
  if (!cols) {
    indexIssues.push({ ...idx, issue: 'table missing' });
    continue;
  }
  const colNames = idx.cols.split(',').map((c) =>
    c.trim().replace(/\s+(ASC|DESC)$/i, '').replace(/\s+WHERE.*$/i, '').split(/\s/)[0].toLowerCase()
  );
  for (const col of colNames) {
    if (col && !cols.has(col) && col !== 'bucket_id') {
      indexIssues.push({ ...idx, issue: `column ${col} missing on ${idx.table}` });
    }
  }
}

const report = {
  tables: tables.size,
  types: types.size,
  functions: functions.size,
  triggers: triggers.length,
  indexes: indexes.length,
  policies: policies.length,
  publications: publications.length,
  hasEventChatMutes: tables.has('event_chat_mutes'),
  hasNotifications: tables.has('notifications'),
  dupTables,
  dupTypes,
  dupFunctions,
  dupTriggers,
  dupPolicies,
  dupIndexes,
  dupAddColumns,
  dupPublications,
  fkIssues,
  triggerFnIssues,
  policyIssues,
  publicationIssues,
  indexIssues,
};

console.log(JSON.stringify(report, null, 2));
