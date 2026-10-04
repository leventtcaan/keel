# ADR-056 · Yetki sunucuda: RevenueCat webhook'u, abonelik durumu, premium uçlar (K-701, K-703)
- **Durum:** KABUL (agent, teknik — ADR-019; ADR-012'nin uygulaması)
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
ADR-012: satın alma RevenueCat üzerinden, abonelik durumu backend'e webhook'la gelir, yetki **sunucuda** denetlenir; ücretsiz katman
yok ama kota ve abonelik bitince uygulama deterministik modda çalışır. ADR-012 Ek 1: mağaza tarafında hazır olan yok; değerler
yapılandırmadan okunur. RevenueCat'in webhook'u (resmî doküman, 4 Eki okundu:
`https://www.revenuecat.com/docs/integrations/webhooks`, `.../webhooks/event-types-and-fields`):
- **Kimlik doğrulama iki yolla:** panelde yazılan sabit bir `Authorization` başlığı değeri (önerilen) ya da **HMAC imzası**:
  `X-RevenueCat-Webhook-Signature: t=<unix saniye>,v1=<hex>`, HMAC-SHA256(`"<t>.<ham gövde>"`, imza sırrı); doğrulama ham gövde
  üzerinde, sabit zamanlı karşılaştırma, "isteğe bağlı" zaman toleransı (örnek 5 dk). İmza her denemede yeniden hesaplanır.
- **Cevap:** yalnız 200 başarı; 60 sn'de bitmezse kopar; 5 kez yeniden dener (5, 10, 20, 40, 80 dk).
- **Aynı olay birden çok gelebilir** (doküman: nadir; olay `id`'siyle tekilleştir). Yeniden denemeler aynı `id` ve
  `event_timestamp_ms`'i taşır. **Sıra garantisi yazmıyor** `[doğrulanmadı]`; gecikmeler (saniyeler ↔ iptalde ~2 sa) ve yeniden
  denemeler sıranın bozulabileceğini gösteriyor.
- **İade** ayrı olay değil: `CANCELLATION` + `cancel_reason = CUSTOMER_SUPPORT`. **`SUBSCRIPTION_PAUSED` yalnız Google Play**;
  erişim `EXPIRATION` + `expiration_reason = SUBSCRIPTION_PAUSED` ile biter. `environment`: `SANDBOX` | `PRODUCTION`.
- Doküman her webhook'tan sonra `GET /subscribers` REST çağrısını da öneriyor (veri tutarlılığı).
- Plan: webhook'lar **Pro** planında; Pro, aylık izlenen gelir $2.500'e kadar ücretsiz (fiyat sayfası, 4 Eki) → para kapısı açmıyor.

## Karar sürücüleri
- Webhook herkese açık bir URL: doğrulanmamış istek durumu **asla** değiştirmez (V5 sır ortamda; repo public).
- Durum geçişleri saf, özellik testli; yinelenen ve sıra dışı olay sonucu bozmaz.
- Sunucu olaydan yalnız durumun gerektirdiğini saklar (ADR-012 Ek 1; fiyat, ülke, `subscriber_attributes` saklanmaz).
- Yetki diğer modüllere tek, küçük bir API.

## Karar
1. **Kimlik doğrulama: HMAC imzası zorunlu**, sabit `Authorization` değeri kullanılmaz. Neden: imza gövdeye bağlı (yol üstünde
   değiştirilen gövde reddedilir) ve zamanlı (yakalanmış bir isteğin tekrarı tolerans dışında reddedilir); sabit başlık ikisini de
   yapmaz. Sır `KEEL_REVENUECAT_WEBHOOK_SECRET` (yoksa sunucu başlamaz — oturum anahtarı kalıbı); tolerans yapılandırmada (5 dk,
   dokümanın örneği). Karşılaştırma `MessageDigest.isEqual`. İmzasız, bozuk, toleransı aşan → **401**, durum değişmez (RevenueCat
   yeniden dener; yanlış sır panelde görünür). Gövde üst sınırı yapılandırmada (olaylar birkaç KB).
2. **Rota:** `POST /webhooks/revenuecat`, `/v1` dışında — uygulamanın sözleşmesi değil RevenueCat'in; `contracts/openapi.yaml`'a
   girmez (mobil tip üretmez). Güvenlik zincirini `subscription` kendisi kurar (`@Order(0)`, oturumsuz, CSRF kapalı); kimlik denetimi
   imzadır.
3. **Hangi hesap:** `app_user_id` bizim hesabın opak kimliği (UUID) olmalı ve hesap var olmalı (`identity.KnownAccounts`). Değilse
   (anonim `$RCAnonymousID`, silinmiş hesap) → 200, hiçbir şey saklanmaz. Silmeyle yarış: `privacy` ikinci geçişi (K-214) sonradan
   yazılanı da siler.
4. **Hangi olay:** yalnız `entitlement_ids` yapılandırılmış yetkiyi (`keel.subscription.revenuecat.entitlement`, öneri `premium`)
   içerenler ve `environment` izinli listede olanlar (alan yoksa izinsiz sayılır — 500 değil 200) (`environments`; şimdilik `PRODUCTION`, `SANDBOX` — TestFlight satın alımları
   sandbox'tır; **mağaza yayınında SANDBOX çıkarılır**, M9 kontrol listesi). `TRANSFER` yetki taşımaz, ayrıca işlenir (madde 6).
   Gerisi (TEST, PRODUCT_CHANGE, INVOICE_ISSUANCE, deneyler, sanal para…) 200 + yok sayılır.
5. **Durum makinesi (saf, `SubscriptionState.next`):** durum = (`status`, `accessUntil`, `lastEventAt`). **Erişim yalnız
   `accessUntil`'den okunur:** `active(now) ⇔ now < accessUntil`; `status` açıklayıcıdır (Part 2'de "deneme", "şu tarihte biter",
   "duraklatıldı" demek için).
   | Olay | status | accessUntil |
   |---|---|---|
   | INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, SUBSCRIPTION_EXTENDED, REFUND_REVERSED, TEMPORARY_ENTITLEMENT_GRANT, NON_RENEWING_PURCHASE | `period_type = TRIAL` → TRIAL, değilse ACTIVE | `expiration_at_ms` (yoksa olay yok sayılır: ömür boyu ürün yok) |
   | CANCELLATION, `cancel_reason = CUSTOMER_SUPPORT` (iade) | REFUNDED | olay anı (erişim hemen biter) |
   | CANCELLATION, başka neden | CANCELLED | `expiration_at_ms` (dönem sonuna kadar erişim — iptal cezalandırmaz) |
   | BILLING_ISSUE | BILLING_ISSUE | `grace_period_expiration_at_ms`, yoksa `expiration_at_ms` |
   | SUBSCRIPTION_PAUSED (Play) | PAUSED | `expiration_at_ms` (doküman: duraklatmada erişim kesilmez) |
   | EXPIRATION, `expiration_reason = SUBSCRIPTION_PAUSED` | PAUSED | olay anı |
   | EXPIRATION, başka neden | EXPIRED | olay anı |
   Her geçiş yalnız olaydan hesaplanır (önceki durumdan değil) → aynı olayı iki kez uygulamak bir kez uygulamakla aynı.
6. **TRANSFER:** `transferred_from`'daki bizim hesaplar → EXPIRED, erişim olay anında biter. `transferred_to` için olay bitiş tarihi
   taşımaz; alıcı hesabın erişimi sonraki olayıyla (RENEWAL vb.) gelir. Eksik: REST ile anında tazeleme (aşağıda).
7. **Sıra:** olay zamanı (`event_timestamp_ms`) hesabın `lastEventAt`'inden **eskiyse** kaydedilir ama durumu değiştirmez (geri
   götürmez); eşit ya da yeniyse uygulanır. Yok sayılan olaylar `lastEventAt`'i ilerletmez.
8. **Tekillik:** `subscription.webhook_event (event_id birincil anahtar, account_id, type, event_at)`; ekleme `on conflict do nothing`,
   eklenmediyse olay işlenmiş sayılır — durum güncellemesiyle **aynı işlemde**. Hesap silinince olaylar ve durum silinir; dışa
   aktarmada durum + olaylar (tür, zaman).
9. **Yetki API'si:** `Entitlements.active(AccountId, Instant now)` (`subscription` temel paketi). Hiç kaydı olmayan hesap: yetkisiz.
10. **Premium uçlar (K-703):** modele giden üç uç — `/v1/coach/messages`, `/v1/meals/parse`, `/v1/meals/photo` — modele sormadan
    önce yetki ister; yoksa **403 `ENTITLEMENT_REQUIRED`** (sözleşmede; Part 2'de telefon paywall'u açar). Sıra: motorun kendi
    cevabı (karar yok, yalnız motorun söyleyebileceği karar) yetki istemez → yetki → rıza → kota → model. Kayıt, karar kartı,
    geçmiş, motorun bütün uçları yetki istemez (deterministik mod). Kota yetkiyle birlikte: yetkili kullanıcının kotası bitince yine
    motorun sözleri, hata değil (K-508 aynen). "Kredi" kelimesi yok.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Sabit `Authorization` başlığı | Gövdeye ve zamana bağlı değil; sızan değer süresiz geçerli. HMAC aynı ücretsiz planda |
| İkisini birden kabul etmek | İki yol iki saldırı yüzeyi; tek mekanizma yeter |
| Her webhook'tan sonra `GET /subscribers` (RevenueCat'in önerisi) | Doğru tazelik, sıra ve TRANSFER'i çözer ama gizli API anahtarı + dış HTTP istemcisi + hesap yokken test edilemez. Sonraya: **K-704** (aşağıda), RevenueCat hesabı açılınca |
| Yetkisiz koç isteğine 200 + motorun sözleri | Telefon paywall'u ne zaman açacağını bilemez; rıza (CONSENT_REQUIRED) kalıbıyla tutarsız |
| 402 Payment Required | "Gelecekte kullanım için ayrılmış"; istemciler tutarsız; 403 + kod yeterli |
| Webhook'u `/v1/**` altında, sözleşmede | Uygulamanın değil RevenueCat'in sözleşmesi; mobil için gereksiz tip üretir |

## Geri dönmenin maliyeti
Düşük-orta: kimlik doğrulama yöntemi ve tazeleme stratejisi `subscription` içinde; yetki API'si değişmez.

## Etkilenen
`subscription` (webhook, durum, `Entitlements`), `identity` (`KnownAccounts`), `coach` (yetki kapısı), `shared` (`ENTITLEMENT_REQUIRED`),
sözleşme, `application.yml`, göç V33.

## Doğrulama
`RevenueCatSignatureTests` (doğru/yanlış sır, değişmiş gövde, tolerans, bozuk başlık), `SubscriptionStateProperties` (jqwik: tekrar
eden olay = bir kez; farklı zamanlı olayların her sırası aynı sonuç = en son olay), `RevenueCatWebhookTests` (DB: 401'de durum
değişmez, yinelenen olay bir kez, eski olay geri götürmez, bilinmeyen hesap saklanmaz, silme + dışa aktarma), `EntitlementGuardTests`.

## Açık iş
- **K-704:** RevenueCat REST tazelemesi (`GET /v1/subscribers/{id}`) — webhook'tan sonra ve TRANSFER alıcısı için; RevenueCat hesabı
  ve gizli API anahtarı (Levent) sonrası.
- M9 kontrol listesi: `environments`'tan SANDBOX çıkar.
