import React from "react";
import useAPI from "../hooks/useAPI.js";
import { fetchVariableStats } from "../utils/fetchAPI.js";

export default function VariableStatsTable() {
  const { data, loading, error } = useAPI(fetchVariableStats, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Variable Statistics
        </h2>
        <p className="text-sm text-gray-500">Loading table...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">
          Variable Statistics
        </h2>
        <p className="text-sm text-red-600">
          Failed to load variable statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4 text-center">
        Descriptive Statistics per Variable
      </h2>

      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">Variable</th>
            <th className="border px-3 py-2 text-left">Type</th>
            <th className="border px-3 py-2 text-right">Min</th>
            <th className="border px-3 py-2 text-right">Max</th>
            <th className="border px-3 py-2 text-right">Std</th>
            <th className="border px-3 py-2 text-right">Avg</th>
            <th className="border px-3 py-2 text-right">Median</th>
          </tr>
        </thead>
        <tbody>
          {data.map((col) => (
            <tr key={col.name} className="odd:bg-white even:bg-gray-50">
              <td className="border px-3 py-2">{col.name}</td>
              <td className="border px-3 py-2">{col.type}</td>
              <td className="border px-3 py-2 text-right">
                {col.min}
              </td>
              <td className="border px-3 py-2 text-right">
                {col.max}
              </td>
              <td className="border px-3 py-2 text-right">
                {col.std}
              </td>
              <td className="border px-3 py-2 text-right">
                {col.avg}
              </td>
              <td className="border px-3 py-2 text-right">
                {col.median}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}