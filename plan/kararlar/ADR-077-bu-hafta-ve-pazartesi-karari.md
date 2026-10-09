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
