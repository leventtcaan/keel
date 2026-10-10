# ADR-075 · Antrenman oturumu: odak modu, seans içi öneri tablosu, ilk seans kalibrasyonu, duraklat/sonra doldur/düzelt/atla, kutlamalı son
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (tur 2 notu "kullanışsız; kilo çıkmazsa ne olacak", tur 3 notları, prototip onayı); öneren: agent

## Bağlam
Bugünkü oturum (`apps/mobile/src/app/workout.tsx`, 531 satır) set tablosu; RIR 0/1/2/3+; duraklat, sonra doldur, set/hareket atla ve hareket
değiştir yok. Hedefler (`nextLoadKg`, `nextReps`) yalnız seans bitince hesaplanıyor (`NextTargets`); seans içinde "çok ağır" ya da ilk seans
kalibrasyonu yok. Seans çevrimdışı çalışmalı (her set önce yerel kuyruğa). Oturum sonu sade liste; alışkanlık anını kaçırıyor (Levent).

## Karar sürücüleri
- Kararı motor verir (U1, mimari): telefon kural işletmez, sunucunun hazırladığı seçeneklerden birini gösterir.
- Seans çevrimdışı tamamlanabilir.
- Kaynaksız kural yok (U14).
- Bilgi veren olumlu geri bildirim işe yarar (d=+0,33), somut ödül zarar verir (d=−0,28) (M3; tur 2 strateji §8).

## Karar
1. **Odak modu:** oturum ekranı her zaman koyu (ADR-070). Düzen: üstte End · süre · Pause; dinlenme sayacı üstte, hiçbir düğmeyi kapatmaz,
   hareketin son setinden sonra çıkmaz; hareket noktaları; hareket başlığı (görsele dokununca nasıl yapılır, Swap, Skip move); hedef satırı
   ("Beat last time" kg × tekrar, "Last"); yapılan setler (dokununca düzelt); **tek büyük aktif set**: kg ve tekrar adımlayıcıları, "Reps left"
   0 / 1 / 2+, "Log set"; altında "Too heavy?" ve "Skip set"; "Up next".
2. **RIR seçenekleri 0 / 1 / 2+** (`rir_choices`). G1 K-5 hedefi 0-1; G6 K-40: rezervde 2'den fazla kalan set çalışma seti sayılmaz. 3+ ayrımı
   kararda kullanılmıyor.
3. **Seans içi öneri tablosu** (çevrimdışı, motor kaynaklı): `/v1/program`'daki her `PlannedExercise`, sunucunun önceden hesapladığı
   seçenekleri taşır: `lighterLoadKg` (bir yük basamağı aşağı), `heavierLoadKg` (bir basamak yukarı), son seansın en iyi seti, aralığın tepesine
   ulaşınca sonraki kilo. Basamak `load_increment_upper_kg`/`lower_kg` (H3 B4) ve salona yuvarlama (ADR-032). Telefon yalnız eşleştirir:
   - **"Too heavy?"** → "Use {lighter} kg / Keep {current} kg" (G1 karar #61 [tecrübe]: kilo yanlışsa seti bırak, kiloyu düşür).
   - **İlk seans kalibrasyonu** (hareketin hedef kilosu yokken): set "2+" ile girildiyse → "That weight is light. Next set {heavier} kg?"
     (G6 K-40 [tecrübe]: RIR > 2 set geçersiz; G1 K-5 hedef 0-1; basamak H3 B4 [literatür]). Bir sonraki sete öneri, kullanıcı seçer.
     Seans bitince bulunan kilo hedef olur.
   - **Aralığın altına düşen set** ("Next set lighter?"): **kaynak bulunamadı** (G1 #33/#36 form bozulmasıyla ilgili, tekrar alt sınırıyla
     değil). Kod session'ında `kural-ekle` kaynak arar; bulunamazsa öneri gösterilmez, analiz satırı yalnız "Below the range" der.
4. **Analiz satırı** (her hareketin setlerinden sonra): çift ilerlemenin mevcut çıktısının sunumu, yeni kural değil. Örnek: "+1 rep vs last
   time. 2 more and it's 105 kg." · "Same as last time. One more rep is the next step." · tutulan harekette "8 again, as called. Monday's call
   reads it." Metinler `en.json`'da şablon; sayılar sunucunun değerleri.
5. **Kontroller:**
   - **Pause / Resume:** süre durur, seans açık kalır.
   - **End:** "Finish and save" (girilmeyen set girilmemiş kalır) · "Fill in the rest later" (seans `endedAt`'siz kalır, **haftasını sayar**,
     ADR-071 #3; `unfinished_session_close_hours` sonra kendiliğinden kapanır ve hedefler hesaplanır) · "Discard" (onayla, hiçbir şey kaydedilmez).
   - **Seti düzelt:** kg/tekrar, sil. Bitmiş seansta bugünkü `workout-edit` yolu (K-432) aynen.
   - **Set ve hareket atla:** atlanan set kaydedilmez; hedef girilen setlerden hesaplanır (bugünkü `NextTargets` kuralı); hiç seti girilmeyen
     hareket o seans için "Hold". Telafi yok.
   - **Swap:** ADR-073 #6 (yalnız o seans).
6. **Kardiyo son adım** (ADR-074 #3).
7. **Antrenman sonu kutlaması** (her zaman koyu): animasyonlu "Workout complete" (hareketi azalt ayarında animasyon yok) · dakika · kaldırılan
   toplam kilo (çalışma setlerinde kilo × tekrar; aynı seans adının öncekine göre %) · set sayısı · Apple Watch kalorisi (yalnız ölçüm varsa,
   etiketli) · **rekor:** gerçek set, o hareketin önceki bütün setlerini geçen (daha ağır kiloda en az aynı tekrar ya da aynı kiloda daha çok
   tekrar); ilk seansta "Baseline set" · ne arttı (hareket başına +tekrar, +kg, held) · bugün çalışan kaslar haritası (katalogdaki birincil kas,
   haftalık hedefin payıyla dolar) · bu hafta N / M segmentleri (Apple halkası değil) · "Share your workout" (ADR-076) · haptik yalnız rekorda.
   Rozet, puan, XP yok. e1RM gösterilmez (B10).
8. **Apple Health'e yazma** ADR-018 gibi sürer.

## Neden
Tek büyük aktif set ve önceden dolu değerler kaydı tek dokunuşa indirir (M2 K11). Seans içi öneri tablosu hem U1'i (öneri motordan) hem
çevrimdışı çalışmayı korur: telefon hesap yapmaz, sunucunun verdiği iki değerden birini seçer. "Too heavy" ve kalibrasyon Levent'in "kilo çıkmazsa
ne olacak" sorusunun kaynaklı cevabı. Sonra doldur, telefona bakamayan kullanıcıyı kaybetmez; geç kayıt sayar (Levent).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Kuralları telefonda TypeScript ile yeniden yazmak | Motor iki yerde; U1 ve tek kaynak ilkesi bozulur |
| Seans içinde sunucuya sormak | Salonda bağlantı yok |
| Aralık altında kaynaksız "lighter" önerisi | U14 |
| Rozet/XP ile kutlama | Somut ödülün zararı ölçülmüş (M3) |

## Sonuçlar
- Olumlu: Levent'in tur 2-3 notlarının hepsi; prototip akış testi C3, C4.
- Olumsuz: `PlannedExercise` büyür; oturum ekranı baştan yazılır (birkaç göreve bölünür).

## Geri dönmenin maliyeti
Orta: ekran yeniden yazımı; sözleşme alanları geriye uyumlu eklenir.

## Etkilenen
`apps/mobile/src/app/workout.tsx`, `workout-summary.tsx`, `src/train/*`, `data/parameters/workout.json` (`rir_choices`,
`unfinished_session_close_hours`), `contracts/openapi.yaml` (`PlannedExercise` öneri alanları, seans kapanışı), backend training
(`NextTargets`, otomatik kapanış), HealthKit (seans penceresinde aktif enerji), `data/copy/en.json › workout, summary`.

## Doğrulama
Sözleşme testi: öneri alanları salona yuvarlanmış ve basamak kadar uzak · motor testi: kalibrasyonda bulunan kilo seans sonunda hedef olur ·
`Consistency` testi: sonra doldurulan seans haftasını sayar; otomatik kapanış hedefleri hesaplar · ekran testleri: dinlenme hiçbir düğmeyi
örtmez, son setten sonra çıkmaz; "Too heavy?" iki seçenek gösterir; atlanan hareket "Hold" · rekor tanımı tablo testi.

## Ek 1 · İlk seans kalibrasyonunda "bir basamak ağır" telefonda nasıl bulunur (K-960, 2026-10-07, agent, teknik; Levent'e bildirildi 2026-10-08, itiraz yok)
Hedefi olmayan harekette kilo seans sırasında kullanıcının girdiği değer; sunucu bunu önceden bilemez, `heavierLoadKg` hesaplanamaz.
Karar: sunucu yalnız bu hareketler için `calibrationStepKg` (bölgenin yük basamağı, `load_increment_upper_kg`/`_lower_kg`, H3 B4) gönderir;
telefon girilen kiloya ekler ve ısınma setlerinin kullandığı ortak `loadSteps.round` ile salona yuvarlar (ADR-032, K-417). Ne zaman önerileceği
(`calibration_rir_min`, G6 K-40) ve ne kadar (bir basamak) parametre/sunucu kaynaklı kalır; telefon kural seçmez, yalnız salonun ağırlığına
yuvarlar. Reddedilen: sunucunun her hareket için salonun bütün kilo merdivenini göndermesi (yük ağır, sınır gerekir).
"Too heavy?" için hafif seçenek her zaman bulunur (inceleme, 7 Eki): salonun bir basamak içinde yapabildiği en hafif kilo (mümkünse tam bir basamak aşağı), basamak içinde yoksa
salonun bir alt basamağı (başlangıcın altındaki en ağır kilo); yalnız rafın/barın dibinde yok. Ağır seçenek bir basamakla sınırlı kalır
(aşmak risk). İzolasyon hareketleri hiç hedef almadığı için her seans kalibrasyon basamağı taşır; "hedef kilosu yokken" tanımına uygun.

## Ek 2 · Rekorun tanımı ve "aynı seans adına göre %" (K-965, 2026-10-08)
**Rekor (Levent KABUL 2026-10-08):** #7'deki "önceki bütün setleri geçen (daha ağır kiloda en az aynı tekrar ya da aynı kiloda daha çok
tekrar)" yerine: **önceki hiçbir çalışma setinin baskın gelmediği çalışma seti**. Önceki bir set, en az o kadar ağır ve en az o kadar
tekrarlıysa baskındır; eşitlik baskındır, yani rekor değildir. Sonuç: bir kiloya ilk çıkış rekordur (80×10'dan sonra 85×8), bir kiloda
şimdiye kadarkinden çok tekrar rekordur (80×11); eski hafif ve çok tekrarlı bir set (60×15) ağır seti hiç engellemez. Isınma, drop ve
tükeniş setleri karşılaştırılmaz (yalnız çalışma seti); aynı seansın önceki setleri "önceki" sayılır; seansta birden çok rekor varsa kart en
ağırını gösterir. Hareketin ilk seansı başlangıçtır (Baseline). "Güçlenen hareket" = başlangıçtan sonra en az bir rekor. e1RM yok (B10).
Reddedilen: ilk tanım (bütün önceki setleri geçmek): kilo artınca rekor tekrarlar eski kilonun tekrarına yetişene kadar gecikiyordu, eski
hafif set rekoru süresiz engelliyordu.

**Aynı seansa göre % (düzenleyici kararı, teknik; agent kaydetti):** #7 "aynı seans adının öncekine göre" diyor; uygulama aynı program
gününün (`programDayId`) önceki seansıyla karşılaştırır. Program yeniden kaydedilince (PUT /v1/program, yeniden üretme) günlerin kimliği
değişir; o zaman önceki seans yoktur ve alan gelmez: yeni program yeni temeldir. Program incelemesinin değişiklikleri (K-956) günleri
korur, % kaybolmaz. Reddedilen: gün adıyla eşleştirmek (üretilen programda ad anahtardır, kendi programında serbest metin; aynı ad farklı
içerikli bir günü karşılaştırırdı).

**Ne arttı (K-1008, 2026-10-09, düzenleyici kararı, teknik):** `WorkoutSummary.moves` her hareketin bu seanstaki en iyi setini aynı program
gününün en az bir tekrarlı seti olan son seansıyla (yüzdeyle aynı seans) karşılaştırır. O seansta olmayan hareket (bugünlük swap, o gün
swap'lanmış, eklenmiş, atlanmış) kendi geçmişinin herhangi bir gündeki en son seansıyla karşılaştırılır (K-964: değiştirilen hareketin kendi
geçmişi); hiç önceki seansı yoksa FIRST. Düşüş negatif `by` ile söylenir (gizlenmez, suçlanmaz: U7). Rekorlar (`marks`) ayrı soru: bütün
geçmişe göre baskınlık; ikisi çelişmez. Reddedilen: o gün seansında olmayana FIRST demek (geçmişi olan harekete "ilk" der).

## Ek 3 · Seansın başlangıç anı (K-971, 2026-10-09, düzenleyici kararı, teknik)
Seansın `startedAt`'i "Start workout"a basılıp seans ekranının açıldığı andır; ilk setin anı değil. Süre 0:00'dan o anda başlar, ilk set onu
sıfırlamaz (kullanıcı testi 8 Eki: "süre 0'dan başlar, seanslar arası taşınmaz"). Apple Health antrenmanı (K-412), seansın günü (K-964 Ek 3,
yarım seansın listesi) ve özet dakikası (K-974) aynı anı okur. **Neden:** başlatmak kullanıcının açık eylemidir; ısınma ve hareketler arası
hazırlık antrenmanın parçasıdır; salon uygulamalarının ortak beklentisi saatin Start'ta başlamasıdır. **Reddedilen:** ilk setin anı (ilk
hareketin ısınması ve kurulum süresi düşer; saat ilk sette sıçrar, kullanıcı testinin şikâyeti). **Bilinen sınır:** seansı evde açıp
salonda başlayan kullanıcıda süre uzar; bu kullanıcının kendi eylemidir, "End › Discard" ile düzeltilebilir. Açık kalmış eski seansın saati
K-961/K-972 otomatik kapanışıyla sınırlanır.

## Ek 4 · Seansı atmak ve duraklama (K-998, K-972; 2026-10-09, düzenleyici kararı, teknik)
- **Atılan seans hiçbir şey bırakmaz (#5):** `DELETE /v1/workouts/{id}` seansı ve setlerini siler; hafta sayımı, ilerleme ve rekorlar canlı
  okuduğu için onu saymaz. Hareketin hedefi aynı program gününün kalan en yeni bitmiş (ya da kendiliğinden kapanmış) seansından yeniden
  türetilir; böyle seans yoksa kullanıcının girdiği başlangıç ağırlığına döner (`planned_exercise.start_*`). Bitmiş seansın bütün setleri
  silinince (K-432) aynı yol. Silme `FOR UPDATE` ile kilitler; ikinci istek ve yarışan set 404 alır (çevrimdışı kuyruk 404'ü reddedilmiş sayar).
- **Duraklama özet ve Health'ten düşer:** bitirme isteği `pausedSeconds` taşır (ekran saatiyle aynı); özet dakikası = bitiş − başlangıç −
  duraklama; kendiliğinden kapanmış seansta süre bilinmediği için dakika yoktur. **Reddedilen:** yalnız ekran saatinin durması (özet ve
  Health kullanıcının gördüğü saatle çelişirdi, kullanıcı testi C14).
- **Set düzeltme/silme seans içinde:** telefonda bekleyen set yerelde değişir; gönderilmiş set çevrimiçiyken silinip yeniden eklenir,
  çevrimdışıyken "bağlantı gerekli" denir (kuyruğa yeni tür yok).

## Ek 5 · Rekor haptiği Part 4 derlemesinde (K-974, 2026-10-09, düzenleyici kararı, teknik)
#7'deki "haptik yalnız rekorda" `expo-haptics` ister (kurulu değil; RN `Vibration` haptik değildir). Yerel modül yeni geliştirme derlemesi
gerektirir; K-976'nın `react-native-share`'i (ADR-076) de Part 4'te yeni yerel derleme isteyecek. İkisi aynı derlemeye girer: K-974 haptiği
bir port olarak yazar (`haptics.record()`, şimdilik boş uygulama, testte çağrıldığı doğrulanır), gerçek uygulama Part 4'te `npx expo install
expo-haptics` ile bağlanır. **Neden:** tek yerel derleme, simülatördeki geliştirme derlemesi bozulmaz. Bağımlılık gerekçesi (K5): Expo'nun
birinci taraf paketi, SDK sürümüyle uyumlu, başka iş yapmaz.

## Ek 6 · "Fill in the rest later" duraklatır; sunucunun kapattığı seans telefonda emekli olur (K-972 inceleme, #527, 2026-10-10, düzenleyici kararı, teknik)
- **Sonra doldur duraklama başlatır:** ekrandan çıkarken seansın duraklaması başlar (kalıcı, seansla birlikte); sonraki set kaldığı yerden sürdürür
  (`goOn`), set girmeden Finish gelirse süren duraklama bitişe kadar sayılır (`pausedSeconds`, Ek 4). **Neden:** uzakta geçen saatler antrenman
  süresi değil; yoksa 3,5 saat sonra gelen Finish özet ve Health süresini şişirirdi. **Reddedilen:** bitirirken `endedAt`'i tahmin etmek (setlerin
  saati yok; sunucunun kendi kapanışı da bitişi başlangıca eşitler, `SessionAutoClose`).
- **Bayat seans emekli olur:** `unfinished_session_close_hours`'tan (parametre, 24) uzun açık kalmış seansı sunucu kapatmıştır; telefon onu
  Train/This week/+/program yeniden kurma için "süren seans" saymaz (`activeWorkout(records, now)`), yoksa sekmeyi sonsuza kadar kilitlerdi.
  Kayıtları silinmez, olduğu gibi eşitlenir. Seans ekranı bir güne açılınca (`?day`) bayat seansı taşımaz, yeni seans başlar; "Continue" ile
  (gün yok) açılırsa End yalnız Finish ve Discard sunar (kalan bir şey yok). **Bilinen sınır:** duraklamasız bayat seansın Finish'i `endedAt`'i
  şimdi olarak yollar; Health'e 4 saatten (240 dk) uzun süre yazılmaz (`health_workout_max_minutes`), sunucuda dakika şişer. Sunucu tarafı
  düzeltmesi gerekirse ayrı iş.
- **Discard çevrimdışı:** `queue.record` kaydı hemen göndermeyi dener; çevrimdışı ilk set bile `attempted` olur. Bu yüzden "hiç gönderilmedi" yolu
  yalnız kaydedilip gönderilmemiş kayıt (uygulama arada kapandı) için vardır; metin "may already be on the server" der, "already sent" değil.
- **Undo yeniden denemesi:** geri getirilen seansın ve setlerin kimlikleri atma anında bir kez üretilir; yarıda kalan Undo tekrar denenince
  kuyruk aynı kimliği ikinci kez kaydetmez (ikinci seans oluşmaz). Başarısızlık söylenir.

## Ek 7 · Seans içi swap telefonda; yeni hareket hedefsiz ve kilosuz başlar; süperset yeri devralır (K-972 P4 inceleme, #533, 2026-10-10, düzenleyici kararı, teknik)
- **Seans içi swap telefonda yapılır, sunucuya sorulmaz:** seans başlamış günün swap'ını sunucu reddeder (ADR-073 Ek 3, CONFLICT); telefon swap'ı
  seansa bağlı tutar (`sessionSwaps`), yalnız bu antrenman için, Undo'lu, bitişte unutulur. Setler yeni hareketin kimliğiyle gider; motor her seti kendi
  hareketine yazar.
- **Seçenek başına tablo (K-1011 #535 geldi, K-973 taşıdı):** `swapOptions` sözleşmede yalnız kimliktir; sunucunun TodaySwap satırı yeni hareket için
  kendi `lastBestSet`, `lighterLoadKg`/`heavierLoadKg` ve `calibrationStepKg` değerlerini taşır (`ProgramController.asShown`, Ek 3) ve telefon
  bunları hesaplayamaz (U1). K-1011 aynı değerleri `PlannedExercise.swapTables[i]` olarak (`swapOptions` ile aynı sıra, aynı koddan) gönderir
  (ADR-073 Ek 8). K-973'te `applySwaps` yeni hareketin satırına bu tabloyu, **hedefsiz** (`nextLoadKg`/`nextReps` yok), taşır; tablonun
  `exerciseId`'si seçeneğinki değilse (sıra kaymış) kullanılmaz. `swapTables` yoksa (eski sunucu) hareket çıplak başlar: "Too heavy?" ve
  kalibrasyon önerisi çıkmaz.
- **Kilo ön-doldurma yalnız geçmişsiz harekette kapalı (K-973 inceleme düzeltmesi, Ek 8):** swap'lı hareket kendi geçmişine bakar: telefonun o hareketin
  kaydı ya da sunucunun swap tablosundaki `lastBestSet`'i varsa kilo o hareketin son kilosuyla dolar (planlı harekette olduğu gibi); ikisi de yoksa kilo
  boş başlar ("Pick a weight"), tekrar aralığın altından; bu seansta az önce kaldırılan kilo sonraki satıra taşınır (kullanıcının kendi değeri).
  **Neden:** boş kilo "bu hareketi hiç yapmadın" demektir; geçmişi olan harekette de boş bırakmak her seans aynı seçmeyi yeniden isterdi (Ek 8).
  Planlı hareketin hedefi swap'ta taşınmaz (hedefsiz kalır); dolan kilo hedef değil, hareketin kendi geçen seferidir ve hedef satırı "Last time" der.
  **Reddedilen (önceki karar, geri alındı):** swap'lı her hareketi geçmişine bakmadan boş başlatmak (`fresh`); geçmişli harekette ilk seans
  davranışını her seansa yaymış oluyordu.
- **Süperset yeri devralınır:** süpersetin üyesi planlı hareketin yeridir; yerine kim geçtiyse sıra onundur. Swap'ta eski hareket turdan çıkar, yeni
  hareket girer (kurulmuş ya da setlerden okunmuş, ilk setten önce ya da sonra); Undo ve "Back to the planned move" aynı eşlemeyle süpersetin yerini geri
  verir. Bu seansta swap'tan çıkan hareket (üzerinde set kalmış) süpersetin üyesi sayılmaz. **Neden:** kullanıcının kurduğu süperset korunur; grubu
  çözmek, kurulu süpersetin sessizce kaybolması demekti. **Bilinen sınır, K-973'te kapandı:** ekran kapatılıp açılınca swap'tan çıkmış ara
  hareketin süperset kimlikli setleri varsa o hareket yeniden üye görünüyordu. Swap'tan çıkılan hareketlerin listesi (`left`) artık swap'larla
  **aynı kayıtta** (`train.swaps`, `{workout, swaps, left}`; yeni anahtar yok, veri envanteri değişmez) tutulur; Undo ve "Back to the planned move"
  onu da geri alır. Eski kayıtta (`left` yok) liste boştur.
- **Swap'tan çıkan hareket açık sayılmaz (K-973):** üzerinde set kalan eski hareket planın dışında kalan ekstra olarak satır olarak kalır ama
  `extraPlan` onu kapalı kurar (açık satırı yok, yapılacak seti yok): planlı hareketler bitince dock "Next: <eski hareket>" demez, "Finish" ya da
  "Next: cardio" der. Hareketin noktası ve yaptığı setler görünür kalır. Kullanıcı onu "Add a move" ile kendi eklerse yine açıktır: eklenen hareket
  `left`'ten çıkarılır ve kayda yazılır, ekran kapanıp açılınca kapalı dönmez (yalnız oturum içi `added`'a bağlı olsaydı dönerdi).
- **Kayıtlı swap yeniden doğrulanır:** `applySwaps`, kayıtlı `to`'yu planlı hareketin `swapOptions`'ına, telefonun kataloğuna ve günün başka planlı
  hareketi olmamasına karşı denetler; geçersizse yok sayar (onarmaz). **Neden:** hafta yeniden okunmuş ya da katalog değişmiş olabilir; geçersiz hareketin
  seti sunucuda reddedilir.
- **"N of M" sayacı:** planlı hareketin yeri, üzerinde ya da yerine geçen harekette set varsa sayılır (sayaç set başlamış hareketleri sayar,
  bitmiş değil); swap sayacı düşürmez.

## Ek 8 · Hedefsiz hareket: kilo seçilir, "Too heavy?" ve ilk set okuması telefonda yalnız seçer (K-973, #436, 2026-10-10, düzenleyici kararı, teknik)
- **Hedefsiz ve geçmişsiz hareket = ilk seans kalibrasyonu:** `nextLoadKg` yok ve hareketin hiç geçmişi yok (`hasHistory`: telefonda o hareketin başka
  bir antrenmandan kaydı yok **ve** sunucunun `lastBestSet`'i yok). Böyle harekette kilo **boş** başlar ("Pick a weight"); "Log set" kilo seçilene kadar
  kapalıdır ve nedeni yazar ("Pick a weight to log this set."). **Neden:** kullanıcı testi (8 Eki): ilk seansta hazır 100 kg; boş kilo "benim kilom"
  demektir. **Düzeltme (inceleme):** ilk sürüm "hedefsiz + `calibrationStepKg` var" ölçütünü kullandı; sunucu adımı izolasyon gibi hedef almayan her
  harekete **her seans** gönderdiği için o hareketler hiç geçmişi olsa da her seans boş başlıyordu. Ölçüt geçmiştir, adımın varlığı değil. Geçmişi olan
  harekette kilo (ve tekrar) eskisi gibi son seferin değeriyle dolar (telefonun kaydı, yoksa sunucunun `lastBestSet.loadKg`'i, K-960'ın
  `lighterLoadKg` kaynağıyla aynı başlangıç yükü). İlk dokunuş boş bar / en hafif dambıl / `set_load_step` (K-971 `stepLoad`, değişmedi).
  **Eklenen beden ağırlığı** (`BODYWEIGHT_PLUS_EXTERNAL`): 0 meşrudur (yalnız beden); kilo boş başlamaz, **0** ile başlar, alan boş bırakılırsa 0
  kaydedilir, "Pick a weight" ve "Log set" bekletmesi yalnız `EXTERNAL` harekette; "Starting weight found: 0 kg" hiç çıkmaz (0 bulunan kilo
  değildir; daha ağır bir ilk yük önerisi yine çıkabilir).
- **İlk setlerden sonra tek söz** (`calibrationRead`; yalnız **geçmişsiz** hareket, o **tarafın** son yapılan setine bakar, düzeltme/silme/atlama
  kendiliğinden yeniler): aralıkta ve cepte `calibration_rir_min` (2+) kadar tekrar kaldıysa ve salonun adım içinde bir üst yükü varsa "That weight is
  light. Next set {kg}?" (kullanıcı "Use {kg}" ya da "Keep {kg}" der; G6 K-40, ADR-075 #3, Ek 1); aksi halde "Starting weight found: {kg}." Aralığın
  altındaki set bir şey demez. Hedefli hareket, geçmişli hareket ve çıplak beden ağırlığı için söz yok. Tek taraflı harekette sağ satır, sol setin
  kilosundan öneri almaz: her taraf kendi setini okur. **"Keep"** hareket ve taraf başınadır: bir kez "Keep" denince o hareketin o tarafındaki
  sonraki satırlar aynı öneriyi yeniden sormaz ("Use" ve "Too heavy?" satır başınadır). Telefon eşik uydurmaz: tekrar aralığı, adım ve kalan tekrar
  sunucu/parametre. "Found" kolunun kaynağı: G6 K-40 [tecrübe] (RIR 1-2 geçerli çalışma seti, 2'den fazla kalan değil); seçicinin "2+"ı 2 ile 3'ü
  ayıramadığı için "light" okunur. Okuma bir hedef değildir, sonraki seansın yükü sunucunundur.
- **"Too heavy?"** (G1 karar #61): sunucunun `lighterLoadKg`'si, yalnız gösterilen kilodan hafifse. Yeri **kilonun hemen altı, kendi satırında**
  (set kartının içinde); "Skip set" dock'ta, "Skip move" hareket başlığında kalır. **Neden:** kilo hakkında bir soru, kiloya yakın durmalı; yanlışlıkla
  seti atlamak geri dönüşü olan ama can sıkıcı bir kaza, prototipteki yan yana yerleşim onu doğuruyordu. Cevap "Use {lighter} / Keep {current}" ikilisi
  (kalibrasyon önerisiyle aynı bileşen, `LoadNote`); seçim yalnız o satırın kilosunu değiştirir, sonraki satır "az önce kaldırılan"ı taşır. İki düğme
  de tam dokunma hedefidir (`Button size="touch"`, en az `size.touch`): set arasında elle, çoğu kez terli parmakla basılan bir seçim.
- **Hedef satırı:** hedef (`nextLoadKg × nextReps`) geçen seferin en iyi setine eşitse ("Beat last time 62.5 × 6 · Last 62.5 × 6" çelişkisi)
  tek ifade yazılır: "Match last time". Hedefsiz harekette geçen seferin seti varsa (swap tablosu) "Last time" ve kilo seçme ipucu; yoksa "First time".

## Ek 9 · Analiz satırı bugünün en iyi setinden, kardiyo son adımı kuyruğa yazar (K-973, #436, 2026-10-10, düzenleyici kararı, teknik)
- **Analiz satırı (#4) bugünün en iyi setinden okunur** (en ağır, sonra en çok tekrar, sonra en az kalan; `PlannedExercise.lastBestSet`in sıralamasıyla
  aynı), son yapılan setten değil: sunucu düzeltilmiş SYNCED seti sona ekler, telefonda düzeltme yerinde kalır; sıra bakan bir satır iki yerde farklı
  söylerdi, en iyi set sıradan bağımsızdır. Düzeltme, silme ve atlama satırı kendiliğinden yeniler (satır satırlardan türer, ayrı durum tutmaz).
  Kıyas yalnız **aynı kiloda** tekrar farkıdır ("+1 rep vs last time. 3 more and it's 65 kg." / zirvede "Top of the range: 65 kg next time." /
  "Same as last time. One more rep is the next step." / sabit tekrar hedefinde yalnız "Same as last time."); daha ağır kilo "Heavier than last time."
  der, kilo farklıyken tekrar kıyaslanmaz; geçen sefer yoksa ya da tekrar düştüyse "Logged. Next time starts from here." (suçlama yok, U7). Aralığın
  altı yalnız "Below the range." der (#3: kaynaksız "lighter" önerisi yok). Sayılar sunucunun: `lastBestSet`, aralığın tepesi, `nextLoadAtTopKg`
  (yoksa kilo söylenmez). **Tutulan hareket** ("as called"): `Program.loadHeldSince` varken hedefi olan hareket; telefon hareketin bileşik olup
  olmadığına bakmaz (izolasyon hareketin hedefi yoktur, sunucu zaten vermez). Hedefsiz harekette satır kalibrasyonun sözüdür (Ek 8), bu değil.
- **Kardiyo son adımı (#6, ADR-074 #3):** son hareketten sonra dock "Finish workout" yerine "Next: cardio" der, yalnız programın o gün ağırlıktan
  sonraki bir kardiyosu varsa (`Program.cardio.sessions`, yer `AFTER_LIFT`, günün haftagünü Train kartının okuduğu gibi; kapalı kardiyo,
  başka gün ve "easy, no weights" günü adım açmaz). Adım: süre ("30 min, easy"), tempo (konuşma testi), Done / Later today / Skip today, Finish;
  **kalori sayısı yok** (ADR-074 #5: yalnız saatin ölçümü, özet gösterir). Hareket noktaları üstte kalır; bir noktaya dokunmak hareketlere döner. Kısa
  sürümde "Optional today".
- **Done telefonda önce kaydedilir:** yeni kuyruk türü `cardio` (`NewCardioSession`: `clientId`, seansın günü, sunucunun dakikası, `MANUAL`;
  aktif enerji yok), `POST /v1/cardio-sessions`'a gider; set gibi çevrimdışı çalışır ve ekran yeniden açılınca kayıttan okunur (bir gün için kayıt varsa
  adım bir daha önerilmez). Eğitim kaydıdır, sağlık verisi değil (`HEALTH_KINDS` dışında). **Neden:** seans salonda, çoğu kez bağlantısız biter;
  doğrudan istek "Done"ı kaybettirirdi. **Reddedilen:** çevrimiçi anlık POST (seansın çevrimdışı çalışma ilkesini bozar); kardiyoyu bitirme isteğine
  eklemek (sözleşme değişir, kardiyo antrenman bitişinden bağımsız da kaydedilir, "+ › Cardio" K-980 aynı kuyruğu kullanır).
- **Later today / Skip today hiçbir şey göndermez** ve telafi doğurmaz (U7): "Later today" kullanıcının sonra "+ › Cardio"dan (K-980) girmesidir,
  "Skip today" sadece geçer. Seçim ekranda kalır, yeniden açılışta tutulmaz (kaydı olmayan bir niyet).
