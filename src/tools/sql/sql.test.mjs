import { test } from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { sampleSql, TABLES } from './sample.ts';
import { EXAMPLES, POSTGRES_EXAMPLES } from './examples.ts';

const SQL = await initSqlJs();
const open = locale => { const db = new SQL.Database(); db.exec(sampleSql(locale)); return db; };
const one = (db, sql) => db.exec(sql)[0].values;

test('the sample shop is the same in every language but for its words', () => {
  for (const locale of ['ja', 'en', 'zh']) {
    const db = open(locale);
    assert.deepEqual(one(db, 'SELECT COUNT(*) FROM products UNION ALL SELECT COUNT(*) FROM customers UNION ALL SELECT COUNT(*) FROM orders').flat(), [10, 6, 20]);
    // Customer 6 never ordered and product 10 was never bought (the LEFT JOIN and NOT IN examples rely on it).
    assert.deepEqual(one(db, 'SELECT id FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)').flat(), [6]);
    assert.deepEqual(one(db, 'SELECT id FROM products WHERE id NOT IN (SELECT product_id FROM orders)').flat(), [10]);
    for (const table of TABLES) assert.deepEqual(db.exec(`SELECT * FROM ${table.name} LIMIT 0`)[0]?.columns ?? db.exec(`PRAGMA table_info(${table.name})`)[0].values.map(r => r[1]), table.columns.map(c => c.split(' ')[0]));
  }
});

test('a quote in a name is escaped', () => {
  assert.match(sampleSql('en'), /'Green tea'/);
  assert.doesNotThrow(() => open('zh'));
});

test('every example runs on the sample and returns rows', () => {
  for (const example of EXAMPLES) {
    const db = open('ja');
    const results = db.exec(example.code);
    assert.ok(results.length > 0 && results.every(r => r.values.length > 0), example.id);
  }
});


test('PostgreSQL supports the localized shop and every dialect-specific example', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = await PGlite.create();
  try {
    for (const locale of ['ja', 'en', 'zh']) {
      await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await db.exec(sampleSql(locale));
      assert.deepEqual((await db.query('SELECT COUNT(*) AS n FROM products UNION ALL SELECT COUNT(*) FROM customers UNION ALL SELECT COUNT(*) FROM orders')).rows.map(r => Number(r.n)), [10, 6, 20]);
    }
    for (const example of POSTGRES_EXAMPLES) {
      await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await db.exec(sampleSql('en'));
      const results = await db.exec(example.code);
      assert.ok(results.some(r => r.fields.length && r.rows.length), example.id);
      if (example.id === 'window') assert.deepEqual(results[0].rows.map(r => r.month), ['2026-01', '2026-02', '2026-03', '2026-04']);
    }
  } finally { await db.close(); }
});
