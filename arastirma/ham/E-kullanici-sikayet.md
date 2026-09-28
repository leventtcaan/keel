# E — Kullanıcı Şikâyetleri ve Karşılanmamış İhtiyaçlar (ham veri)

**Tarih:** 2026-09-08
**Amaç:** "Fitness/beslenme uygulaması pazarı boş mu" hipotezinin **kanıt tarafı**.
**Durum:** Ham not. Sentez yok, filtreleme minimum.

---

## 0. Metodoloji ve kısıtlar — ÖNCE BUNU OKU

### Ne yapıldı
- ~32 farklı arama sorgusu (10 WebSearch + ~22 DuckDuckGo tarayıcı araması) + ~25 doğrudan sayfa çekimi.
- Kaynak tipleri: App Store yorum arşivi (JustUseApp), Trustpilot yıldız-filtreli yorumlar,
  MyFitnessPal resmî topluluk forumu, Ekşi Sözlük, akademik makaleler (PubMed/JSAMS),
  sektör benchmark raporları, Reddit alıntısı yapan üçüncü taraf derlemeler.

### KRİTİK KISIT: Reddit'e erişilemedi
Reddit bu ortamda **tamamen bloke**:
- `WebFetch` → "unable to fetch from www.reddit.com"
- Tarayıcı → "https://reddit.com is blocked by policy"
- `WebSearch` `allowed_domains:["reddit.com"]` → API hatası: "domains are not accessible to our user agent"
- Redlib/Teddit aynaları → 429 / 403 / Anubis engeli
- old.reddit.com, pushshift → engelli/boş

**Sonuç:** r/fitness, r/loseit, r/naturalbodybuilding vb. **doğrudan okunamadı.**
Reddit kanıtı iki dolaylı yoldan geldi:
1. Reddit'i **birebir alıntılayan** üçüncü taraf derlemeler (kaynak thread linki veriyorlar)
2. **DuckDuckGo arama snippet'leri** (thread metninden birebir kesit, ama kısa ve bağlamsız)

Reddit kaynaklı her bulgu aşağıda `[REDDIT-DOLAYLI]` ile işaretlendi. Bunlar **doğrulanabilirlik
açısından ikinci sınıf** — Levent isterse linkleri kendi tarayıcısında açıp teyit edebilir.

Ek olarak: **WebSearch kotası oturum ortasında doldu** (200/200), araştırmanın kalanı
DuckDuckGo + doğrudan fetch ile yürütüldü.

### Kanıt güven seviyeleri (aşağıda her bulguya iliştirildi)
- **A** = Birincil kaynak, birebir okundu (app store yorumu, forum postu, hakemli makale)
- **B** = İkincil kaynak, birincili alıntılıyor ve linkliyor
- **C** = İkincil kaynak, kaynağını linklemiyor / rakip uygulama blogu (pazarlama içeriği olabilir)

---

## 1. En sık şikâyetler (frekans sıralı)

Frekans sırası; App Store yorum arşivleri (JustUseApp: MFP 31, Fitbod 26, Hevy 43, Cal AI 71,
Noom 34, MacroFactor 33 yorum), Trustpilot 1–2 yıldız filtreleri ve forum threadlerinde
tekrar sayısına göre.

### #1 — Fatura / abonelik / iptal edememe (EN BASKIN)
Neredeyse her uygulamada 1 yıldızın çoğunluğu bu. Ürün kalitesiyle ilgisi yok, **güven yıkıcı.**

| Uygulama | 1 yıldız oranı | Kaynak |
|---|---|---|
| Zing Coach | **%32** | Trustpilot |
| Freeletics | **%17** | Trustpilot (3.083 yorum) |
| Noom | %5 | Trustpilot (66.945 yorum, genel 4.5/5) |
| MyFitnessPal | %5 | Trustpilot (genel 4.3/5) |

Alıntılar (A):
- Noom / Mayra: *"The 7 day trial cost $245"* — 7 günlük deneme 245 dolara patlamış.
  https://www.trustpilot.com/review/noom.com?stars=1&stars=2
- Noom / Joshua Eklund: *"I believe they intentionally separated the charges to be misleading"*
  — ücretleri bilerek böldüklerini düşünüyor. Aynı kaynak.
- Zing Coach / Louise Weine: *"no notification at the end of the 7 day trial"*
  https://www.trustpilot.com/review/zing.coach?stars=1&stars=2
- Freeletics / Vicky: *"Absolutely terrible company"* — £94.99 habersiz çekilmiş.
  https://www.trustpilot.com/review/freeletics.com?stars=1&stars=2
- Cal AI / Server Bad: *"why is there no customer service/ support?"*
  https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews

### #2 — Doğruluk/veritabanı sorunu ("bu sayılar yanlış")
En sert örnek Cal AI (fotoğraftan kalori). AI kategorisinin **güven problemi burada patlıyor.**

Alıntılar (A) — hepsi https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews:
- Drewc004: *"a stick of gum is 75 calories, 4 strawberries are 900 calories"*
  — bir sakız 75 kalori, 4 çilek 900 kalori diyor.
- Lana4127193: *"90% of the time the calories are inaccurate and way off"*
- Bella697435: *"Also results varied each time."* — aynı yemek her seferinde farklı sonuç.
- Rolling Studio: *"the pictures I take are not even close to being accurate"*
- Donnymayy: *"it's super inaccurate I just end up editing the calories"*
  — düzeltmek zorunda kalınca uygulamanın tek satış argümanı ölüyor.

Veritabanı boşluğu (A):
- MacroFactor / Marquis103: *"the database just doesn't have enough of the items I eat"*
  https://justuseapp.com/en/app/1553503471/macrofactor-diet-sidekick/reviews
- MFP / Mc.gitflow: barkod okuttuğunda yanlış değer geldiğini anlatıyor.
  https://justuseapp.com/en/app/341232718/myfitnesspal-calorie-counter/reviews

Sektör ölçüsü (C): AI görüntü tabanlı besin tahmininde hata aralığı basit yemeklerde %10–15,
karışık yemeklerde %25–30+. https://www.intakenutrition.io/blog/is-cal-ai-accurate-what-public-reviews-and-ai-research-actually-suggest
(Kaynağını linklemiyor — C seviyesi.)

### #3 — Veri girişi sürtünmesi / logging yorgunluğu
Bkz. Bölüm 3, ayrı başlık.

### #4 — Ücretsizken paralı olan özellikler / paywall genişlemesi
- MFP / AliciaHollywood: *"now you have to pay for a premium membership"* — eskiden bedavaydı. (A)
- Hevy / Cabrownies: *"I need to pay 80 dollars for the full version"* (A)
- Cal AI / N______B: *"CalAI is not free. You cannot use CalAI without a subscription."* (A)
- MFP barkod okuyucuyu premium'a aldı, tepki üzerine geri aldı. (B)
  https://blog.mysimpleplan.com/post/behind-the-paywall-myfitnesspal-premium-vs-free-2025-deep-dive

### #5 — Bug / crash / senkron kopması
- Fitbod / Big Review Guy: *"App keeps crashing & doesn't sync with Watch app"* (A)
- MFP / Auserv: *"Bugs seem to be getting worse rather than better"* (A)
- MFP / RynoN96: Apple Health ile çift yönlü yazma kiloyu bozuyor. (A)

### #6 — UI/UX karmaşası, gereksiz adım
- MFP / Jonnydesigner: *"Lots of functionality, but not a very good app"* (A)
- MFP / Clineomine: *"Difficult to navigate"* — kendini teknoloji-okur sayan biri. (A)
- MacroFactor / Special_blend05: *"It's clean looking, but difficult to navigate"* (A)
- Hevy / JM Soul: *"there is no 'Next' button to automatically move cursor"*
  — set arası her kutuya elle dokunmak zorunda kalıyor. (A)

### #7 — Jenerik/uymayan program
Bkz. Bölüm 4.

### #8 — Reklamlar
- MFP / AliHart1983: *"There are so many ads now"* + yemek yerken *"really gross images"* (A)

### #9 — Uygulamanın kullanıcıyla konuşma tonu / patronluk taslaması
- MFP / Warsenis (başlık): *"Good app, if you don't mind being treated like a child"* (A)
  — premium üye; hedef kilo önerisini reddetse de her gün tekrar soruyor.

### #10 — Yeme bozukluğu tetikleme / çok düşük kalori hedefi
- MFP Trustpilot 2 yıldız: *"Counting calories but suggests calories way too low to function"* (A)
  https://www.trustpilot.com/review/www.myfitnesspal.com
- Ekşi / atilmispamukmanzarasi (2013): MFP topluluk kısmının *"anoreksik-blumik kaynadigini farkettim"* (A)

---

## 2. Neden bırakıyorlar (churn) — kullanıcının kendi ağzından

### 2a. Sayısal zemin
| Bulgu | Değer | Kaynak | Güven |
|---|---|---|---|
| Spor salonu üyeliği: 3. aydan önce bırakma | **%63** | Sperandei ve ark. 2016, *J Sci Med Sport* — https://pubmed.ncbi.nlm.nih.gov/26874647/ | **A** |
| 12 aydan fazla kesintisiz devam eden | **<%4** | Aynı çalışma | **A** |
| Health & fitness uygulaması 30. gün retention | **~%3** (2023) | Business of Apps benchmark | B |
| AppsFlyer 30. gün retention | %3.5 | wellnesszenith.uk derlemesi | C |
| App tabanlı sağlık müdahalelerinde havuzlanmış dropout | %43; kullanıcıların %80'i minimum etkileşim | voxbooster derlemesi, JMIR 2020/2022'ye atıf | C (birincil doğrulanamadı) |
| Sağlık app'i 90 gün içinde bırakma | %71 | Hostinger, JMIR'a atıf — https://www.hostinger.com/tutorials/why-fitness-apps-dont-work | C (birincil link yok) |
| Yemek takip app'i 14 gün içinde bırakma | %60 | nutrola.app | **C — rakip uygulama blogu, KULLANMA ya da "iddia" diye kullan** |
| Salon üyeliğini **iptal etmeden** gitmeyi bırakanlar | **>%50** | Zenoti 2026 Gym Member Survey, n=1.393 — https://www.zenoti.com/thecheckin/gym-member-survey-2026-fitness-consumer-trends | **A** |
| Bırakanların "beni geri getirebilecek bir şey var" diyenler | **%80** | Aynı anket | **A** |

**"Sessiz churn" bulgusu (Zenoti) en değerli veri:** insanlar kararla bırakmıyor,
**sadece gelmiyor.** İptal bile etmiyorlar. Yani churn'ün sebebi "karar" değil, "sürüklenme".

### 2b. Sebep kategorileri — alıntılı
1. **Sonuç görmüyor**
   - Noom / J. Kaaren: *"am I losing weight? Not much"* — 5. hafta. (A)
   - Noom Trustpilot / Lorraine: *"Absolutely no weight loss!"* (A)
   - Noom / Michaelspringfield: *"Great app to begin with but then it wasn't."* (A)
2. **Sıkıcı / tekrar eden**
   - `[REDDIT-DOLAYLI]` r/powerbuilding "Program Hopping, How to Stop":
     *"the program has exercises or set routines that may be 'boring' to you"*
     https://www.reddit.com/r/powerbuilding/comments/vi7t50/program_hopping_how_to_stop/
3. **Çok pahalı** — Bölüm 10.
4. **Veri girişi yorucu** — Bölüm 3.
5. **Uygulama mükemmellik bekliyor, hayat araya giriyor**
   - "Broken streak effect": kaçırılan antrenman kırmızı ile cezalandırılıyor, plan uyum sağlamıyor.
     https://www.hostinger.com/tutorials/why-fitness-apps-dont-work (C)
   - Rakip iddiası ama gap'i iyi tarif ediyor: *"They let you 'exclude' an exercise, but the rest
     of the plan stays identical"* — https://rizin.app/blog/how-to-train-with-an-injury (C)
6. **Ocak etkisi / "Quitters Day"** — Strava verisiyle Ocak'ın 2. Cuma'sı en yüksek bırakma günü.
   2019 çalışması 800M aktivite, ~%80 bırakma. (C — Strava birincil raporuna ulaşılamadı.)

---

## 3. Veri girişi sürtünmesi (logging fatigue) — ne kadar büyük?

**Cevap: en büyük tek sürtünme kalemi, ve 12 yıldır çözülmemiş.**

Birincil kanıt — MyFitnessPal'in **kendi forumundaki** "Logging food is so tedious and awful..."
başlığı (83 yanıt). https://community.myfitnesspal.com/en/discussion/1181781/logging-food-is-so-tedious-and-awful (A)

- editorgrrl: *"Logging's a huge pain but I do it (like flossing)"*
  — "diş ipi gibi, iğrenç ama yapıyorum". Bu cümle problemin özeti.
- katieefranc0: *"I use the app, and it just drags me down."*
- katieefranc0: *"every time I try to not log I get so guilty"*
  — bırakınca suçluluk. Bağımlılık/ceza döngüsü.
- Granville_Cocteau: *"I stopped logging after 6 mos."*
- Başlığı açan abbyjcpc (75 kg vermiş, hâlâ 130 lb hedefi var):
  *"I spent 20 minutes online trying to figure out how many calories"* — **ev yapımı bir yemek için.**

**Ev yapımı / karışık yemek = sürtünmenin merkezi.** Bu Türkiye için katlanarak büyüyor (Bölüm 11).

Antrenman tarafında sürtünme:
- Hevy / Happy Bow: *"the key in fitness is about reducing frictions to actually do the workouts"* (A)
- `[REDDIT-DOLAYLI]` r/GYM "People with notebooks at the gym":
  *"takes more time to open my phone, find my app, and record the set"*
  https://www.reddit.com/r/GYM/comments/yty7q2/people_with_notebooks_at_the_gym/

Nicel iddia (C, rakip blogu — sadece hipotez olarak kullan):
"Öğün başına 5 dakikadan fazla harcayan kullanıcı, 2 dakikanın altındakine göre 30 gün içinde
**2.4 kat** daha çok bırakıyor" — Harvey ve ark. 2019'a atıf, birincil doğrulanamadı.
https://nutrola.app/en/blog/calorie-tracker-retention-rates-how-long-users-stick-with-each-app

---

## 4. "Bu program bana özel değil" şikâyeti

Yaygın ama **1. sıradaki şikâyet değil** — fatura ve doğruluk sorunlarının arkasında.
Ama ayrıldıkları anın *gerekçesi* olarak sık geçiyor.

Alıntılar:
- Zing Coach (AI koç iddialı) / Stuart Bell:
  *"the app has consistently delivered the wrong workouts—every single day"*
  — antrenman split'ini girmesine rağmen. (A)
  https://www.trustpilot.com/review/zing.coach?stars=1&stars=2
- Zing Coach / Mr GW: *"insists on building in cardio after heavy weights"* (A)
- `[REDDIT-DOLAYLI]` Fitbod / u/Bartzff5:
  *"illogical exercise suggestions, like insisting on hitting quads and hamstrings daily"*
  ve devamında *"why keep paying for it?"*
  Kaynak thread: https://www.reddit.com/r/fitbod/comments/muy2g9/alternatives_to_fitbod/
  Derleme: https://dr-muscle.com/fitbod-review-reddit/ (B)
- `[REDDIT-DOLAYLI]` Fitbod→Strong / u/mcBanshee: *"inability to progressively overload custom workouts"*
  https://www.reddit.com/r/strongapp/comments/p1gw0c/came_back_to_strong_after_trying_fitbod/ (B)
- Noom "kişisel koç" iddiasına karşı / Angelofentropy:
  *"they say you can customize your own recipe but that is not true"* +
  *"The calories is automatically generated and is always wrong."* (A)
- Fitbod / Jay_Cass (egzersiz bilimi yüksek lisansı olan biri): *"I WANT to love this app..."*
  — sıradan kullanıcı için iyi, ama kendi seviyesi için yetersiz buluyor. (A)

**Talep tarafı (A):** Zenoti 2026 anketi (n=1.393): salon üyelerinin **%50'den fazlası**
kişiselleştirilmiş deneyim istiyor; **30–44 yaş grubunda bu oran ~%75.**

---

## 5. Güven problemi — kime, neden güvenilmiyor

### 5a. AI kalori/koç uygulamaları — güven en düşük burada
Cal AI JustUseApp "Safety Score / Legitimacy Score: **0/100**"
(JustUseApp'in kendi NLP skoru, metodolojisi şeffaf değil — C, ama sinyal.)
https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews

Güvensizliğin mekanizması, kullanıcının kendi ağzından (A):
- Kennykinsler: *"Doesn't work, just re runs the prompt instead of training the AI."*
  — "refine" tuşuna basıyor, model öğrenmiyor, prompt'u yeniden çalıştırıyor. **AI'ın kabuğu görülmüş.**
- Lana4127193: *"90% of the time the calories are inaccurate and way off"*
- Blueclounds: *"People need to try it first before paying."* — denemeden ödeme = şarlatanlık algısı.

### 5b. "AI slop" algısı — DOĞRUDAN KANIT BULUNAMADI
"AI slop" terimi fitness app bağlamında **arama sonuçlarında çıkmadı.** Terim Reddit modlarının
içerik kirliliği tartışmasına ait (WIRED, Ars Technica). Fitness app'lerine "slop" diyen bir
topluluk söylemi **bu araştırmada doğrulanamadı.**

**AMA** fonksiyonel eşdeğeri var ve güçlü: kullanıcılar AI'ı "işe yaramaz + pahalı + jenerik"
üçlüsüyle tarif ediyor. Örnek (A):
- Cal AI / RJSJAG: *"Why is an ai app charging you a monthly subscription?"*
- Cal AI / JoeSchmo01 (başlık): *"Very basic and not worth paying for"*
- MacroFactor / Aannggell15 (başlık): *"Same feature as free apps"*

Bu, Levent'in "AI slop yok" kırmızı çizgisiyle **birebir örtüşen bir pazar sinyali**:
kullanıcı AI etiketine değil, **fark yaratmayan ürüne** kızıyor.

### 5c. Noom — bilimsellik algısı çatlamış
- Trustpilot / Mayra: *"Noom is basically an expensive diet diary"* (A)
- Kullanıcı algısı: koç mesajları şablon/otomatik. Bunu iddia eden derlemeler var ama
  **birebir Reddit alıntısı linkli olarak bulunamadı** — https://nutrola.app/en/blog/why-is-noom-so-bad-now (C)
- Bağlam (A): Noom wellness koçlarının dörtte birine kadar işten çıkarma haberi.
  https://www.aol.com/news/noom-reported-layoffs-101346556.html

---

## 6. Uygulama yerine ne kullanıyorlar

### Google Sheets / Excel — EN YAYGIN ALTERNATİF
`[REDDIT-DOLAYLI]` r/bodyweightfitness — **"Google Sheets is the best workout app"**,
**774 upvote, 111 yorum.** Açılış: *"nothing beats google sheets"*
https://www.reddit.com/r/bodyweightfitness/comments/cfkpch/google_sheets_is_the_best_workout_app/

Diğer threadler (DDG'de bulundu, içerik okunamadı):
- r/bodyweightfitness "Tracking workouts in a spreadsheet?"
  https://www.reddit.com/r/bodyweightfitness/comments/pmonl7/tracking_workouts_in_a_spreadsheet/
- r/personaltraining "Google Sheets vs app" — koçlar müşteriye Sheets veriyor.
  https://www.reddit.com/r/personaltraining/comments/10j13gy/google_sheets_vs_app/
- r/personaltraining "Coaching App vs Spreadsheet"
  https://www.reddit.com/r/personaltraining/comments/1d9jihl/coaching_app_vs_spreadsheet/

**Neden:** özelleştirilebilir, ücretsiz, veri sahipliği, dikkat dağıtmıyor.

### Kağıt defter
`[REDDIT-DOLAYLI]` r/GYM "People with notebooks at the gym" —
*"takes more time to open my phone, find my app, and record the set"*
https://www.reddit.com/r/GYM/comments/yty7q2/people_with_notebooks_at_the_gym/
r/xxfitness "Notepad or App? What do you use?"
https://www.reddit.com/r/xxfitness/comments/18xwq5q/notepad_or_app_what_do_you_use/

### Notes / Notlar uygulaması
- Hevy / Cabrownies (A): app'lerden önce *"the notes app"* kullanmış,
  *"a jumble of numbers and abbreviations that only me and me alone could read"* diye anlatıyor.
  → Yani kağıt/notes'un bilinen çöküş noktası: **okunamaz hale gelmesi.**

### Notion
Şablon ekosistemi büyük (Notion Marketplace'te ücretsiz workout tracker kategorisi var,
r/Notion'da paylaşılan şablonlar mevcut) ama **"app yerine Notion kullanıyorum çünkü..."
şeklinde doğrudan kullanıcı ifadesi bulunamadı.** Erişim kısıtı nedeniyle eksik kalan başlık.

### ChatGPT
`[REDDIT-DOLAYLI]` r/ChatGPT "I turned chat GPT into my new fitness app with a couple prompts"
— snippet'te motivasyon açıkça **"ücret ödemekten kaçınmak"**:
*"I've been trying to find a way to justify payi[ng]..."*
https://www.reddit.com/r/ChatGPT/comments/13kjjao/i_turned_chat_gpt_into_my_new_fitness_app_with_a/
r/ChatGPT "I used Chat GPT to help me build a workout routine"
https://www.reddit.com/r/ChatGPT/comments/14eeh8c/i_used_chat_gpt_to_help_me_build_a_workout_routine/

Sektörel yorum (C ama isabetli): *"ChatGPT is a strong plan writer and a nonexistent coach."*
https://getfitcraft.com/blog/chatgpt-workout-plan-prompts

---

## 7. "Keşke şu olsa" — açıkça talep edilen ama olmayan özellikler ⭐ EN ÖNEMLİ BÖLÜM

Frekans sırası; App Store yorumlarında "I wish / it would be great if / needs" ifadelerinin
tekrar sayısına göre. Hepsi (A) — birebir kullanıcı yorumu.

**1. Hayat olayına / duruma göre uyarlanan plan (sakatlık, doğum, hastalık, tatil)**
- MFP / Smileforliz (başlık): *"Why don't any fitness apps have a 'just had a baby' note?"*
  Devamı: hamilelik kilosu grafikte "negatif" görünüyor, uygulama onu tembel gibi gösteriyor.
  → Tek bir bağlam bilgisi eksik olduğu için tüm ürün kişiye düşman hale geliyor.
- Sakatlık: r/workout "App for injuries rehab?" — diz ameliyatı sonrası dönen kullanıcı,
  konuyla ilgili post bulamadığını yazıyor. `[REDDIT-DOLAYLI]`
  https://www.reddit.com/r/workout/comments/122v335/app_for_injuries_rehab/
- Sektörel tarif: app'ler egzersizi "hariç tut"tan öteye gitmiyor, planın kalanı aynı kalıyor. (C)

**2. Girişte hız: daha az dokunuş, klavye akışı, tekrar eden öğünler**
- Hevy / JM Soul: *"there is no 'Next' button to automatically move cursor"*
- Hevy / JM Soul: *"no option to save & update routine if you changed an exercise"*
- MFP forumunda en çok tavsiye edilen taktik "pre-logging" (önceden girme) —
  yani kullanıcılar sürtünmeyi **kendi icat ettikleri workaround'la** çözüyor.

**3. Yerel / ev yapımı yemek için gerçekten çalışan tarif hesabı**
- MacroFactor / Marquis103: *"the database just doesn't have enough of the items I eat"*
- Noom / Angelofentropy: *"they say you can customize your own recipe but that is not true"*
- MFP forumu / abbyjcpc: ev yapımı hindi chili için **20 dakika** harcamış.
- Ekşi / amuda kalkan solucan: *"biber dolmasi 260 kalori diyor ama benim tarif o kadar edemez"*

**4. Mikro besin / özel diyet kısıtı uyarısı**
- Cal AI / Miss M1991: *"I would like to see is micro nutrients being tracked"*
- MFP / Casey Alin: kullanıcı bazlı **alerjen/makro kısıtı uyarısı** istiyor
  (yemekte kısıtı aşan bir bileşen varsa uyarsın).

**5. Ölçü birimi esnekliği (gram vs. porsiyon vs. kesir)**
- Cal AI / FixItSamsung123: *"I wish I could edit ingredients based on weight versus fractions"*
- MFP / georg-o: porsiyon seçeneklerinin sınırlı ve tutarsız olduğunu yazıyor.

**6. Kardiyo/koşu bandı için doğru girdi modeli**
- Hevy / Nikko.ridge: *"I wish i could input my time and speed and/or distance"*
  — koşu bandında hız+süre biliyor, mesafe bilmiyor; app mesafe istiyor.

**7. Otomasyon / kısayol / API entegrasyonu**
- Hevy / Happy Bow: Apple Shortcuts, NFC tag, Things3/Streaks entegrasyonu isterse
  **ücretliye geçeceğini** açıkça yazıyor: *"What would take me across the line is having Apple shortcuts"*
  → Ödeme niyeti beyan edilmiş, karşılanmamış özellik. En net "para masada" sinyali.

**8. Yakılan kalorinin otomatik geri eklenmemesi (kontrol)**
- Cal AI / Whitebrad25: *"This SHOULD NOT be done, or at the very least an option to r[emove]"*
- MFP / Carlita Shamika: adım sayar kalori düzeltmesini **6 ayda 4 kez** kapatmak zorunda kalmış.

**9. Uygulamanın kararına saygı duyması (patronluk taslamaması)**
- MFP / Warsenis: hedef kilo önerisini reddetmesine rağmen her gün tekrar soruyor.

**10. Cihaz/ekosistem uyumu (Watch senkronu, Polar, Fitbit çift sayım)**
- Fitbod / Nbct.wright, Big Review Guy: Watch senkronu ve superset loglama kopuyor.
- MFP / AliHart1983: Fitbit ile çift sayım.
- MFP / Casey Alin: Polar desteği istiyor.

**Not:** Bu liste **App Store yorumu ağırlıklı** — yani zaten ödeyen/kullanan kesimin isteği.
Hiç başlayamayanların istekleri Reddit'te olurdu ve oraya erişilemedi. **Boşluk bu.**

---

## 8. İki uç kullanıcı profili — hipotez testi

### Profil (a): "Umursamayan / temeli bilmeyen" → **DOĞRULANDI, güçlü**
Fitbod yorumlarında bu profil **tekrar tekrar** kendini anlatıyor (A):
https://justuseapp.com/en/app/1041517543/fitbod-workout-gym-planner/reviews
- Misskeys91: *"im in the gym not knowing what to do"* +
  *"just pretty much in there hopping from one machine to the next"*
- Azilee22: *"going to a gym and not knowing what to do"* (sosyal kaygı da var)
- Mchlldn: *"I had always struggled with feeling confident at the gym"*
- Davey.Jones95: *"Like most beginners I had absolutely no plan or structure"*
- Dom Nolan: *"anyone like me, who doesn't have time to make up and track a detailed fitness program"*
- What You Were: *"just did the same exercises every day and not seeing results"*

**Frekans:** Fitbod'un 26 yorumluk örnekleminde **en az 6'sı** (≈%23) bu profili birinci ağızdan
tarif ediyor. Fitbod'un ürün-pazar uyumu **doğrudan bu profile** oturuyor.

### Profil (b): "Aşırı mükemmeliyetçi → felç" → **DOĞRULANDI, ama kanıt daha zayıf/dolaylı**
Topluluk bu davranışa kendi adını vermiş: **"program hopping"** ve **"program paralysis"**.

- `[REDDIT-DOLAYLI]` r/powerbuilding "Program Hopping, How to Stop"
  https://www.reddit.com/r/powerbuilding/comments/vi7t50/program_hopping_how_to_stop/
- `[REDDIT-DOLAYLI]` r/bodyweightfitness "Feeling frustrated & overwhelmed building my routine"
  — snippet: kullanıcı kitapta *"analysis paralysis"* bölümünü bulup rahatladığını yazıyor.
  https://www.reddit.com/r/bodyweightfitness/comments/srtei2/feeling_frustrated_overwhelmed_building_my/
- `[REDDIT-DOLAYLI]` r/naturalbodybuilding "Why is 'program hopping' considered bad?"
  https://www.redditmedia.com/r/naturalbodybuilding/comments/1ibum7d/why_is_program_hopping_considered_bad/
- `[REDDIT-DOLAYLI]` r/GetMotivated "How do you overcome Analysis Paralysis?"
  https://www.reddit.com/r/GetMotivated/comments/1b1m7bt/how_do_you_overcome_analysis_paralysis_discussion/

Mekanizma tarifi (C ama net):
*"You're waiting until you understand enough to start correctly."*
*"Information Feels Like Progress"* — araştırma yapmak, egzersiz yapmışçasına tatmin veriyor.
https://app.foundationalrehab.com/blog/exercise-for-overthinkers

Sektör tarifi: *"Program paralysis"* = mükemmel programı ararken hiç başlayamamak ya da
aşırı karmaşıklaştırıp bırakmak. https://ateamfit.substack.com/p/the-psychology-of-overthinking-and (C)

**Değerlendirme:** İki profil de forumlarda gerçek. **(a) daha ölçülebilir ve daha kalabalık;**
(b) daha küçük ama **çok daha yüksek niyetli** (zaten araştırıyor, zaten okuyor, ödemeye hazır) —
ve mevcut hiçbir ürün ona "durumsallık" vermiyor, sadece bir program daha veriyor.
**(b) profili Levent'in kendi profili** — kanal içeriği için doğal hedef.

**Eksik:** (b) profilinin frekansını sayısallaştıramadım. Reddit erişimi olmadan
"kaç thread / kaç upvote" ölçülemez. Bu, erişim açıldığında ilk kapatılacak boşluk.

---

## 9. Devamlılık / adherence — davranış bilimi tarafı

| Bulgu | Değer | Kaynak | Güven |
|---|---|---|---|
| Salon: 3. aydan önce bırakma | **%63** | Sperandei 2016, JSAMS — https://pubmed.ncbi.nlm.nih.gov/26874647/ | **A** |
| 12 ay+ kesintisiz devam | **<%4** | Aynı | **A** |
| Alışkanlığın otomatikleşmesi (medyan) | **66 gün** (aralık 18–254) | Lally ve ark. 2010, *Eur J Soc Psychol* | B |
| Tek gün kaçırmak ilerlemeyi sıfırlamıyor | — | Aynı çalışma | B |
| **Denetimli (koçlu) programda uyum** | **%72–81** | Gómez-Redondo ve ark. 2024 | B |
| **Aynı kişiler denetimsizken** | **%43–67** | Aynı | B |
| Denetimli HIIT dropout | ~%13 (denetimsiz salon %63'e karşı) | Aynı | B |
| Gamification etkisi (16 RCT, n=2.407) | Hedges' g = **0.42** | Mazeas ve ark. 2022 meta-analiz | B |
| Kendi hedefini seçenlerde artış | +1.384 adım/gün | ENGAGE trial | B |

B seviyesindekiler **getfitcraft.com/science/workout-adherence-statistics** üzerinden derlendi;
site birincil kaynakları isim+yıl+dergi ile veriyor ama DOI linki vermiyor.
**Sperandei doğrudan PubMed'den teyit edildi.** Diğerleri Levent yayına koymadan önce teyit etmeli.

### Buradan çıkan en keskin cümle
**İnsan denetimi uyumu ~%43'ten ~%72–81'e çıkarıyor.** Bu, "uygulama vs. koç" farkının
en somut sayısal ifadesi. Uygulama pazarının boşluğu tam burada: uygulamalar denetim
*taklidi* yapıyor (bildirim, streak), denetim *sağlamıyor* (Zenoti: bırakanların
**~%50'sine salon üyelikleri boyunca hiç proaktif ulaşılmamış**).

### "3 haftada bırakma" — neden
Doğrulanmış tek mekanizma zinciri:
1. Sonuç, çabanın gerisinde geliyor (haftalar) → günlük motivasyon harcaması karşılıksız.
2. Denetimsizlikte hesap verme yok.
3. Bir gün kaçırınca "hep ya da hiç" düşüncesi devreye giriyor.
4. Uygulama bunu **ceza** olarak gösteriyor (streak kırılması, kırmızı halka).
5. Kişi iptal bile etmeden sessizce kayboluyor (Zenoti: %50+).

---

## 10. Fiyat hassasiyeti

### Gözlenen fiyatlar
| Uygulama | Fiyat | Kaynak |
|---|---|---|
| MyFitnessPal Premium | $19.99/ay, $79.99–99.99/yıl | financialcontent/marketersmedia 2025-09-18 duyurusu |
| Hevy Pro | ~$80/yıl | Kullanıcı yorumu (A) |
| Cal AI | $9.99/ay veya ~$45–50/yıl | Kullanıcı yorumları (A) |
| Freeletics | ~£94.99 yıllık yenileme | Trustpilot (A) |
| Zing Coach | £43.99 dönemsel | Trustpilot (A) |
| Noom | Aylık + ek ücretler; deneme sonrası $245 vakası | Trustpilot (A) |

### İsyan eşiği — kullanıcının kendi rakamı
- Hevy / Cabrownies: **$80/yıl'a kızıyor**, açıkça alternatif fiyat veriyor:
  *"if they even brought the price down to $35"* → **kabul eşiği ~$35/yıl.** (A)
- Hevy / Cabrownies: *"a bunch of useless apps that made me pay 25$ a month"*
  → **$25/ay = "useless" sınırı.** (A)
- Cal AI / Brooklynn Wyatt: *"have to pay $9.00 a month just to take pictures of your food"*
  → **$9/ay bile**, algılanan değer düşükse fazla. (A)
- Cal AI / RJSJAG: *"Why is an ai app charging you a monthly subscription?"*
  → AI'a **abonelik** modeli meşru görülmüyor; tek seferlik bekleniyor. (A)
- MacroFactor / Scottvvvvvvvtttt: *"doesn't offer anything that isn't also offered on the free tier of myfitnesspal"*
  → Referans fiyat **MFP'nin ücretsiz katmanı.** Bu, tüm kategorinin fiyat tavanını eziyor. (A)

### Sonuç
- **Ödeme direnci fiyatın kendisinden çok "ücretsiz muadili var" algısından** geliyor.
- **Denemeden ödetmek** (Cal AI) doğrudan 1 yıldız üretiyor: *"People need to try it first before paying."*
- Yıllık plan retention'ı aylığa göre %40–60 daha iyi (retentioncheck.com, C) —
  ama iptal edememe şikâyetlerinin de kaynağı yıllık planlar.

---

## 11. Türkiye / global fark

**Kısa cevap: Aynı şikâyetler var, artı Türkiye'ye özgü bir tanesi daha var.**

### Ortak olan
Ekşi Sözlük `myfitnesspal` başlığı (8 sayfa) — https://eksisozluk.com/?q=myfitnesspal (A)
- groove salad (2014): *"ilk başlarda bayağı bir zahmetli geldiydi günlük tutma işi"*
  → logging fatigue, İngilizce forumlarla birebir aynı.
- groove salad: her lokmanın, yemeğe konan yağın gramının bile sayılması gerektiğini anlatıp
  *"sapık işi ama gerekli"* diyor. → aynı "diş ipi" mantığı.
- atilmispamukmanzarasi (2013): MFP topluluk kısmında *"anoreksik-blumik kaynadigini farkettim"*
  → yeme bozukluğu tetikleme kaygısı, global şikâyetle aynı.

Ekşi Sözlük `kalori saymak` — https://eksisozluk.com/kalori-saymak--130630 (A)
- locke (2001): her kaşıkta kalori hesaplayan *"manyak dusunceleri engelleyememek"*
- hulean (2007): *"bir sure sonra oyle aliskanlik yaratir ki, insan yemedigi... kalorisini goz ucuyla hesaplar"*
- strangers in the night (2011): düşük karbonhidrat diyetinde *"kafan başlıyor sayılar geçmeye"*

### Türkiye'ye ÖZGÜ olan — en değerli bulgu
**Türk yemeği veritabanı ve tarif hesabı çalışmıyor.**
- amuda kalkan solucan (Ekşi, MFP başlığı): *"biber dolmasi 260 kalori diyor ama benim tarif o
  kadar edemez. kendi tarifimi nasil hesaplayacagim onu bilemedim."* (A)

Bu, İngilizce tarafta "homemade food" olarak zaten en büyük sürtünme kalemi (Bölüm 3);
Türkiye'de **varsayılan durum** çünkü yemeklerin çoğu ev yapımı, paketli/barkodlu değil.
→ Barkod okuyucu merkezli tüm ürün mimarisi Türkiye'de **işlevsiz.**

### Bulunamayanlar (dürüst boşluk)
- Şikayetvar'da fitness/kalori uygulaması şikâyeti **bulunamadı** (arama sonuç vermedi;
  Zing Coach için bir sayfa index'lenmiş ama açılmıyor).
- Türkçe YouTube yorumları **taranamadı** (araç kısıtı).
- Donanım Arşivi forum threadi ("kalori sayma uygulaması") sadece FatSecret tavsiyesi içeriyor,
  şikâyet yok. https://forum.donanimarsivi.com/konu/kalori-sayma-uygulamasi.1021935
- Ekşi'deki içeriğin çoğu **2001–2014 arası** — güncel Türkçe şikâyet verisi zayıf.

---

## 12. Bu dosyanın bilinen boşlukları

1. **Reddit birinci ağızdan okunamadı.** En büyük eksik. Özellikle:
   - r/loseit, r/xxfitness'te churn itirafları
   - "keşke şu olsa" thread'leri
   - profil (b)'nin frekansı
2. **Google Play 1–3 yıldız yorumları çekilemedi** (sayfa JS ile render oluyor, içerik gelmedi).
   App Store tarafı JustUseApp üzerinden alındı.
3. **YouTube yorumları taranmadı.**
4. **nutrola.app / getfitcraft.com gibi C-seviyesi kaynaklar** rakip uygulama blogları —
   sayıları "iddia" olarak kullan, yayında birincil kaynağa in.
5. **Türkçe güncel veri zayıf** (Ekşi'nin çoğu 10+ yıllık).
6. **Fiyat esnekliği için gerçek anket verisi yok** — sadece kullanıcı yorumlarından çıkarılan eşikler.

---

## Kaynak listesi (tam)

**Birincil — App Store yorum arşivleri**
- https://justuseapp.com/en/app/341232718/myfitnesspal-calorie-counter/reviews
- https://justuseapp.com/en/app/1041517543/fitbod-workout-gym-planner/reviews
- https://justuseapp.com/en/app/1458862350/hevy-workout-tracker-gym-log/reviews
- https://justuseapp.com/en/app/6480417616/cal-ai-calorie-tracking/reviews
- https://justuseapp.com/en/app/634598719/noom-weight-loss-health/reviews
- https://justuseapp.com/en/app/1553503471/macrofactor-diet-sidekick/reviews
- https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718?see-all=reviews
- https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616?see-all=reviews

**Birincil — Trustpilot**
- https://www.trustpilot.com/review/www.myfitnesspal.com
- https://www.trustpilot.com/review/noom.com?stars=1&stars=2
- https://www.trustpilot.com/review/freeletics.com?stars=1&stars=2
- https://www.trustpilot.com/review/zing.coach?stars=1&stars=2

**Birincil — forum**
- https://community.myfitnesspal.com/en/discussion/1181781/logging-food-is-so-tedious-and-awful
- https://eksisozluk.com/kalori-saymak--130630
- https://eksisozluk.com/?q=myfitnesspal
- https://forum.donanimarsivi.com/konu/kalori-sayma-uygulamasi.1021935

**Birincil — akademik / anket**
- https://pubmed.ncbi.nlm.nih.gov/26874647/ (Sperandei 2016)
- https://www.jsams.org/article/S1440-2440(16)00006-2/abstract
- https://www.zenoti.com/thecheckin/gym-member-survey-2026-fitness-consumer-trends (n=1.393)

**İkincil — Reddit alıntılayan derlemeler**
- https://dr-muscle.com/fitbod-review-reddit/
- https://macaron.im/playbook/macrofactor-reddit-reviews

**Reddit thread linkleri (okunamadı, referans için)**
- https://www.reddit.com/r/bodyweightfitness/comments/cfkpch/google_sheets_is_the_best_workout_app/ (774 upvote)
- https://www.reddit.com/r/GYM/comments/yty7q2/people_with_notebooks_at_the_gym/
- https://www.reddit.com/r/xxfitness/comments/18xwq5q/notepad_or_app_what_do_you_use/
- https://www.reddit.com/r/powerbuilding/comments/vi7t50/program_hopping_how_to_stop/
- https://www.reddit.com/r/bodyweightfitness/comments/srtei2/feeling_frustrated_overwhelmed_building_my/
- https://www.reddit.com/r/fitbod/comments/muy2g9/alternatives_to_fitbod/
- https://www.reddit.com/r/strongapp/comments/p1gw0c/came_back_to_strong_after_trying_fitbod/
- https://www.reddit.com/r/workout/comments/122v335/app_for_injuries_rehab/
- https://www.reddit.com/r/ChatGPT/comments/13kjjao/i_turned_chat_gpt_into_my_new_fitness_app_with_a/
- https://www.reddit.com/r/personaltraining/comments/10j13gy/google_sheets_vs_app/

**Sektör / benchmark (C seviyesi — teyit gerek)**
- https://www.businessofapps.com/data/health-fitness-app-benchmarks/
- https://getfitcraft.com/science/workout-adherence-statistics
- https://www.hostinger.com/tutorials/why-fitness-apps-dont-work
- https://nutrola.app/en/blog/calorie-tracker-retention-rates-how-long-users-stick-with-each-app
- https://www.intakenutrition.io/blog/is-cal-ai-accurate-what-public-reviews-and-ai-research-actually-suggest
- https://app.foundationalrehab.com/blog/exercise-for-overthinkers
- https://blog.mysimpleplan.com/post/behind-the-paywall-myfitnesspal-premium-vs-free-2025-deep-dive
