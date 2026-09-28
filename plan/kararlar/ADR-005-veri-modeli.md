# ADR-005 · Veri modeli ve kalıcılık
- **Durum:** ÖNERİ
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Güray kurallarının yaklaşık yarısı geçmiş değer karşılaştırması ister (`arastirma/03-guray-karar-omurgasi.md` §5).
Kararlar yeniden üretilebilir olmalı (ADR-003). Fotoğraf sunucuya gitmez (V1).

## Karar
- **PostgreSQL** + **Flyway** migration'ları. Her modül kendi tablolarının sahibidir; başka modülün tablosuna SQL ile
  erişilmez (modülün API'si üzerinden). Sürümler ilk veritabanı görevinde doğrulanır (K6).
- **Zaman serisi olarak tutulanlar:** kilo girdileri, bel ölçümleri, öğün kayıtları (aralık: `kcal_low`, `kcal_high`),
  antrenman setleri (ağırlık, tekrar, RIR), adım/uyku (HealthKit'ten), fotoğraf **meta verisi ve türetilmiş değerler**
  (fotoğrafın kendisi değil).
- **Kararlar:** her Decision, girdisi olan Snapshot (JSON) ve motor/parametre sürümüyle saklanır (denetim kaydı).
- **Mobil yerel depo:** offline-first (ADR-006); sunucu doğruluk kaynağıdır, çakışmada sunucu kazanır, kayıtlar
  istemci tarafında üretilen kimlikle idempotent gönderilir.
- **Silme:** hesap silme olayı (`AccountDeletionRequested`) her modülü tetikler; her modül kendi verisini siler (V6).
- Şema değişikliği her zaman sorulur (K5).

## Neden
İlişkisel model + zaman serisi sorguları için PostgreSQL yeterli ve standart; Flyway şema geçmişini koda bağlar.
Snapshot saklamak açıklanabilirliği ve hata ayıklamayı kanıta dönüştürür.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Zaman serisi veritabanı (TimescaleDB vb.) | Kullanıcı başına günde birkaç satır; gereksiz karmaşıklık |
| Firebase/Firestore | Karar motorunun ilişkisel sorguları ve Spring hattıyla uyumsuz |
| Kararları saklamamak | "Neden?" sorusuna geçmişe dönük cevap verilemez |

## Geri dönmenin maliyeti
Orta.

## Etkilenen
Tüm veri tutan modüller, `privacy`.

## Doğrulama
Flyway migration testleri; silme olayı sonrası her modülde kullanıcı verisi kalmadığını gösteren entegrasyon testi.
