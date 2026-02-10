"""Diagnostics module for self-testing the Fusion System Blocks add-in.

This module provides a DiagnosticsRunner class that executes a suite of
self-tests to verify the add-in environment, core logic, and Fusion
integration are working correctly.

USAGE IN FUSION:
    After installing the add-in, click "Run Diagnostics" in the Add-Ins panel.
    A message box will display pass/fail summary with log file location.

ADDING NEW DIAGNOSTIC TESTS:
    1. Create a method in DiagnosticsRunner with signature:
       def test_<name>(self) -> DiagnosticResult
    2. The method must return DiagnosticResult(passed, message, details)
    3. Use try/except to catch all exceptions - tests should never crash
    4. Add cleanup logic in try/finally if the test creates resources
    5. The test is automatically discovered by the runner

Example test:
    def test_example_feature(self) -> DiagnosticResult:
        '''Verify example feature works correctly.'''
        try:
            result = some_function()
            if result == expected:
                return DiagnosticResult(True, "Feature works", {"value": result})
            return DiagnosticResult(False, "Unexpected value", {"got": result})
        except Exception as e:
            return DiagnosticResult(False, f"Exception: {e}", {"error": str(e)})
"""

from __future__ import annotations

import json
import time
import traceback
from dataclasses import dataclass, field
from typing import Any, Callable

# Try to import logging utilities
try:
    from fusion_addin.logging_util import get_log_file_path_str, get_logger

    _logger = get_logger("diagnostics")
    LOGGING_AVAILABLE = True
except ImportError:
    LOGGING_AVAILABLE = False
    _logger = None


def _log_info(message: str) -> None:
    """Log info message if logging is available."""
    if LOGGING_AVAILABLE and _logger:
        _logger.info(message)


def _log_debug(message: str) -> None:
    """Log debug message if logging is available."""
    if LOGGING_AVAILABLE and _logger:
        _logger.debug(message)


def _log_error(message: str) -> None:
    """Log error message if logging is available."""
    if LOGGING_AVAILABLE and _logger:
        _logger.error(message)


@dataclass
class DiagnosticResult:
    """Result of a single diagnostic test.

    Attributes:
        passed: Whether the test passed.
        message: Human-readable summary of the result.
        details: Additional structured data about the test.
        duration_ms: Time taken to run the test in milliseconds.
    """

    passed: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "passed": self.passed,
            "message": self.message,
            "details": self.details,
            "duration_ms": round(self.duration_ms, 2),
        }


@dataclass
class DiagnosticsReport:
    """Complete report from running all diagnostic tests.

    Attributes:
        tests: Dictionary of test name -> DiagnosticResult.
        total_passed: Number of tests that passed.
        total_failed: Number of tests that failed.
        total_duration_ms: Total time for all tests in milliseconds.
        overall_passed: Whether all tests passed.
    """

    tests: dict[str, DiagnosticResult] = field(default_factory=dict)
    total_passed: int = 0
    total_failed: int = 0
    total_duration_ms: float = 0.0
    overall_passed: bool = False

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "overall_passed": self.overall_passed,
            "total_passed": self.total_passed,
            "total_failed": self.total_failed,
            "total_duration_ms": round(self.total_duration_ms, 2),
            "tests": {name: result.to_dict() for name, result in self.tests.items()},
        }

    def to_summary_string(self) -> str:
        """Generate a compact summary string for message box display."""
        status = "PASS" if self.overall_passed else "FAIL"
        lines = [
            f"Diagnostics: {status}",
            "",
            f"Tests passed: {self.total_passed}",
            f"Tests failed: {self.total_failed}",
            f"Duration: {round(self.total_duration_ms, 0):.0f} ms",
        ]

        if not self.overall_passed:
            lines.append("")
            lines.append("Failed tests:")
            for name, result in self.tests.items():
                if not result.passed:
                    lines.append(f"  - {name}: {result.message}")

        return "\n".join(lines)


class DiagnosticsRunner:
    """Runs diagnostic tests and aggregates results.

    This class automatically discovers test methods (those starting with
    'test_') and executes them, collecting results and timing information.

    Usage:
        runner = DiagnosticsRunner()
        report = runner.run_all()
        print(report.to_summary_string())
    """

    # Temporary object name prefix for cleanup identification
    TEMP_PREFIX = "__SystemBlocks_Diag__"

    def __init__(self) -> None:
        """Initialize the diagnostics runner."""
        self._app: Any | None = None
        self._ui: Any | None = None
        self._design: Any | None = None

    def _get_test_methods(self) -> list[tuple[str, Callable[[], DiagnosticResult]]]:
        """Discover all test methods in this class.

        Returns:
            List of (test_name, test_method) tuples.
        """
        tests = []
        for name in dir(self):
            if name.startswith("test_"):
                method = getattr(self, name)
                if callable(method):
                    # Extract clean name from method name
                    clean_name = name[5:]  # Remove 'test_' prefix
                    tests.append((clean_name, method))
        return sorted(tests, key=lambda x: x[0])

    def run_all(self) -> DiagnosticsReport:
        """Run all diagnostic tests and return a complete report.

        Returns:
            DiagnosticsReport with all test results.
        """
        _log_info("=" * 60)
        _log_info("DIAGNOSTICS RUN STARTED")
        _log_info("=" * 60)

        report = DiagnosticsReport()
        tests = self._get_test_methods()

        _log_info(f"Found {len(tests)} diagnostic tests")

        overall_start = time.perf_counter()

        for test_name, test_method in tests:
            _log_debug(f"Running test: {test_name}")

            start_time = time.perf_counter()
            try:
                result = test_method()
            except Exception as e:
                # Catch any uncaught exceptions from tests
                result = DiagnosticResult(
                    passed=False,
                    message=f"Test crashed: {str(e)}",
                    details={"exception": str(e), "traceback": traceback.format_exc()},
                )
            end_time = time.perf_counter()

            result.duration_ms = (end_time - start_time) * 1000
            report.tests[test_name] = result

            if result.passed:
                report.total_passed += 1
                _log_debug(f"  PASSED: {result.message} ({result.duration_ms:.1f}ms)")
            else:
                report.total_failed += 1
                _log_error(f"  FAILED: {result.message} ({result.duration_ms:.1f}ms)")

        overall_end = time.perf_counter()
        report.total_duration_ms = (overall_end - overall_start) * 1000
        report.overall_passed = report.total_failed == 0

        # Log the complete report
        _log_info("=" * 60)
        _log_info("DIAGNOSTICS RUN COMPLETED")
        _log_info(f"Overall: {'PASS' if report.overall_passed else 'FAIL'}")
        _log_info(f"Passed: {report.total_passed}, Failed: {report.total_failed}")
        _log_info(f"Total duration: {report.total_duration_ms:.1f}ms")
        _log_info("=" * 60)

        # Log detailed JSON report
        _log_debug("Full diagnostics report:")
        _log_debug(json.dumps(report.to_dict(), indent=2, default=str))

        return report

    # =========================================================================
    # ENVIRONMENT CHECKS
    # =========================================================================

    def test_env_adsk_modules_loaded(self) -> DiagnosticResult:
        """Verify that adsk modules are loaded and accessible."""
        try:
            import adsk.core
            import adsk.fusion

            # Verify we can get the application instance
            app = adsk.core.Application.get()
            if app is None:
                return DiagnosticResult(
                    passed=False,
                    message="adsk.core.Application.get() returned None",
                    details={"adsk_core": True, "adsk_fusion": True, "app": False},
                )

            # Cache for other tests
            self._app = app
            self._ui = app.userInterface

            return DiagnosticResult(
                passed=True,
                message="adsk modules loaded and Application accessible",
                details={
                    "adsk_core": True,
                    "adsk_fusion": True,
                    "app_version": app.version,
                },
            )
        except ImportError as e:
            return DiagnosticResult(
                passed=False,
                message=f"Failed to import adsk modules: {e}",
                details={"error": str(e)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error accessing adsk: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    def test_env_active_document(self) -> DiagnosticResult:
        """Verify that an active document and design exist."""
        try:
            import adsk.core
            import adsk.fusion

            app = self._app or adsk.core.Application.get()
            if app is None:
                return DiagnosticResult(
                    passed=False,
                    message="Application not available",
                    details={},
                )

            # Check for active document
            doc = app.activeDocument
            if doc is None:
                return DiagnosticResult(
                    passed=False,
                    message="No active document - open a design first",
                    details={"active_document": False},
                )

            # Check for active product (design)
            product = app.activeProduct
            if product is None:
                return DiagnosticResult(
                    passed=False,
                    message="No active product",
                    details={"active_document": True, "active_product": False},
                )

            # Check if it's a Fusion design
            design = adsk.fusion.Design.cast(product)
            if design is None:
                return DiagnosticResult(
                    passed=False,
                    message="Active product is not a Fusion design",
                    details={
                        "active_document": True,
                        "active_product": True,
                        "is_design": False,
                        "product_type": type(product).__name__,
                    },
                )

            # Cache for other tests
            self._design = design

            return DiagnosticResult(
                passed=True,
                message=f"Active design: {doc.name}",
                details={
                    "document_name": doc.name,
                    "design_type": str(design.designType),
                    "root_component": design.rootComponent.name,
                },
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error checking document: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # CORE LOGIC CHECKS
    # =========================================================================

    def test_core_valid_graph_validation(self) -> DiagnosticResult:
        """Construct a valid in-memory graph and verify validation passes."""
        try:
            # Try to import core library
            from core.models import Block, Connection, Graph, Port, PortDirection
            from core.validation import validate_graph

            # Create a minimal valid graph: 2 blocks, 1 connection
            block_a = Block(
                id="block_a",
                name="Sensor",
                block_type="electrical",
                x=100,
                y=100,
                ports=[
                    Port(
                        id="port_a_out",
                        name="signal_out",
                        direction=PortDirection.OUTPUT,
                    ),
                ],
            )

            block_b = Block(
                id="block_b",
                name="Controller",
                block_type="software",
                x=300,
                y=100,
                ports=[
                    Port(
                        id="port_b_in", name="signal_in", direction=PortDirection.INPUT
                    ),
                ],
            )

            connection = Connection(
                id="conn_1",
                from_block_id="block_a",
                from_port_id="port_a_out",
                to_block_id="block_b",
                to_port_id="port_b_in",
            )

            graph = Graph(
                blocks=[block_a, block_b],
                connections=[connection],
            )

            # Run validation
            errors = validate_graph(graph)

            if len(errors) == 0:
                return DiagnosticResult(
                    passed=True,
                    message="Valid graph produced zero validation errors",
                    details={
                        "blocks": 2,
                        "connections": 1,
                        "errors": 0,
                    },
                )
            else:
                return DiagnosticResult(
                    passed=False,
                    message=f"Valid graph produced {len(errors)} unexpected errors",
                    details={
                        "errors": [str(e) for e in errors],
                    },
                )

        except ImportError as e:
            return DiagnosticResult(
                passed=False,
                message=f"Core library not available: {e}",
                details={"import_error": str(e)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error during validation: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    def test_core_invalid_graph_detection(self) -> DiagnosticResult:
        """Verify that validation detects errors in an invalid graph."""
        try:
            from core.models import Block, Connection, Graph, Port, PortDirection
            from core.validation import validate_graph

            # Create an invalid graph: connection references non-existent block
            block_a = Block(
                id="block_a",
                name="Sensor",
                block_type="electrical",
                x=100,
                y=100,
                ports=[
                    Port(
                        id="port_a_out",
                        name="signal_out",
                        direction=PortDirection.OUTPUT,
                    ),
                ],
            )

            # Connection references a block that doesn't exist
            bad_connection = Connection(
                id="conn_bad",
                from_block_id="block_a",
                from_port_id="port_a_out",
                to_block_id="nonexistent_block",  # <-- Invalid reference
                to_port_id="port_x",
            )

            graph = Graph(
                blocks=[block_a],
                connections=[bad_connection],
            )

            # Run validation - should produce errors
            errors = validate_graph(graph)

            if len(errors) > 0:
                return DiagnosticResult(
                    passed=True,
                    message=f"Invalid graph correctly detected {len(errors)} error(s)",
                    details={
                        "expected_errors": True,
                        "error_count": len(errors),
                        "error_codes": [e.code.value for e in errors],
                    },
                )
            else:
                return DiagnosticResult(
                    passed=False,
                    message="Invalid graph was not detected - validation returned no errors",
                    details={"expected_errors": True, "actual_errors": 0},
                )

        except ImportError as e:
            return DiagnosticResult(
                passed=False,
                message=f"Core library not available: {e}",
                details={"import_error": str(e)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error during validation: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # FUSION WRITE ACCESS CHECKS
    # =========================================================================

    def test_fusion_create_temp_component(self) -> DiagnosticResult:
        """Create and delete a temporary component to verify write access."""
        temp_component = None
        try:
            import adsk.core
            import adsk.fusion

            app = self._app or adsk.core.Application.get()
            design = self._design or adsk.fusion.Design.cast(app.activeProduct)

            if design is None:
                return DiagnosticResult(
                    passed=False,
                    message="No active design available",
                    details={},
                )

            root_comp = design.rootComponent
            occurrences = root_comp.occurrences

            # Create a new component
            new_occ = occurrences.addNewComponent(adsk.core.Matrix3D.create())
            temp_component = new_occ.component
            temp_component.name = f"{self.TEMP_PREFIX}Component"

            # Verify it was created
            if temp_component is None:
                return DiagnosticResult(
                    passed=False,
                    message="Failed to create temporary component",
                    details={},
                )

            component_name = temp_component.name

            return DiagnosticResult(
                passed=True,
                message=f"Created and cleaned up component: {component_name}",
                details={
                    "component_name": component_name,
                    "write_access": True,
                },
            )

        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error creating component: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )
        finally:
            # CLEANUP: Always delete the temporary component
            if temp_component is not None:
                try:
                    import adsk.core
                    import adsk.fusion

                    # Find and delete the occurrence
                    app = self._app or adsk.core.Application.get()
                    design = self._design or adsk.fusion.Design.cast(app.activeProduct)
                    if design:
                        root_comp = design.rootComponent
                        for occ in root_comp.occurrences:
                            if occ.component and occ.component.name.startswith(
                                self.TEMP_PREFIX
                            ):
                                occ.deleteMe()
                                break
                except Exception as cleanup_error:
                    _log_error(f"Cleanup failed: {cleanup_error}")

    def test_fusion_create_temp_geometry(self) -> DiagnosticResult:
        """Create and delete temporary sketch geometry to verify document write."""
        temp_sketch = None
        try:
            import adsk.core
            import adsk.fusion

            app = self._app or adsk.core.Application.get()
            design = self._design or adsk.fusion.Design.cast(app.activeProduct)

            if design is None:
                return DiagnosticResult(
                    passed=False,
                    message="No active design available",
                    details={},
                )

            root_comp = design.rootComponent
            sketches = root_comp.sketches

            # Create a sketch on the XY plane
            xy_plane = root_comp.xYConstructionPlane
            temp_sketch = sketches.add(xy_plane)
            temp_sketch.name = f"{self.TEMP_PREFIX}Sketch"

            # Draw some construction geometry
            sketch_lines = temp_sketch.sketchCurves.sketchLines

            # Create a small rectangle (construction lines)
            point1 = adsk.core.Point3D.create(0, 0, 0)
            point2 = adsk.core.Point3D.create(1, 0, 0)
            point3 = adsk.core.Point3D.create(1, 1, 0)
            point4 = adsk.core.Point3D.create(0, 1, 0)

            line1 = sketch_lines.addByTwoPoints(point1, point2)
            line2 = sketch_lines.addByTwoPoints(point2, point3)
            line3 = sketch_lines.addByTwoPoints(point3, point4)
            line4 = sketch_lines.addByTwoPoints(point4, point1)

            # Mark as construction
            line1.isConstruction = True
            line2.isConstruction = True
            line3.isConstruction = True
            line4.isConstruction = True

            # Create a construction point
            sketch_points = temp_sketch.sketchPoints
            sketch_points.add(adsk.core.Point3D.create(0.5, 0.5, 0))

            geometry_count = (
                temp_sketch.sketchCurves.count + temp_sketch.sketchPoints.count
            )

            return DiagnosticResult(
                passed=True,
                message=f"Created {geometry_count} geometry items, cleanup successful",
                details={
                    "sketch_name": temp_sketch.name,
                    "lines_created": 4,
                    "points_created": 1,
                    "total_geometry": geometry_count,
                },
            )

        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Error creating geometry: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )
        finally:
            # CLEANUP: Always delete the temporary sketch
            if temp_sketch is not None:
                try:
                    temp_sketch.deleteMe()
                except Exception as cleanup_error:
                    _log_error(f"Sketch cleanup failed: {cleanup_error}")

    # =========================================================================
    # SERIALIZATION & ACTION PLAN CHECKS
    # =========================================================================

    def test_core_serialization_roundtrip(self) -> DiagnosticResult:
        """Build a graph, serialize → deserialize, and verify equality."""
        try:
            from core.models import Block, Graph, Port, PortDirection
            from core.serialization import deserialize_graph, serialize_graph

            block = Block(
                id="diag_b1",
                name="DiagSensor",
                block_type="electrical",
                x=50,
                y=75,
                ports=[
                    Port(
                        id="diag_p1",
                        name="out",
                        direction=PortDirection.OUTPUT,
                    ),
                ],
            )
            graph = Graph(
                id="diag_graph",
                name="DiagTest",
                blocks=[block],
            )

            json_str = serialize_graph(graph)
            restored = deserialize_graph(json_str)

            checks = {
                "id_match": restored.id == graph.id,
                "name_match": restored.name == graph.name,
                "block_count": len(restored.blocks) == 1,
                "block_name": restored.blocks[0].name == "DiagSensor",
                "port_count": len(restored.blocks[0].ports) == 1,
            }

            if all(checks.values()):
                return DiagnosticResult(
                    passed=True,
                    message="Serialization round-trip verified",
                    details={"json_length": len(json_str), **checks},
                )
            else:
                failed = [k for k, v in checks.items() if not v]
                return DiagnosticResult(
                    passed=False,
                    message=f"Round-trip mismatches: {failed}",
                    details=checks,
                )

        except ImportError as e:
            return DiagnosticResult(
                passed=False,
                message=f"Core serialization not available: {e}",
                details={"import_error": str(e)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Serialization error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    def test_core_action_plan_generation(self) -> DiagnosticResult:
        """Build a graph and verify action plan generation succeeds."""
        try:
            from core.action_plan import ActionType, build_action_plan
            from core.models import Block, Graph

            block = Block(id="ap_b1", name="PlanTestBlock")
            graph = Graph(id="ap_graph", blocks=[block])

            actions = build_action_plan(graph)

            # Should have at least CREATE_BLOCK + SAVE_ATTRIBUTES
            action_types = [a.action_type for a in actions]

            has_create = ActionType.CREATE_BLOCK in action_types
            has_save = ActionType.SAVE_ATTRIBUTES in action_types

            if has_create and has_save:
                return DiagnosticResult(
                    passed=True,
                    message=f"Action plan generated {len(actions)} actions",
                    details={
                        "action_count": len(actions),
                        "types": [a.action_type.value for a in actions],
                    },
                )
            else:
                return DiagnosticResult(
                    passed=False,
                    message="Action plan missing expected action types",
                    details={
                        "has_create": has_create,
                        "has_save": has_save,
                        "types": [a.action_type.value for a in actions],
                    },
                )

        except ImportError as e:
            return DiagnosticResult(
                passed=False,
                message=f"Core action_plan not available: {e}",
                details={"import_error": str(e)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Action plan error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # LOGGING / FILESYSTEM CHECKS
    # =========================================================================

    def test_log_file_writable(self) -> DiagnosticResult:
        """Verify that the log directory exists and a test file is writable."""
        try:
            import os

            if not LOGGING_AVAILABLE:
                return DiagnosticResult(
                    passed=False,
                    message="Logging module not available",
                    details={},
                )

            log_path = get_log_file_path_str()
            log_dir = os.path.dirname(log_path)

            if not os.path.isdir(log_dir):
                return DiagnosticResult(
                    passed=False,
                    message=f"Log directory does not exist: {log_dir}",
                    details={"log_dir": log_dir},
                )

            # Try writing a probe file
            probe_path = os.path.join(log_dir, "__diag_probe__.tmp")
            try:
                with open(probe_path, "w", encoding="utf-8") as f:
                    f.write("diagnostics probe")
                os.remove(probe_path)
            except OSError as e:
                return DiagnosticResult(
                    passed=False,
                    message=f"Log directory not writable: {e}",
                    details={"log_dir": log_dir, "error": str(e)},
                )

            return DiagnosticResult(
                passed=True,
                message=f"Log directory writable: {log_dir}",
                details={"log_dir": log_dir, "log_file": log_path},
            )

        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Log check error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # FUSION ATTRIBUTE PERSISTENCE CHECK
    # =========================================================================

    def test_fusion_attribute_read_write(self) -> DiagnosticResult:
        """Write, read, and delete a test attribute to verify persistence."""
        attr_written = False
        try:
            import adsk.core
            import adsk.fusion

            app = self._app or adsk.core.Application.get()
            design = self._design or adsk.fusion.Design.cast(app.activeProduct)

            if design is None:
                return DiagnosticResult(
                    passed=False,
                    message="No active design available",
                    details={},
                )

            root_comp = design.rootComponent
            attrs = root_comp.attributes

            test_group = "__SystemBlocks_DiagAttr__"
            test_name = "probe"
            test_value = "diagnostics_ok"

            # Write
            attrs.add(test_group, test_name, test_value)
            attr_written = True

            # Read back
            attr = attrs.itemByName(test_group, test_name)
            if attr is None:
                return DiagnosticResult(
                    passed=False,
                    message="Attribute written but could not be read back",
                    details={},
                )

            read_value = attr.value
            if read_value != test_value:
                return DiagnosticResult(
                    passed=False,
                    message=f"Attribute value mismatch: wrote '{test_value}', read '{read_value}'",
                    details={"wrote": test_value, "read": read_value},
                )

            return DiagnosticResult(
                passed=True,
                message="Attribute write/read/delete cycle succeeded",
                details={"group": test_group, "name": test_name},
            )

        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Attribute persistence error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )
        finally:
            # CLEANUP: delete the test attribute
            if attr_written:
                try:
                    import adsk.core
                    import adsk.fusion

                    app = self._app or adsk.core.Application.get()
                    design = self._design or adsk.fusion.Design.cast(app.activeProduct)
                    if design:
                        attr = design.rootComponent.attributes.itemByName(
                            "__SystemBlocks_DiagAttr__", "probe"
                        )
                        if attr:
                            attr.deleteMe()
                except Exception:
                    pass

    # =========================================================================
    # RULE CHECKING
    # =========================================================================

    def test_core_rule_engine(self) -> DiagnosticResult:
        """Verify rule checking engine runs on a valid graph without errors."""
        try:
            from core.models import Block, Connection, Port, PortDirection
            from src.diagram.rules import run_all_rule_checks

            Block(
                id="rule_a",
                name="Controller",
                block_type="Software",
                ports=[Port(id="p_out", name="cmd", direction=PortDirection.OUTPUT)],
            )
            Block(
                id="rule_b",
                name="Actuator",
                block_type="Mechanical",
                ports=[Port(id="p_in", name="signal", direction=PortDirection.INPUT)],
            )
            Connection(
                id="rule_conn",
                from_block_id="rule_a",
                from_port_id="p_out",
                to_block_id="rule_b",
                to_port_id="p_in",
            )

            # run_all_rule_checks expects a raw dict, not a Graph dataclass
            diagram_dict = {
                "blocks": [
                    {
                        "id": "rule_a",
                        "name": "Controller",
                        "type": "Software",
                        "ports": [
                            {"id": "p_out", "name": "cmd", "direction": "output"}
                        ],
                    },
                    {
                        "id": "rule_b",
                        "name": "Actuator",
                        "type": "Mechanical",
                        "ports": [
                            {"id": "p_in", "name": "signal", "direction": "input"}
                        ],
                    },
                ],
                "connections": [
                    {
                        "id": "rule_conn",
                        "from": {"blockId": "rule_a", "portId": "p_out"},
                        "to": {"blockId": "rule_b", "portId": "p_in"},
                    },
                ],
            }

            results = run_all_rule_checks(diagram_dict)

            if not isinstance(results, list):
                return DiagnosticResult(
                    passed=False,
                    message=f"Expected list, got {type(results).__name__}",
                    details={"type": type(results).__name__},
                )

            return DiagnosticResult(
                passed=True,
                message=f"Rule engine returned {len(results)} results",
                details={"result_count": len(results)},
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Rule engine error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # HIERARCHY VALIDATION
    # =========================================================================

    def test_core_hierarchy_operations(self) -> DiagnosticResult:
        """Verify child diagram creation and hierarchy traversal."""
        try:
            from src.diagram.hierarchy import (
                create_child_diagram,
                find_block_path,
                get_child_diagram,
                has_child_diagram,
            )

            # hierarchy functions operate on raw dicts, not Graph model objects
            parent_block = {
                "id": "parent_1",
                "name": "Subsystem",
                "type": "Generic",
            }
            diagram = {
                "blocks": [parent_block],
                "connections": [],
            }

            # Create child diagram (takes a block dict)
            child = create_child_diagram(parent_block)
            if child is None:
                return DiagnosticResult(
                    passed=False,
                    message="create_child_diagram returned None",
                    details={},
                )

            # Verify parent has child (takes a block dict)
            if not has_child_diagram(parent_block):
                return DiagnosticResult(
                    passed=False,
                    message="has_child_diagram returned False after creation",
                    details={},
                )

            # Retrieve child (takes a block dict)
            retrieved = get_child_diagram(parent_block)
            if retrieved is None:
                return DiagnosticResult(
                    passed=False,
                    message="get_child_diagram returned None after creation",
                    details={},
                )

            # Find block path (takes a diagram dict + block id)
            path = find_block_path(diagram, "parent_1")

            return DiagnosticResult(
                passed=True,
                message="Hierarchy operations passed",
                details={
                    "child_created": True,
                    "has_child": True,
                    "path": path,
                },
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Hierarchy error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # TYPED CONNECTION ROUNDTRIP
    # =========================================================================

    def test_core_typed_connection_roundtrip(self) -> DiagnosticResult:
        """Verify typed connections survive serialization roundtrip."""
        try:
            from core.models import Block, Connection, Graph, Port, PortDirection
            from core.serialization import deserialize_graph, serialize_graph

            block_a = Block(
                id="tc_a",
                name="PSU",
                block_type="Electrical",
                ports=[Port(id="pwr_out", name="12V", direction=PortDirection.OUTPUT)],
            )
            block_b = Block(
                id="tc_b",
                name="Motor",
                block_type="Mechanical",
                ports=[Port(id="pwr_in", name="supply", direction=PortDirection.INPUT)],
            )
            conn = Connection(
                id="tc_conn",
                from_block_id="tc_a",
                from_port_id="pwr_out",
                to_block_id="tc_b",
                to_port_id="pwr_in",
                kind="power",
                attributes={"arrowDirection": "bidirectional"},
            )
            graph = Graph(blocks=[block_a, block_b], connections=[conn])

            serialized = serialize_graph(graph)
            restored = deserialize_graph(serialized)

            restored_conn = restored.connections[0] if restored.connections else None
            if restored_conn is None:
                return DiagnosticResult(
                    passed=False,
                    message="Connection lost during roundtrip",
                    details={},
                )

            kind_match = restored_conn.kind == "power"
            arrow_match = (
                restored_conn.attributes.get("arrowDirection") == "bidirectional"
            )

            if not kind_match or not arrow_match:
                return DiagnosticResult(
                    passed=False,
                    message=f"Type/direction mismatch: kind={restored_conn.kind}, arrow={restored_conn.attributes}",
                    details={
                        "kind": restored_conn.kind,
                        "attributes": restored_conn.attributes,
                    },
                )

            return DiagnosticResult(
                passed=True,
                message="Typed connection roundtrip succeeded",
                details={
                    "kind": restored_conn.kind,
                    "arrowDirection": restored_conn.attributes.get("arrowDirection"),
                },
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Typed connection roundtrip error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )

    # =========================================================================
    # PALETTE HTML INTEGRITY
    # =========================================================================

    def test_palette_html_integrity(self) -> DiagnosticResult:
        """Verify palette.html exists and contains key elements."""
        try:
            import os

            # Find palette.html relative to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            html_path = os.path.join(base_dir, "src", "palette.html")

            if not os.path.isfile(html_path):
                return DiagnosticResult(
                    passed=False,
                    message=f"palette.html not found at {html_path}",
                    details={"path": html_path},
                )

            with open(html_path, encoding="utf-8") as f:
                content = f.read()

            size_kb = len(content) / 1024
            required_markers = [
                "svg-canvas",
                "diagram-editor.js",
                "python-bridge.js",
                "toolbar-manager.js",
                "main-coordinator.js",
                "save-as-overlay",
                "open-doc-overlay",
            ]
            missing = [m for m in required_markers if m not in content]

            if missing:
                return DiagnosticResult(
                    passed=False,
                    message=f"palette.html missing {len(missing)} markers",
                    details={"missing": missing, "size_kb": round(size_kb, 1)},
                )

            return DiagnosticResult(
                passed=True,
                message=f"palette.html OK ({round(size_kb, 1)} KB, all markers present)",
                details={
                    "size_kb": round(size_kb, 1),
                    "marker_count": len(required_markers),
                },
            )
        except Exception as e:
            return DiagnosticResult(
                passed=False,
                message=f"Palette check error: {e}",
                details={"error": str(e), "traceback": traceback.format_exc()},
            )


def run_diagnostics_and_show_result() -> DiagnosticsReport:
    """Run all diagnostics and show result in a Fusion message box.

    Also writes a JSON report to the log directory for audit trails.

    Returns:
        The complete DiagnosticsReport.
    """
    import datetime
    import os

    _log_info("Starting diagnostics from UI command")

    runner = DiagnosticsRunner()
    report = runner.run_all()

    # ----- Write JSON report to log directory -----
    try:
        if LOGGING_AVAILABLE:
            log_dir = os.path.dirname(get_log_file_path_str())
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            report_path = os.path.join(log_dir, f"diagnostics_{ts}.json")
            with open(report_path, "w", encoding="utf-8") as fp:
                json.dump(report.to_dict(), fp, indent=2, default=str)
            _log_info(f"Diagnostics report written to {report_path}")
    except Exception as e:
        _log_error(f"Failed to write diagnostics JSON report: {e}")

    runner = DiagnosticsRunner()
    report = runner.run_all()

    # Build message box content
    summary = report.to_summary_string()

    # Add log file location
    if LOGGING_AVAILABLE:
        log_path = get_log_file_path_str()
        summary += f"\n\nLog file:\n{log_path}"
    else:
        summary += "\n\n(Logging not available)"

    # Show message box
    try:
        import adsk.core

        app = adsk.core.Application.get()
        if app and app.userInterface:
            icon_type = (
                adsk.core.MessageBoxIconTypes.InformationIconType
                if report.overall_passed
                else adsk.core.MessageBoxIconTypes.WarningIconType
            )
            app.userInterface.messageBox(
                summary,
                "System Blocks Diagnostics",
                adsk.core.MessageBoxButtonTypes.OKButtonType,
                icon_type,
            )
    except Exception as e:
        _log_error(f"Could not show message box: {e}")

    return report


def cleanup_any_remaining_temp_objects() -> int:
    """Clean up any leftover diagnostic temporary objects.

    Call this during add-in shutdown to ensure no temp objects remain.

    Returns:
        Number of objects cleaned up.
    """
    cleaned = 0
    try:
        import adsk.core
        import adsk.fusion

        app = adsk.core.Application.get()
        if not app or not app.activeProduct:
            return 0

        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            return 0

        root_comp = design.rootComponent

        # Clean up temp components
        for occ in list(root_comp.occurrences):
            if occ.component and occ.component.name.startswith(
                DiagnosticsRunner.TEMP_PREFIX
            ):
                try:
                    occ.deleteMe()
                    cleaned += 1
                except Exception:
                    pass

        # Clean up temp sketches
        for sketch in list(root_comp.sketches):
            if sketch.name.startswith(DiagnosticsRunner.TEMP_PREFIX):
                try:
                    sketch.deleteMe()
                    cleaned += 1
                except Exception:
                    pass

        if cleaned > 0:
            _log_info(f"Cleaned up {cleaned} leftover diagnostic objects")

    except Exception as e:
        _log_error(f"Error during cleanup: {e}")

    return cleaned
