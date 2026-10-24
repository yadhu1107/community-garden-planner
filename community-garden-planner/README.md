# Community Garden Planner — Plot & Petal

Plot & Petal is a calm, shared garden register built with React, Vite, Express, and MongoDB. It keeps plot assignments, plants, growing stages, care notes, tasks, and recent activity together in the existing application.

## What you can do

- Create, edit, search, filter, sort, and delete garden plots.
- Track plot size and availability, gardener, plant, planting and harvest dates, watering schedule, expected yield, and growing stage.
- Add tasks, assign them to a gardener or plot, mark them complete, reopen them, and remove them.
- See recent plot and task updates and dashboard totals calculated from the database.
- Use the responsive dashboard with keyboard-visible focus and reduced-motion support.

## Requirements

- Node.js 18 or newer and npm
- A MongoDB Atlas cluster or a local MongoDB server

## Configure the database

From this project folder, copy `server/.env.example` to `server/.env`. Set `MONGO_URI` to your own connection string and keep that private file out of source control. The server reads the URI; it is never sent to the browser.

## Start on Windows / VS Code

Open two terminals in the `community-garden-planner` project folder.

Backend terminal:

```powershell
cd server
npm install
npm run dev
```

Frontend terminal:

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL printed in the frontend terminal, normally `http://localhost:5173`. Vite forwards `/api` requests to Express at `http://localhost:5000`.

## Initialize the garden records

After configuring MongoDB, run this once from the `server` folder when the database collections are empty:

```powershell
npm run seed
```

The initializer adds eight garden plots (including an open and a reserved plot), five upcoming tasks, and three garden notes when the plots collection is empty. It leaves existing records untouched and only adds tasks and notes alongside plots it initialized itself. Running it again will not add duplicates. The records use the same edit and delete actions as other garden information. Seeding is never run automatically when the server starts.

## API

- `GET /api/health` — service status
- `GET /api/plots` — list plots
- `POST /api/plots` — add a plot
- `PATCH /api/plots/:id` — update plot details or stage
- `DELETE /api/plots/:id` — remove a plot
- `GET /api/tasks` — list tasks
- `POST /api/tasks` — add a task
- `PATCH /api/tasks/:id` — complete or reopen a task
- `DELETE /api/tasks/:id` — remove a task
- `GET /api/activity` — latest garden activity

## Project scripts

The client has `npm run dev` and `npm run build`. The server has `npm run dev`, `npm start`, and the opt-in `npm run seed` initializer.
