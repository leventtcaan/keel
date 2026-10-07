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
