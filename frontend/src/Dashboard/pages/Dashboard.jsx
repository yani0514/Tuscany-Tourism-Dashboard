import KPICards from "../components/KPICards";
import PCC_12Correlation from "../components/Correlation/PCC_12Correlation";
import PCC_15Correlation from "../components/Correlation/PCC_15Correlation";
import SCC_12Correlation from "../components/Correlation/SCC_12Correlation";
import SCC_15Correlation from "../components/Correlation/SCC_15Correlation";
import DominanceRatioChart from "../components/DominanceRatioChart";
import SeasonalityChart from "../components/SeasonalityChart";
import CentralTendencyChart from "../components/CentralTendencyChart";

export default function Dashboard() {
  return (
    <div className="body w-[100%] h-auto flex flex-col bg-gray-400 p-6 justify-start items-center">
        <div className="container max-w-[95%] h-auto justify-center items-center bg-gray-300 p-6 rounded-4xl ">
            <div className="heading flex justify-center items-center ">
                <h1 className="text-4xl font-normal">Tuscany Tourism Dashboard</h1>
            </div>

            <div className="KPIs mt-10">
              <KPICards />
            </div>

            <div className="seasonalityTrendsChart mt-10">
              <SeasonalityChart />
            </div>

            <div className="dominanceRationChart mt-10">
              <DominanceRatioChart />
            </div>

            <div className="centralTendencyChart mt-10">
              <CentralTendencyChart />
            </div>

            <div className="correlationHeatmapPCC12 mt-10">
              <PCC_12Correlation />
            </div>

            <div className="correlationHeatmapSCC12 mt-10">
              <SCC_12Correlation />
            </div>

            <div className="correlationHeatmapPCC15 mt-10">
              <PCC_15Correlation />
            </div>

            <div className="correlationHeatmapSCC15 mt-10">
              <SCC_15Correlation />
            </div>
        </div>
    </div>
  );
}