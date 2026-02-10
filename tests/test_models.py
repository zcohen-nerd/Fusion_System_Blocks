"""Tests for fsb_core.models module.

Covers Graph query/mutation methods, Port/Block __post_init__ coercion,
and data structure operations not exercised by other test modules.
"""

import pytest

from fsb_core.models import (
    Block,
    BlockStatus,
    Connection,
    Graph,
    Port,
    PortDirection,
    PortKind,
    generate_id,
)


# =========================================================================
# generate_id
# =========================================================================
class TestGenerateId:
    """Test the generate_id utility."""

    def test_returns_string(self):
        assert isinstance(generate_id(), str)

    def test_unique_ids(self):
        ids = {generate_id() for _ in range(100)}
        assert len(ids) == 100


# =========================================================================
# Port __post_init__ coercion
# =========================================================================
class TestPortCoercion:
    """Test that Port accepts string enum values and coerces them."""

    def test_direction_from_string(self):
        port = Port(direction="output")  # type: ignore[arg-type]
        assert port.direction == PortDirection.OUTPUT

    def test_kind_from_string(self):
        port = Port(kind="power")  # type: ignore[arg-type]
        assert port.kind == PortKind.POWER

    def test_invalid_direction_string_raises(self):
        with pytest.raises(ValueError):
            Port(direction="invalid")  # type: ignore[arg-type]

    def test_invalid_kind_string_raises(self):
        with pytest.raises(ValueError):
            Port(kind="invalid")  # type: ignore[arg-type]


# =========================================================================
# Block __post_init__ coercion
# =========================================================================
class TestBlockCoercion:
    """Test that Block accepts string status and sets port block_ids."""

    def test_status_from_string(self):
        block = Block(id="b1", status="Planned")  # type: ignore[arg-type]
        assert block.status == BlockStatus.PLANNED

    def test_ports_get_block_id_on_init(self):
        port = Port(id="p1", name="VCC")
        Block(id="b1", name="MCU", ports=[port])
        assert port.block_id == "b1"

    def test_add_port_sets_block_id(self):
        block = Block(id="b1", name="MCU")
        port = Port(id="p1", name="VCC")
        block.add_port(port)
        assert port.block_id == "b1"
        assert len(block.ports) == 1


# =========================================================================
# Block query methods
# =========================================================================
class TestBlockQueries:
    """Test get_port_by_id and get_port_by_name."""

    def _make_block(self):
        p1 = Port(id="p1", name="VCC")
        p2 = Port(id="p2", name="GND")
        return Block(id="b1", name="MCU", ports=[p1, p2])

    def test_get_port_by_id_found(self):
        block = self._make_block()
        assert block.get_port_by_id("p1").name == "VCC"

    def test_get_port_by_id_not_found(self):
        block = self._make_block()
        assert block.get_port_by_id("missing") is None

    def test_get_port_by_name_found(self):
        block = self._make_block()
        assert block.get_port_by_name("GND").id == "p2"

    def test_get_port_by_name_not_found(self):
        block = self._make_block()
        assert block.get_port_by_name("missing") is None


# =========================================================================
# Graph mutation methods
# =========================================================================
class TestGraphMutations:
    """Test add/remove operations on Graph."""

    def _make_graph(self):
        b1 = Block(id="b1", name="A")
        b2 = Block(id="b2", name="B")
        c1 = Connection(id="c1", from_block_id="b1", to_block_id="b2")
        return Graph(id="g1", blocks=[b1, b2], connections=[c1])

    def test_add_block(self):
        graph = Graph(id="g1")
        graph.add_block(Block(id="b1", name="X"))
        assert len(graph.blocks) == 1

    def test_add_connection(self):
        graph = Graph(id="g1")
        graph.add_connection(Connection(id="c1", from_block_id="b1", to_block_id="b2"))
        assert len(graph.connections) == 1

    def test_remove_block_cascades_connections(self):
        graph = self._make_graph()
        removed = graph.remove_block("b1")
        assert removed is True
        assert len(graph.blocks) == 1
        assert graph.blocks[0].id == "b2"
        assert len(graph.connections) == 0  # c1 should be gone

    def test_remove_block_not_found(self):
        graph = self._make_graph()
        assert graph.remove_block("missing") is False
        assert len(graph.blocks) == 2

    def test_remove_connection(self):
        graph = self._make_graph()
        removed = graph.remove_connection("c1")
        assert removed is True
        assert len(graph.connections) == 0

    def test_remove_connection_not_found(self):
        graph = self._make_graph()
        assert graph.remove_connection("missing") is False
        assert len(graph.connections) == 1


# =========================================================================
# Graph query methods
# =========================================================================
class TestGraphQueries:
    """Test Graph lookup and traversal helpers."""

    def _make_graph(self):
        b1 = Block(id="b1", name="Sensor")
        b2 = Block(id="b2", name="MCU")
        b3 = Block(id="b3", name="Display")
        c1 = Connection(id="c1", from_block_id="b1", to_block_id="b2")
        c2 = Connection(id="c2", from_block_id="b2", to_block_id="b3")
        return Graph(
            id="g1",
            blocks=[b1, b2, b3],
            connections=[c1, c2],
        )

    def test_get_block_by_id(self):
        graph = self._make_graph()
        assert graph.get_block_by_id("b2").name == "MCU"

    def test_get_block_by_id_not_found(self):
        graph = self._make_graph()
        assert graph.get_block_by_id("missing") is None

    def test_get_block_by_name(self):
        graph = self._make_graph()
        assert graph.get_block_by_name("Display").id == "b3"

    def test_get_block_by_name_not_found(self):
        graph = self._make_graph()
        assert graph.get_block_by_name("missing") is None

    def test_get_connection_by_id(self):
        graph = self._make_graph()
        assert graph.get_connection_by_id("c1").from_block_id == "b1"

    def test_get_connection_by_id_not_found(self):
        graph = self._make_graph()
        assert graph.get_connection_by_id("missing") is None

    def test_get_connections_for_block(self):
        graph = self._make_graph()
        conns = graph.get_connections_for_block("b2")
        assert len(conns) == 2  # b2 is both target and source

    def test_get_outgoing_connections(self):
        graph = self._make_graph()
        out = graph.get_outgoing_connections("b2")
        assert len(out) == 1
        assert out[0].to_block_id == "b3"

    def test_get_incoming_connections(self):
        graph = self._make_graph()
        inc = graph.get_incoming_connections("b2")
        assert len(inc) == 1
        assert inc[0].from_block_id == "b1"

    def test_get_block_ids(self):
        graph = self._make_graph()
        assert graph.get_block_ids() == {"b1", "b2", "b3"}

    def test_get_all_port_ids(self):
        port = Port(id="p1", name="VCC")
        block = Block(id="b1", name="MCU", ports=[port])
        graph = Graph(id="g1", blocks=[block])
        assert graph.get_all_port_ids() == {"p1"}

    def test_get_all_port_ids_empty(self):
        graph = Graph(id="g1")
        assert graph.get_all_port_ids() == set()
