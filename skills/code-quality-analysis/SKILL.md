---
name: code-quality-analysis
description: Evaluate code quality, risks, and maintainability issues in the selected scope.
use-by:
  - analyzer
---

## Goal
Find maintainability risks and improvement opportunities, grounded in concrete locations in the code.

## Inputs
- Code scope selected by user
- Depth: Shallow or Deep

## Shallow mode (fast)

Goal: quickly flag obvious hotspots.

1. Spot obvious smells while scanning structures:
   - very large files/classes
   - deep nesting / many branches
   - unclear names, mixed responsibilities
   - repeated blocks within a file
   - suspicious null handling or unchecked casts
2. Use lightweight evidence:
   - `file_structure` to find size/shape problems
   - `read_file` for only the problematic sections
3. Output:
   - 5-20 issues max, each with location + 1-line fix direction

## Deep mode (thorough)

Goal: provide a prioritized plan and explain the risk behind each hotspot.

1. Confirm smells with deeper reading:
   - `read_file` for full classes/functions in question
   - `search_for_text` to confirm duplication or usage coupling
2. Look specifically for:
   - tight coupling / large dependency surface
   - implicit global state / hidden side effects
   - concurrency hazards (shared mutable state, wrong thread)
   - resource management (streams, disposables, listeners, subscriptions)
   - API misuse patterns (framework/SDK contracts)
   - error handling gaps (swallowed exceptions, user feedback missing)
3. Prioritize:
   - rank issues by user impact + change risk
   - propose a minimal sequence of refactors

## Output

- Issues grouped by category:
  - Complexity & readability
  - Architecture & coupling
  - Correctness risks
  - Performance & memory
  - API/lifecycle misuse
- For each issue:
  - What / Why it matters
  - Location (file + symbol)
  - Evidence (brief)
  - Fix direction (minimal)
- Deep only: prioritized improvement plan
