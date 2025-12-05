/**
 * EnhancementCore - Core engine for JLMA-CFES
 *
 * Provides the foundational enhancement capabilities:
 * - Session management
 * - Health monitoring
 * - Feature flag management
 * - Error handling with circuit breaker
 */

import { EventEmitter } from 'events';

export class EnhancementCore extends EventEmitter {
  constructor(options = {}) {
    super();

    this.version = '3.0.0';
    this.initialized = false;
    this.state = 'idle';

    // Configuration
    this.config = {
      maxConcurrentOps: options.maxConcurrentOps || 10,
      operationTimeout: options.operationTimeout || 30000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 0.5,
      circuitBreakerReset: options.circuitBreakerReset || 60000,
      ...options
    };

    // State tracking
    this.activeOperations = new Map();
    this.operationHistory = [];

    // Health metrics (all real, no placeholders)
    this.health = {
      startTime: Date.now(),
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      lastOperationTime: null,
      circuitBreakerOpen: false,
      circuitBreakerOpenedAt: null
    };

    // Feature flags
    this.features = {
      validation: true,
      monitoring: true,
      circuitBreaker: true,
      autoRecovery: true
    };

    this._initialize();
  }

  /**
   * Initialize core systems
   */
  _initialize() {
    this.initialized = true;
    this.state = 'ready';

    // Set up periodic health checks
    this._healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, 10000);

    // Set up graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));

    this.emit('initialized', { version: this.version });
  }

  /**
   * Start a tracked operation
   * @param {string} operationType - Type of operation
   * @param {Object} metadata - Operation metadata
   * @returns {Object} Operation handle
   */
  startOperation(operationType, metadata = {}) {
    // Check circuit breaker
    if (this.health.circuitBreakerOpen) {
      throw new Error('Circuit breaker open - system protecting against cascading failures');
    }

    // Check capacity
    if (this.activeOperations.size >= this.config.maxConcurrentOps) {
      throw new Error(`Max concurrent operations (${this.config.maxConcurrentOps}) reached`);
    }

    const operationId = this._generateId();
    const operation = {
      id: operationId,
      type: operationType,
      startTime: performance.now(),
      startTimestamp: Date.now(),
      metadata,
      state: 'running'
    };

    this.activeOperations.set(operationId, operation);
    this.health.totalOperations++;

    // Set timeout for operation
    operation.timeoutId = setTimeout(() => {
      this.failOperation(operationId, 'Operation timeout');
    }, this.config.operationTimeout);

    this.emit('operationStarted', { operationId, type: operationType });

    return {
      id: operationId,
      complete: (result) => this.completeOperation(operationId, result),
      fail: (error) => this.failOperation(operationId, error)
    };
  }

  /**
   * Complete an operation successfully
   * @param {string} operationId - Operation ID
   * @param {Object} result - Operation result
   */
  completeOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    clearTimeout(operation.timeoutId);

    operation.state = 'completed';
    operation.endTime = performance.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.result = result;

    this.activeOperations.delete(operationId);
    this._archiveOperation(operation);

    this.health.successfulOperations++;
    this.health.lastOperationTime = operation.duration;

    // Reset circuit breaker on success
    if (this.health.circuitBreakerOpen) {
      this._resetCircuitBreaker();
    }

    this.emit('operationCompleted', {
      operationId,
      duration: `${operation.duration.toFixed(2)}ms`
    });

    return operation;
  }

  /**
   * Fail an operation
   * @param {string} operationId - Operation ID
   * @param {string} error - Error message
   */
  failOperation(operationId, error) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    clearTimeout(operation.timeoutId);

    operation.state = 'failed';
    operation.endTime = performance.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.error = error;

    this.activeOperations.delete(operationId);
    this._archiveOperation(operation);

    this.health.failedOperations++;

    // Check circuit breaker
    this._checkCircuitBreaker();

    this.emit('operationFailed', { operationId, error });

    return operation;
  }

  /**
   * Get current health status
   * @returns {Object} Health metrics
   */
  getHealth() {
    const uptime = Date.now() - this.health.startTime;
    const failureRate = this.health.totalOperations > 0
      ? this.health.failedOperations / this.health.totalOperations
      : 0;

    return {
      state: this.state,
      uptime: `${Math.round(uptime / 1000)}s`,
      totalOperations: this.health.totalOperations,
      successfulOperations: this.health.successfulOperations,
      failedOperations: this.health.failedOperations,
      successRate: `${((1 - failureRate) * 100).toFixed(1)}%`,
      activeOperations: this.activeOperations.size,
      circuitBreakerOpen: this.health.circuitBreakerOpen,
      lastOperationTime: this.health.lastOperationTime
        ? `${this.health.lastOperationTime.toFixed(2)}ms`
        : null,
      memoryUsage: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    };
  }

  /**
   * Enable/disable a feature
   * @param {string} feature - Feature name
   * @param {boolean} enabled - Enable state
   */
  setFeature(feature, enabled) {
    if (feature in this.features) {
      this.features[feature] = enabled;
      this.emit('featureChanged', { feature, enabled });
    }
  }

  /**
   * Graceful shutdown
   * @param {string} signal - Shutdown signal
   */
  async shutdown(signal) {
    this.state = 'shutting_down';
    this.emit('shutdown', { signal });

    // Clear intervals
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
    }

    // Wait for active operations to complete (with timeout)
    const shutdownTimeout = 5000;
    const shutdownStart = Date.now();

    while (this.activeOperations.size > 0) {
      if (Date.now() - shutdownStart > shutdownTimeout) {
        // Force fail remaining operations
        for (const [id] of this.activeOperations) {
          this.failOperation(id, 'Forced shutdown');
        }
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.state = 'shutdown';
    this.emit('shutdownComplete');
  }

  /**
   * Perform periodic health check
   */
  _performHealthCheck() {
    const health = this.getHealth();

    // Emit health event for monitoring
    this.emit('healthCheck', health);

    // Check for unhealthy state
    if (parseFloat(health.successRate) < 50 && health.totalOperations > 10) {
      this.emit('healthWarning', {
        reason: 'Low success rate',
        successRate: health.successRate
      });
    }
  }

  /**
   * Check if circuit breaker should open
   */
  _checkCircuitBreaker() {
    if (!this.features.circuitBreaker) return;

    const failureRate = this.health.totalOperations > 0
      ? this.health.failedOperations / this.health.totalOperations
      : 0;

    if (failureRate > this.config.circuitBreakerThreshold &&
        this.health.totalOperations >= 5) {
      this._openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  _openCircuitBreaker() {
    if (this.health.circuitBreakerOpen) return;

    this.health.circuitBreakerOpen = true;
    this.health.circuitBreakerOpenedAt = Date.now();

    this.emit('circuitBreakerOpened', {
      failedOperations: this.health.failedOperations,
      totalOperations: this.health.totalOperations
    });

    // Auto-reset after timeout
    if (this.features.autoRecovery) {
      setTimeout(() => {
        this._resetCircuitBreaker();
      }, this.config.circuitBreakerReset);
    }
  }

  /**
   * Reset circuit breaker
   */
  _resetCircuitBreaker() {
    this.health.circuitBreakerOpen = false;
    this.health.circuitBreakerOpenedAt = null;

    // Reset failure count to give fresh start
    this.health.failedOperations = 0;
    this.health.totalOperations = 0;
    this.health.successfulOperations = 0;

    this.emit('circuitBreakerReset');
  }

  /**
   * Archive completed/failed operation
   */
  _archiveOperation(operation) {
    this.operationHistory.push(operation);

    // Keep only last 100 operations
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100);
    }
  }

  /**
   * Generate unique operation ID
   */
  _generateId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}

export default EnhancementCore;
