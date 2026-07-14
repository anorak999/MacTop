# VERSION_CONTROL.md — MacTop

---

## GitCore Enforcement Activated

**Agent**: X99 — Elite Git Architecture Enforcer & DevOps Systems Architect
**Project**: MacTop
**Enforcement Date**: 2025-07-14

---

### Ironclad Rules

| Rule | Scope | Enforcement |
|---|---|---|
| **R1** | NEVER push directly to `main` | Universal — solo projects, hotfixes, documentation, everything |
| **R2** | One feature branch per task | No multi-feature branches. Atomic commits only |
| **R3** | All integration flows through `dev` | Feature branches merge into `dev` via PR |
| **R4** | `staging` is a pre-production mirror | Only `dev` merges into `staging` after verification |
| **R5** | `main` is protected and production-ready | Only `staging` merges into `main` after full validation |
| **R6** | Commit messages follow Conventional Commits | `type(scope): description` — no exceptions |
| **R7** | Force push is forbidden on `main`, `staging`, `dev` | Feature branches only, and only with explicit justification |

---

### GitCore Four-Tier Branching Strategy

```
main          ← production-ready, protected, never pushed to directly
  ↑
staging       ← pre-production mirror, validated against `dev`
  ↑
dev           ← primary integration branch, all features merge here
  ↑
feature/*     ← one branch per task, atomic scope, short-lived
```

---

### Branch Naming Convention

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<short-desc>` | `feature/window-switcher` |
| Bugfix | `bugfix/<short-desc>` | `bugfix/menu-leak-on-disable` |
| Hotfix | `hotfix/<short-desc>` | `hotfix/crash-on-gnome-48` |
| Docs | `docs/<short-desc>` | `docs/api-reference` |
| Refactor | `refactor/<short-desc>` | `refactor/split-menu-builder` |

---

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`
**Scope**: `extension`, `menu`, `schema`, `install`, `ci`, `agent`
**Example**: `feat(menu): add keyboard shortcut for emoji picker`

---

### Merge Protocol

1. Feature branch → `dev`: Self-review, verify no regressions, squash-merge
2. `dev` → `staging`: Full smoke test on target GNOME versions, standard merge
3. `staging` → `main`: Final validation, version bump in `metadata.json`, tag release

---

### Protection Summary

| Branch | Direct Push | Force Push | Delete | Merge Source |
|---|---|---|---|---|
| `main` | DENIED | DENIED | DENIED | `staging` only |
| `staging` | DENIED | DENIED | DENIED | `dev` only |
| `dev` | DENIED | DENIED | DENIED | `feature/*` only |
| `feature/*` | ALLOWED | ALLOWED (with justification) | ALLOWED | N/A |

---

### X99 Declaration

> This branching strategy is non-negotiable. Every commit, every merge, every release traces to a branch, a type, and a verification step. There are no shortcuts. Code that bypasses this protocol is considered untrusted and will be rejected.
>
> — **X99**, Git Architecture Enforcer
> Signed: 2025-07-14T00:00:00Z

---
