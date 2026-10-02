# ADR-040 · İlk 8 hafta ve 5. hafta riski
- **Durum:** KABUL (teknik, agent — ADR-019). Ürün açıkları DURUM'da soru (65-66).
- **Tarih:** 2026-10-03 · **Karar veren:** agent · **Görev:** K-513 (motor + sunucu), K-521 (telefon)

## Bağlam
04 §7.5 ve I1 F2, ilk 8 haftayı hafta hafta tarif eder: H1 sessiz, H2 ilk performans karşılaştırması, H3 tutarlılık paneli ve "neden
bu metrik", H4 nöral açıklama ve ilk ölçüm penceresi, H5 eşik ve **risk skoru**, H6 ilk kez "kas", H7 hafta 1 ile hafta 7, H8 8 haftalık
dosya. Kaynak 5. haftanın sinyallerini sayar ama birleştirme ağırlığı vermez (kaynak taraması: "risk ağırlıkları kaynakta yok").

## Karar
1. **Hafta sayımı:** hesabın açıldığı gün, kullanıcının takviminde, 1. haftanın ilk günüdür. Hafta = açılıştan bu yana geçen gün / 7 + 1;
   1-8 dışı: akış yok. Takvim haftası değil, kişinin kendi haftası ("kullanıcının kendi haftasından", K-513 kabulü).
2. **İçerik anahtarı** motorda saf fonksiyon: `EightWeeks.of(week)` → `first_weeks.week<N>` (metinler `en.json`). H1'de içerik yok
   (I1 F2: "yorum yok, skor yok").
3. **Risk (I1 F2, G2 K-63):** 5-8. haftalarda, **biten takvim haftasının** (Pzt-Paz; tetikleyiciler ve Consistency ile aynı hafta) sinyalleri:
   - seans yok (ısınma dışı setli antrenman, K-431);
   - affedilen hafta kullanıldı (Consistency'nin tek affettiği hafta, 04 §7.3; I1 F5: "af kullanımı öncü gösterge");
   - kayıt düştü: biten haftada öğün kaydı olan gün `min_logged_days_per_week`'in altına indi, önceki hafta o eşikteydi — yeni eşik yok;
   - **uygulama açılmaması** sunucuda bilinmez (açılış yalnız telefonda, K-410) → K-521.
   **Birleştirme: herhangi biri = risk.** Ağırlık yok: kaynak ağırlık vermiyor, uydurulmaz (U14). Biten hafta duraklamışsa (beyan, ADR-038) sinyal yok.
4. **Risk varken soru bütçesi** haftanın anomali bütçesi (`question_budget_per_week_anomaly`, 5; U9). Mesaj: tek, insan tonunda,
   suçlamasız (U7) — telefonda (K-521).
5. API: `GET /v1/first-weeks` → `{week, contentKey?, risk}`; 8. haftadan sonra 404 (akış bitti).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Ağırlıklı risk skoru (0-1) | Ağırlıklar kaynakta yok; uydurmak U14'e aykırı. "Herhangi biri" kaynağın "risk varsa" diline denk |
| Takvim haftası | Kullanıcı Çarşamba başlarsa 1. hafta 4 gün olurdu; kaynak kişinin haftasını sayar |
| Kayıt düşüşüne yeni eşik | Mevcut, kaynaklı `min_logged_days_per_week` aynı şeyi söylüyor ("yeterli kayıtlı hafta") |

## Sonuçlar
- Kimlik modülü hesabın açılış anını dışarı açar (`Accounts`/okuyucu); decision bütçesi riskle büyür.
- Açık: uygulama açılmaması sinyali (K-521), içerik metinlerinin son hâli (taslak, Levent onayı).
