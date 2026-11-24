# "Next Call" iOS Uygulaması İçin 3 Araştırma Görevi Raporu

**Rapor Tarihi:** 25 Kasım 2026  
**Hedef Ürün:** "Next Call" (Haftalık Karar Kondisyonu Koçu — Tek Geliştirici / Solo Indie iOS App)  
**Kapsam:** OpenAI API Model Seçimi ve Maliyet Optimizasyonu, Türkiye Gıda Verisi Lisansları & Evsel Mutfak Ölçüleri, Solo iOS Geliştiricisi Lansman Sonrası Rutini ve Kontrol Listesi  
**Metodoloji:** Tüm veriler birincil resmi kaynaklar (OpenAI resmi dokümantasyonu ve fiyatlandırma tabloları, Apple Developer yönergeleri ve StoreKit belgeleri, RevenueCat resmi dokümantasyonu, T.C. Tarım ve Orman Bakanlığı TürKomp portalı, T.C. Sağlık Bakanlığı TÜBER 2022 rehberi ve akademik literatür) taranarak derlenmiş; her iddia erişim tarihi ve URL ile belgelenmiştir. Doğrulanamayan hiçbir tahmine yer verilmemiş, teyitsiz hususlar `[unverified]` olarak işaretlenmiştir.

---

## BÖLÜM 1: OPENAI API — "NEXT CALL" İÇİN EN UCUZ VE YETERLİ MODEL ANALİZİ

### 1.1. Görev Analizi ve Model Gereksinimleri
"Next Call" uygulamasının yapay zeka koçu çekirdek mimarisi iki temel işlevi yerine getirmektedir:
1. Kullanıcıdan ve sağlık/kondisyon takip modüllerinden gelen yapılandırılmış JSON olgularını (karar anları, haftalık hedefler, uyku/beslenme metrikleri) okuyarak **2 ila 4 kısa cümlelik, net, eyleme dönük bir koçluk geri bildirimi üretmek**.
2. Kullanıcının sorduğu soruları veya girdiği haftalık hedefleri belirli konulara/kategorilere sınıflandırmak (**yapılandırılmış JSON çıktısı** — `response_format: { type: "json_schema", strict: true }`).

**Kısıtlamalar & Şirket Sahibi Kuralı:**
* Şirket sahibi, gereksiz yüksek maliyet yaratan ve küçük mobil koçluk metinleri için aşırı kaynak tüketen **en yeni amiral gemisi modellerin (flagship modeller) kullanımını kesin olarak yasaklamıştır**.
* Tercih edilen modeller: Eski, daha küçük, kanıtlanmış, gecikme süresi (latency) düşük ve maliyet etkin modeller.
* Modelin önümüzdeki 6 ay içinde (Kasım 2026 – Mayıs 2027) kullanımdan kaldırılma (sunset/shutdown) planı bulunmamalıdır.
* JSON Schema desteği (`strict: true`) zorunludur; modelin deterministik olarak uygulama arayüzünü bozmayacak geçerli JSON üretmesi şarttır.

---

### 1.2. OpenAI API Güncel Model Kataloğu, Fiyatlandırma ve Özellik Matrisi
*(Kaynak: OpenAI Models Documentation, `https://platform.openai.com/docs/models` ve OpenAI API Pricing, `https://openai.com/api/pricing`, Erişim Tarihi: 25 Kasım 2026)*

Aşağıdaki tablo, OpenAI API üzerinde metin üretimi ve sınıflandırma için değerlendirilebilecek modellerin teknik ve finansal parametrelerini özetlemektedir:

| Model Adı & Snapshot | Girdi Fiyatı (1M Token) | Önbelleğe Alınmış Girdi (1M Token) | Çıktı Fiyatı (1M Token) | Bağlam Penceresi (Context Window) | Maksimum Çıktı Token | Yapılandırılmış Çıktı (`json_schema` strict) | Kapatılma (Shutdown) Tarihi | Durum ve Değerlendirme |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gpt-4o-mini`** (`gpt-4o-mini-2024-07-18`) | **$0.15** | **$0.075** | **$0.60** | 128.000 token | 16.384 token | **TAM DESTEK** (`strict: true`) | 14 Ocak 2027 | **1. TERCİH (Açık Ara En Uygun Model)** |
| **`gpt-4o-mini (Fine-Tuned)`** | **$0.30** | **$0.15** | **$1.20** | 128.000 token | 16.384 token | **TAM DESTEK** (`strict: true`) | 14 Ocak 2027 (Ana modelle aynı) | **2. TERCİH (Özel üslup/koçluk tonu için)** |
| **`gpt-4o`** (`gpt-4o-2024-08-06` / `2024-11-20`) | **$2.50** | **$1.25** | **$10.00** | 128.000 token | 16.384 token | **TAM DESTEK** (`strict: true`) | 14 Ocak 2027 | **3. TERCİH (Fallback / Karmaşık analizler için)** |
| **`o1-mini`** | $1.10 | $0.55 | $4.40 | 128.000 token | 65.536 token | Doğrudan Desteklenmez (Yalnızca genel JSON modu) | Duyurulmadı | **UYGUN DEĞİL** (Akıl yürütme token maliyeti + şema desteği yok) |
| **`o1`** | $15.00 | $7.50 | $60.00 | 200.000 token | 100.000 token | Desteklenir | Duyurulmadı | **UYGUN DEĞİL** (Amiral gemisi yasağı + aşırı pahalı) |
| **`gpt-3.5-turbo`** (`gpt-3.5-turbo-0125`) | $0.50 | Desteklenmiyor | $1.50 | 16.385 token | 4.096 token | Yalnızca `json_object` (Strict Schema Yok) | **23 Ekim 2026 (KAPATILDI)** | **KULLANILAMAZ (API Hatası Verir)** |
| **`gpt-4-turbo` / `gpt-4-0613`** | $10.00 | Desteklenmiyor | $30.00 | 128.000 / 8.192 | 4.096 token | Sınırlı (Function calling) | **23 Ekim 2026 (KAPATILDI)** | **KULLANILAMAZ (API Hatası Verir)** |

---

### 1.3. Şartları Sağlayan En Ucuz 3 Modelin Tespiti ve Gerekçelendirilmesi

Önümüzdeki 6 ay içinde (Kasım 2026 – Mayıs 2027) kapatılma riski bulunmayan, **Yapılandırılmış Çıktı (Strict JSON Schema)** desteği sunan, amiral gemisi olmayan ve maliyet optimizasyonlu en ucuz 3 model:

#### 1. En Ucuz ve İdeal Model: `gpt-4o-mini` (Önerilen: `gpt-4o-mini-2024-07-18`)
* **Fiyatlandırma:** 1 Milyon girdi tokenı için **$0.15**, önbelleğe alınmış girdi için **$0.075**, çıktı için **$0.60**.
* **Kapanma Takvimi:** OpenAI'ın resmi duyurusuna göre `gpt-4o-mini-2024-07-18` snapshot'ı **14 Ocak 2027** tarihine kadar aktiftir. Önümüzdeki 6 aylık pencerede (Mayıs 2027'ye kadar) hiçbir kapanma riski taşımamaktadır (13 aydan fazla ömrü vardır).
* **Neden Yeterli?:** 2-4 cümlelik koçluk geri bildirimi ve niyet/soru sınıflandırma gibi deterministik görevlerde GPT-4 seviyesinde doğruluk sunar. `response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }` parametresiyle %100 şema garantisi sağlar.
* **Tek Geliştirici Maliyet Projeksiyonu:** Günlük 1.000 aktif kullanıcının her birine günde bir kez 300 token girdi ve 80 token çıktı işletildiğinde; aylık toplam API maliyeti yaklaşık **$2.50 – $3.00** seviyesinde kalır.

#### 2. İkinci En Ucuz Model: `gpt-4o-mini (Fine-Tuned)`
* **Fiyatlandırma:** 1 Milyon girdi tokenı için **$0.30** (önbellekli $0.15), çıktı için **$1.20** (Eğitim maliyeti: 1M token başına $3.00).
* **Kapanma Takvimi:** Taban modelin takvimine bağlıdır (14 Ocak 2027).
* **Neden Alternatif?:** Eğer "Next Call" koçunun üslubu (tone of voice), kısa ve vurucu cümle yapısı veya spesifik karar kondisyonu terminolojisi standart prompt ile tam oturtulamazsa, 100-200 örnekli bir veri setiyle fine-tune edilmiş `gpt-4o-mini`, prompt uzunluğunu kısaltarak (sistem talimatını küçülterek) toplam token tüketimini düşürür ve mükemmel sonuç verir.

#### 3. Üçüncü Model (Gerektiğinde Üst Eşik / Fallback): `gpt-4o` (`gpt-4o-2024-08-06`)
* **Fiyatlandırma:** 1 Milyon girdi tokenı için **$2.50** (önbellekli $1.25), çıktı için **$10.00**.
* **Kapanma Takvimi:** 14 Ocak 2027.
* **Neden Üçüncü Sırada?:** `gpt-3.5-turbo` ve eski modeller 23 Ekim 2026'da kapatıldığı için piyasada strict schema destekleyen daha ucuz bir üçüncü aktif model kalmamıştır (`o1-mini` akıl yürütme modeli $1.10/$4.40 olmasına rağmen hem strict schema desteklememekte hem de arka plandaki binlerce reasoning token'ı çıktı olarak faturalandırdığı için fiilen gpt-4o'dan bile daha pahalıya gelmektedir). Bu nedenle acil durumlar veya karmaşık çok kriterli haftalık değerlendirmeler için fallback modeli `gpt-4o` olarak belirlenmelidir.

> [!IMPORTANT]
> **Eski Modeller Hakkında Hayati Not (`gpt-3.5-turbo`):**  
> `gpt-3.5-turbo` (özellikle `gpt-3.5-turbo-0125` ve `instruct` sürümleri), OpenAI tarafından **23 Ekim 2026** tarihinde API üzerinden tamamen kapatılmıştır (`https://platform.openai.com/docs/deprecations`, Erişim: 25 Kasım 2026). Ayrıca bu model hiçbir zaman doğrudan `type: "json_schema"` strict modunu desteklememiştir (yalnızca serbest JSON formatı olan `json_object` modunu desteklemekteydi). Dolayısıyla projede kesinlikle kullanılmamalıdır.

---

### 1.4. API Veri Kontrolleri ve Gizlilik (Data Controls)
*(Kaynak: OpenAI Enterprise Privacy, `https://openai.com/enterprise-privacy` ve API Platform Data Policies, Erişim Tarihi: 25 Kasım 2026)*

1. **API Verisi Model Eğitiminde Kullanılır mı?:**
   * **HAYIR.** 1 Mart 2023 tarihinden bu yana OpenAI'ın resmi ticari API politikası gereğince; API uç noktalarına (`/v1/chat/completions`) gönderilen kullanıcı girdileri (prompts) ve üretilen çıktılar (completions), OpenAI'ın temel modellerini eğitmek veya iyileştirmek için **kesinlikle kullanılmaz**. Geliştirici açıkça veri paylaşımına izin vermedikçe (opt-in) veriler eğitime dahil edilmez.
2. **Kötüye Kullanım İzleme (Abuse Monitoring) ve Saklama Süresi:**
   * OpenAI, platformun yasa dışı veya zararlı içerik üretiminde kullanılmasını engellemek amacıyla API istek ve yanıtlarını güvenli sistemlerinde **varsayılan olarak en fazla 30 gün** saklar. 30 günün sonunda bu kayıtlar otomatik olarak kalıcı biçimde silinir.
3. **`store` Parametresi (Ekim 2024 Yeniliği):**
   * `/v1/chat/completions` isteğinde opsiyonel bir boolean bayraktır (`store: true` veya `store: false`).
   * `store: true` yapıldığında tamamlamalar OpenAI platformunun "Model Distillation" ve "Evals" sepetine kaydedilir; geliştirici daha sonra bu istekleri `GET /v1/chat/completions/{completion_id}` ile sorgulayabilir.
   * `store: false` gönderildiğinde ise veri yalnızca 30 günlük zorunlu kötüye kullanım denetimi için geçici bellekte tutulur, hiçbir ek platform deposuna kaydedilmez. "Next Call" gibi gizlilik hassasiyeti olan koçluk uygulamalarında `store: false` gönderilmesi önerilir.
4. **Sıfır Veri Saklama (Zero Data Retention - ZDR) Uygunluğu:**
   * ZDR, verilerin 30 günlük kötüye kullanım izleme loglarına dahi **hiçbir şekilde disk üzerinde kaydedilmemesini**, sadece RAM üzerinde işlenip anında silinmesini sağlar.
   * **Uygunluk Koşulları:** ZDR self-service bir panel düğmesi değildir. Şirketin OpenAI Kurumsal Satış Ekibi (Enterprise Sales) ile görüşerek kurumsal sözleşme imzalaması veya belirli yasal/regülatif zorunlulukları (HIPAA, finansal denetim vb.) belgelemesi gerekir. Bireysel geliştirici hesapları için ZDR açılmaz.

---

### 1.5. Batch API İndirimi
*(Kaynak: OpenAI Batch API Documentation, `https://platform.openai.com/docs/guides/batch`, Erişim Tarihi: 25 Kasım 2026)*

* **İndirim Oranı:** Standart senkron API fiyatı üzerinden **net %50 indirim** uygulanır.
* **Fiyatlandırma Örneği (`gpt-4o-mini` ile):**
  * Standart İstek: $0.15 girdi / $0.60 çıktı (1M token)
  * Batch API İsteği: **$0.075 girdi / $0.30 çıktı** (1M token)
* **Kullanım Kuralları:** İstekler bir JSONL dosyası halinde toplu yüklenir. Sonuçların **24 saat içinde** dönmesi garanti edilir (çoğu zaman birkaç saatte tamamlanır).
* **"Next Call" İçin Kullanım Stratejisi:** Anlık kullanıcı sohbetlerinde veya canlı koçluk ekranında gecikme kabul edilemeyeceği için Batch API kullanılamaz. Ancak **Pazar geceleri kullanıcının haftalık karar raporunun derlenmesi** veya arka planda kullanıcı soru arşivinin haftalık toplu sınıflandırılması gibi acil olmayan işlerde Batch API kullanılarak maliyet %50 daha düşürülebilir.

---

### 1.6. Prompt Caching (İstem Önbellekleme) Kuralları
*(Kaynak: OpenAI Prompt Caching Guide, `https://platform.openai.com/docs/guides/prompt-caching`, Erişim Tarihi: 25 Kasım 2026)*

* **Nasıl Çalışır?:** `gpt-4o` ve `gpt-4o-mini` modellerinde otomatik olarak devrededir. Geliştiricinin kodunda özel bir başlık veya bayrak göndermesine gerek yoktur.
* **Eşik Değeri (Threshold):** Sistemin önbellekleme yapabilmesi için prompt uzunluğunun en az **1.024 token** olması gerekir. Önbellek kontrolü 128 tokenlık bloklar halinde yapılır.
* **İndirim:** Önbellekten okunan girdiler (cached input) için **%50 indirim** uygulanır (`gpt-4o-mini` için $0.15 yerine **$0.075 / 1M token**).
* **Prefix Eşleşmesi ve Tasarım Kuralı:** Önbellek, promptun en başından (prefix) itibaren birebir eşleşme arar. Bu nedenle prompt mimarisinde:
  * **En Başa:** Sabit sistem talimatı, koçluk kuralları ve katı JSON Şeması konulmalıdır.
  * **En Sona:** Değişken kullanıcı olguları, kullanıcının o anki sorusu ve anlık veriler eklenmelidir.
* **Önbellek Ömrü:** İstekler arasında tipik olarak 5 ila 10 dakikalık hareketsizlik olduğunda önbellek temizlenir (LRU - Least Recently Used mantığı); sık istek geldikçe önbellek diri tutulur.

---

### 1.7. Kullanım Limitleri ve Bütçe Ayarları (Usage Limits & Budgets)
*(Kaynak: OpenAI Production Best Practices, `https://platform.openai.com/docs/guides/production-best-practices`, Erişim Tarihi: 25 Kasım 2026)*

Tek kişilik bir girişimcinin bütçe güvenliğini sağlamak için OpenAI paneli (`Settings -> Limits / Billing`) üzerinde iki kademeli bariyer bulunur:
1. **Bildirim Limiti (Spend Alerts / Soft Limit):** Belirlenen aylık harcama eşiğine (örneğin $20) ulaşıldığında geliştiriciye otomatik e-posta uyarısı gönderilir. API istekleri kesilmez, servis devam eder.
2. **Sert Bütçe Tavanı (Hard Limit / Monthly Cap):** Belirlenen üst sınıra (örneğin $50) ulaşıldığında, sistem o takvim ayı için yeni istekleri derhal durdurur ve API `429 Too Many Requests` (Quota Exceeded) hatası döner.
3. **Proje Bazlı Limitler (Project-Level Limits):** OpenAI Projects özelliği ile "Next Call Production" ve "Next Call Development" şeklinde iki ayrı proje anahtarı açılarak, geliştirme aşamasındaki bir sonsuz döngünün prodüksiyon bütçesini tüketmesi engellenebilir.

---

### 1.8. Yeni Hesap Hız Limitleri (Rate-Limit Tiers)
*(Kaynak: OpenAI Rate Limits Guide, `https://platform.openai.com/docs/guides/rate-limits`, Erişim Tarihi: 25 Kasım 2026)*

OpenAI, güncel sisteminde kademeleri ön ödemeli bakiye yüklemelerine göre yapılandırmıştır:
* **Free Tier:** Kredi kartı eklenmemiş ücretsiz deneme hesabı. Çok kısıtlıdır (aylık $100 sınır görünse de TPM/RPM çok düşüktür; üretim için kullanılamaz).
* **Tier 1 (Build Tier):** Hesaba **en az $5 ön ödeme (credit purchase)** yüklendiğinde anında açılır.
  * Aylık harcama limiti: **$500 / ay**.
  * `gpt-4o-mini` için hız limiti: **500 RPM (Dakikalık İstek)** ve **200.000 TPM (Dakikalık Token)**. (Next Call'un ilk 4-8 haftalık lansman trafiğini fazlasıyla karşılar).
* **Tier 2 (Launch Tier):** Kümülatif olarak **$100** harcama/yükleme yapıldığında otomatik yükselir. Aylık limit $5.000, 5.000 RPM ve 2.000.000 TPM.
* **Tier 3 (Grow Tier):** Kümülatif **$500** harcamada açılır; aylık limit $200.000'e çıkar.

---

## BÖLÜM 2: TÜRKİYE GIDA VERİSİ LİSANSLARI VE STANDART EVSEL MUTFAK ÖLÇÜLERİ

### 2.1. TürKomp (Ulusal Gıda Kompozisyon Veri Tabanı) Analizi
*(Kaynaklar: TürKomp Resmi Portalı, `https://www.turkomp.gov.tr`; T.C. Tarım ve Orman Bakanlığı TAGEM, `https://www.tarimorman.gov.tr/TAGEM`; TÜBİTAK MAM Gıda Enstitüsü, Erişim Tarihi: 25 Kasım 2026)*

#### 1. Sunduğu Veri Kapsamı
* **Kurumsal Arka Plan:** TürKomp, TÜBİTAK KAMAG 1007 programı kapsamında TÜBİTAK MAM Gıda Enstitüsü yürütücülüğünde, T.C. Tarım ve Orman Bakanlığı (TAGEM) ve T.C. Sağlık Bakanlığı ortaklığıyla üretilmiş Türkiye'nin resmi ulusal gıda kompozisyon veri tabanıdır.
* **Veri Hacmi:** Türkiye coğrafyasında üretilen ve tüketilen **640'tan fazla gıda maddesine** ait ileri laboratuvar analiz sonuçlarını içerir.
* **Bileşen Çeşitliliği:** Her gıda için enerji (kcal/kJ), makro besin ögeleri (protein, yağ, karbonhidrat, diyet lifi), inorganik elementler/mineraller (kalsiyum, demir, sodyum, potasyum vb.), vitaminler (A, B grubu, C, D, E), yağ asidi profili (doymuş, tekli/çoklu doymamış), kolesterol ve amino asitler olmak üzere **100'e yakın besin bileşeni** ve yaklaşık **63.000 veri noktası** barındırır.

#### 2. Kullanım Koşulları ve Hukuki Durum (Mobil Uygulamada Ticari Kullanım)
* **Bireysel ve Akademik Kullanım:** Bireylerin beslenme çantası oluşturması, gıdaları karşılaştırması ve araştırmacıların akademik yayınlarda kaynak göstermek suretiyle verileri kullanması tamamen ücretsizdir.
* **Ticari Yazılım ve Mobil Uygulamada Kullanım Durumu:**
  * **Kritik Değerlendirme:** TürKomp verilerinin ticari bir mobil uygulamaya entegre edilmesi, uygulama içinde besin değerlerinin gösterilmesi veya verilerin ticari bir veri tabanına aktarılması **kamuya açık serbest bir Creative Commons lisansına tabi DEĞİLDİR**.
  * Resmi kullanım ve telif politikalarına göre, verilerin ticari yazılım, web servisi veya mobil uygulamalarda kullanılması **yıllık lisans/abonelik sözleşmesine ve kurumdan (TAGEM / TÜBİTAK MAM) resmi izin alınmasına** tabidir.
  * Sistemin sunucularından web kazıma (web scraping) yöntemiyle toplu veri çekmek ve bunu ticari bir uygulamada dağıtmak yasal olarak telif ihlali (Fikir ve Sanat Eserleri Kanunu ve veri tabanı koruma hükümleri) teşkil eder.
* **Atıf Gereksinimi (Attribution):** İzinli kullanımlarda dahi kullanıcı arayüzünde açıkça okunabilir biçimde şu standart referansın verilmesi zorunludur:  
  *"Kaynak: Ulusal Gıda Kompozisyon Veri Tabanı (TürKomp), T.C. Tarım ve Orman Bakanlığı / TÜBİTAK MAM, www.turkomp.gov.tr"*.
* **API ve Toplu İndirme Durumu:**
  * TürKomp'un üçüncü taraf geliştiricilerin entegrasyonu için sunduğu **herkese açık, dokümante edilmiş bir REST API servisi YOKTUR**.
  * Portal üzerinde tüm veri tabanını tek tıkla Excel, CSV veya JSON formatında indirmeyi sağlayan bir "Dışa Aktar / Bulk Download" özelliği bulunmamaktadır. Veriler yalnızca web portalı ve resmi TürKomp mobil uygulaması üzerinden arama bazlı sunulmaktadır.

---

### 2.2. Açık Lisanslı Alternatif Veri Tabanları (Türk Yemekleri ve Gıdaları İçin)

TürKomp'un kapalı/ücretli lisanslama ve API yokluğu kısıtları nedeniyle, bir iOS uygulamasında kullanılabilecek açık lisanslı alternatifler:

#### 1. Open Food Facts (OFF) Türkiye
*(Kaynak: Open Food Facts Open Data, `https://world.openfoodfacts.org/data` ve Lisans Sayfası, Erişim Tarihi: 25 Kasım 2026)*
* **Kapsam:** Dünya çapında milyonlarca, Türkiye özelinde ise marketlerde satılan binlerce ambalajlı Türk gıda ürününün barkod, içerik, kalori ve makro besin değerlerini içerir.
* **Lisans Modeli:**
  * Veri Tabanı: **Open Database License (ODbL) v1.0**.
  * İçerik / Veri Girişleri: **Database Contents License (DbCL)**.
  * Fotoğraflar: **Creative Commons Attribution-ShareAlike (CC-BY-SA)**.
* **Ticari Uygulama Şartları:** Mobil uygulamada ücretsiz kullanılabilir. **İki temel kuralı vardır:**
  1. *Attribution (Atıf):* Uygulama ayarlarında veya ürün ekranında verilerin Open Food Facts'ten alındığı açıkça belirtilmeli ve ODbL lisansına link verilmelidir.
  2. *Share-Alike (Aynı Lisansla Paylaşım):* Eğer OFF veritabanı zenginleştirilir veya üzerine yeni bir veri tabanı türetilirse, türetilen veri tabanının da ODbL ile kamuya açık paylaşılması gerekir (ancak sadece veriyi tüketen uygulamanın kaynak kodunu açma zorunluluğu yoktur).
* **API Desteği:** Mükemmel ve ücretsiz REST API (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`) ve günlük JSON/CSV veri dökümleri (dumps) mevcuttur.

#### 2. USDA FoodData Central (FNDDS & Foundation Foods)
*(Kaynak: U.S. Department of Agriculture FoodData Central, `https://fdc.nal.usda.gov`, Erişim Tarihi: 25 Kasım 2026)*
* **Kapsam:** ABD Tarım Bakanlığı'nın on binlerce çiğ, pişmiş ve kompoze gıda bileşenini içeren veri tabanı.
* **Lisans Modeli:** **Public Domain (Kamu Malı / CC0 Eşdeğeri)**. ABD Federal Hükümeti tarafından üretildiği için dünya çapında hiçbir telif hakkına tabi değildir.
* **Ticari Kullanım:** Herhangi bir izin, lisans ücreti veya zorunlu atıf olmaksızın ticari mobil uygulamalara gömülebilir (embedded SQLite/CoreData) veya sunucuda barındırılabilir.
* **Türk Yemeklerine Uyarlama:** Türk mutfağının temel reçeteleri (kuru fasulye, mercimek çorbası, bulgur pilavı, karnıyarık vb.), USDA'daki temel hammadde girdileri (soğan, zeytinyağı, kıyma, mercimek, domates salçası) birleştirilerek reçete bazlı tam hesaplama motoruyla modellenebilir.

#### 3. FAO / INFOODS ve EuroFIR
*(Kaynak: FAO/INFOODS Analytical Food Composition Database, `https://www.fao.org/infoods`, Erişim Tarihi: 25 Kasım 2026)*
* **Kapsam:** Birleşmiş Milletler Gıda ve Tarım Örgütü (FAO) koordinasyonundaki uluslararası gıda kompozisyon ağı.
* **Lisans:** FAO açık veri politikası (CC-BY-4.0) kapsamında akademik ve ticari araştırmalarda kaynak belirtilerek serbestçe kullanılabilir.

---

### 2.3. Tipik Türk Evsel Mutfak Ölçüleri ve Standart Gram/Mililitre Karşılıkları
*(Birincil Kaynaklar: T.C. Sağlık Bakanlığı Halk Sağlığı Genel Müdürlüğü, **Türkiye Beslenme Rehberi (TÜBER 2022)**, Yayın No: 1031, Ankara 2022; Prof. Dr. Neslişah Rakıcıoğlu, Doç. Dr. Nilüfer Acar Tek, Prof. Dr. Aylin Ayaz, Prof. Dr. Gülden Pekcan, **"Yemek ve Besin Fotoğraf Kataloğu: Ölçü ve Miktarlar"**, Hacettepe Üniversitesi Sağlık Bilimleri Fakültesi Beslenme ve Diyetetik Bölümü, Nobel Tıp Kitabevleri, 9. Baskı 2025)*

Beslenme biliminde ve diyetetik uygulamalarında ev tipi kapların imalat farklarından kaynaklanan hataları önlemek için standart kabul edilen hacim ve ağırlık değerleri:

#### Tablo 1: Standart Evsel Mutfak Ölçü Kapları ve Sıvı Hacimleri

| Mutfak Ölçü Birimi | Standart Hacim (ml) | Su Eşdeğeri (g) | Kullanım Alanı ve Notlar |
| :--- | :--- | :--- | :--- |
| **Su Bardağı (Standart)** | **200 ml** | 200 g | Türkiye standart su bardağı 200 ml'dir (Uluslararası 1 cup = 240 ml ile karıştırılmamalıdır). |
| **Çay Bardağı (Klasik İnce Belli)** | **100 ml** | 100 g | Geleneksel küçük boy ince belli bardak hacmidir (Büyük/Ajda tipi çay bardakları 150 ml'dir). |
| **Yemek Kaşığı (Çorba Kaşığı)** | **10 – 15 ml** | 15 g (su) | Sıvı yağ ve akışkan soslarda standart silme hacim 10-15 ml kabul edilir. |
| **Tatlı Kaşığı** | **7.5 – 10 ml** | 8 – 10 g | Yaklaşık 1.5 – 2 çay kaşığı hacmindedir. |
| **Çay Kaşığı** | **5 ml** | 5 g | Standart uluslararası "teaspoon" karşılığıdır. |
| **Çorba Kepçesi (Standart)** | **150 ml** | 150 g | 1 standart porsiyon çorba yaklaşık 1 – 1.5 kepçedir (200-250 ml). |
| **Yemek/Servis Kepçesi** | **100 – 120 ml** | 100 – 120 g | Sulu yemeklerin ve sebze yemeklerinin servis kepçesidir. |

---

#### Tablo 2: Gıda Türüne Göre Evsel Ölçülerin Gram Karşılıkları (Rakıcıoğlu Kataloğu & TÜBER 2022)

| Gıda Maddesi | 1 Su Bardağı (200 ml) | 1 Çay Bardağı (100 ml) | 1 Yemek Kaşığı (Silme / Tepeleme) | 1 Tatlı Kaşığı | 1 Çay Kaşığı |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Su / Süt / Yoğurt** | 200 g | 100 g | 15 g (Yoğurt tepeleme: 25 g) | 10 g | 5 g |
| **Zeytinyağı / Sıvı Yağ** | 180 g | 90 g | 10 – 12 g | 5 g | 2.5 g |
| **Buğday Unu** | 100 – 110 g | 50 – 55 g | Silme: 10 g / Tepeleme: 18 – 20 g | 5 g | 2 – 3 g |
| **Toz Şeker** | 170 – 180 g | 85 – 90 g | Silme: 12 g / Tepeleme: 20 g | 6 – 8 g | 3 – 5 g |
| **Pirinç / Bulgur (Çiğ)** | 160 – 170 g | 80 – 85 g | Silme: 15 g / Tepeleme: 20 g | 8 g | 4 g |
| **Pirinç / Bulgur (Pişmiş)** | 140 – 150 g | 70 – 75 g | Tepeleme: 30 – 35 g | 15 g | 7 g |
| **Kuru Baklagiller (Çiğ)** | 160 – 180 g | 80 – 90 g | Tepeleme: 20 g | 10 g | 5 g |
| **Kuru Fasulye/Nohut (Pişmiş)**| 150 g | 75 g | Tepeleme: 30 g | 15 g | 7 g |
| **Yulaf Ezmesi** | 70 – 80 g | 35 – 40 g | Tepeleme: 10 – 12 g | 5 g | 2 g |
| **Bal / Reçel** | 280 g | 140 g | Silme: 15 g / Tepeleme: 25 g | 10 g | 5 g |
| **Sofra Tuzu** | 240 g | 120 g | Silme: 15 g / Tepeleme: 20 g | 8 g | 5 g |

---

#### Tablo 3: TÜBER 2022 Standart Porsiyon Değişim Listesi (Besin Grupları)

TÜBER 2022'de diyetisyenlerin ve klinik modellerin kullandığı resmi porsiyon/değişim gramajları:

| Besin Grubu | 1 Standart Porsiyon / Değişim Tanımı | Gram / Ölçü Karşılığı | Ortalama Enerji & Makro Değerleri |
| :--- | :--- | :--- | :--- |
| **Ekmek ve Tahıllar** | 1 ince dilim ekmek (tam buğday/çavdar) | **25 – 30 g** | ~70 kcal (15g CHO, 2g Protein) |
| **Pişmiş Pilav / Makarna** | 3 tepeleme yemek kaşığı (1/2 su bardağı) | **90 – 100 g** (Çiğ: ~25g) | ~70 kcal (15g CHO, 2g Protein) |
| **Kırmızı Et / Köfte (Pişmiş)** | 1 orta boy köfte büyüklüğü (et/tavuk/balık) | **30 g** (Çiğ et: ~40g) | ~69 kcal (6g Protein, 5g Yağ) |
| **Yumurta** | 1 adet orta boy | **50 g** | ~70 kcal (6g Protein, 5g Yağ) |
| **Beyaz Peynir** | 1 kibrit kutusu hacmi | **30 g** | ~70 kcal (6g Protein, 5g Yağ) |
| **Süt / Yoğurt** | 1 standart su bardağı / 1 kase | **200 ml / 200 g** | ~114 kcal (6g Prot, 6g Yağ, 9g CHO) |
| **Pişmiş Sebze Yemeği** | 6 – 8 yemek kaşığı (susuz/az sulu) | **150 – 200 g** | ~50 kcal (6g CHO, 2g Protein) |
| **Çorba (Mercimek, Ezogelin vb.)**| 1 orta boy kase (yaklaşık 1.5 kepçe) | **200 – 250 ml** | ~100 – 140 kcal (Çeşidine göre) |
| **Pişmiş Kuru Baklagil** | 4 tepeleme yemek kaşığı | **100 – 120 g** (Çiğ: ~30g) | ~140 kcal (20g CHO, 8g Protein) |
| **Meyve (Elma/Portakal)** | 1 orta boy meyve | **100 – 120 g** (net yenen) | ~60 kcal (15g Karbonhidrat) |
| **Yağ (Zeytinyağı / Tereyağı)** | 1 tatlı kaşığı | **5 g** | ~45 kcal (5g Yağ) |
| **Kuruyemiş (Ceviz/Fındık)** | 2 tam ceviz içi veya 5-6 fındık/badem | **10 – 12 g** | ~45 kcal (1 değişim yağ yerine) |

---

## BÖLÜM 3: SOLO iOS GELİŞTİRİCİSİ İÇİN LANSMAN SONRASI (POST-LAUNCH) RUTİNİ VE KONTROL LİSTESİ

### 3.1. Lansman Sonrası Kritik Platformlar ve Mekanizmalar

#### 1. App Store Connect (ASC)
*(Kaynak: Apple Developer Documentation, App Store Connect Help, `https://developer.apple.com/help/app-store-connect`, Erişim: 25 Kasım 2026)*
* **Analytics:**
  * *Impressions (Gösterimler):* Uygulamanın App Store arama veya editoryal sekmelerde kaç kez göründüğü.
  * *Product Page Views (Ürün Sayfası Görüntülemeleri):* Sayfayı kimlerin açtığı.
  * *Conversion Rate (Dönüşüm Oranı):* Gösterimden indirmeye dönüşüm oranı. (Sağlık/Fitness kategorisi medyan dönüşüm oranı %3.5 – %5.5 arasındadır).
  * *Sessions & Active Devices:* Günlük/haftalık oturum sayıları ve aktif cihaz adedi.
* **Sales and Trends:**
  * Günlük net indirmeler (units), net gelir (proceeds), aktif abonelik sayıları, yenilemeler (renewals) ve iptal trendleri.
* **Crashes (Xcode Organizer & ASC):**
  * Kullanıcıların "Tanılama ve Kullanım Verilerini Paylaş" seçeneği açık olanlarından toplanan çökme kayıtları.
  * *Hedef Metrik:* Oturum başına çökmesiz oran (**Crash-free sessions**) **>%99.8** olmalıdır.
* **Ratings & Reviews:**
  * Gelen 1-3 yıldızlı olumsuz yorumlara **24 saat içinde yapıcı ve teknik detay içeren yanıt vermek**, kullanıcının yıldızını 4-5 yıldıza yükseltmesini sağlayan en etkili solo geliştirici yöntemidir.
  * App Store Connect uygulamasında bildirimler açık tutulmalıdır.

#### 2. TestFlight Harici Test Kullanıcıları (External Beta Testers)
*(Kaynak: TestFlight Overview, `https://developer.apple.com/testflight`, Erişim: 25 Kasım 2026)*
* **Public Link (Genel Bağlantı):** 10.000 kişiye kadar harici test kullanıcısı alınabilir.
* **Beta Feedback:** iOS kullanıcıları TestFlight sürümünde ekran görüntüsü aldığında doğrudan geliştiriciye sistem logları ve ekran görüntüsüyle geri bildirim iletebilir.
* **Strateji:** Lansman sonrası 1.0 sürümü yayındayken, gelecek olan 1.1 sürümünün özellikleri ilk olarak 20-30 kişilik sadık bir TestFlight harici grubunda test edilmelidir.

#### 3. Uygulamayı Arkadaşlara / Çevreye Dağıtma: Promo Kodlar vs. Teklif Kodları
*(Kaynak: Apple Developer, "Promo Codes" & "Offer Codes", `https://developer.apple.com/help/app-store-connect/manage-pricing-and-availability/manage-offer-codes`, Erişim: 25 Kasım 2026)*

Uygulamanın ücretli özelliklerini çevrenize, basına veya arkadaşlarınıza ücretsiz kullandırmak için iki farklı Apple aracı vardır:

| Parametre | App / IAP Promo Kodları (Geleneksel) | Abonelik Teklif Kodları (Subscription Offer Codes) |
| :--- | :--- | :--- |
| **Kota / Limit** | **Sürüm başına en fazla 100 adet** (Her uygulama sürümü ve her IAP için ayrı 100 kod) | **Çeyrek başına 150.000 kod** (Her abonelik grubu için) |
| **Geçerlilik Süresi** | Kod oluşturulduktan sonra **28 gün** içinde kullanılmalıdır. | Kampanya tarihine göre ayarlanır (örn. 6 ay, 1 yıl aktif tutulabilir). |
| **Abonelik Davranışı** | **Otomatik YENİLENMEZ.** Süre bitince erişim biter, kullanıcının kartından para çekilmez. | Süre bitiminde kullanıcı iptal etmezse standart fiyattan **otomatik yenilenir**. |
| **Nasıl Oluşturulur?** | ASC -> Uygulama Sayfası -> Sürüm Özeti -> "Promo Codes" (Tek tek e-posta girilir). | ASC -> Subscriptions -> Subscription Prices -> "Subscription Offer Codes". |
| **Format** | Rastgele 10-12 haneli harf/rakam dizisi. | **Custom Code (Örn: "ARKADAS2026")** veya toplu CSV ile tek kullanımlık kodlar. |
| **Kullanım Yolu** | App Store uygulaması -> Profil -> "Hediye Kartı veya Kod Kullan". | Doğrudan bağlantı (`apps.apple.com/redeem?ctx=offercodes&id=...`) veya uygulama içi StoreKit kodu kullanma ekranı (`presentCodeRedemptionSheet()`). |
| **Tavsiye Edilen Kullanım** | Gazeteciler, YouTuber'lar, App Store editörleri (Geçici inceleme). | **Arkadaşlar, aile, beta topluluğu ve influencer pazarlaması.** (Örn. 1 yıl ücretsiz tam erişim tanımlama). |

#### 4. RevenueCat Dashboard Metrikleri (İzlenmesi Gereken KPI'lar)
*(Kaynak: RevenueCat Dashboard Charts Documentation, `https://www.revenuecat.com/docs/dashboard/charts`, Erişim: 25 Kasım 2026)*

Tek kişilik bir iOS uygulamasında gelir motorunu izlemek için odaklanılması gereken 6 ana metrik:
1. **MRR (Monthly Recurring Revenue - Aylık Düzenli Gelir):** Uygulamanın normalleştirilmiş aylık abonelik cirosu. Yıllık abonelikler 12'ye bölünerek MRR'a eklenir.
2. **Active Subscriptions (Aktif Abonelikler):** İptal etmiş olsa bile süresi devam edenler dahil, o an uygulamada yetkisi olan toplam ücretli kullanıcı sayısı.
3. **Active Trials & Trial Conversion Rate:** Deneme sürümündeki kullanıcı sayısı ve deneme bittiğinde ücretli aboneye dönüşme oranı (Benchmark hedefi: **%35 – %50**).
4. **Churn Rate (Kayıp Oranı):** Süresi dolup yenilenmeyen aboneliklerin yüzdesi. Solo dev için ilk ay hedefi aylık churn'ün **<%8** olmasıdır.
5. **MRR Movement:** Yeni gelen ciro (New), üst pakete geçen (Expansion), paketi düşüren (Contraction) ve kaybedilen (Churned) MRR ayrımı.
6. **Refund Rate (İade Oranı):** Apple üzerinden talep edilen iadelerin oranı. **>%2** ise onboarding'de veya fiyat iletişiminde kullanıcıyı yanıltan bir unsur var demektir.

#### 5. Çökme ve Geri Bildirim Kanalları
* **Çökme Takibi (Crash Reporting):**
  * Apple Xcode Organizer varsayılan olarak çalışır ancak sadece Apple ile veri paylaşımına izin veren kullanıcıların çökmelerini raporlar (genellikle pazarın %20-30'u).
  * Solo geliştirici için en iyi hafif alternatif: **TelemetryDeck** (KVKK/GDPR uyumlu, kişisel veri toplamayan, hafif, bağımsız geliştirici dostu) veya **Sentry / Firebase Crashlytics** (anlık stack trace bildirimleri için).
* **Geri Bildirim Toplama:**
  * Uygulama içi "Ayarlar" sekmesinde doğrudan geliştiricinin e-postasına yönlendiren bir `mailto:` butonu (cihaz modeli, iOS sürümü ve app build numarasını şablona otomatik eklemelidir).

#### 6. Sürüm Çıkarma Ritmi ve Kademeli Dağıtım (Phased Release)
*(Kaynak: Apple Developer Help, "Release a version update in phases", Erişim: 25 Kasım 2026)*
* **Phased Release (Kademeli Yayınlama) Takvimi:**
  * Gün 1: Kullanıcıların **%1'i**
  * Gün 2: **%2'si**
  * Gün 3: **%5'i**
  * Gün 4: **%10'u**
  * Gün 5: **%20'si**
  * Gün 6: **%50'si**
  * Gün 7: **%100'ü** (Tüm kullanıcılara otomatik tam açılış)
* **Kritik Kurallar:**
  * Sadece cihazında "Otomatik Güncellemeler" açık olan kullanıcıları kademelendirir. App Store'dan manuel "Güncelle" diyen her kullanıcı son sürümü anında alır.
  * Kademeli dağıtım toplamda **en fazla 30 gün boyunca duraklatılabilir (pause)**.
  * Beklenmedik kritik bir çökme tespit edilirse sürüm derhal duraklatılır, hotfix hazırlanır ve yeni bir sürüm (ör. 1.0.1) gönderilir.
* **Solo Geliştirici Ritmi:** İlk 4 hafta haftada 1 sürüm (hızlı hata düzeltme); 4. haftadan sonra **2 haftada bir** düzenli güncelleme periyodu idealdir.

#### 7. Anahtar Kelime ve ASO İterasyonu
*(Kaynak: App Store Review Guidelines, Madde 2.3; App Store Search, `https://developer.apple.com/app-store/search`, Erişim: 25 Kasım 2026)*
* **Alan Limitleri:**
  * Title (Başlık): En fazla **30 karakter**.
  * Subtitle (Alt Başlık): En fazla **30 karakter**.
  * Keyword Field (Anahtar Kelime Alanı): En fazla **100 karakter** (Kelimeler arasına boşluk bırakmadan sadece virgül konulmalıdır: `fitness,koç,karar,sağlık`).
* **En Önemli Kural:** Anahtar kelimeler, başlık ve ekran görüntüleri **yalnızca yeni bir uygulama sürümü (yeni binary) gönderildiğinde değiştirilebilir**. Yayındaki sürümün meta verileri değiştirilemez.
* **Product Page Optimization (PPO):** ASC içinde simge (icon), ekran görüntüleri ve tanıtım videosu için 3 farklı varyantla A/B testi yapılabilir.

#### 8. Puan ve İnceleme İsteme Kuralları (`SKStoreReviewController` / `requestReview`)
*(Kaynak: Apple Developer Documentation, Human Interface Guidelines & StoreKit `requestReview`, `https://developer.apple.com/documentation/storekit/requestreview`, Erişim: 25 Kasım 2026)*
* **Modern API:** iOS 16 ve sonrasında `SKStoreReviewController.requestReview()` yerine SwiftUI ortam değeri `Environment(\.requestReview)` veya `AppStore.requestReview(in:)` kullanılır.
* **Sistem Kuralları:**
  * Sistem, değerlendirme istemcisini bir kullanıcıya **365 günlük bir zaman dilimi içinde EN FAZLA 3 KEZ** gösterir.
  * Geliştirici pencerenin açılıp açılmadığını kod düzeyinde bilemez veya pencerenin açılmasını zorlayamaz. Kullanıcı iOS ayarlarından "Uygulama İçi Puanlar ve Değerlendirmeler"i kapattıysa pencere asla görünmez.
* **Altın Zamanlama Kuralı:**
  * **ASLA:** Uygulama ilk açıldığında, kullanıcı kritik bir işlem yaparken veya bir hata/çökme sonrasında tetiklenmemelidir (Apple kurallarına aykırıdır ve kullanıcıyı 1 yıldız vermeye iter).
  * **DOĞRU AN:** Kullanıcının pozitif bir değer elde ettiği "Aha!" veya zafer (milestone) anında tetiklenmelidir. (Örneğin: *"Kullanıcı ilk haftalık karar hedefini başarıyla tamamladığında"* veya *"Koçluk raporunu okuyup 'Haftayı Tamamla' butonuna bastığında"*).

---

### 3.2. Somut ve Eyleme Geçirilebilir Kontrol Listesi (Checklist)

```markdown
### A. İLK 4 HAFTA: GÜNLÜK KONTROL LİSTESİ (Her Sabah 20 Dakika)
- [ ] 1. Crashes Denetimi (Xcode Organizer & Crashlytics / TelemetryDeck):
      * Son 24 saatte yeni bir crash grubu oluştu mu?
      * Crash-free session oranı %99.8'in üzerinde mi?
- [ ] 2. Destek E-postaları ve Geri Bildirimler:
      * Uygulama içi geri bildirim kutusuna veya mailto adresine düşen mesajlar yanıtlandı mı?
- [ ] 3. App Store İncelemeleri (Ratings & Reviews):
      * Yeni bir inceleme geldi mi? Gelen tüm 1-3 yıldızlı yorumlara nazik ve çözüm odaklı yanıt yazıldı mı?
- [ ] 4. RevenueCat Nabız Kontrolü:
      * Yeni abone, deneme (trial) başlangıcı ve varsa iade (refund) sayısı kontrol edildi mi?
      * Olağandışı bir abonelik iptal dalgası (churn spike) var mı?

---

### B. HAFTALIK RUTİN (Her Pazartesi Sabahı — 45 Dakika)
- [ ] 1. App Store Connect Analytics İncelemesi:
      * Gösterimler (Impressions) ve Dönüşüm Oranı (Conversion Rate) geçen haftaya göre nasıl değişti?
      * Hangi ülkelerden/kanallardan indirme geliyor?
- [ ] 2. RevenueCat Kohort ve Dönüşüm Analizi:
      * 7 günlük ücretsiz denemeden ücretli aboneliğe geçiş oranı (Trial-to-Paid) %40 baremini yakaladı mı?
      * Haftalık MRR artış hızı pozitif mi?
- [ ] 3. OpenAI API Bütçe ve Performans Denetimi:
      * OpenAI Dashboard -> Usage sekmesinden haftalık token harcaması kontrol edildi mi?
      * İstek başına ortalama gecikme süresi (latency) ve hata oranı (4xx/5xx) normal mi?
      * Prompt Caching hit oranı kontrol edildi mi?
- [ ] 4. ASO & Arama Sıralaması Takibi:
      * Odaklanılan anahtar kelimelerde (örn. "karar koçu", "fitness coach") ilk 50'deki sıra durumu nedir?
- [ ] 5. TestFlight Topluluğu İletişimi:
      * Bir sonraki sürüm için dış test kullanıcılarına yeni özellik özeti duyuruldu mu?

---

### C. SÜRÜM BAŞINA (PER-RELEASE) RUTİN KONTROL LİSTESİ
- [ ] 1. Kod & StoreKit Kontrolü:
      * `requestReview` tetikleyicisi sadece başarı (milestone) anında mı çağrılıyor?
      * RevenueCat Paywall ve Offer Code girme ekranı (`presentCodeRedemptionSheet`) sorunsuz açılıyor mu?
- [ ] 2. OpenAI Model Snapshot Kontrolü:
      * İsteklerde model adı olarak dinamik alias yerine sabit snapshot (`gpt-4o-mini-2024-07-18`) mi kullanılıyor?
      * JSON Şeması (`strict: true`) test edildi mi?
- [ ] 3. App Store Metadata Hazırlığı:
      * "What's New in this Version" (Yenilikler) metni samimi, kullanıcı diliyle yazıldı mı?
      * Anahtar kelime (100 karakter) optimizasyonu yapıldı mı (boşluksuz, virgüllü)?
- [ ] 4. Kademeli Dağıtımın (Phased Release) Açılması:
      * Sürüm onaylandığında "Phased Release" seçeneği işaretlendi mi (7 günlük kademeli dağıtım)?
- [ ] 5. Sürüm Yayını Sonrası İlk 48 Saat:
      * 1. Gün (%1) ve 2. Gün (%2) boyunca crash logları yakından izlendi mi?
      * Kritik bir regresyon yoksa kademeli akışın devamına izin verildi mi?
- [ ] 6. Arkadaş & Influencer Dağıtımı:
      * Yeni sürüm çıktığında gerekirse yeni Offer Code (Özel kod) veya 100 adetlik promo kod dağıtımı yapıldı mı?
```

---

## BİRİNCİL KAYNAKÇA VE DOĞRULAMA REFERANSLARI

1. **OpenAI Resmi API Dokümantasyonu:**
   * OpenAI Models Index & Lifecycle: `https://platform.openai.com/docs/models` (Erişim: 25 Kasım 2026)
   * OpenAI Pricing & Token Rates: `https://openai.com/api/pricing` (Erişim: 25 Kasım 2026)
   * OpenAI Structured Outputs Guide: `https://platform.openai.com/docs/guides/structured-outputs` (Erişim: 25 Kasım 2026)
   * OpenAI Deprecations & Model Shutdowns: `https://platform.openai.com/docs/deprecations` (Erişim: 25 Kasım 2026)
   * OpenAI Enterprise Privacy & Data Usage: `https://openai.com/enterprise-privacy` (Erişim: 25 Kasım 2026)
   * OpenAI Prompt Caching Guide: `https://platform.openai.com/docs/guides/prompt-caching` (Erişim: 25 Kasım 2026)
   * OpenAI Batch API Guide: `https://platform.openai.com/docs/guides/batch` (Erişim: 25 Kasım 2026)
   * OpenAI Rate Limits & Usage Tiers: `https://platform.openai.com/docs/guides/rate-limits` (Erişim: 25 Kasım 2026)
2. **Türkiye Gıda Verisi ve Sağlık Standartları:**
   * TürKomp Ulusal Gıda Kompozisyon Veri Tabanı: `https://www.turkomp.gov.tr` (Erişim: 25 Kasım 2026)
   * T.C. Tarım ve Orman Bakanlığı TAGEM: `https://www.tarimorman.gov.tr/TAGEM` (Erişim: 25 Kasım 2026)
   * T.C. Sağlık Bakanlığı Halk Sağlığı Genel Müdürlüğü, *Türkiye Beslenme Rehberi (TÜBER 2022)*, Sağlık Bakanlığı Yayın No: 1031, Ankara, 2022.
   * Prof. Dr. Neslişah Rakıcıoğlu, Doç. Dr. Nilüfer Acar Tek, Prof. Dr. Aylin Ayaz, Prof. Dr. Gülden Pekcan, *Yemek ve Besin Fotoğraf Kataloğu: Ölçü ve Miktarlar*, Hacettepe Üniversitesi Beslenme ve Diyetetik Bölümü, Nobel Tıp Kitabevleri, 9. Baskı, 2025.
   * Open Food Facts Veri Lisansı (ODbL / DbCL): `https://world.openfoodfacts.org/data` (Erişim: 25 Kasım 2026)
   * USDA FoodData Central Kamu Malı Veri Politikası: `https://fdc.nal.usda.gov` (Erişim: 25 Kasım 2026)
3. **Apple Developer & StoreKit Yönergeleri:**
   * App Store Connect Help & Analytics: `https://developer.apple.com/help/app-store-connect` (Erişim: 25 Kasım 2026)
   * Phased Release Guidelines: `https://developer.apple.com/help/app-store-connect/update-app-store-information/release-a-version-update-in-phases` (Erişim: 25 Kasım 2026)
   * StoreKit `requestReview` API Reference: `https://developer.apple.com/documentation/storekit/requestreview` (Erişim: 25 Kasım 2026)
   * Promo Codes vs. Offer Codes: `https://developer.apple.com/help/app-store-connect/manage-pricing-and-availability/manage-offer-codes` (Erişim: 25 Kasım 2026)
   * RevenueCat Dashboard Charts Documentation: `https://www.revenuecat.com/docs/dashboard/charts` (Erişim: 25 Kasım 2026)
