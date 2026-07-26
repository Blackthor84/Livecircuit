#!/usr/bin/env node
/**
 * Consolidate supabase/migrations_archive/*.sql into a single initial schema.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const ARCHIVE_DIR = path.join(ROOT, 'supabase', 'migrations_archive');
const OUTPUT_FILE = path.join(MIGRATIONS_DIR, '20260725000000_initial_schema.sql');

function removeObsoleteHandleNewUser(sql) {
  return sql
    .replace(
      /-- Auto-create profile on signup\r?\nCREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;\r?\n\r?\n/,
      '-- (superseded handle_new_user removed; see auth_roles section)\n\n'
    )
    .replace(
      /CREATE TRIGGER on_auth_user_created\r?\n\s+AFTER INSERT ON auth\.users\r?\n\s+FOR EACH ROW EXECUTE FUNCTION public\.handle_new_user\(\);\r?\n\r?\n/,
      '-- (on_auth_user_created trigger moved to auth_roles section)\n\n'
    );
}

function ensureAuthUserTrigger(sql) {
  if (/CREATE TRIGGER on_auth_user_created/i.test(sql)) return sql;
  return sql.replace(
    /(\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;\r?\n\r?\n)(CREATE OR REPLACE FUNCTION public\.on_profile_role_artist)/,
    `$1DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;\nCREATE TRIGGER on_auth_user_created\n  AFTER INSERT ON auth.users\n  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();\n\n$2`
  );
}


function dedupeAlterBlocks(sql) {
  const seen = new Set();
  const lines = sql.split('\n');
  const out = [];
  let pendingTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const alterMatch = line.match(
      /^ALTER TABLE\s+(?:public\.)?(\w+)\s*$/i
    );
    if (alterMatch) {
      pendingTable = alterMatch[1].toLowerCase();
      const next = lines[i + 1] ?? '';
      const colMatch = next.match(/^\s*ADD COLUMN IF NOT EXISTS\s+(\w+)/i);
      if (colMatch) {
        const key = `${pendingTable}.${colMatch[1].toLowerCase()}`;
        if (seen.has(key)) {
          // Skip ALTER TABLE line and ADD COLUMN line(s) until blank or non-continuation
          i++;
          while (i + 1 < lines.length && /^\s*ADD COLUMN IF NOT EXISTS/i.test(lines[i + 1])) {
            i++;
          }
          pendingTable = null;
          continue;
        }
        seen.add(key);
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

function dedupePublicationAdds(sql) {
  const REALTIME_TABLES = [
    'chat_messages',
    'reactions',
    'events',
    'direct_messages',
    'event_chat_mutes',
    'notifications',
  ];

  const without = sql
    .split('\n')
    .filter((line) => !/ALTER PUBLICATION supabase_realtime ADD TABLE/i.test(line))
    .join('\n');

  const marker =
    '-- ---------------------------------------------------------------------------\n-- 20250721000008_admin_moderation.sql';
  const block = `-- ---------------------------------------------------------------------------
-- Supabase Realtime publication (consolidated)
-- ---------------------------------------------------------------------------

${REALTIME_TABLES.map((t) => `ALTER PUBLICATION supabase_realtime ADD TABLE public.${t};`).join('\n')}

${marker}`;

  if (without.includes(marker)) {
    return without.replace(marker, block);
  }

  return `${without.trim()}\n\n${block.replace(marker, '')}\n`;
}

function main() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const isMigrationFile = (f) =>
    /^\d{14}_.+\.sql$/.test(f) && f !== '20260725000000_initial_schema.sql';

  let sourceFiles = fs.readdirSync(MIGRATIONS_DIR).filter(isMigrationFile).sort();

  if (sourceFiles.length > 0) {
    for (const file of sourceFiles) {
      fs.copyFileSync(
        path.join(MIGRATIONS_DIR, file),
        path.join(ARCHIVE_DIR, file)
      );
    }
  }

  const files = fs.readdirSync(ARCHIVE_DIR).filter(isMigrationFile).sort();

  if (files.length === 0) {
    console.error('No migration files found.');
    process.exit(1);
  }

  const sections = [
    `-- LiveCircuit consolidated initial schema`,
    `-- Generated from ${files.length} archived migrations on ${new Date().toISOString().slice(0, 10)}`,
    `-- Source: supabase/migrations_archive/`,
    `-- Includes extensions, enums, tables, indexes, functions, triggers, RLS, storage, realtime, and seed data.`,
    ``,
  ];

  for (const file of files) {
    let content = fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8').trim();
    if (file === '20250720000000_initial_schema.sql') {
      content = removeObsoleteHandleNewUser(content);
    }
    if (file === '20250721000001_auth_roles.sql') {
      content = ensureAuthUserTrigger(content);
    }
    sections.push(`-- ---------------------------------------------------------------------------`);
    sections.push(`-- ${file}`);
    sections.push(`-- ---------------------------------------------------------------------------`);
    sections.push('');
    sections.push(content);
    sections.push('');
  }

  let consolidated = sections.join('\n');
  consolidated = dedupeAlterBlocks(consolidated);
  consolidated = dedupePublicationAdds(consolidated);

  fs.writeFileSync(OUTPUT_FILE, `${consolidated}\n`, 'utf8');

  for (const file of sourceFiles) {
    fs.unlinkSync(path.join(MIGRATIONS_DIR, file));
  }

  console.log(`Archived ${files.length} migrations to ${ARCHIVE_DIR}`);
  console.log(`Wrote ${OUTPUT_FILE} (${fs.statSync(OUTPUT_FILE).size} bytes)`);
}

main();
