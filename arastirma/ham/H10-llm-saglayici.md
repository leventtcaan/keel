# H10 — LLM sağlayıcı karşılaştırması (ZDR + eğitim yok kapısı)

**Okuma tarihi:** Tüm kaynaklar 2026-10-03'te okundu. Yalnız sağlayıcıların resmî sayfaları kullanıldı.
Gerçek API çağrısı, kayıt ya da harcama yapılmadı.
**Kapı (ürün sahibinin şartı):** Resmî sayfada (a) sıfır veri saklama (ZDR) **ve** (b) API verisinin eğitimde
kullanılmadığı yazmıyorsa sağlayıcı elenir.
**Önemli genel bulgu:** Değerlendirilen sağlayıcıların **hiçbirinde ZDR varsayılan değil.** Hepsinde başvuru/onay ya da
sözleşme gerekiyor. Aşağıda "geçer" = "ZDR + eğitim yok resmî sayfada yazılı ve elde edilebilir" anlamındadır.
Onay garantisi yok.

---

## 1. Özet tablo

| Sağlayıcı | Model (en küçük/ucuz güncel) | Giriş / Çıkış ($/1M token) | Varsayılan saklama | ZDR nasıl elde edilir | Eğitimde kullanım (API) | Yapılandırılmış çıktı (JSON schema) | AB veri konumu | Eleme |
|---|---|---|---|---|---|---|---|---|
| **Anthropic** (Claude API) | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | $1 / $5 | 30 gün | Satış ekibine başvuru + Anthropic onayı + kuruluş bazında anlaşma | Varsayılan **hayır** (ticari şartlarda yasak) | Evet, GA; Haiku 4.5 destekli; ZDR kapsamında "qualified" (şema 24 saat önbellekte) | **Yok.** Çıkarım konumu yalnız `global`/`us`; Haiku 4.5'te `inference_geo` hiç yok | **Geçer, koşullu** (ZDR sözleşmesi gerekiyor). AB konumu yok |
| **OpenAI** (API) | GPT-6 Luna (`gpt-6-luna`) · ucuz alternatif: `gpt-5-nano` | Luna $0.10 / $0.50 · nano $0.05 / $0.40 | Kötüye kullanım kayıtları 30 güne kadar; Responses API durumu ≥30 gün (`store` açıksa) | OpenAI ön onayı + ek şartların kabulü (satışla iletişim) | Varsayılan **hayır** (opt-in hariç) | Evet (Luna sayfasında "Supported"); şema "system data" sayılıyor | **Var:** Avrupa (EEA + İsviçre) için hem depolama hem işleme (`eu.api.openai.com`). MAM ya da ZDR onayı + Modified Retention ek sözleşmesi şart; +%10 | **Geçer, koşullu** (onay gerekiyor). AB işleme var |
| **Google — Gemini Developer API** (AI Studio) | Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | $0.25 / $1.50 (ücretli katman) | Kötüye kullanım kayıtları 55 gün | **Garanti edilen ZDR yok.** Google, ZDR için Vertex'i öneriyor | Ücretli katmanda **hayır**; ücretsiz katmanda **evet** + insan incelemesi | Evet (JSON Schema) | [doğrulanmadı] (bu API için bölge seçeneği bulunamadı) | **Elenir:** Garanti edilen ZDR yok (55 gün kayıt) |
| **Google — Vertex AI** (artık adı "Gemini Enterprise Agent Platform") | Gemini 3.1 Flash-Lite (GA, 7 Mayıs 2026) | Global $0.25 / $1.50 · Global dışı (AB dahil) $0.275 / $1.65 | Bellek içi önbellek 24 saat (kapatılabilir). Kötüye kullanım kaydı yalnız sınıflandırıcı şüphelenirse, 90 güne kadar | Kötüye kullanım izlemesi için istisna talebi (onaylı). Google Cloud Master Agreement varsa varsayılan muaf. Ayrıca önbellek kapatılmalı, grounding kullanılmamalı | **Hayır** (Service Specific Terms "Training restriction") | Evet ("Structured output: Supported") | **Var:** AB çoklu bölge uç noktası (`eu`), ML işleme Avrupa içinde | **Geçer, koşullu** (istisna onayı + yapılandırma gerekiyor) |
| **Mistral** (Mistral Studio API, AB merkezli) | Ministral 3 (3B/8B) · Mistral Small 4 | 3B $0.10 / $0.10 · 8B $0.15 / $0.15 · Small 4 $0.15 / $0.60 | Giriş/çıkış, kötüye kullanım izleme için 30 kayan gün | Yalnız pay-as-you-go'da; gerekçeli başvuru, Mistral takdirine göre onay/ret | Şartlar: eğitim yok, **ama** varsayılan opt-in/opt-out ayarına bağlı. API'nin varsayılan değeri [doğrulanmadı]; kapatma anahtarı var. Labs/Preview modelleri her durumda eğitimde kullanılıyor | Evet ("Custom Structured Outputs", JSON Schema); model listesi [doğrulanmadı] | **Varsayılan AB'de barındırma.** Özelliğe göre AB dışına geçici aktarım olabilir. "Regional data processing controls" Enterprise API'lerde, liste fiyatının %75 üstü | **Geçer, koşullu** (ZDR onayı + eğitim anahtarının kapalı olduğu doğrulanmalı + Labs/Preview modeli kullanılmamalı) |

---

## 2. Sağlayıcı ayrıntıları (kaynaklı)

### 2.1 Anthropic — Claude API

**Model ve fiyat**
- Güncel en küçük model Claude Haiku 4.5, fiyatı "$1 / input MTok, $5 / output MTok". API kimliği
  `claude-haiku-4-5-20251001`. — https://platform.claude.com/docs/en/about-claude/models/overview (2026-10-03)
- Fiyat tablosu aynı: Haiku 4.5 için Base input $1 / MTok, Output $5 / MTok. Batch'te %50 indirim var ($0.50 / $2.50).
  — https://platform.claude.com/docs/en/about-claude/pricing (2026-10-03)
- **Ömür riski:** Haiku 4.5 "Active" durumda. Emeklilik "Not sooner than October 15, 2026". Anthropic emeklilikten en az
  60 gün önce bildirim yapıyor. Henüz kullanımdan kaldırma bildirimi yok. Bir sonraki ucuz model Sonnet 5.5 ($2 / $10).
  — https://platform.claude.com/docs/en/about-claude/model-deprecations (2026-10-03)

**Saklama ve ZDR**
- Varsayılan: "we automatically delete inputs and outputs on our backend within 30 days".
  — https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data (2026-10-03)
- ZDR **varsayılan değil.** "To request ZDR for your organization, contact the Anthropic sales team." ZDR kuruluş bazında
  açılıyor.
  — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention (2026-10-03)
- ZDR "subject to Anthropic's approval". Kullanım politikası için güvenlik sınıflandırıcı sonuçları ZDR altında da tutuluyor.
  — https://privacy.claude.com/en/articles/8956058-i-have-a-zero-data-retention-agreement-with-anthropic-what-products-does-it-apply-to (2026-10-03)
- İstisnalar: İşaretlenen (flagged) içerik, düzenlemeden bağımsız olarak "for up to 2 years" tutulabilir. Covered Models
  (Fable/Mythos) ZDR'ye kapalı. Haiku 4.5 bunlardan biri değil. Batch API ve Files API ZDR dışında. Messages API
  ZDR kapsamında. — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention (2026-10-03)

**Eğitim**
- "Anthropic may not train models on Customer Content from Services." (Commercial Terms, B bölümü, yürürlük 17 Haziran 2025)
  — https://www.anthropic.com/legal/commercial-terms (2026-10-03)
- "By default, we will not use your inputs or outputs from our commercial products". Tüketici ürünleri (Free/Pro/Max)
  ayrı bir politikaya tabi. — https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training (2026-10-03)
- DPA, ticari şartlara atıfla otomatik dahil. — https://www.anthropic.com/legal/commercial-terms (2026-10-03)

**Yapılandırılmış çıktı**
- Structured outputs GA. Parametre `output_config.format`. Desteklenen modeller arasında `claude-haiku-4-5-20251001` var.
  — https://platform.claude.com/docs/en/build-with-claude/structured-outputs (2026-10-03)
- ZDR açısından "Yes (qualified)": İstem ve yanıt saklanmıyor, yalnız JSON şeması son kullanımdan itibaren 24 saate kadar
  önbellekte tutuluyor. — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention (2026-10-03)

**Veri konumu**
- `inference_geo` yalnız iki değer alıyor: `"global"` (varsayılan) ve `"us"`. Workspace geo için "Currently, `"us"` is the only
  available workspace geo." Haiku 4.5'te `inference_geo` gönderilirse 400 hatası dönüyor. **AB seçeneği yok.**
  — https://platform.claude.com/docs/en/manage-claude/data-residency (2026-10-03)
- Not: Claude, Bedrock ve Google Cloud üzerinden bölgesel uç noktalarla da sunuluyor. O durumda veri işleyen bulut
  sağlayıcısı oluyor ve ZDR/saklama kuralları o platformunki. Haiku 4.5'in Google Cloud AB bölgesinde bulunup bulunmadığı
  ve oradaki ZDR durumu [doğrulanmadı].
  — https://platform.claude.com/docs/en/about-claude/pricing (2026-10-03)

### 2.2 OpenAI — API

**Model ve fiyat**
- GPT-6 Luna "Our most efficient model for focused, high-volume tasks."
  — https://developers.openai.com/api/docs/models (2026-10-03)
- Standard katman, kısa bağlam: `gpt-6-luna` giriş $0.10, önbellekli $0.01, çıkış $0.50. `gpt-5-nano` $0.05 / $0.40.
  `gpt-5-mini` $0.25 / $2.00. `gpt-4.1-nano` $0.10 / $0.40.
  — https://developers.openai.com/api/docs/pricing (2026-10-03)
- Luna sayfası: Structured Outputs "Supported". Responses ve Chat Completions uç noktalarında var. Bilgi kesim tarihi
  18 Mayıs 2026. Çıkış tarihi sayfada yazmıyor [doğrulanmadı].
  — https://developers.openai.com/api/docs/models/gpt-6-luna (2026-10-03)

**Saklama ve ZDR**
- Varsayılan: Kötüye kullanım kayıtları "retained for up to 30 days" (yasa gerektirirse daha uzun).
  — https://developers.openai.com/api/docs/guides/your-data (2026-10-03)
- ZDR **varsayılan değil:** "subject to prior approval by OpenAI and acceptance of additional requirements". Satış ekibiyle
  iletişim gerekiyor. — aynı sayfa (2026-10-03)
- ZDR altında `/v1/responses` ve `/v1/chat/completions` için `store` her zaman false sayılıyor. İkisi de ZDR uygun.
  `/v1/batches` ve `/v1/files` ZDR dışında. — aynı sayfa (2026-10-03)
- **Risk:** OpenAI, önceden yazılı bildirimle belirli müşteriler için modelleri ZDR'ye uygunsuz hale getirme hakkını saklı
  tutuyor ("Private Retention with PSP", "Safety Retention"). — aynı sayfa (2026-10-03)
- ZDR'yi koruyan "Private Safety Processing" Eylül 2026'da kademeli olarak açılıyor. Görüntülerde CSAM istisnası var
  (metin kullanımımızı etkilemiyor).
  — https://openai.com/index/offering-zero-data-retention-for-frontier-models/ (2026-10-03)

**Eğitim**
- "data sent to the OpenAI API is not used to train or improve OpenAI models" (opt-in hariç).
  — https://developers.openai.com/api/docs/guides/your-data (2026-10-03)
- "By default, we do not use data from … our API platform … for training". DPA imzalanması destekleniyor.
  — https://openai.com/business-data/ (2026-10-03)
- Tüketici (ChatGPT bireysel) şartları ayrı. `openai.com/policies/*` sayfaları otomatik okumada 403 verdi. Tüketici
  ayrıntısı [doğrulanmadı].

**Veri konumu**
- Avrupa (EEA + İsviçre), `eu.api.openai.com`: Storage evet, Processing evet. Not düşülmüş: "Requires MAM or ZDR".
  — https://developers.openai.com/api/docs/guides/your-data (2026-10-03)
- "you must be approved for abuse monitoring controls, and execute a Modified Retention amendment." — aynı sayfa
- Fiyat: Bölgesel uç noktalarda 5 Mart 2026 ve sonrasında çıkan modeller için +%10. — https://developers.openai.com/api/docs/pricing (2026-10-03)
- Luna, EU veri konumunu Standard/Flex/Batch ile destekliyor. — https://developers.openai.com/api/docs/guides/your-data (2026-10-03)
- Dikkat: "structured output schema" bölge kapsamı dışındaki "system data" sayılıyor. Şema bölge dışında işlenip
  saklanabilir. Şemaya kullanıcı verisi konmamalı. — aynı sayfa (2026-10-03)
- `gpt-5-nano`'nun EU işleme listesinde olup olmadığı [doğrulanmadı].

### 2.3 Google — Gemini Developer API (AI Studio)

- Ücretli katmanda Google "doesn't use your prompts … or responses to improve our products". Ücretsiz katmanda içerik
  ürün geliştirmede kullanılıyor ve "human reviewers may read" ifadesi geçiyor. EEA, İsviçre ve İngiltere'deki kullanıcılara
  yalnız Paid Services ile hizmet verilebilir. Son değişiklik 2026-04-28.
  — https://ai.google.dev/gemini-api/terms (2026-10-03)
- Kötüye kullanım için saklama "fifty-five (55) days". — https://ai.google.dev/gemini-api/docs/usage-policies (2026-10-03)
- ZDR sayfası: "If your workload requires guaranteed zero data retention … use Vertex AI." Grounding verisi 30 gün
  tutuluyor ve kapatılamıyor. Son güncelleme 2026-09-14. — https://ai.google.dev/gemini-api/docs/zdr (2026-10-03)
- Fiyat (ücretli, Standard): Gemini 3.1 Flash-Lite $0.25 / $1.50. 3.5 Flash-Lite $0.30 / $2.50. 2.5 Flash-Lite
  $0.10 / $0.40. Ücretli satırlarda "Used to improve our products: No".
  — https://ai.google.dev/gemini-api/docs/pricing (2026-10-03)
- **Karar: elenir.** Resmî sayfa bu API için garanti edilen ZDR olmadığını açıkça yazıyor.

### 2.4 Google — Vertex AI (Gemini Enterprise Agent Platform)

**Model ve fiyat**
- Gemini 3.1 Flash-Lite: Launch stage GA, çıkış 7 Mayıs 2026, emeklilik "May 7, 2027 or later". Structured output
  "Supported". Bölgeler: Global ve çoklu bölge `us`, `eu`. ML işleme "Europe: Multi-region". Son güncelleme 2026-10-02.
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-lite (2026-10-03)
- Fiyat: Global giriş $0.25, çıkış $1.50. Global dışı uç noktalar (AB dahil) $0.275 / $1.65. Global dışı fiyat
  1 Temmuz 2026'dan beri geçerli.
  — https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing (yönlendirme:
  https://cloud.google.com/vertex-ai/generative-ai/pricing) (2026-10-03)
- Gemini 2.5 Flash-Lite ($0.10 / $0.40) daha ucuz, ama Vertex'te emeklilik tarihi 20 Ekim 2026. Bu bilgi resmî arama
  sonucu özetinden geliyor; model sayfası ayrıca açılmadı [doğrulanmadı].
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions (2026-10-03)

**Saklama ve ZDR**
- Eğitim: "Google won't use your data to train or fine-tune any AI/ML models without your prior permission". Kural GA ve
  pre-GA modellerin hepsi için geçerli.
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention (2026-10-03)
- ZDR için yapılması gerekenler (aynı sayfa, son güncelleme 2026-10-01):
  - Kötüye kullanım istem kaydı kapsamındaysanız "you can request an exception for abuse monitoring".
  - Grounding with Google Search 3 gün, Maps 30 gün saklıyor ve kapatılamıyor. Kullanılmamalı.
  - Request-response logging varsayılan kapalı. Açılmamalı.
  - Interactions API'de `store` varsayılan true. ZDR için `store = false` verilmeli.
  - Bellek içi önbellek 24 saat. Google bunu ZDR ihlali saymıyor. Proje düzeyinde kapatılabilir.
- Kötüye kullanım izleme: İstemler yalnız sınıflandırıcı şüpheli bulursa kaydediliyor. Kayıtlar 90 güne kadar, projenin
  seçtiği bölgede tutuluyor. "customers with a Google Cloud Master Agreement are exempt … by default." İstisna başvurusunun
  biçimi (form/onay) bu sayfada görünmedi [doğrulanmadı]. Son güncelleme 2026-10-02.
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring (2026-10-03)
- "Advanced AI" modellerinde (Claude Mythos/Fable vb.) 30 gün zorunlu kayıt var. Gemini Flash-Lite bu kapsamda listelenmemiş.
  — aynı sayfa (2026-10-03)

**Veri konumu**
- Global uç nokta "don't provide any data residency guarantees". AB çoklu bölge uç noktası yalnız AB üye devletlerini
  kapsıyor; İngiltere ve İsviçre hariç. Gemini 3.1 Flash-Lite: US ve EU multi-region "Supported". Son güncelleme 2026-10-01.
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency (2026-10-03)
- DPA: Google Cloud Data Processing Addendum (CDPA) geçerli.
  — https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention (2026-10-03)

### 2.5 Mistral — Mistral Studio API (Fransa/AB merkezli)

**Model ve fiyat** (https://mistral.ai/pricing/api/, 2026-10-03)
- Ministral 3 (3B): $0.1 / $0.1. Ministral 3 (8B): $0.15 / $0.15. Mistral Small 4: $0.15 / $0.6.
- "Enterprise APIs, including regional data processing controls … available for 75% above list pricing".

**Saklama ve ZDR**
- Varsayılan: "for thirty (30) rolling days to monitor abuse (unless zero data retention is activated)". Agents API verisi
  hesap kapanana kadar tutuluyor. Privacy Policy yürürlük tarihi 3 Eylül 2026.
  — https://legal.mistral.ai/terms/privacy-policy/ (2026-10-03)
- ZDR yalnız pay-as-you-go'da ve durumsuz (stateless) çağrılarda var. `/v1/chat/completions` kapsamda. Batch, files,
  agents ve conversations kapsam dışında. Labs modelleri de hariç. Başvuru gerekçeli yapılıyor: "We review each request
  and may approve or deny it."
  — https://docs.mistral.ai/admin/monitor-comply/zero-data-retention (2026-10-03)
  — https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr (2026-10-03)

**Eğitim**
- Ticari şartlar (yürürlük 25 Eylül 2026): "Mistral AI will not use Customer Data or Outputs to train". İstisnalar:
  ürünün varsayılan opt-in/opt-out durumu, geri bildirim, Order Form ve **Labs/Preview modelleri**. Labs/Preview'da
  opt-out ve ZDR tercihleri uygulanmıyor.
  — https://legal.mistral.ai/terms/commercial-terms-of-service (2026-10-03)
- Yardım merkezi, Studio pay-as-you-go için yalnız "the right to opt out at any time" diyor. API eğitiminin varsayılan
  olarak açık mı kapalı mı olduğu açıkça yazmıyor [doğrulanmadı]. Kapatma yeri: Admin → Privacy → "Anonymous improvement
  data". ZDR ile eğitim opt-out ayrı kontroller.
  — https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models (2026-10-03)
  — https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training (2026-10-03)
- Tüketici/Vibe: Ücretsiz Vibe'da giriş ve çıkış varsayılan olarak eğitimde kullanılıyor. Enterprise'da varsayılan kapalı.
  — aynı yardım makaleleri (2026-10-03)

**Yapılandırılmış çıktı**
- "Custom Structured Outputs" JSON şemasıyla çalışıyor; örnekte `ministral-8b-latest` kullanılmış. Desteklenen model
  listesi [doğrulanmadı]. — https://docs.mistral.ai/studio/conversations/structured-output/custom (2026-10-03)

**Veri konumu**
- "By default, your data is hosted in the European Union." Özelliğe göre veri alt işleyicilere geçici olarak AB dışına
  aktarılabilir. Bunun için SCC (GDPR m.46) kullanılıyor.
  — https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data (2026-10-03)
- DPA çevrimiçi; "We cannot sign the DPA offline."
  — https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr (2026-10-03)

---

## 3. İstek başı tahmini maliyet

Formül: **maliyet = giriş_token × giriş_fiyatı / 1.000.000 + çıkış_token × çıkış_fiyatı / 1.000.000**
- (1) Sınıflandırma: 600 giriş + 20 çıkış
- (2) Öğün ayrıştırma: 400 giriş + 150 çıkış

Hesaba katılmayanlar:
- Yapılandırılmış çıktı ya da araç kullanımının eklediği sistem token'ları. Örneğin Anthropic'te araç kullanımı Haiku 4.5
  için 496 token ekliyor; structured outputs'un ek yükü [doğrulanmadı].
- Gemini'de çıkış fiyatına dahil olan "thinking" token'ları.
- Tokenizer farkları. Aynı metin sağlayıcıya göre farklı sayıda token tutar.

Bu yüzden rakamlar **alt sınırdır.**

| Sağlayıcı / model | Fiyat ($/1M, giriş/çıkış) | (1) Sınıflandırma | (2) Öğün ayrıştırma | 1.000 istek (1) / (2) |
|---|---|---|---|---|
| Anthropic Haiku 4.5 | 1 / 5 | 600×1 + 20×5 = 600+100 = 700 → **$0.000700** | 400×1 + 150×5 = 400+750 = 1150 → **$0.001150** | $0.70 / $1.15 |
| OpenAI gpt-6-luna (global) | 0.10 / 0.50 | 60 + 10 = 70 → **$0.000070** | 40 + 75 = 115 → **$0.000115** | $0.070 / $0.115 |
| OpenAI gpt-6-luna (EU, +%10 uygulanırsa*) | 0.11 / 0.55 | 66 + 11 = 77 → **$0.000077** | 44 + 82.5 = 126.5 → **$0.0001265** | $0.077 / $0.1265 |
| OpenAI gpt-5-nano (global) | 0.05 / 0.40 | 30 + 8 = 38 → **$0.000038** | 20 + 60 = 80 → **$0.000080** | $0.038 / $0.080 |
| Vertex Gemini 3.1 Flash-Lite (global) | 0.25 / 1.50 | 150 + 30 = 180 → **$0.000180** | 100 + 225 = 325 → **$0.000325** | $0.18 / $0.325 |
| Vertex Gemini 3.1 Flash-Lite (AB, global dışı) | 0.275 / 1.65 | 165 + 33 = 198 → **$0.000198** | 110 + 247.5 = 357.5 → **$0.0003575** | $0.198 / $0.3575 |
| Mistral Ministral 3 (8B) | 0.15 / 0.15 | 90 + 3 = 93 → **$0.000093** | 60 + 22.5 = 82.5 → **$0.0000825** | $0.093 / $0.0825 |
| Mistral Small 4 | 0.15 / 0.60 | 90 + 12 = 102 → **$0.000102** | 60 + 90 = 150 → **$0.000150** | $0.102 / $0.150 |

Tablodaki ara sayılar milyonda bir dolar cinsindendir; ÷1.000.000 ile dolara çevrilir.

\* +%10 kuralı "5 Mart 2026 ve sonrası çıkan modeller" için geçerli. Luna'nın çıkış tarihi sayfada yok [doğrulanmadı].
Bilgi kesim tarihi 18 Mayıs 2026 olduğundan kuralın uygulanması olası; tabloya ihtiyatlı olarak eklendi.

Hesaplanmayanlar:
- Gemini Developer API: Elendi, hesaplanmadı.
- Mistral'in AB "regional processing" Enterprise fiyatı (liste +%75): Fiyat yalnız oran olarak verildiği ve hangi
  API'leri kapsadığı belirsiz olduğu için hesaplanmadı.

---

## 4. Açık sorular (hukuki — yorum yok, yalnız liste)

1. Antrenman, beslenme ve kilo verisi KVKK m.6 ve GDPR m.9 anlamında "sağlık verisi / özel nitelikli kişisel veri"
   sayılır mı?
2. Türkiye'deki kullanıcıların verisini ABD'de (Anthropic, OpenAI global) ya da AB'de (OpenAI EU, Vertex EU, Mistral)
   işlemek KVKK m.9 kapsamında yurt dışı aktarım mı? Hangi aktarım aracı gerekiyor: standart sözleşme bildirimi, açık rıza,
   yeterlilik kararı?
3. KVKK standart sözleşmesinin Kurul'a bildirimi (süre ve şekil) bu sağlayıcıların her biri için ayrı ayrı mı gerekiyor?
4. Sağlayıcıların çevrimiçi DPA'ları yeterli mi, yoksa ayrıca imzalı DPA gerekir mi?
   - Anthropic DPA'sı ticari şartlara otomatik dahil.
   - OpenAI DPA imzalatmayı destekliyor.
   - Google'da CDPA geçerli.
   - Mistral DPA'yı yalnız çevrimiçi kabul ediyor.
5. ZDR/MAM onayı için sağlayıcıların istediği "ek şartlar" ve "Modified Retention amendment" (OpenAI) neler içeriyor? Bir
   şirket (tüzel kişi) olmadan başvurulabilir mi?
6. ZDR altında bile kalan saklama istisnaları (Anthropic işaretlenen içerik 2 yıla kadar; Vertex işaretlenen istem 90 güne
   kadar; OpenAI "Safety Retention") aydınlatma metninde nasıl anlatılmalı?
7. Kullanıcıdan "sağlayıcıyı adıyla söyleyen onay" (anayasa V2) KVKK açık rızası yerine mi geçer, yoksa ayrıca mı alınır?
8. AB kullanıcıları için GDPR m.28 işleyen sözleşmesi, m.30 kayıt ve DPIA (m.35) gerekli mi?
9. Alt işleyici listeleri (Mistral'in AB dışı geçici aktarımları, OpenAI'nin Cloudflare'i) için kullanıcıya bildirim
   yükümlülüğü var mı?
10. Ücretsiz ya da tüketici katmanı hesaplarla (ör. Gemini ücretsiz katmanı) test sırasında gerçek kullanıcı verisi
    gönderilmesini engelleyecek bir kural gerekir mi?
