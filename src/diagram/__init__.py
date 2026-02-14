"""
System Blocks Diagram Package

Modular diagram data operations with full backward compatibility.
This package replaces the monolithic diagram_data.py with organized modules:

- core: Basic CRUD operations for blocks, interfaces, connections
- validation: Schema and link validation, status computation
- rules: Design rule checking (logic levels, power budget, etc.)
- export: Report generation and import/export (Markdown, CSV, Mermaid)
- hierarchy: Hierarchical diagram support
- cad: CAD linking, 3D visualization, living documentation

For backward compatibility, all functions are re-exported at the package level.
"""

# Core operations
# CAD linking and living documentation functions
from .cad import (
    CADLinkingError,
    calculate_component_completion_percentage,
    create_3d_connection_route,
    create_component_dashboard_data,
    create_enhanced_cad_link,
    determine_complexity,
    enable_system_grouping,
    estimate_assembly_time,
    generate_assembly_instructions,
    generate_assembly_sequence,
    generate_component_thumbnail_data,
    generate_component_thumbnail_placeholder,
    generate_living_bom,
    get_component_health_status,
    initialize_3d_visualization,
    initialize_living_documentation,
    mark_component_as_error,
    mark_component_as_missing,
    set_component_highlight_color,
    sync_all_components_in_diagram,
    track_change_impact,
    update_3d_overlay_position,
    update_component_properties,
    update_live_thumbnail,
    update_manufacturing_progress,
    validate_enhanced_cad_link,
)
from .core import (
    SCHEMA_VERSION,
    add_block_to_diagram,
    add_connection_to_diagram,
    create_block,
    create_connection,
    create_empty_diagram,
    create_interface,
    deserialize_diagram,
    find_block_by_id,
    generate_id,
    migrate_diagram,
    remove_block_from_diagram,
    serialize_diagram,
)

# Export and import functions
from .export import (
    EXPORT_PROFILES,
    export_report_files,
    generate_assembly_sequence_json,
    generate_assembly_sequence_markdown,
    generate_bom_csv,
    generate_bom_json,
    generate_connection_matrix_csv,
    generate_html_report,
    generate_markdown_report,
    generate_pin_map_csv,
    generate_pin_map_header,
    generate_svg_diagram,
    import_from_csv,
    parse_mermaid_flowchart,
    parse_mermaid_to_diagram,
    validate_imported_diagram,
)

# Hierarchy functions
from .hierarchy import (
    compute_hierarchical_status,
    create_child_diagram,
    find_block_path,
    get_all_blocks_recursive,
    get_child_diagram,
    has_child_diagram,
    validate_hierarchy_interfaces,
)

# Rule checking functions
from .rules import (
    check_implementation_completeness,
    check_implementation_completeness_bulk,
    check_logic_level_compatibility,
    check_logic_level_compatibility_bulk,
    check_power_budget,
    check_power_budget_bulk,
    get_rule_failures,
    run_all_rule_checks,
)

# Validation functions
from .validation import (
    compute_block_status,
    get_status_color,
    load_schema,
    update_block_statuses,
    validate_diagram,
    validate_diagram_links,
    validate_links,
)

__all__ = [
    # Core
    "SCHEMA_VERSION",
    "generate_id",
    "create_empty_diagram",
    "create_block",
    "create_interface",
    "create_connection",
    "add_block_to_diagram",
    "add_connection_to_diagram",
    "find_block_by_id",
    "remove_block_from_diagram",
    "serialize_diagram",
    "deserialize_diagram",
    "migrate_diagram",
    # Validation
    "load_schema",
    "validate_diagram",
    "validate_links",
    "validate_diagram_links",
    "validate_imported_diagram",
    "compute_block_status",
    "update_block_statuses",
    "get_status_color",
    # Rules
    "check_logic_level_compatibility_bulk",
    "check_power_budget_bulk",
    "check_implementation_completeness_bulk",
    "run_all_rule_checks",
    "get_rule_failures",
    "check_logic_level_compatibility",
    "check_power_budget",
    "check_implementation_completeness",
    "validate_hierarchy_interfaces",
    # Export
    "generate_markdown_report",
    "generate_html_report",
    "generate_pin_map_csv",
    "generate_pin_map_header",
    "generate_bom_csv",
    "generate_bom_json",
    "generate_assembly_sequence_markdown",
    "generate_assembly_sequence_json",
    "generate_connection_matrix_csv",
    "generate_svg_diagram",
    "EXPORT_PROFILES",
    "export_report_files",
    "parse_mermaid_flowchart",
    "parse_mermaid_to_diagram",
    "import_from_csv",
    # Hierarchy
    "create_child_diagram",
    "has_child_diagram",
    "get_child_diagram",
    "compute_hierarchical_status",
    "get_all_blocks_recursive",
    "find_block_path",
    # CAD
    "CADLinkingError",
    "create_enhanced_cad_link",
    "update_component_properties",
    "mark_component_as_missing",
    "mark_component_as_error",
    "validate_enhanced_cad_link",
    "calculate_component_completion_percentage",
    "get_component_health_status",
    "generate_component_thumbnail_placeholder",
    "generate_component_thumbnail_data",
    "sync_all_components_in_diagram",
    "create_component_dashboard_data",
    "initialize_3d_visualization",
    "update_3d_overlay_position",
    "set_component_highlight_color",
    "enable_system_grouping",
    "create_3d_connection_route",
    "update_live_thumbnail",
    "initialize_living_documentation",
    "generate_assembly_sequence",
    "estimate_assembly_time",
    "determine_complexity",
    "generate_assembly_instructions",
    "generate_living_bom",
    "track_change_impact",
    "update_manufacturing_progress",
]
