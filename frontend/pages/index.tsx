import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { startTest } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate URL
      if (!url) {
        throw new Error('Please enter a URL');
      }

      // Add https:// if no protocol specified
      let testUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        testUrl = 'https://' + url;
      }

      // Validate URL format
      try {
        new URL(testUrl);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      console.log('Starting test for:', testUrl);

      // Start the test
      const response = await startTest(testUrl);

      console.log('Test started:', response);

      // Redirect to test view page
      router.push(`/test/${response.testId}`);
    } catch (err: any) {
      console.error('Error starting test:', err);
      setError(err.message || 'Failed to start test');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Browser Testing Platform</title>
        <meta name="description" content="AI-powered browser testing platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Browser Testing Platform
            </h1>
            <p className="text-lg text-gray-600">
              AI-powered automated website testing with Claude and Browserbase
            </p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com or https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Test...
                  </span>
                ) : (
                  'Start AI Test'
                )}
              </button>
            </form>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-blue-600 text-2xl mb-2">🤖</div>
              <h3 className="font-semibold text-gray-900 mb-1">AI-Powered</h3>
              <p className="text-sm text-gray-600">Claude analyzes and intelligently tests your website</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-blue-600 text-2xl mb-2">📺</div>
              <h3 className="font-semibold text-gray-900 mb-1">Live View</h3>
              <p className="text-sm text-gray-600">Watch tests run in real-time with live browser view</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-blue-600 text-2xl mb-2">📊</div>
              <h3 className="font-semibold text-gray-900 mb-1">Detailed Reports</h3>
              <p className="text-sm text-gray-600">Get comprehensive reports with recordings and insights</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
