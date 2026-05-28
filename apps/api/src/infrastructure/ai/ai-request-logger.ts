import { createDbClient } from '@mmc/database';
import { aiRequestLogs, aiTenantWallets, aiCreditTransactions } from '@mmc/database/schema';
import { createLogger } from '../../shared/logger.js';
import { eq, sql } from 'drizzle-orm';

const logger = createLogger('ai-request-logger');

export interface AiRequestLogPayload {
  tenantId: string;
  userId: string;
  userName?: string;
  feature: string;
  modelId: string;
  providerId: string;
  isFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  costInr?: number;
  promptText?: string;
  responseText?: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILED' | 'FALLBACK_USED';
  errorCode?: string;
}

export async function logAiRequest(payload: AiRequestLogPayload): Promise<void> {
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.VITE_API_URL;
    if (!dbUrl) throw new Error('DATABASE_URL is not defined in environment');
    
    // Convert 'demo' -> 'tenant_demo'
    const schemaName = payload.tenantId.startsWith('tenant_') 
      ? payload.tenantId 
      : `tenant_${payload.tenantId}`;
      
    const db = createDbClient(dbUrl, schemaName);

    // 1. Calculate credits roughly (e.g. 1 credit = 1000 input tokens or 100 output tokens)
    const inputCredits = Math.ceil(payload.inputTokens / 1000);
    const outputCredits = Math.ceil(payload.outputTokens / 100);
    const totalCredits = inputCredits + outputCredits;

    // 2. Insert into aiRequestLogs
    const [logEntry] = await db.insert(aiRequestLogs).values({
      tenantId: payload.tenantId,
      userId: payload.userId,
      userName: payload.userName,
      feature: payload.feature,
      modelId: payload.modelId,
      providerId: payload.providerId,
      isFallback: payload.isFallback,
      inputTokens: payload.inputTokens,
      outputTokens: payload.outputTokens,
      creditsDeducted: totalCredits,
      costInr: payload.costInr || 0,
      promptText: payload.promptText?.substring(0, 500),
      responseText: payload.responseText?.substring(0, 500),
      latencyMs: payload.latencyMs,
      status: payload.status,
      errorCode: payload.errorCode,
    }).returning({ id: aiRequestLogs.id });

    if (totalCredits > 0 && payload.status === 'SUCCESS') {
      // 3. Update the aiTenantWallets atomically, creating one if it doesn't exist
      const walletRes = await db.execute(sql`
        INSERT INTO ai_tenant_wallets (tenant_id, balance_credits, total_credits_this_cycle, created_at, updated_at)
        VALUES (
          ${payload.tenantId},
          10000 - ${totalCredits},
          10000,
          NOW(),
          NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE 
        SET balance_credits = ai_tenant_wallets.balance_credits - ${totalCredits},
            updated_at = NOW()
        RETURNING id, balance_credits, total_credits_this_cycle
      `);
      
      const updatedWallet = (walletRes as any).rows?.[0] || (walletRes as any)?.[0];

      // 4. Record the deduction transaction
      if (updatedWallet && logEntry) {
        await db.insert(aiCreditTransactions).values({
          tenantId: payload.tenantId,
          type: 'DEDUCTION',
          amount: -totalCredits,
          balanceAfter: updatedWallet.balance_credits,
          description: `AI ${payload.feature} (${payload.modelId})`,
          referenceId: logEntry.id.toString(),
        });
      }
    }
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to log AI request and update credits');
  }
}
