"""Delta serialization for efficient bridge communication.

Instead of sending the full diagram JSON for every update, this module
computes minimal diffs (JSON-Patch–style operations) to reduce data
transferred across the Fusion 360 Python ↔ JS bridge.

The implementation follows `RFC 6902 — JSON Patch
<https://datatracker.ietf.org/doc/html/rfc6902>`_ semantics with a
simplified subset: **add**, **remove**, **replace**.

Usage
-----
Python side (computing a patch)::

    from fsb_core.delta import compute_patch, apply_patch

    old = {"blocks": [{"id": "b1", "x": 10}]}
    new = {"blocks": [{"id": "b1", "x": 20}]}
    patch = compute_patch(old, new)
    # => [{"op": "replace", "path": "/blocks/0/x", "value": 20}]

    restored = apply_patch(old, patch)
    assert restored == new

JavaScript side (applying a patch received from Python)::

    // patch is the array from compute_patch
    const updated = applyPatch(currentDiagram, patch);
"""

from __future__ import annotations

import copy
from typing import Any


def compute_patch(
    old: dict[str, Any],
    new: dict[str, Any],
    *,
    path: str = "",
) -> list[dict[str, Any]]:
    """Compute a JSON-Patch–style diff between *old* and *new*.

    Returns a list of operations (``add``, ``remove``, ``replace``)
    that transform *old* into *new*.

    For arrays of objects with an ``"id"`` key (like ``blocks`` and
    ``connections``), matching is done by ``id`` rather than by index
    so that reordering doesn't generate spurious diffs.
    """
    ops: list[dict[str, Any]] = []
    _diff(old, new, path, ops)
    return ops


def apply_patch(
    doc: dict[str, Any],
    patch: list[dict[str, Any]],
) -> dict[str, Any]:
    """Apply a JSON-Patch list to *doc* and return the updated document.

    The original *doc* is **not** mutated; a deep copy is made first.
    """
    result = copy.deepcopy(doc)
    for op in patch:
        _apply_op(result, op)
    return result


def is_trivial_patch(patch: list[dict[str, Any]]) -> bool:
    """Return ``True`` if the patch is empty (no changes)."""
    return len(patch) == 0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _diff(
    old: Any,
    new: Any,
    path: str,
    ops: list[dict[str, Any]],
) -> None:
    """Recursively compute diffs."""
    if old == new:
        return

    if isinstance(old, dict) and isinstance(new, dict):
        _diff_dict(old, new, path, ops)
    elif isinstance(old, list) and isinstance(new, list):
        _diff_list(old, new, path, ops)
    else:
        # Primitive value changed (or type changed)
        ops.append({"op": "replace", "path": path, "value": new})


def _diff_dict(
    old: dict[str, Any],
    new: dict[str, Any],
    path: str,
    ops: list[dict[str, Any]],
) -> None:
    all_keys = set(old) | set(new)
    for key in sorted(all_keys):
        child_path = f"{path}/{key}"
        if key not in old:
            ops.append({"op": "add", "path": child_path, "value": new[key]})
        elif key not in new:
            ops.append({"op": "remove", "path": child_path})
        else:
            _diff(old[key], new[key], child_path, ops)


def _diff_list(
    old: list[Any],
    new: list[Any],
    path: str,
    ops: list[dict[str, Any]],
) -> None:
    """Diff two lists.

    If every element has a unique ``"id"`` key, use id-based matching
    (stable across reordering).  Otherwise, fall back to index-based.
    """
    if _is_id_keyed(old) and _is_id_keyed(new):
        _diff_list_by_id(old, new, path, ops)
    else:
        _diff_list_by_index(old, new, path, ops)


def _is_id_keyed(lst: list[Any]) -> bool:
    """Return True if every element is a dict with a unique ``"id"`` key."""
    if not lst:
        return False
    ids: list[str] = []
    for item in lst:
        if not isinstance(item, dict) or "id" not in item:
            return False
        ids.append(item["id"])
    return len(ids) == len(set(ids))


def _diff_list_by_id(
    old: list[dict[str, Any]],
    new: list[dict[str, Any]],
    path: str,
    ops: list[dict[str, Any]],
) -> None:
    old_map = {item["id"]: (i, item) for i, item in enumerate(old)}
    new_map = {item["id"]: (i, item) for i, item in enumerate(new)}

    # Removed items
    for item_id in old_map:
        if item_id not in new_map:
            idx = old_map[item_id][0]
            ops.append({"op": "remove", "path": f"{path}/{idx}"})

    # Added items
    for item_id in new_map:
        if item_id not in old_map:
            idx = new_map[item_id][0]
            ops.append(
                {
                    "op": "add",
                    "path": f"{path}/{idx}",
                    "value": new_map[item_id][1],
                }
            )

    # Modified items (compare by matching id)
    for item_id in old_map:
        if item_id in new_map:
            old_idx = old_map[item_id][0]
            _diff(old_map[item_id][1], new_map[item_id][1], f"{path}/{old_idx}", ops)


def _diff_list_by_index(
    old: list[Any],
    new: list[Any],
    path: str,
    ops: list[dict[str, Any]],
) -> None:
    max_len = max(len(old), len(new))
    for i in range(max_len):
        child_path = f"{path}/{i}"
        if i >= len(old):
            ops.append({"op": "add", "path": child_path, "value": new[i]})
        elif i >= len(new):
            ops.append({"op": "remove", "path": child_path})
        else:
            _diff(old[i], new[i], child_path, ops)


def _apply_op(doc: Any, op: dict[str, Any]) -> None:
    """Apply a single patch operation to *doc* (in place)."""
    path_parts = op["path"].strip("/").split("/") if op["path"] else []
    operation = op["op"]

    if not path_parts:
        return

    # Navigate to parent
    target = doc
    for part in path_parts[:-1]:
        if isinstance(target, list):
            target = target[int(part)]
        else:
            target = target[part]

    final_key = path_parts[-1]

    if isinstance(target, list):
        idx = int(final_key)
        if operation == "add":
            target.insert(idx, op["value"])
        elif operation == "remove":
            if idx < len(target):
                target.pop(idx)
        elif operation == "replace":
            target[idx] = op["value"]
    else:
        if operation == "add":
            target[final_key] = op["value"]
        elif operation == "remove":
            target.pop(final_key, None)
        elif operation == "replace":
            target[final_key] = op["value"]
