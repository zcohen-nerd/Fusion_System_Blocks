"""Tests for diagram validation functionality."""

import os
import sys
import pytest

# Add src directory to path so we can import diagram_data
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import diagram_data  # noqa: E402


def test_schema_loading():
    """Test that schema can be loaded."""
    schema = diagram_data.load_schema()
    assert schema is not None
    assert "properties" in schema
    assert "blocks" in schema["properties"]
    assert "connections" in schema["properties"]


def test_valid_diagram_validation():
    """Test validation of a valid diagram."""
    diagram = diagram_data.create_empty_diagram()
    block = diagram_data.create_block("Test Block", 0, 0)
    diagram_data.add_block_to_diagram(diagram, block)

    is_valid, error = diagram_data.validate_diagram(diagram)
    assert is_valid
    assert error is None


def test_cad_link_validation():
    """Test validation of CAD links."""
    block = diagram_data.create_block("Test Block")

    # Valid CAD link
    block["links"] = [
        {"target": "cad", "occToken": "test_token", "docId": "test_doc", "docPath": "/path/to/doc"}
    ]

    is_valid, error = diagram_data.validate_links(block)
    assert is_valid
    assert error is None


def test_cad_link_missing_fields():
    """Test validation of CAD links with missing required fields."""
    block = diagram_data.create_block("Test Block")

    # Missing occToken
    block["links"] = [{"target": "cad", "docId": "test_doc"}]

    is_valid, error = diagram_data.validate_links(block)
    assert not is_valid
    assert "occToken" in error

    # Missing docId
    block["links"] = [{"target": "cad", "occToken": "test_token"}]

    is_valid, error = diagram_data.validate_links(block)
    assert not is_valid
    assert "docId" in error


def test_ecad_link_validation():
    """Test validation of ECAD links."""
    block = diagram_data.create_block("Test Block")

    # Valid ECAD link
    block["links"] = [{"target": "ecad", "device": "STM32F4", "footprint": "LQFP-100"}]

    is_valid, error = diagram_data.validate_links(block)
    assert is_valid
    assert error is None

    # Missing device
    block["links"] = [{"target": "ecad", "footprint": "LQFP-100"}]

    is_valid, error = diagram_data.validate_links(block)
    assert not is_valid
    assert "device" in error


def test_external_link_validation():
    """Test validation of external links."""
    block = diagram_data.create_block("Test Block")

    # Valid external link with device
    block["links"] = [{"target": "external", "device": "External Component"}]

    is_valid, error = diagram_data.validate_links(block)
    assert is_valid
    assert error is None

    # Valid external link with docPath
    block["links"] = [{"target": "external", "docPath": "/path/to/spec.pdf"}]

    is_valid, error = diagram_data.validate_links(block)
    assert is_valid
    assert error is None

    # Invalid external link with no identifiers
    block["links"] = [{"target": "external"}]

    is_valid, error = diagram_data.validate_links(block)
    assert not is_valid
    assert "identifier" in error


def test_invalid_link_target():
    """Test validation of links with invalid targets."""
    block = diagram_data.create_block("Test Block")

    block["links"] = [{"target": "invalid_target", "device": "Something"}]

    is_valid, error = diagram_data.validate_links(block)
    assert not is_valid
    assert "Invalid target" in error


def test_diagram_links_validation():
    """Test validation of all links in a diagram."""
    diagram = diagram_data.create_empty_diagram()

    # Create blocks with various link types
    block1 = diagram_data.create_block("CAD Block")
    block1["links"] = [{"target": "cad", "occToken": "token1", "docId": "doc1"}]

    block2 = diagram_data.create_block("ECAD Block")
    block2["links"] = [{"target": "ecad", "device": "MCU123"}]

    block3 = diagram_data.create_block("Invalid Block")
    block3["links"] = [{"target": "cad"}]  # Missing required fields

    diagram_data.add_block_to_diagram(diagram, block1)
    diagram_data.add_block_to_diagram(diagram, block2)
    diagram_data.add_block_to_diagram(diagram, block3)

    all_valid, errors = diagram_data.validate_diagram_links(diagram)
    assert not all_valid
    assert len(errors) == 1
    assert "Invalid Block" in errors[0]
    assert "occToken" in errors[0]


def test_serialize_with_validation():
    """Test serialization with validation enabled."""
    diagram = diagram_data.create_empty_diagram()
    block = diagram_data.create_block("Test Block")
    diagram_data.add_block_to_diagram(diagram, block)

    # Should succeed with valid diagram
    json_str = diagram_data.serialize_diagram(diagram, validate=True)
    assert isinstance(json_str, str)

    # Should fail with invalid diagram
    block["links"] = [{"target": "invalid"}]
    with pytest.raises(ValueError, match="validation failed"):
        diagram_data.serialize_diagram(diagram, validate=True)


def test_deserialize_with_validation():
    """Test deserialization with validation enabled."""
    # Valid diagram
    valid_json = """
    {
        "schema": "system-blocks-v1",
        "blocks": [
            {
                "id": "test-id",
                "name": "Test Block",
                "interfaces": [],
                "links": []
            }
        ],
        "connections": []
    }
    """

    diagram = diagram_data.deserialize_diagram(valid_json, validate=True)
    assert len(diagram["blocks"]) == 1

    # Invalid diagram
    invalid_json = """
    {
        "blocks": "not an array",
        "connections": []
    }
    """

    with pytest.raises(ValueError, match="validation failed"):
        diagram_data.deserialize_diagram(invalid_json, validate=True)
