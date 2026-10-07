# Faz 5 · Part 2 · Tur 2 — araştırmadan yeniden kurulan yüz

- **Tarih:** 2026-10-07 (gece, Levent uyurken) · **Durum:** ÖNERİ, Levent'in onayında · **Prototip:** https://claude.ai/artifact/RzN9fM7BLhDrHjUMntmkXK
  (sürüm 2; kaynak `prototip/yeni-yuz.html`; değerlendirmeler `verdicts-r2`, tur 1 notları dizinde görünür)
- **Girdiler:** tur 1'deki 35 değerlendirme (artifact db `verdicts`) · `arastirma/ham/M1` (tam okundu) · M2, M3, M4, 05 (üç alt ajan, kaynaklı brif)
  · Strava/Hevy/IG Stories web taraması (alt ajan) · **yeni renk ölçümü** (aşağıda §5) · 18 rakibin App Store ekranları (bakıldı)
- **Levent'in istediği:** "Apify verisinden yola çıkarak, çok değişse bile güncelle; kalsın dediğim ama eleştirdiğim de okey değil; pazar bilen,
  para ve kullanıcı getirecek ürün; şovla."

## 1 · Teşhis (tek paragraf)

Tur 1 haftalık kararı merkeze koydu ama kategorinin parayı bastığı anı arka plana itti. Fitbod'un en uzun yaşayan reklamları "kas seç, antrenman
hazır" demosu (558 gün) ve "günün antrenmanı 3×10" içeriği (86-189 gün); BetterMe'nin uzun ömürlü ailesi set/tekrar ızgarası (M1 §5, §8). Yani
satılan şey **hazır antrenman**: salonda ne yapacağını bilmeyen kişiye bugün ne kaldıracağını söylemek. Bizim motor bunu zaten yapıyor (çift
ilerleme hedefleri, K-217), ama tur 1 bunu küçük bir satıra koydu ve onboarding'i kaloriyle bitirdi. Üstüne: kartlar ince çizgi + gri küçük metin
(zayıf), antrenman kaydı tablo (zayıf), antrenman sonu sade liste (alışkanlık anını kaçırıyor), paylaşım kartı "çocuk eğler gibi", "neden" katmanı
kullanıcıya konuşmuyor.

## 2 · Teklif: iki ritim (ürünün "sunduğu şey")

| Ritim | Kullanıcı ne alır | Motor karşılığı | Rakip |
|---|---|---|---|
| **Her seans** | Bugünün antrenmanı hazır: her hareketin ağırlığı ve tekrarı, "geçen seferi geç" | Çift ilerleme (`Progression`), dönüş adımı (`ReturnLoad`) | Fitbod, Hevy Trainer (artık özgün değil, **masa bahsi**) |
| **Her pazartesi** | Planın ayarlanır ve nedenini söyler; paylaşılabilir karar kartı | Haftalık karar (U3) | Yok: gerekçe gösteren rakip yok (M1 §6, 05 §6.2) |

Satış cümlesi (reklam = ürün): **"Stop guessing in the gym. Every Monday your plan adjusts, and tells you why."** İlk yarı kategorinin kanıtlanmış
acısı (Fitbod 810 aktif reklam), ikinci yarı yalnız bizde olan şey. Değişen motor kapsamı değil, **yüzün sırası**: antrenman önde, karar onun
üstünde kimlik, beslenme destek.

## 3 · Üç filme alınabilir an (reklam ↔ ürün, ADR-068)

1. **Plan hazır** (onboarding sonu): ilk antrenman 5 hareket, set × aralık; cevapların geri yansıtılır (Runna kalıbı). Reklam ailesi: uygulama demosu.
2. **Pazartesi kararı açılıyor**: büyük "Open" düğmesi (MacroFactor'ın check-in dairesi), tek soru, karar animasyonla gelir. Reklam ailesi: karar
   yükü skeci + "uygulama bana hayır dedi" (U2; M4 §5-D, rakipte yok).
3. **Antrenman sonu rekor + Story**: gerçek set rekoru ("Squat 100 × 8. Best ever."), haftanın 3/3'ü, tek dokunuşla Story. Ölçülmüş tek paylaşım
   etkisi Hevy'nin Story entegrasyonu: kurulum +%12, paylaşım +%42 (Meta vaka çalışması; şirket beyanı, orta-zayıf).

Mağaza ekran görüntüsü sırası bu üç an + kayıt + ilerleme olur (M2: Cal AI başlıkları 5-7 kelime).

## 4 · Levent'in notları → tur 2

| Ekran | Tur 1 notu (özet) | Tur 2 |
|---|---|---|
| Genel | renk Apify'dan; çok yazı; font güçsüz; mantık ve pazarlama kaygısı | §5 renk ölçümü; kelime hedefleri yine ölçülü (hepsi hedefte); başlık 900 ağırlık, gövde 17 px yarı kalın, gri metin azaldı; dolu kartlar |
| Hoş geldin | "Bench · 72.5 kg" kişisel veri yok | Reklamla aynı kanca + dönen örnek kararlar, kişisel veri yok |
| Hedef | "Decide for me" vurgulu | Büyük siyah kart, "Recommended". "decide" 25 rakip açıklamasının yalnız 1'inde (05 §6.1) |
| Program | işi almak değerli | "Build it for me" öne çıktı |
| Günler | çok karmaşık | Tek soru, tek dokunuş: kaç gün (2-5). Günleri uygulama yerleştirir; "geçen ay" ve "saat" soruları kalktı |
| Hakkında | kaydırmalı seçici; cinsiyet | Boy/kilo/doğum yılı kaydırmalı; cinsiyet iki seçenek, "Sex, for the energy math" (Levent: iki kalsın) |
| Başlangıç kararı | em dash yok | **Plan hazır** ekranına dönüştü; uygulamada uzun/orta tire yok (aralıklar "610-720") |
| Paywall | bindirme hatası; şovla | Hata düzeltildi; plan önizlemesi, üç değer, deneme zaman çizelgesi, "Best value" |
| Bu hafta | yemek satırı basılabilir mi belli değil | Bugünün antrenmanı hedef ağırlıklarla; yemek satırında "Log" düğmesi |
| Antrenman | hareket kartları zayıf | Siyah program kartı: hareket görseli (klip karesi, ADR-017), set × aralık, hedef kilo, kas çipleri |
| Oturum | kullanışsız; kilo çıkmazsa ne olacak | Baştan: koyu odak modu; tek büyük aktif set; adımlayıcılar; "Reps left 0/1/2+"; tek dokunuşla kayıt; "Too heavy?" (G1 #61); aralığın altında "Next set lighter?"; dinlenme halkası; hareket değiştir |
| Oturum sonu | dopamin anı, çok zayıf | Koyu kutlama: hafta segmentleri (Apple halkası değil, HIG), gerçek set rekoru + "Next time", artışlar, Story |
| İlerleme | analitik, tek çıktı | Tek cümle sonuç; güç grafiği (hareket seçimi) + **efor satırı** (rakipte yok, B §6.4); kas başına haftalık set; kilo; tutarlılık; karar geçmişi |
| Karar | daha net | Sade: ne değişti (hedef 72.5 × 9 yerine 72.5 × 8), iki neden, güven + tarih, paylaş, "Keep last week's plan" |
| Gerekçe (katman 2) | çok kötü, gidebilir | **Kalktı.** U3'ün dört parçası karar ekranında; karar geçmişi İlerleme'de |
| Paylaşım | çocuk eğler gibi; kendi foto; Story | Strava kalıbı: şeffaf istatistik çıkartması (karar / antrenman / haftalar), arka plan Instagram'da ya da kendi fotoğrafın; "Share to Story" önce |
| Pazartesi check-in | mantık hassas | Pazartesi dili, tek soru, "Show my call" |
| Dönüş | (kalsın) | Motorun gerçek kuralı: 3+ hafta aradan sonra ilk seans bir basamak hafif (G7 K-72, `ReturnLoad`) |

## 5 · Görsel dil önerisi (ADR-016'nın yerine aday)

**Renk ölçümü (yeni, 7 Eki):** Apify ham verisindeki 426 reklam karesi + 18 uygulamanın 134 App Store görseli indirildi (Levent izni), Lab renk
uzayında ölçüldü, sonra silindi. Yöntem ve tablolar: `arastirma/ham/M5-renk-olcumu.md` (betikler `M5-renk/`).
- Reklamlarda canlı renk kütlesi: %44 mavi-çivit (Cal AI, WW, Gymverse, MFP), %40 sıcak (ten, salon ışığı, Fitbod bordo). **Turkuaz-camgöbeği %0**,
  macenta %0,2.
- Uzun yaşayan reklamlar (≥90 gün, 144 kare) **daha az renkli** (%2,5'e karşı %4,7): kazandıran renk değil, gerçek çekim. Renk markayı taşır, kancayı değil.
- Uygulama içi vurgular: Fitbod bordo, Strava turuncu, Hevy mavi, Ladder neon sarı-yeşil, Gymverse çivit, Muscle Booster lacivert, Lose It turuncu.
- **Turkuaz** (#007C8C açık / #2EE6D6 siyah üstünde / #35D7CF koyu): en yakın rakip vurgusuna ΔE 22,5 (Hevy mavisi); beyaz yazı 4,93; siyah üstünde
  12,3. Ten ve sıcak salon ışığının tamamlayıcısı: kullanıcının fotoğrafı üstündeki çıkartmada öne çıkar. Cinsiyet kodu yok.
- **Rubin** (#B0129A): ΔE 18,5, o da boş bölge; "kadın uygulaması" riski hiç test edilmedi (ADR-069). Prototipte karşılaştırma için duruyor.

**Öneri:** açık zemin varsayılan · siyah karar bloğu (zeminin tersi) · birincil düğme açıkta siyah, koyuda turkuaz · turkuaz yalnız siyah üstünde,
işaretlerde, rekorda ve vurgu sayılarda · antrenman ekranı her zaman koyu (odak modu; 06 §6, Runna canlı koşu, Ladder oynatıcı) · başlık Barlow
Condensed 900 (reklam altyazısıyla aynı ses), gövde SF Pro 17 px · kartlar dolu yüzey, 16 px köşe · hareket küçük görseli her listede (ADR-017 klip
karesi) · arayüzde uzun/orta tire yok.

## 6 · Kod tarafına düşen işler (onaydan sonra görev kartı)

| İş | Not | Kaynak / karar |
|---|---|---|
| Seans içi "çok ağır" ve aralığın altı önerisi | Bir yük basamağı hafif (üst 2,5 / alt 5 kg); kullanıcı seçer | G1 #61 → `kural-ekle` (aralığın altı yorumu Levent/Güray teyidi) |
| 1. hafta davranış ayarı (B4) | "2 days, not 3" | Güray "uyum < %50 → önce uyumu çöz" → `kural-ekle` |
| Hareket değiştir | Aynı kas, salonda olan ekipman | Katalog + ADR-032 → ADR |
| Onboarding sadeleşmesi | "geçen ay seans" ve "antrenman saati" soruları kalkar; saat ilk kayıttan çıkarılır, gün seti varsayılan | Sözleşme (`Profile`) etkisi → ADR |
| Story paylaşımı | `react-native-share` 12.3.1 `INSTAGRAM_STORIES` + `react-native-view-shot` 5.1.0 (SDK 57); Expo plugin'e `instagram-stories` elle; **Meta App ID** gerekir (hesap → Levent) | Ajan C (Meta dokümanı, npm) |
| ADR-054 güncellemesi | Kart 9:16, kullanıcı fotoğrafı yalnız cihazda birleşir, ilerleme fotoğrafı seçicide yok, kilo yok | Levent onayı (B8 yerine) |
| Görsel dil ADR'si | §5 | Levent onayı |
| Masa bahisleri (L3 §1.1) | ısınma seti, plaka hesabı, Live Activity dinlenme, süperset, not | Backlog |

## 7 · Levent'e sorular (sabah)

1. **Teklif "iki ritim"** (§2): antrenmanı öne alan sıra onaylı mı? (Ürün kapsamı; motor değişmiyor.)
2. **Renk:** Turkuaz (önerilen, ölçümle) mı Rubin mi?
3. **Deneme süresi (para):** 7 gün en fazla bir pazartesi kararı içeriyor; pazartesi kaydolan kişide karar ücret gününün sabahına düşüyor.
   Seçenekler: 7 gün kalsın / 14 gün / "ilk karar + 3 gün". Uzun deneme daha iyi dönüşüyor (17-32 gün %42,5, ≤4 gün %25,5; I1 §E2, vendor).
   Fiyat önerisi 05 §7.3'te 59,99 $/yıl (karar senin, M10).
4. **Seans ekranı koyu** (odak modu): kalsın mı?
5. **Geç girilen kayıt haftayı sayar mı** (06 B1b): Strava/Hevy sayıyor; "telafi" değil "düzeltme". Önerim: sayar.
6. **"Forgiven week" yerine "spare week"**: payı görünür kılmak etkiyi artırıyor (Sharif & Shu, orta; 06 B2). Önerim: "spare".
7. **Meta App ID** (Story için): Facebook geliştirici hesabı açman gerekecek (hesap/sır).

Kalan 06 §7 soruları (B1, B3, B9, B12) bu turun onayından sonra.

## 8 · Risk ve dürüst kalibrasyon
- Renk ölçümü vekil: piksel kütlesi, harcama değil. Uzun yaşayanların daha az renkli çıkması "renk önemsiz" demek değil, "kanca renkte değil" demek.
- Antrenman sonu ekranının "en çok alışkanlık yapan ekran" olduğu ölçülmemiş (M3; ajan B). Ölçülen: bilgi veren olumlu geri bildirim (d=+0,33),
  somut ödül zararlı (d=−0,28). Ekran buna göre: rozet/XP yok, gerçek set ve haftanın bağı var.
- "Kararı veren uygulama" tek seans düzeyinde artık özgün değil (Hevy Trainer, Fitbod). Fark: birden çok veri kaynağından haftalık karar ve gerekçesi.
- Dış kullanıcı testi yok (ADR-069 #5); 5 saniye testi hâlâ yapılmadı.

---

# Tur 3 (7 Eki öğleden sonra) — "kullanıcı da karar verir"

**Levent'in tur 2 hükmü** (`verdicts-r2`, 37 kayıt): "kesinlikle çok daha iyi ama mükemmelden uzak". Ana eksik **kullanıcının işe karışabilmesi**:
uygulama öneriyor ama dayatıyor; kendi programı olanı dinlemiyor, değerlendirip ikna etmiyor; yeni başlayan ile tecrübeliyi ayırmıyor; kardiyo yok.
Ölçüt deterministik mükemmellik değil, **kullanıcı davranışı ve satılabilirlik**.

**Cevaplar (AskUserQuestion):** renk **turkuaz** · deneme "ilk karar + 3 gün" · geç kayıt **sayar** · kardiyo **Güray'ı dinle**.
- **Deneme, doğrulama:** App Store ücretsiz deneme süreleri sabit: 3 gün, 1 hafta, 2 hafta, 1-2-3-6 ay, 1 yıl
  ([Apple, introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/)).
  Kişiye göre değişen süre kurulamaz. Niyeti ("herkes ücretten önce ilk kararı ve ardından en az 3 günü görsün") karşılayan en kısa sabit süre
  **2 hafta** (ilk karar en geç 7. gün; ücrete ≥4 gün). Prototipte 2 hafta. **Levent onayı bekliyor** (para).
- **Kardiyo:** G2 K-29..K-36. Ç-4'te en yeni kaynak (YAG25, Nis 2025) esas: yağ kaybında **haftada 2 × 30 dk**, düşük tempo (konuşma testi,
  ~110 nabız, K-33), ağırlıktan **sonra** (K-35; öncesinde asla), HIIT yok (K-34), 30 dk ≈ 300 kcal ideal doz (K-31). Bulk'ta 2-3 × 20-30 dk
  (KRD24). Çok aktif işte azalır (K-32 koşulu). Off gün tercihen tam dinlenme (K-36).
- **Yakılan kalori:** Apple Watch'un ölçtüğü aktif enerji (HealthKit, K-404 zaten okuyor) gösterilir, "Apple Watch" etiketiyle. Saatsiz kullanıcı
  için tahmin formülü kaynak ister (MET, araştırmada yok) → şimdilik gösterilmez.

**Tur 3'te ne değişti (prototip sürüm 3):**

| Alan | Değişiklik | Dayanak |
|---|---|---|
| Onboarding | Deneyim sorusu (yeni / <1 yıl / 1-3 / 3+); tecrübeli için çalışma ağırlıkları (atlanabilir); yeni başlayan ağırlıklarını 1. seansta bulur | Levent genel notu; G1 K-5 (RIR) |
| Kendi programı (akış 1b) | İçe aktar (Strong/Hevy) ya da gir → **program incelemesi**: 6 gün (K-36), göğüs 18 set (K-11 üst bant), hamstring 4 set (K-11 alt bant) → 3 öneri, her biri aç/kapa; "Use mine with 3 changes" / "Keep mine as is" | Levent: "programımı değerlendirmedi, ikna etmeye çalışmadı" |
| Antrenman (sekme) | Her harekette değiştir; "Change": kısa sürüm, meşgul salon, taşı, atla; "Edit": günler, hareketler, kardiyo, split, yeniden kur; kardiyo satırı | Levent: dayatma yok, özgürlük |
| Oturum | Dinlenme üstte, hiçbir düğmeyi kapatmaz, son sette çıkmaz; duraklat; bitir / sonra doldur / at; seti düzelt; set ve hareket atla; her setten sonra analiz ("+1 rep vs last time. 2 more and it's 105 kg."); 1. seansta "2+ kaldıysa ağırlaştır"; sonda kardiyo | Levent; çift ilerleme, G1 K-5, G1 #61, G2 K-35 |
| Antrenman sonu | Animasyonlu "Workout complete"; dakika, kaldırılan toplam kilo (+%6), set, Apple Watch kalorisi; rekor; ne arttı; kas haritası; hafta 3/3; "Share your workout" | Levent: "başardım" anı; M3 bilgi veren geri bildirim |
| Paylaşım | "The call" kalktı. Çıkartmalar: antrenman, rekor, seri, gelişim; fotoğraf ya da **video** arka plan; hareketli sayılar; Story, TikTok | Levent: insan gibi, pazarlama, video |
| Karar / 1. hafta | Paylaş kalktı. Karar: "Got it" + "Keep last week's plan". 1. hafta: "Sounds right" / "Change it" (3 gün kalsın, 2 gün benim seçimim) | Levent; B11 |
| Check-in (1. hafta) | "How did week 1 feel?" sorusu; karar onu da okur | Levent: zayıf cümle |
| İlerleme (ilk gün) | Tıklanabilir hedefler (kalori, protein öğünlere; adım Apple Health'e; kardiyo programa) + kas haritası (planlanan) + kilitli güç önizlemesi + tartı noktaları | Levent: "en kötü ekran" |
| Dönüş | Seçenekli: hafif başla (önerilen, G7 K-72) / kaldığım yerden / yeniden kur | Levent: öner, dayatma |
| Duraklat | Modern ikonlu döşemeler | Levent |
| Görsel | Oynat rozeti yalnız tıklanabilir yerde (hareket görseli → nasıl yapılır) | Levent: "video izlenecek sanıyorum" |

**Kod tarafına eklenen işler (tur 2 listesine ek):**
- **Program incelemesi** (yeni motor yeteneği): kas başına haftalık set bandı (K-11: 4-15, hedef ~10), sıklık (K-22: 2×), gün sayısı (K-36),
  tekrar aralığı (K-21) → öneri listesi; kullanıcı her birini uygular ya da reddeder. `kural-ekle` + ADR.
- **Kardiyo reçetesi**: G2 K-29..K-36 parametre dosyasına (`cardio_sessions_per_week_cut` 2 · dakika 30 · sonrası sınırı 30 dk), aktivite
  düzeyine göre azalma. `kural-ekle`.
- **Başlangıç ağırlığı kalibrasyonu**: 1. seansta RIR'a göre set set ağırlaştır/hafiflet (G1 K-5, G1 #61). `kural-ekle`.
- **Set analizi satırı**: çift ilerlemenin mevcut çıktısından (kaç tekrar kaldı, kaç kilo sonra) üretilir; yeni kural değil, sunum.
- **Geç kayıt haftayı sayar** (B1b, Levent): U7 yorumu ADR'ye; "telafi" (eksiği fazlasıyla ödetmek) yasak kalır.
- **Deneyim alanı** profile (sözleşme değişikliği) → ADR.
- **Apple Watch aktif enerji** antrenman özetinde (K-404'ün okuduğu veri; yeni okuma: antrenman penceresi).

**Hâlâ Levent'te:** 2 haftalık deneme onayı · Meta App ID (Story) · 06 §7 kalanları (B1, B3, B9, B12).
