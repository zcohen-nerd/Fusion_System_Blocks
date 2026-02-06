"""Core data models for System Blocks.

This module defines the fundamental data structures used throughout the
System Blocks application. All models are implemented as dataclasses with
full type hints for clarity and IDE support.

BOUNDARY: This module contains NO Fusion 360 dependencies. All models are
pure Python data structures that can be serialized, validated, and tested
independently of any CAD system.

Classes:
    PortDirection: Enum for port input/output/bidirectional direction.
    PortKind: Enum for port types (power, data, signal, etc.).
    BlockStatus: Enum for block lifecycle status.
    Port: Represents a connection point on a block.
    Block: Represents a system component with ports and attributes.
    Connection: Represents a link between two ports on different blocks.
    Graph: Represents the complete system diagram.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


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
    params: Dict[str, Any] = field(default_factory=dict)
    block_id: Optional[str] = None

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
    ports: List[Port] = field(default_factory=list)
    attributes: Dict[str, Any] = field(default_factory=dict)
    links: List[Dict[str, Any]] = field(default_factory=list)
    child_diagram_id: Optional[str] = None

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

    def get_port_by_id(self, port_id: str) -> Optional[Port]:
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

    def get_port_by_name(self, name: str) -> Optional[Port]:
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
    from_port_id: Optional[str] = None
    to_block_id: str = ""
    to_port_id: Optional[str] = None
    kind: str = "data"
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Graph:
    """Represents a complete system block diagram.

    The Graph is the top-level container for a system diagram, holding
    all blocks and their connections. It provides methods for querying
    and manipulating the diagram structure.

    Attributes:
        id: Unique identifier for this graph.
        name: Human-readable name for the diagram.
        schema: Schema version identifier.
        blocks: List of all blocks in the diagram.
        connections: List of all connections between blocks.
        metadata: Additional diagram metadata.
    """

    id: str = field(default_factory=generate_id)
    name: str = "Untitled Diagram"
    schema: str = "system-blocks-v2"
    blocks: List[Block] = field(default_factory=list)
    connections: List[Connection] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

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

    def get_block_by_id(self, block_id: str) -> Optional[Block]:
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

    def get_block_by_name(self, name: str) -> Optional[Block]:
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

    def get_connection_by_id(self, connection_id: str) -> Optional[Connection]:
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

    def get_connections_for_block(self, block_id: str) -> List[Connection]:
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

    def get_outgoing_connections(self, block_id: str) -> List[Connection]:
        """Get connections where the specified block is the source.

        Args:
            block_id: The ID of the source block.

        Returns:
            List of outgoing connections from the block.
        """
        return [
            conn for conn in self.connections if conn.from_block_id == block_id
        ]

    def get_incoming_connections(self, block_id: str) -> List[Connection]:
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
