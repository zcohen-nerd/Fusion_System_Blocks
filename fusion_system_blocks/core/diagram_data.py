"""Wrapper module that re-exports the shared `diagram_data` package.

This keeps the packaged add-in in sync with the core implementation that
resides in ``src/diagram_data.py`` without duplicating hundreds of lines of
logic.  All public symbols remain available from
``fusion_system_blocks.core.diagram_data`` so existing imports continue to
work, while the actual functionality is sourced from the canonical module
used throughout development and testing.
"""

from __future__ import annotations

import importlib
import os
import sys
from types import ModuleType
from typing import Any, Iterable


def _resolve_shared_module() -> ModuleType:
    """Import the shared ``diagram_data`` module from the src folder."""

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    src_dir = os.path.join(base_dir, "src")

    if src_dir not in sys.path:
        # Insert near the front so the shared module wins over this package.
        sys.path.insert(0, src_dir)

    return importlib.import_module("diagram_data")


_SHARED_MODULE = _resolve_shared_module()


def _public_names(module: ModuleType) -> Iterable[str]:
    if hasattr(module, "__all__"):
        return module.__all__  # type: ignore[return-value]
    return [name for name in dir(module) if not name.startswith("_")]


__all__ = list(_public_names(_SHARED_MODULE))

# Populate the module globals so ``from ... import name`` continues to work.
for _name in __all__:
    globals()[_name] = getattr(_SHARED_MODULE, _name)


def __getattr__(name: str) -> Any:  # pragma: no cover - thin delegation
    if name in globals():
        return globals()[name]
    return getattr(_SHARED_MODULE, name)


def __dir__() -> Iterable[str]:  # pragma: no cover - thin delegation
    return sorted(set(__all__))
