# ADR-028 · M3 başı: Levent'in cevapları (sorular 21-24, Apple kimlikleri, referans görseller)
- **Durum:** KABUL (Levent, 30 Eyl 2026 — AskUserQuestion, M3 Part 1 başı)
- **Tarih:** 2026-09-30 · **Karar veren:** Levent (sağlık/veri/hukuk/lisans); uygulama ayrıntısı agent

## Bağlam
M2'nin son incelemelerinde (K-222, K-224, K-225) dört yeni soru çıktı (DURUM 21-24); Apple kimlikleri ADR-027 #7 ile
M3 başına bırakılmıştı; referans görünüş görsellerinin (K-224, Ö-4) kimin üreteceği ve lisansı açıktı. Hepsi M3 Part 1'in
0b adımında tek turda soruldu. Hukuki değerlendirme agent'ın okumasıdır, hukuk görüşü değildir (M8'de gözden geçirme).

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 21 | Rıza geri çekilince sağlık verisi | **(a) Silinir, uyarıyla:** geri çekme adımı "bu rızaya bağlı veri silinecek, önce dışa aktarabilirsin" der; onayla o rızaya bağlı veri silinir, geri dönüşsüz. Gerekçe: GDPR Md. 17(1)(b) rıza geri çekilince başka dayanak yoksa silme yükümlülüğü doğurur; gizli tutmak da işlemedir | Backend: `ConsentWithdrawn` dinleyicisi, modül başına silme → **K-231 (M4)**. Mobil: K-309 rıza geri alma ekranı uyarı + dışa aktarma bağlantısı gösterir |
| 22 | RFM ve LEA tabanı | **(c) LEA'da temkinli uç:** LEA ağı ve tabanı RFM'in bandının temkinli ucunu okur (alt − 5/6 puan → yağsız kütle büyük → taban yüksek). Faz kapısı ve L-4 nokta tahminle kalır. Görünüş seçimi varsa ADR-027 #11 geçerli (çelişirse temkinli olan) | Motor: `FatEstimate` LEA için ayrı okuma → **K-230 (M4)** |
| 23 | Hard stop süresi | **(b) Cut'a dönmeden önce döngü sorusu yeniden sorulur:** hard stop'tan sonra motor açığa (cut ya da aşağı adım) dönecekse önce soru sorulur; "düzeldi" gelirse dönülür, gelmezse bakımda kalınır | Karar: soru bütçesinde, motorun beklediği soru → **K-229 (M3 Part 3)** |
| 24 | HARD_STOP kaydının iz bırakması | **(b) Genel türle saklanır:** saklanan ve dışa aktarılan karar türü genel (plan değişikliğinin kendisi, ör. kalori artışı) + "güvenlik" etiketi; adet cevabı kayıttan çıkarılamaz (veri en aza indirme, GDPR Md. 9) | Karar kaydı + dışa aktarma → **K-228 (M3 Part 3)** |
| — | Apple kimlikleri (Team ID, Bundle ID, Services ID) | **Sonra verilecek.** Kod değer beklemeden yazılır, yapılandırmadan okunur (mobil `app.config`, backend ortam değişkeni); .p8 repoya girmez (V5) | K-305 / K-308 öncesi yeniden sorulur (DURUM) |
| — | Referans görünüş görselleri (7 seviye × 2 cinsiyet) | **Çizim, M3'te yer tutucu:** gerçek beden fotoğrafı değil nötr çizim (sipariş, sözleşmeyle tam telif devri). M3 onboarding metin açıklamalı yer tutucuyla çalışır; kim çizer ve bütçe M4 öncesi Levent'te | K-306 yer tutucu; çizim işi ayrı (para kararı açık) |

## Sonuç
Backlog'a eklendi: K-228 (genel karar türü), K-229 (hard stop sonrası yeniden sor) → M3 Part 3, K-227 ile aynı modül;
K-230 (LEA temkinli uç), K-231 (rıza geri çekilince silme) → M4. Açık kalan: Apple kimlikleri, çizim bütçesi/çizer.
