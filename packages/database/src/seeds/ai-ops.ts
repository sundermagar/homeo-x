import { eq, and } from 'drizzle-orm';
import { createDbClient } from '../index.js';
import { aiModelRegistry, aiRoutingRules } from '../schema/ai-operations.js';

export async function seedAiOperations() {
  console.log('🌱 Seeding AI Operations Data...');
  const dbUrl = process.env['DATABASE_URL'];
  if (!dbUrl) throw new Error('DATABASE_URL is required to seed');
  const db = createDbClient(dbUrl, 'tenant_demo');

  // 1. Seed Model Registry
  const models = [
    {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      provider: 'groq',
      displayName: 'Llama 4 Scout (17B)',
      contextWindow: 128000,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      status: 'active',
      capabilities: { vision: true, streaming: true }
    },
    {
      id: 'llama-3.3-70b-versatile',
      provider: 'groq',
      displayName: 'Llama 3.3 Versatile (70B)',
      contextWindow: 128000,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      status: 'active',
      capabilities: { streaming: true }
    },
    {
      id: 'qwen2.5:1.5b',
      provider: 'ollama',
      displayName: 'Qwen 2.5 (1.5B Local)',
      contextWindow: 32000,
      costPerInputToken: 0,
      costPerOutputToken: 0,
      status: 'active',
      capabilities: { local: true }
    },
    {
      id: 'claude-haiku-4-5',
      provider: 'anthropic',
      displayName: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      costPerInputToken: 0.25,
      costPerOutputToken: 1.25,
      status: 'active',
      capabilities: { vision: true, streaming: true }
    },
    {
      id: 'gemini-2.5-flash',
      provider: 'gemini',
      displayName: 'Gemini 2.5 Flash',
      contextWindow: 1048576,
      costPerInputToken: 0.075,
      costPerOutputToken: 0.3,
      status: 'active',
      capabilities: { vision: true, streaming: true }
    }
  ];

  for (const model of models) {
    const existing = await db.select().from(aiModelRegistry).where(eq(aiModelRegistry.id, model.id));
    if (existing.length === 0) {
      await db.insert(aiModelRegistry).values(model);
      console.log(`✅ Inserted model: ${model.displayName}`);
    } else {
      console.log(`⏭️ Skipped model (already exists): ${model.displayName}`);
    }
  }

  // 2. Seed Default Routing Rules for a tenant
  // Default routing fallback chain matches current hardcoded logic
  const defaultTenantId = 'demo'; // Using default tenant
  const rules = [
    {
      tenantId: defaultTenantId,
      feature: 'consultation',
      primaryModelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
      fallbackModelId: 'claude-haiku-4-5',
      isEnabled: true,
    },
    {
      tenantId: defaultTenantId,
      feature: 'symptoms',
      primaryModelId: 'llama-3.3-70b-versatile',
      fallbackModelId: 'qwen2.5:1.5b',
      isEnabled: true,
    }
  ];

  for (const rule of rules) {
    const existing = await db.select().from(aiRoutingRules)
      .where(and(
        eq(aiRoutingRules.tenantId, rule.tenantId),
        eq(aiRoutingRules.feature, rule.feature)
      ));
    if (existing.length === 0) {
      await db.insert(aiRoutingRules).values(rule);
      console.log(`✅ Inserted routing rule for feature: ${rule.feature}`);
    } else {
      console.log(`⏭️ Skipped routing rule (already exists): ${rule.feature}`);
    }
  }

  console.log('✅ AI Operations Seeding Complete.');
}
