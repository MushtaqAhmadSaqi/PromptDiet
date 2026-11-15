"""Generator script for PromptDiet realistic demo fixtures."""

import json
import os

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))


def generate_build_log():
    lines = []
    # 390 repetitive compilation lines with volatile timestamps, pids, and hex addresses
    for i in range(1, 391):
        min_part = (i // 60)
        sec_part = (i % 60)
        ts = f"2026-11-15 10:{min_part:02d}:{sec_part:02d}"
        hex_addr = f"0x{i:04x}"
        pid = 4000 + (i % 3)
        lines.append(
            f"{ts} INFO [webpack:build] [{hex_addr}] [pid {pid}] Compiling client module /src/components/data-grid/row.tsx (128 KB)"
        )

    # Preceding context lines before failure
    lines.append("2026-11-15 10:06:31 INFO [webpack:build] Resolving package dependencies from tsconfig.json...")
    lines.append("2026-11-15 10:06:32 INFO [webpack:build] Attempting to import internal module @app/auth-service...")

    # Critical stack trace & failure (never collapsed)
    lines.append("2026-11-15 10:06:33 ERROR Traceback (most recent call last):")
    lines.append("2026-11-15 10:06:34 ERROR   File '/workspace/build/scripts/bundle.py', line 142, in compile_bundle")
    lines.append("2026-11-15 10:06:35 ERROR     raise ModuleNotFoundError(\"Cannot find module '@app/auth-service' from '/src/auth/provider.ts'\")")
    lines.append("2026-11-15 10:06:36 Exception: ModuleNotFoundError: Cannot find module '@app/auth-service'")
    lines.append("2026-11-15 10:06:37 npm ERR! code ELIFECYCLE")
    lines.append("2026-11-15 10:06:38 npm ERR! errno 1")
    lines.append("2026-11-15 10:06:39 npm ERR! Exit status 1")
    lines.append("2026-11-15 10:06:40 npm ERR! Failed at the app@1.0.0 build script.")
    lines.append("2026-11-15 10:06:41 FATAL Process completed with exit code 1")

    log_path = os.path.join(FIXTURES_DIR, "build_log_400_lines.txt")
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Created {log_path} ({len(lines)} lines)")


def generate_mcp_schema():
    # Generate 50 realistic MCP tool definitions with repeated parameter structures & schema boilerplate
    tools = []
    base_tools = [
        ("read_file", "Read file contents from local disk workspace", "path", "string"),
        ("write_file", "Create or overwrite file contents on local disk", "path", "string"),
        ("edit_file", "Perform targeted string replacement in file", "path", "string"),
        ("run_command", "Execute bash or powershell terminal shell command", "command", "string"),
        ("search_web", "Perform live web search for documentation and error codes", "query", "string"),
    ]

    for i in range(50):
        name_prefix, desc, param_name, param_type = base_tools[i % len(base_tools)]
        tool_name = f"{name_prefix}_{i + 1}" if i >= len(base_tools) else name_prefix
        tools.append({
            "name": tool_name,
            "description": desc,
            "examples": [f"{tool_name}({param_name}='example_value_{i}')"],
            "parameters": {
                "type": "object",
                "properties": {
                    param_name: {"type": param_type, "description": f"Target {param_name} input"},
                    "timeout_seconds": {"type": "integer", "description": "Command execution timeout", "default": 30}
                },
                "required": [param_name]
            },
            "x-vendor": "mcp-agentic-standard",
            "x-internal-flag": True
        })

    mcp_data = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "x-schema-version": "2026.1.0",
        "x-docs-url": "https://modelcontextprotocol.io/specification",
        "title": "Agentic Coding MCP Tool Suite",
        "description": "50 Model Context Protocol tool specifications for autonomous developer agents",
        "tools": tools
    }

    schema_path = os.path.join(FIXTURES_DIR, "mcp_schema_50_tools.json")
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(mcp_data, f, indent=2)
    print(f"Created {schema_path} ({len(tools)} tools)")


def generate_system_prompt():
    # Generate ~800 words of conversational, narrative system prompt with dynamic variables in prefix
    content = """You are an ultra-helpful, highly knowledgeable, and conversational AI software engineering companion.
Session UUID: 8e4b7c12-9a3d-4f56-b789-0123456789ab
Created Timestamp: 2026-11-15T10:45:00.000Z
Request ID: req-889977665544332211
Runtime Environment: datetime.now()

Hello there! In this session, I would really appreciate it if you could assist me with full-stack software development, architectural design, database optimization, and debugging complex distributed systems. Please always make sure to be extremely polite, friendly, and welcoming in every single one of your responses. Whenever you answer any of my questions, please feel free to provide an introductory greeting like "Hello! I would be delighted to assist you with this problem today," and make sure to include friendly conversational wrap-ups at the conclusion of your response, such as "I hope this helps you achieve your goals! Please feel free to ask if you have any further questions or if anything remains unclear."

When you write code, please be sure to write it in modern TypeScript or Python. You should always include full type annotations on every variable, function parameter, and return value. Please make sure not to use the 'any' type in TypeScript under any circumstances, because using 'any' defeats the entire purpose of type safety in large codebases. In addition to that, please kindly provide extensive line-by-line explanatory comments throughout the source code so that junior developers and students can easily understand every architectural decision being made.

Regarding code style and formatting, please ensure that you follow the standard Airbnb JavaScript and TypeScript style guide for frontend code, and adhere strictly to PEP 8 conventions for all backend Python code. Please format all JSON outputs with two-space indentation, and ensure that all object keys are sorted in alphabetical order whenever possible. Do not output raw unformatted blocks of code. Always wrap all code snippets inside appropriate Markdown code fences with the language identifier clearly specified immediately after the opening triple backticks, such as ```typescript or ```python.

When you are diagnosing bugs or analyzing error stack traces, please explain the root cause of the issue first before proposing any code modifications. I would like you to describe why the error occurred, what specific invariant was violated in the runtime environment, and how our proposed solution prevents similar regressions from happening again in the future. Please do not just paste the fixed code without a detailed educational explanation of what went wrong.

Furthermore, please be mindful of performance implications when designing data structures and algorithms. Whenever you suggest a database query, please include the corresponding database index definition that should be created in PostgreSQL or SQLite to ensure the query executes with an index scan rather than a sequential table scan. If an operation involves reading or writing files from disk, please remember to use asynchronous streaming or chunked I/O rather than buffering the entire file into memory at once, because memory exhaustion is a major risk when dealing with large production datasets.

For testing, please always generate comprehensive unit test suites using pytest for Python backends or Jest and React Testing Library for React frontends. Every test suite should include at least three distinct test cases: first, a happy path test verifying nominal functionality; second, an edge case test evaluating boundary values such as empty inputs, null pointers, or maximum payload limits; and third, an error case test confirming that expected exceptions are properly raised when invalid arguments are provided.

Finally, please remember that clarity and correctness are far more important than brevity. Take your time to think through every design pattern, consider all edge cases, and produce robust, maintainable, and self-documenting code that follows clean architecture principles, SOLID object-oriented design, and twelve-factor application methodologies. Thank you so much for your hard work and dedication to excellence!"""

    prompt_path = os.path.join(FIXTURES_DIR, "system_prompt_800_words.txt")
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(content)
    words = len(content.split())
    print(f"Created {prompt_path} (~{words} words)")


if __name__ == "__main__":
    generate_build_log()
    generate_mcp_schema()
    generate_system_prompt()
