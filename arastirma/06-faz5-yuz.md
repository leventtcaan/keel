# 06 · Faz 5 · Ürünün yüzü — sentez

- **Tarih:** 2026-10-07 · **Durum:** TAMAM (ilk tur) — prototip session'ının girdisi · **Karar:** ADR-068
- **Girdiler (kaynaklı, ham):** `ham/M0-rakip-listesi.md` (rakip kümesi, Levent onaylı) · `ham/M1-reklam-istihbarati.md` (R1, Meta, ABD) ·
  `ham/M2-akis-kiyasi.md` (R2, 12 uygulama) · `ham/M3-tutundurma.md` (R3) · `ham/M4-sosyal-dongu.md` (R4) · cihaz turu
  (`docs/aktarim/M9/cihaz-kontrol-listesi.md`).
- **Kural:** bu dosya yeni iddia üretmez. Her satır bir M dosyasına bağlıdır (dosya + bölüm). Kendi yorumum **[ÇIKARIM]**.
  Ekran tasarlamaz: prototipin sınayacağı yönleri ve ADR adaylarını çıkarır.

## 0 · Tek paragraf

Kategori kullanıcıya üç şey öğretmiş. **(1)** Uygulama, birkaç sorudan sonra "planın hazır" der ve somut bir sayı verir (M2 K1-K2; 12 uygulamanın 9'u).
**(2)** Ana ekranda tek bir büyük öğe olur, metin az, sayı çoktur (M2 K7: ilk görünüm 25-50 kelime). **(3)** Kayıt birkaç dokunuşta biter (M2 K9, K11).
Reklamlarda en çok para harcanan acı "ne yapacağımı bilmiyorum, tahmin ediyorum"; herkes "plan sende" vaat ediyor ama hiçbiri **neden**i göstermiyor
(M1 §0.1, §6). Paylaşılan şey sonuç değil, kanıtlanabilir iş: PR, tutarlılık, yıllık özet. Haftalık karar kartının ise rakipte karşılığı yok (M4 §5).
Bizim uygulama bugün bu üç alışkanlığın tersini yapıyor: kişiselleştirme vaat ediyor ama onboarding "Wait" ile bitiyor; ilk ekranda ~105 kelime var;
kayıtlar dağınık (M2 "Bizim taban"). **Yön:** kategorinin alışkanlıklarına uy (akış, yoğunluk, kayıt hızı); farkı tek bir yerde göster: **haftanın kararı
ve gerekçesi.**

## 1 · İnsanlar neye alışkın

| # | Alışkanlık | Kanıt | Bizde bugün |
|---|---|---|---|
| A1 | Sorular → "plan hazırlanıyor" → **somut çıktı** (kalori, ilk antrenman, tarih) → denemeli paywall | M2 K1-K3 (9/12) | Sorular → beklenti ekranı → "Wait" → sert paywall |
| A2 | Antrenman uygulamalarında onboarding kısa (Ladder 4, Hevy 10, Fitbod 14 adım); beslenme/kiloda uzun (18-85) | M2 Özet 2 | 10 adım ama ekran başına ~75 kelime |
| A3 | Ana ekranda **tek kahraman öğe**; ilk görünüm ~25-50 kelime, sayı ağırlıklı | M2 K7, kelime tablosu | ~105 kelime, 3 paragraf, 3 kart, 6 düğme |
| A4 | Üstte **Pzt-Paz hafta şeridi**; ortada yüzen **"+"** tek giriş noktası | M2 K8 (7 uygulama), K9 (5) | Kayıtlar Today kartlarına ve sekmelere dağınık |
| A5 | Set kaydı: önceki değer dolu, tek ✓, dinlenme sayacı kendiliğinden | M2 K11 | (cihazda ölçülmedi) |
| A6 | Algoritma değişikliği **kabul/ret** ile uygulanıyor; açık bir "henüz veri yok" durumu var (MacroFactor "Holding", Runna "Monitoring") | M2 K12, K13 | Motor karar veriyor; "henüz karar yok" tek başına duruyor |
| A7 | Antrenmanda **haftalık ve onarılabilir seri** (Strava, Hevy, Apple); beslenmede günlük seri | M3 §2.1 | Haftalık tutarlılık + 1 hafta af (U7): kategoriyle uyumlu |
| A8 | Tema: beslenme/kilo/koç **açık zemin + tek vurgu**; ağırlık antrenmanı koyu; uygulama içi tema seçici yaygın | M2 K17, çıkarım 6 | Sistemi izliyor, seçici yok; cihazda koyu açıldı ("iç karartıcı") |
| A9 | Paylaşım: antrenman kartı, şeffaf veri çıkartması, aylık/yıllık özet. Kartta kilo, yağ oranı, foto yok | M4 §1, §4.1, Özet 2-3 | Paylaşım ekranı var, yeni hesapta boş |
| A10 | Reklam: dikey UGC; ilk karede yüz ya da beden; altyazı kelime kelime; uygulama 3. saniyede ekranda | M1 §5 | Reklam yok (05: önce organik) |

## 2 · Biz ne getiriyoruz — fark tek yerde

**Kategorinin kanıtlanmış acısı bizim tezimiz:** Fitbod'un en uzun yaşayan reklamlarından üçü (577, 358, 296 gün) "salonda ne yapacağını bilmeyen kişi"
skeci; Ladder "ne yapacağımı düşünmek istemedim" diyor; Gymverse "Your plan, not a template"; BetterMe "done with the guessing" (M1 §5, §8).
Acıyı kimse yeni keşfetmiyor; **çözümün biçimi** boş:

| Rakiplerin yaptığı | Rakiplerde olmayan (keel'in yeri) | Kanıt |
|---|---|---|
| "Plan sende / AI hazırladı" vaadi | **Kararın gerekçesi**: hangi veri, hangi kural (U3) | M1 §6 (gerekçe gösteren yok); K6 §6.2 |
| Runna'nın tempo kartı, MacroFactor'ın check-in'i: tek alanda karar | Antrenman + beslenme + kilo + fotoğraftan **tek haftalık karar** | M2 §1, §10. ⚠ Built With Science+ "antrenman ve beslenme planı haftalık uyum" vaat ediyor (M1 §6, §9): tezin bu kısmı tek başına özgün değil |
| Reddet / "Keep as planned" | **"Hayır" diyebilen karar** (U2: ısrar değiştirmez, veri değiştirir) | M2 gerilim tablosu; M4 §5-D (rakipte yok) |
| "Holding" yalnız bir sayının yanında | **"Henüz karar yok"** + neden + ne zaman (U3) | M2 K13, çıkarım 1 |
| PR, tutarlılık, yıllık özet kartı | **Haftalık karar kartı** paylaşım anı olarak | M4 §5-A (bulunamadı), çıkarım 1 |
| AI'ı adda ya da alt başlıkta kullanmak | AI'ın **ne yapmadığını** söylemek | 05 §6.4; M1 §6 |

**[ÇIKARIM]** Kayıt tarafında (A4-A5) Hevy düzeyine çıkmak bir **masa bahsi**; fark yaratmaz ama eksikliği "insanlar kullanmaz" demek (cihaz turu).
Farkı taşıyan tek ekran **haftalık karar**; ürünün yüzü bu ekranın etrafında kurulmalı.

## 3 · Ne kadar az metin

| Kanıt | Kaynak |
|---|---|
| Kullanıcı sayfadaki kelimelerin ~%20'sini okuyor; her +100 kelime yalnız +4,4 sn okuma getiriyor | M3 §7.1 (NN/g) |
| Kısa + taranabilir + nesnel metin kullanılabilirliği +%124 artırdı | M3 §7.1 |
| Metne bağlı görsel dikkati ve hatırlamayı artırıyor | M3 §7.1 (Houts 2006) |
| Rakiplerin ana ekranı ~25-50 kelime; bizim Today ~105 | M2 kelime tablosu |
| Rakipler gerekçeyi tek satır tutuyor (Fitbod) ya da balonlara bölüyor (MacroFactor) | M2 çıkarım 2 |

**Prototip için hedefler [ÇIKARIM, ölçülecek hipotez]:**
- **Ana ekranın ilk görünümü ≤40 kelime.** Tek kahraman öğe, tek sayı ve tek birincil eylem.
- **Onboarding ekranı ≤25 kelime:** soru + tek satır neden. U9 gerekçeyi zorunlu kılıyor; çözüm gerekçeyi kısaltmak, kaldırmak değil.
- **Karar:** durum etiketi (1-3 kelime) + tek satır neden + güven + sonraki tarih. Dört parça (U3) **görünür**, ayrıntı **bir dokunuşla** açılır.
- **Cümle yerine görsel:** önceki hafta/bu hafta, hafta şeridi, küçük grafik.
- **Paragraf yok.** Koçun anlatımı ana ekranda değil, kararın altındaki katmanda.

## 4 · Hangi akış — prototipin sınayacağı iskelet [ÇIKARIM]

Kanıta dayanan yön; ekran sayısı ve sıra prototipte sınanır, ADR'ye onaydan sonra girer.

1. **Onboarding:** antrenman uygulaması kadar kısa (A2) → "planın hazırlanıyor" → **başlangıç kararı.** Motorun ilk gün verebildiği somut çıktı bu:
   başlangıç kalorisi (H6; U5'e göre hedef tek sayı olabilir) ve haftalık antrenman sayısı. Yanında "ilk ayarlama: pazartesi" geri sayımı durur
   (M2 çıkarım 1, 4). Ardından paywall (ADR-058 sert); deneme zaman çizelgesi ve hatırlatma vaadi açık yazılır (M2 K3; M1 §9 hukuki sinyal).
   - Health izni ilk kullanıldığı ana taşınabilir; bir ekran eksilir (M2 K4, çıkarım 9).
   - Hesap zamanı (Apple ile giriş başta mı, değerden sonra mı): teknik soru, prototipten önce açılır (M2 çıkarım 8).
2. **Today:** kahraman öğe = **bu haftanın durumu**: karar etiketi + check-in geri sayımı. Altında hafta şeridi (haftalık tutarlılık; günlük ✓ var ama
   sıfırlanmaz, U7) ve tek "+" (A3, A4; M2 çıkarım 3-5). "Ask the coach" çubuğu ve Settings düğmesi kahraman öğeyle yarışmaz.
3. **Kayıt "+"tan:** tartı ≤4, öğün 2-3, set 1 dokunuş (önceki dolu, tek ✓) (M2 çıkarım 7). Fotoğraf sürtünmeyi azaltır ama unutmayı çözmez;
   unutmayı kişinin kendi öğün saatine göre tek hatırlatma çözer (M3 §3).
4. **Pazartesi check-in = ürünün ana anı:** Runna şablonu (durum etiketi · gerekçe maddeleri · sayılan veri · küçük grafik · güven + sonraki tarih ·
   eylem) U3'ün dört parçasıyla örtüşüyor (M2 çıkarım 4). **Paylaş** düğmesi burada (M4 çıkarım 4). İlk hafta: trend yerine davranış verisinden tek
   plan ayarı (M3 çıkarım 4). Bu, U8 ↔ U15 gerilimine bağlı (§7, B4).
5. **Dönüş akışı:** kopuştan sonra suçlamasız karşılama, boşluğa göre kademeli seçenek (Runna, MacroFactor); pazartesi "yeni başlangıç" (M3 §5,
   çıkarım 3). Ölçülmüş en güçlü müdahale geri döneni olumlu karşılamak (+%27, M3 Özet 4).
6. **Paylaşım:** karar kartı + tutarlılık + PR; şeffaf çıkartma biçimi; 12 haftalık dönem özeti. Varsayılan kartta kilo, yağ oranı, fotoğraf ve kalori
   yok (M4 çıkarım 1-5).
7. **Bildirim ve widget:** az, kişisel saatli, dönen şablon (M3 çıkarım 9). Widget "bu hafta X/Y + bugünün tek eylemi"; Live Activity yalnız
   antrenman/dinlenme için (M3 çıkarım 10).

## 5 · Reklam ve ürün aynı vaadi taşır (ADR-068 Sonuçlar)

- **Ürünün 3 saniyede filme alınabilir bir anı olmalı** (M1 çıkarım 2). Cal AI'da bu an "tara → sayı", Fitbod'da "kas seç → antrenman hazır".
  Bizde **karar kartı** olabilir: tek cümle, büyük harf, 9:16 kırpmada okunur. Bu bir ekran tasarımı gereği (§4.4).
- **Bize açık kanca aileleri:** karar yükü skeci, itiraf/POV, uygulama demosu, faydalı içerik (RIR, deload anlatımı) (M1 §5, çıkarım 4).
  **Kapalı olanlar:** önce/sonra dönüşüm, üretilmiş beden, kalori challenge'ı (U12, 05 §3.1; M4 gerilim).
- **TikTok içeriği:** izlenen şey hayat (#whatieatinaday 40,8 milyar izlenme); uygulama adı küçük (#macrofactor 946 video). Bizim boşluğumuz
  "uygulama bana hayır dedi" ve güç ilerlemesi; durumu güldürmeli, kullanıcıyı değil (U7) (M4 çıkarım 8).
- **Kreatör kurgusu sıfır maliyetle:** barter + uzatılmış deneme kodu + kreatörün videosuna konacak şeffaf çıkartma (M4 çıkarım 7; 05 §3.4).

## 6 · Görsel dil girdisi (ADR-016 yeniden ele alınırken)

- **Açık zemin varsayılan + uygulama içi tema seçici:** kategori normu ve Levent'in tepkisi aynı yönde (M2 K17, çıkarım 6). Koyu yalnız antrenman
  oturumu için düşünülebilir (Runna canlı koşu, Ladder oynatıcı).
- **Tek vurgu rengi:** kategorinin normu. Renk kararı L2'nin RUBİN önerisiyle birlikte prototipte sınanır.
- **Beslenmede tarafsız renk:** kırmızı sayı, iyi/kötü yiyecek etiketi, aşım uyarısı yok. Yeme bozukluğu literatürü ve U7 aynı yönde (M3 çıkarım 11).
- **Apple'ın Activity halkalarına benzememe** (HIG); haptik yalnız ayrık olaylarda (PR, hafta tamam) (M3 çıkarım 7-8).
- **Kutlama:** bilgi veren olumlu geri bildirim, somut ödül değil (M3 çıkarım 8).

## 7 · Anayasayla çelişenler — ADR adayları (karar Levent'te)

U1-U6 dokunulmaz (ADR-068 madde 3). Aşağıdakiler ya diğer kuralları zorluyor ya da U1-U6'nın **kapsamını** soruyor (gevşetmiyor).
"Güç": güçlü = RCT/büyük deney · orta = şirket A/B'si/küçük deney · zayıf = korelasyonel/tek kaynak.

| # | Kural | Soru | Kanıt (dosya) | Güç |
|---|---|---|---|---|
| B1 | **U7 telafi** | "Telafi" neyi yasaklıyor? (a) geri döneni ödüllendirmek, (b) sonradan girilen kaydı seriye saymak, (c) eksik antrenmanı fazlasıyla ödetmek. İlk ikisi kanıtla destekleniyor, üçüncüsüne kanıt yok | M3 gerilim; M2 (Cal AI 0,99 $ seri geri alma); M4 (Liftoff satın alınabilir kurtarma) | (a) güçlü (n=61.293), (b) zayıf |
| B2 | **U7 af gösterimi** | 1 haftalık af "kullanılabilir pay" olarak mı gösterilsin? Etki, payın küçük bir bedeli olmasından geliyor | M3 çıkarım 1, gerilim (Sharif & Shu) | orta |
| B3 | **U7 rekabet** | Lider tablosu/rütbe yok mu, yoksa yalnız kişinin kendi geçmişine kıyas mı? Rekabet kolu adımı en çok artırdı ve en kalıcı koldu; aynı çalışma kayıp çerçeveli puanla çalıştı | M3 gerilim (STEP UP, n=602); M4 gerilim | orta-güçlü |
| B4 | **U8 ↔ U15** (anayasanın iç gerilimi) | U15 "1. haftada plan değişti anı" istiyor; U8 "ilk 14 gün trend yorumu yok, ilk karar ilk pazartesi" diyor. Kanıtın gösterdiği yön: 1. haftanın kararı trendden değil **davranış verisinden** gelsin | M3 gerilim; M2 (değer dakika 0'da) | iç tutarlılık |
| B5 | **U9 kapsam** | Hatırlatma ve haftalık özet soru bütçesine sayılır mı? | M3 gerilim | tanım boşluğu |
| B6 | **U10** | Maskot/karakter lehine kanıt var mı? Zayıf (Finch, korelasyonel). Kural lehine: kişilik değişimi ölçülmüş zarar (F §4.2). **Öneri: kural kalsın**, yalnız kayıt için | M3 gerilim; M2 (Bevel 4 kişilik) | zayıf |
| B7 | **U12 / U8 projeksiyon zamanı** | Rakiplerin en yaygın "aha"sı paywall'dan önce tarihli kilo projeksiyonu. Bizde U5 (aralık) dokunulmaz; U12'nin "ilk 4 hafta yok" kuralı ve başlangıç kararı birlikte "aha"yı karşılıyor mu? | M2 K15, gerilim; M3 gerilim (etki kanıtı yok) | zayıf (etki ölçülmemiş) |
| B8 | **U4 kapsamı** | Pazarlama ve paylaşım kartı da U4'ün kapsamında mı? Rakip kreatörler reklamda yağ yüzdesi gösteriyor. Kartta **kilo sayısı** olabilir mi (U4 yalnız yağ yüzdesi diyor)? | M1 §11; M4 gerilim | — |
| B9 | **U12 ve 05 §3.1 kuralı 6, pazarlamada** | Önce/sonra ve üretilmiş beden reklamda da yasak mı (açıkça yazılsın)? Markanın kullanıcı kartını yeniden paylaşma kuralı? Apple 5.1.3(i): sağlık verisi pazarlamada kullanılamaz | M1 §11 (Cal AI 175 günlük dönüşüm reklamları, BetterMe "IA generativa"); M4 gerilim | güçlü (kanca), kural net |
| B10 | **U5 paylaşımda** | PR/rütbe kartında e1RM tek sayı mı (U5'e çarpar), gerçek set mi, aralık mı? | M4 gerilim | — |
| B11 | **U2 ve kabul/ret** | Kullanıcı kararı "uygulamama" seçeneğine sahip mi? Reddetmek kararı değiştirmiyor, yalnız uygulamıyor (MacroFactor, Runna) | M2 gerilim | yorum |
| B12 | **V1/V3 dış paylaşım** | Strava'ya/IG'ye otomatik imza ya da kart: yalnız açık onayla ve kapatılabilir mi? | M4 gerilim (Runna'nın kapatılamayan imzası) | — |
| B13 | **Teklif (para)** | Ladder'ın "kredi kartı yok" denemesi ↔ ADR-058'in zorunlu paywall'u ↔ 05 §4 (sert paywall daha iyi dönüştürüyor). Deneme → yıllık ücret açıklaması canlı bir hukuki risk | M1 çıkarım 5-6, §9 (MacroFactor soruşturması) | orta |

**Levent'e sorulacaklar (ürün, para, veri):** B1, B3, B4, B7, B8, B9, B11, B12, B13. **Teknik/tanım (agent önerir, ADR'de):** B2, B5, B10. B6: değişiklik önerilmiyor.

## 8 · Mevcut araştırmaya düzeltme
- **K5'teki "yıllık kayıp %56'dan %72'ye çıktı" kıyası geçersiz:** RevenueCat iki yıl arasında hesaplama yöntemini değiştirmiş (M3 §1.2 düzeltme
  notu). `arastirma/` salt okunur kaynak; düzeltme burada kayıtlı, K5'e dayanan bir karar çıkarsa bu not esas alınır.

## 9 · Prototipin sınaması gerekenler (hipotezler)
1. Onboarding bir **başlangıç kararıyla** bittiğinde "ne nerede" kafa karışıklığı azalıyor mu? (A1; cihaz turu)
2. Today ≤40 kelime ve tek kahraman öğe ile Levent "ne yapacağımı biliyorum" diyor mu? (§3)
3. Karar kartı **9:16 kırpmada 3 saniyede** okunuyor mu? (§5)
4. "Henüz karar yok" durumu somut bir başlangıç hedefiyle yan yana dururken bekleme olarak mı, ilerleme olarak mı okunuyor? (M2 K13)
5. Açık tema + tek vurgu "iç karartıcı" hissini gideriyor mu? (A8)
6. "+" tek giriş ile kayıt dokunuş sayıları hedefi tutuyor mu? (§4.3)

**Kaynakla kapanmayan boşluklar** (Levent'in telefonunda; deneme başlatmak ödeme yöntemi bağlar, karar Levent'in): MacroFactor check-in sonuç ekranı
(tezimizin en yakın karşılığı; 7 gün deneme + 4/7 gün kayıt) · Cal AI paywall'u kapatılabiliyor mu (ödemesiz) · Bevel'in ilk gün ekranı (ödemesiz)
(M2 "Levent'in telefonunda").

## 10 · Sıradaki
Ayrı session: **ekran envanteri** (bugünkü 30+ rota, `apps/mobile/src/app/`) → **bütün ekranların tıklanabilir artifact prototipi**
(bu dosyanın §3-§6'sına göre) → Levent telefonda gezer, "kalsın/gitsin" der → görsel dil ADR'si (ADR-016'nın yerine) ve §7 ADR'leri → kod.
