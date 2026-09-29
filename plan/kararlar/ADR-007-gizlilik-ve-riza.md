# ADR-007 · Fotoğraf, gizlilik ve rıza
- **Durum:** ÖNERİ · kısmen değişti → ADR-018 (Apple Health'e yazma, active energy okuma)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Amazon Halo'nun kapanışında bulut tabanlı yarı çıplak fotoğraf modeli rol oynadı (`arastirma/ham/C-ai-koc.md`).
Vücut fotoğrafı GDPR'da biyometrik değil ama sağlık verisi (Md. 9) (`arastirma/ham/H1-olcum.md`). Apple 5.1.2(i)
üçüncü taraf AI'a veri öncesi sağlayıcıyı adıyla anan onay istiyor. EU AI Act Md. 50, 2 Ağustos 2026'da yürürlükte.

## Karar
1. **İlerleme fotoğrafları cihazda kalır.** Karşılaştırma ve türetilmiş değerler cihazda hesaplanır; sunucuya yalnız
   sayı gider.
2. **Öğün fotoğrafı** analiz için dışarı çıkacaksa: istemcide ≤1024 px, EXIF/konum silinir, yalnız rıza verilmişse.
3. **Üç ayrı rıza**, her biri ayrı ekran ve ayrı kayıt (`consent` modülü): (a) sağlık verisi işleme (Md. 9),
   (b) Apple Health okuma, (c) üçüncü taraf AI — sağlayıcı adı + veri türü. Rıza geri alınabilir; geri alınınca ilgili
   özellik kapanır, uygulama çalışmaya devam eder.
4. **Sağlık verisi** logda, hata izinde, analitikte yok (V3). Log alanları beyaz listeyle.
5. **Sorulmayanlar** (V4): döngü, doğum kontrolü, teşhis.
6. Yasal metinler (gizlilik politikası, kullanım şartları, sağlık feragatnamesi) yayından önce ayrı görev (M8).

## Neden
Veri toplamamak en güçlü gizlilik önlemi; tek egress kapısı (ADR-004) denetimi basitleştirir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Fotoğrafları bulutta işlemek | Halo dersi; GDPR ve güven riski |
| Tek "her şeyi kabul et" rızası | GDPR Md. 9 ve Apple 5.1.2(i) ile uyumsuz |

## Geri dönmenin maliyeti
Yüksek (güven bir kez kırılır).

## Etkilenen
`consent`, `privacy`, `coach`, mobil kamera/fotoğraf katmanı.

## Doğrulama
Rıza yokken egress çağrısının reddedildiğini gösteren test; log çıktısında sağlık alanı olmadığını gösteren test.
