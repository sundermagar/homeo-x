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
    ['zirakpur', { slug: 'zirakpur', schemaName: 'tenant_zirakpur', displayName: 'Zirakpur Clinic', isActive: true }],
    ['chd', { slug: 'chd', schemaName: 'tenant_chd', displayName: 'Chandigarh Clinic', isActive: true }],
    ['demo', { slug: 'demo', schemaName: 'tenant_demo', displayName: 'Demo Clinic', isActive: true }],
    ['sofat', { slug: 'sofat', schemaName: 'tenant_sofat', displayName: 'Sofat Clinic', isActive: true }],
    ['afecto', { slug: 'afecto', schemaName: 'tenant_afecto', displayName: 'Afecto Clinic', isActive: true }],
    // Add remaining tenants as needed during migration
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
