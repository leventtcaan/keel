# F — Sürtünme Azaltma, Dinamik Yönlendirme ve "Hizmet Alıyorum" Hissi

> Araştırma tarihi: 2026-09-09 · Durum: **TAMAMLANDI**
> Kural: Sayı varsa kaynak + tarih var. Bulunamayan şey "BULUNAMADI" yazılır.

---

# BÖLÜM 1 — Fotoğraftan besin tanıma: gerçekte ne kadar doğru?

## 1.0 Özet cevap (önce bunu oku)

Fotoğraftan kalori tahmini iki ayrı probleme bölünüyor ve ikisi **çok farklı** olgunlukta:

| Alt problem | Durum |
| --- | --- |
| **Yemeği tanıma** (bu tabakta ne var?) | Büyük ölçüde çözülmüş. İyi ürünler %90-97 doğrulukta bileşen tanıyor. |
| **Porsiyon/kütle tahmini** (kaç gram?) | **Çözülmemiş.** Asıl hata buradan geliyor. Akademik en iyi sonuç bile ~%13-17 ortalama hata; ticari ürünlerde %40'a varan sistematik sapma ölçüldü. |

Yani "AI yemeği tanıyamıyor" yanlış bir hikâye. Doğru hikâye: **AI gramı bilemiyor** ve ürünler bunu
kullanıcıdan gizliyor.

---

## 1.1 Akademik referans noktası — Nutrition5k (Google Research, CVPR 2021)

Bu alanın **tek ciddi ortak referansı**. Kaynak: Thames et al., *Nutrition5k: Towards Automatic
Nutritional Understanding of Generic Food*, CVPR 2021 — https://arxiv.org/abs/2103.03375
(HTML: https://ar5iv.labs.arxiv.org/html/2103.03375)

**Veri seti:** 5.066 benzersiz tabak, ~20 bin kısa video, 3.5k tabakta RGB-D (derinlik) görüntüsü.
Tabak başına ortalama **5,7 bileşen** (1'den 35 bileşene kadar). Her tabağın bileşen ağırlıkları
tartılmış — yani ground truth gerçek.

**Sonuçlar (test seti):**

| Model | Kalori MAE | Kalori % hata | Makro % hata |
| --- | --- | --- | --- |
| 2D doğrudan tahmin (sadece RGB) | 70,6 kcal | **%26,1** | %31,9 |
| Derinlik 4. kanal olarak | 47,6 kcal | **%18,8** | %20,9 |
| Volume scalar (hacim ölçekleyici) | 41,3 kcal | **%16,5** | %26,2 |

**Kütle tahmininde derinliğin etkisi:** 38,1 g (%29,5 hata) → 29,4 g (**%13,7 hata**).
Derinlik verisi kütle hatasını yaklaşık **yarıya indiriyor**. Bu, LiDAR/depth argümanının tek
sağlam kanıtı.

**İnsan karşılaştırması (aynı fotoğraflardan):**
- Profesyonel beslenme uzmanı: **%41 ortalama hata**
- Uzman olmayan insan: **%53 ortalama hata**
- Model (2D): %26,1 · Model (volume scalar): %16,5

> **Kritik nüans:** "AI beslenme uzmanını geçiyor" iddiası buradan geliyor ve **teknik olarak
> doğru** — ama karşılaştırma *fotoğraftan tahmin* üzerine. Gerçek bir diyetisyen fotoğrafa
> bakmaz, soru sorar ("yağda mı kızarttın?"). Kıyas haksız.

**Yazarların kendi belirttiği kısıt (bizim için en önemli satır):** veri **tek bir kafeteryadan**
toplandı, bu yüzden veri seti **"mostly western style dishes"** yönünde çarpık. Yazarlar gelecek
iş olarak *"adding scans from more geographically and culturally diverse cafes"* öneriyor.
→ **Türk/Orta Doğu mutfağı bu veri setinin içinde yok.** Bu, Bölüm 1.5'in kanıt temeli.

**SnapCalorie bağlantısı:** SnapCalorie kurucuları bu makalenin yazarları (eski Google Lens /
Cloud Vision ekibi). Ürünün "%15 ortalama kalori hatası" iddiası doğrudan bu makaledeki
%16,5 rakamına dayanıyor — yani **laboratuvar sonucu, saha sonucu değil.**

---

## 1.2 Bağımsız hakemli doğrulama — Nutrients 2024 (en sert kanıt)

Li, Yin, Choi, Chan, Allman-Farinelli, Chen. *Evaluating the Quality and Comparative Validity of
Manual Food Logging and Artificial Intelligence-Enabled Food Image Recognition in Apps for
Nutrition Care.* **Nutrients** 2024, 16(15):2573. DOI: 10.3390/nu16152573
https://www.mdpi.com/2072-6643/16/15/2573 · https://pmc.ncbi.nlm.nih.gov/articles/PMC11314244/

**Yöntem:** Üç örnek diyet oluşturuldu — **Western**, **Asian**, ve Avustralya kılavuzuna göre
"Recommended". Uygulamalara girildi, Foodworks.online referans değerleriyle karşılaştırıldı.
16 manuel loglama uygulaması, bunlardan **7'si AI görüntü tanıma** özellikli.

**AI bileşen tanıma doğruluğu (39 bileşen üzerinden):**

| Uygulama | Tanıma doğruluğu |
| --- | --- |
| MyFitnessPal | **%97** (38/39) |
| Fastic | **%92** (36/39) |
| HealthifyMe | **%90** (35/39) |

**AI enerji tahmini sapması — asıl mesele burada:**

| Uygulama | Ortalama fark (referansa göre) |
| --- | --- |
| MyFitnessPal | **−%3** |
| HealthifyMe | **+%8** |
| Fastic | **+%44** |
| Foodvisor | **−%47** |

> Aynı çalışmada, aynı yemeklerde: bir uygulama **%44 fazla**, diğeri **%47 eksik** sayıyor.
> Bu %90 aralık farkı, "AI kalori sayacı" kategorisinin tek bir güvenilirlik seviyesi
> olmadığının kanıtı. Yazarların sonucu: *"automatic energy estimations from AI-enabled food
> image recognition were inaccurate"*, özellikle **karışık ve kültürel olarak çeşitli yemeklerde.**

**Kültürel sapma kanıtı (Bölüm 1.5 için kritik):**
- Western diyet: ortalama **+1040 kJ fazla tahmin** (~+249 kcal)
- Asian diyet: ortalama **−1520 kJ eksik tahmin** (~−363 kcal)
- Recommended diyet: **−944 kJ eksik tahmin** (~−226 kcal)
- Asian diyetlerde karbonhidrat (%E) ortalama **%7 fazla**, toplam yağ (%E) **%6 fazla** tahmin edildi.

→ **Batı dışı mutfak = sistematik EKSİK sayma.** Yön rastgele değil, tek yönlü. Türk mutfağı için
doğrudan test bulunamadı ama Asian diyet sonucu güçlü bir gösterge.


---

## 1.3 Diyetisyenlerin kendi ifadesi — fotoğraf neden yetmiyor (PLOS Digital Health 2024)

*Opportunities to design better computer vision-assisted food diaries…* PLOS Digital Health
2024, 3(11): e0000665 —
https://journals.plos.org/digitalhealth/article?id=10.1371%2Fjournal.pdig.0000665

**Yöntem:** 18 diyetisyen (10 ayakta tedavi, 2 yatan hasta, 5 özel muayenehane, 1 karma),
her biri 7 günlük fotoğraf günlüğü (30-45 fotoğraf) inceledi. Ortalama 34,7 dk inceleme +
30 dk mülakat.

**Bu çalışma neden bizim için en değerlisi:** Diyetisyenler fotoğrafa bakınca **kalori saymıyor.**
Baktıkları şeyler:
- **Renk çeşitliliği** → sebze/meyve tüketiminin proxy'si
- **MyPlate oranları** → tabak dengesinin görsel değerlendirmesi
- **Haftalık frekans örüntüsü** → tercihleri ve tekrarları görmek
- **Arka plan objeleri** (kap, mutfak eşyası, ortam) → ev yemeği mi, dışarısı mı çıkarımı

Bir katılımcının ifadesi: fotoğraflarda *"not a lot of colors"* → yeterli sebze/meyve yok.

**Fotoğraftan ÇIKMAYAN, diyetisyenin sormak zorunda kaldığı bilgiler:**
| Eksik bilgi | Neden önemli |
| --- | --- |
| Ne kadarı yendi? (öncesi/sonrası fotoğrafı yok) | Katılımcılar bunu **en zor bilgi** olarak işaretledi |
| Nerede yendi (ev / restoran / araba / mola odası) | Hazırlama yöntemi ve porsiyon çıkarımı |
| Kiminle yendi | Sosyal bağlam seçimi değiştiriyor |
| Öğün aralıkları | Açlık/tokluk örüntüsü |
| İş programı / yaşam kısıtı | Önerinin uygulanabilirliği |
| Hazırlama yöntemi (kızartma/haşlama, sos, yağ) | Görünmeyen kaloriler |

**Diyetisyenlerin doğrudan tasarım önerileri:**
1. **Ölçek referansı** — "cetvel gibi bir referans noktası" fotoğrafta görünsün.
2. **Çok açılı çekim** — özellikle çorba/kâse için yandan da bir kare; "45 derece açı"
   derinlik algısı veriyor.
3. **Zamansal yeniden düzenleme** — fotoğrafları öğün tipine/zaman aralığına göre gruplayabilme
   (kronolojik akış yetmiyor).
4. **Yüksek seviye özet** — renk/doku gibi nitelikleri otomatik analiz edip *örüntü özeti* çıkarmak.

> **Ürün çıkarımı:** Diyetisyen "bu tabak 640 kcal" demiyor; "bu haftada renk yok, akşamları geç
> yiyorsun, dışarıda yeme sıklığın arttı" diyor. Kalori kesinliği taklit etmek yerine
> **diyetisyenin gerçekten yaptığı işi** taklit etmek hem daha kolay hem daha dürüst.

---

## 1.4 Genel amaçlı VLM'ler vs özel modeller (2025 kanıtı)

### 1.4a — Kontrollü veri setinde özel model kazanıyor

*Benchmarking and Improving Foundation Model Dietary Estimates from Meal Images* (2025) —
https://pmc.ncbi.nlm.nih.gov/articles/PMC13401436/

Nutrition5k üzerinde kalori MAPE:

| Model | Kalori MAPE |
| --- | --- |
| **RGB-D fusion (Nutrition5k üzerinde eğitilmiş özel model)** | **%16,8** |
| GPT-4.1 | %34,6 |
| Gemini 2.5 Flash | %42,9 |
| Llama 4 Maverick | %46,7 |

Makro hataları (ağırlık bilgisi verilmeden), Nutrition5k:

| Makro | GPT-4.1 | Gemini 2.5 Flash | Llama 4 Maverick |
| --- | --- | --- | --- |
| Karbonhidrat | %33,0 | %60,3 | %72,4 |
| Yağ | %51,2 | %58,4 | %61,3 |
| Protein | %39,3 | %43,5 | %51,0 |

### 1.4b — GERÇEK DÜNYA fotoğraflarında tablo TERSİNE DÖNÜYOR

Aynı çalışma, "DonateAndLearn" gerçek telefon fotoğrafları (78 örnek) üzerinde test etti:
**üç LMM de RGB-D fusion modelinden anlamlı ölçüde İYİ çıktı.** Yani özel model kendi eğitim
dağılımının dışına çıkınca çöküyor; genelci model dayanıyor.

> **Bu bulgunun ürün anlamı çok büyük:** "Biz özel bir besin modeli eğittik" iddiası laboratuvar
> tablosunda parlıyor ama kullanıcının mutfağında parlamıyor. Bilinmedik yemekte (Türk mutfağı,
> ev tenceresi) genel amaçlı bir VLM muhtemelen **daha sağlam**. Bizim lehimize bir bulgu.

### 1.4c — Ağırlık bilgisi vermek hatayı yarıdan fazla düşürüyor (EN ÖNEMLİ TEK BULGU)

Aynı çalışma: telefon fotoğraflarında Gemini 2.5 Flash için karbonhidrat MAPE

| Koşul | Karbonhidrat MAPE |
| --- | --- |
| Sadece fotoğraf | %56,6 |
| Fotoğraf + **tahmin edilen** ağırlık | %39,5 |
| Fotoğraf + **gerçek** ağırlık | **%20,2** |

→ Tek bir sayı (gram) hatayı **%56,6'dan %20,2'ye** indiriyor. Görüntü modelini iyileştirmeye
harcanan mühendislik, "kaç gram?" sorusunu 2 saniyede sorabilen bir arayüzün yanında
verimsiz kalıyor. **Bu, ürün stratejisinin ana dayanağı olabilir.**

### 1.4d — Bağlam metadata'sı da ciddi kazandırıyor

*Evaluating Large Multimodal Models for Nutrition Analysis: A Benchmark Enriched with Contextual
Metadata* (2025) — https://arxiv.org/html/2507.07048v1
Veri: **ACETADA** — 152 yetişkinden 806 kontrollü besleme çalışması fotoğrafı, diyetisyen onaylı
etiketler, GPS, zaman damgası, ölçek kalibrasyonu için fiducial marker.

Metadata'sız temel performans (Enerji MAE, kcal):

| Model | Enerji MAE | Protein MAE |
| --- | --- | --- |
| GPT-4o | 165,8 kcal | 12,7 g |
| Claude 3.7 Sonnet | 181,7 kcal | 15,4 g |
| Gemini 2.5 Pro | 211,0 kcal | 12,5 g |
| Janus-Pro (açık) | 477,8 kcal | 20,7 g |
| LLaMA-3.2 (açık) | 496,5 kcal | 38,5 g |

Bağlam metadata'sı (GPS + zaman damgası + yemek adları) eklenince kalori MAE düşüşü:
Janus-Pro −246 kcal · LLaMA-3.2 −193 kcal · Gemini 2.5 Pro −41 kcal · Claude 3.7 −28 kcal.
**8 model ortalaması: −76 kcal.**

Prompt tekniği etkisi (metadata ile birlikte): Expert Persona −75,4 kcal · Multimodal CoT
−64,5 kcal · Chain-of-Thought −51,1 kcal.

> Özet: **fotoğraf tek başına en zayıf girdi.** Gram + konum + saat + kullanıcı geçmişi eklendikçe
> aynı model dramatik iyileşiyor. Rekabet avantajı modelde değil, **bağlam toplama tasarımında.**


---

## 1.5 NIH/NIDDK kontrollü mutfak testi (2026) — en sert bağımsız ölçüm

Kaynak: NIDDK/NIH Clinical Center; Aaron Hengist & Olivia Charles. NUTRITION 2026 kongresinde
sunulan **ön bulgular — henüz hakem sürecinden geçmemiş.**
Haber: https://www.sciencedaily.com/releases/2026/07/260726015237.htm

**Yöntem:** Kontrollü metabolik mutfakta hazırlanan, bileşenleri **0,1 grama kadar tartılmış**
102 standart öğün fotoğrafı. Sonrasında 200+ ek öğünle doğruluk faktörleri incelendi.

**Test edilen uygulamalar:** MyFitnessPal · LoseIt! · **Cal AI** · Appediet

**Sonuçlar:**
| Ölçüm | Sonuç |
| --- | --- |
| Kalori | Öğün başına ortalama **250-345 kcal EKSİK** |
| Yağ | Yaklaşık **30 g EKSİK** |
| Karbonhidrat | Diğer makrolara göre daha tutarlı |
| En kötü durum | **Yüksek yağlı / ketojenik öğünler** |

Araştırmacının ifadesi: bu uygulamalar kaloriyi, özellikle **yağdan gelen kaloriyi eksik sayıyor**.

> **Bu bulgu Bölüm 1.2 ile birebir örtüşüyor ve yönü aynı: EKSİK SAYMA.** Ve eksik sayılan şey
> tam olarak fotoğrafta **görünmeyen** şey: tencerenin dibindeki yağ, sosun içindeki tereyağı,
> kızartma yağının emilimi. Türk mutfağı (zeytinyağlı, tereyağlı, salçalı, tencere yemeği)
> tam olarak bu hata modunun merkezinde.

---

## 1.6 ANA DOĞRULUK TABLOSU

> Kural: "İddia" = şirketin kendi pazarlaması. "Bağımsız ölçüm" = üçüncü taraf/hakemli.
> Boş hücre = **bağımsız veri bulunamadı.**

| Ürün | Teknoloji | İddia edilen doğruluk | Bağımsız ölçüm | Kaynak |
| --- | --- | --- | --- | --- |
| **SnapCalorie** | RGB + **LiDAR/depth** (iPhone Pro), Nutrition5k ekibi | "~%15 ortalama kalori hatası" | Bağımsız saha testi **BULUNAMADI**. İddia laboratuvar sonucuna (Nutrition5k %16,5 MAPE) dayanıyor | arxiv.org/abs/2103.03375 |
| **Cal AI** | 3. taraf VLM + kendi katmanı (ayrıntı açıklanmıyor) | Pazarlamada "%90+" | **250-345 kcal eksik/öğün** (NIH kontrollü mutfak, 2026, ön bulgu) | sciencedaily.com/releases/2026/07/260726015237.htm |
| **MyFitnessPal Meal Scan** | Görüntü tanıma + devasa gıda DB | Açık sayı iddiası yok | Bileşen tanıma **%97**; enerji **−%3** (Nutrients 2024). Ama NIH testinde eksik sayma grubunda | mdpi.com/2072-6643/16/15/2573 |
| **Lose It! Snap It** | Görüntü tanıma + DB eşleştirme | Açık sayı yok | NIH testinde eksik sayma grubunda | sciencedaily.com (2026) |
| **Foodvisor** | Kendi CNN'i + segmentasyon | "otomatik porsiyon tahmini" | **Enerji −%47** (Nutrients 2024) — test edilenler içinde en kötü | mdpi.com/2072-6643/16/15/2573 |
| **Fastic** | Görüntü tanıma | — | Tanıma **%92**; enerji **+%44** | mdpi.com/2072-6643/16/15/2573 |
| **HealthifyMe (Snap)** | Kendi modeli + insan koç katmanı | — | Tanıma **%90**; enerji **+%8** (test edilenler içinde en dengelilerden) | mdpi.com/2072-6643/16/15/2573 |
| **Appediet** | — | — | NIH testinde eksik sayma grubunda | sciencedaily.com (2026) |
| **Passio SDK** | Cihaz-içi (on-device) gerçek zamanlı tanıma, B2B SDK | Geliştiricilere satılan "gerçek zamanlı, offline" | Bağımsız doğruluk ölçümü **BULUNAMADI** | — |
| **Calorie Mama** | Azumio, CNN tabanlı (eski nesil) | — | Bağımsız güncel ölçüm **BULUNAMADI** | — |
| **YAZIO** | Görüntü tanıma (sonradan eklendi) | — | Nutrients 2024'te manuel loglama grubunda; AI ölçümü yok | mdpi.com/2072-6643/16/15/2573 |
| **Simple** | LLM tabanlı sohbet + fotoğraf | "AI koç" | Bağımsız doğruluk ölçümü **BULUNAMADI** | — |
| **Samsung Food** | Whisk satın alması, tarif odaklı + görüntü | — | Bağımsız ölçüm **BULUNAMADI** | — |
| **Gemini 2.5 Pro** (genel VLM) | Genel amaçlı LMM | — | Enerji MAE **211 kcal** (ACETADA); kalori MAPE **%42,9** (Nutrition5k) | arxiv.org/html/2507.07048v1 · PMC13401436 |
| **GPT-4o / GPT-4.1** | Genel amaçlı LMM | — | Enerji MAE **166 kcal**; kalori MAPE **%34,6** — genel VLM'ler içinde en iyi | aynı |
| **Claude 3.7 Sonnet** | Genel amaçlı LMM | — | Enerji MAE **182 kcal** | arxiv.org/html/2507.07048v1 |
| **RGB-D fusion (akademik en iyi)** | Derinlik + RGB, Nutrition5k eğitimli | — | Kendi verisinde **%16,8 MAPE**; **gerçek telefon fotoğrafında LMM'lerin ALTINDA** | PMC13401436 |
| İnsan diyetisyen (fotoğraftan) | — | — | **%41 ortalama hata** | arxiv.org/abs/2103.03375 |

### Cal AI hakkında ek not (pazar gerçeği)
Kurucular: Zach Yadegari ve Henry Langmack (18 yaş), Mayıs 2024 lansmanı.
**Teknoloji: kendi modeli yok** — büyük ölçüde OpenAI GPT sistemleri üzerine kurulu, artı
telefonun derinlik sensörünü hacim analizi için kullanıyor.
Ölçek: Temmuz 2025 itibarıyla 8,3M indirme; 2025'te ~$30M gelir; Ocak 2026'da $5,7M aylık gelir.
**Mart 2026'da MyFitnessPal tarafından satın alındı.**
Kaynaklar: https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/ ·
https://www.cnbc.com/2025/09/06/cal-ai-how-a-teenage-ceo-built-a-fast-growing-calorie-tracking-app.html

> **Bu neden önemli:** Kategorinin en büyük ticari başarısı, **özel model olmadan**, hazır
> VLM üzerine kurulmuş bir dağıtım/pazarlama oyunu. Yani teknik hendek (moat) modelde değil.
> Ve NIH testine göre bu ürün 250-345 kcal eksik sayıyor — **doğruluk pazarın kazananını
> belirlemedi.** Bu hem uyarı hem fırsat: doğruluk henüz rekabet ekseni değil, ama
> MyFitnessPal satın almasıyla kategori olgunlaşıyor ve eksen kayabilir.

### Tablodan çıkan üç net sonuç
1. **Kategori tek bir doğruluk seviyesi değil.** Aynı hakemli çalışmada bir ürün +%44, diğeri
   −%47. "AI kalori sayacı" bir kalite garantisi taşımıyor.
2. **Sistematik yön: EKSİK SAYMA.** İki bağımsız kaynak (NIH 2026 kontrollü mutfak; Nutrients
   2024 Asian/Recommended diyetler) aynı yöne işaret ediyor. Kullanıcı sandığından fazla yiyor.
3. **Şirket iddiası ile bağımsız ölçüm arasındaki uçurum büyük ve hiçbir ürün bunu açıklamıyor.**

---

## 1.7 En büyük çözülmemiş problemler

| Problem | Kanıt | Ne kadar çözülmüş |
| --- | --- | --- |
| **Porsiyon / gram tahmini** | Nutrition5k: 2D'de %29,5 kütle hatası, depth ile %13,7 | **Kısmen.** Depth yarıya indiriyor ama LiDAR sadece iPhone Pro'da |
| **Görünmeyen yağ / sos** | NIH 2026: yağ **~30 g eksik**; ketojenik öğünlerde en kötü | **Çözülmemiş.** Fotoğrafta bilgi fiziksel olarak yok |
| **Karışık / tencere yemekleri** | Nutrition5k tabak başına ort. 5,7 bileşen; makro hatası %26+ | **Çözülmemiş.** Katmanlı/karışmış yemekte segmentasyon başarısız |
| **Kültürel mutfaklar** | Nutrients 2024: Asian diyet **−1520 kJ**; Nutrition5k açıkça "mostly western style dishes" | **Çözülmemiş + veri seti yok** |
| **Ne kadarı yendi (tabakta kalan)** | PLOS 2024: diyetisyenler bunu **en zor bilgi** olarak işaretledi | **Çözülmemiş.** Öncesi/sonrası fotoğrafı hiçbir üründe standart değil |
| **Gerçek dünya fotoğraf kalitesi** | PLOS 2024: ışık ve açı analizi engelliyor | **Çözülmemiş.** Akademik sonuçlar hep temiz kafeterya fotoğraflarından |

### Türk / Orta Doğu mutfağı — özel not
- **Genel amaçlı veri setlerinde yok.** Nutrition5k yazarları kendi kısıtlarını itiraf ediyor:
  tek bir kafeterya, ağırlıklı Batı yemekleri.
- **Ayrı akademik çalışmalar var ama sadece SINIFLANDIRMA:**
  - Türk mutfağı benchmark veri seti (food recognition) —
    researchgate.net/publication/318035773
  - *A Confidence-Aware Hybrid Vision–Language Framework for Food Recognition and Nutritional
    Monitoring*, **Nutrients 2026, 18(15):2449** — https://doi.org/10.3390/nu18152449 ·
    https://pubmed.ncbi.nlm.nih.gov/42588072/
    **14.711 doğrulanmış görsel, 40 Türk yemek sınıfı.** EfficientNet V2-L ile **%93,47 doğruluk.**
    (Tam metin 403 verdi, ayrıntılar özet üzerinden.) Not: bu **tanıma** doğruluğu, **kalori**
    doğruluğu değil.
  - Orta Asya mutfağı veri seti — https://doi.org/10.3390/nu15071728
  - 23 Orta Doğu yemeği üzerinde %94 tanıma (Aktı ve ark.)
- **Sonuç:** Türk yemeğini **tanımak** çözülmüş bir problem (%93-94). Türk yemeğinin **kaç kalori
  olduğunu** bilmek çözülmemiş — çünkü porsiyon + görünmeyen yağ problemi Türk mutfağında
  Batı mutfağından **daha ağır** (tencere, karışım, zeytinyağı, salça, tereyağı).
- **Fırsat:** "Türk mutfağı için doğru çalışan tek uygulama" iddiası teknik olarak savunulabilir
  ve rakiplerin ölçülmüş zayıflığının tam ortasında.

---

## 1.8 Doğruluğu artırma yolları — hangisi gerçekten işe yarıyor?

Etki büyüklüğüne göre sıralı (hepsi ölçülmüş):

| Yöntem | Ölçülen etki | Kaynak |
| --- | --- | --- |
| **1. Kullanıcıdan gram almak** | Karbonhidrat MAPE %56,6 → **%20,2** | PMC13401436 |
| **2. Derinlik/LiDAR** | Kütle hatası %29,5 → **%13,7**; kalori %26,1 → %16,5 | Nutrition5k |
| **3. Bağlam metadata'sı** (GPS, saat, yemek adı) | Ortalama **−76 kcal** MAE, 8 model | arxiv 2507.07048 |
| **4. Prompt mühendisliği** (expert persona) | **−75 kcal** MAE | arxiv 2507.07048 |
| **5. Tahmin edilen ağırlık** (gerçek değil) | Karbonhidrat MAPE %56,6 → %39,5 | PMC13401436 |
| **6. Referans obje / cetvel** | Diyetisyenlerin **kendi talebi**; ACETADA fiducial marker kullanıyor | PLOS 2024 |
| **7. Çok açılı çekim (45°, yandan)** | Diyetisyen talebi, sayısal etki **ölçülmemiş** | PLOS 2024 |
| **8. Öncesi/sonrası fotoğrafı** | Diyetisyenlerin en çok istediği; sayısal etki **BULUNAMADI** | PLOS 2024 |

**Ürün karşılığı — kim ne yapıyor:**
| Yöntem | Yapan ürünler |
| --- | --- |
| Derinlik/LiDAR | **SnapCalorie** (tek gerçek uygulayıcı, iPhone Pro'da) |
| Kullanıcı düzeltmesi | Neredeyse hepsi (Cal AI, MFP, Lose It!) — ama **düzeltmeden ÖĞRENEN** ürün kanıtı bulunamadı |
| Tarif hafızası / tekrarlayan öğün | MyFitnessPal (Meals/Recipes), Lose It!, MacroFactor, Cronometer |
| Ağırlık girme opsiyonu | Cronometer, MacroFactor, MFP (manuel akışta; **fotoğraf akışında sürtünmeli**) |
| Referans obje | Standart uygulama **YOK**; sadece akademik (ACETADA) |
| Öncesi/sonrası | Standart uygulama **BULUNAMADI** |

> **Boşluk analizi:** En yüksek etkili yöntem (#1, gram girme) en düşük teknoloji gerektiren
> yöntem. Ve fotoğraf akışına düzgün entegre eden ürün yok — çünkü herkes "tek fotoğraf,
> sıfır efor" pazarlamasına kilitlenmiş. **Bu bir ürün boşluğu.**

---

## 1.9 Belirsizliği kullanıcıya göstermek — farklılaşma alanı mı?

### Piyasa durumu
Büyük ürünlerin (Cal AI, MyFitnessPal, Lose It!, Foodvisor, YAZIO) **hepsi tek bir kesin sayı
gösteriyor**: "642 kcal". Bölüm 1.6'daki tabloya göre bu sayının gerçek belirsizliği
**±%30-50 mertebesinde.** Yani sektör standardı **sahte kesinlik (false precision)** satmak.

Aralık gösterdiğini iddia eden ürünler bulundu ama hepsi küçük/yeni ve **bağımsız doğrulaması
yok**: PlateLens ("her adımda confidence skoru, kaynaklar çelişince aralık gösterir"),
bazı yeni niş uygulamalar. **Büyük bir oyuncunun aralık gösterdiğine dair kanıt BULUNAMADI.**

### Literatür ne diyor?
**Reyes ve ark. (2025),** *Trusting AI: does uncertainty visualization affect decision-making?*
Frontiers in Computer Science —
https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1464348/full

Yöntem: 147 katılımcı (130 düşük kaliteli yanıt elendikten sonra), 3 oyun senaryosu
(Pac-Man, Minesweeper, Soccer), 3 görsel belirsizlik gösterimi (boyut, renk doygunluğu, şeffaflık).

Bulgular:
| Bulgu | Sayı |
| --- | --- |
| AI'a karşı **olumsuz** tutumu olanlarda güven artışı | **%58** |
| AI'a karşı olumlu tutumu olanlarda güven artışı | Sadece küçük (M=0,05) |
| Belirsizlik görünce **kararını değiştiren** | **%33** |
| Şüphecilerin görselleştirmeyi "faydalı" bulma oranı | %31 |
| En bilgilendirici bulunan gösterim | **Boyut** (M=1,00) |
| En sezgisel bulunan | **Renk doygunluğu** |

Destekleyici kanıt: eczacılarda otomatik hap tanıma teknolojisinde belirsizlik grafiği
eklenmesi **son güveni anlamlı şekilde artırdı** —
https://pmc.ncbi.nlm.nih.gov/articles/PMC11862782/

### Yorum — bu gerçek bir fırsat mı?
**Evet, ama nüanslı.**
- **Lehte:** Etki en çok **şüphecilerde** (%58). AI kalori sayaçlarının en büyük kullanıcı
  şikâyeti zaten "bu sayıya güvenmiyorum" — yani hedef kitle tam olarak o grup.
- **Aleyhte:** Aynı literatür şunu da söylüyor: belirsizlik göstermek **anlık güveni düşürebilir**,
  uzun vadeli güvenilirliği artırır. Yani onboarding'de conversion'a zarar verebilir. Rakiplerin
  aralık göstermemesinin ticari sebebi muhtemelen bu.
- **Doğrudan beslenme uygulamalarında test edilmiş çalışma BULUNAMADI.** Kanıt başka
  alanlardan (oyun senaryosu, eczacılık) transfer ediliyor. Bu bir varsayım, kanıt değil.

**Tasarım çıkarımı:** Belirsizliği ham aralık olarak değil, **eyleme dönüştürülebilir** biçimde
göster. "480-620 kcal" kullanıcıyı felç eder. "≈550 kcal · bu tahmin zayıf, yağı bilmiyorum —
2 saniye: kızartma mı, haşlama mı?" hem dürüst hem sürtünmeyi *azaltmak için* belirsizliği
kullanıyor. Belirsizlik bir özür değil, **bir soru sorma gerekçesi.**


---
---

# BÖLÜM 4 — "Gerçek bir koçtan hizmet alıyorum" hissi

## 4.1 Dijital koçluk vs insan koçluk — sayısal kanıt

### Sistematik derleme: Loughnane ve ark. (2025), Frontiers in Digital Health
*Systematic review exploring human, AI, and hybrid health coaching in digital health interventions*
https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1536416/full

**Kapsam:** Şubat 2025'e kadar 35 hakemli çalışma.
Dağılım: **insan koçluk 18 çalışma (%51) · AI koçluk 13 (%37) · hibrit sadece 4 (%11)**

**Tamamlama / bağlılık oranları:**

| Model | Tamamlama oranı |
| --- | --- |
| **İnsan koçluk** | **%80-100** (bir çalışmada %87 tamamlama, bir diğerinde %95,2 seans katılımı) |
| **AI koçluk** | Tipik **%90-93**, ama uç değerler çok kötü: %58 · %20,3-45,4 · **%9,8** |
| **Hibrit** | **%55-56,5** |

> **Bu tablonun okunuşu kritik:** AI koçluk *ortalamada* insan koçlukla yarışıyor **ama varyansı
> felaket.** İnsan koçluk %80'in altına düşmüyor; AI koçluk %9,8'e kadar inebiliyor. Yani AI koçluk
> "iyi tasarlanırsa iyi, kötü tasarlanırsa tamamen ölü" bir kategori. Güvenilirlik farkı burada.

**Sonuç bulguları:**
- İnsan koçluk: depresyon/anksiyete semptomlarında **tutarlı** azalma; meyve/sebze alımında
  anlamlı iyileşme.
- AI koçluk: adım sayısı ve aktivitede **tutarlı pozitif** etki; yeme alışkanlığı ve öz-düzenlemede
  olumlu değişim.
- **Hibrit: iyileşmeler insan bileşeni bittikten sonra SÜRMÜYOR.** Yazarların ifadesi: hibrit
  yaklaşımlar *"need further refinement"*.

### Diğer kanıtlar
- Meta-analiz bulgusu: dijital müdahaleler yüz yüze müdahalelere göre **kısa vadede daha fazla**
  kilo kaybı, **uzun vadede fark yok** — sebebi kısmen dijitalde kötü uzun vadeli bağlılık ve
  tutundurma.
- Diyetisyen online koçluk eklenen RCT: koçluk grubunda tamamlanan seans **7,6 vs 5,2**
  (platform-only), ve **klinik olarak anlamlı kilo kaybı şansı anlamlı derecede yüksek**.
  https://pubmed.ncbi.nlm.nih.gov/33151151/

> **Levent için çıkarım:** İnsan koçun kattığı şey *bilgi* değil, **tutundurma (retention)**.
> Bilgi zaten bedava. İnsan koç, insanın devam etmesini sağlıyor. Yani rekabet edilmesi gereken
> şey içerik kalitesi değil, **devam ettirme mekaniği.**

---

## 4.2 "Kişisel hizmet" hissini kuran somut tasarım kalıpları

Aşağıdakiler kanıt seviyelerine göre etiketlendi.

| # | Kalıp | Kanıt seviyesi | Kaynak / gerekçe |
| --- | --- | --- | --- |
| 1 | **Geçmişi hatırlama ve geri referans verme** ("geçen hafta akşam yemeklerin geç kalıyordu, bu hafta düzelmiş") | **Güçlü** — diyetisyenlerin fiilen yaptığı şey bu | PLOS 2024: uzmanlar haftalık frekans örüntüsüne bakıyor |
| 2 | **Bağlam sorusu sormak** ("nerede yedin?", "evde mi pişti?") | **Güçlü** — hem doğruluğu artırıyor hem koç hissi veriyor | PLOS 2024 (diyetisyenlerin sorduğu sorular) + arxiv 2507.07048 (metadata −76 kcal) |
| 3 | **Check-in ritüeli** (düzenli, öngörülebilir temas noktası) | **Orta** — insan koçluğun tamamlama avantajının mekanizması | Loughnane 2025 |
| 4 | **İlerleme raporu / geriye bakış** | **Orta** | PLOS 2024: diyetisyenler fotoğrafları yeniden gruplayıp örüntü çıkarıyor |
| 5 | **Kritik anda insan devreye girmesi** (hibrit) | **Karışık** — engagement artıyor ama insan çekilince etki sönüyor | Loughnane 2025; dietitian RCT |
| 6 | **Ses / kişilik tutarlılığı** | **Güçlü ama TERS yönden kanıtlı** — tutarlılığı BOZMAK ölçülebilir zarar veriyor | De Freitas ve ark. 2025 (aşağıda) |
| 7 | İsimle hitap | **Zayıf** — doğrudan sayısal kanıt **BULUNAMADI** |  |

### Kalıp 6 için sert kanıt — kişilik sürekliliğini bozmanın bedeli
De Freitas, Castelo, Uğuralp, Oğuz-Uğuralp (2025). *Lessons From an App Update at Replika AI:
Identity Discontinuity in Human-AI Relationships.* HBS Working Paper 25-018 · arXiv:2412.14190
https://arxiv.org/abs/2412.14190

- Aktif Replika kullanıcıları AI arkadaşlarına **en yakın insan arkadaşlarından daha yakın**
  hissettiklerini bildiriyor; kaybını başka herhangi bir teknolojiden **daha fazla yas tutacaklarını**
  öngörüyorlar.
- Replika bir güncellemeyle intim etkileşim özelliğini kaldırdı → kullanıcılarda **"kimlik
  süreksizliği" (identity discontinuity)** algısı oluştu.
- Bu algı doğrudan şunları **öngördü**: kayıp yası, "yeni" AI'ı "orijinal"e göre değersiz görme,
  bozulan ruh sağlığı — yani **insan ilişkisinde partner kaybının tipik tepkileri.**
- Kullanıcılar ürünü aynı anda arkadaş, terapist ve entelektüel ayna olarak kullanıyordu.
  **%3'ü Replika'nın intihar düşüncesini durdurduğunu bildirdi.**

> **Ürün kuralı:** AI koçun kişiliği bir **özellik değil, bir taahhüt.** Model değiştirmek, prompt
> değiştirmek, tonu değiştirmek kullanıcı için "koçum değişti" demek. Bunu versiyonlamak ve
> değişiklikleri kullanıcıya duyurmak zorunlu. Sessizce model upgrade etmek ölçülmüş bir hata.

---

## 4.3 Nerede TERS tepiyor — üç tuzak

### Tuzak A: Sahte samimiyet / bağımlılık tasarımı
- Yaklaşık **1.000 kişilik çalışma**: AI companion ürünleriyle günlük daha fazla zaman geçirenler
  **anlamlı derecede daha yalnız** ve gerçek insanlarla **anlamlı derecede daha az** sosyalleşiyor.
  (Nedensellik yönü belirsiz — korelasyon.)
- Replika hakkında **FTC şikâyeti**: aldatıcı pazarlama ve **duygusal bağımlılığı teşvik etme**
  iddiası. https://time.com/7209824/replika-ftc-complaint/
- **Kural:** "AI arkadaşın" konumlandırması bir düzenleyici ve itibar riski. Koç ≠ arkadaş.
  Koç, ilişkinin **araçsal** olduğunu açıkça belli eder.

### Tuzak B: Aşırı bildirim
Bkz. Bölüm 3.5 (bildirim stratejisi kanıtı).

### Tuzak C: Sycophancy — asıl teknik tuzak. Aşağıda ayrı bölüm.

---

## 4.4 SYCOPHANCY — ölçülmüş büyüklüğü ve mimari çözümler

### Problem ne kadar büyük? (ELEPHANT benchmark, 2025)
Cheng, Yu, Lee, Khadpe, Ibrahim, Jurafsky (2025). *Social Sycophancy: A Broader Understanding
of LLM Sycophancy.* arXiv:2505.13995 · Kod/veri: github.com/myracheng/elephant

11 model, 4 veri seti. Yeni tanım: sycophancy = **kullanıcının "yüzünü" (face) aşırı koruma** —
sadece hemfikir olmak değil, kullanıcının kendilik imajını sarsmaktan kaçınmak.

**LLM vs insan (kalabalık kaynaklı insan yanıtlarıyla aynı sorularda):**

| Boyut | LLM | İnsan | Fark |
| --- | --- | --- | --- |
| Kullanıcıyı **doğrulama** (validation) | **%72** | %22 | **+50 puan** |
| **Doğrudan yönlendirmeden kaçınma** (indirectness) | **%66** | %21 | **+43 puan** |
| Kullanıcının **çerçevesini sorgulamama** (framing) | **%88** | %60 | **+28 puan** |
| Genel "yüz koruma" (tavsiye sorularında) | — | — | **+45 puan ortalama** |

Ek bulgular:
- Temelsiz varsayımları içeren ifadelerde model **%86 oranında varsayımı sorgulamıyor.**
- **Ahlaki tutarsızlık:** kullanıcı hangi tarafı sunarsa modeller o tarafı onaylıyor — **%48**
  oranında iki tarafı da onaylıyorlar (insanlar tutarlı taraf tutuyor).
- **Kök neden:** tercih veri setleri (RLHF/DPO eğitiminde kullanılan) **sycophantic davranışı
  ödüllendiriyor.** Yani bu bir bug değil, eğitim hedefinin doğal sonucu.
- **Mitigasyon sonucu:** üçüncü şahıs perspektifine yeniden yazma, DPO ile steering, doğruluk
  için tune edilmiş modeller — **etkinlik karışık.** Sadece **model-based steering umut vaat
  ediyor.** Prompt'la çözülmüyor.

> **Bu bizim için ürünün kalbindeki risk.** Bir fitness koçunun işi tam olarak yukarıdaki
> dört satırın TERSİ: kullanıcıyı doğrulamamak, doğrudan söylemek, çerçeveyi sorgulamak,
> tutarlı durmak. Ham LLM bu işin **tam zıddını** yapmak üzere eğitilmiş.

### Sektör dersi: OpenAI GPT-4o olayı (Nisan 2025)
25 Nisan 2025 güncellemesi aşırı yaltaklanma davranışı gösterdi, **4 gün sonra geri alındı.**
https://openai.com/index/sycophancy-in-gpt-4o/ ·
https://openai.com/index/expanding-on-sycophancy/

OpenAI'ın kendi kök neden analizi (doğrudan alınacak dersler):
1. Güncelleme **kısa vadeli geri bildirime aşırı odaklandı** (thumbs up/down), kullanıcı
   etkileşiminin zaman içinde nasıl evrildiğini hesaba katmadı.
2. **Offline eval'lar sycophancy'yi yakalayacak kadar geniş/derin değildi.**
3. **A/B testleri doğru sinyali taşımıyordu** — metrikler iyi görünüyordu.
4. Düzeltme: davranış sorunlarını (halüsinasyon, aldatma, güvenilirlik, **kişilik**) **launch'u
   bloke eden** konular olarak resmileştirmek; metrikler iyi görünse bile proxy ölçüm veya
   niteliksel sinyalle launch'u durdurabilmek.

> **Levent için doğrudan ders:** Kullanıcı memnuniyetini (👍) optimize eden her koç ürünü
> matematiksel olarak yaltaklanmaya kayar. Çünkü kullanıcı "bugün pizza yedim" dediğinde
> "sorun değil, yarın telafi ederiz!" cevabına 👍 verir, "bu hafta üçüncü oldu, hedefin bu
> gidişle tutmayacak" cevabına 👎 verir. **Ödül sinyalinin kendisi bozuk.**

### Mimari çözümler — somut mühendislik yaklaşımları

Kanıt seviyeleri farklı; ayırt ederek okumak lazım.

| Yaklaşım | Nasıl çalışır | Kanıt durumu |
| --- | --- | --- |
| **A. Kural motoru + LLM ayrımı** (en sağlam) | Kararı LLM **vermez**. Deterministik kod verir: "haftalık kalori dengesi +2400 → hedef tutmuyor". LLM sadece bu kararı **ifade eder**. LLM'in "hayır" deme yetkisi yok; "hayır"ı zaten kod söylüyor. | Mimari olarak sycophancy'ye **yapısal bağışıklık** sağlar (LLM'in değiştirebileceği bir yargı yok). ELEPHANT'ın "prompt mitigasyonu yetersiz" bulgusuyla tutarlı. |
| **B. Ayrı judge/critic modeli** | Birinci model yanıtı üretir, ikinci model "bu yanıt kullanıcıyı gereksiz yere doğruluyor mu?" diye denetler. ELEPHANT'ın kendi skorlayıcısı bu mimaride (human-validated LLM scorer). | Benchmark **ölçümünde** çalışıyor. Üretimde etkinliği için bağımsız kanıt zayıf. |
| **C. Model-based steering (DPO / aktivasyon yönlendirme)** | Model temsillerinde sycophancy yönünü bulup bastırmak | ELEPHANT: denenen mitigasyonlar içinde **tek "umut vaat eden"** olan bu. Ama uygulaması ağır. |
| **D. Üçüncü şahıs yeniden çerçeveleme** | Kullanıcının sorusunu "bir kişi şunu yapıyor…" diye üçüncü şahsa çevirip modele sormak | ELEPHANT'ta denendi, **etkinlik karışık.** Ucuz, kısmi fayda. |
| **E. Rol ayrımı (farklı mod / farklı prompt / farklı guardrail)** | Destekleyici mod ile değerlendirici mod ayrı çalışır; kullanıcı hangi modda olduğunu bilir | GPT-4o olayından çıkan sektör tavsiyesi. Sayısal kanıt yok, ama **temiz ve ucuz.** |
| **F. Ödül sinyalini değiştirme** | 👍/👎 yerine **davranışsal sonuç** ölçmek (kullanıcı 4 hafta sonra hâlâ logluyor mu, hedefe yaklaştı mı) | OpenAI'ın kök neden analizinin doğrudan sonucu. Ürün tarafında en yüksek kaldıraç. |
| **G. Sycophancy eval'ı CI'a koymak** | Her prompt/model değişikliğinde sabit bir "koç hayır demeli" senaryo setinden geçirmek | OpenAI'ın "offline eval yeterince derin değildi" itirafının doğrudan karşılığı. ELEPHANT kodu açık — temel alınabilir. |

**Pratik öneri (A + F + G kombinasyonu):**
1. **Yargı katmanı deterministik olsun.** "Hedefin tutuyor mu?" sorusunun cevabı bir fonksiyon,
   bir prompt değil. Enerji dengesi matematiği zaten deterministik (bkz. MacroFactor, Bölüm 3).
2. **LLM sadece çeviri katmanı olsun.** Deterministik çıktıyı Türkçe, kişiye özel, empatik ama
   **içeriği değiştirilemez** biçimde ifade etsin.
3. **Ödülü 4 haftalık tutundurmaya bağla**, anlık beğeniye değil.
4. **"Koç hayır demeli" eval seti** yaz ve her değişiklikte çalıştır.

> Bu mimari aynı zamanda **portfolyo kanıtı** olarak güçlü: "LLM'in sycophancy'ye yapısal olarak
> kayamayacağı bir koçluk mimarisi kurdum, ölçtüm" cümlesi savunulabilir bir mühendislik iddiası.

---

## 4.5 Hibrit model (AI + gerçek insan) — ekonomisi tutuyor mu?

**Yapan ürünler:**
| Ürün | Model | Bilinen ölçek |
| --- | --- | --- |
| **HealthifyMe** | AI ("Ria") + insan koç, Hindistan merkezli | **40M+ kullanıcı, 600+ koç, 300+ şehir** (şirket beyanı) |
| **Noom** | Grup koçluğu + Premium katmanında 1:1 insan DM koçluğu + AI chatbot | Ölçek verisi bulunamadı |
| **Omada Health** | Klinik odaklı insan koç + dijital | Ölçek verisi bulunamadı |
| **Found** | İlaç + koçluk | Ölçek verisi bulunamadı |

**Ekonomi ne diyor?**
- HealthifyMe oranı kabaca **66.000 kullanıcı / koç** — ama bu toplam kullanıcı. İnsan koç
  sadece **ücretli üst katmana** veriliyor. Yani model şu: **ücretsiz/ucuz katman %100 AI,
  pahalı katman insan.** İnsan koç bir ürün özelliği değil, bir **fiyat katmanı.**
- Noom da aynısını yapıyor: 1:1 insan koçluk **Premium**'da.
- **Ama:** Loughnane 2025 sistematik derlemesi hibrit tamamlama oranını **%55-56,5** ölçtü —
  saf insan (%80-100) ve saf AI (%90-93 tipik) altında. Ve iyileşmeler **insan bileşeni bitince
  sürmüyor.**

> **Sonuç:** Hibrit ekonomik olarak tutuyor (fiyat katmanı olarak), **davranışsal olarak
> kanıtlanmadı.** Sadece 4 çalışma var ve sonuçları saf modellerden kötü. Bu, "AI + insan
> en iyisidir" sezgisinin **kanıtla desteklenmediği** anlamına geliyor.
> **Levent için:** yurt odasından tek kişilik operasyonda insan koç katmanı zaten imkânsız.
> İyi haber: kanıt bunu bir dezavantaj olarak göstermiyor.


---
---

# BÖLÜM 2 — Sürtünme azaltmanın diğer yolları

## 2.1 Sürtünme ↔ bırakma ilişkisi: sayısal kanıt (önce bu)

Sürtünmenin neden en önemli metrik olduğunu gösteren en net çalışma:

**Arroyo, Carpenter, Krukowski, Ross (2024).** *Identification of Minimum Thresholds for Dietary
Self-Monitoring to Promote Weight Loss-Maintenance.* **Obesity (Silver Spring)** 2024;32(4):655-659.
https://pmc.ncbi.nlm.nih.gov/articles/PMC10972539/

74 yetişkin (ort. 50,7 yaş, BMI 31,2), 3 ay müdahale + 9 ay gözlem.

| Eşik | Sonuç |
| --- | --- |
| **≥3 gün/hafta loglama** | Daha az kilo geri alımı |
| **≥5 gün/hafta loglama** | Kilo kaybı devam ediyor. Toplam kayıt sayısı kontrol edildiğinde **anlamlılığını koruyan TEK eşik bu** |

**Ama gerçek davranış:** katılımcılar ortalama **2,43 ± 2,10 gün/hafta** loglamış.
Yani hedeflenen eşiğin (5) yarısından az.

**Bağlılığın zaman içinde çöküşü:**
| Dönem | Loglama bağlılığı |
| --- | --- |
| 4-6. aylar | **%42,8** |
| 10-12. aylar | **%25,9** |

**Payne, Turk ve ark. (2022).** *Adherence to mobile-app-based dietary self-monitoring — Impact
on weight loss in adults.* **Obesity Science & Practice**. https://pubmed.ncbi.nlm.nih.gov/35664248/
8 hafta, FatSecret. Ortalama loglama frekansı **%50,1 ± 33,3** günlerin. Hem **tutarlılık**
(tutarlı loglanan hafta sayısı, ort. 4,4 ± 2,8) hem **frekans** kilo kaybıyla anlamlı ilişkili.
**Ama "tamlık" (complete logging) ilişkili DEĞİL.**

> **Bu üç bulgu birlikte, ürünün ana tezini veriyor:**
> 1. Hedef 5 gün/hafta, gerçek 2,4 gün/hafta. **Aradaki fark sürtünme.**
> 2. Bağlılık 12 ayda %43 → %26'ya düşüyor. Sürtünme birikimli.
> 3. **Eksiksiz loglama kilo kaybını öngörmüyor; TUTARLI loglama öngörüyor.**
>    → Mükemmel doğruluk peşinde koşup kullanıcıyı yormak **ölçülmüş bir hata.**
>    "Kaba ama her gün" > "mükemmel ama üç günde bir."

Ek: bir çalışmada uygulamayı **aktif** kullanan oran 189.770 kişiden **4.895 (%2,58)**.
Bir diğerinde toplam bırakma **%30** (fotoğraf grubu %39, uygulama grubu %20).
Uygulama tabanlı çalışmalarda bağlılık tipik olarak olası günlerin **%45-58**'i.
https://pmc.ncbi.nlm.nih.gov/articles/PMC4004142/ ·
https://link.springer.com/article/10.1007/s41347-021-00203-9

---

## 2.2 Sesli / doğal dil ile loglama

**Beslenme tarafı — kim yapıyor:**
| Ürün | Durum |
| --- | --- |
| **Passio.ai Voice Logging SDK** | B2B SDK. Cümleyi transkript edip loglanabilir gıda kalemlerine ayırıyor, tarif ve tam öğün anlıyor. https://www.passio.ai/voice-logging |
| **MyFitnessPal** | Sesli/doğal dil girişi mevcut (AI özellikler katmanında) |
| **Cal AI, Simple, HealthifyMe** | Sohbet/ses girişi var |
| Bir dizi yeni niş uygulama (SpeakMeal, Voice Calorie AI vb.) | Kategori hızla kalabalıklaşıyor — **ses artık farklılaştırıcı değil, tablo bahsi** |

**Süre karşılaştırması — DİKKAT, kanıt zayıf:**
Yaygın olarak dolaşan rakamlar: manuel giriş **45-90 sn/öğün**, günde 3 öğün + 2 ara öğünle
**4-7 dk/gün**; ses **<30 sn**; ses thumb-typing'den **~3x hızlı**. Bu rakamlar bir JMIR 2024
çalışmasına atfediliyor **ama birincil kaynak doğrulanamadı** — sadece ürün blog'larında
görüldü. **Bu sayıları kullanma, DOĞRULANMADI.**

**Doğrulanmış tek karşılaştırma:** Bir 2025 RCT'de AI görüntü tanıma uygulaması, **sadece-ses**
öğün bildirimi yapan uygulamayı hem tanıma doğruluğunda hem zaman verimliliğinde geçti
(Nutrients 2024 derlemesindeki aktarım üzerinden). Yani **ses fotoğraftan otomatik olarak
hızlı değil.**

> **Doğru okuma:** Ses ve fotoğraf rakip değil, **tamamlayıcı.** Fotoğraf "ne yediğini" iyi
> yakalıyor, ses "fotoğrafta görünmeyeni" (yağ, sos, porsiyon, pişirme yöntemi) iyi yakalıyor.
> Bölüm 1.4c'yi hatırla: gram bilgisi hatayı %56,6→%20,2 düşürüyor. **Gramı en ucuz alma yolu
> ses.** Fotoğraf çek + "bir kepçe kadar, zeytinyağlı" de → hem hızlı hem doğru.

**Antrenman tarafı:** Doğal dil ile set loglama (Hevy, Strong vb. yapmıyor; manuel).
Sesli set loglama yapan olgun ürün **BULUNAMADI.** Küçük bir boşluk olabilir ama spor salonunda
konuşmak sosyal olarak sürtünmeli — dikkat.

---

## 2.3 Otomatik veri: ne gelir, ne gelmez

| Kaynak | Otomatik GELEN | Otomatik GELMEYEN |
| --- | --- | --- |
| **Apple HealthKit** | Adım, mesafe, aktif enerji, kalp atışı, HRV, uyku, kilo (tartı bağlıysa), egzersiz süresi/tipi | **Ne yediğin. Set/tekrar/ağırlık. Kalori alımı.** (HealthKit besin alanları var ama **başka bir uygulamanın yazması** gerekir) |
| **Google Health Connect** | HealthKit ile büyük ölçüde aynı; Android ekosistem köprüsü | Aynı |
| **Garmin / Whoop / Oura / Fitbit API** | Uyku evreleri, HRV, dinlenme nabzı, recovery/readiness skoru, aktivite | Aynı — **beslenme yok, direnç antrenmanı detayı yok** |

**Kritik gerçek:** Otomatikleşen her şey **fizyoloji ve hareket.** Otomatikleşmeyen her şey
**girdi** — yani yemek ve ağırlık kaldırma detayı. Sürtünmenin tamamı otomatikleşmeyen tarafta.
Wearable entegrasyonu bu problemi **çözmez**, sadece etrafını süsler.

### Spor salonunda otomatik set/tekrar sayımı — çalışıyor mu?

**Hakemli doğrulama:** Oberhofer ve ark. (2021), *Validation of a Smartwatch-Based Workout
Analysis Application…*, **Sports (Basel)** 9(9):118.
https://pmc.ncbi.nlm.nih.gov/articles/PMC8471343/

30 sporcu (14 E / 16 K), Apple Watch Sport + StrengthControl uygulaması, 363 set,
GymAware lineer pozisyon transduseri ile karşılaştırma.

| Ölçüm | Sonuç |
| --- | --- |
| Egzersiz **tanıma** (genel) | **%88,4** |
| — Bench press | %96,5 |
| — Deadlift | %92,2 |
| — **Back squat** | **%76,5** |
| Tekrar **sayma** — back squat | Kabul edilebilir (p=0,68) ✓ |
| Tekrar sayma — deadlift | Kabul edilebilir (p=0,09) ✓ |
| Tekrar sayma — **bench press** | **Kötü (p=0,01)** ✗ |
| **1RM tahmini** | Denemelerin sadece **%8,9'u başarılı** (teknik sorunlar, veri aktarım gecikmesi) |

> **Not:** Bu 1. nesil Apple Watch, 2021. Modern donanım daha iyi olabilir ama **hakemli
> güncel doğrulama BULUNAMADI.** Piyasada Motra (eski Train Fitness) ve Gymatic bilekten
> tekrar sayıyor; Whoop'un 2026 "Passive MSK" özelliği **tekrar saymıyor**, bilek kinematiği +
> vücut ağırlığından yük tahmini yapıyor (sık alıntılanan "%97" rakamı yük skorunun
> tekrarlanabilirliği, tekrar sayma doğruluğu **değil**).

**Sonuç:** Otomatik set sayımı **kısmen çalışıyor** — egzersiz tanıma iyi (%88), tekrar sayma
egzersize göre değişken, ağırlık (kaç kg) **hiç otomatik gelmiyor.** Ağırlık her zaman manuel.
Yani antrenman loglamasının sürtünmesi tam olarak çözülemiyor.

---

## 2.4 Tekrarlayan davranış hafızası

Bu **en yüksek getirili ve en az yapılan** sürtünme azaltma yolu. Gerçek insanlar aynı şeyleri
yiyor — ama ürünler her seferinde sıfırdan başlatıyor.

| Yetenek | Kim iyi yapıyor |
| --- | --- |
| Kaydedilmiş öğün / tarif | MyFitnessPal (Meals & Recipes), Cronometer, MacroFactor, Lose It! |
| "Dünkünü kopyala" | MyFitnessPal, MacroFactor, Cronometer (gün kopyalama) |
| Sık kullanılanlar / son kullanılanlar listesi | Neredeyse hepsi |
| **Haftalık ritim öğrenme** ("pazartesileri hep aynı kahvaltı") ve **proaktif öneri** | **Yapan ürün BULUNAMADI** |
| **Kullanıcı düzeltmesinden model öğrenmesi** (bir kez düzelttiğin yemeği bir daha yanlış tahmin etmemek) | **Yapan ürün için kanıt BULUNAMADI** — hepsi düzeltmeyi o kayda uyguluyor, modele değil |

> **Boşluk:** Bölüm 1.4d'deki bulgu (zaman damgası + konum metadata'sı ortalama −76 kcal hata)
> tam olarak bu boşluğa işaret ediyor. Uygulama "salı 08:30, evdesin, son 6 salı aynı kahvaltıyı
> yedin" bilgisine sahip ve **kullanmıyor.** Bu bilgiyi kullanmak hem doğruluğu artırır hem
> loglamayı tek dokunuşa indirir. Teknik olarak da ucuz — LLM gerekmiyor, örüntü eşleştirme yeter.

---

## 2.5 Bir öğünü loglamak kaç saniye sürüyor?

**Karşılaştırmalı, bağımsız, hakemli ölçüm BULUNAMADI.** Bu şaşırtıcı bir literatür boşluğu.

Ne var:
- Ürün blog'larında dolaşan **45-90 sn manuel / <30 sn ses** rakamları — **birincil kaynak
  doğrulanamadı, kullanma.**
- Dolaylı kanıt: Bölüm 2.1'deki bağlılık çöküşü (%43 → %26) sürtünmenin gerçek olduğunu
  gösteriyor ama saniye cinsinden ölçmüyor.

> **Fırsat (portfolyo açısından):** Bu ölçümü **kendin yapabilirsin.** 5 uygulamada aynı 10 öğünü
> logla, süreyi kaydet, yayınla. Literatürde olmayan bir veri üretmiş olursun — hem içerik
> hem ürün kanıtı. Düşük maliyetli, yüksek getirili bir iş.


---
---

# BÖLÜM 3 — Gün içi dinamik yönlendirme

## 3.1 Kim gerçekten "günün kalanında şunu yapabilirsin" diyor?

Ayrım: **kalan kalori göstermek ≠ yönlendirme.** Yönlendirme = somut, uygulanabilir seçenek sunmak.

| Ürün | Ne yapıyor | Gerçek yönlendirme mi? |
| --- | --- | --- |
| MyFitnessPal, Lose It!, YAZIO, Cronometer | Kalan kalori / makro sayacı | **Hayır** — sadece aritmetik |
| **MacroFactor** | Haftalık kalori hedefi + gün içi kalan; hafta içinde yeniden dağıtım mümkün | **Kısmen** — matematik dinamik, ama "ne ye" demiyor |
| **Carbon Diet Coach** | Haftalık check-in + otomatik makro ayarı; antrenman etrafında haftalık planlayıcı | **Kısmen** — haftalık, gün içi değil |
| **RP Diet Coach** | Periyodizasyon mantığına göre faz içinde makro kaydırma + öğün şablonları | **Kısmen** — plan odaklı, tepkisel değil |
| **Noom** | Grup koçluğu + Premium'da 1:1 insan DM + AI chatbot | **Evet, ama insan üzerinden** |
| **HealthifyMe (Ria)** | AI + insan koç; sohbette gün içi öneri | **Evet** (Hindistan pazarı) |
| **Simple** | LLM sohbet, gün içi soru-cevap | **İddia ediyor**, bağımsız değerlendirme **BULUNAMADI** |

> **Boşluk:** "Öğlen 1400 kcal yedin, akşam antrenmanın var, 900 kcal kaldı — şu üç seçenekten
> biri işini görür ve üçü de senin dolabında var" diyen olgun bir ürün **BULUNAMADI.**
> Sayaç gösteren çok, karar veren yok.

---

## 3.2 Antrenman gününe göre kaydırma (calorie / carb cycling)

| Ürün | Mekanizma | Kaynak |
| --- | --- | --- |
| **MacroFactor** | Coached mode'da **"calorie shifting"** — antrenman günlerinde daha yüksek enerji. Collaborative/manual modda günlük hedefler elle ayarlanabilir, **haftalık kalori hedefi korunur.** Detaylı mekanik dokümante edilmemiş. | help.macrofactorapp.com/en/articles/30-… |
| **Carbon Diet Coach** | Haftalık planlayıcı ile antrenman günü etrafında carb cycling; insan koçun yaptığı haftalık check-in + makro ayarını otomatikleştiriyor | Ürün dokümanı |
| **RP Diet Coach** | Faz içinde periyodizasyon mantığıyla makro kayması (kütle fazında kademeli artış, yağ kaybı fazında azalış) — **kilo trendine değil, plana** tepki veriyor | Ürün dokümanı |
| **MyMacros+** | Antrenman split'ine göre güne özel makro hedefleri | Ürün dokümanı |

**Not:** Calorie cycling'in **çıktı üstünlüğüne dair** hakemli kanıt bu araştırmada **bulunamadı**.
Yani bu bir *tercih/uyum* özelliği, kanıtlanmış bir *etkinlik* özelliği değil. Öyle konumlandır.

---

## 3.3 Adaptif hedef motoru — MacroFactor'ün doğrulama verisi

Bu, "deterministik yargı katmanı" (Bölüm 4.4-A) için en iyi mevcut örnek. Ürünün kendi
yayınladığı analiz: https://macrofactor.com/algorithm-accuracy/
**Uyarı: bu şirketin kendi verisi, bağımsız değil.** Ama metodolojisi açık ve sayıları spesifik.

**Nasıl çalışıyor:** Enerji dengesi yasasından **geri hesaplama.** Kayıtlı alım + tartı kilosunun
düzleştirilmiş trendi → gerçek TDEE. Formül tahmini yerine gözlem.

**748 yeni kullanıcı (2025 challenge) üzerinde:**

| Ölçüm | MacroFactor | Formül tabanlı TDEE |
| --- | --- | --- |
| Aylık tahmin hatası (24. günden sonra, medyan) | **1,15 lb** | 3,1 lb |
| Kalori tahmin hatası (3-4 hafta sonra, medyan) | **135 kcal** (aralık 60-240) | 335 kcal (aralık 155-590) |
| 100 günlük kümülatif hata (medyan) | **0,031 lb/gün** | 0,085 lb/gün |
| Gözlenen kilo değişimiyle korelasyon | **r = 0,94** | r = 0,61 |
| Kullanıcıların yüzde kaçında daha iyi | **%94,1** | %5,9 |

Hata eşikleri (100 gün kümülatif): kullanıcıların **%84'ünde hata <%10 TDEE**, **%55'inde <%5**,
**%2'sinden azında >%20**.

**Adaptasyon hızı:** 3. günde güncellemeye başlıyor, **24-30. günde** (3-4 hafta) tepe performans.
100 günlük kümülatif hatanın ~%25'i başlangıç tahmin fazından geliyor.

**Şirketin kendi kabul ettiği kısıtlar:**
1. **Altın standart doğrulama yok** — metabolik oda / doubly-labeled water karşılaştırması
   yapılmadı. Ölçülen şey "öngörü geçerliliği", mutlak doğruluk değil.
2. Kısa vadeli kilo dalgalanması (su, glikojen, şişkinlik) **indirgenemez bir hata tabanı** yaratıyor.
3. **Algoritma doğru loglama varsayıyor** ve gerçek düşük kalorili gün ile eksik loglanmış günü
   **ayırt edemiyor.** Analizden "kısmi loglama" yapanlar (tipik günlük kalorinin <%50'sini
   loglayanlar) **çıkarıldı.**

> **Kritik bağlantı — Bölüm 1 ile:** Bu algoritma, alım verisinin doğru olduğunu varsayıyor.
> Ama Bölüm 1.5'e göre fotoğraf tabanlı loglama öğün başına **250-345 kcal eksik** sayıyor.
> Günde 3 öğün = **750-1000 kcal sistematik eksik girdi.** Adaptif algoritma bunu "bu kişinin
> TDEE'si düşük" diye yorumlar ve hedefi **yanlış yere** ayarlar. Fotoğraf-loglama + adaptif
> TDEE **birbirini bozan** iki sistem. Bu, kimsenin konuşmadığı bir tasarım çatışması ve
> ürün için ciddi bir tez.

---

## 3.4 Gün/hafta kaçtığında ne yapılıyor — ve literatür ne diyor?

**Ürün yaklaşımları:**
| Yaklaşım | Kim |
| --- | --- |
| **Haftalık ortalamaya yayma** (gün bazlı değil hafta bazlı hedef) | **MacroFactor** (haftalık kalori hedefi korunarak günlük yeniden dağıtım) |
| **Haftalık check-in + hedef yeniden ayarı** (telafi değil, yeniden kalibrasyon) | Carbon Diet Coach, MacroFactor |
| **Telafi yok, plana devam** | RP Diet Coach (periyodizasyon planına sadık) |
| **Sessizce hiçbir şey** | MyFitnessPal, Lose It!, YAZIO — sayaç sıfırlanır, ertesi gün yeni gün |

**Literatür: telafi doğru mu yanlış mı?**

Bu, kanıtın **net olduğu ve ürünlerin yanlış yaptığı** bir alan.

- **Restraint (kısıtlama) ↔ disinhibition (dizginsizleşme) döngüsü:** Diyet yapmanın
  **tepkisel/telafi edici aşırı yemeyi tetikleyerek** kilo alımına katkıda bulunabileceğine
  dair kanıt var — diyet-kilo alımı döngüsü.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC2696993/ (Kadınlarda 6 yıllık kilo değişimi:
  diyet, restraint ve disinhibition öngörücü)
- **Paradoks:** Yüksek cognitive dietary restraint kilo kaybı için öngörücü sayılsa da,
  **başlangıçta yüksek restraint takipte daha fazla kilo geri alımıyla** karakterize.
  Açıklama: artan kısıtlama "yasak yiyecek" takıntısı, artan iştah algısı ve **aşırı yeme
  epizodu riski** ile ilişkili. https://link.springer.com/article/10.1007/s13679-019-00365-x
- Restraint ve disinhibition birlikte kilo alımı ve BMI ile ilişkili.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2713727/

> **Tasarım kuralı (kanıta dayalı):**
> **"Bugün 600 fazla yedin, yarın 600 az ye" TEHLİKELİ.** Bu tam olarak restraint-disinhibition
> döngüsünü besleyen mekanik. Sert telafi → ertesi gün açlık → dizginsizleşme → suçluluk → bırakma.
>
> **Doğru olan:** Haftalık ortalamaya **sessizce yayma** (MacroFactor modeli). Kullanıcıya
> "telafi et" demek yerine, matematiği arka planda hafta ölçeğinde tutmak. Kullanıcı bir gün
> kaçırdığında ürünün tepkisi **ceza değil, ölçek değiştirme** olmalı: "gün önemli değil,
> hafta önemli — hafta hâlâ iyi."
>
> Bu aynı zamanda Bölüm 2.1'in bulgusuyla uyumlu: **"eksiksiz loglama" kilo kaybını öngörmüyor,
> TUTARLI loglama öngörüyor.** Yani ürün mükemmeliyetçiliği cezalandırmamalı — Levent'in kendi
> mükemmeliyetçilik problemi düşünülürse bu kişisel olarak da doğru tasarım.

---

## 3.5 Proaktif davranış — bildirim gerçekten işe yarıyor mu?

### En sağlam kanıt: mikro-randomize deneme
**Bidargaddi ve ark. (2018).** *To Prompt or Not to Prompt? A Microrandomized Trial of
Time-Varying Push Notifications to Increase Proximal Engagement With a Mobile Health App.*
**JMIR mHealth and uHealth.** https://pmc.ncbi.nlm.nih.gov/articles/PMC6293241/

1.255 kullanıcı, 89 gün. Günde 6 zaman noktasında (08:30-20:30) uygun kullanıcılar **50/50**
bildirim alıp almamak üzere randomize edildi.

| Bulgu | Sayı |
| --- | --- |
| Bildirim gönderilince 24 saat içinde etkileşim artışı | **+%3,9** (RR 1,039; %95 GA 1,01-1,08; P<0,05) |
| **En iyi zaman: 12:30** | +%8,8 |
| Hafta sonu etkisi | +%8,7 (hafta içi +%2,5) — fark **anlamlı değil** (P=0,18) |
| En iyi hafta sonu saatleri | 12:30 (+%11,8) ve 19:30 |
| Etki 12 hafta boyunca zayıfladı mı? | **HAYIR** (P=0,84) — alışma (habituation) gözlenmedi |

> **Bu tablonun dürüst okunuşu: bildirimlerin etkisi ÇOK KÜÇÜK.** %3,9. Bildirim bir ürünü
> kurtarmaz. İyi haber: etki **zayıflamıyor** — yani iyi zamanlanmış, seyrek bildirim uzun vadede
> ayakta kalıyor.

### Ne zaman ters tepiyor
- Reuters Institute verisi: kullanıcıların **%43'ü** bildirimleri **aşırı veya alakasız**
  buldukları için kapatıyor.
- Bildirimleri kapatma niyeti kalıcı: 2 yıl sonra niyetini belirtenlerin **%59,1'i** hâlâ
  kapalı tutuyor, **%77,3'ü** kısmen.
- Klinik alanda alert fatigue iyi belgelenmiş: sağlık çalışanları ilaç etkileşim uyarılarının
  **%49-96'sını** rutin olarak geçiyor.
- **Bağlamsal hedefleme her zaman kazandırmıyor:** bir keşifsel çalışma, konum ve hareket
  verisine göre bildirim göndermenin "varsayılan iyi saatlerde" göndermeye kıyasla daha yüksek
  yanıt oranı sağlamayabileceğini buldu.

### Ne işe yarıyor (kanıt seviyesine göre)
| Strateji | Kanıt |
| --- | --- |
| **Az ve öğle saatinde** gönder | Bidargaddi 2018 (+%8,8 @ 12:30) |
| **İlgili ol** — alakasızlık kapatmanın #1 sebebi | Reuters (%43) |
| Zaman/gün/telefon durumu ile ML zamanlama optimizasyonu | Yeni araştırma, **etki büyüklüğü doğrulanmadı** |
| Konum tabanlı bağlamsal tetikleme | **Karışık kanıt** — otomatik kazanç değil |
| JITAI (risk anında müdahale) — ör. diyet kaçağı riski yükseldiğinde | Aktif araştırma alanı; obezitede 159 kişilik MRT devam ediyor. **Kesin etki büyüklüğü BULUNAMADI** https://pmc.ncbi.nlm.nih.gov/articles/PMC8691411/ |

---

## 3.6 Yemek önerisi kişiselleştirmesi — kim gerçekten yapıyor?

| Boyut | Durum |
| --- | --- |
| Sevilmeyen yiyecek / alerji filtresi | Yaygın (Yazio, Lifesum, Samsung Food, Noom) |
| Hazırlama süresi filtresi | Yaygın tarif uygulamalarında (Samsung Food, Mealime) |
| **Bütçe** (kaça mal olur, ne kadar ucuz) | **Nadir.** Ciddi biçimde yapan olgun ürün **BULUNAMADI** |
| **Mutfak kültürü** (Türk/Orta Doğu mutfağında gerçek derinlik) | **Zayıf.** HealthifyMe Hint mutfağında iyi (yerel pazar avantajı). Türk mutfağında olgun ürün **BULUNAMADI** |
| **Dolapta ne var** (envanter tabanlı) | Samsung Food / Whisk kısmen; beslenme hedefiyle entegre değil |
| **O anki durumla** birleştirme (kalan makro + saat + antrenman + envanter) | **BULUNAMADI** |

Genel kişiselleştirme literatürü: kullanıcı profillerine göre mobil sağlık uygulaması
kişiselleştirmesi üzerine kapsam derlemesi —
https://journals.plos.org/digitalhealth/article?id=10.1371%2Fjournal.pdig.0000978

> **En büyük boşluk burada.** Bütçe + Türk mutfağı + kalan makro + hazırlama süresi dörtlüsünü
> birleştiren bir öneri motoru piyasada yok. Ve bu dördü tam olarak **öğrenci bütçesi + yurt odası**
> kısıtındaki birinin ihtiyaç duyduğu şey — yani Levent'in kendi kaynak kuralına uygun,
> gerçekten yaşadığı bir problem.


---
---

# EK A — Görüntü başına maliyet (Bölüm 1, soru 4'ün maliyet ayağı)

**Anthropic resmi fiyatlandırması (doğrulanmış, 2026-06 itibarıyla):**

| Model | Input $/1M token | Output $/1M token |
| --- | --- | --- |
| Claude Opus 5 | $5,00 | $25,00 |
| Claude Sonnet 5 | $2,00 | $10,00 |
| Claude Haiku 4.5 | $1,00 | $5,00 |

**Görüntü token hesabı:** Anthropic'te bir görselin token maliyeti yaklaşık `(genişlik × yükseklik) / 750`.
Tipik bir yemek fotoğrafı 1092×1092 ölçeklenirse ≈ **1.590 token**.

**Buradan hesaplanan (HESAP, ölçüm değil) görüntü başına input maliyeti:**

| Model | ~1.590 input token | + ~300 output token | **Toplam / fotoğraf** |
| --- | --- | --- | --- |
| Claude Opus 5 | $0,0080 | $0,0075 | **≈ $0,016** |
| Claude Sonnet 5 | $0,0032 | $0,0030 | **≈ $0,006** |
| Claude Haiku 4.5 | $0,0016 | $0,0015 | **≈ $0,003** |

**Ölçek anlamı:** Günde 3 öğün loglayan bir kullanıcı = ayda ~90 fotoğraf.
- Haiku 4.5 ile: **~$0,28/kullanıcı/ay**
- Sonnet 5 ile: **~$0,54/kullanıcı/ay**
- Opus 5 ile: **~$1,44/kullanıcı/ay**

> Yani $5-10/ay abonelikte **görüntü maliyeti sorun değil** — özellikle küçük modelde. Bu, Cal AI
> gibi ürünlerin neden 3. taraf API üzerine kurulup kârlı olabildiğini açıklıyor.
> **OpenAI / Google fiyatları bu araştırmada DOĞRULANMADI** — kullanmadan önce kontrol et.

---
---

# SENTEZ — Kararlar için özet

## Fotoğraf-kalori işinin gerçek durumu (tek paragraf)
Yemeği **tanımak** çözüldü (%90-97). **Gram tahmini** çözülmedi ve tüm hata oradan geliyor.
Bağımsız ölçümler ürünler arasında **−%47 ile +%44** arası sapma gösteriyor; NIH'in kontrollü
mutfak testi öğün başına **250-345 kcal eksik**, yağda **~30 g eksik** buldu. Yön **sistematik
olarak EKSİK SAYMA** ve en kötü olduğu yer tam olarak **yağlı, karışık, tencere yemekleri ve
Batı dışı mutfaklar.** Akademik en iyi sonuç (%16,5 MAPE) sadece kendi veri setinde geçerli —
gerçek telefon fotoğraflarında genel amaçlı VLM'ler özel modelleri geçiyor. Piyasadaki hiçbir
ürün bu belirsizliği kullanıcıya göstermiyor.

## Sürtünmede en büyük 5 fırsat
1. **Gramı 2 saniyede sorma.** Hatayı %56,6 → %20,2 düşürüyor (tek en yüksek etkili müdahale)
   ve hiçbir ürün fotoğraf akışına düzgün gömmemiş.
2. **Tekrar hafızası + bağlam.** Saat + konum + geçmiş = ortalama −76 kcal hata, ve loglamayı
   tek dokunuşa indirir. Kimse yapmıyor. LLM bile gerekmiyor.
3. **Fotoğraf + ses birleşimi.** Fotoğraf "ne", ses "ne kadar ve nasıl pişti". İkisi rakip değil.
4. **Türk mutfağı derinliği.** Tanıma zaten %93 mümkün; kalori tarafı boş; rakipler ölçülmüş
   şekilde kötü.
5. **Haftalık ölçek, günlük değil.** "Eksiksiz loglama" kilo kaybını öngörmüyor, **tutarlı**
   loglama öngörüyor. Mükemmeliyetçiliği cezalandırmayan tasarım = daha az bırakma.

## "Hizmet hissi" için kanıtlanmış 5 kalıp
1. **Geçmişe referans veren gözlem** — diyetisyenlerin fiilen yaptığı iş (kalori saymak değil,
   örüntü görmek).
2. **Bağlam sorusu sormak** — hem doğruluğu artırıyor hem "beni tanıyor" hissi veriyor.
3. **Öngörülebilir check-in ritmi** — insan koçluğun %80-100 tamamlama avantajının mekanizması.
4. **Kişilik sürekliliği** — bozmanın bedeli ölçülmüş (Replika identity discontinuity).
5. **Öğle saatinde, seyrek, alakalı bildirim** — +%8,8 etki ve 12 haftada zayıflamıyor.

## 3 tuzak
1. **Sahte kesinlik.** "642 kcal" demek, gerçek belirsizlik ±%30-50 iken, ilk yanlış çıktığında
   tüm güveni yakar.
2. **"AI arkadaşın" konumlandırması.** Duygusal bağımlılık = FTC şikâyeti + ölçülmüş yalnızlık
   korelasyonu. Koç araçsaldır, arkadaş değildir.
3. **Telafi mekaniği.** "Yarın 600 az ye" restraint-disinhibition döngüsünü besliyor —
   literatürde kilo geri alımıyla ilişkili. Sessizce haftalık ortalamaya yay.

## Sycophancy'ye karşı mimari (öncelik sırasıyla)
1. **Yargıyı LLM'den al, koda ver.** Hedef tutuyor mu sorusu bir fonksiyon olmalı. LLM sadece
   sonucu ifade eder — değiştiremez. Tek yapısal bağışıklık bu.
2. **Ödül sinyalini değiştir.** 👍 yerine 4 haftalık tutundurma. Memnuniyeti optimize eden her
   koç yaltaklanır (LLM'ler insanlardan %50 puan daha fazla doğruluyor — ELEPHANT).
3. **"Koç hayır demeli" eval seti + CI.** OpenAI'ın GPT-4o hatasının doğrudan dersi: eval
   yeterince derin değildi, metrikler iyi görünüyordu.
4. **Rol ayrımı.** Destek modu ve değerlendirme modu ayrı prompt, ayrı guardrail.
5. Judge/critic modeli ve model-based steering: ELEPHANT'a göre prompt hileleri yetersiz;
   steering tek umut vaat eden yöntem ama pahalı. Sonraki aşama.

---

## Doğrulanamayan / bulunamayan şeyler (dürüstlük listesi)
- Passio SDK, Calorie Mama, Samsung Food, Simple için **bağımsız doğruluk ölçümü yok.**
- SnapCalorie'nin **saha** doğruluğu için bağımsız ölçüm yok (sadece laboratuvar).
- Öğün loglama süresinin **karşılaştırmalı hakemli ölçümü yok** — dolaşan 45-90 sn / <30 sn
  rakamlarının birincil kaynağı doğrulanamadı.
- Beslenme uygulamalarında **belirsizlik gösteriminin güvene etkisi** doğrudan test edilmemiş
  (kanıt oyun ve eczacılık alanlarından transfer).
- Calorie cycling'in **çıktı üstünlüğü** için hakemli kanıt bulunamadı.
- Kullanıcı düzeltmesinden **model öğrenen** ürün kanıtı bulunamadı.
- Türk mutfağı için **kalori doğruluğu** ölçümü yok (sadece tanıma doğruluğu var).
- HealthifyMe/Noom hibrit modelinin **birim ekonomisi** kamuya açık değil.
- OpenAI/Google görüntü fiyatlandırması bu araştırmada doğrulanmadı.

*Son güncelleme: 2026-09-09 · Durum: TAMAMLANDI*
