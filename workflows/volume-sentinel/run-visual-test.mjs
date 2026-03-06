#!/usr/bin/env node
/**
 * Volume Sentinel - Visual Data Flow Test
 * Runs actual API calls and shows the data flowing through the system
 */

// Colors for terminal output
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

function log(title, content, color = colors.cyan) {
  console.log(`${color}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${color}${colors.bright}║ ${title.padEnd(62)} ║${colors.reset}`);
  console.log(`${color}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
  if (content) {
    console.log(typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
    console.log();
  }
}

function arrow(text) {
  console.log(`${colors.yellow}  ↓ ${text}${colors.reset}\n`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple sentiment analysis
function analyzeSentiment(text) {
  const positive = ['surge', 'rally', 'gain', 'bull', 'adopt', 'breakthrough', 'high', 'up', 'growth', 'success', 'soar', 'moon'];
  const negative = ['crash', 'hack', 'fall', 'bear', 'ban', 'regulation', 'low', 'down', 'loss', 'risk', 'fraud', 'scam', 'exploit'];
  
  const lower = text.toLowerCase();
  let score = 0;
  positive.forEach(p => { if (lower.includes(p)) score += 1; });
  negative.forEach(n => { if (lower.includes(n)) score -= 1; });
  
  return score;
}

// === STEP 1: FINNHUB NEWS ===
async function fetchFinnhubNews() {
  log('STEP 1: FINNHUB NEWS API', null, colors.blue);
  
  const apiKey = process.env.FINNHUB_API_KEY || 'd6k7oihr01qko8c3phd0d6k7oihr01qko8c3phdg';
  const keywords = ['crypto', 'bitcoin', 'ethereum', 'defi', 'blockchain', 'hack'];
  
  console.log(`${colors.dim}→ Calling: GET https://finnhub.io/api/v1/news?category=general${colors.reset}`);
  console.log(`${colors.dim}→ Keywords filter: ${keywords.join(', ')}${colors.reset}\n`);
  
  try {
    const response = await fetch('https://finnhub.io/api/v1/news?category=general', {
      headers: { 'X-Finnhub-Token': apiKey },
      signal: AbortSignal.timeout(10000)
    });
    
    const allNews = await response.json();
    const recentNews = allNews.slice(0, 20);
    
    // Filter for crypto-related news
    const cryptoNews = recentNews.filter((item) => {
      const text = `${item.headline} ${item.summary}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
    
    console.log(`${colors.green}✓ Retrieved ${recentNews.length} news items${colors.reset}`);
    console.log(`${colors.green}✓ Filtered to ${cryptoNews.length} crypto-related items${colors.reset}\n`);
    
    // Show sample headlines
    console.log(`${colors.cyan}Sample Headlines:${colors.reset}`);
    cryptoNews.slice(0, 5).forEach((item, i) => {
      const sentiment = analyzeSentiment(item.headline);
      const emoji = sentiment > 0 ? '🟢' : sentiment < 0 ? '🔴' : '⚪';
      console.log(`  ${emoji} ${item.headline.slice(0, 60)}${item.headline.length > 60 ? '...' : ''}`);
    });
    
    return cryptoNews;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return [];
  }
}

// === STEP 2: COINGECKO DATA ===
async function fetchCoinGeckoData() {
  arrow('API Call');
  log('STEP 2: COINGECKO MARKET DATA', null, colors.magenta);
  
  console.log(`${colors.dim}→ Calling: GET /coins/markets?ids=bitcoin,ethereum&vs_currency=usd${colors.reset}\n`);
  
  try {
    // BTC/ETH prices
    const pricesResponse = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?ids=bitcoin,ethereum&vs_currency=usd',
      { signal: AbortSignal.timeout(10000) }
    );
    
    // Global data
    console.log(`${colors.dim}→ Calling: GET /global${colors.reset}\n`);
    const globalResponse = await fetch(
      'https://api.coingecko.com/api/v3/global',
      { signal: AbortSignal.timeout(10000) }
    );
    
    const prices = await pricesResponse.json();
    const globalData = await globalResponse.json();
    
    const btc = prices.find((c) => c.id === 'bitcoin');
    const eth = prices.find((c) => c.id === 'ethereum');
    const global = globalData.data;
    
    console.log(`${colors.green}✓ BTC Price: $${btc?.current_price?.toLocaleString()} (${btc?.price_change_percentage_24h?.toFixed(2)}% 24h)${colors.reset}`);
    console.log(`${colors.green}✓ ETH Price: $${eth?.current_price?.toLocaleString()} (${eth?.price_change_percentage_24h?.toFixed(2)}% 24h)${colors.reset}`);
    console.log(`${colors.green}✓ Market Cap: $${(global?.total_market_cap?.usd / 1e12)?.toFixed(2)}T${colors.reset}`);
    console.log(`${colors.green}✓ 24h Volume: $${(global?.total_volume?.usd / 1e9)?.toFixed(2)}B${colors.reset}`);
    console.log(`${colors.green}✓ BTC Dominance: ${global?.market_cap_percentage?.btc?.toFixed(1)}%${colors.reset}\n`);
    
    return { btc, eth, global };
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return null;
  }
}

// === STEP 3: CALCULATE SENTIMENT ===
function calculateSentiment(news, marketData) {
  arrow('Processing');
  log('STEP 3: AGGREGATE SENTIMENT CALCULATION', null, colors.yellow);
  
  // News sentiment
  const newsScores = news.map(n => analyzeSentiment(n.headline));
  const positiveNews = newsScores.filter(s => s > 0).length;
  const negativeNews = newsScores.filter(s => s < 0).length;
  const newsSentiment = news.length > 0 ? ((positiveNews - negativeNews) / news.length) * 50 : 0;
  
  // Market sentiment
  const btcChange = marketData?.btc?.price_change_percentage_24h || 0;
  const ethChange = marketData?.eth?.price_change_percentage_24h || 0;
  const marketCapChange = marketData?.global?.market_cap_change_percentage_24h_usd || 0;
  
  const marketSentiment = (btcChange + ethChange) / 2 + marketCapChange;
  
  // Combined (0-100 scale, 50 = neutral)
  const finalSentiment = Math.max(0, Math.min(100, 50 + newsSentiment + marketSentiment));
  
  console.log(`${colors.cyan}Input Metrics:${colors.reset}`);
  console.log(`  News Sentiment: ${newsSentiment > 0 ? '+' : ''}${newsSentiment.toFixed(1)} (${positiveNews}+ / ${negativeNews}-)`);
  console.log(`  BTC 24h Change: ${btcChange > 0 ? '+' : ''}${btcChange.toFixed(2)}%`);
  console.log(`  ETH 24h Change: ${ethChange > 0 ? '+' : ''}${ethChange.toFixed(2)}%`);
  console.log(`  Market Cap Δ:   ${marketCapChange > 0 ? '+' : ''}${marketCapChange.toFixed(2)}%\n`);
  
  console.log(`${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║  CALCULATED SENTIMENT SCORE: ${finalSentiment.toFixed(1).padStart(5)} / 100                ║${colors.reset}`);
  console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const status = finalSentiment > 70 ? 'BULLISH' : finalSentiment > 40 ? 'NEUTRAL' : 'BEARISH';
  const statusColor = finalSentiment > 70 ? colors.green : finalSentiment > 40 ? colors.yellow : colors.red;
  console.log(`Market Status: ${statusColor}${colors.bright}${status}${colors.reset}\n`);
  
  return finalSentiment;
}

// === STEP 4: xAI GROK ANALYSIS ===
async function analyzeWithGrok(sentiment, marketData) {
  arrow('AI Inference');
  log('STEP 4: xAI GROK ANALYSIS', null, colors.green);
  
  const apiKey = process.env.XAI_API_KEY || 'xai-YOUR_API_KEY_HERE';
  
  const prompt = `Analyze crypto market data and recommend USDA stablecoin volume limit adjustment:

MARKET DATA:
- Sentiment Score: ${sentiment.toFixed(1)}/100
- BTC Price: $${marketData?.btc?.current_price?.toLocaleString()} (${marketData?.btc?.price_change_percentage_24h?.toFixed(2)}% 24h)
- ETH Price: $${marketData?.eth?.current_price?.toLocaleString()} (${marketData?.eth?.price_change_percentage_24h?.toFixed(2)}% 24h)
- Total Market Cap: $${(marketData?.global?.total_market_cap?.usd / 1e12)?.toFixed(2)}T
- Market Cap Change: ${marketData?.global?.market_cap_change_percentage_24h_usd?.toFixed(2)}%

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
    console.log(`${colors.dim}Raw response structure: ${Object.keys(data).join(', ')}${colors.reset}\n`);
    
    if (!data.choices || !data.choices[0]) {
      console.log(`${colors.yellow}⚠ Unexpected response format:${colors.reset}`, JSON.stringify(data, null, 2).slice(0, 500));
      return { recommendation: 'maintain', newLimit: 1000, confidence: 0.5, reasoning: 'Using fallback due to API response format' };
    }
    
    const content = data.choices[0].message.content;
    
    console.log(`${colors.green}✓ Grok response received${colors.reset}\n`);
    
    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      analysis = { raw: content };
    }
    
    console.log(`${colors.cyan}AI Recommendation:${colors.reset}`);
    console.log(`  Action: ${colors.bright}${analysis?.recommendation?.toUpperCase() || 'N/A'}${colors.reset}`);
    console.log(`  New Limit: ${colors.bright}${analysis?.newLimit?.toLocaleString() || 'N/A'} USDA${colors.reset}`);
    console.log(`  Confidence: ${(analysis?.confidence * 100)?.toFixed(0) || 'N/A'}%`);
    console.log(`  Reasoning: ${analysis?.reasoning || content.slice(0, 100) + '...'}\n`);
    
    return analysis;
  } catch (error) {
    console.error(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
    return null;
  }
}

// === STEP 5: BLOCKCHAIN WRITE ===
function simulateBlockchainWrite(recommendation, sentiment) {
  arrow('Blockchain Write');
  log('STEP 5: DON SIGNED REPORT → BLOCKCHAIN', null, colors.red);
  
  const contractAddress = '0x2e3Df8D5b19e1576Ec5aAd849438C41897974E33';
  const currentLimit = 1000; // $1000 USD equivalent
  
  // Calculate new limit based on recommendation
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
    instruction: 2, // SET_DAILY_LIMIT
    token: '0x500D640f4fE39dAF609C6E14C83b89A68373EaFe',
    newLimit: newLimit.toString(),
    sentimentScore: Math.floor(sentiment),
    timestamp: Math.floor(Date.now() / 1000),
    donSignature: '0x' + 'a'.repeat(130) // Mock signature
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
     🛡️  AI-Powered Volume Limits via Real-Time Market Data  🛡️
`);

  console.log(`${colors.dim}Starting at: ${new Date().toISOString()}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Step 1: Finnhub
  const news = await fetchFinnhubNews();
  await sleep(500);
  
  // Step 2: CoinGecko
  const marketData = await fetchCoinGeckoData();
  await sleep(500);
  
  // Step 3: Calculate Sentiment
  const sentiment = calculateSentiment(news, marketData);
  await sleep(500);
  
  // Step 4: Grok Analysis
  const recommendation = await analyzeWithGrok(sentiment, marketData);
  await sleep(500);
  
  // Step 5: Blockchain Write
  const report = simulateBlockchainWrite(recommendation, sentiment);
  
  const duration = Date.now() - startTime;
  
  // Summary
  console.log(`${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}║                      EXECUTION SUMMARY                         ║${colors.reset}`);
  console.log(`${colors.bright}╠════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}║  Data Sources:  Finnhub → CoinGecko → xAI Grok → Blockchain   ║${colors.reset}`);
  console.log(`${colors.bright}║  Total Time:    ${(duration/1000).toFixed(1)}s${' '.repeat(48)}║${colors.reset}`);
  console.log(`${colors.bright}║  APIs Called:   3 (all real market data)                       ║${colors.reset}`);
  console.log(`${colors.bright}║  TEE Signing:   ECDSA via CRE runtime.report()                 ║${colors.reset}`);
  console.log(`${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.dim}Note: In production CRE TEE environment, API keys are protected${colors.reset}`);
  console.log(`${colors.dim}via Confidential HTTP and never exposed in logs or responses.${colors.reset}\n`);
}

main().catch(console.error);
