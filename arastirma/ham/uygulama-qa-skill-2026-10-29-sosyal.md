# QA and design review for an Expo / React Native iOS app: social and web research (2025-2026)

Research date: 2026-10-29. Method: ego-browser, task space `qa-skill-social-research` (space 18), page p1 reused. Read-only: nothing cloned, installed or run.

Legend: `[unverified]` = seen only in a search listing, a tweet, a video description or a comment, not checked on the item's own page. Repo existence was checked on github.com (all 16 GitHub repos below resolved, none archived). GitHub star counts were NOT captured, so no star numbers are given except where a source states one, marked as a claim.

Reddit dates are the thread timestamp (UTC date). YouTube dates are the upload date from the watch page. X dates are the post timestamp.

---

## 1. YouTube

Searches run: "claude code ios simulator testing skill", "claude code design review agent", "claude code QA skill mobile app", "claude skills ui ux". The design-review query returned mostly generic subagent videos; no video was found that is specifically about a visual design-review agent.

### Simulator / mobile QA

- **Claude Code Tests Your Entire iOS App Autonomously**, TechWealth Hub, 2026-04-10
  https://www.youtube.com/watch?v=hQKm80JIkEw
  Repo in description: https://github.com/conorluddy/ios-simulator-skill (the description says "7,600+ GitHub stars", 21 scripts, 96% token reduction; these are the author's claims, `[unverified]`).
- **Let Claude Test Your iPhone App in the Simulator While You Watch (No Xcode Skills)**, Simple Tech Man, 2026-10-23
  https://www.youtube.com/watch?v=ZCD9GyHj5mg
  No repo. Uses the Claude desktop app Code tab and the built-in iOS Simulator pane. Warns that simulator screenshots are sent to Anthropic, that the feature needs a paid plan, and that it drives simulated devices only. Links the official docs https://code.claude.com/docs/en/desktop-ios-simulator.
- **Claude Code iOS Simulator Update Is INSANE**, Julian Goldie SEO, 2026-07-25
  https://www.youtube.com/watch?v=CxcpuYeRgKM
  No repo. Mostly a walkthrough of the built-in simulator feature with course links.
- **The NEW Way to Build Mobile Apps with Claude Code & Fable 5 (iOS Simulator)**, Build Great Products, 2026-07-23
  https://www.youtube.com/watch?v=UZYW8BnclvI
  No GitHub repo. Uses the creator's own paid "BuilderOS" skills ("Product Planner", "Build MVP") and a Dribbble reference image for the UI.
- **Everything New in Claude Code, Auto Mode, Design, iPhone Simulator, Browser (Full Guide)**, That AI Trick, 2026-09-03
  https://www.youtube.com/watch?v=KpWAkAkkHDQ
  No repo links in the description. Covers the simulator public beta and the /design preview.
- **Claude Code as a QA engineer, automated iOS app testing with FlowDeck**, Daniel Bernal, 2026-04-07
  https://www.youtube.com/watch?v=1ANlOys4bTI
  No GitHub repo. Commercial tool FlowDeck (https://flowdeck.studio): "one prompt, review every screen, test interactions, find bugs". This is the only video found that frames the job as a QA pass.
- **Claude Code for Mobile Devs: The 5 Skills I Use on Every App**, Code with Beto, 2026-04-23
  https://www.youtube.com/watch?v=mvfQGjQurAQ
  No GitHub repo. Five skills: ASO audit, App Store pre-submission testing, icon generator, native UI for RN/Expo/Android. Install notes are on https://codewithbeto.dev/blog/best-claude-skills-for-mobile-development (not opened).

### Design / UI skills

- **Insane Claude Design Skills You Need To Actually Build Beautiful Sites**, AI LABS, 2026-08-24
  https://www.youtube.com/watch?v=Ysr7oNDajJI
  Repos in description: https://github.com/emilkowalski/skills, https://github.com/ConardLi/garden-skills, https://github.com/elayadesign/ai-design-skills, https://github.com/MengTo/Skills, https://github.com/jakubkrehel/skills, https://github.com/codeswithroh/tastemaker, https://github.com/Owl-Listener/designer-skills. Includes "review skills that score a design". Mostly web-focused.
- **Use Claude Code DESIGNER Skill to 10x UI Designs**, DesignCourse, 2026-02-20
  https://www.youtube.com/watch?v=Em9EzurouOU
  Repo in description: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design (same skill as anthropics/skills frontend-design).
- **How to Use Claude Skills as a Designer**, Griffin Wooldridge, 2026-03-09
  https://www.youtube.com/watch?v=Iup1WlUyj9M
  Links: frontend-design SKILL.md in anthropics/claude-code, plus listing pages on mcpservers.org for Figma implement-design, Theme Factory, Brand Guidelines, Canvas Design.
- **Claude Code Frontend Design: 2 Skills That will 10x your UI**, Coding With Abbas, 2026-09-14
  https://www.youtube.com/watch?v=QDqjteRiOdI
  Names Frontend Design and Impeccable. No links in the description.

### Code review (not visual, but found in the review query)

- **Anthropic's NEW Claude Code Review Agent (Full Open Source Workflow)**, Patrick Ellis, 2025-09-14
  https://www.youtube.com/watch?v=nItsfXwujjg
  Repos in description: https://github.com/anthropics/claude-code-action, https://github.com/anthropics/claude-code-security-review, https://github.com/OneRedOak/claude-code-workflows, https://github.com/wshobson/agents.

---

## 2. Reddit

Searches run: site-wide (3 queries + "claude skills ui ux") and subreddit-restricted: r/ClaudeAI ("claude code design review skill"), r/ClaudeCode ("ios simulator skill"), r/reactnative ("claude code simulator", "claude code skill testing expo"), r/iOSProgramming ("claude code simulator", "claude code testing skill"). Only threads that bear on the topic are listed.

### Simulator / QA

- **Stop letting Claude Code boot the iOS Simulator**, r/ClaudeCode, 2026-10-22
  https://www.reddit.com/r/ClaudeCode/comments/1xcso5g/stop_letting_claude_code_boot_the_ios_simulator/
  Recommends https://github.com/abacusai/simless. Claims: about 2.2 s per check instead of about 22 s, accessibility-tree output (about 150 tokens per screen), flags unlabeled controls, off-screen elements, small tap targets and overlaps. Comment asks for a comparison with direct simulator access; a reply points to a comparison table on the GitHub page (not checked). The post is written by the tool's own user, so treat it as promotion.
- **With the recent wave of developer account terminations, I built a free Claude Code skill that audits your iOS app against Apple's guidelines before you submit**, r/appledevelopers, 2026-10-09
  https://www.reddit.com/r/appledevelopers/comments/1x1v7z2/with_the_recent_wave_of_developer_account/
  Repo: https://github.com/Tilak1028-st/apple-compliance-audit-skill (MIT, per post). Pre-submission compliance audit, not a UI test. Criticism: commenters doubt the author's credibility ("20+ apps"), and argue the skill helps vibe-coded apps get through review.
- **I open-sourced 79 skills that make AI agents prove their React Native code works, not just say it does**, r/reactnative, 2026-10-17
  https://www.reddit.com/r/reactnative/comments/1x8kmg8/i_opensourced_79_skills_that_make_ai_agents_prove/
  Repo: https://github.com/zakariaf/ReactNative-Skills. Each skill ends in a Node checker that prints PASS or FAIL. A Stop hook enforces the gates. Post written by the author. One commenter asked how the fix loop works (answered by the author). Scope is engineering rules, not visual QA.
- **Claude Code controlling both iOS simulator & Android emulator at the same time**, r/reactnative, 2026-06-16
  https://www.reddit.com/r/reactnative/comments/1u7cxqn/claude_code_controlling_both_ios_simulator/
  Uses Argent (software-mansion/argent). Comments: a Software Mansion-linked commenter says the post is "lazy" for not naming Argent; another commenter promotes https://github.com/vostride/agent-qa (self-described QA agent; likely promotional, `[unverified]`); maestro MCP is mentioned as an alternative; one user finds Argent "kind of slow".
- **Anyone letting agents drive their app in the Simulator? Looking for feedback**, r/iOSProgramming, 2026-10-16
  https://www.reddit.com/r/iOSProgramming/comments/1x7avhq/anyone_letting_agents_drive_their_app_in_the/
  Post by the Argent maintainer, linking https://github.com/software-mansion/argent. Feedback: an XCTest-based approach gets skipped by Claude ("Claude would skip the MCP and go directly for XCTest and ADB"); an Xcode MCP server is "pretty good"; the Argent team says tapping is the smallest part (logs, network, Instruments, rerunnable flows).
- **What's the best way for an AI agent to interact with the iOS Simulator?**, r/iOSProgramming, 2026-10-21
  https://www.reddit.com/r/iOSProgramming/comments/1xbw42v/whats_the_best_way_for_an_ai_agent_to_interact/
  Mentions: Claude app's built-in simulator ("works great"), Argent ("better than nothing"), maestro MCP and mobile-mcp (good for smoke tests, not full UI tests), Appium + XCUITest (breaks on Xcode 27 when using idb), agent-device MCP, simctl plus a small XCUITest target. Link: https://github.com/Monadix-AI/monad-design (what it is: `[unverified]`).
- **How are you giving Claude Code visibility into your iOS simulator during Expo/React Native development?**, r/iOSProgramming, 2026-09-03
  https://www.reddit.com/r/iOSProgramming/comments/1w6iibr/how_are_you_giving_claude_code_visibility_into/
  Mentions Argent, Expo MCP local tools, metro-mcp ("good success" for end-to-end iteration), https://github.com/jo-duchan/tapflow (self-hosted iOS and Android simulator streaming, per its GitHub page), https://github.com/Monadix-AI/monad-design, RocketSim CLI. Several links were removed by subreddit automod for affiliate parameters.
- **How do you let AI agents interact with React Native apps?**, r/reactnative, 2026-10-28
  https://www.reddit.com/r/reactnative/comments/1xhpw20/how_do_you_let_ai_agents_interact_with_react/
  Names Argent (several commenters: "argent is best", "done better QA of my app with all the negative test cases than my team"), Expo MCP, agent-device, click-click, Maestro MCP with adb as a simpler route, scrcpy for watching real devices. No repo links in the thread body.
- **Using Claude code to build an 'interactive skill' to produce a QA Test Plan**, r/ClaudeCode, 2026-10-10
  https://www.reddit.com/r/ClaudeCode/comments/1x26je0/using_claude_code_to_build_an_interactive_skill/
  Advice: write the QA process as plain steps first, then SKILL.md with "ask one question at a time"; save decisions to a notes file; look at Superpowers (https://github.com/obra/superpowers).
- **My coding agent writes code faster than I can review it, so I built it a review team**, r/claudeskills, 2026-10-19
  https://www.reddit.com/r/claudeskills/comments/1x9l1y6/my_coding_agent_writes_code_faster_than_i_can/
  Repo: https://github.com/tap222/assay-evals (per comment). Pipeline tool (Hallmark) with reviewer and fixer agents, not visual QA. Author's own product.

### Design / UI skills

- **How are people actually getting Claude to build beautiful UIs instead of generic AI slop?**, r/ClaudeAI, 2026-09-28
  https://www.reddit.com/r/ClaudeAI/comments/1ws9oix/how_are_people_actually_getting_claude_to_build/
  Most-upvoted replies (125 and 144 points) say the same thing: give references and direct it like a director. Auto-generated TL;DR (mod bot) lists: reference screenshots, a design system, impeccable.style, screenshot-critique-fix loops. Criticism of impeccable: a commenter (57 points) calls its website "atrocious"; another says its examples "look like every Claude generic design ever"; one says "taste skill was better". Also links https://github.com/VoltAgent/awesome-design-md (DESIGN.md collection).
- **What is the best model and skill for ui/ux?**, r/ClaudeAI, 2026-10-20
  https://www.reddit.com/r/ClaudeAI/comments/1xazrvs/what_is_the_best_model_and_skill_for_uiux/
  Recommends Anthropic's frontend-design skill (https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md; the skill lists "AI tells" like cream background with serif and orange accent, all-caps labels). Also impeccable (https://impeccable.style/) and mobbin + shadcn MCP.
- **Any tips on making a UI/UX frontend not look like it was obviously coded by Claude?**, r/ClaudeCode, 2026-10-11
  https://www.reddit.com/r/ClaudeCode/comments/1x3go5l/any_tips_on_making_a_uiux_frontend_not_look_like/
  Top reply (780 points) is a joke about reasoning effort. Substantive replies: taste and empathy cannot be delegated; use impeccable and provide your own color template; ask Claude to quiz you on styles.
- **Best Claude Frontend/Design/UX-UI Skill Set**, r/ClaudeDesign, 2026-10-02
  https://www.reddit.com/r/ClaudeDesign/comments/1wvfgec/best_claude_frontenddesignuxui_skill_set/
  Replies: 21st.dev, styles.refero.design, mobbin MCP + opus with impeccable skill ("less slop typed design foundation"), and "Claude Design" as a separate product. One reply: "I just tell Claude to mimic a UI/UX I like".
- **Top 7 Claude skills for design and UI, by install count**, r/ClaudeDesign, 2026-08-16
  https://www.reddit.com/r/ClaudeDesign/comments/1vpi5mf/top_7_claude_skills_for_design_and_ui_by_install/
  Install-count ranking from a third-party aggregator (skillselion; counts are the aggregator's, `[unverified]`): frontend-design 784,427; web-design-guidelines (vercel-labs/agent-skills) 547,800; design-taste-frontend (leonxlnx/taste-skill) 367,454; anti-ui-slop (uizze.com) 336,509; ui-ux-pro-max (nextlevelbuilder/ui-ux-pro-max-skill) 318,475; high-end-visual-design (leonxlnx/taste-skill) 276,168; redesign-existing-projects (leonxlnx/taste-skill) 272,434; impeccable ninth at 235,708. Criticism: the OP says install counts "tell you nothing about whether the output looks good"; one replier says "None work. Only thing that works is Claude design".
- **Is Claude Code just bad at design, or am I doing something wrong**, r/ClaudeAI, 2026-08-10
  https://www.reddit.com/r/ClaudeAI/comments/1vkxzef/is_claude_code_just_bad_at_design_or_am_i_doing/
  OP tried Impeccable, UI UX Pro Max, Taste Skill, emilkowalski/skill and frontend-design. Replies: "too many skills that do the same thing"; "Claude Design is better for the first draft, impeccable for fine tuning"; "give it a reference"; a commenter says a design manifest extracted after the project grew helped most.
- **Any good Claude frontend-design skills?**, r/ClaudeAI, 2026-07-20
  https://www.reddit.com/r/ClaudeAI/comments/1v1v713/any_good_claude_frontenddesign_skills/
  Replies: use a real design system (SBB design system example); build your own style guide; "impeccable" (one-word reply); one commenter says none of the skills made a difference.
- **any good claude skills or md files for ios app design (preferably swift)**, r/ClaudeCode, 2026-07-08
  https://www.reddit.com/r/ClaudeCode/comments/1uqworj/any_good_claude_skills_or_md_files_for_ios_app/
  OP says frontend, taste and impeccable skills were built for websites, not apps. Reply: find comps you like, give images, build from there.

### Other (lower relevance)

- r/ClaudeAI "What do you think of this Claude code-review process?" 2026-10-26 (https://www.reddit.com/r/ClaudeAI/comments/1xgamg2/what_do_you_think_of_this_claude_codereview/) and r/ClaudeAI "UX Designers Using Claude Code" 2026-09-23 (https://www.reddit.com/r/ClaudeAI/comments/1wogztl/ux_designers_using_claude_code/) appeared in search. Not read.
- r/AI_Agents "I built an iOS agent skill system for Claude Code that generates real apps without token waste", 2026-04-27 (https://www.reddit.com/r/AI_Agents/comments/1swx84w/i_built_an_ios_agent_skill_system_for_claude_code/). Thread is low signal; no repo link seen.

---

## 3. X

Searches run (`f=top`): "claude code skill ios simulator", "claude skill design review", "claude code QA agent", "claude code design review agent", "impeccable claude skill", "ios-simulator-skill claude", "argent software mansion agent simulator", "simless claude code". Search results are noisy and most posts show no repo links.

- @ClaudeDevs (Anthropic's official dev account), 2026-07-21: "Claude Code on desktop now works with the iOS simulator... public beta." https://x.com/ClaudeDevs/status/2079674432038248611 (official announcement; no repo).
- @ClaudeDevs, 2026-07-06: "Getting started with loops", describes loop types and links https://code.claude.com/docs/en/skills and https://code.claude.com/docs/en/code-review. https://x.com/ClaudeDevs/status/2074208949205881033 (official; no repo).
- @addyosmani (Addy Osmani), 2026-10-26: "How the Claude Code team does code review". Links https://www.anthropic.com/engineering/redesigning-source-control and https://code.claude.com/docs/en/code-review. https://x.com/addyosmani/status/2114604912520921136 (no repo).
- @Mr_Buzzoni, 2026-04-15: "Top 67 Claude Skills...". Repos: https://github.com/anthropics/skills (frontend-design, skill-creator), https://github.com/mattpocock/skills (claims 15k stars, `[unverified]`), https://skillsmp.com/. https://x.com/Mr_Buzzoni/status/2044317956893471081
- @neerajjj6785, 2026-09-29: "Top 10 OpenCode Skill Repos". Lists #3 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill, #6 https://github.com/addyosmani/agent-skills, #10 https://github.com/pbakaus/impeccable, #1 https://github.com/obra/superpowers. https://x.com/neerajjj6785/status/2104895659157684597
- @CodyBontecou, 2026-10-28: "Highly recommend https://github.com/software-mansion/argent ... if this is how you're currently handling phone automation." https://x.com/CodyBontecou/status/2115417650549678307
- @grokkedd, 2026-08-29: "Goldie is out, an App Store screenshot generator built for coding agents"; uses Argent to drive the app. https://x.com/grokkedd/status/2093768205693051084
- @blazejkustra_ (Argent team), 2026-10-23 and 2026-10-28: "built + tested with Argent" and "Meet the Argent family" (MCP server, CLI, SDK). https://x.com/blazejkustra_/status/2113627565654982933 and https://x.com/blazejkustra_/status/2115435670508290167 (team-authored).
- @ssarisen, 2026-05-03: recommends a CLI tool for iOS Simulator control via accessibility API (Turkish post; tool name not captured). https://x.com/ssarisen/status/2050884085275361679
- @Mkandeger2, 2026-10-28: "6 lines in my CLAUDE.md stopped Claude Code from breaking my iOS app" (plan first, small diffs, build and test after each change). https://x.com/Mkandeger2/status/2115506908094419004 (no repo).
- @zentalksai, 2026-05-26: names Anthropic's Frontend Design skill, "136,000 stars" claim, no link. https://x.com/zentalksai/status/2059246648161685660 (`[unverified]` claim).
- @heydamir, 2026-10-28: "1M views on a design post... I'll share the unslop skill for Claude in a few days." https://x.com/heydamir/status/2115431530407301345 (no repo yet).

---

## 4. Blogs, docs and web listings

- **Test iOS apps in the simulator**, Claude Code Docs (Anthropic official), undated page
  https://code.claude.com/docs/en/desktop-ios-simulator
  Public beta in Claude Code Desktop on macOS. Available on Pro, Max, Team and Enterprise (not Enterprise orgs with HIPAA configuration). A separate simulator per session. Primary source for the built-in feature.
- **Expo Skills for AI agents**, Expo docs (official)
  https://docs.expo.dev/skills/
  Official skills repo: https://github.com/expo/skills (last commit 2026-10-28). The listed skills cover animation, app clips, brownfield, data fetching, design system, dev client, DOM, module, native UI, router and project structure. No QA or simulator-testing skill appears in that list.
- **Redesigning source control at Anthropic**, Anthropic Engineering, published 2026-10-13
  https://www.anthropic.com/research/redesigning-source-control (the /engineering/ URL redirects here)
  About merge throughput (about 2,500 to over 30,000 changes per day) and an in-house VCS. Context for review at scale, not a QA skill.
- **AI Can Now Test Your iOS App. Using Claude + iOS Simulator for Autonomous UI Testing**, Hojun Rooney Baek, Medium, 2026-03-12
  https://medium.com/@hojunrooneybaek/ai-can-now-test-your-ios-app-4b9b0471dcf0
  Tutorial-level post on driving the iOS Simulator from Claude. No repo linked.
- **Search listings (DuckDuckGo html), not opened**: "Design Review & Visual QA - Claude Code Skill" (mcpmarket.com, skills-guides.com), "visual-qa" in https://github.com/ArchieeR/claude-skills (skills/visual-qa/SKILL.md), "visual-qa" in https://github.com/DanielKerridge/claude-code-power-platform-skills, "design-review" on skillselion.com and awesomeskill.ai (gstack), "iOS Simulator Skill for Agents" (github.com/conorluddy/ios-simulator-skill), "iPhone Simulator Control for Claude Code" (https://github.com/asulik1988/iphone-simulator-control), "Claude Code Agent System for Expo/React Native" (https://github.com/codenutt/claude-code-reactnative-expo-agent-system and a near-identical repo under Geozstevenzz). All `[unverified]` as recommendations.

---

## 5. Repos mentioned

Count = number of distinct sources (Reddit thread, YouTube video, X post, or web/docs page) that link the repo or name it. Source-type breakdown is in the notes column. Author-written or team-written posts are marked "self" because they are promotion, not independent endorsement.

| # | Repo | URL | Independent sources | Breakdown | Notes |
|---|---|---|---|---|---|
| 1 | software-mansion/argent | https://github.com/software-mansion/argent | 6 non-team (+2 team, +1 maintainer post) | Reddit: 1u7cxqn, 1w6iibr, 1xhpw20, 1xbw42v (commenter); X: @CodyBontecou, @grokkedd | Team and self: Reddit 1x7avhq (maintainer, links repo), X @blazejkustra_ x2. Mixed reviews: Claude may skip MCPs for direct XCTest/adb; "kind of slow". Repo last commit 2026-10-28. |
| 2 | pbakaus/impeccable | https://github.com/pbakaus/impeccable | 9 by name; repo URL in 1 source | Reddit: 1ws9oix, 1xazrvs, 1x3go5l, 1vkxzef, 1v1v713, 1wvfgec, 1uqworj (name, plus impeccable.style links in 4); YouTube: QDqjteRiOdI (name); X: @neerajjj6785 (repo link) | Strong community pick for design. Heavy criticism of the impeccable.style site and "looks like every Claude design". Repo last commit 2026-10-28. |
| 3 | anthropics/skills (frontend-design) | https://github.com/anthropics/skills | 3 direct links; 5+ by name or via the plugin path | Reddit: 1xazrvs (SKILL.md link), 1vpi5mf (skillselion listing); X: @Mr_Buzzoni (repo link); YouTube: Em9EzurouOU and Iup1WlUyj9M link the same skill under https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design; Reddit 1vkxzef, 1v1v713 name it | Official Anthropic. Install count 784k on the aggregator `[unverified]`. Repo last commit 2026-10-28. |
| 4 | nextlevelbuilder/ui-ux-pro-max-skill | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 3 | Reddit: 1vkxzef (name), 1vpi5mf (listing, 318k installs `[unverified]`); X: @neerajjj6785 (repo link) | Repo last commit 2026-10-26. |
| 5 | conorluddy/ios-simulator-skill | https://github.com/conorluddy/ios-simulator-skill | 1 with link (+ several listings) | YouTube: hQKm80JIkEw (repo link; "7,600+ stars" claim `[unverified]`); DuckDuckGo listings (`[unverified]`) | Accessibility-tree approach; 21 scripts (per its listing). Repo last commit 2026-10-19. Strongest QA-specific option seen beyond Argent. |
| 6 | abacusai/simless | https://github.com/abacusai/simless | 1 | Reddit: 1xcso5g (self post) | Headless SwiftUI checks via accessibility trees; "2.2 s per check" claim. Repo last commit 2026-10-25. Asked for a comparison in-thread. |
| 7 | leonxlnx/taste-skill | https://github.com/leonxlnx/taste-skill | 4 by name | Reddit: 1vpi5mf (listing, 3 skills), 1vkxzef, 1uqworj, 1ws9oix (comment) | Art direction, reference images, browser check. Repo last commit 2026-10-24. |
| 8 | Monadix-AI/monad-design | https://github.com/Monadix-AI/monad-design | 2 | Reddit: 1xbw42v, 1w6iibr | Purpose not verified `[unverified]`. |
| 9 | jo-duchan/tapflow | https://github.com/jo-duchan/tapflow | 1 | Reddit: 1w6iibr | Self-hosted iOS and Android simulator streaming (GitHub description). Repo last commit 2026-10-29. |
| 10 | zakariaf/ReactNative-Skills | https://github.com/zakariaf/ReactNative-Skills | 1 (self) | Reddit: 1x8kmg8 | 79 RN skills with checkers; engineering rules, not visual QA. Repo last commit 2026-10-17. |
| 11 | Tilak1028-st/apple-compliance-audit-skill | https://github.com/Tilak1028-st/apple-compliance-audit-skill | 1 (self) | Reddit: 1x1v7z2 | App Store guideline audit before submission. Repo last commit 2026-10-09. |
| 12 | vostride/agent-qa | https://github.com/vostride/agent-qa | 1 (likely promotional `[unverified]`) | Reddit: 1u7cxqn (comment) | Self-described QA agent with memory. Repo last commit 2026-10-24. |
| 13 | VoltAgent/awesome-design-md | https://github.com/VoltAgent/awesome-design-md | 1 | Reddit: 1ws9oix | Collection of DESIGN.md files from brand design systems. Repo last commit 2026-10-28. |
| 14 | emilkowalski/skills | https://github.com/emilkowalski/skills | 2 | YouTube: Ysr7oNDajJI (link); Reddit: 1vkxzef (name) | Repo last commit 2026-10-28. |
| 15 | obra/superpowers | https://github.com/obra/superpowers | 3 | Reddit: 1x3go5l (link), 1x26je0 (comment); X: @neerajjj6785 | General workflow skills, not design or QA specific. |
| 16 | addyosmani/agent-skills | https://github.com/addyosmani/agent-skills | 1 | X: @neerajjj6785 | Repo last commit 2026-10-29. |
| 17 | expo/skills | https://github.com/expo/skills | 1 official | docs.expo.dev/skills | Official Expo skills; no QA skill in the listing. Repo last commit 2026-10-28. |
| 18 | codenutt/claude-code-reactnative-expo-agent-system | https://github.com/codenutt/claude-code-reactnative-expo-agent-system | 0 (listing only) | DuckDuckGo listing `[unverified]` | Repo exists; last commit 2025-10-05 (older). |
| 19 | mattpocock/skills | https://github.com/mattpocock/skills | 1 | X: @Mr_Buzzoni | General skills; 15k-star claim `[unverified]`. |
| 20 | anthropics/claude-code (plugins/frontend-design) | https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design | 2 | YouTube: Em9EzurouOU, Iup1WlUyj9M | Same skill as #3, separate path. |

Single-mention repos from YouTube descriptions (1 each, not verified beyond the description): ConardLi/garden-skills, elayadesign/ai-design-skills, MengTo/Skills, jakubkrehel/skills, codeswithroh/tastemaker, Owl-Listener/designer-skills (all AI LABS, Ysr7oNDajJI); anthropics/claude-code-security-review, anthropics/claude-code-action, OneRedOak/claude-code-workflows, wshobson/agents (Patrick Ellis, nItsfXwujjg; code review, not visual).

Listing-only, not counted (`[unverified]`): ArchieeR/claude-skills (visual-qa), DanielKerridge/claude-code-power-platform-skills (visual-qa), asulik1988/iphone-simulator-control, Geozstevenzz/claude-code-reactnative-expo-agent-system.

Excluded as sidebar noise: https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know and https://github.com/shanraisshan/claude-code-best-practice appeared in page-wide link lists of many Reddit threads, but not inside any post or comment body, so they are not counted. https://github.com/santoso-git/contentcoach-skill appeared in a post-body link on 1ws9oix but is a content-coaching skill, unrelated to design review.

---

## 6. Cross-source patterns

- Simulator driving: the community converges on accessibility-tree approaches (Argent, ios-simulator-skill, simless) over screenshots. Several commenters say Claude sometimes skips MCP wrappers and uses xcrun/XCTest/adb directly. Built-in Claude Desktop simulator pane is mentioned as "works great" (r/iOSProgramming, 1xbw42v).
- Design quality: the strongest signal across Reddit is that skills alone do not fix "AI slop". Top replies say references, a real design system and direction matter more than the skill. Impeccable and Anthropic's frontend-design are the most-named skills; both get criticism.
- Vibe-coded apps and App Store compliance drive interest in pre-submission audits (apple-compliance-audit-skill, Code with Beto video).

---

## 7. Gaps and limits

- No video or thread was found that is about a visual design-review agent specifically for a React Native / Expo app. The closest are the impeccable and frontend-design threads, which target web design.
- GitHub star counts were not captured. Install counts come from a third-party aggregator (skillselion via r/ClaudeDesign) and are `[unverified]`.
- Several "recommended" items are self-promotion (the author's own post or the maintainer's). Those are marked "self" or "team".
- Reddit search results and comments were read only for the threads listed. X results are a top-ranked snapshot, not exhaustive. Some X posts loaded without text.
- Blog coverage is thin: no dedicated 2026 blog post on visual QA for mobile agents was found beyond the Medium tutorial and the Anthropic and Expo docs.
