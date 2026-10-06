# Ekran envanteri — yeni yüz (Faz 5 Part 2, ADR-069)

- **Tarih:** 2026-10-07 · **Durum:** TASLAK — prototip onayıyla kesinleşir · **Dayanak:** ADR-069, `plan/faz5-rota.md` (§2-§5, §8),
  `arastirma/06-faz5-yuz.md` §3-§6 · **Bugün:** 43 ekran (`apps/mobile/src/app/`: 4 sekme + 29 tekil + 10 onboarding)
- **Bu dosya ne:** prototipin brifi. Her ekran: amaç, gösterdiği veri, giriş noktası, hedef kelime. Prototipteki kimlik (`#id`) aynı.
- **Kelime sayımı:** ekranın ilk görünümündeki içerik metni; sekme çubuğu, sistem çubuğu, sayılar ve tek harfli gün etiketleri hariç.
  Prototip her ekranın sayısını dizinde canlı gösterir (ADR-069 Doğrulama).
- **Örnek kişi (prototipteki bütün sayılar):** erkek, 1999 doğumlu, 178 cm, 84 kg, hafif aktif, hedef yağ kaybı, program "bizden", Pzt/Çar/Cum.
  Başlangıç: motorun kendi formülü (`InitialTarget`, Mifflin × 1,6) → bakım **2.916 kcal** (± %15 → 2.479-3.353, U5), 14 gün gözlem (G2 K-8).
  Protein 2,0 g/kg → 168 g. Adım 7.000.

## Yeni iskelet (tek bakışta)

```
Giriş ─ Hoş geldin (Apple) → 6 soru → Planın hazırlanıyor → Başlangıç kararı → Paywall (7 gün deneme) → Bu hafta
Sekmeler ─ Bu hafta · Antrenman · İlerleme        + (her sekmede): Tartı · Öğün · Antrenman başlat · (ikincil) Hayat araya girdi
Pazartesi ─ Bildirim/Bu hafta → Check-in (≤2 soru) → Karar (Neden katman 1) → Gerekçe (katman 2) → Paylaşım kartı
Dönüş ─ Kopuştan sonra açılış → suçlamasız karşılama → boşluğa göre seçenek → Bu hafta
Ayarlar ─ Bu hafta'nın sağ üstü: tema, birimler, hatırlatmalar, Apple Health, salonlar, içe aktarma, yiyecek kısıtı, rızalar, abonelik, hesap
```

## 1 · Giriş ve onboarding (10 → 6 soru + 2 yeni + kapı)

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç · gösterdiği veri | Giriş | Kelime |
|---|---|---|---|---|---|---|---|
| 1 | `welcome` | Hoş geldin | `sign-in.tsx` | değişir | Vaat tek cümle + örnek karar kartı (reklamın 3 saniyelik anı) + Apple ile giriş. Hesap başta kalır: başlangıç kararını motor sunucuda verir (U1), cevaplar oraya gider | İlk açılış | ≤25 |
| 2 | — | Kontrol ediliyor | `checking.tsx` | kalır (teknik) | Oturum var, onboarding durumu bilinmiyor → bekleme | Kök düzen | ≤8 |
| 3 | `ob-goal` | Hedef | `onboarding/index.tsx` | değişir | Yağ kaybı / kas / "sen seç" — açıklama satırları gider | Onboarding 1/6 | ≤25 |
| 4 | `ob-program` | Program | `onboarding/program.tsx` | değişir | Kendi programım / bizden | 2/6 | ≤25 |
| 5 | `ob-days` | Günler | `onboarding/schedule.tsx` | değişir | Gün seçimi + geçen ay seans → "3 gün planlıyoruz" (çıkarım geri verilir, I1 A2); saat isteğe bağlı | 3/6 | ≤25 |
| 6 | `ob-consent` | Sağlık verisi rızası | `onboarding/health-data.tsx` | değişir (yasal, kalır) | GDPR Md. 9 açık rıza; metnin tam hâli bir dokunuşla. Sağlık sorusundan önce | 4/6 | ≤25 + tam metin |
| 7 | `ob-about` | Hakkında | `onboarding/about.tsx` | değişir | Boy, doğum yılı, cinsiyet, kilo; bel → ilk gerektiği ana taşınır (zaten "yalnız gerekince") | 5/6 | ≤25 |
| 8 | `ob-activity` | Gün | `onboarding/activity.tsx` | değişir | 4 düzey, tek satır etiket (NASEM) | 6/6 | ≤25 |
| 9 | `ob-preparing` | Planın hazırlanıyor | — | **yeni** | 3 satır gerçek iş: "bakım tahmini · 3 günlük plan · ilk pazartesi" (sahte ilerleme çubuğu yok; adımlar sunucu cevabına bağlı) | Son sorudan | ≤20 |
| 10 | `ob-start` | Başlangıç kararı | — (`expectations.tsx`'in yerine) | **yeni** | U3'ün dört parçası: eylem (2.916 kcal, 3 seans Pzt/Çar/Cum) · gerekçe (tek satır) · güven ("tahmin, ölçünle düzelir") · tarih (ilk ayar pazartesi, geri sayım). Pazartesi bildirimi teklifi burada (K-434'ün yeri) | Hazırlanıyor'dan | ≤40 |
| 11 | `paywall` | Paywall (kapı) | `subscribe.tsx` | değişir | Sert (ADR-058), 7 gün deneme zaman çizelgesi: bugün · 5. gün hatırlatma · 7. gün ücret (B13). Restore, yasal bağlantılar, hesap bölümü (5.1.1(v)) | Başlangıç kararından | ≤45 |
| — | — | Fotoğraflar | `onboarding/photos.tsx` | **iner, giriş yok** | Hiçbir şey sormuyordu; kamera izni ilk foto gününde | — | — |
| — | — | Yiyecekler | `onboarding/foods.tsx` | **iner → Ayarlar** | Kısıt Ayarlar › Yiyecek kısıtı (rızaya bağlı kalır) | — | — |
| — | — | Beklentiler | `onboarding/expectations.tsx` | **iner** | İçeriği başlangıç kararına girer (tarih + "ilk 14 gün yorum yok" tek satır) | — | — |
| — | — | Apple Health | `onboarding/apple-health.tsx` | **iner → anında izin** | İzin ilk tartı/antrenmanda (`health-jit`), ADR-018 bu yönde güncellenir | — | — |

## 2 · Sekmeler ve "+"

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç · gösterdiği veri | Giriş | Kelime |
|---|---|---|---|---|---|---|---|
| 12 | `home` | **Bu hafta** | `(tabs)/index.tsx` | değişir | Kahraman: haftanın kararı (etiket + tek satır) + check-in geri sayımı. Altında hafta şeridi (Pzt-Paz, tutarlılık "11/12", U7) ve bugünün tek eylemi. Kalan bütçe tek satır (aralık, U5). Koç çubuğu, çipler, paragraflar yok | Sekme 1 | **≤40** |
| 13 | `train` | Antrenman | `(tabs)/train.tsx` | değişir | Bu haftanın günleri; sıradaki seans büyük "Start"; merdiven kararı (lighter week…) tek etiket; geçmiş oturumlar listesi | Sekme 2 | ≤40 |
| 14 | `progress` | İlerleme | `(tabs)/progress.tsx` | değişir | Tutarlılık (hafta ızgarası) · güç (hareket başına gerçek en iyi set + grafik) · kilo trendi (7 gün, ilk 14 gün yorumsuz) · hedefler (kalori, protein, adım) · fotoğraflar · önceki kararlar | Sekme 3 | ≤50 |
| 15 | `plus` | "+" sayfası | — | **yeni** | Tartı · Öğün · Antrenman başlat; ikincil satır "Life got in the way" (bir giriş noktası, Bu hafta'yı temiz tutar) | Her sekmede "+" | ≤15 |
| — | — | Beslenme sekmesi | `(tabs)/food.tsx` | **iner** | Öğün "+"tan; kalan bütçe Bu hafta'da; hedefler İlerleme'de | — | — |

## 3 · Kayıt

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç · gösterdiği veri | Giriş | Kelime · dokunuş |
|---|---|---|---|---|---|---|---|
| 16 | `weigh` | Tartı | `weigh-in.tsx` | değişir | Son kilo dolu, ±0,1 adım + tuş takımı, Kaydet. Sonra tek satır: "7-day trend" (yorum yok) | "+" | ≤12 · **≤4 dokunuş** |
| 17 | `health-jit` | Apple Health izni (anında) | `onboarding/apple-health.tsx`'in içeriği | **taşınır** | İlk tartıda bir kez: "Apple Health'ten kilo ve adım okuyalım mı?" → Apple'ın sayfası | İlk tartı / ilk antrenman | ≤30 |
| 18 | `meal` | Öğün | `meal.tsx` | değişir | Öğün adı saatten; "Same as yesterday" ve son yiyecekler tek dokunuş; arama; barkod. Kalori aralık (U5), tarafsız renk | "+" | ≤25 · **2-3 dokunuş** |
| 19 | `barcode` | Barkod | `meal.tsx` içi | kalır | Kamera → ürün → miktar | Öğün | ≤10 |
| 20 | `workout` | Oturum | `workout.tsx` | değişir (yüz) | Hareket, setler önceki/hedef dolu, **tek ✓**, RIR tek dokunuş, dinlenme sayacı kendiliğinden | Antrenman › Start, "+" | set **1 dokunuş** |
| 21 | `summary` | Oturum özeti | `workout-summary.tsx` | değişir | Hedef efora ulaşan hareketler, PR (gerçek set), haftada kaçıncı seans | Oturum sonu | ≤35 |
| 22 | — | Hareket | `exercise.tsx` | kalır | Kurulum + klipler (ADR-017) | Oturum › hareket adı | — |
| 23 | — | Hareket geçmişi | `exercise-history.tsx` | kalır | Rekorlar + seanslar | Hareket, İlerleme › güç | — |
| 24 | — | Oturumu düzelt | `workout-edit.tsx` | kalır | Yanlış seti sil, unutulanı ekle | Antrenman › geçmiş | — |

## 4 · Pazartesi: check-in, karar, neden, paylaşım (ürünün ana anı)

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç · gösterdiği veri | Giriş | Kelime |
|---|---|---|---|---|---|---|---|
| 25 | `checkin` | Check-in | `check-in.tsx` | değişir | Yalnız sunucunun sorduğu ≤2 soru (U9), her birinin yanında tek satır neden; seçenek büyük düğme | Pazartesi bildirimi, Bu hafta kahramanı | ≤30 |
| 26 | `call` | **Karar** (Neden, katman 1) | `why.tsx` + check-in sonucu | değişir (birleşir) | Runna şablonu: **etiket** · tek satır · gerekçe maddeleri (≤3) · sayılan veri (seans 3/3, tartı 6/7) · küçük grafik · güven + sonraki tarih (U3) · "Bunu ne değiştirir" tek satır · **Share** · ikincil "Keep last week's plan" (B11; güvenlik durağında yok) | Check-in sonu, Bu hafta kahramanı | ≤60 |
| 27 | `reasoning` | Gerekçe (katman 2) | `why.tsx` (kurallar), `what-if.tsx`, `ledger.tsx` | **birleşir** | Uygulanan kurallar + kaynak türü (U14: deneyim/literatür) · okunan veri · "ne değiştirir" örnek haftalar · önceki kararlar listesi | Karar › "See the reasoning" | — (ikinci katman, sınırsız değil: madde) |
| 28 | `share` | Paylaşım kartı | `share.tsx` | değişir | 9:16 kart: karar (büyük) · tek satır neden · "11 / 12 weeks" · haftanın en iyi seti "100 kg × 5". Kilo, yağ %, foto, beden, kalori, e1RM yok (B8+B10). Kartta ürün adı küçük | Karar › Share | kart ≤25 |
| 29 | `week1` | 1. hafta kararı (örnek) | — | **yeni durum** | B4: davranıştan tek ayar ("2 of 3 sessions, both Mon/Fri → 2 days next week") ya da "all 3 → same plan". Kilo yorumu yok (U8) | İlk pazartesi | ≤60 |

## 5 · Dönüş ve durum

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç · gösterdiği veri | Giriş | Kelime |
|---|---|---|---|---|---|---|---|
| 30 | `return` | Dönüş | — (`state` + motor) | **yeni** | Kopuştan sonra ilk açılış: suçlamasız karşılama (+%27, M3); boşluğa göre seçenek: 1 hafta → kaldığın yerden · 2-3 hafta → hafif başlangıç haftası (Güray "moladan dönüşte yavaş başla") · 4+ → planı yeniden kur. Pazartesi yeni başlangıç | Uygulama açılışı (≥7 gün kayıtsız) | ≤35 |
| 31 | `life` | Hayat araya girdi | `state.tsx` | değişir | 5 durum tek satır etiket; süre; "Pause my week" | "+" ikincil satır | ≤30 |

## 6 · Ayarlar ve alt ekranlar

| # | `#id` | Ekran | Bugünkü dosya | Durum | Amaç | Giriş |
|---|---|---|---|---|---|---|
| 32 | `settings` | Ayarlar | `settings.tsx` | değişir | **Tema (Light / Dark / System — yeni, varsayılan Light)** · birimler · hatırlatmalar · Apple Health · salonlar · içe aktarma · yiyecek kısıtı · antrenman günleri · rızalar · abonelik · hesap (dışa aktar, sil, çıkış) | Bu hafta sağ üst |
| 33 | — | Salonlar / Salon | `gyms.tsx`, `gym.tsx` | kalır | Ekipman | Ayarlar |
| 34 | — | İçe aktarma | `import.tsx` | kalır | Strong/Hevy | Ayarlar |
| 35 | `photos` | Fotoğraflar (çek) | `photo-capture.tsx` | kalır (yüz) | Ön + yan, seviye; "never uploaded" | İlerleme › Photos, foto haftası satırı |
| 36 | — | Karşılaştır | `compare.tsx` | kalır | İki gün yan yana | Fotoğraflar |
| 37 | — | Paywall (özellikten) | `paywall.tsx` | kalır | Ayarlar › abonelik | Ayarlar |

## 7 · Ana yüzeyden inenler — giriş yok (ADR-069 #3; kod silinmez)

| Ekran | Dosya | Ne olur | Geri açılırsa |
|---|---|---|---|
| Koç | `coach.tsx` | Today çubuğu ve çipleri kalkar. AI açıkken yalnız Gerekçe katmanında "Ask about this call" (K-909 kapanır) | AI sağlayıcısı + rıza |
| Öğün fotoğrafı | `meal-photo.tsx` | AI kapalıyken giriş yok | AI açılınca Öğün'de |
| Tarifler, tarif | `recipes.tsx`, `recipe.tsx` | Giriş yok (ADR-034 kodu yerinde) | v1.x |
| Projeksiyon, SCOFF | `projection.tsx`, `scoff.tsx` | Giriş yok (ADR-050 aynen geçerli) | v1.x |
| What-if, karar geçmişi | `what-if.tsx`, `ledger.tsx` | Ayrı rota olarak giriş yok; içerikleri Gerekçe katmanında | — |
| Beslenme sekmesi | `(tabs)/food.tsx` | Sekme kalkar | — |
| Onboarding: photos, foods, expectations, apple-health | `onboarding/*.tsx` | Bkz. §1 | — |

## Sayım

Bugün 43 → yeni yüzeyde **31 erişilebilir ekran** (yukarıdaki 1-37'den teknik `checking` ve alt ekranlar dahil) + 4 yeni (`ob-preparing`,
`ob-start`, `plus`, `return`) + 1 yeni durum (`week1`). İnen: 13 ekran (koç, öğün fotoğrafı, tarifler ×2, projeksiyon, SCOFF, what-if, karar
geçmişi, beslenme sekmesi, onboarding ×4). Prototip, kalan ve yeni ekranların hepsini çizer; "kalır (teknik)" ve yüzü değişmeyen alt ekranlar
(hareket, geçmiş, düzelt, salon, içe aktarma, karşılaştır) dizinde listelenir ama çizilmez.

## Açık (prototipte sınanır)
- Hafta şeridinde gün işareti: seans günü dolu daire, kayıt günü nokta (U7: boş gün kırmızı değil, yalnız boş).
- "Life got in the way" `+` içinde mi, Bu hafta'da metin bağlantısı mı (şimdilik `+`).
- Görsel dil: açık varsayılan, tek vurgu. RUBİN mi SAHA mı → prototipte iki vurgu yan yana denenir (L2 §8), karar Levent'in.
