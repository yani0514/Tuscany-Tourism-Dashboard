import useAPI from "../hooks/useAPI";
import { fetchKPIs } from "../utils/fetchAPI";

export default function KPICards() {
  const { data, loading, error } = useAPI(fetchKPIs, []);

  if (loading) return <div className="p-4">Loading KPIs…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>;

  const kpi = data;

  const Card = ({ title, value, sub }) => (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-4 text-center font-semibold">
      <Card title="Total Tourist Stays" value={kpi.totalTouristStays.toLocaleString()} sub={"From 2024-01 to 2025-05"}/>
      <Card title="Average Monthly Stays" value={kpi.averageMonthlyStays.toLocaleString()} />
      <Card title="Max Monthly Stays" value={kpi.maxMonthlyStays.toLocaleString()} sub={kpi.maxMonthlyLabel} />
      <Card title="Min Monthly Stays" value={kpi.minMonthlyStays.toLocaleString()} sub={kpi.minMonthlyLabel} />
    </div>
  );
}