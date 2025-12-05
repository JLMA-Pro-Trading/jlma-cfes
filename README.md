# JLMA-CFES

**Claude Flow Enhancement System** - A unified performance enhancement layer for claude-flow.

## What This Package Does

JLMA-CFES provides **real, measurable** enhancements for claude-flow operations:

- **Sub-millisecond code validation** (<1ms PreToolUse, <5ms PostToolUse)
- **Security pattern detection** (secrets, SQL injection, XSS, command injection)
- **Performance anti-pattern detection** (HashMap in Rust, nested loops, memory leaks)
- **Claude-flow MCP integration** (swarm coordination with validation)
- **Real performance monitoring** (all metrics are actual measurements)

### Design Philosophy

1. **Zero Placeholders** - Every function does real work
2. **Measurable Results** - All claims are benchmarked and verifiable
3. **Simple API** - One unified interface for all features
4. **Claude-flow Native** - Designed for MCP integration

## Installation

```bash
npm install jlma-cfes
```

### Setup (One-time)

To configure the environment:

```bash
npm run setup
```

### Cleanup

To remove integration rules and check for usage:

```bash
# Report usage only (Safe Mode)
npm run cleanup

# Auto-comment code usage
npm run cleanup -- --fix
```

## Quick Start

```javascript
import { createEnhancer } from 'jlma-cfes';

// Create enhancer instance
const enhancer = createEnhancer();
await enhancer.initialize();

// Validate code before execution
const preResult = await enhancer.validatePre(`
  const password = "secret123";
  const query = "SELECT * FROM users WHERE id = " + id;
`);

console.log(preResult);
// {
//   passed: false,
//   violations: [
//     { type: 'hardcoded_secret', severity: 'CRITICAL', ... },
//     { type: 'sql_injection', severity: 'CRITICAL', ... }
//   ],
//   responseTime: '0.342ms',
//   performanceCompliant: true
// }
```

## Core Features

### 1. Pre-Validation (PreToolUse)

Validates code **before** tool execution. Target: <1ms response time.

> **Note**: Full integration with `.claude/settings.json` and `.claude/skills/` is supported. See [Advanced Features](#advanced-features) below.

```javascript
const result = await enhancer.validatePre(code);

// Detects:
// - Hardcoded secrets (passwords, API keys, tokens)
// - SQL injection vulnerabilities
// - XSS vulnerabilities (innerHTML, eval, document.write)
// - Command injection
// - HashMap performance issues (Rust)
```

### 2. Post-Validation (PostToolUse)

Validates results **after** tool execution. Target: <5ms response time.

```javascript
const result = await enhancer.validatePost({ code: generatedCode });

// Checks:
// - Error handling presence
// - Potential memory leaks
// - Hardcoded values
// - Code quality score (0-100)
```

### 3. Claude-Flow Integration

Coordinates with claude-flow MCP tools with built-in validation.

```javascript
const enhancer = createEnhancer({ claudeFlowIntegration: true });
await enhancer.initialize();

// Orchestrate tasks with automatic validation
const result = await enhancer.orchestrate('Build REST API', {
  strategy: 'adaptive',
  priority: 'high',
  maxAgents: 5
});
```

### 4. Performance Monitoring

Real-time, measurable performance tracking.

```javascript
const metrics = enhancer.getMetrics();
// {
//   version: '3.0.0',
//   uptime: '125s',
//   validationsRun: 1247,
//   violationsBlocked: 23,
//   averageResponseTime: '0.421ms',
//   blockRate: '1.8%',
//   performanceTarget: '<1ms',
//   memoryUsage: '45MB'
// }
```

## CLI Usage

```bash
# Validate a file
jlma-cfes validate ./src/app.js

# Quick inline check
jlma-cfes check "const key = 'sk-abc123'"

# Run benchmark
jlma-cfes benchmark --iterations=200

# Show metrics
jlma-cfes metrics

# Initialize with claude-flow
jlma-cfes init
```

## Performance Targets

All performance claims are **benchmarked and verifiable**:

| Operation | Target | Typical |
|-----------|--------|---------|
| Pre-validation | <1ms | ~0.3ms |
| Post-validation | <5ms | ~0.8ms |
| Hook execution | <1ms | ~0.5ms |

Run the benchmark yourself:

```bash
npm run benchmark
```

## Security Patterns Detected

### Critical (Blocks Execution)

- **Hardcoded Secrets**: passwords, API keys, tokens, connection strings
- **SQL Injection**: string concatenation in queries, template literals
- **XSS**: innerHTML, document.write, eval, dangerouslySetInnerHTML
- **Command Injection**: exec/spawn with user input

### High (Warning)

- **HashMap Performance**: std::collections::HashMap in Rust (40% regression)
- **Memory Leaks**: setInterval without clearInterval
- **Missing Error Handling**: async without try-catch

## Advanced Features

### Truth Scoring System

Based on `.claude/skills/verification-quality`, provides code verification with 0.0-1.0 scoring.

```javascript
const enhancer = createEnhancer({ enableTruthScoring: true });
await enhancer.initialize();

// Calculate truth score for code
const score = await enhancer.calculateTruthScore(code);
// {
//   overallScore: 0.943,
//   passed: false,
//   status: 'good',
//   components: {
//     security: 0.85,
//     quality: 0.95,
//     performance: 1.0
//   },
//   violations: [...],
//   responseTime: '12.45ms'
// }

// Verify code meets threshold (with optional auto-rollback)
const verification = await enhancer.verify(code, {
  threshold: 0.95,
  rollbackFn: async () => { /* rollback logic */ }
});

// Get dashboard metrics
const dashboard = enhancer.getTruthDashboard();
```

### SPARC Methodology Integration

Based on `.claude/skills/sparc-methodology`, provides structured development workflow.

```javascript
const enhancer = createEnhancer({ enableSPARC: true });
await enhancer.initialize();

// Start a SPARC workflow
const workflow = enhancer.startSPARCWorkflow('Build user authentication');
// {
//   workflowId: 'sparc_1234567890',
//   currentPhase: 'specification',
//   nextSteps: ['Define requirements...', 'Identify constraints...', ...]
// }

// Validate phase completion
const result = await enhancer.validateSPARCPhase('specification', {
  requirements: ['User can login...'],
  constraints: ['Passwords must be hashed'],
  success_criteria: ['<100ms response time']
});
// {
//   phase: 'specification',
//   passed: true,
//   score: 0.92,
//   qualityGate: 0.85,
//   nextPhase: 'pseudocode'
// }

// Get TDD workflow for refinement phase
const tdd = enhancer.getTDDWorkflow('JWT Authentication');
// {
//   feature: 'JWT Authentication',
//   cycles: [
//     { step: 'RED', description: 'Write failing test', ... },
//     { step: 'GREEN', description: 'Implement minimum code', ... },
//     { step: 'REFACTOR', description: 'Improve code quality', ... }
//   ],
//   qualityGates: { coverageTarget: '90%', ... }
// }

// Check workflow status
const status = enhancer.getSPARCStatus();
// Complete workflow when done
const completion = enhancer.completeSPARCWorkflow();
```

### Hook Automation & Session Management

Based on `.claude/skills/hooks-automation`, provides extended hooks with session management.

```javascript
const enhancer = createEnhancer({ enableHookAutomation: true });
await enhancer.initialize();

// Start a session
const session = await enhancer.sessionStart({ loadContext: true });
// {
//   sessionId: 'session_1234567890',
//   startTime: '2024-01-15T...',
//   memoryProtocol: { namespace: 'session/...', commands: {...} }
// }

// Pre-edit hook with agent auto-assignment
const preEdit = await enhancer.preEdit('src/auth/login.js');
// {
//   allowed: true,
//   file: 'src/auth/login.js',
//   agentAssigned: 'coder',
//   validationTime: '0.45ms'
// }

// Post-edit hook with memory storage
const postEdit = await enhancer.postEdit('src/auth/login.js', {
  memoryKey: 'auth/login_implementation'
});
// {
//   file: 'src/auth/login.js',
//   memoryKey: 'auth/login_implementation',
//   formatted: true,
//   patternsTrained: false
// }

// End session with summary
const summary = await enhancer.sessionEnd({ saveState: true });
// {
//   ended: true,
//   sessionId: '...',
//   duration: '125s',
//   editsTracked: 15,
//   hooksExecuted: 32
// }

// Get session metrics
const metrics = enhancer.getSessionMetrics();
```

## Configuration

```javascript
const enhancer = createEnhancer({
  // Enable/disable features
  enableHooks: true,
  enableValidation: true,
  enableMonitoring: true,
  claudeFlowIntegration: true,

  // Advanced features from .claude/skills
  enableTruthScoring: true,      // verification-quality skill
  enableSPARC: true,             // sparc-methodology skill
  enableHookAutomation: true,    // hooks-automation skill

  // Thresholds
  performanceThreshold: 1.0,     // Target <1ms for pre-validation
  truthThreshold: 0.95,          // 95% accuracy required

  // Behavior
  strictMode: false,             // Block on ANY violation (not just CRITICAL)
  enableNeuralTraining: false    // Enable neural pattern training on edits
});
```

## API Reference

### `createEnhancer(options)`

Factory function to create JLMA-CFES instance.

### `enhancer.initialize()`

Initialize all components. Call before using other methods.

### `enhancer.validatePre(code, context)`

Pre-validate code before execution.

### `enhancer.validatePost(result, context)`

Post-validate execution results.

### `enhancer.orchestrate(task, options)`

Coordinate with claude-flow (requires `claudeFlowIntegration: true`).

### `enhancer.getMetrics()`

Get current performance metrics.

### `enhancer.benchmark(iterations)`

Run performance benchmark.

### Truth Scoring Methods

| Method | Description |
|--------|-------------|
| `calculateTruthScore(code, context)` | Calculate 0.0-1.0 truth score |
| `verify(code, options)` | Verify code meets threshold |
| `getTruthDashboard(options)` | Get scoring dashboard metrics |

### SPARC Methods

| Method | Description |
|--------|-------------|
| `startSPARCWorkflow(task, options)` | Start new SPARC workflow |
| `validateSPARCPhase(phase, outputs, validator)` | Validate phase completion |
| `getTDDWorkflow(feature)` | Get TDD workflow for refinement |
| `getSPARCStatus()` | Get current workflow status |
| `completeSPARCWorkflow()` | Complete and archive workflow |

### Hook Automation Methods

| Method | Description |
|--------|-------------|
| `sessionStart(options)` | Start new session |
| `sessionRestore(sessionId, options)` | Restore previous session |
| `sessionEnd(options)` | End session with summary |
| `preEdit(filePath, options)` | Pre-edit hook with agent assignment |
| `postEdit(filePath, options)` | Post-edit hook with memory storage |
| `getSessionMetrics()` | Get session metrics |



## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests: `npm test`
4. Run benchmark: `npm run benchmark`
5. Submit a pull request

All contributions must maintain sub-millisecond performance targets.
