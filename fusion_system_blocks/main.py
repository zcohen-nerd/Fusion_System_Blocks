"""Delegate to the canonical add-in implementation in ``Fusion_System_Blocks``.

This wrapper keeps the published package in lockstep with the top-level
``Fusion_System_Blocks.py`` entrypoint that is used throughout development and
testing, preventing the two from diverging.
"""

from __future__ import annotations

import importlib
import os
import sys
from types import ModuleType
from typing import Any, Iterable


def _load_entrypoint() -> ModuleType:
    """Import the shared add-in entrypoint from the repository root."""

    package_dir = os.path.dirname(__file__)
    repo_root = os.path.dirname(package_dir)

    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    return importlib.import_module("Fusion_System_Blocks")


_ENTRY_MODULE = _load_entrypoint()


def _public_names(module: ModuleType) -> Iterable[str]:
    if hasattr(module, "__all__"):
        return module.__all__  # type: ignore[return-value]
    return [name for name in dir(module) if not name.startswith("_")]


__all__ = list(_public_names(_ENTRY_MODULE))

for _name in __all__:
    globals()[_name] = getattr(_ENTRY_MODULE, _name)


def __getattr__(name: str) -> Any:  # pragma: no cover - thin delegation
    if name in globals():
        return globals()[name]
    return getattr(_ENTRY_MODULE, name)


def __dir__() -> Iterable[str]:  # pragma: no cover - thin delegation
    return sorted(set(__all__))
