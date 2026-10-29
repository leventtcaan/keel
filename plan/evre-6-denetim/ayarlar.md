# Evre 6 denetimi: Ayarlar (maddeler 4, 12, 13, 14, 16, 17)

Kapsam: salt okuma. Kod okundu (apps/mobile/src, backend/, contracts/openapi.yaml, data/copy/en.json); simülatör ve cihaz
çalıştırılmadı, bu yüzden "çalışıyor" hükmü yerine "kodda uçtan uca bağlı / cihazda doğrulanmadı" ayrımı yapıldı.
Yollar `apps/mobile/src/` altındadır (aksi belirtilmedikçe). Kelime sayıları data/copy/en.json'dan, `\S+` ile sayıldı.

## 0. Kısa hüküm

- Ayarlarda **sahte (mock) hiçbir şey yok**: `mock|todo|placeholder|demo|fake|stub` taraması settings/, gym*, import*, import/ içinde boş.
  Her satır ya gerçek uca (profile, gyms, consents, subscription, account) ya telefondaki kv-store'a bağlı.
- Asıl sorun "statik" değil **bağlantısızlık**: antrenman günleri iki ayrı yerde tutuluyor ve birbirini dinlemiyor (P0, bölüm 3.1).
- Gyms: bağlı ve gerçek ama etkisi küçük, doldurması ağır; kaldırılabilir, varsayılan zaten var (bölüm 2).
- "Foods you avoid": **okunuyor**, ama yalnız iki yerde (`/v1/foods/recent`, günün önerileri). Arama, barkod, tarif, koç, üretici okumuyor (bölüm 4).
- İçe aktarma: sunucu tarafı gerçek ve testli; telefon tarafında kodda kusur bulunmadı. "Çalışmıyor" hissinin olası nedenleri bölüm 5'te.

## 1. Settings ana sayfası ve alt sayfalar: satır satır tablo

Sıra `app/settings.tsx:34-45`. Kısaltmalar: P0 çalışmıyor/mock · P1 çalışıyor ama ağır, form, düz yazı ya da etkilemesi gerekene bağlı değil · P2 cila.

### 1.1 Ana sayfa

| Kullanıcının gördüğü | Ne yapıyor | Hangi uç/depo | Uçtan uca bağlı mı | Statik/mock | Düz yazı (kelime) | Hüküm |
|---|---|---|---|---|---|---|
| Appearance: Light/Dark/System (`AppearanceSection.tsx:20-30`) | Tema seçer | Yalnız telefon kv (`appearance.set`) | Evet: `useAppearance` ile tüm uygulama anında döner (`ServicesProvider.tsx:195`). Sunucuya gitmez, cihazlar arası senkron yok (bilinçli) | Hayır | 0 | keep |
| Units: Metric/Imperial + "Your history stays as logged." (`UnitsSection.tsx:24-35`) | Birim sistemini seçer | `GET`+`PUT /v1/profile` (`units/preference.ts:75-84`), kv kopyası | Evet: sunucu profili gerçeğin kaynağı; `useUnits` 32 ekranda abone (`useSyncExternalStore`), değişiklik anında yayılır. Tam profil PUT'u (`...data`) yapılır: eşzamanlı başka düzenleme varsa üzerine yazma riski küçük | Hayır | 5 | keep |
| Training › Training days (`TrainingGroup.tsx:39`) | Edit program › days sayfasını açar; değer = programın hafta günleri | `GET /v1/program` (focus'ta okunur) | Satır doğru; **ama gün değişimi hatırlatmalara ve "Rebuild"e ulaşmıyor** (bölüm 3.1) | Hayır | 0 | fix (bağla) |
| Training › Cardio (`:40`) | Edit program › cardio | `GET /v1/program` | Evet (programın cardio planı sunucunun) | Hayır | 0 | keep |
| Training › Gyms, değer = kullanılan salon ya da "None yet" (`:41`) | `/gyms` | `GET /v1/gyms` | Bağlı (bölüm 2) ama etkisi dar | Hayır | 0 | cut (Levent #12) |
| Training › Import workouts · "Strong, Hevy" (`:42`) | `/import` | `POST /v1/workout-imports` | Sunucu gerçek; bölüm 5 | Hayır | 0 | fix ya da cut (karar Levent'in) |
| Food › Foods you avoid, değer = liste ya da "None"/kilitli (`FoodGroup.tsx:31-57`) | `settings-detail?part=food` | `GET /v1/profile` (yalnız sağlık rızası varken) | Kısmen: bölüm 4 | Hayır | 0 (değer: virgülle birleşik liste, uzayabilir) | fix/shorten |
| Reminders: tek anahtar + alt satırda 10 kelime ("Training day, check-in morning, a note after a quiet week.") (`RemindersSection.tsx:83-95`) | Yerel bildirimleri açar/kapatır; iOS iznini ister | Yalnız telefon: kv + yerel bildirim (`notifications/reminders.ts`); sunucuya hiçbir şey gitmez | Evet, ama zamanlama **profildeki** `schedule`'a bakar; bölüm 3.1/3.3 | Hayır | 10 (blocked 9, noCalls 15, onlyCheckIn 8) | keep, footer kısalt |
| Reminders › Your routine, değer = kullanıcının cümlesi (`:96`) | Alt sayfa: rutin cümlesi | kv `reminders.cue` | Evet: `setCue` → yeniden planlar, antrenman bildiriminin gövdesi olur (`plan.ts:124`) | Hayır | bölüm 1.2 | shorten |
| Health and data › Health data consent (+ durum kelimesi) (`HealthGroup.tsx:49-54`) | Rıza sayfası | `GET /v1/consents`, `PUT` | Evet (silme, sunucu + telefonda gerçekten siler: `withdrawHealthData`) | Hayır | 0 | keep |
| Health and data › Apple Health (durum) (`:55-60`) | Okuma rızası sayfası | consents + HealthKit | Evet; HealthKit yoksa (Expo Go) "unavailable" | Hayır | 0 | keep |
| Health and data › Add to Apple Health (`:61`) | Yazma anahtarları sayfası | kv + HealthKit | Evet: `weigh-in.tsx:130` ve `workout.tsx:482` gerçekten yazıyor | Hayır | 0 | keep |
| Health and data › "Bring in your history" (kilitliyse "Needs your OK for health data") (`:63-67`) | Apple Health eski tartılarını içe alır | HealthKit okuma → kuyruk → `/v1/weigh-ins` (source IMPORT) | Evet, ama motor bunu okumaz (ADR-053) | Hayır | 0 | shorten (adı Training satırıyla karışıyor) |
| Subscription: durum satırı, "Cancel or change plan" ya da "See plans", Restore, deneme hatırlatma teklifi (`SubscriptionSection.tsx`) | Sunucunun abonelik durumunu söyler; Apple sayfasını açar | `GET /v1/subscription`, RevenueCat `manage/restore` | Evet; focus'ta tekrar okunur | Hayır | 7-16 (durum) + 12 (manageNote, yalnız VoiceOver ipucu) + TrialReminderOffer ~10 | keep |
| Data sources › Food data · "USDA, Open Food Facts" (`DataSources.tsx:15-21`) | Lisans/atıf sayfası | Yok (kopya) | Lisans gereği (ODbL) | Statik yasal metin | bölüm 1.2 | keep |
| Account › Export my data / Sign out / Delete account (`AccountSection.tsx:63-67`) | JSON dışa aktarır; çıkış; hesap siler | `GET /v1/account/export`, `DELETE /v1/account` (`AccountController.java:45,53`) | Evet. Export önbelleğe yazıp paylaşır, sonra siler (`exportData.ts`). Çıkışta bekleyen kayıt/foto uyarısı. Silmede abonelik uyarısı | Hayır | uyarılar alert içinde (22 + 16 kelime) | keep |
| (yok) Gizlilik politikası / Kullanım koşulları bağlantıları | Ayarlar'da **yok**; yalnız sign-in (`sign-in.tsx:63-64`) ve paywall'da (`PaywallView.tsx:234`) | | Giriş yapmış kullanıcı sonradan bulamaz | | | **P1: ekle** (Data sources'ın yanına iki satır) |

### 1.2 Alt sayfalar (`app/settings-detail.tsx`, `settings/detail.ts`)

| Sayfa | Kullanıcı ne görür | Ne yapar / uç | Bağlı mı | Düz yazı | Hüküm |
|---|---|---|---|---|---|
| `food` (FoodEditor) | "Foods you don't or can't eat" alanı + ipucu "Separate them with commas." + Save/Cancel | `GET`+`PUT /v1/profile` (tam profil, `food.avoid` değişir) `FoodEditor.tsx:49-52` | Yazılır; okuyanlar bölüm 4. Serbest metin virgüllü form alanı: Levent'in "form doldurtma" kuralına ters | ~10 | fix: chip/öneri + kaydet-anında (bölüm 4) |
| `routine` (RoutineEditor) | **40 kelimelik** paragraf (`settings.reminders.what`) + alan + 13 kelimelik ipucu + Save | kv `reminders.cue` | Bağlı | **53** (>25, işaretli) | shorten: paragrafı üç kısa satıra/chip'e böl; ipucunu örnek yap |
| `consent` (HEALTH_DATA) | Durum, View/Hide, Turn on/Withdraw. View açılınca 4 madde: 48+51+37+50 = **186 kelime** (yasal metin, istek üzerine açılır). Withdraw onayı 41 kelime | consents API | Bağlı. Metin gerekli (V1/V2), ama görünür varsayılan değil; kabul | 186 (gizli) + 41 | keep (metin yasal); onay gövdesi kısalt |
| `apple` | Aynı bileşen, tek rıza; View'da 63 kelime | consents + HealthKit | Bağlı | 63 (gizli) | keep |
| `write` (Add to Apple Health) | Not 20 kelime, "Finished workouts" + ipucu 6, "Weigh-ins you type", Turn on/off düğmeleri, red uyarısı 13 | kv + HealthKit | Bağlı (yukarıda) | ~40 | shorten; düğme yerine anahtar (iOS alışkanlığı) |
| `import` (weigh-ins) | Not 21 kelime + "Weigh-ins from Apple Health" + ipucu 14 + Import düğmesi + sonuç satırı (16) | HealthKit → kuyruk | Bağlı; sağlık rızası yoksa kilitli satır, `granted===null` iken **boş sayfa** (`settings-detail.tsx:40-45`) | ~50 | shorten; boş durum düzelt (P2) |
| `sources` | İki ListGroup: USDA (CC0 notu 3 kelime) ve OFF (ODbL notu 14), bağlantılar | `Linking.openURL` | Lisans gereği | ~25 | keep |

### 1.3 Ayrı rotalar

| Rota | Görünen | Ne yapar | Uç | Bağlı mı | Düz yazı | Hüküm |
|---|---|---|---|---|---|---|
| `/gyms` (`gyms.tsx`) | Başlık, **19 kelimelik** not ("Your next weights are rounded to what the gym you use can make; warm-ups and plates follow it too."), salon kartları ("In use"), "Add a gym" | Listeler/ekler | `GET /v1/gyms` | Bağlı (bölüm 2) | 19 | cut |
| `/gym` (`gym.tsx`) | Ad, "Use this gym" çipi, kg/lb çipi, Bar, Plates (boşlukla ayrık metin), Dumbbells (boşlukla ayrık metin), rack üçlüsü + "Fill the rack", stack step, **16 makine alanı** (kataloğun 8 MACHINE + 8 CABLE hareketi, `data/exercises`) , Save, Delete | Tüm salonu bir kerede `PUT /v1/gyms/{id}` | `PUT/DELETE /v1/gyms/{id}` | Bağlı | alan etiketi ~60, hata metni 19 | cut |
| `/import` (`import.tsx`) | Aşamalar: consent / start (12 + **30** kelime) / unknown (24) / map (unit sorusu 18, dumbbell sorusu 11, her hareket için eşleme) / done (25 + 16 + 21) | CSV okur, hareket eşler, `POST /v1/workout-imports` | `send.ts:25` | Bağlı; bölüm 5 | start 42, done ~60, unknown 24 | fix/shorten ya da cut |

## 2. Gyms: neyi besliyor, kaldırılırsa ne bozulur

Gyms yalnız **yük yuvarlama + plaka/ısınma gösterimi + (çok dar) takas filtresi** besler. Program üretici ve onboarding salona bakmaz.

Sunucu okuyucuları (hepsi `gyms.current(account)`, yani "kullanılan salon"):
- Sonraki seans hedefi: `training/SessionProgress.java:111,131-133` → `LoadSteps.round(...)`, `NextTargets.java:49-70`. Salon yoksa `Rounding.Unknown` döner ve **motorun yükü olduğu gibi** kalır (`NextTargets.java:44`, `SessionProgress.java:133` `.orElse(new Unknown())`).
- Başlangıç ağırlıkları ve gün ekleme: `ProgramController.java:361,377,496` (kullanılan salonun yükleriyle yuvarlar; salon yoksa girilen yük aynen).
- Takas listesi: `training/SwapOptions.java:28,39-41`. Tek etkisi: salonda **bar yoksa** barbell hareketleri çıkar. Makine/kablo/dumbbell için "yok" diyemez (kod yorumu `:34-38`). Yani "ekipmana duyarlı takas" fiilen tek bir koşul.
- Takas doğrulaması: `TodaySessions.java:124,132` aynı fonksiyonu kullanır.

Telefon okuyucuları: `train/trainData.ts:124` (`GET /v1/gyms`, her `training.read`'de), `train/warmup.ts:5-7,24-30`, `train/session.ts:53-57,62-95,160-164`, `train/loadSteps.ts` (sunucunun aynası).

Kaldırılırsa ne olur, varsayılan ne:
- Yük yuvarlama: motorun parametre adımı (`load_increment_upper/lower_kg`, `engine/Progression.java:54-57`), kullanıcının birimiyle. Mevcut mantık zaten "salon yoksa bu" yolundan çalışıyor (varsayılan yol canlı).
- Isınma: `warmup.ts:5-6`: "salon yokken parametrenin adımı, kullanıcının biriminde". Plaka satırı: `session.ts:161-162` salon yoksa `null`, satır hiç görünmez. Başlangıç çubuğu: 20 kg / 45 lb (`session.ts:56-57,64`).
- Takas: bar filtresi kalkar, tüm barbell alternatifleri her zaman görünür (bugün de salon yoksa böyle; `SwapOptions.java:28` `.orElse(true)`).
- Kullanıcı hiçbir şey doldurmadığı sürece (ki yeni kullanıcıda salon yok, `settings.training.noGym` "None yet") **bugünkü davranış zaten varsayılan**. Yani kaldırmak çoğu kullanıcı için davranış değiştirmez.
- Kırılacak/temizlenecek: `app/gyms.tsx`, `app/gym.tsx`, `_layout.tsx:63-64`, `TrainingGroup.tsx:36,41` + `GET /v1/gyms` okuması, `train/gymForm.ts` (+ `gym-form.test.ts`, `gym-screens.test.tsx`), `trainData.ts` gym okuması, copy `gyms.*`/`gym.*`/`settings.gyms`/`settings.training.noGym`, `rackEnds` kopyası (`en.json:481`, yalnız salon rafı bitince doğar; salonsuz doğmaz), `swap.none` kopyasındaki "in your gym", sunucuda `GymController/GymStore/GymRules/GymLimits/LoadSteps` ve `training.gym` tabloları, sözleşme `/v1/gyms*` (ADR-032 değişir; K1: test silme Levent'e sorulur). İlk adım olarak yalnız arayüz girişini kaldırıp sunucuyu bırakmak güvenli ve geri alınabilir.
- Dikkat: hesap dışa aktarımı (`TrainingAccountData`) salonları içerir; sunucu kalırsa dokunma.
- İleride gerekirse "düğmeyle onaylatan" alternatif: salon yerine tek soru "Plate sizes: 1.25/2.5 kg or 2.5/5 lb?" (çip), ya da seansta ilk kez yük yazılırken öğren. Bu yeni iş, bu evrenin kapsamı değil.

Hüküm: **cut** (Levent #12 ile uyumlu). P1 (alan doldurtuyor, 16 makine alanı dahil, kimse doldurmaz).

## 3. Değişikliğin yayılması: hangi ayar neyi etkiliyor

### 3.1 Antrenman günleri: P0 (iki doğruluk kaynağı, birbirini dinlemiyor)

Kanıt:
- Onboarding günleri **profil** `schedule.trainingDays`'e yazar ve programı bununla üretir (`onboarding/prepare.ts:130`).
- Edit program günleri **program**'a yazar: `PATCH /v1/program` (`train/changes.ts:106`). `ProgramController` profil yazmaz (`ProgramController.java` yalnız `profiles.of(...)` okur; `grep` ile doğrulandı). Profil `PUT`'u uygulamada yalnız üç yerde: birim (`units/preference.ts:81`), yemek (`FoodEditor.tsx:51`), onboarding (`profileStatus.ts:92`).
- Sonuç 1, **hatırlatmalar eski günde çalar**: antrenman bildirimi `schedule.trainingDays` ile planlanır (`notifications/plan.ts:121-141`), `schedule` ise yalnız profil okununca güncellenir (`appServices.ts:215-217` `onProfile → keepSchedule`). Program günleri değişince profilde gün aynı kalır, bildirim yanlış günde (7. gün eklendiğinde hiç) çalar.
- Sonuç 2, **"Rebuild for me" kullanıcının eklediği günü siler**: `edit-program.tsx:257-263` yeniden üretimi `profile.value.schedule.trainingDays` ile yapar (onboarding'deki eski gün sayısı).
- Sonuç 3, **motor ve profil farklı günü okur**: karar/hazırlık programın günlerini önceler (`decision/DecisionService.java:318-319`, `PromptController.java:107`, `CardioWeek.trainingDays`), profil yalnız program yokken yedek. Yani gün sayısı "birçok yerden değişiyor" (Levent #2) şikâyetinin kök nedeni budur.
- Çözüm yönü (denetim, uygulama değil): tek kaynak program olsun; `PATCH /v1/program`, `/program/generate`, `/program/days` sonrası sunucu profil `schedule.trainingDays`'i senkron tutsun ya da telefon `keepSchedule`'u program okununca programın günleriyle çağırsın (`training` cache'inin `onProgram` kancası zaten `keepRestUntil` için var: `appServices.ts:222`) ve Rebuild programın güncel günlerini kullansın.

### 3.2 Diğer ayarlar

| Ayar | Yayılıyor mu | Sinyal |
|---|---|---|
| Birim | Evet, anında, her yerde | `useUnits` (`useSyncExternalStore`); sunucu profili PUT'ta `units`; çıkışta `forget` |
| Tema | Evet | `useAppearance`; yalnız cihaz |
| Rıza (sağlık verisi) | Evet | `useHealthConsent` (focus'ta okur) → Food satırı/ içe aktarma kilidi; `reminders.keepFirstCall` `noCalls` (check-in sabahı bekler); `ConsentsSection.onChanged` |
| Yemekte kaçınılanlar | Kısmen | Ayarlar'a dönünce `useReadOnFocus` ile yeniden okur; sunucuda öneri/son-yenenler okur (bölüm 4). `useSavedChanges` kullanılmıyor (sayfa kapanıp geri döner, gerek yok) |
| Rutin cümlesi | Evet | `setCue` → `reschedule` |
| Hatırlatma anahtarı | Evet | kv + yerel bildirim planı; AppState `active`'te izin yeniden okunur |
| Check-in günü | **Ayarlanamıyor**: yalnız onboarding'de; Ayarlar'da, başka yerde değiştirme yok (`checkInDay` yalnız okunuyor, grep) | – |
| Antrenman saati (`usualTrainingTime`) | **Ayarlanamıyor**; hatırlatma buna bağlı (`plan.ts:121`) | – |
| Hedef (LOSE_FAT/BUILD_MUSCLE), boy, doğum yılı, aktivite | **Ayarlanamıyor** (Ayarlar'da satırı yok, `PUT /v1/profile` yalnız birim ve yemek) | – |
| Salon | Salon değişince bir sonraki okumada sunucu yuvarlaması değişir; telefon `training.read` ile alır | okuma-sonrası |
| Gün/kardiyo/hareket düzenlemesi | Program sunucuda; `Settings` `useReadOnFocus` ile geri dönünce okur; hatırlatmalara **ulaşmaz** (3.1) | – |

`useSavedChanges` (`saved/saved.tsx:81`) yalnız sekmelerin `afterSaves` seçeneğinde kullanılır (`today/useReadOnFocus.ts`); Ayarlar kendi okumalarını focus'ta yeniler, bu yeterli çünkü her alt sayfa kapanıp Ayarlar'a döner.

### 3.3 Hatırlatma türleri (üç + deneme)

- Üç tür kodda gerçek: training (rutin cümlesiyle), check-in sabahı, sessiz hafta notu (`plan.ts:1-12,113-175`). Yalnız yerel; sunucuya veri gitmez.
- Deneme hatırlatması **ayrı sistem**: `subscription/trialReminder.ts`, kendi kimliği `trial`, `TrialReminderOffer` Abonelik grubunun içinde (`SubscriptionSection.tsx:109`), yani Reminders grubunda değil. Kullanıcı "hatırlatmalar nerede?" diye bakınca iki yer var. Çalışıyor (gate her okumada `keep` çağırır: `appServices.ts:229`).
- ADR-090 #2'nin dördüncü türü (öğün kaydı hatırlatması) kodda **yok** (`ReminderKind` = `training|check_in|quiet`, `plan.ts:19`). Madde 10 işi; Ayarlar'da anahtar/saat seçimi gerekecek.
- Anahtar "Reminders" üç türü tek seferde açıyor, tür bazlı seçim yok; tasarım kararı (üç tür, "never more"), keep.

## 4. "Foods you avoid"

- Nerede saklı: sunucu profili `profile.food_avoid text[]` (`db/migration/V4__profile_profiles.sql:21`), `Profile.food.avoid` (sözleşme `FoodPreferences`), sağlık rızası olmadan tutulmaz (`ProfileController.java:90,131`; rıza çekilince silinir `ProfileAccountData.java:43`).
- Kim okuyor (kanıtlı, hepsi aynı çağrı `Profiles.foodsAvoided`, `Profiles.java:31`):
  1. `GET /v1/foods/recent` (tek dokunuşla "Recent"): `MealController.java:160` → `MealSuggestions.recent` içinde eşleşen yemekler elenir (`MealSuggestions.java:47-50`).
  2. `GET /v1/days/{day}/suggestions` (günün kalanına uyan, genelde yediği yemekler): `MealController.java:139` → `MealSuggestions.usual` (`:85-88`).
  Eşleşme: büyük/küçük harf duyarsız alt-dize, tarifin malzemeleri de (`MealSuggestions.java:96-100`, `MealController.java:174`).
- Kim **okumuyor**: yemek arama `POST /v1/foods/search` (`FoodController.java:73`), barkod `:82`, tarifler, öğün taslağı (`coach/MealDraft.java`), koç, program üretici (yemekle ilgisi yok), `FoodEstimator` (profili yalnız cinsiyet için okur). Mobil tarafta `avoid` yalnız Ayarlar ve onboarding (`FoodEditor`, `FoodGroup`, `onboarding/foods.tsx`) içinde; yemek ekranlarında okuma yok.
- Dürüst özet: ayar **gerçek ama dar**: yalnız "daha önce yediğin" önerilerinden eleme yapıyor. Kullanıcı aramada "peanut" yazınca yine fıstık çıkar; yani "alerjim var" diyen kullanıcıya verilen söz (satır adı "Foods you avoid") aramada tutulmuyor. Madde 6/20 (arama sıralaması) yapılırken aramada gizleme/işaretleme eklenmeli, yoksa ya ayar etiketi daraltılmalı ("Hide from my suggestions") ya da bağlanmalı.
- Kullanım güçlüğü (P1): serbest metin, virgülle ayrılmış tek alan (`FoodEditor.tsx:70`); önerilen çipler/yaygın alerjenler yok; kaydet düğmeli ayrı sayfa. Kaydedince tam profili PUT eder (`:49-52`; başka bir cihazın aynı anda yaptığı düzenlemenin üzerine yazabilir, küçük risk). Alerjen çipleri (süt, gluten, fıstık, yumurta, deniz ürünü, soya...) + "başka ekle" ile tek dokunuşluk yapılabilir.
- Boş durumda sağlık rızası yoksa satır kilitli "Needs your OK for health data": anlaşılır ama alerji gibi güvenlik bilgisini rıza arkasına koymak (K-225 kararı) kullanıcıyı Ayarlar'da dönüp dolaştırır; kararın kendisi ürün/sağlık kararı, Levent'in.

## 5. İçe aktarma ("Bring in workouts")

Ne içe alıyor:
- **Antrenman**: Strong ya da Hevy **CSV** dışa aktarımı (`import/formats.ts:23-30`: Strong başlığı 12 sütun, Hevy kg/lb başlıkları; başka başlık "unknown", tahmin yok). Not, RPE, mesafe, süre dosyada kalır. Dosya telefonda okunur (`File.pickFileAsync()`, `ServicesProvider.tsx:130-135`), yalnız eşlenen setler gider.
- **Apple Health kilo geçmişi** ayrı satır ("Bring in your history", `ImportSection.tsx`), HealthKit'ten bir yıl geriye (`health/weightSync.ts`).
- Ayrıca onboarding'de "Bring my own" akışı aynı CSV okuyucuyu program taslağı için kullanır (`onboarding/program-import.tsx`); Ayarlar'ın dışında, bu denetimin kapsamı değil.

Sunucu gerçek mi: **evet**. `POST /v1/workout-imports` (`WorkoutImportController.java`): sağlık rızası şart (`:63`), all-or-nothing transaction, clientId ile tekrar gönderimde `alreadyThere`, set/kütle sınırları, `importedFrom` işareti, motor okumaz. Test: `WorkoutImportApiTests`, `ImportLimitsMirrorTests`. Telefon: `send.ts` parça parça gönderir. Sahte yok.

Neden "çalışmıyor" hissi verebilir (kod okumasıyla, cihazda denenmedi):
1. **Sağlık verisi rızası şart**; Training'deki satır rıza olmayana da açık görünür, tıklayınca yalnız "Give it in Settings" yazısı çıkar (`import.tsx:127`, `import.needsConsent`). Rıza vermemiş kullanıcı için ölü uç.
2. **Hareket kataloğu 40 hareket** (`data/exercises`, 40 dosya). Strong/Hevy kullanıcısının hareket adlarının çoğu eşleşmez, her biri için elle "Pick / Other / Leave out / My own move" seçmek gerekir (`MoveRow.tsx`). Çok adım, çok kelime, sonunda geçmişin çoğu "Not brought in".
3. Dosya biçimi katı: yalnız İngilizce arayüzden, düzenlenmemiş CSV (`import.unknown`, 24 kelime). Strong birimi dosyada yok, kullanıcıya soruluyor; dumbbell sayımı da soruluyor (iki ek soru).
4. `moves` yüklenmeden "Choose a file" devre dışı (`import.tsx` `Start`: `disabled={moves !== 'ready'}`); `/v1/exercises` başarısızsa "Couldn't read the moves list".
5. **Değer düşük**: içe alınan seanslar geçmişte ve ilerleme listelerinde görünür, **hiçbir kararı/hedefi değiştirmez** (sözleşme `openapi.yaml:3800-3803`, `WorkoutImportController` Javadoc). Yani bir kullanıcının "içe aktardım, program beni tanısın" beklentisi karşılanmaz. `importedFrom` mobilde hiçbir yerde okunmuyor (grep), ayırt edici işaret yok.
6. Kodda net kusur görmedim. `File.pickFileAsync()` tip filtresi vermiyor (her dosya seçilebilir), iOS'ta güvenlik kapsamlı URL'yi `FileSystemFile` sarar; cihazda doğrulanmadı (`import-screen.test.tsx` sahte `importFile` kullanıyor, gerçek seçici hiç koşmamış). Gerçek bir Strong/Hevy CSV ile cihaz denemesi yapılmadan "çalışıyor" denemez.
7. Ölü kod: `ImportSection` içinde `workouts=true` varsayılanı ve `settings.import.workouts*` kopyaları artık kullanılmıyor (`settings-detail.tsx` `workouts={false}` geçiyor); ve "Bring in workouts" / "Import workouts" / "Bring in your history" üç farklı ad, iki farklı şey.

Hüküm: **P1** (çalışıyor ama zor/dar). Madde 4 "çalışır hâle getir ya da kaldır": hedef kitle (Strong/Hevy kullanıcısı) küçük, değer sınırlı (motoru beslemiyor), katalog 40 hareket. Kaldırmak ucuz ve güvenli (sunucu uçu kalabilir). Tutulacaksa: rıza yoksa satırı gizle/kilitle, eşlemeyi otomatik yap, ek soruları çipe indir, ve içe alınanın motoru beslemesi ürün kararına bağlanmalı (ADR-053'ü değiştirir, Levent'in).

## 6. Düz yazı envanteri (>25 kelime işaretli)

| Yer | Kelime | Not |
|---|---|---|
| `settings.reminders.what` (Routine sayfası) | **40** | kısalt: 3 kısa satır |
| `settings.withdrawConfirm.HEALTH_DATA.body` | **41** | yıkıcı onay, kısalt ama anlam kaybetme |
| `import.privacy` (Import ilk ekran) | **30** | + `intro` 12 = 42 |
| `import.skipped` (Import done) | **25** | sınırda; + rowsLeftOut 21, leftOut 16 |
| `consent.health_data.points.*` | 48/51/37/50 | yasal, View arkasında, tut |
| `consent.apple_health.body` | 63 | yasal, View arkasında |
| `import.unknown` | 24 | kısalt |
| `settings.delete.confirmBody` | 22 | alert içinde, kabul |
| `settings.import.note` | 21 | kısalt |
| `settings.healthWrite.note` | 20 | kısalt |
| `gyms.note` | 19 | salonla beraber gider |
| `gym.refused` | 19 | salonla beraber gider |

Ana Ayarlar sayfasında toplam akan metin ~30-40 kelime (kısa, tarama dostu). Düz yazı yığını alt sayfalarda: Routine (53), Import (42-60), Add to Apple Health (~40), Bring in your history (~50), Gyms/Gym (19 + 60 etiket).

## 7. Sorun listesi (öncelikli)

**P0**
1. Antrenman günleri iki yerde (profil `schedule.trainingDays` vs program günleri), senkron değil: hatırlatmalar eski günde çalar/7. günde hiç çalmaz, "Rebuild for me" eklenen günü siler (`plan.ts:121-141`, `appServices.ts:215-217`, `edit-program.tsx:257-263`, `ProgramController.java` profil yazmaz).

**P1**
2. Gyms: doldurtan, 16 makine alanlı form; etkisi yuvarlama + plaka satırı + tek bar filtresi; kullanıcı yoksa varsayılan zaten çalışıyor. Kaldır (Levent #12).
3. Import workouts: sunucu gerçek, ama rıza yoksa ölü uç, 40 hareketlik katalogla eşleme zahmetli, motoru beslemiyor, cihazda hiç denenmemiş; adları karışık (3 ad). Çalıştır ya da kaldır (Levent'in kararı).
4. "Foods you avoid": yalnız Recent/öneri filtresinde okunuyor; arama/barkod/tarif/koç okumuyor; serbest metin form alanı. Bağla (arama) ya da etiketi daralt; çip tabanlı yap.
5. Check-in günü, antrenman saati, hedef, boy, aktivite onboarding sonrası **hiçbir yerden değiştirilemiyor** (Levent #17 "ilk karar öyle kalmasın"). Hatırlatma saati/günü de buna bağlı.
6. Routine sayfası 53 kelime düz yazı (40'lık paragraf + 13'lük ipucu); Import ilk ekranı 42; Add to Apple Health ~40; Bring in your history ~50 (Levent #14).
7. Ayarlar'da Gizlilik Politikası / Kullanım Koşulları bağlantısı yok (yalnız sign-in ve paywall'da).
8. Hatırlatmalar iki yerde: Reminders grubu (3 tür) ve Abonelik içindeki deneme hatırlatması; dördüncü tür (öğün) henüz yok (madde 10 işi).
9. Add to Apple Health: anahtar yerine "Turn on / Turn off" düğmeleri (iOS alışkanlığı: Switch); Health data consent sayfası düğme-sıkışık (View/Turn on/Withdraw yan yana).

**P2**
10. `settings-detail` `import` bölümü rıza durumu henüz okunmamışken boş sayfa (`settings-detail.tsx:40-45`).
11. `ImportSection` `workouts=true` yolu ve `settings.import.workouts*` kopyası ölü kod.
12. Birim değişimi tam profili PUT eder (`units/preference.ts:81`); eşzamanlı düzenlemede ezme riski küçük (Food kaydı da aynı).
13. Ayarlar'da "Appearance" yalnız cihazda, hesapla senkron değil (bilinçli; belgelenmeli).
14. `FoodGroup` değeri tüm listeyi virgülle birleştirir; uzun listede satır taşar.
15. Retired rotalar (`coach`, `meal-photo`, `recipes` ... `navigation/tabs.ts:32`) kopyalarda hâlâ Ayarlar'a yönlendiriyor ("You can give it in Settings", `mealPhoto.consent`); AI rızasının Ayarlar'da satırı yok (`settings-screen.test.tsx:192` bilinçli), rota emekli olduğu için sorun değil, yeniden açılırsa ölü uç olur.

## 8. Doğrulama notları

- Hiçbir repo dosyası değiştirilmedi, simülatör açılmadı. Kod okumasıyla bulgular; "cihazda doğrulanmadı" denenler: içe aktarma dosya seçici, HealthKit satırları, bildirim planı.
- `Settings`'in `__tests__` kapsamı var (`settings-screen.test.tsx`, `settings-groups.test.tsx`, `gym-screens.test.tsx`, `import-screen.test.tsx`, `reminders-section.test.tsx`), ama bunlar sahte servislerle koşar; tek başlarına Levent'in "çoğu statik duruyor" şüphesini kapatmaz: gün senkronu (P0) testlerin dışında kalan bir kaynak-çatışması.
- Öneri sırası (Levent'in kararı): (1) gün tek kaynağı (P0), (2) Gyms kaldır, (3) import kararı, (4) Foods avoid çip + aramaya bağlama, (5) Routine/Import/Write metin kısaltma, (6) gizlilik/koşul satırları, (7) check-in günü ve antrenman saati için "değiştir" satırı.
