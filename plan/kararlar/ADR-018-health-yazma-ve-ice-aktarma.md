# ADR-018 · Apple Health'e antrenman yazma ve geçmiş içe aktarma
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)
- **Değiştirdiği:** ADR-007 (yalnız "okuma" varsayımı)

## Bağlam
ADR-007 ve prototip "Nothing is written back" diyordu. Sektör standardı tersi: Hevy ve Strong antrenmanı HealthKit'e yazıyor;
Apple Watch Fitness halkaları ancak böyle kredi alıyor. RED-S güvenlik kontrolü (U13, K-104) egzersiz harcaması istiyor ama
okuma listesinde yoktu. Geçmişi olan kullanıcıyı iki hafta bekletmek geçiş maliyeti yaratıyor.
Kaynak: `arastirma/ham/L3-ozellik-boslugu.md` §2, §3, P8, P9.

## Karar
1. **Yazma (seçimli):** tamamlanan seans HealthKit'e antrenman olarak yazılır; elle girilen tartı isteğe bağlı yazılır. Ayrı izin,
   ayrı toggle, geri alınabilir.
2. **Okuma listesine active energy ve dış antrenmanlar eklenir** (enerji mevcudiyeti girdisi).
3. **İçe aktarma:** Apple Health kilo geçmişi · Strong / Hevy CSV. **Geçmiş trend hemen görünür; ilk karar yine en erken ilk
   pazartesi check-in'de gelir** (U8'in "ölç sık, yorumla seyrek" ilkesi korunur).
4. Okunmayanlar değişmez: kalp verisi dışındaki klinik kayıtlar, döngü, ilaç, sağlık kayıtları, konum.

## Neden
Kullanıcının verisi tek merkezde toplanır, halka kredisi kaybolmaz, güvenlik ağı hesaplanabilir hale gelir; içe aktarma rakipten
geçişin en ucuz yolu.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Yalnız okuma | Fitness halkası kaybı, sektörle ters |
| İçe aktarılan veriyle hemen karar | U8 ihlali; tek seferlik veri kalitesini doğrulamadan karar |

## Geri dönmenin maliyeti
Düşük.

## Etkilenen
ADR-007, onboarding Apple Health ekranı, K-404, K-104, yeni içe aktarma görevi.

## Doğrulama
Yazma izni yokken yazma çağrısı yapılmadığını gösteren test; içe aktarmadan sonra ilk kararın ilk pazartesiden önce gelmediğini
gösteren motor testi.

## Ek 1 · İzin zamanı (2026-10-07 — ADR-069 #3, ADR-072 #8)
Onboarding'deki Apple Health ekranı kalkar. İzin **ilk kullanıldığı anda** bir kez istenir: ilk tartıda ya da ilk antrenmanda (`health-jit`);
"Not now" serbest, Ayarlar'dan sonra verilir. Okunan türler aynı; antrenman penceresinde aktif enerji (ADR-074 #5, ADR-075 #7) ve kardiyo için
antrenman okuması eklenir. Yazma ayrı anahtarla sürer.

## Ek 2 · İzin kartı ve tartının geri alınması (K-980, #443, 2026-10-15, agent, teknik)
- **Kart sayfa değil, satır içi:** `HealthJit` ilk tartının **kaydından sonra**, kaydın altında ve ilk antrenmanın bitiş ekranında çıkar. Tartı kart
  sorulmadan önce telefona yazılır; Apple'ın sayfası açılmasa, rıza kaydedilemese ya da "Not now" denince tartı kaybolmaz. Reddedilen: prototipteki gibi
  Save'i bloklayan sayfa (izin hatası kaydı yutardı).
- **"Bir kez":** kv anahtarı `health.asked` (hesaba aittir, çıkışta silinir, `docs/yasal/veri-envanteri.json`'da). "Not now" ya da bağlanma işaretler;
  Apple'ın sayfası açılmazsa ya da rıza kaydedilemezse işaretlenmez (tekrar sorulabilir). Sorulmaz: bu yapıda Health yok (Expo Go), sağlık verisi rızası
  yok (okunan sağlık verisi), Apple Health zaten açık, daha önce soruldu. Sıra Ayarlar'dakiyle aynı: önce Apple sayfası, sonra rıza (`connectAppleHealth`).
- **Bilgilendirilmiş rıza:** kart neyin okunup yazıldığını iki satırda söyler; rıza metni "What we read" ile bir dokunuş uzaktadır.
- **Tartıyı geri alma** (`takeBack`, `src/sync/takeBack.ts`; kardiyo da kullanır, ADR-074 Ek 3): kuyruk tutulur; hiç denenmemiş kayıt yerelden gider;
  denenmiş ama sonucu bilinmeyen kayıt önce gönderilir (sunucu kimliği bilinsin), sonra `DELETE /v1/weigh-ins/{id}` ile silinir ve yerel kopya
  **ve bekleyen kopya** düşer (silme fiziksel; aynı `clientId` satırı yeniden yazardı, ADR-074 Ek 2). 404 = alındı; 409 ya da cevapsızlık hiçbir şeyi
  değiştirmez. Apple Health'e yazılmış tartı (K-412) geri alınmaz: `HealthWriteAccess`'te silme yok; kullanıcının Health kopyası kalır.
- **Çevrimdışı sınır:** kayıt hemen gönderilmeyi dener (kuyruk kaydın hemen ardından boşalır); çevrimdışıyken bu deneme "denendi" sayılır ve sunucunun
  kaydı alıp almadığı bilinemez. Bu yüzden çevrimdışı Undo sunucuya ulaşamaz: hiçbir şey silinmez, ekran "You're offline. Take it back once you're
  online." der ve Undo düğmesi kalır; bağlantı gelince aynı düğme yeniden dener (önce gönderir, sunucu kimliğiyle siler). Veri kaybı yoktur: tartı
  ya yerelde bekler ya sunucudadır. Reddedilen: denenmiş bir kaydı sunucuya sormadan yerelden silmek (sunucuda kalmış olabilir, kimse silmezdi).
- **Health kopyası:** yazma anahtarı açık ve iOS izin veriyorsa (`healthWriting.shown('weighIns') === 'on'`) Undo'dan sonra ekran "Taken back. Your Apple
  Health copy stays." der (görünür ve VoiceOver'a); kapalıysa bu söz yoktur.
- **Kart kapsamı = rıza kapsamı:** "Reads steps, sleep, weight, active energy and workouts" `consent.apple_health.body`'deki okunan türlerle aynıdır
  (test: `health-jit-card.test.tsx`).
- **"Last" ve ön dolum:** "Last: 80.4 kg" yanına sunucunun `measuredAt`'ı telefonun takviminde kısa tarih olarak yazılır (bugünse yazılmaz); eşik yok,
  yalnız biçim. `source === 'IMPORT'` olan son kayıt gösterilir ama alan doldurulmaz (geçmiş veridir, bu sabahın tartısı değil).

## Ek 3 · Öğün ekranı: iki üç dokunuş (K-980, #443, 2026-10-15, agent, teknik)
- **"+" › Meal › Add** (3 dokunuş): yeni öğün ekranı, forma girmeden iki yol sunar. **"Same as yesterday"**: dünün, **seçili öğünün** (kahvaltı, öğle, ...)
  öğünü; `repeatOffers` (bugün o öğün yoksa) ile aynı kural, `repeatOf` ile dünkü gibi yazılır. **"Recent"** (K-1025, 2026-10-15): `GET /v1/foods/recent?slot=` (kullanıcının son yedikleri, her yiyecek bir kez, **son seferki miktarla**, kalori veritabanından
  şimdi tahmin edilmiş aralık; o öğünde son yenenler önce, sonra tazelik sırası; sıralamayı sunucu yapar, telefon yapmaz). Hedeften bağımsızdır (hedef yokken ya da
  hedef aşılınca da döner). Bir dokunuş o yiyeceği o miktarla seçili öğüne yazar; yeniden deneme aynı `clientId`dir. Öğün seçimi değişince liste o öğünle yeniden
  okunur. En çok `quick_recent_max` (2) satır gösterilir: kelime bütçesi (25) ve "ilk bakışta az" ilkesi; gerisi aramadadır. Sunucu tavanı `recent-foods` (5,
  `application.yml`); gösterilen sayı tavandan fazla olamaz (backend `NutritionLimitsTests` ayna testi). Kalori aralıktır (U5), metin renginde (yargılayan renk yok, U7).
- **Önceki ve yeni uçlar:** "Same as yesterday" mevcut `repeatOffers` ile; "Recent" K-1025'in ucuyla. İlk günde ikisi de boş, ekran hiçbir şey çizmez (kullanıcı testi: ilk
  gün "Same as yesterday/Recent" olmasın).
- **Geçici hâl kalktı (K-1025):** ilk sürümde "Usual foods" (`GET /v1/days/{day}/suggestions`, sık yenenlerden bugünkü kalana sığanlar) vardı; kabul kriterindeki "son yiyecekler"
  değildi (hedef aşılınca ya da hedef yokken boş dönerdi, K-507). O uç Food sekmesinde kalır ("ne yenebilir"); öğün ekranı artık "Recent"i okur.
- **Form olduğu gibi:** arama, barkod (`Scan`, VoiceOver'a "Scan a barcode"), porsiyon, çok kalem, tahmin. Elle bir yiyecek eklenince hızlı yollar çekilir; düzeltme
  ekranında hiç yoktur. Okumalar `AppServices.mealStart` ve `recentFoods` içindedir (ekran `api`yi doğrudan çağırmaz); okunamazsa hızlı yol yoktur, form çalışır.
