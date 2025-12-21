# In-Memory History Implementation - Task Execution Instructions

## Your Mission

Implement a simple in-memory implementation of the `MutableHistory` interface with comprehensive tests. This implementation will serve as a reference for testing and simple use cases.

**Context File:** `.tasks/in-memory-history-implementation/CONTEXT.md`
**Tasks Directory:** `.tasks/in-memory-history-implementation/`

## Execution Steps

### 1. Read Context
Review the context file for:
- The `MutableHistory` interface definition and its methods
- Message types and their structure
- Existing test patterns in the codebase
- The next incomplete task to work on
- Information from previous agents (if any)

### 2. Understand Your Task
Read your task file: `.tasks/in-memory-history-implementation/task-XX-[name].md`
- **Goal** - What you're trying to achieve
- **Description** - Detailed explanation
- **Caveats & Key Points** - Important considerations
- **Main Changes** - Specific files to create/modify
- **Acceptance Criteria** - How to know you're done

### 3. Execute the Task
- Create the necessary files (implementation or tests)
- Follow Kotlin best practices and project conventions
- Ensure code compiles without errors
- For tests: run them and ensure they all pass
- Verify all acceptance criteria are met

### 4. Update Context
Update the context file (CONTEXT.md):
- Move your task from "Pending" to "Completed"
- Document key decisions made during implementation
- Note any issues encountered and how they were resolved
- Add any learnings to the "Shared Knowledge" section

### 5. Await Approval (MANDATORY)
**This step is REQUIRED - do not skip it.**
Wait for user confirmation before proceeding.

### 6. Review Task List (MANDATORY)
**This step is REQUIRED - do not skip it.**

Carefully analyze the task list based on your experience:

**Review Checklist:**
- ✅ Did you encounter unexpected complexity or issues?
- ✅ Are remaining tasks still accurate given what you learned?
- ✅ Should any tasks be split into smaller pieces?
- ✅ Should any tasks be merged or removed?
- ✅ Do tasks need reordering based on new dependencies?
- ✅ Are there missing tasks that should be added?

**Your Responsibility:**
- Actively maintain the task list quality
- Think critically about the remaining work
- Propose improvements even if small
- It's OK to say "no changes needed" but you MUST review first

### 7. Present Task List Review (MANDATORY)
**Always present your review findings to the user.**

Provide one of these responses:

**Option A - Changes Recommended:**

    Task List Review:
    - [Specific change 1 with rationale]
    - [Specific change 2 with rationale]
    - [etc.]
    
    Should I proceed with these updates?

**Option B - No Changes Needed:**

    Task List Review:
    I reviewed all remaining tasks against my experience with this task.
    No changes needed - the task list remains accurate and well-structured.

**Always await user approval before proceeding.**

### 8. Update Task Files (if approved)
- Modify/create task files as needed
- Update task numbering if reordered
- Update CONTEXT.md with task list changes
- Document rationale for changes in CONTEXT.md

### 9. Commit Changes
Commit with descriptive message following the pattern:
```
feat(agent-api): [brief description of what was implemented]
```

For example:
- `feat(agent-api): add InMemoryHistory implementation`
- `feat(agent-api): add comprehensive tests for InMemoryHistory`

## Important Notes

- Use suspend functions appropriately - all MutableHistory methods are suspend
- Follow existing test patterns from `HistoryValidatorTest`
- Keep the implementation simple and clear
- Use descriptive test names with backticks
- Ensure tests use `runTest` for suspend function testing
- **NEVER skip Steps 6-7** - task list review is mandatory
- Always present your review findings, even if no changes needed

## Example Task Execution

**Task 01 Example:**

1. Read CONTEXT.md and task-01 file
2. Create `InMemoryHistory.kt` in `platform/agent-api/src/main/kotlin/com/explyt/agent/v4/`
3. Implement all MutableHistory methods
4. Ensure code compiles
5. Update CONTEXT.md marking Task 01 as complete
6. Present completion to user and await approval
7. Review task list (e.g., "Task 02 looks good, no changes needed")
8. Commit: `feat(agent-api): add InMemoryHistory implementation`

**Task 02 Example:**

1. Read CONTEXT.md and task-02 file
2. Create `InMemoryHistoryTest.kt` in `platform/agent-api/src/test/kotlin/com/explyt/agent/v4/`
3. Write comprehensive tests covering all scenarios
4. Run tests and ensure they all pass
5. Update CONTEXT.md marking Task 02 as complete
6. Present completion to user and await approval
7. Review task list (all tasks complete!)
8. Commit: `feat(agent-api): add comprehensive tests for InMemoryHistory`
