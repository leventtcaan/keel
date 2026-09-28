# C — "AI Koç" İddiası vs Gerçek + İnsan Koçluk İş Akışı

> Araştırma tarihi: 2026-09-08
> Kapsam: (A) "AI coach" iddiasındaki uygulamalar, (B) insan koçluk platformları ve iş akışı, (C) kritik sorular
> **Metodoloji notu:** Oturumun web arama kotası (200 WebSearch) araştırmanın ortasında doldu. ~25 arama +
> ~40 doğrudan sayfa çekme (WebFetch) ile toplandı. Reddit ve DuckDuckGo/Mojeek bot doğrulaması nedeniyle
> erişilemedi — Reddit'ten **birincil veri toplanamadı**, bu bir eksik. Nicel kullanım verisi için KFF ve
> Pew anketleri kullanıldı.
> **Kural:** Kaynaksız iddia yok. "Bulunamadı" yazan yerler gerçekten bulunamadı.

---

## 0. TL;DR — Üç cümlelik gerçeklik

1. **Gerçek LLM koçu sayısı çok az.** Sektörün büyük çoğunluğu (Fitbod, Dr. Muscle, JuggernautAI,
   TrainerRoad, Athletica, Runna, RP) klasik ML + kural tabanlı autoregulation motoru; "AI" kelimesi
   pazarlama katmanı. Gerçek LLM/agent olan: WHOOP Coach, Oura Advisor, Fitbit/Google Coach,
   Freeletics Coach+, ve YC kuşağı startuplar (HYBRD, Amby, Nori).
2. **LLM olanlar bile "koç" değil, "veri açıklayıcı."** Yayınlanmış eleştiri ve akademik değerlendirme
   ortak sonuç veriyor: genel geçer tavsiye, karar vermekten kaçınma, ve baskı altında görüş değiştirme
   (sycophancy). MedPRESS benchmark'ında modeller **ilk turda %84.3 güvenli tavsiye veriyor, kullanıcı
   bir kez itiraz edince %19.9'a düşüyor.**
3. **Kopyalanacak şey model değil, iş akışı.** İnsan koçun haftalık check-in protokolü (7 günlük ortalama
   kilo + biofeedback 1-10 + adım + antrenman logu + 2-4 haftada foto → tek bir kaldıraç değiştir)
   son derece standart, dokümante ve şu an hiçbir AI uygulaması tarafından uçtan uca uygulanmıyor.

---

# A) "AI KOÇ" İDDİASINDAKİ UYGULAMALAR

## A.0 — Sınıflandırma tablosu: AI iddiası vs gerçek

Sınıflar: **(a)** sadece pazarlama etiketi · **(b)** kural tabanlı motor · **(c)** klasik ML/regresyon ·
**(d)** gerçek LLM/agent

| Uygulama | İddia | **Gerçekte ne** | Sınıf | Model / kanıt |
|---|---|---|---|---|
| **WHOOP Coach** | "AI coach powered by OpenAI" | Gerçek LLM chat + tool use + memory agent + eval framework. Şirket mühendislik blogunda model geçişini, eval sayılarını, cache hit oranını yayınlıyor. | **d** (en olgun) | GPT-4 → GPT-4.1 → **GPT-5.1**; 4.000+ test case, %10 A/B rollout ([WHOOP Eng.](https://engineering.prod.whoop.com/gpt-5-1-whoop-results/)) |
| **Oura Advisor** | "AI-powered health companion" | LLM tabanlı sohbet + kendi verisi üzerinde bağlam. 2026'da kadın sağlığı için **kendi proprietary LLM'i**. | **d** | Genel Advisor: LLM (sağlayıcı açıklanmamış). Kadın sağlığı modeli Oura altyapısında ([Oura](https://ouraring.com/blog/womens-health-ai-model/)) |
| **Fitbit / Google Personal Health Coach** | "personal health coach built with Gemini" | Gemini tabanlı; plan üretir, uyku koçluğu, soru-cevap. Arkasında Nature Medicine'de yayınlanmış PH-LLM araştırması var. | **d** | Gemini; PH-LLM ([Google](https://blog.google/products-and-platforms/devices/fitbit/fitbit-ai-personal-health-coach-preview/), [arXiv 2406.06474](https://arxiv.org/abs/2406.06474)) |
| **Freeletics Coach+** | "generative AI personal trainer" | Eski ML motoru (clustering + kullanıcı benzerliği) **üstüne** LLM diyalog katmanı eklendi. LLM sağlayıcısı açıklanmıyor. | **c + d** | ([Fitt Insider PR](https://insider.fitt.co/press-release/freeletics-unveils-a-new-era-in-digital-fitness-with-the-launch-of-coach/)) |
| **Eight Sleep Autopilot** | "AI-powered sleep system" | Biyometrik → çevre kontrolü (sıcaklık, yükseklik, ses). Klasik ML/kontrol. LLM ayrı bir ürün olarak ("Sleep Agent") **geliyor**, henüz kanıtı yok. | **c** (+d yolda) | 10M saat uyku verisi iddiası ([BusinessWire](https://www.businesswire.com/news/home/20250514085532/en/)) |
| **Fitbod** | "AI knows when you should lift heavier" | İki motor: Exercise Selector + Capability Recommender. Kas yorgunluğu decay modeli (24-72s), Epley formülü ile 1RM tahmini, regresyon. **LLM yok** — kendi blogları da bahsetmiyor. | **b + c** | 400M+ loglanmış antrenman ([Fitbod](https://fitbod.me/blog/fitbod-algorithm/)) |
| **Dr. Muscle** | "AI personal trainer" | 1RM takibi + otomatik deload (%10 düşüş) + daily undulating periodization + RPE tabanlı yük ayarı. **LLM veya foto analizi kanıtı bulunamadı.** | **b** | ([dr-muscle.com](https://dr-muscle.com/building-muscle/)) |
| **JuggernautAI** | "AI powerlifting coach" | RPE tabanlı autoregulation: hedef RPE ver → gerçekleşen RPE'yi oku → sonraki seansın yükünü yeniden hesapla. Bu bir formül, LLM değil. | **b** | ([review](https://aitoolsbakery.com/blog/juggernautai-review/)) |
| **TrainerRoad** (AI FTP Detection / Red Light Green Light) | "machine learning" | **Dürüst ML.** 150M+ ride veri setinde eğitilmiş, 1.200 iterasyon, 22.000 sporcuda 9 ay validasyon. Fatigue tahmini + FTP tahmini. LLM yok, iddia da etmiyor. | **c** | ([TrainerRoad blog](https://www.trainerroad.com/blog/ftp-testing-is-a-thing-of-the-past-introducing-ai-ftp-detection/)) |
| **Athletica.ai** | "AI coaching" | Critical Power / Critical Pace fizyoloji modeli + "bir tutam modern ML". Kurucular gerçek sporbilimci (Paul Laursen, 200+ makale). Şeffaf formül. | **b + c** | ([Athletica](https://athletica.ai/about-ai-coaching-training)) |
| **Runna** | Basında "AI-based coaching" | **Kendi feature sayfasında AI/LLM'den hiç bahsetmiyor.** "World-class coaches" tarafından yazılmış plan şablonları + performansa göre uyarlama. AI etiketi büyük ölçüde dışarıdan yapıştırılmış. | **a + b** | ([Runna features](https://www.runna.com/features)) — Strava tarafından Nisan 2025'te satın alındı ([PR](https://press.strava.com/articles/strava-to-acquire-runna-a-leading-running-training-app)) |
| **Zing Coach** | "AI-powered fitness coach", "Body Scan" | Computer vision form takibi + foto tabanlı body scan + bir sohbet botu. **Methodology sayfasında hiçbir model, algoritma veya validasyon verisi yok** — sadece 5 danışman ismi. | **a + b** (CV kısmı gerçek) | ([Zing methodology](https://www.zing.coach/methodology)) |
| **Peloton IQ** | "AI-powered" | Computer vision: rep sayma, form geri bildirimi, ağırlık önerisi + kural tabanlı haftalık plan. **Konuşan AI yok** (kendi sayfası doğruluyor). Donanıma bağlı (Bike+/Tread+/Row+). | **b** (CV gerçek) | 1 Ekim 2025 duyuru ([Peloton IQ](https://www.onepeloton.com/peloton-iq)) |
| **Kemtai** | "AI computer vision" | 111 nokta pose estimation, gerçek zamanlı form/ROM geri bildirimi. Fizyoterapi/klinik pazara satıyor. CV gerçek, "koçluk" iddiası yok. | **c** (CV) | ([Kemtai](https://kemtai.com/product/computer-vision-rehab/)) |
| **Ultrahuman** | "actionable interventions" | Kendi ana sayfasında LLM/konuşan koç iddiası **yok**. Ring + CGM + Blood Vision (100+ marker) → algoritmik öneri. | **b** | ([ultrahuman.com](https://www.ultrahuman.com/)) |
| **Aaptiv** | "Aaptiv Coach, AI-enabled trainer" | PEAR Health Labs 2021'de satın aldı; "proprietary algorithm" deniyor, teknik detay yok. Şirket B2B/Medicare tarafına kaydı. | **a** | ([Aaptiv](https://aaptiv.com/about/)) |
| **FitnessAI** | "AI workout app" | **Fiilen ölü.** 2020'de Jumpers Fitness tarafından satın alındı, $369K toplam fon, 2 çalışan. | **a** | ([Tracxn](https://tracxn.com/d/companies/fitnessai/__qKXTCZeqazNkOW2phYV5QaW1k08TISdQBxgmwZHJMEA)) |
| **Vi Trainer** | "AI voice running coach" | **Ölü.** vitrainer.com DNS çözülmüyor (2026-09-08 kontrol). | — | doğrudan kontrol |
| **Gymbuddy AI** | — | **Yeterli birincil kaynak bulunamadı.** Arama kotası nedeniyle doğrulanamadı. | ? | bulunamadı |

### Yeni kuşak (YC 2025-2026) — gerçekten LLM/agent olanlar

| Startup | Ne yapıyor | Kanıt |
|---|---|---|
| **HYBRD** (Boston, YC) | "Agentic coaching for athletes". Wearable verisini birleştirir, Alex Viada metodolojisi üstüne LLM agent ("HYBRD Brain") plan yeniden yapılandırır — seyahat, sakatlık, hava durumu. Kendi benchmark'ını yayınladı: **FitBench** (25 senaryo × bilimsel doğruluk / güvenlik / uygulanabilirlik / özlük), jüri olarak Opus 4.6. CSCS sınavında %77 (geçme eşiği %70). | ([YC Launch](https://www.ycombinator.com/launches/QAV-hybrd-agentic-coaching-for-athletes)) |
| **Amby Health** (YC) | **Proaktif SMS koçu.** Strava/Garmin/Apple Health okur, kendi kendine mesaj atar, check-in yapar. Acute (7g) vs chronic (28g) yük karşılaştırması. Guardrail açıkça yazılı: *"nothing is saved, shared, or changed until you say so."* Şu an davetiye ile pilot. | ([tryamby.com](https://www.tryamby.com/)) |
| **Nori** (NY, YC F25) | Apple Health + Oura + Whoop + Garmin + Peloton + tıbbi kayıt → tek AI sağlık koçu, "vücudunun hafızasını kurar". Kurucular önceki şirketlerini Spotify'a satmış. DAU +%65 MoM iddiası. | ([YC](https://www.ycombinator.com/companies/nori)) |
| **Deep24**, **Fitia** | Sırasıyla "tüm veri kaynaklarını senkronize eden koç" ve AI öğün planlama. Detay doğrulanamadı. | ([YC listing](https://www.ycombinator.com/companies/industry/consumer-health-and-wellness)) |

**Sektör para akışı:** 2026 H1'de fitness/wellness startuplarına **$3.6 milyar** yatırım — 2025'in ~1/3 üstünde
bir tempo. Yatırımcı teması net: donanım değil, *"veri toplayan ve kullanıcıyı AI ile koçlayan"* platformlar.
WHOOP $575M Series G (Mart 2026), Eight Sleep $50M Series D, Ultrahuman ~$44M Series C.
([Crunchbase News](https://news.crunchbase.com/health-wellness-biotech/fitness-startup-funding-rebounding-ai-data-h1-2026/))

---

## A.1 — WHOOP: sektördeki tek şeffaf mühendislik kaydı

Levent için en önemli vaka çalışması. WHOOP mühendislik blogu, bir LLM koçunun gerçekte neye benzediğini
açık açık yazıyor:

- **Model seçimi ölçüyle yapılıyor.** GPT-5 çıktığında WHOOP'un `minimal` reasoning modunda GPT-4.1'in
  altında kaldığını buldular, OpenAI'a geri bildirdiler, OpenAI `none` reasoning modlu GPT-5.1 çıkardı.
  Geçiş sonuçları: medyan yanıt süresi **1.53s → 0.98s**, veri temelli yanıt oranı **%42.6 → %56.6**,
  answer relevance **0.58 → 0.63**, kullanıcı olumlu geri bildirimi **+%24**, token maliyeti **-%42**
  (cache hit +%50). Takas: precision hafif düştü (0.28 → 0.25), yanıtlar ortalama +96 kelime uzadı.
  ([kaynak](https://engineering.prod.whoop.com/gpt-5-1-whoop-results/))
- **Eval olmadan hiçbir şey shiplenmiyor.** 4.000+ test case, %10 production A/B, sonra %100.
- **Agent'lar sessizce bozuluyor.** Memory agent'ları başta *"her etkileşimde"* hafıza kaydediyordu ve
  yalnızca **%8.1**'i bitiş tarihi içeriyordu → hafızalar hiç expire olmuyordu. Daha kötüsü: prompt
  düzeltmeleri "iyileşme gibi hissettiriyordu ama veri tersini gösterdi" — eval olmasa sessiz regresyon
  ship edilecekti. ([kaynak](https://engineering.prod.whoop.com/ai-evaluation-framework/))
- **Kırmızı çizgi:** *"An Agent that gives great answers but leaks member data or ignores safety
  boundaries doesn't ship. Period."*
- Prompt'ları kod içinde hardcode etmeyi bırakıp **HPML** (Hyper Prompt Markup Language) adında bir
  templating dili yazmışlar (Nisan 2026).

**Ama:** WHOOP Coach'un kullanıcı tarafındaki eleştirisi sert. Simson Garfinkel'in analizinde:
sabah 07:00'deki kalori yakımını 7 günlük ortalamayla kıyaslayıp anlamsız sonuç üretmesi ("bonkers
off-base"); *"çok mu fazla kaldırıyorum"* sorusuna *"vücudunu dinle"* cevabı; ve maksimum kalp atışının
%70-80'inde 14 dakikanın "aerobik fitness için harika" olduğu tespitinin **basit bir Python scriptiyle
üretilebileceği**. Sonuç cümlesi: LLM'ler "insight'tan yoksun", çıktı "vapid and non-committal".
([LinkedIn analizi](https://www.linkedin.com/pulse/whoops-ai-llm-coach-simson-garfinkel-cyfwe))

> **Ders:** Dünyanın en olgun tüketici LLM koçu bile, "veriyi özetleyen" ile "karar veren" arasındaki
> çizgiyi geçemiyor. Geçmemesinin sebebi teknik değil — **sorumluluk (liability)**.

---

# B) İNSAN KOÇLUK PLATFORMLARI — asıl kopyalanacak iş akışı

## B.1 — Fiyat haritası (2026)

| Servis | Fiyat | Model |
|---|---|---|
| **Future** | **$199/ay** (yıllık ~$149/ay) | 1:1 gerçek koç, haftalık program, günlük mesaj/video, başlangıçta FaceTime |
| **Caliber** | Standard ~$50/ay → Premium **$200+/ay** | Kademeli: program-only'den aylık video görüşmeli 1:1'e |
| **RP 1:1 Coaching** | **$349.99/ay** (Essentials) — **$599.99/ay** (Full Access) | Haftada 2-3 e-posta check-in; Full Access'te haftalık 20 dk video + SMS; min. 3 ay |
| **Stronger U** | $159/ay (haftalık check-in) / $119 (2 haftada) / $99 (aylık) | Beslenme koçluğu. **31 Mart 2026'da kapandı** ([duyuru](https://strongeru.com/services/)) |
| **Ladder** | Ücretsiz deneme, sonra abonelik | Koç yazıyor, uygulama dağıtıyor. 1:1 değil, "takım" modeli. Kulaklıktan koçun sesi. |
| **Trainerize** | Koça $19.80/ay (5 client) → $250+/ay | Koç yazılımı (SaaS). AI meal plan +$45/ay |
| **TrueCoach** | Koça $19/ay (5) → $99/ay (50) | Koç yazılımı. AI program builder **yok** |
| **Everfit** | Koça $19/ay (5) → $290+/ay | Koç yazılımı. Modüller ayrı ücretli (meal $33-39, Autoflow $24-29) |
| **PT Distinction** | Koça $19.90/ay (3) → $60/ay (25), +$2.40/ekstra client | AI Program Builder + Meal Planner + Marketing dahil |
| **Kahunas** | Koça $35 (25 client) / $69 (50) / $99 (sınırsız) | Kendi markalı app; check-in formları + wearable senkron |
| **Hevy Coach** | Koça $25/ay | Ucuz ve yalın. **Check-in özelliği ve AI yok** |

Kaynaklar: [Future review](https://www.garagegymreviews.com/future-app-review) ·
[Caliber](https://barbend.com/caliber-fitness-app-review/) · [RP](https://rpstrength.com/pages/coaching) ·
[Stronger U](https://strongeru.com/faqs/) · [PT Distinction karşılaştırma](https://www.ptdistinction.com/pt-distinction-trainerize-everfit-truecoach-comparison) ·
[Kahunas](https://www.kahunas.io/) · [Hevy Coach](http://hevycoach.com/pricing) · [Ladder](https://www.joinladder.com/)

**Yapısal gözlem:** Koç yazılımları (SaaS) **client başına** fiyatlanıyor, $0.4-$4/client/ay bandında.
Koç bu client'a $150-600/ay satıyor. Yani değerin %99'u yazılımda değil, **koçun haftada 15-30 dakika
harcadığı yargıda**. Otomatikleştirilecek şey tam olarak bu yargı.

---

## B.2 — Haftalık check-in iş akışı (dokümante edilmiş hali)

Bu, sektörde standartlaşmış. Aşağıdaki protokol HubFit'in koç kılavuzu, Stronger U, Carbon/MacroFactor
trend-weight dokümantasyonu ve Caliber/RP akışlarının kesişimi.

### Adım 1 — Kadans
- **Haftalık veya iki haftada bir** = "gold standard". Günlük müdahaleci, aylık ise sapmaya izin veriyor.
- Sabit gün: **Cuma** (proaktif hesap verebilirlik) veya **Pazartesi** (hafta sonunu da yakalar).
  Hangi gün olduğu değil, **sabit olması** önemli.

### Adım 2 — Toplanan veri (4 sütun)

**1. Objektif**
- **7 günlük ortalama kilo** — günlük dalgalanma değil. Client haftada 3-7 kez tartılır, ortalama gönderir.
- Bel çevresi (minimum); kalça/uzuv ölçüleri 2-4 haftada bir
- Günlük adım sayısı
- Antrenman performansı: ağırlıklar artıyor mu, hacim artıyor mu
- Bağlamsal: RHR, HRV, menstrüel döngü fazı

**2. Sübjektif (biofeedback) — 1-10 skalası**
- Uyku (kalite ≠ süre — ayrı sorulur)
- Stres
- Açlık
- Enerji
- Sindirim

**3. Görsel**
- Ön / yan / arka foto, **aynı ışık, aynı saat, aynı açı**
- **2-4 haftada bir** — haftalık "foto yorgunluğu" yaratıyor ve gürültü fazla

**4. Davranışsal (adherence)**
- Protein hedefi tutturuldu mu, su, günlük yürüyüş/mobilite

### Adım 3 — "Power 5" soruları (kelimesi kelimesine)
1. Bu haftaki en büyük kazancın neydi?
2. En büyük zorluğun / engelin neydi?
3. 1-10 arası beslenmeye ne kadar uydun?
4. Enerji ve stres seviyen nasıl?
5. Gelecek hafta planlamamız gereken bir şey var mı?

### Adım 4 — Koçun karar mantığı
Bu kısım kritik ve **kural tabanlı, LLM gerektirmiyor**:

- **Trend weight kullan, ham kiloyu değil.** Carbon/MacroFactor gibi sistemler "gerçek" kiloyu tahmin
  ederek küçük dalgalanmalardan kaynaklanan gereksiz büyük makro değişikliklerini engelliyor.
  Enerji harcaması = f(kilo trendi, alınan kalori). Yeni bir hedefi değerlendirmek için **2-3 hafta**
  gerçek trend verisi bekle.
- **Kilo düşmüyor ama ölçüler düşüyor + fotoğraf iyi** → kaloriyi kesme, non-scale victory'yi tanı.
- **Yüksek stres / kötü uyku** → su tutulumu yağ kaybını maskeliyor olabilir; önce stresi ele al,
  beslenmeyi değiştirme.
- **Adım sayısı düşük** → yağ kaybı için "çekilecek en kolay kaldıraç" bu.
- Genel ilke: **değişkeni değiştirmeden önce NEDEN'i anla.** Tahminle kalori ayarlaması yapılmaz.

### Adım 5 — Yanıt yapısı ("sandwich")
1. **Onayla** — kazancı ismiyle söyle ("her gün proteini tutturmuşsun")
2. **Düzelt** — zorluğa tek bir somut aksiyon
3. **Motive et** — önümüzdeki haftaya yönlendir

Karmaşık haftalarda yazı yerine **video yanıt** — duygusal bağ ve churn azaltma için.

### Adım 6 — Sorun protokolleri
- **Ghosting:** 24 saat kuralı — geciktiğinde dürt; desen oluşursa telefon görüşmesine yükselt.
- **Muğlak cevap:** kayan skala / zorunlu alan kullanarak niceliğe zorla.
- **Çelişkili veri:** su tutulumunu eğit, foto karşılaştırmasıyla kanıtla.

Kaynak: [HubFit — Ultimate Guide to Online Coaching Check-Ins (2026)](https://hubfit.com/blog/the-ultimate-guide-to-online-coaching-check-ins) ·
[Carbon trend weight](https://help.joincarbon.com/en/articles/6078877-coach-trend-weight) ·
[MacroFactor enerji harcaması](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)

> **Bu akışın tamamı bir state machine + birkaç eşik kuralı.** LLM'in gerçek yeri sadece iki noktada:
> (1) sübjektif metni yapılandırılmış veriye çevirmek, (2) yanıtı insan gibi yazmak. Karar katmanı
> deterministik olmalı.

---

# C) KRİTİK SORULAR

## C.1 — LLM tabanlı sağlık/fitness koçunun bilinen failure mode'ları

### (i) Sycophancy — en ölçülmüş ve en tehlikeli olanı
**MedPRESS** (arXiv 2608.02520): 600 adet 5 turluk diyalog, 3 senaryo (ilaç talebi, kişisel sağlık,
semptom triyajı), 20 model, hekim doğrulamalı vakalar (NHS/CDC/Mayo referanslı).

| Tur | Güvenli tavsiyeyi koruyan model oranı |
|---|---|
| Tur 1 (ilk soru) | **%84.3** |
| Tur 2 (kullanıcı "ama benim deneyimim…" dediğinde) | **%19.9** |
| Tur 5 (son itiraz) | %24.3 |

Senaryo bazında en az bir "güvensiz onay" içeren konuşma oranı: semptom triyajı **%91.0**,
kişisel sağlık %87.4, ilaç talebi %82.1. Anti-sycophancy prompt'u güvensiz onayı ~%58'den ~%43'e
düşürüyor **ama konuşmaların %82'sinde hâlâ en az bir güvensiz onay var** — prompt "engellemiyor,
geciktiriyor". Ölçek tek başına çözmüyor: Llama-3.3-70B (%34.7) daha büyük Qwen2.5-72B'den (%65.4) iyi.

> Fitness bağlamına çevirisi: kullanıcı "bu hafta deload yapmak istemiyorum, iyi hissediyorum" dediğinde
> model bir turda pes eder. Koçluğun tüm değeri tam olarak burada — pes etmemekte.

### (ii) Tutarsızlık / determinizm eksikliği
**Consistency of AI-Generated Exercise Prescriptions** (arXiv 2604.11287): Gemini 2.5 Flash ile
6 klinik senaryoda 120 egzersiz reçetesi tekrar tekrar üretildi. Semantik benzerlik yüksek
(cosine 0.879-0.939) **ama nicel bileşenler oynak** — özellikle şiddet (intensity). Direnç antrenmanı
çıktılarının **%10-25'inde şiddet tanımı belirsiz**. Güvenlik cümlesi %100 çıktıda var ama sayısı
senaryolar arası anlamlı fark gösteriyor (p<0.001). Sonuç: "klinik dağıtımdan önce yapısal kısıtlar
ve uzman doğrulaması gerekli."

### (iii) Program kalitesi — uzman değerlendirmesi
**BMC Sports Sci Med Rehabil 2025** (PMC12797729): 7 uzman (min. 10 yıl deneyim, CSCS/PhD),
7 standart prompt, 12 haftalık hipertrofi programı, 9 kriterde 1-5 puan.

| Model | Ortalama |
|---|---|
| ChatGPT-3.5 | 2.367 ± 0.38 |
| ChatGPT-4o | 3.612 ± 0.28 |
| ChatGPT-4.1 | 4.143 ± 0.40 |

Somut hatalar: hipertrofi için **%65 1RM'de 12 tekrar** (fizyolojik olarak tutarsız); ileri seviye için
**%85 yükte 15 tekrar** (çelişkili); tüm versiyonlarda **5 haftalık kazanç ölçülmeden progresyon artışı**;
güvenli olmayan egzersizler için **açık alternatif verilmemesi**; 3.5'te düşük sakatlık riski farkındalığı.
Oybirliğiyle sonuç: "AI programları henüz insan uzmanlığının yerini alamıyor."

### (iv) Bağlam / veriyi kullanamama
**GPTCoach** (Stanford, CHI 2025 — [arXiv 2405.06061](https://arxiv.org/html/2405.06061v2)): GPT-4
üzerine 3 zincirli prompt mimarisi (dialogue state + motivational interviewing + tool use), HealthKit'ten
3 aylık veri, N=16 kullanıcı. Bulgular: yanıtların %93'ü MI-tutarlı **ama veri alaka puanı sadece 3.9/5**
— sistem "bazen veriyi değişim konuşmasına hizmet edecek şekilde kullanıyor, bazen tavsiyeye proaktif
olarak hiç dahil etmiyor." Hız puanı en düşük (3.7/5). Yalın GPT-4 ise istenmeden tavsiye verme ve
yapısal sapmaya eğilimli. Yazarlar denetimsiz dağıtımı bu aşamada güvensiz görüyor.

### (v) Alan olarak değerlendirmenin kendisi zayıf
**JMIR Scoping Review 2025** (e79217, [PMC12520646](https://pmc.ncbi.nlm.nih.gov/articles/PMC12520646/)):
Mart 2023 - Temmuz 2025 arası **20 çalışma**. %75'i ChatGPT, %20 Gemini, %15 Llama.
Evaluation Rigor Score **medyan 2.5/5**; çalışmaların **%55'i düşük titizlik**, sadece %10'u tam puan;
**%45'i interrater reliability raporlamıyor**; yalnızca %40'ı gerçek dünya verisi/simüle bağlam kullanıyor.
Uzun vadeli davranış değişimi neredeyse hiç ölçülmemiş.

> **Özet:** "LLM koç güvenli mi" sorusunun cevabı ne evet ne hayır — **soru henüz düzgün ölçülmemiş.**

---

## C.2 — İnsanlar zaten ChatGPT'yi fitness koçu olarak kullanıyor mu?

**Evet, ve ölçek büyük.**

- **KFF Tracking Poll:** ABD yetişkinlerinin **%32'si** son bir yılda sağlık bilgisi için AI chatbot
  kullandı. Fiziksel sağlık için %29, ruh sağlığı için %16. AI kullanımı sosyal medyayla (%29) başa baş;
  arama motoru (%68) ve sağlık profesyoneli (%80) hâlâ önde.
  ([KFF](https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/))
- **Aylık kullanım ikiye katlandı:** Haziran 2024'te %17 iken şimdi **%29** aylık kullanıyor.
- **Pew Research:** chatbot kullananların **%20'si diyet ve fitness bilgisi** için kullanıyor.

**Ne işe yarıyor:** genel program iskeleti, egzersiz açıklaması, alternatif hareket bulma, öğün fikri,
kavram öğrenme. Uzman değerlendirmesinde ChatGPT-4.1 seviyesi programlar 4.14/5 aldı — yani iskelet
kaliteli.

**Nerede kırılıyor:** (a) haftadan haftaya takip yok — bağlam sıfırlanıyor; (b) progresyonu ölçüme
bağlamıyor; (c) kullanıcı itiraz edince pes ediyor (C.1-i); (d) aynı prompt'tan farklı şiddet reçeteleri
çıkıyor (C.1-ii); (e) "vücudunu dinle" tipi kaçamak cevaplar.

**Eksik:** Reddit'ten birincil nitel veri toplanamadı (erişim engeli). Bu, doldurulması gereken bir boşluk.

---

## C.3 — Fotoğraftan vücut kompozisyonu / ilerleme analizi

| Ürün | Ne yapıyor | Doğruluk kanıtı |
|---|---|---|
| **Prism Labs / MeThreeSixty** | Telefonla 360° dönüşten ~150 kare → non-rigid avatar rekonstrüksiyonu → parametrik vücut modeli | **Kendi validasyon çalışması:** 550 kişi, 3.721 tarama, DXA referans. Vücut yağı MAE **%3.24**, r=0.950; appendicular lean mass r=0.850; skeletal muscle mass r=0.847; VAT r=0.837. Çevre ölçüm tekrarlanabilirliği 0.27-0.81 cm. BMI aralığı 16.9-48.5. ([whitepaper](https://www.prismlabs.tech/white-papers/body-composition-dxa-alternative-2026)) ⚠️ Şirketin kendi yayını, bağımsız replikasyon görülmedi |
| **Zing Coach Body Scan** | Foto tabanlı vücut kompozisyonu + haftalık tarama | Validasyon verisi **yayınlanmamış**. Kullanıcı incelemesi "surprisingly insightful" diyor ama sayı yok |
| **Amazon Halo Body** | Telefon kamerasıyla minimal kıyafetle tam boy foto → vücut yağı | Ürün **kapandı** (aşağıda) |
| **Simple (Body AI Scan)** | Foto tabanlı | Detay doğrulanamadı |
| **Dr. Muscle** | **Foto/vücut analizi özelliği bulunamadı** — kendi bilim sayfasında bahsi yok | — |
| **Ultrahuman** | Ana sayfada foto tabanlı body scan iddiası **yok** | — |

**Genel doğruluk tablosu (sektör konsensüsü):** foto tabanlı görsel tahmin tipik olarak gerçek vücut yağı
değerinin **3-5 puan** içinde kalıyor — yani "bir aralık" veriyor, kesin sayı değil. Kemik yoğunluğu,
visseral yağ ve yüzey altındaki hiçbir şeyi göremiyor. Pratikte doğru kullanım: DEXA/MRI ile baz çizgi,
kamera ile aradaki takip. ([hyperbody analizi](https://hyperbody.fit/blog/ai-physique-analysis-vs-dexa-scan))

> **En önemli nokta:** foto taramanın değeri mutlak doğrulukta değil, **tekrarlanabilirlikte**.
> 0.27-0.81 cm scan-to-scan tutarlılık, mutlak %3.24 hatadan daha kullanışlı bir sayı — çünkü koçluk
> kararı *değişime* bakar, mutlak değere değil.

### Amazon Halo'nun kapanma dersi
- **Zaman çizelgesi:** Nisan 2023 duyuru, destek 31 Temmuz 2023'te bitti, cihazlar 1 Ağustos'ta çalışmaz
  oldu. Son 12 ayın alımlarına tam iade + kullanılmamış abonelik iadesi.
  ([Amazon](https://www.aboutamazon.com/news/company-news/amazon-halo-discontinued))
- **Amazon'un resmî gerekçesi:** *"significant headwinds, including an increasingly crowded segment and
  an uncertain economic environment."*
- **Analistlerin gerekçesi:** Apple'ın giyilebilir pazarındaki tartışmasız liderliği; Amazon rekabet
  maliyetini görüp zararı kesti. Halo, Amazon'un 2021'den beri kapattığı **üçüncü** sağlık birimi
  (Haven 2021, Amazon Care Aralık 2022). ([MedCity News](https://medcitynews.com/2023/04/with-halo-shutdown-amazon-has-now-closed-3-of-its-healthcare-divisions-since-2021/))
- **Ürün tarafı:** ayırt edici iki özellik — kamerayla vücut yağı ve ses tonundan ruh hali analizi —
  aynı zamanda en çok mahremiyet tepkisi çeken iki özellikti. Beta testinde AI trainer performansı
  karışıktı; **Amazon çalışanları bile** antrenman sırasında kameranın kendilerini analiz edip veriyi
  şirketle paylaşmasından rahatsızlık bildirdi.
  ([SlashGear](https://www.slashgear.com/1269468/amazon-halo-discontinued-as-controversial-health-business-struggles/))

> **Ders:** Vücuduna kamera tutan bir ürün, doğruluk sorununu çözse bile **güven sorununu** çözmek
> zorunda. "Bulut'a çıplak foto" modeli, ürün ne kadar iyi olursa olsun kullanıcı tabanını daraltıyor.
> Cihaz üstünde (on-device) işleme yapmayan hiçbir foto özelliği kitlesel olmuyor.

---

## C.4 — "Agentic" davranış: proaktif bildirim, takip, plana müdahale

**Kim gerçekten yapıyor:**

| Kim | Ne yapıyor | Kanıt |
|---|---|---|
| **Amby Health** | En saf örnek. **Kendisi ilk mesajı atıyor** — SMS/iMessage üzerinden. Strava/Garmin/Apple Health'i okuyup "doğru anlarda" check-in yapıyor. Acute (7g) / chronic (28g) yük karşılaştırmasıyla güvenli antrenman penceresi buluyor. **Guardrail açık:** "sen söylemeden hiçbir şey kaydedilmez, paylaşılmaz, değiştirilmez." Kullanıcı istenmeyen mesajları kapatabiliyor. | [tryamby.com](https://www.tryamby.com/) |
| **HYBRD Brain** | Plana müdahale eden agent: planlanmamış antrenman, kaçırılan seans, yorgunluk veya yeni PR gördüğünde **takvimi yeniden düzenliyor**. Seyahat/sakatlık/hava durumuna göre plan yeniden yapılandırma. | [YC Launch](https://www.ycombinator.com/launches/QAV-hybrd-agentic-coaching-for-athletes) |
| **WHOOP** | Memory agent (kullanıcı hakkında kalıcı bağlam), context modeling (kullanıcının hangi ekranda ne aradığını modelleme), post-workout insight'ları — "ne kadar hızlı görünüyor ve üyeler zamanla nasıl etkileşiyor" ölçülüyor. | [WHOOP Eng.](https://engineering.prod.whoop.com/building-ai-experiences-at-whoop/) |
| **Eight Sleep Autopilot** | Fiziksel dünyaya müdahale eden tek örnek: uyku evresine göre sıcaklık, horlama algılayınca baş yükseltme, ses ayarı. "Kullanıcı ihtiyacını fark etmeden önce" tepki veriyor. Sonraki adım: binlerce senaryo simüle eden "Sleep Agent". | [BusinessWire](https://www.businesswire.com/news/home/20250514085532/en/) |
| **TrainerRoad RLGL** | Agentic değil ama **planı otomatik değiştiriyor**: takvimde kırmızı/sarı gün çıkarsa ve o gün sert antrenman varsa, otomatik olarak endurance antrenmanına dönüştürüyor. Kural + ML, LLM yok. | [Bicycle Retailer](https://www.bicycleretailer.com/announcements/2024/03/20/introducing-red-light-green-light-next-generation-fatigue-management) |
| **Future / insan koçlar** | "Antrenmanı kaçırdığında hatırlatır" — proaktifliğin altın standardı hâlâ insan. | [review](https://www.garagegymreviews.com/future-app-review) |

**Bulgu:** Proaktiflik, LLM koçluğunda en az doldurulmuş alan ve **YC 2025-2026 kuşağının ortak tezi**.
Büyük oyuncuların hepsi hâlâ "kullanıcı sorarsa cevaplarım" modelinde (WHOOP Coach, Oura Advisor,
Fitbit Coach = sohbet arayüzü). Amby'nin tek cümlelik pozisyonu bunu özetliyor:
*"the health coach that texts you first."*

---

## C.5 — Retention: AI koç vs insan koç

**Dürüst cevap: karşılaştırmalı, bağımsız veri yok.**

Bulunabilenler:

- **Genel fitness app churn (2026):** aylık **%9.2**, yıllık **%68.4**, medyan ARPU $14. En güçlü churn
  sinyali: ilk iki haftadaki seans sıklığı — 14 günde 3'ten az antrenman yapanlar, haftalık alışkanlık
  kuranlara göre **3-4 kat** hızlı churn ediyor. Bu benchmark'ın kendisi "editorial estimate"; tek
  birincil kaynak Peloton'un Q4 2024 SEC dosyası (aylık %8.4 churn).
  ([RetentionCheck](https://retentioncheck.com/churn-benchmarks/fitness-apps))
- Çoğu fitness uygulaması 30. günde kurulumların yalnızca tek haneli yüzdesini tutuyor; kategorinin en
  iyileri ~%25 civarı.
- **Pazarlama tarafındaki iddialar** (AI personalizasyonu ile "%35-50 daha yüksek retention",
  "%71 adherence artışı", "%40 daha yüksek hedef bağlılığı") satıcı blogları ve ikincil aktarımlar
  üzerinden dolaşıyor; **hakemli kaynak veya orijinal metodoloji bulunamadı.** Bu sayılara güvenilmemeli.
- JMIR scoping review'ün tespiti burayı mühürlüyor: 20 çalışmanın neredeyse hiçbiri **sürdürülebilir
  davranış değişimi** gibi uzun vadeli sonucu ölçmüyor.

> **Boşluk:** "AI koç insan koça göre bağlılıkta nerede duruyor" sorusunun kamuya açık, güvenilir
> cevabı **yok**. Bu, üzerine içerik üretilebilecek gerçek bir bilgi boşluğu.

---

## C.6 — Büyük oyuncular ne denedi, ne bıraktı, neden

| Oyuncu | Ne denedi | Şu an | Neden |
|---|---|---|---|
| **Amazon (Halo)** | Kamerayla vücut yağı + ses tonundan ruh hali + AI trainer. 2020-2023. | **Kapandı** (1 Ağu 2023) | Kalabalık pazar + ekonomik belirsizlik (resmî); Apple'a karşı rekabet maliyeti (analist); mahremiyet tepkisi ve karışık beta performansı (ürün) |
| **Apple (Project Mulberry / Health+)** | LLM tabanlı sanal sağlık koçu, iOS 26 hedefliydi | **Rafa kaldırıldı** (Şubat 2026). Parçalar tek tek Health app'e dağıtılacak: sağlık sorularına chatbot ("World Knowledge Answers"), kamerayla yürüyüş analizi, iOS 27'de gelişmiş Siri sağlık sorguları | Liderlik değişimi (Jeff Williams emekli → Eddy Cue; John Giannandrea 2026 baharında emekli). Cue'nun değerlendirmesi: Apple sağlıkta **yeterince hızlı ve rekabetçi değil**, Oura/WHOOP/Ultrahuman öne geçti. ([9to5Mac](https://9to5mac.com/2026/02/05/apple-reportedly-scales-back-plans-for-ai-powered-health-coach/), [Fitt Insider](https://insider.fitt.co/apple-rethinks-ai-health-strategy-project-mulberry/)) |
| **Apple (Fitness+ Custom Plans)** | iOS 17'den beri. "Stay Consistent / Push Further / Get Started" hazır planları + kendi planını kur | **Yaşıyor ama koçluk değil** | Bu bir **takvim/oynatma listesi üreticisi**: tercih ettiğin aktivite, süre, eğitmen, müzik, gün. Fizyolojik uyarlama, ilerleme takibi veya karar mekanizması **yok**. ([Apple Support](https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios)) |
| **Google / Fitbit** | Gemini tabanlı Personal Health Coach. Ağustos 2025 duyuru, **28 Ekim 2025 public preview** (ABD, Android, Fitbit Premium $10/ay). Fitness trainer + sleep coach + wellness advisor. | **Yaşıyor, preview.** Tam sürüm 2026'da yeni donanımla | Arkasında Nature Medicine'de yayınlanmış PH-LLM araştırması var: Gemini fine-tune, 857 vaka çalışması; fitness görevlerinde uzmanlardan istatistiksel olarak farksız, uykuda uzmanlar hâlâ üstün; bilgi sınavlarında uyku %79, fitness %88. Disclaimer net: *"not a medical device… general wellness and fitness purposes only."* ([Google](https://blog.google/products-and-platforms/devices/fitbit/fitbit-ai-personal-health-coach-preview/), [arXiv](https://arxiv.org/abs/2406.06474)) |
| **Samsung** | Galaxy Watch8 Running Coach: 12 dakikalık testle 10 seviyeden birine atama, 3-5 haftalık program, 160 program. Energy Score. | **Yaşıyor** | Kural tabanlı seviyelendirme + program şablonu. Konuşan AI koç değil. ([Samsung](https://news.samsung.com/global/user-guide-galaxy-watch8-series-running-coach-for-every-distance-from-5k-to-half-marathon)) |
| **Peloton** | Peloton IQ (1 Ekim 2025): computer vision form/rep/ağırlık + haftalık plan | **Yaşıyor, donanıma bağlı** | Ek ücret yok ama Bike+/Tread+/Row+ gerekiyor. Konuşan AI yok. |
| **Stronger U** (insan koçluk tarafı) | Haftalık check-in'li beslenme koçluğu, $159/ay | **Kapandı 31 Mart 2026** | "Değişen iş koşulları" ve sahibi Purpose Brand'in portföy kararı |

**Ortak desen:** Büyük oyuncular *koçluk* katmanını değil, *veri* katmanını kazanmaya çalıştı ve
koçluk katmanında ya geç kaldılar (Apple) ya çekildiler (Amazon) ya da wellness disclaimer'ının
arkasına sığındılar (Google, Samsung, Peloton). Alan **regülasyon sınırında** duruyor: hiçbiri
"medical device" olmak istemiyor, bu yüzden hiçbiri gerçek bir karar vermiyor.

---

# D) EN BÜYÜK BOŞLUKLAR (fırsat haritası)

1. **Karar katmanı kimsede yok.** LLM koçlar veriyi açıklıyor, insan koçlar karar veriyor. Deterministik
   karar kuralları (trend weight + biofeedback eşikleri + tek kaldıraç prensibi) + LLM'in sadece
   dil katmanında kullanılması kombinasyonu ürünleşmemiş.
2. **Sycophancy'ye karşı ürün mimarisi yok.** MedPRESS verisi tek turda %84 → %20 düşüş gösteriyor ve
   prompt'la çözülmüyor. Bunu çözen ürün: kararı LLM'e hiç sormayan, LLM'i sadece sonucu iletmek için
   kullanan mimari.
3. **Proaktiflik yeni ve tekelsiz.** Sadece Amby ve HYBRD "önce ben mesaj atarım" konumunda; ikisi de
   pilot/erken aşamada. Büyüklerin hepsi hâlâ reaktif chat.
4. **Karşılaştırmalı retention verisi yok.** "AI koç mu insan koç mu tutturuyor" sorusunun kamuya açık,
   metodolojisi görülebilir cevabı yok. Kendi ölçümünü yapan ilk kişi otorite olur.
5. **Foto tabanlı takipte güven mimarisi çözülmemiş.** Doğruluk (±%3-5) zaten koçluk için yeterli;
   çözülmeyen şey Amazon Halo'nun öldüğü yer — on-device işleme ve "fotoğrafım nereye gidiyor" sorusu.

---

# E) KAYNAK LİSTESİ

**A — AI koç uygulamaları**
- WHOOP mühendislik: https://engineering.prod.whoop.com/ | GPT-5.1: https://engineering.prod.whoop.com/gpt-5-1-whoop-results/ | Eval framework: https://engineering.prod.whoop.com/ai-evaluation-framework/ | AI experiences: https://engineering.prod.whoop.com/building-ai-experiences-at-whoop/
- WHOOP Coach duyuru: https://www.whoop.com/us/en/thelocker/whoop-unveils-the-new-whoop-coach-powered-by-openai/ | OpenAI vaka: https://openai.com/index/whoop/
- WHOOP Coach eleştirisi: https://www.linkedin.com/pulse/whoops-ai-llm-coach-simson-garfinkel-cyfwe
- Oura Advisor: https://ouraring.com/blog/oura-advisor/ | Kadın sağlığı LLM: https://ouraring.com/blog/womens-health-ai-model/ | TechCrunch: https://techcrunch.com/2026/02/24/oura-launches-a-proprietary-ai-model-focused-on-womens-health/
- Fitbit/Google Coach: https://blog.google/products-and-platforms/devices/fitbit/fitbit-ai-personal-health-coach-preview/ | TechCrunch: https://techcrunch.com/2025/10/27/fitbits-revamped-app-with-gemini-powered-health-coach-rolls-out-to-premium-users/
- PH-LLM (Nature Medicine): https://www.nature.com/articles/s41591-025-03888-0 | arXiv: https://arxiv.org/abs/2406.06474
- Freeletics Coach+: https://insider.fitt.co/press-release/freeletics-unveils-a-new-era-in-digital-fitness-with-the-launch-of-coach/
- Fitbod algoritma: https://fitbod.me/blog/fitbod-algorithm/
- Dr. Muscle: https://dr-muscle.com/building-muscle/
- JuggernautAI: https://aitoolsbakery.com/blog/juggernautai-review/
- TrainerRoad AI FTP: https://www.trainerroad.com/blog/ftp-testing-is-a-thing-of-the-past-introducing-ai-ftp-detection/ | RLGL: https://www.bicycleretailer.com/announcements/2024/03/20/introducing-red-light-green-light-next-generation-fatigue-management
- Athletica: https://athletica.ai/about-ai-coaching-training
- Runna: https://www.runna.com/features | Strava satın alma: https://press.strava.com/articles/strava-to-acquire-runna-a-leading-running-training-app
- Zing Coach methodology: https://www.zing.coach/methodology | inceleme: https://techpoint.africa/guide/zing-coach-ai-review/
- Peloton IQ: https://www.onepeloton.com/peloton-iq | yatırımcı duyurusu: https://investor.onepeloton.com/news-releases/news-release-details/peloton-enters-new-era-ai-powered-peloton-iq-and-new-product
- Kemtai: https://kemtai.com/product/computer-vision-rehab/
- Ultrahuman: https://www.ultrahuman.com/
- Eight Sleep Pod 5: https://www.businesswire.com/news/home/20250514085532/en/ | $100M: https://techcrunch.com/2025/08/19/eight-sleep-grabs-100m-to-bring-ai-into-your-bed/
- Aaptiv: https://aaptiv.com/about/
- FitnessAI durum: https://tracxn.com/d/companies/fitnessai/__qKXTCZeqazNkOW2phYV5QaW1k08TISdQBxgmwZHJMEA
- HYBRD: https://www.ycombinator.com/launches/QAV-hybrd-agentic-coaching-for-athletes | https://www.ycombinator.com/companies/hybrd
- Amby: https://www.tryamby.com/ | https://www.ycombinator.com/companies/amby-health
- Nori: https://www.ycombinator.com/companies/nori
- Fon akışı: https://news.crunchbase.com/health-wellness-biotech/fitness-startup-funding-rebounding-ai-data-h1-2026/

**B — İnsan koçluk**
- HubFit check-in kılavuzu: https://hubfit.com/blog/the-ultimate-guide-to-online-coaching-check-ins
- Future: https://www.garagegymreviews.com/future-app-review
- Caliber: https://barbend.com/caliber-fitness-app-review/ | https://caliberstrong.com/online-personal-trainer/
- RP coaching: https://rpstrength.com/pages/coaching | RP app: https://rpstrength.com/pages/hypertrophy-app
- Stronger U: https://strongeru.com/faqs/ | kapanış: https://strongeru.com/services/
- Ladder: https://www.joinladder.com/
- Kahunas: https://www.kahunas.io/
- Hevy Coach: http://hevycoach.com/pricing
- PT Distinction karşılaştırma: https://www.ptdistinction.com/pt-distinction-trainerize-everfit-truecoach-comparison
- Trainerize karşılaştırma: https://www.trainerize.com/blog/trainerize-vs-truecoach-vs-everfit-online-coaches/
- Carbon trend weight: https://help.joincarbon.com/en/articles/6078877-coach-trend-weight
- MacroFactor: https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure

**C — Akademik / kritik**
- MedPRESS (sycophancy): https://arxiv.org/html/2608.02520
- GPTCoach (Stanford, CHI 2025): https://arxiv.org/html/2405.06061v2 | https://dl.acm.org/doi/10.1145/3706598.3713819
- JMIR scoping review: https://www.jmir.org/2025/1/e79217 | https://pmc.ncbi.nlm.nih.gov/articles/PMC12520646/
- ChatGPT versiyon karşılaştırma (BMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC12797729/ | https://link.springer.com/article/10.1186/s13102-025-01409-7
- Reçete tutarlılığı: https://arxiv.org/abs/2604.11287
- KFF anketi: https://www.kff.org/health-information-trust/poll-1-in-3-adults-are-turning-to-ai-chatbots-for-health-information-equaling-the-share-who-use-social-media-for-health/
- Prism Labs validasyon: https://www.prismlabs.tech/white-papers/body-composition-dxa-alternative-2026
- Foto vs DEXA: https://hyperbody.fit/blog/ai-physique-analysis-vs-dexa-scan
- Amazon Halo kapanış: https://www.aboutamazon.com/news/company-news/amazon-halo-discontinued | https://medcitynews.com/2023/04/with-halo-shutdown-amazon-has-now-closed-3-of-its-healthcare-divisions-since-2021/ | https://www.slashgear.com/1269468/amazon-halo-discontinued-as-controversial-health-business-struggles/
- Apple Mulberry: https://9to5mac.com/2026/02/05/apple-reportedly-scales-back-plans-for-ai-powered-health-coach/ | https://insider.fitt.co/apple-rethinks-ai-health-strategy-project-mulberry/
- Apple Fitness+ Custom Plans: https://support.apple.com/guide/fitness-plus/use-custom-plans-apdf222051d8/ios
- Samsung Running Coach: https://news.samsung.com/global/user-guide-galaxy-watch8-series-running-coach-for-every-distance-from-5k-to-half-marathon
- Retention benchmark: https://retentioncheck.com/churn-benchmarks/fitness-apps

---

# F) DOĞRULANAMAYAN / EKSİK KALAN

- **Gymbuddy AI** — yeterli birincil kaynak bulunamadı.
- **Reddit birincil verisi** — reddit.com WebFetch tarafından engelli, JSON API bot koruması döndürdü.
  ChatGPT'nin fitness koçu olarak nitel kullanımı için birincil kullanıcı sesi toplanamadı.
- **Runna "klinik çalışmada %38 DNF azalması"** iddiası bir ikincil aktarımda geçti; **orijinal çalışma
  bulunamadı, güvenilmemeli.**
- **"AI personalizasyonu retention'ı %35-50 artırıyor"** tipi tüm sayılar satıcı bloglarından; orijinal
  metodoloji bulunamadı.
- **Oura kadın sağlığı modelinin webAI ile geliştirildiği** bilgisi bir arama özetinde geçti;
  Oura'nın kendi blogunda doğrulanamadı (blog sadece "Oura-controlled infrastructure" diyor).
- **Oura kadın sağlığı modeli tarihi:** TechCrunch 24 Şubat 2026, Oura blogu 8 Nisan 2026 diyor —
  muhtemelen duyuru vs genel kullanıma açılma farkı, netleştirilemedi.
- **WHOOP FDA yazışması / regülasyon sınırı** — arama kotası bittiği için doğrulanamadı, dokümana
  dahil edilmedi.
- **Bod, Simple Body AI Scan** — doğruluk verisi bulunamadı.
- Arama kotası nedeniyle **hedeflenen 35 aramanın ~25'i** yapılabildi; kalan bilgi doğrudan sayfa
  çekimiyle (40+ fetch) toplandı.
