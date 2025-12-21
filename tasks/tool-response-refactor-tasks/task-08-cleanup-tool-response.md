# Task 08: Evaluate and Clean Up ToolResponse

## Goal
Evaluate whether `ToolResponse` and its extension functions can be removed, and clean up if possible.

## Description
After all the previous tasks are complete, the `ToolResponse` data class and its extension functions may no longer be needed. This task evaluates remaining usage and removes them if they're truly obsolete.

## Caveats & Key Points
- The `ToolResponse` class is defined in `Message.kt`
- It has an extension function `withSystemReminder()`
- There may be external modules or backward compatibility concerns
- The benchmark module (`internal-actions/benchmark`) may still use it
- Some serialization or API contracts might depend on it

## Main Changes
**Step 1: Search for remaining usage**

1. Search the entire codebase for `ToolResponse` references
2. Identify any remaining usage outside of the definition
3. Categorize usage:
   - Can be refactored (do it)
   - Must be kept for backward compatibility (document it)
   - External/benchmark usage (evaluate separately)

**Step 2: Update or document remaining usage**

1. If found in `internal-actions/benchmark`:
   - Evaluate if it can be updated
   - If it's for external API compatibility, document and keep

2. If found in other modules:
   - Update them to use `ToolCallResponse` directly
   - Follow the same patterns as previous tasks

**Step 3: Remove if possible**

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt`

1. If no remaining usage, remove:
   - `data class ToolResponse`
   - `fun ToolResponse.withSystemReminder()`

2. If must keep for compatibility:
   - Add deprecation annotation
   - Add documentation explaining why it's kept
   - Add comment pointing to the new approach

## Acceptance Criteria
- [ ] All remaining `ToolResponse` usage is identified and documented
- [ ] Either:
  - [ ] `ToolResponse` is completely removed from the codebase, OR
  - [ ] `ToolResponse` is marked as deprecated with clear documentation
- [ ] No compilation errors
- [ ] All tests pass
- [ ] Documentation is updated to reflect the new structure
- [ ] If kept, there's a clear plan for eventual removal
