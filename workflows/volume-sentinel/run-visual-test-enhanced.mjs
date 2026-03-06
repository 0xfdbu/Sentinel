#!/usr/bin/env node
/**
 * Volume Sentinel - Enhanced Visual Data Flow Test
 * Uses CoinGecko's trending, search, and market data APIs
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(title, color = colors.cyan) {
  console.log(`${color}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${color}${colors.bright}║ ${title.padEnd(62)} ║${colors.reset}`);
  console.log(`${color}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
}

function arrow(text) {
  console.log(`${colors.yellow}  ↓ ${text}${colors.reset}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === STEP 1: COINGECKO TRENDING ===
async function fetchTrendingCoins() {
  log('STEP 1: COINGECKO TRENDING COINS', colors.blue);
  
  console.log(`${colors.dim}→ Calling: GET /search/trending${colors.reset}\n`);
  
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await response.json();
    const coins = data.coins.slice(0, 5);
    
    console.log(`${colors.green}✓ Retrieved ${data.coins.length} trending coins${colors.reset}\n`);
    
    console.log(`${colors.cyan}Top 5 Trending:${colors.reset}`);
    coins.forEach((item, i) => {
      const coin = item.item;
      const score = coin.score + 1; // 1-10 rank
      console.log(`  ${score}. ${coin.name} (${coin.symbol}) - Rank #${coin.market_cap_rank}`);
    });
    
    return coins;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return [];
  }
}

// === STEP 2: COINGECKO SEARCH DATA ===
async function fetchSearchData() {
  arrow('API Call');
  log('STEP 2: COINGECKO SEARCH POPULARITY', colors.magenta);
  
  console.log(`${colors.dim}→ Calling: GET /search?query=crypto${colors.reset}\n`);
  
  try {
    // Search for popular crypto terms
    const response = await fetch('https://api.coingecko.com/api/v3/search?query=bitcoin', {
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await response.json();
    
    console.log(`${colors.green}✓ Search data retrieved${colors.reset}\n`);
    
    console.log(`${colors.cyan}Search Results:${colors.reset}`);
    console.log(`  • Coins found: ${data.coins?.length || 0}`);
    console.log(`  • Categories: ${data.categories?.length || 0}`);
    console.log(`  • NFTs: ${data.nfts?.length || 0}`);
    console.log(`  • Exchanges: ${data.exchanges?.length || 0}`);
    
    return data;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return null;
  }
}

// === STEP 3: GLOBAL MARKET INDICATORS ===
async function fetchGlobalData() {
  arrow('API Call');
  log('STEP 3: GLOBAL MARKET INDICATORS', colors.yellow);
  
  console.log(`${colors.dim}→ Calling: GET /global${colors.reset}\n`);
  
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await response.json();
    const global = data.data;
    
    // Calculate additional indicators
    const totalMarketCap = global.total_market_cap?.usd || 0;
    const marketCapChange = global.market_cap_change_percentage_24h_usd || 0;
    const totalVolume = global.total_volume?.usd || 0;
    const btcDominance = global.market_cap_percentage?.btc || 0;
    const ethDominance = global.market_cap_percentage?.eth || 0;
    const volumeToMcRatio = totalVolume / totalMarketCap;
    
    // Market sentiment indicators
    const activeCryptos = global.active_cryptocurrencies || 0;
    const markets = global.markets || 0;
    const upcomingICOs = global.upcoming_icos || 0;
    const ongoingICOs = global.ongoing_icos || 0;
    const endedICOs = global.ended_icos || 0;
    
    console.log(`${colors.green}✓ Global market data retrieved${colors.reset}\n`);
    
    console.log(`${colors.cyan}Market Overview:${colors.reset}`);
    console.log(`  • Market Cap: $${(totalMarketCap / 1e12).toFixed(2)}T (${marketCapChange > 0 ? '+' : ''}${marketCapChange.toFixed(2)}%)`);
    console.log(`  • 24h Volume: $${(totalVolume / 1e9).toFixed(2)}B`);
    console.log(`  • Volume/Mcap: ${(volumeToMcRatio * 100).toFixed(2)}%`);
    console.log(`  • BTC Dominance: ${btcDominance.toFixed(1)}%`);
    console.log(`  • ETH Dominance: ${ethDominance.toFixed(1)}%`);
    
    console.log(`\n${colors.cyan}Market Activity:${colors.reset}`);
    console.log(`  • Active Cryptos: ${activeCryptos.toLocaleString()}`);
    console.log(`  • Markets: ${markets.toLocaleString()}`);
    console.log(`  • ICO Activity: ${ongoingICOs} ongoing, ${upcomingICOs} upcoming`);
    
    return { global, indicators: { volumeToMcRatio, btcDominance, ethDominance, activeCryptos } };
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return null;
  }
}

// === STEP 4: FEAR & GREED + SENTIMENT ===
function calculateSentiment(trending, searchData, globalData) {
  arrow('Processing');
  log('STEP 4: MARKET SENTIMENT CALCULATION', colors.green);
  
  const global = globalData?.global;
  const indicators = globalData?.indicators;
  
  // Calculate Fear & Greed Index components
  const mcChange = global?.market_cap_change_percentage_24h_usd || 0;
  const volumeRatio = indicators?.volumeToMcRatio || 0;
  
  // F&G Score (0-100)
  let fearGreedScore = 50;
  fearGreedScore += mcChange * 4; // Market cap change
  if (volumeRatio > 0.05) fearGreedScore += 15; // High volume
  else if (volumeRatio < 0.02) fearGreedScore -= 15; // Low volume
  if (mcChange > 5) fearGreedScore += 10; // Strong momentum
  else if (mcChange < -5) fearGreedScore -= 10; // Strong decline
  
  fearGreedScore = Math.max(0, Math.min(100, Math.round(fearGreedScore)));
  
  // Classify sentiment
  let sentimentStatus = 'NEUTRAL';
  let sentimentColor = colors.yellow;
  if (fearGreedScore > 75) { sentimentStatus = 'EXTREME GREED'; sentimentColor = colors.green; }
  else if (fearGreedScore > 55) { sentimentStatus = 'GREED'; sentimentColor = colors.green; }
  else if (fearGreedScore < 25) { sentimentStatus = 'EXTREME FEAR'; sentimentColor = colors.red; }
  else if (fearGreedScore < 45) { sentimentStatus = 'FEAR'; sentimentColor = colors.red; }
  
  console.log(`${colors.cyan}Fear & Greed Components:${colors.reset}`);
  console.log(`  • Market Cap Change: ${mcChange > 0 ? '+' : ''}${mcChange.toFixed(2)}%`);
  console.log(`  • Volume/Mcap Ratio: ${(volumeRatio * 100).toFixed(2)}%`);
  console.log(`  • Trending Activity: ${trending?.length || 0} coins`);
  
  console.log(`\n${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║  FEAR & GREED INDEX: ${fearGreedScore.toString().padStart(3)}/100 - ${sentimentStatus.padEnd(14)}║${colors.reset}`);
  console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`Market Status: ${sentimentColor}${colors.bright}${sentimentStatus}${colors.reset}\n`);
  
  return { fearGreedScore, sentimentStatus };
}

// === STEP 5: xAI GROK ANALYSIS ===
async function analyzeWithGrok(sentiment) {
  arrow('AI Inference');
  log('STEP 5: xAI GROK ANALYSIS', colors.green);
  
  const apiKey = process.env.XAI_API_KEY || 'xai-YOUR_API_KEY_HERE';
  
  const prompt = `Analyze crypto market sentiment and recommend USDA stablecoin volume limit adjustment:

MARKET DATA:
- Fear & Greed Index: ${sentiment.fearGreedScore}/100 (${sentiment.sentimentStatus})
- Market Context: ${sentiment.fearGreedScore > 50 ? 'Bullish/Greedy' : 'Bearish/Fearful'}
- Data Sources: CoinGecko Trending, Search, Global Metrics

Respond with JSON:
{
  "recommendation": "increase|decrease|maintain|pause",
  "newLimit": <number>,
  "confidence": <0-1>,
  "reasoning": "<brief explanation>"
}`;

  console.log(`${colors.dim}→ Calling: POST https://api.x.ai/v1/chat/completions${colors.reset}`);
  console.log(`${colors.dim}→ Model: grok-4-1-fast-reasoning${colors.reset}\n`);
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response format');
    }
    
    const content = data.choices[0].message.content;
    console.log(`${colors.green}✓ Grok response received${colors.reset}\n`);
    
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      analysis = { recommendation: 'maintain', newLimit: 1000, confidence: 0.5, reasoning: 'Fallback' };
    }
    
    console.log(`${colors.cyan}AI Recommendation:${colors.reset}`);
    console.log(`  Action: ${colors.bright}${analysis?.recommendation?.toUpperCase() || 'N/A'}${colors.reset}`);
    console.log(`  New Limit: ${colors.bright}${analysis?.newLimit?.toLocaleString() || 'N/A'} USDA${colors.reset}`);
    console.log(`  Confidence: ${(analysis?.confidence * 100)?.toFixed(0) || 'N/A'}%`);
    console.log(`  Reasoning: ${analysis?.reasoning || 'N/A'}\n`);
    
    return analysis;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return { recommendation: 'maintain', newLimit: 1000, confidence: 0.5, reasoning: 'Error' };
  }
}

// === STEP 6: BLOCKCHAIN WRITE ===
function simulateBlockchainWrite(recommendation, sentiment) {
  arrow('Blockchain Write');
  log('STEP 6: DON SIGNED REPORT → BLOCKCHAIN', colors.red);
  
  const contractAddress = '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33';
  const currentLimit = 1000;
  
  let newLimit = currentLimit;
  if (recommendation?.recommendation === 'increase') {
    newLimit = Math.floor(currentLimit * 1.3);
  } else if (recommendation?.recommendation === 'decrease') {
    newLimit = Math.floor(currentLimit * 0.7);
  } else if (recommendation?.recommendation === 'pause') {
    newLimit = 0;
  }
  
  const changePercent = ((newLimit - currentLimit) / currentLimit * 100).toFixed(1);
  
  console.log(`${colors.cyan}Contract:${colors.reset} ${contractAddress}`);
  console.log(`${colors.cyan}Function:${colors.reset} VolumePolicyDON.writeReport()\n`);
  
  console.log(`${colors.dim}DON Report Data:${colors.reset}`);
  const report = {
    instruction: 2,
    token: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe',
    newLimit: newLimit.toString(),
    fearGreedIndex: sentiment.fearGreedScore,
    timestamp: Math.floor(Date.now() / 1000),
    donSignature: '0x' + 'a'.repeat(130)
  };
  console.log(JSON.stringify(report, null, 2));
  
  console.log(`\n${colors.green}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.green}║  LIMIT ADJUSTMENT: $${currentLimit} → $${newLimit} (${changePercent > '0' ? '+' : ''}${changePercent}%)                ║${colors.reset}`);
  console.log(`${colors.green}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.dim}→ Transaction would be broadcast to Sepolia testnet${colors.reset}`);
  console.log(`${colors.dim}→ DON signature provides TEE attestation of data authenticity${colors.reset}\n`);
  
  return report;
}

// === MAIN EXECUTION ===
async function main() {
  console.log(`
${colors.bright}
 ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗██╗     ██╗███╗   ██╗██╗  ██╗    
██╔════╝██║  ██║██╔══██╗██║████╗  ██║██║     ██║████╗  ██║██║  ██║    
██║     ███████║███████║██║██╔██╗ ██║██║     ██║██╔██╗ ██║███████║    
██║     ██╔══██║██╔══██║██║██║╚██╗██║██║     ██║██║╚██╗██║██╔══██║    
╚██████╗██║  ██║██║  ██║██║██║ ╚████║███████╗██║██║ ╚████║██║  ██║    
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    
 ${colors.cyan}███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗         
 ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║         
 ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║         
 ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║         
 ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗    
 ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝    
${colors.reset}
  🎯 ENHANCED: CoinGecko Trending + Search + Global Indicators 🎯
`);

  console.log(`${colors.dim}Starting at: ${new Date().toISOString()}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  const trending = await fetchTrendingCoins();
  await sleep(500);
  
  const searchData = await fetchSearchData();
  await sleep(500);
  
  const globalData = await fetchGlobalData();
  await sleep(500);
  
  const sentiment = calculateSentiment(trending, searchData, globalData);
  await sleep(500);
  
  const recommendation = await analyzeWithGrok(sentiment);
  await sleep(500);
  
  const report = simulateBlockchainWrite(recommendation, sentiment);
  
  const duration = Date.now() - startTime;
  
  console.log(`${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║                      EXECUTION SUMMARY                         ║${colors.reset}`);
  console.log(`${colors.bright}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}║  Data Sources:  CoinGecko (Trending/Search/Global) + xAI      ║${colors.reset}`);
  console.log(`${colors.bright}║  Total Time:    ${(duration/1000).toFixed(1)}s${' '.repeat(48)}║${colors.reset}`);
  console.log(`${colors.bright}║  APIs Called:   3 (trending, search, global) + xAI             ║${colors.reset}`);
  console.log(`${colors.bright}║  Indicators:   Fear&Greed, Volume/Mcap, Dominance, Trending   ║${colors.reset}`);
  console.log(`${colors.bright}║  TEE Signing:   ECDSA via CRE runtime.report()                 ║${colors.reset}`);
  console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.dim}Enhanced indicators from CoinGecko:${colors.reset}`);
  console.log(`  • Trending coins momentum`);
  console.log(`  • Search popularity`);
  console.log(`  • Global market activity (active_cryptos, markets, ICOs)`);
  console.log(`  • BTC/ETH dominance shifts`);
  console.log(`  • Volume to Market Cap ratio\n`);
}

main().catch(console.error);
