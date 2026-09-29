# L2 · Görsel kimlik denetimi: C yönü başkasının kimliğini çalıyor mu?

- **Tarih:** 2026-09-29 · **Durum:** TAMAMLANDI
- **Denetlenen:** ADR-014 "C — cesur, enerjik" · `prototip/keel-prototype.html` `.v-c` token'ları
- **Yöntem:** resmî marka sayfaları/PDF'leri + App Store ikonlarının piksel örneklemesi (iTunes Lookup API, 512px JPEG, doygun piksellerin medyanı) + App Store ekran görüntüleri + Python (`scikit-image` `deltaE_ciede2000`, WCAG 2.x göreli parlaklık formülü). Scriptler: oturum scratchpad'i (`col.py`, `comp.py`).
- **Kanıt etiketleri:** **[RESMÎ]** markanın kendi kaynağı · **[İKON]** App Store ikonundan örneklendi (JPEG sıkıştırması ±2-3 ΔE sapma yapabilir) · **[3.P]** üçüncü taraf renk sitesi · **[doğrulanmadı]**

---

## 0 · Özet yargı

1. **`#FF4F12` fiilen Strava turuncusu.** Strava'nın yaygın hex'i `#FC4C02`'ye **ΔE00 = 1,3**, Strava'nın kendi geliştirici kılavuzundaki güncel `#FC5200`'e **ΔE00 = 2,0**. ΔE00 ≈ 1 eğitimli gözün yan yana ayırt edebildiği eşik; 2'nin altı pratikte aynı renk. Görsel testte (mevcut vs Strava yan yana) fark görülmüyor.
2. **Kombinasyon da Strava'nın.** Strava'nın resmî logo seti "orange, white, and black"; marka kılavuzu turuncuyu "sparingly and for emphasis" kullanmayı söylüyor. C tam olarak bu: beyaz + siyah + tek turuncu vurgu. Üstelik Strava'nın 2026 App Store ekran görüntüleri koyu UI + turuncu. Strava artık **Runna'nın da sahibi** (App Store satıcısı: Strava Inc.) ve **koçluk / kişisel fitness** sınıfında tescilli kelime markası var. Yani keel doğrudan Strava'nın oynadığı sahada.
3. **Hukuki durum.** Bulunan Strava kayıtları (US 3877582, US 5207743) **standart karakter (kelime) markası**; tescilli bir **renk markası bulunamadı** (tam tarama yapılmadı, USPTO tam aramasıyla teyit edilmeli). Ama ABD'de renk tescilsiz de korunabilir (Qualitex v. Jacobson, 1995: ayırt edicilik kazanmış renk marka olabilir; §43(a) haksız rekabet). Strava IP konusunda dava açmaktan çekinmiyor (2025'te Garmin'e patent davası). **Risk düşük olasılıklı ama yüksek maliyetli**; asıl maliyet hukuki değil algısal: kullanıcı "Strava klonu" diye okur.
4. **Turuncu bölge fitness'ta dolu.** Strava, Orangetheory (ikon `#F64B06`, ΔE 2,1), Zwift (`#F2541B`, ΔE 2,1), Gentler Streak (`#FF7638`, ΔE 7,3). Parlak turunculardan hiçbiri bu dört markadan ΔE ≥ 10 uzaklaşamıyor (hesaplandı, §1.3). **Turuncuyu koruyup çakışmadan kurtulmak mümkün değil**; ancak koyulaştırınca (yanık turuncu) uzaklaşıyor, o zaman da enerji düşüyor.
5. **İkinci kuşak AI slop işareti.** "Near-black + tek vermilion (kırmızımsı turuncu) sinyal" ve "aralıklı büyük harf eyebrow'lar" 2026'da AI tasarım denetim araçlarının açıkça işaretlediği kalıplar (§7). C ikisini de taşıyor.
6. **Prototipte iki somut hata:** (a) `.go` butonlarında beyaz metin `#FF4F12` üzerinde **3,29:1** → 12,5px metin için WCAG AA (4,5:1) **başarısız**. (b) `--warn: #FF4F12` = `--ac`: uyarı rengi vurgu rengiyle aynı → her CTA ve karar "uyarı" gibi okunuyor.

**Öneri (§8):** C'nin iskeleti (beyaz zemin, siyah karar bloğu, dar büyük harf başlık, tek sıcak vurgu, keskin köşeler) kalsın; **vurgu rengi Rubin `#B0129A`'ya** geçsin, koyu zemin karşılığı `#F07BE0`. Uyarı rengi ayrı token olsun. Gövde fontu SF Pro'ya (sistem) geçsin.

---

## 1 · Rakip palet denetimi

### 1.1 Strava: hex doğrulaması

| Değer | Kaynak | `#FF4F12`'ye ΔE00 |
|---|---|---|
| `#FC5200` | **[RESMÎ]** Strava API marka kılavuzu, link rengi: https://developers.strava.com/guidelines/ | **2,0** |
| `#FC4C02` | **[3.P]** brandcolors / brandpalettes / schemecolor ("International Orange (Aerospace)", PMS 1655 C). 2021 marka kılavuzu slaytında "Strava Orange" var ama hex metin olarak görünmedi: https://www.deck.gallery/strava-brand-guidelines-2021/slide/31-primary-and-supporting-colors-defines/ | **1,3** |
| `#EE4D00` (gradyan medyanı; bazı pikseller ΔE 0,8) | **[İKON]** App Store ikonu | 3,7 |

- İddia (`#FC4C02`) **kısmen doğru**: yaygın ve eski değer bu; Strava'nın kendi güncel belgesi `#FC5200` diyor. İkisi arası ΔE ≈ 1, fark önemsiz.
- 2024 yenilemesi: yeni ikon kütüphanesi, koyu tema, yeni font (Boathouse, Grilli Type); UI'da Inter. https://griffdesigns.com/strava · https://sensatype.com/what-font-does-strava-use-in-2026
- 2021 kılavuzunda turuncunun yanında Pumpkin, Rust, Coal, Gravel, Fog, Icicle, Silver yardımcı tonları var.

### 1.2 Rakip tablosu

ΔE00 `#FF4F12`'ye göre. "Akromatik" = ikonda anlamlı doygun renk yok (siyah/beyaz marka).

| Uygulama | Ana renk hex | Kaynak | ΔE → `#FF4F12` |
|---|---|---|---|
| **Strava** | `#FC5200` / `#FC4C02` | [RESMÎ] / [3.P] | **2,0 / 1,3** |
| **Runna** (Strava'ya ait) | ikon `#166A5C` yeşil + koyu | [İKON]; satıcı Strava Inc. (App Store) | 56,7 |
| **Orangetheory** (ek) | ikon `#F64B06` | [İKON] | **2,1** |
| **Zwift** (ek) | `#F2541B` / ikon `#FD671A` | [3.P] logotyp.us / [İKON] | **2,1 / 5,2** |
| **Gentler Streak** | ikon `#FF7638` (gradyan) | [İKON] | 7,3 |
| Caliber | ikon `#FE0000` + lacivert `#000634` | [İKON] | 7,6 |
| WHOOP | siyah `#000000`, beyaz, CTA teal `#00F19F`, strain `#0093E7`, recovery `#16EC06`/`#FFDE00`/`#FF0026`, sleep `#7BA1BB`; font DINPro | [RESMÎ] WHOOP Brand & Design Guidelines PDF (developer.whoop.com) | kırmızı 7,4 |
| Peloton | Cardinal `#C41F2F`, Woodsmoke `#101113` | [3.P] mobbin/eggradients; ikon akromatik | 20,7 |
| Fitbod | ikon `#EA1E4B` | [İKON] | 19,5 |
| COROS (ek) | ikon `#F7283A` | [İKON] | 13,0 |
| Suunto (ek) | ikon `#EE2121` | [İKON] | 10,5 |
| Polar (ek) | ikon `#D10027` | [İKON] | 19,0 |
| Nike Training Club | akromatik (beyaz zemin, siyah swoosh) | [İKON] | — |
| Nike Run Club | akromatik ikon; uygulama içinde Volt vurgu [hex doğrulanmadı] | [İKON] | — |
| Oura | akromatik (`#19181D` koyu) | [İKON] | — |
| Hevy | akromatik ikon; UI mavi [hex doğrulanmadı] | [İKON] | — |
| Strong | ikon `#35A7FF` + `#172935` | [İKON] | 52,9 |
| MacroFactor | akromatik (siyah/beyaz) | [İKON] | — |
| Ladder | ikon `#E0FF01` (volt) | [İKON] | 61,4 |
| Cal AI | akromatik (`#1D1A23`) | [İKON] | — |
| Zing | ikon `#194CE5` + `#F9C937` | [İKON] | 53,8 / 38,5 |
| Freeletics | akromatik (`#161E21`) | [İKON] | — |
| Future | akromatik (siyah) | [İKON] | — |
| Garmin Connect | ikon `#54A8FE` + `#494748` | [İKON] | 51,5 |
| MyFitnessPal | ikon `#0066EE` | [İKON] | 52,0 |
| Gymshark (Training) | ikon `#00C2FF` | [İKON] | 60,4 |
| Apple Fitness | halkalar: Move `#FA114F` [3.P], ikon pembe `#FF0090`, lime `#BEFF01`, cyan `#01FEF6` | [İKON] | 19,1 (Move) |
| SoundCloud (fitness dışı) | `#FF5500` | [3.P] | 2,5 |

**Okuma:** 21 rakibin 10'u ikonunda akromatik (siyah/beyaz). Yani "siyah + beyaz" tek başına kimse değil. Rengi olanlar arasında turuncu bölge Strava + Orangetheory + Zwift tarafından tutulmuş; kırmızı bölge Caliber, WHOOP, COROS, Suunto, Polar, Peloton. Mavi bölge kalabalık (MFP, Garmin, Strong, Zing, Gymshark, ClassPass). Pembe bölge **kadın odaklı** uygulamalarda (Sweat `#FE578F`, Flo `#FF6A8A`, obé). Boş kalan: derin yeşil ve kırmızı tarafındaki macenta.

### 1.3 Boş renk alanı taraması (hesap)
CIELAB'da L 38–92, kroma ≥ 70 ızgarası taranıp her aday için yukarıdaki tüm rakipler + 12 iOS sistem rengi + bilinen renk markaları (T-Mobile macentası, Spotify, Robinhood, Lyft, Duolingo, Home Depot, SoundCloud) + AI slop renkleri (Tailwind indigo `#6366F1`, Claude varsayılan turuncusu `#D9622B`) arasındaki **en küçük ΔE00** ölçüldü.

| Ton bölgesi | En uzak doygun aday | En yakın komşu (ΔE) | Yorum |
|---|---|---|---|
| Parlak turuncu | yok | Strava/OTF/Zwift/systemOrange hep < 8 | Kapalı |
| Yanık turuncu | `#B83800` | Texas burnt orange 9,4 · Suunto/Polar 12,4 · Strava 13,2 | Uzak ama enerjisi düşük |
| Kırmızı | yok | Caliber/WHOOP/Suunto < 8 | Kapalı + "hata" anlamı |
| Macenta (kırmızı tarafı) | `#B0129A` | systemPurple 14,6 · T-Mobile 15,5 · Lyft 16,8 · Apple Fitness pembesi 18,3 | **Açık** |
| Derin yeşil | `#0B7F05` / `#148A00` | Runna 21,6 · Robinhood 18,7 · systemGreen 19 | **En açık** |
| Açık yeşil / volt | yok | Spotify, WHOOP, Ladder, Apple Exercise < 7 | Kapalı + "acid green" slop |
| Ultramarin | `#1F2BFF` | Zing 7,6 · systemIndigo 10,3 | Sınırda, mor-mavi slop'a yakın |

Tek bir renk hem beyaz üstünde (≥ 3:1) hem siyah üstünde (≥ 4,5:1) çalışsın **ve** tüm rakiplerden ΔE ≥ 10 olsun diye kısıtlayınca yalnız düşük kromalı (enerjisiz) yeşil/zeytin kalıyor. `#FF4F12`'yi cazip yapan şey tam da buydu: orta parlaklık, iki zeminde de çalışıyor. Bu yüzden öneriler **iki token'lı** (dolgu rengi + koyu zemin rengi), Apple'ın sistem renklerinin de açık/koyu karşılığı olduğu gibi.

---

## 2 · Tipografi

| Marka | Başlık fontu | Kaynak |
|---|---|---|
| Nike | Futura ND Nike 365 (özel, dar Futura Extra Bold Condensed), dijitalde Trade Gothic Bold Condensed | https://elements.envato.com/learn/what-font-does-nike-use · https://www.cedilla.studio/blog/nike-logo-font |
| Strava | Boathouse (özel, Grilli Type), UI Inter | https://sensatype.com/what-font-does-strava-use-in-2026 |
| Gymshark | Bebas Neue benzeri dar geometrik grotesk; tanıtımda Druk Condensed [3.P] | https://1000logos.net/gymshark-logo/ · https://www.shadcn.io/design/gymshark |
| WHOOP | DINPro | [RESMÎ] WHOOP guidelines PDF |
| Ladder, MacroFactor, Hevy | App Store ekran görüntülerinde dar, kalın, büyük harf başlık | [İKON/ekran görüntüsü örneklemesi] |

- **Barlow / Barlow Condensed'i kurumsal olarak kullanan bilinen bir fitness markası bulunamadı.** Yani çalıntı riski yok.
- Ama **ayırt edici de değil**: "en iyi ücretsiz fitness fontu" listelerinde Barlow 2. sırada (https://fontalternatives.com/best-fonts-for/fitness-wellness/). Dar büyük harf başlık kategorinin standart dili (Nike, Gymshark, Ladder, MacroFactor). Barlow Condensed "atletik şablon" gibi okunur, "keel" gibi değil.
- **Apple HIG (Branding, 9 Eylül 2026'da güncellendi):** "use a custom font for headlines and subheadings while using system fonts for body copy and captions". Kaynak: https://developer.apple.com/design/human-interface-guidelines/branding. → Gövdede Barlow yerine **SF Pro (sistem)**. Böylece Dynamic Type ve Bold Text bedavaya gelir, küçük punto okunaklılığı artar.
- HIG Typography: iOS varsayılan 17pt, minimum 11pt. Prototipte 10,5px sekme etiketi ve 12px meta var; gerçek uygulamada 11pt altına inilmemeli.

---

## 3 · iOS 26/27 tasarım dili (Liquid Glass)

**Resmî kural seti (HIG, JSON uç noktasından okundu):**
- Liquid Glass **kontroller ve gezinme katmanı** içindir (tab bar, toolbar, sidebar); içerik katmanının üstünde yüzer. "Use Liquid Glass effects sparingly." İçerik katmanında standart materyaller kullanılır. https://developer.apple.com/design/human-interface-guidelines/materials
- Renk: "Apply color sparingly to the Liquid Glass material… reserve it for… status indicators or primary actions." Birincil aksiyonda renk **metne değil arka plana** verilir. "Refrain from adding color to the background of multiple controls." https://developer.apple.com/design/human-interface-guidelines/color
- **Branding (9 Eylül 2026):** "Apply your app's accent color judiciously… To express your brand through color, consider moving it into the content layer, where it scrolls beneath Liquid Glass controls." https://developer.apple.com/design/human-interface-guidelines/branding
- "Even if your app ships in a single appearance mode, provide both light and dark colors to support Liquid Glass adaptivity." (Color). Kontrast: en az 4,5:1, küçük metinde 7:1'e çalış (Dark Mode sayfası).

**iOS 27 (WWDC 2026):** Liquid Glass karmaşık arka planı daha iyi dağıtıyor, kenarlara koyu çizgi geldi, ayarlarda "ultra clear → fully tinted" şeffaflık kaydırıcısı var, içerik kayarken üst çubuk düz toolbar'a dönüyor, Reduce Transparency / Increase Contrast'a otomatik uyuyor. https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/

**Apple Design Awards 2026, sağlık/fitness:** finalist *The Outsiders: Athlete Tracker* (Gentler Streak ekibi, Interaction; Training Readiness görselleştirmesi), kazanan *Harvee* (Social Impact; HRV + cihaz üstü AI ile toparlanma). Görsel ödüller: *Tide Guide* (kazanan) ve *(Not Boring) Camera* (finalist; "bold '70s-'80s design with giant buttons"). https://developer.apple.com/design/awards/ → Apple **cesur, düz, grafik dilleri de ödüllendiriyor**. Yeter ki platform davranışına saygılı olsun.

**Yargı: düz ve sert C dili eski görünür mü?** Görünmez, **doğru katmana konursa**. Apple'ın kendi kuralı içerik katmanının markayı taşıması, cam katmanın nötr kalması. C'nin düz beyaz yüzeyleri, siyah karar blokları ve dar başlıkları **içerik katmanı** olarak meşru ve cam katmanla kontrast yaratıyor. Eski görünecek olan: özel çizilmiş opak tab bar, özel alt sayfalar/menüler.

**Birleştirme reçetesi (Expo SDK 57):**
1. Tab bar: expo-router **Native Tabs** (SDK 54+'ta var; iOS 26'da sistem Liquid Glass'ı otomatik). Seçili sekme rengi = vurgu, başka yerde cam üstünde renk yok. https://docs.expo.dev/router/advanced/native-tabs/
2. Toolbar/sheet/menü: sistem bileşenleri. Özel cam gerekiyorsa `expo-glass-effect`, en fazla bir yerde.
3. İçerik: C dili (düz yüzey, 6px kart, siyah karar bloğu). İçeriğe cam, bulanıklık, gölge yok.
4. Birincil aksiyon: dolgu = vurgu rengi, metin beyaz (HIG'in "arka plana renk" kuralı).

---

## 4 · Koyu mod

- **HIG:** kullanıcılar sistem tercihlerine saygı bekliyor; "Avoid offering an app-specific appearance setting"; tek modda çıksan bile iki renk seti ver. https://developer.apple.com/design/human-interface-guidelines/dark-mode
- **NN/g:** normal görüşte açık mod (pozitif polarite) okumada daha iyi, fark küçük puntoda büyüyor. Katarakt gibi durumlarda koyu mod daha iyi. Öneri: açık varsayılan, koyu seçenek. https://www.nngroup.com/articles/dark-mode/
- Genel koyu mod kullanım oranları (%70-82) anket/oylama kaynaklı, seçim yanlılığı yüksek **[ZAYIF]**. Spor salonu ışığında koyu/açık tercihine dair hakemli çalışma **bulunamadı**.
- **Rakiplerin App Store vitrini** (ekran görüntülerinde koyu piksel oranı, benim ölçümüm): koyu ağırlıklı WHOOP 0,88 · Oura 0,87 · Outsiders 0,81 · **Strava 0,77** · MacroFactor 0,71 · Runna 0,64. Açık ağırlıklı MyFitnessPal 0,03 · Zing 0,06 · Hevy 0,08 · Bevel 0,14 · Gentler Streak 0,17 · Freeletics 0,22. Kategori ikiye bölünmüş; "veri/recovery" tarafı koyu, "log/coach" tarafı açık.
- **Sonuç: koyu varyant gerekli** (HIG zorunluluğu + gece antrenmanı), **varsayılan = sistem**. C'nin açık hali ana kimlik. Koyu modda karar bloğu siyah üstünde siyah kalamaz → kural: **karar bloğu her zaman zeminin tersi** (açıkta `#0E0E0E` blok, koyuda `#F2F2F0` blok + siyah metin). "Karar ayrı durur" hissi iki modda da korunur.

---

## 5 · Renk psikolojisi: kanıt vs pop-psikoloji

| İddia | Kanıt durumu | Kaynak |
|---|---|---|
| "Turuncu enerji verir / motive eder" | **[YOK]** Turuncuya özgü hakemli motivasyon kanıtı bulunamadı; pazarlama bloglarının tekrarı. | — |
| Alan genel olarak | **[GÜÇLÜ uyarı]** Elliot (2015): literatür "nascent stage"; teori ve uygulama sonuçlarında "patience and prudence" önerir. | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4383146/ |
| Kırmızı zihinsel performansı düşürür (Elliot ve ark. 2007) | **[ÇÜRÜK]** 1.149 kişilik örneklem dahil 4 replikasyonda etki yok. | https://online.ucpress.edu/collabra/article/6/1/3/113047/ |
| Kırmızı = tehlike örtük çağrışımı | **[ORTA-GÜÇLÜ]** Açıklık ve kroma eşitlenmiş Stroop görevlerinde güçlü kırmızı-tehlike bağı; yeşil-güvenlik bağı zayıf. | Pravossoudovitch ve ark. 2014, *Ergonomics* 57(4) https://doi.org/10.1080/00140139.2014.889220 |
| Turuncu = UYARI | **[STANDART]** ANSI Z535: kırmızı DANGER, **turuncu WARNING**, sarı CAUTION. | https://incompliancemag.com/ansi-z535-1-safety-colors-in-focus/ |
| Kırmızı geri bildirim "sert/bağırıyor" okunur | **[ORTA]** 199 öğrenci: aynı yorum kırmızıyla yazılınca eğitmen daha az nazik, uyumu daha düşük algılandı; içerik değerlendirmesi değişmedi. Önerileri: nötr renk. | Dukes & Albanesi 2013, *Social Science Journal* https://www.sciencedirect.com/science/article/abs/pii/S0362331912000638 |
| Kırmızı → "heyecan", mavi → "yetkinlik"; doygunluk heyecanı artırır | **[ORTA]** Marka kişiliği çalışması (4 çalışma). | Labrecque & Milne 2012, *JAMS* https://link.springer.com/article/10.1007/s11747-010-0245-y |

**Karar kartına uygulanışı:** "turuncu kullanıcıyı suçlanmış hissettirir" iddiasını doğrudan test eden çalışma yok. İki dolaylı kanıt aynı yöne bakıyor: (1) kırmızı-turuncu tehlike/uyarı kodu hem standartta hem örtük çağrışımda var; (2) kırmızıyla verilen düzeltici geri bildirim, içerik aynı olsa bile daha sert algılanıyor. keel'in kararlarının çoğu **düzeltici** ("bir set düş", "kaloriyi kıs"). Vermilion eyebrow + düzeltici metin, suçlamayan ton hedefine ters çalışıyor. Fitness kullanıcısı bu kodu zaten öğrenmiş: WHOOP'ta kırmızı = düşük recovery. Pratik kural: **vurgu rengi kararı işaretler, iyi/kötü değerlendirmesi taşımaz; uyarı/hata ayrı bir renk ailesine gider.** Bu ayrım turuncu/kırmızı vurguda yapılamaz, macenta veya yeşilde yapılabilir.

---

## 6 · Erişilebilirlik (WCAG 2.x kontrast, hesaplandı)

| Renk | Beyaz üstünde | `#0E0E0E` üstünde | Üzerinde beyaz metin | Not |
|---|---|---|---|---|
| **`#FF4F12` (mevcut)** | 3,29 (yalnız büyük metin/grafik) | 5,86 ✓ | **3,29 ✗** (butonlar AA'yı geçmiyor) | Strava ile aynı sorun (`#FC5200`: 3,31) |
| `#B0129A` Rubin | **6,18 ✓** | 3,12 | **6,18 ✓** | Metin olarak da kullanılabilir |
| `#F07BE0` Rubin-koyu | 2,44 | **7,92 ✓** | — | Siyah blok/koyu mod metni |
| `#0B7F05` Saha | **5,18 ✓** | 3,73 | **5,18 ✓** | |
| `#9BE7A6` Saha-koyu | 1,46 | **13,21 ✓** | — | |
| `#B83800` Kor | **5,83 ✓** | 3,31 | **5,83 ✓** | |
| `#FF9A70` Kor-koyu | 2,08 | **9,29 ✓** | — | |
| `#6B6B68` (mevcut `--mu`) | 5,35 ✓ | — | — | `#F2F2F0` üstünde 4,77 ✓ |

Eşikler: normal metin 4,5:1; büyük metin (≥ 24px veya ≥ 18,66px kalın) ve grafik/UI öğesi 3:1. Apple ayrıca küçük metinde 7:1 öneriyor.

---

## 7 · 2026'da "AI slop" arayüz işaretleri

**Birinci kuşak (herkesin bildiği):** Inter her yerde; indigo→mor gradyan ("VibeCode Purple"; Tailwind'in `bg-indigo-500` mirası, Adam Wathan'ın Ağustos 2025 özrü); üç eş yuvarlak kart; rozetli ortalanmış hero; emoji ikonlu menü; renkli glow/gölge; kartlarda renkli sol kenarlık; "1-2-3" adım dizisi; istatistik bandı; **tüm başlıkların ve etiketlerin büyük harf olması**.
https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it · https://www.925studios.co/blog/ai-slop-design-tells · https://claude.com/blog/improving-frontend-design-through-skills

**İkinci kuşak (moru bırakınca gelen "zevkli varsayılanlar"):** krem + terracotta; **"near-black with one acid-green or vermilion signal"**; "tracked all-caps eyebrows"; dekoratif "01 / 02 / 03"; tek vurgulu başlık kelimesi; ince gazete çizgileri; Space Grotesk, Geist, Instrument Serif, Fraunces.
https://github.com/funboy322/avoid-ai-design · Claude varsayılanı örneklemesi (krem `#F7F1E4`, mürekkep `#211D18`, turuncu `#D9622B`): https://www.generativelabs.com/insights/why-ai-design-tools-look-the-same

**C'nin karnesi:**
| İşaret | C'de var mı |
|---|---|
| Inter / mor gradyan / emoji / glow | Yok ✓ |
| Near-black + tek vermilion sinyal | **Var** (`#0E0E0E` + `#FF4F12`) |
| Aralıklı büyük harf eyebrow | **Var** (`.eyebrow letter-spacing:.14em`) |
| Her şey büyük harf | **Kısmen** (gün, kart başlıkları, butonlar, karar başlığı) |
| Pill çip (radius 20px), 6px/4px sistemiyle çelişiyor | Var (küçük tutarsızlık) |

**Kaçınma kuralları (keel için somut):**
1. Büyük harfi **yalnız iki yerde** kullan: ekran başlığı (gün) ve karar başlığı. Kart başlıkları, butonlar ve eyebrow'lar cümle düzeninde ya da sayısal olsun.
2. Eyebrow yerine **veri etiketi** kullan: "TODAY'S CALL" yerine motorun gerekçesi ("RIR 0 on last 2 sets").
3. Vurgu rengi ekranda **tek işe** yarasın: birincil aksiyon + kararın sayısı. Dekoratif kullanım yok.
4. Kimliği renk taşımasın, **yapı** taşısın: karar bloğu (zeminin tersi), büyük sayı, gerekçe satırı. Rakiplerde olmayan şey bu.
5. Gerçek veriyle tasarla: "142 g", "3 × 8 @ 80 kg". Lorem, yuvarlak placeholder sayılar yok.

---

## 8 · Üç somut öneri (C'nin enerjisini koruyarak)

Üçünde de korunan: beyaz zemin `#FFFFFF`, mürekkep `#0E0E0E`, yüzey `#F2F2F0`, çizgi `#E4E4E1`, radius 6/4px, siyah karar bloğu (koyuda ters), dar başlık + **SF Pro gövde**. Değişen: vurgu çifti, uyarı token'ı, başlık fontu.
**Ortak uyarı token'ı (hepsinde):** `--warn` açık `#D12F1F` (beyazda 5,08) / koyu `#FF6B5A` (siyahta 6,90). Vurgudan ayrı.

### Öneri 1 · RUBİN ★ önerilen
| Token | Açık mod | Koyu mod |
|---|---|---|
| `--ac` (dolgu, beyaz metinli buton) | `#B0129A` | `#B0129A` |
| `--ac-ink` (siyah blok üstü metin/sayı) | `#F07BE0` | `#F07BE0` |
| karar bloğu | `#0E0E0E` + beyaz metin | `#F2F2F0` + `#0E0E0E` metin, eyebrow `#B0129A` |
- **En yakın rakip ΔE00:** systemPurple 14,6 · T-Mobile macentası 15,5 · Lyft 16,8 · Apple Fitness pembesi 18,3 · Sweat 25 · **Strava 44**. Koyu ton `#F07BE0`: Lyft 12,4.
- **WCAG:** beyaz metin/`#B0129A` 6,18 ✓ · `#B0129A` beyazda metin 6,18 ✓ · `#F07BE0` siyahta 7,92 ✓.
- **Tipografi:** başlık **Barlow Condensed 700/800 (kalsın)** veya daha karakterli bir alternatif olarak **Big Shoulders Display 800**. Gövde SF Pro. İkisi de Google Fonts'ta (HTTP 200 ile doğrulandı).
- **Gerekçe:** Kategorideki tek boş **sıcak** yüksek kromalı bölge. Turuncunun sıcaklığını ve "cesur" etkisini koruyor (görsel testte en canlı aday). ANSI tehlike/uyarı kodunda yok, iOS'ta hata anlamı yok, yani karar suçlama gibi okunmuyor. İkinci kuşak slop listesinde yok (vermilion ve acid green var, macenta yok). Metin olarak da AA geçiyor; Strava'nın turuncusu geçmiyor.
- **Risk:** macenta pembeye kayarsa "kadın fitness uygulaması" kodu devreye girer (Sweat, Flo, obé pembe). Önlem: kırmızı tarafta kal, pastel pembe ve yuvarlak form yok, siyah + dar başlıkla eşle. **Test:** 8 kişiye 5 saniye göster, "bu hangi uygulamayı hatırlatıyor / kimin için" diye sor. 8'de 2'den fazlası "kadın uygulaması" derse Öneri 2'ye geç.

### Öneri 2 · SAHA (en güvenli ayırt edicilik)
| Token | Açık | Koyu |
|---|---|---|
| `--ac` | `#0B7F05` | `#0B7F05` |
| `--ac-ink` | `#9BE7A6` | `#9BE7A6` |
- **En yakın ΔE00:** Runna 21,6 · Robinhood 22,9 · systemGreen 23,0 (dolgu). Koyu ton: WHOOP teal 9,5 · Spotify 11,9.
- **WCAG:** beyaz/`#0B7F05` 5,18 ✓ · `#9BE7A6` siyahta 13,21 ✓.
- **Tipografi:** **Big Shoulders Display 800** (Chicago kamu tabelası kökenli dar grotesk, stadyum/tabela hissi) + SF Pro.
- **Gerekçe:** Tüm rakiplerden en uzak renk. Yeşil = "devam, onaylı" (zayıf ama olumlu kanıt), düzeltici kararı bile "doğru hamle" olarak çerçeveliyor. Sıcak renkler gerçek uyarılara kalıyor.
- **Risk:** Enerji turuncudan bir kademe düşük ("sağlık uygulaması" okuması). Adaçayı yeşiline kayarsa 2026 Claude varsayılanı (krem + adaçayı/orman yeşili) olur; krem zemin ve serif **asla** kullanılmamalı.

### Öneri 3 · KOR (turuncu sezgisine en yakın)
| Token | Açık | Koyu |
|---|---|---|
| `--ac` | `#B83800` | `#B83800` |
| `--ac-ink` | `#FF9A70` | `#FF9A70` |
- **En yakın ΔE00:** Texas burnt orange 9,4 (üniversite, fitness değil) · Suunto/Polar 12,4 · Claude turuncusu ~12 · **Strava 13,2**. Koyu ton: Gentler Streak 8,8 (< 10, dikkat).
- **WCAG:** beyaz/`#B83800` 5,83 ✓ · `#FF9A70` siyahta 9,29 ✓.
- **Tipografi:** **Archivo** (değişken genişlik, wdth 62–75, 800) + SF Pro.
- **Gerekçe:** Tonu en az değiştiren seçenek. Strava'dan ölçülebilir biçimde uzak, metinde AA geçiyor.
- **Risk:** Görsel testte kahverengiye/tuğlaya kayıyor, "enerjik" hedefini kaybediyor. Kırmızıya yakın koyu turuncu tehlike çağrışımını azaltmıyor, artırıyor. Koyu tonu Gentler Streak'e yakın. **Önerilmez**; yalnız "turuncu şart" denirse.

### Neden Rubin
C'nin seçilme nedeni enerji ve cesaret. Rubin bunu koruyan tek aday. Hem Strava'dan (ΔE 44) hem tüm fitness rakiplerinden (≥ 18) uzak, hem de psikolojik olarak "uyarı/hata" kodu taşımıyor. Değişim maliyeti düşük: ADR-014'e göre token'lar tek dosyada; `--ac`, yeni `--ac-ink`, `--warn` ve gövde fontu değişir, yapı aynen kalır.

---

## 9 · Prototip için düzeltme listesi (renk seçiminden bağımsız)
1. `--warn` ≠ `--ac` (ayrı token).
2. Beyaz metinli butonların dolgusu ≥ 4,5:1 olmalı (mevcut 3,29 başarısız).
3. Gövde fontu → SF Pro (sistem). Başlık özel font kalabilir.
4. Büyük harf kullanımını iki yere indir. `.eyebrow` harf aralığını kaldır ya da eyebrow'u veri etiketine çevir.
5. Çip radius 20px → 4px (sistemle tutarlılık).
6. Tab bar → expo-router Native Tabs (Liquid Glass), özel çizim yok.
7. Koyu mod token seti ekle; karar bloğu = zeminin tersi.
8. 11pt altı metin yok (10,5px sekme etiketi).

## Kaynaklar (toplu)
- Strava marka kılavuzu: https://developers.strava.com/guidelines/
- Strava 2021 kılavuz slaytı: https://www.deck.gallery/strava-brand-guidelines-2021/slide/31-primary-and-supporting-colors-defines/
- Strava yenileme: https://griffdesigns.com/strava · font: https://sensatype.com/what-font-does-strava-use-in-2026
- Strava marka kayıtları: USPTO TSDR sn87044418, sn77693713 · https://trademarks.justia.com/870/44/strava-87044418.html
- Strava–Garmin davası: https://www.npr.org/2025/10/16/nx-s1-5570851/running-app-strava-accuses-watch-maker-garmin-of-patent-infringement
- WHOOP Brand & Design Guidelines (PDF): https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf
- Peloton renkleri [3.P]: https://www.eggradients.com/palette/peloton-colors
- Zwift [3.P]: https://logotyp.us/logo/zwift/
- App Store ikonları/ekranları: https://itunes.apple.com/lookup (trackId'ler: Strava 426826309, Runna 1594204443, Orangetheory 1424351827, Zwift 1134655040 …)
- Apple HIG: Materials / Color / Branding / Dark Mode / Typography, https://developer.apple.com/design/human-interface-guidelines/
- iOS 27 Liquid Glass: https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27/
- Apple Design Awards 2026: https://developer.apple.com/design/awards/
- Expo Native Tabs: https://docs.expo.dev/router/advanced/native-tabs/
- NN/g koyu mod: https://www.nngroup.com/articles/dark-mode/
- Elliot 2015: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4383146/ · kırmızı replikasyonu: https://online.ucpress.edu/collabra/article/6/1/3/113047/
- Pravossoudovitch 2014: https://doi.org/10.1080/00140139.2014.889220 · Dukes & Albanesi 2013: https://www.sciencedirect.com/science/article/abs/pii/S0362331912000638 · Labrecque & Milne 2012: https://link.springer.com/article/10.1007/s11747-010-0245-y
- ANSI Z535: https://incompliancemag.com/ansi-z535-1-safety-colors-in-focus/
- AI slop: https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it · https://www.925studios.co/blog/ai-slop-design-tells · https://github.com/funboy322/avoid-ai-design · https://www.generativelabs.com/insights/why-ai-design-tools-look-the-same · https://claude.com/blog/improving-frontend-design-through-skills
- Fontlar: https://fontalternatives.com/best-fonts-for/fitness-wellness/ · Nike: https://elements.envato.com/learn/what-font-does-nike-use · Gymshark: https://1000logos.net/gymshark-logo/
