/**
 * JLMA-CFES Advanced Features Example
 *
 * Demonstrates integration with .claude skills:
 * - Truth Scoring system (verification-quality skill)
 * - SPARC methodology workflow (sparc-methodology skill)
 * - Hook automation with sessions (hooks-automation skill)
 */

import { createEnhancer } from '../src/index.js';

async function main() {
  console.log('🚀 JLMA-CFES Advanced Features Example\n');

  // Create enhancer with all features enabled
  const enhancer = createEnhancer({
    claudeFlowIntegration: false, // Standalone demo
    enableTruthScoring: true,
    enableSPARC: true,
    enableHookAutomation: true,
    truthThreshold: 0.95
  });

  const initResult = await enhancer.initialize();
  console.log('Initialized:', initResult.success ? '✅' : '❌');
  console.log(`Version: ${initResult.version}`);
  console.log('Features:', initResult.features);
  console.log();

  // ============================================
  // Part 1: Truth Scoring System
  // ============================================
  console.log('═'.repeat(60));
  console.log('Part 1: Truth Scoring System');
  console.log('═'.repeat(60));
  console.log();

  // Score some clean code
  const cleanCode = `
    const config = {
      apiUrl: process.env.API_URL,
      timeout: 5000
    };

    async function fetchData(endpoint) {
      const response = await fetch(config.apiUrl + endpoint);
      return response.json();
    }
  `;

  console.log('Scoring clean code...');
  const truthScore1 = await enhancer.calculateTruthScore(cleanCode);
  console.log(`  Overall Score: ${truthScore1.overallScore}`);
  console.log(`  Status: ${truthScore1.status}`);
  console.log(`  Passed: ${truthScore1.passed ? '✅' : '❌'}`);
  console.log(`  Components:`);
  console.log(`    Security: ${truthScore1.components?.security || 'N/A'}`);
  console.log(`    Quality: ${truthScore1.components?.quality || 'N/A'}`);
  console.log(`    Performance: ${truthScore1.components?.performance || 'N/A'}`);
  console.log();

  // Score code with issues
  const problematicCode = `
    const password = "admin123";
    const query = "SELECT * FROM users WHERE name = '" + name + "'";
    element.innerHTML = userInput;
  `;

  console.log('Scoring problematic code...');
  const truthScore2 = await enhancer.calculateTruthScore(problematicCode);
  console.log(`  Overall Score: ${truthScore2.overallScore}`);
  console.log(`  Status: ${truthScore2.status}`);
  console.log(`  Passed: ${truthScore2.passed ? '✅' : '❌'}`);
  console.log(`  Violations: ${truthScore2.violations?.length || 0}`);
  console.log();

  // Verify code
  console.log('Verifying clean code...');
  const verification = await enhancer.verify(cleanCode);
  console.log(`  Verified: ${verification.verified ? '✅' : '❌'}`);
  console.log(`  Checks:`);
  console.log(`    Code Correctness: ${verification.checks?.codeCorrectness ? '✅' : '❌'}`);
  console.log(`    Security: ${verification.checks?.security ? '✅' : '❌'}`);
  console.log(`    Performance: ${verification.checks?.performance ? '✅' : '❌'}`);
  console.log(`    Quality: ${verification.checks?.quality ? '✅' : '❌'}`);
  console.log();

  // Get dashboard
  console.log('Truth Scoring Dashboard:');
  const dashboard = enhancer.getTruthDashboard();
  console.log(`  Overall Score: ${dashboard.overallScore}`);
  console.log(`  Status: ${dashboard.status}`);
  console.log(`  Trend: ${dashboard.trendPercent} (${dashboard.trend})`);
  console.log(`  Pass Rate: ${dashboard.statistics?.passRate || '0%'}`);
  console.log();

  // ============================================
  // Part 2: SPARC Methodology Workflow
  // ============================================
  console.log('═'.repeat(60));
  console.log('Part 2: SPARC Methodology Workflow');
  console.log('═'.repeat(60));
  console.log();

  // Start a SPARC workflow
  console.log('Starting SPARC workflow...');
  const workflow = enhancer.startSPARCWorkflow('Build user authentication system');
  console.log(`  Workflow ID: ${workflow.workflowId}`);
  console.log(`  Current Phase: ${workflow.currentPhase}`);
  console.log(`  Next Steps:`);
  for (const step of workflow.nextSteps.slice(0, 3)) {
    console.log(`    - ${step}`);
  }
  console.log();

  // Validate specification phase
  console.log('Validating Specification phase...');
  const specOutputs = {
    requirements: [
      'User can register with email/password',
      'User can login and receive JWT token',
      'Protected routes require valid token'
    ],
    constraints: ['Passwords must be hashed', 'Tokens expire in 24h'],
    success_criteria: ['All auth endpoints respond <100ms', '100% test coverage']
  };

  const specResult = await enhancer.validateSPARCPhase('specification', specOutputs);
  console.log(`  Phase: ${specResult.phase}`);
  console.log(`  Score: ${specResult.score}`);
  console.log(`  Quality Gate: ${specResult.qualityGate}`);
  console.log(`  Passed: ${specResult.passed ? '✅' : '❌'}`);
  if (specResult.nextPhase) {
    console.log(`  Next Phase: ${specResult.nextPhase}`);
  }
  console.log();

  // Get TDD workflow for refinement
  console.log('TDD Workflow for "JWT Authentication":');
  const tddWorkflow = enhancer.getTDDWorkflow('JWT Authentication');
  console.log(`  Feature: ${tddWorkflow.feature}`);
  console.log(`  Cycles:`);
  for (const cycle of tddWorkflow.cycles) {
    console.log(`    ${cycle.step}: ${cycle.description}`);
  }
  console.log(`  Quality Gates:`);
  console.log(`    Coverage Target: ${tddWorkflow.qualityGates.coverageTarget}`);
  console.log(`    No Skipped Tests: ${tddWorkflow.qualityGates.noSkippedTests}`);
  console.log();

  // Check workflow status
  console.log('Workflow Status:');
  const status = enhancer.getSPARCStatus();
  console.log(`  Active: ${status.active}`);
  console.log(`  Current Phase: ${status.currentPhase}`);
  console.log(`  Progress: ${status.progress}`);
  console.log(`  Elapsed: ${status.elapsed}`);
  console.log();

  // ============================================
  // Part 3: Hook Automation with Sessions
  // ============================================
  console.log('═'.repeat(60));
  console.log('Part 3: Hook Automation with Sessions');
  console.log('═'.repeat(60));
  console.log();

  // Start a session
  console.log('Starting session...');
  const session = await enhancer.sessionStart({
    loadContext: false // Skip claude-flow hook for demo
  });
  console.log(`  Session ID: ${session.sessionId}`);
  console.log(`  Start Time: ${session.startTime}`);
  console.log(`  Memory Protocol: ${session.memoryProtocol?.namespace}`);
  console.log();

  // Simulate pre-edit hook
  console.log('Pre-edit hook for auth/login.js...');
  const preEdit = await enhancer.preEdit('src/auth/login.js', {
    autoAssignAgent: true,
    validateSyntax: false
  });
  console.log(`  Allowed: ${preEdit.allowed ? '✅' : '❌'}`);
  console.log(`  Agent Assigned: ${preEdit.agentAssigned}`);
  console.log(`  Validation Time: ${preEdit.validationTime}`);
  console.log();

  // Simulate post-edit hook
  console.log('Post-edit hook for auth/login.js...');
  const postEdit = await enhancer.postEdit('src/auth/login.js', {
    autoFormat: true,
    memoryKey: 'auth/login_implementation'
  });
  console.log(`  File: ${postEdit.file}`);
  console.log(`  Memory Key: ${postEdit.memoryKey}`);
  console.log(`  Formatted: ${postEdit.formatted}`);
  console.log(`  Response Time: ${postEdit.responseTime}`);
  console.log();

  // Get session metrics
  console.log('Session Metrics:');
  const sessionMetrics = enhancer.getSessionMetrics();
  console.log(`  Session ID: ${sessionMetrics.session?.id}`);
  console.log(`  Active: ${sessionMetrics.session?.active}`);
  console.log(`  Edits Tracked: ${sessionMetrics.session?.editsTracked}`);
  console.log(`  Hooks Executed: ${sessionMetrics.hooks?.executed}`);
  console.log();

  // End session
  console.log('Ending session...');
  const sessionEnd = await enhancer.sessionEnd({
    saveState: false, // Skip claude-flow for demo
    generateSummary: false
  });
  console.log(`  Ended: ${sessionEnd.ended}`);
  console.log(`  Duration: ${sessionEnd.duration}`);
  console.log(`  Edits Tracked: ${sessionEnd.editsTracked}`);
  console.log(`  Hooks Executed: ${sessionEnd.hooksExecuted}`);
  console.log();

  // ============================================
  // Summary
  // ============================================
  console.log('═'.repeat(60));
  console.log('Summary: All .claude Features Integrated');
  console.log('═'.repeat(60));
  console.log();

  const metrics = enhancer.getMetrics();
  console.log('Final Metrics:');
  console.log(`  Version: ${metrics.version}`);
  console.log(`  Validations Run: ${metrics.validationsRun}`);
  console.log(`  Violations Blocked: ${metrics.violationsBlocked}`);
  console.log(`  Block Rate: ${metrics.blockRate}`);
  console.log(`  Avg Response Time: ${metrics.averageResponseTime}`);
  console.log(`  Memory Usage: ${metrics.memoryUsage}`);
  console.log();

  console.log('✅ Advanced features demonstration complete!');
  console.log();
  console.log('Integrated .claude Skills:');
  console.log('  📊 verification-quality - Truth Scoring system');
  console.log('  🔄 sparc-methodology - SPARC workflow with TDD');
  console.log('  🪝 hooks-automation - Session management & hooks');
  console.log('  📈 performance-analysis - Response time tracking');
  console.log('  🧠 memory-coordination - Memory protocol commands');
}

main().catch(console.error);
