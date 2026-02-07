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
from typing import Any, Callable, Dict, List, Optional, Tuple

# Try to import logging utilities
try:
    from fusion_addin.logging_util import get_logger, get_log_file_path_str
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
    details: Dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
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
    tests: Dict[str, DiagnosticResult] = field(default_factory=dict)
    total_passed: int = 0
    total_failed: int = 0
    total_duration_ms: float = 0.0
    overall_passed: bool = False

    def to_dict(self) -> Dict[str, Any]:
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
        self._app: Optional[Any] = None
        self._ui: Optional[Any] = None
        self._design: Optional[Any] = None

    def _get_test_methods(self) -> List[Tuple[str, Callable[[], DiagnosticResult]]]:
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
        _log_debug(json.dumps(report.to_dict(), indent=2))

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
            from core.models import Graph, Block, Port, Connection, PortDirection
            from core.validation import validate_graph

            # Create a minimal valid graph: 2 blocks, 1 connection
            block_a = Block(
                id="block_a",
                name="Sensor",
                block_type="electrical",
                x=100,
                y=100,
                ports=[
                    Port(id="port_a_out", name="signal_out", direction=PortDirection.OUTPUT),
                ],
            )

            block_b = Block(
                id="block_b",
                name="Controller",
                block_type="software",
                x=300,
                y=100,
                ports=[
                    Port(id="port_b_in", name="signal_in", direction=PortDirection.INPUT),
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
            from core.models import Graph, Block, Port, Connection, PortDirection
            from core.validation import validate_graph

            # Create an invalid graph: connection references non-existent block
            block_a = Block(
                id="block_a",
                name="Sensor",
                block_type="electrical",
                x=100,
                y=100,
                ports=[
                    Port(id="port_a_out", name="signal_out", direction=PortDirection.OUTPUT),
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
                            if (
                                occ.component
                                and occ.component.name.startswith(self.TEMP_PREFIX)
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

            geometry_count = temp_sketch.sketchCurves.count + temp_sketch.sketchPoints.count

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


def run_diagnostics_and_show_result() -> DiagnosticsReport:
    """Run all diagnostics and show result in a Fusion message box.

    Returns:
        The complete DiagnosticsReport.
    """
    _log_info("Starting diagnostics from UI command")

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
