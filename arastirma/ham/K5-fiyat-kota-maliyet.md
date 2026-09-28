# K5 · Fiyat Mimarisi, Kota Tasarımı ve Birim Maliyet

> Araştırma tarihi: **2026-09-11**. Fiyatlar hızla değişiyor — her tabloda kaynak ve tarih var.
> Ürün: deterministik karar motoru + LLM dil katmanı + fotoğraf analizi. iOS-önce, İngilizce, ABD öncelikli.
> Kısıt: kurucu Türkiye'de öğrenci, cepten yüzlerce dolar yakamaz, elinde 1 VPS var, Apple hesabı var.

---

# A · BİRİM MALİYET

## A1 · LLM token fiyatları (Eylül 2026)

### Anthropic (Claude) — kaynak: resmî fiyat tablosu, önbellek tarihi 2026-06-24

| Model | Girdi $/1M | Çıktı $/1M | Bağlam |
| --- | --- | --- | --- |
| Claude Fable 5.1 / Fable 5 | 10,00 | 50,00 | 1M |
| Claude Opus 5 / 4.8 / 4.7 / 4.6 | 5,00 | 25,00 | 1M |
| Claude Sonnet 5 | 2,00 | 10,00 | 1M |
| Claude Sonnet 4.6 | 3,00 | 15,00 | 1M |
| **Claude Haiku 4.5** | **1,00** | **5,00** | 200K |

İndirimler: **Batch API %50** (asenkron, saatler içinde döner). **Prompt caching** — önbellekten okuma
normal girdi fiyatının ~%10'u (Fable 5.1'de $0,25/MTok belirtilmiş, yani $10 girdinin %2,5'i);
önbelleğe yazma normal girdinin ~%125'i. Önbellek eşleşmesi **prefix** bazlı: `tools` → `system` →
`messages` sırasıyla render edilir; sabit kısım başa, değişken kısım sona konur.
Minimum önbelleklenebilir prefix modele göre 512–4096 token.
Kaynak: platform.claude.com/docs — prompt caching.

### OpenAI — kaynak: https://developers.openai.com/api/docs/pricing (erişim 2026-09-11)

| Model | Girdi $/1M | Önbellekli girdi $/1M | Çıktı $/1M |
| --- | --- | --- | --- |
| GPT-5 / GPT-5.1 | 1,25 | 0,125 | 10,00 |
| GPT-5.2 | 1,75 | 0,175 | 14,00 |
| GPT-5.4 | 2,50 | 0,25 | 15,00 |
| GPT-5.4-mini | 0,75 | 0,075 | 4,50 |
| **GPT-5.4-nano** | **0,20** | **0,02** | **1,25** |
| GPT-5.5 | 5,00 | 0,50 | 30,00 |
| GPT-5.6-luna | 0,20 | 0,02 | 1,20 |
| GPT-5.6-terra | 2,00 | 0,20 | 12,00 |
| GPT-5.6-sol | 4,00 | 0,40 | 20,00 |
| **GPT-5-mini** (eski nesil, hâlâ servis) | 0,25 | 0,025 | 2,00 |
| **GPT-5-nano** (eski nesil) | 0,05 | 0,005 | 0,40 |

Batch API: **%50 indirim**, tüm modellerde. Önbellekli girdi: **%90 indirim** (fiyat tablosunda açık).
Vision-özel modellerde görüntü girdisi $8–10/1M token, önbellekli görüntü $2–2,50/1M.

### Google (Gemini) — kaynak: https://ai.google.dev/gemini-api/docs/pricing (erişim 2026-09-11)

| Model | Girdi $/1M | Çıktı $/1M | Not |
| --- | --- | --- | --- |
| Gemini 3.1 Pro Preview | 2,00 (≤200K) / 4,00 (>200K) | 12,00 / 18,00 | |
| Gemini 3.5 Flash | 1,50 | 9,00 | |
| Gemini 3.8 Flash | 0,75 → 1,50 (1 Oca 2027) | 3,75 → 7,50 | **fiyat artışı planlı** |
| Gemini 3.7 Flash | 0,75 → 1,50 | 3,75 → 7,50 | aynı artış |
| **Gemini 3.5 Flash-Lite** | **0,30** | **2,50** | |
| **Gemini 3.1 Flash-Lite** | **0,25** (metin/görüntü/video) | **1,50** | ses girdisi $0,50 |

Batch: **%50 indirim** tüm satırlarda. Context caching: $0,075–0,40/1M + **saatlik depolama ücreti**
$0,50–1,00/1M/saat — Google'da caching Anthropic/OpenAI'dan farklı olarak *depolama* faturalıyor;
düşük hacimde bu genelde zararına çıkar.

> **Dikkat — Gemini Flash fiyatları 1 Ocak 2027'de 2 katına çıkıyor.** Fiyat mimarisini
> bugünkü $0,75'e göre kurmak 3,5 ay sonra maliyeti ikiye katlar. Planlamada $1,50 kullan.

### Fiyat/performans sıralaması (ucuzdan pahalıya, ağırlıklı maliyet ≈ girdi + 3×çıktı)

| Model | Ağırlıklı $/1M | Sınıf |
| --- | --- | --- |
| GPT-5-nano | 1,25 | ultra-ucuz, sadece sınıflandırma/etiketleme |
| GPT-5.4-nano / GPT-5.6-luna | ~3,8–4,0 | ucuz, kısa cevap |
| Gemini 3.1 Flash-Lite | 4,75 | ucuz |
| GPT-5-mini | 6,25 | ucuz-orta |
| Gemini 3.5 Flash-Lite | 7,80 | ucuz-orta |
| Claude Haiku 4.5 | 16,00 | orta |
| Gemini 3.8 Flash (2027 sonrası) | 24,00 | orta |
| GPT-5 / 5.1 | 31,25 | üst-orta |
| Claude Sonnet 5 | 32,00 | üst-orta |
| Claude Opus 5 | 80,00 | pahalı |
| Claude Fable 5.1 | 160,00 | çok pahalı |

**Sonuç:** koçluk uygulamasının dil katmanı için makul aralık `$1–8/1M ağırlıklı`. Yani
GPT-5-nano/mini, Gemini Flash-Lite ailesi ve gerektiğinde Claude Haiku 4.5.
Opus/Fable/GPT-5.5 sınıfını **kullanıcı isteğine bağlı çalıştırmak birim ekonomiyi bozar.**

---

## A2 · Görüntü işleme maliyeti

**Anthropic formülü:** görsel token ≈ `(genişlik × yükseklik) / 750`. Teknik olarak model görseli
28×28 piksellik yamalara böler: `⌈W/28⌉ × ⌈H/28⌉` görsel token. Uzun kenar Opus 4.7+ modellerinde
2.576 px'te, önceki Claude modellerinde 1.568 px'te kırpılır — daha büyük görsel otomatik küçültülür.
Kaynak: platform.claude.com/docs/en/build-with-claude/vision · blog.roboflow.com/image-token-cost-vlm

### Çözünürlüğe göre token ve maliyet (Anthropic formülü, tek görsel)

| Çözünürlük | ≈ token | Haiku 4.5 ($1/1M) | Sonnet 5 ($2/1M) | GPT-5-mini ($0,25/1M) | Gemini Flash-Lite ($0,25/1M) |
| --- | --- | --- | --- | --- | --- |
| 512×512 | 350 | $0,00035 | $0,00070 | $0,00009 | $0,00009 |
| 768×768 | 786 | $0,00079 | $0,00157 | $0,00020 | $0,00020 |
| **1024×1024** | **1.400** | **$0,00140** | **$0,00280** | **$0,00035** | **$0,00035** |
| 1568×1568 | 3.278 | $0,00328 | $0,00656 | $0,00082 | $0,00082 |
| 2000×2000 | 5.333 | $0,00533 | $0,01067 | $0,00133 | $0,00133 |

> **Ana kaldıraç: çözünürlüğü istemcide düşür.** 2000×2000 yerine 1024×1024 göndermek maliyeti
> **%74 düşürüyor.** Yemek fotoğrafı / vücut fotoğrafı sınıflandırmasında 1024 px uzun kenar
> pratikte yeterli. Bu tek satır kod, en büyük tek tasarrufu veriyor.
>
> Faz 1-3'ten gelen "$0,003–0,016/görsel" aralığı **üst sınır**; 1024 px + ucuz model ile
> gerçek maliyet **$0,0004–0,0014/görsel**, yani 10× daha ucuz. Ama çıktı token'ları
> (modelin yazdığı analiz) da var — aşağıdaki senaryolarda birlikte hesaplandı.

**90 foto/ay senaryosu (kullanıcı başına, sadece görüntü girdisi):**
- 1024 px + GPT-5-mini/Flash-Lite: **$0,032/ay**
- 1024 px + Haiku 4.5: **$0,126/ay**
- 2000 px + Sonnet 5: **$0,96/ay** ← Faz 1-3'teki $1,44 tahminine yakın, kaçınılması gereken senaryo

---
## A3 · Cihaz üstü (on-device) alternatifler — **en önemli bulgu**

### Apple Foundation Models framework, iOS 27 (yayın: **14 Eylül 2026**)

| Özellik | Durum (Eylül 2026) |
| --- | --- |
| Erişim | Native Swift API, **çıkarım başına ücret yok** — tamamen bedava |
| Cihaz üstü model | AFM 3 Core: 3B yoğun parametre. AFM 3 Core Advanced: 20B seyrek, istem başına 1–4B aktif |
| **Bağlam penceresi** | **4.096 token** (girdi + çıktı **ortak**). iOS 26.4'ten beri `SystemLanguageModel.contextSize` ve `tokenCount()` API'si var |
| Private Cloud Compute | 32.000 token bağlam, daha büyük sunucu modeli, Apple'ın gizlilik garantisi, yine ücretsiz |
| **Görüntü girdisi** | **iOS 27 ile geldi.** `UIImage`, `NSImage`, `CGImage`, Core Image, CoreVideo pixel buffer, dosya URL'i. Her boyut/en-boy oranı |
| Hazır Vision araçları | `OCRTool` ve `BarcodeReaderTool` (iOS 27) — **barkod okuma tamamen bedava ve cihazda** |
| Yapılandırılmış çıktı | `@Generable` makrosu + Codable tipler, şema doğrulamalı |
| Özelleştirme | LoRA adapter eğitimi (offline Python toolkit), adapter ~160 MB |
| Araç çağırma | iOS 27'de `GenerationOptions.ToolCallingMode` ile istek başına kontrol |
| Yeni (WWDC26) | Framework artık **dış LLM sağlayıcı takılabilir** hale geldi (session 339) — aynı Swift API'sinden buluta düşme |

Kaynaklar: developer.apple.com/videos/play/wwdc2026/241 · developer.apple.com/documentation/technotes/tn3193 ·
blakecrosley.com/blog/foundation-models-image-input-ios-27 · macworld.com (iOS 27 çıkış tarihi)

### Kritik kısıt: cihaz uygunluğu

iOS 27 **iPhone 11 ve SE 2. nesle kadar** kuruluyor. Ama **Apple Intelligence** ayrı bir çizgi:
sadece **iPhone 15 Pro / 15 Pro Max ve iPhone 16 ve sonrası.** Foundation Models framework
Apple Intelligence'a bağlı → **normal iPhone 15, 14, 13, 12, 11 kullanıcısında cihaz üstü model YOK.**

AFM 3 Core Advanced ise daha da dar: iPhone 17 Pro / Pro Max / Air.

> **Pratik sonuç:** Eylül 2026'da ABD iPhone tabanının **azınlığı** Apple Intelligence uyumlu.
> (Kesin pay için kaynak bulunamadı.) Yani cihaz üstü **tek başına strateji olamaz** — ama
> **hibrit** strateji olabilir ve olmalı.

### Fizibilite değerlendirmesi — iş bazında

| İş | Cihazda yapılabilir mi? | Gerekçe |
| --- | --- | --- |
| **Barkod okuma** (gıda etiketi) | **EVET, %100** | `BarcodeReaderTool` — Vision destekli, LLM bile gerekmiyor. Sıfır maliyet, sıfır GDPR |
| **Etiket OCR** (besin değeri tablosu) | **EVET, %100** | `OCRTool`. Metin çıkar → deterministik parser → sunucuya sadece rakamlar gider |
| Yemek fotoğrafı **sınıflandırma** (bu bir tabak mı, ne var içinde) | **Kısmen** | Foundation Models "betimleyici görevlerde" iyi; porsiyon/gram tahmini için kanıt bulunamadı. A/B test şart |
| Vücut fotoğrafı ilerleme kıyası | **Muhtemelen cihazda** | Görsel karşılaştırma + kısa metin. Ayrıca **GDPR açısından cihazda kalması gereken en hassas veri** |
| Form/teknik analizi (video) | **Hayır** | Video girdisi framework'te yok |
| Deterministik motorun çıktısını cümleye dökme | **EVET** | 4K bağlam yeter: kısa şablon + veri → 2-3 cümle. `@Generable` ile şema garantisi |
| Serbest sohbet koçluk | **Hayır** | 4.096 token ortak pencere, çok turlu sohbeti taşımaz. TN3193 zaten "bağlam penceresini yönet" diye ayrı teknik not yayımlamış |
| Haftalık derin analiz | **Hayır** | Bağlam yetmez |

### GDPR / KVKK boyutu
Cihazda kalan veri **hiç işlenmemiş sayılır** — sunucuya gitmeyen fotoğraf için veri işleme
sözleşmesi, alt-işleyen bildirimi, saklama politikası gerekmez. **Vücut fotoğrafı** (özel nitelikli
sağlık verisine yakın) için bu tek başına mimari kararı belirlemeye yeter.

### Tavsiye edilen hibrit mimari

```
Katman 0  Deterministik Swift kodu        → $0        (karar motoru, hesaplama, kural)
Katman 1  Apple FM cihaz üstü             → $0        (barkod, OCR, kısa cümleleme, foto ön-eleme)
          — sadece Apple Intelligence cihazlarında
Katman 2  Ucuz bulut model (nano/Flash-Lite/mini) → $0,0003–0,001/çağrı
          — cihaz üstü yoksa fallback + tüm sohbet
Katman 3  Orta model (Haiku 4.5 / Sonnet 5)       → $0,003–0,015/çağrı
          — haftalık analiz, plan değişikliği. Nadir, sunucu tetikli, kullanıcı tetikli DEĞİL
```

Bu mimari cihaz üstü katmanı **maliyet düşürücü** olarak değil, **maliyeti sıfırlayan** olarak
kullanıyor: Apple Intelligence'lı bir kullanıcının barkod + OCR + cümleleme işi tamamen bedava.

---

## A4 · Küçük/ucuz modeller ve yönlendirme (routing)

| İş | Yeterli model | Ağırlıklı maliyet | Neden |
| --- | --- | --- | --- |
| Niyet sınıflandırma ("bu soru beslenme mi antrenman mı?") | GPT-5-nano | $1,25/1M | Tek etiket, 20 çıktı token |
| Güvenlik filtresi (medikal soru mu?) | GPT-5-nano | $1,25/1M | İkili sınıflandırma |
| Deterministik çıktıyı cümleye dökme | Apple FM (bedava) → GPT-5.4-nano | $0–3,8/1M | Şablon + veri |
| Yemek fotoğrafı analizi | GPT-5-mini / Gemini Flash-Lite | $4,75–6,25/1M | Görsel + kısa yapılandırılmış çıktı |
| Serbest koçluk sohbeti | GPT-5-mini / Haiku 4.5 | $6,25–16/1M | Ton ve tutarlılık gerekiyor |
| Haftalık analiz / plan revizyonu | Sonnet 5 / GPT-5 | $31–32/1M | Ayda 4 kez, çok veri, akıl yürütme |
| Kullanıcının "neden" sorusu (derin) | Sonnet 5 | $32/1M | Nadir |

**Maliyet farkı:** en ucuz (GPT-5-nano) ile en pahalı (Fable 5.1) arasında **128×**.
Sadece "sohbeti Sonnet 5 yerine GPT-5-mini'ye almak" **5× tasarruf.**

### Yönlendirme stratejileri
1. **Deterministik önce.** Soru bir hesaplama ise (kalori, 1RM, protein hedefi) LLM'e hiç gitme.
   Faz 1-3'teki karar motoru zaten bu — LLM'e giden trafiği %50+ azaltabilir.
2. **Küçük modelle yönlendir.** Nano ile sınıflandır, uygun katmana gönder. Yönlendirme
   maliyeti ($0,00003) yönlendirdiği tasarrufun yanında sıfır.
3. **Prompt caching zorunlu.** Sistem promptu + kullanıcı profili sabit kalırsa girdi maliyeti
   %90 düşer (OpenAI), Anthropic'te ~%90. Sabit içerik başa, değişken sona.
   **Yaygın hata:** sistem promptuna `datetime.now()` koymak → önbellek her istekte kırılır.
4. **Batch API'yi asenkron işlerde kullan.** Haftalık analiz gece batch'te üretilebilir → **%50 indirim.**
   Kullanıcı sabah açtığında hazır. Bu "haftalık rapor" ürününe mükemmel uyuyor.
5. **Çıktı token'ını kıs.** Çıktı girdinin 4–8 katı fiyatlı. "Kısa cevap ver" talimatı ve
   `max_tokens` sınırı doğrudan para.
6. **Görseli 1024 px'e küçült** (A2). Tek başına %74.

---

## A5 · Aylık aktif kullanıcı başına gerçekçi maliyet

### Açık varsayımlar

| Etkileşim | Girdi token | Önbellekli pay | Çıktı token |
| --- | --- | --- | --- |
| Plan cümleleme | 1.800 | 1.200 | 300 |
| Sohbet turu | 2.500 | 1.200 | 400 |
| Fotoğraf analizi | 800 metin + 1.400 görsel (1024px) | 600 | 250 |
| Haftalık analiz | 5.000 | 2.000 | 900 |

Kullanım profilleri (aylık):

| Profil | Pay | Plan | Sohbet | Foto | Haftalık |
| --- | --- | --- | --- | --- | --- |
| Hafif | %60 | 4 | 8 | 6 | 1 |
| Orta | %30 | 20 | 40 | 30 | 4 |
| Ağır | %10 | 30 | 150 | 90 | 4 |

### Senaryo 1 — "ucuz yığın": GPT-5-mini ($0,25/$2,00) + haftalık Sonnet 5

| Profil | Plan | Sohbet | Foto | Haftalık | **Toplam/ay** |
| --- | --- | --- | --- | --- | --- |
| Hafif | $0,0031 | $0,0093 | $0,0055 | $0,0154 | **$0,033** |
| Orta | $0,0156 | $0,0464 | $0,0276 | $0,0616 | **$0,151** |
| Ağır | $0,0234 | $0,1740 | $0,0828 | $0,0616 | **$0,342** |
| **Karma ortalama** | | | | | **$0,099** |

### Senaryo 2 — "kaliteli yığın": Claude Haiku 4.5 ($1/$5) + haftalık Sonnet 5

| Profil | **Toplam/ay** |
| --- | --- |
| Hafif | **$0,069** |
| Orta | **$0,330** |
| Ağır | **$0,903** |
| **Karma ortalama** | **$0,231** |

### Senaryo 3 — hibrit (Apple FM cihazda + ucuz bulut)
Plan cümleleme, barkod, OCR, foto ön-eleme cihaza geçince (Apple Intelligence'lı cihazlarda,
tabanın ~%40'ı varsayımıyla) karma ortalama **$0,099 → ~$0,072/ay.**

### Senaryo 4 — **kötü niyetli kullanıcı** (kota olmasaydı)

| Davranış | Model | Aylık maliyet |
| --- | --- | --- |
| 1.000 sohbet turu | GPT-5-mini | $1,16 |
| 1.000 sohbet turu | Haiku 4.5 | $3,42 |
| 1.000 sohbet turu | Sonnet 5 | $6,84 |
| 10.000 tur (script'li) | Sonnet 5 | **$68,40** |
| 10.000 tur + 5.000 foto (2000px) | Sonnet 5 | **$122** |

> **Kurucunun sezgisi doğru.** $8/ay ödeyen tek bir kötü niyetli kullanıcı, kota yoksa aylık
> $68–122 maliyet yazabilir — yani **15 iyi niyetli kullanıcının gelirini siler.**
> Ama tabloların gösterdiği asıl şey şu: **normal kullanıcı çok ucuz.** Ortalama $0,10–0,23/ay.
> Kota, ortalamayı kısmak için değil, **kuyruğu kesmek** için var.

---

## A6 · Altyapı

### Tek VPS yeter mi?

**Evet, uzun süre yeter.** Bu ürünün sunucusu ağır iş yapmıyor: LLM çıkarımı sağlayıcıda,
foto işleme sağlayıcıda. Sunucu = API proxy + Postgres + kota sayacı + cron. Bu, tek çekirdeğin
saniyede yüzlerce isteği taşıyabileceği bir yük.

**Yetmediği yer, CPU değil, şu üçü:**
1. **Tek nokta arıza.** VPS düşerse uygulama komple ölür. 10K kullanıcıda bu App Store yorumuna dönüşür.
2. **Yedekleme ve veri kaybı.** Postgres'i düzenli, sunucu dışına yedeklemiyorsan tek disk arızası bitirir.
3. **Fotoğraf depolama.** Fotoğrafları VPS diskine koymak yanlış — disk dolar, yedek şişer, egress pahalı.

### Fiyat karşılaştırması (Eylül 2026)

| Sağlayıcı | Ürün | Aylık | Not |
| --- | --- | --- | --- |
| **Hetzner** | CX22 (2 vCPU, 4 GB, 40 GB) | **~$4,59** | 20 TB trafik dahil. En ucuz |
| Hetzner | CPX22 (paylaşımlı AMD) | €7,99 (~$9,49) | **1 Nis 2026 zammıyla €5,99'dan çıktı** |
| Hetzner | CCX (dedicated vCPU) | — | 1 Nis 2026'da **2,1×–2,73× zam**. Artık ucuz değil |
| **Supabase** | Free | **$0** | 500 MB DB, 1 GB dosya, 5 GB egress, 50K MAU. **1 hafta hareketsizlikte proje duraklar**, otomatik yedek yok |
| **Supabase** | Pro | **$25** | 8 GB DB, 100 GB dosya, 250 GB egress, 100K MAU, $10 compute kredisi dahil. Aşımda egress $0,09/GB |
| **Cloudflare R2** | Standart | **$0,015/GB-ay** | **Egress ÜCRETSİZ.** Class A $4,50/M, Class B $0,36/M istek. Free: 10 GB + 1M/10M istek |
| Cloudflare R2 | Infrequent Access | $0,01/GB-ay | Operasyon pahalı + $0,01/GB okuma. Arşiv için |
| Fly.io / Railway | — | **bulunamadı** (bu turda fiyat doğrulanmadı) | |

Kaynaklar: bestusavps.com/reviews/hetzner · northflank.com/blog/hetzner-cloud-server-price-increases ·
uibakery.io/blog/supabase-pricing · developers.cloudflare.com/r2/pricing

### Fotoğraf depolama maliyeti — R2 ile

| Ölçek | Kullanıcı başı 90 foto/ay × 300 KB | Yıllık birikim | R2 maliyeti |
| --- | --- | --- | --- |
| 100 kullanıcı | 27 GB/ay | 324 GB | ilk ay $0 (free tier), 12. ay **$4,86/ay** |
| 1.000 kullanıcı | 270 GB/ay | 3,24 TB | 12. ay **$48,60/ay** |
| 10.000 kullanıcı | 2,7 TB/ay | 32 TB | 12. ay **$486/ay** |

> **Uyarı: fotoğraf depolama, LLM'den daha hızlı büyüyen maliyet kalemi.**
> 1.000 kullanıcıda LLM ~$100/ay iken depolama 12. ayda $49/ay ve **her ay artıyor** (birikimli).
> **Çözüm: fotoğrafı saklama.** Analiz et, sonucu (JSON) sakla, görseli 30–90 günde sil veya
> hiç yükleme (cihazda tut, sadece küçük thumbnail sunucuda). Bu hem maliyeti hem GDPR'ı çözer.

### Push bildirim
**APNs (Apple Push Notification service) ücretsizdir** — Apple Developer Program üyeliği dışında
ücret yok. Üçüncü parti servis (OneSignal, Firebase) kullanmazsan maliyet $0. Kendi sunucundan
APNs'e HTTP/2 ile göndermek birkaç yüz satır kod. **Bu iş için üçüncü parti servis alma.**

### Önerilen altyapı (aşamalı)

| Aşama | Kurulum | Aylık |
| --- | --- | --- |
| 0–100 kullanıcı (beta) | Mevcut VPS + Postgres aynı makinede + R2 free tier | **~$5** |
| 100–2.000 | Hetzner CX22 + günlük pg_dump → R2 + R2 depolama | **$5–15** |
| 2.000–20.000 | Hetzner CX32/CPX22 + ayrı managed Postgres veya Supabase Pro + R2 | **$35–80** |
| 20.000+ | 2× uygulama sunucusu + load balancer + managed Postgres + R2 | **$150–300** |

**Cevap: tek VPS 2.000 kullanıcıya kadar rahat yeter.** Darboğaz kullanıcı sayısı değil,
*yedekleme disiplini*. İlk gün kurulacak tek şey: günlük otomatik Postgres dump → R2.

---

## A7 · Apple'ın kesintisi, vergi, ödeme akışı

### Komisyon

| Durum | Oran |
| --- | --- |
| **Small Business Program** (önceki takvim yılı ≤ $1M net gelir) | **%15** |
| Standart | %30 |
| AB Alternative Terms, ilk yıldan sonraki abonelikler | %10 |

Şartlar (developer.apple.com/app-store/small-business-program, erişim 2026-09-11):
- Apple Developer Program'da **Account Holder** olmak
- App Store Connect'te güncel Paid Apps sözleşmesini (Schedule 2) kabul etmek
- Tüm **Associated Developer Accounts**'u beyan etmek
- **Yeni geliştiriciler doğrudan uygun.** Levent bu kapsamda → **%15.**
- Onay sonrası, onayın düştüğü mali ayın bitiminden **15 gün sonra** yürürlüğe girer
- Cari yıl içinde $1M aşılırsa **kalan satışlar %30**. Sonraki bir yıl $1M altına düşerse ertesi yıl tekrar %15

> Levent'in ölçeğinde **%15 kesin.** $1M'a ulaşmak zaten "iyi problem".

### Vergi — kısmen doğrulandı, kısmen **bulunamadı**

**Doğrulanan** (developer.apple.com/help/app-store-connect/manage-tax-information):
- ABD dışı bireysel geliştirici **W-8BEN / W-8BEN-E / W-8ECI**'den birini doldurmak zorunda.
  App Store Connect soru-cevapla doğru formu seçtiriyor.
- Apple çoğu ülkede **merchant of record** — KDV/satış vergisini kendisi tahsil edip ilgili
  ülkeye ödüyor. Geliştiriciye **net** tutar geliyor.
- Anlaşma indirimleri mevcut; Apple dokümanı Brezilya örneğinde açıkça "vergi mukimlik belgesi
  yüklemezsen standart stopaj uygulanır" diyor.

**Doğrulanamadı / iddia edilemez:**
- **"W-8BEN sonrası Türkiye için %0 stopaj" iddiası bu turda doğrulanamadı.** Apple resmî
  dokümanı ülke bazlı oran vermiyor ve gelirin telif (royalty) mi ticari kazanç mı sayıldığını
  belirtmiyor. Genel W-8BEN kuralı: ABD kaynaklı telif geliri varsayılan %30, anlaşma ile düşer;
  ticari kazanç sayılırsa ABD stopajı yoktur. **Hangisinin geçerli olduğu Apple'a veya bir mali
  müşavire sorulmalı.** Bu araştırma bunu çözemedi — uydurmuyorum.
- Türkiye'de gelir vergisi/beyan yükümlülüğü ayrı bir konu ve buranın kapsamı dışında.

**Aksiyon:** App Store Connect'te tax formunu doldururken çıkan sorulara verilen cevaplar
oranı belirliyor. Bu 15 dakikalık iş, ertelenirse Apple maksimum oranı uygular.

### Ödeme akışı
- Apple aylık ödeme yapıyor; ödeme, satışın gerçekleştiği **mali ayın kapanışından ~30–45 gün sonra**.
- Ödeme banka havalesiyle, seçilen para biriminde. TL hesabına USD/EUR gelirse banka kur farkı
  ve transfer masrafı çıkar — **döviz hesabı (DÖVİZ TEVDİAT) açmak kur kaybını azaltır.**
- Minimum ödeme eşiği var; altında kalan bakiye devreder.

---
# B · KOTA TASARIMI

## B8 · AI destekli tüketici uygulamaları 2026'da kotayı nasıl kuruyor?

2026 kotanın **yeniden fiyatlandırma yılı** oldu. Belli başlı olaylar:

| Şirket / tarih | Ne yaptı | Sonuç |
| --- | --- | --- |
| **GitHub Copilot** (1 Haz 2026) | Sabit "Premium Request Unit" → token bazlı **AI Credits**, 1 kredi = $0,01 | Büyük geliştirici tepkisi. Bir kullanıcı $29/ay'dan **$750/ay**'a çıktı |
| **Cursor** (Haz 2025 → 2026) | 500 premium istek → kredi sistemi, aynı $20'a **fiilen 225 istek** | CEO Michael Truell **kamuoyu önünde özür diledi ve iade yaptı**; bir ekibin $7.000'lık yıllık aboneliği **tek günde** tükendi |
| **Google Antigravity** (Mar 2026) | Ücretsiz günlük 250 → **20 istek (-%92)**; Pro ~500 → ~100 (-%80) | "Google'ın AI alanında gördüğü en büyük tepkilerden biri" |
| **Anthropic** (Tem 2026) | Claude Fable 5 ölçülü kredi sistemine geçti | — |
| **OpenAI** (Tem 2026) | Codex'i **her ChatGPT kademesinde dahil** tuttu, aşım kredisi opsiyonel | Zıt bahis |
| **HubSpot** (Nis 2026) | **Sonuç bazlı**: çözülen konuşma başına $0,50 | — |

Kaynaklar: digitalapplied.com/blog/github-copilot-ai-credits-billing-2026 ·
windowsforum.com · agentpedia.codes/blog/antigravity-credits-pricing-explained ·
digitalapplied.com/blog/ai-subscriptions-vs-usage-credits-openai-anthropic-2026

### Tüketici (B2C) tarafındaki somut örnekler

| Uygulama | Ücretsiz kota | Ücretli | Kaynak |
| --- | --- | --- | --- |
| **Cal AI** | **Günde ~3 AI fotoğraf taraması** + temel takip | $9,99/ay veya $29,99/yıl, 3 gün deneme (kart zorunlu). Paywall'ı agresif A/B test ediyor: $2,99/hafta, $5,99/ay, $19,99/yıl, $49,99/yıl varyantları gözlendi | eesel.ai/blog/cal-ai-pricing |
| **SnapCalorie** | **Günde 3 AI kaydı** | ~$59/yıl | calzy-app.com |
| **Lose It!** | AI fotoğraf tamamen paywall arkasında | — | vust.ai |
| **Canva** | "AI allowance" / "AI uses" dili, limite yaklaşınca uyarı | "Canva Pro'nun 40 katı AI" diye göreli anlatım | thegood.com/insights/ai-credits |
| **Midjourney** | Kota bitince engelleme yok, **yavaş "Relax mode"a düşürme** | — | thegood.com |
| **ChatGPT / Claude** | "Credits" kelimesini **hiç kullanmıyor** — yetenek dili | Claude %90 tüketimde uyarıyor; ikisi de tam sıfırlama saatini gösteriyor | thegood.com |

> **Sektörün B2C'de yerleştiği yer net: gün bazlı, somut birimli, küçük sayılı kota.**
> "Günde 3 fotoğraf" hâkim desen. Kredi/token dili tüketici tarafında yok.

---

## B9 · Kullanıcı kotayı nasıl karşılıyor? — hangi model isyan çıkarıyor

### İsyan çıkaran desenler (kanıtlı)

1. **Yıllık ödemişe ayrıca para sattırmak (Fitia "Coins").** Zaten premium ödeyen kullanıcıya
   tarif üretimi için ayrıca coin sattırdılar → kategorinin en büyük kullanıcı isyanı.
2. **Aynı fiyata kotayı sessizce daraltmak.** Cursor 500→225, Antigravity 250→20.
   Fiyat aynı, alınan şey yarıya inmiş. Kredi soyutlaması bunu *örtüyor* — asıl öfke bu.
3. **Kur manipülasyonu riski.** Kredi sistemleri satıcının dönüşüm oranını tek taraflı
   değiştirmesine izin veriyor; havayolu mil devalüasyonu deseninin aynısı. Cursor'ın
   kredilere geçişinden aylar sonra fiilen **20× fiyat artışı** bildirildi.
4. **Ertelenmiş ödeme acısı.** Kredi satın alırken acı yok; fatura gelince tam geliyor.
   Nörogörüntüleme: para transferi *anterior insula*'yı — fiziksel acıyı işleyen bölgeyi — aktive ediyor.
   "5.000 kredi onayla" ile "$50.000 onayla" aynı şey değil; acı yok olmuyor, **erteleniyor.**

### Kabul gören desenler

- **Somut, gün bazlı, küçük sayı.** "Günde 3 tarama" kimseyi kızdırmıyor (Cal AI, SnapCalorie).
- **Öngörülebilir sabit ücret.** Kurumsal ankette **%58 öngörülebilir kişi-başı fiyat** tercih
  ediyor, sadece **%14** kullanıma bağlı fiyat. Sağlık karar vericilerinde "çoğunluk token/API
  çağrısı gibi teknik ölçütleri reddetti."
- **Hibrit:** taahhütlü taban + eşiğin üstünde kullanım — saf tüketim modellerini müşteri
  memnuniyetinde geçiyor.

### Pazarın gerçek boyutu (abartıya karşı)
"Kredi benimsemesi %126 arttı" başlığının altındaki gerçek: taban **35 şirketten 79'a** çıkmış —
SaaS pazarının **%1'inden azı.** İncelenen 800 AI ajan şirketinin sadece **%13'ü** krediyi birincil
ölçüt olarak kullanıyor. Kaynak: softwarepricing.com/blog/credit-based-pricing-ai

### Davranışsal yan etki
"Güç kullanıcılar birden fazla hesap açıp günlük/haftalık limitleri aşmak için aralarında dönüyor."
Kota sıkıysa büyüme rakamları **sahte talep** üretir. → B11'deki cihaz bazlı koruma bunun için.

---

## B10 · Kota nasıl anlatılır? — birim seçimi

Kanıta dayalı yedi kural (thegood.com/insights/ai-credits, 2026):

| # | Kural | Uygulama |
| --- | --- | --- |
| 1 | **Dili kitleye uydur.** Tüketici ürünleri (ChatGPT, Claude) "credits" kelimesini hiç kullanmıyor; yetenek dili kullanıyor | ✅ Bizde de "kredi" **yok** |
| 2 | Gerçek matematiği bulunabilir bir yere yaz | Ayarlar → "Kotan nasıl işliyor" |
| 3 | **Soyut sayıyı somut çıktıya çevir.** Runway: "2.250 kredi = 187 sn video veya 112 görsel" | "Günde 25 mesaj ≈ tam bir koçluk seansı" |
| 4 | **Duvara çarpmadan önce uyar.** Canva "limitine yaklaşıyorsun" diyor; Claude %90'da uyarıyor | %80'de yumuşak uyarı |
| 5 | **Nazik düşürme.** Midjourney engellemek yerine yavaş moda alıyor | B12'ye bak |
| 6 | **Bakiyeyi kullanıcının çalıştığı yerde göster.** Lovable sohbet kutusunun üstünde | Sohbet ekranının üstünde küçük sayaç |
| 7 | Upsell'i **değerle** aç, aciliyetle değil. Geri sayım sayacı daha hızlı dönüştürüyor ama **güveni aşındırıyor** | Geri sayım yok |

> **En çarpıcı bulgu:** bir yaratıcı yazılım şirketinde **abonelerin %80'i limitine hiç
> yaklaşmadı — çünkü bir kredinin ne demek olduğunu gözlerinde canlandıramıyorlardı** ve
> gereksiz yere kendilerini kıstılar. Şeffaflık eksikliği kullanımı öldürüyor; kullanım
> ölmesi de alışkanlığı ve dolayısıyla yenilemeyi öldürüyor.

**Birim kararı — sıralama:**

| Birim | Anlaşılabilirlik | Algılanan cömertlik | Verdict |
| --- | --- | --- | --- |
| "100 kredi" | Düşük — 1 kredi ne? | Düşük (soyut, kıstırır) | ❌ |
| "Ayda 90 fotoğraf" | Orta — ay sonunu kestirmek zor | Orta; ay ortasında biterse öfke | ⚠️ |
| **"Günde 10 fotoğraf, günde 25 mesaj"** | **Yüksek — bugün ne yapabileceğimi biliyorum** | **Yüksek** — her sabah sıfırlanır, "bitti" hissi yok | ✅ |

Gün bazlı kotanın ikinci faydası **maliyet tarafında:** bir saldırganın günlük tavanı sabittir;
aylık kotada tek günde tüm ayı yakabilir.

---

## B11 · Kötüye kullanım koruması — indie ölçekte uygulanabilir olanlar

| Katman | Yöntem | Zorluk | Etkisi |
| --- | --- | --- | --- |
| 1 | **Günlük kota** (aylık değil) | Çok kolay | Tek kullanıcının günlük tavanı sabitlenir — en büyük tek koruma |
| 2 | **Sunucu tarafı sayaç.** Kotayı istemcide tutma; her istek sunucudan geçsin | Kolay | Zorunlu. İstemci sayacı 5 dakikada kırılır |
| 3 | **Apple App Attest** — istek gerçek, değiştirilmemiş uygulamadan mı geliyor? | Orta | Sahte istemci / script'li saldırıyı keser |
| 4 | **Apple DeviceCheck** — cihaz başına 2 bit kalıcı veri, gizlilik dostu, uygulama silinse bile kalıyor | Orta | "Bu cihaz denemesini kullandı mı?" — **deneme çiftçiliğini (trial farming) bitirir.** Simülatörle free-tier çiftçiliği çalışmaz |
| 5 | Hesap başına **dakikalık hız sınırı** (örn. 6 mesaj/dk) | Kolay | Otomasyonu yavaşlatır |
| 6 | **Sunucuda aylık $ tavanı** — kullanıcı başına biriken gerçek maliyet eşiği geçerse otomatik kısıtla + logla | Orta | Son güvenlik ağı. Tüm senaryolarda kayıp sınırlı |
| 7 | Sağlayıcı hesabında **organizasyon düzeyinde harcama limiti** | Çok kolay | **İlk gün kurulmalı.** Kod hatası / sonsuz döngü faturayı patlatmasın |
| 8 | Anormal desen tespiti (kullanıcının p99 kullanımı, gece 3'te 400 istek) | Zor | Sonraya bırak |

DeviceCheck notu: iki bit **geliştirici ekibi başına cihaz başına** — yani senin tüm uygulamaların
aynı biti paylaşır. Uygulama silinip yeniden kurulsa da bit kalır.
Kaynaklar: developer.apple.com/documentation/devicecheck ·
appleinsider.com/articles/24/07/09/how-to-mitigate-fraud-on-ios-devices-using-app-attest-and-devicecheck

**İndie için minimum uygulanabilir set (1. gün):** 1 + 2 + 5 + 7.
**2. ay:** 3 + 4 + 6. Bunun ötesi erken optimizasyon.

---

## B12 · Kota bittiğinde ne olmalı?

| Seçenek | Örnek | Kullanıcı tepkisi | Bizim için |
| --- | --- | --- | --- |
| **Sert durdurma** (429/hata) | Cursor: sadece kullandıkça-öde aşımı veya plan yükseltme, **asla sessiz düşürme yok** | Kötü UX; ama beklenti doğru kurulduysa kabul ediliyor | ❌ tek başına |
| **Nazik düşürme** (yavaşlatma) | **Midjourney "Relax mode"** — engellemek yerine yavaşlatıyor. thegood.com: "iyi niyeti tam kesintiden daha iyi koruyor" | En iyi | ✅ |
| **Model düşürme** (pahalıdan ucuza) | Teknik olarak yaygın öneri; ama **Google, OpenRouter, xAI, Alibaba/Qwen hiçbiri kota bitiminde otomatik model düşürmeyi dokümante etmiyor** | Şeffaf anlatılmazsa "ürün bozuldu" algısı | ⚠️ sadece açıkça söylenirse |
| **Ek satın alma (consumable)** | **Fitia "Coins" — kategorinin en büyük isyanı** | Yıllık ödemişe ikinci kez para sattırmak = ihanet algısı | ❌ lansmanda kesinlikle yok |
| **Sıfırlama saatini göster** | ChatGPT, Claude | Nötr-olumlu, belirsizliği kaldırıyor | ✅ zorunlu |

### Önerilen davranış zinciri
1. **%80'de** yumuşak uyarı: "Bugünkü koçluk mesajlarının 20/25'ini kullandın."
2. **Kota bitince:** deterministik motor **çalışmaya devam eder** — kayıt, plan, grafik, hesap,
   barkod, OCR hepsi açık. Sadece **serbest LLM sohbeti** duruyor.
3. Mesajda: **"Yarın 09:00'da sıfırlanıyor"** + o güne kadar ne yapılabileceği.
4. Cihaz üstü model varsa (Apple Intelligence'lı cihaz), **kota bitince cihaz üstü moda düş**
   ve bunu açıkça söyle: "Şu an cihazındaki modelle çalışıyorum — daha kısa cevap veriyorum."
   **Bu, Midjourney'nin Relax mode'unun bizdeki karşılığı ve maliyeti tam sıfır.**

> Kritik nokta: ürünün **%80'i deterministik.** Kota bitince uygulama ölmüyor, sadece
> konuşkanlığı azalıyor. Bu, saf LLM ürünlerinin sahip olmadığı bir lüks — kullan.

---
# C · FİYAT MİMARİSİ

## C13 · Kaç kademe?

Fitness kategorisinde başarılı olanların hepsi **tek kademe + süre seçenekleri**:

| Uygulama | Kademe sayısı | Fiyat (2026) | Ücretsiz katman |
| --- | --- | --- | --- |
| **MacroFactor** | 1 | $11,99/ay · $47,99/6 ay ($8,00/ay) · **$71,99/yıl ($6,00/ay)** | **Yok** — sadece deneme |
| **Hevy** | 1 (Pro) | $2,99/ay · $23,99/yıl · **$74,99 lifetime** | **Var, cömert** — sınırsız antrenman kaydı, süresiz |
| **Cal AI** | 1 | $9,99/ay · $29,99/yıl (paywall A/B testli) | Var, dar: günde ~3 tarama |
| **SnapCalorie** | 1 | ~$59/yıl | Var, dar: günde 3 AI kaydı |

Kaynaklar: macrofactor.com/workouts/price · hevy.com/pricing · sensai.fit/blog/hevy-review-2026 ·
eesel.ai/blog/cal-ai-pricing

**Karar: tek kademe.** Gerekçeler:
- İndie geliştirici iki kota sistemini, iki paywall'ı, iki destek akışını taşıyamaz.
- İki kademe, alt kademeyi "eksik ürün" haline getirir; koçluk ürününde "yarım koç" satmak
  konumlandırmayı bozar.
- İkinci kademe **veriyle** eklenir: kullanıcıların **>%5'i günlük kotayı düzenli olarak
  doldurmaya başlarsa** o zaman "Coach+" anlamlı olur. Önce ölç.

---

## C14 · Aylık / yıllık karışımı

| Veri | Değer | Kaynak |
| --- | --- | --- |
| Yıllık abonelerin **1. ay içinde** iptal oranı | tüm yıllık iptallerin **%35'i** | RevenueCat State of Subscription Apps 2026 |
| Yıllık abonelerin **12 ay içinde** iptali | **~%72** (2025'te %56'ydı — **kötüleşti**) | aynı |
| AI uygulamaları — 1. yıl gerçekleşen LTV | **$30,16** vs AI olmayan **$21,37** (**+%41**) | aynı |
| AI uygulamaları — **aylık planlar** 12 ayda | **%36 daha kötü tutuluyor** | aynı |
| $50/ay altı AI-native ürünler | 12 ayda gelirinin **dörtte üçünden fazlasını** kaybediyor | duperrin.com (2026-09-08) |

> **İki net sonuç:**
> 1. **AI ürünlerinde aylık plan zehirli** — %36 daha kötü tutuluyor. Yıllığa itmek gerekiyor.
> 2. Ama **yıllık da eskisi gibi değil** — 12 aylık churn %56'dan %72'ye çıktı. "Yıllık sattım,
>    1 yıl garantim var" varsayımı artık yanlış; iade ve iptal ilk ayda yoğunlaşıyor.

**Yıllık indirim oranı.** Sektör pratiği %40–60. Kategori örnekleri:
Hevy $2,99×12=$35,88 → $23,99 (**%33 indirim**). MacroFactor $11,99×12=$143,88 → $71,99 (**%50**).
Cal AI $9,99×12=$119,88 → $29,99 (**%75** — agresif).

**Öneri: %58–62 indirim.** Aylık fiyatı yüksek tut (caydırıcı olsun, ama var olsun),
yıllığı gerçek fiyat yap. Aylık plan iki işe yarar: (a) yıllığın referans fiyatı olur,
(b) yıllığa güvenmeyene bir kapı bırakır.

**LTV'yi maksimize eden karışım:** yıllık ağırlıklı. Ama ilk ay iptali %35 olduğu için
**1. ay onboarding'i, fiyattan daha önemli.** (Bu, I1-onboarding dosyasının konusu.)

---

## C15 · Lifetime seçeneği — **KRİTİK SORU**

### Hevy neden $74,99 lifetime satabiliyor?
Hevy'nin marjinal maliyeti **≈ sıfır.** Antrenman kaydı = veritabanı satırı. Kullanıcı 20 yıl
kalsa maliyet birkaç dolar. Lifetime, Hevy için **ön ödemeli nakit + churn'ün tamamen ortadan
kalkması** demek.

### Bizim durumumuzda hesap

| Varsayım | Değer |
| --- | --- |
| Lifetime fiyatı (Hevy paritesi) | $74,99 → Apple %15 sonrası **net $63,74** |
| Ortalama ödeyen kullanıcı LLM maliyeti | $0,163/ay (ucuz yığın, ödeyenler orta-ağıra kayık) |
| **Kotanın izin verdiği tavan** maliyet | **$1,21/ay** (aşağıda D21'de hesaplandı) |
| Geri ödeme süresi — ortalama kullanıcı | 63,74 / 0,163 = **391 ay ≈ 32 yıl** ✅ |
| Geri ödeme süresi — **kotasını sürekli dolduran** kullanıcı | 63,74 / 1,21 = **53 ay ≈ 4,4 yıl** ⚠️ |
| Kota **olmasaydı**, Sonnet 5 ile saldırgan kullanıcı | 63,74 / 68,40 = **1 aydan az** ☠️ |

### Karşı argümanlar (lifetime lehine, dürüst olalım)
- Yıllık abonenin **%72'si 12 ayda gidiyor** → beklenen ömür ≈ 1,39 yıl → $39,99 yıllık planın
  gerçekleşen LTV'si **≈ $47 net.** Lifetime $63,74 **peşin** — yani nominal olarak %35 daha fazla,
  **bugün**, sıfır churn riskiyle.
- Kurucunun cebinde para yok. 200 kişilik "Founding Member" lifetime satışı = **~$12.700 net**,
  bu gerçek bir tohum sermayesi.

### Karşı-karşı argümanlar (lifetime aleyhine)
1. **Geri alınamaz.** Yanlış fiyatlandırdığın aboneliği zamla düzeltirsin; yanlış fiyatlandırdığın
   lifetime'ı düzeltemezsin. Ömür boyu taşırsın.
2. **LLM fiyatları düşmüyor, artıyor.** Kanıt: **Gemini 3.7/3.8 Flash 1 Ocak 2027'de 2×'e çıkıyor**
   ($0,75 → $1,50). "Modeller ucuzlar" varsayımı 2026'da yanlışlandı.
3. **Ürün büyüdükçe kullanım büyür.** Bugün 25 mesaj/gün kotalı ürün, 2 yıl sonra sesli koçluk
   ve video analizi eklerse lifetime kullanıcı bunları da bekler.
4. **En kötü müşteriyi seçer.** Lifetime'ı alan, ürünü en çok kullanacağını düşünen kişidir —
   yani ortalama değil, ağır kullanıcı profili.
5. **Yanlış zamanda nakit.** Lifetime, geleceğin tekrarlayan gelirini bugüne satmaktır.
   Tekrarlayan gelirin var olduğunu **kanıtlaman gereken** dönemde bunu yapmak, ölçümü bozar:
   MRR grafiği yalan söyler.

### **KARAR: Lansmanda lifetime YOK.**

Şartlı istisna — sadece nakit gerçekten gerekirse:
- **En erken 6. ay**, gerçek maliyet verisi eldeyken
- **Fiyat ≥ $149** (10 yıl × kota tavanı $1,21/ay = $145 maliyet karşılığı — yani en kötü
  senaryoda bile başabaş)
- **Adet sınırlı** (örn. 200 kişi) ve **süre sınırlı**
- **Kota metni satış sayfasında açık:** "Lifetime, planın kotasını ömür boyu verir; sınırsız
  kullanım değildir." Bu cümle yoksa Fitia tuzağına düşersin.

---

## C16 · Bölgesel fiyatlandırma (PPP)

### Apple'ın araçları (2026)
- **900 fiyat noktası**, **175 mağaza**, **44 para birimi**
- Artış adımları: $10 altı **$0,10**, $10–50 arası **$0,50**, $50 üstü **$1,00**
- Baz fiyatı bir mağazada belirleyip diğerlerine **otomatik dönüştürme** yapabiliyorsun
- Her mağazayı **manuel** olarak da ayarlayabiliyorsun

Kaynak: mirava.io/blog/apple-app-store-price-tiers-how-they-work-2026

### Uygulanmalı mı? — evet, ama sonra

| Veri | Değer |
| --- | --- |
| Medyan install başına gelir (60 gün) — Kuzey Amerika | **~$0,55** |
| Aynı — Hindistan / Güneydoğu Asya | **~$0,11** |
| 2 haftada | $0,38 vs $0,08 |
| **Flo** (sağlık uygulaması) bölgesel fiyatlandırmaya geçince | İngilizce olmayan pazarlarda **+%80** büyüme, İngilizce pazarlarda +%35 |

Apple'ın otomatik dönüşümü **satın alma gücünü hesaba katmıyor** — Hindistan ve Brezilya'da fiyat
karşılanabilir seviyenin **2–3 katı** çıkıyor.

**Ayrıca (Türkiye ilgisi):** Ocak 2026'da Apple dokuz ülkede vergi/fiyat ayarlaması yaptı;
**Türkiye'de dijital vergi indirimi** vardı.

**Karar:** ABD baz fiyatını belirle, lansmanda **Apple'ın otomatik dönüşümünü kullan**
(sıfır iş). ABD fiyatı doğrulandıktan sonra (3–6 ay), Tier-2/3 pazarlara **%40–60 manuel PPP
indirimi** uygula. Erken PPP, ABD'de doğru fiyatı bulmadan uygulanırsa iki değişkeni aynı
anda test etmiş olursun.

---

## C17 · Ücretsiz katman olmalı mı? — MacroFactor vs Hevy paradoksu

### Sert paywall vs freemium — 2026 verisi (RevenueCat, 115.000+ uygulama, $16 mlr+ gelir)

| Metrik | **Sert paywall** | **Freemium** | Fark |
| --- | --- | --- | --- |
| 35. gün dönüşüm (medyan) | **%10,7** | %2,1 | **5×** |
| **Install başına gelir (60 gün)** | **$3,09** | $0,38 | **8×** |
| 12 aylık tutundurma | %27 | %28 | fark yok |

Kaynak: revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026

> 12 aylık tutundurmanın **aynı** olması kritik: sert paywall "kaliteli kullanıcı kaybetmiyor",
> sadece hiç ödemeyecek olanı erken eliyor.

### Peki Hevy neden işliyor?
Ayrım **marjinal maliyet + ücretsiz kullanıcının ürettiği değer**de:

| | **Hevy** | **MacroFactor** | **Bizim ürün** |
| --- | --- | --- | --- |
| Ücretsiz kullanıcının marjinal maliyeti | ≈ $0 (veritabanı satırı) | — | **> $0 (her LLM çağrısı para)** |
| Ücretsiz kullanıcı değer üretiyor mu? | **Evet** — sosyal akış, antrenman rutini paylaşımı, ağ etkisi, viral döngü | Hayır | **Hayır** — koçluk özel ve bire bir |
| Değer nerede teslim ediliyor? | Kısmen halka açık | Özel | **Özel** |

**Kural:** *Freemium, marjinal maliyet ≈ 0 iken VE ücretsiz kullanıcı değer (içerik/ağ/tavsiye)
ürettiğinde işler. Sert paywall, marjinal maliyet > 0 iken VE değer özel teslim edildiğinde işler.*

**Bizim ürün ikinci kategoride → sert paywall.**

### Ama YouTube köprüsü ne olacak?
27K abonelik kanal ücretsiz katman ister gibi görünüyor. Çözüm ücretsiz katman değil,
**ücretsiz araç**: kanal izleyicisine giriş gerektirmeyen, LLM kullanmayan, deterministik
bir web hesaplayıcısı ver (TDEE, hacim planlayıcı, ilerleme grafiği). Maliyeti sıfır,
paylaşılabilirliği yüksek, uygulamaya köprü kurar, LLM faturası yazmaz.

---

## C18 · Trial

| Veri | Değer | Kaynak |
| --- | --- | --- |
| **Kart zorunlu (opt-out)** dönüşüm | %35–55, **medyan %44** | shno.co / growthspree 2026 |
| Kart istemeyen (opt-in) dönüşüm | %8–22, medyan %14 | aynı |
| Fark | **3–4×** | aynı |
| Kısa deneme (<4 gün) dönüşüm | %25,5 | RevenueCat 2026 |
| Uzun deneme (17–32 gün) | **%42,5** (**+%70**) | RevenueCat 2026 |
| 3 günlük denemede iptallerin | **%55,4'ü 0. gün**, %84'ü 0–1. gün | RevenueCat 2026 |
| Health & Fitness trial→paid medyan | **%39,9**, en iyi %10: **%68,3** | RevenueCat |
| Alışkanlık temelli uygulamalarda (meditasyon, uyku, fitness) | **14 gün, 7 günü geçiyor** | lifecyclearchitect.com |
| Duolingo 14 → 7 gün | Deney hızını **ikiye katladı** | RevenueCat 2026 |

**Denemenin bize maliyeti:** kullanıcı başına $0,15/ay → 7 gün ≈ **$0,035**, 14 gün ≈ **$0,07**.
Yani deneme süresini uzatmak **maliyet açısından tamamen önemsiz.** Karar tamamen dönüşüm verisi.

**Karar: 7 gün, kart zorunlu.** Deneme boyunca **kota aktif** (deneme çiftçiliğini engeller,
ve kullanıcı gerçek ürünü görür). Lansmanın **ilk fiyat deneyi** 7 vs 14 gün olsun — veri
14'ün lehine ama 7 daha hızlı geri besleme veriyor; kanal büyümesi yavaşken hız daha değerli.
**3 gün kullanma** — iptallerin %55'i 0. günde geliyor, alışkanlık kurulmuyor.

---

## C19 · Fiyat A/B testi

**Apple'ın kendi native fiyat A/B testi yok.** Yöntem:
- App Store'da **her varyant için ayrı Subscription Group** oluştur
- **RevenueCat Experiments** ile trafiği böl: kontrol + **en fazla 2 ek varyant** (toplam 4'e kadar)
- Hazır test tipleri: Introductory offer, Free trial offer, **Price point**, Paywall design,
  Subscription duration, Subscription ordering
- Tüm abonelik yaşam döngüsü ölçülüyor (sadece dönüşüm değil, gerçekleşen gelir)

Kaynak: revenuecat.com/docs/tools/experiments-v1

**Kanıt ki yapılıyor:** Cal AI paywall'ını agresif A/B test ediyor — $2,99/hafta, $5,99/ay,
$19,99/yıl, $49,99/yıl varyantları gözlenmiş.

**Uyarı:** 4 varyant paralel test daha hızlı görünür ama istatistiksel anlamlılık için
**çok daha fazla trafik** ister. Ayda 200 install ile 4 varyant test edemezsin — 2 varyantla başla.

---

## C20 · Zam yapmak

### Apple'ın mekaniği
- Her ülke için **fiyat artışı eşikleri** var. **Eşiğin altında:** kullanıcı sadece bilgilendirilir,
  abonelik otomatik yenilenir. **Eşiğin üstünde veya sık artışta:** kullanıcının **açık onayı** gerekir.
- Süreç: **30 gün önce e-posta** → in-app mesaj → **7 gün önce push** (mesajı görmediyse) →
  30. günde fiyat artar, kullanıcı iptal etmediyse.
- **Onay gerektiren artışta kullanıcı onaylamazsa abonelik dönem sonunda sona erer.**
- Sektör analizi: onay gerektiren değişikliklerde **mevcut abone tabanının %15–35'i onay vermiyor.**

Kaynaklar: developer.apple.com/help/app-store-connect/reference/auto-renewable-subscription-price-increase-thresholds ·
support.apple.com/en-us/109501 · appsops.store/blog/apple-subscription-grandfathering

### Karar: **baştan yüksek.**
Gerekçe: zam, en iyi ihtimalle bildirimle geçer; onay eşiğini aşarsa **tabanın üçte birini
kaybedersin.** Buna karşılık **indirim serbest** — Apple indirim için onay istemiyor,
introductory offer / promotional offer / win-back offer araçları hazır.

**Kural: yukarı hareket pahalı ve tek yönlü, aşağı hareket bedava. Yüksekten başla,
taktik indirimle in.**

---
# D · SENTEZ

## D-0 · Kurucunun varsayımını sınama

> *"LLM maliyeti varsa kullanıcıya yansıtılmalı. Bizi hiçbir şekilde eksiye geçirmemeli."*

İkinci cümle doğru ve kota ile çözülüyor. **Birinci cümle veriye çarpıyor:**

| | Değer |
| --- | --- |
| Ödeyen kullanıcı başına aylık LLM + depolama maliyeti | **$0,18** |
| Ödeyen kullanıcı başına aylık net gelir ($59,99/yıl, Apple %15 sonrası) | **$4,25** |
| **LLM maliyetinin gelire oranı** | **%4,2** |
| Kotasını **her gün sonuna kadar** dolduran kullanıcıda | $1,21 → **%28** |

**LLM maliyeti bu üründe ayrı fiyatlandırılacak kadar büyük değil.** Kullanıcıya ayrı
yansıtmak (kredi, coin, token satışı) %4'lük bir kalemi tahsil etmek için ürünün en büyük
güven riskini almak demek — Fitia tam olarak bu hatayı yaptı.

**Doğru mimari:** maliyeti **fiyata göm**, **kotayla tavanla**, kotayı **kimsenin görmeyeceği
kadar cömert** ama **saldırganı durduracak kadar sert** yerde tut.

---

## D21 · Somut fiyat ve kota önerisi

### Fiyat

| | Fiyat | Apple %15 sonrası net | Aylık eşdeğer |
| --- | --- | --- | --- |
| **Aylık** | **$12,99/ay** | $11,04 | $12,99 |
| **Yıllık** ← ana ürün | **$59,99/yıl** | **$50,99** | **$5,00** (%62 indirim) |
| Lifetime | **YOK** (C15) | — | — |
| Ücretsiz katman | **YOK** (C17) | — | — |
| **Deneme** | **7 gün, kart zorunlu**, kota aktif | — | — |

**Neden $59,99:**
- Hacim bandının ($24–60/yıl) **tepesi**, ciddi koçluk bandının ($72–100) altı. Konumlandırma:
  *"en pahalı takip uygulaması değil, en ucuz gerçek koç."*
- Telaffuz edilen kabul (~$35) ile isyan noktası ($80) arasında, isyana uzak.
- MacroFactor $71,99'da ücretsiz katmansız satıyor → tavan orada, altındayız.
- **Yukarı hareket pahalı (onay eşiği, %15–35 kayıp), aşağı hareket bedava.** Yüksekten başla.
- İlk deney: **$59,99 vs $39,99**, RevenueCat Experiments, 2 varyant.

### Kota — "Coach" planı

| Ne | Kota | Sıfırlanma |
| --- | --- | --- |
| **Koç sohbeti** | **Günde 25 mesaj** | Her gün 00:00 (kullanıcının saat dilimi) |
| **Fotoğraf analizi** | **Günde 10 fotoğraf** | Her gün |
| **Haftalık derin analiz** | Haftada 1 (otomatik, gece Batch API'de üretilir → **%50 indirim**) | Pazartesi |
| Kayıt, plan, grafik, hesaplama, barkod, etiket OCR, ilerleme | **Sınırsız** | — |
| Hız sınırı | 6 mesaj/dakika | — |

**Anlatım dili** (B10'a göre): "kredi" kelimesi geçmez. Paywall'da tek satır:
*"Günde 25 koçluk mesajı, günde 10 fotoğraf analizi. Kayıt ve planlama sınırsız."*
Sohbet ekranının üstünde küçük sayaç. %80'de yumuşak uyarı. Bitince: sıfırlanma saati + kota
dışı her şey çalışmaya devam eder + Apple Intelligence'lı cihazda **cihaz üstü moda düşer**.

### Kota neden bu sayılar?

| | Ağır kullanıcı profili (A5) | Kota | Kat |
| --- | --- | --- | --- |
| Sohbet | 150/ay (≈5/gün) | 750/ay (25/gün) | **5×** |
| Fotoğraf | 90/ay (3/gün) | 300/ay (10/gün) | **3,3×** |

**Kota, ağır kullanıcının bile 3–5 katı → pratikte kimse görmez.**
Ama tavan sabit:

| Senaryo | Aylık maliyet | Net gelirin yüzdesi |
| --- | --- | --- |
| Ortalama ödeyen kullanıcı | **$0,18** | %4,2 |
| Ağır kullanıcı | $0,40 | %9,4 |
| **Kotayı her gün sonuna kadar dolduran** | **$1,21** | **%28** |
| Kota olmasaydı, script'li saldırgan (Sonnet 5) | $68–122 | **%1.600–2.900** ☠️ |

> Kotanın işlevi ortalamayı kısmak değil. **Kuyruğu $122'den $1,21'e indirmek** — yani
> en kötü müşteride bile **%72 brüt marj** garanti etmek.

---

## D21b · Kâr eşiği hesabı

### Sabit maliyetler (aylık)

| Kalem | Aylık |
| --- | --- |
| Apple Developer Program ($99/yıl) | $8,25 |
| Hetzner CX22 VPS | $4,59 |
| Alan adı + çeşitli | ~$2 |
| RevenueCat | ücretsiz kademe var; **2026 eşiği bu turda doğrulanmadı** |
| **Toplam** | **~$15** |

### Katkı payı
Ödeyen yıllık abone başına: **$4,25 net − $0,18 değişken = $3,80 katkı/ay** (marj %90)
*(Değişken maliyet: $0,163 LLM + ~$0,02 depolama/bant)*

### **Başabaş: 4 yıllık abone.**
$15 ÷ $3,80 = 3,9

> Bu sayıyı iki kez oku. **Dört ödeyen kullanıcı tüm operasyonu karşılıyor.**
> Bu üründe kâr eşiği bir problem değil — problem *edinim*.

### Anlamlı gelir eşikleri

| Ödeyen yıllık abone | Net gelir/ay | Değişken/ay | Sabit/ay | **Net kâr/ay** | Anlamı |
| --- | --- | --- | --- | --- | --- |
| 4 | $17 | $0,7 | $15 | $1 | başabaş |
| 25 | $106 | $4 | $15 | **$87** | sunucu + araç parası çıkıyor |
| **100** | $425 | $18 | $15 | **$392** | **öğrenci için anlamlı** |
| 250 | $1.062 | $45 | $25 | **$992** | **tam zamanlı düşünülebilir** |
| 500 | $2.125 | $90 | $40 | **$1.995** | |
| 1.000 | $4.249 | $180 | $60 | **$4.009** | |
| 2.500 | $10.623 | $450 | $150 | **$10.023** | |

*(Sabit maliyet A6'daki aşamalı altyapı tablosuna göre büyütüldü.)*

### Kaç install gerekiyor?

Doğrulanmış veri: Health & Fitness install başına 60 gün geliri **$0,63**, 12 ay LTV **$1,21**.
(RevenueCat 2026 sert paywall medyanı $3,09/install — bu tüm kategorileri kapsıyor ve
bizim kategori verimizin çok üstünde. **Muhafazakâr olan $1,21'i kullan.**)

| Hedef net kâr/ay | Gereken ödeyen abone | ≈ Gereken yıllık install (LTV $1,21, %15 Apple sonrası net $50,99/abone → install→abone ≈ %2,4) |
| --- | --- | --- |
| $392 | 100 | ~4.200/yıl (~350/ay) |
| $992 | 250 | ~10.400/yıl (~870/ay) |
| $4.009 | 1.000 | ~41.700/yıl (~3.500/ay) |

> **27K abonelik Shorts kanalı ayda 350 install üretebilir mi?** Muhtemelen evet.
> 3.500/ay üretebilir mi? Hayır — o noktada ASO + ana kanal + ücretli edinim gerekir.
> **İlk hedef net: ayda 350 install → 100 abone → $392/ay.** Bu ulaşılabilir ve
> "cepten para yakmıyorum, üstüne kazanıyorum" eşiği.

---

## D22 · Gelir gelmeden maliyet ne kadar?

### Senaryo 1 — 100 beta kullanıcı (hepsi ücretsiz)

| Varyant | LLM | Depolama | VPS | Apple | **Toplam/ay** |
| --- | --- | --- | --- | --- | --- |
| **Kotasız, cömert** (beta kullanıcıları orta profil) | $15,10 | $1 | $4,59 | $8,25 | **$29** |
| **Kotalı beta** (günde 10 mesaj + 3 foto) | $6,00 | $0,50 | $4,59 | $8,25 | **$19** |
| Kotalı + Apple FM hibrit | $4,20 | $0,50 | $4,59 | $8,25 | **$18** |

**Sonuç: 100 beta kullanıcı ayda ~$20–30.** Öğrenci bütçesi için **taşınabilir.**
Beta'yı 3 ay sürdürürsen toplam **$60–90.** Bu kabul edilebilir bir yatırım.

### Senaryo 2 — 1.000 ücretsiz kullanıcı

| Varyant | LLM | Depolama (6. ay) | VPS | Apple | **Toplam/ay** |
| --- | --- | --- | --- | --- | --- |
| **Cömert ücretsiz katman** (sınırsız sohbet + 30 foto/ay) | $151 | $1 | $10 | $8,25 | **$170** ☠️ |
| Dar ücretsiz katman (sohbet YOK, günde 1 foto) | $28 | $1 | $10 | $8,25 | **$47** ⚠️ |
| **Sert paywall** (ücretsiz katman yok, 7 gün deneme) | ~$5* | $0,5 | $5 | $8,25 | **$19** ✅ |

\* 1.000 install → deneme başlatan ~%25 → 250 deneme × $0,035 = $8,75, dönüşmeyenler dahil.

> **Bu tablo, ücretsiz katman kararını tek başına veriyor.**
> 1.000 ücretsiz kullanıcı, cömert bir katmanla **ayda $170** yazıyor — kurucunun
> "cepten yüzlerce dolar yakamam" kısıtını **doğrudan** ihlal ediyor.
> Aynı 1.000 install sert paywall'la **ayda $19 maliyet ve ~107 ödeyen kullanıcı** ($455 net gelir)
> üretiyor. **Sekiz kat gelir, dokuz kat düşük maliyet.**

### Nakit akışı uyarısı
Apple, satışın gerçekleştiği mali ayın kapanışından **~30–45 gün sonra** ödüyor.
Yani lansmandan sonra **ilk paranın gelmesi 2 ay sürer.** Bu 2 aylık maliyeti ($40–60)
peşin karşılayacak nakit gerekiyor. Bu kadar.

---

## D-Son · Tek cümlelik öneri

> **$59,99/yıl (veya $12,99/ay), 7 günlük kart zorunlu deneme, ücretsiz katman yok,
> lifetime yok, kota "günde 25 koçluk mesajı + günde 10 fotoğraf analizi, kayıt ve
> planlama sınırsız", kota bitince sert durdurma değil cihaz üstü moda düşme.**

Arkasındaki birim ekonomi:
- Net gelir/ay/abone: **$4,25**
- Değişken maliyet: **$0,18** (kotanın izin verdiği tavan: **$1,21**)
- Brüt marj: **%96** (en kötü senaryoda **%72**)
- Sabit maliyet: **~$15/ay**
- **Başabaş: 4 abone**
- Ayda $392 net kâr: **100 abone ≈ 350 install/ay**

---

## Uygulama sırası (öncelik)

| # | İş | Neden | Süre |
| --- | --- | --- | --- |
| 1 | Sağlayıcı hesabında **organizasyon harcama limiti** kur | Kod hatası faturayı patlatmasın | 5 dk |
| 2 | Fotoğrafı istemcide **1024 px**'e küçült | Görüntü maliyetinde **%74** | 30 dk |
| 3 | **Sunucu tarafı günlük kota sayacı** | Kuyruğu keser | 1 gün |
| 4 | **Prompt caching** — sabit sistem promptu, `datetime.now()` yok | Girdi maliyetinde ~%90 | 2 saat |
| 5 | Günlük **pg_dump → Cloudflare R2** | Tek disk arızası ürünü bitirmesin | 1 saat |
| 6 | App Store Connect **tax form** (W-8BEN) | Doldurulmazsa Apple maksimum stopajı uygular | 15 dk |
| 7 | **Small Business Program** başvurusu | %30 → %15 | 10 dk |
| 8 | Fotoğrafları **30 günde otomatik sil** | Depolama LLM'den hızlı büyüyor + GDPR | 2 saat |
| 9 | **Haftalık analizi Batch API**'ye taşı | O kalemde %50 | 3 saat |
| 10 | **Apple FM** ile barkod + OCR (iOS 27, 14 Eyl 2026) | Bu iki iş **tamamen bedava ve cihazda** | 1–2 gün |
| 11 | App Attest + DeviceCheck | Deneme çiftçiliği ve sahte istemci | 2 gün |

---

## Doğrulanamayanlar — "bulunamadı" listesi

| Soru | Durum |
| --- | --- |
| Türkiye'den App Store satışında W-8BEN sonrası stopaj oranı (%0 iddiası) | **Doğrulanamadı.** Apple ülke bazlı oran yayımlamıyor; gelirin telif mi ticari kazanç mı sayıldığı da belirtilmiyor. Apple'a veya mali müşavire sorulmalı |
| Apple Intelligence uyumlu cihazların ABD iPhone tabanındaki payı | **Bulunamadı** |
| Apple Foundation Models'ta bir görselin kaç token yediği | **Bulunamadı** — Apple sayı yayımlamıyor, "daha büyük görsel daha çok token" diyor. Ölçüm `tokenCount()` ile uygulamada yapılmalı |
| Apple FM'in yemek porsiyonu/gram tahmininde doğruluğu | **Bulunamadı** — kanıt yok, A/B test şart |
| Fly.io ve Railway 2026 fiyatları | Bu turda doğrulanmadı |
| RevenueCat 2026 ücretsiz kademe eşiği | Doğrulanmadı |
| Fitia dışında "yıllık ödeyene ek para sattırma" isyan vakası | Tüketici tarafında bulunamadı; B2B/geliştirici tarafında bol (Cursor, Copilot, Antigravity) |

---

## Tüm kaynaklar

**LLM fiyatları**
- Anthropic model fiyat tablosu (claude-api skill, önbellek 2026-06-24) · https://platform.claude.com/docs
- https://developers.openai.com/api/docs/pricing (2026-09-11)
- https://ai.google.dev/gemini-api/docs/pricing (2026-09-11)
- https://platform.claude.com/docs/en/build-with-claude/vision
- https://blog.roboflow.com/image-token-cost-vlm/

**Cihaz üstü**
- https://developer.apple.com/videos/play/wwdc2026/241/ (What's new in Foundation Models)
- https://developer.apple.com/videos/play/wwdc2026/339/ (Bring an LLM provider to Foundation Models)
- https://developer.apple.com/documentation/technotes/tn3193-managing-the-on-device-foundation-model-s-context-window
- https://blakecrosley.com/blog/foundation-models-image-input-ios-27
- https://chatforest.com/builders-log/apple-foundation-models-ios-27-on-device-llm-api-builder-guide/
- https://www.macworld.com/article/3172166/ios-27-beta-updates-features-release-date.html

**Altyapı**
- https://bestusavps.com/reviews/hetzner/
- https://northflank.com/blog/hetzner-cloud-server-price-increases
- https://uibakery.io/blog/supabase-pricing
- https://developers.cloudflare.com/r2/pricing

**Apple komisyon / vergi / fiyat**
- https://developer.apple.com/app-store/small-business-program/
- https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/
- https://developer.apple.com/help/app-store-connect/reference/auto-renewable-subscription-price-increase-thresholds/
- https://support.apple.com/en-us/109501
- https://www.mirava.io/blog/apple-app-store-price-tiers-how-they-work-2026

**Kota / kredi**
- https://softwarepricing.com/blog/credit-based-pricing-ai/
- https://thegood.com/insights/ai-credits/
- https://www.digitalapplied.com/blog/github-copilot-ai-credits-billing-2026-cost-audit-playbook
- https://www.digitalapplied.com/blog/ai-subscriptions-vs-usage-credits-openai-anthropic-2026
- https://agentpedia.codes/blog/antigravity-credits-pricing-explained
- https://www.duperrin.com/english/2026/09/08/raise-price-ai-quotas-claude-chatgpt/
- https://developer.apple.com/documentation/devicecheck
- https://appleinsider.com/articles/24/07/09/how-to-mitigate-fraud-on-ios-devices-using-app-attest-and-devicecheck

**Fiyat / dönüşüm benchmark**
- https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026
- https://www.revenuecat.com/docs/tools/experiments-v1
- https://www.shno.co/marketing-statistics/free-trial-conversion-statistics
- https://lifecyclearchitect.com/guides/trial-to-paid-for-health-wellness/
- https://adapty.io/blog/health-fitness-app-subscription-benchmarks/

**Rakip fiyatları**
- https://macrofactor.com/workouts/price/
- https://hevy.com/pricing · https://www.sensai.fit/blog/hevy-review-2026
- https://www.eesel.ai/blog/cal-ai-pricing
- https://www.vust.ai/calorie-counter-comparison

---
*Dosya: K5-fiyat-kota-maliyet.md · Araştırma tarihi 2026-09-11 · Durum: TAMAMLANDI*
