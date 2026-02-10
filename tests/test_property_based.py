"""Property-based tests using Hypothesis.

These tests generate random inputs to stress-test data model invariants,
serialization round-trips, and validation correctness. They catch edge
cases that hand-written tests miss (Unicode names, extreme coordinates,
empty strings, deeply nested structures, etc.).

Markers:
    property_based — all tests carry this marker automatically.
"""

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from core.models import (
    Block,
    BlockStatus,
    Connection,
    Graph,
    Port,
    PortDirection,
    PortKind,
)
from core.serialization import (
    deserialize_graph,
    dict_to_graph,
    graph_to_dict,
    serialize_graph,
)
from core.validation import validate_graph

pytestmark = pytest.mark.property_based


# ---------------------------------------------------------------------------
# Strategies — reusable generators for domain types
# ---------------------------------------------------------------------------
_port_directions = st.sampled_from(list(PortDirection))
_port_kinds = st.sampled_from(list(PortKind))
_block_statuses = st.sampled_from(list(BlockStatus))
_sides = st.sampled_from(["left", "right", "top", "bottom"])

_port_strategy = st.builds(
    Port,
    id=st.uuids().map(str),
    name=st.text(min_size=0, max_size=50),
    direction=_port_directions,
    kind=_port_kinds,
    side=_sides,
    index=st.integers(min_value=0, max_value=20),
    params=st.just({}),
)

_block_strategy = st.builds(
    Block,
    id=st.uuids().map(str),
    name=st.text(min_size=1, max_size=80),
    block_type=st.sampled_from(["Generic", "MCU", "Sensor", "Actuator", "PSU"]),
    x=st.integers(min_value=-10000, max_value=10000),
    y=st.integers(min_value=-10000, max_value=10000),
    status=_block_statuses,
    ports=st.lists(_port_strategy, min_size=0, max_size=5),
    attributes=st.just({}),
    links=st.just([]),
)


def _graph_strategy():
    """Build a Graph with N blocks and valid connections between them."""
    return st.lists(_block_strategy, min_size=0, max_size=8).map(
        _build_graph_from_blocks
    )


def _build_graph_from_blocks(blocks):
    """Helper: add valid connections between randomly chosen block pairs."""
    graph = Graph(id="prop_graph", name="Property Test", blocks=blocks)
    if len(blocks) >= 2:
        # Add a few random connections (block-level only, no port refs)
        n_conns = min(len(blocks) - 1, 4)
        for i in range(n_conns):
            src = blocks[i]
            dst = blocks[(i + 1) % len(blocks)]
            if src.id != dst.id:
                conn = Connection(
                    id=f"conn_{i}",
                    from_block_id=src.id,
                    to_block_id=dst.id,
                )
                graph.add_connection(conn)
    return graph


# ---------------------------------------------------------------------------
# Serialization round-trip properties
# ---------------------------------------------------------------------------
class TestSerializationProperties:
    """Verify serialization invariants hold for arbitrary inputs."""

    @given(name=st.text(min_size=0, max_size=100))
    @settings(max_examples=50)
    def test_graph_name_survives_round_trip(self, name):
        """Any graph name should survive serialize → deserialize."""
        graph = Graph(id="g1", name=name)
        restored = deserialize_graph(serialize_graph(graph))
        assert restored.name == name

    @given(
        x=st.integers(min_value=-100000, max_value=100000),
        y=st.integers(min_value=-100000, max_value=100000),
    )
    @settings(max_examples=50)
    def test_block_position_survives_round_trip(self, x, y):
        """Integer coordinates should survive round-trip exactly."""
        block = Block(id="b1", name="B", x=x, y=y)
        graph = Graph(id="g1", blocks=[block])
        restored = deserialize_graph(serialize_graph(graph))
        assert restored.blocks[0].x == x
        assert restored.blocks[0].y == y

    @given(status=_block_statuses)
    @settings(max_examples=10)
    def test_block_status_survives_round_trip(self, status):
        """Every BlockStatus enum value should survive round-trip."""
        block = Block(id="b1", name="B", status=status)
        graph = Graph(id="g1", blocks=[block])
        restored = deserialize_graph(serialize_graph(graph))
        assert restored.blocks[0].status == status

    @given(direction=_port_directions, kind=_port_kinds)
    @settings(max_examples=30)
    def test_port_enums_survive_round_trip(self, direction, kind):
        """Port direction and kind enums should survive round-trip."""
        port = Port(id="p1", name="P", direction=direction, kind=kind)
        block = Block(id="b1", name="B", ports=[port])
        graph = Graph(id="g1", blocks=[block])
        restored = deserialize_graph(serialize_graph(graph))
        rport = restored.blocks[0].ports[0]
        assert rport.direction == direction
        assert rport.kind == kind


# ---------------------------------------------------------------------------
# Dict conversion properties
# ---------------------------------------------------------------------------
class TestDictConversionProperties:
    """Verify dict ↔ Graph conversion preserves data."""

    @given(name=st.text(min_size=1, max_size=80))
    @settings(max_examples=30)
    def test_graph_to_dict_to_graph_preserves_name(self, name):
        """graph_to_dict → dict_to_graph preserves graph name."""
        graph = Graph(id="g1", name=name)
        d = graph_to_dict(graph)
        restored = dict_to_graph(d)
        assert restored.name == name

    @given(n=st.integers(min_value=0, max_value=10))
    @settings(max_examples=10)
    def test_block_count_preserved(self, n):
        """Number of blocks should be preserved through dict conversion."""
        blocks = [Block(id=f"b{i}", name=f"Block {i}") for i in range(n)]
        graph = Graph(id="g1", blocks=blocks)
        d = graph_to_dict(graph)
        restored = dict_to_graph(d)
        assert len(restored.blocks) == n


# ---------------------------------------------------------------------------
# Validation properties
# ---------------------------------------------------------------------------
class TestValidationProperties:
    """Verify validation invariants."""

    @given(n=st.integers(min_value=0, max_value=5))
    @settings(max_examples=10)
    def test_disconnected_blocks_produce_no_errors(self, n):
        """N disconnected blocks with unique IDs should validate cleanly."""
        blocks = [Block(id=f"b{i}", name=f"Block {i}") for i in range(n)]
        graph = Graph(id="g1", blocks=blocks)
        errors = validate_graph(graph)
        # No connections → no connection errors; unique IDs → no dup errors
        assert len(errors) == 0

    @given(name=st.text(min_size=1, max_size=50).filter(lambda s: s.strip()))
    @settings(max_examples=20)
    def test_valid_two_block_graph_always_passes(self, name):
        """A correctly wired two-block graph should always pass validation."""
        p_out = Port(id="po", name="out", direction=PortDirection.OUTPUT)
        p_in = Port(id="pi", name="in", direction=PortDirection.INPUT)
        b1 = Block(id="b1", name=name, ports=[p_out])
        b2 = Block(id="b2", name="Target", ports=[p_in])
        conn = Connection(
            id="c1",
            from_block_id="b1",
            from_port_id="po",
            to_block_id="b2",
            to_port_id="pi",
        )
        graph = Graph(id="g1", blocks=[b1, b2], connections=[conn])
        errors = validate_graph(graph)
        assert errors == []

    def test_self_connection_always_detected(self):
        """A connection from a block to itself should always be flagged."""
        block = Block(id="b1", name="Loop")
        conn = Connection(
            id="c1",
            from_block_id="b1",
            to_block_id="b1",
        )
        graph = Graph(id="g1", blocks=[block], connections=[conn])
        errors = validate_graph(graph)
        codes = [e.code.value for e in errors]
        assert "SELF_CONNECTION" in codes

    def test_missing_target_always_detected(self):
        """A connection to a non-existent block should always be flagged."""
        block = Block(id="b1", name="Src")
        conn = Connection(
            id="c1",
            from_block_id="b1",
            to_block_id="ghost",
        )
        graph = Graph(id="g1", blocks=[block], connections=[conn])
        errors = validate_graph(graph)
        codes = [e.code.value for e in errors]
        assert "MISSING_TARGET_BLOCK" in codes
