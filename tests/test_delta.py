"""Tests for fsb_core.delta — JSON-Patch style diff & apply."""

from __future__ import annotations

import copy

import pytest

from fsb_core.delta import apply_patch, compute_patch, is_trivial_patch

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def simple_diagram() -> dict:
    return {
        "blocks": [
            {"id": "b1", "name": "Motor", "x": 100, "y": 200},
            {"id": "b2", "name": "Sensor", "x": 300, "y": 200},
        ],
        "connections": [
            {"id": "c1", "fromBlock": "b1", "toBlock": "b2"},
        ],
        "metadata": {"version": "2.0", "created": "2025-01-01"},
    }


# ---------------------------------------------------------------------------
# compute_patch — basic operations
# ---------------------------------------------------------------------------


class TestComputePatchBasic:
    """compute_patch on plain dicts/values."""

    def test_identical_objects_produce_empty_patch(self, simple_diagram: dict) -> None:
        patch = compute_patch(simple_diagram, copy.deepcopy(simple_diagram))
        assert patch == []

    def test_replace_primitive(self) -> None:
        old = {"a": 1}
        new = {"a": 2}
        patch = compute_patch(old, new)
        assert patch == [{"op": "replace", "path": "/a", "value": 2}]

    def test_add_key(self) -> None:
        old: dict = {"a": 1}
        new = {"a": 1, "b": 2}
        patch = compute_patch(old, new)
        assert {"op": "add", "path": "/b", "value": 2} in patch

    def test_remove_key(self) -> None:
        old = {"a": 1, "b": 2}
        new: dict = {"a": 1}
        patch = compute_patch(old, new)
        assert {"op": "remove", "path": "/b"} in patch

    def test_nested_dict_change(self) -> None:
        old = {"meta": {"version": "1.0"}}
        new = {"meta": {"version": "2.0"}}
        patch = compute_patch(old, new)
        assert patch == [{"op": "replace", "path": "/meta/version", "value": "2.0"}]


# ---------------------------------------------------------------------------
# compute_patch — list operations
# ---------------------------------------------------------------------------


class TestComputePatchLists:
    """compute_patch on lists (by-id and by-index)."""

    def test_id_keyed_modify(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"][0]["x"] = 150
        patch = compute_patch(simple_diagram, new)
        # Should detect the x change on b1
        replace_ops = [op for op in patch if op["op"] == "replace"]
        assert any(op["value"] == 150 for op in replace_ops)

    def test_id_keyed_add(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"].append({"id": "b3", "name": "Controller", "x": 500, "y": 200})
        patch = compute_patch(simple_diagram, new)
        add_ops = [op for op in patch if op["op"] == "add"]
        assert len(add_ops) >= 1

    def test_id_keyed_remove(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"] = [b for b in new["blocks"] if b["id"] != "b2"]
        patch = compute_patch(simple_diagram, new)
        remove_ops = [op for op in patch if op["op"] == "remove"]
        assert len(remove_ops) >= 1

    def test_index_based_list(self) -> None:
        old = {"tags": ["a", "b", "c"]}
        new = {"tags": ["a", "b", "d"]}
        patch = compute_patch(old, new)
        assert patch == [{"op": "replace", "path": "/tags/2", "value": "d"}]

    def test_index_based_add(self) -> None:
        old = {"tags": ["a"]}
        new = {"tags": ["a", "b"]}
        patch = compute_patch(old, new)
        assert {"op": "add", "path": "/tags/1", "value": "b"} in patch

    def test_index_based_remove(self) -> None:
        old = {"tags": ["a", "b"]}
        new = {"tags": ["a"]}
        patch = compute_patch(old, new)
        assert {"op": "remove", "path": "/tags/1"} in patch


# ---------------------------------------------------------------------------
# apply_patch
# ---------------------------------------------------------------------------


class TestApplyPatch:
    """apply_patch round-trips with compute_patch."""

    def test_roundtrip_simple(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"][0]["x"] = 999
        new["metadata"]["version"] = "3.0"
        patch = compute_patch(simple_diagram, new)
        result = apply_patch(simple_diagram, patch)
        assert result["blocks"][0]["x"] == 999
        assert result["metadata"]["version"] == "3.0"

    def test_roundtrip_add_block(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"].append({"id": "b3", "name": "New", "x": 0, "y": 0})
        patch = compute_patch(simple_diagram, new)
        result = apply_patch(simple_diagram, patch)
        ids = [b["id"] for b in result["blocks"]]
        assert "b3" in ids

    def test_roundtrip_remove_block(self, simple_diagram: dict) -> None:
        new = copy.deepcopy(simple_diagram)
        new["blocks"] = [b for b in new["blocks"] if b["id"] != "b2"]
        patch = compute_patch(simple_diagram, new)
        result = apply_patch(simple_diagram, patch)
        ids = [b["id"] for b in result["blocks"]]
        assert "b2" not in ids

    def test_apply_does_not_mutate_original(self, simple_diagram: dict) -> None:
        original = copy.deepcopy(simple_diagram)
        patch = [{"op": "replace", "path": "/metadata/version", "value": "9.9"}]
        apply_patch(simple_diagram, patch)
        assert simple_diagram == original

    def test_apply_add_new_key(self) -> None:
        doc = {"a": 1}
        patch = [{"op": "add", "path": "/b", "value": 42}]
        result = apply_patch(doc, patch)
        assert result == {"a": 1, "b": 42}

    def test_apply_remove_key(self) -> None:
        doc = {"a": 1, "b": 2}
        patch = [{"op": "remove", "path": "/b"}]
        result = apply_patch(doc, patch)
        assert result == {"a": 1}

    def test_apply_replace(self) -> None:
        doc = {"a": 1}
        patch = [{"op": "replace", "path": "/a", "value": 99}]
        result = apply_patch(doc, patch)
        assert result == {"a": 99}

    def test_apply_empty_patch(self, simple_diagram: dict) -> None:
        result = apply_patch(simple_diagram, [])
        assert result == simple_diagram


# ---------------------------------------------------------------------------
# is_trivial_patch
# ---------------------------------------------------------------------------


class TestIsTrivialPatch:
    def test_empty_is_trivial(self) -> None:
        assert is_trivial_patch([]) is True

    def test_nonempty_is_not_trivial(self) -> None:
        assert is_trivial_patch([{"op": "replace", "path": "/a", "value": 1}]) is False


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    def test_type_change(self) -> None:
        """When a value changes type (dict → list), emit a replace."""
        old = {"x": {"nested": True}}
        new = {"x": [1, 2, 3]}
        patch = compute_patch(old, new)
        assert patch == [{"op": "replace", "path": "/x", "value": [1, 2, 3]}]

    def test_empty_dicts(self) -> None:
        assert compute_patch({}, {}) == []

    def test_empty_to_populated(self) -> None:
        patch = compute_patch({}, {"a": 1})
        assert patch == [{"op": "add", "path": "/a", "value": 1}]

    def test_populated_to_empty(self) -> None:
        patch = compute_patch({"a": 1}, {})
        assert patch == [{"op": "remove", "path": "/a"}]

    def test_deep_nested_change(self) -> None:
        old = {"level1": {"level2": {"level3": "old"}}}
        new = {"level1": {"level2": {"level3": "new"}}}
        patch = compute_patch(old, new)
        assert patch == [
            {"op": "replace", "path": "/level1/level2/level3", "value": "new"}
        ]

    def test_empty_list_is_not_id_keyed(self) -> None:
        """An empty list should not be treated as id-keyed."""
        old = {"items": []}
        new = {"items": [1]}
        patch = compute_patch(old, new)
        assert patch == [{"op": "add", "path": "/items/0", "value": 1}]

    def test_mixed_list_not_id_keyed(self) -> None:
        """A list with non-dict elements falls back to index-based diff."""
        old = {"items": [1, 2, 3]}
        new = {"items": [1, 2, 4]}
        patch = compute_patch(old, new)
        assert patch == [{"op": "replace", "path": "/items/2", "value": 4}]
