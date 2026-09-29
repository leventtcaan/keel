# ADR-013 · Barındırma
- **Durum:** ÖNERİ
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Levent'in bir VPS'i var; cepten para yakılamaz. Sabit maliyet hedefi ~$15/ay (`arastirma/ham/K5-fiyat-kota-maliyet.md`).

## Karar
- **Mevcut VPS** üzerinde **Docker Compose**: backend + PostgreSQL + ters vekil (HTTPS).
- Günlük `pg_dump` yedeği VPS dışına (nesne depolama).
- Dağıtım başlangıçta elle (tek komut), sonra CI'dan.
- Sırlar ortam değişkeninde (V5).
- VPS: **Contabo, giriş segmenti, boş** (Levent, 29 Eyl). Kaynakları ve işletim sistemi K-901'de sunucuya bağlanınca doğrulanır.

## Neden
Sıfır ek maliyet; Docker becerisi portfolyoya girer; taşınabilir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| PaaS (Fly.io, Railway, Render) | Aylık maliyet; ücretsiz katmanlar değişken |
| Supabase | Backend Spring'de; ikinci bir sistem |

## Geri dönmenin maliyeti
Düşük (Compose her yere taşınır).

## Etkilenen
`infra/` (M9'da açılır).

## Doğrulama
Yedekten geri yükleme provası.
