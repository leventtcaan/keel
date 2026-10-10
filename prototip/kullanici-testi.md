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

## Tur 2 (ikinci yürüyüş)

- **Yöntem:** bağımsız ikinci yürüyüş ilk turun düzeltmelerini doğruladı (8 tamam, 4 kısmi) ve yeni bulgular çıkardı. Kararlar: (a) sunucu
  tartı ve öğün için zaten sağlık verisi rızası istiyor (`MeasurementController` `consent.require`), prototip bunu gösterir; antrenman
  sağlık verisi değildir, rızasız da kaydedilir; (b) Levent: sabit tekrar (5 × 5) serbest, en az en çoğa eşit olabilir.
- **Doğrulama:** `node` sözdizimi denetimi; "seed" sekmesinde her düzeltme dokunarak yüründü, konsolda hata yok; kelime sayımı hepsi hedefte
  (rıza reddi sonrası #ob-consent 22/25); `copy-budget.test.ts` yeşil.

### Prototipte düzeltildi

| # | Bulgu | Düzeltme |
|---|---|---|
| (a) | Rıza reddinde tartı, öğün, kalori hedefi ve Health izni hâlâ var | Tartı ve öğün kilitli: tek satır "Needs your OK for health data · Allow" (Allow rızayı verir); Bu hafta'da yemek satırı yerine aynı satır; İlerleme'de kalori, protein, adım ve kilo trendi yok; Ayarlar "Health data consent: Not allowed", Apple Health "Off"; Health izni sorulmaz; antrenman kaydı sürer |
| (b) | Sabit tekrar girilemiyor | En az = en çok serbest; program "3 × 10" gösterir |
| B2 | "Fill in the rest later" sonrası seansa dönüş yolu yok | Bu hafta kartı "Open workout · Continue", Antrenman "Continue workout"; seans girilen setleri ve süresiyle açılır |
| B3, C17 | Değiştirilen hareket eski kiloyu devralıyor; sayfa başlığı ve seçenekler yanlış | Yeni hareket kilosuz başlar ("Pick a weight"), kendi geçmişiyle; başlık şimdiki hareketi söyler, o seçenek listede yok; planlı harekete dönüş "Back to the planned move"; geri al |
| Süre, C14 | 24:10 sabit, Pause süreyi durdurmuyor, özet sayıları uydurma | Süre gerçek ve Pause'da durur, devamda kaldığı yerden; özetin dakika, kaldırılan kilo ve set sayısı girilen setlerden (atlanan sayılmaz); paylaşım aynı sayıları kullanır |
| C1 | Antrenman bitince ekranlar değişmiyor | Bu hafta: gün ✓, Start yok, "N sets · X kg lifted"; Antrenman: "Done"; İlerleme: güç kartı açılır (hareket başına başlangıç seti), kas haritası dolar, "Done, 30 min" kardiyoyu 1/2 sayar |
| C2 | Öğün Food left'i düşürmüyor; İlerleme'den eklenen öğün ana sayfaya atıyor | Öğün aralığı Food left'ten ve İlerleme kalorisinden düşer (610-720); geldiği ekrana döner; geri al |
| C4 | Uygulanan inceleme önerisi programda görünmüyor | Öneri programa işlenir (izolasyon hareketinin seti artar ya da hareket eklenir; fazla set kırpılır; 5 günü aşan program en hafif günü dağıtır); içe aktarılan PPL'de göğüs kırpması Push gününde görünür |
| C5 | Edit › Split hep "PPL" | Gerçek split: "Upper / Lower", "Push / Pull / Legs", "PPL + Upper / Lower", "Your own", "Full body" |
| C6 | 5 günlük planda taşı ne olacağını söylemiyor | Taşı zinciri: sayfa ve toast kayan günleri söyler ("Tue · Push, Wed · Pull, Thu · Legs"); aynı güne iki seans yok; pazarı aşacaksa taşımaz |
| C7 | Kısa sürüm kardiyo ve geri dönüş belirsiz | "about 35 min, cardio optional"; Change sayfası kısa sürümdeyken "Full workout" sunar; kartta geri al |
| C8 | 1. hafta kararında gün 14 sabit | "Food and weight wait until day 14" erkek, 28 kadın |
| C9 | Kalori satırı açığın ne zaman başladığını söylemiyor | "Starts at maintenance. Your deficit starts after day 14/28." (kas hedefinde "surplus") |
| C10 | Karardan sonra tarih ve hafta sıçrıyor | 12. hafta pazartesi kararı "Got it" → 13. hafta, pazartesi, Full body B; 1. hafta "Sounds right" → 2. hafta (hafta şeridi, seçilen günler, karar kartı, Full body B) |
| C11 | İlerleme › Calls eski kararı düğmelerle açıyor | Eski kararlar salt okunur (düğme yok) |
| C12 | "Settings" dokunulamıyor; kararlar kapalıyken "Tell me Monday morning" var | Settings düğme; bildirim anahtarı kararlar kapalıyken yok |
| C13 | Paylaşım satırı fotoğraf seçeneğiyle çelişiyor | "No body weight. Your photo stays yours." |
| C15 | Atmak geri alınamıyor | "Workout discarded" toastunda geri al seansı geri getirir |
| C16 | Atlanan set "100 × 0" yeşil tik; düzeltilen setin analizi bayat | Atlanan set "Skipped" (gri); düzeltme, silme ve atlama analiz satırını yeniden hesaplar; set silme ve atlama geri alınır |
| C18 | "Keep" sonrası karar ekranı eski hedefi göstermiyor | "Bench, in force 72.5 × 9" |
| C19 | Yeni başlayanın "Keep going"i neden gün eklenmediğini söylemiyor | "3 days is enough to start." |
| M5 | "Gym is busy" toast | Önce "Which one is taken?" hareket listesi, sonra seçenekler |
| M6 | Başlangıç ağırlıkları programda olmayan hareketleri soruyor | Yalnız programdaki ana hareketler (yazılan programda yoksa adım hiç gelmez) |
| M7 | "Read the full text" boş yer tutucu | Tam metin taslağı açılır, yeniden çizimde açık kalır |
| P1 | Geri al toastu çok kısa | Geri allı toast 5 sn |
| P3 | "Type it in" örnek programla başlıyor | Tek boş günle başlar |
| P6 | 1. hafta kararında seçimden sonra da "Sounds right" | Seçimden sonra "Done" |
| P7 | Özette yalnız kalan kutu | İzin yoksa üç kutu tek satırda |

### Kodda zaten doğru (Part 2 PR'ları)

| Bulgu | Durum |
|---|---|
| Rızasız tartı ve öğün | Sunucu `consent.require` ile reddeder; başlangıç kalorisi 403 `CONSENT_REQUIRED` (ADR-072 Ek 1) |
| Değiştirilen hareketin kendi geçmişi ve hedefi | "From now on" hedefsiz başlar, bugünlük değişim yalnız o seans (K-964, ADR-073 Ek 3) |
| Taşı zinciri ve pazar sınırı | Sunucu zincirleme kaydırır, pazarı aşarsa CONFLICT (K-964) |
| Açık seans haftayı sayar, kendiliğinden kapanır | K-961 |
| İnceleme önerisinin programa uygulanışı ve geri alma | K-956 (değişiklik kaydı, geri al) |

### Part 3-4 arayüz görevlerine not

| Görev | Not |
|---|---|
| K-967 | Rıza reddinde plan ekranı: kalori satırı ve bildirim anahtarı yok; kalori satırında "Starts at maintenance" ve gözlem günü sunucudan |
| K-968 | Boş günle başla; sabit tekrar serbest; uygulanan önerinin programdaki karşılığı (hangi harekete kaç set) incelemede de görünsün |
| K-969 | Bitmiş seans, açık seans (Continue), kilit satırı, Food left aralığı, karar sonrası hafta durumu (sunucunun haftası; telefon tarih hesaplamaz) |
| K-970 | "Gym is busy" önce hareket seçtirir; Split satırı gerçek split; taşı zincirini önceden göster; kısa sürümde "Full workout" |
| K-971 / K-972 | Gerçek süre ve Pause; atlanan set ayrı görünüm; düzeltmede analiz yeniden; atma ve set silmede geri al |
| K-973 | Değiştirilen hareket kalibrasyonla başlar |
| K-974 | Özet sayıları girilen setlerden; izin yoksa üç kutu |
| K-976 | Paylaşım alt satırı |
| K-978 | Eski kararlar salt okunur; gözlem günü cinsiyete göre; seçimden sonra "Done"; yeni başlayana neden gün eklenmediği |
| K-979 | Antrenman sonrası güç ve kas haritası, kardiyo sayımı, öğün kalorisi; rızasız kartlar yok |
| K-980 | Rızasız tartı ve öğün kilidi; öğün geldiği ekrana döner |
| K-982 | Rıza "Not allowed" satırı rıza akışını açar; Apple Health durumu gerçek |

### Bilerek sahte kalan

Tur 1'dekiler aynen. Ek olarak: tam rıza metni taslaktır (kayıtlı sürüm `data/copy`'den); 12. hafta özetindeki rekor ve "What moved" satırları
örnek veridir; İlerleme'deki kas haritası seansın gerçek kaslarından değil örnek dolumdan çizilir; tek "Full body B" listesi örnektir.

## Tur 3 (kod, simülatör · 10 Eki, M9a Part 3 sonu)

- **Yöntem:** 6 persona (yeni başlayan 1. hafta · düzenli Pazartesi kararı · hafta ortası salon · planı değişen · kendi programı · dönen/rızasız),
  13 fikstür senaryosu, iPhone 16 Pro Max simülatörü, `origin/main` `a44c3eae` (Part 3'ün bütün PR'ları dahil). Fikstür sözleşmeye karşı
  doğrulandı (14 senaryo, 843 yanıt, 0 hata). Açık ve koyu tema her personada.
- **Sonuç:** çökme yok, U4-U7 ihlali yok. Çalışan: kalibrasyon ("Pick a weight", "Starting weight found", 2+ önerisi), özet sayıları girilen
  setlerle birebir, karar ekranı (eski → yeni, kısa neden + kaynak simgesi, Keep → Not applied → Use this call, güvenlikte Keep yok, geçmiş
  salt okunur), swap + "Back to the planned move", set düzelt/sil + Undo, Fill in later → Continue, Discard onayı + Undo, hedef kaybı uyarısı,
  "Saved" + Undo, rızasız yüzler.
- **Yapılamayan:** iPhone SE (667pt) ölçüsü (simülatör izni) · onboarding plan ekranı (Apple girişi) · canlı Pause (geliştirme düğmesi
  örtüyor) · bayat/çevrimdışı seans ve gece yarısı → K-984 cihaz turu.

### Bulgular → kartlar

| Bulgu | Kart |
|---|---|
| 1. hafta "gün ekle": 2 günlük olmayan programda seçim sonrası açıklamasız Edit; "New day Tue" ama takvimde yok; üç düğme belirsiz; 1. haftada "Keep last week's plan" | K-1013 |
| Hero kartı gövdesi dokunulmuyor (yalnız ok) · bekleyen kararda değişen satırı yok, iki birincil eylem | K-1013 |
| Süperset partneri seçilince eylem satırı bozuluyor (dikey kırılan etiket, Skip move kayboluyor) | K-1013 |
| Açık seans kartı "Finish anytime this week" (sunucu 24 sa'de kapatır) · "Monday reads what happened" sabit (check-in günü başka) | K-1013 |
| Antrenman › This week listesinde tamamlanma işareti yok (şerit ✓ derken) · Bu hafta kartı 3 hareket, Antrenman 10 | K-1013 |
| Edit: kaydedilmemişken kaydırma sessizce engelleniyor, uyarı katlanın altında | K-1013 |
| Dokunma hedefleri 44 pt altı: check-in çipleri ≈35, Edit çipleri/Remove 30-32, "Too heavy?" ≈22 | K-1013 |
| Yarım seans (2 set) özette "−81% vs last time" | K-1014 |
| Başka cihazda açık seans devralınamıyor | K-999 |
| Dönen kullanıcıya dönüş akışı yok, "Getting stronger/weaker" soruluyor | K-981 |
| Küçükler: pull-up'ta "Pick a weight"/ısınma, "Skipped" bandı kardiyoya taşıyor, atma sonrası eski "Paused", Food today/left etiketi, Add a move boş liste | K-1013 |
