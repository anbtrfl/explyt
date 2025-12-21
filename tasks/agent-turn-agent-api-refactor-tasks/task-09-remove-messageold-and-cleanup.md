# Task 09: Remove MessageOld and Final Cleanup

## Goal

Remove the deprecated `MessageOld` sealed interface and perform final cleanup to complete the migration.

## Description

This is the final task that removes all traces of the old message model. By this point, all files should be using the new `Message` model, so `MessageOld` should have no usages.

Steps:
1. Verify no files reference `MessageOld`
2. Remove `MessageOld` sealed interface and all its nested types
3. Remove any old utility functions that only worked with `MessageOld`
4. Run final compilation check
5. Update documentation/comments if needed

## Caveats & Key Points

- **Critical:** Only proceed if all previous tasks are complete
- Search for any remaining `MessageOld` references before deleting
- Some utility functions might still reference old `ToolResponse` patterns
- Ensure no test files reference `MessageOld`
- This is a breaking change for any external code using the old model

## Main Changes

**File:** `platform/agent-api/src/main/kotlin/com/explyt/agent/llm/Message.kt`

### Step 1: Search for MessageOld Usages

Run searches to verify no usages:
```bash
# Search in main code
grep -r "MessageOld" platform/agent-api/src/main/kotlin/

# Search in test code
grep -r "MessageOld" platform/agent-api/src/test/
```

### Step 2: Remove MessageOld Definition

Delete the entire `MessageOld` sealed interface and all nested types:
- `sealed interface MessageOld` (around line 79)
- `MessageOld.UserMessage`
- `MessageOld.SystemMessage`
- `MessageOld.AssistantMessage`
- `MessageOld.ToolResponseMessage`

### Step 3: Clean Up Old Utilities

Review and potentially remove:
- Any conversion functions specific to `MessageOld`
- Any validation logic specific to old message structure
- Any comments referencing the old model

### Step 4: Update Documentation

Update any TODO comments or documentation:
- Remove `// TODO: refactor completely` comment if it exists
- Update file header comments if they reference the old model
- Update any inline documentation

### Step 5: Final Verification

1. Compile the entire `agent-api` module
2. Run all tests in the module
3. Check for any deprecation warnings
4. Verify no compilation errors

## Acceptance Criteria

- [ ] No references to `MessageOld` exist in main code
- [ ] No references to `MessageOld` exist in test code
- [ ] `MessageOld` sealed interface completely removed from `Message.kt`
- [ ] All nested `MessageOld` types removed
- [ ] Old utility functions removed or updated
- [ ] Documentation updated to reflect new model
- [ ] Entire `agent-api` module compiles without errors
- [ ] All tests pass
- [ ] No deprecation warnings related to messages
- [ ] Code is clean and ready for production use

## Post-Migration Verification

After completing this task, verify:
1. The new `Message` model is the only message model in the codebase
2. All message operations use the unified `AgentTurn` approach
3. Tool call/response matching is simpler than before
4. History validation is clearer and more maintainable
5. No performance regressions introduced
