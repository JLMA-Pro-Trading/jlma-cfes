#!/usr/bin/env node

/**
 * JLMA-CFES Performance Benchmark
 *
 * Validates that all performance claims are REAL and MEASURABLE.
 * Tests sub-millisecond validation targets.
 */

import { createEnhancer } from '../src/index.js';
import { PatternValidator } from '../src/validators/PatternValidator.js';
import { ValidationHooks } from '../src/hooks/ValidationHooks.js';
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js';

const ITERATIONS = 500;

async function runBenchmark() {
  console.log('\n🔬 JLMA-CFES v1.0.0 Performance Benchmark');
  console.log('═'.repeat(60));

  const results = {
    patternValidator: null,
    validationHooks: null,
    fullEnhancer: null,
    performanceMonitor: null
  };

  // Test samples
  const cleanCode = `
    const config = {
      apiUrl: process.env.API_URL,
      timeout: 5000
    };
    async function fetchData() {
      try {
        const response = await fetch(config.apiUrl);
        return response.json();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  `;

  const violatingCode = `
    const password = "super_secret_123";
    const query = "SELECT * FROM users WHERE id = " + userId;
    element.innerHTML = userInput;
  `;

  // 1. Pattern Validator Benchmark
  console.log('\n📊 PatternValidator Benchmark');
  console.log('─'.repeat(60));

  const validator = new PatternValidator();

  results.patternValidator = {
    preClean: await benchmarkFunction(
      () => validator.validatePre(cleanCode),
      ITERATIONS
    ),
    preViolating: await benchmarkFunction(
      () => validator.validatePre(violatingCode),
      ITERATIONS
    ),
    post: await benchmarkFunction(
      () => validator.validatePost({ code: cleanCode }),
      ITERATIONS
    )
  };

  console.log(`  Pre-validation (clean):     ${formatResult(results.patternValidator.preClean)}`);
  console.log(`  Pre-validation (violations): ${formatResult(results.patternValidator.preViolating)}`);
  console.log(`  Post-validation:            ${formatResult(results.patternValidator.post)}`);

  const preTarget = parseFloat(results.patternValidator.preClean.average) < 1.0;
  const postTarget = parseFloat(results.patternValidator.post.average) < 5.0;
  console.log(`\n  Pre <1ms target:  ${preTarget ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Post <5ms target: ${postTarget ? '✅ PASS' : '❌ FAIL'}`);

  // 2. Validation Hooks Benchmark
  console.log('\n📊 ValidationHooks Benchmark');
  console.log('─'.repeat(60));

  const hooks = new ValidationHooks();

  results.validationHooks = {
    pre: await benchmarkFunction(
      () => hooks.executePreToolUse('Write', { content: cleanCode }),
      ITERATIONS
    ),
    post: await benchmarkFunction(
      () => hooks.executePostToolUse('Write', { content: cleanCode }, { success: true }),
      ITERATIONS
    )
  };

  console.log(`  PreToolUse execution:  ${formatResult(results.validationHooks.pre)}`);
  console.log(`  PostToolUse execution: ${formatResult(results.validationHooks.post)}`);

  // 3. Full Enhancer Benchmark
  console.log('\n📊 Full Enhancer Benchmark');
  console.log('─'.repeat(60));

  const enhancer = createEnhancer({ claudeFlowIntegration: false });
  await enhancer.initialize();

  results.fullEnhancer = {
    validatePre: await benchmarkFunction(
      () => enhancer.validatePre(cleanCode),
      ITERATIONS
    ),
    validatePost: await benchmarkFunction(
      () => enhancer.validatePost({ code: cleanCode }),
      ITERATIONS
    )
  };

  console.log(`  validatePre():  ${formatResult(results.fullEnhancer.validatePre)}`);
  console.log(`  validatePost(): ${formatResult(results.fullEnhancer.validatePost)}`);

  // 4. Performance Monitor Overhead
  console.log('\n📊 PerformanceMonitor Overhead');
  console.log('─'.repeat(60));

  const monitor = new PerformanceMonitor();

  results.performanceMonitor = await benchmarkFunction(
    () => {
      const end = monitor.startOperation('test', 'benchmark');
      end(true);
    },
    ITERATIONS
  );

  console.log(`  Operation tracking: ${formatResult(results.performanceMonitor)}`);
  monitor.stop();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📈 BENCHMARK SUMMARY');
  console.log('═'.repeat(60));

  const allPassing = preTarget && postTarget;

  console.log(`
  Pattern Detection:
    Pre-validation:  ${results.patternValidator.preClean.average} avg, ${results.patternValidator.preClean.p95} p95
    Post-validation: ${results.patternValidator.post.average} avg, ${results.patternValidator.post.p95} p95

  Hook System:
    PreToolUse:      ${results.validationHooks.pre.average} avg, ${results.validationHooks.pre.p95} p95
    PostToolUse:     ${results.validationHooks.post.average} avg, ${results.validationHooks.post.p95} p95

  Full Enhancer:
    validatePre():   ${results.fullEnhancer.validatePre.average} avg
    validatePost():  ${results.fullEnhancer.validatePost.average} avg

  Monitor Overhead: ${results.performanceMonitor.average} per operation

  Performance Targets:
    Pre <1ms:  ${preTarget ? '✅ PASS' : '❌ FAIL'}
    Post <5ms: ${postTarget ? '✅ PASS' : '❌ FAIL'}

  Overall: ${allPassing ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS MISSED'}
  `);

  console.log('═'.repeat(60));

  process.exit(allPassing ? 0 : 1);
}

async function benchmarkFunction(fn, iterations) {
  const times = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    iterations,
    average: `${avg.toFixed(3)}ms`,
    min: `${sorted[0].toFixed(3)}ms`,
    max: `${sorted[sorted.length - 1].toFixed(3)}ms`,
    p50: `${sorted[Math.floor(sorted.length * 0.5)].toFixed(3)}ms`,
    p95: `${sorted[Math.floor(sorted.length * 0.95)].toFixed(3)}ms`,
    p99: `${sorted[Math.floor(sorted.length * 0.99)].toFixed(3)}ms`
  };
}

function formatResult(result) {
  return `${result.average} avg, ${result.p95} p95, ${result.min}-${result.max} range`;
}

runBenchmark().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
