/**
 * JLMA-CFES Basic Usage Example
 *
 * Demonstrates core functionality:
 * - Pre-validation (security/performance checks)
 * - Post-validation (quality checks)
 * - Performance metrics
 */

import { createEnhancer } from '../src/index.js';

async function main() {
  console.log('🚀 JLMA-CFES Basic Usage Example\n');

  // Create and initialize enhancer
  const enhancer = createEnhancer({
    claudeFlowIntegration: false, // Standalone mode for this example
    strictMode: false
  });

  const initResult = await enhancer.initialize();
  console.log('Initialized:', initResult.success ? '✅' : '❌');
  console.log(`Version: ${initResult.version}`);
  console.log(`Init Time: ${initResult.initTime}\n`);

  // Example 1: Clean code (should pass)
  console.log('─'.repeat(50));
  console.log('Example 1: Clean Code\n');

  const cleanCode = `
    // Good: Using environment variables
    const apiKey = process.env.API_KEY;

    // Good: Parameterized query
    async function getUser(id) {
      try {
        const result = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        return result;
      } catch (error) {
        console.error('Query failed:', error);
        throw error;
      }
    }
  `;

  const cleanResult = await enhancer.validatePre(cleanCode);
  console.log(`Pre-validation: ${cleanResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Response Time: ${cleanResult.responseTime}`);
  console.log(`Violations: ${cleanResult.violations?.length || 0}\n`);

  // Example 2: Code with security issues (should fail)
  console.log('─'.repeat(50));
  console.log('Example 2: Security Issues\n');

  const insecureCode = `
    // Bad: Hardcoded password
    const password = "super_secret_123";

    // Bad: SQL injection vulnerability
    const query = "SELECT * FROM users WHERE name = '" + userName + "'";

    // Bad: XSS vulnerability
    element.innerHTML = userInput;
  `;

  const insecureResult = await enhancer.validatePre(insecureCode);
  console.log(`Pre-validation: ${insecureResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Response Time: ${insecureResult.responseTime}`);
  console.log(`Violations Found: ${insecureResult.violations?.length || 0}`);

  if (insecureResult.violations?.length > 0) {
    console.log('\nViolations:');
    for (const v of insecureResult.violations) {
      console.log(`  [${v.severity}] ${v.type}`);
      console.log(`    ${v.message}`);
      if (v.suggestion) {
        console.log(`    Suggestion: ${v.suggestion}`);
      }
    }
  }

  // Example 3: Post-validation (quality checks)
  console.log('\n' + '─'.repeat(50));
  console.log('Example 3: Quality Checks\n');

  const codeWithIssues = `
    // Missing error handling in async code
    async function fetchData() {
      const response = await fetch(url);
      return response.json();
    }

    // Potential memory leak
    setInterval(() => {
      console.log('Running...');
    }, 1000);
  `;

  const postResult = await enhancer.validatePost({ code: codeWithIssues });
  console.log(`Post-validation: ${postResult.passed ? '✅ PASSED' : '⚠️ ISSUES'}`);
  console.log(`Quality Score: ${postResult.qualityScore}/100`);
  console.log(`Response Time: ${postResult.responseTime}`);

  if (postResult.issues?.length > 0) {
    console.log('\nQuality Issues:');
    for (const issue of postResult.issues) {
      console.log(`  [${issue.severity}] ${issue.type}`);
      console.log(`    ${issue.message}`);
      if (issue.suggestion) {
        console.log(`    Suggestion: ${issue.suggestion}`);
      }
    }
  }

  // Example 4: Performance metrics
  console.log('\n' + '─'.repeat(50));
  console.log('Example 4: Performance Metrics\n');

  const metrics = enhancer.getMetrics();
  console.log('Current Metrics:');
  console.log(`  Validations Run: ${metrics.validationsRun}`);
  console.log(`  Violations Blocked: ${metrics.violationsBlocked}`);
  console.log(`  Block Rate: ${metrics.blockRate}`);
  console.log(`  Avg Response Time: ${metrics.averageResponseTime}`);
  console.log(`  Performance Target: ${metrics.performanceTarget}`);
  console.log(`  Memory Usage: ${metrics.memoryUsage}`);

  // Example 5: Benchmark
  console.log('\n' + '─'.repeat(50));
  console.log('Example 5: Quick Benchmark\n');

  const benchmark = await enhancer.benchmark(50);
  console.log(`Iterations: ${benchmark.iterations}`);
  console.log('\nPre-validation:');
  console.log(`  Average: ${benchmark.preValidation.average}`);
  console.log(`  P95: ${benchmark.preValidation.p95}`);
  console.log(`  Target Met (<1ms): ${benchmark.preValidation.meetsTarget ? '✅' : '❌'}`);
  console.log('\nPost-validation:');
  console.log(`  Average: ${benchmark.postValidation.average}`);
  console.log(`  P95: ${benchmark.postValidation.p95}`);
  console.log(`  Target Met (<5ms): ${benchmark.postValidation.meetsTarget ? '✅' : '❌'}`);

  console.log('\n' + '─'.repeat(50));
  console.log('Example complete! ✨\n');
}

main().catch(console.error);
