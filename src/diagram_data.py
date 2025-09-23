"""
Pure Python module for system blocks diagram JSON serialization/deserialization.
This module is Fusion-agnostic and can be tested independently.
"""
import json
import uuid
import os
from typing import Dict, Optional, Any, List

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


def compute_block_status(block: Dict[str, Any]) -> str:
    """
    Auto-compute the status of a block based on its content and links.
    
    Status progression:
    - Placeholder: block exists but has minimal content
    - Planned: attributes defined, no links
    - In-Work: some links exist
    - Implemented: required links complete
    - Verified: all validation rules pass
    
    Args:
        block: Block dictionary
        
    Returns:
        Computed status from the enum
    """
    if not block:
        return "Placeholder"
    
    # Check if block has meaningful attributes
    attributes = block.get('attributes', {})
    has_attributes = bool(attributes and any(v for v in attributes.values() if v))
    
    # Check links
    links = block.get('links', [])
    has_links = len(links) > 0
    
    # Check if block has interfaces defined
    interfaces = block.get('interfaces', [])
    has_interfaces = len(interfaces) > 0
    
    # Status computation logic
    if not has_attributes and not has_links and not has_interfaces:
        return "Placeholder"
    elif has_attributes and not has_links:
        return "Planned"
    elif has_links:
        # Could add more sophisticated logic here to determine if "complete"
        if has_interfaces and has_attributes:
            return "Implemented"
        else:
            return "In-Work"
    else:
        return "Planned"


def compute_block_status_with_rules(block: Dict[str, Any], diagram: Dict[str, Any]) -> str:
    """
    Compute block status including rule validation for "Verified" status.
    
    Args:
        block: Block dictionary
        diagram: Full diagram for rule checking context
        
    Returns:
        Computed status from the enum
    """
    # Start with basic status computation
    basic_status = compute_block_status(block)
    
    # If block reaches "Implemented", check if it can be "Verified"
    if basic_status == "Implemented":
        # Check if block passes implementation completeness for itself
        single_block_diagram = {
            "blocks": [block],
            "connections": [c for c in diagram.get("connections", []) 
                          if c.get("from", {}).get("blockId") == block.get("id") or 
                             c.get("to", {}).get("blockId") == block.get("id")]
        }
        
        completeness_result = check_implementation_completeness(single_block_diagram)
        if completeness_result["success"]:
            return "Verified"
    
    return basic_status


def update_block_statuses(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update the status of all blocks in a diagram based on auto-computation.
    
    Args:
        diagram: Diagram dictionary
        
    Returns:
        Updated diagram with computed statuses
    """
    if 'blocks' not in diagram:
        return diagram
    
    for block in diagram['blocks']:
        computed_status = compute_block_status(block)
        block['status'] = computed_status
    
    return diagram


def get_status_color(status: str) -> str:
    """
    Get the color associated with a block status for visual feedback.
    
    Args:
        status: Status string
        
    Returns:
        Color string (hex or CSS color name)
    """
    status_colors = {
        "Placeholder": "#cccccc",  # Light gray
        "Planned": "#87ceeb",      # Sky blue
        "In-Work": "#ffd700",      # Gold/yellow
        "Implemented": "#90ee90",  # Light green
        "Verified": "#00ff00"      # Green
    }
    return status_colors.get(status, "#cccccc")


def check_logic_level_compatibility(connection: Dict[str, Any], diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if connected interfaces have compatible logic levels.
    
    Args:
        connection: Connection dictionary
        diagram: Full diagram for block lookup
        
    Returns:
        Rule check result with success/failure and message
    """
    from_block_id = connection.get("from", {}).get("blockId")
    to_block_id = connection.get("to", {}).get("blockId")
    from_intf_id = connection.get("from", {}).get("interfaceId")
    to_intf_id = connection.get("to", {}).get("interfaceId")
    
    if not all([from_block_id, to_block_id, from_intf_id, to_intf_id]):
        return {
            "rule": "logic_level_compatibility",
            "success": False,
            "severity": "error",
            "message": "Connection missing required interface references"
        }
    
    # Find blocks
    blocks = {block["id"]: block for block in diagram.get("blocks", [])}
    from_block = blocks.get(from_block_id)
    to_block = blocks.get(to_block_id)
    
    if not from_block or not to_block:
        return {
            "rule": "logic_level_compatibility", 
            "success": False,
            "severity": "error",
            "message": "Cannot find connected blocks"
        }
    
    # Find interfaces
    from_intf = next((intf for intf in from_block.get("interfaces", []) if intf["id"] == from_intf_id), None)
    to_intf = next((intf for intf in to_block.get("interfaces", []) if intf["id"] == to_intf_id), None)
    
    if not from_intf or not to_intf:
        return {
            "rule": "logic_level_compatibility",
            "success": False, 
            "severity": "error",
            "message": "Cannot find connected interfaces"
        }
    
    # Check logic levels from interface parameters
    from_voltage = from_intf.get("params", {}).get("voltage", "3.3V")
    to_voltage = to_intf.get("params", {}).get("voltage", "3.3V")
    
    # Simple voltage compatibility check
    compatible_voltages = [
        ("3.3V", "3.3V"), ("5V", "5V"), ("1.8V", "1.8V"),
        ("5V", "3.3V")  # 5V can drive 3.3V (with appropriate logic)
    ]
    
    if (from_voltage, to_voltage) in compatible_voltages:
        return {
            "rule": "logic_level_compatibility",
            "success": True,
            "severity": "info", 
            "message": f"Compatible logic levels: {from_voltage} → {to_voltage}"
        }
    else:
        return {
            "rule": "logic_level_compatibility",
            "success": False,
            "severity": "warning",
            "message": f"Potential logic level mismatch: {from_voltage} → {to_voltage}"
        }


def check_power_budget(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if power consumption doesn't exceed power supply capacity.
    
    Args:
        diagram: Full diagram dictionary
        
    Returns:
        Rule check result with success/failure and message
    """
    total_supply = 0.0
    total_consumption = 0.0
    supply_blocks = []
    consumer_blocks = []
    
    for block in diagram.get("blocks", []):
        block_type = block.get("type", "").lower()
        attributes = block.get("attributes", {})
        
        # Check if block is a power supply
        if "power" in block_type or "supply" in block_type or "regulator" in block_type:
            try:
                current_str = attributes.get("output_current", "0mA")
                current_val = float(current_str.replace("mA", "").replace("A", "000" if "A" in current_str else ""))
                total_supply += current_val
                supply_blocks.append(f"{block['name']}: {current_str}")
            except (ValueError, AttributeError):
                pass
        
        # Check power consumption
        try:
            current_str = attributes.get("current", attributes.get("power_consumption", "0mA"))
            if current_str and current_str != "0mA":
                current_val = float(current_str.replace("mA", "").replace("A", "000" if "A" in current_str else ""))
                total_consumption += current_val
                consumer_blocks.append(f"{block['name']}: {current_str}")
        except (ValueError, AttributeError):
            pass
    
    # Add 20% safety margin
    safe_supply = total_supply * 0.8
    
    if total_consumption == 0 and total_supply == 0:
        return {
            "rule": "power_budget",
            "success": True,
            "severity": "info",
            "message": "No power specifications found - unable to verify budget"
        }
    elif total_consumption <= safe_supply:
        return {
            "rule": "power_budget", 
            "success": True,
            "severity": "info",
            "message": f"Power budget OK: {total_consumption}mA used / {total_supply}mA available"
        }
    else:
        return {
            "rule": "power_budget",
            "success": False,
            "severity": "error", 
            "message": f"Power budget exceeded: {total_consumption}mA needed > {safe_supply}mA available (with 20% margin)"
        }


def check_implementation_completeness(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if all blocks have sufficient implementation details.
    
    Args:
        diagram: Full diagram dictionary
        
    Returns:
        Rule check result with success/failure and message
    """
    incomplete_blocks = []
    total_blocks = len(diagram.get("blocks", []))
    
    for block in diagram.get("blocks", []):
        block_name = block.get("name", "Unnamed")
        issues = []
        
        # Check for CAD/ECAD links for non-placeholder blocks
        status = block.get("status", "Placeholder")
        if status not in ["Placeholder", "Planned"]:
            links = block.get("links", [])
            has_cad = any(link.get("target") == "cad" for link in links)
            has_ecad = any(link.get("target") == "ecad" for link in links)
            
            if not has_cad and not has_ecad:
                issues.append("missing CAD/ECAD links")
        
        # Check for interface definitions
        interfaces = block.get("interfaces", [])
        if status in ["Implemented", "Verified"] and len(interfaces) < 2:
            issues.append("insufficient interfaces defined")
        
        # Check for attributes
        attributes = block.get("attributes", {})
        meaningful_attrs = [k for k, v in attributes.items() if v and str(v).strip()]
        if status in ["Planned", "In-Work", "Implemented", "Verified"] and len(meaningful_attrs) < 1:
            issues.append("missing key attributes")
        
        if issues:
            incomplete_blocks.append(f"{block_name}: {', '.join(issues)}")
    
    if not incomplete_blocks:
        return {
            "rule": "implementation_completeness",
            "success": True,
            "severity": "info",
            "message": f"All {total_blocks} blocks have adequate implementation details"
        }
    else:
        return {
            "rule": "implementation_completeness", 
            "success": False,
            "severity": "warning",
            "message": f"Incomplete blocks: {'; '.join(incomplete_blocks)}"
        }


def run_all_rule_checks(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Run all rule checks on a diagram.
    
    Args:
        diagram: Full diagram dictionary
        
    Returns:
        List of rule check results
    """
    results = []
    
    # Check power budget (diagram-level rule)
    results.append(check_power_budget(diagram))
    
    # Check implementation completeness (diagram-level rule) 
    results.append(check_implementation_completeness(diagram))
    
    # Check logic level compatibility for each connection
    for connection in diagram.get("connections", []):
        logic_result = check_logic_level_compatibility(connection, diagram)
        results.append(logic_result)
    
    return results


def get_rule_failures(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Get only the failed rule checks for a diagram.
    
    Args:
        diagram: Full diagram dictionary
        
    Returns:
        List of failed rule check results
    """
    all_results = run_all_rule_checks(diagram)
    return [result for result in all_results if not result["success"]]