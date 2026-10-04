# ADR-053 · Geçmiş içe aktarma: görülür, karara girmez (K-609, K-615, K-616)
- **Durum:** KABUL (agent, teknik — ADR-019; ADR-018 §3'ün uygulaması)
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
ADR-018 §3: Apple Health kilo geçmişi ve Strong/Hevy CSV içe aktarılır; "geçmiş trend hemen görünür; ilk karar yine en erken ilk
pazartesi check-in'de gelir". Reddedilen alternatif: "içe aktarılan veriyle hemen karar — U8 ihlali; tek seferlik veri kalitesini
doğrulamadan karar". Kod okuması (4 Eki): ilk check-in planı başlatır ve 14/28 gün bakımı gözler (`InitialTarget.observing`,
`DataSufficiency` pencere) — ama **güvenlik ağı bundan önce koşar** (`SafetyNet`: penceredeki hızlı kayıp). Bir yıllık içe
aktarılmış kiloyla ilk gün "kaloriyi artır" çıkabilirdi; içe aktarılan antrenmanlar da `TrainingStatus`'a (yük merdiveni) girerdi.
Biçimler: `arastirma/ham/H13-ice-aktarma-bicimleri.md` (üreticiler sütun yayımlamıyor; gerçek dosyalardan doğrulandı).

## Karar sürücüleri
- ADR-018 §3 ve U8 ("ölç sık, yorumla seyrek") yapısal olarak tutulsun, tek bir tarih karşılaştırmasına emanet olmasın.
- İçe aktarılan veri kaynağıyla işaretli, kullanıcının gözünde ayrı (U1: sayının nereden geldiği bilinir).
- Dosya telefonda kalır; sunucuya yalnız eşlenmiş setler, sağlık rızasıyla gider (V2/V3 ruhu, M6 Part 4 talimatı).

## Karar
1. **İçe aktarılan geçmiş görülür, karara girmez.** Motorun ve kural okumalarının hepsi (karar, check-in soruları, ilk 8 hafta,
   uyum/tutarlılık, antrenman durumu, projeksiyon) içe aktarılanı okumaz: kilo `source = IMPORT` dışarıda (`Measurements.dailyWeights`,
   `latestWeightKg`), içe aktarılan seans (`imported_from` dolu) dışarıda (`TrainingLog`'un üç sorgusu). Ekranlar (kilo trendi, tartı listesi, antrenman listesi →
   telefondaki güç grafiği K-604) hepsini gösterir. Böylece içe aktarma **hiçbir kararı değiştirmez**: aynı hesap, aynı kendi verisi,
   içe aktarmalı ve içe aktarmasız → aynı çağrılar (`FirstDecisionNotBeforeMondayTests`).
2. **Kilo geçmişi (K-616):** Apple Health'ten bir kez, kullanıcı isteyince (Ayarlar). Okunan aralık `health_weight_import_days`
   (365, `urun`) öncesinden **eşitleme penceresinin başına** (`health_weight_read_days`) kadar; pencerenin içi zaten düzenli eşitlemede
   (`APPLE_HEALTH`, K-402). İçe aktarılanlar `IMPORT`, `clientId` = Health kimliği (iki kez okumak iki kez saklamaz). Mevcut kuyruk ve
   `POST /v1/weigh-ins` kullanılır; sunucuya yeni uç yok.
3. **Antrenman geçmişi (K-615 sunucu, K-609 telefon):** `POST /v1/workout-imports` — bir istekte en çok `import_workouts_per_request`
   seans (20; sözleşmede `maxItems`), her biri bitmiş (`startedAt`, `endedAt`), `source` STRONG | HEVY, setleri katalog ya da kişinin
   kendi hareketiyle. Tek transaction; seans `clientId`'si tekrar gelirse atlanır (yeniden deneme güvenli). **Sağlık rızası şart**
   (antrenman kaydı V3 listesinde değil ama içe aktarma toplu geçmiş; talimat). İlerleme (K-217), Health'e yazma (K-412), bildirim
   tetiklenmez. Seans `training.workout.imported_from` (STRONG | HEVY; uygulamada kaydedilen seansta boş) ile işaretli;
   sözleşmede `Workout.importedFrom` yalnız içe aktarılan seansta bulunur.
4. **Dosya telefonda ayrıştırılır**, sunucuya gitmez. Okunan: yalnız H13'te doğrulanan sütunlar; notlar, RPE, mesafe, süre okunmaz.
   Tanınmayan başlık → dosya reddedilir (sütun tahmini yok). Strong'da ağırlık birimi dosyada yok → kullanıcı seçer; dambıl yükünün
   tek mi toplam mı olduğu dosyada yok → kullanıcı bir kez seçer (H13 B4); taraf bilinmez → **saklanmaz** (`side` yok) — yalnız
   içe aktarma ucunda tek taraflı hareket tarafsız kabul edilir.
5. **Hareket eşleme ekranı:** her dosya adı bir kez eşlenir. Ad normalleştirilir ("Hareket (Ekipman)" → ad + ekipman), katalog adı ve
   takma adlarla (`en.json › exercises.<id>.aliases`) ve kişinin kendi hareketleriyle karşılaştırılır. Güven **yüksek** (ad ya da takma
   ad birebir, ekipman çelişmiyor) → eşlenmiş gelir, değiştirilebilir; **düşük** → en yakın üç seçenek tek dokunuşla, ya da "my own
   move" (K-424) ya da atla (U5: belirsizlik gizlenmez). Eşikler `data/parameters/import.json` (`urun`).

## D1 · Sayılar (hepsi `urun`, kaynaksız seçim — U14 etiketi)
| Parametre | Değer | Neden |
|---|---|---|
| `import_workouts_per_request` (`import.json`; sunucu `keel.training.import.max-workouts`; sözleşme `maxItems`) | 20 | Bir istek yavaş bağlantıda da kısa kalır; bir yıllık geçmiş (~200 seans) on istek. Üç yer `ImportLimitsMirrorTests` ile eşit |
| Seans başına set (`max-sets`, sözleşme `maxItems`) | 200 | Gerçek bir seans bunun çok altında; fazlası dosya hatası sayılır |
| `health_weight_import_days` (`health.json`) | 365 | Trend ve alışkanlık için bir yıl yeter; ömür boyu geçmiş gerekmez. Düzenli okumanın (`health_weight_read_days`) başladığı yerde biter |
| Eşleme eşikleri (`import.json`, K-609) | K-609'da | Ad benzerliğinin "yüksek güven" sınırı; düşükte kullanıcı seçer (U5) |

## Neden
- Kaynak işaretiyle dışlamak, "ilk karar ilk pazartesiden önce gelmez"i bir tarih kuralından daha güçlü verir: içe aktarma kararı
  **hiç** etkilemez, tek bir özelliğe (aynı çağrılar) indirgenir ve test edilir. Pencereler 14-28 gün; plan ilk check-in'de başlar —
  gözlem bittiğinde pencere zaten kişinin kendi verisiyle dolu, dışlama ilk karardan sonra bir şey kaybettirmez.
- Toplu uç: bir yıllık Strong geçmişi ~200 seans × 20 set = 4.000 istek olurdu; ayrıca kaynak işareti ve "bitmiş seans" tek adımda.
- Kilo için kuyruk yeter: günde bir tartı × 365 = 365 küçük istek, mevcut çevrimdışı kuyruk (kalıcı, tekrarlı) zaten bunu taşıyor.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| İlk karar tarihine kural ("hesabın ilk pazartesisinden önce çağrı yok") | Güvenlik ağı ve antrenman durumu yine içe aktarılanı okurdu; içe aktarılan veriyle karar sürerdi |
| İçe aktarılanı motor da okusun (yalnız ilk check-in bekletilsin) | ADR-018'in reddettiği alternatif: doğrulanmamış tek seferlik veriyle karar |
| Var olan uçlarla tek tek (seans aç, set yaz, bitir) | Binlerce istek, kaynak işareti yok, yarıda kalan içe aktarma yarım seans bırakır |
| Dosyayı sunucuda ayrıştırmak | Kullanıcının tüm dosyası (notlar dahil) sunucuya gider; gereken yalnız eşlenmiş setler |
| RPE → RIR (10 − RPE) | Bu dosyalar için doğrulanmadı; RIR yoksa da set geçerli |

## Sonuçlar
Olumlu: içe aktarma karar güvenliğini değiştirmez; geçmiş grafikte hemen görünür; dosya telefonda kalır. Olumsuz (kabul edilen):
içe aktarılan yakın tarihli antrenmanlar (dün Strong'da yapılan) ilk haftaların antrenman durumuna girmez; içe aktarılan kilo
geçmişi projeksiyonun "oturmuş başlangıç" sayacını öne çekmez (U12 ilk 4 hafta korunur). İçe aktarılan setler tarafsız.

## Geri dönmenin maliyeti
Düşük: dışlama iki okuma yerinde (`Measurements`, `TrainingLog`); kaynak sütunu kalır.

## Etkilenen
V32 (`training.workout.imported_from`), `training/TrainingLog`, `training/WorkoutStore`, `training/WorkoutController` (yeni uç),
`measurement/Measurements`, `measurement/MeasurementStore`, `measurement/MeasurementController` (trend hepsini okur),
sözleşme (`Workout.importedFrom`, `WorkoutImport`), ADR-015 (training → consent), telefon `src/import/`, `data/parameters/import.json`, `health.json`, H13.

## Doğrulama
`FirstDecisionNotBeforeMondayTests` (aynı çağrılar, ilk çağrı NO_DECISION_YET), `WorkoutImportApiTests`, `WeightTrend` içe aktarılanı
gösterir, telefonda `ImportTests` (ayrıştırma, eşleme, birim), dosyanın ağa gitmediğini gösteren test.
