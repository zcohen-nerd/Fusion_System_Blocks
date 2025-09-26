"""
Core diagram data model and operations for System Blocks.

This module provides functions to create, manipulate, validate, and serialize
block diagrams with full support for hierarchy, validation, import/export,
and rule checking.
"""

import json
import uuid
import os
import jsonschema
from typing import Dict, List, Tuple, Any, Optional
import csv
import io
import re
import base64
from datetime import datetime


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


def create_interface(name: str, direction: str = "output") -> Dict[str, Any]:
    """Create a new interface for a block."""
    return {
        "id": generate_id(),
        "name": name,
        "direction": direction,
        "connections": [],
    }


def create_connection(from_block_id: str, from_interface_id: str, to_block_id: str, to_interface_id: str) -> Dict[str, Any]:
    """Create a connection between two interfaces."""
    return {
        "id": generate_id(),
        "from_block": from_block_id,
        "from_interface": from_interface_id,
        "to_block": to_block_id,
        "to_interface": to_interface_id,
    }


def add_block_to_diagram(diagram: Dict[str, Any], block: Dict[str, Any]) -> None:
    """Add a block to the diagram."""
    diagram["blocks"].append(block)


def add_connection_to_diagram(diagram: Dict[str, Any], connection: Dict[str, Any]) -> None:
    """Add a connection to the diagram."""
    diagram["connections"].append(connection)


def get_block_by_id(diagram: Dict[str, Any], block_id: str) -> Optional[Dict[str, Any]]:
    """Get a block by its ID."""
    for block in diagram["blocks"]:
        if block["id"] == block_id:
            return block
    return None


def get_connection_by_id(diagram: Dict[str, Any], connection_id: str) -> Optional[Dict[str, Any]]:
    """Get a connection by its ID."""
    for connection in diagram["connections"]:
        if connection["id"] == connection_id:
            return connection
    return None


def remove_block_from_diagram(diagram: Dict[str, Any], block_id: str) -> bool:
    """Remove a block and all its connections from the diagram."""
    # Remove the block
    original_count = len(diagram["blocks"])
    diagram["blocks"] = [block for block in diagram["blocks"] if block["id"] != block_id]
    
    # Remove all connections involving this block
    diagram["connections"] = [
        conn for conn in diagram["connections"] 
        if conn["from_block"] != block_id and conn["to_block"] != block_id
    ]
    
    return len(diagram["blocks"]) < original_count


def remove_connection_from_diagram(diagram: Dict[str, Any], connection_id: str) -> bool:
    """Remove a connection from the diagram."""
    original_count = len(diagram["connections"])
    diagram["connections"] = [conn for conn in diagram["connections"] if conn["id"] != connection_id]
    return len(diagram["connections"]) < original_count


def validate_diagram(diagram: Dict[str, Any]) -> List[str]:
    """Validate a diagram and return a list of validation errors."""
    errors = []
    
    # Check schema version
    if "schema" not in diagram:
        errors.append("Missing schema field")
    elif diagram["schema"] != "system-blocks-v1":
        errors.append(f"Invalid schema version: {diagram['schema']}")
    
    # Check required fields
    if "blocks" not in diagram:
        errors.append("Missing blocks field")
    if "connections" not in diagram:
        errors.append("Missing connections field")
    
    if "blocks" in diagram and "connections" in diagram:
        # Check for duplicate block IDs
        block_ids = [block["id"] for block in diagram["blocks"]]
        if len(block_ids) != len(set(block_ids)):
            errors.append("Duplicate block IDs found")
        
        # Check for duplicate connection IDs
        connection_ids = [conn["id"] for conn in diagram["connections"]]
        if len(connection_ids) != len(set(connection_ids)):
            errors.append("Duplicate connection IDs found")
        
        # Validate connections reference existing blocks
        for conn in diagram["connections"]:
            if conn["from_block"] not in block_ids:
                errors.append(f"Connection references non-existent from_block: {conn['from_block']}")
            if conn["to_block"] not in block_ids:
                errors.append(f"Connection references non-existent to_block: {conn['to_block']}")
    
    return errors


def serialize_diagram(diagram: Dict[str, Any]) -> str:
    """Serialize diagram to JSON string."""
    return json.dumps(diagram, indent=2)


def deserialize_diagram(json_str: str) -> Dict[str, Any]:
    """Deserialize diagram from JSON string."""
    return json.loads(json_str)


def load_diagram_from_file(file_path: str) -> Dict[str, Any]:
    """Load diagram from a JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_diagram_to_file(diagram: Dict[str, Any], file_path: str) -> None:
    """Save diagram to a JSON file."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(diagram, f, indent=2)


def get_diagram_statistics(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """Get statistics about the diagram."""
    stats = {
        "total_blocks": len(diagram.get("blocks", [])),
        "total_connections": len(diagram.get("connections", [])),
        "block_types": {},
        "block_statuses": {},
    }
    
    for block in diagram.get("blocks", []):
        block_type = block.get("type", "Unknown")
        block_status = block.get("status", "Unknown")
        
        stats["block_types"][block_type] = stats["block_types"].get(block_type, 0) + 1
        stats["block_statuses"][block_status] = stats["block_statuses"].get(block_status, 0) + 1
    
    return stats


def find_blocks_by_type(diagram: Dict[str, Any], block_type: str) -> List[Dict[str, Any]]:
    """Find all blocks of a specific type."""
    return [block for block in diagram.get("blocks", []) if block.get("type") == block_type]


def find_blocks_by_status(diagram: Dict[str, Any], status: str) -> List[Dict[str, Any]]:
    """Find all blocks with a specific status."""
    return [block for block in diagram.get("blocks", []) if block.get("status") == status]


def get_connected_blocks(diagram: Dict[str, Any], block_id: str) -> List[str]:
    """Get IDs of all blocks connected to the given block."""
    connected = set()
    
    for conn in diagram.get("connections", []):
        if conn["from_block"] == block_id:
            connected.add(conn["to_block"])
        elif conn["to_block"] == block_id:
            connected.add(conn["from_block"])
    
    return list(connected)


def check_circular_dependencies(diagram: Dict[str, Any]) -> List[List[str]]:
    """Check for circular dependencies in the diagram."""
    # This is a simplified check - a more sophisticated implementation
    # would use proper graph algorithms
    cycles = []
    
    def has_path(start: str, end: str, visited: set) -> bool:
        if start == end and start in visited:
            return True
        if start in visited:
            return False
        
        visited.add(start)
        for conn in diagram.get("connections", []):
            if conn["from_block"] == start:
                if has_path(conn["to_block"], end, visited):
                    return True
        visited.remove(start)
        return False
    
    for block in diagram.get("blocks", []):
        if has_path(block["id"], block["id"], set()):
            # Find the actual cycle
            cycles.append([block["id"]])  # Simplified - should find full cycle
    
    return cycles


# Import/Export functions
def export_to_csv(diagram: Dict[str, Any]) -> str:
    """Export diagram blocks to CSV format."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Name", "Type", "Status", "X", "Y", "Interfaces", "Attributes"])
    
    # Write blocks
    for block in diagram.get("blocks", []):
        interfaces = ";".join([f"{iface['name']}({iface['direction']})" for iface in block.get("interfaces", [])])
        attributes = ";".join([f"{k}={v}" for k, v in block.get("attributes", {}).items()])
        
        writer.writerow([
            block["id"],
            block["name"],
            block.get("type", ""),
            block.get("status", ""),
            block.get("x", 0),
            block.get("y", 0),
            interfaces,
            attributes
        ])
    
    return output.getvalue()


def import_from_csv(csv_data: str) -> Dict[str, Any]:
    """Import diagram from CSV format."""
    diagram = create_empty_diagram()
    
    reader = csv.DictReader(io.StringIO(csv_data))
    
    for row in reader:
        block = {
            "id": row["ID"] or generate_id(),
            "name": row["Name"],
            "type": row.get("Type", "Generic"),
            "status": row.get("Status", "Placeholder"),
            "x": int(row.get("X", 0)),
            "y": int(row.get("Y", 0)),
            "interfaces": [],
            "attributes": {},
            "links": []
        }
        
        # Parse interfaces
        if row.get("Interfaces"):
            for iface_str in row["Interfaces"].split(";"):
                if "(" in iface_str and ")" in iface_str:
                    name = iface_str.split("(")[0]
                    direction = iface_str.split("(")[1].rstrip(")")
                    block["interfaces"].append(create_interface(name, direction))
        
        # Parse attributes
        if row.get("Attributes"):
            for attr_str in row["Attributes"].split(";"):
                if "=" in attr_str:
                    key, value = attr_str.split("=", 1)
                    block["attributes"][key] = value
        
        diagram["blocks"].append(block)
    
    return diagram


# Rule checking functions
def check_naming_conventions(diagram: Dict[str, Any]) -> List[str]:
    """Check for naming convention violations."""
    violations = []
    
    # Check for empty names
    for block in diagram.get("blocks", []):
        if not block.get("name", "").strip():
            violations.append(f"Block {block['id']} has empty name")
        
        # Check for special characters (basic check)
        name = block.get("name", "")
        if re.search(r'[<>:"/\\|?*]', name):
            violations.append(f"Block '{name}' contains invalid characters")
    
    return violations


def check_interface_consistency(diagram: Dict[str, Any]) -> List[str]:
    """Check for interface consistency issues."""
    issues = []
    
    for conn in diagram.get("connections", []):
        from_block = get_block_by_id(diagram, conn["from_block"])
        to_block = get_block_by_id(diagram, conn["to_block"])
        
        if not from_block or not to_block:
            continue
        
        # Find the interfaces being connected
        from_interface = None
        to_interface = None
        
        for iface in from_block.get("interfaces", []):
            if iface["id"] == conn["from_interface"]:
                from_interface = iface
                break
        
        for iface in to_block.get("interfaces", []):
            if iface["id"] == conn["to_interface"]:
                to_interface = iface
                break
        
        if not from_interface:
            issues.append(f"Connection {conn['id']} references non-existent from_interface")
        if not to_interface:
            issues.append(f"Connection {conn['id']} references non-existent to_interface")
        
        # Check direction compatibility
        if from_interface and to_interface:
            if from_interface["direction"] == to_interface["direction"]:
                issues.append(f"Connection {conn['id']} connects interfaces with same direction")
    
    return issues


# Status tracking functions
def get_completion_status(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate completion status of the diagram."""
    total_blocks = len(diagram.get("blocks", []))
    if total_blocks == 0:
        return {"percentage": 0, "completed": 0, "total": 0}
    
    completed_blocks = len([
        block for block in diagram["blocks"] 
        if block.get("status", "").lower() in ["complete", "implemented", "done"]
    ])
    
    return {
        "percentage": round((completed_blocks / total_blocks) * 100, 1),
        "completed": completed_blocks,
        "total": total_blocks
    }


def update_block_status(diagram: Dict[str, Any], block_id: str, new_status: str) -> bool:
    """Update the status of a specific block."""
    block = get_block_by_id(diagram, block_id)
    if block:
        block["status"] = new_status
        return True
    return False


# Hierarchy support functions
def create_hierarchical_block(name: str, x: int = 0, y: int = 0, parent_id: str = None) -> Dict[str, Any]:
    """Create a hierarchical block that can contain sub-diagrams."""
    block = create_block(name, x, y, "Hierarchical")
    block["parent_id"] = parent_id
    block["sub_diagram"] = create_empty_diagram()
    return block


def add_sub_block(parent_block: Dict[str, Any], sub_block: Dict[str, Any]) -> None:
    """Add a sub-block to a hierarchical block."""
    if "sub_diagram" not in parent_block:
        parent_block["sub_diagram"] = create_empty_diagram()
    
    sub_block["parent_id"] = parent_block["id"]
    parent_block["sub_diagram"]["blocks"].append(sub_block)


def get_all_blocks_flattened(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get all blocks including those in sub-diagrams, flattened into a single list."""
    all_blocks = []
    
    def collect_blocks(current_diagram: Dict[str, Any]):
        for block in current_diagram.get("blocks", []):
            all_blocks.append(block)
            if "sub_diagram" in block:
                collect_blocks(block["sub_diagram"])
    
    collect_blocks(diagram)
    return all_blocks


# Advanced validation with schema
def validate_with_schema(diagram: Dict[str, Any], schema_path: str) -> List[str]:
    """Validate diagram against a JSON schema."""
    try:
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        
        jsonschema.validate(diagram, schema)
        return []
    except jsonschema.ValidationError as e:
        return [str(e)]
    except FileNotFoundError:
        return [f"Schema file not found: {schema_path}"]
    except json.JSONDecodeError:
        return ["Invalid JSON schema file"]


# Export functions
def export_to_json(diagram: Dict[str, Any], file_path: str) -> None:
    """Export diagram to JSON file."""
    save_diagram_to_file(diagram, file_path)


def export_to_xml(diagram: Dict[str, Any]) -> str:
    """Export diagram to XML format."""
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_lines.append('<diagram>')
    xml_lines.append(f'  <schema>{diagram.get("schema", "")}</schema>')
    
    xml_lines.append('  <blocks>')
    for block in diagram.get("blocks", []):
        xml_lines.append(f'    <block id="{block["id"]}">')
        xml_lines.append(f'      <name>{block["name"]}</name>')
        xml_lines.append(f'      <type>{block.get("type", "")}</type>')
        xml_lines.append(f'      <status>{block.get("status", "")}</status>')
        xml_lines.append(f'      <position x="{block.get("x", 0)}" y="{block.get("y", 0)}"/>')
        
        if block.get("interfaces"):
            xml_lines.append('      <interfaces>')
            for iface in block["interfaces"]:
                xml_lines.append(f'        <interface id="{iface["id"]}" name="{iface["name"]}" direction="{iface["direction"]}"/>')
            xml_lines.append('      </interfaces>')
        
        xml_lines.append('    </block>')
    xml_lines.append('  </blocks>')
    
    xml_lines.append('  <connections>')
    for conn in diagram.get("connections", []):
        xml_lines.append(f'    <connection id="{conn["id"]}" from_block="{conn["from_block"]}" from_interface="{conn["from_interface"]}" to_block="{conn["to_block"]}" to_interface="{conn["to_interface"]}"/>')
    xml_lines.append('  </connections>')
    
    xml_lines.append('</diagram>')
    return '\n'.join(xml_lines)


def create_backup(diagram: Dict[str, Any], backup_dir: str = "backups") -> str:
    """Create a timestamped backup of the diagram."""
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"diagram_backup_{timestamp}.json")
    
    save_diagram_to_file(diagram, backup_file)
    return backup_file


# Search and filter functions
def search_blocks(diagram: Dict[str, Any], search_term: str) -> List[Dict[str, Any]]:
    """Search for blocks by name or attributes."""
    results = []
    search_lower = search_term.lower()
    
    for block in diagram.get("blocks", []):
        # Search in name
        if search_lower in block.get("name", "").lower():
            results.append(block)
            continue
        
        # Search in type
        if search_lower in block.get("type", "").lower():
            results.append(block)
            continue
        
        # Search in attributes
        for key, value in block.get("attributes", {}).items():
            if search_lower in str(key).lower() or search_lower in str(value).lower():
                results.append(block)
                break
    
    return results


def filter_blocks_by_criteria(diagram: Dict[str, Any], criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Filter blocks based on multiple criteria."""
    results = []
    
    for block in diagram.get("blocks", []):
        match = True
        
        for key, value in criteria.items():
            if key in block:
                if isinstance(value, list):
                    if block[key] not in value:
                        match = False
                        break
                else:
                    if block[key] != value:
                        match = False
                        break
        
        if match:
            results.append(block)
    
    return results


# Utility functions for UI integration
def get_block_position_bounds(diagram: Dict[str, Any]) -> Dict[str, int]:
    """Get the bounding box of all blocks in the diagram."""
    if not diagram.get("blocks"):
        return {"min_x": 0, "max_x": 0, "min_y": 0, "max_y": 0}
    
    positions = [(block.get("x", 0), block.get("y", 0)) for block in diagram["blocks"]]
    x_coords = [pos[0] for pos in positions]
    y_coords = [pos[1] for pos in positions]
    
    return {
        "min_x": min(x_coords),
        "max_x": max(x_coords),
        "min_y": min(y_coords),
        "max_y": max(y_coords)
    }


def auto_layout_blocks(diagram: Dict[str, Any], spacing: int = 100) -> None:
    """Auto-arrange blocks in a grid layout."""
    blocks = diagram.get("blocks", [])
    if not blocks:
        return
    
    # Simple grid layout
    grid_size = int(len(blocks) ** 0.5) + 1
    
    for i, block in enumerate(blocks):
        row = i // grid_size
        col = i % grid_size
        block["x"] = col * spacing
        block["y"] = row * spacing