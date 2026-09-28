# H1 — Vücut Kompozisyonu Ölçümü: Kanıt Taraması

> Araştırma tarihi: **2026-09-09**
> Kapsam: bel çevresi protokolü · fotoğraftan kompozisyon · alternatif pratik yöntemler
> Kural: her sayı kaynaklı ve tarihli. Bulunamayan bilgi "**bulunamadı**" olarak işaretli.
> Bağlam: uygulama salon BIA'sını reddediyor; hedef **mutlak yağ oranı değil, değişim tespiti**.

---

# BÖLÜM 1 — BEL ÇEVRESİ

## 1.1 Standart ölçüm protokolü — kurumlar aynı şeyi söylemiyor

Bu, uygulamanın ilk tasarım kararı: **hangi noktadan ölçtüreceğiz.** Literatürde tek bir
"doğru" nokta yok; kurumlar farklı yerleri işaret ediyor ve aradaki fark ölçüm hatasından büyük.

| Kurum / protokol | Ölçüm noktası | Not |
| --- | --- | --- |
| **WHO** (Expert Consultation, 2008/2011) | En alt palpe edilebilen kaburga ile **iliak krista** üstü arasının **orta noktası** | Gerilmeyen mezura, sabit ~100 g gerginlik |
| **NIH / NHLBI → NHANES (güncel)** | **İliak kristanın en üst kenarının hemen üstü** | ABD ulusal survey standardı; ATP III eşikleri bu yöntemle türetildi |
| **NHANES III (eski)** | İliak krista tepesi | Güncel NHANES NHLBI yöntemine geçti |
| **IDF** | WHO yöntemini benimser (orta nokta) | Etnik-spesifik eşiklerle birlikte |
| Diğer kullanılan noktalar | En dar bel (minimal waist) · en alt kaburganın hemen altı · göbek deliği · göbek deliğinin 2 cm üstü | Standart değil, çalışmalarda karşımıza çıkıyor |

### Noktalar arası fark ne kadar?

- **WHO orta nokta vs NHLBI iliak krista üstü** (NHANES 2011–2016, n=2.405 yetişkin ≥20 yaş):
  NHLBI ölçümü **erkekte ortalama 0,8 cm**, **kadında 3,2 cm daha yüksek**; fark her iki cinste
  istatistiksel anlamlı. Çalışma iki yöntem arasında dönüştürme denklemleri de veriyor.
  → [PMC9422776](https://pmc.ncbi.nlm.nih.gov/articles/PMC9422776/)
- **Altı farklı nokta karşılaştırması:** noktalar arası fark erkekte
  **0,2 ± 2,7 cm ile 6,9 ± 6,7 cm** arasında, kadında **0,1 ± 3,7 cm ile 10,1 ± 4,3 cm** arasında
  değişiyor. Literatürde hangi noktanın üstün olduğuna dair **tutarlı kanıt yok**, bu yüzden
  konsensüs de yok. → [PMC10118742](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10118742/)

> **Ürün için çıkarım:** Nokta seçimi mutlak eşiğe göre önemli, **değişim takibinde önemsiz** —
> yeter ki kullanıcı **her seferinde aynı noktadan** ölçsün. Uygulama mutlak eşik de söyleyecekse
> hangi protokolü kullandığını beyan etmeli. Erkekte WHO↔NHLBI farkı 0,8 cm olduğu için erkek
> hedef kitlede bu fark pratikte küçük; kadında 3,2 cm ile eşik kararını değiştirecek boyutta.

### Ölçüm anı kuralları (WHO STEPS ve NHANES kılavuzlarından)

| Değişken | Kural | Kaynak |
| --- | --- | --- |
| Mezura tipi | Gerilmeyen (stretch-resistant), sabit ~100 g gerginlik | WHO Expert Consultation |
| Nefes | **Normal ekspirasyon sonunda** okunur; nefes tutulmaz, karın içeri çekilmez | WHO STEPS |
| Duruş | Ayakta, ayaklar bitişik/omuz genişliğinde, kollar yanda serbest, ağırlık iki ayağa eşit | WHO STEPS |
| Mezura konumu | Cilde temas, bastırmadan; yere paralel | WHO STEPS |
| Kıyafet | İnce kıyafet üstünden veya çıplak ten | WHO STEPS |
| Tekrar | En az **2 ölçüm**, aralarında fark >1 cm ise 3. ölçüm | WHO STEPS |
| Gün saati / tokluk | WHO STEPS metninde **açık kural bulunamadı**; pratik standart sabah, aç karnına, tuvalet sonrası (aşağıya bak) | — |

→ WHO STEPS Bölüm 5 fiziksel ölçümler: [cdn.who.int/media/docs/default-source/ncds/ncd-surveillance/steps/part3-section5.pdf](https://cdn.who.int/media/docs/default-source/ncds/ncd-surveillance/steps/part3-section5.pdf)
→ WHO Expert Consultation raporu: [iris.who.int](https://iris.who.int/server/api/core/bitstreams/ca408ade-05c9-4b7c-8967-6ee5b5e0ccd8/content)

---

## 1.2 Ölçüm hatası — kendi kendine ölçüm ne kadar güvenilir?

Bu bizim için kritik: kullanıcı kendi ölçecek, yanında teknisyen olmayacak.

| Metrik | Değer | Bağlam | Kaynak |
| --- | --- | --- | --- |
| ICC (kendi ölçüm ev vs teknisyen), bel | **0,97** | n=41 kadın, ~9 dk video eğitimi sonrası | [PMC4855335](https://pmc.ncbi.nlm.nih.gov/articles/PMC4855335/) (BMC Med Res Methodol, 2016) |
| ICC (ev vs laboratuvar, test-retest), bel | **0,96** | aynı çalışma | aynı |
| TEM (technical error of measurement) | **0,08–0,76 inç** (≈0,2–1,9 cm) tüm ölçümler için | tekrarlı ölçümler, güvenilirlik ≥0,90 | aynı |
| Bland-Altman: LoA içinde kalan | **%93** (bel) | ±%10 klinik anlamlılık kriteri | aynı |
| Kendi ölçüm sapması — **yazılı** talimat | **+1,75 cm** aşırı tahmin (p=0,007) | n=57, eğitimsiz yetişkin, Aberdeen + Brüksel, 2010 | [Cambridge Core / Public Health Nutrition](https://www.cambridge.org/core/journals/public-health-nutrition/article/video-instructions-improve-accuracy-of-selfmeasures-of-waist-circumference-compared-with-written-instructions/6A4B9C7FF83A87A8ADF2458378690B60) |
| Kendi ölçüm sapması — **video** talimat | **+0,95 cm** (p=0,239, anlamsız) | aynı çalışma | aynı |

### Hata kaynakları
1. **Yanlış anatomik nokta** — en büyük tek kaynak. Noktalar arası fark 0,2–6,9 cm (erkek),
   ölçüm tekrarlanabilirlik hatasından (≈0,5–1 cm) kat kat büyük.
2. **Mezura gerginliği** — bastırma/gevşetme. Sabit-gerginlikli mezura bu hatayı kapatıyor.
3. **Nefes fazı** — inspirasyon/ekspirasyon farkı.
4. **Mezuranın yere paralel olmaması** — özellikle arkadan sarkma; tek başına ölçende sık.
5. **Karın içeri çekme** — motivasyonlu kullanıcıda sistematik ve yönlü hata (ilerleme yanılsaması).
6. **Gün içi/tokluk dalgalanması** — literatürde net rakam **bulunamadı**; pratik olarak sabah
   aç karnına ölçüm önerisi standart ama bunu niceleyen çalışma bu taramada çıkmadı.

### Eğitim işe yarıyor mu? → **Evet, ölçülmüş.**
Video talimat, yazılı talimata karşı sapmayı **1,75 cm → 0,95 cm**'e düşürüyor ve sapmayı
istatistiksel anlamlılıktan çıkarıyor (n=57, 2010). Ayrı bir çalışmada kısa (<9 dk) video eğitimi
sonrası kendi ölçüm ile teknisyen arasında **ICC 0,97** elde edilmiş (n=41, 2016).

> **Ürün için çıkarım:** Bel ölçümü ekranında **metin talimat yeterli değil** — kısa video
> (veya animasyon) zorunlu. Kanıtlı kazanç ~0,8 cm sapma azalması. Bu, ölçmeye çalıştığımız
> aylık değişimin (~1–3 cm) kayda değer bir kısmı.

---

## 1.3 Eşik değerler (erkek odaklı) — BEL ÇEVRESİ KARAR TABLOSU

| Eşik | Kaynak / tanım | Anlamı | Kaynak URL |
| --- | --- | --- | --- |
| **≥94 cm** | IDF, Europid erkek | Abdominal obezite — IDF metabolik sendrom tanısında **zorunlu** bileşen | [IDF konsensüs](https://sites.pitt.edu/~super1/Metabolic/IDF1.pdf) |
| **≥90 cm** | IDF, Güney Asyalı / Çinli / Japon erkek | Aynı risk, daha düşük eşikte | aynı |
| **≥102 cm** | NCEP ATP III / AHA-NHLBI erkek | Metabolik sendrom bileşeni (5 kriterden 1'i, zorunlu değil) | [Harmonizing the Metabolic Syndrome, Circulation 2009](https://www.ahajournals.org/doi/10.1161/circulationaha.109.192644) |
| **≥88 cm** kadın (ATP III) / **≥80 cm** kadın (IDF) | — | Karşılaştırma için | aynı |
| **WHtR ≥0,5** | NICE NG246 (2025) / CG189 güncellemesi | Artmış merkezi adipozite ve sağlık riski. **"Belin boyunun yarısından az olsun."** | [NICE NG246](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity) |
| WHtR **<0,4** | Ashwell/Browning literatürü | Düşük — bazı kaynaklarda "yetersiz kilo" sınırı | [Browning 2010, Nutr Res Rev](https://pubmed.ncbi.nlm.nih.gov/26975935/) |
| WHtR **0,4–0,49** | — | Sağlıklı aralık | aynı |
| WHtR **0,5–0,59** | — | Artmış risk | aynı |
| WHtR **≥0,6** | — | Yüksek risk | aynı |

### Etnik farkın kanıtı
IDF, Europid erkekte 94 cm, Güney/Güneydoğu Asyalı ve Çinli erkekte 90 cm, Japon erkekte
(revizyonla) 90 cm kullanıyor. Gerekçe: aynı bel çevresinde Asyalı popülasyonlarda kardiyometabolik
risk daha yüksek. AHA/NHLBI ise ABD popülasyonu için 102 cm'i koruyor.
2009 **"Harmonizing the Metabolic Syndrome"** ortak açıklaması bu farkı resmen kabul etti:
tek bir global eşik yerine popülasyon/ülke-spesifik eşik kullanılmasını önerdi.
→ [Circulation 2009](https://www.ahajournals.org/doi/10.1161/circulationaha.109.192644)

**Türkiye için:** IDF, Doğu Akdeniz ve Orta Doğu popülasyonlarına **Europid verilerinin
kullanılmasını** öneriyor → erkekte **94 cm**. Türkiye'ye özel valide edilmiş resmî IDF eşiği
**bulunamadı** (bu taramada).

### WHtR 0,5 kuralı — kanıt ne kadar güçlü?
- **Ashwell, Gunn & Gibson 2012** (Obesity Reviews) sistematik derleme + meta-analiz: WHtR,
  yetişkinde kardiyometabolik risk faktörlerini taramada **hem bel çevresinden hem BMI'dan iyi**.
- **Browning, Hsieh & Ashwell 2010** (Nutrition Research Reviews): 0,5'in **evrensel sınır değer**
  olarak uygun olduğu sonucu. → [PubMed 26975935 ilgili çalışma](https://pubmed.ncbi.nlm.nih.gov/26975935/)
- **NICE**, 2022 taslak → NG246 ile bunu **resmî kılavuza aldı**: BMI <35 kg/m² olan yetişkinlerde
  WHtR ölçülmeli ve BMI ile birlikte kullanılmalı; **kişinin kendi ölçmesi teşvik ediliyor**.
  → [NICE haber](https://www.nice.org.uk/news/articles/keep-the-size-of-your-waist-to-less-than-half-of-your-height-nice--recommends)
- Karşı kanıt: 2025 tarihli bir çalışma NICE'in 0,5 kuralının **çocukta uygun, ergende yanıltıcı**
  olduğunu ileri sürüyor. → [ScienceDirect 2025](https://www.sciencedirect.com/science/article/abs/pii/S0939475325002716)

> **Ürün için çıkarım:** WHtR, **boy zaten bilindiği için ek iş getirmiyor** (bel ölçümünden
> bedava türetiliyor), etnisiteden büyük ölçüde bağımsız, ve bir ulusal kılavuz tarafından
> kullanıcının kendi ölçmesi için önerilmiş durumda. Uygulamanın **birincil mutlak eşiği WHtR 0,5
> olmalı**, ham cm ikincil.

---

## 1.4 Bel çevresi ↔ viseral yağ / insülin direnci

| Ölçüt | HOMA-IR ile korelasyon (r) | Kaynak |
| --- | --- | --- |
| **Viseral yağ (VAT, görüntüleme)** | **0,570** | 40 çalışmalık meta-analiz → [PMC4685195](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4685195/) |
| **BMI** | 0,482 | aynı |
| **Bel çevresi** | 0,466 | aynı |

Yani hiyerarşi: **VAT > BMI ≈ bel çevresi**. Bel çevresi tek başına BMI'ı ezmiyor — bu, sık
tekrarlanan "bel BMI'dan iyidir" iddiasının nüansı.

**Nerede bel gerçekten kazanıyor:**
- **WHtR** (bel/boy) formuna girdiğinde BMI'ı geçiyor (yukarıdaki Ashwell meta-analizi).
- Ayrı bir çalışmada MRI-VAT'ın insülin/HOMA-IR ile korelasyonu ρ=0,341 iken bel çevresininki
  ρ=0,421 çıkmış — yani sonuç kohorta göre değişiyor, bel her zaman geride değil.
  → [PMC4388843, ADDITION-PRO](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4388843/)
- CT-VAT, BMI **ve** bel çevresi için düzeltme yapıldıktan **sonra bile** açlık glukozu, insülin
  direnci, trigliserid ve HDL ile ilişkili kalıyor → bel, VAT'ın tam bir vekili değil.
  → [PMC5560438](https://pmc.ncbi.nlm.nih.gov/articles/PMC5560438/)

> **Dürüst çıkarım:** Bel çevresi VAT'ın **kaba** bir vekili. Ürün "bel = viseral yağ" demeye
> kalkmamalı. Ama bel **değişimi** VAT değişimiyle ilişkili (bkz. 1.6) ve bu bizim işimize yeten
> iddia.

---

## 1.5 Değişim hızı — kilo düşerken bel kaç cm düşer?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Regresyon: kilo kaybı ↔ bel azalması | **%Kilo kaybı = 0,85 × bel azalması (cm) − 2,09**, r=0,79 | [Int J Obes 1997, kadın](https://www.nature.com/articles/0800377) |
| 3 kg kilo kaybı karşılığı bel | erkek **3,45 cm** (≈**1,15 cm/kg**), kadın 2,83 cm (≈0,94 cm/kg) | ikincil aktarım — **birincil kaynak doğrulanamadı** |
| Egger et al. | 0,75 kg ≈ 1 cm bel (≈1,33 cm/kg) | ikincil aktarım — **birincil kaynak doğrulanamadı** |
| Kaba pratik kural | 1 kg ≈ **0,9 cm** bel | ikincil aktarım |

**Kullanılabilir aralık: 1 kg kilo kaybı ≈ 0,9–1,3 cm bel azalması (erkek).** Tek bir kesin
sayı yok; kaynaklar bu bantta buluşuyor ama en net doğrulanabilen tek denklem 1997 kadın kohortu.

### Haftalık/aylık hız
| Bağlam | Hız | Kaynak |
| --- | --- | --- |
| Aerobik egzersiz (kontrole karşı), meta-analiz | **−3,2 cm** (%95 GA −3,86, −2,51), 25 RKÇ, n=1.686 | [Armstrong 2022, Obesity Reviews](https://onlinelibrary.wiley.com/doi/abs/10.1111/obr.13446) |
| — yüksek şiddet | −4,2 cm | aynı |
| — orta şiddet | −2,5 cm | aynı |
| 13 haftalık diyet müdahalesi | 3,73–4,42 cm (≈**0,3 cm/hafta**) | ikincil aktarım |
| 12 haftalık RKÇ aralığı | 2,9–5,2 cm | ikincil aktarım |

> **Ürün için kritik çıkarım — sinyal/gürültü:** Beklenen hız ≈ **0,25–0,4 cm/hafta**.
> Kendi kendine ölçüm hatası (video eğitimli) ≈ **±1 cm**.
> → **Haftalık bel ölçümü gürültüden ibaret.** Tek bir haftalık ölçümdeki değişimin sinyal olma
> ihtimali düşük. **Ölçüm sıklığı 2–4 haftada bir olmalı**, veya haftalık ölçülüp
> **hareketli ortalama** ile gösterilmeli. Bu, ürün kararı olarak doğrudan uygulanabilir.

---

## 1.6 Kilo düşmeden bel düşer mi?

**Evet — ve bu iyi belgelenmiş.**

- **Ross et al. 2000** (Annals of Internal Medicine 133(2):92-103), n=52 obez erkek
  (BMI 31,3±2,0; bel 110,1±5,8 cm), 4 kol: diyetle kilo kaybı · egzersizle kilo kaybı ·
  **kilo kaybı olmadan egzersiz** · kontrol. Sonuç: *"exercise without weight loss should be
  recognized as a useful means of reducing abdominal fat."* Kilo sabitken abdominal yağ düşüyor.
  → [Annals of Internal Medicine](https://annals.org/aim/article-abstract/713672/reduction-obesity-related-comorbid-conditions-after-diet-induced-weight-loss)
- **"Exercise without weight loss is an effective strategy for obesity reduction"**
  (obez bireyler, T2D olan ve olmayan) → [PubMed 15860689](https://pubmed.ncbi.nlm.nih.gov/15860689/)
- **STRRIDE** (J Appl Physiol 2005): hareketsizlik viseral yağı artırıyor, egzersiz miktarı ve
  şiddeti viseral yağ değişimini doz-yanıtlı etkiliyor.
  → [J Appl Physiol](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00124.2005)
- Armstrong 2022 meta-analizi: **bel çevresi değişimi, viseral yağ dokusu değişimiyle ilişkili.**

> **Ürün için çıkarım — bu, en değerli tek bulgu:** "Kilo sabit ama bel düştü" **gerçek bir
> kompozisyon değişimi sinyali** ve kanıtı var. Uygulamanın kullanıcıya söyleyebileceği en güçlü
> cümlelerden biri bu. Terazi durduğunda kullanıcı bırakır; bel düşüşü bırakmayı engelleyen
> kanıtlı ikinci sinyaldir.
>
> **Uyarı:** Bunun tersi de doğru — bel ölçümü **yağ kaybını da abartabilir** (gaz, tokluk,
> duruş). Tek ölçüme dayanma.

---

## 1.7 Sıralama — kilo verirken hangi belirteç önce düzelir?

Kanıt, sezginin tersini söylüyor: **kan/metabolik belirteçler, görünür değişimden önce düzeliyor.**

| Sıra | Belirteç | Zaman | Kaynak |
| --- | --- | --- | --- |
| 1 | **Hepatik insülin duyarlılığı**, intrahepatik trigliserid | **48 saat – 7 gün** kalori kısıtlaması; kilo kaybından bağımsız | [Diabetes Care 2010](https://diabetesjournals.org/care/article/33/7/1438/39357/The-Importance-of-Caloric-Restriction-in-the-Early) |
| 2 | HOMA-IR | **~1 hafta** içinde %25 iyileşme (bariatrik cerrahi sonrası, *kilo kaybı öncesi*); 4 günlük sıvı diyetle aynı etki taklit edilebilmiş | aynı + [Diabetes Care 2022](https://diabetesjournals.org/care/article/45/8/1914/147114/Caloric-Restriction-and-Weight-Loss-Are-Primary) |
| 3 | Kilo (trend) | günler–haftalar, ama gürültülü | bkz. 3.4 |
| 4 | **Bel çevresi** | ölçüm hatasını aşması **~3–4 hafta** (0,3 cm/hafta hıza karşı ±1 cm hata) | türetilmiş, bkz. 1.5 |
| 5 | **Fotoğrafta görünür değişim** | haftalar–aylar (bkz. Bölüm 2.5) | bkz. 2.5 |

Kaynaklar hepatik glukoz üretiminde düşüş ve insülin duyarlılığında artışın **çok düşük kalorili
diyetten 7 gün sonra** raporlandığını, 7–10 gün kalori kısıtlaması sonrası hepatik, iskelet kası
ve yağ dokusu insülin duyarlılığında benzer iyileşmeler görüldüğünü belirtiyor.

> **Ürün için çıkarım:** Kullanıcının ilk 2–3 haftada **hiçbir ölçülebilir dış değişim görmemesi
> normaldir ve bunu önceden söylemek zorundayız.** İçeride iyileşen şeyler var ama bizim
> ölçebildiğimiz hiçbir şey henüz kıpırdamadı. Bu, terk (churn) penceresiyle birebir çakışıyor.
> Bu boşluğu **davranış metrikleriyle** (uyum, antrenman performansı, adım) doldurmak zorundayız —
> vücut metrikleriyle değil.

---
---

# BÖLÜM 2 — FOTOĞRAFTAN VÜCUT KOMPOZİSYONU VE İLERLEME

## 2.0 Önce terminoloji — üç farklı şey karıştırılıyor

Literatür ve pazarlama bunları aynı kefeye koyuyor; koymamak gerek:

| Sınıf | Ne yapıyor | Girdi | Örnek |
| --- | --- | --- | --- |
| **A · 3D optik booth tarayıcı** | Gerçek 3D mesh, sabit donanım | Dönen platform, yüzlerce görüntü | Fit3D ProScanner, Naked Labs, Styku |
| **B · Telefonla 3D rekonstrüksiyon** | Telefon kamerasından 3D avatar kuruyor | 4 fotoğraf veya 360° video (~150 kare) | Prism/MeThreeSixty, Cambridge 3D BodyShape, Bodymapp, ZOZOFIT |
| **C · Saf 2D foto regresyonu** | Görüntüden doğrudan sayı tahmini | 1–4 fotoğraf | PhotoScan (Google), Spren, LeanScreen, tüketici "AI body fat" uygulamaları |

Doğruluk kabaca **A > B > C** sırasında ve **fiyat/sürtünme de aynı sırada.** Bizim
kullanabileceğimiz sınıf **C**, belki **B**.

---

## 2.1 DOĞRULUK TABLOSU — ürün/yöntem × DXA'ya karşı hata × tekrarlanabilirlik

| Ürün / yöntem | Sınıf | Yöntem | DXA'ya karşı hata (BF%) | Tekrarlanabilirlik | n | Bağımsız mı? | Kaynak |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Prism Labs / MeThreeSixty** | B | ~150 görüntü, 360° dönüş, non-rigid avatar; COCO2 algoritması (boyutsuz oran tabanlı) | **MAE %3,24**, r=0,950, bias −%2,26 (Adaptive Model). COCO2 standart: MAE %3,96, r=0,898 | **Kişi içi SD = %0,58** (BF%); çevre ölçümlerinde SD 0,27–0,81 cm (n=437) | 2.905 tarama / 273 kişi (DXA alt kümesi); toplam 3.721 tarama / 550 kişi | **Hayır — firma beyaz kitabı** | [prismlabs.tech](https://www.prismlabs.tech/white-papers/body-composition-dxa-alternative-2026) (2026) |
| **PhotoScan (Google Research)** | C | **Ön + yan çift fotoğraf**, 2 kamera yüksekliği, 2 poz; UK Biobank MRI/DXA ile ön-eğitim | **MAE %2,15** (PhotoBIA), **MAE %2,13** (MetabolicMosaic), r=0,94 | **Raporlanmadı** (aynı-gün test-retest yok) | ön-eğitim 35.323 (UK Biobank); ince ayar 677; doğrulama 132 kişi / 195 oturum | Hakemli değil (**arXiv ön baskı**, Nisan 2026) | [arXiv:2603.27017](https://arxiv.org/html/2603.27017v2) |
| — aynı çalışma: BIA tek başına | — | — | MAE %2,91 | — | — | — | aynı |
| — aynı çalışma: sadece demografi (BMI+yaş+cinsiyet) | — | — | MAE %3,44 | — | — | — | aynı |
| — aynı çalışma: PhotoScan + BIA | — | — | **MAE %1,98** | — | — | — | aynı |
| **AI 2D-foto yöntemi** | C | 2D fotoğraf → AI | **CCC ≥0,96** (erkek 0,98 / kadın 0,96) — incelenen tüm yöntemler içinde en iyi uyum | Raporlanmadı | **1.273 yetişkin** | Hakemli (npj Digital Medicine, 2024/25) | [s41746-024-01380-6](https://www.nature.com/articles/s41746-024-01380-6) / [PubMed 39827323](https://pubmed.ncbi.nlm.nih.gov/39827323/) |
| — aynı çalışma: InBody-270 / Omron HBF-514 BIA | — | — | CCC 0,90–0,95 (orta uyum) | — | — | — | aynı |
| **Cambridge 3D BodyShape** | B | **4 telefon fotoğrafı** → 3D mesh → derin öğrenme; 12.000+ yetişkinin görüntüleme verisiyle eğitildi | Tüm metriklerde **r > 0,84** (telefon) / r > 0,86 (Fenland takip) | Raporlanmadı | eğitim 12.000+ | Hakemli (npj Digital Medicine, 2024) | [s41746-024-01289-0](https://www.nature.com/articles/s41746-024-01289-0) |
| **Fit3D ProScanner (3DO booth)** | A | Dönen platform, ~300.000 vertex mesh | bkz. değişim tablosu 2.2 | **Kesinlik hatası:** FM 0,25–0,44 kg; **LSC 1,22–1,52 kg** (DXA LSC 0,64–0,94 kg) | 133 | Hakemli (AJCN 2023) | [PMC10315406](https://pmc.ncbi.nlm.nih.gov/articles/PMC10315406/) |
| **Spren Vision** | C | Ön + arka fotoğraf | r=0,95, **MAE %2,6** (medyan %1,9) — DXA cihazları arası fark %2,35–2,68 | Raporlanmadı | 84 (3 DXA cihazı); toplam 240+ | **Hayır — firma blogu**, Pennington Biomedical iş birliği beyanı var, hakemli yayın **bulunamadı** | [spren.com](https://www.spren.com/blog/the-latest-spren-vision-validation-research) |
| **LeanScreen** | C | Fotoğraftan çevre + BF% | **BOD POD'a karşı:** <%10 BF'de **+%4 aşırı tahmin**, >%30 BF'de **−%5,7 düşük tahmin**. ±%3 iddiası olmasına rağmen deneklerin **sadece %44'ü** ±%3 içinde | Raporlanmadı | 80 (40E/40K) | **Evet — bağımsız üniversite (UW–La Crosse), ACE sponsorlu** | [ACE Fitness, 2018](https://www.acefitness.org/continuing-education/certified/october-2018/7086/ace-sponsored-research-can-the-leanscreen-app-accurately-assess-percent-body-fat-and-waist-to-hip-ratio/) |
| — LeanScreen bel/kalça oranı | — | — | **%91 kabul edilebilir GA içinde** — BF%'den çok daha iyi | — | — | — | aynı |
| **Amazon Halo Body** | C | Az kıyafetle tam boy fotoğraf, buluta yükleme | Doğruluk verisi bu taramada **bulunamadı** | — | — | — | **KAPANDI** 31 Tem 2023 |
| **Genel amaçlı VLM (GPT-4o)** | C | Serbest fotoğraf | Erkek: medyan işaretli hata **+%0,8**, medyan mutlak hata **%2,4**. Kadın: +%3,5 / %5,7 | Raporlanmadı | Küçük, gayri resmî | **Hayır — bağımsız birey testi (X/Twitter), hakemli değil** | [Anna Riedl, X](https://x.com/AnnaLeptikon/status/1923114810025332811) |
| **Kaliper (skinfold)** — karşılaştırma | — | — | bkz. 3.1 | — | — | — | — |
| **Ev tipi BIA tartısı** — karşılaştırma | — | — | DEXA'ya karşı **5–8 puan** hata (satıcı blogu iddiası) | — | — | Hayır | [GainFrame blog](https://gainframe.app/blog/best-body-composition-apps/) |

### Bu tablodan çıkan üç dürüst gözlem
1. **MAE %2–3 bandı gerçek görünüyor** ve birden fazla bağımsız kaynak bu bandı destekliyor
   (Google PhotoScan %2,13–2,15 hakemsiz ama büyük; npj 2024 CCC ≥0,96 hakemli ve n=1.273).
   Ama bu **grup düzeyi** doğruluk.
2. **Bağımsız doğrulama ile firma beyanı arasında fark var.** Tek gerçekten bağımsız test
   (LeanScreen, UW–La Crosse) ürünün kendi ±%3 iddiasını **doğrulamadı** (%44 tutturma).
   Firma beyaz kitapları (Prism, Spren) her zaman daha iyi rakam veriyor.
3. **Tekrarlanabilirlik neredeyse hiç raporlanmıyor.** Bizim en çok ihtiyaç duyduğumuz sayı,
   literatürün en az verdiği sayı. Sadece Prism (%0,58 kişi içi SD) ve Fit3D (LSC) veriyor.

---

## 2.2 EN KRİTİK BULGU — değişim tespiti mutlak doğruluktan tamamen farklı davranıyor

AJCN 2023 (Wong, Bennett, … Heymsfield, Shepherd), **n=133**, 6 farklı müdahale çalışması,
ortalama takip **13 ± 5 hafta**. Fit3D ProScanner (3DO) vs Hologic DXA, başlangıç ve bitişte.

| Değişen ne | 3DO değişimi ↔ DXA değişimi **R²** | RMSE |
| --- | --- | --- |
| **Yağ kütlesi (FM)** | K: **0,86** · E: **0,75** | K: 1,98 kg · E: 2,31 kg |
| **Yağsız kütle (FFM)** | K: 0,73 · E: 0,75 | K: 1,58 kg · E: 1,77 kg |
| **Apandiküler yağsız kütle (ALM)** | K: 0,70 · E: 0,52 | K: 0,37 kg · E: 0,52 kg |
| **Vücut yağ YÜZDESİ (BF%)** | K: **0,23** · E: **0,25** | K: %2,2 · E: %2,4 |

> **Bu tablo ürün stratejisini belirliyor.**
> **Yağ kütlesi (kg) değişimi iyi izleniyor (R² 0,75–0,86).**
> **Yağ YÜZDESİ değişimi izlenmiyor (R² 0,23–0,25 — varyansın dörtte biri).**
>
> Yani optik yöntemlerin en zayıf çıktısı, tam da tüketici uygulamalarının ekrana bastığı sayı:
> **"vücut yağ oranın %X'ten %Y'ye düştü".** Bu cümle, en iyi donanımla bile büyük ölçüde
> gürültü. Uygulamamızın bunu söylememe kararı **kanıtla destekleniyor.**

### Değişim tespitinin alt sınırı (Least Significant Change, LSC)
Aynı çalışmadan, %95 güvenle "gerçek değişim" demek için gereken minimum:

| Ölçüt | 3DO (optik) LSC | DXA LSC |
| --- | --- | --- |
| Yağ kütlesi, kadın | **1,52 kg** | 0,64 kg |
| Yağ kütlesi, erkek | **1,22 kg** | 0,69 kg |
| Yağsız kütle, kadın | 1,52 kg | 0,75 kg |
| Yağsız kütle, erkek | 1,22 kg | 0,94 kg |

> **Sayısal cevap:** Sabit donanımlı, profesyonel bir 3D optik tarayıcı bile
> **~1,2–1,5 kg yağ kütlesi değişiminin altını göremiyor.** Telefonla çekilmiş, ışığı ve pozu
> standart olmayan fotoğrafın alt sınırı **bundan daha iyi olamaz** — büyük ihtimalle daha kötü.
>
> Haftada 0,5 kg kilo kaybı hedefinde (bunun ~0,4 kg'ı yağ), **LSC'ye ulaşmak ~3–4 hafta sürer.**
> Bu, Bölüm 1'deki bel çevresi hesabıyla (3–4 hafta) **birebir örtüşüyor.** İki bağımsız yöntem
> aynı zaman sabitini veriyor: **ölçüm aralığı 4 hafta olmalı.**

### Karşı-kanıt / nüans
- 3DO **vücut şekli** değişimine çok duyarlı: yazarlar *"3DO was highly sensitive in detecting
  body shape changes over time"* diyor. Yani **şekil değişimi** yakalanıyor, **yüzdeye çevirmek**
  bozuyor.
- Ayrı bir çalışma (sporcularda 3D-infrared vs DXA): kesitsel olarak **değiştirilebilir değil**,
  ama **boylamsal BF% analizinde yakın uyum** var. → [PubMed 36582395](https://pubmed.ncbi.nlm.nih.gov/36582395/)
  (tam metin bu taramada alınamadı; özet ikinci elden)
- Google PhotoScan makalesi değişim tespitini **test edemediğini** açıkça yazıyor:
  *"only a small subset experienced noteworthy changes (10 out of 132 subjects experienced
  3% body weight loss)"* — 30 haftalık kohortta yeterli değişim olmamış.

---

## 2.3 Karşılaştırmalı değerlendirme ("2. foto 1. fotoya göre nasıl değişmiş") ne kadar güvenilir?

Soru bu araştırmanın merkezindeydi. Dürüst cevap parçalı:

**Lehte olan:**
- Değişimi ölçmek, mutlak değeri ölçmekten **sistematik olarak daha kolay** — çünkü kişiye özgü
  sabit bias (vücut tipi, kemik yapısı, cihaz kalibrasyonu) **farkta birbirini götürür**.
  AJCN verisi bunu doğruluyor: mutlak BF% için 3DO'nun RMSE'si yüksek ama **FM değişimi
  R²=0,75–0,86** ile iyi izleniyor.
- 3DO kesinlik hatası (0,25–0,44 kg) mutlak doğruluk hatasından (kg cinsinden çok daha büyük)
  kat kat küçük. **Aynı yöntemle tekrar ölçmek, farklı yöntemle ölçmekten çok daha tutarlı.**

**Aleyhte olan:**
- Kişiye özgü bias **ancak koşullar aynı kalırsa** götürür. Işık, poz, kıyafet, kamera açısı
  değişirse bias da değişir ve fark kirlenir.
- LSC 1,2–1,5 kg — yani "değişti" demenin alt sınırı yüksek.
- **BF% farkı** (yüzde puanı olarak) R²=0,23–0,25 ile neredeyse anlamsız.

**Bu yaklaşımı açıkça kullanan ürün/çalışma var mı?**
- **Akademide:** AJCN 2023 tam olarak bunu yapıyor — mutlak değeri değil **değişimi** valide ediyor.
  Bu, bulabildiğim en doğrudan metodolojik dayanak.
- **Üründe:** "mutlak yağ oranı söylemeyi reddedip sadece karşılaştırmalı değerlendirme yapan"
  ticari bir ürün bu taramada **bulunamadı.** Tüketici ürünlerinin tamamı (Spren, GainFrame,
  LeanLens, bodyfatAI, BodyMax AI, ZOZOFIT) mutlak yüzde basıyor — çünkü satan sayı o.
  **Bu bir boşluk ve muhtemelen bizim farklılaşma noktamız.**

> **Ürün için çıkarım:** Karşılaştırmalı yaklaşım **teknik olarak daha savunulabilir** ama
> "biraz daha iyi", "sihirli çözüm" değil. Güvenilirliği tamamen **standardizasyona** bağlı
> (bkz. 2.4) ve alt sınırı ~4 hafta. Pazarda kimsenin yapmıyor olması hem fırsat hem uyarı:
> mutlak sayı satıyor, değişim satmıyor. Bunu ürün anlatısıyla çözmek gerekiyor.

---

## 2.4 Standardizasyon protokolü — ve etkisinin ÖLÇÜLMÜŞ değeri

### Standardizasyon ne kadar kazandırıyor? → **Kesinlik hatasını ~%50 azaltıyor.**

Wong et al. 2021 (*Obesity*), 3DO taramalarını dijital olarak standart bir T-poza yeniden
konumlandırdı (dik duruş, kollar yatay ve gövdeyle aynı düzlemde, kol ve bacaklar düz).
Sonuç: **"Reposing the mesh to a standardized position and pose reduced the precision error by
approximately 50%."**
→ [Obesity 2021, Wiley](https://onlinelibrary.wiley.com/doi/full/10.1002/oby.23256) ·
[MPI Perceiving Systems](https://is.mpg.de/ps/publications/tpose_obesity_21)

Yazarların tespit ettiği varyans kaynakları: **kolun gövdeye göre mesafesi ve açısı**, dengesini
koruyamayan katılımcının öne/arkaya yaslanması, ağırlığı baskın tarafa vermesi.

Ayrıca: 3D tam vücut tarama ölçümlerinde postüral değişkenliği ve hatayı azaltmak için
**konumlandırma yardımcısı (positioning aid)** geliştirilmiş; ana odağın "tutarlı postürün
replikasyonu" olması gerektiği vurgulanıyor.
→ [Applied Ergonomics](https://www.sciencedirect.com/science/article/abs/pii/S0003687017302508)

> **Ürün için çıkarım — en yüksek getirili tek mühendislik işi:** Fotoğraf çekim ekranında
> **poz standardizasyonu**. Bu, algoritmayı iyileştirmekten daha çok kazandırır (%50 kesinlik).
> Somut: ekranda **önceki fotoğrafın yarı saydam silüeti (onion-skin overlay)** + telefon
> **su terazisi/eğim göstergesi** + sabit mesafe için **çerçeve kılavuzu**. Bunlar ucuz ve
> etkisi kanıtlı.

### Önerilen çekim protokolü

| Değişken | Öneri | Dayanak |
| --- | --- | --- |
| **Poz** | Tek bir standart poz, her seferinde aynı. Kollar gövdeden **sabit, belirlenmiş açıda** (yanda serbest değil — açı kayar). Ayaklar işaretli mesafede. Dik duruş, ağırlık iki ayağa eşit. | Wong 2021: poz varyansı kesinlik hatasının ~yarısı |
| **Açı sayısı** | **Ön + yan** minimum. Google PhotoScan ön+yan çift kullanıyor (MAE %2,13–2,15); Cambridge 3D BodyShape 4 fotoğraf. Tek fotoğraf belirgin şekilde zayıf. | [arXiv:2603.27017](https://arxiv.org/html/2603.27017v2), [npj DM 2024](https://www.nature.com/articles/s41746-024-01289-0) |
| **Mesafe / kamera yüksekliği** | Sabit mesafe (uygulama çerçeveyle zorlasın), kamera **göğüs hizası** ve gövdeye dik. PhotoScan iki kamera yüksekliği (yerde + masa) kullanıp ortalıyor. | aynı |
| **Işık** | Yumuşak, **önden**, gölgesiz. Tepeden veya yandan ışıktan kaçın — yanıltıcı gölge/tanım yaratır. Aynı ışık kaynağı her seferinde. | Bodybuilding pratiği; **akademik nicel kanıt bulunamadı** |
| **Kıyafet** | Mümkün olduğunca az ve **her seferinde aynı**. Bol kıyafet siluet segmentasyonunu bozar. | Pratik + segmentasyon mantığı |
| **Arka plan** | Düz, tek renk, kontrast yaratan. Her seferinde aynı yer. | Pratik |
| **Gün saati** | **Sabah, uyanınca, tuvalet sonrası, aç karnına.** | Bodybuilding pratiği; **akademik nicel kanıt bulunamadı** |
| **Pump durumu** | Antrenman **öncesi** çek. Antrenman sonrası "pump" siluet genişliğini geçici artırır. | Pratik; **nicel kanıt bulunamadı** |

> **Dürüstlük notu:** Işık/gün saati/pump için elimde bodybuilding pratiği var, hakemli nicel
> kanıt yok. Bunları "kanıtlı" diye sunmayacağız — "varyansı azalttığı için standart tut"
> gerekçesi yeterli ve dürüst. Nicel kanıtı olan tek şey **poz standardizasyonu (%50)**.

### Ticari uygulamaların hata payı iddiası (satıcı kaynağı, teyit edilmedi)
Bazı ticari AI foto tahmincileri "±3–5 yüzde puanı" hata payı ve "ön+yan iki açı bu hatayı kabaca
yarıya indirir" iddiasında. Bu **satıcı blogu iddiası**, bağımsız doğrulaması **bulunamadı** —
ancak PhotoScan'in çift görüntü tasarımı ve LeanScreen'in tek-görüntü zayıflığı bu yönü destekliyor.

---

## 2.5 Sıklık — fotoğraf ne sıklıkla çekilmeli?

**Nicel kanıt zayıf. Elimizdeki en sağlam argüman doğrudan sıklık çalışması değil, LSC matematiği.**

| Kaynak tipi | Öneri |
| --- | --- |
| **LSC matematiği** (bu araştırmanın türettiği) | 3DO LSC = 1,2–1,5 kg yağ kütlesi. Haftada ~0,4 kg yağ kaybı hızında → **3–4 hafta** | 
| Bel çevresi matematiği (Bölüm 1.5) | 0,3 cm/hafta hız vs ±1 cm hata → **3–4 hafta** |
| Bodybuilding/koçluk pratiği | 2–4 haftada bir; haftalık fotoğraf "haftadan haftaya değişim görülemeyecek kadar küçük, cesaret kırıcı" | çeşitli koçluk kaynakları |
| MacroFactor (ürün) ipuçları | ilerleme fotoğrafı rehberi mevcut | [MacroFactor yardım](https://help.macrofactorapp.com/en/articles/117-tips-for-taking-good-progress-photos) |

> **"Haftalık foto yorgunluk yaratıyor" bulgusu:** Bu iddiayı destekleyen **hakemli çalışma
> bulunamadı.** Yaygın koçluk pratiği ve blog konsensüsü bu yönde ama ölçülmüş veri yok.
> Bir blog kaynağı "Neate et al. 2015, aylık fotoğraflar DEXA ile r=0,89 korele" diye bir atıf
> veriyor — **bu atıf doğrulanamadı, muhtemelen uydurma. KULLANMA.**

**Kendi kendine tartılma sıklığı için ise gerçek RKÇ kanıtı var ve karışık:**
- 183 obez yetişkinlik RKÇ: **günlük tartılma talimatı kilo kaybı müdahalesi olarak etkisiz**;
  müdahale grubu sadece 0,5 kg fazla verdi, anlamlı değil.
  → [IJBNPA 2014](https://link.springer.com/article/10.1186/s12966-014-0125-9)
- Karşı bulgu: **günlük tartılma kilo kaybını ve kilo kontrol davranışlarının benimsenmesini
  artırıyor.** → [J Acad Nutr Diet 2015](https://pubmed.ncbi.nlm.nih.gov/25683820/)
- **Psikolojik zarar:** Bir RKÇ günlük tartılmanın **psikolojik semptomlarda olumsuz değişimle
  ilişkili olmadığını** buldu. Beden memnuniyetsizliği özel olarak ölçülmemiş.
- 3 yıllık takip: katılımcıların **%75'inden fazlası** haftada en az bir tartılmayı sürdürmüş.
  → [PMC5625756](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5625756/)

> **Ürün için çıkarım:** Tartı **günlük** (ucuz, gürültüsü matematikle temizlenebilir, zararsız
> görünüyor), fotoğraf ve bel **4 haftada bir** (LSC'nin altında ölçüm sadece gürültü ve
> demoralizasyon üretir). Bu asimetri kasıtlı: **gürültüsü filtrelenebilen ölçümü sık, 
> filtrelenemeyeni seyrek al.**

---

## 2.6 Gizlilik — vücut fotoğrafı mimarisi

### GDPR: vücut fotoğrafı biyometrik veri mi? → **Hayır, ama daha kötüsü: sağlık verisi.**

Bu ayrım sıkça yanlış yapılıyor:

| Soru | Cevap | Dayanak |
| --- | --- | --- |
| Fotoğraf **biyometrik veri** mi? | **Sadece** "gerçek kişinin benzersiz tanımlanmasına veya doğrulanmasına imkân veren özel teknik yöntemlerle" işlendiğinde. Düz bir fotoğraf tek başına biyometrik veri **değil**; yüzden çıkarılan yüz izi (face print) biyometrik veri. | [VeraSafe, GDPR ve fotoğraflar](https://verasafe.com/blog/gdpr-and-photographs-understanding-special-categories-of-personal-data/) |
| Vücut kompozisyonu çıkarımı **sağlık verisi** mi? | **Evet.** GDPR'da sağlık verisi kişinin fiziksel/zihinsel sağlığına dair her bilgiyi kapsar; fitness verisi dahil. Vücut yağ oranı çıkarımı bunun içinde. | [GDPR Local, giyilebilir teknoloji](https://gdprlocal.com/gdpr-for-wearable-technology/) |
| Sonuç | Vücut fotoğrafı **Madde 9 özel kategori veri** — ama **biyometrik yoldan değil, sağlık verisi yolundan.** Gereken: **açık rıza (explicit consent)** + Madde 6 hukuki dayanak. İkisi **kümülatif**. Rıza her an geri alınabilir olmalı. | [Article 9 GDPR, GDPRhub](https://gdprhub.eu/Article_9_GDPR) |

**Pratik fark neden önemli:** "Biyometrik değil" savunmasına yaslanmak işe yaramaz. Yine de en
yüksek koruma seviyesi gerekiyor. Ama şu da doğru: eğer fotoğrafı **kimlik tanıma için
işlemiyorsak** biyometrik rejimin ek yükümlülükleri (bazı ulusal kısıtlar) devreye girmiyor.

### Amazon Halo — kapanmada gizliliğin rolü

| Olgu | Detay | Kaynak |
| --- | --- | --- |
| Ne istiyordu | Kullanıcıdan **iç çamaşırıyla tam boy fotoğraf**, yağ oranı tahmini için | [Android Police](https://www.androidpolice.com/why-amazon-halo-failed/) |
| Mimari | Fotoğraflar **Amazon bulutuna** gönderiliyor, işleniyor, sonra siliniyor. Amazon "Body ve Tone opsiyoneldir, Amazon'un tarama görüntülerine erişimi yoktur" dedi. Ses kayıtları ise buluta hiç gitmiyor, telefonda işlenip siliniyordu. | [GeekWire](https://www.geekwire.com/2020/amazon-halo-health-tracker-debuts-99-99-new-reports-raise-privacy-concerns/) |
| Siyasi tepki | **Senatör Amy Klobuchar**, HHS Bakanı Alex Azar'a mektup yazdı: Halo'nun "tüketici sağlık cihazları arasında **görülmemiş düzeyde** kişisel bilgi topladığı" | [Klobuchar Senato](https://www.klobuchar.senate.gov/public/index.cfm/2020/12/sen-klobuchar-spooked-by-amazon-halo-asks-for-new-health-tracker-privacy-protections) (Aralık 2020) |
| Kapanış | **31 Temmuz 2023** — tüm portföy. Amazon'un gerekçesi: *"significant headwinds, including an increasingly crowded segment and an uncertain economic environment."* | [Amazon resmî](https://www.aboutamazon.com/news/company-news/amazon-halo-discontinued) |

> **Dürüst değerlendirme:** Amazon resmî gerekçe olarak **gizliliği göstermedi** — pazar
> kalabalığı ve ekonomi dedi. Ama ürün lansmanından itibaren gizlilik tartışmasının merkezindeydi,
> senatör mektubu aldı ve *"as much for testing the limits of personal privacy as for its
> underlying features"* diye anıldı. **Gizlilik tek sebep değil, ama benimsemeyi (adoption)
> baştan zehirledi.** Buluta çıplak fotoğraf yükleme modeli tüketicide tutmadı.

### Mimari öneri
Sektör pratiği net: **çıkarımı cihazda yap, ham kareyi asla gönderme.** Kaynaklar
*"perform inference on the device to extract key points of the skeleton and delete the video
frames immediately... don't stream raw video to the cloud, as it's slow, expensive, and scares off
users who care about privacy"* diyor.
→ [MobiDev fitness app rehberi](https://mobidev.biz/blog/fitness-application-development-guide-best-practices-and-case-studies)

**Uygulanabilir katmanlar:**
1. Segmentasyon/landmark çıkarımı **cihazda**. Sunucuya sadece **türetilmiş sayılar** (silüet
   genişlikleri, oranlar) gider — piksel gitmez.
2. Ham fotoğraf **cihazda kalır**, kullanıcının kendi galerisinde/uygulama kasasında, şifreli.
3. Buluta gitmesi gerekiyorsa: **opt-in**, ayrı ve açık rıza, saklama süresi belirtili, tek tuşla
   toplu silme.
4. Karşılaştırmalı yaklaşımın **ek gizlilik avantajı var**: "değişim" için iki fotoğrafın
   türetilmiş vektörlerini karşılaştırmak yeterli; fotoğrafları saklamak zorunlu değil.

---
---

# BÖLÜM 3 — DİĞER PRATİK ÖLÇÜM YOLLARI

## 3.1 Kaliper (skinfold)

| Konu | Bulgu | Kaynak |
| --- | --- | --- |
| Uzman TEM | Tüm bölgelerde tolere edilen sınırın altında (**<%5**) | [Sport Sci Health 2025](https://link.springer.com/article/10.1007/s11332-025-01389-8) |
| Acemi TEM | İliak krista ve abdominal bölgede **>%7,5**; bazı ölçümlerde uzmanın **2–4 katı** | aynı |
| Acemi yanlılığı | Uzmana kıyasla vakaların **%55,12'sinde yağ oranını fazla tahmin** | aynı |
| Bölgeye göre güvenilirlik | İyi: triseps, subskapular, baldır. Orta: iliak krista, abdominal, uyluk. **Kötü: biseps** | aynı |
| Yeterlilik için gereken pratik | Jackson & Pollock: **50–100 kişide pratik** | aynı |

**Kendi kendine yapılabilir mi?** Fiilen **hayır.** En güvenilir bölgeler (subskapular = sırt,
triseps = kolun arkası) tek başına ulaşılamayan yerler. Ulaşılabilen bölgeler (abdominal, iliak)
tam olarak acemide en kötü performansı verenler.

**Maliyet:** plastik kaliper ~$10–20, metal (Harpenden/Lange) $200–400.

> **Karar: ÜRÜNE ALMA.** Öğrenme eğrisi 50–100 tekrar, en iyi bölgeler erişilemez, acemi hatası
> uzmanın 2–4 katı ve **yönlü** (fazla tahmin). "Minimum iş" ilkesinin tam tersi.

---

## 3.2 Navy / US Army çevre formülü

Erkek formülü: boyun + bel + boy. Kadın: + kalça.

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Orijinal validasyon | Hodgdon & Beckett, Naval Health Research Center, **1984** | — |
| Tahmin standart hatası (SEE) | **%3–4 BF** | ikincil aktarımlar; birincil 1984 raporu bu taramada alınamadı |
| **Değişim tespiti — kritik bulgu** | 8 haftalık askerî eğitim, **n=1.407** (926E/481K), DXA referans | [Frontiers in Physiology 2023, PMC10282178](https://pmc.ncbi.nlm.nih.gov/articles/PMC10282178/) |
| — DXA'nın gördüğü gerçek değişim | Erkek **−%3,3 ± 2,8** · Kadın **−%4,0 ± 2,4** BF | aynı |
| — Çevre formülünün gördüğü | Erkek **−%2,2 ± 3,3** · Kadın **%0,0 ± 3,3 (p=0,86 — hiçbir değişim yok)** | aynı |
| — Yön doğruluğu (≥1 puan kazanç/kayıp doğru sınıflanan) | Erkek **%83** · Kadın **%56** | aynı |
| — Kadınların %43'ü | Çevre formülüne göre yağ **kazandı**, DXA'ya göre **kaybetti** | aynı |
| Yazar sonucu | *"circumference-based %BF metrics may not be an appropriate tool to track changes in body composition during short duration training."* | aynı |

> **Karar: yağ ORANI çıktısı olarak ÜRÜNE ALMA.** Mezurayla yağ oranı tahmini teknik olarak
> mümkün ama **değişimi izlemekte kanıtlı biçimde başarısız** — ve bizim tek işimiz değişimi
> izlemek. Ham bel çevresini kullan, onu yağ oranına çevirme.
>
> **Nüans:** Bu bulgu, çevre ölçümünün değil, **çevre → yağ oranı dönüşümünün** iflası.
> Ham bel çevresi Bölüm 1'de gösterildiği gibi kullanılabilir. Bozan şey, boyun/bel'i tek bir
> yüzdeye sıkıştıran 1984 denklemi.

---

## 3.3 Ev tipi BIA tartıları ve akıllı saat/yüzükler

| Cihaz sınıfı | Doğruluk | Tekrarlanabilirlik | Kaynak |
| --- | --- | --- | --- |
| **Çok frekanslı BIA (laboratuvar sınıfı)** | DXA'ya karşı **yüksek kesinlik, sistematik sapma (offset)**. Popülasyon düzeyinde güçlü korelasyon, **birey düzeyinde anlamlı fark** | Test-retest **ICC ≥0,998** (BF% için); aynı gün fark 0,0–0,2 kg, günler arası 0,1–0,7 kg | [Front Nutr 2024, PMC11649400](https://pmc.ncbi.nlm.nih.gov/articles/PMC11649400/) |
| **Samsung Galaxy Watch 4/5 (bilek BIA)** | DXA'ya karşı FFM'de **anlamlı fark var, ama sistematik sapma düzeltilebilir**. Laboratuvar BIA ile fark **yok** (Lin CCC = 0,97) | **DXA'dan daha az kesin** — aynı güveni sağlamak için **daha fazla tekrar ölçüm gerekiyor** | AJCN 2022, n=109 alındı / 75 tamamladı; [Shepherd Research Lab](https://shepherdresearchlab.org/samsung-bioimpedance-system-evaluation-study/) |
| **Tüketici akıllı tartı** (Fitbit, Renpho, Withings, Wyze) | DEXA'ya karşı **5–8 yüzde puanı** hata | — | **satıcı blogu iddiası**, bağımsız doğrulama **bulunamadı** → [GainFrame](https://gainframe.app/blog/best-body-composition-apps/) |
| **Akıllı yüzük (Oura vb.) vücut kompozisyonu** | Vücut kompozisyonu ölçümü **yok** — bu cihazlar kompozisyon ölçmüyor | — | — |
| BIA denklem sorunu | 2024 derlemesi **100'den fazla** valide BIA denklemi saydı; sporcu için geliştirilen denklem sağlıklı orta yaşlıda yanlış sonuç verir | — | aynı taramadaki derleme aktarımı |

> **Karar — nüanslı:** BIA'nın **mutlak** yağ oranı çıktısı çöp (bu, salon BIA'sını reddetme
> kararının doğrulanması). Ama **tekrarlanabilirliği çok yüksek** (ICC ≥0,998). Yani aynı cihazda,
> aynı koşulda (sabah, aç, tuvalet sonrası, aynı hidrasyon) alınan **trend** bilgi taşıyabilir.
>
> Yine de **ürüne dahil etmeyi önermiyorum**: kullanıcıya cihaz satın aldırıyor, mutlak sayı
> gösteriyor (yanlış), ve sağladığı ek bilgi kilo trendi + belin üstüne binmiyor. Kullanıcıda
> zaten varsa "tartının kilo rakamını kullan, yağ oranı rakamını yok say" demek yeterli.

---

## 3.4 Kilo trendi matematiği — en ucuz, en yüksek getirili ölçüm

### Gürültü ne kadar?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Fizyolojik günlük dalgalanma | **~0,4 kg** (tamamı su; ozmotik olarak aktif sodyum ve glikojen kaynaklı) | [Day-to-day variability in euvolemic body mass, 2023, PMC10653631](https://pmc.ncbi.nlm.nih.gov/articles/PMC10653631/) |
| 1 günlük aralık göreli fark SD | **%0,53** (80 kg'da ≈0,42 kg) | aynı |
| 7 günlük aralık göreli fark SD | **%0,69** (80 kg'da ≈0,55 kg) | aynı |
| Toplam vücut suyu günlük oynaması | **±%5**'e kadar | [PMC4580369](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4580369/) |
| Pratik gözlem | Günlük 1–3 kg oynama normal | çeşitli |

**Sinyal/gürültü hesabı:** Haftada 0,5 kg kayıp hedefi = günde ~0,07 kg. Günlük gürültü SD ≈0,42 kg.
**Tek bir günün ölçümünde sinyal, gürültünün ~1/6'sı.** Ham günlük kiloyu kullanıcıya göstermek
matematiksel olarak yanlış. Bu yüzden filtre şart.

### Filtre yaklaşımları

| Yöntem | Nasıl | Kim kullanıyor |
| --- | --- | --- |
| **EWMA (Hacker's Diet)** | John Walker'ın orijinali: trend, bugünkü ölçüm ile mevcut trend farkının **1/10'u** kadar güncellenir. (α = 0,1 → yaklaşık 19–20 günlük etkin pencere.) | [Hacker's Diet, fourmilab](https://www.fourmilab.ch/hackdiet/www/hackdiet.html) · [Signal and Noise bölümü](https://www.fourmilab.ch/hackdiet/e4/signalnoise.html) |
| **Libra (Android)** | Doğrudan Hacker's Diet formülünü kullandığını beyan ediyor | [Libra](https://play.google.com/store/apps/details?id=net.cachapa.libra) |
| **Happy Scale (iOS)** | "Teknik analiz ve öngörücü algoritmalar", trend + hedef tarihi tahmini | — |
| **MacroFactor** | Son ölçümlere daha fazla ağırlık veren hareketli ortalama; trend, günlük gürültüdeki **sinyal** olarak tanımlanıyor. Trend ayrıca **adaptif TDEE**'yi besliyor: loglanmış kalori ile kilo trendi ilişkisinden gerçek harcama türetiliyor. Tahminler **3. günde** başlıyor, **~30 gün**de olgunlaşıyor. | [MacroFactor yardım — Weight Trend](https://help.macrofactorapp.com/en/articles/21-weight-trend) · [Expenditure algoritması](https://macrofactor.com/algorithm-accuracy/) |
| **Kalman filtresi** | Her yeni ölçümde yeni bilgiye ne kadar ağırlık vereceğine dinamik karar verir; sabit pencereli ortalamadan **daha hızlı tepki** verir, değişen trendlerde üstün | genel literatür; kilo takibinde ticari kullanım **bulunamadı** |

### Pencere seçimi
- **7 gün:** en yaygın pratik öneri ("günlük değil, 7 günlük ortalamaya bak"). Haftalık ritmi
  (hafta sonu tuz/karbonhidrat) tam bir döngüde kapattığı için mantıklı.
- **EWMA α=0,1 (~20 gün):** daha pürüzsüz ama daha gecikmeli.
- **Öneri:** görselleştirmede **7 günlük hareketli ortalama** (kullanıcı anlıyor, haftalık döngüyü
  temizliyor), karar/uyarlama motorunda **EWMA veya daha uzun pencere** (gecikmeyi kabul et,
  yanlış tetiklemeyi engelle). MacroFactor'ın 3 gün → 30 gün olgunlaşma eğrisi bu ayrımın
  ticari doğrulanması.

> **Kritik ürün kuralı:** Trend hesaplanmadan **hiçbir karar verilmemeli ve hiçbir yargı
> gösterilmemeli.** İlk ~2 haftada uygulama kilo hakkında yorum yapmamalı — matematiksel olarak
> yorumlayacak veri yok.

---

## 3.5 Ölçüm kombinasyonu — birlikte kullanınca ne kazanıyoruz?

**Doğrudan nicel kanıt zayıf; ama iki sağlam dayanak var:**

1. **Google PhotoScan verisi — füzyon ölçülmüş kazanç veriyor:**
   | Yöntem | BF% MAE |
   | --- | --- |
   | Sadece demografi (BMI + yaş + cinsiyet) | %3,44 |
   | Sadece BIA | %2,91 |
   | Sadece PhotoScan (foto) | %2,15 |
   | **PhotoScan + BIA** | **%1,98** |

   İnsülin direnci sınıflamasında: demografi tek başına AUROC 0,692 → + PhotoScan **0,760** →
   + DXA (altın standart) 0,773. **Foto eklemek, DXA eklemenin kazancının çoğunu veriyor.**
   → [arXiv:2603.27017](https://arxiv.org/html/2603.27017v2)

2. **Ölçütler farklı şeylerde başarısız oluyor — hataları bağımsız:**
   | Ölçüt | Neye kör | Neyde güçlü |
   | --- | --- | --- |
   | Kilo | Kompozisyon (yağ/kas ayrımı); su gürültüsü yüksek | Toplam enerji dengesi; ucuz, günlük |
   | Bel | Kas kazanımı; ölçüm noktası kayması | Viseral/abdominal yağ; kilo sabitken bile hareket eder |
   | Foto | Küçük değişim (LSC yüksek); ışık/poz kirliliği | Bölgesel dağılım, şekil; motivasyonel |
   | Performans (yük × tekrar) | Yağ | Kas/sinir sistemi; günlük geri bildirim |

   Hataları bağımsız olduğu için birleşim **çelişki tespitine** izin veriyor:
   - Kilo ↓ + bel ↓ → yağ kaybı, doğrula ve devam.
   - Kilo **sabit** + bel ↓ → **kompozisyon değişimi** (Ross 2000 ile kanıtlı, bkz. 1.6).
   - Kilo ↓ + bel **sabit** + performans ↓ → uyarı: kas kaybı riski, protein/direnç antrenmanı.
   - Kilo ↓ + bel ↓ + performans ↓ → açık çok agresif.

> **Kılavuz durumu:** "Şu 4 ölçütü birlikte kullan" diyen resmî bir kılavuz veya position stand
> bu taramada **bulunamadı.** Çoklu-ölçüt yaklaşımı koçluk pratiğinde standart ama kurumsal
> kılavuza girmemiş. En yakın kurumsal destek NICE NG246'nın **BMI + WHtR birlikte** kullanma
> önerisi (iki ölçüt).

---
---

# ÖNERİLEN ÖLÇÜM PROTOKOLÜ

## Tasarımın dayandığı üç sayı

1. **Kendi kendine bel ölçüm hatası ≈ ±1 cm** (video eğitimli) — beklenen hız 0,3 cm/hafta.
2. **Optik/foto yöntemlerin en iyi LSC'si ≈ 1,2–1,5 kg yağ kütlesi** — beklenen hız 0,4 kg/hafta.
3. **Günlük kilo gürültüsü SD ≈ 0,42 kg** — beklenen hız 0,07 kg/gün.

**Üçü de aynı sonuca çıkıyor: anlamlı vücut sinyali için gereken süre ≈ 4 hafta.**
Bundan sık ölçüm bilgi eklemez, sadece gürültü ve demoralizasyon ekler. Protokol bu sabit
etrafında kuruldu.

---

## Kullanıcıdan istenecekler

| Ölçüm | Sıklık | Süre | Neden bu sıklık |
| --- | --- | --- | --- |
| **Kilo** | **Günlük** (sabah, tuvalet sonrası, aç, aynı kıyafet) | 10 sn | Gürültüsü **matematikle temizlenebilir** (EWMA/7 günlük ortalama). Günlük tartılmanın psikolojik zarar verdiğine dair RKÇ kanıtı **yok**. Sık ölçüm burada bedava. Kaçırılan gün sorun değil — filtre tolere eder. |
| **Bel çevresi** | **4 haftada bir** (sabah, aç, ekspirasyon sonu) | 60 sn | Hata ±1 cm, hız 0,3 cm/hafta → 4 haftada sinyal hatayı aşar. Haftalık ölçüm **istatistiksel olarak anlamsız.** |
| **İlerleme fotoğrafı** | **4 haftada bir**, bel ölçümüyle **aynı sabah** | 90 sn | LSC ≈1,2–1,5 kg yağ → ~4 hafta. Aynı sabah = iki ölçüm aynı hidrasyon/tokluk durumunda, karşılaştırılabilir. |
| **Antrenman performansı** (yük × tekrar) | Her seansta, zaten loglanıyor | 0 ek | Tek **günlük** geri bildirim veren vücut sinyali. İlk 3 haftanın boşluğunu bu doldurur. |
| **Boy** | Bir kez | — | WHtR için. Ek iş yok. |

**İstenmeyecekler:** kaliper (3.1), BIA yağ oranı (3.3), Navy formülü yağ oranı (3.2),
salon BIA'sı (baştan reddedildi).

---

## Nasıl istenmeli — uygulama tasarımı kararları

### Bel çevresi
- **Nokta: WHO orta noktası** (en alt kaburga ile iliak krista arası). Gerekçe: uluslararası
  varsayılan, IDF eşikleriyle uyumlu, erkekte NHLBI'dan farkı sadece 0,8 cm.
- **Kısa video zorunlu.** Yazılı talimat +1,75 cm sapma verirken video +0,95 cm veriyor —
  ölçülmüş, ~0,8 cm kazanç. Bu, aylık beklenen değişimin (~1,2 cm) üçte ikisi.
- **İki ölçüm iste, fark >1 cm ise üçüncüyü iste** (WHO STEPS kuralı). Ortalamayı kaydet.
- **Anlık geri bildirim yok.** Tek ölçüm gösterme; 3 ölçümlük trend oluşana kadar sadece kaydet.
- Kaydedilen ham cm; kullanıcıya gösterilen **WHtR** ve **değişim**.

### Fotoğraf
- **Ön + yan, iki kare.** Tek kare belirgin şekilde zayıf; PhotoScan ve Cambridge çoklu görüntü
  kullanıyor.
- **Onion-skin overlay:** önceki fotoğrafın yarı saydam silüeti ekranda. Poz standardizasyonu
  kesinlik hatasını **~%50 azaltıyor** (Wong 2021) — bu, ürünün fotoğraf tarafındaki en yüksek
  getirili tek özelliği.
- **Eğim göstergesi** (telefon dik mi) + **çerçeve kılavuzu** (mesafe sabit mi).
- **Cihazda işle, ham kareyi gönderme.** Sunucuya sadece türetilmiş vektör.
- İlk çekimde "referans çekim" ritüeli: yer işaretle, ışığı seç, kıyafeti seç → uygulama
  kaydetsin ve her seferinde hatırlatsın.

### Kilo
- Günlük iste ama **günlük rakamı vurgulama.** Ana grafik **7 günlük hareketli ortalama**.
- Ham günlük nokta soluk/ikincil gösterilsin — kullanıcı gürültünün varlığını görsün ama
  ona tepki vermesin. (Bu aynı zamanda "kara kutu kurma" ilkesine uyuyor: gürültüyü gizlemiyoruz,
  açıklıyoruz.)
- İlk **14 gün** kilo hakkında hiçbir yargı cümlesi kurma. Yeterli veri yok.

---

## Ne söylenecek, ne söylenmeyecek

### ASLA söylenmeyecek
- **"Vücut yağ oranın %X"** — mutlak değer. Bağımsız test edilen tek foto ürünü (LeanScreen)
  kendi ±%3 iddiasını **%44 oranında** tutturabildi; düşük yağlıda +%4, yüksek yağlıda −%5,7
  sapma gösterdi.
- **"Yağ oranın %X'ten %Y'ye düştü"** — yüzde **değişimi** en zayıf çıktı: profesyonel 3D optik
  tarayıcıda bile DXA ile R²=0,23–0,25.
- **"Bu hafta 0,4 kg verdin"** — günlük gürültü SD'sinin (0,42 kg) içinde.
- **"Bu hafta belin 0,5 cm düştü"** — ölçüm hatasının (±1 cm) içinde.

### Söylenecek
| Durum | Mesaj |
| --- | --- |
| Kilo trendi ↓ + bel ↓ | "Yağ kaybediyorsun. İki bağımsız ölçüt aynı yönü gösteriyor." |
| Kilo **sabit** + bel ↓ | **"Terazi durdu ama bel düştü — bu kompozisyon değişimi. Kilo kaybı olmadan abdominal yağ kaybı belgelenmiş bir olgu."** (Ross 2000) — *bu, terk penceresinin en değerli mesajı.* |
| Kilo ↓ + bel sabit + performans ↓ | "Açık fazla agresif olabilir. Protein ve direnç antrenmanına bak." |
| İlk 3 hafta | **"Şu an ölçebildiğimiz hiçbir şey henüz kıpırdamadı ve bu normal. İçeride değişen şeyler var — insülin duyarlılığı 48 saat ile 7 gün içinde iyileşmeye başlıyor, kilo kaybından bağımsız olarak. Dışarıdan görünmesi 3–4 hafta sürer."** |
| Fotoğraf karşılaştırması | Yön ve bölge: "bel bölgesi daralmış, omuz genişliği korunmuş" — **sayı değil, yön ve bölge.** |
| Mutlak eşik (istenirse) | **WHtR:** "belin boyunun yarısından az olmalı" (NICE NG246). Ham cm için IDF 94 cm (erkek, Europid). |

---

## Zaman çizelgesi — kullanıcıya önden gösterilecek

| Hafta | Ne ölçülür | Ne beklenir |
| --- | --- | --- |
| 0 | Boy, bel, foto, kilo (başlangıç) | Referans kuruluyor |
| 1–2 | Kilo (günlük), performans | **Hiçbir vücut sinyali yok.** Trend olgunlaşıyor. Geri bildirim: uyum + performans. |
| 2–3 | Kilo trendi anlamlı hale gelir | İlk gerçek kilo yönü |
| **4** | **Bel + foto + kilo trendi** | İlk gerçek karşılaştırma. Beklenen: bel −1 ila −1,6 cm, yağ kütlesi −1,2 ila −1,6 kg |
| 8 | Aynı üçlü | Fotoğrafta ilk **görünür** fark |
| 12 | Aynı üçlü | Aerobik egzersiz meta-analizinde 12 hafta = **−3,2 cm bel** referansı |

---

## Açık kalan sorular (bu taramada cevaplanamadı)

1. **Bel çevresinin gün içi ve tokluk kaynaklı dalgalanmasının cm cinsinden büyüklüğü.**
   Sabah/aç ölçüm önerisi evrensel ama niceleyen çalışma bulunamadı. Bu sayı, ölçüm hatası
   bütçemizin bilinmeyen bir parçası.
2. **Telefon fotoğrafının (booth tarayıcı değil) gerçek test-retest kesinliği.** Prism %0,58 SD
   veriyor ama kendi beyanı ve 360° video tabanlı. Saf 2D çift-foto için bağımsız
   tekrarlanabilirlik sayısı **yok**.
3. **Işık/kıyafet/gün saati standardizasyonunun nicel etkisi.** Sadece poz için sayı var (%50).
4. **"Haftalık fotoğraf yorgunluk yaratır" iddiasının hakemli kanıtı.** Yok.
5. **Türkiye popülasyonu için valide edilmiş bel çevresi eşiği.** Yok; IDF Europid (94 cm)
   varsayılan olarak kullanılıyor.
6. **Karşılaştırmalı (mutlak değil) değerlendirme yapan ticari ürün örneği.** Bulunamadı —
   pazar boşluğu veya pazar reddi olabilir.

---

## Kaynak notu

- Hakemli ve bağımsız: AJCN 2023 (PMC10315406), Frontiers in Physiology 2023 (PMC10282178),
  npj Digital Medicine 2024 (2 makale), Obesity 2021 (Wong), BMC Med Res Methodol 2016,
  Public Health Nutrition (video vs yazılı), Obesity Reviews 2022 (Armstrong), Annals 2000 (Ross),
  Diabetes Care 2010/2022, Front Nutr 2024.
- Ön baskı: arXiv:2603.27017 (Google PhotoScan, Nisan 2026) — **hakem denetiminden geçmemiş.**
- Firma beyanı (bağımsız değil): Prism Labs beyaz kitabı, Spren blogu, GainFrame blogu.
- **Doğrulanamadı / kullanılmadı:** "Neate et al. 2015, r=0,89" atfı (blog kaynağı, sahte olabilir);
  bel/kilo oranı için Egger ve 3 kg→3,45 cm rakamlarının birincil kaynakları.
