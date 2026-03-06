/**
 * useStablecoinAPI Hook
 * 
 * React hook for interacting with the Stablecoin API endpoints
 * - Mint USDA
 * - Burn USDA
 * - CCIP Cross-chain transfer
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface MintRequest {
  requestId?: string;
  usdAmount: string;
  beneficiary: string;
  bankReference?: string;
}

export interface BurnRequest {
  requestId?: string;
  usdAmount: string;
  burner: string;
  bankReference?: string;
}

export interface CCIPTransferRequest {
  requestId?: string;
  amount: string;
  sender: string;
  recipient: string;
  destinationChain?: string;
  bankReference?: string;
}

export interface WorkflowResponse {
  success: boolean;
  data?: {
    requestId: string;
    operation: string;
    txHash?: string;
    messageId?: string;
    etherscan?: string;
    sourceExplorer?: string;
    ccipExplorer?: string;
    destinationExplorer?: string;
    estimatedTime?: string;
    logs: string[];
    error?: string;
    timestamp: number;
  };
  error?: string;
}

export function useStablecoinAPI() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<WorkflowResponse | null>(null);

  /**
   * Mint USDA tokens
   */
  const mint = useCallback(async (request: Omit<MintRequest, 'beneficiary'>): Promise<WorkflowResponse> => {
    if (!address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    const toastId = toast.loading('Initiating mint via CRE workflow...');

    try {
      const response = await fetch(`${API_BASE_URL}/stablecoin/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          beneficiary: address,
          bankReference: request.bankReference || `MINT-${Date.now()}`,
        }),
      });

      const result: WorkflowResponse = await response.json();
      setLastResponse(result);

      if (result.success && result.data?.txHash) {
        toast.success(
          <div>
            <div className="font-semibold">Mint initiated!</div>
            <a 
              href={result.data.etherscan} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline"
            >
              View on Etherscan →
            </a>
          </div>,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(result.data?.error || 'Mint failed', { id: toastId });
      }

      return result;
    } catch (error: any) {
      toast.error(`Mint error: ${error.message}`, { id: toastId });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * Burn USDA tokens
   */
  const burn = useCallback(async (request: Omit<BurnRequest, 'burner'>): Promise<WorkflowResponse> => {
    if (!address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    const toastId = toast.loading('Initiating burn via CRE workflow...');

    try {
      const response = await fetch(`${API_BASE_URL}/stablecoin/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          burner: address,
          bankReference: request.bankReference || `BURN-${Date.now()}`,
        }),
      });

      const result: WorkflowResponse = await response.json();
      setLastResponse(result);

      if (result.success && result.data?.txHash) {
        toast.success(
          <div>
            <div className="font-semibold">Burn initiated!</div>
            <a 
              href={result.data.etherscan} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline"
            >
              View on Etherscan →
            </a>
          </div>,
          { id: toastId, duration: 5000 }
        );
      } else {
        toast.error(result.data?.error || 'Burn failed', { id: toastId });
      }

      return result;
    } catch (error: any) {
      toast.error(`Burn error: ${error.message}`, { id: toastId });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * CCIP Cross-chain transfer
   */
  const ccipTransfer = useCallback(async (request: Omit<CCIPTransferRequest, 'sender'>): Promise<WorkflowResponse> => {
    if (!address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    const toastId = toast.loading('Initiating CCIP cross-chain transfer...');

    try {
      const response = await fetch(`${API_BASE_URL}/stablecoin/transfer/ccip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          sender: address,
          destinationChain: request.destinationChain || 'arbitrum-sepolia',
          bankReference: request.bankReference || `CCIP-${Date.now()}`,
        }),
      });

      const result: WorkflowResponse = await response.json();
      setLastResponse(result);

      if (result.success && result.data?.txHash) {
        toast.success(
          <div>
            <div className="font-semibold">CCIP transfer initiated!</div>
            <div className="text-xs text-neutral-400 mt-1">
              Estimated time: {result.data.estimatedTime}
            </div>
            <a 
              href={result.data.ccipExplorer} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1 block"
            >
              Track on CCIP Explorer →
            </a>
          </div>,
          { id: toastId, duration: 8000 }
        );
      } else {
        toast.error(result.data?.error || 'CCIP transfer failed', { id: toastId });
      }

      return result;
    } catch (error: any) {
      toast.error(`CCIP error: ${error.message}`, { id: toastId });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  /**
   * Check API status
   */
  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/stablecoin/status`);
      const result = await response.json();
      return result.success && result.data?.status === 'online';
    } catch {
      return false;
    }
  }, []);

  return {
    mint,
    burn,
    ccipTransfer,
    checkStatus,
    isLoading,
    lastResponse,
  };
}

export default useStablecoinAPI;
