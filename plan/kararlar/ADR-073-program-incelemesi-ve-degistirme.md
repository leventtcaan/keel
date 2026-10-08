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
| `program_draft_rep_span_min` | 2 | Çift ilerlemenin tırmanacak yeri olsun (K-109); hep 8 yapan 8-10 alır |

## Ek 3 · Bugünü değiştir ve hareket değiştir: uçlar ve saklama (K-964, 2026-10-08, agent, teknik)
- **Uçlar:** `POST /v1/program/today {programDayId, change: SHORT|MOVE|SKIP}`, `POST /v1/program/swap {programDayId, exerciseId, to,
  scope: TODAY|FROM_NOW_ON}`; ikisi de `Program` döner. `Program.week`: bu haftanın seansları (pazartesi-pazar, tarihle; taşınan `moved`,
  atlanan `skipped`, kısa `short`, o günün hareketleri `exerciseIds`). `PlannedExercise.swapOptions`: program okunurken hesaplanır (salonda
  çevrimdışı seçilebilsin; telefon hesap yapmaz).
- **Saklama (V41 `training.session_change`):** bir program gününün **o haftaki** seansı başına tek satır (hesap, gün, haftanın pazartesisi):
  taşındığı gün, atlandı mı, kısa mı, bugünlük değişimler (JSON, planlı hareket → yerine geçen). Program değişmez; `program_history`'ye
  satır girmez → tutarlılık ve planlı seans sayısı (`PlannedSessions`) aynı kalır. Tutarlılık seansları haftada sayar: taşınan seans yeni
  gününde yapılınca o haftayı sayar, kısa seans da bir seanstır, atlanan seans yapılmamış seanstır (telafi eklenmez, yeniden planlanmaz;
  U7, ADR-071 #3). Program bütün olarak değişince (`PUT`, `generate`) satırlar silinir (gün kimlikleri yenidir). Hesap silmede
  gider, dışa aktarımda `sessionChanges` (veri envanteri).
- **Taşıma:** yalnız bugünün seansı, yarına; pazarı geçmez (hafta `Consistency.WEEK_STARTS_ON` ile, kullanıcının saat diliminde). Yarında
  başka seans varsa o da bir gün kayar, zincirleme ("The week re-lays itself", prototip); biri pazarı geçecekse taşıma CONFLICT, hiçbir şey
  değişmez. **Reddedilen:** dolu güne üst üste iki seans koymak (aynı gün iki antrenman), dolu güne taşımayı yasaklamak (prototipin "re-lays"
  metniyle çelişir).
- **Hareket değiştirme seçenekleri:** katalogdaki `alternatives` (sırasıyla), sonra **aynı birincil kas ve aynı türden** (bileşik/izolasyon)
  katalog hareketleri kimliğe göre; her biri şimdiki salonun ekipmanıyla yapılabilir olmalı (ADR-032: `LoadSteps.knows`; vücut ağırlığı her
  zaman; salon yoksa süzgeç yok), o günde zaten olan hareket çıkar. Aynı tür şartı G6 K-35'ten (bileşik değişmez, izolasyon serbest:
  bileşiğin yerine izolasyon önerilmez); katalog `alternatives` elle seçildiği için olduğu gibi. Kullanıcının kendi hareketinin seçeneği
  yoktur (boş liste). Salon makine için adım söylemiyorsa (`stackStepKg` yok, makine listede değil) makine/kablo hareketi önerilmez.
- **"Today only":** yalnız bugüne düşen seansta (CONFLICT değilse); planlı hareketin kendisine geri değiştirmek değişimi kaldırır.
  Seans içi değiştirme ayrıca bir şey istemez (set başka hareketi adlandırır, K-210).
- **"From now on":** programda o günün o hareketinin satırı yeni hareketle değişir (aynı set ve tekrar aralığı, **hedef yok**: yeni hareketin
  kendi geçmişi ve hedefi, sıradaki seans koyar); diğer her hareket satırını ve hedefini, program kaynağını, günlerini ve kimliklerini korur
  (inceleme uygulaması gibi, `ProgramStore.rewrite` + satır kilidi). **İncelemenin değişiklik kaydı silinir:** kayıttaki "sonrası" programlar
  artık bu programla eşleşmez ve geri alma CONFLICT verirdi; düzenleme artık programın kendisidir ("N changes applied · Undo" kalkar).
  Reddedilen: değişimi kayda ayrı bir değişiklik olarak yazmak (kayıt yalnız inceleme önerilerini tutar, geri alma yeniden uygulama yoluyla
  çalışır; değişim bir öneri değildir) · kayıttaki programları yeni hareketle yeniden yazmak (kırılgan, geri alınan eski hal yeni hareketi
  silerdi).
