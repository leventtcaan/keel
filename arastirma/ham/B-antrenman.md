# B — Antrenman / Gym / Kuvvet Takip Uygulamaları: Rakip Analizi

**Araştırma tarihi:** 2026-09-08
**Kapsam:** 24 uygulama (Tier 1 derin, Tier 2 özet) + pazar boşlukları
**Metodoloji notu:**
- Mağaza verileri (puan, oy sayısı, indirme, sürüm tarihi) **2026-09-08'de doğrudan iTunes Search/Lookup API ve Google Play ürün sayfalarından** çekildi. Bunlar birincil, doğrulanmış veri.
- Fiyatlar öncelikle App Store in-app purchase listelerinden ve şirketlerin kendi fiyat sayfalarından alındı; ikincil kaynaklardan gelenler ayrıca işaretlendi.
- Web araması kotası oturum içinde doldu (200/200). Kalan bilgi doğrudan sayfa çekimiyle (curl/WebFetch) toplandı. Bulunamayan her alan **"bulunamadı"** yazıyor.
- MAU / gelir tahminleri sektörde çoğunlukla paywall arkasında (Sensor Tower, Appfigures). Bulunamayanlar açıkça işaretli.

---

## 1. Doğrulanmış ölçek tablosu (2026-09-08)

| Uygulama | iOS puan | iOS oy | Android indirme | Android puan | Android oy | Son güncelleme (iOS) |
| --- | --- | --- | --- | --- | --- | --- |
| **Hevy** | 4.92 | 91.103 | 5M+ | 4.9 | 262K | 2026-09-03 |
| **Strong** | 4.86 | 108.515 | 1M+ | **4.3** | 42.7K | 2026-08-12 |
| **Fitbod** | 4.80 | 283.628 | 1M+ | 4.5 | 31K | 2026-09-08 |
| **Ladder** | 4.95 | 191.593 | yok/bulunamadı | — | — | 2026-09-04 |
| **Nike Training Club** | 4.84 | 281.311 | 10M+ | 4.3 | 373K | 2026-05-19 |
| **Freeletics** | 4.63 | 22.248 | 10M+ | 4.2 | 260K | 2026-09-07 |
| **JEFIT** | 4.76 | 46.875 | 5M+ | 4.4 | 89.8K | 2026-09-03 |
| **Liftoff** (GymBros Inc.) | 4.83 | 94.185 | 1M+ | 4.7 | 84.7K | 2026-09-08 |
| **Gymshark Training** | 4.84 | 15.105 | *kaldırıldı* | — | — | **2025-06-25 (donduruldu)** |
| **Centr** | 4.75 | 21.266 | 1M+ | 4.4 | 17.3K | 2026-08-31 |
| **Peloton Strength+** | 4.77 | 17.039 | bulunamadı | — | — | 2026-05-07 |
| **Boostcamp** | 4.84 | 9.996 | 500K+ | 4.7 | 13K | 2026-09-05 |
| **Caliber** | 4.84 | 5.919 | 500K+ | 4.6 | 4.07K | 2026-09-08 |
| **Setgraph** | 4.71 | 6.060 | 50K+ | **4.0** | 347 | 2026-08-18 |
| **JuggernautAI** | 4.84 | 5.654 | 100K+ | 4.6 | 2.62K | 2026-09-03 |
| **MacroFactor Workouts** | 4.84 | 4.385 | (Ocak 2026 lansmanı) | — | — | 2026-09-03 |
| **Stronger by the Day** | 4.80 | 3.578 | 10K+ | 4.4 | 1.29K | 2026-07-27 |
| **StrengthLog** | 4.86 | 3.576 | 100K+ | 4.7 | 11.6K | 2026-05-04 |
| **Gravitus** | 4.83 | 3.272 | bulunamadı* | — | — | 2026-09-01 |
| **Alpha Progression** | 4.91 | 2.142 | 1M+ | 4.8 | 21K | 2026-09-02 |
| **Tonal** (companion) | 4.89 | 10.618 | 50K+ | 4.9 | 1.55K | 2026-08-11 |
| **Liftin'** | 4.74 | 745 | yok (iOS-only) | — | — | 2026-07-29 |
| **Dr. Muscle** | **4.48** | 382 | 50K+ | 4.2 | 540 | 2026-09-01 |
| **RP Hypertrophy** | **4.30** | **226** | **10K+** | 4.3 | **137** | 2026-08-31 |
| **Progression** (M. Pietrowski) | 4.47 | 160 | 100K+ | 4.7 | 4.04K | 2026-09-05 |

\* Gravitus Android paket adı doğrulanamadı; kendi sitesi 300K+ lifter, 10M+ workout diyor.

**Bu tablodan çıkan tek en çarpıcı gerçek:** RP Hypertrophy — sektörün en yüksek sesli "bilim tabanlı" markası — App Store'da **226 oy** ve **4.30 puan** ile Tier 1'in en küçük ve en düşük puanlı ürünü. Marka gürültüsü ≠ kullanıcı tabanı.

Kaynaklar: iTunes Lookup/Search API (`https://itunes.apple.com/lookup?id=...&country=us`), Google Play ürün sayfaları (`https://play.google.com/store/apps/details?id=...&hl=en_US&gl=US`), 2026-09-08.

---

## 2. Fiyat tablosu 2026 (USD)

| Uygulama | Aylık | Yıllık | Lifetime | Ücretsiz katman sınırı | Kaynak |
| --- | --- | --- | --- | --- | --- |
| Hevy Pro | $2.99 (yeni: $3.99) | $23.99 | **$74.99** | 4 routine, 7 custom exercise, 3 ay grafik geçmişi; **log sınırsız** | App Store IAP + [sensai](https://www.sensai.fit/blog/hevy-review-2026) |
| Strong PRO | $4.99 (bir kaynak $9.99 diyor) | $29.99 | $99.99 | 3 custom routine; log sınırsız; Watch/superset/plate calc Pro | [sensai](https://www.sensai.fit/blog/hevy-vs-strong-2026), [repreturn](https://repreturn.com/strong-app-review/) — **çelişkili** |
| Fitbod | $15.99 (legacy $12.99) | $95.99 (legacy $79.99) | promo | **Kalıcı ücretsiz katman yok** — 7 gün / 3 workout deneme | App Store IAP + [sensai](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison) |
| **RP Hypertrophy** | **$34.99** | **$299.99** (indirimde $224.99) | — | Yok | App Store IAP, [rpstrength.com](https://rpstrength.com/pages/hypertrophy-app) |
| **JuggernautAI** | **$34.99** | ~$350 | — | 2 hafta deneme | App Store IAP, [Garage Gym Reviews](https://www.garagegymreviews.com/juggernautai-review) |
| **Dr. Muscle** | **$48.99** | **$399.99** | — | Deneme (kart gerekmiyor) | App Store açıklaması |
| Alpha Progression | $12.99 | $79.99 | — | 14 gün deneme | App Store IAP |
| Boostcamp Pro | $14.99 | $59.99 | — | **11.000+ program ücretsiz**, temel takip ücretsiz | [BarBend](https://barbend.com/boostcamp-review/) |
| JEFIT Elite | $12.99 | $69.99 (ilk yıl $52.49) | — | 1.400+ egzersiz, log, custom routine ücretsiz (reklamlı) | [jefit.com/elite](https://www.jefit.com/elite) |
| Setgraph Pro | $4.99 | $29.99 | $199.99 | 5 workout deneme | App Store IAP |
| **MacroFactor Workouts** | $11.99 | $71.99 | — | 7 gün deneme | App Store IAP |
| **MacroFactor bundle (beslenme+antrenman)** | — | **$89.99/yıl** | — | 7 gün deneme | App Store IAP |
| StrengthLog | uygulama içi | uygulama içi | — | **Sınırsız log, reklamsız, 500+ egzersiz, program kütüphanesi** | [help.strengthlog.com](https://help.strengthlog.com/help-article/strengthlog-premium/) — rakam bulunamadı |
| Liftin' Unlimited | — | $24.99 | — | 5 workout/ay | [liftinapp.co](https://www.liftinapp.co/) |
| Gravitus | bulunamadı | bulunamadı | — | "Free to start" | [gravitus.com](https://gravitus.com/) |
| Progression Pro | bulunamadı | bulunamadı | — | İlk birkaç workout ücretsiz | App Store açıklaması |
| Stronger by the Day | $16.99 | ~$99 ($8.33/ay) | — | 7 gün deneme | [strongerbytheday.app](https://strongerbytheday.app/) |
| **Caliber** | Plus ~$6/ay ($72/yıl); Premium coaching **$200/ay** | | | **Ücretsiz sürüm: sınırsız workout, 800+ egzersiz, reklamsız** | [BarBend](https://barbend.com/caliber-fitness-app-review/) |
| **Ladder** | **PRO $29.99 / PRO+ $34.99 / ELITE $44.99 / ELITE+ $49.99** | $179.99 / $329.99 / $449.99 / $479.99 | — | 7 gün deneme, kart alınmıyor | App Store IAP |
| Freeletics | — | $94.99 | $549.99 | Demo düzeyi (34 sabit workout) | [sensai](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison) |
| Centr | bulunamadı | bulunamadı | — | 7 gün deneme | App Store |
| Peloton Strength+ | $9.99 | — | — | All-Access / App+ üyelere **ücretsiz** | [PeloBuddy](https://www.pelobuddy.com/strength-plus-available-cost/) |
| Tonal 2 | $59.95/ay üyelik (12 ay min.) | — | Donanım **$4.295** | Yok | [tonal.com](https://tonal.com/products/tonal-2), [cybernews](https://cybernews.com/reviews/tonal-2-review/) |
| Tempo Move | ~$39/ay | — | Donanım ~$495 | Yok | [Garage Gym Reviews](https://www.garagegymreviews.com/tonal-vs-tempo) |
| Gymshark Training | **Ücretsiz** | — | — | Tamamen ücretsiz — **ama ürün donduruldu** | [Gymshark Support](https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app) |
| Nike Training Club | **Ücretsiz** | — | — | 2020'den beri tüm premium içerik ücretsiz | [Garage Gym Reviews](https://www.garagegymreviews.com/nike-training-club-review) |

**Fiyat dağılımının şekli:** log tutucular $2.99–$4.99/ay bandında ölmüş durumda (Hevy fiyatı dibe çekti). Programlama zekası iddia eden her şey $12.99–$34.99. İnsan koçluğu $200+/ay. **$5 ile $13 arasında boşluk var.**

---

## 3. TIER 1 — DERİN ANALİZ

### 3.1 Hevy

**1. Çekirdek iş:** Hızlı set logging + sosyal feed; 2026'da üstüne algoritmik program üretici (Trainer) eklendi.

**2. Feature listesi:** warm-up/drop set/superset set tipleri, otomatik rest timer, previous workout değerleri önceden dolu, plate calculator, warm-up calculator, RPE (opsiyonel, ayardan açılıyor), 400+ egzersiz + video, custom exercise, folder/routine kütüphanesi, Apple Watch canlı sync, Live Activity, PR bildirimi, body measurements, progress photos, monthly report, Year in Review, muscle distribution chart, **sets per muscle group per week (hafta/ay/yıl filtreli, kas bazlı filtre)**, leaderboard, social feed, athlete profilleri, Strava tam detay sync (Haziran 2026'dan beri egzersiz/set/rep/ağırlık gönderiyor), Hevy Coach (PT tarafı, $25/ay'dan), **public API + API key**, HevyGPT (ChatGPT custom GPT), Hevy Trainer.
Kaynak: [hevyapp.com/features](https://www.hevyapp.com/features/), [sets-per-muscle-group](https://www.hevyapp.com/features/sets-per-muscle-group-per-week/), [Temmuz 2026 community update](https://www.hevyapp.com/community-updates/july-26/)

**3. Fiyat:** $2.99–3.99/ay · $23.99/yıl · **$74.99 lifetime**. Ücretsiz: sınırsız log, 4 routine, 7 custom exercise, 3 ay grafik.

**4. Ölçek:** Kendi beyanı **16M+ kullanıcı** ([hevyapp.com/about-us](https://www.hevyapp.com/about-us/)). iOS 91.103 oy / 4.92; Android 5M+ indirme, 262K oy / 4.9. Kurucular Guillem Ros (CEO, Barselona) ve Desmond McNamee (CTO), 2019'da kuruldu, remote ekip. 2022'de ~$20K/ay gelir, 2022 yılı ~$2M ARR hedefi ([OBJ](https://obj.ca/fitness-app-entrepreneur-pumped-by-hevys-progress-to-2m-in-annual-revenue/) — sayfa 403 verdi, ikincil alıntı; [BoringCashCow](https://boringcashcow.com/view/workout-tracking-app-makes-40k-a-month) $40K/ay diyor, 2023 verisi). **2026 geliri bulunamadı** — Sensor Tower tahmini olarak "Şubat 2026: 400K indirme, $600K gelir" alıntısı dolaşıyor ama doğrulanamadı. Dış yatırım kanıtı bulunamadı; bootstrapped görünüyor.

**5. Programlama zekası:** 2019–2025 arası **sıfır** — bilinçli olarak "hands-off, biz sana nasıl antrenman yapacağını söylemeyiz" duruşu vardı. **18 Şubat 2026'da Hevy Trainer** çıktı (Pro dahil). Hevy açıkça "AI değil, algoritma" diyor. Girdiler: deneyim, hedef, ekipman, frekans, süre, kas önceliği. Çıktı: split + egzersiz + set + rep aralığı + otomatik rest süreleri. Progresyon kuralı **basit ve katı**: *"Trainer ağırlığı artırması için, o ağırlıkta tüm prescribed setlerde rep aralığının üst sınırını vurman gerekiyor."* RPE opsiyonel input. Deload / MEV-MRV / periyodizasyon mantığı **dokümante edilmemiş** — yok görünüyor. 2026 ortasında eklenenler: tek seferlik veya kalıcı egzersiz değişimi, tam program görünümü, cardio dahil etme, kişisel rest timer; yolda: **injury management**, workout sıralama.
Kaynak: [hevyapp.com/features/workout-plan-generator](https://www.hevyapp.com/features/workout-plan-generator/)

**6. Veri girişi UX'i:** Sektör standardını Hevy koydu. Önceki seansın değerleri satırda hazır → değişmediyse **tek tap (checkmark)** ile set kapanıyor, rest timer otomatik başlıyor. Ağırlık/rep değiştireceksen +2 tap. **Sesli giriş yok. Serbest metin girişi yok.**

**7. AI/LLM kullanımı:** Üç katman, üçü de farklı dürüstlük seviyesinde:
- **Hevy Trainer** — AI değil, kural tabanlı algoritma. Hevy bunu kendisi söylüyor. Dürüst.
- **HevyGPT** — ChatGPT içinde çalışan custom GPT; Hevy geçmişini okuyup program üretip routine olarak geri yazabiliyor. Ücretsiz hesapla da çalışıyor (4 routine sınırına tabi). Android ChatGPT uygulamasında çalışmıyor, web gerekiyor.
- **Public API + MCP** — `api.hevyapp.com` public API key veriyor. Topluluk MCP sunucuları (chrisdoc/hevy-mcp, 22 tool; jmilinovich/claude-hevy-coach) Claude/Cursor/Codex'in workout'ları **okumasını, analiz etmesini, routine yazmasını** sağlıyor. Uygulama v3.1.12 sürüm notunda "ChatGPT ve Claude ile doğrudan entegrasyon" yazıyor (App Store, ~2026-09-03).
Kaynak: [chrisdoc/hevy-mcp README](https://github.com/chrisdoc/hevy-mcp), [api.hevyapp.com/docs](https://api.hevyapp.com/docs/)

**8. Eleştiriler:** Trainer ücretli. Üretilen planlar "isimli koç programı" değil, jenerik. Tek/çift ağırlık (dumbbell) logging belirsizliği analitikleri ve leaderboard'ları bozuyor — Hevy bunu açıkça "üzerinde çalışıyoruz" diyor. Otoregülasyon yok: RIR/RPE topluyor ama program buna göre değişmiyor. Sosyal feed bazı kullanıcılar için gürültü.

**Hevy neden bu kadar popüler oldu? (özel soru cevabı)**
Dört sebep, sırayla:
1. **Ücretsiz katman gerçekten kullanılabilir.** Sınırsız log. Strong'un 3-routine duvarı PPL yapan herkesi çarpıyor; Hevy'nin 4-routine duvarı bir adım geride ama yıllık $23.99 / lifetime $74.99 fiyatı rakiplerinin yarısı.
2. **Logging hızı + sosyal katman birlikte.** 2019'da hiçbir tracker'da arkadaş feed'i yoktu. Sosyal, retention'ı log kalitesinden bağımsız olarak tutuyor.
3. **Ocak 2022 patlaması.** Google Play'de ilk 5'e girdiler; ocak fitness sezonuyla birleşince iş modelini değiştiren bir kullanıcı akını geldi.
4. **SEO makinesi.** hevyapp.com Eylül 2023'te 725.6K ziyaret, %77'si organik arama. Egzersiz/kas/ekipman sitemap'leri yüzlerce sayfa üretiyor. Rakiplerinin hiçbirinde bu ölçekte içerik yok.

Yani: "sadece log tutuyor" doğru değil — **dağıtım kanalı (SEO) + fiyat + sosyal retention** üçlüsünü kazandı, ürün özelliğiyle değil.

---

### 3.2 Strong

**1. Çekirdek iş:** En hızlı, en sade set logger. Programlama yok, koçluk yok.

**2. Feature:** sınırsız log, 450+ egzersiz, otomatik rest timer, previous performance overlay, plate calculator, 1RM calculator, superset/dropset, RPE logging, 5/3/1 gibi periyodizasyon desteği routine builder'da, egzersiz bazlı progresyon grafikleri, kas grubuna göre volume analitiği (Pro), CSV export (Pro), Apple Health/Watch (Pro).

**3. Fiyat:** PRO $4.99/ay · $29.99/yıl · $99.99 lifetime. **Bir kaynak $9.99/ay diyor — çelişki var, doğrulanmadı.** Ücretsiz: sınırsız log ama **3 custom routine**.

**4. Ölçek:** Kendi sitesi aynı sayfada hem "3M+" hem "5M+ kullanıcı" yazıyor (kopya güncellemesi yarım kalmış). 30M+ workout, 10M+ antrenman saati, 100+ ülke. App Store 108.515 oy / 4.86 (küresel 125K review). Sahip: **Strong Fitness PTE Limited (Singapur)**. Yatırım bilgisi bulunamadı.
Kaynak: [strong.app](https://www.strong.app/)

**5. Programlama zekası: YOK.** Kayıt aracı. Progresyonu kullanıcı yönetiyor.

**6. Veri girişi UX'i:** Sektörün en hızlısı olarak kabul ediliyor. Previous set overlay + tek tap tamamla. Sesli/serbest metin **yok**.

**7. AI/LLM:** Yok. Pazarlamada AI iddiası da yok — bu bir dürüstlük artısı.

**8. Eleştiriler:** **Android sürümü çürüyor** — iOS 4.86, Android **4.3**. Bu 0.56'lık fark tablodaki en büyük platform uçurumu. Geliştirme hızı yavaş. Programlama/koçluk yok. WHOOP/Oura/HRV entegrasyonu yok. Cardio yok. "$4.99–9.99/ay bir log aracı için pahalı" — çünkü Hevy $2.99.

---

### 3.3 Fitbod

**1. Çekirdek iş:** Her seansı sıfırdan üreten algoritmik workout generator; kas iyileşme modeli merkezde.

**2. Feature:** 800+ egzersiz, ekipman profilleri, ev/gym, muscle recovery ekranı (Body tab — manuel override edilebilir), RIR logging, "Max Effort Day" AMRAP setleri, 1RM tahmini, Apple Health/Watch/Strava/Fitbit, workout kaydetme/özelleştirme.

**3. Fiyat:** $15.99/ay · $95.99/yıl (legacy $12.99/$79.99). **Kalıcı ücretsiz katman yok.**

**4. Ölçek:** 15M+ indirme, 2.5M+ aktif kullanıcı iddiası (ikincil). iOS **283.628 oy** — Tier 1'in en büyük iOS oy tabanı. Android 1M+/31K. Toplam yatırım **$5.7M** (AfterWork Ventures, Horseplay, Realm Capital, Sterling Road + 15 yatırımcı — PitchBook/Tracxn üzerinden ikincil). Fitbod kendi blogunda "**400 milyon+ loglanmış workout**" diyor.

**5. Programlama zekası — algoritmanın açıklaması (özel soru cevabı):**
Fitbod'un motoru bir **Exercise Selector**: 800+ egzersizin her birini beş değişkenle puanlıyor.
1. **Muscle recovery status** — her kas grubuna 0–100% recovery yüzdesi atanıyor, son loglanan antrenmanlara göre. Son 48–72 saatte ağır çalışılmamış kaslar önceliklendiriliyor. Kullanıcı Body tab'dan manuel düzeltebiliyor (loglanmayan yürüyüş vb. için).
2. **Goal/experience uygunluğu** — her egzersiz Fitbod'un kendi PT'leri tarafından hedef ve seviye başına puanlanmış.
3. **Kullanıcı feedback geçmişi** — hangi egzersizi eklediğin, sildiğin, favorilediğin.
4. **Split uyumu** — PPL vb. yapıyı koruyor.
5. **Ekipman.**

Set/rep/ağırlık: hedefe göre evidence-based bantlar (strength 1–6 rep @ ~%85–100 1RM, 3–5 dk rest; hypertrophy 6–12 rep, **haftada kas başına 10–20 working set** hedefi). Ağırlık **tahmini 1RM'den** türetiliyor — Epley gibi denklemlerle loglanan setlerden hesaplanıp zamanla rafine ediliyor; **yeni bir egzersizde başlangıç ağırlığı milyonlarca benzer kullanıcının agregasyonundan seed ediliyor.** Ağır/hafif günler arasında salınım yapıyor (accommodation'ı azaltmak için).
**RIR gerçekten kullanılıyor:** her setten sonra kaç rep kaldığını loglayabiliyorsun; Fitbod bunu failure'a yakınlığı ölçmek için sinyal olarak alıyor. Ayrıca birkaç workout'ta bir bir-iki egzersiz "Max Effort Day" işaretleniyor ve son sette AMRAP isteniyor — bu doğrudan performans sinyali.
Kaynak: [fitbod.me/blog/fitbod-algorithm](https://fitbod.me/blog/fitbod-algorithm/), [muscle-recovery](https://fitbod.me/blog/muscle-recovery/)

**6. Veri girişi UX'i:** Standart tap tabanlı. Sesli/serbest metin yok.

**7. AI/LLM:** "AI trainer" diye pazarlanıyor. Gerçekte: **büyük veri üzerinde kural + istatistik tabanlı bir öneri motoru**, LLM değil. Pazarlama ile teknik gerçek arasındaki mesafe Tier 1'in en büyüğü.

**8. Eleştiriler (özel soru cevabı):**
- **Gerçek progressive overload'ı uygulayamıyor** ve ağırlık önerileri sık sık yanlış (özellikle yeni egzersizlerde, çünkü seed agregasyondan geliyor).
- Workout'ları "geri dönüştürüyor" — küçük varyasyonlarla aynı şeyi veriyor; ya da tersi: her seans farklı egzersiz vererek **aynı harekette progresyon takibini imkânsızlaştırıyor.** Hipertrofi için en ciddi yapısal eleştiri bu.
- Workout başladıktan sonra uygulamanın geri kalanında gezinemiyorsun (App Store negatif review).
- PR'ları tek yerden görecek sekme yok.
- Kalıcı ücretsiz katman yok; 2026 zammı ($12.99 → $15.99) kullanıcıları rahatsız etti.
Kaynak: App Store review'ları; [Dr. Muscle review](https://dr-muscle.com/fitbod-workout-app-review/) (rakip — taraflı, ama teknik eleştirileri diğer kaynaklarla örtüşüyor)

---

### 3.4 JuggernautAI

**1. Çekirdek iş:** Powerlifting/powerbuilding için otoregüle edilen periyodizasyon motoru. Chad Wesley Smith'in koçluk sisteminin kodlanmış hâli.

**2. Feature:** hedef (Powerlifting / Powerbuilding), deneyim ve PR girdileriyle blok periyodizasyonu; günlük **Readiness Rating System**; set içi RPE/RIR; volume/frekans/egzersiz seçimi faz bazında değişiyor; meet prep desteği.

**3. Fiyat:** $34.99/ay, ~$350/yıl, 2 hafta ücretsiz deneme (bazı promo kodlarıyla $31.49).

**4. Ölçek:** iOS 5.654 oy / 4.84; Android 100K+ indirme, 2.62K oy / 4.6. Geliştirici: Juggernaut Apps, LLC (Chad Wesley Smith + Tim Arnold). Gelir/MAU **bulunamadı**.

**5. "Gerçekten AI mı, kural tabanlı motor mu?" (özel soru cevabı — net):**
**Kural tabanlı bir expert system.** Şirket bunu kendisi "Expert System AI" diye adlandırıyor — ve "expert system" terimi zaten 1970'ler yapay zekâ literatüründen gelen, **if-then kural tabanı + inference engine** demek. Neural network, makine öğrenmesi, LLM olduğuna dair hiçbir kanıt veya iddia yok.

Nasıl çalışıyor:
- **Onboarding:** kilo, antrenman geçmişi, seviye, squat/bench/deadlift PR'ları, hedef, haftalık frekans.
- **Blok periyodizasyonu:** program fazlara bölünüyor (hacim → yoğunluk → peaking). Faz, volume/intensity/egzersiz seçimini belirliyor. Bu **JTS'in yayınlanmış metodolojisinin** kodlanmış hâli — Juggernaut Method.
- **Günlük readiness check-in:** motivasyon (1–5), uyku kalitesi, kalori alımı, kas grubu bazında soreness/fatigue. Bu skor **seans öncesi** yükleri ve şema seçimini kaydırıyor.
- **Set içi otoregülasyon:** RPE/RIR giriyorsun. **RPE 10'a erken ulaşırsan uygulama kalan setleri iptal edebiliyor.** Bu gerçek autoregulation — literatürdeki RPE-based load prescription'ın uygulanması.
- **Haftalık volume feedback:** kullanıcı geri bildirimi bir sonraki haftanın hacmini ayarlıyor.
- Zamanla "kişiselleşiyor" — ama bu, veriden model öğrenmesi değil; kural tabanının daha çok gözlemle daha dar parametrelere oturması.
Kaynak: [Garage Gym Reviews](https://www.garagegymreviews.com/juggernautai-review), App Store açıklaması

**6. Veri girişi UX'i:** Tap tabanlı; RPE/RIR girişi zorunlu akışta. Sesli/serbest metin yok. Dashboard "başta ezici" geliyor.

**7. AI/LLM:** LLM yok. "AI" ismin içinde ama teknik olarak expert system. **Yine de gerçek otoregülasyon yapan az sayıda üründen biri** — pazarlama abartılı ama ürün boş değil.

**8. Eleştiriler:** SBD dışında bir hedefin varsa $35/ay savunulamaz. Cardio yok. Squat rack + bench + barbell şart. Bug'lar: warm-up'larda ağırlık limitini yok sayıyor, eksik feature'lar. "Gerçek bir koçla aynı şey değil."

---

### 3.5 RP Hypertrophy (Renaissance Periodization)

**1. Çekirdek iş:** Mike Israetel'in volume landmark modelini (MEV/MAV/MRV) mesocycle bazında otomatikleştiren hipertrofi uygulaması.

**2. Feature:** 45+ (site 100+ diyor) hazır plan, bodypart specialization programları, **Meso Builder** (özel mezosikl kurucu), 250+ teknik videosu, genişleyen egzersiz kütüphanesi, seans sonrası feedback anketleri, otomatik set/ağırlık/rep ayarı.

**3. Fiyat:** $34.99/ay · $299.99/yıl (indirimde $24.99/ay · $224.99/yıl). Ücretsiz katman yok, ücretsiz deneme yok.

**4. Ölçek:** **iOS 226 oy / 4.30 · Android 10K+ indirme, 137 oy / 4.3.** Site "on binlerce kişi" diyor, sayı vermiyor. Gelir/MAU bulunamadı. Sahip: RP Strength, LLC. Uygulama boyutu 4.6 MB — çünkü **web wrapper**; içerik sunucudan geliyor.

**5. Volume landmark mantığı nasıl uygulanıyor (özel soru cevabı):**

Model:
- **MV** (Maintenance Volume) — kası korur
- **MEV** (Minimum Effective Volume) — büyüme başlatan en düşük haftalık hard set sayısı
- **MAV** (Maximum Adaptive Volume) — fatigue birimi başına en çok hipertrofi veren bant
- **MRV** (Maximum Recoverable Volume) — bunun üstünde fatigue büyümeyi geçer

Mezosikl akışı:
1. Blok **MEV'de** başlar.
2. Recovery yolundaysa **kas başına haftada tam 1 set eklenir.**
3. Soreness / performans / pump'tan biri takılırsa hacim bir hafta **sabit tutulur.**
4. Hâlâ ağrıyan bir kasa **asla set eklenmez.**
5. RIR mezosikl boyunca düşer: **hafta 1'de ~3 RIR → son accumulation haftasında 0–1 RIR.**
6. 4–6 hafta sonra **deload.**
7. Kural: **aynı anda iki bozulmuş sinyal (kaçırılan rep + kalıcı soreness + kötü pump) → MRV'desin veya geçtin.**

**Feedback döngüsü — sorulan 4 şey:** *pump, soreness (disruption), joint pain, performance/workload.* Bunlar seans içinde/sonunda soruluyor ve **bir sonraki haftanın set sayısını** belirliyor. RP'nin resmi sayfası "pump, soreness ve workload" üçlüsünü söylüyor; bağımsız kaynaklar joint pain'i de dördüncü input olarak sayıyor.
Kaynak: [rpstrength.com/pages/hypertrophy-app](https://rpstrength.com/pages/hypertrophy-app), [rpstrength.com volume landmarks](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth), [Arvo RP metodu özeti](https://arvo.guru/resources/methods/rp-training)

**Kritik nokta:** Cevaptan set sayısına giden **açık bir eşleme tablosu hiçbir kamuya açık kaynakta yok.** "Add / hold / deload" üç yönlü karar dokümante, ama "pump=düşük + soreness=orta → +2 set" gibi kesin kural yayınlanmamış. Yani motor kapalı kutu — ve bu, ürünün en büyük yapısal zayıflığı, çünkü hedef kitlesi tam olarak "nasıl çalıştığını bilmek isteyen" kişiler.

**6. Veri girişi UX'i:** Web tabanlı; **offline çalışmıyor** — sinyalin zayıf olduğu spor salonlarında set kaydedememe şikâyeti yaygın. Feedback anketleri seans akışını uzatıyor. Sesli/serbest metin yok.

**7. AI/LLM:** **Yok.** RP hiç "AI" iddiası da etmiyor — kural tabanlı otoregülasyon. Dürüst.

**8. Kullanıcı memnuniyeti ve eleştiriler (özel soru cevabı):**
Memnuniyet: **4.30 / 226 oy (iOS)** — Tier 1'in en düşüğü. Sadık çekirdek çok memnun ("son iki yıldaki kazanım önceki 10 yılı geçti" tipi review'lar var).
Eleştiriler:
- **Fiyat.** $34.99/ay, ücretsiz deneme yok. Kullanıcıların en çok söylediği şey.
- **Offline yok.** Web wrapper olması yüzünden salonda çuvallıyor.
- **Arayüz eski**, yeni nesil uygulamaların yanında hantal.
- **Yeni başlayan dostu değil** — mezosikl, MEV, autoregulation kavramlarını bilmen gerekiyor.
- **Beslenme yok** (RP'nin ayrı bir diet uygulaması var — `com.rp.rpdiet`, ayrı abonelik).
- **Mezosikl başlangıç tarihi değiştirilemiyor**, cardio takibi yok.
- Progresyon metodolojisinin ampirik değil "teorik" olduğu eleştirisi (rakip kaynaktan, taraflı).

---

### 3.6 Boostcamp

**1. Çekirdek iş:** Ücretsiz, devasa hazır program kütüphanesi + solid tracker. "İyi programı bul, uygula" modeli.

**2. Feature:** 11.000+ program (130+ koç tasarımı, 10.000+ topluluk), offline mod, plate calculator, rest timer, effort logging, set etiketleme (warm-up / working / failure), **per-muscle volume heatmap** (Pro), gelişmiş analitik (Pro), egzersiz swap (Pro).

**3. Fiyat:** Kütüphane **ücretsiz**. Pro $14.99/ay · $59.99/yıl, 7 gün deneme.

**4. Ölçek:** iOS 9.996 oy / 4.84; Android 500K+ indirme, 13K oy / 4.7. Geliştirici BPM Health Co. Gelir/MAU bulunamadı.

**5. Programlama zekası:** **Şablon.** Adaptive/AI değil. Ama program içi **otomatik ağırlık progresyonu var** — loglanan performansa göre bir sonraki seansın ağırlığını hesaplıyor. Yani "5/3/1'i takip et, uygulama matematiği yapsın" katmanı. Otoregülasyon yok, MEV/MRV yok.

**6. Veri girişi UX'i:** Standart tap. Sesli/serbest metin yok.

**7. AI/LLM:** Yok, iddia da yok.

**8. Eleştiriler:** Topluluk programlarının kalitesi çok değişken. Ücretsiz planda kişiselleştirme sınırlı. Custom program kurmanın öğrenme eğrisi dik. Cardio/mobility yok. Canlı destek yok.
Kaynak: [BarBend](https://barbend.com/boostcamp-review/), [Garage Gym Reviews](https://www.garagegymreviews.com/boostcamp-review)

---

### 3.7 Alpha Progression

**1. Çekirdek iş:** Plan üretici + **her set için ayrı ağırlık/rep önerisi** veren Alman hipertrofi uygulaması.

**2. Feature:** plan generator (hedef, gün sayısı, süre, kas önceliği, ekipman → PPL/Upper-Lower/Full Body), tek seferlik workout generator, **795 egzersiz — hepsi gerçek salonda sertifikalı eğitmenlerle çekilmiş video** (stok görüntü/AI animasyon yok, bunu ayrıca pazarlıyorlar), setup/execution/common mistakes anlatımı, **iki tap'te weight+reps+RIR girişi**, workout sonu rekor özeti (weight, reps, volume, tahmini 1RM ve 10RM, kas grubu bazında en iyi), strength/volume/sets-per-muscle/workouts-per-week/bodyweight/measurement grafikleri, streak ve achievement sistemi, **CSV export**.

**3. Fiyat:** $12.99/ay · $79.99/yıl, 14 gün deneme. (Legacy $24.99/$99.99.)

**4. Ölçek:** iOS 2.142 oy / **4.91** — Tier 1'in en yüksek puanı. Android 1M+ indirme, 21K oy / 4.8. Kendi beyanı: **40K+ toplam oy, 25M+ loglanmış workout**, App Store'da iki kez "App of the Day". Gelir/MAU bulunamadı.
Kaynak: [alphaprogression.com](https://alphaprogression.com/en)

**5. Programlama zekası:** Şablon **değil**, tam autoregulation da **değil** — arada. Plan generator meta-analiz temelli bir kural setiyle yapıyı kuruyor; sonra algoritma **her set için** senin gerçek geçmişine bakarak ağırlık + rep + intensity hedefi veriyor. Yani progresyon egzersiz-set granülaritesinde. RIR toplanıyor. MEV/MAV/MRV dili kullanılmıyor; sets-per-muscle grafiği var ama landmark hedefi yok. Deload mantığı **bulunamadı**.

**6. Veri girişi UX'i:** **İki tap'te weight + reps + RIR** — RIR'ı bu hızda alan tek uygulama. Önceki setler ve notlar ekranda.

**7. AI/LLM:** "Algoritma" diyorlar, AI demiyorlar. Dürüst.

**8. Eleştiriler:** Neredeyse tüm değerli özellikler Pro arkasında. Sosyal yok. İngilizce içerik Almanca kadar olgun değil (azalan bir sorun). Salt yazılım — insan geri bildirimi yok.

---

### 3.8 Dr. Muscle

**1. Çekirdek iş:** "Cebindeki AI personal trainer" — her set sonrası programı yeniden hesaplayan otomasyon.

**2. Feature:** 34+ workout, 500+ egzersiz, ev/gym/bodyweight, **otomatik deload**, **rest-pause setleri**, **Daily Undulating Periodization (DUP)**, RIR tabanlı RPE, "ve 18 tane daha" metod, custom program yükleme (AI kendi mantığını senin programına da uyguluyor), tam geçmiş, her egzersiz için grafik + ortalama progresyon grafiği, Apple Health, uygulama içi chat (insan koç + topluluk), **AI chat** (sürüm notlarında geçiyor), Apple Watch.

**3. Fiyat:** **$48.99/ay · $399.99/yıl.** Sektörün en pahalı yazılım-only ürünü. Ücretsiz deneme kart istemiyor.

**4. Ölçek:** iOS **382 oy / 4.48** · Android 50K+ indirme, 540 oy / 4.2. Kurucu Dr. Carl Juneau (PhD, egzersiz bilimci). Şirket bir basın bültenine göre geliştiricileri AI ile değiştirerek yılda $125.000 tasarruf ettiğini duyurdu ([Yahoo Finance](https://finance.yahoo.com/news/ai-workout-app-dr-muscle-150000883.html)). **Dr. Muscle X** Ocak 2026'da progressive web app olarak early access'e çıktı (`x.dr-muscle.com`).

**5. Programlama zekası:** Tier 1 içinde **en agresif otomasyon**. Tek algoritma DUP etrafında kurulu: her set tamamlandığında program güncelleniyor, RPE/RIR'a göre yük ayarlanıyor, deload haftaları otomatik programlanıyor, ekipmana göre egzersiz ikamesi yapıyor. MEV/MAV/MRV dili yok.

**6. Veri girişi UX'i:** Tap tabanlı. **AI chat var** ama bunun set logging için mi yoksa soru-cevap için mi olduğu doğrulanamadı.

**7. AI/LLM:** "Imagine ChatGPT, but for fitness" diye pazarlanıyor. Programlama motoru **kural tabanlı DUP** — LLM değil. Ancak uygulamada ayrı bir **AI chat** bileşeni var (sürüm notu: "Fixed: AI chat not responding", 2026-09-08) — bu muhtemelen gerçek LLM.

**8. Eleştiriler:** Fiyat/ölçek uçurumu en büyük kırmızı bayrak — $48.99/ay isteyip 382 oy toplamış. Puanı Tier 1'in en düşük ikincisi (4.48). Rakiplerin pazarlama içeriğinde sık geçen bir eleştiri: "59% daha hızlı" iddiasının kaynağı belirsiz. Tek algoritma (DUP) her hedefe uymuyor.

---

## 4. TIER 2 — ÖZET

| Uygulama | Çekirdek iş | Programlama zekası | 2026 fiyat | Not |
| --- | --- | --- | --- | --- |
| **JEFIT** | Eski nesil devasa tracker + program marketi | "Adaptive Plan": güç ve fatigue analiz edip haftayı kuruyor (Elite); muscle recovery breakdown | $12.99/ay, $69.99/yıl; free reklamlı | 20M+ indirme iddiası, 5M+ Play. Eleştiri: son güncellemeler **yavaşlattı ve karmaşıklaştırdı**; eski sade layout kayboldu |
| **StrengthLog** | Ücretsiz katmanı en cömert tracker (İsveç) | Program tanımlı progresyon; Premium'da effort/yüzde tabanlı programlama | Free çok geniş; Premium fiyatı uygulama içi | 2026 v8.0'da **Strength Levels** (en çok loglanan 15 lift üzerinden percentile, Beginner→Elite), Wear OS |
| **Setgraph** | "En hızlı logger" + grafik | AI workout generator (2025'te eklendi); Smart Plates; correlation charts | $4.99/ay, $29.99/yıl, **$199.99 lifetime** | Kendi sitesi 67.000+ lifter, 50M+ set. **Android puanı 4.0** — Tier 2'nin en düşüğü. Crash/blank screen şikâyetleri |
| **Gravitus** | PR avcılığı + progressive overload logger, 2015'ten beri | Progresyon önerisi ("en iyini geçmek için ne gerekiyor"), plate math, auto rest timer | Free to start; ücretli fiyat bulunamadı | 300K+ lifter, 10M+ workout (kendi beyanı). Ücretsiz program kütüphanesi var |
| **Liftin'** | Tasarım odaklı iOS/Watch/Mac tracker | **Otomatik progresyon**: başarıda ağırlık artır, başarısızlıkta azalt, tam özelleştirilebilir | $24.99/**yıl** — en ucuz ücretli | 5x5, Wendler, nSuns hazır. RPE tracking, training max, progress photos. Sadece Apple ekosistemi |
| **Progression** (Martin Pietrowski) | Sade Alman logger, "motivation isn't a training strategy" | Ağırlık artırma zamanı geldiğinde otomatik öneri | Pro fiyatı bulunamadı | iOS'ta zayıf (160 oy/4.47), Android'de güçlü (100K+/4.7) — ters asimetri |
| **Stronger by the Day** | Meg Squats'ın kadınlara yönelik kuvvet programı | "Smart Progress Tracking" bir sonraki workout'u ayarlıyor; Gym/Express/Bodyweight arası tek tap geçiş; 3/4/5 gün frekans değiştirme | $16.99/ay, ~$8.33/ay yıllık | 25.000+ aktif kullanıcı iddiası. Creator-led model |
| **Caliber** | Ücretsiz tracker + isteğe bağlı insan koçluğu | Koç tasarımlı planlar (Plus); Premium'da tam kişiselleştirme | Free (çok geniş); Plus ~$72/yıl; **Premium coaching $200/ay** (bazı paketler 3 ayda $600–$1.400) | **Antrenman + cardio + beslenme + alışkanlık aynı üründe.** Men's Journal 2026 "en iyi ücretsiz workout app" |
| **Ladder** | Takım tabanlı, koç programlı kuvvet + topluluk | Koç yazımı haftalık programlar, adaptive değil | **$29.99–$49.99/ay** (4 kademe) | **$105M+ yatırım** (Point72, ADvantage, General Catalyst). 2024 sonu 150K ücretli üye, %200 büyüme; hedef 400K üye ve **$100M ARR**. iOS 191.593 oy / **4.95** — kategorinin en yüksek puanı |
| **Freeletics** | Bodyweight/HIIT AI coach | Gerçek adaptif: feedback ve performansa göre plan değişiyor | ~$94.99/yıl, $549.99 lifetime | 60M "athlete" iddiası, 54M kullanıcı verisi. **Maksimal kuvvet için yetersiz** — conditioning/hipertrofi ağırlıklı. Android 4.2 |
| **Centr** | Chris Hemsworth'ün all-in-one fitness+beslenme+mindfulness | Hedef/seviyeye göre kişiselleştirilmiş plan; adaptif değil | 7 gün deneme; fiyat doğrulanamadı | HighPost Capital (Mark Bezos) 2022'de aldı, Inspire Fitness ile birlikte $200M+ değerleme; Hemsworth 2. büyük hissedar. 200K+ abone |
| **Peloton Strength+** | Peloton'un ilk salon/kuvvet uygulaması | **Workout Generator** (kas odağı, süre, ekipman, seviye) + çok haftalık koç programları | $9.99/ay; All-Access/App+ üyelere ücretsiz | Aralık 2024 lansmanı. iOS 17.039 oy / 4.77. Peloton "IQ" ile etkileşmeyen kullanıcılar 6–8 haftada bırakıyor |
| **Tonal / Tonal 2** | Dijital ağırlıklı akıllı ev salonu | **Gerçek donanım otoregülasyonu**: set ortasında direnç değiştiriyor, **Spotter Mode** zorlandığında yükü düşürüp rep tamamlanınca geri veriyor | Donanım **$4.295** + $59.95/ay (12 ay min.); ilk yıl ~$5.509 | Kategorinin tek gerçek closed-loop sistemi — ama fiyat duvarı |
| **Tempo** | Kamera tabanlı form takibi + gerçek serbest ağırlık | Form/rep sayımı; Tonal kadar closed-loop değil | Cihaz ~$495 + ~$39/ay | Tonal'in ucuz alternatifi |
| **Gymshark Training** | Marka içerik uygulaması | Yok (custom builder var) | **Ücretsiz** | **ÖLDÜ:** Temmuz 2026 itibarıyla "iOS & Android için artık hiçbir fix veya yeni feature gelmeyecek", Android'den kaldırıldı. Son iOS güncellemesi 2025-06-25 |
| **Nike Training Club** | Video-led ücretsiz workout kütüphanesi | Yok | **Tamamen ücretsiz** (2020'den beri) | 10M+ Play indirme, iOS 281.311 oy. **Progressive overload ve programlama için 3/5 puan** — kuvvet takibi için ciddi araç değil |

**Tier 2'de gözden kaçan iki oyuncu (araştırma sırasında çıktı, listede yoktu):**
- **Liftoff — Ranked Gym Workouts** (GymBros Inc.): iOS **94.185 oy / 4.83**, Android 1M+ / 84.7K. "3 milyon lifter" iddiası. Gamification (rank, streak, global leaderboard, 600+ egzersizde feedback). Hevy'nin sosyal katmanını **oyuna** çevirmiş. Boostcamp ve Caliber'dan büyük.
- **Lyfta** (Lindberg Development AS): Android 1M+ / 61.7K oy. Sessizce büyüyen bir başka logger.

---

## 5. MacroFactor Workouts — 2026'nın en önemli hamlesi

Ayrı başlık hak ediyor çünkü briefte yoktu ama pazarın şeklini değiştiriyor.

**Kim:** Stronger By Science Technologies (Greg Nuckols / Eric Trexler ekosistemi) — sektörün en yüksek bilimsel kredibilitesine sahip beslenme uygulaması MacroFactor'ün sahibi.

**Ne yaptı:** **12 Ocak 2026'da MacroFactor Workouts'u çıkardı.** 8 ay içinde 4.385 iOS oyu / 4.84 puan, 200K+ indirme.

**Feature:** 900+ egzersiz, **Jeff Nippard'ın çektiği teknik videoları**, Jeff Nippard programlarını içe aktarma, **RIR tracker**, myorep ve partial rep takibi, sağ/sol taraf ayrı ağırlık-rep, smart warm-up planner, gym profilleri (birden çok salon), plate calculator, smart exercise swap, kas bazında volume ve progress grafikleri, **otomatik progresyon** ("ne zaman rep ya da ağırlık ekleyeceğini söyler"), reklamsız + privacy-first (reklam ağı kullanmıyor).

**Fiyat:** Workouts tek başına $11.99/ay · $71.99/yıl. **Beslenme + antrenman bundle: $89.99/yıl.**

**Neden önemli:** Beslenme tarafında zaten en iyi algoritmaya sahip olan taraf (adaptif TDEE tahmini + haftalık check-in) antrenman tarafına girdi. **"Tek sistemde antrenman + beslenme" sorusunun en güçlü cevabı bu — ve $89.99/yıl ile RP'nin sadece antrenman için istediği $299.99'un üçte biri.**
Kaynak: [macrofactorapp.com/workouts](https://macrofactorapp.com/workouts/), App Store IAP

---

## 6. ÖZEL SORULARIN NET CEVAPLARI

### 6.1 Minimalist / "mekanik gerilim, az set, yüksek efor" yaklaşımını hangi uygulama destekliyor?

**Programlama motoruyla aktif olarak destekleyen: neredeyse hiçbiri.**

Durum:
- **RP, Fitbod, JEFIT, Alpha Progression** — hepsi *hacim artırma* varsayımıyla kurulu. RP'nin tüm modeli "MEV'den başla, her hafta set ekle" üzerine. Fitbod'un hipertrofi hedefi **haftada kas başına 10–20 working set** hedefliyor. Bu motorlar 2-set felsefesiyle aktif olarak çelişiyor.
- **Hevy, Strong, StrengthLog, Setgraph, Gravitus, Liftin'** — nötr. Log tutucular sana ne yapacağını söylemiyor, o yüzden 2 set girip çıkabilirsin. Ama **hiçbiri düşük hacimli, yüksek efor progresyonunu ödüllendiren bir görselleştirme sunmuyor** — hepsinin ana metriği total volume (set × rep × kg), yani az set yaparsan grafiğin "kötüleşmiş" görünüyor. Bu, minimalist için psikolojik olarak yanlış geri bildirim.
- **Tek gerçek adres: [One Set To Failure (OSTF)](https://onesettofailure.app/)** — Mentzer/Yates çizgisinde HIT için sıfırdan kurulmuş. "One brutal set · Recovery you can see · **No junk volume**". Kas readiness ısı haritası, lokasyon bazlı egzersiz gridi, plate calculator, "overload trendi hareket etmiyorsa program çalışmıyor" felsefesiyle kurulmuş grafikler, body composition takibi. **Ama: Google Play closed testing'de, App Store'da henüz yok.** Yani ürün olarak pazarda yok sayılır.
- "Iron Logic: Gym Workout & HIT" (App Store, 2026-05-23, **0 oy**) da aynı nişi hedefliyor ama boş.

**Sonuç: bu bir gerçek boşluk.** Kanıt zaten var (1–3 hard set, failure'a yakın, mekanik gerilim odaklı çalışmanın anlamlı hipertrofi ürettiği literatürde kabul görüyor) ama ne bir ürün ne de bir görselleştirme dili bunu destekliyor.

### 6.2 Antrenman + beslenme + uyku/stresi TEK sistemde birleştiren var mı?

**Üçünü birden gerçekten birleştiren yok.** Kademeler:

| Seviye | Kim | Ne birleştiriyor | Eksik |
| --- | --- | --- | --- |
| En yakın (yazılım) | **MacroFactor** (Nutrition + Workouts, $89.99/yıl bundle) | Beslenme algoritması (adaptif TDEE) + antrenman otomatik progresyonu, aynı şirket, aynı bundle | **İki ayrı uygulama.** Uyku/stres yok. Antrenman progresyonu beslenme verisini kullanmıyor (doğrulanamadı ama iddia edilmiyor) |
| Yakın (tek uygulama) | **Caliber** | Resistance training + cardio + **nutrition targets** + habit formation, hepsi tek uygulamada | Uyku/stres yok; beslenme takibi Plus'ta |
| Yakın (tek uygulama) | **Centr** | Antrenman + beslenme (yemek planları) + **mindfulness/meditasyon** | Kuvvet programlaması zayıf, otoregülasyon yok |
| Kısmen | **JuggernautAI** | Antrenmanı **uyku kalitesi + kalori alımı + motivasyon** readiness check-in'iyle ayarlıyor | Beslenmeyi *takip etmiyor*, sadece soruyor. Sadece powerlifting |
| İddia | **Voona** | Antrenman + fotoğraftan (LiDAR ile hacim ölçümü) kalori + **uyku ve kalp atışından recovery** + sesli kontrol, tek uygulama | **ABD App Store'da doğrulanamadı.** "270k+ müşteri" iddiası doğrulanamadı. Ciddiye alınacak kanıt yok |
| Donanım | **Tonal 2 / Whoop / Oura** | Tonal antrenmanı closed-loop yapıyor ama beslenme/uyku ayrı; Whoop/Oura uyku+stres ölçüyor ama kuvvet programlamıyor | Aralarında köprü yok |
| Fiili çözüm | **Apple Health** | Uyku + beslenme + workout + aktivite tek yerde toplanıyor | **Sentez yok** — veri var, karar yok |

**Sonuç:** Modüller ayrı. Kimse "bu hafta 5 saat uyudun ve protein hedefini ıskaladın, o yüzden bugün hacmi %20 kısıyorum" diyen bir sistem kurmamış. **Bu, kategorinin en büyük açık boşluğu.**

### 6.3 Serbest metin / sohbetle antrenman kaydı ("bugün lat pulldown 60 kilo 8 tekrar yaptım") kabul eden var mı?

**Evet, ama hiçbiri ana akım değil.** İki farklı yol:

**A) Sesli/serbest metin doğal dil parse eden niş uygulamalar:**
| Uygulama | Ne yapıyor | Ölçek (2026-09-08) |
| --- | --- | --- |
| **GhostFit** | "225 for 8" → parse. Egzersiz takma adlarını, kısaltmaları anlıyor; tek cümleden birden çok set logluyor | ABD App Store'da doğrulanamadı |
| **Vora: AI Longevity Coach** | Set arası konuşarak log; "That was tough, drop to 115" → RPE loglar + sonraki set önerisini düşürür; "Skip the last set, my shoulder hurts" → seti atlar ve rahatsızlığı recovery takibine not eder; geçmişi sorabiliyorsun. 6 AI koç kişiliği (ElevenLabs sesleri) | iOS **86 oy** / 4.53 |
| **Voona** | "Add 2 kg to my second set", "swap the row for a press", "log 200g of rice" — uygulamanın tamamını sesle sürüyor | Doğrulanamadı |
| **VoiceFitLog, Copper's Corner, RepSnap, CoachMoach** | Benzer sesli logging | Hepsi mikro ölçek |

**B) Gerçekten çalışan yol — Hevy + MCP + Claude/ChatGPT:**
Hevy'nin **public API'si** (API key ile) ve topluluk MCP sunucuları sayesinde Claude'a doğal dille konuşup workout okutabiliyor, analiz ettirebiliyor, **routine yazdırabiliyorsun**. `chrisdoc/hevy-mcp` 22 tool sunuyor (workout, routine, exercise template, body measurement — okuma + yazma; silme yok). Ayrı bir `hevy-cli` de var. `jmilinovich/claude-hevy-coach` doğrudan koçluk döngüsü kuruyor: geçmişi okur → son programlanan seansın nasıl geçtiğine bakar → nasıl hissettiğini sorar → bir sonraki seansı tasarlar → Hevy'ye routine olarak yazar.
Hevy'nin kendi App Store sürüm notu (v3.1.12, ~2026-09-03) "ChatGPT ve Claude ile doğrudan entegrasyon" diyor — resmî tarafın da bu yöne gittiğini gösteriyor.
Kaynak: [chrisdoc/hevy-mcp](https://github.com/chrisdoc/hevy-mcp), [claude-hevy-coach](https://glama.ai/mcp/servers/jmilinovich/claude-hevy-coach)

**Sonuç:** Doğal dille logging **teknik olarak çözülmüş ama ürünleşmemiş.** Ana akım uygulamaların hiçbirinde (Hevy, Strong, Fitbod, JEFIT, Alpha Progression) uygulama içi sesli/serbest metin girişi **yok.**

### 6.4 Progresyon görselleştirme kalitesi — kullanıcı gerçekten geliştiğini görebiliyor mu?

| Uygulama | Grafikler | Gerçekten "gelişiyorum" hissi veriyor mu? |
| --- | --- | --- |
| **Alpha Progression** | Strength rating, volume, sets per muscle, workouts per week, bodyweight, measurements; her workout sonunda **kırdığın her rekorun listesi** (weight, reps, volume, tahmini 1RM ve 10RM, kas grubu bazında en iyi); streak + achievement; CSV export | **En iyisi.** Seans sonu rekor özeti tek başına en güçlü geri bildirim mekanizması |
| **Hevy** | Egzersiz performansı, sets per muscle group per week/month/year (kas filtreli), muscle distribution, monthly report, Year in Review, consistency/streak, body measurements, progress photos, canlı PR bildirimi | Çok iyi — ama Pro'da 3 aydan uzun geçmiş. Ana metrik total volume |
| **StrengthLog** | Temel istatistik + PR (free); kas bazlı raporlar + muscle map (Premium); **2026 Strength Levels**: en çok loglanan 15 lift üzerinden Beginner→Elite percentile | Strength Levels akıllı bir fikir — mutlak değil **göreli** ilerleme gösteriyor |
| **Liftoff** | Rank, streak, global leaderboard, 600+ egzersizde feedback | Oyunlaştırma; "gelişme" yerine "sıralama" hissi. Farklı ama etkili |
| **Gravitus** | PR yakalama anında, 1RM tırmanışı ay ay, "en iyini geçmek için ne gerekiyor" | PR odaklı — dar ama net |
| **Setgraph** | Real-time grafikler, **correlation charts** (ağırlık-rep ilişkisinin zaman içindeki evrimi) | Correlation chart kategoride nadir |
| **Liftin'** | Weight, volume, 1RM, training max, süre; kısa ve uzun vade | Tasarım güçlü |
| **Strong** | Egzersiz bazlı progresyon grafiği, best set, 1RM, body fat (Pro) | Yeterli, öne çıkmıyor |
| **Fitbod** | Recovery/volume/intensity görünümleri | **Zayıf.** PR'ları tek yerde göremiyorsun (App Store şikâyeti). Her seans farklı egzersiz verdiği için **harekette progresyon izlemek zorlaşıyor** |
| **RP Hypertrophy** | Mezosikl içi ilerleme | Grafik katmanı zayıf, spesifik bilgi bulunamadı |
| **Boostcamp** | Grafikler + body-mapped kas heatmap (Pro) | Pro duvarı arkasında |
| **Ladder** | "Ladder Journal" ile rep ve ağırlık ilerlemesi | Basit |
| **Nike Training Club** | Yok denecek kadar az | Programlama/overload 3/5 |

**Genel sorun:** Neredeyse herkesin ana metriği **total volume (set × rep × kg)**. Bu metrik hacim artırıcıyı ödüllendirir, efor artırıcıyı cezalandırır. **Mekanik gerilim / efor bazlı bir görselleştirme dili (örn. "aynı ağırlıkta RIR düştü" veya "estimated 1RM tırmandı, hacim sabit") kategoride yok.** Alpha Progression'ın "strength rating" ve StrengthLog'un "Strength Levels" bu yöne en yakın iki deneme.

### 6.5 Veri girişi UX'i — kaç tıkla bir set giriliyor?

| Uygulama | Set başına tap (değişiklik yoksa) | Not |
| --- | --- | --- |
| Strong | 1 | Previous overlay + checkmark. Sektörün en hızlısı kabul ediliyor |
| Hevy | 1 | Aynı model + otomatik rest timer + Live Activity |
| Gravitus | 1 | "Tap to complete" |
| Setgraph | 1 (swipe ile önceki seti kopyala) | "Next Set Due" bildirimi |
| **Alpha Progression** | **2 — ama RIR dahil** | Kategoride RIR'ı bu hızda alan tek uygulama |
| Fitbod / JEFIT / Boostcamp | 2–3 | Standart |
| RP Hypertrophy | 2–3 **+ seans sonu feedback anketi** | Web wrapper, offline yok |
| JuggernautAI | 2–3 + günlük readiness check-in | Girdi yükü en ağır olan |
| **Sesli (GhostFit/Vora/Voona)** | **0 tap** | Ama hiçbiri ölçekte değil |

---

## 7. PAZAR BOŞLUKLARI (net liste)

1. **Minimalist / düşük hacim / yüksek efor için ürün yok.** Bütün programlama motorları hacim artırma varsayımı üstüne kurulu. Tek aday (One Set To Failure) daha yayınlanmamış.

2. **Efor bazlı görselleştirme dili yok.** Herkes total volume gösteriyor. "Aynı ağırlıkta RIR düştü", "estimated 1RM tırmanıyor ama hacim sabit", "set başına verim arttı" gibi metrikleri ana ekrana koyan yok.

3. **Antrenman + beslenme + uyku/stres gerçek sentezi yok.** En yakını MacroFactor bundle (iki ayrı uygulama, uyku yok) ve Caliber (uyku yok). Verileri toplayan çok, **karar veren hiç kimse yok.** JuggernautAI uykuyu soruyor ama ölçmüyor.

4. **Doğal dille logging ürünleşmemiş.** Teknoloji hazır (Hevy public API + MCP bunu kanıtlıyor), ana akım uygulamaların hiçbirinde yok. Niş sesli uygulamalar mikro ölçekte.

5. **Kapalı kutu problemi.** RP, Fitbod, Juggernaut, Dr. Muscle — dördü de "nasıl karar verdiğini" yayınlamıyor. Fitbod en şeffafı (blog yazısında 5 değişkeni açıklamış), RP en kapalısı (feedback→set eşlemesi hiçbir yerde yok). **Hedef kitle tam olarak "nedenini bilmek isteyen" insanlar** — bu bir konumlandırma açığı.

6. **$5–$13/ay fiyat boşluğu.** Log tutucular $2.99–4.99'a sıkışmış, zekâ iddia edenler $12.99+. Arada ürün yok.

7. **Android neglect.** Strong iOS 4.86 / Android 4.3. Setgraph Android 4.0. Ladder, RP, Peloton Strength+, JuggernautAI'ın Android'i ya yok ya çok zayıf. Android tarafı yapısal olarak eksik hizmet alıyor.

8. **Marka uygulamaları ölüyor.** Gymshark Training donduruldu (Temmuz 2026). Nike Training Club programlamada 3/5. Peloton Strength+ etkileşimsiz kullanıcıları 6–8 haftada kaybediyor. Marka gücü ürün yerine geçmiyor — ama Ladder ($105M yatırım, 4.95 puan, 191K oy) koç + topluluk formatıyla bunu kırıyor.

9. **Otoregülasyon hâlâ nadir.** 24 uygulamadan **gerçek autoregulation yapan sadece 3**: JuggernautAI (readiness + RPE 10'da set kesme), RP (4 sinyalli haftalık hacim kararı), Dr. Muscle (DUP + otomatik deload). Tonal donanımla yapıyor. Geri kalan 20 uygulama ya şablon ya basit "üst rep aralığını vurursan ağırlık ekle" kuralı.

---

## 8. KAYNAKLAR

**Birincil / doğrulanmış veri**
- iTunes Search & Lookup API — puan, oy sayısı, fiyat, sürüm tarihi, açıklama (2026-09-08): `https://itunes.apple.com/lookup?id={id}&country=us`
- Google Play ürün sayfaları — indirme, puan, review sayısı (2026-09-08): `https://play.google.com/store/apps/details?id={pkg}&hl=en_US&gl=US`
- App Store in-app purchase listeleri (Hevy, Fitbod, RP, JuggernautAI, Ladder, MacroFactor Workouts, Setgraph, Alpha Progression)

**Şirket kaynakları**
- https://www.hevyapp.com/about-us/ · /features/ · /features/workout-plan-generator/ · /features/sets-per-muscle-group-per-week/ · /community-updates/july-26/
- https://api.hevyapp.com/docs/
- https://www.strong.app/
- https://fitbod.me/blog/fitbod-algorithm/ · https://fitbod.me/blog/muscle-recovery/
- https://rpstrength.com/pages/hypertrophy-app · https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth
- https://alphaprogression.com/en
- https://www.jefit.com/elite · https://www.jefit.com/
- https://dr-muscle.com/
- https://macrofactorapp.com/workouts/
- https://setgraph.app/ · https://gravitus.com/ · https://www.liftinapp.co/
- https://strongerbytheday.app/
- https://onesettofailure.app/
- https://askvora.com/voice-coaching · https://voona.app/ · https://ghostfit.ai/blog/...
- https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app
- https://tonal.com/products/tonal-2
- https://help.strengthlog.com/help-article/strengthlog-premium/

**Bağımsız incelemeler**
- https://www.garagegymreviews.com/juggernautai-review · /boostcamp-review · /nike-training-club-review · /tonal-vs-tempo
- https://barbend.com/boostcamp-review/ · /caliber-fitness-app-review/
- https://repreturn.com/strong-app-review/
- https://www.hypro.app/blog/best-workout-tracker-apps
- https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison · /hevy-review-2026 · /hevy-vs-strong-2026 · /fitbod-review-2026
- https://arvo.guru/resources/methods/rp-training
- https://www.pelobuddy.com/strength-plus-available-cost/
- https://cybernews.com/reviews/tonal-2-review/

**Rakip tarafından yazılmış (taraflı — işaretli)**
- https://dr-muscle.com/rp-hypertrophy-app-review/ · /fitbod-workout-app-review/

**Şirket haberleri / finans**
- https://www.businesswire.com/news/home/20241120017577/en/ (Ladder $105M)
- https://insider.fitt.co/ladder-raises-105m-for-strength-training-app/
- https://sgbonline.com/highpost-capital-acquires-chris-hemsworths-centr-and-inspire-fitness/
- https://finance.yahoo.com/news/ai-workout-app-dr-muscle-150000883.html
- https://boringcashcow.com/view/workout-tracking-app-makes-40k-a-month (Hevy, 2023 verisi)
- https://obj.ca/fitness-app-entrepreneur-pumped-by-hevys-progress-to-2m-in-annual-revenue/ (403, ikincil alıntı)

**MCP / entegrasyon**
- https://github.com/chrisdoc/hevy-mcp
- https://glama.ai/mcp/servers/jmilinovich/claude-hevy-coach

---

## 9. BULUNAMAYANLAR (dürüst liste)

- Hevy'nin 2026 geliri / ARR — doğrulanmış kaynak yok (Sensor Tower paywall arkasında)
- Fitbod'un 2026 geliri — yok
- RP Hypertrophy kullanıcı sayısı, geliri — yok
- JuggernautAI, Boostcamp, Alpha Progression, Setgraph, Caliber gelir/MAU — yok
- StrengthLog Premium fiyatı (sadece uygulama içinde)
- Gravitus ücretli fiyatı, Android paket verisi
- Progression (fitness) Pro fiyatı
- Centr 2026 abonelik fiyatı
- Tonal'in kullanıcı sayısı ve geliri
- RP'nin feedback cevabı → set sayısı eşleme tablosu (hiçbir kamuya açık kaynakta yok)
- Hevy Trainer'ın deload / periyodizasyon mantığı (dokümante edilmemiş; muhtemelen yok)
- Peloton Strength+ Android ölçeği (paket doğrulanamadı)
- Voona ve GhostFit'in gerçek ölçeği (ABD App Store'da bulunamadı)
