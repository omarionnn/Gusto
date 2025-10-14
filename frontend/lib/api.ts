const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface TestResponse {
  testId: string;
  sessionId: string;
  liveViewUrl: string;
  status: string;
  message: string;
}

export interface TestStatus {
  testId: string;
  url?: string;
  status: string;
  browserbaseSessionId?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: Array<any>;
  recordingUrl?: string;
}

export interface TestReport {
  testId: string;
  browserbaseSessionId: string;
  recordingUrl: string;
  timestamp: string;
  summary: {
    pagesVisited: number;
    actionsPerformed: number;
    issuesFound: number;
    duration: number;
    successRate: string;
  };
  navigationPath: Array<any>;
  pagesVisited: string[];
  actionsTimeline: Array<any>;
  issues: Array<any>;
  performanceMetrics: any;
}

export async function startTest(url: string): Promise<TestResponse> {
  const response = await fetch(`${API_URL}/api/test/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start test');
  }

  return response.json();
}

export async function getTestStatus(testId: string): Promise<TestStatus> {
  const response = await fetch(`${API_URL}/api/test/${testId}/status`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get test status');
  }

  return response.json();
}

export async function getTestReport(testId: string): Promise<TestReport> {
  const response = await fetch(`${API_URL}/api/test/${testId}/report`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get test report');
  }

  return response.json();
}

export async function stopTest(testId: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/test/${testId}/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to stop test');
  }

  return response.json();
}

export async function listTests(): Promise<{ tests: Array<any>; count: number }> {
  const response = await fetch(`${API_URL}/api/test/list`);

  if (!response.ok) {
    throw new Error('Failed to list tests');
  }

  return response.json();
}
