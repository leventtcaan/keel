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
3. (sıradakiler görev bitince eklenir)

## Durum
| Görev | Aktarım dosyası | Kod | Anlatıldı | Levent kendi cümlesiyle | Apple Notes |
|---|---|---|---|---|---|
| K-202 PostgreSQL + Flyway (+ ADR-023) | `K-202.md` | ✅ | — | — | — |
