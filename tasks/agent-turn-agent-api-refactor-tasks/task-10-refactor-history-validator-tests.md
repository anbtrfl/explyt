# Task 10: Refactor History Validator Tests

## Goal

Update the tests for `HistoryValidator` to work with the new `Message.AgentTurn` model and verify that the simplified validation logic works correctly.

## Description

After all the migration tasks are complete and `MessageOld` is removed, the history validator tests need to be updated to:

1. Replace `Message.AssistantMessage` with `Message.AgentTurn` in test cases
2. Remove tests for `Message.ToolResponseMessage` (no longer exists)
3. Remove tests for `Status.UnprocessedToolCalls` state
4. Add tests for `CorruptedReason.IncompleteToolCalls`
5. Update test cases to reflect the new unified tool call/response model
6. Verify that the simplified validation logic correctly handles all edge cases

## Caveats & Key Points

- This task should be done **after** Task 09 (Remove MessageOld and final cleanup)
- The test file is likely in `platform/agent-api/src/test/kotlin/com/explyt/agent/v4/`
- Tests should cover:
  - Valid histories with `AgentTurn` containing tool calls with responses
  - Invalid histories with `AgentTurn` containing tool calls without responses (incomplete)
  - Valid histories with `AgentTurn` without tool calls (regular assistant messages)
  - All the existing validation rules (system message position, user after user, etc.)
- The tests should be simpler now since there's no cross-message tool call matching

## Main Changes

**File:** Find and update the history validator test file (likely `HistoryValidatorTest.kt` or similar)

### Expected Changes:

1. **Replace AssistantMessage with AgentTurn:**
```kotlin
// Old
Message.AssistantMessage(
    content = "response",
    toolCalls = listOf(toolCall)
)

// New
Message.AgentTurn(
    content = "response",
    toolCalls = listOf(
        Message.AgentTurn.ToolCall(
            id = "call_1",
            name = "tool",
            arguments = "{}",
            response = ToolResponse(...)
        )
    )
)
```

2. **Remove ToolResponseMessage tests:**
```kotlin
// Remove all tests that use Message.ToolResponseMessage
// These are no longer valid since tool responses are embedded in AgentTurn
```

3. **Add IncompleteToolCalls tests:**
```kotlin
@Test
fun `should detect incomplete tool calls`() {
    val history = listOf(
        Message.UserMessage("test"),
        Message.AgentTurn(
            content = "response",
            toolCalls = listOf(
                Message.AgentTurn.ToolCall(
                    id = "call_1",
                    name = "tool",
                    arguments = "{}",
                    response = null  // Incomplete!
                )
            )
        )
    )
    
    val status = HistoryValidator.validateHistory(SimpleHistory(history))
    
    assertThat(status).isInstanceOf(Status.Corrupted::class.java)
    assertThat((status as Status.Corrupted).reason)
        .isEqualTo(CorruptedReason.IncompleteToolCalls)
}
```

4. **Update valid tool call tests:**
```kotlin
@Test
fun `should accept agent turn with completed tool calls`() {
    val history = listOf(
        Message.UserMessage("test"),
        Message.AgentTurn(
            content = "response",
            toolCalls = listOf(
                Message.AgentTurn.ToolCall(
                    id = "call_1",
                    name = "tool",
                    arguments = "{}",
                    response = ToolResponse(
                        id = "call_1",
                        name = "tool",
                        response = SuccessToolCallWithMessageResponse("result")
                    )
                )
            )
        )
    )
    
    val status = HistoryValidator.validateHistory(SimpleHistory(history))
    
    assertThat(status).isEqualTo(Status.AssistantOrUserTurnAfterToolCall)
}
```

## Acceptance Criteria

- [ ] Test file found and updated
- [ ] All references to `Message.AssistantMessage` replaced with `Message.AgentTurn`
- [ ] All references to `Message.ToolResponseMessage` removed
- [ ] Tests for `Status.UnprocessedToolCalls` removed
- [ ] Tests for `CorruptedReason.IncompleteToolCalls` added
- [ ] Tests for valid `AgentTurn` with completed tool calls added
- [ ] Tests for valid `AgentTurn` without tool calls (regular assistant response) added
- [ ] All existing validation rules still tested (system message position, user after user, etc.)
- [ ] All tests pass
- [ ] Test coverage is maintained or improved

## Notes

- This task verifies that the simplified validation logic from Task 04 works correctly
- The tests should be easier to understand now since there's no cross-message state tracking
- Consider adding property-based tests or parameterized tests to cover more edge cases
- Make sure to test the helper functions (`appendAssistantMessage`, `appendToolCallWithResult`) if they have dedicated tests
