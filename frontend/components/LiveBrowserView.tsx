import { useState, useEffect } from 'react';

interface LiveBrowserViewProps {
  liveViewUrl: string;
  sessionId: string;
}

export default function LiveBrowserView({ liveViewUrl, sessionId }: LiveBrowserViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [liveViewUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Browser Header */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-3 flex items-center space-x-2">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600 ml-4">
          <span className="text-green-600">●</span> Live Browser Session: {sessionId.substring(0, 8)}...
        </div>
      </div>

      {/* Browser Content */}
      <div className="relative bg-gray-900" style={{ height: '600px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-white">Loading live browser view...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center text-white">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg mb-2">Failed to load live view</p>
              <p className="text-sm text-gray-400">The browser session may not be ready yet</p>
            </div>
          </div>
        )}

        <iframe
          src={liveViewUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>

      {/* Browser Footer */}
      <div className="bg-gray-100 border-t border-gray-300 px-4 py-2 text-xs text-gray-600 flex items-center justify-between">
        <span>Powered by Browserbase</span>
        <a
          href={liveViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          Open in new tab →
        </a>
      </div>
    </div>
  );
}
