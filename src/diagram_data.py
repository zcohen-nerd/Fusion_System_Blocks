"""
Pure Python module for system blocks diagram JSON serialization/deserialization.
This module is Fusion-agnostic and can be tested independently.
"""
import json
import uuid
import os
from typing import Dict, Optional, Any

try:
    import jsonschema
    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False


def generate_id() -> str:
    """Generate a unique ID for blocks and connections."""
    return str(uuid.uuid4())


def load_schema() -> Optional[Dict[str, Any]]:
    """Load the JSON schema for validation."""
    try:
        # Get the directory of this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Schema is in docs/ relative to src/
        schema_path = os.path.join(current_dir, '..', 'docs', 'schema.json')
        
        with open(schema_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def validate_diagram(diagram: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate diagram against JSON schema.
    Returns (is_valid, error_message).
    """
    if not JSONSCHEMA_AVAILABLE:
        return True, "jsonschema not available - validation skipped"
    
    schema = load_schema()
    if not schema:
        return True, "schema not found - validation skipped"
    
    try:
        jsonschema.validate(diagram, schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, f"Schema validation error: {e.message}"
    except Exception as e:
        return False, f"Validation failed: {str(e)}"


def validate_links(block: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate that block links have required fields based on target type.
    Returns (is_valid, error_message).
    """
    links = block.get("links", [])
    
    for i, link in enumerate(links):
        target = link.get("target")
        
        if target == "cad":
            # CAD links require occToken and docId
            if not link.get("occToken"):
                return False, f"Link {i}: CAD links require 'occToken'"
            if not link.get("docId"):
                return False, f"Link {i}: CAD links require 'docId'"
                
        elif target == "ecad":
            # ECAD links require device
            if not link.get("device"):
                return False, f"Link {i}: ECAD links require 'device'"
                
        elif target == "external":
            # External links should have some identifier
            if not any(link.get(field) for field in ["device", "docPath", "docId"]):
                return False, f"Link {i}: External links require at least one identifier"
        
        else:
            return False, f"Link {i}: Invalid target '{target}', must be 'cad', 'ecad', or 'external'"
    
    return True, None


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


def serialize_diagram(diagram: Dict[str, Any], validate: bool = True) -> str:
    """
    Serialize diagram to JSON string.
    If validate=True, validates against schema first.
    """
    if validate:
        is_valid, error = validate_diagram(diagram)
        if not is_valid:
            raise ValueError(f"Diagram validation failed: {error}")
    
    return json.dumps(diagram, indent=2)


def deserialize_diagram(json_str: str, validate: bool = True) -> Dict[str, Any]:
    """
    Deserialize diagram from JSON string.
    If validate=True, validates against schema after parsing.
    """
    try:
        diagram = json.loads(json_str)
        # Basic validation - ensure required fields exist
        if "blocks" not in diagram:
            diagram["blocks"] = []
        if "connections" not in diagram:
            diagram["connections"] = []
            
        if validate:
            is_valid, error = validate_diagram(diagram)
            if not is_valid:
                raise ValueError(f"Diagram validation failed: {error}")
                
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


def validate_diagram_links(diagram: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate all block links in the diagram.
    Returns (all_valid, list_of_errors).
    """
    errors = []
    
    for i, block in enumerate(diagram.get("blocks", [])):
        block_name = block.get("name", f"Block {i}")
        is_valid, error = validate_links(block)
        if not is_valid:
            errors.append(f"{block_name}: {error}")
    
    return len(errors) == 0, errors


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