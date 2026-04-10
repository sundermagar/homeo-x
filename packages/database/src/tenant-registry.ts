export interface TenantConfig {
  slug: string;
  schemaName: string;
  displayName: string;
  isActive: boolean;
}

/**
 * Maps subdomains/host headers to PostgreSQL schema names.
 * In production, this could be backed by a tenants table in the public schema.
 */
export class TenantRegistry {
  private static tenants: Map<string, TenantConfig> = new Map([
    ['zirakpur',            { slug: 'zirakpur',            schemaName: 'tenant_zirakpur',            displayName: 'Zirakpur Clinic',          isActive: true }],
    ['chd',                 { slug: 'chd',                 schemaName: 'tenant_chd',                 displayName: 'Chandigarh Clinic',         isActive: true }],
    ['demo',                { slug: 'demo',                schemaName: 'tenant_demo',                displayName: 'Demo Clinic',               isActive: true }],
    ['sofat',               { slug: 'sofat',               schemaName: 'tenant_sofat',               displayName: 'Sofat Clinic',              isActive: true }],
    ['afecto',              { slug: 'afecto',              schemaName: 'tenant_afecto',              displayName: 'Afecto Clinic',             isActive: true }],
    ['afectoclinic',        { slug: 'afectoclinic',        schemaName: 'tenant_afectoclinic',        displayName: 'Afecto Clinic (Branch)',     isActive: true }],
    ['ayurvedic',           { slug: 'ayurvedic',           schemaName: 'tenant_ayurvedic',           displayName: 'Ayurvedic Clinic',          isActive: true }],
    ['appleclinic',         { slug: 'appleclinic',         schemaName: 'tenant_appleclinic',         displayName: 'Apple Clinic',              isActive: true }],
    ['ranjithomoeoclinic',  { slug: 'ranjithomoeoclinic',  schemaName: 'tenant_ranjithomoeoclinic',  displayName: 'Ranji Homoeo Clinic',       isActive: true }],
    ['homoeohome',          { slug: 'homoeohome',          schemaName: 'tenant_homoeohome',          displayName: 'Homoeo Home',               isActive: true }],
    ['amrita',              { slug: 'amrita',              schemaName: 'tenant_amrita',              displayName: 'Amrita Clinic',             isActive: true }],
    ['kmamrita',            { slug: 'kmamrita',            schemaName: 'tenant_kmamrita',            displayName: 'KM Amrita Clinic',          isActive: true }],
    ['allopathic',          { slug: 'allopathic',          schemaName: 'tenant_allopathic',          displayName: 'Allopathic Clinic',         isActive: true }],
    ['garhwal',             { slug: 'garhwal',             schemaName: 'tenant_garhwal',             displayName: 'Garhwal Clinic',            isActive: true }],
    ['elixirhomoeo',        { slug: 'elixirhomoeo',        schemaName: 'tenant_elixirhomoeo',        displayName: 'Elixir Homoeo',             isActive: true }],
    ['s-sidhu',             { slug: 's-sidhu',             schemaName: 'tenant_s_sidhu',             displayName: 'S Sidhu Clinic',            isActive: true }],
    ['g-sidhu',             { slug: 'g-sidhu',             schemaName: 'tenant_g_sidhu',             displayName: 'G Sidhu Clinic',            isActive: true }],
    ['aggarwal',            { slug: 'aggarwal',            schemaName: 'tenant_aggarwal',            displayName: 'Aggarwal Clinic',           isActive: true }],
    ['drprince',            { slug: 'drprince',            schemaName: 'tenant_drprince',            displayName: 'Dr Prince Clinic',          isActive: true }],
    ['wellbeing',           { slug: 'wellbeing',           schemaName: 'tenant_wellbeing',           displayName: 'Wellbeing Clinic',          isActive: true }],
    ['curecare',            { slug: 'curecare',            schemaName: 'tenant_curecare',            displayName: 'CureCare Clinic',           isActive: true }],
    ['crm',                 { slug: 'crm',                 schemaName: 'tenant_crm',                 displayName: 'CRM Workspace',             isActive: true }],
    ['solohomoeopathy',     { slug: 'solohomoeopathy',     schemaName: 'tenant_solohomoeopathy',     displayName: 'Solo Homoeopathy',          isActive: true }],
    ['ace',                 { slug: 'ace',                 schemaName: 'tenant_ace',                 displayName: 'ACE Clinic',                isActive: true }],
    ['gulf',                { slug: 'gulf',                schemaName: 'tenant_gulf',                displayName: 'Gulf Clinic',               isActive: true }],
    ['homeocare',           { slug: 'homeocare',           schemaName: 'tenant_homeocare',           displayName: 'HomeoCAre Clinic',          isActive: true }],
    ['hmc',                 { slug: 'hmc',                 schemaName: 'tenant_hmc',                 displayName: 'HMC Clinic',                isActive: true }],
  ]);

  static resolve(host: string): TenantConfig | null {
    // Extract subdomain: "zirakpur.managemyclinic.in" → "zirakpur"
    const slug = host.split('.')[0]?.toLowerCase();
    if (!slug) return null;
    return this.tenants.get(slug) ?? null;
  }

  static getAll(): TenantConfig[] {
    return Array.from(this.tenants.values());
  }

  static register(config: TenantConfig): void {
    this.tenants.set(config.slug, config);
  }
}
