# PlayMate

PlayMate helps nearby parents coordinate fun, safe playdates by matching their kids by age, interests, and availability. The app delivers a full-stack experience that blends a React front end, an Express/Node back end, and a PostgreSQL database.

## Features
- Email-and-password authentication with secure session cookies
- Kid profiles with ages and favourite activities
- Interactive map for choosing or updating a personal playdate location
- Friendship workflow (send requests, accept, ignore)
- Playmate discovery by filtering kids who share an activity
- Seed data for users, kids, and friendships so you can explore immediately

## Tech Stack
- React 18 + Vite
- TypeScript
- Emotion for styling
- Leaflet and react-leaflet for mapping
- Express, Sequelize, and PostgreSQL
- Nodemon for local development

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL running locally on `127.0.0.1:5432` with credentials `postgres / postgres`
  - Adjust `src/server/initSeq.ts` if you use different connection details.

### Installation
```bash
git clone <your-fork-or-repo-url>
cd PlayMate
npm install
```

### Database
- Ensure PostgreSQL is running and accessible with the credentials above.
- On first launch the app seeds starter data (users, kids, friendships) automatically.

### Development Server
```bash
npm start
```
- Runs the Express API and the Vite dev server on **http://localhost:8080** with hot reloading.
- Watch the terminal for “Listening on http://localhost:8080”.

### Production Build
```bash
npm run build
```
- Outputs an optimized client bundle using Vite.

## Sample Accounts
- jill / a
- brad / b
- cathy / c
- dilb / d

## Key API Routes
- `POST /auth/login` – authenticate and start a session
- `GET /api/kids/mykids` – current guardian’s kids
- `GET /api/playdate-point/coordinates` – fetch saved map coordinates
- `POST /api/playdate-point/coordinates` – update map coordinates
- `GET /api/friends/pending` – requests you sent
- `GET /api/friends/askingforme` – requests you received
- `POST /api/friends/ask` – send a friend request
- `POST /api/friends/setstate` – accept or ignore a request

## Project Structure
```
src/
  client/             # React app (components, hooks, CSS)
  server/
    routes/           # Express API routes
    middleware/       # Auth and request helpers
    models/           # Sequelize models and seed helpers
    vite-server.ts    # Express + Vite integration
index.html            # Vite entry template
```

## Troubleshooting
- **Blank map or missing tiles**: ensure Leaflet assets load and Postgres is running so user data can be fetched.
- **Login fails**: verify Postgres credentials and that seed users exist (`populateDatabase` runs on startup).
- **Port already in use**: stop other services on `8080` or update `src/server/vite-server.ts`.

## Contributing
1. Fork the repository and create a feature branch.
2. Follow the coding conventions (TypeScript, ESLint defaults).
3. Include clear commit messages and open a pull request describing your change.

Enjoy building playful experiences with PlayMate!
