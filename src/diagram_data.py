"""
Core diagram data model and operations for System Blocks.

BACKWARD COMPATIBILITY WRAPPER:
This module has been refactored into a modular package structure at src/diagram/.
This file now serves as a compatibility wrapper that re-exports all functions
from the new modular structure.

For new code, prefer importing from the package directly:
    from diagram import create_block, validate_diagram

This wrapper will be maintained for backward compatibility with existing code.
"""

# Re-export all functions from the modular diagram package
from diagram import *  # noqa: F401, F403
