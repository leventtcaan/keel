# ADR-010 · Parametreler ve metinler koddan ayrı
- **Durum:** ÖNERİ
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Hardcode yasağı (K2) ve kaynak zorunluluğu (U14). Motor eşikleri cinsiyete göre değişir (`arastirma/ham/J1-cinsiyet.md`).
Arayüz yalnız İngilizce ama dil eklemek kolay kalmalı (U11).

## Karar
- **`data/parameters/<alan>.yaml`** — her parametre:
  `key` · `value` ya da `by_sex: {male, female}` · `unit` · `tag` (`tecrube|literatur`) · `source`
  (`arastirma/...#K-n`) · isteğe bağlı `note` (çelişki, türetme).
  Alanlar: `nutrition`, `training`, `measurement`, `windows`, `safety`, `quota`.
- Backend açılışta dosyaları yükler ve **şemaya karşı doğrular**; eksik alan, bilinmeyen anahtar, kaynaksız parametre →
  uygulama açılmaz.
- **`data/copy/en.json`** — kullanıcıya görünen her metin, düz anahtar (`decision.hold.title`). Motor ve backend yalnız
  anahtar + değişken döner; metni mobil çözer.
- Parametre değişikliği kod değişikliği değildir ama **kural değişikliğidir** → skill `kural-ekle`.

## Neden
Kaynaklı parametre dosyası, Güray kuralları ile kodun arasındaki izlenebilirliği mekanik yapar: her sayının "neden bu"
cevabı dosyada yazılıdır.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Java sabitleri | Kaynak kaybolur, değişiklik = derleme |
| Veritabanında parametre | Sürümleme ve diff kaybolur; kaynak alanı ihmal edilir |

## Geri dönmenin maliyeti
Düşük.

## Etkilenen
`data/`, `engine`, mobil `copy` katmanı.

## Doğrulama
`ParameterProvenanceTests`; metin anahtarı eksikliği testi (kullanılan her anahtar `en.json`'da var).
