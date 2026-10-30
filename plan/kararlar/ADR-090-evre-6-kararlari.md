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

## Ek 5 · "Any day" günü olan programa da gün eklenir (Evre 7, #684; agent, teknik; Ek 4'ün tamamlanışı)
- **Bulgu:** Levent build 9'da "Add a day'de hareketler gelmedi" dedi. Kök neden: sunucu, günlerinden biri hafta gününe bağlı olmayan ("any day") programa gün eklemeyi
  reddediyordu (`ProgramDayAdds.canAdd`, `Program.canAddDay` false, POST 409); telefon bu durumda sunucuya gitmeyip Edit'in kendi **boş** gününü açıyordu ("Day 4 · No moves yet").
  Elle yazılan ya da içe aktarılan programlar tam da bu günlerle gelir. Ek 4'ün "kendi programına gün eklenir, sunucu doldurur" kararı bu programlar için çalışmıyordu.
- **Karar:** hafta gününe bağlı olmayan gün artık engel değildir. Yeni gün, N+1 günlük şablonun seçilen hafta gününe düşen günüdür; şablon programın hafta günleri, seçilen gün ve
  (bağlı olmayan her gün için) haftanın ilk boş günleri üzerine kurulur, yalnız seçilen günün içeriği alınır. Bağlı olmayan günler olduğu gibi, yerlerinde kalır. Yedi gün yine en çok,
  bir hafta günü iki günün olamaz. Yeni koçluk kuralı yok (U14): içerik hep üretecin şablonu.
- **Etki:** sözleşme metni (`/v1/program/days`, `Program.canAddDay`); `ProgramDayAdds.canAdd/added`; K1: `ProgramDayAddsTests` ve `ProgramEditApiTests`'te "hafta gününe bağlı olmayan gün reddedilir"
  beklentisi (ADR'den doğan, gevşeten değil, Ek 4'ü tamamlayan değişiklik) yeni davranışa çevrildi.

## Ek 6 · Yemek kaydı yeniden kurulumu: öğüne göre alışkanlık (Evre 7 A, #684; agent, teknik; ürün tarafı Levent'in 30 Eki maddeleri 1-6)
- **Bulgu:** Levent build 9'da Log a meal'i eski ve dağınık buldu (dört sekme, favoriyi bulamadı, "Recent" öğüne göre değişiyor ama bunu söylemiyor, Today's food'a gidilemiyor).
  Rakip araştırması (`arastirma/ham/evre7-rakip-kaliplari.md` §1): MacroFactor boş aramada Favorites, saat önerileri, Latest; MFP öğün satırından girer. Bizde öğüne göre veri vardı
  (`/v1/foods/recent?slot=`) ama "sık yenen" öğünden bağımsızdı.
- **Karar 1, sunucu:** `GET /v1/foods/frequent` isteğe bağlı `slot` alır: yalnız o öğünde yenen öğünler sayılır ("Usually at breakfast"); hiç yenmeyen öğünün listesi boştur (`recent`
  gibi diğer öğünlere düşmez: boş bölüm gizlenir, yalan öneri verilmez). `Suggestion`a isteğe bağlı `carbsG` ve `fatG` eklendi (aynı tahminin parçası; sıra satırlarında üç makro).
  Yeni koçluk kuralı ya da yeni tahmin yok (U1, U14): yalnız kullanıcının kendi geçmişi, mevcut yiyecek tahmincisiyle.
- **Karar 2, arayüz (ayrıntı mobil PR'larında):** tek liste, bölümlerle: Favorites (kalp) › Usually at <öğün> › Recent; tam öğün tekrarı tek satır ("Same as yesterday's breakfast"). Her satırda
  tek dokunuşla "+" kayıt (hatırlanan porsiyon), satıra dokunmak porsiyon adımını açar. Kalp satırda ve porsiyon adımında. "Log a meal" açık kalır, o öğünde bugün olanları gösterir ve
  "View day" ile Today's food'a geçer. Makro renkleri uygulama genelinde tek (`macroProtein`, `macroCarbs`, `macroFat` token'ları).
- **Reddedilen:** "Usually"yi telefonda geçmişten hesaplamak (kaçınılan besinleri süzmek sunucunun işi, ADR-090 Ek 3) · öğün kimliği için yeni alan (`slot` zaten sözleşmede).

## Ek 7 · Evre 7 B ve C: program düzenleme ve antrenman akışı (#684; agent, teknik; ürün tarafı Levent'in 30 Eki incelemesi)
- **Gün ekleme hep sunucudan (B1):** telefon "boş gün" açmaz. `canAddDay` yok ya da false olsa da `POST /v1/program/days` sorulur (sunucu bilir); olmazsa sayfa nedenini söyler ve "Try again" verir. Edit'in `adding` rotası ve birinci hafta çağrısının "Edit'te ekle" yolu kalktı. Tek istisna: onboarding'in "Type it in" editörü (sunucuda henüz program yok).
- **Hareket seçici (B2):** arama + 5 kas grubu çipi (göğüs, sırt, omuz, kol, bacak; hareket, ilk kasının grubundadır) + ekipman çipi; "Popular for <grup>" önce. **"Popular" kullanım verisi değil, ürün seçimidir** (uygulama sayım tutmaz): `data/parameters/workout.json › move_picker_popular`, her grup için ana hareketler; her kimlik katalogda ve kendi grubunda olmak zorunda (test). Satıra dokunmak yerinde küçük önizleme açar (kaslar, ekipman, 3 ipucu, "Add to <gün>"); sondaki "+" adı bilen için tek dokunuş.
- **Silme ve sıra (B3):** gün silme ADR-087 #1 gereği sistem uyarısıyla sorar, sonra Undo. Hareketin seçenekleri sistemin action sheet'idir (yukarı, aşağı, kırmızı "Remove from <gün>"). Reddedilen: kaydırarak silme ve sürükleme tutamacı (gesture-handler kökü ve sıralanabilir liste derlemede yok; yeni native bağımlılık K5 ister).
- **Edit program (B4):** kök, Settings'in gruplu listesi (Your program, Cardio, Rebuild). **Split sayfası kaldırıldı**: sunucu bölünmeyi gün sayısından türetir (`generate` yalnız gün alır); başka bölünme seçtirmek yeni şablon ve koçluk içeriği ister (U14), ajan kararı değil. Bölünme başlık altında bir satırdır. Cardio: anahtar + Plan/Yours (+Reset) + dakika + gün noktaları; paragraf yok. Düzenleme sırasında "kaydedilmedi" notu, çıkış sorusu ve Save sayfa altında sabit bir kenar (dock) olur; üste eklenip sayfayı kaydırmaz. Kaydetme geri bildirimi uygulamanın tek bandıdır (Undo'lu).
- **Rebuild (B5):** sistem uyarısıyla sorar, çalışırken durumu söyler, Train'de "Program rebuilt · 5 days · 28 moves" bandı çıkar. **Undo yok**: sunucu yenilenen programın kopyasını tutmaz (`/v1/program/review/undo` yalnız inceleme değişikliği ve düzenleme alır); eski günleri `PUT` ile geri yollamak hedef ve ağırlıkları kaybettirirdi. Sunucu tarafı anlık görüntü ayrı iş (Levent'in kararı: ürün/veri).
- **Birimler (C, "209.4 lb", "242.5 × 10"):** kilodan türeyen yük lb'de en yakın 5 lb (10 lb altında 2.5) okunur (`load_display_step_lb` vb., tek yer: `units.ts › loadValue/formatLoad`). **lb olarak yazılan yük, kilo ızgarasının (1.25 kg katı, `load_display_kg_grid`) dışındaysa ve yarım libreye oturuyorsa olduğu gibi gösterilir** (ADR-029). Izgaranın üstündeki yük motorun kiloyla yaptığı hedeftir: tesadüfen libreye yakın düşse de (110 kg = 242.51 lb, 160 kg = 352.74 lb) raf okuması alır (245, 355). Bedeli: yarım libreyle yazılmış 15 yük (hepsi 100 lb üstü, 5'in katı değil; ör. 242.5) ızgaraya denk gelip en yakın 5'e okunur (K1, `units.test.ts`). Toplam hacim ("lb lifted") plaka değil toplamdır: `volumeValue`, tam sayı. Kilo değişmez. lb kullanıcının salonu hâlâ kg varsayılanıysa plaka satırı standart ABD rafıyla (45 lb bar; 45 35 25 10 5 2.5) lb olarak söylenir; hiçbir yük değişmez, yalnız nasıl okunduğu.
- **Antrenman (C):** dinlenme geriye sayar (bandın alt ucu 2:00'dan, ±15 sn, süre bitince sakin "Go when you are ready"), dock'un ilk satırıdır (set kartı yerinden oynamaz); arka plandaki bildirim ±15 ile birlikte kayar. Set kartında Hevy'nin PREVIOUS'u ("Previous 395 lb × 7": aynı set geçen sefer, telefonda yoksa sunucunun en iyi seti). Erken bitirme "N moves left" ile **bir kez** sorar; Finish bir set kaydedilince sayfanın başında görünür kalır. **End, Swap, Taken ve "How was your form?" sayfanın yerini almaz, altta kısa satırlı sheet olarak (`BottomSheet`) açılır**; arkada seans durur. Bitişte kayıp sayıları ve düşüş ("-94%", "4 reps fewer") hiç söylenmez (U7). Bitiş bir başarıdır: seansın **her** rekoru ("New best" altında gerçek set + programdan sıradaki hedef), hemen altında "4 of 4 sessions this week" ve segmentler, "What moved", Share ve Done; Apple Health sessiz bir satır (başlık, "What we read", iki düğme; "reads/writes" cümleleri yok) olarak Done'ın ardında, kas haritası en altta. Geçmişte "RIR 1" yerine "1 rep left", geri oku sistemden. Antrenman öncesi kart "about 50 min" ve ilk 3 harekette "Last 395 lb × 7 → 395 lb × 8" söyler; Start kartın tek büyük düğmesi, Change altında metin (süre ürün tahminidir: set başına `session_set_seconds` + dinlenme). Hafta şeridinde bir güne dokunmak kısa bir sheet açar (yapılmış günde her hareketin en iyi çalışma seti, planlı günde hareketler, boş günde "Rest day"; hiçbir şey "kaçırıldı" demez).
- **Yapılmadı (dürüstçe):** set satırında dokunsal titreşimin kendisi (`haptics.setDone()` portu ve çağrısı hazır, gövdesi boş: expo-haptics derlemede yok, native yeniden derleme + K5), Live Activity, set başına PREVIOUS **sütunu** (set kartı Hevy tablosuna çevrilmedi; PREVIOUS etkin setin satırında), sürükleyerek sıralama, uygulama tamamen kapatılınca dinlenme sayacının geri gelmesi (zaman damgasıyla arka plana gidip dönmek doğru; kapatılınca seans ve setler gelir, sayaç gelmez).
- **Etki:** `data/parameters/workout.json` (move_picker_*, rest_adjust_seconds, session_set_seconds, session_minutes_round, headline_moves_shown), `units.json` (load_display_*, imperial_*); K1 tabloları PR gövdelerinde (#694, #695, #696 ve C PR'ı).
