import axios from "axios";
import "dotenv/config";

async function testOpenSky() {
    const username = process.env.OPENSKY_USERNAME;
    const password = process.env.OPENSKY_PASSWORD;

    console.log(`Testing OpenSky API with username: ${username}`);

    try {
        const config: any = {};
        if (username && password) {
            config.auth = {
                username: username,
                password: password
            };
        }

        // Try a simple request for all states
        console.log("Fetching current flight states...");
        const response = await axios.get("https://opensky-network.org/api/states/all", config);

        if (response.status === 200) {
            console.log("✅ SUCCESS: Connection established.");
            console.log(`Found ${response.data.states?.length || 0} active flights.`);

            // Check for rate limit headers if available
            const retryAfter = response.headers['x-rate-limit-retry-after-seconds'];
            if (retryAfter) {
                console.log(`⚠️ WARNING: Rate limit active. Retry after ${retryAfter} seconds.`);
            } else {
                console.log("🚀 Rate limit: You are within safe bounds.");
            }
        }
    } catch (error: any) {
        console.error("❌ FAILED: Could not connect to OpenSky.");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Message: ${JSON.stringify(error.response.data)}`);

            if (error.response.status === 401) {
                console.error("👉 Solution: Unauthorized. Please check if your OPENSKY_USERNAME and OPENSKY_PASSWORD are correct.");
            } else if (error.response.status === 429) {
                console.error("👉 Solution: Too Many Requests. You have hit the API rate limit. Wait a few minutes.");
            }
        } else {
            console.error(`Error: ${error.message}`);
        }
    }
}

testOpenSky();
