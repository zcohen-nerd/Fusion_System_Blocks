"""Core library for System Blocks.

This module contains pure Python business logic with NO Fusion 360 dependencies.
All code here is testable with pytest outside of Fusion 360.

Modules:
    models: Dataclasses for Block, Port, Connection, Graph
    validation: Graph validation with structured error reporting
    action_plan: Action plan builder for Fusion layer operations
    graph_builder: Utilities for constructing and manipulating graphs
    serialization: JSON serialization/deserialization

Usage:
    from core.models import Block, Port, Connection, Graph
    from core.validation import validate_graph
    from core.action_plan import build_action_plan

Note:
    This module intentionally has NO imports from 'adsk' or any Fusion 360
    libraries. All Fusion-specific code belongs in the fusion_addin layer.
"""

from core.models import (
    Block,
    Port,
    Connection,
    Graph,
    PortDirection,
    PortKind,
    BlockStatus,
)
from core.validation import (
    validate_graph,
    ValidationError,
    ValidationErrorCode,
)
from core.action_plan import (
    build_action_plan,
    ActionPlan,
    ActionType,
)
from core.graph_builder import (
    GraphBuilder,
)
from core.serialization import (
    serialize_graph,
    deserialize_graph,
)

__all__ = [
    # Models
    "Block",
    "Port",
    "Connection",
    "Graph",
    "PortDirection",
    "PortKind",
    "BlockStatus",
    # Validation
    "validate_graph",
    "ValidationError",
    "ValidationErrorCode",
    # Action Plan
    "build_action_plan",
    "ActionPlan",
    "ActionType",
    # Graph Builder
    "GraphBuilder",
    # Serialization
    "serialize_graph",
    "deserialize_graph",
]
