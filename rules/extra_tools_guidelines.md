---
filePattern: "**/*"
---

1. Prefer using terminal tools for gradle/maven with grep for getting compilation errors.

2. Analysis tools (e.g., when getting compilation errors) works well for single files, not directories.

3. When commiting something, use concise commit names:
`feat [scope]: add XX implementation`
`fix [scope]: bug XX`
`docs [scope]: add comments for XX`
`wip [scope]: fix CEs for file XX`

4. When commiting something, stage files in the same command.
5. Files from `.gitignore` shouldn't be commited!
