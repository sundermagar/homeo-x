#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const pgUrl = process.env.PG_DATABASE_URL || process.env.DATABASE_URL || "postgresql://postgres:instep123@localhost:5432/homeo_x";
const schemaName = process.env.PG_SCHEMA_NAME || "tenant_demo_legacy";
const outDir = path.join(__dirname, "../../packages/database/src/schema/legacy");

function toIdentifier(input, fallback) {
  let s = String(input || "").replace(/[^a-zA-Z0-9_]+/g, "_");
  if (!s) s = fallback;
  if (/^[0-9]/.test(s)) s = `col_${s}`;
  s = s.replace(/_+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
  return s;
}

function toTableConstName(tableName) {
  const id = toIdentifier(tableName, "legacyTable");
  return `${id}Legacy`;
}

function pgBuilder(dataType) {
  const t = String(dataType).toLowerCase();
  if (t.includes("timestamp")) return "timestamp";
  if (t === "date") return "date";
  if (t === "boolean") return "boolean";
  if (t === "bigint") return "bigint";
  if (t === "integer" || t === "smallint") return "integer";
  if (t === "numeric" || t === "real" || t === "double precision") return "real";
  if (t === "json" || t === "jsonb") return "jsonb";
  if (t === "bytea") return "text";
  return "text";
}

async function run() {
  const client = new Client({ connectionString: pgUrl });
  await client.connect();

  try {
    fs.mkdirSync(outDir, { recursive: true });

    const tablesRes = await client.query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = $1
       ORDER BY tablename`,
      [schemaName]
    );

    const indexLines = [];
    for (const row of tablesRes.rows) {
      const tableName = row.tablename;
      const colsRes = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, tableName]
      );

      const used = new Set();
      const columnLines = [];
      for (const c of colsRes.rows) {
        const base = toIdentifier(c.column_name, "column");
        let prop = base;
        let i = 2;
        while (used.has(prop)) {
          prop = `${base}${i}`;
          i += 1;
        }
        used.add(prop);

        const builder = pgBuilder(c.data_type);
        const notNull = c.is_nullable === "NO" ? ".notNull()" : "";
        columnLines.push(`  ${prop}: ${builder}("${c.column_name}")${notNull},`);
      }

      const tableConst = toTableConstName(tableName);
      const fileName = `${tableName}.ts`;
      const filePath = path.join(outDir, fileName);

      const imports = ["pgTable", ...new Set(colsRes.rows.map((c) => pgBuilder(c.data_type)))];
      const content = [
        `import { ${imports.join(", ")} } from "drizzle-orm/pg-core";`,
        "",
        `export const ${tableConst} = pgTable("${tableName}", {`,
        ...columnLines,
        "});",
        "",
      ].join("\n");

      fs.writeFileSync(filePath, content, "utf8");
      indexLines.push(`export * from "./${tableName}";`);
    }

    fs.writeFileSync(path.join(outDir, "index.ts"), `${indexLines.join("\n")}\n`, "utf8");
    console.log(`Generated ${tablesRes.rowCount} table schema files in ${outDir}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

