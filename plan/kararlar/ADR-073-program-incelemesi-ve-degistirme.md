# ADR-073 · Program: kendi programı, program incelemesi, bugünü ve programı değiştirme, hareket değiştirme
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (tur 3 notu "programımı değerlendirmedi, ikna etmeye çalışmadı"; "dayatma yok, özgürlük";
  prototip onayı); öneren: agent

## Bağlam
Bugün kendi programı yalnız elle girilebiliyor (`PUT /v1/program`, `OwnProgram`). Strong/Hevy içe aktarma yalnız **geçmiş** olarak giriyor
(ADR-053), program olmuyor. Programı Güray kurallarına göre değerlendiren bir motor yeteneği yok: `weekly_sets_per_muscle` ve sıklık parametreleri
yalnız şablon testinde okunuyor (`ProgramTemplateTests`). Hareket kataloğunda `muscles`, `equipment` ve `alternatives` var (`data/exercises/`).
Seansta hareket değiştirme düğmesi yok; bugünü kısaltma, taşıma ve atlama da yok.

## Karar sürücüleri
- Kullanıcı da karar verir: uygulama önerir, dayatmaz (Levent, tur 3).
- Her öneri kaynaklı bir kurala bağlı (U14); arayüzde kişi adı yok, kaynak türü "Coaching rule".
- Telafi yok, aynı hafta içinde taşıma serbest (ADR-071 #3).

## Karar
1. **Kendi programı iki yoldan girer** (`ob-own`): (a) Strong/Hevy içe aktarma: geçmişin yanında son haftalardaki rutinlerden **program
   taslağı** çıkarılır (rutin adı → gün, hareketler, set sayısı, görülen tekrar aralığı, hafta günü düzeni); kullanıcı taslağı görür ve onaylar.
   Katalogda eşleşmeyen hareket kendi hareketi olur (`OwnMoveForm` kalıbı). (b) Elle girme (bugünkü `OwnProgram`).
2. **Program incelemesi** motorda saf bir kuraldır (`kural-ekle`). Girdi program, çıktı en çok `review_max_suggestions` (3) öneri, öncelik
   sırasıyla:
   - **Gün sayısı > 5** → 5'e indir (G6 K-36 "6-7 önerilmez", G2 K-36, G7 K-79).
   - **Kas başına haftalık set > 15** → 12'ye kırp (G1 K-11: üst sınır seviyeye göre 12-15).
   - **Kas başına haftalık set < 4** (kolda < 6) → alt sınıra tamamla, katalogdan o kasın izolasyon hareketiyle (G1 K-11, K-61).
   - **Kas başına haftada 1 kez** (set ≥ 4 iken) → iki güne böl (G1 K-22).
   - **Tekrar aralığı K-21 dışında** → bileşikte 6-10, izolasyonda 8-12 (mevcut parametreler).
   Set sayımı birincil kasa göre (şablon testleriyle aynı). Her öneri somut bir değişiklik taşır ("diff"); uygulanınca inceleme yeniden koşar
   ve o bulgu kalkar. Öneri bulunamayan bulgu gösterilmez.
3. **Kullanıcı seçer:** her öneri aç/kapa; "Use mine with N changes" ya da "Keep mine as is". Hangisi seçilirse seçilsin pazartesi kararları
   çalışır. Uygulanan değişiklikler Antrenman sekmesinde "N changes applied · Undo" ile geri alınır.
4. **Programı düzenle** (Antrenman › Edit): günler (seç, taşı; seanslar yeniden yerleşir), hareketler (ekle, çıkar, değiştir; kas aralık dışına
   düşerse inceleme işaretler), kardiyo (ADR-074), split (full body / upper-lower / push-pull-legs; inceleme yeniden koşar), "Rebuild for me"
   (bugünkü üreteç). Program kaynağı `GENERATED`/`OWN` korunur; düzenlenen üretilmiş program `OWN` olmaz, değişiklik kaydı tutulur.
5. **Bugünü değiştir** (Antrenman › Change):
   - **Short on time:** programdaki sıraya göre ilk `short_session_moves` (3) hareket; seans haftayı sayar. Ürün kararı (`tag: urun`).
   - **Gym is busy:** hareket değiştir (madde 6).
   - **Move it:** yarına taşı; aynı haftanın içinde kalır (pazar sınırını geçmez). Telafi değil, taşıma (ADR-071 #3).
   - **Skip today:** "No catch-up. Monday reads what happened." Kaçan seans eklenmez; tutarlılık olduğu gibi sayar.
6. **Hareket değiştir:** seçenekler katalogdaki `alternatives`, aynı kas ve kullanıcının salonundaki ekipmanla süzülür (ADR-032). Seansta
   değiştirme yalnız o seans içindir; Antrenman sekmesinden değiştirmede "Today only / From now on" sorulur. Değiştirilen hareketin kendi
   geçmişi ve hedefi vardır (çift ilerleme hareket başına).

## Neden
Kendi programı olan tecrübeli kullanıcı, programı değerlendirilmeden reddedildiğini hissediyor (Levent, tur 3). İnceleme Güray'ın 2026
hacim, sıklık ve tekrar kurallarını kullanıcının kendi programına uygulayıp ikna eder ama zorlamaz. Bu, U2'nin ruhuyla tutarlı: öneri veriye
dayanır, ısrar etmez. Bugünü değiştirme seçenekleri kategorinin normu (Fitbod, Hevy) ve "dayatma yok" ilkesi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kendi programını olduğu gibi almak, inceleme yok | Tur 3'ün ana eleştirisi |
| İncelemeyi zorunlu uygulamak | Dayatma; kullanıcı kaçar |
| Prototipteki "hamstring 4 set aralığın altında" | Yanlış: G1 K-11 alt sınırı 4; işaret < 4'te |
| İçe aktarmayı yalnız geçmiş bırakmak | Kendi programı olanı elle 21 hareket girmeye zorlar |

## Sonuçlar
- Olumlu: tecrübeli kullanıcı için giriş kapısı; motorun hacim parametreleri ilk kez çalışma zamanında kullanılır.
- Olumsuz: içe aktarmadan program çıkarmak sezgiseldir (rutin adı olmayan geçmişte zayıf); taslak onayı bu yüzden zorunlu.

## Geri dönmenin maliyeti
Orta: yeni motor kuralı, iki uç (inceleme, öneri uygulama), içe aktarma genişlemesi.

## Etkilenen
`backend` engine (yeni `ProgramReview`), training (öneri uygulama, değişiklik kaydı, geri alma), import (program taslağı), `contracts/openapi.yaml`
(review, apply, undo, swap kapsamı, today change), `data/parameters/training.yaml` (`review_max_suggestions`, `weekly_sets_trim_to`,
`training_days_max`, `short_session_moves`), mobil Antrenman sekmesi, `ob-own`, `ob-review`, ADR-053, ADR-032.

## Doğrulama
`ProgramReview` tablo testleri (her kuralın eşiğinin altı, kendisi, üstü; öncelik ve en çok 3 öneri) + özellik testi (öneri uygulanınca aynı
bulgu tekrar çıkmaz; determinizm) · içe aktarma testi: rutinli Strong dosyasından taslak program · taşıma testi: pazar sınırı · değiştirme
testi: seçenekler salon ekipmanıyla süzülür.

## Ek 1 · İnceleme uçları: kimlik, bayatlık, değişiklik kaydı, geri alma (K-956, 2026-10-08, agent, teknik)
- **Uçlar:** `GET /v1/program/review`, `POST /v1/program/review/apply {reviewId, suggestionIds}`, `POST /v1/program/review/undo {changeId?}`.
  İnceleme ayrıca sunucunun döndürdüğü her `Program`'da (`review`, isteğe bağlı alan): program her değiştiğinde inceleme yeniden koşar.
- **Kimlik:** öneri kimliği bulgu + konusu (`TOO_MANY_SETS:chest`, `REP_RANGE:squat`, `TOO_MANY_DAYS`); inceleme kimliği programın içeriğinin
  SHA-256'sı (günlerin sırası, hareket, set, tekrar aralığı; ad, hafta günü, satır ve hedef değil). Uygulama bu kimliği geri gönderir;
  program o zamandan beri değiştiyse ya da seçilen öneri şimdiki incelemede yoksa **CONFLICT (409)**, hiçbir şey değişmez (projenin "durum
  altından kaydı" kodu; ayrı hata kodu açılmadı).
- **Uygulama:** seçilenler incelemenin sırasıyla, her biri ayrı değişiklik; her birinden sonra inceleme yeniden koşar, öneri kimliğiyle yeniden
  bulunur (öncekinin düzelttiği atlanır). Değişiklik yalnız diff'in dediğine dokunur: diğer hareketler satırını (id) ve sonraki hedefini (başlangıç
  ağırlığı ya da seansın) korur; seti değişen ya da taşınan hareket hedefini korur; **tekrar aralığı değişen hareketin hedefi silinir** (eski
  aralık içindi); eklenen hareket yeni satırdır. Hiç hareketi kalmayan gün gider (fazla seti kırpmak bir günü boşaltabilir). Kaynak
  (`GENERATED`/`OWN`), program kimliği, günlerin kimliği ve `created_at` korunur; gün sayısı değişirse `program_history`'ye şimdiden geçerli
  satır (K-535).
- **Kullanıcının kendi hareketleri** (`custom:` kimlik, katalogda yok; Levent kararı, PR #460, 2026-10-08): incelenmez, hiçbir kasa sayılmaz,
  hiçbir diff dokunmaz, uygulama ve geri almada olduğu gibi kalır; programın geri kalanı incelenir ve `ProgramReview.notReviewedMoves` kaç tane
  olduğunu söyler. Günü birleştirilen günde kendi hareketi varsa gün o hareketle kalır. **Bilinen sınır:** yalnız kendi hareketiyle çalışan bir
  kas "çok az set" önerisi alabilir; kullanıcı o öneriyi kapatır.
- **Kayıt (V39 `training.program_review_change`):** her değişiklik sırasıyla (`seq`), gösterildiği haliyle öneri ve öncesi/sonrası program (JSON;
  karar modülündeki `plan_before/plan_after` kalıbı). Geri alınan satır kalır (`undone_at`). Program bütün olarak değişince (`PUT`, `generate`)
  kayıt silinir. Hesap silmede gider, dışa aktarımda `programReviewChanges`.
- **Geri alma:** bir değişiklik geri alınınca program ondan önceki haline döner ve **sonraki değişiklikler yeniden uygulanır** (aynı apply yolu);
  `changeId` yoksa hepsi. Sonraki değişikliklerden **artık uygulanamayan** (bulgusu geri alınanla birlikte kalktı) onunla birlikte geri alınır
  ve yanıtta `alsoUndone` ile adı verilir: uygulama kaç değişikliğin gittiğini söyler (düzenleyici kararı, teknik). Her hareket şimdiki satırının
  hedefini taşır (o arada seans hedef koymuş olabilir), aralığı aynıysa; yeniden eklenen hareket aynı gündeki aynı hareketin satırını alır. Son
  değişiklikten sonra program başka yoldan değiştiyse geri alma CONFLICT (koyacağı eski hal o değişikliği silerdi).
- **Eşzamanlılık:** uygulama ve geri alma programın satır kilidini (`for update`) alıp okur ve yazar; seans bitişi (ve bitmiş seansın
  düzeltilmesi) hedefleri yazmadan önce aynı kilidi alır, böylece yeni hedef yeniden yazılan programda kaybolmaz.
- **Reddedilen:** yalnız sonuncuyu geri alma (yığın; "her biri geri alınabilir" prototipiyle çelişir) · ters diff saklamak (birleşen günlerde
  kırılgan) · sürüm sayacı sütunu (içerik kimliği şemasız ve geri alınınca eski inceleme yeniden geçerli olur) · uygulanamayan sonraki
  değişikliği sessizce düşürmek (kullanıcı neyin gittiğini bilmez).
- **Levent'e açık:** (1) programda o kasın izolasyon hareketi yoksa katalogda kimliğe göre ilki eklenir (hamstring → `lying_leg_curl`); kas başına
  tercih edilen hareket veriye konmalı mı. (2) Üretilmiş şablonların kendi incelemesinden geçmesi Levent kararıyla ayrı görev (bu PR değil).

## Ek 2 · İçe aktarmadan program taslağı (K-957, 2026-10-08, agent, teknik)
- **Taslak telefonda çıkar; sunucuda uç, kayıt, göç yok.** Dosya telefonda okunur ve eşlenir (ADR-053 #4-5); taslak aynı okumadan saf bir
  fonksiyonla çıkar (`apps/mobile/src/import/draft.ts`, ağa giden hiçbir şey almaz: `import-stays-on-phone` testi). Rutin adları ve eşlenmemiş
  hareket adları kullanıcı onaylayana kadar telefondan çıkmaz; reddedilen taslak iz bırakmaz. Onayda program mevcut `PUT /v1/program` ile
  `OWN` kaydedilir. Sunucu ucu neden değil: ayrıştırıcı ve eşleyici telefonda, sunucuda taslak için rutin adlarının ve eşlenmemiş adların
  gönderilmesi gerekirdi (ADR-053'ün "yalnız eşlenmiş setler" ilkesinden geri adım); bu ADR'nin "Etkilenen" listesi de taslak için uç saymıyor.
- **Rutin adı yalnız istenince okunur:** `readExport(text, { routines: true })` seansa `routine` ekler (Strong `Workout Name`, Hevy `title`;
  H13 B2-B3'te doğrulanmış sütunlar; bu "seans adı"nın uygulamadaki rutin/şablon adı olduğu `[doğrulanmadı]`: gerçek dosyada rutinsiz seansa
  ne yazıldığı görülmedi). Geçmiş içe aktarmanın okuması değişmez: adı taşımaz, sunucuya giden gövdede yoktur. Büyük-küçük harf ve boşlukla
  ayrılan adlar (rutin ve hareket) tek addır; ilk yazılışı gösterilir.
- **Kural** (sayılar D1): pencere, dosyanın son seansının günüyle biten `program_draft_weeks` hafta. Adı olan ve pencerede en az
  `program_draft_routine_min_sessions` kez yapılan rutin programa girer, **haftada yapıldığı kadar gün** olarak (seans sayısı / ilk ve son
  seansın haftaları arasındaki hafta sayısı, yuvarlanmış, en az 1; aynı ad ve hareketler: haftada iki kez Upper iki gün, full body
  pazartesi/çarşamba/cuma üç gün). Hafta günü: rutinin yapıldığı haftaların en az `program_draft_weekday_min_share` payında düştüğü günler,
  payı büyükten küçüğe, gün sayısı kadar; o sayının sınırında eşit paylı günler ve eksik kalan günler günsüzdür (haftada bir kez, pazartesi
  ve perşembe dönüşümlü: tek, günsüz gün). İki gün aynı hafta gününü isterse payı yüksek olan alır, diğeri günsüz kalır (programda bir hafta
  günü bir kez). Fazlaysa `program_days_max` gün kalır: her gün, rutinin seanslarının gün sayısına bölümü kadar seans sayılır, azı düşer.
  Günün hareketleri:
  rutinin seanslarının en az `program_draft_move_min_share` payında çalışma seti olanlar, seanstaki ortalama sıralarıyla. Set: seans başına
  çalışma seti sayısının ortancası (çiftte küçüğü). Tekrar aralığı: çalışma setlerinin ortadaki `program_draft_reps_middle_share` payının
  düştüğü aralık (en hafif ısınma ya da tek kötü set aralığı germez); `program_draft_rep_span_min`'den darsa üstten açılır (görülen alt sınır
  kalır, ilk seansta yük zıplamaz). Isınma (Hevy `warmup`) sayılmaz;
  Strong ısınmayı işaretlemez (H13 B2), setleri çalışma sayılır: kullanıcı taslakta düzeltir. Sınırlar sözleşmenin `OwnProgram`'ı
  (`program_days_max`, `program_day_moves_max`, `program_move_sets_max`, `program_day_name_max_chars`, tekrar `set_max_reps`): taslak her
  zaman kaydedilebilir.
- **Eşlenmemiş hareket:** eşleme ekranında bir harekete bağlanmamış ad taslakta adıyla (`ownName`) gelir; onayda OwnMoveForm ile (motorun
  soruları kullanıcıya, U1) kendi hareketi olur, programa onun kimliğiyle girer (`ownProgram(days, own)`: kimliği olmayan ad varken gövde yok).
  Taslak anında oluşturulmaz: reddedilen taslak kendi hareketi de bırakmaz. Kullanıcının eşlemede "dışarıda bırak" dediği ad taslağa da
  girmez (ayrı küme olarak verilir; eşleme haritasında "seçilmedi" ile aynı `null`).
- **Taslak çıkmazsa** (adlı seans yok ya da pencerede hiçbir rutin yeterince tekrarlanmamış): `{ kind: 'noRoutine' }`; ekran (K-968) elle
  girişe ("Type it in") yönlendirir.
- **Kendi hareketi programda** (Levent KABUL, 2026-10-08): `PUT /v1/program` hesabın kendi hareketini alır, başkasınınkini reddeder; motor
  ona kural uygulamaz. Ayrıntı ADR-035 Ek 1.

### D1 · Taslak sayıları (hepsi `urun`: araştırma kaynağı yok, ürün sezgisi; kullanıcı taslağı onaylar ve düzeltir)
| Parametre (`import.json`) | Değer | Neden |
|---|---|---|
| `program_draft_weeks` | 4 | Bir ay: haftalık program 4 kez, dönüşümlü (A/B) program ikişer kez görünür; daha eskisi bugünkü program değil |
| `program_draft_routine_min_sessions` | 2 | Bir kez yapılan rutin (tek seferlik "Arms", deneme) program günü değil; iki kez tekrar |
| `program_draft_move_min_share` | 0,5 | Seansların yarısında yapılan hareket rutinin parçası; daha azı tek seferlik değiştirme |
| `program_draft_weekday_min_share` | 0,5 | Yapıldığı haftaların yarısında o gündeyse düzen var, o gün rutinin günlerinden biridir (haftada yapıldığı kadar gün, en büyük paylar); azı rastgele, gün kullanıcıya bırakılır |
| `program_draft_reps_middle_share` | 0,5 | Ortadaki yarı (çeyrekler arası): Strong'un işaretsiz ısınması ve tek tük set aralığı germez |
| `program_draft_rep_span_min` | 2 | Çift ilerlemenin tırmanacak yeri olsun (K-109); tekrarlar değişiyorsa. Hep aynı tekrar sabit hedeftir (hep 8 → 8×8; Ek 4, K-991) |

## Ek 3 · Bugünü değiştir ve hareket değiştir: uçlar ve saklama (K-964, 2026-10-08, agent, teknik)
- **Uçlar:** `POST /v1/program/today {programDayId, change: SHORT|MOVE|SKIP}`, `POST /v1/program/swap {programDayId, exerciseId, to,
  scope: TODAY|FROM_NOW_ON}`; ikisi de `Program` döner. `Program.week`: bu haftanın seansları (pazartesi-pazar, tarihle; taşınan `moved`,
  atlanan `skipped`, kısa `short`, o günün hareketleri `exerciseIds`, bugünlük değişimler `swaps`: her biri yerine geçen hareketin tam
  `PlannedExercise` görünümüyle, planlı hareketin set ve aralığı, hedefsiz, kendi geçmişi ve seans içi tablosuyla, "From now on" satırı
  gibi; ADR-075 #3). `PlannedExercise.swapOptions`: program okunurken hesaplanır (salonda
  çevrimdışı seçilebilsin; telefon hesap yapmaz).
- **Saklama (V41 `training.session_change`):** bir program gününün **o haftaki** seansı başına tek satır (hesap, gün, haftanın pazartesisi):
  taşındığı gün, atlandı mı, kısa mı, bugünlük değişimler (JSON, planlı hareket → yerine geçen). Program değişmez; `program_history`'ye
  satır girmez → tutarlılık ve planlı seans sayısı (`PlannedSessions`) aynı kalır. Tutarlılık seansları haftada sayar: taşınan seans yeni
  gününde yapılınca o haftayı sayar, kısa seans da bir seanstır, atlanan seans yapılmamış seanstır (telafi eklenmez, yeniden planlanmaz;
  U7, ADR-071 #3). Program bütün olarak değişince (`PUT`, `generate`) satırlar silinir (gün kimlikleri yenidir). Hesap silmede
  gider, dışa aktarımda `sessionChanges` (veri envanteri).
- **Taşıma:** yalnız bugünün seansı, yarına; pazarı geçmez (hafta `Consistency.WEEK_STARTS_ON` ile, kullanıcının saat diliminde). Yarında
  başka seans varsa o da bir gün kayar, zincirleme ("The week re-lays itself", prototip); biri pazarı geçecekse taşıma CONFLICT, hiçbir şey
  değişmez. Taşınan seans yeni gününde **taze** bir seanstır: kısa sürüm de bugünlük değişimler de onunla gitmez (o günün salonu, o günün
  zamanı; en basit dürüst kural, düzenleyici kararı). **Reddedilen:** dolu güne üst üste iki seans koymak (aynı gün iki antrenman), dolu
  güne taşımayı yasaklamak (prototipin "re-lays" metniyle çelişir).
- **Başlamış seans:** o program gününün bugün (kullanıcının saat diliminde) başlamış bir antrenmanı varsa (sürüyor ya da bitti) taşıma,
  atlama ve bugünlük değişim CONFLICT: yapılan seans yapılmıştır, seans içinde değiştirme seti başka hareketle yazmaktır. Kısa sürüm serbest
  (seansın ortasında zaman daralabilir).
- **Planlı günler (`PlannedDays`, `TrainingStatusReader.plannedDays`):** taşınan seans haftasında yeni gününde planlıdır, eski hafta
  gününde değil; atlanan planlı kalır (yapılmamış seans). Kaçan seans sorusu (`Prompts.Facts.plannedOn`, K-512) ve ilk hafta
  (`FirstWeekFacts`) bunu okur: seansını yarına taşıyan, taşıdığı gün "iki seans kaçırdın" sorusunu almaz.
- **Hareket değiştirme seçenekleri:** katalogdaki `alternatives` (sırasıyla), sonra **aynı birincil kas ve aynı türden** (bileşik/izolasyon)
  katalog hareketleri kimliğe göre; salonun **olmadığını söylediği** ekipman çıkar, o günde zaten olan hareket çıkar. Aynı tür şartı G6 K-35'ten (bileşik değişmez, izolasyon serbest:
  bileşiğin yerine izolasyon önerilmez); katalog `alternatives` elle seçildiği için olduğu gibi. Kullanıcının kendi hareketinin seçeneği
  yoktur (boş liste). **Bilinmeyen ekipman yok sayılmaz** (düzenleyici kararı, K-964 incelemesi; ilk sürüm `LoadSteps.knows` ile
  makine/kabloyu ve plakasız kızağı düşürüyordu): ADR-032'nin salon profili "makine yok", "kablo yok", "kızak yok", "dambıl yok"
  diyemez (boş adım ya da liste yalnız girilmemiş olabilir), yalnız barı boş bırakarak "barbell yok" der (`GymInput.barKg`). Bu yüzden
  süzgeç yalnız barsız salonda barbell hareketlerini çıkarır; salon yoksa süzgeç yok.
- **"Today only":** yalnız bugüne düşen, başlamamış seansta (CONFLICT değilse); seçenekler seansın önceki bugünlük değişimlerden
  sonraki hareketlerine göre (aynı hareket seansta iki kez olmaz); planlı hareketin kendisine geri değiştirmek değişimi kaldırır.
  Seans içi değiştirme ayrıca bir şey istemez (set başka hareketi adlandırır, K-210).
- **"From now on":** programda o günün o hareketinin satırı yeni hareketle değişir (aynı set ve tekrar aralığı, **hedef yok**: yeni hareketin
  kendi geçmişi ve hedefi, sıradaki seans koyar); diğer her hareket satırını ve hedefini, program kaynağını, günlerini ve kimliklerini korur
  (inceleme uygulaması gibi, `ProgramStore.rewrite` + satır kilidi). Bu haftanın o harekete ya da yeni harekete giden bugünlük değişimi
  biter (plan artık odur; yoksa sonraki bir değişimle eski bugünlük değişim geri dirilirdi). **İncelemenin değişiklik kaydı silinir:** kayıttaki "sonrası" programlar
  artık bu programla eşleşmez ve geri alma CONFLICT verirdi; düzenleme artık programın kendisidir ("N changes applied · Undo" kalkar).
  Reddedilen: değişimi kayda ayrı bir değişiklik olarak yazmak (kayıt yalnız inceleme önerilerini tutar, geri alma yeniden uygulama yoluyla
  çalışır; değişim bir öneri değildir) · kayıttaki programları yeni hareketle yeniden yazmak (kırılgan, geri alınan eski hal yeni hareketi
  silerdi).

## Ek 4 · Sabit tekrar (5×5): en az = en çok (K-991, 2026-10-08, agent, teknik; ürün kararı Levent 8 Eki "Sabit tekrar da olsun")
- **Sözleşme:** `RepRange` min ≤ max; min = max sabit tekrar hedefidir (5×5). Yalnız kullanıcının kendi programında çıkar; üretilen şablonlar
  aralık vermeye devam eder (`ProgramGenerator`, `rep_range_*`). Veritabanında V8'in `rep_max > rep_min` denetimi `rep_max >= rep_min` olur (V43).
- **Motor (H3 B4'ün tek basamaklı hali):** her çalışma seti hedef tekrara ulaşınca bölgenin en küçük yük basamağı eklenir, tekrar aynı kalır
  (aralığın altı = üstü). Ulaşamayan seans **aynı yükte aynı tekrarı** hedefler: tekrar basamağı yok (aralıkta "en zayıf setin bir fazlası";
  sabitte tırmanılacak aralık yok). Kaynak H3 B4 (Plett/Schoenfeld 2022: yük ilerlemesi tekrar ilerlemesi kadar işe yarıyor). Kartta "G1 K-109"
  yazıyor: G1'de K-109 yok; koddaki K-109 çift ilerlemeyi kuran görevin numarası. Teknik kapısı (G6 K-31), plato (H3 B5) ve deload merdiveni
  (G7 K-68) tekrar aralığını okumaz: değişmez.
- **Salonda sonraki yük yoksa ya da çok uzaksa** (K-414, K-430): aralıkta olduğu gibi tekrar, sabit tekrarın üstüne birer birer çıkar, tavanda
  durur (`rep_ceiling_above_range`, K-534, `rackEnds`). L3 §5 Y7 "mümkün değilse tekrar artışına çevrilir". Reddedilen: aynı yükte aynı tekrarı
  sonsuza dek hedeflemek (salon yüzünden plato; motor bilmediği yerde söyler, U3).
- **Diğer yerler, sabit hedefte:** başlangıç ağırlığı kuralı aynı (aralığın altı `starting_weight_reps`'ten büyük değilse hedef: 8 kez kaldırılan
  yük 5×5'i başlatır, 10×10'u başlatmaz) · seans içi tablo (hafif/ağır, kalibrasyon) aralığı okumaz; "bütün setler tepede" sonraki yükü sabit
  tekrarda bütün setler o tekrarda demektir · tutulan hedef (K-110) sabit tekrarda gösterilir · ilerleme efor satırları (STUCK, EASIER,
  REPS_RISING) aralığı okumaz · tekrarı yazan her yer (Antrenman satırı, plan, içe aktarma taslağı, düzenleyici) tek yardımcıdan geçer (`apps/mobile/src/train/reps.ts`): "5 reps", "3 × 5", "5-5" değil.
- **Program incelemesi:** sabit hedef her aralık gibi K-21'e göre okunur. Bileşikte 6-10 dışındaysa (5×5) öneri çıkar (6-10'a), kullanıcı kapatır;
  içindeyse (8×8, izolasyonda 10×10) bulgu yok. Neden: K-21 tekrar **sayısını** söyler (düşük tekrar eklemi ve tendonu zorlar), aralığın
  genişliğini değil; sabit oluşu kendi başına bulgu değil. Reddedilen: sabit hedefi hep işaretlemek (dayatma, ADR-073 sürücüsü) · 6-10 dışını
  sabitte işaretlememek (5×5 bileşikte K-21'in tam söylediği şey).
- **Düzenleyici:** en az tekrar en çoğa, en çok en aza kadar adımlanır; birbirini geçmez.
- **İçe aktarma taslağı** (Levent 8 Eki "5×5 olsun", orkestratör kararı): penceredeki bütün çalışma setleri aynı tekrardaysa taslak
  sabit hedeftir (hep 5 → 5×5); bir set bile farklıysa D1'in aralık kuralı aynen (5, 5, 6 → 5-7, `program_draft_rep_span_min`). D1'in
  "hep 8 yapan 8-10 alır" satırı bununla değişti: aralık açmanın gerekçesi (çift ilerlemenin tırmanacak yeri) sabit hedefte yok, motor
  yalnız yükü artırır. Mevcut taslak testlerinden tek tekrarlı hareketlerin beklentisi buna göre değişti (PR #484).

## Ek 5 · Bugünü geri almak, sunucunun bugünü, seansın durumu (K-995 PR A, 2026-10-09, agent, teknik)
- **`POST /v1/program/today` FULL ve UNDO.** FULL kısa sürümü kaldırır; SHORT gibi yalnız bugünün seansında ve başlamış seansta da
  serbesttir (SHORT'un tersi: seansın ortasında zaman açılabilir; madde 7 "mevcut uçlarla aynı"). UNDO bugünkü taşımayı ya da atlamayı
  geri alır; MOVE/SKIP gibi o günün bugün başlamış bir antrenmanı varsa CONFLICT. Geri alınacak bir şey yoksa hiçbir şey değişmez (200;
  inceleme geri alması ve `DELETE /v1/program/cardio` gibi iki kez zararsız, çevrimdışı tekrar gönderim güvenli).
- **Geri alma kaydı (V44 `training.session_change.undo`, JSON):** MOVE ve SKIP dokunduğu her satıra (taşınan seans ve zincirle kayan her
  seans) `{of, on, before}` yazar: hangi günün değişikliği (`of`), hangi gün yapıldı (`on`, kullanıcının bugünü), satırın önceki hali
  (`before`: gün, atlandı, kısa, bugünlük değişimler). UNDO `of` = o gün ve `on` = bugün olan satırları `before`'a döndürür ve kaydı
  siler (bir düzey; yinele yok). SHORT, FULL ve değişimler kaydı olduğu gibi bırakır. **Neden kayıt, hesap değil:** zincir her seansı bir
  gün iter, ama şimdiki halden hangi seansın bugünkü taşımayla, hangisinin önceki bir günün zinciriyle kaydığı ayırt edilemez (önceki
  günün zinciriyle bugünden geçen seans, bugün atlanan seansın yanında); taşınan seansın kısa sürümü ve bugünlük değişimleri de taşımada
  silinir (taze seans) ve geri gelmesi gerekir. **Reddedilen:** hafta başından yeniden hesap (geçmiş yok) · ayrı tablo (aynı satıra ait,
  program bütün değişince satırla birlikte gider) · yalnız sonuncuyu tutan hesap düzeyinde kayıt (aynı hafta başka günün taşıması onu ezer).
- **`Program.today`:** profilin saat dilimiyle sunucunun bugünü (profil yoksa UTC); `week` ve today ucu bunu okur. Telefon bugünü kendi
  saatinden çıkarmaz (#493 incelemesi). **`Program.weekOf`:** o haftanın pazartesisi (`Consistency.WEEK_STARTS_ON`), `week`'in haftası;
  telefon haftayı da hesaplamaz (#505 incelemesi).
- **`WeekSession.movedFrom`:** taşınan seansın programdaki günü (hafta gününün bu haftaki tarihi), yalnız taşınmışken. İki kez taşınan
  seansta da asıl gün (önceki taşımanın günü değil). **`WeekSession.undoable`:** UNDO'nun geri alacağı seans (bugün taşındı ya da
  atlandı, bugün başlamadı); telefon Undo'yu buna göre gösterir, kendisi çıkarmaz.
- **`WeekSession.workout` (`SessionWorkout {id, state: OPEN|DONE}`):** o program gününün bu hafta (kullanıcının takviminde, pazartesi-pazar)
  başlatılan en son antrenmanı; bitmemişse OPEN (telefon Continue ile onu açar, yenisini başlatmaz; K-961 kendiliğinden kapanır), bitmişse
  DONE (Start yok). Haftanın herhangi bir günü sayılır: seansını gününden önce ya da sonra yapan için seans yapılmıştır (tutarlılık da
  haftada sayar, Ek 3). İçe aktarılan seansın program günü yoktur, eşleşmez. **Reddedilen:** yalnız seansın tarihinde başlayanı saymak
  (gününden önce yapılan seans "yapılmadı" görünürdü) · telefonda antrenman listesinden eşlemek (telefon kural işletmez).

## Ek 6 · Taşı zinciri önizlemesi (K-995 PR C, 2026-10-09, agent, teknik)
- **`WeekSession.movePreview`, ayrı uç değil:** bugünün (atlanmamış) seansı, MOVE'un şimdi ne yapacağını taşır: `shifts` (taşınan ve zincirle
  kayan her seans, yeni günüyle, tarihe göre) ya da `conflict` (PAST_SUNDAY: bir seans pazarı geçerdi; STARTED: o günün antrenmanı bugün
  başladı; ikisinde de `shifts` boş, MOVE 409 verirdi). Hesap MOVE'un kendi zinciridir (`TodayChanges.moveToTomorrow`), telefon zincir
  hesaplamaz. **Neden alan:** Change sayfası açılır açılmaz zinciri gösterir (ek istek yok, önbellekteki programla çevrimdışı da), program her
  okunduğunda taze; MOVE yine kendi denetimini yapar (önizleme ile taşıma arasında hafta değişirse 409). **Reddedilen:** ayrı önizleme ucu
  (her sayfa açılışında bir istek; aynı bilgi zaten haftanın içinde) · `POST /v1/program/today`'e `dryRun` (değiştiren uçta değiştirmeyen kip).
- **Split seçimi bu kartta yok** (düzenleyici, 9 Eki): her gün sayısının tek şablonu var (1-2 gün tüm vücut, 3 karışık, 4 üst/alt, 5 karışık,
  6 itiş/çekiş/bacak), seçim fiilen tek seçenek; gerçek seçim yeni şablon, yani koçluk içeriği: Levent kararı bekliyor. Rebuild bugünkü gibi gün
  sayısıyla üretir; sözleşmeye `split` alanı eklenmedi.

## Ek 7 · Programı düzenleme ucu: kimlikle düzenleme, kayıt, geri alma (K-995 PR B, 2026-10-09, agent, teknik)
- **`PATCH /v1/program` (`ProgramEdit`):** programın düzenlenmiş hali, bütün günleri sırasıyla; gün ve hareket **kimlikleriyle** (`ProgramDay.id`,
  yeni `PlannedExercise.id`). `PUT` (bütün değiştirme, onboarding K-968) değişmez. Kimlikli gün o gündür (kimliği, ad verilmezse adı kalır);
  kimliksiz gün yenidir ve ad ister; gönderilmeyen gün gider. Ad verilen üretilmiş gün kullanıcının adını alır (`name_key` ya da `name`,
  V8). Kimlikli hareket (herhangi bir günden: hareket gün değiştirebilir) aynı hareket ve aynı tekrar aralığıyla satırını ve hedefini korur
  (set değişse de, inceleme uygulaması gibi); başka aralık satırı hedefsiz tutar (Ek 1); yerine başka hareket konan satır yeni satırdır,
  hedefsiz ("From now on" gibi, Ek 3); satırı korunan hareketin başlangıç ağırlığı (`start_load_kg`, `start_reps`, K-998) da kalır;
  aralığı değişen satırda ve yerine başka hareket konan satırda yoktur (o hareketin o aralığı içindi; atılan seans onu yeni aralığa hedef
  yapardı, #518 incelemesi). Başlangıç ağırlığı `ProgramStore.PlannedExercise`'ın parçasıdır: kaydın anlık görüntüleri de taşır, geri
  alma onu geri getirir (eski görüntüde yok, null okunur; göç yok). Kimliksiz hareket yenidir. Programda olmayan kimlik **CONFLICT** (program o arada değişti), hiçbir şey
  değişmez; doğrulama `PUT` ile aynı sınırlar. Kaynak ve program kimliği kalır: düzenlenen üretilmiş program `GENERATED` kalır (#4). Gün
  sayısı değişirse `program_history` satırı (`ProgramStore.rewrite`).
- **Kayıt ve geri alma (V46, `program_review_change.kind` REVIEW|EDIT, EDIT'te `suggestion` yok):** düzenleme, inceleme değişikliklerinin
  kaydına bir değişiklik olarak girer (öncesi ve sonrası programla) ve aynı uçla geri alınır (`POST /v1/program/review/undo`). Bir
  değişiklik (kimliğiyle; öneri ya da düzenleme) geri alınınca sonrakiler yeniden uygulanır: öneri kimliğiyle (Ek 1); düzenleme, ancak program onun "öncesi"yle aynıysa
  (günler, adlar, hafta günleri, hareketler, set ve aralık) olduğu gibi; değilse uygulanamaz ve `alsoUndone` ile adı verilir (düzenleme
  bir hedef hal, fark değil: başka bir programa yeniden kurmak kullanıcının yapmadığı bir düzenleme olurdu). Sözleşmede `Program.review.applied`
  yalnız önerileri taşır (Antrenman'ın "N changes applied" satırı ve onboarding onları sayar; değişmez), düzenlemeler ayrı listededir
  (`Program.review.edits`, `{id, editedAt}`); ikisi de aynı uçla, kimliğiyle geri alınır. Kimliksiz geri
  alma ("N changes applied · Undo") yalnız önerileri geri alır: ilk önerinin öncesine döner, ondan önceki düzenleme kalır, sonraki düzenleme
  yeniden uygulanır ya da `alsoUndone` ile gider (düzenleyici kararı, #518). Programdan farkı olmayan düzenleme hiçbir şey yazmaz.
- **Bu haftanın seansları** (`TodayChanges.relay`; düzenlemede, inceleme uygulamasında ve geri almada): başka hafta gününe konan ya da
  çıkarılan günün bu haftaki değişikliği (taşıma, atlama, kısa, bugünlük değişim) silinir, seans yeni gününe yerleşir ("Sessions re-lay
  themselves"); o günün taşımasının zincirle ittiği seanslar da önceki hallerine döner (Ek 5'in geri alma kaydından; taşıma artık yok).
  Bugünlük değişimlerden yalnız planlı bir hareketin, günün planlamadığı bir hareketle değişimi kalır (plan birini bırakmış ya da ötekini
  almış olabilir: aynı hareket seansta iki kez olmaz). Geçmiş haftaların satırları kalır (tutarlılık onları okur).
- **Başlamış seans (kart maddesi 7, düzenleyici kararı #518):** bugün antrenmanı başlamış günü başka hafta gününe koymak ya da çıkarmak
  CONFLICT (taşıma ve atlama gibi: yapılan seans yapılmıştır); o günün hareketleri değişebilir ("From now on" gibi, plan artık odur).
  Aynı koruma (tek yardımcı, `ProgramEdits.startedAndReLaid`) inceleme uygulamasında ve geri almada da geçerli: sonucu böyle bir günü
  başka hafta gününe koyacak ya da çıkaracaksa CONFLICT, hiçbir şey değişmez (düzenleyici kararı, #518). Program günü olmayan antrenman
  (serbest ya da içe aktarılmış seans) hiçbir günü tutmaz.
- **Reddedilen:** işlem listesi (ekle/çıkar/taşı adımları; telefonun düzenleyicisi programın bütününü tutuyor, kimlikli bütün hal daha az
  kırılgan) · düzenlemeyi inceleme kaydını silerek yapmak (Ek 3'teki gibi; kartın "geri alınır" maddesini karşılamaz) · ayrı düzenleme
  kaydı tablosu (iki kayıt arasında sıra kurmak gerekirdi; geri alma tek yoldan) · düzenlemeyi fark olarak saklayıp yeniden uygulamak
  (birleşen ve taşınan hareketlerde kırılgan, Ek 1'in ters diff reddiyle aynı neden).

## Ek 8 · Seans içi değiştirmede seçenek başına tablo: `PlannedExercise.swapTables` (K-1011, 2026-10-10, agent, teknik)
- **Sorun:** `swapOptions` yalnız kimlik taşıyordu (Ek 3). Bugünlük değişimde sunucu yeni harekete kendi `lastBestSet`, `lighterLoadKg`,
  `heavierLoadKg` ve `calibrationStepKg` verir (`WeekSession.swaps`); seans içinde, telefonda (çevrimdışı) değiştirilen hareket bunların
  hiçbirini alamıyordu ve telefon hesaplayamaz (U1). K-973 "değiştirilen hareket de kalibrasyonla başlar" bu olmadan karşılanamaz.
- **Karar:** `PlannedExercise` yanına **`swapTables: SwapOptionTable[]`** gelir; `swapOptions` aynen kalır. `SwapOptionTable`: `exerciseId`
  (`swapOptions`'tan biri) + `lastBestSet`, `lighterLoadKg`, `heavierLoadKg`, `calibrationStepKg` (hepsi isteğe bağlı; hedef alanı
  yoktur). Aynı sırada, aynı hareketler: `swapTables[i].exerciseId == swapOptions[i]`. Alanların ad, tür ve anlamı `PlannedExercise`'ın
  alanlarıdır (şema `$ref`'le onlara bağlanır, ikinci bir tanım yok).
- **Neden ayrı alan (`swapOptions` string[] kalır):** (1) sözleşmeyi okuyan mevcut istemciler `string[]` bekler; öğeyi nesneye çevirmek
  onları kırar (geriye uyum). (2) `swapOptions` ile `POST /v1/program/swap {to}` doğrulaması aynı kimlik listesini kullanır; kimlik listesi
  sade kalır. Bedel: aynı kimlik iki yerde; birliği `SwapOptionTablesTests` (kimlik listesi = tablo kimlikleri) ve API testi korur. Yeni
  istemci tabloyu okur, eski sunucu `swapTables` göndermez (alan isteğe bağlı: eski sunucuyla yeni telefon `swapOptions`'a düşer).
  **Reddedilen:** `swapOptions`'ı nesne listesine çevirmek (kırıcı) · her seçenek için ayrı uç (çevrimdışı salon: tablo, program okunurken
  telefonda olmalı, ADR-075 #3) · alanları `PlannedExercise`'a tek tek `swapLighterLoadKg…` diye eklemek (hareket başına dört alan, seçenek sayısıyla çarpılır).
- **Tek kod:** değerler bugünlük değişim satırının hesabıyla aynı yoldan çıkar: `SessionTable.table(...)` (eski `ProgramController.table`,
  denetleyiciden `SessionTable`'a taşındı, davranış aynı). Bugünlük değişim satırı (`asShown`, hedefsiz `PlannedExercise`) ve seçenek tabloları
  (`SwapOptionTables`, hedefsiz) onu çağırır; ikinci bir hesap yok. Kayıt (`lastSessions`) program okunurken zaten tek taramada
  okunur (hesabın tüm hareketleri); seçenek tabloları o haritadan okur, **yeni sorgu yok** (hareket × seçenek N+1 değil, bellekte hesap).
- **Etki:** yük (yaklaşık hareket başına 3-6 küçük nesne) program yanıtını büyütür; kabul edilir (program zaten çevrimdışı tutulur, telefon
  hesap yapmaz). Veri tabanı, göç, parametre dosyası değişmez.

## Ek 9 · Bir gün eklemek: `POST /v1/program/days {weekday}` (K-1012, 2026-10-10, agent, teknik)
- **Sorun:** 1. hafta kararı "bir gün ekle" (ADR-077 Ek 1, Ek 4) günü kullanıcıya seçtirir. `PATCH /v1/program` (Ek 7) yeni günü ancak adı ve
  hareketleriyle alır; gün içeriğini telefon uyduramaz (U1, telefon kural işletmez). `POST /v1/program/generate` programı baştan kurar ve
  bütün hedefleri siler. Gün eklemek, mevcut günlerin satırlarına ve hedeflerine dokunmadan, içeriği sunucudan alan ayrı bir uç ister.
- **Uç:** `POST /v1/program/days {weekday}` → `Program` (200), `operationId: addProgramDay`. Yanıtta `review` yeniden koşmuş, değişiklik
  kaydına bir EDIT satırı girmiş olur (`Program.review.edits`, Ek 7): geri alma aynı uçla (`POST /v1/program/review/undo`), yeni gün gider,
  diğerleri olduğu gibi kalır. Mevcut günlerin kimlikleri, hareket satırları, hedefleri ve başlangıç ağırlıkları değişmez (`ProgramStore.rewrite`
  kimlikli günleri ve satırları aynen yazar). Program kimliği ve kaynağı kalır. Gün sayısı değiştiği için `program_history` satırı yazılır
  (Ek 7 ile aynı yol).
- **Gün içeriği (yeni koçluk kuralı yok, U14):** yeni gün, **üretecin kendisinin** o hafta günü için vereceği gündür:
  `ProgramGenerator.generate(mevcut hafta günleri + yeni gün)` çıktısında yeni hafta gününe düşen gün, yani N+1 günlük şablonun hafta
  sırasındaki o konumundaki günü; adı (`nameKey`), hareketleri, setleri, tekrar aralığı (G1 K-21) ve RIR hedefi (G1 K-5) oradan gelir. Şablon
  dosyaları ve üreteç kuralı (K-211, H3 B8, G1 K-22: şablon gün sayısına göre, günler hafta sırasıyla) zaten kaynaklıdır ve onaylıdır; bu ek yeni
  bir eşik, parametre ya da seçim kuralı eklemez. İkinci bir yol kurmak yerine üreteç çağrılır, aynı şablon mantığı bir daha yazılmaz.
- **Denge, ölçüldü ve sınırı:** N+1 günlük şablon bütün olarak set sınırlarına, haftalık kas bandına ve sıklığa uyar (`ProgramTemplateTests`); eklenen
  gün o şablonun günüdür, ama programın mevcut günleri başka bir bölünmeden gelir. `ProgramDayAddsTests` 1-5 günlük her üretilmiş program ve her boş
  hafta günü için ekleme sonrası incelemenin (Ek 1) ne önerdiğini sabitler: **2 günden → 3: hiçbir şey** (1. hafta kararının ana yolu);
  3 günden → 4: `TOO_FEW_SETS:rear_delts` (arka omuz 2 set, mevcut 3 günlükte hiç yok); 4 günden → 5: `TOO_FEW_SETS:forearms`; 1 günden → 2:
  biceps, calves, rear_delts (1 günlük şablon yalnız bileşik; 1. hafta kararı 1 günden gün eklemez, taban `training_days_min`); 5 günden → 6:
  yalnız `TOO_MANY_DAYS` (G6 K-36; kullanıcı 6'yı seçebilir, generate de verir). Hiçbir durumda fazla set, tekrar aralığı ya da haftada bir kez
  çalışan kas çıkmaz; çıkanlar, günün getirdiği bir kasın haftalık alt sınırın (G1 K-11) altında kalmasıdır, yani ekleme sonrası kullanıcıya
  `Program.review` bunu önerir ve kullanıcı seçer (ADR-073 #3; öneri yoksa bulgu gösterilmez, ör. kalça için izolasyon hareketi katalogda
  yok). **Bilinen sınır:** programı ek sonrası bütünsel bir N+1 şablonu yapmak ya mevcut günleri değiştirmeyi (hedef korunması
  ile çelişir) ya da günü kas açığına göre seçen yeni bir kural yazmayı ister (U14, Levent kararı); ikisi de bu ekin dışında. Adlandırma da
  bölünmeler arası karışır (ör. "Upper" + "Lower A"). Düzenlenmiş (şablondan sapmış) üretilmiş programda eklenen gün yine şablonun
  günüdür; test değişirse (şablon değişikliği) tablo bir koçluk değişikliğidir ve ürün sahibine gider.
- **Kendi programı (`OWN`): 409.** Üretecin kendi bölünmesi yoktur; kullanıcının günlerinden yeni günü çıkaran kaynaklı bir kural da yok
  (U14), uydurmak telefonun uydurmasından farklı olmaz (U1). Kullanıcı kendi programına günü `PATCH /v1/program` ile (Edit › Days) ekler: içeriği
  kendisi koyar. Telefon 409'da Edit'e götürür (bugünkü #537 yolu). **Reddedilen:** kendi programında en yakın şablon gününü eklemek (kullanıcının
  seçmediği bir bölünmeyi onun programına karıştırmak, ADR-073 "dayatma yok").
- **Hatalar:** gövdede `weekday` yok ya da geçersiz → 400 (`VALIDATION_FAILED`). **409, hiçbir şey değişmez:** o hafta günü zaten programın günü ·
  programda hafta gününe konmamış gün var (konum belirsiz) · program zaten 6 gün (7 gün dinlenme günü bırakmaz, G1 K-70; 7 günlük şablon yok) ·
  program `OWN`. Program yoksa 404.
- **Bu haftanın seansları:** eklenen gün bu haftanın planına kendiliğinden girer (hafta programın günlerinden okunur). Başka güne taşınan ya da
  çıkarılan gün olmadığı için `TodayChanges.relay` ve "bugün başlamış seans" koruması gerekmez.
- **1. hafta kararının durumu:** `Application` değişmez. Karar `NOT_NEEDED` kalır (ADR-077 Ek 1: gün kullanıcının dokunuşuyla olur, karar
  bu seçime bakmaz, U2); `PATCH` ile gün taşımanın bugünkü davranışı da aynıdır. Dokunuş programı değiştirir, kararı değiştirmez.
- **Reddedilen:** (a) `generate` (hedefleri siler) · (b) telefonun `PATCH`'e gün içeriği doldurması (U1) · (c) "N+1 şablonunda eksik günü anahtarla
  bul": 2, 3, 4, 5 ve 6 günlük şablonların gün anahtarları kesişmez (`full_body_a/b` · `upper/lower/full_body` · `upper_a/lower_a/upper_b/lower_b`
  ...), eşleşecek ortak gün yok · (d) mevcut programın kas açığına göre şablon gününü seçmek (yeni bir seçim kuralı olurdu; araştırmada kaynağı yok,
  U14: gerekirse `kural-ekle` ile ürün kararı, Levent'e gider).
- **Etki:** yeni uç ve `NewProgramDay` şeması (`contracts/openapi.yaml`); veri tabanı, göç, parametre dosyası değişmez. Mobil #537'nin
  "Pick the day" ekranını bu uca bağlamak ayrı küçük iş (#537 birleşince).
