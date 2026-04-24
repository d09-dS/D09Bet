---
description: Validate generated rules and workflows against the quality checklist
---

# Validate Rules

Run the binary validation checklist against all generated rules and workflows. This workflow can be used standalone or is called automatically by Phase 4 of `/project-init`.

---

## Prerequisites

- `.windsurf/project-init-config.json` must exist
- `.windsurf/rules/` must contain generated rule files

---

## Step 1: Load Config and Checklist

1. Read `.windsurf/project-init-config.json` to understand the detected stack
2. Read `.windsurf/workflows/_ref/validation-checklist.md` for the full checklist definition
3. List all `.md` files in `.windsurf/rules/`

---

## Step 2: Validate Each Rule File (Checks A, B, C)

For each rule file in `.windsurf/rules/`:

### A. Structure & Format

1. **A1** -- Verify YAML frontmatter exists with `description` and `trigger` fields
2. **A2** -- Verify `trigger` is one of: `always_on`, `glob`, `model_decision`, `manual`
3. **A3** -- If `trigger: glob`, verify `globs` match the target stack (cross-reference with config)
4. **A4** -- Count characters in the file. Must be <= 12,000
5. **A5** -- Verify filename matches `^[a-z0-9]+(-[a-z0-9]+)*\.md$`
6. **A6** -- Verify first content after frontmatter closing `---` is an H1 heading (`# ...`)
7. **A7** -- Context cost check: if `trigger: always_on`, file must be < 6,000 characters. Large rules should use `glob` or `model_decision` instead.
8. **A8** -- If `trigger: model_decision`, verify `description` is > 20 characters and clearly explains when the rule is relevant (contains action keywords like "when", "for", "use", "if")

### B. Content Depth & Relevance

1. **B1** -- Search for `## Rule Priorities` followed by a markdown table
2. **B2** -- Count code blocks containing `// Good` or `// Bad` (or `# Good` / `# Bad` for Python). Must be >= 3
3. **B3** -- Check code fence language tags against the configured stack languages
4. **B4** -- Search for `## Gotchas` section and count bullet points. Must be >= 3
5. **B5** -- Search for generic filler phrases: "write clean code", "follow best practices", "ensure quality" without accompanying concrete examples. Flag if found.
6. **B6** -- Sample 5 bullet points from the rule body. Each should start with a verb or contain "Do"/"Don't"/"Never"/"Always"
7. **B7** -- Search for at least 1 concrete package/library name relevant to the configured stack
8. **B8** -- Sample 5 instructions and check for reasoning keywords ("because", "since", "to prevent", "to avoid", "otherwise"). At least 2 of 5 should explain WHY, not just WHAT.
9. **B9** -- Search for numbered lists or sequential action verbs in rule body. Complex operations must have step-by-step procedures, not just declarative statements.
10. **B10** -- Check for default recommendations ("Use X. For [edge case], use Y instead.") vs equal-weight option lists ("you can use A, B, C, or D"). Flag option lists without clear defaults.

### C. Stack Alignment

1. **C1** -- If config specifies a backend framework, grep for framework-specific keywords in the rule
2. **C2** -- Negative test: if config is Angular, search for React-only patterns (`useState`, `useEffect`). If config is React, search for Angular-only patterns (`@Component`, `NgModule`). Flag any cross-contamination.
3. **C3** -- If `architecture.typescript: true`, verify all JavaScript code fences use `typescript` or `ts` language tag
4. **C4** -- For multi-stack base rules (security, testing, etc.): count distinct code fence languages and compare against number of configured stacks

---

## Step 3: Validate Extended Workflows (Checks D)

For each workflow in `.windsurf/workflows/` that has stack-enhancement markers:

1. **D1** -- Verify YAML frontmatter with `description`
2. **D2** -- Verify steps are numbered sequentially
3. **D3** -- Verify each step contains a backtick-wrapped command, tool name, or file path
4. **D4** -- Search for validation keywords: "verify", "check", "confirm", "ensure", "validate"
5. **D5** -- Search for marking headers: `> Stack-enhancement by /project-init` or `> Auto-added by /project-init`
6. **D6** -- Search for error handling / fallback steps: "if.\*fails", "on error", "fallback", "otherwise". At least 1 failure scenario must be addressed per workflow.

---

## Step 4: System-Wide Checks (Checks E)

1. **E1** -- Read `project-init-config.json` and verify it parses as valid JSON
2. **E2** -- Verify config contains keys: `frontend`, `backend`, `architecture`, `meta`, `devops`
3. **E3** -- Check `_progress.phase4_quality` is `true` (skip if running before Phase 4)
4. **E4** -- Verify all 8 base rules exist: `code-quality.md`, `security.md`, `error-handling.md`, `performance.md`, `accessibility.md`, `api-standards.md`, `i18n.md`, `testing.md`
5. **E5** -- Count total rule files. Must be > 8 (at least 1 stack-specific rule)
6. **E6** -- Check no rule file exceeds 12,000 characters
7. **E7** -- grep all rule files for `TODO`, `TBD`, `FIXME`. Flag any matches.
8. **E8** -- Read `AGENTS.md` and verify it references all rule files in `.windsurf/rules/`
9. **E9** -- Verify all enhanced base rules contain marking headers (`> Stack-enhancement by /project-init`)
10. **E10** -- Calculate overall pass rate. Must be >= 90%
11. **E11** -- Sum character count of all `always_on` rule files. Total must be <= 20,000 characters (context budget -- all always_on rules consume context on every message).
12. **E12** -- Cross-compare rule file content blocks. Flag any paragraph or code block (>3 lines) that appears identically in multiple rule files.

---

## Step 5: Generate Report

Output the validation report in this format:

```
VALIDATION REPORT
=================

Rule: [filename] ([pass]/[total] structure, [pass]/[total] content, [pass]/[total] alignment)
  [x] A1 ...
  [x] A2 ...
  [ ] A3 ...    <-- FAIL: [reason]
  ...

Workflow: [filename] ([pass]/[total])
  [x] D1 ...
  ...

System-Wide: ([pass]/[total])
  [x] E1 ...
  ...

SUMMARY
  Total Criteria: N
  Passed: N
  Failed: N
  N/A: N
  Pass Rate: X% (threshold: 90%)
  Status: PASS / FAIL

FAILING CRITERIA (if any):
  - [file]: [criterion ID] -- [reason]
  - ...
```

---

## Step 6: Recommendations (if FAIL)

If pass rate is below 90%, list specific fix actions for each failing criterion. Reference the fix table in `project-init-quality.md` section 4.2 for the recommended action per criterion ID.

## Step 7: Save to Dashboard

Persist the validation results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/validate-rules/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "validate-rules",
  "timestamp": "[ISO timestamp]",
  "score": "[pass rate as 0-100 integer]",
  "maxScore": 100,
  "verdict": "[PASS (>=90%) / FAIL (<90%)]",
  "findings": {
    "critical": "[failing E/C criteria count]",
    "high": "[failing A/B criteria count]",
    "medium": 0,
    "low": 0
  },
  "highlights": ["[well-implemented criteria]"],
  "issues": ["[failing criterion IDs with reasons]"],
  "summary": "[pass rate]% pass rate across [N] criteria",
  "reportPath": ".windsurf/dashboard/runs/validate-rules/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
