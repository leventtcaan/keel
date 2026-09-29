# Kararlar (ADR dizini)

> Şablon ve kurallar: skill `karar-yaz`. KABUL yetkisi (ADR-019): teknik ADR agent'ta; ürün, para, sağlık/regülasyon,
> veri paylaşımı ve görsel/marka ADR'leri Levent'te.

| No | Karar | Durum |
|---|---|---|
| [ADR-001](kararlar/ADR-001-yigin.md) | Yığın: Spring Boot 4.1 + Modulith 2.1 + Expo SDK 57 | KABUL |
| [ADR-002](kararlar/ADR-002-depo-ve-surec.md) | Depo yapısı ve süreç (tek kaynak backlog, yalnız Claude Code, imza yok) | KABUL |
| [ADR-003](kararlar/ADR-003-karar-motoru.md) | Karar motoru: saf, deterministik, kurallar veri olarak | KABUL |
| [ADR-004](kararlar/ADR-004-hesaplama-katmanlari-llm.md) | Dört hesaplama katmanı, LLM portu, sunucu kotası, tek egress | KABUL |
| [ADR-005](kararlar/ADR-005-veri-modeli.md) | PostgreSQL + Flyway, zaman serisi, karar denetim kaydı | KABUL |
| [ADR-006](kararlar/ADR-006-mobil-mimari.md) | Mobil: expo-router, offline-first, üretilen tipler, token'lar | KABUL |
| [ADR-007](kararlar/ADR-007-gizlilik-ve-riza.md) | Fotoğraf cihazda, üç ayrı rıza, sağlık verisi logda yok | KABUL |
| [ADR-008](kararlar/ADR-008-besin-verisi.md) | USDA FDC + Open Food Facts, aralık, sapma kalibrasyonu | KABUL |
| [ADR-009](kararlar/ADR-009-test-stratejisi.md) | TDD, `pending` spesifikasyon testleri, mimari testler, CI | KABUL |
| [ADR-010](kararlar/ADR-010-parametre-ve-metin.md) | Kaynaklı parametre dosyaları, metin anahtarları | KABUL |
| [ADR-011](kararlar/ADR-011-kimlik-dogrulama.md) | Sign in with Apple | KABUL |
| [ADR-012](kararlar/ADR-012-abonelik-ve-kota.md) | RevenueCat, sunucu tarafı yetki ve kota | KABUL |
| [ADR-013](kararlar/ADR-013-barindirma.md) | Mevcut VPS + Docker Compose | KABUL |
| [ADR-014](kararlar/ADR-014-gorsel-dil.md) | Görsel dil C — cesur, enerjik (turuncu) | YERİNİ ALDI → ADR-016 |
| [ADR-015](kararlar/ADR-015-modul-haritasi.md) | Backend modül haritası (12 modül) | KABUL |
| [ADR-016](kararlar/ADR-016-gorsel-dil-rubin.md) | Görsel dil: C iskeleti + RUBİN paleti + koyu mod + sistem katmanı | KABUL |
| [ADR-017](kararlar/ADR-017-hareket-gosterimi.md) | Hareket gösterimi: kendi çekimler, ilk tekrar / son tekrar | KABUL |
| [ADR-018](kararlar/ADR-018-health-yazma-ve-ice-aktarma.md) | Apple Health'e antrenman yazma, geçmiş içe aktarma | KABUL |
| [ADR-019](kararlar/ADR-019-yetki-devri-ve-otomasyon.md) | Yetki devri: agent birleştirir (CI kapısı), teknik izin ve teknik ADR agent'ta | KABUL |
| [ADR-020](kararlar/ADR-020-m1-kural-kararlari.md) | M1 kural kararları (L-1…L-13, eşik onayları) + M2/M3 ön kararları | KABUL |
| [ADR-021](kararlar/ADR-021-omurga-sabit-olcumu.md) | Haftalık omurga: "sabit" ve "bekle" ölçümü (K-106) | KABUL (madde 4 geçici) |
