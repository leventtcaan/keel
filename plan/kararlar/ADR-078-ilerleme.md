# ADR-078 · İlerleme: ilk gün tıklanabilir hedefler ve planlanan kaslar, sonra tek cümle sonuç, güç + efor satırı, kas başına set
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (tur 2 "analitik, tek çıktı"; tur 3 "en kötü ekran"; prototip onayı); öneren: agent

## Bağlam
Bugünkü İlerleme analitik bir pano; ilk gün boş. Beslenme sekmesi kalkınca (ADR-069) hedefler (kalori, protein, adım) burada görünmeli. Rakiplerin
hiçbiri efor (RIR) geçmişini anlatmıyor (tur 2 strateji, B §6.4). Haftalık kas başına set hesabı çalışma zamanında yok (ADR-073 bağlamı).

## Karar
1. **İlk gün** (veri yokken): "Day 1. Today's targets." · dört **tıklanabilir hedef**: Calories ve Protein (öğün kaydına), Steps (Apple Health),
   Cardio ("0 of 3 this week", Antrenman'a) · **bu haftanın kasları** haritası, planlanan (kesik çizgi), antrenmanla dolar · güç grafiği
   kilitli önizleme ("After your first workout") · kilo: 7 noktadan kaçı dolu, "Shows after 7 weigh-ins" (U8).
2. **Sonra:** tek cümle sonuç, deterministik şablon ("Stronger on 4 of 5 lifts. Down 3.8 kg.") + "12 weeks · 11 on track" ·
   **Güç:** hareket çipleri, gerçek en iyi set ve başlangıçtan farkı, haftalık en iyi set grafiği (tutulan haftalar vurgulu) ve **efor satırı**:
   kayıtlı RIR ve tekrar geçmişinden şablon ("Same 100 kg, now with 1 rep left." · "Up one rep a week since November." · "Stuck at 72.5 kg for
   3 sessions. Held this week."); yeni kural değil, sunum · **Kas başına set** (bu hafta / hedef; G1 K-11 hedef 10, kol K-61 6) ·
   **Kilo** 7 günlük ortalama ve grafik (U8) · **Tutarlılık** 12 hafta ızgarası, af haftası "spare week" diye görünür (U7, 06 B2) ·
   **Calls** geçmiş kararlar listesi (karar ekranını açar, ADR-077) · **Photos** foto haftası, "They stay on this phone".
3. **Aralık kuralı:** yenen kalori tahmin olduğu için hedefe karşı aralık gösterilir ("1,650-1,820 / 2,916"), hedefin kendisi tek sayı (U5).
4. **Kas haritası** tek bileşen: antrenman sonu (ADR-075 #7) ve İlerleme aynı veriyi kullanır: katalogdaki birincil kas, haftalık hedefin
   payı (0-1); sunucu hesaplar (`weekly_sets_per_muscle`, `arm_weekly_sets_min`).
5. Kelime hedefi ≤50 (ilk görünüm).

## Neden
İlk gün boş ekran yerine eyleme dönük hedefler: her hedef bir dokunuşla kayda gider (M2 çıkarım 7). Tek cümle sonuç kullanıcının okuduğu %20'ye
sığar (M3 §7.1). Efor satırı rakipte olmayan, Güray'ın RIR kuralını (G1 K-5) kullanıcının diline çeviren bir anlatım; kanıtı kullanıcının kendi
kaydı.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Panoyu korumak | Levent: "analitik", "en kötü ekran" |
| e1RM grafiği | Tahmin tek sayı olamaz (U5, B10); gerçek set yeterli |
| Hedefleri Bu hafta'ya koymak | Bu hafta ≤40 kelime ve tek kahraman |

## Sonuçlar
- Olumlu: beslenme sekmesi olmadan hedefler görünür; ilk gün değer.
- Olumsuz: sunucuda yeni özet hesapları (kas başına set, efor satırı verisi, sonuç cümlesi verisi).

## Geri dönmenin maliyeti
Düşük-orta: ekran ve özet ucu.

## Etkilenen
`apps/mobile/src/app/(tabs)/progress.tsx`, kas haritası bileşeni (`data/parameters/workout.json › muscle_map_areas`), backend progress özeti
(yeni alanlar), `contracts/openapi.yaml`, `data/copy/en.json › progress`.

## Doğrulama
Ekran testleri: ilk gün dört hedef ve her birinin hedef rotası; kilo grafiği 7 tartıdan önce yok · özet testi: kas başına set birincil kasla,
efor şablonu girdi tablosuyla · U5 testi: yenen kalori aralık.

## Ek 1 · Sonuç cümlesinin kilo değişimi (K-988, 2026-10-09, agent, teknik)
- **Yer:** `GET /v1/consistency` › `weightChange {kg, since}` (decision): tutarlılık kaydının yanında, aynı dönemle (`since` = kaydın başladığı
  gün, ilk karar). Training modülü measurement'a bağlanamadığı için (K-965 notu) İlerleme'nin güç özetinde değil.
- **Kural (U8):** bugün biten `trend_display_days` ortalaması eksi `since`'de biten ortalama (`WeightTrend`, motorun kendi tartıları; içe
  aktarılanlar değil, karar penceresi gibi). Tek gün değeri asla. İki pencerenin her biri `min_weighins_per_week` tartı ister ve pencereler
  çakışmaz; yoksa alan yok. Yeni eşik yok (DataSufficiency'nin haftalık kuralı). Yuvarlama trend noktasıyla aynı (2 ondalık).
- **Sunucu cümle yazmaz:** telefon `data/copy/en.json` şablonuyla yazar ("Down 3.8 kg.").
- **Reddedilen:** ilk tartıdan bugüne (tek gün değeri, U8) · `/v1/weight-trend`'den telefonda fark almak (telefon kural işletmez; yeterlilik
  kuralı sunucuda) · ilerleme özetine (training) koymak (modül sınırı).
