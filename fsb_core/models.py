"""Core data models for System Blocks.

This module defines the fundamental data structures used throughout the
System Blocks application. All models are implemented as dataclasses with
full type hints for clarity and IDE support.

BOUNDARY: This module contains NO Fusion dependencies. All models are
pure Python data structures that can be serialized, validated, and tested
independently of any CAD system.

Classes:
    PortDirection: Enum for port input/output/bidirectional direction.
    PortKind: Enum for port types (power, data, signal, etc.).
    BlockStatus: Enum for block lifecycle status.
    Port: Represents a connection point on a block.
    Block: Represents a system component with ports and attributes.
    Connection: Represents a link between two ports on different blocks.
    Group: Represents a named collection of blocks with metadata.
    Graph: Represents the complete system diagram.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

# ------------------------------------------------------------------
# Comparison / Requirement enums
# ------------------------------------------------------------------


class ComparisonOperator(Enum):
    """Comparison operators for requirement checks.

    Attributes:
        LE: Actual value must be less than or equal to target.
        GE: Actual value must be greater than or equal to target.
        EQ: Actual value must be equal to target (within tolerance).
    """

    LE = "<="
    GE = ">="
    EQ = "=="


# ------------------------------------------------------------------
# Port / Block / Connection enums
# ------------------------------------------------------------------


class PortDirection(Enum):
    """Direction of signal flow through a port.

    Attributes:
        INPUT: Port only receives signals.
        OUTPUT: Port only sends signals.
        BIDIRECTIONAL: Port can send and receive signals.
    """

    INPUT = "input"
    OUTPUT = "output"
    BIDIRECTIONAL = "bidirectional"


class PortKind(Enum):
    """Type classification for ports.

    Attributes:
        POWER: Power supply connection.
        DATA: Digital data bus (I2C, SPI, UART, etc.).
        SIGNAL: Analog or digital signal.
        CONTROL: Control signals (enable, reset, etc.).
        MECHANICAL: Mechanical interface point.
        THERMAL: Thermal connection point.
        GENERIC: Unspecified connection type.
    """

    POWER = "power"
    DATA = "data"
    SIGNAL = "signal"
    CONTROL = "control"
    MECHANICAL = "mechanical"
    THERMAL = "thermal"
    GENERIC = "generic"


class BlockStatus(Enum):
    """Lifecycle status of a block.

    Represents the implementation maturity of a block, progressing from
    initial placeholder through verified production.

    Attributes:
        PLACEHOLDER: Initial state, no details defined.
        PLANNED: Design specified but not implemented.
        IN_WORK: Implementation in progress.
        IMPLEMENTED: Implementation complete, awaiting verification.
        VERIFIED: Tested and verified for production.
    """

    PLACEHOLDER = "Placeholder"
    PLANNED = "Planned"
    IN_WORK = "In-Work"
    IMPLEMENTED = "Implemented"
    VERIFIED = "Verified"


def generate_id() -> str:
    """Generate a unique identifier for graph elements.

    Returns:
        A UUID4 string suitable for use as block, port, or connection ID.
    """
    return str(uuid.uuid4())


# ------------------------------------------------------------------
# Requirement
# ------------------------------------------------------------------


@dataclass
class Requirement:
    """A system-level requirement or budget constraint.

    Requirements define measurable targets that the system design must
    satisfy, such as maximum weight, minimum power, or exact voltage.
    Each requirement links to a block attribute and defines a threshold.

    Attributes:
        id: Unique identifier.
        name: Human-readable label (e.g. "Max Weight").
        target_value: Numeric threshold to compare against.
        operator: Comparison operator (LE, GE, EQ).
        unit: Engineering unit string (e.g. "kg", "W").
        linked_attribute: Block-attribute key to aggregate
            (e.g. "mass", "power_consumption").
        tolerance: Absolute tolerance for EQ comparisons.
    """

    id: str = field(default_factory=generate_id)
    name: str = ""
    target_value: float = 0.0
    operator: ComparisonOperator = ComparisonOperator.LE
    unit: str = ""
    linked_attribute: str = ""
    tolerance: float = 1e-9

    def __post_init__(self) -> None:
        """Coerce string operator values to enum."""
        if isinstance(self.operator, str):
            self.operator = ComparisonOperator(self.operator)

    def check(self, actual_value: float) -> bool:
        """Evaluate whether *actual_value* satisfies this requirement.

        Args:
            actual_value: The computed/measured value to test.

        Returns:
            True if the requirement is satisfied.
        """
        if self.operator is ComparisonOperator.LE:
            return actual_value <= self.target_value
        if self.operator is ComparisonOperator.GE:
            return actual_value >= self.target_value
        # EQ — within tolerance
        return abs(actual_value - self.target_value) <= self.tolerance


# ------------------------------------------------------------------
# Port
# ------------------------------------------------------------------


@dataclass
class Port:
    """Represents a connection point on a block.

    Ports are the interface points where connections can be made between
    blocks. Each port has a direction, kind, and optional parameters.

    Attributes:
        id: Unique identifier for this port.
        name: Human-readable name for the port.
        direction: Signal flow direction (input/output/bidirectional).
        kind: Type classification (power/data/signal/etc.).
        side: Which side of the block this port appears on (left/right/top/bottom).
        index: Position index on the specified side.
        params: Additional parameters specific to the port kind.
        block_id: ID of the parent block (set when port is added to block).
    """

    id: str = field(default_factory=generate_id)
    name: str = ""
    direction: PortDirection = PortDirection.BIDIRECTIONAL
    kind: PortKind = PortKind.GENERIC
    side: str = "right"
    index: int = 0
    params: dict[str, Any] = field(default_factory=dict)
    block_id: str | None = None

    def __post_init__(self) -> None:
        """Validate and normalize port attributes after initialization."""
        # Convert string enums to proper enum types if needed
        if isinstance(self.direction, str):
            self.direction = PortDirection(self.direction)
        if isinstance(self.kind, str):
            self.kind = PortKind(self.kind)


@dataclass
class Block:
    """Represents a system component in the block diagram.

    Blocks are the primary building blocks of a system diagram. Each block
    represents a logical or physical component with defined interfaces (ports)
    and can be connected to other blocks.

    Attributes:
        id: Unique identifier for this block.
        name: Human-readable name for the block.
        block_type: Category/type of the block (e.g., "MCU", "Sensor").
        x: Horizontal position in the diagram.
        y: Vertical position in the diagram.
        status: Current lifecycle status.
        ports: List of ports (connection points) on this block.
        attributes: Key-value pairs for block-specific properties.
        links: External references (CAD, ECAD, documents).
        child_diagram_id: ID of nested child diagram, if hierarchical.
    """

    id: str = field(default_factory=generate_id)
    name: str = ""
    block_type: str = "Generic"
    x: int = 0
    y: int = 0
    status: BlockStatus = BlockStatus.PLACEHOLDER
    ports: list[Port] = field(default_factory=list)
    attributes: dict[str, Any] = field(default_factory=dict)
    links: list[dict[str, Any]] = field(default_factory=list)
    child_diagram_id: str | None = None

    def __post_init__(self) -> None:
        """Validate and normalize block attributes after initialization."""
        # Convert string status to enum if needed
        if isinstance(self.status, str):
            self.status = BlockStatus(self.status)

        # Set block_id on all ports
        for port in self.ports:
            port.block_id = self.id

    def add_port(self, port: Port) -> None:
        """Add a port to this block.

        Args:
            port: The port to add.
        """
        port.block_id = self.id
        self.ports.append(port)

    def get_port_by_id(self, port_id: str) -> Port | None:
        """Find a port by its ID.

        Args:
            port_id: The unique identifier of the port.

        Returns:
            The matching Port, or None if not found.
        """
        for port in self.ports:
            if port.id == port_id:
                return port
        return None

    def get_port_by_name(self, name: str) -> Port | None:
        """Find a port by its name.

        Args:
            name: The name of the port.

        Returns:
            The matching Port, or None if not found.
        """
        for port in self.ports:
            if port.name == name:
                return port
        return None


@dataclass
class Connection:
    """Represents a connection between two ports on different blocks.

    Connections define the relationships between blocks by linking their
    ports. Each connection specifies the source and destination ports
    and may include protocol/kind information.

    Attributes:
        id: Unique identifier for this connection.
        from_block_id: ID of the source block.
        from_port_id: ID of the source port on the source block.
        to_block_id: ID of the destination block.
        to_port_id: ID of the destination port on the destination block.
        kind: Protocol or type of connection (e.g., "I2C", "SPI", "power").
        attributes: Additional connection-specific properties.
    """

    id: str = field(default_factory=generate_id)
    from_block_id: str = ""
    from_port_id: str | None = None
    to_block_id: str = ""
    to_port_id: str | None = None
    kind: str = "data"
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class NamedStub:
    """A net-name stub on a block port.

    Named stubs work like net labels in EDA tools: blocks that share
    the same ``net_name`` are implicitly connected.  This avoids
    drawing long arrows for high-fan-out patterns (e.g. a power rail
    feeding many consumers).

    Attributes:
        id: Unique identifier for this stub.
        net_name: The net/label name (e.g. ``"5V"``, ``"CLK"``).
        block_id: ID of the block this stub is attached to.
        port_side: Which side of the block the stub extends from
            (``"input"``, ``"output"``, ``"top"``, ``"bottom"``).
        stub_type: Connection type for styling (``"power"``,
            ``"data"``, ``"auto"``, etc.).
        direction: Arrow direction (``"forward"``, ``"backward"``,
            ``"bidirectional"``, ``"none"``).
    """

    id: str = field(default_factory=generate_id)
    net_name: str = ""
    block_id: str = ""
    port_side: str = "output"
    stub_type: str = "auto"
    direction: str = "forward"


@dataclass
class Group:
    """Represents a named collection of blocks in the diagram.

    Groups act as first-class diagram elements that can hold blocks,
    carry metadata, have descriptions, and be nested within other
    groups for hierarchical organization.

    Attributes:
        id: Unique identifier for this group.
        name: Human-readable name for the group.
        description: Text note or description displayed as a label
            or tooltip on the group boundary.
        block_ids: IDs of blocks that belong to this group.
        metadata: Custom properties on the group (owner, status,
            subsystem category, etc.).
        parent_group_id: ID of the parent group when nested.
            ``None`` for top-level groups.
    """

    id: str = field(default_factory=generate_id)
    name: str = ""
    description: str = ""
    block_ids: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    parent_group_id: str | None = None


@dataclass
class Graph:
    """Represents a complete system block diagram.

    The Graph is the top-level container for a system diagram, holding
    all blocks, connections, and groups. It provides methods for
    querying and manipulating the diagram structure.

    Attributes:
        id: Unique identifier for this graph.
        name: Human-readable name for the diagram.
        schema: Schema version identifier.
        blocks: List of all blocks in the diagram.
        connections: List of all connections between blocks.
        groups: List of all groups in the diagram.
        metadata: Additional diagram metadata.
        requirements: System-level requirements / budget constraints.
    """

    id: str = field(default_factory=generate_id)
    name: str = "Untitled Diagram"
    schema: str = "system-blocks-v2"
    blocks: list[Block] = field(default_factory=list)
    connections: list[Connection] = field(default_factory=list)
    groups: list[Group] = field(default_factory=list)
    named_stubs: list[NamedStub] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    requirements: list[Requirement] = field(default_factory=list)

    def add_block(self, block: Block) -> None:
        """Add a block to the graph.

        Args:
            block: The block to add.
        """
        self.blocks.append(block)

    def add_connection(self, connection: Connection) -> None:
        """Add a connection to the graph.

        Args:
            connection: The connection to add.
        """
        self.connections.append(connection)

    def get_block_by_id(self, block_id: str) -> Block | None:
        """Find a block by its ID.

        Args:
            block_id: The unique identifier of the block.

        Returns:
            The matching Block, or None if not found.
        """
        for block in self.blocks:
            if block.id == block_id:
                return block
        return None

    def get_block_by_name(self, name: str) -> Block | None:
        """Find a block by its name.

        Args:
            name: The name of the block.

        Returns:
            The matching Block, or None if not found.
        """
        for block in self.blocks:
            if block.name == name:
                return block
        return None

    def get_connection_by_id(self, connection_id: str) -> Connection | None:
        """Find a connection by its ID.

        Args:
            connection_id: The unique identifier of the connection.

        Returns:
            The matching Connection, or None if not found.
        """
        for conn in self.connections:
            if conn.id == connection_id:
                return conn
        return None

    def get_connections_for_block(self, block_id: str) -> list[Connection]:
        """Get all connections involving a specific block.

        Args:
            block_id: The ID of the block.

        Returns:
            List of connections where the block is source or destination.
        """
        return [
            conn
            for conn in self.connections
            if conn.from_block_id == block_id or conn.to_block_id == block_id
        ]

    def get_outgoing_connections(self, block_id: str) -> list[Connection]:
        """Get connections where the specified block is the source.

        Args:
            block_id: The ID of the source block.

        Returns:
            List of outgoing connections from the block.
        """
        return [conn for conn in self.connections if conn.from_block_id == block_id]

    def get_incoming_connections(self, block_id: str) -> list[Connection]:
        """Get connections where the specified block is the destination.

        Args:
            block_id: The ID of the destination block.

        Returns:
            List of incoming connections to the block.
        """
        return [conn for conn in self.connections if conn.to_block_id == block_id]

    def remove_block(self, block_id: str) -> bool:
        """Remove a block and all its connections from the graph.

        Args:
            block_id: The ID of the block to remove.

        Returns:
            True if the block was found and removed, False otherwise.
        """
        original_count = len(self.blocks)
        self.blocks = [b for b in self.blocks if b.id != block_id]

        if len(self.blocks) < original_count:
            # Remove associated connections
            self.connections = [
                c
                for c in self.connections
                if c.from_block_id != block_id and c.to_block_id != block_id
            ]
            return True
        return False

    def remove_connection(self, connection_id: str) -> bool:
        """Remove a connection from the graph.

        Args:
            connection_id: The ID of the connection to remove.

        Returns:
            True if the connection was found and removed, False otherwise.
        """
        original_count = len(self.connections)
        self.connections = [c for c in self.connections if c.id != connection_id]
        return len(self.connections) < original_count

    def add_group(self, group: Group) -> None:
        """Add a group to the graph.

        Args:
            group: The group to add.
        """
        self.groups.append(group)

    def get_group_by_id(self, group_id: str) -> Group | None:
        """Find a group by its ID.

        Args:
            group_id: The unique identifier of the group.

        Returns:
            The matching Group, or None if not found.
        """
        for group in self.groups:
            if group.id == group_id:
                return group
        return None

    def get_group_by_name(self, name: str) -> Group | None:
        """Find a group by its name.

        Args:
            name: The name of the group.

        Returns:
            The matching Group, or None if not found.
        """
        for group in self.groups:
            if group.name == name:
                return group
        return None

    def remove_group(self, group_id: str) -> bool:
        """Remove a group from the graph.

        Child groups that reference this group as parent have their
        ``parent_group_id`` cleared. Blocks remain in the graph.

        Args:
            group_id: The ID of the group to remove.

        Returns:
            True if the group was found and removed, False otherwise.
        """
        original_count = len(self.groups)
        self.groups = [g for g in self.groups if g.id != group_id]
        if len(self.groups) < original_count:
            for g in self.groups:
                if g.parent_group_id == group_id:
                    g.parent_group_id = None
            return True
        return False

    def add_block_to_group(self, group_id: str, block_id: str) -> bool:
        """Add a block to an existing group.

        Args:
            group_id: The ID of the group.
            block_id: The ID of the block to add.

        Returns:
            True if the block was added, False if the group
            was not found or the block is already in the group.
        """
        group = self.get_group_by_id(group_id)
        if group is None:
            return False
        if block_id in group.block_ids:
            return False
        group.block_ids.append(block_id)
        return True

    def remove_block_from_group(self, group_id: str, block_id: str) -> bool:
        """Remove a block from an existing group.

        Args:
            group_id: The ID of the group.
            block_id: The ID of the block to remove.

        Returns:
            True if the block was removed, False if the group
            was not found or the block was not in the group.
        """
        group = self.get_group_by_id(group_id)
        if group is None:
            return False
        if block_id not in group.block_ids:
            return False
        group.block_ids.remove(block_id)
        return True

    def get_child_groups(self, group_id: str) -> list[Group]:
        """Get groups that are direct children of the given group.

        Args:
            group_id: The ID of the parent group.

        Returns:
            List of child groups.
        """
        return [g for g in self.groups if g.parent_group_id == group_id]

    def get_block_ids(self) -> set[str]:
        """Get set of all block IDs in the graph.

        Returns:
            Set of block ID strings.
        """
        return {block.id for block in self.blocks}

    def get_all_port_ids(self) -> set[str]:
        """Get set of all port IDs across all blocks.

        Returns:
            Set of port ID strings.
        """
        port_ids = set()
        for block in self.blocks:
            for port in block.ports:
                port_ids.add(port.id)
        return port_ids


# ------------------------------------------------------------------
# Block fingerprinting (used by version control diffing)
# ------------------------------------------------------------------


def block_fingerprint(block: Block) -> str:
    """Compute a deterministic hash of a block's observable state.

    The fingerprint covers name, type, position, status, attributes,
    ports, and links — everything that would matter for a visual diff.

    Args:
        block: The block to fingerprint.

    Returns:
        A hex-digest string (SHA-256, truncated to 16 chars).
    """
    canonical: dict[str, Any] = {
        "name": block.name,
        "type": block.block_type,
        "x": block.x,
        "y": block.y,
        "status": block.status.value,
        "attributes": block.attributes,
        "ports": [
            {
                "id": p.id,
                "name": p.name,
                "direction": p.direction.value,
                "kind": p.kind.value,
                "side": p.side,
                "index": p.index,
                "params": p.params,
            }
            for p in sorted(block.ports, key=lambda p: p.id)
        ],
        "links": block.links,
    }
    raw = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ------------------------------------------------------------------
# Snapshot & Diff models  (Milestone 21 — Visual Version Control)
# ------------------------------------------------------------------


@dataclass
class Snapshot:
    """A frozen point-in-time capture of a Graph.

    Snapshots are immutable records stored in the document history,
    enabling comparison and visual diffing between revisions.

    Attributes:
        id: Unique snapshot identifier.
        graph_json: Serialized Graph state (JSON string).
        timestamp: ISO-8601 UTC timestamp of the capture.
        author: Name or identifier of the person who created it.
        description: Free-form commit note.
    """

    id: str = field(default_factory=generate_id)
    graph_json: str = ""
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    author: str = ""
    description: str = ""


@dataclass
class ConnectionChange:
    """Describes a single connection-level change between two graph revisions.

    Attributes:
        connection_id: The connection's unique ID.
        change_type: One of 'added', 'removed', or 'modified'.
        details: Extra context (e.g. old/new kind).
    """

    connection_id: str = ""
    change_type: str = ""  # "added" | "removed" | "modified"
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class DiffResult:
    """Structured result of comparing two Graph revisions.

    Produced by `compare_graphs` and consumed by the frontend to
    render green/red/yellow visual overlays on the diagram.

    Attributes:
        added_block_ids: Blocks present in *new* but not *old*.
        removed_block_ids: Blocks present in *old* but not *new*.
        modified_block_ids: Blocks present in both but changed.
        connection_changes: Per-connection diff details.
    """

    added_block_ids: list[str] = field(default_factory=list)
    removed_block_ids: list[str] = field(default_factory=list)
    modified_block_ids: list[str] = field(default_factory=list)
    connection_changes: list[ConnectionChange] = field(
        default_factory=list,
    )
