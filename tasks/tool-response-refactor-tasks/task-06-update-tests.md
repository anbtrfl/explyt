# Task 06: Update Agent API Tests

## Goal
Update all tests in the agent-api module to work with the new `ToolCallResponse` structure.

## Description
Tests throughout the agent-api module create `ToolResponse` objects and use them in test scenarios. These need to be updated to work directly with `ToolCallResponse`.

## Caveats & Key Points
- `HistoryValidatorTest.kt` has multiple test cases that create `ToolResponse` objects
- Test helper functions may create `ToolResponse` wrappers
- Tests should be updated to reflect the simplified structure
- Ensure test coverage remains comprehensive

## Main Changes
**File:** `platform/agent-api/src/test/kotlin/com/explyt/agent/v4/HistoryValidatorTest.kt`

1. Update all `ToolResponse` object creations:
   ```kotlin
   // OLD:
   val toolResponse = ToolResponse("id1", "n1", SuccessToolCallWithNoMessageResponse())
   
   // NEW: Create ToolCall directly with response
   val toolCall = Message.AgentTurn.ToolCall(
       id = "id1",
       name = "n1", 
       arguments = "{}",
       response = SuccessToolCallWithNoMessageResponse()
   )
   ```

2. Update test assertions that check tool responses

3. Update any test helper functions

**File:** `platform/agent-api/src/test/kotlin/com/explyt/agent/utils/TestTools.kt`

1. Check for any test utilities that create or use `ToolResponse`

**Other test files:**

1. Search for and update any other test files that reference `ToolResponse`

## Acceptance Criteria
- [ ] All test files compile without errors
- [ ] All tests pass
- [ ] Test helper functions are updated
- [ ] Tests accurately reflect the new structure
- [ ] No `ToolResponse` objects are created in tests (except for backward compatibility tests if needed)
- [ ] Test coverage remains comprehensive
