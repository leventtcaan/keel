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
