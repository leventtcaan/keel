# M2 aktarım planı — Backend temel servisler

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Tek koşan örnek (bütün M2 boyunca)
Pazartesi sabahı bir kullanıcı: telefon bir tartıyı gönderir (`POST /v1/weigh-ins`), check-in'i cevaplar
(`POST /v1/check-ins/current/answers`), sunucu Snapshot'ı modüllerin API'lerinden kurar, M1'in motoru kararı verir,
karar saklanır ve `Decision` olarak döner. M2 bu yolun her durağını kurar: veritabanı → sözleşme → kimlik → rıza →
profil → ölçüm/beslenme/antrenman → karar.

## Aktarım sırası (bağımlılığa göre)
1. K-202 PostgreSQL + Flyway — verinin durduğu yer
2. K-201 sözleşme — telefonla sunucunun ortak dili
3. K-207 besin verisi spike'ı — veri nereden, hangi lisansla
4. K-215 ortak altyapı — hata ve log (V3 yapısal)
5. K-203 kimlik — kim olduğunu kanıtlamak
6. K-204 rıza — izni kanıtlamak ve geri almak
7. K-205 profil — modülün dışa açtığı yüz
8. K-206 ölçüm — zaman serisi, idempotency, yerel gün
9. K-210 antrenman kaydı — katalog veri, takas, sahiplik
10. K-214 gizlilik — silme, dışa aktarma, tek dışarı kapısı
11. K-218 set tipi ve yük modeli — hangi set sayılır, e1RM
12. K-219 hareket kataloğu — veri tasarımı, kapalı sözlük, klip incelemesi
13. K-211 program — şablon veri, set bütçesi, programı değiştirmek
11. (sıradakiler görev bitince eklenir)

## Durum
| Görev | Aktarım dosyası | Kod | Anlatıldı | Levent kendi cümlesiyle | Apple Notes |
|---|---|---|---|---|---|
| K-202 PostgreSQL + Flyway (+ ADR-023) | `K-202.md` | ✅ | — | — | — |
| K-201 sözleşme v1 (+ ADR-024) | `K-201.md` | ✅ | — | — | — |
| K-207 besin spike (ADR-008) | `K-207.md` | ✅ | — | — | — |
| K-215 ortak altyapı | `K-215.md` | ✅ | — | — | — |
| K-203 kimlik (+ ADR-025) | `K-203.md` | ✅ | — | — | — |
| K-204 rıza | `K-204.md` | ✅ | — | — | — |
| K-205 profil | `K-205.md` | ✅ | — | — | — |
| K-206 ölçüm (+ ADR-026) | `K-206.md` | ✅ | — | — | — |
| K-210 antrenman kaydı | `K-210.md` | ✅ | — | — | — |
| K-214 gizlilik | `K-214.md` | ✅ | — | — | — |
| K-218 set tipi, yük modeli, e1RM | `K-218.md` | ✅ | — | — | — |
| K-219 hareket kataloğu (40 hareket) | `K-219.md` | ✅ | — | — | — |
| K-211 program üretimi ve içe alma (V8) | `K-211.md` | ✅ | — | — | — |
