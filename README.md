n d

# Distribution Management

A mobile-first distributor billing and operations application built as a simple JavaScript monorepo.

## Architecture

- `client/` — React + Vite + Tailwind CSS + TanStack Query
- `server/` — Node.js + Express + Prisma
- Database — PostgreSQL (recommended: Neon)
- Deployment — Render Static Site + Render Web Service
- Invoice PDFs — generated on demand; PDFs are not stored
- Excel imports — parsed in memory; uploaded files are not stored

## Main modules

Dashboard, Billing, Bill History, Product Master, Retailer Master, Selling Master, Purchases, Inventory, Collections & Outstanding, Expenses, Profit, Reports and Settings.

Retailer-specific price priority:

`Retailer Selling Master rate > Product default selling rate`

Every invoice item stores the actual billed rate, product/GST snapshot and cost snapshot so old invoices can always be reproduced even after master data changes. V1 treats selling rates as pre-GST taxable rates.

## Local setup

### 1. Requirements

- Node.js 20+
- PostgreSQL, or a Neon PostgreSQL connection string

### 2. Server

```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Default seeded login is controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`.

### 3. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Render + Neon deployment

1. Create a Neon PostgreSQL project and copy the pooled connection string.
2. Push this monorepo to GitHub.
3. Create a Render Blueprint from `render.yaml`, or create the two services manually.
4. Backend environment variables:
   - `DATABASE_URL` = Neon pooled PostgreSQL URL
   - `DIRECT_URL` = Neon direct/unpooled PostgreSQL URL for migrations
   - `JWT_SECRET` = strong random secret
   - `CORS_ORIGIN` = final frontend URL, e.g. `https://distribution-web.onrender.com`
   - `BUSINESS_NAME`, `BUSINESS_GSTIN`, `BUSINESS_ADDRESS`, `BUSINESS_PHONE`, `BUSINESS_STATE`
5. Frontend environment variable:
   - `VITE_API_URL` = backend URL + `/api`, e.g. `https://distribution-api.onrender.com/api`
6. Run the seed once against production if you want the initial admin:

```bash
cd server
DATABASE_URL="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run seed
```

For live business use, use an always-on paid Render backend to avoid cold-start delays.

## Excel import formats

### Product Master

Headers can use these names (case-insensitive):

`code, name, category, basePrice, defaultSellingRate, mrp, gstRate, hsnCode, unit, unitsPerCarton, minStock, openingQty`

### Selling Master

`retailerCode, productCode, sellingRate`

Imports are validated before commit. The original Excel file is discarded after processing.

## Important accounting behavior

- Purchases increase stock.
- Billing reduces stock.
- Credit sales increase retailer outstanding.
- Collections reduce outstanding.
- Profit = Sales - Cost of Goods Sold - Expenses.
- Invoice PDF generation reads invoice snapshots, not current master rates.

## Security / production checklist

- Change seeded admin credentials.
- Use a strong `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to your frontend URL.
- Keep Neon credentials only on the backend.
- Enable Neon backups / restore options suitable for your business plan.
- Do not commit `.env` files.
