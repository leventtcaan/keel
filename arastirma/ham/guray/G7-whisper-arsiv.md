# G7 — Whisper Arşivi: Altyazısız 12 Videonun Ses Transkripsiyonu
**Kaynak:** Güray Aydın YouTube kanalı, YouTube otomatik altyazısı HİÇ olmayan 12 video
**Çıkarım tarihi:** 2026-09-10
**Amaç:** G6'nın kapatamadığı boşlukları — özellikle **B4 (deload)** — sesi indirip yerel ASR ile açmak.
**Devam:** G6'daki K-1 … K-65'in üstüne, **K-66'dan** itibaren.

---

## 0 · YÖNTEM

| | |
| --- | --- |
| Hedeflenen video | 12 (G6'da "altyazısız" diye üç turda doğrulanan liste) |
| **İnen ses** | **12 / 12** |
| Toplam ses | ~234 dakika |
| Transkripsiyon | `mlx-whisper` · `whisper-large-v3-turbo` · `--language tr` |
| Toplam çıktı | ~23.500 kelime |
| **Yeni kural** | **K-66 … K-146 (81 kural)** |

### Boru hattı (tekrarlanabilir olması için)
```
1. yt-dlp -x --audio-format mp3 -o "%(upload_date)s_%(id)s.%(ext)s" <url>     # SIRALI, 10 sn aralık
2. mlx_whisper <dosya>.mp3 --model mlx-community/whisper-large-v3-turbo \
     --language tr --output-format txt \
     --condition-on-previous-text False --compression-ratio-threshold 2.0 \
     --initial-prompt "<alan sözlüğü>"
3. awk ile ard arda tekrar eden satırları tekile indir
```
Çıktılar: `_transkript/eski/<tarih>_<id>.whisper.txt`

### ⚠ Yol boyunca çıkan 3 tuzak — not düşülmeli

**1 · yt-dlp sürümü, "altyazı yok" sanılan şeyin bir kısmını açıklıyor olabilir.**
Elde bulunan `yt-dlp 2026.07.04` **12 videonun 12'sinde de** `HTTP Error 403: Forbidden` verdi
(`android_vr` player client'ı format URL'i alamıyor). `2026.08.19` ile **12'si de sorunsuz indi.**
G6'nın "istekler arası ≥7 sn bırak" kuralı hâlâ geçerli ve uygulandı — ama bu partide tek bir
429 / bot uyarısı görülmedi. **Ders: 403 bot koruması değil, sürüm eskimesidir; önce yt-dlp'yi güncelle.**

**2 · Whisper varsayılan ayarlarında halüsinasyon döngüsüne giriyor.**
İlk turda `YZdARtovIfI` çıktısında tek bir cümle (`"Sen salonda ne çalarsın galiba."`) **~80 kez**
arka arkaya tekrarlandı ve o aralıktaki **gerçek içeriği yedi**. Sebep: `condition_on_previous_text=True`.
`--condition-on-previous-text False` + `--compression-ratio-threshold 2.0` ile yeniden çalıştırıldığında
üretilen 12 dosyanın **hiçbirinde tek bir tekrar eden satır kalmadı**. Kelime sayısı da düştü
(3004 → 2413), yani ilk çıktının farkı saf şişkinlikti.
**Ders: bu ayar olmadan alınan transkripte güvenme; en çok tekrarlanan satırı sayarak kontrol et.**

**3 · Çalışan bir shell script'inin üstüne yazma.**
Kuyruk script'i çalışırken `wh.sh` düzeltilip aynı isme kaydedildi; zsh dosyayı eski byte
offset'inden okumaya devam edip eski ve yeni sürümü karıştırdı — 3 dosya yanlış ayarlarla üretildi.
**Ders: çalışan script'i düzeltmeyeceksin; yeni isimle yaz, eskisini öldür.**

### ⚠ Bu partinin kaynak karakteri — G6'dan farklı
G6'nın 20 kaynağının tamamı solo videoydu. Burada **4 video çok konuşmacılı** (`SC4-17` Güray +
Beytullah + Fırat; `PO1-19`, `PO2-19` Instagram/Proteinocean soru-cevap; `G15-18` vlog).
`SC4-17`'de cevabı kimin verdiği çoğu yerde bağlamdan çıkmıyor → **`[konuşmacı belirsiz]`** işaretlendi.

### ⚠ Bu partide gözlenen ASR bozulmaları
`dilot · delot · deloat · deloz · Delo's · D-Log · deli otu` → **deload** ·
`arpi` → **RPE** · `yavru · yavra · yavran · yağ aranı` → **yağ oranı** ·
`balt · balk · balık · bank · balking` → **bulk** · `definasyon` → **definisyon** ·
`pamp · pampa` → **pump** · `kampant · kampan · kampans` → **compound (bileşik)** ·
`glüb 4 · Glutot` → **GLUT4** · `AST aleti` → **ALT** · `Limbademez` → **lean body mass** ·
`Heartbanner` → **hard gainer** · `glikonez` → **glukoneogenez** · `aminoist` → **aminoasit** ·
`mini kat` → **mini cut** · `zentimgan · zentrum gam` → **ksantan gam** · `bal do pirinç` → **baldo pirinç** ·
`Felger` → **failure** · `Resil Reserve · ayağı` → **RIR (Reps In Reserve)** ·
`fatik` → **fatigue** · `lise mikindeksli` → **glisemik indeksli** · `depleysin` → **depletion**

### ⚠ Kapsam dışı bırakılan içerik
`HYK17`, `PO1-19`, `PO2-19` ve `G15-18`'in **kayda değer bir bölümü doping/ilaç** (steroid, peptit,
SARM, tiroid hormonu, PCT, dozlar) üzerine. Bunlar **karar motoruna alınmadı** — natürel sporcu için
geçersiz ve zaten Levent'in kapsamı dışında. Yalnız hocanın *natürele ne dediği* (K-108, K-119)
alındı. Kaynakta bu içeriğin **var olduğu** buraya not düşülüyor ki ileride tekrar taranmasın.

---

## 1 · KAYNAK 12 VİDEO

| # | Kod | Dosya (`_transkript/eski/`) | Tarih | Başlık | Hedef |
| --- | --- | --- | --- | --- | --- |
| 1 | `SC4-17` | `20170218_YZdARtovIfI.whisper.txt` | 2017-02-18 | Soru-Cevap Part 4 — 5x5, PL/BB, **Deload** | **B4** |
| 2 | `BD17` | `20171017_FV56znnFgF0.whisper.txt` | 2017-10-17 | Bulk mı, Definisyon mu Yapmalıyım? | B6 |
| 3 | `HYK17` | `20171127_2uZLxGnBmLo.whisper.txt` | 2017-11-27 | En Hızlı Yağ Yakma Sırları | B3 |
| 4 | `KRB18` | `20180404_zE-zRpBJh7c.whisper.txt` | 2018-04-04 | Karbonhidratlar — GI, İnsülin, Basit Karb | B9 |
| 5 | `KET18` | `20180418_boqyZ2UO1M0.whisper.txt` | 2018-04-18 | Ketojenik ve Düşük Karb Diyetler Neden Berbat | B9 |
| 6 | `G15-18` | `20180617_MAIv3wK1Mck.whisper.txt` | 2018-06-17 | 15 Günde Yağları Yak — 0. Gün | B3/B9 |
| 7 | `IST18` | `20181112_N6V03JePvJE.whisper.txt` | 2018-11-12 | Kilo Alma, İştahsızlık, Hızlı Metabolizma | B8 |
| 8 | `H3G19` | `20190208_lpPwk-3lS60.whisper.txt` | 2019-02-08 | Haftada 3 Gün — Overreaching vs Overtraining | B4/B10 |
| 9 | `PO1-19` | `20190404_yQOgRMb-7p4.whisper.txt` | 2019-04-04 | Push Pull Leg, Ödem, İnsülin — Soru-Cevap | B10 |
| 10 | `2AY19` | `20190708_5vGYz_o6w7A.whisper.txt` | 2019-07-08 | 2 Aylık Değişim — Yağ Yakarken Kas Kaybetmeyin | B11 |
| 11 | `PO2-19` | `20190731_NPg9eJxx6ws.whisper.txt` | 2019-07-31 | Bulkta Kardiyo, Tiroit, Overtraining — Soru-Cevap | B4/B9 |
| 12 | `HPT20` | `20200212_mhFCuEgTL2g.whisper.txt` | 2020-02-12 | **Hipertrofi Antrenman Rehberi** | **B10** |

---

# 🔴 EN ÖNEMLİ BULGU — G6'NIN BİR SONUCU YANLIŞ

G6, D bölümünün başına şunu yazmıştı:

> *"«DELOAD» KELİMESİ BU 25 TRANSKRİPTİN HİÇBİRİNDE GEÇMİYOR … Karar motoruna «deload haftası»
> diye bir blok konmamalı — hocanın sisteminde böyle bir şey yok."*

**Bu sonuç düzeltilmeli.** Deload hocanın sisteminde **var**, adı da konmuş durumda:

- `SC4-17` (2017) — dinleyici doğrudan "deload yapmalı mıyız, ne sıklıkla, nasıl anlarız" diye soruyor
  ve **karar kriteriyle** cevaplanıyor (K-66, K-67, K-68).
- `HPT20` (2020) — tahtaya yazdığı terim listesini sayarken: *"ara ara da overtrain olur, **deload verir**,
  dinlenme verir. **Deload yazmayı unutmuşum buraya.**"* (K-73)
- `PO2-19` (2019) — *"D-Log [deload] dediğimiz şeyi yapamıyorsunuz. Yani psikolojiniz izin vermiyor."* (K-71)

G6'nın hatası kaynak eksikliğiydi, hocanın pozisyonu değil. **Ne var ki G6'nın pratik çıkarımı
kısmen ayakta kalıyor:** hocanın deload'u *takvimsel bir hafif hafta* değil (K-66), ve ileri
vakada uyguladığı şey hafif hafta değil **tam mola** (K-70).

---

# KURALLAR

## A · DELOAD, OVERTRAINING ve TOPARLANMA (B4) — bu dosyanın ana katkısı

### K-66 · Deload takvime değil vücuda bakar — "taktik yok"
- **Kural:** Deload haftası programda yazdığı için yapılmaz. Program deload diyor ama iyi gidiyorsan **yapma, devam et**; program demiyor ama tıkandıysan **öne çek**. Tek ölçüt yorgunluk.
- **Sayı/eşik:** yok — takvim reddediliyor. (Program örneğinde "5. hafta" geçiyor, onaylanmıyor.)
- **Koşul:** Programlı çalışan herkes.
- **Gerekçe:** Toparlanma kişiye, kaloriye, o haftaki yüke göre değişir; sabit bir tarih bunu bilemez.
- **Kaynak:** `SC4-17` (2017-02-18) `[konuşmacı belirsiz]`
- **Alıntı:** "Taktik yok. Yorulduğunda dinlen, yorulmadığında devam."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-67 · Deload sinyali: artışın gelecek hafta çıkmayacağının anlaşılması
- **Kural:** Deload zamanı, ağırlık **artık çıkmadığında** değil, *"önümüzdeki hafta artırmam gerekecek ama bu gidişle çıkmayacak"* diye görüldüğünde gelir. İkinci gösterge: aynı işte zorlanmanın (RPE) belirgin yükselmesi.
- **Sayı/eşik:** yok — ileriye dönük tahmin + RPE yükselişi
- **Koşul:** Progresif overload takibi yapan sporcu.
- **Gerekçe:** Tam durma noktasına gelmeden müdahale edilirse hafta kaybedilmez.
- **Kaynak:** `SC4-17` (2017-02-18) `[konuşmacı belirsiz]`
- **Alıntı:** "İyice zorlandık, iyice [RPE] yükseldi … Burada bir dinlenmelisin." `[ASR şüpheli: "arpi"]`
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-68 · Durağanlık merdiveni: önce artışı bırak, sonra deload, tam çöküşte sistemi ara
- **Kural:** Üç kademe. (1) Artmıyor ve iyileşemiyorsan → **o hafta kilo eklemeyi bırak**, aynı kiloda kal. (2) Bu da yetmiyorsa → deload. (3) **Geçen haftaki kiloları bile kaldıramıyorsan** → bu artık yorgunluk değil; beslenme/uyku/diğer faktörleri **tek tek** gözden geçir.
- **Sayı/eşik:** yok — 3 kademeli merdiven
- **Koşul:** Gelişimi durmuş sporcu.
- **Gerekçe:** Kısmi durgunlukla topyekûn güç kaybı farklı şeylerin işareti; ikincisi sistemik bir sorunu gösterir.
- **Kaynak:** `SC4-17` (2017-02-18) `[konuşmacı belirsiz]`
- **Alıntı:** "Geçen haftaki kilolar bile çıkmıyorsa … ya da beslenmende başka bir şeyde sıkıntı var"
- **Kesinlik:** eğilim — **3. kademenin ifadesi ASR'de kararsız.** 4 bağımsız geçişin 3'ü *"deload zamanı **gelmemiştir**"*, 1'i *"**gelmiştir**"* verdi. `[ASR şüpheli]`. **"gelmemiştir"** okunursa kural yukarıdaki gibidir (çöküş = sistemik sorun, deload değil); **"gelmiştir"** okunursa kural düz bir tırmanış olur (çöküş = deload vakti). Bağlamdaki *"ya da beslenmende sıkıntı var / hepsini tek tek gözden geçir"* devamı **"gelmemiştir"** okumasını destekliyor. **Uydurulmadı, iki okuma da bırakıldı.**
- **Boşluk:** **B4**

### K-69 · 3 ay durağanlık tek başına deload göstergesidir
- **Kural:** Aynı kiloda 3 ay takılan ve *"ağırlığı azaltıp yüksek tekrar denedim, değişmedi"* diyen kişi zaten yorgundur — çünkü hafif kiloyla da tükenişe gidilmişse yorgunluk sürmüştür. Bu bir deload göstergesidir.
- **Sayı/eşik:** **3 ay** aynı kilo
- **Koşul:** Diyette olmayan sporcu (diyetteyse durgunluk normal sayılıyor).
- **Gerekçe:** Kiloyu düşürüp tükenişe gitmek yükü azaltmaz; kişi "program değiştirdim" sanırken yorgunluğu taşımaya devam eder.
- **Kaynak:** `SC4-17` (2017-02-18) `[konuşmacı belirsiz]`
- **Alıntı:** "Biraz deload yapabilirsin. Bak bu bir deload göstergesi aslında."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-70 · İleri overtraining'in tedavisi hafif hafta değil, 1 HAFTA TAM MOLA
- **Kural:** Overtraining'den emin olunduğunda çözüm hafif çalışmak değil, **bir hafta salona hiç gitmemektir.** Hafif hafta psikolojik olarak tutmaz: bir gün hafif çalışırsın, ertesi gün kendini iyi hissedip yine canını okursun.
- **Sayı/eşik:** **1 hafta, tamamen salon dışı**
- **Koşul:** Sert çalışmaya alışmış, overtraining'den emin sporcu.
- **Gerekçe:** Overtraining'e girenler zaten sert çalışmaya alışmış kişilerdir; irade değil, ortamdan uzaklaşma çözer.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "Bir hafta tamamen salondan uzaklaş … uzak kalma kısmı çok zor."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-71 · Deload'un asıl engeli teknik değil psikolojik
- **Kural:** Deload'un başarısız olmasının sebebi programın yanlışlığı değil, sporcunun hafif çalışmaya dayanamamasıdır. Bu bilinerek planlanmalı.
- **Sayı/eşik:** yok
- **Koşul:** Sert çalışmaya alışmış sporcu.
- **Gerekçe:** "Hafif çalışacağım" diyerek gidilen gün ertesi güne taşmıyor; toparlanma hissi hemen eski yüke dönmeyi tetikliyor.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "Deload dediğimiz şeyi yapamıyorsunuz. Yani psikolojiniz izin vermiyor." `[ASR: "D-Log"]`
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-72 · Moladan dönüşte yavaş başla
- **Kural:** Molanın ardından tazelenen güçle tam yüke dönülmez; yavaş yavaş girilir. Aksi halde bir haftada tazelik tüketilir ve döngü baştan başlar.
- **Sayı/eşik:** yok
- **Koşul:** Mola sonrası dönüş.
- **Gerekçe:** Hocanın kendi tekrarlayan hatası olarak anlatılıyor.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "O tazelenen gücü bir haftada tekrar tüketiyorsun ve tekrar canın çıkıyor."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-73 · Overtraining'in operasyonel tanımı: PLANINA UYAMIYORSAN
- **Kural:** Overtraining karmaşık bir sendrom değil, tek cümlelik bir testtir: **planladığın antrenmanı planladığın gün planladığın gibi yapamıyorsan** overtraining'sin. Pazartesi göğüs çalışıp perşembe tekrar çalışacaksan ve perşembe istediğin gibi çıkmıyorsa, pazartesi abartmışsındır.
- **Sayı/eşik:** yok — ikili test (plan tuttu / tutmadı)
- **Koşul:** Haftada 2 frekanslı program yürüten herkes.
- **Gerekçe:** Semptom listesi öznel; plana uyum ölçülebilir ve haftalık geri besleme verir.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Planına uyamıyorsan overtraining olmuşsundur."
- **Kesinlik:** net kural — **K-25'in (6 göstergeli teşhis listesi) yerine geçecek kadar keskin**
- **Boşluk:** **B4**

### K-74 · Ters test: plan hep mükemmel gidiyorsa yeterince uyarmıyorsun
- **Kural:** Planına kusursuz uyuyor, hiç zorlanmıyorsan sorun yokluğu değil **yetersiz uyarı** vardır. İyi sporcu overtraining'in **hemen alt sınırında** gezer; ara ara sınırı aşar, deload/dinlenme verir.
- **Sayı/eşik:** yok — hedef bant: overtrain sınırının hemen altı
- **Koşul:** İleri/orta seviye, gelişimi optimize etmek isteyen sporcu.
- **Gerekçe:** Gelişim uyarı ile yıpranma arasındaki dar bantta olur; konforlu bölge o bandın altındadır.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Bir sporcu overtrainin hemen alt sınırında ne kadar gezerse o kadar iyi gelişim sağlar."
- **Kesinlik:** net kural
- **Boşluk:** **B4** — **karar motorunun "her şey yolunda" durumunu da sorgulaması gerektiğini söyleyen tek kural**

### K-75 · Overreaching: planlı aşırı yükleme, planlı molanın hemen öncesinde
- **Kural:** Önceden bilinen bir molanın (tatil, nöbet, yoğun hafta) **hemen öncesindeki** antrenmanda normalde tavsiye edilmeyen parametrelerin üstüne çıkılır: aşırı volüm, aşırı yoğunluk, neredeyse tüm setler tükenişe. Bu planlı bir overtraining'dir ve sadece uzun dinlenme garantiliyken yapılır.
- **Sayı/eşik:** yok — "normalde yapmayacağın" üstü
- **Koşul:** **Ardından uzun bir dinlenme geleceği kesin** olmalı. Sürekli uygulanamaz.
- **Gerekçe:** Uzun boşluk zaten toparlanmayı sağlayacağı için o bir antrenmandan alınabilecek uyarı maksimize edilir.
- **Kaynak:** `H3G19` (2019-02-08) · `HPT20` (2020-02-12)
- **Alıntı:** "Bir hafta ara vereceksiniz spora … o zaman bir önceki hafta canınızı okuyabilirsiniz."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-76 · Pump yoksa antrenmanı YAPMA
- **Kural:** Beslenmen ve suyun yerindeyken antrenmanda pump alamıyorsan o antrenmanı yapma; ciddi şekilde yapma. %99,9 ihtimalle kas iyileşmemiştir (ya da glikojen dolmamıştır).
- **Sayı/eşik:** yok — ikili karar (pump var/yok)
- **Koşul:** **Ön koşul: beslenme ve su yeterli.** Değilse pump yokluğu iyileşmeyi değil beslenmeyi gösterir.
- **Gerekçe:** Pump amaç değil ama iyileşmenin en hızlı geri bildirimi; iyileşmemiş kasa uyarı vermek yıpranmadan başka bir şey getirmez.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Eğer bir antrenmanda pump olamadıysanız … yapmayın. O antrenmanı yapmayın."
- **Kesinlik:** net kural — **K-48'i (pump = glikojen sinyali) eyleme çeviriyor**
- **Boşluk:** **B4**

### K-77 · Erken uyarı: küçük eklem ve stabilizatörlerin yorgunluk sinyali
- **Kural:** Ana kaslar hâlâ iyi giderken **bilek fleksör/ekstansörleri ve omuz rotator kafı** gibi küçük yapılar yorgunluk sinyali vermeye başlıyorsa bu erken bir overtraining işaretidir; sürerse sakatlığa döner.
- **Sayı/eşik:** Hocanın kendi vakasında **5 hafta** kesintisiz ağır çalışma sonrası
- **Koşul:** Uzun süreli ağır (düşük tekrar / yüksek yük) blok.
- **Gerekçe:** Küçük stabilizatörler büyük kaslardan önce doyuma ulaşır ve ilk çatlayan halka olur.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "Ufak ufak yorgunluk sinyali vermeye başladı. Yani bir overtraining durumu."
- **Kesinlik:** net kural
- **Boşluk:** **B4**

### K-78 · Mini diyet, deload yerine geçebilir
- **Kural:** Ağır bir bloğun sonunda hem yorgunluk hem yükselmiş yağ oranı varsa, kısa ve sert bir mini diyet **iki işi birden** görür: antrenman yükü zorunlu olarak düşer (dinlenme) ve yağ oranı geri iner.
- **Sayı/eşik:** Hocanın vakasında **15 gün**; genel mini cut için 4–6 hafta (bkz. K-102)
- **Koşul:** 4–6 hafta ağır çalışılmış + yağ oranı yükselmiş olmalı.
- **Gerekçe:** Diyet dönemi zaten volümü ve yükü sınırlar; ayrı bir "deload haftası" ayırmaya gerek kalmaz.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "Hem biraz dinlenme olacak benim için hem de yükselen yağ oranımı düşürmüş olacağım."
- **Kesinlik:** net kural
- **Boşluk:** **B4** / B6

---

## B · SIKLIK, VOLÜM, SET ve TÜKENİŞ (B10)

### K-79 · Antrenman günü: 4–5 ideal · 5'ten fazlasını tolere edebiliyorsan yeterince sert çalışmıyorsun
- **Kural:** Haftada 3 gün kazancın çoğunu (">%50", bilimin dediği %90'a katılmıyor) verir. Optimum **4–5 gün**. 6–7 gün yapıp hiç sorun yaşamıyorsan o antrenmanlar yeterince sıkı değildir.
- **Sayı/eşik:** taban **3** · ideal **4–5** · tavan: **5'ten fazlası tolere edilememeli**
- **Koşul:** Hipertrofi amaçlı, natürel/ilaçlı fark etmez (prensipler değişmiyor deniyor).
- **Gerekçe:** Gün sayısı değil, gün başına verilen uyarının derinliği belirleyici.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "5 günden fazla antrenmanı tolere edememeniz lazım."
- **Kesinlik:** net kural — **K-36'yı (4-5 ideal, 3 taban) bağımsız kaynakla doğruluyor ve gerekçelendiriyor**
- **Boşluk:** B10

### K-80 · Haftada 1 kez çalışmak neden yetersiz: uyarı 2 gün sürüyor
- **Kural:** Natürelde bir antrenmanın protein sentezi uyarısı **~2 gün**. 7 gün bir kası dinlendirmek "korkunç uzun". Haftada 1 çalışan kişi hiç plan yapmadan iyileşir — çünkü zaten fazlasıyla dinlenmiştir; kaybettiği şey kaçırdığı uyarılardır.
- **Sayı/eşik:** protein sentezi **2 gün** (natürel) · dinlenme **7 gün = çok fazla** · hedef **haftada 2**, eksik bölgede **3**
- **Koşul:** Hipertrofi amacı.
- **Gerekçe:** Uyarıdan sonraki ağrı ve yıpranma gelişime katkı vermiyor, sadece bir sonraki antrenmanı geciktiriyor.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "7 gün bir kasa uyarı vermek için çok çok fazla."
- **Kesinlik:** net kural — **K-37'nin (haftada 2, asla 1) mekanizması**
- **Boşluk:** B10

### K-81 · Kas başına en geç 4 günde 1
- **Kural:** Klasik hedef haftada 2. **En kötü ihtimalle 4 günde bir** aynı kasa dönülmeli. Bunun altına düşülmez.
- **Sayı/eşik:** **maksimum 4 gün** ara
- **Koşul:** Split çalışan sporcu.
- **Gerekçe:** Yeni antrenman için gereken üç şey — protein sentezinin bitmesi (≤48 sa), **metabolik atıkların temizlenmesi** ve **glikojen depolarının tam dolması** — 4 günde tamamlanır.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "En kötü ihtimalle 4 günde bir diğer kası çalıştırmanız iyi olacaktır."
- **Kesinlik:** net kural — **K-37'ye sayısal tavan ekliyor**
- **Boşluk:** B10

### K-82 · Frekans, seviyeyle ters orantılıdır
- **Kural:** Seviyen ve kas kütlen ne kadar düşükse frekansı o kadar yüksek tutabilirsin. 50 kg'lık bir sporcu bir bölgeyi iki günde bir, hatta iyi planlarsa ertesi gün bile çalışabilir. 120–140 kg bir vücutçunun kullandığı yükler sinir sistemine ve eklemlere o kadar biner ki onda haftada 1 mantıklı olabilir.
- **Sayı/eşik:** düşük seviye → **2 günde 1'e kadar** · 120–140 kg ileri → haftada 1 makul
- **Koşul:** Ölçüt kilo/kütle ve kullanılan mutlak yük.
- **Gerekçe:** Yıpranmayı yaratan mutlak yüktür, set sayısı değil.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Seviyeniz ne kadar düşükse … o kadar yüksek bir frekansla çalışabilirsiniz."
- **Kesinlik:** net kural
- **Boşluk:** B10 — **yeni başlayan için frekans tavanını açan kural (B12 ile bağlantılı)**

### K-83 · ÇALIŞMA SETİ ≠ SET — 15–20 rakamı çalışma seti sayısıdır
- **Kural:** Haftalık 15–20 set hedefi **çalışma seti** (working set) sayısıdır; ısınma setleri buna dahil değildir. 4 set bench yapılacaksa öncesinde **en az 3 set ısınma** yapılır. Kağıtta yazan her set, seni bitirmesi gereken bir settir.
- **Sayı/eşik:** çalışma seti **min 10 · optimum 15–20 · max 20** · ısınma: 4 çalışma seti için **≥3 set**
- **Koşul:** Haftalık, kas grubu başına.
- **Gerekçe:** "İlk sette yorulmayayım da devamı çıksın" mantığıyla yapılan 12-10-8 piramidinde ilk setler çalışma seti değildir; kişi 4 set yaptığını sanır, aslında 1–2 yapmıştır.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Ben kağıda 5 set yazdığımda bu 5 lanet çalışma seti sizi öldürmeli."
- **Kesinlik:** net kural — **K-38'in (haftalık 15-20 set) tanımını düzeltiyor; sayı aynı, sayılan şey farklı**
- **Boşluk:** B10

### K-84 · Çöp volüm: 4–5 çalışma setinden sonrası boşa
- **Kural:** Bir kas için 4–5 iyi çalışma seti asıl işi görür; üstüne eklenen hareketler **çöp volümdür** (trash volume). Göğüs için bench + üst göğüs + cable cross yeterliyken üstüne alt göğüs makinesi + şınav + pullover eklemek çöptür. 6 hareket × 4 set = 24 çalışma seti yapabilen kimse yoktur; yaptığını sanan vardır.
- **Sayı/eşik:** hareket başına **4–5 çalışma seti** · günlük kas grubu üst sınırı **10 çalışma seti "bir kası mahvetmek için yeterli"**
- **Koşul:** Gerçek çalışma seti yapılıyor olması.
- **Gerekçe:** Volüm arttıkça set kalitesi zorunlu olarak düşer; sayı büyürken uyarı büyümez.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "10 çalışma seti gerçekten bir kası mahvetmek için yeterli."
- **Kesinlik:** net kural
- **Boşluk:** B10 — **K-39'u (antrenman başına 6-10 set) doğruluyor**

### K-85 · Tükenişe gitme kotası: egzersiz başına 1–2 set
- **Kural:** Tüm setler tükenişe götürülmez. Bir egzersizde **1, en fazla 2 set** tükenişe gider. 5 set bench yapıyorsan 2'sini tükenişe götürebilirsin, gerisi cepte tekrarla.
- **Sayı/eşik:** **1–2 set / egzersiz**
- **Koşul:** Haftada 2 frekans hedefleniyorsa. (Haftada 3 gün çalışan için bu kota gevşer — bkz. K-88.)
- **Gerekçe:** RIR 1–2 ile tam tükeniş **neredeyse aynı kas kazancını** verir, ama yıpranma çok daha düşük, iyileşme çok daha kısa olur ve frekans korunur.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Çok çok daha az kazanmak için full tükenişe gitmektense … cepte tekrar bırakmayı deneyeceğiz."
- **Kesinlik:** net kural — **K-40'ın (RIR 1-2, son set tükeniş) gerekçesi ve sayısal kotası**
- **Boşluk:** B10

### K-86 · Gerçek tükenişin tanımı — ve kimin buna ulaşamayacağı
- **Kural:** Tükenişe **beyin değil kas** karar verir. "Acıdı, herhalde yapamam, bırakayım" tükeniş değildir. Ölçüt: hayati bir zorlama olsa bir tekrar daha çıkar mıydı? Çıkardıysa tükenmemişsin. Ayrıca **failure** (temiz son tekrar) ile **beyond failure** (cheating, yarım tekrar, bar düşene kadar) farklıdır; ikincisi kas, vücut ve sinir sistemi için çok yüksek strestir.
- **Sayı/eşik:** yok · "tükendim" diyen sporcudan **en az 5 tekrar daha** alınabildiği gözlemi
- **Koşul:** Bu mentaliteyi aşmak "amatör sporcuların işi değil" — koç/spotter gerekebilir.
- **Gerekçe:** RIR ve tükeniş kotaları ancak tükenişin ne olduğu gerçekten yaşanmışsa doğru kalibre edilir.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Tükenişe beyniniz karar vermez. Kasınız karar verecek bunu."
- **Kesinlik:** net kural
- **Boşluk:** B10 — **RIR'in kalibrasyon problemini adlandıran tek kural**

### K-87 · Uyarı / iyileşme / yıpranma üçgeni
- **Kural:** Her antrenman üç şeyi aynı anda üretir: **stimulus** (uyarı), **recovery** ihtiyacı ve **fatigue** (yıpranma). Doğru program, kasa yeterli uyarıyı veren ama yıpranma sınırına götürmeyen ve **haftada ikinci antrenmanı mümkün kılan** volümdür. Pazartesi öyle ayarlanmalı ki perşembe/cuma aynı bölge tekrar çalışılabilsin.
- **Sayı/eşik:** yok — üç parametrenin dengesi
- **Koşul:** Haftada 2 frekanslı hipertrofi programı.
- **Gerekçe:** Volümü sınırlayan şey o günün kapasitesi değil, **bir sonraki antrenmanın tarihi**.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Kasa uyarı vereceksiniz ama iyileşeceksiniz ve yıpranma sınırına da gelmeyeceksiniz."
- **Kesinlik:** net kural
- **Boşluk:** B10 — **karar motorunun volüm mantığının çekirdeği**

### K-88 · Sıklık ↔ şiddet ters orantısı: az gün çalışan daha sert ve daha uzun çalışır
- **Kural:** Haftada ne kadar az gün çalışıyorsan o antrenman o kadar sert, uzun ve yıpratıcı olmalı. 3 gün çalışan **tüm setlerini tükenişe** götürebilir, yardımlı tekrar alabilir, drop/süper set kullanabilir. 6 gün çalışan bunu yapamaz.
- **Sayı/eşik:** 3 gün çalışan: **1,5 saatin altı verimsiz, hedef ~2 saat** · 6 gün çalışan: **45 dk – 1 saat**
- **Koşul:** Haftalık gün sayısı sabitlenmişse.
- **Gerekçe:** Toplam haftalık uyarı korunmalı; gün azaldıkça gün başına düşen yük artmak zorunda.
- **Kaynak:** `H3G19` (2019-02-08) · `PO1-19` (2019-04-04) — **iki bağımsız video aynı rakamı veriyor**
- **Alıntı:** "6 gün antrenman yapan 45 dakika 1 saat çalışıyorsa siz 3 gün yapıyorsanız 2 saat çalışmalısınız."
- **Kesinlik:** net kural — **K-40'ın (RIR 1-2) sıklığa bağlı istisnası**
- **Boşluk:** B10 / B4

### K-89 · Haftada 3 gün çalışılacaksa üç günün karakteri farklı olmalı
- **Kural:** Aynı kası haftada 3 gün çalışacaksan 3 gün de ağır bench yapamazsın — bu overtraining'e gider. Günler ayrılır: **1. gün ağır bileşik · 2. gün 12–15 tekrar, ağırlıklı izole · 3. gün pump odaklı.**
- **Sayı/eşik:** 2. gün **12–15 tekrar**
- **Koşul:** Kas başına haftada 3 frekans hedefleniyorsa (eksik bölge).
- **Gerekçe:** Farklı uyarı tipleri farklı iyileşme yükü bindirir; üç ağır gün aynı sistemi üst üste yorar.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "3 günde de ağır bench press yapman evet overtraining'e neden olacaktır."
- **Kesinlik:** net kural
- **Boşluk:** B10

### K-90 · Set arası dinlenme: izole ~1 dk, bileşik 3–4 dk — ölçüt "hazır hissetmek"
- **Kural:** Sabit bir süre yok. İzole harekette **1 dakika** yeterli; squat gibi ağır bileşikte **3–4 dakika gereklidir**. Dumbbell curl'de 3–4 dakika beklemek seni soğutur. Kural: **hazır hissettiğinde gir, hazır hissetmeden girme.**
- **Sayı/eşik:** izole **~1 dk** · bileşik **3–4 dk**
- **Koşul:** Hareket tipine göre.
- **Gerekçe:** Bileşikte sınırlayıcı sinir sistemi ve sistemik toparlanma; izolede lokal kan akışı korunmalı.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "Kendinizi hazır hissettiğinizde sete girin … hazır hissetmeden de sete girmeyin."
- **Kesinlik:** net kural
- **Boşluk:** B10 — **G6'da hiç yoktu, yeni alt-boşluk kapandı**

### K-91 · Tekrar tabanı 6 · izolede 5 tekrar yasak · sırtta 12 üstü anlamsız
- **Kural:** Tekrar sayısı, kas gerçekten zorlandığı sürece gelişimi çok değiştirmez (5 de 15 de olur). Yine de: vücut geliştirmede **6 tekrarın altına inilmez**, 5 nadiren ve yalnız büyük bileşiklerde. Tek eklemli izole hareketlerde 5 tekrar hem sakatlık riski hem "hareketten çalma" demektir. Biceps'te 10'un altına inme; sırtta 12'nin çok üstüne çıkmanın anlamı yok.
- **Sayı/eşik:** genel taban **6** · bileşikte istisna **5** · biceps **≥10** · sırt **~12 tavan**
- **Koşul:** Hipertrofi amacı (powerlifting değil).
- **Gerekçe:** Düşük tekrarda izole hareketler kas liflerini tam aktive etmeden ve metabolik stresi yaratmadan biter.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Tavsiyem 6 tekrarın altına inmemeniz."
- **Kesinlik:** net kural — **K-41'in (tekrar aralığı matrisi) tabanını netleştiriyor**
- **Boşluk:** B10

### K-92 · Antrenman içi dizilim: ağır bileşik 5–6 tekrar → izole 10–12 tekrar
- **Kural:** Antrenmana ağır bir bileşik hareketle **5–6 tekrar** civarında başlanır, ardından izoleye geçilip **10–12 tekrar** çalışılır. Böylece iki lif tipi de çalıştırılmış olur.
- **Sayı/eşik:** bileşik **5–6** · izole **10–12**
- **Koşul:** Standart hipertrofi seansı.
- **Gerekçe:** Ağır iş dinlenmiş sinir sistemiyle yapılmalı; metabolik iş sona bırakılır.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "İlk hareketiniz ağır bileşik … 5-6 tekrar. Sonra izoleye geçersiniz, 10-12."
- **Kesinlik:** net kural
- **Boşluk:** B10

### K-93 · Tam hareket açıklığı (ROM) maksimum gelişimi verir
- **Kural:** Sakatlanmayacak şekilde **maksimum ROM** kullanılır. Gerilen kas lifleri daha fazla aktive olur; kas ne kadar gerilirse o kadar güçlü kasılır ve o kadar çok motor ünite uyarılır.
- **Sayı/eşik:** yok
- **Koşul:** Sakatlık sınırı içinde.
- **Gerekçe:** Hem bilim hem vücut geliştirme ekolleri aynı yönde deniyor.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Bir kası ne kadar gererseniz o kadar güçlü kasılır."
- **Kesinlik:** net kural — **K-32'yi (ROM = progresif overload bileşeni) ve K-56'yı destekliyor**
- **Boşluk:** B10 / B12

### K-94 · Metabolik stres ve "kası şaşırt" mitinin çözümü
- **Kural:** Metabolik stres (ağrı, pump) kas gelişiminde rol oynar ama **vücut ona çok hızlı adapte olur** — bu yüzden sürdürülebilir bir gelişim yöntemi değildir. Yeni başlayan bir kişi ilk hafta yürüyemezken bir hafta sonra aynı işten neredeyse hiç ağrı almaz; kas gelişmemiş, vücut adapte olmuştur. "Kası şaşırt" muhabbetinin kaynağı budur. Progresif overload uygulanıyorsa kas zaten şaşırtılmış olur.
- **Sayı/eşik:** yok
- **Koşul:** Program tasarımı.
- **Gerekçe:** Adaptasyon hızlı olduğu için ağrı bir gelişim ölçütü olamaz.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Metabolik strese karşı çok rahat bir metabolik adaptasyon gelişebiliyor."
- **Kesinlik:** net kural — **K-35'i (egzersiz sabitliği) teorik olarak destekliyor**
- **Boşluk:** B10 / B5

### K-95 · Kas ağrısı: hafif iyi, parçalanma kötü
- **Kural:** Bilim kas ağrısının gelişimle ilgisi olmadığını söylüyor; hoca buna tam katılmıyor. **Hafif ağrı/dolgunluk iyidir.** Ama göğsün parçalanıyor, kolun kopuyor, bacağın kalkmıyorsa bu iyileşme ve frekans parametrelerini bozar; tavsiye edilmez.
- **Sayı/eşik:** yok — "hafif dolgunluk" ile "3 gün ağrıyla gezmek" ayrımı
- **Koşul:** Ertesi gün değerlendirmesi.
- **Gerekçe:** Aşırı ağrı bir sonraki seansı geciktirir, yani frekansı düşürür.
- **Kaynak:** `HPT20` (2020-02-12)
- **Alıntı:** "Hafif bir kas ağrısı olması iyidir."
- **Kesinlik:** eğilim (hocanın bilimden ayrıldığını kendisi söylüyor)
- **Boşluk:** B10 / B4

### K-96 · Full body reddi · PPL koşulu
- **Kural:** Full body yalnız **vakti dar** olanlar için. Haftada 3 günden fazla çalışabiliyorsan hipertrofide full body ile ilerlemek mümkün değil; en azından üst/alt ayrımı, tercihen **itiş-çekiş** yapılır. Push-Pull-Leg iyi bir sistem ama koşulu var: **genel olarak simetrik bir vücut.** Belirgin zayıf bölgen (ör. omuz) varsa PPL'de o bölge az kalır, modifiye edilmeli.
- **Sayı/eşik:** full body sınırı **haftada ≤3 gün**
- **Koşul:** Hipertrofi amacı; PPL için simetri.
- **Gerekçe:** Full body'de günler peş peşe gelir ve kilolar belli bir düzeyi aştıktan sonra iyileşme yetmez.
- **Kaynak:** `PO2-19` (2019-07-31) · `PO1-19` (2019-04-04)
- **Alıntı:** "Asıl amacınız hipertrofi ise full body tavsiye etmem."
- **Kesinlik:** net kural — **K-42'yi (itiş/çekiş/bacak iskeleti) doğruluyor ve koşullandırıyor**
- **Boşluk:** B10

---

## C · KALORİ ADIMI, FAZ KARARI ve MİNİ CUT (B3, B6, B7)

### K-97 · Minimum kalori adımı 500 kcal — 300–400 ölçüm gürültüsüdür
- **Kural:** Kaloriyi 300–400 oynatmanın anlamı yok. Hesaplanan kaloriler zaten 300–400 şaşıyor, ayrıca bacak günüyle kol günü arasındaki harcama farkı bundan büyük. **En az 500 düşür ya da en az 500 yükselt.**
- **Sayı/eşik:** **minimum adım 500 kcal**
- **Koşul:** Kalori yönü değiştirilirken.
- **Gerekçe:** "Vücut o kadar matematiksel çalışmıyor"; ölçüm hatası müdahaleden büyükse müdahale görünmez.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "En az 500 düşürün ya da en az 500 yükseltin."
- **Kesinlik:** net kural
- **Boşluk:** **B3 / B6** — **G6'da hiç yoktu; K-15 ve K-16'nın adım büyüklüğünü veriyor**
- ⚠ **Çelişki:** `HYK17` (2017) "300-500 öneriyoruz genelde" diyor. Bkz. Ç-1.

### K-98 · Kalori düşürme merdiveni ölçütü tartı değil ANTRENMANIN ÇIKIP ÇIKMAMASI
- **Kural:** Diyette kaloriyi ne zaman düşüreceğinin cevabı "kaç hafta bekle" değildir. Test şu: **kendini iyi hissediyor, "daha fazla antrenman yapabilirim" diyorsan fazla yiyorsun.** Yediğinle antrenmanı çıkarabiliyorsan biraz daha az ye. Yine çıkıyorsa biraz daha az ye. **Antrenmanın çıkmadığı noktada** kaloriyi tekrar yükselt.
- **Sayı/eşik:** yok — antrenman performansı sınır fonksiyonu (adım için bkz. K-97)
- **Koşul:** Aktif yağ yakma fazı.
- **Gerekçe:** Efektif yağ yakımı zaten sefalet gerektirir; konfor varsa açık yetersizdir.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Eğer iyi hissediyorsanız, daha fazla antrenman yapabilirim diyorsanız fazla yiyorsunuz."
- **Kesinlik:** net kural
- **Boşluk:** **B3** — **G6'nın "kaç hafta durağanlıktan sonra düşülür net değil" eksiğinin cevabı: hafta değil, performans**

### K-99 · Yağ yakımının öznel imzası — normal olan budur
- **Kural:** Efektif yağ yakımında: açlık, mide kazınması, kardiyoda kan şekeri düşüşü, antrenmanda pump alamama, damarların çıkmaması, "iğrenç" his. Bunlar arıza değil, sürecin kendisidir.
- **Sayı/eşik:** yok
- **Koşul:** Aktif ve sert yağ yakma fazı (form koruma fazı değil).
- **Gerekçe:** Bu semptomlar olmadan yeterli açık verilmemiştir; kişi kendini "durağanlık"ta sanır.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Yağ yakarken sefalet çekersiniz. Açlık çekersiniz. Mideniz kazınır."
- **Kesinlik:** net kural
- **Boşluk:** B3 — **K-76 (pump yoksa yapma) ile ÇAKIŞIR; bkz. Ç-4**

### K-100 · Diyette kardiyonun eşiği: kalori 1700–1800'e indiğinde
- **Kural:** Diyette kardiyo yapılmasının sebebi belli bir yerden sonra **daha az yiyememektir**. 1800–1700 kaloriye düştükten sonra daha ne kadar aşağı inilebilir? Kardiyo o noktada mecburen eklenir.
- **Sayı/eşik:** **~1700–1800 kcal** (hocanın ~90 kg sporcu bağlamında)
- **Koşul:** Yağ yakma fazı; kalori zaten dip yapmış olmalı.
- **Gerekçe:** Kardiyo bir tercih değil, kalori tabanına çarpınca kalan tek araç.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "1800-1700 kalorilere düştükten sonra daha ne kadar az yiyebilirsiniz? Mecburen kardiyo ekliyorsunuz."
- **Kesinlik:** net kural
- **Boşluk:** **B3** — **K-62'ye (kısa diyette kardiyo protokolü) tetikleme eşiği ekliyor**

### K-101 · Bulk'ta kardiyo sadece kalp sağlığı için — yağlanma cevabı kardiyo değil, daha az yemek
- **Kural:** Bulk'ta kardiyonun tek meşru amacı **kalp sağlığıdır**: haftada 2–3 kez, kendini iyi hissedecek kadar. "Temiz büyüyeyim / kalori yakayım" diye bulk'ta kardiyo yapmak mantıksızdır — dinlenme süresinden çalar. Fazla yağlanıyorsan çözüm kardiyo değil, **biraz daha az yemektir.**
- **Sayı/eşik:** **haftada 2–3 kez**, sağlık amaçlı
- **Koşul:** Bulk / kas kazanım fazı. (Form koruma fazında kardiyo yapılabilir.)
- **Gerekçe:** Bulk'ta zaten kalori yüksek; kardiyo eklemek toparlanma bütçesini yer.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "Balkta kardiyonun amacı şu olmamalı: temiz büyümek için kardiyo yapıyorum."
- **Kesinlik:** net kural
- **Boşluk:** **B6 / B4** — **G6'da yoktu**

### K-102 · MİNİ CUT: bulk'ta iştah öldüyse 4–6 haftalık defisit
- **Kural:** 5–6 aydır bulk'tasın, yağ oranın makul, ama kilo artmıyor, kas artmıyor ve **eskiden yediğini bile yiyemiyorsun** — iştahın durdu. Burada 4–6 haftalık bir defisit + artırılmış kardiyo + artırılmış antrenman volümü uygulanır. Buna **mini cut** denir.
- **Sayı/eşik:** **4–6 hafta** · tetikleyici: **5–6 ay bulk + iştah durması**
- **Koşul:** Bulk süresi uzamış ve iştah gerçekten ölmüş olmalı (zorla yeme aşamasına gelinmiş).
- **Gerekçe:** İlk 1–2 hafta kaloriyi dibe çeksen bile açlık hissetmezsin; **3–4 hafta sonra açlık geri gelir** ve bulk'ta biriken yağ da yakılmış olur. Yani mini cut bir iştah resetidir.
- **Kaynak:** `IST18` (2018-11-12) · süre `HYK17` (2017-11-27) ile uyumlu
- **Alıntı:** "Bir 4 haftalık 6 haftalık yaptığınız bir defisit … gerçekten mükemmel gelecek."
- **Kesinlik:** net kural
- **Boşluk:** **B6 / B7** — **G6'da hiç yoktu; bulk'un nasıl sonlandırılacağının cevabı**

### K-103 · DİYETE ARA VERME (diet break): 1 hafta karb yükselt, hareketi artır
- **Kural:** Diyet uzayıp metabolizma yavaşladığında (tiroid değerleri düşme eğilimindeyken) ilk çözüm ilaç değil: **bir hafta diyete ara ver, karbonhidratı yükselt, hareketi artır.** Toparlar.
- **Sayı/eşik:** **1 hafta**
- **Koşul:** Uzamış diyet; değerler henüz "çok bozulmamış" olmalı.
- **Gerekçe:** Metabolik yavaşlamanın ilk müdahalesi enerji ve karbonhidrat girdisidir.
- **Kaynak:** `PO2-19` (2019-07-31)
- **Alıntı:** "Bir hafta diyeti ara versen, karbonhidratı yükseltsen, hareketi yükseltsen toparlayacaktır."
- **Kesinlik:** net kural
- **Boşluk:** **B7** — **G6'nın "reverse diet / diyet sonrası protokol yok" eksiğinin ilk gerçek cevabı** (tam bir reverse diet değil, ama diyet-içi ara verme protokolü)

### K-104 · Sert kısa diyet bloğu: 6–8 hafta, 12 hafta mutlak tavan
- **Kural:** Yüksek açıklı, çok düşük yağlı, yüksek kardiyolu sert diyet **6–8 hafta** sürer; **12 haftadan uzun tutulmaz.** Bulk'un içine sıkıştırılan mini kesim **4 hafta** olabilir.
- **Sayı/eşik:** sert blok **6–8 hafta** · tavan **12 hafta** · bulk içi mini **4 hafta**
- **Koşul:** Yüksek kalorik açık + yüksek kardiyo birlikteyse.
- **Gerekçe:** Uzun vadede sağlıklı değil, kas kaybı başlar.
- **Kaynak:** `HYK17` (2017-11-27)
- **Alıntı:** "12 haftadan uzun tutmayacağız … O yüzden 6-8 hafta."
- **Kesinlik:** net kural — **K-19 (sert diyet tavanı 4-6 hafta) ve K-65 (ciddi diyet 12-16 hafta) ile birlikte okunmalı; bkz. Ç-2**
- **Boşluk:** B7 / B3

### K-105 · Bulk tavanı görsel: karın kasları görünür kalsın
- **Kural:** "Bulk mı definisyon mu" sorusunun evrensel cevabı yok — hedefe bağlı. Ama hocanın **her koşulda verdiği tavsiye:** yıl boyu **karın kasların görünür olsun.** Paramparça olman gerekmiyor, zaten yıl boyu paramparça gezilemez; o halde büyümek ve antrenman yapmak optimum değildir.
- **Sayı/eşik:** eşik = **karın kaslarının görünürlüğü** (K-9'un göbek testiyle aynı yönde)
- **Koşul:** Doğrudan yarışma hazırlığı dışındaki tüm dönemler.
- **Gerekçe:** "Bulk demek göbekli olmak değildir, definisyon demek yıl boyu kupkuru gezmek değildir."
- **Kaynak:** `BD17` (2017-10-17)
- **Alıntı:** "Benim önereceğim şey her zaman karın kaslarınız görünür olsun."
- **Kesinlik:** net kural — **K-7 (%20 tavan) ve K-9'un görsel karşılığı**
- **Boşluk:** B6

### K-106 · "Kilo almalı mıyım?" testi — 28 cm kol eşiği
- **Kural:** Kilo alma hevesine kapılmadan önce iki şeye bak: (1) yağ oranın, (2) **aylık** kilo değişimi + ölçü + bel ölçüsü + karında deri kıvrımı kalınlığı. Gerçekten kilo alması gereken grup: **kolu 28 cm** olan kişidir. Normal bir yapıdaysan ve karın kasların ortada değilse kendini zorlama.
- **Sayı/eşik:** **kol 28 cm** = zorlayarak yeme meşru · karın kasları görünmüyorsa zorlama yok · takip **haftalık değil aylık**
- **Koşul:** İştahsızlık + kilo alamama şikâyeti.
- **Gerekçe:** "Haftada" bakmak net sonuç vermez; aylık trend ve ölçü daha güvenilir.
- **Kaynak:** `IST18` (2018-11-12)
- **Alıntı:** "28 santim kolunuz varsa evet gerçekten kilo almak için biraz besini zorlayabilirsiniz."
- **Kesinlik:** net kural — **kanaldaki nadir mutlak sayısal eşiklerden biri**
- **Boşluk:** **B6 / B11**

### K-107 · Tecrübesizde bulk/cut ayrımı zorlanmaz, açık küçük tutulur
- **Kural:** Yeni başlamış / birkaç yıllık ve ileri gidememiş kişi bu soruyu çok düşünmemeli. Yağ oranını düşürmek istiyorsa kalorik açık verir — **ama açığı çok vermez.** Bu aşamada hem kazanmak hem yavaş yavaş yağ yakmak mümkündür. Çok zayıfsan (ektomorf) kaloriyi fazla tutmak öncelikli.
- **Sayı/eşik:** yok — "açığı çok verme"
- **Koşul:** Tecrübesiz sporcu. ("Tecrübesizseniz tecrübesiz olduğunuzu bilirsiniz zaten.")
- **Gerekçe:** Tecrübesizde eşzamanlı kazanım/kayıp mümkün olduğu için keskin faz ayrımı gereksiz.
- **Kaynak:** `BD17` (2017-10-17)
- **Alıntı:** "Hem kazanabileceksiniz hem de yavaş yavaş yağ yakabileceksiniz."
- **Kesinlik:** net kural — **K-22'yi (skinny-fat: ilk 6 ay-1 yıl keskin ayrım yok) doğruluyor**
- **Boşluk:** B6 / B12

### K-108 · Ramazan / zorunlu oruç: bulk'taysan fazı çevir
- **Kural:** Bulk'ta olan biri bir ay oruç tutacaksa bulk'a devam etmeye çalışmaz; **o ayı yağ yakımına çevirir.** Yağ oranına bağlı ama "çok büyük, güzel bir fırsat".
- **Sayı/eşik:** yok
- **Koşul:** Bir aylık zorunlu öğün kısıtı.
- **Gerekçe:** Kısıt zaten bulk'u imkânsızlaştırıyor; direnmek yerine faz değiştirilir.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "Bence yağ yakımı için çok büyük, güzel bir fırsat."
- **Kesinlik:** net kural
- **Boşluk:** B7 — **hayat kısıtı geldiğinde faz kararının nasıl verileceğine dair tek örnek**

---

## D · DİYETTE ÖLÇÜM, FORM ve KAS KAYBI (B11, B1, B3)

### K-109 · Diyette forma bakma — aynayı kapat
- **Kural:** Yağ yakma sürecinde forma bakılmaz. Uzun kollu giy, tişörtü uzun giy, aynada kendini inceleme. Takip edilecek **tek şey deri altı yağ** (ve kaldırdığın kilolar). Form değerlendirmesi diyet bitince yapılır.
- **Sayı/eşik:** yok — davranış kuralı
- **Koşul:** Aktif yağ yakma fazı.
- **Gerekçe:** Diyette kaslar zorunlu olarak sönük ve flat görünür; forma bakmak yanlış sinyal üretir ve diyeti bıraktırır.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Diyetteyken gözünüzü kapatın, formunuza bakmayın."
- **Kesinlik:** net kural
- **Boşluk:** **B11** — **K-5'in (fotoğraf+ölçü+kendinle kıyas) diyet fazındaki istisnası**

### K-110 · Kas kaybetmediğinin ölçütü: kaldırdığın kilolar
- **Kural:** Diyette kas kaybedip kaybetmediğini aynadan değil demirden anlarsın. **Kaldırdığın kilolar diyete başlamadan önceki seviyeye yakınsa kas kaybetmedin.** (Bulk dönemindeki performansa yakın olması beklenmez.) Kısa bir diyette (~1 ay) kaldırdığın kilonun bir miktar düşmesi de sorun değil, hızla toparlanır.
- **Sayı/eşik:** referans = **diyet öncesi** performans (bulk zirvesi değil)
- **Koşul:** Yağ yakma fazı.
- **Gerekçe:** Görsel küçülme glikojen ve su kaybıdır; güç ise kas dokusuna daha sadık bir gösterge.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Eğer kaldırdığınız kilolar aynıysa … kas kaybetmediniz."
- **Kesinlik:** net kural — **K-30'a (diyette güç düşüşü normal) ölçüt ekliyor**
- **Boşluk:** **B11 / B3**

### K-111 · Flat / full ayrımı: kaybedilen sarkoplazma, miyofibril değil
- **Kural:** Diyette kaybedilen şey glikojen, su, tuz ve mineraldir — **sarkoplazma**. Miyofibril (gerçek kas dokusu) kaybedilmez; 10 yıl çalışıp bıraksan bile kolay kolay gitmez. Ölçümde bu "lean body mass kaybı" olarak görünür ama kas dokusu kaybı değildir ve **1–2 hafta içinde geri alınır**: 2 gün karb ve tuzu azalt, kaslar söner; bir hafta yüksek karb + yüksek tuz + iyi su dengesi, kaslar şişer.
- **Sayı/eşik:** geri toplanma **1–2 hafta** · sönme **2 gün** · kolda **1–3 cm** kayıp normal
- **Koşul:** "Büyük yanlışlar" yapılmıyorsa (ayda 15 kilo verdiren diyet değilse).
- **Gerekçe:** %20'den %10'a inerken kas kaybedilmez; hatta tecrübesiz kişi bu aralıkta kas bile yapabilir.
- **Kaynak:** `2AY19` (2019-07-08) · `BD17` (2017-10-17)
- **Alıntı:** "Myofibrillerinizi kaybetmiyorsunuz. Sadece sarkoplazmayı kaybediyorsunuz."
- **Kesinlik:** net kural
- **Boşluk:** **B11 / B3**

### K-112 · Yağın ayrılma sırası: ön kol → kol → karın üstü → karın altı
- **Kural:** Diyette deri altı yağ kontrolü belirli bir sırayı izler. Önce **ön kol**, sonra kol, sonra **karnın üstü**, en son **karnın altı**. Her aşama bitince bir sonrakine bakılır.
- **Sayı/eşik:** yok — 4 aşamalı sıra
- **Koşul:** Hocanın kendi vakasında düşük yağ oranı bağlamı, ama "göbeği olan kişiler için de geçerli" diyor.
- **Gerekçe:** Yağ hücrelerinin reseptör dağılımı bölgesel olarak farklı; en dirençli bölgeler en sona kalır (hoca bunu alfa/beta reseptör farkıyla açıklıyor).
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Ön kolundan, kolundan başlarsın … karnının üstüne bakarsın … karnının altına bakarsın."
- **Kesinlik:** net kural
- **Boşluk:** **B1 / B2 / B11** — **G6'nın "bel çevresi sayısal eşiği yok" boşluğuna sayı değil ama sıralama getiriyor**

### K-113 · Maksimum dolu (full) haldeyken yağ yakılamaz
- **Kural:** Kaslar tıka basa glikojen ve suyla doluyken yağ yakılamaz. Efektif yağ yakımı için kas ve karaciğer glikojen depolarının **boşa yakın** olması gerekir. Bu natürel için de ilaçlı için de geçerlidir. "500 gram karbonhidratla nasıl yağ yakarım" sorusunun cevabı: yakamazsın.
- **Sayı/eşik:** hocanın kendi rakamı: **90 kg'da 100–150 g karbonhidrat** (yağ yakma fazında)
- **Koşul:** Yağ yakma hedefi.
- **Gerekçe:** Vücut, depolar doluyken kaloriyi yağdan çekmez.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Maksimum full görünüşünüzle yağ yakamazsınız. Naturel de olsanız, ilaçlı da olsanız."
- **Kesinlik:** net kural
- **Boşluk:** **B3** — **K-48'in (pump kaybı = glikojen sinyali) diyetteki zorunlu karşılığı**

### K-114 · Su atmak ≠ yağ yakmak
- **Kural:** Yüksek karbonhidratla "kurumak" mümkündür — ama o su atmaktır, yağ yakmak değil. İkisi karıştırılmamalı.
- **Sayı/eşik:** hocanın örneği: **500 g karbonhidratla** su atılabilir, yağ yakılamaz
- **Koşul:** Görsel değişimin yorumlanması.
- **Gerekçe:** Su kaybı hızlı ve görünür, yağ kaybı yavaş; kısa vadeli görsel iyileşme yanıltır.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Su atmak mümkün ama çok yüksek karbonhidratla yağ yakma gibi bir dünya yok."
- **Kesinlik:** net kural
- **Boşluk:** B3 / B11

### K-115 · Fotoğrafla takipte yanlılık uyarısı — hocanın kendi itirafı
- **Kural:** Fotoğrafla takip yapan kişi kötü halinde fotoğraf çekmez. Hoca kendi 2 aylık değişim serisini anlatırken her fotoğrafın **iyi ışıkta, iyi mekânda, antrenman sonrası pump'lıyken** çekildiğini söylüyor; kötü halinin fotoğrafı yok. Fotoğraf serisi bu yanlılık bilinerek okunmalı.
- **Sayı/eşik:** yok
- **Koşul:** Fotoğrafla ilerleme takibi.
- **Gerekçe:** Seçim yanlılığı ilerlemeyi olduğundan büyük gösterir; ölçü ve deri kıvrımı bundan etkilenmez.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Kötü halimde kesinlikle fotoğraf çekinmiyorum … Pumplı çekilmişim."
- **Kesinlik:** net kural
- **Boşluk:** **B11** — **K-5'i (fotoğraf takibi) sınırlandıran tek kural; karar motoruna fotoğrafı tek başına ölçüt yapmama uyarısı**

### K-116 · Form koruma ayrı bir faz ve kolay değil
- **Kural:** Hedef yağ oranına gelindikten sonra o formu korumak ayrı bir iştir: sürekli açlık, haftadan haftaya yağ oranında dalgalanma, kaçırılan karbonhidratta su tutma ve yağlanma riski, düşürünce 2 antrenmanda depoların boşalması. Sürekli bu formda kalmak zorunlu değil — buradan **lean bulk**'a geçilebilir.
- **Sayı/eşik:** yok · düşüş hızı: **2 antrenmanda** depolar boşalabiliyor
- **Koşul:** Düşük yağ oranına ulaşılmış olması.
- **Gerekçe:** Vücut o formda kalmak istemiyor; kardiyo bırakılırsa geri dönüyor.
- **Kaynak:** `2AY19` (2019-07-08)
- **Alıntı:** "Yani kardiyo yapmazsam vücudum bu formda kalmak istemiyor."
- **Kesinlik:** net kural
- **Boşluk:** **B7** — **diyet sonrası için ikinci gerçek veri (K-103 ile birlikte)**

---

## E · KARBONHİDRAT, YAĞ ve İNSÜLİN (B9)

### K-117 · Kalorik açığı YAĞDAN ver, karbonhidrattan değil — %50 glikojen eşiği
- **Kural:** Diyette kalori düşürülürken kesilecek makro **yağdır**, karbonhidrat değil. Glikojen depoların **%50'ye** indiğinde aminoasit yakmaya, yani kas yıkmaya başlarsın. Depoların sıfır olmasına gerek yok.
- **Sayı/eşik:** **glikojen %50** = kas yıkımının başladığı eşik · (kıyas: %70 hâlâ güvenli)
- **Koşul:** Yağ yakma fazı, natürel.
- **Gerekçe:** Karbonhidrat kesildikçe vücut glukoneogenez ile aminoasitten şeker üretmeye geçer.
- **Kaynak:** `KET18` (2018-04-18)
- **Alıntı:** "Kalorik açığınızda olabildiğince yağlardan vermenizi tavsiye ederim."
- **Kesinlik:** net kural
- **Boşluk:** **B9 / B3** — **G6'da yoktu; K-45'in (diyette yağ ~sıfır) gerekçesi**

### K-118 · Yağ tabanı: natürelde kalorilerin %15'i
- **Kural:** Yüksek karbonhidratlı diyette bile natürel bir kişi **kalorilerinin %15'inin altına** yağdan inmemeli. Buna karşılık "kaşık kaşık fıstık ezmesi" de gereksiz — natürel hormonlar miligram düzeyinde salınıyor, o kadar yağa ihtiyaç yok. (Hoca kendi çok düşük yağ oranı dönemlerinde bile kolesterol değerlerinin normal çıktığını söylüyor.)
- **Sayı/eşik:** **kalorilerin %15'i** = natürel taban
- **Koşul:** Natürel sporcu. (İlaçlı bağlam kapsam dışı bırakıldı.)
- **Gerekçe:** Hormonal üretim için gereken yağ miktarı sanılandan düşük; fazlası kalori bütçesinden çalar.
- **Kaynak:** `KET18` (2018-04-18)
- **Alıntı:** "Kalorilerin %15'inin altına natürel kişiler indirmesin."
- **Kesinlik:** net kural — **K-44'ün (yağ tavanı 1 g/kg, taban 50 g) yüzde cinsinden karşılığı**
- **Boşluk:** B9
- ⚠ **Çelişki:** `HYK17` sert kısa blokta "günde 15-20, belki 10 gram yağ" diyor. Bkz. Ç-3.

### K-119 · Ketojenik / low-carb reddi — ve asıl yapısal kusuru
- **Kural:** Ağırlık çalışan biri için ketojenik ve düşük karbonhidratlı diyetler reddediliyor. Yağ yakımı açısından **defisitteysen ketodan bir farkı yok** — belirleyici kaloridir; insülin ve enflamasyon iddiaları araştırmalarca desteklenmemiş. Asıl kusur yapısal: keto bir **açma-kapama tuşudur.** Ya ketozdasındır ya değilsindir; bir gün cheat yaptın, çıktın. Normal kalorik açıklı diyette bozarsan ertesi gün fazladan kardiyoyla toparlar, devam edersin.
- **Sayı/eşik:** keto makro tanımı **%5 karb / %20 protein / %75 yağ** · ketoza giriş: sedanterde birkaç hafta, **6 haftaya kadar**
- **Koşul:** Ağırlık çalışan kişi. Sedanter biri kendini iyi hissediyor ve sonuç alıyorsa değiştirmesin.
- **Gerekçe:** Sürdürülebilirlik = hata toleransı. Toparlanma şansı olmayan sistem pratikte kırılgandır.
- **Kaynak:** `KET18` (2018-04-18)
- **Alıntı:** "Adeta bir açma kapama tuşu var … diyeti bozma ve toparlama gibi bir şansınız yok."
- **Kesinlik:** net kural
- **Boşluk:** **B9 / B7** — **"diyet bozulunca ne yapılır" sorusuna dolaylı ama net cevap: ertesi gün kardiyo, devam**

### K-120 · Düşük karb + yüksek protein = amonyak → bitkinlik zinciri
- **Kural:** Karbonhidratı kesip proteini yüksek tutan klasik "tavuk-tavuk-tavuk" diyetinde vücut ketoza da giremez, aminoasitleri şeker olarak yakar. Zincir: aminoasit yıkımı → **amonyak artışı** → triptofan artışı → serotonin → melatonin → uykulu, bitkin, unutkan, düşünmesi azalmış hâl. Ayrıca **karaciğer enzimleri yükselir.**
- **Sayı/eşik:** yok
- **Koşul:** Düşük karbonhidrat + yüksek protein birlikteyse.
- **Gerekçe:** Protein "berbat bir yakıttır" — yapı taşıdır, enerji kaynağı değil.
- **Kaynak:** `KET18` (2018-04-18)
- **Alıntı:** "Amonyak artınca … triptofan beyinden daha fazla salınacak. Bu da serotonini tetikleyecek."
- **Kesinlik:** net kural
- **Boşluk:** **B9 / B8** — **"diyet sisi"nin mekanizması; G6'da yoktu**

### K-121 · Karaciğer enzimleri (ALT/AST) sporcuda yüksek çıkar
- **Kural:** İyi antrenman yapan birinde ALT/AST hafif yüksek çıkması beklenir; bunu görünce doğrudan "ilaç/supplement karaciğerimi bozdu" diye düşünmek yanlış. Tersi de doğru: **ALT 15–20 bandındaysa** yeterince sert çalışmıyorsundur.
- **Sayı/eşik:** **ALT 15–20 = düşük antrenman şiddeti göstergesi** `[ASR: "AST aleti"]`
- **Koşul:** Ağırlık çalışan kişi; ayrıca sürekli protein yakılıyorsa (K-120) enzimler ayrıca yükselir.
- **Gerekçe:** Kas yıkımı ve egzersiz enzim salınımını artırır.
- **Kaynak:** `KET18` (2018-04-18)
- **Alıntı:** "15-20'lerde ALT çıkıyorsa biraz tırt antrenman yapıyorsunuzdur."
- **Kesinlik:** eğilim — **hocanın kişisel yorumu, referans aralığı laboratuvara göre değişir**
- **Boşluk:** B11 — **kan değeriyle antrenman şiddeti arasında kurulan tek bağ**

### K-122 · Glikoz ve fruktoz aynı şey değil: fazla fruktoz yağlandırır, fazla glikoz sporcuda yağlandırmaz
- **Kural:** **Glikoz** kasların doğrudan yakıtı, kan şekerini ve insülini yükseltir. **Fruktoz** karaciğere gider. Karaciğer depoların doluyken alınan fazla fruktoz **karaciğerde yağ olarak depolanır**, kasa gitmez, antrenman performansını artırmaz — rafine/paketli ürünlerdeki şekerlerin çoğu budur. Buna karşılık haftada 4–5 gün gerçekten antrenman yapan birinde **fazla glikoz zarar taşımaz**; depolar zaten hiçbir zaman dolu olmaz.
- **Sayı/eşik:** yok · ön koşul **haftada 4–5 gün antrenman + haftada birkaç kardiyo**
- **Koşul:** Ön koşul sağlanmıyorsa (sedanter/ara sıra çalışan) kural tersine döner: insülin direnci + yağlanma.
- **Gerekçe:** Kasa giren glikoz glikojene çevrilir ve oradan kana geri salınmaz; işi biter.
- **Kaynak:** `KRB18` (2018-04-04)
- **Alıntı:** "Spor yapan birisi kolay kolay şekerle, hele ki glikozla yağlanmaz."
- **Kesinlik:** net kural
- **Boşluk:** **B9** — **K-47'nin (orta-yüksek GI, pirinç sabit) altındaki biyokimya**

### K-123 · Yüksek GI yalnız antrenman çevresinde mantıklıdır
- **Kural:** Yüksek ve düşük glisemik indeksin ikisi de yağ yakımında kullanılabilir; belirleyici kaloridir. Yüksek GI'nin avantajı **yalnız antrenman çevresindeki öğünde** vardır. Antrenmanın akşam 6–7'deyse sabah kahvaltıda mısır gevreği ya da öğlen beyaz pirinç yemenin mantığı yok; **o öğünlerde düşük GI daha iyi.**
- **Sayı/eşik:** yok — zamanlama kuralı
- **Koşul:** Antrenman saatine göre.
- **Gerekçe:** Yüksek GI daha çok insülin salgılatıp hücreye hızlı sokar; bu avantaj sadece depoların boş olduğu ve doldurulacağı pencerede işe yarar.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "Sadece antrenman çevresinde karbonhidratın varsa yüksek glisemik indeks daha mantıklı olur."
- **Kesinlik:** net kural — **K-47'yi ve `KRB18`'in "yüksek GI'de sabit kal" pozisyonunu koşullandırıyor; bkz. Ç-5**
- **Boşluk:** B9

### K-124 · Basit şeker + yağ birlikte = yağlanma
- **Kural:** Yüksek GI karbonhidrat ile yağ **aynı öğünde birleştirilmez.** Yüksek insülin ortamında alınan yağ depolanır; ayrıca yağ hücrelerinin boşalması durur, yağ yakımı durur. Klasik örnek: baklava (fruktoz + kötü yağ).
- **Sayı/eşik:** yok
- **Koşul:** Özellikle yüksek GI karbonhidrat alınan öğünde.
- **Gerekçe:** İnsülinin işi depolamaktır; kaslar boşsa kasa, doluysa yağa depolar.
- **Kaynak:** `KRB18` (2018-04-04) · `PO1-19` (2019-04-04)
- **Alıntı:** "Yüksek glisemik indeksli karbonhidratı yağlarla çok bir arada tutmamak lazım."
- **Kesinlik:** net kural
- **Boşluk:** **B9** — **G6'da yoktu; öğün kurma kuralı**

### K-125 · Antrenman öncesi dextroz 30–40 g · insülin hassasında fruktoz eklenir
- **Kural:** Antrenman öncesi saf glikoz (dextroz) **30–40 g** kullanılabilir. İnsülin iniş çıkışları antrenmanını etkiliyorsa glikozun içine **bir miktar fruktoz (meyve)** eklenir: glisemik indeks ve insülin salınımı düşer, karaciğer depoları da dolar. Bu yüzden meyve, insülin/kan şekeri sorunu yaşayanlar için antrenman öncesi/sonrası iyi bir tercihtir.
- **Sayı/eşik:** **30–40 g dextroz** (hocanın kendi kullanımı) · intra-workout örneği: 30 g dextroz + 10 g kreatin + 7–8 g BCAA, **1,5 L suda**
- **Koşul:** İnsülin hassasiyeti kişiye göre; hoca kendisinde sorun olmadığını söylüyor.
- **Gerekçe:** İntra-workout karışım ne kadar seyreltilirse o kadar hızlı emilir; yoğun karışım mideden zor emilir.
- **Kaynak:** `KRB18` (2018-04-04) · `G15-18` (2018-06-17)
- **Alıntı:** "Direkt 30 gram 40 gram dextroz içerek ben antrenmana gidebiliyorum."
- **Kesinlik:** net kural
- **Boşluk:** B9

### K-126 · Carb backloading: büyük karbonhidrat öğünü antrenman sonrasına
- **Kural:** Büyük karbonhidrat öğünleri antrenmandan **sonraya** bırakılır, yanına az yağ ve az protein eklenir. Kasa giren karbonhidrat çıkmaz; gece boyunca glikojen olarak sentezlenir ve ertesi güne kadar orada kalır. Ertesi gün yalnız kan şekerini stabil tutacak ve karaciğeri besleyecek kadar karbonhidratla efektif antrenman çıkarılabilir.
- **Sayı/eşik:** yok
- **Koşul:** Akşam antrenman yapanlar.
- **Gerekçe:** Kastaki glikojen kana geri salınmaz; karaciğerdeki salınır.
- **Kaynak:** `KRB18` (2018-04-04)
- **Alıntı:** "Antrenmandan sonra büyük karbonhidrat öğünlerinizi … tamamen onu kasınıza depolayabilirsiniz."
- **Kesinlik:** net kural
- **Boşluk:** B9

### K-127 · Off gün / antrenman günü makro ayrımı (az gün çalışanlar için)
- **Kural:** Haftada az gün çalışan kişi makrolarını gün tipine göre ayırır. **Off gün:** yüksek protein, yüksek yağ (kilo başına 1 g aşılabilir), düşük ama **sıfır olmayan** karbonhidrat, düşük GI. **Antrenman günü:** yüksek karbonhidrat (sabahtan itibaren), çok düşük yağ, orta protein.
- **Sayı/eşik:** hocanın kendi rakamları: off gün **~120 g yağ**, antrenman günü **~40 g** (ortalama ~80 g)
- **Koşul:** Haftada 3 gün gibi az sıklıkla çalışanlar. 5–6 gün çalışan bu ayrıma girmez, daha rahat yer.
- **Gerekçe:** Antrenman günü sabah alınan yüksek karbonhidrat yağ sindirimini yavaşlatır; akşamki antrenmana yağ efektif sindirilmemiş olur. Sıfır karbonhidratlı off gün ertesi günkü antrenmanı bozar.
- **Kaynak:** `H3G19` (2019-02-08)
- **Alıntı:** "Off günde yüksek protein, yüksek yağ. Antrenman gününde yüksek karbonhidrat, çok düşük yağ."
- **Kesinlik:** net kural — **K-44'ün (yağ tavanı 1 g/kg) off-gün istisnası**
- **Boşluk:** **B9** — **G6'da yoktu; ayrıca "az antrenman = daha dikkatli beslenme" kuralını getiriyor**

### K-128 · Depletion: sert diyete girmeden önce depoları boşalt
- **Kural:** Sert bir diyet bloğunun başlamasından önceki akşam, yüksek tekrarlı ve dev setli bir antrenmanla glikojen depoları bilinçli olarak boşaltılır (depletion). Depolar zaten doluysa antrenman öncesi öğüne karbonhidrat konmaz.
- **Sayı/eşik:** yok
- **Koşul:** Sert diyet bloğuna geçiş anı.
- **Gerekçe:** Yağ yakımı depolar boşa yakınken başlar (K-113); blok dolu depolarla başlarsa ilk günler boşa gider.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "Akşam artık boşaltacağım depolarımı, depletion dediğimiz şekilde." `[ASR: "depleysin"]`
- **Kesinlik:** net kural
- **Boşluk:** B3 / B9

### K-129 · Carb cycling: yüksek karb günü yağ yakımını baltalamaz
- **Kural:** "İnsülin düşük olmadan yağ yakılmaz" kısmen doğru ama carb cycling'de yüksek karbonhidrat günü yağ yakımını baltalamaz — belirleyici **haftalık kaloridir.** Yüksek karb gününde daha çok kalori alıyorsan o gün daha az yağ yakarsın; düşük karb gününde o kaloriyi yağla dengelemiyorsan toplamda bir şey değişmez.
- **Sayı/eşik:** yok
- **Koşul:** Toplam kalori sabit tutuluyorsa.
- **Gerekçe:** İnsülin düştüğünde yağ yakımı başlar; gün içi dalgalanma haftalık bilançoyu değiştirmez.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "Yüksek karb günü yağ yakımını baltalamış olmazsın. Tabii ki kaloriye bağlı."
- **Kesinlik:** net kural
- **Boşluk:** B9 / B3

---

## F · SİNDİRİM, İŞTAH, BAĞIRSAK ve ÖDEM (B8)

### K-130 · Zorla yeme yasağı — vücut istemiyorsa yeme
- **Kural:** Vücut bir besini istemiyorsa **zorla yenmez.** Doyduğun halde tabaktaki pirinci bitirmeye çalışmak bir yanlışlık göstergesidir. (Sevmemekten bahsedilmiyor; tokluğa rağmen yemekten bahsediliyor.)
- **Sayı/eşik:** yok
- **Koşul:** **Tek istisna:** uzamış bulk'ta iştah tamamen durduysa — orada da çözüm zorla yemek değil, mini cut (K-102). Ayrıca gerçekten hard-gainer grubundaysa (K-131) zorlanabilir.
- **Gerekçe:** İştah kesilmesi çoğu zaman yağ hücrelerinin doygunluğa ulaştığının sinyalidir; vücut artık yemeni istemiyordur.
- **Kaynak:** `IST18` (2018-11-12)
- **Alıntı:** "Bir besini vücut istemediğinde asla zorla yemenizi tavsiye etmem."
- **Kesinlik:** net kural
- **Boşluk:** **B8** — **G6'da yoktu**

### K-131 · Hızlı metabolizma grubunun teşhisi — ve kim bu grupta DEĞİL
- **Kural:** Gerçekten hızlı metabolizmalı grup: karın kasları kendiliğinden açık, zayıf, gerçekten yiyemeyen kişi. **Yağlıysan ama kolların ve omuzların inceyse bu grupta değilsin.** Çoğu kişi kendini bu grupta sanıyor ama değil.
- **Sayı/eşik:** yok — görsel teşhis
- **Koşul:** Kilo alamama şikâyeti.
- **Gerekçe:** Yanlış teşhis, gereksiz zorla yemeye ve yağlanmaya yol açıyor.
- **Kaynak:** `IST18` (2018-11-12)
- **Alıntı:** "Yağlıysanız ama kollarınız, omuzlarınız falan inceyse bu grupta değilsiniz."
- **Kesinlik:** net kural
- **Boşluk:** B8 / B6

### K-132 · İştahsızlık protokolü: proteini düşür, karb ve yağı yükselt, lifi kes
- **Kural:** Yeterince yiyemeyen kişide protein iştahı kapatır. Protein **1,5 g/kg'a kadar** çekilir ("kas ağrısı çekmeyecek kadar"), kalan yer karbonhidrat ve yağla doldurulur. Karbonhidrat orta-yüksek GI olsun ama şekere kaymasın: **kepekli makarna değil normal makarna, beyaz pirinç.** **Lifli gıdalara ve baklagillere girilmez.** Bu grupta **yağ da kilo başına 1 g'ı aşabilir.**
- **Sayı/eşik:** protein **2–2,5 → 1,5 g/kg** · yağ **>1 g/kg** (bu grup için istisna)
- **Koşul:** Yalnız gerçekten hızlı metabolizmalı / iştahsız grup (K-131).
- **Gerekçe:** Protein yavaş sindirilir ve sindirimi sırasında kalorisinin çoğu ısı olarak harcanır; ayrıca lif iştahı tıkar. Gün içi düşük şiddetli aktivitede vücut ağırlıklı olarak yağ metabolize ettiği için yağ da önemlidir.
- **Kaynak:** `IST18` (2018-11-12)
- **Alıntı:** "Proteini 1,5 grama kadar çekebilir … olabildiğince karbonhidrat ve yağ yüksek."
- **Kesinlik:** net kural — **K-17'yi (iştah limitinde protein 2→1,5) doğruluyor ve K-44'e istisna açıyor**
- **Boşluk:** **B8**

### K-133 · İştah artırmanın yolu: antrenman volümü ve kardiyo
- **Kural:** İştah zorla yemekle değil, **talep yaratarak** artırılır: antrenman volümünü artır, kardiyo miktarını artır. Vaktin varsa sabah-akşam antrenman metabolik hızı ve iştahı ciddi şekilde yükseltir. Ayrıca fazla lif iştahı tıkıyor olabilir. Tartıda hızlı artış bekleme, acele etme.
- **Sayı/eşik:** yok
- **Koşul:** İştahsızlık; hızlı metabolizma grubunda antrenmanlar **kısa** tutulmalı ve uzun LISS kardiyodan kaçınılmalı (aşağıya bak).
- **Gerekçe:** Harcama artınca vücut yemek ister.
- **Kaynak:** `IST18` (2018-11-12)
- **Alıntı:** "Yüksek antrenman volümü gerçekten işe yarıyor."
- **Kesinlik:** net kural
- **Boşluk:** B8
- ⚠ **İç gerilim:** Aynı videoda hızlı metabolizmalılara "uzun antrenman yapmasın, uzun low intensity kardiyoyla vakit kaybetmesin, HIIT yapabilir" deniyor. Yani iştah için volüm artışı **evet**, süre uzatma **hayır**.

### K-134 · Prebiyotik + probiyotik: bağırsak sağlığı için günlük
- **Kural:** **İnulin** (prebiyotik, ~4–5 g) düşük kalorili hacim de sağlar; **probiyotik** günden güne kullanılır. Bağırsak sağlığı için "önemli ürünler" deniyor.
- **Sayı/eşik:** inulin **~4–5 g** öğün başına
- **Koşul:** Rutin kullanım.
- **Gerekçe:** Doğrudan gerekçe verilmiyor; hacim + bağırsak sağlığı olarak geçiyor.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "İnülin prebiyotik … bir de probiyotik var, onu da günden güne kullanıyorum."
- **Kesinlik:** eğilim (vlog içinde geçiyor, sistematik anlatım değil)
- **Boşluk:** **B8** — **G6'nın "bağırsak sağlığı/probiyotik hiç yok" eksiğinin kapandığı tek yer**

### K-135 · Tarçın — insülin hassasiyeti için
- **Kural:** Tarçın insülin hassasiyeti için iyi bir baharat, tavsiye ediliyor.
- **Sayı/eşik:** yok
- **Koşul:** Karbonhidratlı öğünlerde.
- **Gerekçe:** Verilmiyor.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "Tarçın insülin hassasiyeti için güzel bir baharat."
- **Kesinlik:** dolaylı (tek cümle, gerekçesiz)
- **Boşluk:** B8 / B9 — **K-64'ün (insülin hassasiyeti: ağırlık + yağ oranı) yanına üçüncü, zayıf bir madde**

### K-136 · Ödem natürelde nadirdir — çözüm bol su ve SABİT sodyum
- **Kural:** Doğal kişilerde kalıcı ödem çok zor oluşur. Ödem genelde günlük/haftalık dalgalanmadır: normalde çok düşük sodyumlu beslenirsin, iki gün yüksek kalorili ve yüksek sodyumlu yersin, ödem tutar. **Sabit su, sabit sodyum, sabit mineral düzenin varsa ödem problemin olmaz.** Suyu atmanın en iyi yolu **bol su içmektir.**
- **Sayı/eşik:** yok
- **Koşul:** Natürel sporcu.
- **Gerekçe:** Ödemin asıl zararı kalbe yüktür.
- **Kaynak:** `PO1-19` (2019-04-04)
- **Alıntı:** "Suyu en güzel atmanın yolu bol su içmektir." `[ASR şüpheli: "bol süt" — bağlam su diyor]`
- **Kesinlik:** net kural — **K-29'un (kortizol suyu: protokol devam + bol su) mekanizması ve önlemi**
- **Boşluk:** B8 / B3

### K-137 · Diyette su tutmak — podyuma çıkmıyorsan AVANTAJ
- **Kural:** Diyette su tutmak, vücudunu sergileyeceğin bir gün yoksa aslında iyi bir şeydir. Diyette zaten karbonhidrat az, kaslar dolgusuz, tansiyon düşük, pump alınamıyor. Vücutta su ve sodyum tutabilirsen pumpı daha iyi alırsın. **7/24 tuz kesmiş halde gezmenin anlamı yok**; fotoğraf çekimi gibi bir gün varsa o zaman tuz ayarlanır.
- **Sayı/eşik:** yok
- **Koşul:** Yarışma/podyum/çekim yoksa.
- **Gerekçe:** Su tutumu düşük tansiyonu ve pump kaybını telafi ediyor.
- **Kaynak:** `G15-18` (2018-06-17)
- **Alıntı:** "Diyette su tutmak … oldukça güzel bir şey aslında."
- **Kesinlik:** net kural — **K-29'u (tartı durursa panik yok) tamamlıyor ve tuz kesme refleksini reddediyor**
- **Boşluk:** **B3 / B8**

### K-138 · Diyette kardiyo, uzun antrenmana tercih edilir
- **Kural:** Diyette glikojen depoları boşken uzun antrenman yapmak aminoasit yıkımını davet eder. Bunun yerine **bol miktarda düşük şiddetli (LISS) kardiyo** yapılır. LISS'te yakılan kalorinin **%90'ı yağdan** gelir. Yağ yakma bloğunda HIIT yerine LISS tercih edilir — sinir sistemini fazladan yormamak için.
- **Sayı/eşik:** LISS'te yağ payı **~%90** · süre **1–1,5 saat**, bantta eğim yükseltilerek · vakit darsa **15 dk HIIT > 15 dk LISS**, ama vakit varsa **1 saat LISS > 15 dk HIIT**
- **Koşul:** Yağ yakma fazı, glikojen düşük.
- **Gerekçe:** Boş depolarla uzun ağırlık antrenmanı kasa zarar; kardiyo aynı kaloriyi daha az yıpranmayla yakar.
- **Kaynak:** `2AY19` (2019-07-08) · `HYK17` (2017-11-27) · `PO2-19` (2019-07-31)
- **Alıntı:** "Uzun uzun kardiyo yaptım … low intensity kardiyoda ana yakıtımız yağ."
- **Kesinlik:** net kural — **K-62'yi (kısa diyette kardiyo) genişletiyor**
- **Boşluk:** B3

### K-139 · Aç karnına kardiyo: yakılan kalori aynı, fark supplement kullanıyorsan
- **Kural:** Aç ve tok kardiyo **aynı kaloriyi yakar**; araştırmalarda fark yok. Hoca sabah aç karnına yapmayı öneriyor ama gerekçesi "mental olarak daha iyi hissediyorum". **Tek gerçek fark:** yağ asidi salınımına yönelik supplement kullanıyorsan aç kardiyo daha faydalı olur.
- **Sayı/eşik:** yok
- **Koşul:** Supplement kullanımı varsa aç kardiyo anlamlı; yoksa saat serbest.
- **Gerekçe:** Sabah insülin en düşük, karaciğer depoları boşa yakın.
- **Kaynak:** `PO2-19` (2019-07-31) · `HYK17` (2017-11-27)
- **Alıntı:** "Kahvaltını yaptıktan sonra da kardiyonu yapsan aynı kaloriyi yakacaksın."
- **Kesinlik:** net kural
- **Boşluk:** B3 — **"sabah aç kardiyo şart" mitini hocanın kendisi sınırlıyor**

---

## G · ÇELİŞKİLER ve ZAMAN İÇİNDE DEĞİŞEN POZİSYONLAR

> Bu bölüm karar motoru için **kritik.** Aşağıdaki maddelerde hocanın iki farklı videoda söylediği
> şey uyuşmuyor. Karar motoruna tek bir sayı koyacaksan hangisini seçtiğini bilerek seçmelisin.

### Ç-1 · Kalori adımı: 300–500 mi, en az 500 mü?
- `HYK17` (2017-11): "300-500 öneriyoruz genelde" — ama bunu *uzun vadeli* diyet için söylüyor ve kendi sistemi için "daha yüksek olacak" diyor.
- `PO1-19` (2019-04): "300 kalori fazlayı hesaplayamazsınız … **en az 500 düşürün ya da en az 500 yükseltin.**"
- **Karar:** 2019 pozisyonu daha geç, daha gerekçeli (ölçüm hatası argümanı) ve daha operasyonel. **K-97'yi (min 500) esas al.** 300-500 bandını "literatürde geçen genel öneri" olarak etiketle.

### Ç-2 · Sert diyet süresi: 4–6 mı, 6–8 mi, 12–16 mı?
Üç farklı sayı üç farklı **şiddet** için veriliyor, çelişki değil katman:
| Kaynak | Süre | Neyin süresi |
| --- | --- | --- |
| K-19 (G6) | **4–6 hafta** | En agresif blok |
| K-104 (`HYK17`) | **6–8 hafta**, tavan 12 | Yüksek açıklı + yüksek kardiyolu sert diyet |
| K-102 (`IST18`) | **4–6 hafta** | Mini cut (bulk içinde) |
| K-65 (G6) | **12 hafta taban, 16'ya kadar** | Ciddi/yarışma hazırlığı |
| K-20 (G6) | **≥8 hafta** | Faz taahhüdü tabanı |
- **Karar:** Çelişki yok, **şiddete göre ölçekle.** Karar motoruna tek sayı değil, şiddet→süre eşlemesi konmalı.

### Ç-3 · Yağ tabanı: kalorilerin %15'i mi, günde 10–20 gram mı?
- `KET18` (2018-04): "Natürel kişiler kalorilerinin **%15'inin altına** inmesin."
- `HYK17` (2017-11): Sert kısa blokta "günde **15-20 gram**, belki 10 gram yağ. Bu kadar ekstrem."
- 2500 kcal'de %15 ≈ 42 g. Yani 15–20 g, %15 tabanının **çok altında.**
- **Karar:** `HYK17` kendi kuralını şöyle sınırlıyor: *"çok düşük yağlı sistemler genel sağlık için iyi olmayabilir ama **çok uzun tutmayacağımız için** sıkıntı yaşamayacağız."* → **%15 sürekli taban; 10–20 g yalnız 6–8 haftalık sert blok içinde ve süreli.** K-118'i varsayılan, K-104'ü istisna yap.

### Ç-4 · Pump yoksa antrenmanı yapma (K-76) ↔ diyette pump zaten olmaz (K-99)
- `HPT20`: pump alınamıyorsa antrenmanı yapma, kas iyileşmemiştir.
- `2AY19`: diyette pump alınamaması normaldir, sürecin kendisidir.
- **Karar:** K-76 kendi ön koşulunu söylüyor: *"iyi beslenip iyi su tükettiğinde."* **Diyette bu ön koşul sağlanmadığı için K-76 diyette geçersizdir.** Karar motoru: pump kuralı yalnız bakım/bulk fazında iyileşme göstergesi olarak kullanılır; diyet fazında pump kaybı beklenen davranıştır.

### Ç-5 · Karbonhidrat GI'si: "yüksek GI'de sabit kal" ↔ "yalnız antrenman çevresinde yüksek GI"
- `KRB18` (2018-04): "Yüksek glisemik indeksli karbonhidratlarda sabit kalmak gerektiğini düşünüyorum … sporcular için düşük GI iyi bir seçim değil."
- `PO1-19` (2019-04): "Antrenmanın akşam 6-7'deyse sabah/öğlen yüksek GI yemenin mantığı yok, düşük GI daha iyi olacaktır."
- **Karar:** 2019 daha ince ve zamanlama eksenli. **K-123'ü (antrenman çevresi yüksek GI, uzak öğünler düşük GI) esas al.** K-47 (pirinç sabit) antrenman çevresi öğünü için geçerli kalır.

### Ç-6 · Intermittent fasting: öneriyor mu, önermiyor mu?
- `HYK17` (2017-11): Kısa ve sert yağ yakma sisteminde **16/8 IF öneriyor**, "araştırmalar kısa vadede faydalı gösteriyor" diyor. Bulk'ta önermiyor.
- `PO2-19` (2019-07): "Intermittent fasting'i **hiçbir zaman önermedim, hiçbir zaman favori diyetlerimden biri olmadı.** Ketojenik ve bu — en gereksiz diyet ikilisi."
- `PO1-19` (2019-04): "Sabah öğün atlamak … bence mantıklı."
- **Karar:** Gerçek bir pozisyon değişimi (2017 → 2019) **ve** 2019'un kendi içinde tutarsızlığı var. **Karar motoruna IF konmamalı.** Hocanın son ve en net ifadesi olumsuz; ayrıca "hiçbir zaman önermedim" ifadesi 2017 videosuyla doğrudan çelişiyor — yani hoca kendi eski pozisyonunu hatırlamıyor. Bu maddede kanal **güvenilir kaynak değil.**

### Ç-7 · G6'nın "deload yok" sonucu
- Yukarıda ayrıntılı: G6 yanlıştı, kaynak eksikliğindendi. Bkz. dosyanın başındaki 🔴 bölüm.
- **Karar:** G6'nın D bölümündeki uyarı kutusu **geçersiz.** Yerine K-66…K-78 gelir.

---

## H · YAN BULGULAR

### K-140 · Kreatin zamanlaması önemsiz, tutarlılık önemli
- **Kural:** Kreatinin antrenman öncesi mi sonrası mı alınacağının araştırmalarda anlamlı farkı çıkmamış. Önce de sonra da alınabilir; tavsiye **her gün yaklaşık aynı saatte** almak.
- **Kaynak:** `PO1-19` (2019-04-04) · **Alıntı:** "Tavsiyem günün yaklaşık aynı zamanlarında alın." · **Kesinlik:** net kural · **Boşluk:** —

### K-141 · Diyette BCAA/EAA — bulk'ta gereksiz
- **Kural:** Ciddi kalori açığı olan diyet döneminde BCAA (ya da izole whey / EAA) "olmazsa olmaz"; açlık döneminde 3–4 saatte bir protein sentezini uyarmak için. **Bulk döneminde tercih edilmiyor.**
- **Kaynak:** `HYK17` (2017-11-27) · **Alıntı:** "Bulk döneminde çok tercih etmiyorum ama diyet döneminde olmazsa olmaz." · **Kesinlik:** eğilim · **Boşluk:** —

### K-142 · Kafein: kilo başına 2–8 mg, toleransı kırarak başla
- **Kural:** Kafeinden etki almanın koşulu tolerans. **Kilo başına 2–3 mg** ile başlanır, hissedilmedikçe artırılır; üst sınır **8 mg/kg**. Baştan yüksek gidilirse hassasiyet kalmaz. Bir dönem kafeini bırakıp öyle başlamak öneriliyor.
- **Kaynak:** `HYK17` (2017-11-27) · **Alıntı:** "Kilo başına 2-3 ile başlayın … hissetmedikçe artırın." · **Kesinlik:** net kural · **Boşluk:** —

### K-143 · Stimülan kuralı: sıklıkla ters orantılı
- **Kural:** Haftada 6 gün antrenman yapan biri her seans pre-workout/kafein kullanmamalı; yüksek kalorili bulk dönemindeysen zaten güçlü olmalısın, uyarıcıya gerek duymamalısın. Az gün çalışan ve yorgun olan kişide (nöbet, mesai) stimülan meşrulaşır. **Ne kadar yorgunsan ve ne kadar ağır/uzun antrenman hedefliyorsan o kadar stimülana ihtiyaç duyarsın.**
- **Kaynak:** `H3G19` (2019-02-08) · **Alıntı:** "6 gün antrenman yapıyorsanız ben asla tavsiye etmem." · **Kesinlik:** net kural · **Boşluk:** —
- ⚠ Aynı bölümde hocanın kendi kullanımı olarak efedrin ve melatonin de geçiyor; **kapsam dışı bırakıldı** (bkz. giriş).

### K-144 · Uykunun telafisi yok
- **Kural:** 24 saatlik nöbet gibi derin (REM) uykuya girilemeyen gecelerin **gündüz uykusuyla telafisi yok.** Vücut geliştirme için uyku önemli deniyor.
- **Kaynak:** `H3G19` (2019-02-08) · **Alıntı:** "Gündüz uykusuyla hiçbir şekilde telafi edemiyorsunuz." · **Kesinlik:** eğilim · **Boşluk:** B4 — **toparlanma denklemine uykuyu sokan tek ifade**

### K-145 · Bileşikte güç artmıyorsa: siklet sabitse güç sınırlıdır
- **Kural:** Bileşik hareketlerde ağırlık artıramamanın çok sayıda sebebi olabilir; genelde düşünülmeyen biri şu: **vücut kilon sabitse** bir yerden sonra gücü artırmak çok zorlaşır.
- **Kaynak:** `PO1-19` (2019-04-04) · **Alıntı:** "Vücut kilon sabitse bir yerden sonra gücünü artırman çok zor." · **Kesinlik:** net kural · **Boşluk:** B5 — **K-31/K-34'e "kilo almadan güç artışının bir tavanı var" boyutunu ekliyor**

### K-146 · Program paylaşmama gerekçesi
- **Kural:** Hoca hazır program paylaşmayı bilinçli olarak reddediyor; bunun yerine prensip ve "taktik" veriyor, kişi programını kendi kurmalı.
- **Kaynak:** `SC4-17` (2017-02-18) `[konuşmacı belirsiz]` · **Alıntı:** "Antrenman programı açıklamaktansa taktiklerini, yollarını vermek daha mantıklı." · **Kesinlik:** net kural
- **Boşluk:** — **metodolojik not:** kanalda hazır program aramak boşuna; kural çıkarımı doğru yaklaşım. (`HPT20`'de "ikinci videoda gün gün set set program yazacağım" deniyor — **o video takip edilmeli**, bu partide yok.)

---

# SON · G7'NİN BOŞLUKLARA KATKISI

| Kod | Boşluk | G6 sonrası | **G7 sonrası** | G7'nin eklediği |
| --- | --- | --- | --- | --- |
| **B1** | Bel / ölçüm eşiği | 🟡 KISMEN | 🟡 **KISMEN** | K-112 (yağın ayrılma sırası), K-106 (aylık takip). **Hâlâ cm eşiği yok** — bu hocanın pozisyonu, kaynak eksikliği değil |
| **B2** | Yağ oranı ölçümü | 🟢 DOLDU | 🟢 **DOLDU** | K-105 (karın kası görünürlüğü tavanı), K-131 (görsel teşhis) |
| **B3** | Kalori düşürme | 🟢 DOLDU | 🟢 **TAM DOLDU** | **K-98 (merdiven ölçütü = antrenman performansı) G6'nın kalan eksiğini kapattı.** + K-97 (500 adımı), K-100 (1700-1800 kardiyo eşiği), K-113, K-114, K-137, K-138, K-139 |
| **B4** | Plato ve deload | 🟡 KISMEN | 🟢 **DOLDU** | **13 yeni kural (K-66…K-78).** G6'nın "deload yok" sonucu düzeltildi. Operasyonel overtraining tanımı (K-73), tam mola protokolü (K-70), ters test (K-74) |
| **B5** | Ağırlık artırma | 🟢 DOLDU | 🟢 **DOLDU** | K-145 (siklet sabitse güç tavanı), K-94 (metabolik stres/şaşırtma) |
| **B6** | Bulk eşiği | 🟢 DOLDU | 🟢 **DOLDU** | K-105, K-106 (**28 cm kol**), K-101 (bulk'ta kardiyo), K-102 (mini cut), K-107 |
| **B7** | Diyet bitişi / sonrası | 🟢 DOLDU (süre) | 🟡 **KISMEN** | K-103 (1 haftalık diet break), K-116 (form koruma fazı), K-119 (diyet bozulunca: ertesi gün kardiyo, devam), K-108. **Tam bir "reverse diet" protokolü hâlâ yok** — ama artık boşluk eskisi kadar büyük değil |
| **B8** | Lif, sindirim, bağırsak | 🟡 KISMEN | 🟡 **KISMEN** | **K-134 probiyotik/prebiyotik eksiğini kapattı.** + K-130 (zorla yeme yasağı), K-132 (iştahsızlık protokolü), K-136 (ödem). **Gram cinsinden lif hedefi hâlâ yok** ve K-132 lifi *azaltmayı* söylüyor — hoca lifi hedef değil, ayarlanacak değişken görüyor |
| **B9** | Karbonhidrat | 🟢 DOLDU | 🟢 **TAM DOLDU** | 13 yeni kural (K-117…K-129). Kalorik açığı yağdan verme, %50 glikojen eşiği, glikoz/fruktoz, GI zamanlaması, carb backloading, off-gün/antrenman-günü ayrımı |
| **B10** | Gün / split / volüm | 🟢 DOLDU | 🟢 **TAM DOLDU** | **18 yeni kural (K-79…K-96).** `HPT20` kanalın en sistematik antrenman kaynağı. Çalışma seti tanımı (K-83), çöp volüm (K-84), tükeniş kotası (K-85), set arası dinlenme (K-90) |
| **B11** | Ölçüm ve takip | 🟢 DOLDU | 🟢 **DOLDU** | K-109 (diyette forma bakma), K-110 (kas kaybı ölçütü), K-111 (flat/full), K-115 (**fotoğraf yanlılığı uyarısı**), K-121 |
| **B12** | Yeni başlayan | 🟢 DOLDU | 🟢 **DOLDU** | K-82 (yeni başlayanda frekans tavanı yüksek), K-107, K-93 |
| **B13** | Kadın | 🔴 BOŞ | 🔴 **BOŞ** | Hiçbir şey. Bu 12 videoda da kadına özel tek satır yok. **Bu boşluk Güray'dan doldurulamaz.** |

## Sayısal özet

| | G6 sonrası | G7 sonrası |
| --- | --- | --- |
| Toplam kural | 65 | **146** |
| 🟢 DOLDU | 8 | **10** |
| 🟡 KISMEN | 4 | **3** |
| 🔴 BOŞ | 1 | **1** |

---

## Hâlâ boş kalanlar — ve gerçekten doldurulabilir mi?

1. **Bel çevresi sayısal eşiği (B1)** — **doldurulamaz.** G6'nın teşhisi doğruydu: hoca mutlak eşik
   vermiyor, kişinin kendi trendine bakıyor. K-112 bunun yerine bir *sıralama* veriyor (ön kol → kol →
   karın üstü → karın altı). Karar motoruna cm eşiği koyacaksan dış kaynaktan alıp **ayrı etiketle.**

2. **Gram cinsinden lif hedefi (B8)** — **doldurulamaz ve zaten hocanın modeline aykırı.** İki ayrı
   videoda lif *azaltılacak* bir değişken olarak geçiyor (K-132 iştahsızlıkta, K-52 antrenman öncesinde).
   Hoca lifi hedefle değil **sebze hacmi + su + hacim vericiler** (ksantan gam, inulin) üzerinden kuruyor.
   Karar motoruna "günde X g lif" koyma; yerine "sebze hacmi + bol su + antrenman öncesi lif yok" koy.

3. **Tam reverse diet protokolü (B7)** — **muhtemelen doldurulabilir.** Elde artık K-103 (1 haftalık ara),
   K-116 (form koruma), K-119 (bozulunca toparlama) var ama "diyet bitti, kalorileri kaç haftada nasıl
   geri yükleyeceğim" sorusunun cevabı yok. **Aday:** `HPT20`'de söz verilen **program videosu**
   (K-146) ve G6'da işaretlenen `ruaID7b5t_0`, `2Fg5zOAAsD0`.

4. **Kadın (B13)** — **doldurulamaz.** Kanalda kaynak yok, iki dolaylı ifade dışında (K-59, K-60).

5. **`HPT20`'nin devam videosu** — hoca *"ikinci videoda bunlara uygun bir program yazacağım, gün gün
   set set"* diyor. **Bu video bulunmalı.** Kanaldaki en yüksek değerli tek kaynak olabilir: bu dosyadaki
   K-79…K-96'nın somut programa dönüşmüş hâli.

---

## Ek · Üretilen dosyalar

```
_transkript/eski/
├── 20170218_YZdARtovIfI.{mp3,whisper.txt}    SC4-17   20.5 dk  2413 kelime
├── 20171017_FV56znnFgF0.{mp3,whisper.txt}    BD17      6.5 dk   741 kelime
├── 20171127_2uZLxGnBmLo.{mp3,whisper.txt}    HYK17    19.6 dk  2292 kelime
├── 20180404_zE-zRpBJh7c.{mp3,whisper.txt}    KRB18    11.7 dk  1187 kelime
├── 20180418_boqyZ2UO1M0.{mp3,whisper.txt}    KET18    14.8 dk  1477 kelime
├── 20180617_MAIv3wK1Mck.{mp3,whisper.txt}    G15-18   26.8 dk  2719 kelime
├── 20181112_N6V03JePvJE.{mp3,whisper.txt}    IST18    10.9 dk  1135 kelime
├── 20190208_lpPwk-3lS60.{mp3,whisper.txt}    H3G19    12.5 dk  1489 kelime
├── 20190404_yQOgRMb-7p4.{mp3,whisper.txt}    PO1-19   28.5 dk  3318 kelime
├── 20190708_5vGYz_o6w7A.{mp3,whisper.txt}    2AY19    16.9 dk  1892 kelime
├── 20190731_NPg9eJxx6ws.{mp3,whisper.txt}    PO2-19   29.5 dk  3135 kelime
└── 20200212_mhFCuEgTL2g.{mp3,whisper.txt}    HPT20    35.5 dk  4172 kelime
```
mp3'ler toplam ~200 MB. Transkriptler çıkarıldığına göre **silinebilir** — ama `SC4-17`'nin sesi
K-68'deki kararsız cümle yüzünden saklanmalı (ileride daha iyi bir modelle tekrar dinlenebilir).
