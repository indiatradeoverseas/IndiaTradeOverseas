# ITO Task Client

This is the frontend for the backend assignment in `Task/Server`.

## What it does
- Login and register users with JWT
- Create leads from chat payloads
- Update lead stages and assignments
- Upload documents
- Trigger security reveal actions and inspect logs
- Request quotations and create dispatch/payment records
- Show dashboard summary from the backend

## Setup
1. Copy `.env.example` to `.env`.
2. Make sure the backend is running at the URL in `VITE_API_BASE_URL`.
3. Install dependencies if needed:

```bash
cd G:\Ev\Task\Clinet
npm install
```

4. Start the app:

```bash
npm run dev
```

## Backend URL
Default API base URL:

```bash
http://localhost:5000/api/v1
```

If your backend runs elsewhere, change `VITE_API_BASE_URL` in `.env`.
