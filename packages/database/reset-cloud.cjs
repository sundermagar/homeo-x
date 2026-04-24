const postgres = require('postgres');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  
  const sql = postgres(url);
  const schemas = [
    'tenant_zirakpur', 'tenant_chd', 'tenant_demo', 'tenant_sofat', 'tenant_afecto',
    'tenant_afectoclinic', 'tenant_ayurvedic', 'tenant_appleclinic', 'tenant_ranjithomoeoclinic',
    'tenant_homoeohome', 'tenant_amrita', 'tenant_kmamrita', 'tenant_allopathic',
    'tenant_garhwal', 'tenant_elixirhomoeo', 'tenant_s_sidhu', 'tenant_g_sidhu',
    'tenant_aggarwal', 'tenant_drprince', 'tenant_wellbeing', 'tenant_curecare',
    'tenant_crm', 'tenant_solohomoeopathy', 'tenant_ace', 'tenant_gulf',
    'tenant_homeocare', 'tenant_hmc'
  ];

  console.log('Starting Cloud Schema Reset...');
  for (const s of schemas) {
    try {
      await sql.unsafe(`DROP SCHEMA IF EXISTS \"${s}\" CASCADE`);
      console.log(`✅ Reset ${s}`);
    } catch (e) {
      console.error(`❌ Failed ${s}: ${e.message}`);
    }
  }
  await sql.end();
  console.log('Reset finished.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
