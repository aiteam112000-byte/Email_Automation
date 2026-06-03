# ReachX — Email Marketing Platform

ReachX is a full-stack email marketing platform built for modern GTM teams. It combines Gmail OAuth sending, real-time email validation, per-recipient pixel tracking, visual workflow automation, and deep campaign analytics — all in one place.

---

## What We Offer

### Gmail OAuth Sending
Connect multiple Gmail accounts via Google OAuth2. ReachX round-robins campaign sends across all connected accounts to maximize deliverability without hitting Gmail send limits. No SMTP configuration required.

### Campaign Engine
Create email campaigns with a subject line, HTML content, and a recipient list. Send immediately or schedule for a future date. Track delivery, opens, clicks, bounces, and unsubscribes per campaign.

### Email Validation
Validate email addresses before sending — format checks, MX record lookups, and mailbox existence verification. Bulk validate your full contact list in one go to protect your sender reputation.

### Pixel Folder
Manage tracking pixels and image assets in a central folder. Create named tracking pixels, upload images, and insert them into campaigns with a single click. See per-recipient open stats per pixel asset — know exactly who opened, when, and from which campaign.

### Open & Click Tracking
Every email sent includes a per-recipient tracking pixel and rewritten click links. Opens and clicks are recorded individually per recipient, giving you real engagement data — not campaign-level estimates.

### Visual Workflow Builder
An n8n-style drag-and-drop canvas for building email automation sequences. Add steps (Trigger, Send Email, Wait, If/Else, Update Tag, Remove Tag, End), connect them with arrows, and configure each step in a side panel. If/Else nodes support Yes/No branch routing.

### Contacts & Segments
Import contacts via CSV or add manually. Tag contacts, create dynamic segments by tag or status, and filter your list before sending. Bulk delete, export to CSV, and search across your full contact database.

### Analytics
Per-campaign analytics including sent count, open rate, click rate, bounce rate, and unsubscribe count. Dashboard overview with aggregate stats across all campaigns.

### Scheduled Campaigns
Schedule campaigns to send at a future date and time. A built-in scheduler checks every 60 seconds and fires scheduled campaigns automatically.

### Follow-up Workflows
Attach a workflow to any campaign. After sending, contacts are automatically enrolled into the linked workflow based on a trigger (all recipients, opened, or clicked).

### Workflow Automation Engine
Background BullMQ workers process workflow enrollments with Redis. Supports wait steps (minutes, hours, days), conditional branching, tag updates, and email sends — all non-blocking.

---

## Tech Stack

### Frontend (`reachx-frontend`)
- React 18 + Vite
- React Router v6
- Tailwind CSS
- @xyflow/react (workflow canvas)
- Vanilla CSS (landing page animations)

### Backend (`reachx-backend`)
- Node.js + Express
- Prisma ORM + PostgreSQL
- BullMQ + Redis (email & workflow queues)
- Nodemailer + Gmail OAuth2 (sending)
- googleapis (OAuth2 token management)
- JWT authentication
- Multer (image uploads)

---

## Project Structure

```
Email_Automation/
├── reachx-frontend/        # Vite + React frontend
│   ├── src/
│   │   ├── components/     # Sidebar
│   │   ├── pages/
│   │   │   ├── dashboard/  # All dashboard pages
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   └── lib/            # API client, auth helpers
│   └── .env                # VITE_API_URL, Gmail OAuth credentials
│
└── reachx-backend/         # Express API server
    ├── src/
    │   ├── routes/         # campaigns, contacts, pixels, gmail, workflows, track, etc.
    │   ├── lib/            # smtp, gmail, prisma, rewriteLinks, workflowQueue
    │   ├── workers/        # emailWorker, workflowWorker
    │   └── middleware/     # requireAuth (JWT)
    ├── prisma/
    │   └── schema.prisma   # Full DB schema
    ├── uploads/            # Uploaded images served as static files
    └── .env                # DATABASE_URL, GOOGLE_CLIENT_ID/SECRET, JWT_SECRET, etc.
```

---

## Getting Started

### Prerequisites
- Node.js >= 20
- PostgreSQL
- Redis

### 1. Clone and install

```bash
# Install backend dependencies
cd reachx-backend
npm install

# Install frontend dependencies
cd ../reachx-frontend
npm install
```

### 2. Configure environment

**`reachx-backend/.env`**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/reachx"
JWT_SECRET="your-secret"
APP_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/gmail/callback"
```

**`reachx-frontend/.env`**
```env
VITE_API_URL=http://localhost:4000
VITE_GMAIL_CLIENT_ID_1=your-client-id-1
VITE_GMAIL_CLIENT_SECRET_1=your-client-secret-1
VITE_GMAIL_CLIENT_ID_2=your-client-id-2
VITE_GMAIL_CLIENT_SECRET_2=your-client-secret-2
```

### 3. Run database migrations

```bash
cd reachx-backend
npx prisma db push
```

### 4. Start the servers

```bash
# Backend
cd reachx-backend
npm run dev

# Frontend
cd reachx-frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns/:id/send` | Send a campaign |
| POST | `/api/campaigns/:id/schedule` | Schedule a campaign |
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts/import` | Bulk import contacts from CSV |
| GET | `/api/pixels` | List pixel folder assets |
| POST | `/api/pixels/upload` | Upload an image asset |
| GET | `/api/pixels/:id/stats` | Per-recipient open stats for a pixel |
| GET | `/api/gmail/auth-url` | Get Google OAuth URL for Gmail connect |
| GET | `/api/gmail/callback` | OAuth callback — saves refresh token |
| GET | `/api/gmail/accounts` | List connected Gmail accounts |
| GET | `/api/track` | Tracking pixel endpoint (opens + clicks) |
| GET | `/api/workflows` | List workflows |
| PUT | `/api/workflows/:id/steps` | Save workflow steps |
| GET | `/api/stats` | Dashboard aggregate stats |

---

## Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Gmail API**
3. Create OAuth 2.0 credentials (Web application type)
4. Add `http://localhost:4000/api/gmail/callback` as an authorized redirect URI
5. Add test users in OAuth consent screen
6. Copy Client ID and Secret to `.env`
7. In the app: Settings → Connect Gmail → authorize each account

---

## License

MIT
