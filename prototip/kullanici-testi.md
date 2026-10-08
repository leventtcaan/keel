# Kullanıcı testi · yeni yüz prototipi (`prototip/yeni-yuz.html`)

- **Tarih:** 2026-10-08
- **Yöntem:** 6 persona (yeni başlayan kadın, yeni başlayan erkek, kendi programını yazan, Strong/Hevy'den içe aktaran, 12. haftadaki
  düzenli kullanıcı, ara verip dönen) prototipi kullanıcı gözüyle uçtan uca yürüdü; her takılma bir bulgu. Bulgular dört kümede:
  prototipte düzeltilen, kodda zaten doğru olan, Part 3-4 arayüz görevine not, bilerek sahte kalan.
- **Doğrulama:** betik `node` ile sözdizimi denetimi; yerel önizlemede (http://localhost:8791) her akış dokunarak yüründü, konsolda hata
  yok; "Kelimeleri yeniden say" sonrası hedefi aşan ekran yok; `copy-budget.test.ts` yeşil (ekran listesi ve `t` değişmedi; yeni
  `addmove` sayfasının hedefi yok, `t: null`).

## 1. Prototipte düzeltildi

| # | Bulgu | Düzeltme | Dayanak |
|---|---|---|---|
| 1 | #week1 her zaman "2 days, not 3"; his cevabıyla ve ADR'yle çelişiyor | Karar Y/P ve his cevabından: kaçan seans → "Move Wednesday" (başka güne, 3 gün kalır); hepsi yapıldı + "I could do more" + yeni başlamayan + < 4 gün → "Add a day"; yoksa "Keep going". His cevabı alt satırda. "Change it": öneriyi tut / günü ben seçerim (boş günler) / geçen haftanın planı. "2 days, not 3" hoş geldin örneklerinden ve İlerleme › Calls'tan kalktı. Check-in'de prototip düğmesi üç durumu gösterir | ADR-077 #4 + Ek 1, ADR-071 #8 |
| 2 | #ob-type: sabit 5 tekrarlık pencere; "Add a move" toast; hareketsiz gün kabul; yazılan program yerine PPL; "Keep mine" yok sayılıyor | Tekrar iki ayrı sayı (en az, en çok; en az < en çok, 1-100). Gerçek "Add a move" sayfası (`addmove`): 16 hareketlik katalogda arama, "Add my own move" (ad; formun gerisi toast); 3 set ve katalog aralığıyla (bileşik 6-10, izolasyon 8-12) açık güne girer, geri alınır. Hareketsiz gün uyarır, "Use this program" kapalı. Yazılan program inceleme, plan, paywall ve Antrenman'a akar; inceleme onu inceler (öneri yoksa "Good as it is"); "Keep mine as is" her yerde 0 değişiklik. Uzun adlar iki satırda kesilir; gün ve hareket silme geri alınır | ADR-073 #1-3, K-21 aralıkları |
| 2b | "Type it in" adım göstergesinde ayrı adım | `ob-own` adımının alt ekranı: aynı adım numarası (onboarding ≤12 ekran) | Orkestratör notu |
| 3 | İncelemede "Hamstrings: 4 sets" işaretli (yanlış); uygulanan 2 değişiklik 3 diye görünüyor | Örnek 3 set ("Under the useful floor of 4. Add 1 set"); 4 işaretlenmez. Uygulanan sayı #ob-plan ve #train'e taşınır | ADR-073 alternatifler, `weekly_sets_min` |
| 4 | #ob-preparing kendiliğinden geçiyor, kullanıcı #ob-plan'da körlemesine Continue'ya basıyor | Kendiliğinden geçmez; üç satır tamamlanınca "See my plan" açılır | Uygulama kodu |
| 5 | Rıza reddinde ilk karar hâlâ vaat ediliyor | #ob-preparing üçüncü satır "Your first workout"; #ob-plan'da ilk karar ve kalori satırı yok; paywall'da ilk karar satırı yok, değer satırı haftalık karar vaat etmez; Bu hafta "Weekly calls are off" | ADR-072 Ek 1 (rıza yok → satır yok) |
| 6 | Kullanıcının sayıları yok sayılıyor (kadın 71,5 kg yine 2.916 kcal, kadına 14 gün, girilen bench 82,5 → 80); "Decide for me" neyi seçtiğini söylemiyor | Kalori Mifflin-St Jeor × aktivite katsayısı (`nutrition.yaml`); gözlem kadında 28, erkekte 14 gün; protein 2 g/kg; #ob-weights'te girilen ağırlıklar plan, Antrenman ve seansta; "Lose fat · we picked" (yağ tahmini yokken motor kesimle başlar). İlk tartı onboarding kilosundan başlar | ADR-072 Ek 1, ADR-027 #17 |
| 7 | Yeni başlayanın ilk seansında 100 kg squat hazır ve "+1 rep vs last time" | Kilo boş gelir ("Pick a weight", ilk dokunuş boş bar ya da en hafif dambıl); kilo seçilmeden "Log set" kapalı; ilk setten sonra "Starting weight found: X kg"; 2+ kalırsa "Next set heavier?" | ADR-075 #3 kalibrasyon |
| 8 | "Keep last week's plan" Bu hafta, Antrenman, seans ve İlerleme'de görünmüyor | Bu hafta ve Antrenman "Not applied · Use this call" (geri alınır); hedefler geçen haftanınki (bench 72,5 × 9, "held" yok); seans, özet ve Calls listesi uyumlu. Karar ekranının bu hali 46 → 44 kelime | ADR-077 #3 |
| 9 | "Change today" toast veriyor, kart değişmiyor | Kısa: ilk 3 hareket + "Short version"; taşı: kart "Moved to Tue", bugün dinlenme, yarın listede "moved"; atla: "Skipped. Monday reads what happened."; her toastta ve kartta geri al; Bu hafta kartı da aynı | ADR-073 #5 + Ek 3 |
| 10 | Kardiyoda "about 300 kcal"; paylaşımda "No weight or body numbers" (kaldırılan kilo görünüyor); "The rest waits" telafi gibi | Kardiyo "30 min, easy"; "No body weight or photos of you"; "Today: the top 3 moves." | U5, U7 |
| 11 | Apple Watch kalorisi ve Health adımı izinden önce görünüyor | İzin ilk tartıda ya da ilk antrenmanın sonunda (hangisi önce); izin yoksa özet kalori kutusu yok, kardiyo satırı kalori demez, İlerleme'de adım "Connect Apple Health" | ADR-072 #8 |
| + | Seans süresi 29:10'dan başlıyor | Her seans 0:00'dan | Gezinti bulgusu |

## 2. Kodda zaten doğru (Part 2 PR'ları)

| Bulgu | Durum |
|---|---|
| Hamstring 4 set işaretlenmemeli | Motor alt sınırı `< 4` işaretler, eşitlik değil (K-955, `training.yaml` `weekly_sets_min`) |
| 1. hafta "2 gün" önerisi | `FirstWeekAdjustment` 3'ün altını önermez, his cevabı gerekçede (K-962) |
| "Keep last week's plan" kayıtta kalmalı | `DECLINED`, güvenlik kararında yok, "Use this call" ile geri (K-963) |
| Train'den swap "Today only / From now on" sormuyor; değişen hareket eski hedefi devralıyor; bugünlük değişim kalıcı oluyor | Uçlarda kapsam `TODAY`/`FROM_NOW_ON`, yeni hareket hedefsiz başlar, bugünlük değişim yalnız o seans (K-964, ADR-073 Ek 3). Eksik olan ekran: K-970 |
| Kısa / taşı / atla gerçekten değişmeli | `POST /v1/program/today` (K-964) |
| "Fill in the rest later" haftayı saymalı | Açık seans haftasını sayar, kendiliğinden kapanır (K-961) |
| İçe aktarma taslağı göstermiyor | Sunucu taslağı çıkarır (K-957); ekran K-968 |
| İlk seans hafif/ağır öneri tablosu, RIR 0/1/2+ | K-960 |
| Kardiyo reçetesi, Health kardiyo okuma | K-958, K-959 |
| Rekor tanımı, kas başına set, özet | K-965 |

## 3. Part 3-4 arayüz görevlerine not

| Görev | Not |
|---|---|
| K-966 / K-986 Onboarding A | #ob-consent "Not now" sonrası ilk görünüm 39/25 kelime (prototipte açıklama satırı ekleniyor); #ob-days 3 önceden seçili ama Continue yok; #ob-about varsayılan Male (seçimsiz başlamalı); hoş geldin yasal satırı dokunulamıyor |
| K-967 Onboarding B | Hazırlanıyor ekranı kendiliğinden geçmez; plan ekranında hedef ("we picked"), kalori ve gözlem günü sunucudan (K-989 `GET /v1/targets/starting`, cinsiyete göre 14/28); rıza yoksa ilk karar ve kalori satırı yok; paywall'da plan seçimi CTA'nın altında kalıyor; bildirim izni iki kez soruluyor (Monday + deneme hatırlatması); deneme sonrası kendi programı olan Antrenman'a, diğerleri Bu hafta'ya iniyor (tek kural seç) |
| K-968 Kendi programı | Yazılan program akar; "Add a move" sayfası (katalog arama + kendi hareketi); tekrar iki sayı; hareketsiz gün engeli; günü kopyala/sırala yok; içe aktarmada taslağı göster ve #ob-weights'te içe aktarmanın bildiği ağırlıkları sorma; "Skip any" satır başına olsun; inceleme önerileri varsayılan açık mı, karar ver; "Keep mine" → 0 değişiklik |
| K-969 Bu hafta | "Not applied · Use this call"; bugünü değiştir kartta; seanstan sonra "Start" kalmasın; yemek kaydı "Food left"i düşürsün; yemek satırı sekme çubuğunun altında kalıyor ve satır dokunuşu boş; hafta numarası/tarih tutarlılığı (13 ile 12, "3 days" ile Jan 4) |
| K-970 Antrenman + Edit | Edit'in bütün parçaları (günler, hareketler, kardiyo, split, rebuild) gerçek ekran; günleri taşıma; Train'den swap "Today only / From now on"; swap sayfası başlığı doğru hareket; PPL+UL'de Split satırı "PPL" demesin; yalnız "Full body A" değil, günün seansı; uygulanan değişiklik sayısı ve geri al |
| K-971 Oturum A | Süre 0'dan başlar, seanslar arası taşınmaz; "Log set" düğmesi zıplamasın; üç "Skip" düğmesi birbirine yakın; sayıyı yazarak girme (kilo adımı 5 kg) |
| K-972 Oturum B | Pause süreyi durdurur ve görünür durum; atlanan set yeşil tikle "100 × 0" görünmesin; düzeltilen setten sonra analiz satırı güncellensin; atla/sil/at için geri al; "Fill in the rest later"a dönüş yolu |
| K-973 Oturum C | Kalibrasyon: boş kilo, "Starting weight found"; hedef ile son aynıysa "Beat last time 72.5 × 8 · Last 72.5 × 8" çelişkisi; kardiyoda süre sayacı ve tek kalori sayısı yok |
| K-974 Antrenman sonu | Özet sayıları yapılanla eşleşsin; kalori kutusu yalnız izin + ölçüm varsa |
| K-975 / K-976 Paylaşım | "No body weight or photos of you" metni; Story arka planı (K-976) |
| K-978 Pazartesi | 1. hafta kararı ADR-077 #4'e göre; "Sounds right" taşı/ekle kararında gün seçimine götürür, öneri dolu (Ek 1; prototipte yeni ekran eklenmedi, ana sayfaya toast ile dönüyor); "Hold the weight" derken hedef 72.5 × 9 → × 8 düşüyor gibi okunuyor, değişiklik satırını netleştir; geçmiş kararlar aynı ekranla açılsın |
| K-979 İlerleme | Kardiyo kutusu Antrenman'ı açıyor (kardiyo kaydına gitmeli); izin yoksa adım yok; Calls listesinde "not applied" |
| K-980 Kayıt | Tartı onboarding kilosundan başlar, 0,1 kg adım + yazarak giriş; Health izni ilk tartıda ya da ilk antrenman sonunda; yemek araması, porsiyon, öğüne birden çok kalem; ilk gün öğün ekranında "Same as yesterday"/"Recent" olmasın; barkod ekranı 15/10 kelime; tartıya geri al |
| K-981 Dönüş + Life | Duraklatılmış durum ve "I'm back"; "In pain" için takip sorusu; "New gym" salon kurulumuna gitsin; ease back / rebuild toast yerine görünür sonuç |
| K-982 Ayarlar | Hedef ve profil değiştirme; Aralık'ta "Renews Oct 26" |
| K-951 / K-984 | Küçük turkuaz rozetlerde kontrast 4,46:1 (< 4,5): token ya da yazı ağırlığı; cihaz turunda kontrol |

## 4. Bilerek sahte kalan

Satın alma sayfası (Apple), iOS izin sayfaları (Health, bildirim), dosya seçici (Strong/Hevy içe aktarma, paylaşım arka planı), yemek
araması ve barkod, Instagram/TikTok paylaşımı, nasıl yapılır klipleri, fotoğraf kamerası, Ayarlar satırları, Edit program satırları
(toast), Restore/Terms/Privacy. Prototipin senaryo durumu ekranlar arası sızabiliyor (yalnız prototip; uygulamada durum sunucudan).
