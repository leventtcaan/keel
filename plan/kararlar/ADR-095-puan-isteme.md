# ADR-095 · Uygulama içi puan isteme: Apple'ın penceresi, rekorlu bitişte
- **Durum:** KABUL (Levent, 2026-11-28)
- **Tarih:** 2026-11-28 · **Karar veren:** Levent (öneren: agent) · **Kart:** K-1254 (#821)
- **Kaynak:** `arastirma/ham/puan-isteme-2026-11-28.md`

## Bağlam
Levent 28 Kas'ta (9c-8 sırasında) mağaza puanının uygulamadan istenmesini istedi: "app dünyasına yabancıyım, yapılması gereken ne varsa yapmalıyız".
Mağazada yorum yok; puan hem dönüşümü hem aramayı etkiler. Apple yalnız kendi penceresine izin verir (5.6.1), zorla ya da ödülle puan yasak (3.2.2(x)),
süzgeçli geri bildirim manipülasyon sayılır (Business giriş paragrafı). Pencere yılda en çok 3 kez çıkar, TestFlight'ta hiç çıkmaz, düğmeye bağlanmaz.

## Karar sürücüleri
- Apple kuralı ve hesap riski: yaptırım geliştirici programından çıkarmaya kadar gidebilir.
- U7: suçlama, baskı, telafi yok; puan isteği bir ödül ya da kilit değildir.
- Kişinin gerçekten iyi hissettiği an (HIG: "demonstrated engagement"), kesinti anı değil (set, dinlenme, kayıt).
- Veri telefonda kalır (V1-V3): "en son ne zaman sorduk" yalnız cihazda.

## Karar
1. **API:** `expo-store-review` `~57.0.3` (Expo'nun kendi paketi; alternatif: kendi yerel modülümüz → bakım yükü, gerekçe yok). `app.config.ts` › `ios.appStoreUrl`.
2. **An (önerilen A):** antrenman bitiş ekranında, sunucu bu oturumda en az bir **yeni rekor** (`RECORD`) listelediyse, ekran açıldıktan kısa süre sonra.
   Şartlar parametre dosyasında (`data/parameters/review.json`): en az N bitmiş antrenman (öneri 3), ilk kullanımdan en az M gün (öneri 7), iki istek
   arası en az 14 gün (HIG "a week or two"); aynı gün paywall/satın alma olduysa sorulmaz; antrenman oturumunda (odak modu) asla.
3. **Ayarlar:** "Uygulamayı puanla" satırı mağazanın yorum sayfasını açar (`…?action=write-review`, Apple'ın izin verdiği kalıcı bağlantı).
4. **Yok:** "Uygulamayı sevdin mi?" ön penceresi (süzgeç), ödül, kilit, bildirim ya da e-postayla puan isteme.
5. **Dağıtım:** yerel modül → yeni dev build + yeni mağaza ikilisi (OTA değil); mağaza yayını Levent'te. TestFlight'ta pencere görünmez:
   simülatörde (geliştirme derlemesi) görülür, gerçek davranış ancak mağazada.

## Alternatifler
- **B · Haftalık karardan sonra** ("Anladım"a basınca, 2. karardan itibaren): ürünün kalbi ama karar her zaman iyi haber değil (hedefe doğru değil, kalori düşüyor); kötü haberden sonra puan istemek ters teper.
- **C · A + B:** daha çok fırsat; Apple zaten 3/365 ile sınırlar, fazla tetik bir şey kazandırmaz.
- **D · Yalnız Ayarlar satırı:** risksiz ama neredeyse kimse basmaz.

## Sonuçlar
- Pozitif: mağazada puan birikir; Apple'ın penceresi uygulamadan çıkmadan puan aldırır.
- Negatif: yeni paket ve yeni ikili; etkisi ancak mağaza sürümünde ölçülür (TestFlight'ta görünmez).

## Levent'in kararı (28 Kas)
1. **An: A · rekorlu bitiş.** B ve C seçilmedi.
2. **Eşikler uygun:** en az 3 bitmiş antrenman, ilk kullanımdan en az 7 gün, iki istek arası en az 14 gün; aynı gün paywall ya da satın alma olduysa sorulmaz.
3. **Ayarlar'da "Uygulamayı puanla" satırı olsun.**
