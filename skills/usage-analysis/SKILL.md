---
name: usage-analysis
description: Analyze cross-file usages and dependencies inside the selected code scope.
use-by:
  - analyzer
---

## Goal
Understand how entities in the scope reference each other and identify dependency chains and hotspots.

## Inputs
- Code scope selected by user
- Optional focus symbols/entities (classes/functions/files)
- Depth: Shallow or Deep

## Shallow mode (fast)

1. Select focus entities:
   - If user provided symbols: use them.
   - Otherwise infer 3-10 candidates from:
     - filenames
     - top-level declarations (`file_structure`)
     - obvious entry points (Actions, services, extensions, controllers)
2. For each focus entity:
   - `search_for_text` for the simple name within the scope.
   - Group matches into:
     - creation/registration (DI, service lookup, extension point)
     - calls/usage
     - inheritance/implementation
     - constants/IDs
     - tests
3. Produce a dependency sketch:
   - “A -> B -> C” chains for the top 3-5 flows

Limits:
- Avoid expanding secondary symbols unless a match count indicates a hotspot.

## Deep mode (thorough)

1. Do everything from Shallow.
2. Expand hotspots:
   - For entities with many incoming/outgoing references, identify the top callers and why.
   - Follow secondary symbols discovered during tracing (1-2 additional waves).
3. Identify architectural signals:
   - layering violations (ui -> persistence, domain -> UI)
   - cyclic dependencies (by observing mutual references)
   - unstable abstractions (interfaces with many special-case callers)

## Output

- Focus entities list
- For each entity:
  - Definition location (file + declaration)
  - Where used (grouped)
  - Notable dependency chains
- Hotspots and why they matter
