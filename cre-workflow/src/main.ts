/**
 * Sentinel Security Scanner - Chainlink CRE Workflow
 * 
 * This workflow implements an autonomous AI security oracle using the
 * Chainlink CRE SDK with Confidential HTTP and encrypted responses.
 * 
 * @track Chainlink Convergence Hackathon 2026
 * @category Risk & Compliance
 */

import {
  CronCapability,
  ConfidentialHTTPClient,
  handler,
  consensusIdenticalAggregation,
  ok,
  bytesToHex,
  type ConfidentialHTTPSendRequester,
  type Runtime,
  Runner,
} from "@chainlink/cre-sdk"

// ============================================================================
// CONFIGURATION
// ============================================================================

interface Config {
  schedule: string
  url: string
  owner: string
  chainId: number
  environment: string
  contracts?: {
    registry?: string
    guardian?: string
    auditLogger?: string
    pausableVault?: string
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface SecurityAnalysis {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE"
  category: string
  vector: string
  lines: number[]
  confidence: number
  recommendation: string
}

interface ScanResult {
  contractAddress: string
  chainId: number
  timestamp: number
  analysis: SecurityAnalysis
  action: "PAUSE" | "ALERT" | "WARN" | "LOG"
  vulnerabilityHash: string
}

interface EncryptedResponse {
  bodyBase64: string
}

// ============================================================================
// BASE64 HELPERS (same as demo)
// ============================================================================

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

function bytesToBase64(bytes: Uint8Array): string {
  let out = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += BASE64_ALPHABET[a >> 2]
    out += BASE64_ALPHABET[((a & 3) << 4) | (b ?? 0) >> 4]
    out += b === undefined ? "=" : BASE64_ALPHABET[((b & 15) << 2) | (c ?? 0) >> 6]
    out += c === undefined ? "=" : BASE64_ALPHABET[c & 63]
  }
  return out
}

function base64ToBytes(base64: string): Uint8Array {
  const len = base64.replace(/=+$/, "").length
  const n = Math.floor((len * 3) / 4)
  const out = new Uint8Array(n)
  let i = 0
  let j = 0
  while (i < base64.length) {
    const a = BASE64_ALPHABET.indexOf(base64[i++] ?? "")
    const b = BASE64_ALPHABET.indexOf(base64[i++] ?? "")
    const c = BASE64_ALPHABET.indexOf(base64[i++] ?? "")
    const d = BASE64_ALPHABET.indexOf(base64[i++] ?? "")
    if (a < 0 || b < 0) break
    out[j++] = (a << 2) | (b >> 4)
    if (c >= 0 && j < n) out[j++] = ((b & 15) << 4) | (c >> 2)
    if (d >= 0 && j < n) out[j++] = ((c & 3) << 6) | d
  }
  return out
}

// ============================================================================
// 1. FETCH CONTRACT SOURCE (Confidential HTTP)
// ============================================================================

const fetchContractSource = (
  sendRequester: ConfidentialHTTPSendRequester,
  contractAddress: string,
  chainId: number
): EncryptedResponse => {
  const response = sendRequester
    .sendRequest({
      request: {
        url: chainId === 11155111 
          ? `https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}`
          : `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${contractAddress}`,
        method: "GET",
        multiHeaders: {},
      },
      vaultDonSecrets: [
        { key: "etherscanApiKey", owner: "" },
      ],
      encryptOutput: false,
    })
    .result()

  if (!ok(response)) {
    throw new Error(`Etherscan API failed: ${response.statusCode}`)
  }

  const body = response.body ?? new Uint8Array(0)
  return { bodyBase64: bytesToBase64(body) }
}

// ============================================================================
// 2. AI SECURITY ANALYSIS (Confidential HTTP)
// ============================================================================

const analyzeWithGrok = (
  sendRequester: ConfidentialHTTPSendRequester,
  sourceCode: string
): SecurityAnalysis => {
  const prompt = `You are an expert smart contract security auditor. Analyze the following Solidity code for security vulnerabilities.

Focus on these categories:
1. Reentrancy attacks
2. Integer overflow/underflow
3. Unchecked external calls
4. Access control issues
5. Front-running vulnerabilities

Output STRICT JSON:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW|SAFE",
  "category": "Reentrancy|Overflow|AccessControl|Other",
  "vector": "Description",
  "lines": [1, 2, 3],
  "confidence": 0.95,
  "recommendation": "Fix suggestion"
}

Source Code:
${sourceCode.slice(0, 8000)}` // Limit prompt size

  const response = sendRequester
    .sendRequest({
      request: {
        url: "https://api.x.ai/v1/chat/completions",
        method: "POST",
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          "Authorization": { values: ["Bearer {{.grokApiKey}}"] },
        },
        body: JSON.stringify({
          model: "grok-4-1-fast-reasoning",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      },
      vaultDonSecrets: [
        { key: "grokApiKey", owner: "" },
      ],
      encryptOutput: false,
    })
    .result()

  if (!ok(response)) {
    throw new Error(`xAI API failed: ${response.statusCode}`)
  }

  const bodyText = new TextDecoder().decode(response.body)
  const parsed = JSON.parse(bodyText)
  const content = parsed.choices?.[0]?.message?.content || "{}"
  
  try {
    return JSON.parse(content) as SecurityAnalysis
  } catch {
    // Fallback if parsing fails
    return {
      severity: "SAFE",
      category: "ParseError",
      vector: "Could not parse AI response",
      lines: [],
      confidence: 0,
      recommendation: "Retry scan",
    }
  }
}

// ============================================================================
// 3. RISK EVALUATION
// ============================================================================

const evaluateRisk = (analysis: SecurityAnalysis): { action: string; vulnHash: string } => {
  const { severity, confidence, vector } = analysis
  
  // Simple hash generation
  let hash = 0
  const encoder = new TextEncoder()
  const bytes = encoder.encode(vector)
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i]
    hash = hash & hash
  }
  const vulnHash = "0x" + Math.abs(hash).toString(16).padStart(64, "0")
  
  let action: string
  if (severity === "CRITICAL" && confidence > 0.85) {
    action = "PAUSE"
  } else if (severity === "HIGH" || (severity === "CRITICAL" && confidence <= 0.85)) {
    action = "ALERT"
  } else if (severity === "MEDIUM") {
    action = "WARN"
  } else {
    action = "LOG"
  }
  
  return { action, vulnHash }
}

// ============================================================================
// MAIN WORKFLOW HANDLER
// ============================================================================

const onCronTrigger = (runtime: Runtime<Config>): string => {
  const confHTTPClient = new ConfidentialHTTPClient()
  
  // Get contract to scan
  const contractAddress = runtime.config.contracts?.pausableVault || 
    "0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C"
  const chainId = runtime.config.chainId || 11155111
  
  runtime.log(`Scanning contract: ${contractAddress}`)
  
  try {
    // Step 1: Fetch source
    runtime.log("[1/3] Fetching contract source...")
    const sourceResult = confHTTPClient
      .sendRequest(
        runtime,
        (sendRequester) => fetchContractSource(sendRequester, contractAddress, chainId),
        consensusIdenticalAggregation<EncryptedResponse>()
      )(runtime.config)
      .result()
    
    const sourceText = new TextDecoder().decode(base64ToBytes(sourceResult.bodyBase64))
    const sourceJson = JSON.parse(sourceText)
    const sourceCode = sourceJson.result?.[0]?.SourceCode || ""
    
    if (!sourceCode) {
      runtime.log(`⚠️ No source code for ${contractAddress}`)
      return JSON.stringify({ error: "No source code", contract: contractAddress })
    }
    
    runtime.log(`✓ Source fetched (${sourceCode.length} chars)`)
    
    // Step 2: AI Analysis
    runtime.log("[2/3] Analyzing with xAI Grok...")
    const analysis = confHTTPClient
      .sendRequest(
        runtime,
        (sendRequester) => analyzeWithGrok(sendRequester, sourceCode),
        consensusIdenticalAggregation<SecurityAnalysis>()
      )(runtime.config)
      .result()
    
    runtime.log(`✓ Analysis: ${analysis.severity} (${Math.round(analysis.confidence * 100)}% confidence)`)
    
    // Step 3: Risk Evaluation
    runtime.log("[3/3] Evaluating risk...")
    const { action, vulnHash } = evaluateRisk(analysis)
    
    runtime.log(`✓ Action: ${action}`)
    
    if (action === "PAUSE") {
      runtime.log(`🚨 CRITICAL: Emergency pause recommended!`)
    }
    
    // Build result
    const result: ScanResult = {
      contractAddress,
      chainId,
      timestamp: Date.now(),
      analysis,
      action: action as any,
      vulnerabilityHash: vulnHash,
    }
    
    const output = JSON.stringify({
      scannedAt: new Date().toISOString(),
      environment: runtime.config.environment,
      result,
    })
    
    runtime.log("--- Scan Complete ---")
    return output
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    runtime.log(`❌ Error: ${errorMsg}`)
    return JSON.stringify({ error: errorMsg, contract: contractAddress })
  }
}

// ============================================================================
// WORKFLOW INITIALIZATION
// ============================================================================

const initWorkflow = (config: Config) => {
  return [
    handler(
      new CronCapability().trigger({
        schedule: config.schedule,
      }),
      onCronTrigger
    ),
  ]
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function main() {
  // Simple config without zod for now (runtime validation handled by CRE)
  const runner = await Runner.newRunner<Config>({
    configSchema: undefined as any, // Will use runtime validation
  })
  await runner.run(initWorkflow)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Workflow failed:", error)
    process.exit(1)
  })
}
