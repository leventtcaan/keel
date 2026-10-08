# ADR-074 · Kardiyo reçetesi: Güray'ın solo kaynağından varsayılan, kullanıcı değiştirir; kalori yalnız Apple Watch'tan
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent; öneren: agent

## Bağlam
Motorda, parametrelerde, sözleşmede ve mobilde kardiyo yok. Tur 3'te Levent "Güray'ı dinle" dedi; prototip YAG25'ten "2 × 30 dk" aldı. G2'nin
başlığı YAG25 podcast'inde konuşmacının belirsiz olduğunu, bu kuralların Güray'ın kuralı olarak koda girmemesi gerektiğini söylüyor; Ç-4 notu
"motora varsayılan sıklık verilmiyor" diyor (`arastirma/ham/guray/G2-kilo-verme.md` başlık uyarısı 1, K-29..K-36, Ç-4). Levent'in cevabı
(ADR-071 #7): Güray'ın solo kaynağı varsayılan, kullanıcı değiştirir.

## Karar sürücüleri
- U14: her parametre kaynağa bağlı; YAG25 yalnız solo kaynakla çelişmediği yerde.
- U13 ve K-30: kardiyo diyetin yerine geçmez; kalori bütçesini değiştirmez.
- Kullanıcı özgürlüğü: varsayılan öneri, kilit değil.

## Karar
1. **Varsayılan reçete** (`data/parameters/cardio.yaml`, yeni):
   | Durum | Seans/hafta | Süre | Yer | Kaynak |
   |---|---|---|---|---|
   | Yağ kaybı fazı | antrenman günü sayısı, en az 3, en çok 5 | 30 dk | ağırlıktan sonra; plan 3 günden azsa eksik seans off güne, çok düşük tempo | G2 K-32 (KRD24: 3-5 gün), K-31 (30 dk ≈ 300 kcal ideal), K-35 (sonra, ≤20-30 dk), K-36 |
   | Kas kazanımı fazı | 2 | 20 dk | ağırlıktan sonra | G2 K-32 (KRD24: bulk 2-3 × 20-30) |
   | Fiziksel iş (`VERY_ACTIVE`) | varsayılan yok, isteğe bağlı | | | G2 K-32 koşulu, K-46 |
   Faz motordan gelir (`PhaseGate`); "Decide for me" hedefinde de motorun seçtiği faz. Masa başı (`INACTIVE`) için reçete aynı, metin
   "required for desk days" demez (suçlama yok, U7).
2. **Tempo:** düşük tempo sürekli (LISS), konuşma testi; ~110 nabız (100-120) bilgisi yalnız Apple Watch verisi varsa (K-33). HIIT önerilmez
   (K-34). Öneri biçimleri: bisiklet, eğimli yürüyüş, eliptik.
3. **Zaman:** ağırlıktan **önce asla** (K-35). Seansın son adımı kardiyo (Done 30 min / Later today / Skip today); "Later today" o gün içinde
   sayar, "Skip" telafi doğurmaz.
4. **Kullanıcı özgürlüğü:** Antrenman › Edit › Cardio ve Ayarlar › Cardio: gün sayısı, süre, yer, tamamen kapatma. Ağırlık sonrası süre 30 dk'yı
   aşarsa tek satır bilgi (K-35), engel değil. Kullanıcı değişikliği programda `source: USER` olarak saklanır; motor onu ezmez.
5. **Kalori:** yalnız Apple Watch'un ölçtüğü aktif enerji (HealthKit `ActiveEnergyBurned`, seans penceresi) gösterilir, "Apple Watch" etiketiyle.
   Saatsiz kullanıcıya tahmin gösterilmez (MET formülü araştırmada yok). Prototipteki "about 300 kcal" satırı K-31'in dozunu anlatır
   ("30 min is about 300 kcal"), ölçüm diye sunulmaz. Kardiyo kalorisi beslenme bütçesine eklenmez (K-30: kardiyo kötü diyeti kapatmaz).
6. **Sayım:** kardiyo İlerleme'de haftalık hedef olarak görünür ("1 of 3 this week"); haftalık tutarlılık (U7) ağırlık seanslarıyla sayılmaya
   devam eder. Kardiyo kaydı "+" › Cardio'dan da girilir (dakika) ya da Apple Health antrenmanından okunur.

## Neden
KRD24 Güray'ın solo kardiyo videosu; K-32, K-35, K-36 aynı kaynakta tutarlı: antrenman günlerinde ağırlıktan sonra kısa, off gün off. Bu, 3-5 gün
bandını 3 günlük bir planda bile off güne dokunmadan karşılar. YAG25'in "en az 1, tipik 2"si konuşmacısı belirsiz ve solo kaynakla sayıda
çelişiyor. Kalori ölçümü yalnız cihazdan: tahmin uydurmak U1/U5'in ruhuna aykırı.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| 2 × 30 dk (tur 3 prototipi) | YAG25 konuşmacı belirsiz; solo kaynakla çelişiyor |
| Varsayılan yok (Ç-4 notu) | Levent varsayılan istedi; KRD24 tek başına tutarlı bir varsayılan veriyor |
| Kardiyo kalorisini bütçeye eklemek | K-30; ölçüm belirsizliği |
| MET ile kalori tahmini | Kaynak yok |

## Sonuçlar
- Prototip değişir: örnek kişi (yağ kaybı, 3 gün) **3 × 30 dk**; ilerleme hedefi "0 of 3 this week".
- Olumsuz: 5 günlük yağ kaybı planında haftada 5 × 30 dk; kullanıcı kısaltabilir.

## Geri dönmenin maliyeti
Düşük: parametre dosyası ve tek kural.

## Etkilenen
`data/parameters/cardio.yaml` (yeni; `ParameterDomain`'e eklenir), engine (yeni `CardioPrescription`), Program sözleşmesi (`cardio`), kardiyo kaydı
(yeni uç ya da `activity-days` genişlemesi), HealthKit okuma (seans penceresinde aktif enerji, antrenmanlar), mobil oturum son adımı, "+",
Edit, Ayarlar, İlerleme.

## Doğrulama
`CardioPrescription` tablo testleri (faz × gün sayısı × aktivite; 2 günlük planda off güne düşen seans; `VERY_ACTIVE` → yok) · özellik testi:
ağırlık öncesine asla yerleşmez, kullanıcı değişikliğini ezmez · telefon testi: saat verisi yoksa kalori satırı yok.

## Ek 1 · Sözleşme ve saklama (K-959, 2026-10-08, agent, teknik)
- **Varsayılan saklanmaz:** program her okunduğunda yürürlükteki faz, programın günleri (yoksa profilin günleri, K-527) ve aktivite ile
  `CardioPrescription.forWeek`'ten hesaplanır; yeni faz ya da yeni program onu kendiliğinden değiştirir. Kullanıcınınki programdan ayrı
  `training.cardio_plan` + `training.cardio_plan_session`'da (hesap başına bir tane); yeni program ve yeni faz ona dokunmaz (#4). Reddedilen:
  varsayılanı programla birlikte yazmak (faz değişince bayatlar, ezme kuralı gerekir).
- **Faz modül sınırını değiştirmeden:** `training.CurrentPhase` arayüzü, `decision.PlanPhase` sağlar (nutrition `DailyTargets` kalıbı;
  `allowedDependencies` aynı). Planın fazı; plan yoksa ilk planın başlayacağı faz (hedef; "Decide for me" `PhaseGate.startingPhase`).
- **Hafta:** Pazartesi-Pazar, kullanıcının takvimi (`Consistency.WEEK_STARTS_ON`); `doneThisWeek` kardiyo kaydı olan gün sayısı (bir gündeki
  elle ve saatten gelen iki kayıt bir seanstır, motorun "günde en çok bir" modeli gibi).
- **Kaynak adı `APPLE_HEALTH`** (kartta HEALTHKIT): sözleşmedeki `MeasurementSource` ile aynı kelime.
- **Aktif enerji** yalnız `APPLE_HEALTH` kaynağıyla ve sağlık verisi rızasıyla kabul edilir; rıza geri çekilince yalnız bu sütun boşalır,
  seans antrenman verisi olarak kalır (ADR-007; profildeki `food_avoid` kalıbı).
- **Telefon:** saat ölçümü = `HKSourceRevision.productType` "Watch" ile başlayan örnekler, pencerenin tam içinde olanlar toplanır; kardiyo
  sayılan antrenman türleri `data/parameters/health.json › health_cardio_workout_types`; enerji her antrenmanın kendi penceresinde okunur.
- **Aralıklı kardiyo sayılır (Levent, 2026-10-08):** Apple Health'ten gelen HIIT, ip atlama ve karışık metabolik kardiyo "yapılan kardiyo"
  olarak kaydedilir; kayıt olanı tutar, reçete düşük tempo kalır (K-34).
- **Koçun varsayılanına dönüş (Levent, 2026-10-08):** `DELETE /v1/program/cardio` kullanıcının kendi kardiyosunu siler; program yine
  yürürlükteki fazın varsayılanını taşır. İki kez çağrılması zararsız.
- **Bilgi satırı (#4):** ağırlık sonrası seans `cardio_after_lift_max_minutes`'ı aşarsa `ProgramCardio.afterLiftOverLine` true; sunucu
  hesaplar (`CardioPrescription.afterLiftOverLine`), telefon kural işletmez (ADR-075 #3).
