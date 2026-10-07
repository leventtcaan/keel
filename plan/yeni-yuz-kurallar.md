# Yeni yüz · motor kuralları ve parametreler (kod session'ında `kural-ekle` girdisi)

- **Tarih:** 2026-10-07 · **Dayanak:** ADR-071..078 · **Kaynak denetimi:** bu session'da her kaynak dosyada satırıyla doğrulandı (aşağıdaki yollar
  `arastirma/ham/guray/` altında, aksi yazılmadıkça).
- **Kural:** her kural kanıt + parametre + test (U14, skill `kural-ekle`). Eşik test kodunda sayı olarak yazılmaz; parametre dosyasından okunur.
  Kişi adı ürün yüzüne çıkmaz; arayüzde kaynak türü "Coaching rule" / "From research".
- **Etiketler:** `tecrube` (Güray) · `literatur` · `urun` (ürün kararı). YAG25 kaynaklı kurallar `[konuşmacı belirsiz]`: G2 başlık uyarısı 1'e göre
  yalnız solo kaynakla çelişmediği yerde kullanılır.

## R1 · `ProgramReview` (ADR-073) — yeni, engine
| key | değer | birim | tag | kaynak | not |
|---|---|---|---|---|---|
| `training_days_max` | 5 | gün/hafta | tecrube | G6-eski-arsiv.md#K-36 (satır 533), G7-whisper-arsiv.md#K-79 (254), G2-kilo-verme.md#K-36 (392) | "6-7 önerilmez"; üç kaynak aynı yönde |
| `weekly_sets_max` | 15 | set/kas/hafta | tecrube | G1-antrenman.md#K-11 (120) | "üst sınır seviyeye göre 12-15"; [ASR şüpheli "1015"] |
| `weekly_sets_trim_to` | 12 | set/kas/hafta | tecrube | G1#K-11 | bandın alt üst sınırı; kırpma hedefi |
| `weekly_sets_min` | 4 | set/kas/hafta | tecrube | G1#K-11 | **eşitlik işaretlenmez** (prototipteki "4 set aralığın altında" yanlıştı) |
| `arm_weekly_sets_min` | 6 | set/hafta | tecrube | G1#K-61 (623) | **mevcut** (training.yaml) |
| `frequency_per_muscle_per_week` | 2 | kez | tecrube | G1#K-22 (240) | **mevcut**; işaret: kas haftada 1 kez ve set ≥ `weekly_sets_min` |
| `rep_range_compound_*`, `rep_range_isolation_*` | 6-10, 8-12 | tekrar | tecrube | G1#K-21 (223) | **mevcut** |
| `review_max_suggestions` | 3 | adet | urun | ADR-073 | öncelik: gün > fazla set > eksik set > sıklık > tekrar |
- **Davranış tablosu:** her eşiğin altı / kendisi / üstü; 6 gün → öneri "5 güne indir"; göğüs 18 → "12'ye kırp"; hamstring 3 → "4'e tamamla";
  hamstring 4 → öneri yok; 4'ten fazla bulgu → en çok 3, öncelik sırasıyla.
- **Özellik testleri:** determinizm; bir öneri uygulanınca inceleme aynı bulguyu yeniden üretmez; öneri sayısı ≤ `review_max_suggestions`;
  öneri hiçbir zaman günü `training_days_min`'in altına indirmez.
- **Açık:** 6 günden 5'e indirmenin somut diff'i (hangi gün birleşir): üreteç kalıplarıyla (`data/programs/5-days.yaml`) yeniden yerleşim önerilir;
  diff bulunamazsa bulgu gösterilmez (ADR-073 #2).

## R2 · `CardioPrescription` (ADR-074) — yeni, engine, `data/parameters/cardio.yaml` (yeni dosya, `ParameterDomain`'e)
| key | değer | birim | tag | kaynak |
|---|---|---|---|---|
| `cardio_sessions_cut_min` | 3 | seans/hafta | tecrube | G2-kilo-verme.md#K-32 (354), KRD24 "3-5 gün" |
| `cardio_sessions_cut_max` | 5 | seans/hafta | tecrube | G2#K-32, KRD24 |
| `cardio_minutes_cut` | 30 | dk | tecrube | G2#K-31 (346) "30 dk ≈ 300 kcal ideal", G2#K-35 (383) "sonra ≤20-30 dk" |
| `cardio_sessions_build` | 2 | seans/hafta | tecrube | G2#K-32, KRD24 "bulk 2-3 × 20-30" |
| `cardio_minutes_build` | 20 | dk | tecrube | G2#K-32 |
| `cardio_after_lift_max_minutes` | 30 | dk | tecrube | G2#K-35 (bilgi satırı eşiği; engel değil) |
| `cardio_none_activity_levels` | [VERY_ACTIVE] | — | tecrube | G2#K-32 koşulu, G2#K-46 (474) |
| `cardio_hr_band` | 100-120 (~110) | bpm | tecrube | G2#K-33 (365); yalnız saat verisi varken bilgi |
- **Davranış:** yağ kaybı fazı → seans = clamp(antrenman günü, 3, 5); gün < 3 ise eksik seans off güne, düşük tempo (G2#K-36 "kardiyo
  konacaksa çok düşük tempo"); ağırlıktan önceye asla (K-35). Kazanım fazı → 2 × 20. `VERY_ACTIVE` → varsayılan yok. Kullanıcının değişikliği
  (`source: USER`) ezilmez.
- **Not:** YAG25'in "en az 1, tipik 2"si kullanılmaz (konuşmacı belirsiz; KRD24 ile sayıda çelişir). Ç-4 notu "varsayılan verilmiyor" diyordu;
  Levent varsayılan istedi (ADR-071 #7), KRD24 tek başına tutarlı.

## R3 · Seans içi öneri tablosu (ADR-075) — `NextTargets`/`SessionProgress` genişlemesi, engine + training
| key | değer | tag | kaynak | not |
|---|---|---|---|---|
| `load_increment_upper_kg` / `_lower_kg` | 2.5 / 5.0 | literatur | H3-bosluk-literatur.md#B4 | **mevcut**; `lighterLoadKg`/`heavierLoadKg` bir basamak, salona yuvarlanır (ADR-032) |
| `calibration_rir_min` | 2 | tecrube | G6-eski-arsiv.md#K-40 (573) "2'den fazla kalan set geçersiz"; G1#K-5 (62) hedef 0-1 | "2+" seçilince sonraki sete `heavierLoadKg` önerisi; yalnız hedef kilosu yokken |
| `target_rir_max` | 1 | tecrube | G1#K-5 | **mevcut** |
| `rir_choices` | [0, 1, 2] ("2+") | tecrube | G6#K-40 | workout.json'da 0/1/2/3+ → 0/1/2+ |
- **Çok ağır:** G1-antrenman.md karar #61 (889): "set içinde kilo yanlış seçildiyse seti başında bırak, kiloyu düşür" → `lighterLoadKg`.
- **Aralığın altı ("Next set lighter?") — KAYNAK YOK.** G1 #33 (855) ve #36 (858) form bozulması ve takip kaybıyla ilgili, tekrar alt sınırıyla
  değil. Kod session'ında `arastirma/ham/H3`, `H*`'de aranır; bulunamazsa öneri gösterilmez, analiz satırı "Below the range" der (ADR-075 #3).
- **Kalibrasyon sonucu:** seans bitince kalibre edilen kilo hedef olur (mevcut `NextTargets` girilen setlerden hesaplar).
- **Testler:** tablo (RIR 0/1/2+ × hedefli/hedefsiz hareket); özellik: öneri asla bir basamaktan fazla uzak değil, salona yuvarlanmış.

## R4 · `FirstWeekAdjustment` (ADR-077) — yeni, engine; `FirstWeeks` ve `CheckInQuestions` ile
| key | değer | tag | kaynak | not |
|---|---|---|---|---|
| `training_days_min` | 3 | tecrube | G6#K-36 (533) "3 taban", G7#K-79 (254) | motor önerisi hiçbir girdide altına inmez; kullanıcı seçimi serbest |
| `training_days_ideal_min` | 4 | tecrube | G6#K-36 "4-5 ideal" | "bir gün ekle" hedefi |
| `on_track_min_ratio` | 0.7 | tecrube | G2#K-60 (589), 03-guray-karar-omurgasi.md §2.9 (164) | **mevcut** (windows.yaml); K-60 [konuşmacı belirsiz], 03 §2.9 omurgada |
- **Tablo:** Y/P ≥ 0,7 → aynı plan · Y = P ve "I could do more" ve deneyim ≠ NEW ve gün < 4 → 4 gün (G6#K-36: yeni başlayana 3 yeter) ·
  Y/P < 0,7 → kaçan seansı başka güne taşı, sayı aynı.
- **U9:** `WEEK1_FEEL` sorusu yalnız cevabı kararı değiştirebilecekken sorulur (bugünkü `CheckInQuestions` ilkesi): Y = P, deneyim ≠ NEW, gün < 4.
  Diğer durumlarda sorulmaz; ekran his satırını göstermez.
- **U8:** kilo ve kalori yorumu yok; `DataSufficiency` aynen.
- **Testler:** tablo (eşik altı/kendisi/üstü), özellik: önerilen gün ≥ `training_days_min`; his cevabı yalnız ikinci satırı etkiler.

## R5 · Dönüş ekranı (ADR-077 #5) — mevcut `ReturnLoad` + yeni eşik
| key | değer | tag | kaynak |
|---|---|---|---|
| `return_step_back_after_weeks` | 3 | tecrube + literatur | G7#K-72 (180) "moladan dönüşte yavaş başla" + H9-donus-minimum-doz.md (22-24); **mevcut** |
| `return_prompt_days` | 7 | urun | ADR-077 (dönüş ekranı eşiği) |

## R6 · Ürün parametreleri (kural değil, `tag: urun`)
| key | değer | dosya | karar |
|---|---|---|---|
| `short_session_moves` | 3 | training.yaml | ADR-073 #5 |
| `unfinished_session_close_hours` | 24 | workout.json | ADR-075 #5 |
| `default_day_sets` | 2: Pzt/Per · 3: Pzt/Çar/Cum · 4: Pzt/Sal/Per/Cum · 5: Pzt/Sal/Çar/Cum/Cmt (prototip `DAYSETS`) | onboarding.json | ADR-072 #4; onboarding 2-5 kutu, mevcut `max_training_days` 6 (Edit'te) |
| `trial_reminder_days_before` | 2 | subscription.json | **mevcut**, ADR-058 Ek 1 |

## Kural olmayan sunumlar (yeni kural yazılmaz, mevcut çıktıdan şablon)
Analiz satırı (çift ilerleme) · efor satırı (RIR geçmişi) · rekor (gerçek set baskınlığı) · kaldırılan toplam kilo · kas haritası payı
(birincil kas / `weekly_sets_per_muscle`) · İlerleme sonuç cümlesi. Hepsi sunucuda hesaplanır, metin `en.json` şablonu.
