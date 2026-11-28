# ADR-094 · Görsel dil: Sıcak defter (petrol karar, mercan ilerleme, kırık beyaz kâğıt)
- **Durum:** KABUL (Levent, 2026-11-25)
- **Tarih:** 2026-11-25 · **Karar veren:** Levent (öneren: agent)
- **Yerine geçtiği:** ADR-070 (renk, zemin, karar bloğu, tipografi). ADR-070'in tire yasağı (#7), halka yasağı (#8), tema seçici (#3)
  ve Ek 2'nin bileşen rolleri bu ADR'de aynen sürer; renkleri ve yazıları bu ADR verir.

## Bağlam
Levent 1.0'ı simülatörde gezdi (25 Kas, `plan/tasarim-gezinti-notlari.md`): siyah karar kartı + doygun turkuaz "sert, tutarsız, itici",
Barlow Condensed büyük harf dar kartları boğuyor, çok yazı var, gün şeridi "insana dokunmuyor", koç ekranı "hiç uğraşılmamış".
1.0.1 tasarım bitene kadar durdu (Evre 9, `plan/evre-9-tasarim.md`).
Part 9a-1:
- Antigravity (Gemini 3.8 Flash High) lider uygulamaların görsel dilini taradı: `arastirma/ham/gorsel-dil-2026-11-25.md`.
  Doğrulama turu `arastirma/ham/gorsel-dil-dogrulama-2026-11-25.md`.
- Codex (gpt-6-luna) aynı gerçek veriyle (87,4 kg, kesim, "yemek aynı, adım 7.000 → 10.000") önce 3 yön × 3 ekran çizdi
  (Defter, Ritim, Gece stüdyo). Levent Gece stüdyoyu eledi ve "Defter ile Ritim'in kuvvetli yanlarından karışım" istedi.
- Üç karışım çizildi (A Sakin defter, B Sıcak defter, C Sade ritim). Taslaklar `prototip/gorsel-yon/`, yan yana sayfa
  claude.ai Artifact (özel).

Levent'in seçimi, kendi sözleriyle: "kesinlikle B ... ayrımı da amacı da hizmeti de ... kesinlikle ama kesinlikle her sayfada bu
yaklaşımı korumak gerekli, ola ki ilerde bir şey eklenecek onda da ... her pop up için her şey tutarlı olmalı".

## Karar sürücüleri
- Gezinti ilkeleri: az yazı; sakin ve tutarlı renk; insana dokunan ekranlar (`plan/evre-9-tasarim.md` › İlkeler 1-3).
- **Renk bir anlam taşır, anlamı her ekranda aynıdır** (Levent: "ayrımı da amacı da hizmeti de").
- Türkçe uzun metin dar alana sığmalı: büyük harf ve dar kalın yazı yok.
- İki temada WCAG AA: metin 4,5:1, işaret ve çizgi 3:1 (WCAG 1.4.3, 1.4.11).

## Karar
Uygulamanın tek görsel dili **Sıcak defter**:
- Zemin kırık beyaz bir kâğıt, içerik kartsız durur.
- Gruplamayı yalnız yumuşak renkli zeminler yapar.
- İki vurgunun her birinin tek bir rolü vardır. **Petrol karar ve eylemdir; mercan "neredesin ve ne kadar ilerledin"dir.**
- Karar ve ekran başlıkları serif yazılır. Gövde sistem fontudur. Sayılar yuvarlak sistem fontuyla, sabit genişlikte yazılır.
- Her şey tümce düzenindedir.

Bu dil bütün ekranlarda, sayfalarda (sheet), pop-up'larda, boş/yükleniyor/hata durumlarında, onboarding'de, abonelik ekranında,
paylaşım kartında ve **ileride eklenecek her ekranda** aynen uygulanır. Aşağıdaki rol tablosu dışında renk kullanmak hatadır.

### 1 · Renk rolleri (tek kaynak)
| Token (öneri adı) | Açık | Koyu | Rolü | Asla |
|---|---|---|---|---|
| `paper` | `#F7F5F0` | `#17191B` | sayfa zemini | |
| `ink` | `#24221F` | `#ECE8E1` | metin, sayılar | |
| `inkSecondary` | `#736E66` | `#A39E95` | ikincil metin, etiket | gövde paragrafı |
| `hairline` | `#E4DED2` | `#2E3135` | ince ayırıcı çizgi | kutu çerçevesi |
| `decision` (petrol) | `#1F6B73` | `#5FB3BB` | karar başlığı vurgusu, birincil düğme, metin düğmesi ve bağlantı, seçili sekme, yapılan gün işareti, kişinin koç baloncuğu, grafikteki ana çizgi | ilerleme göstergesi |
| `onDecision` | `#FFFFFF` | `#17191B` | petrol üstü metin | |
| `progress` (mercan, işaret) | `#CF6647` | `#F08C70` | bugün işareti, haftanın yürünen kısmı, ilerleme çubuğu dolgusu, "buradasın" noktası | **uyarı, hata, aralık/tahmin, birincil düğme, gövde metni** |
| `progressText` | `#A84F38` | `#F08C70` | bugünün adı gibi kısa ilerleme etiketi (yazı) | uzun metin |
| `tintTime` (adaçayı) | `#E8F0EA` | `#1E2A25` | zamanı anlatan grup: hafta yolu, geçmiş, gelişim zaman çizgisi | |
| `tintDay` (kum) | `#F1ECE3` | `#24231F` | nötr grup: günün sayıları, ikincil düğme, koç cevabı, hazır soru hapları | |
| `tintSuggest` (mercan zemini) | `#FBEAE3` | `#2E211C` | koçun ya da motorun **önerdiği eylem** kartı | uyarı |
| `warn` | `#B3261E` | `#FF8A80` | yalnız yıkıcı eylem metni ve güvenlik beklemesi, her zaman ikon ya da sözcükle | süs, kaçan hafta (U7) |

Bir ekranda en çok üç renkli grup olur. Beyaz gölgeli kart ve siyah (ters) karar bloğu yoktur: ADR-070 #2'nin ters bloğu kalkar.
"Yapıldı" işareti petroldür. Kaçan gün ya da hafta nötr çizilir: kırmızı ya da mercan olmaz, suçlama yoktur (U7).
Değerler başlangıçtır. Kontrastı agent WCAG formülüyle hesapladı (açık tema, `paper` üstünde):

| Çift | Oran |
|---|---|
| petrol | 5,65 |
| petrol üstü beyaz | 6,16 |
| `progress` | 3,41 (adaçayı, kum ve mercan zeminlerinde 3,16-3,19) |
| `progressText` | 5,02 |
| `ink` | 14,56 |
| `inkSecondary` | 4,64 |

Koyu temada:

| Çift | Oran |
|---|---|
| petrol | 7,26 |
| `progress` | 7,29 |
| `ink` | 14,43 |

Kesin değerler `contrast.test.ts`'te sabitlenir. Taslaktaki `#E07A5F` zeminde 2,71 kaldığı için işaret tonu `#CF6647`'ye koyulaştı.

### 2 · Tipografi
- **Başlık serif:** karar cümlesi, ekran başlığı, bölüm başlığı, büyük kilo sayısı. iOS'un sistem serifi (New York) kullanılır;
  regular ya da semibold, tümce düzeninde.
- **Gövde:** sistem fontu (SF Pro), tümce düzeninde.
- **Sayılar:** sistem fontunun yuvarlak tasarımı (SF Pro Rounded), sabit genişlikte rakam (tabular).
- **Büyük harf yok:** etiket, düğme ve rozet dahil (`textTransform: 'uppercase'` kalkar). Barlow Condensed kalkar.
- 11 pt altı metin yok; Dynamic Type sürer.
- React Native'de serif ve rounded ailesine nasıl erişileceği (`fontFamily` adı ya da yerel modül) **[doğrulanmadı]**. Kurulu RN
  sürümünde ve Apple belgesinde doğrulanmadan kod yazılmaz (K6). Erişilemezse önce Levent'e sorulur; sessiz yedek font yok.

### 3 · Biçim ve bileşenler
- Renkli grup köşesi 20. Birincil düğme petrol hap, beyaz metin, 52 pt, tam genişlik, ekranda en çok bir tane. İkincil düğme kum hap.
  Metin düğmesi petrol. Yıkıcı düğme `warn` metin. Ek 2'nin dört rolü sürer.
- **Hafta yolu**, tik/çarpı şeridinin yerine geçer:
  - Adaçayı zemin üstünde yumuşak bir şerit.
  - Yürünen kısım mercan, bugün mercan nokta.
  - Antrenman günleri küçük işaret, yapılan gün petrol tik, kalan günler nötr.
- **Günün sayıları:** kum şeritte tek satır. Her sayının altında ince mercan ilerleme çubuğu, etiket üstte. Dar kutuya iki satır
  sayı sığdırılmaz; sığmıyorsa satır sayısı azalır.
- **Grafikler:**
  - Petrol çizgi, en çok tek taban çizgisi.
  - Hedef bandı petrol %12.
  - Tahmin daima aralık (U5) ve nötr metinle yazılır, mercanla değil.
  - İç içe halka yok (ADR-070 #8).
- **Koç:**
  - Kişinin baloncuğu petrol, koçun cevabı kum zeminde.
  - Cevabın içindeki görsel kart adaçayı zeminde.
  - Koçun hazırladığı eylem mercan zeminli kartta, petrol düğmeyle.
  - Hazır sorular kum hap; giriş çubuğu altta sabit.
- **Pop-up, sheet, uyarı:**
  - Aynı zemin, aynı roller, aynı başlık serifi.
  - Sistem uyarısı (Alert) iOS'undur, tint petrol.
  - Kayıt sonrası bant "Kaydedildi · Geri al" (Ek 2 #6) kum zeminde.

### 4 · Temalar ve odak modu
Light/Dark/System seçici ve varsayılan Light sürer (ADR-070 #3). Koyu tema nötr koyu zemindir, roller aynıdır.
Antrenman oturumu ve kutlama her zaman koyu kalır (ADR-070 #4), ama bu ADR'nin koyu paletiyle. Ayrı bir turkuaz ya da siyah dil yoktur.

## Neden
- Levent'in bütün itirazları tek dilde karşılanıyor. Siyah blok ve doygun renk kalkıyor. Renk iki role iniyor; bu, tutarsızlığın
  kaynağı olan "aynı rengin her işi yapması"nı bitiriyor. Serif karar ekranın tek "insan sesi" oluyor. Hafta yolu "neredeyim"
  sorusuna cevap veriyor.
- Araştırmanın doğrulanan bulguları aynı yönü gösteriyor (`arastirma/ham/gorsel-dil-dogrulama-2026-11-25.md` › "karara girebilir").
  Doğrulamayı da Gemini yaptı; ADR'ye rakip hex değeri girmez, yalnız şu desenler girer:
  - Oura'nın yeniden tasarımında ilk ekranda tek içgörü ("One Big Thing") ve tümce düzeni (ouraring.com/blog/new-app-design).
  - MacroFactor'ün uyum-nötr dili: sapmada kırmızı alarm yok (macrofactor.com/adherence-neutral).
  - Gentler Streak'in tik şeridi yerine yolu (Activity Path).
  - WHOOP Coach ve Oura Advisor'da hazır soru hapları ve cevap içi kart.
- Petrol bugünkü turkuazın yatışmış hali. Marka sürekliliği korunuyor ve geçiş sert olmuyor.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| ADR-070'i yamamak (turkuazı yumuşatmak) | Sorun ton değil sistem: ters siyah blok, büyük harf, tek rengin her işi yapması |
| 1 · Defter / A · Sakin defter (tek renk petrol) | En tutarlısı ama sıcaklık az; "insana dokunma"yı yalnız hafta yolu yapıyor |
| 2 · Ritim / C · Sade ritim (mercan birincil) | Turkuazdan tam kopuş; mercan birincil düğme her ekranda bağırıyor |
| 3 · Gece stüdyo (koyu varsayılan) | Levent eledi; koyu varsayılan daha önce "iç karartıcı" bulunmuştu (ADR-067) |

## Sonuçlar
**Olumlu:**
- Renk anlam taşır.
- Türkçe uzun metin serif tümce düzeninde rahat kırılır.
- Bütün ekranlar tek rol tablosundan çizilir.

**Olumsuz (kabul edilen bedel):**
- İki vurgu kuralı disiplin ister; her ekran incelemesinde rol tablosu denetlenir.
- Mercan kırmızıya yakın bir sıcak ton. Bu yüzden uyarıda asla kullanılmaz ve `warn` her zaman sözcük ya da ikonla gelir.
- Mercan Runna'nın doğrulanan mercanına (`#F07561`) yakın: ΔE00 8,4, agent hesabı. Mercan ikincil rol olduğu, marka rengi petrol
  kaldığı için kabul edildi. Petrol en yakın rakip vurgularından uzak: WHOOP teal `#00F19F` ΔE00 45, Oura mavisi `#2A72DE` 25.
- Bütün ekranlar yeniden çizilir (9c).
- Paylaşım çıkartması (ADR-076) bu dille yeniden tasarlanır.
- Dış 5 saniye testi yok.

## Geri dönmenin maliyeti
Orta. Renkler tek dosyada (`tokens.ts`) ama tipografi, ters blok kaldırma ve hafta yolu bileşen değişikliği ister.

## Etkilenen
- `apps/mobile/src/theme/`: tokens, theme, fonts (Barlow kalkar).
- `contrast.test.ts`, `tokens.test.ts`.
- Bütün ekranlar ve bileşenler: Evre 9c sırası.
- Paylaşım kartı (ADR-076), mağaza görselleri (sonra).
- `prototip/` (yeni referans `prototip/gorsel-yon/y5-e1..e3.jpg`).
- ADR-070 → YERİNİ ALDI.

## Doğrulama
- `contrast.test.ts`: tablodaki her metin çifti ≥4,5:1, her işaret çifti ≥3:1, iki temada ve odak modunda.
- `tokens.test.ts`: renk ve font literali yalnız token dosyasında.
- Yeni mimari test:
  - `progress` ve `tintSuggest` token'ları uyarı, hata ve birincil düğme bileşenlerinde kullanılamaz.
  - `textTransform: 'uppercase'` yok.
- Her ekran Evre 9c'de simülatörde Levent'e gösterilir. Kabul ölçütü: ekran, `prototip/gorsel-yon/y5-*` taslaklarıyla aynı dili
  konuşur ve rol tablosuna uyar. Taslağın birebir kopyası istenmez.

## Ek 1 · Karar ekranı (9c-4, 2026-11-25, Levent)
Levent'in üç seçimi (karar ekranı, taslak `prototip/gorsel-yon/y5-e2.jpg`):
1. **"8 hafta sonra" aralığı karar ekranında görünür.** Sunucunun projeksiyon senaryolarından kişinin son uyumuna en yakın olanın
   aralığı gösterilir. Daima aralık (U5), sayı sunucudan (U1); seçim yalnız hangi senaryonun gösterileceğidir (9c-4b).
2. **Ekranın kelime bütçesi 45 → 50.** "Ne değişiyor" ve "Neden" başlıkları girer. Uzun neden cümleleri kısa etiket + sayıya
   iner; bu metin işi Türkçe metin onaylarıyla (#770) birlikte yapılır.
3. **"Uygulamada" düğmeleri kalır**, sade kum haplar olarak ("her düğme bir yere bağlanır").
Agent (teknik): grafik kararın okuduğu haftalardan (`/v1/decisions/{id}/basis`, "Bu karar neden" ekranının okuması) çizilir.
Hedef bandı çizilmez, çünkü sunucu ona ait bir sayı vermez (U1).
4. **"8 hafta sonra" kutusu (9c-4b):** aralığın altında senaryonun uyum payı ("Planlı günlerin %80") görünür kalır, çünkü tahmin bir
   davranışa bağlıdır, garanti değildir (ADR-052). Bunun için ekranın bütçesi 50'den 53'e çıktı (Levent). Aralık yalnız projeksiyon açıkken
   görünür; açmak için SCOFF kapısından geçmek gerekir (ADR-050), kapalıysa sunucuya istek de gitmez. Geçmiş kararlarda aralık hiç görünmez.
   **Bugün kapalı (Levent, 25 Kas):** projeksiyon ve SCOFF ekranları ADR-069 ile v1'de yüzeyden kaldırıldığı için kimse projeksiyonu açamıyor.
   Kod girer ve kapalı kalır; projeksiyon ayrı bir kararla (SCOFF kapısı + Gelişim girişi, ADR-050 aynen) yeniden açılınca aralık kendiliğinden görünür.

## Ek 2 · Antrenman akışı: set ve dinlenme (9c-7, 2026-11-26, Levent)
Bugünkü 7 ekran simülatörde çekildi ve sorunları işaretlendi (`prototip/gorsel-yon/9c7/9c7-simdi.jpg`). Set ve dinlenme için Codex üç yön çizdi
(`9c7/a-*`, `b-*`, `c-*`; istemler `ekranlar.txt`, `yon-*.txt`). **Levent A · Odak'ı seçti:**
- **Set:** hareket adı serif, "Set 2 / 3" küçük; bugünkü hedef büyük ("28 kg × 6"); ağırlık ve tekrar yan yana iki uzun kutu (rakam ortada, eksi/artı
  kutunun altında; etiket rakamın üstüne binmez); "Cepte kalan tekrar" 0 · 1 · 2+ **hiçbiri seçili gelmez** (9b); bu hareketin setleri sessiz satırlar
  (yapılan ✓, şimdiki mercan işaret, bekleyen); altta tek petrol "Set N kaydet".
- **Dinlenme:** ayrı, sakin ekran; büyük geri sayım çevresinde **tek** mercan yay (iç içe halka değil, ADR-070 #8), boşalarak; "Önerilen 2-3 dk",
  -15/+15; az önce yapılan set ve "Geçen seferden ağır."; "Sıradaki · Set 2 · 28 kg × 6" kum kartta; altta tek petrol "Hazır".
- Üst çubuk: "Bitir" okunur (sönük değil), ortada geçen süre, "Duraklat"; altında hareketler şeridi (yapılan ink, şimdiki mercan).
- Oturum koyu kalır (§4), bu ADR'nin koyu paletiyle. Taslak kusurları (B'deki İngilizce "reps", C'deki uydurma "Bugünün hedefi") taşınmaz.
9b mantık maddeleri bu ekranlarla birlikte yapılır (Levent): cepte kalan tekrar önceden dolu gelmez; form sorusu hareketin sonunda; dinlenmenin gerçek
süresi bir yere bağlanır ya da kalkar (bu son ikisi ayrıca görselle sorulur).

**Uygulama (K-1238, #794, 2026-11-26, Levent; görseller `9c7/rir-bos-kayit.jpg`, `9c7/9c7-sonra.jpg`):**
1. "Cepte kalan tekrar" seçilmeden kaydedilirse **boş gider** (Levent, simülatörde üç varyanttan 1'i seçti): Kaydet hep çalışır, set RIR'sız
   kaydedilir; sunucu o seti planın hedefiyle okur (`NextTargets.session`), e1RM'e girmez. Kaydet pasif ya da dinlenmede soru seçilmedi.
2. Öğe bütçesi A'ya göre (Levent onayı): set ekranı ham 22 → 24 (set satırları), dinlenme 8 → 10 (şerit + az önceki set kartı);
   `data/parameters/workout.json`. Sayaç bu hareketin set satırlarını tek birim sayar (hareket noktaları gibi).
3. Analiz satırı ("Geçen seferden ağır.") set ekranında değil: dinlenmede az önceki setin kartında; hareket bitince set satırlarının altında.
4. Set satırlarındaki ✓ mürekkep (odak ekranında petrol yalnız eylem ve biten sayaç için, K-1207 kuralı).
5. **Form sorusu hareketin sonunda, hareket kartında** (K-1239, Levent; `9c7/form-sorusu.jpg`, sonra `9c7/form-sonra.jpg`): son setten
   sonra kartta "Formun nasıldı? Temiz / Temiz değil", Temiz seçili; Sıradaki düğmesi aynı (ek dokunuş yok). Açılan pencere ve
   "Temiz · Sıradaki" düğmesi seçilmedi. Bitişte yalnız son setinden önce bırakılan hareketler sorulur; not kutusu kalır.
6. **Gerçek dinlenme süresi set satırında** (K-1240, Levent; `9c7/dinlenme-suresi.jpg`, sonra `9c7/dinlenme-sonra.jpg`): biten setin satırında
   önündeki dinlenme soluk yazar ("1:09 dinlenme") ve sesli etikette söylenir. Yalnız gösterilir, hiçbir kural okumaz; kayıt (K-1214) sürer.
   Dinlenme ekranında "Son dinlenmen" ve kaydı kaldırmak seçilmedi. Öğrenen aralık ayrı kural + kaynak ister (kural-ekle).
   Yan düzeltme: tek taraflı harekette görünen numara "1 · sağ" (önce "1Sağ" bitişikti), tek taraflı satırda sol sütun geniş.
7. **Antrenman sekmesi: bugünün antrenmanı ilk 3 hareket + "ve N tane daha"** (K-1241, Levent; `9c7/antrenman-sekmesi.jpg`, sonra
   `9c7/antrenman-sekmesi-sonra.jpg`): Bu hafta kartıyla aynı dil; dokununca hepsi açılır, "Bu hafta" listesi ilk bakışta görünür. Hepsinde ortak:
   gün adı serif, karar şeridi zaman zemininde (accentSoft seçimin zemini), "Son …" satırı gri, yük sağda rakam, değiştir oku soluk ve zeminsiz
   (dokunma alanı tam). Tam liste ve değiştir düğmesinin kalkması seçilmedi.
8. **Bitirme penceresi: seyrekler küçük yazı** (K-1242, Levent; `9c7/bitirme-penceresi.jpg`, metinler `9c7/bitirme-metin.jpg`, sonra
   `9c7/bitirme-sonra.jpg`): serif soru, altında "Yapılmamış N set var" (tek taraflı setin iki yanı bir set); tek petrol "Bitir ve kaydet",
   ikinci düğme "Antrenmana dön"; altta küçük yazı "Sonra devam et" ve kırmızı "Antrenmanı sil" (bir kez daha sorar: "Antrenman silinsin mi?
   Sil / Vazgeç"). Bu pencereden bitirince ayrı "N hareket kaldı" uyarısı yok (Daha fazla ve alt düğmedeki Bitir'de kalır); not adımı sonra
   kalır. Levent eski metinleri anlamadı: "Kalanını sonra doldur" → "Sonra devam et", "Bu antrenmanı at" → "Antrenmanı sil"; İngilizce
   "Carry on later", "Delete this workout". Not yalnız hareket geçmişinde görünür, hiçbir kural okumaz (Levent'e söylendi).
9. **Bitiş ekranı: sakin akış** (K-1243, Levent; `9c7/bitis-ekrani.jpg`, sonra `9c7/bitis-sonra.jpg`): serif başlıklar, mercan işaret ve
   hafta çubuğu, rekor kum kartta mercan "Yeni rekor" ile (koyu petrol blok yok); Bitti altta sabit, Paylaş onun altında yazı. Rekor başta
   ve kartsız defter seçilmedi.
10. **Paylaş kartı: C · kâğıt kart** (K-1244, Levent; `9c7/paylas-karti.jpg`, tam boy `9c7/paylas-c.jpg`): kırık beyaz kâğıt panel, koyu
   mürekkep, mercan üst yazı, rekora fosforlu vurgu; serif yazı için kart uygulamanın yazı tipleriyle çizilip görüntüye çevrilir
   (react-native-view-shot): yeni yerel modül, **yeni derleme ve mağaza sürümü** (Levent onayı). O derlemeye kadar eski kart kalır.
   **Revize (26 Kas, Levent simülatörde, K-1244):** haplar "karışık, alakasız ayrım" bulundu → kartlar **yana kaydırılan bir dizi**
   (Antrenman, Rekor, Hedefte geçen haftalar, Gelişim; sonraki kart kenardan görünür, altta nokta; VoiceOver'da tek ayarlanabilir öğe),
   tek **"Fotoğraf ekle"** (galeri ya da kamera sistemin menüsünden; eklenince "Fotoğrafı kaldır"; fotoğraf yoksa koyu zemin), tek
   **"Paylaş"** (sistem paylaşım sayfası; Instagram orada). "Story'de paylaş" ve "Instagram'da" kalktı. Kartın sağ altında küçük uygulama
   işareti + "Next Call". Levent: **şimdilik yalnız fotoğraf** (video ayrı iş, K-1245), **ücretsiz** (fotoğraf sunucuya gitmez, V1; maliyet
   yok). Kartta küçük harfli hareket adı ve "PR" yok: rekor kendi satırında "Yeni rekor · Hareket · 28 kg × 6", set bölünmez.
   K1 (8 madde: kart/düzen/önizleme/model/ekran/seçici/bitiş testleri, Story ve video testlerinin silinmesi, görüntü içindeki metin için
   `allowFontScaling` istisnası) Levent onaylı (26 Kas). Görseller `9c7/paylas-sonra.jpg`, tam boy PNG `9c7/paylas-kart.png`.

## Ek 3 · Gelişim ekranı: kısa defter (9c-5, 2026-11-27, Levent)
Bugünkü Gelişim simülatörde çekildi ve sorunları işaretlendi (`prototip/gorsel-yon/9c5/gelisim-simdi.jpg`): sayfa 3,6 ekran boyu, grafik
çizgisi siyah ve noktalı, güç seçimi kutulu ve kesik haplar, kas haritası büyük ve dokunulmuyor, kas başına set 12 satır, "Düzen" kartı,
12 karar (çoğu "Değişiklik yok"), fotoğraf en dipte. Agent üç yönü gerçek veriyle simülatörde çizdi (`9c5/gelisim-varyantlar.jpg`,
aynı ölçekte): A · Kısa defter (2,1 ekran), B · Liste (2,4), C · Sekmeli (1,4). **Levent A'yı seçti.** B'nin büyük fotoğraf kartı ve
iki sütun kas listesi, C'nin "aynı anda tek panel"i seçilmedi.

**Uygulama (K-1246):**
1. **Sıra:** karar cümlesi (altında "8/10 hafta hedefte"), ilk günlerde hedef kutuları, **Fotoğraflar**, Kilo, Güç, Bu haftanın kasları,
   Kararlar, Paylaş. Hedef kutuları ilk günlerde kararın hemen altında kalır, çünkü karar cümlesi onlara dokunmayı söyler.
2. **Fotoğraflar tek satır:** serif başlık, pencere cümlesi, sağda küçük petrol "Fotoğraf çek". Pencere açıkken zemin `tintSuggest`
   (uygulamanın önerdiği eylem), açılmamışken `tintDay`. Fotoğraf sayısı, "Karşılaştır" ve "Tüm fotoğrafları sil" yalnız fotoğraf varken,
   aynı kartta satırın altında.
3. **Grafikler (kilo, güç):** çizgi petrol ve ince, ara noktalar yok, son nokta mercan ("buradasın", §1). Kararın tuttuğu haftanın halkası kalır.
4. **Güç seçimi:** kutulu haplar kalkar. Hareketin adı petrol serif ve yanında aşağı ok; dokununca sistemin seçim listesi programın
   sırasıyla açılır. Sağda soluk "N hareket". Tek hareket varsa ok ve liste yok.
5. **Bu haftanın kasları dokunulur:** harita daha küçük; haritada bir kasa dokununca altındaki satır o kasın bu haftaki setini gösterir
   ("Göğüs · 4 / 10 set", mercan ilerleme çubuğu). Açılışta sunucunun listesindeki ilk kas. Bir alanda birden çok kas varsa (omuzlar)
   hepsi alt alta. "Planlanan" işaretinin kenarı görünür (WCAG 1.4.11). **"Kas başına set" kartı kalkar.**
6. **"Düzen" (12 hafta) kartı kalkar.** Haftaların sayısı karar cümlesinin altında ve ana ekranda kalır.
7. **Kararlar kısalır:** son 3 karar; altında petrol "ve N karar daha", dokununca listenin geri kalanı aynı kartta açılır (Antrenman
   sekmesindeki "ve N tane daha" ile aynı, Ek 2 › Uygulama #7). Kaç karar açık geldiği `data/parameters/progress.json`'da.
8. **Kelime bütçesi 50 aynen kalır** (`data/copy/word-budgets.json`). Fotoğraf satırı ilk ekrana çıktığı için pencere cümleleri ikinci
   cümlelerinden kısaldı ("Aynı yer, aynı ışık" ipucu çekim ekranında zaten var): "İlk fotoğraf: 4. hafta.", "İlk fotoğrafının zamanı geldi.",
   "Hazır olunca ilk fotoğrafını çek.", "Sonraki fotoğraf … tarihinden itibaren.", "Fotoğraf penceresi … tarihinden beri açık."
9. İlk günlerde güç kilidi kasların altında kalır (o gün güçte gösterilecek bir şey yok); ilk karardan sonra sıra #1'deki gibidir.
10. Levent sonucu simülatörde gördü ve onayladı (27 Kas; `9c5/gelisim-sonra.jpg`: 3,6 → 2,2 ekran boyu). Sistem seçim listesi petrol
    (§3). K1 (Düzen kartının 9 testi, kas başına setin 4 testi, güç haplarının 10 testi ve kaydırma testi, 5 grafik testi, sıra ve
    yüzey testleri, harita çağrısı, iki testin yeni API'ye uyması) Levent onaylı (27 Kas).

## Ek 4 · Öğün kaydet: başlık öğün (9c-6, 2026-11-27, Levent)
Bugünkü öğün kaydet, arama ve porsiyon adımı simülatörde çekildi ve sorunları işaretlendi (`prototip/gorsel-yon/9c6/yemek-simdi.jpg`):
- "Akşam yemeği" hapta iki satıra kırılıyor, kalori gelince seçili hapın yazısı kayıyor (Levent'in "font kayması").
- Seçili hap siyah.
- Türkçe kalıplar bozuk: "Genelde öğle yemeği öğününde", "Son öğle yemeği öğünün, 25 Kas Çar", "Öğle yemeği öğününe ekle".
- "Hızlı ekle" ve "Yiyecek oluştur" iki büyük hap, boş tepsi kartı "Henüz yok" yer kaplıyor.
- Makro noktaları mor ve kahve (rol tablosunda yok); porsiyonda ad serif değil, yalnız g ve oz, soru cümlesi uzun.
- Simülatörde Türkçe arama boş (fikstürde Türk yemeği yoktu; gerçek sunucuda 57 yemek var).
Agent üç yönü gerçek Türk yemekleriyle simülatörde çizdi (`9c6/yemek-varyantlar.jpg`): A · Sade haplar, B · Başlık öğün, C · Sekmeler ve
ölçü listesi. **Levent B'yi seçti.**

**Uygulama (K-1247):**
1. **Başlık öğünün kendisi:** yeni öğünde ekranın başlığı "Öğün kaydet" değil, seçili öğünün adıdır (serif, yanında petrol aşağı ok). Altında
   soluk "Bugün · 610 kcal" ya da "Bugün · henüz boş" (geçmiş günde günün adı). Dokununca sistemin seçim listesi açılır, her öğün bu günkü
   kalorisiyle; tint petrol (§3, Ek 3 #4 ile aynı). Dört hap kalkar; seçim dar alana sıkışmaz, yazı kaymaz. Düzeltme ekranı başlığı aynen kalır.
2. **Türkçe kalıplar öğün başına:** "Akşam yemeğine ekle · 140 kcal", "Genelde akşam yemeğinde", "Dünkü akşam yemeği", "25 Kas Çar · akşam
   yemeği". Her öğünün kendi metni copy dosyasında (Türkçenin ekleri öğün adına göre değişir).
3. **Tepsi yalnız doluyken:** boş öğünde "Henüz yok" kartı yok; başlıktaki "henüz boş" yeter.
4. **"Hızlı ekle" ve "Yiyecek oluştur"** listenin altında iki petrol metin düğmesi (seyrek kullanılır, Ek 2 › Uygulama #8 ile aynı ilke).
5. **Makrolar renksiz:** satırda "P 8 · K 20 · Y 4" soluk harf ve sayı, porsiyon adımında renkli çubuk yok, üç ad ve sayı. Rol tablosu dışında
   renk yok (§1). Günün yemek sayfasının çubukları ayrı parçada.
6. **Porsiyon adımı:** yemeğin adı serif; ev ölçüleri haplar (yemeğin kendi porsiyonu, çorba kepçesi, servis kepçesi, su bardağı, yemek kaşığı,
   g); Türkçe gösterilirken oz yok; tahmin sorusu yemeğin adını tekrar etmez.
7. Yemek adları kesilmez (erişilebilirlik testi `numberOfLines`'ı yasaklar, Dynamic Type büyüdükçe metin sarar); satırlar kısa
   kalıplarla kısalır (#2).
8. Levent sonucu simülatörde gördü (`9c6/yemek-sonra.jpg`). K1 (15 beklenti: öğün haptan değil başlık ve listeden, boş öğünde tepsi
   yok, Hızlı ekle ve Yiyecek oluştur metin düğmesi, soru adı tekrar etmez; aynı İngilizce metinle anahtar adları) Levent onaylı (27 Kas).
Seçilmeyen: A'nın dört kısa hapı ("Öğle", "Ara öğün"), C'nin alt çizgili sekmeleri ve porsiyonda gram ve kalorili ölçü listesi.

**Ayrı işler (mantık, sunucu):** yemeklerin porsiyon adı İngilizce geliyor ("1 bowl (250 g)"); ev ölçüsü kuralı "Pirinç pilavı", "Bulgur
pilavı", "Kuru fasulye" ve "Mercimek köftesi"ne ölçü vermiyor, "Su böreği"ni sıvı sayıyor (K-1248). Temel yiyecekler yalnız İngilizce adlı:
"yumurta", "süt", "ekmek" aramada çıkmıyor; Türkçe adlar kaynak ister (K-1249).

## Ek 5 · Günün yemek sayfası: hafta şeridi (9c-6, 2026-11-27, Levent)
Bugünkü sayfa simülatörde çekildi ve işaretlendi (`prototip/gorsel-yon/9c6/gun-simdi.jpg`, 2 ekran boyu): başlık "Bugünün beslenmesi" ve
altında yine "Bugün"; oklar ve bir aylık şerit iki ayrı gezinme; seçili gün siyah; makrolar mor, kahve ve petrol çubuk ile nokta; "Bugün kalana
uyar" öneriler kişinin öğünlerinden önce; öğün başlıkları düz kalın yazı. Agent üç yönü simülatörde çizdi (`9c6/gun-varyantlar.jpg`):
A · Hafta şeridi, B · Yalnız oklar, C · Katlı öğünler. **Levent A'yı seçti.**

**Uygulama (K-1250):**
1. **Başlık günün kendisi:** serif "Bugün", "Dün" ya da tarih ("25 Kas Çar"); "Bugünün beslenmesi" ve ikinci etiket kalkar.
2. **Şerit bir hafta görünür:** oklar kalkar; ayın günleri kaydırılır, bir anda 7 gün (`food.json › day_strip_visible`). Seçili gün petrol
   dolgu, üstünde beyaz; başka gün seçiliyken bugünün harfi mercan (`progressText`); kayıtlı günde petrol nokta.
3. **Makrolar mercan çubuk:** üç makronun çubuğu "ne kadar ilerledin" rengiyle (§1), renkli nokta yok, ad ve "yenen / hedef g".
4. **Öğün başlıkları serif** (§2, bölüm başlığı).
5. **Öneriler öğünlerden sonra**, başlığı "Kalana uyanlar".
6. Levent sonucu simülatörde gördü (`9c6/gun-sonra.jpg`). K1 (9 beklenti: oklar yerine şeridin günü, başlık "Today") Levent onaylı (27 Kas).
Seçilmeyen: B'nin oklu başlığı (kayıtlı günler görünmüyordu), C'nin katlı öğünleri (miktar ve kalori bir dokunuş uzakta).

## Ek 6 · Yürüyüş haritası: Bugünün yürüyüşü sayfası, harita ücretli (9c madde 7, 2026-11-27, Levent)
Bugünkü yol simülatörde çekildi ve işaretlendi (`prototip/gorsel-yon/9c7-yuruyus/yuruyus-simdi.jpg`): harita Ayarlar › Senin hakkında › Aktivite ›
Yürüyüşlerim › Haritayı aç'ta (5 dokunuş); ana ekrandaki yürüyüş satırı gri ve Apple Health'i açıyor; haritadan kaydedilen yürüyüşün adı 24 harfte
kesiliyor ("Akdeniz Üniversitesi ile gidiş dönüş"); harita ekranında rota haritadan taşıyor ve sonuç bugünkü açığa bağlanmıyor; kardiyo yalnız dakika.
Agent üç yönü simülatörde gerçek rotayla çizdi (`9c7-yuruyus/yuruyus-varyantlar.jpg`): A · Kendi sayfası, B · Ana ekranda harita, C · Hareket
penceresi (Kardiyo ve Yürüyüş sekmeleri). Ücretsiz sınırı için üç kilit (`9c7-yuruyus/yuruyus-ucretli.jpg`): 1 · Harita ücretli, 2 · İlk rota
ücretsiz, 3 · Hepsi ücretli. **Levent A'yı ve 1'i seçti** (para kararı, 9d para haritasının ilk satırı).

**Uygulama (K-1251):**
1. **Bugünün yürüyüşü sayfası** (`/walk`): serif başlık; kum grupta kalan adım (yuvarlak rakam), mercan ilerleme çubuğu ve "4.200 / 10.000 ·
   yaklaşık 53 dk yürüyüş"; altında harita (kapatan yürüyüşün rotası noktalı petrol); "Hangisi kapatır" sistem listesi: her yürüyüşün gidiş dönüş
   adımı ve dakikası, motorun önerdiği (K-1216 `suggestWalk`) "Kapatır" ve petrol tikle; kapatmayan satırda eksik sayısı yazılmaz (U7);
   altta petrol metin düğmesi "Yürüyüş ekle ya da değiştir" (Yürüyüşlerim sayfası).
2. **Girişler:** Bu hafta'daki yürüyüş satırı petrol metin düğmesi olur ve bu sayfayı açar (Apple Health'i değil); + › Kardiyo penceresinde
   "Bugünün yürüyüşü" satırı. **Ayarlar › Aktivite'deki "Yürüyüşlerim" satırı kalkar.**
3. **Ücretli (seçenek 1):** ücretsiz: kalan adım, dakika, elle yazılan yürüyüşler ve hangisinin kapattığı. Ücretli: harita, yer arama, rota ve adım
   ölçümü. Abonelik yokken haritanın yerinde kum kilit kartı ("Harita ve rota abonelikle gelir" + "Planları gör"); yürüyüş haritası ekranı da
   abonelik ister. Abonelik okunamazsa kilit değil, "harita yüklenemedi" denir (ödeyen kişi kilit görmez).
4. **Yan düzeltmeler:** haritadan kaydedilen yürüyüş adı sığmıyorsa yalnız varış yeri ("MACFit"); kayıtlı yürüyüş iki yerini bilir ki sayfa rotasını
   çizsin; harita ekranı rotayı çizince haritayı rotaya sığdırır.
Seçilmeyen: B (ana ekran 130 pt uzar, rota o boyda okunmaz), C (alttan gelen pencere ve bir sekme dokunuşu daha); 2 ve 3. Harita düzenleme ekranının
kendisi (arama önce, tam boy "sil" düğmeleri) ayrı kart.

## Ek 7 · Yürüyüş haritası düzenleme ekranı: rota fişi (9c madde 7, 2026-11-27, Levent)
Bugünkü ekran simülatörde çekildi ve işaretlendi (`prototip/gorsel-yon/9c7-yuruyus/harita-simdi.jpg`):
- arama formu ve gri "Ara" düğmesi haritanın önünde;
- tek yer kalınca harita en yakın zoom'a gidip gri kalıyor;
- her yerin altında tam boy "X yerini sil" düğmesi;
- sonuç ve "Yürüyüş olarak kaydet" en altta kum düğme, kayıt notu ekranın dışında, bugünkü açığa bağlı değil;
- elle km yazmak ayrı sayfa (Yürüyüşlerim).
İlk tur üç yön (`harita-varyantlar.jpg`: harita önde, nereden-nereye, tek sayfa) Levent'e "LLM'den çıkan ilk görsel" gibi geldi: varsayılan
iğneler, işletmelerle dolu harita, kart üstüne kart. İkinci tur (`harita-varyantlar-2.jpg`) haritayı ve işaretleri baştan çizdi; üç kompozisyon:
A · Rota fişi, B · Harita sayfanın kendisi (kenardan kenara harita, kâğıt pencere), C · Yürüyüş defteri (tek sayfa, elle km ile). **Levent A'yı seçti.**

**Uygulama (K-1252):**
1. **Sessiz harita:** Apple'ın soluk harita tipi (`mutedStandard`), işletme, bina ve pusula yok, eğme kapalı; tema koyuysa harita da koyu.
   Bugünün yürüyüşü sayfasındaki rota haritası (Ek 6 #1) da aynı haritadır.
2. **Kendi işaretler:** başlangıç petrol halka, varış dolu petrol nokta, seçilmeyen yer küçük gri nokta; yerin adı noktanın üstünde küçük kâğıt
   etikette (ince çizgi, 13 pt). Varsayılan iğne ve renkli iğne kalkar. Rota kâğıt kenarlı düz petrol çizgi (noktalı değil); iki sayfada aynı.
3. **Arama haritanın üstünde tek satır:** büyüteçli kâğıt hap; yazınca sağında petrol "Ara". Sonuçlar haritanın altında sistem listesi.
   Apple Haritalar notu ve "haritaya basılı tut" en altta küçük yazı.
4. **Tek yer sokak ölçeğinde:** tek nokta `fitToCoordinates`'e verilmez, o yerin çevresi gösterilir.
5. **Rota fişi haritanın hemen altında:** halka, yer adı (serif), noktalı dikey çizgi yanında "3,2 km · 39 dk tek yön", dolu nokta, varış adı (serif).
   Altında büyük yuvarlak rakam "8.476" ve "adım gidiş dönüş · 77 dk". Bugünkü adım okunduysa mercan çubuk yürüyüşün kalan adımın ne kadarını
   kapattığını gösterir; kapatıyorsa petrol tik ve "Bugün kalan 5.800 adımı kapatır", kapatmıyorsa yalnız "Bugün kalan 5.800 adım" (eksik
   sayısı yok, U7). Ardından tek petrol birincil düğme "Yürüyüşlerime ekle".
6. **Yerler:** serif "Yerlerin" başlığı, sağında petrol "Düzenle"; satır simgesi rolü söyler (halka, dolu nokta, boş). "Düzenle" satırlara kırmızı
   sil işareti koyar, satıra dokunmak siler; tam boy sil düğmeleri kalkar.
7. Levent sonucu simülatörde gördü (`9c7-yuruyus/harita-sonra.jpg`). K1 (yürüyüş cümlesi ve gidiş dönüş adımı erişilebilirlik etiketinde, çizgi düz,
   silme Düzenle'den, yer işaretiyle bulunur, Bugünün yürüyüşü'nde iki çizgi) Levent onaylı (27 Kas).
Seçilmeyen: B (harita büyük ama yerler pencerede hap, elle km yine ayrı), C (tek sayfa, elle km birlikte; sayfa uzun, sonuç ilk ekranın altında).
Elle km Yürüyüşlerim sayfasında kalır (A'nın bilinen bedeli). Hiç yer yokken haritanın başlangıç bölgesi aynen kalır (konum okunmaz, V1).

## Ek 8 · Abonelik ekranı: önce senin kararın, sonra takvim, sonra fiyat (9c madde 8, 2026-11-28, Levent)
Simülatörde App Store yok; ekran bugüne kadar yalnız TestFlight'ta görülebiliyordu. Önce **abonelik önizleme modu** kuruldu (plan 9b): yalnız
geliştirme derlemesinde (`__DEV__`) ve `EXPO_PUBLIC_PAYWALL_PREVIEW=1` iken örnek planlar (`data/parameters/subscription.json` ›
`paywall_preview_plans`: ADR-012'nin $59.99/yıl ve $12.99/ay, ADR-071'in 2 haftası). Hiçbir şey satmaz (Apple sayfası yok, sunucuya bir şey gitmez);
mağaza derlemesi bayrak ne derse desin gerçek mağazayı alır. Bugünkü ekran simülatörde çekildi ve işaretlendi (`prototip/gorsel-yon/9c8-abonelik/abonelik-simdi.jpg`):
- sheet içinde durum çubuğu payı 60 pt boş şerit, kaydırınca da tepede kalıyor;
- açık petrol bant üstünde beyaz kart (kart üstüne kart; açık petrol rol tablosunda yok);
- "Örnek" ve "%61 tasarruf" dolu petrol: düğmeyle üç dolgu;
- üç serif başlık yarışıyor, fiyat ve tarihler düz rakam;
- değer ikonları sözle eşleşmiyor ve kutucukta; ilk iki değer satırı aynı şeyi söylüyor;
- zaman çizelgesi kum kartta, başlığı küçük gri, siyah halkalar.
Kilit kartları (Bu hafta, yürüyüş haritası) zaten bu dilde; değişmez.

İlk tur üç yön (`abonelik-varyantlar.jpg`): A · Kâğıt sayfa, B · Takvim önde, C · Karar önde + yatay yol. Levent B ile C'nin karışımını istedi:
C'deki kararın önde olması daha vurucu, B'nin fiyat kutuları ve takvimi daha iyi; kalori hesabı insanlara yabancı, vaat görmek ister; kilo ya da
kişinin gelişimi daha bağlayıcı olabilir. **Kural:** kilo vaadi ("8 haftada X kg") paywall'a giremez: U12 (projeksiyon varsayılan kapalı, ilk 4 hafta /
2 ölçüm, SCOFF), ADR-050 sağlık kapısı, ADR-069 #3 (projeksiyon ana yüzeyden indi), Apple 1.4.1. Girebilen: kişinin **kendi geçmiş kilo çizgisi**
(sunucunun trendi, U1) ve **hazır bekleyen kararı**. İkinci tur (`abonelik-karisim.jpg`): D · Senin kararın (karar → fiyat → takvim), E · Örnek, kilo
diliyle, F · Takvim fiyattan önce. Ayrıştırıcı kendi verimiz yok (analitik, A/B yok); kategori kalıbı (`arastirma/ham/M2-akis-kiyasi.md` › K1, K3:
Cal AI, BetterMe, Ladder önce deneme takvimi, sonra plan; kahraman kişinin kendi çıktısı) F sırasını destekler. **Levent F + E'yi seçti.**

**Uygulama (K-1253):**
1. **Bant ve kart yok:** sayfa kâğıt. Üstte küçük marka satırı (simge + ad) ve sağda petrol metin düğmesi "Kapat" (zorunlu kapıda Hesap). Durum
   çubuğu payı yalnız tam ekran kapıda; sheet'te yok.
2. **Kahraman, sırayla:** onboarding'den hemen sonra kişinin planı (K-1058 kartı, rozet yazı); **kararı kilitliyse "Kararın hazır"**: haftası
   mercan yazı, serif başlık, kilo trendi hazırsa kendi kilosu (yuvarlak rakam), pencere içindeki değişimi ve petrol trend çizgisi (Bu hafta'daki
   aynı okuma, `/v1/weight-trend`), altında tek cümle; **değilse örnek karar kilo diliyle** ("Kilon 3 haftadır yerinde", örnek çizgi
   `paywall_example_weight_kg`, kişinin birimiyle, altında "Karar" satırı) ve "Örnek" çerçeveli yazı. Sağlık verisi rızası yoksa set örneği kalır.
   Okunamazsa sessizce örnek (hata satırı yok; satış kapısında hata kişiyi korkutur, ödeyen kişi zaten burada değil).
3. **Takvim adaçayında, fiyattan önce:** başlığı ekranın serif başlığıdır ("Ücretsiz dene" + petrol "2 hafta boyunca"; denemesizse yalnız başlık);
   bugün mercan nokta ve mercan yazı, sonrakiler petrol halka, ray soluk petrol; tarihler yuvarlak rakam.
4. **Fiyat kutuları yan yana:** kum zemin, seçili petrol çerçeve + petrol radyo; ad, büyük yuvarlak fiyat, yıllıkta ayda fiyat ve petrol yazı
   tasarruf (dolgu yok). Yıllık seçili gelir. Fiyat, deneme ve tasarruf mağazanın (ADR-057 D3); sayılar değişmez.
5. **Değerler petrol tikle**, kutucuk ve ikon yok; kararlı planda "Her hafta bir karar" ile "İlk kararından sonraki her karar" tek satır olur:
   "İlk kararından sonra her hafta bir karar, gerekçesiyle" (Levent, 28 Kas).
6. **Alt kısım aynen:** tek petrol düğme, fiyat satırı (Apple 3.1.2), Geri yükle, Şartlar, Gizlilik petrol bağlantı (altı çizgisiz).
7. **Psikoloji, hepsi Apple ve U7 içinde:** sahiplik (kendi verin, hazır kararın), merak (karar içeride, kayıp dili yok), şeffaf takvim, çapa
   (yıllık seçili, ayda fiyat, tasarruf), tek düğme. Sahte geri sayım, sahte yorum, gizli kapatma, ikinci paywall yok.
Seçilmeyen: A, B, C (ilk tur), D (fiyat takvimden önce). **Ayrı iş:** uygulama içi puan isteme (K-1254): yalnız Apple'ın kendi penceresi
(App Store Review Guidelines 5.6.1: özel puan penceresi yasak; ödüllü puan isteme de yasak, madde numarası **[doğrulanmadı]**), olumlu bir anda.

## Ek 9 · Ayarlar: içindekiler, her bölüm kendi sayfası (9c madde 9, 2026-11-28, Levent)
Bugünkü ekran simülatörde tam boy çekildi ve işaretlendi (`prototip/gorsel-yon/9c9-ayarlar/ayarlar-simdi.jpg`, 2,8 ekran, 15 grup, 30 satır):
- sayfa en az dokunulan üç seçimle açılıyor (görünüm, dil, birim); seçili kutu siyah dolgu (rol tablosunda siyah yok);
- "İngiliz birimleri (lb, ft, in)" kutuyu eziyor; grup başlıkları küçük kalın sistem yazısı;
- 15 kum kart: §1'in "bir ekranda en çok üç renkli grup" kuralı çiğneniyor; tek satırlık beş kart üst üste;
- her satır aynı (sistem ikonu, ad, gri değer, ok); kararı değiştiren ayar boy ve doğum yılıyla aynı ağırlıkta;
- ana hatırlatıcı kapalıyken alttaki iki düğme koyu gri (bozuk mu kapalı mı belli değil), ne yaptıkları altta paragrafta;
- "Hesabı sil" çıkış ve dışa aktarmayla aynı mürekkepte.
Üç yön simülatörde bugünkü değerlerle çizildi (`ayarlar-varyantlar.jpg`): A · Defter sayfası (kartsız, ikonsuz satırlar, seçim petrol alt
çizgi), B · Önce kararı değiştirenler (A + üstte tek adaçayı grup "Kararın bunlara bakar"), C · İçindekiler (tek ekran bölüm listesi, her bölüm
kendi sayfası). **Levent C'yi seçti, bölüm sayfaları B'nin düzeniyle** ("C daha derli toplu, sonrasında B'deki şeyleri bölüm bölüm gösterir").

**Motor gerçeği (agent kodda doğruladı, 28 Kas):** haftalık kararın okuduğu ayarlar antrenman günleri (program yoksa; `DecisionService` ilk
hafta, `PlannedSessions`), kontrol günü (`CheckInWeek.weekOf`: hangi haftanın kararı, ne zaman açılır), hedef (yalnız ilk planın evresi),
boy, aktivite ve doğum yılı (dinlenme enerjisi, yaş). **Okumadıkları:** kardiyo (motor kardiyoya evreyi verir, tersi yok), setler arası
dinlenme (zamanlayıcı ayarı), uzak durulan yiyecekler (yalnız öneriler). Bu yüzden "Kararın bunlara bakar" grubu yalnız okunanları tutar;
B taslağındaki kardiyo o gruptan çıkar.

**Uygulama:**
1. **Ayarlar içindekiler (K-1257):** serif ekran başlığı, altında dokuz bölüm satırı kâğıt üstünde, ince çizgiyle: serif bölüm adı, altında bugünkü
   değerleri tek muted satırda, petrol olmayan ok. Bölümler sırayla: Haftan, Sen, Hatırlatıcılar, Sağlık ve veri, Koç, Abonelik, Uygulama,
   Hakkında, Hesap. Özet satırı yalnız ekranın zaten okuduklarından (program, profil, abonelik, telefon ayarları); başka bölümler içindekileri
   adıyla söyler. Değer kesilmez, sarar.
2. **Bölüm sayfası:** `settings-section?section=…`, başlığı bölüm adı (serif). Haftan ve Sen'de üstte tek adaçayı grup "Kararın bunlara bakar"
   (Haftan: haftanın günleri petrol noktayla + antrenman günleri + kontrol günü; Sen: hedef, boy, aktivite, doğum yılı); geri kalanı altında.
   Diğer bölümler bugünkü gruplarını taşır; Koç bölümü doğrudan koç ayarlarıdır.
3. **Satırlar kâğıtta (K-1258):** Ayarlar sayfalarında kum kart yok, satırlar ince çizgiyle; sistem ikonu yok; seçimler (görünüm, dil, birim)
   kelime olarak, seçili olan petrol yazı + petrol alt çizgi (siyah dolgu yok; Ek 7'deki "Haritada | Mesafesini yazarak" dili), birimler
   "kg, cm · lb, ft, in"; ana hatırlatıcı kapalıyken alt düğmeler yok, tek cümle; "Hesabı sil" `warn` yazı, ayrı.
Seçilmeyen: A (tek uzun sayfa, 2,2 ekran), B tek sayfa olarak. Bedeli: her değişiklik bir dokunuş fazla.
Sonuç simülatörde (`ayarlar-sonra.jpg`). K-1257 K1 (9 madde: bölümlere taşınan grupların testleri, sıra, başlıklar, kelime bütçesinin ilk görünümü) Levent onaylı (28 Kas).
K-1258 (`ayarlar-sonra-2.jpg`): `OnPaper` bağlamı Ayarlar sayfalarında ListGroup'u kartsız ve ikonsuz çizer (başka ekranlar değişmez), grup başlığı
serif; seçim `WordChoice` (birim kısa yazı, ekran okuyucu tam adı); kapalı hatırlatıcıda öğün ve yürüyüş satırı yok, tek cümle; "Hesabı sil" kendi
grubunda `warn` yazı: evre 7 §A'nın "kırmızı yalnız uyarıda" düz satırı §3 ile kalkar. K1 (7 madde) Levent onaylı (28 Kas).
