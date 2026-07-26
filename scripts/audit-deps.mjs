#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(
  path.resolve(import.meta.dirname, '../supabase/migrations/20260725000000_initial_schema.sql'),
  'utf8'
);

const tableOrder = [];
for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)/gi)) {
  tableOrder.push({ name: m[1].toLowerCase(), pos: m.index });
}
const tablePos = new Map(tableOrder.map((t) => [t.name, t.pos]));

const fkOrderIssues = [];
for (const m of sql.matchAll(
  /CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi
)) {
  const src = m[1].toLowerCase();
  const body = m[2];
  const srcPos = m.index;
  for (const ref of body.matchAll(/REFERENCES (?:public\.)?(\w+)\(/gi)) {
    const tgt = ref[1].toLowerCase();
    if (tgt === 'auth') continue;
    const tgtPos = tablePos.get(tgt);
    if (tgtPos === undefined) {
      fkOrderIssues.push({ type: 'missing_table', src, tgt, line: sql.slice(0, srcPos).split('\n').length });
    } else if (tgtPos > srcPos && tgt !== src) {
      fkOrderIssues.push({ type: 'order', src, tgt, line: sql.slice(0, srcPos).split('\n').length });
    }
  }
}

// ALTER TABLE ADD COLUMN FK order
for (const m of sql.matchAll(
  /ALTER TABLE (?:public\.)?(\w+)[\s\S]*?ADD COLUMN IF NOT EXISTS \w+[^;]*REFERENCES (?:public\.)?(\w+)/gi
)) {
  const src = m[1].toLowerCase();
  const tgt = m[2].toLowerCase();
  const pos = m.index;
  const tgtPos = tablePos.get(tgt);
  if (!tgtPos) fkOrderIssues.push({ type: 'alter_missing_table', src, tgt, line: sql.slice(0, pos).split('\n').length });
  else if (tgtPos > pos) fkOrderIssues.push({ type: 'alter_order', src, tgt, line: sql.slice(0, pos).split('\n').length });
}

// Function order vs trigger
const fnPos = new Map();
for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (?:public\.)?(\w+)/gi)) {
  fnPos.set(m[1].toLowerCase(), m.index);
}
const fnOrderIssues = [];
for (const m of sql.matchAll(/CREATE TRIGGER (\w+)[\s\S]*?EXECUTE FUNCTION (?:public\.)?(\w+)\(\)/gi)) {
  const fn = m[2].toLowerCase();
  const trigPos = m.index;
  const fp = fnPos.get(fn);
  if (fp === undefined) fnOrderIssues.push({ fn, line: sql.slice(0, trigPos).split('\n').length, issue: 'missing' });
  else if (fp > trigPos) fnOrderIssues.push({ fn, line: sql.slice(0, trigPos).split('\n').length, issue: 'order' });
}

console.log(JSON.stringify({ fkOrderIssues, fnOrderIssues }, null, 2));
