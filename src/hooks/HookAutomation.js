/**
 * HookAutomation - Extended Hook System for claude-flow Integration
 *
 * Based on .claude/skills/hooks-automation/SKILL.md
 *
 * Extends ValidationHooks with:
 * - Session management (start, restore, end)
 * - Memory coordination protocol
 * - Agent spawning automation
 * - Neural pattern training hooks
 * - Git integration hooks
 *
 * This bridges jlma-cfes with claude-flow's hook system.
 */

import { EventEmitter } from 'events';
import { ValidationHooks } from './ValidationHooks.js';
import { spawn } from 'child_process';

export class HookAutomation extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      claudeFlowPath: options.claudeFlowPath || 'npx',
      claudeFlowPackage: options.claudeFlowPackage || 'claude-flow@alpha',
      enableMemoryCoordination: options.enableMemoryCoordination !== false,
      enableNeuralTraining: options.enableNeuralTraining || false,
      sessionId: options.sessionId || `session_${Date.now()}`,
      ...options
    };

    // Core validation hooks
    this.validationHooks = new ValidationHooks({
      performanceThreshold: options.performanceThreshold || 1.0,
      strictMode: options.strictMode || false
    });

    // Session state
    this.session = {
      id: this.options.sessionId,
      startTime: null,
      active: false,
      memoryKeys: [],
      agentsSpawned: [],
      editsTracked: 0
    };

    // Hook execution history
    this.hookHistory = [];
  }

  /**
   * Start a new session
   * Coordinates with claude-flow session-start hook
   *
   * @param {Object} options - Session options
   * @returns {Object} Session info
   */
  async sessionStart(options = {}) {
    const sessionId = options.sessionId || this.options.sessionId;

    this.session = {
      id: sessionId,
      startTime: Date.now(),
      active: true,
      memoryKeys: [],
      agentsSpawned: [],
      editsTracked: 0
    };

    // Execute claude-flow session start hook
    if (options.loadContext !== false) {
      await this._executeClaudeFlowHook('session-start', {
        '--session-id': sessionId,
        '--load-context': options.loadContext !== false
      });
    }

    this._trackHook('session-start', { sessionId });
    this.emit('sessionStarted', this.session);

    return {
      sessionId,
      startTime: new Date(this.session.startTime).toISOString(),
      memoryProtocol: this._getMemoryProtocol()
    };
  }

  /**
   * Restore a previous session
   *
   * @param {string} sessionId - Session to restore
   * @param {Object} options - Restore options
   * @returns {Object} Restored session info
   */
  async sessionRestore(sessionId, options = {}) {
    await this._executeClaudeFlowHook('session-restore', {
      '--session-id': sessionId,
      '--restore-memory': options.restoreMemory !== false,
      '--restore-agents': options.restoreAgents || false
    });

    this.session.id = sessionId;
    this.session.active = true;
    this.session.startTime = Date.now();

    this._trackHook('session-restore', { sessionId });
    this.emit('sessionRestored', { sessionId });

    return {
      restored: true,
      sessionId,
      memoryRestored: options.restoreMemory !== false
    };
  }

  /**
   * End current session with state persistence
   *
   * @param {Object} options - End options
   * @returns {Object} Session summary
   */
  async sessionEnd(options = {}) {
    if (!this.session.active) {
      return { ended: false, reason: 'No active session' };
    }

    const duration = Date.now() - this.session.startTime;

    // Execute claude-flow session end hook
    await this._executeClaudeFlowHook('session-end', {
      '--session-id': this.session.id,
      '--save-state': options.saveState !== false,
      '--export-metrics': options.exportMetrics || false,
      '--generate-summary': options.generateSummary || false,
      '--cleanup-temp': options.cleanupTemp || false
    });

    const summary = {
      ended: true,
      sessionId: this.session.id,
      duration: `${Math.round(duration / 1000)}s`,
      editsTracked: this.session.editsTracked,
      agentsSpawned: this.session.agentsSpawned.length,
      memoryKeysUsed: this.session.memoryKeys.length,
      hooksExecuted: this.hookHistory.length
    };

    this._trackHook('session-end', summary);
    this.emit('sessionEnded', summary);

    this.session.active = false;

    return summary;
  }

  /**
   * Pre-edit hook with agent auto-assignment
   *
   * @param {string} filePath - File being edited
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async preEdit(filePath, options = {}) {
    const startTime = performance.now();

    // Run validation hooks first
    const validationResult = await this.validationHooks.executePreToolUse(
      'Edit',
      { file_path: filePath },
      {}
    );

    // Execute claude-flow pre-edit hook
    await this._executeClaudeFlowHook('pre-edit', {
      '--file': filePath,
      '--auto-assign-agent': options.autoAssignAgent !== false,
      '--validate-syntax': options.validateSyntax || false,
      '--backup-file': options.backupFile || false
    });

    const result = {
      allowed: validationResult.allowed,
      file: filePath,
      agentAssigned: this._determineAgent(filePath),
      validationTime: `${(performance.now() - startTime).toFixed(2)}ms`,
      interventions: validationResult.interventions
    };

    this._trackHook('pre-edit', { file: filePath, result });
    return result;
  }

  /**
   * Post-edit hook with memory storage and neural training
   *
   * @param {string} filePath - File that was edited
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async postEdit(filePath, options = {}) {
    const startTime = performance.now();
    this.session.editsTracked++;

    // Run post-validation
    const validationResult = await this.validationHooks.executePostToolUse(
      'Edit',
      { file_path: filePath },
      { success: true },
      {}
    );

    // Memory key for this edit
    const memoryKey = options.memoryKey || `edits/${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
    this.session.memoryKeys.push(memoryKey);

    // Execute claude-flow post-edit hook
    await this._executeClaudeFlowHook('post-edit', {
      '--file': filePath,
      '--memory-key': memoryKey,
      '--auto-format': options.autoFormat !== false,
      '--train-patterns': this.options.enableNeuralTraining
    });

    const result = {
      file: filePath,
      memoryKey,
      formatted: options.autoFormat !== false,
      patternsTrained: this.options.enableNeuralTraining,
      validationResult,
      responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
    };

    this._trackHook('post-edit', { file: filePath, result });
    this.emit('editCompleted', result);

    return result;
  }

  /**
   * Pre-task hook with agent spawning
   *
   * @param {string} description - Task description
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async preTask(description, options = {}) {
    // Execute claude-flow pre-task hook
    await this._executeClaudeFlowHook('pre-task', {
      '--description': description,
      '--auto-spawn-agents': options.autoSpawnAgents !== false,
      '--load-memory': options.loadMemory || false,
      '--optimize-topology': options.optimizeTopology || false
    });

    // Determine required agents
    const agents = this._determineAgents(description);
    this.session.agentsSpawned.push(...agents);

    const result = {
      task: description,
      agentsToSpawn: agents,
      memoryLoaded: options.loadMemory || false,
      topologyOptimized: options.optimizeTopology || false
    };

    this._trackHook('pre-task', { description, result });
    return result;
  }

  /**
   * Post-task hook with metrics and learning
   *
   * @param {string} taskId - Task identifier
   * @param {Object} options - Hook options
   * @returns {Object} Hook result
   */
  async postTask(taskId, options = {}) {
    await this._executeClaudeFlowHook('post-task', {
      '--task-id': taskId,
      '--analyze-performance': options.analyzePerformance !== false,
      '--store-decisions': options.storeDecisions || false,
      '--export-learnings': options.exportLearnings || false
    });

    const result = {
      taskId,
      performanceAnalyzed: options.analyzePerformance !== false,
      decisionsStored: options.storeDecisions || false,
      learningsExported: options.exportLearnings || false
    };

    this._trackHook('post-task', { taskId, result });
    return result;
  }

  /**
   * Notify hook for broadcasting messages
   *
   * @param {string} message - Message to broadcast
   * @param {Object} options - Notification options
   */
  async notify(message, options = {}) {
    await this._executeClaudeFlowHook('notify', {
      '--message': message,
      '--level': options.level || 'info',
      '--swarm-status': options.swarmStatus !== false,
      '--broadcast': options.broadcast || false
    });

    this._trackHook('notify', { message, level: options.level || 'info' });
    this.emit('notification', { message, level: options.level || 'info' });
  }

  /**
   * Get validation hooks metrics
   */
  getMetrics() {
    return {
      session: {
        id: this.session.id,
        active: this.session.active,
        duration: this.session.startTime
          ? `${Math.round((Date.now() - this.session.startTime) / 1000)}s`
          : null,
        editsTracked: this.session.editsTracked,
        agentsSpawned: this.session.agentsSpawned.length,
        memoryKeys: this.session.memoryKeys.length
      },
      hooks: {
        executed: this.hookHistory.length,
        byType: this._getHooksByType()
      },
      validation: this.validationHooks.getMetrics()
    };
  }

  /**
   * Execute claude-flow hook command
   */
  async _executeClaudeFlowHook(hookName, options) {
    return new Promise((resolve, reject) => {
      const args = [this.options.claudeFlowPackage, 'hooks', hookName];

      for (const [key, value] of Object.entries(options)) {
        if (value === true) {
          args.push(key);
        } else if (value !== false && value !== undefined) {
          args.push(key, String(value));
        }
      }

      const proc = spawn(this.options.claudeFlowPath, args, {
        timeout: 10000
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data; });
      proc.stderr?.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          // Don't fail on hook errors, just log
          console.warn(`Hook ${hookName} warning: ${stderr || code}`);
          resolve(null);
        }
      });

      proc.on('error', (error) => {
        // Don't fail on hook errors
        console.warn(`Hook ${hookName} error: ${error.message}`);
        resolve(null);
      });
    });
  }

  /**
   * Track hook execution
   */
  _trackHook(hookName, data) {
    this.hookHistory.push({
      hook: hookName,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get hooks grouped by type
   */
  _getHooksByType() {
    const byType = {};
    for (const entry of this.hookHistory) {
      byType[entry.hook] = (byType[entry.hook] || 0) + 1;
    }
    return byType;
  }

  /**
   * Determine best agent for file type
   */
  _determineAgent(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();

    const agentMap = {
      'js': 'coder',
      'ts': 'coder',
      'jsx': 'coder',
      'tsx': 'coder',
      'py': 'coder',
      'rs': 'coder',
      'go': 'coder',
      'test.js': 'tester',
      'test.ts': 'tester',
      'spec.js': 'tester',
      'spec.ts': 'tester',
      'md': 'documenter',
      'json': 'coder',
      'yaml': 'coder',
      'yml': 'coder',
      'sql': 'backend-dev'
    };

    // Check for test files first
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 'tester';
    }

    return agentMap[ext] || 'coder';
  }

  /**
   * Determine agents needed for task
   */
  _determineAgents(description) {
    const agents = ['coordinator'];
    const desc = description.toLowerCase();

    if (desc.includes('test') || desc.includes('tdd')) {
      agents.push('tester');
    }
    if (desc.includes('api') || desc.includes('backend') || desc.includes('server')) {
      agents.push('backend-dev');
    }
    if (desc.includes('ui') || desc.includes('frontend') || desc.includes('component')) {
      agents.push('coder');
    }
    if (desc.includes('review') || desc.includes('quality')) {
      agents.push('reviewer');
    }
    if (desc.includes('document') || desc.includes('readme')) {
      agents.push('documenter');
    }
    if (desc.includes('architect') || desc.includes('design')) {
      agents.push('system-architect');
    }

    // Always include coder if no specific role matched
    if (agents.length === 1) {
      agents.push('coder');
    }

    return [...new Set(agents)];
  }

  /**
   * Get memory protocol template
   */
  _getMemoryProtocol() {
    return {
      namespace: `session/${this.session.id}`,
      commands: {
        store: 'mcp__claude-flow__memory_usage { action: "store", ... }',
        retrieve: 'mcp__claude-flow__memory_usage { action: "retrieve", ... }',
        search: 'mcp__claude-flow__memory_search { pattern: "..." }'
      }
    };
  }
}

export default HookAutomation;
