# PROJECT: HomeoX

## Overview
HomeoX is an enterprise-grade homeopathic clinic management platform with:
- AI-powered consultation
- Real-time transcription
- Multi-tenant architecture (schema-per-tenant)

## Tech Stack
- Language: TypeScript (strict)
- Backend: Express (DDD, Ports & Adapters)
- Frontend: React 19
- Database: PostgreSQL (schema-per-tenant)
- ORM: Drizzle
- Validation: Zod
- Cache: Redis / Upstash
- AI: Gemini, Groq, Azure OpenAI (failover)
- Transcription: Deepgram + Web Speech API
- Video: LiveKit
- Payments: Razorpay
- Logging: Pino
- Testing: Vitest

## Key Decisions
- Migrated from MySQL → PostgreSQL
- Schema-per-tenant for isolation
- Redis for caching
- Circuit breakers for reliability
- Shared validation using Zod