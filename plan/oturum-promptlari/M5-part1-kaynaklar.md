# M5 Part 1 — K-516 / K-512 / K-513 kaynak taraması (2 Eki, ajan raporu, özet)

> Ham rapor sohbetteydi; bu dosya kalıcı hafızadır. Yollar `arastirma/` altında. "YOK" = kaynak bulunamadı (U14: o alt madde bekler).

## K-516 durum modu
- **Dönüş yükü (% / rampa haftası): YOK.** Yalnız nitel: `ham/guray/G7-whisper-arsiv.md#K-72` "Molanın ardından tam yüke dönülmez; yavaş yavaş" (sayı yok). K-111 (geri toplanma 1-2 hafta), H3 "Deload — literatür" (1 hafta ara: hipertrofide fark yok, alt vücut kuvveti geride).
- **Minimum doz (koruma seti/kas/hafta): YOK.** Yakın: G1 K-11 (alt sınır 4 set/hafta), G1 K-22 (1/hafta atrofi yaratmaz), G2 K-41 (zaman yoksa 10 dk maksimum efor), G6 K-36 (3 gün minimum). B-antrenman 3.5 RP "MV" kavram, sayı yok.
- **Hasta/ağrı:** G2 K-87 (hastalıkta kilo kaybı su/glikojen — "hastalık modeli kilo kaybı reddedilir"), G4 K-50 (tanı/son karar sağlık profesyoneli), G1 BOŞLUKLAR 19 (sakatlık protokolü yok), RP "ağrıyan kasa set eklenmez". Ateş/boyun kontrolü YOK. "Hastayken kalori düşürme" yalnız L3 §4.2 önerisi.
- **Seyahat/hastalık tartı gürültüsü:** H1 `### Gürültü ne kadar?` (~0,4 kg su; günlük 1-3 kg normal), H1 `### Pencere seçimi`, H3 Ç5 (glikojen/su/tuz, min 2 hafta). **Kaç gün gürültü: YOK.**
- **Paused/af haftası:** 04 §7.3 (sayaç sıfırlanmaz, 1 hafta af), I1 F3 (af kullanımı risk sinyali), L3 §4.2 (paused P, af yanmaz, 3. ardışık paused'da tek soru — öneri).
- **7+ gün sonra dönüş:** I1 F4 / C6 (öz-şefkat tonu), 04 §7.4 (7 gün hareketsizlikte tek mesaj), H2 4.5 (geri dönen hafta kutlanır), G4 K-8. **Yeniden baseline kuralı: YOK** (yalnız L3 önerisi).

## K-512 tetikleyiciler — `ham/guray/G5-surec-supplement.md` `## 2 · UYGULAMA İÇİN UYARI TETİKLEYİCİLERİ` (kalın etiket satır başında)
- **T-2 · "Hiç aç değilim" ilk 2 günde** — başarı sayma; açlık 3-4. gün / ilk ağır bacak antrenmanından sonra gelir.
- **T-4 · Ard arda 2 antrenman kaçırma veya "gitmek istemiyorum" girdisi** — içsel motivasyon tavsiyesi verme; dışsal taahhüt.
- **T-5 · Working set ağırlığında düşüş** — "kas kaybediyorsun" deme; set sayısını artır, off günlerini azalt.
- **T-13 · Adım sayısı / günlük hareket düşüşü** — en yüksek öncelik; NEAT kaybı 500-600 kcal.
- Diğerleri T-1…T-19 (T-3 baş ağrısı, T-8 uyku, T-11 keyifsizlik, T-12 tartı paniği…). Uyarı: T-2, T-3, T-14 Güray'ın agresif protokolüne bağlı.
- 04 Ö-18 ve L3 §7 madde 5 en az dördü: adım düşüşü, 2 kaçan antrenman, kuvvet düşüşü, "hiç aç değilim".

## K-513 ilk 8 hafta + 5. hafta riski
- 04 `### 7.5 · Hafta hafta` (H0-H8 içerikleri; H4 nöral açıklama, H5 risk skoru, H6 "kas" ilk kez).
- I1 `## F2` (5. hafta sinyalleri: 0 antrenman · af haftası kullanımı · kayıt düşüşü · uygulama açılmaması; risk varsa tek insan tonu mesaj), I1 F5 (af kullanımı öncü gösterge), G2 K-63 (5.-8. hafta kritik).
- **Risk skoru ağırlıkları/eşikleri: YOK.** Girdiler var, formül yok.

## Mevcut parametreler (ilgili)
`on_track_min_ratio` 0.7, `quiet_days` 7, `question_budget_per_week` 2 / `_anomaly` 5, `steps_target_*`, `plateau_sessions` 3,
`overtraining_missed_plan_weeks` 2, `weight_daily_noise_sd_kg` 0.42. Yok: af/paused/risk/tetikleyici/durum/dönüş/minimum doz anahtarları.
