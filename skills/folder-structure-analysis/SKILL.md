---
name: folder-structure-analysis
description: Analyze and summarize folder/module structure of the given code scope.
use-by:
  - agent-2
  - analyzer
---

## Goal
Build a clear picture of how the selected scope is organized and where the important code likely lives.

## Inputs
- Code scope selected by user: `project` / `folder(s)` / `file(s)`
- Depth: Shallow or Deep

## Pre-flight
- If scope is `file(s)`, skip directory tree and instead describe: package, neighboring files, and which module it belongs to (infer from path).

## Shallow mode (fast)

1. Capture the tree:
   - Use `list_dir` for the selected scope.
   - Start with depth 2.
   - Increase to 3-4 only for directories that look important (e.g., `src`, `resources`, `plugin`, `platform`, `intellij`, `core`, `api`).
2. Identify structural landmarks (only from names + minimal reads):
   - Gradle modules: `settings.gradle(.kts)` and module directories
   - Source roots: `src/main`, `src/test`, `resources`, `kotlin`, `java`
   - Plugin/IDEA descriptors: `plugin.xml`, `META-INF`, `intellij-plugin.xml`
   - Docs/config: `README`, `docs`, `.github`, `buildSrc`
3. Output a concise map:
   - 5-20 key folders/modules with 1-line purpose guesses
   - 3-10 “where to look first” hints

## Deep mode (thorough)

1. Do everything from Shallow.
2. Confirm the guessed roles by spot-reading only the smallest relevant build/descriptors:
   - Use `search_file_by_name` for `build.gradle.kts`, `plugin.xml`, `*Extension*`, `*Action*`, etc.
   - Use `read_file` for *small* config/descriptors to validate responsibilities.
3. Produce a module/layer model:
   - group packages/folders into layers (api/domain/service/infra/ui)
   - identify shared modules vs feature modules
   - note generated code or build-time tooling if present

## Output

Write a structure summary in a consistent format:

- Scope
- Tree (trimmed)
- Modules / key directories (table or bullets)
- Notable conventions (naming patterns, layer boundaries)
- “Start here” pointers
