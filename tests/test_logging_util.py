"""Tests for the fusion_addin logging utilities.

This module tests the logging utilities that can be tested independently
of Fusion 360. The module is designed with pure Python logic that can
be unit tested, with Fusion-specific UI functions isolated.

Test coverage:
    - Session ID generation
    - Log directory creation
    - Log file path generation
    - SessionFormatter formatting
    - setup_logging configuration
    - get_logger function
    - log_exceptions decorator (without Fusion UI)
    - log_handler_entry decorator
    - cleanup_old_logs function
"""

import logging

# Import the logging utilities - note: these are in fusion_addin
# which should work fine since logging_util.py is mostly pure Python
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from fusion_addin.logging_util import (
    ADDIN_VERSION,
    SessionFormatter,
    _generate_session_id,
    cleanup_old_logs,
    get_log_directory,
    get_log_file_path,
    get_log_file_path_str,
    get_logger,
    get_session_id,
    log_exceptions,
    log_handler_entry,
    setup_logging,
)

# Add fusion_addin to path if needed
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestSessionId:
    """Tests for session ID generation."""

    def test_generate_session_id_length(self):
        """Session ID should be 8 characters."""
        session_id = _generate_session_id()

        assert len(session_id) == 8

    def test_generate_session_id_is_hex(self):
        """Session ID should be hexadecimal characters."""
        session_id = _generate_session_id()

        # Should be valid hex
        int(session_id, 16)

    def test_generate_session_id_unique(self):
        """Multiple calls should generate unique IDs."""
        ids = {_generate_session_id() for _ in range(100)}

        # All 100 should be unique
        assert len(ids) == 100

    def test_get_session_id_returns_string(self):
        """get_session_id returns a string."""
        session_id = get_session_id()

        assert isinstance(session_id, str)
        assert len(session_id) == 8

    def test_get_session_id_consistent(self):
        """get_session_id returns same value within session."""
        id1 = get_session_id()
        id2 = get_session_id()

        assert id1 == id2


class TestLogDirectory:
    """Tests for log directory creation."""

    def test_get_log_directory_returns_path(self):
        """get_log_directory returns a Path object."""
        log_dir = get_log_directory()

        assert isinstance(log_dir, Path)

    def test_get_log_directory_exists(self):
        """get_log_directory creates directory if needed."""
        log_dir = get_log_directory()

        assert log_dir.exists()
        assert log_dir.is_dir()

    def test_get_log_directory_in_user_home(self):
        """Log directory should be under user home."""
        log_dir = get_log_directory()

        # Should contain "FusionSystemBlocks"
        assert "FusionSystemBlocks" in str(log_dir)

    def test_get_log_directory_ends_with_logs(self):
        """Log directory should end with 'logs'."""
        log_dir = get_log_directory()

        assert log_dir.name == "logs"


class TestLogFilePath:
    """Tests for log file path generation."""

    def test_get_log_file_path_returns_path(self):
        """get_log_file_path returns a Path object."""
        log_file = get_log_file_path()

        assert isinstance(log_file, Path)

    def test_get_log_file_path_has_log_extension(self):
        """Log file should have .log extension."""
        log_file = get_log_file_path()

        assert log_file.suffix == ".log"

    def test_get_log_file_path_contains_systemblocks(self):
        """Log file name should start with 'systemblocks_'."""
        log_file = get_log_file_path()

        assert log_file.name.startswith("systemblocks_")

    def test_get_log_file_path_contains_session_id(self):
        """Log file name should contain session ID."""
        log_file = get_log_file_path()
        session_id = get_session_id()

        assert session_id in log_file.name

    def test_get_log_file_path_str_returns_string(self):
        """get_log_file_path_str returns a string."""
        path_str = get_log_file_path_str()

        assert isinstance(path_str, str)
        assert path_str.endswith(".log")

    def test_get_log_file_path_consistent(self):
        """get_log_file_path returns same value within session."""
        path1 = get_log_file_path()
        path2 = get_log_file_path()

        assert path1 == path2


class TestSessionFormatter:
    """Tests for the SessionFormatter class."""

    def test_formatter_includes_session_id(self):
        """Formatted message should include session ID."""
        session_id = "abc12345"
        formatter = SessionFormatter(session_id)

        # Create a log record
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        assert session_id in formatted

    def test_formatter_includes_level(self):
        """Formatted message should include log level."""
        formatter = SessionFormatter("test1234")

        record = logging.LogRecord(
            name="test",
            level=logging.WARNING,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        assert "WARNING" in formatted

    def test_formatter_includes_message(self):
        """Formatted message should include the log message."""
        formatter = SessionFormatter("test1234")

        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="My custom message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        assert "My custom message" in formatted

    def test_formatter_includes_timestamp(self):
        """Formatted message should include timestamp."""
        formatter = SessionFormatter("test1234")

        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=10,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        formatted = formatter.format(record)

        # Should have date-like pattern
        assert "-" in formatted  # Date separator
        assert ":" in formatted  # Time separator


class TestSetupLogging:
    """Tests for the setup_logging function."""

    def test_setup_logging_returns_logger(self):
        """setup_logging returns a Logger instance."""
        logger = setup_logging()

        assert isinstance(logger, logging.Logger)

    def test_setup_logging_logger_name(self):
        """setup_logging returns logger named 'FusionSystemBlocks'."""
        logger = setup_logging()

        assert logger.name == "FusionSystemBlocks"

    def test_setup_logging_idempotent(self):
        """Multiple calls to setup_logging are safe."""
        logger1 = setup_logging()
        logger2 = setup_logging()

        assert logger1 is logger2


class TestGetLogger:
    """Tests for the get_logger function."""

    def test_get_logger_returns_logger(self):
        """get_logger returns a Logger instance."""
        logger = get_logger("test_module")

        assert isinstance(logger, logging.Logger)

    def test_get_logger_prefixes_name(self):
        """get_logger prefixes module name with 'FusionSystemBlocks'."""
        logger = get_logger("my_module")

        assert "FusionSystemBlocks" in logger.name

    def test_get_logger_already_prefixed(self):
        """get_logger doesn't double-prefix names."""
        logger = get_logger("FusionSystemBlocks.sub")

        # Should not have double prefix
        assert logger.name == "FusionSystemBlocks.sub"


class TestLogExceptionsDecorator:
    """Tests for the log_exceptions decorator."""

    def test_decorator_passes_through_success(self):
        """Decorator passes through successful return value."""
        logger = logging.getLogger("test")

        @log_exceptions(logger, show_message_box=False)
        def successful_function():
            return "success"

        result = successful_function()

        assert result == "success"

    def test_decorator_catches_exception(self):
        """Decorator catches and handles exceptions."""
        logger = logging.getLogger("test")

        @log_exceptions(logger, show_message_box=False, reraise=False)
        def failing_function():
            raise ValueError("Test error")

        # Should not raise
        result = failing_function()

        assert result is None

    def test_decorator_reraise_option(self):
        """Decorator can reraise exceptions after logging."""
        logger = logging.getLogger("test")

        @log_exceptions(logger, show_message_box=False, reraise=True)
        def failing_function():
            raise ValueError("Test error")

        with pytest.raises(ValueError, match="Test error"):
            failing_function()

    def test_decorator_preserves_function_name(self):
        """Decorator preserves the original function name."""
        logger = logging.getLogger("test")

        @log_exceptions(logger, show_message_box=False)
        def my_named_function():
            return 42

        assert my_named_function.__name__ == "my_named_function"

    def test_decorator_logs_exception(self):
        """Decorator logs the exception."""
        logger = MagicMock(spec=logging.Logger)

        @log_exceptions(logger, show_message_box=False, reraise=False)
        def failing_function():
            raise RuntimeError("Logged error")

        failing_function()

        # Should have called logger.exception
        logger.exception.assert_called_once()
        call_args = str(logger.exception.call_args)
        assert "failing_function" in call_args


class TestLogHandlerEntryDecorator:
    """Tests for the log_handler_entry decorator."""

    def test_decorator_logs_entry_and_exit(self):
        """Decorator logs handler entry and exit."""
        logger = MagicMock(spec=logging.Logger)

        @log_handler_entry(logger, "TestHandler")
        def my_handler():
            return "done"

        result = my_handler()

        assert result == "done"
        # Should have logged entry and exit
        assert logger.debug.call_count == 2

    def test_decorator_logs_exit_on_exception(self):
        """Decorator logs exit even when exception occurs."""
        logger = MagicMock(spec=logging.Logger)

        @log_handler_entry(logger, "TestHandler")
        def failing_handler():
            raise ValueError("Handler failed")

        with pytest.raises(ValueError):
            failing_handler()

        # Should have logged entry and exit with exception
        assert logger.debug.call_count == 2


class TestCleanupOldLogs:
    """Tests for the cleanup_old_logs function."""

    def test_cleanup_returns_count(self):
        """cleanup_old_logs returns count of deleted files."""
        deleted = cleanup_old_logs(max_age_days=30, max_count=50)

        assert isinstance(deleted, int)
        assert deleted >= 0


class TestAddinVersion:
    """Tests for add-in version constant."""

    def test_version_is_string(self):
        """ADDIN_VERSION is a string."""
        assert isinstance(ADDIN_VERSION, str)

    def test_version_format(self):
        """ADDIN_VERSION follows semver-like format."""
        parts = ADDIN_VERSION.split(".")

        # Should have at least major.minor
        assert len(parts) >= 2

        # Parts should be numeric
        for part in parts:
            int(part)
