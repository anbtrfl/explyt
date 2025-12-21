---
name: feature-analysis
description: Trace user-visible or system features implemented by the selected code scope.
use-by:
  - analyzer
---

## Goal
Reconstruct feature flows: entry points, steps, state transitions, and boundaries.

## Inputs
- Code scope selected by user
- Feature hints from user (if any)
- Depth: Shallow or Deep

## Shallow mode (fast)

1. Find probable entry points in-scope:
   - UI actions/commands, services, listeners, extension points, controllers.
   - Use `search_for_text` for keywords like: `Action`, `Extension`, `Listener`, `Service`, `Controller`, IDs, topic names.
2. For each entry point (limit to 3-7):
   - Use `read_file` to understand what it triggers.
   - Trace only 1 hop using `search_for_text` for the invoked method/class.
3. Summarize each feature in 5-10 lines:
   - trigger → main steps → outputs

## Deep mode (thorough)

1. Do everything from Shallow.
2. Trace each feature end-to-end until boundaries:
   - persistence/network/UI/SDK/IDE APIs.
   - follow IDs/routes/topics/action IDs to registration points.
3. Capture edge behavior:
   - validation
   - error handling + user feedback
   - retry/fallback logic
   - concurrency/threading assumptions

## Output

For each feature flow:
- Name
- Entry point(s) (file + symbol)
- Step-by-step trace (with file paths)
- Inputs/Outputs
- State transitions (if any)
- Boundary interactions (UI/persistence/network)
- Notable edge cases (Deep)
