# ADR-027 · M2 sonu: Levent'in cevapları (sorular 0-20)
- **Durum:** KABUL (Levent, 30 Eyl 2026 — AskUserQuestion)
- **Tarih:** 2026-09-30 · **Karar veren:** Levent (ürün/sağlık/veri/hukuk); uygulama ayrıntısı agent

## Bağlam
M1 ve M2 boyunca ürün, sağlık, veri ve hukuk kararları tahmin edilmedi; DURUM › "Session sonunda Levent'e
sorulacaklar" listesinde biriktirildi (0-20). Bu ADR cevapları ve her birinin koda/plana etkisini kaydeder.

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 0 | Tek sabit hafta (K-113 A) | **K-64 beklemesi herkese:** yavaş kaybeden erkekte de tek sabit hafta kesinti değil, bir hafta daha beklenir | ADR-021 madde 2 değişir; K-223 |
| 1 | L-4 alt yağ sınırı | **Evet:** iç yağ tahmini kadında <%18, erkekte <%8 → açık durur (J1 L2.1) | Yeni SafetyNet kuralı + parametre; K-223 |
| 2, 18 | Hard stop gerekçesinin saklanması | **Genel etiket:** karar saklanır, gerekçe "güvenlik: düşük enerji" gibi genel bir etiketle; adet cevabının izi kalmaz | Saklanan karar ve dışa aktarma; K-222 |
| 3 | Deload 1-2. basamak cut'ta | **Evet, çalışsın** (şimdiki) | Değişiklik yok; DeloadLadder notu güncellenir |
| 4 | Görünüş aynı/fotoğraf yok | **Devam** (şimdiki) | ADR-021 madde 4 kalıcı olur |
| 5 | Açık hangi makrodan | **Karbdan** (şimdiki) | Değişiklik yok; G7 K-117 çelişkisi kapandı |
| 6 | Aktivite sorusu | **4 NASEM düzeyi, günlük hayattan örnekli** (şimdiki 4 seviye) | M3 onboarding metinleri |
| 7 | Apple kimlikleri | **M3 başında** verilecek | M3 prompt'u ilk iş olarak sorar |
| 8 | Kayıt sapması mesajı | **İçeride kalsın** | Değişiklik yok; kullanıcıya metin yok |
| 10 | Barkod bulunamayınca | **Türk pazarı hedef değil;** özel yol yok, genel aramaya düşer | Değişiklik yok; TürKomp araştırması düştü |
| 11 | İç yağ tahmini kaynağı | **İkisi birden:** referans görsellerden seçim (göbek testi, Ö-4) + bel/boy'dan kaba bant yalnız kapı için; çelişirse temkinli olan | K-224 (araştırma: WHtR → bant eşlemesi kaynaklanmalı, U14) |
| 11b | LEA tabanı yokken aşağı adım | **Kadında dursun:** yağ tahmini yokken kadında kalori aşağı adımı yok (hız ve güvenlik kararları çalışır); erkekte BMR + makro tabanıyla devam | K-223 |
| 12 | Rıza metinleri | **Şimdilik onaylı;** M8'de hukuk gözden geçirmesi, sürüm 1-draft kalır | Değişiklik yok |
| 13 | Yaş kapısı | Levent: "canlıya çıkarken sorun çıkarmayacak şekilde" → **kesin 18+** (agent seçimi: ülkeye göre değişmeyen tek eşik; GDPR Md. 8 ebeveyn rızası ve ülke farkları yok; SCOFF 18 kuralıyla tutarlı). Yalnız doğum yılı tutulduğu için kesinlik = bu yıl − doğum yılı ≥ 19 (yılın her günü 18); bu yıl 18 olan Ocak'a kadar bekler | Profil doğrulaması; K-225 |
| 14 | "Yiyemediğim gıdalar" | **Sağlık rızasına bağlansın** | Profil alanı rıza kapısında; K-225 |
| 15 | Program şablonları | **Onaylı; uygulama en fazla 6 gün** seçtirir, 7. gün dinlenme | M3 onboarding (sunucu zaten 7'ye 400) |
| 16 | FDC toplu veri | **Foundation + SR Legacy şimdi** indirilip içe aktarılsın; Branded disk açılınca ayrıca | K-226 |
| 17 | "Karar sen ver" başlangıcı | **Yağ tahminiyle faz kapısı;** tahmin yoksa varsayılan CUT (G4 K-4) | K-222 (K-224'e bağlı) |
| 19 | Adım hedefi | **10.000 tavan kalır, metin düzelir** ("aynı sonuç" değil, "daha az ama güvenli bir itki") | en.json; K-223 |
| 20 | Kaydı olmayan gün | **Ne yapıldı ne kaçırıldı** (uygulandı; K-221'de antrenman için de aynı) | Değişiklik yok |

## Sonuç
Uygulanacak işler backlog'a eklendi: K-222 (faz/mini cut/hard stop uygulaması + DECIDE_FOR_ME + genel etiket),
K-223 (motor: K-64 herkese, L-4 alt yağ, kadında LEA'sız aşağı adım yok, adım metni), K-224 (iç yağ tahmini: referans
seçimi + WHtR bandı; eşleme araştırmadan), K-225 (profil: 18+ ve kısıt alanı rıza kapısında), K-226 (FDC Foundation +
SR Legacy içe aktarma). ADR-021 madde 4 artık geçici değil.
