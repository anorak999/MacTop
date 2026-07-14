# PROJECT_LOG.md — MacTop

| Field | Value |
|---|---|
| Project Name | MacTop |
| Start Date | 2025-07-14 |
| Current Version | 0.1.0 |
| Architecture | One-Man Show |
| Primary Agent | Senior GNOME Extension Engineer (`GNOME-Eng`) |

---

## Log Format

Every entry must contain:

| Column | Description |
|---|---|
| Timestamp | ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) |
| Author | Agent identifier or user |
| Action Type | `Feature` / `Decision` / `Bugfix` / `Refactor` / `Infra` / `Docs` |
| Change | Description of what changed |
| Rationale | Why it was changed |
| Impact | Downstream effects on other files, systems, or users |

---

## Entries

### ENTRY-001

| Field | Value |
|---|---|
| Timestamp | `2025-07-14T00:00:00Z` |
| Author | `GNOME-Eng` |
| Action Type | `Infra` |
| Change | Project scaffold initialized — directory tree, agent definition, foundation logs, VERSION_CONTROL.md |
| Rationale | Establish professional project structure and version control enforcement before feature work |
| Impact | All future work flows through this structure; `.gitignore` and branching strategy now active |

### ENTRY-002

| Field | Value |
|---|---|
| Timestamp | `2025-07-14T00:00:00Z` |
| Author | `GNOME-Eng` |
| Action Type | `Feature` |
| Change | Core extension replicated from `global-menu-for-gnome` with MacTop branding (UUID: `mactop@anorak`) |
| Rationale | Fork original project under new namespace for independent development |
| Impact | `extension.js`, `menuManager.js`, `metadata.json`, install/uninstall scripts, schema all rebranded |

---

*New entries append below this line.*
