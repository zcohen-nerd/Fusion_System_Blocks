"""Action plan builder for Fusion layer operations.

This module generates ordered lists of actions that the Fusion adapter
layer should execute to synchronize the Fusion document with the graph state.

BOUNDARY: This module contains NO Fusion 360 dependencies. It produces
abstract action descriptions that the Fusion adapter interprets and executes.

Functions:
    build_action_plan: Generate ordered actions from a validated graph.

Classes:
    ActionType: Enum of all possible action types.
    ActionPlan: Structured action descriptor.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from core.models import Block, Connection, Graph, Port


class ActionType(Enum):
    """Types of actions the Fusion layer can execute.

    Each action type corresponds to a specific operation that modifies
    the Fusion document to reflect the graph state.
    """

    # Block operations
    CREATE_BLOCK = "CREATE_BLOCK"
    UPDATE_BLOCK = "UPDATE_BLOCK"
    DELETE_BLOCK = "DELETE_BLOCK"
    MOVE_BLOCK = "MOVE_BLOCK"

    # Port operations
    CREATE_PORT = "CREATE_PORT"
    UPDATE_PORT = "UPDATE_PORT"
    DELETE_PORT = "DELETE_PORT"

    # Connection operations
    CREATE_CONNECTION = "CREATE_CONNECTION"
    UPDATE_CONNECTION = "UPDATE_CONNECTION"
    DELETE_CONNECTION = "DELETE_CONNECTION"

    # CAD link operations
    LINK_CAD_COMPONENT = "LINK_CAD_COMPONENT"
    UNLINK_CAD_COMPONENT = "UNLINK_CAD_COMPONENT"
    SYNC_CAD_PROPERTIES = "SYNC_CAD_PROPERTIES"

    # Document operations
    SAVE_ATTRIBUTES = "SAVE_ATTRIBUTES"
    REFRESH_DISPLAY = "REFRESH_DISPLAY"

    # Validation/notification operations
    SHOW_WARNING = "SHOW_WARNING"
    SHOW_ERROR = "SHOW_ERROR"


@dataclass
class ActionPlan:
    """Structured action descriptor for Fusion layer execution.

    Each ActionPlan represents a single atomic operation that the Fusion
    adapter layer should execute. Actions are ordered and may depend on
    previous actions completing successfully.

    Attributes:
        action_type: The type of action to perform.
        target_id: ID of the graph element being acted upon.
        target_type: Type of target ("block", "port", "connection").
        description: Human-readable description of the action.
        params: Action-specific parameters.
        priority: Execution priority (lower = earlier, default=100).
        depends_on: List of action IDs this action depends on.
    """

    action_type: ActionType
    target_id: str
    target_type: str = "block"
    description: str = ""
    params: Dict[str, Any] = field(default_factory=dict)
    priority: int = 100
    depends_on: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert action to dictionary for serialization.

        Returns:
            Dictionary representation of the action.
        """
        return {
            "action_type": self.action_type.value,
            "target_id": self.target_id,
            "target_type": self.target_type,
            "description": self.description,
            "params": self.params,
            "priority": self.priority,
            "depends_on": self.depends_on,
        }


def build_action_plan(
    graph: Graph,
    previous_graph: Optional[Graph] = None,
    include_refresh: bool = True,
) -> List[ActionPlan]:
    """Build an ordered list of actions from a graph.

    Analyzes the graph (and optionally compares to a previous state) to
    generate a sequence of actions the Fusion layer should execute to
    synchronize the document.

    When no previous_graph is provided, generates actions to create all
    elements from scratch. When previous_graph is provided, generates
    only the delta (create/update/delete) actions needed.

    Args:
        graph: The current graph state to realize.
        previous_graph: Optional previous graph state for delta computation.
        include_refresh: Whether to include a final REFRESH_DISPLAY action.

    Returns:
        Ordered list of ActionPlan instances.

    Example:
        >>> graph = Graph()
        >>> graph.add_block(Block(name="MCU"))
        >>> actions = build_action_plan(graph)
        >>> for action in actions:
        ...     print(f"{action.action_type.value}: {action.description}")
    """
    actions: List[ActionPlan] = []

    if previous_graph is None:
        # Full creation mode - create everything
        actions.extend(_build_create_actions(graph))
    else:
        # Delta mode - compute differences
        actions.extend(_build_delta_actions(graph, previous_graph))

    # Add CAD sync actions for blocks with links
    actions.extend(_build_cad_sync_actions(graph))

    # Add final save and refresh
    actions.append(
        ActionPlan(
            action_type=ActionType.SAVE_ATTRIBUTES,
            target_id=graph.id,
            target_type="graph",
            description="Save graph attributes to Fusion document",
            priority=900,
        )
    )

    if include_refresh:
        actions.append(
            ActionPlan(
                action_type=ActionType.REFRESH_DISPLAY,
                target_id=graph.id,
                target_type="graph",
                description="Refresh the diagram display",
                priority=1000,
            )
        )

    # Sort by priority
    actions.sort(key=lambda a: a.priority)

    return actions


def _build_create_actions(graph: Graph) -> List[ActionPlan]:
    """Generate actions to create all graph elements.

    Args:
        graph: The graph to create actions for.

    Returns:
        List of creation actions.
    """
    actions: List[ActionPlan] = []

    # Create blocks first (priority 10)
    for block in graph.blocks:
        actions.append(
            ActionPlan(
                action_type=ActionType.CREATE_BLOCK,
                target_id=block.id,
                target_type="block",
                description=f"Create block '{block.name}'",
                params={
                    "name": block.name,
                    "block_type": block.block_type,
                    "x": block.x,
                    "y": block.y,
                    "status": block.status.value,
                    "attributes": block.attributes,
                },
                priority=10,
            )
        )

        # Create ports for this block (priority 20)
        for port in block.ports:
            actions.append(
                ActionPlan(
                    action_type=ActionType.CREATE_PORT,
                    target_id=port.id,
                    target_type="port",
                    description=f"Create port '{port.name}' on block '{block.name}'",
                    params={
                        "block_id": block.id,
                        "name": port.name,
                        "direction": port.direction.value,
                        "kind": port.kind.value,
                        "side": port.side,
                        "index": port.index,
                        "params": port.params,
                    },
                    priority=20,
                    depends_on=[block.id],
                )
            )

    # Create connections last (priority 30)
    for conn in graph.connections:
        from_block = graph.get_block_by_id(conn.from_block_id)
        to_block = graph.get_block_by_id(conn.to_block_id)

        from_name = from_block.name if from_block else conn.from_block_id
        to_name = to_block.name if to_block else conn.to_block_id

        actions.append(
            ActionPlan(
                action_type=ActionType.CREATE_CONNECTION,
                target_id=conn.id,
                target_type="connection",
                description=f"Create connection from '{from_name}' to '{to_name}'",
                params={
                    "from_block_id": conn.from_block_id,
                    "from_port_id": conn.from_port_id,
                    "to_block_id": conn.to_block_id,
                    "to_port_id": conn.to_port_id,
                    "kind": conn.kind,
                    "attributes": conn.attributes,
                },
                priority=30,
                depends_on=[conn.from_block_id, conn.to_block_id],
            )
        )

    return actions


def _build_delta_actions(graph: Graph, previous: Graph) -> List[ActionPlan]:
    """Generate actions for differences between two graphs.

    Args:
        graph: The new graph state.
        previous: The previous graph state.

    Returns:
        List of delta actions (create/update/delete).
    """
    actions: List[ActionPlan] = []

    current_block_ids = {b.id for b in graph.blocks}
    previous_block_ids = {b.id for b in previous.blocks}

    current_conn_ids = {c.id for c in graph.connections}
    previous_conn_ids = {c.id for c in previous.connections}

    # Blocks to create
    for block_id in current_block_ids - previous_block_ids:
        block = graph.get_block_by_id(block_id)
        if block:
            actions.append(
                ActionPlan(
                    action_type=ActionType.CREATE_BLOCK,
                    target_id=block.id,
                    target_type="block",
                    description=f"Create new block '{block.name}'",
                    params={
                        "name": block.name,
                        "block_type": block.block_type,
                        "x": block.x,
                        "y": block.y,
                        "status": block.status.value,
                        "attributes": block.attributes,
                    },
                    priority=10,
                )
            )
            # Also create ports for new blocks
            for port in block.ports:
                actions.append(
                    ActionPlan(
                        action_type=ActionType.CREATE_PORT,
                        target_id=port.id,
                        target_type="port",
                        description=f"Create port '{port.name}' on '{block.name}'",
                        params={
                            "block_id": block.id,
                            "name": port.name,
                            "direction": port.direction.value,
                            "kind": port.kind.value,
                            "side": port.side,
                            "index": port.index,
                        },
                        priority=20,
                        depends_on=[block.id],
                    )
                )

    # Blocks to delete
    for block_id in previous_block_ids - current_block_ids:
        prev_block = previous.get_block_by_id(block_id)
        name = prev_block.name if prev_block else block_id
        actions.append(
            ActionPlan(
                action_type=ActionType.DELETE_BLOCK,
                target_id=block_id,
                target_type="block",
                description=f"Delete block '{name}'",
                priority=5,  # Delete before creates
            )
        )

    # Blocks to potentially update
    for block_id in current_block_ids & previous_block_ids:
        current = graph.get_block_by_id(block_id)
        prev = previous.get_block_by_id(block_id)

        if current and prev:
            changes = _get_block_changes(current, prev)
            if changes:
                actions.append(
                    ActionPlan(
                        action_type=ActionType.UPDATE_BLOCK,
                        target_id=block_id,
                        target_type="block",
                        description=f"Update block '{current.name}'",
                        params={"changes": changes},
                        priority=15,
                    )
                )

            # Check for position changes
            if current.x != prev.x or current.y != prev.y:
                actions.append(
                    ActionPlan(
                        action_type=ActionType.MOVE_BLOCK,
                        target_id=block_id,
                        target_type="block",
                        description=f"Move block '{current.name}'",
                        params={
                            "from_x": prev.x,
                            "from_y": prev.y,
                            "to_x": current.x,
                            "to_y": current.y,
                        },
                        priority=15,
                    )
                )

    # Connections to create
    for conn_id in current_conn_ids - previous_conn_ids:
        conn = graph.get_connection_by_id(conn_id)
        if conn:
            from_block = graph.get_block_by_id(conn.from_block_id)
            to_block = graph.get_block_by_id(conn.to_block_id)
            from_name = from_block.name if from_block else conn.from_block_id
            to_name = to_block.name if to_block else conn.to_block_id

            actions.append(
                ActionPlan(
                    action_type=ActionType.CREATE_CONNECTION,
                    target_id=conn.id,
                    target_type="connection",
                    description=f"Create connection '{from_name}' -> '{to_name}'",
                    params={
                        "from_block_id": conn.from_block_id,
                        "from_port_id": conn.from_port_id,
                        "to_block_id": conn.to_block_id,
                        "to_port_id": conn.to_port_id,
                        "kind": conn.kind,
                    },
                    priority=30,
                )
            )

    # Connections to delete
    for conn_id in previous_conn_ids - current_conn_ids:
        actions.append(
            ActionPlan(
                action_type=ActionType.DELETE_CONNECTION,
                target_id=conn_id,
                target_type="connection",
                description=f"Delete connection '{conn_id}'",
                priority=3,  # Delete connections before blocks
            )
        )

    return actions


def _get_block_changes(current: Block, previous: Block) -> Dict[str, Any]:
    """Compute property changes between two block versions.

    Args:
        current: The new block state.
        previous: The old block state.

    Returns:
        Dictionary of changed properties with old and new values.
    """
    changes: Dict[str, Any] = {}

    if current.name != previous.name:
        changes["name"] = {"old": previous.name, "new": current.name}

    if current.block_type != previous.block_type:
        changes["block_type"] = {"old": previous.block_type, "new": current.block_type}

    if current.status != previous.status:
        changes["status"] = {"old": previous.status.value, "new": current.status.value}

    if current.attributes != previous.attributes:
        changes["attributes"] = {
            "old": previous.attributes,
            "new": current.attributes,
        }

    return changes


def _build_cad_sync_actions(graph: Graph) -> List[ActionPlan]:
    """Generate CAD synchronization actions for blocks with links.

    Args:
        graph: The graph to analyze.

    Returns:
        List of CAD sync actions.
    """
    actions: List[ActionPlan] = []

    for block in graph.blocks:
        cad_links = [link for link in block.links if link.get("target") == "cad"]

        for link in cad_links:
            actions.append(
                ActionPlan(
                    action_type=ActionType.SYNC_CAD_PROPERTIES,
                    target_id=block.id,
                    target_type="block",
                    description=f"Sync CAD properties for '{block.name}'",
                    params={
                        "block_id": block.id,
                        "occ_token": link.get("occToken"),
                        "doc_id": link.get("docId"),
                    },
                    priority=50,
                )
            )

    return actions


def get_action_plan_summary(actions: List[ActionPlan]) -> str:
    """Generate a human-readable summary of the action plan.

    Args:
        actions: List of actions to summarize.

    Returns:
        Multi-line string summarizing all actions.
    """
    if not actions:
        return "No actions to execute."

    # Group by action type
    by_type: Dict[ActionType, int] = {}
    for action in actions:
        by_type[action.action_type] = by_type.get(action.action_type, 0) + 1

    lines = [f"Action plan with {len(actions)} action(s):"]
    for action_type, count in sorted(by_type.items(), key=lambda x: x[0].value):
        lines.append(f"  - {action_type.value}: {count}")

    return "\n".join(lines)
