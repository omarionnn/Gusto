import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LiveBrowserView from '@/components/LiveBrowserView';
import { getTestStatus, stopTest } from '@/lib/api';
import type { TestStatus } from '@/lib/api';

export default function TestView() {
  const router = useRouter();
  const { testId } = router.query;

  const [testData, setTestData] = useState<TestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopping, setStopping] = useState(false);

  // Poll for test status
  useEffect(() => {
    if (!testId || typeof testId !== 'string') return;

    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const status = await getTestStatus(testId);
        setTestData(status);
        setLoading(false);

        // Stop polling only if:
        // 1. Test is completed AND recording URL is available, OR
        // 2. Test is failed or stopped
        const shouldStopPolling =
          (status.status === 'completed' && status.recordingUrl) ||
          status.status === 'failed' ||
          status.status === 'stopped';

        if (shouldStopPolling) {
          clearInterval(intervalId);
        }
      } catch (err: any) {
        console.error('Error fetching test status:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds
    intervalId = setInterval(fetchStatus, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [testId]);

  const handleStop = async () => {
    if (!testId || typeof testId !== 'string') return;

    setStopping(true);
    try {
      await stopTest(testId);
      // Refresh status
      const status = await getTestStatus(testId);
      setTestData(status);
    } catch (err: any) {
      console.error('Error stopping test:', err);
      setError(err.message);
    } finally {
      setStopping(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      starting: 'bg-blue-100 text-blue-800',
      running: 'bg-green-100 text-green-800 animate-pulse',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      stopped: 'bg-gray-100 text-gray-800',
    };

    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Test</h2>
          <p className="text-gray-600 mb-4">{error || 'Test not found'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const isTestComplete = testData.status === 'completed';
  const isTestRunning = testData.status === 'running' || testData.status === 'starting';

  return (
    <>
      <Head>
        <title>Test {testId?.toString().substring(0, 8)} | Browser Testing Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
                  ← Back to Home
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Test in Progress</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(testData.status)}`}>
                  {testData.status.toUpperCase()}
                </span>
                {isTestComplete && (
                  <Link
                    href={`/report/${testId}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
                  >
                    View Report
                  </Link>
                )}
                {isTestRunning && (
                  <button
                    onClick={handleStop}
                    disabled={stopping}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg"
                  >
                    {stopping ? 'Stopping...' : 'Stop Test'}
                  </button>
                )}
              </div>
            </div>

            {/* Test Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Test ID:</span>
                <p className="font-mono text-gray-900">{testId?.toString().substring(0, 16)}...</p>
              </div>
              <div>
                <span className="text-gray-600">URL:</span>
                <p className="text-gray-900 truncate">{testData.url || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-600">Started:</span>
                <p className="text-gray-900">
                  {testData.startedAt ? new Date(testData.startedAt).toLocaleTimeString() : 'Not started'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Session ID:</span>
                <p className="font-mono text-gray-900">{testData.browserbaseSessionId?.substring(0, 12)}...</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Live Browser View */}
            <div className="lg:col-span-2">
              {testData.browserbaseSessionId && (
                <LiveBrowserView
                  liveViewUrl={`https://www.browserbase.com/sessions/${testData.browserbaseSessionId}`}
                  sessionId={testData.browserbaseSessionId}
                />
              )}

              {/* Recording Video Link - Show after test completes */}
              {isTestComplete && testData.recordingUrl && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-1">Session Recording Ready!</h3>
                      <p className="text-sm text-green-700">Click the button below to watch the session recording</p>
                    </div>
                    <a
                      href={testData.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Watch Recording
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Progress</h2>

                {testData.progress && testData.progress.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {testData.progress.map((item: any, index: number) => (
                      <div key={index} className="border-l-2 border-blue-500 pl-3 py-1">
                        <p className="text-sm font-medium text-gray-900">{item.status}</p>
                        <p className="text-xs text-gray-600">{item.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    {isTestRunning ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-sm text-gray-600">AI agent is working...</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">No progress updates yet</p>
                    )}
                  </div>
                )}

                {testData.error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    <strong>Error:</strong> {testData.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
