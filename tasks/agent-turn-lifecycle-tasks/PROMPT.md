# Agent Turn Lifecycle Refactoring - Task Execution Instructions

## Your Mission

You are refactoring the agent turn lifecycle in the Explyt Agent API to ensure `startAgentTurn()` and `endAgentTurn()` are always called for every LLM query. The goal is to eliminate conditional logic and simplify the code by making every LLM query create an agent turn, even if it returns no content.

**Context File:** `platform/agent-api/agent-turn-lifecycle-tasks/CONTEXT.md`
**Tasks Directory:** `platform/agent-api/agent-turn-lifecycle-tasks/`

## Execution Steps

### 1. Read Context
Review the context file for:
- The current vs. target structure
- The rationale for this refactoring
- Key architectural decisions about agent turn lifecycle
- The next incomplete task to work on
- Information from previous agents
- Key decisions and learnings

### 2. Understand Your Task
Read your task file: `platform/agent-api/agent-turn-lifecycle-tasks/task-XX-[name].md`
- **Goal** - What you're trying to achieve
- **Description** - Detailed explanation
- **Caveats & Key Points** - Important considerations
- **Main Changes** - Specific files to modify
- **Acceptance Criteria** - How to know you're done

### 3. Execute the Task
- Make necessary code changes to the specified files
- Remove conditional logic around `startAgentTurn()` / `endAgentTurn()`
- Ensure `startAgentTurn()` is called before processing events
- Ensure `endAgentTurn()` is called in `onCompletion`
- Verify empty agent turns are handled correctly
- Ensure code compiles without errors
- Verify all acceptance criteria are met

### 4. Provide a BRIEF Summary (2-4 sentences)
- Key changes made
- Problems encountered and solutions
- Any deviations from the plan

### 5. Update Context
Update the context file:
- Mark task as completed in the Progress Tracking section
- Document key decisions in the Key Learnings section
- Note any issues in the Issues Encountered section

### 6. Await Approval
Wait for user confirmation before proceeding.

### 7. Review Task List (MANDATORY)
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

### 8. Present Task List Review (MANDATORY)
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

### 9. Update Task Files (if approved)
- Modify/create task files as needed
- Update task numbering if reordered
- Update CONTEXT.md with task list changes
- Document rationale for changes in CONTEXT.md

### 10. Commit Changes
Commit with descriptive message:
```
git commit -m "refactor(agent-api): [brief description of changes]"
```

## Important Notes

- Keep summary brief (2-4 sentences)
- Focus on compilation errors first
- Ask for guidance if stuck
- **NEVER skip Steps 7-8** - task list review is mandatory
- Always present your review findings, even if no changes needed
- Task list maintenance is part of your responsibility
- Empty agent turns are valid and expected after this refactoring
- `onCompletion` is called even on errors/cancellation, ensuring `endAgentTurn()` is always called

## Example Task Execution

**Task:** Refactor AgentExecutor to Always Call startAgentTurn/endAgentTurn

**Execution:**
1. Read CONTEXT.md and task-01-refactor-agent-executor.md
2. Open AgentExecutor.kt
3. Remove `addedMessage` variable and helper functions
4. Add `history.startAgentTurn()` before events flow
5. Move `history.endAgentTurn()` to `onCompletion`
6. Remove conditional calls from event handlers
7. Verify code compiles
8. Update CONTEXT.md with completion status

**Summary:**
"Refactored AgentExecutor to always call startAgentTurn/endAgentTurn. Removed addedMessage flag and helper functions. Simplified event handling by removing all conditional logic. Every LLM query now creates an agent turn."
