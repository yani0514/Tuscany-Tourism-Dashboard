import React from "react";
import useAPI from "../../hooks/useAPI.js";
import { getCellColor } from "../../utils/getCellColor.js";

export default function CorrelationHeatmap({ fetchFn, title }) {
  const { data, loading, error } = useAPI(fetchFn, []);

  if (loading) {
    return (
      <div className="loading bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-500">Loading heatmap...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-red-600">Failed to load correlation data!</p>
      </div>
    );
  }

  const { columns, values } = data;

  return (
    <div className="body bg-white rounded-xl shadow p-4 flex flex-col">
      <div className="header flex items-baseline mb-3 justify-center">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      <div className="heatmapContainer h-full w-full">
        <div
          className="inline-grid border border-gray-500 w-full"
          style={{
            gridTemplateColumns: `180px repeat(${columns.length}, minmax(0px, 1fr))`,
          }}
        >
          {/* top-left empty corner */}
          <div className="sticky left-0 top-0 bg-white z-10 border border-gray-500" />

          {/* column headers */}
          {columns.map((col) => (
            <div
              key={col}
              className="flex justify-center items-center text-xs font-semibold border border-gray-500 p-2 text-center bg-gray-200 overflow-hidden"
            >
              {col}
            </div>
          ))}

          {/* rows */}
          {values.map((row, rowIndex) => (
            <React.Fragment key={columns[rowIndex]}>
              <div className="sticky left-0 bg-gray-200 border border-gray-500 text-xs font-semibold p-2">
                {columns[rowIndex]}
              </div>

              {row.map((cellValue, colIndex) => {
                const bg = getCellColor(cellValue);
                const strong = Math.abs(cellValue) > 0.7;

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="border border-gray-500 flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: bg,
                      color: strong ? "white" : "#111827",
                      fontWeight: rowIndex === colIndex ? "700" : "400",
                    }}
                    title={`${columns[rowIndex]} ↔ ${columns[colIndex]} = ${cellValue.toFixed(3)}`}
                  >
                    {cellValue.toFixed(2)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <p className="mt-2 text-lg text-gray-500">
          🔴 = positive, 🔵 = negative, ⚪ ≈ no correlation.
        </p>
      </div>
    </div>
  );
}
