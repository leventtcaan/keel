# Evre 5 son kontrol — devam (29 Eki 2026 ~11:30 UTC)

Önce oku: `DURUM.md › ▶ DEVAM NOKTASI`, `plan/son-kontrol-2026-10-29.md` (Levent'in isteği ve 5 bacak), bu dosya.

## Durum
- Build 7 TestFlight'ta. ASC 1.0: build 5 incelemeden geri çekildi, build 7 bağlandı, Save edildi, Add for Review ile **taslak** oluştu;
  **Submit to App Review YAPILMADI** (Levent "dur" dedi). Yayın şekli: Manually release. Ego task space 19 ("keel asc build 7") Levent'e geçti.
- Fotoğraf akışı #657 (K-1055, #656): tam ekran kamera, siluet, ön/arka, sakin açı, önizleme, sonuç. Simülatörde yürüdü (giriş, izin, kamera,
  kütüphane, Retake, 3 s geri sayım, side, sonuç, kart, silme). K1: test değişiklikleri `.envanter/notes.md` sonunda; Levent onayı bekler.
  Kamera cihazda denenecek (build 8).
- Birleşenler bu oturum: #647 #652 #653 #654 #655 (+ #657 CI'da).
- Pazar araştırması: `arastirma/ham/pazar-rakipler-2026-10-29.md`, `pazar-kullanici-sesi-2026-10-29.md`, `pazar-cikis-2026-10-29.md`.
  Öne çıkanlar: haftalık sayı değerli ama "neden" yoksa güven kırılıyor; bir kaçırılan gün en büyük kayıp nedeni; sessiz ve basit tasarım;
  ABD'de kg/cm varsayılanı şikâyet; yıllık + deneme; onboarding sonunda değer ekranı sonra paywall; ilk 3 ekran görüntüsü kararı göstermeli.
- Zaman simülasyonu: sunucuda saat yok, check-in yalnız bu hafta. Hafta 2-4 için motor düzeneği `backend/src/test/java/app/keel/engine/GoldenScenarioTests.java`
  + `backend/src/test/resources/golden/scenarios.yaml` (persona senaryosu ekle: unutulan tartılar, yarım öğün, atlanan antrenman); ekran için
  `/Users/leventcanceylan/Projects/keel-sim` sahte sunucu (fixture.js). İlk karar: 14 gün yorum yok, pencere erkek 21 / kadın 28 gün.

## Persona yürüyüşünde şimdiden not edilenler
- Karşılama ekranı yarısı boş (ilk izlenim). Birim varsayılanı ABD için (lb/ft) doğrulanmalı; metrik kullanıcıya "3 oz" varsayılan porsiyon.
- OFF'ta akla yatmayan enerji (Lezita chicken 397-531 kcal), Bugünün yemekleri aynı öğün tekrarını gruplamıyor, düzeltme ekranında "Log it",
  yüzen + This week'te "Log" bağlantısını örtüyor, fotoğraf silme onayı sistem uyarısı değil (ADR-087 ile tutarsız) ve "Keep them" sekme
  çubuğunun altında, Progress fotoğraf kartında son fotoğraf küçük resmi yok, ilk 2-4 hafta karar yok (vaat riski: ilk haftalar akışı yeter mi).

## Sıradaki adımlar
1. #657 birleşmesini gör. Persona yürüyüşü: gün 1 (gerçek sunucu, simülatör: onboarding için çıkış gerekir, Levent'in Apple girişi);
   haftalar 2-4 motor senaryosu; ekran ekran yargı + bulgu tablosu `plan/son-kontrol-2026-10-29.md`'ye.
2. Satış hunisi: ürün sayfası metni ve ilk 3 ekran görüntüsü önerisi, onboarding → değer → paywall, fiyat/deneme önerisi (karar Levent'te).
3. Bulguları düzelt (P0 → P2), PR + test + kanıt. 4. Build 8 → TestFlight → Levent cihazda → ASC Submit (Levent'in onayıyla).
