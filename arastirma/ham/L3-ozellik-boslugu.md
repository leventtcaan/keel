# L3 · Özellik boşluğu: masa bahisleri, Apple platformu, geçiş maliyeti, "hayat araya girer", yaratıcı öneriler

> Araştırma tarihi: 2026-09-29 · Durum: TAMAM (ilk tur)
> Okunan bağlam: `CLAUDE.md`, `docs/anayasa.md` (U1-U15, V, K), `04-faz3-urun.md` (Ö-1…Ö-27, §5 yapılmayacaklar, §7, §8),
> `plan/yol-haritasi.md`, `plan/backlog.yaml` (K-001…K-1007), `prototip/keel-prototype.html` (28 ekran metni),
> `ham/B`, `ham/E`, `ham/K1`, `ham/K2`, `ham/L1`, `data/parameters/*.yaml`, `apps/mobile/package.json`.
> Kural: uydurma yok. Bulunamayan **"bulunamadı"**, doğrulanamayan **`[doğrulanmadı]`**. Reddit erişilemedi.
> Efor: S ≈ 1 görev/≤1 gün, M ≈ 2-4 gün, L ≈ bölünmesi gereken iş (K4 kuralıyla).

---

## 0 · Özet (5 madde)

1. **Masa bahislerinde en büyük delikler antrenman ekranında:** birim (kg/lb), set tipi (ısınma/çalışma), plaka hesabı,
   hareket geçmişi + PR listesi, arka planda çalışan dinlenme sayacı (bildirim + Live Activity), süperset, not, özel hareket,
   geçmiş antrenmanı düzenleme. Hevy/Strong/Alpha Progression/MacroFactor Workouts'un **dördünde de** olan bu özelliklerin
   hiçbiri backlog'da yok. Ayrıca **Ayarlar ekranı, bildirimler, koyu mod, Dynamic Type/VoiceOver** için görev yok.
2. **Apple platformunda plan sıfır:** HealthKit okuma ve Apple FM spike'ı dışında Live Activity, widget, App Intents, Watch
   yok. Oysa K1'in kendi kuralı "her yeni API'ye ilk dalgada destek". `expo-widgets` SDK 57'de **stabil** (npm 57.0.22) →
   Live Activity + kilit ekranı "haftanın kararı" widget'ı ucuz. App Intents Expo'da SDK 58'de **alpha**. Watch uygulaması
   Swift ister (L), ve en yüksek puanlı iki rakip (Alpha Progression, MacroFactor Workouts) Watch'sız — masa bahsi değil.
3. **Geçiş maliyeti:** Strong CSV'yi herkes dışa aktarabiliyor (ücretsiz), Hevy yalnız Strong CSV içe alıyor. Apple Health
   kilo geçmişini içe almak bizde neredeyse bedava (okuma zaten var) ve **U15'i hızlandırır** (ilk karar için 14 gün beklemek
   yerine geçmiş veri) — ama U8 ile çelişip çelişmediği bir ADR sorusu.
4. **"Hayat araya girer":** Runna (Holiday + Not Feeling 100%), Gentler Streak (Sick/Injured/On a Break), MacroFactor
   (logging break), Hevy Trainer (Injury Management), Fitbod/MacroFactor (gym profilleri) hepsi çözmüş. Bizde yalnız af
   haftası var. Önerim: **Durum modu** — beyan edilen durum *yeni veridir* (U2 ile uyumlu), motoru `NO_DECISION_YET`
   (neden: CONTEXT) ile duraklatır, tutarlılık paydasını küçültür, af haftasını yakmaz.
5. **Plandaki mantık hataları:** (a) **başlangıç kalori hedefini hesaplayan görev yok**; (b) **kararı hedeflere/programa
   uygulayan görev yok**; (c) 04'ün "en yüksek değerli tek davranış" dediği Ö-20 (hafta 5-8), Ö-18 (19 tetikleyici),
   §7.4 bildirimleri ve §7.5 hafta-hafta akışı **backlog'da hiç yok**; (d) K-408 (M4) → K-504 (M5) geri bağımlılık ve
   fotoğraf→VLM backend görevi eksik; (e) cihazda geliştirme derlemesi M9'a (K-903) kalmış, HealthKit/SIWA M3-M4'te lazım;
   (f) set tipi olmadan ısınma setleri e1RM'i kirletir; (g) onboarding metni "Nothing is written back" diyor, sektör
   standardı antrenmanı Apple Health'e **yazmak**.

---

## 1 · Masa bahsi matrisi (2026)

Kaynak sütunu kısaltmaları: **H** Hevy · **S** Strong · **AP** Alpha Progression · **MFW** MacroFactor Workouts ·
**FB** Fitbod · **LD** Ladder · **CL** Caliber · **RN** Runna · **GS** Gentler Streak.

### 1.1 Ana tablo

| # | Özellik | Sınıf | Bizde var mı | Kanıt (kim yapıyor) | Efor | Hizmet ettiği ilke | Risk / not |
|---|---|---|---|---|---|---|---|
| 1 | **Birim: kg/lb, cm/in** | MASA BAHSİ | **yok** (prototip "Change them in Settings" diyor, görev yok) | Hepsinde standart; ASO planı EN-US birincil (K-1002) | M | U11 global | Motor içte metrik kalır; lb kullanıcısının artış adımı (2,5/5 lb) `load_increment_*_kg` ile uyuşmaz → #9 ile birlikte |
| 2 | **Set tipi: ısınma / çalışma / drop / failure** | MASA BAHSİ | **yok** (K-210 set = ağırlık, tekrar, RIR) | H (Warmup/Normal/Drop/Failure), S, AP, MFW | S | Ö-5, Ö-22 | **Mantık hatası:** ısınma setleri e1RM ve efor metriklerini kirletir. Model değişikliği = şema (K5, sor) |
| 3 | **Isınma seti hesaplayıcı** | MASA BAHSİ | yok | H "Warm Up Set Calculator"; AP "scaled to the exercise, your first working set and the weights you have"; MFW "smart warm-up planner" | M | Ö-5 teknik kapısı (ısınmada teknik prova) | Isınma şeması kaynak ister (U14 motor kuralı sayılırsa); sunum kuralıysa parametre + not yeter |
| 4 | **Plaka hesaplayıcı** | MASA BAHSİ | yok | H, S, AP ("closest weight below if your plates don't add up"), MFW ("based on available plates and bars") | S | U15 (salonda sürtünme) | Salon profiliyle (#9) bağlanırsa ayrıştırıcıya döner |
| 5 | **Dinlenme sayacı arka planda** (yerel bildirim + Live Activity) | MASA BAHSİ | kısmen (K-405 "Dinlenme sayacı", arka plan/bildirim yok) | H "Automatic Rest Timer" + Live Activity; AP Live Activity (sayaç + öneri); MFW Live Activity (v1.2.0, 12 May 2026) | S-M | Ö-Sürtünme | Uygulama kapanınca sayaç ölürse 1 yıldız sebebi; `expo-notifications` yeni bağımlılık (K5) |
| 6 | **Hareket geçmişi + PR listesi** | MASA BAHSİ | **yok** (K-604 yalnız bileşik e1RM trendi) | AP seans sonu rekor özeti ("en iyisi", B §6.4); H canlı PR bildirimi; FB'de PR sekmesi olmaması App Store şikâyeti (B §3.3) | M | Ö-21, Ö-22 | **Güray K-33 ile uyum:** izolasyonda *yük PR'ı* gösterilmez; tekrar/efor PR'ı gösterilir |
| 7 | **Süperset** | MASA BAHSİ | yok | H, S, MFW; FB'de süperset kaydı Watch'la kopuyor (E §7.10) | S-M | — | Program üreticisi (K-211) süperset üretmiyorsa yalnız kayıt tarafı |
| 8 | **Not (hareket ve seans)** | MASA BAHSİ | yok (NL kayıt kısmen) | H "Exercise Notes"; MFW "workout notes", "technique notes and cues"; AP önceki notlar ekranda | S | Ö-15, K-504 | Serbest not LLM'e gidiyorsa V2 rızası |
| 9 | **Salon / ekipman profili** (plakalar, dambıl adımı, makineler; birden fazla salon) | MASA BAHSİ (2026'da) | **yok** | MFW "gym profiles for each of the places you workout… bar types, plate denominations, machines"; FB "Locations under Equipment & Locations" | M | Ö-5 (gerçekçi artış), K-109 | Yokken motor "+2,5 kg" der, salonda 2 kg'lık dambıl adımı varsa öneri uygulanamaz → karar güvenilirliği zedelenir |
| 10 | **Özel hareket oluşturma** | MASA BAHSİ | yok (katalog veri dosyasından) | H (ücretsiz 7 adet), MFW "custom exercise creation" | S | K-210 | Özel hareket bileşik mi izole mi? → motor sınıflamayı sorar (U9 neden-gösterir soru) |
| 11 | **Geçmiş antrenmanı sonradan kaydet/düzenle** | MASA BAHSİ | belirtilmemiş | H "Log Previous Workouts" | S | Ö-19 (uyumsuza dayanıklılık) | Senkron kuyruğunda eski tarihli kayıt → trend yeniden hesap |
| 12 | **Kalıcı vs tek seferlik hareket değiştirme** | MASA BAHSİ | kısmen (K-210 "değiştirme desteklenir") | H Trainer "tek seferlik veya kalıcı egzersiz değişimi"; MFW "smart exercise swap"; LD swap | S | Ö-5 | Kalıcı değişimde progresyon geçmişi hangi harekete bağlanır — tanımsız |
| 13 | **Egzersiz gösterimi (video/animasyon)** | MASA BAHSİ | yok | AP 795 gerçek video; MFW Jeff Nippard videoları; LD koç videoları | — | — | **Ayrı hatta araştırılıyor → `ham/L1-egzersiz-gosterimi.md`** |
| 14 | **Veri dışa aktarma (CSV)** | MASA BAHSİ | kısmen (K-214/K-802 JSON) | S CSV (Settings > Export; ücretsiz/Pro ayrımı Strong yardım sayfasında yazmıyor, üçüncü taraf "free and Pro" diyor `[doğrulanmadı]`); AP CSV; MFW "data export" | S | V6, güven | JSON GDPR için yeter; CSV kullanıcının "kilitlenmem" güvencesi |
| 15 | **Veri içe aktarma (Strong/Hevy CSV, Apple Health geçmişi)** | AYRIŞTIRICI | **yok** (K-211 yalnız program içe alma) | H yalnız Strong CSV'yi, bir kez içe alıyor; MF yemek günlüğünü içe **almıyor**, yalnız günlük toplamı senkronluyor | M | U15, Ö-21 | §3'te ayrıntı |
| 16 | **Koyu mod** | MASA BAHSİ | **yok** (ADR-014 C yönü açık tema) | Apple Accessibility Nutrition Label'da "Dark Interface" ayrı satır | M | — | Token sistemi (K-301) baştan iki temalı kurulmazsa sonradan pahalı |
| 17 | **Dynamic Type + VoiceOver + kontrast** | MASA BAHSİ | **yok** | Apple featuring kriteri "Accessibility"; App Store Connect Accessibility Nutrition Labels (VoiceOver, Larger Text, Sufficient Contrast, Dark Interface, Reduced Motion…) — zorunluluk tarihi **bulunamadı** | M | Featuring (K-1005) | Barlow Condensed büyük punto + dar kart = Dynamic Type'ta taşma riski |
| 18 | **Çevrimdışı** | MASA BAHSİ | **var** (K-304) | LD indirilebilir antrenman; RP offline yok (B §6.5) | — | — | — |
| 19 | **Antrenmanı Apple Health'e yazma** (halkalara kredi) | MASA BAHSİ | **yok — ve prototip "Nothing is written back" diyor** | H "HealthKit… export your Hevy workouts into the Health app"; S Apple Health (Pro); Apple: Fitness halkaları yalnız HKWorkout ile | S | Ö-Sürtünme | Seçimli yapılmalı; kütüphane destekliyor (`saveWorkoutSample`, @kingstinct 16.0.0 — paket içinde doğrulandı) |
| 20 | **Bildirimler (3 slot, §7.4)** | MASA BAHSİ | **yok** | 04 §7.4 kendi tasarımımız | M | U7, U9, Ö-20 | Görev yoksa §7.4 kâğıtta kalır |
| 21 | **Ayarlar ekranı** (birim, bildirim, rıza geri alma, abonelik, dışa aktarma, hesap silme) | MASA BAHSİ | **yok** (prototip 3 yerde "Settings"e yönlendiriyor) | App Store hesap silme kuralı uygulama içi yol ister | M | V2, V6, U11 | K-802 "uygulama içinden hesap silme" UI'sız kalıyor |
| 22 | **Tarif / ev yemeği hafızası** | AYRIŞTIRICI | **yok** (Ö-16'da "tarif hafızası" var, görev yok) | E §7.3: en sık 3. istek (ev chili'si için 20 dk) | M-L | Ö-16, U5 | Tarif kalorisi yine DB'den (U1) |
| 23 | **Hızlı kalori ekleme / özel gıda** | MASA BAHSİ | belirtilmemiş | MFP, MF, Cal AI (manuel makro düzenleme) | S | U5 | Aralık mı tek sayı mı? Kullanıcının kendi girdiği tek sayı "tahmin" değil, kabul edilebilir |
| 24 | **Tek taraflı (unilateral) / dambıl ağırlık kuralı, vücut ağırlığı hareketleri** | MASA BAHSİ | **yok** | MFW "unilateral tracking"; H'nin dambıl belirsizliği analitiği bozuyor (B §3.1) | S | Ö-22 doğruluğu | Barfiks e1RM'i vücut ağırlığı ister → K-210 yük modeli tanımsız |
| 25 | **Widget (ana ekran/kilit ekranı)** | AYRIŞTIRICI | yok | H "Home Screen Widgets" | S-M | U15 | §2 |
| 26 | **Apple Watch uygulaması** | AYRIŞTIRICI (masa bahsi **değil**) | yok | Var: H, S (bağımsız). **Yok:** AP ("on our roadmap"), MFW (açıklamada yok) — ikisi de 4,8-4,9 | L+ | — | Swift/SwiftUI hedef; kullanım oranı verisi **bulunamadı** |

### 1.2 Masa bahsi olmayan ama sorulacaklar
- **Kardiyo kaydı:** H'de istek var (E §7.6). Bizim tezimizde adım NEAT'i taşıyor; kardiyo kaydı yerine HealthKit'ten
  *workout ve active energy okumak* daha ucuz — ayrıca **K-104 RED-S hesabı egzersiz harcamasını istiyor ama K-404 yalnız
  adım ve uyku okuyor** (bkz. §6).
- **Sosyal akış / liderlik tablosu:** H'nin büyüme sebeplerinden biri (B §3.1) ama U7 ve "koç araçsaldır" (U10) ile gerilimli.
  Önermiyorum; yerine §5'teki kullanıcı-başlatmalı paylaşım kartı.

---

## 2 · Apple platform fırsatları

### 2.1 Tablo

| Yüzey | Rakiplerde | Expo'da yapılabilirlik (SDK 57 kurulu) | Efor | keel'e özgü kullanım | Not |
|---|---|---|---|---|---|
| **Live Activity / Dynamic Island** (dinlenme sayacı, sıradaki set) | H, S (Watch Smart Stack'te de), AP, MFW | `expo-widgets` **stabil** (Expo blog: "stable in Expo SDK 56"); npm'de **57.0.22** SDK 57 ile eşleşiyor. `'widget'` bileşeni hook/state/async kullanamaz; güncelleme sistem tarafından kısılabilir | S-M | Sayaç + "next: 60 kg × 8, RIR 0-1" | Push ile güncelleme iOS 17.2+ push-to-start |
| **Kilit ekranı / ana ekran widget'ı** | H | `expo-widgets` (accessory circular/rectangular/inline; etkileşimli buton iOS 17+) | S | **"This week's call: Hold 2,300 kcal · next review Mon"** — tezi uygulamayı açmadan her gün göstermek (U15) + tutarlılık "11/12" | En yüksek getiri/efor oranı |
| **App Intents / Siri / Kısayollar / Action Button** ("log weight 81.4") | H'de **yok** — ve bir H kullanıcısı Shortcuts için ücretliye geçeceğini yazmış (E §7.7) | SDK 58 beta (15 Eyl 2026) `expo-app-intents` **alpha** ("documentation and examples are coming soon"); SDK 57'de native Swift hedefi (`@bacons/apple-targets` 5.0.0, `app-intent` tipi) | M (58'de) / L (57'de Swift) | Tartı girişi 10 sn → ~2 sn; "log pulldown 60 × 8" | Apple WWDC26'da SiriKit'i deprecate etti, App Intents tek yol (ikincil kaynak `[doğrulanmadı]`) |
| **Control Center kontrolü** | bulunamadı | `expo-widgets` dokümanında yok → native Swift hedef | M-L | "Start today's session" / "Log weigh-in" | App Intents'e bağlı |
| **HealthKit'e yazma** (workout, elle girilen kilo) | H, S (Pro), MF (kilo) | `@kingstinct/react-native-healthkit` 16.0.0 — pakette `saveWorkoutSample`, `saveQuantitySample` var (yerelde `npm pack` ile doğrulandı) | S | Halkalara kredi; Health'te tek kaynak | Onboarding metni değişir (ADR-007 dokunur) |
| **HealthKit'ten active energy + workout okuma** | FB, CL | aynı kütüphane | S | K-104 enerji mevcudiyeti için egzersiz harcaması | V3: saklama ve log kuralları |
| **Apple Watch uygulaması** | H, S | `@bacons/apple-targets` `watch` tipi — watchOS tarafı Swift/SwiftUI; `react-native-watch-connectivity` 2.0.0 köprü | **L+** | Bilekten set işaretleme | Yeni dil + ikinci uygulama; masa bahsi değil (AP, MFW yok) |
| **Apple Foundation Models (cihaz üstü)** | Harvee — **2026 ADA finalisti**: Watch verisini "on-device foundation models" ile yorumluyor | K-510 spike zaten var | M | Serbest metin → kayıt (Katman 1), ücretsiz ve cihazda | Editoryal hikâye: "sağlık verisi cihazdan çıkmıyor" |
| **WorkoutKit** (yapılandırılmış antrenmanı Watch Workout app'e gönderme) | iOS 26'da açık | native | L | Düşük öncelik — kuvvet için sınırlı | — |

### 2.2 Apple editoryal ağırlığı — kanıt
- Apple'ın resmî featuring kriterleri: "Innovation — New technologies that solve a unique problem", "Accessibility",
  "Localization", "App Store product page". https://developer.apple.com/app-store/getting-featured/
- Nomination formunda erişilebilirlik ayrıca soruluyor (K2 §A3).
- Vaka: Gentler Streak (2022 Watch App of the Year, 2024 ADA) — K1 §A7. 2026 ADA finalistleri arasında iki sağlık/fitness
  uygulaması: **Harvee** (cihaz üstü FM ile toparlanma rehberi) ve **The Outsiders** (Gentler Streak ekibinden, Training
  Readiness Score). https://apps.apple.com/us/iphone/story/id1896567319
- **Ölçülmüş "featuring lift" çalışması bulunamadı** (K2 ile aynı sonuç). Yani yeni API benimsemesi *editoryal şansı artıran
  bir girdi*, garanti değil.

### 2.3 Yeni bağlam: Apple kendisi hazırlık skoruna girdi
Apple Watch Series 12 (9 Eyl 2026) "readiness score combining activity, sleep, and other signals" getiriyor
(https://techcrunch.com/2026/09/09/apple-unveils-watch-series-12-and-watch-ultra-4-with-an-ai-upgrade-that-can-recap-your-day/ —
arama özetinden; sayfa açılıp okunmadı `[doğrulanmadı]`). Bu skorun HealthKit'e açılıp açılmadığı **bulunamadı**. Çıkarım: "toparlanma skoru" alanında Apple ile
yarışmak anlamsız; keel'in farkı **karar**, skor değil. Tez korunuyor.

---

## 3 · Geçiş maliyetini düşüren özellikler

| Kaynak | Ne alınabilir | Nasıl | Efor | Değer | Kanıt |
|---|---|---|---|---|---|
| **Apple Health kilo geçmişi** | Son 30-90 gün tartı | Okuma zaten var (K-402) — geri tarihli sorgu | **S** | İlk hafta trend ve (ADR ile) daha erken ilk karar → **U15** | MF de başka kaynaktan günlük toplamı senkronluyor (help.macrofactorapp.com) |
| **Strong CSV** | Tüm antrenman geçmişi | Dosya içe alma; noktalı virgül ayraçlı, ağırlık birimi başlıkta | M | e1RM tabanı → program üreticisi başlangıç ağırlığını tahmin etmez, **bilir** (FB'nin en büyük eleştirisi agregasyondan seed edilen yanlış ağırlık, B §3.3) | Strong yardım: CSV dışa aktarma, "cannot be imported back"; H yalnız Strong CSV içe alıyor, **tek sefer** |
| **Hevy CSV** | Tüm antrenman geçmişi | Dosya | M (Strong'la ortak ayrıştırıcı + hareket eşleme) | 16M+ kullanıcılı tabandan geçiş | Gript, Gainflow, Reps gibi rakipler "native Hevy CSV import" pazarlıyor — pazar pratiği var, **dönüşüm etkisi verisi bulunamadı** |
| **Hevy public API** | Aynı veri, canlı | Kullanıcının API anahtarı | M | — | API **Hevy Pro ister**; anahtar kullanıcı sırrı → V5 ve egress kapısı riski. **CSV yeterli, API önermiyorum** |
| **MyFitnessPal / MacroFactor yemek geçmişi** | — | — | — | Düşük: motor yemek geçmişine değil kilo trendine bakıyor (Ö-14) | MF bile MFP günlüğünü içe **almıyor** (nutriscan, calorie-apps 2026) |

**Hareket eşleme** (Strong/Hevy adı → katalog) 04 §8.2'deki "egzersiz eşleme benchmark'ı yok" boşluğuyla aynı iş:
içe aktarma, eşleme doğruluğunu ölçmek için bedava etiketli veri üretir.

**U8 çelişki kontrolü:** "İlk 14 gün trend yorumu yok" kuralı *kullanıcının keel'deki ilk 14 günü* için mi yoksa *14 günlük
veri* için mi? Kural metni ve K-103 kabulü "İlk 14 gün **ve** penceredeki tartı sayısı eşiğin altındaysa" diyor.
İçe alınan 14+ günlük tartı geçmişi yorumu erken açabilir mi — **Levent kararı (ADR)**. Öneri: içe alınan veri trendi
*gösterir*, ilk *karar* yine en erken 1. pazartesi, güven düzeyi "medium" ile.

---

## 4 · "Hayat araya girer" senaryoları

### 4.1 Rakipler nasıl çözüyor

| Senaryo | Kim / nasıl | Kaynak |
|---|---|---|
| Tatil | RN **Holiday Mode**: 3-21 gün, seyahatte hangi antrenmanların kalacağını kullanıcı seçer | https://support.runna.com/en/articles/10225691-how-to-adjust-your-plan-around-holidays |
| Hastalık | RN **Not Feeling 100%**: 3-14 gün, 4 yoğunluk seviyesi, bitince dönüş hızı seçilir (slowly/balanced/quickly), bitmeden 1 gün önce bildirim | https://support.runna.com/en/articles/13531498-how-to-use-not-feeling-100 |
| Hastalık / sakatlık / mola | GS **Activity Status**: Active · On a Break · Sick · Injured; bildirimleri durdurur, ilerleme sıfırlanmaz, suçlayıcı dil yok | https://docs.gentler.app/personalizing-your-profile/what-happens-when-i-set-my-status-to-sick-injured-or-on-a-br |
| Hastalık (pasif) | Oura **Rest Mode** (vücut ısısı yükselince öneri) | https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode |
| Kayıt tutamama | MF **logging break** modülü: yeterli gün yoksa algoritma durur ve neden durduğunu, ne zaman devam edeceğini söyler; **partial logging** modülü eksik günleri işaretletip dışlar | https://help.macrofactorapp.com/en/articles/251-coaching-module-logging-break · /248 |
| Planı kaçırma | RN **Plan Realignment**: 3+ antrenman ya da 1 hafta kaçınca geri dönüş seçenekleri | https://support.runna.com/en/articles/10026375-how-to-use-the-plan-realignment-feature |
| Sakatlık | H Trainer **Injury Management**: sakatlık seçilir → riskli hareketler değişir ya da uyarı eklenir; iyileşince kaldırılır | hevyapp.com/community-updates/july-26 |
| Salon/seyahat | FB Locations, MFW gym profiles | §1 #9 |
| Doğum / bağlam | Hiçbiri — "Why don't any fitness apps have a 'just had a baby' note?" (E §7.1, MFP yorumu) | E |
| Sınav haftası | **bulunamadı** (hiçbir rakipte yok) | — |

### 4.2 keel önerisi: **Durum modu** (af haftası + NO_DECISION_YET ile birleşimi)

| Durum | Motor | Tutarlılık (U7) | Antrenman | Bildirim | Dönüş |
|---|---|---|---|---|---|
| **Traveling** | Seyahat haftası tartıları trend'de "gürültülü" işaretlenir; karar `NO_DECISION_YET(CONTEXT)` ya da pencere uzar | Planlı eylem sayısı yeniden hesaplanır (payda küçülür); af haftası **yanmaz** | Salon profili "hotel / no equipment"a geçer; hareket eşdeğeri | Antrenman öncesi hatırlatma kullanıcının yeni saatine | Dönüşte 1 hafta "re-baseline", sonra normal |
| **Sick** | Karar yok; kalori düşürme kararı verilmez | Hafta "paused" (P) — ne on-track ne kayıp | Antrenman yok ya da seçimli | Durur (GS gibi) | RN gibi dönüş hızı seçimi; ilk seans önceki yükün altında (oran **kaynak ister, U14**) |
| **Pain / injured** (bölge seç) | O bölgeyi yükleyen hareketlerde progresyon kapısı kapanır | Normal | Bölgeyi yüklemeyen eşdeğere geçiş; keskin ağrıda profesyonele yönlendirme | Normal | Kullanıcı kaldırana kadar |
| **Exam / busy week** | Karar yok (veri düşük kalitede) | Payda "minimum hafta"ya iner | "Minimum doz" oturumu (az set, yüksek efor — Güray minimalizmiyle uyumlu) | Azalır | Otomatik bitiş tarihi |
| **New gym** | — | — | Yeni salon profili; makine farkı → ilk seans "kalibrasyon", yük karşılaştırması o seans için kapalı | — | — |

**İlke kontrolü:** U2 — durum beyanı *yeni veridir*, ısrar değil; kararı meşru olarak değiştirir. U3 — "henüz karar yok"
nedeni görünür (CONTEXT). U6 — "injured/pain" teşhis değil kullanıcı bağlamı; tedavi önerisi yok, yalnız hareket değişimi ve
yönlendirme. U7 — hiçbir durum sayacı sıfırlamaz, telafi istemez. U9 — durum soruyla değil kullanıcı beyanıyla gelir;
chat'te "dizim ağrıyor" / "sınav haftası" (04 §8.4 bu örnekleri zaten chat'e atıyor) → yapılandırılmış onay ekranı.
U14 — dönüş yükü, minimum doz hacmi, gürültülü tartı dışlama süresi **motor kuralıdır → kaynak gerekir**; Güray arşivinde
(G1-G7) karşılığı aranmalı, yoksa literatür. Kaynaksız uygulanmaz.

**Kötüye kullanım riski:** kullanıcı her zor kararda "sick" diyebilir. Bu U2'yi delmez (kararı *ertelemek* kullanıcının
hakkı, *değiştirmek* değil), ama 3. ardışık "paused" haftada motor tek bir neden-gösteren soru sorar (U9 bütçesinden).

---

## 5 · Yaratıcı ama ilkelerle uyumlu öneriler

| # | Öneri | Ne yapar | Sınıf | Efor | Rakipte var mı | İlke uyumu | Risk |
|---|---|---|---|---|---|---|---|
| Y1 | **Kilit ekranında "haftanın kararı" widget'ı** | Karar + sonraki değerlendirme tarihi + "11/12" kilit ekranında | YARATICI | S | Widget var, **karar widget'ı yok** | U3, U15, K1 editoryal | Kilit ekranında sağlık verisi görünür → varsayılan: sayı yerine eylem ("No change this week"), sayı ayarla açılır (V3) |
| Y2 | **Durum modu + dönüş akışı** (§4.2) | Hayat olayını motora veri olarak alır; 7+ gün sessizlikten sonra suçlamasız "welcome back" ve re-baseline | AYRIŞTIRICI | M-L | Parçalı (RN, GS, MF) — **karar motoruyla birleşik olan yok** | U2, U3, U7, Ö-19, Ö-20 | Kural kaynakları (U14) |
| Y3 | **"Kararı ne değiştirir?" önizleyicisi** | Prototipteki "What would change it" satırını etkileşimli yapar: motor, varsayımsal Snapshot'la deterministik çalışır ("gelecek hafta trend düz + uyum ≥%80 → −500 kcal") | YARATICI | M | **yok** — RP/FB/Juggernaut kapalı kutu (B §7.5) | U1 (LLM değil motor), U2 (hangi verinin değiştireceği), Ö-25 | Şekil projeksiyonuyla (U12) karıştırılmamalı: vücut/zaman değil **kural** simülasyonu. Oyunlaştırma (kullanıcı veriyi "ayarlar") riski düşük — motor ölçülen veriye bakar |
| Y4 | **Karar defteri (zaman çizelgesi)** | "12 haftada motor 5 karar verdi: 2 bekle, 1 adım, 1 kalori, 1 deload — her birinin ardından ne oldu" | YARATICI | M | **yok** | Ö-25, Ö-23 (3 aylık pencere), güven | Nedensellik iddiası yok: "after", "because" değil. K-212 kararları zaten Snapshot + hash ile saklıyor → veri hazır |
| Y5 | **Kullanıcı başlatmalı paylaşım kartı** (before/after DEĞİL) | Karar kartı ya da 12 hafta özeti: "The app told me *not* to cut calories — here's why" / "11 of 12 weeks · bench e1RM +8 kg · 5 calls". Cihazda görsel üretilir | YARATICI | S-M | H Year in Review, Strava Year in Sport paylaşımı var; **karar paylaşan yok** | U4 (yağ % yok), U7, U12 (vücut görseli yok), V1 (fotoğraf yok), V3 (kilo varsayılan gizli) | Kanal köprüsü: Levent'in videolarında aynı kart formatı → tanınırlık. Paylaşımın edinime etkisine dair ölçüm **bulunamadı** |
| Y6 | **"Bu set sayılır mı?" — sert set sayacı** | Seans özetinde ısınmalar otomatik düşer; RIR eşiği altındaki setler "hard set" sayılır; haftalık kas başına sert set | AYRIŞTIRICI | S (set tipi #2 sonrası) | H/AP set sayıyor ama **efor filtresiz** (B §6.4 "total volume" sorunu) | Ö-22, Güray minimalizmi | RIR eşiği motor kuralı → kaynak (U14) |
| Y7 | **Salon profiline bağlı gerçekçi artış** | Motorun "+2,5 kg" kararı salonda mümkün en yakın yüke yuvarlanır; mümkün değilse tekrar artışına çevrilir | AYRIŞTIRICI | M (#9 ile) | MFW ekipmana göre program kuruyor; **artış kapısı + yuvarlama birleşik yok** | Ö-5, U3 (uygulanabilir karar) | — |
| Y8 | **Haftalık kısa koç notu** | Pazartesi karar kartının 3 cümlelik anlatımı + haftanın tek odağı; bildirim slot 2 ile gelir | AYRIŞTIRICI | S (K-505 üstüne) | MF check-in var, anlatı yok | U1 (sayılar kararla birebir — K-505 sadakat testi), U10 (isimsiz ses) | LLM maliyeti: kullanıcı başına haftada 1 çağrı; kota dışı tutulmalı (deterministik şablon geri düşüşü) |
| Y9 | **Kural kitabı (herkese açık)** | Her kuralın sade dilde sayfası, uygulamada ve web'de | YARATICI | M | **yok**; H'nin trafiğinin %77'si organik aramadan (B §3.1) | Ö-26, U14, GEO (K-1003) | **Güray içeriğinin yayımlanma izni** gerekir — Levent'in kararı |
| Y10 | **Kişisel hareket takma adları + eşleme benchmark'ı** | "pulldown" → senin salonundaki makine; içe aktarma + düzeltmelerden doğruluk ölçümü; yayımlanırsa Show HN malzemesi | YARATICI | M | **yok** (04 §8.2: benchmark yok) | Ö-15, U5 | Kişisel veriden benchmark → yalnız anonim, rızalı |

**En iyi 5 (getiri/efor + tez uyumu):** Y1, Y2, Y3, Y4, Y5. Y6 ve Y7 masa bahislerini (#2, #9) yaparken neredeyse bedava gelir.

---

## 6 · Mevcut plandaki çelişki ve eksikler

| # | Bulgu | Nerede | Etki | Öneri |
|---|---|---|---|---|
| P1 | **Başlangıç kalori hedefini hesaplayan görev yok.** Merdiven (K-107) var olan hedefi değiştirir; BMR tabanı (K-104) sınırlar; `maintenance_observation_days` parametresi var ama hiçbir kabul kriteri onu kullanmıyor. Prototip 1. günden "2,300 kcal" gösteriyor | K-104/K-107/`nutrition.yaml` | Motorun ilk çıktısı tanımsız | Yeni M1 görevi (§7 #1) |
| P2 | **Kararı uygulayan görev yok.** K-212 kararı kaydeder; "Apply from today" (prototip) ile hedefler/program (deload: yarı set) nasıl değişir tanımsız | K-212, K-502, K-211 | Karar ekranda kalır, programa yansımaz | Yeni M2 görevi (§7 #2) |
| P3 | **Ö-20 (hafta 5-8), Ö-18 (19 tetikleyici), §7.4 bildirimleri, §7.5 hafta-hafta akışı, H5 risk skoru backlog'da yok.** 04 Ö-20 için "ürünün en yüksek değerli tek davranışı olabilir" diyor | backlog geneli | Retention mekanizması kâğıtta | §7 #3, #4, #5 |
| P4 | **K-408 (M4) → K-504 (M5) geri bağımlılık**; ayrıca fotoğraf → VLM → kalem listesi → DB eşleme backend görevi yok (K-504 metin ayrıştırma, K-208 eşleme; görüntü çağrısı hiçbirinde) | K-408, K-504 | M4 çıkışı M5'e bağlı; iş kalemi eksik | K-408'i M5'e taşı ya da yeni backend görevi (§7 #6) |
| P5 | **Cihazda geliştirme derlemesi M9'da** (K-903). HealthKit (K-402/404), SIWA (K-305), kamera Expo Go'da çalışmaz; K-403 spike bile "cihaz" istiyor | K-903, K-305, K-403 | M3-M4 testleri bloke | Yeni M3 chore (§7 #7); K-903'ü paywall'a (K-702) bağlamaktan vazgeç — dahili TestFlight abonelik beklemez |
| P6 | **Set modeli ısınma/çalışma ayrımı yok** → e1RM (Epley) ve efor özetleri ısınma setleriyle kirlenir; vücut ağırlığı ve tek taraflı hareketlerde yük modeli tanımsız | K-210, K-406, K-604 | Motor yanlış veriyle karar verir | §7 #8 (şema → K5, sor) |
| P7 | **Ayarlar ekranı yok** ama prototip 3 yerde oraya yönlendiriyor; K-802 "uygulama içinden hesap silme" ve K-204 "geri alınabilir rıza" UI'sız | K-802, K-204 | App Review riski (hesap silme yolu) | §7 #9 |
| P8 | **"Nothing is written back"** (onboarding Apple Health) sektör standardıyla (H, S workout yazıyor; halkalar yalnız HKWorkout'la) çelişiyor | prototip, ADR-007 | Watch kullanıcısı halka kredisi kaybeder | ADR kararı: seçimli yazma (§7 #12) |
| P9 | **RED-S (K-104) egzersiz enerji harcaması istiyor, K-404 yalnız adım+uyku okuyor** | K-104, K-404 | LEA kontrolü hesaplanamaz ("hesaplanabiliyorsa" kaçış maddesi hep devrede kalır) | K-404 kabulüne active energy + workout okuma |
| P10 | **Birim yok** ama global/EN-US hedef (U11, K-1002). lb kullanıcısının artış adımı kg parametresiyle uyuşmaz | K-301/K-205, `training.yaml` | ABD kullanıcısı için giriş engeli | §7 #10 |
| P11 | **Apple platform görevi yok** (widget, Live Activity, App Intents) ama K1 kuralı "ilk dalgada destek" ve K-1005 featuring başvurusu bunun üstüne kurulu | M4-M10 | Editoryal koz boşa | §7 #11, #13 |
| P12 | **Erişilebilirlik ve koyu mod hiçbir görevde yok**; token sistemi (K-301) tek temalı kurulursa sonradan pahalı | K-301 | Featuring formu erişilebilirliği soruyor | K-301 kabulüne iki tema + Dynamic Type; ayrı denetim görevi |
| P13 | **Saat dilimi / hafta sınırı** yalnız kota için tanımlı (K-508). Check-in günü, haftalık tutarlılık ve seyahatte saat dilimi değişimi tanımsız | K-111, K-212 | Seyahatte hafta kayar, sayaç yanlış | K-111/K-212 kabulüne yerel saat dilimi kuralı |
| P14 | **Ö-14 sapma kalibrasyonu ve Ö-16 tarif hafızası** 04'te özellik, backlog'da görev yok | Ö-14, Ö-16 | Fotoğraf loglamanın sistematik eksik sayımı hedefi yanlış kurar (04 kendi uyarısı) | §7 #14, #15 |
| P15 | **Expo SDK yükseltme planı yok.** SDK 58 beta 15 Eyl 2026'da çıktı (`expo-app-intents` alpha içinde). Changelog özetine göre SDK 58 iOS 27 hedefliyor `[doğrulanmadı — asgari iOS sürümü kesin okunmadı]` | ADR-006 | App Intents için yükseltme şart | §7 #13 içinde spike |
| P16 | 04 §K1 "MVP = karar mantığı + tek güven kanıtı, kalan her şey v2" diyor; yol haritası "MVP diye kısma yok" diyor | K1-lansman-otopsileri §E6 vs yol-haritasi | Belge içi çelişki | Levent kararı yol haritasında; K1 notu "reddedildi" diye işaretlenebilir |

---

## 7 · Backlog'a eklenmesi önerilen görevler (öncelik sıralı)

> Biçim backlog şemasına uygun taslak. ID'ler Levent onayından sonra verilir. "Şema/bağımlılık" içerenler K5 gereği önce sorulur.

1. **Başlangıç hedefi ve bakım gözlem dönemi** — M1 · engine · M
   - Profil + tartıdan başlangıç kalori hedefi; formül ve kaynak parametre dosyasından (U14)
   - `maintenance_observation_days` boyunca hedef değişmez; karar `NO_DECISION_YET(reason: OBSERVING)`
   - Hedef BMR tabanının altında başlayamaz (K-104 ile ortak test)
2. **Karar uygulama: kararın hedeflere ve programa yansıması** — M2 · decision + training · M
   - Onaylanan karar (kalori/adım/deload/progresyon) tek değişkeni günceller; diğerleri değişmez (U3 testle)
   - Deload kararı programın set sayısını parametredeki orana göre düşürür, bitiş koşuluyla
   - Uygulama zamanı ve geri alma kaydı denetim izinde
3. **Bildirim sistemi: üç slot (§7.4)** — M4 · mobile · M · *yeni bağımlılık: expo-notifications (sor)*
   - Antrenmandan 30 dk önce (kullanıcının kendi cümlesiyle) · pazartesi check-in · 7 gün sessizlikte tek öz-şefkat mesajı
   - Haftada ≤3; hafta içi jenerik yok; metinler `en.json`, yasaklı ifade testi
   - Durum modu (Sick/Exam) bildirimleri susturur
4. **İlk 8 hafta akışı + hafta 5 risk skoru (Ö-20, §7.5)** — M5 · engine + mobile · L (bölünür)
   - H1-H8 içerikleri (H4 nöral açıklama, H6 "kas" dili ilk kez, H7 hafta 1 vs 7) takvimden değil kullanıcının haftasından tetiklenir
   - Risk skoru girdileri (af haftası kullanımı artışı, kayıt düşüşü) parametreden ve kaynaklı
   - Risk yüksekken ek soru bütçesi ≤5 (U9)
5. **Proaktif tetikleyiciler (Ö-18)** — M5 · engine · M
   - Güray'ın 19 tetikleyicisinden en az adım düşüşü, 2 kaçan antrenman, kuvvet düşüşü, "hiç aç değilim" (ilk 2 gün)
   - Her tetikleyici kural kimliği + kaynak taşır; haftalık bütçeyi aşmaz
6. **Öğün fotoğrafı analizi backend'i (VLM → kalemler → DB eşleme)** — M5 · coach + nutrition · M
   - Görüntü ≤1024 px, EXIF'siz, yalnız AI rızasıyla egress kapısından
   - VLM yalnız kalem + porsiyon ipucu döner; kalori DB'den aralıkla (U1, U5); şema dışı çıktı atılır
   - K-408 bu göreve bağlanır ve M5'e taşınır
7. **EAS geliştirme derlemesi + dahili TestFlight** — M3 · mobile · S
   - Cihazda dev build; SIWA ve HealthKit izin diyaloğu gerçek cihazda görüldü
   - Bundle kimliği/imzalama yapılandırmada; K-903 artık K-702'ye bağlı değil
8. **Set tipi ve yük modeli** — M2 · training · S · *şema (sor)*
   - Set tipi: warm-up / working / drop / failure; e1RM ve efor metrikleri yalnız working setten
   - Vücut ağırlığı hareketi (ek yük + vücut ağırlığı) ve tek taraflı (sol/sağ) kaydı
   - K-406, K-604 testleri ısınma setini dışlar
9. **Ayarlar ekranı** — M3 · mobile · M
   - Birim · bildirim slotları · rızalar (görüntüle/geri al) · abonelik (duraklat/iptal) · veri dışa aktar · hesap sil
   - Prototipteki üç "Settings" yönlendirmesi bu ekrana çıkar
10. **Birim sistemi (kg/lb, cm/in)** — M3 · mobile + profile · M
    - Motor ve depolama metrik; dönüşüm yalnız sunumda; yuvarlama kuralları parametreden
    - lb kullanıcısında artış adımı salon profilinden (görev 16) ya da lb varsayılanından
11. **Antrenman seansı: dinlenme sayacı arka planda + Live Activity** — M4 · mobile · M · *yeni bağımlılık: expo-widgets (sor)*
    - Uygulama arka plandayken sayaç biter ve bildirim gelir
    - Live Activity: kalan süre + sıradaki set hedefi; seans bitince kapanır
12. **HealthKit'e yazma (seçimli) + active energy okuma** — M4 · mobile · S · *ADR-007 ve onboarding metni değişir*
    - Tamamlanan seans HKWorkout olarak yazılır (kullanıcı açarsa); elle girilen tartı seçimli yazılır
    - Active energy ve dış workout okunur → K-104 enerji mevcudiyeti girdisi
13. **Apple yüzeyleri: kilit ekranı karar widget'ı (Y1) + App Intents spike** — M5 · mobile · M
    - Widget: haftanın kararı + sonraki değerlendirme; varsayılan sayısız görünüm (V3)
    - Spike: SDK 58 `expo-app-intents` (alpha) vs native Swift hedefi; "Log weigh-in" intent'i uygulamayı açmadan kayıt; seçim ADR
14. **Sapma kalibrasyonu (Ö-14)** — M1/M2 · engine · M
    - Fotoğraf/beyan alımı ile kilo trendinden türeyen harcama arasındaki kişisel sapma zamanla öğrenilir
    - Sapma kullanıcıya suçlama olarak gösterilmez (U7); kaynak H1/I2
15. **Tarif hafızası (Ö-16)** — M4 · nutrition + mobile · M
    - Kullanıcının tarifini bir kez gir, porsiyonla tekrar kullan; kalori DB'den aralıkla
16. **Salon / ekipman profili + gerçekçi artış yuvarlama (Y7)** — M4 · training · M
    - Bar, plaka, dambıl adımı, makine listesi; birden çok salon
    - Motorun artış kararı mümkün en yakın yüke yuvarlanır; mümkün değilse tekrar artışı
    - Plaka hesaplayıcı bu veriden (masa bahsi #4)
17. **Hareket geçmişi, PR listesi, not, süperset, özel hareket, geçmiş seansı düzenleme** — M4 · mobile + training · L (bölünür)
    - İzolasyonda yük PR'ı yok, tekrar/efor PR'ı var (Güray K-33)
    - Isınma seti hesaplayıcı (şema kaynağı parametre notunda)
18. **Durum modu + dönüş akışı (Y2, §4.2)** — M5 · engine + mobile · L (bölünür)
    - Traveling / Sick / Pain / Exam / New gym; motor `NO_DECISION_YET(CONTEXT)`; af haftası yanmaz; sayaç "paused"
    - Dönüş yükü ve minimum doz kuralları kaynaklı (U14) — kaynak bulunamazsa o alt madde bekler
19. **Geçmiş içe aktarma: Apple Health kilo + Strong/Hevy CSV** — M6 · training + measurement · M
    - Hareket eşleme ekranı (düşük güvende tek dokunuş alternatif, U5)
    - İçe alınan verinin ilk karara etkisi ADR ile (§3 U8 notu)
20. **"Kararı ne değiştirir?" önizleyicisi (Y3)** — M6 · engine + mobile · M
    - Varsayımsal Snapshot motora gider; LLM yok; sonuç "şu olursa şu karar" listesi
21. **Karar defteri (Y4)** — M6 · mobile · S-M
    - K-212 kayıtlarından zaman çizelgesi; "after" dili, nedensellik iddiası yok
22. **Paylaşım kartı (Y5)** — M6 · mobile · S-M
    - Cihazda görsel; yağ %, vücut fotoğrafı, before/after yok; kilo varsayılan gizli; yasaklı ifade testi
23. **Koyu mod + erişilebilirlik denetimi** — M3 (token) / M8 (denetim) · mobile · M
    - Token'lar iki tema; Dynamic Type en büyük boyutta taşma yok; VoiceOver ile ana görevler tamamlanır
    - App Store Accessibility Nutrition Label cevapları gerekçeli (K-803'e ek)
24. **Watch uygulaması** — lansman sonrası · mobile (Swift) · L+ — *maliyet görünür olsun diye listede; masa bahsi değil*

---

## 8 · Bulunamayanlar
- Apple Watch'tan set kaydı yapan kullanıcı oranı (Hevy/Strong ya da bağımsız anket): **bulunamadı.**
- İçe aktarma özelliğinin rakipten kullanıcı çekmeye nicel etkisi: **bulunamadı** (yalnız pazar pratiği).
- Paylaşım kartının (Year in Review vb.) edinime ölçülmüş etkisi: **bulunamadı.**
- Accessibility Nutrition Labels'ın zorunlu olacağı tarih: **bulunamadı.**
- Apple Series 12 hazırlık skorunun HealthKit'e açılıp açılmadığı: **bulunamadı.**
- Control Center kontrolünün Expo paketinde desteği: **bulunamadı** (expo-widgets dokümanında yok).
- Sınav haftası modu olan uygulama: **bulunamadı.**

## 9 · Kaynaklar
- Hevy özellikleri: https://www.hevyapp.com/features/ · Strong CSV içe alma: https://help.hevyapp.com/hc/en-us/articles/38001424401943 (403 verdi; içerik arama özetinden) · https://help.hevyapp.com/hc/en-us/articles/35687878672663-Tutorial-Log-Previous-Workouts-and-Import-CSV
- Hevy Apple Health / Watch: https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 · https://help.hevyapp.com/hc/en-us/sections/36957443687831-Apple-Health
- Hevy API (Pro gerekli): https://api.hevyapp.com/docs/ · https://github.com/chrisdoc/hevy-mcp
- Hevy Trainer Injury Management: https://www.hevyapp.com/community-updates/july-26/ · https://www.hevyapp.com/features/workout-plan-generator/
- Strong dışa aktarma: https://help.strongapp.io/article/235-export-workout-data · Strong Watch: https://help.strongapp.io/article/222-strong-for-apple-watch
- MacroFactor Workouts: https://macrofactor.com/workouts/ · https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524
- MacroFactor logging break / partial logging: https://help.macrofactorapp.com/en/articles/251-coaching-module-logging-break · https://help.macrofactorapp.com/en/articles/248-coaching-module-partial-logging
- MF, MFP günlüğünü içe almıyor: https://nutriscan.app/blog/posts/how-to-switch-myfitnesspal-to-macrofactor-2d3d572ed3 · https://calorie-apps.com/articles/export-myfitnesspal-history-migration-guide-2026
- Alpha Progression (Watch yok, Live Activity var, ısınma/plaka): https://apps.apple.com/us/app/alpha-progression-gym-tracker/id1462277793 · https://alphaprogression.com/en/blog/alpha-progression-guide
- Fitbod Locations: https://fitbod.me/blog/your-gym-profile/ · https://www.hotelgyms.com/blog/fitbod-gym-profiles-travel-guide
- Ladder: https://www.garagegymreviews.com/ladder-app-review · Caliber: https://www.garagegymreviews.com/caliber-app-review
- Cal AI: https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616
- Runna: https://support.runna.com/en/articles/10225691-how-to-adjust-your-plan-around-holidays · https://support.runna.com/en/articles/13531498-how-to-use-not-feeling-100 · https://support.runna.com/en/articles/10026375-how-to-use-the-plan-realignment-feature
- Gentler Streak durumları: https://docs.gentler.app/personalizing-your-profile/what-happens-when-i-set-my-status-to-sick-injured-or-on-a-br
- Oura Rest Mode: https://support.ouraring.com/hc/en-us/articles/360057065433-Rest-Mode · WHOOP Journal: https://support.whoop.com/s/article/WHOOP-Journal-Overview?language=en_US
- expo-widgets: https://docs.expo.dev/versions/latest/sdk/widgets/ · https://expo.dev/blog/ios-widgets-and-live-activities-in-expo · npm `expo-widgets@57.0.22` (2026-09-29 `npm view`)
- Expo SDK 58 beta (expo-app-intents alpha): https://expo.dev/changelog/sdk-58-beta
- @bacons/apple-targets 5.0.0 (watch, app-intent, widget hedefleri): https://github.com/EvanBacon/expo-apple-targets
- @kingstinct/react-native-healthkit 16.0.0 — `saveWorkoutSample`, `saveQuantitySample` yerel paket içinde doğrulandı
- Apple featuring kriterleri: https://developer.apple.com/app-store/getting-featured/
- Accessibility Nutrition Labels: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/manage-accessibility-nutrition-labels
- HealthKit workouts ve halkalar: https://developer.apple.com/documentation/healthkit/workouts-and-activity-rings
- 2026 ADA finalistleri (Harvee, The Outsiders): https://apps.apple.com/us/iphone/story/id1896567319
- WWDC26 sağlık özeti: https://sahha.ai/blog/wwdc-2026-apple-health-developers/ · App Intents WWDC26: https://developer.apple.com/videos/play/wwdc2026/345/
- Apple Watch Series 12 hazırlık skoru: https://techcrunch.com/2026/09/09/apple-unveils-watch-series-12-and-watch-ultra-4-with-an-ai-upgrade-that-can-recap-your-day/
- İç kaynaklar: `ham/B-antrenman.md` §3, §6 · `ham/E-kullanici-sikayet.md` §2b, §7 · `ham/K1-lansman-otopsileri.md` §A7, §E5 · `ham/K2-appstore-soguk-baslangic.md` §A3
