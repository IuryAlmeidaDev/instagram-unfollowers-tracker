# Task 1 Brief: $impeccable harden (Operational Safety & Reversible Actions)

## Objective
Harden the extension against destructive errors and account penalties by adding safety nets:
1. **Floating Undo Toast (5s Countdown) for Individual Unfollow:**
   - When the user clicks "Deixar de seguir" on any card (in `content.js`), do NOT immediately fire the network request.
   - Immediately update the button to a pending state (e.g. "Cancelando... (5s) [Desfazer]").
   - Simultaneously display an elegant floating toast at the bottom-center of the modal:
     `"Deixando de seguir @usuario em 5s... [Desfazer]"`.
   - The toast has a visual countdown bar / timer (5000ms).
   - If the user clicks "Desfazer" (on the toast or the card button):
     - The timer is cancelled immediately.
     - The network request is NOT sent.
     - The card and button revert to their initial state.
     - A brief confirmation appears: `"Ação cancelada"`.
   - If the 5 seconds elapse without cancellation:
     - The network request `unfollowUser(uid)` is executed normally.
     - The card reflects "Deixou de seguir ✓" or disappears per existing logic.

2. **Batch Unfollow Confirmation Modal:**
   - When the user clicks the batch unfollow button ("Deixar de seguir X selecionados"), do NOT start immediately.
   - Display a clean confirmation modal/dialog inside the overlay:
     - Title: `⚠️ Confirmar Ação em Lote`
     - Subtitle: `Você está prestes a deixar de seguir X perfis selecionados.`
     - Reassurance note: `As pausas antibloqueio (8 a 13s) serão ativadas para proteger sua conta.`
     - Two buttons:
       - `Cancelar` (dismisses modal, no action taken)
       - `Sim, iniciar unfollows` (confirms, closes modal, and begins `startBatchUnfollow()`)

3. **Replace Native `alert()` with Custom Toasts:**
   - Inspect all occurrences of `alert(...)` in `content.js` and `popup.js`.
   - Implement a reusable `showToast(message, type = 'info', duration = 4000)` helper in `content.js` that renders a sleek glassmorphic dark toast inside the overlay (`#igUnfOverlay`) or document body.
   - Replace any raw `alert(...)` with `showToast(...)`.

## Target Files
- `content.js`
- `styles.css`

## Constraints & Quality Floor
- Dark mode aesthetic matching Instagram Web (#121214, #18181b, #27272a, font `#f4f4f5`).
- No native browser alerts.
- Verify syntax with `node --check content.js`.
