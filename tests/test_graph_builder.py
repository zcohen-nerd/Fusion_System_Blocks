"""Tests for the core graph builder module.

This module tests the GraphBuilder fluent API and the create_simple_graph
convenience function.

Test coverage:
    - GraphBuilder initialization
    - Block creation and chaining
    - Port creation and auto-indexing
    - Block selection
    - Connection creation with port resolution
    - Metadata setting
    - Error cases (no block, missing block, missing port)
    - create_simple_graph convenience function
"""

import pytest

from core.graph_builder import GraphBuilder, create_simple_graph
from core.models import (
    BlockStatus,
    Graph,
    PortDirection,
    PortKind,
)


class TestGraphBuilderInitialization:
    """Tests for GraphBuilder initialization."""

    def test_default_name(self):
        """GraphBuilder defaults to 'Untitled Diagram' name."""
        builder = GraphBuilder()
        graph = builder.build()

        assert graph.name == "Untitled Diagram"

    def test_custom_name(self):
        """GraphBuilder accepts custom diagram name."""
        builder = GraphBuilder("My System")
        graph = builder.build()

        assert graph.name == "My System"

    def test_build_returns_graph(self):
        """build() returns a Graph instance."""
        builder = GraphBuilder()
        graph = builder.build()

        assert isinstance(graph, Graph)


class TestGraphBuilderBlocks:
    """Tests for block creation through GraphBuilder."""

    def test_add_single_block(self):
        """Can add a single block to the graph."""
        graph = GraphBuilder().add_block("MCU").build()

        assert len(graph.blocks) == 1
        assert graph.blocks[0].name == "MCU"

    def test_add_block_with_type(self):
        """Block type is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("Sensor", block_type="ADC")
            .build()
        )

        assert graph.blocks[0].block_type == "ADC"

    def test_add_block_with_position(self):
        """Block position is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU", x=100, y=200)
            .build()
        )

        block = graph.blocks[0]
        assert block.x == 100
        assert block.y == 200

    def test_add_block_with_status(self):
        """Block status is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU", status=BlockStatus.IMPLEMENTED)
            .build()
        )

        assert graph.blocks[0].status == BlockStatus.IMPLEMENTED

    def test_add_block_with_attributes(self):
        """Block attributes are set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU", attributes={"voltage": "3.3V", "speed": "72MHz"})
            .build()
        )

        block = graph.blocks[0]
        assert block.attributes["voltage"] == "3.3V"
        assert block.attributes["speed"] == "72MHz"

    def test_add_multiple_blocks_chaining(self):
        """Can chain multiple add_block calls."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_block("Sensor")
            .add_block("Display")
            .build()
        )

        assert len(graph.blocks) == 3
        names = {b.name for b in graph.blocks}
        assert names == {"MCU", "Sensor", "Display"}

    def test_add_block_returns_self(self):
        """add_block returns the builder for chaining."""
        builder = GraphBuilder()
        result = builder.add_block("MCU")

        assert result is builder


class TestGraphBuilderPorts:
    """Tests for port creation through GraphBuilder."""

    def test_add_port_to_block(self):
        """Can add a port to the current block."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX")
            .build()
        )

        block = graph.blocks[0]
        assert len(block.ports) == 1
        assert block.ports[0].name == "TX"

    def test_add_port_with_direction(self):
        """Port direction is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX", direction=PortDirection.OUTPUT)
            .build()
        )

        port = graph.blocks[0].ports[0]
        assert port.direction == PortDirection.OUTPUT

    def test_add_port_with_kind(self):
        """Port kind is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("VCC", kind=PortKind.POWER)
            .build()
        )

        port = graph.blocks[0].ports[0]
        assert port.kind == PortKind.POWER

    def test_add_port_with_side(self):
        """Port side is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("VCC", side="top")
            .build()
        )

        port = graph.blocks[0].ports[0]
        assert port.side == "top"

    def test_add_port_with_params(self):
        """Port params are set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("SPI", params={"protocol": "SPI", "speed": "10MHz"})
            .build()
        )

        port = graph.blocks[0].ports[0]
        assert port.params["protocol"] == "SPI"

    def test_add_port_auto_index(self):
        """Ports auto-index on same side."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX", side="right")
            .add_port("RX", side="right")
            .add_port("CLK", side="right")
            .build()
        )

        ports = graph.blocks[0].ports
        assert ports[0].index == 0
        assert ports[1].index == 1
        assert ports[2].index == 2

    def test_add_port_explicit_index(self):
        """Can specify explicit port index."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX", index=5)
            .build()
        )

        port = graph.blocks[0].ports[0]
        assert port.index == 5

    def test_add_port_without_block_raises(self):
        """Adding port without current block raises ValueError."""
        builder = GraphBuilder()

        with pytest.raises(ValueError, match="No current block"):
            builder.add_port("TX")

    def test_add_port_returns_self(self):
        """add_port returns the builder for chaining."""
        builder = GraphBuilder().add_block("MCU")
        result = builder.add_port("TX")

        assert result is builder


class TestGraphBuilderSelectBlock:
    """Tests for block selection in GraphBuilder."""

    def test_select_existing_block(self):
        """Can select an existing block."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX")
            .add_block("Sensor")
            .add_port("OUT")
            .select_block("MCU")
            .add_port("RX")  # Add to MCU, not Sensor
            .build()
        )

        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")

        assert len(mcu.ports) == 2  # TX and RX
        assert len(sensor.ports) == 1  # Only OUT

    def test_select_nonexistent_block_raises(self):
        """Selecting nonexistent block raises ValueError."""
        builder = GraphBuilder().add_block("MCU")

        with pytest.raises(ValueError, match="Block 'Sensor' not found"):
            builder.select_block("Sensor")

    def test_select_block_returns_self(self):
        """select_block returns the builder for chaining."""
        builder = GraphBuilder().add_block("MCU")
        result = builder.select_block("MCU")

        assert result is builder


class TestGraphBuilderConnections:
    """Tests for connection creation through GraphBuilder."""

    def test_connect_blocks_by_name(self):
        """Can connect two blocks by name."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_block("Sensor")
            .connect("MCU", "Sensor")
            .build()
        )

        assert len(graph.connections) == 1
        conn = graph.connections[0]
        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")
        assert conn.from_block_id == mcu.id
        assert conn.to_block_id == sensor.id

    def test_connect_with_kind(self):
        """Connection kind is set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_block("Sensor")
            .connect("MCU", "Sensor", kind="I2C")
            .build()
        )

        conn = graph.connections[0]
        assert conn.kind == "I2C"

    def test_connect_with_port_names(self):
        """Can specify source and target port names."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX", direction=PortDirection.OUTPUT)
            .add_block("Sensor")
            .add_port("RX", direction=PortDirection.INPUT)
            .connect("MCU", "Sensor", from_port_name="TX", to_port_name="RX")
            .build()
        )

        conn = graph.connections[0]
        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")
        tx = mcu.get_port_by_name("TX")
        rx = sensor.get_port_by_name("RX")

        assert conn.from_port_id == tx.id
        assert conn.to_port_id == rx.id

    def test_connect_with_attributes(self):
        """Connection attributes are set correctly."""
        graph = (
            GraphBuilder()
            .add_block("MCU")
            .add_block("Sensor")
            .connect(
                "MCU", "Sensor",
                attributes={"baud_rate": 115200, "parity": "none"}
            )
            .build()
        )

        conn = graph.connections[0]
        assert conn.attributes["baud_rate"] == 115200
        assert conn.attributes["parity"] == "none"

    def test_connect_source_not_found_raises(self):
        """Connecting from nonexistent block raises ValueError."""
        builder = GraphBuilder().add_block("MCU")

        with pytest.raises(ValueError, match="Source block 'Sensor' not found"):
            builder.connect("Sensor", "MCU")

    def test_connect_target_not_found_raises(self):
        """Connecting to nonexistent block raises ValueError."""
        builder = GraphBuilder().add_block("MCU")

        with pytest.raises(ValueError, match="Target block 'Sensor' not found"):
            builder.connect("MCU", "Sensor")

    def test_connect_source_port_not_found_raises(self):
        """Connecting from nonexistent port raises ValueError."""
        builder = (
            GraphBuilder()
            .add_block("MCU")
            .add_block("Sensor")
        )

        with pytest.raises(
            ValueError,
            match="Port 'TX' not found on block 'MCU'"
        ):
            builder.connect("MCU", "Sensor", from_port_name="TX")

    def test_connect_target_port_not_found_raises(self):
        """Connecting to nonexistent port raises ValueError."""
        builder = (
            GraphBuilder()
            .add_block("MCU")
            .add_port("TX")
            .add_block("Sensor")
        )

        with pytest.raises(
            ValueError,
            match="Port 'RX' not found on block 'Sensor'"
        ):
            builder.connect("MCU", "Sensor", to_port_name="RX")

    def test_connect_returns_self(self):
        """connect returns the builder for chaining."""
        builder = GraphBuilder().add_block("MCU").add_block("Sensor")
        result = builder.connect("MCU", "Sensor")

        assert result is builder


class TestGraphBuilderMetadata:
    """Tests for metadata setting through GraphBuilder."""

    def test_set_metadata(self):
        """Can set metadata on the graph."""
        graph = (
            GraphBuilder()
            .set_metadata("author", "Test User")
            .set_metadata("version", "1.0")
            .build()
        )

        assert graph.metadata["author"] == "Test User"
        assert graph.metadata["version"] == "1.0"

    def test_set_metadata_returns_self(self):
        """set_metadata returns the builder for chaining."""
        builder = GraphBuilder()
        result = builder.set_metadata("key", "value")

        assert result is builder


class TestGraphBuilderGetBlock:
    """Tests for get_block helper method."""

    def test_get_block_found(self):
        """get_block returns block when found."""
        builder = GraphBuilder().add_block("MCU")

        block = builder.get_block("MCU")

        assert block is not None
        assert block.name == "MCU"

    def test_get_block_not_found(self):
        """get_block returns None when not found."""
        builder = GraphBuilder().add_block("MCU")

        block = builder.get_block("Sensor")

        assert block is None


class TestCreateSimpleGraph:
    """Tests for create_simple_graph convenience function."""

    def test_empty_graph(self):
        """Can create graph with no blocks or connections."""
        graph = create_simple_graph(blocks=[])

        assert isinstance(graph, Graph)
        assert len(graph.blocks) == 0

    def test_blocks_only(self):
        """Can create graph with blocks, no connections."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU"},
                {"name": "Sensor"},
            ]
        )

        assert len(graph.blocks) == 2
        assert graph.get_block_by_name("MCU") is not None
        assert graph.get_block_by_name("Sensor") is not None

    def test_blocks_with_types(self):
        """Block types are set from dictionary."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU", "block_type": "Microcontroller"},
                {"name": "Sensor", "block_type": "ADC"},
            ]
        )

        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")
        assert mcu.block_type == "Microcontroller"
        assert sensor.block_type == "ADC"

    def test_blocks_with_positions(self):
        """Block positions are set from dictionary."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU", "x": 100, "y": 200},
            ]
        )

        mcu = graph.blocks[0]
        assert mcu.x == 100
        assert mcu.y == 200

    def test_with_connections(self):
        """Can create graph with connections."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU"},
                {"name": "Sensor"},
            ],
            connections=[
                {"from": "MCU", "to": "Sensor"},
            ]
        )

        assert len(graph.connections) == 1
        mcu = graph.get_block_by_name("MCU")
        sensor = graph.get_block_by_name("Sensor")
        conn = graph.connections[0]
        assert conn.from_block_id == mcu.id
        assert conn.to_block_id == sensor.id

    def test_connections_with_kind(self):
        """Connection kind is set from dictionary."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU"},
                {"name": "Sensor"},
            ],
            connections=[
                {"from": "MCU", "to": "Sensor", "kind": "SPI"},
            ]
        )

        conn = graph.connections[0]
        assert conn.kind == "SPI"

    def test_multiple_connections(self):
        """Can create multiple connections."""
        graph = create_simple_graph(
            blocks=[
                {"name": "MCU"},
                {"name": "Sensor1"},
                {"name": "Sensor2"},
            ],
            connections=[
                {"from": "MCU", "to": "Sensor1", "kind": "I2C"},
                {"from": "MCU", "to": "Sensor2", "kind": "SPI"},
            ]
        )

        assert len(graph.connections) == 2


class TestGraphBuilderComplexScenarios:
    """Tests for complex usage scenarios."""

    def test_full_fluent_chain(self):
        """Full fluent API usage example."""
        graph = (
            GraphBuilder("Sensor System")
            .set_metadata("version", "1.0")
            .add_block("MCU", block_type="STM32F4", x=100, y=100)
            .add_port("SPI_MOSI", direction=PortDirection.OUTPUT, kind=PortKind.DATA)
            .add_port("SPI_MISO", direction=PortDirection.INPUT, kind=PortKind.DATA)
            .add_port("VCC", direction=PortDirection.INPUT, kind=PortKind.POWER, side="top")
            .add_block("Sensor", block_type="BME280", x=300, y=100)
            .add_port("SDI", direction=PortDirection.INPUT, kind=PortKind.DATA)
            .add_port("SDO", direction=PortDirection.OUTPUT, kind=PortKind.DATA)
            .connect(
                "MCU", "Sensor",
                kind="SPI",
                from_port_name="SPI_MOSI",
                to_port_name="SDI"
            )
            .connect(
                "Sensor", "MCU",
                kind="SPI",
                from_port_name="SDO",
                to_port_name="SPI_MISO"
            )
            .build()
        )

        assert graph.name == "Sensor System"
        assert graph.metadata["version"] == "1.0"
        assert len(graph.blocks) == 2
        assert len(graph.connections) == 2

        mcu = graph.get_block_by_name("MCU")
        assert mcu.block_type == "STM32F4"
        assert len(mcu.ports) == 3

    def test_build_can_be_called_multiple_times(self):
        """build() can be called multiple times for same graph."""
        builder = GraphBuilder().add_block("MCU")

        graph1 = builder.build()
        graph2 = builder.build()

        # Should be the same graph instance
        assert graph1 is graph2
