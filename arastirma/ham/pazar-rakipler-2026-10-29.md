# Competitor table: US App Store, lifting + nutrition coaching

Fetched 2026-10-29. All facts come from the sources listed under each app. `[unverified]` means I could not confirm it from a source I read.

## Method and limits

- App Store pages read in ego task space `keel-market-competitors` (spaceId 20, page p1). Product IDs came from the iTunes Search API (country=us), used only to find the IDs.
- Ratings and counts are as shown on the App Store page. The page rounds counts (for example "24K").
- Reviews: the App Store "See All" reviews view, with MORE clicked up to 4 times. Each app gives about 5 to 10 reviews. This is not a random sample, and the page text has no star values, so the complaints are my reading of review text. Counts are mentions within that sample, not market totals. The public customer-review RSS feed returned no entries and was not used.
- Prices: most App Store pages show only "Free · In-App Purchases" with no IAP prices. Prices therefore come from the developer pricing pages. Localized pages are flagged.
- Screenshot captions are baked into the images. I read the first three screenshots of each app by eye, so check spelling before quoting them.
- Onboarding length is stated only by Alpha Progression ("build your plan in a minute", AS). Every other app states none.
- No login, no purchase, no CAPTCHA encountered.

Source tags: **AS** = App Store product page. **R** = App Store See All reviews page. **S** = screenshots on the AS page. **W** = developer website (URL given per app).

## Table

| App (developer) | Promise (App Store subtitle) | Price per month / per year | Trial | Rating (ratings) | Training + nutrition in one app? | Decides or shows | Leads with (captions 1 / 2 / 3) |
|---|---|---|---|---|---|---|---|
| MacroFactor (Stronger By Science) [AS] | Calorie Counter & Food Log | $11.99 / $71.99 ($47.99 per 6 mo) [AS][W] | 7 days [AS] | 4.8 (24K) [AS] | Nutrition only; training is a separate app | **Decides** (nutrition): weekly macro and calorie changes [AS] | Smart macro tracker / Log foods faster / Master your metabolism [S] |
| MacroFactor Workouts (same developer) [AS] | Workout Planner for Gym & Home | Same block as MacroFactor on AS: $11.99 / $71.99 [AS]; bundle price [unverified] | 7 days [AS] | 4.8 (4.8K) [AS] | Training only | **Decides** per session: automatic progression, per R [R] | Smart workout tracker / Realize your strength / Track every rep [S] |
| Carbon, "Carbon - Macro Coach & Tracker" (Reform LLC) [AS] | Calories, Nutrition, & Diet | $11.99 / $99.99 (6 mo $59.99) [W] | [unverified] | 4.8 (8.1K) [AS] | Nutrition only | **Decides** (nutrition): weekly check-in and diet adjustments [AS][S] | The smart diet coaching app / Set a goal and rate of progress / Check in weekly and receive diet adjustments [S] |
| RP Diet Coach & Planner (RP Strength) [AS] | Calories, Macros, Fat Loss | $19.99 / $99.99 [W] | [unverified] | 4.4 (12K) [AS] | Both, in one daily schedule (training block visible in S3) [S] | **Decides** (nutrition): weekly reviews and recommended adjustments [AS] | Serious results for serious trainees / Your diet, built for your goals / Stop logging. Start planning. [S] |
| RP Hypertrophy (RP Strength) [AS] | Health & Fitness (no subtitle) | $34.99 / $299.99 [W] | [unverified] | 4.4 (291) [AS] | Training only | **Decides** per workout: sets and reps adjusted from feedback, per AS text and R [AS][R] | Train like the pros / Built for all levels of experience / 100+ premade templates [S] |
| Hevy (Hevy Studios) [AS] | Weight Lifting Routine Planner | [unverified] | [unverified] | 4.9 (101K) [AS] | Training only | **Shows** (logging); "Hevy Trainer" builds a program [AS] | Log workouts. Get stronger. Stay motivated. / (app screen, no caption) / Analyze your workouts [S] |
| Strong (Strong Fitness) [AS] | Strength Training Planner | [unverified] | [unverified] | 4.9 (109K) [AS] | Training only | **Shows** | Join over 3 million Strong users / Hundreds of built-in exercises / Warm-up and plate calculators [S] |
| Fitbod (Fitbod Inc.) [AS] | AI Personal Trainer & Workouts | [unverified] | Free trial exists, length [unverified] [AS] | 4.8 (289K) [AS] | Training only | **Decides** per session: each workout built for the user [AS] | Smart workouts built for you / Took the guesswork out of making progress / Customize your equipment [S] |
| Cal AI (Viral Development) [AS] | Food & Macro Counter | [unverified] | [unverified] | 4.8 (373K) [AS] | Nutrition only | **Shows** (photo calorie logging); daily target; no weekly decision seen [AS][R] | Cal AI (logo) / Just snap a pic / See the calories [S] |
| Alpha Progression Gym Tracker (Alpha Progression GmbH) [AS] | Workout Planner & Lifting Log | $12.99 monthly [AS]; yearly [unverified] | 14 days [AS][W] | 4.9 (2.3K) [AS] | Training only | **Decides** per set: weight and reps; deloads and periodization in Pro [AS] | (app screen, no caption) / Build muscle, build strength / Progression on autopilot [S] |
| JuggernautAI (Juggernaut Apps) [AS] | Strength Training Workouts | $34.99 / $349.99 [W] | 2 weeks [W] | 4.8 (5.7K) [AS] | Training only | **Decides** per session: readiness score, adjusts each session [S] | Train smarter / Built around you / Adjust every session [S] |
| Boostcamp: Workout Tracker (BPM Health Co.) [AS] | Gym & Strength Training Plans | [unverified] (Pro subscription, no price found) [W] | [unverified] | 4.9 (11K) [AS] | Training only | **Shows** plus automatic progression; AI coach builds the plan [AS][S] | Science-based programs by renowned coaches / Ditch the spreadsheet / Weight progressions automatically calculated [S] |
| Arvo: AI Workout Coach (Aetha) [AS] | AI coach. Optimized routines. | Home page comparison table: $10/mo [W]; /pricing page: "€4 /month" (conflicts) | "Try it free", length [unverified] [AS] | 2.7 (10) [AS] | Both: imports MyFitnessPal, Yazio, Cronometer; "Fuel week" verdict on calories and macros [AS] | **Decides** per set: next weight, reps, rest [AS] | AI workout coach / What weight should I use? AI tells you. Instantly. / Progress, automatically. [S] |
| LADDER Strength Training Plans (Ladder Technologies) [AS] | Fitness Workouts at Home & Gym | $29.99 / $179.99 ($14.99 per mo, annual) [W] | 7 days, no card [AS][W] | 5.0 (214K) [AS] | Training with human coaches; a Nutrition tab shows in S3, scope [unverified] | Coach-built plan each day; no automated decision seen [AS] | Get stronger, with a plan / (awards only) / A plan for every workout [S] |
| Arrow: Workout & Macro Tracker (LevelUp App Studios) [AS] | Gym, Weight Lifting & Calories | [unverified] (no price on W) | [unverified] | 4.8 (9.2K) [AS] | Both in one app: lifts, meals and weight [AS] | **Decides** calorie and macro targets from weigh-ins ("adaptive TDEE"); weekly cadence not stated [AS] | The #1 workout & nutrition app / Track your meals and workouts / See your diet's impact on training [S] |
| Oomph: AI Nutrition & Workouts (Oomph Fitness) [AS] | Easy Calorie & Fitness Tracker | [unverified] | [unverified] | 4.7 (924) [AS] | Both: AI food scanner plus workout plans [AS] | Matches a plan; no weekly decision seen [AS] | [unverified]: screenshots not captured |
| Fitness AI Gym Workout Planner (FitnessAI Inc.) [AS] | Personal Trainer: Muscle Coach | [unverified] | [unverified] (free trial mentioned in R) | 4.7 (56K) [AS] | Training in the listing; a "Nutrition plan" card in S1 [unverified] | **Decides** per set: weight raised, with the reason shown [S] | Build muscle. Burn fat. No guessing. / Open the app. Follow the plan. / Your weights increased. Here's why. [S] |

## Notes per app

**MacroFactor** (developer Stronger By Science Technologies LLC)
- Sources: AS https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 · R https://apps.apple.com/us/app/1553503471?see-all=reviews&platform=iphone · W https://macrofactorapp.com/macrofactor/ · pricing https://macrofactorapp.com/pricing
- Price: AS lists $11.99/month, $47.99/half year, $71.99/year. W pricing page confirms $71.99 yearly and $47.99 six-monthly.
- Promise line (AS description): "Reach your diet goals with the smartest macro tracker and nutrition coach."
- Decision: AS says the nutrition coach "makes weekly changes to your macro plan" and has weekly check-ins.
- Complaints (9 reviews, no recurring pattern): some foods lack cup/tbsp units; micronutrient tracking "needs work"; home screen shows carbs before fiber. Each is a single mention.

**MacroFactor Workouts** (same developer)
- Sources: AS https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 · R https://apps.apple.com/us/app/6737156524?see-all=reviews&platform=iphone · W https://macrofactorapp.com/workouts/
- Price: the AS page shows the same subscription block as MacroFactor. W says existing MacroFactor customers can get "the bundle", price [unverified].
- Complaints (10): needs more than five focus points; wants watch integration; a reviewer finds the app prescribes more than they can do. Each is a single mention.

**Carbon - Macro Coach & Tracker** (Reform LLC)
- Sources: AS https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611 · W https://joincarbon.com/ · pricing https://www.joincarbon.com/pricing
- Price (W): $11.99 USD/mo billed monthly; $59.99 USD billed semi-annually ($9.99/mo); $99.99 USD billed yearly ($8.33/mo).
- The App Store name changed from "Carbon Diet Coach"; the description still uses that name.
- Decision: the description says "Carbon will adjust the plan as you progress". S3 says "Check in weekly and receive diet adjustments".
- Complaints (10): none recurring in the sample; reviews are almost all positive.

**RP Diet Coach & Planner** (RP Strength, LLC)
- Sources: AS https://apps.apple.com/us/app/rp-diet-coach-planner/id1330041267 · R https://apps.apple.com/us/app/1330041267?see-all=reviews&platform=iphone · pricing https://rpstrength.com/pages/diet-coach-app (the App Store page has no developer-website row)
- Price (W): Annual membership $99.99 billed yearly ($8.33/mo); monthly membership $19.99 billed monthly.
- Trial length [unverified].
- Combined: S3 shows a day view with "Weight training 1 hr" alongside meals and the calorie/macro totals.
- Complaints (10): two reviews on the 2026 interface change, which one calls "too much like a calorie counter"; two on scheduling friction (no workout-shake option, per-day edits); one on photo/label macro accuracy; one "too complicated, no help".

**RP Hypertrophy** (RP Strength, LLC)
- Sources: AS https://apps.apple.com/us/app/rp-hypertrophy/id1555614554 · R https://apps.apple.com/us/app/1555614554?see-all=reviews&platform=iphone · pricing https://rpstrength.com/pages/hypertrophy-app
- Price (W): annual membership $299.99 billed yearly ($24.99/mo); monthly membership $34.99 billed monthly.
- Complaints (7): two asking for a rest timer that starts after a logged set; one wants more customization; one says "it's not cheap".

**Hevy** (Hevy Studios S.L.)
- Sources: AS https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 · R https://apps.apple.com/us/app/1458862350?see-all=reviews&platform=iphone · W https://www.hevyapp.com/ (pricing URL 404; /product/ has no prices)
- Price and trial [unverified]. AS: "Free, with no ads"; a review says the user pays for premium.
- Complaints (10): rest-timer and routine-reorder glitches; wants a tutorial for warm-up reps; wants to see all custom exercises. Each is a single mention.

**Strong** (Strong Fitness PTE Limited)
- Sources: AS https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 · R https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577?see-all=reviews&platform=iphone · W https://strong.app/ (/pro 404)
- Price and trial [unverified]. A review mentions a "lifetime pro version".
- Discrepancy: AS description says "over 1.2 million people"; S1 says "over 3 million".
- Complaints (10): Apple Watch sync (two); freezing during the rest timer (one); free tier limited to four routines (one).

**Fitbod** (Fitbod Inc.)
- Sources: AS https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543 · R https://apps.apple.com/us/app/1041517543?see-all=reviews&platform=iphone · W http://fitbod.me/ (/pricing 404)
- Price [unverified]. AS mentions an auto-renewing subscription after a free trial; trial length not stated.
- Complaints (11): profile height/weight edits open the website (one); wants a vacation mode (one).

**Cal AI** (Viral Development LLC)
- Sources: AS https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 · R https://apps.apple.com/us/app/6480417616?see-all=reviews&platform=iphone · W https://www.calai.app/ (/pricing 404)
- Price and trial [unverified].
- AS steps: "Answer lifestyle questions to build your plan", then "Get your nutritional breakdown".
- Complaints (10): food database gaps (three mentions: brands, fast food, editing); photo estimates "not exact" (one); daily calorie target changes unexpectedly (one).

**Alpha Progression Gym Tracker** (Alpha Progression GmbH)
- Sources: AS https://apps.apple.com/us/app/alpha-progression-gym-tracker/id1462277793 · R https://apps.apple.com/us/app/1462277793?see-all=reviews&platform=iphone · W https://alphaprogression.com/en/subscribe
- Price: AS shows $12.99 beside the monthly plan. The yearly plan says "save 50%" with no amount in the text [unverified]. W shows TRY 399.99/month and TRY 2,299.99/year, which are localized and not US prices.
- Onboarding: "Build your plan in a minute" (AS).
- Complaints (10): wants a watch app and integrations (Strava, MFP, Chronometer); free tier lacks custom periodization; one trial cancelled as "more advanced" than needed; one says progression "leaves much to be desired". Each is a single mention.

**JuggernautAI** (Juggernaut Apps, LLC)
- Sources: AS https://apps.apple.com/us/app/juggernautai/id1515756471 · R https://apps.apple.com/us/app/juggernautai/id1515756471?see-all=reviews&platform=iphone · pricing https://www.juggernautai.app/pricing
- Price (W): monthly $34.99; yearly $349.99; "2 week free trial".
- Complaints (10): "app needs updates"; a reviewer says the prescribed weight never gets close to failure. Each is a single mention.

**Boostcamp: Workout Tracker** (BPM Health Co.)
- Sources: AS https://apps.apple.com/us/app/boostcamp-workout-tracker/id1529354455 · R https://apps.apple.com/us/app/boostcamp-workout-tracker/id1529354455?see-all=reviews&platform=iphone · W https://www.boostcamp.app/
- Price: Pro subscription price not found [unverified]. Free core with 11,000+ programs (AS).
- Complaints (11): the rest timer got worse in a recent update (two); "a bit expensive" for the value (one); no RPE math in the paid tier (one).

**Arvo: AI Workout Coach** (Aetha, Inc)
- Sources: AS https://apps.apple.com/us/app/arvo-ai-workout-coach/id6758769325 · R https://apps.apple.com/us/app/6758769325?see-all=reviews&platform=iphone · W https://arvo.guru/ · pricing https://arvo.guru/pricing
- Price conflict: the home page comparison table shows "$10/mo"; /pricing shows "€4 /month" and "Free forever". Treat the US price as unverified.
- Complaints (5, small sample): kg/cm defaults for generated plans, which two reviews call a bug for US users; English translation incomplete (one); day rolls over at 7 pm (one).

**LADDER Strength Training Plans** (Ladder Technologies, Inc.)
- Sources: AS https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 · R https://apps.apple.com/us/app/1502936453?see-all=reviews&platform=iphone · W https://joinladder.com/pricing
- Price (W): PRO monthly $29.99; PRO annual $179.99 for the year ($14.99/mo). Trial: "Try Ladder COMPLETELY FREE for 7 days. NO PAYMENT collected during trial" (AS and W).
- Complaints (9): none recurring. One reviewer expected "an autonomous app that tells you what to do".

**Arrow: Workout & Macro Tracker** (LevelUp App Studios LLC)
- Sources: AS https://apps.apple.com/us/app/arrow-workout-macro-tracker/id6451746641 · R https://apps.apple.com/us/app/6451746641?see-all=reviews&platform=iphone · W https://arrowfitnessapp.com/ (home and /pricing show no prices)
- Price and trial [unverified]. Reviews mention a "Gold" subscription.
- AS: "Log your lifts, meals, and weight in one app"; "Adaptive TDEE ... keeps your calorie and macro targets adjusted as your body responds"; "see whether training and diet are actually adding up".
- Complaints (10): four on the subscription or removed features (a paid Gold tier stripped, a feature removed, the free trial pushed on new users); one on stats inaccuracy after a rollout; one on missing offline logging.
- This is the closest direct match to a combined training and nutrition app in this set. It was not in the brief, so I added it.

**Oomph: AI Nutrition & Workouts** (Oomph Fitness Inc.)
- Sources: AS https://apps.apple.com/us/app/oomph-ai-nutrition-workouts/id1476284055 · W http://www.oomphfitness.com/ (/pricing 404)
- Mostly kickboxing and HIIT by review text. Price and trial [unverified]. Screenshots not captured.
- Complaints (10): app crashes (one), lowers music volume during workouts (one), update issues (one).

**Fitness AI Gym Workout Planner** (FitnessAI Inc.)
- Sources: AS https://apps.apple.com/us/app/fitness-ai-gym-workout-planner/id1446224156 · R https://apps.apple.com/us/app/1446224156?see-all=reviews&platform=iphone · W https://www.fitnessai.com/ (/pricing not found)
- Price [unverified].
- Complaints (10): paywall before the trial and "no unsubscribe button" (two); demo animations go black (one); assisted pull-up weight logic (one).

**Discovered, not checked in depth:** Mealo: Pocket AI Fitness Coach (Pillyze, 4.8 with 2.2K ratings, nutrition-led, https://apps.apple.com/us/app/mealo-pocket-ai-fitness-coach/id6740252941). Simple: AI Weight Loss Coach (4.7 with 410K, nutrition, https://apps.apple.com/us/app/simple-ai-weight-loss-coach/id1467720176). Gravl, Zing AI, Caliber, Planfit and Motra showed up as training-focused AI apps in search. Ratings for these come from the iTunes API only.

## Takeaways

- **Gap:** Weekly decisions exist on the nutrition side (MacroFactor, Carbon, RP Diet Coach). Per-set or per-session decisions exist on the training side (Alpha Progression, Juggernaut, Fitbod, Fitness AI, Arvo). In the 17 apps checked, only Arrow describes one app that adapts calories and macros from weigh-ins alongside training. None shows a single weekly call that covers both.
- **Price points:** Monthly $11.99 to $34.99. Annual from $71.99 (MacroFactor) to $349.99 (JuggernautAI). Carbon and RP Diet Coach are $99.99 a year. Ladder is $179.99 a year. Hevy, Strong and Boostcamp run a free core. Most trial lengths are unverified.
- **Screenshots lead with:** logging speed or brand (MacroFactor "Log foods faster", Cal AI "Just snap a pic", Hevy "Log workouts"), coach credibility (Boostcamp "Not Fitfluencers", RP "serious trainees", Juggernaut "Built around you"). Only four lead with the decision itself: Carbon "Check in weekly and receive diet adjustments", RP "Stop logging. Start planning.", Fitness AI "Your weights increased. Here's why.", Arrow "See your diet's impact on training".
- **Complaints in the sample:** paywalls and update regressions. Arrow has four of ten on subscriptions and removed features. Boostcamp has two of eleven on a rest-timer regression after an update. Fitness AI has two of ten on paywall and cancellation. RP Diet Coach has four of ten combined on the interface change and scheduling friction. Arvo has two of five on kg/cm defaults for US users, which matters for a US launch. The samples are small.
- **Caveat:** Trial length and price are unverified for Hevy, Strong, Fitbod, Cal AI, Boostcamp, Arrow, Oomph and Fitness AI. Check these in-app or on Apple's price display before comparing prices publicly.
