# Task 3 Brief: $impeccable typeset (Typography Floor & Touch Target Ergonomics)

## Objective
Fix typography scaling and touch target deficiencies identified in the Impeccable critique and detector scan:

1. **Eliminate All Sub-11px and 11px Interactive/Functional Text (Enforce >= 12px Floor):**
   - In `popup.html`:
     - Fix `#popupTestNotifBtn`: change `font-size: 10.5px` to `font-size: 12px`.
     - Fix `#popupKeyInput` and `#popupActivateBtn`: change `font-size: 11px` to `font-size: 12px`.
     - Review all labels and text in `popup.html` to ensure no functional text is under 12px (only non-interactive legal microcopy can be 11px).
   - In `styles.css`:
     - Fix `.ig-unf-block-tab-badge`: change `10.5px` to `11.5px` or `12px`.
     - Fix fractional font sizes: `11.5px` and `12.5px` -> normalize to standard whole pixel scale (`12px`, `13px`, `14px`).
     - Elevate interactive buttons from `11px` to `12px` (e.g. `.ig-unf-action-btn`, `.ig-unf-pause-btn`, `.ig-unf-chip`, `.ig-unf-filter-pill`).
     - Secondary metadata/labels should be at least `12px` (or `11px` for non-interactive timestamps).

2. **Expand Touch / Click Target Sizes to >= 36px–44px:**
   - In `styles.css` and `popup.html`:
     - Star button (`.ig-unf-star-btn`): currently ~24x24px. Increase bounding click area to at least 36x36px (using min-width: 36px, min-height: 36px, display: inline-flex, align-items: center, justify-content: center).
     - Checkbox (`.ig-unf-checkbox`): expand click target / label container to at least 36x36px or wrap with generous padding so clicking around the checkbox toggles it.
     - Close button (`.ig-unf-close-btn`): currently ~28x28px. Increase bounding box to at least 36x36px.
     - Action button (`.ig-unf-action-btn.unfollow`, `.follow`): ensure min-height is at least 32px-36px with comfortable padding.
     - Popup buttons (`#popupActivateBtn`, `#popupTestNotifBtn`): ensure min-height is at least 32px with comfortable touch padding.

3. **Detector Verification:**
   - Run `impeccable detect --json .` to ensure `undersized-ui-text` is 100% resolved (0 findings).
   - Verify syntax with `node --check content.js`.

## Target Files
- `popup.html`
- `styles.css`
- `content.js` (if any inline styles need updating)
