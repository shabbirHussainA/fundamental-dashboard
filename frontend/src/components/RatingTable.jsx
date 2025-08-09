import React from "react";

function RatingTable({ ratings = [] }) {
    console.log(ratings)
  // Helper to style cells based on sentiment
  const sentimentColor = (sentiment) => {
    switch (sentiment) {
      case "Buy":
      case "Strong Buy":
        return "bg-green-100 text-green-800 font-semibold";
      case "Sell":
      case "Strong Sell":
        return "bg-red-100 text-red-800 font-semibold";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 px-3 py-2 text-left">Pair</th>
            <th className="border border-gray-300 px-3 py-2">1m</th>
            <th className="border border-gray-300 px-3 py-2">5m</th>
            <th className="border border-gray-300 px-3 py-2">15m</th>
            <th className="border border-gray-300 px-3 py-2">30m</th>
            <th className="border border-gray-300 px-3 py-2">1h</th>
            <th className="border border-gray-300 px-3 py-2">4h</th>
            <th className="border border-gray-300 px-3 py-2">1d</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-medium">
                {row.pair}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.M1?.rating)}`}>
                {row.duration?.M1?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.M5?.rating)}`}>
                {row.duration?.M5?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.M15?.rating)}`}>
                {row.duration?.M15?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.M30?.rating)}`}>
                {row.duration?.M30?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.H1?.rating)}`}>
                {row.duration?.H1?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.H4?.rating)}`}>
                {row.duration?.H4?.rating || "-"}
              </td>
              <td className={`border border-gray-300 px-3 py-2 text-center ${sentimentColor(row.duration?.D?.rating)}`}>
                {row.duration?.D?.rating || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RatingTable;
