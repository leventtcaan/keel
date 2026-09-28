---
hat: A — Beslenme / kalori / diyet takip uygulamaları
faz: 1 (Pazar)
tarih: 2026-09-08
durum: ham araştırma
---

# A · Beslenme / Kalori / Diyet Takip — Rakip Analizi

> **Okuma notu.** Her iddianın yanında kaynak URL var. Doğrulayamadıklarım
> `[tahmin/doğrulanmadı]`, bulamadıklarım `[bulunamadı]` işaretli.

## ⚠️ Kaynak güvenilirliği uyarısı — bu araştırmanın en önemli metodolojik notu

Bu alanda arama yaparken karşılaşılan sonuçların **çoğunluğu AI ile üretilmiş SEO
spam'i.** Bunlar rakip uygulamaların affiliate/içerik kolları: `nutriscan.app`,
`nutrola.app`, `caleye.fit`, `arvo.guru`, `bestcalorieapps.com`,
`calorie-trackers.com`, `nutrition-app-rankings.com`, `amyfoodjournal.com`,
`hronikka.com`, `bentobunny.app`, `calfix.app`, `micron-app.com`, `lean-app.com`,
`fitbudd.com` + Alibaba'nın "product insights" sayfaları.

Somut yanlış örnekleri (bu araştırma sırasında yakalandı):
- **Nutrola**, MacroFactor'ün "hâlâ AI foto loglama sunmadığını" yazıyor —
  MacroFactor bunu **Nisan 2025'te** yayınladı, kendi yıllık raporunda yazıyor.
  <https://macrofactor.com/annual-report-2025/>
- **Alibaba "product insights"** sayfası Cronometer'ın "14 günde bir smoothed
  weight trend'e göre kalori ayarladığını, ±%15 sınır uyguladığını" iddia ediyor.
  **Tamamen uydurma.** Cronometer'ın kendi forumunda adaptive TDEE'nin olmadığı
  ve resmen cevaplanmadığı tartışılıyor.
  <https://forums.cronometer.com/discussion/5713/adaptive-tdee-calculation-is-it-ever-coming>
- Cronometer için "±%3.5 kalori doğruluğu" rakamı yalnızca spam sitelerde geçiyor,
  Cronometer'ın kendi dokümanında yok. `[doğrulanmadı — muhtemelen uydurma]`

**Bu, kendi başına bir pazar bulgusu:** kategori o kadar para kazandırıyor ki
rakipler birbirini karalayan/öven sahte inceleme siteleri işletiyor. Organik
arama sonuçları güvenilmez. Aşağıdaki verilerde **birincil kaynaklara** (App Store
listeleri, şirketin kendi dokümanları/help center'ı, hakemli makaleler, gerçek
gazetecilik, şirket forumları) öncelik verdim.

---

## 0 · Yönetici özeti — kategorinin şekli

Kategori üç katmana ayrılıyor ve katmanlar arasında **metodoloji uçurumu** var:

| Katman | Ne yapıyor | Örnekler |
| --- | --- | --- |
| **Ledger (defter)** | Yediğini kaydeder, denklemle hedef verir, hedefi güncellemez | MyFitnessPal, Cronometer, Lose It!, Lifesum, Yazio, MacrosFirst, Nutritionix |
| **Kural motoru** | Haftalık check-in'de heuristic kalori dürtmesi. Kendine "adaptive" diyor | Carbon, RP Diet, Avatar, Fitia (kısmen) |
| **Öğrenen model** | Gerçek intake + kilo verisinden TDEE **geri hesaplar ve gösterir** | **MacroFactor — tek** |
| **Behavior / medical** | Psikoloji, ilaç, biyobelirteç satar; kalori ikincil | Noom, WW, Zoe, Simple |
| **AI-first scanner** | Fotoğraftan kalori; hız satar, doğruluk iddia etmez | Cal AI, SnapCalorie, Foodvisor |
| **Anti-hedef** | Kasten kalori hedefi vermez | AteMate, Zoe |

**Kategorinin 2026'daki üç büyük hareketi:**
1. **GLP-1 gelir merkezini kaydırdı.** WW'nin davranışsal geliri **−%22.7**,
   klinik geliri **+%30.4**; Noom'un GLP-1 hattı 4 ayda $100M run-rate'e ulaştı.
   Kalori sayma işi tek başına küçülüyor.
2. **Konsolidasyon ve çöküş aynı anda.** MyFitnessPal, Cal AI'ı (Ara 2025) ve
   Intent'i (Şub 2025) satın aldı; WW Chapter 11'den Haziran 2025'te çıktı
   ($1.15B borç silindi); Zoe'nin geliri yarıya indi; Nutritionix fiilen terk
   edildi; PlateJoy ve Yummly kapandı.
3. **Herkes adına "AI" koydu.** Lifesum, Yazio, Foodvisor, Ate — dördü de
   2025–26'da uygulama adını değiştirdi. Ama **AI çoğunlukla loglama
   katmanında**; karar/koçluk katmanında değil.

Pazar büyüklüğü tahminleri tutarsız (kaynaklar çelişiyor):
- Diet & nutrition apps: 2026'da **$6.94B → 2035'te $27.73B**, CAGR %16.64
  <https://www.towardshealthcare.com/insights/diet-and-nutrition-apps-market-sizing>
- Farklı kaynak: 2026'da **$14.06B → 2034'te $35B**, CAGR %10.2
  <https://www.verifiedmarketreports.com/product/nutrition-apps-market/>
- Sadece calorie counting segment: 2024'te $1.2B → 2033'te $3.5B
  <https://www.verifiedmarketreports.com/product/calorie-counting-app-market/>

> İki tahmin arasında 2x fark var. Market-research raporları bu kategoride
> güvenilmez; **kullanma, sadece büyüklük mertebesi için tut.** `[doğrulanmadı]`

---

## 1 · TIER 1 — Derin İnceleme

### 1.1 MacroFactor

**Çekirdek iş:** Kullanıcının gerçek yeme ve kilo verisinden metabolizmasını
(TDEE) istatistiksel olarak öğrenip haftalık kalori/makro hedefini otomatik
güncelleyen, koçluk odaklı makro takip uygulaması.

**Kim yapıyor:** Stronger By Science Technologies LLC — Greg Nuckols ve Eric Trexler
(Stronger By Science), Jeff Nippard destekli.
App Store geliştirici adı doğrulandı: <https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471>

#### Feature listesi (somut)
- Expenditure (TDEE) algoritması — haftalık hedef güncellemesi
- Üç coaching modu: Coached / Collaborative / Manual
- Doğrulanmış food database + barkod tarama
- AI fotoğraf loglama (Nisan 2025'te eklendi)
- Recipe importer (2025 yazı), Favorite Foods, Apple Watch app (Eylül 2025)
- Kilo trend analizi, habit tracker, period tracker, Apple Health entegrasyonu
- "Shame yok" tasarım kararı: hedef aşımında kırmızı sayı/uyarı yok
- **MacroFactor Workouts** — Ocak 2026'da çıkan **ayrı** antrenman uygulaması

#### Fiyatlandırma 2026 (App Store'dan doğrulandı)
| Plan | Fiyat |
| --- | --- |
| Aylık | $11.99 |
| 6 aylık | $47.99 (~$8.00/ay) |
| Yıllık | $71.99 (~$5.99/ay) |
| Nutrition + Workouts bundle | $89.99/yıl (~$7.50/ay) |
| Deneme | 7 gün, tüm özellikler açık |
| **Free tier** | **YOK — ve olmayacağını açıkça söylüyorlar** |

Kaynak: <https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471> ·
<https://macrofactor.com/workouts/price/>

2026 öncesi aboneler: Workouts'a 12 Ocak 2027'ye kadar ücretsiz erişim. `[tek kaynak]`

#### Ölçek
| Metrik | Değer | Kaynak |
| --- | --- | --- |
| Kullanıcı (Eyl 2022) | 35.000 | <https://macrofactor.com/annual-report-2025/> |
| Kullanıcı (Eyl 2023) | 90.000 | aynı |
| Kullanıcı (Eyl 2024) | 185.000 | aynı |
| **Kullanıcı (Eyl 2025)** | **400.000** | aynı |
| App Store puanı | **4.8 / 22.000 oy** (ABD) | App Store listesi |
| Aylık indirme (Nis 2026) | ~100K indirme, ~$2M gelir | Appfigures/Sensor Tower üçüncü el `[tahmin/doğrulanmadı]` |
| Gelir | Şirket açıklamıyor | yıllık raporda yok |
| Ödül | Google Play Best Everyday Essential 2024 | <https://www.businesswire.com/news/home/20241118746780/en/MacroFactor-Wins-Google-Play-Best-of-2024-Award> |

> Yorum: **yılda ~2x büyüme, dört yıl üst üste.** Bootstrapped ve free tier yok.
> Bu kategoride "ücretsiz katman olmadan büyüyebilirsin" kanıtı.

#### ⭐ Metodoloji iddiası — adaptive TDEE matematiği (ÖZEL SORU 1)

**İddia:** Uygulama TDEE'yi denklemle tahmin etmiyor, kullanıcının verisinden
**geri hesaplıyor.** Temel özdeşlik:

```
Calories out = Calories in − Change in stored energy
```

Yani: logladığın kalori ile ölçülen kilo trendini karşılaştırır. Kilon
tahminden hızlı düşüyorsa TDEE tahmini yukarı, yavaş düşüyorsa aşağı çekilir.
<https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure>

**Kalman filtresi mi, ağırlıklı ortalama mı? → CEVAP: AÇIKLAMIYORLAR.**

Bu sorunun net cevabı **yok ve bu bilinçli.** V3 algoritma yazısında Greg Nuckols
aynen şunu diyor: *"secret sauce"* vermemek için daha fazla detay paylaşmayacağını,
çünkü detayların geliştirdikleri *"novel techniques"*e işaret edeceğini söylüyor.
<https://macrofactor.com/expenditure-v3/>

Kamuya açık olarak **doğrulanabilen** teknik gerçekler:
- Ham günlük tartı değil, **weight trend** (smoothed) kullanılıyor. Smoothing
  yaklaşımı kavramsal olarak **Kevin Hall'un body weight modelleme** çalışmasına
  benzetiliyor — rolling weighted average.
- Model bir **prediction engine**: tahmin üretir, gözlenen sonucun tahmine ne
  kadar uyduğunu izler, sapmaya göre kendini günceller.
  <https://macrofactor.com/expenditure-modifiers/>
- Değişkenlerin **ağırlıkları** stability ↔ responsiveness dengesi için ayarlanıyor.
- İlk tahmin BMR denklemi + activity multiplier ile başlıyor; ~1 hafta sonra
  gerçek veri devreye giriyor; **2–3 haftada** rafine tahmin oluşuyor; sonraki
  metabolik değişimler **1–2 hafta** içinde yakalanıyor.
- Sürekli güncelleme için gereken minimum: **7 günün en az 6'sında** beslenme
  logu + haftada en az 1 tartı.

**V3 (mevcut sürüm) ölçülen iyileştirmeleri** — <https://macrofactor.com/expenditure-v3/>
| Metrik | V2 → V3 |
| --- | --- |
| Trend dönüşü yakalama | 1–5 gün daha erken |
| Günlük oynaklık | ~%35 daha küçük |
| Eksik veri toleransı | V2 %80–85 tamlık istiyordu → V3: *"updates will only pause if you have more than three days of missing nutrition data in a seven-day period"* |
| Haftalık kilo tahmin hatası | ~%15 daha küçük |
| Aylık kilo tahmin hatası | ~%5 daha küçük |

**Expenditure Modifiers (2026 eklentisi)** — <https://macrofactor.com/expenditure-modifiers/>
- Step-informed updates (adım verisi opsiyonel girdi)
- Predictive goal adjustment: hedef değişince expenditure önden düzeltiliyor.
  Formül açıklanmış: **hedeflenen haftalık kilo değişim yüzdesinin 4 katı** kadar
  düzeltme. Örnek: haftada %1 kayıp hedefleyen kullanıcı %4 daha düşük başlangıç
  expenditure tahmini alır. Gerekçe: literatürde kalori açığında beklenen
  expenditure düşüşü standart denklemlerin öngördüğünden **%10–15 fazla.**
- Net etki: ~%11 daha responsive, ~%6 daha az stabil

#### Doğruluk iddiası — ve iddianın zayıf noktası
<https://macrofactor.com/algorithm-accuracy/>

Şirket **metabolik oda / doubly labeled water validasyonu yapmadığını açıkça
söylüyor**; bunun yerine "predictive validity"ye baktıklarını belirtiyor.
Veri: 2025 transformation challenge'a katılan **748 yeni kullanıcı, 100 gün.**

| Metrik | Değer |
| --- | --- |
| 3–4 hafta sonrası medyan expenditure hatası | **135 kcal/gün** (aralık 60–240) |
| Formül tabanlı yaklaşımın hatası | **335 kcal/gün** (aralık 155–590) |
| 100 günde medyan kümülatif hata | ~3.1 lb (~1.4 kg) |
| MacroFactor'ün formülden daha isabetli olduğu kullanıcı oranı | %94.1 |
| 100 günde hatası TDEE'nin %10'unun altında kalan | %84 |

> **Eleştirel not:** Bu veri **tamamen şirketin kendi tescilli veri setinden.**
> Hakemli yayın yok, bağımsız validasyon yok, doubly labeled water karşılaştırması
> yok. Ayrıca 748 kişi bir "transformation challenge" katılımcısı — yani
> **son derece motive, seçilmiş bir örneklem.** Normal kullanıcıya genellenemez.
> Yine de sektörde bu düzeyde şeffaflıkla hata payı yayınlayan **başka uygulama yok.**

#### ⭐ Nutrition ↔ Training entegrasyonu (ÖZEL SORU 4) — KRİTİK BULGU

MacroFactor Workouts **Ocak 2026'da** çıktı. Ama entegrasyon **yok.** Kendi help
dokümanları aynen şöyle diyor:

> *"MacroFactor Workouts and MacroFactor Nutrition operate as separate apps. They
> do not automatically adjust training based on nutrition data, or nutrition
> targets based on training data."*

<https://help.macrofactorapp.com/en/articles/381-how-does-macrofactor-workouts-integrate-with-macrofactor-nutrition>

Paylaşılan tek şey: kilo girişleri, vücut çevre ölçüleri, period verisi, progress
foto, bazı habit'ler. Ortak coaching yok, otomatik program ayarı yok.
Dokümanda "ileride daha derin entegrasyon **araştırılabilir**, ama otomatik/reaktif
değil, kasıtlı ve kanıta dayalı olur" deniyor.

> **Bu, kategorinin en büyük açık boşluğu.** Sektörün metodolojik olarak en
> ciddi oyuncusu, iki modülü aynı çatı altına aldı ama **birbirine bağlamadı** —
> ve bunu bilinçli bir kanıt-temkinliliği olarak savunuyor.

#### Kişiselleştirme derinliği
- Başlangıç: BMR denklemi + activity multiplier (hangi denklem olduğu açıkça
  belirtilmemiş `[bulunamadı]`) → **sadece ilk tahmin için**
- Sonrası: tamamen kullanıcının kendi verisi. **Formülden çıkıp veriye geçiyor.**
- Yemek tercihi / bütçe / kültürel mutfak kişiselleştirmesi: **YOK**
- Öğün planı üretmiyor — hedef verir, ne yiyeceğine kullanıcı karar verir

#### AI/LLM kullanımı
- AI fotoğraf loglama (Nisan 2025) — **gerçek ama yardımcı rol**, çekirdek değer değil
- Çekirdek değer LLM değil, **istatistiksel model.** Bu kategoride nadir.

#### Bilinen zayıflıklar
- **Free tier yok** — en tutarlı şikâyet. Algoritmanın işe yaradığını görmeden
  yıllık ücrete girmek istemeyenler var. `[Reddit özeti, ikincil kaynak]`
- Dil desteği dar — derinlik için genişlikten feragat ettiklerini söylüyorlar
- Yeni başlayan için onboarding karmaşık
- Algoritma **düzenli tartı + düzenli log** istiyor; düzensiz kullanıcıda çalışmıyor
- Metabolik sağlık / insülin direnci / kan değeri takibi **yok**

---

### 1.2 MyFitnessPal

**Çekirdek iş:** Dünyanın en büyük yemek veritabanı üzerinden kalori/makro
loglama — bir defter, koç değil.

**Sahiplik:** Francisco Partners (Under Armour'dan satın aldı).
Geliştirici: MyFitnessPal, Inc.

#### 🔥 2026'nın en önemli hamlesi: Cal AI satın alması
- **Aralık 2025'te kapandı** (görüşmeler 2025 başında başlamış), Mart 2026'da duyuruldu
- Bedel açıklanmadı
- Cal AI: **15M+ indirme, $30M+ yıllık gelir, iki yıldan kısa sürede**
- Kurucular Zach Yadegari ve Henry Langmack (ikisi de 19 yaşında), lisede kurmuşlar
- 7 çalışan + contractor'lar devralındı
- **Cal AI bağımsız kalıyor** — MFP'ye katılmayacak, kullanıcıları yönlendirilmeyecek
- İlk entegrasyon: Cal AI artık MFP veritabanını kullanıyor —
  20M yemek, 68.500 marka, 380+ restoran zinciri

Kaynak: <https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/>

Ayrıca **Şubat 2025'te Intent** (kişiselleştirilmiş öğün planlama) satın alındı.
<https://www.prnewswire.com/news-releases/myfitnesspal-announces-acquisition-of-intent-revolutionizing-personalized-meal-planning-for-members-302374108.html>

> **Okuma:** MFP kendi ürününü modernize edemediği için **büyümeyi satın alıyor.**
> Bir 19 yaşındaki çocuğun 2 yılda $30M'a çıkardığı ürünü, 20 yıllık lider
> satın almak zorunda kaldı. Kategoride dağıtım ≠ ürün üstünlüğü.

#### Feature listesi
- 20.5M+ yemek veritabanı, barkod tarama (Premium)
- Meal Scan (fotoğraftan), Voice Log
- **AI Coach** — Haziran 2026'da çıktı, ayrı "Coach" sekmesi
- Plan sekmesi (Yaz 2026) — hedefe göre tarif/öğün önerisi
- Progress insights
- **GLP-1 takibi** — doz hatırlatıcı dahil
- 40+ fitness tracker / smartwatch entegrasyonu
- Egzersiz loglama, özelleştirilebilir makro hedefleri

#### Fiyatlandırma 2026
App Store IAP listesi (doğrulandı): Aylık Premium $9.99–$19.99,
Yıllık Premium $49.99–$79.99, Annual Premium $79.99
<https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718>

İkincil kaynaklar (spam riski var, `[doğrulanmadı]`): Premium $79.99/yıl veya
$19.99/ay; Premium+ $99.99/yıl veya $24.99/ay; Premium+ farkı öğün planlama.

Free tier: temel loglama var. **Barkod tarayıcı, özel makrolar ve reklamsız
deneyim ücretli katmanda** — barkodun paywall'a alınması tarihsel olarak en büyük
kullanıcı öfkesi kaynağı.

#### Ölçek
| Metrik | Değer | Kaynak |
| --- | --- | --- |
| App Store puanı | **4.7 / 2.4M oy** — kategorinin en yüksek oy sayısı | App Store |
| Kullanıcı | 200M+ (Under Armour satışı sırasında bildirilen) | Business of Apps `[tarih belirsiz]` |
| İndirme | 200M+ toplam, 2025'te +20M | Business of Apps `[doğrulanmadı — sayfa 403]` |
| Gelir | **$310M (2023)** | Business of Apps `[3 yıllık veri — eski]` |
| Gelir 2025 | `[bulunamadı]` | |
| App Store sıralaması | Health & Fitness #12 | App Store |

#### Metodoloji iddiası — ve gerçek
**Mifflin-St Jeor denklemi + activity multiplier.** Kayıt sırasında verilen
bilgiyle bir kere hesaplanır. <https://blog.myfitnesspal.com/how-to-calculate-caloric-needs/>

**Sonuç: statik. Gerçek sonuçlardan ÖĞRENMİYOR.** Kullanıcının kilosu beklendiği
gibi gitmiyorsa uygulama bunu fark edip hedefi kendiliğinden düzeltmiyor;
kullanıcıdan manuel ayar bekliyor.

Bilinen yapısal sorunlar:
- Activity multiplier kategorileri çok geniş ("moderately active" içinde büyük
  varyans var); araştırmalar insanların ~%80'inin aktivitesini **abarttığını**
  gösteriyor `[ikincil kaynak, birincil literatür doğrulanmadı]`
- MFP'nin "egzersiz kalorisi geri ekleme" modeli bilinen bir çifte sayım kaynağı

#### Kişiselleştirme derinliği
Formül. Statik. Yeni AI Coach kullanıcının **loglanmış verisini okuyor** (kalan
kalori, makro açığı, log geçmişi, kayıtlı öğünler, hedefler) ve buna göre sohbet
ediyor — ama bu **hedefi hesaplayan modeli değiştirmiyor.** Yani AI, defterin
üstüne konuşuyor; defteri düzeltmiyor.

#### AI/LLM kullanımı
- AI Coach (Haz 2026): gerçek LLM, kullanıcı verisiyle beslenmiş, açık uçlu soru
  alıyor. **Sohbet katmanı — karar katmanı değil.**
- Meal Scan: fotoğraftan tanıma
- Voice Log
- Hepsi Premium/Premium+ arkasında
<https://www.globenewswire.com/news-release/2026/06/10/3309733/0/en/myfitnesspal-introduces-ai-coach-to-deliver-personalized-nutrition-guidance-rooted-in-20-years-of-nutrition-expertise.html>

#### Bilinen zayıflıklar
- **Crowd-sourced veritabanı kirli** — aynı yemeğin onlarca yanlış girdisi
- Barkod tarayıcının paywall'a alınması (2022) kalıcı itibar hasarı yaptı
- Statik TDEE — metabolik adaptasyonu görmüyor
- Sydney Üniversitesi çalışmasında (2024) MFP 22 yemek görselinde %97 tanıma
  başarısı gösterdi ama **karışık yemeklerde çuvalladı** (aşağıda detay)

---

### 1.3 Cronometer

**Çekirdek iş:** Mikrobesin düzeyinde doğruluk — laboratuvar analizli veritabanıyla
84+ mikrobesin takibi. "Doğru veri" ürünü.

**Sahiplik:** Cronometer Software Inc, Revelstoke BC Kanada. Kurucu/CEO **Aaron Davidson.**
**Bootstrapped — $0 dış yatırım.** Davidson çoğunluk hissedar.
<https://www.crunchbase.com/organization/cronometer-com>

#### Feature listesi
- 1.1M+ doğrulanmış yemek; **NCCDB** (Nutrition Coordinating Center Database,
  yemek başına 77 besin) + USDA FoodData Central — **laboratuvar analizli**
- 84+ mikrobesin takibi (vitamin, mineral, amino asit)
- Foto, ses ve barkod loglama
- Apple Health, Fitbit, Garmin, Oura, Whoop entegrasyonu
- Fasting tracker, recipe importer (Gold)
- Biyometrik loglama (kan değerleri, tansiyon vb.)
- Custom foods — **doğrulanmış veritabanından ayrı tutulur ve etiketlenir**
  (MFP'den temel farkı: kirli veriyi temiz veriden ayırıyor)

#### Fiyatlandırma 2026
App Store IAP (doğrulandı): **Gold Aylık $10.99 · Gold Yıllık $59.99**
<https://apps.apple.com/us/app/cronometer-nutrition-tracker/id1145935738>

Free tier **cömert**: özelleştirilebilir makrolar ücretsiz katmanda
(MFP'de paywall arkasında). Gold; reklam kaldırma, fasting timer, besin açığına
göre yemek önerisi, veri dışa aktarma, custom foods ekliyor.

#### Ölçek
| Metrik | Değer | Kaynak |
| --- | --- | --- |
| App Store puanı | **4.8 / 98.000 oy** | App Store |
| Müşteri | ~3.5M | getlatka `[doğrulanmadı, üçüncü el]` |
| ARR | **~$3.8M (2024)** | getlatka `[doğrulanmadı, üçüncü el]` |
| Çalışan | ~45 (2026), 42 (2023) | Tracxn `[doğrulanmadı]` |
| Yatırım | **$0 — bootstrapped** | Crunchbase |

> Yorum: 3.5M müşteriye karşı $3.8M ARR — **kullanıcı başına gelir çok düşük.**
> Ücretsiz katman cömert olduğu için dönüşüm zayıf. Bootstrapped kalabilmesinin
> bedeli bu.

#### ⭐ Metodoloji — adaptive TDEE var mı? HAYIR (ÖZEL SORU 2)
- BMR: **Mifflin-St Jeor.** <https://support.cronometer.com/hc/en-us/articles/31975503009044-Energy-Target>
- Üstüne loglanan/cihazdan gelen egzersiz kalorisi ekleniyor
- **Kullanıcının intake+kilo verisinden maintenance öğrenmiyor.**

Kendi forumlarında "Adaptive TDEE calculation, is it ever coming?" başlığı var;
bir kullanıcı özelliğin zaten olduğunu iddia ediyor, konuyu açan reddediyor:
*"That's not what adaptive TDEE is, that's making a guess and running with it."*
**Cronometer personelinden resmî cevap gelmemiş**, kullanıcı bunun defalarca
görmezden gelindiğinden şikâyetçi.
<https://forums.cronometer.com/discussion/5713/adaptive-tdee-calculation-is-it-ever-coming>

> Bu thread, kategoride **talebin var ama arzın olmadığının** doğrudan kanıtı.

#### Kişiselleştirme derinliği
Formül tabanlı, statik. Cronometer'ın kişiselleştirme iddiası **kalori tarafında
değil, besin tarafında** — hangi mikrobesinde açık verdiğini gösteriyor.
Kültürel mutfak / bütçe / yemek tercihi kişiselleştirmesi **yok.**

#### AI/LLM kullanımı
Foto ve ses loglama var — **giriş kolaylaştırıcı, karar verici değil.**
Sohbet/koç LLM'i `[bulunamadı]`.

#### Bilinen zayıflıklar
- Adaptive TDEE yok ve kullanıcı talebi resmen cevaplanmıyor
- Mikrobesin derinliği yeni başlayan için fazla ağır — "veri girişi işi" hissi
- Antrenman modülü yok, koçluk yok
- Veritabanı doğru ama **dar** — laboratuvar analizli olmayan/yerel yemekler eksik

---

### 1.4 Lose It!

**Çekirdek iş:** Basit, hızlı kalori loglama — kitlesel/ana akım kilo verme defteri.

**Sahiplik:** FitNow, Inc. 2008'de çıktı.

#### Feature listesi
- 56M+ yemek ve tarif veritabanı
- **Snap It** — fotoğraftan AI loglama
- Sesli loglama: *"Say 'I had 2 eggs, toast with butter and jam'"*
- Barkod tarayıcı
- Makro + mikro takip
- Fitbit, Garmin, Withings, Google Fit, HealthKit entegrasyonu
- **Premium:** intermittent fasting, calorie cycling (haftalık kalori dalgalandırma),
  öğün planlama, **gelişmiş sağlık metrikleri — tansiyon, glukoz, kolesterol**,
  GLP-1 desteği (yeni)

#### Fiyatlandırma 2026 — ÇELİŞKİLİ VERİ
App Store IAP listesi (birincil): **Premium $9.99–$39.99**,
**Premium Lifetime $49.99–$59.99**
<https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629>

SEO siteleri ise 2026'da zam yapıldığını, yıllığın $39.99 → **$79.99** olduğunu,
aylık seçeneğin kaldırıldığını, lifetime'ın **$299.99** olduğunu yazıyor.
`[ÇELİŞKİLİ — App Store verisi ile uyuşmuyor. App Store'a güven; SEO sitelerinin
lifetime $299.99 iddiası doğrulanmadı.]`

#### Ölçek
| Metrik | Değer | Kaynak |
| --- | --- | --- |
| App Store puanı | **4.8 / 776.000 oy** | App Store |
| Kullanıcı | 57M+ (2008'den beri) | App Store açıklaması (şirket iddiası) |
| Verilen kilo | 150M+ lb | aynı |
| Gelir | `[bulunamadı]` | |
| MAU | `[bulunamadı]` | |
| App Store Editors' Choice | evet | App Store |

#### Metodoloji
Denklem tabanlı statik hedef (Mifflin-St Jeor varsayımı `[doğrulanmadı]`).
Adaptive TDEE **yok.** "Calorie cycling" özelliği adaptive değil — kullanıcının
haftalık kalorisini kendi seçtiği şekilde dağıtan bir planlama aracı.

#### Metabolik sağlık takibi — kısmi ARTI
Premium'da **glukoz, kolesterol, tansiyon** loglanabiliyor. Bu, Tier 1'de nadir.
Ama bu veriler **kalori hedefini etkilemiyor** — sadece kaydediliyor.

#### AI/LLM
Snap It (foto) + sesli loglama. Giriş hızlandırıcı. Karar/koçluk LLM'i `[bulunamadı]`.

#### Bilinen zayıflıklar
- Statik hedef, koçluk yok
- Fiyat artışı şikâyetleri (SEO kaynaklı, `[doğrulanmadı]`)
- Crowd-sourced veritabanı kalite sorunu (MFP ile aynı yapısal problem)

---

## 2 · ÖZEL SORULARIN CEVAPLARI

### ⭐ Soru 1 — MacroFactor'ün adaptive TDEE matematiği tam olarak nasıl işliyor?

**Kısa cevap: Tam matematik KAMUYA AÇIK DEĞİL. Kalman filtresi olduğu doğrulanamıyor.**

Bilinenler (yukarıda 1.1'de detaylı):
1. Temel: enerji dengesi özdeşliği `Calories out = Calories in − Δ stored energy`
2. Ham tartı değil **smoothed weight trend** — rolling weighted average,
   kavramsal olarak Kevin Hall'un body weight modellemesine benzetiliyor
3. Bir **prediction engine**: tahmin üretir → gözlemle karşılaştırır → ağırlıklarla
   günceller. Bu yapı Bayesian/Kalman ailesine **benziyor** ama şirket
   doğrulamıyor. `[Kalman filtresi iddiası DOĞRULANMADI — kaynak yok]`
4. Ağırlıklar stability ↔ responsiveness dengesi için ayarlanmış
5. Yakınsama: ~2–3 hafta; sonraki değişimleri 1–2 haftada yakalıyor
6. Eksik veri toleransı: ~%50

Yayınlanmış iki doğrudan alıntı:
> *"A basic principle of trend analysis is that you can't simultaneously maximize
> both stability and responsiveness."*
> *"To avoid giving away our 'secret sauce,' I don't think I should divulge any
> more details."*

<https://macrofactor.com/expenditure-v3/>

> **Levent için önemli sonuç:** Bu matematiğin gizli olması, aynı zamanda
> **taklit edilebilir** olduğu anlamına geliyor. Enerji dengesi özdeşliği +
> state-space filtreleme (Kalman ya da Bayesian güncelleme) literatürde açık;
> patent engeli `[bulunamadı]`. MacroFactor'ün savunma hattı algoritma değil,
> **kalibrasyon + veri + marka güveni.**

**Sektörde kaç uygulama bunu yapıyor? → Çok az. Doğrulanabilir liste:**

Burada **üç kategoriyi ayırmak şart** — pazarlama dili bunları kasten karıştırıyor:

| Sınıf | Tanım |
| --- | --- |
| **A · Öğrenen model** | Intake + kilo trendinden bir **TDEE sayısı** geri hesaplanıyor. Model kullanıcı hakkında sürekli güncellenen bir inanç taşıyor ve bu sayıyı gösteriyor. |
| **B · Kural motoru** | TDEE sayısı yok. Haftalık check-in'de "hedeften yavaşsın → kalori kes" tarzı heuristic. Bunlar da kendine **"adaptive"** diyor. |
| **C · Statik** | Denklem bir kere çalışır, biter. |

| Uygulama | Sınıf | Kanıt |
| --- | --- | --- |
| **MacroFactor** | **A — tek net örnek** | Expenditure sayısını grafikle gösteriyor, hata payını yayınlıyor |
| Carbon Diet Coach | **B** | Kendi dokümanı: *"Rather than a static TDEE calculation, Carbon adjusts weekly during check-ins."* Başlangıç: **modified Müller** denklemi. TDEE sayısı yok. |
| RP Diet Coach | **B (en saf heuristic)** | Haftalık ortalama kiloya göre makro dürtme. **TDEE'yi değil, günlük kalori toplamını bile göstermiyor.** |
| Avatar Nutrition | **B** | **Harris-Benedict** tohumu + haftalık kural + günlük ortalama-koruma nudge'ı. TDEE sayısı yok. |
| **Fitia** | **B− (en zayıf B)** | Opt-in *"Auto Adjustments"*: plato tespitinde kaloriyi **%5–10 kaydırıyor** — ama sadece **kilo logundan** tetikleniyor, **alım verisi hiç kullanılmıyor** |
| WeightWatchers | **B? — muğlak** | Adaptasyon iddiasını **açıkça yazan tek büyük oyuncu** (*"Bütçeniz güncellenir"*) ama mekanizma açıklanmamış; muhtemelen sadece yeni kiloyla denklem tekrarı `[tahmin]` |
| MyFitnessPal | C | Mifflin-St Jeor, statik |
| Cronometer | C | Mifflin-St Jeor; forumda talep var, resmî cevap yok |
| Lose It! | C | statik |
| Lifesum | C | Mifflin-St Jeor. Platoda dokümantasyon *"sabırlı ol"* diyor |
| Yazio | C | Mifflin-St Jeor, aktivite faktörü *"sabit bir değer"* |
| MacrosFirst | C | Motor hiç yok — kullanıcı hedefini gram cinsinden kendi giriyor |
| Nutritionix / Foodvisor | C | — |
| AteMate | C | **Tasarım gereği hedef yok** — anti-diyet konumlandırması |
| Cal AI / SnapCalorie | C | loglama aracı, koçluk yok |
| Noom / Simple / Zoe | C | Noom: statik bütçe. **Simple alımı bile ölçmüyor.** Zoe'de kalori kavramı yok |

> ### 🔑 Bu araştırmanın en önemli tek bulgusu
> **İncelenen 20 uygulamada, kullanıcının gerçek alım + kilo verisinden bir TDEE
> sayısı ÖĞRENEN ve bunu kullanıcıya GÖSTEREN tek uygulama MacroFactor.**
>
> Ona en yakın olan Fitia bile **alım verisini hiç kullanmıyor** — sadece kilo
> platosunu görüp kaloriyi %5–10 kaydırıyor.
>
> Carbon, RP ve Avatar "adaptive" diyor ama üçü de **haftalık kural motoru** —
> altta bir formül tohumu (Müller / Harris-Benedict) + eşik tabanlı dürtme var.
> Kitlesel pazarın tamamı (MFP, Cronometer, Lose It!, Lifesum, Yazio, Noom, WW)
> hâlâ **1990 tarihli Mifflin-St Jeor** denklemiyle çalışıyor.
>
> Yani "adaptive" kelimesi pazarda ucuzladı; **ayırt edici olan artık
> adaptifliğin kendisi değil, modelin şeffaflığı ve gerçekten öğreniyor olması.**

### ⭐ Soru 2 — Kaç uygulama maintenance kalorisini gerçekten ÖĞRENİYOR?

Yukarıdaki tablo cevabı veriyor: **3–4 / 20.**

Ayrımı netleştirmek gerekiyor, çünkü pazarlama dili bunu bulanıklaştırıyor:
- **Öğrenen (adaptive TDEE):** intake + kilo trendinden bir **TDEE sayısı**
  geri hesaplanıyor. Model kullanıcı hakkında bir inanç güncelliyor.
- **Kural tabanlı nudge:** "hedeften az verdin → 100 kcal kes". TDEE tahmini
  yok, sadece bir termostat. Birçok uygulama buna "adaptive" diyor.
- **Statik:** denklem bir kere çalışır, biter.

Bu ayrım, Levent'in projesi için **en net teknik farklılaşma ekseni.**

### ⭐ Soru 3 — Fotoğraftan kalori tahmini gerçekte ne kadar doğru?

Bağımsız akademik kanıt (hakemli, birincil kaynak):

> Li X, Yin A, Choi HY, Chan V, Allman-Farinelli M, **Chen J.**
> *"Evaluating the Quality and Comparative Validity of Manual Food Logging and
> Artificial Intelligence-Enabled Food Image Recognition in Apps for Nutrition Care."*
> **Nutrients** 2024; 16(15):2573. DOI 10.3390/nu16152573
> <https://pubmed.ncbi.nlm.nih.gov/39125452/> ·
> <https://www.sciencedaily.com/releases/2024/09/240904131013.htm>

University of Sydney. 800 uygulama tarandı, **18 uygulama** değerlendirildi,
3 diyet tipi üzerinden dokümante edilmiş yemek kayıtlarıyla karşılaştırıldı.
Kalite skorlamasında **en yüksek puanı Noom** aldı.

Makalenin doğrudan sonucu:
> *"automatic energy estimations from AI-enabled food image recognition were
> inaccurate"*

| Bulgu | Değer |
| --- | --- |
| MyFitnessPal görsel **TANIMA** başarısı (22 görsel) | %97 |
| Fastic görsel **TANIMA** başarısı | %92 |
| **Beef pho kalorisi** | **%49 FAZLA tahmin** |
| **Pearl milk tea** | **%76 EKSİK tahmin** |
| Manuel loglama — Batı diyeti | ~1.040 kJ FAZLA tahmin |
| Manuel loglama — Asya diyeti | ~1.520 kJ EKSİK tahmin |

**Kritik nüans: "tanıma" ile "ölçme" farklı şeyler.** Uygulama yemeği %97 doğru
*tanıyabiliyor* ama kalorisini %49–76 yanlış *hesaplayabiliyor.* Pazarlama
materyalleri tanıma oranını, doğruluk oranı gibi sunuyor.

Yapısal başarısızlık modları:
- 2B fotoğraftan **hacim/porsiyon** çıkarımı — temel fizik problemi
- Görünmeyen yağ/sos/pişirme yağı
- Karışık yemekler (güveç, pilav üstü, çorba)
- **Batı dışı mutfaklarda veri seti eksikliği** — sistematik bias

#### Cal AI — App Store'dan doğrudan doğrulanan veri
<https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616>

| Metrik | Değer |
| --- | --- |
| Puan | **4.8 / 361.000 oy** |
| Geliştirici | **Viral Development LLC** (isim seçimi kendi başına konuşuyor) |
| IAP fiyat basamakları | $2.99 · $5.99 · $9.99 · $19.99 · $29.99 · Streak Restore $0.99 |
| Akış | *"1) Answer lifestyle questions 2) Snap a photo 3) Get your nutritional breakdown"* |

**Kullanıcı yorumlarından çıkan gerçek hata örnekleri (birincil kaynak):**
- Bir kullanıcı: online değerlere karşı kontrol etmiş, *"accurate usually to
  within 10 percent"* — mükemmel değil ama kullanılabilir demiş
- Başka kullanıcı: sodyumu yanlış logluyor, bazen protein bazen karbonhidrat
  yanlış → *"I'd rather go back to fitness pal... at least it's accurate"*
- **Uç hatalar:** bir kâse patlamış mısır **8.000 kalori**, bir çikolata barı
  **27 milyon kalori** olarak loglanmış

**Şirketin kendi yasal uyarısı** — doğruluk iddiasından kaçınıyor:
> *"We do not offer medical advice. Any and all recommendations should be viewed
> as suggestions, please consult with a professional and do your own research."*

> **Kritik gözlem:** Cal AI hiçbir yerde bir doğruluk oranı **yayınlamıyor.**
> 361 bin oy ve 4.8 puanla kategorinin en sevilen uygulamalarından biri —
> ama sevilme sebebi doğruluk değil, **sürtünmesizlik.** Kullanıcı 3 saniyede
> logluyor ve sayının doğru olup olmadığını kontrol etmiyor.
> Bu, pazarın doğruluğa değil **kolaylığa** para verdiğinin en net kanıtı.

#### 🔥 EN GÜÇLÜ KANIT: NIH kontrollü metabolik mutfak çalışması (Temmuz 2026)

**Bu sorunun en iyi bağımsız cevabı ve en yeni veri.**

- **Kim:** Aaron Hengist PhD + Olivia Charles, **NIDDK / NIH Intramural Program**
- **Nasıl:** NIH Clinical Center'ın **kontrollü metabolik mutfağı.** Malzemeler
  **0.1 gram hassasiyetle** tartılarak hazırlanan **102 besin-kontrollü öğün.**
  Referans: ulusal gıda kompozisyon tabloları.
- **Nerede:** NUTRITION 2026 (American Society for Nutrition), 25–28 Temmuz 2026,
  President's Oral Session
- ⚠️ **Statü: konferans bildirisi (abstract) — hakemli tam makale değil (henüz)**

**Sonuç: dört uygulama da sistematik olarak ~%33 EKSİK tahmin ediyor.**

| Uygulama | Kalori eksik tahmini | %95 GA |
| --- | --- | --- |
| Appediet | −252 kcal | 295–210 |
| MyFitnessPal | −327 kcal | 385–269 |
| Lose It! | −333 kcal | 383–282 |
| **Cal AI** | **−345 kcal ← en kötü** | 392–296 |

- **Yağ: dördü de ~30 g eksik** tahmin etti
- En zor vaka: **yüksek yağlı / ketojenik öğünler**
- MyFitnessPal ve Lose It! düşük kalorili öğünlerde daha kötü

> Hengist: *"These apps tend to underestimate calories, especially from fats, so
> what they actually ate is likely higher than what the app shows."*

<https://www.sciencedaily.com/releases/2026/07/260726015237.htm> ·
<https://www.healio.com/news/primary-care/20260804/ai-photobased-calorietracking-tools-underestimate-them-by-33> ·
<https://medicalxpress.com/news/2026-07-photo-based-calorie-tracking-apps.html>

> **ÇARPICI ÇELİŞKİ:** Cal AI kendi sitesinde *"about 80% accurate"* diyor.
> NIH testinde **en kötü performansı gösteren uygulama oldu.** Ve yeni sahibi
> MyFitnessPal'ın CEO'su Cal AI'ı *"speed over accuracy"* diye tanımlıyor.

#### Nutrition5k — sektörün dayandığı temel makale (ve yanlış alıntılanışı)

Thames et al., **CVPR 2021, Google.** 5.000 kafeterya tabağı, robotik rig,
derinlik kamerası, her malzeme tartılmış. <https://arxiv.org/abs/2103.03375>

| Model | Kalori MAE | Kalori % hata |
| --- | --- | --- |
| Baseline | 150.8 kcal | 60.2% |
| **2D Direct Prediction** ← *saf fotoğraf* | **70.6 kcal** | **26.1%** |
| Depth 4. kanal | 47.6 kcal | 18.8% |
| **Volume Scalar** ← *en iyi* | **41.3 kcal** | **16.5%** |

İnsan karşılaştırması: **4 profesyonel diyetisyen %41 hata**, 16 amatör %53.
⚠️ **Ama bu karşılaştırma yalnızca 10 görüntü üzerinden yapıldı.**

> SnapCalorie'nin ana sayfadaki *"2x Nutritionist Accuracy"* iddiası **bu 10
> görüntülük alt çalışmadan** geliyor — üstelik en iyi rakamlar **derinlik
> sensörü + robotik rig + kafeterya tabağı** koşulunda. Telefonla çekilmiş bir
> ev yemeğinin doğruluğu değil. Wade Norris makalenin ortak yazarı ve
> SnapCalorie'nin kurucusu; akademik makalenin itibarı pazarlamada ürüne
> transfer ediliyor. **SnapCalorie ürününü test eden bağımsız yayın bulunamadı.**

#### LLM tabanlı tahmin — hakemli çalışmalar

**(a) 3 LLM karşılaştırması** — *Current Developments in Nutrition* (2025),
52 standart fotoğraf. <https://pmc.ncbi.nlm.nih.gov/articles/PMC12513282/>

| Besin (MAPE) | ChatGPT-4o | Claude 3.5 Sonnet | Gemini 1.5 Pro |
| --- | --- | --- | --- |
| **Enerji** | **35.8%** | **35.8%** | **64.2%** |
| Karbonhidrat | 47.9% | 72.8% | 66.1% |
| Protein | 60.7% | 61.7% | 109.9% |
| Yağ | 51.8% | 41.7% | 89.6% |

- Tüm modellerde **sistematik eksik tahmin**; porsiyon büyüdükçe doğruluk düşüyor
- Modeller görsel ipucu yerine **"tipik porsiyon" varsayımına kaçıyor**
- Yanlış tanıma katastrofik: çırpılmış yumurta → makarna sanıldı, **%1788 hata**

**(b) Çok-veri-setli çalışma — kültürel fark burada ölçülüyor**
<https://pmc.ncbi.nlm.nih.gov/articles/PMC13306177/>

| Enerji MedAPE | Haiku 4.5 | Sonnet 4.6 | Opus 4.6 |
| --- | --- | --- | --- |
| **Japon yemekleri** (n=691) | 51.5% | 35.9% | 34.9% |
| **ABD öğünleri** (n=1.463) | 38.6% | 33.5% | 32.8% |
| Paketli ürün (etiket okuma) | 37.7% | 19.3% | 14.2% |

- **Ana hata kaynağı porsiyon boyutu** — yemeği doğru tanımak sorunu çözmüyor
- Tuz/sodyum MedAPE **%34–64** (görünmeyen sos ve baharat)
- Japon mutfağı ABD'den zor: **görünmez malzemeler — et suyu, terbiye, sos**
- Yazarların sonucu: klinik kullanımda **insan diyetisyen denetimi zorunlu**

**(c) GPT-4V — Lo et al.** <https://arxiv.org/abs/2312.08592>
- Gıda **tanımada** %87.5 doğruluk (fine-tuning yok)
- Porsiyon hatası: GPT-4V **54.6 g** vs diyetisyen **43.6 g** — yani insanı geçmiyor
- **Kültürel bulgu:** bölge ipucu verilmezse model **pirinç/ekmek gibi Batılı
  temel gıdalara kayıyor**; *"African cuisine"* denince banku/ugali'yi doğru
  tanıyor. **Tüketici uygulamaları kullanıcıya mutfağını sormuyor** — hata
  üretimde canlı.

#### Sert başarısızlık modları — sentez

| Mod | Kanıt |
| --- | --- |
| **Gizli yağ / yemeklik yağ** (en büyük tek sorun) | NIH: dört uygulamada ~30 g eksik |
| **2D fotoğraftan hacim/porsiyon** | Nutrition5k'de derinlik eklemek %26.1 → %18.8 |
| **Karışık yemek, güveç, çorba** | Japon/Asya mutfağında hata belirgin yükseliyor |
| **Sos ve sodyum** | Tuz MedAPE %34–64 |
| **Pişirme yöntemi** | Norris bizzat kabul ediyor: model hesaplayamıyor |
| **Yanlış tanıma → katastrofik** | %1788 hata örneği |
| **"Tipik porsiyon"a kaçma** | Model görüntü yerine önyargı kullanıyor |
| **Aynı öğün, farklı sonuç** | Kranz (UVA): aynı öğün zaman içinde tutarsız logllanıyor |

#### Hata payı şeffaflığı: HİÇBİRİ AÇIKLAMIYOR

| Uygulama | Doğruluk iddiası | Güven aralığı |
| --- | --- | --- |
| Cal AI | *"about 80% accurate"* — **tanımsız metrik**, neyin %80'i belirsiz | **Yok** |
| SnapCalorie | *"2x Nutritionist Accuracy"*, Norris: kalori hatası *"under 20%"* | **Yok** |
| Foodvisor | Doğruluk iddiası yok, sadece kilo kaybı sonucu | **Yok** |
| MyFitnessPal / Lose It! | Doğruluk yüzdesi yayınlamıyor | **Yok** |

> **Kullanıcı "512 kcal" görüyor, "512 ± 170 kcal" değil** — oysa NIH verisine
> göre gerçek belirsizlik tam olarak bu büyüklükte. Bu, ürün tasarımında
> doldurulmamış en dürüst boşluk.

#### Uzman eleştirisi + yeme bozukluğu riski

**Sibylle Kranz, RD (University of Virginia)**, Eylül 2026 testi:
> *"I could give you dozens of examples where I took a photo of something I ate,
> and then I had to correct it because it misinterpreted what's there."*

Gizlilik uyarısı: *"Over time, it's almost as if the AI knows what you have in
your pantry and in your fridge."*
<https://techxplore.com/news/2026-09-nutrition-expert-ai-diet-tracking.html>

**National Alliance for Eating Disorders:** risk altındaki veya iyileşmekte olan
biri için sürekli kalori takibi ve geri bildirim *"monitoring behavior"* gibi
hissettirip **takıntıyı besleyebiliyor.** Adım hedefi/gıda günlüğü gibi nötr
görünen özellikler bile mükemmeliyetçiliği pekiştirebiliyor.
`[not: yazı hiçbir uygulamayı isimlendirmiyor, sayısal veri vermiyor]`
<https://www.allianceforeatingdisorders.com/ai-algorithms-and-eating-disorders/>

American Academy of Pediatrics ergenlerde kilo kaybı için kalori kısıtlamasını
**önermiyor.** Cal AI özelinde bağlam: kurucular 17 yaşındaydı, kitle büyük
ölçüde TikTok kaynaklı genç.

#### 🔴 Cal AI veri ihlali (2026)
"vibecodelegend" takma adlı saldırgan ~**14.59 GB** veri sızdırdı:
**3M+ kullanıcı**, ~2.8M benzersiz e-posta (~1.2M'i Apple private relay), isim,
cinsiyet, doğum tarihi, boy, kilo, abonelik ve işlem kayıtları. İddia:
**kimlik doğrulaması olmayan Google Firebase backend.** En az bir kayıt 2014
doğumlu bir çocuğa ait. **Şirket olayı kamuya doğrulamadı.**
<https://cybernews.com/security/calai-app-users-exposed-after-alleged-breach/> ·
<https://hackread.com/cal-ai-myfitnesspal-data-breach-3m-users/>

#### SnapCalorie ve Foodvisor — künye

| | SnapCalorie | Foodvisor |
| --- | --- | --- |
| Şirket | Perception Labs, Inc. | Foodvisor (Paris, FR) |
| Kurucu | **Wade Norris** (Google Lens kurucu ortağı), Scott Baron | — |
| Yatırım | **$2M seed** + $125K pre-seed (Accel, Index, YC, Eric Roza) | **$6.2M** toplam (Kima, Bpifrance, Agrinnovation) |
| App Store | **4.73 / 6.514 oy** | **4.59 / 17.280 oy** (Editors' Choice) |
| Fiyat 2026 | Aylık **$19.99**, yıllık **$149.00** | `[bulunamadı]` |
| Teknik | iPhone Pro'da **LiDAR derinlik ölçümü**, 500K+ USDA gıda, 100+ besin | foto+ses+metin+barkod, vitamin/mineral, oruç, su |
| Ölçek | — | App Store'da "15 milyon kullanıcı" iddiası |

> ⚠️ Yaygın bir hata düzeltmesi: **SnapCalorie'yi Wilson Hsu kurmadı.**
> Kurucular Wade Norris ve Scott Baron. <https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/>

Foodvisor pazarlama iddiası: *"users lose an average of 15.83 lb in 3 months"* —
dipnotta **iç araştırma**, n=4.419, ortalama BMI 34.72, Ocak 2026. Bağımsız değil.

#### Cal AI — gelir ve ölçek (hepsi self-reported)

| Yıl | Rakam | Not |
| --- | --- | --- |
| 2024 | $1M | CEO beyanı |
| Mayıs 2025 | $35M+ run-rate | Latka röportajı |
| 2025 | ~$30–35M | Latka **tahmini**, şirket teyidi yok |
| Mart 2026 | **$40M ARR** | self-reported |

Bootstrapped — **sıfır dış sermaye.** İlk yayın 8 Nisan 2024. Ekip 2024'te ~6 →
Mayıs 2025'te 17 → 2026'da 7 kişi. Onboarding→ödeme dönüşümü **%20–25.**
**15 dil destekliyor, Türkçe yok.** <https://getlatka.com/companies/calai.app>

Viral hikâye: 4.0 GPA, ACT 34, başvurduğu **18 üniversitenin 15'i reddetti**
(Stanford, Harvard, Yale, MIT, Columbia dahil). Paylaştığı deneme **22M+
görüntülenme.** <https://techcrunch.com/2025/04/03/teen-with-4-0-gpa-who-built-the-viral-cal-ai-app-was-rejected-by-15-top-universities/>

### ⭐ Soru 4 — Hangi uygulama beslenmeyi antrenmanla GERÇEKTEN bağlıyor?

**CEVAP: Hiçbiri. Bu doğrulanmış bir boşluk.**

- **MacroFactor** — sektörün en ciddi metodoloji oyuncusu, Ocak 2026'da Workouts
  uygulamasını çıkardı ve **kendi dokümanında** iki uygulamanın birbirini
  ayarlamadığını yazıyor. Sadece kilo/ölçü/period/foto senkronize oluyor.
  <https://help.macrofactorapp.com/en/articles/381-how-does-macrofactor-workouts-integrate-with-macrofactor-nutrition>
- **MyFitnessPal / Lose It! / Cronometer** — egzersizi *kalori olarak* içeri
  alıyorlar (üstelik çifte sayım riskiyle). Bu entegrasyon değil, aritmetik.
- **RP** — hem Hypertrophy hem Diet uygulaması var ama **ayrı ürün, ayrı
  abonelik, ~$400/yıl.** Resmî SSS: *"the hypertrophy training bundle does not
  include the diet app."* Veri paylaşımı açıklaması yok, sadece HealthKit.
- **Carbon** — antrenman modülü yok, sadece "aktivite seviyesi" girdisi
- **Avatar Nutrition** — 🟡 **kategorinin tek birleşik paketi.** Beslenme +
  Exercise tek abonelikte, Exercise **RIR tabanlı adaptif progresyon** yapıyor.
  ⚠️ Ama antrenman verisinin makro algoritmasını beslediğine dair açıklama
  **yok** — entegrasyon paketleme düzeyinde. Ve uygulamanın toplam indirmesi
  **8.000.** Yani boşluğu dolduran var ama kimse görmüyor.

"Gerçek bağlantı" ne demek olurdu (rakiplerin yapmadığı):
antrenman hacmi/yoğunluğu → o günün karbonhidrat ve kalori dağılımı;
periyodizasyon fazı (bulk/cut/peak) → makro stratejisi;
performans düşüşü → kalori açığının fazla olduğunun sinyali;
deload haftası → expenditure tahmininin düzeltilmesi.
**Hiçbir uygulama bu döngüyü kapatmıyor.**

### ⭐ Soru 5 — Yemek tercihi / bütçe / kültürel mutfak kişiselleştirmesi

**Tier 1'de: yok. Hiçbiri.** MacroFactor, MFP, Cronometer, Lose It! —
dördü de "hedefi ver, gerisini kullanıcı halletsin" modelinde. MFP'nin 2026 Plan
sekmesi ve Intent satın alması bu yöne ilk adım ama tercih/bütçe/kültür
kişiselleştirmesi değil, tarif önerisi.

**Kültürel mutfak — kanıtlanmış sistematik boşluk:**
Sydney çalışması (yukarıda) Asya diyetinde **~1.520 kJ eksik tahmin** ölçtü.
Hint mutfağı için MFP veritabanı kalitesi çok değişken, Cal AI ağırlıklı olarak
ABD/Batı yemekleriyle eğitilmiş. `[ikincil kaynaklar, birincil doğrulama kısmi]`

Boşluğu doldurmaya çalışan **küçük, yerel oyuncular** çıkıyor (CalFix — Hint
mutfağı + Hintçe/Bengalce arayüz; bazı uygulamalar Orta Doğu/Güney Asya/Afrika
mutfağı iddiasında). Yani **niş talep kanıtlanmış, büyük oyuncular girmemiş.**
> Türk mutfağı için özel bir çözüm `[bulunamadı]` — Levent için doğrudan ilgili.

**🟢 İstisna — Fitia:** İncelenen 20 uygulamada kültürel kişiselleştirmeyi
gerçekten yapan **tek oyuncu.** LatAm için yerel ülke malzemeleriyle
kişiselleştirilmiş tarifler, **kıtaya özel 1M yiyecek ve tarif veritabanı.**
10M+ Play indirmesi ve **4.86 App Store puanıyla** kategorinin en sevilen
uygulamalarından biri. <https://www.healthtechalpha.com/venture/fitia>
> **Kanıt niteliği:** Bir bölgeye özel veritabanı kurmak işe yarıyor ve
> ödüllendiriliyor. Türkiye/Orta Doğu için aynı boşluk **açık.**

Kısmi diğerleri: **Nutritionix** ABD'de dominant (760+ restoran zinciri menüsü,
ABD/Kanada market ürünlerinin %95'i) — ama uygulama terk edilmiş durumda.
**Yazio** Avrupa'da güçlü `[doğrulanmadı]`.

**Alerji/tercih:** Lifesum'da diyet presetleri var ama **alerji listesi eksik ve
şirket bunu açıkça itiraf ediyor.**
<https://help.lifesum.com/en/article/allergies-not-supported-in-lifesum-1erloy5/>

**Bütçe kişiselleştirmesi: 20 uygulamanın hiçbirinde yok. Sıfır.**
**Hiçbir uygulama maliyet-başına-protein optimize etmiyor.** Kategorinin en
büyük ve en boş alanı. Ayrı bir kategori (öğün planlama) bunu kısmen yapıyor:
Eat This Much (~$5/ay yıllık), Mealime Pro ($5.99/ay), eMeals — ama bunlar
kalori/koçluk tarafını yapmıyor. Not: **PlateJoy 2025'te, Yummly Aralık
2024'te kapandı** — bu alt kategori konsolide oluyor. `[ikincil kaynak]`

### ⭐ Soru 6 — İnsülin direnci, metabolik sağlık, bel çevresi takibi

**Ana akım kalori uygulamalarında neredeyse yok:**
- **MacroFactor:** vücut çevre ölçüleri (bel dahil) var — Workouts ile senkronize.
  İnsülin direnci / metabolik belirteç **yok.**
- **Lose It! Premium:** glukoz, kolesterol, tansiyon **loglanabiliyor** —
  ama hedefi etkilemiyor, sadece defter.
- **Cronometer:** biyometrik loglama var (kan değerleri girilebiliyor);
  mikrobesin açığı analizi metabolik sağlığa en yakın özelliği.
- **MyFitnessPal:** `[bulunamadı]` — GLP-1 doz takibi var, metabolik belirteç yok.

**Tier 2'den eklenenler:**
- 🟢 **Fitia** — incelenen tracker'lar içinde **bel çevresi takip eden tek
  uygulama** (bel, kalça, kol, uyluk, göğüs + vücut yağ % + ilerleme fotoğrafı)
- 🟡 **Noom** — biyobelirteç kiti (27 May 2026, $125): 17 marker (ApoB, Lp(a),
  LDL, HDL, trigliserit, HbA1c, hs-CRP, testosteron, estradiol, LH, DHEA-S,
  D vit, B12). ⚠️ **Açlık insülini / HOMA-IR listede YOK** — yani insülin
  direnci ölçülmüyor. <https://www.noom.com/in-the-news/noom-at-home-biomarker-test-kit/>
- 🟡 **Lifesum** — 2024'te **Lykon'u satın aldı**, Metabolic DNA Test satıyor —
  **ama sadece İsveç'te.** Fiilen pilot aşamada.
- 🔴 **Zoe** — **Eylül 2025'te CGM ve kan yağı testini BIRAKTI.** Artık
  algoritmayla tahmin ediyor. Yani kategorinin metabolik ölçüme en yakın
  oyuncusu **ölçümden geri çekildi.**

**Bu işi gerçekten yapanlar ayrı bir kategoride ve kalori takibi yapmıyorlar:**
- Insara — insülin direncine özel, evde açlık insülini test kiti ile entegre
- HOMA-IR Tracker — HOMA-IR skoru hesaplama/izleme
  <https://apps.apple.com/us/app/homa-ir-tracker/id6458546219>
- Signos, Levels, Veri — CGM tabanlı metabolik sağlık

> **Net sonuç: 20 uygulamanın hiçbiri insülin direncini ölçmüyor veya takip
> etmiyor.** Bel çevresini takip eden 3 (Fitia, MacroFactor, Carbon kısmen).

**Bilimsel arka plan (2026, güncel):** WEAR-ME çalışması giyilebilir cihaz
zaman serisi + rutin kan biyobelirteçleriyle HOMA-IR'ı derin sinir ağıyla
tahmin etmeyi başardı — *Nature*, 2026.
<https://www.nature.com/articles/s41586-026-10179-2>
> Yani **insülin direncini kan testi olmadan tahmin etmek 2026'da bilimsel olarak
> mümkün hale geliyor ve hiçbir beslenme uygulaması bunu kullanmıyor.**

---

## 3 · TIER 2 — İnceleme

### 3.1 "Adaptive coaching" kümesi — Carbon · RP Diet · Avatar Nutrition

> **Önce iki brief düzeltmesi:**
> 1. **Avatar Nutrition kapanmadı** — 8 Eylül 2026 itibarıyla aktif, sürüm 2.25.8,
>    aynı gün güncellenmiş.
> 2. **Jeff Alberts Avatar'ın kurucusu değil.** Gerçek kurucular **Mark Springer
>    (CEO)** ve **Katie Coles, MS RDN CPT.** Alberts 3DMJ koçu; bağlantı
>    doğrulanamadı. Ayrıca RP'de **"Dr. Nicholas Bird" diye biri bulunamadı** —
>    RP'nin bilim ekibi: Mike Israetel, Eric Trexler, Milo Wolf,
>    Pak Androulakis-Korakakis. <https://rpstrength.com/pages/science>

#### Karşılaştırma tablosu

| | **Carbon Diet Coach** | **RP Diet Coach** | **Avatar Nutrition** |
| --- | --- | --- | --- |
| Sahip | Reform LLC | RP Strength LLC | Avatar Nutrition LLC (Austin TX) |
| Kim | **Layne Norton PhD — danışman değil, KURUCU ORTAK** + Keith Kraker RD | Mike Israetel (kurucu ortak, *"head designer of Hypertrophy and Diet Coach Apps"*) + Nick Shaw (CEO) | Mark Springer + Katie Coles RDN |
| Fiyat / ay | $11.99 | $14.99–$19.99 | **$9.99** |
| Fiyat / yıl | $99.99 | $99.99–$149.99 | **$97.99** |
| Ücretsiz deneme | **yok** | 14 gün `[doğrulanmadı]` | 14 gün |
| iOS puan | **4.8 / 8.1K** | 4.4 / 12K | 4.8 / ~650 |
| iOS toplam indirme | 250K+ | **1M+** | **sadece 8K+** |
| Başlangıç formülü | **modified Müller** (LBM üzerinden) | açıklanmamış | **Harris-Benedict** |
| **Öğrenen TDEE modeli** | **HAYIR** | **HAYIR** | **HAYIR** |
| Ayarlama kadansı | haftalık | haftalık | haftalık + **günlük nudge** |
| Kalori sayısı gösteriyor mu | evet | **HAYIR** | evet |
| Antrenman aynı sistemde | hayır | **hayır — 2 ayrı abonelik, ~$400/yıl** | **evet — tek abonelik** |
| Kültür / bütçe kişiselleştirme | yok | yok | yok |
| İnsülin / bel çevresi / metabolik | yok | yok | yok |

#### Carbon Diet Coach — teknik detay
Kendi help dokümanı (birincil kaynak):
<https://help.joincarbon.com/en/articles/14005628-how-carbon-sets-and-adjusts-your-macros>
- Başlangıç: *"a modified Müller equation combined with your actual stats and
  preferences"* — kilo, tahmini vücut yağı → LBM, aktivite, hedef, diyet tercihi
- Protein LBM üzerinden **sabitlenir**; ayarlama karb/yağ üzerinden yapılır
- Kilit cümle: *"Rather than a static TDEE calculation, Carbon adjusts weekly
  during check-ins."* → sürekli güncellenen bir expenditure sayısı **yok**
- Kademeli değerlendirme: Hafta 1 = başlangıç/bitiş kilosu; Hafta 2 = haftalık
  ortalama; Hafta 3+ = *"rolling average across your full weigh-in history"*
- **Coach Trend Weight** — *"a proprietary algorithm based on multiple techniques
  and statistical methods"*; yeni tartıda **tüm geçmişi geriye dönük yeniden
  hesaplıyor.** Gerçek istatistiksel model — ama sadece **kilo** için, harcama için değil.
  <https://help.joincarbon.com/en/articles/6078877-coach-trend-weight>
- İlginç istisna: hedefin dışında yediysen ama ilerleme doğru yöndeyse, Carbon
  hedefleri **reçeteye değil, fiilen yediğine göre** ayarlayabiliyor
- **AI: "Smart Logger"** — foto + doğal dil → taslak girdi, bulutta çalışıyor.
  Şirket sınırı net çiziyor: *"builds a starting draft, not a finished entry."*
  <https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger>

> **🔴 Carbon'un en büyük yapısal zayıflığı — compliance duvarı:**
> Hedeflere uymazsan hedefler güncellenmiyor; **uyumsuz bir check-in
> değerlendirmeyi başa sıfırlıyor.** Gerçek hayatta çoğu insan uyumsuz.
> MacroFactor tam tersini yapıyor (eksik veriye dayanıklı).
> <https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in>

#### RP Diet Coach — teknik detay
- Haftalık review: önceki haftanın **ortalama** kilosuna göre makro artır/sabit/azalt
- Günlük kalori sıfırlanmıyor, **hafta ortalaması** tutuluyor; gün içinde hedefin
  %15'i içinde kalman isteniyor <https://rpstrength.com/pages/diet-coach-app>
- **TDEE göstermiyor — günlük toplam kaloriyi bile göstermiyor.** Sadece öğün
  bazlı makro hedefleri.
- 1.5 güncellemesinde **otomatik makro optimizasyonu KALDIRILDI**; otomatik
  değişiklik artık sadece öğün zamanlamasında. Gerekçe: *"consistency over
  perfection"* <https://rpstrength.com/blogs/articles/rp-diet-coach-app-update-top-questions>
- AI: nutrition label scanner + meal scanner (fotoğraftan porsiyon tahmini)
- **Diet ve Hypertrophy ayrı ürün, ayrı abonelik.** Resmî SSS: *"No, the
  hypertrophy training bundle does not include the diet app."*
  Hypertrophy $34.99/ay · $299.99/yıl. **İkisini alan yılda ~$400 ödüyor.**
  <https://rpstrength.com/pages/hypertrophy-app>

> **Sinyal:** 1M+ indirme ama yıldız ortalaması 4.4 ve **yazılı yorum ortalaması
> 3.7 (1.626 yorum).** Büyük taban, düşük memnuniyet. Şikâyetler: katılık
> (öğün başına sabit makro, "busy" saatte yemek yiyememe), plato durumunda
> **sert ayarlamalar** (karbonhidratın 200g'dan 50g'a indiği bildirilmiş),
> redesign sonrası UI/bug şikâyetleri, zayıf besin veritabanı.

#### Avatar Nutrition — teknik detay
- **Harris-Benedict.** Teknik eleştiri: onboarding'de **vücut yağı yüzdesi
  soruyor ama hesaplamada kullanmıyor** — elinde LBM verisi varken
  Katch-McArdle/Cunningham yerine Harris-Benedict kullanıyor.
  <https://feastgood.com/avatar-app-review/>
- Uyum eşiği: makro hedeflerinin **±5 gram** içinde kalınırsa ayarlama yapılıyor
- **Ayırt edici: günlük mikro-düzeltme.** *"Daily Macro Adjustments"* önceki günün
  gerçekleşen alımına göre bugünün hedefini kaydırıyor — amaç haftalık ortalamayı
  bantta tutmak. **Üç uygulama içinde tek günlük kadanslı mekanizma.**
  <https://www.avatarnutrition.com/how-it-works/features>
- Şirket iddiası: *"continuously refined using data from more than 120,000 users"*
  (farklı sayfalarda 100K/120K/130K/150K — tutarsız, `[şirket beyanı, doğrulanmadı]`)
- AI foto tanıma Nisan 2026'da eklendi
- 🟢 **Beslenme + antrenman TEK abonelikte.** *"One subscription gives you access
  to Avatar Nutrition and Avatar Exercise."* Avatar Exercise **RIR tabanlı adaptif
  progresyon** kullanıyor. <https://www.avatarnutrition.com/exercise>
  ⚠️ Ama antrenman verisinin makro algoritmasını **beslediğine dair açıklama yok** —
  entegrasyon paketleme düzeyinde, veri düzeyinde `[doğrulanmadı]`
- Canlı koç sohbeti 7/24; carb-fat tercihi, High-Low Day, alkol takibi, adet döngüsü
- Gelir ~$1.8M, ~11 çalışan `[LeadIQ/ZoomInfo tipi veri satıcısı — doğrulanmadı]`
- Bootstrapped

> **Avatar = "iyi ürün ≠ büyüme" vakası.** Kategorinin tek birleşik
> beslenme+antrenman sistemi, en ucuzu, 4.8 puanı var — **ve sadece 8.000 indirme.**
> Dağıtımda ölü. Levent için bu doğrudan bir uyarı: ürün üstünlüğü tek başına yetmiyor.

---

### 3.2 Ana akım tracker kümesi — Lifesum · Yazio · Fitia · Foodvisor · MacrosFirst · Nutritionix · AteMate

> **Adaptive TDEE sorusunun cevabı: yedisinde de YOK. Sıfır.**
> Hiçbiri kullanıcının gerçek alım + kilo verisinden harcamayı geri hesaplamıyor.

| Uygulama | Denklem | Öğreniyor mu? | Gerçekte ne yapıyor |
| --- | --- | --- | --- |
| **Lifesum** | Mifflin-St Jeor ([help](https://lifesum.helpshift.com/hc/en/3-lifesum/faq/235-how-do-you-calculate-the-calorie-goal/)) | **Hayır** | Plato durumunda dokümantasyon *"sabırlı ol"* diyor, hedefi yeniden hesaplamıyor |
| **Yazio** | Mifflin-St Jeor — **formülü birebir yayınlamış** ([help](https://help.yazio.com/hc/en-us/articles/4410156873233-How-does-Yazio-calculate-my-calorie-goal)) | **Hayır** | Aktivite faktörü *"sabit bir değer"*. BMI>30 için *"Harris-Benedict'i kendin hesapla, hedefini elle ayarla"* diyor — **itiraf niteliğinde** |
| **Fitia** | Mifflin-St Jeor `[doğrulanmadı — yayınlamıyor]` | **Kısmen — yedisinde tek yaklaşan** | Opt-in *"Auto Adjustments"*: plato tespitinde kaloriyi **%5–10 kaydırıyor**. Sadece kilo logundan tetikleniyor, **alım verisi kullanılmıyor** ([help](https://fitia.app/en/help/articles/automatic-calorie-adjustments/)) |
| **Foodvisor** | `[bulunamadı]` — help center denklemi hiç açıklamıyor | **Hayır** | Sadece egzersiz kalorisi geri ekleme |
| **MacrosFirst** | Yok — kullanıcı hedefini gram cinsinden kendi giriyor | **Hayır, motor hiç yok** | Saf loglama aracı |
| **Nutritionix Track** | `[bulunamadı]` | **Hayır** | Kalori/makro sadece izlenen bir alan |
| **AteMate** (eski Ate) | Yok — **tasarım gereği** | **Hayır** | *"Calories and macros are optional learning tools, not daily targets."* |

#### Ölçek tablosu (8 Eylül 2026, iTunes API + Play Store'dan doğrudan çekildi)

| Uygulama | App Store puan / oy | Play puan / yorum | Play indirme | Sahip |
| --- | --- | --- | --- | --- |
| Lifesum | **4.65 / 150.629** | 4.4 / ~369K | **10M+** | Lifesum AB (Stockholm) |
| Yazio | **4.70 / 50.421** | 4.4 / ~844K | **50M+** | YAZIO GmbH (Erfurt) |
| Fitia | **4.86 / 20.999** | 4.8 / ~452K | **10M+** | Nutrition Technologies SAC (Lima) |
| Foodvisor | 4.59 / 17.280 | 4.7 / ~197K | 10M+ | Foodvisor (Paris) |
| MacrosFirst | **4.86 / 21.421** | 4.8 / ~5.98K | 100K+ | MacrosFirst, Inc. |
| Nutritionix Track | 4.75 / 43.627 | **4.2 / ~20.3K** | 1M+ | **Syndigo LLC** |
| AteMate | 4.79 / 10.323 | **4.1 / ~560** | 100K+ | Piqniq, Inc. |

> **Rebranding trendi:** Lifesum → *"Lifesum: AI Calorie Counter"*, Yazio →
> *"AI Calorie Tracker by Yazio"*, Foodvisor → *"Foodvisor - AI Calorie Counter"*,
> Ate → *"AteMate Food Journal: AI Coach"*. **Dördü de 2025–2026'da adına AI koydu.**

#### Fiyatlandırma 2026 (App Store IAP listesinden, ABD — SEO bloglarının uydurduğu değil)

| Uygulama | Aylık | Yıllık | Not |
| --- | --- | --- | --- |
| **Lifesum** | $21.99 / $29.99 | **$99.99–119.99** | kategorinin **en pahalısı** |
| **Yazio** | $11.90–32.99 | **$23.90–47.90** | en ucuz büyük oyuncu |
| **Fitia** | $19.99 | $53.99–59.99 | **+ "Fitia Coins" mikro-ödeme katmanı** |
| **Foodvisor** | $14.99–39.99 | $83.99–89.99 | matris çok dağınık → agresif A/B testi |
| **MacrosFirst** | $11.99 | $71.99–79.99 | — |
| **Nutritionix Track** | **$5.99** | **$28.99** | kategorinin en ucuzu, açık ara |
| **AteMate** | $9.99 / $19.99 (Coach) | $49.99 | **ücretsiz katman yok** |

> **Kaynak spam'inin somut kanıtı:** Lifesum'ın 2026 yıllık fiyatı için SEO
> siteleri sırasıyla $30.99, $45, $49.99, $50, $99.99 diyor — **beşi de yanlış.**
> Gerçek IAP listesi $99.99–$119.99.

#### Öne çıkan bulgular

**🟢 Fitia — kültürel kişiselleştirmede kategorinin lideri**
LatAm için yerel ülke malzemeleriyle kişiselleştirilmiş tarifler, **kıtaya özel
1M yiyecek ve tarif veritabanı.** ABD-merkezli rakiplere karşı gerçek bir hendek.
Ayrıca **vücut ölçüleri (bel, kalça, kol, uyluk, göğüs)** takip eden tek
tracker — bel çevresi sorusunun cevabı. Y Combinator S21, kurucular Piero
Linares & Ulises Olave. <https://www.healthtechalpha.com/venture/fitia>

> **🔴 "Fitia Coins" krizi — kategorinin en öğretici olayı.** Yıllık premium
> ödeyen kullanıcılar tarif/öğün planı üretmek için **ayrıca coin harcamak**
> zorunda: *"50 coins per meal, that's 10 recipes per month"*, *"OVERNIGHT they
> removed that feature"*.
> **Bu, LLM token maliyetinin abonelik marjını yediğinin açık kanıtı.**
> Levent'in fiyatlandırma modelini kurarken doğrudan dikkate alması gereken veri.

**🟡 Lifesum — metabolik sağlığa tek ciddi hamle**
**2024'te Lykon'u satın aldı** (Almanya, biyobelirteç-tabanlı kişiselleştirilmiş
beslenme). Uygulama içinden Metabolic DNA Test satılıyor — **ama sadece
İsveç'te.** <https://help.lifesum.com/en/article/lifesum-lykon-f7e3f5/>
İnsülin direnci yok, bel çevresi yok. Sadece **10 besin öğesi** izliyor
(SEO bloglarının dediği "22 nutrient" yanlış).
Finansal (tek sert veri): FY2023/24 geliri **220M SEK**, EBITDA 24.4M SEK.
Yatırımcılar: Balderton, NGP Capital, Bauer Media `[doğrulanmadı]`.
Zayıflık: son 250 App Store yorumunun **184'ü ≤3 yıldız.** "Verified by Lifesum"
etiketli ürünlerde bile veritabanı hatası; barkod 0 veya 1 kalori logluyor;
AI tracker doğru değeri gösterip loga yanlış yazıyor (990 kcal → 431 kcal).

**🟢 Yazio — kategorinin en dürüst metodoloji iletişimi**
Mifflin-St Jeor'u erkek/kadın ayrımıyla **birebir yayınlamış**, neden
Broca/Harris-Benedict kullanmadığını açıklamış. Bilim gerçek, iddia abartısız —
sadece adaptif değil. Bootstrap/fonlanmamış `[doğrulanmadı]`. **50M+ Play
indirmesiyle Avrupa'nın varsayılanı.** Zayıflık: 250 yorumun 188'i ≤3 yıldız —
reklam yoğunluğu, tekrarlayan koçluk mesajları, ara verince ilerlemeyi silmesi.

**🔴 Nutritionix Track — çürüyen varlık, doğrudan fırsat**
**Syndigo LLC 4 Haziran 2018'de satın aldı.** Veritabanı artık Syndigo'nun B2B
ürününün motoru — **tüketici uygulaması stratejik olarak yetim.**
2026 yorumları sistematik arıza gösteriyor: hesaba giriş yapılamıyor, doğru
şifre reddediliyor, **kullanıcılar yıllarca birikmiş logunu kaybediyor**
(birden fazla bağımsız yorum). Play puanı **4.2 — kategorinin en düşüğü.**
Bir kullanıcı: *"the company sold the app and it now is for corporate use only."*
> Ve bu uygulama **en ucuz fiyatlı ($28.99/yıl) ve en iyi ABD restoran verisine
> sahip** (760+ zincir menüsü, ABD/Kanada market ürünlerinin %95'i).
> **Terk edilmiş bir kullanıcı kitlesi.**

**🟡 AteMate — yedisinde tek gerçekten substantif LLM kullanımı**
Foto tanıma değil: **aylar geriye giden tam bağlamlı AI Coach.** Kullanıcı
kendi verisi üzerine soru soruyor — *"Neden perşembeleri çöküyorum?"*
v5.0 (Ağustos 2026) tüm uygulamayı bunun etrafında yeniden kurdu.
Kalori hedefi **yok, tasarım gereği** — anti-diyet konumlandırması.
Zayıflık: **ücretsiz katman yok ve bu onboarding'in sonuna kadar söylenmiyor**
(yorumlarda defalarca "scam"/"liar"). AI geri bildirimi kalibre değil:
muz+çilek+yağsız yoğurda *"yüksek işlenmiş şeker"* diyor.
Yaş/kilo/boy/cinsiyet **hiç sorulmuyor.**

**⚠️ Foodvisor — kullanılmaması gereken bir iddia**
*"JMIR mHealth'te %87 doğruluk"* iddiası SEO çiftliklerinden geliyor.
Doğrudan kontrol edildi: JMIR'daki ilgili çalışmalar **CALO mama** ve **Keenoa**
hakkında, **Foodvisor hakkında değil.**
<https://mhealth.jmir.org/2025/1/e60070> · <https://www.jmir.org/2022/11/e40449>
**Foodvisor'a ait bağımsız doğrulama çalışması bulunamadı. Bu iddiayı kullanma.**
Ayrıca **7 yıldır yeni yatırım turu yok** (son tur Kasım 2019) — sermaye
açısından en kırılgan büyük oyuncu. Yorumlarda baskın tema **faturalandırma**.

**MacrosFirst** — 57 besin öğesi, alkolü makroya çevirme, Google Sheets otomatik
dışa aktarım, **sınırsız özel günlük hedef (farklı antrenman günleri için)**.
Bilimsel iddia sıfır ve bunu gizlemiyor. 2026 yeniden tasarımı kullanıcı
tabanını böldü: *"Terrible update"*, *"Please go back to the old app"*.

---

### 3.3 Davranış / medikal küme — Noom · Simple · WeightWatchers · Zoe

> **Brief düzeltmesi: Noom'un FTC settlement'ı YOK.** Auto-renewal davası özel
> bir toplu dava: ***Geraldine Mahood v. Noom, Inc.*** (S.D.N.Y.), **$56M nakit +
> $6M abonelik kredisi (~$62M)**, Şubat 2022'de kesinleşti. Sınıf dönemi
> 12 May 2016 – 6 Eki 2020, ~2M kullanıcı, kişi başı ~$167.
> <https://news.bloomberglaw.com/litigation/nooms-56-million-deal-in-unwanted-subscriptions-suit-finalized> ·
> <https://www.deceptive.design/cases/geraldine-mahood-v-noom-inc>
> Kamuya açık bir **FTC icra işlemi bulunamadı.**

| | **Noom** | **Simple** | **WeightWatchers** | **Zoe** |
| --- | --- | --- | --- | --- |
| Giriş fiyatı (yıllık→aylık) | $17.42/ay | ~$30/ay (opak) | **$10/ay** | $15.99/ay (ABD) |
| GLP-1 katmanı | **$179–299/ay ilaç dahil** | yok | $74/ay + ilaç ayrı | yok |
| iOS puan / oy | 4.70 / 871K | 4.69 / 401K | **4.84 / 2.36M** | 4.77 / **7K** |
| Play puan / indirme | 4.1 / 10M+ | 4.5 / 5M+ | 4.3 / 10M+ | **3.8 / 100K+** |
| Trustpilot (1 yıldız %) | 4.5 (%5) | 4.3 (%8) | 4.0 (**%14**) | 4.1 (%11) |
| Gelir | ~$1B ARR (2023 `[tahmin]`) | **$100M (2024), kârlı** | $620–635M (2026 rehberlik) | **yarıya indi, £20M+ zarar** |
| **Adaptive TDEE** | **Hayır** | **Hayır — alımı bile ölçmüyor** | Kısmi/muğlak | Yok (kalori yok) |
| İnsülin direnci | Hayır (HbA1c var) | Hayır | `[bulunamadı]` | Hayır |
| Metabolik kan paneli | **Evet — 17 marker, $125** | Hayır | klinisyen üzerinden `[doğrulanmadı]` | **artık hayır — tahmin ediliyor** |
| Beslenme+antrenman tek sistem | Hayır | Hayır | Hayır | **hiç egzersiz yok** |
| AI: gerçek mi süs mü | loglama gerçek, Face Scan süs | ürünün merkezi ama sığ | **süs** (kazanç çağrısında geçmiyor) | **ölçümün yerini alıyor — riskli** |

#### Noom — CBT iddiası büyük ölçüde ambalaj
Ürünün mekaniği: **düşük kalori bütçesi + kalori yoğunluğuna göre trafik ışığı
sınıflandırması** (yeşil/sarı/turuncu). Sertifikalı bir CBT protokolü
(düşünce kaydı, davranışsal deney, terapist süpervizyonu) **yok.**
- **Louise Adams**, klinik psikolog (25 yıl, yeme bozuklukları): *"Noom bir
  diyet."* Psikolojiyi *"yeme bozukluğu iyileşme literatüründen kötüye
  kullanılmış kavramlar dizisi"* diye tanımlıyor.
  <https://untrapped.com.au/a-psychologist-reviews-the-dark-psychology-of-noom-part-1/>
- RD eleştirisi: renk sınıflandırması tutarsız, besin yoğun gıdalar turuncuya
  düşüyor; başlangıç kalori hedefi çoğu kişi için fazla düşük.
  <https://healthline.com/nutrition/noom-diet-review>

**En büyük RCT — ve sonucu zayıf:** McCallum ve ark., *Obesity Science &
Practice* 2026, n=427, 16 hafta müdahale + 52 hafta takip.
68. hafta: Noom −%4.05 vs kontrol +%1.46. ≥%5 kaybeden %41 vs %19.5.
> ⚠️ **Noom, Inc. tarafından finanse edildi. Baş yazar Noom'un kendi Araştırma
> Direktörü. Kilo uygulama üzerinden beyana dayalı, klinikte ölçülmedi.
> Örneklem %83 kadın.** 16 haftalık aktif programda sadece %1.2 kayıp; program
> bittikten *sonra* kaybın artması metodolojik olarak tuhaf.

**Biyobelirteç kiti (27 Mayıs 2026, $125):** 17 marker — ApoB, Lp(a), LDL, HDL,
trigliserit, HbA1c, total testosteron, estradiol, LH, DHEA-S, hs-CRP, D vit, B12.
**Açlık insülini / HOMA-IR listede YOK** — yani insülin direnci ölçülmüyor.
<https://www.noom.com/in-the-news/noom-at-home-biomarker-test-kit/>

Diğer: değerleme $3.66B (2021 Series F, Silver Lake), toplam fon $657.3M.
BBB A+ ama **3 yılda 628 şikâyet, son 12 ayda 147.** Eski kıdemli mühendis
ifadesi: iptal süreci **kasten zorlaştırıldı.**

#### Simple — alımı bile ölçmüyor
Fortune incelemesi net: uygulama **"ne kadar yediğini sormuyor"**, porsiyon
yakalanmıyor. Sert kalori bütçesi yerine "kalori dengesi rehberliği".
<https://fortune.com/article/simple-app-review/>
Ölçek: 20M+ indirme, **800K+ aktif abone**, 2024 geliri **$100M (+%64 YoY),
operasyonel kârlı.** $35M Series B (Hartbeat Ventures/Kevin Hart, Ekim 2025).
Avo AI koçu Ocak 2025'te tek ayda **19M koçluk mesajı** gönderdi.
Avo'nun temel LLM'i **açıklanmamış.**
> Simple, klinik çerçeve iddiası yapmıyor — bu yönüyle Noom/Zoe'den **dürüst.**

#### WeightWatchers — çekirdek iş çöküyor, klinik büyüyor
**Chapter 11 sonucu:** Mayıs 2025 prepackaged başvuru → **24 Haziran 2025'te
çıkış.** ~**$1.15B borç silindi (>%70)**; kreditörler yeni özkaynağın **%91'ini**
aldı, mevcut hissedarlar %9. Nasdaq'ta WW olarak işlem görmeye devam ediyor.
<https://www.stblaw.com/about-us/news/view/2025/06/25/weightwatchers-completes-financial-reorganization-following-chapter-11-plan-approval>

| | Q4 2025 | **Q2 2026** |
| --- | --- | --- |
| Gelir | $163M (−%12) | **$162.3M (−%14.2)** |
| Toplam abone | 2.8M | **2.489M (−%24.6)** |
| Davranışsal gelir | — | **$121.5M (−%22.7)** |
| Klinik abone | 130K (+%42) | **197K (+%55.7)** |
| Klinik gelir | $27M (+%32) | **$39.9M (+%30.4) = toplamın %24.6'sı** |

> **GLP-1 ilaçları WW'nin ana ürününü yiyor; şirket kendi kannibalize edicisini
> satarak hayatta kalmaya çalışıyor.** Davranışsal kilo verme kategorisinin
> yapısal olarak çöktüğünün en net finansal kanıtı.

Points metodolojisi: kalori tabanı üzerinde bir algoritma — **şeker ve doymuş
yağ Points'i yükseltir, protein ve lif düşürür.** WW'nin *"#1 doktor tavsiyeli"*
iddiası 2023 Cerner Enviza'nın **500 doktorla yaptığı anket** — klinik kanıt değil.
WW, adaptasyon iddiasını **açıkça yazan tek uygulama**: *"Vücudunuz değiştikçe
Bütçeniz platoları aşmanıza yardımcı olacak şekilde güncellenir."* Ama
mekanizma açıklanmamış — muhtemelen sadece güncellenen kiloyla denklemin
yeniden hesaplanması `[tahmin/doğrulanmadı]`.

#### Zoe — kişiselleştirme iddiasından kendisi geri çekildi

**🔴 Bu araştırmanın en çarpıcı tek olayı:** Zoe **Eylül 2025'te CGM ve kan yağı
testini BIRAKTI.** Kan şekeri ve kan yağı yanıtları artık **algoritmayla tahmin
ediliyor.** <https://www.which.co.uk/reviews/nutrition-and-supplements/article/zoe-review-is-it-worth-it-aOVeL1R5BW52>
> Ölçülen biyolojiyi tahminle değiştirmek, **orijinal kişiselleştirme yığınının
> maliyetini haklı çıkaramadığının şirketin kendi itirafı.**

**Bilim gerçek ama iddiayı taşımıyor:**
- PREDICT 1: n=1.102 (230 ikiz çifti, TwinsUK), *Nature Medicine* 2020 — gerçek
  bilim. <https://pubmed.ncbi.nlm.nih.gov/32528151/>
- METHOD RCT: *Nature Medicine*, Mayıs 2024, n=347, 18 hafta. Trigliseritte
  anlamlı düşüş; **LDL-kolesterolde anlamlı fark YOK**; ortalama **2.5 kg**
  kayıp (0.15 kg/hafta).

**Bağımsız eleştiri — sert ve isabetli.** Dr. Nicola Guess (Oxford Üniversitesi,
akademik diyetisyen):
> Deney, Zoe programını **tüm desteğiyle bir broşüre karşı** test etti —
> **kişiselleştirmenin kendisinin işe yarayıp yaramadığını test etmedi.**
> Sadece müdahale kolu yemek logladı. Körleme yok; CGM'ler sürekli hatırlatıcı
> işlevi gördü.

Guess ayrıca: *"Zoe'nin algoritmalarının tekrarlanabilir olduğuna dair hiçbir
kanıt yok."* Mikrobiyom 1–2 haftada değişiyor, tek örnek geçersizleşiyor.
Anekdotal olarak **herkese aynı tavsiye** çıkıyor: "daha çok bitki ye, daha az
rafine karbonhidrat ye."
<https://www.nutraingredients.com/Article/2024/05/10/Zoe-hails-personalized-nutrition-trial-success-results-come-under-scrutiny/> ·
<https://drguess.substack.com/p/personalised-nutrition>

Which? beslenme uzmanı, 6 ay test ettikten sonra: *"iddia edildiği gibi gerçekten
kişiselleştirilmiş beslenme tavsiyesi sunduğuna ikna olmadım."*

**Finansal çöküş:** Ağustos 2025 mali yılı — **£20M+ zarar (önceki yılın
neredeyse iki katı), gelir neredeyse yarıya indi, 139 kişi işten çıkarıldı.**
Test kiti ~£299.99 → **~£149**, aylık üyelik £24.99 → **£9.99** (~%60 indirim).
<https://www.thegrocer.co.uk/news/zoe-gut-health-app-losses-swell-as-it-slashes-membership-price/718306.article>

> **Zoe = "en çok bilim, en az ürün" vakası.** Kategorinin en ciddi akademik
> temeline sahip şirketi, ticari olarak en hızlı küçülen şirket.
> Levent için uyarı: **bilimsel derinlik tek başına iş modeli değil.**

---

## 4 · Çapraz kesit bulgular — kanıtlanmış pazar boşlukları

> Bunlar "olsa iyi olurdu" listesi değil. Her biri **birincil kaynakla
> doğrulanmış bir eksiklik.** Faz 3'te (Boşluk × Bilim kesişimi) kullanılacak.

### Boşluk 1 — Öğrenen metabolizma modeli tek bir uygulamada var
20 uygulamada gerçek adaptive TDEE yapan: **MacroFactor.** Carbon/RP/Avatar
"adaptive" diyor ama haftalık kural motoru. Kitlesel pazar Mifflin-St Jeor'da.
**Ve MacroFactor bu modeli açıkça "secret sauce" diye saklıyor** — yani teknik
olarak taklit edilebilir, patent engeli `[bulunamadı]`.
→ *Savunma hattı algoritma değil, kalibrasyon + veri + şeffaflık.*

### Boşluk 2 — Beslenme ile antrenman hiçbir yerde tek sistem değil
- MacroFactor: iki ayrı app, **kendi dokümanında** birbirini ayarlamadığını yazıyor
- RP: iki ayrı abonelik, ~$400/yıl
- Avatar: tek abonelik ama veri düzeyinde entegrasyon `[doğrulanmadı]`, 8K indirme
- Diğerleri: egzersizi sadece kalori olarak içeri alıyor (çifte sayım riskiyle)

**Kimsenin kapatmadığı döngü:** antrenman hacmi → o günün karb/kalori dağılımı ·
periyodizasyon fazı → makro stratejisi · performans düşüşü → açığın fazla
olduğunun sinyali · deload → expenditure tahmininin düzeltilmesi.

### Boşluk 3 — Belirsizlik hiçbir ekranda gösterilmiyor
NIH testine göre foto-tabanlı tahminlerin gerçek hatası **~330 kcal (%33 eksik).**
Hiçbir uygulama tahminin yanında güven aralığı göstermiyor. Kullanıcı
*"512 kcal"* görüyor, *"512 ± 170 kcal"* değil.
> Tek dürüst çerçeve: bu araçlar mutlak kalori ölçer değil, **tutarlı sapmalı
> trend takipçisi.** Sapma sabit kaldığı sürece işe yarar — ama kimse bunu söylemiyor.

### Boşluk 4 — Kültürel mutfak sistematik olarak cezalandırılıyor
Ölçülmüş: Asya diyetinde manuel loglama **~1.520 kJ eksik** (Nutrients 2024);
Japon yemeklerinde LLM enerji hatası ABD öğünlerinden sistematik yüksek
(35.9% vs 33.5%, Sonnet). GPT-4V bölge ipucu verilmezse **Batılı temel gıdalara
kayıyor** — ve tüketici uygulamaları kullanıcıya mutfağını sormuyor.
**Cal AI 15 dil destekliyor, Türkçe yok.**
> **Türk mutfağı için doğrudan test bulunamadı** — ama mekanizma (zeytinyağlı,
> sulu yemek, görünmez yağ, karışık güveç) literatürün "en kötü" dediği kategori.
> Bu, Levent'in **kendi elleriyle üretebileceği orijinal birincil veri.**

### Boşluk 5 — Metabolik sağlık ile kalori takibi ayrı dünyalar
Kalori uygulamalarında insülin direnci / HOMA-IR / metabolik belirteç yok.
Lose It! ve Cronometer bunları **loglatıyor ama hedefi etkilemiyor** — defter.
İşi yapanlar (Insara, HOMA-IR Tracker, Signos, Levels, Veri, Zoe) kalori
takibi yapmıyor.
> **2026 bilimsel açılımı:** WEAR-ME çalışması giyilebilir cihaz zaman serisi +
> rutin kan biyobelirteçleriyle HOMA-IR'ı derin sinir ağıyla tahmin etti
> (*Nature*, 2026). <https://www.nature.com/articles/s41586-026-10179-2>
> **İnsülin direncini kan testi olmadan tahmin etmek mümkün hale geliyor ve
> hiçbir beslenme uygulaması bunu kullanmıyor.**

### Boşluk 6 — Uyumsuz kullanıcı cezalandırılıyor
Carbon: uyumsuz check-in değerlendirmeyi **başa sıfırlıyor**; hedeflere uymazsan
hedefler güncellenmiyor. RP: plato durumunda sert kesintiler (200g → 50g karb).
MacroFactor tam tersi (eksik veriye dayanıklı, "shame yok" tasarımı) — ve
kategorinin en yüksek memnuniyetine sahip.
> **Gerçek hayatta çoğu insan uyumsuz.** Plana uymayı ön koşul yapan sistem,
> tam da en çok yardıma ihtiyacı olan kullanıcıyı dışarı atıyor.
> Bu, `00-plan.md`'deki **B ucu (mükemmeliyetçi, başlayamayan)** hipotezinin
> doğrudan pazar kanıtı.

### Boşluk 7 — Yemek tercihi / bütçe kişiselleştirmesi kimsede yok
Tier 1 ve adaptive kümesinin tamamı: "hedefi ver, gerisini kullanıcı halletsin."
Bütçeyi yapan ayrı kategori (Eat This Much, Mealime, eMeals) koçluk yapmıyor —
**ve o kategori konsolide oluyor** (PlateJoy 2025'te, Yummly Aralık 2024'te kapandı).

### Boşluk 8 — Kanıt kalitesi: kimse kendi iddiasını bağımsız test ettirmiyor
Kategorinin **tamamında** aynı desen:
- **MacroFactor:** hata payını yayınlıyor (kategoride tek) ama veri tamamen
  kendi tescilli setinden, hakemli yayın yok, örneklem "transformation
  challenge" katılımcıları — yani seçilmiş ve aşırı motive
- **Noom:** en büyük RCT'si **Noom fonlu**, baş yazarı **Noom'un kendi Araştırma
  Direktörü**, kilo beyana dayalı, 68 haftada %4.05
- **Zoe:** METHOD RCT'si kişiselleştirmeyi değil **"program vs broşür"**ü test
  etti; Dr. Nicola Guess (Oxford): *"Zoe'nin algoritmalarının tekrarlanabilir
  olduğuna dair hiçbir kanıt yok."*
- **Simple:** gözlemsel şirket verisi, kendi kendini seçmiş kohort
- **Foodvisor:** "%87 doğruluk / JMIR" iddiası **başka uygulamaların
  çalışmasına ait** — Foodvisor'a ait doğrulama yok
- **WW:** *"#1 doktor tavsiyeli"* iddiası **500 doktorla yapılan bir anket**

> **Hiçbirinde bağımsız fonlu, aktif-kontrollü, kişiselleştirmenin kendisini
> izole eden bir deney yok.** Bunu yapan ilk oyuncu kategoride tek başına durur.

### Boşluk 9 — LLM maliyeti abonelik marjını yiyor (ürün tasarımı uyarısı)
**Fitia Coins vakası:** Yıllık premium ödeyen kullanıcılar tarif/öğün planı
üretmek için **ayrıca coin harcamak** zorunda bırakıldı —
*"50 coins per meal, that's 10 recipes per month"*, *"OVERNIGHT they removed
that feature"*. Fitia'nın 4.86 puanlı, en sevilen tracker'lardan biri olmasına
rağmen en büyük kullanıcı krizi bu.
> **Levent için doğrudan sonuç:** LLM'i çekirdek döngüye koyarsan birim maliyet
> aboneliği aşabilir. Ağır hesap (istatistiksel model) ucuz, LLM pahalı —
> mimari bu ayrımı baştan yapmalı.

### Boşluk 10 — Terk edilmiş kullanıcı kitlesi
**Nutritionix Track:** Syndigo LLC 2018'de satın aldı; veritabanı artık B2B
ürününün motoru, **tüketici uygulaması stratejik olarak yetim.** 2026
yorumlarında kullanıcılar giriş yapamıyor ve **yıllarca birikmiş logunu
kaybediyor.** Play puanı 4.2 — kategorinin en düşüğü.
> Ve bu uygulama **en ucuz ($28.99/yıl) ve en iyi ABD restoran verisine sahip**
> olan. Aktif olarak terk edilmiş, ödeme yapmaya alışkın bir kitle.

Benzer kırılganlık: **Foodvisor 7 yıldır yeni yatırım turu almadı**;
**Zoe'nin geliri yarıya indi, 139 kişi çıkardı**; **WW'nin davranışsal geliri
−%22.7.** Kategorinin orta katmanı çözülüyor.

### Boşluk 11 — Arama sonuçları kirli (dolaylı ama sömürülebilir)
Kategorinin doğruluk sorusunu Google'a soran kullanıcı, **rakip bir kalori
uygulamasının yazdığı** sahte inceleme okuyor. Somut örnek: `ai-food-tracker.com`
MyFitnessPal için *"%71.2 tanıma doğruluğu, 500 görüntülük test seti, ±%18
porsiyon hatası, Doğu Asya %58.3"* gibi çok kesin rakamlar yayınlıyor —
**hiçbir metodoloji, veri seti veya yayın referansı yok**, hiçbir hakemli
kaynakta doğrulanamıyor. `[muhtemelen uydurma]`
> Dürüst, metodolojisi açık, gerçekten test eden içerik **rekabetsiz bir alan.**
> Bu doğrudan Levent'in YouTube kanalı ile uygulaması arasındaki köprü.

---

### Fiyat haritası — 2026 (doğrulanmış rakamlar)

| Uygulama | Aylık | Yıllık | Free tier |
| --- | --- | --- | --- |
| Cronometer Gold | $10.99 | **$59.99** | **cömert** (özel makrolar dahil) |
| MacroFactor | $11.99 | **$71.99** | **yok** (7 gün deneme) |
| MacroFactor bundle (+Workouts) | — | $89.99 | yok |
| Avatar Nutrition | **$9.99** | $97.99 | yok (14 gün deneme) |
| Carbon Diet Coach | $11.99 | $99.99 | **yok, deneme de yok** |
| RP Diet Coach | $14.99–19.99 | $99.99–149.99 | 14 gün `[doğrulanmadı]` |
| RP Hypertrophy | $34.99 | $299.99 | — |
| MyFitnessPal Premium | $9.99–19.99 | $49.99–79.99 | var (barkod paywall'da) |
| Lose It! Premium | — | $39.99 `[App Store]` | var |
| **Lifesum** | $21.99–29.99 | **$99.99–119.99** | var (özel kalori hedefi bile premium) |
| **Yazio** | $11.90–32.99 | **$23.90–47.90** | var |
| **Fitia** | $19.99 | $53.99–59.99 | var + **"Coins" mikro-ödeme** |
| **Foodvisor** | $14.99–39.99 | $83.99–89.99 | var (AI foto premium) |
| **MacrosFirst** | $11.99 | $71.99–79.99 | var (barkod ücretsiz) |
| **Nutritionix Track** | **$5.99** | **$28.99** | var |
| **AteMate** | $9.99 / $19.99 | $49.99 | **yok** |
| **Noom Weight** | $70 | $209 (12 ay) | 7 gün deneme |
| Noom GLP-1Rx | **$279–299/ay** (ilaç dahil) | — | — |
| **WW CORE** | — | **$10/ay** (12 ay taahhüt) | — |
| WW MED+ | — | $74/ay + ilaç ayrı | — |
| **Simple** | ~$30/ay (opak) | — | **deneme yok** |
| **Zoe Plus (ABD)** | $15.99 | $99.99 | — |
| SnapCalorie | $19.99 | $149.00 | "free forever" çekirdek |
| Cal AI | ~$2.99–9.99 | ~$29.99 | yok (foto tarama tamamen paywall'da) |

> **Okuma — üç ayrı fiyat bandı var:**
> 1. **Hacim bandı ($24–60/yıl):** Cal AI, Nutritionix, Yazio, AteMate, Fitia.
>    Cal AI $29.99/yıl ile $40M ARR yapıyor — çünkü hacim satıyor.
> 2. **Ciddi koçluk bandı ($72–100/yıl):** MacroFactor, Carbon, RP, Avatar,
>    MacrosFirst, Zoe. **Burası sıkışmış** — herkes aynı yerde duruyor.
> 3. **Medikal bant ($200–3.600/yıl):** Noom, WW MED+. GLP-1 reçetesi
>    kategorinin gelir merkezini buraya çekiyor.
>
> Lifesum $99.99–119.99 ile **hacim ürünü fiyatına koçluk fiyatı** istiyor —
> ve 250 yorumun 184'ü ≤3 yıldız. Konumlandırma hatası.
