# Task 2 Brief: $impeccable distill (Progressive Disclosure & Toolbar Decongestion)

## Objective
Reduce visual noise, eliminate unnecessary clutter, and reclaim screen space for the profile list:

1. **Progressive Disclosure for Batch Actions Bar:**
   - In `content.js` and `styles.css`:
   - Currently, `#igUnfBatchBar` (or `.ig-unf-batch-bar`) is permanently visible above the user list, occupying valuable vertical space even when 0 profiles are selected.
   - Refactor the batch actions bar so it is **hidden by default** when 0 profiles are selected (`display: none` or collapsed with smooth slide-down animation `max-height: 0; opacity: 0; overflow: hidden; transition: all 0.25s ease`).
   - When the user selects 1 or more profiles (via card checkboxes or batch selection chip), the batch actions bar slides open smoothly.
   - When selections return to 0 (or "Limpar" is clicked), it slides closed cleanly.
   - Provide a subtle toggle or selection mode button in the toolbar (e.g. `☑️ Selecionar em lote` or similar) so users who want to use the batch bar can trigger it easily, or it auto-opens when selecting.

2. **Compact Export Dropdown Menu (`Exportar ▾`):**
   - Currently, there are two separate prominent buttons side-by-side in the toolbar: `#igUnfExportTxtBtn` and `#igUnfExportCsvBtn`.
   - Consolidate them into a single sleek dropdown button:
     `<button id="igUnfExportDropdownBtn" class="ig-unf-btn secondary dropdown">📥 Exportar ▾</button>`
   - Clicking it toggles a clean glassmorphic dropdown menu with:
     - `📄 Exportar como TXT` (standard list)
     - `📊 Exportar como CSV` (spreadsheet with columns)
   - Clicking an option triggers the corresponding download and closes the dropdown.
   - Clicking outside the dropdown closes it cleanly.

## Target Files
- `content.js`
- `styles.css`

## Quality Floor & Verification
- Dark mode theme coherence (#121214, #18181b, #27272a).
- Check syntax with `node --check content.js`.
