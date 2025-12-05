/**
 * TruthScoring - Verification & Quality Assurance System
 *
 * Based on .claude/skills/verification-quality/SKILL.md
 *
 * Provides:
 * - Truth scoring (0.0-1.0 scale) for code, agents, and tasks
 * - Verification checks with automatic rollback support
 * - Quality metrics with trends and confidence intervals
 * - CI/CD export capabilities
 *
 * Performance targets:
 * - Single file check: <100ms
 * - Truth score calculation: <50ms
 * - Rollback: <1s
 */

import { EventEmitter } from 'events';
import { PatternValidator } from './PatternValidator.js';

export class TruthScoring extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      threshold: options.threshold || 0.95, // Default: 95% accuracy required
      warningThreshold: options.warningThreshold || 0.85,
      criticalThreshold: options.criticalThreshold || 0.75,
      autoRollback: options.autoRollback !== false,
      ...options
    };

    // Core validator for pattern detection
    this.validator = new PatternValidator();

    // Score history for trend analysis
    this.scoreHistory = [];

    // Metrics tracking
    this.metrics = {
      totalScores: 0,
      passedCount: 0,
      failedCount: 0,
      averageScore: 0,
      rollbackCount: 0
    };
  }

  /**
   * Calculate truth score for code
   * Target: <50ms
   *
   * @param {string} code - Code to score
   * @param {Object} context - Scoring context
   * @returns {Object} Truth score result
   */
  async calculateScore(code, context = {}) {
    const startTime = performance.now();

    try {
      // Run validation checks
      const preResult = await this.validator.validatePre(code);
      const postResult = await this.validator.validatePost({ code });

      // Calculate component scores
      const securityScore = this._calculateSecurityScore(preResult);
      const qualityScore = postResult.qualityScore / 100;
      const performanceScore = preResult.performanceCompliant ? 1.0 : 0.8;

      // Weighted average (security weighted highest)
      const weights = { security: 0.5, quality: 0.3, performance: 0.2 };
      const overallScore =
        (securityScore * weights.security) +
        (qualityScore * weights.quality) +
        (performanceScore * weights.performance);

      const result = {
        overallScore: Math.round(overallScore * 1000) / 1000,
        passed: overallScore >= this.options.threshold,
        threshold: this.options.threshold,
        components: {
          security: Math.round(securityScore * 1000) / 1000,
          quality: Math.round(qualityScore * 1000) / 1000,
          performance: Math.round(performanceScore * 1000) / 1000
        },
        status: this._getScoreStatus(overallScore),
        violations: preResult.violations || [],
        issues: postResult.issues || [],
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };

      // Track metrics
      this._trackScore(result);

      return result;

    } catch (error) {
      return {
        overallScore: 0,
        passed: false,
        error: error.message,
        responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };
    }
  }

  /**
   * Verify code meets quality threshold
   * Target: <100ms
   *
   * @param {string} code - Code to verify
   * @param {Object} options - Verification options
   * @returns {Object} Verification result
   */
  async verify(code, options = {}) {
    const threshold = options.threshold || this.options.threshold;
    const score = await this.calculateScore(code);

    const result = {
      ...score,
      verified: score.overallScore >= threshold,
      threshold,
      checks: {
        codeCorrectness: score.components.security >= 0.9,
        security: score.violations.filter(v => v.severity === 'CRITICAL').length === 0,
        performance: score.components.performance >= 0.8,
        quality: score.components.quality >= 0.7
      }
    };

    // Emit events for monitoring
    if (result.verified) {
      this.emit('verificationPassed', result);
    } else {
      this.emit('verificationFailed', result);

      if (this.options.autoRollback && options.rollbackFn) {
        await this._performRollback(options.rollbackFn, result);
      }
    }

    return result;
  }

  /**
   * Get truth metrics dashboard data
   *
   * @param {Object} options - Dashboard options
   * @returns {Object} Dashboard data
   */
  getDashboard(options = {}) {
    const period = options.period || '24h';
    const recentScores = this._getRecentScores(period);

    const avgScore = recentScores.length > 0
      ? recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length
      : 0;

    const trend = this._calculateTrend(recentScores);

    return {
      overallScore: Math.round(avgScore * 1000) / 1000,
      status: this._getScoreStatus(avgScore),
      trend: trend.direction,
      trendPercent: `${trend.percent > 0 ? '+' : ''}${trend.percent.toFixed(1)}%`,
      period,
      statistics: {
        total: this.metrics.totalScores,
        passed: this.metrics.passedCount,
        failed: this.metrics.failedCount,
        passRate: this.metrics.totalScores > 0
          ? `${((this.metrics.passedCount / this.metrics.totalScores) * 100).toFixed(1)}%`
          : '0%',
        rollbacks: this.metrics.rollbackCount
      },
      thresholds: {
        excellent: '≥0.95 ⭐',
        good: '0.85-0.94 ✅',
        warning: '0.75-0.84 ⚠️',
        critical: '<0.75 ❌'
      },
      recentScores: recentScores.slice(0, 10).map(s => ({
        score: s.overallScore,
        status: s.status,
        timestamp: s.timestamp
      }))
    };
  }

  /**
   * Export metrics for CI/CD integration
   *
   * @param {string} format - Export format (json, summary)
   * @returns {Object|string} Exported metrics
   */
  export(format = 'json') {
    const data = {
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      dashboard: this.getDashboard(),
      history: this.scoreHistory.slice(-100)
    };

    if (format === 'summary') {
      return `Truth Score: ${data.dashboard.overallScore} (${data.dashboard.status})
Pass Rate: ${data.dashboard.statistics.passRate}
Trend: ${data.dashboard.trendPercent} (${data.dashboard.trend})
Total Checks: ${data.dashboard.statistics.total}`;
    }

    return data;
  }

  /**
   * Calculate security score from validation result
   */
  _calculateSecurityScore(preResult) {
    if (preResult.passed && preResult.violations.length === 0) {
      return 1.0;
    }

    const criticalCount = preResult.violations.filter(v => v.severity === 'CRITICAL').length;
    const highCount = preResult.violations.filter(v => v.severity === 'HIGH').length;
    const mediumCount = preResult.violations.filter(v => v.severity === 'MEDIUM').length;

    // Deduct points for violations
    let score = 1.0;
    score -= criticalCount * 0.3; // Critical: -30% each
    score -= highCount * 0.15;    // High: -15% each
    score -= mediumCount * 0.05;  // Medium: -5% each

    return Math.max(0, score);
  }

  /**
   * Get score status based on thresholds
   */
  _getScoreStatus(score) {
    if (score >= 0.95) return 'excellent';
    if (score >= this.options.warningThreshold) return 'good';
    if (score >= this.options.criticalThreshold) return 'warning';
    return 'critical';
  }

  /**
   * Track score for metrics and history
   */
  _trackScore(result) {
    this.metrics.totalScores++;

    if (result.passed) {
      this.metrics.passedCount++;
    } else {
      this.metrics.failedCount++;
    }

    // Update rolling average
    this.metrics.averageScore =
      ((this.metrics.averageScore * (this.metrics.totalScores - 1)) + result.overallScore) /
      this.metrics.totalScores;

    // Add to history
    this.scoreHistory.push({
      ...result,
      timestamp: Date.now()
    });

    // Keep history bounded
    if (this.scoreHistory.length > 1000) {
      this.scoreHistory = this.scoreHistory.slice(-1000);
    }
  }

  /**
   * Get recent scores for period
   */
  _getRecentScores(period) {
    const periodMs = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    }[period] || 86400000;

    const cutoff = Date.now() - periodMs;
    return this.scoreHistory.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Calculate trend from recent scores
   */
  _calculateTrend(scores) {
    if (scores.length < 2) {
      return { direction: 'stable', percent: 0 };
    }

    const halfLength = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, halfLength);
    const secondHalf = scores.slice(halfLength);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.overallScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.overallScore, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    return {
      direction: percentChange > 1 ? 'improving' : percentChange < -1 ? 'declining' : 'stable',
      percent: percentChange
    };
  }

  /**
   * Perform automatic rollback
   */
  async _performRollback(rollbackFn, result) {
    try {
      await rollbackFn();
      this.metrics.rollbackCount++;
      this.emit('rollbackPerformed', {
        reason: 'Verification failed',
        score: result.overallScore,
        threshold: result.threshold
      });
    } catch (error) {
      this.emit('rollbackFailed', { error: error.message });
    }
  }
}

export default TruthScoring;
