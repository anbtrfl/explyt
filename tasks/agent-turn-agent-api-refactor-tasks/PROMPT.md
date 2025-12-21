# Task Execution Prompt

You are working on the **Message to MessageNew Migration** in the `agent-api` module.

## Your Assignment

1. **Read** `platform/agent-api/tasks/CONTEXT.md` to understand what has been completed
2. **Find** the first incomplete task in the tasks folder
3. **Execute** that task following the steps below

---

## Execution Steps:

1. **Read Context File**
   - Review `platform/agent-api/tasks/CONTEXT.md` for background information
   - Check what previous agents have completed and learned
   - Note any important decisions or issues encountered

2. **Read Your Task File**
   - Open your specific task file: `platform/agent-api/tasks/task-XX-[name].md`
   - Understand the goal, description, and acceptance criteria
   - Review the caveats and key points carefully

3. **Execute the Task**
   - Make the required code changes following the task specification
   - Test that your changes compile without errors
   - Verify all acceptance criteria are met
   - Follow the coding style and best practices of the project

4. **Provide Brief Summary**
   - **Keep it concise** - 3-5 bullet points maximum
   - Summarize key changes made
   - Note any problems encountered and how you solved them
   - Mention any deviations from the original plan
   - Highlight anything important for the next agent

5. **Update Context File**
   - Add your task to the "Completed Tasks" section
   - Document any key decisions made
   - Record any issues encountered and solutions
   - Add important notes for future agents

6. **Await Approval**
   - Present your summary and wait for user confirmation
   - Do not commit changes until approved
   - Be ready to make adjustments if requested

7. **Think on New Tasks or Reordering**
   - Carefully review found problems/deviations while implementing this task
   - Review the existing incomplete tasks
   - **Read** `.explyt/workflows/generate_tasks_list.md` to understand task creation guidelines
   - Consider adding new tasks or changing/reordering/removing existing ones
   - Do not suggest changes if everything looks OK

8. **Update Tasks**
   - Update reflected tasks based on approved suggestions
   - Modify task files as needed
   - Update task numbering if reordering occurred
   - Update CONTEXT.md with information about modified tasks

9. **Await Tasks Modifying Approval**
   - Present the suggested tasks update to the user
   - Wait for approval before proceeding
   - Be ready to make further adjustments if requested

10. **Commit Changes**
   - After approval, commit with a descriptive message
   - Format: `"[Task XX] Brief description of changes"`
   - Example: `"[Task 03] Migrate AgentAiConverterUtils to new Message model"`

---

## Example Execution

```
Task: 03 - Migrate AgentAiConverterUtils.kt
Context File: platform/agent-api/tasks/CONTEXT.md
Task File: platform/agent-api/tasks/task-03-migrate-converter-utils.md

Working on: Updating conversion functions to work with Message.AgentTurn

[... makes changes ...]

Summary:
- Updated Message.toAiMessage() to handle AgentTurn with embedded tool responses
- Changed imports from MessageOld to Message
- Added list conversion function to handle splitting AgentTurn into multiple AI messages
- All conversion functions compile and maintain backward compatibility

Context Updated: Added note about list conversion approach for AgentTurn splitting

Ready for review and approval.

[After approval, reviews incomplete tasks and suggests no changes needed]

Committing changes...
```

---

## Important Reminders

- ✅ **Be concise** in your summaries - the user wants to glance and approve quickly
- ✅ **Update context** before awaiting approval so it's included in the review
- ✅ **Wait for approval** before thinking about task modifications
- ✅ **Think about task changes** after main work is approved but before committing
- ✅ **Test compilation** after your changes
- ✅ **Follow acceptance criteria** exactly as specified in the task
- ✅ **Work only in agent-api module** - don't modify other modules
