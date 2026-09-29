# K-106 · Haftalık omurga — tasarım önerisi (Levent'le akşam)

> Durum: **KABUL (ADR-020: L-5 iki yön, L-6 uyum = tutarlılık, L-9 kalori sabit + FIX_ADHERENCE, L-10 türetilmiş pay)**, kod yok. Kaynaklar `plan/m1-kural-haritasi.md` › K-106. Güray'ın ağacı (03 §2.4) net; açık olan
> girdilerin tanımı ve iki eşik. Aşağıdaki "Öneri"ler benim teknik tercihim; **L-** işaretliler senin kararın.

## Ağaç (Güray 2024-08-19, 03 §2.4) → kod
```
Kilo hedef yönde mi?
├─ HAYIR → [uyum <%50 → FIX_ADHERENCE (K-60)] → [antrenman düşüyor → FIX_TRAINING, kalori yok (K-98)]
│          → [1 hafta sabit + bel sabit + uyum yüksek → NO_DECISION_YET "bir hafta daha" (K-64)]
│          → [≥2 hafta hedef yönde değil + uyum ≥%70 → ADJUST_CALORIES(yön: cut↓ bulk↑), miktar K-107]
└─ EVET → görüntü daha iyi/aynı → CONTINUE
          görüntü kötü → antrenman kötü → FIX_TRAINING
                         antrenman iyi → toparlanma kötü → FIX_RECOVERY
                                         toparlanma iyi → "genetik limit" → ADJUST_CALORIES(geri çek: bulk↓ cut↑)
```

## Girdiler (Snapshot'a eklenecek `CheckIn`)
| Girdi | Tip | Üreticisi (sonraki görev) | Öneri |
|---|---|---|---|
| Kilo yönü | kilodan **hesaplanır** | K-103 trend | aşağıda "yön" |
| Görüntü | BETTER / SAME / WORSE / UNKNOWN | K-601 foto + bel (K-206) | SAME = kötü değil → CONTINUE |
| Antrenman | IMPROVING / STABLE / DECLINING / UNKNOWN | K-210 set kaydı / K-109 | DECLINING = yük geriliyor (G2:883) |
| Toparlanma | GOOD / POOR / UNKNOWN | K-404 uyku + check-in sorusu (K-87 işaretleri) | |
| Uyum | 0–1 oran, isteğe bağlı | **L-6**: K-111 oranı mı, Güray'ın "planın %70'i" mi | |
| Bel | FLAT / DOWN / UP / UNKNOWN | K-206 | K-64 için |
Ağaçta bir dala gelip o dalın girdisi UNKNOWN ise: NO_DECISION_YET "check_in_needed" (U3: uydurma yok).

## Yön ("hedef yönde mi?") — öneri
Pencerenin ilk haftası ile son haftasının trend ortalaması karşılaştırılır (erkekte 14, kadında 21 gün ara). Fark,
gürültü payından (n=4 tartı/hafta → ~0,58 kg, `min_weighins_per_week` türetmesiyle aynı hesap) büyük ve hedef yöndeyse
"EVET". Böylece ~0,3 kg/hafta ve üstü kayıp "hareket", daha yavaşı "sabit" okunur. **L-10**: bu türetilmiş eşiği onaylıyor
musun, yoksa Güray'dan bir "sabit" tanımı mı arayalım (araştırmada yok: "plato tanımı bu videolarda YOK", G2:880 civarı).

## Açık kararlar
- **L-5** WC-07 "genetik limit → kaloriyi geri çek" spesifikasyonda yalnız bulk'a yazılmış; ağaç iki yönde de söylüyor.
  Öneri: ağaçtaki gibi iki yön (bulk: fazlayı azalt, cut: açığı azalt).
- **L-9** Uyum %50–70 arası: Güray <%50 "uyumu çöz", ≥%70 "kaloriye bak" diyor; arası tanımsız. Öneri: kalori
  değişmez, FIX_ADHERENCE (daha yumuşak metinle) — kalori ancak ≥%70'te dokunulur.
- **L-6** uyum tanımı (yukarıda).
- Spesifikasyon düzeltmesi (teknik, bilgi için): WC-04'ün kaynağı ağaçtaki boşluk + H3 B3 (min 2 hafta bekleme).
