/**
 * Simplified Contract Security Scanner Workflow
 */

import {
  HTTPCapability,
  ConfidentialHTTPClient,
  handler,
  consensusIdenticalAggregation,
  ok,
  json,
  type Runtime,
  type HTTPPayload,
  Runner,
  decodeJson,
} from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  owner: z.string(),
})

type Config = z.infer<typeof configSchema>

interface ScanRequest {
  contractAddress: string
  chainId: number
}

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const requestData = decodeJson(payload.input) as ScanRequest
  
  runtime.log("Received scan request for contract: " + requestData.contractAddress)
  runtime.log("Chain ID: " + requestData.chainId)

  // Validate inputs
  if (!requestData.contractAddress) {
    throw new Error("Contract address is required")
  }
  if (!requestData.chainId) {
    throw new Error("Chain ID is required")
  }

  // Step 1: Fetch from Etherscan
  runtime.log("Fetching from Etherscan...")
  
  const confClient = new ConfidentialHTTPClient()
  
  // Build Etherscan URL
  const chainId = requestData.chainId
  let etherscanUrl = "https://api.etherscan.io/api"
  if (chainId === 11155111) {
    etherscanUrl = "https://api-sepolia.etherscan.io/api"
  } else if (chainId === 8453) {
    etherscanUrl = "https://api.basescan.org/api"
  }
  
  const contractAddress = requestData.contractAddress.toLowerCase()
  const url = etherscanUrl + "?module=contract&action=getsourcecode&address=" + contractAddress + "&apikey={{.etherscanApiKey}}"
  
  const etherscanResponse = confClient
    .sendRequest(
      runtime,
      (r, c) => {
        const client = new ConfidentialHTTPClient()
        return client
          .sendRequest(r, {
            request: {
              url: url,
              method: "GET",
            },
            vaultDonSecrets: [{ key: "etherscanApiKey", owner: c.owner }],
          })
          .result()
      },
      consensusIdenticalAggregation<any>()
    )(runtime.config)
    .result()

  if (!ok(etherscanResponse)) {
    throw new Error("Etherscan request failed: " + etherscanResponse.statusCode)
  }

  const etherscanData = json(etherscanResponse)
  runtime.log("Etherscan response received")
  
  // Extract source code info
  let sourceCode = ""
  let contractName = ""
  if (etherscanData.result && Array.isArray(etherscanData.result) && etherscanData.result.length > 0) {
    const result = etherscanData.result[0]
    sourceCode = result.SourceCode || ""
    contractName = result.ContractName || ""
  }
  
  if (!sourceCode) {
    return JSON.stringify({
      status: "error",
      message: "Contract not verified or no source code available"
    })
  }
  
  runtime.log("Contract name: " + contractName)
  runtime.log("Source code length: " + sourceCode.length)

  // Step 2: Analyze with XAI Grok
  runtime.log("Analyzing with XAI Grok...")
  
  const systemPrompt = "You are a smart contract security auditor. Analyze the code for vulnerabilities. Return JSON with riskLevel, summary, and vulnerabilities array."
  
  const userPrompt = "Analyze this Solidity contract:\n\nContract: " + contractName + "\nAddress: " + contractAddress + "\n\nSource Code:\n" + sourceCode.substring(0, 8000)

  const xaiResponse = confClient
    .sendRequest(
      runtime,
      (r, c) => {
        const client = new ConfidentialHTTPClient()
        return client
          .sendRequest(r, {
            request: {
              url: "https://api.x.ai/v1/chat/completions",
              method: "POST",
              multiHeaders: {
                "Content-Type": { values: ["application/json"] },
                Authorization: { values: ["Bearer {{.grokApiKey}}"] },
              },
              body: JSON.stringify({
                model: "grok-2-1212",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.1,
                max_tokens: 2000,
              }),
            },
            vaultDonSecrets: [{ key: "grokApiKey", owner: c.owner }],
          })
          .result()
      },
      consensusIdenticalAggregation<any>()
    )(runtime.config)
    .result()

  if (!ok(xaiResponse)) {
    throw new Error("XAI request failed: " + xaiResponse.statusCode)
  }

  const xaiData = json(xaiResponse)
  runtime.log("XAI analysis received")
  
  // Extract analysis content
  let analysisContent = ""
  if (xaiData.choices && xaiData.choices[0] && xaiData.choices[0].message) {
    analysisContent = xaiData.choices[0].message.content || ""
  }

  // Return results
  const result = {
    status: "success",
    contractAddress: contractAddress,
    chainId: chainId,
    contractName: contractName,
    analysis: analysisContent,
    timestamp: Date.now(),
  }

  return JSON.stringify(result)
}

const initWorkflow = (config: Config) => {
  const httpCapability = new HTTPCapability()
  return [
    handler(httpCapability.trigger({}), onHttpTrigger),
  ]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
