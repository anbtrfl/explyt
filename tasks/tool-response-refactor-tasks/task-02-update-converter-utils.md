# Task 02: Update AgentAiConverterUtils

## Goal
Update the converter utilities to work with the new `Message.AgentTurn.ToolCall` structure that uses `ToolCallResponse` directly.

## Description
The `AgentAiConverterUtils.kt` file contains conversion functions between Agent messages and AI client messages. These functions currently expect `ToolResponse` but need to be updated to work with `ToolCallResponse` directly.

## Caveats & Key Points
- The `toAiMessages()` function converts Agent messages to AI client messages
- The `toAgentMessages()` function converts AI client messages to Agent messages
- The conversion logic for tool responses needs to be updated
- Extension functions like `toAiToolResponse()` and `toAgentToolResponse()` need updating
- The `AiToolResponse` still contains `id` and `name`, so we need to handle this mapping

## Main Changes
**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/utils/AgentAiConverterUtils.kt`

1. Update `toAiMessages()` function:
   - Change: `it.response!!.toAiToolResponse()` 
   - To: Create `AiToolResponse` directly from `ToolCall` fields and `ToolCallResponse`

2. Update `toAgentMessages()` function:
   - When converting `AiToolResponse` back to `Message.AgentTurn.ToolCall`
   - Store the `ToolCallResponse` directly instead of wrapping in `ToolResponse`

3. Update or remove extension functions:
   - `ToolResponse.toAiToolResponse()` - may need to be kept for backward compatibility
   - `AiToolResponse.toAgentToolResponse()` - should return `ToolCallResponse` instead of `ToolResponse`
   - Consider renaming to `AiToolResponse.toAgentToolCallResponse()` for clarity

4. Update `Message.AgentTurn.ToolCall.toAiToolCall()` if needed

5. Update `AiToolCall.toAgentToolCall()` if needed

## Acceptance Criteria
- [ ] `toAiMessages()` correctly converts `Message.AgentTurn.ToolCall` with `ToolCallResponse` to `AiMessage`
- [ ] `toAgentMessages()` correctly converts `AiToolResponse` to `Message.AgentTurn.ToolCall` with `ToolCallResponse`
- [ ] Tool call ID and name are properly preserved during conversions
- [ ] Extension functions are updated or removed as appropriate
- [ ] Code compiles without errors
- [ ] No references to `ToolResponse` remain in conversion logic (except for backward compatibility if needed)
