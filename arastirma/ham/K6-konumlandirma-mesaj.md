# K6 — Konumlandırma ve Mesaj Stratejisi
> Araştırma tarihi: 2026-09-11 · Durum: TASLAK (doldurulıyor)
> Tez: "Veriyi toplayan çok, karar veren yok. Bu, karar veren."

## A · RAKİP MESAJ SÖKÜMÜ (ham veri — birebir alıntı)

Kaynaklar: Apple App Store US listeleri (Eylül 2026), iTunes Search API (`itunes.apple.com/search`),
ürün web siteleri. App Store alt başlığı 30 karakterle sınırlı; bazı listelerde alt başlık
çekilemedi → "bulunamadı" yazıldı, uydurulmadı.

### A.1 · App Store: isim · alt başlık · açılış cümlesi

| Ürün | App Store adı (birebir) | Alt başlık | Açıklamanın ilk cümlesi (birebir) |
| --- | --- | --- | --- |
| MacroFactor | "MacroFactor - Macro Tracker" | "Calorie Counter & Food Log" | "MacroFactor combines innovative coaching algorithms with proven nutrition and behavioral science to help you reach your diet goals and achieve empowering, sustainable results." |
| MacroFactor Workouts | "MacroFactor Workouts - Tracker" | bulunamadı | "MacroFactor Workouts combines innovative coaching algorithms with science-based workout routines customized to your goals, fitness level, and gym equipment." |
| Hevy | "Hevy - Workout Tracker Gym Log" | "Weight Lifting Routine Planner" | "** Featured by Apple ** Join +10 million users!" / "the most intuitive workout tracker & planner in the world" |
| Fitbod | "Fitbod: Gym & Fitness Planner" | "AI Personal Trainer & Workouts" | "Build muscle, gain strength and lose weight with a customized workout plan just for you." |
| Cal AI | "Cal AI - Calorie Tracker" | bulunamadı (kategori: Food & Macro Counter) | "HOW TO USE CAL AI:" → "Answer lifestyle questions to build your plan" · "Snap a photo of your meal" |
| MyFitnessPal | "MyFitnessPal: Calorie Counter" | bulunamadı | "Achieve your nutrition, calorie, macro & fitness goals with MyFitnessPal – the AI-powered food & fitness tracker with everything you need." |
| Cronometer | "Cronometer: Calorie Counter" | bulunamadı | "Cronometer is a powerful calorie counter, nutrition tracker, and food diary designed for accuracy." |
| Carbon Diet Coach | "Carbon - Macro Coach & Tracker" | bulunamadı | "Carbon Diet Coach is your nutrition solution for results that LAST. … Carbon Diet Coach removes the guesswork." |
| RP Hypertrophy | "RP Hypertrophy" | bulunamadı | "Build more muscle and get JACKED with the RP Hypertrophy app, designed by Dr. Mike Israetel. … get real results powered by science." |
| RP Diet | "RP Diet Coach & Planner" | bulunamadı | "Plan your meals, track calories and macros, and reach your goals with the RP Diet Coach App, designed by Dr. Mike Israetel!" |
| JuggernautAI | "JuggernautAI" | bulunamadı | "Juggernaut Training Systems' revolutionary A.I. strength training system has arrived on iOS. … get stronger than you can imagine with The Smartest Program for You." |
| Ladder | "LADDER Strength Training Plans" | bulunamadı | "Try Ladder COMPLETELY FREE for 7 days. NO PAYMENT collected during trial." |
| Zing Coach | "Zing AI: Home & Gym Workouts" | bulunamadı | "Zing is the ultimate AI Coach, revolutionizing fitness with AI-powered, personalized workouts designed by top health and fitness experts." |
| Freeletics | "Freeletics: Workouts & Fitness" | bulunamadı | "Europe's #1 fitness app lets you work out anytime, anywhere with the most advanced digital personal trainer – no gym required." |
| WHOOP | "WHOOP" | bulunamadı | "WHOOP is the leading wearable that turns comprehensive health insights into daily action." |
| Oura | "Oura" | bulunamadı | "Meet Oura Ring - the revolutionary smart ring that translates your body's most meaningful messages to transform how you feel every day." |
| Runna | "Runna: Running Plans & Coach" | bulunamadı | "Reach your pinnacle as a runner with Runna … With tailored training plans built by world-class coaches to help you achieve your goals." |
| Caliber | "Caliber: Strength Training" | bulunamadı | "Caliber is a science-based strength training app that combines resistance training, cardio, nutrition, and habit formation to help you build muscle, lose weight, and improve your overall fitness - for good." |
| Future | "Future Pro: Personal Training" | "Strength Training Workouts" (doğrulanmadı) | "Personal training, reimagined." |
| Lose It! | "Lose It! – Calorie Counter" | bulunamadı | "Lose It! Is your personal calorie counter, diet planner, nutrition-focused food tracker and weight loss progress tracking app that helps you build healthy eating habits…" |
| Strong (referans) | "Strong Workout Tracker Gym Log" | "Weight Lifting & Exercise Log" | "The most intuitive workout and exercise tracker for any fitness routine." |
| FitnessAI (referans) | "Fitness AI Gym Workout Planner" | bulunamadı | "Workout at home or at the gym with FitnessAI's advanced training algorithm to guide you through the perfect set, rep and weight combination…" |
| Gymverse (referans) | "Gymverse: Gym Workout Planner" | bulunamadı | "Gymverse acts as your personal trainer, building a fully managed, multi-week training plan tailored to your goals, schedule, and equipment." |
| Stronglifts (referans) | "Stronglifts 5x5 Workout Plan" | bulunamadı | "Get stronger with the world's simplest, most proven barbell program: the 5×5 workout. **No guesswork. Just follow along** and see real results, in just 3 workouts a week." |

> Not: App Store alt başlıklarının çoğu HTML kazımada güvenilir çıkmadı (Apple bot koruması / editoryal
> kart karışması). Yukarıda sadece iki bağımsız kaynakla doğrulananlar yazıldı.
> Kaynak: https://itunes.apple.com/search API + https://apps.apple.com/us/app/... sayfaları.

### A.2 · Web sitesi ana başlıkları (birebir H1)

| Ürün | H1 / hero | Alt başlık |
| --- | --- | --- |
| MacroFactor (macrofactor.com) | "Eat Smarter" · "Lift Smarter" | "MacroFactor Nutrition" / "MacroFactor Workouts" |
| Hevy (hevyapp.com) | "Log Workouts" | "Hevy is a free workout tracker for iOS and Android. Build routines and track progress with friends." · "The #1 workout tracker. Loved by 16+ million athletes." |
| Fitbod (fitbod.me) | "LESS PLANNING. MORE PROGRESS." | "Fitbod creates a personalized workout plan that updates with your body, recovery, and progress. **Know exactly what to do next—without second guessing what's best for you.**" — sayfada "AI" kelimesi hiç geçmiyor |
| Oura (ouraring.com) | "Subtle. Power." | "The world's smallest smart ring is here." · Marka çizgisi: "Understand your body. Own your health." |
| Runna (runna.com) | "Running made simple" | "Take your running to the next level" |
| WHOOP (whoop.com) | çekilemedi (403) — App Store metni: "turns comprehensive health insights into daily action" | — |

**İlk kritik gözlem:** Fitbod App Store alt başlığında **"AI Personal Trainer"** diyor ama kendi
web sitesinde **"AI" kelimesini hiç kullanmıyor.** Bu bilinçli bir ayrışma: AI = ASO anahtar kelimesi,
AI ≠ marka vaadi. Ve Fitbod'un web hero'su bizim tezimize en yakın rakip cümle:
"Know exactly what to do next—without second guessing." → **bu alan boş değil, Fitbod orada.**

### A.3 · Kelime frekans analizi (n=25 App Store açıklaması, US, Eylül 2026)

Yöntem: iTunes Lookup API ile 25 rakip/referans uygulamanın tam App Store açıklaması çekildi;
**doküman frekansı** hesaplandı (kaç farklı uygulamanın metninde geçiyor — toplam tekrar değil).
Ham veri script'i: `itunes.apple.com/lookup?id=...`. Uygulamalar: MacroFactor (x2), Hevy, Fitbod,
Cal AI, MyFitnessPal, Cronometer, Carbon, RP Hypertrophy, RP Diet, JuggernautAI, Ladder, Zing,
Freeletics, WHOOP, Oura, Runna, Caliber, Future, Noom, Lose It!, Strong, FitnessAI, Gymverse, Stronglifts.

#### DOYMUŞ bölge (kullanmak = görünmez olmak)

| Terim | 25 üründen kaçında |
| --- | --- |
| `coach` | **17** |
| `results` | **16** |
| `personalized` | **16** |
| `AI` (kelime olarak) | **12** |
| `smart` | **11** |
| `real` / `easy` | 11 / 11 |
| `science` (kökü) | **10** |
| `habit` · `expert` | 9 · 9 |
| `adapt` · `motivat*` | 8 · 8 |
| `recovery` | 7 |
| `proven` · `trainer` · `lose weight` · `build muscle` · `helps you` · `designed to` | 6 her biri |
| `what to do` | 5 |
| `guesswork` | 4 |

#### BOŞ / NEREDEYSE BOŞ bölge (0–2/25)

| Terim | Geçiş | Yorum |
| --- | --- | --- |
| `transparency` / `transparent` | **0** | Kimse şeffaflık satmıyor. |
| `uncertainty` | **0** | Kimse belirsizliği konuşmuyor. |
| `reason` | **0** | "Neden" gerekçesi kimsede satış argümanı değil. |
| `honest` | **0** | Boş. |
| `judgment` / `opinionated` | **0** | Boş. |
| `punish` / `shame` / `guilt` | 0 / 0 / 1 (sadece Noom "guilt-free") | "Cezalandırmıyor" iddiası söylenmemiş. |
| `evidence` | **1** (Noom) | "Science" 10, "evidence" 1 → herkes etiket basıyor, kimse kanıt demiyor. |
| `decision` | **1** (Stronglifts) | **Ana boşluk.** |
| `decide` | **1** (JuggernautAI) | **Ana boşluk.** |
| `because` | 1 (Runna) | Gerekçe dili yok. |
| `tells you` | 2 | Neredeyse boş. |
| `accuracy` | 2 | Cronometer + MacroFactor sahipleniyor. |
| `body fat` | 2 (Carbon, Zing) | Sahte sayı vaadi aslında yaygın değil — bu ayrım zayıf. |
| `algorithm` | 3 (MacroFactor x2, FitnessAI) | Az kullanılıyor; "algoritma" hâlâ ayrıştırıcı. |
| `effort` | 3 | Efor-bazlı ilerleme dili neredeyse boş. |
| `estimate` / `confidence` / `range` | 3 / 3 / 4 | Aralık/belirsizlik dili pratikte boş. |

**Sonuç:** doymuş eksen = *kişiselleştirme + koçluk + bilim etiketi*.
Boş eksen = **karar · gerekçe · şeffaflık · belirsizlik · dürüstlük**.
Tezimiz ("karar veren sistem", "her kararın nedeni açılabiliyor", "belirsizliği aralıkla gösteriyor")
tam olarak rakiplerin dilinin bittiği yerde başlıyor. Bu iyi haber ve aynı zamanda uyarı:
**kimse söylemiyorsa ya boşluk vardır ya da talep yoktur.** (bkz. C.4 kitle notu)

### A.4 · "Science-based" ne kadar aşınmış?

- `science*` 10/25 üründe geçiyor, ama tam kalıp `science-based` sadece **3** üründe:
  MacroFactor Workouts, Carbon, Caliber. `scientific` 2, `evidence` 1, `peer-reviewed` **0**,
  `clinically` **0**.
- Yani: "science" bir **atmosfer kelimesi** olmuş, "evidence" ise kimsenin girmediği alan.
  Etiketi basan çok, kanıt gösteren yok.
- **Gerçekten sahiplenenler** (arkasında kurumsal kimlik var):
  MacroFactor → Stronger By Science (Greg Nuckols/Eric Trexler markası, App Store satıcı adı
  fiilen "Stronger By Science Technologies LLC"); RP → "designed by Dr. Mike Israetel";
  Carbon → "Created by nutrition experts"; Caliber → "science-based fitness coaching program".
  Bunların üçü de **isim/kişi teminatı** ile destekliyor — kelimenin kendisiyle değil.
- **Karar:** "science-based" bizim için ayrım değil, giriş bileti. Alternatif ifade yönü:
  kelimeyi değil **mekanizmayı** söylemek. Örnek kalıplar (İngilizce, kullanıma hazır):
  - "Every number has a source you can open."
  - "You can see the rule that made this call."
  - "It shows its work."
  - "No claim without a citation you can tap."
  Bunlar `evidence`/`reason`/`source` alanına oturuyor — 0–1/25 doluluk.

### A.5 · "AI" kelimesi 2026'da varlık mı yük mü?

**Veri (tüketici tarafı, hepsi 2026):**

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| "AI makes ads feel less authentic" | %78 | Harris Poll, Haziran 2026 (aktaran kompozy.io) |
| AI yapımı olduğundan şüphelenilen reklama güvenmeme | %73 | a.g.e. |
| AI-generated reklam kullanan markadan alışverişi azaltma | %63 | a.g.e. |
| "Markaların pazarlamada AI'dan bahsetmeyi bırakmasını istiyorum" | %65 | kompozy.io derlemesi, 2026 |
| AI konusunda yorgunluk beyan eden | %54 | a.g.e. |
| AI kullanımı favori markaya güveni düşürür diyen | %20 (2025) → **%40 (2026)** | Fractl 2026 AI Search Consumer Trust Study |
| "AI markaya bakışımı kötüleştiriyor" / "iyileştiriyor" | %33 / %16 | Clutch, Haziran 2026 (n=408) |
| Gen Z'de AI reklamlara negatif duygu | %39 (Millennial %20) | Clutch 2026 |
| Müşteriye dönük mesajlarda genAI kullanmayan markayı tercih | %50 | Gartner 2026 |
| Etiketlenmemiş AI içeriği = 1 numaralı marka turn-off'u | %28 | Sprout Social Q1 2026 Pulse |

Kaynaklar:
- https://kompozy.io/guides/ai-marketing-backlash
- https://clutch.co/resources/ai-in-branding
- https://www.frac.tl/ai-statistics/
- https://www.emarketer.com/content/hiding-ai-use-brands--biggest-social-media-sin
- https://www.nim.org/en/publications/detail/transparency-without-trust
- https://mojo.biz/anti-ai-backlash-real-heres-how-smart-brands-are-using-ai-without-looking-they-are

**Kritik nüans — gizlemek ≠ bahsetmemek.** eMarketer/Sprout verisi tam tersini de söylüyor:
kullanımı **gizlemek** en büyük günah (%28), ve %91 tüketici AI kullanımının **açıklanmasını** bekliyor.
NIM çalışması: içerik birebir aynı olsa bile "AI-generated" etiketi taşıyan reklam daha eleştirel
değerlendiriliyor.

Yani üç seçenek var, ikisi kötü:
1. **"AI-powered" diye bağırmak** → doymuş (12/25 rakip zaten diyor) + güven cezası.
2. **AI'ı saklamak** → keşfedilirse en ağır ceza.
3. **AI'ı rolüne indirgeyip söylemek** → bizim mimarimiz zaten bu.
   *"The decision is not made by AI. AI only explains it."* — hem dürüst açıklama (disclosure)
   hem de rakiplerin tersi bir konumlanma. Bu üçüncü yol veriye göre tek tutarlı yol.

**Sektörde kanıt — Fitbod örneği (doğrulandı):** App Store alt başlığı `"AI Personal Trainer & Workouts"`
ama `fitbod.me` hero'sunda ve sayfanın tamamında "AI" kelimesi **hiç geçmiyor**; hero
`"LESS PLANNING. MORE PROGRESS."` MacroFactor da aynı: App Store'da "coaching algorithms", web'de
"Eat Smarter" — AI kelimesi yok, "algorithm" var.

**Pratik karar:**
- App Store **keyword field**'ında (gizli 100 karakter) `ai` bulunsun — arama trafiği için.
- **İsimde ve alt başlıkta "AI" olmasın.** ("Cal AI", "Zing AI", "FitnessAI", "JuggernautAI"
  zaten o rafı doldurmuş; oraya girmek kategori-içi kopya gibi görünür.)
- **Web/marka dilinde AI ancak sınırını çizmek için geçsin.** "AI only writes the sentence.
  The rule made the call."

### A.6 · UYARI — "boş alan" tamamen boş değil: 3 rakip zaten sınırdan içeri girmiş

Frekans analizi kelime düzeyinde boşluk gösterdi, ama **cümle düzeyinde** üç rakip bizim
iddiamızın parçalarını çoktan söylemiş. Bunları bilmeden konumlanmak hata olur.

| Rakip | Birebir alıntı (App Store US açıklaması) | Bizim hangi iddiamızı işgal ediyor |
| --- | --- | --- |
| **Carbon Diet Coach** | "…**so you're never left wondering why the app did or didn't make a change**" ve "Check-in history so you can look back and **see why the app made various adjustments**" | **Şeffaflık / "her kararın nedeni açılabiliyor"** — birebir aynı iddia |
| **Carbon Diet Coach** | "Carbon Diet Coach **removes the guesswork**" | "Karar veren sistem"in yumuşak versiyonu |
| **Fitbod** (web) | "**Know exactly what to do next—without second guessing** what's best for you." | "Analysis paralysis" kitlesine doğrudan hitap |
| **RP Hypertrophy** | "**Not sure what to do at the gym?** … **Know exactly the weight and reps to hit every week**" | Kararsızlık ağrısı → talimat vaadi |
| **Stronglifts** | "**No guesswork. Just follow along.**" | En saf "karar veren" cümlesi, ve sabit programla veriyor |
| **JuggernautAI** | "Individualized Volume Landmarks. **Do enough training to advance but not so much that you can't recover.**" | "Sana hayır diyebilen koç"un teknik karşılığı |
| **Caliber** | "**Guaranteed Results.** On average, Caliber members improve their body composition by 20% or more within 12 weeks." | Sayısal sonuç iddiası — bizim gitmeyeceğimiz yer (bkz. B) |

**Bu ne demek:** "karar veren sistem" kategorisel olarak yeni değil. Yeni olan **mimarinin
açıklanması** — deterministik motor + LLM'in dil katmanına hapsedilmesi. Ayrım "karar veriyoruz"
değil, **"kararı kim veriyor ve neyle veriyor" sorusunun cevabı.** Rakiplerin hiçbiri bunu söylemiyor
çünkü çoğunun cevabı yok ya da cevap "LLM".

Bu yüzden pazarlama cümlesi adayı — *"Kararı yapay zekâ vermiyor. Yapay zekâ sadece anlatıyor."* —
Carbon/Fitbod tarafından **işgal edilmemiş tek konum.** Sahiplenilecek yer burası.

---

## B · İDDİA DİLİ VE HUKUK

### B.1 · FTC — ne söylenebilir, ne söylenemez

**Dayanak:** FTC *Health Products Compliance Guidance* (Aralık 2022, hâlâ yürürlükte; dietary
supplement'ten **hizmetlere ve uygulamalara** genişletildi — 50'den fazla örnekle).
PDF: https://www.ftc.gov/system/files/ftc_gov/pdf/Health-Products-Compliance-Guidance.pdf
Özet sayfa: https://www.ftc.gov/business-guidance/advertising-marketing/health-claims

**"Competent and reliable scientific evidence" (CRSE) tanımı — birebir:**
> "tests, analyses, research, or studies that have been conducted and evaluated in an objective
> manner by experts in the relevant disease, condition, or function to which the representation
> relates; and are generally accepted in the profession to yield accurate and reliable results."

**Pratikte ne demek:**
- Sağlık faydası iddiası için **randomize kontrollü insan çalışması** beklenir. Belirli bir RCT
  sayısı şart değil ama bağımsız replikasyon kanıt ağırlığını ciddi artırır.
- **Hayvan ve in-vitro çalışmalar tek başına yetmez.**
- **Kullanıcı deneyimi anketleri kanıt sayılmaz.** (Bu bizim için kritik: "kullanıcılarımızın
  %80'i şunu dedi" bir sağlık iddiasını taşımaz.)
- Kaynak: Cooley, Wilson Sonsini ve FDLI özetleri —
  https://www.cooley.com/news/insight/2023/2023-03-02-ftc-revises-health-products-compliance-guidance ·
  https://www.wsgr.com/en/insights/ftc-releases-health-products-compliance-guidance.html ·
  https://www.fdli.org/2026/04/the-hundred-years-war-the-fight-against-weight-loss-fraud/

**Sınır çizgisi — bizim için kullanılabilir kural:**

| İddia tipi | Örnek | CRSE gerekir mi | Bize uygun mu |
| --- | --- | --- | --- |
| Sonuç/etki iddiası | "Lose 15 lbs in 16 weeks" | **Evet, RCT seviyesinde** | HAYIR |
| Ortalama sonuç iddiası | "Members improve body composition by 20%" (Caliber) | **Evet + tipiklik** | HAYIR |
| Garanti | "Guaranteed Results" | **Evet + refund mekanizması** | HAYIR |
| Ürün özelliği / mekanizma | "It logs your effort, not your total volume" | Hayır — doğru olması yeter | **EVET** |
| Ürün davranışı | "It will tell you to stop." | Hayır — ürün öyle davranıyorsa doğru | **EVET** |
| Süreç iddiası | "Every recommendation shows the rule that produced it" | Hayır — doğrulanabilir | **EVET** |
| Yumuşatılmış fayda | "designed to help you…" | Hafifletir ama **muaf tutmaz** | dikkatli EVET |

**Kritik uyarı:** "designed to" / "helps you" iddiayı **hukuken silmez.** FTC net alıp ne
söylendiğine bakar (net impression). Bu kalıplar sektörde yaygın çünkü **iddianın kendisini
zayıflatıyorlar**, muafiyet sağladıkları için değil. En güvenli yol iddiayı **sonuçtan ürün
davranışına kaydırmak** — biz zaten bunu yapabiliyoruz, çünkü tezimiz sonuç değil davranış hakkında.

### B.2 · FDA General Wellness (Ocak 2026 revizyonu)

- FDA, 6 Ocak 2026'da *General Wellness: Policy for Low Risk Devices* rehberini **revize etti**.
  İki faktörlü çerçeve korundu: (i) sadece genel iyilik amacı, (ii) düşük risk.
  https://www.cov.com/en/news-and-insights/insights/2026/01/fda-issues-revised-guidance-on-general-wellness-products ·
  https://www.troutman.com/insights/fdas-2026-guidance-on-general-wellness-devices-policy-for-low-risk-devices/ ·
  https://www.kslaw.com/news-and-insights/fda-updates-general-wellness-and-clinical-decision-support-guidance-documents
- İzinli iki kategori: (1) saf wellness iddiaları (**kilo yönetimi, fitness, uyku** açıkça sayılıyor),
  (2) sağlıklı yaşamla ilişkilendirilmiş hastalık referanslı iddialar.
- **2026'nın en önemli değişikliği:** fizyolojik parametre **tahmin eden / çıkarım yapan** invaziv
  olmayan sensörler için enforcement discretion'ın sınırı çizildi (kan basıncı, SpO2, glukoz, HRV).
  Temmuz 2025'te FDA bir giyilebilir üreticisine kan basıncı özelliği için warning letter yolladı.
- **Bizim için doğrudan sonuç:** "yağ yüzdesi gibi sahte sayılar vermiyoruz" konumumuz sadece
  dürüstlük değil, **regülatif olarak da doğru taraf.** Tahmini fizyolojik parametre üretmemek
  FDA riskini sıfıra yakın tutuyor. Bunu pazarlama argümanına çevirmek meşru:
  *"We don't estimate numbers we can't measure."*
- Ayrıca: **pazarlama sayfası intended use'u belirler.** Bir hukuk analizi bunu açıkça söylüyor —
  "After the FDA's January guidance, **your marketing page decides**" (Sahha,
  https://sahha.ai/blog/fda-general-wellness-guidance-health-apps/). Yani web copy'si düzenleyici
  bir belgedir; slogan seçimi hukuki bir seçimdir.

### B.3 · Apple App Store metadata kuralları

- **2.3.7 (Metadata):** benzersiz isim seç; anahtar kelimeleri doğru ata; metadata'yı
  **ticari markalı terimler, popüler uygulama isimleri, fiyat bilgisi veya alakasız ifadelerle**
  doldurma. https://developer.apple.com/app-store/review/guidelines/
- **Karakter limitleri:** isim 30, alt başlık 30, gizli keyword alanı 100.
- **Alt başlıkta yasak:** başka uygulamalara referans, **doğrulanamaz ürün iddiaları**, fiyat/promosyon.
- **Rakip ismi:** metadata'da rakip markası kullanmak hem red hem hukuki risk. Sektör örneği:
  bir uygulamanın alt başlığına "better than Fortnite" yazması ihlaldir.
  https://appfollow.io/blog/app-store-review-guidelines ·
  https://www.gummicube.com/blog/targeting-competitor-ios-app-brands-with-keyword-optimization/
- **Sağlık iddiası:** doğrudan bir "sağlık iddiası" maddesi yok, ama "unverifiable product claims"
  yasağı + 1.4.1 (fiziksel zarar) birlikte çalışıyor. Sayısal sonuç vaadi ("lose 20 lbs")
  alt başlıkta pratikte reddedilir.

### B.4 · Güvenli ama güçlü iddia kalıpları — sektörden birebir örnekler

Kaynak: 25 rakip App Store açıklamasından çıkarılan birebir alıntılar (Eylül 2026).

| Kalıp | Birebir örnek | Kim | Neden çalışıyor |
| --- | --- | --- | --- |
| `designed to` + fayda | "designed to help you get better results from your workouts" | Strong | Sonuç iddiasını niyete indiriyor |
| `helps you` + davranış | "Noom **helps you** eat better, move more, and feel more in control" | Noom | Fayda değil davranış |
| `so you can` + kullanıcı eylemi | "**so you can** trust the accuracy of the foods you log" | MacroFactor | Faydayı kullanıcıya devrediyor |
| Kim yaptı teminatı | "designed by renowned nutrition coaches Dr. Layne Norton (Ph.D.) and RD Keith Kraker" | Carbon | Kanıt yerine otorite |
| Kim yaptı teminatı | "built by PhDs, IFBB Pros, Registered Dietitians" | RP Diet | a.g.e. |
| Üçüncü taraf ağzı | "'An evidence-based lifestyle behavior change program.' - Mashable" | Noom | İddiayı basına söyletiyor |
| Rakam + dipnot | "Avg. weight loss: 15.5 lbs in 16 weeks… ¹" + "**Individual results may vary**" | Noom | Rakam veriyorsa dipnot şart |
| Tıbbi olmama beyanı | "Oura Ring **is not a medical device and is not intended to diagnose, treat, cure, monitor, or prevent** medical conditions" | Oura | Standart kalkan |
| Tıbbi olmama beyanı | "WHOOP products and services **are not medical devices**… All content… is for **general informational purposes only**" | WHOOP | a.g.e. |
| Tavsiye reddi | "We do not offer medical advice. Any and all recommendations should be **viewed as suggestions**" | Cal AI | Zayıf ama var |
| Mekanizma anlatımı | "Using a **best-in-class expenditure estimate**, MacroFactor's algorithm adapts to changes in your metabolism" | MacroFactor | İddia değil, mekanizma tarifi |
| Negatif kısıt | "Do enough training to advance **but not so much that you can't recover**" | JuggernautAI | "Hayır diyen koç"un güvenli hali |

**Kaçınılacaklar (rakiplerin aldığı riskler):**
- "**Guaranteed Results.** On average… 20% or more within 12 weeks" (Caliber) → CRSE + tipiklik yükü.
- "Avg. weight loss: 15.5 lbs in 16 weeks" (Noom) → dipnotla korunuyor, ama Noom'un **62 milyon
  dolarlık** auto-renewal class action geçmişi var (S.D.N.Y., final onay Temmuz 2022:
  56M nakit + 6M kredi). Ders: sorun genelde iddia değil, **abonelik akışı.**
  https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/noom-to-pay-over-60m-to-cancel-automatic-renewal-suit ·
  https://wittelslaw.com/cases/noom-weight-loss-program-auto-enrollment-class-action

### B.5 · Karşılaştırmalı reklam — rakibi ismen eleştirmek

| Ortam | Yasal mı | Pratik |
| --- | --- | --- |
| ABD reklamı (web, YouTube, sosyal) | **Evet.** FTC politikası rakibin **isimlendirilmesini açıkça teşvik ediyor** — iddia doğru ve yanıltıcı olmadığı sürece. Marka kullanımı "nominative use" olarak meşru. | Riski taşıyan: Lanham Act §43(a) / 15 U.S.C. §1125(a) — rakip **doğrudan sana dava açabilir.** İki test: (1) iddia literal olarak yanlış mı, (2) makul tüketiciyi yanıltır mı. Karşılaştırmalı iddia da CRSE ister. |
| **App Store metadata** (isim, alt başlık, keyword, açıklama) | **Hayır.** 2.3.7 ihlali + marka ihlali riski. | "better than X" tipi alt başlık uyarı/ban sebebi. |
| Apple Search Ads | Rakip marka kelimesine **teklif vermek** serbest (isme, metne koymak değil). | Standart ASO taktiği. |

Kaynaklar: https://legalclarity.org/when-is-comparative-advertising-legal/ ·
https://batesonlaw.com/comparative-advertising-legal-issues-when-you-name-a-competitor/ ·
https://www.gfrlaw.com/what-we-do/insights/beyond-brand-x-using-another%E2%80%99s-trademark-your-own-advertising

**Bizim için tavsiye:** rakibi **isimlendirme.** İki nedenle:
1. Kırmızı çizgi: kibir. "Diğerleri aptal" tonu tam olarak isim vererek oluşur.
2. Bizim iddiamız karşılaştırmalı değil **kategorik** — "veri toplayanlar vs. karar veren."
   Kategoriyi eleştirmek isim vermeden yapılabilir ve daha güçlü: hiç kimseyi savunmaya geçirmez,
   herkesi kendi uygulamasını düşünmeye iter.
   Güvenli kalıp: *"Most apps hand you a chart. Then you decide."* — kimseyi isimlendirmiyor,
   doğru, dava edilebilir değil, ve okuyucu kendi uygulamasını gözünde canlandırıyor.

---

## C · KONUMLANDIRMA

### C.1 · "Karar veren" iddiası — fitness dışı örnekler

Bu iddianın en olgun hali fitness'ta değil, **üretkenlik ve finansta.**

| Ürün | Konumlandırma dili | Ders |
| --- | --- | --- |
| **Motion** | "Motion saves you time **deciding what to work on next**." Karşılaştırma yazılarında formüle edilen ayrım: "**Motion decides for you, Sunsama lets you decide.**" · "If deciding when to do things was itself the overwhelming part, Motion **removes that decision wholesale**." | Karar iddiası **ağrı üzerinden** kuruluyor: karar vermek yorucu. Fayda "daha iyi karar" değil, **karardan kurtulmak.** |
| **Reclaim** | "you input all the things you could work on and **Reclaim tells you what to work on and when**" | "tells you what to do" düz haliyle kullanılıyor ve itici bulunmuyor — çünkü konu iş, ego değil. |
| **Sunsama** | Tam tersi konum: "calm, intentional **manual** planning" · "saves you from working on the wrong things" | Karşı kutup da satılabilir bir konum. Yani "karar veren" bir tercih, evrensel doğru değil. |
| **Wealthfront** | "shows you **the tradeoffs of your decisions** and provides **actionable advice**" · marka çizgisi "Money works better here" | Finansta "karar" dili **tradeoff** üzerinden söyleniyor — otoriter değil, hesap veren. |
| **Copilot / Monarch (eleştirisi)** | Sektör yorumu: "they help you understand **what has happened** — but are less equipped to guide **what should happen next**" · "**visibility is not the same thing as clarity, and it's definitely not the same thing as decision-making**" | **Bu cümle bizim tezimizin İngilizce hali** ve fitness dışında zaten dolaşımda. Kanıt: kategori-bağımsız bir gerçek ağrı. |

Kaynaklar: https://skedul.ai/blog/sunsama-vs-motion-vs-reclaim · https://toolfinder.com/comparisons/motion-vs-sunsama ·
https://www.sunsama.com/compare · https://www.wealthfront.com/ ·
https://useorigin.com/resources/blog/copilot-vs-monarch-which-is-better-for-your-financial-life

**Hangi ifade işliyor?** Kanıta göre sıralama:

1. **"decides / decision"** — en güçlü, en az kullanılmış (fitness'ta 1/25). Ama tek başına soğuk.
2. **"tells you what to do (next)"** — işliyor ama fitness'ta 5/25 dolu (RP, Fitbod, Ladder, Carbon,
   Stronglifts). Ayrım değil.
3. **"opinionated" / "has a point of view"** — tüketici tarafında **kelime olarak kullanılmıyor**
   (0/25). Geliştirici jargonu; son kullanıcıya anlamsız. Kavramı sat, kelimeyi satma.
4. **En işleyen kombinasyon:** ağrı (karar vermek yorucu) + iddia (karar veriyoruz) + kanıt
   (nasıl verdiğimizi gösteriyoruz). Motion birinciyi, Stronglifts ikinciyi yapıyor;
   **üçünü birden yapan yok.**

### C.2 · "Opinionated software" tüketici tarafında

- **Kelime tüketiciye gitmiyor.** 25 fitness uygulamasının hiçbirinin metninde "opinionated" yok.
  B2B/geliştirici dünyasında (Linear, 37signals, Rails "convention over configuration") bir
  övgü terimi; tüketici pazarlamasında karşılığı yok. **Kavramı kullan, kelimeyi kullanma.**
- **Tüketicide işleyen "opinionated" örnekleri, kelime kullanılmadan:**
  - **Oura Readiness Score** — tek bir sayı veriyor ve o sayı bir hüküm. "Understand your body.
    Own your health." Karar ürünün, sorumluluk kullanıcının. Bu formül iyi çalışıyor.
  - **WHOOP Recovery** — "turns comprehensive health insights **into daily action**".
    Aynı formül: veri → tek hüküm → eylem.
  - **Stronglifts** — "No guesswork. Just follow along." Programın kendisi görüş.
- **Riskler (ürün tarafında karşılığı olmalı):**
  1. **Yanlış hüküm görünür olur.** Grafik veren uygulama yanılmaz; hüküm veren uygulama yanılır.
     Bu yüzden "belirsizliği aralıkla göster" özelliği pazarlama değil **hasar kontrolü** —
     ve tam da bu yüzden mesajın parçası olmalı.
  2. **Esneklik kaybı algısı.** Sunsama'nın Motion'a karşı konumu bu: kullanıcı kontrolü.
     Karşı hamle: "you can always override it — and it will tell you what that costs."
  3. **Otoriter ton = kibir.** Bkz. C.3.

### C.3 · "Hayır diyen koç" — itici olmadan nasıl söylenir

**Kanıt (davranış bilimi):** "Tough love" tek başına çalışmıyor.
- NEDIC derlemesi: utanç veya suçluluk uyandırmak **uzun vadede egzersiz davranışını motive etmede
  etkili değil**, olumlu beden algısı veya özsaygı için de değil. https://nedic.ca/blog/the-tough-love-approach-to-motivation/
- PLOS One boylamsal çalışması (2024/2025): koç davranışının **algılanması** + içsel motivasyon +
  keyif, 3. ve 6. ayda egzersiz bağlılığını yordadı.
  https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0310931
- Spor literatürü: "tough love"ın etkisini belirleyen faktörler arasında koç-sporcu ilişkisi,
  **açık geri bildirim**, kullanım sıklığı ve **mahremiyet** var — yani sertlik değil,
  **sertliğin çerçevesi** belirleyici.

**Sonuç: "sert koç" satma. "Dürüst sistem" sat.** Farkı şu:

| İtici (kaçın) | İşleyen (kullan) |
| --- | --- |
| "It won't let you make excuses." | "It will tell you when the number doesn't support what you want to hear." |
| "No excuses. No shortcuts." (Goggins tonu) | "Some weeks the honest answer is: don't add weight." |
| "Stop lying to yourself." | "It won't pretend a bad week was a good one." |
| "Tough love." | "It's allowed to disagree with you." |

Kritik nüans: **"hayır" öznenin kullanıcıya değil, verinin duruma söylediği bir şey olmalı.**
"Sen yetersizsin" ≠ "bu hafta veri artış desteklemiyor". İlki suçlama, ikincisi rapor.
JuggernautAI'ın kalıbı bu yüzden güvenli: "Do enough training to advance **but not so much that
you can't recover**" — sınır koyuyor, kullanıcıyı yargılamıyor.

Ek: **övgü enflasyonundan kaçınmak** kendi başına bir mesaj. Boş alan analizinde `honest` 0/25.
*"It doesn't celebrate everything."* söylenmemiş ve doğrudan tezle uyumlu.

### C.4 · Hedef kitle — tek mesaj iki profile hitap eder mi?

**İki profil:**
(a) temeli bilmeyen — ağrı: *ne yapacağımı bilmiyorum*
(b) program hopping / analysis paralysis yaşayan mükemmeliyetçi — ağrı: *çok fazla şey biliyorum,
seçemiyorum*

**Literatürün cevabı: ikisi de aynı ağrının iki ucu, ama aynı mesajla satın almıyorlar.**

- April Dunford'un konumlandırma yaklaşımının çekirdeği: **en iyi müşteri segmentini seç ve
  konumlandırmayı onun etrafında kur**; konumlandırma "one and done" değil, ürün ve pazar
  değiştikçe yeniden yapılır. https://www.aprildunford.com/ ·
  https://www.lennysnewsletter.com/p/a-guide-to-advanced-b2b-positioning ·
  https://businessofsoftware.org/2026/02/why-positioning-is-never-one-and-done-key-lessons-from-april-dunfords-bos-ama/
  (Not: bu kaynaklarda "iki uç kitleye tek mesaj" sorusunun **doğrudan** cevabı bulunamadı;
  aşağıdaki sentez genel konumlandırma prensiplerinden türetildi, birebir alıntı değil.)
- Pratik gözlem (rakip verisinden): "Not sure what to do at the gym?" (RP) → profil (a).
  "without second guessing what's best for you" (Fitbod) → profil (b).
  **İkisi de aynı çözümü satıyor, farklı cümleyle.** Yani ürün tek, giriş cümlesi iki.

**Tavsiye — tek konumlandırma, iki giriş kapısı:**
- **Konumlandırma (marka düzeyi, tek):** "the app that decides" — ikisine de doğru.
- **Mesaj (kanal düzeyi, iki):**
  - (b) mükemmeliyetçi için → *"You already know enough. You just can't pick."* — YouTube, uzun
    içerik, r/fitness dışı topluluklar, ASO'da "program", "periodization", "deload".
  - (a) yeni başlayan için → *"You don't need a plan. You need the next set."* — App Store
    ekran görüntüleri, TikTok/Shorts, ASO'da "beginner", "workout plan".
- **Faz 1'de biri seçilmeli:** (b) — mükemmeliyetçi. Nedenleri:
  1. Ödeme isteği daha yüksek (zaten 3 uygulama denemiş, para harcamış).
  2. Şeffaflık/gerekçe özelliğini **fark eder**; (a) fark etmez.
  3. Levent'in kendi hikâyesi (kaynak kuralı) bu profil — anlatabileceği tek gerçek ağrı bu.
  4. (a) daha büyük pazar ama Fitbod/Zing/Ladder'ın reklam bütçesiyle dolu.

---

## D · İSİMLENDİRME — yaklaşım (somut isim önerilmiyor)

### D.1 · Kategoride işleyen isim kalıpları

| Kalıp | Kategori örnekleri | ASO avantajı | Marka/hukuk |
| --- | --- | --- | --- |
| **Gerçek kelime, çarpıtılmış yazım** | Hevy (heavy), Zing, Runna (runner) | Orta — kelime tanınır ama arama hacmi markaya bağlı | İyi: yazım çarpıtması ayırt edicilik yaratır, tescil edilebilir |
| **Gerçek kelime, düz** | Strong, Ladder, Future, Simple, Caliber, Carbon | Zayıf — generic kelime, arama sonuçlarında boğulur | Riskli: "Strong", "Simple", "Future" tek başına zayıf marka; ancak kullanımla ikincil anlam kazanır |
| **Uydurma** | Fitbod, Cronometer, Noom | Zayıf başlangıç, güçlü uzun vade | En iyi: 1. günden tescil edilebilir, karışma riski en düşük |
| **Tanımlayıcı bileşik** | MacroFactor, Lose It!, MyFitnessPal | Güçlü — anahtar kelime isimde | En kötü: tanımlayıcı isimler ikincil anlam olmadan **korunamaz**, genişlemeyi kısıtlar |
| **Kişi/otorite adı** | RP (Renaissance Periodization / Dr. Mike Israetel), JuggernautAI (Chad Wesley Smith), Carbon (Layne Norton) | Zayıf ASO, güçlü dönüşüm | Kişiye bağımlılık riski |
| **Marka + generic kuyruk** | "Hevy — Workout Tracker Gym Log", "Fitbod: Gym & Fitness Planner" | **En iyi pratik** — marka + 1-2 anahtar kelime | Standart |

Kaynaklar: https://marketful.com/naming-strategy · https://asoworld.com/insight/aso-guide-how-to-choose-the-best-name-for-your-app/ ·
https://www.nameclub.com/blog/mobile-app-naming/ · https://www.frozenlemons.com/blog/one-word-vs-descriptive-names-what-works-best-for-your-business

**Temel takas (birebir literatür):** tanımlayıcı isimler ne yaptığını söyler ama **tescili neredeyse
imkânsız**, genişlemeyi kısıtlar ve rakiplerin arasında kaybolur; uydurma isimler ilk günden
tescil edilebilir ve karıştırılması en zor olanlardır ama **anlamı sıfırdan inşa etmek için ciddi
pazarlama yatırımı ister.** Tanımlayıcı isimler **ikincil anlam kazanmadan korunamaz**;
uydurma ve çağrışımsal isimler bu engeli 1. günde aşar.

**Bizim durumumuz için yaklaşım:**
- Öğrenci bütçesi = uydurma ismin gerektirdiği pazarlama yatırımı yok. Ama YouTube kanalı
  (27K + yeni ana kanal) **tam olarak o yatırımın yerine geçer** — isim anlamını içerikten alır.
  Bu, uydurma/çağrışımsal isim tarafına ağırlık verir.
- Kategori mesajı "karar" ekseninde. **Kelime anlamı karar/hüküm/yön çağrıştıran kısa,
  telaffuz edilebilir bir kök** en verimli nokta: ASO'da marka+generic kuyrukla kapatılır,
  hukuken korunur, ve tez ile marka aynı şeyi söyler.
- **Kaçınılacak:** isimde "AI" (A.5), isimde "Fit/Fit-" (doymuş), isimde "Coach" (17/25).

### D.2 · App Store isim mekaniği (ASO)

Doğrulanan hiyerarşi (2026):
1. **App Name (30 karakter)** — App Store'daki **en yüksek tekil anahtar kelime ağırlığı.**
   İsimdeki hedef kelime, aynı kelimenin başka herhangi bir alandaki halinden daha yüksek sıralanır.
   İsime taşınan kelimeler **günler içinde** indekslenip yükselebiliyor.
2. **Subtitle (30 karakter)** — isimden sonra en ağır alan. Android'de karşılığı yok.
3. **Keyword field (gizli, 100 karakter)** — üçüncü sırada.

> "Hedef anahtar kelimen bu üç yerden en az birinde değilse o kelimede **hiç sıralanmazsın.**"

Kaynaklar: https://appfollow.io/blog/app-store-optimization-title ·
https://appradar.com/academy/app-store-ranking-factors · https://www.applaunchflow.com/blog/app-store-keyword-research-2026 ·
https://www.applaunchflow.com/blog/aso-best-practices

**Pratik sonuç:** isim seçimi **doğrudan bir arama sıralaması kararıdır.** Yaklaşım:
- Format: `Marka — 2 generic anahtar kelime` (30 karakter içinde). Örn. yapı:
  `<Marka> — Strength Coach` gibi (isim önerilmiyor, kalıp gösteriliyor).
- Alt başlık **iddia değil ikinci anahtar kelime seti** olarak kullanılmalı, ama boşa da harcanmamalı;
  Fitbod'un `"AI Personal Trainer & Workouts"` örneği: %100 keyword, %0 marka mesajı. Bizim için
  denge: bir yarısı keyword, bir yarısı ayrım.
- "AI" gizli keyword alanına, isme/alt başlığa değil.

### D.3 · Alan adı ve marka çakışma kontrolü — sıra

| # | Adım | Araç (ücretsiz) | Ne arıyorsun |
| --- | --- | --- | --- |
| 1 | **Knockout — App Store** | App Store / Google Play araması + `itunes.apple.com/search?term=` | Aynı/benzer isimde uygulama var mı. En hızlı eleme. |
| 2 | **Knockout — ABD marka** | **USPTO Trademark Search** — `tmsearch.uspto.gov` (TESS 30 Kasım 2023'te emekli oldu) | Class 9 (yazılım) ve Class 41/44'te birebir, benzer yazım, **fonetik varyant**, çoğul, kısaltma |
| 3 | **AB / uluslararası** | **EUIPO TMview** (`tmview.org`) + **WIPO Global Brand Database** (`wipo.int/en/web/global-brand-database`) | Aynı sınıflarda AB ve uluslararası tesciller |
| 4 | **Common law / tescilsiz kullanım** | Google, GitHub, Product Hunt, Instagram/X handle | Tescilsiz ama kullanımda olan marka — ABD'de bu da hak doğurur |
| 5 | **Alan adı** | `instantdomainsearch.com`, `namecheckr.com` (eşzamanlı sosyal handle kontrolü) | `.com` ideal; `.app`/`.co` kabul edilebilir ikinci tercih |
| 6 | **Finalistlerde derin arama** | Ücretli clearance / avukat | Sadece 2-3 finalist için; ambalaj/kampanya kesinleşmeden önce |

Sıra kuralı (birebir literatür): **önce knockout aramalarıyla apaçık olmayanları ele, sonra
finalistler için kapsamlı arama yaptır** — common law kaynakları ve öncelikli yabancı pazarlar dahil,
ve bunu **büyük kampanya kesinleşmeden önce** yap.
Kaynaklar: https://www.uspto.gov/subscription-center/2023/retiring-tess-what-know-about-new-trademark-search-system ·
https://www.euipn.org/en/tools/TMview · https://www.wipo.int/en/web/global-brand-database ·
https://harris-sliwoski.com/blog/the-importance-of-conducting-trademark-clearances/ ·
https://trademarkangel.com/the-best-free-trademark-search-tools-of-2026-a-comprehensive-review/

### D.4 · Kaçınılacaklar — somut başarısızlık örnekleri

| Hata | Örnek | Ne oldu |
| --- | --- | --- |
| **Yazım belirsizliği** | **Xobni** ("inbox" tersten) | Kimse yazamadı, telaffuz edemedi, hatırlayamadı |
| **Telaffuz belirsizliği** | **Fage** (fa-yeh) | Ambalaja telaffuz talimatı basmak zorunda kaldı |
| **Telaffuz belirsizliği** | **Hyundai** | İngilizce konuşulan pazarlarda kalıcı telaffuz karmaşası |
| **Ülkeye göre anlam kazası** | **Ford Pinto** (Brezilya Portekizcesi'nde argo) | Pazar kaybı |
| **Ülkeye göre anlam kazası** | **Mercedes → "Bensi"** (Çin, "ölüme koş" olarak okunabiliyor) · Coca-Cola'nın erken Çince yazımı ("mum kurbağasını ısır") | Yeniden adlandırma |
| **Ülkeye göre anlam kazası** | **Siri** (Gürcistan'da müstehcen) · **Barf** deterjanı (İran) | İngilizce pazarda gülünç |

Kaynaklar: https://spellbrand.com/blog/brand-naming-mistakes-examples ·
https://en.wikipedia.org/wiki/Brand_blunder · https://spellbrand.com/blog/brand-names-cross-borders ·
https://www.planetlanguages.com/brand-name-translations-what-businesses-need-to-know/

**Global İngilizce hedeflendiği için test listesi:**
1. Telefonda tarif edilebiliyor mu? ("Nasıl yazılıyor?" sorusu geliyorsa ele.)
2. Türkçe konuşan biri İngilizce aksanıyla söylediğinde aynı kelime mi?
3. İspanyolca/Portekizce/Almanca/Fransızca/Hintçe'de kaza var mı? (En büyük 5 App Store pazarı.)
4. Mevcut fitness markasıyla karışıyor mu? (Strong vs Stronglifts vs Strongr karmaşası zaten var —
   o rafa girme.)
5. `.com` alınabilir mi ya da makul bir varyantı var mı?

---

## SONUÇ · 5 alternatif konumlandırma cümlesi (İngilizce)

Hepsi şu üç filtreden geçirildi: (1) 25 rakip metninde geçen doymuş kelimeden kaçınıyor mu,
(2) FTC CRSE eşiğini tetikleyen sonuç iddiası içeriyor mu, (3) kibir tonu var mı.

---

### 1 — Karar ekseni (ana aday)

> **"Everything else shows you the data. This one makes the call."**
> Alt satır: *"And it will always show you why."*

| | |
| --- | --- |
| **Kitle** | (b) mükemmeliyetçi / program hopper. Veriye zaten sahip, karara sahip değil. |
| **Hukuki risk** | **Çok düşük.** Sonuç iddiası yok, sağlık iddiası yok, rakip ismi yok. "makes the call" bir **ürün davranışı** beyanı — ürün öyle davranıyorsa doğru. |
| **Neden işler** | `decision/decide` fitness'ta 1/25 — pratikte boş. "shows you the data" tam olarak Copilot/Monarch eleştirisinin fitness'a çevrilmiş hali ("visibility is not decision-making") ve bu ağrının kategori-bağımsız gerçek olduğu kanıtlı. Kimseyi isimlendirmiyor ama okuyucu kendi uygulamasını düşünüyor. |
| **Risk** | Carbon "removes the guesswork", Stronglifts "No guesswork" diyor — komşu. Ayrım alt satırdan geliyor. |

---

### 2 — AI'ın rolünü çizen (tezin birebir çevirisi)

> **"The AI doesn't decide. It just explains."**
> Uzun hali: *"A deterministic engine makes the call. The language model only puts it in words."*

| | |
| --- | --- |
| **Kitle** | (b) + teknik olarak meraklı erken benimseyenler + YouTube izleyicisi. Portfolyo kanıtı olarak da doğrudan işe yarıyor. |
| **Hukuki risk** | **Çok düşük** — mimari beyanı, fayda iddiası değil. Aynı zamanda **AI disclosure** beklentisini karşılıyor (%91 tüketici açıklama bekliyor). |
| **Neden işler** | 2026 verisi: "AI-powered" etiketi ceza (%65 markaların AI'dan bahsetmeyi bırakmasını istiyor; güven düşüşü %20→%40), ama **gizlemek daha büyük ceza** (%28 ile 1 numaralı turn-off). Bu cümle tek çıkış yolu: AI'ı hem itiraf ediyor hem küçültüyor. 12/25 rakip "AI" diyor, **hiçbiri AI'ın ne yapmadığını söylemiyor.** |
| **Risk** | "deterministic engine" tüketiciye ağır. Uzun hali web'e, kısa hali her yere. |

---

### 3 — Dürüstlük / hayır diyebilme ekseni

> **"A coach that's allowed to disagree with you."**
> Alt satır: *"Some weeks the honest answer is: don't add weight."*

| | |
| --- | --- |
| **Kitle** | (b) + kendini "sert antrenmana hazır" gören ama gerçekte aşırı antrenman yapan kesim. |
| **Hukuki risk** | **Düşük.** Hiçbir sonuç vaadi yok. Dikkat: "prevents overtraining" gibi bir yaralanma-önleme iddiasına **kaymamalı** — o FDA/FTC alanına girer. "disagree" ve "don't add weight" tamamen davranış beyanı. |
| **Neden işler** | `honest` 0/25, `judgment` 0/25, `punish` 0/25. Tamamen boş alan. "allowed to" formülasyonu sertliği **izin** olarak çerçeveliyor — kullanıcıyı yargılamıyor, kendi sınırını beyan ediyor. NEDIC ve PLOS One verisi: utandırma çalışmıyor, **açık geri bildirim** çalışıyor. Bu cümle ikincisi. |
| **Risk** | `coach` 17/25 — doymuş kelime. "A coach that's allowed to disagree" ancak zıtlık nedeniyle kurtarıyor. Alternatif: "It's allowed to disagree with you." (coach'suz) |

---

### 4 — Şeffaflık / gerekçe ekseni

> **"Every number comes with the reason behind it."**
> Alternatif: *"It shows its work."*

| | |
| --- | --- |
| **Kitle** | (b) mükemmeliyetçi — güven eşiği yüksek, "kara kutu" kelimesine alerjisi var. Levent'in kendi değeriyle de birebir örtüşüyor. |
| **Hukuki risk** | **Sıfıra yakın.** Doğrulanabilir ürün özelliği. |
| **Neden işler** | `reason` 0/25, `transparency` 0/25, `because` 1/25, `evidence` 1/25. Sözlük olarak boş. "Shows its work" okul dilinden geliyor — açıklama gerektirmiyor. |
| **UYARI** | Bu **tek başına kullanılırsa Carbon ile çakışır.** Carbon birebir: "so you're never left wondering **why** the app did or didn't make a change." Yani bu eksen **ana konumlandırma olamaz**, ana konumlandırmanın (1 veya 2) kanıtı olabilir. |

---

### 5 — Belirsizliği sahiplenen (kontrarian, en riskli/en ayrıştırıcı)

> **"It won't give you a number it can't stand behind."**
> Alt satır: *"No body fat percentage. No fake precision. Ranges, when a range is the truth."*

| | |
| --- | --- |
| **Kitle** | Yanmış kullanıcı — akıllı tartı/uygulama yağ yüzdesine güvenip hayal kırıklığına uğramış kesim. Dar ama sadık. |
| **Hukuki risk** | **Düşük ve aslında koruyucu.** FDA'nın Ocak 2026 revizyonu tam olarak "fizyolojik parametre tahmin eden/çıkarım yapan" özelliklerin sınırını çiziyor; Temmuz 2025'te bir giyilebilir üreticisine bu nedenle warning letter gitti. Bu sayıları **üretmemek** riski kaldırıyor ve bunu söylemek meşru. |
| **Neden işler** | `uncertainty` 0/25, `range` 4/25 (hiçbiri belirsizlik anlamında değil), `body fat` sadece 2/25. Kimse bunu satmıyor. |
| **Risk** | **Negatif konumlandırma** — ne yapmadığınla tanınmak zayıf marka kurar. Ayrıca (a) kitlesi bu ayrımı anlamaz. Ana cümle değil, **ikincil kanıt cümlesi** olarak kullan. |

---

### Önerilen istif (tek marka, katmanlı)

```
Hero (App Store screenshot 1 + web H1):
    Everything else shows you the data.
    This one makes the call.

Hero altı (bir satır):
    A deterministic engine decides. The AI only explains it.

Kanıt satırları (özellik bölümleri):
    · It shows its work — every call opens into the rule that made it.
    · It's allowed to disagree with you.
    · It won't give you a number it can't stand behind.
    · Effort, not tonnage. Measured often, judged rarely.

App Store adı:   <Marka> — <2 generic keyword>       (30 kar.)
Alt başlık:      yarısı keyword / yarısı ayrım        (30 kar.)
Keyword field:   ai, coach, program, periodization…   (100 kar., gizli)
```

**Kullanılmayacaklar (doymuş, 6+/25):** personalized · smart · AI-powered · science-based ·
coach (tek başına) · results · proven · guesswork · "what to do next" · adaptive · expert.

**Söylenmeyecekler (hukuki):** herhangi bir kilo/kas/yüzde rakamı · "guaranteed" ·
"prevents injury/overtraining" · "clinically proven" · rakip ismi (özellikle App Store metadata'sında).

---

## Kaynak listesi (ana)

**Rakip verisi**
- iTunes Search/Lookup API — `https://itunes.apple.com/lookup?id=<id>&country=us` (25 uygulama, Eylül 2026)
- https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471
- https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350
- https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543
- https://macrofactor.com/ · https://www.hevyapp.com/ · https://fitbod.me/ · https://ouraring.com/ ·
  https://www.runna.com/ · https://www.caliberstrong.com/ · https://www.joincarbon.com/ · https://www.future.co/

**AI algısı 2026**
- https://kompozy.io/guides/ai-marketing-backlash · https://clutch.co/resources/ai-in-branding
- https://www.frac.tl/ai-statistics/ · https://www.emarketer.com/content/hiding-ai-use-brands--biggest-social-media-sin
- https://www.nim.org/en/publications/detail/transparency-without-trust
- https://mojo.biz/anti-ai-backlash-real-heres-how-smart-brands-are-using-ai-without-looking-they-are

**Hukuk**
- https://www.ftc.gov/system/files/ftc_gov/pdf/Health-Products-Compliance-Guidance.pdf
- https://www.ftc.gov/business-guidance/advertising-marketing/health-claims
- https://www.cooley.com/news/insight/2023/2023-03-02-ftc-revises-health-products-compliance-guidance
- https://www.cov.com/en/news-and-insights/insights/2026/01/fda-issues-revised-guidance-on-general-wellness-products
- https://www.troutman.com/insights/fdas-2026-guidance-on-general-wellness-devices-policy-for-low-risk-devices/
- https://sahha.ai/blog/fda-general-wellness-guidance-health-apps/
- https://developer.apple.com/app-store/review/guidelines/ · https://appfollow.io/blog/app-store-review-guidelines
- https://legalclarity.org/when-is-comparative-advertising-legal/
- https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/noom-to-pay-over-60m-to-cancel-automatic-renewal-suit

**Konumlandırma / davranış**
- https://skedul.ai/blog/sunsama-vs-motion-vs-reclaim · https://useorigin.com/resources/blog/copilot-vs-monarch-which-is-better-for-your-financial-life
- https://www.aprildunford.com/ · https://www.lennysnewsletter.com/p/a-guide-to-advanced-b2b-positioning
- https://nedic.ca/blog/the-tough-love-approach-to-motivation/
- https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0310931

**ASO / isimlendirme**
- https://appfollow.io/blog/app-store-optimization-title · https://appradar.com/academy/app-store-ranking-factors
- https://www.applaunchflow.com/blog/app-store-keyword-research-2026 · https://marketful.com/naming-strategy
- https://www.uspto.gov/subscription-center/2023/retiring-tess-what-know-about-new-trademark-search-system
- https://www.euipn.org/en/tools/TMview · https://www.wipo.int/en/web/global-brand-database
- https://spellbrand.com/blog/brand-naming-mistakes-examples · https://en.wikipedia.org/wiki/Brand_blunder

---
*Bulunamayanlar (uydurulmadı):* çoğu rakibin App Store **alt başlığı** (Apple bot koruması nedeniyle
güvenilir çekilemedi — sadece 5 tanesi iki kaynakla doğrulandı) · WHOOP web sitesi hero'su (403) ·
Noom web sitesi hero'su (boş yanıt) · "AI-powered etiketinin App Store dönüşümüne etkisi" üzerine
doğrudan ölçüm (genel tüketici anketleri var, **uygulama-içi conversion çalışması bulunamadı**) ·
April Dunford'un "iki uç kitleye tek mesaj" konusundaki doğrudan görüşü.
