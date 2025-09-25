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
    """Remove a block and its connections from the diagram."""
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
    """Serialize diagram to JSON string."""
    if validate:
        is_valid, error = validate_diagram(diagram)
        if not is_valid:
            raise ValueError(f"Diagram validation failed: {error}")

    return json.dumps(diagram, indent=2)


def deserialize_diagram(json_str: str, validate: bool = False) -> Dict[str, Any]:
    """Deserialize diagram from JSON string."""
    try:
        diagram = json.loads(json_str)

        if validate:
            is_valid, error = validate_diagram(diagram)
            if not is_valid:
                raise ValueError(f"Diagram validation failed: {error}")

        return diagram
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")


# ==================== VALIDATION ====================


def load_schema() -> Dict[str, Any]:
    """Load the JSON schema for diagram validation."""
    # Get the schema file path relative to this module
    current_dir = os.path.dirname(__file__)
    schema_path = os.path.join(current_dir, "..", "docs", "schema.json")

    try:
        with open(schema_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback basic schema if file doesn't exist
        return {
            "type": "object",
            "properties": {
                "schema": {"type": "string"},
                "blocks": {"type": "array"},
                "connections": {"type": "array"},
                "metadata": {"type": "object"},
            },
            "required": ["schema", "blocks", "connections"],
        }


def validate_diagram(diagram: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate a diagram against the JSON schema."""
    try:
        schema = load_schema()
        jsonschema.validate(diagram, schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Validation error: {e}"


def validate_links(block: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """Validate the links in a block."""
    links = block.get("links", [])

    for link in links:
        target = link.get("target", "")

        if target == "cad":
            # CAD links must have occToken and docId
            if not link.get("occToken"):
                return (
                    False,
                    f"CAD link missing occToken in block '{block.get('name', 'Unknown')}'",
                )
            if not link.get("docId"):
                return (
                    False,
                    f"CAD link missing docId in block '{block.get('name', 'Unknown')}'",
                )

        elif target == "ecad":
            # ECAD links must have device
            if not link.get("device"):
                return False, f"ECAD link missing device in block '{block.get('name', 'Unknown')}'"

        elif target == "external":
            # External links must have identifier
            if not any(link.get(field) for field in ["device", "docPath", "docId"]):
                return (
                    False,
                    f"External link missing identifier in block '{block.get('name', 'Unknown')}'",
                )
        else:
            return (
                False,
                f"Invalid target '{target}' in block '{block.get('name', 'Unknown')}'",
            )

    return True, None


def validate_diagram_links(diagram: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate all links in a diagram."""
    errors = []

    for block in diagram.get("blocks", []):
        is_valid, error = validate_links(block)
        if not is_valid:
            errors.append(error)

    return len(errors) == 0, errors


# ==================== STATUS TRACKING ====================


def compute_block_status(block: Dict[str, Any]) -> str:
    """Compute the status of a block based on its content and links."""
    # Check if block has meaningful attributes
    attributes = block.get("attributes", {})
    has_attributes = any(v for v in attributes.values() if v)

    # Check links
    links = block.get("links", [])
    has_cad_link = any(link.get("target") == "cad" for link in links)
    has_ecad_link = any(link.get("target") == "ecad" for link in links)

    # Check interfaces
    interfaces = block.get("interfaces", [])
    has_interfaces = len(interfaces) > 0

    # Status logic
    if has_cad_link and has_ecad_link:
        return "Verified"
    elif (has_cad_link or has_ecad_link) and has_attributes and has_interfaces:
        return "Implemented"
    elif (has_cad_link or has_ecad_link) and not (has_attributes and has_interfaces):
        return "In-Work"
    elif has_attributes and has_interfaces:
        return "In-Work"
    elif has_attributes or has_interfaces:
        return "Planned"
    else:
        return "Placeholder"


def update_block_statuses(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """Update the status of all blocks in a diagram."""
    if not diagram:
        return diagram

    for block in diagram.get("blocks", []):
        computed_status = compute_block_status(block)
        block["status"] = computed_status

    return diagram


def get_status_color(status: str) -> str:
    """Get the color associated with a block status."""
    status_colors = {
        "Placeholder": "#cccccc",  # Light gray
        "Planned": "#87ceeb",  # Sky blue
        "In-Work": "#ffd700",  # Gold/yellow
        "Implemented": "#90ee90",  # Light green
        "Verified": "#00ff00",  # Green
    }
    return status_colors.get(status, "#cccccc")


# ==================== RULE CHECKING ====================


def check_logic_level_compatibility_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check for logic level compatibility issues between connected blocks."""
    violations = []

    for connection in diagram.get("connections", []):
        from_block = find_block_by_id(diagram, connection["from"]["blockId"])
        to_block = find_block_by_id(diagram, connection["to"]["blockId"])

        if not from_block or not to_block:
            continue

        # Get logic levels from block attributes
        from_level = from_block.get("attributes", {}).get("logic_level", "")
        to_level = to_block.get("attributes", {}).get("logic_level", "")

        # Check compatibility
        if from_level and to_level and from_level != to_level:
            # Allow some compatible combinations
            compatible_pairs = [("3.3V", "5V_tolerant"), ("5V_tolerant", "3.3V")]

            if (from_level, to_level) not in compatible_pairs:
                violations.append(
                    {
                        "type": "logic_level_mismatch",
                        "severity": "error",
                        "message": (f"Logic level mismatch: {from_block['name']} ({from_level}) → "
                                    f"{to_block['name']} ({to_level})"),
                        "blocks": [from_block["id"], to_block["id"]],
                        "connection": connection["id"],
                    }
                )

    return violations


def check_power_budget_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check if power consumption exceeds power supply capability."""
    violations = []

    # Find power supply blocks
    power_supplies = []
    power_consumers = []

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})
        power_supply = attributes.get("power_supply_mw")
        power_consumption = attributes.get("power_consumption_mw")

        if power_supply:
            try:
                power_supplies.append((block, float(power_supply)))
            except ValueError:
                pass

        if power_consumption:
            try:
                power_consumers.append((block, float(power_consumption)))
            except ValueError:
                pass

    # Calculate totals
    total_supply = sum(supply for _, supply in power_supplies)
    total_consumption = sum(consumption for _, consumption in power_consumers)

    if total_consumption > total_supply:
        violations.append(
            {
                "type": "power_budget_exceeded",
                "severity": "error",
                "message": (f"Power consumption ({total_consumption}mW) exceeds supply "
                            f"({total_supply}mW)"),
                "blocks": [block["id"] for block, _ in power_consumers],
                "details": {
                    "total_supply": total_supply,
                    "total_consumption": total_consumption,
                    "deficit": total_consumption - total_supply,
                },
            }
        )

    return violations


def check_implementation_completeness_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check if all blocks have sufficient implementation details."""
    violations = []

    for block in diagram.get("blocks", []):
        status = block.get("status", "Placeholder")

        if status == "Placeholder":
            violations.append(
                {
                    "type": "incomplete_implementation",
                    "severity": "warning",
                    "message": f"Block '{block['name']}' has placeholder status",
                    "blocks": [block["id"]],
                }
            )

    return violations


def run_all_rule_checks(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Run all rule checks and return combined results."""
    all_results = []

    # Run diagram-level checks
    all_results.append(check_power_budget(diagram))
    all_results.append(check_implementation_completeness(diagram))

    # Run connection-level checks
    for connection in diagram.get("connections", []):
        result = check_logic_level_compatibility(connection, diagram)
        all_results.append(result)

    return all_results


def get_rule_failures(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get only the failed rule checks."""
    all_results = run_all_rule_checks(diagram)
    return [r for r in all_results if not r.get("success", True)]


# ==================== SINGLE RULE CHECK WRAPPERS (for tests) ====================

def check_logic_level_compatibility(
        connection: Dict[str, Any], diagram: Dict[str, Any]
) -> Dict[str, Any]:
    """Check logic level compatibility for a single connection."""
    from_block = find_block_by_id(diagram, connection["from"]["blockId"])
    to_block = find_block_by_id(diagram, connection["to"]["blockId"])

    if not from_block or not to_block:
        return {
            "success": False,
            "rule": "logic_level_compatibility",
            "message": "Could not find connected blocks"
        }

    # Find interfaces to get voltage parameters
    from_interface_id = connection.get("from", {}).get("interfaceId")
    to_interface_id = connection.get("to", {}).get("interfaceId")

    from_voltage = ""
    to_voltage = ""

    # Get voltage from interface parameters
    from_interface_found = False
    to_interface_found = False

    if from_interface_id:
        for interface in from_block.get("interfaces", []):
            if interface.get("id") == from_interface_id:
                from_voltage = interface.get("params", {}).get("voltage", "")
                from_interface_found = True
                break

        # If interface ID was specified but not found, it's an error
        if not from_interface_found:
            return {
                "success": False,
                "rule": "logic_level_compatibility",
                "message": "Cannot find connected interfaces",
                "severity": "error"
            }

    if to_interface_id:
        for interface in to_block.get("interfaces", []):
            if interface.get("id") == to_interface_id:
                to_voltage = interface.get("params", {}).get("voltage", "")
                to_interface_found = True
                break

        # If interface ID was specified but not found, it's an error
        if not to_interface_found:
            return {
                "success": False,
                "rule": "logic_level_compatibility",
                "message": "Cannot find connected interfaces",
                "severity": "error"
            }

    # Fall back to block attributes if interface params not found
    if not from_voltage:
        from_voltage = from_block.get("attributes", {}).get("logic_level", "")
    if not to_voltage:
        to_voltage = to_block.get("attributes", {}).get("logic_level", "")

    # If no voltage levels specified, assume compatible
    if not from_voltage or not to_voltage:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels"
        }

    # Check compatibility
    if from_voltage == to_voltage:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels"
        }

    # Allow some compatible combinations
    compatible_pairs = [("3.3V", "5V_tolerant"), ("5V_tolerant", "3.3V")]
    if (from_voltage, to_voltage) in compatible_pairs:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels"
        }

    return {
        "success": False,
        "rule": "logic_level_compatibility",
        "message": f"Logic level mismatch: {from_voltage} → {to_voltage}",
        "severity": "warning"
    }


def check_power_budget(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """Check power budget for entire diagram."""
    total_supply = 0
    total_consumption = 0
    has_power_specs = False

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})

        # Check for various power supply attribute names
        supply_current = attributes.get("output_current") or attributes.get("power_supply_mw")
        if supply_current:
            has_power_specs = True
            try:
                # Convert mA to mW (assume 3.3V for current)
                if "mA" in str(supply_current):
                    current_ma = float(supply_current.replace("mA", ""))
                    total_supply += current_ma * 3.3  # Convert to mW
                else:
                    total_supply += float(supply_current)
            except (ValueError, TypeError):
                pass

        # Check for various power consumption attribute names
        consumption = attributes.get("current") or attributes.get("power_consumption_mw")
        if consumption:
            has_power_specs = True
            try:
                # Convert mA to mW (assume 3.3V for current)
                if "mA" in str(consumption):
                    current_ma = float(consumption.replace("mA", ""))
                    total_consumption += current_ma * 3.3  # Convert to mW
                else:
                    total_consumption += float(consumption)
            except (ValueError, TypeError):
                pass

    if not has_power_specs:
        return {
            "success": True,
            "rule": "power_budget",
            "message": "No power specifications found"
        }

    if total_consumption <= total_supply:
        return {
            "success": True,
            "rule": "power_budget",
            "message": f"Power budget OK: {total_consumption:.1f}mW used of "
                       f"{total_supply:.1f}mW available"
        }
    else:
        return {
            "success": False,
            "rule": "power_budget",
            "message": f"Power budget exceeded: {total_consumption:.1f}mW needed, "
                       f"{total_supply:.1f}mW available",
            "severity": "error"
        }


def check_implementation_completeness(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """Check implementation completeness for diagram."""
    incomplete_blocks = []

    for block in diagram.get("blocks", []):
        status = block.get("status", "Placeholder")

        # Check if block claims to be implemented but lacks details
        if status == "Implemented":
            attributes = block.get("attributes", {})
            interfaces = block.get("interfaces", [])
            links = block.get("links", [])

            # Block should have some attributes, interfaces, and links to be truly "implemented"
            if not attributes or not interfaces or not links:
                incomplete_blocks.append(block.get("name", "Unnamed"))

    if not incomplete_blocks:
        return {
            "success": True,
            "rule": "implementation_completeness",
            "message": "All blocks have adequate implementation details"
        }
    else:
        return {
            "success": False,
            "rule": "implementation_completeness",
            "message": f"Incomplete blocks: {', '.join(incomplete_blocks)}",
            "severity": "warning"
        }


# ==================== EXPORT AND REPORTING ====================


def generate_markdown_report(diagram: Dict[str, Any]) -> str:
    """Generate a comprehensive Markdown report for the diagram."""
    report = []

    # Header
    report.append("# System Blocks Report")
    report.append("")

    # Summary
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    report.append("## Summary")
    report.append(f"- **Total Blocks:** {len(blocks)}")
    report.append(f"- **Total Connections:** {len(connections)}")
    report.append("")

    # Check for empty diagram
    if not blocks:
        report.append("No blocks defined")
        report.append("")

    # Status breakdown
    status_counts = {}
    for block in blocks:
        status = block.get("status", "Placeholder")
        status_counts[status] = status_counts.get(status, 0) + 1

    if status_counts:
        report.append("### Status Breakdown")
        for status, count in status_counts.items():
            report.append(f"- **{status}:** {count}")
        report.append("")

    # Rule check results
    rule_results = run_all_rule_checks(diagram)
    if rule_results:
        report.append("## Rule Check Results")

        errors = [r for r in rule_results if r.get("severity") == "error"]
        warnings = [r for r in rule_results if r.get("severity") == "warning"]

        if errors:
            report.append("### Errors")
            for error in errors:
                report.append(f"- ❌ {error['message']}")
            report.append("")

        if warnings:
            report.append("### Warnings")
            for warning in warnings:
                report.append(f"- ⚠️ {warning['message']}")
            report.append("")
    else:
        report.append("## Rule Check Results")
        report.append("✅ All rule checks passed!")
        report.append("")

    # Blocks table
    if blocks:
        report.append("## Block Details")
        report.append("| Name | Type | Status | Interfaces | Links |")
        report.append("|------|------|--------|------------|-------|")

        for block in blocks:
            name = block.get("name", "Unnamed")
            block_type = block.get("type", "Generic")
            status = block.get("status", "Placeholder")
            interface_count = len(block.get("interfaces", []))
            link_count = len(block.get("links", []))

            report.append(
                f"| {name} | {block_type} | {status} | {interface_count} | {link_count} |"
            )

        report.append("")

    # Block attributes details
    blocks_with_attrs = [b for b in blocks if b.get("attributes")]
    if blocks_with_attrs:
        report.append("## Block Attributes")
        for block in blocks_with_attrs:
            block_name = block.get("name", "Unnamed")
            attributes = block.get("attributes", {})
            if attributes:
                report.append(f"### {block_name}")
                for attr_name, attr_value in attributes.items():
                    report.append(f"- **{attr_name}:** {attr_value}")
                report.append("")

    # Interface details
    all_interfaces = []
    for block in blocks:
        for interface in block.get("interfaces", []):
            all_interfaces.append({
                "block_name": block.get("name", "Unnamed"),
                "interface_name": interface.get("name", "Unnamed Interface"),
                "direction": interface.get("direction", "bidirectional"),
                "protocol": interface.get("protocol", "data")
            })

    if all_interfaces:
        report.append("## Interface Details")
        report.append("| Block | Interface | Direction | Protocol |")
        report.append("|-------|-----------|-----------|----------|")

        for intf in all_interfaces:
            report.append(f"| {intf['block_name']} | {intf['interface_name']} | "
                          f"{intf['direction']} | {intf['protocol']} |")

        report.append("")

    # Connections table
    if connections:
        report.append("## Connection Details")
        report.append("| From | To | Protocol | Attributes |")
        report.append("|------|----|---------|-----------| ")

        for conn in diagram.get("connections", []):
            from_block = find_block_by_id(diagram, conn["from"]["blockId"])
            to_block = find_block_by_id(diagram, conn["to"]["blockId"])

            if not from_block or not to_block:
                continue

            from_name = from_block["name"] if from_block else "Unknown"
            to_name = to_block["name"] if to_block else "Unknown"
            protocol = conn.get("kind", "data")

            # Format attributes
            attributes = conn.get("attributes", {})
            attr_str = (", ".join([f"{k}: {v}" for k, v in attributes.items()])
                        if attributes else "-")

            report.append(f"| {from_name} | {to_name} | {protocol} | {attr_str} |")

        report.append("")

    return "\n".join(report)


def generate_pin_map_csv(diagram: Dict[str, Any]) -> str:
    """Generate a CSV pin map for the diagram."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(
        ["Signal", "Source Block", "Source Interface", "Dest Block",
         "Dest Interface", "Protocol", "Notes"]
    )

    # Process connections
    for conn in diagram.get("connections", []):
        from_block = find_block_by_id(diagram, conn["from"]["blockId"])
        to_block = find_block_by_id(diagram, conn["to"]["blockId"])

        if not from_block or not to_block:
            continue

        signal_name = f"{from_block['name']}_to_{to_block['name']}"
        source_name = from_block["name"]
        dest_name = to_block["name"]
        protocol = conn.get("kind", "data")

        # Try to get pin information from interfaces
        source_pin = conn["from"].get("interfaceId", "")
        dest_pin = conn["to"].get("interfaceId", "")

        # Add notes based on attributes
        notes = []
        if conn.get("attributes", {}).get("voltage"):
            notes.append(f"Voltage: {conn['attributes']['voltage']}")
        if conn.get("attributes", {}).get("current"):
            notes.append(f"Current: {conn['attributes']['current']}")

        notes_str = "; ".join(notes)

        writer.writerow(
            [signal_name, source_name, source_pin, dest_name, dest_pin, protocol, notes_str]
        )

    return output.getvalue()


def generate_pin_map_header(diagram: Dict[str, Any]) -> str:
    """Generate a C header file with pin definitions."""
    lines = []

    lines.append("// Auto-generated pin definitions")
    lines.append("// Generated from System Blocks diagram")
    lines.append("")
    lines.append("#ifndef PIN_DEFINITIONS_H")
    lines.append("#define PIN_DEFINITIONS_H")
    lines.append("")

    # Generate pin definitions for blocks with pin attributes
    pin_counter = 1

    for block in diagram.get("blocks", []):
        block_name = block.get("name", "").upper().replace(" ", "_")
        attributes = block.get("attributes", {})

        # Look for pin-related attributes
        for attr_name, attr_value in attributes.items():
            if "pin" in attr_name.lower() and attr_value:
                try:
                    pin_num = int(attr_value)
                    define_name = f"{block_name}_{attr_name.upper()}"
                    lines.append(f"#define {define_name} {pin_num}")
                except ValueError:
                    # Non-numeric pin value, skip
                    pass

        # If no explicit pins, assign sequential numbers
        interfaces = block.get("interfaces", [])
        if interfaces and not any("pin" in attr.lower() for attr in attributes.keys()):
            for intf in interfaces:
                intf_name = intf.get("name", "").upper().replace(" ", "_")
                define_name = f"{block_name}_{intf_name}_PIN"
                lines.append(f"#define {define_name} {pin_counter}")
                pin_counter += 1

    lines.append("")
    lines.append("#endif // PIN_DEFINITIONS_H")

    return "\n".join(lines)


def export_report_files(diagram: Dict[str, Any], output_dir: str = None) -> Dict[str, str]:
    """Export all report files to the specified directory."""
    if output_dir is None:
        output_dir = "exports"

    # Ensure output directory exists
    from pathlib import Path
    output_path = Path(output_dir)
    if not output_path.exists():
        output_path.mkdir(parents=True, exist_ok=True)

    results = {}

    try:
        # Generate markdown report
        markdown_content = generate_markdown_report(diagram)
        markdown_path = output_path / "system_blocks_report.md"
        with open(markdown_path, "w") as f:
            f.write(markdown_content)
        results["markdown"] = str(markdown_path)

        # Generate CSV pin map
        csv_content = generate_pin_map_csv(diagram)
        csv_path = output_path / "pin_map.csv"
        with open(csv_path, "w") as f:
            f.write(csv_content)
        results["csv"] = str(csv_path)

        # Generate C header
        header_content = generate_pin_map_header(diagram)
        header_path = output_path / "pins.h"
        with open(header_path, "w") as f:
            f.write(header_content)
        results["header"] = str(header_path)

    except Exception as e:
        results["error"] = str(e)

    return results


# ==================== IMPORT FUNCTIONALITY ====================


def parse_mermaid_flowchart(mermaid_text: str) -> Dict[str, Any]:
    """Parse a Mermaid flowchart into a diagram."""
    if not mermaid_text.strip():
        return create_empty_diagram()

    diagram = create_empty_diagram()
    blocks_created = {}  # Map node IDs to block objects

    lines = mermaid_text.strip().split("\n")

    # Remove flowchart declaration line
    content_lines = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith("flowchart") and not line.startswith("graph"):
            content_lines.append(line)

    x_position = 100
    y_position = 100

    for line in content_lines:
        # Parse connections: A --> B, A -.-> B, A -->|label| B
        # Handle cases where nodes have definitions: START[Label] --> INIT{Label}
        # Regex to match connections with optional node definitions
        connection_pattern = (r"(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?\s*[-\.]*>\s*"
                              r"(?:\|[^|]*\|)?\s*(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?")
        connection_match = re.search(connection_pattern, line)
        if connection_match:
            from_id, to_id = connection_match.groups()

            # Extract node info from inline definitions if present
            def extract_node_info(node_id, line_part):
                """Extract node type and label from inline definition"""
                node_match = re.search(rf"{node_id}([\[\(\{{])([^\]\)\}}]+)([\]\)\}}])", line_part)
                if node_match:
                    open_char, label, close_char = node_match.groups()
                    if open_char == "[":
                        node_type = "Generic"
                    elif open_char == "{":
                        node_type = "Decision"
                    elif open_char == "(":
                        node_type = "Process"
                    else:
                        node_type = "Generic"
                    return node_type, label
                return "Generic", node_id

            # Create blocks if they don't exist (use node names as IDs for Mermaid compatibility)
            if from_id not in blocks_created:
                node_type, node_label = extract_node_info(from_id, line)
                block = create_block(node_label, x_position, y_position, node_type, "Placeholder")
                block["id"] = from_id  # Override UUID with node name for Mermaid compatibility
                blocks_created[from_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150

            if to_id not in blocks_created:
                node_type, node_label = extract_node_info(to_id, line)
                block = create_block(node_label, x_position, y_position, node_type, "Placeholder")
                block["id"] = to_id  # Override UUID with node name for Mermaid compatibility
                blocks_created[to_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150

            # Create connection
            protocol = "data"
            # Look for edge labels
            if "|" in line:
                label_match = re.search(r"\|([^|]+)\|", line)
                if label_match:
                    protocol = label_match.group(1).strip()

            conn = create_connection(
                blocks_created[from_id]["id"], blocks_created[to_id]["id"], "data"
            )
            # Add protocol as attribute for all connections (including "data")
            conn["attributes"] = conn.get("attributes", {})
            conn["attributes"]["protocol"] = protocol
            add_connection_to_diagram(diagram, conn)

        # Parse node definitions: A[Label], A{Label}, or A(Label)
        node_match = re.search(r"(\w+)[\[\(\{]([^\]\)\}]+)[\]\)\}]", line)
        if node_match:
            node_id, label = node_match.groups()

            if node_id not in blocks_created:
                # Determine block type from shape
                block_type = "Generic"
                if "[" in line:
                    block_type = "Generic"  # Square brackets for generic blocks
                elif "{" in line:
                    block_type = "Decision"  # Curly braces for decision blocks
                elif "(" in line:
                    block_type = "Process"  # Parentheses for process blocks

                block = create_block(label, x_position, y_position, block_type, "Placeholder")
                block["id"] = node_id  # Override UUID with node name for Mermaid compatibility
                blocks_created[node_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150
            else:
                # Update existing block name
                blocks_created[node_id]["name"] = label

    return diagram


def parse_mermaid_to_diagram(mermaid_text: str) -> Dict[str, Any]:
    """Alias for parse_mermaid_flowchart for consistency."""
    return parse_mermaid_flowchart(mermaid_text)


def import_from_csv(blocks_csv: str, connections_csv: str = None) -> Dict[str, Any]:
    """Import diagram from CSV data."""
    if not blocks_csv.strip():
        return create_empty_diagram()

    diagram = create_empty_diagram()
    blocks_map = {}  # Map block names to block objects

    # Parse blocks CSV
    blocks_reader = csv.DictReader(io.StringIO(blocks_csv))
    x_position = 100
    y_position = 100

    for row in blocks_reader:
        name = row.get("name", "").strip()
        if not name:
            continue

        block_type = (row.get("type") or "Generic").strip()
        x = int(row.get("x", x_position))
        y = int(row.get("y", y_position))
        status = (row.get("status") or "Placeholder").strip()

        block = create_block(name, x, y, block_type, status)

        # Add any additional attributes
        for key, value in row.items():
            if key not in ["name", "type", "x", "y", "status"] and value:
                block["attributes"][key] = value

        blocks_map[name] = block
        add_block_to_diagram(diagram, block)

        x_position += 150
        if x_position > 800:
            x_position = 100
            y_position += 150

    # Parse connections CSV if provided
    if connections_csv and connections_csv.strip():
        connections_reader = csv.DictReader(io.StringIO(connections_csv))

        for row in connections_reader:
            from_name = row.get("from", "").strip()
            to_name = row.get("to", "").strip()
            kind = row.get("kind", "data").strip()
            protocol = row.get("protocol", "").strip()

            if from_name in blocks_map and to_name in blocks_map:
                conn = create_connection(
                    blocks_map[from_name]["id"], blocks_map[to_name]["id"], kind
                )
                # Add protocol as attribute if specified
                if protocol:
                    conn["attributes"] = conn.get("attributes", {})
                    conn["attributes"]["protocol"] = protocol
                add_connection_to_diagram(diagram, conn)

    return diagram


def validate_imported_diagram(diagram: Dict[str, Any]) -> Tuple[bool, str]:
    """Validate an imported diagram for common issues."""
    errors = []

    # Check if diagram is empty
    if not diagram.get("blocks"):
        return False, "Diagram must contain at least one block"

    # Check for duplicate block names
    block_names = [block.get("name", "") for block in diagram["blocks"]]
    duplicates = set([name for name in block_names if block_names.count(name) > 1 and name])

    if duplicates:
        for dup in duplicates:
            errors.append(f"Block names must be unique: '{dup}' appears multiple times")

    # Check for invalid connections
    block_ids = {block["id"] for block in diagram["blocks"]}

    for conn in diagram.get("connections", []):
        if conn["from"]["blockId"] not in block_ids:
            errors.append(
                f"Connection references unknown block: {conn['from']['blockId']}"
            )
        if conn["to"]["blockId"] not in block_ids:
            errors.append(
                f"Connection references unknown block: {conn['to']['blockId']}"
            )

    if errors:
        # Make error messages lowercase for test compatibility
        return False, "; ".join(errors).lower()
    else:
        return True, "Import validation successful"


# ==================== HIERARCHY FUNCTIONS ====================


def create_child_diagram(parent_block: Dict[str, Any]) -> Dict[str, Any]:
    """Create a child diagram for a parent block."""
    child_diagram = create_empty_diagram()
    parent_block["childDiagram"] = child_diagram
    return child_diagram


def has_child_diagram(block: Dict[str, Any]) -> bool:
    """Check if a block has a child diagram."""
    return "childDiagram" in block and block["childDiagram"] is not None


def get_child_diagram(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Get the child diagram of a block."""
    return block.get("childDiagram")


def validate_hierarchy_interfaces(parent_block: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate that parent block interfaces match child diagram interfaces."""
    if not has_child_diagram(parent_block):
        return True, []  # No child diagram to validate

    errors = []
    parent_interfaces = {intf["name"]: intf for intf in parent_block.get("interfaces", [])}
    child_diagram = get_child_diagram(parent_block)

    # Collect all interfaces from child blocks
    child_interfaces = {}
    for child_block in child_diagram.get("blocks", []):
        for intf in child_block.get("interfaces", []):
            # Interface name should match and types should be compatible
            intf_name = intf["name"]
            if intf_name in child_interfaces:
                continue  # Already found this interface
            child_interfaces[intf_name] = intf

    # Check that parent interfaces have compatible child interfaces
    for parent_intf_name, parent_intf in parent_interfaces.items():
        parent_kind = parent_intf.get("kind", "")
        parent_direction = parent_intf.get("direction", "")

        # Find compatible child interface (same kind, opposite direction)
        compatible_child = None
        for child_intf in child_interfaces.values():
            child_kind = child_intf.get("kind", "")
            child_direction = child_intf.get("direction", "")

            # Check if kinds match and directions are compatible
            if child_kind == parent_kind:
                # Output should match with Input, Input with Output, bidirectional with anything
                if ((parent_direction == "output" and child_direction == "input") or
                        (parent_direction == "input" and child_direction == "output") or
                        parent_direction == "bidirectional" or child_direction == "bidirectional"):
                    compatible_child = child_intf
                    break

        if not compatible_child:
            errors.append(
                f"Parent interface '{parent_intf_name}' has no corresponding interface"
            )

    return len(errors) == 0, errors


def compute_hierarchical_status(block: Dict[str, Any]) -> str:
    """Compute status considering child diagram status."""
    # Start with block's own computed status
    base_status = compute_block_status(block)

    # If no child diagram, return base status
    if not has_child_diagram(block):
        return base_status

    child_diagram = get_child_diagram(block)
    child_blocks = child_diagram.get("blocks", [])

    # If child diagram is empty, treat as placeholder
    if not child_blocks:
        return "Placeholder"

    # Get worst status from child blocks
    status_priority = {
        "Placeholder": 0,
        "Planned": 1,
        "In-Work": 2,
        "Implemented": 3,
        "Verified": 4,
    }

    child_statuses = [compute_hierarchical_status(child) for child in child_blocks]
    worst_child_status = min(child_statuses, key=lambda s: status_priority.get(s, 0))

    # Parent status is limited by worst child status
    parent_priority = status_priority.get(base_status, 0)
    child_priority = status_priority.get(worst_child_status, 0)

    final_priority = min(parent_priority, child_priority)

    # Convert back to status string
    for status, priority in status_priority.items():
        if priority == final_priority:
            return status

    return "Placeholder"


def get_all_blocks_recursive(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get all blocks including those in child diagrams."""
    all_blocks = []

    for block in diagram.get("blocks", []):
        all_blocks.append(block)

        # Recursively get blocks from child diagrams
        if has_child_diagram(block):
            child_diagram = get_child_diagram(block)
            child_blocks = get_all_blocks_recursive(child_diagram)
            all_blocks.extend(child_blocks)

    return all_blocks


def find_block_path(
    diagram: Dict[str, Any], target_block_id: str, path: List[str] = None
) -> Optional[List[str]]:
    """Find the hierarchical path to a specific block."""
    if path is None:
        path = []

    # Check current level blocks
    for block in diagram.get("blocks", []):
        if block["id"] == target_block_id:
            return path + [block["id"]]

        # Check child diagrams
        if has_child_diagram(block):
            child_diagram = get_child_diagram(block)
            child_path = find_block_path(child_diagram, target_block_id, path + [block["id"]])
            if child_path:
                return child_path

    return None
