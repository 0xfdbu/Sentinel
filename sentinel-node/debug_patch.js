const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

// Add debug at start of checkBlock
content = content.replace(
  'private async checkBlock(blockNumber: number) {\n    console.log(`🔍 Checking block ${blockNumber}`);',
  `private async checkBlock(blockNumber: number) {
    console.log(\`🔍 Checking block \${blockNumber}\`);`
);

// Add debug for transactions found
content = content.replace(
  "for (const tx of block.prefetchedTransactions) {",
  `console.log(\`   Transactions in block: \${block.prefetchedTransactions?.length || 0}\`);
    for (const tx of block.prefetchedTransactions) {`
);

// Add debug for monitored contract check
content = content.replace(
  "const toAddress = tx.to?.toLowerCase();\n        if (!toAddress || !monitoredAddresses.has(toAddress)) continue;",
  `const toAddress = tx.to?.toLowerCase();
        console.log(\`   TX to: \${toAddress}, monitored: \${monitoredAddresses.has(toAddress)}\`);
        if (!toAddress || !monitoredAddresses.has(toAddress)) continue;`
);

fs.writeFileSync('src/index.ts', content);
console.log('Debug logging added');
