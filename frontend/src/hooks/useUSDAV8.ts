/**
 * USDA V8 Hook
 * 
 * React hook for interacting with USDA V8 stablecoin
 * Supports minting with ACE policy enforcement, balances, and transfers
 * Compatible with wagmi 1.x
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  usePublicClient, 
  useWalletClient,
  useChainId,
  useBalance,
} from 'wagmi';
import { formatEther, parseEther, type Address } from 'viem';
import { sepolia } from 'wagmi/chains';
import { toast } from 'react-hot-toast';

// USDA V8 Contract Configuration
export const USDA_V8_CONFIG = {
  address: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe' as Address,
  implementation: '0x5D6508e48c8A37D413D5a1B63eb1a560E6A51acF' as Address,
  chainId: sepolia.id,
};

// Policy Engine Configuration
export const POLICY_ENGINE_CONFIG = {
  address: '0x62CC29A58404631B7db65CE14E366F63D3B96B16' as Address,
};

// MintingConsumer V5 Configuration
export const MINTING_CONSUMER_CONFIG = {
  address: '0xFe0747c381A2227a954FeE7f99F41E382c6039a6' as Address,
};

// ABIs
const USDA_V8_ABI = [
  // ERC20 standard
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  // V8-specific
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'burn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'burnFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'pause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'unpause', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  // ACE Integration
  { name: 'policyEngine', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  // Access Control
  { name: 'hasRole', type: 'function', stateMutability: 'view', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'MINTER_ROLE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'BURNER_ROLE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'PAUSER_ROLE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bytes32' }] },
  { name: 'grantRole', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [] },
  // UUPS
  { name: 'implementation', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'upgradeTo', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'newImplementation', type: 'address' }], outputs: [] },
] as const;

const POLICY_ENGINE_ABI = [
  { name: 'isCompliant', type: 'function', stateMutability: 'view', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'evaluateFromContract', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'data', type: 'bytes' }], outputs: [{ name: 'shouldBlock', type: 'bool' }, { name: 'reason', type: 'string' }] },
  { name: 'policies', type: 'function', stateMutability: 'view', inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'authorizedSentinels', type: 'function', stateMutability: 'view', inputs: [{ name: 'sentinel', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

const MINTING_CONSUMER_ABI = [
  { name: 'onReport', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'metadata', type: 'bytes' }, { name: 'report', type: 'bytes' }], outputs: [] },
  { name: 'emergencyMint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'bankRef', type: 'bytes32' }], outputs: [] },
  { name: 'emergencyBurn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'bankRef', type: 'bytes32' }], outputs: [] },
  { name: 'stablecoin', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'forwarder', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'bankOperator', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'isPaused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const;

export function useUSDAV8() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // State for contract data
  const [balance, setBalance] = useState<bigint>(0n);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [decimals, setDecimals] = useState<number>(18);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [policyEngine, setPolicyEngine] = useState<Address | null>(null);
  const [implementation, setImplementation] = useState<Address | null>(null);
  const [hasMinterRole, setHasMinterRole] = useState<boolean>(false);
  const [minterRole, setMinterRole] = useState<`0x${string}` | null>(null);
  
  // Loading states
  const [isMinting, setIsMinting] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isEmergencyMinting, setIsEmergencyMinting] = useState(false);

  // Fetch static data
  useEffect(() => {
    if (!publicClient) return;

    const fetchStaticData = async () => {
      try {
        const [dec, paused, pe, impl, mr] = await Promise.all([
          publicClient.readContract({
            address: USDA_V8_CONFIG.address,
            abi: USDA_V8_ABI,
            functionName: 'decimals',
          }).catch(() => 18),
          publicClient.readContract({
            address: USDA_V8_CONFIG.address,
            abi: USDA_V8_ABI,
            functionName: 'paused',
          }).catch(() => false),
          publicClient.readContract({
            address: USDA_V8_CONFIG.address,
            abi: USDA_V8_ABI,
            functionName: 'policyEngine',
          }).catch(() => null),
          publicClient.readContract({
            address: USDA_V8_CONFIG.address,
            abi: USDA_V8_ABI,
            functionName: 'implementation',
          }).catch(() => null),
          publicClient.readContract({
            address: USDA_V8_CONFIG.address,
            abi: USDA_V8_ABI,
            functionName: 'MINTER_ROLE',
          }).catch(() => null),
        ]);

        setDecimals(Number(dec));
        setIsPaused(paused);
        setPolicyEngine(pe as Address);
        setImplementation(impl as Address);
        setMinterRole(mr as `0x${string}`);
      } catch (error) {
        console.error('Error fetching static data:', error);
      }
    };

    fetchStaticData();
  }, [publicClient]);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!publicClient || !address) return;

    try {
      const bal = await publicClient.readContract({
        address: USDA_V8_CONFIG.address,
        abi: USDA_V8_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      setBalance(bal);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [publicClient, address]);

  // Fetch total supply
  const fetchSupply = useCallback(async () => {
    if (!publicClient) return;

    try {
      const supply = await publicClient.readContract({
        address: USDA_V8_CONFIG.address,
        abi: USDA_V8_ABI,
        functionName: 'totalSupply',
      });
      setTotalSupply(supply);
    } catch (error) {
      console.error('Error fetching supply:', error);
    }
  }, [publicClient]);

  // Fetch MINTER_ROLE status
  useEffect(() => {
    if (!publicClient || !address || !minterRole) return;

    const fetchRole = async () => {
      try {
        const hasRole = await publicClient.readContract({
          address: USDA_V8_CONFIG.address,
          abi: USDA_V8_ABI,
          functionName: 'hasRole',
          args: [minterRole, address],
        });
        setHasMinterRole(hasRole);
      } catch (error) {
        console.error('Error fetching role:', error);
      }
    };

    fetchRole();
  }, [publicClient, address, minterRole]);

  // Initial fetch
  useEffect(() => {
    fetchBalance();
    fetchSupply();
  }, [fetchBalance, fetchSupply]);

  // Format helpers
  const formatUSDA = useCallback((value: bigint) => {
    return formatEther(value);
  }, []);

  const parseUSDA = useCallback((value: string) => {
    try {
      return parseEther(value);
    } catch {
      return 0n;
    }
  }, []);

  // Mint function (requires MINTER_ROLE)
  const mintUSDA = useCallback(async (to: Address, amount: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return null;
    }
    if (chainId !== sepolia.id) {
      toast.error('Please switch to Sepolia');
      return null;
    }
    if (!hasMinterRole) {
      toast.error('You need MINTER_ROLE to mint');
      return null;
    }
    if (!walletClient) {
      toast.error('Wallet not available');
      return null;
    }

    setIsMinting(true);
    try {
      const parsedAmount = parseUSDA(amount);
      if (parsedAmount === 0n) {
        toast.error('Invalid amount');
        return null;
      }

      const hash = await walletClient.writeContract({
        address: USDA_V8_CONFIG.address,
        abi: USDA_V8_ABI,
        functionName: 'mint',
        args: [to, parsedAmount],
      });

      toast.success(`Mint transaction submitted: ${hash.slice(0, 10)}...`);
      await fetchBalance();
      return hash;
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      if (message.includes('PolicyViolation')) {
        toast.error('ACE Policy Check Failed: Transaction blocked by policy');
      } else if (message.includes('NotCompliant')) {
        toast.error('ACE Compliance Check Failed');
      } else {
        toast.error(`Mint failed: ${message.slice(0, 100)}`);
      }
      return null;
    } finally {
      setIsMinting(false);
    }
  }, [isConnected, address, chainId, hasMinterRole, walletClient, parseUSDA, fetchBalance]);

  // Emergency mint via MintingConsumer (requires bankOperator)
  const emergencyMintUSDA = useCallback(async (to: Address, amount: string, bankRef: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return null;
    }
    if (!walletClient) {
      toast.error('Wallet not available');
      return null;
    }

    setIsEmergencyMinting(true);
    try {
      const parsedAmount = parseUSDA(amount);
      if (parsedAmount === 0n) {
        toast.error('Invalid amount');
        return null;
      }

      const bankRefBytes32 = bankRef.startsWith('0x') 
        ? bankRef as `0x${string}` 
        : `0x${Buffer.from(bankRef.padEnd(32, '\0')).toString('hex')}` as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: MINTING_CONSUMER_CONFIG.address,
        abi: MINTING_CONSUMER_ABI,
        functionName: 'emergencyMint',
        args: [to, parsedAmount, bankRefBytes32],
      });

      toast.success(`Emergency mint submitted: ${hash.slice(0, 10)}...`);
      await fetchBalance();
      return hash;
    } catch (error: any) {
      toast.error(`Emergency mint failed: ${error?.message?.slice(0, 100) || 'Unknown error'}`);
      return null;
    } finally {
      setIsEmergencyMinting(false);
    }
  }, [isConnected, address, walletClient, parseUSDA, fetchBalance]);

  // Burn function
  const burnUSDA = useCallback(async (amount: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return null;
    }
    if (!walletClient) {
      toast.error('Wallet not available');
      return null;
    }

    setIsBurning(true);
    try {
      const parsedAmount = parseUSDA(amount);
      if (parsedAmount === 0n || parsedAmount > balance) {
        toast.error('Invalid amount or insufficient balance');
        return null;
      }

      const hash = await walletClient.writeContract({
        address: USDA_V8_CONFIG.address,
        abi: USDA_V8_ABI,
        functionName: 'burn',
        args: [parsedAmount],
      });

      toast.success(`Burn transaction submitted: ${hash.slice(0, 10)}...`);
      await fetchBalance();
      return hash;
    } catch (error: any) {
      toast.error(`Burn failed: ${error?.message?.slice(0, 100) || 'Unknown error'}`);
      return null;
    } finally {
      setIsBurning(false);
    }
  }, [isConnected, address, balance, walletClient, parseUSDA, fetchBalance]);

  // Transfer function
  const transferUSDA = useCallback(async (to: Address, amount: string) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return null;
    }
    if (!walletClient) {
      toast.error('Wallet not available');
      return null;
    }

    setIsTransferring(true);
    try {
      const parsedAmount = parseUSDA(amount);
      if (parsedAmount === 0n || parsedAmount > balance) {
        toast.error('Invalid amount or insufficient balance');
        return null;
      }

      const hash = await walletClient.writeContract({
        address: USDA_V8_CONFIG.address,
        abi: USDA_V8_ABI,
        functionName: 'transfer',
        args: [to, parsedAmount],
      });

      toast.success(`Transfer submitted: ${hash.slice(0, 10)}...`);
      await fetchBalance();
      return hash;
    } catch (error: any) {
      toast.error(`Transfer failed: ${error?.message?.slice(0, 100) || 'Unknown error'}`);
      return null;
    } finally {
      setIsTransferring(false);
    }
  }, [isConnected, address, balance, walletClient, parseUSDA, fetchBalance]);

  // Check ACE compliance before minting
  const checkCompliance = useCallback(async (from: Address, to: Address, value: bigint = 0n) => {
    if (!publicClient) return null;

    try {
      const compliant = await publicClient.readContract({
        address: POLICY_ENGINE_CONFIG.address,
        abi: POLICY_ENGINE_ABI,
        functionName: 'isCompliant',
        args: [from, to, value],
      });
      return compliant;
    } catch (error) {
      console.error('Compliance check failed:', error);
      return null;
    }
  }, [publicClient]);

  return {
    // State
    address,
    isConnected,
    chainId,
    isCorrectChain: chainId === sepolia.id,
    
    // Token data
    balance,
    formattedBalance: formatUSDA(balance),
    totalSupply,
    formattedTotalSupply: formatUSDA(totalSupply),
    decimals,
    isPaused,
    policyEngine,
    implementation,
    hasMinterRole,
    
    // Config
    config: USDA_V8_CONFIG,
    policyEngineConfig: POLICY_ENGINE_CONFIG,
    mintingConsumerConfig: MINTING_CONSUMER_CONFIG,
    
    // Actions
    mintUSDA,
    emergencyMintUSDA,
    burnUSDA,
    transferUSDA,
    checkCompliance,
    refetchBalance: fetchBalance,
    refetchSupply: fetchSupply,
    
    // Loading states
    isMinting,
    isBurning,
    isTransferring,
    isEmergencyMinting,
    
    // Helpers
    formatUSDA,
    parseUSDA,
  };
}

export default useUSDAV8;
