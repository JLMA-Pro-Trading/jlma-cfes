#!/usr/bin/env node

/**
 * JLMA-CFES CLI - Command Line Interface
 *
 * Usage:
 *   jlma-cfes validate <file>     Validate code file
 *   jlma-cfes benchmark           Run performance benchmark
 *   jlma-cfes metrics             Show current metrics
 *   jlma-cfes init                Initialize with claude-flow
 */

import { createEnhancer } from '../src/index.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VERSION = '3.0.0';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(`jlma-cfes v${VERSION}`);
    process.exit(0);
  }

  const enhancer = createEnhancer({
    claudeFlowIntegration: command === 'init'
  });

  await enhancer.initialize();

  switch (command) {
    case 'validate':
      await handleValidate(enhancer, args.slice(1));
      break;

    case 'benchmark':
      await handleBenchmark(enhancer, args.slice(1));
      break;

    case 'metrics':
      handleMetrics(enhancer);
      break;

    case 'init':
      await handleInit(enhancer);
      break;

    case 'check':
      await handleCheck(enhancer, args.slice(1));
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
JLMA-CFES v${VERSION} - Claude Flow Enhancement System

Usage: jlma-cfes <command> [options]

Commands:
  validate <file>    Validate a code file for security/performance issues
  benchmark          Run performance benchmark
  metrics            Show current performance metrics
  init               Initialize and connect to claude-flow
  check <code>       Quick inline code check

Options:
  --help, -h         Show this help message
  --version, -v      Show version number
  --strict           Enable strict mode (block on any violation)
  --json             Output results as JSON

Examples:
  jlma-cfes validate ./src/app.js
  jlma-cfes benchmark --iterations 200
  jlma-cfes check "const key = 'sk-abc123'"
  jlma-cfes init
`);
}

async function handleValidate(enhancer, args) {
  const filePath = args[0];
  const isJson = args.includes('--json');

  if (!filePath) {
    console.error('Error: Please provide a file path');
    console.log('Usage: jlma-cfes validate <file>');
    process.exit(1);
  }

  try {
    const fullPath = resolve(process.cwd(), filePath);
    const code = readFileSync(fullPath, 'utf-8');

    console.log(`\nValidating: ${filePath}`);
    console.log('─'.repeat(50));

    // Run pre-validation
    const preResult = await enhancer.validatePre(code);

    if (isJson) {
      console.log(JSON.stringify(preResult, null, 2));
      process.exit(preResult.passed ? 0 : 1);
    }

    console.log(`\nPre-Validation: ${preResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Response Time: ${preResult.responseTime}`);
    console.log(`Performance Compliant: ${preResult.performanceCompliant ? 'Yes' : 'No'}`);

    if (preResult.violations?.length > 0) {
      console.log(`\nViolations Found: ${preResult.violations.length}`);
      for (const v of preResult.violations) {
        console.log(`\n  [${v.severity}] ${v.type}`);
        console.log(`  Message: ${v.message}`);
        if (v.suggestion) {
          console.log(`  Suggestion: ${v.suggestion}`);
        }
      }
    }

    // Run post-validation
    const postResult = await enhancer.validatePost({ code });

    console.log(`\nPost-Validation: ${postResult.passed ? '✅ PASSED' : '⚠️ ISSUES'}`);
    console.log(`Quality Score: ${postResult.qualityScore}/100`);

    if (postResult.issues?.length > 0) {
      console.log(`\nQuality Issues: ${postResult.issues.length}`);
      for (const issue of postResult.issues) {
        console.log(`\n  [${issue.severity}] ${issue.type}`);
        console.log(`  Message: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`  Suggestion: ${issue.suggestion}`);
        }
      }
    }

    console.log('\n' + '─'.repeat(50));
    process.exit(preResult.passed && postResult.passed ? 0 : 1);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleBenchmark(enhancer, args) {
  const iterationsArg = args.find(a => a.startsWith('--iterations='));
  const iterations = iterationsArg
    ? parseInt(iterationsArg.split('=')[1], 10)
    : 100;

  const isJson = args.includes('--json');

  console.log(`\nRunning benchmark (${iterations} iterations)...`);
  console.log('─'.repeat(50));

  const results = await enhancer.benchmark(iterations);

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`\nBenchmark Results:`);
  console.log(`  Iterations: ${results.iterations}`);

  console.log(`\n  Pre-Validation:`);
  console.log(`    Average: ${results.preValidation.average}`);
  console.log(`    P95: ${results.preValidation.p95}`);
  console.log(`    Target Met (<1ms): ${results.preValidation.meetsTarget ? '✅ Yes' : '❌ No'}`);

  console.log(`\n  Post-Validation:`);
  console.log(`    Average: ${results.postValidation.average}`);
  console.log(`    P95: ${results.postValidation.p95}`);
  console.log(`    Target Met (<5ms): ${results.postValidation.meetsTarget ? '✅ Yes' : '❌ No'}`);

  console.log('\n' + '─'.repeat(50));
}

function handleMetrics(enhancer) {
  const metrics = enhancer.getMetrics();

  console.log(`\nJLMA-CFES Metrics`);
  console.log('─'.repeat(50));
  console.log(`  Version: ${metrics.version}`);
  console.log(`  Uptime: ${metrics.uptime}`);
  console.log(`  Validations Run: ${metrics.validationsRun}`);
  console.log(`  Violations Blocked: ${metrics.violationsBlocked}`);
  console.log(`  Block Rate: ${metrics.blockRate}`);
  console.log(`  Avg Response Time: ${metrics.averageResponseTime}`);
  console.log(`  Performance Target: ${metrics.performanceTarget}`);
  console.log(`  Memory Usage: ${metrics.memoryUsage}`);
  console.log('─'.repeat(50));
}

async function handleInit(enhancer) {
  console.log('\nInitializing JLMA-CFES with claude-flow...');
  console.log('─'.repeat(50));

  const initResult = await enhancer.initialize();

  if (initResult.success) {
    console.log('✅ Initialization successful!');
    console.log(`  Version: ${initResult.version}`);
    console.log(`  Init Time: ${initResult.initTime}`);
    console.log(`  Features:`);
    for (const [feature, enabled] of Object.entries(initResult.features)) {
      console.log(`    ${feature}: ${enabled ? '✅' : '❌'}`);
    }
  } else {
    console.log('❌ Initialization failed');
    console.log(`  Error: ${initResult.error}`);
  }

  console.log('─'.repeat(50));
}

async function handleCheck(enhancer, args) {
  const code = args.join(' ');
  const isJson = args.includes('--json');

  if (!code || code === '--json') {
    console.error('Error: Please provide code to check');
    console.log('Usage: jlma-cfes check "const x = 123"');
    process.exit(1);
  }

  const cleanCode = code.replace('--json', '').trim();
  const result = await enhancer.validatePre(cleanCode);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\nQuick Check: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Response Time: ${result.responseTime}`);

    if (result.violations?.length > 0) {
      for (const v of result.violations) {
        console.log(`  [${v.severity}] ${v.message}`);
      }
    }
  }

  process.exit(result.passed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
