# ADR-015 · Backend modül haritası
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Spring Modulith her doğrudan alt paketi modül sayar ve `allowedDependencies` ile sınırları testle korur (ADR-001).
Karar motoru saf olmalı (ADR-003); dışarıya veri tek kapıdan çıkmalı (ADR-004, ADR-007).

## Karar
Paket kökü `app.keel` (geçici; ürün adı gelince değişebilir). Modüller:

| Modül | Sorumluluk | İzinli bağımlılıklar |
|---|---|---|
| `shared` | Ortak tipler (kimlikler, tarih aralığı, ölçü birimi) | — (paylaşılan modül) |
| `engine` | Saf karar motoru, kurallar, parametre yükleme | — |
| `identity` | Hesap, Sign in with Apple, oturum | — |
| `consent` | Rıza kayıtları (sağlık, Health, AI) | identity |
| `profile` | Hedef, cinsiyet, takvim, program tercihi, gıda tercihleri | identity |
| `measurement` | Kilo, bel, fotoğraftan türetilmiş değerler, trendler | profile, consent, engine (ADR-026) |
| `nutrition` | Öğün kayıtları, besin eşleme, günlük bütçe | profile, consent (ADR-026) |
| `training` | Program, seanslar, setler, egzersiz kataloğu | profile |
| `decision` | Haftalık check-in, Snapshot kurma, motoru çağırma, karar kaydı | engine, profile, measurement, nutrition, training, consent (ADR-026) |
| `subscription` | Yetki, kota sayaçları | identity |
| `privacy` | Tek egress kapısı, veri dışa aktarma, silme olayı | consent |
| `coach` | Dil katmanı: anlatım, serbest metin → kayıt, soru bütçesi | decision, nutrition, training, subscription, privacy |

- Hesap silme `privacy`'den **olay** olarak yayınlanır; modüller dinler (döngü oluşmaz).
- Liste `ModularityTests` ile sabitlenir; değişikliği sorulur (K5).

## Neden
`engine`'in bağımlılığı olmaması saflığı derleme/test düzeyinde garanti eder. `coach`'un `engine`'e değil `decision`'a
bağlı olması, LLM katmanının karar üretemeyeceğini yapısal olarak gösterir (U1).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Tek `tracking` modülü (kilo+öğün+antrenman) | Büyür, sahipliği bulanıklaşır, görevler tek modüle sığmaz |
| `engine`'i ayrı Gradle alt projesi | Daha güçlü izolasyon ama seviye sıfır için ek karmaşıklık; Modulith testi yeterli |

## Geri dönmenin maliyeti
Orta (paket taşıma).

## Etkilenen
`backend/src/main/java/app/keel/*`.

## Doğrulama
`ModularityTests` (modül listesi + `verify()`).
