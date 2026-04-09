#!/usr/bin/env node
const path = require("path");
const mysql = require("mysql2/promise");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../MMC-javascript/server/.env") });

const mysqlConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER || "root",
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || "smartb4q_mmc_demo",
  dateStrings: true,
};

const pgUrl = process.env.PG_DATABASE_URL || process.env.DATABASE_URL;
const pgSchema = process.env.PG_TENANT_SCHEMA || "tenant_demo_legacy";
const BATCH = Number(process.env.MIGRATION_BATCH_SIZE || 1000);

function q(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function mapType(c) {
  const dt = String(c.DATA_TYPE || "").toLowerCase();
  const ct = String(c.COLUMN_TYPE || "").toLowerCase();
  if (dt === "tinyint" && ct === "tinyint(1)") return "boolean";
  if (["int", "integer", "mediumint"].includes(dt)) return "integer";
  if (dt === "bigint") return "bigint";
  if (dt === "smallint") return "smallint";
  if (["float"].includes(dt)) return "real";
  if (["double"].includes(dt)) return "double precision";
  if (["decimal", "numeric"].includes(dt)) return "numeric";
  if (["char", "varchar"].includes(dt)) return "text";
  if (dt.includes("text")) return "text";
  if (dt === "json") return "jsonb";
  if (["date"].includes(dt)) return "date";
  if (["datetime", "timestamp"].includes(dt)) return "timestamp";
  if (dt === "time") return "time";
  if (dt.includes("blob") || dt.includes("binary")) return "bytea";
  return "text";
}

function normalize(c, v) {
  if (v == null) {
    if (String(c.IS_NULLABLE || "").toUpperCase() === "NO") {
      const dt = String(c.DATA_TYPE || "").toLowerCase();
      const ct = String(c.COLUMN_TYPE || "").toLowerCase();
      if (dt === "tinyint" && ct === "tinyint(1)") return false;
      if (["int", "integer", "mediumint", "smallint", "bigint", "float", "double", "decimal", "numeric"].includes(dt)) return 0;
      if (["date", "datetime", "timestamp", "time"].includes(dt)) return new Date();
      if (dt === "json") return "{}";
      return "";
    }
    return null;
  }
  const dt = String(c.DATA_TYPE || "").toLowerCase();
  const ct = String(c.COLUMN_TYPE || "").toLowerCase();
  if (dt === "tinyint" && ct === "tinyint(1)") return v === 1 || v === "1" || v === true;
  if ((dt === "date" || dt === "datetime" || dt === "timestamp") && typeof v === "string" && v.startsWith("0000-00-00")) {
    return String(c.IS_NULLABLE || "").toUpperCase() === "NO" ? new Date() : null;
  }
  if (dt === "json" && typeof v !== "string") return JSON.stringify(v);
  return v;
}

async function run() {
  if (!pgUrl) throw new Error("Missing DATABASE_URL/PG_DATABASE_URL");
  const my = await mysql.createConnection(mysqlConfig);
  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  await pg.query(`CREATE SCHEMA IF NOT EXISTS ${q(pgSchema)}`);

  const [tables] = await my.execute(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' ORDER BY TABLE_NAME`,
    [mysqlConfig.database]
  );

  await pg.query("BEGIN");
  try {
    for (const t of tables.map((x) => x.TABLE_NAME)) {
      const [cols] = await my.execute(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, ORDINAL_POSITION
         FROM information_schema.columns
         WHERE table_schema=? AND table_name=?
         ORDER BY ORDINAL_POSITION`,
        [mysqlConfig.database, t]
      );

      const [pkRows] = await my.execute(
        `SELECT k.COLUMN_NAME
         FROM information_schema.table_constraints t
         JOIN information_schema.key_column_usage k
           ON t.constraint_name=k.constraint_name AND t.table_schema=k.table_schema AND t.table_name=k.table_name
         WHERE t.table_schema=? AND t.table_name=? AND t.constraint_type='PRIMARY KEY'
         ORDER BY k.ORDINAL_POSITION`,
        [mysqlConfig.database, t]
      );
      const pk = pkRows.map((r) => r.COLUMN_NAME);

      const defs = cols.map((c) => `${q(c.COLUMN_NAME)} ${mapType(c)}${c.IS_NULLABLE === "NO" ? " NOT NULL" : ""}`);
      if (pk.length) defs.push(`PRIMARY KEY (${pk.map(q).join(", ")})`);
      const full = `${q(pgSchema)}.${q(t)}`;

      await pg.query(`DROP TABLE IF EXISTS ${full} CASCADE`);
      await pg.query(`CREATE TABLE ${full} (${defs.join(", ")})`);

      const [[cntObj]] = await my.query(`SELECT COUNT(*) as c FROM \`${t}\``);
      const total = Number(cntObj.c || 0);
      let offset = 0;
      const names = cols.map((c) => c.COLUMN_NAME);
      while (offset < total) {
        const [rows] = await my.query(`SELECT * FROM \`${t}\` LIMIT ? OFFSET ?`, [BATCH, offset]);
        if (!rows.length) break;
        const vals = [];
        const ph = rows
          .map((r, ri) => {
            const inner = names.map((n, ci) => {
              vals.push(normalize(cols[ci], r[n]));
              return `$${ri * names.length + ci + 1}`;
            });
            return `(${inner.join(",")})`;
          })
          .join(",");
        await pg.query(`INSERT INTO ${full} (${names.map(q).join(",")}) VALUES ${ph}`, vals);
        offset += rows.length;
      }
      console.log(`migrated ${t}`);
    }
    await pg.query("COMMIT");
  } catch (e) {
    await pg.query("ROLLBACK");
    throw e;
  } finally {
    await my.end();
    await pg.end();
  }
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

