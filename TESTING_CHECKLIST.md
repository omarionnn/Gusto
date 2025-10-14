# Testing Checklist

Use this checklist to verify all components are working correctly.

## Prerequisites Setup

- [ ] Node.js 18+ is installed
- [ ] npm is available
- [ ] Browserbase account created and API keys obtained
- [ ] Anthropic account created and API keys obtained

## Installation Tests

- [ ] Root dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Backend .env file created with real API keys
- [ ] Frontend .env.local file created

## Backend Tests

### Server Startup
```bash
cd backend
npm run dev
```

- [ ] Server starts without errors
- [ ] Database initializes successfully
- [ ] Cleanup handlers registered
- [ ] Environment variables verified
- [ ] Server running on port 3001

### API Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Browser Testing Platform API is running",
  "timestamp": "..."
}
```

- [ ] Health endpoint returns 200 OK
- [ ] Response contains correct status

### API Endpoints Test
```bash
# List tests
curl http://localhost:3001/api/test/list

# Expected: {"tests":[],"count":0}
```

- [ ] List endpoint returns empty array initially
- [ ] No errors in console

## Frontend Tests

### Frontend Startup
```bash
cd frontend
npm run dev
```

- [ ] Next.js compiles without errors
- [ ] No TypeScript errors
- [ ] Server running on port 3000
- [ ] Can access http://localhost:3000

### UI Tests

#### Homepage (http://localhost:3000)
- [ ] Page loads without errors
- [ ] Title displays: "Browser Testing Platform"
- [ ] URL input field is visible
- [ ] "Start AI Test" button is present
- [ ] Three feature cards are displayed
- [ ] No console errors

#### Test Start Flow
1. Enter "example.com" in URL field
2. Click "Start AI Test"

- [ ] Loading state shows (button shows spinner)
- [ ] Redirects to `/test/[testId]` page
- [ ] No JavaScript errors

Note: If you have real API keys, the test will actually start!

## Integration Tests (Requires Real API Keys)

### Full Test Workflow

1. **Start Test**
   - [ ] Enter a real website URL
   - [ ] Click "Start AI Test"
   - [ ] Test ID is generated
   - [ ] Redirected to test page

2. **Test Execution Page**
   - [ ] Live browser view loads
   - [ ] Status badge shows "RUNNING"
   - [ ] Progress updates appear in right panel
   - [ ] Live view iframe shows the website
   - [ ] Can see Claude making decisions
   - [ ] Actions are logged in real-time

3. **Stop Test** (Optional)
   - [ ] Click "Stop Test" button
   - [ ] Test status changes to "STOPPED"
   - [ ] Browserbase session ends

4. **View Report**
   - [ ] Wait for test to complete (status: "COMPLETED")
   - [ ] Click "View Report" button
   - [ ] Redirected to `/report/[testId]`

5. **Report Page**
   - [ ] Summary cards display metrics
   - [ ] Session recording link is present
   - [ ] All tabs work (Summary, Actions, Issues, Pages)
   - [ ] Actions timeline is expandable
   - [ ] Export JSON button works

## Database Tests

### Check Database File
```bash
ls data/
# Should show: browser-tests.db
```

- [ ] Database file exists
- [ ] Database contains tables (tests, reports, action_logs)

### Verify Test Data
After running a test:
```bash
sqlite3 data/browser-tests.db "SELECT id, url, status FROM tests LIMIT 5;"
```

- [ ] Tests are recorded in database
- [ ] Status field is updated correctly

## Error Handling Tests

### Invalid URL Test
1. Go to homepage
2. Enter invalid URL (e.g., "not a url")
3. Click "Start AI Test"

- [ ] Error message displays
- [ ] No server crash
- [ ] Can retry with valid URL

### 404 Test
```bash
curl http://localhost:3001/api/nonexistent
```

- [ ] Returns 404 status
- [ ] Returns proper JSON error
- [ ] Server logs the request

### Server Shutdown Test
1. Start backend server
2. Press Ctrl+C

- [ ] "Shutting down gracefully..." message appears
- [ ] Running tests are cleaned up
- [ ] Database closes properly
- [ ] Process exits cleanly

## Performance Tests

### Backend Response Times
- [ ] Health endpoint responds < 100ms
- [ ] Test start responds < 2 seconds (with valid keys)
- [ ] Status check responds < 500ms
- [ ] Report retrieval responds < 1 second

### Frontend Performance
- [ ] Homepage loads < 2 seconds
- [ ] Page transitions are smooth
- [ ] No memory leaks (check browser dev tools)
- [ ] Responsive on mobile devices

## Browser Compatibility Tests

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Security Tests

- [ ] API keys not exposed in frontend
- [ ] CORS properly configured
- [ ] No sensitive data in console logs
- [ ] Environment variables not committed to git

## Documentation Tests

- [ ] README.md exists and is complete
- [ ] START.md has clear instructions
- [ ] PROJECT_SUMMARY.md is comprehensive
- [ ] Code comments are helpful
- [ ] API endpoints are documented

## Final Verification

- [ ] Can start both frontend and backend with one command (`npm run dev` from root)
- [ ] All features work end-to-end
- [ ] No errors in any console
- [ ] Database persists data correctly
- [ ] Graceful shutdown works
- [ ] Ready for demo

## Demo Script

**5-Minute Demo Flow:**

1. **Introduction (30s)**
   - "This is an AI-powered browser testing platform"
   - "It uses Claude and Browserbase to automatically test websites"

2. **Start Test (1m)**
   - Show homepage UI
   - Enter a website URL
   - Click "Start AI Test"
   - Explain what's happening behind the scenes

3. **Live View (2m)**
   - Show live browser session
   - Point out AI making decisions
   - Show progress updates
   - Explain Claude's vision capabilities

4. **Report (1.5m)**
   - Show completed test report
   - Navigate through tabs
   - Highlight key metrics
   - Show session recording
   - Export report as JSON

5. **Q&A (30s)**
   - Answer questions about implementation
   - Discuss potential enhancements
   - Show code structure if interested

## Troubleshooting Guide

### Backend won't start
- Check Node.js version (needs 18+)
- Verify .env file exists and has valid keys
- Check port 3001 is not in use: `lsof -i :3001`
- Check npm install completed successfully

### Frontend won't start
- Check Node.js version
- Verify .env.local exists
- Check port 3000 is not in use
- Run `npm install` in frontend directory
- Clear .next folder: `rm -rf .next`

### Tests fail to start
- Verify Browserbase API key is valid
- Check Browserbase project ID is correct
- Verify Anthropic API key has credits
- Check internet connection

### Database errors
- Delete database and restart: `rm data/browser-tests.db`
- Database will be recreated automatically
- Check file permissions in data/ directory

### Live view not loading
- Check Browserbase session was created
- Verify live view URL is correct
- Try opening live view URL in new tab
- Check for iframe blocking in browser

## Success Indicators

✅ **Ready for Demo if:**
- All backend tests pass
- All frontend tests pass
- Can complete full test workflow
- Reports generate correctly
- No console errors
- Graceful shutdown works
- Documentation is complete

---

**Current Status:** All features implemented and ready for testing with real API keys!
