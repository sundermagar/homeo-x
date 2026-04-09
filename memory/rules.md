# Project Rules

## Core Rules
- Follow DDD architecture
- Use Hexagonal Architecture
- Keep domain logic framework-independent
- Use async/await (no blocking)
- Validate all inputs using Zod

## API Rules
- Follow REST conventions
- Response format:

{
  "success": true,
  "data": {},
  "message": ""
}

## Middleware Rules
- JWT authentication
- Tenant resolution
- Zod validation
- Global error handling
- Audit logging

## Error Handling
- Use AppError classes
- Return proper HTTP status
- Include correlationId in every response

## Database Rules
- Use PostgreSQL only
- Schema-per-tenant
- Use Drizzle ORM
- Use JSONB for audit logs

## Audit Rules
- Log every state change:
  - who
  - what
  - when
  - tenant

## Development Rules
- Use pnpm workspace
- Follow modular architecture
- Sync frontend + backend contracts
- Write unit + integration tests