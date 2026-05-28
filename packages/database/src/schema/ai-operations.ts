import { pgTable, text, integer, boolean, timestamp, real, jsonb, serial } from 'drizzle-orm/pg-core';

// ─── 1. AI Request Logs (Powers: Audit Trail, Feature Burn Rate) ───
export const aiRequestLogs = pgTable('ai_request_logs', {
  id:              serial('id').primaryKey(), // Keeping as serial for backward compatibility
  tenantId:        text('tenant_id').notNull(),
  userId:          text('user_id').notNull(),
  userName:        text('user_name'),
  sessionId:       text('session_id'),
  
  // What was called
  feature:         text('feature').notNull(),
  modelId:         text('model_id').notNull(),
  modelName:       text('model_name'),
  providerId:      text('provider_id').notNull(), // keeping for compatibility
  isFallback:      boolean('is_fallback').default(false),
  
  // Token tracking
  inputTokens:     integer('input_tokens').default(0),
  outputTokens:    integer('output_tokens').default(0),
  audioSeconds:    real('audio_seconds'), // Rename to match spec
  
  // Cost tracking
  creditsDeducted: integer('credits_deducted').default(0),
  costInr:         real('cost_inr').default(0),
  
  // Content (for audit trail)
  promptText:      text('prompt_text'),
  responseText:    text('response_text'),
  
  // Performance
  latencyMs:       integer('latency_ms'),
  status:          text('status').notNull(), // 'SUCCESS', 'FAILED', 'FALLBACK_USED'
  errorCode:       text('error_code'),
  errorMessage:    text('error_message'),
  
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── 2. Tenant AI Wallet (Powers: Overall Budget, Topups) ───
export const aiTenantWallets = pgTable('ai_tenant_wallets', {
  id:              serial('id').primaryKey(),
  tenantId:        text('tenant_id').notNull().unique(),
  balanceCredits:  integer('balance_credits').default(0),
  balanceInr:      real('balance_inr').default(0),
  totalCreditsThisCycle: integer('total_credits_this_cycle').default(0),
  cycleStartDay:   integer('cycle_start_day').default(1), 
  isActive:        boolean('is_active').default(true),
  lastTopupAt:     timestamp('last_topup_at'),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});

// ─── 3. Credit Ledger (Powers: Wallet Transactions) ───
export const aiCreditTransactions = pgTable('ai_credit_transactions', {
  id:              serial('id').primaryKey(),
  tenantId:        text('tenant_id').notNull(),
  type:            text('type').notNull(),               // 'DEDUCTION' | 'DEPOSIT'
  amount:          integer('amount').notNull(),           // +/- credits
  balanceAfter:    integer('balance_after'),
  description:     text('description'),
  referenceId:     text('reference_id'),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── 4. AI Model Registry (Powers: Model Directory) ───
export const aiModelRegistry = pgTable('ai_model_registry', {
  id:              text('id').primaryKey(),
  provider:        text('provider').notNull(),
  displayName:     text('display_name').notNull(),
  contextWindow:   integer('context_window'),
  costPerInputToken:  real('cost_per_input_token'),
  costPerOutputToken: real('cost_per_output_token'),
  status:          text('status').default('active'),
  capabilities:    jsonb('capabilities'),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── 5. Routing Rules (Powers: Routing Rules stub) ───
export const aiRoutingRules = pgTable('ai_routing_rules', {
  id:              serial('id').primaryKey(),
  tenantId:        text('tenant_id').notNull(),
  feature:         text('feature').notNull(),
  primaryModelId:  text('primary_model_id').notNull(),
  fallbackModelId: text('fallback_model_id'),
  dailyBudgetCredits: integer('daily_budget_credits'),
  monthlyBudgetCredits: integer('monthly_budget_credits'),
  maxTokensPerCall: integer('max_tokens_per_call'),
  isEnabled:       boolean('is_enabled').default(true),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});

// ─── 6. API Keys Vault (Powers: Security Vault stub) ───
export const aiApiKeys = pgTable('ai_api_keys', {
  id:              serial('id').primaryKey(),
  tenantId:        text('tenant_id').notNull(),           // Ensure multi-tenancy
  provider:        text('provider').notNull(),            // 'openai', 'anthropic', etc.
  label:           text('label').notNull(),
  encryptedKey:    text('encrypted_key').notNull(),       // AES-256-GCM encrypted
  maskedKey:       text('masked_key').notNull(),          // 'sk-...a3Xf'
  expiresAt:       timestamp('expires_at'),
  status:          text('status').default('active'),
  lastRotated:     timestamp('last_rotated'),
  createdBy:       text('created_by'),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ─── 7. Budget Alert Rules (Powers: Budget Alert Configuration) ───
export const aiBudgetAlerts = pgTable('ai_budget_alerts', {
  id:              serial('id').primaryKey(),
  tenantId:        text('tenant_id').notNull(),
  title:           text('title').notNull(),
  description:     text('description').notNull(),
  type:            text('type').notNull(),               // 'threshold', 'event', 'days'
  threshold:       integer('threshold'),                 // numeric value (credits or days)
  inApp:           boolean('in_app').default(true),
  email:           boolean('email').default(false),
  sms:             boolean('sms').default(false),
  isActive:        boolean('is_active').default(true),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});
