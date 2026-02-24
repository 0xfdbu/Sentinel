/**
 * Blockchain Service - Manages provider, wallet, and contract interactions
 */

import { ethers } from 'ethers';
import { CONFIG, GUARDIAN_ABI, REGISTRY_ABI } from '../config';

export class BlockchainService {
  public provider: ethers.JsonRpcProvider;
  public wallet?: ethers.Wallet;
  public guardian?: ethers.Contract;
  public registry?: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    
    if (CONFIG.PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
      this.guardian = new ethers.Contract(CONFIG.GUARDIAN_ADDRESS, GUARDIAN_ABI, this.wallet);
      this.registry = new ethers.Contract(CONFIG.REGISTRY_ADDRESS, REGISTRY_ABI, this.provider);
    }
  }

  get isAuthenticated(): boolean {
    return !!this.wallet;
  }

  get address(): string | undefined {
    return this.wallet?.address;
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getBlock(blockNumber: number, prefetchTxs = true): Promise<ethers.Block | null> {
    return this.provider.getBlock(blockNumber, prefetchTxs);
  }

  async isPaused(contractAddress: string): Promise<boolean> {
    if (!this.guardian) return false;
    return this.guardian.isPaused(contractAddress).catch(() => false);
  }
}
