# H6 — Başlangıç kalori tahmini: Mifflin-St Jeor + aktivite katsayısı (literatür)

> Durum: **TAMAMLANDI** · 2026-09-29
> Kaynak önceliği: sistematik derleme / kılavuz > konsensüs raporu (FAO/WHO/UNU, NASEM) > tek çalışma > uygulayıcı konvansiyonu
> Bağlam: Güray'ın kuralı "maintenance formülle değil gözlemle bulunur" (`guray/G2-kilo-verme.md` K-8), başlangıç
> tahmini geçmiş beslenme + iş koluyla yapılır (K-9), beyan edilen kalori eksik sayılır (K-13). Bu dosya motorun
> **ilk gün** kullanacağı formül tohumunu ve o tohumun ne kadar yanılabileceğini belgeler. Formül yalnız başlangıçtır;
> gözlem gelince yerini gözleme bırakır.
> Doğrulama yöntemi: her sayı aşağıda URL'si verilen sayfada ya da özette açılıp okundu. PubMed/PMC sayfaları
> tarayıcı doğrulaması verdiği için özetler ve tam metinler Europe PMC REST API'sinden (aynı PMID/PMCID) okundu.

---

## A1 · Formül: Mifflin-St Jeor 1990

**Makale:** Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. *A new predictive equation for resting
energy expenditure in healthy individuals.* Am J Clin Nutr 1990;51(2):241-247. doi:10.1093/ajcn/51.2.241 · PMID 2305711.

**Örneklem:** 498 sağlıklı yetişkin: 247 kadın, 251 erkek; yaş 19-78 (ortalama 45 ± 14). 264 normal kilolu, 234 obez.
REE (resting energy expenditure) indirect calorimetry ile ölçüldü.

**Denklem (tek form, R² = 0,71):**
`REE = 9.99 × kilo(kg) + 6.25 × boy(cm) − 4.92 × yaş(yıl) + 166 × cinsiyet(erkek=1, kadın=0) − 161`

**Sadeleştirilmiş, cinsiyete ayrılmış form** (yazarlara göre öngörü gücü değişmiyor):
- Erkek: `REE = 10 × kg + 6.25 × cm − 5 × yaş + 5`
- Kadın: `REE = 10 × kg + 6.25 × cm − 5 × yaş − 161`

Birim kcal/gün. Makaledeki diğer bulgular:
- Göreli kilo ve yağ dağılımını eklemek öngörüyü anlamlı iyileştirmedi.
- Harris-Benedict (1919) ölçülen REE'yi **%5 fazla** tahmin etti (p < 0,01).
- En iyi tek öngörücü yağsız kütle (FFM): `REE = 19.7 × FFM + 413` (R² = 0,64). Yalnız kiloyla: `REE = 15.1 × kg + 371` (R² = 0,56).

**Dikkat — iki farklı katsayı seti dolaşıyor.** ADA/AND 2006 *Adult Weight Management* kılavuzu Mifflin'i
`9.99 × kg + 6.25 × cm − 4.92 × yaş + 5 / −161` diye basıyor (sadeleşmemiş eğim + sadeleşmiş sabit karışımı).
80 kg, 30 yaşında biri için iki form arasındaki fark ~3 kcal/gün; pratikte önemsiz. Motor, orijinal özetteki
sadeleştirilmiş formu (10 / 6.25 / 5) kullanmalı — kaynağı en net olan o.

→ https://pubmed.ncbi.nlm.nih.gov/2305711/ (özet Europe PMC üzerinden okundu: https://europepmc.org/article/MED/2305711)
→ https://doi.org/10.1093/ajcn/51.2.241
→ https://www.andeal.org/vault/pq32.pdf (AWM 2006 kılavuzu, s. "AWM: Determining Energy Needs")

**[GÜÇLÜ]** — denklem, örneklem ve katsayılar birincil kaynağın özetinden birebir doğrulandı.

---

## A2 · Doğruluk: Frankenfield 2005 sistematik derlemesi ve sonrası

**Makale:** Frankenfield D, Roth-Yousey L, Compher C. *Comparison of predictive equations for resting metabolic rate
in healthy nonobese and obese adults: a systematic review.* J Am Diet Assoc 2005;105(5):775-789.
doi:10.1016/j.jada.2005.02.005 · PMID 15883556.

**Özetten (birebir doğrulandı):**
- Klinikte en çok kullanılan dört denklem incelendi: Harris-Benedict, Mifflin-St Jeor, Owen, WHO/FAO/UNU.
- **Mifflin-St Jeor en güvenilir olanı:** hem obez olmayan hem obez bireylerde RMR'yi ölçülenin **±%10'u içinde**
  diğer tüm denklemlerden daha fazla kişide tahmin etti ve **en dar hata aralığına** sahipti.
- WHO/FAO/UNU denklemi için bireysel hatayı inceleyen doğrulama çalışması bulunamadı.
- Yaşlılar ve ABD'deki etnik azınlıklar hem denklem geliştirmede hem doğrulamada az temsil ediliyor.
- Sonuç cümlesi: Mifflin ±%10 içinde tahmin etmeye diğerlerinden daha yatkın, **ama bireye uygulandığında kayda
  değer hatalar ve sınırlılıklar var**; en iyi çözüm ölçmek (indirect calorimetry), tahmine ne zaman güvenileceği
  klinik yargıya bırakılmalı.

**Yüzdeler (obez / obez olmayan):**
- **Obez: %70 ±%10 içinde; hatalar en fazla %9 fazla, en fazla %21 eksik tahmin.** Kaynak: AND Evidence Analysis
  Library, AWM 2006 kılavuzu; öneri notu **"Strong, Conditional"** ("RMR ölçülemiyorsa, gerçek kiloyla Mifflin-St
  Jeor aşırı kilolu ve obezlerde en doğru tahmindir"). Aynı sayfada karşılaştırma: Harris-Benedict gerçek kiloyla
  obezlerin %39-64'ünü ±%10 içinde tuttu (hata: %43'e kadar fazla, %35'e kadar eksik); Owen %33-51.
  Kılavuzun kendi uyarısı: Mifflin beyaz ırk dışındaki gruplarda test edilmedi; obez/obez olmayanı ayıran
  araştırma sınırlı (9 çalışmadan yalnız 1'i ayırmış).
- **Obez olmayan: %82 ±%10 içinde.** Bu sayıyı birincil tam metinde açamadım (J Am Diet Assoc tam metni 403). İkincil
  hakemli kaynak doğruluyor: Ruiz ve ark. 2011 (PLoS One, PMC3167807) Frankenfield 2005'i kaynak göstererek
  "obez olmayan 18-78 yaş deneklerde %82 doğru tahmin" diyor. AND EAL arama özetinde "kalan %18'in %10'u fazla,
  %8'i eksik" kırılımı görünüyor ama sayfanın kendisi açılmadı → `[doğrulanmadı]`.

**Sonraki doğrulama — Frankenfield 2013** (Clin Nutr 32:976-982, doi:10.1016/j.clnu.2013.03.022): 337 ayaktan,
toplumda yaşayan yetişkin. Mifflin **yanlılıksız** (fark için %95 GA −26 ile +8 kcal/gün); diğer denklemlerin
çoğu fazla tahmin etti. ±%10 doğruluk oranı genelde **%82**; **obez olmayanlarda %87, obezlerde %75**. Sonuç:
Mifflin, farklı vücut boyutlarındaki ayaktan yetişkinler için yararlı bir denklem olarak doğrulandı.

**Sporcu / düzenli antrenman yapan alt grup — önemli uyarı.** O'Neill, Corish, Horner 2023 (Sports Med, sistematik
derleme + meta-analiz, 29 çalışma, 1430 sporcu): Mifflin sporcularda **ölçülen RMR'den anlamlı sapma** gösterdi
(p < 0,05) ve ±%10 kesinliği yalnız **%52,17** (6 çalışma, 414 kişi, ağırlıklı ortalama). En iyi denklem Ten-Haaf
2014 (%80,2). ten Haaf & Weijs 2014 (PLoS One, 90 rekreasyonel sporcu, haftada ~9 saat antrenman): Mifflin,
Harris-Benedict, WHO, Schofield ve Owen'ın **hepsi %50'nin altında** doğruluk verdi; gerekçe sporcularda yağsız
kütlenin yüksek olması. Sapmanın yönü (Mifflin sporcuda eksik mi fazla mı tahmin ediyor) meta-analizin metninde
tek cümleyle verilmiyor; alt çalışmalarda iki yön de var (bir kadın sporcu çalışmasında ~%15 fazla, triatlonda
~%5 eksik) → yön `[doğrulanmadı]`.

→ https://pubmed.ncbi.nlm.nih.gov/15883556/ (özet Europe PMC'den okundu)
→ https://www.andeal.org/template.cfm?template=guide_summary&key=621 · https://www.andeal.org/vault/pq32.pdf
→ https://europepmc.org/article/PMC/PMC3167807 (Ruiz ve ark. 2011, %82 atfı)
→ https://pubmed.ncbi.nlm.nih.gov/23631843/ (Frankenfield 2013)
→ https://europepmc.org/article/PMC/PMC10687135 (O'Neill ve ark. 2023)
→ https://europepmc.org/article/PMC/PMC4183531 (ten Haaf & Weijs 2014)

**[GÜÇLÜ]** genel yetişkin nüfusu için (sistematik derleme + kılavuz "Strong" + bağımsız doğrulama).
**[ORTA]** antrenman yapan kullanıcı için — hedef kitlemiz tam da burası ve orada Mifflin yarı yarıya ıskalıyor.

---

## A3 · Aktivite katsayıları: hangi sayı nereden geliyor

Motorda "aktivite katsayısı" dediğimiz şey literatürde **PAL** (physical activity level) = TEE / BMR (24 saatlik
toplam harcamanın bazal harcamaya oranı). Üç ayrı set dolaşıyor; kaynakları farklı:

### (a) FAO/WHO/UNU 2001 uzman danışma raporu (yayın 2004) — *Human energy requirements*, Tablo 5.3
| Kategori | PAL |
|---|---|
| Sedentary or light activity lifestyle | **1.40-1.69** |
| Active or moderately active lifestyle | **1.70-1.99** |
| Vigorous or vigorously active lifestyle | **2.00-2.40** (2,40 üstü uzun süre sürdürülemez) |

Aynı rapordan:
- Serbest yaşayan yetişkin nüfusların uzun süre sürdürebildiği PAL aralığı ~**1,40-2,40**.
- 411 kişilik (18-64 yaş) meta-analizde (Black ve ark. 1996, "ağırlıklı olarak sedanter Batılı yaşam") PAL'in
  modal değeri **1,60** (aralık 1,55-1,65), kadın ve erkek için aynı. IOTF paneli sedanter için 1,50-1,55 önermiş.
- PAL 1,40 "sedanter aralığın alt sınırı"; rapor bunu yalnız kısa süreli kriz/yardım durumları için uygun görüyor.
- Kategori orta noktası etrafındaki varyasyon **±%8 ile ±%10** (ör. orta aktif = 1,85 ± %8).
- **Bireye uygulama uyarısı (birebir anlam):** bu gereksinimler nüfus grupları içindir, bireyler için değil; bir
  kişinin gereksinimi o kişinin gerçek TEE'sine ya da BMR'sine veya alışkanlık aktivitesini hesaba katan tahminlere
  dayanmalıdır.

### (b) IOM 2002/2005 DRI (Dietary Reference Intakes) — eski ABD/Kanada seti
Sedentary **1,0 ≤ PAL < 1,4** · Low active **1,4-1,6** · Active **1,6-1,9** · Very active **1,9-2,5**.
Bu set, IOM denklemlerinde PAL'in kendisi değil ayrı bir "PA katsayısı" ile kullanılıyor (ör. erkek 1,00 / 1,12 /
1,27 / 1,54) — yani **Mifflin ile doğrudan çarpılacak bir sayı değil.** Doğrulama ikincil kaynaktan: Gerrior ve
ark. 2006, Prev Chronic Dis (CDC), IOM denklemlerini adım adım veriyor.

### (c) NASEM 2023 DRI for Energy — güncel ABD/Kanada seti (DLW verisiyle yenilendi)
Dört kategori, DLW çalışmalarındaki PAL dağılımının yaklaşık çeyreklerine göre:
| Kategori | PAL aralığı | Tablo 7-1'deki tipik değer |
|---|---|---|
| Inactive | 1,0 ≤ PAL < 1,53 | ~1,4 (yalnız günlük yaşam aktivitesi) |
| Low active | 1,53 ≤ PAL < 1,68 | ~1,6 (+60-80 dk yürüyüş) |
| Active | 1,68 ≤ PAL < 1,85 | ~1,75 |
| Very active | 1,85 ≤ PAL < 2,50 | ~2,05 |
Raporun uygulama adımı 2, birebir anlamıyla: **bireyin gerçek enerji gereksinimi EER'den önemli ölçüde farklı
olabileceği için vücut ağırlığını zaman içinde izle ve alımı gerektiği gibi ayarla.** Rapor ayrıca bireyin beyan
ettiği alımı hesaplanan harcamayla kıyaslamanın, beyan yanlılığı yüzünden işe yaramadığını söylüyor (K-13 ile aynı yön).

### (d) Popüler set: 1,2 / 1,375 / 1,55 / 1,725 / 1,9 — **kaynağı zayıf**
Hesaplayıcıların neredeyse hepsinde bu set var (sedentary / light 1-3 gün / moderate 3-5 gün / very active 6-7 gün
/ extra active). **Birincil hakemli bir yayında tanımlandığını bulamadım.**
- Mifflin 1990 özetinde aktivite katsayısı **yok** (bazı web sitelerinin "Mifflin 1990 bu katsayıları getirdi"
  iddiası özetle çelişiyor; yanlış).
- FAO/WHO/UNU ve NASEM setlerinde **1,2 yok**; FAO'nun en düşük sürdürülebilir PAL'i 1,40, DLW'de sedanter Batılı
  modal değer 1,60. Yani **1,2, ölçülmüş serbest yaşam PAL'inin altında** — sedanter biri için TEE'yi sistematik
  olarak düşük tahmin etmeye yatkın (bu çıkarım benim; iki kaynağın karşılaştırmasından).
- Fitness kaynaklarında "Katch-McArdle ölçeği" diye anılıyor, McArdle/Katch/Katch *Exercise Physiology* ders
  kitabına atfediliyor; bu atfı kitabın kendisinde doğrulayamadım → `[doğrulanmadı]`. Bir hesaplayıcı sitesi
  (iforgeapps) açıkça "tek bir birincil yayın bunları tanımlamıyor" diyor — bu bir itiraf, kaynak değil.

→ https://www.fao.org/4/y5686e/y5686e07.htm (Bölüm 5, Tablo 5.3, Black 1996 modal PAL)
→ https://www.fao.org/4/y5686e/y5686e08.htm (±%8-10 varyasyon, "bireye değil nüfusa" uyarısı)
→ https://nap.nationalacademies.org/resource/26818/DRIs_for_Energy_Highlights.pdf (NASEM 2023, Tablo 7-1 + adım 2)
→ https://europepmc.org/article/PMC/PMC1784117 (Gerrior ve ark. 2006, IOM 2002 PAL/PA değerleri)
→ https://iforgeapps.com/tools/tdee-calculator/ (yalnız "provenans belirsiz" itirafı için; kaynak değildir)

**[ORTA]** FAO/WHO/UNU ve NASEM PAL kategorileri için (konsensüs raporu, DLW temelli; ama nüfus düzeyi, bireysel
değil). **[ZAYIF]** 1,2-1,9 popüler seti için (birincil kaynak yok, alt ucu DLW verisiyle çelişiyor).
Ek uyarı: FAO ve NASEM'de PAL'in paydası **kendi BMR/BEE denklemleri** (FAO: Schofield tipi; NASEM: kendi
denklemleri); Mifflin **REE** tahmin ediyor. Mifflin × PAL çarpımı pratikte yaygın ama literatürde bu ikiliyi
birlikte doğrulayan çalışma bulmadım → karışım bir yaklaşıklıktır.

---

## A4 · Bireysel hata ve gözlemin formülün yerini alması

**Formülün bireydeki hatası — iki kaynaktan birikir:**
1. **RMR tahmini:** Mifflin genel nüfusta ~5 kişiden 1'ini ±%10 dışında bırakıyor (%82 içeride; obezde %70-75).
   Obezde tek yönde **%21'e kadar eksik** tahmin görülmüş (AND EAL). Sporcuda ±%10 içinde kalan ~%52.
2. **PAL seçimi:** FAO'ya göre doğru kategori seçilse bile orta nokta ±%8-10 oynuyor; yanlış kategori seçimi bunun
   üstüne biner.
Kaba birleşik büyüklük (benim hesabım, kaynak değil): ±%10 RMR ve ±%9 PAL bağımsız kabul edilirse TEE'de ~±%13;
2500 kcal'lik biri için **~±330 kcal/gün**. Güray'ın "hesap usulü çalışmaz" (K-8) ve "birkaç hafta yanılmak normal"
(K-10) kuralları bu büyüklükle uyumlu.

**Kilo izleyerek gerçek harcamayı çıkarmak — literatür bunu destekliyor:**
- **NASEM 2023:** bireyde EER yalnız başlangıçtır; kilo zaman içinde izlenir, alım buna göre ayarlanır (A3-c).
- **FAO/WHO/UNU:** bireyin gereksinimi onun gerçek TEE'sine dayanmalı (A3-a).
- **Thomas ve ark. 2010** (Am J Clin Nutr, PMC2980958): yalnız tekrarlı kilo verisi + başlangıç demografisi alan bir
  enerji dengesi modeliyle bireyin alımı hesaplandı. Yiyecek sağlanan dönemde model hatası 0-4. hafta **41 ± 118
  kcal/gün**, 4-12. hafta **−22 ± 230 kcal/gün**; DLW+DXA ile kıyasta −71 ± 272 ve −48 ± 226 kcal/gün. Ortalama hata
  hiçbir kıyasta sıfırdan anlamlı farklı değil.
- **Sanghvi ve ark. 2015** (Am J Clin Nutr, PMC4515869, CALERIE, 140 kişi, 2 yıl): yalnız kilo verisi kullanan
  model, alım değişimini DLW/DXA yöntemine göre ortalamada **40 kcal/gün** içinde buldu; bireyde RMS sapma **215
  kcal/gün**, çoğu değer **132 kcal/gün** içinde.
- Yani uzun pencerede kilodan çıkarılan harcama, formülün ~±300 kcal'lik bireysel hatasıyla aynı ya da daha iyi
  düzeyde; pencere kısaldıkça gürültü artıyor (0-4 hafta SD 118 → farklı kriterle 226-272).

**Pencere uzunluğunu belirleyen gürültü kaynakları:**
- **Haftalık ritim:** Orsama ve ark. 2014 (Obes Facts, 80 kişi, 4657 ölçüm): kilo pazar-pazartesi yüksek, hafta içi
  düşüyor; artış cumartesi, düşüş salı başlıyor. Turicchi ve ark. 2020 (PLoS One, NoHoW, 1421 kişi): hafta içi
  dalgalanma **%0,35** (80 kg'da ~0,28 kg). → Pencere **tam hafta katı** olmalı, yoksa hafta sonu şişkinliği trendi
  bozar.
- **Kilo → kalori dönüşümü sabit değil:** Hall 2008 (Int J Obes, PMC2376744): "3500 kcal/lb" (= 32,2 MJ/kg ≈ 7700
  kcal/kg) kuralı yalnız başlangıç yağ kütlesi ~30 kg üstü obezlerde tutuyor; daha zayıf kişilerde kilo başına
  gereken açığı **fazla tahmin ediyor**. Motor gözlemden kalori çıkarırken 7700'ü sabit kullanırsa zayıf
  kullanıcıda düzeltmeyi abartır. Güray'ın yöntemi (K-8: "kilo sabitse maintenance budur") bu dönüşüme hiç
  ihtiyaç duymadığı için bu riski taşımıyor — önemli bir artı.
- **Beyan yanlılığı (K-13):** Gözlemlenen maintenance, kullanıcının *kaydettiği* kalori cinsinden çıkar. Kişi
  sistematik 500 kcal eksik sayıyorsa, "kilo sabit iken kaydedilen 2300" onun işlevsel maintenance'ıdır; açık bu
  sayı üzerinden verilir ve yanlılık kendiliğinden sönümlenir. Formül ise gerçek kaloriyi tahmin eder ve bu
  yanlılığı hiç görmez. Bu, gözlemin formülü neden yenmesi gerektiğinin en güçlü pratik gerekçesi (benim çıkarımım;
  yanlılık sabit kaldığı sürece geçerli).

→ https://nap.nationalacademies.org/resource/26818/DRIs_for_Energy_Highlights.pdf
→ https://europepmc.org/article/PMC/PMC2980958 (Thomas 2010)
→ https://europepmc.org/article/PMC/PMC4515869 (Sanghvi 2015)
→ https://europepmc.org/article/PMC/PMC5644907 (Orsama 2014)
→ https://europepmc.org/article/PMC/PMC7192384 (Turicchi 2020)
→ https://europepmc.org/article/PMC/PMC2376744 (Hall 2008)

**[ORTA]** — "formül bireyde ~±%10-15 yanılır, kilo izlemesi düzeltir" kısmı güçlü (kılavuz + iki model doğrulama
çalışması); **"kaç gün yeter"** sorusuna doğrudan cevap veren çalışma bulamadım, pencere uzunluğu çıkarım.

---

## A5 · Cinsiyet ve yaş notları

- **Mifflin'de kadın için tek fark sabit terim:** birleşik formda `+166 × cinsiyet − 161` → erkek +5, kadın −161.
  Kilo, boy ve yaş eğimleri iki cinsiyette **aynı**. Yazarlara göre cinsiyete ayırmak ve sadeleştirmek öngörüyü
  bozmadı. Başka bir kadın düzeltmesi Mifflin'de **yok**.
- **Doğruluk kadınlarda da aynı sınırlar içinde değil:** O'Neill 2023 kadın sporcularda bir çalışmada Mifflin'in RMR'yi
  ~%15 fazla tahmin ettiğini aktarıyor; meta-analiz De Lorenzo ve Harris-Benedict'te cinsiyet farkı buldu; FAO, Owen,
  Mifflin, Cunningham ve Ten-Haaf için "cinsiyet doğruluğu etkilemiyor gibi görünüyor" diyor. Yani Mifflin'in
  kadında ayrıca bozulduğuna dair meta-analitik işaret yok; ~%15'lik sapma tek çalışma.
- **Adet döngüsü:** Hurtová ve ark. 2026 (Front Physiol, sistematik derleme, 7 çalışma): luteal fazda RMR artışı
  ~**30-120 kcal/gün** (~%3-5); günlük biyolojik değişkenlik ve ölçüm hatasıyla örtüşecek kadar küçük. Motor için
  anlamı: başlangıç formülüne döngü düzeltmesi **eklenmez**; döngü, kilo gözlem penceresinde su dalgalanması olarak
  gürültüye katkı yapar (bu J1'in konusu).
- **Menopoz:** Mifflin'de menopoz terimi **yok**; yaş terimi (−5 kcal/yıl) yaşla düşüşü genel olarak taşıyor. Lovejoy
  ve ark. 2008 (Int J Obes, 156 kadın, 4 yıl izlem, 34'ünde oda kalorimetresi): uyku sırası enerji harcamasındaki
  düşüş menopoza girenlerde premenopozda kalanlara göre **1,5 kat** (−%7,9'a karşı −%5,3); yağ oksidasyonu **%32**
  düştü; fiziksel aktivite menopozdan **2 yıl önce** anlamlı düştü. Yani menopozdaki düşüşün bir kısmı yaş
  teriminin ötesinde ve bir kısmı aktivite (PAL) kaynaklı. Mifflin'in postmenopozal kadınlarda ayrıca doğrulandığı
  bir çalışma bulmadım; Mifflin 1990 örneklemi 19-78 yaş kadınları içeriyor ama menopoz durumu özette yok.
  Motor için anlamı: formüle menopoz katsayısı eklemeye yetecek kanıt yok; hızlı gözlem düzeltmesi zaten bunu yakalar.

→ https://pubmed.ncbi.nlm.nih.gov/2305711/ (cinsiyet terimi)
→ https://europepmc.org/article/PMC/PMC10687135 (O'Neill 2023)
→ https://europepmc.org/article/PMC/PMC13066135 (Hurtová 2026)
→ https://europepmc.org/article/PMC/PMC2748330 (Lovejoy 2008)

**[GÜÇLÜ]** "Mifflin'de kadın farkı yalnız sabit terim" için (birincil kaynak). **[ZAYIF]** menopoz ve kadın
sporcuya özgü sapma için (tek çalışmalar, formül düzeltmesi önerecek kanıt yok).

---

## Motor için öneri

Bu bölüm önerdir; ürün kararları (hangi soru sorulur, kaç seçenek) Levent'te.

| Parametre | Önerilen değer | Gerekçe |
|---|---|---|
| RMR formülü | Mifflin-St Jeor, **sadeleştirilmiş** form: `10·kg + 6.25·cm − 5·yaş + s` | A1; en geniş doğrulama (A2) |
| `s` (cinsiyet sabiti) | erkek **+5**, kadın **−161** | A1, A5 |
| Kilo girdisi | **gerçek** (şu anki) kilo, ideal/düzeltilmiş kilo değil | AND EAL AWM: "actual weight" (A2) |
| Aktivite kategorileri | NASEM 2023 tipik değerleri: **1,4 / 1,6 / 1,75 / 2,05** | Ölçülmüş (DLW) PAL dağılımına dayanan en güncel set (A3-c); 1,2-1,9 setinin kaynağı yok ve alt ucu gerçekçi değil (A3-d) |
| Varsayılan katsayı (bilgi yoksa) | **1,6** | DLW'de sedanter Batılı modal PAL 1,60 (Black 1996, FAO); NASEM "low active" tipik değeri 1,6. Kitlemiz direnç antrenmanı yapıyor, "inactive" (1,4) büyük olasılıkla düşük kalır |
| Antrenman yapan + fiziksel işi olan | 1,75; ağır fiziksel iş + antrenman 2,05 | NASEM Tablo 7-1 örnekleri |
| Başlangıç tahmininin önceliği | K-9'daki **geçmiş beslenme** varsa o, formül yalnız yoksa ya da mantık denetimi (sanity check) için | Güray K-9 (U14: çelişkide Güray kazanır); NASEM beyan edilen alımın yanlı olduğunu da söylüyor → geçmiş beslenme beyanına K-13 düzeltmesi uygulanır |
| Formül tahmini aralık olarak | **±%15** bant (ör. 2500 → 2125-2875) | A4 kaba birleşik hata ~±%13; U5 "tahmin daima aralık" |
| Gözlemin formülü değiştirmesi | **14 gün** (mevcut `maintenance_observation_days: 14` ile aynı) | Güray K-8 "1-2 hafta"; haftalık ritim yüzünden tam hafta katı gerekli (A4); 14 gün = iki tam haftalık döngü. Kilo sabitse **gözlem tamamen yerini alır**, harmanlama (blend) yok — K-8 "gözlem kazanır" |
| Kilo sabit değilse | Gözlem penceresi uzar; kalori kilo yönüne göre ayarlanır (G2 K-8 tablosu) — **kilo→kcal için sabit 7700 kullanılmaz** ya da kullanılırsa zayıf kişide fazla düzelttiği bilinerek | Hall 2008 (A4) |
| Taban | Diyet kalorisi hesaplanan RMR'nin altına inmez | Güray K-11; RMR burada Mifflin |

Açık bıraktığım iki nokta (kanıt yok, karar gerekiyor):
1. 14 günlük pencerede **en az kaç tartım** gerektiği — literatürde doğrudan cevap bulamadım. Makul bir başlangıç
   "her hafta en az 4 tartım" olabilir ama bu `[tecrübe/uydurma riski]`; parametre dosyasına konursa kaynaksız kalır.
2. Aktivite sorusunun kaç seçenekli olacağı ve nasıl sorulacağı — ürün kararı.

---

## Doğrulanamayanlar

- **Frankenfield 2005'te obez olmayanlar için %82 ve hata kırılımı (%10 fazla / %8 eksik):** birincil tam metin 403
  verdi. %82 hakemli ikincil kaynakta (Ruiz 2011, PLoS One) Frankenfield 2005'e atıfla doğrulandı; hata kırılımı
  yalnız arama özetinde görüldü, sayfa açılmadı → `[doğrulanmadı]`.
- **1,2 / 1,375 / 1,55 / 1,725 / 1,9 setinin kökeni:** hakemli birincil kaynak bulunamadı. McArdle/Katch/Katch
  ders kitabı atfı doğrulanamadı. "Mifflin 1990 bu katsayıları getirdi" iddiası özetle çelişiyor (özette katsayı yok).
- **Mifflin 1990 tam metni:** yalnız özet okundu. Kadınların menopoz durumu, etnik dağılım ve bireysel hata dağılımı
  tam metinde olabilir; açılmadı.
- **NASEM 2023 tam raporundaki EER bireysel tahmin hatası (SEE / tahmin aralığı, kcal):** NCBI Bookshelf sayfası
  tarayıcı doğrulamasına takıldı; yalnız 4 sayfalık "Highlights" PDF'i okundu.
- **IOM 2002/2005 orijinal raporu:** PAL aralıkları yalnız ikincil kaynaktan (Gerrior 2006, CDC) doğrulandı.
- **Thomas ve ark. 2014** (*Time to correctly predict the amount of weight loss with dieting*, J Acad Nutr Diet,
  PMC4035446): gözlem penceresi süresine doğrudan cevap verebilecek çalışma; PMC sayfası tarayıcı doğrulaması verdi,
  Europe PMC'de özet boş → içerik `[doğrulanmadı]`.
- **Mifflin'in sporcularda sapma yönü:** O'Neill 2023 anlamlı sapma olduğunu söylüyor, yönünü forest plot'ta veriyor;
  grafiği okuyamadım.
- **Mifflin × PAL karışımının doğrulaması:** FAO ve NASEM PAL'leri kendi BMR/BEE denklemlerine göre tanımlı;
  Mifflin REE'siyle çarpımını doğrulayan çalışma bulmadım.
- **Uyarlamalı TDEE uygulamalarının (ör. MacroFactor) yöntemi:** hakemli yayın değil; bu dosyada kullanılmadı.
