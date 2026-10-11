// Applies all migrations to an in-memory PGlite database and reports errors. Usage: npx tsx scripts/check-migrations.ts
import { createTestDb } from '../tests/db/harness'

createTestDb()
  .then(async (t) => {
    const { rows } = await t.pg.query<{ n: number }>('select count(*)::int as n from public.categories')
    console.log(`Migrations applied successfully (${rows[0].n} categories).`)
    await t.close()
  })
  .catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
