// ==========================================================================
// SENTINEL MEMPOOL WATCHER - Real-time Transaction Monitor
// ==========================================================================
// 
// Watches mempool for transactions targeting protected contracts
// Sends high-risk transactions to CRE workflow for AI analysis
// 
// USAGE:
//   npm run dev
// 
// ENV:
//   RPC_URL=ws://localhost:8545 (WebSocket RPC)
//   CRE_API_URL=http://localhost:3001 (CRE API endpoint)
//   TARGET_CONTRACT=0x... (Contract to monitor)
// 
// ==========================================================================

import { ethers } from "ethers";
import axios from "axios";

interface Config {
  rpcUrl: string;
  creApiUrl: string;
  targetContract: string;
  riskThreshold: number;
}

const CONFIG: Config = {
  rpcUrl: process.env.RPC_URL || "ws://127.0.0.1:8545",
  creApiUrl: process.env.CRE_API_URL || "http://localhost:3001",
  targetContract: process.env.TARGET_CONTRACT || "",
  riskThreshold: parseInt(process.env.RISK_THRESHOLD || "30"),
};

class MempoolWatcher {
  private provider: ethers.WebSocketProvider;
  private pendingTxs: Map<string, any> = new Map();
  
  constructor() {
    console.log("🔒 Initializing Sentinel Mempool Watcher...");
    console.log(`   RPC: ${CONFIG.rpcUrl}`);
    console.log(`   Target: ${CONFIG.targetContract || "ALL CONTRACTS"}`);
    console.log(`   Risk Threshold: ${CONFIG.riskThreshold}`);
    
    this.provider = new ethers.WebSocketProvider(CONFIG.rpcUrl);
  }
  
  async start() {
    console.log("\n📡 Starting mempool monitor...\n");
    
    // Subscribe to pending transactions
    this.provider.on("pending", async (txHash) => {
      try {
        const tx = await this.provider.getTransaction(txHash);
        if (!tx) return;
        
        // Check if transaction targets our protected contract
        if (this.isTargetContract(tx.to)) {
          console.log(`\n🚨 TARGET TRANSACTION DETECTED: ${txHash}`);
          console.log(`   From: ${tx.from}`);
          console.log(`   To: ${tx.to}`);
          console.log(`   Value: ${ethers.formatEther(tx.value || 0)} ETH`);
          console.log(`   Gas Price: ${ethers.formatUnits(tx.gasPrice || 0, "gwei")} gwei`);
          
          // Quick heuristic check before sending to CRE
          const quickScore = this.quickHeuristicScore(tx);
          console.log(`   Quick Score: ${quickScore}/100`);
          
          if (quickScore >= CONFIG.riskThreshold) {
            console.log(`   ⚠️ HIGH RISK - Sending to CRE workflow for AI analysis...`);
            await this.sendToCREWorkflow(tx, quickScore);
          } else {
            console.log(`   ✅ Low risk - monitoring only`);
          }
        }
      } catch (error: any) {
        // Silent fail for mempool scanning
      }
    });
    
    // Health check every 30 seconds
    setInterval(() => {
      console.log(`💓 Health check - Watching ${this.pendingTxs.size} pending txs`);
    }, 30000);
  }
  
  private isTargetContract(to: string | null): boolean {
    if (!to) return false;
    
    // If no target specified, watch all
    if (!CONFIG.targetContract) return true;
    
    return to.toLowerCase() === CONFIG.targetContract.toLowerCase();
  }
  
  private quickHeuristicScore(tx: ethers.TransactionResponse): number {
    let score = 0;
    
    // High value
    const value = BigInt(tx.value || 0);
    if (value > BigInt("1000000000000000000")) { // > 1 ETH
      score += 20;
    }
    
    // High gas price (MEV)
    const gasPrice = BigInt(tx.gasPrice || 0);
    if (gasPrice > BigInt("100000000000")) { // > 100 gwei
      score += 15;
    }
    
    // Complex data (function call)
    const data = tx.data?.toLowerCase() || "";
    if (data.length > 1000) {
      score += 10; // Complex call
    }
    
    // Known attack patterns in calldata
    if (data.includes("flash")) score += 30;
    if (data.includes("swap")) score += 10;
    if (data.includes("oracle")) score += 20;
    
    return Math.min(score, 100);
  }
  
  private async sendToCREWorkflow(
    tx: ethers.TransactionResponse,
    quickScore: number
  ): Promise<void> {
    try {
      const payload = {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString() || "0",
        data: tx.data,
        gasPrice: tx.gasPrice?.toString() || "0",
        timestamp: Date.now(),
        contractAddress: tx.to,
        quickScore,
      };
      
      const response = await axios.post(
        `${CONFIG.creApiUrl}/api/scan-realtime`,
        payload,
        { timeout: 30000 }
      );
      
      if (response.data?.decision) {
        const decision = response.data.decision;
        console.log(`\n🛡️ CRE WORKFLOW RESPONSE:`);
        console.log(`   Action: ${decision.action}`);
        console.log(`   Fraud Score: ${decision.fraudScore.score}/100`);
        
        if (decision.aiAnalysis) {
          console.log(`   AI Verdict: ${decision.aiAnalysis.isAttack ? "🚨 ATTACK" : "✅ OK"}`);
          console.log(`   AI Confidence: ${decision.aiAnalysis.confidence}%`);
          console.log(`   Type: ${decision.aiAnalysis.attackType || "N/A"}`);
        }
        
        if (decision.action === "EXECUTE_PAUSE") {
          console.log(`\n🚨🚨🚨 AUTOMATED PAUSE EXECUTED 🚨🚨🚨`);
          console.log(`   Contract ${tx.to} has been PAUSED`);
          console.log(`   Transaction: ${decision.txHash}`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to send to CRE: ${error.message}`);
    }
  }
  
  async stop() {
    console.log("\n🛑 Stopping mempool watcher...");
    await this.provider.destroy();
  }
}

// Start watcher
const watcher = new MempoolWatcher();

process.on("SIGINT", async () => {
  await watcher.stop();
  process.exit(0);
});

watcher.start().catch(console.error);
