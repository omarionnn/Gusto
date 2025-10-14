import { useState } from 'react';
import type { TestReport } from '@/lib/api';

interface ReportViewProps {
  report: TestReport;
  testId: string;
}

export default function ReportView({ report, testId }: ReportViewProps) {
  const [expandedAction, setExpandedAction] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'issues' | 'pages'>('summary');

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
  };

  const exportReport = () => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-report-${testId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600 mb-1">{report.summary.pagesVisited}</div>
          <div className="text-sm text-gray-600">Pages Visited</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600 mb-1">{report.summary.actionsPerformed}</div>
          <div className="text-sm text-gray-600">Actions Performed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-red-600 mb-1">{report.summary.issuesFound}</div>
          <div className="text-sm text-gray-600">Issues Found</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600 mb-1">{formatDuration(report.summary.duration)}</div>
          <div className="text-sm text-gray-600">Test Duration</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600 mb-1">{report.summary.successRate}</div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      {/* Recording */}
      {report.recordingUrl && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Recording</h2>
          <a
            href={report.recordingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Watch Session Recording
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'actions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Actions Timeline ({report.actionsTimeline.length})
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'issues'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Issues ({report.issues.length})
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'pages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Pages ({report.pagesVisited.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Navigation Path</h3>
                <div className="space-y-2">
                  {report.navigationPath.map((nav: any, index: number) => (
                    <div key={index} className="flex items-start space-x-3 text-sm">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                        {nav.step}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{nav.title}</div>
                        <div className="text-gray-600 text-xs truncate">{nav.url}</div>
                        <div className="text-gray-400 text-xs">{new Date(nav.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Performance Metrics</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Duration:</span>
                    <span className="font-medium">{formatDuration(report.performanceMetrics.totalDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Action Time:</span>
                    <span className="font-medium">{Math.round(report.performanceMetrics.averageActionTime)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium">{report.performanceMetrics.successRate.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-2">
              {report.actionsTimeline.map((action: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setExpandedAction(expandedAction === index ? null : index)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        action.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {action.success ? '✓' : '✗'}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Step {action.step}: {action.action}</div>
                        <div className="text-sm text-gray-600">{action.message}</div>
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedAction === index ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedAction === index && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm space-y-2">
                      {action.target && (
                        <div>
                          <span className="text-gray-600">Target:</span>
                          <code className="ml-2 bg-white px-2 py-1 rounded text-xs">{action.target}</code>
                        </div>
                      )}
                      {action.value && (
                        <div>
                          <span className="text-gray-600">Value:</span>
                          <code className="ml-2 bg-white px-2 py-1 rounded text-xs">{action.value}</code>
                        </div>
                      )}
                      {action.reasoning && (
                        <div>
                          <span className="text-gray-600">Reasoning:</span>
                          <p className="ml-2 text-gray-700">{action.reasoning}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Page:</span>
                        <p className="ml-2 text-gray-700 truncate">{action.page.url}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Timestamp:</span>
                        <span className="ml-2 text-gray-700">{new Date(action.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="space-y-3">
              {report.issues.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <svg className="w-16 h-16 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">No issues found!</p>
                  <p className="text-sm">All tests passed successfully.</p>
                </div>
              ) : (
                report.issues.map((issue: any, index: number) => (
                  <div key={index} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-red-800">{issue.type}: {issue.message}</p>
                        {issue.page && <p className="text-xs text-red-700 mt-1 truncate">Page: {issue.page}</p>}
                        {issue.timestamp && (
                          <p className="text-xs text-red-600 mt-1">{new Date(issue.timestamp).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div className="space-y-2">
              {report.pagesVisited.map((page: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{page}</p>
                  </div>
                  <a
                    href={page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={exportReport}
          className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Report as JSON
        </button>
      </div>
    </div>
  );
}
