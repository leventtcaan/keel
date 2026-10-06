# M4 · Sosyal döngü (R4) — Faz 5 · ürünün yüzü (ADR-068)

- **Tarih:** 2026-10-07 · **Durum:** ham araştırma, karar yok (sentez `06-faz5-yuz.md`'de)
- **Rakip kümesi:** `M0-rakip-listesi.md` (çekirdek 14 + komşular Strava, Runna, Liftoff, Finch)
- **Üstüne kurduğu dosyalar:** `05-faz4-pazarlama.md` §3.1-3.4 · `K3-youtube-koprusu.md` (D.3, Sonuç 1) · `K4-cok-kanalli-edinim.md` (A2, C13, C14, F)
  — oradaki bulgular tekrar edilmedi, yalnız atıf yapıldı.
- **Yöntem:**
  1. Şirket sayfaları, yardım merkezleri, App Store açıklamaları, basın bültenleri (WebFetch).
  2. **TikTok'un kendi hashtag sayacı:** `tiktok.com/tag/<etiket>` sayfasının girişsiz çağırdığı `api/challenge/detail` yanıtı
     (`statsV2.videoCount`, `statsV2.viewCount`). Ham veri: scratchpad `m4/tiktok-hashtags-*.json` (depoda değil).
  3. TikTok Creative Center (girişsiz, yerleşik tarayıcı, ayrı sekme) — erişim durumu §2.1'de.
  4. Marka hesaplarının son videoları: `yt-dlp --skip-download --flat-playlist` (yalnız meta veri, video indirilmedi).
  5. Hakemli literatür: PubMed E-utilities.
  6. Genel web araması. Oturumun WebSearch kotası (200) araştırmanın ortasında bitti; kalan aramalar Brave Search sayfası
     üzerinden yapıldı, o da bir süre sonra 429 (çok fazla istek) döndü. Bu yüzden bazı sorular "bulunamadı" ile kapandı (§ Bulunamayanlar).
- **Kanıt etiketleri:** **[RESMÎ]** şirketin kendi kaynağı (sayfa, yardım merkezi, bülten, App Store metni) ya da platformun kendi sayacı ·
  **[HAKEMLİ]** hakemli dergi · **[3.P]** üçüncü taraf (adı yazılı) · **[ÇIKARIM]** benim yorumum · **[doğrulanmadı]**.
- **Erişim tarihi:** aksi yazılmadıkça bütün URL'ler **2026-10-07**.

---

## Özet

1. **Kategoride ölçülmüş tek ürün içi paylaşım etkisi Hevy'de.** Instagram/Facebook Stories paylaşımı eklenince 8 haftada sosyal
   paylaşım %42, uygulamanın viralliği %25, global kurulum %12 arttı. Yıllık özet haftasında paylaşım %59 arttı (Meta'nın
   resmî vaka sayfası, Hevy CEO'sunun alıntısıyla) [3.P — Meta]. Strava, Liftoff, Runna, Ladder, Fitbod için ölçülmüş etki **bulunamadı.**
2. **Paylaşılan şey sonuç değil, kanıtlanabilir iş:** antrenman kartı (PR, hacim, kas dağılımı), aylık/yıllık özet ve video üstüne konan
   **şeffaf istatistik çıkartması** (Strava Sticker Stats, Nisan 2025; Hevy'de şeffaf arka plan). Üç büyük uygulama aynı kalıba yakınsamış:
   gym/koşu videosunun üstüne konan, markalı ama küçük bir veri katmanı [RESMÎ].
3. **Yıllık özet (Wrapped) kategorinin en güçlü paylaşım anı:** Spotify Wrapped 2025 ilk 24 saatte 500 milyon paylaşım (+%41) [3.P — Music Week,
   Spotify açıklaması]. 2023'te Wrapped günü indirmeler bir önceki güne göre %35 arttı [3.P — Sensor Tower]. Strava bu anı ücretli
   aboneliğe taşıdı; Hevy ücretsiz bıraktı [RESMÎ].
4. **Kategoride organik içerik izlenmesi uygulamanın etrafında değil, hayatın etrafında dönüyor:** #whatieatinaday 2,6 milyon video /
   40,8 milyar izlenme; #transformation 13,6 milyon / 214 milyar; #gymhumor 2,8 milyon / 67,5 milyar. Uygulama adlı etiketler küçük:
   #calai 6,3 bin video, #macrofactor 946, #hevy 26 bin [RESMÎ — TikTok sayacı]. Cal AI'ın en iyi videoları uygulamayı neredeyse hiç anmıyor [3.P].
5. **Kreatör programı = kod + komisyon ya da maaşlı kreatör.** MacroFactor ilk ödemenin %40'ı + 14 günlük deneme kodu; Hevy %25 yinelenen
   (5 bin takipçi alt sınırı); Runna referans başına £10'luk giyim hediye kartı; Ladder marka TikTok hesaplarını kendi işe aldığı
   kreatörlere işletiyor; Cal AI ~300 kreatörle aylık sabit ücretli anlaşma (Ghost raporu) [RESMÎ / 3.P].
6. **Hakemli kanıt iki yönlü:** rekabet temelli oyunlaştırma RCT'de adımı en çok artıran koldu (+920 adım/gün) [HAKEMLİ]. Öte yandan
   Strava kullanıcıları yavaş koşularını siliyor, paylaşımlarını kuruyor. Kalori bilgisi içeren "what I eat in a day" videoları genç erkeklerde
   utanç ve suçluluğu artırıyor [HAKEMLİ]. → Paylaşım tasarımı U7 ile doğrudan temas ediyor.
7. **keel'in aday anlarından "haftalık karar kartı" ve "koç hayır dedi" anının rakipte karşılığı bulunamadı.** Tutarlılık ve PR kartının ise
   birebir karşılığı var (Hevy, Liftoff). → Farklılaşma "karar"da, eşitlik "kayıt"ta [ÇIKARIM].

---

## 1 · Paylaşılabilir anlar — rakip ürünlerin içinde

### 1.1 Strava (komşu, sosyal döngünün kategori lideri)
- **Ne paylaşılıyor:** her aktivite uygulama içi akışa düşüyor; diğer kullanıcılar **kudos** ve yorum veriyor. Strava'nın 2025 Year in Sport
  bülteni: 2025'te **14 milyar kudos**, 180 milyon+ kullanıcı [RESMÎ — PR Newswire/Adnkronos, 3 Ara 2025].
- **Dışarıya:** aktivitenin "Share" düğmesi; **Sticker Stats** (Nisan 2025): mesafe, tırmanış, süre, rota çizgisi ve **Strava logosu**ndan
  oluşan şeffaf çıkartma. Panoya kopyalanıp fotoğrafa konuyor ya da doğrudan Instagram Story'ye aktarılıyor. **Gizli aktivite paylaşılamıyor**
  (görünürlük "everyone" ya da "followers" olmalı) [3.P — BikeRadar, 9 Nis 2025].
- **Year in Sport:** 2016'dan beri kişiye özel yıllık animasyon. 2018'de sitenin yayında kaldığı ay "milyonlarca" benzersiz video üretildi
  [3.P — Stink Studios, ajansın vaka sayfası]. Artık **yalnız abonelere açık.** Strava'nın gerekçesi: "Year in Sport ve aylık istatistik
  kartları gibi içgörü ve hikâye katmanı" abonelikle açılıyor [3.P — road.cc]. Paywall'ın ilk yılı kaynaklar arasında tutarsız:
  road.cc sayfası 23 Ara 2025 tarihli, başka özetler 2022-2023 diyor [doğrulanmadı].
- **Ölçülmüş etki:** Year in Sport'un paylaşım sayısı ya da büyümeye etkisi **bulunamadı.** Strava S-1'ini Şubat 2026'da gizli olarak
  sunmuş [3.P — Sacra/SGI Europe arama özeti]. Metin kamuya açık olmadığı için metrik yok.
- **Hakemli:** 19 rekabetçi kadın koşucuyla yapılan nitel çalışmada platformun **herkese açık olması** deneyimin merkezinde. Katılımcılar
  nasıl görüneceklerini etkilemek için paylaşımlarını bilinçli olarak kuruyor (Russell vd., *Psychol Sport Exerc* 2026) [HAKEMLİ].
  225 kulüp koşucusunda, yavaş tempo yüzünden antrenman **silmiş** olanlar "başkasından kötü görünmekten kaçınma" hedefinde daha yüksek
  puan alıyor; Strava geri bildirim ve rutin sağlıyor ama sakatlıkta baskı ve kıyas da getiriyor (Rob Kolnes & Øvretveit, *Behav Sci* 2026) [HAKEMLİ].

### 1.2 Hevy (çekirdek #8)
- **Ne paylaşılıyor:** antrenman bitince otomatik üretilen **shareables**: PR'lar, toplam hacim, kas dağılımı grafiği, "kamyon kaldırmış
  gibisin" türü karşılaştırmalar, tutarlılık takvimi / "gym streak", aylık özet, en çok yapılan hareketler. Arka plan açık, koyu ya da
  **şeffaf** seçilebiliyor; şeffaf olan kullanıcının kendi gym videosunun üstüne konuyor. Kullanıcıdan @hevyapp etiketlemesi isteniyor [RESMÎ].
- **Uygulama içi:** takip akışı, beğeni/yorum, "Discover", 38 harekette arkadaşlarla lider tablosu, performans kıyası, iş başına 3 foto
  ya da 2 foto + 1 video. **Gizli profil** (takip onayı) var [RESMÎ]. Kullanıcı sayısı sayfada "17+ million" [RESMÎ].
- **Rutin paylaşımı:** tek rutin ya da bütün klasör link olarak paylaşılıyor; link hevy.com'da açılıp içe aktarılıyor [RESMÎ].
- **Aylık rapor:** ertesi ay Home sekmesinde "View Report" kutusu; ücretsiz [RESMÎ]. **Yıllık özet:** her Aralık, Home akışında
  otomatik açılıyor. Uygunluk: Kasım'dan önce ilk antrenman + en az 10 kayıt. Paylaşılabilir slayt var; ücretsiz [RESMÎ].
- **Ölçülmüş etki:** Mart-Mayıs 2021'de Stories entegrasyonu (2 haftada yapılmış) → 8 haftada sosyal paylaşım **+%42**. Paylaşımların
  %31'i Stories üzerinden. Global viralite **+%25**, global kurulum **+%12**. Aralık 2021 Year in Review haftasında (14-21 Ara) paylaşım
  **+%59** [3.P — Meta for Developers resmî vaka sayfası, Hevy CEO Guillem Ros alıntılı]. Vakanın yayın tarihi sayfada yok.
- **Marka hesabı:** Hevy TikTok hesabının son 35 videosunun (21 Nis - 6 Eki 2026) medyan izlenmesi **2.620**, en yükseği 25,6 bin
  [RESMÎ — TikTok meta verisi, yt-dlp]. → Büyüme marka hesabından değil, kullanıcının paylaşımından geliyor [ÇIKARIM].

### 1.3 Liftoff (komşu)
- **Rütbe:** set → tahmini 1RM (e1RM) → **vücut ağırlığı ve cinsiyete göre** 1-1000 güç puanı → dokuz rütbe: Wood, Bronze, Silver,
  Gold, Platinum, Diamond, Champion, Titan, Olympian. Lider tabloları arkadaş, ülke ve dünya düzeyinde. Günlük görevler var [RESMÎ].
- **Seri (streak):** **3 gün paylaşım yapılmazsa** kırılıyor. Sezon 4 ayda bir sıfırlanıyor. Kırılan seri, mağazadaki ürünlerle
  (Super Restore, Mega Restore, Streak Revive) 1 hafta içinde geri alınabiliyor [RESMÎ — FAQ].
- **Mahremiyet:** paylaşımlar **varsayılan olarak gizli** (yalnız kullanıcı ve arkadaşları görüyor). Discovery görünürlüğü paylaşım
  anında açılıp kapanıyor; paylaşımın parçaları tek tek gizlenebiliyor [RESMÎ — FAQ].
- **Ölçek:** 4 milyon+ indirme, App Store'da 98 bin değerlendirme, 4,8 [RESMÎ — App Store]. TikTok'ta #liftoffapp: 3,5 bin video /
  20 milyon izlenme [RESMÎ — TikTok sayacı]. TikTok'ta "what are all the ranks in Lift Off" başlıklı bir keşif (arama) sayfası var → rütbe sistemi aranan bir konu [3.P — Brave sonuç listesi; ÇIKARIM].
- **Ölçülmüş etki:** rütbenin ya da paylaşımın büyümeye etkisi **bulunamadı.**

### 1.4 Runna (komşu)
- **Strava'ya ödünç sosyal ağ:** Runna'dan Strava'ya senkronlanan her antrenmana **otomatik başlık ve açıklama** ("with Runna ✅") ile
  **plan ilerleme grafiği / antrenman görseli** ekleniyor. Görseller kapatılabiliyor ("Sync Plan Progress"). **Başlık ve açıklama uygulamadan
  kapatılamıyor**; yalnız Garmin üzerinden senkronlayanlarda eklenmiyor [RESMÎ — Runna yardım merkezi, 31 Ağu 2026 güncel].
- Strava'nın Runna'yı satın aldığı ve Runna antrenmanlarını Strava içinde gösterdiği bildiriliyor [3.P — T3, arama özeti; tarih doğrulanmadı].
- **Referans:** başarılı referans başına £10'luk Runna Apparel hediye kartı (en fazla £500 / 50 referans). Referans, arkadaşın 2 haftalık
  deneme sonrası standart fiyattan ödemeye geçmesiyle sayılıyor [RESMÎ — Runna şartları].
- **Marka hesabı:** son 35 TikTok videosunun medyanı **4.085** izlenme. En yüksekleri podcast kesiti (dünya rekortmeniyle, 420,6 bin)
  ve maraton insan hikâyesi (201 bin); ürün demosu ilk sıralarda yok [RESMÎ — TikTok meta verisi].
- **Ölçülmüş etki:** "with Runna" imzasının edinime etkisi **bulunamadı.**

### 1.5 Ladder (çekirdek #6)
- **Model:** kullanıcı bir quiz'le koç liderliğindeki bir **takıma** (program) giriyor. Koç her pazar yeni 7 günlük planı "düşürüyor".
  **Team Chat** bütün planlarda, 1:1 koç sohbeti ELITE'te [RESMÎ — joinladder.com/llms.txt]. Antrenman içinde takım arkadaşına **"cheers"**
  düğmesi var; 4.13.0 sürümüyle **Strava entegrasyonu** geldi [RESMÎ — App Store].
- **Kreatör:** "TikTok Creator (Ladder Creator Program)" ilanı. Kreatör, Ladder'ın marka TikTok hesabını işletiyor; günde 2+ paylaşım;
  TikTok, Reels ve Shorts için kamera önünde antrenman içeriği. İlan 13 Ara 2025'te kaldırılmış [3.P — Built In ilan sayfası].
- **Ölçek:** Aralık 2024'te ~150 bin ücretli abone, bir yılda 3 kat. Kullanıcıların %80'i daha önce fitness uygulaması kullanmıyormuş.
  Pazarlama harcaması General Catalyst'in 90 milyon dolarlık finansmanıyla [3.P — Fortune, 10 Ara 2024]. Sosyal katmanın bu büyümedeki
  payı **ayrıştırılmamış.**
- TikTok'ta #ladderapp: 6,2 bin video / 139,5 milyon izlenme (video başına 22,5 bin) [RESMÎ — TikTok sayacı].

### 1.6 Cal AI ve MyFitnessPal (çekirdek #3, #1)
- **Cal AI — ürün içi paylaşım:** App Store açıklamasında paylaşım, arkadaş ya da grup **yok** [RESMÎ — App Store, 7 Eki]. Ancak sitedeki
  **Community Guidelines** (Eylül 2026 güncel) grup paylaşımları, thread'ler ve DM'lerden söz ediyor → uygulama içi **grup** özelliği var
  ya da geliyor [RESMÎ; özelliğin kapsamı doğrulanmadı].
- **Cal AI — büyüme:** paylaşım düğmesi değil kreatör ağı (K4 A2'ye ek): ~10 bin aday arasından ~300 kreatör, hepsi aylık sabit ücretle.
  İçerik "what I eat in a day", seyahat vlog'u, gündelik an; uygulamanın adı sözle **söylenmiyor.** Brif: ürünü ilk 15 saniyede göster.
  Atıf, paylaşım zamanını App Store Connect indirme eğrisine bindirerek yapılmış [3.P — Ghost "UGC Audit" raporu, tarihsiz].
  Erken dönemde **~10 kurulum / 1.000 izlenme**; tek videolar 43M, 56M, 73M organik izlenme [3.P — FunnelFox blog, 24 Nis 2026; vendor].
  Bir ajans "500+ kreatör, ayda 250M+ izlenme, 15+ format testi" diyor [3.P — The Viral App, kendi portföy sayfası; ajans iddiası].
- **MyFitnessPal:** uygulamadaki **newsfeed 2024'te kaldırıldı** (20 Mayıs haftasından Haziran sonuna). Gerekçe "nadiren kullanılan özellik".
  Alternatif: Community sekmesi, arkadaş/takip olmadan profil aktivite akışı, **özel gruplar** [3.P — arama özeti; resmî destek makalesi
  403 döndü. Forumdaki moderatör yanıtı makaleye yönlendiriyor: RESMÎ forum].
- **MyFitnessPal Cal AI'ı satın aldı** (anlaşma Aralık 2025, duyuru 2 Mart 2026) [3.P — TechCrunch/GlobeNewswire'ın Brave sonuç özeti;
  birincil metin açılmadı → doğrulanmadı].
- TikTok sayacı: #myfitnesspal 51,6 bin video / 1,7 milyar; #calai 6,3 bin / 212,7 milyon (video başına 33,9 bin) [RESMÎ — TikTok].

### 1.7 MacroFactor (çekirdek #2) — sosyal yok mu, bilinçli mi?
- **Ürün içi sosyal akış yok.** Bağımsız bir inceleme bunu eksik olarak not ediyor: "Macrofactor doesn't have a social component" [3.P —
  Outlift, 3 Şub 2026]. Ürün içi tek paylaşım **tarif / özel yiyecek paylaşımı** (metin, e-posta, AirDrop) [RESMÎ — MacroFactor "New and Noteworthy", arama özeti].
- **Bilinçli mi?** Şirketin "sosyal yapmıyoruz çünkü…" diyen açıklaması **bulunamadı.** Dolaylı iki işaret:
  (a) 2024 yıllık raporu büyümenin "büyük kısmını" kullanıcıların ağızdan ağıza tanıtımına bağlıyor. Topluluk uygulama dışında:
  Facebook grubu, subreddit, Instagram. Kullanıcı sayısı 35 bin (2022) → 90 bin (2023) → 185 bin+ (2024) [RESMÎ — Annual Report 2024].
  (b) Bireysel referans kodu yok. Resmî hesabın gerekçesi olarak "kullanıcı verisi mahremiyeti zorlukları" gösteriliyor
  [doğrulanmadı — r/MacroFactor yanıtı, yalnız Brave sonuç özetinden; Reddit açılmadı].
- **Kreatör:** affiliate kodu kullanıcıya **uzatılmış deneme** (1 → 2 hafta) veriyor; ortak **ilk ödemenin %40'ını** alıyor (aylıkta $4,80,
  yıllıkta $28,80). Takipçi alt sınırı yazılmamış [RESMÎ — MacroFactor partnership sayfası]. Kurucu ortaklardan biri büyük bir fitness
  YouTuber'ı (K3 A.2).
- TikTok: #macrofactor 946 video / 19,2 milyon izlenme [RESMÎ — TikTok]. → Kategorinin teze en yakın ürünü TikTok'ta neredeyse görünmez;
  büyümesi YouTube + topluluk + ağızdan ağıza [ÇIKARIM].

### 1.8 Fitbod (çekirdek #7)
- Antrenman kaydı bitince sol alttaki Share → kart seçimi → Instagram Stories ya da "More". Kartla birlikte antrenmanın tam detayına
  **link** gidiyor. Özel (kullanıcının kendi oluşturduğu) hareket içeren antrenman paylaşılamıyor [RESMÎ — Fitbod yardım merkezi, arama özeti;
  sayfa 403 döndü].
- Ölçülmüş etki **bulunamadı.** #fitbodapp 1,5 bin video / 128,9 milyon izlenme (video başına 86 bin — muhtemelen az sayıda reklam/viral
  video çarpıtıyor) [RESMÎ — TikTok; yorum ÇIKARIM].

### 1.9 Spotify Wrapped — yıllık özetin referans vakası (kategori dışı)
- 2025: ilk 24 saatte **200 milyon** etkileşen kullanıcı ve **500 milyon paylaşım.** Paylaşım yıllık **+%41.** 2024'te 200 milyona 62 saatte
  ulaşılmıştı [3.P — Music Week, 4 Ara 2025; Spotify SVP Marc Hazan açıklaması]. Paylaşım tanımına native paylaşım, indirme ve ekran
  görüntüsü giriyor [3.P — IBTimes arama özeti].
- Wrapped günü (29 Kas 2023) global indirme bir önceki güne göre **+%35** (2022'de +%23), DAU **+%14** [3.P — Sensor Tower, Ara 2023].
  2019: yayın sonrası 3 günde 2,3 milyon indirme, önceki 3 haftanın aynı dilimine göre +%23 [3.P — Fortune, Sensor Tower verisi].
- **Kategoriye yansıması:** Hevy YIR haftasında paylaşım +%59 (§1.2). Strava ise aynı anı paywall'a aldı (§1.1).

---

## 2 · İçerik formatları — kategoride organik içerik

### 2.1 TikTok Creative Center — girişsiz erişim durumu (7 Eki 2026)

| Bölüm | Erişildi mi | Ne görüldü |
|---|---|---|
| Trends → Hashtag (`ads.tiktok.com/creative/creativeCenter/trends/hashtag?region=US`) | **Kısmen** | Yalnız **ilk 3 hashtag**; "View more" giriş istiyor. Bölge listesinde US, UK, AU, CA var. Sektör filtresinde **Health**, **Sports & Outdoor**, **Food & Beverage** seçenekleri var. |
| Sektör filtresi (Health / Sports & Outdoor) | **Hayır** | Tarayıcı paneli gizliyken tıklama yapılamadı; URL parametresi (`industry=`) sayfa tarafından yok sayıldı. Filtresiz ilk 3 (US, 30 gün): #citytastetest 1,8M gönderi / 1,9B izlenme · #tiktokfantasymoviecontest 396K / 2,3B · #patientzero 58,3K / 231,7M. Fitness'la ilgisiz. |
| Hashtag analytics ("See analytics", `/hashtag/<ad>/pc/en`) | **Hayır** | Trends ana sayfasına yönlendiriyor (giriş duvarı). |
| Top Ads (`/inspiration/topads/`) | **Kısmen** | Yalnız **3 reklam**; "Log in to access all Top Ads". Filtre sözlüğünde **Exercise & Fitness** (id 26113000000) ve Health (29000000000) var. URL ile denenen filtre API isteğine bozuk ulaştı (toplam 136 sonuç). Dönen 3 reklamdan 1'i fitness yazılımı (dönüşüm hedefli, 13,5 sn, 690 beğeni); filtrenin uygulandığı **doğrulanmadı.** |
| Creator | **Hayır** | "Coming soon". |
| Video trendleri | Denenmedi | — |

**Sonuç:** Creative Center girişsiz kullanılamaz durumda. Fitness hashtag ve Top Ads verisi için **giriş gerekiyor** (hesap açma bu hatta yasak).
Yerine TikTok'un kendi hashtag sayacı kullanıldı (§2.2). R1'in TikTok tarafı da aynı duvara çarpacak [ÇIKARIM].

### 2.2 TikTok hashtag sayacı — kategori formatlarının büyüklüğü
**Kaynak:** `tiktok.com/api/challenge/detail` (girişsiz) [RESMÎ — platformun kendi sayacı]. **Okuma kuralları:** sayılar **birikimli ve
tüm zamanlara ait**, ülkeye göre ayrışmıyor (global olduğu varsayıldı — [doğrulanmadı]). "Video başına izlenme" bir ortalamadır; tek bir
viral video onu çarpıtır. Genel etiketler (#transformation, #beforeandafter) fitness dışı içerik de içeriyor (saç, ev, makyaj). Bu tablo
formatın **hacmini** gösteriyor, uygulamaya dönüşümünü göstermiyor.

| Format kümesi | Etiket | Video | İzlenme | İzlenme/video |
|---|---|---|---|---|
| **Yemek günlüğü** | #whatieatinaday | 2,6M | 40,8B | 15,8K |
| | #fulldayofeating | 182K | 4,6B | 25,1K |
| | #caloriedeficit | 1,5M | 25,8B | 17,3K |
| | #mealprep | 2,8M | 53,0B | 19,0K |
| | #calorietracking | 83K | 384M | 4,6K |
| | #macrotracking | 26,8K | 462M | 17,2K |
| **Dönüşüm** | #transformation | 13,6M | 214,1B | 15,8K |
| | #beforeandafter | 5,7M | 110,3B | 19,4K |
| | #gymtransformation | 449K | 8,5B | 18,8K |
| | #progresspics | 21,8K | 145M | 6,7K |
| | #weighin | 108K | 3,6B | 32,9K |
| **Güç ilerlemesi / PR** | #gymprogress | 382K | 4,1B | 10,8K |
| | #progressiveoverload | 86,7K | 784M | 9,0K |
| | #benchpr | 22,9K | 317M | 13,9K |
| | #newpr | 35,7K | 196M | 5,5K |
| | #deload | 14,4K | 65,7M | 4,6K |
| **Kayıt (log)** | #workoutlog | 2,7K | 7,7M | 2,9K |
| | #gymlog | 1,1K | 1,6M | 1,4K |
| **Haftalık ritüel** | #sundayreset | 1,1M | 13,5B | 12,5K |
| | #weeklycheckin | 5,9K | 25,3M | 4,3K |
| | #coachcheckin | 82 | 161K | 2,0K |
| | #onlinecoach | 560K | 3,7B | 6,6K |
| **Tutarlılık / seri** | #75hard | 1,1M | 5,9B | 5,6K |
| | #gymconsistency | 14,1K | 51,8M | 3,7K |
| **Mizah** | #gymhumor | 2,8M | 67,5B | 24,4K |
| | #gymmemes | 505K | 12,0B | 23,8K |
| **Yıllık özet** | #spotifywrapped | 12,4M | 100,1B | 8,1K |
| | #stravawrapped / #yearinsport | 558 / 571 | 2,1M / 11,5M | 3,8K / 20,2K |
| | #gymwrapped | 310 | 3,9M | 12,5K |
| **AI koç** | #aifitness | 9,4K | 94M | 10,0K |
| | #aicoach | 11,3K | 18M | 1,6K |
| | #chatgptworkout | 576 | 1,3M | 2,3K |
| **Uygulama adları** | #strava | 1,4M | 7,2B | 5,2K |
| | #runna | 125K | 1,2B | 9,3K |
| | #myfitnesspal | 51,6K | 1,7B | 33,3K |
| | #hevy | 26,0K | 283M | 10,9K |
| | #calai | 6,3K | 213M | 33,9K |
| | #ladderapp | 6,2K | 139M | 22,5K |
| | #liftoffapp | 3,5K | 20,0M | 5,8K |
| | #macrofactor | 946 | 19,2M | 20,3K |
| | #fitnessapp / #workoutapp | 66K / 27,6K | 552M / 1,4B | 8,3K / 49,2K |

Okuma [ÇIKARIM]:
- **Hacim sırası:** dönüşüm > yemek günlüğü > mizah > güç ilerlemesi > haftalık ritüel > kayıt. "Gym log" (kayıt ekranı) neredeyse yok;
  insanlar **kaydı değil, kaydın anlamını** paylaşıyor.
- **Uygulama adları küçük:** en büyük uygulama etiketi (#strava, 1,4M) bile #gymtok'un (49,9M video) %3'ü. Uygulama içeriğin konusu değil,
  sahnesi. Cal AI'ın en iyi videolarında adın geçmemesi (§1.6) bununla tutarlı.
- **"Uygulama bana deload dedi" formatı:** doğrudan ölçülemedi. Vekiller küçük: #deload 14,4K video, #macrofactor 946. Format kanıtlanmış
  değil — **boşluk** ya da **talep yok**; ikisi ayırt edilemiyor.
- **Haftalık ritüel büyük ama fitness'a özgü değil:** #sundayreset 1,1M video (ağırlıkla ev/planlama içeriği — doğrulanmadı). Koç
  check-in'i (#coachcheckin 82 video) online koçların özel bir formatı, hacmi küçük.
- **Yıllık özet TikTok'ta değil Story'de yaşıyor:** #stravawrapped 558 video. Spotify bile video başına 8,1K. Wrapped'ın paylaşımı
  ağırlıkla IG Story ve ekran görüntüsüyle oluyor (§1.9).

### 2.3 Format performansı — ne biliniyor
- **Cal AI:** "what I eat in a day" + canlı fotoğraf taraması; uygulama sahnede, sözde değil (§1.6). K4 A2'deki dört formatın ikisi kamerasız.
- **Marka hesapları zayıf:** Hevy medyan 2,6K, Runna medyan 4,1K izlenme (son 35 video). K4 A4'teki "yüzsüz marka hesabı" kuşkusunu
  destekliyor [RESMÎ meta veri + ÇIKARIM]. Ladder bu yüzden marka hesabını **kamera önündeki kreatöre** işletiyor (§1.5).
- **Hakemli içerik analizleri:** popüler fitspiration etiketlerinden (#fitness, #fitspo, #gymtok, #fittok) 200 TikTok videosunun %78'inde
  yalnız kadın var. **%60'ı yanlış ya da zararlı bilgi** içeriyor. Erkek videolarında yüzün kadraj dışında bırakılması daha sık (Pryde vd.,
  *Body Image* 2024) [HAKEMLİ]. #HealthyLifestyle'ın ilk 250 videosunda olumlu mesajların neredeyse hepsine olumsuz beden/diyet mesajı eşlik
  ediyor (Raiter vd., *J Nutr Educ Behav* 2023) [HAKEMLİ].
- **"What I eat in a day" deneyi:** 333 genç erkek. **Kalori bilgili** WIEIAD videoları izleyenlerde fitness'la ilgili utanç ve suçluluk,
  hem kalorisiz WIEIAD'e hem kontrol grubuna (seyahat videosu) göre daha yüksek. Etki, yukarı doğru görünüş kıyasıyla açıklanıyor; öz-şefkat
  etkiyi azaltmıyor (Galway vd., *Body Image* 2026) [HAKEMLİ].
- **Reddit:** denenmedi (talimat gereği).

---

## 3 · Kreatöre uygun özellikler ve programlar

| Program | Kullanıcıya | Kreatöre | Koşul | Ölçülmüş etki | Kaynak |
|---|---|---|---|---|---|
| **MacroFactor affiliate** | deneme 1 → 2 hafta | ilk ödemenin %40'ı | takipçi alt sınırı yazılmamış; ürünü kullanmış olmak | yok (büyümenin "büyük kısmı" ağızdan ağıza) | [RESMÎ] |
| **Hevy affiliate** | — | **%25, yeni abonelik + yenileme** (Everflow) | 5 bin+ takipçi | yok | [RESMÎ] |
| **Hevy elçi (Ambassador)** | — | ? | ? | yok | [RESMÎ — "About us" sayfası programın varlığını anıyor; şartlar bulunamadı] |
| **Hevy rutin paylaşımı** | rutin/klasör linki → içe aktarma | kreatör programını link olarak dağıtıyor | — | yok | [RESMÎ] |
| **Runna refer-a-friend** | 2 hafta deneme (standart) | £10 giyim hediye kartı (en fazla 50) | arkadaş ücretliye geçmeli | yok | [RESMÎ] |
| **Ladder koç-takım** | koçun haftalık planı + Team Chat | koç = ürünün içeriği (adıyla) | şirketin seçtiği koçlar | Ara 2024'te 3× abone (sosyalin payı ayrıştırılmamış) | [RESMÎ + 3.P Fortune] |
| **Ladder Creator Program** | — | marka hesabını işletme (sözleşmeli) | günde 2+ video, kamera önünde | yok | [3.P — ilan] |
| **Cal AI kreatör ağı** | %20 indirim kodu [doğrulanmadı — yalnız referans kodu toplayan sitelerde] | aylık sabit ücret | şirket seçiyor (~300/10K+) | ~10 kurulum/1.000 izlenme (erken) | [3.P — Ghost, FunnelFox] |
| **Strava** | — | — | — | Sticker Stats'ı üçüncü taraf "overlay" uygulamaları (Runstar, Runnergram) taklit ediyor → talep işareti | [3.P — App Store / Product Hunt sonuçları; ÇIKARIM] |

- **Kreatöre uygun ürün özelliği:** şeffaf istatistik çıkartması (Strava, Hevy), rutin linki (Hevy), Strava'ya otomatik imza (Runna).
  Fitness kreatörü zaten antrenmanını çekiyor. Uygulamanın ona verdiği şey, **videosunun üstüne konacak veri katmanı** [ÇIKARIM].
- **K4 C14 ile birleştirince:** LTV $1,21 iken yüzde komisyon kreatöre anlamsız ($0,36). MacroFactor'ın **uzatılmış deneme kodu**
  kullanıcıya bedava, kod başına izlenebilir, ödeme gerektirmiyor. Barter (05 §3.4) + kod en ucuz başlangıç [ÇIKARIM].

---

## 4 · Paylaşımı tetikleyen tasarım

### 4.1 Kartın ögeleri (gözlenen kalıp — RESMÎ kaynaklardan)
- **Marka:** küçük ama her zaman var. Strava çıkartmasının sonunda logo; Hevy @hevyapp etiketi istiyor; Runna markayı Strava açıklamasına
  yazıyor. Wrapped tasarımında Strava logosundaki diyagonal kesim bütün slaytların görsel dili olmuş [3.P — Manual Studio, ajans vaka sayfası].
- **İstatistik seçimi:** mutlak hacim ve karşılaştırma ("kamyon kaldırdın"), PR, kas dağılımı, takvim/tutarlılık, en çok yapılan hareket,
  en verimli ay, "top supporters" (Hevy YIR). **Kilo, yağ oranı, vücut fotoğrafı rakiplerin hazır kartlarında yok.** Strava'da fotoğraf
  kullanıcının kendi eklediği; Hevy'de antrenmana eklenen medya (bulunanlar içinde).
- **Kişisel kimlik:** kart kişinin **kendi** sahnesinin üstüne konuyor (şeffaf arka plan). Kimlik veri katmanından değil kullanıcının
  fotoğraf ya da videosundan geliyor.
- **Biçim:** dikey Story oranı, açık/koyu/şeffaf seçeneği (Hevy), panoya kopyala + doğrudan IG Story (Strava).

### 4.2 Yer ve zamanlama
| An | Örnek | Kaynak |
|---|---|---|
| **İş bitince** (en yaygın) | Hevy shareables antrenman tamamlanınca otomatik üretiliyor; Fitbod'da kayıt sonrası Share | [RESMÎ] |
| **Ay başı** | Hevy aylık rapor ertesi ay Home'da kutu olarak | [RESMÎ] |
| **Aralık** | Hevy YIR Home akışında otomatik açılıyor; Strava YIS; Spotify Wrapped | [RESMÎ] |
| **Haftalık** | Rakiplerde haftalık paylaşım kartı **bulunamadı.** MacroFactor'ın haftalık check-in'i var ama paylaşım kartı bulunamadı. | — |
| **Senkron anı** (pasif) | Runna → Strava açıklaması, her antrenmanda | [RESMÎ] |

- **Ölçülmüş tek veri:** Hevy'nin Stories düğmesi (8 hafta, +%42) ve YIR haftası (+%59) [3.P — Meta]. Düğmenin ekrandaki yerinin ya da
  PR anının ayrı etkisi **bulunamadı.**

### 4.3 Mahremiyet — paylaşmak istememe
- **Ürünlerin varsayılanları:** Liftoff paylaşımları **varsayılan gizli** ve parça parça gizlenebilir. Hevy'de gizli profil var. Strava gizli
  aktiviteyi paylaştırmıyor. MacroFactor bireysel referans kodunu mahremiyet gerekçesiyle vermiyor (doğrulanmadı) [RESMÎ / §1].
- **Kanıt (hakemli):**
  - Strava'da yavaş koşuyu **silmek**, başkasından kötü görünmekten kaçınma hedefiyle ilişkili; paylaşım kürasyonu yaygın (§1.1) [HAKEMLİ].
  - **Kalori sayısı** içeren yemek videosu izleyende utanç ve suçluluğu artırıyor (§2.3) [HAKEMLİ].
  - ABD'de giyilebilir cihaz kullananların %69,5'i verisini aile/arkadaşla paylaşmaya istekli (sağlayıcıyla %81,9). Arkadaşla paylaşmayı
    yalnız yüksek fiziksel aktivite düzeyi öngörüyor (Rising vd., *JMIR mHealth* 2021, HINTS 2019, n=1.300) [HAKEMLİ]. → Bu, **sosyal medyada
    herkese** paylaşma değil; doğrudan kanıt **bulunamadı.**
  - Olumlu da olumsuz da fitness öz-sunumu sosyal destek alıyor; destek öz-yeterlik üzerinden motivasyonla ilişkili (Kim, *J Health Psychol*
    2024, kesitsel) [HAKEMLİ].
  - Sosyal kıyas: kullanıcılar daha çok **yukarı** hedef seçiyor ama yalnız bir kısmı motivasyona yarıyor (Arigo vd., *JMIR Hum Factors* 2023).
    Fitness uygulama incelemelerinin hiçbiri kıyas özelliğini kişiye göre ayarlamıyor (Arigo vd., *JMIR* 2020 meta-inceleme) [HAKEMLİ].
  - **Rekabet işe yarıyor:** 602 fazla kilolu yetişkin, 24 hafta. Rekabet kolu kontrole göre +920 adım/gün, destek +689, işbirliği +637.
    Takipte yalnız rekabet kolu anlamlı kaldı (Patel vd., *JAMA Intern Med* 2019, STEP UP RCT) [HAKEMLİ]. Bağlam farklı (adım, giyilebilir
    cihaz, puan/seviye).
- **Bulunamayan:** "kullanıcılar kilo/vücut fotoğrafı paylaşmak istemiyor" iddiasını doğrudan ölçen bir çalışma bu turda **bulunamadı.**
  Rakiplerin hazır kartlarında kilo ve fotoğrafın olmaması bir tasarım işareti, kanıt değil [ÇIKARIM].

---

## 5 · keel için aday paylaşılabilir anlar (yalnız aday — karar değil)

Hepsi ürünün **zaten ürettiği** veriye dayanıyor (motor kararı U3, haftalık tutarlılık U7, kayıtlı setler).

| # | Aday an | Kartta ne olur (taslak) | Rakipte benzeri | Kanıt |
|---|---|---|---|---|
| A | **Haftalık karar kartı** — "This week: hold" + neden | eylem · tek cümle gerekçe (hangi veri) · güven · sonraki değerlendirme tarihi (U3'ün dört parçası) | **Bulunamadı.** En yakını Runna'nın Strava'ya giden plan ilerleme grafiği (plan, karar değil) ve Hevy/Strava aylık kartı (özet, karar değil). | Haftalık ritüel formatı büyük (#sundayreset 1,1M video) ama fitness'a özgü değil; #coachcheckin 82 video. Ölçülmüş etki yok. |
| B | **Tutarlılık** — "11 of 12 weeks" | 12 haftalık ızgara, kaçan hafta nötr renk (U7) | Hevy "Workout Consistency & Calendar" kartı; Liftoff 3 günlük seri + satın alınabilir seri kurtarma | #gymconsistency 14,1K video / 51,8M; #75hard 1,1M / 5,9B. Rekabet/oyunlaştırma RCT'si (STEP UP). Hevy'nin kartının ayrı etkisi yok. |
| C | **PR / güç artışı** | gerçek set (ağırlık × tekrar) ve dönemsel artış; e1RM ancak aralıkla (bkz. gerilim U5) | Hevy PR shareable; Liftoff rütbe (e1RM + kilo + cinsiyet); Fitbod | #benchpr 22,9K / 317M; #progressiveoverload 86,7K / 784M; #gymprogress 382K / 4,1B. Etki ölçümü yok. |
| D | **"Koç hayır dedi" anı** (U2 — ısrar kararı değiştirmez) | itiraz → karar aynı → "kararı değiştirecek veri şu" | **Bulunamadı.** | Doğrudan format ölçülemedi (#deload 14,4K). Mizah çok büyük (#gymhumor 2,8M / 67,5B), ama an kullanıcıyı küçük düşürürse U7'ye çarpar. |
| E | *(ek aday)* **Dönem / yıl özeti** | kaç karar, kaçı "tut", tutarlılık, en büyük PR, "en çok veri girilen hafta" | Strava YIS (ücretli), Hevy YIR (ücretsiz), Spotify Wrapped | Hevy YIR haftası paylaşım +%59 [3.P Meta]; Spotify 500M paylaşım/24 sa [3.P]; Wrapped günü indirme +%35 [3.P]. |
| F | *(ek aday)* **Şeffaf veri çıkartması** (A-C'nin kreatör biçimi) | kartın arka plansız hali, kullanıcının gym videosunun üstüne | Strava Sticker Stats, Hevy şeffaf arka plan | Üçüncü taraf overlay uygulamaları var (talep işareti); ölçülmüş etki yok. |

---

## Tablo · Paylaşılabilir an × rakip × kanal × ölçülmüş etki

| Paylaşılabilir an | Rakip | Kanal | Ölçülmüş etki (kaynak) |
|---|---|---|---|
| Antrenman bitiş kartı (PR, hacim, kas dağılımı) | Hevy, Fitbod, Strava | IG/FB Story, uygulama içi akış | Hevy: Stories sonrası 8 haftada paylaşım **+%42**, viralite **+%25**, kurulum **+%12** [3.P — Meta vaka] |
| Şeffaf istatistik çıkartması | Strava (Nis 2025), Hevy | IG Story, kullanıcının videosu | **Bulunamadı** |
| Aylık rapor / stat kartı | Hevy (ücretsiz), Strava (abonelik) | IG Story | **Bulunamadı** |
| Yıllık özet | Strava YIS, Hevy YIR, (Spotify Wrapped) | IG Story, TikTok, ekran görüntüsü | Hevy YIR haftası **+%59** paylaşım [3.P — Meta]; Spotify 2025 **500M paylaşım/24 sa** [3.P — Music Week]; Wrapped günü indirme **+%35** [3.P — Sensor Tower]; Strava: bulunamadı |
| Sosyal onay (kudos/cheers/beğeni) | Strava, Ladder, Hevy | uygulama içi | Strava 2025'te **14 milyar kudos** [RESMÎ] — etki ölçümü yok |
| Rütbe / lider tablosu | Liftoff, Hevy (38 hareket) | uygulama içi, TikTok | Ürün için bulunamadı; benzer mekanik RCT'de rekabet +920 adım/gün [HAKEMLİ] |
| Seri (streak) | Liftoff (3 gün, satın alınabilir kurtarma), Hevy ("gym streak") | uygulama içi | **Bulunamadı** |
| Plan/marka imzası başka ağda | Runna → Strava ("with Runna ✅", kapatılamıyor); Ladder → Strava | Strava akışı | **Bulunamadı** |
| Rutin / program linki | Hevy | web link | **Bulunamadı** |
| Takım / grup sohbeti | Ladder Team Chat, Cal AI grupları, MFP özel grupları | uygulama içi | Ladder 3× abone (Ara 2024), sosyalin payı yok [3.P — Fortune] |
| Uygulama içi genel akış | MyFitnessPal | uygulama içi | **Negatif sinyal:** 2024'te "nadiren kullanılan" gerekçesiyle kaldırıldı [3.P/forum] |
| Referans / affiliate kodu | MacroFactor, Hevy, Runna, Cal AI | kreatör kanalları | MacroFactor büyümesinin "büyük kısmı" ağızdan ağıza [RESMÎ, ölçüm değil]; Cal AI ~10 kurulum/1.000 izlenme [3.P — vendor] |
| Kreatör içeriği: yemek günlüğü + tarama | Cal AI | TikTok, Reels | #whatieatinaday **2,6M video / 40,8B** [RESMÎ — TikTok]; tek videolar 43-73M [3.P — FunnelFox] |
| Dönüşüm / before-after | (kategori geneli) | TikTok | #transformation **13,6M / 214B**; #gymtransformation 449K / 8,5B [RESMÎ — TikTok; fitness dışı karışık] |

---

## Bizim için çıkarım

Hepsi **[ÇIKARIM]**; karar değil, `06-faz5-yuz.md` sentezine girdi.

1. **keel'in paylaşılabilir anı "karar"dır; kategoride boş.** Kayıt kartı (PR, hacim, takvim) Hevy'de olgun ve ücretsiz. Aynısını yapmak
   eşitlik sağlar, farklılık sağlamaz. Haftalık karar kartı (aday A) rakipte bulunamadı ve tezi tek karede taşıyor
   ("Everything else shows you the data. This one makes the call."). Talebi ölçülmüş değil; hipotez olarak test edilmeli.
2. **Kart, kullanıcının sahnesinin üstüne konan küçük bir veri katmanı olmalı** (şeffaf çıkartma; aday F). Üç rakip buna yakınsamış.
   Kreatörün zaten çektiği gym videosuna eklenir; kişisel kimlik videodan gelir. Ürünün kimliği isimsiz kalır (U10).
3. **Yıllık/dönem özeti en yüksek kaldıraçlı tek an** (Hevy +%59, Spotify ölçeği). keel'de doğal birim **12 haftalık dönem** olabilir
   (değerlendirme penceresi 3 ay — U8). Strava'nın paywall tepkisi ücretsiz tutmanın lehine.
4. **Paylaşım düğmesi işin bittiği anda.** keel'de bu an **pazartesi check-in'inde kararın açıklandığı an** (U8, ADR-018). Rakiplerde
   haftalık kart olmaması anın boş olduğunu gösteriyor.
5. **Kartın varsayılanı: kilo yok, yağ oranı yok, fotoğraf yok, kalori yok.** Rakiplerin hazır kartları da bunları göstermiyor. Kalorili
   içeriğin utanç/suçluluk etkisi hakemli olarak var. Kilo, kullanıcı açıkça eklerse ve yalnız trend olarak (U8) eklenebilir — bu bir ürün kararı (Levent).
6. **Sosyal akış kurmak düşük öncelik.** MFP akışı kaldırdı. MacroFactor sosyal olmadan büyüdü. Strava'nın akışı kendi kategorisinde ağ
   etkisi; keel'in kopyalayacağı ağ yok. Dış ağa (IG Story, TikTok, Strava) bağlanmak, iç ağ kurmaktan ucuz.
7. **Kreatör tarafında sıfır maliyetli kurgu:** barter (05 §3.4) + MacroFactor tipi **uzatılmış deneme kodu** (kod başına atıf) + kreatörün
   videosuna konacak şeffaf çıkartma. Yüzde komisyon, LTV yükselene kadar anlamsız (K4 C14).
8. **İçerik formatı:** kategoride izlenen şey yemek günlüğü, dönüşüm ve mizah. keel'in organik içeriği (05 §3.3) kalori/dönüşüm
   challenge'ına giremez (K3 Kural 9, 05 §3.1). Uygun boşluk, ürünün **verdiği karar** (deload, "tut", "hayır") ve **güç ilerlemesi**. İkisinin
   hacmi küçük ama rekabeti de düşük. "Uygulama bana hayır dedi" mizah kancası denenebilir; kullanıcıyı değil durumu güldürmeli (U7).
9. **Runna dersi:** başka bir ağa otomatik imza büyüme vektörü olabilir. Ama keel'de **kapatılamayan** bir imza, kullanıcı verisinin dışarı
   gitmesi demek (V3, CLAUDE.md "Levent'e sorulur") → yalnız açık onayla ve kapatılabilir olmalı.

---

## Anayasayla gerilim (ADR adayı)

Karar verilmiyor; paylaşım kalıplarından anayasayla çelişenler, kanıtıyla.

| Kural | Çelişen kalıp | Kanıt | Gerilimin özü |
|---|---|---|---|
| **U4** (yağ yüzdesi sayısı hiçbir yerde yok) | Dönüşüm ve tartı paylaşımı kategorinin en büyük formatı | #transformation 13,6M video, #weighin 108K / 3,6B [RESMÎ — TikTok] | U4 yalnız yağ yüzdesini kapsıyor; **kilo sayısı** kartta olabilir mi? V3 (kilo özel kategori veri) ve Galway 2026 kalori bulgusu varsayılanı "yok"a itiyor. Yağ yüzdesi kartta hiçbir koşulda olamaz (U4 net). |
| **U5** (tahmin daima aralık) | PR/rütbe kartında **tek sayı e1RM** | Liftoff rütbesi e1RM'den hesaplanıyor [RESMÎ] | e1RM bir tahmindir. Kartta tek sayı olarak gösterilirse U5'e çarpar. Seçenekler: gerçek set (ağırlık × tekrar) ya da aralıklı e1RM. ADR adayı. |
| **U7** (suçlama/utandırma yok, telafi yok, günlük sıfırlanan streak yok) | (1) Liftoff: 3 günde kırılan seri + **satın alınabilir seri kurtarma** → telafi mekaniği. (2) Lider tablosu ve rütbe → yukarı kıyas. (3) Kalorili yemek içeriği → utanç. (4) Strava'da yavaş koşuyu silme. | Liftoff FAQ [RESMÎ]; STEP UP RCT rekabet +920 adım [HAKEMLİ]; Galway 2026, Rob Kolnes 2026 [HAKEMLİ] | **Rekabet işe yarıyor (RCT), ama U7'nin koruduğu kitlede kıyas baskısı ve silme davranışı var.** keel'de rütbe/lider tablosu varsayılan olarak yok; eklenecekse kişinin kendi geçmişine kıyas. Rekabet kolunun etkisi ADR'de açıkça tartılmalı. Seri kurtarma ürünü U7'yi doğrudan ihlal ediyor. |
| **U10** (isimsiz ürün sesi) + "üründe kişi adı yok" | Ladder'ın modeli koçun **adıyla** ürün olması (takım = koç); Cal AI ve Ladder'ın kreatör yüzleri | Ladder llms.txt ve App Store [RESMÎ] | Ürün içinde adlı koç modeli U10 ile uyumsuz. Kreatörün **kendi kanalında** yüzü olması ürün dışı, çelişmiyor. "Koç hayır dedi" anının metni bir karakter değil, araç sesi olmalı. |
| **U12** (projeksiyon yüzsüz, fotogerçekçi vücut üretimi yok) | Before/after ve "gelecekteki sen" paylaşımları | #beforeandafter 5,7M video [RESMÎ — TikTok]; K3 D.3 | Paylaşılabilir bir "gelecekteki ben" görseli üretmek U12'yi ihlal eder. Projeksiyon paylaşılacaksa yalnız parametrik, yüzsüz şekil. Varsayılan kapalı olduğu için paylaşım kartına hiç girmemesi daha temiz. |
| **V1** (fotoğraf cihazda kalır) | Hevy'de antrenmana foto/video ekleme ve akışta yayınlama; ilerleme fotoğrafı karşılaştırma kartı | Hevy social features [RESMÎ] | Sunucuya foto yüklenen akış V1'i ihlal eder. Cihazda üretilip kullanıcının kendi paylaşım menüsüyle gönderdiği kart teknik olarak V1 içinde. Ama sağlık verisinin kullanıcı eliyle dışarı çıkması → V3 ve onay metni ADR'si. |
| **05 §3.1 kural 6** (kendi dönüşümünü ürünün kanıtı yapma; before/after iddiadır) | Kullanıcı dönüşüm kartlarını markanın yeniden paylaşması; kreatör dönüşümü + uygulama | K3 D.3 (FTC "results not typical" aldatmayı düzeltmez; Apple 2.3.1, 5.1.3(i)); Cal AI'da "transformation stories" formatı [3.P — FunnelFox] | keel'in markalı paylaşım kartı dönüşüm fotoğrafı içerirse, marka onu yeniden paylaştığında **ürünün iddiası** olur. Apple 5.1.3(i): uygulamada toplanan sağlık verisi pazarlamada kullanılamaz. → Kartta dönüşüm fotoğrafı olmaması ve markanın kullanıcı kartını yeniden paylaşma kuralı ADR adayı. |
| **V3 + CLAUDE.md "kullanıcı verisinin dışarı gitmesi"** | Runna'nın Strava'ya **kapatılamayan** otomatik imzası | Runna yardım merkezi [RESMÎ] | Herhangi bir otomatik dış paylaşım (Strava/Apple Health'e yazma dahil) açık onay + kapatılabilirlik ister; Levent kararı. |

---

## Bulunamayanlar

- Strava Year in Sport'un paylaşım sayısı ya da büyümeye ölçülmüş etkisi; kudos'un tutundurmaya etkisi (şirket kaynağı yok).
  Year in Sport paywall'ının ilk yılı (kaynaklar 2022/2023/2025 arasında tutarsız).
- Liftoff'un nasıl büyüdüğü, rütbenin paylaşıma etkisi (arama kotası ve 429 nedeniyle de yarım kaldı).
- Runna'nın "with Runna ✅" imzasının ve Strava/IG paylaşımının ölçülmüş etkisi.
- Ladder'ın sosyal katmanının (Team Chat, cheers) ayrıştırılmış etkisi.
- Cal AI'ın ürün içi paylaşım özelliği (yalnız grup özelliğine işaret eden topluluk kuralları var) ve kreatör ödeme şartlarının birincil kaynağı.
- MacroFactor'ın sosyal özelliği bilinçli olarak yapmadığına dair resmî açıklama (referans kodu gerekçesi yalnız Reddit özetinden — doğrulanmadı).
- Fitbod paylaşımının ölçülmüş etkisi; Fitbod yardım sayfası 403.
- Hevy Ambassador programının şartları.
- "Uygulamam bana deload dedi" türü formatın performansı (hashtag vekili dışında).
- TikTok Creative Center: sektör filtreli (Health / Sports & Outdoor / Exercise & Fitness) hashtag listesi, hashtag analytics, tam Top Ads — **giriş duvarı.**
- Hashtag altındaki tekil videoların izlenmeleri (girişsiz `item_list` boş dönüyor) → formatın video düzeyinde performansı ölçülemedi.
- Cal AI, Strava, MacroFactor, MyFitnessPal, Fitbod TikTok marka hesaplarının meta verisi (yt-dlp JSON hatası / engelleme); yalnız Hevy ve Runna alındı.
- Paylaşım kartı tasarım ögelerinin (logo boyutu, istatistik seçimi, düğme yeri) paylaşım oranına etkisini ölçen hakemli ya da şirket verisi.
- Kullanıcıların kilo/vücut fotoğrafını sosyal medyada paylaşma isteksizliğini doğrudan ölçen çalışma.
- MyFitnessPal-Cal AI satın almasının birincil metni (GlobeNewswire açılmadı).
- Reddit: talimat gereği denenmedi.

---

## Kaynaklar

Hepsine **2026-10-07** tarihinde erişildi.

**Şirket ve platform kaynakları [RESMÎ]**
- Hevy — Shareables: https://www.hevyapp.com/features/shareable/
- Hevy — Social features: https://www.hevyapp.com/features/social-features/
- Hevy — Year in Review: https://www.hevyapp.com/features/year-in-review/
- Hevy — Monthly Report: https://www.hevyapp.com/features/monthly-report/
- Hevy — Affiliate: https://www.hevyapp.com/affiliate/
- Liftoff — Ranked workout tracker: https://liftoffrank.com/ranked-workout-tracker
- Liftoff — FAQ: https://liftoffrank.com/en/faq
- Liftoff — App Store: https://apps.apple.com/us/app/liftoff-ranked-gym-workouts/id6448081563
- Runna — Automatic media uploads to Strava: https://support.runna.com/en/articles/11775028 (İtalyanca sürüm: https://support.runna.com/it/articles/11775028-gestione-dei-caricamenti-automatici-dei-contenuti-multimediali-da-runna-a-strava)
- Runna — Refer-a-friend terms: https://www.runna.com/legal/terms-and-conditions/refer-a-friend-terms
- Ladder — llms.txt: https://www.joinladder.com/llms.txt
- Ladder — App Store: https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453
- Cal AI — site: https://www.calai.app · Community Guidelines: https://www.calai.app/community-guidelines · ToS: https://www.calai.app/tos · Sweepstakes: https://www.calai.app/sweepstakes
- Cal AI — App Store: https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616
- MacroFactor — 2024 Annual Report: https://macrofactor.com/annual-report-2024/
- MacroFactor — Partnership: https://macrofactor.com/affiliate-application/
- MyFitnessPal — topluluk forumu (moderatör yanıtı): https://community.myfitnesspal.com/nl/discussion/1472494/nieuwsfeed-is-verdwenen-na-update
- Strava — Year in Sport 2025 bülteni (PR Newswire, Adnkronos kopyası): https://www.adnkronos.com/immediapress/eng/strava-releases-12th-annual-year-in-sport-trend-report-revealing-that-doomscrolling-is-out-movement-is-in_iPmltuOBI6UULjUCMcmDr
- TikTok — hashtag sayacı (girişsiz): `https://www.tiktok.com/api/challenge/detail/?challengeName=<etiket>`, `tiktok.com/tag/<etiket>` sayfası bağlamında
- TikTok — marka hesabı meta verisi (yt-dlp): https://www.tiktok.com/@hevyapp · https://www.tiktok.com/@runna
- TikTok Creative Center: https://ads.tiktok.com/creative/creativeCenter/trends/hashtag?region=US · https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en

**Üçüncü taraf [3.P]**
- Meta for Developers — Hevy success story: https://developers.facebook.com/success-stories/hevy/
- BikeRadar — Strava Sticker Stats (9 Nis 2025): https://www.bikeradar.com/news/strava-sticker-stats-spring-2025-updates
- road.cc — Year in Sport yalnız abonelere: https://road.cc/content/news/strava-year-sport-now-only-subscribers-317425
- Stink Studios — Strava Year in Sport 2018: https://www.stinkstudios.com/work/strava-year-in-sport-2018
- Manual Studio — Strava Year in Sport 2021: https://manual.studio/work/strava-year-in-sport-2021
- Music Week — Spotify Wrapped 2025 (4 Ara 2025): https://www.musicweek.com/digital/read/spotify-wrapped-2025-was-biggest-ever-with-200-million-engaged-users/093178
- IBTimes — Wrapped 2025 (arama özeti): https://www.ibtimes.com/record-breaking-spotify-wrapped-2025-sees-200m-engage-500m-shares-day-3792059
- Sensor Tower — Wrapped DAU/indirme (Ara 2023): https://sensortower.com/blog/mmm-spotify-wrapped-drives-app-usage-ski-resort-apps-propelled-by-winter
- Fortune — Wrapped 2019 indirmeleri: https://fortune.com/2019/12/11/spotify-wrapped-playlist-app-download
- Fortune — Ladder büyümesi (10 Ara 2024): https://www.fortune.com/2024/12/10/strength-training-ladder-app-users-growth
- Built In — Ladder Creator Program ilanı: https://builtin.com/job/tiktok-creator-ladder-creator-program/3574036
- Ghost — Cal AI UGC Audit: https://onghost.com/reports/calai
- FunnelFox — Cal AI influencer marketing (24 Nis 2026): https://blog.funnelfox.com/cal-ai-influencer-marketing/
- The Viral App — Cal AI portföyü: https://theviralapp.com/portfolio/cal-ai/
- GRIN — Cal AI marka profili: https://app.grin.ai/brands/calai.app
- Outlift — MacroFactor incelemesi (3 Şub 2026): https://outlift.com/macrofactor-review/
- T3 — Strava Instant Workouts / Runna (arama özeti): https://www.t3.com/active/strava-instant-workouts-premium-feature-launch
- Sacra — Strava: https://sacra.com/c/strava/ · SGI Europe — Strava IPO: https://www.sgieurope.com/financial/strava-files-for-ipo-as-fitness-app-capitalizes-on-growth/118936.article
- Fitbod yardım merkezi (arama özeti; sayfa 403): https://help.fitbod.me/hc/en-us/articles/360006427453-Sharing-a-Workout-Gym-Location-Settings
- Brave Search sonuç sayfaları (Hevy YIR, MacroFactor referans, Runna referans, Hevy affiliate, Cal AI kreatör, MFP-Cal AI, Liftoff rütbe): `https://search.brave.com/search?q=…`

**Hakemli [HAKEMLİ]**
- Galway SC, Mall S, Hutchinson A, Gammage KL. '#WIEIAD'… *Body Image* 2026;58:102105. doi:10.1016/j.bodyim.2026.102105 (PMID 42161020)
- Pryde S, Kemps E, Prichard I. A content analysis of fitspiration videos on TikTok. *Body Image* 2024;51:101769. doi:10.1016/j.bodyim.2024.101769 (PMID 39013285)
- Raiter N vd. TikTok promotes diet culture and negative body image rhetoric. *J Nutr Educ Behav* 2023;55(10):755-760. doi:10.1016/j.jneb.2023.08.001 (PMID 37806709)
- Russell HC vd. Strava use in competitive female runners. *Psychol Sport Exerc* 2026;85:103136. doi:10.1016/j.psychsport.2026.103136 (PMID 42000009)
- Rob Kolnes M, Øvretveit K. Motivational dynamics and Strava use in active club runners. *Behav Sci* 2026;16(2):224. doi:10.3390/bs16020224 (PMID 41750033)
- Kim HM. Fitness self-presentations on social media and social support. *J Health Psychol* 2024;29(11):1281-1297. doi:10.1177/13591053241233370 (PMID 38384177)
- Patel MS vd. STEP UP randomized clinical trial. *JAMA Intern Med* 2019;179(12):1624-1632. doi:10.1001/jamainternmed.2019.3505 (PMID 31498375)
- Arigo D, Brown MM, Pasko K, Suls J. Social comparison features in PA apps: scoping meta-review. *J Med Internet Res* 2020;22(3):e15642. doi:10.2196/15642 (PMID 32217499)
- Arigo D vd. Selection of and response to PA-based social comparisons. *JMIR Hum Factors* 2023;10:e41239. doi:10.2196/41239 (PMID 36848204)
- Rising CJ vd. Willingness to share data from wearables (HINTS 2019). *JMIR Mhealth Uhealth* 2021;9(12):e29190. doi:10.2196/29190 (PMID 34898448)
- PubMed E-utilities (arama aracı): https://eutils.ncbi.nlm.nih.gov/entrez/eutils/

**İç kaynaklar:** `arastirma/ham/M0-rakip-listesi.md` · `arastirma/05-faz4-pazarlama.md` §3.1-3.4 · `arastirma/ham/K3-youtube-koprusu.md` (A.2, D.3, Sonuç 1)
· `arastirma/ham/K4-cok-kanalli-edinim.md` (A2, A4, C13, C14, F) · `docs/anayasa.md` (U3-U12, V1-V3)
