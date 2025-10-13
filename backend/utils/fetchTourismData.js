import dotenv from "dotenv"
dotenv.config();

export default async function fetchTourismData() {
    try {
        //Load required environment variables
        const {REDASH_BASE, REDASH_QUERY_ID, REDASH_API_KEY} = process.env;

        //Check if all required variables exist
        if (!REDASH_BASE || !REDASH_QUERY_ID || !REDASH_API_KEY) {
            throw new Error("Missing Redash_* environment variables!");
        }

        //Construct the Redash API URL
        const url = `${REDASH_BASE}/api/queries/${REDASH_QUERY_ID}/results.json?api_key=${REDASH_API_KEY}`;

        //Make the HTTP request
        const response = await fetch(url);

        //Check if the response status is OK
        if(!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`Redash HTTP ${response.status}: ${text}`);
        }

        //Parse the response to JSON
        const json = await response.json();

        //Verify that the expected data exists in the response
        if(!json.query_result?.data?.rows) {
            throw new Error("Invalid Redash response: missing query_results.data.rows");
        }

        //Return the data
        console.log("✅ Data fetched succesfully!");
        console.log(json.query_result.data);
        return json;

    }catch (err){ 
        //Log any error and throw it for the caller to handle
        console.error("❌ Error fetching BI data: ", err.message);
        throw err;
    }
}