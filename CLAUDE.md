# My Project Rules

- Be nice.


<!-- JLMA-CFES-START -->
## 🛡️ JLMA-CFES Environment

This project is protected by **JLMA-CFES (Claude Flow Enhancement System)**.
All code execution is monitored and validated in real-time.

### 🚫 Critical Prohibitions (Will Block Execution)
- **Hardcoded Secrets**: Never use real passwords, API keys, or tokens. Use `process.env`.
- **SQL Injection**: Never concatenate strings into SQL queries. Use parameterized queries.
- **XSS**: Avoid `innerHTML`, `eval()`, or `document.write()`.
- **Command Injection**: specific validation for `exec`/`spawn` with user input.

### 🔄 Auto-Correction Protocol
If you receive a task update starting with `[QUALITY FEEDBACK - PLEASE FIX]`:
1.  **Prioritize this feedback** above all else.
2.  **Analyze the specific issues** listed (e.g., performance, security).
3.  **Refactor** the code immediately to address these points.
4.  **Do not argue**; the validator is strict. Just fix the code.

### ⚡ Performance Targets
- Pre-validation: <1ms
- Post-validation: <5ms
- **Optimization**: Avoid nested loops and heavy synchronous operations in critical paths.
<!-- JLMA-CFES-END -->
