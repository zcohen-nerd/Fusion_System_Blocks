"""Tests for Milestone 18 — Requirement models and validation engine.

Covers ComparisonOperator, Requirement.check(), aggregate_attribute(),
validate_requirements(), and the Snapshot / DiffResult data models.
"""

from __future__ import annotations

import pytest

from fsb_core.models import (
    Block,
    ComparisonOperator,
    ConnectionChange,
    DiffResult,
    Graph,
    Requirement,
    Snapshot,
    block_fingerprint,
)
from fsb_core.requirements import (
    RequirementResult,
    aggregate_attribute,
    validate_requirements,
)

# =========================================================================
# Helper factories
# =========================================================================


def _block(
    bid: str = "b1",
    name: str = "Block-1",
    **attrs: float,
) -> Block:
    """Create a minimal block with given attributes."""
    return Block(id=bid, name=name, attributes=dict(attrs))


def _graph_with_mass_blocks() -> Graph:
    """Create a graph with three blocks carrying mass values."""
    g = Graph(name="Mass Test")
    g.add_block(_block("b1", "Motor", mass=2.5))
    g.add_block(_block("b2", "Frame", mass=1.0))
    g.add_block(_block("b3", "PCB", mass=0.3))
    return g


# =========================================================================
# ComparisonOperator enum
# =========================================================================
class TestComparisonOperator:
    """Test the ComparisonOperator enum values."""

    def test_le_value(self) -> None:
        assert ComparisonOperator.LE.value == "<="

    def test_ge_value(self) -> None:
        assert ComparisonOperator.GE.value == ">="

    def test_eq_value(self) -> None:
        assert ComparisonOperator.EQ.value == "=="

    def test_from_string(self) -> None:
        assert ComparisonOperator("<=") is ComparisonOperator.LE


# =========================================================================
# Requirement dataclass
# =========================================================================
class TestRequirement:
    """Test Requirement construction and check() method."""

    def test_default_fields(self) -> None:
        r = Requirement()
        assert r.name == ""
        assert r.target_value == 0.0
        assert r.operator is ComparisonOperator.LE
        assert r.unit == ""
        assert r.linked_attribute == ""
        assert r.tolerance == pytest.approx(1e-9)

    def test_operator_string_coercion(self) -> None:
        r = Requirement(operator=">=")  # type: ignore[arg-type]
        assert r.operator is ComparisonOperator.GE

    # -- check() LE -------------------------------------------------------
    def test_check_le_pass(self) -> None:
        r = Requirement(target_value=5.0, operator=ComparisonOperator.LE)
        assert r.check(4.0) is True

    def test_check_le_equal(self) -> None:
        r = Requirement(target_value=5.0, operator=ComparisonOperator.LE)
        assert r.check(5.0) is True

    def test_check_le_fail(self) -> None:
        r = Requirement(target_value=5.0, operator=ComparisonOperator.LE)
        assert r.check(5.01) is False

    # -- check() GE -------------------------------------------------------
    def test_check_ge_pass(self) -> None:
        r = Requirement(target_value=3.0, operator=ComparisonOperator.GE)
        assert r.check(4.0) is True

    def test_check_ge_equal(self) -> None:
        r = Requirement(target_value=3.0, operator=ComparisonOperator.GE)
        assert r.check(3.0) is True

    def test_check_ge_fail(self) -> None:
        r = Requirement(target_value=3.0, operator=ComparisonOperator.GE)
        assert r.check(2.99) is False

    # -- check() EQ -------------------------------------------------------
    def test_check_eq_pass_exact(self) -> None:
        r = Requirement(target_value=3.3, operator=ComparisonOperator.EQ)
        assert r.check(3.3) is True

    def test_check_eq_pass_within_tolerance(self) -> None:
        r = Requirement(
            target_value=3.3,
            operator=ComparisonOperator.EQ,
            tolerance=0.1,
        )
        assert r.check(3.35) is True

    def test_check_eq_fail_outside_tolerance(self) -> None:
        r = Requirement(
            target_value=3.3,
            operator=ComparisonOperator.EQ,
            tolerance=0.01,
        )
        assert r.check(3.5) is False


# =========================================================================
# Snapshot dataclass
# =========================================================================
class TestSnapshot:
    """Test Snapshot construction and defaults."""

    def test_default_id_generated(self) -> None:
        s = Snapshot()
        assert len(s.id) > 0

    def test_timestamp_populated(self) -> None:
        s = Snapshot()
        assert "T" in s.timestamp  # ISO-8601

    def test_custom_fields(self) -> None:
        s = Snapshot(
            author="Alice",
            description="Initial capture",
            graph_json='{"blocks":[]}',
        )
        assert s.author == "Alice"
        assert s.description == "Initial capture"
        assert s.graph_json == '{"blocks":[]}'


# =========================================================================
# ConnectionChange / DiffResult
# =========================================================================
class TestDiffResultModel:
    """Test DiffResult and ConnectionChange default construction."""

    def test_diff_result_empty(self) -> None:
        d = DiffResult()
        assert d.added_block_ids == []
        assert d.removed_block_ids == []
        assert d.modified_block_ids == []
        assert d.connection_changes == []

    def test_connection_change_fields(self) -> None:
        cc = ConnectionChange(
            connection_id="c1",
            change_type="added",
            details={"kind": "power"},
        )
        assert cc.connection_id == "c1"
        assert cc.change_type == "added"


# =========================================================================
# block_fingerprint
# =========================================================================
class TestBlockFingerprint:
    """Test the deterministic block hashing helper."""

    def test_same_block_same_hash(self) -> None:
        b = _block("b1", "Motor", mass=1.0)
        assert block_fingerprint(b) == block_fingerprint(b)

    def test_different_name_different_hash(self) -> None:
        b1 = _block("b1", "Motor", mass=1.0)
        b2 = _block("b1", "Servo", mass=1.0)
        assert block_fingerprint(b1) != block_fingerprint(b2)

    def test_different_attribute_different_hash(self) -> None:
        b1 = _block("b1", "Motor", mass=1.0)
        b2 = _block("b1", "Motor", mass=2.0)
        assert block_fingerprint(b1) != block_fingerprint(b2)

    def test_returns_16_char_hex(self) -> None:
        fp = block_fingerprint(_block())
        assert len(fp) == 16
        int(fp, 16)  # must be valid hex


# =========================================================================
# aggregate_attribute
# =========================================================================
class TestAggregateAttribute:
    """Test attribute aggregation across graph blocks."""

    def test_sum_mass(self) -> None:
        g = _graph_with_mass_blocks()
        total, ids = aggregate_attribute(g, "mass")
        assert total == pytest.approx(3.8)
        assert set(ids) == {"b1", "b2", "b3"}

    def test_missing_attribute_skipped(self) -> None:
        g = Graph()
        g.add_block(_block("b1", "A", mass=1.0))
        g.add_block(Block(id="b2", name="B"))  # no mass
        total, ids = aggregate_attribute(g, "mass")
        assert total == pytest.approx(1.0)
        assert ids == ["b1"]

    def test_non_numeric_attribute_skipped(self) -> None:
        g = Graph()
        b = Block(id="b1", name="A", attributes={"mass": "heavy"})
        g.add_block(b)
        total, ids = aggregate_attribute(g, "mass")
        assert total == 0.0
        assert ids == []

    def test_empty_graph(self) -> None:
        total, ids = aggregate_attribute(Graph(), "mass")
        assert total == 0.0
        assert ids == []

    def test_string_numeric_coerced(self) -> None:
        """String values that look like numbers are coerced."""
        g = Graph()
        g.add_block(Block(id="b1", attributes={"mass": "2.5"}))
        total, ids = aggregate_attribute(g, "mass")
        assert total == pytest.approx(2.5)
        assert ids == ["b1"]


# =========================================================================
# validate_requirements (integration)
# =========================================================================
class TestValidateRequirements:
    """Test full requirement validation pipeline."""

    def test_le_pass(self) -> None:
        g = _graph_with_mass_blocks()  # total mass = 3.8
        g.requirements.append(
            Requirement(
                id="r1",
                name="Max Weight",
                target_value=5.0,
                operator=ComparisonOperator.LE,
                unit="kg",
                linked_attribute="mass",
            ),
        )
        results = validate_requirements(g)
        assert len(results) == 1
        assert results[0].passed is True
        assert results[0].actual_value == pytest.approx(3.8)
        assert results[0].delta == pytest.approx(-1.2)

    def test_le_fail(self) -> None:
        g = _graph_with_mass_blocks()  # 3.8 kg
        g.requirements.append(
            Requirement(
                id="r1",
                name="Max Weight",
                target_value=3.0,
                operator=ComparisonOperator.LE,
                unit="kg",
                linked_attribute="mass",
            ),
        )
        results = validate_requirements(g)
        assert results[0].passed is False
        assert results[0].delta == pytest.approx(0.8)

    def test_ge_pass(self) -> None:
        g = _graph_with_mass_blocks()
        g.requirements.append(
            Requirement(
                id="r2",
                name="Min Mass",
                target_value=3.0,
                operator=ComparisonOperator.GE,
                unit="kg",
                linked_attribute="mass",
            ),
        )
        results = validate_requirements(g)
        assert results[0].passed is True

    def test_eq_pass(self) -> None:
        g = Graph()
        g.add_block(_block("b1", "A", voltage=3.3))
        g.requirements.append(
            Requirement(
                id="r3",
                name="Bus Voltage",
                target_value=3.3,
                operator=ComparisonOperator.EQ,
                unit="V",
                linked_attribute="voltage",
                tolerance=0.01,
            ),
        )
        results = validate_requirements(g)
        assert results[0].passed is True

    def test_multiple_requirements(self) -> None:
        g = _graph_with_mass_blocks()
        g.requirements = [
            Requirement(
                id="r1",
                name="Max Weight",
                target_value=5.0,
                operator=ComparisonOperator.LE,
                unit="kg",
                linked_attribute="mass",
            ),
            Requirement(
                id="r2",
                name="Min Weight",
                target_value=10.0,
                operator=ComparisonOperator.GE,
                unit="kg",
                linked_attribute="mass",
            ),
        ]
        results = validate_requirements(g)
        assert len(results) == 2
        assert results[0].passed is True   # 3.8 <= 5
        assert results[1].passed is False  # 3.8 >= 10

    def test_no_requirements_returns_empty(self) -> None:
        g = _graph_with_mass_blocks()
        assert validate_requirements(g) == []

    def test_contributing_blocks_tracked(self) -> None:
        g = _graph_with_mass_blocks()
        g.requirements.append(
            Requirement(
                id="r1",
                name="Weight",
                target_value=10.0,
                operator=ComparisonOperator.LE,
                linked_attribute="mass",
            ),
        )
        results = validate_requirements(g)
        assert set(results[0].contributing_blocks) == {"b1", "b2", "b3"}

    def test_result_to_dict(self) -> None:
        result = RequirementResult(
            requirement_id="r1",
            requirement_name="Max Weight",
            passed=True,
            target_value=5.0,
            actual_value=3.8,
            delta=-1.2,
            operator="<=",
            unit="kg",
            contributing_blocks=["b1", "b2"],
        )
        d = result.to_dict()
        assert d["requirementId"] == "r1"
        assert d["passed"] is True
        assert d["delta"] == pytest.approx(-1.2)
        assert d["contributingBlocks"] == ["b1", "b2"]


# =========================================================================
# Serialization round-trip for requirements
# =========================================================================
class TestRequirementSerialization:
    """Verify requirements survive serialize → deserialize."""

    def test_round_trip(self) -> None:
        from fsb_core.serialization import deserialize_graph, serialize_graph

        g = Graph(name="Req Test")
        g.add_block(_block("b1", "Motor", mass=2.5))
        g.requirements.append(
            Requirement(
                id="r1",
                name="Max Weight",
                target_value=5.0,
                operator=ComparisonOperator.LE,
                unit="kg",
                linked_attribute="mass",
            ),
        )
        json_str = serialize_graph(g)
        g2 = deserialize_graph(json_str)
        assert len(g2.requirements) == 1
        r = g2.requirements[0]
        assert r.id == "r1"
        assert r.name == "Max Weight"
        assert r.target_value == 5.0
        assert r.operator is ComparisonOperator.LE
        assert r.unit == "kg"
        assert r.linked_attribute == "mass"

    def test_empty_requirements_round_trip(self) -> None:
        from fsb_core.serialization import deserialize_graph, serialize_graph

        g = Graph(name="No Reqs")
        json_str = serialize_graph(g)
        g2 = deserialize_graph(json_str)
        assert g2.requirements == []
