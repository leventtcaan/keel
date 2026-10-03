# ADR-045 · M5 Part 3 sonu: Levent'in cevapları (sorular 73, 78-85) ve Part 4'ün ortamı
- **Durum:** KABUL (Levent, 3 Eki 2026 — AskUserQuestion, M5 Part 4 başı; hepsi önerilen seçenek)
- **Tarih:** 2026-10-03 · **Karar veren:** Levent (ürün/sağlık/veri/para); uygulama ayrıntısı agent (ADR-019)

## Bağlam
Part 2-3'ün incelemelerinden birikmiş dokuz soru (DURUM 73, 78-85) ve Part 4'ün iki ortam kapısı: disk (Docker sanal diski
~17 GB, boş ~5,9 GB) ve cihaz derlemesi (K-308 açık; K-510, K-515 cihaz ister).

## Karar sürücüleri
- Suçlama yok (U7): kullanıcının geçmişi sonradan verdiği bir kararla kötü görünmemeli.
- Az ve doğru: uydurma bir çip, uydurma bir hedef tekrar yerine eksik ama dürüst ekran.
- Veri dışarı + para Levent'te (ADR-041): ölçüm listesi onayı gerçek çağrıya izin değildir.

## Karar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 73 | Seyrek rafta sıçrama (K-430: 10 → 20 kg dambılda ~47 tekrar) | **Tavan + not:** gereken tekrar bir tavanı (aralığın üstü + N; parametre `urun`, kaynaksız) aşınca hedef tekrar orada durur ve "bu salonda bu hareketin sonraki yükü yok — rafı güncelle" notu çıkar | Yeni görev **K-534** (M6) |
| 78 | Haftanın gününe bağlı olmayan program günleri | **Programın gün sayısı** planlanan seans sayısıdır (bugünkü davranış; `weeksPlanMissed` ile aynı sayı) | Değişiklik yok (K-530) |
| 79 | Program değişince geçmiş haftalar | **Her hafta o hafta geçerli olan sayıyla** yargılanır; program değişikliği geçmişi geriye dönük düşürmez (U7). Program öncesi haftalar profilin sayısıyla | Yeni görev **K-535** (M6, tutarlılık geçmişi) |
| 80 | Disk | Levent Docker'ı temizler (prune / Purge). O zamana kadar DB testleri CI'da; simülatör ve native derleme yer açılınca | Ortam (DURUM) |
| 81 | Sağlayıcı (ADR-044) | **Ölçüm listesi, kazanma ölçütü ve rıza metni taslağı kabul**; ADR-044 KABUL. Gerçek çağrı ve harcama yine yok (ADR-041); gerçek ölçüm K-533 (yayına çıkarken). Rıza metni yayından önce hukuki bakıştan geçer (soru 57 ile) | ADR-044 durumu |
| 82 | "Sığar" (K-507) | Önerinin üst ucu kalanın **orta noktasını** aşmaz; kaçınılan besin **alt dizgiyle** elenir | Değişiklik yok |
| 83 | İlk 8 hafta risk mesajları (K-521) | `first_weeks.risk`, `first_weeks.no_training.risk` metinleri ve "7 gün açılmadı" eşiği **olduğu gibi kabul**; yayın öncesi metin turunda yeniden bakılabilir | Değişiklik yok |
| 84 | Uzun moladan dönüş (K-531) | Yük bir adım geri **ve** tekrar aralığın altından; yalnız ilk seans | Değişiklik yok |
| 85 | Koçun çipleri (K-509) | Günün çipleri (en çok 2) + "Log a meal in words" + "How does this work?"; boş günde 2 çip. Kabul kriteri "en çok 3 çip" olur | K-509 kabulü güncellendi |
| K-308 | Cihaz derlemesi | Bu part'ta yok: K-510 karşılaştırma + ADR taslağı, K-515 kod + sayısız görünüm testi; cihaz adımları DURUM'a | Part 4 kapsamı |

## Neden
- 79: Programı 3 günden 5 güne çıkaran kullanıcı, 3 günü tam yaptığı haftalarda %60 tutarlı görünürdü — verdiği iyi bir karar
  (daha çok antrenman) geçmişini cezalandırırdı. Bu U7'nin ("suçlama yok") doğrudan ihlali.
- 73: Hedef tekrarın sınırsız tırmanması (10 kg'da 47 tekrar) hem uygulanamaz hem de motorun "henüz karar yok" diyebilmesi (U3)
  ilkesine aykırı: motor ne yapacağını bilmediği yerde bunu söylemeli, sayı uydurmamalı.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| 79: geçmiş haftalar yeni sayıyla (bugünkü) | Basit ama U7'yi ihlal eder (yukarıda) |
| 73: böyle kalsın | Hedef tekrar sonsuza tırmanır; kullanıcı neden ilerleyemediğini görmez |
| 85: hep 3 çip | Boş günde uydurma çip (ör. karar yokken "Why this call?") |

## Sonuçlar
Olumlu: iki yeni görev açık kabul kriterleriyle M6'ya; ADR-044 kapandı. Olumsuz: 73'ün tavanı kaynaksız ürün parametresi (`urun`).

## Geri dönmenin maliyeti
Düşük — 78, 82-85 bugünkü davranış; 73 ve 79 henüz uygulanmadı.

## Etkilenen
`plan/backlog.yaml` (K-534, K-535, K-509 kabulü), ADR-044 (KABUL), DURUM (sorular, disk).

## Doğrulama
K-534: seyrek rafta hedef tekrar tavanda durur + not testi. K-535: program 3 → 5 gün değişince geçmiş haftaların tutarlılığı
değişmez testi.
