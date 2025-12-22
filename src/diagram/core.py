"""
Core diagram data model and CRUD operations.

Provides fundamental functions to create, manipulate, and serialize
block diagrams.
"""

import json
import uuid
from typing import Dict, Any, Optional


def generate_id() -> str:
    """Generate a unique ID for blocks, interfaces, connections, etc."""
    return str(uuid.uuid4())


def create_empty_diagram() -> Dict[str, Any]:
    """Create an empty diagram structure."""
    return {
        "schema": "system-blocks-v1",
        "blocks": [],
        "connections": [],
    }


def create_block(
    name: str, x: int = 0, y: int = 0, block_type: str = "Generic", status: str = "Placeholder"
) -> Dict[str, Any]:
    """Create a new block with the given parameters."""
    return {
        "id": generate_id(),
        "name": name,
        "x": x,
        "y": y,
        "type": block_type,
        "status": status,
        "interfaces": [],
        "attributes": {},
        "links": [],
    }


def create_interface(
    name: str,
    interface_type: str = "data",
    direction: str = "bidirectional",
    side: str = "right",
    index: int = 0,
) -> Dict[str, Any]:
    """Create a new interface for a block."""
    return {
        "id": generate_id(),
        "name": name,
        "kind": interface_type,  # Use 'kind' instead of 'type' to match tests
        "direction": direction,
        "port": {"side": side, "index": index},
        "params": {},
    }


def create_connection(
    from_block_id: str,
    to_block_id: str,
    protocol: str = "data",
    from_interface: str = None,
    to_interface: str = None,
) -> Dict[str, Any]:
    """Create a new connection between two blocks."""
    connection = {
        "id": generate_id(),
        "from": {"blockId": from_block_id, "interfaceId": from_interface},
        "to": {"blockId": to_block_id, "interfaceId": to_interface},
        "kind": protocol,  # Use 'kind' instead of 'protocol' to match tests
        "attributes": {},
    }

    return connection


def add_block_to_diagram(diagram: Dict[str, Any], block: Dict[str, Any]) -> None:
    """Add a block to the diagram."""
    diagram["blocks"].append(block)


def add_connection_to_diagram(diagram: Dict[str, Any], connection: Dict[str, Any]) -> None:
    """Add a connection to the diagram."""
    diagram["connections"].append(connection)


def find_block_by_id(diagram: Dict[str, Any], block_id: str) -> Optional[Dict[str, Any]]:
    """Find a block by its ID."""
    for block in diagram["blocks"]:
        if block["id"] == block_id:
            return block
    return None


def remove_block_from_diagram(diagram: Dict[str, Any], block_id: str) -> bool:
    """
    Remove a block and its connections from the diagram.

    Args:
        diagram: The diagram to modify
        block_id: ID of the block to remove

    Returns:
        True if block was removed, False if not found
    """
    # Remove the block
    original_count = len(diagram["blocks"])
    diagram["blocks"] = [b for b in diagram["blocks"] if b["id"] != block_id]
    block_removed = len(diagram["blocks"]) < original_count

    # Remove connections involving this block
    diagram["connections"] = [
        c
        for c in diagram["connections"]
        if c["from"]["blockId"] != block_id and c["to"]["blockId"] != block_id
    ]

    return block_removed


def serialize_diagram(diagram: Dict[str, Any], validate: bool = False) -> str:
    """
    Serialize diagram to JSON string.

    Args:
        diagram: The diagram to serialize
        validate: Whether to validate before serializing

    Returns:
        JSON string representation

    Raises:
        ValueError: If validation is enabled and fails
    """
    if validate:
        # Import here to avoid circular dependency
        from .validation import validate_diagram
        is_valid, error = validate_diagram(diagram)
        if not is_valid:
            raise ValueError(f"Diagram validation failed: {error}")

    return json.dumps(diagram, indent=2)


def deserialize_diagram(json_str: str, validate: bool = False) -> Dict[str, Any]:
    """
    Deserialize diagram from JSON string.

    Args:
        json_str: JSON string to parse
        validate: Whether to validate after deserializing

    Returns:
        Diagram dictionary

    Raises:
        ValueError: If JSON is invalid or validation fails
    """
    try:
        diagram = json.loads(json_str)

        if validate:
            # Import here to avoid circular dependency
            from .validation import validate_diagram
            is_valid, error = validate_diagram(diagram)
            if not is_valid:
                raise ValueError(f"Diagram validation failed: {error}")

        return diagram
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")
