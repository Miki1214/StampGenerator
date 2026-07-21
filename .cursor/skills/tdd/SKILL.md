---
name: tdd
description: Strict Test-Driven Development (TDD) Protocol
disable-model-invocation: true
---
# SKILL: Strict Test-Driven Development (TDD) Protocol

## Objective
Enforce a rigid, state-based Red-Green-Refactor cycle with absolute integrity. You are strictly forbidden from writing functional implementation code without an existing, verified failing test.

## Execution Rules & State Transitions

### Phase 1: Contextual Impact Mapping
1. Before editing any code, locate or generate the dependency map of the target module.
2. Identify existing tests associated with this module. You must run these baseline tests FIRST to ensure the environment is clean.
3. Use the project's standard test runner and environment (e.g. activate the correct virtual environment, use the project's package manager scripts). Do not use system-wide interpreters or ad hoc installs when a project-local environment exists.

### Phase 2: The Red State (Write the Test)
1. Write EXACTLY ONE isolated, human-readable test case following RITE principles (Right, Isolated, Thorough, Explicable).
2. The test must utilize descriptive names outlining expected behavioral outcomes, avoiding arbitrary literal values.
3. CRITICAL ANTI-CHEAT CONTRACT: Execute the test runner immediately. You must view and ingest the raw, terminal stdout of the failure. Do not infer or assume it will fail. You cannot move to Phase 3 without capturing the exact failure message in your internal thoughts.

### Phase 3: The Green State (Write Minimum Code)
1. Implement the ABSOLUTE MINIMAL code required to satisfy the failing test. Do not build ahead, optimize, or guess future requirements.
2. Run the test suite. 
3. If the test fails, roll back the implementation change and try a different minimal approach. Do not guess fix loops; analyze the raw error trace.

### Phase 4: The Refactor State (Clean and Assert)
1. Once green, optimize the code for readability and single-responsibility.
2. Run the entire module test suite to verify no regressions were introduced.
3. Commit the changes using atomic naming convention (e.g., `feat(auth): pass user verification test`). Do not stack multiple features in one commit.

## Forbidden Behaviors
- NEVER generate a test file and an implementation file in the same tool call turn.
- NEVER assume or hallucinate a test pass/fail output without executing the terminal test runner tool.
- NEVER skip the refactoring phase or allow technical debt to compound.
