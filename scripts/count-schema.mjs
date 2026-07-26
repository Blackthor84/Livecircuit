#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(
  path.resolve(import.meta.dirname, '../supabase/migrations/20260725000000_initial_schema.sql'),
  'utf8'
);

const tables = [...sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gm)].map((m) => m[1].toLowerCase());
const types = [...sql.matchAll(/^CREATE TYPE public\.(\w+)/gm)].map((m) => m[1]);
const funcs = [...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/g)].map((m) => m[1]);
const policies = [...sql.matchAll(/CREATE POLICY "[^"]+" ON (?:public\.)?(\w+)/g)];
const indexes = [...sql.matchAll(/^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\w+)/gm)];
const pubs = [...sql.matchAll(/ALTER PUBLICATION supabase_realtime ADD TABLE public\.(\w+)/g)].map((m) => m[1]);
const explicitTriggers = [...sql.matchAll(/^CREATE TRIGGER (\w+)/gm)];
let updatedAtTables = 0;
for (const b of sql.matchAll(/SELECT unnest\(ARRAY\[([\s\S]*?)\]\)/g)) {
  if (b[1].includes("'countries'") || b[1].includes("'venue_types'")) {
    updatedAtTables += b[1].split(',').filter((x) => /'/.test(x)).length;
  }
}

console.log(
  JSON.stringify(
    {
      tables: tables.length,
      uniqueTables: new Set(tables).size,
      enums: types.length,
      functions: new Set(funcs).size,
      functionDefinitions: funcs.length,
      rlsPolicies: policies.filter((p) => p[1] !== 'storage').length,
      storagePolicies: policies.filter((p) => p[1] === 'storage').length,
      indexes: indexes.length,
      publicationTables: pubs.length,
      publicationTableList: pubs,
      explicitTriggers: explicitTriggers.length,
      updatedAtTriggerTables: updatedAtTables,
      totalTriggers: explicitTriggers.length + updatedAtTables,
    },
    null,
    2
  )
);
