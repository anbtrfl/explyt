# Task 03: Update Tests for Always-Created Agent Turns

## Goal
Update tests to reflect the new behavior where agent turns are always created for every LLM query.

## Description
After Task 01, the AgentExecutor always creates an agent turn, even if the LLM returns no events. Tests that verify the history structure or agent turn creation may need to be updated.

## Caveats & Key Points

### Test Categories to Review

1. **AgentExecutor Tests** - May expect no agent turn when LLM returns nothing
2. **History Validator Tests** - Should already handle empty agent turns, but verify
3. **Integration Tests** - May have assertions about history structure

### What to Look For

- Tests that assert the number of messages in history
- Tests that check for the absence of agent turns in certain scenarios
- Tests that verify history structure after LLM queries
- Mock expectations for `startAgentTurn()` / `endAgentTurn()` calls

### Potential Changes

- Update assertions to expect an agent turn even when LLM returns nothing
- Add tests for empty agent turns
- Update mock verifications to expect `startAgentTurn()` / `endAgentTurn()` to always be called

## Main Changes

### Files to Review

1. **`platform/agent-api/src/test/kotlin/com/explyt/agent/v4/HistoryValidatorTest.kt`**
   - Verify tests handle empty agent turns
   - Add test cases if needed

2. **Search for AgentExecutor tests**
   - Look for tests that verify agent turn creation
   - Update assertions if needed

3. **Search for integration tests**
   - Look for tests that verify history structure
   - Update expectations if needed

## Acceptance Criteria

1. ✅ All existing tests pass with the new behavior
2. ✅ Tests that verify history structure are updated (if needed)
3. ✅ Tests that mock `startAgentTurn()` / `endAgentTurn()` are updated (if needed)
4. ✅ Add test case for empty agent turn if not already present
5. ✅ No test failures related to agent turn creation
6. ✅ Code compiles without errors
