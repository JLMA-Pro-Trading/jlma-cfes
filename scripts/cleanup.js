#!/usr/bin/env node

/**
 * JLMA-CFES Cleanup Script (Safe Mode)
 * 
 * Actions:
 * 1. Removes JLMA-CFES rules from CLAUDE.md (Safe, uses delimiters)
 * 2. Scans for code usage
 *    - Default: REPORTS locations only (Does not edit)
 *    - Flag --fix: Comments out usage
 */

import fs from 'fs';
import path from 'path';

// Get the project root
const projectRoot = process.env.INIT_CWD || process.cwd();
const args = process.argv.slice(2);
const AUTO_FIX = args.includes('--fix');

console.log('🧹 JLMA-CFES: Cleanup started...');
if (AUTO_FIX) {
    console.log('⚠️  Mode: AUTO-FIX (Will modify files)');
} else {
    console.log('ℹ️  Mode: REPORT ONLY (Use --fix to auto-comment code)');
}

// Safety Check: Don't run on the library itself
try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'jlma-cfes') {
            console.log('🛡️  JLMA-CFES: Detected library root. Skipping cleanup to protect source code.');
            process.exit(0);
        }
    }
} catch (e) {
    // Ignore error
}

// Configuration
const EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

// Regex patterns
const PATTERNS = [
    { name: 'Import', regex: /^(?!.*\/\/)(.*import.*from\s+['"]jlma-cfes['"].*)/gm },
    { name: 'Require', regex: /^(?!.*\/\/)(.*require\(['"]jlma-cfes['"]\).*)/gm },
    { name: 'Create', regex: /^(?!.*\/\/)(.*createEnhancer\(.*\).*)/gm },
    { name: 'ValidatePre', regex: /^(?!.*\/\/)(.*\.validatePre\(.*\).*)/gm },
    { name: 'ValidatePost', regex: /^(?!.*\/\/)(.*\.validatePost\(.*\).*)/gm }
];

function cleanClaudeFile(root) {
    const candidates = ['CLAUDE.md', '.claude/rules.md', 'docs/CLAUDE.md'];

    for (const candidate of candidates) {
        const fullPath = path.join(root, candidate);
        if (fs.existsSync(fullPath)) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                const regex = /<!-- JLMA-CFES-START -->[\s\S]*?<!-- JLMA-CFES-END -->\s*/g;

                if (regex.test(content)) {
                    content = content.replace(regex, '');
                    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
                    console.log(`✅ Removed JLMA-CFES rules from ${candidate}`);
                }
            } catch (e) {
                console.warn(`⚠️  Could not clean ${candidate}: ${e.message}`);
            }
        }
    }
}

function scanAndReport(dir) {
    let files;
    try { files = fs.readdirSync(dir); } catch (e) { return; }

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (IGNORE_DIRS.includes(file)) continue;

        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { continue; }

        if (stat.isDirectory()) {
            scanAndReport(fullPath);
        } else if (stat.isFile() && EXTENSIONS.includes(path.extname(file))) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let foundIssues = [];

        for (const pattern of PATTERNS) {
            if (pattern.regex.test(content)) {
                foundIssues.push(pattern.name);
                if (AUTO_FIX) {
                    content = content.replace(pattern.regex, '// [JLMA-CFES REMOVED] $1');
                    modified = true;
                }
            }
        }

        if (foundIssues.length > 0) {
            const relPath = path.relative(projectRoot, filePath);
            if (AUTO_FIX) {
                if (modified) {
                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log(`✏️  Fixed: ${relPath} (${foundIssues.join(', ')})`);
                }
            } else {
                console.log(`🔍 Found usage in: ${relPath}`);
                console.log(`   Types: ${foundIssues.join(', ')}`);
            }
        }
    } catch (error) {
        console.warn(`⚠️  Error processing ${filePath}: ${error.message}`);
    }
}

// Run
cleanClaudeFile(projectRoot);
scanAndReport(projectRoot);

if (!AUTO_FIX) {
    console.log('\n💡 Tip: Run "npm run cleanup -- --fix" to automatically comment out these lines.');
} else {
    console.log('\n✨ Cleanup complete.');
}
