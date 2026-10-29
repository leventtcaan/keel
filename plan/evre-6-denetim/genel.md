# Evre 6 genel denetim (salt okuma, 29 Eki 2026)

Kapsam: `plan/evre-6-ortalamayi-yakala.md` madde 14-20. Repo: `/Users/leventcanceylan/Projects/keel-main`, uygulama `apps/mobile/src`, metin `data/copy/en.json`, sunucu `backend/src/main/java/app/keel`.
Yöntem: kaynak okuma + grep. Simülatör çalıştırılmadı, repoya hiçbir şey yazılmadı. "Doğrulandı" = kodda satır olarak görüldü; "doğrulanmadı" = cihazda denenmedi, koddan çıkarım.
Dayanak: `app/_layout.tsx:78` `<Stack.Protected guard={false}>` altındaki ekranlar (coach, meal-photo, recipes, recipe, why, scoff, projection, ledger, what-if, workout-summary) ve `app/onboarding/_layout.tsx` altındaki retired adımlar (foods, photos, expectations, apple-health) kullanıcıya ulaşmaz; aşağıda "ulaşılmaz" diye işaretlendi, mock/düz yazı sayımına girmedi.

---

## 1. Mock / yer tutucu / örnek içerik

| # | Bulgu | Kanıt | Kullanıcı release'te görür mü | Sınıf |
|---|---|---|---|---|
| 1.1 | **"The demo clips aren't filmed yet. They'll show the first rep and the last one…"** kartı. 40 katalog hareketinin 40'ı `review: pending`, sunucu `clips` göndermiyor, uygulamada zaten video bileşeni yok (grep `expo-video`/`Video`: yok). Yani her hareketin "How to" ekranında "yakında" vaadi var. | `app/exercise.tsx:110-117` (`clipsPending`), `data/copy/en.json:884` (`demo.clipsPending`), `data/exercises/*.yaml` hepsinde `review: pending`, `api/schema.ts:2225` "Absent until the clips passed the filming checklist" | Evet: antrenmanda "How to" (`app/workout.tsx:1060,1091`) -> `/exercise` | **P0** (Levent: "mock kalmasın"; coming-soon metni) |
| 1.2 | Paywall'da plan önizlemesi yoksa **sabit örnek çağrı** ("2,050 -> 1,800 kcal", "Leg press 180 x 7") "Example" etiketiyle çiziliyor. Etiketli ve bilinçli (U1: sayı kopya, hesap değil) ama kullanıcı mağaza görselinde gördüğünü, kendi verisi yerine sahte rakamla karşılıyor. | `subscription/ExampleCard.tsx`, `subscription/PaywallView.tsx:183` (`preview !== null && preview.firstCall !== null ? YourPlanCard : ExampleCard`), `en.json:2716-2740` | Yalnız önizleme boşsa (onboarding sonrası normalde dolu); `paywall`/`subscribe` ekranı | P2 (kenar durumda görünür) |
| 1.3 | Sign-in ekranı "Example calls" çipleri (Hold the weight, Add one rep...) ve "Every Monday your plan adjusts" sloganı. Slogan check-in günü Pazartesi olmayan kullanıcı için yanlış (gün seçilebiliyor). | `app/sign-in.tsx:72`, `onboarding/ExampleCalls.tsx`, `en.json` `welcome.lead` | Evet (giriş ekranı) | P2 |
| 1.4 | **`FirstWeeksCard` ölü kod:** ilk 8 haftanın mesajları (`first_weeks.week2..8`, `no_training.*`, `first_weeks.risk`; ~25 metin) hiçbir release ekranında çizilmiyor, yalnız test import ediyor. İçerik var, kullanıcı görmüyor. | `today/FirstWeeksCard.tsx:16`, `today/firstWeeks.ts`; import eden tek yer `__tests__/today-screen.test.tsx:21`; `app/(tabs)/index.tsx:23-26` yorumu "the first weeks' words ... are off this screen" | Hayır | P1 (rehber boşluğu, madde 6'ya bağlı) |
| 1.5 | Ulaşılmaz ama içinde "example data" yazan ekranlar: what-if ("runs the same rules on example data"), scoff/projection, coach, recipes. FakeLanguageModel sunucuda `keel.production`'da kapalı (`coach/LanguageModelConfiguration.java:22`). | `app/_layout.tsx:78-90` | Hayır | P2 (temizlik: sil ya da bırak; mock kalmasın ilkesine göre silinmesi daha temiz) |
| 1.6 | `widgets/lockScreen.ts`: widget "device step (K-308)" diye bekliyor, hiçbir yerden çağrılmıyor. | `widgets/lockScreen.ts:19` (çağıran yok) | Hayır | P2 |
| 1.7 | **"Bring in workouts"** (Strong/Hevy CSV): kod gerçek, mock değil, ama risk yüksek: yalnız tam eşleşen 3 başlık kabul ediliyor (`STRONG` 12 sütun, `HEVY_KG`, `HEVY_LB`), başka her şey "unknown". Başlıklar `arastirma/ham/H13` içindeki gerçek dışa aktarımlardan; bu oturumda gerçek dosyayla denenmedi. Dosya seçici `File.pickFileAsync()` tür filtresiz. Sağlık verisi onayı ister, onay yoksa seçim ekranına bile gitmez. Levent "çalışmıyor" dedi. | `import/formats.ts:25-27,89-94` (`same(header, ...)`), `services/ServicesProvider.tsx:130-134`, `app/import.tsx:60-` | Evet: Settings > Training > "Bring in workouts", onboarding `program-import` | **P0** (çalıştığı doğrulanmamış vaat; gerçek Strong/Hevy dosyasıyla uçtan uca sına) |
| 1.8 | Settings > Training'deki satır etiketleri ve diğer "device build" dipnotları (`settings.import.unavailable`, `settings.healthWrite.unavailable`, `settings.subscription.unavailable`) yalnız Expo Go'da çıkar, TestFlight'ta çıkmaz. | `settings/ImportSection.tsx:41-44` | Hayır (release'te `health.available` doğru) | -- |

Backend'de mock/stub: `FakeLanguageModel` dışında yok (`grep mock|stub|TODO` temiz). Uygulamada kaynakta `TODO|FIXME|lorem|dummy` yok; `placeholder` yalnız TextInput ipucu.

**"Foods you avoid" gerçekten bağlı mı (madde 13): çok az.** Sunucuda `Profiles.foodsAvoided` yalnız iki yerde okunuyor: `MealController.java:139` (usual suggestions) ve `:160` (recent foods). Arama (`FoodFinder`/`/v1/foods/search`), barkod, koç, program için kullanılmıyor. Filtre yalnız kullanıcının daha önce yediği öğelerden ad eşleşmesiyle eler (`MealSuggestions.avoids`, :97). Yani bir şeyi hiç yememiş kullanıcı için ayar fiilen hiçbir şey yapmıyor. Onboarding'deki adım da retired (`onboarding/flow.ts` RETIRED_STEPS). **P1.**

---

## 2. Düz yazı (prose)

Yöntem: `en.json` 2585 metin; ekran başına kullandığı anahtarlar (yardımcı bileşenler dahil) çıkarıldı. Çoğu uzun metin hata/kenar durumu; aşağıdaki liste varsayılan görünen akışlardaki ≥~30 kelimelik paragraflar. (Sayılar kelime.)

**Ağırlık sırası (varsayılan görünür yazı):**
1. **Sağlık verisi rızası** (4 madde, ~186 kelime): `consent.health_data.points.{collected 48, purpose 51, withdraw 37, scope 50}`. Yerler: `settings-detail?part=consent` (Settings > Health data consent, "View" ile açılır), onboarding `app/onboarding/health-data.tsx:146` ("full text" bağlantısı), `weigh-in`/`meal`/`recipe`/`state` kapıları. Bileşen: `consent/ConsentText.tsx`. Hukuki metin, ama madde başına 37-51 kelime düz paragraf. Çıkış: ilk satır başlık+tek cümle, kalanı açılır; ya da 4 başlıklı kart.
2. **Apple Health rızası** `consent.apple_health.body` 63 kelime tek paragraf: `settings-detail?part=apple`, `app/onboarding/apple-health.tsx` (ulaşılmaz), `health/HealthJit.tsx` (ilk tartı/antrenmanda çıkan sheet).
3. **Rızayı geri çekme onayı** `settings.withdrawConfirm.HEALTH_DATA.body` 41 kelime (`settings/ConsentsSection.tsx`, `Confirm`).
4. **Settings > Reminders > Your routine** (`settings-detail?part=routine`): `settings.reminders.what` 40 kelime + `cue.hint` 13 = ~53 kelime, sayfanın tüm üst yarısı (`settings/RoutineEditor.tsx:40`). Aynı 40 kelime onboarding `RemindersOffer` içinde de var.
5. **Edit program** (`app/edit-program.tsx`, 494 satır): `editProgram.rebuildBody` 51 (rebuild onayı), `targetsLost` 26, `editConflictKept` 21, `addingDay` 18, `splitBody` 15, `cardio.coach` 17; toplam ekranda ~370 kelime anahtar; tipik açılışta splitBody + cardio.coach + uyarılar ≈ 50-90 kelime.
6. **Import** (`app/import.tsx`): `import.privacy` 30, `import.skipped` 25, `import.unknown` 24, `import.rowsLeftOut` 21, `import.unit.note` 18, `import.leftOut` 16; sonuç ekranında ~100+ kelime. `app/onboarding/program-import.tsx`: intro 19 + unknown 24 + allLeftOut 16 + privacy 13.
7. **Settings > Health and data > Import weigh-ins** (`ImportSection`, `part=import`): `note` 21 + `weighInsHint` 14 + `workoutsHint` 11 + sonuç 13 ≈ 60.
8. **Add to Apple Health** (`part=write`): `healthWrite.note` 20 + 2 ipucu + refused 13 ≈ 45.
9. **Hareket ekranı** (`app/exercise.tsx`): 3 ipucu (`demo.tip.*` 14-16 kelime) + `clipsPending` 18 ≈ 65 kelime, hareket başına aynı metin. Görsel olarak harita + 3 cümle + "yakında" kartı.
10. **Çağrı ekranı** (`app/call.tsx`): başlık + 2 neden (8-25 kelime) + `confidence` + `nextCall`; Today kartı (`today/CallCard.tsx:113`) `decision.*.body` ort. 26, en çok 42 (`mini_cut.appetite_gone`, `declared_context`) + `today.call.oneThing` 17 + `waitNote` 12 ≈ 45-70. Yapı kart/satır, düz paragraf değil; Today için en uzun blok.
11. Photo capture girişi `capture.intro.*` (4 madde 9-13 kelime = ~42), `photos.deleteBody` 17, `share.note` 20 + `share.openNote` 16 (Progress altında), `share.denied` 22.
12. **Settings > Data sources** (`part=sources`): ~71 kelime ama listelenmiş link satırları + lisans notu (ODbL ibaresi zorunlu): düz yazı sorunu değil.

Settings ana sayfası (`app/settings.tsx`) kurala uyuyor: satır başına tek satır, uzun yazı alt sayfada (`settings/detail.ts`). Alt sayfalar (madde 14) için asıl hedefler: 1, 2, 4, 7, 8.

Ulaşılmaz ama en uzun metinli: `projection.view.disclaimer` 41, `mealPhoto.intro` 33, `coach.chip.start` 32, `calibration.logs_run_low.body` 50 (kontrol: calibration ekranı yok, ulaşılmaz).

Öneri formu: rıza = "ne tutuluyor / ne için / nasıl çekilir" 3 satır ikonlu kart + "Full text" açılır; routine = 3 tür için 3 satır (ikon + 4 kelime) + tek alan; import sonucu = sayaç satırları (ListRow) + tek "Learn more".

---

## 3. Progress sekmesi animasyonu

**Hiçbir animasyon yok.** Progress'te `Animated`/reanimated/withTiming yok. `react-native-reanimated 4.5.1` ve `react-native-worklets` `package.json:42,48`'de var ama `src/`de hiçbir yerden import edilmiyor (grep). Animated kullanan yerler: `app/call.tsx:104-216` (çağrı açılışı), `app/workout-end.tsx:123-135` (rozet yayı), `components/UndoBanner.tsx`. Progress'te hareketli tek görünüm yok.

Muhtemelen kastedilen **kas haritası**: `components/MuscleMap.tsx` (react-native-body-highlighter, statik SVG, ön+arka figür). Veri sunucudan geliyor (`/v1/training-progress` -> `MuscleSets{plannedSets, doneSets, targetSets, plannedShare, doneShare}`, `ProgressSummary.java:35-123`, hesap `ProgressSummary.muscles`), yani **veriyle değişir**, hardcode değil. Ama:
- Üç sabit seviye var: `fillOf` (`MuscleMap.tsx:30-34`): doneShare>=1 "full", >0 "part", planlı "planned". %10 ile %90 yapılmış kas aynı renk (`accentMid`). Süreklilik yok, geçiş animasyonu yok.
- Harita yalnız ilk fazda (`phase` first/locked/unknown) çiziliyor; ilk çağrıdan sonra (`running`) `MuscleBars` çubukları geliyor, harita kayboluyor (`app/(tabs)/progress.tsx:96-98`). Yani kullanıcı 1. haftadan sonra "animasyon" görmez; haritayı sadece program/set değişince görür ve değişiklik anında zıplar (ease yok).
- Güncelleme: `useReadOnFocus(..., {afterSaves:true})` ile sekme açılınca/kayıt sonrası yenileniyor; antrenman bitince (workout-end `router.back`) Progress odağa geldiğinde okur.
- Diğer Progress parçaları: `LineChart`/`StrengthChart` statik SVG; `ConsistencyGrid` hücreler; `WeighInDots` segmentler; hepsi veriden ama hareketsiz.
- `areaFills` (`MuscleMap.tsx:39`) için `P.muscleMapAreas` (data/parameters) sabit kas->bölge eşlemesi: normal, hardcode değil.

Sonuç: "dinamik animasyon" için üretilecek bir şey var; mevcut olan yalnız veri-bağlı statik renk. Reanimated zaten bağımlılıkta (kullanılmıyor: ya kullan ya çıkar). **P1.**

---

## 4. Bileşenler arası reaktivite

Mekanizma: `today/useReadOnFocus.ts` = odakta + AppState active'de yeniden okur; `afterSaves` yalnız Today, Train, Progress sekmelerinde ve `saved/saved.tsx` `publish()` ya da Undo ile artan sayaçla tetiklenir. `publish`'i çağıranlar yalnız 4 yer: `app/cardio.tsx:34`, `app/weigh-in.tsx:47`, `app/meal.tsx:52`, `food/QuickAdds.tsx:47` (kod: `useSaved()` grep). Yorum `useReadOnFocus.ts:14-16` "the + sheets close over the tab without its focus" diyor: formSheet/modal sekmeyi odaktan düşürmüyor.

Birimler `useUnits` (`useSyncExternalStore`, `units/preference.ts`) ile her yerde anında yayılıyor (formatLoad/formatWeight çağıran her dosya `units` alıyor). Tema `useAppearance`. Rızalar `useHealthConsent` odakta okur. Bunlar **sağlam**.

| Gerçek | Nerede değişir | Nerede görünür / okunur | Yeniden okuma | Durum |
|---|---|---|---|---|
| **Antrenman günleri / haftanın günleri** | Onboarding `days`; Settings>Training>Days = `edit-program?part=days`; Train'den `build-program`; `call.tsx` week1 "change days" (`today/useWeek1.tsx`); `today-change` (MOVE/SKIP); check-in kararı `add_training_day` (apply). Hepsi sunucuda `/v1/program*` (`train/changes.ts`: generate, days, PATCH program, today, swap). | Today (`useToday`), Train, Progress (planlı kaslar, cardio kutusu), Settings TrainingGroup, **antrenman hatırlatmaları** | Sekmeler/Settings odakta okur: pushed ekranlardan (`edit-program`, `settings`, `build-program`) dönüşte güncel. `today-change` (formSheet), `swap` (modal), `state` (modal) kapanınca `publish/changed` çağrılmıyor (`today-change.tsx:84`, `swap.tsx:86`, `state.tsx:69`): sekmenin odak almadığı varsayımına göre bayat kalabilir. **Doğrulanmadı (cihazda).** | **P1** |
| **Antrenman günü hatırlatması** (kritik) | Hatırlatmalar programın değil **profilin** `schedule.trainingDays`'ini kullanıyor: `notifications/plan.ts:131,135,143` -> `reminders.keepSchedule` yalnız `services/appServices.ts:217` `onProfile`'dan (profil okununca). Program günleri değişince **profil güncellenmiyor**: `ProgramController` hiçbir yerde `profiles`'a yazmıyor (`training/ProgramController.java` grep), kullanıcıda profil günlerini düzenleyen UI yok (PUT `/v1/profile` yalnız units ve avoid). `keepRestUntil`/`keepFirstCall` programı izliyor ama günler izlemiyor. Sonuç: Edit program'da günleri değiştiren kullanıcı için "training day" bildirimi onboarding'deki eski günlerde çalar. | Bildirimler | Hiç | **P0/P1** (davranış hatası, kullanıcı fark etmez) |
| Sunucu tarafı gün kaynağı | Engine hem `programDays` hem profil günü kullanıyor (`decision/DecisionService.java:319`, `PromptController.java:107`: "programDays boşsa profil"). Program günü varsa program kazanır, ama `PlannedSessions.java:66-77` profil gün sayısına da düşüyor, `CardioWeek.trainingDays` `profileDays` ile karışıyor. İki gerçek kaynak. | karar motoru, cardio | -- | P1 (tek yol hedefi: madde 2) |
| **Hedef / faz** | Yalnız onboarding; sonra yalnız motor kararı `change_phase` (apply). Elle değiştirme UI'ı yok. | Today, Progress, plan, paywall önizleme (`planPreviews` onboarding'de bir kez) | Apply sonrası `call.tsx`/`Hero` `onChanged: reload` | Düzenlenemiyor: P1 (ürün sorusu: Settings'te hedef) |
| **Kalori hedefi** | Yalnız motor çağrısı apply (`today/call.ts:applyCall`) ve `prompts` cevapları; elle düzenleme yok. | Today FoodLine, food ekranı, Progress hedef kutuları, onboarding plan | Today `onChanged: reload`; Progress odakta; food `useFoodDay` odakta | Düzenlenemiyor |
| **Check-in günü / usual training time / yaş-boy-kilo** | Yalnız onboarding. Settings'te satır yok (`settings/*` tam liste: Appearance, Units, Training, Food, Reminders, Health, Subscription, Data sources, Account). | Today/Train (`schedule.checkInDay` her seferinde profilden okunuyor), hatırlatma planı (profilden kopya, yalnız başlangıçta/okumada) | -- | Düzenlenemiyor: P1 (hatırlatma saati kullanıcı davranışından türeyemez, madde 20) |
| **Birimler** | Settings UnitsSection -> `units/preference.ts set` (PUT profil tam gövde) | Her yer | `useSyncExternalStore` anında | OK. Not: read-modify-write ile tüm profili PUT'luyor (`FoodEditor.tsx:51`, `preference.ts:80`), iki ayarın yarışı teorik |
| **Kaçınılan yiyecekler** | Settings>Food (`FoodEditor`: virgüllü tek satır TextField) | Settings satırı (odakta okur, OK); yalnız `foods/recent` ve `day suggestions` filtresi | Food ekranı `useFoodDay` odakta okur | Yazıldığı yerde bağlı; etkisi sınırlı (bkz. §1 son paragraf): P1 |
| **Salon / ekipman** | Settings>Gyms (`gym.tsx`, `gyms.tsx`) | sonraki ağırlık yuvarlama, ısınma (`train/loadSteps.ts`), swap önerileri | `gyms.tsx` ve Train odakta okur | OK; Levent kaldırılmasını istedi (madde 12) |
| **Başlangıç ağırlıkları** | Onboarding `weights` (`PUT /v1/program/starting-weights`, `onboarding/prepare.ts`) | Train hedefleri | Set sonrası motor | Sonradan düzenleme UI'ı yok (set bazında düzeltme var) |
| **Rızalar** | Settings>Health data / Apple Health (`ConsentsSection.tsx`); onboarding; JIT sheet'ler | Settings grupları, Today/Progress/food (`consent` durumu), Hatırlatma "noCalls" | `ConsentsSection.onChanged` + `useHealthConsent` odakta; Today/Progress her okumada sunucudan | OK. Rıza geri çekilince sekmeler odağa gelince boşalır |
| **Abonelik** | `paywall` (modal) / Settings | gate (`useSubscriptionGate`), Settings | gate her okumada | OK |

"İlk cevabı cache'leyip bir daha güncellemeyen" ekranlar: `what-if.tsx`/`why.tsx` (ulaşılmaz); `onboarding` planPreview paywall'da bir kez (kasıtlı); `app/weigh-in.tsx`/`app/gym.tsx` modal içinde mount'ta bir kez okuma (modal ömrü kısa, sorun değil). Asıl risk: kapanışta `publish/changed` çağırmayan **sheet/modal'lar** (`today-change`, `swap`, `state`, `paywall`) ve **bildirim planı** (yukarıdaki P0/P1).

---

## 5. iPhone alışkanlıkları

Evidence (grep): `KeyboardAvoidingView` yalnız `app/workout.tsx:1333` (ve ulaşılmaz `coach.tsx:157`); `automaticallyAdjustKeyboardInsets` yok; `keyboardDismissMode` yok; `InputAccessoryView` yok; `Keyboard.dismiss()` yalnız `workout.tsx:401`.

| # | Bulgu | Kanıt | Sınıf |
|---|---|---|---|
| 5.1 | **Sayı klavyelerinin Return/Done tuşu yok** (`decimal-pad`, `number-pad`) ve Done araç çubuğu yok. Kullanıcı yalnız ScrollView boş alanına dokunarak (`keyboardShouldPersistTaps="handled"`) kapatabilir; `Stepper.onSubmitEditing={() => setDraft(null)}` (`components/Stepper.tsx:120`) sayı klavyesinde hiç tetiklenmez. Etkilenen: tartı (`weigh-in`), `Stepper` kullanan her ekran (onboarding about/activity/weights, program editörü), gym formu, check-in, `SetEntry`, barkod elle giriş. | `components/Stepper.tsx:120-123`, `components/TextField.tsx:9,49-54`, `app/gym.tsx:121-178`, `app/check-in.tsx:194`, `train/SetEntry.tsx:51,85`, `food/BarcodeScanner.tsx:91` | **P1** |
| 5.2 | **Klavye altında kalan içerik/düğme:** formların çoğu `ScrollView` içinde, düğme formun sonunda ya da alt "dock"ta; klavye yükselince iOS'ta ScrollView kendiliğinden inset eklemez (`automaticallyAdjustKeyboardInsets` yok, KAV yok). Dock düğmeleri klavyenin altında: `app/meal.tsx:303-322` (Save meal dock), onboarding `StepFrame` alt "Continue" (`onboarding/StepFrame.tsx:127-132`, ScrollView dışında). Alt yarıdaki alanlar (gym formu, recipe, check-in, FoodEditor, RoutineEditor, ProgramEditor modal) klavye arkasında kalabilir. **Doğrulanmadı (simülatör çalıştırılmadı)**; kodda koruma yok. | yukarıdaki dosyalar | **P1** |
| 5.3 | **Sürükleyerek klavye kapatma yok** (`keyboardDismissMode='on-drag'/'interactive'` hiçbir ScrollView'da). iPhone'da Notes/Mail/Messages'ta beklenir. | grep boş | P2 |
| 5.4 | **Kapat/geri düğmesiz modal'lar:** `weigh-in` ve `meal` (`presentation: 'modal'`, `_layout.tsx:56,58`) giriş adımında görünür Close/Cancel yok, yalnız aşağı çekme (consent adımında "Not now" var: `weigh-in.tsx:175`, `meal.tsx:254`). `plus` formSheet'te grabber var, düğme yok. Aşağı çekince yazılan veri sessizce gider (onay yok). | `app/weigh-in.tsx:224-232`, `app/meal.tsx:313-321` | P2 |
| 5.5 | **Kaydırarak geri kapalı olanlar** (hepsi gerekçeli): `onboarding/plan.tsx:169`, `onboarding/preparing.tsx:87` (plan hazırlanırken), `return` (`_layout.tsx:69`, cevap beklenir), `photo-capture` (`_layout.tsx:71`, Close düğmesi var), `edit-program` kirliyken (`edit-program.tsx:432`, `beforeRemove` uyarısı :395), `build-program` meşgulken (:59), `StepFrame` `backDisabled` (:124). Sorun yok. Not: `plan.tsx`'te hem kaydırma kapalı hem geri düğmesi yok -> kullanıcı yalnız Continue ile ilerler (kasıtlı). | adı geçen satırlar | -- |
| 5.6 | ADR (`navigation/pushed.ts` başlık yorumu) "ekran kendi Back'ini çizmez" diyor ama headerShown:false ekranlar kendi "‹ Back" metnini çiziyor: `call`, `check-in`, `state`, `share`, `food`, `what-if`, `workout*`, `exercise*`. Sistem kaydırması çalışır (kapatılmamış), ama iki farklı geri görünümü var. | `app/call.tsx:93`-`:140` (`back`), `app/check-in.tsx:108`, `app/state.tsx:100`, `app/food.tsx:103`, `app/share.tsx:202` | P2 |
| 5.7 | Klavye tipi/ipuçları: numeric alanlarda placeholder `-` ve metin alanlarında `autoCapitalize`/`textContentType` özelleştirmesi yalnız `onSearch` TextField'de (`TextField.tsx:54`). | `components/TextField.tsx` | P2 |

---

## 6. Onboarding -> ilk kullanım rehberi

**Yok.** Üç sekmeyi (Today, Train, Progress), "+" düğmesini ve haftalık çağrıyı anlatan kısa rehber/tur/coach mark yok (grep `tour|walkthrough|coach mark|tutorial` kod ve metinde boş).
- Onboarding son ekranı `app/onboarding/plan.tsx` "Your plan": hedef/gün çipleri, başlangıç çağrısı satırları (kalori, protein, ilk çağrı günü), ilk antrenman kartı, hatırlatma teklifi. Sekmeler ya da "çağrı nedir" yok. Ardından paywall (`subscribe`), sonra Today.
- Daha önce vardı: "What to expect" (`app/onboarding/expectations.tsx`, `en.json` `onboarding.expectations.*`: weigh / "Your call comes each {day}" / "Visible change takes 4 to 8 weeks"). ADR-069/072 ile **retired** (`onboarding/flow.ts` RETIRED_STEPS, `app/onboarding/_layout.tsx:25-30` `guard={false}`); içeriği kullanıcıya hiçbir yerde gösterilmiyor.
- İlk haftalar kartı da ölü (§1.4).
- Hâlen çalışan bağlamsal yardım: Today hero (ilk çağrı günü + geri sayım), `call.tsx` `weighInsLeft` (7 tartı), `StateCard`, `Progress` kilit satırları/"unlocks" metinleri, Return ekranı ("Welcome back"). Hepsi bağlama bağlı, ilk açılışta bütünleşik bir "uygulama böyle çalışır" yok.

**P0/P1:** madde 19 isteği tamamen açık. Yeniden kullanılabilir: `onboarding.expectations.*` metinleri (kısa, 3 madde), `InfoList` bileşeni.

---

## Özet sıralama

**P0**
1. `demo.clipsPending` "klip çekilmedi" kartı her hareket ekranında (40/40 `review: pending`); video bileşeni de yok. (§1.1)
2. "Bring in workouts" gerçek dışa aktarımla doğrulanmadı; yalnız 3 tam başlık kabul ediliyor. (§1.7)
3. Antrenman günü bildirimleri profildeki onboarding günlerinde kalıyor; program günleri değişince güncellenmiyor. (§4)
4. Onboarding sonrası rehber yok; "What to expect" ve First-weeks kartı ölü kod. (§6, §1.4)

**P1**
5. İki kaynak antrenman günü (profil vs program) -> tek yol. (§4)
6. Progress'te animasyon yok; harita 3 sabit seviye, ilk çağrıdan sonra kayboluyor. (§3)
7. "Foods you avoid" yalnız recent/usual önerilerini filtreliyor, arama/kayıt etkilenmiyor. (§1)
8. Hedef, kalori hedefi, check-in günü, hatırlatma saati, yaş/boy sonradan düzenlenemiyor. (§4)
9. Sayı klavyelerinde Done yok; klavye altında kalan düğme/alan; `keyboardDismissMode` yok. (§5.1-5.2)
10. Rıza/rutin/import/edit-program metinleri düz paragraf: 4 madde ~186 kelime rıza, 40 kelime routine, 51 kelime rebuild. (§2)
11. `today-change`/`swap`/`state` kapanışta sekmeyi yeniden okutmuyor (varsayım, doğrulanmadı). (§4)

**P2**
12. Paywall `ExampleCard` yedeği, sign-in "Every Monday" sloganı, `weigh-in`/`meal` modalında Close yok, iki farklı Back görünümü, ulaşılmaz ekran/widget kodu ve kullanılmayan `react-native-reanimated`, tam profil PUT'u (read-modify-write).
