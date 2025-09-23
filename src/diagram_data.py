"""
Pure Python module for system blocks diagram JSON serialization/deserialization.
This module is Fusion-agnostic and can be tested independently.
"""
import json
import uuid
from typing import Dict, Optional, Any


def generate_id() -> str:
    """Generate a unique ID for blocks and connections."""
    return str(uuid.uuid4())


def create_empty_diagram() -> Dict[str, Any]:
    """Create an empty diagram that conforms to the schema."""
    return {
        "schema": "system-blocks-v1",
        "blocks": [],
        "connections": []
    }


def create_block(name: str, x: float = 0, y: float = 0,
                 block_type: str = "Custom", status: str = "Placeholder") -> Dict[str, Any]:
    """Create a new block with the given parameters."""
    return {
        "id": generate_id(),
        "name": name,
        "type": block_type,
        "status": status,
        "x": x,
        "y": y,
        "interfaces": [],
        "links": [],
        "attributes": {}
    }


def create_interface(name: str, kind: str, direction: str = "bidirectional",
                     side: str = "right", index: int = 0) -> Dict[str, Any]:
    """Create a new interface/port for a block."""
    return {
        "id": generate_id(),
        "name": name,
        "kind": kind,
        "direction": direction,
        "port": {
            "side": side,
            "index": index
        },
        "params": {}
    }


def create_connection(from_block_id: str, to_block_id: str, kind: str,
                      from_interface_id: Optional[str] = None,
                      to_interface_id: Optional[str] = None) -> Dict[str, Any]:
    """Create a new connection between blocks or interfaces."""
    connection = {
        "id": generate_id(),
        "from": {"blockId": from_block_id},
        "to": {"blockId": to_block_id},
        "kind": kind,
        "attributes": {}
    }

    if from_interface_id:
        connection["from"]["interfaceId"] = from_interface_id
    if to_interface_id:
        connection["to"]["interfaceId"] = to_interface_id

    return connection


def serialize_diagram(diagram: Dict[str, Any]) -> str:
    """Serialize diagram to JSON string."""
    return json.dumps(diagram, indent=2)


def deserialize_diagram(json_str: str) -> Dict[str, Any]:
    """Deserialize diagram from JSON string."""
    try:
        diagram = json.loads(json_str)
        # Basic validation - ensure required fields exist
        if "blocks" not in diagram:
            diagram["blocks"] = []
        if "connections" not in diagram:
            diagram["connections"] = []
        return diagram
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")


def find_block_by_id(diagram: Dict[str, Any], block_id: str) -> Optional[Dict[str, Any]]:
    """Find a block by its ID."""
    for block in diagram.get("blocks", []):
        if block.get("id") == block_id:
            return block
    return None


def add_block_to_diagram(diagram: Dict[str, Any], block: Dict[str, Any]) -> None:
    """Add a block to the diagram."""
    if "blocks" not in diagram:
        diagram["blocks"] = []
    diagram["blocks"].append(block)


def add_connection_to_diagram(diagram: Dict[str, Any], connection: Dict[str, Any]) -> None:
    """Add a connection to the diagram."""
    if "connections" not in diagram:
        diagram["connections"] = []
    diagram["connections"].append(connection)


def remove_block_from_diagram(diagram: Dict[str, Any], block_id: str) -> bool:
    """Remove a block and all its connections from the diagram."""
    # Remove the block
    blocks = diagram.get("blocks", [])
    initial_count = len(blocks)
    diagram["blocks"] = [b for b in blocks if b.get("id") != block_id]

    # Remove connections involving this block
    connections = diagram.get("connections", [])
    diagram["connections"] = [
        c for c in connections
        if (c.get("from", {}).get("blockId") != block_id and
            c.get("to", {}).get("blockId") != block_id)
    ]

    return len(diagram["blocks"]) < initial_count