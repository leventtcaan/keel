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
   taşımaz; alıcı hesabın erişimi sonraki olayıyla (RENEWAL vb.) gelir. Eksik olan REST ile anında tazeleme Ek 3'te (K-704).
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
- **K-704:** RevenueCat REST tazelemesi — Ek 3'te yapıldı; canlı için Levent'in gizli API anahtarı `KEEL_REVENUECAT_API_KEY` bekliyor.
- M9 kontrol listesi: `environments`'tan SANDBOX çıkar.

## Ek 1 · K-705 telefonun okuduğu durum (agent, 4 Eki)
- **`GET /v1/subscription`** (sözleşmede, `Subscription`): `active` (zorunlu; sunucunun cevabı, `accessUntil`'den — madde 5),
  `appUserId` (zorunlu; hesabın opak UUID'si — telefon RevenueCat'e `logIn`'i bununla yapar, madde 3; telefon başka yoldan
  bilmiyor: oturum cevabında yok, jetonun içi telefonun işi değil), `status` + `accessUntil` yalnız hesabın bir durumu varsa. Hiç abone olmamış hesap → **200 + `active: false`** (hata değil; telefon
  paywall'u buna bakarak gösterir). Fiyat yok (ADR-012, K2). Uç yalnız okur.
- `status` enum'u `SubscriptionState.Status` ile birebir (test: `SubscriptionContractTests`); yeni bir durum sözleşmeye de girmeden olmaz.
- Webhook gecikmesi (5-60 sn) sunucuda çözülmez: satın almadan sonra telefon bu ucu kısa süre yeniden sorar (K-702). Alternatif — telefonun
  RevenueCat SDK'sından okuduğu `CustomerInfo`'yu göstermek — reddedildi: yetki istemciye güvenilmez (ADR-012); paywall "aktif" deyip
  koç 403 dönerse kullanıcı çelişki görür. K-704 (REST tazelemesi) gelince gecikme kısalır, uç değişmez.

## Ek 2 (2026-10-05, K-814) — olay kaydı süreli
#8'in "olay kaydı hesapla silinir" hükmü değişti: işlenmiş olay kaydı (`subscription.webhook_event`) olay zamanından **30 gün** sonra gece
silinir (`keel.subscription.event-retention`, `WebhookEventCleanup`; GDPR Md. 5(1)(e)). Tekrar koruması bu süre boyunca kesindir. Sonrasında
gelen bir teslim (RevenueCat'in kendi denemeleri ~2,5 saatte biter; panelin elle "Retry"ı süresiz) yeniden tartılır: #7 gereği **kesinlikle daha eski**
olay durumu geri götürmez. Açık kalan tek durum: aynı milisaniyede iki olay, ikisinden eskisinin bir ay sonra elle yeniden gönderilmesi — o zaman
durum o olayınkine döner; olasılık çok düşük, kabul edildi (K-814 incelemesi).

## Ek 3 (2026-10-15, K-704) — REST tazelemesi, TRANSFER alıcısı, müşterinin silinmesi
**Doğrulanan (RevenueCat resmî doküman, 15 Eki okundu):** API **v1**, taban `https://api.revenuecat.com/v1`, başlık `Authorization: Bearer <gizli anahtar>`
(`https://www.revenuecat.com/docs/api-v1`). `GET /subscribers/{app_user_id}` (`.../api-v1/customers`): 200 müşteri bulundu, **201 müşteri yoktu, oluşturuldu**,
401; cevap `request_date_ms`, `subscriber.entitlements.<id>.{expires_date, grace_period_expires_date, product_identifier}`,
`subscriber.subscriptions.<ürün>.{period_type, is_sandbox, unsubscribe_detected_at, billing_issues_detected_at, refunded_at}` (`.../api-v1/customer-info-model`);
tarihler ISO 8601 `Z`. `DELETE /subscribers/{app_user_id}`: "Deletion is queued asynchronously", 200/401/404, yeniden denenebilir akışta **200 ve 404 ikisi de başarı**.
Webhook sayfası her webhook'tan sonra `GET /subscribers` öneriyor (`.../integrations/webhooks`). TRANSFER'de `transferred_from` ve `transferred_to` her zaman gelir,
`environment` "bazen" (`.../webhooks/event-types-and-fields`). **`[doğrulanmadı]`:** (a) bugün üretilen bir gizli anahtarın v1 uç noktalarını yetkilendirdiği (v2 sayfası
"v1 anahtarları v2'de çalışmaz" diyor; ters yön yazmıyor) — Levent anahtarı girince canlıda bir `curl` ile sınanır, 401 = anahtar türü; (b) `expires_date: null`'ın anlamı
(ömür boyu varsayımı çıkarım) — null ise bir şey yazılmaz; (c) REST'in bir webhook'tan hemen sonra o olayı yansıttığı (doküman "tutarlı biçim" der, gecikme garantisi yazmaz);
(d) `period_type` REST'te küçük harf (örnekte "normal"), webhook'ta büyük — karşılaştırma harf duyarsız; (e) silmenin takma adlı (`$RCAnonymousID`) kayıtları da götürdüğü.

**Kararlar**
1. **Çağrı `privacy` içinde** (`RevenueCatRest`, `EgressGate.call`, hedef `REVENUECAT_ACCOUNT`; tek çıkış kapısı, EgressRuleTests). `subscription` `privacy`'ye bağlanamaz
   (allowedDependencies değişmez); köprü `shared.RevenueCatSubscribers` (tek yöntem `fetch`). Dışarı yalnız hesabın opak UUID'si + gizli anahtar gider (V1/V2: sağlık verisi yok);
   privacy.md'nin RevenueCat'in aldığı veri listesi değişmez. Yeni bağımlılık yok (JDK `HttpClient`, Apple kalıbı).
2. **Anahtar** `KEEL_REVENUECAT_API_KEY` → `keel.privacy.revenuecat.api-key` (V5; `deploy/env.example`, `init-env.sh`). **Yoksa ya da boşsa** tazeleme ve silme kapalı;
   başlangıçta **tek** uyarı (`SafeLog.degraded`), çağrı başına yok. Üretimde zorunlu **değil** (Apple'ın tersine): Levent anahtarı girene kadar beta webhook'la çalışır.
   Anahtar `toString`'de, istisnada, logda yok (SafeLog yalnız tür ve yer yazar; test).
3. **Zaman aşımı** `keel.privacy.egress-timeout` (10 sn, bağlanma + cevap), yönlendirme izlenmez (anahtar başka yere gitmez).
4. **Tazeleme:** webhook işlendi ve **işlem kesinleşti**, sonra (işlem dışı, kilit tutmadan) `GET`; hesabın olayı yetkiyle ilgiliyse (`SubscriptionState.of` dolu, hesap bizim)
   ya da TRANSFER'in `transferred_to`'su bizim hesapsa. Tazeleme yalnız **ekler**: her hata (anahtar yok, RevenueCat cevap vermiyor, cevap kullanılamaz) webhook sonucunu
   bozmaz, cevap yine 200 (RevenueCat uygulanmış olayı boşuna yeniden gönderirdi); hata `SafeLog.backgroundFailure` ile (tür + yer, mesaj yok).
5. **Sıra kuralı:** REST cevabının anı = `request_date_ms` (RevenueCat'in saati; webhook'un `event_timestamp_ms`'i ile aynı saat — bizim saatimiz değil). Cevap bir durum olarak
   (`lastEventAt = request_date_ms`) **aynı `SubscriptionState.next`'ten** geçer (#7): durumdan kesinlikle eskiyse yok sayılır, eşit/yeniyse uygulanır. Yani REST durumu
   geri götürmez; iki cevap ve olay hangi sırada gelirse gelsin en yeni an kazanır. Cevap anı yoksa/bozuksa hata (sıra bilinmeyen tahmin edilmez). Olay kimliği yazılmaz (cevap olay değil;
   iki kez sormak bir kez sormaktır).
6. **Cevap → durum:** yapılandırılmış yetki yoksa, `expires_date` null ise, ya da yetkinin ürünü `subscriptions`'ta yoksa/`is_sandbox` yoksa/ortamı `environments`'ta değilse
   **hiçbir şey değişmez** (yetki yokluğu erişimi **almaz**: yanlış yetki adı herkesin erişimini bitirirdi; webhook'taki "ortam yoksa izinsiz" ile aynı). Varsa `accessUntil` =
   `expires_date` (ya da daha geç `grace_period_expires_date`); durum: `refunded_at` → REFUNDED (erişim o ana kadar), bitiş ≤ cevap anı → EXPIRED, `billing_issues_detected_at` → BILLING_ISSUE,
   `unsubscribe_detected_at` → CANCELLED, `period_type` trial → TRIAL, yoksa ACTIVE. Erişim yine yalnız `accessUntil`'den.
7. **TRANSFER alıcısı** (#6'nın eksik yarısı): `transferred_to`'daki bizim hesaplar için REST sorulur; olayda ortam yoksa da (REST kendi `is_sandbox`'ını tartar). Bırakılan hesap yine olaydan EXPIRED.
8. **Hesap silinince müşteri de silinir** (M8 envanter açığı 4, V6): `DELETE /subscribers/{id}` — `privacy`'de `AccountDeletionRequested` dinleyicisi (`RevenueCatCustomerDeletion`).
   **Hata politikası: yeniden dene, engelleme.** Her modülün silmesi kendi dinleyicisi/yayını olduğu için RevenueCat'in çökmesi yalnız bu dinleyiciyi düşürür; bizim verimiz yine silinir.
   Düşen yayın olay kaydında kalır ve `DeletionRetry` (5 dk) başarana dek yeniden gönderir; silme tekrarı zararsız (200 ve 404 = silindi); `DeletionSweep` ikinci geçişi (10 dk) bir webhook
   tazelemesinin silmeden sonra yeniden yarattığı (GET 201 yaratır) müşteriyi de siler. 401 (anahtar reddedildi) kurulum hatası sayılır: INTERNAL, ERROR log, yine yeniden denenir.
   Alternatif — hata yut, logla geç: RevenueCat'te kişisel kayıt sessizce kalırdı; reddedildi. Alternatif — silmeyi RevenueCat'e bağlı kılmak: reddedildi (V6, verimizin silinmesi başkasına bağlı olamaz).
9. **Kalan risk:** (c) maddesi. REST bir webhook'tan sonra henüz yansıtmamışsa ve cevabın anı olay anından yeniyse, cevap erişimi kısaltabilir; bir sonraki olay/cevap düzeltir. Beta'da
   izlenir; sorun görülürse "cevap erişimi yalnız `request_date_ms` ile durumun anı arası X saniyeden uzaksa kısaltır" korkuluğu eklenir.

**Doğrulama:** `RevenueCatRestTests` (sahte HTTP: yol, Bearer, 200/201/404/401/429/5xx, zaman aşımı, yönlendirme, anahtar yok = istek yok + tek uyarı, anahtar logda yok),
`RevenueCatSubscriberTests` (cevap → durum, sıra), `RevenueCatRefreshTests` (DB: webhook sonrası tazeleme, eski cevap geri götürmez, TRANSFER alıcısı, hata/anahtar yok = webhook sonucu + 200,
silinmiş hesaba yazılmaz), `RevenueCatCustomerDeletionTests` (DB: müşteri silinir; RevenueCat çökükken kendi verimiz silinir, yayın kalır, yeniden denemeyle silinir), `SafeLogTests`, `tools/test_deploy.py`.
