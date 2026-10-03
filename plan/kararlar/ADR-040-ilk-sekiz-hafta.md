# ADR-040 · İlk 8 hafta ve 5. hafta riski
- **Durum:** KABUL (teknik, agent — ADR-019). Ürün açıkları DURUM'da soru (65-66).
- **Tarih:** 2026-10-03 · **Karar veren:** agent · **Görev:** K-513 (motor + sunucu), K-521 (telefon)

## Bağlam
04 §7.5 ve I1 F2, ilk 8 haftayı hafta hafta tarif eder: H1 sessiz, H2 ilk performans karşılaştırması, H3 tutarlılık paneli ve "neden
bu metrik", H4 nöral açıklama ve ilk ölçüm penceresi, H5 eşik ve **risk skoru**, H6 ilk kez "kas", H7 hafta 1 ile hafta 7, H8 8 haftalık
dosya. Kaynak 5. haftanın sinyallerini sayar ama birleştirme ağırlığı vermez (kaynak taraması: "risk ağırlıkları kaynakta yok").

## Karar
1. **Hafta sayımı:** hesabın açıldığı gün, kullanıcının takviminde, 1. haftanın ilk günüdür. Hafta = açılıştan bu yana geçen gün / 7 + 1
   (`FirstWeeks.of`; haftanın ilk günü `FirstWeeks.weekStart`). Takvim haftası değil, kişinin kendi haftası ("kullanıcının kendi haftasından", K-513 kabulü). Akış 1-8;
   **9. hafta yalnız risk için açık** (8. haftanın davranışı orada okunur, içerik yok); sonrası akış yok.
2. **İçerik anahtarı** motorda saf fonksiyon: `FirstWeeks.of(facts)` → `first_weeks.week<N>` (metinler `en.json`). H1'de içerik yok
   (I1 F2: "yorum yok, skor yok"). **Antrenman planlamayan** kullanıcı `first_weeks.no_training.week<N>` okur: H2 (performans), H4
   (nöral), H6 (kas) antrenman üzerinedir; kas vaadi antrenmansız kullanıcıya söylenmez. "Kas" kelimesi ilk kez H6'da ve "may" ile
   (I1 F2: "hipertrofi ancak şimdi ölçülebilir hâle geliyor"); H4'ün olumsuzu ("not muscle yet") izinlidir — kas demiyor, henüz değil
   diyor. H5 metni koşulsuz: kaynaktaki "eşik geçildi" bildirimi 12'de 9'a bağlı, herkese söylenemez.
3. **Risk (I1 F2, G2 K-63):** **biten kullanıcı haftası** 5-8 iken (yani 6-9. haftalarda) o haftanın sinyalleri:
   - seans yok (ısınma dışı setli antrenman, K-431), kişinin 7 gününde;
   - affedilen hafta kullanıldı (Consistency'nin tek affettiği hafta, 04 §7.3; I1 F3: "af kullanımı churn'ün öncü göstergesi").
     Af **takvim haftasıyla** sayılır (kullanıcının gördüğü sayı Pzt-Paz); kişinin 7 günü tam bir Pazar içerir, yani içinde tam bir
     takvim haftası biter — o okunur, sonrakiler okunmaz. Hesap motorda: `Consistency.lastWeekForgiven` (sayacın aynı yürüyüşü: tek
     kaçan hafta, öncesinde hedefte bir hafta; koşu yoksa af yok; duraklayan/plansız hafta atlanır, kendisi affedilmiş sayılmaz). Sayaç o hafta yoksa (ilk karar
     sonra) af yok; takvim haftaları o haftadan **önce** bitiyorsa çağıranın hatasıdır → istisna (sinyal sessizce kapanmasın);
   - kayıt düştü: biten haftada öğün kaydı olan gün `min_logged_days_per_week`'in altına indi, önceki hafta o eşikteydi — yeni eşik yok;
   - **uygulama açılmaması** sunucuda bilinmez (açılış yalnız telefonda, K-410) → K-521.
   **Birleştirme: herhangi biri = risk.** Ağırlık yok: kaynak ağırlık vermiyor, uydurulmaz (U14). Biten hafta duraklamışsa (beyan, ADR-038) sinyal yok.
4. **Risk varken soru bütçesi** haftanın anomali bütçesi (`question_budget_per_week_anomaly`, 5; U9): `CheckInQuestions.largerBudget`.
   **Tavandır, soru sebebi değil:** sorular yine yalnız motorun beklediği cevaplardır. Bugünkü motor anomali dışında en fazla 2 soru
   bekler (TRAINING/RECOVERY yalnız "daha kötü görünüyor"da, o da anomali) — yani genişleme bugün gözlenebilir bir şey değiştirmez;
   motor yeni bir soru beklediğinde devreye girer. Mesaj: tek, insan tonunda, suçlamasız (U7) — telefonda (K-521).
5. API: `GET /v1/first-weeks` → `{week, contentKey?, risk: [Reason]}`; 9. haftadan sonra 404 (akış bitti). Sunucu (`DecisionService.firstWeeks`):
   açılış günü kimlik modülünden (`AccountDates.began`, decision → identity bağımlılığı, ADR-015 güncellendi), kullanıcının haftası
   profilin saat diliminde; seans = ısınma dışı setli antrenman günü (iki antrenman bir gün = bir seans), kayıt = öğün olan gün;
   **merdivenin mola haftası da duraklatır** (K-435: mola haftası susar; Prompts ile aynı) — planlı dinlenmede "seans yok" risk değildir.
   Takvim haftaları sayacın kendisinden (`WeekLogs.consistency(...).weeksOver`), plan yoksa yok. Akış dışında hiçbir kayıt okunmaz
   (`FirstWeeks.open`): iki yıllık kullanıcı her check-in'de bunun için okunmaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Ağırlıklı risk skoru (0-1) | Ağırlıklar kaynakta yok; uydurmak U14'e aykırı. "Herhangi biri" kaynağın "risk varsa" diline denk |
| Takvim haftası | Kullanıcı Çarşamba başlarsa 1. hafta 4 gün olurdu; kaynak kişinin haftasını sayar |
| Risk içinde bulunulan hafta 5-8 iken | Biten hafta 4-7 okunur, 8. haftanın davranışı hiç okunmaz (ilk inceleme bulgusu) |
| Affı kişinin haftasıyla yeniden saymak | Kullanıcının gördüğü af takvim haftasının; iki ayrı "af" çelişirdi |
| Kayıt düşüşüne yeni eşik | Mevcut, kaynaklı `min_logged_days_per_week` aynı şeyi söylüyor ("yeterli kayıtlı hafta") |

## Sonuçlar
- Kimlik modülü hesabın açılış anını dışarı açar (`Accounts`/okuyucu); decision bütçesi riskle büyür.
- Açık: uygulama açılmaması sinyali (K-521), içerik metinlerinin son hâli (taslak, Levent onayı).
