import React, { useState, useEffect } from 'react';

// The main application component
const App = () => {
  // State to hold the analysis data fetched from the API
  const [analysisData, setAnalysisData] = useState({});
  // State to manage the loading status
  const [loading, setLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState(null);
  // States for user input (query parameters)
  const [symbols, setSymbols] = useState('oanda:EURUSD,nasdaq:TSLA');
  const [screener, setScreener] = useState('forex');
  const [timeframe, setTimeframe] = useState('1d');

  // Function to fetch data from the FastAPI backend
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Construct the API URL with query parameters
      const apiUrl = `http://127.0.0.1:8000/get_analysis?symbols=${symbols}&screener=${screener}&timeframe=${timeframe}`;
      const response = await fetch(apiUrl);
      
      // Check for a non-200 status code
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'An unexpected error occurred.');
      }

      const data = await response.json();
      setAnalysisData(data.analysis_data);
    } catch (e) {
      setError(e.message);
      setAnalysisData({});
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch when the component mounts
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans antialiased text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-gray-900">TradingView Technical Analysis</h1>
        
        {/* Input form */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label htmlFor="symbols" className="block text-sm font-medium text-gray-700 mb-1">Symbols (comma-separated)</label>
              <input
                id="symbols"
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                placeholder="e.g., oanda:EURUSD,nasdaq:TSLA"
              />
            </div>
            <div>
              <label htmlFor="screener" className="block text-sm font-medium text-gray-700 mb-1">Screener</label>
              <input
                id="screener"
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={screener}
                onChange={(e) => setScreener(e.target.value)}
                placeholder="e.g., forex, america, crypto"
              />
            </div>
            <div>
              <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <input
                id="timeframe"
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="e.g., 1h, 1d, 1w"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={fetchData}
              className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Fetch Analysis'}
            </button>
          </div>
        </div>

        {/* Display loading, error, or data */}
        {loading && <p className="text-center text-lg text-indigo-600">Loading analysis data...</p>}
        {error && <p className="text-center text-lg text-red-600">Error: {error}</p>}
        
        {Object.keys(analysisData).length > 0 && !loading && (
          <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-xl">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-xl">Neutral</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(analysisData).map(([symbol, analysis], index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{symbol}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {analysis.error ? (
                        <span className="text-red-500">{analysis.error}</span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${analysis.RECOMMENDATION === 'STRONG_BUY' || analysis.RECOMMENDATION === 'BUY' ? 'bg-green-100 text-green-800' : ''}
                          ${analysis.RECOMMENDATION === 'STRONG_SELL' || analysis.RECOMMENDATION === 'SELL' ? 'bg-red-100 text-red-800' : ''}
                          ${analysis.RECOMMENDATION === 'NEUTRAL' ? 'bg-gray-100 text-gray-800' : ''}
                        `}>
                          {analysis.RECOMMENDATION}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{analysis.BUY}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{analysis.SELL}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{analysis.NEUTRAL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
