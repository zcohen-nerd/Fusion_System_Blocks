"""Requirements validation engine for System Blocks.

This module evaluates system-level requirements (budgets, constraints)
against the current state of a Graph.  Each requirement references a
block attribute (e.g. ``"mass"``) and defines a threshold + comparison
operator.  The engine aggregates values across all blocks and produces
a pass/fail result for every requirement.

BOUNDARY: This module contains NO Fusion 360 dependencies.

Functions:
    validate_requirements: Evaluate all requirements on a graph.
    aggregate_attribute: Sum a named attribute across graph blocks.

Classes:
    RequirementResult: Outcome of a single requirement check.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .models import Graph


@dataclass
class RequirementResult:
    """Outcome of evaluating one Requirement against graph data.

    Attributes:
        requirement_id: The evaluated requirement's ID.
        requirement_name: Human-readable label for display.
        passed: Whether the requirement was satisfied.
        target_value: The threshold defined by the requirement.
        actual_value: The value computed from graph blocks.
        delta: ``actual_value - target_value`` (positive = over budget).
        operator: The comparison operator used.
        unit: Engineering unit string.
        contributing_blocks: Block IDs that contributed a value.
    """

    requirement_id: str = ""
    requirement_name: str = ""
    passed: bool = False
    target_value: float = 0.0
    actual_value: float = 0.0
    delta: float = 0.0
    operator: str = ""
    unit: str = ""
    contributing_blocks: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dictionary for JSON transport.

        Returns:
            Dictionary representation suitable for the JS bridge.
        """
        return {
            "requirementId": self.requirement_id,
            "requirementName": self.requirement_name,
            "passed": self.passed,
            "targetValue": self.target_value,
            "actualValue": self.actual_value,
            "delta": self.delta,
            "operator": self.operator,
            "unit": self.unit,
            "contributingBlocks": self.contributing_blocks,
        }


# ------------------------------------------------------------------
# Public API
# ------------------------------------------------------------------


def aggregate_attribute(
    graph: Graph,
    attribute_key: str,
) -> tuple[float, list[str]]:
    """Sum a named numeric attribute across all blocks in *graph*.

    Non-numeric or missing values are silently skipped.

    Args:
        graph: The graph whose blocks to inspect.
        attribute_key: The ``block.attributes`` key to sum.

    Returns:
        A tuple of ``(total, contributing_block_ids)`` where
        *contributing_block_ids* lists every block that had
        a numeric value for the attribute.
    """
    total = 0.0
    contributors: list[str] = []
    for block in graph.blocks:
        raw = block.attributes.get(attribute_key)
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        total += value
        contributors.append(block.id)
    return total, contributors


def validate_requirements(
    graph: Graph,
) -> list[RequirementResult]:
    """Evaluate every requirement attached to *graph*.

    For each :class:`~fsb_core.models.Requirement` the engine:

    1. Aggregates ``linked_attribute`` across all blocks.
    2. Compares the total against ``target_value`` using ``operator``.
    3. Records the pass/fail state, actual value, and delta.

    Args:
        graph: The graph containing both blocks and requirements.

    Returns:
        A list of :class:`RequirementResult`, one per requirement,
        in the same order as ``graph.requirements``.
    """
    results: list[RequirementResult] = []
    for req in graph.requirements:
        actual, contributors = aggregate_attribute(
            graph,
            req.linked_attribute,
        )
        passed = req.check(actual)
        results.append(
            RequirementResult(
                requirement_id=req.id,
                requirement_name=req.name,
                passed=passed,
                target_value=req.target_value,
                actual_value=actual,
                delta=actual - req.target_value,
                operator=req.operator.value,
                unit=req.unit,
                contributing_blocks=contributors,
            ),
        )
    return results
