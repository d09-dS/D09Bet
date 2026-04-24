# Validation Checklist for Generated Rules and Workflows

This checklist replaces the subjective 1-10 scoring system in Phase 4. Every criterion is **binary** (pass/fail). Used by `/project-init` Phase 4 and `/validate-rules`. Total: 38 criteria across 5 categories.

---

## A. Structure & Format (per rule file)

| ID  | Criterion                                                                                                                           | Check Method                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A1  | File has YAML frontmatter with `description` and `trigger` fields                                                                   | Regex: starts with `---`, contains `description:` and `trigger:` |
| A2  | `trigger` is one of: `always_on`, `glob`, `model_decision`, `manual`                                                                | String match against allowed values                              |
| A3  | `globs` match the target stack (e.g. `**/*.ts` for TypeScript rules)                                                                | Cross-reference with `_ref/globs-mapping.md` and config          |
| A4  | File is <= 12,000 characters (Windsurf hard limit)                                                                                  | Character count                                                  |
| A5  | Filename is kebab-case ending with `.md`                                                                                            | Regex: `^[a-z0-9]+(-[a-z0-9]+)*\.md$`                            |
| A6  | First content after frontmatter is an H1 heading (`# Title`)                                                                        | Markdown structure check                                         |
| A7  | Context cost matches trigger: `always_on` rules are concise (< 6000 chars), large rules use `glob` or `model_decision`              | Character count + trigger mode cross-check                       |
| A8  | If `trigger: model_decision`: `description` clearly explains WHEN the rule is relevant (Cascade decides based on description alone) | Description length > 20 chars + contains action keywords         |

---

## B. Content -- Depth & Relevance (per rule file)

| ID  | Criterion                                                                                                                 | Check Method                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| B1  | Contains a **Rule Priorities** section with a table (Priority, Category columns)                                          | Search for `## Rule Priorities` + markdown table                                                          |
| B2  | At least **3 code examples** with Good/Bad contrast (`// Good` and `// Bad` markers)                                      | Count code blocks containing Good/Bad markers                                                             |
| B3  | Code examples use the **stack-correct language** (not generic JS for a Go project)                                        | Compare code fence language tags against config                                                           |
| B4  | Contains a **Gotchas** section with at least 3 entries                                                                    | Search for `## Gotchas` + count bullet points                                                             |
| B5  | No generic filler phrases without concrete examples ("write clean code", "follow best practices")                         | Regex search for known generic phrases                                                                    |
| B6  | Every rule is **actionable** -- starts with a verb or contains a clear Do/Don't instruction                               | Sample check of bullet points                                                                             |
| B7  | References at least **1 concrete library/tool** for the stack (e.g. "use Zod" not "use a validation library")             | Search for specific package names                                                                         |
| B8  | Instructions explain **why**, not just what: "Do X because Y causes Z" instead of "ALWAYS do X"                           | Sample 5 instructions and check for reasoning ("because", "since", "to prevent", "to avoid", "otherwise") |
| B9  | Contains **step-by-step procedures** for complex operations, not just declarative statements                              | Search for numbered lists or sequential action verbs in rule body                                         |
| B10 | Provides **clear defaults with escape hatches**, not equal-weight option lists ("Use X. For [edge case], use Y instead.") | Check for default recommendations vs "you can use A, B, C, or D" patterns                                 |

---

## C. Stack Alignment (per rule file)

| ID  | Criterion                                                                           | Check Method                                             |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| C1  | If config has a backend framework: rule contains framework-specific patterns        | grep for framework keywords from config                  |
| C2  | No cross-stack contamination (e.g. no `useState`/`useEffect` in Angular rules)      | Negative test for other-framework keywords               |
| C3  | If config `architecture.typescript: true`: all JS examples use TypeScript           | Check code fence tags for `typescript`/`ts`              |
| C4  | Multi-stack rules (e.g. security.md) contain examples for **each configured stack** | Count distinct code fence languages vs configured stacks |

---

## D. Workflow Quality (per workflow file)

| ID  | Criterion                                                                                           | Check Method                                                                                 |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| D1  | Has YAML frontmatter with `description` field                                                       | Regex check                                                                                  |
| D2  | Steps are **numbered** and sequential                                                               | Search for `1.`, `2.`, `3.` patterns                                                         |
| D3  | Each step references a **concrete tool or command** (not just "do X")                               | Search for backtick-wrapped commands or tool names                                           |
| D4  | Contains **validation steps** ("verify that...", "check if...", "confirm...")                       | Search for validation keywords                                                               |
| D5  | Stack extensions have **marking headers**                                                           | Search for `> Stack-enhancement by /project-init` or `> Workflow-extension by /project-init` |
| D6  | Contains **error handling / fallback steps** for failure scenarios ("If X fails...", "On error...") | Search for failure keywords: "if.\*fails", "on error", "fallback", "otherwise"               |

---

## E. System-Wide (after full workflow run)

| ID  | Criterion                                                                                                                     | Check Method                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| E1  | `project-init-config.json` exists and is valid JSON                                                                           | JSON.parse or read + validate                                                                                              |
| E2  | Config has all 5 sections: `frontend`, `backend`, `architecture`, `meta`, `devops`                                            | Key existence check                                                                                                        |
| E3  | `_progress` field shows `phase4_quality: true` when complete                                                                  | String match                                                                                                               |
| E4  | All 8 base rules exist in `.windsurf/rules/`                                                                                  | File existence check for: code-quality, security, error-handling, performance, accessibility, api-standards, i18n, testing |
| E5  | At least 1 stack-specific rule was generated (rule count > 8)                                                                 | Count files in `.windsurf/rules/`                                                                                          |
| E6  | No rule file exceeds 12,000 characters                                                                                        | Max character check across all files                                                                                       |
| E7  | No rule file contains placeholders (`TODO`, `TBD`, `FIXME`)                                                                   | grep check                                                                                                                 |
| E8  | `AGENTS.md` lists all generated rules                                                                                         | Cross-reference rule filenames with AGENTS.md content                                                                      |
| E9  | All enhanced base rules contain marking headers (`> Stack-enhancement by /project-init`)                                      | grep for marking header in each enhanced rule                                                                              |
| E10 | Overall checklist pass rate >= 90%                                                                                            | Count passed / total                                                                                                       |
| E11 | Total `always_on` rule characters <= 20,000 (context budget -- all always_on rules combined consume context on every message) | Sum character count of all `always_on` rule files                                                                          |
| E12 | No significant duplicate content across rule files (same paragraph or code block in multiple files)                           | Cross-compare rule file content blocks, flag >3 identical lines                                                            |

---

## Scoring

- **Pass**: Criterion is met
- **Fail**: Criterion is not met -- requires optimization
- **N/A**: Criterion does not apply (e.g. C4 for single-stack projects)

**Pass rate** = passed / (total - N/A) \* 100

**Minimum threshold**: 90% pass rate required. If below 90%, run optimization rounds (max 3) to fix failing criteria.
