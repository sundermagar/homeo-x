#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const pgUrl = process.env.PG_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:instep123@localhost:5432/homeo_x";
const schemaName = process.env.PG_SCHEMA_NAME || "tenant_demo_legacy";
const outFile = process.env.OUT_FILE || path.join(__dirname, "../../packages/database/src/schema/tenant-demo-legacy-schema.ts");

async function run() {
  const client = new Client({ connectionString: pgUrl });
  await client.connect();
  try {
    const tablesRes = await client.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = $1
       ORDER BY tablename`,
      [schemaName]
    );

    const lines = [];
    lines.push("/**");
    lines.push(` * Generated schema manifest for ${schemaName}.`);
    lines.push(" * Source: PostgreSQL information_schema.");
    lines.push(" */");
    lines.push(`export const ${schemaName}Schema = {`);

    for (const row of tablesRes.rows) {
      const table = row.tablename;
      const colsRes = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, table]
      );
      lines.push(`  "${table}": [`);
      for (const col of colsRes.rows) {
        lines.push(
          `    { name: "${col.column_name}", type: "${col.data_type}", nullable: ${col.is_nullable === "YES"} },`
        );
      }
      lines.push("  ],");
    }

    lines.push("} as const;");
    lines.push("");

    fs.writeFileSync(outFile, lines.join("\n"), "utf8");
    console.log(`Generated ${tablesRes.rowCount} tables -> ${outFile}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

