# ADR-090 · Evre 6 kararları: ABD yemek verisi, öğün hatırlatması, 7 gün, prototipsiz arayüz
- **Durum:** KABUL (Levent, 29 Eki 2026)
- **Tarih:** 2026-10-29 · **Karar veren:** Levent

## Bağlam
Build 8 incelemesi (plan/evre-6-ortalamayi-yakala.md): yemek kaydı ABD kullanıcısı için kullanılamaz (veri Türkiye alt kümesi, birimler
gram), kayıt hatırlatması yok, 7 gün antrenman akışı yok.

## Karar
1. **Yemek verisi:** USDA FoodData Central (kamu malı; temel gıdalar porsiyon ve adet ölçüleriyle, ör. "1 large egg") + markalı ürünler ve
   barkod için Open Food Facts'in ABD alt kümesi (ODbL, ADR-088'deki atıf ve paylaşım düzeniyle). Türkiye alt kümesi kalır. ADR-088'e ek.
2. **Öğün hatırlatması dördüncü tür olur** (ADR-036 #1 ve ADR-089 Ek 2'deki "dördüncü tür yok" bu tür için kalkar): kullanıcının kendi
   yemek saatlerinden öğrenir, günde en çok iki, kapatılabilir, izin yoksa sessiz; Ayarlar metni dört türü söyler.
3. **7 gün antrenman serbest, uyarıyla** (ADR-027 #15'e ek): yedinci gün tek dokunuşla eklenir; ekranda kısa not (bir dinlenme günü gelişimi
   hızlandırır). Motor yükü buna göre okur; `max_training_days` 7.
4. **Arayüzde prototip onayı yok:** agent doğrudan kodlar, simülatörde kanıtlar; Levent TestFlight'ta inceler.
5. **Tek sayı, aralık detayda (U5 değişir):** kayıt ekranlarında tek sayı (aralığın ortası; etiket değeri varsa o), aralık dokununca açılan detayda ve karar ekranında. Hesap ve saklama aralık kalır.

## Sonuç
- ADR-036, ADR-027, ADR-088 bu ADR'ye atıfla güncellenmiş sayılır; ilgili parametreler (`max_training_days`, bildirim türleri) bu kararla değişir.

## Ek 1 · Antrenman günlerinin tek kaynağı program; gün ekleme tek yol; 7 gün (K-1060, #670, agent, teknik; ürün tarafı #3 Levent'in)
- **Sorun (denetim `plan/evre-6-denetim/antrenman.md`):** antrenman günü iki yerde tutuluyordu (profil `schedule.trainingDays`, program günleri) ve birbirini
  dinlemiyordu: hatırlatma eski günde çalıyor, "Rebuild for me" kullanıcının eklediği günü siliyor, 7. gün boş bir "Day 7"di ve `too_many_days` "5 yeter" diyordu.
  Yeni kullanıcıya antrenman hatırlatması hiç kurulmuyordu (`usualTrainingTime` artık sorulmuyor, ADR-072 #4).
- **Karar 1, tek kaynak = program, sunucu yazar:** programın günlerini yazan her yol (`ProgramStore.replace` ve `rewrite`: generate, PUT, PATCH, gün ekle, review
  uygula/geri al, bugünlük olmayan takas) profilin `schedule.trainingDays`'ini programın hafta günleriyle eşler (`Profiles.keepTrainingDays`). **Reddedilen:** profil
  alanını programdan türetmek (profil modülü eğitimi göremez, modül döngüsü; `GET /v1/profile` programı okuyamaz) · yalnız telefonun `keepSchedule`'u programla çağırması
  (sunucu tarafı yedekler, ör. kardiyo ve ilk hafta kararı, yine bayat okurdu). Sözleşme anlamı: `Schedule.trainingDays` programdan sonra programın günleridir
  (açıklama eklendi); hiçbir günü hafta gününde olmayan programda profilin listesi dokunulmadan kalır. Telefonda: tüm program yanıtları tek yerden izlenir
  (`api/programFollower.ts`, her `/v1/program*` yanıtı): kopya, hatırlatmalar (`reminders.keepProgramDays`) ve ekranlar (kaydedilen değişiklik sinyali) buradan güncellenir;
  "Rebuild for me" programın günleriyle kurar.
- **Karar 2, hatırlatma saati:** `usualTrainingTime` yoksa hatırlatma `default_training_time` (18:00, `urun`, ürün sahibinin onayına açık seçim) ile planlanır; kullanıcının
  verdiği saat kazanır. Ayarlar'a saat formu eklenmedi.
- **Karar 3, gün ekleme tek yol:** `POST /v1/program/days` her gün sayısında (şablonu olan N+1, en çok 7) ve her kaynakta çalışır; Train, Edit ve 1. hafta kararı aynı uca gider
  (Train'de görünür "Add a day", hafta gününü tek dokunuşla seçtiren sayfa). İçerik hep üretecin (yeni koçluk kuralı yok, U14). **İki yol, programın ne olduğuna göre**
  (ADR-073 Ek 9'un ölçümü, bkz. `add_day_balanced_days`): şablondan sapmamış üretilmiş program (2 günlük hariç; o adımın dengesi ölçüldü ve 1. hafta çağrısının yoludur)
  N+1 günlük programa **yeniden kurulur**: günler hafta günlerinde ve kimlikleriyle kalır, aynı hareketin satırı, hedefi ve başlangıç ağırlığı taşınır; ekleme geri alınırsa
  program olduğu gibi döner. Kullanıcının değiştirdiği ya da getirdiği programa (ve bugün başlamış bir seans varken her programa) yalnız gün **eklenir**, mevcut günler
  aynen kalır. Gerekçe: yalnız eklemek 3'ten 4'e, 4'ten 5'e, 5'ten 6'ya ardışık aynı bölge ve eksik set verir (Ek 9'un simülasyonu); yeniden kurmak kullanıcının
  düzenlemesini siler, bu yüzden yalnız düzenlenmemiş programda. Ek 9'un "kendi programı 409" kararı kalktı: boş günü elle doldurmak (~10 dokunuş) eksik akıştı; kendi
  programına eklenen gün kullanıcının bölünmesine dokunmaz, yalnız üretecin günüdür ve düzenlenebilir. Geriye uyum: `add_day_from_days` → `add_day_balanced_days` (aynı değer 2).
- **Karar 4, 7 gün (#3 uygulaması):** `max_training_days` 7 (`ProgramRequest.trainingDays` maxItems 7), `data/programs/7-days.yaml` (itiş/çekiş/bacak ×2 + kol ve omuz günü, taslak,
  ürün sahibinin koçluk onayına açık). Program incelemesi kullanıcının seçebileceği gün sayısını (`training_days_free_max` 7) birleştirmeyi **önermez**; Güray'ın 5 günlük
  tavanı (G6 K-36, `training_days_max`) motorda durur ve yalnız bu sayının üstünü işaretler. Yerine Train'de kısa not: `rest_note_above_days` (5) üstünde bir program "A rest day helps
  you grow faster." der. Onboarding'in gün sorusu 2-5 kalır (6, K-1059'da).
- **Etki:** sözleşme (`ProgramRequest` maxItems 7, `/v1/program/days` ve `canAddDay` anlamı, `Schedule.trainingDays` açıklaması); parametreler (`training_days_free_max`,
  `add_day_balanced_days`, `max_training_days`, `rest_note_above_days`, `default_training_time`); veri tabanı ve göç değişmez.

## Ek 2 · Antrenmanda "Taken": aleti dolu hareket için sıraya sona al ya da başka ekipmanda alternatif (K-1064, agent, teknik)
- **Sorun (denetim `plan/evre-6-denetim/antrenman.md` madde 4, 8, 9):** "lat pulldown dolu" için takas listesi yalnız `pull_up` ve aynı kablo istasyonundaki `close_grip_lat_pulldown`'dı (`SwapOptions` yalnız aynı ilk kası arıyordu; `seated_row` gibi lats ağırlıklı çekişler `upper_back` olduğu için çıkmıyordu); "sona al" yoktu; "dolu" bilgisi hiçbir yere gitmiyordu. Levent: "lat pull down dolu oldu mu kullanıcı bunu da belirtirse ona göre değişim".
- **Karar 1, kas grubuyla aday seti (sunucu):** `data/muscles.yaml › swap_groups` birbirinin yerine geçen kasları söyler (şimdilik `[lats, upper_back]`: dikey çekiş ile kürek çekişi). `SwapOptions` sırası: kataloğun alternatifleri, aynı ilk kas + aynı tür (id sırası), sonra ilk kası aynı gruptan olan aynı türdekiler (id sırası). Tür kuralı (G6 K-35) ve barbell/salon filtresi aynen kalır; bu yüzden omuz presine göğüs presi çıkmaz. Kaynak G1 K-77 (dolu makineyi bekleme, bildiğin alternatife geç) ve K-37 (kas grubu başına 3-4 hareket). Sözleşme: `PlannedExercise.swapOptions` açıklaması.
- **Karar 2, "başka ekipman" telefonda (U1 değişmez):** sunucu listesi bütün ekipmanları taşır; telefon (`train/taken.ts`) alınan hareketin ekipmanını ve bu seansta alınmış hareketlerin ekipmanını eler (ikinci bir kablo hareketi dolu kablo istasyonunu çözmez; katalog "istasyon" bilmiyor, ekipman sınıfı en yakın sınır), önce kullanıcının daha önce yaptıklarını (`swapTables.lastBestSet`) sonra sunucu sırasını alır, her ekipmandan birini gösterir, en çok `taken_alternatives_max` (3, `workout.json`). Seçilen hareketin başlangıç ağırlığı mevcut kuraldan gelir: geçmişi varsa `swapTables` satırı (son en iyi set, ±yük), yoksa ilk seans kalibrasyonu.
- **Karar 3, giriş:** hareketin satırında (başlık: How to · History · Swap · Taken) ve "Up next" satırında ("Taken?", sıradaki hareket için, bulunduğun hareketten ayrılmadan). Sayfa = `TakenSheet`: "Do it later" (hareket bugünün sırasının sonuna, oturumla saklanır, Undo'lu) ve en çok 3 alternatif (Swap'ın aynı `swapTo`'su: Undo, superset, planlanan harekete dönüş aynı çalışır); "More swaps" genel Swap sayfasını açar. Bugüne özel, yalnız telefonda; programa dokunmaz.
- **Karar 4, "dolu" sinyali sunucuda:** `WorkoutFinish.takenExerciseIds` (isteğe bağlı) kaydedilir: `training.workout.taken_exercise_ids text[]` (V53, ADR-023: kendi şemamızda tek sütun, yabancı anahtar yok). Yalnız saklanır; motor henüz okumaz (sonraki öneriler için). Alan yazılmayan finish önceki değeri korur, boş liste temizler. Oturum başka yoldan kapanırsa (otomatik kapanış) yazılmaz; kayıp sinyal, hata değil.
- **Karar 5, Today › Change › Gym is busy:** aynı mantık (`takenChoices`): "Which one is taken?" sonra başka ekipmandan en çok 3 seçenek, bugünlük. Metinler Taken akışıyla aynı sözcüklerle ("Pick what is taken.", "Same muscles, other equipment. Today only."). Antrenman başlayınca bu yol kapanır (Short/Full dışı gizlenir); takas antrenmandaki Taken'dır.
- **Reddedilen:** kataloğa elle `station` alanı (40 hareket için içerik işi; ekipman sınıfı şimdilik yeter, yanlış elenen hareket "More swaps"ta durur) · "Do it later"ı sunucuya yazmak (sırayı yalnız telefon bilir, takas gibi oturumluk) · "sona al" için tüm programı yeniden sıralamak.

## Ek 3 · Yemek kaydı: gün gezgini, yerinde düzeltme, porsiyon adımı, öğün hatırlatması (K-1063, #673, agent, teknik; ürün tarafı #2 ve #5 Levent'in)
- **Denetim (`plan/evre-6-denetim/yemek.md`, D):** geçmiş gün ve başka güne kayıt yoktu; düzeltme sil + yeniden kaydetti; satırda miktar yoktu; Recent 2 öğeydi; favori, sık
  yenen, kendi besini, hızlı kalori yoktu; barkod kaçınca çıkmaz sokaktı; öğün hatırlatması yoktu; her sayı aralıktı (100 g başına).
- **Karar 1, sunucu (sözleşme önce):** `PATCH /v1/meals/{id}` (öğeler, öğün, an; öğün kimliğini ve clientId'sini korur, silip yeniden kaydetmez) · `GET /v1/meals?from&to` ve
  `GET /v1/days?from&to` (en çok 62 gün; gün şeridi, geçmiş günler, öğrenme) · `POST /v1/foods` (etiketten kendi besini; porsiyon başına sayılar, sunucu 100 g'a çevirir, yalnız
  sahibi görür, `own:<id>`) · `GET /v1/foods/{id}` · favoriler (`GET /v1/foods/favorites`, `PUT/DELETE /v1/foods/{id}/favorite`) · `GET /v1/foods/frequent` · `quick` öğesi
  (kcal + isteğe bağlı makro, aralık tek sayı, Recent'a girmez) · `Food.avoided` (aranan besin kaçınılanlardaysa işaret; gizlenmez) · `recent-foods` 5 → 12. Göç V54
  (`own_food`, `food_favorite`; sağlık verisi: hesapla ve rızanın geri çekilmesiyle silinir, dışa aktarılır, envantere işlendi).
- **Karar 2, tek sayı (#5 uygulaması):** kayıt ekranlarında porsiyon başına tek sayı (`Portion`), kayıtlı öğede ve günde aralığın ortası; aralık "Details" dokunuşunda
  (`/v1/food-estimates`). Hesap ve saklama aralık kalır. Kalan kcal tek sayı; protein, karb, yağ yenen / hedef.
- **Karar 3, öğün hatırlatması dördüncü tür (#2 uygulaması):** telefonda saf fonksiyon (ADR-036 #2). Son 14 günde her öğünün günlük zamanının medyanı, en az 3 kayıtla; günde en
  çok 2 öğün (en çok kayıtlı olanlar); öğünün olağan saatinden 30 dakika sonra, o öğün hâlâ boşsa (son açılıştaki bilgiyle); bugün ve yarın tarihle planlanır. Ana anahtar
  kapalıyken ya da izin yokken hiçbir şey planlanmaz; kendi anahtarı da var. Parametreler `notifications.json` (`meal_reminder_*`, tag `urun`: kaynak yok, ürün seçimi).
  Geçmiş güne yazılan kayıtlar öğünün varsayılan saatiyle (`past_day_slot_hours`) yazılır ve öğrenmeye karışır; bilinen sınırlama, medyan bunu sönümler.
- **Karar 4, arayüz:** gün gezgini (ok + 30 günlük şerit) Food sayfasında; öğün listesinde kaydırarak silme, dokununca yerinde düzeltme, Undo; seçilen güne kayıt. Öğün
  ekranında Recent / Frequent / Favorites sekmeleri, "Log again", "Copy a day's meal", Quick add, Create my own food; barkod kaçırınca "Add it" ve "Search instead".
  "Günde N öğün": yalnız kullanıcının kullandığı öğünler gösterilir, bir tane eklenebilir; kalori hedefi varsa öğün başına ipucu yalnız küçük bir satırdır.
- **Reddedilen:** favoriyi telefonda tutmak (cihazlar arası kaybolur, dışa aktarma ve silme dışında kalır) · hızlı kaloriyi "Quick add" adlı gizli bir besin satırıyla yapmak (veritabanını kirletir,
  aramada çıkar) · gün toplamını telefonda toplamak (sunucunun `eaten` aralığı var).
- **Bilinen sınırlar (Ek 3):** This week'teki "Food left" satırı hâlâ aralık gösterir (karar/özet yüzeyi, #5'in "karar ekranında" kapsamı; Levent isterse tek sayıya çevrilir) ·
  öğün hatırlatması öğrenmesi geçmiş güne yazılan kayıtları da sayar (sabit saatle yazıldıkları için medyanı biraz çeker) · hatırlatma yalnız uygulama açılınca tazelenir
  (bugün ve yarın tarihle planlıdır; birkaç gün açılmazsa son bilinen öğünlerle çalar) · gün toplamı ve öğün başı ipucu hedef yoksa gösterilmez (yalnız yenen).

## Ek 4 · Levent onayları (30 Eki 2026, build 9)
- Antrenman hatırlatmasının varsayılan saati 18:00 kalır (`default_training_time`); onboarding saat sormaz, Ayarlar › Your routine değiştirir.
- 7 günlük şablon ve 40 hareketin kendine ait ipuçları v1'de bu hâliyle çıkar; koçluk gözden geçirmesi sonra.
- Kullanıcının kendi programına "Add a day" ile gün eklenir (ADR-073 Ek 9'daki 409 kalkar); sunucu yeni günü doldurur, mevcut günlere dokunmaz.
- Evre 6 K1 test beklentisi değişiklikleri (#676 #677 #681 #683 #685 #686 #687) onaylı (Levent 29 Eki genel onayı, `.envanter/notes.md`).
