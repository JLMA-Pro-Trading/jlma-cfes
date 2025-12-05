/**
 * ValidationHooks - PreToolUse/PostToolUse Hook System
 *
 * Implements Anthropic's recommended hook pattern for Claude Code:
 * - PreToolUse: Validate before tool execution (<1ms target)
 * - PostToolUse: Validate after tool execution (<5ms target)
 *
 * Based on Anthropic Engineering recommendations (June 2025):
 * - 8 lifecycle events for automation
 * - Security-first permissions (deny-all by default)
 * - Production use cases: auto-formatting, linting, compliance
 */

import { EventEmitter } from 'events';
import { PatternValidator } from '../validators/PatternValidator.js';

export class ValidationHooks extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      preToolUseThreshold: options.performanceThreshold || 1.0, // <1ms
      postToolUseThreshold: options.postToolUseThreshold || 5.0, // <5ms
      strictMode: options.strictMode || false,
      enabledHooks: options.enabledHooks || ['security', 'performance', 'quality'],
      ...options
    };

    // Core validator
    this.validator = new PatternValidator({
      strictMode: this.options.strictMode
    });

    // Hook registry
    this.hooks = {
      preToolUse: new Map(),
      postToolUse: new Map()
    };

    // Metrics
    this.metrics = {
      preToolUseExecutions: 0,
      postToolUseExecutions: 0,
      preToolUseBlocked: 0,
      postToolUseBlocked: 0,
      averagePreTime: 0,
      averagePostTime: 0,
      performanceViolations: 0
    };

    // Register default hooks
    this._registerDefaultHooks();
  }

  /**
   * Execute PreToolUse hooks
   * Called before any tool execution
   *
   * @param {string} toolName - Name of tool being executed
   * @param {Object} params - Tool parameters
   * @param {Object} context - Execution context
   * @returns {Object} Hook result
   */
  async executePreToolUse(toolName, params, context = {}) {
    const startTime = performance.now();
    this.metrics.preToolUseExecutions++;

    const results = {
      allowed: true,
      interventions: [],
      toolName,
      responseTime: 0
    };

    try {
      // Execute registered pre-hooks in priority order
      const hooks = this._getSortedHooks('preToolUse');

      for (const hook of hooks) {
        if (!hook.enabled) continue;

        const hookStart = performance.now();
        const result = await hook.handler(toolName, params, context);
        const hookTime = performance.now() - hookStart;

        // Track hook performance
        hook.metrics.executions++;
        hook.metrics.totalTime += hookTime;

        if (result && !result.allowed) {
          results.allowed = false;
          results.interventions.push({
            hookId: hook.id,
            reason: result.reason,
            severity: result.severity || 'HIGH',
            suggestion: result.suggestion
          });

          this.metrics.preToolUseBlocked++;

          // In strict mode, stop on first block
          if (this.options.strictMode) break;
        }
      }

    } catch (error) {
      this.emit('hookError', { phase: 'preToolUse', error: error.message });
      // Don't block on hook error, log and continue
    }

    results.responseTime = performance.now() - startTime;
    this._updateAverageTime('pre', results.responseTime);

    // Check performance target
    if (results.responseTime > this.options.preToolUseThreshold) {
      this.metrics.performanceViolations++;
      this.emit('performanceViolation', {
        phase: 'preToolUse',
        actual: results.responseTime,
        target: this.options.preToolUseThreshold
      });
    }

    this.emit('preToolUseComplete', results);
    return results;
  }

  /**
   * Execute PostToolUse hooks
   * Called after tool execution completes
   *
   * @param {string} toolName - Name of tool executed
   * @param {Object} params - Tool parameters
   * @param {Object} result - Tool execution result
   * @param {Object} context - Execution context
   * @returns {Object} Hook result
   */
  async executePostToolUse(toolName, params, result, context = {}) {
    const startTime = performance.now();
    this.metrics.postToolUseExecutions++;

    const validations = {
      valid: true,
      issues: [],
      toolName,
      responseTime: 0
    };

    try {
      // Execute registered post-hooks in priority order
      const hooks = this._getSortedHooks('postToolUse');

      for (const hook of hooks) {
        if (!hook.enabled) continue;

        const hookStart = performance.now();
        const hookResult = await hook.handler(toolName, params, result, context);
        const hookTime = performance.now() - hookStart;

        // Track hook performance
        hook.metrics.executions++;
        hook.metrics.totalTime += hookTime;

        if (hookResult) {
          if (hookResult.valid === false) {
            validations.valid = false;
            this.metrics.postToolUseBlocked++;
          }

          if (hookResult.issues?.length > 0) {
            validations.issues.push(...hookResult.issues);
          }
        }
      }

    } catch (error) {
      this.emit('hookError', { phase: 'postToolUse', error: error.message });
    }

    validations.responseTime = performance.now() - startTime;
    this._updateAverageTime('post', validations.responseTime);

    // Check performance target
    if (validations.responseTime > this.options.postToolUseThreshold) {
      this.metrics.performanceViolations++;
      this.emit('performanceViolation', {
        phase: 'postToolUse',
        actual: validations.responseTime,
        target: this.options.postToolUseThreshold
      });
    }

    this.emit('postToolUseComplete', validations);
    return validations;
  }

  /**
   * Register a custom PreToolUse hook
   *
   * @param {string} id - Hook identifier
   * @param {Function} handler - Hook handler function
   * @param {Object} options - Hook options
   */
  registerPreToolUse(id, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error(`PreToolUse hook '${id}' must be a function`);
    }

    this.hooks.preToolUse.set(id, {
      id,
      handler,
      priority: options.priority || 'MEDIUM',
      enabled: options.enabled !== false,
      metrics: { executions: 0, totalTime: 0 }
    });

    this.emit('hookRegistered', { phase: 'preToolUse', id });
    return this;
  }

  /**
   * Register a custom PostToolUse hook
   *
   * @param {string} id - Hook identifier
   * @param {Function} handler - Hook handler function
   * @param {Object} options - Hook options
   */
  registerPostToolUse(id, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error(`PostToolUse hook '${id}' must be a function`);
    }

    this.hooks.postToolUse.set(id, {
      id,
      handler,
      priority: options.priority || 'MEDIUM',
      enabled: options.enabled !== false,
      metrics: { executions: 0, totalTime: 0 }
    });

    this.emit('hookRegistered', { phase: 'postToolUse', id });
    return this;
  }

  /**
   * Enable/disable a specific hook
   */
  setHookEnabled(phase, id, enabled) {
    const hooks = this.hooks[phase];
    if (hooks?.has(id)) {
      hooks.get(id).enabled = enabled;
      this.emit('hookStateChanged', { phase, id, enabled });
    }
  }

  /**
   * Get hook metrics
   */
  getMetrics() {
    const preHookStats = Array.from(this.hooks.preToolUse.values()).map(h => ({
      id: h.id,
      executions: h.metrics.executions,
      averageTime: h.metrics.executions > 0
        ? `${(h.metrics.totalTime / h.metrics.executions).toFixed(3)}ms`
        : '0ms'
    }));

    const postHookStats = Array.from(this.hooks.postToolUse.values()).map(h => ({
      id: h.id,
      executions: h.metrics.executions,
      averageTime: h.metrics.executions > 0
        ? `${(h.metrics.totalTime / h.metrics.executions).toFixed(3)}ms`
        : '0ms'
    }));

    return {
      preToolUse: {
        executions: this.metrics.preToolUseExecutions,
        blocked: this.metrics.preToolUseBlocked,
        averageTime: `${this.metrics.averagePreTime.toFixed(3)}ms`,
        hooks: preHookStats
      },
      postToolUse: {
        executions: this.metrics.postToolUseExecutions,
        blocked: this.metrics.postToolUseBlocked,
        averageTime: `${this.metrics.averagePostTime.toFixed(3)}ms`,
        hooks: postHookStats
      },
      performanceViolations: this.metrics.performanceViolations
    };
  }

  /**
   * Register default validation hooks
   */
  _registerDefaultHooks() {
    // Security validation (PreToolUse) - CRITICAL priority
    if (this.options.enabledHooks.includes('security')) {
      this.registerPreToolUse('security-validation', async (toolName, params) => {
        // Only validate tools that modify files
        if (!['Write', 'Edit', 'Bash'].includes(toolName)) {
          return { allowed: true };
        }

        const code = this._extractCode(params);
        if (!code) return { allowed: true };

        const result = await this.validator.validatePre(code);

        if (!result.passed) {
          const critical = result.violations.filter(v => v.severity === 'CRITICAL');
          if (critical.length > 0) {
            return {
              allowed: false,
              reason: critical[0].message,
              severity: 'CRITICAL',
              suggestion: critical[0].suggestion
            };
          }
        }

        return { allowed: true };
      }, { priority: 'CRITICAL' });
    }

    // Performance validation (PreToolUse) - HIGH priority
    if (this.options.enabledHooks.includes('performance')) {
      this.registerPreToolUse('performance-validation', async (toolName, params) => {
        if (!['Write', 'Edit'].includes(toolName)) {
          return { allowed: true };
        }

        const code = this._extractCode(params);
        if (!code) return { allowed: true };

        // Check for Rust HashMap (causes 40% perf regression)
        if (/std::collections::HashMap/g.test(code)) {
          return {
            allowed: false,
            reason: 'HashMap causes 40% performance regression',
            severity: 'HIGH',
            suggestion: 'Use rustc_hash::FxHashMap instead'
          };
        }

        return { allowed: true };
      }, { priority: 'HIGH' });
    }

    // Quality validation (PostToolUse) - MEDIUM priority
    if (this.options.enabledHooks.includes('quality')) {
      this.registerPostToolUse('quality-validation', async (toolName, params, result) => {
        const code = this._extractCode(result) || this._extractCode(params);
        if (!code) return { valid: true, issues: [] };

        const validation = await this.validator.validatePost({ code });
        return {
          valid: validation.passed,
          issues: validation.issues
        };
      }, { priority: 'MEDIUM' });
    }
  }

  /**
   * Get hooks sorted by priority
   */
  _getSortedHooks(phase) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return Array.from(this.hooks[phase].values())
      .sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
  }

  /**
   * Extract code from various parameter formats
   */
  _extractCode(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (data.new_string) return data.new_string;
    if (data.content) return data.content;
    if (data.code) return data.code;
    if (data.command) return data.command;
    return null;
  }

  /**
   * Update rolling average time
   */
  _updateAverageTime(phase, newTime) {
    if (phase === 'pre') {
      const count = this.metrics.preToolUseExecutions;
      this.metrics.averagePreTime =
        ((this.metrics.averagePreTime * (count - 1)) + newTime) / count;
    } else {
      const count = this.metrics.postToolUseExecutions;
      this.metrics.averagePostTime =
        ((this.metrics.averagePostTime * (count - 1)) + newTime) / count;
    }
  }
}

export default ValidationHooks;
