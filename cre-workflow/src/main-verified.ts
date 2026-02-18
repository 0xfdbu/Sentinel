// ==========================================================================
// SENTINEL SECURITY ORACLE - PHASE 1: VERIFIED CONFIDENTIAL HTTP
// ==========================================================================
// 
// This workflow implements WORKING AES-GCM encryption that can be verified:
// 1. Fetch data from Etherscan
// 2. Encrypt with AES-GCM (not just a flag)
// 3. Output CipherTools-compatible hex values
// 4. Log instructions for decryption verification
//
// TO VERIFY: Paste the hex output into https://www.ciphertools.org/tools/aes/gcm
//
// ==========================================================================

import {
  cre,
  Runner,
  ok,
  consensusIdenticalAggregation,
  type Runtime,
  type Config,
  type ConfidentialHTTPSendRequester,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import {
  hexToBytes,
  bytesToHexRaw,
  bytesToBase64,
  base64ToBytes,
  aesGcmEncrypt,
  aesGcmDecrypt,
  generateNonce,
  parseEncryptedResponse,
  getCipherToolsOutput,
} from "./crypto";

// ============================================================
// CONFIGURATION
// ============================================================

const configSchema = z.object({
  cronSchedule: z.string().default("*/5 * * * *"),
  etherscanUrl: z.string().default("https://api.etherscan.io/v2/api"),
  chainId: z.number().default(11155111),
  targetContract: z.string().optional(),
  owner: z.string(),
  // AES key for encryption (in production from Vault DON)
  aesKeyHex: z.string().default("790f64518be074ef6bc1514040ff0a0b2d39384015d5966cc8b8f8152e79788d"),
  demoEncryption: z.boolean().default(true),
});

type VerifiedConfig = z.infer<typeof configSchema>;

// ============================================================
// CONFIDENTIAL HTTP WITH REAL ENCRYPTION
// ============================================================

const fetchAndEncrypt = async (
  sendRequester: ConfidentialHTTPSendRequester,
  config: VerifiedConfig,
  contractAddress: string,
  chainId: number
): Promise<{ encrypted: string; original: string }> => {
  // Fetch from Etherscan (using URL param for demo - header for production)
  const ETHERSCAN_API_KEY = "6CXVE3E6Z4CW8FB1RDCX4BU5SQHCM18ZB5";
  const url = `${config.etherscanUrl}?chainid=${chainId}&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;

  const response = sendRequester
    .sendRequest({
      request: { url, method: "GET", multiHeaders: {} },
      vaultDonSecrets: [],
      encryptOutput: false, // We do our own encryption below
    })
    .result();

  if (!ok(response)) {
    throw new Error(`Etherscan API failed: ${response.statusCode}`);
  }

  // Get the raw response
  const bodyText = new TextDecoder().decode(response.body ?? new Uint8Array(0));
  
  if (!config.demoEncryption) {
    return { encrypted: "", original: bodyText };
  }

  // REAL AES-GCM ENCRYPTION (Phase 1 requirement)
  const key = hexToBytes(config.aesKeyHex);
  const nonce = generateNonce(12);
  
  const { ciphertext, tag } = await aesGcmEncrypt(bodyText, nonce, key);
  
  // Format: base64(nonce || ciphertext || tag)
  const encrypted = bytesToBase64(
    new Uint8Array([...nonce, ...ciphertext, ...tag])
  );

  return { encrypted, original: bodyText };
};

// ============================================================
// MAIN WORKFLOW
// ============================================================

const onCronTrigger = async (runtime: Runtime<VerifiedConfig>): Promise<any> => {
  const config = runtime.config;
  
  runtime.log("═══════════════════════════════════════════════════════════");
  runtime.log("🔒 SENTINEL - PHASE 1: VERIFIED CONFIDENTIAL HTTP");
  runtime.log("⏰ " + new Date().toISOString());
  runtime.log("═══════════════════════════════════════════════════════════");
  
  const contractAddress = config.targetContract || "0xc7CD6F13A4bE91604BCc04A78f57531d30808D1C";
  
  runtime.log(`🎯 Target: ${contractAddress}`);
  runtime.log("📡 Fetching from Etherscan...");
  
  try {
    const httpClient = new cre.capabilities.ConfidentialHTTPClient();
    
    // Fetch and encrypt
    const { encrypted, original } = await httpClient
      .sendRequest(
        runtime,
        (sendRequester) => fetchAndEncrypt(sendRequester, config, contractAddress, config.chainId),
        consensusIdenticalAggregation<{ encrypted: string; original: string }>()
      )()
      .result();

    runtime.log(`✅ Data fetched: ${original.length} chars`);
    runtime.log(`🔐 Encrypted: ${encrypted.length} chars (base64)`);
    
    // PHASE 1 VERIFICATION: Output CipherTools-compatible format
    const cipherTools = getCipherToolsOutput(encrypted, config.aesKeyHex);
    
    runtime.log("");
    runtime.log("═══════════════════════════════════════════════════════════");
    runtime.log("📋 CIPHERTOOLS VERIFICATION (Phase 1 Deliverable)");
    runtime.log("═══════════════════════════════════════════════════════════");
    runtime.log(`URL: ${cipherTools.url}`);
    runtime.log("");
    runtime.log("Step 1: Paste this into 'Nonce / IV' field:");
    runtime.log(cipherTools.nonceHex);
    runtime.log("");
    runtime.log("Step 2: Paste this into 'Ciphertext + tag' field:");
    runtime.log(cipherTools.ciphertextAndTagHex.substring(0, 100) + "...");
    runtime.log("");
    runtime.log("Step 3: Paste this into 'Key' field:");
    runtime.log(cipherTools.keyHex);
    runtime.log("");
    runtime.log("Expected result: Readable JSON from Etherscan");
    runtime.log("═══════════════════════════════════════════════════════════");
    
    // Verify decryption works
    try {
      const { nonce, ciphertext, tag } = parseEncryptedResponse(encrypted);
      const decrypted = await aesGcmDecrypt(ciphertext, nonce, tag, hexToBytes(config.aesKeyHex));
      const isValid = decrypted === original;
      runtime.log(`✅ Decryption verification: ${isValid ? "PASSED" : "FAILED"}`);
    } catch (e: any) {
      runtime.log(`❌ Decryption test failed: ${e.message}`);
    }
    
    // Return full result
    return {
      status: "success",
      phase: "phase-1-verified-encryption",
      verification: {
        cipherToolsUrl: cipherTools.url,
        nonceHex: cipherTools.nonceHex,
        ciphertextAndTagHexPreview: cipherTools.ciphertextAndTagHex.substring(0, 50) + "...",
        keyHex: cipherTools.keyHex,
      },
      data: {
        originalLength: original.length,
        encryptedLength: encrypted.length,
        contractAddress,
      },
      timestamp: new Date().toISOString(),
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
// WORKFLOW INIT
// ============================================================

const initWorkflow = (config: VerifiedConfig) => {
  return [
    cre.handler(
      new cre.capabilities.CronCapability().trigger({
        schedule: config.cronSchedule,
      }),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run(initWorkflow);
}
