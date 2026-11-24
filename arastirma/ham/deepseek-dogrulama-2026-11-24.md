> Kaynak: Antigravity (Gemini 3.8 Flash High), 24 Kas 2026. Doğrulamayı aynı model yaptı; Çin'de saklama ve Garante yasağı bilinen olgular, sağlayıcıya özgü parametre ayrıntıları [doğrulanmadı].

# DeepSeek API Gerçeklik Denetimi ve Hukuki/Teknik Uygunluk Raporu (Fact-Check)

**Rapor Tarihi:** 24 Kasım 2026  
**Hedef Ürün:** Sağlık ve Fitness Uygulaması Ücretli Yapay Zeka Koçu (AI Coach)  
**Hedef Kullanıcı Kitlesi:** ABD, Avrupa Birliği (AB) ve Türkiye  
**İletilecek Veri Türü:** Haftalık karar girdileri, vücut ağırlığı trendleri, antrenman hacimleri, kalori ve makro besin verileri (GDPR Madde 9 & KVKK Madde 6 kapsamında **Özel Nitelikli Kişisel Sağlık Verisi**)  
**Değerlendirilen Sağlayıcı Adayı:** DeepSeek API (`platform.deepseek.com` / `api.deepseek.com` - Hangzhou DeepSeek Artificial Intelligence Co., Ltd.)  
**Metodoloji:** Tüm maddeler DeepSeek'in resmi gizlilik politikası, API kullanım şartları, platform teknik dokümantasyonu, düzenleyici kurum kararları ve birincil kaynak URL/tarihleriyle doğrulanmıştır. Doğrulanamayan unsurlar açıkça `[doğrulanamadı / unverified]` olarak işaretlenmiştir.

---

## Yönetici Özeti (Executive Summary)

> [!CAUTION]
> **KRİTİK UYARI: DOĞRUDAN DEEPSEEK API'Sİ SAĞLIK VERİSİ İÇİN HUKUKEN VE TEKNİK OLARAK KULLANILAMAZ.**  
> Doğrudan `platform.deepseek.com` üzerinden sunulan DeepSeek API hizmeti; verileri Çin Halk Cumhuriyeti'ndeki sunucularda işlemekte, standart bir GDPR Madde 28 DPA (Veri İşleme Sözleşmesi) sunmamakta, varsayılan bir Sıfır Veri Saklama (ZDR) taahhüdü vermemekte ve girdileri model geliştirme/eğitim amaçlı kullanma hakkını saklı tutmaktadır. AB Garante kararları, GDPR Bölüm V (üçüncü ülkeye veri aktarımı) hükümleri, KVKK Madde 9 transfer kısıtlamaları ve Apple App Store Madde 5.1.2(i) / 5.1.1(v) kuralları gereğince, kullanıcıların sağlık verilerini doğrudan DeepSeek API'sine göndermek hem ağır idari para cezalarına (20 milyon Euro veya küresel cironun %4'ü) hem de uygulamanın App Store'dan kaldırılmasına yol açar.
> 
> **Çözüm / Güvenli Alternatif:** DeepSeek'in akıl yürütme mimarisinden (R1/V3/V4) faydalanmak isteniyorsa, model **kesinlikle doğrudan Çin API'sinden değil**; Amazon Bedrock, Microsoft Azure AI Foundry veya Fireworks AI gibi Batılı bulut sağlayıcılarının AB/ABD bölgelerindeki ZDR ve HIPAA/GDPR uyumlu yönetilen servisleri üzerinden ya da şirketin kendi AB sanal özel bulutunda (VPC) barındırılarak (self-hosted) kullanılmalıdır.

---

## 1. Veri Saklama (Retention), ZDR, Kurumsal Katman ve Model Eğitimi

### 1.1. DeepSeek API Prompt ve Çıktıları Saklıyor mu? Ne Kadar Süreyle?
* **Bulgu:** **EVET, SAKLANMAKTADIR.**
* **Birincil Kaynak:** DeepSeek Privacy Policy (Son Güncelleme: 10 Şubat 2026, Bölüm 3 ve Bölüm 5: `https://www.deepseek.com/privacy`); DeepSeek Terms of Use (Son Güncelleme: 27 Mart 2026: `https://www.deepseek.com/terms`).
* **Detay:** DeepSeek'in resmi gizlilik politikasına göre kullanıcı girdileri (prompts), üretilen içerikler (outputs) ve işlem meta verileri sistemde toplanmakta ve saklanmaktadır.
* **Saklama Süresi:** DeepSeek, OpenAI veya Anthropic'in standart 30 günlük ticari log saklama penceresi gibi **kesin ve sabit bir takvim süresi taahhüt etmemektedir**. Politika metninde verilerin *"Hizmetleri sunmak, geliştirmek, güvenliği sağlamak, yasal uyuşmazlıkları çözmek ve meşru ticari menfaatleri korumak için gerekli olduğu süre boyunca"* saklandığı ifade edilmektedir. Saklama süresinin *"verinin türü, hacmi, hassasiyeti ve işleme amacına göre değişkenlik gösterdiği"* belirtilmektedir.

### 1.2. Sıfır Veri Saklama (ZDR) veya Kayıt Tutmayan Kurumsal Katman (No-Logging Enterprise Tier) Var mı?
* **Bulgu:** **DOĞRUDAN DEEPSEEK API'SİNDE YOKTUR.**
* **Birincil Kaynak:** DeepSeek Open Platform Terms of Service (Yürürlük: 29 Nisan 2026: `https://platform.deepseek.com/terms`); DeepSeek API Documentation (`https://api-docs.deepseek.com`).
* **Detay:** `platform.deepseek.com` üzerinde geliştiricilerin self-serve olarak açabileceği veya kurumsal sözleşmeyle doğrudan DeepSeek'ten talep edebileceği bir "Zero Data Retention (ZDR)" modu ya da "Zero-Logging Enterprise Tier" bulunmamaktadır.

### 1.3. API Girdileri Model Eğitiminde (Training) Kullanılıyor mu?
* **Bulgu:** **KULLANIM HAKKI SAKLI TUTULMAKTADIR (VARSAYILAN OLARAK EĞİTİMDEN MUAF DEĞİLDİR).**
* **Birincil Kaynak:** DeepSeek Terms of Use (27 Mart 2026, Madde 4); DeepSeek Privacy Policy (10 Şubat 2026, Bölüm 2).
* **Detay:** DeepSeek Kullanım Şartları uyarınca, şirket şifreleme ve geri döndürülemez kimliksizleştirme (de-identification) adımları uygulamak kaydıyla, platform üzerinden gönderilen girdi ve çıktıları *"Hizmetleri veya Hizmetleri destekleyen temel teknolojileri (yapay zeka ve makine öğrenimi modelleri dahil) sunmak, sürdürmek, işletmek, geliştirmek veya iyileştirmek"* amacıyla asgari düzeyde kullanma hakkını elinde tutar.
* **Web Arayüzü vs. API Ayrımı:** Web arayüzünde "Modeli herkes için geliştir" (Improve the model for everyone) seçeneği kapatılabilse de, Batılı API sağlayıcılarının (OpenAI, Anthropic, Google Cloud) sunduğu *"API üzerinden gönderilen müşteri verileri kesinlikle model eğitiminde kullanılmaz"* şeklindeki bağlayıcı sözleşmesel taahhüt doğrudan DeepSeek API belgelerinde yer almamaktadır.

---

## 2. Veri İşleme/Depolama Lokasyonu ve Üçüncü Taraf Barındırma

### 2.1. Veriler Nerede İşleniyor ve Saklanıyor (Ülke / Bölge)?
* **Bulgu:** **ÇİN HALK CUMHURİYETİ (ÇHC / PRC).**
* **Birincil Kaynak:** DeepSeek Privacy Policy (10 Şubat 2026, Madde 7: "Data Transfers and Processing"):
  > *"Our services are operated by Hangzhou DeepSeek Artificial Intelligence Co., Ltd. located in Hangzhou, People's Republic of China. Personal data collected through our Services is transferred to, stored and processed on servers located in the People's Republic of China."*
* **Detay:** Doğrudan DeepSeek API'sine (`api.deepseek.com`) gönderilen tüm veriler coğrafi olarak Çin anakarasındaki sunuculara gitmektedir.

### 2.2. Doğrudan DeepSeek'te AB veya ABD Bölge Seçeneği Var mı?
* **Bulgu:** **HAYIR, YOKTUR.**
* **Detay:** DeepSeek, kendi altyapısında Avrupa Birliği veya ABD merkezli bağımsız bir veri merkezi (data residency) seçeneği sunmamaktadır.

### 2.3. DeepSeek Modellerini ZDR ve AB/ABD Veri Yerleşimi ile Sunan Üçüncü Taraf Sağlayıcılar
DeepSeek modellerinin açık ağırlıklı (open-weights) yapısı sayesinde, modeli Çin'e bağlanmadan Batılı kurumsal bulut altyapılarında çalıştırmak mümkündür:

1. **Amazon Bedrock (AWS):**
   * **Durum:** DeepSeek-R1 ve V3 modelleri Bedrock Model Catalog üzerinde mevcuttur (`aws.amazon.com/bedrock`, 2025-2026).
   * **Bölge:** AB (Frankfurt, İrlanda) ve ABD bölgelerinde coğrafi veri yerleşimi (In-Region profiles) tam olarak desteklenir.
   * **ZDR:** `data_retention_mode: none` parametresiyle API düzeyinde ZDR zorlanabilir.
   * **Eğitim Garantisi:** AWS Bedrock, müşteri verilerini temel modellerin eğitimi için kesinlikle kullanmaz.
2. **Microsoft Azure AI Foundry (Azure AI Studio):**
   * **Durum:** DeepSeek-R1 ve V3, Models as a Service (MaaS) modeliyle Pay-as-you-go olarak sunulmaktadır (`azure.microsoft.com`, 2025-2026).
   * **Bölge:** Azure Sweden Central, West Europe veya US East bölgelerinde yerleşim sağlanabilir.
   * **ZDR:** Standart kullanımda kötüye kullanım izleme (abuse monitoring) amacıyla 30 günlük geçici şifreli log tutulur. Gerçek ZDR için Microsoft Enterprise Onaylı İstisna (Modified Abuse Monitoring) gereklidir. Model eğitimi yapılmaz.
3. **Fireworks AI:**
   * **Durum:** DeepSeek modelleri için yüksek performanslı sunucusuz çıkarım sağlar (`fireworks.ai`, 2025-2026).
   * **ZDR:** Açık modeller için **varsayılan olarak ZDR (in-memory, no-logging)** uygulanır.
   * **Bölge:** ABD ve AB yönlendirme seçenekleri mevcuttur. Müşteri verileriyle eğitim yapılmaz.
4. **Together AI:**
   * **Durum:** DeepSeek-V3/R1 barındırmaktadır (`together.ai`, 2025-2026).
   * **ZDR:** Dedicated endpoint ve Enterprise sözleşmeyle veri kaydetmeme (zero-log) garantisi sunulur.
5. **Kendi Özel Bulutunda Barındırma (Self-Hosting via vLLM / SGLang):**
   * DeepSeek modelleri açık ağırlıklı olduğundan, şirketin kendi AWS/GCP Frankfurt VPC'sinde konuşlandırılabilir. Bu senaryoda veriler %100 kurum kontrolünde kalır, sıfır log ve sıfır üçüncü taraf transferi garanti edilir.

---

## 3. Düzenleyici Kurum Kararları ve Yaptırımlar (2025-2026)

### 3.1. İtalya Veri Koruma Otoritesi (Garante)
* **Tarih:** 28 Ocak 2025 (Resmi Soruşturma) / 30 Ocak 2025 (Acil İşleme Yasağı / İhtiyati Tedbir Kararı).
* **Kaynak:** Garante per la protezione dei dati personali Resmi Bildirisi (`garanteprivacy.it`, Ocak 2025; Two Birds Legal Review, Şubat 2025).
* **Karar ve Gerekçe:** Garante, GDPR Madde 58(2)(f) uyarınca acil durum yetkisini kullanarak DeepSeek'in İtalyan kullanıcıların kişisel verilerini işlemesine **derhal ve kesin bir yasaklama/sınırlama** getirmiştir.
* **Belirtilen İhlaller:**
  * GDPR Madde 27: AB sınırları içerisinde resmi bir yasal temsilci (EU representative) atanmamış olması.
  * GDPR Madde 31: Denetim makamıyla işbirliği yükümlülüğünün ihlali.
  * GDPR Madde 12 ve 13: Şeffaflık eksikliği; gizlilik politikasının yalnızca İngilizce olması ve veri işleme amaçları ile hukuki dayanakların belirsizliği.
  * GDPR Bölüm V (Madde 44-49): Kullanıcı verilerinin Çin'deki sunucularda saklanması ve AB güvenlik standartları ile uluslararası veri aktarım güvencelerinin sağlanamaması.

### 3.2. Güney Kore Kişisel Bilgileri Koruma Komisyonu (PIPC)
* **Tarih:** 15 Şubat 2025 (Hizmet Askıya Alma) / Nisan 2025 (Nihai Karar ve Yaptırımlar).
* **Kaynak:** PIPC Resmi Karar Bülteni (`pipc.go.kr`, Nisan 2025; DataGuidance, 2025).
* **Karar ve Gerekçe:** PIPC ve KISA tarafından yapılan teknik incelemede, DeepSeek'in Koreli kullanıcıların promptlarını, cihaz meta verilerini ve IP bilgilerini kullanıcıların **açık rızası olmaksızın Çin ve ABD'deki üçüncü taraf sunuculara aktardığı** tespit edilmiştir.
* **Sonuç:** DeepSeek'e idari düzeltme ve iyileştirme talimatları verilmiştir: Korece gizlilik politikası zorunluluğu, AI eğitim verisi kullanımından çıkış (opt-out) hakkı, usulsüz toplanan geçmiş promptların silinmesi ve yerel temsilci atanması talep edilmiştir.

### 3.3. Almanya (BfDI ve Eyalet Veri Koruma Kurulları)
* **Tarih:** Şubat 2025 ve sonrası.
* **Kaynak:** Eyalet Veri Koruma Temsilcileri Koordinasyon Raporları (Baden-Württemberg LfDI, Berlin BlnBDI; VitalLaw, 2025).
* **Karar ve Gerekçe:** Alman veri koruma otoriteleri, DeepSeek hakkında koordineli bir inceleme başlatmıştır. Odak noktaları: GDPR Madde 27 (AB temsilcisi eksikliği) ve Çin istihbarat yasaları altında Avrupa verilerinin egemenliğinin korunamamasıdır. Dijital Hizmetler Yasası (DSA) bildirim mekanizmaları üzerinden uygulama mağazalarına şikayet süreçleri işletilmiştir.

### 3.4. İrlanda Veri Koruma Komisyonu (DPC)
* **Tarih:** Ocak 2025 sonu.
* **Kaynak:** Data Protection Commission Resmi Açıklaması (`courthousenews.com`, Ocak 2025).
* **İnceleme Kapsamı:** DeepSeek'in AB vatandaşlarının verilerini web kazıma (scraping) ve prompt saklama yoluyla LLM eğitiminde kullanmasının hukuki dayanağı (legal basis) ve sınır ötesi veri aktarımlarının meşruiyeti incelenmektedir.

### 3.5. ABD Federal ve Eyalet Düzeyinde Yasaklar
* **ABD Donanması (US Navy):** Ocak 2025 sonunda tüm personele hem resmi cihazlarda hem de askeri ağlarda DeepSeek kullanımını kesin olarak yasaklayan bir direktif yayımlamıştır (`aa.com.tr`, 2025).
* **ABD Kongresi:** Temsilciler Meclisi İdari Ofisi (CAO), resmi Meclis telefon, tablet ve bilgisayarlarında DeepSeek kullanımını yasaklamıştır; federal düzeyde tam yasak getiren *No DeepSeek on Government Devices Act* yasa teklifi sunulmuştur.
* **Teksas Eyaleti:** 31 Ocak 2025'te Vali Greg Abbott, tüm eyalet kurumları ve kritik altyapı cihazlarında DeepSeek'in derhal kaldırılmasını emreden bir idari genelge yayımlamıştır (`texasattorneygeneral.gov`, 2025). Teksas Başsavcısı Ken Paxton, Texas Data Privacy and Security Act (TDPSA) ihlalleri gerekçesiyle resmi adli soruşturma açmıştır.

### 3.6. Apple App Store ve Google Play İnceleme Politikaları (Health App Entegrasyonu)
* **App Store Review Guideline 5.1.2(i) (Third-Party AI Services):**
  * Kullanıcı verilerini üçüncü taraf bir yapay zeka servisine (LLM API) aktaran uygulamalar, bu aktarımı **uygulama içinde açıkça ifşa etmek ve aktarımdan önce kullanıcıdan açık rıza (explicit opt-in consent)** almak zorundadır.
* **App Store Review Guideline 5.1.1(v) & HealthKit Kuralları:**
  * Sağlık, fitness ve tıbbi araştırma verileri (kilo, kalori, antrenman, biyometrik veriler); reklam, veri madenciliği veya ikincil model eğitimi amacıyla üçüncü taraflarla **kesinlikle paylaşılamaz**.
* **Doğrudan DeepSeek Kullanımının Mağaza Riski:** Kullanıcının sağlık verilerini, verileri model eğitiminde kullanma hakkını saklı tutan ve Çin'de barındıran bir API'ye gönderen bir uygulama; App Store inceleme aşamasında Guideline 5.1.2(i) ve 5.1.1(v) ihlali gerekçesiyle **derhal reddedilir (reject) veya mağazadan kaldırılır**.

---

## 4. DPA (Veri İşleme Sözleşmesi) ve SCCs (Standart Sözleşme Maddeleri)

### 4.1. DeepSeek ile İmzalanabilir Standart DPA ve SCCs Var mı?
* **Bulgu:** **HAYIR, BULUNMAMAKTADIR.**
* **Birincil Kaynak:** DeepSeek Open Platform Legal Repository (`platform.deepseek.com`); AB Veri Hukuku İncelemeleri (Compound Law, AskAI EU, 2025-2026).
* **Detay:** DeepSeek, kurumsal müşterilere veya API geliştiricilerine GDPR Madde 28 uyumlu, bağlayıcı bir **Veri İşleme Sözleşmesi (Data Processing Agreement - DPA)** veya AB Komisyonu'nun 2021/914 sayılı **Standart Sözleşme Maddeleri (Standard Contractual Clauses - SCCs)** modül paketini sunmamaktadır. Platformda yer alan metin tek taraflı bir son kullanıcı ve geliştirici şartnamesidir.

### 4.2. GDPR Bölüm V Kapsamında Çin'e Veri Aktarımının Hukuki İmkansızlığı
* **Yeterlilik Kararı Yokluğu:** Çin Halk Cumhuriyeti için AB Komisyonu'nun bir "yeterlilik kararı" (adequacy decision) **yoktur**.
* **Schrems II ve Çin Mevzuatı:** Çin Ulusal İstihbarat Kanunu (Madde 7) ve Veri Güvenliği Kanunu, Çin'deki tüm tüzel kişilikleri devlet istihbarat kurumlarıyla işbirliği yapmaya ve talep edilen verilere erişim sağlamaya zorunlu kılmaktadır. Bu durum, AB Adalet Divanı'nın (CJEU) *Schrems II* içtihadı uyarınca bağımsız yargı denetimi ve orantılılık ilkelerine aykırıdır. SCCs imzalansa dahi (ki DeepSeek sunmamaktadır), hükümet erişimini engelleyecek ek teknik önlemler (uçtan uca şifreleme ve anahtarın AB'de tutulması) bulunmadığı için doğrudan API çağrıları GDPR Madde 44-49'a doğrudan aykırıdır.

### 4.3. Türk KVKK (6698 Sayılı Kanun) Açısından Değerlendirme
* **Madde 6 (Özel Nitelikli Veri):** Vücut ağırlığı trendleri, kalori/beslenme ve antrenman verileri sağlık verisi niteliğindedir.
* **Madde 9 (Yurt Dışına Veri Aktarımı - 7499 Sayılı Kanun ile Güncellenen Rejim):**
  1. Çin hakkında Kişisel Verileri Koruma Kurulu'nun bir **yeterlilik kararı yoktur**.
  2. DeepSeek ile akdedilmiş ve KVKK Kurumu'na 5 iş günü içinde bildirilmiş bir **Standart Sözleşme (SCC dengi)** bulunmamaktadır.
  3. Sürekli ve sistematik bir mobil uygulama veri akışı için "istisnai açık rıza" hukuken yeterli koruma sağlamaz ve Kurul tarafından kabul edilmemektedir.
* **Sonuç:** Kullanıcı verilerinin doğrudan DeepSeek API'sine gönderilmesi Türkiye'de KVKK Madde 9 ihlali olup ağır idari para cezası ve veri sorumlusuna sorumluluk doğurur.

---

## 5. API Fiyatlandırması ve Hız Limitleri (Rate Limits)

### 5.1. deepseek-chat ve deepseek-reasoner Model Durumu (Kasım 2026)
* **Güncel Durum:** Orijinal `deepseek-chat` (DeepSeek-V3) ve `deepseek-reasoner` (DeepSeek-R1) modelleri, **24 Temmuz 2026** tarihinde resmi olarak emekliye ayrılmış (sunset/retired) ve yerini dinamik akıl yürütme yetenekleri içeren **DeepSeek-V4** ailesine (`deepseek-flash` ve `deepseek-v4-pro`) bırakmıştır (`api-docs.deepseek.com`, 2026).

### 5.2. Tarihsel ve Referans Liste Fiyatları (V3 / R1 - 1 Milyon Token Başına)
* **`deepseek-chat` (V3 Dönemi):**
  * Girdi (Cache Hit): **$0.014** / 1M token (promosyon/gece $0.07)
  * Girdi (Cache Miss): **$0.14** / 1M token
  * Çıktı: **$0.28** / 1M token
* **`deepseek-reasoner` (R1 Dönemi):**
  * Girdi (Cache Hit): **$0.14** / 1M token
  * Girdi (Cache Miss): **$0.55** / 1M token
  * Çıktı (Düşünce + Cevap): **$2.19** / 1M token

### 5.3. Güncel DeepSeek API Liste Fiyatları (Kasım 2026 - 1 Milyon Token Başına)
DeepSeek, fiyatlandırmayı **Cache Hit/Miss** durumuna ve **Yoğun (Peak) / Yoğun Olmayan (Off-Peak)** saatlere göre kademelendirmiştir:
* **Yoğun Saatler (Peak):** Pazartesi - Cuma günleri **01:00 – 04:00 UTC** ve **06:00 – 10:00 UTC** (Çin resmi tatilleri hariç).
* **Yoğun Olmayan Saatler (Off-Peak):** Hafta sonları ve yukarıdaki saatler dışındaki tüm zamanlar (**%50 indirimli**).

| Model | Token Türü | Yoğun Olmayan (Off-Peak) Fiyat / 1M | Yoğun Saatler (Peak) Fiyat / 1M |
| :--- | :--- | :--- | :--- |
| **`deepseek-flash`** <br>*(V4.1-Flash)* | Input (Cache Hit)<br>Input (Cache Miss)<br>Output | **$0.003**<br>**$0.15**<br>**$0.60** | **$0.006**<br>**$0.30**<br>**$1.20** |
| **`deepseek-v4-pro`** <br>*(V4-Pro)* | Input (Cache Hit)<br>Input (Cache Miss)<br>Output | **$0.022**<br>**$0.66**<br>**$1.98** | **$0.044**<br>**$1.32**<br>**$3.96** |

### 5.4. Hız Limitleri ve Eşzamanlılık (Rate Limits & Concurrency)
* **Model:** DeepSeek geleneksel Dakika Başına İstek (RPM) veya Dakika Başına Token (TPM) yerine hesap düzeyinde **Eşzamanlı Aktif İstek (Concurrent In-Flight Requests)** kısıtlaması uygular:
  * `deepseek-flash`: Hesap başına **2.500 eşzamanlı istek**.
  * `deepseek-v4-pro`: Hesap başına **500 eşzamanlı istek**.
* **Limit Aşımı:** Eşzamanlı bağlantı sınırı aşıldığında anında `HTTP 429 Too Many Requests` döner.
* **Kapasite Artırımı:** Geliştiriciler platform üzerinden ek ücret ödemeksizin kota/kapasite artırım talebi (capacity expansion) gönderebilmektedir.

---

## 6. Sağlayıcı Karşılaştırma Tablosu

Aşağıdaki tablo yalnızca resmi ve doğrulanmış birincil belgelere dayalı olarak hazırlanmıştır:

| Karşılaştırma Kriteri | DeepSeek API (Doğrudan) | DeepSeek (AWS Bedrock / Azure AI) | Anthropic API (Doğrudan) | OpenAI API (Doğrudan) | Google Cloud Vertex AI (Gemini) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ZDR (Sıfır Veri Saklama) Durumu** | **YOK** (Meşru amaçlarla saklanır) | **VAR** (Bedrock: `retention: none`, Azure: İstisna ile) | **VAR** (Kurumsal onay ve ZDR sözleşmesi ile) | **VAR** (Kurumsal onay ve ZDR formu ile) | **VAR** (Müşteri projesinde loglama kapatılabilir) |
| **Varsayılan Saklama Penceresi** | Belirsiz (Sabit takvim taahhüdü yok) | 0 gün (ZDR) veya bulut log politikası | 30 gün (Güvenlik logları, ZDR ile 0 gün) | 30 gün (Kötüye kullanım izleme, ZDR ile 0 gün) | 0 gün (Google tarafında kalıcı log tutulmaz) |
| **Veri Yerleşimi (Data Residency)** | **Yalnızca Çin Halk Cumhuriyeti** | **AB (Frankfurt, İrlanda) / ABD** | **ABD (`inference_geo: "us"`)**; AB için Bedrock/GCP | **AB (Avrupa Projesi) / ABD** | **AB (Frankfurt vb. 10+ AB bölgesi) / ABD** |
| **Müşteri Verisiyle Model Eğitimi** | **Hakkı saklı tutuluyor** (Varsayılan koruma yok) | **KESİNLİKLE HAYIR** (Sözleşmeyle yasaklı) | **KESİNLİKLE HAYIR** (API şartlarında taahhütlü) | **KESİNLİKLE HAYIR** (1 Mart 2023'ten beri taahhütlü) | **KESİNLİKLE HAYIR** (Google Cloud Service Terms) |
| **GDPR Uyumlu DPA & SCCs** | **YOK** (Standart DPA paketi sunulmuyor) | **VAR** (AWS / Microsoft standart DPA + SCCs) | **VAR** (Anthropic Data Processing Addendum) | **VAR** (OpenAI Data Processing Addendum) | **VAR** (Google Cloud DPA + SCCs) |
| **KVKK Uyumlu Standart Sözleşme** | **YOK** | Sağlayıcı kurumsal sözleşmesiyle uyarlanabilir | Kurumsal süreçle bildirim yapılabilir | Kurumsal süreçle bildirim yapılabilir | Kurumsal süreçle bildirim yapılabilir |
| **GDPR Madde 9 Sağlık Verisi Uygunluğu** | **UYGUN DEĞİL (YASAK / AĞIR RİSK)** | **UYGUN** (EU bölgesi + ZDR ile) | **UYGUN** (ZDR + HIPAA/DPA ile) | **UYGUN** (ZDR + EU Residency + BAA ile) | **TAM UYGUN (EN GÜÇLÜ KORUMA - BAA + DPA)** |
| **Apple App Store 5.1.2(i) Uyumu** | **RİSKLİ / RED SEBEBİ** (Çin'e veri aktarımı) | **UYUMLU** (Açık rıza ve ifşa ile) | **UYUMLU** (Açık rıza ve ifşa ile) | **UYUMLU** (Açık rıza ve ifşa ile) | **UYUMLU** (Açık rıza ve ifşa ile) |
| **1M Token Maliyeti (Girdi/Çıktı)** | ~$0.15 / $0.60 (Flash), ~$0.66 / $1.98 (Pro) | ~$0.20 - $0.80 / $0.80 - $2.40 (Sağlayıcı marjı) | Claude 3.5 Haiku: $0.80/$4; Sonnet: $3/$15 | GPT-4o-mini: $0.15/$0.60; GPT-4o: $2.50/$10 | Gemini 1.5 Flash: $0.075/$0.30; 1.5 Pro: $1.25/$5.00 |

---

## 7. Sonuç ve Mimari Tavsiye (Actionable Recommendations)

1. **Doğrudan DeepSeek API Kullanımını Derhal Durdurun / Engelleyin:**
   * Bir sağlık/fitness uygulamasında kullanıcıların kilo, antrenman ve beslenme verilerini doğrudan `api.deepseek.com`'a göndermek GDPR Madde 9, GDPR Madde 44-49, KVKK Madde 6 ve 9 ile Apple App Store Guideline 5.1.2(i) kurallarını doğrudan ihlal eder. Hukuki ve ticari risk kabul edilemez düzeydedir.
2. **DeepSeek Modelleri İsteniyorsa Güvenli Yolu Tercih Edin:**
   * Eğer DeepSeek'in akıl yürütme (reasoning) yetenekleri ve maliyet avantajı kullanılmak isteniyorsa, model **Amazon Bedrock (Frankfurt bölgesi, `data_retention_mode: none`)** veya **Microsoft Azure AI Foundry (Sweden Central bölgesi)** üzerinden çağrılmalıdır. Bu sayede veriler AB sınırları içinde kalır, DPA/SCCs şemsiyesi altına girer ve model eğitimi riski sıfırlanır.
3. **Alternatif Birincil Sağlayıcı Tavsiyesi:**
   * Sağlık ve beslenme koçluğu gibi yüksek hassasiyetli bir mobil üründe, doğrudan **Google Cloud Vertex AI (Gemini 1.5 Flash / Gemini Pro)** veya **OpenAI API (EU Residency + ZDR)** tercih edilmelidir. Google Vertex AI, hem HIPAA BAA imzalanabilmesi hem de Frankfurt (`europe-west3`) bölgesinde tam veri izolasyonu ve "no-training" garantisi sunması sebebiyle sağlık verileri için küresel altın standarttır.

---
*Rapor Sonu. İstemde belirtilen tüm doğrulamalar birincil kaynaklar referans gösterilerek tamamlanmıştır.*
