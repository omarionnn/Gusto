# Getting Started with Browser Testing Platform

This guide will help you set up and run the Browser Testing Platform.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- API keys for:
  - Browserbase (get from https://browserbase.com)
  - Anthropic Claude (get from https://console.anthropic.com)

## Installation Steps

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Configuration

### 1. Backend Configuration

Copy the backend environment example file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your API keys:

```env
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
NODE_ENV=development
```

### 2. Frontend Configuration

Copy the frontend environment example file:

```bash
cp frontend/.env.example frontend/.env.local
```

The frontend configuration should work out of the box:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running the Application

### Option 1: Run Both Backend and Frontend Together (Recommended)

From the root directory:

```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend dashboard on http://localhost:3000

### Option 2: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Using the Platform

1. Open your browser and go to http://localhost:3000
2. Enter a website URL you want to test (e.g., "example.com" or "https://example.com")
3. Click "Start AI Test"
4. You'll be redirected to the test view page where you can:
   - Watch the live browser session
   - See real-time progress updates
   - Stop the test if needed
5. Once the test completes, view the detailed report with:
   - Summary statistics
   - Actions timeline
   - Issues found
   - Pages visited
   - Session recording

## API Endpoints

The backend provides the following REST API endpoints:

- `GET /health` - Health check
- `POST /api/test/start` - Start a new test
- `GET /api/test/:testId/status` - Get test status
- `GET /api/test/:testId/report` - Get test report
- `POST /api/test/:testId/stop` - Stop a running test
- `GET /api/test/list` - List all tests

## Troubleshooting

### Backend won't start

- Check that port 3001 is not in use: `lsof -i :3001`
- Verify your `.env` file exists and has valid API keys
- Check logs for specific error messages

### Frontend won't start

- Check that port 3000 is not in use
- Verify frontend dependencies are installed
- Make sure `NEXT_PUBLIC_API_URL` points to the correct backend URL

### Tests fail to start

- Verify Browserbase API credentials are correct
- Check that you have available sessions in your Browserbase account
- Ensure Anthropic API key has sufficient credits

### Database errors

- The database is automatically created in `data/browser-tests.db`
- If issues persist, delete the database file and restart the backend

## Project Structure

```
├── backend/              # Node.js + Express API
│   ├── database/        # SQLite database layer
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   └── utils/           # Utility functions
├── frontend/            # Next.js React app
│   ├── components/      # React components
│   ├── lib/            # API client and utilities
│   ├── pages/          # Next.js pages
│   └── styles/         # CSS styles
└── shared/             # Shared utilities (if any)
```

## Development Tips

- Backend uses hot-reload with `node --watch`
- Frontend uses Next.js Fast Refresh
- Database is SQLite3 stored in `data/` directory
- Test recordings are available via Browserbase dashboard

## Support

For issues or questions:
- Check the README.md for more details
- Review error logs in the console
- Ensure all API keys are valid and have sufficient credits
