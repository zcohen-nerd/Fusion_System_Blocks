"""Graph builder utilities for constructing System Blocks graphs.

This module provides a fluent API for building graphs programmatically,
making it easier to create complex diagrams with proper structure.

BOUNDARY: This module contains NO Fusion dependencies.
"""

from __future__ import annotations

from typing import Any

from .models import (
    Block,
    BlockStatus,
    Connection,
    Graph,
    Group,
    Port,
    PortDirection,
    PortKind,
)


class GraphBuilder:
    """Fluent builder for constructing Graph instances.

    Provides a chainable API for creating blocks, ports, and connections
    with validation at build time.

    Example:
        >>> graph = (
        ...     GraphBuilder("My System")
        ...     .add_block("MCU", block_type="Microcontroller")
        ...     .add_port("SPI_MOSI", direction=PortDirection.OUTPUT)
        ...     .add_port("SPI_MISO", direction=PortDirection.INPUT)
        ...     .add_block("Sensor", block_type="ADC")
        ...     .add_port("SPI_IN", direction=PortDirection.INPUT)
        ...     .connect("MCU", "Sensor", kind="SPI")
        ...     .build()
        ... )
    """

    def __init__(self, name: str = "Untitled Diagram") -> None:
        """Initialize a new GraphBuilder.

        Args:
            name: The name of the graph being built.
        """
        self._graph = Graph(name=name)
        self._current_block: Block | None = None
        self._block_by_name: dict[str, Block] = {}
        self._group_by_name: dict[str, Group] = {}

    def add_block(
        self,
        name: str,
        block_type: str = "Generic",
        x: int = 0,
        y: int = 0,
        status: BlockStatus = BlockStatus.PLACEHOLDER,
        attributes: dict[str, Any] | None = None,
    ) -> GraphBuilder:
        """Add a new block to the graph.

        The newly added block becomes the "current" block for subsequent
        port additions.

        Args:
            name: Name of the block.
            block_type: Type category of the block.
            x: Horizontal position.
            y: Vertical position.
            status: Initial status.
            attributes: Block attributes.

        Returns:
            Self for method chaining.
        """
        block = Block(
            name=name,
            block_type=block_type,
            x=x,
            y=y,
            status=status,
            attributes=attributes or {},
        )
        self._graph.add_block(block)
        self._current_block = block
        self._block_by_name[name] = block
        return self

    def add_port(
        self,
        name: str,
        direction: PortDirection = PortDirection.BIDIRECTIONAL,
        kind: PortKind = PortKind.GENERIC,
        side: str = "right",
        index: int | None = None,
        params: dict[str, Any] | None = None,
    ) -> GraphBuilder:
        """Add a port to the current block.

        Must call add_block() first to set the current block context.

        Args:
            name: Name of the port.
            direction: Signal flow direction.
            kind: Port type classification.
            side: Which side of the block (left/right/top/bottom).
            index: Position index on the side (auto-calculated if None).
            params: Additional port parameters.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If no current block is set.
        """
        if self._current_block is None:
            raise ValueError("No current block. Call add_block() first.")

        # Auto-calculate index if not provided
        if index is None:
            same_side_ports = [p for p in self._current_block.ports if p.side == side]
            index = len(same_side_ports)

        port = Port(
            name=name,
            direction=direction,
            kind=kind,
            side=side,
            index=index,
            params=params or {},
        )
        self._current_block.add_port(port)
        return self

    def select_block(self, name: str) -> GraphBuilder:
        """Select an existing block as current for adding ports.

        Args:
            name: Name of the block to select.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If block with given name doesn't exist.
        """
        if name not in self._block_by_name:
            raise ValueError(f"Block '{name}' not found.")
        self._current_block = self._block_by_name[name]
        return self

    def connect(
        self,
        from_block_name: str,
        to_block_name: str,
        kind: str = "data",
        from_port_name: str | None = None,
        to_port_name: str | None = None,
        attributes: dict[str, Any] | None = None,
    ) -> GraphBuilder:
        """Add a connection between two blocks.

        Args:
            from_block_name: Name of the source block.
            to_block_name: Name of the destination block.
            kind: Protocol/type of connection.
            from_port_name: Name of source port (optional).
            to_port_name: Name of destination port (optional).
            attributes: Additional connection attributes.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If either block doesn't exist, or ports not found.
        """
        from_block = self._block_by_name.get(from_block_name)
        to_block = self._block_by_name.get(to_block_name)

        if from_block is None:
            raise ValueError(f"Source block '{from_block_name}' not found.")
        if to_block is None:
            raise ValueError(f"Target block '{to_block_name}' not found.")

        # Resolve port IDs if names provided
        from_port_id = None
        to_port_id = None

        if from_port_name:
            from_port = from_block.get_port_by_name(from_port_name)
            if from_port is None:
                raise ValueError(
                    f"Port '{from_port_name}' not found on block '{from_block_name}'."
                )
            from_port_id = from_port.id

        if to_port_name:
            to_port = to_block.get_port_by_name(to_port_name)
            if to_port is None:
                raise ValueError(
                    f"Port '{to_port_name}' not found on block '{to_block_name}'."
                )
            to_port_id = to_port.id

        connection = Connection(
            from_block_id=from_block.id,
            from_port_id=from_port_id,
            to_block_id=to_block.id,
            to_port_id=to_port_id,
            kind=kind,
            attributes=attributes or {},
        )
        self._graph.add_connection(connection)
        return self

    def set_metadata(self, key: str, value: Any) -> GraphBuilder:
        """Set a metadata value on the graph.

        Args:
            key: Metadata key.
            value: Metadata value.

        Returns:
            Self for method chaining.
        """
        self._graph.metadata[key] = value
        return self

    def add_group(
        self,
        name: str,
        block_names: list[str] | None = None,
        description: str = "",
        metadata: dict[str, Any] | None = None,
        parent_group_name: str | None = None,
    ) -> GraphBuilder:
        """Add a group of blocks to the graph.

        Args:
            name: Name of the group.
            block_names: Names of blocks to include. All must
                have been added via :meth:`add_block` first.
            description: Text note or description for the group.
            metadata: Custom properties on the group.
            parent_group_name: Name of an existing group to nest
                this group inside.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If a referenced block or parent group does
                not exist.
        """
        block_ids: list[str] = []
        for bname in block_names or []:
            block = self._block_by_name.get(bname)
            if block is None:
                raise ValueError(f"Block '{bname}' not found.")
            block_ids.append(block.id)

        parent_group_id: str | None = None
        if parent_group_name is not None:
            parent = self._group_by_name.get(parent_group_name)
            if parent is None:
                raise ValueError(f"Parent group '{parent_group_name}' not found.")
            parent_group_id = parent.id

        group = Group(
            name=name,
            description=description,
            block_ids=block_ids,
            metadata=metadata or {},
            parent_group_id=parent_group_id,
        )
        self._graph.add_group(group)
        self._group_by_name[name] = group
        return self

    def add_block_to_group(
        self,
        group_name: str,
        block_name: str,
    ) -> GraphBuilder:
        """Add an existing block to an existing group.

        Args:
            group_name: Name of the target group.
            block_name: Name of the block to add.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If the group or block does not exist.
        """
        group = self._group_by_name.get(group_name)
        if group is None:
            raise ValueError(f"Group '{group_name}' not found.")
        block = self._block_by_name.get(block_name)
        if block is None:
            raise ValueError(f"Block '{block_name}' not found.")
        if block.id not in group.block_ids:
            group.block_ids.append(block.id)
        return self

    def remove_block_from_group(
        self,
        group_name: str,
        block_name: str,
    ) -> GraphBuilder:
        """Remove a block from an existing group.

        Args:
            group_name: Name of the target group.
            block_name: Name of the block to remove.

        Returns:
            Self for method chaining.

        Raises:
            ValueError: If the group or block does not exist.
        """
        group = self._group_by_name.get(group_name)
        if group is None:
            raise ValueError(f"Group '{group_name}' not found.")
        block = self._block_by_name.get(block_name)
        if block is None:
            raise ValueError(f"Block '{block_name}' not found.")
        if block.id in group.block_ids:
            group.block_ids.remove(block.id)
        return self

    def build(self) -> Graph:
        """Build and return the completed graph.

        Returns:
            The constructed Graph instance.
        """
        return self._graph

    def get_block(self, name: str) -> Block | None:
        """Get a block by name during construction.

        Args:
            name: Name of the block.

        Returns:
            The Block if found, None otherwise.
        """
        return self._block_by_name.get(name)


def create_simple_graph(
    blocks: list[dict[str, Any]],
    connections: list[dict[str, Any]] | None = None,
) -> Graph:
    """Create a graph from simple dictionary definitions.

    Convenience function for quickly creating graphs from data structures.

    Args:
        blocks: List of block definitions with keys:
                - name (required)
                - block_type (optional, default "Generic")
                - x, y (optional, default 0)
        connections: List of connection definitions with keys:
                     - from (required): source block name
                     - to (required): target block name
                     - kind (optional, default "data")

    Returns:
        Constructed Graph instance.

    Example:
        >>> graph = create_simple_graph(
        ...     blocks=[
        ...         {"name": "MCU", "block_type": "Controller"},
        ...         {"name": "Sensor"},
        ...     ],
        ...     connections=[
        ...         {"from": "MCU", "to": "Sensor", "kind": "I2C"},
        ...     ],
        ... )
    """
    builder = GraphBuilder()

    for block_def in blocks:
        builder.add_block(
            name=block_def["name"],
            block_type=block_def.get("block_type", "Generic"),
            x=block_def.get("x", 0),
            y=block_def.get("y", 0),
        )

    if connections:
        for conn_def in connections:
            builder.connect(
                from_block_name=conn_def["from"],
                to_block_name=conn_def["to"],
                kind=conn_def.get("kind", "data"),
            )

    return builder.build()
