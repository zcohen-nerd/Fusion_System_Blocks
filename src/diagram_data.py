"""
Pure Python module for system blocks diagram JSON serialization/deserialization.
This module is Fusion-agnostic and can be tested independently.
"""
import json
import uuid
import os
from typing import Dict, Optional, Any, List, Tuple

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


def generate_markdown_report(diagram: Dict[str, Any], title: str = "System Blocks Report") -> str:
    """
    Generate a comprehensive Markdown report for a diagram.
    
    Args:
        diagram: Full diagram dictionary
        title: Report title
        
    Returns:
        Markdown report string
    """
    import datetime
    
    # Report header
    report = f"""# {title}

**Generated:** {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}  
**Schema Version:** {diagram.get('schema', 'system-blocks-v1')}

---

## Summary

"""
    
    # Summary statistics
    blocks = diagram.get('blocks', [])
    connections = diagram.get('connections', [])
    
    report += f"- **Total Blocks:** {len(blocks)}\n"
    report += f"- **Total Connections:** {len(connections)}\n"
    
    # Status breakdown
    status_counts = {}
    for block in blocks:
        status = block.get('status', 'Placeholder')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    if status_counts:
        report += "\n### Block Status Distribution\n\n"
        for status, count in sorted(status_counts.items()):
            report += f"- **{status}:** {count}\n"
    
    # Rule check results
    rule_results = run_all_rule_checks(diagram)
    failures = [r for r in rule_results if not r["success"]]
    
    report += f"\n### Rule Check Summary\n\n"
    report += f"- **Total Checks:** {len(rule_results)}\n"
    report += f"- **Passed:** {len(rule_results) - len(failures)}\n"
    report += f"- **Failed:** {len(failures)}\n"
    
    if failures:
        report += "\n#### Rule Failures\n\n"
        for failure in failures:
            severity_icon = "❌" if failure["severity"] == "error" else "⚠️"
            report += f"- {severity_icon} **{failure['rule']}:** {failure['message']}\n"
    
    # Block table
    report += "\n---\n\n## Block Details\n\n"
    
    if blocks:
        report += "| Name | Type | Status | Attributes | Interfaces | Links |\n"
        report += "|------|------|--------|------------|------------|-------|\n"
        
        for block in blocks:
            name = block.get('name', 'Unnamed')
            block_type = block.get('type', 'Custom')
            status = block.get('status', 'Placeholder')
            
            # Format attributes
            attrs = block.get('attributes', {})
            attr_str = ", ".join([f"{k}={v}" for k, v in attrs.items() if v]) or "None"
            
            # Count interfaces and links
            intf_count = len(block.get('interfaces', []))
            link_count = len(block.get('links', []))
            
            report += f"| {name} | {block_type} | {status} | {attr_str} | {intf_count} | {link_count} |\n"
    else:
        report += "*No blocks defined*\n"
    
    # Connection table
    report += "\n---\n\n## Connection Details\n\n"
    
    if connections:
        report += "| From Block | From Interface | To Block | To Interface | Protocol | Attributes |\n"
        report += "|------------|----------------|----------|--------------|----------|------------|\n"
        
        # Create block lookup for names
        block_names = {block['id']: block.get('name', 'Unnamed') for block in blocks}
        
        for conn in connections:
            from_block_id = conn.get('from', {}).get('blockId', '')
            to_block_id = conn.get('to', {}).get('blockId', '')
            from_intf_id = conn.get('from', {}).get('interfaceId', '')
            to_intf_id = conn.get('to', {}).get('interfaceId', '')
            
            from_block_name = block_names.get(from_block_id, from_block_id)
            to_block_name = block_names.get(to_block_id, to_block_id)
            
            protocol = conn.get('protocol', 'N/A')
            attrs = conn.get('attributes', {})
            attr_str = ", ".join([f"{k}={v}" for k, v in attrs.items() if v]) or "None"
            
            report += f"| {from_block_name} | {from_intf_id} | {to_block_name} | {to_intf_id} | {protocol} | {attr_str} |\n"
    else:
        report += "*No connections defined*\n"
    
    # Interface details
    report += "\n---\n\n## Interface Details\n\n"
    
    has_interfaces = False
    for block in blocks:
        interfaces = block.get('interfaces', [])
        if interfaces:
            if not has_interfaces:
                report += "| Block | Interface | Kind | Direction | Protocol | Parameters |\n"
                report += "|-------|-----------|------|-----------|----------|------------|\n"
                has_interfaces = True
            
            block_name = block.get('name', 'Unnamed')
            for intf in interfaces:
                intf_name = intf.get('name', 'Unnamed')
                kind = intf.get('kind', 'N/A')
                direction = intf.get('direction', 'bidirectional')
                protocol = intf.get('protocol', 'N/A')
                
                params = intf.get('params', {})
                param_str = ", ".join([f"{k}={v}" for k, v in params.items() if v]) or "None"
                
                report += f"| {block_name} | {intf_name} | {kind} | {direction} | {protocol} | {param_str} |\n"
    
    if not has_interfaces:
        report += "*No interfaces defined*\n"
    
    return report


def generate_pin_map_csv(diagram: Dict[str, Any]) -> str:
    """
    Generate a CSV pin map from the diagram connections.
    
    Args:
        diagram: Full diagram dictionary
        
    Returns:
        CSV string with pin mapping
    """
    csv_lines = ["Signal,Source Block,Source Interface,Dest Block,Dest Interface,Protocol,Notes"]
    
    blocks = diagram.get('blocks', [])
    connections = diagram.get('connections', [])
    
    # Create lookup dictionaries
    block_lookup = {block['id']: block for block in blocks}
    
    for conn in connections:
        from_block_id = conn.get('from', {}).get('blockId', '')
        to_block_id = conn.get('to', {}).get('blockId', '')
        from_intf_id = conn.get('from', {}).get('interfaceId', '')
        to_intf_id = conn.get('to', {}).get('interfaceId', '')
        
        from_block = block_lookup.get(from_block_id, {})
        to_block = block_lookup.get(to_block_id, {})
        
        from_block_name = from_block.get('name', from_block_id)
        to_block_name = to_block.get('name', to_block_id)
        
        # Find interface names
        from_intf_name = from_intf_id
        to_intf_name = to_intf_id
        
        for intf in from_block.get('interfaces', []):
            if intf.get('id') == from_intf_id:
                from_intf_name = intf.get('name', from_intf_id)
                break
        
        for intf in to_block.get('interfaces', []):
            if intf.get('id') == to_intf_id:
                to_intf_name = intf.get('name', to_intf_id)
                break
        
        protocol = conn.get('protocol', '')
        
        # Generate signal name from interface names
        signal_name = f"{from_intf_name}_to_{to_intf_name}"
        
        # Notes from connection attributes
        attrs = conn.get('attributes', {})
        notes = "; ".join([f"{k}={v}" for k, v in attrs.items() if v])
        
        csv_lines.append(f'"{signal_name}","{from_block_name}","{from_intf_name}","{to_block_name}","{to_intf_name}","{protocol}","{notes}"')
    
    return "\n".join(csv_lines)


def generate_pin_map_header(diagram: Dict[str, Any], header_name: str = "pin_definitions") -> str:
    """
    Generate a C header file with pin definitions.
    
    Args:
        diagram: Full diagram dictionary
        header_name: Name for the header file (without .h extension)
        
    Returns:
        C header file content string
    """
    header_guard = f"{header_name.upper()}_H"
    
    header = f"""#ifndef {header_guard}
#define {header_guard}

/*
 * Auto-generated pin definitions from System Blocks diagram
 * Generated: {__import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
 */

"""
    
    blocks = diagram.get('blocks', [])
    
    # Extract pin definitions from block attributes
    pin_definitions = []
    
    for block in blocks:
        block_name = block.get('name', 'UNNAMED').upper().replace(' ', '_')
        attributes = block.get('attributes', {})
        
        # Look for pin-related attributes
        for attr_name, attr_value in attributes.items():
            if 'pin' in attr_name.lower() and attr_value:
                try:
                    # Try to parse as integer pin number
                    pin_num = int(attr_value)
                    define_name = f"{block_name}_{attr_name.upper()}"
                    pin_definitions.append((define_name, pin_num))
                except ValueError:
                    # Not a number, treat as string constant
                    define_name = f"{block_name}_{attr_name.upper()}"
                    pin_definitions.append((define_name, f'"{attr_value}"'))
    
    # Add pin definitions to header
    if pin_definitions:
        header += "/* Block Pin Definitions */\n"
        for define_name, value in pin_definitions:
            header += f"#define {define_name:<30} {value}\n"
        header += "\n"
    
    # Add interface-based definitions
    interface_definitions = []
    
    for block in blocks:
        block_name = block.get('name', 'UNNAMED').upper().replace(' ', '_')
        interfaces = block.get('interfaces', [])
        
        for intf in interfaces:
            intf_name = intf.get('name', 'UNNAMED').upper().replace(' ', '_')
            params = intf.get('params', {})
            
            if 'pin' in params:
                try:
                    pin_num = int(params['pin'])
                    define_name = f"{block_name}_{intf_name}_PIN"
                    interface_definitions.append((define_name, pin_num))
                except ValueError:
                    pass
    
    if interface_definitions:
        header += "/* Interface Pin Definitions */\n"
        for define_name, value in interface_definitions:
            header += f"#define {define_name:<30} {value}\n"
        header += "\n"
    
    header += f"#endif /* {header_guard} */\n"
    
    return header


def export_report_files(diagram: Dict[str, Any], base_filename: str = "system_blocks_report") -> Dict[str, str]:
    """
    Export all report files (Markdown, CSV, C header) and return file paths.
    
    Args:
        diagram: Full diagram dictionary
        base_filename: Base name for generated files
        
    Returns:
        Dictionary mapping file type to file path
    """
    import os
    from pathlib import Path
    
    # Determine export directory (relative to this module)
    export_dir = Path(__file__).parent.parent / "exports"
    export_dir.mkdir(exist_ok=True)
    
    exported_files = {}
    
    # Generate Markdown report
    try:
        markdown_content = generate_markdown_report(diagram)
        md_path = export_dir / f"{base_filename}.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        exported_files['markdown'] = str(md_path)
    except Exception as e:
        exported_files['markdown_error'] = str(e)
    
    # Generate CSV pin map
    try:
        csv_content = generate_pin_map_csv(diagram)
        csv_path = export_dir / f"{base_filename}_pinmap.csv"
        with open(csv_path, 'w', encoding='utf-8') as f:
            f.write(csv_content)
        exported_files['csv'] = str(csv_path)
    except Exception as e:
        exported_files['csv_error'] = str(e)
    
    # Generate C header
    try:
        header_content = generate_pin_map_header(diagram, base_filename)
        h_path = export_dir / f"{base_filename}.h"
        with open(h_path, 'w', encoding='utf-8') as f:
            f.write(header_content)
        exported_files['header'] = str(h_path)
    except Exception as e:
        exported_files['header_error'] = str(e)
    
    return exported_files


# Import Functions

def parse_mermaid_flowchart(mermaid_text: str) -> Dict[str, Any]:
    """
    Parse Mermaid flowchart syntax and create a diagram.
    
    Supports basic flowchart syntax like:
    - A --> B
    - A -->|label| B  
    - A[Display Name]
    - A(Round Node)
    - A{Decision}
    
    Args:
        mermaid_text: Mermaid flowchart text
        
    Returns:
        Diagram dictionary
    """
    import re
    
    diagram = create_empty_diagram()
    
    # Parse lines and extract nodes and connections
    lines = [line.strip() for line in mermaid_text.split('\n') if line.strip()]
    
    # Remove flowchart declaration
    lines = [line for line in lines if not line.startswith('flowchart') and not line.startswith('graph')]
    
    nodes = {}  # id -> {name, type, x, y}
    connections = []  # {from, to, label}
    
    # Position tracking for automatic layout
    current_x = 100
    current_y = 100
    nodes_per_row = 3
    node_spacing_x = 200
    node_spacing_y = 150
    
    for line in lines:
        # First, extract node definitions from anywhere in the line
        # Node patterns: A[Display Name], A(Round), A{Decision}
        node_matches = re.findall(r'(\w+)([\[\(\{])([^\]\)\}]+)([\]\)\}])', line)
        for node_match in node_matches:
            node_id = node_match[0]
            bracket_type = node_match[1]
            display_name = node_match[2]
            
            # Determine type from bracket style
            node_type = 'Generic'
            if bracket_type == '{':
                node_type = 'Decision'
            elif bracket_type == '(':
                node_type = 'Process'
            elif bracket_type == '[':
                node_type = 'Generic'
            
            if node_id not in nodes:
                nodes[node_id] = {
                    'name': display_name,
                    'type': node_type,
                    'x': current_x,
                    'y': current_y
                }
                current_x += node_spacing_x
                if len(nodes) % nodes_per_row == 0:
                    current_x = 100
                    current_y += node_spacing_y
            else:
                # Update existing node with more specific info
                nodes[node_id]['name'] = display_name
                nodes[node_id]['type'] = node_type
        
        # Connection patterns: A --> B, A -->|label| B, A --> B[Display]
        # Make the pattern more flexible to handle node definitions inline
        connection_match = re.match(r'(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?\s*-->\s*(?:\|([^|]+)\|)?\s*(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?', line)
        if connection_match:
            from_id = connection_match.group(1)
            label = connection_match.group(2) or ''
            to_id = connection_match.group(3)
            
            # Ensure nodes exist (with basic info if not already defined)
            if from_id not in nodes:
                nodes[from_id] = {
                    'name': from_id,
                    'type': 'Generic',
                    'x': current_x,
                    'y': current_y
                }
                current_x += node_spacing_x
                if len(nodes) % nodes_per_row == 0:
                    current_x = 100
                    current_y += node_spacing_y
            
            if to_id not in nodes:
                nodes[to_id] = {
                    'name': to_id,
                    'type': 'Generic', 
                    'x': current_x,
                    'y': current_y
                }
                current_x += node_spacing_x
                if len(nodes) % nodes_per_row == 0:
                    current_x = 100
                    current_y += node_spacing_y
            
            # Add connection
            connections.append({
                'from': from_id,
                'to': to_id,
                'label': label
            })
            continue
        
        # Handle standalone node definitions (not in connections)
        if '-->' not in line:
            # This is just a node definition line, already handled above
            pass
    
    # Create blocks from nodes
    for node_id, node_data in nodes.items():
        block = create_block(
            node_data['name'],
            node_data['x'], 
            node_data['y'],
            node_data['type'],
            'Placeholder'
        )
        block['id'] = node_id
        
        # Add a generic interface for each block
        interface = create_interface("Generic", "data", "bidirectional", "right", 0)
        block['interfaces'].append(interface)
        
        add_block_to_diagram(diagram, block)
    
    # Create connections
    for conn_data in connections:
        from_block = next((b for b in diagram['blocks'] if b['id'] == conn_data['from']), None)
        to_block = next((b for b in diagram['blocks'] if b['id'] == conn_data['to']), None)
        
        if from_block and to_block:
            # Use first interface from each block
            from_interface = from_block['interfaces'][0] if from_block['interfaces'] else None
            to_interface = to_block['interfaces'][0] if to_block['interfaces'] else None
            
            if from_interface and to_interface:
                connection = create_connection(
                    from_block['id'],
                    to_block['id'], 
                    'data',
                    from_interface['id'],
                    to_interface['id']
                )
                
                if conn_data['label']:
                    connection['attributes'] = {'protocol': conn_data['label']}
                
                add_connection_to_diagram(diagram, connection)
    
    return diagram


def import_from_csv(csv_blocks: str, csv_connections: str = '') -> Dict[str, Any]:
    """
    Import diagram from CSV format.
    
    Args:
        csv_blocks: CSV string with columns: name,type,x,y[,status,attributes...]
        csv_connections: CSV string with columns: from,to,kind[,protocol,attributes...]
        
    Returns:
        Diagram dictionary
    """
    import csv
    from io import StringIO
    
    diagram = create_empty_diagram()
    
    # Parse blocks CSV
    if csv_blocks.strip():
        reader = csv.DictReader(StringIO(csv_blocks))
        for row in reader:
            name = row.get('name', 'Unnamed')
            block_type = row.get('type', 'Generic')
            x = float(row.get('x', 100))
            y = float(row.get('y', 100))
            status = row.get('status', 'Placeholder')
            
            block = create_block(name, x, y, block_type, status)
            
            # Add attributes from additional columns
            for key, value in row.items():
                if key not in ['name', 'type', 'x', 'y', 'status'] and value:
                    block['attributes'][key] = value
            
            # Add a default interface
            interface = create_interface("Default", "data", "bidirectional", "right", 0)
            block['interfaces'].append(interface)
            
            add_block_to_diagram(diagram, block)
    
    # Parse connections CSV
    if csv_connections.strip():
        reader = csv.DictReader(StringIO(csv_connections))
        for row in reader:
            from_name = row.get('from', '')
            to_name = row.get('to', '')
            kind = row.get('kind', 'data')
            protocol = row.get('protocol', '')
            
            # Find blocks by name
            from_block = next((b for b in diagram['blocks'] if b['name'] == from_name), None)
            to_block = next((b for b in diagram['blocks'] if b['name'] == to_name), None)
            
            if from_block and to_block:
                # Use first interface from each block
                from_interface = from_block['interfaces'][0] if from_block['interfaces'] else None
                to_interface = to_block['interfaces'][0] if to_block['interfaces'] else None
                
                if from_interface and to_interface:
                    connection = create_connection(
                        from_block['id'],
                        to_block['id'],
                        kind,
                        from_interface['id'],
                        to_interface['id']
                    )
                    
                    # Add attributes from additional columns
                    for key, value in row.items():
                        if key not in ['from', 'to', 'kind'] and value:
                            connection['attributes'][key] = value
                    
                    if protocol:
                        connection['attributes']['protocol'] = protocol
                    
                    add_connection_to_diagram(diagram, connection)
    
    return diagram


def validate_imported_diagram(diagram: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate an imported diagram against the schema and business rules.
    
    Args:
        diagram: Imported diagram dictionary
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # First validate against JSON schema
    is_valid, error = validate_diagram(diagram)
    if not is_valid:
        return False, f"Schema validation failed: {error}"
    
    # Check for minimum viable diagram
    if not diagram.get('blocks'):
        return False, "Diagram must contain at least one block"
    
    # Validate block names are unique
    block_names = [block.get('name', '') for block in diagram.get('blocks', [])]
    if len(block_names) != len(set(block_names)):
        return False, "Block names must be unique"
    
    # Validate connections reference existing blocks
    block_ids = {block.get('id') for block in diagram.get('blocks', [])}
    for conn in diagram.get('connections', []):
        from_id = conn.get('from', {}).get('blockId')
        to_id = conn.get('to', {}).get('blockId')
        
        if from_id not in block_ids:
            return False, f"Connection references unknown block: {from_id}"
        if to_id not in block_ids:
            return False, f"Connection references unknown block: {to_id}"
    
    # Run rule checks and warn about violations (but don't fail)
    rule_results = run_all_rule_checks(diagram)
    violations = [r for r in rule_results if not r['success']]
    
    if violations:
        warning_msg = f"Import successful with {len(violations)} rule violations. " + \
                     "Review and fix violations in the editor."
        # Return success but with warning message
        return True, warning_msg
    
    return True, "Import successful and valid"