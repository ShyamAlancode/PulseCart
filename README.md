# PulseCart 🚀

PulseCart is a high-concurrency, flash-sale e-commerce catalog platform designed for limited-edition creator drops. It ensures **zero overselling** under extreme burst traffic by leveraging Amazon DynamoDB's single-table transaction boundaries and atomic conditional writes. 

---

## Key Features

1. **Atomic Concurrency Protection**: Multi-item DynamoDB transactions (`TransactWriteItems`) use a strict `ConditionExpression` checking `availableCount > :zero` to isolate stock updates and prevent race conditions.
2. **DynamoDB Stream Lambda Integration**: A native Node.js AWS Lambda worker listens to table stream mutations (`INSERT` events on order keys) and automatically dispatches transactional order confirmation emails via Amazon SES.
3. **Keyless AWS Authentication (OIDC)**: Secure IAM Role federation using OpenID Connect (OIDC) between Vercel and AWS, completely eliminating the need for hardcoded `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` credentials in production.
4. **Unified Sandbox Authentication**: Unified next-auth v5 (Beta) implementation supporting Google OAuth alongside Credentials sandbox shortcuts for streamlined testing.
5. **Interactive UI System**: Fully responsive dark mode interface styled with premium CSS, complete with shimmering skeleton cards, canvas-confetti victory animations, and pulsing live-stock progress counters.

---

## Architectural Topology

```mermaid
graph TD
    Browser[Browser / Client] -- HTTPS --> Vercel[Vercel Edge Network]
    Vercel -- Route --> Next[Next.js API Route / App Router]
    Next -. Exchange OIDC token .-> IAM[AWS IAM Role Federation]
    IAM -. STS Temp Credentials .-> DynamoDB[(Amazon DynamoDB Single-Table)]
    Next -- TransactWriteCommand --> DynamoDB
    DynamoDB -- Change Stream INSERT --> Streams[DynamoDB Streams]
    Streams -- Event Source Mapping --> Lambda[AWS Lambda Email Worker]
    Lambda -- SendEmail --> SES[Amazon SES]
    Lambda -- Logs --> CloudWatch[Amazon CloudWatch]
```

---

## DynamoDB Single-Table Schema Design

PulseCart stores drop configurations, real-time inventory balances, seller relations, and orders inside a unified table `PulseCart` to ensure fast queries and transactional atomicity.

| Partition Key (PK) | Sort Key (SK) | GSI1PK (GSI1) | GSI1SK (GSI1) | Attributes | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DROP#<dropId>` | `METADATA` | - | - | `title`, `description`, `imageUrl`, `startTime`, `endTime`, `status`, `totalStock` | Drop configurations & schedule. |
| `DROP#<dropId>` | `INVENTORY#<productId>` | - | - | `availableCount`, `baseInventory`, `price`, `sku` | Active stock limits & pricing. |
| `SELLER#<sellerId>` | `DROP#<dropId>` | - | - | `title`, `status`, `createdAt` | Seller inventory mapping. |
| `USER#<userId>` | `ORDER#<orderId>` | `DROP#<dropId>` | `ORDER#<orderId>` | `dropId`, `productId`, `status`, `total`, `timestamp`, `email` | Confirmed order validation. |

---

## Local Development Quick Start

### 1. Prerequisites
- **Node.js**: v20.x or higher.
- **Java JRE**: Required to run DynamoDB Local locally.

### 2. Download and Run DynamoDB Local
Run the automated PowerShell setup script to pull and start a local instance on port `8000`:
```powershell
# In one terminal, configure and download
powershell -File scripts/setup-dynamodb.ps1

# Start the local database
powershell -File scripts/start-dynamodb.ps1
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Local Environment Variables
Create a `.env.local` file at the project root:
```env
# NextAuth Settings
AUTH_SECRET=921eef00c7333a39e83cfebec93a8d9a # Generate using `openssl rand -hex 32`
NEXTAUTH_URL=http://localhost:3000

# Sandbox Credentials for Testing (Google OAuth is optional locally)
GOOGLE_CLIENT_ID=dummy-client-id
GOOGLE_CLIENT_SECRET=dummy-client-secret

# AWS Config for Local Development
AWS_REGION=localhost
DYNAMODB_TABLE_NAME=PulseCart
```

### 5. Seed the Database
Deploy the tables and seed test drops locally:
```bash
npm run seed
```

### 6. Run Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your web browser.

---

## Concurrency Verification

To simulate heavy burst traffic under load, run the high-concurrency stress test script. This fires **200 simultaneous checkout requests** against **50 items** using a strict DynamoDB transaction boundary:
```bash
npm run stress
```

*Expected Outcome*:
```text
==================================================
🚀 STARTING PULSECART HIGH-CONCURRENCY STRESS TEST
==================================================
Target Available Inventory: 50
Concurrent Requests:       200
...
STRESS TEST RESULTS TABLE:
- CONFIRMED:         50 (Expected: 50)
- SOLD_OUT:          150 (Expected: 150)
- ERROR:             0 (Expected: 0)
- OVERSELL DETECTED: NO  ✅
==================================================
SUCCESS: Stress test passed successfully!
```

---

## Production Deployment Checklist
For production deployment, see our comprehensive [AWS & Vercel Deployment Guide](DEPLOY.md).
