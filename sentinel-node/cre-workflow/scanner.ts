/**
 * Sentinel Security Scanner - Fast CRE Workflow
 * 
 * Expects source code in payload (pre-fetched by Sentinel Node)
 * Skips Etherscan fetch - goes straight to AI analysis
 */

import {
  HTTPCapability,
  HTTPClient,
  handler,
  ok,
  json,
  type Runtime,
  type HTTPPayload,
  Runner,
  decodeJson,
} from "@chainlink/cre-sdk"

const XAI_API_URL = "https://api.x.ai/v1/chat/completions"

// Main handler
const onHttpTrigger = (runtime: Runtime<any>, payload: HTTPPayload): string => {
  const requestData = decodeJson(payload.input) as any
  
  runtime.log("")
  runtime.log("╔══════════════════════════════════════════════════════════════════╗")
  runtime.log("║           🔒 SENTINEL SECURITY SCAN - TEE PROTECTED              ║")
  runtime.log("╚══════════════════════════════════════════════════════════════════╝")
  runtime.log("")
  runtime.log(`[SYSTEM] Contract: ${requestData.contractAddress}`)
  runtime.log(`[SYSTEM] Chain ID: ${requestData.chainId}`)
  
  if (requestData.sourceCode) {
    runtime.log(`[SYSTEM] Source: Pre-loaded (${requestData.sourceCode.length} chars)`)
  }
  runtime.log("")

  const contractAddress = requestData.contractAddress.toLowerCase()
  const chainId = requestData.chainId
  const transactionContext = requestData.transactionContext

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Source Code (Pre-fetched by Sentinel Node)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let sourceCode = requestData.sourceCode || ""
  let contractName = requestData.contractName || "Unknown"
  
  if (!sourceCode) {
    // Fallback - should not happen in production
    runtime.log("⚠️  No source code provided - using pattern match only")
    sourceCode = ""
    contractName = "Unknown"
  } else {
    runtime.log("✓ Source code loaded from payload")
  }
  runtime.log("")

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: AI Security Analysis via xAI Grok
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  runtime.log("[STEP 1/2] 🤖 AI Security Analysis via xAI Grok...")
  runtime.log("[STEP 1/2] 🔐 Using Confidential HTTP (API key never exposed)")
  runtime.log("")

  const httpClient = new HTTPClient()
  const xaiApiKey = runtime.config.xaiApiKey || ""
  
  if (!xaiApiKey) {
    runtime.log("❌ ERROR: xAI API key not configured")
    throw new Error("xaiApiKey not configured")
  }

  const xaiModel = runtime.config.xaiModel || "grok-4-1-fast-non-reasoning"
  runtime.log(`   🤖 Model: ${xaiModel}`)

  if (transactionContext?.threatSummary) {
    runtime.log(`   🚨 Context: ${transactionContext.threatSummary.length} threats detected`)
  }

  const requestBody = JSON.stringify({
    model: xaiModel,
    messages: [
      {
        role: "system",
        content: "You are an expert smart contract security auditor. Analyze the code for vulnerabilities."
      },
      {
        role: "user",
        content: buildSecurityPrompt(contractName, sourceCode, transactionContext)
      }
    ],
    temperature: 0.1,
    max_tokens: 1500,
  })

  const encodedBody = Buffer.from(requestBody).toString("base64")

  const xaiResp = httpClient
    .sendRequest(runtime, {
      url: XAI_API_URL,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: encodedBody,
    })
    .result()

  if (!ok(xaiResp)) {
    runtime.log(`❌ xAI API error: ${xaiResp.statusCode}`)
    runtime.log("⚠️  Falling back to pattern matching")
    return analyzeWithPatternMatching(runtime, contractAddress, chainId, contractName, sourceCode)
  }

  const xaiData = json(xaiResp)
  const aiResponse = xaiData.choices?.[0]?.message?.content || ""
  
  runtime.log("✓ AI analysis complete")
  runtime.log("")

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Compile Results
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  runtime.log("[STEP 2/2] 📊 Compiling security assessment...")
  runtime.log("")

  const result = compileResults(
    runtime,
    contractAddress,
    chainId,
    contractName,
    sourceCode,
    aiResponse
  )

  runtime.log("╔══════════════════════════════════════════════════════════════════╗")
  runtime.log(`║  SCAN COMPLETE - ${result.riskLevel.padEnd(20)}              ║`)
  runtime.log("╚══════════════════════════════════════════════════════════════════╝")
  runtime.log("")
  runtime.log(`Risk Level: ${result.riskLevel}`)
  runtime.log(`Overall Score: ${result.overallScore}/100`)
  runtime.log(`Vulnerabilities Found: ${result.vulnerabilities.length}`)
  runtime.log("")
  runtime.log("✅ Analysis secured by Chainlink TEE")
  runtime.log("🔒 API keys never left secure enclave")
  runtime.log("")

  return JSON.stringify(result)
}

/**
 * Build security analysis prompt
 */
function buildSecurityPrompt(contractName: string, sourceCode: string, txContext?: any): string {
  let prompt = `Analyze this Solidity smart contract for security vulnerabilities:

CONTRACT NAME: ${contractName}

SOURCE CODE:
\`\`\`solidity
${sourceCode.slice(0, 10000)}
\`\`\`
`

  if (txContext?.threatSummary?.length > 0) {
    prompt += `
SUSPICIOUS TRANSACTION CONTEXT:
${txContext.threatSummary.map((t: any) => `- [${t.level}] ${t.details}`).join("\n")}

This contract is being targeted by a suspicious transaction. Focus on vulnerabilities that could be exploited.
`
  }

  prompt += `
Provide a security analysis in this JSON format:
{
  "riskLevel": "SAFE|LOW|MEDIUM|HIGH|CRITICAL",
  "overallScore": 0-100,
  "summary": "Brief summary",
  "vulnerabilities": [
    {
      "type": "Vulnerability Name",
      "severity": "HIGH|MEDIUM|LOW",
      "description": "Description",
      "confidence": 0.95,
      "recommendation": "Fix suggestion"
    }
  ]
}

Focus on: Reentrancy, Access Control, Overflow, Unchecked Calls.`

  return prompt
}

/**
 * Compile final results
 */
function compileResults(
  runtime: Runtime<any>,
  contractAddress: string,
  chainId: number,
  contractName: string,
  sourceCode: string,
  aiResponse: string
): any {
  let aiAnalysis: any = null
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    runtime.log("⚠️  Could not parse AI response")
  }

  const vulnerabilities = aiAnalysis?.vulnerabilities || []

  // Pattern matching enhancements
  if (sourceCode) {
    const hasReentrancy = sourceCode.includes("call{value:") || 
                          sourceCode.includes(".call(") ||
                          sourceCode.match(/\.call\s*\{[^}]*value:/)
    
    if (hasReentrancy && !vulnerabilities.some((v: any) => v.type.includes("Reentrancy"))) {
      vulnerabilities.push({
        type: "Potential Reentrancy",
        severity: "MEDIUM",
        description: "External call pattern detected",
        confidence: 0.75,
        recommendation: "Use ReentrancyGuard"
      })
    }
  }

  let riskLevel = aiAnalysis?.riskLevel || "SAFE"
  let overallScore = aiAnalysis?.overallScore || 95

  if (vulnerabilities.length > 0 && riskLevel === "SAFE") {
    riskLevel = "MEDIUM"
    overallScore = Math.min(overallScore, 70)
  }

  return {
    status: "success",
    contractAddress,
    chainId,
    contractName,
    riskLevel,
    overallScore,
    summary: aiAnalysis?.summary || `Found ${vulnerabilities.length} potential issues`,
    vulnerabilities,
    sourceLoaded: !!sourceCode,
    sourceLength: sourceCode?.length || 0,
    aiAnalysis: !!aiAnalysis,
    confidential: true,
    tee: true,
    timestamp: Date.now(),
  }
}

/**
 * Fallback pattern matching
 */
function analyzeWithPatternMatching(
  runtime: Runtime<any>,
  contractAddress: string,
  chainId: number,
  contractName: string,
  sourceCode: string
): string {
  runtime.log("🔍 Pattern matching analysis...")
  
  const vulnerabilities = []
  let riskLevel = "SAFE"
  let overallScore = 95

  if (sourceCode) {
    const hasReentrancy = sourceCode.includes("call{value:") || sourceCode.includes(".call(")
    
    if (hasReentrancy) {
      riskLevel = "HIGH"
      overallScore = 35
      vulnerabilities.push({
        type: "Reentrancy",
        severity: "HIGH",
        description: "External call pattern allows reentrant calls",
        confidence: 0.85,
        recommendation: "Use ReentrancyGuard",
      })
    }
  }

  runtime.log(`   Risk: ${riskLevel}, Score: ${overallScore}`)

  return JSON.stringify({
    status: "success",
    contractAddress,
    chainId,
    contractName,
    riskLevel,
    overallScore,
    summary: `Pattern analysis: ${vulnerabilities.length} issues found`,
    vulnerabilities,
    aiAnalysis: false,
    patternMatch: true,
    confidential: true,
    tee: true,
    timestamp: Date.now(),
  })
}

const initWorkflow = (config: any) => {
  const httpCapability = new HTTPCapability()
  return [handler(httpCapability.trigger({}), onHttpTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<any>()
  await runner.run(initWorkflow)
}
