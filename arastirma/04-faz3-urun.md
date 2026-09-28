---
title: Faz 3 — Ürün kurgusu
tarih: 2026-09-10
kaynak: Faz 1 (6 hat) × Faz 2 (9 hat, 550 kural) × H1-H3 × I1-I2
durum: taslak — I1/I2 bekleniyor
---
# Faz 3 · Ürün kurgusu

> Bu dosya feature listesi değil, **ürünün kendisi.** Her satırın arkasında bir kanıt var;
> kanıtı olmayan satır yok.

---

## 0 · Tek cümle

**Veriyi toplayan çok, karar veren yok. Bu, karar veren.**

Uzun hâli: *bilimsel bir koçun haftalık yargısını çalıştıran, sana en az iş düşüren,
kararının arkasında duran ve gerektiğinde "hayır" diyen bir sistem.*

Ne değil: tracker, kalori defteri, program kütüphanesi, sohbet arkadaşı.

---

## 1 · Mimarinin tek kararı — her şey buradan türüyor

```
┌─────────────────────────────────────────────────────┐
│  DİL KATMANI (LLM)                                  │
│  Kararı anlatır · soru sorar · girdiyi çözümler     │
│  KARAR VERMEZ                                        │
├─────────────────────────────────────────────────────┤
│  KARAR KATMANI (deterministik kod)                  │
│  550 kural · eşikler · zaman serisi karşılaştırma   │
│  Çıktı: karar + gerekçe + güven düzeyi              │
├─────────────────────────────────────────────────────┤
│  VERİ KATMANI                                        │
│  Zaman serisi · trend filtreleri · belirsizlik       │
└─────────────────────────────────────────────────────┘
```

**Bu tek karar dört problemi aynı anda çözüyor:**

| Problem | Nasıl çözülüyor |
| --- | --- |
| **Sycophancy** (ELEPHANT: LLM'ler kullanıcıyı insanlardan +50 puan fazla doğruluyor; MedPRESS: bir itirazda %84,3 → %19,9) | Karar kodda. "Deload istemiyorum" diyen kullanıcıya model pes edemez, çünkü kararı model vermiyor |
| **LLM maliyeti** (Fitia "Coins" krizi: yıllık premium ödeyene tarif için ayrıca coin sattırdı) | Ağır hesap ucuz (istatistik), LLM sadece dil katmanında — çağrı başına küçük |
| **Regülasyon** (FDA General Wellness 6 Oca 2026 · Apple 1.4.1) | Karar kuralı denetlenebilir ve açıklanabilir; kara kutu çıktısı değil |
| **Tutarlılık** | Aynı girdi aynı kararı verir. LLM'in gününe bağlı değil |

**Ve bu aynı zamanda pazarlama cümlesi:** *"Kararı yapay zekâ vermiyor. Yapay zekâ sadece anlatıyor."*

---

## 2 · Kullanıcının gördüğü şey

### Günlük (hedef: 40 saniye)
| An | Ne olur | Kullanıcının işi |
| --- | --- | --- |
| Sabah | Tartı → 7 günlük trend güncellenir | 10 sn (akıllı tartı varsa 0) |
| Öğün | Fotoğraf çek **veya** yazıp/söyleyip geç | ~10 sn × 3 |
| Antrenman | Seti işaretle; belirsizse konuş | Zaten salondasın |
| Akşam | Sistem **gerekiyorsa** tek soru sorar | 0-15 sn |

**Sistem günün geri kalanını yönetir:** kalan bütçe → *ne yiyebilirsin* (senin sevdiklerinden,
bütçenden, ulaşabildiğinden). Sayı değil, seçenek.

### Haftalık
Sabit gün, sabit saat. Karar motoru çalışır, üç şeyden birini söyler:
**devam · şunu değiştir · henüz karar verme, veri yetersiz.**

Üçüncüsü kritik ve piyasada yok: *"Kilo ve bel bir hafta sabit ama uyumun yüksek —
hiçbir şey yapmıyoruz, bir hafta daha bekliyoruz. İki haftalık düşüş birden gelir."*

### Aylık
Fotoğraf günü. Onion-skin overlay ile aynı poz. Karşılaştırma çıpası açılır:
**bugün vs başlangıç**, bugün vs 1 ay önce. Şekil projeksiyonu güncellenir.

---

## 3 · Veri sözleşmesi — "az iş" burada somutlaşıyor

| Veri | Nasıl gelir | Sıklık | Kullanıcı yükü |
| --- | --- | --- | --- |
| Kilo | Akıllı tartı → HealthKit, yoksa elle | Günlük | 0-10 sn |
| Adım · uyku · nabız | HealthKit / Health Connect | Otomatik | **0** |
| Antrenman | Set işaretleme + serbest metin/ses | Seans | Zaten oradasın |
| Öğün | Fotoğraf · serbest metin · ses · "dünkü gibi" | Öğün | ~10 sn |
| **Bel** | **Sadece talep üzerine** | Sinyaller çeliştiğinde | 30 sn, ayda ≤1 |
| Fotoğraf | Rehberli çekim | 4 haftada bir | 60 sn |
| Tercih / bütçe / sevmediği | Sohbette doğal olarak birikir | Sürekli | **0** |

**Kural: sistem soru sormak için bir sebep göstermek zorunda.**
Sorunun yanında *neden sorduğu* yazar. Sebepsiz soru yok.

Bu, `01-urun-ilkeleri.md` madde 3'ün ("işimi kolaylaştırsın") mühendislik karşılığı ve
Levent'in 10 Eylül talimatının doğrudan uygulaması: *"sadece gerçekten almamız gereken
verileri almak ve sorumuz olduğu takdirde bunları talep etmek."*

---

## 4 · Özellikler

Her özellik: **ne yapar · hangi boşluğu kapatır · hangi kurala dayanır · üç test.**
(B = bilimsel fark, Y = yazılımsal fark, P = pazarlanabilir fark)

### 4.1 · KARAR MOTORU

#### Ö-1 · Haftalık karar
Güray'ın kendi ağzından algoritma: kilo yönü → görüntü → antrenman → toparlanma → genetik limit.
Her adımda tek değişken değişir.
- **Boşluk:** #1 karar katmanı — 24 uygulamadan hiçbiri karar vermiyor
- **Kural:** G3 karar ağacı (2024-08-19) · K-98 (merdiven ölçütü tartı değil **antrenman performansı**)
- **B ✅ Y ✅ P ✅**

#### Ö-2 · Kalori merdiveni
Durağanlıkta **minimum 500 kcal** adım — 300-400 ölçüm gürültüsüdür (K-97).
Literatür %5-10 diyor; ikisi 2000-2500 kcal bandında örtüşüyor. Ölçüt tartı değil,
**antrenmanın çıkıp çıkmaması.**
- **Boşluk:** #1, #11 · **Kural:** K-97, K-98, H3/B3
- **B ✅ Y ✅ P ➖**

#### Ö-3 · Sinyal tabanlı deload merdiveni
Takvimsel deload haftası **yok** (hoca: "taktik yok, vücuda bakar").
Merdiven: **önce artışı bırak → sonra deload → tam çöküşte 1 hafta tam mola.**
Operasyonel overtraining tanımı: *planına uyamıyorsan.*
Ters test: *plan hep mükemmel gidiyorsa yeterince uyarmıyorsun.*
- **Boşluk:** #1 · **Kural:** K-66…K-78 · Coleman/Schoenfeld 2024 RCT
- **B ✅ Y ✅ P ✅** — "takvime göre deload veren tek uygulama biz değiliz; **vermeyen** biziz"

#### Ö-4 · Faz kapısı
Yağ oranı görsel proxy ile: **%20 tavan** (göbek testi), %15-20 bant, %12 fit.
Maintenance'ta kalmak seçenek değil — yön seçilir.
- **Boşluk:** #1 · **Kural:** K-7, K-8, K-105, K-106 (28 cm kol testi)
- **B ✅ Y ✅ P ✅**

#### Ö-5 · Progresyon kapısı
Ağırlık artışı **teknik kapısına** bağlı: o hafta teknik mükemmel değilse artış yok (K-31).
**İzole hareketlerde yük progresyonu takip edilmez** (K-33) — hocanın kendi lateral raise'i
10 yıldır 12,5-15 kg. Bileşikte double progression: üst %2-5, alt %5-10.
- **Boşluk:** #5 efor bazlı görselleştirme · **Kural:** K-31, K-33, H3/B4
- **B ✅ Y ✅ P ✅** — "yanlış harekette ilerleme arayan tek uygulama biz değiliz"

#### Ö-6 · "Hayır" diyebilme
Kullanıcı karara itiraz ettiğinde sistem gerekçeyi tekrar eder, kararı değiştirmez.
Değiştirmesi için **yeni veri** gerekir, ısrar değil.
- **Boşluk:** #2 · **Kanıt:** ELEPHANT 2025, MedPRESS
- **B ✅ Y ✅ P ✅** — kategorinin en keskin ayrımı

### 4.2 · ÖLÇÜM

#### Ö-7 · Ölç sık, yorumla seyrek
Kilo günlük alınır (gürültü SD 0,42 kg, filtrelenebilir), **7 günlük ortalama** gösterilir,
ham nokta soluk. **İlk 14 gün yorum yok.**
- **Boşluk:** #3, #12 · **Kural:** hoca ("her sabah tartıl" + haftalık değişimi yorumlamayı reddediyor) × H1
- **B ✅ Y ✅ P ✅** — iki bağımsız kaynak aynı yere vardı

#### Ö-8 · Yağ yüzdesi asla gösterilmez
AJCN 2023: yağ **kütlesi** değişimi R² 0,75-0,86 · yağ **yüzdesi** değişimi R² **0,23-0,25.**
Hoca: *"Sayı vermeyeceğim çünkü ölçümlerin hepsi yanlış."*
- **Boşluk:** #3 · **B ✅ Y ✅ P ✅** — "sana sahte bir yüzde söylemeyen tek uygulama"

#### Ö-9 · Rehberli fotoğraf
Onion-skin overlay + eğim göstergesi + çerçeve kılavuzu.
Poz normalizasyonu kesinlik hatasını **~%50 azaltıyor** (Wong 2021) — model iyileştirmesinden kârlı.
4 haftada bir; daha sık istemek anlamsız (tespit eşiği 1,2 kg yağ ≈ 3-4 hafta).
- **Boşluk:** #3 · **B ✅ Y ✅ P ➖**

#### Ö-10 · Bel: talep üzerine
Sinyaller çeliştiğinde istenir (kilo düşmüyor + fotoğraf belirsiz + performans sabit).
Eşik **WHtR ≥0,5** — NICE NG246 öz-ölçüm için resmen öneriyor.
Ham cm kullanılır; **yağ oranına dönüştürülmez** (Navy formülü kadında değişimi hiç göremiyor, p=0,86).
- **Boşluk:** #1, #14 · **B ✅ Y ✅ P ➖**

#### Ö-11 · "Kilo sabit ama bel düştü"
Kompozisyon değişimi mesajı. Kanıt: Ross 2000 (n=52).
**Terazi durduğunda kullanıcı bırakıyor** — bu, bırakmayı engelleyen kanıtlı sinyal.
- **Boşluk:** #10, #12 · **B ✅ Y ➖ P ✅**

### 4.3 · SÜRTÜNME

#### Ö-12 · Öğün fotoğrafı → **aralık**, sayı değil
"512 kcal" değil, **"480-620 kcal".**
NIH/NIDDK 2026: öğün başına 250-345 kcal eksik, yağ ~30 g eksik. Kimse aralık göstermiyor.
- **Boşluk:** #3 · **B ✅ Y ✅ P ✅**

#### Ö-13 · Gram sorusu — en yüksek etkili müdahale
Kullanıcıdan gram almak karbonhidrat hatasını **%56,6 → %20,2** düşürüyor.
Ama her öğünde değil: **sadece belirsizlik yüksekse ve öğün günü domine ediyorsa.**
- **Boşluk:** #7 · **B ✅ Y ✅ P ➖** — en düşük teknoloji, en yüksek kazanç

#### Ö-14 · Sapma kalibrasyonu — kimsenin konuşmadığı çelişkinin çözümü
> Adaptif TDEE alım verisinin doğru olduğunu **varsayar.** Fotoğraf loglama günde 750-1000 kcal
> eksik sayıyorsa, algoritma bunu "TDEE düşük" diye okur ve hedefi yanlış yere kurar.

Çözüm: fotoğraf tahmini **mutlak değer değil, sapması sabit trend** olarak modellenir;
gerçek referans **kilo trendi**. Sistem kullanıcının kişisel sapmasını zamanla öğrenir.
- **Boşluk:** #4 · **B ✅ Y ✅ P ➖** — literatürde ve üründe hiç konuşulmamış

#### Ö-15 · Doğal dille kayıt
*"Üstten çekmeli alette 60 kilo 8 tekrar yaptım"* anlaşılır. Ses veya metin.
Teknoloji hazır (Hevy public API + MCP kanıtı), **ana akım hiçbir uygulamada yok.**
- **Boşluk:** #9 · **B ➖ Y ✅ P ✅**

#### Ö-16 · Bilinmeyen ve karışık yemek dayanıklılığı
**Ulusal hedefleme YOK** (Levent kararı, 10 Eylül: *"herhangi bir national hardcoded şey dayatma,
bu global bir proje"*). Hedeflenen şey mutfak değil, **problem sınıfı:** karışık kaplar,
görünmeyen yağ ve sos, tarif bazlı ev yemeği, veri setlerinde temsil edilmeyen gıda.

Kanıt: veri setleri kendi ifadeleriyle "mostly western style dishes" (Nutrition5k yazarları);
batı dışı diyetlerde manuel loglama sistematik olarak eksik çıkıyor. **Genel amaçlı VLM'ler
bilinmedik yemekte özel modellerden iyi** — bu bizim lehimize, çünkü mimarimiz zaten genel VLM +
kanonik veritabanı eşlemesi.

Çözüm ulusal veri seti değil, **mekanizma:** düşük güvende gram sorusu (Ö-13), kullanıcı
düzeltmesinden öğrenme, tarif hafızası, kişisel sapma kalibrasyonu (Ö-14).
Kullanıcı yanlış beyan ediyorsa sistem bunu kilo trendiyle yakalar — sorumluluk aktarılmaz,
**mekanizma telafi eder.**
- **Boşluk:** #8 · **B ✅ Y ✅ P ➖**

### 4.4 · KOÇLUK

#### Ö-17 · Gün içi yönlendirme
Kalan kalori sayısı değil: *ne yiyebilirsin.* Tercih, bütçe, erişim, akşam antrenmanı hesaba katılır.
- **Boşluk:** #11, kısmen #7 · **B ➖ Y ✅ P ✅**

#### Ö-18 · Proaktif tetikleyiciler
Güray'ın kendi 1000 kalori deneyiminden 19 tetikleyici. Örnek:
- *"Hiç aç değilim" (ilk 2 gün)* → başarı sayma, açlığın 3-4. günde geleceğini **önden söyle**
- *2 antrenman kaçtı* → içsel motivasyon tavsiyesi **verme**, dışsal taahhüt akışı kur
- *Kuvvet düşüşü* → "kas kaybediyorsun" **deme**, set artır off azalt
- *Adım düşüşü* → **en yüksek öncelikli uyarı** (NEAT kaybı 500-600 kcal)
- **Boşluk:** #1 · **B ✅ Y ✅ P ✅**

#### Ö-19 · Uyumsuz kullanıcıya dayanıklılık
Plana uymak **ön koşul değil.** Uyum <%50 → kaloriye dokunma, uyumu çöz.
Carbon uyumsuz check-in'de değerlendirmeyi sıfırlıyor; MacroFactor tam tersi ve
kategorinin en yüksek memnuniyetine sahip.
- **Boşluk:** #10 · **B ✅ Y ✅ P ✅**

#### Ö-20 · 5.-8. hafta müdahalesi
Hoca: *"Hafta 5'te arıza başlıyor. Hafta 6 mükemmel giden hafta 7'de kayboluyor,
hafta 8'de bozdum diyor."* Sperandei: %63 üçüncü aydan önce bırakıyor.
Zenoti: %80'i "geri getirebilecek bir şey vardı" diyor.
Sistem bu pencereyi **bilir** ve önceden konumlanır.
- **Boşluk:** #1 · **B ✅ Y ✅ P ✅** — ürünün en yüksek değerli tek davranışı olabilir

### 4.5 · GÖRÜNÜRLÜK

#### Ö-21 · Karşılaştırma çıpası
İnsan dünü hatırlar, başlangıcı hatırlamaz. Sistem kullanıcının **dış hafızası** olur:
bugün vs başlangıç, bugün vs 1 ay önce, bugün vs hedefin yarısı.
- **Boşluk:** #12 · **B ➖ Y ✅ P ✅** — ucuz, kolay, kimse yapmıyor

#### Ö-22 · Efor bazlı görselleştirme
24 uygulamanın ana metriği **total volume** — hacim artıranı ödüllendirir, **efor artıranı cezalandırır.**
Bizim metriklerimiz: *aynı yükte aynı eforda fazla tekrar (ya da aynı tekrarda artan RIR) · e1RM tırmandı, hacim sabit · set başına verim arttı.* (29 Eyl düzeltmesi: ilk sürümde "aynı ağırlıkta RIR düştü" yazıyordu; aynı yük ve tekrarda RIR düşmesi setin zorlaştığını, yani gerilemeyi gösterir.)
- **Boşluk:** #5 · **B ✅ Y ✅ P ✅** — minimalist metodolojinin görsel dili hiç yok

#### Ö-23 · İki pencere ayrımı
**Değerlendirme penceresi 3 ay** (hoca: haftalık artış beklemek "güçlenme hastalığı"),
**karar penceresi 1-2 hafta.** Arayüzde görsel olarak ayrı. Haftalık gürültü gelişim sanılmaz.
- **Boşluk:** #12 · **B ✅ Y ✅ P ✅**

#### Ö-24 · Şekil projeksiyonu
Yüzsüz parametrik 3B model. NIH Body Weight Planner (hata ±1,7-2,5 kg) + kullanıcının kendi ölçüleri.
**Üç uyum senaryosu (%60/%80/%95) + aralık.** Yanında kullanıcının kendi gerçek fotoğraf zaman tüneli.
**Sadece ileri yönde görselleşir** — model geriye şişirilmez, kötüleşme yalnızca sayıda.
İlk oturumda gösterilmez (en az 4 hafta / 2 ölçüm sonra).
Dışlama: 18+, BMI<20'de zayıflama kapalı, SCOFF ≥2 → özellik hiç açılmaz, varsayılan **kapalı.**
- **Boşluk:** yeni · **Kanıt:** feature'ın kilo kaybı etkisi **yok** (FutureMe n=95, Napolitano n=43);
  ölçülen tek etki **öz-yeterlik ve bağlanma** → iddia buna göre kurulur
- **B ➖ Y ✅ P ✅**

### 4.6 · ŞEFFAFLIK

#### Ö-25 · "Neden bu karar"
Her karar açılabilir: hangi veri, hangi kural, hangi eşik, ne kadar güven.
RP, Fitbod, Juggernaut, Dr. Muscle — dördü de kapalı kutu. **Hedef kitle tam olarak
"nedenini bilmek isteyen" insanlar.**
- **Boşluk:** #12 · **B ➖ Y ✅ P ✅**

#### Ö-26 · Kural kaynağı etiketi
Her kural `[tecrübe temelli]` / `[literatür temelli]` etiketli. Hoca kısa örneklemli
araştırmaları açıkça reddedip tecrübeyi öne koyuyor ("araştırmalar geriden gelir") —
bu bir zayıflık değil, **açıkça söylenirse güç.**
- **Boşluk:** #13 · **B ✅ Y ➖ P ✅**

#### Ö-27 · Belirsizlik her yerde görünür
Kalori aralık. Projeksiyon aralık. Karar güven düzeyiyle. "Henüz karar verme" geçerli bir çıktı.
- **Boşluk:** #3 · İlke 17
- **B ✅ Y ✅ P ✅**

---

## 5 · Yapılmayacaklar (net liste)

| # | Ne | Neden |
| --- | --- | --- |
| 1 | Yağ yüzdesi sayısı | R² 0,23-0,25 · hoca da reddediyor |
| 2 | Takvimsel deload haftası | Hoca "taktik yok" diyor; sinyal tabanlı olacak |
| 3 | İzole hareketlerde yük progresyonu | Hoca açıkça reddediyor |
| 4 | Navy çevre formülü / kaliper / BIA yağ oranı | Ölçüm kanıtı reddediyor |
| 5 | Reverse diet protokolü | Trexler 2025 RCT — sayısal olarak en kötü kol |
| 6 | Omuz ölçüsü | Postüre göre değişiyor |
| 7 | Fotogerçekçi yüz+vücut projeksiyonu | EU AI Act Md. 50 · Apple 1.4.1 — **iptal** (n≥500 kendi doğruluk verimizle geri gelebilir) |
| 8 | Streak mekaniği | Suçluluk mekanizmasını besliyor |
| 9 | Telafi mekaniği ("yarın 600 az ye") | Restraint-disinhibition döngüsü |
| 10 | "AI arkadaşın" konumlandırması | FTC şikâyeti + yalnızlık korelasyonu. **Koç araçsaldır** |
| 11 | Her girdiye anında yorum | "Ölç sık, yorumla seyrek" |
| 12 | Klinik terim ("sende insülin direnci var") | FDA General Wellness · MDR Rule 11 · Apple yaş derecelendirmesi |
| 13 | Zor iptal / karanlık desen | 1 yıldızların en büyük sebebi |

---

## 6 · Konumlandırma

**Fiyat çatalı (Faz 1'den):** uygulama alıcısı $35/yıl'a çakılı, koçluk alıcısı $199/ay ödüyor.
Arbitraj: koçluk hizmeti $50-599/ay, koçun yazılımı müşteri başına $0,4-4/ay.
Değerin tamamı **haftada 15-30 dakikalık yargıda.**

**Konum: koç, uygulama değil.** Ama Hevy'nin dersi de var — 2 kişi, 75 gün, sıfır reklam,
$3/ay ile ~$600K/ay. Düşük fiyat + ürünün kendisinin yayılması işliyor.

→ **Faz 4'te karar verilecek.** Bu bir pazarlama kararı, teknik karar değil.

**Dağıtım gerçeği:** CPI $4,30-5,50 vs LTV $1,21 → **ücretli reklam matematiksel zarar.**
Tek yol organik: ürün-kaynaklı büyüme **+** kanal. İkisi birden olan örnek çok az.

**Uyarı:** iFIT/Sweat — creator ayrılınca gelir $100M→$71M (11 ay).
Ürün kişiye bağlı olmamalı: *"Levent'in uygulaması" değil, "Levent'in kurduğu sistem."*

---

## 7 · İlk 8 hafta — savaşın tamamı burada

Kaynak: `_ham/I1-onboarding-aliskanlik.md`

### 7.1 · Güray'ın "hafta 5" tespiti bağımsız olarak doğrulandı — Türkiye verisiyle

**arXiv:2501.01779v2** (Demirci, Varol ve ark., 28 Eylül 2025) — **Mars Athletic Club**,
Türkiye'nin en büyük zinciri, 2022-2023, ilk ücretli yıllık sözleşmeler:

| Bulgu | Değer |
| --- | --- |
| 6. haftada devamlılık serisini kaybeden üye | **%50** |
| 17. haftada | **%80** |
| Geçme eşiği | İlk 6 haftada **≥9 ziyaret** (~haftada 2) |
| Seri kırılma kuralı | **1 haftalık af** var; 2 ardışık hafta devamsızlıkta kırılıyor |
| Gerekçe | Tüm ara boşlukların **%50'si tam 1 hafta** uzunluğunda |
| Öncü gösterge | **Gap week kullanımının artması** |

> Hoca: *"Hafta 5'te arıza başlıyor."* Veri: hafta 6'da milestone kesinleşiyor.
> **Hafta 5 arıza veriyor çünkü hafta 6'da iş biter.**
> Bir Türk koçun gözlemi ile bir Türk zincirinin 2 yıllık verisi aynı haftayı işaret ediyor.

### 7.2 · İlk 4 haftada ne gösterilir — uydurmaya gerek yok

Yordayıcılığı **ölçülmüş** iki davranış metriği var:

| Metrik | Öngörü gücü |
| --- | --- |
| Erken davranışsal adherence → 6. ayda kilo kaybı **ve bel çevresi** | **R = 0,52** (POUNDS LOST) |
| **Günde ≥2 öğün kaydedilen gün sayısı** → 6. ay kilo kaybı | **R² = 0,27** — tüm adherence tanımları arasında en yükseği (Payne 2019) |

Ve performans dürüstçe kullanılabilir: ilk 4 hafta kazanımı **nöral**, hipertrofi ancak
6. haftadan sonra ölçülebilir (Frontiers Physiol 2025).
→ **Hafta 1-5 dili "güçleniyorsun" · hafta 6+ dili "kas".** Yalan değil, sıralama.

**"4 hafta hiçbir şey görmeyeceksin" demek için RCT yok.** Bulunan: yüksek beklenti
12. ayda attrition'ın bağımsız yordayıcısı (Dalle Grave) — ve **ücretli** tedavide risk daha yüksek.
→ Beklenti **düşürülür**, umut kesilmez. Boşluk bırakma; yerine ölçülmüş bir metrik koy.

### 7.3 · Streak kararı: günlük HAYIR · haftalık + 1 hafta affı EVET

Üç bağımsız kaynak aynı tasarıma çıkıyor:
- Salon verisinin ampirik **1 hafta toleransı** (yukarıdaki çalışma)
- **Lally 2010:** bir günü kaçırmak otomatiklik eğrisini bozmadı
- **Duolingo Streak Freeze:** churn **−%21**; freeze sayısını 2-3'e çıkarmak daha da iyi

Sayaç **sıfırlanmaz**, kümülatif gösterilir: **"12'de 9".**

Ek gerekçe: gün 30'da ortalama kullanıcı **0,19 oturum/gün** açıyor (Adjust) — günlük streak
zaten matematiksel olarak imkânsız. Ve self-monitoring Perşembe-Pazar sistematik düşüyor.

> Not: streak karşıtı en çok dolaşan iki sayı (%40 terk, %63 bırakma / "CHI 2020")
> birincil kaynağa bağlanamadı. Karara dahil edilmedi.

Bu, §5'teki "streak mekaniği yapılmayacak" maddesini **inceltir:** yasaklanan şey
**günlük, sıfırlanan** streak. Haftalık, aflı, kümülatif sayaç kanıtla destekleniyor.

### 7.4 · Bildirim: haftada ≤3, hafta içi jenerik yok

Altın standart — **mikro-randomize deneme, n=1.255, 89 gün:**

| Ne | Etki |
| --- | --- |
| Kişiselleştirilmiş mesajın 24 saatlik etkileşime nedensel etkisi | **+%3,9** (RR 1,039; GA 1,01-1,08) |
| Hafta içi | +%2,5 — **anlamlı değil** |
| Hafta sonu | +%8,7 · zirve **hafta sonu 12:30, +%11,8** |

Vendor blogları "günlük bildirim → %820 retention" diyor; uçurum seçilim yanlılığı.
**Bildirim strateji değil, hijyen.**

Üç slot, fazlası yok:
1. Kullanıcının kendi belirlediği antrenman saatinden **30 dk önce**, kendi yazdığı rutin cümlesiyle
2. Pazartesi check-in
3. Sadece **7 gün hareketsizlikte**, öz-şefkat çerçeveli tek mesaj

**Onboarding'den çıkarılacak sorular:** 14 çalışma / n=6.069 meta-analizinde fiili davranışı
öngören tek iki ipucu **saat (r=0,11)** ve **rutine bağlama (r=0,13)**.
Mekân (r=0,06) ve sosyal (r=0,09) anlamlı değil → "hangi salon", "kiminle" sorma.

### 7.5 · Hafta hafta

| Hafta | Kullanıcı ne görür | Sistem ne yapar |
| --- | --- | --- |
| **H0** | 7 soru, ≤12 ekran, 5 dk. Kendi verisinden çıkan çıkarım: *"haftada gerçekçi 2,7 antrenman sığıyor, 5 değil"*. Beklenti kalibrasyonu salon verisiyle. *"İlk 4 hafta sana terazi göstermeyeceğim — onun yerine şunu göstereceğim."* | Baseline kurulur. **Paywall bundan sonra** |
| **H1** | Tek sayaç: "12'de 1" | **Susar.** İlk 14 gün yorum yok |
| **H2** | İlk performans karşılaştırması | Check-in'de 2 soru. Implementation intention pekiştirilir (pekiştirilmezse etkisiz — PLOS ONE) |
| **H3** | Kayıt tutarlılığı paneli + **neden bu metrik** açıklaması | Ertelenen sorular şimdi sorulur |
| **H4** | Nöral açıklama ekranı + **ilk ölçüm penceresi** (trend + gürültü bandı) | Adaptif hedef güncellemesi |
| **H5** 🔴 | *"12'de 9 — eşiği geçtin"* | **Risk skoru devreye girer.** RCT: 1. ay sonunda geride kalanlara ekstra koçluk işe yarıyor (n=437) |
| **H6** | Milestone kutlaması. **İlk kez "kas" denir.** İlk kez foto/ölçü istenir | 1,2 kg tespit eşiği artık geçilmiş olabilir |
| **H7** | Hafta 1 sen vs hafta 7 sen | Bir sonraki milestone kurulur (17. haftada %80 kayıp) |
| **H8** | 8 haftalık dosya + yeni blok | **8 hafta alışkanlık kurmaz** (Lally: karmaşık davranış ≫66 gün, %48 başarı) — bir sonrakine devrettirir |

### 7.6 · Paywall ve iptal
- **3 günlük trial yanlış:** ≤4 gün trial'lar %30 daha kötü dönüşüyor; 17-32 gün **%42,5 vs %25,5**
- Ama iptallerin **%64-84'ü gün 0-1'de** — trial uzunluğundan bağımsız, **ilk 24 saat her şey**
- Bizim asıl problemimiz iptal sürtünmesi değil, **sessiz sürüklenme** (%50+ iptal bile etmiyor)
- **Pause (duraklatma) çözümü:** duraklatanların %60-80'i geri dönüyor, iptal edenlerin %10-20'si.
  Tam bu kitleyi hedefliyor → iptal ekranında birincil seçenek **duraklat**, ama iptal gizlenmez

---

## 8 · Etkileşim modeli

Kaynak: `_ham/I2-etkilesim-modeli.md`

### 8.1 · İKİ ÖZELLİK DÜZELTİLDİ

#### ⚠️ Ö-15 düzeltmesi — ses omurga olamaz
**SnappyMeal** (arXiv:2511.03907, Kasım 2025) tam olarak bizim tasarladığımız şeyi denemiş:
çok modlu giriş + hedefe bağlı takip sorusu + veritabanı RAG'i. 6 kişi, 3 hafta, 502 kayıt.

> **Ses üç hafta boyunca %0 kullanıldı.** Düz sıfır. 3 kişi fotoğraf, 3 kişi metin seçti.

Sebep: kamusal alanda utanç etkisi (ACM/IJHCI) + salonda ASR gürültüsü.
→ **Metin ve fotoğraf birincil. Ses araba/mutfak/yürüyüş için opsiyon.**

#### ⚠️ Ö-27 düzeltmesi — "belirsizliği göster" naif hâliyle yanlış
Bunu farklılaşma alanımız sanıyorduk. Kanıt naif uygulamayı **desteklemiyor**:
- Sözel çekince tavsiyeye uyumu anlamlı düşürüyor, yetkinlik algısını aşındırıyor (ACM CUI '26)
- Görsel belirsizlik bedava değil: N=147 çalışmasında güven **%48'de arttı, %52'de azaldı**

İşe yarayan formül belirsizliği *itiraf etmek* değil, **çözülebilir kılmak**:

```
✗ "Emin değilim, belki lat pulldown."
✓ "Lat pulldown olarak kaydettim · %85
   [Bu değil mi? → Seated row · Pullover]"
```

**Karar ver** (yetkinlik korunur) + **güveni nicelle** (kalibrasyon) + **tek dokunuşluk çıkış** (aksiyon).
Kalori aralığı (Ö-12) ayakta kalıyor — orada aralık *sayının kendisi*, çekince değil.

### 8.2 · Tahmin veritabanında, dil LLM'de

| Yöntem | Hata |
| --- | --- |
| Ham LLM'e "ne yedim" demek | **MAE 652 kcal** — kullanılamaz |
| Alan-uyarlı model + chain-of-thought + **kanonik veritabanı eşlemesi** | **MAE 171-191 kcal** (NHANES, n=11.281) |

MacroFactor aynı sonuca ürün tarafından varmış: **LLM tahmin etmesin, veritabanına eşlesin.**
Ciddi ürünlerin hiçbiri doğal dili tek kayıt yolu yapmıyor.

Bu, §1'deki mimari kararın ikinci yüzü:
**yargı kodda, dil LLM'de — ve tahmin veritabanında, dil LLM'de.**

> **Ölçülmemiş risk ve fırsat:** egzersiz eşlemesi için yayınlanmış **hiçbir benchmark yok.**
> Beslenmede sayı var, egzersizde yok. "Üstten çekmeli alet → lat pulldown" doğruluğunu
> ölçen ilk taraf biz olabiliriz.

### 8.3 · Düzeltme bir kusur değil, güven kaynağı
SnappyMeal: düzeltme oranı **%20,7** (+%5,8 silme) — her 5 kayıttan biri yanlış.
Ama **"düzenleyebilme" en yüksek memnuniyet skorunu aldı (4,33/5).**
→ Düzeltme akışı birinci sınıf tasarlanacak, saklanmayacak.

### 8.4 · Chat / dashboard iş bölümü — Keyhole Effect
Ayırıcı ilke (arXiv:2602.00947): **birden fazla öğeyi aynı anda görmeyi gerektiren iş
dashboard'a; tek öğelik veya yapılandırılamayan ifade chat'e.**

| Chat | Dashboard |
| --- | --- |
| Bağlam anlatma ("dizim ağrıyor", "sınav haftası") | Rutin kayıt |
| Tek sayı sorusu | Trend ve geçmiş |
| **Sistemin soru sorması** | Karar kartı (kalıcı durur) |
| Kararın *nedeni* | Plan **onayı** |

Plan değişikliği chat'ten tetiklenir, **yapılandırılmış onay ekranında** onaylanır
(NN/g: AI form üretir, kullanıcı klasik araçla düzenler).

**Zorunlu kural: chat asla boş kutu olmayacak.** Kullanıcı "1RM tahminim ne oldu" diye
sormayı akıl edemez — artikülasyon bariyeri. Her açılışta **o günün verisinden türetilmiş 3 çip.**

> Not: Keyhole Effect bir kuram makalesi, ampirik doğrulaması yok. Güçlü argüman, kanıtlanmış değil.

### 8.5 · "Veri talebi" modeli — mekanizması hazır: CAT

Aradığımız şeyin ürünleşmiş hâli **Computerized Adaptive Testing.** PROMIS verileri:

| Banka | Varsayılan | Optimize durdurma | Azalma |
| --- | --- | --- | --- |
| Anksiyete | 9,98 madde | 5,58 | **%44** |
| Depresyon | 8,13 madde | 4,79 | **%41** |
| 6 alan toplam | 72 madde | **24 madde** | **%67** |

Kesinlik bedeli T-skorda 0,04-0,58 puan — ihmal edilebilir.

> **Asıl kazanç soru seçmekten değil, SUSMAKTAN geliyor.** CAT'in tasarlanan kısmı durma kuralı.

Ve bunun kanıtı SnappyMeal'in hatasında: **her kayda soru sormak zarar verdi** —
MAE 123,96 → **153,00 kcal**, ve kullanıcılar "geleneksel yöntemden kolay" bulmadı.

**Dört parçalı model:**
1. Belirsizlik durumu (bakım kalorisi · toparlanma · RIR kalibrasyonu · sapma katsayısı…)
2. Soru başına beklenen bilgi kazancı
3. Eşik altına inince **sus**
4. Haftalık soru bütçesi: **≤2 normal, ≤5 anomali**

Bu, Ö-13'ü (gram sorusu) de disipline ediyor: gram sorusu her öğünde değil,
**sadece belirsizlik yüksek ve öğün günü domine ediyorken.**

### 8.6 · Kullanıcı girdisi öngörülebilir yönde yanlış
Doubly labeled water'a karşı eksik bildirim **%20-27,4**; kontrollü besleme çalışmasında bile
%5-21; BMI arttıkça artıyor. Q Sense: katılımcılar günlerin **≥%56,2'sinde** eksik bildirdi.

→ **Ölçülen sonuç (kilo trendi) > beyan edilen girdi (kalori).**
→ Beyan çelişince kullanıcıyı **suçlama** — beyanı kalibre edilecek sinyal say.
→ Ö-14'ün (sapma kalibrasyonu) gerekçesi bir kat daha güçlendi.

### 8.7 · Pasif veri
**Geofence çalışıyor:** Q Sense'te %97 konum yakalama, ~32 m doğruluk (salon tespiti için fazlasıyla yeterli),
gizlilik kaygısı oybirliğiyle yok — **ama** bir katılımcı *"üniversiteye veririm, ticari eczaneye vermem"* demiş.
Biz ticari tarafız. **Veriyi ne için kullandığımızı görünür kılmak izin oranını doğrudan belirliyor.**

Aynı çalışmada terk sebebi yük değil, **amacın belirsizliği ve sosyal çekince**ydi.
→ "Az soru sor" yetmiyor; **"neden sorduğunu söyle"** de gerekiyor. §3'teki kural bununla kanıtlandı.

### 8.8 · Fotoğraf akışı
- Ghost overlay artık **sektör standardı** (5+ ürün) — ayrım değil, giriş bileti
- Eksik olan ve bizim koyacağımız: **eğim göstergesi**
- **Sabit gün dayatma, pencere ver.** Levent'in kendi kısıtı (4 kişilik yurt odası) sabit günü imkânsız kılıyor —
  ve bu kısıt kullanıcıların büyük kısmında da var

### 8.9 · Anti-kalıplar
| # | Anti-kalıp | Kanıt |
| --- | --- | --- |
| 1 | Aşırı bildirim | Etki **en baştan küçük** (+%3,9). Alışma anlamsız çıktı (P=,84) — yani "etki söner" değil, hiç büyük değildi. Bütçe harcamaya değmez |
| 2 | **Yanlış varsayılanla doldurma** | *"it would default to 'how much chicken did you bake' which was frustrating to edit"* — yanlış varsayılanı düzeltmek boş alandan pahalı. **Emin olmadığın alanı doldurma** |
| 3 | Her girdiye anında yorum | Kilo gürültüsü SD 0,42 kg → günlük yorum, gürültüye yorum. **MacroFactor ölçüyor günlük, yorumluyor haftalık** — ticari olarak kanıtlanmış desen |
| 4 | Aşırı sözel çekince | §8.1 |
| 5 | Zor iptal | FTC, Fitness International'a dava açtı. Click-to-Cancel 2025'te temyizde düştü, FTC Mart 2026'da ANPRM ile yeniden başlattı — kural yürürlükte değil ama **Section 5 / ROSCA ile aldatıcı arayüz hâlâ kovuşturuluyor** |

---

## 9 · Faz 4'e taşınan açık kararlar

1. **Konumlandırma:** "koç" ($199/ay çapası) mı, "uygulama" ($35/yıl tavanı) mı? Fiyat buna bağlı
2. **Platform sırası:** iOS-önce kesin (Google Play sağlık app'i için Organizasyon hesabı + D-U-N-S)
3. **Şekil projeksiyonu varsayılan kapalı mı, onboarding'de mi teklif ediliyor?**
4. **Egzersiz eşleme doğruluğu** — literatürde benchmark yok; kendi ölçümümüzü kurar mıyız?
5. **Fiyat + kota tasarımı** — LLM hakkı nasıl sınırlanır, hangi katmanda ne kadar?

---

## 10 · Cinsiyet — 10 sayı + 1 güvenlik modülü

Kaynak: `_ham/J1-cinsiyet.md` · Karar: kadınlar **ilk sürümde** (Levent, 10 Eylül)

### 10.1 · Değişen parametreler

| Parametre | Erkek | Kadın | Kanıt |
| --- | --- | --- | --- |
| Yağ **alt** sınırı | 0,5 g/kg | **0,7-0,8 g/kg** veya %20 enerji | ORTA |
| Kas kazanım hızı | ~1 kg/ay | **~0,5 kg/ay** (×0,5) | ⚠️ ZAYIF — Lyle/Aragon modeli, RCT değil |
| Vücut yağ ofseti | 0 | **+10 puan** (esansiyel yağ %3 vs %12) | GÜÇLÜ |
| Bulk tavanı | %20 | **%30** | ofsetten türetildi |
| Bel çevresi (cm) | 94 / 102 | **80 / 88** (WHO) | GÜÇLÜ |
| Karar penceresi | 2-3 hafta | **4 hafta** | matematik (§10.3) |
| Trend ortalaması | 7 gün | **28 gün** (gösterim 7 kalır) | matematik (§10.3) |
| Yaş ≥45 | — | protein 2,2 g/kg · kazanım ×0,35 | ZAYIF-ORTA |

### 10.2 · Değişmeyenler — dokunma
- **Protein 2 g/kg aynı** (ISSN kadın position stand 2023 aynı bandı veriyor)
- **Haftalık ~10 set, 2 frekans, RIR 0-1 aynı.** Refalo 2025 Bayesçi meta-analizi (29 çalışma):
  *göreli* hipertrofi kazanımı iki cinste aynı; yazarların kendi çıkarımı
  *"resistance training may be prescribed similarly"*
- **Toparlanma:** scoping review (34 çalışma) fark bulmuyor — kadınlar setler arası **daha hızlı** toparlanıyor
- **WHtR ≥0,50 cinsiyet-agnostik** — tek eşik, iki cinsiyet. Sadeleştirme
- **Kilo kaybı %1/hafta kuralı** zaten doğru davranıyor
- **Hormonal doğum kontrolü:** meta-analiz hiçbir adaptasyon farkı bulmuyor → **soruyu sorma bile**

### 10.3 · Döngü: sormadan çözülüyor — ve mevcut app'lerin kadınlarda bozulma sebebi bu

**Kanıt zayıf, popüler iddia desteksiz.** Colenso-Semple 2023 umbrella review: döngü fazının
akut kuvvet performansına veya uzun vadeli adaptasyona **etkisi yok.** McNulty 2020
(78 çalışma, 1.193 kişi): erken foliküler fazda **"trivial"** düşüş.

> **Stratejik not:** rakiplerin ana satış argümanı tam olarak faz bazlı periyodizasyon —
> ve ticari olarak da tutmadı. FitrWoman ve Jennis birleşmek zorunda kaldı,
> Wattson Blue hiç fon alamadı. **Bariz "kadın özelliği" hem kanıtsız hem başarısız.**

Döngünün tek gerçek pratik etkisi **~0,5 kg su tutulumu** (Kanellakis 2023) — hedeflenen
haftalık kayıpla **aynı mertebede**, yani gerçek bir hatalı-tetikleme kaynağı.

N günlük hareketli ortalamanın T periyotlu bileşeni geçirme kazancı: `|sin(πN/T) / (N·sin(π/T))|`

| Pencere | Döngü sinyalinin geçen kısmı |
| --- | --- |
| **7 gün** | **%90** ← mevcut motorların kadınlarda bozulma sebebi |
| 14 gün | %64 |
| 21 gün | %30 |
| **28 gün** | **%0 — tam sıfırlama** |

Döngü 21 veya 35 gün olsa bile kalan ~%22 (0,11 kg) — ihmal edilebilir.

> **Karar penceresini 28 güne çekmek, hiçbir şey sormadan döngüyü yok ediyor.**
> Bu madde "ayrı mantık" listesinden **"parametre" listesine** taşındı. En büyük kazanç burada.
> Ardışık 4 haftalık blok karşılaştırması da aynı işi görür.

**Döngü verisi İSTENMEYECEK.** HealthKit/Health Connect teknik olarak veriyor
(`menstrualFlow`, `MenstruationPeriodRecord`) ama: ek izin diyaloğu, Google Play
"heightened scrutiny", kullanıcıların en fazla %30-60'ında veri var, **GDPR Art. 9 +
post-Dobbs celp riski** — ve karşılığında antrenman kararında hiçbir şey değişmiyor.

⚠️ Kilodan periyot tespiti (v2 fikri) de **türetilmiş üreme sağlığı verisi** sayılır.
Yapılacaksa cihaz üzerinde, faz asla saklanmaz.

### 10.4 · RED-S — tek gerçek yeni modül (~30 satır)

IOC 2023 konsensüsü. `EA = (alım − egzersiz harcaması) / yağsız kütle`

| Bant | Değer |
| --- | --- |
| Yeterli | ≥45 kcal/kg FFM/gün |
| Kesim bandı | 30-45 |
| **LEA** | **≤30** (erkekte ~9-25) |

**Hard stop tetikleyicileri:** yağ oranı <%18 · 8 haftada >%8 kayıp · **adet kaybı bildirimi**

Adet sorusu **onboarding'de sorulmaz** — kullanıcı LEA bandına *girdiğinde* gösterilir,
cevap **saklanmaz.**

Modül **cinsiyet-agnostik** yazılır, sadece eşikler değişir — erkeklerde de değer üretir.
