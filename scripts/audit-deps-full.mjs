#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(
  path.resolve(import.meta.dirname, '../supabase/migrations/20260725000000_initial_schema.sql'),
  'utf8'
);
const line = (idx) => sql.slice(0, idx).split('\n').length;
const issues = [];

const fnPos = new Map();
for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)/gi)) {
  fnPos.set(m[1].toLowerCase(), line(m.index));
}

const tablePos = new Map();
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gm)) {
  tablePos.set(m[1].toLowerCase(), line(m.index));
}

const typePos = new Map();
for (const m of sql.matchAll(/^CREATE TYPE (?:public\.)?(\w+)/gm)) {
  typePos.set(m[1].toLowerCase(), line(m.index));
}

// Policies referencing is_admin_profile before function exists
const adminFnLine = fnPos.get('is_admin_profile') ?? Infinity;
for (const m of sql.matchAll(/CREATE POLICY "[^"]+"[\s\S]*?;/g)) {
  if (/is_admin_profile\s*\(\)/.test(m[0])) {
    const l = line(m.index);
    if (l < adminFnLine) {
      issues.push({ type: 'policy_before_function', fn: 'is_admin_profile', line: l });
    }
  }
}

// Policies referencing is_sponsor_org_member before function
const sponsorFnLine = fnPos.get('is_sponsor_org_member') ?? Infinity;
for (const m of sql.matchAll(/CREATE POLICY "[^"]+"[\s\S]*?;/g)) {
  if (/is_sponsor_org_member\s*\(\)/.test(m[0])) {
    const l = line(m.index);
    if (l < sponsorFnLine) {
      issues.push({ type: 'policy_before_function', fn: 'is_sponsor_org_member', line: l });
    }
  }
}

// Enum used before created (in CREATE TABLE bodies only, line-order)
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gm)) {
  const tblLine = line(m.index);
  for (const um of m[2].matchAll(/\bpublic\.(\w+)\b/g)) {
    const name = um[1].toLowerCase();
    if (typePos.has(name) && typePos.get(name) > tblLine) {
      issues.push({ type: 'enum_after_table_use', enum: name, table: m[1], tableLine: tblLine, enumLine: typePos.get(name) });
    }
  }
}

// RLS before table
for (const m of sql.matchAll(/^ALTER TABLE (?:public\.)?(\w+) ENABLE ROW LEVEL SECURITY/gm)) {
  const t = m[1].toLowerCase();
  const l = line(m.index);
  const tp = tablePos.get(t);
  if (!tp) issues.push({ type: 'rls_unknown_table', table: t, line: l });
  else if (tp > l) issues.push({ type: 'rls_before_table', table: t, line: l, tableLine: tp });
}

// Index before table
for (const m of sql.matchAll(/^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?\w+ ON (?:public\.)?(\w+)/gm)) {
  const t = m[1].toLowerCase();
  const l = line(m.index);
  const tp = tablePos.get(t);
  if (!tp) issues.push({ type: 'index_unknown_table', table: t, line: l });
  else if (tp > l) issues.push({ type: 'index_before_table', table: t, line: l, tableLine: tp });
}

// FK in CREATE TABLE where target table created later (without deferred fix)
const deferredFks = new Set();
for (const m of sql.matchAll(/ALTER TABLE (?:public\.)?(\w+) ADD CONSTRAINT \w+\s+FOREIGN KEY/gi)) {
  deferredFks.add(m[1].toLowerCase());
}
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gm)) {
  const src = m[1].toLowerCase();
  const srcLine = line(m.index);
  for (const ref of m[2].matchAll(/REFERENCES (?:public\.)?(\w+)\(/gi)) {
    const tgt = ref[1].toLowerCase();
    if (tgt === 'auth') continue;
    const tgtLine = tablePos.get(tgt);
    if (!tgtLine) issues.push({ type: 'fk_missing_target', src, tgt, line: srcLine });
    else if (tgtLine > srcLine && src !== tgt && !deferredFks.has(src)) {
      issues.push({ type: 'fk_order', src, tgt, line: srcLine, tgtLine });
    }
  }
}

// Extensions
if (!/CREATE EXTENSION IF NOT EXISTS "pgcrypto"/.test(sql)) issues.push({ type: 'missing_extension', name: 'pgcrypto' });
if (!/CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/.test(sql) && !/gen_random_uuid\(\)/.test(sql)) {
  // gen_random_uuid from pgcrypto in PG13+
}

// Duplicate CREATE TABLE
const seenTables = new Map();
for (const m of sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gm)) {
  const t = m[1].toLowerCase();
  const l = line(m.index);
  if (seenTables.has(t)) issues.push({ type: 'duplicate_table', table: t, lines: [seenTables.get(t), l] });
  else seenTables.set(t, l);
}

// Duplicate CREATE TYPE
const seenTypes = new Map();
for (const m of sql.matchAll(/^CREATE TYPE (?:public\.)?(\w+)/gm)) {
  const t = m[1].toLowerCase();
  const l = line(m.index);
  if (seenTypes.has(t)) issues.push({ type: 'duplicate_type', type: t, lines: [seenTypes.get(t), l] });
  else seenTypes.set(t, l);
}

console.log(JSON.stringify({ issueCount: issues.length, issues }, null, 2));
