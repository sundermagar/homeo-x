import { Router } from 'express';
import { 
  aiRequestLogs, aiTenantWallets, aiCreditTransactions, 
  aiModelRegistry, aiRoutingRules, aiApiKeys, aiBudgetAlerts, users 
} from '@mmc/database/schema';
import { eq, desc, sql, and, gte, lte, like, count, inArray } from 'drizzle-orm';
import { sendSuccess } from '../../../shared/response-formatter.js';
import { encryptApiKey, maskApiKey } from '../../ai/crypto.util.js';

export function createAiOpsRouter(): Router {
  const router = Router();

  const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('[AI Ops Router Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    });
  };

  // ─── Dashboard Summary ───
  router.get('/summary', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    
    const wallet = await db.select().from(aiTenantWallets)
      .where(eq(aiTenantWallets.tenantId, tenantId))
      .limit(1);
    
    const w = wallet[0];
    if (!w) {
      return sendSuccess(res, {
        totalAllocated: 0, consumed: 0, remaining: 0, 
        percentageUsed: '0.0', dailyBurnRate: 0, burnRateTrend: 0,
        resetDate: new Date(),
      });
    }
    
    const allocated = w.totalCreditsThisCycle ?? 0;
    
    // Calculate consumed credits for this cycle from aiRequestLogs
    let consumed = 0;
    if (w.lastTopupAt) {
      const logs = await db.select({
        total: sql<number>`COALESCE(SUM(${aiRequestLogs.creditsDeducted}), 0)`.as('total')
      }).from(aiRequestLogs)
        .where(and(
          eq(aiRequestLogs.tenantId, tenantId),
          gte(aiRequestLogs.createdAt, w.lastTopupAt)
        ));
      consumed = Number(logs[0]?.total ?? 0);
    }
    
    const remaining = w.balanceCredits ?? 0;
    
    // Calculate 7-day rolling average burn rate
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLogs = await db.select({
      total: sql<number>`COALESCE(SUM(${aiRequestLogs.creditsDeducted}), 0)`.as('total')
    }).from(aiRequestLogs)
      .where(and(
        eq(aiRequestLogs.tenantId, tenantId),
        gte(aiRequestLogs.createdAt, sevenDaysAgo)
      ));
    
    // Spec: "avg_daily_burn = SUM(credits, last 7 days) / 7"
    const sum7Days = Number(recentLogs[0]?.total ?? 0);
    const dailyBurnRate = Math.floor(sum7Days / 7);
    
    // Cycle logic
    const cycleStart = new Date();
    cycleStart.setDate(w.cycleStartDay || 1);
    if (cycleStart > new Date()) cycleStart.setMonth(cycleStart.getMonth() - 1);
    
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    
    sendSuccess(res, {
      totalAllocated: allocated,
      consumed,
      remaining,
      percentageUsed: allocated > 0 ? ((consumed / allocated) * 100).toFixed(1) : '0.0',
      dailyBurnRate,
      burnRateTrend: 0, // TODO: compute from historical data
      resetDate: cycleEnd,
    });
  }));

  // ─── Timeline (Credit consumption over time) ───
  router.get('/timeline', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const parsedDays = parseInt(req.query.days as string);
    const days = Math.min(!isNaN(parsedDays) ? parsedDays : 7, 90); // Cap at 90 days
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - days);
    
    const rows = await db.select({
      date: sql`DATE(${aiRequestLogs.createdAt})`.as('date'),
      feature: aiRequestLogs.feature,
      total: sql<number>`COALESCE(SUM(${aiRequestLogs.creditsDeducted}), 0)`.as('total'),
    })
    .from(aiRequestLogs)
    .where(and(
      eq(aiRequestLogs.tenantId, tenantId),
      gte(aiRequestLogs.createdAt, startDate),
      lte(aiRequestLogs.createdAt, endDate)
    ))
    .groupBy(sql`DATE(${aiRequestLogs.createdAt})`, aiRequestLogs.feature)
    .orderBy(sql`DATE(${aiRequestLogs.createdAt})`);
    
    // Pivot into { date: '2026-05-27', Consultation: 1200, ... }
    const groupedByDate: Record<string, any> = {};
    for (const row of rows) {
      const d = row.date as string;
      if (!groupedByDate[d]) groupedByDate[d] = { date: d };
      groupedByDate[d][row.feature] = Number(row.total);
    }
    
    sendSuccess(res, Object.values(groupedByDate));
  }));

  // ─── Usage Breakdown by Feature (Module) ───
  router.get('/breakdown/features', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const stats = await db.select({
      feature: aiRequestLogs.feature,
      credits: sql`SUM(${aiRequestLogs.creditsDeducted})`.mapWith(Number)
    })
    .from(aiRequestLogs)
    .where(eq(aiRequestLogs.tenantId, tenantId))
    .groupBy(aiRequestLogs.feature);

    sendSuccess(res, stats);
  }));

  // ─── Usage Breakdown by Model ───
  router.get('/breakdown/models', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const stats = await db.select({
      modelId: aiRequestLogs.modelId,
      credits: sql`SUM(${aiRequestLogs.creditsDeducted})`.mapWith(Number)
    })
    .from(aiRequestLogs)
    .where(eq(aiRequestLogs.tenantId, tenantId))
    .groupBy(aiRequestLogs.modelId);

    sendSuccess(res, stats);
  }));

  // ─── Recent Transactions ───
  router.get('/transactions/recent', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const tx = await db.select().from(aiCreditTransactions)
      .where(eq(aiCreditTransactions.tenantId, tenantId))
      .orderBy(desc(aiCreditTransactions.createdAt))
      .limit(10);

    // Enrich with data from aiRequestLogs via referenceId
    const refIds = tx
      .map((t: any) => t.referenceId)
      .filter((id: any) => id && !isNaN(Number(id)))
      .map(Number);

    let logMap: Record<string, any> = {};
    if (refIds.length > 0) {
      const logRows = await db.select({
        id: aiRequestLogs.id,
        feature: aiRequestLogs.feature,
        modelId: aiRequestLogs.modelId,
        userId: aiRequestLogs.userId,
        status: aiRequestLogs.status,
        inputTokens: aiRequestLogs.inputTokens,
        outputTokens: aiRequestLogs.outputTokens,
      }).from(aiRequestLogs).where(inArray(aiRequestLogs.id, refIds));
      for (const r of logRows) logMap[r.id.toString()] = r;
    }

    // Resolve user names
    const userIdsToFetch = Array.from(new Set(
      Object.values(logMap)
        .map((l: any) => l.userId)
        .filter((id: string) => id && id !== 'system' && !isNaN(Number(id)))
    )).map(Number);

    let userMap: Record<string, string> = {};
    if (userIdsToFetch.length > 0) {
      const usersData = await db.select({ id: users.id, name: users.name })
        .from(users).where(inArray(users.id, userIdsToFetch));
      for (const u of usersData) userMap[u.id.toString()] = u.name;
    }

    const enriched = tx.map((t: any) => {
      const log = logMap[t.referenceId] || {};
      return {
        ...t,
        feature: log.feature || null,
        modelId: log.modelId || null,
        userName: userMap[log.userId] || (log.userId === 'system' ? 'System' : log.userId || null),
        logStatus: log.status || null,
        tokens: (log.inputTokens || 0) + (log.outputTokens || 0),
      };
    });

    sendSuccess(res, enriched);
  }));

  // ─── Clinic Wallets (Multi-Tenant) ───
  router.get('/clinic-wallets', asyncHandler(async (req: any, res: any) => {
    const db = req.db;
    
    // Fetch organizations from PUBLIC schema explicitly (req.db is scoped to tenant schema)
    const orgs = await db.execute(sql`SELECT id, name FROM public.organizations ORDER BY id DESC LIMIT 50`);
    
    // Fetch actual demo wallet to show real data for one
    const [demoWallet] = await db.select().from(aiTenantWallets).where(eq(aiTenantWallets.tenantId, 'demo')).limit(1);

    const wallets = orgs.map((org: any, i: number) => {
      // Mock limits based on org ID
      const baseLimit = (org.id % 5 + 1) * 5000;
      let spent = (org.id * 73) % baseLimit;
      
      // Inject real data for the first one or if name matches demo
      if (i === 0 && demoWallet) {
        return {
          id: `KH-${org.id.toString().padStart(4, '0')}`,
          name: org.name,
          monthlyLimit: demoWallet.totalCreditsThisCycle,
          spentThisMonth: 0, // In reality, we'd query aiRequestLogs sum here for demo
        };
      }

      return {
        id: `KH-${org.id.toString().padStart(4, '0')}`,
        name: org.name,
        monthlyLimit: baseLimit,
        spentThisMonth: spent,
      };
    });

    sendSuccess(res, wallets);
  }));

  // ─── Model Directory ───
  router.get('/models', asyncHandler(async (req: any, res: any) => {
    const db = req.db;
    let models = await db.select().from(aiModelRegistry);
    
    // Lazy Provision Defaults
    if (models.length === 0) {
      const defaultModels = [
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', provider: 'groq', displayName: 'Llama 4 Scout (17B)', contextWindow: 128000, costPerInputToken: 0.015, costPerOutputToken: 0.015, status: 'Active', capabilities: { vision: true, streaming: true } },
        { id: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'Llama 3.3 Versatile (70B)', contextWindow: 128000, costPerInputToken: 0.05, costPerOutputToken: 0.05, status: 'Active', capabilities: { streaming: true } },
        { id: 'qwen2.5:1.5b', provider: 'ollama', displayName: 'Qwen 2.5 (1.5B Local)', contextWindow: 32000, costPerInputToken: 0, costPerOutputToken: 0, status: 'Active', capabilities: { local: true } },
        { id: 'claude-haiku-4-5', provider: 'anthropic', displayName: 'Claude 3.5 Haiku', contextWindow: 200000, costPerInputToken: 0.25, costPerOutputToken: 1.25, status: 'Active', capabilities: { vision: true, streaming: true } },
        { id: 'gemini-2.5-flash', provider: 'gemini', displayName: 'Gemini 2.5 Flash', contextWindow: 1048576, costPerInputToken: 0.075, costPerOutputToken: 0.3, status: 'Active', capabilities: { vision: true, streaming: true } }
      ];
      await db.insert(aiModelRegistry).values(defaultModels).onConflictDoNothing();
      models = await db.select().from(aiModelRegistry);
    }
    
    sendSuccess(res, models);
  }));

  // ─── Routing Rules ───
  router.get('/routing-rules', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    let rules = await db.select().from(aiRoutingRules)
      .where(eq(aiRoutingRules.tenantId, tenantId));
      
    // Lazy Provision Defaults
    if (rules.length === 0) {
      const defaultRules = [
        { tenantId, feature: 'consultation', primaryModelId: 'meta-llama/llama-4-scout-17b-16e-instruct', fallbackModelId: 'claude-haiku-4-5', isEnabled: true, dailyBudgetCredits: 5000, maxTokensPerCall: 4000 },
        { tenantId, feature: 'symptoms', primaryModelId: 'llama-3.3-70b-versatile', fallbackModelId: 'qwen2.5:1.5b', isEnabled: true },
        { tenantId, feature: 'transcription', primaryModelId: 'gemini-2.5-flash', fallbackModelId: null, isEnabled: true, dailyBudgetCredits: 2000 },
        { tenantId, feature: 'general', primaryModelId: 'meta-llama/llama-4-scout-17b-16e-instruct', fallbackModelId: null, isEnabled: true }
      ];
      await db.insert(aiRoutingRules).values(defaultRules).onConflictDoNothing();
      rules = await db.select().from(aiRoutingRules).where(eq(aiRoutingRules.tenantId, tenantId));
    }
    
    sendSuccess(res, rules);
  }));

  // ─── Wallet Deposit ───
  router.post('/wallet/deposit', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const { amount_inr, reference, notes } = req.body;

    if (!amount_inr || amount_inr < 100 || amount_inr > 500000) {
      return res.status(400).json({ success: false, error: 'Invalid deposit amount' });
    }

    const credits = amount_inr * 1000;

    await db.transaction(async (tx: any) => {
      // 1. Insert Transaction
      const [txRecord] = await tx.insert(aiCreditTransactions).values({
        tenantId,
        type: 'DEPOSIT',
        amount: credits,
        description: notes || 'Manual top-up',
        referenceId: reference || 'N/A',
      }).returning({ id: aiCreditTransactions.id });

      // 2. Update Wallet (Upsert)
      const walletRes = await tx.execute(sql`
        INSERT INTO ai_tenant_wallets (tenant_id, balance_credits, balance_inr, total_credits_this_cycle, created_at, updated_at, last_topup_at)
        VALUES (
          ${tenantId},
          ${credits},
          ${amount_inr},
          ${credits},
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE 
        SET balance_credits = ai_tenant_wallets.balance_credits + EXCLUDED.balance_credits,
            balance_inr = ai_tenant_wallets.balance_inr + EXCLUDED.balance_inr,
            total_credits_this_cycle = ai_tenant_wallets.total_credits_this_cycle + EXCLUDED.total_credits_this_cycle,
            last_topup_at = NOW(),
            updated_at = NOW()
        RETURNING balance_credits
      `);
      
      const newBalance = (walletRes as any).rows ? (walletRes as any).rows[0].balance_credits : (walletRes as any)[0].balance_credits;

      // Redis INCRBY would go here if redis client was attached to req, e.g. req.redis.incrby('wallet:balance', credits)
    });

    sendSuccess(res, { message: 'Deposit successful', creditsAdded: credits });
  }));

  // ─── Security Vault (Keys) ───
  router.get('/keys', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const keys = await db.select({
      id: aiApiKeys.id,
      provider: aiApiKeys.provider,
      label: aiApiKeys.label,
      maskedKey: aiApiKeys.maskedKey,
      status: aiApiKeys.status,
      createdAt: aiApiKeys.createdAt,
      lastRotated: aiApiKeys.lastRotated
    }).from(aiApiKeys).where(eq(aiApiKeys.tenantId, tenantId));
    sendSuccess(res, keys);
  }));

  router.post('/keys', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const { provider, label, key } = req.body;
    
    if (!provider || !label || !key) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const encryptedKey = encryptApiKey(key);
    const maskedKeyStr = maskApiKey(key);

    const [newKey] = await db.insert(aiApiKeys).values({
      tenantId,
      provider,
      label,
      encryptedKey,
      maskedKey: maskedKeyStr,
      status: 'active'
    }).returning();

    // Do not return encrypted key to frontend
    const safeKey = { ...newKey, encryptedKey: undefined };
    sendSuccess(res, safeKey);
  }));

  // ─── Credit Ledger (Audit Trail) ───
  router.get('/logs', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Cap at 100
    const search = (req.query.search as string) || '';
    
    const conditions = [eq(aiRequestLogs.tenantId, tenantId)];
    if (search) {
      conditions.push(like(aiRequestLogs.feature, `%${search}%`));
    }
    
    const [logs, totalCount] = await Promise.all([
      db.select().from(aiRequestLogs)
        .where(and(...conditions))
        .orderBy(desc(aiRequestLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: count() }).from(aiRequestLogs)
        .where(and(...conditions)),
    ]);
    
    // Fetch user names for numeric userIds
    const userIdsToFetch = Array.from(new Set(
      logs.map((l: any) => l.userId).filter((id: any) => id && id !== 'system' && !isNaN(Number(id)))
    )).map(Number);

    let userMap: Record<string, string> = {};
    if (userIdsToFetch.length > 0) {
      const usersData = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIdsToFetch));
        
      for (const u of usersData) {
        userMap[u.id.toString()] = u.name;
      }
    }

    // Attach user name to logs — prefer the userName stored directly in the log row,
    // then fall back to the user-table lookup, then to the raw userId.
    const mappedLogs = logs.map((log: any) => ({
      ...log,
      userName: log.userName || userMap[log.userId] || (log.userId === 'system' ? 'System' : log.userId)
    }));
    
    sendSuccess(res, { logs: mappedLogs, total: totalCount?.[0]?.count ?? 0, page, limit });
  }));

  // ─── Budget Alerts ───
  router.get('/budget-alerts', asyncHandler(async (req: any, res: any) => {
    const tenantId = req.tenantSlug || 'demo';
    const db = req.db;
    let alerts = await db.select().from(aiBudgetAlerts)
      .where(eq(aiBudgetAlerts.tenantId, tenantId));
    
    // Lazy Provision Defaults
    if (alerts.length === 0) {
      const defaultAlerts = [
        { tenantId, title: 'Wallet low', description: 'Triggers when central wallet balance drops below threshold', type: 'threshold', threshold: 5000, inApp: true, email: true, sms: false },
        { tenantId, title: 'Model overspend', description: 'Triggers if daily model spend exceeds budget by 20%', type: 'event', inApp: true, email: false, sms: false },
        { tenantId, title: 'Clinic near limit', description: 'Triggers when a clinic consumes ≥80% of monthly limit', type: 'event', inApp: true, email: true, sms: true },
        { tenantId, title: 'Wallet depletion imminent', description: 'Triggers when projected credits will exhaust in X days', type: 'days', threshold: 7, inApp: true, email: true, sms: true },
        { tenantId, title: 'Fallback routing triggered', description: 'Triggers when a primary model fails and fallback is used', type: 'event', inApp: true, email: false, sms: false },
        { tenantId, title: 'API key expiring', description: 'Triggers when a configured provider key expires in X days', type: 'days', threshold: 14, inApp: true, email: true, sms: false },
      ];
      await db.insert(aiBudgetAlerts).values(defaultAlerts);
      alerts = await db.select().from(aiBudgetAlerts).where(eq(aiBudgetAlerts.tenantId, tenantId));
    }
    
    sendSuccess(res, alerts);
  }));

  router.put('/budget-alerts/:id', asyncHandler(async (req: any, res: any) => {
    const db = req.db;
    const alertId = parseInt(req.params.id, 10);
    const { threshold, inApp, email, sms } = req.body;
    
    await db.update(aiBudgetAlerts)
      .set({ 
        threshold: threshold !== undefined ? threshold : undefined,
        inApp: inApp !== undefined ? inApp : undefined, 
        email: email !== undefined ? email : undefined, 
        sms: sms !== undefined ? sms : undefined,
        updatedAt: new Date()
      })
      .where(eq(aiBudgetAlerts.id, alertId));
    
    sendSuccess(res, { updated: true });
  }));

  return router;
}
