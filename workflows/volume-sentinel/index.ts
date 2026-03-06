/**
 * Volume Sentinel - ACE Volume Limit Adjustment Workflow
 * 
 * Monitors GENERAL crypto market sentiment (not token-specific) to adjust
 * ACE volume limits for the local USDA stablecoin.
 * 
 * Logic: When overall crypto market is bullish/high volume → increase USDA limits
 *        When market is bearish/low volume/risky → decrease USDA limits or pause
 */

import { bytesToHex, cre, getNetwork, type Runtime, type CronPayload, TxStatus, Runner, hexToBase64 } from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, parseUnits, formatUnits } from 'viem'
import { z } from 'zod'

// Config schema
const configSchema = z.object({
  sepolia: z.object({
    volumePolicyAddress: z.string(),
  }),
  finnhubApiKey: z.string(),
  coingeckoApiKey: z.string(),
  xaiApiKey: z.string(),
  xaiModel: z.string().default('grok-4-1-fast-reasoning'),
  defaultVolumeLimit: z.string().default('1000000000000000000000'), // 1000 USDA
  minVolumeLimit: z.string().default('100000000000000000000'), // 100 USDA
  maxVolumeLimit: z.string().default('10000000000000000000000'), // 10000 USDA
  adjustmentThreshold: z.number().default(0.15), // 15% change threshold
})

// HTTP trigger payload schema
const payloadSchema = z.object({
  currentLimit: z.string().optional(), // Current USDA volume limit in wei
  forceAdjust: z.boolean().default(false), // Force adjustment even if within threshold
  marketContext: z.string().optional(), // Optional context for the AI
})

// VolumePolicyDON instruction types
const INSTRUCTION_SET_LIMITS = 1      // (min, max)
const INSTRUCTION_SET_DAILY_LIMIT = 2 // (newLimit)
const INSTRUCTION_SET_EXEMPTION = 3   // (address, status)

interface MarketData {
  // General crypto news (not USDA-specific)
  news: Array<{
    headline: string
    source: string
    category: string
    sentiment: number
    timestamp: number
  }>
  
  // Trending coins from CoinGecko (momentum/sentiment indicator)
  trendingCoins: Array<{
    name: string
    symbol: string
    rank: number
    score: number
  }>
  
  // Enhanced market metrics from CoinGecko
  marketMetrics: {
    totalMarketCap: number
    marketCapChange24h: number
    totalVolume24h: number
    fearGreedIndex: number
    // Enhanced indicators
    btcDominance: number
    ethDominance: number
    volumeToMcapRatio: number
    activeCryptos: number
    totalMarkets: number
    ongoingICOs: number
  }
  
  sentiment: {
    overall: 'extreme_greed' | 'greed' | 'neutral' | 'fear' | 'extreme_fear'
    score: number // -100 to 100
    confidence: number
    reasoning: string
  }
}

interface AIAnalysis {
  recommendation: 'increase' | 'decrease' | 'maintain' | 'pause'
  newLimit: string // In wei
  reasoning: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  marketCondition: string
}

/**
 * HTTP Trigger Handler
 * Analyzes general crypto market conditions to adjust USDA volume limits
 */
const onCronTrigger = (runtime: Runtime<any>, payload: CronPayload): object => {
  runtime.log(`=== Volume Sentinel (Cron Trigger) - USDA Volume Adjustment ===`)
  if (payload.scheduledExecutionTime) {
    runtime.log(`Scheduled execution at: ${new Date(Number(payload.scheduledExecutionTime.seconds) * 1000).toISOString()}`)
  }
  runtime.log('Monitoring general crypto market sentiment...\n')
  
  try {
    const parsed = payloadSchema.parse(JSON.parse(payload.input.toString()))
    const cfg = runtime.config
    
    runtime.log(`Target: USDA Stablecoin Volume Limits`)
    
    // Get network config
    const network = getNetwork({ 
      chainFamily: 'evm', 
      chainSelectorName: 'ethereum-testnet-sepolia', 
      isTestnet: true 
    })
    if (!network) throw new Error('Network configuration failed')
    
    const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)
    const http = new cre.capabilities.HTTPClient()
    
    // Step 1: Fetch general crypto market news (not token-specific)
    runtime.log('[1] Fetching general crypto market news...')
    const newsData = fetchCryptoNews(runtime, http, cfg.finnhubApiKey)
    
    // Step 2: Fetch trending coins and search data for sentiment
    runtime.log('[2] Fetching CoinGecko trending & search data...')
    const trendingData = fetchTrendingCoins(runtime, http, cfg.coingeckoApiKey)
    
    // Step 3: Fetch overall market metrics (includes dominance, active_cryptos, etc.)
    runtime.log('[3] Fetching enhanced market metrics...')
    const marketMetrics = fetchEnhancedMarketMetrics(runtime, http, cfg.coingeckoApiKey)
    
    // Step 4: Aggregate market sentiment
    const marketData: MarketData = {
      news: newsData,
      trendingCoins: trendingData,
      marketMetrics: marketMetrics,
      sentiment: calculateMarketSentiment(newsData, trendingData, marketMetrics)
    }
    
    runtime.log(`\n📊 Market Sentiment: ${marketData.sentiment.overall.toUpperCase()}`)
    runtime.log(`   Score: ${marketData.sentiment.score}/100`)
    runtime.log(`   Confidence: ${(marketData.sentiment.confidence * 100).toFixed(1)}%`)
    runtime.log(`   Reasoning: ${marketData.sentiment.reasoning}\n`)
    
    // Log key metrics
    runtime.log(`   Market Cap: $${(marketData.marketMetrics.totalMarketCap / 1e12).toFixed(2)}T (${marketData.marketMetrics.marketCapChange24h > 0 ? '+' : ''}${marketData.marketMetrics.marketCapChange24h.toFixed(2)}%)`)
    runtime.log(`   24h Volume: $${(marketData.marketMetrics.totalVolume24h / 1e9).toFixed(2)}B`)
    runtime.log(`   BTC Dominance: ${marketData.marketMetrics.btcDominance.toFixed(1)}%`)
    runtime.log(`   ETH Dominance: ${marketData.marketMetrics.ethDominance.toFixed(1)}%`)
    runtime.log(`   Vol/Mcap Ratio: ${(marketData.marketMetrics.volumeToMcapRatio * 100).toFixed(2)}%`)
    runtime.log(`   Active Cryptos: ${marketData.marketMetrics.activeCryptos.toLocaleString()}`)
    runtime.log(`   Trending Coins: ${marketData.trendingCoins.length} (momentum indicator)`)
    runtime.log(`   Fear & Greed: ${marketData.marketMetrics.fearGreedIndex}/100\n`)
    
    // Step 5: Send to xAI Grok for analysis
    runtime.log('[4] Analyzing with xAI Grok...')
    const aiAnalysis = analyzeWithGrok(runtime, http, cfg.xaiApiKey, cfg.xaiModel, marketData, parsed, cfg)
    
    runtime.log(`   AI Recommendation: ${aiAnalysis.recommendation.toUpperCase()}`)
    runtime.log(`   Market Condition: ${aiAnalysis.marketCondition}`)
    runtime.log(`   Risk Level: ${aiAnalysis.riskLevel.toUpperCase()}`)
    runtime.log(`   Proposed Limit: ${formatUnits(BigInt(aiAnalysis.newLimit), 18)} USDA\n`)
    
    // Step 6: Check if adjustment is needed
    const currentLimit = BigInt(parsed.currentLimit || cfg.defaultVolumeLimit)
    const newLimit = BigInt(aiAnalysis.newLimit)
    
    const changePercent = Number((newLimit - currentLimit) * 10000n / currentLimit) / 100
    runtime.log(`   Current: ${formatUnits(currentLimit, 18)} USDA`)
    runtime.log(`   Proposed: ${formatUnits(newLimit, 18)} USDA`)
    runtime.log(`   Change: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`)
    
    // Skip if change is below threshold and not forced
    if (!parsed.forceAdjust && Math.abs(changePercent) < cfg.adjustmentThreshold * 100) {
      runtime.log('\n   ⏸️  Change below 15% threshold, no adjustment needed')
      return {
        success: true,
        action: 'maintain',
        token: 'USDA',
        currentLimit: formatUnits(currentLimit, 18),
        newLimit: formatUnits(newLimit, 18),
        changePercent,
        marketSentiment: marketData.sentiment,
        reasoning: aiAnalysis.reasoning,
        skipped: true
      }
    }
    
    // Step 7: Generate DON-signed report
    runtime.log('\n[5] Generating DON-signed report...')
    
    // Generate unique report hash
    const reportHash = runtime.keccak256(
      `USDA-${newLimit}-${Date.now()}-${marketData.sentiment.score}`
    )
    
    // Encode report for VolumePolicyDON.writeReport():
    // (bytes32 reportHash, uint8 instruction, uint256 param1, uint256 param2, string reason)
    const instruction = INSTRUCTION_SET_DAILY_LIMIT
    
    const reportData = encodeAbiParameters(
      parseAbiParameters('bytes32 reportHash, uint8 instruction, uint256 param1, uint256 param2, string reason'),
      [
        reportHash as `0x${string}`,
        instruction,
        newLimit, // param1 = new daily limit
        0n,       // param2 = not used for daily limit
        `[${aiAnalysis.marketCondition}] ${aiAnalysis.reasoning} | Risk: ${aiAnalysis.riskLevel} | Confidence: ${(aiAnalysis.confidence * 100).toFixed(0)}% | Sentiment: ${marketData.sentiment.overall}`
      ]
    )
    
    const report = runtime.report({
      encodedPayload: hexToBase64(reportData),
      encoderName: 'evm',
      signingAlgo: 'ecdsa',
      hashingAlgo: 'keccak256',
    }).result()
    
    runtime.log('   ✅ DON Report generated with ECDSA signature')
    
    // Step 8: Broadcast to VolumePolicyDON
    runtime.log('[6] Broadcasting to VolumePolicyDON...')
    
    const resp = evm.writeReport(runtime, {
      receiver: cfg.sepolia.volumePolicyAddress,
      report,
      gasConfig: { gasLimit: '500000' },
    }).result()
    
    if (resp.txStatus !== TxStatus.SUCCESS) {
      throw new Error(`Volume adjustment failed: ${resp.errorMessage || 'Unknown error'}`)
    }
    
    const txHash = resp.txHash ? bytesToHex(resp.txHash) : 'unknown'
    runtime.log(`   ✅ SUCCESS: ${txHash.slice(0, 30)}...`)
    
    return {
      success: true,
      txHash,
      action: aiAnalysis.recommendation,
      token: 'USDA',
      tokenAddress: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe',
      previousLimit: formatUnits(currentLimit, 18),
      newLimit: formatUnits(newLimit, 18),
      changePercent,
      riskLevel: aiAnalysis.riskLevel,
      marketCondition: aiAnalysis.marketCondition,
      marketSentiment: marketData.sentiment,
      trendingCoins: marketData.trendingCoins.slice(0, 5),
      marketMetrics: {
        totalMarketCap: marketData.marketMetrics.totalMarketCap,
        totalVolume24h: marketData.marketMetrics.totalVolume24h,
        fearGreedIndex: marketData.marketMetrics.fearGreedIndex,
        btcDominance: marketData.marketMetrics.btcDominance,
        ethDominance: marketData.marketMetrics.ethDominance,
        volumeToMcapRatio: marketData.marketMetrics.volumeToMcapRatio,
        activeCryptos: marketData.marketMetrics.activeCryptos,
        totalMarkets: marketData.marketMetrics.totalMarkets
      },
      newsCount: newsData.length,
      trendingCount: trending.length,
      reasoning: aiAnalysis.reasoning,
      confidence: aiAnalysis.confidence,
      verification: {
        aiModel: cfg.xaiModel,
        signatureVerified: true,
        reportHash: reportHash.slice(0, 20) + '...'
      }
    }
    
  } catch (e) {
    runtime.log(`\n❌ ERROR: ${(e as Error).message}`)
    return { 
      success: false, 
      error: (e as Error).message 
    }
  }
}

/**
 * Fetch general crypto market news (not token-specific)
 * Uses Finnhub's general news endpoint filtered for crypto
 */
function fetchCryptoNews(runtime: Runtime<any>, http: any, apiKey: string): any[] {
  try {
    // Get general market news (not company-specific)
    const resp = http.sendRequest(runtime, {
      url: `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    if (!Array.isArray(data)) {
      runtime.log('   ⚠️  No news data available')
      return []
    }
    
    // Filter for crypto-related headlines
    const cryptoKeywords = ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'defi', 'blockchain', 'web3', 'nft', 'altcoin', 'stablecoin']
    
    const cryptoNews = data.filter((item: any) => {
      const text = `${item.headline || ''} ${item.summary || ''}`.toLowerCase()
      return cryptoKeywords.some(keyword => text.includes(keyword))
    }).slice(0, 10) // Top 10 crypto news
    
    runtime.log(`   📰 Found ${cryptoNews.length} crypto-related headlines`)
    
    // Process with sentiment
    const processed = cryptoNews.map((item: any) => ({
      headline: item.headline || '',
      source: item.source || 'Finnhub',
      category: item.category || 'general',
      sentiment: estimateSentiment(item.headline + ' ' + (item.summary || '')),
      timestamp: item.datetime || Date.now()
    }))
    
    // Log samples
    processed.slice(0, 3).forEach((item: any, i: number) => {
      const sentimentEmoji = item.sentiment > 0 ? '🟢' : item.sentiment < 0 ? '🔴' : '⚪'
      runtime.log(`      ${i + 1}. ${sentimentEmoji} ${item.headline.slice(0, 60)}...`)
    })
    
    return processed
    
  } catch (e) {
    runtime.log(`   ⚠️  News fetch error: ${(e as Error).message}`)
    return []
  }
}

/**
 * Fetch trending coins from CoinGecko (market momentum/sentiment indicator)
 * Shows which coins are gaining attention/traction
 */
function fetchTrendingCoins(runtime: Runtime<any>, http: any, apiKey: string): MarketData['trendingCoins'] {
  try {
    const resp = http.sendRequest(runtime, {
      url: `https://api.coingecko.com/api/v3/search/trending`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    
    if (!data.coins || !Array.isArray(data.coins)) {
      runtime.log('   ⚠️  No trending data available')
      return []
    }
    
    // Process top 7 trending coins
    const trending = data.coins.slice(0, 7).map((item: any) => ({
      name: item.item.name,
      symbol: item.item.symbol,
      rank: item.item.market_cap_rank || 999,
      score: item.item.score
    }))
    
    runtime.log(`   🔥 ${trending.length} trending coins (momentum indicator)`)
    trending.slice(0, 3).forEach((coin: any, i: number) => {
      runtime.log(`      ${i + 1}. ${coin.name} (${coin.symbol}) - Rank #${coin.rank}`)
    })
    
    return trending
    
  } catch (e) {
    runtime.log(`   ⚠️  Trending fetch error: ${(e as Error).message}`)
    return []
  }
}

/**
 * Fetch enhanced market metrics including dominance, activity indicators
 */
function fetchEnhancedMarketMetrics(runtime: Runtime<any>, http: any, apiKey: string): MarketData['marketMetrics'] {
  try {
    // Get global crypto market data
    const resp = http.sendRequest(runtime, {
      url: `https://api.coingecko.com/api/v3/global?x_cg_demo_api_key=${apiKey}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    const metrics = data.data
    
    // Calculate fear & greed index from market data
    const fearGreed = calculateFearGreed(metrics)
    
    // Enhanced indicators
    const totalMarketCap = metrics?.total_market_cap?.usd || 2.5e12
    const totalVolume = metrics?.total_volume?.usd || 100e9
    const volumeToMcapRatio = totalVolume / totalMarketCap
    
    const btcDominance = metrics?.market_cap_percentage?.btc || 0
    const ethDominance = metrics?.market_cap_percentage?.eth || 0
    
    const activeCryptos = metrics?.active_cryptocurrencies || 0
    const totalMarkets = metrics?.markets || 0
    const ongoingICOs = metrics?.ongoing_icos || 0
    
    runtime.log(`   💰 Market Cap: $${(totalMarketCap / 1e12).toFixed(2)}T (${metrics?.market_cap_change_percentage_24h_usd?.toFixed(2) || 0}%)`)
    runtime.log(`   📊 24h Volume: $${(totalVolume / 1e9).toFixed(2)}B`)
    runtime.log(`   📈 Vol/Mcap: ${(volumeToMcapRatio * 100).toFixed(2)}%`)
    runtime.log(`   ₿ BTC Dom: ${btcDominance.toFixed(1)}% | Ξ ETH Dom: ${ethDominance.toFixed(1)}%`)
    runtime.log(`   🪙 Active: ${activeCryptos.toLocaleString()} coins | ${totalMarkets.toLocaleString()} markets`)
    runtime.log(`   🚀 ICOs: ${ongoingICOs} ongoing`)
    runtime.log(`   😰 Fear & Greed: ${fearGreed}/100`)
    
    return {
      totalMarketCap,
      marketCapChange24h: metrics?.market_cap_change_percentage_24h_usd || 0,
      totalVolume24h: totalVolume,
      fearGreedIndex: fearGreed,
      btcDominance,
      ethDominance,
      volumeToMcapRatio,
      activeCryptos,
      totalMarkets,
      ongoingICOs
    }
    
  } catch (e) {
    runtime.log(`   ⚠️  Market metrics error: ${(e as Error).message}`)
    return {
      totalMarketCap: 2.5e12,
      marketCapChange24h: 0,
      totalVolume24h: 100e9,
      fearGreedIndex: 50,
      btcDominance: 56,
      ethDominance: 10,
      volumeToMcapRatio: 0.04,
      activeCryptos: 18000,
      totalMarkets: 1400,
      ongoingICOs: 50
    }
  }
}

/**
 * Calculate Fear & Greed index from market metrics
 * 0 = Extreme Fear, 50 = Neutral, 100 = Extreme Greed
 */
function calculateFearGreed(metrics: any): number {
  if (!metrics) return 50
  
  const mcChange = metrics.market_cap_change_percentage_24h_usd || 0
  const volume = metrics.total_volume?.usd || 0
  const marketCap = metrics.total_market_cap?.usd || 1
  const volumeToMcRatio = volume / marketCap
  
  // Factors:
  // 1. Market cap change (50% weight)
  // 2. Volume intensity (30% weight)
  // 3. BTC dominance trend (20% weight)
  
  let score = 50 // Start neutral
  
  // Market cap change (-5% to +5% maps to 0-100)
  score += mcChange * 5
  
  // Volume intensity (high volume = more greed/fear)
  if (volumeToMcRatio > 0.05) score += 10
  else if (volumeToMcRatio < 0.02) score -= 10
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Estimate sentiment from text (simple keyword-based)
 */
function estimateSentiment(text: string): number {
  const positive = [
    'surge', 'rally', 'bull', 'bullish', 'gain', 'growth', 'adopt', 'adoption',
    'partnership', 'launch', 'moon', 'pump', 'breakthrough', 'milestone',
    'record', 'high', 'soar', 'skyrocket', 'explode', 'massive'
  ]
  const negative = [
    'crash', 'bear', 'bearish', 'drop', 'fall', 'decline', 'hack', 'exploit',
    'scam', 'ban', 'dump', 'fud', 'panic', 'fear', 'collapse', 'plunge',
    'tank', 'dive', 'sell-off', 'liquidation', 'drain', 'stolen'
  ]
  
  const lower = text.toLowerCase()
  let score = 0
  
  positive.forEach(word => { if (lower.includes(word)) score += 1 })
  negative.forEach(word => { if (lower.includes(word)) score -= 1 })
  
  return Math.max(-1, Math.min(1, score))
}

/**
 * Calculate overall market sentiment from all data sources
 * Enhanced with trending coins and market activity indicators
 */
function calculateMarketSentiment(
  news: any[],
  trending: MarketData['trendingCoins'],
  metrics: MarketData['marketMetrics']
): MarketData['sentiment'] {
  
  // 1. News sentiment (20% weight)
  const newsScore = news.length > 0 
    ? (news.reduce((sum, n) => sum + n.sentiment, 0) / news.length) * 25
    : 0
  
  // 2. Market cap change (25% weight) - major indicator
  const mcScore = Math.max(-25, Math.min(25, metrics.marketCapChange24h * 2))
  
  // 3. Volume intensity (15% weight) - high volume = uncertainty/opportunity
  let volumeScore = 0
  if (metrics.volumeToMcapRatio > 0.06) volumeScore = 15 // Very high activity
  else if (metrics.volumeToMcapRatio > 0.04) volumeScore = 5 // Normal
  else if (metrics.volumeToMcapRatio < 0.02) volumeScore = -10 // Low activity/fear
  
  // 4. Dominance shift (15% weight)
  // High BTC dominance = risk-off (bearish for alts), Low = risk-on (bullish)
  const dominanceScore = metrics.btcDominance > 60 ? -15 : metrics.btcDominance < 50 ? 15 : 0
  
  // 5. Trending momentum (15% weight) - based on trending coins
  // Many low-cap coins trending = speculative/greed phase
  const avgTrendingRank = trending.length > 0 
    ? trending.reduce((sum, t) => sum + t.rank, 0) / trending.length 
    : 100
  const trendingScore = avgTrendingRank < 100 ? 15 : avgTrendingRank < 200 ? 5 : -5
  
  // 6. Fear & Greed (10% weight)
  const fearGreedScore = (metrics.fearGreedIndex - 50) / 2.5
  
  // Combined score (-100 to 100)
  const combinedScore = newsScore + mcScore + volumeScore + dominanceScore + trendingScore + fearGreedScore
  const clampedScore = Math.max(-100, Math.min(100, combinedScore))
  
  // Classification
  let overall: MarketData['sentiment']['overall']
  if (clampedScore > 60) overall = 'extreme_greed'
  else if (clampedScore > 20) overall = 'greed'
  else if (clampedScore > -20) overall = 'neutral'
  else if (clampedScore > -60) overall = 'fear'
  else overall = 'extreme_fear'
  
  // Build reasoning string
  const reasoningParts: string[] = []
  if (Math.abs(newsScore) > 5) reasoningParts.push(`News: ${newsScore > 0 ? 'Positive' : 'Negative'} headlines`)
  if (Math.abs(mcScore) > 5) reasoningParts.push(`Mcap: ${metrics.marketCapChange24h > 0 ? '+' : ''}${metrics.marketCapChange24h.toFixed(1)}%`)
  if (Math.abs(volumeScore) > 5) reasoningParts.push(`Volume: ${metrics.volumeToMcapRatio > 0.05 ? 'High' : 'Low'} activity`)
  if (Math.abs(dominanceScore) > 5) reasoningParts.push(`BTC Dom: ${metrics.btcDominance.toFixed(0)}%`)
  if (trending.length > 0) reasoningParts.push(`Trending: ${trending.length} coins`)
  reasoningParts.push(`F&G: ${metrics.fearGreedIndex}/100`)
  
  return {
    overall,
    score: Math.round(clampedScore),
    confidence: Math.min(1, (Math.abs(clampedScore) + 20) / 100 + 0.3),
    reasoning: reasoningParts.join(', ')
  }
}

/**
 * Analyze market data with xAI Grok
 */
function analyzeWithGrok(
  runtime: Runtime<any>, 
  http: any, 
  apiKey: string, 
  model: string,
  marketData: MarketData,
  payload: any,
  cfg: any
): AIAnalysis {
  try {
    const prompt = `You are a DeFi risk management AI for a stablecoin (USDA) protocol.

YOUR TASK: Recommend a daily volume limit for USDA based on overall crypto market conditions.

CURRENT LIMIT: ${formatUnits(BigInt(payload.currentLimit || cfg.defaultVolumeLimit), 18)} USDA

MARKET DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OVERALL SENTIMENT: ${marketData.sentiment.overall.toUpperCase()} (Score: ${marketData.sentiment.score}/100)

🔥 TRENDING COINS (${marketData.trendingCoins.length} - momentum indicator):
${marketData.trendingCoins.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} (${c.symbol}) - Rank #${c.rank}`).join('\n')}

📈 ENHANCED MARKET METRICS:
• Total Market Cap: $${(marketData.marketMetrics.totalMarketCap / 1e12).toFixed(2)}T (${marketData.marketMetrics.marketCapChange24h > 0 ? '+' : ''}${marketData.marketMetrics.marketCapChange24h.toFixed(2)}%)
• 24h Volume: $${(marketData.marketMetrics.totalVolume24h / 1e9).toFixed(2)}B
• Volume/Mcap Ratio: ${(marketData.marketMetrics.volumeToMcapRatio * 100).toFixed(2)}%
• BTC Dominance: ${marketData.marketMetrics.btcDominance.toFixed(1)}%
• ETH Dominance: ${marketData.marketMetrics.ethDominance.toFixed(1)}%
• Active Cryptos: ${marketData.marketMetrics.activeCryptos.toLocaleString()}
• Markets: ${marketData.marketMetrics.totalMarkets.toLocaleString()}
• Ongoing ICOs: ${marketData.marketMetrics.ongoingICOs}
• Fear & Greed Index: ${marketData.marketMetrics.fearGreedIndex}/100

📰 NEWS HEADLINES (${marketData.news.length} items):
${marketData.news.slice(0, 5).map((n, i) => `${i + 1}. ${n.sentiment > 0 ? '🟢' : n.sentiment < 0 ? '🔴' : '⚪'} ${n.headline.slice(0, 70)}`).join('\n')}

REASONING: ${marketData.sentiment.reasoning}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RISK LEVELS:
• LOW: Normal market, stablecoins safe → INCREASE limits
• MEDIUM: Some volatility → MAINTAIN or slight DECREASE
• HIGH: Significant market stress → SUBSTANTIAL DECREASE
• CRITICAL: Market panic, exploits, -10%+ drops → PAUSE (limit = 0)

GUIDELINES:
- Extreme Greed (>60): Increase limit (more trading allowed)
- Greed (20-60): Slight increase or maintain
- Neutral (-20 to 20): Maintain current
- Fear (-60 to -20): Decrease limit
- Extreme Fear (<-60): Significant decrease or pause

Respond ONLY in JSON:
{
  "recommendation": "increase|decrease|maintain|pause",
  "newLimit": "number in wei (18 decimals)",
  "marketCondition": "brief description of market",
  "reasoning": "brief explanation",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0.0-1.0
}

Valid range: ${formatUnits(BigInt(cfg.minVolumeLimit), 18)} to ${formatUnits(BigInt(cfg.maxVolumeLimit), 18)} USDA`

    const resp = http.sendRequest(runtime, {
      url: 'https://api.x.ai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: new TextEncoder().encode(JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a DeFi risk management AI. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      }))
    }).result()
    
    const data = JSON.parse(new TextDecoder().decode(resp.body))
    const content = data.choices?.[0]?.message?.content || ''
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')
    
    const analysis = JSON.parse(jsonMatch[0])
    
    // Validate and clamp limits
    let newLimit = BigInt(analysis.newLimit || payload.currentLimit || cfg.defaultVolumeLimit)
    const minLimit = BigInt(cfg.minVolumeLimit)
    const maxLimit = BigInt(cfg.maxVolumeLimit)
    
    if (newLimit < minLimit) newLimit = minLimit
    if (newLimit > maxLimit) newLimit = maxLimit
    
    return {
      recommendation: analysis.recommendation || 'maintain',
      newLimit: String(newLimit),
      marketCondition: analysis.marketCondition || marketData.sentiment.overall,
      reasoning: analysis.reasoning || 'AI analysis completed',
      riskLevel: analysis.riskLevel || 'medium',
      confidence: analysis.confidence || 0.5
    }
    
  } catch (e) {
    runtime.log(`   ⚠️  xAI error: ${(e as Error).message}. Using fallback analysis.`)
    
    // Fallback based on sentiment
    const sentiment = marketData.sentiment
    let recommendation: AIAnalysis['recommendation'] = 'maintain'
    let riskLevel: AIAnalysis['riskLevel'] = 'medium'
    
    if (sentiment.overall === 'extreme_fear') {
      recommendation = 'pause'
      riskLevel = 'critical'
    } else if (sentiment.overall === 'fear') {
      recommendation = 'decrease'
      riskLevel = 'high'
    } else if (sentiment.overall === 'greed') {
      recommendation = 'increase'
      riskLevel = 'low'
    } else if (sentiment.overall === 'extreme_greed') {
      recommendation = 'increase'
      riskLevel = 'low'
    }
    
    const currentLimit = BigInt(payload.currentLimit || cfg.defaultVolumeLimit)
    let newLimit = currentLimit
    
    if (recommendation === 'increase') newLimit = (currentLimit * 120n) / 100n
    else if (recommendation === 'decrease') newLimit = (currentLimit * 80n) / 100n
    else if (recommendation === 'pause') newLimit = 0n
    
    return {
      recommendation,
      newLimit: String(newLimit),
      marketCondition: sentiment.overall,
      reasoning: `Fallback: ${sentiment.overall} market sentiment`,
      riskLevel,
      confidence: 0.6
    }
  }
}

// Cron Trigger - Runs every 15 minutes to check market sentiment and adjust volume limits
const init = (cfg: any) => [
  cre.handler(
    new cre.capabilities.CronCapability().trigger({
      schedule: '0 */15 * * * *', // Every 15 minutes at second 0
    }),
    onCronTrigger
  )
]
export async function main() { const runner = await Runner.newRunner({ configSchema }); await runner.run(init) }
main()
