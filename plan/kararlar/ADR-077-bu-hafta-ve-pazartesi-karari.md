# ADR-077 · "Bu hafta", pazartesi kararı ve nedeni: varsayılan uygulanır, "eski planla devam", 1. hafta davranış ayarı, dönüş ve duraklatma
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent; öneren: agent

## Bağlam
Bugün kararlar `why.tsx` (gerekçe), `what-if.tsx`, `ledger.tsx` ve check-in sonucuna dağılmış; Today ~105 kelime. Karar `POST /decisions/{id}/apply`
ile uygulanıyor; "eski planla devam" diye bir durum yok (`Application.state`: NOT_NEEDED / PENDING / APPLIED / UNDONE). 1. hafta bilerek sessiz
(`FirstWeeks`); ilk 14 gün `NoDecisionYet` (U8). U15 "1. haftada plan değişti anı" istiyor: iç gerilim (06 B4). Part 2'de Levent: B4 → davranıştan
tek ayar; B11 → karar varsayılan uygulanır, tek ikincil seçenek "eski planla devam". Tur 2'de "neden" katman 2 kalktı.

## Karar
1. **Bu hafta** (≤40 kelime): hafta şeridi (Pzt-Paz; antrenman ✓, kayıt noktası, plan halkası; boş gün yalnız boş, kırmızı yok; başlıkta
   "11/12 weeks on track", 1. haftada "Counted by week") · kahraman blok (ilk hafta: "First week · Weigh in most mornings · First call Monday,
   N days"; sonra: karar etiketi + tek satır + "Next call Monday, N days"; pazartesi: "Open your call") · bugünün antrenmanı (ilk 3 hareket
   hedefleriyle, kardiyo satırı, Start) · yemek satırı (kalan bütçe aralık, U5; "Log"). Ayarlar sağ üstte. Koç çubuğu yok.
2. **Check-in:** sunucunun seçtiği ≤2 soru (U9), her birinin altında tek satır neden; yalnız cevabı kararı değiştirecek soru sorulur (bugünkü
   `CheckInQuestions` kuralı). Yeni soru türü **1. hafta: "How did week 1 feel?"** (Too much / About right / I could do more): madde 4'teki
   kuralı değiştirdiği için sorulur.
3. **Karar ekranı** (tek katman, ≤45 kelime): büyük etiket · tek satır · değişen hedefler (eski → yeni) · iki neden maddesi (veri + kural) ·
   güven ve sonraki karar tarihi (U3'ün dört parçası görünür) · "In this week's plan" (varsayılan uygulanmış, B11) · "Got it" · ikincil
   **"Keep last week's plan"**: karar kayıtta kalır, uygulanmaz (`Application.state = DECLINED`, yeni), sonraki haftanın verisine "not applied"
   olarak girer, kararı değiştirmez (U2); "Use this call" ile geri alınır. **Güvenlik kararlarında ikincil seçenek yok** (U13; `SafetyNet`
   kuralları). Paylaş düğmesi yok (ADR-076).
   - `why.tsx`, `what-if.tsx`, `ledger.tsx` rotaları girişsiz kalır (ADR-069 #3); geçmiş kararlar İlerleme › Calls'tan aynı ekranla açılır.
4. **1. hafta davranış ayarı** (B4, yeni motor kuralı, `kural-ekle`): ilk pazartesi kilo trendine bakmaz (U8); planlanan P ve yapılan Y
   seanstan, his cevabıyla tek ayar verir. **Motor 3 günün altını önermez** (G6 K-36, G7 K-79; ADR-071 #8):
   | Durum | Ayar | Kaynak |
   |---|---|---|
   | Y/P ≥ `on_track_min_ratio` (0,7), his "too much" ya da "about right" | Aynı plan ("Keep going") | G2 K-60 (≥%70 iyi) |
   | Y = P, "I could do more", yeni başlamayan, gün < 4 | Bir gün ekle (4) | G6 K-36 (4-5 ideal; yeni başlayana 3 yeter) |
   | Y/P < 0,7 | Kaçan seansları uyan güne taşı; gün sayısı aynı (≥3) | G2 K-60, 03 §2.9 (önce uyumu çöz) |
   His cevabı ve kaçan gün metinde geri yansır ("Wednesday didn't happen. Pick a day that works."). Besin ve kilo "day 14"e kadar bekler (U8).
   Seçenekler: "Sounds right" / "Change it" (aynı planla devam · günleri ben seçerim · öneri). Kullanıcı 2 güne kendisi inebilir; motor önermez.
   YAG25 kaynaklı K-60'ın konuşmacısı belirsiz; eşik zaten `windows.yaml`'da (`on_track_min_ratio`) ve 03 §2.9'da Güray omurgası olarak kayıtlı.
5. **Dönüş** (≥ `return_prompt_days` kayıtsız açılış): "Welcome back. Nothing lost." · üç seçenek, biri önerili: boşluk ≥
   `return_step_back_after_weeks` (3) ise "Ease back in" (ilk seans bir basamak hafif, `ReturnLoad`, G7 K-72 + H9), değilse "Pick up where I left
   off"; üçüncü "Rebuild my plan". Pazartesi yeni başlangıç.
6. **Duraklat** ("+" › Life got in the way): beş durum döşemesi (Traveling, Sick, In pain, Busy week, New gym) + süre (Until I'm back / 3 days /
   7 days) → bugünkü `StateMode`; "Nothing counts against you. Safety checks still run." Tıbbi dil yok (U6).

## Neden
Runna şablonu (etiket · neden · veri · güven · tarih) U3'le örtüşüyor ve tek ekranda okunuyor (M2 çıkarım 4); Levent derin katmanı istemedi.
Varsayılanın uygulanması karar yükünü alır (vaadin kendisi); "eski planla devam" dayatmayı kaldırır ama U2'yi bozmaz: karar değişmez, yalnız
uygulanmaz. 1. hafta ayarı U15'i U8'e dokunmadan karşılar; Güray'ın gün tabanı korunur.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kabul/ret düğmesi (MacroFactor) | Karar yükünü kullanıcıya geri verir (B11) |
| "3 değil 2 gün" | Güray tabanının altı; Levent ADR-071 #8'de önerilen yolu seçti |
| 1. haftada sessiz kalmak (bugün) | U15 anı kaybolur |
| Gerekçe katmanı 2 | Levent: "kimse niyesini bu kadar derin merak etmez" |

## Sonuçlar
- Olumlu: tek akış (bildirim → check-in → karar); Today ≤40 kelime.
- Olumsuz: yeni karar durumu (`DECLINED`) ve yeni kural; `FirstWeeks`'in "1. hafta içeriksiz" kuralı 1. hafta kararıyla değişir.

## Geri dönmenin maliyeti
Orta: sözleşme durumu ve motor kuralı; ekranlar.

## Etkilenen
Engine (`FirstWeekAdjustment` yeni, `FirstWeeks`, `WeeklySpine` sırası), decision (apply/decline, `CheckInQuestions` yeni soru türü),
`contracts/openapi.yaml` (`Application.state DECLINED`, decline/undo uçları, soru türü `WEEK1_FEEL`), mobil `(tabs)/index`, `check-in`, karar ekranı,
dönüş, `state`, `data/parameters/windows.yaml` (`training_days_min`, `return_prompt_days`), `data/copy/en.json`.

## Doğrulama
`FirstWeekAdjustment` tablo testleri (üç satırın eşik altı/kendisi/üstü; hiçbir girdide < `training_days_min`) · özellik testi: his cevabı
yalnız tablodaki satırları değiştirir · decline testi: karar kayıtta, plan değişmez, sonraki hafta "not applied"; güvenlik kararında decline 409 ·
ekran testleri: Today kelime bütçesi, karar ekranında dört parça.

## Ek 1 · 1. hafta kararının uygulanışı (K-962, 2026-10-07, agent, teknik; **Levent KABUL, 2026-10-08**)
- "Bir gün ekle" ve "kaçan seansı taşı" kararları programı kendiliğinden değiştirmez (`Application.state = NOT_NEEDED`, `declinable=false`):
  hangi gün eklenecek ya da taşınacak, kullanıcının haftasına bağlı. "Sounds right" kullanıcıyı K-978'de gün seçimine götürür (öneri dolu gelir).
  #3'teki "varsayılan uygulanır" ilkesi kalori ve antrenman yükü kararları için sürer; gün değişikliği kullanıcının dokunuşuyla olur.
- Kayıt günü planlanan seans sayılmaz (kullanıcı başlamadan "kaçırıldı" denmez, U7); o gün yapılan seans sayılır.
- 2 günlük planda "bir gün ekle" 3 gündür (+1, taban `training_days_min`); metin ideali ({idealMin}) hedef gösterir, 3'ü "en iyi" demez.
- His cevabı karar gerekçesinde taşınır (`week1Feel`), ekran geri yansıtır.
- Sıra: güvenlik ağı › mini cut sonu › bildirilen durum › ters giden antrenman › 1. hafta kararı › yük merdiveni.

## Ek 2 · İlk gün ve ilk karar tarihi sunucuda (K-990, 2026-10-08, agent, teknik; KABUL)
- **İlk gün = onboarding'in bittiği gün:** profilin ilk kaydı (`profile.profile.onboarded_at`, V42; yalnız ilk insert'te yazılır, sonraki kayıt
  dokunmaz). K-967 akışında profil #ob-preparing'de, bütün cevaplar verildiğinde kaydedilir; plan o kayıtla kurulur ve hemen gösterilir. İlk
  hafta, 1. hafta kararının olguları (`FirstWeekFacts`) ve ilk 8 hafta (`FirstWeeks`, ADR-040) aynı günden sayılır (`FirstWeekFacts.firstDay`, tek
  tanım). Bitiş günü planlanmış seans sayılmaz (Ek 1). Giriş ile bitiş arasındaki günler ilk haftaya girmez.
- **İlk karar tarihi:** ilk günden sonraki ilk check-in günü (en geç 7. gün, asla aynı gün; ADR-071 #1). O gün gelmeden ve hiç karar yokken
  `GET /v1/check-ins/current` 404, `POST …/answers` 409. Tarih `GET /v1/first-weeks` › `firstCallOn` ile gelir (ilk karar verilene kadar; gün
  geçmiş ve karar yoksa bugün: check-in açık). Telefon tarihi hesaplamaz; yalnız kalan günü sayar. Plan, paywall ve Bugün aynı alanı okur.
- **Eski hesaplar:** V42'den önce kaydedilmiş profilde `onboarded_at` boş; ilk gün eskisi gibi ilk giriş (`AccountDates.began`). Karar vermiş
  hesap etkilenmez (kapı yalnız hiç karar yokken).
- Reddedilen: (a) `POST /v1/onboarding/finish` (plan Continue'da): plan ekranı tarihi bitişten önce gösterir, sunucu "bugün biterse" tahmini
  verip sonra başka bir an kaydederdi (gece yarısında ayrışır); Continue'ya ağ şartı ve yeni uç eklenir; eski derlemeler hiç çağırmaz. (b) İlk
  program üretimi/PUT: kendi programını getiren onboarding ortasında PUT eder; "bitti" anlamı taşımaz. (c) Tarihi `/v1/targets/starting`'e
  koymak: tartı yokken 404 döner, tarih kaybolur; ilk karar tartısız da verilir. (d) Profil cevabına koymak: kural decision'ın; profil
  modülü decision'a bağlanamaz, kural iki yerde yazılırdı.
- **Bilinen sapma: geç devam (Levent'e bildirilecek).** Profil kaydedilip (#ob-preparing) uygulama kapanır, onboarding günler sonra devam
  ettirilirse ilk gün yine kayıt günü (G) kalır; kapanış check-in günü K = G'den sonraki ilk check-in günü. Devam günü D'ye göre:
  - D < K: fark yok; plan ve #ob-preparing K'yi gösterir.
  - K ≤ D < K + 7 (kapanış haftası): check-in açık, plan ve #ob-preparing "Today" der. Karar 1. hafta kararıdır: G+1..K-1 arasındaki
    planlı günler, kullanıcı planı henüz görmemişken "kaçırıldı" sayılır (Y/P < 0,7 → "kaçan seansı taşı", metin kaçan günü adıyla
    söyler); his sorusu (WEEK1_FEEL) kuralına göre sorulabilir.
  - D ≥ K + 7: 1. hafta kararı ve his sorusu hiç gelmez (kapanış haftası geçti; gönderilen his cevabı okunmaz); ilk karar sıradan bir
    haftalık karar olur.
  - İlk 8 hafta akışı (`FirstWeeks`) G'den saydığı için ileride başlar (ör. 10 gün sonra devam: 2. hafta, sözleri ile).
  Neden kabul edildi: cevaplar ve plan G'de oluştu; bu yol nadir (onboarding ortasında kapatıp günlerce dönmemek). Kapanış haftasındaki
  "kaçırıldı" sayımı U7 açısından tartışmalı (kullanıcı başlamadan kaçırdı denmesi); düzeltmesi (ör. ilk günü devamda ilerletmek ya da
  planı görmeden geçen günleri P'ye katmamak) ürün kararı, Levent'e sorulacak.

## Ek 3 · İlk gün planın görüldüğü gün (K-993, 2026-10-09, agent, teknik; ürün kararı Levent 8 Eki "geç dönüşte görülmemiş günler sayılmaz")
- **İlk gün = planın ilk gösterildiği gün:** telefon planı ilk gösterdiğinde `PUT /v1/profile/plan-seen` der; sunucu yalnız ilk kez, kendi
  saatiyle yazar (`profile.profile.plan_seen_at`, V47; sonraki çağrı hiçbir şey değiştirmez, 204). `FirstWeekFacts.firstDay` sırası: plan
  görüldü → profilin ilk kaydı (Ek 2) → hesabın ilk girişi (eski hesap). İlk hafta, 1. hafta kararının olguları, ilk karar tarihi
  (`firstCallOn`) ve ilk 8 hafta aynı günden sayılır (tek tanım değişmedi, girdisi değişti).
- **Ek 2'nin "geç devam" sapması kapanır:** kayıt G, devam ve plan D'de: ilk hafta D'den başlar, K = D'den sonraki ilk check-in günü. G..D
  arasındaki planlı günler hiçbir hafta kararında "kaçırıldı" sayılmaz (ilk haftaya girmezler; ilk karar K'de). D < K, K ≤ D < K + 7 ve
  D ≥ K + 7 (Ek 2'ye göre) üçü de artık aynı yoldan: ilk hafta D'den, 1. hafta kararı K'de.
- **Neden sunucunun saati:** plan, profil kaydından hemen sonra ve çevrimiçi gösterilir (profil PUT'u ağ ister); telefonun gönderdiği an
  güvenilmez ve sınırlanması gerekirdi. **Neden profilde:** `onboarded_at` ile aynı yer (profilin olayı); decision `Profiles` üzerinden okur.
- **Reddedilen:** ilk günü profil kaydında ilerletmek (profil ayarlardan da kaydedilir; "bitti" anlamı taşımaz, Ek 2 (d)) · planı görmeden
  geçen günleri yalnız P'den çıkarmak (ilk karar tarihi yine G'den sayılır, kullanıcıya ilk haftası kısalmış görünür).
- **İlk karardan sonra (#526 incelemesi):** ilk karar yapılmışsa `plan-seen` hiçbir şey yazmaz (yine 204; profil modülü `FirstCalls`
  arayüzüyle sorar, decision sağlar) ve `firstDay` ilk kararın gününden önce görülmemiş planı yok sayar (ikisi birden: eski hesap ya da geç
  gönderim ilk haftayı ve 1. hafta kararını ikinci kez açmaz, ilk 8 hafta sayacı geri gitmez). `onboarded_at` ve `plan_seen_at` dışa
  aktarılır (profil bölümü, `onboardedAt`, `planSeenAt`).

## Ek 4 · Karar ekranının sunucu alanları (K-1000, 2026-10-10, agent, teknik; gün öneri kuralı ürün kararı: **Levent KABUL, 2026-10-10**)
Karar ekranı (#3) ve 1. hafta gün seçimi (#4, Ek 1) telefonda hesap istemez (U1; telefon kural işletmez); sözleşme (`contracts/openapi.yaml`) şunu taşır:
- **Değişenler:** `Decision.changes[] {what: CALORIES|STEPS|PHASE, before, after, inForce?}`; kararın kendi kaydından ve planın önce/sonrasından
  okunur, karar uygulandıktan sonra dolar (uygulanmamış ya da hedef değiştirmeyen karar için boş). DECLINED'da `inForce` yürürlükteki (geçen
  haftanın) değerdir. Hareket hedefi satırı (72.5 × 9 → 72.5 × 8) antrenman modülünden gelir, K-1009. `observationDays`: yalnız 1. haftayı
  kapatan kararda, kullanıcının cinsiyetinin `maintenance_observation_days` değeri, kararın okuduğu parametreyle ("Food and weight wait until
  day N").
- **Varsayılan uygulama (#3, B11):** check-in cevabıyla oluşan ve planı oynatan karar, oluştuğu anda mevcut `apply` yoluyla uygulanır ("Use
  this call" ile aynı yol). Planı o an oynatamıyorsa (bu arada başka karar planı değiştirdi, programsız program kararı) `apply` 409 verir ve karar
  PENDING kalır; ekran "Use this call" sunar. Güvenlik kararı da uygulanır (U13) ve `declinable` değildir. 1. hafta gün kararları (Ek 1)
  NOT_NEEDED kalır: gün kullanıcının dokunuşuyla seçilir.
- **1. hafta gün önerisi (`suggested: Weekday[]`, yalnız `MoveMissedSessions` ve `AddTrainingDay`):** öneri bir kural değil bir başlangıç
  noktasıdır; kullanıcı değiştirir, kayıt K-995 B PATCH ile yapılır ve karar bu seçime bakmaz (U2).
  - *Taşı:* kaçan her gün için (haftanın sırasıyla) o günden sonraki ilk boş gün, yoksa haftanın ilk boş günü; boş gün = planın antrenman günü
    olmayan gün; aynı gün iki kez önerilmez.
  - *Ekle:* eklenen her gün için, antrenman günlerine (haftanın bir daire olduğu varsayımıyla, pazar ile pazartesi bitişik) en uzak boş gün
    (iki yanında en çok dinlenme); eşitlikte en erken gün; hiçbiri antrenman günü değil. Ekleme sırasıyla seçilir (seçilen gün sonrakinin
    hesabında antrenman günü sayılır).
  - Antrenman günleri bilinmiyorsa (bu alanı kaydetmeden verilmiş eski karar) öneri boş döner; uydurulmaz.
  - **Kaynak (U14): ürün kararı, Levent KABUL (10 Eki 2026); bu ADR bu kuralın kaynağıdır.** Güray omurgasında gün aralığı için kural
    bulunmadı (G6 K-36 haftada gün SAYISINI söyler, hangi gün olduğunu değil; `program_frequency` "kas haftada iki kez" der, gün dağılımını
    değil), bu yüzden araştırma etiketi ([tecrübe]/[literatür]) taşımaz. Gerekçe mantık: ardışık antrenman günleri yerine arası açık
    günler dinlenmeyi bölüştürür. Öneri kullanıcının değiştirebileceği bir başlangıçtır, kararın parçası değildir (U2). Motor kodu
    (`FirstWeekAdjustment.movedTo/added`) kaynağı bu ADR'ye bağlar. Aralık kuralı bir gün gerçek bir motor kuralı olursa `kural-ekle` ile
    (kaynak + parametre + test) yazılır; bugünkü sıralama onun ilk hali sayılır.
  - Eski biçimli saklanmış 1. hafta kararında `suggested` yoktur: gönderilirken boş liste eklenir (`SourceView.sent`), sözleşme zorunlu kılar.
- **Değişenlerin okunuşu:** hedef planın yürürlükteki değeriyle okunur: adım hedefi hiç kurulmamışsa başlangıç hedefidir
  (`steps_target_start`), böylece ilk "more movement" kararı bir değişikliktir (7000 → 10000); ilk tartıdan önce başlamış planın kalori
  hedefi yoktur, yönü değiştiren karar onu kurar: `before` boş değerdir (`{}`, "yürürlükte hedef yoktu"), değişiklik atlanmaz. Geri
  alınmış (UNDONE) ya da "eski plan" seçilmiş (DECLINED) kararda `inForce` = `before` (plan karardan önceki haline döndü).
- **Güvenlik kararı geri alınmaz (U13):** varsayılan uygulanan güvenlik kararı (`SafetyNet.RULES` ya da sert durdurma) ne `decline` ne
  `undo` ile geri alınır (CONFLICT, aynı yanıt); aksi halde undo, decline'ın arka kapısı olurdu.
- **Güvenlik kararının olgusu:** `rapid_loss` ve `loss_rate_cap` karar penceresini okumaz (bir hafta ve sekiz hafta öncesinin trendine
  bakar); pencere sayısı onların okuduğu sayı olmazdı (U1). Yalnız adımın büyüklüğü (`kcal`) gelir; kuralın okuduğu oranı karara
  taşımak motorun `Reason`/`Decision` kaydını genişletmeyi gerektirir, gerekirse ayrı iş.
- **Bilinen sınır:** `observationDays` kararın saklı parametre özetini (`parametersHash`) değil, çalışan parametre setini okur;
  `maintenance_observation_days` değişirse eski bir 1. hafta kararı yeni değeri söyler. Parametre sürümlerinin saklanması (özetten
  geri okuma) ayrı bir iş; bugün tek sürüm yüklü olduğundan sapma yok.
- **Kısa neden satırı:** `Reason.facts` (kararın kendi kaydından, kuralın okuduğu sayılar: `kgPerWeek` (bir ondalık, işaret okunduğu gibi),
  `weeks`, `done`, `planned`, `sessions`, `kcal`) sunucudan gelir; metin `data/copy/en.json` içinde `decision.ruleShort.<rule>` anahtarıyla
  her motor kuralı için bir şablondur (`decision.rule.<rule>` uzun cümlenin kısası). Şablon yalnız kendi kuralının facts adlarını yer tutucu
  kullanır (`ReasonFacts.keysOf`), ≤ `ruleShortMaxWords` (10) kelime (`data/copy/word-budgets.json`), `RuleShortLinesTests` bunları tutar.
  Telefon bir yer tutucunun olgusu yoksa (eski karar, olgu kaydedilmeden verilmiş) `decision.rule.<rule>` uzun cümlesine döner; sayı uydurmaz.
  Çoğul biçim sorunu için şablonlar sayıyı "weeks: {weeks}" ya da "{n} of {m}" kalıbında kullanır (pencere ≥ 2 hafta olduğundan "over {weeks} weeks"
  yalnız pencere kurallarında).
- **Reddedilen:** (a) telefonun kararın eski/yeni değerini planlardan hesaplaması (kural işletir, U1); (b) `suggested`'ı kararın gerekçesine
  (`Reason`) koymak (öneri kararın değil kullanıcının hareketidir); (c) varsayılan uygulamada 409'u yutup kararı hiç göstermemek (PENDING kalıp
  "Use this call" sunmak kullanıcıyı ortada bırakmaz).
- **K1 notu:** varsayılan uygulama, check-in sonrası kararın PENDING gelmesini bekleyen DB/API testlerinin beklentisini değiştirir; bunlar bu ADR'den
  doğan, gevşetmeyen değişikliklerdir (K1 ADR değişikliği); PR'da liste halinde Levent'e sorulur.

## Ek 5 · Koç soruları ve ilk haftalar risk mesajı yüzeyden iner (K-520, K-521; 2026-10-10, ürün kararı: **Levent KABUL**)
- **Karar:** proaktif koç soruları (K-520) ve ilk 8 hafta / 5. hafta risk mesajı (K-521) yeni Bu hafta ekranında gösterilmez. Gerekçe #1: tek
  kahraman; ekran kararı ve bugünü taşır, ikinci bir mesaj yüzeyi kahramanla yarışır.
- **Kod:** silinmez; rota/bileşen girişsiz kalır (ADR-069 #3 kalıbı). Sunucu uçları yerinde.
- **Reddedilen:** İlerleme sekmesinde kart (K-979'u şişirir) · check-in akışında satır (30 kelime bütçesi).


## Ek 6 · Dönüş ve durum bildirimi (K-981 boşluk taraması, 2026-10-14; rıza ve metin ürün kararı: **Levent KABUL**; tetik tanımı agent, teknik)
- **Tetik kayıt boşluğu:** "≥ `return_prompt_days` kayıtsız açılış" = son kayıttan (tartı, öğün, antrenman, kardiyo) bugüne gün sayısı. Uygulama
  açılışları sunucuya gitmez (ADR-041 #66), kayıt gider; sayım sunucuda (K-1020). Cevap sunucuya yazılır, aynı boşlukta yeniden sorulmaz.
- **Metin dürüst:** "Welcome back. Nothing lost." yerine kaybolmayanı söyleyen metin (plan, kayıtlar, hedefler). Tutarlılık serisinin kuralı
  değişmez; uzun boşluk seriyi bitirebilir, ekran bunu iddia etmez ve suçlamaz (U7).
- **Rıza veri türüne göre:** Sick ve In pain sağlık verisidir, HEALTH_DATA rızası ister; Traveling, Busy, New gym takvim bilgisidir, rızasız
  kaydedilir (K-1021). Süre telefonda tarih toplanmadan gün sayısıyla gönderilir; seçenekler 3 ve 7 gün (#6).

## Ek 7 · Yük tutma kararında hareket hedefi satırı (K-1009, 2026-10-14, agent, teknik; KABUL; saklama düzenleyici incelemesiyle sıkılaştırıldı)
Ek 4'ün "hareket hedefi satırı antrenman modülünden gelir" sözü şöyle yerine gelir (`Decision.changes[]`, sözleşme `DecisionChange.what = MOVE`):
- **Satır:** `{what: MOVE, exerciseId, held: true, before: {target: {loadKg, reps}}, after: {target: {loadKg, reps}}, inForce?}`. `before`: karar
  uygulanırken programın o hareket için sakladığı sonraki hedef; `after`: yük tutulurken programın göstereceği hedef (`NextTargets.shown`: son yük, tekrar
  aralığının üstü, K-217). Sayılar kg ve tekrar, programın birimiyle; telefon yalnız yazar (U1). `held: true`: yük korunuyor, telefon bunu "hedef düştü" diye
  yazmaz (kullanıcı testi, 8 Eki). DECLINED/UNDONE'da `inForce` = `before` (tutma kalkar, program karardan önceki hedefte).
- **Saklama (karar kaydı karar anındaki veriden yeniden üretilir, decision/package-info, ADR-003/005):** hareket satırı, CALORIES/STEPS/PHASE gibi, kararın kendi
  kaydından okunur. Karar uygulanırken (`DecisionService.apply`, `training.holdLoad`'dan önce, aynı işlemde) `TrainingMoveTargets.heldMove` programdan hesaplar
  ve `decision.weekly_call.held_move` (jsonb, göç V48, geri doldurma yok) sütununa `plan_before/plan_after` ile birlikte yazılır. Okuma saklı değerden yapılır:
  son karar olma şartı yoktur; Progress › Calls'tan açılan eski hold kararı da satırını söyler, program hedefi sonradan yeniden yazılmış olsa da. `held_move`
  null (V48'den önce uygulanmış karar, hold hedefi değiştirmemiş ya da hold dışı karar): satır yok, uydurulmaz.
- **Yeniden uygulama:** "Use this call" (DECLINED → APPLIED) hold'u yeniden kurar; o aradan program hedefi değişmiş olabilir (seans yazmış olabilir). Bu yüzden
  `held_move` yeniden hesaplanır ve yazılır: satır, kararın kullanıcı için gerçekten yürürlüğe girdiği andaki hedefi söyler. Aynı karar iki kez uygulanırsa
  ikincisi bir şey değiştirmez (`APPLIED` ise erken döner). Geri alma/reddetme `held_move`'u silmez: `inForce` onunla söylenir.
- **Hareket seçimi (kural değil, okuma):** hold'un hedefini gerçekten değiştirdiği hareketler arasından motorun "en çok takılan" saydığı. Sıra
  `TrainingStatuses.byStall` ile aynı kodla: takılan seans sayısı › takılma ayı › bu hafta geriye giden yük › ad (`TrainingStatuses.of` da bunu kullanır; kopya
  yok). Böylece nedenin "Sessions stalled: N" satırı ve hareket satırı aynı hareketten gelir. Aday havuzu motorunki: programdaki katalog bileşik hareketleri
  (`TrainingStatusReader.compoundLifts`); kullanıcının kendi hareketi aday değil (sözleşme `exerciseId` katalog kimliğidir). Yeni eşik, yeni parametre yok.
  Hold'un hedefi değiştirmediği hareket (hedef zaten son yükte ve aralık içinde), hiç kaldırılmamış hareket ya da uzun aradan sonra bir basamak hafif gösterilen
  hedef (K-531, `BackAfterBreak` programla paylaşılan tek okuma) satır olmaz. Tek satır gelir.
- **Modül sınırı:** decision zaten training'e bağlı (`allowedDependencies`); training yeni bir okuma servisi sunar (`TrainingMoveTargets.heldMove`), tersi
  bağımlılık yok.
- **Reddedilen:** (a) satırı okuma anında programdan hesaplamak ve yalnız son kararda göstermek (ilk sürüm): karar kaydı sonradan değişen programa bağlı olurdu,
  eski karar satırsız kalırdı; (b) birden çok hareket satırı (ekran ≤45 kelime, başlık "en çok takılan hareket"); (c) telefonun hedefi `Program`'dan hesaplaması
  (kural işletir, U1); (d) hold'un hedefi değiştirmediği hareket için eşit `before`/`after` satırı (değişiklik yok).

## Ek 8 · Dönüş ucu: GET/POST /v1/return (K-1020, 2026-10-15, agent, teknik; KABUL)
Ek 6'nın "tetik kayıt boşluğu, cevap sunucuda, aynı boşlukta yeniden sorulmaz" sözü şöyle yerine gelir:
- **Boşluk:** son kayıt = tartı (IMPORT hariç, ADR-053), öğün, seans (çalışma seti olan, K-431), kardiyo seansı; adım ve uygulama açılışı kayıt değil
  (ADR-041 #66). `awayDays` = kullanıcının günlüğünde son kayıt gününden bugüne gün (kayıt yoksa 0). `shouldPrompt` = `awayDays ≥ return_prompt_days` (7,
  `windows.yaml`, urun; 6 gün sormaz, 7 sorar) ve bu boşluk cevaplanmamış. Kaydı olmayan yeni kullanıcı dönen değil: sorulmaz. Tartı ve öğün yalnız
  HEALTH_DATA rızası varken okunur (rızasız sayılmaz; uç 403 vermez, çünkü seans ve kardiyo rızasız kayıttır).
- **Öneri:** program ile aynı tek fonksiyon `ReturnLoad.afterBreak`, son **seans** gününe uygulanır (boşluğa değil): son seans `return_step_back_after_weeks`
  hafta geride ise EASE_BACK, değilse (ya da hiç seans yoksa) PICK_UP. Böylece ekranın "Ease back in" önerisi ile programın gerçekten bir basamak hafif
  gösterdiği an aynı kuraldan çıkar; öğün/tartıyla sürdürülen ama 3 haftadır antrenmansız hesap da EASE_BACK görür.
- **Cevabın izi:** `training.return_answer` (hesap başına bir satır: seçim, `gap_from` = cevap anındaki son kayıt günü, zaman). Tablo training'dedir, çünkü
  PICK_UP bastırmasını programın okuyan taraf training'dir ve training → decision bağımlılığı yok (decision zaten training'e bağlı: uç decision'da,
  kayıt training'de, `ReturnAnswers`). Aynı boşluk = son kayıt günü cevaptaki `gap_from`'dan sonra değil. Yeni bir kayıt son kayıt gününü ilerletir: bir
  sonraki ≥7 günlük boşluk yeniden sorulur; ama cevaptan sonra `return_prompt_days` gün boyunca (cevap gününden) yeniden sorulmaz: geriye tarihli bir kayıt
  (unutulan öğün, geç girilen tartı) cevaplanan soruyu hemen geri getirmez. Aynı boşluğa ikinci POST cevabı değiştirir (çift dokunuş, vazgeçme); boşluk yokken POST CONFLICT (boşluğa
  bağlanmamış cevap, sonradan gelen boşluğu sessizce susturamaz).
- **PICK_UP bastırması:** `BackAfterBreak` PICK_UP cevabı varken ve molanın ölçüldüğü son seans günü `gap_from`'u geçmemişken uzun mola saymaz
  (`Program.backAfterBreak` yok, `nextLoadKg` hafifletilmemiş; çağrının hareket satırı da aynı okumadan). Yalnız dönüşteki ilk seans içindir: cevaptan sonra
  `return_step_back_after_weeks` (`ReturnLoad`'un kendi haftaları, yeni sayı yok) seanssız geçerse bastırma düşer ve `ReturnLoad` normal işler (süresiz geçerli
  bir PICK_UP kullanıcının aylar sonraki molasını da sessizce susturan bir kalıcı bastırma olurdu). Yeni bir seans da bastırmayı bitirir (son seans günü `gap_from`'dan sonra); sonraki
  uzun mola yeniden hafifletilir. EASE_BACK varsayılanı (basamak) olduğu gibi bırakır; REBUILD programa
  dokunmaz (telefon `POST /v1/program/generate` çağırır).
- **nextCallOn (Hero ile aynı gün):** Today'deki Hero en son kararın `nextReview`'unu gösterir; iki ekran farklı gün demesin diye tek fonksiyon
  (`ReturnGap.nextCallOn`): HEALTH_DATA rızası yoksa alan yok (nullable; "rıza yokken çağrı yok", uç 403 vermez); ilk çağrıdan önce ilk çağrının günü
  (`FirstWeekFacts.firstCallOn`); bu check-in haftasının çağrısı açıksa bugün; değilse en son kararın `nextReview`'u gelecekteyse o (geç yapılmış bir çağrı
  kendi gününde gözden geçirilir); o da yoksa sonraki check-in günü. `nextReview` ile check-in günü arasındaki genel tutarsızlık bu kararın konusu değildir
  (ayrı kart).
- **Reddedilen:** (a) cevabı decision'da tutup training'e `ObjectProvider` ile okutmak (CurrentPhase kalıbı): iki tablo ya da ters bağımlılık, tek satırlık
  bir iz için fazla; (b) öneriyi `awayDays`'e bağlamak: ekran EASE_BACK deyip program hafifletmezdi (ya da tersi); (c) cevabı zaman damgasına bağlamak
  (son kayıt gününe değil): yeni kayıtla yeniden sorma kuralı tarihten çıkarılamazdı.

## Ek 9 · Sonraki çağrı günü tek kaynak: `Decision.nextCallOn` (K-1024, 2026-10-15, agent, teknik; KABUL)
Motor `nextReview`'u çağrı günü + 7 (DeloadLadder, SafetyNet, PhaseGate) ya da karar penceresi (CalorieLadder) olarak yazar; check-in ise çağrının kaydedildiği
**check-in haftasının** bir sonraki check-in gününde açılır (`CheckInWeek.taken`: hafta, son çağrının haftasından bir hafta sonrasından önceyse kapalı). Perşembe
yapılan bir çağrının `nextReview`'u Perşembe + 7'dir, sonraki çağrı ise Pazartesi (Perşembe + 4) açılır; Hero ve karar ekranı yanlış günü söylüyordu. Veri penceresi
yetersizse çağrı yine açılır (motor "henüz karar yok" kaydeder), yani sonraki çağrı günü veri penceresine bağlı değildir.
- **İki alan, iki anlam.** `Decision.nextReview`: kararın dayandığı verinin yeniden bakıldığı gün (motorun penceresi); hafif hafta ve mola haftasının son günü de ondan hesaplanır
  (`DecisionService.onTheProgram`), bu yüzden **değişmez** (motor kuralı değil, U14 gerekmez). `Decision.nextCallOn` (yeni, zorunlu): sonraki çağrının gerçekten
  açıldığı gün, sunucuda tek fonksiyon: `CheckInWeek.nextCallOn(sonÇağrınınHaftası, checkInGünü)` = o haftadan bir hafta sonrasından itibaren (dahil) ilk check-in günü.
  Fonksiyon `CheckInWeek.taken` kuralının kendisinden türer (test: her check-in günü için hafta tam o günde açılır); check-in günü sonradan değişmişse kullanıcının şimdiki günüdür.
- **`GET /v1/return` `nextCallOn`** (Ek 8) aynı fonksiyonu kullanır: ilk karar öncesi `firstCallOn`; sonra en son çağrının `nextCallOn`'u gelecekteyse o, değilse bugün
  (hafta açık); rıza yoksa alan yok. Ek 8'deki "en son kararın `nextReview`'u" kuralı bununla değişti.
- **Telefon:** "sonraki çağrı / sonraki gözden geçirme" gösteren yerler (Hero, karar ekranı, neden ekranı, Today kartı, kilit ekranı) `nextCallOn` okur; telefon tarih hesaplamaz.
  Koç metinleri ("looked at again", "stands until its next look") verinin yeniden bakılışını anlatır; `nextReview` okumaya devam eder.
- **Reddedilen:** `nextReview`'u check-in gününe eşitlemek: hafif hafta ve mola haftasının uzunluğunu sessizce değiştirir (ve CalorieLadder'ın karar penceresini bozar).

## Ek 10 · Dönüş ve duraklatma ekranları telefonda (K-981, 2026-10-15, agent, teknik; KABUL)
Ek 6 ve Ek 8'in telefon yarısı. Telefon boşluk ve tarih saymaz; "ne zaman sor" yalnız `shouldPrompt`tır.
- **Ne zaman:** sekmeler ayaktayken (`(tabs)/_layout`; giriş yapmış, onboarding bitmiş, abonelik kapısı açık) uygulama açılışında ve öne her gelişinde
  `GET /v1/return` sorulur; `shouldPrompt` ise `/return` sekmelerin üstüne açılır. Cevap alınamazsa (bağlantı yok, hata) hiçbir şey sorulmaz, sonraki açılış tekrar
  sorar. Kullanıcı bir sekmede değilse (antrenman, tartı, öğün) üstüne açılmaz; soru sonraki açılışa kalır. Ekran kaydırarak kapatılmaz (`gestureEnabled: false`);
  sunucu artık sormuyorsa (başka telefonda cevaplandı) kendiliğinden kapanır. **Kaçış yolu her zaman var:** "Not now" (yükleniyor, hazır, hata; cevap giderken
  kapalı) hiçbir şey göndermeden ekranı kapatır, sunucu cevaplanmayanı sonraki açılışta yine sorar (#5 "öner ama dayatma").
- **Metin (Ek 6):** "Welcome back" + "{days} days away. Plan, logs and goals kept." Prototipteki "Nothing lost" yok; seri hakkında bir şey söylenmez. Önerilen seçenek
  (`suggested`) işaretli ve başta seçili; kullanıcı değiştirebilir. "Next call: …" `nextCallOn`'dan; alan yoksa (rıza yok) satır yok.
- **Cevap:** `POST /v1/return`; sonuç ekran değişimidir (toast değil, kullanıcı testi): EASE_BACK ve PICK_UP'ta geldiği ekrana döner (Bu hafta bugünün hedeflerini
  sunucudan okur); REBUILD'de programın kendi "Rebuild" sayfasına (`/edit-program?part=rebuild`) geçer: o sayfa programı değiştirmeden önce onay ister ve
  `POST /v1/program/generate`'i çağırır (yeni bir rebuild akışı yazılmadı).
- **Örnek ağırlıklar:** "Ease back in" satırı, program bir mola sonrası hafif hedef gösteriyorsa (`Program.backAfterBreak`), ilk iki bileşik hareketin `nextLoadKg`'ını
  sunucudan olduğu gibi söyler; aksi halde ağırlık söylemez (hedefler olağan hedeflerdir). Telefon ağırlık hesaplamaz. "Pick up where I left off" ağırlık söylemez ve
  "Targets unchanged." der: PICK_UP "programın hedefleri olduğu gibi" demektir, son setin yükü değil (`lastBestSet` bu yüzden kullanılmadı; "Same weights as
  before" bir söz olurdu, hedef son setin bir basamak üstü olabilir). "Ease back in" yalın satırı ("One step lighter.") K-1026 ile (EASE_BACK her sorulan boşlukta
  bir basamak hafifletir, `backAfterBreak` true) her boşlukta doğrudur.
- **Duraklat (#6):** beş durum döşemesi (yalnız ad; açıklama satırları 30 kelime bütçesi için ilk görünümden çıktı) + süre (Until I'm back / 3 days / 7 days;
  seçenekler `state.json`'dan). Sick ve In pain HEALTH_DATA rızası ister (K-1021): rıza yoksa aynı ekranda rıza adımı çıkar (weigh-in/meal ile aynı metin ve kalıp),
  "Allow and continue" rızayı kaydedip seçileni süresiyle birlikte bildirir; "Not now" seçimi koruyarak döşemelere döner. Sunucu CONSENT_REQUIRED derse (telefonun rıza
  bilgisi geride) aynı adım; genel hata cümlesi değil. Rıza az önce verilmişken sunucu yine isterse (sunucunun tutmadığı bir metin sürümü) döngü yok: seçim
  korunur, "Something went wrong on our side. Try again in a moment." denir ve olay adıyla bildirilir. Traveling, Busy week, New gym rızasız bildirilir.
- **Reddedilen:** (a) `Stack.Protected` ile açılış yönlendirmesi: sekmelerin kendisini gizler, soru sekmelerin üstünde olmalı; (b) dönüş ekranında kaçış yolu olmaması (ilk sürüm: "üç seçeneğin biri zaten hiçbir şey değiştirmiyor"): öneri dayatmaya döner; PICK_UP bir cevaptır (sunucu kaydeder, sorulmaz), "Not now" ise cevap vermemektir ve sunucu sormaya devam eder, ikisi ayrı şey; (c) rebuild'i dönüş ekranından
  doğrudan `generate` ile yapmak: programı onaysız değiştirir.

## Ek 11 · "Ease back in" seçimi kısa molada da bir basamak hafifletir (K-1026, 2026-10-15, agent, teknik; KABUL)
Ek 8, EASE_BACK cevabını "program zaten yapıyor" diye hiçbir şeye bağlamamıştı; ama boşluk `return_prompt_days` ile `return_step_back_after_weeks` arasındaysa (PICK_UP önerili) program hiçbir şey hafifletmez, ekran ise "One step lighter" der. ADR-077 #5 "öner ama dayatma": kullanıcının seçimi etkili olmalı.
- **EASE_BACK, PICK_UP ile aynı kayıt ve süre kuralıyla zorlamadır** (`ReturnAnswers.Answer.easesBackFrom`): cevabın kapsadığı boşluk için (yeni bir seans boşluktan sonra yapılmadıkça) ilk seansa dönüşte `ReturnLoad`ın mevcut tek basamağı uygulanır, program `backAfterBreak: true` döner; yeni sayı yok.
  Seans yapılınca (son seans boşluğun başladığı günden yeni) ya da cevaptan `return_step_back_after_weeks` sonra seanssız geçerse zorlama biter; o süre dolunca mola zaten uzundur ve `ReturnLoad` kendiliğinden hafifletir. İkinci bir basamak yoktur (uzun molada seçim hiçbir şey eklemez).
- Okuma noktaları tek: `BackAfterBreak.of(.., easedBack, ..)` programı (`ProgramController`) ve kararın tutulan hareketini (`TrainingMoveTargets`, K-1009) aynı karara getirir. REBUILD ve PICK_UP davranışı değişmez.


## Ek 12 · Check-in antrenman sorusuna "Haven't trained" (K-1031, 2026-10-15; ürün kararı: **Levent KABUL, 2026-10-15**; kural çıktıları ve kaynaklar agent, teknik)
- **Karar (Levent, 15 Eki):** antrenman sorusu ("How did training go this week?") dördüncü seçenek alır: **"Haven't trained"** (sözleşmede `NOT_TRAINED`). Kullanıcı başka yerde
  çalışsa ve kayıt tutmasa da cevaplayabilir; veri dürüst kalır. Motor bunu bir *eğilim* değil **olgu** olarak okur: "bu hafta antrenman yok". Tur 4 B14 (8 gün kayıtsız dönüşte
  "Getting weaker" sorulması) bununla kapanır. "Seans yoksa soruyu sorma" yolu (#595) geri alınmıştı: soru kalkınca motor `check_in_needed_training` kaydediyor, hafta
  "cevap bekleyen" bir metinle harcanıyordu. Soru kalır; sorulduğu yerde dürüst bir cevabı vardır.
- **Motor kuralı.** Antrenman cevabını okuyan tek yer `WeeklySpine` (iki nokta); `NOT_TRAINED` ikisinde de kaynaklı sonuç verir. Yeni karar kuralı eklenmedi, yalnız kaynaktaki
  kapının "geçilemez" durumu ve "hangi cevabı bekliyorduk" sorusunun dürüst cevabı yazıldı. Sonuç ortak: `NoDecisionYet`, kural `no_training_this_week`
  (`decision.no_decision_yet.no_training_this_week`), **bir cevap beklemez** (`WeeklySpine.missingAnswer` boş döner; soru sorulmaz).

  | Durum | `NOT_TRAINED` ile motor | Kaynak |
  |---|---|---|
  | Cut, kilo hedef yönde değil (sabit ya da ters), uyum ≥ `on_track_min_ratio` | `NoDecisionYet / no_training_this_week`; **kalori inmez** (ve çıkmaz) | G7 K-98 (kalori ancak antrenman hâlâ çıkıyorsa iner, çıkmadığı noktada yükselir; antrenman yoksa kapı geçilemez, "çıkmadı" da okunmadı) |
  | Cut, uyum < `on_track_min_ratio` | `FixAdherence` (değişmedi: uyum kapısı antrenmandan önce) | G2 K-60 |
  | Bulk, kilo hedef yönde değil | `CaloriesNeeded` yukarı (değişmedi; antrenman koşulu yok) | G3 K-10, ADR-021 #3 |
  | Kilo hedef yönde, görünüş WORSE (cut ya da bulk) | `NoDecisionYet / no_training_this_week`; recovery sorulmaz, okunmaz; "genetik limit → kaloriyi geri çek" dalı açılmaz | 03 §2.4 (ağaç: antrenman KÖTÜ → antrenmanı düzelt; İYİ → iyileşme → genetik limit; olgu "antrenman yok" ikisi de değil) |
  | Kilo hedef yönde, görünüş BETTER / SAME / fotoğraf yok | `Continue` (antrenman okunmaz, soru sorulmaz; değişmedi) | 03 §2.4, ADR-021 #4 |
  | Veri yetersiz, bildirilen durum, güvenlik, 1. hafta (spine'dan önceki kapılar) | antrenman cevabı okunmaz (değişmedi) | ilgili kapının kendi kaynağı |

  Bu satırlardan "NoDecisionYet" olanlar kaynakta bir *eylem* bulunmadığı yerlerdir (U14: kaynaksız kural yok; U3: yetmeyen veriyle karar yok). Tek kaynaklı olgu şudur: kalori kararı
  antrenman performansına bağlı (K-98), performans bu hafta ölçülemez. Kaynak "antrenman yoksa şunu yap" demiyor; ürün de demez.
  Kaynak etiketi: cut kapısında K-98 `[tecrübe]`, görünüş-WORSE dalında 03 §2.4 `[tecrübe]`.
- **RECOVERY `NOT_TRAINED`'dan sonra gelmez (motor okumaz).** Ağacın iyileşme dalı "antrenman İYİ" dalının altındadır (03 §2.4: antrenman KÖTÜ → antrenmanı düzelt; İYİ → iyileşme). Antrenman yokken
  `FixRecovery` ya da "genetik limit" için kaynak yok, yani cevap sonucu değiştirmez; motor cevap aramaz. `DECLINING`'de de motor iyileşmeyi okumaz (`FixTraining` önce gelir): aynı kalıp.
  Soru listesi tek ekranda ve cevaplar bilinmeden gelir, bu yüzden sözleşmeye `Question.onlyAfter {kind, choices}` eklendi: sunucu, sonraki soruyu yalnız öncekinin hangi seçeneklerinden sonra
  hâlâ gerektiğini söyler (`CheckInQuestions.onlyAfter`: her seçenek için motor yeniden koşulur; soru o seçenekten sonra hâlâ soruluyorsa seçenek listede kalır; alan yalnız liste tüm
  seçeneklerden kısaysa yazılır). `RECOVERY` bugün `onlyAfter: {TRAINING, [IMPROVING, STABLE]}` taşır. Telefon yalnız bu koşulu okur (U1): cevap listenin dışındaysa soruyu göstermez,
  zorunlu tutmaz, göndermez; önceki cevap verilmeden soru görünür kalır. Böylece "Haven't trained" ya da "Getting weaker" seçen kullanıcıdan alakasız bir iyileşme cevabı istenmez.
- **Kullanıcı ne görür.** *Bu hafta:* "Haven't trained" seçip gönderince çağrı kaydedilir (her çağrı gibi): ekran **"No call this week."**, tek neden satırı ("No training this week,
  so no lifts to read."), "Next call: <sunucunun `nextCallOn`'u>" gösterir. Plan, kalori ve program **değişmez**. Check-in bu hafta için kapanır (K-212: haftada bir çağrı);
  yani hafta, kullanıcının kendi cevabıyla "kaydedilmiş, karar yok" olarak harcanır; metin bunu söyler, bir soru ya da kayıt bekliyormuş gibi davranmaz ("answer ... and the call follows" yok).
  *Gelecek hafta:* check-in bir sonraki check-in gününde (`nextCallOn`) yeniden açılır, aynı sorular o günkü veriye göre sorulur; o hafta antrenman yapıldıysa gerçek cevap verilir ve
  motor olağan yolundan karar verir. Önceki hafta bir şey taşınmaz (K-98'in "performans" ölçütü haftalıktır; cevap geçmişe yazılan bir borç değildir, U7).
- **Reddedilen:** (a) `NOT_TRAINED` → `FixTraining`: antrenmanı "düzelt" demek eylem uydurur ve antrenmansız haftayı suçlar gibi okunur (U7); K-98'in "performans düştü" koşulu okunmadı.
  (b) `NOT_TRAINED` → kalori inişi / çıkışı: K-98 ikisini de performansa bağlar. (c) `NOT_TRAINED`'ı `STABLE` saymak: olmayan veriyi "iyi" yapar (U1/U3). (d) Soruyu seans yokken
  hiç sormamak (#595): kararı sessizce `check_in_needed_training` ile harcar. (e) `NOT_TRAINED`'a özel sonraki hafta bayrağı: kaynaksız durum taşır.
- **Sınır / risk (Levent'e not):** uyum karar penceresi (21/28 gün) üzerinden sayılır; tek antrenmansız hafta uyumu genelde `on_track_min_ratio` altına indirmez, yani o hafta
  "No call this week." çıkar. Antrenman haftalarca yoksa planlanan seanslar uyumu düşürür ve `FixAdherence` (K-60) önce gelir; ama kayıt tutmadan başka yerde çalışan kullanıcıda
  uyum düşük görünüp aynı yola girebilir. Kaynak bu durumda ek bir eylem vermiyor; kaynak/ürün kararı çıkarsa (ör. "N hafta antrenmansızsa şunu öner") ayrı ADR.
- **Kod:** `CheckIn.Training.NOT_TRAINED`, `WeeklySpine` (`NO_TRAINING_THIS_WEEK`, iki yer), sözleşme `DecisionBasis.answers.training` ve `Question.onlyAfter` (`CheckInQuestions.onlyAfter`, `shownQuestions` telefonda), `data/copy/en.json`
  (`checkIn.choice.training.not_trained`, `decision.rule` / `ruleShort` / `no_decision_yet.no_training_this_week`), `word-budgets.json`. Soru listesi `CheckInQuestions.choices` zaten
  enum'dan türer (yeni seçenek kendiliğinden gelir). Telefon yalnız gönderir; seçeneğin metni `checkIn.choice.training.<seçenek>`.
- **K1 notu:** iki testin beklentisi bu karardan değişti, hiçbiri gevşemedi: `QuestionBudgetTests.aQuestionSaysWhyItIsAsked` ve `CheckInQuestionsApiTests` (antrenman sorusunun seçenek listesine
  dördüncü seçenek eklendi).
