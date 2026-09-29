# ADR-003 · Karar motoru: saf, deterministik, kurallar veri olarak
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Ürünün tezi karar vermek (`arastirma/02-bosluk-haritasi.md`). Kaynak: Güray karar omurgası (550 kural,
`arastirma/03-guray-karar-omurgasi.md`) + literatür boşluk doldurma (`arastirma/ham/H3-bosluk-literatur.md`).
Kararlar denetlenebilir, açıklanabilir ve test edilebilir olmalı; LLM karar veremez (U1).

## Karar
1. **`engine` modülü saf Java:** Spring, veritabanı, saat, ağ yok. Girdi bir **Snapshot** (zaman serileri + profil +
   parametreler + "bugün"), çıktı bir **Decision**. Aynı girdi → her zaman aynı çıktı.
2. **Decision tipi** (U3): `action` (enum + parametreler, ör. `ADJUST_CARBS(-60 g)`), `reasons` (hangi veri, hangi
   kural — kural kimliği ile), `confidence` (`LOW|MEDIUM|HIGH`), `nextReview` (tarih), `copyKey` (metin anahtarı).
   `NO_DECISION_YET` birinci sınıf bir eylemdir.
3. **Kural = kimlik + kaynak + saf fonksiyon.** Her kuralın `RuleId`'si ve kaynağı (`arastirma/...#K-n`, etiket
   `tecrube|literatur`) vardır; eşikler `data/parameters/*.yaml`'dan gelir (ADR-010).
4. **Karar sırası sabittir** (haftalık check-in omurgası, Güray 2024-08-19):
   güvenlik ağı (RED-S/LEA, U13) → veri yeterli mi → yön doğru mu → görüntü → antrenman → toparlanma → kalori.
   Her adım tek değişken değiştirir; ilk karar veren adım zinciri durdurur. Ayrıntı (antrenman sinyalleri, gözlem,
   mini cut, plato basamakları): ADR-022.
5. **Pencereler:** trend 7 gün (gösterim), karar penceresi erkek 2-3 hafta / kadın 28 gün, değerlendirme 3 ay (U8).
6. **Kararlar saklanır:** `decision` modülü her kararı girdisi (Snapshot) ve motor sürümüyle birlikte kaydeder →
   her geçmiş karar yeniden üretilebilir.

## Neden
- Deterministik + saf = tablo testleriyle tamamen doğrulanabilir; sycophancy'ye yapısal bağışıklık (U1, U2).
- Kurallar veri olunca eşik değişikliği kod değişikliği değildir; kaynak etiketi şeffaflığı (Ö-25, Ö-26) bedava verir.
- Saklanan Snapshot, "bu kararı neden verdin?" sorusuna aylar sonra bile kanıtla cevap verir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kural motoru kütüphanesi (Drools vb.) | Seviye sıfır için ağır; öğrenme maliyeti yüksek; saf fonksiyonlar yeterli |
| LLM'e kuralları prompt olarak vermek | U1 ihlali: tutarsız, ısrara yenilen, denetlenemez |
| Makine öğrenmesi modeli | Veri yok; açıklanamaz; regülasyon riski |
| Motoru mobilde çalıştırmak | Kurallar iki dilde (Java + TS) çoğalır; tek doğruluk kaynağı kaybolur |

## Geri dönmenin maliyeti
Orta. Motor saf olduğu için taşınabilir.

## Etkilenen
`backend/.../engine`, `decision`, `data/parameters/`, `data/copy/`.

## Doğrulama
`engine` modülünün `allowedDependencies` boş (ModularityTests); kural tablo testleri; her parametrenin `source` ve `tag`
alanı dolu (`ParameterProvenanceTests`).
