"""Version control for System Blocks diagrams.

Provides snapshot-based version control with diff/compare support.
Snapshots capture the complete serialized state of a Graph at a point
in time, enabling history browsing, comparison, and rollback.

BOUNDARY: This module contains NO Fusion 360 dependencies.

Classes:
    SnapshotStore: In-memory history of graph snapshots.

Functions:
    create_snapshot: Capture a Graph's current state.
    diff_graphs: Produce a structured diff between two Graph objects.
    restore_snapshot: Reconstruct a Graph from a Snapshot.
"""

from __future__ import annotations

from typing import Any

from .models import (
    ConnectionChange,
    DiffResult,
    Graph,
    Snapshot,
    block_fingerprint,
)
from .serialization import (
    deserialize_graph,
    serialize_graph,
)

# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------


def create_snapshot(
    graph: Graph,
    *,
    author: str = "",
    description: str = "",
) -> Snapshot:
    """Capture the current state of *graph* as an immutable Snapshot.

    The entire graph is serialized to JSON so that future
    deserialization produces an independent copy — no shared
    references with the live graph.

    Args:
        graph: The graph to snapshot.
        author: Who created the snapshot (display only).
        description: Free-form commit note.

    Returns:
        A new :class:`Snapshot` containing the serialized graph.
    """
    json_str = serialize_graph(graph)
    return Snapshot(
        graph_json=json_str,
        author=author,
        description=description,
    )


def restore_snapshot(snapshot: Snapshot) -> Graph:
    """Reconstruct a Graph from a previously captured Snapshot.

    Returns a fully independent copy — mutations on the restored
    graph do not affect the snapshot or any other graph instance.

    Args:
        snapshot: The snapshot to restore.

    Returns:
        A new Graph instance matching the snapshot's state.

    Raises:
        ValueError: If the snapshot JSON is empty or invalid.
    """
    if not snapshot.graph_json:
        raise ValueError("Snapshot contains no graph data.")
    return deserialize_graph(snapshot.graph_json)


def diff_graphs(old: Graph, new: Graph) -> DiffResult:
    """Produce a structured diff between two Graph revisions.

    Compares blocks by ID and uses :func:`block_fingerprint` to
    detect modifications.  Connections are compared by ID; added,
    removed, and modified connections are reported individually.

    Args:
        old: The baseline graph (e.g. previous snapshot).
        new: The current graph.

    Returns:
        A :class:`DiffResult` listing added, removed, and modified
        blocks plus per-connection changes.
    """
    old_block_ids = {b.id for b in old.blocks}
    new_block_ids = {b.id for b in new.blocks}

    added = sorted(new_block_ids - old_block_ids)
    removed = sorted(old_block_ids - new_block_ids)

    # Detect modified blocks via fingerprint comparison
    old_fp = {b.id: block_fingerprint(b) for b in old.blocks if b.id in new_block_ids}
    new_fp = {b.id: block_fingerprint(b) for b in new.blocks if b.id in old_block_ids}
    modified = sorted(bid for bid in old_fp if old_fp[bid] != new_fp.get(bid))

    # Connection changes
    old_conn_ids = {c.id for c in old.connections}
    new_conn_ids = {c.id for c in new.connections}

    conn_changes: list[ConnectionChange] = []

    for cid in sorted(new_conn_ids - old_conn_ids):
        conn_changes.append(
            ConnectionChange(
                connection_id=cid,
                change_type="added",
            )
        )

    for cid in sorted(old_conn_ids - new_conn_ids):
        conn_changes.append(
            ConnectionChange(
                connection_id=cid,
                change_type="removed",
            )
        )

    # Modified connections — compare serialized forms
    old_conn_map = {c.id: c for c in old.connections}
    new_conn_map = {c.id: c for c in new.connections}
    for cid in sorted(old_conn_ids & new_conn_ids):
        oc = old_conn_map[cid]
        nc = new_conn_map[cid]
        changes: dict[str, Any] = {}
        if oc.from_block_id != nc.from_block_id:
            changes["from_block_id"] = {
                "old": oc.from_block_id,
                "new": nc.from_block_id,
            }
        if oc.to_block_id != nc.to_block_id:
            changes["to_block_id"] = {
                "old": oc.to_block_id,
                "new": nc.to_block_id,
            }
        if oc.kind != nc.kind:
            changes["kind"] = {
                "old": oc.kind,
                "new": nc.kind,
            }
        if changes:
            conn_changes.append(
                ConnectionChange(
                    connection_id=cid,
                    change_type="modified",
                    details=changes,
                )
            )

    return DiffResult(
        added_block_ids=added,
        removed_block_ids=removed,
        modified_block_ids=modified,
        connection_changes=conn_changes,
    )


# ------------------------------------------------------------------
# SnapshotStore
# ------------------------------------------------------------------


class SnapshotStore:
    """In-memory store for graph snapshots with history management.

    Provides ordered storage of snapshots with operations for
    creating, listing, retrieving, and comparing snapshots.

    Attributes:
        max_snapshots: Maximum number of snapshots to retain.
            When exceeded, the oldest snapshot is pruned.
    """

    def __init__(self, *, max_snapshots: int = 50) -> None:
        """Initialize an empty snapshot store.

        Args:
            max_snapshots: Maximum number of snapshots to keep.
        """
        self._snapshots: list[Snapshot] = []
        self.max_snapshots = max_snapshots

    @property
    def count(self) -> int:
        """Return the number of stored snapshots."""
        return len(self._snapshots)

    def add(
        self,
        graph: Graph,
        *,
        author: str = "",
        description: str = "",
    ) -> Snapshot:
        """Create and store a new snapshot of *graph*.

        If the store exceeds ``max_snapshots``, the oldest entry
        is automatically removed.

        Args:
            graph: The graph to snapshot.
            author: Who created the snapshot.
            description: Free-form commit message.

        Returns:
            The newly created Snapshot.
        """
        snap = create_snapshot(graph, author=author, description=description)
        self._snapshots.append(snap)
        # Prune oldest if over limit
        while len(self._snapshots) > self.max_snapshots:
            self._snapshots.pop(0)
        return snap

    def list_snapshots(self) -> list[dict[str, str]]:
        """Return summary metadata for every stored snapshot.

        Returns:
            List of dicts with ``id``, ``timestamp``, ``author``,
            and ``description`` keys — newest last.
        """
        return [
            {
                "id": s.id,
                "timestamp": s.timestamp,
                "author": s.author,
                "description": s.description,
            }
            for s in self._snapshots
        ]

    def get_by_id(self, snapshot_id: str) -> Snapshot | None:
        """Retrieve a snapshot by its unique ID.

        Args:
            snapshot_id: The ID to look up.

        Returns:
            The matching Snapshot, or None if not found.
        """
        for s in self._snapshots:
            if s.id == snapshot_id:
                return s
        return None

    def restore(self, snapshot_id: str) -> Graph:
        """Restore a graph from the snapshot with the given ID.

        Args:
            snapshot_id: ID of the snapshot to restore.

        Returns:
            A new Graph instance.

        Raises:
            KeyError: If no snapshot with that ID exists.
        """
        snap = self.get_by_id(snapshot_id)
        if snap is None:
            raise KeyError(f"Snapshot '{snapshot_id}' not found.")
        return restore_snapshot(snap)

    def compare(
        self,
        old_id: str,
        new_id: str,
    ) -> DiffResult:
        """Compute a diff between two stored snapshots.

        Args:
            old_id: ID of the baseline snapshot.
            new_id: ID of the newer snapshot.

        Returns:
            A :class:`DiffResult` describing the changes.

        Raises:
            KeyError: If either snapshot ID is missing.
        """
        old_snap = self.get_by_id(old_id)
        new_snap = self.get_by_id(new_id)
        if old_snap is None:
            raise KeyError(f"Baseline snapshot '{old_id}' not found.")
        if new_snap is None:
            raise KeyError(f"Target snapshot '{new_id}' not found.")
        old_graph = restore_snapshot(old_snap)
        new_graph = restore_snapshot(new_snap)
        return diff_graphs(old_graph, new_graph)

    def clear(self) -> None:
        """Remove all stored snapshots."""
        self._snapshots.clear()

    def to_list(self) -> list[dict[str, Any]]:
        """Serialize all snapshots to a list for persistence.

        Returns:
            List of dictionaries, each containing snapshot
            fields suitable for JSON serialization.
        """
        return [
            {
                "id": s.id,
                "graph_json": s.graph_json,
                "timestamp": s.timestamp,
                "author": s.author,
                "description": s.description,
            }
            for s in self._snapshots
        ]

    @classmethod
    def from_list(
        cls,
        data: list[dict[str, Any]],
        *,
        max_snapshots: int = 50,
    ) -> SnapshotStore:
        """Reconstruct a SnapshotStore from serialized data.

        Args:
            data: List of snapshot dictionaries.
            max_snapshots: Maximum capacity.

        Returns:
            A new SnapshotStore populated with the given data.
        """
        store = cls(max_snapshots=max_snapshots)
        for item in data:
            snap = Snapshot(
                id=item.get("id", ""),
                graph_json=item.get("graph_json", ""),
                timestamp=item.get("timestamp", ""),
                author=item.get("author", ""),
                description=item.get("description", ""),
            )
            store._snapshots.append(snap)
        return store
