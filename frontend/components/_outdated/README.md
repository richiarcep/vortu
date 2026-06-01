# `_outdated/` — parked dead code

These files were **not imported anywhere** in the app (verified by grep across
`app/` and `components/`). They were moved here on 2026-06-01 during a code-quality
cleanup so the active codebase has a single source of truth for each component,
without permanently deleting your work (the project isn't under version control yet).

Nothing in the app references this folder. You can safely delete it once you're
sure you don't need any of it. To restore a file, move it back and fix its imports.

## What's here and why it was parked

| File (here) | Original path | Why it was dead |
|-------------|---------------|-----------------|
| `shell-Sidebar.jsx` | `components/shell/Sidebar.jsx` | Duplicate of the canonical `components/Sidebar.jsx` (a 57-line stub). Every page imports `@/components/Sidebar`, never this one. |
| `shell-TopBar.jsx` | `components/shell/TopBar.jsx` | 27-line minimal top bar. No file imports any `TopBar`. |
| `ui-TopBar.jsx` | `components/ui/TopBar.jsx` | The larger, full-featured top bar (tabs/notifications/profile, 219 lines). Also never imported — appears to be unfinished/unwired work. **If you intended to use this, move it back to `components/ui/TopBar.jsx` and import it where needed.** |

## Canonical components still in use
- Sidebar → [`components/Sidebar.jsx`](../Sidebar.jsx)
