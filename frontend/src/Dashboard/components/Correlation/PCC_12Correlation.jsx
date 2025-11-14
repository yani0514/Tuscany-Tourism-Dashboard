import CorrelationHeatmap from "../Correlation/CorrelationHeatmap.jsx";
import { fetchPCC_12 } from "../../utils/fetchAPI.js";

export default function PCC_12Correlation() {
  return (
    <CorrelationHeatmap fetchFn={ fetchPCC_12 } title="Pearson Correlation Heatmap (12 rows)" />
  )
};