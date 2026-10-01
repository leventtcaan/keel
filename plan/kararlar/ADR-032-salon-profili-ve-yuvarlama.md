# ADR-032 · Salon profili, ekipman türü ve gerçekçi artış yuvarlama
- **Durum:** KABUL (teknik, agent — ADR-019; madde 5'in büyük sıçrama sorusu Levent'te, soru 38)
- **Tarih:** 2026-10-01 · **Karar veren:** agent

## Bağlam
K-414 (L3 #9, Y7): motorun "+2,5 kg" kararı (K-109, H3 B4) dambılları 2 kg atlayan salonda uygulanamaz → karar
güvenilirliği zedelenir. Kart: bar, plaka, dambıl adımı, makine listesi; birden çok salon; artış mümkün en yakın yüke
yuvarlanır, mümkün değilse tekrar artışına çevrilir; plaka hesaplayıcı bu veriden. Bugün katalog hareketin **neyle**
yüklendiğini bilmiyor (`load` yalnız harici / vücut ağırlığı / ikisi) ve dambıl yükünün tek mi çift mi yazıldığı tanımsız
(Hevy'nin bilinen sorunu — `arastirma/ham/B-antrenman.md` §8). Birimler ADR-029: depolama metrik, 2 ondalık.

## Karar sürücüleri
- Motor saf kalır (ADR-003): yuvarlama salon verisine bakar, motor bakmaz.
- Telefon çevrimdışı ısınma/plaka hesaplar (K-417, K-405) → aynı algoritma iki dilde, tek doğrulama kaynağı.
- Kaynaksız eşik yok (U14).

## Karar
1. **Katalogda `equipment`** (her hareket dosyasında zorunlu): `barbell` (bar + çift plaka; `loadKg` toplam),
   `dumbbell` (`loadKg` **bir** dambılın ağırlığı), `machine` / `cable` (ağırlık yığını; `loadKg` yığındaki değer),
   `plate_loaded` (kızak/kol + çift plaka; `loadKg` takılan plakalar, kızak hariç), `bodyweight` (`loadKg` eklenen
   yük: tek plaka ya da bir dambıl). Sözleşmede `Exercise.equipment` ve bu tanım `NewSet.loadKg` açıklamasında.
2. **Salon profili** (`training.gym`, `/v1/gyms`): hesap başına birden çok salon, en fazla biri `current`. Alanlar:
   ad, bar ağırlığı, plaka değerleri (her değerden yeterince çift olduğu varsayılır), dambıl listesi (tek tek
   ağırlıklar — "adım" telefonda listeye açılır), yığın adımı (makine/kablo varsayılanı), makine listesi (hareket başına
   kendi yığın adımı). Kimlik istemcide üretilir, `PUT /v1/gyms/{id}` yarat-ya-da-değiştir (çevrimdışı kuyruk uyumu).
   Hesap silmede silinir, dışa aktarmada çıkar. Sağlık verisi değildir (rıza kapısı yok).
3. **Yuvarlama yeri:** seans bitince (`SessionProgress`), o anki `current` salonla. Motorun `AddLoad` yükü salonda
   mümkün yüklerden **son yükten ağır olanlar** arasında hedefe en yakına yuvarlanır (eşitlikte hafif olan). Daha ağır
   mümkün yük yoksa (dambıl listesinin sonu) hedef **aynı yük, en zayıf set + 1 tekrar** — aralığın üstüne çıkabilir
   (kartın "tekrar artışına çevrilir"i); deload "tut" sürerken bu fazla tekrar da tutulur (aralığın tepesi, K-217 gibi).
   Salon yoksa ya da hareketin ekipmanı için veri yoksa motorun adımı olduğu gibi
   (bugünkü davranış).
4. **Hesap tam sayı ile, salonun biriminde:** yükler yüzdelik birime çevrilir; plaka toplamları dinamik programlama ile;
   kayan nokta yok. Salonun ağırlıkları **lb ile girilmişse** (hepsi çeyrek lb ızgarasında ±0,01 kg, en az biri 0,05 kg'ın
   katı değil) hesap **lb yüzdeliklerinde** yapılır ve sonuç kg'ye uygulamanın yazılan lb yükünü çevirdiği gibi döner
   (`round(lb × 0,45359237, 2)`, ADR-029 tek yuvarlama noktası): 140 lb hangi plakalarla yapılırsa yapılsın 63,5. Neden:
   lb plaka tek tek kg'ye yuvarlanınca (10 lb = 4,54) toplamları uygulamanın aynı yük için sakladığından sapar (65 lb:
   yazılan 29,48, iki 10'luk 29,49) → kg'de sayınca aynı yük "daha ağır" sayılıyor, aynı gerçek yükün birçok saklı
   değeri çıkıyordu (inceleme: iki deneme — doğrusal parça cezası ve gürültü penceresi — ikisi de yetmedi, özellik testleri
   karşı örnek buldu). Plaka hesaplayıcı: taraf başına **en az plaka** (eşitlikte ağır plakalar önce), plakalar salonda
   saklandığı kg değeriyle. Telefon (K-417) aynı algoritmayı TypeScript'te uygular; iki tarafın testi aynı vaka dosyasını
   okur (`contracts/fixtures/load-steps.json`).
5. **Büyük sıçrama** (ör. dambıl listesi 10 → 20 kg): kart "mümkün en yakın" diyor; kaynaklı bir sıçrama sınırı yok →
   şimdilik en yakın mümkün yük alınır. Sınır konup konmayacağı sağlık/ürün kararı → DURUM soru 38.

## Neden
- Seans sonunda yuvarlamak hedefi bir kez ve saklanan hâliyle üretir; program okunurken yeniden hesap yok, `nextLoadKg`
  telefonda doğrudan gösterilir (K-217: "istemci hesaplamaz").
- Dambılda tek ağırlık: salondaki rafın etiketi ve kullanıcının söylediği ("22,5'lukla") budur; çift toplam analitiği
  bozar (B §8).
- Sınırsız çift plaka varsayımı gerçek salonların hemen hepsinde doğru; adet takibi giriş yükünü katlar.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Yuvarlamayı motora koymak | Motor salon verisi ve hesap bilmez (ADR-003 saflık); training zaten seansı biliyor |
| Program okunurken yuvarlamak (salon değişince anında) | Hedefin hangi setten geldiği (en zayıf tekrar) okunurken kayıp; yeniden hesap her GET'te |
| Dambıl adımı (min/max/adım) | Gerçek raflar düzensiz (…10, 12,5, 15…); liste hepsini kapsar |
| Açgözlü plaka seçimi | 15+10'lu sette 20'yi bulamaz; DP her plaka setinde doğru |

## Sonuçlar
Olumlu: öneri salonda yapılabilir; plaka hesabı ve ısınma aynı veriden. Olumsuz: salon değiştirilince hedef bir sonraki
seansa kadar eski salona göre; algoritma iki dilde (ortak vaka dosyasıyla bağlı).

## Geri dönmenin maliyeti
Orta: göç + sözleşme alanı; yuvarlama tek sınıf (`LoadSteps`).

## Etkilenen
`backend/.../training` (`ExerciseCatalog`, `GymController`, `GymStore`, `LoadSteps`, `SessionProgress`,
`TrainingAccountData`), `data/exercises/*.yaml`, `contracts/openapi.yaml`, V20 göçü, `apps/mobile` (K-417, K-405).

## Doğrulama
`IncrementRoundingTests`, `LoadStepsTests` (vaka dosyası + kg ve lb özellik testleri), `GymApiTests` (CI), `ExerciseCatalogTests`.
