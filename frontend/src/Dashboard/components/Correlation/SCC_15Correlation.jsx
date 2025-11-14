import CorrelationHeatmap from "./CorrelationHeatmap";
import { fetchSCC_15 } from "../../utils/fetchAPI";

export default function SCC_15Correlation() {
    return (
        <CorrelationHeatmap fetchFn={ fetchSCC_15 } title="Spearman Correlation Heatmap (15 rows)" />
    )
};