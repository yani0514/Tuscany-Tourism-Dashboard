// src/components/DominanceRatioChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import useAPI from "../hooks/useAPI.js";
import { fetchDominanceRatio } from "../utils/fetchAPI.js";

export default function DominanceRatioChart() {
  const { data, loading, error } = useAPI(fetchDominanceRatio, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Italian vs Foreign Tourists by Area
        </h2>
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Italian vs Foreign Tourists by Area
        </h2>
        <p className="text-sm text-red-600">
          Failed to load dominance ratio data.
        </p>
      </div>
    );
  }

  // data is expected to be the array you showed
  // sort by foreignSharePercent descending (optional, but nicer)
  const sortedData = [...data].sort(
    (a, b) => b.foreignSharePercent - a.foreignSharePercent
  );

  return (
    <div className="bg-white rounded-xl shadow p-4 h-[950px] flex flex-col justify-center items-center">
      <h2 className="text-xl font-semibold mb-2 text-center">
        Italian vs Foreign Tourist Share by Area (%)
      </h2>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Each bar = 100% of arrivals in that area, split between Italians and
        foreigners.
      </p>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="area"
            width={160}
            tick={{ fontSize: 12 }}
            interval={0} 
          />
          <Tooltip
            formatter={(value, name, props) => {
              if (name === "italianSharePercent") {
                return [`${value.toFixed(2)}%`, "Italians"];
              }
              if (name === "foreignSharePercent") {
                return [`${value.toFixed(2)}%`, "Foreigners"];
              }
              if (name === "ratio") {
                return [value.toFixed(2), "Italians / Foreigners"];
              }
              return [value, name];
            }}
            labelFormatter={(label, payload) => {
              const item = payload && payload[0]?.payload;
              if (!item) return label;
              return `${label} (ratio: ${item.ratio.toFixed(2)})`;
            }}
          />
          <Legend />

          {/* Italian share */}
          <Bar
            dataKey="italianSharePercent"
            stackId="shares"
            name="Italians"
            fill="rgb(248, 113, 113)" // red-400
          />

          {/* Foreign share */}
          <Bar
            dataKey="foreignSharePercent"
            stackId="shares"
            name="Foreigners"
            fill="rgb(96, 165, 250)" // blue-400
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}