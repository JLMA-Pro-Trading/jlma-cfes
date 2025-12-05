/**
 * SPARCIntegration - SPARC Methodology Support
 *
 * Based on .claude/skills/sparc-methodology/SKILL.md
 *
 * Integrates SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
 * with jlma-cfes validation:
 * - Pre-phase validation
 * - Phase transition quality gates
 * - TDD workflow integration
 * - Memory coordination protocol
 */

import { EventEmitter } from 'events';

export class SPARCIntegration extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      enableValidation: options.enableValidation !== false,
      qualityThreshold: options.qualityThreshold || 0.9,
      ...options
    };

    // SPARC phases with quality gates
    this.phases = {
      specification: {
        name: 'Specification',
        requiredOutputs: ['requirements', 'constraints', 'success_criteria'],
        qualityGate: 0.85
      },
      pseudocode: {
        name: 'Pseudocode',
        requiredOutputs: ['algorithm_design', 'data_structures'],
        qualityGate: 0.85
      },
      architecture: {
        name: 'Architecture',
        requiredOutputs: ['system_design', 'interfaces', 'schemas'],
        qualityGate: 0.90
      },
      refinement: {
        name: 'Refinement (TDD)',
        requiredOutputs: ['tests', 'implementation', 'coverage'],
        qualityGate: 0.95 // Highest for code
      },
      completion: {
        name: 'Completion',
        requiredOutputs: ['integration', 'documentation'],
        qualityGate: 0.90
      }
    };

    // Current workflow state
    this.currentWorkflow = null;
    this.workflowHistory = [];
  }

  /**
   * Start a new SPARC workflow
   *
   * @param {string} taskDescription - Description of the task
   * @param {Object} options - Workflow options
   * @returns {Object} Workflow state
   */
  startWorkflow(taskDescription, options = {}) {
    this.currentWorkflow = {
      id: `sparc_${Date.now()}`,
      task: taskDescription,
      startTime: Date.now(),
      currentPhase: 'specification',
      completedPhases: [],
      phaseResults: {},
      options
    };

    this.emit('workflowStarted', this.currentWorkflow);

    return {
      workflowId: this.currentWorkflow.id,
      task: taskDescription,
      currentPhase: 'specification',
      nextSteps: this._getPhaseGuidance('specification')
    };
  }

  /**
   * Validate phase completion and transition to next
   *
   * @param {string} phase - Current phase name
   * @param {Object} outputs - Phase outputs to validate
   * @param {Function} validator - Optional custom validator
   * @returns {Object} Validation result with next phase
   */
  async validatePhase(phase, outputs, validator = null) {
    const phaseConfig = this.phases[phase];
    if (!phaseConfig) {
      return { valid: false, error: `Unknown phase: ${phase}` };
    }

    const startTime = performance.now();
    const issues = [];
    let score = 1.0;

    // Check required outputs
    for (const required of phaseConfig.requiredOutputs) {
      if (!outputs[required]) {
        issues.push({
          type: 'missing_output',
          severity: 'HIGH',
          message: `Missing required output: ${required}`
        });
        score -= 0.2;
      }
    }

    // Run custom validator if provided
    if (validator && this.options.enableValidation) {
      const validatorResult = await validator(outputs);
      if (validatorResult.issues) {
        issues.push(...validatorResult.issues);
        score -= validatorResult.issues.length * 0.1;
      }
    }

    // Phase-specific validation
    const phaseValidation = await this._validatePhaseSpecific(phase, outputs);
    issues.push(...phaseValidation.issues);
    score = Math.max(0, score - phaseValidation.deduction);

    const passed = score >= phaseConfig.qualityGate;

    const result = {
      phase,
      passed,
      score: Math.round(score * 1000) / 1000,
      qualityGate: phaseConfig.qualityGate,
      issues,
      responseTime: `${(performance.now() - startTime).toFixed(2)}ms`
    };

    if (passed) {
      const nextPhase = this._getNextPhase(phase);
      result.nextPhase = nextPhase;
      result.nextSteps = nextPhase ? this._getPhaseGuidance(nextPhase) : null;

      // Update workflow state
      if (this.currentWorkflow && this.currentWorkflow.currentPhase === phase) {
        this.currentWorkflow.completedPhases.push(phase);
        this.currentWorkflow.phaseResults[phase] = result;
        this.currentWorkflow.currentPhase = nextPhase;
      }

      this.emit('phaseCompleted', { phase, result });
    } else {
      result.remediation = this._getRemediationSteps(phase, issues);
      this.emit('phaseFailed', { phase, result });
    }

    return result;
  }

  /**
   * Get TDD cycle support for refinement phase
   *
   * @param {string} feature - Feature being implemented
   * @returns {Object} TDD workflow steps
   */
  getTDDWorkflow(feature) {
    return {
      feature,
      cycles: [
        {
          step: 'RED',
          description: 'Write failing test',
          command: `Write a failing test for: ${feature}`,
          validation: 'Test must fail with clear assertion error'
        },
        {
          step: 'GREEN',
          description: 'Implement minimum code',
          command: 'Implement minimum code to make test pass',
          validation: 'Test must pass, no extra functionality'
        },
        {
          step: 'REFACTOR',
          description: 'Improve code quality',
          command: 'Refactor while keeping tests passing',
          validation: 'All tests pass, code quality improved'
        }
      ],
      qualityGates: {
        coverageTarget: '90%',
        noSkippedTests: true,
        performanceRegression: 'none'
      },
      hooks: {
        preTest: 'npx claude-flow@alpha hooks pre-task --description "TDD cycle"',
        postTest: 'npx claude-flow@alpha hooks post-task --task-id "tdd-cycle"'
      }
    };
  }

  /**
   * Get memory coordination protocol for phase
   *
   * @param {string} phase - SPARC phase
   * @returns {Object} Memory protocol commands
   */
  getMemoryProtocol(phase) {
    const namespace = `sparc/${this.currentWorkflow?.id || 'default'}`;

    return {
      phase,
      namespace,
      status: {
        store: `mcp__claude-flow__memory_usage { action: "store", key: "${namespace}/${phase}/status", namespace: "coordination", value: "running" }`,
        retrieve: `mcp__claude-flow__memory_usage { action: "retrieve", key: "${namespace}/${phase}/status", namespace: "coordination" }`
      },
      progress: {
        store: `mcp__claude-flow__memory_usage { action: "store", key: "${namespace}/${phase}/progress", namespace: "coordination", value: "<progress_data>" }`,
        retrieve: `mcp__claude-flow__memory_usage { action: "retrieve", key: "${namespace}/${phase}/progress", namespace: "coordination" }`
      },
      complete: {
        store: `mcp__claude-flow__memory_usage { action: "store", key: "${namespace}/${phase}/complete", namespace: "coordination", value: "<result_data>" }`,
        retrieve: `mcp__claude-flow__memory_usage { action: "retrieve", key: "${namespace}/${phase}/complete", namespace: "coordination" }`
      }
    };
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus() {
    if (!this.currentWorkflow) {
      return { active: false };
    }

    const elapsed = Date.now() - this.currentWorkflow.startTime;
    const completedCount = this.currentWorkflow.completedPhases.length;
    const totalPhases = Object.keys(this.phases).length;

    return {
      active: true,
      workflowId: this.currentWorkflow.id,
      task: this.currentWorkflow.task,
      currentPhase: this.currentWorkflow.currentPhase,
      completedPhases: this.currentWorkflow.completedPhases,
      progress: `${completedCount}/${totalPhases} phases`,
      progressPercent: Math.round((completedCount / totalPhases) * 100),
      elapsed: `${Math.round(elapsed / 1000)}s`,
      phaseResults: this.currentWorkflow.phaseResults
    };
  }

  /**
   * Complete workflow and archive
   */
  completeWorkflow() {
    if (!this.currentWorkflow) {
      return { success: false, error: 'No active workflow' };
    }

    this.currentWorkflow.endTime = Date.now();
    this.currentWorkflow.duration = this.currentWorkflow.endTime - this.currentWorkflow.startTime;

    this.workflowHistory.push(this.currentWorkflow);

    const result = {
      success: true,
      workflowId: this.currentWorkflow.id,
      task: this.currentWorkflow.task,
      duration: `${Math.round(this.currentWorkflow.duration / 1000)}s`,
      completedPhases: this.currentWorkflow.completedPhases,
      finalStatus: this._calculateFinalStatus()
    };

    this.emit('workflowCompleted', result);
    this.currentWorkflow = null;

    return result;
  }

  /**
   * Validate phase-specific requirements
   */
  async _validatePhaseSpecific(phase, outputs) {
    const issues = [];
    let deduction = 0;

    switch (phase) {
      case 'specification':
        if (!outputs.requirements?.length) {
          issues.push({ type: 'incomplete', message: 'No requirements defined' });
          deduction += 0.1;
        }
        break;

      case 'architecture':
        if (!outputs.interfaces) {
          issues.push({ type: 'incomplete', message: 'No interface definitions' });
          deduction += 0.15;
        }
        break;

      case 'refinement':
        if (outputs.coverage && outputs.coverage < 90) {
          issues.push({
            type: 'coverage',
            message: `Test coverage ${outputs.coverage}% below 90% target`
          });
          deduction += 0.2;
        }
        break;
    }

    return { issues, deduction };
  }

  /**
   * Get next phase in SPARC workflow
   */
  _getNextPhase(currentPhase) {
    const phases = Object.keys(this.phases);
    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  }

  /**
   * Get guidance for phase
   */
  _getPhaseGuidance(phase) {
    const guidance = {
      specification: [
        'Define clear requirements with acceptance criteria',
        'Identify constraints and non-functional requirements',
        'Create user stories or use cases',
        'Define success metrics'
      ],
      pseudocode: [
        'Design algorithms at high level',
        'Define data structures needed',
        'Plan module interactions',
        'Consider edge cases'
      ],
      architecture: [
        'Design system components and boundaries',
        'Define API contracts and interfaces',
        'Plan database schemas',
        'Consider scalability and security'
      ],
      refinement: [
        'Write failing tests first (RED)',
        'Implement minimum code to pass (GREEN)',
        'Refactor for quality (REFACTOR)',
        'Target 90%+ test coverage'
      ],
      completion: [
        'Integrate all components',
        'Run full test suite',
        'Complete documentation',
        'Prepare deployment'
      ]
    };

    return guidance[phase] || [];
  }

  /**
   * Get remediation steps for failed phase
   */
  _getRemediationSteps(phase, issues) {
    return issues.map(issue => ({
      issue: issue.message,
      remediation: `Fix ${issue.type} issue before proceeding`,
      priority: issue.severity === 'HIGH' ? 'immediate' : 'recommended'
    }));
  }

  /**
   * Calculate final workflow status
   */
  _calculateFinalStatus() {
    const phaseCount = Object.keys(this.phases).length;
    const completedCount = this.currentWorkflow.completedPhases.length;

    if (completedCount === phaseCount) {
      return 'completed';
    } else if (completedCount >= phaseCount * 0.8) {
      return 'nearly_complete';
    } else if (completedCount >= phaseCount * 0.5) {
      return 'in_progress';
    }
    return 'early_stage';
  }
}

export default SPARCIntegration;
