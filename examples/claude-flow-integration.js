/**
 * JLMA-CFES Claude-Flow Integration Example
 *
 * Demonstrates integration with claude-flow MCP tools:
 * - Swarm initialization
 * - Task orchestration with validation
 * - Agent spawning
 * - Memory operations
 */

import { createEnhancer } from '../src/index.js';

async function main() {
  console.log('🚀 JLMA-CFES Claude-Flow Integration Example\n');

  // Create enhancer with claude-flow integration
  const enhancer = createEnhancer({
    claudeFlowIntegration: true
  });

  const initResult = await enhancer.initialize();

  if (!initResult.success) {
    console.log('❌ Initialization failed');
    console.log(`Error: ${initResult.error}\n`);
    console.log('Note: Claude-flow integration requires claude-flow@alpha');
    console.log('Install with: npm install -g claude-flow@alpha\n');

    // Continue with standalone demonstration
    console.log('Continuing with standalone mode...\n');
  }

  console.log('Initialized:', initResult.success ? '✅' : '⚠️ (standalone mode)');
  console.log(`Version: ${initResult.version}`);
  console.log(`Features:`, initResult.features);
  console.log();

  // Check adapter connection status
  const adapter = enhancer._adapter;
  if (adapter) {
    console.log('─'.repeat(50));
    console.log('Claude-Flow Adapter Status\n');

    const adapterMetrics = adapter.getMetrics();
    console.log(`Connected: ${adapterMetrics.connected ? '✅' : '❌'}`);
    console.log(`Active Swarm: ${adapterMetrics.activeSwarm || 'None'}`);
    console.log();
  }

  // Example 1: Initialize Swarm (if connected)
  console.log('─'.repeat(50));
  console.log('Example 1: Initialize Swarm\n');

  if (adapter) {
    const swarmResult = await adapter.initSwarm({
      topology: 'mesh',
      maxAgents: 5,
      strategy: 'balanced'
    });

    console.log(`Swarm Init: ${swarmResult.success ? '✅' : '❌'}`);
    if (swarmResult.swarm) {
      console.log(`  ID: ${swarmResult.swarm.id}`);
      console.log(`  Topology: ${swarmResult.swarm.config.topology}`);
      console.log(`  Mode: ${swarmResult.swarm.mode || 'connected'}`);
    }
  } else {
    console.log('Skipped (no adapter)');
  }
  console.log();

  // Example 2: Orchestrate with Validation
  console.log('─'.repeat(50));
  console.log('Example 2: Orchestrate Task with Validation\n');

  // Simulate task orchestration with validation
  const taskCode = `
    // Task: Build REST API endpoint
    async function createUser(req, res) {
      const { name, email } = req.body;
      const user = await db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
      res.json(user);
    }
  `;

  // Pre-validation
  const preResult = await enhancer.validatePre(taskCode);
  console.log(`Pre-validation: ${preResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Response Time: ${preResult.responseTime}`);

  if (preResult.passed) {
    console.log('\nTask would proceed to claude-flow orchestration...');

    if (adapter) {
      const orchestrateResult = await adapter.orchestrate('Build REST API endpoint', {
        strategy: 'adaptive',
        priority: 'medium',
        maxAgents: 3
      });

      console.log(`\nOrchestration: ${orchestrateResult.success ? '✅' : '❌'}`);
      console.log(`Response Time: ${orchestrateResult.responseTime}`);
    }
  } else {
    console.log('\nTask blocked due to validation failures.');
  }
  console.log();

  // Example 3: Validation Pipeline
  console.log('─'.repeat(50));
  console.log('Example 3: Full Validation Pipeline\n');

  // Simulate a complete validation workflow
  const generatedCode = `
    const config = {
      apiUrl: process.env.API_URL,
      timeout: 5000
    };

    async function fetchData(endpoint) {
      try {
        const response = await fetch(config.apiUrl + endpoint, {
          timeout: config.timeout
        });
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }
        return response.json();
      } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
      }
    }

    module.exports = { fetchData };
  `;

  console.log('Running full validation pipeline...\n');

  // Step 1: Pre-validation
  const step1 = await enhancer.validatePre(generatedCode);
  console.log(`Step 1 - Pre-validation: ${step1.passed ? '✅' : '❌'}`);
  console.log(`  Security issues: ${step1.violations?.filter(v => v.type.includes('secret') || v.type.includes('injection')).length || 0}`);
  console.log(`  Performance issues: ${step1.violations?.filter(v => v.type.includes('performance')).length || 0}`);

  // Step 2: Post-validation
  const step2 = await enhancer.validatePost({ code: generatedCode });
  console.log(`\nStep 2 - Post-validation: ${step2.passed ? '✅' : '⚠️'}`);
  console.log(`  Quality Score: ${step2.qualityScore}/100`);
  console.log(`  Issues found: ${step2.issues?.length || 0}`);

  // Step 3: Overall result
  const overallPassed = step1.passed && step2.passed;
  console.log(`\nOverall Result: ${overallPassed ? '✅ READY FOR PRODUCTION' : '❌ NEEDS FIXES'}`);
  console.log();

  // Example 4: Metrics Summary
  console.log('─'.repeat(50));
  console.log('Example 4: Session Metrics\n');

  const metrics = enhancer.getMetrics();
  console.log('Session Summary:');
  console.log(`  Total Validations: ${metrics.validationsRun}`);
  console.log(`  Blocked: ${metrics.violationsBlocked}`);
  console.log(`  Block Rate: ${metrics.blockRate}`);
  console.log(`  Avg Response: ${metrics.averageResponseTime}`);
  console.log(`  Memory: ${metrics.memoryUsage}`);

  if (adapter) {
    const adapterMetrics = adapter.getMetrics();
    console.log('\nClaude-Flow Integration:');
    console.log(`  Tasks Orchestrated: ${adapterMetrics.tasksOrchestrated}`);
    console.log(`  Agents Spawned: ${adapterMetrics.agentsSpawned}`);
    console.log(`  Avg Task Time: ${adapterMetrics.averageTaskTime}`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('Integration example complete! ✨\n');
}

main().catch(console.error);
