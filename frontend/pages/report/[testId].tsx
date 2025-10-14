import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ReportView from '@/components/ReportView';
import { getTestReport } from '@/lib/api';
import type { TestReport } from '@/lib/api';

export default function ReportPage() {
  const router = useRouter();
  const { testId } = router.query;

  const [report, setReport] = useState<TestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!testId || typeof testId !== 'string') return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        const reportData = await getTestReport(testId);
        setReport(reportData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching report:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReport();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Report</h2>
          <p className="text-gray-600 mb-4">{error || 'Report not found or test not completed'}</p>
          <div className="space-x-4">
            <Link href={`/test/${testId}`} className="text-blue-600 hover:text-blue-700 hover:underline">
              ← Back to Test
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Test Report | Browser Testing Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
                    ← Home
                  </Link>
                  <Link href={`/test/${testId}`} className="text-blue-600 hover:text-blue-700 text-sm">
                    ← Test View
                  </Link>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Test Report</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Generated on {new Date(report.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Test ID</div>
                <div className="font-mono text-sm text-gray-900">{testId?.toString().substring(0, 16)}...</div>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <ReportView report={report} testId={testId as string} />
        </div>
      </div>
    </>
  );
}
