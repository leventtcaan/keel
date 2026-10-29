# keel US launch: sourced conversion benchmarks (Health & Fitness, iOS)

Research date: 2026-10-29. Method: ego-browser task space `keel-market-launch` (id 22), one page (p1). Read-only, nothing downloaded, no sign-in, no form submitted.

Legend: **[primary]** = vendor or platform's own report/page; **[secondary]** = a third party summarising a primary source or a vendor blog; **[unverified]** = a figure I could not confirm in a source I read.

## 0. Sources not reached or not used

- Business of Apps H&F benchmarks: blocked by a Cloudflare bot check. Not solved, skipped.
- Adapty "State of Paywalls 2026" (https://adapty.io/state-of-paywalls/): the page is an email-gated form. Not submitted. Only the gate text was readable.
- Reddit's own self-promotion policy: primary pages not reachable through search. Section 4 uses a third-party read of subreddit rules.
- Superwall: product and docs pages only. No public benchmark report was found.
- Mobbin Cal AI / MacroFactor flows: not opened. Third-party onboarding screen counts conflict (see section 2), so none are used as numbers.
- Apple HIG onboarding page returned almost no text, so the onboarding quote below comes via RevenueCat.

## 1. Subscription benchmarks

### 1a. RevenueCat, State of Subscription Apps 2026 [primary]
URL: https://www.revenuecat.com/state-of-subscription-apps/ (2026; 115,000+ apps, $16B revenue). The PDF (335 pages) was not downloaded.

Health & Fitness (H&F) figures:
- D30 download-to-trial, H&F median: **6.9%** (top quartile above 23%). Business 9.1%, Gaming 4.4%, most non-gaming categories 5-6%.
- Trial-to-paid, H&F median: **37.7%** (top quartile 51.4%). Travel 43.5% is the highest, Photo & Video 22.2% the lowest.
- D35 download-to-paid, H&F median: **2.9%** (top quartile 6.2%). Gaming 1.0%, Business 2.6%.
- Trial starts on Day 0, H&F: **82.1%** (all categories 80-89%).
- H&F trial strategy: 59% mixed (trial and no-trial options), 18.3% no-trial. Mixed is the highest share of any category.
- H&F trial length: 54% of trials are 5-9 days. Gaming is the most ultra-short (73% at 4 days or less).
- H&F revenue per install (RPI, all installs): **$0.48 at D14, $0.66 at D60**. Global D60 median is $0.34.
- H&F yearly RLTV per payer, median: **$35.64**. H&F month-1 RLTV median: $24.23.
- H&F top performers exceed $60 monthly RLTV (per RevenueCat).
- Promo offers: H&F 14.0% of apps use them, all categories 9.3%.

Pricing and plan mix:
- Monthly median $4.99 to $9.99. H&F monthly median is **$9.99**, and H&F weekly is **$4.99** (lowest weekly of the categories listed).
- Plan volume, H&F: **68% annual**. Revenue share from annual is given as 59% in one place and 68% in another (see section 6).
- Overall annual plan share of subscription durations fell from **41.4% to 33.6%** year on year (RevenueCat, same report).

Trials and cancellations (all categories):
- Trial-to-paid by trial length: **≤4 days 25.5%, 5-9 days 37.4%, 17-32 days 42.5%** (medians). RevenueCat says trials of 17+ days convert 70% better than short trials.
- Nearly half of all apps now use trials of 4 days or less.
- 3-day trials: **55.4% of cancellations on Day 0**. 84% of 3-day cancellations fall between Day 0 and Day 1. 7-day trials: 39.8% on Day 0.

Paywall model:
- Download-to-paid by D35: hard paywall median **10.7%** (top quartile 20.0%), freemium median **2.1%**. RevenueCat: "after one year, retention for both models is nearly identical."
- H&F-relevant: hard paywall D4-7 conversion spike of 25.7%, which RevenueCat ties to 7-day trial expiries.
- Hard paywalls: D14 RPI $2.32 vs freemium $0.27. D60 $3.09 vs $0.38.

Other:
- AI-powered apps: 41% more revenue per payer, 30% faster churn.
- Google Play: about a third of cancellations are involuntary billing failures, against 14% on the App Store.
- New subscription apps: about 14,700 launched in January 2026 (about 2,000 in January 2022). iOS is about 77% of launches.
- Web revenue: 3.2% of revenue globally, 4.9% in North America.

### 1b. Adapty, In-app subscription benchmarks for H&F (2026-03-27) [primary, from the Adapty 2026 report]
URL: https://adapty.io/blog/health-fitness-app-subscription-benchmarks/ (report: $3B revenue, 16,000+ apps).
- H&F has the highest 12-month install LTV of any category: **$1.21 per install** (global).
- Install-to-trial: **North America 14.5%**, other regions 7.6-10.2%, global 11.2%. Note: this is install-to-trial, not RevenueCat's D30 download-to-trial (6.9%). The definitions and windows differ, so do not compare the two directly.
- Onboarding paywalls with trials: install-to-paid **1.78%** on average (all categories).
- Hard paywalls: **21% higher LTV** than soft paywalls. Soft paywalls convert about 50% better on raw conversion rate.
- Trials help H&F annual LTV (the opposite of Productivity, where direct buyers are worth more).
- Annual plan price gap across countries: up to **4.4x** (Germany vs Turkey).
- Renewal retention, all categories: 1st renewal 59.2%, 2nd 45.1%.
- Experiment win rates (share of tests with uplift): trial changes 59.6% for LTV, plan duration 58.7%, localisation 62.3%, visual/copy only 34.6%.
- Adapty's article says "weekly subscriptions now generate 56% of all subscription revenue". This conflicts with RevenueCat's statement that monthly plans dominate overall revenue share. Unresolved (see section 6).

### 1c. Third-party estimates (use with caution)
- Setgreet (vendor blog, https://www.setgreet.com/blog/onboarding-paywall-placement): about **52%** of H&F paywalls lead with a free trial. Source is a July 2026 snapshot of PaywallPro's gallery (910 iOS subscription apps). [secondary, vendor-authored]
- companieshistory.com quotes "61% of H&F subscription revenue from annual plans in 2025 (Adapty)". Not checked against Adapty. [unverified]

## 2. Onboarding and paywall placement

- **Length:** RevenueCat (https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short, year not shown [unverified]) describes H&F onboardings getting longer: Me+ about 45-50 screens (about 7-8 minutes), and a Lose It! claim that trial-start rates "went up double digits" as they lengthened. This is one company's claim, not a controlled study.
- **Noom:** up to 113 screens, 10-15 minutes, paywall only after significant investment (RevenueCat teardown, https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel, year not shown).
- **Practical patterns from the same RevenueCat piece:** explain why each question is asked on the same screen; progress bar; reinforce value with social proof; give real insight or a projection before the paywall (Fitbod shows projected progress over three months just before its paywall).
- **Ideal screen count:** no sourced optimum. The Lazyweb "about 20 screens is normal" figure is a third-party observation [unverified]. Do not quote a number; test it.
- **Paywall placement:** Setgreet (vendor) recommends end of onboarding, after a personalisation loop, as the default, and a feature-gate paywall for users who dismissed it. Its recommendation is consistent with RevenueCat's "Day 0" finding but is not a measured result. [secondary]
- **Day 0 vs Day 4-7:** Adapty says H&F users either convert on Day 0 or between Days 4-7, with little in between (Adapty 2026 article, primary for Adapty's data).
- **Internal conflict in RevenueCat:** one chart says about one-third of all conversions happen on Day 0, another says about 50% (50.6% overall). Check the PDF before quoting either.
- **Apple's guidance:** Apple's onboarding guideline reads "Design a brief, enjoyable experience that doesn't require people to memorize or provide a lot of information" (quoted by RevenueCat; Apple page not readable here).

## 3. App Store product page

Apple, primary:
- Screenshots: up to **10**. Previews: up to **3**, up to 30 seconds each, autoplay muted, so the first seconds must hold. (https://developer.apple.com/app-store/product-page/)
- Search results: the **first one to three screenshots** show in search results **when no app preview is available** (Apple's wording). If you ship a preview, check what search shows before assuming the screenshots do the work.
- Subtitle: **30 characters**. Promotional text: **170 characters**, updatable without a new build.
- Keywords: **100 characters**, comma-separated, no spaces. Do not repeat words, do not use plurals already covered, do not use the word "app" or category names.
- Subscriptions and in-app purchases: up to **20** items across both sections. IAP display name 35 characters, description 55 characters.
- Free trials: the purchase flow must clearly show the trial length and the price billed after it. (https://developer.apple.com/app-store/subscriptions/)
- Product page optimisation (PPO): test up to **3 treatments** against the original, with a chosen traffic share; results in App Analytics. (https://developer.apple.com/app-store/product-page-optimization/)
- Custom product pages (CPP): up to **70** extra pages, each with its own URL, keywords and deep link (iOS 18+). Apple states developers see **+2.5 percentage points** on average when referring people to a CPP, against a **1.6%** average conversion on default pages. (https://developer.apple.com/app-store/custom-product-pages/; year not shown on page [unverified])

Economics, primary (https://developer.apple.com/app-store/subscriptions/):
- Auto-renewable subscriptions: developer gets **70%** of the price in the first year of paid service, **85%** after one year.
- App Store Small Business Program: **85%** from the start. I did not check the eligibility threshold; check Apple's program page before budgeting.

Benchmarks:
- Apple Ads, US, 2025 [secondary: AppTweak, ~2,800 advertisers, https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks]:
  - H&F median **CPI $3.77** (search results). Categories: Sports $26.70, Finance $9.65, Games $4.63, Travel $3.70.
  - H&F median **CPT $1.68** (search results).
  - H&F median **TTR 7.5%**; tap-to-install **50.3%**.
  - Custom product page adoption among H&F apps: **21.2%**.
- Product page conversion: **no current category benchmark found.** AppTweak's 2025 US average is 8.56% (first-time downloads per page view), but public "2026" tables mostly recycle AppTweak's H1 2024 data. (https://appscreenshotstudio.com/app-store-conversion-benchmarks, vendor, read it for the caveat.) Use your App Store Connect Benchmarks tab once you have data.

First three screenshots (vendor guidance, not measured by Apple):
- Frame 1 hooks ("what is this app"), frame 2 educates, frame 3 proves. Source: https://www.appscreenshotstudio.com/blog/first-three-app-store-screenshots-2026-conversion-playbook (vendor).
- Its claim that Apple began indexing screenshot caption text in June 2025 is **[unverified]**: not confirmed on any Apple page I read.
- SplitMetrics textPlus case: a 59% organic install spike from a single screenshot change. Vendor-cited case; **[unverified]** for keel.

## 4. Growth channels

Paid, primary:
- AppsFlyer 2025 Performance Index (2025-12-03, 16.2B installs, 39,000+ apps): non-gaming iOS ranking is Apple Ads #1, Meta #2, **TikTok for Business #3**, Google Ads #4, Snapchat #5. Android: Google #1, Meta #2, TikTok #3. (https://www.appsflyer.com/company/newsroom/pr/performance-index-2025/)
- TikTok with Adjust (published 2025-10-22, North America 2024 data): TikTok-reported **cost per install for H&F -65%** against unnamed platforms, and assisted installs +19%. Vendor-reported, no dollar values, comparison set unnamed. Treat as a hypothesis to test. (Summary read at https://www.rocketshiphq.com/tiktok-performance-advertisers-report-2025-summary/, secondary.)

Creator / UGC:
- Cal AI (TechCrunch, 2026-10-15, https://techcrunch.com/2026/10/15/when-it-came-to-cal-ais-viral-success-a-small-army-of-influencers-paid-off/): founder says it paid many micro-influencers on negotiated payouts per reach; it reached over $30M revenue in about two years. One early influencer post brought about 1,000 users in two days. These are founder claims, not audited.
- Disclosure rules for paid creator posts (FTC and platform rules) were **not checked** in this research. Check before briefing creators.
- UGC agency case studies (Social Signals on Gymly, Sepia) are vendor marketing with no independent numbers. **[unverified]**.

Reddit (secondary; third-party read of subreddit rules on 2026-09-10, https://prowlo.com/blog/reddit-self-promotion-rules; the vendor discloses it is their product):
- No site-wide rule. Each subreddit sets its own. Examples: r/SideProject has no posted rules; r/SaaS allows one mention per 60 days, with alt accounts counted; r/Entrepreneur bans promotion; r/indiehackers allows one flaired post per product; r/GrowthHacking needs 100 karma before sharing.
- **No fitness subreddit was checked.** Read each target sub's `/about/rules` yourself before posting.

Market size, secondary (voxbooster.com, citing Sensor Tower 2026, calendar 2025): H&F in-app purchase revenue **$4.5B, +13%**; installs **3.96B, +0.8%**. Revenue grows faster than downloads.

## 5. Eight recommendations

1. **Lead with an annual plan and put a trial on it.** Numbers: 68% of H&F plan volume is annual (RevenueCat). Adapty says trials raise H&F annual LTV, and H&F trial-to-paid median is 37.7%. Test 7-day against 14-day, since RevenueCat's 17-32 day bucket converts best (42.5%) but its 7-day expiries create the Day 4-7 spike.
2. **Decide hard paywall vs freemium explicitly, and accept fewer installs for higher LTV if you choose hard.** Numbers: D35 download-to-paid 10.7% hard vs 2.1% freemium (RevenueCat). Adapty: hard paywalls give 21% higher LTV, but soft paywalls convert about 50% better on raw rate. Pricing and access model are Levent's decision (ADR-019), not an agent's.
3. **Place the first paywall at the end of onboarding, after a value or projection screen, and add a second path at Day 4-7.** Numbers: onboarding paywalls with trials give 1.78% install-to-paid (Adapty, all categories). H&F trial starts are 82.1% on Day 0, and the Day 4-7 peak is 25.7% for hard paywalls.
4. **Do not copy a screen count. Test onboarding length, with a reason shown on every question.** No sourced optimum exists. The only evidence is a Lose It! claim of double-digit trial-start gains from longer onboarding, plus Noom at up to 113 screens. Measure trial-start rate per onboarding variant.
5. **Spend the first A/B tests on structure, not visuals.** Numbers: experiment win rate for LTV is 62.3% for localisation, 59.6% for trial changes, 58.7% for plan duration, against 34.6% for visual or copy-only changes (Adapty).
6. **Set up the store page before launch: first three screenshots, a 30-character subtitle, 100 keyword characters, and a trial line the purchase screen states clearly.** Numbers and rules are Apple's own (section 3). Measure conversion against your App Store Connect benchmark, not public tables. Start PPO (3 treatments) once traffic exists; plan one or two CPPs for specific intents.
7. **Test paid acquisition only with cost per paying user as the metric, and assume a loss in year one at median numbers.** Arithmetic [derived, not a source figure]: H&F median US Apple Ads CPI $3.77 divided by D35 download-to-paid 2.9% gives about **$130 per payer**. At top-quartile conversion of 6.2%, about **$61**. Against H&F median yearly RLTV per payer of $35.64 (RevenueCat, global), paid-only is underwater at median. Use Apple Ads and TikTok as small tests with budget caps; lean on ASO and organic first. Mixing a US CPI with a global RLTV is directional only.
8. **Use creators and Reddit as tests, with disclosure and per-sub rules checked first.** Numbers: AppsFlyer 2025 ranks TikTok #3 among non-gaming iOS sources, and TikTok reports -65% H&F CPI (vendor, 2024 NA data). Cal AI's founder reports influencer-led growth to $30M+ (founder claim). Check paid-creator disclosure rules and each subreddit's rules before posting. Read fitness subreddit rules yourself, since none were checked here.

## 6. Conflicts and gaps to resolve before relying on numbers

- RevenueCat, H&F annual share of revenue: 59% (section "Plan durations") vs 68% (section "Revenue mix"). Check the PDF.
- RevenueCat, Day 0 conversion share: about one-third (freemium/hard split chart) vs about 50% (overall). Check the PDF.
- Adapty "weekly = 56% of all subscription revenue" vs RevenueCat "monthly dominates overall revenue share". Unresolved.
- Install-to-trial (Adapty, global 11.2%) vs D30 download-to-trial (RevenueCat, H&F 6.9%). Different definitions and windows. Do not mix them.
- Cal AI acquisition date: December 2025 (netinfluencer) vs March (TechCrunch, 2026-10-15). Not used.
- Screen counts for Cal AI (28 vs 34) and MacroFactor (10 vs 38 vs 47) conflict across sites. Not used.
- Public "2026" App Store conversion tables trace to AppTweak H1 2024. The appscreenshotstudio H&F "18.52% page-view to download" figure appears to come from a 2015 SplitMetrics table. Not used.
- Apple's CPP "+2.5 pp" figure has no year on the page. Treat as Apple-stated, year unknown.

## 7. Source list

- https://www.revenuecat.com/state-of-subscription-apps/ (2026, primary)
- https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short (year not shown)
- https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel (year not shown)
- https://adapty.io/blog/health-fitness-app-subscription-benchmarks/ (2026-03-27, primary)
- https://www.setgreet.com/blog/onboarding-paywall-placement (vendor blog, 2026)
- https://developer.apple.com/app-store/product-page/ (Apple, year not shown)
- https://developer.apple.com/app-store/product-page-optimization/ (Apple)
- https://developer.apple.com/app-store/custom-product-pages/ (Apple)
- https://developer.apple.com/app-store/subscriptions/ (Apple)
- https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks (AppTweak, 2025 data, page 2026, secondary)
- https://appscreenshotstudio.com/app-store-conversion-benchmarks (vendor, 2026)
- https://www.appscreenshotstudio.com/blog/first-three-app-store-screenshots-2026-conversion-playbook (vendor, 2026)
- https://www.appsflyer.com/company/newsroom/pr/performance-index-2025/ (2025-12-03, primary)
- https://www.rocketshiphq.com/tiktok-performance-advertisers-report-2025-summary/ (agency summary of TikTok/Adjust 2025 data, secondary)
- https://techcrunch.com/2026/10/15/when-it-came-to-cal-ais-viral-success-a-small-army-of-influencers-paid-off/ (2026-10-15, journalism)
- https://prowlo.com/blog/reddit-self-promotion-rules (2026-09-10 read, vendor)
- https://voxbooster.com/blog/fitness-app-statistics-2026/ (secondary, citing Sensor Tower 2026)
