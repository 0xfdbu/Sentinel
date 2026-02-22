/**
 * Confidential Transaction Service - REAL TEE Integration
 * 
 * Integrates with Chainlink Compliant Private Transfer Demo TEE API.
 * Based on: https://github.com/smartcontractkit/Compliant-Private-Transfer-Demo
 * 
 * REAL Endpoints Available:
 * - POST /shielded-address - Generate shielded address for receiving
 * - POST /balances - Get private balances (EIP-712 signed)
 * - POST /private-transfer - Execute confidential transfer (EIP-712 signed)
 * - POST /withdraw - Request withdrawal ticket (EIP-712 signed)
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';

// TEE API Configuration
const TEE_API_BASE = process.env.TEE_API_URL || 'https://convergence2026-token-api.cldev.cloud';

// EIP-712 Domain for Compliant Private Token Demo
const CONFIDENTIAL_DOMAIN = {
  name: "CompliantPrivateTokenDemo",
  version: "0.0.1",
  chainId: 11155111, // Sepolia
  verifyingContract: "0xE588a6c73933BFD66Af9b4A07d48bcE59c0D2d13"
};

export interface ShieldedAddressResponse {
  shieldedAddress: string;
}

export interface PrivateBalance {
  token: string;
  amount: string;
}

export interface ConfidentialTransferResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class ConfidentialTxService {
  /**
   * Get shielded address for receiving private transfers
   * This creates a privacy-preserving address that can't be linked to the real address
   */
  async getShieldedAddress(walletAddress: string, privateKey: string): Promise<string | null> {
    try {
      logger.info('[ConfidentialTx] Getting shielded address', { walletAddress });

      const wallet = new ethers.Wallet(privateKey);
      const timestamp = Math.floor(Date.now() / 1000);
      
      const message = {
        account: walletAddress,
        timestamp
      };

      const types = {
        'Get Shielded Address': [
          { name: 'account', type: 'address' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      const signature = await wallet.signTypedData(CONFIDENTIAL_DOMAIN, types, message);
      const signedPayload = { ...message, auth: signature };

      const response = await fetch(`${TEE_API_BASE}/shielded-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('[ConfidentialTx] Shielded address request failed', { error, status: response.status });
        return null;
      }

      const result = await response.json() as ShieldedAddressResponse;
      logger.info('[ConfidentialTx] Got shielded address', { 
        walletAddress, 
        shieldedAddress: result.shieldedAddress 
      });
      
      return result.shieldedAddress;

    } catch (error) {
      logger.error('[ConfidentialTx] Failed to get shielded address', { 
        error: (error as Error).message,
        walletAddress 
      });
      return null;
    }
  }

  /**
   * Get private balances for an account
   * These are off-chain balances managed by the TEE
   */
  async getPrivateBalances(walletAddress: string, privateKey: string): Promise<PrivateBalance[]> {
    try {
      logger.info('[ConfidentialTx] Getting private balances', { walletAddress });

      const wallet = new ethers.Wallet(privateKey);
      const timestamp = Math.floor(Date.now() / 1000);
      
      const message = {
        account: walletAddress,
        timestamp
      };

      const types = {
        'Retrieve Balances': [
          { name: 'account', type: 'address' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      const signature = await wallet.signTypedData(CONFIDENTIAL_DOMAIN, types, message);
      const signedPayload = { ...message, auth: signature };

      const response = await fetch(`${TEE_API_BASE}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('[ConfidentialTx] Balance request failed', { error, status: response.status });
        return [];
      }

      const result = await response.json() as { balances: PrivateBalance[] };
      const balances = result.balances || [];
      
      logger.info('[ConfidentialTx] Got private balances', { 
        walletAddress, 
        count: balances.length 
      });
      
      return balances;

    } catch (error) {
      logger.error('[ConfidentialTx] Failed to get balances', { 
        error: (error as Error).message,
        walletAddress 
      });
      return [];
    }
  }

  /**
   * Execute a REAL confidential transfer
   * The transfer happens off-chain in the TEE - amount and sender stay private
   */
  async executeConfidentialTransfer(
    senderPrivateKey: string,
    recipientShieldedAddress: string,
    tokenAddress: string,
    amount: string,
    hideSender: boolean = true
  ): Promise<ConfidentialTransferResponse> {
    try {
      const wallet = new ethers.Wallet(senderPrivateKey);
      logger.info('[ConfidentialTx] Executing REAL confidential transfer', {
        sender: wallet.address,
        recipientShielded: recipientShieldedAddress.slice(0, 20) + '...',
        token: tokenAddress,
        amount
      });

      const timestamp = Math.floor(Date.now() / 1000);
      const transferMessage = {
        sender: wallet.address,
        recipient: recipientShieldedAddress,
        token: tokenAddress,
        amount: amount,
        flags: hideSender ? ["hide-sender"] : [],
        timestamp
      };

      const types = {
        'Private Token Transfer': [
          { name: 'sender', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'flags', type: 'string[]' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      const signature = await wallet.signTypedData(CONFIDENTIAL_DOMAIN, types, transferMessage);
      const signedPayload = { ...transferMessage, auth: signature };

      logger.info('[ConfidentialTx] Sending to TEE API...');

      const response = await fetch(`${TEE_API_BASE}/private-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('[ConfidentialTx] Transfer failed', { error, status: response.status });
        return {
          success: false,
          error: `TEE API error: ${response.status} - ${error}`
        };
      }

      const result = await response.json() as { transactionId?: string; txHash?: string };
      logger.info('[ConfidentialTx] Confidential transfer executed!', {
        sender: wallet.address,
        result
      });

      return {
        success: true,
        transactionId: result.transactionId || result.txHash
      };

    } catch (error) {
      logger.error('[ConfidentialTx] Transfer error', { 
        error: (error as Error).message 
      });
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Request withdrawal ticket from TEE
   * This creates an on-chain redeemable ticket for withdrawing private funds
   */
  async requestWithdrawal(
    walletAddress: string,
    privateKey: string,
    tokenAddress: string,
    amount: string
  ): Promise<{ ticket: string; deadline: number } | null> {
    try {
      logger.info('[ConfidentialTx] Requesting withdrawal ticket', {
        walletAddress,
        token: tokenAddress,
        amount
      });

      const wallet = new ethers.Wallet(privateKey);
      const timestamp = Math.floor(Date.now() / 1000);
      
      const message = {
        account: walletAddress,
        token: tokenAddress,
        amount: amount,
        timestamp
      };

      const types = {
        'Withdraw Tokens': [
          { name: 'account', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      const signature = await wallet.signTypedData(CONFIDENTIAL_DOMAIN, types, message);
      const signedPayload = { ...message, auth: signature };

      const response = await fetch(`${TEE_API_BASE}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error('[ConfidentialTx] Withdrawal request failed', { error });
        return null;
      }

      const result = await response.json() as { ticket: string; deadline: number };
      logger.info('[ConfidentialTx] Got withdrawal ticket', {
        ticket: result.ticket.slice(0, 30) + '...',
        deadline: result.deadline
      });

      return result;

    } catch (error) {
      logger.error('[ConfidentialTx] Withdrawal error', { 
        error: (error as Error).message 
      });
      return null;
    }
  }

  /**
   * Check if TEE API is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${TEE_API_BASE}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Invalid but tests connectivity
      });
      // 400 means API is up but payload was invalid
      return response.status === 400 || response.ok;
    } catch {
      return false;
    }
  }
}

export const confidentialTxService = new ConfidentialTxService();
