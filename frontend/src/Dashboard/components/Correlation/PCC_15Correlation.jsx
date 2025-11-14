import CorrelationHeatmap from "../Correlation/CorrelationHeatmap.jsx";
import { fetchPCC_15 } from "../../utils/fetchAPI.js";

export default function PCC_12Correlation() {
  return (
    <CorrelationHeatmap fetchFn={ fetchPCC_15 } title="Pearson Correlation Heatmap (15 rows)" />
  )
}