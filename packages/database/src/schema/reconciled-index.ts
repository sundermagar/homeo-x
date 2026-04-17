import { otps } from './legacy/users';
import { leads, leadFollowups, referrals, caseReminders } from './crm';

// Export everything from legacy
export * from './legacy/index';

// Export new public-specific tables (ensuring no name collisions)
export { otps };

// Re-export CRM pieces if they don't collide with legacy
// (Legacy has 'leads' and 'lead_followups' too, so we must check)
// Looking at legacy/index.ts: 
// 76: export * from "./lead_followups";
// 77: export * from "./leads";
// So we DON'T export the new ones if we want to keep legacy data safe.

// Export static pages and faqs from legacy as they are primary
export * from './legacy-public-manifest';
