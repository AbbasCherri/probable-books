// Schema check: applies the migration to an in-process Postgres (PGlite) and verifies every rule.
// Run: npm run test:schema   (needs devDependency @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { readFileSync } from 'node:fs'

const up = readFileSync(new URL('../src/db/migrations/001_init.sql', import.meta.url), 'utf8')
const down = readFileSync(new URL('../src/db/migrations/001_init.down.sql', import.meta.url), 'utf8')
const db = new PGlite({ extensions: { pg_trgm } })

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  cond ? pass++ : fail++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`)
}
// Expect a statement to be rejected; optionally with a SQLSTATE code.
async function rejects(name, sql, code) {
  try {
    await db.exec(sql)
    ok(name, false, 'was accepted')
  } catch (e) {
    ok(name, !code || e.code === code, `got ${e.code}: ${e.message}`)
  }
}
const accepts = async (name, sql) => {
  try { await db.exec(sql); ok(name, true) } catch (e) { ok(name, false, `${e.code}: ${e.message}`) }
}
const q = async (sql, params) => (await db.query(sql, params)).rows

// ---- apply (as the migration runner would: one transaction) ----
await db.exec('BEGIN;\n' + up + '\nCOMMIT;')
ok('up migration applies', true)

// ---- reset round trip: down then up again ----
await db.exec('BEGIN;\n' + down + '\nCOMMIT;')
const left = await q(`select count(*)::int n from information_schema.tables where table_schema='public'`)
ok('down migration removes every table', left[0].n === 0, JSON.stringify(left))
const types = await q(`select count(*)::int n from pg_type t join pg_namespace s on s.oid=t.typnamespace where s.nspname='public' and t.typname in ('listing_status','offer_status','pickup_spot','course_code','listing_category','listing_condition')`)
ok('down migration removes every type and domain', types[0].n === 0, JSON.stringify(types))
await db.exec('BEGIN;\n' + up + '\nCOMMIT;')
ok('up applies again after down', true)

// ---- seed a small world ----
await db.exec(`
  insert into users (id,name,email,password_hash,year_of_study,usual_pickup_spot,created_at) values
   ('usr_demo','Demo Student','demo@probable.books','h',2,'Science building lobby','2024-10-02'),
   ('usr_lina','Lina K.','Lina@Probable.Books','h',3,'Main library entrance','2024-10-14'),
   ('usr_jad','Jad M.','jad@probable.books','h',1,null,now());
  insert into courses (code,title,required_materials,tips,related_codes) values
   ('CHEM 201','Organic Chemistry I','[{"id":"chem201-text","label":"Klein","category":"textbook","keywords":["organic"]}]','{"Tip one"}','{"CHEM 202"}'),
   ('CHEM 202','Organic Chemistry II','[]','{}','{}'),
   ('BIOL 201','Cell Biology','[]','{}','{}');
`)
ok('seed users and courses', true)
const c = (await q(`select department, number from courses where code='CHEM 201'`))[0]
ok('course department and number are generated', c.department === 'CHEM' && c.number === '201', JSON.stringify(c))

// ---- users ----
await rejects('duplicate email ignoring case is rejected', `insert into users (name,email,password_hash) values ('X','DEMO@probable.books','h')`, '23505')
await rejects('invalid email shape is rejected', `insert into users (name,email,password_hash) values ('X','not-an-email','h')`, '23514')
await rejects('blank name is rejected', `insert into users (name,email,password_hash) values ('  ','a@b.c','h')`, '23514')
await rejects('year of study 0 is rejected', `insert into users (name,email,password_hash,year_of_study) values ('X','y@b.c','h',0)`, '23514')
await rejects('unknown pickup spot is rejected', `insert into users (name,email,password_hash,usual_pickup_spot) values ('X','z@b.c','h','The moon')`, '23514')
const gen = (await q(`insert into users (name,email,password_hash) values ('Gen','gen@b.c','h') returning id`))[0].id
ok('generated user id has usr_ prefix', /^usr_[0-9a-f-]{36}$/.test(gen), gen)

// ---- listings ----
await accepts('complete active listing is accepted', `
  insert into listings (id,seller_id,title,category,condition,price_cents,retail_cents,pickup_spot,author,isbn,description,condition_notes,featured,created_at)
  values ('lst_001','usr_lina','Organic Chemistry, 4th edition','textbook','good',4500,14900,'Main library entrance','David Klein','9781119659594','',ARRAY['Highlighting in ch 1 to 6'],true,'2026-11-10');
  insert into listing_courses values ('lst_001',0,'CHEM 201'),('lst_001',1,'CHEM 202');
  insert into listing_photos values ('lst_001',0,'https://x.test/a.jpg','Cover');`)
await accepts('draft with almost nothing is accepted', `insert into listings (id,seller_id,status) values ('lst_draft','usr_demo','draft')`)
await rejects('active listing missing title is rejected', `insert into listings (seller_id,category,condition,price_cents,pickup_spot) values ('usr_demo','other','good',100,'Engineering quad')`, '23514')
await rejects('active listing missing price is rejected', `insert into listings (seller_id,title,category,condition,pickup_spot) values ('usr_demo','A title','other','good','Engineering quad')`, '23514')
await rejects('draft with a too-short title is still rejected', `insert into listings (seller_id,status,title) values ('usr_demo','draft','abc')`, '23514')
await rejects('title over 120 characters is rejected', `insert into listings (seller_id,status,title) values ('usr_demo','draft','${'x'.repeat(121)}')`, '23514')
await rejects('price 0 is rejected', `insert into listings (seller_id,status,price_cents) values ('usr_demo','draft',0)`, '23514')
await rejects('price above $5,000 is rejected', `insert into listings (seller_id,status,price_cents) values ('usr_demo','draft',500001)`, '23514')
await rejects('retail not above price is rejected', `insert into listings (seller_id,status,price_cents,retail_cents) values ('usr_demo','draft',1000,1000)`, '23514')
await accepts('retail above price is accepted', `insert into listings (seller_id,status,price_cents,retail_cents) values ('usr_demo','draft',1000,1001)`)
await rejects('isbn with spaces/hyphens is rejected (API strips them first)', `insert into listings (seller_id,status,isbn) values ('usr_demo','draft','978-1-119-65959-4')`, '23514')
await accepts('isbn-10 ending in X is accepted', `insert into listings (seller_id,status,isbn) values ('usr_demo','draft','080442957X')`)
await rejects('more than 5 condition notes is rejected', `insert into listings (seller_id,status,condition_notes) values ('usr_demo','draft',ARRAY['1','2','3','4','5','6'])`, '23514')
await rejects('condition note over 80 chars is rejected', `insert into listings (seller_id,status,condition_notes) values ('usr_demo','draft',ARRAY['${'n'.repeat(81)}'])`, '23514')
await accepts('condition note of exactly 80 chars is accepted', `insert into listings (seller_id,status,condition_notes) values ('usr_demo','draft',ARRAY['${'n'.repeat(80)}'])`)
await rejects('description over 1000 chars is rejected', `insert into listings (seller_id,status,description) values ('usr_demo','draft','${'d'.repeat(1001)}')`, '23514')
await rejects('unknown category is rejected', `insert into listings (seller_id,status,category) values ('usr_demo','draft','furniture')`, '22P02')
await rejects('listing for a missing seller is rejected', `insert into listings (seller_id,status) values ('usr_nobody','draft')`, '23503')

// photos / courses limits
for (let i = 0; i < 6; i++) await db.exec(`insert into listing_photos values ('lst_draft',${i},'https://x.test/${i}.jpg','')`)
ok('six photos are accepted', (await q(`select count(*)::int n from listing_photos where listing_id='lst_draft'`))[0].n === 6)
await rejects('seventh photo (position 6) is rejected', `insert into listing_photos values ('lst_draft',6,'https://x.test/6.jpg','')`, '23514')
await rejects('photo url must not be javascript:', `insert into listing_photos values ('lst_001',1,'javascript:alert(1)','')`, '23514')
await accepts('site-relative photo path is accepted', `insert into listing_photos values ('lst_001',3,'/mock/cover-notebook.svg','')`)
await rejects('protocol-relative photo url is rejected', `insert into listing_photos values ('lst_001',4,'//evil.test/x.jpg','')`, '23514')
await rejects('two photos in the same position are rejected', `insert into listing_photos values ('lst_draft',0,'https://x.test/dup.jpg','')`, '23505')
await rejects('same course twice on one listing is rejected', `insert into listing_courses values ('lst_001',2,'CHEM 201')`, '23505')
await rejects('unknown course is rejected', `insert into listing_courses values ('lst_001',2,'CHEM 999')`, '23503')
await rejects('badly formatted course code is rejected', `insert into listing_courses values ('lst_001',2,'chem201')`, '23514')
await rejects('sixth course (position 5) is rejected', `insert into listing_courses values ('lst_001',5,'BIOL 201')`, '23514')

// ---- offers ----
await accepts('valid offer accepted', `insert into offers (id,listing_id,buyer_id,amount_cents,message) values ('off_1','lst_001','usr_demo',3000,'Hi')`)
await rejects('second pending offer from same buyer on same listing is rejected', `insert into offers (listing_id,buyer_id,amount_cents) values ('lst_001','usr_demo',3500)`, '23505')
await accepts('a different buyer may also have a pending offer', `insert into offers (id,listing_id,buyer_id,amount_cents) values ('off_2','lst_001','usr_jad',2500)`)
await db.exec(`update offers set status='withdrawn' where id='off_1'`)
await accepts('after withdrawing, the buyer may offer again', `insert into offers (id,listing_id,buyer_id,amount_cents) values ('off_3','lst_001','usr_demo',3200)`)
await rejects('offer of 0 is rejected', `insert into offers (listing_id,buyer_id,amount_cents) values ('lst_001','usr_gen',0)`, '23514')
await rejects('offer message over 280 chars is rejected', `insert into offers (listing_id,buyer_id,amount_cents,message) values ('lst_001','${gen}',100,'${'m'.repeat(281)}')`, '23514')
await rejects('counter not above the offer is rejected', `update offers set status='countered', counter_cents=2500 where id='off_2'`, '23514')
await rejects('countered offer without a counter amount is rejected', `update offers set status='countered' where id='off_2'`, '23514')
await accepts('counter above the offer is accepted', `update offers set status='countered', counter_cents=4000 where id='off_2'`)
await accepts('accepting a counter keeps the counter amount', `update offers set status='accepted' where id='off_2'`)
ok('counter amount kept after accept', (await q(`select counter_cents c from offers where id='off_2'`))[0].c === 4000)
await rejects('offer on a missing listing is rejected', `insert into offers (listing_id,buyer_id,amount_cents) values ('lst_none','usr_demo',100)`, '23503')

// ---- triggers ----
const before = (await q(`select updated_at u from listings where id='lst_001'`))[0].u
await new Promise((r) => setTimeout(r, 15))
await db.exec(`update listings set status='reserved' where id='lst_001'`)
const after = (await q(`select updated_at u from listings where id='lst_001'`))[0].u
ok('updated_at moves on update', new Date(after) > new Date(before), `${before} -> ${after}`)

// ---- query shapes the API will use ----
await db.exec(`
  insert into listings (id,seller_id,title,category,condition,price_cents,pickup_spot,created_at) values
   ('lst_a','usr_lina','Calculator TI-84 Plus','calculator','like_new',6000,'Bookstore steps','2026-11-12'),
   ('lst_b','usr_lina','Lab coat knee length','lab_gear','worn',1500,'Engineering quad','2026-11-11'),
   ('lst_c','usr_lina','Brand new goggles','lab_gear','new',800,'Engineering quad','2026-11-13');
`)
const order = (await q(`select id from listings where status<>'draft' order by condition, created_at desc, id`)).map((r) => r.id)
ok('ORDER BY condition is best-first (new, like_new, ..., worn)', order.join() === ['lst_c','lst_a','lst_001','lst_b'].join(), order.join())
const hit = (await q(`select id from listings where search_text like '%' || lower($1) || '%' order by id`, ['KLEIN'])).map((r) => r.id)
ok('search_text finds author case-insensitively', hit.join() === 'lst_001', hit.join())
const none = await q(`select id from listings where search_text like '%' || lower($1) || '%'`, ['chemistry, 4th edition' + 'David'])
ok('search does not match across two fields', none.length === 0, JSON.stringify(none))
const idx = await q(`select indexdef from pg_indexes where indexname='listings_search_trgm_idx'`)
ok('trigram index exists', idx.length === 1)
const counts = await q(`
  select c.code, count(l.id) filter (where l.status='active')::int as n
  from courses c left join listing_courses lc on lc.course_code=c.code left join listings l on l.id=lc.listing_id
  group by c.code order by c.code`)
ok('course listingCount query runs', counts.length === 3, JSON.stringify(counts))
const med = await q(`select round(percentile_cont(0.5) within group (order by price_cents))::int m from listings where status in ('active','reserved')`)
ok('median price query runs', typeof med[0].m === 'number', JSON.stringify(med))

// ---- cascades ----
await db.exec(`delete from listings where id='lst_001'`)
const orphans = await q(`select (select count(*) from offers where listing_id='lst_001')::int o, (select count(*) from listing_courses where listing_id='lst_001')::int c, (select count(*) from listing_photos where listing_id='lst_001')::int p`)
ok('deleting a listing removes its offers, courses and photos', orphans[0].o === 0 && orphans[0].c === 0 && orphans[0].p === 0, JSON.stringify(orphans))
await db.exec(`insert into offers (id,listing_id,buyer_id,amount_cents) values ('off_x','lst_a','usr_demo',100)`)
await db.exec(`delete from users where id='usr_lina'`)
const rest = await q(`select (select count(*) from listings where seller_id='usr_lina')::int l, (select count(*) from offers where id='off_x')::int o`)
ok('deleting a user removes their listings and offers on them', rest[0].l === 0 && rest[0].o === 0, JSON.stringify(rest))
await db.exec(`delete from users where id='usr_demo'`)
const demoOffers = await q(`select count(*)::int n from offers where buyer_id='usr_demo'`)
ok('deleting a user removes offers they made', demoOffers[0].n === 0)
await rejects('deleting a course that listings use is blocked', `
  insert into users (id,name,email,password_hash) values ('usr_t','T','t@t.t','h');
  insert into listings (id,seller_id,status) values ('lst_t','usr_t','draft');
  insert into listing_courses values ('lst_t',0,'BIOL 201');
  delete from courses where code='BIOL 201';`, '23503')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
