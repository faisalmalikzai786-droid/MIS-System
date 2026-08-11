# Office MIS

Beginner-friendly Office Management Information System for **courses**, **students**, and **fees**.

**Stack:** React · shadcn/ui · Tailwind CSS · Node.js · Express · SQLite (built-in `node:sqlite`)

---

## Prerequisites

1. [Node.js](https://nodejs.org/) (v22.5+ recommended for built-in SQLite)

---

## Setup

### 1. Install dependencies

```bash
npm install
cd client
npm install
cd ..
```

### 2. Configure environment

Copy `.env.example` to `.env` (or use the defaults):

```
PORT=3000
DB_PATH=./data/office_mis.sqlite
SESSION_SECRET=any-long-random-string
```

### 3. Database

SQLite is file-based. Tables are created automatically on first connect from `database/schema.sql`.

```bash
npm run seed
```

Default login:
- **Email:** `admin@course.local` (or `admin@office.local`)
- **Password:** `Admin@123`

### 4. Build UI and start

```bash
npm run build:client
npm start
```

For frontend-only development: `npm run dev` (Vite). Start the API with `npm start` in another terminal.

Open **http://localhost:3000/login**

Pages:
- `/dashboard`
- `/classes`
- `/students`
- `/student-attendance`
- `/fees`
- `/users`
