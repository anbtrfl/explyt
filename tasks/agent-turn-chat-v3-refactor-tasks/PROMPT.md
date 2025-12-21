# ij-chat-v3 Message API Migration - Task Execution Instructions

## Your Mission

Migrate the `ij-chat-v3` module to use the new unified `Message.AgentTurn` API from `agent-api`. The `agent-api` module has already been successfully migrated from the old two-message model (separate `AssistantMessage` and `ToolResponseMessage`) to the new unified `AgentTurn` model where tool calls and their responses are embedded together in a single atomic unit.

**Context File:** `platform/ij-chat-v3/tasks/CONTEXT.md`
**Tasks Directory:** `platform/ij-chat-v3/tasks/`

## Execution Steps

### 1. Read Context
Review the context file for:
- The architectural changes from old to new Message API
- The list of files that need migration
- The next incomplete task to work on
- Information from previous agents
- Key decisions and learnings

### 2. Understand Your Task
Read your task file: `platform/ij-chat-v3/tasks/task-XX-[name].md`
- **Goal** - What you're trying to achieve
- **Description** - Detailed explanation
- **Caveats & Key Points** - Important considerations
- **Main Changes** - Specific files to modify
- **Acceptance Criteria** - How to know you're done

### 3. Execute the Task
- Make necessary code changes
- Follow the patterns established in the `agent-api` migration (see `platform/agent-api/tasks/CONTEXT.md` for reference)
- Ensure code compiles without errors
- Verify all acceptance criteria are met
- For serialization changes, ensure backward compatibility with old saved chats

### 4. Provide a BRIEF Summary (2-4 sentences)
- Key changes made
- Problems encountered and solutions
- Any deviations from the plan

### 5. Update Context
Update the context file (`platform/ij-chat-v3/tasks/CONTEXT.md`):
- Mark task as completed in the "Completed Tasks" section
- Document key decisions in "Key Decisions Made"
- Note any issues or discoveries in "Issues Encountered"
- Add important notes in "Important Notes"

### 6. Await Approval
Wait for user confirmation before proceeding.

### 7. Analyze Task List
Consider if task list needs updates:
- Review problems encountered
- Review remaining tasks
- Consider adding/reordering/removing tasks
- **Do not suggest changes if everything looks OK**

### 8. Present Suggestions (if needed)
If task list needs updates:
- Describe proposed changes
- Explain rationale
- Await approval

If no changes needed, skip to Step 10.

### 9. Update Task Files (if approved)
- Modify/create task files as needed
- Update task numbering if reordered
- Update CONTEXT.md with new task list

### 10. Commit Changes
Commit with descriptive message following this pattern:
```
[ij-chat-v3] Task XX: Brief description

- Key change 1
- Key change 2
- Key change 3
```

## Important Notes

- The `agent-api` module is already fully migrated - use it as a reference
- The new `MutableHistory` API has different method names and signatures
- Tool calls and responses are now unified in `Message.AgentTurn.ToolCall`
- Maintain backward compatibility for serialization (old chats must load)
- Keep summary brief (2-4 sentences)
- Focus on compilation errors first
- Ask for guidance if stuck

## Example Task Execution

**Task 00: Identify All Compilation Errors**

1. Read context and task file
2. Run static analysis: `get_static_ide_analysis` on `platform/ij-chat-v3`
3. Document all errors in CONTEXT.md under "Compilation Errors (from Task 00)"
4. Categorize errors by type
5. Identify files with most errors
6. Verify task list covers all affected files
7. Summary: "Identified 23 compilation errors across 8 files. Most errors are in MessageListViewModel (method signature mismatches) and test files (missing types). All affected files are covered by existing tasks."
8. Update CONTEXT.md
9. Commit changes

**Task 01: Update MessageListViewModel**

1. Read context and task file
2. Update method signatures:
   - `appendStartOfAssistantMessage()` → `startAgentTurn()`
   - `appendEndOfAssistantMessage()` → `endAgentTurn()`
   - Update `appendToolCallStarted()` to accept `Message.AgentTurn.ToolCall`
   - Update `appendToolCallFinished()` to accept `toolCallId: String` and `ToolResponse`
3. Update `repairHistory()` to handle `Message.AgentTurn`
4. Add necessary imports
5. Verify compilation
6. Summary: "Updated MessageListViewModel to implement new MutableHistory API. Renamed methods and updated signatures to work with Message.AgentTurn. Updated repairHistory() to check for AgentTurn instead of AssistantMessage."
7. Update CONTEXT.md
8. Commit changes
