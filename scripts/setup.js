#!/usr/bin/env node

/**
 * JLMA-CFES Setup Script
 * Safely adds integration rules to CLAUDE.md
 * Usage: npm run setup
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.env.INIT_CWD || process.cwd();

const RULES_CONTENT = `
<!-- JLMA-CFES-START -->
## 🛡️ JLMA-CFES Environment

This project is protected by **JLMA-CFES (Claude Flow Enhancement System)**.
All code execution is monitored and validated in real-time.

### 🚫 Critical Prohibitions (Will Block Execution)
- **Hardcoded Secrets**: Never use real passwords, API keys, or tokens. Use \`process.env\`.
- **SQL Injection**: Never concatenate strings into SQL queries. Use parameterized queries.
- **XSS**: Avoid \`innerHTML\`, \`eval()\`, or \`document.write()\`.
- **Command Injection**: specific validation for \`exec\`/\`spawn\` with user input.

### 🔄 Auto-Correction Protocol
If you receive a task update starting with \`[QUALITY FEEDBACK - PLEASE FIX]\`:
1.  **Prioritize this feedback** above all else.
2.  **Analyze the specific issues** listed (e.g., performance, security).
3.  **Refactor** the code immediately to address these points.
4.  **Do not argue**; the validator is strict. Just fix the code.

### ⚡ Performance Targets
- Pre-validation: <1ms
- Post-validation: <5ms
- **Optimization**: Avoid nested loops and heavy synchronous operations in critical paths.
<!-- JLMA-CFES-END -->
`;

function findClaudeFile(root) {
    const candidates = [
        'CLAUDE.md',
        '.claude/rules.md',
        'docs/CLAUDE.md'
    ];

    for (const candidate of candidates) {
        const fullPath = path.join(root, candidate);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}

function setup() {
    console.log('🛡️  JLMA-CFES: Setting up environment...');

    const claudeFile = findClaudeFile(projectRoot);

    if (claudeFile) {
        try {
            const content = fs.readFileSync(claudeFile, 'utf8');

            if (content.includes('JLMA-CFES-START')) {
                console.log('✅ JLMA-CFES rules already present in CLAUDE.md');
                return;
            }

            const newContent = content + '\n' + RULES_CONTENT;
            fs.writeFileSync(claudeFile, newContent, 'utf8');
            console.log(`✅ Added JLMA-CFES rules to ${path.relative(projectRoot, claudeFile)}`);
        } catch (error) {
            console.warn(`⚠️  Failed to update CLAUDE.md: ${error.message}`);
        }
    } else {
        console.log('ℹ️  No CLAUDE.md found. Skipping rules injection.');
        console.log('💡 Tip: Create a CLAUDE.md file and run "npm run setup" again.');
    }
}

setup();
