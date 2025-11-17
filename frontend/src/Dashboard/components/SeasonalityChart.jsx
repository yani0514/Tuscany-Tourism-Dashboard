// src/components/SeasonalityTrendsChart.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import useAPI from "../hooks/useAPI.js";
import { fetchSeasonalityMonthly } from "../utils/fetchAPI.js";

const monthLabels = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

export default function SeasonalityChart() {
  const { data, loading, error } = useAPI(fetchSeasonalityMonthly, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Monthly Seasonality Trends of Tourist Arrivals
        </h2>
        <p className="text-sm text-gray-500">Loading chart...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Monthly Seasonality of Tourist Arrivals
        </h2>
        <p className="text-sm text-red-600">
          Failed to load seasonality trends data.
        </p>
      </div>
    );
  }

  // data example:
  // { year: "2024", month_num: "01", italian_avg, foreigners_avg, total_avg }
  // Build a readable label like "Jan 2024"
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: `${monthLabels[d.month_num] || d.month_num} ${d.year}`,
  }));

  return (
    <div className="bg-white rounded-xl shadow p-4 h-[600px] flex flex-col border">
      <h2 className="text-xl font-semibold mb-2 text-center">
        Monthly Seasonality Trends of Tourist Arrivals
      </h2>
      <p className="text-sm text-gray-500 mb-4 text-center">
        Average arrivals by month across years, split by Italians, foreigners,
        and total.
      </p>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 10 }}
              interval={0}
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => {
                if (name === "italian_avg") return [value.toFixed(0), "Italians"];
                if (name === "foreigners_avg") return [value.toFixed(0), "Foreigners"];
                if (name === "total_avg") return [value.toFixed(0), "Total"];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const item = payload && payload[0]?.payload;
                if (!item) return label;
                return `${label} (year: ${item.year}, month: ${item.month_num})`;
              }}
            />
            <Legend />

            <Line
              type="monotone"
              dataKey="italian_avg"
              name="Italians"
              stroke="rgb(248, 113, 113)" // red-400
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="foreigners_avg"
              name="Foreigners"
              stroke="rgb(96, 165, 250)" // blue-400
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="total_avg"
              name="Total"
              stroke="rgb(34, 197, 94)" // green-500
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}