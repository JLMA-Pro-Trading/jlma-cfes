/**
 * PerformanceMonitor - Real-time performance tracking
 *
 * Provides measurable performance metrics:
 * - Operation timing with sub-millisecond accuracy
 * - Memory usage tracking
 * - Throughput measurement
 * - Bottleneck detection
 *
 * All metrics are REAL measurements, no placeholders.
 */

import { EventEmitter } from 'events';

export class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      sampleInterval: options.sampleInterval || 1000, // 1 second
      historySize: options.historySize || 100,
      alertThresholds: {
        responseTime: options.responseTimeThreshold || 100, // 100ms
        memoryUsage: options.memoryThreshold || 500, // 500MB
        errorRate: options.errorRateThreshold || 0.1 // 10%
      },
      ...options
    };

    // Performance history
    this.history = {
      responseTimes: [],
      memoryUsage: [],
      throughput: [],
      errors: []
    };

    // Current stats
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      startTime: Date.now(),
      lastSampleTime: Date.now()
    };

    // Operation tracking
    this.activeOperations = new Map();
    this.operationTimings = [];

    // Start monitoring
    this._startMonitoring();
  }

  /**
   * Start tracking an operation
   *
   * @param {string} operationId - Unique operation identifier
   * @param {string} type - Operation type
   * @returns {Function} End function to call when operation completes
   */
  startOperation(operationId, type = 'default') {
    const startTime = performance.now();

    this.activeOperations.set(operationId, {
      id: operationId,
      type,
      startTime,
      startTimestamp: Date.now()
    });

    // Return end function
    return (success = true, metadata = {}) => {
      return this.endOperation(operationId, success, metadata);
    };
  }

  /**
   * End tracking an operation
   *
   * @param {string} operationId - Operation identifier
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Operation timing result
   */
  endOperation(operationId, success = true, metadata = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return null;

    const endTime = performance.now();
    const duration = endTime - operation.startTime;

    this.activeOperations.delete(operationId);

    // Update stats
    this.stats.totalOperations++;
    if (success) {
      this.stats.successfulOperations++;
    } else {
      this.stats.failedOperations++;
      this.history.errors.push({
        operationId,
        timestamp: Date.now(),
        type: operation.type,
        metadata
      });
    }

    // Store timing
    const timing = {
      operationId,
      type: operation.type,
      duration,
      success,
      timestamp: Date.now()
    };

    this.operationTimings.push(timing);

    // Keep only recent timings
    if (this.operationTimings.length > this.options.historySize) {
      this.operationTimings = this.operationTimings.slice(-this.options.historySize);
    }

    // Check threshold
    if (duration > this.options.alertThresholds.responseTime) {
      this.emit('slowOperation', {
        operationId,
        duration,
        threshold: this.options.alertThresholds.responseTime
      });
    }

    this.emit('operationComplete', timing);

    return {
      operationId,
      duration: `${duration.toFixed(3)}ms`,
      success
    };
  }

  /**
   * Get current performance metrics
   *
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.stats.startTime;
    const memory = process.memoryUsage();

    // Calculate averages from recent timings
    const recentTimings = this.operationTimings.slice(-50);
    const avgResponseTime = recentTimings.length > 0
      ? recentTimings.reduce((sum, t) => sum + t.duration, 0) / recentTimings.length
      : 0;

    const p95ResponseTime = this._calculatePercentile(
      recentTimings.map(t => t.duration),
      95
    );

    const errorRate = this.stats.totalOperations > 0
      ? this.stats.failedOperations / this.stats.totalOperations
      : 0;

    const throughput = uptime > 0
      ? (this.stats.totalOperations / (uptime / 1000)).toFixed(2)
      : 0;

    return {
      uptime: `${Math.round(uptime / 1000)}s`,
      totalOperations: this.stats.totalOperations,
      successfulOperations: this.stats.successfulOperations,
      failedOperations: this.stats.failedOperations,
      errorRate: `${(errorRate * 100).toFixed(1)}%`,
      throughput: `${throughput} ops/sec`,
      responseTime: {
        average: `${avgResponseTime.toFixed(3)}ms`,
        p95: `${p95ResponseTime.toFixed(3)}ms`
      },
      memory: {
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memory.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
      },
      activeOperations: this.activeOperations.size
    };
  }

  /**
   * Get detailed timing breakdown by operation type
   *
   * @returns {Object} Timing breakdown
   */
  getTimingBreakdown() {
    const breakdown = {};

    for (const timing of this.operationTimings) {
      if (!breakdown[timing.type]) {
        breakdown[timing.type] = {
          count: 0,
          totalTime: 0,
          min: Infinity,
          max: 0,
          successful: 0,
          failed: 0
        };
      }

      const stats = breakdown[timing.type];
      stats.count++;
      stats.totalTime += timing.duration;
      stats.min = Math.min(stats.min, timing.duration);
      stats.max = Math.max(stats.max, timing.duration);

      if (timing.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
    }

    // Calculate averages
    for (const type of Object.keys(breakdown)) {
      const stats = breakdown[type];
      stats.average = stats.count > 0 ? stats.totalTime / stats.count : 0;
      stats.averageFormatted = `${stats.average.toFixed(3)}ms`;
      stats.minFormatted = stats.min === Infinity ? 'N/A' : `${stats.min.toFixed(3)}ms`;
      stats.maxFormatted = `${stats.max.toFixed(3)}ms`;
    }

    return breakdown;
  }

  /**
   * Detect performance bottlenecks
   *
   * @returns {Array} Detected bottlenecks
   */
  detectBottlenecks() {
    const bottlenecks = [];
    const metrics = this.getMetrics();
    const breakdown = this.getTimingBreakdown();

    // Check response time
    const avgTime = parseFloat(metrics.responseTime.average);
    if (avgTime > this.options.alertThresholds.responseTime) {
      bottlenecks.push({
        type: 'slow_response',
        severity: 'HIGH',
        actual: metrics.responseTime.average,
        threshold: `${this.options.alertThresholds.responseTime}ms`,
        suggestion: 'Optimize slow operations or add caching'
      });
    }

    // Check memory usage
    const heapUsedMB = parseInt(metrics.memory.heapUsed);
    if (heapUsedMB > this.options.alertThresholds.memoryUsage) {
      bottlenecks.push({
        type: 'high_memory',
        severity: 'HIGH',
        actual: metrics.memory.heapUsed,
        threshold: `${this.options.alertThresholds.memoryUsage}MB`,
        suggestion: 'Check for memory leaks or reduce cached data'
      });
    }

    // Check error rate
    const errorRate = parseFloat(metrics.errorRate) / 100;
    if (errorRate > this.options.alertThresholds.errorRate) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'CRITICAL',
        actual: metrics.errorRate,
        threshold: `${this.options.alertThresholds.errorRate * 100}%`,
        suggestion: 'Investigate recent errors and add error handling'
      });
    }

    // Check for slow operation types
    for (const [type, stats] of Object.entries(breakdown)) {
      if (stats.average > this.options.alertThresholds.responseTime * 2) {
        bottlenecks.push({
          type: 'slow_operation_type',
          operationType: type,
          severity: 'MEDIUM',
          average: stats.averageFormatted,
          suggestion: `Optimize ${type} operations`
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Run a benchmark test
   *
   * @param {Function} operation - Operation to benchmark
   * @param {number} iterations - Number of iterations
   * @returns {Object} Benchmark results
   */
  async benchmark(operation, iterations = 100) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
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
      p99: `${sorted[Math.floor(sorted.length * 0.99)].toFixed(3)}ms`,
      throughput: `${(1000 / avg).toFixed(2)} ops/sec`
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.history = {
      responseTimes: [],
      memoryUsage: [],
      throughput: [],
      errors: []
    };

    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      startTime: Date.now(),
      lastSampleTime: Date.now()
    };

    this.operationTimings = [];
    this.activeOperations.clear();

    this.emit('reset');
  }

  /**
   * Start periodic monitoring
   */
  _startMonitoring() {
    this._monitorInterval = setInterval(() => {
      this._collectSample();
    }, this.options.sampleInterval);

    // Don't prevent process from exiting
    if (this._monitorInterval.unref) {
      this._monitorInterval.unref();
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
    this.emit('stopped');
  }

  /**
   * Collect a performance sample
   */
  _collectSample() {
    const memory = process.memoryUsage();
    const now = Date.now();

    // Calculate throughput since last sample
    const elapsed = (now - this.stats.lastSampleTime) / 1000;
    const recentOps = this.operationTimings.filter(
      t => t.timestamp > this.stats.lastSampleTime
    ).length;
    const throughput = elapsed > 0 ? recentOps / elapsed : 0;

    // Store samples
    this.history.memoryUsage.push({
      timestamp: now,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal
    });

    this.history.throughput.push({
      timestamp: now,
      value: throughput
    });

    // Keep history bounded
    for (const key of Object.keys(this.history)) {
      if (this.history[key].length > this.options.historySize) {
        this.history[key] = this.history[key].slice(-this.options.historySize);
      }
    }

    this.stats.lastSampleTime = now;

    this.emit('sample', {
      memory: memory.heapUsed,
      throughput,
      timestamp: now
    });
  }

  /**
   * Calculate percentile from array
   */
  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (percentile / 100));
    return sorted[Math.min(index, sorted.length - 1)];
  }
}

export default PerformanceMonitor;
