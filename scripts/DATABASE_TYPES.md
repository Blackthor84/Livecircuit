# Generated Supabase types

After linking your project (`npx supabase link`), regenerate types from the remote schema:

```bash
npm run db:types
```

Output: `src/types/database.generated.ts`

To use in the app, extend or replace the hand-maintained types in `src/types/supabase.ts` and `src/types/database.ts` as needed. Commit generated files in CI after migrations land.

Local database (Supabase CLI running):

```bash
npx supabase gen types typescript --local > src/types/database.generated.ts
```
