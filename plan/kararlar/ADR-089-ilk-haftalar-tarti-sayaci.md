# ADR-089 · Kararsız haftalarda tartı sayacı ve hafta içi tek hatırlatma (son kontrol K-1058, bulgu 1)
- **Durum:** KABUL (agent; arayüz prototip bölüm 11, Levent onayı 29 Eki)
- **Tarih:** 2026-10-29 · **Karar veren:** agent (teknik), Levent (arayüz)

## Bağlam
Persona yürüyüşü (plan/son-kontrol-2026-10-29.md bulgu 1, GS-39): karar penceresinin her 7 günlük bloğu en az `min_weighins_per_week`
(4) tartı ister (DataSufficiency, H1 §3.4). Bir haftada 3 tartı, ilk okunabilir kararı erkekte hafta 3'ten hafta 5'e atar. Kullanıcı bunu ilk
karar gelene kadar hiçbir yerde görmez: This week kartı yalnız "Weigh in most mornings." der; call ekranındaki "N more weigh-ins needed" trendin
toplam sayısıdır (trend_min_weighins 7), haftanın bloğu değil.

## Karar
1. **Sayı sunucudan:** `GET /v1/first-weeks` yanıtına `weighInWeek` eklenir (yalnız ilk karar okunana kadar, yani son karar yokken ya da
   NO_DECISION_YET iken). Blok, motorun bloğudur: bir sonraki check-in gününde biten 7 gün (`from`..`to`, kullanıcının takvimi), `weighedDays`
   (bloktaki tartılı günler: günün ilk tartısı, MANUAL ve APPLE_HEALTH; IMPORT sayılmaz, ADR-053), `needed` (= min_weighins_per_week).
   Blok bu hafta yetişemiyorsa (tartılı gün + bugün dahil kalan gün < needed) `callsFrom`: motorun `earliestEnoughDay` hesabı (yarından her sabah
   tartılırsa bütün kontrollerin geçtiği ilk gün). Telefon sayıyı ve tarihi hesaplamaz, gösterir.
2. **Kart (prototip 11.1-11.4):** "Your start" kartında sayaç: blok günleri noktalarla, "N of 4"; dört durum: yeterli · geride ("N more before
   Monday's call") · son iki gün · kısa hafta (suçlamasız, `callsFrom` ile). Bugün tartılmadıysa kart içinde "Weigh in". Metin en.json'da;
   telafi, ceza, streak yok (U7). Kısa haftada antrenman planı olduğu gibi sürer.
3. **Hatırlatma (prototip 11.5):** telefonun yerel bildirimi; haftada en çok bir, yalnız blok geride ve hâlâ yetişebilirken, check-in gününden
   `weigh_in_nudge_days_before` gün önce sabah `weigh_in_nudge_hour`'da; izin istenmez, bildirim izni zaten açıksa. Sayaç her okunduğunda
   (açılış, tartı kaydı) yeniden kurulur ya da kaldırılır. Parametreler mobil parametre dosyasında (K2).

## Gerekçe
- Kural değişmez (U2, U14): eşik ve pencere aynı; yalnız kullanıcı ne zaman neyin eksik olduğunu karar gününden önce görür.
- Hesap motorda tek yerde: aynı `earliestEnoughDay` hem kararın `nextReview`'unu hem kartın tarihini verir, ikisi ayrışmaz.
- `first-weeks` zaten bu haftaların kartını besler; yeni uç nokta açılmaz.

## Sonuç
- Sözleşme: `FirstWeeks.weighInWeek` (isteğe bağlı), `WeighInWeek` şeması. Kendi commit'inde, koddan önce.
- Testler: motor (blok sayımı, yetişemez sınırı, callsFrom = earliestEnoughDay), servis (IMPORT sayılmaz, ilk karar sonrası alan yok),
  mobil (dört durum, hatırlatmanın kurulması/kaldırılması).
