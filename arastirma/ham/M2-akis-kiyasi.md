# M2 · Akış kıyası (R2) — Faz 5 · ürünün yüzü (ADR-068)

- **Tarih:** 2026-10-07 · **Durum:** tamamlandı (ham araştırma; karar yok, ekran tasarımı yok)
- **Rakip kümesi:** `M0-rakip-listesi.md` (onaylı) — 10 çekirdek (MacroFactor, Cal AI, MyFitnessPal, Ladder, Fitbod, Hevy, Noom,
  BetterMe, Bevel, Runna) + 2 referans (Strong, Lose It!). Pazar: ABD App Store.
- **Neden:** uygulama gerçek iPhone'da çalışmadı. Onboarding karmaşık, metin çok ve düz, koyu tema iç karartıcı, "ne nerede belli değil"
  (ADR-067, `docs/aktarim/M9/cihaz-kontrol-listesi.md` › Cihaz sonuçları). Bu dosya yeniden tasarımın girdisidir. Sorusu şu:
  insanlar neye alışkın, tutan uygulamalar ekran ekran nasıl akıyor?
- **Zaten bilinenler tekrar edilmedi:** onboarding uzunluğu ile ekran başına değer (I1 §A1), aha anı (I1 §A2), paywall yeri ve deneme
  süresi istatistikleri (I1 §E1-E2), UI karmaşası şikâyetleri (E §1 #6), App Store adları (K6 §A.1). Bu dosya onların üstüne
  **uygulama başına gözlem** ekler.

## Yöntem
1. **App Store [RESMÎ]:** iTunes Lookup API (`https://itunes.apple.com/lookup?id=<ID>&country=us`) ve `apps.apple.com/us/app/id<ID>`
   sayfası. Buradan açıklama, sürüm, alt başlık, uygulama içi satın alma listesi ve 4-10 ekran görüntüsü alındı. Ekran görüntüleri yalnız
   oturumun scratchpad'ine indirildi, depoya konmadı.
   **Uyarı:** App Store ekran görüntüleri **pazarlama görselidir**. Seçilmiş, sahnelenmiş ve çoğu zaman güncel olmayan ekranlardır,
   gerçek uygulama ekranı sayılmaz. Bu dosyada **[RESMÎ·pazarlama]** diye etiketlenir.
2. **ScreensDesign [3.P: SD]:** üyelik istemeyen iki sayfa kullanıldı. `/showcase/<slug>` kısa editoryal döküm ve "onboarding steps"
   sayısını verir. `/apps/<slug>/` zaman damgalı bölümleri ve her ekranın altyazısını verir. Altyazılar sayfanın HTML'inden ayıklandı,
   çünkü yapay zekâ özeti bazı ayrıntıları yanlış veriyordu. **Kayıt tarihleri:**
   - SD'nin video yükleme tarihi: MacroFactor 2025-08, MyFitnessPal 2025-05, Lose It! 2025-11, Cal AI 2026-04, Ladder 2025-04,
     Fitbod 2024-11, Hevy 2025-10/11, Strong 2025-04.
   - Ekrandaki tarihlerden tahmin [ÇIKARIM]: Runna ve Bevel ~2025-04, Noom ~2025-10, BetterMe ~2025 ilk yarı.
   - Eski kayıt eski akışı gösterebilir. Çelişki görülen yerde yazıldı.
3. **Resmî yardım merkezleri, bloglar ve resmî YouTube videoları [RESMÎ]:**
   - MacroFactor, Fitbod (Zendesk API), Hevy, Strong, Runna, Bevel ve Noom yardım merkezleri.
   - Ladder fiyat sayfası.
   - Videolardan yalnız otomatik altyazı alındı (`yt-dlp --skip-download`); video indirilmedi.
4. **Üçüncü taraf:** RevenueCat blog ve Sub Club podcast'i, GrowthWaves, the5krunner, 9to5Mac, Lazyweb, FeastGood / Alex Assets /
   Sebastian Stef videoları. Atlananlar: Mobbin (giriş istiyor), Superwall uygulama sayfaları (yalnız giriş kabuğu var), Reddit
   (engelli), support.myfitnesspal.com (403).
5. **Bizim uygulamanın tabanı (depo ölçümü):**
   - `apps/mobile/src/onboarding/draft.ts` (STEPS) ve `data/copy/en.json` › `onboarding` kelime sayımı.
   - `docs/aktarim/M9/img/2-today-health-okuma.png` (gerçek cihaz).
6. **İş bölümü ve doğrulama:** web taramasının bir kısmını üç alt ajan yaptı. En çok yük taşıyan iddiaları ben ayrıca doğruladım:
   - MacroFactor check-in modülleri ve hesap oluşturmanın paywall'dan sonra olması.
   - Fitbod'un antrenmanı nasıl kurduğu ve deneme koşulları.
   - Runna Pace Insights.
   - Bevel ücretsiz/Pro ayrımı.
   - Ladder deneme koşulları.
   - Cal AI SSS, 3 günlük deneme, "Streak Restore" satın alması.
7. **Erişim tarihi:** her kaynak için 2026-10-07.

**Kanıt etiketleri:**
- **[RESMÎ]** şirketin kendi kaynağı (App Store verisi, resmî site, yardım merkezi, resmî video).
- **[RESMÎ·pazarlama]** App Store ekran görüntüsü; gerçek ekran değil.
- **[3.P: ad]** üçüncü taraf; tarih biliniyorsa yazılı.
- **[ÇIKARIM]** benim yorumum.
- **[doğrulanmadı]** kaynakla kapanmadı.

Dokunuş sayıları çoğunlukla **[ÇIKARIM]**dır: yardım metnindeki adımlardan ya da ekran altyazılarından sayıldı.

---

## Özet
1. **Neredeyse herkes aynı omurgayı kullanıyor:** sorular → "Building your plan" bekleme ekranı → kişisel bir **sayı ya da tarih**
   içeren plan özeti → deneme süreli paywall.
   - 12 uygulamanın 9'unda var. Sırasıyla MacroFactor, Cal AI, MyFitnessPal, Lose It!, Noom, BetterMe, Fitbod, Runna, Bevel [3.P: SD].
   - Paywall'dan önceki "aha" hep **somut bir çıktıdır**: kalori hedefi, hedef tarihi, ilk antrenman ya da plan önizlemesi.
   - Bizim akışta bu yok. Onboarding bir beklenti ekranıyla bitiyor, Today kartı "Wait" diyor (cihaz görüntüsü).
2. **Uzunluk kategoriye göre değişiyor; sorun ekran sayısı değil:**
   - Kilo/beslenme uygulamaları uzun: MyFitnessPal 18, Cal AI 28, Bevel 34, BetterMe 41, MacroFactor 47, Noom 77 (web'de 113'e kadar),
     Lose It! 85 adım.
   - Antrenman günlükleri kısa: Ladder 4, Hevy 10, Fitbod 14 adım [3.P: SD].
   - Bizim 10 adımımız kısa sayılır ama metin yoğun: onboarding metninde ~770 kelime, ekran başına ~75 kelime (depo ölçümü).
3. **Ana ekranın ilk görünümü sayı ağırlıklı ve seyrek:**
   - Rakiplerde ~25-50 kelime; tek bir "kahraman" öğe var: halka, büyük sayı, fotoğraflı antrenman kartı ya da 3 halka
     [RESMÎ·pazarlama; ÇIKARIM].
   - Bizim Today'in ilk ekranında ~105 kelime ve üç paragraf cümle var (gerçek cihaz). Yoğunluk 2-4 kat fazla.
4. **"Şunu yap" diyen ekranın en iyi örneği Runna; tezimize en yakın iki ürün de "henüz karar yok" durumunu kullanıyor:**
   - **Runna:** durum etiketi + gerekçeler + hangi antrenmanların sayıldığı + son 5 seansın grafiği + Accept/Reject düğmeleri.
     Ayrıca açık bir "henüz yeterli veri yok" durumu var [RESMÎ].
   - **MacroFactor:** "Strategy" sekmesinde check-in geri sayımı, haftalık modüller, kabul/ret. Harcama tahmininde "Holding" durumu var
     [RESMÎ].
   - **Fitbod:** gerekçeyi ekrana kas toparlanma yüzdesi olarak koyuyor [RESMÎ].
   - Sonuç: U3'ün "henüz karar yok" durumu pazara yabancı değil. Ama bu iki üründe bekleme durumu **somut bir başlangıç hedefiyle birlikte**
     duruyor [ÇIKARIM].
5. **Görsel dil iki kampa ayrılıyor:**
   - Beslenme, kilo ve koç uygulamaları **açık zemin + tek vurgu rengi** kullanıyor. Cal AI siyah-beyaz, MyFitnessPal mavi, Lose It!
     turuncu, Noom mercan, BetterMe krem-kahve, Bevel gökyüzü degradesi.
   - Ağırlık antrenmanı uygulamaları **koyu**: Fitbod kırmızı-pembe, Ladder neon sarı-yeşil [RESMÎ·pazarlama; 3.P: SD].
   - En az 6 uygulamada iki ortak öğe var: üstte Pzt-Paz hafta şeridi ve ortada yüzen "+" düğmesi.
6. **Çekirdek eylemde hedef 1-4 dokunuş:**
   - Set kaydı: önceki değer önceden doldurulmuş, tek ✓ dokunuşu (Hevy, Fitbod) ve dinlenme sayacı kendiliğinden başlıyor [RESMÎ].
   - Tartı kaydı: MacroFactor'da 4 dokunuş [RESMÎ].
   - Öğün kaydı: Cal AI'da 3 dokunuş (+ → tara → deklanşör) [ÇIKARIM].
7. **Anayasayla en sert gerilimler:**
   - **Günlük streak ve rozet** en az 6 uygulamada var. Cal AI **0,99 $'lık "Streak Restore"** satıyor [RESMÎ App Store]. → U7
   - **Veri yokken tek tarihli hedef projeksiyonu** ("X lbs by May 8") Noom, BetterMe, Lose It!, Cal AI ve MacroFactor'da var. → U5, U12
   - **Kişilikli AI koç:** Bevel'in 4 personası var [RESMÎ]. → U10
   - Hepsi aşağıda kanıtlarıyla listelendi; karar verilmedi.

---

## Bizim taban (kıyas için)
| Ölçü | keel (7 Eki, iPhone 11, development build) | Kaynak |
|---|---|---|
| Onboarding | Önce Apple ile giriş. Sonra **10 adım**: goal, program, schedule, healthData, about, activity, foods (rızaya bağlı), photos, expectations, appleHealth. ~15 giriş alanı. | `draft.ts` STEPS |
| Metin | Onboarding metni **~770 kelime**; en uzunu schedule (107), sonra activity (102). Her ekranda gerekçe notu var (U9). | `data/copy/en.json` sayımı |
| Hesap | **Başta** (Sign in with Apple, sunucu hesabı) | `app/_layout.tsx` |
| İzinler | Sağlık verisi rıza ekranı (healthData) → Apple Health bağlama ekranı (priming + "Not now") → hatırlatma önerisi. ATT yok. | kod |
| Paywall | Onboarding sonunda **sert kapı** (ADR-058 › 107); RevenueCat anahtarı olmadığı için şimdilik açık | kod, cihaz #3 |
| Aha | **Yok.** Expectations ekranı "erken dönemde karar beklemek olabilir" diyor; Today kartında "Wait — First, finding your real maintenance." yazıyor | cihaz görüntüsü |
| Ana ekran | 4 sekme: Today, Train, Food, Progress. Üstüne "Ask the coach" çubuğu ve sağ üstte Settings düğmesi. Today'in ilk görünümü **~105 kelime**: 3 kart, 6 düğme/çip. | cihaz görüntüsü |
| Tema | Sistemi izliyor; uygulama içinde seçici yok. Cihazda koyu açıldı. | cihaz notu |

---

## Uygulama başına bulgular

### 1 · MacroFactor (1553503471) — "MacroFactor - Macro Tracker" · alt başlık "Calorie Counter & Food Log"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **47 adım** [3.P: SDs-MF]; paywall'a kadar ~58 ekran yakalanmış [3.P: SD-MF, 2025-08]. Sıra: 6 sayfalık resimli değer karuseli → Get Started → Apple Health kartı + sistem sayfası (ilk izin) → cinsiyet, doğum tarihi, boy, kilo, kilo geçmişi, vücut yağı seviyesi (3×3 illüstrasyon ızgarası), egzersiz sıklığı, aktivite, ağırlık ve kardiyo deneyimi → **sohbet biçiminde harcama tahmini** ("1600 kcal"; kullanıcı onaylar ya da sorgular) → kullanıcı yorumları → "nereden duydunuz" → hedef → hedef kilo + hız kaydırıcısı (canlı günlük kalori bütçesi) → bitiş tarihli özet → program kurulumu (diyet tipi, kalori tabanı, haftalık dağılım, protein) → "Set New Program" bekleme animasyonu → program özeti [3.P: SD-MF]. ~20 giriş alanı. Bildirim izni ve ATT onboarding'de görülmedi. Kamera ilk kullanımda isteniyor [3.P: SD-MF]. |
| Hesap | **Satın almadan sonra** (05:01); Apple, Google ya da e-posta [3.P: SD-MF — tarafımdan doğrulandı]. |
| Paywall | Onboarding sonunda, **sert**: "has a free trial, but does not offer a free subscription tier" [RESMÎ AS]. 1, 6 ve 12 ay seçenekleri; 12 ay "Most Popular" [3.P: SDs-MF]. Fiyat 11,99 $/ay, 47,99 $/6 ay, 71,99 $/yıl [RESMÎ AS]. Deneme **7 gün** [RESMÎ AS açıklaması: "7-day trial"]. Paywall'dan önce "bir hafta ek" ödül kartı var [3.P: SD-MF]. İkinci teklif bulunamadı. |
| Aha | Paywall'dan önce **kişisel harcama tahmini, canlı kalori bütçesi, hedef bitiş tarihi** ve program özeti gösteriliyor. Özet haftalık makro hedeflerini ve **iki adımlı "nasıl hesapladık" açıklamasını** içeriyor [3.P: SD-MF 04:18-04:24]. |
| Ana ekran | Sekmeler: **Dashboard · Food Log · (+) · Strategy · More** [RESMÎ·pazarlama, görsel #6]. Kahraman öğe Nutrition & Targets widget'ı: **haftalık** yığılmış çubuklar, bugün öne çıkarılmış [RESMÎ MF-h225]. Altında Insights (Expenditure, Weight Trend, Goal Progress) ve Habits [RESMÎ MF-h22]. **Haftalık bakış önde** [ÇIKARIM]. |
| Dokunuş | **Tartı: + → Weight → değer → ✓ = 4** [RESMÎ MF-h15]. Öğün: Search → yaz → yiyecek → Log Foods ≈ 3 dokunuş + yazı. Barkod: Scan → Log Foods [RESMÎ MF-h215; sayım ÇIKARIM]. |
| Metin | Pazarlama görselindeki Strategy ekranında ~25 kelime; ekranı tek bir büyük "Check In" dairesi kaplıyor [RESMÎ·pazarlama #6; ÇIKARIM]. Harcama ve kilo panolarında ilk kullanımda öğretici kartlar (coach mark) çıkıyor [3.P: SD-MF]. Öğün zaman çizelgesinde "ferah" ve "yoğun" görünüm seçilebiliyor [RESMÎ video]. |
| Görsel | Pazarlama görselleri **koyu**; vurgu tek renk (beyaz), kalın büyük harf başlıklar [RESMÎ·pazarlama]. Açık ve koyu tema var, varsayılanı bulunamadı [RESMÎ MF-h225]. Onboarding'de esprili illüstrasyonlar var (saksıdaki yaratık, roket, robot) [3.P: SD-MF]. Grafik renkleri "colorful yet adherence-neutral" [RESMÎ MF-dash]. |
| Karar sunumu | **Strategy** sekmesinde "5 days until check-in" geri sayımı, koçlu program kartı, hedef kartı ve hedef geçmişi var [3.P: SD-MF]. Check-in haftalık; günü kullanıcı seçiyor. Modüller şu sırayla geliyor: Partial Logging → Weigh-In → Fasting → Logging Break → **Program Update**. Modüller atlanabilir ya da kalıcı kapatılabilir. **Check-in reddedilebilir** (o zaman kalori ayarlanmaz). "Fast Check-In" bütün modülleri atlayıp tek dokunuşla öneriye gider [RESMÎ MF-h247 — tarafımdan doğrulandı]. Önerinin girdileri harcama, kilo trendi ve hedef. Haftada en az 4/7 gün beslenme kaydı ve 1 tartı gerekiyor [RESMÎ MF-h222]. Harcama grafiğinin efsanesinde **"Holding"** durumu var; veri toplanırken tahmin sabit tutuluyor [RESMÎ·pazarlama #3; 3.P: SD-MF öğretici kartı]. **Program Update sonuç ekranının düzeni (eski/yeni hedef, gerekçe) bulunamadı.** Yardım makalesinde yalnız görsel yer tutucuları var [RESMÎ MF-h252]. |

### 2 · Cal AI (6480417616) — "Cal AI - Calorie Tracker" · "Food & Macro Counter"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **28 adım** [3.P: SDs-CA]; ~00:15-02:30 [3.P: SD-CA, 2026-04]. Sıra: cinsiyet → haftalık antrenman sayısı → nereden duydunuz → başka uygulama denediniz mi → kıyas grafiği → boy, kilo, doğum tarihi → koçunuz var mı → hedef → istenen kilo → hız kaydırıcısı → engeller → diyet → ikincil hedefler → "kilo geçişi" grafiği → gizlilik/güven ekranı → **Apple Health priming ekranı (Skip seçenekli)** → sistem sayfası → yakılan kaloriyi geri ekle? → devretme (rollover)? → **sosyal kanıt üstünde App Store puan istemi** → bildirim izni → davet kodu → "All done" → **"Building Your Plan"** (ATT istemi bu bekleme ekranının üstünde) → **özel plan özeti** [3.P: SD-CA]. ~18 giriş alanı. |
| Hesap | Plan özetinden sonra "Save your progress": Apple, Google ya da e-posta [3.P: SD-CA]. |
| Paywall | Akış: önce boş dashboard kısa süre görünüyor → deneme kancası → **deneme hatırlatma zaman çizelgesi** ("Continue for FREE") → aylık/yıllık seçimi, **3 gün deneme** [3.P: SD-CA]. 3 gün resmî olarak doğrulandı ("CLAIM YOUR 3-DAY FREE TRIAL") [RESMÎ calai.app]. **Sert mi yumuşak mı, kaynaklar çelişiyor:** SD "Soft Paywall" diyor [3.P]. Resmî SSS'ye göre yiyecek kaydı için "+"ya basmak paywall'u açıyor [RESMÎ CA-faq], App Store açıklaması da "food scanning analysis results require a subscription" diyor [RESMÎ AS]. → Çekirdek eylem için **fiilen sert** [ÇIKARIM]. Ret sonrası ~20 $/yıl tek seferlik teklif çıktığı söyleniyor [3.P: Sebastian Stef 2025-04; 2026 için doğrulanmadı]. |
| Aha | Quiz sırasında hedef hızı ve zaman çizelgesi geri bildirimi, ardından kalori + makro içeren özel plan; hepsi kayıttan ve paywall'dan önce [3.P: SD-CA]. |
| Ana ekran | Sekmeler: **Home · Analytics · Settings + yüzen "+"** [RESMÎ·pazarlama #1]. SD 2026 kaydında Groups ("bakımda") ve Profile da görünüyor [3.P]. Kahraman: **"1250 Calories left" + halka**; altında 3 makro halkası, ardından "Recently uploaded" fotoğraflı liste [RESMÎ·pazarlama #1]. Kaydırınca lif/şeker/sodyum + **10 üzerinden sağlık puanı**, adım ve su sayfaları geliyor. **Günlük streak kartı** var [3.P: SD-CA]. Günlük bakış. |
| Dokunuş | **Öğün: + → Scan food → deklanşör ≈ 3** (+ sonuç ekranında "Done") [RESMÎ CA-faq "+"; 3.P: SD-CA; sayım ÇIKARIM]. Tartı: Progress → Log weight → cetvel → Save ≈ 3-4 [ÇIKARIM: SD-CA]. |
| Metin | Ana ekranın ilk görünümünde ~30 kelime, sayılar baskın [RESMÎ·pazarlama #1; ÇIKARIM]. Pazarlama başlıkları cümle halinde ve 5-7 kelime ("Just snap a picture of your food") [RESMÎ·pazarlama]. |
| Görsel | **Açık zemin, siyah-beyaz**; makrolarda kırmızı, turuncu ve mavi. Yemek fotoğrafları kahraman öğe gibi kullanılıyor [RESMÎ·pazarlama]. Koyu mod sitede "New feature" diye tanıtılıyor [RESMÎ calai.app] → varsayılan açık [ÇIKARIM]. |
| Karar sunumu | Settings → Nutrition goals: düzenlenebilir hedefler + "Auto Generate Goals" [3.P: SD-CA]. **Uyarlanır haftalık ayar bulunamadı.** Hedefi kullanıcı ya da tek seferlik hesaplama koyuyor. |
| Ek | App Store satın alma listesinde **"Streak Restore — $0.99"** var [RESMÎ AS sayfası]. Ayrıca rozetler ("Getting Serious", 10 günlük streak) [3.P: SD-CA]. |

### 3 · MyFitnessPal (341232718) — "MyFitnessPal: Calorie Counter" · "AI Coach & Nutrition Tracker"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **18 adım** [3.P: SDs-MFP]; paywall'a kadar ~22 ekran [3.P: SD-MFP, 2025-05]. Sıra: karusel → kayıt yöntemi (**başta**) → ad → hedefler (en çok 3) → engeller → empati ekranı → alışkanlıklar → "küçük kazanımlar" ekranı → öğün planlama sıklığı → aktivite → yaş, cinsiyet, ülke → boy, kilo, hedef kilo → haftalık hız → e-posta + şifre (**sonda**) → **"Building Your Plan"** → kaynak anketi → **kişisel kalori hedefli plan özeti** [3.P: SD-MFP]. ~12 giriş alanı. |
| İzinler | Bildirim ve Motion sistem istemleri **paywall'ın üstünde** çıkıyor. Kamera ilk barkod taramasında isteniyor (elle giriş seçeneği var). Health izni sonradan, **3 priming ekranından sonra** geliyor. ATT görülmedi [3.P: SD-MFP]. |
| Paywall | Onboarding sonunda, **yumuşak** (ücretsiz katman var) [3.P: SD; RESMÎ video "premium members only" özellikleri]. Premium ve Premium+ sekmeleri, **30 gün deneme**, Premium+ yıllık 99,99 $ [3.P: SD-MFP]. App Store listesinde 79,99 $/yıl ve 19,99 $/ay var [RESMÎ AS]. Premium+ satın alınınca ~25 soruluk ek öğün planı akışı geliyor [3.P: SD-MFP]. |
| Aha | Paywall'dan hemen önce kişisel kalori hedefi özeti [3.P: SD-MFP]. |
| Ana ekran | 2026 pazarlama görselinde sekmeler **Today · Plan · Progress · Coach + yüzen "+"** [RESMÎ·pazarlama #6, #10]; 2025 SD kaydında Dashboard, Diary, More görünüyordu → navigasyon değişmiş [ÇIKARIM]. Kahraman: **"976 cal / 2,074 — 1,098 left" ilerleme çubuğu** + 3 makro çubuğu. Üstte **Pzt-Paz hafta şeridi**, kaydedilen günler ✓ ile işaretli. Sağ üstte "16 ⚡" (streak sayacı olabilir [ÇIKARIM]). SD'de "food logging streak" modalı görülüyor [3.P: SD-MFP]. AI Coach sekmesi sohbet biçiminde, hazır soru kartlarıyla [RESMÎ·pazarlama #6]. |
| Dokunuş | Öğün: arama çubuğu → yaz → "+" ≈ 2 dokunuş + yazı [RESMÎ video; sayım ÇIKARIM]. Tartı ≈ 3-4; sonunda "57→56 kg güncellensin mi?" onayı [3.P: SD; ÇIKARIM]. |
| Metin | Today'in ilk görünümünde ~40 kelime, sayılar baskın [RESMÎ·pazarlama #10; ÇIKARIM]. Önce özet, ayrıntı açılır panelde [3.P: SDs-MFP]. |
| Görsel | **Açık zemin, mavi vurgu**, yemek fotoğrafları [RESMÎ·pazarlama]. Dark Theme seçeneği var, varsayılanı bulunamadı [3.P: SD]. |
| Karar sunumu | More → Goals: kilo, beslenme ve fitness bölümleri. Güne göre makro hedefi Premium'da. Düşük kalori uyarı modalı var [3.P: SD]. "Complete Diary" 5 haftalık kilo projeksiyonu gösteriyor [RESMÎ video]. GLP-1 doz hatırlatıcısı ve yan etki kaydı var [RESMÎ·pazarlama #7, #10]. **Uyarlanır hedef ayarı bulunamadı.** |

### 4 · Ladder (1502936453) — "LADDER Strength Training Plans" · "Fitness, Workouts, Coaching"
| Ölçü | Bulgu |
|---|---|
| Onboarding | Uygulama içinde **4 adım** [3.P: SDs-L]. Sıra: **ATT sistem istemi (0:04, girişten önce**; özel metni "takip, quiz'in sizi koçla eşleştirmesine yardım eder" diyor) → giriş (görünen tek seçenek Sign in with Apple) → 3 koç-videosu tanıtımı (Skip seçenekli) → "Let's find a team": koç kartları + 11 stilden en çok 3 seçim → takım sayfası CTA ("Try Limitless") [3.P: SD-L, 2025-04]. Asıl quiz web'de (joinladder.com/quiz) ve reklam hunisinin parçası [RESMÎ LD-pricing; 3.P: Sub Club]. "Building your plan" bekleme ekranı görülmedi. |
| İzinler | Bildirim: deneme ekranlarından sonra "YES, REMIND ME" priming → sistem istemi. Apple Health **ilk antrenmanda** priming ekranıyla isteniyor; ardından Spotify/Apple Music bağlama [3.P: SD-L 3:33-3:42]. |
| Paywall | **"How your free trial works" zaman çizelgesi** (Welcome → Welcome Workout → 5. gün hatırlatma → 7. gün bitiş) → "Free Pass" kartı; fiyat gösterilmiyor [3.P: SD-L]. **7 gün, kart istemiyor** [RESMÎ LD-pricing — doğrulandı; AS: "NO PAYMENT collected during trial"]. Pro 29,99 $/ay ya da 179,99 $/yıl [RESMÎ]. Deneme sonrası teklif tamamlanan antrenman sayısına göre segmentleniyor: 0 antrenman → aylık, 1-2 antrenman → yıllık [3.P: Sub Club 2025-03]. |
| Aha | Koç videosu + takım eşleşmesi. **Haftalık plan "Welcome Workout" bitene kadar kilitli** ("You've unlocked your plan") [3.P: SDs-L, SD-L]. |
| Ana ekran | Sekmeler: **Workouts · Chat · Teams · Profile · Rewards** [RESMÎ·pazarlama #3]. Üstte "Good Morning, Lauren — You're crushing it this week!" ve **Pzt-Paz şeridi** (✓). Kahraman: **tam genişlik koç fotoğraflı günün antrenmanı kartı** ("PEACH PALACE · 60 min · Lower Body Strength") [RESMÎ·pazarlama #3]. Takım arkadaşı avatarları (çift dokunuşla tezahürat), "Get Started Challenge" ilerlemesi [3.P: SD-L]. Antrenmanlar her pazar "düşüyor" (haftalık çerçeve içinde günlük kart) [RESMÎ LD-pricing]. |
| Dokunuş | Set: yukarı kaydırılan "Journal" panelinde her satırda "Log it" dairesi + Effort/Reps/Weight/Previous alanları. Tahmin: ~1 kaydırma + 2 alan + rakamlar + 1 dokunuş [3.P: SD-L (bulanık); ÇIKARIM]. Antrenman oynatıcısı zamanlı, dinlenme sayacı kendiliğinden çalışıyor [3.P: SD-L]. |
| Metin | Ana ekranda ~25 kelime; fotoğraf baskın [RESMÎ·pazarlama #3; ÇIKARIM]. Metin az, video çok [3.P: SDs-L]. |
| Görsel | **Siyah zemin, neon sarı-yeşil vurgu**, tam genişlik koç fotoğrafları ve videoları, kalın büyük harf [RESMÎ·pazarlama; 3.P: SD-L]. |
| Karar sunumu | Otorite veriden değil **koçtan** geliyor: koç video girişi ve kulaktan anlatım. Değişim sayfasında "Coach Recommendation" var [3.P: SD-L]. Her takım sayfası haftalık bölünmeyi gösteriyor (ör. Limitless: Lower/Upper/Lower/Upper/Conditioning/Full/Rest) [RESMÎ LD-limitless]. Kullanıcıların ~%70-75'i her antrenmanı kaydediyor; ağırlık önerisi kayıttan sonra geliyor [3.P: Sub Club 2026-03]. **Algoritmik "neden" bulunamadı.** |

### 5 · Fitbod (1041517543) — "Fitbod: Gym & Fitness Planner" · "AI Personal Trainer & Workouts"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **14 adım** [3.P: SDs-F, 2024]; ekranda "(n/11)" soru sayacı var [3.P: SD-F, 2024-11]. Sorular: strength antrenmanı sıklığı · diğer egzersiz · deneyim · hedefler (çoklu seçim) · nerede antrenman (6 salon tipi) → ekipman listesi. Bulanık ekranlardan çıkarılanlar [ÇIKARIM]: haftalık gün hedefi · "antrenman önizlemesi ister misin?" (bildirim priming'i) → sistem istemi · son çalıştırılan kaslar · vücut ölçüleri (Apple Health priming'i ya da elle). Sonra **"Projected Gains" grafiği ("27% Stronger")** → hesap (Apple/Google/E-posta, **geç**) → **"Building Your Plan"** ("Creating Workouts") [3.P: SD-F]. ATT görülmedi. |
| Paywall | 2024 kaydı: ilk antrenman üretildikten sonra **Start'a basınca** çıkıyor; antrenman özetinden sonra "90 günlük tahmin" ekseninde ikinci paywall [3.P: SDs-F]. SD "soft, no free trial" diyor (2024). **2026 resmî:** yeni kullanıcıya 7 gün deneme veriliyor ama deneme için plan (aylık/yıllık) seçmek gerekiyor; fiyat 95,99 $/yıl ya da 15,99 $/ay [RESMÎ FB-trial — doğrulandı]. Akış muhtemelen değişmiş [ÇIKARIM]. |
| Aha | Kayıttan önce güç projeksiyonu, paywall'dan önce **tam üretilmiş ilk antrenman** [3.P: SDs-F]. |
| Ana ekran | **Workout sekmesi kahraman öğe:** tek "sonraki antrenman" + çip satırı (Your gym · 45m · Recovered Muscles · Equipment) + **"Target muscles" toparlanma yüzdeleri (100% / 95% / 91% / 88%)** + "8 Exercises" listesi + Start [RESMÎ·pazarlama #5; 3.P: SD-F]. Sekmeler: Workout, Body (ısı haritası), Log [RESMÎ FB-recovery, FB-subscribe]. Günlük bakış. |
| Dokunuş | Setler önerilen tekrar ve ağırlıkla **önceden dolu** [RESMÎ FB-creates]. Set kaydı dinlenme sayacını başlatıyor [RESMÎ FB-rest]. Her egzersizden sonra RIR istemi çıkıyor [RESMÎ FB-RIR]. → Öneri kabul edilirse **set başına ~1 dokunuş** + egzersiz başına 1 RIR dokunuşu [ÇIKARIM]. |
| Metin | Antrenman ekranında ~35 kelime; etiket + sayı [RESMÎ·pazarlama #5; ÇIKARIM]. SD antrenman arayüzünü "dense with information" (ipucu balonu gerektiren) ve onboarding'i "lengthy" buluyor [3.P: SDs-F]. |
| Görsel | **Koyu varsayılan, kırmızı-pembe vurgu**, gerçek kişi egzersiz fotoğraf ve videoları, kırmızı 2D vücut ısı haritası [RESMÎ·pazarlama; 3.P: SD-F]. |
| Karar sunumu | **Gerekçe ekranda: dört antrenman uygulaması içinde en güçlüsü.** Kas başına toparlanma %0-100, tam toparlanma ~6-7 gün. Seçimin 5 girdisi: hedef etkinliği, ekipman, toparlanma, çeşitlilik, geri bildirim. mStrength yoğunluğu bilerek değiştiriyor ("neden hafif gün?" SSS'si var). Kullanıcı kontrolü: Swap, Replace, recommend more / less / exclude. Yeni üyeler muhafazakâr başlıyor [RESMÎ FB-creates, FB-recovery — doğrulandı]. Pazarlama görselinde "3 DAYS SINCE YOUR LAST WORKOUT · 5 FRESH MUSCLE GROUPS" + ısı haritası var [RESMÎ·pazarlama #3]. |

### 6 · Hevy (1458862350) — "Hevy - Workout Tracker Gym Log" · "Weight Lifting Routine Planner"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **10 adım**, **0 profil sorusu** [3.P: SDs-H, 2025-11]. Sıra: karusel + kayıt (Apple/Google/E-posta; **hesap zorunlu, başta**) → canlı yeşil ✓'li form → **bildirim ön ekranı** → sistem istemi → birimler → **Apple Health priming** ("Enable Apple Health / Not now") → sistem sayfası → paywall → e-posta izni → 4 ekranlık tanıtım turu → "How did you hear about Hevy?" (9 seçenek, ChatGPT dahil) [3.P: SD-H]. Plan bekleme ekranı ve ATT yok. |
| Paywall | İzin istemlerinden sonra, **yumuşak** ("Not now"), **deneme yok**. Aylık, yıllık ("Save 33%") ya da ömür boyu; yorumlar, Apple "Apps We Love" rozeti, Free/Pro tablosu ve SSS ile [3.P: SDs-H]. Fiyat 2,99 $/ay, 23,99 $/yıl, 74,99 $ ömür boyu [RESMÎ AS]. Ücretsiz katman: 4 rutin, 7 özel egzersiz, 3 aylık geçmiş [RESMÎ HV-pro]. |
| Aha | Paywall'dan önce **yok**; SD "değerden önce kayıt zorunlu" eleştirisini yapıyor [3.P: SDs-H]. |
| Ana ekran | Sekmeler: **Home (sosyal akış) · Workout · Profile** [3.P: SD-H; RESMÎ HV-log]. Workout sekmesi: Quick Start ("Start Empty Workout"), Routines (New / Explore), rutin kartı + "Start Routine" [RESMÎ·pazarlama #4]. Kahraman öğe yok; araç listesi gibi. |
| Dokunuş | Önceki set, ağırlık ve tekrar **önceden ekleniyor** [RESMÎ HV-track]; PREVIOUS sütunu hep görünür [RESMÎ HV-prev]. ✓ dinlenme sayacını başlatıyor [RESMÎ HV-rest]. → Tekrarda **1 dokunuş (✓)**, yeni değerde ~3 dokunuş + rakam [ÇIKARIM]. Tamamlanan satır yeşile dönüyor [RESMÎ·pazarlama #2]. |
| Metin | Kayıt ekranında ~30 kelime, sayı baskın [RESMÎ·pazarlama #2; ÇIKARIM]. Kaydedici "packed with information" [3.P: SDs-H]. |
| Görsel | **Açık zemin, mavi vurgu** (tema işletim sistemini izliyor); "Sleek dark mode" ayrı bir satış maddesi [RESMÎ·pazarlama #10]. 3D egzersiz modelleri, sarı PRO rozeti [3.P: SD-H]. |
| Karar sunumu | **Hevy Trainer** (Mart 2026, yalnız Pro, **AI kullanmadığını açıkça söylüyor**): kurulumda 11 soru; tüm setlerde tekrar aralığının tepesine ulaşılınca ağırlık artıyor; egzersiz başına 4 alternatif; ayarlarda "Science Behind Hevy Trainer" sayfası [RESMÎ HV-gen, HV-trainer, HV-video]. |

### 7 · Noom (634598719) — "Noom Weight Loss, Food Tracker" · "Healthy Habits, Meals & GLP-1s"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **İki ayrı akış var.** Web hunisi **113 ekrana kadar**, 10-15 dk; e-posta kapısı ~1/3'te; 10 soruluk, 4 seçenekli davranış quiz'i [3.P: RevenueCat 2026-04; GrowthWaves 2026-04]. Web bölümleri: demografi → hedef → davranış profili → beslenme → bütüncül sağlık → davranış değişimi [RESMÎ video]. **Uygulama içinde 77 adım** [3.P: SDs-N]. Sıra: 7 değer slaytı → **hesap (2. adım)** → ad, yaş, boy, kilo, cinsiyet, hedefler → kilo programı satış modalı → hedef kilo → **tıbbi durumlar, diyabet, sigorta** → etkinlik ve tarih → hız → **GLP-1 ilacı** → "Analyzing your profile" → tahmin → 10 soruluk quiz → profil sonucu ("Proof Seeker") → ek sorular → birden çok **"BUILDING PLAN"** ekranı (her biri bir öğretici mesaj taşıyor) → paywall [3.P: SD-N, ~2025-10]. |
| İzinler | **ATT ilk sırada**, karşılama ekranında. Bildirim ve Apple Health **satın almadan sonra** isteniyor; Health için priming ekranı var [3.P: SD-N]. Web'den alanlar uygulamayı "Unique Program ID" ile açıyor [RESMÎ NS-upid]. |
| Paywall | Uygulama içinde quiz sonrası **yumuşak**: 2 aylık planda 7 gün ücretsiz deneme, **15 dakikalık "rezervasyon" geri sayımı**, haftalık fiyat [3.P: SDs-N, SD-N]. Web: 14 gün "pay what you want" denemesi; kullanıcı 3 fiyattan birini seçiyor, yani **ücretli deneme** [3.P: RevenueCat]. Retten sonra ikinci teklif var [3.P: GrowthWaves; ayrıntı yok]. |
| Aha | Quiz bölümleriyle yeniden hesaplanan **kilo projeksiyonu grafiği** (ör. "120 lb by February"). Plan özetinde trend grafiği ve geri sayım birlikte [3.P: SD-N]. Pazarlama görselinde "We predict you'll be 150 lbs by May 8" yazıyor; ara hedefler "LOWER RISK (171 LBS)" ve "WEDDING (165 LBS)" olarak etiketli [RESMÎ·pazarlama #2]. |
| Ana ekran | Günlük: hafta şeridi + **"Weight Loss Zone"a göre kalori çubuğu** (bir aralık) + "Today's Plan" görev kartları (dersler, öğün, kilo, adım) [RESMÎ NS-lessons; 3.P: SD-N]. Pazarlama görselinde "TODAY'S LESSONS" başlığının yanında "1 DAY STREAK" var [RESMÎ·pazarlama #3]. Bulunan sekmeler: Home, Health (Course Map / Trends), Success Kit. **Tam sekme sayısı bulunamadı** [RESMÎ NS-log]. |
| Dokunuş | Öğün: Log your meals → öğün tipi → ara/seç → porsiyon kaydırıcısı → Done ≈ **5** [ÇIKARIM: NS-log]. Fotoğraf ve ses için "Scan Meal / Describe Meal" sekmesi → inceleme ekranı [RESMÎ NS-photo]. |
| Metin | **En metin ağırlıklı ürün:** dersler okunuyor ya da dinleniyor; günlük süre kullanıcıca 1-4 ile 12 dk arasında seçiliyor. Onboarding'de kalori yoğunluğu üzerine metin ağırlıklı ders ekranları var [3.P: SD-N]. Ana ekranda ~40 kelime; ders başlıkları cümle halinde [RESMÎ·pazarlama #3; ÇIKARIM]. |
| Görsel | **Açık, sıcak somon/şeftali zemin, serifli başlıklar**, mercan kırmızısı ve teal [RESMÎ·pazarlama]. Karşılamada yaşam tarzı fotoğrafları, quiz'de karakter illüstrasyonları [3.P: SD-N]. |
| Karar sunumu | Yiyecek renkleri (yeşil/sarı/turuncu) kalori yoğunluğu eşiklerinden geliyor ve eşikler yayımlanmış [RESMÎ NS-color]. Kalori bölgesi Harris-Benedict ile hesaplanıyor; alt ucu ~0,5-1 kg/hafta [RESMÎ NS-zone]. Dinamik hedef antrenman kalorisinin yarısını ve adım başına 0,05 kcal ekliyor [RESMÎ NS-dyn]. AI sohbet (Welli) kişisel hedef sorularını cevaplamıyor ve insan koça yönlendiriyor; **1:1 koç kalori bütçesini değiştiremiyor** [RESMÎ NS-welli]. |

### 8 · BetterMe (1264546236) — "BetterMe Well-Being Coach" · "Pilates, calisthenics, yoga"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **41 adım** [3.P: SDs-BM]. Sıra: **hesap başta** → sağlık verisi rızası → cinsiyet, doğum günü, sosyal kanıt, hedef, kilo geçmişi, ilgi alanları → **bildirim ön ekranı → sistem istemi (9.-10. adım)** → **3D avatar üstünde vücut bölgesi seçimi**, vücut tipi, tipik gün, enerji, aktivite, uyku, diyet, istenmeyen yiyecekler, alışkanlıklar, su, psikoloji soruları → boy, kilo, hedef kilo (BMI kartlarıyla) → ad → fitness özeti → hız → etkinlik → plan özeti → **"Creating your plan"** → **ATT** → plan hazır → paywall [3.P: SD-BM]. ~30 soru [ÇIKARIM]. Apple Health uygulama içinde sonradan bağlanıyor. **Web hunisi bulunamadı.** |
| Paywall | **Sert.** Önce 7 gün ücretsiz deneme (aylık plana dönüşüyor) + deneme zaman çizelgesi + haftalık fiyat. Ardından **ikinci paywall** (indirim rozetli 3 plan). Sonra tek seferlik ek satışlar: Sugar-Free Challenge %50 indirimli (29,99 $), Flat Belly Challenge [3.P: SDs-BM, SD-BM]. "Welcome-back" indirimi ve geri kazanma teklifleri de var [3.P: Lazyweb]. App Store'da "Fat Loss Program. 3 days trial" adlı ürün var [RESMÎ AS]. |
| Aha | Kilo projeksiyonu ("50 kg by Jul 5, 2025") → adımları ✓ ile işaretlenen bekleme ekranı → "personalized 4-week plan" + trend grafiği + "Get My Plan" [3.P: SD-BM]. |
| Ana ekran | Sekmeler: **Plan · Coach · Pilates · Progress · More** [RESMÎ·pazarlama #5]. Kahraman: **"My Plan · Today" kontrol listesi**: Do the Home Pilates, Snap Your Meal, Update Measurements, Be Active (300/600 Cal), Drink Water, Walk (9 570/10 000). Her satırda ✓ dairesi var [RESMÎ·pazarlama #5]. Program "Day 1…Day 15" ızgarası olarak gösteriliyor [RESMÎ·pazarlama #2]. **Günlük streak + rozetler** [3.P: SD-BM]. |
| Dokunuş | Bulunamadı. |
| Metin | Plan ekranında ~50 kelime, kısa görev cümleleri [RESMÎ·pazarlama #5; ÇIKARIM]. Onboarding'de 7 sayfalık CBT eğitim slaytları var [3.P: SD-BM]. |
| Görsel | Pazarlama görselleri **krem/bej zemin, koyu kahve vurgu**, ev ortamında yumuşak ışıklı fotoğraflar [RESMÎ·pazarlama]. SD 2025 kaydı **beyaz zemin, kırmızı düğmeler**, 3D avatarlar ve 3D emoji gösteriyor [3.P: SD-BM] → marka yenilenmiş olabilir [ÇIKARIM]. |
| Karar sunumu | Plandan önce 4 haftalık plan, önerilen 12:12 oruç ve **BMI + sağlık riski kartı** geliyor [3.P: SD-BM]. **Planın neden böyle olduğuna dair gerekçe bulunamadı.** |

### 9 · Bevel (6456176249) — "Bevel: AI Health Coach" · "Exercise, Sleep & Nutrition"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **34 adım** [3.P: SDs-B, ~2025-04]. Sıra: açılış → 5 slaytlık karusel + Sign in with Apple → gizlilik onayı (sağlık verisi yerelde) → ad → 3 hedef; her birinin ardından örnek metrikli tanıtım ekranı (beslenme puanı 63, toparlanma %81, stres grafiği) → **Apple Health priming → sistem istemi (18.-19. adım)**; nabız verisi yoksa bunu söyleyen bir ekran → doğum günü, birimler, boy, kilo, uyku ihtiyacı, su hedefi → **bildirim priming'i → sistem** → **"Personalizing your experience"** → paywall [3.P: SD-B]. ATT yok. **2026 akışı bulunamadı.** |
| Paywall | 2025: onboarding sonunda **yumuşak**; yıllık önceden seçili, App Store sayfasında **2 hafta deneme** [3.P: SD-B]. **Aralık 2025'ten beri çekirdek ücretsiz.** Pro (14,99 $/ay, 99,99 $/yıl) yalnız Bevel Intelligence, Health Records, Biological Age ve Training Plans'i açıyor. "Free'deki hiçbir özellik paywall'a taşınmayacak" diyor. Deneme süresi "değişebilir" [RESMÎ BH-price — doğrulandı; RESMÎ video 2025-12]. Ayrıca AI kredi paketleri satılıyor (350 kredi 4,99 $ … 4200 kredi 49,99 $) [RESMÎ AS]. |
| Aha | Onboarding'de örnek puanlar gösteriliyor. **Gerçek dashboard boş açılıyor**; SD bunu zayıflık olarak işaretliyor [3.P: SDs-B]. |
| Ana ekran | Kahraman: **üç halka: Strain %40 · Recovery %41 · Sleep %75**. Altında **koçun anlatı paragrafı** var: uyku hedefi tutmuş, HRV yüksek ve RHR düşük → "bugün %50-60 strain hedefle" [RESMÎ·pazarlama #1]. Sonra Stress & Energy ve Nutrition kartları. Bölümler yeniden sıralanabiliyor ve gizlenebiliyor [RESMÎ BH-home]. Sekmeler: Home, Fitness, Journal, Biology, Strength Builder; son üçü kapatılabiliyor. **Sıra bulunamadı** [RESMÎ BH-tabs]. Günlük bakış. |
| Dokunuş | Yiyecek: "+" → Import/Capture/Scan/Describe/Search ≈ 3-4 (fotoğrafla) [RESMÎ BH-log; ÇIKARIM]. Günlük (Journal): sekme → Yes/Neutral/No ≈ 2 [ÇIKARIM: BH-journal]. **AI'ın yaptığı yiyecek kaydı kullanıcı onayı olmadan kaydedilmiyor** [RESMÎ BH-log]. |
| Metin | Ana ekranda ~70 kelime; ~30 kelimelik tek bir anlatı paragrafı var, geri kalanı sayı [RESMÎ·pazarlama #1; ÇIKARIM]. Recovery kartı ~45 kelime ("Time to take it easy"); bugünkü HRV'yi olağan değerle sayıyla karşılaştırıyor [RESMÎ·pazarlama #6]. Ekranlarda "Learn more" katmanları var [3.P: SDs-B]. |
| Görsel | **Açık zemin, gökyüzü/bulut degradesi**, metrik başına renk (strain turuncu, recovery yeşil, sleep mor) [RESMÎ·pazarlama]. Bevel Intelligence **iki gözlü mor bir "blob" simgesiyle** temsil ediliyor [RESMÎ·pazarlama #3]. Açık ve koyu tema var [3.P: SD-B]. |
| Karar sunumu | AI koçun **4 kişiliği var: Data Nerd, Guardian, Friend, Commander**; proaktif check-in yapıyor [RESMÎ video YT-B2]. 3 düşünme modu var (Fast / Thinking / Adaptive) ve sohbette arka planda ne yaptığını gösteren bir açılır alan var [RESMÎ BH-faq]. İçgörüler korelasyon olarak sunuluyor ve "korelasyon nedensellik değildir" uyarısı taşıyor [RESMÎ BH-ins]. Biological Age kartında **"85% confidence — high-quality estimate with minor gaps"** ve "next update in 3 days" yazıyor [RESMÎ·pazarlama #9]. |

### 10 · Runna (1594204443) — "Runna: Running Plans & Coach" · "5k to Marathon Training"
| Ölçü | Bulgu |
|---|---|
| Onboarding | **26 adım** [3.P: SDs-R, ~2025-04]. Sıra: **ATT ilk** → Bluetooth (koşu bandı) → 3 özellik slaytı → kayıt (4. adım) → hedef, mesafe, zemin, seviye, doğum günü, cinsiyet, güncel yarış süresi, haftalık koşu, uygun günler, uzun koşu günü → **bildirim priming'i → sistem** → başlangıç tarihi, ilk koşu, plan uzunluğu, yarış günü, birimler → **antrenman tercihleri özeti** → "Generate my plan" düğmeli plan özeti → paywall [3.P: SD-R]. ~16 soru. Apple Health, kamera ve konum sonra isteniyor. |
| Paywall | Onboarding sonunda, plan özetinden sonra ve plan **üretilmeden önce**. Yıllık/aylık, "SAVE 50%", haftalık fiyat, puan ve yorumlar. SD "soft" diyor [3.P: SDs-R]. Deneme "genellikle 7 gün"; 48 saat içinde plan kurulmazsa düşüyor. **Aylık aboneler yalnız sonraki 4 haftayı görüyor** [RESMÎ RS-sub]. Fiyat 19,99 $/ay, 119,99 $/yıl [RESMÎ AS]. **"Building your plan" bekleme ekranı paywall'dan sonra** [3.P: SD-R]. |
| Aha | **"Your plan is ready"** ekranı, altında **"Your plan is customized based on these details"** başlıklı ve kullanıcının girdilerini yansıtan madde listesi: başlangıç günü, tahmini yarı maraton süresi, uygun günler, uzun koşu günü [RESMÎ·pazarlama #4]. Paywall'dan önce tercih özeti ve plan önizlemesi [3.P: SDs-R]. |
| Ana ekran | Sekmeler: **Today · Plan · Progress · Calendar · Support**; Profile sağ üstte [RESMÎ RS-nav — doğrulandı]. Today'in kahraman öğesi **günün antrenman kartı**; altında haftalık mesafe, ipuçları, **Plan Adjustment Tray** ve "Record workout" [RESMÎ RS-nav]. Plan Overview'da "Week 1 · 17-23 NOV" ve gün gün liste (Mon Long Run 8km, Tue Mobility …) [RESMÎ·pazarlama #1]. Koşu sonrası özette koç geri bildirimi var [3.P: SD-R]. |
| Dokunuş | Garmin, Apple Watch ve Strava'dan **otomatik eşitleme → 0 dokunuş** [RESMÎ RS-garmin, kısmen arama özetinden]. Elle: Progress → "+" → form → Save ≈ 4-5 [ÇIKARIM]. |
| Metin | Plan ekranında ~45 kelime; haftalık liste, sayı ve etiket [RESMÎ·pazarlama #1; ÇIKARIM]. Daha ayrıntılı ölçüm bulunamadı. |
| Görsel | Pazarlama görselleri **koyu yeşil-bordo degrade** zemin; uygulama içi plan ekranları **açık**, canlı koşu ekranı **koyu** [RESMÎ·pazarlama]. Mercan kırmızısı vurgu, alevli ayakkabı illüstrasyonları. Tema seçimi Light / Dark / sistem [3.P: SD-R]. |
| Karar sunumu | **Tezimize en yakın örnek.** **Pace Insights** 5 durum gösteriyor: Pace on Point · Ahead of the Pack · Let's Review Your Pace · **Variable Pace Detected** ("henüz öneri yapamayız, sonuçlar karışık") · **Monitoring Your Pace Data** ("henüz yeterli veri yok"). Ekranda **gerekçeler**, **hangi antrenmanların sayıldığı**, **son 5 hız seansının grafiği** ve uygun olmayan koşunun neden sayılmadığı var. **Accept** planı değiştiriyor, **Reject** planı aynı bırakıyor; kabul edilen değişiklik geri alınabiliyor [RESMÎ RS-pace — doğrulandı]. **Plan Realignment:** 3'ten fazla kaçırılan antrenman ya da kaçırılan bir haftadan sonra **pazartesi** açılan pencere: atla, yeniden diz, uzat ya da yeniden kur [RESMÎ RS-realign]. **Adapt for Heat:** "Review suggestion" → Accept ya da "Keep as planned" [RESMÎ RS-heat]. Üçüncü taraf bir inceleme pace değişikliklerinin gerekçesinin açıklanmadığını söylüyor; destek makalesiyle çelişiyor [3.P: the5krunner 2026-09]. |

### 11 · Strong (464254577) — referans: kayıt hızı
| Ölçü | Bulgu |
|---|---|
| Onboarding | Hesap başta (Apple, Sign Up, Google, Facebook) → "Getting started" modalı ve ipucu balonları; **0 soru**. Bildirim priming'i ilk antrenmanda ("Sure thing!/Maybe later") [3.P: SD-S, 2025-04]. |
| Paywall | Baştan yok; özellik kilidiyle çalışıyor (Charts kilitli → PRO sayfası) [3.P: SD-S]. Ücretsiz sürüm sınırsız antrenman, 3 özel rutin [RESMÎ AS]. Fiyat 4,99 $/ay, 29,99 $/yıl, 99,99 $ ömür boyu [RESMÎ AS]. |
| Ana ekran / dokunuş | Alt navigasyon var; 5 sekme [3.P; **isimler doğrulanmadı**]. Set: ağırlık + tekrar gir → ✓ [RESMÎ ST-first]. Özel tuş takımında Next, ± ve RPE tuşları var [3.P: SD-S]. Dinlenme sayacı 2:00 ile kendiliğinden başlıyor [RESMÎ ST-rest]. → ~3 dokunuş + rakam [ÇIKARIM]. ✓'nin Previous değerini kopyalayıp kopyalamadığı [doğrulanmadı]. |
| Haftalık öğe | Ana ekran widget'ı: **"Workouts Per Week — Target: 3"** haftalık çubuklar [RESMÎ·pazarlama #6]. Günlük sıfırlanmayan, haftalık tutarlılık gösterimi. |
| Görsel | Açık/gri, mavi vurgu, sade liste [RESMÎ·pazarlama]. |

### 12 · Lose It! (297368629) — referans: eski kuşak kilo/kalori
| Ölçü | Bulgu |
|---|---|
| Onboarding | **85 adım** [3.P: SDs-LI, 2025-11]. **ATT 0:04'te**, hiçbir değerden önce. Plan seçimi Relaxed (önerilen) / Steady / Vigorous; son ikisi "not recommended" rozetli. **Bütçe gösterimi: 1.239 kcal** (01:29). Hafta sonu kalori takvimi, beslenme stratejisi, oruç kurulumu (bildirim priming'iyle), zihniyet quiz'i → sosyal kanıtla **"Generating Your Custom Plan"** → "Save my program" → hesap (e-posta ya da Apple) [3.P: SD-LI]. |
| Paywall | Üç "Continue For Free" ön-paywall ekranı → **7 gün deneme, 39,99 $/yıl**. Sonra bildirim ısınma ekranı → sistem istemi. SD "soft" diyor [3.P: SD-LI]. Ücretsiz katman var [RESMÎ AS]. |
| Ana ekran | Sekmeler: **Dashboard · Log · Goals · Discover** [RESMÎ·pazarlama #2, #7]. Kahraman: **"Budget: 1,734 cals" + "118 Under" halkası** [RESMÎ·pazarlama #2]. **Streak kartı** (nokta dizisi) var [RESMÎ·pazarlama #7; 3.P: SD-LI]. Kilo ekranında **tahmini hedef tarihi** ("Sunday, Feb 1, 2026") [3.P: SD-LI] ve "106 days to goal", "4 lbs to go until your next milestone" [RESMÎ·pazarlama #4]. |
| Dokunuş | Tartı: Goals → Record Weight → tuş takımı → kaydet ≈ 3-4 [3.P: SD-LI; ÇIKARIM]. |
| Görsel | **Açık zemin, turuncu vurgu**; onboarding lacivert + turuncu CTA [RESMÎ·pazarlama; 3.P: SD-LI]. |

---

## Karşılaştırma tablosu
Hücreler yukarıdaki etiketli bulgulardan özetlendi. "Adım" = SD'nin saydığı onboarding adımı. "Soru" = giriş alanı sayısı; çoğu yaklaşık [ÇIKARIM].

| Uygulama | Adım | Soru | Hesap | Paywall yeri · tipi | Deneme | Aha (paywall öncesi) | Tab | Çekirdek eylem dokunuşu | Tema (varsayılan) |
|---|---|---|---|---|---|---|---|---|---|
| MacroFactor | 47 | ~20 | **ödemeden sonra** | onboarding sonu · sert | 7 gün | harcama tahmini + kalori bütçesi + bitiş tarihi + "nasıl hesapladık" | 4 + "+" | tartı 4 [RESMÎ] · öğün ~3 + yazı | açık+koyu var; pazarlama koyu |
| Cal AI | 28 | ~18 | plandan sonra | onboarding sonu · çekirdek eylemde fiilen sert (SD: soft) | 3 gün | kalori + makro planı, kilo grafiği | 3-4 + "+" | öğün ~3 (foto) | açık (koyu "yeni özellik") |
| MyFitnessPal | 18 | ~12 | başta seçim, sonda e-posta | onboarding sonu · yumuşak | 30 gün | kişisel kalori hedefi | 4 + "+" | öğün ~2 + yazı | açık · mavi |
| Ladder | 4 (+web quiz) | ~1 | başta | takım eşleşmesinden sonra · deneme kartsız | 7 gün | koç videosu + takım; plan ilk antrenmandan sonra açılıyor | 5 | set ~4 + rakam | koyu · neon sarı |
| Fitbod | 14 | 11 + ekipman + ölçüler | geç | ilk antrenmanda "Start" (2024); 2026'da 7 gün deneme için plan seçimi zorunlu | 7 gün | güç projeksiyonu + ilk antrenman | 3 | set ~1 (öneriyi kabul) | koyu · kırmızı |
| Hevy | 10 | 0 | başta (zorunlu) | izinlerden sonra · yumuşak | yok | yok | 3 | set 1 (✓, önceki değer) | açık (sistem) · mavi |
| Noom | 77 (web ≤113) | 30+ | 2. adım | quiz sonu · yumuşak + 15 dk sayaç | 7 gün (web: ücretli 14 gün) | tarihli kilo projeksiyonu | ≥3 [doğrulanmadı] | öğün ~5 | açık · somon/serif |
| BetterMe | 41 | ~30 | başta | onboarding sonu · sert + 2. paywall + ek satış | 7 gün | tarihli kilo projeksiyonu + 4 haftalık plan | 5 | bulunamadı | açık · krem (SD'de beyaz/kırmızı) |
| Bevel | 34 (2025) | ~10 | başta (Apple) | 2025: sonda yumuşak · 2026: çekirdek ücretsiz | 2 hafta (2025) | örnek puanlar; gerçek dashboard boş | 5 (bir kısmı gizlenebilir) | yiyecek ~3-4 | açık · gökyüzü |
| Runna | 26 | ~16 | 4. adım | özetten sonra, plan üretilmeden önce · yumuşak | 7 gün | "plan şu bilgilere göre kişiselleştirildi" listesi | 5 | koşu 0 (otomatik eşitleme) | ayar; plan açık, koşu koyu |
| Strong (ref) | — | 0 | başta | yok (özellik kilidi) | — | — | 5 | set ~3 + rakam | açık/gri |
| Lose It! (ref) | 85 | 30+ | plandan sonra | 3 "Continue Free" ekranından sonra · yumuşak | 7 gün | 1.239 kcal bütçe + hedef tarihi | 4 | tartı ~3-4 | açık · turuncu |
| **keel (şimdi)** | **10** | **~15** | **başta** | **onboarding sonu · sert** | ADR-058 | **yok ("Wait")** | **4 + koç çubuğu + Settings** | tartı/set: cihazda ölçülmedi | sistem (cihazda koyu) |

**Ana ekranın ilk görünümünde kelime (tahmin) [RESMÎ·pazarlama; ÇIKARIM]:**

| Uygulama | Kelime | Ne baskın |
|---|---|---|
| MacroFactor Strategy | ~25 | düğme |
| Ladder | ~25 | fotoğraf |
| Cal AI | ~30 | sayı |
| Hevy kayıt ekranı | ~30 | sayı |
| Fitbod | ~35 | etiket + sayı |
| MyFitnessPal | ~40 | sayı |
| Noom | ~40 | ders cümleleri |
| Lose It! | ~40 | sayı |
| Runna | ~45 | liste |
| BetterMe | ~50 | görev listesi |
| Bevel | ~70 | sayı + 1 paragraf |
| **keel Today (gerçek cihaz)** | **~105** | **3 paragraf cümle** |

Not: pazarlama görselleri seçilmiş ekranlardır. Gerçek ekranlar daha kalabalık olabilir; bu yüzden fark büyük ihtimalle olduğundan büyük görünüyor.

---

## İnsanların alışkın olduğu kalıplar (en az 3 uygulamada)
| # | Kalıp | Nerede | Kanıt |
|---|---|---|---|
| K1 | **Sorular → "Building/Personalizing your plan" bekleme ekranı → kişisel plan özeti → paywall** | MacroFactor, Cal AI, MyFitnessPal, Lose It!, Noom, BetterMe, Fitbod, Bevel; Runna'da özet paywall'dan önce, bekleme ekranı sonra | [3.P: SD] |
| K2 | **Plan özetinde tek bir somut çıktı:** kalori sayısı, hedef tarihi ya da ilk antrenman. Özetler bazen kullanıcının kendi girdilerini geri yansıtıyor (Runna) ya da hesaplamayı iki adımda açıklıyor (MacroFactor). | 10/12 (Hevy ve Strong hariç) | [3.P: SD; RESMÎ·pazarlama Runna #4] |
| K3 | **Paywall onboarding'in sonunda ve deneme süreli**; çoğunda "denemeniz nasıl işler" zaman çizelgesi ya da hatırlatma vaadi var. Deneme süreleri: 3 gün (Cal AI), 7 gün (MacroFactor, Ladder, Fitbod, Noom, BetterMe, Runna, Lose It!), 14 gün (Bevel 2025), 30 gün (MyFitnessPal). | 10/12 | [3.P: SD; RESMÎ AS, LD, FB, RS] |
| K4 | **Sistem isteminden önce priming ekranı** ("Not now / Maybe later" seçenekli): Health ve bildirim için neredeyse evrensel. Health çoğu zaman bağlama yakın isteniyor (Ladder ilk antrenmanda, Noom satın almadan sonra, MyFitnessPal uyku özelliğinde). | 11/12 | [3.P: SD] |
| K5 | **ATT çıplak ve en başta** (priming'siz ya da özel metinli). | Ladder, Noom, Runna, Lose It!; Cal AI bekleme ekranının üstünde; BetterMe bekleme ekranından sonra | [3.P: SD] |
| K6 | **Hesap oluşturma değerden sonra.** Beslenme uygulamalarında: Cal AI ve Lose It! plandan sonra, MacroFactor ödemeden sonra, MyFitnessPal e-postayı sonda alıyor. Antrenman ve koç uygulamalarında hesap başta (Ladder, Hevy, Noom, BetterMe, Runna, Bevel, Strong). | 4 / 7 | [3.P: SD] |
| K7 | **Tek kahraman öğeli günlük ana ekran:** büyük sayı/halka ya da günün antrenman kartı. Günlük bakış baskın; haftalık bakış önde olan yalnız MacroFactor (haftalık çubuklar) ve Runna'nın plan sekmesi. | 9/12 | [RESMÎ·pazarlama; RESMÎ MF-h225, RS-nav] |
| K8 | **Üstte Pzt-Paz hafta şeridi**; gün başına ✓ ya da nokta. | MyFitnessPal, Ladder, Noom, Cal AI, Runna, Lose It!, BetterMe (Gün 1-15 ızgarası) | [RESMÎ·pazarlama; 3.P: SD] |
| K9 | **Ortada yüzen "+" ile tek giriş noktası** (tüm kayıt türleri oradan). | MacroFactor, Cal AI, MyFitnessPal, Bevel, Runna (Progress) | [RESMÎ·pazarlama; RESMÎ BH-log, MF-h15] |
| K10 | **3-5 sekme**; ilk sekme "Today/Home/Dashboard/Workouts". | 12/12 | [RESMÎ·pazarlama; RESMÎ RS-nav] |
| K11 | **Set kaydında önceki değer dolu, tek ✓, dinlenme sayacı kendiliğinden.** | Hevy, Fitbod, Strong, Ladder | [RESMÎ HV, FB, ST; 3.P: SD-L] |
| K12 | **Algoritmik değişiklik kabul/ret ile uygulanıyor; plan sessizce değişmiyor.** MacroFactor check-in'i reddetme, Runna Accept/Reject ve "Keep as planned", Bevel'de AI kaydının onaylanması, Fitbod'da Swap/Replace. | 4 | [RESMÎ MF-h247, RS-pace, RS-heat, BH-log, FB-creates] |
| K13 | **Açık bir "henüz yeterli veri yok" durumu.** MacroFactor harcamada "Holding" ve en az 4/7 gün kayıt şartı; Runna "Monitoring Your Pace Data" ve "Variable Pace Detected"; Fitbod yeni üyeye muhafazakâr başlangıç. | 3 | [RESMÎ MF-h222, RS-pace, FB-creates] |
| K14 | **Günlük streak, rozet ve kutlama.** | Cal AI (+ ücretli geri alma), MyFitnessPal, Lose It!, Noom, BetterMe, Bevel (günlük kaydı streak bildirimi); MacroFactor onboarding görselinde "44-day streak" | [RESMÎ AS; RESMÎ·pazarlama; 3.P: SD] |
| K15 | **Paywall'dan önce tarihli kilo/sonuç projeksiyonu.** | Noom, BetterMe, Cal AI, Lose It!, MacroFactor (bitiş tarihi), Fitbod ("27% Stronger") | [3.P: SD; RESMÎ·pazarlama Noom #2] |
| K16 | **Onboarding'de sosyal kanıt ve kullanıcı yorumu ekranları**, sık sık "nereden duydunuz" sorusuyla birlikte. | MacroFactor, Cal AI, MyFitnessPal, Lose It!, BetterMe, Hevy, Noom | [3.P: SD] |
| K17 | **Kategoriye göre tema:** beslenme/kilo/koç uygulamaları açık zemin + tek vurgu rengi; ağırlık antrenmanı uygulamaları koyu. | Açık: Cal AI, MyFitnessPal, Lose It!, Noom, BetterMe, Bevel, Hevy · Koyu: Fitbod, Ladder | [RESMÎ·pazarlama; 3.P: SD] |

---

## Bizim için çıkarım
Hepsi **[ÇIKARIM]**. Bunlar ekran tasarımı değil, kanıttan çıkan yönler. Karar ADR'yle verilir.

1. **Onboarding'in bir "planın hazır" anıyla bitmesi gerekiyor (K1, K2).**
   - Kategoride paywall'dan önce somut bir çıktı göstermeyen tek tip, kişiselleştirme vaat etmeyen saf günlüklerdir (Hevy, Strong).
     keel kişiselleştirme vaat ediyor ama şu an "Wait" diyor.
   - Kanıta en yakın iki model var:
     - **Runna:** planı kullanıcının kendi girdileriyle gerekçelendiriyor ("customized based on these details").
     - **MacroFactor:** sayıyı iki adımda açıklıyor ve harcama tahminini sohbet biçiminde onaylatıyor.
   - Bizde motorun ilk gün verebileceği bir **başlangıç kararı** var: başlangıç kalorisi (H6) ve haftalık antrenman sayısı. U3'ün
     "henüz karar yok"u ise **ayarlama** kararı için. Piyasa bu ikisini birlikte gösteriyor: MacroFactor'da "Holding" ve hedef,
     Runna'da "Monitoring" ve plan. "Wait" tek başına aha olarak okunmuyor.
2. **Uzunluk değil, ekran başına metin ve geri dönen değer sorunu.**
   - 10 adım kategoriye göre kısa. Ama ~75 kelime/ekran ve her ekranda bir gerekçe paragrafı var.
   - Rakipler gerekçeyi sorunun yanında tek satır tutuyor (Fitbod'da her seçeneğin tek satır açıklaması [3.P: SD-F]) ya da sohbet
     balonuna bölüyor (MacroFactor).
   - U9 gerekçeyi zorunlu kılıyor; çözüm gerekçenin **kısalığı** olabilir, kaldırılması değil.
3. **Today'in ilk görünümü ~3 kat seyrekleşmeli: tek kahraman öğe + sayı (K7).**
   - Bevel'in anlatı paragrafı (~30 kelime) kategorideki üst sınıra yakın.
   - Cümle yerine "durum etiketi + sayı + tek satır neden" kalıbı Runna ve Fitbod'da çalışıyor.
   - MyFitnessPal'in "önce özet, ayrıntı katlı" yapısı U3'ün dört parçasını (eylem · gerekçe · güven · sonraki tarih) tek ekrana
     yığmadan göstermenin yolu olabilir.
4. **Karar ekranı için en yakın şablon Runna Pace Insights.**
   - Parçaları: durum etiketi · gerekçe maddeleri · hangi verinin sayıldığı · küçük grafik · eylem düğmesi · "henüz veri yok" durumu.
     Bu parçalar U3'ün dört parçasıyla birebir örtüşüyor.
   - Bevel'in "85% confidence + next update in 3 days" satırı, **güven + sonraki değerlendirme** parçasının görsel karşılığı.
   - MacroFactor'un Strategy sekmesindeki "5 days until check-in" geri sayımı, **haftalık ritmi görünür kılıyor**. "Ne nerede belli
     değil" şikâyetine doğrudan değiyor.
5. **Haftalık çerçeve piyasada var; U7 ile uyumlu biçimi de var (K8).**
   - Hafta şeridi alışılmış bir kalıp, ama çoğu günlük ✓ ve streak'e bağlanıyor.
   - Strong'un "Workouts Per Week — Target: 3" widget'ı ve Ladder'ın haftalık ✓ şeridi günlük sıfırlanmayan haftalık tutarlılığı
     gösteriyor. "12 haftanın 11'i" kalıbının kategoride görsel bir karşılığı var.
6. **Tema: açık varsayılan kategorinin normu (K17).**
   - Beslenme/kilo/koç uygulamalarının tamamı açık zeminli. Koyu yalnız antrenman ürünlerinde ve antrenman/koşu sırasında (Runna canlı
     koşu, Ladder oynatıcı).
   - Levent'in "koyu tema iç karartıcı" tepkisi kategori normuyla uyumlu. Uygulama içi tema seçici rakiplerde var (MacroFactor,
     MyFitnessPal, Hevy, Runna, Cal AI); bizde yok.
7. **Çekirdek eylem hedefleri (K9, K11):**
   - Tartı ≤4 dokunuş (MacroFactor 4).
   - Set: önceki değer dolu, tek ✓, sayaç kendiliğinden (Hevy, Fitbod).
   - Öğün: 2-3 dokunuş + kamera ya da arama.
   - Tek giriş noktası olarak yüzen "+" en az 5 uygulamada var. Bizde kayıtlar Today kartlarına ve sekmelere dağınık (cihaz
     görüntüsü). Bu, "ne nerede" şikâyetinin olası bir kaynağı.
8. **Hesap zamanı (K6).**
   - Beslenme uygulamaları hesabı değerden sonra alıyor; MacroFactor ödemeden bile sonra.
   - Bizde Apple ile giriş başta. Tek dokunuşluk bir işlem ama değerden önce geliyor.
   - Plan sunucuda hesaplandığı için hesabı sona almak teknik bir soru. Bu araştırmanın kapsamı dışında; prototip öncesi açılacak
     teknik konu olarak not.
9. **İzinler (K4):**
   - Priming ekranı + "Not now" zaten bizde var (cihaz #2, #5). Bu kalıba uyuyoruz.
   - Piyasada Health iznini **ilk kullanıldığı ana** taşıma örnekleri var (Ladder, Noom, MyFitnessPal). Onboarding'den bir ekran
     eksiltebilir.

---

## Anayasayla gerilim
Bulunan kalıplardan keel anayasasıyla çelişenler. **Karar verilmedi.** U1-U6 dokunulmazdır (ADR-068 madde 3). Diğerleri kanıt
gelirse ADR olarak Levent'e gelir.

| Kalıp | Kanıt | Çelişen kural | Not |
|---|---|---|---|
| **Günlük streak + rozet + streak'i para ile geri alma** | Cal AI satın alma listesinde "Streak Restore $0.99" [RESMÎ AS]. Cal AI, MyFitnessPal, Lose It!, Noom ("1 DAY STREAK"), BetterMe'de günlük streak ve rozet [RESMÎ·pazarlama; 3.P: SD]. | **U7** (günlük sıfırlanan streak yok, telafi mekaniği yok) | Kategorinin alışkın olduğu bir kalıp. Ücretli geri alma, U7'nin "telafi mekaniği"nin para karşılığı biçimi. Haftalık alternatif K8'de. |
| **Veri yokken tek tarihli hedef projeksiyonu** | Noom "150 lbs by May 8" [RESMÎ·pazarlama], BetterMe "50 kg by Jul 5", Lose It! "Feb 1, 2026", MacroFactor bitiş tarihi, Cal AI kilo grafiği; hepsi paywall'dan önce [3.P: SD] | **U5** (projeksiyon süresi daima aralık) · **U12** (ilk 4 hafta / 2 ölçümden önce yok, varsayılan kapalı) · **U8** | K15 kategorinin en yaygın "aha"larından biri. U5 dokunulmaz; U12/U8'e dokunmak ADR ister. |
| **Projeksiyonda ve onboarding'de sağlık ve klinik dil** | Noom projeksiyonunda "LOWER RISK" ara hedefi [RESMÎ·pazarlama #2]; Noom onboarding'inde tıbbi durum, diyabet ve GLP-1 soruları [3.P: SD-N]; BetterMe "BMI + sağlık riski kartı" [3.P: SD-BM]; Cal AI BMI "healthy" durumu [3.P: SD-CA]; MyFitnessPal GLP-1 doz hatırlatıcısı ve yan etki kaydı [RESMÎ·pazarlama]; Bevel "Biological Age" [RESMÎ] | **U6** (tıbbi/klinik dil yok) | GLP-1 zaten kapsam dışı (M0 §4). |
| **Vücut yağı gösterimi ve sorusu** | MacroFactor onboarding'inde 3×3 illüstrasyonla "body-fat level" seçimi [3.P: SD-MF; sayı gösterip göstermediği doğrulanmadı]; Hevy ölçümlerinde "Body Fat %" grafiği [RESMÎ·pazarlama #6] | **U4** (yağ yüzdesi sayısı hiçbir yerde yok) | MacroFactor'un görsel seçimi sayısız olabilir; doğrulanmadı. |
| **Kişilikli AI koç ve karakter simgesi** | Bevel Intelligence 4 kişilik (Data Nerd, Guardian, Friend, Commander) [RESMÎ YT-B2] + iki gözlü "blob" simgesi [RESMÎ·pazarlama #3]; Noom koçu "Eva" (insan) [RESMÎ·pazarlama #8]; MyFitnessPal Coach "How can I help, Benito?" [RESMÎ·pazarlama #6] | **U10** (isimsiz ürün sesi, karakter yok) | Ladder'ın koç yüzü gerçek insan markası, maskot değil. Yine de otorite kişiden geliyor; U10'un "araçsal koç" ruhuyla zıt. |
| **LLM'nin öneri ve hedef vermesi** | MyFitnessPal AI Coach "What should I eat with my remaining calories?" [RESMÎ·pazarlama #6]; Bevel anasayfadaki strain hedefi ve "scale back" önerisi [RESMÎ·pazarlama #1, #6]. Bevel'in bu önerinin kuraldan mı LLM'den mi geldiği **doğrulanmadı**. | **U1** (LLM karar vermez) | Karşı örnek: Noom'un AI'ı (Welli) kişisel hedef sorularını cevaplamıyor [RESMÎ NS-welli]; Hevy Trainer "AI kullanmıyor" diye pazarlanıyor [RESMÎ HV-video]. |
| **Gerekçesiz sorular** | "How did you hear about us?" (MacroFactor, Cal AI, Hevy, MyFitnessPal kaynak anketi); onboarding ortasında App Store puan istemi (Cal AI) [3.P: SD] | **U9** (soru sebep göstermek zorunda) | Atribüsyon sorusu kullanıcıya değil şirkete hizmet ediyor. |
| **Reddet / "Keep as planned"** | MacroFactor check-in'i reddetme [RESMÎ MF-h247]; Runna Reject ve "Keep as planned" [RESMÎ RS-pace, RS-heat] | **U2** (kararı ısrar değil veri değiştirir) — **yorum gerektirir** | Reddetme kararı değiştirmiyor, yalnız uygulamıyor. U2 ile çelişip çelişmediği tanıma bağlı. Bilgi için listelendi. |
| **Gerçek "before/after" vücut fotoğrafı** | MacroFactor App Store görseli #8: "Before / After", çıplak gövde [RESMÎ·pazarlama] | **U12** (fotogerçekçi vücut *üretimi* yasak) — doğrudan çelişmez; paylaşım kartı politikamız (K-602: before/after yok) ile çelişir | Pazarlama görseli, uygulama içi özellik değil. R1/R4 hatlarına girdi. |
| **Değeri anında projeksiyonla vermek** | K15, K2 | **U15 / U8** ile gerilim | U15 değeri "1 haftada, sistem planı değiştirince" tanımlıyor; piyasa değeri dakika 0'da bir sayıyla veriyor. Başlangıç kararı U3'e aykırı değil (bkz. çıkarım 1); trend/projeksiyon yorumu ise U8/U12'ye aykırı. |
| **Baskı mekaniği** | Noom paywall'ında 15 dakikalık "reserve" geri sayımı [3.P: SDs-N]; BetterMe ikinci paywall + tek seferlik ek satışlar [3.P: SD-BM] | Anayasada doğrudan karşılığı yok; E §1 #1 (fatura/iptal şikâyeti en baskın) ve I1 §E3 ile ilgili | Bilgi için. |

---

## Levent'in telefonunda kurulum gerekirse (kaynakla kapanmayan en çok 3 boşluk)
Üçü de Levent'in kendi hesabıyla (hesap açma onun işi) yapılır. Deneme başlatmak bir ödeme yöntemi bağlar: **Levent'in kararı**, deneme
bitmeden iptal edilir.

1. **MacroFactor: ilk haftalık check-in'in sonuç ekranı (Program Update).**
   - Görülecekler: eski ve yeni hedef yan yana mı, gerekçe (harcama, trend) ekranda mı, kabul/ret nasıl görünüyor, "Holding"
     durumunda ne yazıyor.
   - Bu, tezimizin piyasadaki en yakın karşılığı. Yardım makalesinde yalnız görsel yer tutucuları var.
   - Gerekenler: 7 günlük deneme, haftada en az 4/7 gün kayıt ve 1 tartı.
2. **Cal AI: paywall gerçekten kapatılabiliyor mu, kapatınca ne çıkıyor?**
   - Kaynaklar çelişiyor: SD "soft" diyor; resmî SSS'ye göre "+" paywall açıyor.
   - Ödemesiz görülebilir: onboarding bitirilip X'e basılır.
   - Aynı oturumda ana ekranın ilk görünümünün gerçek kelime sayısı da ölçülebilir (pazarlama görseli değil).
3. **Bevel: 2026 ücretsiz modelinde ilk açılış.**
   - Görülecekler: paywall nerede, veri yokken dashboard ilk gün neyle dolduruluyor.
   - Bizim "ilk 14 gün yorum yok" (U8) sorunumuzun piyasadaki karşılığı. SD'nin 2025 kaydında dashboard'un boş açılması zayıflık
     sayılmıştı.
   - Ödemesiz görülebilir.

---

## Bulunamayanlar
- **MacroFactor:** Program Update sonuç ekranının düzeni ve etiketleri; varsayılan tema; ikinci/indirimli paywall; bildirim izninin
  zamanı; onboarding'deki vücut yağı ızgarasının sayı gösterip göstermediği; MacroFactor'un uygulama içinde gerçek bir streak
  özelliği olup olmadığı (yalnız onboarding görselinde "44-day streak" var).
- **Cal AI:** 2026'da paywall'un kesin olarak sert mi yumuşak mı olduğu; ret sonrası teklifin güncelliği; metin yoğunluğu ölçümü;
  uyarlanır hedef ayarı (yok gibi, doğrulanmadı).
- **MyFitnessPal:** resmî destek belgeleri (403); 2026 sekme yapısının uygulama içi doğrulaması; ATT; "16 ⚡" göstergesinin anlamı.
- **Ladder:** resmî yardım merkezi (alan adı çözülmüyor); uygulama içi quiz soruları; deneme sonrası uygulama içi paywall; resmî set
  kaydı dokunuş sayısı.
- **Fitbod:** 2026 onboarding kaydı; güncel paywall tasarımı ve yeri; ATT; ipucu balonlarının metni.
- **Hevy:** Trainer ekranlarının net görüntüsü.
- **Noom:** tam sekme çubuğu; uygulama içi ikinci paywall; RevenueCat ve GrowthWaves dışında tarihli güncel huni dökümü; growth.design'da
  Noom vaka çalışması (listede yok).
- **BetterMe:** web hunisi adım sayısı; yardım merkezi (`/help`, `/faq` 404); tam sekme çubuğu; dokunuş sayıları; plan gerekçesi.
- **Bevel:** 2026 onboarding ve paywall yeri; sekme sırası; sürüm notları (JavaScript istiyor); vurgu rengi.
- **Runna:** metin yoğunluğu; resmî uygulama tanıtım videosu (kanalda yalnız antrenman videoları var); ikinci paywall; Garmin
  makalesinin tam metni (yalnız arama özeti).
- **Strong:** sekme adları; Previous değerini kopyalama davranışı; güncel yardım belgeleri (2021-22).
- **Lose It!:** tam sekme çubuğu (pazarlama görselinde 4); ret sonrası indirim.
- **Genel:** RevenueCat, Superwall ve PageFlows'ta bu uygulamalara özel paywall sayfaları (404 ya da giriş istiyor); PageFlows ve
  Medium vaka çalışmaları taranamadı (alt ajanların arama kotası doldu); hakemli bir akış kıyası çalışması.

---

## Kaynaklar
Hepsine **2026-10-07** tarihinde erişildi.

**App Store [RESMÎ]** — lookup: `https://itunes.apple.com/lookup?id=<ID>&country=us` · sayfa: `https://apps.apple.com/us/app/id<ID>`.
Her uygulama için açıklama, sürüm, alt başlık, satın alma listesi ve ekran görüntüleri buradan alındı. ID'ler:

| Uygulama | ID |
|---|---|
| MacroFactor | 1553503471 |
| Cal AI | 6480417616 |
| MyFitnessPal | 341232718 |
| Ladder | 1502936453 |
| Fitbod | 1041517543 |
| Hevy | 1458862350 |
| Noom | 634598719 |
| BetterMe | 1264546236 |
| Bevel | 6456176249 |
| Runna | 1594204443 |
| Strong | 464254577 |
| Lose It! | 297368629 |

**ScreensDesign [3.P]** — `https://screensdesign.com/apps/<slug>/` (SD-) ve `https://screensdesign.com/showcase/<slug>` (SDs-):

| Kısaltma | Slug |
|---|---|
| MF | `macrofactor-macro-tracker` |
| CA | `cal-ai-calorie-tracker` |
| MFP | `myfitnesspal-calorie-counter` |
| LI | `lose-it-calorie-counter` |
| L | `ladder-strength-training-plans` |
| F | `fitbod-gym-fitness-planner` |
| H | `hevy-workout-tracker-gym-log` |
| S | `strong-workout-tracker-gym-log` (yalnız /apps/) |
| N | `noom-weight-loss-food-tracker` |
| BM | `betterme-health-coaching` |
| B | `bevel-health-performance` |
| R | `runna-running-training-plans` |

**MacroFactor [RESMÎ]** — `https://help.macrofactorapp.com/en/articles/` +
- MF-h15 `15-log-your-weight`
- MF-h22 `22-get-to-know-your-dashboard`
- MF-h91 `91-program-styles`
- MF-h112 `112-how-to-configure-your-shortcuts-and-toolbar`
- MF-h124 `124-change-your-check-in-day`
- MF-h215 `215-how-to-log-food-in-macrofactor`
- MF-h222 `222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal`
- MF-h225 `225-understanding-the-widgets-at-the-top-of-the-dashboard`
- MF-h247 `247-introduction-to-check-ins-and-coaching-modules`
- MF-h249 `249-coaching-module-weigh-in`
- MF-h252 `252-coaching-module-program-update`
- MF-h393 `393-how-macrofactor-subscriptions-and-bundles-work`

Ayrıca:
- MF-dash https://macrofactor.com/dashboard-revamp/
- https://macrofactor.com/mf-coach/
- https://macrofactor.com/version-3-0-0/
- https://macrofactor.com/mm-september-2024/
- Resmî video https://www.youtube.com/watch?v=mYJkKGd3Xbk (2025-01-06)

**Cal AI [RESMÎ]** — https://www.calai.app/ (3 günlük deneme, "Dark Mode" yeni özellik) · CA-faq https://www.calai.app/faq.

**MyFitnessPal [RESMÎ]** — resmî video https://www.youtube.com/watch?v=I9cdBAcuhXU (2024-01-03).

**Ladder [RESMÎ]** — LD-pricing https://www.joinladder.com/pricing · LD-limitless https://www.joinladder.com/team/limitless ·
https://www.joinladder.com/ · resmî video https://www.youtube.com/watch?v=o6sF9SeFRYg.

**Fitbod [RESMÎ]** — `https://help.fitbod.me/hc/en-us/articles/` (Zendesk API: `/api/v2/help_center/en-us/articles/<id>.json`):
- FB-creates 360004429814 (güncelleme 2026-10-02)
- FB-recovery 360006269014
- FB-trial 30542136101527
- FB-subscribe 360004904714
- FB-choose 43489509474455
- FB-customize 38318585683991
- FB-rest 360006340194
- FB-RIR 360033133174
- ayrıca 12732749777047, 15932124434199, 16254175592215

**Hevy [RESMÎ]** — `https://help.hevyapp.com/hc/en-us/articles/`:
- HV-log 35361530647959
- HV-trainer 38385724273047
- HV-trainer-settings 43572343844247
- HV-prev 36011896355479
- HV-pro 35119778922263
- HV-sale 38223834432279
- ayrıca 33106320824727

Ayrıca:
- HV-track https://www.hevyapp.com/features/track-workouts/
- HV-rest https://www.hevyapp.com/features/workout-rest-timer/
- HV-gen https://www.hevyapp.com/features/workout-plan-generator/
- HV-video https://www.youtube.com/watch?v=DcGawOfDqk4

**Strong [RESMÎ]** — `https://help.strongapp.io/article/`:
- ST-first `229-my-first-workout`
- ST-rest `231-rest-timer`
- `105-about-templates`
- `132-strong-pro`
- Resmî video https://www.youtube.com/watch?v=ByvaXMey8OU (2016)

**Noom [RESMÎ]** — `https://www.noom.com/support/faqs/` +
- NS-log `using-the-app/logging-and-tracking/food-and-water/2025/10/how-to-log-edit-meals-on-ios/`
- NS-photo `…/food-and-water/2025/10/how-to-log-meals-using-photo-voice-or-text/`
- NS-color `…/food-and-water/2025/10/how-nooms-food-color-system-works/`
- NS-dyn `…/food-and-water/2025/10/how-to-use-dynamic-calorie-goals/`
- NS-zone `using-the-app/logging-and-tracking/biometrics/2025/10/how-noom-sets-your-weight-loss-zone-and-tracks-your-progress/`
- NS-lessons `using-the-app/daily-features/2025/10/how-to-find-and-revisit-your-noom-lessons/`
- NS-welli `coach-and-community/2025/10/what-can-i-ask-my-coach-or-welli/`
- NS-upid `subscription-and-billing/2025/10/how-to-access-your-noom-program-or-trial/`
- Resmî video https://www.youtube.com/watch?v=U0FeXu0dFt4

**Bevel [RESMÎ]** — https://www.bevel.health/ · `https://help.bevel.health/en/articles/`:
- BH-price 11583937
- BH-log 11247745
- BH-faq 11586753
- BH-home 10417089
- BH-tabs 10417153
- BH-ins 10437057
- BH-journal 13318977
- Videolar: YT-B1 https://www.youtube.com/watch?v=gjGuLdnlv0c (2025-12-18) · YT-B2 https://www.youtube.com/watch?v=fV28YVFTQTc

**Runna [RESMÎ]** — `https://support.runna.com/en/articles/`:
- RS-nav `10473504-your-quick-guide-to-navigating-the-runna-app`
- RS-pace `14656203-what-are-pace-insights-and-how-do-they-work`
- RS-realign `10026375-how-to-use-the-plan-realignment-feature`
- RS-heat `15647483-how-does-runna-adapt-my-workouts-for-heat-and-humidity`
- RS-sub `8112247-managing-your-runna-subscription`
- RS-build `15231838-how-does-runna-build-your-training-plan-around-your-current-fitness`
- RS-create `15443877-how-to-create-a-training-plan-in-runna`
- RS-wi `10494265-what-are-workout-insights`
- RS-garmin `6169639-using-your-garmin-watch-with-runna` (yalnız arama özeti)
- RS-nf100 `13531498-how-to-use-not-feeling-100` (yalnız arama özeti)

**Üçüncü taraf [3.P]:**
- RevenueCat, Noom web-to-app hunisi (2026-04): https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel
- RevenueCat, Runna vaka çalışması: https://www.revenuecat.com/customers/runna
- GrowthWaves (2026-04): https://www.growthwaves.io/p/the-113-screen-onboarding-that-doesnt
- Sub Club podcast'i (Ladder): https://www.youtube.com/watch?v=UCiGz2aBUhU (2026-03) · https://www.youtube.com/watch?v=H70Kcp83Oxs (2025-03)
- the5krunner (2026-09-28): https://the5krunner.com/2026/09/28/is-runna-ai/
- 9to5Mac (2026-07-29): https://9to5mac.com/2026/07/29/runna-now-automatically-adapts-training-paces-based-on-heat-and-humidity/
- Lazyweb (BetterMe): https://experiments.lazyweb.com/company/betterme
- FeastGood (2024-05-29): https://www.youtube.com/watch?v=eFmWpNOxHQc
- Alex Assets (2025-05-30): https://www.youtube.com/watch?v=hdLQnvlzv04
- Sebastian Stef (2025-04-19): https://www.youtube.com/watch?v=wMk_t8F1rOc

**Depo içi (taban):**
- `apps/mobile/src/onboarding/draft.ts`
- `apps/mobile/src/app/_layout.tsx`
- `data/copy/en.json`
- `docs/aktarim/M9/cihaz-kontrol-listesi.md`
- `docs/aktarim/M9/img/2-today-health-okuma.png`
