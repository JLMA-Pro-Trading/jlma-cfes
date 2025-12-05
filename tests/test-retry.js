
import { ClaudeFlowAdapter } from '../src/adapters/ClaudeFlowAdapter.js';

class MockAdapter extends ClaudeFlowAdapter {
    constructor(options) {
        super(options);
        this.callCount = 0;
        this.receivedTasks = [];
    }

    async _runCommand(args) {
        this.callCount++;
        // Extract task from args (it's after --task)
        const taskIndex = args.indexOf('--task');
        if (taskIndex !== -1) {
            this.receivedTasks.push(args[taskIndex + 1]);
        }

        // Simulate output
        return JSON.stringify({
            result: `Result for attempt ${this.callCount}`
        });
    }
}

async function runTest() {
    console.log('🧪 Testing Auto-Correction Loop...');

    const adapter = new MockAdapter({
        claudeFlowIntegration: true
    });

    // Manually set connected to true to bypass the check
    adapter.connected = true;

    const result = await adapter.orchestrate('Build a secure app', {
        maxRetries: 3,
        postValidation: async (res) => {
            // Fail the first time
            if (res.result.includes('attempt 1')) {
                return {
                    passed: false,
                    issues: [{ message: 'Security vulnerability found', suggestion: 'Use hashing' }]
                };
            }
            // Pass the second time
            return { passed: true };
        }
    });

    console.log('\n📊 Test Results:');
    console.log(`Attempts: ${result.attempts} (Expected: 2)`);
    console.log(`Final Status: ${result.finalStatus} (Expected: success)`);

    if (result.attempts === 2 && result.finalStatus === 'success') {
        console.log('✅ Retry logic works!');
    } else {
        console.error('❌ Retry logic failed.');
    }

    console.log('\n📝 Task Evolution:');
    adapter.receivedTasks.forEach((t, i) => {
        console.log(`Attempt ${i + 1}:`);
        console.log(t.substring(0, 100) + '...'); // Truncate for display
        if (i > 0 && t.includes('[QUALITY FEEDBACK - PLEASE FIX]')) {
            console.log('   ✅ Feedback injected correctly');
        }
    });
}

runTest().catch(console.error);
