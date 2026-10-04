# Task 2 Report: $impeccable distill (Progressive Disclosure & Toolbar Decongestion)

**Status:** DONE  
**Date:** 2026-10-04  
**Target Files:**  
- `content.js`
- `styles.css`
- `.superpowers/sdd/impeccable-evolution/progress.md`

---

## 1. Executive Summary

Task 2 refined and decluttered the interface of the Instagram Unfollowers extension through the **$impeccable distill** design pass:
1. **Progressive Disclosure for Batch Actions Bar (`#igBatchBar`):**
   - Eliminated the permanent vertical space penalty above the user list.
   - Refactored the batch actions bar to be **hidden by default** when 0 profiles are selected (`max-height: 0; opacity: 0; padding: 0 12px; margin-bottom: 0; overflow: hidden; pointer-events: none; visibility: hidden; border-color: transparent`).
   - Implemented smooth CSS expansion transitions (`max-height 0.25s`, `opacity 0.2s`, `margin-bottom 0.25s`) that dynamically trigger as soon as 1+ profiles are selected via card checkboxes or batch selection chips.
   - Designed clean collapse behavior when selections return to 0 (or when "Limpar" is clicked).
   - Added a dedicated, subtle toolbar toggle button (`#igBatchToggleBtn`: `☑️ Selecionar`) enabling users to enter batch selection mode or dismiss it at will.
2. **Compact Glassmorphic Export Dropdown Menu (`#igExportDropdownBtn`):**
   - Consolidated the two separate prominent toolbar buttons (`#igExportTxt` and `#igExportCsv`) into a single unified dropdown trigger: `<button id="igExportDropdownBtn" class="ig-unf-export-btn ig-unf-export-dropdown-btn"><span>📥</span><span>Exportar</span><span>▾</span></button>`.
   - Developed a glassmorphic floating dropdown popup (`#igExportMenu`) featuring:
     - `📄 Exportar como TXT` (standard formatted list)
     - `📊 Exportar como CSV` (structured Excel spreadsheet)
   - Built full interaction handling: closes immediately on option selection, clicking anywhere outside, or pressing the `Escape` key.
   - Added lifecycle cleanup (`activeExportMenuCleanup`) to eliminate event listener accumulation across view re-renders and modal dismissals.
3. **Automated Verification:**
   - Validated complete syntactic integrity with `node --check content.js` (exit code 0).
   - Verified that background.js and popup.js also pass cleanly with exit code 0.

---

## 2. Detailed Implementation

### 2.1 Progressive Disclosure for Batch Actions Bar (`content.js` + `styles.css`)

- **State Synchronization (`isBatchModeActive` & `updateBatchButtonState`):**
  - Integrated `let isBatchModeActive = false;` alongside `selectedUids`.
  - In `updateBatchButtonState()`, the bar's visibility is evaluated reactively:
    ```javascript
    const shouldShowBar = currentTab === 'notFollowingBack' && (count > 0 || isBatchModeActive);
    if (bar) {
      if (currentTab === 'notFollowingBack') {
        bar.style.display = 'flex';
        if (shouldShowBar) {
          bar.classList.add('visible');
        } else {
          bar.classList.remove('visible');
        }
      } else {
        bar.classList.remove('visible');
        bar.style.display = 'none';
      }
    }
    ```
- **Collapsible Animation CSS (`.ig-unf-batch-bar` & `.ig-unf-batch-bar.visible`):**
  - Without `.visible`, the batch bar occupies 0 vertical pixels (`max-height: 0; padding: 0 12px; margin-bottom: 0; opacity: 0; border: 1px solid transparent; overflow: hidden; pointer-events: none; visibility: hidden;`).
  - With `.visible`, it smoothly transitions to `max-height: 56px; opacity: 1; visibility: visible; padding: 8px 12px; margin-bottom: 12px; border-color: #27272a; pointer-events: auto;`.
  - Utilizes easing `cubic-bezier(0.16, 1, 0.3, 1)` for fluid, responsive opening and closing without layout jumps.
- **Card Checkbox & Batch Chip Sync:**
  - When checking any profile card checkbox: `selectedUids.add(uid)` -> batch bar auto-expands into view.
  - When unchecking cards until count reaches 0: `selectedUids.size === 0` resets `isBatchModeActive = false` -> batch bar auto-collapses cleanly.
  - When clicking "Limpar" (`data-batch="clear"`): resets `selectedUids.clear()`, resets `isBatchModeActive = false`, unchecks card checkboxes, and smoothly closes the bar.
  - When batch unfollow completes: all processed IDs are deleted, `selectedUids` is emptied, `isBatchModeActive = false`, and the bar collapses.
- **Toolbar Toggle Button (`#igBatchToggleBtn`):**
  - Rendered conditionally when `currentTab === 'notFollowingBack'`.
  - Toggles batch selection mode on/off. Clicking it when open and active cleanly clears selections and collapses the bar.
  - Accessible attributes: toggles `aria-pressed="true|false"` and active visual highlighting (`.active` with rose/accent tint).

---

### 2.2 Compact Export Dropdown Menu (`content.js` + `styles.css`)

- **Single Consolidated Trigger Button (`#igExportDropdownBtn`):**
  - Replaced horizontal clutter with a unified trigger: `[📥 Exportar ▾]`.
  - Contains SVG download icon, "Exportar" label, and a rotating chevron (`#igExportDropdownBtn.open .ig-unf-dropdown-arrow` with `transform: rotate(180deg)`).
- **Glassmorphic Dropdown Menu (`#igExportMenu`):**
  - Styled with dark-mode glassmorphism (`background: rgba(24, 24, 27, 0.95); backdrop-filter: blur(12px); border: 1px solid #27272a; border-radius: 10px; box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.6);`).
  - Includes tailored iconography and two-line semantic hierarchy:
    - **TXT:** `Exportar como TXT` (Subtext: *Lista simples de @arrobas*)
    - **CSV:** `Exportar como CSV` (Subtext: *Planilha estruturada (Excel)*)
- **Robust Dismissal & Event Lifecycle:**
  - Closes on option click, immediately invoking `exportData(format)` (`txt` or `csv`).
  - Closes on clicking outside the dropdown container anywhere on document or modal backdrop.
  - Closes on `Escape` keypress (`e.stopPropagation()` prevents accidentally dismissing the parent modal).
  - Attached with `activeExportMenuCleanup` to guarantee no duplicate event listeners or memory leaks occur during re-renders or modal closure.

---

## 3. Verification & Quality Floor

| Check | Tool / Method | Result |
| :--- | :--- | :--- |
| JavaScript Syntax Check | `node --check content.js` | Passed (Exit code 0) |
| Multi-file Syntax Check | `node --check background.js; node --check popup.js` | Passed (Exit code 0) |
| Identifier Verification | Node assertion script | All IDs & CSS classes verified |
| Progressive Disclosure Bar | Inspection in `styles.css` | Collapsed at 0px with smooth cubic-bezier transitions |
| Export Dropdown Menu | Inspection in `styles.css` & `content.js` | Glassmorphic dropdown with outside click & Esc dismiss |
| Git Commit | `git commit` | Committed cleanly to `feat/impeccable-design-evolution` (dbf24ab) |

---

## 4. Conclusion

Task 2 ($impeccable distill) is complete, verified, and committed. The extension now provides significant vertical space reclamation for the profile list and a compact, decluttered toolbar.
