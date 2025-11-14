import CorrelationHeatmap from "./CorrelationHeatmap";
import { fetchSCC_12 } from "../../utils/fetchAPI";

export default function SCC_12Correlation() {
    return (
        <CorrelationHeatmap fetchFn={ fetchSCC_12 } title="Spearman Correlation Heatmap (12 rows)" />
    )
};