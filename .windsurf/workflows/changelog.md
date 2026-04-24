---
description: Generate changelog from git commits and releases
---

# Changelog Generation Workflow

This workflow generates a changelog from git history.

## Step 1: Analyze Commit History

Scan git commits since last release:

```bash
# Get commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Or since specific date
git log --since="2024-01-01" --oneline
```

## Step 2: Categorize Changes

Group commits by type following the **Conventional Commits** specification (`conventionalcommits.org`):

| Prefix             | Category      | Description                |
| ------------------ | ------------- | -------------------------- |
| `feat:`            | Features      | New functionality          |
| `fix:`             | Bug Fixes     | Bug corrections            |
| `docs:`            | Documentation | Documentation changes      |
| `style:`           | Styles        | Formatting, no code change |
| `refactor:`        | Refactoring   | Code restructuring         |
| `perf:`            | Performance   | Performance improvements   |
| `test:`            | Tests         | Adding/updating tests      |
| `chore:`           | Chores        | Maintenance tasks          |
| `ci:`              | CI/CD         | Pipeline changes           |
| `build:`           | Build         | Build system changes       |
| `BREAKING CHANGE:` | Breaking      | Breaking changes           |

## Step 3: Generate Changelog Entry

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New user registration flow (#123)
- Email verification feature (#125)
- Dark mode support (#130)

### Changed

- Improved dashboard performance (#128)
- Updated dependencies to latest versions (#132)

### Fixed

- Fixed login redirect issue (#124)
- Resolved memory leak in WebSocket handler (#127)
- Fixed date formatting in reports (#129)

### Security

- Updated JWT library to patch CVE-2024-XXXX (#131)

### Deprecated

- Legacy API v1 endpoints (will be removed in v3.0)

### Removed

- Removed unused analytics module (#126)

## [2.1.0] - 2024-01-15

### Added

- Multi-language support (EN, DE, FR)
- Export to PDF feature

### Fixed

- Fixed pagination in user list
- Resolved timezone issues

## [2.0.0] - 2024-01-01

### Breaking Changes

- API v2 is now the default
- Removed deprecated endpoints

### Added

- Complete UI redesign
- New authentication system
```

## Step 4: Determine Version Bump

Based on changes, suggest version:

| Change Type      | Version Bump | Example       |
| ---------------- | ------------ | ------------- |
| Breaking changes | Major        | 1.0.0 → 2.0.0 |
| New features     | Minor        | 1.0.0 → 1.1.0 |
| Bug fixes only   | Patch        | 1.0.0 → 1.0.1 |

```
Current version: 2.1.0

Changes detected:
- 3 new features
- 5 bug fixes
- 0 breaking changes

Recommended version: 2.2.0 (minor bump for new features)
```

## Step 5: Generate Release Notes

For GitHub/GitLab releases:

```markdown
# Release v2.2.0

## Highlights

- **New User Registration Flow** - Streamlined onboarding experience
- **Dark Mode** - Toggle in settings
- **Email Verification** - Enhanced security

## What's Changed

### New Features

- feat: Add user registration flow by @developer in #123
- feat: Add email verification by @developer in #125
- feat: Add dark mode support by @designer in #130

### Bug Fixes

- fix: Login redirect issue by @developer in #124
- fix: Memory leak in WebSocket by @developer in #127
- fix: Date formatting in reports by @developer in #129

### Security

- security: Update JWT library (CVE-2024-XXXX) by @security in #131

### Other Changes

- chore: Update dependencies by @bot in #132
- docs: Update API documentation by @developer in #133

## Breaking Changes

None in this release.

## Upgrade Guide

No special steps required. Run `npm install` to update dependencies.

## Contributors

- @developer
- @designer
- @security

**Full Changelog**: https://github.com/org/repo/compare/v2.1.0...v2.2.0
```

## Step 6: Update Package Version

```bash
# npm
npm version minor -m "Release v%s"

# Or manually update package.json
{
  "version": "2.2.0"
}
```

## Step 7: Create Git Tag

```bash
# Create annotated tag
git tag -a v2.2.0 -m "Release v2.2.0"

# Push tag
git push origin v2.2.0
```

## Step 8: Automate with CI/CD

### GitHub Actions

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Changelog
        id: changelog
        uses: googleapis/release-please-action@v4
        with:
          release-type: node

      - name: Create Release
        if: ${{ steps.changelog.outputs.release_created }}
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.changelog.outputs.tag_name }}
          body: ${{ steps.changelog.outputs.body }}
          draft: false
          prerelease: false
```

### GitLab CI

```yaml
release:
  stage: release
  image: registry.gitlab.com/gitlab-org/release-cli:latest
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/
  script:
    - echo "Creating release for $CI_COMMIT_TAG"
  release:
    tag_name: $CI_COMMIT_TAG
    name: "Release $CI_COMMIT_TAG"
    description: ./CHANGELOG.md
```

For fully automated changelog + release on GitLab, use `semantic-release` with `@semantic-release/gitlab`:

```yaml
semantic-release:
  stage: release
  image: node:20-alpine
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    - npm install -g semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/gitlab
    - npx semantic-release
```

## Step 9: Output Summary

```
Changelog Generated

Version: 2.1.0 → 2.2.0 (minor)

Changes since v2.1.0:
- Features: 3
- Bug Fixes: 5
- Security: 1
- Breaking: 0

Files updated:
- CHANGELOG.md
- package.json (version bump)

Next steps:
1. Review CHANGELOG.md
2. Commit: git commit -am "chore: release v2.2.0"
3. Tag: git tag -a v2.2.0 -m "Release v2.2.0"
4. Push: git push && git push --tags
```

## Gotchas

- **Squash merges destroy commit history** -- if the team uses squash-and-merge on PRs, individual `feat:` and `fix:` commits are lost. Either parse the squash commit message (which should follow Conventional Commits) or generate changelogs from PR titles instead.
- **`BREAKING CHANGE` in footer is case-sensitive** -- the Conventional Commits spec requires exactly `BREAKING CHANGE:` (uppercase, no dash). `breaking-change:`, `Breaking Change:`, or `BREAKING-CHANGE:` are not recognized by tools like `release-please` or `standard-version`.
- **Pre-release versions complicate SemVer** -- `1.0.0-beta.1` to `1.0.0-beta.2` is valid, but many tools mishandle pre-release ordering. Avoid mixing pre-release and stable releases in the same changelog section.
- **Changelog entries without issue links are hard to trace** -- always include the issue/ticket reference in the commit message footer (`Refs: PROJ-123`). Changelogs without traceability become useless for audits.
- **Automated version bumps in monorepos** -- `release-please` and `standard-version` assume a single package. For monorepos, use `release-please` with a manifest config or `changesets` to handle per-package versioning.

## Step 10: Save to Dashboard

Persist the changelog results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/changelog/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "changelog",
  "timestamp": "[ISO timestamp]",
  "score": 100,
  "maxScore": 100,
  "verdict": "[version bump type: major/minor/patch]",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["[features count], [fixes count], [breaking changes count]"],
  "issues": [],
  "summary": "Changelog generated: [old version] -> [new version]",
  "reportPath": ".windsurf/dashboard/runs/changelog/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
