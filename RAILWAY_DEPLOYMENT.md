# 🚀 Railway Deployment Guide: Kreed.health Platform

This guide provides a comprehensive, step-by-step walkthrough for deploying the Kreed.health monorepo to [Railway](https://railway.app). The project follows a modern monorepo architecture using **pnpm**, **Turborepo**, and **TypeScript**.

## 🏗️ Architecture Overview

The Kreed.health platform consists of:
- **Backend API (`apps/api`)**: Node.js/Express server.
- **Frontend Web (`apps/web`)**: React/Vite application.
- **Shared Packages (`packages/*`)**: Database schema, Types, and Validation logic.
- **Database**: PostgreSQL (Managed by Railway).
- **Cache**: Redis (Managed by Railway).

---

## 📋 Prerequisites

1.  **Railway Account**: Signed up at [railway.app](https://railway.app).
2.  **Railway CLI** (Optional but recommended): `npm i -g @railway/cli`.
3.  **GitHub Repository**: Your code must be pushed to a GitHub repository.

---

## 🛠️ Step 1: Initialize Railway Project

1.  Log in to [Railway](https://railway.app).
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your `kreed-health` repository.
4.  **Do not deploy yet!** We need to configure the services first.

### Add Managed Databases
In your Railway project dashboard, click **"New"** and add:
1.  **Database** -> **Add PostgreSQL**.
2.  **Database** -> **Add Redis**.

---

## 📡 Step 2: Deploy the Backend API

Create a new Service in your project for the API:

1.  **Service Name**: `homeo_x_api`
2.  **Root Directory**: `/` (Railway works best from the monorepo root for pnpm workspaces).
3.  **Build Command**:
    ```bash
    pnpm install && pnpm build --filter=@mmc/api
    ```
4.  **Start Command**:
    ```bash
    pnpm --filter=@mmc/api start
    ```
5.  **Environment Variables**:
    Railway will automatically provide `DATABASE_URL` and `REDIS_URL` if they are in the same project. Add the following manually:
    - `NODE_ENV`: `production`
    - `PORT`: `3001`
    - `JWT_SECRET`: Generate a strong secret (`openssl rand -base64 32`)
    - `CORS_ORIGINS`: Your frontend URL (e.g., `https://kreed-health-web.up.railway.app`)
    - `APP_URL`: Your API URL (e.g., `https://kreed-health-api.up.railway.app`)

---

## 💻 Step 3: Deploy the Frontend Web

Create another Service for the Frontend:

1.  **Service Name**: `homeo_x_web`
2.  **Root Directory**: `/`
3.  **Build Command**:
    ```bash
    pnpm install && pnpm build --filter=@mmc/web
    ```
4.  **Start Command**:
    Since it's a static build, we use a simple server:
    ```bash
    npx serve -s apps/web/dist -p $PORT
    ```
5.  **Environment Variables**:
    - `VITE_API_URL`: The URL of your API service (e.g., `https://kreed-health-api.up.railway.app`)
    - `NODE_ENV`: `production`

---

## 🗄️ Step 4: Database Migrations

Before the app is functional, you must run migrations. You can do this in two ways:

### Option A: Manual Migration (Preferred for First Run)
Use the Railway CLI from your local machine:
```bash
railway run pnpm db:migrate
```

### Option B: Post-Build Script
You can modify the API build command to include migrations:
```bash
pnpm install && pnpm build --filter=@mmc/api && pnpm db:migrate
```

---

## 🔐 Critical Environment Variables Check

Ensure these variables are set in your Railway dashboard for the **API Service**:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | Handled by Railway PostgreSQL plugin |
| `REDIS_URL` | Handled by Railway Redis plugin |
| `JWT_SECRET` | used for Auth |
| `RAZORPAY_KEY` | Payment Integration |
| `RAZORPAY_SECRET` | Payment Integration |
| `GEMINI_API_KEY` | AI Features |

---

## 🚦 Troubleshooting

1.  **Build Failures**: Ensure you are using Node 22+. You can specify this in Railway's "Settings" or via the `engines` field in `package.json`.
2.  **CORS Issues**: Double-check that `CORS_ORIGINS` in the API service matches the URL of your Web service.
3.  **Module Not Found**: This usually happens if `pnpm install` wasn't run at the root. Ensure the build command is executed from the project root.

---

> [!TIP]
> **Pro Tip**: Use Railway's **"Domain"** tab to assign custom domains to your API and Web components for a professional setup.
