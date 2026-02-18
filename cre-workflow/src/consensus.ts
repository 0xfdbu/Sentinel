// ==========================================================================
// SENTINEL CONSENSUS ENGINE - Multi-Source Verification
// ==========================================================================
// Fetches contract data from multiple sources and verifies consensus
// Protects against single-source failure or compromised APIs
// ==========================================================================

import { ok, type ConfidentialHTTPSendRequester } from "@chainlink/cre-sdk";

export interface SourceResult {
  source: string;
  success: boolean;
  sourceCode?: string;
  bytecode?: string;
  metadata?: any;
  error?: string;
  timestamp: number;
}

export interface ConsensusResult {
  consensusReached: boolean;
  agreedSourceCode?: string;
  sources: SourceResult[];
  agreementRatio: number;
  recommendedAction: 'USE' | 'REVIEW' | 'REJECT';
  discrepancies: string[];
}

// Source configurations
const SOURCES = {
  etherscan: {
    name: 'Etherscan',
    url: (address: string, chainId: number) => 
      `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`,
    headers: {
      'X-Api-Key': '{{.etherscanApiKey}}'
    }
  },
  sourcify: {
    name: 'Sourcify',
    url: (address: string, chainId: number) =>
      `https://sourcify.dev/server/files/any/${chainId}/${address}`,
    headers: {}
  }
};

/**
 * Fetches contract source from multiple sources concurrently
 */
export const fetchMultiSource = (
  sendRequester: ConfidentialHTTPSendRequester,
  contractAddress: string,
  chainId: number,
  config: { owner: string; encryptionEnabled: boolean }
): SourceResult[] => {
  const results: SourceResult[] = [];
  const timestamp = Date.now();

  // Fetch from Etherscan
  try {
    const etherscanUrl = SOURCES.etherscan.url(contractAddress, chainId);
    const etherscanResponse = sendRequester
      .sendRequest({
        request: {
          url: etherscanUrl,
          method: 'GET',
          multiHeaders: {
            'X-Api-Key': { values: ['{{.etherscanApiKey}}'] }
          }
        },
        vaultDonSecrets: config.encryptionEnabled ? [
          { key: 'etherscanApiKey', owner: config.owner }
        ] : [],
        encryptOutput: config.encryptionEnabled,
      })
      .result();

    if (ok(etherscanResponse) && etherscanResponse.body) {
      const data = JSON.parse(new TextDecoder().decode(etherscanResponse.body));
      if (data.status === '1' && data.result?.[0]?.SourceCode) {
        results.push({
          source: 'Etherscan',
          success: true,
          sourceCode: data.result[0].SourceCode,
          bytecode: data.result[0].ByteCode,
          timestamp
        });
      } else {
        results.push({
          source: 'Etherscan',
          success: false,
          error: data.message || 'No source code found',
          timestamp
        });
      }
    } else {
      results.push({
        source: 'Etherscan',
        success: false,
        error: `HTTP ${(etherscanResponse as any).statusCode}`,
        timestamp
      });
    }
  } catch (error: any) {
    results.push({
      source: 'Etherscan',
      success: false,
      error: error.message,
      timestamp
    });
  }

  // Fetch from Sourcify (if mainnet or supported chain)
  if (chainId === 1 || chainId === 11155111) {
    try {
      const sourcifyUrl = SOURCES.sourcify.url(contractAddress, chainId);
      const sourcifyResponse = sendRequester
        .sendRequest({
          request: {
            url: sourcifyUrl,
            method: 'GET',
            multiHeaders: {}
          },
          vaultDonSecrets: [],
          encryptOutput: config.encryptionEnabled,
        })
        .result();

      if (ok(sourcifyResponse) && sourcifyResponse.body) {
        const data = JSON.parse(new TextDecoder().decode(sourcifyResponse.body));
        if (data.status === 'perfect' || data.status === 'partial') {
          // Extract source code from Sourcify response
          const files = data.files || [];
          const mainFile = files.find((f: any) => f.name?.endsWith('.sol'));
          
          results.push({
            source: 'Sourcify',
            success: true,
            sourceCode: mainFile?.content || JSON.stringify(files),
            metadata: { status: data.status, files: files.length },
            timestamp
          });
        } else {
          results.push({
            source: 'Sourcify',
            success: false,
            error: `Status: ${data.status}`,
            timestamp
          });
        }
      } else {
        results.push({
          source: 'Sourcify',
          success: false,
          error: `HTTP ${(sourcifyResponse as any).statusCode}`,
          timestamp
        });
      }
    } catch (error: any) {
      results.push({
        source: 'Sourcify',
        success: false,
        error: error.message,
        timestamp
      });
    }
  }

  return results;
};

/**
 * Computes a simple hash of source code for comparison
 */
const hashSourceCode = (code: string): string => {
  // Simple hash - in production use proper cryptographic hash
  let hash = 0;
  const normalized = code.replace(/\s+/g, ' ').trim().toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

/**
 * Analyzes results from multiple sources to reach consensus
 */
export const analyzeConsensus = (results: SourceResult[]): ConsensusResult => {
  const successful = results.filter(r => r.success && r.sourceCode);
  const discrepancies: string[] = [];

  if (successful.length === 0) {
    return {
      consensusReached: false,
      sources: results,
      agreementRatio: 0,
      recommendedAction: 'REJECT',
      discrepancies: ['No sources returned valid data']
    };
  }

  if (successful.length === 1) {
    return {
      consensusReached: true,
      agreedSourceCode: successful[0].sourceCode,
      sources: results,
      agreementRatio: 1.0,
      recommendedAction: 'REVIEW', // Single source - flag for review
      discrepancies: ['Only one source available']
    };
  }

  // Compare source codes
  const hashes = successful.map(r => ({
    source: r.source,
    hash: hashSourceCode(r.sourceCode!),
    code: r.sourceCode!
  }));

  const hashGroups: Record<string, { sources: string[]; code: string }> = {};
  hashes.forEach(h => {
    if (!hashGroups[h.hash]) {
      hashGroups[h.hash] = { sources: [], code: h.code };
    }
    hashGroups[h.hash].sources.push(h.source);
  });

  // Find majority hash
  const groups = Object.values(hashGroups);
  groups.sort((a, b) => b.sources.length - a.sources.length);
  const majority = groups[0];

  // Check for discrepancies
  if (groups.length > 1) {
    groups.slice(1).forEach(g => {
      discrepancies.push(
        `Source mismatch: ${g.sources.join(', ')} differ from ${majority.sources.join(', ')}`
      );
    });
  }

  const agreementRatio = majority.sources.length / successful.length;
  
  let recommendedAction: ConsensusResult['recommendedAction'];
  if (agreementRatio >= 0.8) {
    recommendedAction = 'USE';
  } else if (agreementRatio >= 0.5) {
    recommendedAction = 'REVIEW';
  } else {
    recommendedAction = 'REJECT';
  }

  return {
    consensusReached: agreementRatio >= 0.5,
    agreedSourceCode: majority.code,
    sources: results,
    agreementRatio,
    recommendedAction,
    discrepancies
  };
};

/**
 * Full consensus workflow
 */
export const fetchWithConsensus = (
  sendRequester: ConfidentialHTTPSendRequester,
  contractAddress: string,
  chainId: number,
  config: { owner: string; encryptionEnabled: boolean }
): ConsensusResult => {
  const results = fetchMultiSource(sendRequester, contractAddress, chainId, config);
  return analyzeConsensus(results);
};
