"""Tests for fsb_core.version_control module.

Covers snapshot creation, restoration, graph diffing, and
SnapshotStore management with 25+ test cases for full coverage.
"""

from __future__ import annotations

import json

import pytest

from fsb_core.models import (
    Block,
    BlockStatus,
    Connection,
    DiffResult,
    Graph,
    Port,
    PortDirection,
    PortKind,
    Requirement,
    Snapshot,
)
from fsb_core.version_control import (
    SnapshotStore,
    create_snapshot,
    diff_graphs,
    restore_snapshot,
)

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _make_graph(
    name: str = "Test",
    num_blocks: int = 2,
    num_connections: int = 1,
) -> Graph:
    """Build a small deterministic graph for testing."""
    g = Graph(name=name)
    blocks = []
    for i in range(num_blocks):
        b = Block(
            id=f"b{i}",
            name=f"Block {i}",
            block_type="Generic",
            x=i * 100,
            y=0,
            status=BlockStatus.PLANNED,
        )
        b.add_port(
            Port(
                id=f"p{i}-out",
                name="out",
                direction=PortDirection.OUTPUT,
                kind=PortKind.DATA,
            )
        )
        g.add_block(b)
        blocks.append(b)
    for i in range(min(num_connections, num_blocks - 1)):
        g.add_connection(
            Connection(
                id=f"c{i}",
                from_block_id=blocks[i].id,
                to_block_id=blocks[i + 1].id,
                kind="data",
            )
        )
    return g


# ==================================================================
# create_snapshot / restore_snapshot
# ==================================================================


class TestCreateSnapshot:
    """Tests for create_snapshot()."""

    def test_basic_snapshot(self) -> None:
        """Snapshot captures graph JSON with metadata."""
        g = _make_graph()
        snap = create_snapshot(g, author="tester", description="v1")
        assert isinstance(snap, Snapshot)
        assert snap.author == "tester"
        assert snap.description == "v1"
        assert snap.graph_json != ""
        assert snap.id != ""
        assert snap.timestamp != ""

    def test_snapshot_json_is_valid(self) -> None:
        """Snapshot graph_json can be parsed back to JSON."""
        g = _make_graph()
        snap = create_snapshot(g)
        data = json.loads(snap.graph_json)
        assert data["name"] == "Test"
        assert len(data["blocks"]) == 2

    def test_snapshot_is_independent(self) -> None:
        """Mutating the original graph after snapshot has no effect."""
        g = _make_graph()
        snap = create_snapshot(g)
        g.blocks[0].name = "MUTATED"
        restored = restore_snapshot(snap)
        assert restored.blocks[0].name == "Block 0"

    def test_each_snapshot_gets_unique_id(self) -> None:
        """Multiple snapshots of the same graph get distinct IDs."""
        g = _make_graph()
        s1 = create_snapshot(g)
        s2 = create_snapshot(g)
        assert s1.id != s2.id


class TestRestoreSnapshot:
    """Tests for restore_snapshot()."""

    def test_restore_produces_equivalent_graph(self) -> None:
        """Restored graph matches original block/connection counts."""
        g = _make_graph(num_blocks=3, num_connections=2)
        snap = create_snapshot(g)
        restored = restore_snapshot(snap)
        assert len(restored.blocks) == 3
        assert len(restored.connections) == 2
        assert restored.name == "Test"

    def test_restore_preserves_block_details(self) -> None:
        """Restored blocks retain all fields."""
        g = _make_graph()
        g.blocks[0].attributes["mass"] = 1.5
        snap = create_snapshot(g)
        restored = restore_snapshot(snap)
        assert restored.blocks[0].attributes.get("mass") == 1.5

    def test_restore_empty_snapshot_raises(self) -> None:
        """Restoring a snapshot with empty JSON raises ValueError."""
        snap = Snapshot(graph_json="")
        with pytest.raises(ValueError, match="no graph data"):
            restore_snapshot(snap)

    def test_restore_invalid_json_raises(self) -> None:
        """Restoring a snapshot with invalid JSON raises ValueError."""
        snap = Snapshot(graph_json="not-valid-json")
        with pytest.raises(ValueError):
            restore_snapshot(snap)

    def test_roundtrip_with_requirements(self) -> None:
        """Requirements survive a snapshot roundtrip."""
        g = _make_graph()
        g.requirements.append(
            Requirement(id="r1", name="Max Weight", target_value=10.0)
        )
        snap = create_snapshot(g)
        restored = restore_snapshot(snap)
        assert len(restored.requirements) == 1
        assert restored.requirements[0].name == "Max Weight"


# ==================================================================
# diff_graphs
# ==================================================================


class TestDiffGraphs:
    """Tests for diff_graphs()."""

    def test_identical_graphs_produce_empty_diff(self) -> None:
        """Diffing a graph against itself yields no changes."""
        g = _make_graph()
        diff = diff_graphs(g, g)
        assert diff.added_block_ids == []
        assert diff.removed_block_ids == []
        assert diff.modified_block_ids == []
        assert diff.connection_changes == []

    def test_added_block_detected(self) -> None:
        """A new block in 'new' graph appears in added_block_ids."""
        old = _make_graph(num_blocks=2)
        new = _make_graph(num_blocks=2)
        new.add_block(Block(id="b-new", name="Extra"))
        diff = diff_graphs(old, new)
        assert "b-new" in diff.added_block_ids

    def test_removed_block_detected(self) -> None:
        """A block missing from 'new' appears in removed_block_ids."""
        old = _make_graph(num_blocks=3)
        new = _make_graph(num_blocks=2)
        diff = diff_graphs(old, new)
        assert "b2" in diff.removed_block_ids

    def test_modified_block_detected(self) -> None:
        """Changing a block's name shows up in modified_block_ids."""
        old = _make_graph()
        new = _make_graph()
        new.blocks[0].name = "Renamed Block"
        diff = diff_graphs(old, new)
        assert "b0" in diff.modified_block_ids

    def test_modified_block_position_change(self) -> None:
        """Moving a block changes its fingerprint."""
        old = _make_graph()
        new = _make_graph()
        new.blocks[1].x = 999
        diff = diff_graphs(old, new)
        assert "b1" in diff.modified_block_ids

    def test_added_connection_detected(self) -> None:
        """A new connection in 'new' graph is reported."""
        old = _make_graph(num_blocks=3, num_connections=1)
        new = _make_graph(num_blocks=3, num_connections=1)
        new.add_connection(Connection(id="c-new", from_block_id="b1", to_block_id="b2"))
        diff = diff_graphs(old, new)
        added = [c for c in diff.connection_changes if c.change_type == "added"]
        assert any(c.connection_id == "c-new" for c in added)

    def test_removed_connection_detected(self) -> None:
        """A connection missing from 'new' is reported as removed."""
        old = _make_graph(num_blocks=2, num_connections=1)
        new = _make_graph(num_blocks=2, num_connections=0)
        diff = diff_graphs(old, new)
        removed = [c for c in diff.connection_changes if c.change_type == "removed"]
        assert any(c.connection_id == "c0" for c in removed)

    def test_modified_connection_kind(self) -> None:
        """Changing a connection's kind produces a modified change."""
        old = _make_graph(num_blocks=2, num_connections=1)
        new = _make_graph(num_blocks=2, num_connections=1)
        new.connections[0].kind = "power"
        diff = diff_graphs(old, new)
        modified = [c for c in diff.connection_changes if c.change_type == "modified"]
        assert len(modified) == 1
        assert modified[0].details["kind"]["old"] == "data"
        assert modified[0].details["kind"]["new"] == "power"

    def test_diff_returns_correct_type(self) -> None:
        """diff_graphs returns a DiffResult instance."""
        g = _make_graph()
        diff = diff_graphs(g, g)
        assert isinstance(diff, DiffResult)


# ==================================================================
# SnapshotStore
# ==================================================================


class TestSnapshotStore:
    """Tests for SnapshotStore class."""

    def test_empty_store(self) -> None:
        """New store has zero count and empty list."""
        store = SnapshotStore()
        assert store.count == 0
        assert store.list_snapshots() == []

    def test_add_and_list(self) -> None:
        """Adding a snapshot increases count and appears in list."""
        store = SnapshotStore()
        g = _make_graph()
        snap = store.add(g, description="first")
        assert store.count == 1
        items = store.list_snapshots()
        assert len(items) == 1
        assert items[0]["description"] == "first"
        assert items[0]["id"] == snap.id

    def test_get_by_id(self) -> None:
        """Retrieving a snapshot by ID returns the correct one."""
        store = SnapshotStore()
        g = _make_graph()
        snap = store.add(g, description="target")
        store.add(g, description="other")
        found = store.get_by_id(snap.id)
        assert found is not None
        assert found.description == "target"

    def test_get_by_id_not_found(self) -> None:
        """Looking up a nonexistent ID returns None."""
        store = SnapshotStore()
        assert store.get_by_id("nonexistent") is None

    def test_restore_by_id(self) -> None:
        """Restoring from store by ID returns working graph."""
        store = SnapshotStore()
        g = _make_graph(name="Original")
        snap = store.add(g)
        restored = store.restore(snap.id)
        assert restored.name == "Original"
        assert len(restored.blocks) == 2

    def test_restore_missing_id_raises(self) -> None:
        """Restoring a missing snapshot raises KeyError."""
        store = SnapshotStore()
        with pytest.raises(KeyError):
            store.restore("does-not-exist")

    def test_compare_snapshots(self) -> None:
        """Comparing two snapshots returns a valid DiffResult."""
        store = SnapshotStore()
        g1 = _make_graph(name="v1")
        s1 = store.add(g1, description="baseline")
        g2 = _make_graph(name="v2")
        g2.add_block(Block(id="b-extra", name="New"))
        s2 = store.add(g2, description="added block")
        diff = store.compare(s1.id, s2.id)
        assert "b-extra" in diff.added_block_ids

    def test_compare_missing_baseline_raises(self) -> None:
        """Comparing with a missing baseline raises KeyError."""
        store = SnapshotStore()
        g = _make_graph()
        s = store.add(g)
        with pytest.raises(KeyError, match="Baseline"):
            store.compare("missing", s.id)

    def test_compare_missing_target_raises(self) -> None:
        """Comparing with a missing target raises KeyError."""
        store = SnapshotStore()
        g = _make_graph()
        s = store.add(g)
        with pytest.raises(KeyError, match="Target"):
            store.compare(s.id, "missing")

    def test_max_snapshots_prunes_oldest(self) -> None:
        """Exceeding max_snapshots removes the oldest entries."""
        store = SnapshotStore(max_snapshots=3)
        g = _make_graph()
        ids = []
        for i in range(5):
            s = store.add(g, description=f"snap-{i}")
            ids.append(s.id)
        assert store.count == 3
        # Oldest two should be gone
        assert store.get_by_id(ids[0]) is None
        assert store.get_by_id(ids[1]) is None
        # Newest three remain
        assert store.get_by_id(ids[2]) is not None
        assert store.get_by_id(ids[4]) is not None

    def test_clear(self) -> None:
        """clear() empties the store."""
        store = SnapshotStore()
        store.add(_make_graph())
        store.add(_make_graph())
        store.clear()
        assert store.count == 0

    def test_serialization_roundtrip(self) -> None:
        """to_list / from_list preserve all snapshot data."""
        store = SnapshotStore()
        g = _make_graph()
        store.add(g, author="alice", description="checkpoint")
        store.add(g, author="bob", description="release")
        data = store.to_list()
        restored = SnapshotStore.from_list(data)
        assert restored.count == 2
        items = restored.list_snapshots()
        assert items[0]["author"] == "alice"
        assert items[1]["author"] == "bob"

    def test_from_list_empty(self) -> None:
        """from_list with empty list creates empty store."""
        store = SnapshotStore.from_list([])
        assert store.count == 0
