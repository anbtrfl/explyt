# Task 05: Update StateTransitionTool

## Goal
Update the `StateTransitionTool` to work with the simplified tool response structure.

## Description
The `StateTransitionTool` is used for agent state management. It currently accesses tool responses via `toolCall.response?.response`, which has a double nesting due to the `ToolResponse` wrapper. This needs to be simplified to `toolCall.response`.

## Caveats & Key Points
- The tool checks if responses are successful: `toolCall.response?.response is SuccessToolCallResponse`
- This double nesting (`response?.response`) is confusing and should be simplified
- The logic for finding the current state needs to be updated
- The `AgentStatesFeature` may also reference this pattern

## Main Changes
**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/features/states/StateTransitionTool.kt`

1. Update the `findCurrentState()` function:
   ```kotlin
   // OLD:
   toolCall.response?.response is SuccessToolCallResponse
   
   // NEW:
   toolCall.response is SuccessToolCallResponse
   ```

2. Update any other references to `toolCall.response?.response` to `toolCall.response`

3. Simplify the logic for accessing tool call responses

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/features/states/AgentStatesFeature.kt`

1. Check for similar patterns and update them

## Acceptance Criteria
- [ ] All `toolCall.response?.response` patterns are changed to `toolCall.response`
- [ ] State transition logic works correctly
- [ ] Current state detection works correctly
- [ ] Code compiles without errors
- [ ] State management features function properly
