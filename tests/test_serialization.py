"""Tests for core.serialization module.

Covers round-trip serialization, legacy format conversion, edge cases,
and structured error handling for invalid inputs.

Markers:
    serialization — all tests in this file carry this marker automatically.
"""

import json

import pytest

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
    export_to_legacy_format,
    graph_to_dict,
    serialize_graph,
)

pytestmark = pytest.mark.serialization


# =========================================================================
# Round-trip tests
# =========================================================================
class TestSerializationRoundTrip:
    """Verify Graph → JSON → Graph preserves all data."""

    def test_empty_graph_round_trip(self, empty_graph):
        """Empty graph survives a round-trip without data loss."""
        json_str = serialize_graph(empty_graph)
        restored = deserialize_graph(json_str)

        assert restored.id == empty_graph.id
        assert restored.name == empty_graph.name
        assert restored.blocks == []
        assert restored.connections == []

    def test_full_graph_round_trip(self, sample_graph):
        """Graph with blocks, ports, and connections round-trips cleanly."""
        json_str = serialize_graph(sample_graph)
        restored = deserialize_graph(json_str)

        assert restored.id == sample_graph.id
        assert restored.name == sample_graph.name
        assert len(restored.blocks) == len(sample_graph.blocks)
        assert len(restored.connections) == len(sample_graph.connections)

        # Block data preserved
        for orig, rest in zip(sample_graph.blocks, restored.blocks):
            assert rest.id == orig.id
            assert rest.name == orig.name
            assert rest.block_type == orig.block_type
            assert rest.x == orig.x
            assert rest.y == orig.y
            assert rest.status == orig.status

        # Connection data preserved
        for orig, rest in zip(sample_graph.connections, restored.connections):
            assert rest.id == orig.id
            assert rest.from_block_id == orig.from_block_id
            assert rest.to_block_id == orig.to_block_id
            assert rest.from_port_id == orig.from_port_id
            assert rest.to_port_id == orig.to_port_id

    def test_port_attributes_preserved(self):
        """Port direction, kind, side, index, and params survive round-trip."""
        port = Port(
            id="p1",
            name="SPI_CLK",
            direction=PortDirection.OUTPUT,
            kind=PortKind.DATA,
            side="top",
            index=3,
            params={"speed": "10MHz"},
        )
        block = Block(id="b1", name="MCU", ports=[port])
        graph = Graph(id="g1", blocks=[block])

        restored = deserialize_graph(serialize_graph(graph))
        rport = restored.blocks[0].ports[0]

        assert rport.id == "p1"
        assert rport.name == "SPI_CLK"
        assert rport.direction == PortDirection.OUTPUT
        assert rport.kind == PortKind.DATA
        assert rport.side == "top"
        assert rport.index == 3
        assert rport.params == {"speed": "10MHz"}

    def test_metadata_preserved(self):
        """Graph metadata dict survives round-trip."""
        graph = Graph(
            id="g1",
            name="Meta Test",
            metadata={"author": "test", "version": 2},
        )
        restored = deserialize_graph(serialize_graph(graph))
        assert restored.metadata == {"author": "test", "version": 2}

    def test_child_diagram_id_preserved(self):
        """Block with child_diagram_id survives round-trip."""
        block = Block(id="b1", name="Parent", child_diagram_id="child_123")
        graph = Graph(id="g1", blocks=[block])

        restored = deserialize_graph(serialize_graph(graph))
        assert restored.blocks[0].child_diagram_id == "child_123"

    def test_connection_kind_and_attributes_preserved(self):
        """Connection kind and extra attributes survive round-trip."""
        conn = Connection(
            id="c1",
            from_block_id="b1",
            to_block_id="b2",
            kind="SPI",
            attributes={"wire_gauge": "22AWG"},
        )
        block_a = Block(id="b1", name="A")
        block_b = Block(id="b2", name="B")
        graph = Graph(id="g1", blocks=[block_a, block_b], connections=[conn])

        restored = deserialize_graph(serialize_graph(graph))
        rconn = restored.connections[0]
        assert rconn.kind == "SPI"
        assert rconn.attributes == {"wire_gauge": "22AWG"}

    def test_block_attributes_and_links_preserved(self):
        """Block attributes dict and links list survive round-trip."""
        block = Block(
            id="b1",
            name="Sensor",
            attributes={"resolution": "12bit"},
            links=[{"target": "cad", "occToken": "tok1"}],
        )
        graph = Graph(id="g1", blocks=[block])

        restored = deserialize_graph(serialize_graph(graph))
        assert restored.blocks[0].attributes == {"resolution": "12bit"}
        assert restored.blocks[0].links == [{"target": "cad", "occToken": "tok1"}]


# =========================================================================
# graph_to_dict / dict_to_graph tests
# =========================================================================
class TestDictConversion:
    """Test dict ↔ Graph conversion."""

    def test_graph_to_dict_structure(self, sample_graph):
        """graph_to_dict produces expected top-level keys."""
        d = graph_to_dict(sample_graph)
        assert set(d.keys()) == {
            "schema", "id", "name", "blocks", "connections", "metadata",
        }

    def test_graph_to_dict_uses_interfaces_key(self, sample_graph):
        """Legacy compatibility: ports are serialized as 'interfaces'."""
        d = graph_to_dict(sample_graph)
        for block_dict in d["blocks"]:
            assert "interfaces" in block_dict
            # Should NOT have 'ports' key at all
            assert "ports" not in block_dict

    def test_dict_to_graph_from_interfaces(self):
        """dict_to_graph reads ports from legacy 'interfaces' key."""
        data = {
            "id": "g1",
            "name": "Legacy",
            "blocks": [
                {
                    "id": "b1",
                    "name": "MCU",
                    "type": "Generic",
                    "interfaces": [
                        {
                            "id": "p1",
                            "name": "VCC",
                            "kind": "power",
                            "direction": "input",
                            "port": {"side": "left", "index": 0},
                        }
                    ],
                }
            ],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert len(graph.blocks[0].ports) == 1
        assert graph.blocks[0].ports[0].name == "VCC"

    def test_dict_to_graph_from_ports_key(self):
        """dict_to_graph also reads ports from 'ports' key if 'interfaces' absent."""
        data = {
            "id": "g1",
            "blocks": [
                {
                    "id": "b1",
                    "name": "MCU",
                    "ports": [
                        {
                            "id": "p1",
                            "name": "VCC",
                            "kind": "power",
                            "direction": "input",
                            "side": "left",
                            "index": 0,
                        }
                    ],
                }
            ],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert len(graph.blocks[0].ports) == 1

    def test_legacy_nested_connection_format(self):
        """dict_to_graph handles nested from/to connection format."""
        data = {
            "id": "g1",
            "blocks": [{"id": "b1", "name": "A"}, {"id": "b2", "name": "B"}],
            "connections": [
                {
                    "id": "c1",
                    "from": {"blockId": "b1", "interfaceId": "p1"},
                    "to": {"blockId": "b2", "interfaceId": "p2"},
                    "kind": "power",
                }
            ],
        }
        graph = dict_to_graph(data)
        conn = graph.connections[0]
        assert conn.from_block_id == "b1"
        assert conn.from_port_id == "p1"
        assert conn.to_block_id == "b2"
        assert conn.to_port_id == "p2"

    def test_flat_connection_format(self):
        """dict_to_graph handles flat from_block_id/to_block_id format."""
        data = {
            "id": "g1",
            "blocks": [{"id": "b1", "name": "A"}, {"id": "b2", "name": "B"}],
            "connections": [
                {
                    "id": "c1",
                    "from": "b1",
                    "to": "b2",
                    "from_block_id": "b1",
                    "to_block_id": "b2",
                    "from_port_id": "p1",
                    "to_port_id": "p2",
                }
            ],
        }
        graph = dict_to_graph(data)
        conn = graph.connections[0]
        assert conn.from_block_id == "b1"
        assert conn.to_block_id == "b2"


# =========================================================================
# Edge cases and error handling
# =========================================================================
class TestSerializationEdgeCases:
    """Test graceful behaviour with unusual or invalid inputs."""

    def test_invalid_json_raises_value_error(self):
        """deserialize_graph raises ValueError for invalid JSON."""
        with pytest.raises(ValueError, match="Invalid JSON"):
            deserialize_graph("{bad json")

    def test_unknown_status_defaults_to_placeholder(self):
        """Unknown BlockStatus string falls back to PLACEHOLDER."""
        data = {
            "id": "g1",
            "blocks": [{"id": "b1", "name": "X", "status": "UNKNOWN_STATE"}],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert graph.blocks[0].status == BlockStatus.PLACEHOLDER

    def test_unknown_port_direction_defaults(self):
        """Unknown PortDirection string falls back to BIDIRECTIONAL."""
        data = {
            "id": "g1",
            "blocks": [
                {
                    "id": "b1",
                    "name": "X",
                    "interfaces": [
                        {"id": "p1", "name": "X", "direction": "weird"}
                    ],
                }
            ],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert graph.blocks[0].ports[0].direction == PortDirection.BIDIRECTIONAL

    def test_unknown_port_kind_defaults(self):
        """Unknown PortKind string falls back to GENERIC."""
        data = {
            "id": "g1",
            "blocks": [
                {
                    "id": "b1",
                    "name": "X",
                    "interfaces": [
                        {"id": "p1", "name": "X", "kind": "exotic_kind"}
                    ],
                }
            ],
            "connections": [],
        }
        graph = dict_to_graph(data)
        assert graph.blocks[0].ports[0].kind == PortKind.GENERIC

    def test_missing_fields_use_defaults(self):
        """Dict with minimal fields should still produce a valid Graph."""
        data = {"blocks": [], "connections": []}
        graph = dict_to_graph(data)
        assert graph.name == "Untitled Diagram"
        assert graph.schema == "system-blocks-v2"
        assert graph.blocks == []

    def test_serialize_indent_parameter(self):
        """serialize_graph respects custom indent parameter."""
        graph = Graph(id="g1", name="Test")
        compact = serialize_graph(graph, indent=0)
        pretty = serialize_graph(graph, indent=4)
        assert len(pretty) > len(compact)

    def test_connection_with_protocol_key(self):
        """Legacy 'protocol' key is accepted instead of 'kind'."""
        data = {
            "id": "g1",
            "blocks": [{"id": "b1", "name": "A"}, {"id": "b2", "name": "B"}],
            "connections": [
                {
                    "id": "c1",
                    "from": {"blockId": "b1"},
                    "to": {"blockId": "b2"},
                    "protocol": "I2C",
                }
            ],
        }
        graph = dict_to_graph(data)
        assert graph.connections[0].kind == "I2C"


# =========================================================================
# Convenience wrappers
# =========================================================================
class TestConvenienceWrappers:
    """Test convert_legacy_diagram and export_to_legacy_format."""

    def test_export_to_legacy_format(self, sample_graph):
        """export_to_legacy_format produces a dict that can be re-imported."""
        legacy = export_to_legacy_format(sample_graph)
        assert isinstance(legacy, dict)
        assert "blocks" in legacy
        restored = dict_to_graph(legacy)
        assert len(restored.blocks) == len(sample_graph.blocks)

    def test_convert_legacy_diagram(self):
        """convert_legacy_diagram is an alias for dict_to_graph."""
        from core.serialization import convert_legacy_diagram

        data = {"id": "g1", "blocks": [], "connections": []}
        graph = convert_legacy_diagram(data)
        assert isinstance(graph, Graph)
