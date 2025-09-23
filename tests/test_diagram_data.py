"""Tests for diagram_data module."""

import os
import sys
import pytest

# Add src directory to path so we can import diagram_data
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import diagram_data  # noqa: E402


def test_create_empty_diagram():
    """Test creating an empty diagram."""
    diagram = diagram_data.create_empty_diagram()
    assert "blocks" in diagram
    assert "connections" in diagram
    assert diagram["blocks"] == []
    assert diagram["connections"] == []
    assert diagram["schema"] == "system-blocks-v1"


def test_create_block():
    """Test creating a block."""
    block = diagram_data.create_block("Test MCU", 100, 200, "MCU", "Planned")
    assert "id" in block
    assert block["name"] == "Test MCU"
    assert block["x"] == 100
    assert block["y"] == 200
    assert block["type"] == "MCU"
    assert block["status"] == "Planned"
    assert block["interfaces"] == []
    assert block["links"] == []


def test_create_interface():
    """Test creating an interface."""
    interface = diagram_data.create_interface("VCC", "power", "input", "left", 0)
    assert "id" in interface
    assert interface["name"] == "VCC"
    assert interface["kind"] == "power"
    assert interface["direction"] == "input"
    assert interface["port"]["side"] == "left"
    assert interface["port"]["index"] == 0


def test_create_connection():
    """Test creating a connection."""
    block1_id = "block1"
    block2_id = "block2"
    interface1_id = "int1"
    interface2_id = "int2"

    conn = diagram_data.create_connection(
        block1_id, block2_id, "power", interface1_id, interface2_id
    )

    assert "id" in conn
    assert conn["from"]["blockId"] == block1_id
    assert conn["to"]["blockId"] == block2_id
    assert conn["from"]["interfaceId"] == interface1_id
    assert conn["to"]["interfaceId"] == interface2_id
    assert conn["kind"] == "power"


def test_serialize_deserialize():
    """Test serialization and deserialization."""
    diagram = diagram_data.create_empty_diagram()
    block = diagram_data.create_block("Test Block")
    diagram_data.add_block_to_diagram(diagram, block)

    # Serialize
    json_str = diagram_data.serialize_diagram(diagram)
    assert isinstance(json_str, str)

    # Deserialize
    restored = diagram_data.deserialize_diagram(json_str)
    assert len(restored["blocks"]) == 1
    assert restored["blocks"][0]["name"] == "Test Block"


def test_find_block_by_id():
    """Test finding a block by ID."""
    diagram = diagram_data.create_empty_diagram()
    block = diagram_data.create_block("Test Block")
    diagram_data.add_block_to_diagram(diagram, block)

    found = diagram_data.find_block_by_id(diagram, block["id"])
    assert found is not None
    assert found["name"] == "Test Block"

    not_found = diagram_data.find_block_by_id(diagram, "nonexistent")
    assert not_found is None


def test_remove_block():
    """Test removing a block and its connections."""
    diagram = diagram_data.create_empty_diagram()

    # Create two blocks
    block1 = diagram_data.create_block("Block 1")
    block2 = diagram_data.create_block("Block 2")
    diagram_data.add_block_to_diagram(diagram, block1)
    diagram_data.add_block_to_diagram(diagram, block2)

    # Create connection between them
    conn = diagram_data.create_connection(block1["id"], block2["id"], "data")
    diagram_data.add_connection_to_diagram(diagram, conn)

    # Verify initial state
    assert len(diagram["blocks"]) == 2
    assert len(diagram["connections"]) == 1

    # Remove block1
    removed = diagram_data.remove_block_from_diagram(diagram, block1["id"])
    assert removed is True
    assert len(diagram["blocks"]) == 1
    assert len(diagram["connections"]) == 0  # Connection should be removed too
    assert diagram["blocks"][0]["id"] == block2["id"]


def test_invalid_json_deserialization():
    """Test error handling for invalid JSON."""
    with pytest.raises(ValueError):
        diagram_data.deserialize_diagram("invalid json {")


def test_generate_unique_ids():
    """Test that generated IDs are unique."""
    ids = set()
    for _ in range(100):
        new_id = diagram_data.generate_id()
        assert new_id not in ids
        ids.add(new_id)
