import type { Client } from 'pg'

export async function dropDatabase(options: { admin: Client; name: string }) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const { rows } = await options.admin.query(
      'select count(*)::int as count from pg_stat_activity where datname = $1',
      [options.name],
    )

    if (rows[0].count === 0) break
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  await options.admin.query(`DROP DATABASE IF EXISTS ${options.name} WITH (FORCE)`)
}
