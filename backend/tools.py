"""
Agentic Tools for the AI Interview Platform.

Tools available to the interviewer agent:
1. fact_checker_tool  - searches DuckDuckGo to verify technical claims
2. code_evaluator_tool - safely evaluates simple Python expressions / logic
"""

import ast
import io
import contextlib
import traceback
from langchain_community.tools import DuckDuckGoSearchRun
from langchain.tools import tool


# ─────────────────────────────────────────────
# 1. Fact-Checker Tool (DuckDuckGo Search)
# ─────────────────────────────────────────────

_ddg_search = DuckDuckGoSearchRun()


@tool
def fact_checker_tool(query: str) -> str:
    """
    Search the web using DuckDuckGo to verify a technical claim, definition,
    or concept made by the interview candidate.
    Use this whenever you are unsure whether a candidate's answer is factually
    correct, or to retrieve up-to-date information before giving feedback.

    Args:
        query: The search query to look up (e.g. 'Python GIL removed in 3.13').

    Returns:
        A short summary of the top search results.
    """
    try:
        result = _ddg_search.run(query)
        return result[:1500] if result else "No results found."
    except Exception as e:
        return f"Search failed: {str(e)}"


# ─────────────────────────────────────────────
# 2. Code Evaluator Tool (Safe Python REPL)
# ─────────────────────────────────────────────

# Allowlist of safe built-in names
_SAFE_BUILTINS = {
    "print", "len", "range", "enumerate", "zip", "map", "filter",
    "sorted", "sum", "min", "max", "abs", "round", "int", "float",
    "str", "bool", "list", "tuple", "dict", "set", "type", "repr",
    "isinstance", "all", "any", "True", "False", "None",
}

_FORBIDDEN_NODES = (
    ast.Import, ast.ImportFrom,  # no imports
    ast.Call,  # re-checked below for allowed funcs
)

_FORBIDDEN_ATTRS = {"__import__", "__builtins__", "__class__", "os", "sys",
                    "subprocess", "open", "exec", "eval", "compile",
                    "__subclasses__", "globals", "locals", "vars"}


def _is_safe_ast(code: str) -> tuple[bool, str]:
    """
    Performs a very conservative AST analysis to determine whether the code is
    safe to run. Returns (is_safe, reason).
    """
    try:
        tree = ast.parse(code, mode="exec")
    except SyntaxError as e:
        return False, f"SyntaxError: {e}"

    for node in ast.walk(tree):
        # Block any import
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return False, "Imports are not allowed."

        # Block access to forbidden attribute names
        if isinstance(node, ast.Attribute):
            if node.attr in _FORBIDDEN_ATTRS:
                return False, f"Access to '{node.attr}' is not allowed."

        # Block forbidden name references
        if isinstance(node, ast.Name):
            if node.id in _FORBIDDEN_ATTRS:
                return False, f"Use of '{node.id}' is not allowed."

        # Block with-statements (could open files)
        if isinstance(node, ast.With):
            return False, "With-statements are not allowed."

        # Block class definitions (could abuse metaclasses)
        if isinstance(node, ast.ClassDef):
            return False, "Class definitions are not allowed."

    return True, "ok"


@tool
def code_evaluator_tool(code: str) -> str:
    """
    Safely execute a small Python code snippet submitted by the interview candidate
    and return the output (stdout) or any error message.
    This is used to evaluate whether a candidate's code solution is correct.

    ⚠️  Only simple, self-contained snippets are allowed.
    No imports, file I/O, or network calls are permitted.

    Args:
        code: The Python code snippet to evaluate.

    Returns:
        The stdout output produced by the code, or an error/safety message.
    """
    if len(code) > 2000:
        return "Code too long (>2000 chars). Please provide a shorter snippet."

    is_safe, reason = _is_safe_ast(code)
    if not is_safe:
        return f"⛔ Code blocked for safety: {reason}"

    # Build a restricted globals dict
    safe_globals = {
        "__builtins__": {k: __builtins__[k] for k in _SAFE_BUILTINS if k in __builtins__}
        if isinstance(__builtins__, dict)
        else {k: getattr(__builtins__, k) for k in _SAFE_BUILTINS if hasattr(__builtins__, k)},
        "__name__": "__interview_sandbox__",
    }

    stdout_capture = io.StringIO()
    try:
        with contextlib.redirect_stdout(stdout_capture):
            exec(compile(code, "<candidate_code>", "exec"), safe_globals)  # noqa: S102
        output = stdout_capture.getvalue()
        return output if output.strip() else "(No output produced — no print() statements?)"
    except Exception:
        return f"Runtime error:\n{traceback.format_exc(limit=3)}"


# ─────────────────────────────────────────────
# Export list
# ─────────────────────────────────────────────

AGENT_TOOLS = [fact_checker_tool, code_evaluator_tool]
