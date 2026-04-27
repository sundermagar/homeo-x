// @ts-nocheck
/**
 * Extract tenant slug from the current URL subdomain.
 *
 * Examples:
 *   e2e-clinic.localhost:5173  → "e2e-clinic"
 *   apollo.myapp.com           → "apollo"
 *   www.myapp.com              → null
 *   localhost:5173              → null
 *   myapp.com                  → null
 */
export function getTenantSlugFromUrl(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Need at least 2 parts: "slug.localhost" or "slug.domain.com"
  if (parts.length < 2) return null;

  // Handle ngrok free domains: skip the base ngrok subdomain
  if (hostname.endsWith('.ngrok-free.dev')) {
    // lordliest-thu-unsuccessfully.ngrok-free.dev -> ["lordliest-thu-unsuccessfully", "ngrok-free", "dev"]
    if (parts.length <= 3) return null;
    return parts[0];
  }

  // Handle Railway default domains: skip the base up.railway.app subdomain
  if (hostname.endsWith('.up.railway.app')) {
    // ai-consultation-production.up.railway.app -> ["ai-consultation-production", "up", "railway", "app"]
    if (parts.length <= 4) return null;
    return parts[0];
  }

  const subdomain = parts[0];

  // Ignore common non-tenant subdomains
  if (subdomain === 'www' || subdomain === 'localhost' || subdomain === 'app') {
    return null;
  }

  return subdomain;
}
