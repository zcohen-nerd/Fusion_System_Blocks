"""Fusion Adapter Layer for System Blocks.

This module provides thin wrappers that translate between Fusion 360
selections/parameters and the core library. It handles all Fusion-specific
IO and side effects.

BOUNDARY: This module is the ONLY place where Fusion 360 API (adsk.*) should
be imported. All business logic should be delegated to the core library.

Modules:
    adapter: Core ↔ Fusion translation functions
    selection: Fusion selection handling
    document: Fusion document operations

Usage:
    from fusion_addin.adapter import FusionAdapter
    adapter = FusionAdapter(app, ui)
    adapter.execute_action_plan(actions)
"""

# Note: Actual imports would be:
# from fusion_addin.adapter import FusionAdapter
# from fusion_addin.selection import SelectionHandler
# from fusion_addin.document import DocumentManager

__all__ = [
    "FusionAdapter",
    "SelectionHandler",
    "DocumentManager",
    # Logging utilities
    "get_logger",
    "setup_logging",
    "log_exceptions",
    "log_environment_info",
    "get_log_file_path",
    "get_session_id",
    "cleanup_old_logs",
    "LoggedEventHandler",
    # Diagnostics
    "DiagnosticsRunner",
    "DiagnosticResult",
    "DiagnosticsReport",
    "run_diagnostics_and_show_result",
    "cleanup_any_remaining_temp_objects",
]

# Lazy imports to avoid immediate adsk dependency


def __getattr__(name):
    if name == "FusionAdapter":
        from .adapter import FusionAdapter
        return FusionAdapter
    elif name == "SelectionHandler":
        from .selection import SelectionHandler
        return SelectionHandler
    elif name == "DocumentManager":
        from .document import DocumentManager
        return DocumentManager
    # Logging utilities - these don't depend on adsk at module level
    elif name == "get_logger":
        from .logging_util import get_logger
        return get_logger
    elif name == "setup_logging":
        from .logging_util import setup_logging
        return setup_logging
    elif name == "log_exceptions":
        from .logging_util import log_exceptions
        return log_exceptions
    elif name == "log_environment_info":
        from .logging_util import log_environment_info
        return log_environment_info
    elif name == "get_log_file_path":
        from .logging_util import get_log_file_path
        return get_log_file_path
    elif name == "get_session_id":
        from .logging_util import get_session_id
        return get_session_id
    elif name == "cleanup_old_logs":
        from .logging_util import cleanup_old_logs
        return cleanup_old_logs
    elif name == "LoggedEventHandler":
        from .logging_util import LoggedEventHandler
        return LoggedEventHandler
    # Diagnostics - these depend on adsk at runtime but not at import
    elif name == "DiagnosticsRunner":
        from .diagnostics import DiagnosticsRunner
        return DiagnosticsRunner
    elif name == "DiagnosticResult":
        from .diagnostics import DiagnosticResult
        return DiagnosticResult
    elif name == "DiagnosticsReport":
        from .diagnostics import DiagnosticsReport
        return DiagnosticsReport
    elif name == "run_diagnostics_and_show_result":
        from .diagnostics import run_diagnostics_and_show_result
        return run_diagnostics_and_show_result
    elif name == "cleanup_any_remaining_temp_objects":
        from .diagnostics import cleanup_any_remaining_temp_objects
        return cleanup_any_remaining_temp_objects
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
