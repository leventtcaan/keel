# G6 — Eski Arşiv Taraması (2016–2024)
**Kaynak:** Güray Aydın YouTube kanalı, eski videolar
**Çıkarım tarihi:** 2026-09-09
**Amaç:** Son 12 ayın analizinde (G1–G5) boş kalan karar-motoru parçalarını eski videolardan doldurmak.

> ### ➡ DEVAM DOSYASI: `G7-whisper-arsiv.md` (2026-09-10)
> Bu dosyanın "altyazısız, ulaşılamadı" dediği **12 videonun tamamı** sesi indirilip yerel whisper ile
> açıldı. **81 yeni kural (K-66 … K-146).** B4 (deload) ve B10 doldu, B3/B9 tamamlandı.
> **Bu dosyadaki bir sonuç yanlış çıktı** — aşağıdaki D bölümünün başındaki ⛔ kutusuna bak.

---

## 0 · TARAMA ÖZETİ

| | |
| --- | --- |
| Kanaldaki toplam video | **237** (tam liste: `_transkript/tum-videolar.txt`) |
| Zaten analiz edilmiş (atlandı) | 31 |
| Başlıktan aday seçilen | 92 |
| **Türkçe altyazısı OLAN ve inen** | **33** |
| Türkçe altyazısı HİÇ OLMAYAN (doğrulandı) | 59 |
| Derinlemesine kural çıkarılan | **20** |
| Ek anahtar-kelime taraması yapılan | 13 |

### ⚠ SERT KISIT: Eski arşivin bir kısmında altyazı hiç yok
Kanalın eski videolarının bir bölümünde **YouTube otomatik altyazısı hiç üretilmemiş.**
**Üç ayrı turda** doğrulandı (paralel indirme → yavaş sıralı indirme → tekil `--list-subs`):
`has no automatic captions / has no subtitles`.

> **Metodoloji notu — tekrarlanabilir olması için:** İlk turda `xargs -P5` ile paralel indirme
> YouTube'dan **HTTP 429 + "Sign in to confirm you're not a bot"** aldı ve 33 videoyu yanlışlıkla
> "altyazısız" gösterdi. 4 dk soğuma + istekler arası 7 sn bekleme ile tekrarlandığında bunların
> **8'i indi.** Kalan kritik 12 video ayrıca 20 sn aralıklarla tek tek denendi — hepsi gerçekten
> altyazısız. **Ders: bu kanalda yt-dlp'yi paralel çalıştırma, istekler arası ≥7 sn bırak.**

Bu yüzden **hedef listedeki bazı videolara ulaşılamadı.** En acı kayıplar (hepsi 3 kez doğrulandı):

> ✅ **2026-09-10 GÜNCELLEME:** Aşağıdaki tablodaki videoların **12'si `G7-whisper-arsiv.md` ile
> kurtarıldı** (sesi indirilip yerel whisper ile transkribe edildi): `YZdARtovIfI` `lpPwk-3lS60`
> `mhFCuEgTL2g` `FV56znnFgF0` `MAIv3wK1Mck` `2uZLxGnBmLo` `5vGYz_o6w7A` `N6V03JePvJE`
> `yQOgRMb-7p4` `NPg9eJxx6ws` `boqyZ2UO1M0` `zE-zRpBJh7c`.
> Tablodaki geri kalanlar (`SB89OymAdi0` `CcKA6KpI2Q8` `OWMlIfWpZBg` `hHV9mMnuAqE` `ZgeiLRzsk-g`
> `xc0K2q9uacc` `Mcn3jmgHEkU` `gAfqb7ZDsOw` `7eisXvc-XK4` `FyqVKHu3yaU` `bXM0gKb5zIQ`) **hâlâ
> transkribe edilmedi** — aynı yöntemle açılabilirler.

| ID | Başlık | Hangi boşluk kaçtı |
| --- | --- | --- |
| `YZdARtovIfI` | Soru-Cevap Part 4 — **Deload** ve Daha Fazlası | **B4 (deload)** — tek doğrudan kaynak |
| `lpPwk-3lS60` | Haftada 3 Gün Antrenman — Overreaching vs Overtraining | B4 / B10 |
| `mhFCuEgTL2g` | Hipertrofi Antrenman Rehberi | B10 |
| `FV56znnFgF0` | Bulk mı Definisyon mu Yapmalıyım | B6 |
| `MAIv3wK1Mck` `SB89OymAdi0` `CcKA6KpI2Q8` `OWMlIfWpZBg` | 15 Günde Yağları Yak (0./1-2./3-5./6-8. gün) | B3 / B9 |
| `2uZLxGnBmLo` `hHV9mMnuAqE` | En Hızlı Yağ Yakma / 15 Günde Kaç Kilo | B3 |
| `5vGYz_o6w7A` `ZgeiLRzsk-g` `xc0K2q9uacc` | 2 Aylık Değişim / Yağ Yakım Planı / 5 Yıllık Gelişim | B11 |
| `N6V03JePvJE` `Mcn3jmgHEkU` `gAfqb7ZDsOw` | Kilo Alma-İştahsızlık / Proteinler / Yağlar | B8 |
| `boqyZ2UO1M0` `zE-zRpBJh7c` | Ketojenik Diyetler Neden Berbat / Karbonhidratlar | B9 |
| `yQOgRMb-7p4` `NPg9eJxx6ws` `7eisXvc-XK4` `FyqVKHu3yaU` | Proteinocean Soru-Cevap 1-2 / Soru-Cevap 1-2 | B4 / B9 / B10 |
| `bXM0gKb5zIQ` | Yeni Başlayanlar İçin Program | B12 |

Bu videolara ulaşmanın tek yolu **sesi indirip `whisper` ile transkript çıkarmak.**
✅ **Bu iş yapıldı** (2026-09-10, 12 video, ~234 dk ses, ~2,5 saat toplam süre) → `G7-whisper-arsiv.md`.
Yöntem, tuzaklar ve komutlar orada. **Not: `yt-dlp` 403 verirse bot koruması değil, sürüm eskimesidir —
önce güncelle.**

---

## 1 · SEÇİLEN 20 VİDEO ve GEREKÇESİ

| # | Kod | Dosya | Tarih | Başlık | Neden seçildi |
| --- | --- | --- | --- | --- | --- |
| 1 | `PT17` | `20170408_OqH2bRZzYZ4.txt` | 2017-04-08 | Kendime PT #1 — Beslenme Programı, Kalori Hesaplama | **Kanaldaki tek doğrudan "bel ölçüsü" protokolü.** B1'in ana kaynağı |
| 2 | `SF23` | `20230928_iAbY0aHy_Bs.txt` | 2023-09-28 | "Hem göbeğim var hem kas kütlem yok" | Skinny-fat = bulk/cut eşiği + faz süreleri |
| 3 | `HYZ22` | `20220601_ts0758z2ics.txt` | 2022-06-01 | Kısa Sürede Forma Girmek — En Hızlı Yağ Yakımı | En sayısal diyet protokolü; plato/su tutumu |
| 4 | `NKY22` | `20221224___RUNSD52Ho.txt` | 2022-12-24 | Büyümek İçin Ne Kadar Yemek Yemelisin | Haftalık kilo alma/verme hızları |
| 5 | `BLK21` | `20210129_ZI0YxB7IByA.txt` | 2021-01-29 | Çok Net Bulk Diyeti Planlaması | Makro tavanları + kalori artırma protokolü |
| 6 | `YK19` | `20190123_U5W0jFZI18E.txt` | 2019-01-23 | Yüksek Karbonhidrat ile Bulk Sistemi | B9'un ana kaynağı + açlık kan şekeri testi |
| 7 | `SBZ19` | `20190401_2K5dbnKeqME.txt` | 2019-04-01 | Alkali Besinler ve Sebzelerin Önemi | **B8'in tek kaynağı** |
| 8 | `FZL24` | `20240116_gbDTTRPtIAk.txt` | 2024-01-16 | Kasların Gelişmiyorsa Fazla Çalışıyor Olabilirsin | **B4'ün ana kaynağı** — durağanlık teşhisi |
| 9 | `TKR24` | `20240126_PgDIeqWPIJo.txt` | 2024-01-26 | "Kaç Tekrar Yapmalıyım?" | Tekrar aralığı matrisi |
| 10 | `SIS21` | `20210705_ztzHG_KltMM.txt` | 2021-07-05 | Antrenman Sistemlerinin Temelleri (Eğitim #2) | **B10'un ana kaynağı** — gün/sıklık/set |
| 11 | `GH22` | `20220408_fFkZO1WhoJ0.txt` | 2022-04-08 | Guray's Hypertrophy Daha İyi Olabilir mi | Program kişiselleştirme + iyileşememe protokolü |
| 12 | `AGR23` | `20230422_mnBDOmJ5ZOY.txt` | 2023-04-22 | Ağır Çalışmak Kas Gelişimini Engelleyebilir mi | **B5'in ana kaynağı** — kilo ekleme kuralı |
| 13 | `YB22` | `20221027_ktdQR7tLECU.txt` | 2022-10-27 | Yeni Başladığımda Yaptığım 5 Hata | **B12** + progresif overload tanımı |
| 14 | `HT23` | `20230505_DbyWhvKD4oY.txt` | 2023-05-05 | Salonda Görmekten Sıkıldığım 5 Hata | B12 + kilo ekleme ön koşulu |
| 15 | `BG16` | `20160918_II_Ir5gaDpw.txt` | 2016-09-18 | 6 Best Tips For Fitness Beginners | B12 + fotoğraf/ölçü takibi |
| 16 | `GRC23` | `20231016_a8mOdCu4844.txt` | 2023-10-16 | Kas Yapmak İsteyenler İçin Hayatın 7 Gerçeği | **Yağ oranı eşik tablosu** (B6/B2) |
| 17 | `DB23` | `20231108_WwBXRxw3JOM.txt` | 2023-11-08 | Dirty Bulk Artıları ve Eksileri | B6 — surplus tavanı |
| 18 | `STR23` | `20230120_QN2bI-J0m8c.txt` | 2023-01-20 | Stres Yaratan Diyetler | B7/B8 — besin değiştirme, 80/20 |
| 19 | `PRG22` | `20220102_c-JGheZ09J4.txt` | 2022-01-02 | Zırt Pırt Antrenman Programı Değiştirmek | B5/B10 — egzersiz sabitliği |
| 20 | `SC17` | `20170221_AypBqqyFQFU.txt` | 2017-02-21 | Soru-Cevap Part 5 | B6/B10 — 3 günlük split, yağ-güç ilişkisi |

**Ek anahtar-kelime taraması (kural çıkarılmadı, yalnız tarandı — 13 video):**
`20210630_T15_PvmJYZU` (Egzersiz Seçimi) · `20160710_s6FSGF7021s` (5x5) ·
`20161111_TIoQ_2x6wGY` (Güçleniyorum ama Gelişmiyorum) · `20190322_xQBzgXZfqFs` (Neden Ulaşamıyorsun) ·
`20190212_L8nKCInBKSQ` (Yüksek Karbonhidratlı Bulk Vlog) ·
`20170605_ZWtAAykcaoE` (Kendime PT #3) · `20190308_ik98s85rdWM` (BCAA) ·
`20200508_f5KkTgRRn3g` (Zihin-Kas Bağlantısı) · `20230602_qmGQccji1Gg` (Daha İyi Pump) ·
`20230828_IXaN0w7FLyM` (Yarışma Sürecim — **K-65'in kaynağı**) · `20240209_cjTLEXlswP0` (Brother, What Do You Want) ·
`20240529_FmzCaoHbgAQ` (Hayattan #6) · `20240919_i7M7rmfkJtU` (Managing Criticism)

**Elenen kategoriler:** konuklu podcast/sohbet (`@gokalaf`, `@ağırsağlam`, `@TunaTavus`, sahur serisi,
"Bence Böyle" serisi), yarışma vlogları, egzersiz-tekniği kısa videoları (bench/deadlift form),
"Hayattan" motivasyon serisi, steroid serisi.

### ⚠ Bu dosyadaki 20 kaynağın tamamı SOLO video
Podcast yok, reaksiyon videosu yok. **Hiçbir kural için `[konuşmacı belirsiz]` etiketi gerekmedi.**
Tek istisna: `SC17` (Soru-Cevap) — Güray + Beytullah + Fırat birlikte; oradan alınan iki kuralda
cevabın Güray'a ait olduğu bağlamdan net (soruları o cevaplıyor), yine de işaretlendi.

### ⚠ ASR bozulmaları (bu partide gözlenen)
`% 120` → **%20** · `% 15520` → **%15-20** · `% 112` → **%12** · `% 110` → **%10** ·
`yavru / yavr` → **yağ oranı** · `çiğit / çiğitme / çi meil` → **cheat meal** · `balk / bank / dbal` → **bulk** ·
`Güray Siper Trophy / süper trafik` → **Guray's Hypertrophy** · `progresi bana / profesör` → **progressive overload** ·
`Cepte X tekrar` → **RIR (rezervde X tekrar)** · `sukat / squared` → **squat** · `fatik / Fatih` → **fatigue** ·
`Nizami` → nizami (doğru) · `550-560 gram protein` → karbonhidrat olmalı **[ASR şüpheli]**

---

# KURALLAR

## A · ÖLÇÜM ve TAKİP (B1, B2, B11)

### K-1 · Bel ölçüsü sabah, aç karna, her gün
- **Kural:** Tartı ve bel ölçüsü her sabah, aç karna, birlikte alınır.
- **Sayı/eşik:** Günlük; sabah; aç karna. Eşik değeri verilmiyor.
- **Koşul:** Bir plan/program yürüten herkes.
- **Gerekçe:** Yağ oranının artıp azaldığını izlemenin pratik yolu bel ölçüsüdür; tartı tek başına yanıltır.
- **Kaynak:** `PT17` (2017-04-08)
- **Alıntı:** "her sabah tartılacağım ve bel ölçümü kesinlikle ölçeceğim sabah aç karna bel ölçüsü"
- **Kesinlik:** net kural
- **Boşluk:** **B1** (bel çevresi), B11

> **ÇATIŞMA UYARISI.** G-serisi notlarına göre 2026 videolarında (`2Fg5zOAAsD0`) haftalık bel ölçüsü
> değişimine bakmayı **reddediyor**. Çelişki değil, ölçek farkı: **ölç sık, yorumla seyrek.**
> Karar motoruna böyle girmeli — günlük veri toplanır, karar aylık trendle verilir.

### K-2 · Bel = yağ ölçer, kol/bacak = kas ölçer, omuz = geçersiz
- **Kural:** Yağ değişimi bel ölçüsünden, kas değişimi kol veya bacak ölçüsünden izlenir; omuz ölçüsü kullanılmaz.
- **Sayı/eşik:** yok
- **Koşul:** Mezura ile takip yapan herkes.
- **Gerekçe:** Omuz ölçüsü postüre göre değişir ("bir gün böyle dursun, bir gün böyle dursun"); kol her zaman aynı şekilde sıkılır, tekrarlanabilir.
- **Kaynak:** `PT17` (2017-04-08)
- **Alıntı:** "bir omuz ölçme çok yanlış bir ölçü olabiliyor ... kol her zaman sıktığında aynıdır"
- **Kesinlik:** net kural
- **Boşluk:** **B1**, B11

### K-3 · Yağ oranı için cihaz yok — deri kıvrımı ve göbek görünürlüğü
- **Kural:** Yağ oranı sayısal olarak ölçülmez; karın derisini elle tutmak ve göbeğin görünüp görünmemesi pratik ölçüttür.
- **Sayı/eşik:** yok — sayı vermeyi bilinçli reddediyor
- **Koşul:** Sıradan sporcu (yarışmacı değil).
- **Gerekçe:** "ölçümlerin hepsi yanlış" — cihaz/formül güvenilmez, kişi kendi yıl boyu formuna göre değerlendirmeli.
- **Kaynak:** `YK19` (2019-01-23)
- **Alıntı:** "sayı vermeyeceğim çünkü ölçümlerin hepsi yanlış ... kendinize göre düşünün"
- **Kesinlik:** net kural
- **Boşluk:** **B2**

> **DEXA, kaliper, BIA (biyoempedans) hiçbir videoda geçmiyor.** 25 transkriptte tek bir kez bile
> anılmıyor. Bu bir eksiklik değil, hocanın pozisyonu: ölçüm yerine **bel + ayna + göbek testi.**
> Bir istisna: `PT17`'de bir IIFYM hesaplayıcısının "bele göre yağ oranı" tahminini kullanıyor ama
> hemen "bir fikir vermesi için" diyerek değerini düşürüyor.

### K-4 · Açlık kan şekeri ≤90 — karbonhidrat toleransının objektif testi
- **Kural:** Sabah açlık kan şekeri ~90 ve altındaysa alınan karbonhidrat miktarı uygundur; 100'lerdeyse fazladır.
- **Sayı/eşik:** **≤90 mg/dL uygun · 100+ fazla**
- **Koşul:** Yüksek karbonhidratlı (>4 g/kg) beslenen sporcu.
- **Gerekçe:** Karbonhidratı kas içine sokabiliyor musun sorusunun cevabı; yüksek değer yağlanma riski + insülin direnci demektir.
- **Kaynak:** `YK19` (2019-01-23)
- **Alıntı:** "90'ın çok üstünde 100'lerde geliyorsa bu karbonhidrat size fazla demektir"
- **Kesinlik:** net kural
- **Boşluk:** **B2**, B9, B11

### K-5 · Takip üçlüsü: fotoğraf + ölçü + yalnızca kendinle kıyas
- **Kural:** İlerleme fotoğraf ve mezura ölçüsüyle takip edilir; başkasıyla kıyas yapılmaz.
- **Sayı/eşik:** yok (sıklık verilmiyor)
- **Koşul:** Özellikle yeni başlayan.
- **Gerekçe:** Başkasının genetiği, ilaç kullanımı ve hayat düzeni bilinmez; tek geçerli referans kişinin kendi eski hali.
- **Kaynak:** `BG16` (2016-09-18)
- **Alıntı:** "eski halinizin fotoğrafını çekebilirsiniz ölçülerinizi alabilirsiniz ilerleme varsa her şey yolundadır"
- **Kesinlik:** net kural
- **Boşluk:** B11

### K-6 · Kalori sayımı: başlangıçta uygulama, sonra sabit gramaj
- **Kural:** Başlangıçta kalori/makro uygulamayla sayılır; sistem oturunca sayım bırakılıp sabit besin gramajlarına geçilir.
- **Sayı/eşik:** yok
- **Koşul:** Sayım disiplinini kurmuş, aynı besinleri yiyen sporcu.
- **Gerekçe:** Sabit besin + sabit gramaj takibi kolaylaştırır; farklı besinlere dağılınca sindirim, sayım ve makro tutturma sorunları çıkar.
- **Kaynak:** `PT17` (2017-04-08, FatSecret + IIFYM hesaplayıcı), `BLK21` (2021-01-29)
- **Alıntı:** "Ben açıkçası kalori saymıyorum. Kaç kalori tükettiğimi bilmiyorum" (`BLK21`)
- **Kesinlik:** eğilim
- **Boşluk:** B11, B3

---

## B · YAĞ ORANI EŞİKLERİ — BULK'A BAŞLAMA (B6, B2)

### K-7 · %20 tavan — üstü kas yapmak için dezavantajlı
- **Kural:** Yağ oranı %20'yi geçmemeli; geçtiğinde kas kazanımı fizyolojik olarak dezavantajlı hale gelir.
- **Sayı/eşik:** **%20 mutlak tavan**
- **Koşul:** Naturel erkek.
- **Gerekçe:** İnsülin hassasiyeti azalır, yağ dokusu artar, testosteron düşer, östrojen artar. Sağlık için de dezavantaj.
- **Kaynak:** `GRC23` (2023-10-16)
- **Alıntı:** "%20 yağ oranının üstüne çıkmanı önermem ... kas yapmak için çok avantajlı bir durum değil" [ASR: "%120"]
- **Kesinlik:** net kural
- **Boşluk:** **B6**

### K-8 · Çalışma bandı %15–20 · iri görünüm 20 · kuru görünüm 15
- **Kural:** Sağlıklı çalışma bandı %15–20'dir. Daha iri görünmek isteyen üst sınıra, daha kuru görünmek isteyen alt sınıra oturur.
- **Sayı/eşik:** **%15–20 bant · %12 = "bayağı fit" · %10 = sürdürülemez**
- **Koşul:** Naturel, ortalama genetik.
- **Gerekçe:** İri + kuru aynı anda uzun yıllar mümkün değil; birini seçmek zorunlu. %10 civarı yıl boyu enerjik takılınabilecek doğal bir seviye değil.
- **Kaynak:** `GRC23` (2023-10-16)
- **Alıntı:** "%15-20 arası güzel bir yağ oranıdır ... %12'ye kadar çektiğinde bayağı bayağı fitsin" [ASR düzeltmeli]
- **Kesinlik:** net kural
- **Boşluk:** **B6**, B2

### K-9 · Göbek testi: göbeğin görünüyorsa %20'nin üstündesin
- **Kural:** Görünür göbek = yağ oranı %20 üstü demektir.
- **Sayı/eşik:** %20
- **Koşul:** Erkek.
- **Gerekçe:** Cihazsız, pratik eşik testi.
- **Kaynak:** `GRC23` (2023-10-16)
- **Alıntı:** "göbeğin varsa %20'den fazlasındır" [ASR: "%120"]
- **Kesinlik:** net kural
- **Boşluk:** **B2**, **B6**

### K-10 · Yüksek karbonhidrata geçmeden önce yağ oranı düşmeli
- **Kural:** Görünür göbeği olan kişi yüksek karbonhidratlı bulk sistemine geçemez; önce yağ oranı düşürülür.
- **Sayı/eşik:** yok (K-9'daki göbek testi geçerli)
- **Koşul:** Bulk'a girmek isteyen yağlı kişi.
- **Gerekçe:** Yağ dokusu arttıkça yüksek glikozun yağ dokusuna girip depolanma ihtimali artar; düşük yağ oranı = yüksek insülin hassasiyeti.
- **Kaynak:** `YK19` (2019-01-23)
- **Alıntı:** "Görünen bir göbeğiniz varsa yüksek karbonhidratlı diyetler size göre değil"
- **Kesinlik:** net kural
- **Boşluk:** **B6**, B9

### K-11 · Yağ oranı ile güç ilgisiz (tek istisna: aşırı düşük)
- **Kural:** Daha yağlı olmak daha güçlü olmayı sağlamaz. Tek istisna: çok düşük yağ oranında eklem sorunları dolaylı güç düşüşü yaratır.
- **Sayı/eşik:** ~%10 altı [ASR şüpheli: "% 110'un ciddi düşük altındaysan"]
- **Koşul:** Herkes.
- **Gerekçe:** Powerlifterların yağlı olması skorlama sisteminden kaynaklanır, fizyolojiden değil.
- **Kaynak:** `SC17` (2017-02-21) [konuşmacı: Güray — soruyu o cevaplıyor]
- **Alıntı:** "yağ oranının güçle hiçbir alakası yok"
- **Kesinlik:** net kural
- **Boşluk:** B6

---

## C · KALORİ YÖNÜ, HIZ ve FAZ SÜRELERİ (B3, B6, B7)

### K-12 · Naturelde kilo alma hızı: haftada max 0,5 kg
- **Kural:** Kas kazanım döneminde haftada yarım kilodan fazla alınmaz.
- **Sayı/eşik:** **≤0,5 kg/hafta** (ideal 200–300 g/hafta)
- **Koşul:** Naturel; mevcut yağ oranından memnun olan kişi.
- **Gerekçe:** Fazlası yağ olarak gider; naturelin kas sentez hızı bunun üstünü karşılamaz.
- **Kaynak:** `NKY22` (2022-12-24)
- **Alıntı:** "natürelsiniz haftada yarım kilodan fazla asla almayın bunu sınırlandırın"
- **Kesinlik:** net kural
- **Boşluk:** **B6**, B3

### K-13 · Kilo verme hızı: haftada ~1 kg ideal, 0,5 kg taban
- **Kural:** Diyet döneminde haftada ~1 kg mükemmel orandır; 0,5 kg da kabul edilir ama bunun altına inilmez.
- **Sayı/eşik:** **~1 kg/hafta ideal · 0,5 kg/hafta taban**
- **Koşul:** Naturel.
- **Gerekçe:** Daha yavaş kayıp "3 aydır 5 aydır diyetteyim" psikolojisine sokar; bu sürdürülemez.
- **Kaynak:** `NKY22` (2022-12-24)
- **Alıntı:** "Haftada 1 kilo civarı mükemmel bir orandır natureller için ... yarım kilodan çok az vermemek lazım"
- **Kesinlik:** net kural
- **Boşluk:** **B3**

### K-14 · Kalori kararı tartıya değil, antrenman kalitesine ve iyileşmeye bakar
- **Kural:** Kalori yeterli mi sorusunun cevabı tartı değil; iyi antrenman yapabiliyor ve iyileşebiliyorsan kalori yeterlidir.
- **Sayı/eşik:** yok
- **Koşul:** Naturel — özellikle "kilo artmıyor" diye kalori yükseltmek isteyen.
- **Gerekçe:** Sırf tartıda artış görmek için kalori yükseltmek naturelde hüsranla biter; fazla kalori su tutumu, şişkinlik, sindirim stresi ve inflamasyon üretir — bunlar kas gelişimini azaltır.
- **Kaynak:** `NKY22` (2022-12-24)
- **Alıntı:** "sadece tartıda kilo artışını görmek için kalori arttırmak özellikle naturellerde genelde hüsranla sonuçlanır"
- **Kesinlik:** net kural
- **Boşluk:** **B3**, B11

### K-15 · Kalori DÜŞÜRME protokolü — "düş, koru, tekrar çık" döngüsü
- **Kural:** Fazla yiyorsan ve iştahın zorlanıyorsa kaloriyi düşür; antrenman kalitesi bozulmadığı sürece orada kal. O kalori yetersizleşince (pump düşer, tam iyileşemezsin) tekrar yükselt.
- **Sayı/eşik:** Örnek verdiği ölçek: **3000 → 2500 → tekrar 3000.** Deneme süresi **1–2 ay.**
- **Koşul:** Naturel, iştahı zorlanan, kilosu artmayan sporcu.
- **Gerekçe:** Düşük kalorideyken de antrenman kalitesi korunuyorsa gereksiz kalori zaten kas yapmıyordu; eski kaloriye dönene kadar geçen sürede fizik ilerler.
- **Kaynak:** `NKY22` (2022-12-24)
- **Alıntı:** "1-2 ay bu dediğimi deneyin kalori biraz düşürün ... çok fazla yiyorsan düşür o kaloriyi"
- **Kesinlik:** net kural
- **Boşluk:** **B3**

### K-16 · Bulk'ta kalori artışı SADECE karbonhidrattan; durağanlıkta +100 g pirinç
- **Kural:** Bulk'ta protein ve yağ sabit tutulur; kilo durduğunda yalnızca karbonhidrat artırılır.
- **Sayı/eşik:** **Pirinç 400 g → 500 g → 600 g** kademesiyle; artış kilo durağanlığında yapılır.
- **Koşul:** Bulk dönemindeki sporcu.
- **Gerekçe:** Karbonhidrat sporcuda birçok yere gidebilir (kas glikojeni, karaciğer, ısı); yağ ise surplus'ta doğrudan yağ dokuya depolanır.
- **Kaynak:** `BLK21` (2021-01-29)
- **Alıntı:** "400 pirinci 500'e çıkarıyorsunuz ... protein ve yağ sabit kalıyor"
- **Kesinlik:** net kural
- **Boşluk:** **B3** (ters yön), **B6**

### K-17 · İştah limitine gelindiğinde protein 2 → 1,5 g/kg düşürülür
- **Kural:** Karbonhidrat artırılamayacak kadar tok olunduğunda protein azaltılarak iştahta yer açılır ve basit karbonhidrat eklenir.
- **Sayı/eşik:** **Protein 2 g/kg → 1,5 g/kg.** Eklenen: dekstroz, maltodekstrin, kuru üzüm, gainer.
- **Koşul:** Kasları iyi iyileşen, protein eksiği olmayan sporcu.
- **Gerekçe:** Protein doyurucudur; iyileşme sorunsuzsa fazla proteine gerek yok. Kuru üzüm tercih edilir çünkü fruktoz değil glikoz kaynağıdır (sofra şekeri kasta depolanmaz).
- **Kaynak:** `BLK21` (2021-01-29)
- **Alıntı:** "Proteini 1,5'a kadar düşürün. Bu güzel bir düşüş olacak"
- **Kesinlik:** net kural
- **Boşluk:** B6, B9

### K-18 · Diyete geçiş: yeni diyet kurma, cheat meal'leri çıkar
- **Kural:** Bulk'tan diyete geçerken beslenme baştan kurulmaz; sadece cheat meal'ler azaltılır/çıkarılır.
- **Sayı/eşik:** **Haftada 3 cheat → 2 cheat** kademesi.
- **Koşul:** Bulk'ta sabit gramajla beslenmiş sporcu.
- **Gerekçe:** Cheat'lerin çıkması zaten kalori açığı yaratır; profesyonellerin off-sezondan diyete geçişte yaptığı şey budur.
- **Kaynak:** `BLK21` (2021-01-29)
- **Alıntı:** "Diyete geçerken hiçbir şeyi değiştirmeyin. Sadece çiğit meilleri çıkarın" [ASR: cheat meal]
- **Kesinlik:** net kural
- **Boşluk:** **B7**, B3

### K-19 · Sert diyetin tavanı 4–6 hafta
- **Kural:** Çok düşük kalorili + yüksek kardiyolu agresif diyet en fazla 4–6 hafta sürdürülür.
- **Sayı/eşik:** **4–6 hafta.** Bu sürede beklenen: ~6 kg yağ, su ile birlikte 8–10 kg. ~1 kg yağ/hafta.
- **Koşul:** Kısa sürede forma girmek isteyen; hormonal riski kabul eden.
- **Gerekçe:** 6 haftadan kısa süren diyetlerde hormon dengesi "aman aman bozulmaz"; süre uzadıkça metabolik ve hormonal aksaklıklar başlar.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "4 hafta 1200 kalori günde 1-2 saat kardiyo yapmakta ben bir sakınca görmüyorum"
- **Kesinlik:** net kural
- **Boşluk:** **B3**, **B7**

### K-65 · Ciddi diyet süresi: 12 hafta taban, yağ oranına göre 16 haftaya kadar
- **Kural:** Gerçekten kuru bir forma inmek için diyet en az 12 hafta sürer; yağ oranına göre 16 haftaya uzayabilir. 6 hafta yalnızca **zaten düşük yağ oranındaki** kişi için yeterlidir.
- **Sayı/eşik:** **≥12 hafta taban · 16 haftaya kadar · 6 hafta = yalnız zaten yağsızsan**
- **Koşul:** Bulk döneminden gelen / yağ oranı yüksek kişi 6 haftalık plandan hiçbir şey beklemesin.
- **Gerekçe:** Kendi 6 haftalık hazırlığı ancak yağ oranı zaten düşük olduğu için mümkün oldu; o 6 haftada bile sıfır cheat, günde 1–2 saat kardiyo ve son haftalarda sıfıra yakın karbonhidrat vardı.
- **Kaynak:** `IXaN0w7FLyM` (2023-08-28, Yarışma Sürecim)
- **Alıntı:** "en az bir hazırlık 12 hafta sürmeli, yağ oranınıza göre 16 haftaya kadar uzayabilir"
- **Kesinlik:** net kural
- **Boşluk:** **B7**, B3

> **K-19 ile çelişki değil, iki ayrı senaryo.** K-19 (4–6 hafta) = *"kısa sürede fizik değiştirmek"*
> hedefli agresif blok. K-65 (12–16 hafta) = *"gerçekten kuru forma inmek"* hedefli hazırlık.
> Karar motoru hangi senaryoda olduğunu **başlangıç yağ oranından** seçmeli:
> düşük yağ oranı → kısa blok yeter; yüksek yağ oranı → 12–16 hafta zorunlu.

### K-20 · Faz taahhüdü: yağ yakımı ≥8 hafta, kas kazanımı ≥6 ay
- **Kural:** Bir faza girildiğinde süre önceden belirlenir ve içinde hedef değiştirilmez. Yağ yakımı için minimum 8 hafta, kas kazanımı için minimum 6 ay.
- **Sayı/eşik:** **Yağ yakımı ≥8 hafta · kas kazanımı ≥6 ay.** Yasaklı: 2 hafta bulk / 2 hafta diyet salınımı.
- **Koşul:** Herkes; özellikle skinny-fat.
- **Gerekçe:** Vücut kısa dönemlerde adapte olmaz, sadece depolarını harcar; asıl yağ yakımı görüntüsü daha sonra başlar.
- **Kaynak:** `SF23` (2023-09-28)
- **Alıntı:** "ben 8 hafta yağ yakımı yapacağım 8 hafta hedefimi değiştirmiyorum"
- **Kesinlik:** net kural
- **Boşluk:** **B7**, B6

### K-21 · Kas kazanım fazında yağ oranı düşüyorsa surplus'ta değilsin
- **Kural:** Kas kazanım döneminde yağ oranının düşmesi hata sinyalidir — kas kazanımından çalınıyor demektir.
- **Sayı/eşik:** yok
- **Koşul:** Kas kazanım fazındaki sporcu.
- **Gerekçe:** Yağ oranı düşüyorsa kalori fazlasında değilsin; "en kötü ihtimalle yağ oranını sabit tutarak kilo almak" tanımı bu.
- **Kaynak:** `SF23` (2023-09-28)
- **Alıntı:** "yağ oranın düşüyorsa kas kazanımından çalıyorsun demektir"
- **Kesinlik:** net kural
- **Boşluk:** **B6**, B11

### K-22 · Skinny-fat protokolü: ilk 6 ay–1 yıl keskin ayrım YOK
- **Kural:** Hem yağlı hem kassız kişi ilk 6 ay–1 yıl bulk/cut ayrımı yapmaz; kilosunu sabit tutar, temiz beslenir, ağırlık kaldırır, yüksek aktivite yapar.
- **Sayı/eşik:** **6 ay – 1 yıl** recomp; ciddi göbek varsa daha uzun. Toplam dönüşüm "birkaç sene".
- **Koşul:** Yağ oranı yüksek + kas kütlesi düşük kişi.
- **Gerekçe:** Keskin ayrım yapılırsa metabolizma yavaş olduğu için 1500 kalorilere inmek gerekir; hayat konforsuzlaşır ve kas koymak imkânsızlaşır.
- **Kaynak:** `SF23` (2023-09-28)
- **Alıntı:** "70 kilosun 70 kilo kal, 80 kilosun 80 kilo kal ve 6 ay sonra göreceksin ki aynı kiloda çok daha iyi"
- **Kesinlik:** net kural
- **Boşluk:** **B6**, **B12**

### K-23 · Dirty bulk: +1000 kcal üstü surplus ekstra kas getirmez
- **Kural:** Günlük ihtiyacın 1000 kalori üstündeki surplus çok az ekstra kas, çok fazla yağ getirir; dirty bulk önerilmez.
- **Sayı/eşik:** **+1000 kcal = getirisiz eşik** (örnek: 2000 ihtiyaç → 4000 alım).
- **Koşul:** Herkes.
- **Gerekçe:** Sınırsız kaloride ölçülen ekstra kas kazanımı çok küçük; yanında gelen yağ dokusu artışı ve sonraki diyetin uzunluğu kas kaybettirir. Ayrıca dirty bulk'ta kilo düşük görünür (kaslar dolu/patlak durmaz).
- **Kaynak:** `DB23` (2023-11-08)
- **Alıntı:** "günlük 1000 kalorinin üstünde bir Surplus yaptığınızda ekstra koyacağınız kas çok az olacak"
- **Kesinlik:** net kural
- **Boşluk:** **B6**

### K-24 · Kirli kalori tavanı: %10–20
- **Kural:** Toplam kalorinin en fazla %10–20'si kirli/işlenmiş besinden gelebilir; kalanı temiz kaynaklardan.
- **Sayı/eşik:** **%80 temiz / %20 esnek** (bir yerde "%10, hadi %20 diyelim" der)
- **Koşul:** Herkes; sürdürülebilirlik için.
- **Gerekçe:** 365 gün tavuk-pilav-brokoli sürdürülebilir değil; ama IIFYM "çöp yeme diyeti" değildir.
- **Kaynak:** `STR23` (2023-01-20), `DB23` (2023-11-08)
- **Alıntı:** "kalorilerin yüzde sekseni ... o 5 maddeyi sağlayan gıdalardan aldıktan sonra kalan %20'sini" (`STR23`)
- **Kesinlik:** net kural
- **Boşluk:** B7, B8

---

## D · PLATO, DURAĞANLIK ve DELOAD (B4)

> ### ⛔ BU KUTU GEÇERSİZ — 2026-09-10'da `G7-whisper-arsiv.md` ile düzeltildi
> **Eski iddia:** *"«DELOAD» kelimesi bu 25 transkriptin hiçbirinde geçmiyor … Karar motoruna
> «deload haftası» diye bir blok konmamalı — hocanın sisteminde böyle bir şey yok."*
>
> **Yanlıştı.** Sebep kaynak eksikliğiydi: bu bölümün yazıldığı sırada altyazısız olduğu için
> ulaşılamayan `YZdARtovIfI` (Soru-Cevap Part 4) whisper ile açıldı ve **deload doğrudan
> soruluyor, karar kriteriyle cevaplanıyor.** Ayrıca `mhFCuEgTL2g` (Hipertrofi Rehberi, 2020)
> terim listesinde *"ara ara da overtrain olur, **deload verir**, dinlenme verir"* diyor.
>
> **Ayakta kalan kısım:** hocanın deload'u **takvimsel bir hafif hafta değil** (G7 K-66), ve
> ileri vakada uyguladığı şey hafif hafta değil **1 hafta tam mola** (G7 K-70).
>
> ➡ Doğru içerik: **`G7-whisper-arsiv.md` · K-66 … K-78.** Aşağıdaki K-25…K-30 geçerliliğini
> koruyor ama artık B4'ün tamamı değil; özellikle **K-25 (6 göstergeli teşhis listesi) yerine
> G7 K-73'ün operasyonel tanımı** ("planına uyamıyorsan overtraining olmuşsundur") kullanılmalı.

### K-25 · Fazla çalışma teşhis listesi (6 gösterge)
- **Kural:** Şu göstergelerden birkaçı varsa sorun az çalışmak değil, fazla çalışmaktır: (1) pump alamamak, (2) antrenmana yorgun başlamak, (3) kronikleşen kas ağrısı, (4) tekniğin bozulmaya başlaması, (5) **kilo veya tekrar ekleyememek**, (6) antrenman sonrası soyunma odasında dolu/patlak görünmemek.
- **Sayı/eşik:** yok — gösterge listesi
- **Koşul:** Gelişimi durmuş sporcu.
- **Gerekçe:** Sistemik yorgunluk hipertrofi sinyalini bastırır; pump doğrudan bir toparlanma göstergesidir.
- **Kaynak:** `FZL24` (2024-01-16)
- **Alıntı:** "kilo ya da tekrar ekleyemiyorsan ... yüksek ihtimalle çok fazla volüm yapıyorsunuz"
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-26 · Aşırı volüm tedavisi: volümü YARIYA indir
- **Kural:** Fazla çalışma göstergeleri varsa haftalık volüm yarıya indirilir.
- **Sayı/eşik:** **30 set → 15 · 20 set → 10-15**
- **Koşul:** K-25'teki göstergeleri taşıyan kişi.
- **Gerekçe:** Az set + yüksek yoğunluk, çok set + düşük yoğunluktan verimlidir. "Fitness maratoncusu" olmak tip-2 lifleri tip-1'e çevirir.
- **Kaynak:** `FZL24` (2024-01-16)
- **Alıntı:** "30 set mi yapıyorsun 15 yap ... bu sorunların mı var 10 set yap"
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-27 · Kilo takıldıysa: ağırlıkları %30–40 düşür, kasa odaklan
- **Kural:** Kilo artıramama halinde çözüm daha çok zorlanmak değil; ağırlıkları %30–40 düşürüp yalnız hedef kasa odaklanarak çalışmaktır.
- **Sayı/eşik:** **%30–40 kilo düşüşü, ~1 hafta**
- **Koşul:** Formu bozarak kilo çıkarmaya çalışan orta/ileri seviye.
- **Gerekçe:** Kiloyu artırmak için form bozmak (cheat rep, yardım, hızlı bırakma) kastan çalar ve sinir sistemi yorgunluğu ekler; asıl amaç kasa stres vermek.
- **Kaynak:** `AGR23` (2023-04-22)
- **Alıntı:** "kilolarınızı düşürün ... bir %30 %40 kadar geri çekin ve sadece çalıştırmak istediğiniz kasa odaklanarak yapın"
- **Kesinlik:** net kural
- **Boşluk:** **B4**, **B5**

### K-28 · İyileşemeyen ileri seviye: serbest ağırlık → makine
- **Kural:** Program doğru uygulandığı hâlde iyileşilemiyorsa serbest ağırlıkların bir kısmı makineye çevrilir.
- **Sayı/eşik:** Örnekler: squat → leg press · dumbbell press → makine press · Romanian deadlift haftada 1 yerine **2 haftada 1**
- **Koşul:** Ağır kilolara ulaşmış ileri seviye (kendi örneği: 150 kg civarı setler).
- **Gerekçe:** Serbest ağırlık her zaman daha verimlidir ama sistemik yorgunluk yaratır; makine hedef kası çalıştırırken bineni azaltır.
- **Kaynak:** `GH22` (2022-04-08)
- **Alıntı:** "serbest her zaman ... daha verimlidir. Bakın tolere edebiliyorsanız"
- **Kesinlik:** net kural
- **Boşluk:** **B4**, B10

### K-29 · Tartı 2–3 hafta durursa: kortizol suyu — protokol devam + bol su
- **Kural:** Diyette 2–3 hafta tartı durursa yağ yakımı durmamıştır; bu su tutumudur. Yapılacak şey diyeti değiştirmek değil, bol su içmek ve devam etmektir.
- **Sayı/eşik:** **2–3 hafta durağanlık = normal**
- **Koşul:** Kalori açığı, kardiyo ve sert antrenman gerçekten uygulanıyorsa.
- **Gerekçe:** Yüksek kortizol su tutumu yapar; yağ hücresi yağını bıraktığında geçici olarak su ile dolar. Vücut adapte olunca su atılır.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "gökten size bir kalori gelmiyor ... yakıyorsunuz, tartıya çok takılmayın"
- **Kesinlik:** net kural
- **Boşluk:** **B4**, B3, B11

### K-30 · Diyette güç düşüşü normaldir, kas kaybı değildir
- **Kural:** Düşük kalorili dönemde güç düşüşü beklenen bir şeydir ve kas kaybı anlamına gelmez. Tersi de doğrudur: kilo düşerken kilolar artıyorsa kas kazanılıyordur.
- **Sayı/eşik:** yok
- **Koşul:** Diyet dönemi.
- **Gerekçe:** Araştırmalardaki "yağsız doku kaybı" su, glikojen ve minerali de içerir; 2-3 günde geri gelir, gerçek aminoasit yıkımı değildir.
- **Kaynak:** `HYZ22` (2022-06-01), `NKY22` (2022-12-24)
- **Alıntı:** "diyet döneminde kilo veriyorken kaldırdığınız kilolar artıyorsa %100 kas koyuyorsun" (`NKY22`)
- **Kesinlik:** net kural
- **Boşluk:** **B4**, B11

---

## E · AĞIRLIK ARTIRMA KURALI (B5)

### K-31 · Kilo eklemenin tek ön koşulu: mevcut kiloda form KUSURSUZ ve rahat
- **Kural:** Bara kilo, ancak mevcut kilo her zamanki formda rahat kalkıyorsa eklenir. O hafta teknik mükemmel değilse ertesi hafta kilo eklenmez.
- **Sayı/eşik:** yok — kapı koşulu
- **Koşul:** Her seviye; yeni başlayanda mutlak.
- **Gerekçe:** Kiloyu form bozarak çıkarmak kastaki stresi azaltır, sakatlık riskini ve sinir sistemi yorgunluğunu artırır.
- **Kaynak:** `HT23` (2023-05-05), `AGR23` (2023-04-22)
- **Alıntı:** "O hafta tekniğin mükemmel değildi, ertesi hafta o bara kesinlikle kilo eklemiyorsun" (`HT23`)
- **Kesinlik:** net kural
- **Boşluk:** **B5**

### K-32 · Progresif overload tanımı: kilo VEYA tekrar VEYA hareket açıklığı
- **Kural:** İlerleme üç yoldan biriyle sağlanır: kiloyu artır, tekrarı artır, ya da hareket açıklığını derinleştir.
- **Sayı/eşik:** yok
- **Koşul:** Herkes.
- **Gerekçe:** Kasa verilen stresin ("mechanical tension") sürekli artması gerekir; tek yolu kilo değil.
- **Kaynak:** `YB22` (2022-10-27)
- **Alıntı:** "ya kiloyu ya tekrarı ya yaptığınız açıyı derinleştirebilirsiniz"
- **Kesinlik:** net kural
- **Boşluk:** **B5**

### K-33 · İzole hareketlerde kilo takibi YAPILMAZ
- **Kural:** Lateral raise, arka omuz, triceps gibi izole hareketlerde kilo/tekrar takibi ve progresif overload aranmaz; hissiyata göre çalışılır.
- **Sayı/eşik:** Kendi örneği: **lateral raise 12,5–15 kg, 10 yıldır aynı.**
- **Koşul:** İzole / tek eklemli hareketler.
- **Gerekçe:** Orada bir tekrar fazla yapmak için form bozulur, kas zorlanması gereken noktadan çalınır, tendon zorlanır.
- **Kaynak:** `AGR23` (2023-04-22), `PRG22` (2022-01-02)
- **Alıntı:** "izole hareketlerde ben asla kilo takibi istemem"
- **Kesinlik:** net kural
- **Boşluk:** **B5**

### K-34 · Progresif overload ikincil önceliktir, sonsuz değildir
- **Kural:** Bodybuilding'de asıl amaç kasa iyi stres verip iyileşmesini beklemektir; kilo artırmak buna hizmet ettiği sürece iyidir.
- **Sayı/eşik:** yok
- **Koşul:** Belirli bir güç seviyesine gelmiş sporcu.
- **Gerekçe:** Sonsuz progresif overload mümkün olsaydı herkes dünya rekortmeni olurdu; yıllardır aynı kiloları kaldıran sporcular hâlâ gelişiyor.
- **Kaynak:** `AGR23` (2023-04-22)
- **Alıntı:** "salona kaslarını tükenişe götürmek için git" — kilo artırmak için değil
- **Kesinlik:** net kural
- **Boşluk:** **B5**

### K-35 · Egzersiz sabitliği: bileşikte değiştirme, izolede serbest
- **Kural:** Tekniği oturmuş bileşik hareketler değiştirilmez; izole hareketler o günkü hissiyata göre değiştirilebilir.
- **Sayı/eşik:** yok
- **Koşul:** Orta seviye ve üstü (2-3 yıl+); yeni başlayan hiçbir şeyi değiştirmez.
- **Gerekçe:** "Kası şaşırtmak" diye bir şey yok; sürekli egzersiz değiştirmek adaptasyonu bozar ve kilo/tekrar takibini imkânsızlaştırır.
- **Kaynak:** `PRG22` (2022-01-02), `YB22` (2022-10-27)
- **Alıntı:** "kası şaşırtmak diye bir şey maalesef yok" (`YB22`)
- **Kesinlik:** net kural
- **Boşluk:** **B5**, B10

---

## F · SET, TEKRAR, SIKLIK ve SPLIT (B10)

### K-36 · Haftada 4–5 antrenman ideal · 3 taban · 6–7 önerilmez
- **Kural:** Zamanı olan için haftada 5 antrenman ideal (4–5 bandı); zamanı olmayan ve yeni başlayan için 3 gün yeterli; 6–7 gün önerilmez.
- **Sayı/eşik:** **4–5 ideal · 3 minimum · 6-7 hayır**
- **Koşul:** Orta yoğunlukta (RIR 1-2) çalışan bodybuilding sporcusu.
- **Gerekçe:** "Haftada 7 antrenman yapabiliyorsanız sistemi anlamamışsınızdır" — yeterince zorlanmıyorsunuz demektir.
- **Kaynak:** `SIS21` (2021-07-05)
- **Alıntı:** "bence beş antrenman ideal 4 ve 5 ... 6 antrenman 7 önermiyorum"
- **Kesinlik:** net kural
- **Boşluk:** **B10**

### K-37 · Kas başına haftada 2 kez · asla haftada 1
- **Kural:** Her kas grubu haftada en az 2 kez çalıştırılır; olmuyorsa 4 günde bir. Haftada bir kez kesinlikle az.
- **Sayı/eşik:** **2×/hafta ideal · en az 5 günde bir · 7 günde bir yasak**
- **Koşul:** Küçük kaslarda mutlak (biceps, triceps, yan omuz). Bacak gibi büyük bölgelerde haftada 1 tolere edilebilir.
- **Gerekçe:** Protein sentezi 24 saatte tepe yapar, 48 saatte iner, **72 saatte bazale döner**; 7 gün beklemek sinyalsiz geçen 4 gün demektir.
- **Kaynak:** `SIS21` (2021-07-05), `YB22` (2022-10-27), `FZL24` (2024-01-16)
- **Alıntı:** "bir biseps tricepsi haftada bir çalışmak, bir yan omzu haftada bir çalışmak hiçbir şekilde akıl kârı değil" (`FZL24`)
- **Kesinlik:** net kural
- **Boşluk:** **B10**

### K-38 · Haftalık set: 15–20 · başlangıç 10–12
- **Kural:** Kas grubu başına haftalık çalışma seti (ısınma hariç) 15–20 arasıdır. Yeni başlayan 10–12 ile başlar, tolere ettikçe ekler.
- **Sayı/eşik:** **Bileşik ağırlıklı bölge 15 · izole ağırlıklı bölge (omuz vb.) 20 · zor gelişen bölge 20'ye kadar · kolay gelişen bölge 15-18 · başlangıç 10-12**
- **Koşul:** RIR 1-2 ile yapılan setler için.
- **Gerekçe:** Araştırmalar 6-8 seti yeterli gösteriyor; izole hareketler sistemik yorgunluk yaratmadığı için kural esnetilebilir. 20 üstü verimsiz.
- **Kaynak:** `SIS21` (2021-07-05), `FZL24` (2024-01-16)
- **Alıntı:** "1820 civarında haftalık bir kas için set yaptığınızda sizin için yeterli olmalı" (`FZL24`) [ASR: 18-20]
- **Kesinlik:** net kural
- **Boşluk:** **B10**

### K-39 · Antrenman başına kas grubu: 6–10 set, en fazla 3 egzersiz
- **Kural:** Tek antrenmanda bir kas grubu için 6–10 çalışma seti ve en fazla 3 egzersiz yapılır.
- **Sayı/eşik:** **6–10 set/seans · max 3 egzersiz.** Kendi göğüs örneği: 10 set + 8 set = 18/hafta.
- **Koşul:** Haftada 2 kez çalıştırma planında.
- **Gerekçe:** 3-4. hareketten sonra pump kaybolur, kastaki hissiyat gider; o noktadan sonra hipertrofi katkısı sıfır, sistemik yorgunluk katkısı pozitif.
- **Kaynak:** `SIS21` (2021-07-05), `FZL24` (2024-01-16), `TIoQ_2x6wGY` (2016 — aynı sayı: "bir kas grubu için 6-8 set")
- **Alıntı:** "kas grubu başına bir iki ya da maksimum 3 egzersiz seçebilirsiniz" (`SIS21`)
- **Kesinlik:** net kural
- **Boşluk:** **B10**

### K-40 · RIR 1–2 · 2'den fazla kalan set geçersiz · son set tükeniş
- **Kural:** Her çalışma seti rezervde 1–2 tekrar kalacak şekilde yapılır. Rezervde 2'den fazla kalıyorsa o set çalışma seti sayılmaz. Son set tükenişe gider.
- **Sayı/eşik:** **RIR 1–2 · RIR >2 = geçersiz · RIR >5 = hipertrofi sıfır**
- **Koşul:** Tüm çalışma setleri. Yardımlı tekrar, drop set, süper set sistemde yok (izolede ara sıra drop set istisna).
- **Gerekçe:** RIR 1 ile tükeniş arasındaki hipertrofi farkı yok, ama tükeniş çok daha fazla yoruyor; RIR 3-4 "mantıklı düşünerek" verilen bir karardır, gerçek yoğunluk sağlamaz.
- **Kaynak:** `GH22` (2022-04-08), `SIS21` (2021-07-05), `YB22` (2022-10-27)
- **Alıntı:** "iki tekrardan fazlası kalıyorsa bu benim için efektif bir set değildir" (`GH22`)
- **Kesinlik:** net kural
- **Boşluk:** **B10**, B5

### K-41 · Tekrar aralığı matrisi
- **Kural:** Bileşik / uzun hareket mesafeli egzersizler 6–10 tekrar; izole / kısa hareket mesafeli egzersizler 10–15 tekrar. 5 altı hiç kullanılmaz. 20 üstü sadece sakatlık dönüşünde.
- **Sayı/eşik:** **<5: asla · 6–10: bileşik (squat, bench, row) · 10–15: izole (lateral raise, triceps, kalf) · 15–20: kaçınılır · 20+: yalnız sakatlık dönüşü**
- **Koşul:** Lateral raise ve triceps'te asla 10 tekrarın altına inilmez; squat'ta 15 tekrar yapılmaz.
- **Gerekçe:** 5 altı eklem yükü + volüm açığı; 20 üstünde sporcu tükenişe gidip gitmediğini bilemez, yardımcı kaslar önce yorulur, teknik bozulur.
- **Kaynak:** `TKR24` (2024-01-26)
- **Alıntı:** "lateral raise yaparken asla 10 tekrarın altına düşmem ... triceps yaparken asla"
- **Kesinlik:** net kural
- **Boşluk:** **B10**, B5

### K-42 · Split iskeleti: itiş / çekiş / bacak, 3 gün peş peşe, 4. gün off
- **Kural:** Üç gün peş peşe itiş-çekiş-bacak, dördüncü gün mutlaka off. Haftada 3 günü olan kişi push/pull yapar, 3 gün peş peşe sorun değil.
- **Sayı/eşik:** **3 gün çalış + 1 gün off** döngüsü; her kas 4 günde bir.
- **Koşul:** 4-5 günlük plan.
- **Gerekçe:** Ard arda gelen antrenmanlar birbirinin verimini düşürür; dördüncü gün tekrar itiş yapabiliyorsan yeterince kaliteli 3 antrenman yapmışsındır.
- **Kaynak:** `SIS21` (2021-07-05), `SC17` (2017-02-21)
- **Alıntı:** "üç gün peş peşe dördüncü gün mutlaka of verilmeli" (`SIS21`)
- **Kesinlik:** net kural
- **Boşluk:** **B10**

---

## G · KARBONHİDRAT, MAKRO TAVANLARI ve PERFORMANS (B9)

### K-43 · Yüksek karbonhidrat tanımı: >4 g/kg — ön koşulları var
- **Kural:** Kilo başına 4 gramın üstü "yüksek karbonhidrat"tır ve yalnız şu koşullar sağlanınca uygulanır: haftada 5-6 antrenman + yüksek volüm + düşük yağ oranı + gün içi aktif iş.
- **Sayı/eşik:** **>4 g/kg = yüksek.** Bulk başlangıcı 3–4 g/kg.
- **Koşul:** Haftada 3 gün çalışan veya güç ağırlıklı çalışan kişi için UYGUN DEĞİL — gereksiz yağlanma ve insülin direnci yapar.
- **Gerekçe:** Haftada 5-6 gün yüksek volüm çalışan kişide glikojen depoları asla %100'de olmaz ve insülin direnci oluşmaz.
- **Kaynak:** `YK19` (2019-01-23)
- **Alıntı:** "kilo başına 4 gramdan fazla karbonhidrat alıyorsanız bu yüksek"
- **Kesinlik:** net kural
- **Boşluk:** **B9**

### K-44 · Yağ tavanı 1 g/kg · naturelde taban 50 g
- **Kural:** Yağ kilo başına 1 gramı geçmez. Naturelde günlük 50 gramın altına inilmez (60 g'a kadar çıkabilir).
- **Sayı/eşik:** **Tavan 1 g/kg · taban 50 g/gün (natural).** Cheat meal'lerle haftalık ortalama 1 g/kg tutulur.
- **Koşul:** Bulk. Diyette bu taban geçerli değil (K-45).
- **Gerekçe:** Surplus'ta yağ, karbonhidratın aksine insülin gerektirmeden doğrudan yağ dokuya girip depolanır.
- **Kaynak:** `BLK21` (2021-01-29), `YK19` (2019-01-23), `NKY22` (2022-12-24)
- **Alıntı:** "kilo başına 1 gramı yağ olarak geçmemek ... naturellerde 50 gramın altına düşürmesini tavsiye etmiyorum"
- **Kesinlik:** net kural
- **Boşluk:** B9, B6

### K-45 · Diyette makrolar: yağ ~sıfır, karbonhidrat <100 g, protein 2,5–3 g/kg
- **Kural:** Kısa sert diyette yağ neredeyse sıfıra, karbonhidrat 100 gramın altına indirilir; protein kilo başına 2,5–3 grama çıkarılır ve **yalnız hayvansal** sayılır.
- **Sayı/eşik:** **Yağ 10–30 g/gün · karbonhidrat <100 g, son haftalar ~50 g veya sıfıra yakın · protein 2,5–3 g/kg · toplam ~1200 kcal**
- **Koşul:** Yalnızca 4-6 haftalık kısa diyet (K-19). Uzun diyette geçerli değil.
- **Gerekçe:** 6 haftayı geçmeyen diyette hormon dengesi bozulmaz; yağ depolanması kolay ve antrenmanda ana kaynak değil. Diyette bitkisel protein sayılmaz (amino asit profili tek başına yetersiz).
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "günde 20-30 gram yağ belki on gram ... kilo başına iki buçuk üç gram protein"
- **Kesinlik:** net kural
- **Boşluk:** **B3**, **B9**

### K-46 · Diyette karbonhidrat SADECE antrenman öncesi öğünde
- **Kural:** Yağ yakım döneminde karbonhidratın tamamı antrenman öncesi öğüne konur; antrenman sonrası ve gün içi karbonhidrata ihtiyaç yoktur.
- **Sayı/eşik:** yok
- **Koşul:** Kısa sert diyet.
- **Gerekçe:** Ana yakıt kaynağı yağ rezervleri olacak; karbonhidrat sadece antrenmanı çıkarabilecek düzeyde tutulur.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "karbonhidratı da tavsiyem antrenman öncesi öğününde alın"
- **Kesinlik:** net kural
- **Boşluk:** **B9**

### K-47 · Karbonhidrat kaynağı: orta-yüksek GI, pirinç sabit; kepekli/siyah pirinç önerilmez
- **Kural:** Karbonhidrat sabit ve tek kaynaktan alınır (baldo/basmati pirinç); kepekli pirinç, siyah pirinç ve çok düşük GI kaynaklar önerilmez.
- **Sayı/eşik:** Alternatifler: düz makarna, yulaf (en düşük GI olarak kabul ettiği), kuru üzüm, dekstroz/maltodekstrin.
- **Koşul:** Haftada 5-6 gün çalışan sporcu (insülin direnci riski yok).
- **Gerekçe:** Pirinç sayması ve sindirmesi kolay, hazır ürünlerin etiket hatası yok. Düşük GI kaynaklar yüksek karbonhidratta sindirimi zorlaştırır.
- **Kaynak:** `BLK21` (2021-01-29), `YK19` (2019-01-23)
- **Alıntı:** "Pirinç fiks arkadaşlar. Baldo pirinç ... Siyah pirinç önermem. Kepekli pirinç önermem"
- **Kesinlik:** net kural
- **Boşluk:** **B9**

### K-48 · Pump kaybı = glikojen sinyali (karbonhidrat/kalori eksik)
- **Kural:** Aynı kalori seviyesinde pump alınamıyor ama karbonhidrat artırılınca pump geri geliyorsa glikojen depoları yeterince dolmuyor demektir.
- **Sayı/eşik:** yok — sinyal
- **Koşul:** Yüksek volümde, haftada 5-6 gün çalışan sporcu.
- **Gerekçe:** Yağlar glikojen deposunu doldurmakta çok verimsiz; dinlenme sonrası inanılmaz pump gelmesinin sebebi de glikojenin tam dolmasıdır.
- **Kaynak:** `YK19` (2019-01-23)
- **Alıntı:** "karbonhidratı arttırıp yağı düşürünce pump almaya tekrar başlarsanız ... glikojen depolarını dolduramıyorsunuz"
- **Kesinlik:** net kural
- **Boşluk:** **B9**, B4

### K-49 · Besin değiştirmenin 5 kriteri
- **Kural:** Bir besin diyette başka bir besinle değiştirilebilir; şu 5 kriter eşleşiyorsa: (1) kalori, (2) makro, (3) mikro (vitamin/mineral), (4) sindirim hızı, (5) besin kalitesi.
- **Sayı/eşik:** 5 kriter
- **Koşul:** Herkes. "Mucize besin" iddiaları (tatlı patates, somon, kuşkonmaz, avokado) reddediliyor.
- **Gerekçe:** Kalori açığı sağlandıktan sonra kalorinin hangi besinden geldiği ilk etapta önemli değil; sevmediğin besini zorla yemek diyetin sürdürülebilirliğini zayıflatır.
- **Kaynak:** `STR23` (2023-01-20)
- **Alıntı:** "bu 5 maddeyi sağladıktan sonra diyetinde istediğin şekilde bunları değiştirebilirsin"
- **Kesinlik:** net kural
- **Boşluk:** B7, B8

### K-50 · "İyi gıda / kötü gıda" yok — amaca uygunluk var
- **Kural:** Bir besin iyi ya da kötü değildir; senin o anki hedefine hizmet edip etmediğine bakılır.
- **Sayı/eşik:** yok
- **Koşul:** Herkes.
- **Gerekçe:** Kilo almaya çalışan kişi için her öğünde kocaman salata/karnabahar iştahı kestiği için kötüdür; kilo vermeye çalışan için avuç avuç kuruyemiş kalorisi yüzünden kötüdür — ikisi de "sağlıklı" besinler.
- **Kaynak:** `STR23` (2023-01-20)
- **Alıntı:** "iyi bir gıda ... şu an senin için kötü bir gıda, amacına uygun değil"
- **Kesinlik:** net kural
- **Boşluk:** B7, B8

---

## H · LİF, SİNDİRİM, BAĞIRSAK (B8)

> **UYARI:** "Lif" veya "günlük lif hedefi" kavramı bu 25 transkriptte de hiç geçmiyor.
> Hoca konuyu **lif** üzerinden değil, **sebze hacmi + su + antioksidan/asit-baz dengesi**
> üzerinden kuruyor. Aşağıdaki üç kural B8'i kısmen dolduruyor; gram cinsinden lif hedefi hâlâ yok.

### K-51 · Yüksek proteinli beslenmede bol su + normalden fazla yeşil sebze
- **Kural:** Yüksek protein tüketen kişi normal bir insandan daha fazla sebze (özellikle yeşil) yemeli ve bol su içmelidir.
- **Sayı/eşik:** Miktar verilmiyor — "normal bir insanın tükettiğinden daha fazla". Protein zemini: en az 2 g/kg.
- **Koşul:** Kilo başına 2 g+ protein tüketen herkes.
- **Gerekçe:** Protein sindirimi bağırsakta asidik ortam ve metabolit üretir; böbrek/karaciğer yükü artar. Sebzenin tamponlayıcı içeriği bunu nötrler.
- **Kaynak:** `SBZ19` (2019-04-01)
- **Alıntı:** "yüksek miktarda sebze tüketmeniz lazım ki bu asidik ortamı biraz tamponlayıcı içeriğiyle nötrleme"
- **Kesinlik:** net kural
- **Boşluk:** **B8**

### K-52 · Sebze zamanlaması: antrenman öncesi yasak, tek öğünde topla
- **Kural:** Sebze antrenman öncesi öğünde yenmez; günlük sebze gece tek öğünde toplanır.
- **Sayı/eşik:** yok
- **Koşul:** Yüksek kalorili (4000-5000 kcal) bulk dönemi.
- **Gerekçe:** Sebze sindirimi ciddi anlamda yavaşlatır ve iştahı keser; yüksek kaloride sebzeye yer kalmaz.
- **Kaynak:** `SBZ19` (2019-04-01)
- **Alıntı:** "antrenman öncesi yemiyordum, antrenman sonrası yiyince o öğünün sindirimini yavaşlatıyor"
- **Kesinlik:** net kural
- **Boşluk:** **B8**

### K-53 · Açıklanamayan sivilce/halsizlik/iştahsızlık → önce diyete bak
- **Kural:** Sebebi bulunamayan sivilce, kronik yorgunluk ve iştahsızlık şikâyetleri çoğunlukla diyetle ilgilidir (yetersiz sebze/antioksidan, yetersiz su).
- **Sayı/eşik:** yok
- **Koşul:** Yüksek protein + yüksek kalori tüketen sporcu.
- **Gerekçe:** Kronik asidik ortam ve düşük antioksidan alımı.
- **Kaynak:** `SBZ19` (2019-04-01)
- **Alıntı:** "çok sivilce çıkıyor neden çıkıyor çözemiyorum ya da sürekli halsizim ... genelde diyetinize bağlıdır"
- **Kesinlik:** eğilim
- **Boşluk:** **B8**

### K-54 · Kramp protokolü: önce tuz, sonra magnezyum, sonra potasyum
- **Kural:** Düşük kalorili diyette kramp olduğunda sırasıyla tuz, magnezyum, potasyum artırılır.
- **Sayı/eşik:** Sıra: **1) tuz → 2) magnezyum → 3) potasyum.** Kalsiyum önerilmiyor.
- **Koşul:** Düşük kalorili / düşük karbonhidratlı diyet.
- **Gerekçe:** Az besin alındığında besinlerin içinden gelen sodyum düşer; karbonhidrat kısılınca pirinç/patatesten gelen potasyum kesilir. Potasyum normale gelmeden magnezyum normale gelmez.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "kramp yaşadığınızda öncelikle tuz tüketiminizi arttırmakta fayda var"
- **Kesinlik:** net kural
- **Boşluk:** B8 (elektrolit tarafı)

---

## I · YENİ BAŞLAYAN PROTOKOLÜ (B12)

### K-55 · Yeni başlayan programa müdahale etmez
- **Kural:** Yeni başlayan verilen programı hissetmese bile uygular; hareket, tekrar aralığı veya set değiştirmez.
- **Sayı/eşik:** Müdahale hakkı **orta seviyeden** itibaren (çaylak kazancını almış, gelişimi yavaşlamış kişi).
- **Koşul:** Salona yeni girmiş kişi.
- **Gerekçe:** Kas kütlesi azken zihin-kas bağlantısı zaten kurulamaz; "hissetmiyorum" bir sebep değil.
- **Kaynak:** `TKR24` (2024-01-26), `PRG22` (2022-01-02)
- **Alıntı:** "hissetmesin bile onu yapacaksın ... programına müdahale etme" (`TKR24`)
- **Kesinlik:** net kural
- **Boşluk:** **B12**

### K-56 · Yeni başlayan: serbest ağırlık + full ROM + tükenişe gitmesi bile gerekmez
- **Kural:** Yeni başlayanın önceliği mükemmel teknik ve full hareket açıklığıdır; serbest ağırlığa odaklanır, makine ve açı çeşitliliğine girmez. Tükenişe gitmesi bile şart değil, tükenişe yaklaşması yeterlidir.
- **Sayı/eşik:** Egzersiz sayısı az; tek bir tutuş varyantı yeterli ("geniş tutuş / dar tutuş yeni başlayan seviyesinde hiçbir farkı yok").
- **Koşul:** Başlangıç seviyesi.
- **Gerekçe:** Full ROM bilimsel olarak daha etkili; yarım tekrar hem takibi imkânsızlaştırır hem sakatlık riskini artırır. Aşırı ROM (squat'ta paralel altı zorlama) da gereksiz.
- **Kaynak:** `YB22` (2022-10-27), `HT23` (2023-05-05)
- **Alıntı:** "yeni başlayan birinin tükenişe gitmesine bile gerek yok ... tükenişe yaklaşması yeterli" (`HT23`)
- **Kesinlik:** net kural
- **Boşluk:** **B12**

### K-57 · Yeni başlayan: yavaş başla, haftada 2–3 gün, katı diyet yok
- **Kural:** İlk dönemde antrenman dozu düşük tutulur (haftada 2-3 gün), katı diyet uygulanmaz, seanslar uzun tutulmaz.
- **Sayı/eşik:** **Haftada 2-3 gün.** Yeni başlayan için haftada 6-7 gün kesinlikle hayır (K-36).
- **Koşul:** Salona yeni başlamış / defalarca bırakmış kişi.
- **Gerekçe:** Aşırı hevesle başlamak macerayı 1-2 haftada bitirir; asıl mesele devamlılık. Antrenman dışındaki 23 saati düzenlemek (uyku, alkol, öğün düzeni) daha belirleyici.
- **Kaynak:** `BG16` (2016-09-18)
- **Alıntı:** "yavaş yavaş başlayın vücudunuzu spora alıştırın haftada 2-3 gün gitseniz bile"
- **Kesinlik:** net kural
- **Boşluk:** **B12**

### K-58 · Yeni başlayanda program seçimi önemsiz — süreklilik önemli
- **Kural:** Yeni başlayan için "en iyi program" arayışı gereksizdir; ne yapılırsa sonuç alınır. Tek kriter süreklilik ve bileşik hareketler.
- **Sayı/eşik:** yok
- **Koşul:** İlk dönem (çaylak kazancı).
- **Gerekçe:** İlk yıl her zaman en fazla kas alınan yıldır; 2., 3., 4. yıl giderek azalır.
- **Kaynak:** `BG16` (2016-09-18), `GRC23` (2023-10-16)
- **Alıntı:** "en iyi programı vereceğim ancak buna ihtiyacınız yok ... ne yaparsanız yapın sonuç alacaksınız" (`BG16`)
- **Kesinlik:** net kural
- **Boşluk:** **B12**

---

## J · KADIN (B13 — ileride lazım)

### K-59 · Aynı yağ oranında kadının karın kasları daha erken çıkar
- **Kural:** Kadın ve erkek benzer yağ oranına geldiğinde kadının karın kasları daha erken görünür hale gelir.
- **Sayı/eşik:** yok
- **Koşul:** —
- **Gerekçe:** Kadınlarda yağ depolanması kalça ve bacakta yoğunlaşır; erkeklerde karın bölgesinde ve oblik hattında yoğunlaşır.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "bir kadınla erkek yağ oranını benzer seviyeye getirdiğinde muhtemelen kadının karın kasları çok daha erken çıkacaktır"
- **Kesinlik:** eğilim
- **Boşluk:** **B13**

### K-60 · Bölgesel yağ yakımı yok — kadın sorusuna verilen cevap
- **Kural:** Bir bölgeyi yüksek tekrarla çalıştırmak orada yağ yakmaz. "Kalça çalışayım da kalçam incelsin" mantığı geçersiz.
- **Sayı/eşik:** yok
- **Koşul:** Herkes; soruyu kadın bağlamında örneklendiriyor.
- **Gerekçe:** Kalori yakılacak yer kardiyo ve diyet; ağırlık antrenmanı kas geliştirmek içindir.
- **Kaynak:** `YB22` (2022-10-27)
- **Alıntı:** "kadınlar için işte kalça yapayım kalça mı incelsin, bu tarz şeyler olmadığı araştırmalarla gösterilmiş"
- **Kesinlik:** net kural
- **Boşluk:** **B13**

> **B13 için başka veri yok.** 25 transkriptte kadına özel makro, kalori, adet döngüsü,
> antrenman veya yağ oranı bandı **hiç geçmiyor.** Tüm sayılar erkek varsayımıyla veriliyor.

---

## K · YAN BULGULAR (boşluk listesinde yoktu ama karar motorunu etkiler)

### K-61 · Ağırlık antrenmanı kalori yakma aracı değildir
- **Kural:** Ağırlık antrenmanı diyet döneminde de hipertrofi için yapılır; kalori yakmak için değil.
- **Sayı/eşik:** Bir ağırlık antrenmanında yakılan: **~200–350 kcal** [ASR şüpheli: "75 300 350 aralığında"]
- **Kaynak:** `YB22` (2022-10-27)
- **Alıntı:** "10 dakika hızlı koşarak o kalorinin fazlasını yakabilirsiniz"
- **Kesinlik:** net kural
- **Boşluk:** B3 (kardiyo/antrenman iş bölümü)

### K-62 · Kısa diyette kardiyo protokolü
- **Kural:** Günde en az 1 saat, gerekirse 1,5 saate kadar LISS kardiyo; sabah aç karna tercih edilir. HIIT bu dönemde yapılmaz.
- **Sayı/eşik:** **min 60 dk/gün · max 90 dk (destek ürünüyle 120) · eğimli yürüyüş, max hız ~5 km/h · nabız hedefi YOK ("130-140'a gerek yok")**
- **Koşul:** 4-6 haftalık sert diyet.
- **Gerekçe:** Konuşma testi: yanınızdakiyle rahat konuşamayacak, nefes nefese kalacak kadar. HIIT glikojen kullanır, o zaten az.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "günde en az 1 saat kardiyo olmalı ... it kardiyoyu bu süreçte çok önermem" [ASR: HIIT]
- **Kesinlik:** net kural
- **Boşluk:** B3

### K-63 · İç yağ (visseral) önce yakılır — ilk haftalarda görüntü değişmeyebilir
- **Kural:** Diyetin başında dış görünüş değişmeyebilir çünkü önce organ arası (visseral) yağ yakılır.
- **Sayı/eşik:** yok
- **Gerekçe:** İç bölgede kan dolaşımı çok daha hızlı, yağlar daha kolay dolaşıma verilir. Deri altı yağ daha yavaş cevap verir; "soğuk bölgeler" en geç giden yerlerdir.
- **Kaynak:** `HYZ22` (2022-06-01)
- **Alıntı:** "ilk önce visseral vücudun içindeki bu sağlıksız yağı yakıyor olabilirsiniz, dış görünüşünüz çok fark etmeyebilir"
- **Kesinlik:** eğilim
- **Boşluk:** **B1** (bel çevresinin sağlık anlamı), B2

### K-64 · İnsülin hassasiyetini artırmanın iki yolu
- **Kural:** İnsülin hassasiyeti yalnız iki şeyle artar: ağırlık kaldırmak ve yağ oranını düşürmek.
- **Sayı/eşik:** yok
- **Koşul:** Özellikle skinny-fat / insülin direnci şüphesi olan kişi.
- **Gerekçe:** Metabolizmayı "terbiye etme" süreci uzun; çok kademeli kalori ekleyerek 2000 kcal'de yağ yakamayan kişi bir sene sonra daha yüksek kalorilerde kilo verir hale gelebilir.
- **Kaynak:** `SF23` (2023-09-28)
- **Alıntı:** "bunun en önemli iki yolu ağırlık kaldırmak ve yağ oranı düşürmektir"
- **Kesinlik:** net kural
- **Boşluk:** B6

---

# SON · BOŞLUK DURUM TABLOSU

| Kod | Boşluk | Durum | Dolduran kurallar | Kalan eksik |
| --- | --- | --- | --- | --- |
| **B1** | Bel çevresi / bel ölçüsü | 🟡 **KISMEN** | K-1, K-2, K-63 · **G7: K-106, K-112** | **Sayısal eşik yok** ve G7'nin 12 videosunda da yok — bu kaynak eksikliği değil, hocanın pozisyonu. G7 K-112 cm yerine *sıralama* veriyor: ön kol → kol → karın üstü → karın altı |
| **B2** | Yağ oranı nasıl ölçülür | 🟢 **DOLDU** | K-3, K-4, K-9, K-8 · **G7: K-105, K-131** | Cihaz reddediliyor; yerine göbek testi + deri kıvrımı + açlık kan şekeri ≤90 |
| **B3** | Kalori düşürme protokolü | 🟢 **DOLDU** | K-13, K-14, K-15, K-19, K-45, K-62 · **G7: K-97, K-98, K-100, K-113, K-114, K-137, K-138, K-139** | ✅ **G7 K-98 kapattı:** ölçüt hafta değil, antrenmanın çıkıp çıkmaması |
| **B4** | Plato ve deload | 🟢 **DOLDU** | K-26 … K-30 · **G7: K-66 … K-78, K-144** | ⛔ Bu dosyanın "deload yok" sonucu **yanlıştı** (D bölümündeki kutuya bak). G7 ile doldu: karar kriteri (K-66/67/68), operasyonel tanım (K-73), 1 hafta tam mola (K-70). **K-25 emekliye ayrıldı** → yerine G7 K-73 |
| **B5** | Ağırlık artırma kuralı | 🟢 **DOLDU** | K-31, K-32, K-33, K-34, K-35, K-27 · **G7: K-94, K-145** | — |
| **B6** | Bulk'a başlama eşiği | 🟢 **DOLDU** | K-7, K-8, K-9, K-10, K-12, K-21, K-22, K-23 · **G7: K-101, K-102, K-105, K-106, K-107** | **%20 tavan, %15-20 bant** — aradığın rakam bu |
| **B7** | Diyet bitiş kriteri / sonrası | 🟡 **KISMEN** | K-18, K-19, K-20, K-24, **K-65** · **G7: K-102, K-103, K-104, K-108, K-116, K-119** | Süre kriterleri net (bkz. G7 Ç-2 şiddet→süre eşlemesi). **Kalan eksik: tam "reverse diet" protokolü hâlâ yok** — ama G7 K-103 (1 haftalık diet break), K-116 (form koruma), K-119 (bozulunca toparlama) boşluğu daralttı |
| **B8** | Lif, sindirim, bağırsak | 🟡 **KISMEN** | K-51, K-52, K-53, K-54 · **G7: K-130, K-131, K-132, K-133, K-134, K-136, K-137** | **Gram cinsinden lif hedefi yok** — ve G7 K-132 lifi *azaltılacak* değişken olarak kullanıyor; bu bir eksiklik değil, hocanın modeli. ✅ **Probiyotik/prebiyotik eksiği G7 K-134 ile kapandı** |
| **B9** | Karbonhidrat ve performans | 🟢 **DOLDU** | K-43, K-44, K-45, K-46, K-47, K-48, K-16 · **G7: K-117 … K-129** | — |
| **B10** | Haftada kaç gün / split | 🟢 **DOLDU** | K-36, K-37, K-38, K-39, K-40, K-41, K-42 · **G7: K-79 … K-96, K-140, K-143** | — |
| **B11** | Ölçüm ve takip | 🟢 **DOLDU** | K-1, K-2, K-5, K-6, K-4, K-14 · **G7: K-109, K-110, K-111, K-115, K-121** | Fotoğraf **sıklığı** hâlâ belirtilmiyor — ama G7 K-115 fotoğrafın **yanlı** olduğunu söylüyor (hoca kötü halinde çekmiyor), K-109 diyette forma bakmayı yasaklıyor. Fotoğraf tek ölçüt yapılmamalı |
| **B12** | Yeni başlayan protokolü | 🟢 **DOLDU** | K-55, K-56, K-57, K-58, K-22 · **G7: K-82, K-93, K-107** | — |
| **B13** | Kadın | 🔴 **BOŞ** | K-59, K-60 (yalnız 2 dolaylı ifade) | Kadına özel makro/kalori/yağ oranı/adet döngüsü **hiç yok**. G7'deki 12 videoda da tek satır yok. **Bu boşluk Güray'dan doldurulamaz** |

## Hâlâ boş kalanlar ve nereden doldurulur

1. **Bel çevresi sayısal eşiği (B1)** — Güray hiçbir videoda cm vermiyor. Bu bir kaynak eksikliği değil,
   hocanın pozisyonu: mutlak eşik yerine kişinin kendi trendi. Karar motoruna eşik koyacaksan
   **hocadan değil, dış kaynaktan** (ör. WHO/IDF bel çevresi eşikleri) almak zorundasın ve bunu
   ayrı etiketlemelisin.
2. ~~**Deload protokolü (B4)** — `YZdARtovIfI` altyazısız. **whisper ile çıkarılmalı.**~~
   ✅ **YAPILDI (2026-09-10).** 12 video whisper ile açıldı → `G7-whisper-arsiv.md`, K-66 … K-78.
3. **Diyet sonrası / reverse diet (B7)** — bu 33 videoda yok. Aday: `ruaID7b5t_0` ("The diet continues"),
   `2Fg5zOAAsD0` ("10 Things I Learned from My 1000-Calorie Diet") — ikisi de zaten analiz edilmiş listede;
   G2'de bu açıdan tekrar taranmalı.
4. ~~**Lif gram hedefi (B8)** — kanalda yok. Aday: `N6V03JePvJE` — altyazısız.~~
   ✅ **`N6V03JePvJE` açıldı.** Lif gram hedefi gerçekten yok; hoca lifi *azaltılacak* değişken olarak
   kullanıyor (G7 K-132). Buna karşılık **probiyotik/prebiyotik** bulundu (G7 K-134).
5. **Kadın (B13)** — kanalda kaynak yok. Bu boşluk Güray'dan doldurulamaz.
