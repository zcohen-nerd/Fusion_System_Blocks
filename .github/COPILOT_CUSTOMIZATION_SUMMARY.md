# GitHub Copilot Customization Summary for Fusion System Blocks

## Executive Summary

This document summarizes the GitHub Copilot customization files installed for the Fusion System Blocks project. These resources are sourced from the [awesome-copilot repository](https://github.com/github/awesome-copilot) (20.2k stars, 2.3k forks), a comprehensive community-curated collection of GitHub Copilot customizations.

**Total Files Installed: 12**
- **Instructions**: 5 files (.github/instructions/)
- **Prompts**: 6 files (.github/prompts/)
- **Agents**: 2 files (.github/agents/)

All files have been copied verbatim without modification to preserve their proven effectiveness.

---

## Installation Summary

### Instructions Files (.github/instructions/)

These files provide coding standards, guidelines, and best practices that automatically apply to your codebase when GitHub Copilot generates or reviews code.

| File | Purpose | Applied To | VS Code Install Link |
|------|---------|-----------|---------------------|
| **python.instructions.md** | Python coding conventions: PEP 8 compliance, type hints with `typing` module, docstrings (PEP 257), 79-char line limits, 4-space indentation, clear function naming | `**/*.py` | [Install](https://aka.ms/awesome-copilot/install/instructions/python.instructions.md) |
| **code-review-generic.instructions.md** | Comprehensive code review framework with priority system (Critical/Important/Suggestion), security checklist, testing standards, performance considerations, architecture validation, comment format templates | `**` (all files) | [Install](https://aka.ms/awesome-copilot/install/instructions/code-review-generic.instructions.md) |
| **python-mcp-server.instructions.md** | MCP server development using FastMCP: `@mcp.tool()/@mcp.resource()/@mcp.prompt()` decorators, type hints for schema generation, Context parameter usage, stdio/HTTP transport patterns, lifespan management | `**/*.py, **/pyproject.toml, **/requirements.txt` | [Install](https://aka.ms/awesome-copilot/install/instructions/python-mcp-server.instructions.md) |
| **security-and-owasp.instructions.md** | OWASP Top 10 security practices: parameterized queries (SQL injection prevention), input validation, cryptographic best practices (Argon2/bcrypt), secure secret management (environment variables), authentication/authorization patterns | `*` (all files) | [Install](https://aka.ms/awesome-copilot/install/instructions/security-and-owasp.instructions.md) |
| **markdown.instructions.md** | Documentation standards: YAML front matter requirements, proper heading hierarchy (H2/H3), 400-char line limits, code block syntax highlighting, link/image formatting, table structure | `**/*.md` | [Install](https://aka.ms/awesome-copilot/install/instructions/markdown.instructions.md) |
| **playwright-python.instructions.md** | Playwright test generation for Python: role-based locators (get_by_role/get_by_label/get_by_text), auto-retrying assertions via `expect` API, pytest fixtures, test file naming (test_*.py), setup/teardown patterns | `**` (all files) | [Install](https://aka.ms/awesome-copilot/install/instructions/playwright-python.instructions.md) |

### Prompt Files (.github/prompts/)

These files are reusable templates that you can invoke in GitHub Copilot chat to execute specific workflows. Each prompt follows proven patterns for common development tasks.

| File | Purpose | Usage | VS Code Install Link |
|------|---------|-------|---------------------|
| **create-readme.prompt.md** | Generate comprehensive, well-structured README.md files following open-source best practices with GFM formatting, GitHub admonitions, project structure overview, installation/usage guidance | Chat: "Use create-readme prompt to generate README for this project" | [Install](https://aka.ms/awesome-copilot/install/prompts/create-readme.prompt.md) |
| **create-specification.prompt.md** | Create AI-ready specification documents with structured requirements (REQ-001), constraints (CON-001), security rules (SEC-001), acceptance criteria (Given-When-Then format), test automation strategy, dependency mapping | Chat: "Use create-specification prompt for [feature name]" | [Install](https://aka.ms/awesome-copilot/install/prompts/create-specification.prompt.md) |
| **create-technical-spike.prompt.md** | Generate time-boxed research documents for critical technical decisions: research questions, investigation plan, success criteria, technical context, findings documentation, implementation recommendations | Chat: "Use create-technical-spike prompt for [decision name]" | [Install](https://aka.ms/awesome-copilot/install/prompts/create-technical-spike.prompt.md) |
| **breakdown-test.prompt.md** | Comprehensive test planning using ISTQB frameworks and ISO 25010 quality standards: test strategy creation, test issue generation for GitHub Projects, quality gate definition, coverage targets (>80% line, >90% branch), Playwright test templates | Chat: "Use breakdown-test prompt for [feature name]" | [Install](https://aka.ms/awesome-copilot/install/prompts/breakdown-test.prompt.md) |
| **pytest-coverage.prompt.md** | Run pytest with coverage reporting, identify missing coverage lines (! markers in annotate output), iteratively add tests to reach 100% coverage using `pytest --cov --cov-report=annotate:cov_annotate` | Chat: "Use pytest-coverage prompt to improve test coverage" | [Install](https://aka.ms/awesome-copilot/install/prompts/pytest-coverage.prompt.md) |
| **python-mcp-server-generator.prompt.md** | Generate complete MCP server projects using `uv` package manager: FastMCP setup, type-safe tool implementation with Pydantic models, stdio/HTTP transport configuration, proper error handling, testing guidance | Chat: "Use python-mcp-server-generator prompt for [server name]" | [Install](https://aka.ms/awesome-copilot/install/prompts/python-mcp-server-generator.prompt.md) |

### Agent Files (.github/agents/)

These files define specialized AI "chat modes" that focus GitHub Copilot on specific expert roles. Agents have tailored tool access and behavior patterns optimized for particular tasks.

| File | Purpose | Tools/Capabilities | VS Code Install Link |
|------|---------|-------------------|---------------------|
| **python-mcp-expert.agent.md** | Expert assistant for MCP server development in Python: complete FastMCP mastery, type hint troubleshooting, structured output patterns, Context parameter usage, transport configuration (stdio/HTTP), lifespan management, debugging schema issues | Uses Claude Sonnet 4; provides complete working code, explains design decisions, includes uv commands, offers alternative approaches | [Install](https://aka.ms/awesome-copilot/install/agents/python-mcp-expert.agent.md) |
| **hlbpa.agent.md** | High-Level Big Picture Architect: creates architectural documentation focusing on interfaces, data contracts, major flows, failure modes; generates Mermaid diagrams (external .mmd files or inline); operates in read-only docs/ folder; marks unknowns as TBD | Uses Claude Sonnet 4; access to search/codebase, changes, githubRepo, runTests, findTestFiles, activePullRequest; generates GFM Markdown with accessibility (alt text) | [Install](https://aka.ms/awesome-copilot/install/agents/hlbpa.agent.md) |

---

## Enabled Workflows

These customizations enable the following development workflows for your Fusion System Blocks project:

### 1. **Python Code Development Workflow**

**Enabled By**: python.instructions.md, security-and-owasp.instructions.md

**How It Works**:
1. When you write Python code, Copilot automatically applies PEP 8 standards, adds type hints, and generates docstrings
2. Security best practices are enforced: parameterized queries, input validation, secure secret management
3. Functions stay focused (ideally <20-30 lines), with descriptive names and proper error handling

**Example Use Case**:
```python
# Before: Write a function stub
def process_user_data(data):
    pass

# After: Copilot generates with proper typing, docstrings, and validation
def process_user_data(data: Dict[str, Any]) -> ProcessingResult:
    """
    Process and validate user data according to schema requirements.
    
    Parameters:
        data (Dict[str, Any]): Raw user data requiring validation
    
    Returns:
        ProcessingResult: Validated and processed user data
    
    Raises:
        ValueError: If data fails validation checks
    """
    if not data or "user_id" not in data:
        raise ValueError("Invalid data: missing required user_id field")
    
    # Validation and processing logic here
    return ProcessingResult(user_id=data["user_id"], status="processed")
```

### 2. **Code Review Workflow**

**Enabled By**: code-review-generic.instructions.md

**How It Works**:
1. When reviewing code, Copilot uses 3-tier priority system: 🔴 Critical (blocks merge), 🟡 Important (needs discussion), 🟢 Suggestion (non-blocking)
2. Provides comment format with "Why this matters" explanations and suggested fixes
3. Checks 30+ validation points: security, testing, performance, architecture

**Example Use Case**:
- Review a pull request and ask: "Review this code for security issues"
- Copilot identifies SQL injection vulnerability: "🔴 CRITICAL - Security: Line 45 concatenates user input directly into SQL query. Use parameterized queries instead. See suggested fix..."
- Provides specific code replacement with parameterized query pattern

### 3. **MCP Server Development Workflow**

**Enabled By**: python-mcp-server.instructions.md, python-mcp-expert.agent.md, python-mcp-server-generator.prompt.md

**How It Works**:
1. Chat with Python MCP Expert agent for guided development: "@python-mcp-expert I need to create an MCP server for file analysis"
2. Agent provides complete project structure with uv initialization
3. Use python-mcp-server-generator prompt for templated server creation
4. Copilot enforces FastMCP patterns: type hints mandatory, Context usage for logging, proper resource cleanup

**Example Use Case**:
```bash
# Start conversation with specialized agent
Chat: "@python-mcp-expert Create an MCP server that provides tools for analyzing Python code files"

# Agent generates complete server.py with:
# - FastMCP initialization
# - @mcp.tool() decorated functions with full type hints
# - Pydantic models for structured output
# - Proper error handling and logging
# - uv commands for testing: `uv run mcp dev server.py`
```

### 4. **Documentation Generation Workflow**

**Enabled By**: create-readme.prompt.md, markdown.instructions.md, hlbpa.agent.md

**How It Works**:
1. For project README: "Use create-readme prompt" generates comprehensive README with structure, tone, and content based on proven open-source examples
2. For architecture docs: "@hlbpa Generate architecture overview" creates docs/ARCHITECTURE_OVERVIEW.md with Mermaid diagrams
3. All Markdown automatically follows formatting standards: proper headings, 400-char lines, YAML front matter

**Example Use Case**:
```markdown
# Generate README
Chat: "Use create-readme prompt to create README for Fusion System Blocks"

# Copilot generates:
# - Project overview with clear value proposition
# - Installation instructions with prerequisites
# - Usage examples with code snippets
# - Architecture section with component breakdown
# - Contributing guidelines reference
# - License information
# - GFM formatting with GitHub admonitions

# Generate Architecture Documentation
Chat: "@hlbpa Create architecture documentation showing diagram data flow"

# HLBPA agent generates:
# - docs/ARCHITECTURE_OVERVIEW.md with narrative
# - docs/diagrams/diagram_data_flow.mmd (Mermaid diagram)
# - Component interfaces and contracts
# - Failure modes and error handling patterns
# - Information Requested section for unknowns (TBD markers)
```

### 5. **Specification Creation Workflow**

**Enabled By**: create-specification.prompt.md

**How It Works**:
1. Chat: "Use create-specification prompt for diagram export feature"
2. Copilot generates spec/spec-design-diagram-export.md with:
   - Structured requirements (REQ-001, REQ-002...)
   - Security constraints (SEC-001, SEC-002...)
   - Acceptance criteria in Given-When-Then format
   - Test automation strategy
   - Dependencies and external integrations
3. Specification is AI-ready: clear, unambiguous, structured for GenAI consumption

**Example Use Case**:
```markdown
---
title: Diagram Export Feature Specification
date_created: 2024-01-15
owner: Fusion Systems Team
tags: [design, feature, export]
---

# Introduction

Specification for diagram export functionality enabling users to export system diagrams
to multiple formats (PNG, SVG, JSON) with configurable quality settings.

## 1. Purpose & Scope

Define requirements for diagram export feature supporting Fusion add-in users...

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: System shall support PNG export at 72-300 DPI
- **REQ-002**: System shall support SVG vector format export
- **SEC-001**: Exported files shall not contain sensitive metadata
- **CON-001**: Export processing time shall not exceed 5 seconds for diagrams <1000 blocks
- **GUD-001**: Export UI shall provide real-time preview during configuration

## 5. Acceptance Criteria

- **AC-001**: Given user selects PNG export, When resolution is set to 150 DPI, Then exported image shall be 150 DPI with correct dimensions
- **AC-002**: Given diagram contains 500 blocks, When export is initiated, Then processing shall complete within 3 seconds
```

### 6. **Technical Spike/Research Workflow**

**Enabled By**: create-technical-spike.prompt.md

**How It Works**:
1. Chat: "Use create-technical-spike prompt for evaluating Fusion API performance"
2. Copilot generates docs/spikes/performance-fusion-api-spike.md with:
   - Clear research question and success criteria
   - Investigation plan with specific tasks
   - Time-box constraints (e.g., 1 week)
   - Prototype/testing notes section
   - Decision recommendation with rationale
3. Status tracking table (🔴 Not Started → 🟡 In Progress → 🟢 Complete)

**Example Use Case**:
```markdown
---
title: "Fusion API Performance for Large Diagrams"
category: "Performance"
status: "🔴 Not Started"
priority: "High"
timebox: "1 week"
created: 2024-01-15
owner: "Architecture Team"
tags: ["technical-spike", "performance", "research"]
---

# Fusion API Performance for Large Diagrams

## Summary

**Spike Objective:**
Determine if Fusion API can handle diagram rendering with 1000+ blocks without UI freezing

**Why This Matters:**
Critical performance requirement for enterprise customers with complex system diagrams

**Timebox:** 5 days

## Research Question(s)

**Primary Question:** What is the maximum number of diagram blocks the Fusion API can render smoothly (60fps)?

**Secondary Questions:**
- What rendering optimizations are available (batching, caching)?
- How does complexity affect memory usage?
- Are there API rate limits we need to consider?

## Investigation Plan

### Research Tasks
- [ ] Create test diagrams with 500, 1000, 2000, 5000 blocks
- [ ] Measure rendering time and frame rates using Fusion profiler
- [ ] Test API batching strategies
- [ ] Document findings with performance graphs
- [ ] Recommend approach based on results

[... rest of spike template with sections for Findings, Decision, Implementation Notes]
```

### 7. **Test Planning and Quality Assurance Workflow**

**Enabled By**: breakdown-test.prompt.md, pytest-coverage.prompt.md, playwright-python.instructions.md

**How It Works**:
1. Use breakdown-test prompt for comprehensive test strategy: "Use breakdown-test prompt for diagram validation feature"
2. Generates GitHub issues checklist with ISTQB test design techniques and ISO 25010 quality characteristics
3. Creates test-strategy.md, test-issues-checklist.md, qa-plan.md with quality gates
4. Use pytest-coverage prompt to improve coverage: identifies missing lines with ! markers, suggests tests iteratively

**Example Use Case**:
```bash
# Step 1: Generate Test Strategy
Chat: "Use breakdown-test prompt for diagram validation feature"

# Copilot generates:
# - docs/.../test-strategy.md with ISTQB framework application
# - Test types coverage matrix (functional, non-functional, structural, regression)
# - ISO 25010 assessment (functional suitability, performance, security, usability)
# - GitHub issue templates for test implementation

# Step 2: Implement Tests with Coverage Tracking
Chat: "Use pytest-coverage prompt to improve test coverage"

# Copilot runs:
pytest --cov --cov-report=annotate:cov_annotate

# Then analyzes cov_annotate/ directory:
# - Identifies lines starting with ! (not covered)
# - Suggests specific test cases for uncovered lines
# - Iterates until 100% coverage achieved

# Step 3: Write Playwright Tests
# With playwright-python.instructions.md active:
# - Copilot generates tests with role-based locators
# - Uses expect() assertions with auto-retry
# - Follows test_<feature>.py naming convention
# - Includes pytest fixtures for setup/teardown
```

### 8. **Architectural Documentation Workflow**

**Enabled By**: hlbpa.agent.md

**How It Works**:
1. Chat with HLBPA agent: "@hlbpa Generate architecture overview for Fusion System Blocks"
2. Agent operates in read-only mode, creates/updates docs/ folder
3. Generates Mermaid diagrams (inline or external .mmd files) with accessibility (alt text)
4. Focuses on high-level: interfaces, data contracts, major flows, failure modes
5. Marks unknowns as TBD, emits consolidated Information Requested list

**Example Use Case**:
```markdown
# Chat
@hlbpa Generate architecture overview showing component interactions and data flows for the diagram editor

# HLBPA generates docs/ARCHITECTURE_OVERVIEW.md:

# Fusion System Blocks Architecture Overview

## System Components

### Diagram Editor (src/core/diagram-editor.js)
**Purpose**: Core editing engine for system diagrams
**Public Interface**: 
- `createBlock(type, properties)` → BlockInstance
- `connectBlocks(sourceId, targetId, connectionType)` → Connection
- `validateDiagram()` → ValidationResult

**Failure Modes**:
- Returns `ValidationError` with HTTP 400 when block type is invalid
- Throws `ConnectionError` when source/target blocks don't exist

### Python Bridge (src/interface/python-bridge.js)
**Purpose**: Communication layer between JavaScript UI and Python backend
**Data Contracts**:
```json
{
  "type": "diagram_data",
  "payload": {
    "blocks": [{ "id": "string", "type": "string", "properties": {} }],
    "connections": [{ "source": "string", "target": "string" }]
  }
}
```

[... continues with component-by-component breakdown]

## Major Data Flows

```mermaid src="./diagrams/diagram_data_flow.mmd" alt="Diagram data flow from UI to Python backend"```

[Mermaid diagram showing: UI → Diagram Editor → Python Bridge → diagram_data.py → Fusion API]

## Information Requested
- TBD: What is the maximum payload size for diagram_data messages?
- TBD: Are there retry policies for failed Fusion API calls?
- TBD: What authentication mechanism is used for Python-JavaScript IPC?

---
<small>Generated with GitHub Copilot as directed by {USER_NAME}</small>
```

---

## Usage Recommendations

### For Daily Development

1. **Keep Instructions Active**: The .instructions.md files work automatically - no action needed. They guide every code generation and review.

2. **Use Prompts for Repetitive Tasks**: Instead of explaining the same workflow repeatedly, use prompts:
   - "Use create-readme prompt" instead of "Create a README with installation instructions, usage examples..."
   - "Use pytest-coverage prompt" instead of "Run pytest with coverage and help me identify missing tests..."

3. **Switch to Agents for Specialized Work**:
   - Complex MCP server development? Chat with @python-mcp-expert
   - Need architecture documentation? Use @hlbpa agent
   - Agents have tailored tool access and expertise for specific domains

### For Code Reviews

1. **Leverage Priority System**: When reviewing PRs, Copilot will categorize issues as 🔴 Critical, 🟡 Important, or 🟢 Suggestion
2. **Request Specific Reviews**: 
   - "Review for security issues" → focuses on OWASP checklist
   - "Review test coverage" → checks for missing tests and edge cases
   - "Review performance" → identifies N+1 queries, memory leaks, inefficient algorithms

### For Project Planning

1. **Start with Technical Spikes**: Use create-technical-spike prompt to research critical unknowns before committing to implementation
2. **Generate Specifications**: Use create-specification prompt to create AI-ready spec documents that serve as unambiguous implementation contracts
3. **Plan Testing Early**: Use breakdown-test prompt after specs to generate comprehensive test strategy aligned with ISTQB/ISO 25010 standards

### For Documentation

1. **README Generation**: Use create-readme prompt at project start and after major features
2. **Architecture Reviews**: Use @hlbpa agent after significant changes to update architecture documentation
3. **Keep Docs Current**: Both prompts and agents can update existing documentation rather than starting from scratch

---

## VS Code Installation

### Automatic Installation

Click the VS Code install links in the tables above. Each link follows the pattern:
```
https://aka.ms/awesome-copilot/install/{category}/{filename}
```

### Manual Installation

Files are already in your project:
- `.github/instructions/` → Automatically apply to code generation
- `.github/prompts/` → Invoke with "Use [prompt-name] prompt"
- `.github/agents/` → Chat with "@[agent-name]"

Verify in VS Code:
1. Open GitHub Copilot Chat
2. Type "@" to see available agents
3. Type "Use " to see available prompts
4. Instructions work silently in the background

---

## Integration with Project Management

### GitHub Issues Integration

1. **Test Issues from breakdown-test.prompt.md**:
   - Generated test issues include standardized labels: `unit-test`, `e2e-test`, `performance-test`, `security-test`
   - Priority labels: `test-critical`, `test-high`, `test-medium`, `test-low`
   - Component labels: `frontend-test`, `backend-test`, `api-test`, `database-test`
   - Each issue has story point estimates based on complexity

2. **Technical Spike Tracking**:
   - Spikes created with create-technical-spike prompt include status tracking: 🔴 Not Started → 🟡 In Progress → 🟢 Complete
   - Decision deadline fields help prevent research from blocking development
   - Follow-up actions automatically generated after spike completion

3. **Quality Gates from QA Plan**:
   - breakdown-test prompt generates entry/exit criteria for each testing phase
   - Quality metrics defined upfront: >80% line coverage, >90% branch coverage, zero critical vulnerabilities
   - Escalation procedures documented for quality failures

### Project Planning Workflow

**Recommended Sequence**:
1. **Discovery**: Use @hlbpa to document current architecture and identify gaps
2. **Research**: Create technical spikes for unknown/risky areas using create-technical-spike prompt
3. **Specification**: Generate detailed specs with create-specification prompt
4. **Test Planning**: Create comprehensive test strategy with breakdown-test prompt
5. **Implementation**: Use python.instructions.md and security-and-owasp.instructions.md during development
6. **Quality Assurance**: Track coverage with pytest-coverage prompt, validate against ISO 25010 characteristics
7. **Documentation**: Generate/update README and architecture docs before release

---

## Maintenance and Updates

### Keeping Customizations Current

1. **Monitor awesome-copilot Repository**:
   - Watch https://github.com/github/awesome-copilot for new files and updates
   - Check release notes for breaking changes

2. **Update Individual Files**:
   - Download latest version from raw.githubusercontent.com
   - Replace existing file (maintaining verbatim copy principle)
   - Test in non-critical context before full adoption

3. **Add New Customizations**:
   - Browse [awesome-copilot collections](https://github.com/github/awesome-copilot/blob/main/docs/README.collections.md)
   - Download relevant files for new technologies (e.g., Rust, TypeScript, Java MCP)
   - Place in appropriate .github/ subdirectory

### Customization for Fusion System Blocks

While files are copied verbatim, you can add project-specific supplements:

1. **Create fusion-system-blocks.instructions.md**:
   - Add Fusion API-specific patterns
   - Document project-specific naming conventions
   - Define custom error handling standards

2. **Create Custom Prompts**:
   - fusion-block-generator.prompt.md for creating new block types
   - diagram-validation.prompt.md for validation rule implementation
   - Follow existing prompt format patterns

3. **Create Domain Agents**:
   - fusion-expert.agent.md for Fusion API assistance
   - systems-engineering-expert.agent.md for systems engineering diagram best practices

---

## Additional Insights

### Prompt Engineering Benefits

These customizations leverage prompt engineering best practices from [GitHub Copilot documentation](https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering):

1. **Start General, Then Get Specific**: Instructions provide broad guidelines; prompts apply them to specific tasks
2. **Give Examples**: Files include concrete code examples showing correct and incorrect patterns
3. **Break Complex Tasks**: breakdown-test prompt decomposes testing into logical phases
4. **Avoid Ambiguity**: Specifications use structured format with explicit requirement IDs
5. **Indicate Relevant Code**: Agents have tool access to search codebase for context

### Security Considerations

security-and-owasp.instructions.md enforces:
- **A01: Broken Access Control**: Principle of least privilege, deny by default patterns
- **A02: Cryptographic Failures**: Argon2/bcrypt for hashing, HTTPS by default, no hardcoded secrets
- **A03: Injection**: Parameterized queries, input sanitization, XSS prevention with .textContent
- **A05: Security Misconfiguration**: Security headers (CSP, HSTS), disable debug in production
- **A07: Authentication Failures**: Secure session management, brute force protection
- **A08: Data Integrity Failures**: Safe deserialization, type checking

### Performance Optimization

Code review instructions enforce:
- Avoid N+1 query problems (use JOINs or eager loading)
- Appropriate algorithmic complexity for use cases
- Caching for expensive operations
- Proper resource cleanup (connections, files, streams)
- Pagination for large result sets
- Lazy loading patterns

### Testing Best Practices

Testing instructions ensure:
- **Coverage**: >80% line coverage, >90% branch coverage for critical paths
- **Test Names**: Descriptive names explaining what is being tested
- **Test Structure**: Clear Arrange-Act-Assert or Given-When-Then pattern
- **Independence**: Tests don't depend on each other or external state
- **Edge Cases**: Boundary conditions, null values, empty collections tested
- **Mock Appropriately**: Mock external dependencies, not domain logic

---

## Next Steps

1. **Verify Installation**: 
   - Open VS Code
   - Open GitHub Copilot Chat
   - Type "@" to confirm agents are visible
   - Try "Use create-readme prompt" to test prompt invocation

2. **Test Workflows**:
   - Generate a README for a test project
   - Ask @hlbpa to create architecture documentation
   - Use pytest-coverage prompt on existing tests
   - Review a code sample with code-review-generic instructions active

3. **Customize**:
   - Add Fusion-specific instructions
   - Create domain-specific prompts
   - Develop specialized agents for your workflow

4. **Share with Team**:
   - Demonstrate workflows during standup
   - Create team guidelines for prompt usage
   - Establish conventions for agent invocation

---

## Resources

- **awesome-copilot Repository**: https://github.com/github/awesome-copilot
- **GitHub Copilot Prompt Engineering**: https://docs.github.com/en/copilot/concepts/prompting/prompt-engineering
- **GitHub Copilot Custom Instructions**: https://code.visualstudio.com/docs/copilot/customization/custom-instructions
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **ISTQB Testing Certification**: https://www.istqb.org/
- **ISO 25010 Quality Model**: https://iso25000.com/index.php/en/iso-25000-standards/iso-25010

---

**Document Generated**: 2024-01-15  
**awesome-copilot Version**: Latest from main branch (20.2k stars, 2.3k forks)  
**Installation Method**: Verbatim copy without modification  
**Project**: Fusion System Blocks - Python-based Fusion Add-in for Systems Engineering Diagrams
