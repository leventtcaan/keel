---
title: Privacy Policy
permalink: /privacy/
---
# Privacy Policy

*Last updated: {{ site.last_updated }}*

This app is a coach that makes weekly calls about your training and eating from what you log. This policy says, in plain
words, what data the app keeps, why, where it goes, how long it stays, and what you can do about it. It is written from
the app's code: every table our server keeps is listed in a data inventory that is checked against the code on every change.

**The short version.** We keep only what the coaching needs. Your progress photos never leave your phone. We don't ask Apple
for your name or email. We never sell your data, never use it for ads, and don't track you across other apps or websites.
You can export your data or delete your account in Settings at any time.

## Who is responsible {#controller}

The controller of your data is {{ site.controller_name }}, the developer of this app. Contact: {{ site.contact_email }}.
No data protection officer has been appointed.

## What we keep on our server, and why {#what-we-keep}

### Your account {#data-account}

- **Your Apple user id for this app.** Sign in with Apple gives us a stable id that only this app sees. We ask Apple for no
  name and no email. We keep the id and when the account was made.
- **Your sessions.** When you sign in we issue tokens; the server keeps only a one-way fingerprint (SHA-256) of each
  refresh token, so a copy of our database can't be used to sign in. Sign-in tokens last 15 minutes and are renewed
  with the refresh token; a session ends after 60 days without use, when you sign out, or when you delete your account.

*Why:* to run your account (contract). *How long:* until you delete your account.

### Your consents {#data-consents}

Every consent you give or withdraw is a record: which consent, which version of its text, and when. *Why:* to prove what
you agreed to (GDPR Art. 7(1)). *How long:* until you delete your account.

### Your profile {#data-profile}

Your goal, sex, height, birth year, activity level, program choice, units, training days and usual time, check-in day,
time zone, an optional budget note, and foods you avoid. The weekly calls are computed from these.

*Why:* to coach you (contract). Foods you avoid can say something about your health, so they need your health data consent
and are cleared if you withdraw it. *How long:* until you delete your account.

### Your health data {#data-health}

Health data is a special category under the GDPR (Art. 9). The app keeps it only with your **explicit consent** (the
"health data" consent in onboarding and Settings):

- weigh-ins (typed by you, from Apple Health, or imported from another app), waist measurements;
- what you concluded from comparing your progress photos (better, same or worse) — never the photo itself;
- the reference look you picked as closest to yours (a level, never a percentage);
- a day's steps, sleep minutes and active energy, if you connect Apple Health;
- your meals and saved recipes, with the calorie and macro ranges estimated when you logged them;
- your plan (phase, daily calorie and step targets), and every weekly call with the data it was made from, so you can see
  why it was made and undo it. Each call also keeps an internal estimate the rules computed from your waist and the look you
  picked; it is never shown as a number in the app or the export — if you ask, we send it to you;
- what you told the app about your life (travelling, sick, pain, busy, new gym), with dates;
- your answers to the coach's questions (for example about hunger or missed sessions).

When energy intake looks too low, the app may ask whether your period has stopped. The answer is used for that week's
call only and is **never kept**.

*Why:* to make your weekly calls and show your progress — nothing else. *How long:* until you withdraw the consent or delete
your account, whichever comes first. Withdrawing deletes all of the above for good (a second pass a few minutes later
catches anything that was being saved at that moment); the weekly calls stop until you allow it again.

### Your training log {#data-training}

Your workouts and sets (move, set type, load, reps, reps in reserve, side, supersets, your notes), your program and its
history, lighter weeks and weeks off applied by a call, your gyms and their equipment, and moves you added yourself.

*Why:* to coach your training (contract). The training log doesn't count as health data and doesn't need the health data
consent, so withdrawing that consent leaves it in place. Importing past sessions from another app does need it, because
the import can carry body weight; imported sessions then stay in the training log like the rest. *How long:* until you delete your account.

### Your subscription {#data-subscription}

- **Subscription state:** status (trial, active, cancelled…), until when you have access, when it last changed, and which
  RevenueCat events were applied (id, type, time), so none is applied twice. No price, country or payment data.
- **Daily use:** how many coach messages and meal photo analyses you used each day — a count, no content. A day's count
  is kept through the following day, then deleted by a nightly cleanup (at most about three days).

*Why:* to give you what you paid for and keep the daily limits fair (contract). *How long:* the state until you delete your account; daily counts as above.

### Technical records {#data-technical}

- When you delete your account or withdraw the health data consent, a short-lived record (only a random account number,
  which consent, and when) drives a second deletion pass; it is removed after that pass, about 10 minutes later.
- Our server passes "account deleted" messages between its parts through an internal event log, so a deletion survives
  a restart. Each entry holds only the random account number, and is removed as soon as every part has handled it
  (usually within seconds; one that failed is retried, then removed).
- Our server's logs record each request's route, status and timing. They never record your account, what you sent, or any
  health data.

*Why:* to make deletions reliable and keep the service running (legitimate interest, GDPR Art. 6(1)(f)).

### Data that isn't about you {#data-reference}

The food database comes from USDA FoodData Central (public domain). It holds no data about you.

## On your phone {#on-your-phone}

### Apple Health {#data-apple-health}

If you connect Apple Health (a separate consent, on top of the health data consent), the app reads steps, sleep, body weight and active energy. It also asks for access to workouts logged in other apps, which
it doesn't read yet. It does not read heart data, cycle data, medications, health records or location from Apple Health. If you turn it
on in Settings, it writes your logged workouts and weigh-ins to Apple Health. Withdrawing the Apple Health consent stops
reading; what was already sent to our server stays under the health data consent above, and what was written to Apple
Health stays in Apple Health (you can delete it in the Health app).

### Photos and the camera {#data-photos}

- **Progress photos stay on your phone.** They are stored in the app's own folder, never uploaded, and only what you
  conclude from them (better, same or worse) is sent. If your phone is backed up to iCloud, that backup is between you and Apple and may include them.
  Signing out or deleting your account deletes them from the phone, so save the ones you want first.
- The camera is used for barcodes, meal photos and progress photos; the photo library to pick a meal or progress photo.
  The microphone is never used.
- A meal photo is sent only when you choose to analyze it, and only once the AI coach is active (see below).

### What else stays on the phone {#data-on-phone}

To work offline, the app keeps a copy of what you log until it is sent, and keeps your settings and reminders on the
phone: units, consents, reminders (including the sentence you wrote for them), your declared state, the result of the
eating-pattern check (your answers are never stored), progress projections and a trial reminder if you asked for one.
Your session is kept in the iPhone Keychain, on this device only. Notifications are local: the app has no push service.
Signing out or deleting your account clears all of this from the phone, with one exception: if the eating-pattern check
said projections aren't available, that result stays on the phone, so signing out doesn't reopen them.

## Who receives data {#recipients}

- **Apple** — for Sign in with Apple (Apple tells us your app-specific id) and for subscriptions bought through the App
  Store, under Apple's own privacy policy.
- **RevenueCat** (RevenueCat, Inc., United States) — handles subscriptions for us. It receives your account's random id (no
  name, no email, no health data) and, from its software in the app, your App Store purchase record, store country and
  currency, device and iOS version, and IP address. It is set up when the plans are shown (every new account sees them after onboarding) and when you restore or
  manage a subscription.
  Transfers from the EU rely on the EU Standard Contractual Clauses in RevenueCat's data processing terms.
- **Contabo** (Contabo GmbH, Germany) — our hosting provider: the server and database run on its hardware. Server
  location: {{ site.server_region }}.
- **The AI provider**, only with your separate consent — see the next section.

Nobody else receives your data. We don't use analytics, advertising or crash-reporting services.

## The AI coach {#ai}

Weekly calls are made by fixed rules, not by AI. An AI model is used only to sort the questions you write to the coach and
to read meals you describe or photograph. **This is not active yet:** no AI provider receives any data today, and the AI
consent can't be given.

When it is turned on, it will need a separate consent that names the provider and the data it receives: what you write to
the coach, with the kind of this week's call and the rules behind it (no numbers, no dates); meal notes you type; and meal
photos you choose to analyze (resized, with location and other metadata removed). Never your progress photos, weight, Apple
Health data, name or email.

We will use only a provider whose terms say it doesn't train its models on what it receives, and only once it has agreed
to zero data retention, under which it keeps nothing beyond the narrow exceptions its terms allow; this policy will state
those exceptions. Today's candidates set this out
differently: some keep requests for up to 30 days to check for abuse unless zero data retention is agreed, and they grant
it only on request. This policy will name the provider, its country and how your data is protected when it leaves the
EU before the AI coach is turned on. You can withdraw the AI consent at any time in Settings.

## How the weekly call is made {#automated-calls}

Once a week the app computes a call — keep going, adjust calories or steps, lighten training, and so on — from your logs by
fixed, published rules. Every call shows "Why this call": the data it used and the rules behind it. You decide whether to apply it, and you can undo most calls (a safety stop can't be undone). The app can also say it has no call yet when the data isn't enough.

## Your rights {#rights}

- **Access and portability:** Settings › Export my data gives you your data as one file.
- **Erasure:** Settings › Delete account deletes your account and all its data from our server, and clears the phone.
  Deleting the account doesn't cancel an App Store subscription: cancel it in Settings › Subscriptions on your iPhone.
- **Withdraw consent** at any time in Settings, without affecting what was done before.
- **Rectification, restriction, objection:** most data you can edit in the app; for anything else write to
  {{ site.contact_email }}.
- **Complaint:** you can complain to the data protection authority where you live.

## Age {#age}

The app is for adults: you must be 18 or older to use it.

## Security {#security}

Data travels encrypted (HTTPS). Tokens on the phone are kept in the Keychain; refresh tokens on the server only as
fingerprints. Health data never appears in logs or error reports.

## Changes {#changes}

If this policy changes, the new version is posted here with a new date. If a change needs a new consent, the app asks for it.
