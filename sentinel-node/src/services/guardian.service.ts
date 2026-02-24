/**
 * Guardian Service - Executes contract pauses
 */

import { ethers } from 'ethers';
import type { BlockchainService } from './blockchain.service';

export class GuardianService {
  constructor(private blockchain: BlockchainService) {}

  /**
   * Execute emergency pause on a contract
   */
  async pause(contractAddress: string, vulnHash?: string): Promise<boolean> {
    if (!this.blockchain.wallet || !this.blockchain.guardian) {
      return false;
    }

    const hash = vulnHash || ethers.keccak256(ethers.toUtf8Bytes('sentinel_auto_pause'));

    try {
      const tx = await this.blockchain.guardian.emergencyPause(contractAddress, hash, {
        gasLimit: 100000,
      });
      await tx.wait();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if contract is already paused
   */
  async isPaused(contractAddress: string): Promise<boolean> {
    return this.blockchain.isPaused(contractAddress);
  }
}
