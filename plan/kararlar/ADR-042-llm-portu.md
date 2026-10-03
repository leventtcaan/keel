# ADR-042 · LLM portu: `coach.LanguageModel`, sahte sağlayıcı, tek kapı
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-10-03 · **Karar veren:** agent (K-503); sağlayıcı seçimi Levent'te (K-511, ADR-041)

## Bağlam
ADR-004 dil modelini bir porta koydu; ADR-041 şimdilik gerçek çağrıyı, anahtarı ve harcamayı erteledi (Part 2-3 sahte sağlayıcı).
Mevcut mimari kural: ağa yalnız `privacy` modülü çıkar (`EgressRuleTests`); AI'a veri yalnız sağlayıcıyı adıyla anan rızayla (V2,
`ConsentGate` sağlayıcıyı ve veri türlerini `keel.consent.third-party-ai` ile karşılaştırır).

## Karar
1. **Port** `coach.LanguageModel.complete(ModelRequest) → ModelReply` (paket içi). İstek: amaç (sayım etiketi, gönderilmez), model,
   çıktı sınırı, talimat, turlar. Cevap: ham metin (şemaya göre okunmadan kullanılmaz, ADR-004) + token sayıları.
2. **Tek yol `CoachModel.ask`:** her çağrı `EgressGate.sendToAi(account, providerName, …)` içinde — rıza yoksa ya da rıza **başka
   bir sağlayıcıyı** anıyorsa model hiç çağrılmaz (`ConsentGate.requireAi`). Düz `send` AI'a veri taşıyamaz (sağlayıcı adı zorunlu).
   `LanguageModelBoundaryTests`: sahibi `LanguageModel`'e atanabilen hiçbir `complete`'e `CoachModel` dışında erişilmez — arayüz,
   adaptörün kendi sınıfı, metot referansı, dar alt arayüz, `super` (inceleme: ilk kural yalnız arayüz çağrısını görüyordu); her yol
   bir fikstürle kanıtlı. `CoachModel`'in kendi içi davranış testinde (`CoachModelTests`).
3. **Yapılandırma `keel.coach`:** `provider` (sunucunun bildiği adaptör adı), `provider-name` (çağrının gittiği sağlayıcı, rızanın
   andığı adla — V2), `model`, `max-output` (token; anahtar adında "token" yok: sır bekçisi), liste fiyatları (milyon token başına). Kodda model adı, sınır, fiyat yok (K2). Bilinmeyen sağlayıcı ya da imkânsız değer → sunucu açılmaz.
4. **Yalnız `fake`:** ağ yok, veri dışarı çıkmaz; söyleneni sırayla cevaplar, sorulanın son 100'ünü hatırlar (testler, K-506 seti;
   sınırsız bellek yok). Üretimde `provider-name: none` ve AI rıza yapılandırması yok → kapı kapalı. Hiçbir şey
   söylenmemişse `{}` döner → hiçbir cevap şeması kabul etmez → koç motorun yazdığını söyler (deterministik mod).
5. **Gerçek adaptör (K-511 sonrası):** adaptör ağa kendisi çıkmaz; HTTP `privacy` modülündeki bir taşıyıcıdan geçer (rıza kontrolü ile
   ayrılmaz). Bu ADR onu kurmaz; K-511'de ayrı karar. Harcama limiti ve anahtar (V5, ortam değişkeni) yayına çıkarken — DURUM'da.

## Neden
Ağ ve rıza tek noktada kalır (V2, V7); sağlayıcı değişimi bir yapılandırma + adaptör; sahte sağlayıcı testleri ve değerlendirme setini
maliyetsiz ve deterministik yapar.

## Alternatifler
| Alternatif | Neden değil |
|---|---|
| Spring AI / sağlayıcı SDK'sı şimdi | Gerçek çağrı yok (ADR-041); bağımlılık ve ağ erişimi `privacy` dışına taşar |
| Kapıyı çağıranlara bırakmak | Unutulan bir çağrı rızasız veri gönderir; tek yol + mimari test bunu imkânsız kılar |

## Geri dönmenin maliyeti
Düşük — port arkasında.

## Doğrulama
`LanguageModelConfigurationTests` (seçim, sınırlar, maliyet), `CoachModelTests` (rızasız çağrı yok; yapılandırılmış istek),
`LanguageModelBoundaryTests`, `EgressRuleTests`, `SecretsFromEnvironmentTests`.
