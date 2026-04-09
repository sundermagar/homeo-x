# Architecture

## Monorepo
- Turborepo + pnpm workspaces

## Structure
- packages/
  - types: shared domain entities, API contracts
  - database: Drizzle ORM + PostgreSQL
  - validation: Zod schemas
- apps/
  - api: Express backend (DDD + Hexagonal Architecture)
  - web: React frontend (TanStack Query + Zustand)
- tools/
  - db-migrate: MySQL → PostgreSQL migration

## Design Patterns
- Hexagonal Architecture (Ports & Adapters)
- Domain-Driven Design (DDD)
- Shared Contracts (@mmc/types)

## Backend Structure
- domains/ → business logic (use-cases)
- ports/ → interfaces
- infrastructure/ → adapters (DB, HTTP, AI)

## Multi-Tenancy
- PostgreSQL schema-per-tenant
- Example:
  - tenant_zirakpur
  - tenant_chd
  - tenant_demo

- Tenant resolution:
  - Based on request host
  - Uses dynamic search_path