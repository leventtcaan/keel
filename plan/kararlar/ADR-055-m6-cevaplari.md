# ADR-055 · M6 soruları 87-104'ün cevapları
- **Durum:** KABUL
- **Tarih:** 2026-10-04 · **Karar veren:** Levent (öneren: agent; AskUserQuestion, M6 Part 4 Bitiş 2)

## Bağlam
M6'nın dört part'ında birikmiş ürün, veri ve sağlık soruları (`DURUM.md › Session sonunda Levent'e sorulacaklar`, 87-104). Hepsinde önerilen seçenek seçildi.

## Kararlar
| # | Konu | Karar | İş |
|---|---|---|---|
| 87 | Değişen sabitleyici testler (K-608, K-530, K-535) | Onay | — |
| 88 | Cut'ta kilo sabit, bel düşüyor (K-603) | (a) Sinyal kararın yanında kalır, kararı değiştirmez | — |
| 89 | `first_weeks.forgiven_week_used` metni | "A single off week doesn't end your run; this was one." | metin |
| 90 | `rep_ceiling_above_range` = 5 | Onay | — |
| 91 | "Kararı ne değiştirir" örnek haftaları | Onay | — |
| 92 | Program hafta içinde değişince en az | Onay | — |
| 93 | Defterde yalnız son kararın durumu | Onay | — |
| 94 | SCOFF sonucu başka hesapta | Şimdiki gibi: "clear" çıkışta unutulur, "unavailable" kalır | — |
| 95-96 | Projeksiyon: 28 gün, %60 uyum tanımı | Onay; bel şartı yok | — |
| 97 | İlerleme fotoğrafı yedeği (V1) | (c) K-308 sonrası yerel modülle `isExcludedFromBackup`; o zamana kadar belge klasörü + metin "never uploaded by this app" | metin şimdi; K-618 |
| 98 | Çıkışta fotoğraf silinmesi | Uyarı yeter | — |
| 99 | Fotoğraf penceresi hatırlatması | Kart yeter; bildirim yok | — |
| 100 | Eskiyen `copy-keys` testi ve dört kullanılmayan not | Silinir (K1 onayı) | test + metin |
| 101 | Jeton reddinde fotoğrafların silinmesi | (A) Jeton reddinde silinmez; silme elle çıkış, hesap silme ve gerçek yeni cihazda; sonraki girişte başka hesapsa silinir (hesap kimliği telefonda) | K-617 |
| 102 | İçe aktarılan setler güç grafiğinde | (a) Kalır: RIR uydurulmaz (U1); hareket geçmişinde görünür | — |
| 103 | Aynı dosyanın yeniden içe aktarılması | Metin söyler; geri alma yok | — |
| 104 | Paylaşım kartında güvenlik kararları | (a) Hiç girmez — ADR-054 §4 artık kalıcı | not |

## Etkilenen
ADR-054 (§4 geçici değil), ADR-053, K-614 (101), backlog K-617, K-618.
