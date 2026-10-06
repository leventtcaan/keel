# M1 · Reklam istihbaratı (R1) — Faz 5 · ürünün yüzü (ADR-068)

- **Tarih:** 2026-10-07 · **Durum:** TAMAM (Meta, ABD). TikTok bu dosyada yok → R4 (`M4-sosyal-dongu.md`) TikTok Creative Center erişimini denedi.
- **Rakip kümesi:** `M0-rakip-listesi.md` §2 (14 çekirdek, Levent onaylı)
- **Kanıt etiketleri:** **[RESMÎ]** Meta Ad Library verisi (reklamın kendisi) / aracın ya da kurumun kendi sayfası · **[ÇIKARIM]** veriden benim yorumum ·
  **[doğrulanmadı]**
- **Vekil ölçü (ADR-068):** uzun süre yayında kalan reklam = para kazandıran reklam. Meta ABD'de siyasi olmayan reklam için harcama/erişim vermiyor
  (`spend`, `reachEstimate` her kayıtta `null`). Elimizdeki para sinyalleri: **yayın süresi + gösterim sırası + varyant sayısı + aktif reklam hacmi.**

## 0 · Özet

1. **Kategorinin en çok kullanılan acısı "tahmin etmek / ne yapacağını bilmemek".** Fitbod (salonda kafası karışan adam skeci, 577 ve 558 gündür
   yayında), Ladder ("spor salonunda ne yapacağımı düşünmek istemedim"), Gymverse ("Your plan. Not a template."), BetterMe ("done with the guessing"),
   Cal AI ("without guessing"). **Bizim tezimiz ("makes the call") kategorinin en çok para harcanan acısının tam üstünde**, ama herkes "plan sende"
   diyor; **neden**i gösteren yok. Fark buradan gelir: kararı kim veriyor ve gerekçesini gösteriyor mu? (K6 §6.2 ile aynı yön.)
2. **Kanca videonun ilk saniyesinde. Metin sabit kalıyor, değişen video.** Cal AI 50 reklamda 49 ayrı video döndürüyor ama 42'sinin metni aynı.
   Kazananların hepsi dikey, telefonla çekilmiş UGC görünümlü video. İlk karede ya bir yüz ya bir beden var; altyazı ekrana kelime kelime basılıyor;
   uygulama 3. saniyeye kadar ekranda.
3. **Uzun yaşayan kazananlar üç uygulamada:** Fitbod (en çok gösterilen 50 reklamın 22'si 6 aydan uzun yayında, en uzunu 594 gün), Cal AI (ilk 10'un
   hepsi 106-176 gün) ve Ladder (ilk 10: 36-167 gün). Gymverse, MyFitnessPal, Noom ve WeightWatchers'ta reklamların ömrü kısa (≤63 gün): sürekli
   yenileniyor ya da kampanya bazlı dönüyor.
4. **Hacim çok farklı:** ABD'de aktif reklam sayısı Fitbod **810**, Cal AI **639**, WeightWatchers 363, Ladder 362, BetterMe 244, Noom 152. Buna karşılık
   MyFitnessPal 16, MacroFactor 14 (asıl reklamını kreatörler yapıyor). Lose It!, Hevy ve Bevel'in aktif reklamı **0**, Numify'ın Meta'da reklam veren
   sayfası yok. **Top grossing listesinde olmak Meta'da reklam vermeyi gerektirmiyor:** Hevy UK'de 16. sırada ve reklamı yok.
5. **Teklif:** ücretsiz deneme baskın. Ladder kredi kartı istemiyor, kreatör kodları "2 hafta bedava" veriyor, Gymverse "bir kez öde" diyor, WeightWatchers
   indirim yapıyor. **Hedef:** Cal AI, BetterMe ve Fitbod reklamdan doğrudan App Store'a gönderiyor; Ladder (%88) ve Muscle Booster kullanıcıyı web
   hunisine yolluyor.
6. **Kilo kategorisi ilaca kaydı:** Noom ve WeightWatchers reklamlarının çoğu GLP-1 (ilaç) ve doktor erişimi satıyor. Bu, U6 yüzünden bizim alanımız değil
   ve kapsam dışı kararını (M0) doğruluyor.
7. **Hukuki sinyal:** bir hukuk bürosu (Zimmerman Reed) 2 Eki 2026'dan beri Meta'da reklam veriyor. Reklamlar, MacroFactor'da ücretsiz denemenin ardından
   yıllık ücret kesilen kullanıcıları arıyor; dayanak California'nın açıklama kuralı. Bu bir **soruşturma**, açılmış dava değil. 05 §6.7'deki "asıl
   hukuki risk iptal ekranında" tespitinin canlı örneği; ADR-058'deki deneme hatırlatmasını doğruluyor.

## 1 · Araç seçimi

**Seçilen:** `apify/facebook-ads-scraper` ("Facebook Ads Library Scraper"). Yayıncısı **Apify'ın kendisi** (kullanıcı adı `apify`).
Doğrulama [RESMÎ]: `https://apify.com/apify/facebook-ads-scraper` ve Apify Store API (`/v2/acts/apify~facebook-ads-scraper`, 7 Eki). Son güncelleme
6 Eki 2026; son 30 günde 7.422 kullanıcı.
- **Fiyat:** olay başına ödeme; FREE planda **0,0058 $ / reklam**. Aracın sayfasında platform kullanımı için ayrıca ücret alınmadığı yazıyor; denemede
  doğrulandı. Not: hata kaydı da ücretleniyor (§2, Ladder).
- **Girdi:** sayfa URL'si ya da Ad Library URL'si (`view_all_page_id=…`), `resultsLimit`, `activeStatus`, `sorting` (`total_impressions` = gösterime
  göre azalan), `onlyTotal` (sayfa başına toplam reklam sayısı, tek kayıt).
- **Kullanılan alanlar:** `startDateFormatted`, `isActive`, `collationCount`, `gatedType`, `snapshot.displayFormat`, `.ctaText`, `.title`,
  `.body.text`, `.linkUrl`, `.videos[].videoSdUrl`, `publisherPlatform`.
- **Elenen:** üçüncü taraf aktörler 0,00015-0,015 $ / reklam. Daha ucuzlar ama bakımlarını tek bir kişi yapıyor. Resmî aktör ihtiyacımızı (~600 reklam)
  5 $'ın içinde karşıladı.

**Hesap ve maliyet:** Apify `leventcan`, FREE, aylık tavan 5 $ (döngü 6 Eki - 5 Kas). **Harcanan 2,39 $** (deneme 0,29 + toplam sayım 0,08 + tarama
~2,02). Veri saklama süresi 7 gün olduğu için ham veri hemen indirildi: `~/.keel-research/apify/` (Levent'in Mac'i, **depoda değil**).

## 2 · Yöntem (gerçekte yapılan)
1. **Sayfa kimliği:** Ad Library arama kutusunun "Advertisers" önerisinden alındı (yerleşik tarayıcı, girişsiz). Doğrulanan sayfalar: Cal AI
   `311353912066626` · MyFitnessPal `105630153496` · MacroFactor `100226155549254` · Lose It! `64506885948` · Ladder `1622022488076753` · Fitbod
   `1680675265485923` · Hevy `453778398520668` · Gymverse `100421562269650` · BetterMe `116700222203350` · Noom `112936925459222` · WeightWatchers
   `117446295957` · Bevel `120026634523764` · Muscle Booster `106059717857087`. **Numify:** "Numify" ve "Municorn" aramalarında reklam veren
   sayfası çıkmadı; "Numify" anahtar kelimesiyle ABD'de aktif reklam yok.
2. **Toplam:** `onlyTotal`, `activeStatus=active`, ülke US → 13 sayfa (§3).
3. **Tarama:** `activeStatus=active`, `sorting=total_impressions`, US, en çok 50 reklam (Gymverse 44, MFP 16, MacroFactor 14 = sayfanın tamamı).
   MacroFactor'ın reklamlarını çoğunlukla kreatörler yaptığı için ayrıca `"MacroFactor"` tam ifade araması da yapıldı (23 reklam; içinde Built With
   Science ve hukuk bürosu reklamları da var).
   **Arıza:** Ladder'ın `view_all_page_id` URL'si aktörde boş döndü (`error: no_items`; kimlik URL'den düştü, 0,0058 $ ücretlendi). Sayfa adresiyle
   (`facebook.com/joinladder`) yeniden koşuldu → 50 reklam, hepsi sayfa "Ladder".
4. **Kanca:** her rakipte gösterimi en yüksek ~10 videonun (MFP 6, MacroFactor 6 + 4 kreatör, Gymverse 4; **toplam 60**) 0,2 / 1,5 / 3,0. saniye
   kareleri `ffmpeg` ile, ilk 10 saniyesinin konuşma dökümü yerelde `whisper-cli` (`ggml-base.en`) ile çıkarıldı. Video dosyaları Meta CDN'inden
   indirildi (Levent'in izniyle, 7 Eki) ve **analizden sonra silindi** (§12).
5. **Yaş kapısı:** Noom'un 50/50 ve WeightWatchers'ın 40/50 reklamı girişsiz görünmüyor (`gatedType: LOGGED_OUT`). Metin geliyor; görsel, video, CTA ve
   hedef gelmiyor. Bu iki rakipte kanca ölçülemedi.

## 3 · Reklam hacmi — ABD, aktif, 7 Eki 2026 [RESMÎ]

| Uygulama | Aktif reklam | Top grossing US | Not |
|---|---|---|---|
| Fitbod | **~810** | 20 | Hacim lideri |
| Cal AI | **~639** | 12 | |
| WeightWatchers | ~363 | 24 | Çoğu yaş kapılı; GLP-1 + Tempo yemek teklifi |
| Ladder | ~362 | 2 | Web hunisi |
| BetterMe | ~244 | 26 | ABD'de İspanyolca/Portekizce reklamlar da var |
| Noom | ~152 | 16 | Tamamı yaş kapılı; GLP-1 ağırlıklı |
| Gymverse | 44 | 32 | |
| MyFitnessPal | 16 | **1** | Lider, ama Meta'da neredeyse yok |
| MacroFactor | 14 (+ kreatör ortaklıkları) | 10 | Kreatör kanalı |
| Muscle Booster | 1 | 48 | ABD'de değil [doğrulanmadı: başka ülkelere yöneliyor olabilir] |
| Lose It! · Hevy · Bevel | **0** | 22 · 39 · 57 | Meta'da aktif reklam yok |
| Numify | sayfa bulunamadı | 33 | |

Sayılar Ad Library'nin kendi "~N sonuç" tahmini (`isResultComplete: false` olanlar yaklaşık).

## 4 · Rakip başına özet [RESMÎ veri, yorum [ÇIKARIM]]

Gün = 7 Eki − reklamın başlangıç tarihi. Örneklem = gösterime göre ilk N aktif reklam.

| | N | Gün medyan | ≥90 g | ≥180 g | En uzun | Format | CTA | Hedef | Teklif / ana başlık |
|---|---|---|---|---|---|---|---|---|---|
| Cal AI | 50 | 77 | 24 | 0 | 176 | VIDEO 49 | Learn more 36 · Download 12 | App Store 50 | "Limited Time Free Trial" 30/50 |
| Fitbod | 50 | **144** | 33 | **22** | **594** | VIDEO 30 · DCO 20 | Install now 45 | App Store 43 | Başlıksız; "Train Smarter" |
| Ladder | 50 | 30 | 16 | 0 | 167 | VIDEO 42 | Sign up 21 · Learn more 21 | **joinladder.com 44** | "Start Your Free Trial, No Credit Card" 45/50 |
| BetterMe | 50 | 140 | 31 | 1 | 382 | VIDEO 50 | Install now 50 | App Store 50 | "Start Transformation Now!" 33; İspanyolca 12, Portekizce 3 |
| Gymverse | 44 | 9 | 0 | 0 | 22 | DCO 42 | Install now 36 | App Store 36 | "Your Plan. Not a Template." 26 |
| MyFitnessPal | 16 | 20 | 0 | 0 | 46 | karışık | Install now 9 | App Store 9 · blog 5 · ortak marka 2 | "Track your food with ease" |
| MacroFactor | 14 | 47 | 0 | 0 | 62 | VIDEO 13 | Download 13 | app.macrofactor.com 12 | Kreatör videosu, başlıksız |
| Noom | 50 | 13 | 0 | 0 | 26 | (kapılı) | (kapılı) | (kapılı) | GLP-1 "Microdose" 10, "Aging & Metabolism" 7 |
| WeightWatchers | 50 | 11 | 0 | 0 | 63 | (çoğu kapılı) | Get offer 10 | Tempo yemek 10 | GLP-1 / Med+ / indirim |

**Varyant:** `collationCount` toplamı 50 reklamda 64-95 arası. Bir reklam en çok 4 varyant taşıyor. Varyant sayısı tek başına ayırt edici çıkmadı.
**Yerleşim:** hepsi Facebook + Instagram. Fitbod, BetterMe ve MFP Audience Network'te de var; Threads çoğunda açık.

## 5 · Kanca — videonun ilk 3 saniyesi (60 video) [RESMÎ kare/döküm, sınıflama [ÇIKARIM]]

| Kanca ailesi | Kim, kaç video (ilk 10 içinden) | İlk saniyede ne var | Uzun ömürlü mü? |
|---|---|---|---|
| **Karar yükü / kafa karışıklığı** | Fitbod 3 (skeç: salonda ne yapacağını bilmeyen kişiye biri uygulamayı gösteriyor), Gymverse 1, Ladder 2 (meşgul anne, "rutini düşünmek istemedim") | Salonda kararsız bir yüz; ekranda kelime kelime altyazı | **Evet**: Fitbod'un 577, 558 ve 358 günlük reklamları bu ailede |
| **Dönüşüm (önce/sonra)** | Cal AI 2 ("350 lbs'tan 217 lbs'a"), MacroFactor 1 (kreatör, ekranda yağ yüzdesi), BetterMe çoğu (beden odaklı) | Çıplak gövde + ekranda iki sayı | Evet: Cal AI'nin 175-176 günlük reklamları |
| **Otorite / haber** | Cal AI 2 (TV haber kesiti: "genç girişimci diyeti çözdü") | Haber spikeri + kanal logosu | Evet (175-176 gün) |
| **İtiraf / POV** | Cal AI 2 ("kalorini sayma, sorun bu"; ne kadar yediğini bilmiyorsun), MFP 1 ("göz kararı yiyordum") | Yemek yiyen kişi + ekranda "POV:" | Orta (116-141 gün) |
| **Oyun / meydan okuma** | Cal AI 1 (öğünün kalorisini tahmin et, bilirsen 100 $), MFP 1 (hepsi 150 kalori: cips mi, patlamış mısır mı) | Tabak + soru | Orta |
| **Uygulama demosu** | Cal AI 2 (yemek pişiriyor → tarıyor), Fitbod 1 (kas grubunu seç → 6 hareket hazır) | Ekranda telefon, 3. saniyede uygulama | Orta |
| **Faydalı içerik (reklam = içerik)** | Fitbod 4 (günün antrenmanı 3×10, takip et), MacroFactor 3 (RIR göstergesi, haftada ne kadar kilo vermeli, ne yiyorum) | Hareket eden beden + set/tekrar yazısı | Fitbod'da evet (144-189 gün) |
| **Ünlü / kimlik** | Ladder 6 (Hilary Duff, Mel B, "hemşireyken formda kalmak", "programım herkese göre değil") | Tanınan yüz ya da meslek kıyafeti | Evet (90-167 gün) |
| **Plan ızgarası + şarkı** | BetterMe 4 (aynı kreatif: set/tekrar ızgarası + "tahmin etmeye son" şarkısı + pazartesi listesi) | 9'lu egzersiz ızgarası, "2×15" | Evet (140 gün, çok kopya) |
| **Kreatör karşılaştırması** | MacroFactor kreatörü (iyi-daha iyi-en iyi: MFP "iyi", MacroFactor "en iyi") | Kreatör + renkli etiket | Yeni (7 gün) |

**Ortak biçim (60 videonun neredeyse hepsi):** 9:16 dikey; ilk karede yüz ya da beden var; altyazı kelime kelime büyük harfle basılıyor; profesyonel
stüdyo yok (Gymverse ve Ladder'ın ünlü çekimleri hariç); süre çoğunlukla 15-50 sn; ilk 10 saniyede müzik ya da doğrudan konuşma var.
**Etiketler:** BetterMe'nin İspanyolca reklamlarında "Se usó IA generativa" (üretken yapay zekâ kullanıldı) etiketi var: bedenler üretilmiş.
Ayrıca "Actor portrayal… Results may vary" uyarısı ekranda.

## 6 · Vaat — reklam ne söz veriyor [ÇIKARIM, kanıt §4-5]

| Vaat | Kim | Not |
|---|---|---|
| **"Tahmin etmeye son" / plan sende** | Fitbod, Ladder, Gymverse, BetterMe, Cal AI, Built With Science | Kategorinin baskın vaadi. "Guessing" kelimesi en az 3 rakipte ve hepsinde çözüm "plan/AI hazırlıyor". **Gerekçeyi gösteren yok.** |
| **Kolaylık (fotoğraf çek, bitti)** | Cal AI, MFP | Tek hareketli demo; doğruluk iddiası yok |
| **Dönüşüm** | Cal AI, BetterMe, Muscle Booster ("30 günde dönüşüm") | Önce/sonra; süreli söz |
| **Haftalık uyum** | Built With Science+ ("adapts weekly as you progress"), MacroFactor | **Tezimize en yakın dil.** Built With Science, kreatöre ait yeni bir uygulama (quiz hunisi, 14 gün bedava) → izleme listesine |
| **Kimlik / topluluk** | Ladder (koç takımları, ünlü), WeightWatchers ("bu annenin WW'si değil") | |
| **İlaç** | Noom, WeightWatchers (GLP-1, doktor) | Kapsam dışı (U6) |

## 7 · Biçim, CTA, hedef, teklif [RESMÎ]
- **Format:** video baskın. **DCO** (Meta'nın parçaları kendi birleştirdiği dinamik reklam) Fitbod'da %40, Gymverse'te %95. Görsel (IMAGE) reklam az.
- **CTA:** "Install now", "Learn more" ve "Sign up" (web hunisi). CTA metni test ediliyor gibi durmuyor; kreatif değişiyor.
- **Hedef:** doğrudan App Store (Cal AI, BetterMe, Fitbod %86) ya da web hunisi (Ladder %88 `joinladder.com`, Muscle Booster `plan.muscle-booster.io`,
  Built With Science `quiz.*`). Web hunisinin nedeni (web'den ödeme, quiz ile kişiselleştirme) bu veriden **çıkmıyor** [doğrulanmadı].
- **Teklif:** ücretsiz deneme (Cal AI "sınırlı süre", Ladder "kredi kartı yok", kreatör kodu "2 hafta bedava", BWS "14 gün"), ömür boyu tek ödeme
  (Gymverse), indirim (WeightWatchers %60 ilk kutu).

## 8 · Yayında kalma — kim kazanıyor [RESMÎ gün, yorum [ÇIKARIM]]
En çok gösterilen ilk 10 reklamın yaşı (gün): Fitbod 86-577 · Cal AI 106-176 · Ladder 36-167 · BetterMe 12-140 (iki kreatif ailesi) · MacroFactor 27-62 ·
MFP 4-46 · Gymverse 5-22.
- **Fitbod**'un kazananları **bir yıldan uzun** yayında (577, 558, 358 gün) ve üçü de "salonda kafası karışık kişi" skeci. Kategorinin en uzun yaşayan
  reklamları karar yükü acısını kullanıyor.
- **Cal AI**'nin ilk 10'unun hepsi 3-6 aydır yayında: dönüşüm, haber kesiti ve itiraf/POV aileleri.
- **Gymverse** ve **MFP**'nin reklamları genç; ya sık yenileniyor ya da uzun yaşayan kazananları yok. Bu ayrım bu veriden yapılamıyor.

## 9 · Kategori sinyalleri
- **Organik büyüyenler:** Hevy (UK top grossing 16, Meta'da 0 reklam), Lose It!, Bevel. Meta reklamı bu kategoride büyümenin tek yolu değil.
  05 §3'ün organik kanal planıyla tutarlı.
- **MyFitnessPal** Meta'da içerik pazarlaması yapıyor: blog yazısı (ceviz), ortak marka (Vuori), "rest day routine". Lider, satın alma reklamına neredeyse
  hiç harcamıyor.
- **Kreatör sahipli koç uygulaması:** Built With Science+ haftalık uyum vaat ediyor ve quiz hunisiyle büyüyor. Tezimize en yakın yeni giren.
- **Hukuk:** Zimmerman Reed'in reklamı (Meta, 2 Eki 2026) ve sayfası [RESMÎ]: `zrclaims.com/case/macrofactor-mobile-app-subscription-investigation/`.
  App Store'dan "ücretsiz deneme" başlatıp sonra peşin yıllık ücret ödeyen kullanıcıları arıyor; California'nın açıklama kuralını anıyor. Bu bir
  soruşturma; uygulama şartları tahkim gerektirebiliyor.

## 10 · Bizim için çıkarım [ÇIKARIM]
1. **Acıyı kategori zaten ölçmüş:** "ne yapacağımı bilmiyorum / tahmin ediyorum". Bizim farkımız acıda değil çözümde: **kararı biri veriyor ve nedenini
   gösteriyor.** Reklam kancası rakiplerin kanıtlanmış acısıyla açılabilir; vaat kısmı rakiplerin söylemediği şeyi söylemeli: *"…and it tells you why."*
2. **Ürünün 3 saniyede filme alınabilir bir anı olmalı.** Cal AI'nin anı "tara → sayı", Fitbod'unki "kas seç → antrenman hazır". Bizimki **haftalık karar
   kartı** olabilir: tek cümle, büyük harf, 9:16 kırpmada okunur. Bu doğrudan ekran tasarımına girer (ADR-068: reklam ve ürün aynı vaadi taşır).
3. **Reklam = içerik** (Fitbod'un antrenman videoları, MacroFactor'un RIR açıklaması) uzun yaşıyor ve 05 §3.1 kural 2'ye ("izleyen indirmeden de değer
   alsın") uyuyor. Kurucunun kanalıyla en uyumlu aile bu.
4. **Bütçesiz uygulanabilenler:** karar yükü skeci, itiraf/POV, uygulama demosu, faydalı içerik. **Bize kapalı olanlar:** dönüşüm önce/sonra, ünlü,
   haber kesiti, üretilmiş beden (§11).
5. **Teklif gerilimi:** Ladder'ın "kredi kartı yok" denemesi ile 05 §4'ün "sert paywall dönüşümü daha iyi" bulgusu ve ADR-058'in zorunlu paywall'u
   farklı yönleri gösteriyor. Fiyat sayfası tasarlanırken Levent'e gelir.
6. **Deneme → yıllık ücret açıklaması** canlı hukuki risk. Paywall ve deneme hatırlatması ekranı tasarlanırken açıklama metni net olmalı.

## 11 · Anayasayla gerilim (ADR adayı)
| Kural | Çelişen reklam kalıbı | Kanıtın gücü | Not |
|---|---|---|---|
| **U4** (yağ yüzdesi sayısı yok) | MacroFactor kreatörü ekranda "%20,6'dan %9,0'a" | Tek video, 33 gün | U4'ün kapsamı uygulama ekranı/metni; **pazarlama kapsamda değil** → kapsam genişletilsin mi? |
| **U12** + 05 §3.1 kural 6 (fotogerçekçi beden yok; dönüşüm kanıt değil) | Cal AI'nin en uzun yaşayan reklamlarından ikisi önce/sonra; BetterMe üretilmiş bedenler ("IA generativa") | Güçlü: 175-176 gün yayında | Kategorinin en güçlü kancalarından biri bize kapalı → yerine karar yükü + demo ailesi. U12 pazarlamayı açıkça kapsasın mı? |
| **U6** (tıbbi dil yok) | Noom/WeightWatchers GLP-1, "obesity-trained doctors" | Hacimli | Çelişki değil, uzak durulacak alan |
| **U10** (isimsiz ürün sesi) | Reklamlarda yüz ve kişi var (kurucu, kreatör, ünlü) | — | Çelişki değil: reklamdaki kişi ürünün sesi değil. Ama "üründe kişi adı yok" kuralı reklam metnini nasıl etkiler, netleşmeli |
| **U7** | Gözlenmedi | — | — |

## 12 · Kısıtlar ve bulunamayanlar
- Harcama, erişim ve gösterim sayısı yok; "gösterime göre sıralama" Meta'nın kendi sıralaması, mutlak değer değil.
- Yalnız ABD ve yalnız Meta. TikTok için R4'e bakılacak. Ad Library UK'de son bir yılın reklamlarını, bitenler dahil, tutuyor. Bitmiş kazananları
  görmek gerekirse ikinci tur UK'den yapılabilir.
- Noom ve WeightWatchers yaş kapılı olduğu için kanca ölçülemedi.
- `linkUrl`'deki `trybe=` parametresinin anlamı [doğrulanmadı].
- Muscle Booster'ın ABD'de neden 1 reklamı olduğu [doğrulanmadı].
- **Ham veri:** `~/.keel-research/apify/ds-*.json` (reklam metni + medya bağlantıları; depoda değil, Apify'da 7 gün sonra silinir). Videolar, kareler
  ve ses dosyaları (124 MB) analizden sonra **silindi**; yalnız dökümler `media-index.json`'da (yerel).

## Kaynaklar
- Meta Ad Library (girişsiz), `facebook.com/ads/library/` — 13 reklam veren sayfası (§2'deki kimlikler), ABD, aktif, 7 Eki 2026.
- Apify, "Facebook Ads Library Scraper" — `https://apify.com/apify/facebook-ads-scraper` (7 Eki 2026). Apify dokümanı, olay başına ödemede platform
  ücreti: `https://docs.apify.com/platform/actors/running/actors-in-store` (7 Eki 2026).
- Apple top grossing, Sağlık ve Fitness, US/GB/AU/CA — `M0-rakip-listesi.md` §1.
- Zimmerman Reed, "MacroFactor mobile app subscription investigation" — `https://zrclaims.com/case/macrofactor-mobile-app-subscription-investigation/`
  (7 Eki 2026).
