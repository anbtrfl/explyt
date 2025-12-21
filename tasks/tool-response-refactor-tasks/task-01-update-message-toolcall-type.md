# Task 01: Update Message.AgentTurn.ToolCall Response Type

## Goal
Change `Message.AgentTurn.ToolCall` to use `ToolCallResponse?` directly instead of `ToolResponse?`.

## Description
The current structure has an unnecessary wrapper layer:
- `Message.AgentTurn.ToolCall` contains `response: ToolResponse?`
- `ToolResponse` wraps `id`, `name`, and `response: ToolCallResponse`

Since `Message.AgentTurn.ToolCall` already has `id` and `name` fields, the `ToolResponse` wrapper is redundant. This task simplifies the structure by having `ToolCall` directly contain `response: ToolCallResponse?`.

## Caveats & Key Points
- The `ToolResponse` data class and its extension functions (`withSystemReminder`) are defined in `Message.kt`
- The `Message.AgentTurn.ToolCall.withSystemReminder()` function needs to be updated to work directly with `ToolCallResponse`
- The `Message.AgentTurn.withSystemReminderOnLastToolCall()` function also needs updating
- This is a foundational change that will affect many other files, but we're only changing the definition here

## Main Changes
**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt`

1. Update `Message.AgentTurn.ToolCall` data class:
   ```kotlin
   data class ToolCall(
       val id: String,
       val name: String,
       val arguments: String,
       val response: ToolCallResponse?  // Changed from ToolResponse?
   )
   ```

2. Update `Message.AgentTurn.ToolCall.withSystemReminder()` function:
   - Remove the intermediate `ToolResponse` handling
   - Work directly with `ToolCallResponse`
   - The logic should be similar to the current `ToolResponse.withSystemReminder()` but applied directly

3. Update `Message.AgentTurn.withSystemReminderOnLastToolCall()` function:
   - Adjust to work with the new structure

4. Keep the `ToolResponse` data class and its `withSystemReminder()` function for now:
   - They may still be used elsewhere in the codebase
   - They will be evaluated for removal in a later task

## Acceptance Criteria
- [ ] `Message.AgentTurn.ToolCall.response` has type `ToolCallResponse?` instead of `ToolResponse?`
- [ ] `Message.AgentTurn.ToolCall.withSystemReminder()` works correctly with the new structure
- [ ] `Message.AgentTurn.withSystemReminderOnLastToolCall()` works correctly with the new structure
- [ ] The `ToolResponse` data class and its extension function remain unchanged
- [ ] Code compiles without errors in the `Message.kt` file
- [ ] All `@Serializable` annotations are preserved
