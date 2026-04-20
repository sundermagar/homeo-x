import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { aiConfig } from '../../../shared/config/ai-config';
import { aiGeminiBreaker, aiGroqBreaker, deepgramBreaker } from '../../../shared/resilience/circuit-breaker';
import { sendSuccess } from '../../../shared/response-formatter';
import { sql } from 'drizzle-orm';

export const healthRouter: ExpressRouter = Router();

healthRouter.get('/', (_req, res) => {
  const aiHealth = aiConfig.getHealthStatus();
  const breakers = {
    gemini: aiGeminiBreaker.getState(),
    groq: aiGroqBreaker.getState(),
    deepgram: deepgramBreaker.getState(),
  };

  const allProvidersDown = !aiHealth.gemini?.available && !aiHealth.groq?.available;

  const payload = {
    status: allProvidersDown ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ai: aiHealth,
    circuitBreakers: breakers,
  };

  sendSuccess(res, payload, undefined, allProvidersDown ? 503 : 200);
});

// Temporary: seed/reset demo users so login works
healthRouter.post('/seed-demo-users', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const forceEnable = process.env.ENABLE_DEBUG_ROUTES === 'true';

  if (isProd && !forceEnable) {
    return res.status(403).json({ 
      success: false, 
      error: 'Security Breach: Admin tools are disabled in production.' 
    });
  }

  try {
    // bcrypt hash of "password123" (cost 10)
    const hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xdM0ttR9i0NcMsuG';
    const demoUsers = [
      { email: 'admin@homxo.in',       name: 'Admin Demo',     type: 'Admin' },
      { email: 'doctor@homxo.in',      name: 'Dr. Demo',       type: 'Doctor' },
      { email: 'reception@homxo.in',   name: 'Reception Demo', type: 'Receptionist' },
      { email: 'clinicadmin@homxo.in', name: 'Clinic Admin',   type: 'Clinicadmin' },
    ];
    const results = [];
    for (const u of demoUsers) {
      const existing = await req.tenantDb.execute(sql`SELECT id FROM users WHERE email = ${u.email} LIMIT 1`);
      if ((existing as any[]).length > 0) {
        await req.tenantDb.execute(sql`UPDATE users SET password = ${hash}, updated_at = NOW() WHERE email = ${u.email}`);
        results.push({ email: u.email, action: 'updated' });
      } else {
        const maxRes = await req.tenantDb.execute(sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users`);
        const nextId = (maxRes as any[])[0]?.next_id ?? 1;
        await req.tenantDb.execute(
          sql`INSERT INTO users (id, name, context_id, email, password, type, created_at, updated_at)
              VALUES (${nextId}, ${u.name}, 1, ${u.email}, ${hash}, ${u.type}, NOW(), NOW())`
        );
        results.push({ email: u.email, action: 'created' });
      }
    }
    res.json({ success: true, message: 'Login with password: password123', results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate fresh bcrypt hash and update admin password
healthRouter.post('/reset-admin-password', async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const forceEnable = process.env.ENABLE_DEBUG_ROUTES === 'true';

  if (isProd && !forceEnable) {
    return res.status(403).json({ 
      success: false, 
      error: 'Security Breach: Admin tools are disabled in production.' 
    });
  }

  try {
    const bcrypt = await import('bcryptjs');
    const { password = 'password123', email = 'admin@homxo.in' } = req.body;
    const hash = await bcrypt.default.hash(password, 10);
    await req.tenantDb.execute(sql`UPDATE users SET password = ${hash} WHERE email = ${email}`);
    const verify = await bcrypt.default.compare(password, hash);
    res.json({ success: true, email, password, verify, hash_prefix: hash.substring(0, 15) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

