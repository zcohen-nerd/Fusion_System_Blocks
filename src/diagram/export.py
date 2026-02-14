"""
Diagram export and import functions.

Provides functions to generate reports in multiple formats:
- Markdown system report with rule checks and block tables
- HTML self-contained report with embedded styling
- CSV pin map for signal routing
- C header with pin definitions
- BOM (Bill of Materials) in CSV and JSON
- Assembly sequence in JSON and Markdown
- Connection matrix (block × block adjacency) in CSV
- SVG diagram snapshot for design reviews

Also supports import from CSV and Mermaid flowchart syntax.
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
from datetime import datetime
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_executive_summary(diagram: dict[str, Any]) -> dict[str, Any]:
    """Compute high-level metrics for executive-style report sections.

    Returns a dict with:
        blocks, connections, status_counts, completion_pct,
        cad_linked_count, cad_linked_pct, protocol_counts,
        orphan_count, hierarchy_info, interface_count
    """
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    # Status breakdown
    status_counts: dict[str, int] = {}
    for b in blocks:
        s = b.get("status", "Placeholder")
        status_counts[s] = status_counts.get(s, 0) + 1

    # Completion %: verified + implemented are "done"
    done_statuses = {"Verified", "Implemented"}
    done = sum(c for s, c in status_counts.items() if s in done_statuses)
    total = len(blocks)
    completion_pct = (done / total * 100) if total else 0.0

    # CAD link coverage
    cad_linked = sum(1 for b in blocks if b.get("links"))
    cad_pct = (cad_linked / total * 100) if total else 0.0

    # Interface count
    intf_count = sum(len(b.get("interfaces", [])) for b in blocks)

    # Protocol / kind distribution on connections
    protocol_counts: dict[str, int] = {}
    for conn in connections:
        p = conn.get("kind", conn.get("type", "data"))
        protocol_counts[p] = protocol_counts.get(p, 0) + 1

    # Orphan blocks (no connections at all)
    connected_ids: set[str] = set()
    for conn in connections:
        fr = conn.get("from")
        to = conn.get("to")
        if isinstance(fr, dict):
            connected_ids.add(fr.get("blockId", ""))
        elif isinstance(conn.get("fromBlock"), str):
            connected_ids.add(conn["fromBlock"])
        if isinstance(to, dict):
            connected_ids.add(to.get("blockId", ""))
        elif isinstance(conn.get("toBlock"), str):
            connected_ids.add(conn["toBlock"])
    orphan_count = sum(1 for b in blocks if b.get("id") not in connected_ids)

    # Hierarchy info
    children = [b for b in blocks if b.get("childDiagram") or b.get("children")]
    hierarchy_depth = 0
    if diagram.get("parentId"):
        hierarchy_depth = 1  # at least one level deep

    return {
        "block_count": total,
        "connection_count": len(connections),
        "interface_count": intf_count,
        "status_counts": status_counts,
        "completion_pct": completion_pct,
        "cad_linked_count": cad_linked,
        "cad_linked_pct": cad_pct,
        "protocol_counts": protocol_counts,
        "orphan_count": orphan_count,
        "child_diagram_count": len(children),
        "hierarchy_depth": hierarchy_depth,
    }


def _esc(text: str) -> str:
    """Escape HTML-special characters for safe embedding."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _add_arrowhead(
    parts: list[str], x1: float, y1: float, x2: float, y2: float, size: float = 8
) -> None:
    """Append an SVG polygon arrowhead pointing from (x1,y1) to (x2,y2)."""
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    # perpendicular
    px, py = -uy, ux
    # Points of the arrowhead triangle
    ax = x2 - ux * size + px * size / 2
    ay = y2 - uy * size + py * size / 2
    bx = x2 - ux * size - px * size / 2
    by = y2 - uy * size - py * size / 2
    parts.append(f'<polygon class="arrow" points="{x2},{y2} {ax},{ay} {bx},{by}"/>')


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{--accent:#0078d4;--bg:#fff;--fg:#222;--border:#ddd;--row-alt:#f9f9f9}}
  body {{font-family:'Segoe UI',system-ui,sans-serif;margin:2rem;color:var(--fg);background:var(--bg)}}
  h1 {{color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:.4rem}}
  h2 {{margin-top:2rem;color:#333}}
  table {{border-collapse:collapse;width:100%;margin:.8rem 0}}
  th,td {{text-align:left;padding:.45rem .7rem;border:1px solid var(--border)}}
  th {{background:var(--accent);color:#fff;font-weight:600}}
  tr:nth-child(even) {{background:var(--row-alt)}}
  .status-verified {{color:#2e7d32;font-weight:600}}
  .status-implemented {{color:#1565c0;font-weight:600}}
  .status-in-work {{color:#ef6c00;font-weight:600}}
  .status-planned {{color:#6a1b9a;font-weight:600}}
  .status-placeholder {{color:#888}}
  .progress-bar {{display:inline-block;width:120px;height:14px;background:#eee;border-radius:7px;overflow:hidden;vertical-align:middle}}
  .progress-fill {{display:block;height:100%;background:var(--accent);border-radius:7px}}
  ul {{list-style:none;padding-left:0}}
  ul li::before {{content:'\25cf  ';color:var(--accent)}}
  footer {{margin-top:3rem;font-size:.8rem;color:#999;border-top:1px solid var(--border);padding-top:.5rem}}
  @media print {{body{{margin:0}} h1{{font-size:1.3rem}} th{{-webkit-print-color-adjust:exact;print-color-adjust:exact}}}}
</style>
</head>
<body>
<h1>{title}</h1>
<p>Generated: {timestamp}</p>

<h2>Executive Summary</h2>
<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
<tr><td>Total Blocks</td><td>{block_count}</td></tr>
<tr><td>Total Connections</td><td>{connection_count}</td></tr>
<tr><td>Total Interfaces</td><td>{interface_count}</td></tr>
<tr><td>Completion</td><td><span class="progress-bar"><span class="progress-fill" style="width:{completion_pct:.0f}%"></span></span> {completion_pct:.0f}%</td></tr>
<tr><td>CAD-Linked Blocks</td><td>{cad_linked_count} / {block_count} ({cad_linked_pct:.0f}%)</td></tr>
<tr><td>Orphan Blocks</td><td>{orphan_count}</td></tr>
<tr><td>Child Diagrams</td><td>{child_diagram_count}</td></tr>
</tbody></table>

{protocol_html}

<h2>Status Breakdown</h2>
<table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>
{status_rows}
</tbody></table>

<h2>Block Details</h2>
<table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Interfaces</th><th>Links</th><th>Attributes</th></tr></thead><tbody>
{block_rows}
</tbody></table>

<h2>Interface Details</h2>
<table><thead><tr><th>Block</th><th>Interface</th><th>Direction</th><th>Protocol</th></tr></thead><tbody>
{intf_rows}
</tbody></table>

<h2>Connection Details</h2>
<table><thead><tr><th>From</th><th>To</th><th>Protocol</th><th>Attributes</th></tr></thead><tbody>
{conn_rows}
</tbody></table>

<h2>Rule Check Results</h2>
<ul>{rule_html}</ul>

{bom_html}

<footer>Fusion System Blocks &mdash; auto-generated report</footer>
</body>
</html>
"""


def generate_markdown_report(diagram: dict[str, Any]) -> str:
    """
    Generate a comprehensive Markdown report for the diagram.

    Args:
        diagram: The diagram to generate report for

    Returns:
        Markdown-formatted report string
    """
    diagram = _normalize_connections(diagram)
    from .rules import find_block_by_id, run_all_rule_checks

    report = []
    es = _build_executive_summary(diagram)

    # Header
    report.append("# System Blocks Report")
    report.append(f"*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}*")
    report.append("")

    # Executive summary
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    report.append("## Executive Summary")
    report.append("")
    report.append("| Metric | Value |")
    report.append("|--------|-------|")
    report.append(f"| Total Blocks | {es['block_count']} |")
    report.append(f"| Total Connections | {es['connection_count']} |")
    report.append(f"| Total Interfaces | {es['interface_count']} |")
    report.append(f"| Completion | {es['completion_pct']:.0f}% (Verified + Implemented) |")
    report.append(f"| CAD-Linked Blocks | {es['cad_linked_count']} / {es['block_count']} ({es['cad_linked_pct']:.0f}%) |")
    report.append(f"| Orphan Blocks | {es['orphan_count']} |")
    report.append(f"| Child Diagrams | {es['child_diagram_count']} |")
    report.append("")

    if es["protocol_counts"]:
        report.append("### Connection Protocols")
        for proto, cnt in sorted(es["protocol_counts"].items()):
            report.append(f"- **{proto}:** {cnt}")
        report.append("")

    # Check for empty diagram
    if not blocks:
        report.append("No blocks defined")
        report.append("")

    # Status breakdown
    status_counts = es["status_counts"]

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
                ", ".join([f"{k}: {v}" for k, v in attributes.items()])
                if attributes
                else "-"
            )

            report.append(f"| {from_name} | {to_name} | {protocol} | {attr_str} |")

        report.append("")

    return "\n".join(report)


def generate_html_report(diagram: dict[str, Any]) -> str:
    """Generate a self-contained HTML report with embedded CSS.

    The report is a single HTML file suitable for sharing, printing,
    or archiving.  It contains:
    - Project summary and status breakdown
    - Block details table
    - Interface details table
    - Connection details table
    - Rule-check results
    - BOM summary (if data is available)

    Args:
        diagram: The diagram to generate the report for.

    Returns:
        A complete HTML document as a string.
    """
    diagram = _normalize_connections(diagram)
    from .cad import generate_living_bom
    from .rules import find_block_by_id, run_all_rule_checks

    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    es = _build_executive_summary(diagram)

    # Status breakdown
    status_counts: dict[str, int] = {}
    for block in blocks:
        s = block.get("status", "Placeholder")
        status_counts[s] = status_counts.get(s, 0) + 1

    status_rows = "".join(
        f"<tr><td>{s}</td><td>{c}</td></tr>" for s, c in status_counts.items()
    )

    # Block rows
    block_rows = ""
    for b in blocks:
        intf_count = len(b.get("interfaces", []))
        link_count = len(b.get("links", []))
        attrs = (
            "; ".join(f"{k}: {v}" for k, v in b.get("attributes", {}).items()) or "-"
        )
        block_rows += (
            f"<tr><td>{_esc(b.get('name', 'Unnamed'))}</td>"
            f"<td>{_esc(b.get('type', 'Generic'))}</td>"
            f"<td><span class='status-{b.get('status', 'Placeholder').lower()}'>"
            f"{_esc(b.get('status', 'Placeholder'))}</span></td>"
            f"<td>{intf_count}</td><td>{link_count}</td>"
            f"<td>{_esc(attrs)}</td></tr>"
        )

    # Interface rows
    intf_rows = ""
    for b in blocks:
        for intf in b.get("interfaces", []):
            intf_rows += (
                f"<tr><td>{_esc(b.get('name', ''))}</td>"
                f"<td>{_esc(intf.get('name', ''))}</td>"
                f"<td>{_esc(intf.get('direction', 'bidirectional'))}</td>"
                f"<td>{_esc(intf.get('kind', 'data'))}</td></tr>"
            )

    # Connection rows
    conn_rows = ""
    for conn in connections:
        fb = find_block_by_id(diagram, conn["from"]["blockId"])
        tb = find_block_by_id(diagram, conn["to"]["blockId"])
        if not fb or not tb:
            continue
        attrs = (
            "; ".join(f"{k}: {v}" for k, v in conn.get("attributes", {}).items()) or "-"
        )
        conn_rows += (
            f"<tr><td>{_esc(fb.get('name', ''))}</td>"
            f"<td>{_esc(tb.get('name', ''))}</td>"
            f"<td>{_esc(conn.get('kind', 'data'))}</td>"
            f"<td>{_esc(attrs)}</td></tr>"
        )

    # Rule results
    rule_results = run_all_rule_checks(diagram)
    rule_html = ""
    if rule_results:
        for r in rule_results:
            icon = "&#10060;" if r.get("severity") == "error" else "&#9888;&#65039;"
            rule_html += f"<li>{icon} {_esc(r['message'])}</li>"
    else:
        rule_html = "<li>&#9989; All rule checks passed!</li>"

    # BOM summary
    bom_data = generate_living_bom(diagram)
    bom_html = ""
    if bom_data.get("items"):
        bom_html = "<h2>Bill of Materials Summary</h2><table><thead><tr>"
        bom_html += "<th>Block</th><th>Part #</th><th>Qty</th><th>Supplier</th>"
        bom_html += "<th>Unit Cost</th><th>Total</th></tr></thead><tbody>"
        for item in bom_data["items"]:
            bom_html += (
                f"<tr><td>{_esc(item['blockName'])}</td>"
                f"<td>{_esc(str(item['partNumber']))}</td>"
                f"<td>{item['quantity']}</td>"
                f"<td>{_esc(str(item['supplier']))}</td>"
                f"<td>${item['cost']:.2f}</td>"
                f"<td>${item['totalCost']:.2f}</td></tr>"
            )
        summary = bom_data["summary"]
        bom_html += (
            f"</tbody><tfoot><tr><td colspan='5'><strong>Total"
            f"</strong></td><td><strong>${summary['totalCost']:.2f}"
            f"</strong></td></tr></tfoot></table>"
        )

    # Protocol distribution HTML
    protocol_html = ""
    if es["protocol_counts"]:
        protocol_html = "<h3>Connection Protocols</h3><ul>"
        for proto, cnt in sorted(es["protocol_counts"].items()):
            protocol_html += f"<li><strong>{_esc(proto)}:</strong> {cnt}</li>"
        protocol_html += "</ul>"

    html = _HTML_TEMPLATE.format(
        title="System Blocks Report",
        timestamp=timestamp,
        block_count=len(blocks),
        connection_count=len(connections),
        interface_count=es["interface_count"],
        completion_pct=es["completion_pct"],
        cad_linked_count=es["cad_linked_count"],
        cad_linked_pct=es["cad_linked_pct"],
        orphan_count=es["orphan_count"],
        child_diagram_count=es["child_diagram_count"],
        protocol_html=protocol_html,
        status_rows=status_rows or "<tr><td colspan='2'>No blocks</td></tr>",
        block_rows=block_rows or "<tr><td colspan='6'>No blocks</td></tr>",
        intf_rows=intf_rows or "<tr><td colspan='4'>No interfaces</td></tr>",
        conn_rows=conn_rows or "<tr><td colspan='4'>No connections</td></tr>",
        rule_html=rule_html,
        bom_html=bom_html,
    )
    return html


def generate_bom_csv(diagram: dict[str, Any]) -> str:
    """Generate a CSV Bill of Materials.

    Columns: Block, Part Number, Quantity, Supplier, Unit Cost, Total Cost,
    Lead Time (days), Category, CAD Components.

    Args:
        diagram: The diagram to generate the BOM for.

    Returns:
        CSV-formatted string.
    """
    from .cad import generate_living_bom

    bom = generate_living_bom(diagram)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Block",
            "Part Number",
            "Quantity",
            "Supplier",
            "Unit Cost",
            "Total Cost",
            "Lead Time (days)",
            "Category",
            "CAD Components",
        ]
    )
    for item in bom.get("items", []):
        cad_names = "; ".join(c.get("name", "") for c in item.get("cadComponents", []))
        writer.writerow(
            [
                item.get("blockName", ""),
                item.get("partNumber", ""),
                item.get("quantity", 1),
                item.get("supplier", ""),
                f"{item.get('cost', 0):.2f}",
                f"{item.get('totalCost', 0):.2f}",
                item.get("leadTime", 0),
                item.get("category", ""),
                cad_names,
            ]
        )
    return output.getvalue()


def generate_bom_json(diagram: dict[str, Any]) -> str:
    """Generate a JSON Bill of Materials.

    The JSON includes the full ``items`` list and a ``summary``
    object with totals, categories, and generation timestamp.

    Args:
        diagram: The diagram to generate the BOM for.

    Returns:
        Indented JSON string.
    """
    from .cad import generate_living_bom

    bom = generate_living_bom(diagram)
    return json.dumps(bom, indent=2, default=str)


def generate_assembly_sequence_markdown(diagram: dict[str, Any]) -> str:
    """Generate a Markdown assembly sequence document.

    Each step includes the order number, block name, complexity,
    estimated time, dependencies, and assembly instructions.

    Args:
        diagram: The diagram to generate the sequence for.

    Returns:
        Markdown-formatted string.
    """
    from .cad import generate_assembly_sequence

    steps = generate_assembly_sequence(diagram)
    lines = ["# Assembly Sequence", ""]
    if not steps:
        lines.append("No blocks in diagram — nothing to assemble.")
        return "\n".join(lines)

    total_time = sum(s.get("estimatedTime", 0) for s in steps)
    lines.append(f"**Total steps:** {len(steps)}  ")
    lines.append(f"**Estimated total time:** {total_time:.0f} min\n")

    for step in steps:
        lines.append(f"## Step {step['order']}: {step['blockName']}")
        lines.append(f"- **Complexity:** {step.get('complexity', 'unknown')}")
        lines.append(f"- **Est. time:** {step.get('estimatedTime', 0):.0f} min")
        deps = step.get("dependencies", [])
        if deps:
            lines.append(f"- **Depends on:** {', '.join(deps)}")
        instructions = step.get("instructions", [])
        if instructions:
            lines.append("")
            for instr in instructions:
                lines.append(f"  {instr}")
        lines.append("")

    return "\n".join(lines)


def generate_assembly_sequence_json(diagram: dict[str, Any]) -> str:
    """Generate a JSON assembly sequence.

    Args:
        diagram: The diagram to generate the sequence for.

    Returns:
        Indented JSON string.
    """
    from .cad import generate_assembly_sequence

    steps = generate_assembly_sequence(diagram)
    total_time = sum(s.get("estimatedTime", 0) for s in steps)
    payload = {
        "generatedAt": datetime.now().isoformat(),
        "totalSteps": len(steps),
        "estimatedTotalMinutes": round(total_time, 1),
        "steps": steps,
    }
    return json.dumps(payload, indent=2, default=str)


def generate_connection_matrix_csv(diagram: dict[str, Any]) -> str:
    """Generate a block × block connection adjacency matrix in CSV.

    Rows and columns are block names.  Cell values are the number
    of connections between the two blocks (directional: row → col).

    Args:
        diagram: The diagram to generate the matrix for.

    Returns:
        CSV-formatted string.
    """
    diagram = _normalize_connections(diagram)
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    id_to_name: dict[str, str] = {b["id"]: b.get("name", b["id"]) for b in blocks}
    names = [b.get("name", b["id"]) for b in blocks]

    # Build adjacency counts
    matrix: dict[str, dict[str, int]] = {n: dict.fromkeys(names, 0) for n in names}
    for conn in connections:
        from_name = id_to_name.get(conn["from"]["blockId"], "")
        to_name = id_to_name.get(conn["to"]["blockId"], "")
        if from_name in matrix and to_name in matrix[from_name]:
            matrix[from_name][to_name] += 1

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([""] + names)  # header
    for row_name in names:
        writer.writerow([row_name] + [matrix[row_name][col] for col in names])
    return output.getvalue()


def generate_svg_diagram(diagram: dict[str, Any]) -> str:
    """Generate a detailed SVG snapshot of the block diagram.

    Renders all 8 block shapes, type-based colours, status indicator
    dots, and connection-type styling (colour, width, dash pattern) so
    the exported SVG closely matches the browser canvas view.

    Args:
        diagram: The diagram to render.

    Returns:
        SVG markup string.
    """
    diagram = _normalize_connections(diagram)
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])

    if not blocks:
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">'
            '<text x="20" y="100" font-family="sans-serif" font-size="14" '
            'fill="#888">Empty diagram</text></svg>'
        )

    # Block dimensions
    default_w, default_h = 160, 80

    # Compute bounding box
    xs = [b.get("x", 0) for b in blocks]
    ys = [b.get("y", 0) for b in blocks]
    ws = [b.get("width", default_w) for b in blocks]
    hs = [b.get("height", default_h) for b in blocks]
    padding = 50
    min_x = min(xs) - padding
    min_y = min(ys) - padding
    max_x = max(x + w for x, w in zip(xs, ws)) + padding
    max_y = max(y + h for y, h in zip(ys, hs)) + padding
    svg_w = max_x - min_x
    svg_h = max_y - min_y

    id_to_block = {b["id"]: b for b in blocks}

    # --- Type-based colours (match diagram-renderer.js) ---
    type_colours: dict[str, dict[str, str]] = {
        "Electrical": {"fill": "#E8F4FD", "stroke": "#2196F3"},
        "Mechanical": {"fill": "#FFF3E0", "stroke": "#FF9800"},
        "Software": {"fill": "#F3E5F5", "stroke": "#9C27B0"},
        "Generic": {"fill": "#F5F5F5", "stroke": "#757575"},
    }

    # --- Status dot colours (match diagram-renderer.js/fusion-theme.css) ---
    status_dot_colours: dict[str, str] = {
        "Placeholder": "#969696",
        "Planned": "#87ceeb",
        "In-Work": "#ffc107",
        "Implemented": "#4caf50",
        "Verified": "#006064",
    }

    # --- Status stroke-width tweaks ---
    status_stroke_width: dict[str, float] = {
        "Placeholder": 1.0,
        "Planned": 1.5,
        "In-Work": 2.0,
        "Implemented": 3.0,
        "Verified": 3.0,
    }

    # --- Connection styling (match diagram-renderer.js) ---
    conn_styles: dict[str, dict[str, Any]] = {
        "power": {"stroke": "#dc3545", "width": 3, "dash": None},
        "data": {"stroke": "#007bff", "width": 2, "dash": "8,4"},
        "electrical": {"stroke": "#28a745", "width": 2, "dash": "4,2"},
        "mechanical": {"stroke": "#6c757d", "width": 2, "dash": "12,6"},
    }
    default_conn_style: dict[str, Any] = {"stroke": "#666", "width": 2, "dash": None}

    parts: list[str] = []
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{min_x} {min_y} {svg_w} {svg_h}" '
        f'width="{svg_w}" height="{svg_h}">'
    )
    parts.append("<style>")
    parts.append(
        "text.block-name{font-family:Arial,sans-serif;font-size:12px;"
        "font-weight:bold;fill:#333;text-anchor:middle;dominant-baseline:central}"
        "text.block-type{font-family:Arial,sans-serif;font-size:9px;"
        "fill:#888;text-anchor:middle}"
    )
    parts.append("</style>")

    # ---- Draw connections ----
    for conn in connections:
        fb = id_to_block.get(
            conn.get("from", {}).get("blockId") or conn.get("fromBlock", "")
        )
        tb = id_to_block.get(
            conn.get("to", {}).get("blockId") or conn.get("toBlock", "")
        )
        if not fb or not tb:
            continue
        fw = fb.get("width", default_w)
        fh = fb.get("height", default_h)
        th = tb.get("height", default_h)
        x1 = fb.get("x", 0) + fw
        y1 = fb.get("y", 0) + fh // 2
        x2 = tb.get("x", 0)
        y2 = tb.get("y", 0) + th // 2

        conn_type = (conn.get("type") or "auto").lower()
        style = conn_styles.get(conn_type, default_conn_style)

        dash_attr = f' stroke-dasharray="{style["dash"]}"' if style["dash"] else ""
        parts.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{style["stroke"]}" stroke-width="{style["width"]}"{dash_attr}/>'
        )
        # Arrowhead in connection colour
        _add_arrowhead(parts, x1, y1, x2, y2)

    # ---- Draw blocks ----
    for b in blocks:
        bx = b.get("x", 0)
        by = b.get("y", 0)
        bw = b.get("width", default_w)
        bh = b.get("height", default_h)
        shape = b.get("shape", "rectangle")
        btype = b.get("type", "Generic")
        status = b.get("status", "Placeholder")

        colours = type_colours.get(btype, type_colours["Generic"])
        fill = colours["fill"]
        stroke = colours["stroke"]
        sw = status_stroke_width.get(status, 1.0)

        # Render shape
        _render_block_shape(parts, shape, bx, by, bw, bh, fill, stroke, sw)

        # Block name (centred)
        parts.append(
            f'<text class="block-name" x="{bx + bw // 2}" '
            f'y="{by + bh // 2 - 6}">'
            f"{_esc(b.get('name', ''))}</text>"
        )
        # Block type (centred, below name)
        parts.append(
            f'<text class="block-type" x="{bx + bw // 2}" '
            f'y="{by + bh // 2 + 10}">'
            f"{_esc(btype)}</text>"
        )

        # Status indicator dot (top-right corner)
        dot_colour = status_dot_colours.get(status, "#969696")
        dot_cx = bx + bw - 10
        dot_cy = by + 10
        parts.append(
            f'<circle cx="{dot_cx}" cy="{dot_cy}" r="6" '
            f'fill="{dot_colour}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>'
        )

    parts.append("</svg>")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# PDF export — pure-Python, zero external dependencies
# ---------------------------------------------------------------------------

# Page-size presets in PDF points (1 pt = 1/72 inch)
_PDF_PAGE_SIZES: dict[str, tuple[float, float]] = {
    "letter": (612.0, 792.0),
    "a4": (595.28, 841.89),
    "a3": (841.89, 1190.55),
}


class _PdfWriter:
    """Minimal PDF 1.4 writer with text and basic drawing primitives.

    This is intentionally limited — it covers text rendering, simple
    table drawing, and coloured rectangles/lines needed for the system
    blocks report.  No images or fonts beyond the 14 built-in PDF fonts
    are supported.
    """

    def __init__(self, page_width: float, page_height: float) -> None:
        self._page_width = page_width
        self._page_height = page_height
        self._objects: list[bytes] = [b""]  # placeholder — 1-indexed
        self._pages: list[int] = []  # object ids of page objects
        self._stream_stack: list[list[str]] = []
        self._fonts: dict[str, int] = {}
        # Reserve obj 1 for catalog, 2 for pages dict
        self._objects.append(b"")  # obj 1
        self._objects.append(b"")  # obj 2

    # ---- Object helpers ----

    def _new_obj(self) -> int:
        self._objects.append(b"")
        return len(self._objects) - 1

    def _set_obj(self, obj_id: int, data: bytes) -> None:
        self._objects[obj_id] = data

    # ---- Fonts ----

    def _ensure_font(self, name: str) -> str:
        """Return a PDF font resource name (/F1 etc.) for a built-in font."""
        if name in self._fonts:
            return f"/F{self._fonts[name]}"
        obj_id = self._new_obj()
        self._set_obj(
            obj_id,
            (
                f"{obj_id} 0 obj\n"
                f"<< /Type /Font /Subtype /Type1 /BaseFont /{name} >>\n"
                f"endobj\n"
            ).encode(),
        )
        self._fonts[name] = obj_id
        return f"/F{obj_id}"

    # ---- Page content builders ----

    def new_page(self) -> None:
        self._stream_stack.append([])

    def _s(self) -> list[str]:
        return self._stream_stack[-1]

    def set_font(self, font_key: str, size: float) -> None:
        self._s().append(f"{font_key} {size} Tf")

    def set_color(self, r: float, g: float, b: float) -> None:
        self._s().append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke_color(self, r: float, g: float, b: float) -> None:
        self._s().append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def set_line_width(self, w: float) -> None:
        self._s().append(f"{w:.2f} w")

    def move_to(self, x: float, y: float) -> None:
        """Move text cursor (PDF coordinate: bottom-left origin)."""
        self._s().append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")

    def draw_text(self, x: float, y: float, text: str) -> None:
        safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        # PDF y=0 is bottom — caller provides top-origin y and we flip
        py = self._page_height - y
        self._s().append("BT")
        self._s().append(f"1 0 0 1 {x:.2f} {py:.2f} Tm")
        self._s().append(f"({safe}) Tj")
        self._s().append("ET")

    def draw_rect(
        self, x: float, y: float, w: float, h: float, *, fill: bool = True
    ) -> None:
        py = self._page_height - y - h
        op = "f" if fill else "S"
        self._s().append(f"{x:.2f} {py:.2f} {w:.2f} {h:.2f} re {op}")

    def draw_line(self, x1: float, y1: float, x2: float, y2: float) -> None:
        py1 = self._page_height - y1
        py2 = self._page_height - y2
        self._s().append(f"{x1:.2f} {py1:.2f} m {x2:.2f} {py2:.2f} l S")

    def finish_page(self) -> None:
        stream_body = "\n".join(self._stream_stack.pop()).encode()
        stream_obj_id = self._new_obj()
        self._set_obj(
            stream_obj_id,
            (
                f"{stream_obj_id} 0 obj\n<< /Length {len(stream_body)} >>\nstream\n"
            ).encode()
            + stream_body
            + b"\nendstream\nendobj\n",
        )

        # Font resources
        font_entries = " ".join(f"/F{oid} {oid} 0 R" for oid in self._fonts.values())

        page_obj_id = self._new_obj()
        self._set_obj(
            page_obj_id,
            (
                f"{page_obj_id} 0 obj\n"
                f"<< /Type /Page /Parent 2 0 R "
                f"/MediaBox [0 0 {self._page_width:.2f} {self._page_height:.2f}] "
                f"/Contents {stream_obj_id} 0 R "
                f"/Resources << /Font << {font_entries} >> >> >>\n"
                f"endobj\n"
            ).encode(),
        )
        self._pages.append(page_obj_id)

    def to_bytes(self) -> bytes:
        """Serialise the PDF to bytes."""
        # Build catalog (obj 1) and pages (obj 2)
        page_refs = " ".join(f"{p} 0 R" for p in self._pages)
        self._set_obj(
            1,
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        )
        self._set_obj(
            2,
            (
                f"2 0 obj\n<< /Type /Pages /Kids [{page_refs}] "
                f"/Count {len(self._pages)} >>\nendobj\n"
            ).encode(),
        )

        buf = io.BytesIO()
        buf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets: list[int] = [0]  # index 0 unused
        for idx in range(1, len(self._objects)):
            offsets.append(buf.tell())
            buf.write(self._objects[idx])

        # Cross-reference table
        xref_offset = buf.tell()
        buf.write(b"xref\n")
        buf.write(f"0 {len(self._objects)}\n".encode())
        buf.write(b"0000000000 65535 f \n")
        for idx in range(1, len(self._objects)):
            buf.write(f"{offsets[idx]:010d} 00000 n \n".encode())

        buf.write(b"trailer\n")
        buf.write(f"<< /Size {len(self._objects)} /Root 1 0 R >>\n".encode())
        buf.write(b"startxref\n")
        buf.write(f"{xref_offset}\n".encode())
        buf.write(b"%%EOF\n")
        return buf.getvalue()


def _pdf_hex_to_rgb(hex_color: str) -> tuple[float, float, float]:
    """Convert a hex colour string (#RRGGBB) to PDF-normalised (0-1) RGB."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    return (r, g, b)


def _pdf_truncate(text: str, max_chars: int) -> str:
    """Truncate to *max_chars* and add ellipsis if needed."""
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"


def generate_pdf_report(
    diagram: dict[str, Any],
    *,
    page_size: str = "letter",
    include_diagram: bool = True,
) -> bytes:
    """Generate a PDF report for the diagram using only the standard library.

    The report includes:
    - Header with title and generation timestamp
    - Summary statistics (block/connection counts, status breakdown)
    - Block details table
    - Connection details table
    - Rule-check results
    - Optional embedded diagram visualisation

    Args:
        diagram: The diagram to export.
        page_size: ``"letter"`` (default), ``"a4"``, or ``"a3"``.
        include_diagram: Whether to include the diagram visualisation page.

    Returns:
        Raw PDF bytes ready to write to a file.
    """
    diagram = _normalize_connections(diagram)
    from .rules import find_block_by_id, run_all_rule_checks

    pw, ph = _PDF_PAGE_SIZES.get(page_size.lower(), _PDF_PAGE_SIZES["letter"])
    pdf = _PdfWriter(pw, ph)
    margin = 50.0
    usable_w = pw - 2 * margin

    # Pre-compute data
    blocks = diagram.get("blocks", [])
    connections = diagram.get("connections", [])
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    status_counts: dict[str, int] = {}
    for block in blocks:
        s = block.get("status", "Placeholder")
        status_counts[s] = status_counts.get(s, 0) + 1

    rule_results = run_all_rule_checks(diagram)

    # ---- Helpers ----
    f_regular = pdf._ensure_font("Helvetica")
    f_bold = pdf._ensure_font("Helvetica-Bold")

    def _heading(y: float, text: str, size: float = 14) -> float:
        pdf.set_font(f_bold, size)
        pdf.set_color(0, 0.47, 0.83)  # accent blue
        pdf.draw_text(margin, y, text)
        return y + size + 6

    def _body(y: float, text: str, size: float = 9) -> float:
        pdf.set_font(f_regular, size)
        pdf.set_color(0.13, 0.13, 0.13)
        pdf.draw_text(margin, y, text)
        return y + size + 3

    def _table_header(y: float, cols: list[tuple[str, float]]) -> float:
        """Draw a table header row and return the new y."""
        row_h = 16
        # Header background
        pdf.set_color(0, 0.47, 0.83)
        pdf.draw_rect(margin, y, usable_w, row_h, fill=True)
        # Header text
        pdf.set_font(f_bold, 8)
        pdf.set_color(1, 1, 1)
        cx = margin + 4
        for label, col_w in cols:
            pdf.draw_text(cx, y + 4, label)
            cx += col_w
        return y + row_h

    def _table_row(
        y: float, values: list[str], col_widths: list[float], *, alt: bool = False
    ) -> float:
        row_h = 14
        if alt:
            pdf.set_color(0.96, 0.96, 0.96)
            pdf.draw_rect(margin, y, usable_w, row_h, fill=True)
        pdf.set_font(f_regular, 7.5)
        pdf.set_color(0.13, 0.13, 0.13)
        cx = margin + 4
        for val, cw in zip(values, col_widths):
            pdf.draw_text(cx, y + 3, _pdf_truncate(val, int(cw / 4)))
            cx += cw
        return y + row_h

    def _check_page_break(y: float, needed: float = 60) -> float:
        """If remaining space is too small, finish this page and start next."""
        if y + needed > ph - margin:
            _finish_page_with_footer(y)
            pdf.new_page()
            y = margin + 10
        return y

    def _finish_page_with_footer(y: float) -> None:  # noqa: ARG001
        pdf.set_font(f_regular, 7)
        pdf.set_color(0.6, 0.6, 0.6)
        pdf.draw_line(margin, ph - 35, pw - margin, ph - 35)
        pdf.draw_text(margin, ph - 30, f"Fusion System Blocks — generated {timestamp}")
        pdf.draw_text(pw - margin - 60, ph - 30, f"Page {len(pdf._pages) + 1}")
        pdf.finish_page()

    # === PAGE 1 — Title & Summary ===
    pdf.new_page()
    y = margin

    # Title
    pdf.set_font(f_bold, 20)
    pdf.set_color(0, 0.47, 0.83)
    pdf.draw_text(margin, y, "System Blocks Report")
    y += 28

    # Divider
    pdf.set_stroke_color(0, 0.47, 0.83)
    pdf.set_line_width(2)
    pdf.draw_line(margin, y, pw - margin, y)
    y += 12

    y = _body(y, f"Generated: {timestamp}")
    y += 8

    # Summary table
    y = _heading(y, "Summary")
    cols_summary = [("Metric", usable_w * 0.6), ("Value", usable_w * 0.4)]
    y = _table_header(y, cols_summary)
    cw_s = [c[1] for c in cols_summary]
    y = _table_row(y, ["Total Blocks", str(len(blocks))], cw_s)
    y = _table_row(y, ["Total Connections", str(len(connections))], cw_s, alt=True)
    y += 12

    # Status breakdown
    y = _heading(y, "Status Breakdown")
    cols_status = [("Status", usable_w * 0.6), ("Count", usable_w * 0.4)]
    y = _table_header(y, cols_status)
    cw_st = [c[1] for c in cols_status]
    for i, (status, count) in enumerate(status_counts.items()):
        y = _check_page_break(y)
        y = _table_row(y, [status, str(count)], cw_st, alt=i % 2 == 1)
    y += 12

    # Rule check results
    y = _check_page_break(y, 80)
    y = _heading(y, "Rule Check Results")
    if rule_results:
        for r in rule_results:
            y = _check_page_break(y)
            icon = "X" if r.get("severity") == "error" else "!"
            y = _body(y, f"[{icon}] {r['message']}")
    else:
        y = _body(y, "All rule checks passed.")
    y += 12

    _finish_page_with_footer(y)

    # === PAGE 2 — Block Details ===
    pdf.new_page()
    y = margin
    y = _heading(y, "Block Details")
    col_defs_b = [
        ("Name", usable_w * 0.22),
        ("Type", usable_w * 0.14),
        ("Status", usable_w * 0.14),
        ("Interfaces", usable_w * 0.10),
        ("Links", usable_w * 0.08),
        ("Attributes", usable_w * 0.32),
    ]
    y = _table_header(y, col_defs_b)
    cw_b = [c[1] for c in col_defs_b]
    for i, b in enumerate(blocks):
        y = _check_page_break(y)
        intf_count = str(len(b.get("interfaces", [])))
        link_count = str(len(b.get("links", [])))
        attrs = (
            "; ".join(f"{k}: {v}" for k, v in b.get("attributes", {}).items()) or "-"
        )
        y = _table_row(
            y,
            [
                b.get("name", "Unnamed"),
                b.get("type", "Generic"),
                b.get("status", "Placeholder"),
                intf_count,
                link_count,
                attrs,
            ],
            cw_b,
            alt=i % 2 == 1,
        )
    y += 12

    # Connection details
    y = _check_page_break(y, 60)
    y = _heading(y, "Connection Details")
    col_defs_c = [
        ("From", usable_w * 0.30),
        ("To", usable_w * 0.30),
        ("Type", usable_w * 0.18),
        ("Attributes", usable_w * 0.22),
    ]
    y = _table_header(y, col_defs_c)
    cw_c = [c[1] for c in col_defs_c]
    for i, conn in enumerate(connections):
        y = _check_page_break(y)
        fb = find_block_by_id(diagram, conn.get("from", {}).get("blockId", ""))
        tb = find_block_by_id(diagram, conn.get("to", {}).get("blockId", ""))
        from_name = fb.get("name", "?") if fb else "?"
        to_name = tb.get("name", "?") if tb else "?"
        attrs = (
            "; ".join(f"{k}: {v}" for k, v in conn.get("attributes", {}).items()) or "-"
        )
        y = _table_row(
            y,
            [from_name, to_name, conn.get("kind", "data"), attrs],
            cw_c,
            alt=i % 2 == 1,
        )

    _finish_page_with_footer(y)

    # === PAGE 3 (optional) — Diagram Visualisation ===
    if include_diagram and blocks:
        pdf.new_page()
        y = margin
        y = _heading(y, "Diagram Visualisation")
        y += 4

        # Compute block bounding box
        default_w_b, default_h_b = 160, 80
        xs = [bl.get("x", 0) for bl in blocks]
        ys_list = [bl.get("y", 0) for bl in blocks]
        ws_list = [bl.get("width", default_w_b) for bl in blocks]
        hs_list = [bl.get("height", default_h_b) for bl in blocks]
        pad = 20
        d_min_x = min(xs) - pad
        d_min_y = min(ys_list) - pad
        d_max_x = max(x + w for x, w in zip(xs, ws_list)) + pad
        d_max_y = max(yy + h for yy, h in zip(ys_list, hs_list)) + pad
        d_w = d_max_x - d_min_x or 1
        d_h = d_max_y - d_min_y or 1

        # Scale to fit usable area
        avail_w = usable_w
        avail_h = ph - y - margin - 40
        scale = min(avail_w / d_w, avail_h / d_h, 1.0)

        # Type colours
        type_fills: dict[str, str] = {
            "Electrical": "#E8F4FD",
            "Mechanical": "#FFF3E0",
            "Software": "#F3E5F5",
            "Generic": "#F5F5F5",
        }
        type_strokes: dict[str, str] = {
            "Electrical": "#2196F3",
            "Mechanical": "#FF9800",
            "Software": "#9C27B0",
            "Generic": "#757575",
        }

        id_to_block_p = {bl["id"]: bl for bl in blocks}

        # Draw connections as lines
        pdf.set_line_width(1.0)
        for conn in connections:
            fb = id_to_block_p.get(
                conn.get("from", {}).get("blockId") or conn.get("fromBlock", "")
            )
            tb = id_to_block_p.get(
                conn.get("to", {}).get("blockId") or conn.get("toBlock", "")
            )
            if not fb or not tb:
                continue
            fw_c = fb.get("width", default_w_b)
            fh_c = fb.get("height", default_h_b)
            th_c = tb.get("height", default_h_b)
            x1 = margin + (fb.get("x", 0) + fw_c - d_min_x) * scale
            y1_c = y + (fb.get("y", 0) + fh_c / 2 - d_min_y) * scale
            x2 = margin + (tb.get("x", 0) - d_min_x) * scale
            y2_c = y + (tb.get("y", 0) + th_c / 2 - d_min_y) * scale
            pdf.set_stroke_color(0.4, 0.4, 0.4)
            pdf.draw_line(x1, y1_c, x2, y2_c)

        # Draw blocks as rectangles with names
        for bl in blocks:
            bx = margin + (bl.get("x", 0) - d_min_x) * scale
            by = y + (bl.get("y", 0) - d_min_y) * scale
            bw = (bl.get("width", default_w_b)) * scale
            bh = (bl.get("height", default_h_b)) * scale
            btype = bl.get("type", "Generic")
            fill_hex = type_fills.get(btype, "#F5F5F5")
            stroke_hex = type_strokes.get(btype, "#757575")

            fr, fg, fb_c = _pdf_hex_to_rgb(fill_hex)
            pdf.set_color(fr, fg, fb_c)
            pdf.draw_rect(bx, by, bw, bh, fill=True)

            sr, sg, sb = _pdf_hex_to_rgb(stroke_hex)
            pdf.set_stroke_color(sr, sg, sb)
            pdf.set_line_width(1.5)
            pdf.draw_rect(bx, by, bw, bh, fill=False)

            # Block name centred
            name = bl.get("name", "")
            font_size = max(6, min(9, bw / max(len(name), 1) * 1.2))
            pdf.set_font(f_regular, font_size)
            pdf.set_color(0.13, 0.13, 0.13)
            # Approximate centre — Helvetica avg char width ≈ 0.5 * font_size
            text_w = len(name) * font_size * 0.5
            tx = bx + (bw - text_w) / 2
            ty = by + bh / 2 - font_size / 3
            pdf.draw_text(tx, ty, name)

        _finish_page_with_footer(y + d_h * scale + 8)

    return pdf.to_bytes()


def _render_block_shape(
    parts: list[str],
    shape: str,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str,
    stroke: str,
    stroke_width: float,
) -> None:
    """Append SVG markup for a single block shape.

    Supports: rectangle, rounded, circle (ellipse), diamond, hexagon,
    parallelogram, cylinder, triangle.
    """
    common = f'fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}"'

    if shape == "circle":
        cx = x + w / 2
        cy = y + h / 2
        rx = w / 2
        ry = h / 2
        parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" {common}/>')

    elif shape == "diamond":
        mx = x + w / 2
        my = y + h / 2
        pts = f"{mx},{y} {x + w},{my} {mx},{y + h} {x},{my}"
        parts.append(f'<polygon points="{pts}" {common}/>')

    elif shape == "hexagon":
        off = w * 0.2
        pts = (
            f"{x + off},{y} {x + w - off},{y} {x + w},{y + h / 2} "
            f"{x + w - off},{y + h} {x + off},{y + h} {x},{y + h / 2}"
        )
        parts.append(f'<polygon points="{pts}" {common}/>')

    elif shape == "rounded":
        r = min(w, h) * 0.3
        parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" {common}/>'
        )

    elif shape == "parallelogram":
        skew = w * 0.18
        pts = f"{x + skew},{y} {x + w},{y} {x + w - skew},{y + h} {x},{y + h}"
        parts.append(f'<polygon points="{pts}" {common}/>')

    elif shape == "cylinder":
        cap_ry = h * 0.12
        d = (
            f"M {x},{y + cap_ry}"
            f" A {w / 2},{cap_ry} 0 0,1 {x + w},{y + cap_ry}"
            f" L {x + w},{y + h - cap_ry}"
            f" A {w / 2},{cap_ry} 0 0,1 {x},{y + h - cap_ry}"
            " Z"
        )
        parts.append(f'<path d="{d}" {common}/>')

    elif shape == "triangle":
        pts = f"{x + w / 2},{y} {x + w},{y + h} {x},{y + h}"
        parts.append(f'<polygon points="{pts}" {common}/>')

    else:
        # Default: rectangle with small corner radius
        parts.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" {common}/>'
        )


# ---------------------------------------------------------------------------
# Export profile helpers
# ---------------------------------------------------------------------------

#: Available export profiles and the file-keys they produce.
EXPORT_PROFILES: dict[str, list[str]] = {
    "quick": ["markdown", "csv", "header"],
    "standard": [
        "markdown",
        "html",
        "csv",
        "header",
        "bom_csv",
        "bom_json",
        "assembly_md",
        "assembly_json",
        "connection_matrix",
    ],
    "full": [
        "markdown",
        "html",
        "csv",
        "header",
        "bom_csv",
        "bom_json",
        "assembly_md",
        "assembly_json",
        "connection_matrix",
        "svg",
        "pdf",
    ],
}


def pin_map_csv(diagram: dict[str, Any]) -> str:
    """Generate a CSV pin map for the diagram.

    Args:
        diagram: The diagram to generate pin map for

    Returns:
        CSV-formatted string
    """
    diagram = _normalize_connections(diagram)
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
            [
                signal_name,
                source_name,
                source_pin,
                dest_name,
                dest_pin,
                protocol,
                notes_str,
            ]
        )

    return output.getvalue()


# Backward-compatible alias — existing code imports this name.
generate_pin_map_csv = pin_map_csv


def generate_pin_map_header(diagram: dict[str, Any]) -> str:
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


def _normalize_connections(diagram: dict[str, Any]) -> dict[str, Any]:
    """Normalise connection data so both JS and Python formats work.

    The JavaScript editor stores connections as
    ``{fromBlock, toBlock, type}`` while the Python generators expect
    ``{from: {blockId}, to: {blockId}, kind}``.  This helper copies
    the diagram and converts if necessary so every generator can rely
    on the canonical ``from/to`` nested format.
    """
    conns = diagram.get("connections", [])
    if not conns:
        return diagram

    # Fast check — if the first connection already has "from", skip
    sample = conns[0]
    if isinstance(sample.get("from"), dict):
        return diagram

    # Need to convert — work on a shallow copy of the diagram
    normalised = {**diagram}
    new_conns = []
    for conn in conns:
        c = dict(conn)
        # Convert fromBlock/toBlock to from.blockId/to.blockId
        if "fromBlock" in c and not isinstance(c.get("from"), dict):
            c["from"] = {"blockId": c["fromBlock"]}
        if "toBlock" in c and not isinstance(c.get("to"), dict):
            c["to"] = {"blockId": c["toBlock"]}
        # Map 'type' to 'kind' (JS uses 'type', Python uses 'kind')
        if "kind" not in c and "type" in c:
            c["kind"] = c["type"]
        new_conns.append(c)
    normalised["connections"] = new_conns
    return normalised


def export_report_files(
    diagram: dict[str, Any],
    output_dir: str | None = None,
    profile: str = "full",
    selected_formats: list[str] | None = None,
) -> dict[str, str]:
    """Export report files for the diagram.

    Args:
        diagram: The diagram to export.
        output_dir: Directory to write files into (default: ``exports``).
        profile: Export profile — ``"quick"`` (Markdown + CSV + C header),
            ``"standard"`` (adds HTML, BOM, assembly, connection matrix),
            or ``"full"`` (everything including SVG).  Unknown values
            fall back to ``"full"``.
        selected_formats: If provided, overrides the *profile* and exports
            only the listed format keys (e.g. ``["markdown", "html"]``).

    Returns:
        Dictionary mapping file-type keys to written file paths.
        An ``"error"`` key is present when a non-fatal error occurred.
    """
    if output_dir is None:
        output_dir = "exports"

    # Normalise JS-style connections to the Python-expected format
    diagram = _normalize_connections(diagram)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Honour explicit format list from the export dialog if provided;
    # otherwise fall back to the named profile.
    if selected_formats:
        selected = selected_formats
    else:
        selected = EXPORT_PROFILES.get(profile, EXPORT_PROFILES["full"])
    results: dict[str, str] = {}

    # Map of key -> (filename, generator)
    generators: dict[str, tuple[str, Any]] = {
        "markdown": (
            "system_blocks_report.md",
            lambda: generate_markdown_report(diagram),
        ),
        "html": ("system_blocks_report.html", lambda: generate_html_report(diagram)),
        "csv": ("pin_map.csv", lambda: generate_pin_map_csv(diagram)),
        "header": ("pins.h", lambda: generate_pin_map_header(diagram)),
        "bom_csv": ("bom.csv", lambda: generate_bom_csv(diagram)),
        "bom_json": ("bom.json", lambda: generate_bom_json(diagram)),
        "assembly_md": (
            "assembly_sequence.md",
            lambda: generate_assembly_sequence_markdown(diagram),
        ),
        "assembly_json": (
            "assembly_sequence.json",
            lambda: generate_assembly_sequence_json(diagram),
        ),
        "connection_matrix": (
            "connection_matrix.csv",
            lambda: generate_connection_matrix_csv(diagram),
        ),
        "svg": ("diagram.svg", lambda: generate_svg_diagram(diagram)),
        "pdf": ("system_blocks_report.pdf", lambda: generate_pdf_report(diagram)),
    }

    errors: list[str] = []
    for key in selected:
        if key not in generators:
            continue
        filename, gen_fn = generators[key]
        try:
            content = gen_fn()
            filepath = output_path / filename
            # PDF returns bytes; all other generators return str
            if isinstance(content, bytes):
                with open(filepath, "wb") as fb:
                    fb.write(content)
            else:
                with open(filepath, "w", encoding="utf-8") as fh:
                    fh.write(content)
            results[key] = str(filepath)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{key}: {exc}")

    if errors:
        results["error"] = "; ".join(errors)

    return results


def parse_mermaid_flowchart(mermaid_text: str) -> dict[str, Any]:
    """
    Parse a Mermaid flowchart into a diagram.

    Args:
        mermaid_text: Mermaid flowchart syntax

    Returns:
        Diagram dictionary
    """
    from .core import (
        add_block_to_diagram,
        add_connection_to_diagram,
        create_block,
        create_connection,
        create_empty_diagram,
    )

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
                    rf"{node_id}([\[\(\{{])([^\]\)\}}]+)([\]\)\}}])", line_part
                )
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
                block = create_block(
                    node_label, x_position, y_position, node_type, "Placeholder"
                )
                # Override UUID with node name for Mermaid compatibility
                block["id"] = from_id
                blocks_created[from_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150

            if to_id not in blocks_created:
                node_type, node_label = extract_node_info(to_id, line)
                block = create_block(
                    node_label, x_position, y_position, node_type, "Placeholder"
                )
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
                    label, x_position, y_position, block_type, "Placeholder"
                )
                # Override UUID with node name for Mermaid compatibility
                block["id"] = node_id
                blocks_created[node_id] = block
                add_block_to_diagram(diagram, block)
                x_position += 150
            else:
                # Update existing block name
                blocks_created[node_id]["name"] = label

    return diagram


def parse_mermaid_to_diagram(mermaid_text: str) -> dict[str, Any]:
    """Alias for parse_mermaid_flowchart for consistency."""
    return parse_mermaid_flowchart(mermaid_text)


def import_from_csv(blocks_csv: str, connections_csv: str = None) -> dict[str, Any]:
    """
    Import diagram from CSV data.

    Args:
        blocks_csv: CSV string with block data
        connections_csv: Optional CSV string with connection data

    Returns:
        Diagram dictionary
    """
    from .core import (
        add_block_to_diagram,
        add_connection_to_diagram,
        create_block,
        create_connection,
        create_empty_diagram,
    )

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


def validate_imported_diagram(diagram: dict[str, Any]) -> tuple:
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
    duplicates = {name for name in block_names if block_names.count(name) > 1 and name}

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
