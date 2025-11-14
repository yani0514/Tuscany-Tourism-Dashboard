// src/components/AreaMeanArrivalsChart.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import useAPI from "../hooks/useAPI.js";
import { fetchCentralTendency } from "../utils/fetchAPI.js";

export default function CentralTendencyChart() {
  const { data, loading, error } = useAPI(fetchCentralTendency, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Average Tourist Arrivals by Area
        </h2>
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Average Tourist Arrivals by Area
        </h2>
        <p className="text-sm text-red-600">
          Failed to load area statistics data.
        </p>
      </div>
    );
  }

  // Sort areas by mean descending so top hubs appear at the top
  const sortedData = [...data].sort((a, b) => b.mean - a.mean);

  return (
    <div className="bg-white rounded-xl shadow p-4 h-[800px] flex flex-col">
      <h2 className="text-xl font-semibold mb-2 text-center">
        Average Tourist Arrivals by Area
      </h2>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Areas ranked by mean arrivals (higher bars indicate stronger tourist
        hubs).
      </p>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="horizontal"
            margin={{ top: 10, right: 30, left: 150, bottom: 160 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <YAxis
              type="number"
              tickFormatter={(v) => v.toLocaleString("en-US")}
            />
            <XAxis
              type="category"
              dataKey="area"
              width={180}
              tick={{ fontSize: 11, angle: -45, textAnchor: "end" }}
              interval={0}
            />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "mean") {
                  return [value.toLocaleString("en-US"), "Mean arrivals"];
                }
                if (name === "median") {
                  return [value.toLocaleString("en-US"), "Median"];
                }
                if (name === "std") {
                  return [value.toLocaleString("en-US"), "Std. deviation"];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const item = payload && payload[0]?.payload;
                if (!item) return label;
                return `${label}
                Mean: ${item.mean.toLocaleString("en-US")}
                Median: ${item.median.toLocaleString("en-US")}
                Std: ${item.std.toLocaleString("en-US")}`;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                top: -10,
                right: 30,
              }}
            />

            <Bar
              dataKey="mean"
              name="Mean arrivals"
              fill="rgb(96, 165, 250)" // blue-400
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}