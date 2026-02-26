#!/usr/bin/env node
/**
 * ACE Policy Engine Unit Tests
 * 
 * Tests the ACE policy service without running full CRE workflow
 */

import { acePolicyService, PolicyResult } from '../src/services/ace-policy.service';

interface TestCase {
  name: string;
  context: Parameters<typeof acePolicyService.evaluatePolicies>[0];
  expected: {
    passed: boolean;
    minRiskScore: number;
    maxRiskScore: number;
    action: PolicyResult['recommendedAction'];
  };
}

const testCases: TestCase[] = [
  {
    name: 'Clean transaction',
    context: {
      from: '0x6346061C15fA564dC5BBb79539482E8d2682Fa85',
      to: '0x22650892Ce8db57fCDB48AE8b3508F52420A727A',
      value: BigInt('10000000000000'), // 0.00001 ETH (below threshold)
      data: '0x',
      threats: [],
    },
    expected: {
      passed: true,
      minRiskScore: 0,
      maxRiskScore: 10,
      action: 'ALLOW',
    },
  },
  {
    name: 'Blacklisted sender',
    context: {
      from: '0xBadActor0000000000000000000000000000000000',
      to: '0x22650892Ce8db57fCDB48AE8b3508F52420A727A',
      value: BigInt('1000000000000000'),
      data: '0x',
      threats: [{
        level: 'CRITICAL',
        details: 'Blacklisted sender',
      }],
    },
    expected: {
      passed: false,
      minRiskScore: 40,
      maxRiskScore: 100,
      action: 'PAUSE_IMMEDIATELY',
    },
  },
  {
    name: 'High value transaction',
    context: {
      from: '0x6346061C15fA564dC5BBb79539482E8d2682Fa85',
      to: '0x22650892Ce8db57fCDB48AE8b3508F52420A727A',
      value: BigInt('2500000000000000000'), // 2.5 ETH
      data: '0x',
      threats: [{
        level: 'HIGH',
        details: 'Large value transfer',
      }],
    },
    expected: {
      passed: false,
      minRiskScore: 30,
      maxRiskScore: 100,
      action: 'PAUSE',
    },
  },
  {
    name: 'Critical threat detected',
    context: {
      from: '0x6346061C15fA564dC5BBb79539482E8d2682Fa85',
      to: '0x997E47e8169b1A9112F9Bc746De6b2b74c3B5AE1',
      value: BigInt('10000000000000000'), // 0.01 ETH
      data: '0x64dd891a',
      threats: [{
        level: 'CRITICAL',
        details: 'Attack function detected',
      }],
    },
    expected: {
      passed: false,
      minRiskScore: 40,
      maxRiskScore: 100,
      action: 'PAUSE_IMMEDIATELY',
    },
  },
  {
    name: 'Medium risk - allow (no violations)',
    context: {
      from: '0x6346061C15fA564dC5BBb79539482E8d2682Fa85',
      to: '0x22650892Ce8db57fCDB48AE8b3508F52420A727A',
      value: BigInt('10000000000000'), // 0.00001 ETH (low value)
      data: '0x',
      threats: [{
        level: 'MEDIUM',
        details: 'Suspicious activity',
      }],
    },
    expected: {
      passed: true,
      minRiskScore: 0,
      maxRiskScore: 20,
      action: 'ALLOW',
    },
  },
];

async function runTests() {
  console.log('🛡️  ACE Policy Engine Unit Tests');
  console.log('=================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`🧪 ${testCase.name}`);
    
    const result = acePolicyService.evaluatePolicies(testCase.context);
    
    // Check results
    const checks = [
      {
        name: 'Passed',
        expected: testCase.expected.passed,
        actual: result.passed,
      },
      {
        name: 'Risk Score Range',
        expected: `${testCase.expected.minRiskScore}-${testCase.expected.maxRiskScore}`,
        actual: result.riskScore,
        check: result.riskScore >= testCase.expected.minRiskScore && 
               result.riskScore <= testCase.expected.maxRiskScore,
      },
      {
        name: 'Recommended Action',
        expected: testCase.expected.action,
        actual: result.recommendedAction,
      },
    ];
    
    let testPassed = true;
    for (const check of checks) {
      const checkPassed = check.check !== undefined ? check.check : check.expected === check.actual;
      const icon = checkPassed ? '✅' : '❌';
      console.log(`   ${icon} ${check.name}: Expected ${check.expected}, Got ${check.actual}`);
      if (!checkPassed) testPassed = false;
    }
    
    // Print violations if any
    if (result.violations.length > 0) {
      console.log(`   📋 Violations:`);
      result.violations.forEach(v => {
        console.log(`      • ${v.rule} (${v.severity})`);
      });
    }
    
    if (testPassed) {
      passed++;
      console.log('   ✅ TEST PASSED\n');
    } else {
      failed++;
      console.log('   ❌ TEST FAILED\n');
    }
  }
  
  // Print summary
  console.log('='.repeat(50));
  console.log(`📊 Summary: ${passed} passed, ${failed} failed, ${testCases.length} total`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  return failed === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
