import dotenv from "dotenv"
dotenv.config();

export default async function fetchBIData() {
    const {REDASH_BASE, REDASH_QUERY_ID, REDASH_API_KEY} = process.env;

    //fetch data from the API
    const url = `${REDASH_BASE}/api/queries/${REDASH_QUERY_ID}/results.json?api_key=${REDASH_API_KEY}`;
    const response = await fetch(url);
    const json = await response.json();

    console.log(json.query_result.data)
    if(!json) {
        throw new Error("No data!")
    }

    return json;
}