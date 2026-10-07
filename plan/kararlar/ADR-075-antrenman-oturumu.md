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

## Ek 1 · İlk seans kalibrasyonunda "bir basamak ağır" telefonda nasıl bulunur (K-960, 2026-10-07, agent, teknik)
Hedefi olmayan harekette kilo seans sırasında kullanıcının girdiği değer; sunucu bunu önceden bilemez, `heavierLoadKg` hesaplanamaz.
Karar: sunucu yalnız bu hareketler için `calibrationStepKg` (bölgenin yük basamağı, `load_increment_upper_kg`/`_lower_kg`, H3 B4) gönderir;
telefon girilen kiloya ekler ve ısınma setlerinin kullandığı ortak `loadSteps.round` ile salona yuvarlar (ADR-032, K-417). Ne zaman önerileceği
(`calibration_rir_min`, G6 K-40) ve ne kadar (bir basamak) parametre/sunucu kaynaklı kalır; telefon kural seçmez, yalnız salonun ağırlığına
yuvarlar. Reddedilen: sunucunun her hareket için salonun bütün kilo merdivenini göndermesi (yük ağır, sınır gerekir).
"Too heavy?" için hafif seçenek her zaman bulunur (inceleme, 7 Eki): salonun bir basamak içinde yapabildiği en hafif kilo (mümkünse tam bir basamak aşağı), basamak içinde yoksa
salonun bir alt basamağı (başlangıcın altındaki en ağır kilo); yalnız rafın/barın dibinde yok. Ağır seçenek bir basamakla sınırlı kalır
(aşmak risk). İzolasyon hareketleri hiç hedef almadığı için her seans kalibrasyon basamağı taşır; "hedef kilosu yokken" tanımına uygun.
