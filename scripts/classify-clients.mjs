import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const PROJECT_TYPES = {
  phi: ['SEO'],
  novatrading: ['SEO'],
  ecoce: ['SEO'],
  'kj-seo': ['Interno'],
  'lau-leon': ['RRSS', 'SEO', 'Ads/SEM'],
  tania: ['SEO', 'RRSS', 'Diseño Web'],
  lurozo: ['SEO', 'RRSS'],
  'koko-ia': ['SEO', 'RRSS'],
  'cruce-teques': ['SEO', 'RRSS', 'Diseño Web'],
};

async function main() {
  for (const [id, types] of Object.entries(PROJECT_TYPES)) {
    const r = await sql('UPDATE clients SET project_types=$1 WHERE id=$2 RETURNING id', [JSON.stringify(types), id]);
    console.log(id, '->', types, r.length ? 'OK' : 'NOT FOUND');
  }
  const r = await sql("UPDATE clients SET active=false WHERE id='soaint' RETURNING id");
  console.log('soaint deactivated:', r.length > 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
