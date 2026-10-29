# Evre 6 · Antrenman denetimi (salt okuma, 29 Eki 2026)

Kapsam: plan/evre-6-ortalamayi-yakala.md madde 1-4 ve 17; ADR-090 #3. Hiçbir repo dosyası değiştirilmedi, simülatör çalıştırılmadı.
Her bulgu kod okuyarak çıkarıldı; cihazda koşulmadı. "Çalışmıyor" denen şeyler (içe aktarma) için kod gerçek görünüyor, cihaz kanıtı yok.
Yollar `/Users/leventcanceylan/Projects/keel-main` köküne göre.

---

## 1. Gün sayısı / hafta günü değiştiren her yer

Tek cümleyle: **tek akış değil, beş ayrı yol ve iki ayrı "doğruluk kaynağı" var** (program günleri ve profil `schedule.trainingDays`).
Sunucu motoru ve ekranlar programı okuyor (doğru taraf); profildeki gün listesi onboarding'de yazılıp bir daha güncellenmiyor ve hâlâ okunan üç yerde bayat kalıyor.

| # | Yol | Uç nokta | Sunucu | Programı yeniden mi üretir? |
|---|---|---|---|---|
| A | Onboarding `days` adımı (`apps/mobile/src/app/onboarding/days.tsx:20`): yalnız SAYI sorulur (2-5, `DayTiles`), hafta günlerini uygulama yerleştirir (`default_day_sets`, `data/parameters/onboarding.json`) | `PUT /v1/profile` (`onboarding/profileStatus.ts:92`, `draft.ts:203`) sonra `POST /v1/program/generate` (`onboarding/prepare.ts:130`) | `ProgramController.generate` (`backend/.../training/ProgramController.java:280`) → `ProgramGenerator.generate` → `ProgramStore.replace` (`ProgramStore.java:89`) | EVET, baştan üretir; review değişikliklerini, bu haftanın değişikliklerini (`session_change`) siler, `program_history`'ye yeni dönem yazar |
| B | Build my program (`app/build-program.tsx:48`; programı olmayan hesap için) | `POST /v1/program/generate` (`train/changes.ts:71 rebuild`) | aynı | EVET. **Profili güncellemez** (profil günleri onboarding'dekinde kalır) |
| C | Train › Edit › Rebuild for me (`app/edit-program.tsx:255-275`) | `POST /v1/program/generate` günleri **profilden** (`profile.schedule.trainingDays`) okuyarak | aynı | EVET. **Bayat günlerle**: kullanıcı programı Edit'te 5 güne çıkardıysa ama profil 3 günse, "Rebuild" sessizce 3 güne geri döner. Copy "built from your training days" diyor (`editProgram.rebuildBody`) |
| D | Train › Edit › Days (ve Settings › Training › Days, aynı ekran: `settings/TrainingGroup.tsx:35` → `/edit-program?part=days`) | `PATCH /v1/program` (`train/changes.ts:103 editProgram`) | `ProgramController.edit` (`:329`) → `ProgramReviews.edit` → `ProgramStore.rewrite` (`ProgramStore.java:137`) | HAYIR, yerinde düzenler: gün/hareket id'leri, hedefler korunur; gün sayısı değişirse `program_history`'ye yeni dönem. Gün ekle = **boş "Day N"** (hareket ve hafta günü elle) |
| E | Check-in kararı ADD_TRAINING_DAY (`today/useWeek1.tsx:140-170`) | `Program.canAddDay` doğruysa `POST /v1/program/days` (`train/changes.ts:87`); değilse ya da 409'da `/edit-program?part=days&adding=<gün>` | `ProgramController.addDay` (`:357`) → `ProgramDayAdds.added` (`ProgramDayAdds.java:57`) | Eklemez-üretmez: yalnız ÜRETİLMİŞ ve TAM 2 GÜNLÜK program 3'e çıkar (`add_day_from_days = 2`, `data/parameters/training.yaml:123`); gün N+1'lik şablonun o hafta günündeki günüdür. Diğer her durumda D'ye yönlenir |
| E2 | Check-in kararı MOVE_MISSED_SESSIONS (`today/week1.ts:77 moveDays`) | `PATCH /v1/program` | D ile aynı | Yerinde, günlerin hafta gününü taşır |
| F | Today › Change › Move it (`app/today-change.tsx`) | `POST /v1/program/today` (MOVE) | `TodayChanges` | Programa dokunmaz, yalnız bu haftanın oturumunu taşır (`session_change`) |

Settings'te ayrı bir "schedule" ekranı yok. Settings › Training › Days salt okunur satır + D'ye yönlendirme: bu doğru ve ayrışmıyor (`TrainingGroup.tsx:19-23` yorumu).
`PUT /v1/program` (kendi programı: onboarding "type it in"/içe aktarma, `useSendOwnProgram`) ayrıca bütün programı değiştirir; gün listesi `broughtProgram` ile profile yazılır (`onboarding/draft.ts:83`).

### Değişiklik sonrası kim neyi alıyor (hangi sinyal)

- **This week / Today, Train, Progress**: üçü de `GET /v1/program`'ı (`week`, `weekOf`, `today`) ve türevlerini okuyor (`today/week.ts:41`, `(tabs)/train.tsx:46`, `progress/read.ts:42`). Odağa gelince yeniden okuyorlar (`useReadOnFocus`). Progress'in hareket/set planı da programdan (`ProgressController.java:184`). → D, E, E2, A, B, C hepsi yayılıyor. OK.
- **Motorun planlı seans sayısı**: `PlannedSessions` (`backend/.../decision/PlannedSessions.java:61-78`) `training.program_history`'deki `sessions_per_week`'i okur; profil günleri yalnız programsızken yedek. `replace` ve (sayı değişince) `rewrite` yeni dönem yazar (`ProgramStore.java:104,136`). Hafta ortasında değişirse U7: o hafta o ana kadarki en azıyla yargılanır. → motor DOĞRU yayılıyor.
- **İlk hafta kararı**: `DecisionService.closingTheFirstWeek` (`DecisionService.java:317-326`) program günlerini, haftada günü yoksa profili okur. OK.
- **Cardio**: `CardioWeek.trainingDays` (`CardioWeek.java:28`) program günleri, haftada günü yoksa profil. OK.
- **Hatırlatmalar**: BAYAT + ÖLÜ (aşağıda P0-1). Telefon `keepSchedule(profile.schedule)` ile profilin gün listesini saklıyor (`services/appServices.ts:217`), programın günlerini değil; kullanıcı Edit'te günü taşıyınca hatırlatma eski günde kalır.
- **Profil `schedule.trainingDays`**: onboarding'den sonra HİÇBİR ekran yazmıyor (`PUT /v1/profile` yalnız `units/preference.ts:81`, `settings/FoodEditor.tsx:51`, `onboarding/profileStatus.ts:92`). Okuyanlar: Rebuild (C), hatırlatma planı, cardio/ilk hafta/prompts yedekleri.

### Nerede çelişiyorlar
1. Profil günleri vs program günleri (yukarıda). Kaynak sunucuda da iki yerde: `profile.profile.training_days` ve `training.program_day.weekday`.
2. Gün eklemenin üç farklı anlamı: E (2→3, içerik sunucudan), D (boş gün), A/B/C (tüm programı atan yeniden üretim).
3. Onboarding ve Build 2-5 sayı sorar, haftanın günlerini seçtirmez; 1 ve 6 şablonu var ama sunulmaz (`default_day_sets` anahtarları 2,3,4,5). 6 ve 7 yalnız Edit'te (boş gün ekleyerek).
4. `max_training_days = 6` (`onboarding.json`) uygulamada kullanılmıyor (yalnız testlerde karşılaştırılıyor: `parameters.test.ts:96`, `onboarding-draft.test.ts:95`); gerçek sınırlar: sözleşme `ProgramRequest.trainingDays maxItems 6` (`openapi.yaml:3724`), `PATCH/PUT maxItems 7`, `program_days_max 7` (`workout.json`), editör `P.programDaysMax`.

---

## 2. Program/hareket üretimi: dinamik mi sabit mi

**Sabit tablo.** `ProgramGenerator.generate` (`backend/.../training/ProgramGenerator.java:29`) girdi olarak yalnız hafta günleri kümesinin BOYUTUNU kullanır: `templates.forDays(n)` → `data/programs/<n>-days.yaml`. Deneyim, ekipman, hedef, cinsiyet, kısıt üretime girmez (istek gövdesi zaten yalnız `trainingDays`). Hareket başına tekrar aralığı türü (bileşik 6-10, izolasyon 8-12) ve RIR parametreden gelir; setler şablondan.
- Şablonlar: 1 full_body; 2 full_body A/B; 3 upper/lower/full_body; 4 upper-lower ×2; 5 upper/lower/push/pull/legs; 6 PPL ×2. Dosya başlıklarında "DRAFT until the product owner approves it" yazıyor (içerik ürün onayı bekliyor görünüyor).
- Kişiselleştiren tek şey: başlangıç ağırlıkları (deneyimliye), salon yuvarlaması ve takas listesinin salon filtresi (aşağıda). Katalog 40 hareket (`data/exercises/`).
- "Dinamik" olan: ilk hafta kararı gün ekler (ADD_TRAINING_DAY), program incelemesi öneri üretir, kullanıcı Edit ile her şeyi değiştirebilir, Change/Swap hafta içi değiştirir.

### Bugün 7. gün eklenirse
- Edit › Days › "Add a day" 7'ye kadar izin verir (`P.programDaysMax = 7`, `ProgramEditor.tsx:116`, `PATCH maxItems 7`). Eklenen gün **boş "Day 7"**: hareket yok, hafta günü yok; kaydet düğmesi hareket eklenene kadar kapalı (`programEditOf` null döner, `programEdit.ts:208`). Yaklaşık 10+ dokunuş (Edit, Days, Add a day, gün seç, Add a move ×3+, Save). Uyarı/not yok.
- `POST /v1/program/generate` 7 günle: `templates.forDays(7)` boş → `require` düşer → 400 VALIDATION_FAILED (`ProgramController.java:285`); sözleşme zaten `maxItems 6`. `POST /v1/program/days` 409 (2 gün şartı).
- Kaydedince **program incelemesi hemen şunu önerir**: `too_many_days` ("Train 5 days a week, not 7. Coaching rule: 5 training days a week is the most that pays off. Your lightest day's moves go to the other days"). Kaynak: `training_days_max = 5` (`data/parameters/training.yaml:75`), `ProgramReview.tooManyDays` (`engine/ProgramReview.java:244-300`). Bu, ADR-090 #3 ("uyarıyla serbest, kısa not: bir dinlenme günü gelişimi hızlandırır") ile çelişir: kullanıcıya "7 gün fazla, 5'e indir" öneri kartı çıkar ve Apply günleri birleştirir (training_days_min 3'ün altına inmez).
- Cardio: 7 gün olunca off-day dolgusu yok (kod güvenli: `CardioPrescription.java:104-110`).
- Motor sayacı jenerik (n seans/hafta), 7'yi kesmiyor.

### 7 gün için değişmesi gerekenler
1. Sözleşme `ProgramRequest.trainingDays maxItems 7` + `onboarding.json max_training_days 7` + `parameters.test.ts` eşitliği + `default-days.test.ts`/`onboarding-draft.test.ts:95` (ADR-090 zaten `max_training_days 7` diyor; sözleşme değişikliği kendi commit'inde, `contracts/CLAUDE.md`).
2. `data/programs/7-days.yaml` (regex `([1-9])-days` kabul eder, `ProgramTemplates.java:29`; `ProgramTemplateTests` haftalık set tavanı 15, seans başı ≤5, sıklık ≥2 şartlarını doğrular). Yedi gün için bu tavanlarda ya çok hafif günler ya da aktif toparlanma/cardio günü gerekir: koçluk içeriği, Levent/Güray kararı. Gün anahtarları için `data/copy/en.json › programDays.*` ve split adı.
3. Review: `too_many_days` 7'de ADR-090 ile çelişir. Ya `training_days_max` 7'ye çekilir ya da kullanıcının kendi seçtiği gün sayısında öneri susar; bunun yerine tek satır not ("Rest day...") gösterilir. Karar/ADR notu gerekir (U2: ısrar değil veri).
4. Akış: "7. gün ekle" tek dokunuş olmalı: ya `POST /v1/program/days`'in `add_day_from_days` şartı genelleştirilir (şu an yalnız 2→3; parametre notu "N+1 günlük şablon bulunmalı" der, yani 7. gün için 7 günlük şablon şart) ya da Train'de görünür bir "Add a day" girişi gelir. Şu an Train'de bu giriş yok; yalnız sağ üstte "Edit".
5. Onboarding/Build kutuları: `default_day_sets` yalnız 2-5; 6/7 sunulmuyor. Kutu satırı genişlerse `DayTiles` düzeni (4 kutu) taşar.
6. Kopya: `train.head` "{split} · {days}" çoğul sorunsuz; This week şeridinde 7 günün hepsi planlı olur, dinlenme günü yok: kısa notun yeri orası.
7. Testler: `ProgramReviewTests/Properties`, `ProgramTemplateTests`, `ProgramEditApiTests`, `ParameterDocuments` sırası (`training_days_min ≤ ideal_min`).

---

## 3. "Change" dizisi (today-change.tsx)

Giriş: Today kartı (`today/TodayCard.tsx:142`) ve Train kartı (`train/TodayCard.tsx:127`) → `/today-change?day=<programDayId>`. Sunucu belirleyici; telefon yalnız neden olamadığını söyler (`train/changes.ts`).

| Satır | Ne yapar | Nereye gider |
|---|---|---|
| Short on time (SHORT) / Full workout (FULL) | Bugünün oturumu programdaki ilk `short_session_moves` (3) hareket; FULL geri alır | `POST /v1/program/today` (sunucu, `session_change`, yalnız bu hafta) |
| Gym is busy | `router.replace('/swap?day&scope=today')`: önce "Which one is taken?" (günün hareketleri), sonra seçenekler, tek dokunuşla BUGÜNE takas | `POST /v1/program/swap` scope TODAY (sunucu) |
| Move it | Yarına taşır, gerekirse haftayı kaydırır, Pazar'ı geçmez; önizleme `movePreview` ile satırda yazılır | `POST /v1/program/today` MOVE |
| Skip today | Telafi yok; kontrol günü okur | `POST /v1/program/today` SKIP |
| Undo | Bugünün taşı/atla işlemini geri alır (`undoable`) | `POST /v1/program/today` UNDO |

Hepsi sunucu tarafı, yerel durum yok. Antrenman başlamışsa yalnız Short/Full kalır (Move/Skip/Busy gizlenir: `today-change.tsx:134-146`).
Dokunuş: Karttan "Gym is busy" = Change (1) → Gym is busy (2) → hangi hareket (3) → alternatif (4) = 4 dokunuş.
Eksik: Short/Full dışındaki üç satır antrenman BAŞLAYINCA kapanıyor; takasın yerini workout içi takas alıyor (madde 4).

---

## 4. Antrenman sırasında "bu alet dolu → anlık alternatif"

**Var, ama "dolu" çerçevesiyle değil, genel "Swap" olarak.** `app/workout.tsx:1073-1075` her hareketin başlığında `Swap` düğmesi (How to · History · Swap · More) → `SwapSheet` (`train/SwapSheet.tsx`) → seçenek → bitti. Hareket ekranındayken **2 dokunuş** (Swap, seçenek); dolu aletin hareketine geçmek için ek gezinme gerekir (UpNext/MoveDots). Geri alma: üstte Undo çubuğu ve "Back to the planned move" seçeneği (`sessionSwaps.ts` `swapChoices`).
- Takas yalnız telefonda: sunucuya GİTMEZ (sunucu başlamış günün bugün-takasını 409'lar, `swap.conflict` metni), `train.swaps` anahtarıyla oturumla saklanır (`sessionSwaps.ts:1-9`). Bitişte silinir; kayıtlı setler yeni hareketin id'siyle gider, motor oradan öğrenir. Yeni hareketin hedefi yok; sunucu `swapTables` ile son en iyi set ve ±yük verir (`SwapOptionTables`).
- Seçenekler `PlannedExercise.swapOptions` (sunucu `SwapOptions.of`, `SwapOptions.java:19-30`): kataloğun `alternatives` sırası, sonra aynı ilk kas + aynı tür, id'ye göre alfabetik; günde olanlar çıkar.

### Ekipman duyarlı mı? Zayıf.
- Salon filtresi yalnız **barbell**'i eler (barKg boşsa); makine/kablo/dambıl/plaka "eksik girilmemiş olabilir" diye elenmez (`SwapOptions.java:36-39`). Ayrıca Gyms kaldırılırsa (madde 12) bu filtre tamamen ölür.
- "Dolu" bilgisi hiç yok. Somut örnek, `lat_pulldown` dolu: `data/exercises/lat_pulldown.yaml` alternatifleri `[pull_up, close_grip_lat_pulldown]`; aynı ilk kas (lats) + bileşik olanlar yine yalnız bu ikisi. Yani liste = pull_up ve close_grip_lat_pulldown. İkincisi AYNI kablo istasyonu (equipment: cable, aynı lat pulldown makinesi), dolu aleti çözmez. `seated_row`, `chest_supported_row`, `one_arm_dumbbell_row` (lat ağırlıklı çekiş) çıkmaz, çünkü onların ilk kası `upper_back`.
- Sıralama hareket benzerliğine/ekipmana göre değil; kataloğun elle yazılmış alternatif listesi ve alfabe.

### "Lat pulldown dolu → alternatif şimdi" için eksikler
1. Katalogda hareket başına **istasyon/ekipman sınıfı ve "aynı alet" bilgisi**: aynı alete bağlı alternatifler (close grip) "dolu" modunda elenmeli.
2. Takas çerçevesi: `Swap` yerine "Taken?" girişi; yanında "Do it later" (sıraya sona al). Şu an hareket sırası değiştirilemiyor (workout.tsx içinde yeniden sıralama yok; `later` yalnız cardio ve bitiş için).
3. Alternatif sayısı/sıralaması: ikincil kas ve çekiş açısı (dikey çekiş → yatay çekiş) ile genişletilmiş aday seti; farklı ekipmanı öne al.
4. Zaten hareket ekranındaysa 2 dokunuş yeterli; ana eksik, listenin içeriği ve "dolu" duyarlılığı.

---

## 5. Sahte / ölü / statik

- **İçe aktarma ("Bring in workouts", `app/import.tsx`) sahte DEĞİL.** Gerçek CSV okuyucu (Strong/Hevy "doğrulanmış biçimler", `import/formats.ts`), eşleştirme, `POST /v1/workout-imports` (`WorkoutImportController`), dosya seçici `File.pickFileAsync()` (`services/ServicesProvider.tsx:130`, expo-file-system 57.0.7 tipleriyle uyumlu), testler (`import-*.test.ts*`). Cihazda çalışmadığı bildirildi; kodda şu zayıf noktalar:
  - Rıza çıkmazı: HEALTH_DATA rızası yoksa ekran yalnız "You can give it in Settings" yazar, rıza düğmesi yok (`import.tsx` `stage.kind === 'consent'`).
  - Yalnızca iki dosya biçimi ve doğrulanmış başlıklar; başka başlık "unknown" (`formats.ts`).
  - `pickFileAsync()` mimeTypes olmadan çağrılıyor; gerçek bir `.csv` ile cihazda sınanmadı.
  - Aktarılan geçmiş motoru etkilemiyor (`TrainingLog` dışarıda bırakır) ve "Strong, Hevy" dışında kaynak yok; ürün vaadiyle uyumlu olup olmadığı karar işi.
- **Hatırlatma (Train ile ilgili)**: `settings.reminders.kinds` "Training day, check-in morning, a note after a quiet week" diyor, ama antrenman hatırlatması yalnız `schedule.usualTrainingTime` doluysa kurulur (`notifications/plan.ts:121`). Bu alanı onboarding artık hiç göndermiyor (ADR-072 #4; `onboarding/draft.ts:197-208`), uygulamada yazan başka yer yok (`grep usualTrainingTime` yalnız plan.ts). Yani yeni kullanıcı için antrenman hatırlatması ve ADR-089 Ek 2'nin tartı satırı HİÇ kurulmuyor. Test yeşil çünkü testler `usualTrainingTime: '18:00'` ile kuruyor.
- **Hareket klipleri**: 40/40 hareket `review: pending`; `app/exercise.tsx` klip yerine hiçbir şey göstermiyor (kasıtlı: "no stand-in footage"). Ekran var ama içerik yok.
- **Şablon içerikleri** "DRAFT until the product owner approves" başlıklı; onay kaydı bu denetimde doğrulanmadı.
- **Ölü parametre**: `max_training_days` (uygulamada kullanılmıyor), `onboarding.json` ile sözleşme eşitliği testle tutuluyor.
- **Settings › Gyms** (`gyms.tsx`, `gym.tsx`): gerçek ama form doldurtuyor (madde 12 kaldırılacak). Gym verisi şu işleri besliyor: yük yuvarlama (`NextTargets`, `SessionTable`), başlangıç ağırlığı, takas barbell filtresi. Kaldırılırsa bunlar varsayılana düşer; bu bağımlılık planda yazılmalı.

---

## Boşluk sıralaması

### P0 (bozuk / sahte vaat)
1. **Antrenman hatırlatması hiç kurulmuyor** yeni kullanıcı için (`usualTrainingTime` gönderilmiyor; plan.ts:121). Ayarlar bunu vaat ediyor; ayrıca profil günlerini kullandığı için programdan bayat.
2. **7. gün akışı yok ve ADR-090 #3 ile çelişen öneri kartı**: Edit'te boş gün, hareketleri elle; kaydedince `too_many_days` ("5 is the most that pays off") öneri/Apply. Üretim (`generate`) ve sözleşme 7'yi reddediyor.
3. **"Rebuild for me" bayat profil günleriyle çalışıyor**: kullanıcının Edit ile ayarladığı günleri sessizce eski sayıya çevirir ve bütün hedefleri/değişiklikleri siler (onay ekranı var, ama sayı yanlış).

### P1 (ayrışık / yayılmıyor / çok dokunuş)
4. İki doğruluk kaynağı: profil `schedule.trainingDays` (donuk) vs program günleri (canlı). Profili yazan yol yok; Build (B) de yazmıyor.
5. Gün sayısını değiştirmenin beş farklı yolu ve üç farklı semantiği (yeniden üret / boş gün / 2→3 otomatik); Train'de görünür "add a day" yok.
6. Boş gün ekleme: ~10+ dokunuş; gün içeriğini üreten tek yol `POST /v1/program/days` yalnız 2→3.
7. Onboarding/Build yalnız 2-5 sunar; 1 ve 6 şablonları ölü; hafta günleri seçtirilmez; `max_training_days` ölü parametre.
8. "Lat pulldown dolu": takas seçenekleri yalnız `pull_up` + aynı istasyondaki `close_grip_lat_pulldown`; ekipman filtresi yalnız barbell; "dolu" çerçevesi ve "sona al" yok. Karttan Change › Gym is busy 4 dokunuş; antrenmanda dolu hareketten bunu yapmak ek gezinme ister.
9. Takas yalnız telefonda ve oturumla silinir: sunucunun haftası/Train kartı bu takası görmez (kasıtlı, ama "dolu" bilgisi motora/öneri akışına gitmez; madde 17-20 altyapısı için kayıp sinyal).
10. İçe aktarma: rıza çıkmazı (düğme yok), tek tip CSV, cihaz kanıtı yok.
11. Gyms kalkarsa takas/yuvarlama bağımlılığı belirsiz.

### P2 (cila)
12. Hareket klipleri yok (40/40 pending); 13. şablon DRAFT onayı; 14. `swap.why` metni "your gym has these" iddiası salon verisi yokken da gösteriliyor; 15. This week şeridinde 7 gün planlıyken dinlenme notu yok; 16. `train.head` bölünme adı karma programlarda (kullanıcı düzenledikten sonra) bölünme adını türetme kuralı doğrulanmadı.
