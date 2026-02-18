Input:
{
  "command": "...",
  "cwd": "...",
  "timeout": 300
}

Execution rules:
- Use spawn, not exec
- No shell: true
- Stream stdout + stderr
- Kill after timeout
- Return exit_code
