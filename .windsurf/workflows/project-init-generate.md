---
description: "Phase 2: Generate base rules + stack-specific rules (called automatically by /project-init)"
---

# Phase 2: Rule Generation

This phase is called automatically after Phase 1 (stack detection). Do NOT run this manually -- use `/project-init` instead.

**Prerequisites:** `.windsurf/project-init-config.json` must exist with `_progress.phase1_detection: true`.

---

## 2.1 Base Rules (Always Generated)

These 8 rules are **always** created regardless of tech stack selection:

| Rule File           | Description                  |
| ------------------- | ---------------------------- |
| `code-quality.md`   | Clean Code, SOLID principles |
| `security.md`       | Security best practices      |
| `error-handling.md` | Error handling patterns      |
| `performance.md`    | Performance optimization     |
| `accessibility.md`  | A11y requirements            |
| `api-standards.md`  | REST API conventions         |
| `i18n.md`           | Internationalization         |
| `testing.md`        | Testing standards            |

## 2.2 Stack-Specific Rules (Conditional)

Read the full mapping from `.windsurf/workflows/_ref/stack-rule-mapping.md` to determine which additional rule files to create based on the config values.

## 2.3 Reference Sources

Read `.windsurf/workflows/_ref/reference-sources.md` for the full list of sources to consult.

**Procedure:** Follow the URL Selection, Fetch Order, and Fetch Execution steps defined in `_ref/reference-sources.md`. The actual fetching happens in section 2.3a below.

## 2.3a Online Reference Fetch

Before generating any rules, fetch the relevant online references so all subsequent steps can use real content instead of training knowledge.

### Steps

1. **Read the config** -- load `.windsurf/project-init-config.json` and determine the active stack values (`frontend.framework`, `backend.framework`, `testing.e2e`, `frontend.styling`, etc.)
2. **Resolve URLs** -- match the stack values against the Verified Reference Mappings table in `_ref/reference-sources.md`. Collect all matching URLs.
   - For direct URL entries: use as-is
   - For "Search" entries (e.g. `Search skills.sh for angular`): use `search_web` with query `site:skills.sh angular` to discover the actual URL
3. **Fetch with `read_url_content`** -- call the tool for each resolved URL. Fetch independent URLs in parallel where possible.
   - **Always fetch:** `agentskills.io/skill-creation/best-practices` (quality baseline for every rule)
   - **Always fetch:** `agentskills.io/skill-creation/evaluating-skills` (instruction quality patterns)
   - **Always fetch:** `docs.windsurf.com/windsurf/cascade/memories` (activation mode + context cost rules)
   - **Stack-specific:** skills.sh + windsurf.run URLs matching the detected stack
   - **Cross-cutting:** OWASP (if security rules needed), web.dev (if performance/accessibility rules needed)
4. **Handle failures** -- if any URL returns 404, 403, or times out: log the failure and apply the Fallback Strategy from `_ref/reference-sources.md`. Never abort generation.
5. **Hold content in context** -- the fetched content serves as primary reference for steps 2.4 through 2.8

---

## 2.4 Generation Process

1. **Analyze config** -- Read `.windsurf/project-init-config.json`. Determine which technologies were selected. Use `meta.programmingLanguages` to select appropriate globs.
2. **Use fetched references** -- use the content fetched in 2.3a as primary reference for stack-specific patterns, best practices, and code examples from skills.sh + windsurf.run + official docs
3. **Apply skill quality standard** -- use the fetched content from `agentskills.io/skill-creation/best-practices` (loaded in 2.3a) to validate structure of every generated rule
4. **Apply instruction quality patterns** -- use the fetched content from `agentskills.io/skill-creation/evaluating-skills` (loaded in 2.3a) for reasoning-based instructions, lean skill principles, and assertion design patterns
5. **Apply activation mode best practices** -- use the fetched content from `docs.windsurf.com/windsurf/cascade/memories` (loaded in 2.3a) for context cost awareness: `always_on` rules consume context on every message, so keep them concise (< 6000 chars). Use `glob` or `model_decision` for larger rules.
6. **Create rules dynamically** -- Generate the appropriate rule file in `.windsurf/rules/` for each stack entry
7. **Embed best practices** -- Combine community best practices with SOLID principles

## 2.5 Rule Content Guidelines

Each generated rule file should contain:

- **Frontmatter** with `description`, `trigger: glob`, and `globs` (matching the selected stack) -- see `agentskills.io/skill-creation/best-practices` for format spec
- **Clear rules** for the respective technology (inspired by skills.sh / windsurf.run / official docs)
- **Do's and Don'ts** with code examples **in the selected language/framework**
- **SOLID principles** where applicable
- **Security rules** must reference `cheatsheetseries.owasp.org` for concrete patterns
- **Performance rules** must reference `web.dev/learn/performance` for Core Web Vitals (INP, LCP, CLS)
- **Accessibility rules** must reference `web.dev/learn/accessibility` for WCAG 2.1 AA patterns
- **Reasoning-based instructions** -- explain WHY, not just WHAT: "Do X because Y causes Z" instead of "ALWAYS do X" (source: `agentskills.io/skill-creation/evaluating-skills`)
- **Procedures over declarations** -- complex operations need step-by-step procedures, not just declarative statements (source: `agentskills.io/skill-creation/best-practices`)
- **Defaults over menus** -- provide clear defaults with escape hatches, not equal-weight option lists (source: `agentskills.io/skill-creation/best-practices`)

Read `.windsurf/workflows/_ref/globs-mapping.md` for the full stack-to-globs table.

## 2.6 Stack-Adaptive Code Examples

**IMPORTANT:** All base rules must use code examples that match the selected tech stack.

Read `.windsurf/workflows/_ref/code-examples-mapping.md` for the full stack-to-code-style table.

---

## Gotchas

- **Generating generic JS examples for non-JS stacks** -- if the config specifies Go, Rust, or Python, all code examples must use that language. Never fall back to TypeScript/JavaScript examples just because they are easier to write.
- **Exceeding the 12,000 character Windsurf limit** -- generated rules with many stack-specific sections can silently get truncated. Check character count before writing.
- **Forgetting `globs` in frontmatter** -- a rule with `trigger: glob` but no `globs` field will never activate. Always include both.
- **Duplicate rule content across files** -- if `security.md` already covers input validation, do not repeat the same content in a stack-specific `nestjs-security.md`. Reference the base rule instead.
- **Unreachable reference URLs blocking generation** -- never skip rule generation because a reference URL returns 404. Follow the fallback strategy in `_ref/reference-sources.md`.

---

## 2.7 Update AGENTS.md

After all rules are generated, update the "Active Rules" section in `AGENTS.md` to reflect the actual rule files.

### With Config Server (recommended)

If the config server is running, call the update endpoint:

```bash
curl http://localhost:3847/update-agents-md-rules
```

This reads all `.md` files in `.windsurf/rules/`, extracts their `trigger` mode and `globs`, and replaces the `<!-- ASP:active-rules:BEGIN -->` / `<!-- ASP:active-rules:END -->` block in `AGENTS.md`.

### Without Config Server

Manually update the `<!-- ASP:active-rules:BEGIN -->` section in `AGENTS.md`:

1. List all `.md` files in `.windsurf/rules/`
2. For each file, read its frontmatter `trigger` and `globs` fields
3. Replace the content between `<!-- ASP:active-rules:BEGIN -->` and `<!-- ASP:active-rules:END -->` with the updated rule list

### AGENTS.md Merge (automatic)

The AGENTS.md merge happens automatically during `/save-config`. It uses ASP section markers (`<!-- ASP:section-name:BEGIN/END -->`) to:

- **Preserve** all project-specific content outside ASP markers
- **Update** ASP-managed sections (rules, workflows, dashboard docs)
- **Create a backup** in `.windsurf/backups/` before any modification

If a project already has an `AGENTS.md` without ASP markers, the merge wraps the existing content under a "Project-Specific Documentation" heading and appends ASP sections below.

Manual merge trigger: `curl http://localhost:3847/merge-agents-md`

This ensures E8 validation passes.

---

## 2.8 Online Content Comparison

After all rules are generated and AGENTS.md is updated, systematically compare each generated rule against the online content fetched in 2.3a.

### Process

1. **For each generated rule file** in `.windsurf/rules/`:
   - Identify which fetched online sources are relevant (e.g. skills.sh content for stack rules, OWASP for security, web.dev for performance)
   - Compare the rule content against the fetched reference material
   - Check for **missing patterns** -- best practices present in the online content but absent from the rule
   - Check for **missing gotchas** -- anti-patterns or common mistakes documented in the sources but not covered
   - Check for **outdated practices** -- patterns in the rule that contradict current online recommendations

2. **For each gap found:**
   - Append the missing pattern to the appropriate section of the rule file
   - Adapt code examples from the online content to the project context (do not copy verbatim)
   - Use the marking format from Phase 3 if adding new sections: `> Online-reference addition -- Source: [source URL]`

3. **Output a comparison summary table:**

```
ONLINE REFERENCE COMPARISON
============================
Rule File              | Source           | Patterns Added | Status
-----------------------|------------------|----------------|--------
example-rule.md        | windsurf.run     | 3              | improved
security.md            | OWASP            | 2              | improved
code-quality.md        | skills.sh        | 0              | ok
```

4. **If no online content was available** (all URLs failed): log "Online comparison skipped -- no fetched content available" and proceed

---

## Phase Complete

After generating all rules, updating AGENTS.md, and completing the online content comparison (2.8):

1. Update `_progress.phase2_generation` to `true` in `.windsurf/project-init-config.json`
2. Update `_progress.phase2_completed_at` to the current ISO timestamp
3. Tell the user: "Rules generated. Starting base rule enhancement..."
4. **Immediately** read and follow `.windsurf/workflows/project-init-enhance.md`
