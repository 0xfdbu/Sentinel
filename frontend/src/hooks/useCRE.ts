import { useState, useCallback } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { Address, encodeFunctionData, parseAbi } from 'viem'

const CRE_CONSUMER_ABI = parseAbi([
  'function requestConfidentialPause(address target, bytes32 vulnHash, bytes encryptedSecretsReference, string source) external returns (bytes32 requestId)',
  'function authorizeSentinel(address sentinel) external',
  'function revokeSentinel(address sentinel) external',
  'function authorizedSentinels(address) external view returns (bool)',
  'function subscriptionId() external view returns (uint64)',
  'function donId() external view returns (bytes32)',
  'event PauseRequestInitiated(bytes32 indexed requestId, address indexed target, bytes32 vulnHash, uint256 timestamp)',
  'event PauseExecuted(bytes32 indexed requestId, address indexed target, bool success)',
])

// JavaScript source that runs on Chainlink DON
const PAUSE_SOURCE_CODE = `
const apiKey = secrets.SENTINEL_API_KEY;
const apiUrl = secrets.SENTINEL_API_URL || "http://localhost:3000/api/v1";

const response = await Functions.makeHttpRequest({
  url: apiUrl + "/emergency-pause",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  },
  data: {
    target: args[0],
    vulnHash: args[1],
    sentinel: args[2],
    source: "chainlink_functions"
  },
  timeout: 15000
});

if (response.error) {
  throw Error("Request failed: " + response.error);
}

return Functions.encodeUint256(response.data.success ? 1 : 0);
`

export function useCRE(consumerAddress: Address) {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [isLoading, setIsLoading] = useState(false)
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)

  /**
   * Request a confidential pause via Chainlink Functions
   */
  const requestConfidentialPause = useCallback(async (
    target: Address,
    vulnHash: string,
    source?: string
  ): Promise<string> => {
    if (!walletClient) throw new Error('Wallet not connected')
    if (!consumerAddress) throw new Error('CRE Consumer not configured')

    setIsLoading(true)

    try {
      // Use provided source or default
      const pauseSource = source || PAUSE_SOURCE_CODE

      // No encrypted secrets for now (can be added via uploadEncryptedSecretsToDON)
      const encryptedSecretsReference = '0x' as `0x${string}`

      // Prepare transaction data
      const data = encodeFunctionData({
        abi: CRE_CONSUMER_ABI,
        functionName: 'requestConfidentialPause',
        args: [
          target,
          vulnHash as `0x${string}`,
          encryptedSecretsReference,
          pauseSource,
        ],
      })

      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: consumerAddress,
        data,
        value: 0n,
      })

      // Wait for confirmation
      await publicClient!.waitForTransactionReceipt({ hash })

      // Generate deterministic request ID from tx hash
      const requestId = `0x${hash.slice(2, 66)}` as `0x${string}`
      setLastRequestId(requestId)

      return requestId

    } finally {
      setIsLoading(false)
    }
  }, [walletClient, consumerAddress, publicClient])

  /**
   * Check if an address is an authorized sentinel
   */
  const isAuthorizedSentinel = useCallback(async (address: Address): Promise<boolean> => {
    if (!publicClient || !consumerAddress) return false

    try {
      const result = await publicClient.readContract({
        address: consumerAddress,
        abi: CRE_CONSUMER_ABI,
        functionName: 'authorizedSentinels',
        args: [address],
      })
      return Boolean(result)
    } catch (error) {
      console.error('Failed to check sentinel status:', error)
      return false
    }
  }, [publicClient, consumerAddress])

  /**
   * Authorize a new sentinel (only callable by current sentinels)
   */
  const authorizeSentinel = useCallback(async (sentinel: Address): Promise<`0x${string}`> => {
    if (!walletClient) throw new Error('Wallet not connected')

    setIsLoading(true)

    try {
      const data = encodeFunctionData({
        abi: CRE_CONSUMER_ABI,
        functionName: 'authorizeSentinel',
        args: [sentinel],
      })

      const hash = await walletClient.sendTransaction({
        to: consumerAddress,
        data,
      })

      await publicClient!.waitForTransactionReceipt({ hash })
      return hash

    } finally {
      setIsLoading(false)
    }
  }, [walletClient, consumerAddress, publicClient])

  /**
   * Revoke a sentinel
   */
  const revokeSentinel = useCallback(async (sentinel: Address): Promise<`0x${string}`> => {
    if (!walletClient) throw new Error('Wallet not connected')

    setIsLoading(true)

    try {
      const data = encodeFunctionData({
        abi: CRE_CONSUMER_ABI,
        functionName: 'revokeSentinel',
        args: [sentinel],
      })

      const hash = await walletClient.sendTransaction({
        to: consumerAddress,
        data,
      })

      await publicClient!.waitForTransactionReceipt({ hash })
      return hash

    } finally {
      setIsLoading(false)
    }
  }, [walletClient, consumerAddress, publicClient])

  return {
    requestConfidentialPause,
    isAuthorizedSentinel,
    authorizeSentinel,
    revokeSentinel,
    isLoading,
    lastRequestId,
    consumerAddress,
  }
}

export default useCRE
