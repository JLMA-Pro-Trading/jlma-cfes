/**
 * PatternValidator Tests
 *
 * Validates that all pattern detection is REAL and MEASURABLE.
 * No mocks - all tests use actual validation.
 */

import { PatternValidator } from '../src/validators/PatternValidator.js';

describe('PatternValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new PatternValidator();
  });

  describe('Security Validation', () => {
    test('detects hardcoded passwords', async () => {
      const code = `
        const config = {
          password: "super_secret_123",
          username: "admin"
        };
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe('hardcoded_secret');
      expect(result.violations[0].severity).toBe('CRITICAL');
    });

    test('detects hardcoded API keys', async () => {
      const code = `
        const API_KEY = "sk-1234567890abcdef1234567890";
        fetch(url, { headers: { Authorization: API_KEY }});
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.pattern === 'api_key')).toBe(true);
    });

    test('detects SQL injection vulnerabilities', async () => {
      const code = `
        const query = "SELECT * FROM users WHERE id = " + userId;
        db.execute(query);
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'sql_injection')).toBe(true);
    });

    test('detects template literal SQL injection', async () => {
      const code = `
        const query = \`SELECT * FROM users WHERE name = '\${userName}'\`;
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'sql_injection')).toBe(true);
    });

    test('detects XSS via innerHTML', async () => {
      const code = `
        element.innerHTML = userInput;
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'xss_vulnerability')).toBe(true);
    });

    test('detects eval usage', async () => {
      const code = `
        const result = eval(userCode);
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'xss_vulnerability')).toBe(true);
    });

    test('passes clean code', async () => {
      const code = `
        const config = {
          apiUrl: process.env.API_URL,
          timeout: 5000
        };

        async function fetchData() {
          try {
            const response = await fetch(config.apiUrl);
            return response.json();
          } catch (error) {
            console.error('Fetch failed:', error);
            throw error;
          }
        }
      `;

      const result = await validator.validatePre(code);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Performance Validation', () => {
    test('detects Rust HashMap performance issue', async () => {
      const code = `
        use std::collections::HashMap;

        fn main() {
            let mut map: HashMap<String, i32> = HashMap::new();
            map.insert("key".to_string(), 42);
        }
      `;

      const result = await validator.validatePre(code);

      expect(result.violations.some(v => v.type === 'hashmap_performance')).toBe(true);
    });

    test('detects JSON deep clone anti-pattern', async () => {
      const code = `
        const clone = JSON.parse(JSON.stringify(original));
      `;

      const result = await validator.validatePre(code);

      expect(result.violations.some(v =>
        v.type === 'performance_antipattern' && v.pattern === 'json_deep_clone'
      )).toBe(true);
    });
  });

  describe('Quality Validation', () => {
    test('detects missing error handling in async code', async () => {
      const code = `
        async function fetchData() {
          const response = await fetch(url);
          return response.json();
        }
      `;

      const result = await validator.validatePost({ code });

      expect(result.issues.some(i => i.type === 'missing_error_handling')).toBe(true);
    });

    test('passes code with proper error handling', async () => {
      const code = `
        async function fetchData() {
          try {
            const response = await fetch(url);
            return response.json();
          } catch (error) {
            console.error('Fetch failed:', error);
            throw error;
          }
        }
      `;

      const result = await validator.validatePost({ code });

      expect(result.issues.filter(i => i.type === 'missing_error_handling')).toHaveLength(0);
    });

    test('detects potential memory leaks', async () => {
      const code = `
        setInterval(() => {
          console.log('Running...');
        }, 1000);
      `;

      const result = await validator.validatePost({ code });

      expect(result.issues.some(i => i.type === 'potential_memory_leak')).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    test('pre-validation completes in <1ms average', async () => {
      const code = 'const x = 1;';
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await validator.validatePre(code);
        times.push(performance.now() - start);
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length;

      expect(average).toBeLessThan(1.0); // <1ms
    });

    test('post-validation completes in <5ms average', async () => {
      const code = 'const x = 1;';
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await validator.validatePost({ code });
        times.push(performance.now() - start);
      }

      const average = times.reduce((a, b) => a + b, 0) / times.length;

      expect(average).toBeLessThan(5.0); // <5ms
    });
  });

  describe('Metrics', () => {
    test('tracks validation metrics', async () => {
      await validator.validatePre('const password = "test123";');
      await validator.validatePre('const x = 1;');
      await validator.validatePost({ code: 'const y = 2;' });

      const metrics = validator.getMetrics();

      expect(metrics.checksRun).toBe(3);
      expect(metrics.violationsFound).toBeGreaterThan(0);
      expect(metrics.patternsLoaded).toBeGreaterThan(10);
    });
  });
});
