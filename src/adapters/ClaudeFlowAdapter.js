/**
 * ClaudeFlowAdapter - Integration layer for claude-flow MCP tools
 *
 * Provides enhancement wrapper around claude-flow operations:
 * - Pre-validation before task orchestration
 * - Post-validation after agent completion
 * - Performance monitoring and metrics
 *
 * Uses claude-flow MCP tools:
 * - swarm_init, agent_spawn, task_orchestrate
 * - memory_usage, neural_status
 * - performance_report, bottleneck_analyze
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';

export class ClaudeFlowAdapter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      claudeFlowPath: options.claudeFlowPath || 'npx',
      claudeFlowPackage: options.claudeFlowPackage || 'claude-flow@alpha',
      timeout: options.timeout || 30000,
      enableValidation: options.enableValidation !== false,
      ...options
    };

    this.connected = false;
    this.activeSwarm = null;

    // Metrics tracking
    this.metrics = {
      tasksOrchestrated: 0,
      agentsSpawned: 0,
      totalValidations: 0,
      blockedOperations: 0,
      averageTaskTime: 0
    };
  }

  /**
   * Connect to claude-flow
   * Verifies claude-flow is available
   */
  async connect() {
    try {
      // Verify claude-flow is accessible
      const version = await this._runCommand(['--version']);
      this.connected = true;

      this.emit('connected', { version: version.trim() });
      return { connected: true, version: version.trim() };
    } catch (error) {
      // Don't fail if claude-flow not available, work in standalone mode
      this.connected = false;
      this.emit('connectionFailed', { error: error.message });
      return { connected: false, error: error.message };
    }
  }

  /**
   * Initialize a swarm with specified topology
   *
   * @param {Object} options - Swarm configuration
   * @returns {Object} Swarm initialization result
   */
  async initSwarm(options = {}) {
    const config = {
      topology: options.topology || 'mesh',
      maxAgents: options.maxAgents || 8,
      strategy: options.strategy || 'balanced'
    };

    try {
      // If connected to claude-flow, use MCP tool
      if (this.connected) {
        const result = await this._runCommand([
          'mcp', 'swarm_init',
          '--topology', config.topology,
          '--max-agents', String(config.maxAgents),
          '--strategy', config.strategy
        ]);

        this.activeSwarm = {
          id: `swarm_${Date.now()}`,
          config,
          startTime: Date.now()
        };

        this.emit('swarmInitialized', this.activeSwarm);
        return { success: true, swarm: this.activeSwarm };
      }

      // Standalone mode - track internally
      this.activeSwarm = {
        id: `swarm_${Date.now()}`,
        config,
        startTime: Date.now(),
        mode: 'standalone'
      };

      return { success: true, swarm: this.activeSwarm, mode: 'standalone' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Orchestrate a task with validation
   *
   * @param {string} task - Task description
   * @param {Object} options - Orchestration options
   * @returns {Object} Orchestration result
   */
  async orchestrate(task, options = {}) {
    const startTime = performance.now();
    this.metrics.tasksOrchestrated++;

    const config = {
      strategy: options.strategy || 'adaptive',
      priority: options.priority || 'medium',
      maxAgents: options.maxAgents || 5,
      preValidation: options.preValidation,
      postValidation: options.postValidation,
      maxRetries: options.maxRetries || 3 // Default to 3 retries
    };

    let currentTask = task;
    let attempts = 0;
    let lastResult = null;
    let success = false;

    // Pre-validation (only runs once at the start)
    if (config.preValidation && typeof config.preValidation === 'function') {
      this.metrics.totalValidations++;
      const preResult = await config.preValidation(currentTask);
      if (preResult && !preResult.passed) {
        this.metrics.blockedOperations++;
        return {
          success: false,
          blocked: true,
          reason: preResult.violations?.[0]?.message || 'Pre-validation failed',
          responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
        };
      }
    }

    // Execution Loop
    while (attempts <= config.maxRetries) {
      attempts++;

      try {
        let result;

        if (this.connected) {
          // Use claude-flow MCP tool
          const output = await this._runCommand([
            'mcp', 'task_orchestrate',
            '--task', currentTask,
            '--strategy', config.strategy,
            '--priority', config.priority,
            '--max-agents', String(config.maxAgents)
          ]);

          result = this._parseOutput(output);
        } else {
          // Standalone mode - return structured response
          result = {
            success: true,
            task: currentTask,
            strategy: config.strategy,
            mode: 'standalone',
            message: 'Task logged (claude-flow not connected)'
          };
        }

        lastResult = result;

        // Post-validation
        if (config.postValidation && typeof config.postValidation === 'function') {
          this.metrics.totalValidations++;
          const postResult = await config.postValidation(result);

          if (postResult && !postResult.passed) {
            // Validation failed
            result.qualityIssues = postResult.issues;

            // If we have retries left, prepare feedback for next attempt
            if (attempts <= config.maxRetries) {
              const issuesText = postResult.issues
                .map(i => `- ${i.message} (${i.suggestion || 'Fix this'})`)
                .join('\n');

              const feedback = `\n\n[QUALITY FEEDBACK - PLEASE FIX]:\nThe previous attempt had the following issues:\n${issuesText}\n\nPlease correct these issues in the next attempt.`;

              // Update task with feedback
              // If task already has feedback, append to it or replace the last feedback block
              if (currentTask.includes('[QUALITY FEEDBACK - PLEASE FIX]:')) {
                currentTask = currentTask.split('[QUALITY FEEDBACK - PLEASE FIX]:')[0] + feedback;
              } else {
                currentTask += feedback;
              }

              continue; // Retry loop
            }
          } else {
            // Validation passed!
            success = true;
            break; // Exit loop
          }
        } else {
          // No validation configured, assume success
          success = true;
          break;
        }

      } catch (error) {
        return {
          success: false,
          error: error.message,
          responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
        };
      }
    }

    const taskTime = performance.now() - startTime;
    this._updateAverageTaskTime(taskTime);

    return {
      ...lastResult,
      attempts,
      maxRetries: config.maxRetries,
      finalStatus: success ? 'success' : 'max_retries_exceeded',
      responseTime: `${taskTime.toFixed(2)}ms`
    };
  }

  /**
   * Spawn an agent with specified type
   *
   * @param {Object} options - Agent configuration
   * @returns {Object} Agent spawn result
   */
  async spawnAgent(options = {}) {
    const config = {
      type: options.type || 'coder',
      name: options.name || `agent_${Date.now()}`,
      capabilities: options.capabilities || []
    };

    this.metrics.agentsSpawned++;

    try {
      if (this.connected) {
        const output = await this._runCommand([
          'mcp', 'agent_spawn',
          '--type', config.type,
          '--name', config.name
        ]);

        return {
          success: true,
          agent: { ...config, id: `agent_${Date.now()}` },
          output: this._parseOutput(output)
        };
      }

      return {
        success: true,
        agent: { ...config, id: `agent_${Date.now()}` },
        mode: 'standalone'
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Store data in memory system
   *
   * @param {string} key - Memory key
   * @param {any} value - Value to store
   * @param {Object} options - Storage options
   */
  async storeMemory(key, value, options = {}) {
    const config = {
      namespace: options.namespace || 'jlma-cfes',
      ttl: options.ttl || 3600
    };

    try {
      if (this.connected) {
        await this._runCommand([
          'mcp', 'memory_usage',
          '--action', 'store',
          '--key', key,
          '--value', JSON.stringify(value),
          '--namespace', config.namespace,
          '--ttl', String(config.ttl)
        ]);

        return { success: true, key, namespace: config.namespace };
      }

      return { success: true, key, mode: 'standalone' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Retrieve data from memory system
   *
   * @param {string} key - Memory key
   * @param {Object} options - Retrieval options
   */
  async retrieveMemory(key, options = {}) {
    const namespace = options.namespace || 'jlma-cfes';

    try {
      if (this.connected) {
        const output = await this._runCommand([
          'mcp', 'memory_usage',
          '--action', 'retrieve',
          '--key', key,
          '--namespace', namespace
        ]);

        return { success: true, key, value: this._parseOutput(output) };
      }

      return { success: false, mode: 'standalone', message: 'Memory not available in standalone' };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(options = {}) {
    const timeframe = options.timeframe || '24h';

    try {
      if (this.connected) {
        const output = await this._runCommand([
          'mcp', 'performance_report',
          '--timeframe', timeframe
        ]);

        return { success: true, report: this._parseOutput(output) };
      }

      // Return local metrics in standalone mode
      return {
        success: true,
        mode: 'standalone',
        report: this.getMetrics()
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get adapter metrics
   */
  getMetrics() {
    return {
      connected: this.connected,
      activeSwarm: this.activeSwarm?.id || null,
      tasksOrchestrated: this.metrics.tasksOrchestrated,
      agentsSpawned: this.metrics.agentsSpawned,
      totalValidations: this.metrics.totalValidations,
      blockedOperations: this.metrics.blockedOperations,
      averageTaskTime: `${this.metrics.averageTaskTime.toFixed(2)}ms`
    };
  }

  /**
   * Run claude-flow command
   */
  async _runCommand(args) {
    return new Promise((resolve, reject) => {
      const fullArgs = [this.options.claudeFlowPackage, ...args];
      const proc = spawn(this.options.claudeFlowPath, fullArgs, {
        timeout: this.options.timeout
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data; });
      proc.stderr?.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Parse command output
   */
  _parseOutput(output) {
    try {
      return JSON.parse(output);
    } catch {
      return output.trim();
    }
  }

  /**
   * Update average task time
   */
  _updateAverageTaskTime(newTime) {
    const count = this.metrics.tasksOrchestrated;
    this.metrics.averageTaskTime =
      ((this.metrics.averageTaskTime * (count - 1)) + newTime) / count;
  }
}

export default ClaudeFlowAdapter;
