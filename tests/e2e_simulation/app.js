
import { createEnhancer } from '../../src/index.js';

async function main() {
    console.log('🚀 Consumer App Starting...');

    const enhancer = createEnhancer({
        claudeFlowIntegration: false,
        maxRetries: 2
    });

    await enhancer.initialize();
    console.log('✅ Enhancer initialized');

    // Simulate a validation call
// [JLMA-CFES REMOVED]     const result = await enhancer.validatePre('const x = 1;');
    console.log('Validation result:', result.passed);
}

main();
