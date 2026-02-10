"""Production-grade logging utilities for the Fusion 360 System Blocks add-in.

This module provides centralized, configurable logging with:
- Automatic log file creation in a user-writable location
- Session tracking to group logs from a single add-in run
- Exception handling decorators for Fusion event handlers
- Environment information logging (Fusion version, OS, Python version)

BOUNDARY: This module handles Fusion 360 API calls for UI notifications only.
All logging logic is pure Python and can be tested independently.

Usage:
    from fusion_addin.logging_util import get_logger, log_exceptions, setup_logging

    logger = get_logger(__name__)
    logger.info("Starting operation")

    @log_exceptions(logger)
    def my_event_handler(args):
        ...
"""

from __future__ import annotations

import datetime
import functools
import logging
import platform
import sys
import uuid
from pathlib import Path
from typing import Any, Callable, TypeVar

# Type variable for decorator
F = TypeVar("F", bound=Callable[..., Any])

# Module-level state
_session_id: str = ""
_log_file_path: Path | None = None
_logging_initialized: bool = False

# Add-in version - update this when releasing new versions
ADDIN_VERSION = "0.2.0"


def _generate_session_id() -> str:
    """Generate a unique session identifier for this add-in run.

    Returns:
        A short unique string (first 8 chars of UUID4).
    """
    return uuid.uuid4().hex[:8]


def get_session_id() -> str:
    """Get the current session ID.

    Returns:
        The session ID string for this add-in run.
    """
    global _session_id
    if not _session_id:
        _session_id = _generate_session_id()
    return _session_id


def get_log_directory() -> Path:
    """Get the directory where log files should be stored.

    Creates the directory if it doesn't exist. Uses a cross-platform
    location that doesn't require admin rights:
    - Windows: %USERPROFILE%/FusionSystemBlocks/logs
    - macOS/Linux: ~/FusionSystemBlocks/logs

    Returns:
        Path to the log directory.
    """
    home = Path.home()
    log_dir = home / "FusionSystemBlocks" / "logs"

    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        # Fallback to temp directory if home is not writable
        import tempfile

        log_dir = Path(tempfile.gettempdir()) / "FusionSystemBlocks" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)

    return log_dir


def get_log_file_path() -> Path:
    """Get the path to the current session's log file.

    Creates a new log file with timestamp and session ID if one
    doesn't exist for this session.

    Returns:
        Path to the log file for this session.
    """
    global _log_file_path

    if _log_file_path is None:
        log_dir = get_log_directory()
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        session = get_session_id()
        filename = f"systemblocks_{timestamp}_{session}.log"
        _log_file_path = log_dir / filename

    return _log_file_path


def get_log_file_path_str() -> str:
    """Get the log file path as a string for display in UI.

    Returns:
        String path to the current log file.
    """
    return str(get_log_file_path())


class SessionFormatter(logging.Formatter):
    """Custom formatter that includes session ID in every log message."""

    def __init__(self, session_id: str) -> None:
        """Initialize the formatter with session ID.

        Args:
            session_id: The session identifier to include in logs.
        """
        super().__init__(
            fmt=(
                "%(asctime)s | %(levelname)-8s | "
                f"[{session_id}] | %(name)s | "
                "%(filename)s:%(lineno)d | %(message)s"
            ),
            datefmt="%Y-%m-%d %H:%M:%S",
        )


def setup_logging(level: int = logging.DEBUG) -> logging.Logger:
    """Initialize the logging system for this add-in session.

    Creates file and console handlers with appropriate formatters.
    Safe to call multiple times; subsequent calls are no-ops.

    Args:
        level: The minimum logging level (default: DEBUG).

    Returns:
        The root logger for the add-in.
    """
    global _logging_initialized

    if _logging_initialized:
        return logging.getLogger("FusionSystemBlocks")

    # Get or create the root logger for our add-in
    root_logger = logging.getLogger("FusionSystemBlocks")
    root_logger.setLevel(level)

    # Prevent propagation to avoid duplicate logs
    root_logger.propagate = False

    # Clear any existing handlers
    root_logger.handlers.clear()

    session_id = get_session_id()
    formatter = SessionFormatter(session_id)

    # File handler - always try to create
    try:
        log_file = get_log_file_path()
        file_handler = logging.FileHandler(
            log_file,
            mode="a",
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    except Exception as e:
        # If file logging fails, we'll rely on console only
        print(f"[LOGGING WARNING] Could not create log file: {e}")

    # Console handler - for debugging in Fusion's Python environment
    try:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)  # Less verbose for console
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    except Exception:
        pass  # Console logging is optional

    _logging_initialized = True
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a specific module.

    Ensures logging is initialized before returning the logger.

    Args:
        name: The module name (typically __name__).

    Returns:
        A configured Logger instance.
    """
    # Ensure logging is set up
    if not _logging_initialized:
        setup_logging()

    # Create a child logger under our root
    if name.startswith("FusionSystemBlocks"):
        return logging.getLogger(name)
    return logging.getLogger(f"FusionSystemBlocks.{name}")


def log_environment_info(logger: logging.Logger) -> None:
    """Log information about the runtime environment.

    Logs Fusion version (if available), OS, Python version, and add-in version.

    Args:
        logger: The logger to use for output.
    """
    logger.info("=" * 60)
    logger.info("Environment Information")
    logger.info("=" * 60)

    # Add-in version
    logger.info(f"Add-in Version: {ADDIN_VERSION}")
    logger.info(f"Session ID: {get_session_id()}")

    # Python version
    logger.info(f"Python Version: {sys.version}")

    # Operating system
    logger.info(f"OS: {platform.system()} {platform.release()} ({platform.machine()})")
    logger.info(f"Platform: {platform.platform()}")

    # Fusion 360 version (if available)
    try:
        import adsk.core

        app = adsk.core.Application.get()
        if app:
            logger.info(f"Fusion 360 Version: {app.version}")
            if app.activeDocument:
                logger.info(f"Active Document: {app.activeDocument.name}")
            else:
                logger.info("Active Document: None")
        else:
            logger.info("Fusion 360: Application not available")
    except Exception as e:
        logger.info(f"Fusion 360: Could not get version ({e})")

    # Log file location
    logger.info(f"Log File: {get_log_file_path()}")
    logger.info("=" * 60)


def _show_error_message_box(title: str, message: str, log_path: str) -> None:
    """Show an error message box in Fusion 360 UI.

    Includes the log file path so users can find detailed information.

    Args:
        title: The message box title.
        message: The error message to display.
        log_path: Path to the log file.
    """
    try:
        import adsk.core

        app = adsk.core.Application.get()
        if app and app.userInterface:
            full_message = f"{message}\n\nFor details, see the log file:\n{log_path}"
            app.userInterface.messageBox(
                full_message,
                title,
                adsk.core.MessageBoxButtonTypes.OKButtonType,
                adsk.core.MessageBoxIconTypes.CriticalIconType,
            )
    except Exception:
        # If we can't show a message box, just print to console
        print(f"[ERROR] {title}: {message}")
        print(f"[ERROR] Log file: {log_path}")


def log_exceptions(
    logger: logging.Logger,
    show_message_box: bool = True,
    reraise: bool = False,
) -> Callable[[F], F]:
    """Decorator to catch and log exceptions in Fusion event handlers.

    Logs the full traceback and optionally shows a user-friendly error
    message box with the log file location.

    Args:
        logger: The logger to use for error logging.
        show_message_box: Whether to show a Fusion message box on error.
        reraise: Whether to re-raise the exception after logging.

    Returns:
        A decorator function.

    Example:
        @log_exceptions(logger)
        def my_handler(args):
            ...
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Log the full exception with traceback
                logger.exception(f"Uncaught exception in {func.__name__}: {e}")

                # Log additional context if available
                if args:
                    try:
                        logger.debug(f"Handler args: {args}")
                    except Exception:
                        pass

                # Show message box if requested
                if show_message_box:
                    _show_error_message_box(
                        "System Blocks Error",
                        f"An error occurred in {func.__name__}:\n{str(e)[:200]}",
                        get_log_file_path_str(),
                    )

                if reraise:
                    raise

                return None

        return wrapper  # type: ignore

    return decorator


def log_handler_entry(
    logger: logging.Logger,
    handler_name: str,
) -> Callable[[F], F]:
    """Decorator to log entry and exit of event handlers.

    Useful for debugging handler execution flow.

    Args:
        logger: The logger to use.
        handler_name: A descriptive name for the handler.

    Returns:
        A decorator function.
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger.debug(f"Entering handler: {handler_name}")
            try:
                result = func(*args, **kwargs)
                logger.debug(f"Exiting handler: {handler_name} (success)")
                return result
            except Exception as e:
                logger.debug(f"Exiting handler: {handler_name} (exception: {e})")
                raise

        return wrapper  # type: ignore

    return decorator


class LoggedEventHandler:
    """Base class for Fusion event handlers with built-in logging.

    Subclass this instead of adsk.core.*EventHandler to get automatic
    exception logging.

    Example:
        class MyHandler(LoggedEventHandler, adsk.core.CommandCreatedEventHandler):
            def __init__(self):
                super().__init__()

            def notify(self, args):
                self._logged_notify(args)

            def _do_notify(self, args):
                # Actual handler logic here
                ...
    """

    _handler_logger: logging.Logger | None = None

    def __init__(self, logger_name: str | None = None) -> None:
        """Initialize with optional custom logger name.

        Args:
            logger_name: Name for the logger (default: class name).
        """
        super().__init__()
        name = logger_name or self.__class__.__name__
        self._handler_logger = get_logger(name)

    def _logged_notify(self, args: Any) -> None:
        """Call the actual notify implementation with logging.

        Args:
            args: The event arguments from Fusion.
        """
        handler_name = self.__class__.__name__
        try:
            self._handler_logger.debug(f"{handler_name}.notify() called")
            self._do_notify(args)
            self._handler_logger.debug(f"{handler_name}.notify() completed")
        except Exception as e:
            self._handler_logger.exception(f"Exception in {handler_name}.notify(): {e}")
            _show_error_message_box(
                "System Blocks Error",
                f"Error in {handler_name}:\n{str(e)[:200]}",
                get_log_file_path_str(),
            )

    def _do_notify(self, args: Any) -> None:
        """Override this method with the actual handler logic.

        Args:
            args: The event arguments from Fusion.
        """
        raise NotImplementedError("Subclasses must implement _do_notify()")


def cleanup_old_logs(max_age_days: int = 30, max_count: int = 50) -> int:
    """Clean up old log files to prevent disk space issues.

    Removes log files older than max_age_days or keeps only the most
    recent max_count files.

    Args:
        max_age_days: Maximum age in days before deletion.
        max_count: Maximum number of log files to keep.

    Returns:
        Number of files deleted.
    """
    logger = get_logger("cleanup")
    deleted = 0

    try:
        log_dir = get_log_directory()
        log_files = sorted(
            log_dir.glob("systemblocks_*.log"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        now = datetime.datetime.now()
        cutoff = now - datetime.timedelta(days=max_age_days)

        for i, log_file in enumerate(log_files):
            try:
                # Skip current session's log file
                if log_file == get_log_file_path():
                    continue

                # Delete if too old or too many
                file_time = datetime.datetime.fromtimestamp(log_file.stat().st_mtime)
                if file_time < cutoff or i >= max_count:
                    log_file.unlink()
                    deleted += 1
                    logger.debug(f"Deleted old log file: {log_file.name}")
            except Exception as e:
                logger.warning(f"Could not delete log file {log_file}: {e}")

        if deleted > 0:
            logger.info(f"Cleaned up {deleted} old log file(s)")

    except Exception as e:
        logger.warning(f"Log cleanup failed: {e}")

    return deleted
