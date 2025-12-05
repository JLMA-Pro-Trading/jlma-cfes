/**
 * JLMA-CFES v1.0.0 - Claude Flow Enhancement System
 *
 * A unified performance enhancement layer for claude-flow that provides:
 * - Sub-millisecond code validation (PreToolUse/PostToolUse hooks)
 * - Real pattern detection (security, performance, quality)
 * - Claude-flow MCP integration
 * - Performance monitoring and optimization
 * - Truth Scoring system (0.0-1.0 scale verification)
 * - SPARC methodology support with TDD workflow
 * - Hook automation with session management
 *
 * Design Philosophy:
 * - Zero placeholders - every function does real work
 * - Measurable results - all claims are benchmarked
 * - Simple API - one way to do things right
 * - Claude-flow native - designed for MCP integration
 */

import { EnhancementCore } from './core/EnhancementCore.js';
import { ValidationHooks } from './hooks/ValidationHooks.js';
import { ClaudeFlowAdapter } from './adapters/ClaudeFlowAdapter.js';
import { PatternValidator } from './validators/PatternValidator.js';
import { PerformanceMonitor } from './core/PerformanceMonitor.js';
import { TruthScoring } from './validators/TruthScoring.js';
import { SPARCIntegration } from './core/SPARCIntegration.js';
import { HookAutomation } from './hooks/HookAutomation.js';

/**
 * Main JLMA-CFES Enhancement System
 * Single unified interface for all enhancement capabilities
 */
class JLMACFES {
  constructor(options = {}) {
    this.version = '1.0.0';
    this.options = {
      enableHooks: options.enableHooks !== false,
      enableValidation: options.enableValidation !== false,
      enableMonitoring: options.enableMonitoring !== false,
      claudeFlowIntegration: options.claudeFlowIntegration !== false,
      enableTruthScoring: options.enableTruthScoring !== false,
      enableSPARC: options.enableSPARC !== false,
      enableHookAutomation: options.enableHookAutomation !== false,
      performanceThreshold: options.performanceThreshold || 1.0, // <1ms target
      truthThreshold: options.truthThreshold || 0.95, // 95% accuracy required
      strictMode: options.strictMode || false,
      maxRetries: options.maxRetries || 3, // Default retries for auto-correction
      ...options
    };

    // Core components - initialized lazily
    this._core = null;
    this._hooks = null;
    this._adapter = null;
    this._validator = null;
    this._monitor = null;
    this._truthScoring = null;
    this._sparc = null;
    this._hookAutomation = null;

    // Metrics tracking
    this.metrics = {
      validationsRun: 0,
      violationsBlocked: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };
  }

  /**
   * Initialize the enhancement system
   * Call this before using any features
   */
  async initialize() {
    const initStart = performance.now();

    try {
      // Initialize core components
      this._core = new EnhancementCore(this.options);
      this._validator = new PatternValidator(this.options);
      this._monitor = new PerformanceMonitor(this.options);

      // Initialize hooks if enabled
      if (this.options.enableHooks) {
        this._hooks = new ValidationHooks({
          performanceThreshold: this.options.performanceThreshold,
          strictMode: this.options.strictMode
        });
      }

      // Initialize claude-flow adapter if integration enabled
      if (this.options.claudeFlowIntegration) {
        this._adapter = new ClaudeFlowAdapter(this.options);
        await this._adapter.connect();
      }

      // Initialize Truth Scoring system
      if (this.options.enableTruthScoring) {
        this._truthScoring = new TruthScoring({
          threshold: this.options.truthThreshold,
          autoRollback: this.options.strictMode
        });
      }

      // Initialize SPARC methodology integration
      if (this.options.enableSPARC) {
        this._sparc = new SPARCIntegration({
          enableValidation: this.options.enableValidation,
          qualityThreshold: this.options.truthThreshold
        });
      }

      // Initialize Hook automation
      if (this.options.enableHookAutomation) {
        this._hookAutomation = new HookAutomation({
          performanceThreshold: this.options.performanceThreshold,
          strictMode: this.options.strictMode,
          enableMemoryCoordination: this.options.claudeFlowIntegration,
          enableNeuralTraining: this.options.enableNeuralTraining || false
        });
      }

      const initTime = performance.now() - initStart;

      return {
        success: true,
        version: this.version,
        initTime: `${initTime.toFixed(2)}ms`,
        features: {
          hooks: this.options.enableHooks,
          validation: this.options.enableValidation,
          monitoring: this.options.enableMonitoring,
          claudeFlow: this.options.claudeFlowIntegration,
          truthScoring: this.options.enableTruthScoring,
          sparc: this.options.enableSPARC,
          hookAutomation: this.options.enableHookAutomation
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        initTime: `${(performance.now() - initStart).toFixed(2)}ms`
      };
    }
  }

  /**
   * Validate code before tool execution (PreToolUse)
   * Target: <1ms response time
   *
   * @param {string} code - Code to validate
   * @param {Object} context - Execution context
   * @returns {Object} Validation result with any violations
   */
  async validatePre(code, context = {}) {
    const startTime = performance.now();
    this.metrics.validationsRun++;

    try {
      const result = await this._validator.validatePre(code, context);

      if (!result.passed) {
        this.metrics.violationsBlocked += result.violations.length;
      }

      const responseTime = performance.now() - startTime;
      this._updateAverageResponseTime(responseTime);

      return {
        ...result,
        responseTime: `${responseTime.toFixed(3)}ms`,
        performanceCompliant: responseTime < this.options.performanceThreshold
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        responseTime: `${(performance.now() - startTime).toFixed(3)}ms`
      };
    }
  }

  /**
   * Validate result after tool execution (PostToolUse)
   * Target: <5ms response time
   *
   * @param {Object} result - Tool execution result
   * @param {Object} context - Execution context
   * @returns {Object} Validation result with quality metrics
   */
  async validatePost(result, context = {}) {
    const startTime = performance.now();
    this.metrics.validationsRun++;

    try {
      const validation = await this._validator.validatePost(result, context);
      const responseTime = performance.now() - startTime;
      this._updateAverageResponseTime(responseTime);

      return {
        ...validation,
        responseTime: `${responseTime.toFixed(3)}ms`,
        performanceCompliant: responseTime < 5.0 // 5ms threshold for post
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message,
        responseTime: `${(performance.now() - startTime).toFixed(3)}ms`
      };
    }
  }

  /**
   * Coordinate with claude-flow swarm
   * Wraps MCP tool calls with validation
   *
   * @param {string} task - Task description
   * @param {Object} options - Orchestration options
   * @returns {Object} Orchestration result
   */
  async orchestrate(task, options = {}) {
    if (!this._adapter) {
      throw new Error('Claude-flow integration not enabled');
    }

    return await this._adapter.orchestrate(task, {
      ...options,
      maxRetries: this.options.maxRetries,
      preValidation: (code) => this.validatePre(code),
      postValidation: (result) => this.validatePost(result)
    });
  }

  // ============================================
  // Truth Scoring API
  // ============================================

  /**
   * Calculate truth score for code (0.0-1.0)
   * Target: <50ms response time
   *
   * @param {string} code - Code to score
   * @param {Object} context - Scoring context
   * @returns {Object} Truth score result
   */
  async calculateTruthScore(code, context = {}) {
    if (!this._truthScoring) {
      throw new Error('Truth Scoring not enabled');
    }
    return await this._truthScoring.calculateScore(code, context);
  }

  /**
   * Verify code meets truth threshold
   *
   * @param {string} code - Code to verify
   * @param {Object} options - Verification options
   * @returns {Object} Verification result
   */
  async verify(code, options = {}) {
    if (!this._truthScoring) {
      throw new Error('Truth Scoring not enabled');
    }
    return await this._truthScoring.verify(code, options);
  }

  /**
   * Get truth scoring dashboard data
   * @returns {Object} Dashboard metrics
   */
  getTruthDashboard(options = {}) {
    if (!this._truthScoring) {
      return { enabled: false };
    }
    return this._truthScoring.getDashboard(options);
  }

  // ============================================
  // SPARC Methodology API
  // ============================================

  /**
   * Start a SPARC workflow
   *
   * @param {string} taskDescription - Task description
   * @param {Object} options - Workflow options
   * @returns {Object} Workflow state
   */
  startSPARCWorkflow(taskDescription, options = {}) {
    if (!this._sparc) {
      throw new Error('SPARC integration not enabled');
    }
    return this._sparc.startWorkflow(taskDescription, options);
  }

  /**
   * Validate SPARC phase and transition
   *
   * @param {string} phase - Current phase
   * @param {Object} outputs - Phase outputs
   * @param {Function} validator - Custom validator
   * @returns {Object} Validation result
   */
  async validateSPARCPhase(phase, outputs, validator = null) {
    if (!this._sparc) {
      throw new Error('SPARC integration not enabled');
    }
    return await this._sparc.validatePhase(phase, outputs, validator);
  }

  /**
   * Get TDD workflow for SPARC refinement phase
   *
   * @param {string} feature - Feature to implement
   * @returns {Object} TDD workflow steps
   */
  getTDDWorkflow(feature) {
    if (!this._sparc) {
      throw new Error('SPARC integration not enabled');
    }
    return this._sparc.getTDDWorkflow(feature);
  }

  /**
   * Get current SPARC workflow status
   * @returns {Object} Workflow status
   */
  getSPARCStatus() {
    if (!this._sparc) {
      return { enabled: false };
    }
    return this._sparc.getWorkflowStatus();
  }

  /**
   * Complete and archive SPARC workflow
   * @returns {Object} Completion result
   */
  completeSPARCWorkflow() {
    if (!this._sparc) {
      throw new Error('SPARC integration not enabled');
    }
    return this._sparc.completeWorkflow();
  }

  // ============================================
  // Hook Automation API
  // ============================================

  /**
   * Start a new session with hook automation
   *
   * @param {Object} options - Session options
   * @returns {Object} Session info
   */
  async sessionStart(options = {}) {
    if (!this._hookAutomation) {
      throw new Error('Hook automation not enabled');
    }
    return await this._hookAutomation.sessionStart(options);
  }

  /**
   * Restore a previous session
   *
   * @param {string} sessionId - Session to restore
   * @param {Object} options - Restore options
   * @returns {Object} Restored session info
   */
  async sessionRestore(sessionId, options = {}) {
    if (!this._hookAutomation) {
      throw new Error('Hook automation not enabled');
    }
    return await this._hookAutomation.sessionRestore(sessionId, options);
  }

  /**
   * End current session
   *
   * @param {Object} options - End options
   * @returns {Object} Session summary
   */
  async sessionEnd(options = {}) {
    if (!this._hookAutomation) {
      throw new Error('Hook automation not enabled');
    }
    return await this._hookAutomation.sessionEnd(options);
  }

  /**
   * Pre-edit hook with agent auto-assignment
   *
   * @param {string} filePath - File being edited
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async preEdit(filePath, options = {}) {
    if (!this._hookAutomation) {
      throw new Error('Hook automation not enabled');
    }
    return await this._hookAutomation.preEdit(filePath, options);
  }

  /**
   * Post-edit hook with memory storage
   *
   * @param {string} filePath - File that was edited
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async postEdit(filePath, options = {}) {
    if (!this._hookAutomation) {
      throw new Error('Hook automation not enabled');
    }
    return await this._hookAutomation.postEdit(filePath, options);
  }

  /**
   * Get hook automation session metrics
   * @returns {Object} Session metrics
   */
  getSessionMetrics() {
    if (!this._hookAutomation) {
      return { enabled: false };
    }
    return this._hookAutomation.getMetrics();
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;

    return {
      version: this.version,
      uptime: `${Math.round(uptime / 1000)}s`,
      validationsRun: this.metrics.validationsRun,
      violationsBlocked: this.metrics.violationsBlocked,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(3)}ms`,
      blockRate: this.metrics.validationsRun > 0
        ? `${((this.metrics.violationsBlocked / this.metrics.validationsRun) * 100).toFixed(1)}%`
        : '0%',
      performanceTarget: `<${this.options.performanceThreshold}ms`,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Run performance benchmark
   * @param {number} iterations - Number of test iterations
   * @returns {Object} Benchmark results
   */
  async benchmark(iterations = 100) {
    const results = {
      preValidation: [],
      postValidation: [],
      iterations
    };

    const testCode = `
      const data = { password: "test123", apiKey: "sk-abc123" };
      const query = "SELECT * FROM users WHERE id = " + userId;
    `;

    for (let i = 0; i < iterations; i++) {
      // Benchmark pre-validation
      const preStart = performance.now();
      await this.validatePre(testCode);
      results.preValidation.push(performance.now() - preStart);

      // Benchmark post-validation
      const postStart = performance.now();
      await this.validatePost({ success: true, code: testCode });
      results.postValidation.push(performance.now() - postStart);
    }

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const p95 = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)];
    };

    return {
      iterations,
      preValidation: {
        average: `${avg(results.preValidation).toFixed(3)}ms`,
        p95: `${p95(results.preValidation).toFixed(3)}ms`,
        meetsTarget: avg(results.preValidation) < this.options.performanceThreshold
      },
      postValidation: {
        average: `${avg(results.postValidation).toFixed(3)}ms`,
        p95: `${p95(results.postValidation).toFixed(3)}ms`,
        meetsTarget: avg(results.postValidation) < 5.0
      }
    };
  }

  /**
   * Update rolling average response time
   */
  _updateAverageResponseTime(newTime) {
    const count = this.metrics.validationsRun;
    this.metrics.averageResponseTime =
      ((this.metrics.averageResponseTime * (count - 1)) + newTime) / count;
  }
}

// Factory function for easy instantiation
export function createEnhancer(options = {}) {
  return new JLMACFES(options);
}

// Named exports for direct imports
export {
  JLMACFES,
  EnhancementCore,
  ValidationHooks,
  ClaudeFlowAdapter,
  PatternValidator,
  PerformanceMonitor,
  TruthScoring,
  SPARCIntegration,
  HookAutomation
};

// Default export
export default JLMACFES;
