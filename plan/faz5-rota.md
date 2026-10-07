# Faz 5 · Rota — ürünün yeni yüzü (KABUL → ADR-069)

- **Tarih:** 2026-10-07 · **Durum:** KABUL (ADR-069) · **Dayanak:** `arastirma/06-faz5-yuz.md` + `arastirma/ham/M0-M4` · cihaz turu (ADR-067)
- **Bu dosya ne:** araştırmanın ürüne çevrilmiş hâli. Kes / değiştir / ekle / kalsın listesi ve sıra. Her madde kanıta bağlı (dosya + bölüm).
  Ekran çizimi değil: ekranlar prototipte çizilir, bu liste prototipin brifidir.
- **Kanıtın sınırı (dürüst kalibrasyon):** R1 neyin **sattığını** ölçer, neyin **tuttuğunu** ölçmez (vekil ölçü, yalnız ABD, harcama yok). R2'deki rakip
  ekranlarının çoğu pazarlama görseli. Ürünü henüz senden başka kimse kullanmadı. → Yön **yüksek güvenle**, ayrıntı **orta güvenle**. Ayrıntıyı
  prototip + 5 saniye testi doğrular. Rota yalnız reklam verisinden çizilmez: R1 vaadi ve anı, R2 akışı, R3 tutmayı, R4 paylaşımı belirler.

## 1 · Yön (tek cümle)

**Keel, salonda ne yapacağını tahmin etmekten yorulmuş insanın haftalık kararını veren ve nedenini gösteren uygulamadır.**
Rakiplerin sattığı acı bu (M1 §0.1, §6); rakiplerin göstermediği şey neden (M1 §6, M4 §5-A). Ürünün her ekranı ya bu kararı besler (kayıt) ya
gösterir (karar) ya da paylaştırır (kart). Gerisi ana yüzeyden iner.

## 2 · Kes — ana yüzeyden kaldır (kod silinmez; gizlenir ya da birleşir)

| Ne | Neden | Kanıt |
|---|---|---|
| Today'deki **"Ask the coach" çubuğu** ve koç çipleri | Kahraman öğeyle yarışıyor; AI üretimde kapalı → çıkmaz sokak (K-909). Koç, kararın içinde "neden"e soru olarak kalır | M2 çıkarım 3; I2 B1 (keyhole); cihaz #7 |
| **Projeksiyon + SCOFF** ekranları (v1 yüzünden) | Varsayılan kapalı (U12), tarihli kullanılamaz; rakiplerin "aha"sı bizde kurulamıyor; karmaşıklık | M2 K15, gerilim; M3 gerilim (etki kanıtı yok); ADR-069 |
| **What-if** ve **Karar geçmişi** ayrı ekranları | "Neden"in ikinci katmanına birleşir: "bunu ne değiştirir" tek satır + geçmiş bağlantısı | M2 çıkarım 4 (Runna şablonu) |
| **Tarifler** (v1 yüzünden) | Beslenme derinliği; kategori hızı ödüllendiriyor (öğün 2-3 dokunuş); odak ağırlık | M2 K9, çıkarım 7; ADR-069 |
| **Beslenme sekmesi** | Odak ağırlık (ADR-069); ağırlık uygulamalarının normu 3 sekme + giriş. Öğün "+"tan, kalan bütçe (aralık) "Bu hafta"da tek satır, hedefler İlerleme'de | M2 K9, K10; Fitbod/Hevy 3 sekme |
| Onboarding **photos** ekranı (hiçbir şey sormuyor) ve **foods** (isteğe bağlı) | Ekran başına değer; foto izni ilk foto gününde zaten isteniyor | M2 çıkarım 2, 9 |
| Onboarding'deki **Apple Health** ekranı | İzin ilk kullanıldığı ana taşınır | M2 K4, çıkarım 9 |
| Ekranlardaki **paragraflar** (her yerde) | Kullanıcı ~%20 okur; Today ~105 kelime vs rakip 25-50 | M3 §7.1; M2 kelime tablosu |
| AI kapalıyken **öğün fotoğrafı** girişi | Çıkmaz sokak; AI açılınca geri gelir | cihaz #7, K-909 |

## 3 · Değiştir

| Ne | Nasıl | Kanıt |
|---|---|---|
| **Onboarding** (10 → ~7 adım) | goal · program · schedule · about · activity · [sağlık verisi rızası — yasal, kalır] → **"Planın hazırlanıyor"** → **başlangıç kararı** → paywall (deneme zaman çizelgesi + hatırlatma). Ekran başına ≤25 kelime | M2 K1-K3, çıkarım 1-2; M1 §9 |
| **Today** | Tek kahraman: **bu haftanın kararı** (etiket + check-in geri sayımı). Altında hafta şeridi (haftalık tutarlılık, U7) ve tek **"+"**. İlk görünüm ≤40 kelime | M2 K7-K9, çıkarım 3, 5; M3 §7 |
| **Kayıt** | Hepsi "+"tan: tartı ≤4, öğün 2-3, set 1 dokunuş (önceki dolu, tek ✓) | M2 K9, K11, çıkarım 7 |
| **Pazartesi check-in + "Neden"** | Tek akış: durum etiketi · gerekçe maddeleri · sayılan veri · küçük grafik · güven + sonraki tarih (U3) · "bunu ne değiştirir" · **Paylaş** | M2 çıkarım 4; M4 çıkarım 4 |
| **Dönüş** ("hayat araya girdi", `state`) | Suçlamasız karşılama + boşluğa göre kademeli seçenek; pazartesi yeni başlangıç | M3 §5, çıkarım 3 |
| **Paylaşım kartı** | Karar kartı (9:16, 3 sn'de okunur) + tutarlılık + PR; şeffaf çıkartma biçimi; varsayılanda kilo/yağ/foto/kalori yok | M4 çıkarım 1-5; M1 çıkarım 2 |
| **Tema** | Açık varsayılan + uygulama içi seçici; tek vurgu; beslenmede tarafsız renk | M2 K17, çıkarım 6; M3 çıkarım 11 |
| **Bütün metin** (`data/copy/en.json`) | Baştan yazılır: etiket + sayı + tek satır neden; gerekçe bir dokunuşla | M3 §7; M2 çıkarım 2 |
| **Sekmeler** | **3 sekme: "Bu hafta" · Antrenman · İlerleme + tek "+"** (tartı, öğün, antrenman başlat). Salon/ekipman, içe aktarma, durum modu, yiyecek kısıtı ayarlarda | M2 K10; ADR-069 |

## 4 · Ekle
- **"Planın hazırlanıyor" + başlangıç kararı** ekranı (onboarding'in aha'sı) — M2 K1-K2.
- **Haftalık karar kartı** (paylaşılabilir; reklamdaki 3 saniyelik an) — M1 §5, M4 §5-A.
- **Hafta şeridi** (Pzt-Paz, haftalık tutarlılık) — M2 K8.
- Sonra (v1.x): widget "bu hafta X/Y + bugünün tek eylemi" — M3 çıkarım 10; 12 haftalık dönem özeti — M4 çıkarım 3.

## 5 · Kalsın (masa bahsi — iyi çalışıyor, yalnız yüzü değişir)
Antrenman kaydı (önceki değer, dinlenme sayacı, süperset), tartı, HealthKit okuma/yazma, barkod, foto gizliliği (K-618), içe aktarma (Strong/Hevy,
ayarlarda), salon/ekipman (ayarlarda), VoiceOver, motor ve U3 karar yapısı, haftalık tutarlılık (U7), sunucu.

## 6 · Reklam ↔ ürün (aynı vaat)
Bize açık kanca aileleri: **karar yükü skeci** (en uzun yaşayan aile), **itiraf/POV**, **uygulama demosu** (karar kartı 3 sn), **faydalı içerik**
(RIR, deload, "neden bu hafta tut"). Kapalı: önce/sonra, üretilmiş beden, yağ %, ilaç (U4, U6, U12; 05 §3.1). — M1 §5, §10-11.

## 7 · Sıra
1. **Çatal kararları** (Levent, bu dosyanın §8'i) → bu dosya KABUL, ürün yönü ADR'si.
2. **Prototip** (Faz 5 Part 2): bütün ekranların yeni yüzü, tıklanabilir artifact; açık + koyu; gerçek İngilizce metin.
3. **Test:** Levent telefonda ekran ekran (ADR-069 #5; dış test bu turda yok).
4. **ADR'ler:** görsel dil (ADR-016'nın yerine) + 06 §7 adayları.
5. **Yeni kilometre taşı** (yol haritası: "M9 ara · Yeni yüz"): metin, onboarding, Today, "+", check-in/neden, tema, kesilenler — görev kartları
   kabul kriteriyle, kod.
6. TestFlight → **M9 Part 3 (beta)** → organik içerik (05 §3) aynı vaatle.

## 8 · Çatallar — Levent'in kararı (7 Eki, AskUserQuestion)
- **Odak:** salonda ağırlık çalışan (önerilen).
- **Kesilecekler:** "tamamen sana bırakıyorum… rasyonel ve acımasız olarak indir" → §2'deki liste agent'ın kararı (ADR-069 #3).
- **Onboarding aha'sı:** başlangıç kararı (önerilen; anayasa değişmez).
- **Test:** yalnız Levent.
- **Part 2 başında (7 Eki, AskUserQuestion — dördünde önerilen):**
  - **B4 · 1. hafta anı → davranıştan tek ayar.** İlk pazartesi check-in'i kilo trendine bakmaz (U8 yerinde); planlanan/yapılan seans ve tutan
    günlerden **tek** plan ayarı verir ("3 planlandı, 2 oldu, Pzt/Per → gelecek hafta 2 gün, Pzt/Per" ya da "hepsi oldu → aynı plan"). U15'in
    1. hafta anı böyle karşılanır. Kaynak: Güray "uyum < %50 → kaloriye dokunma, önce uyumu çöz" (03 §, satır 164) + M3 çıkarım 4. Yeni motor
    kuralı → `kural-ekle` (kod session'ında).
  - **B11 · kabul/ret → varsayılan uygulanır.** Pazartesi kararı plana kendiliğinden girer; tek ikincil seçenek "Bu hafta eski planla devam".
    Reddetmek kararı değiştirmez (U2), sonraki haftanın verisine "uygulanmadı" diye girer. Güvenlik durağı (U13) reddedilemez.
  - **B13 · teklif → sert paywall + 7 gün deneme** (ADR-058 kalır). Deneme ≥7 gün: ilk pazartesi kararı ücretten önce düşer. Paywall deneme
    zaman çizelgesi gösterir (bugün erişim · hatırlatma · ücret günü). Fiyat ayrı karar (M10).
  - **B8 + B10 · paylaşım kartı → karar + tutarlılık + gerçek set.** Bu haftanın kararı (büyük), tek satır neden, "11 / 12 weeks", haftanın en
    iyi seti gerçek değer olarak ("100 kg × 5"). Kilo yok (anahtar da yok); yağ %, foto, beden, kalori yok; tahmini max (e1RM) kartta yok.
    U4 pazarlamayı ve kartı da kapsar.
- **Session sonunda (B1, B3, B9, B12):** prototip onayından sonra.
- **Prototip turları (7 Eki, Levent; artifact db `verdicts`, `verdicts-r2`, `verdicts-r3`):**
  - Tur 1 → "yeterli değil": tur 2 araştırmadan yeniden kuruldu (`prototip/tur2-strateji.md`). Tur 2 → "çok daha iyi, mükemmelden uzak":
    kullanıcının işe karışması eksik. Tur 3 → **onaylandı** ("tamamdır süper", 7 Eki); akış testi 10/10 (`prototip/akis-testi.md`).
  - **Renk: turkuaz** (ölçüm `arastirma/ham/M5-renk-olcumu.md`). **Cinsiyet:** iki seçenek, "for the energy math".
  - **Paylaşım:** Strava kalıbı (şeffaf çıkartma + kendi foto/video); **haftalık karar paylaşılmaz** ("the call" yok), paylaşım antrenman sonundan.
  - **"Neden" katman 2 kalktı**; karar ekranında iki madde.
  - **Geç kayıt haftayı sayar** (B1b: düzeltme, telafi değil). **Kardiyo: Güray** (G2 K-29..K-36; Ç-4'te YAG25: yağ kaybında 2 × 30 dk, ağırlıktan sonra).
  - **Deneme:** Levent "ilk karar + 3 gün" seçti; App Store sabit süre → **2 hafta** önerildi, **onay bekliyor**.
  - **Kullanıcı da karar verir:** deneyim sorusu, kendi programı + program incelemesi, bugünü/programı değiştir, 1. hafta kararını değiştir, dönüşte seçim.
- **Part 3 (7 Eki, Levent):** deneme **2 hafta** · Meta App ID Story görevinde · telafi tanımı (U7'ye işlendi) · rekabet v1'de yok (v1.x adayı) ·
  pazarlama kuralı sonra, Apify raporlarıyla · logo çıkartmada her zaman · kardiyo Güray solo (KRD24) + kullanıcı özgürlüğü · motor 3 günün altını
  önermez · ürün ADR'leri KABUL → **ADR-070..078**; kod kilometre taşı M9a (`plan/oturum-promptlari/YENI-YUZ-kod.md`).
