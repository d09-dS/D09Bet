---
description: "Phase 3: Enhance base rules + extend workflows (called automatically by /project-init)"
---

# Phase 3: Base Rule Enhancement + Workflow Extension

This phase is called automatically after Phase 2 (rule generation). Do NOT run this manually -- use `/project-init` instead.

**Prerequisites:** `.windsurf/project-init-config.json` must exist with `_progress.phase2_generation: true`.

---

## 3.1a Online Reference Fetch for Enhancement

Phase 3 runs as a separate workflow file. The online content fetched during Phase 2 (section 2.3a) is no longer available in context. Re-fetch the relevant URLs before enhancing rules or extending workflows.

### Steps

1. **Read the config** -- load `.windsurf/project-init-config.json` and determine the active stack values
2. **Resolve URLs** -- match stack values against the Verified Reference Mappings table in `_ref/reference-sources.md`
3. **Fetch with `read_url_content`** -- call the tool for each resolved URL. Fetch independent URLs in parallel where possible.
   - **Stack-specific:** skills.sh + windsurf.run URLs matching the detected stack (same URLs as Phase 2)
   - **Official framework docs** for stack-specific patterns (e.g. NestJS testing docs, Django migration docs, Angular CLI docs)
   - **Quality standard:** `agentskills.io/skill-creation/best-practices` (to ensure enhancements meet quality bar)
4. **Handle failures** -- if any URL is unreachable: apply the Fallback Strategy from `_ref/reference-sources.md`. Never abort enhancement.
5. **Hold content in context** -- the fetched content serves as reference for both 3.1 (Rule Enhancement) and 3.2 (Workflow Extension)

### URL Selection Guide

| Enhancement Target       | URLs to Fetch                                                               |
| ------------------------ | --------------------------------------------------------------------------- |
| Security enhancements    | OWASP Cheat Sheets + stack-specific security docs                           |
| Testing enhancements     | Stack-specific testing docs (e.g. Jest, Vitest, pytest, Go testing)         |
| Performance enhancements | web.dev/learn/performance + stack-specific optimization guides              |
| API enhancements         | skills.sh API design + official framework API docs                          |
| Workflow extensions      | skills.sh + windsurf.run for CLI commands, migration steps, deploy patterns |

---

## 3.1 Dynamic Base Rule Enhancement

When stack-specific rules were generated in Phase 2, the 8 base rules must now be **enhanced** with deeper, stack-specific content.

Read `.windsurf/workflows/_ref/enhancement-examples.md` for the full list of enhancement examples per stack.

**Marking Rule -- every added block must start with this header:**

```markdown
> Stack-enhancement by /project-init -- Stack: [framework] -- Remove if stack changes
```

This makes enhancements identifiable and reversible. Example:

```markdown
## NestJS Authentication & Guards

> Stack-enhancement by /project-init -- Stack: NestJS -- Remove if stack changes

... NestJS-specific content ...
```

### Enhancement Process

1. **Read the config** -- identify all selected technologies
2. **Read `_ref/enhancement-examples.md`** -- find matching enhancement instructions
3. **Use fetched online content** -- for each enhancement, cross-reference the fetched content from 3.1a to enrich the enhancement with real patterns, commands, and configurations from skills.sh, windsurf.run, and official docs
4. **Cross-reference** -- compare the enhancement-examples.md suggestions against the fetched online content. If the online sources contain better or additional patterns, prefer the online content.
5. **For each base rule that needs enhancement:**
   - Read the current content of the base rule file
   - Append the stack-specific sections at the end of the file
   - Each section must start with the marking header
   - Include concrete code examples and CLI commands from the fetched online content where applicable
6. **Verify** -- confirm each base rule was updated

### What to Enhance

For every stack-specific rule generated in Phase 2, enhance the relevant base rules:

- **Security rules** get framework-specific security patterns (CSRF, auth, middleware)
- **Testing rules** get framework-specific test patterns (test runners, fixtures, mocking)
- **Performance rules** get framework-specific optimization patterns (caching, queries, rendering)
- **Error handling rules** get framework-specific error patterns (exceptions, boundaries)
- **API standards rules** get validation and schema patterns
- **Accessibility rules** get UI library-specific ARIA patterns
- **Code quality rules** get framework-specific composition/design patterns

---

## 3.2 Workflow Extension

Based on selected stack, **add or enhance** workflows in `.windsurf/workflows/`.

Read `.windsurf/workflows/_ref/workflow-extension-map.md` for the full mapping of stack selections to workflow enhancements.

**Marking Rule -- every added workflow step must start with this header:**

```markdown
## Step Nb: [Description] (Stack: [framework])

> Auto-added by /project-init -- Stack: [framework] -- Remove if stack changes
```

### Extension Process

1. **Read the config** -- identify all selected technologies
2. **Read `_ref/workflow-extension-map.md`** -- find matching workflow extensions
3. **Use fetched online content** -- enrich each workflow extension with real framework-specific patterns from the content fetched in 3.1a:
   - Concrete CLI commands (e.g. `ng test --code-coverage`, `python manage.py makemigrations`, `go test ./...`)
   - Real configuration snippets from official docs
   - Framework-specific test runners, migration tools, and deployment steps
4. **Cross-reference** -- compare the workflow-extension-map.md entries against the fetched online content. If the online sources provide more specific or up-to-date commands/patterns, use those instead.
5. **For each workflow that needs extension:**
   - Read the current content of the workflow file
   - Append new steps or sections at the appropriate location
   - Each addition must start with the marking header
   - Include copy-pastable commands where possible
6. **Verify** -- confirm each workflow was updated

---

## Gotchas

- **Enhancement exceeds the 12,000 character limit** -- appending stack-specific sections to a base rule can push it over the Windsurf hard limit. Check character count after each enhancement and split into a separate rule file if necessary.
- **Missing marking header makes enhancements irreversible** -- every added block must start with `> Stack-enhancement by /project-init -- Stack: [framework]`. Without it, future re-runs cannot identify and replace old enhancements.
- **Overwriting existing stack sections** -- if a base rule already contains Go or Rust examples, do not duplicate them. Check for existing sections before appending.
- **Workflow extension breaks step numbering** -- when appending steps to an existing workflow, verify that step numbers are sequential and do not collide with existing steps.

---

## Phase Complete

After enhancing all base rules and extending workflows:

1. Verify all enhanced files are valid Markdown with correct frontmatter
2. If any enhancement failed: report the error and suggest re-running Phase 3
3. Update `_progress.phase3_enhancement` to `true` in `.windsurf/project-init-config.json`
4. Update `_progress.phase3_completed_at` to the current ISO timestamp
5. Tell the user: "Base rules enhanced and workflows extended. Starting quality analysis..."
6. **Immediately** read and follow `.windsurf/workflows/project-init-quality.md`

---

## Rollback

If Phase 3 needs to be re-run or produced bad results:

1. Use version control to restore `.windsurf/rules/` to the pre-enhancement state (e.g. `git checkout -- .windsurf/rules/`)
2. Set `_progress.phase3_enhancement` to `false` in the config
3. Re-run Phase 3
