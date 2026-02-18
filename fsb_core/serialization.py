"""Serialization utilities for System Blocks graphs.

This module provides JSON serialization and deserialization for graphs,
with support for both the new dataclass-based models and backward
compatibility with the legacy dictionary format.

BOUNDARY: This module contains NO Fusion dependencies.
"""

from __future__ import annotations

import json
from typing import Any

from .models import (
    Block,
    BlockStatus,
    ComparisonOperator,
    Connection,
    Graph,
    Group,
    Port,
    PortDirection,
    PortKind,
    Requirement,
)


def serialize_graph(graph: Graph, indent: int = 2) -> str:
    """Serialize a Graph to JSON string.

    Converts the graph to a normalized dictionary format compatible with
    both the new dataclass models and legacy code.

    Args:
        graph: The Graph instance to serialize.
        indent: JSON indentation level.

    Returns:
        JSON string representation of the graph.
    """
    data = graph_to_dict(graph)
    return json.dumps(data, indent=indent)


def deserialize_graph(json_str: str) -> Graph:
    """Deserialize a Graph from JSON string.

    Parses JSON and constructs a Graph instance, handling both the new
    format and legacy dictionary format.

    Args:
        json_str: JSON string to parse.

    Returns:
        Constructed Graph instance.

    Raises:
        ValueError: If JSON is invalid or cannot be parsed.
    """
    try:
        data = json.loads(json_str)
        return dict_to_graph(data)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}") from e


def graph_to_dict(graph: Graph) -> dict[str, Any]:
    """Convert a Graph to a dictionary.

    Produces a normalized format that's compatible with the legacy
    diagram format while preserving all new model information.

    Args:
        graph: The Graph to convert.

    Returns:
        Dictionary representation.
    """
    blocks_data = []
    for block in graph.blocks:
        block_dict = {
            "id": block.id,
            "name": block.name,
            "type": block.block_type,
            "x": block.x,
            "y": block.y,
            "status": block.status.value,
            "attributes": block.attributes,
            "links": block.links,
        }

        # Convert ports to legacy "interfaces" format
        interfaces_list: list[dict[str, Any]] = []
        for port in block.ports:
            interface = {
                "id": port.id,
                "name": port.name,
                "kind": port.kind.value,
                "direction": port.direction.value,
                "port": {
                    "side": port.side,
                    "index": port.index,
                },
                "params": port.params,
            }
            interfaces_list.append(interface)
        block_dict["interfaces"] = interfaces_list

        if block.child_diagram_id:
            block_dict["childDiagramId"] = block.child_diagram_id

        blocks_data.append(block_dict)

    connections_data = []
    for conn in graph.connections:
        conn_dict = {
            "id": conn.id,
            "from": {
                "blockId": conn.from_block_id,
                "interfaceId": conn.from_port_id,
            },
            "to": {
                "blockId": conn.to_block_id,
                "interfaceId": conn.to_port_id,
            },
            "kind": conn.kind,
            "attributes": conn.attributes,
        }
        connections_data.append(conn_dict)

    return {
        "schema": graph.schema,
        "id": graph.id,
        "name": graph.name,
        "blocks": blocks_data,
        "connections": connections_data,
        "groups": [_group_to_dict(g) for g in graph.groups],
        "metadata": graph.metadata,
        "requirements": [_requirement_to_dict(r) for r in graph.requirements],
    }


def dict_to_graph(data: dict[str, Any]) -> Graph:
    """Convert a dictionary to a Graph.

    Handles both the new format and legacy "diagram" format with
    "interfaces" instead of "ports".

    Args:
        data: Dictionary representation of the graph.

    Returns:
        Constructed Graph instance.
    """
    graph = Graph(
        id=data.get("id", ""),
        name=data.get("name", "Untitled Diagram"),
        schema=data.get("schema", "system-blocks-v2"),
        metadata=data.get("metadata", {}),
    )

    # Parse blocks
    for block_data in data.get("blocks", []):
        block = _parse_block(block_data)
        graph.add_block(block)

    # Parse connections
    for conn_data in data.get("connections", []):
        conn = _parse_connection(conn_data)
        graph.add_connection(conn)

    # Parse requirements (Milestone 18)
    for req_data in data.get("requirements", []):
        graph.requirements.append(_parse_requirement(req_data))

    # Parse groups
    for group_data in data.get("groups", []):
        graph.groups.append(_parse_group(group_data))

    return graph


def _parse_block(data: dict[str, Any]) -> Block:
    """Parse a block from dictionary data.

    Args:
        data: Block dictionary data.

    Returns:
        Constructed Block instance.
    """
    # Parse status
    status_str = data.get("status", "Placeholder")
    try:
        status = BlockStatus(status_str)
    except ValueError:
        status = BlockStatus.PLACEHOLDER

    block = Block(
        id=data.get("id", ""),
        name=data.get("name", ""),
        block_type=data.get("type", data.get("block_type", "Generic")),
        x=data.get("x", 0),
        y=data.get("y", 0),
        status=status,
        attributes=data.get("attributes", {}),
        links=data.get("links", []),
        child_diagram_id=data.get("childDiagramId"),
    )

    # Parse ports from "interfaces" (legacy) or "ports"
    interfaces = data.get("interfaces", data.get("ports", []))
    for iface_data in interfaces:
        port = _parse_port(iface_data, block.id)
        block.add_port(port)

    return block


def _parse_port(data: dict[str, Any], block_id: str) -> Port:
    """Parse a port from dictionary data.

    Args:
        data: Port/interface dictionary data.
        block_id: ID of the parent block.

    Returns:
        Constructed Port instance.
    """
    # Parse direction
    direction_str = data.get("direction", "bidirectional")
    try:
        direction = PortDirection(direction_str)
    except ValueError:
        direction = PortDirection.BIDIRECTIONAL

    # Parse kind
    kind_str = data.get("kind", data.get("type", "generic"))
    try:
        kind = PortKind(kind_str)
    except ValueError:
        kind = PortKind.GENERIC

    # Parse port position from nested "port" object or top-level
    port_pos = data.get("port", {})
    side = port_pos.get("side", data.get("side", "right"))
    index = port_pos.get("index", data.get("index", 0))

    return Port(
        id=data.get("id", ""),
        name=data.get("name", ""),
        direction=direction,
        kind=kind,
        side=side,
        index=index,
        params=data.get("params", {}),
        block_id=block_id,
    )


def _parse_connection(data: dict[str, Any]) -> Connection:
    """Parse a connection from dictionary data.

    Args:
        data: Connection dictionary data.

    Returns:
        Constructed Connection instance.
    """
    # Handle multiple connection formats produced by the JS front-end
    # and the Python core library:
    #   1. Nested:  { from: { blockId, interfaceId }, to: { ... } }
    #   2. Flat:    { from_block_id, to_block_id, ... }
    #   3. JS-flat: { fromBlock, toBlock }             (diagram-editor.js)
    from_data = data.get("from", {})
    to_data = data.get("to", {})

    if isinstance(from_data, dict) and from_data:
        from_block_id = from_data.get("blockId", "")
        from_port_id = from_data.get("interfaceId")
    elif data.get("fromBlock"):
        # JS diagram-editor format: { fromBlock, toBlock }
        from_block_id = data["fromBlock"]
        from_port_id = data.get("fromPort")
    else:
        from_block_id = data.get("from_block_id", "")
        from_port_id = data.get("from_port_id")

    if isinstance(to_data, dict) and to_data:
        to_block_id = to_data.get("blockId", "")
        to_port_id = to_data.get("interfaceId")
    elif data.get("toBlock"):
        to_block_id = data["toBlock"]
        to_port_id = data.get("toPort")
    else:
        to_block_id = data.get("to_block_id", "")
        to_port_id = data.get("to_port_id")

    return Connection(
        id=data.get("id", ""),
        from_block_id=from_block_id,
        from_port_id=from_port_id,
        to_block_id=to_block_id,
        to_port_id=to_port_id,
        kind=data.get("kind", data.get("type", data.get("protocol", "data"))),
        attributes={
            **data.get("attributes", {}),
            **(
                {"arrowDirection": data["arrowDirection"]}
                if data.get("arrowDirection")
                else {}
            ),
            **(
                {"renderAsStub": data["renderAsStub"]}
                if data.get("renderAsStub")
                else {}
            ),
        },
    )


def convert_legacy_diagram(diagram: dict[str, Any]) -> Graph:
    """Convert a legacy diagram dictionary to a Graph.

    Convenience wrapper around dict_to_graph for explicit legacy conversion.

    Args:
        diagram: Legacy diagram dictionary.

    Returns:
        Constructed Graph instance.
    """
    return dict_to_graph(diagram)


def export_to_legacy_format(graph: Graph) -> dict[str, Any]:
    """Export a Graph to legacy dictionary format.

    Convenience wrapper around graph_to_dict for explicit legacy export.

    Args:
        graph: The Graph to export.

    Returns:
        Legacy-compatible dictionary.
    """
    return graph_to_dict(graph)


# ------------------------------------------------------------------
# Requirement helpers
# ------------------------------------------------------------------


def _requirement_to_dict(req: Requirement) -> dict[str, Any]:
    """Serialize a Requirement to dictionary.

    Args:
        req: The requirement to serialize.

    Returns:
        Dictionary representation.
    """
    return {
        "id": req.id,
        "name": req.name,
        "targetValue": req.target_value,
        "operator": req.operator.value,
        "unit": req.unit,
        "linkedAttribute": req.linked_attribute,
        "tolerance": req.tolerance,
    }


def _parse_requirement(data: dict[str, Any]) -> Requirement:
    """Parse a Requirement from dictionary data.

    Args:
        data: Requirement dictionary.

    Returns:
        Constructed Requirement instance.
    """
    op_str = data.get("operator", "<=")
    try:
        operator = ComparisonOperator(op_str)
    except ValueError:
        operator = ComparisonOperator.LE

    return Requirement(
        id=data.get("id", ""),
        name=data.get("name", ""),
        target_value=float(data.get("targetValue", 0.0)),
        operator=operator,
        unit=data.get("unit", ""),
        linked_attribute=data.get(
            "linkedAttribute",
            data.get("linked_attribute", ""),
        ),
        tolerance=float(data.get("tolerance", 1e-9)),
    )


# ------------------------------------------------------------------
# Group helpers
# ------------------------------------------------------------------


def _group_to_dict(group: Group) -> dict[str, Any]:
    """Serialize a Group to dictionary.

    Args:
        group: The group to serialize.

    Returns:
        Dictionary representation.
    """
    result: dict[str, Any] = {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "blockIds": group.block_ids,
        "metadata": group.metadata,
    }
    if group.parent_group_id is not None:
        result["parentGroupId"] = group.parent_group_id
    return result


def _parse_group(data: dict[str, Any]) -> Group:
    """Parse a Group from dictionary data.

    Args:
        data: Group dictionary.

    Returns:
        Constructed Group instance.
    """
    return Group(
        id=data.get("id", ""),
        name=data.get("name", ""),
        description=data.get("description", ""),
        block_ids=data.get(
            "blockIds",
            data.get("block_ids", []),
        ),
        metadata=data.get("metadata", {}),
        parent_group_id=data.get(
            "parentGroupId",
            data.get("parent_group_id"),
        ),
    )
