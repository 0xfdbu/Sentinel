// ==========================================================================
// SENTINEL AI SECURITY ORACLE - 100% CONFIDENTIAL HTTP IMPLEMENTATION
// ==========================================================================
// 
// Based on: https://github.com/smartcontractkit/conf-http-demo
// 
// FULL CONFIDENTIAL HTTP CAPABILITIES:
// ✅ Template-based API key injection via multiHeaders
// ✅ Response encryption with AES-GCM (encryptOutput: true)
// ✅ Multiple Vault DON secrets (API key + encryption key)
// ✅ Typed consensus aggregation
// ✅ Encrypted response structure (nonce || ciphertext || tag)
// ✅ Demonstration decryption flow
//
// ==========================================================================

import {
  cre,
  Runner,
  ok,
  consensusIdenticalAggregation,
  bytesToHex,
  type Runtime,
  type Config,
  type ConfidentialHTTPSendRequester,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import { decryptAesGcmSync, formatForCipherTools, extractEncryptedComponents } from "./crypto";
import { fetchWithConsensus, ConsensusResult, analyzeConsensus } from "./consensus";

// ============================================================
// CONFIGURATION SCHEMA
// ============================================================

const configSchema = z.object({
  cronSchedule: z.string(),
  etherscanUrl: z.string().url(),
  targetContract: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int(),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  encryptionEnabled: z.boolean().default(false),
});

type SentinelConfig = z.infer<typeof configSchema>;

// ============================================================
// ENCRYPTED RESPONSE TYPE (matching demo pattern)
// ============================================================

interface EncryptedResponse {
  bodyBase64: string;
  encrypted: boolean;
}

// ============================================================
// BASE64 UTILITIES (from demo)
// ============================================================

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64_ALPHABET[a >> 2];
    out += BASE64_ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : BASE64_ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : BASE64_ALPHABET[c & 63];
  }
  return out;
}

function base64ToBytes(base64: string): Uint8Array {
  const len = base64.replace(/=+$/, "").length;
  const n = Math.floor((len * 3) / 4);
  const out = new Uint8Array(n);
  let i = 0;
  let j = 0;
  while (i < base64.length) {
    const a = BASE64_ALPHABET.indexOf(base64[i++] ?? "");
    const b = BASE64_ALPHABET.indexOf(base64[i++] ?? "");
    const c = BASE64_ALPHABET.indexOf(base64[i++] ?? "");
    const d = BASE64_ALPHABET.indexOf(base64[i++] ?? "");
    if (a < 0 || b < 0) break;
    out[j++] = (a << 2) | (b >> 4);
    if (c >= 0 && j < n) out[j++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0 && j < n) out[j++] = ((c & 3) << 6) | d;
  }
  return out;
}

// ============================================================
// CONFIDENTIAL HTTP - FETCH WITH FULL ENCRYPTION (100% DEMO)
// ============================================================

const fetchContractSourceEncrypted = (
  sendRequester: ConfidentialHTTPSendRequester,
  config: SentinelConfig,
  contractAddress: string,
  chainId: number
): EncryptedResponse => {
  // PRODUCTION-GRADE: Template-based secret injection via Vault DON
  // API key is NEVER hardcoded - injected via {{.etherscanApiKey}} template
  // In TEE: Template is replaced at runtime by Vault DON
  // In Simulation: Template is replaced by CRE CLI from .env
  
  const url = `${config.etherscanUrl}?chainid=${chainId}&module=contract&action=getsourcecode&address=${contractAddress}`;

  const response = sendRequester
    .sendRequest({
      request: {
        url: url,
        method: "GET",
        // ✅ CAPABILITY 1: Template-based API key in header (production)
        // Secret injected via {{.etherscanApiKey}} from Vault DON
        // NEVER appears in code, logs, or WASM binary
        multiHeaders: {
          "X-Api-Key": {
            values: ["{{.etherscanApiKey}}"]
          }
        },
      },
      // ✅ CAPABILITY 3: Multiple Vault DON secrets (production only)
      vaultDonSecrets: config.encryptionEnabled ? [
        { key: "etherscanApiKey", owner: config.owner },
        { key: "san_marino_aes_gcm_encryption_key", owner: config.owner },
      ] : [],
      // ✅ CAPABILITY 2: Response encryption (production only)
      encryptOutput: config.encryptionEnabled,
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Etherscan API failed: status=${response.statusCode}`);
  }

  const body = response.body ?? new Uint8Array(0);
  const bodyBase64 = bytesToBase64(body);

  return {
    bodyBase64,
    encrypted: config.encryptionEnabled,
  };
};

// ============================================================
// DECRYPTION - AES-256-GCM IMPLEMENTATION
// ============================================================

const decryptAndDisplay = (
  runtime: Runtime<SentinelConfig>,
  encryptedResponse: EncryptedResponse,
  config: SentinelConfig
): string => {
  const bodyBytes = base64ToBytes(encryptedResponse.bodyBase64);
  
  // In SIMULATION mode: CRE returns plaintext, not actually encrypted
  // Try to parse as JSON directly
  try {
    const decoded = new TextDecoder().decode(bodyBytes);
    // Check if it's valid JSON (simulation mode)
    JSON.parse(decoded);
    runtime.log("   ✓ Response is plaintext (simulation mode)");
    return decoded;
  } catch {
    // In PRODUCTION/ENCRYPTION mode: Response is AES-GCM encrypted
    // Format: nonce (12 bytes) || ciphertext || tag (16 bytes)
    
    runtime.log("🔐 Encrypted Response Detected (AES-256-GCM):");
    runtime.log("   Format: nonce (12 bytes) || ciphertext || tag (16 bytes)");
    
    try {
      // Extract components using crypto.ts utilities
      const components = extractEncryptedComponents(bodyBytes);
      
      runtime.log("");
      runtime.log("📋 CipherTools.org Compatible Output:");
      runtime.log("   URL: https://www.ciphertools.org/tools/aes/gcm");
      runtime.log("   Operation: Decrypt + verify tag");
      runtime.log("   Tag length: 128 bits");
      runtime.log("   Key size: 256 bit");
      runtime.log("");
      runtime.log("   Nonce/IV (hex):");
      runtime.log(`   ${components.nonce}`);
      runtime.log("");
      runtime.log("   Ciphertext + Tag (hex):");
      runtime.log(`   ${components.combined.substring(0, 64)}...${components.combined.slice(-32)}`);
      
      // Attempt decryption if we have access to the key
      // In TEE: Key comes from vaultDonSecrets
      // In Simulation: Key from .env
      const aesKey = (globalThis as any).SENTINEL_AES_KEY || process.env.AES_KEY_ALL;
      
      if (aesKey) {
        try {
          const decrypted = decryptAesGcmSync(components.combined, components.nonce, aesKey);
          runtime.log("");
          runtime.log("✅ Successfully decrypted response in-enclave");
          return decrypted;
        } catch (decryptErr: any) {
          runtime.log("");
          runtime.log(`⚠️  Decryption failed: ${decryptErr.message}`);
          runtime.log("   Use CipherTools with the hex values above");
        }
      } else {
        runtime.log("");
        runtime.log("   Secret key: Use AES_KEY_ALL from .env (64 hex chars)");
      }
      
      return "[ENCRYPTED - Use CipherTools with values above]";
    } catch (extractErr: any) {
      runtime.log(`   ⚠️ Failed to extract encrypted components: ${extractErr.message}`);
      return "[ENCRYPTED - Extraction failed]";
    }
  }
};

// ============================================================
// CONTRACT ANALYSIS (unchanged core logic)
// ============================================================

interface Vulnerability {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  line?: number;
  description: string;
  recommendation: string;
}

interface ScanResult {
  contractAddress: string;
  chainId: number;
  contractName: string;
  timestamp: string;
  overallRisk: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedAction: "NONE" | "MONITOR" | "ALERT" | "PAUSE";
  vulnerabilities: Vulnerability[];
  summary: string;
  codeQuality: {
    complexity: string;
    accessControl: string;
    reentrancyProtection: string;
  };
  encrypted: boolean;
}

const analyzeContractSource = (
  rawSourceCode: string,
  contractName: string,
  contractAddress: string,
  chainId: number
): Omit<ScanResult, "encrypted"> => {
  // Handle Standard JSON Input format
  let sourceCode = rawSourceCode;
  try {
    if (rawSourceCode.trim().startsWith("{{") || rawSourceCode.trim().startsWith("{")) {
      const jsonStr = rawSourceCode.replace(/^\{\{/, "{").replace(/\}\}$/, "}");
      const jsonData = JSON.parse(jsonStr);
      if (jsonData.sources) {
        sourceCode = Object.values(jsonData.sources)
          .map((s: any) => s.content || "")
          .join("\n\n");
      }
    }
  } catch (e) {
    sourceCode = rawSourceCode;
  }

  const code = sourceCode.toLowerCase();
  const lines = sourceCode.split("\n");
  const vulnerabilities: Vulnerability[] = [];

  let criticalCount = 0;
  let highCount = 0;

  // Reentrancy Detection
  const hasReentrancyGuard = code.includes("nonreentrant");
  const importsReentrancyGuard = code.includes("reentrancyguard");
  const hasGuardButNotUsed = importsReentrancyGuard && !hasReentrancyGuard;

  const externalCalls: Array<{ line: number; type: string }> = [];
  const stateUpdates: Array<{ line: number; content: string }> = [];

  lines.forEach((line, idx) => {
    const lowerLine = line.toLowerCase();
    if (/\.(call|transfer|send|transferFrom)\s*[\{\(]/.test(lowerLine)) {
      if (!line.trim().startsWith("//") && !line.trim().startsWith("*")) {
        let callType = "external call";
        if (lowerLine.includes(".transfer(")) callType = "ERC20 transfer";
        if (lowerLine.includes(".transferfrom(")) callType = "ERC20 transferFrom";
        externalCalls.push({ line: idx + 1, type: callType });
      }
    }
    if (/\w+\s*(\-=|\+=|=\s*\w+\s*[-+])/.test(line) && !line.trim().startsWith("//")) {
      stateUpdates.push({ line: idx + 1, content: line.trim() });
    }
  });

  // Detect CEI violations
  if (externalCalls.length > 0 && stateUpdates.length > 0 && !hasReentrancyGuard) {
    for (const call of externalCalls) {
      for (const update of stateUpdates) {
        if (call.line < update.line && update.line - call.line < 20) {
          criticalCount++;
          const guardNote = hasGuardButNotUsed 
            ? " ReentrancyGuard imported but NOT used." 
            : " No ReentrancyGuard protection.";
          vulnerabilities.push({
            type: "REENTRANCY",
            severity: "CRITICAL",
            line: call.line,
            description: `${call.type} at line ${call.line} before state update at line ${update.line}. CEI pattern violation.${guardNote}`,
            recommendation: "Follow Checks-Effects-Interactions pattern",
          });
          break;
        }
      }
      if (criticalCount > 0) break;
    }
  }

  if (code.includes("tx.origin")) {
    highCount++;
    vulnerabilities.push({
      type: "TX_ORIGIN",
      severity: "HIGH",
      description: "Contract uses tx.origin for authentication",
      recommendation: "Use msg.sender instead",
    });
  }

  if (/selfdestruct|suicide\(/.test(code)) {
    criticalCount++;
    vulnerabilities.push({
      type: "SELF_DESTRUCT",
      severity: "CRITICAL",
      description: "Contract can be destroyed",
      recommendation: "Ensure protected by access control",
    });
  }

  if (code.includes(".delegatecall")) {
    criticalCount++;
    vulnerabilities.push({
      type: "DELEGATECALL",
      severity: "CRITICAL",
      description: "Unsafe delegatecall usage",
      recommendation: "Verify target is trusted",
    });
  }

  const riskScore = criticalCount * 4 + highCount * 2;
  let overallRisk: ScanResult["overallRisk"] = "SAFE";
  let recommendedAction: ScanResult["recommendedAction"] = "NONE";

  if (riskScore >= 4) {
    overallRisk = "CRITICAL";
    recommendedAction = "PAUSE";
  } else if (riskScore >= 2) {
    overallRisk = "HIGH";
    recommendedAction = "ALERT";
  } else if (riskScore > 0) {
    overallRisk = "MEDIUM";
    recommendedAction = "MONITOR";
  }

  const hasOwnable = code.includes("ownable") || code.includes("onlyowner");

  return {
    contractAddress,
    chainId,
    contractName,
    timestamp: new Date().toISOString(),
    overallRisk,
    recommendedAction,
    vulnerabilities,
    summary: `${contractName}: ${overallRisk} risk with ${vulnerabilities.length} issues`,
    codeQuality: {
      complexity: riskScore < 3 ? "LOW" : "MEDIUM",
      accessControl: hasOwnable ? "GOOD" : "MISSING",
      reentrancyProtection: hasReentrancyGuard ? "PRESENT" : hasGuardButNotUsed ? "IMPORTED_NOT_USED" : "MISSING",
    },
  };
};

// ============================================================
// MAIN WORKFLOW HANDLER
// ============================================================

const onCronTrigger = async (runtime: Runtime<SentinelConfig>): Promise<any> => {
  const config = runtime.config;
  
  runtime.log("═══════════════════════════════════════════════════════════");
  runtime.log("🔒 SENTINEL AI SECURITY ORACLE");
  runtime.log(`   Mode: 100% Confidential HTTP (matching conf-http-demo)`);
  runtime.log(`   Encryption: ${config.encryptionEnabled ? "AES-256-GCM" : "SIMULATION MODE"}`);
  runtime.log(`⏰ ${new Date().toISOString()}`);
  runtime.log("═══════════════════════════════════════════════════════════");
  
  const contractAddress = config.targetContract;
  
  if (!contractAddress) {
    runtime.log("⚠️ No target contract configured");
    return {
      status: "skipped",
      message: "No target contract configured",
    };
  }
  
  runtime.log(`🎯 Target: ${contractAddress}`);
  runtime.log(`🔗 Chain: ${config.chainId}`);
  
  try {
    // ✅ CAPABILITY 4 & 5: Typed consensus aggregation
    // ✅ PHASE 5: Multi-source consensus
    runtime.log("📡 Fetching via Confidential HTTP with multi-source consensus...");
    
    const httpClient = new cre.capabilities.ConfidentialHTTPClient();
    
    // Fetch with consensus from multiple sources (Etherscan, Sourcify, etc.)
    const consensusResult = httpClient
      .sendRequest(
        runtime,
        (sendRequester) => fetchWithConsensus(sendRequester, contractAddress, config.chainId, config),
        consensusIdenticalAggregation<ConsensusResult>()
      )()
      .result();
    
    runtime.log(`   Sources queried: ${consensusResult.sources.length}`);
    runtime.log(`   Successful: ${consensusResult.sources.filter(s => s.success).length}`);
    runtime.log(`   Consensus reached: ${consensusResult.consensusReached}`);
    runtime.log(`   Agreement ratio: ${(consensusResult.agreementRatio * 100).toFixed(1)}%`);
    
    if (consensusResult.recommendedAction === 'REJECT') {
      throw new Error(`Consensus failed: ${consensusResult.discrepancies.join(', ')}`);
    }
    
    if (consensusResult.recommendedAction === 'REVIEW') {
      runtime.log("   ⚠️ Single source or partial consensus - flagging for review");
    }
    
    // Get source code from consensus
    const sourceCode = consensusResult.agreedSourceCode || "";
    
    // Parse Etherscan response
    const etherscanData = JSON.parse(sourceCode);
    if (etherscanData.status !== "1" || !etherscanData.result?.[0]) {
      throw new Error(`Etherscan error: ${etherscanData.message || "No data"}`);
    }
    
    const contractData = etherscanData.result[0];
    const contractName = contractData.ContractName || "Unknown";
    const contractSource = contractData.SourceCode || "";
    
    runtime.log(`📄 Contract: ${contractName} (${contractSource.length} chars)`);
    
    // Analyze
    runtime.log("🔍 Analyzing...");
    const analysis = analyzeContractSource(contractSource, contractName, contractAddress, config.chainId);
    
    runtime.log(`⚠️ Risk: ${analysis.overallRisk}`);
    runtime.log(`🛡️ Action: ${analysis.recommendedAction}`);
    runtime.log(`🐛 Issues: ${analysis.vulnerabilities.length}`);
    
    if (analysis.vulnerabilities.length > 0) {
      analysis.vulnerabilities.forEach((v, i) => {
        runtime.log(`   ${i + 1}. [${v.severity}] ${v.type} (line ${v.line})`);
      });
    }
    
    const finalResult: ScanResult = {
      ...analysis,
      encrypted: encryptedResponse.encrypted,
    };
    
    return {
      status: "success",
      scanResult: finalResult,
      confidentialHttp: {
        encryption: config.encryptionEnabled ? "AES-256-GCM" : "disabled",
        vaultSecrets: ["etherscanApiKey", "san_marino_aes_gcm_encryption_key"],
        responseFormat: "nonce || ciphertext || tag",
      },
    };
    
  } catch (error: any) {
    runtime.log(`❌ Error: ${error.message}`);
    return {
      status: "error",
      error: error.message,
    };
  }
};

// ============================================================
// WORKFLOW INITIALIZATION
// ============================================================

const initWorkflow = (config: SentinelConfig) => {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: config.cronSchedule,
      }),
      onCronTrigger
    ),
  ];
};

// ============================================================
// MAIN ENTRY
// ============================================================

export async function main() {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run(initWorkflow);
}
