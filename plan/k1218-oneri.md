# K-1218 · Antrenman durumu set kaydından (TASLAK, Levent onayı bekliyor)

> 25 Kas 2026. Kod yazılmadı. Satır numaraları `main`'den; etkiler **elle türetildi, çalıştırılmadı** `[doğrulanmadı]`.

## 1. Bugün
- Haftalık karardaki `CheckIn.training` (IMPROVING/STABLE/DECLINING/NOT_TRAINED) yalnız kullanıcı cevabı: `DecisionService.java:243`. "Veri ne diyor" kısmı `Training.UNKNOWN` ile kurulur: `:313` (denetimdeki `:291` kaymış); `whatIf` de aynı: `:1025`. Recovery de öyle.
- Set kaydı başka yoldan okunuyor ama **ayrı kanala**: `TrainingStatusReader.status` → `TrainingStatuses` (en çok durgun bileşik hareketin `stalledSessions`, `loadsBelowLastWeek`, `weeksPlanMissed`) → yalnız `DeloadLadder` (`DeloadLadder.java:52`). e1RM (`E1rm.java`) sadece hedef/ilerleme ekranında; durum hesabı en yüksek yük + tekrar kullanır (`TrainingStatuses.java:46,161`), RIR ve `restSeconds` okunmaz.
- Sonuç: spine'daki `training` dalları (`WeeklySpine.java:89-98,181-190`) cevap yoksa `check_in_needed_training` ile soru sorar (GS-22), cevap "declining" ise kesimde kalori adımı durur (GS-05). Kayıt bunu değiştiremez.

## 2. Önerilen kural: `TrainingTrend` (engine, saf fonksiyon)
Girdi: programın bileşik hareketleri, çalışma setleri (uygulamada girilen, içe aktarılmayan; ısınma/drop yok).
1. **Seans e1RM'i** = o seansın en yüksek `E1rm.estimate` değeri (Epley, tekrar+RIR ≤ 10, RIR yoksa set sayılmaz).
2. **Hareket yönü:** son `trend_sessions_per_side`=2 seansın ortalaması ile ondan önceki 2 seansınki; son `trend_window_days`=28 günde en az 4 seans. Değişim ≥ +`e1rm_trend_noise_pct` → UP; ≤ −pct → DOWN; arası FLAT. Yetmeyen hareket sayılmaz.
3. **Toplu durum** (en az `trend_min_lifts`=2 hareket sayılabilirse; programda tek bileşik varsa 1): DOWN'lar sayılanların ≥ `trend_majority`=0,5'i ise **DECLINING**; UP ≥ yarı ve DOWN yoksa **IMPROVING**; aksi **STABLE**. Yetersizse **UNKNOWN** (U3: uydurma yok, sorulur).
4. **NOT_TRAINED:** check-in haftasında bildirilmemiş (durum ilan edilmemiş) hiç uygulama içi seans yok.
5. **Hariç tutulur:** ladder'ın hafif/mola haftaları ve ertesi hafta (`restedLastWeek`, G7 K-72), ilan edilen durum günleri (K-516), seans dışı kayıt.
6. **Recovery (yalnız POOR üretir):** aynı hareket, aynı yük ve tekrarda son 2 seansın ortalama RIR'ı öncekinden ≥ `rir_drift_poor`=1 düşmüşse **ve** e1RM UP değilse hareket "yorgun"; yorgunlar sayılanların ≥ yarısıysa `Recovery.POOR`. Veri GOOD demez (uyku/yemek kayıtta görünmez).

Parametreler (`training.yaml`): `e1rm_trend_noise_pct: 3,0` · `trend_sessions_per_side: 2` · `trend_window_days: 28` · `trend_min_lifts: 2` · `trend_majority: 0,5` · `rir_drift_poor: 1`.

## 3. Kaynak
| Parça | Kaynak | Etiket |
|---|---|---|
| Metrik: e1RM = eğilim göstergesi | H3 `#B15` (Epley; ≤10 tekrar; RIR gerekli) | [literatür] |
| "Zorlanma (RPE) belirgin yükselir" = yorgunluk işareti | G7 `#K-67` | [tecrübe] (**sayı yok**) |
| Eski kiloyu kaldıramamak ayrı ele alınır | G7 `#K-68` kademe 3 (zaten `loadsBelowLastWeek`) | [tecrübe] |
| Durgunluk (3 seans) | H3 `#B5` (zaten `plateau_sessions`) | [literatür] |
| Performans = kesimde ölçüt | G7 `#K-98`; K-30 "diyette güç düşüşü normal" gerilimi | [tecrübe] |
| Planı tutturma | G7 `#K-73` (zaten ladder) | [tecrübe] |
| **%3 gürültü payı** | H3 B15 + Helms 2016 (RIR tahmin SD ≈ 1 tekrar) → Epley'de 1 tekrar ≈ 1/(30+4) ≈ %3 | türetilmiş, **[kaynak yok]** doğrudan |
| 2+2 seans, 28 gün, çoğunluk 0,5, RIR düşüşü 1 | — | **[kaynak yok]** (ürün seçimi, notunda söylenir) |
| `restSeconds` (K-1214) | trend için kural **yok** | [kaynak yok]; kuralda kullanılmaz |

Güray ile çelişki yok. K-30 ile K-98 aynı kesimde ters çeker; mevcut spine zaten K-98'i seçmiş (DECLINING = kırmızı bayrak), bu iş eşiği değiştirmez.

## 4. Kullanıcı cevabıyla çelişince
- Kayıt yetersiz/UNKNOWN: cevap geçerli (kayıt yokluğu kanıt değil; antrenman başka yerde olabilir).
- İkisi aynı: değişmez.
- Çelişirse ve kayıt yeterliyse: **kayıt kazanır**, gerekçe metni ikisini de söyler ("kayıtta bileşik hareketlerin e1RM'i %X düştü/arttı"). Neden: U2 itirazı değil veriyi dinler; öznel cevap ek veri taşımaz; yanlış pozitif maliyeti bir haftalık kalori adımı, yanlış negatif çöken performansta kesmeye devam (K-98). Kullanıcı cevabı gerekçede kalır, karar değişmez.
- Kayıt yeterliyse antrenman sorusu **sorulmaz** (soru bütçesi azalır; mobil sözleşmeye etkisi: `needed` listesi kısalır, şema aynı).

## 5. Persona ve golden etkisi
| Persona | Bugün | Öneri |
|---|---|---|
| Gelişen kaldırıcı (e1RM +%4-6) | kesimde düz kiloda soru ya da "stable" cevabı | IMPROVING, soru yok, K-98 gereği kalori adımı serbest |
| 3 hafta durgun | ladder: artışı bırak (3 seans) | e1RM FLAT = STABLE; ladder aynı; DECLINING sayılmaz |
| Yorgun, RIR yükseliyor | cevap "stable" derse görünmez | RIR düşüşü + e1RM UP değil → `Recovery.POOR` → `fix_recovery` (yalnız Look=WORSE dalında erişilir, `WeeklySpine.java:104`) |

**K1 listesi:** harness kayıt vermezse (bugünkü 39 senaryo) veri = UNKNOWN, cevap geçerli → **mevcut beklentiler değişmez** (GS-05, GS-22 dahil). Yeni senaryolar: kayıtlı GS-22 (soru çıkar), GS-05 tersi (cevap declining, kayıt UP → adım), mola sonrası UNKNOWN. `GoldenScenarioTests`a `lifts:` alanı eklenir; `WhatIf` (`:1025`) ve `TrainingStatuses` testleri korunur.

## 6. Güvenlik
Sıra aynı: SafetyNet (U13) → mini cut → ilan edilen durum → ladder (`FullRestWeek`, `loads_regressed`) → spine. Yeni DECLINING yalnız spine'da çalışır; ladder zaten söylediyse önce o. Kesimde `loads_regressed` bilerek kapalı (K-30), kalır. Hiçbir yol kalori düşürmez ya da artırmaz; yalnız adımı **durdurur** ya da soru sorar. RIR düşüşü ladder'a girmez (K-67 deload erken tetikleyebilir; ayrı kart, ayrı onay).

## 7. Levent'e soru
Kayıt ile cevap çelişince ve kayıt yeterliyken ne olsun?
- **(a)** Kayıt kazanır, gerekçede ikisi de söylenir; kayıt yoksa cevap (önerilen)
- **(b)** İkisinden kötüsü kazanır (biri DECLINING derse FixTraining)
- **(c)** Cevap kazanır, kayıt yalnız cevap yoksa devreye girer
