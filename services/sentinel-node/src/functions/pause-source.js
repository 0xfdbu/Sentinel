/**
 * Chainlink Functions JavaScript Source
 * 
 * This script executes confidentially on the Chainlink DON to:
 * 1. Retrieve encrypted API keys
 * 2. Call the Sentinel backend to execute pause
 * 3. Return confirmation
 * 
 * Arguments:
 * args[0] = target contract address (hex)
 * args[1] = vulnerability hash (hex)
 * args[2] = sentinel node address (hex)
 */

// Main handler function
async function executePause(target, vulnHash, sentinel) {
  // Get encrypted secrets
  const apiKey = secrets.SENTINEL_API_KEY;
  const backendUrl = secrets.BACKEND_URL || "https://sentinel-api.example.com";
  
  if (!apiKey) {
    throw new Error("Missing SENTINEL_API_KEY in secrets");
  }

  // Call Sentinel backend to execute pause
  const response = await Functions.makeHttpRequest({
    url: `${backendUrl}/api/v1/emergency-pause`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Sentinel-Node": sentinel
    },
    data: {
      target: target,
      vulnHash: vulnHash,
      timestamp: Date.now(),
      source: "chainlink_functions"
    },
    timeout: 10000 // 10 second timeout
  });

  if (response.error) {
    console.error("Pause request failed:", response.error);
    throw new Error(`Backend error: ${response.error}`);
  }

  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Unknown error'}`);
  }

  // Verify response contains expected fields
  if (!response.data || !response.data.success) {
    throw new Error("Invalid response from backend");
  }

  console.log(`Pause executed successfully for ${target}`);
  
  // Return true on success
  return true;
}

// Execute and return result
return executePause(args[0], args[1], args[2]);
