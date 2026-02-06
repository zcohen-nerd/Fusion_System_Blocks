"""
Diagram export and import functions.

Provides functions to generate reports (Markdown, CSV, C headers),
import diagrams from CSV and Mermaid, and export to various formats.
"""

import io
import csv
import re
from typing import Dict, Any
from pathlib import Path


def generate_markdown_report(diagram: Dict[str, Any]) -> str:
    """
    Generate a comprehensive Markdown report for the diagram.

    Args:
        diagram: The diagram to generate report for

    Returns:
        Markdown-formatted report string
    """
    from .rules import run_all_rule_checks, find_block_by_id

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
            all_interfaces.append(
                {
                    "block_name": block.get("name", "Unnamed"),
                    "interface_name": interface.get("name", "Unnamed Interface"),
                    "direction": interface.get("direction", "bidirectional"),
                    "protocol": interface.get("protocol", "data"),
                }
            )

    if all_interfaces:
        report.append("## Interface Details")
        report.append("| Block | Interface | Direction | Protocol |")
        report.append("|-------|-----------|-----------|----------|")

        for intf in all_interfaces:
            report.append(
                f"| {intf['block_name']} | {intf['interface_name']} | "
                f"{intf['direction']} | {intf['protocol']} |"
            )

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
            attr_str = (
                ", ".join([f"{k}: {v}" for k, v in attributes.items()]
                          ) if attributes else "-"
            )

            report.append(
                f"| {from_name} | {to_name} | {protocol} | {attr_str} |")

        report.append("")

    return "\n".join(report)


def generate_pin_map_csv(diagram: Dict[str, Any]) -> str:
    """
    Generate a CSV pin map for the diagram.

    Args:
        diagram: The diagram to generate pin map for

    Returns:
        CSV-formatted string
    """
    from .core import find_block_by_id

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(
        [
            "Signal",
            "Source Block",
            "Source Interface",
            "Dest Block",
            "Dest Interface",
            "Protocol",
            "Notes",
        ]
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
            [signal_name, source_name, source_pin,
                dest_name, dest_pin, protocol, notes_str]
        )

    return output.getvalue()


def generate_pin_map_header(diagram: Dict[str, Any]) -> str:
    """
    Generate a C header file with pin definitions.

    Args:
        diagram: The diagram to generate header for

    Returns:
        C header file content
    """
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
    """
    Export all report files to the specified directory.

    Args:
        diagram: The diagram to export
        output_dir: Directory to export to (default: "exports")

    Returns:
        Dictionary mapping file type to file path
    """
    if output_dir is None:
        output_dir = "exports"

    # Ensure output directory exists
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


def parse_mermaid_flowchart(mermaid_text: str) -> Dict[str, Any]:
    """
    Parse a Mermaid flowchart into a diagram.

    Args:
        mermaid_text: Mermaid flowchart syntax

    Returns:
        Diagram dictionary
    """
    from .core import create_empty_diagram, create_block, create_connection, add_block_to_diagram, add_connection_to_diagram

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
        connection_pattern = (
            r"(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?\s*[-\.]*>\s*"
            r"(?:\|[^|]*\|)?\s*(\w+)(?:[\[\(\{][^\]\)\}]*[\]\)\}])?"
        )
        connection_match = re.search(connection_pattern, line)
        if connection_match:
            from_id, to_id = connection_match.groups()

            # Extract node info from inline definitions if present
            def extract_node_info(node_id, line_part):
                """Extract node type and label from inline definition"""
                node_match = re.search(
                    rf"{node_id}([\[\(\{{])([^\]\)\}}]+)([\]\)\}}])", line_part)
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
                block = create_block(node_label, x_position,
                                     y_position, node_type, "Placeholder")
                # Override UUID with node name for Mermaid compatibility
                block["id"] = from_id
                blocks_created[from_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150

            if to_id not in blocks_created:
                node_type, node_label = extract_node_info(to_id, line)
                block = create_block(node_label, x_position,
                                     y_position, node_type, "Placeholder")
                # Override UUID with node name for Mermaid compatibility
                block["id"] = to_id
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

                block = create_block(
                    label, x_position, y_position, block_type, "Placeholder")
                # Override UUID with node name for Mermaid compatibility
                block["id"] = node_id
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
    """
    Import diagram from CSV data.

    Args:
        blocks_csv: CSV string with block data
        connections_csv: Optional CSV string with connection data

    Returns:
        Diagram dictionary
    """
    from .core import create_empty_diagram, create_block, create_connection, add_block_to_diagram, add_connection_to_diagram

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


def validate_imported_diagram(diagram: Dict[str, Any]) -> tuple:
    """
    Validate an imported diagram for common issues.

    Args:
        diagram: The imported diagram to validate

    Returns:
        Tuple of (is_valid, message)
    """
    errors = []

    # Check if diagram is empty
    if not diagram.get("blocks"):
        return False, "Diagram must contain at least one block"

    # Check for duplicate block names
    block_names = [block.get("name", "") for block in diagram["blocks"]]
    duplicates = set(
        [name for name in block_names if block_names.count(name) > 1 and name])

    if duplicates:
        for dup in duplicates:
            errors.append(
                f"Block names must be unique: '{dup}' appears multiple times")

    # Check for invalid connections
    block_ids = {block["id"] for block in diagram["blocks"]}

    for conn in diagram.get("connections", []):
        if conn["from"]["blockId"] not in block_ids:
            errors.append(
                f"Connection references unknown block: {conn['from']['blockId']}")
        if conn["to"]["blockId"] not in block_ids:
            errors.append(
                f"Connection references unknown block: {conn['to']['blockId']}")

    if errors:
        # Make error messages lowercase for test compatibility
        return False, "; ".join(errors).lower()
    else:
        return True, "Import validation successful"
