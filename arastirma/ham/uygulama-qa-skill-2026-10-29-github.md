# Claude Code skills for comprehensive QA of an Expo / React Native iOS app

Research date: 2026-10-29. Read-only. Nothing was installed, cloned, or executed.
Method: GitHub repo search pages and the GitHub REST API (`api.github.com/repos/...`, `git/trees`) and raw files (`raw.githubusercontent.com`), all read through ego-browser task space `qa-skill-github-research` (space id 17), page p1. Star counts, dates and licenses are the values GitHub's API returned at check time. Items marked [unverified] were not read in full or could not be confirmed.

## Short answer

No single public skill covers the full scope (technical, fundamentals, UI, UX, logic, modernity). The best-fitting candidates split into two groups:

- **Whole-app audit loops (drive the simulator, judge pixels, fix, re-test):** `orbitextechlab/mobile-app-studio` (broadest scope), `obatried/mobile-taste` (deepest visual/modernity rubric). Both are young and have almost no stars.
- **Device-driving toolkits (what to drive and what to read back):** `conorluddy/ios-simulator-skill` (most mature, MIT, accessibility/Dynamic Type/contrast/log tooling). These are tools, not a QA judgment.
- **Complementary, not QA:** `expo/skills` (official Expo, `expo-design-system` addresses "looks AI-generated" and drift), `nextlevelbuilder/ui-ux-pro-max-skill` (design knowledge base incl. a react-native stack), `Lucifer-iron/expo-qa-testing` (Maestro + RNTL flows, regression-oriented).

## Candidates (verified)

### 1. orbitextechlab/mobile-app-studio
- URL: https://github.com/orbitextechlab/mobile-app-studio (API: https://api.github.com/repos/orbitextechlab/mobile-app-studio)
- Stars 1 · last push 2026-10-14 · license MIT · created date not checked
- SKILL.md: `SKILL.md` at repo root (126 lines, frontmatter `version: "1.3.0"`), plus `references/` with `flow-coverage.md`, `ux-audit-checklist.md`, `motion-audit-checklist.md`, `device-qa-playbook.md`, `common-findings.md`, `report-template.md` (tree: https://api.github.com/repos/orbitextechlab/mobile-app-studio/git/trees/main?recursive=1). I did not read the reference files.
- What it does: runs as four roles (UI/UX designer, product designer, UX QA engineer, motion designer). It uses the app on a simulator like a first-time user, builds a flow inventory from source, walks every flow in each data state, audits UI consistency, spacing, hierarchy, design system, accessibility and motion, fixes the code, re-tests on the device, and does a second pass. Flags: `--flows`, `--report-only`, `--no-motion`.
- Platforms (per SKILL.md description): Expo/React Native, Flutter, SwiftUI/UIKit, Android.
- Dimensions covered: flows and edge cases (strong), empty/loading/error states (mentioned in SKILL.md body), UI consistency and hierarchy (strong), accessibility (in the checklist list), motion (dedicated pass), logic (only as "preserve business logic"), modernity (implicit via "launch quality"; no explicit AI-slop rubric seen). Technical (logs, crashes, network, perf): [unverified].
- Caveat: its ground rules say "Do not ask the user to approve individual UI/UX fixes" and it edits code autonomously. For this project's rules (product and scope decisions stay with the owner), that needs an explicit guardrail.

### 2. obatried/mobile-taste
- URL: https://github.com/obatried/mobile-taste (API: https://api.github.com/repos/obatried/mobile-taste)
- Stars 0 · last push 2026-05-31 · license MIT
- Skills (3): `skills/mobile-ui-audit/SKILL.md` (79 lines), `skills/mobile-design-lab/SKILL.md` (87 lines), `skills/mobile-ui-elevate/SKILL.md` (108 lines). Shared corpus: `skills/mobile-ui-audit/reference/` (MOBILE-UI-RUBRIC.md plus 01 to 12 axis files, incl. `10-auditing-antislop.md` and `12-rn-expo-implementation.md`), confirmed in the tree listing. All three must be installed together so the references resolve (README: https://raw.githubusercontent.com/obatried/mobile-taste/main/README.md).
- What it does: drives the running RN/Expo app in the simulator (deep links per screen), screenshots every screen, and judges the rendered pixels against a 3-layer rubric (functional, structural, design-system). It checks visual hierarchy, spacing, type scale, button affordance, the empty/loading/error/success state matrix, safe-area collisions and "AI-slop tells". Output: severity-rated findings (P0 functional, P1 structural, P2 design-system) with screenshot evidence and a redesign-vs-systemic-fixes verdict. The elevate skill implements fixes and re-verifies on device, using DB seeding and Maestro taps to reach data- and interaction-dependent states.
- Requirements (README "What you need"): macOS + Xcode (`xcrun simctl`), a RN/Expo app that runs on a simulator, Maestro (optional, recommended).
- Dimensions covered: UI polish, hierarchy, spacing, consistency, state matrix, safe areas, modernity/anti-slop (strongest of the set), flows (via deep links and Maestro). Accessibility and technical checks (logs, network, perf): [unverified] in the parts I read. Performance (FPS/TTI) is explicitly out of scope and sent to `react-native-best-practices`.
- Caveat: 0 stars, a single author, and I did not read the reference corpus.

### 3. conorluddy/ios-simulator-skill
- URL: https://github.com/conorluddy/ios-simulator-skill (API: https://api.github.com/repos/conorluddy/ios-simulator-skill)
- Stars 1302 · last push 2026-10-19 · created 2025-10-17 · license MIT · not archived
- SKILL.md: `ios-simulator-skill/skills/ios-simulator-skill/SKILL.md` (470 lines, frontmatter `version: 1.7.0`). Marketplace entry: `.claude-plugin/marketplace.json`. Tree: https://api.github.com/repos/conorluddy/ios-simulator-skill/git/trees/main?recursive=1
- Scripts: about 29 Python files under `scripts/` (tree count), 30 per the SKILL.md description. Named ones include `accessibility_audit.py`, `appearance.py`, `log_monitor.py`, `build_and_test.py`, `app_launcher.py`, `app_state_capture.py`, `screen_mapper.py`/`navigator.py` (referenced in Quick Start), `container.py`, and `common/hang_pipeline.py` / `common/hang_sessions.py` (hang diagnosis).
- Requirements (SKILL.md frontmatter): macOS, Xcode, Python 3.12+, idb. Uses `xcrun simctl`.
- What it does: builds, launches and drives the app by accessibility label rather than coordinates, reads logs, captures screenshots and visual diffs, runs an accessibility audit, and toggles appearance. `appearance.py` sets dark mode, Dynamic Type sizes (XS to AX5) and Increase Contrast, and reads it back.
- Dimensions covered: technical (logs, hang diagnosis, crash/build/test runs), accessibility (automated audit, Dynamic Type, contrast), flows (navigation by accessibility label), visual evidence (screenshots, diffs). It does not judge visual quality, hierarchy or modernity. Network and perf metrics: [unverified].
- Expo: the skill targets an iOS app by bundle id, so an Expo iOS build should work, but I did not verify an Expo-specific path. [unverified]

## Other candidates checked

4. **Lucifer-iron/expo-qa-testing** — https://github.com/Lucifer-iron/expo-qa-testing · 0 stars · pushed 2026-02-26 · MIT · `SKILL.md` (294 lines, v2). Maestro E2E flows, RNTL component tests, `scripts/enforce-testids.js` (static testID enforcement), `scripts/generate-flows.ts`, GitHub Actions/Maestro Cloud CI, defect reports. Strong for regression and flow coverage; no visual or modernity judgment. Needs Maestro CLI, jest-expo, RNTL.

5. **bartwo21/ios-android-simulator-testing** — https://github.com/bartwo21/ios-android-simulator-testing · 0 stars · pushed 2026-10-15 · MIT · default branch `master` · `skills/ios-android-simulator-testing/SKILL.md` (64 lines). `sim.sh` wraps `xcrun simctl` + `fb-idb` (iOS) and `adb` (Android) with one command set: taps, typing, deeplinks, screenshots, recordings, logs, and an on-screen accessibility `tree`. It writes `.sim/config` into the project and gitignores it (sim.sh header). Good evidence tool; no judgment rubric.

6. **LambdaTest/agent-skills (TestMu AI)** — https://github.com/LambdaTest/agent-skills · 384 stars · pushed 2026-10-13 · MIT. Test-code generators: `detox-skill/SKILL.md` (Detox gray-box E2E for RN, local sims or TestMu cloud) and `xcuitest-skill/SKILL.md` (XCUITest in Swift). Listed in https://github.com/VoltAgent/awesome-agent-skills. Useful for writing a test suite, not for auditing a UI.

7. **expo/skills (official Expo)** — https://github.com/expo/skills · 3708 stars · pushed 2026-10-28 · MIT. Relevant files: `plugins/expo/skills/expo-design-system/SKILL.md` (376 lines; design tokens, component conventions, "native-slop tells", design-system drift audit; https://raw.githubusercontent.com/expo/skills/main/plugins/expo/skills/expo-design-system/SKILL.md), `expo-native-ui`, `expo-data-fetching` (loading/empty/error states), `eas-simulator` (cloud simulator; description says it is not for local sims), `.claude/skills/expo-skill-eval` (evaluates the expo skills themselves, not an app). Best official source for "modern, not generic" rules, but it guides code, not QA runs.

8. **nextlevelbuilder/ui-ux-pro-max-skill** — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill · 142252 stars (API value; unusually high for a repo created 2025-11-30, not independently confirmed) · pushed 2026-10-26 · MIT. `.claude/skills/ui-ux-pro-max/SKILL.md` (215 lines): a design knowledge base (styles, palettes, UX guidelines, 22 stacks incl. `react-native` and `swiftui`). Its priority table covers contrast 4.5:1, 44x44 touch targets, safe areas, and loading feedback. It is advisory, not a device runner. Its review agent `stack/.claude/agents/design-review.md` drives a browser via Playwright and is web-only.

9. **OneRedOak/claude-code-workflows** — https://github.com/OneRedOak/claude-code-workflows · 3915 stars · pushed 2026-10-09 · MIT. Has NO SKILL.md. The design review is an agent file: `design-review/design-review-agent.md` (https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md), which uses Playwright and needs a live preview. Web-only; not usable for iOS as-is.

10. **Dimillian/Skills** — https://github.com/Dimillian/Skills · 4017 stars · pushed 2026-03-29 · MIT. `ios-debugger-agent/SKILL.md` drives a booted simulator via XcodeBuildMCP and reads logs. Technical debugging; native Swift-focused skills in the same repo (`swiftui-performance-audit`, `swiftui-ui-patterns`). No RN-specific QA.

11. **anthropics/skills** — https://github.com/anthropics/skills · 184613 stars · pushed 2026-10-28 · API license null (skills carry their own LICENSE.txt). `skills/webapp-testing/SKILL.md`: Playwright for local web apps. Web-only. The repo tree (API) has no `dogfood` skill, so the "Anthropic dogfood skill" referenced by third-party repos was not found here. [unverified elsewhere]

12. **vercel-labs/agent-skills** — https://github.com/vercel-labs/agent-skills · 33185 stars · pushed 2026-10-28 · API license null. `skills/react-native-skills/SKILL.md` (RN/Expo performance and best-practice rules: list performance, animations, native modules). Code-quality guidance, not a runtime QA skill. `web-design-guidelines` is web-only.

13. **obra/superpowers** — https://github.com/obra/superpowers · 307776 stars · pushed 2026-10-23 · MIT. `skills/verification-before-completion/SKILL.md`, `skills/systematic-debugging/SKILL.md`, `skills/test-driven-development/SKILL.md`. Development discipline, not app QA. Already the basis of the disciplines this project uses.

Smaller, unverified-in-body candidates (metadata read from API; SKILL.md not read unless noted):
- `JohnnyMcFadden/claude-skill-react-native-accessibility` (1 star, MIT, pushed 2026-04-18; VoiceOver + TalkBack guidance and unit tests; https://github.com/JohnnyMcFadden/claude-skill-react-native-accessibility). Relevant only to the accessibility dimension.
- `tannermares/react-native-audit-claude-skill` (0 stars, MIT, pushed 2026-03-29; https://github.com/tannermares/react-native-audit-claude-skill). Description: coding standards, a11y, OWASP Mobile security, performance, testing, config. A static code audit, not a runtime one. [SKILL.md body unverified]
- `Andy-Yablonskii/mobile-sim-skill` (0 stars, license null, pushed 2026-10-02; https://github.com/Andy-Yablonskii/mobile-sim-skill). Reproduce bugs in iOS Simulator / Android emulator with `scripts/sim.sh` and `scripts/ui.py`. [SKILL.md body unverified]
- `sebryu/argent-pr-verify` (1 star, pushed 2026-09-05; https://github.com/sebryu/argent-pr-verify). PR before/after recordings on an iOS simulator via a GitHub Action. Interesting for PR evidence, not QA judgment.
- `theplant/mobai-skill-qa` (1 star, MIT, pushed 2026-05-13; https://github.com/theplant/mobai-skill-qa). Verify-only mobile flow E2E via the mobai MCP (iOS sim / Android). Depends on mobai.
- `malopezr7/serve-sim-skill` (1 star, Apache-2.0, pushed 2026-05-13; https://github.com/malopezr7/serve-sim-skill). Drives Apple simulators via Evan Bacon's serve-sim.
- `eagleisbatman/maestro-skill` (3 stars, MIT, pushed 2026-03-01; https://github.com/eagleisbatman/maestro-skill). Generates Maestro flows for RN and others.
- `zakariaf/ReactNative-Skills` (12 stars and "Updated 7 days ago" as shown in the GitHub search snippet; API not checked; https://github.com/zakariaf/ReactNative-Skills). Claims 79 RN/Expo skills with checkers. [unverified body]

Web-only, excluded for this goal: `EnchStyle/ui-ux-audit-skill` (Playwright, 360/768/1280px), `alexanderop/dogfood-qa`, `Sharan0516/dogfood-deep` (dogfood-style web exploratory testing), `heychintan/ui-design-review-skill`, `SergioBurlaka/senior-design-review`, `paulzheng116/web-design-review`.

## Registries and lists

- **GitHub search** (`github.com/search?q=...&type=repositories`): queries run: "claude code skill" "ios simulator", "SKILL.md" mobile QA, "claude skill" "design review", "ui ux audit" claude skill, "react native" claude skill testing, "dogfood" claude skill, expo claude skill simulator. Results: https://github.com/search?q=%22claude+code+skill%22+%22ios+simulator%22&type=repositories and siblings.
- **claude-plugins.dev** (https://claude-plugins.dev/skills?q=ios+simulator): the query works. It lists `ios-debugger-agent` (@Dimillian/Skills), `simulator-workflows` (@conorluddy/xclaude-plugin; repo API 186 stars, MIT, pushed 2026-10-20: https://github.com/conorluddy/xclaude-plugin), `axe-ios-simulator` (@0xBigBoss/claude-code), `ios-app-tester` (@ckorhonen/claude-skills), `claude-mobile-ios-testing`. The numbers shown in the listing do not match GitHub stars (for example Dimillian/Skills shows 1.3k in the listing but 4017 stars in the API), so I did not use them. The `0xBigBoss/claude-code` owner redirected to `alleneubank/claude-code` in the API, so that entry is [unverified].
- **skills.sh** (https://skills.sh/?q=ios+simulator): the query did not render results in the page text. It has categories (Design & UI, Mobile, Testing). Not used. [unverified]
- **Awesome lists** (README grep for simulator/mobile/ios/expo/qa/design/a11y/playwright):
  - https://github.com/ComposioHQ/awesome-claude-skills (78235 stars): lists `conorluddy/ios-simulator-skill` and Playwright skills.
  - https://github.com/VoltAgent/awesome-agent-skills (36541 stars): lists the Expo team skills, the TestMu AI (LambdaTest) set (`detox-skill`, `xcuitest-skill`, `appium-skill`) and `anthropics/webapp-testing`.
  - https://github.com/hesreallyhim/awesome-claude-code (56794 stars): has a "Design & UI/UX" section, but my keyword grep found no mobile QA entry.
  - https://github.com/travisvn/awesome-claude-skills (15616 stars): lists `ios-simulator-skill`, `playwright-skill`, `Expo Skills`.

## Coverage matrix (what each candidate covers, from what I read)

| Candidate | Technical (logs/crash/net/perf) | Fundamentals (flows, edge, empty/error) | UI quality (hierarchy, spacing, HIG) | Accessibility | UX friction | Logic | Modernity | Runs on iOS sim |
|---|---|---|---|---|---|---|---|---|
| orbitextechlab/mobile-app-studio | [unverified] | Strong | Strong | Yes (checklist) | Strong | Partial | Implicit | Yes |
| obatried/mobile-taste (audit+elevate) | [unverified] | Medium (states matrix) | Strong | [unverified] | Medium | No | Strong (anti-slop) | Yes |
| conorluddy/ios-simulator-skill | Logs, hang diagnosis | Medium (drive by label) | No judgment | Strong (audit, Dynamic Type, contrast) | No | No | No | Yes (iOS) |
| Lucifer-iron/expo-qa-testing | Partial | Strong (Maestro) | No | No | No | Partial | No | Yes |
| bartwo21/ios-android-simulator-testing | Logs | Medium | No | Partial (tree) | No | No | No | Yes |
| expo/skills (expo-design-system) | No | No | Strong (tokens, drift) | [unverified] | No | No | Strong | n/a (guidance) |
| nextlevelbuilder/ui-ux-pro-max-skill | No | No | Strong (guidance) | Strong (guidance) | Medium | No | Strong (guidance) | n/a (guidance) |

## Suggested top 3

1. **orbitextechlab/mobile-app-studio**: the only candidate that names every lens (flows, states, UI, consistency, design system, accessibility, motion) and runs them on an Expo app in the simulator, with a fix and re-test loop. Risk: 1 star, autonomous fixes.
2. **obatried/mobile-taste**: the deepest visual and modernity rubric (state matrix, safe areas, AI-slop catalog, severity-rated findings with screenshots), RN/Expo-specific. Risk: 0 stars; install all three skills together.
3. **conorluddy/ios-simulator-skill**: the most mature tool layer (1302 stars, MIT, updated 2026-10-19): logs, hang diagnosis, accessibility audit, Dynamic Type and contrast toggles. It supplies the device evidence the other two need, but makes no design judgment.

Complementary, not QA: `expo/skills` (expo-design-system) for modern, non-generic rules; `Lucifer-iron/expo-qa-testing` for a Maestro regression suite.

## Not done / limits
- No SKILL.md body was read for several candidates (see "Smaller candidates"). Their claims are from repo descriptions only.
- I did not check the reference corpus of mobile-taste or orbitextechlab's reference files.
- The GitHub API was used through the browser; unauthenticated rate limits apply.
- No CAPTCHA or bot challenge was encountered on GitHub, the API, raw.githubusercontent.com, claude-plugins.dev or skills.sh.
