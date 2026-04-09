# AI System

## Providers
- Gemini
- Groq
- Azure OpenAI

## Features
- AI consultation
- Real-time transcription
- Failover chain across providers

## Rules
- Always use provider fallback
- Track usage (tokens, latency)
- Log all AI calls (ai_audit_logs)
- Health check via /api/health
- Support hot-reload of API keys

## Circuit Breaker
- Prevent cascade failures
- Track failures per service
- States:
  - CLOSED (healthy)
  - OPEN (failing)
  - HALF_OPEN (recovering)

## AI Behavior Instruction

When generating code:
- Follow DDD structure
- Use ports & adapters
- Respect multi-tenancy
- Use Zod validation
- Use PostgreSQL + Drizzle
- Follow existing API patterns