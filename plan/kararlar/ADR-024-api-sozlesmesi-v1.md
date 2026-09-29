# ADR-024 · API sözleşmesi v1: kurallar ve araçlar
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-29 · **Karar veren:** agent

## Bağlam
K-201: telefonla sunucunun bütün uç noktaları tek dosyada (`contracts/openapi.yaml`, K3, ADR-006). Kabul kriterleri:
dokuz kaynak (auth, profile, consent, measurements, meals, workouts, check-in, decisions, coach), `Decision` motorunkiyle
birebir, kalori alanları aralık (U5), yağ yüzdesi yok (U4). Alan adları backlog kartlarından, prototip v2 ekranlarından
(`prototip/keel-prototype.html`) ve motor tiplerinden (`backend/…/engine`) geldi.

## Karar sürücüleri
- Sözleşme kuralları bir testle korunmalı; yoksa ilk değişiklikte kayar.
- Offline-first telefon (ADR-006) aynı kaydı iki kez gönderebilir.
- Araç zinciri gizlilik ilkesine uymalı (kurulumda telemetri yok) ve uygulamanın TypeScript 6'sını bozmamalı.

## Karar
1. **Yol ve sürüm:** her şey `/v1` altında; yalnız `/health` ve `/v1/auth/*` oturumsuz, geri kalan `session` (Bearer JWT).
2. **Idempotent oluşturma:** telefonun oluşturduğu her kayıt `clientId` (UUID) taşır; aynı `clientId` ikinci kez gelirse
   kayıt bir kez saklanır, cevap **200** ve saklı kayıt (ilkinde 201).
3. **Zaman:** gün `date` (kullanıcının yerel takvim günü), an `date-time` (ofsetli); saat dilimi profilde (IANA).
4. **Liste:** geriye doğru sayfa, `limit` + `before` imleci.
5. **Hata:** tek `Error` gövdesi (`code`, `message`), her işlemde `default` cevabı; mesajda sağlık verisi yok (V3).
6. **Karar:** `Decision` motorun `Decision`'ının alanlarını birebir taşır (+ `id`, `madeOn`, `applied`); `Action` bir
   etiketli birleşim (`oneOf` + `discriminator: type`), her türün alanları motordaki record'un bileşenleriyle aynı adda.
7. **Sayılar:** tahmin olan her kalori `KcalRange {low, high}`, gram tahmini `GramRange`; kullanıcının izlediği plan
   sayıları (`targetKcal`, adım olarak `kcalPerDay`) tek sayı (ADR-020 L-13). Apple Health'in aktif enerjisi de bir
   cihaz tahmini → aralık.
8. **Fotoğraf:** sunucuya yalnız telefondaki karşılaştırmanın sonucu gider (`look`), görüntü ya da vücut ölçümü değil (V1).
9. **Araçlar:** `contracts/package.json` — `openapi-typescript` 7.13.0 + TypeScript 5.9.3 (openapi-typescript TS 6'yı
   desteklemiyor; uygulamanın TS'sine dokunmamak için ayrı proje). `npm run generate` → `apps/mobile/src/api/schema.ts`;
   `npm run check` CI'da (Mobile işi): belge çözülemezse ya da tipler eskiyse kırmızı. Proje kuralları
   `backend/…/architecture/ContractTests` ile (motorla birebirlik, aralık, U4, oturum, operationId, kaynaklar).

## Neden
- Kurallar testte: motor bir `Action` eklerse ya da alan adını değiştirirse sözleşme testi kırmızı olur (U3 birebirlik).
- `clientId` idempotency, zayıf bağlantıda tekrar gönderimi güvenli kılar; sunucu tarafında `(account_id, client_id)`
  benzersiz dizini ile uygulanır.
- Etiketli birleşim TypeScript'te `switch (action.type)` ile tam kapsama verir; Java'daki `sealed` ile aynı güvence.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `@stoplight/spectral-cli` ile lint | Bağımlılığı `@scarf/scarf` kurulumda analitik gönderiyor (V2 ruhu); openapi-typescript'in çözücüsü + ContractTests yeterli |
| `@redocly/cli` | Telemetri varsayılan açık; ek araç |
| openapi-typescript'i uygulamaya kurmak (`overrides` ile TS 6) | Desteklenmeyen eşleşmeyi uygulamanın bağımlılık ağacına sokar |
| Karar eylemini düz `type` + isteğe bağlı alanlar | Hangi alanın hangi türde dolu olduğu tipte görünmez |
| Her kalori alanı aralık (hedef dahil) | Kullanıcıya tek sayı ilkesiyle çelişir (L-13); hedef bir tahmin değil, plan |

## Sonuçlar
Olumlu: mobil tipler üretilir ve CI'da güncelliği kontrol edilir; sözleşme motorla birlikte değişmek zorunda.
Olumsuz: `openapi.yaml` büyük (≈1.850 satır); `ContractTests` backend'de, sözleşme dosyasını göreli yolla okur.
Açık: `FoodEstimateRequest` için fotoğraf yolu yok — üçüncü taraf AI (M5) eklendiğinde ayrı ADR ve rıza kapısıyla.
Durum modu (seyahat, hastalık) ve abonelik uç noktaları kendi görevlerinde eklenecek.

## Geri dönmenin maliyeti
Düşük-orta: v1 henüz yayınlanmadı; yayından sonra kırıcı değişiklik `/v2` ister.

## Etkilenen
`contracts/`, `apps/mobile/src/api/schema.ts`, `.github/workflows/ci.yml`, K-203…K-219 (her uç nokta), K-303.
