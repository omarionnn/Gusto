# Browser Testing Platform

An AI-powered browser testing platform that uses Claude and Browserbase to automatically test websites.

## Project Structure

```
├── backend/          # Node.js + Express API
├── frontend/         # Next.js dashboard
└── shared/          # Shared utilities and types
```

## Setup

1. Clone the repository
2. Copy `.env.example` files in both backend and frontend directories and fill in your API keys
3. Install dependencies:
   ```bash
   npm run install:all
   ```

## Development

Run both backend and frontend in development mode:
```bash
npm run dev
```

Or run them separately:
```bash
npm run dev:backend
npm run dev:frontend
```

## Environment Variables

### Backend (.env)
- `BROWSERBASE_API_KEY`: Your Browserbase API key
- `BROWSERBASE_PROJECT_ID`: Your Browserbase project ID
- `ANTHROPIC_API_KEY`: Your Anthropic Claude API key
- `PORT`: Backend server port (default: 3001)

### Frontend (.env)
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3001)

## Features

- 🤖 AI-powered website testing using Claude
- 🌐 Remote browser sessions via Browserbase
- 📊 Detailed test reports with recordings
- 🎥 Live view of test execution
- 📝 Comprehensive issue detection
