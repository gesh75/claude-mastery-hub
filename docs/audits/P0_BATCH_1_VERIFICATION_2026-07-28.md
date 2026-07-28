# P0 Batch 1 Verification

Verification date: 2026-07-28  
Branch: `fix/p0-responsive-navigation`  
Scope: responsive containment, accessible mobile navigation, and Playwright regressions only

## Root causes

### Page-level horizontal overflow

The two-column `.layout` grid used `288px 1fr`, but its `main` grid item retained the CSS default `min-width: auto`. Intrinsically wide descendants—especially preformatted commands and tables—therefore supplied a minimum content width of approximately 1,254 px on mobile and 1,282 px on desktop. The desktop grid then added the 288 px sidebar, 34 px gap, and outer padding.

`body { overflow-x: clip; }` concealed the resulting overflow instead of containing it, so users could not recover the clipped content. Baseline Chromium measurements were:

| Viewport | Root width | Overflow |
| --- | ---: | ---: |
| 320×568 | 1,276 px | 956 px |
| 360×800 | 1,276 px | 916 px |
| 375×812 | 1,276 px | 901 px |
| 390×844 | 1,276 px | 886 px |
| 414×896 | 1,276 px | 862 px |
| 768×1024 | 1,276 px | 508 px |
| 1024×768 | 1,626 px | 602 px |
| 1280×800 | 1,626 px | 346 px |
| 1440×900 | 1,686 px | 246 px |

The fix lets `main` shrink, constrains responsive media and section descendants, allows grids to collapse below 220 px when needed, breaks unbounded prose safely, and makes tables/code own their horizontal scrolling. The body clipping rule was removed.

### Closed mobile menu remained interactive

The sidebar was visually moved off-canvas with `transform: translateX(-105%)`, but remained focusable and exposed in the accessibility tree. The trigger's accessible name was the raw `☰` glyph and it had no `aria-expanded` or `aria-controls`. JavaScript only toggled `.open`; it did not manage focus, Escape, viewport transitions, or history navigation.

The corrected state model uses:

- Closed mobile: `hidden`, `inert`, `aria-hidden="true"`, `aria-expanded="false"`
- Open mobile: sidebar exposed, `aria-hidden="false"`, `aria-expanded="true"`, focus on navigation search
- Desktop: sidebar exposed, mobile state reset, mobile trigger hidden
- Escape, navigation activation, resize back to mobile, and browser history: close through the same state function and restore trigger focus when appropriate

## Automated verification

Commands:

```bash
npm install
npx playwright install chromium
npm test
```

Regression-first evidence:

- Before production changes: 12 failed, 1 passed
- Responsive failures: all nine viewports exceeded root width
- Mobile navigation failures: missing accessible name/state and missing focus transfer

Final Playwright result:

- 14 passed, 0 failed
- Nine exact viewport cases
- Long code and table containment
- Quiz, Practice Lab, and Final Exam interactions
- Closed-menu keyboard order and ARIA snapshot
- Keyboard open/Enter/Escape/focus restoration
- Desktop/mobile resize and browser back/forward state
- Basic navigation/learning-engine smoke test
- Scoped Axe WCAG 2.2 AA scan for open and closed navigation

## Manual Chromium verification

| Check | Result |
| --- | --- |
| 320×568 mobile landing | Root 320/320 px; menu closed, hidden, inert; readable landing layout |
| 390×844 mobile menu | Root 390/390 px; mouse open focused search; Escape closed and returned focus |
| 768×1024 tablet long content | Root 768/768 px; 776 px command contained in a 684 px locally scrolling `pre` |
| 1024×768 desktop | Root 1024/1024 px; sidebar visible; main 658 px; no clipping |
| 1440×900 desktop | Root 1440/1440 px; 1,320 px layout; main 954 px; no regression |
| Quiz at 390 px | Answer button fully visible and operable |
| Practice Lab at 390 px | Input and Check button fully visible; valid answer produced feedback |
| Final Exam at 390 px | Options fully visible and selection state applied |
| Keyboard only | Tab/Enter/Escape flow verified by Playwright with real keyboard input |
| 200% reflow equivalent | 1024×768 at 200% represented as 512×384 effective CSS viewport; root 512/512 px |
| Console | No errors captured |

The harness cannot change the browser chrome's zoom control directly. The 200% check therefore verifies the equivalent reflow geometry (half-size CSS viewport), not a literal browser-menu zoom action.

## Screenshots

- [320 px mobile, closed menu](screenshots/p0-mobile-320-closed.jpg)
- [390 px mobile, open menu](screenshots/p0-mobile-390-open.jpg)
- [1440 px desktop](screenshots/p0-desktop-1440.jpg)

## Deferred by scope

- Persisted-state validation and schema migration
- Cross-tab synchronization
- Practice Lab answer validation
- Content/model currency
- Architecture or build-system refactoring
- New product features
