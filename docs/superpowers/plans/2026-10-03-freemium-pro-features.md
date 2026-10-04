# Freemium & Pro Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Instagram Non-Followers extension into a high-converting Freemium product where core non-followers detection remains 100% free and unlimited, while unlocking powerful PRO capabilities (Recent Unfollowers Diff History, Protected VIP Whitelist, and Smart Batch Unfollow with Anti-Ban delays).

**Architecture:** Client-side modular architecture leveraging `chrome.storage.local` for zero-backend privacy. The core scanning engine remains 100% free, while state management handles license validation, historic snapshots for unfollower diffing, protected whitelist sets, and sequential queue execution for batch unfollows.

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JavaScript (ES6+), Chrome Storage API, CSS3 with GPU Acceleration, Instagram Web REST API.

---

## Global Constraints
- Core detection of non-followers must remain 100% FREE, unrestricted, and unlimited.
- Zero external servers required: user data, snapshots, and licenses are handled privately in `chrome.storage.local`.
- Must respect the Impeccable craft floor: no bounce animations, no colored glow shadows on dark backgrounds, typography >= 11px, high WCAG contrast.
- All modifications must pass `impeccable detect` with 0 warnings.
- Changes must be committed and pushed to `IuryAlmeidaDev/instagram-nao-seguidores`.

---

## File Structure Map
- `manifest.json`: Add `"permissions": ["storage"]` for snapshot and license persistence.
- `content.js`: Main content script; incorporates Pro state manager, snapshot diffing engine, VIP whitelist filters, batch unfollow queue, and upgrade modal rendering.
- `styles.css`: Visual styling for Pro gold badges, VIP stars, batch selection bar, queue modal, and Pro upgrade dialog.
- `popup.html` & `popup.js`: Quick view of Pro status and license key activation form in the popup toolbar.

---

### Task 1: Add Storage Permission & Implement Pro License Manager

**Files:**
- Modify: `manifest.json:20-25`
- Modify: `content.js:15-60`
- Modify: `styles.css:620-680`

**Interfaces:**
- Produces: `isProUser(): Promise<boolean>`, `activateProKey(key): Promise<{ success: boolean, message: string }>`

- [ ] **Step 1: Add storage permission to manifest.json**

Add `"permissions": ["storage"]` to `manifest.json`.

```json
  "permissions": [
    "storage"
  ],
```

- [ ] **Step 2: Implement Pro state manager in content.js**

Add functions to check Pro status, activate licenses (supporting instant test key `PRO-VIP-2026` and algorithmic format `IGPRO-[A-Z0-9]{8}`), and listen to storage updates.

```javascript
  // Sistema de Gerenciamento PRO
  async function getProStatus() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['ig_pro_license', 'ig_is_pro'], (res) => {
          resolve(!!res.ig_is_pro);
        });
      } else {
        resolve(false);
      }
    });
  }

  async function activateLicense(key) {
    const cleanKey = (key || '').trim().toUpperCase();
    if (cleanKey === 'PRO-VIP-2026' || /^IGPRO-[A-Z0-9]{6,10}$/.test(cleanKey)) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ ig_is_pro: true, ig_pro_license: cleanKey }, () => {
          resolve({ success: true, message: 'Plano PRO Ativado com sucesso!' });
        });
      });
    }
    return { success: false, message: 'Chave de ativação inválida ou expirada.' };
  }
```

- [ ] **Step 3: Add PRO Badge and Upgrade Modal to content.js overlay**

In `createModal()`, add a golden PRO badge / "Seja PRO" button in the header. Add an Upgrade Modal explaining PRO perks with a license activation input.

- [ ] **Step 4: Verify storage permission and modal rendering**

Verify with `impeccable detect` and test license activation in console.

- [ ] **Step 5: Commit Task 1**

```bash
git add manifest.json content.js styles.css
git commit -m "feat(pro): add storage permission, pro license manager and upgrade modal"
```

---

### Task 2: Implement VIP Whitelist (Protected Accounts)

**Files:**
- Modify: `content.js:120-220`
- Modify: `styles.css:680-740`

**Interfaces:**
- Produces: `isWhitelisted(uid): boolean`, `toggleWhitelist(user): Promise<boolean>`, `getWhitelist(): Promise<Array>`

- [ ] **Step 1: Implement Whitelist storage operations in content.js**

Add functions to get and update the VIP whitelist in `chrome.storage.local`:

```javascript
  let vipWhitelist = new Set();

  async function loadVipWhitelist() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['ig_vip_whitelist'], (res) => {
        const list = res.ig_vip_whitelist || [];
        vipWhitelist = new Set(list.map(String));
        resolve(vipWhitelist);
      });
    });
  }

  async function toggleVipUser(user) {
    const uid = String(user.pk || user.id || user.pk_id);
    if (vipWhitelist.has(uid)) {
      vipWhitelist.delete(uid);
    } else {
      vipWhitelist.add(uid);
    }
    await new Promise((resolve) => {
      chrome.storage.local.set({ ig_vip_whitelist: Array.from(vipWhitelist) }, resolve);
    });
    return vipWhitelist.has(uid);
  }
```

- [ ] **Step 2: Add VIP Star button on user cards in createUserCardElement()**

Update user cards to display a star icon `⭐`. When clicked, toggles VIP state. If VIP, replaces the "Deixar de Seguir" button with a green shield/badge "VIP Protegido 🛡️", preventing accidental unfollow.

- [ ] **Step 3: Add "VIPs" Tab in Results View**

Add a 4th tab: **VIPs (`count`)** displaying only whitelisted accounts.

- [ ] **Step 4: Add styling for VIP cards and badges in styles.css**

Style the VIP star toggle, protected shield badge, and tab badge.

- [ ] **Step 5: Commit Task 2**

```bash
git add content.js styles.css
git commit -m "feat(vip): implement protected VIP whitelist with accidental unfollow shield"
```

---

### Task 3: Snapshot Diff Engine & "Quem Me Deu Unfollow" (Recent Unfollowers)

**Files:**
- Modify: `content.js:320-430`
- Modify: `styles.css:740-800`

**Interfaces:**
- Consumes: `followersMap` from Phase 1 scan
- Produces: `scanResults.recentUnfollowers: Array`, `saveFollowersSnapshot()`

- [ ] **Step 1: Implement Snapshot Persistence & Diff Engine**

At scan completion, fetch the previous followers snapshot from `chrome.storage.local`. Compute diff:
`recentLost = previousSnapshot.followers.filter(id => !currentFollowers.has(id))`.
Save current followers as the new snapshot.

```javascript
  async function computeRecentUnfollowersDiff(currentFollowersMap) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['ig_followers_snapshot'], (res) => {
        const prev = res.ig_followers_snapshot;
        const lost = [];
        if (prev && prev.users && Array.isArray(prev.users)) {
          prev.users.forEach((u) => {
            const uid = String(u.pk || u.id || u.pk_id);
            if (!currentFollowersMap.has(uid)) {
              lost.push(u);
            }
          });
        }
        // Salva novo snapshot
        const newSnapshot = {
          timestamp: Date.now(),
          users: Array.from(currentFollowersMap.values()).map(u => ({
            pk: u.pk || u.id,
            username: u.username,
            full_name: u.full_name,
            profile_pic_url: u.profile_pic_url
          }))
        };
        chrome.storage.local.set({ ig_followers_snapshot: newSnapshot }, () => {
          resolve(lost);
        });
      });
    });
  }
```

- [ ] **Step 2: Add "Deixaram de Seguir" Tab with Alert Badge**

Add a tab in the header: **🚨 Deixaram de Seguir (`lost.length`)**.
- If user is FREE: Shows teaser count: *"X pessoas deixaram de te seguir desde a última varredura"* with a sleek PRO unlock CTA.
- If user is PRO: Displays the exact list of profiles who unfollowed since the last scan with timestamp.

- [ ] **Step 3: Style the Recent Unfollowers Tab & Teaser in styles.css**

Style the alert badge (`#ef4444` red tone), card timestamp, and teaser lock card.

- [ ] **Step 4: Commit Task 3**

```bash
git add content.js styles.css
git commit -m "feat(history): add historic followers snapshot diff to track recent unfollowers"
```

---

### Task 4: Smart Batch Unfollow Queue with Humanized Delays

**Files:**
- Modify: `content.js:430-580`
- Modify: `styles.css:800-880`

**Interfaces:**
- Produces: `startBatchUnfollow(selectedUsers, options): void`, `pauseBatch()`, `cancelBatch()`

- [ ] **Step 1: Add selection checkboxes and Batch Action Bar**

In `notFollowingBack` tab:
- Add a checkbox on each card.
- Add a batch toolbar above the list: `[✓ Selecionar 10]`, `[✓ Selecionar 25]`, `[⚡ Deseguir Selecionados (X)]`.

- [ ] **Step 2: Implement humanized queue execution engine**

When clicked, opens an execution progress banner:
- Unfollows one user at a time using `/api/v1/web/friendships/${uid}/unfollow/`.
- Safe randomized delay between actions: **8 to 15 seconds** with a live countdown ring (e.g. *"Próxima ação em 9s..."*).
- Anti-ban safeguards: Stop if error 429 or status != 200.
- Free users can batch up to 3 users as a trial; Pro users have unlimited batching.

- [ ] **Step 3: Style the batch toolbar and queue banner in styles.css**

Create accessible checkboxes, batch toolbar, progress track, and pause/stop controls.

- [ ] **Step 4: Commit Task 4**

```bash
git add content.js styles.css
git commit -m "feat(batch): add humanized batch unfollow queue with anti-ban random delays"
```

---

### Task 5: Impeccable Quality & Craft Verification

**Files:**
- Modify: `styles.css`
- Modify: `content.js`

- [ ] **Step 1: Run impeccable detect across all files**

Run:
`& "C:\Users\iuryc\.agents\skills\impeccable\scripts\impeccable.cmd" detect --json styles.css content.js popup.html`
Verify: output is `[]` (0 violations).

- [ ] **Step 2: Verify responsive layout and high-contrast dark theme**

Verify gold PRO accents, red alert badges, green VIP badges, and ensure font size >= 11px everywhere.

- [ ] **Step 3: Commit Task 5**

```bash
git add styles.css content.js
git commit -m "style(polish): pass all Impeccable craft floor rules on Freemium & PRO features"
```

---

### Task 6: Final Verification, Sync and Push to GitHub

**Files:**
- Repository: `C:\Users\iuryc\projects\instagram-nao-seguidores`

- [ ] **Step 1: Check git status and branch sync**
- [ ] **Step 2: Push all commits to `origin main`**
- [ ] **Step 3: Update documentation and instruct user on reload**
