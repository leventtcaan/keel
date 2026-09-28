# K3 · YouTube kanalı ↔ kendi yazılım ürünü köprüsü
> Araştırma tarihi: 2026-09-11 · Durum: TAMAMLANDI
> Kural: uydurma yok. Bulunamayan veri "**BULUNAMADI**" olarak işaretlenir.

## İçindekiler
- A · Kim başardı, kim yaktı
- B · Format
- C · YouTube mekaniği
- D · Sağlık içeriği kısıtları
- E · Kanal-ürün senkronu
- SONUÇ · Sırıtmama kuralları
- SONUÇ · Zaman çizelgesi

---

# A · KİM BAŞARDI, KİM YAKTI

## A.1 · MKBHD / Panels — vakanın anatomisi (soru 2)

**Kronoloji**

| Tarih | Olay |
| --- | --- |
| ~2024-09-10 | Panels duyurusu / lansmanı. Ücretsiz indirilir; HD duvar kağıdı için **$11.99/ay veya $49.99/yıl**. Ücretsiz katmanda **SD duvar kağıdı başına 2 reklam izleme** zorunluluğu. |
| 2024-09-23 | Yorum sentiment'i dip noktası (Infegy analizi). İlk 20 saatte duyuruya **13.000+ olumsuz yanıt**. |
| 2024-09/10 | App Store gizlilik etiketleri: konum + tanımlayıcı toplama, uygulamalar/siteler arası takip. Ayrı bir öfke dalgası. |
| 2024-10-11 | Güncelleme yayınlanır: fiyat/reklam sıklığı düzeltmeleri, gizlilik izinleri daraltılır. Sentiment toparlanır ("thank you", "respect", "accountability", "transparency" temaları). |
| 2025-12-01 | Kapanış duyurusu (listelenmemiş YouTube videosu). |
| 2025-12-31 | Uygulama kapanır. Yıllık abonelikler **proaktif iade**, kullanıcı verisi silinir. |
| 2026-01 | Kod Apache 2.0 ile açık kaynak yapılır. |

Kaynaklar:
- https://hothardware.com/news/mkbhd-responds-angry-backlash
- https://www.androidpolice.com/mkbhd-panels-wallpaper-app-criticism/
- https://www.infegy.com/insight-brief/analyzing-youtube-comments-during-mkbhds-app-controversy
- https://techcrunch.com/2025/12/01/mkbhds-wallpaper-app-panels-is-shutting-down/
- https://www.macrumors.com/2025/12/01/mkbhd-wallpaper-app-shutdown/
- https://www.androidauthority.com/mkbhd-panels-shutdown-3620792/
- https://www.netinfluencer.com/marques-brownlee-admits-panels-app-failure/

**Tepkiyi tetikleyen spesifik kararlar (sırayla, şiddet sırasına göre)**

1. **Fiyat ↔ algılanan değer uçurumu.** Duvar kağıdı için $49.99/yıl. Rakipler (Zedge, Backdrops) tek seferlik satın alma veya çok daha düşük abonelik sunuyordu. Brownlee'nin kendi itirafı: *"we failed on the price front."*
2. **Ücretsiz katmanın cezalandırıcı olması.** Tek bir SD duvar kağıdı için 2 reklam. Ücretsiz katman "tadımlık" değil, "işkence" olarak tasarlanmıştı → kullanıcı kendini sıkıştırılmış hissetti.
3. **Gizlilik etiketleri.** Reklam ağı (AdMob) varsayılan önerileriyle "çok fazla kutu işaretlenmiş". Brownlee: *"We just checked way too many boxes... To be clear, I do not want your data."*
4. **Kimlik çelişkisi (asıl bomba).** MKBHD'nin 15 yıllık markası "tüketici avukatı, aşırı fiyatlandırmayı ve karanlık kalıpları eleştiren adam". Panels tam olarak onun eleştirdiği şeyi yaptı. Kendi cümlesi: *"If I was reviewing this app, I would not have been very nice."*
5. **AI üretimi içerik.** Bazı duvar kağıtlarının AI ile üretildiği iddiası — "AI çıktısı için neden para ödeyeyim" tepkisi.

> **Çıkarılacak asıl ders:** Panels'ın ürün olarak kötü olması değil, **kurucunun kanaldaki değer sistemiyle çelişmesi** öfkeyi büyüttü. İzleyici ürünü değil, tutarsızlığı cezalandırdı. Bir tüketici avukatının abonelik+reklam+veri toplama üçlüsünü satması, "consistency" ihlalidir.

**Kanal üzerindeki ölçülen etki:** Infegy 2016-2024 arası 7,2 milyon yorumu analiz etti. Sentiment dibi ve toparlanması ölçüldü ama **abone/izlenme kaybı sayısal olarak ölçülmedi**. Rapordaki "8 yılda video başına ortalama yorum %29 düştü" verisi uzun vadeli bir trend; Panels'a atfedilemez. **Panels'ın MKBHD kanalına ölçülmüş kalıcı zararı: BULUNAMADI.** Şirket 18M abonesini korudu.

**Kurtaran hamle:** 3 hafta içinde (23 Eylül dibi → 11 Ekim güncellemesi) somut değişiklik + açık itiraf. Sentiment "accountability/transparency"e döndü. Kapanışta da yıllık abonelikleri **proaktif iade etmesi** ikinci bir güven onarımıydı.

## A.2 · Karşı örnek: MacroFactor / Jeff Nippard — organik hissettiren model

- Nippard, MacroFactor'ün **ortağı** (Stronger By Science ekosistemi). Beslenme takip uygulaması 2021'de çıktı; **MacroFactor Workouts** antrenman uygulaması Ocak 2026'da yayınlandı.
- Kritik yapısal fark: Nippard'ın kanalı **uygulamayı satmak için kurulmadı.** Yıllarca "science-based" literatür özeti içeriği üretti (biyokimya diploması + doğal vücut geliştirici kimliği), uygulama bu otoritenin **arkasından** geldi.
- Uygulama, kanalın içeriğinin **doğal uzantısı**: kanalda "RIR nedir, nasıl takip edilir" anlatılıyor; uygulama tam olarak RIR/partial rep/dropset takibi yapıyor. İzleyici "reklam" değil "araç" olarak görüyor.
- Toplam takipçi 13,7M+ (YouTube+IG+TikTok).
- Kaynaklar: https://macrofactor.com/workouts/ · https://en.wikipedia.org/wiki/Jeff_Nippard · https://creatordb.app/creatorstats/jeff-nippard/
- **Not:** MacroFactor lansmanı sonrası ölçülmüş izleyici kaybı verisi **BULUNAMADI** — kayda değer bir tepki dalgası hiç oluşmadı, bu da zaten bulgunun kendisi.

## A.3 · Thomas Frank / Notion şablonları — "içerik pazarlama, ürün ödül"

- İki yılda **$2,1M** şablon satışı; şu an ortalama **~$120k/ay** şablon + ~$15k/ay affiliate & AdSense.
- Mekanizma: **ayrı bir ikinci kanal** ("Thomas Frank Explains", 2020'de açıldı, 203K abone / 8,7M izlenme) tamamen Notion öğretmeye ayrıldı. Ana kanal kirlenmedi.
- Ürünler: Ultimate Brain ($760k), CC+UB bundle ($298k), CC Ultimate Tasks ($86k), CC Base ($17k). Bundle diğerlerinin 3:1 önünde.
- Formül: **ücretsiz eğitim = pazarlama, şablon = "hazır yapılmış" ödül.** Videoyu izleyen zaten değer alıyor; şablon "zaman kısayolu" satıyor, "erişim" satmıyor.
- Kaynaklar: https://www.starterstory.com/stories/thomas-frank · https://www.builtbyfoundry.io/blog/thomas-frank-notion-templates-2m-creator-business · https://typefully.com/TomFrankly/dollar1-million-in-notion-template-sales-kuFT0iD

> **Panels ile farkın özü:** Frank, izleyicinin **ücretsiz olarak da elde edebileceği** bir sonucu satıyor (şablonu kendin kurabilirsin, o sana zaman kazandırıyor). Panels, ücretsiz bulunabilen bir şeyi **kilit arkasına koydu**. Birinci model "kısayol satmak", ikincisi "gasp". İzleyici bu farkı anında hissediyor.

## A.4 · Kayla Itsines / Sweat — kitle önce, ürün sonra (uç örnek)

| Yıl | Adım |
| --- | --- |
| ~2012-2014 | Adelaide'de sahilde ders veren PT. Instagram'da danışan dönüşüm fotoğrafları paylaşıyor. |
| 2014 | Bikini Body Guide **PDF** olarak çıkar (düşük riskli MVP). "10 kişi alırsa mutlu olurum" diyordu. |
| 2014-2015 | `#BBG` etiketiyle kullanıcıların kendi öncesi/sonrası fotoğrafları → kendi kendini besleyen içerik motoru. 2015'te 4M+ IG takipçisi. |
| 2015-11 | "Sweat with Kayla" uygulaması, **$19.99/ay**. İlk haftada App Store #1. 2016'da dünyanın en çok gelir getiren fitness uygulaması. |

- Ders: **Uygulama, PDF'in doğrulanmış talebi üzerine kuruldu.** Önce en ucuz formatla talep kanıtlandı, sonra yazılıma yatırım yapıldı. Ayrıca ürünün pazarlamasını **kullanıcılar** yaptı (UGC), kurucu değil.
- Kaynaklar: https://en.wikipedia.org/wiki/Kayla_Itsines · https://www.forbes.com/sites/elanagross/2018/04/05/kayla-itsines/ · https://pixelforce.com/case-studies/kayla-itsines-sweat-with-kayla-bbg-app-2015

## A.5 · Casey Neistat / Beme — "kitle transfer edilemez" dersi

- Beme uygulaması → 2016'da CNN tarafından **~$25M**'a satın alındı → **14 ay sonra**, Ocak 2018'de kapatıldı.
- Neistat'ın kendi itirafı: *"I would sort of disappear... and I would make YouTube videos for my channel because at least I would be able to yield something."*
- Beme News kanalı 269K aboneye ulaştı ama sadece birkaç düzine video çıkarabildi.
- Ders: (a) Kanalın kitlesi otomatik olarak ürün kullanıcısına dönüşmez. (b) Ürün, kurucunun **haftalık içerik ritmini** bozarsa ikisi birden ölür. Bu, yurt odasından tek başına üretim yapan biri için en yüksek riskli senaryo.
- Kaynaklar: https://techcrunch.com/2018/01/25/cnn-shuts-down-casey-neistats-beme-but-some-of-its-digital-news-tech-will-live-on/ · https://variety.com/2018/digital/news/casey-neistat-cnn-departure-beme-1202676621/

## A.6 · Ali Abdaal — yavaş aşınma tipi

Panels gibi tek bir patlama değil; **kademeli kimlik kayması** örneği. Eleştiri temaları (blog/Substack/YouTube eleştiri videoları düzeyinde, ölçülmüş veri değil):
- İçeriğin "para kazanma makinesi" gibi cilalanması,
- Onu ayrıştıran doktor/Cambridge kimliğinden uzaklaşıp jenerik "productivity guru" moduna geçmesi,
- Hedef kitlesi öğrenciyken kurumsal vergi/Tesla hack'i gibi konulara kayması.
- Kaynak: https://therossharkness.substack.com/p/the-problem-with-ali-abdaal
- **Ölçülmüş abone/izlenme kaybı: BULUNAMADI.** Kendisi segmentli e-posta pazarlamasıyla kurs satarken "hate" almadığını söylüyor — yani satışın *kanalda değil, listede* yapılması tepkiyi düşürüyor. Bu taşınabilir bir taktik.

## A.7 · Ölçülmüş güven aşınması var mı? (soru 3) — **EVET, tek sağlam çalışma**

**Cheng, M. & Zhang, S. — "Reputation Burning: Analyzing the Impact of Brand Sponsorship on Social Influencers", Management Science, 71(7): 5910-5932 (2025).**
- Veri: İngilizce konuşan önde gelen beauty/style YouTube influencer'larının videoları, video analitiği ile.
- **Ana bulgu: Bir sponsorlu video yayınlamak, eşdeğer organik bir videoya kıyasla influencer'a abone sayısının %0,19'una mal oluyor.**
- Etki **büyük kitlelerde daha güçlü** (küçük kanallarda daha zayıf).
- **Azaltıcı faktör 1 — kongrüans:** Influencer'ın olağan tarzına/temasına yakın sponsorlu içerik daha az cezalandırılıyor.
- **Azaltıcı faktör 2 — marka bilinirliği:** *Az bilinen* markaların tanıtımı, yüksek profilli marka anlaşmalarına göre **daha az tepki** üretiyor.
- Kaynaklar: https://pubsonline.informs.org/doi/10.1287/mnsc.2023.00193 · https://www.informs.org/News-Room/INFORMS-Releases/News-Releases/Study-Reveals-Hidden-Economic-Cost-of-Sponsored-Content-for-Social-Media-Influencers · https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4071188

> **Levent için doğrudan sonuç:** İki azaltıcı faktörün ikisi de sende var — ürün tam kanalın temasında (kongrüans yüksek) ve tanınmayan bir marka (küçük indie app). Yani teorik ceza tabanı düşük. Ceza asıl **kongrüans kırıldığında** ve **ölçek büyüdüğünde** geliyor.

**Destekleyici literatür**
- "Sponsorship awareness negatively moderates influencer credibility and parasocial relationships **for longtime followers**" — Online Information Review (2025). Yani **en eski/sadık izleyici en çok kırılan kesim.** https://www.emerald.com/oir/article-abstract/doi/10.1108/OIR-07-2025-0512/1351738/
- "Sponsored content residue" — International Journal of Research in Marketing (2026): sponsorlu içeriğin etkisi o videoyla bitmiyor, sonraki organik içeriğe de "kalıntı" bırakıyor. https://www.sciencedirect.com/science/article/abs/pii/S0167811626000091
- Sponsorlu gönderi sıklığının kısa ve uzun vadeli marka etkileri: https://www.tandfonline.com/doi/full/10.1080/13527266.2024.2413916 (tam metin paywall; **spesifik eşik sayısı okunamadı**)

## A.8 · Ne kadar sık, ne kadar uzun? (soru 4)

**Akademik/endüstri kaynaklı taşınabilir kurallar:**

| Kural | Sayı | Kaynak / güven |
| --- | --- | --- |
| Standart mid-roll entegrasyon uzunluğu | **60-90 sn** (CPM benchmark'larının referans aldığı format) | Endüstri standardı — https://creatorsagency.co/blog/youtube-sponsorship-rates-per-60-second-integration |
| Retention düşüşü görülüyorsa | **<45 sn**'ye indir + doğrudan doğal bir içerik kırılımına yerleştir (cümlenin ortasına değil) | https://www.overseeros.com/blog/youtube-audience-retention-9-fixes-viewer-drop-off |
| Aynı videoda birden çok sponsor | **Yapma** — güveni ve oturum kalitesini düşürüyor | aynı kaynak |
| Sponsor okuması + mid-roll reklam | Aynı bölgeye koyma; videonun zıt ucuna al (üst üste iki kesinti) | https://milx.app/en/guidelines/why-some-sponsorships-lower-your-rpm-and-how-to-avoid-it |
| Video başına sponsorlu içerik ceza tabanı | %0,19 abone (kongrüans düşükse artar) | Management Science 2025 |

> **Kanıta dayalı olmayan ama savunulabilir çalışma kuralı:** Video başına **≤45 saniye**, **4 videoda 1'den sık olmayacak şekilde** açık tanıtım. Bu spesifik "1/4" oranı için **doğrudan bir çalışma BULUNAMADI** — %0,19 ceza + "residue" bulgusu + 4 haftalık yayın ritmi mantığından türetilmiş bir tavan. Belge boyunca bunu **varsayım** olarak işaretliyorum.

---

# B · FORMAT

## B.1 · "Ürünle bir şey yapmak" vs "ürünü anlatmak" (soru 5)

Doğrudan A/B karşılaştırması yapan bir çalışma **BULUNAMADI**. Ama üç ayrı kanıt aynı yöne işaret ediyor:

1. **Kongrüans bulgusu (Management Science 2025).** Influencer'ın olağan içerik tarzına *benzeyen* tanıtım daha az cezalandırılıyor. "Ürünü anlatmak" videosu formatı kırar (kanalın normal formatı değildir); "ürünle bir şey yapmak" formatı korur. Yani ceza farkının mekanizması literatürde var.
2. **Thomas Frank modeli.** Videolar Notion'ı *öğretiyor*; şablon ödül. Ürün tanıtım videosu değil, kullanım videosu. $2,1M sonuç. https://www.starterstory.com/stories/thomas-frank
3. **Kayla Itsines / BBG.** Dönüşüm, kullanıcıların kendi `#BBG` fotoğraflarıyla gösterildi — ürünün anlatımı değil, ürünle elde edilen sonuç. https://www.forbes.com/sites/elanagross/2018/04/05/kayla-itsines/

**Ters kanıt (Panels):** Panels'ın lansmanı "işte yaptığım ürün, şuraya bakın" formatındaydı; ürünle üretilmiş bir içerik değildi. İzleyicinin elinde videodan alacağı bağımsız bir değer yoktu → video tamamen reklam olarak okundu.

| Format | Video izleyiciye tek başına değer veriyor mu? | Sırıtma riski |
| --- | --- | --- |
| "Bu uygulamayı yaptım, indirin" | Hayır | **Çok yüksek** |
| "Uygulamanın özelliklerini gezdiriyorum" (walkthrough) | Kısmen (sadece zaten ilgilenene) | Yüksek |
| "Şu problemi şöyle çözüyorum" (araç ekranda görünür, konu problem) | Evet | Düşük |
| "30 gün X yaptım, işte veriler" (veri uygulamadan geliyor) | Evet | **En düşük** |

## B.2 · Build-in-public (soru 6)

**Kanıt (yazılım tarafı, güçlü):**
- Pieter Levels: NomadList/RemoteOK/PhotoAI tamamen açıkta inşa edildi; **$2,5M+/yıl**. Gelir rakamlarını açık paylaşması ürünü kategorisinde varsayılan seçenek yaptı. https://www.softwareseni.com/building-in-public-the-10-year-distribution-strategy-behind-solo-founder-revenue/
- "LocalRank" vakası: kurucu her gün YouTube videosu attı, ürünün gerekeceği tam kitleyi biriktirdi; ürün **~$20k MRR ile lanse oldu**. (İkincil kaynak, doğrulanmadı.) aynı kaynak
- Twitter'da 4 ay build-in-public → 2.400 takipçi → ilk gün $8.000 MRR. (İkincil kaynak.) aynı kaynak
- Gerçekçi 1. yıl beklentisi (aynı kaynak): 500-2.000 takipçi, ilk $500-2K MRR. "Yıl 1'de olağanüstü bir şey olmaz."

> **Kaynak uyarısı:** Bu vakaların hepsi ikincil blog kaynaklarından; birincil doğrulama yapılmadı. Levels dışındakiler için bağımsız doğrulama **BULUNAMADI**.

**Fitness/tüketici tarafında build-in-public kanıtı: BULUNAMADI.** Format B2B SaaS / indie hacker kültüründe yerleşik; tüketici sağlık kitlesinde işlediğine dair vaka bulunamadı. Mantıksal sebep: B2B izleyicisi kendisi de kurucu olduğu için MRR grafiğini ilgi çekici bulur; fitness izleyicisi kendi karnını düşünür, senin MRR'ini değil.

**Riskler (literatür değil, vakalardan çıkarım):**
- Yarım ürünün kötü görünmesi: Panels'ta bunun tersi oldu — ürün *bitmiş* çıktı ama kalitesi beklentiyi karşılamadı. Build-in-public bu riski **azaltır** (beklenti önceden kalibre edilir).
- Rakip kopyalama: Levels'ın tüm gelirini açıklamasına rağmen ürünleri ayakta — savunma kod değil, kitle.
- **Asıl risk Beme riski:** ürün geliştirmenin içerik ritmini yemesi. Neistat tam bunu itiraf etti.

> **Levent için karar önerisi:** Build-in-public'i **ana kanalda yapma.** Ana kanal insan-ana-karakter/sağlık teması; MRR grafiği oraya ait değil, kongrüansı kırar. Build-in-public isteniyorsa ayrı bir yer (X / ikinci kanal / newsletter). Thomas Frank'in "ikinci kanal" ayrımı tam bu problem için var.

## B.3 · "Kendi üzerimde denedim" (n=1) formatı (soru 7)

**Neden güçlü:** Kongrüans %100 (kanalın teması zaten bu), ürün araç olarak arka planda kalır, video kendi başına değer taşır, CLAUDE.md'deki "kaynak kuralı"nı doğal olarak karşılar (Levent'in fiilen yaptığı şey).

**Bilinen tuzaklar**

| Tuzak | Detay | Kaynak |
| --- | --- | --- |
| **"Tipik sonuç" tuzağı** | Kendi sonucun olağanüstüyse, tipik kullanıcının ne bekleyeceğini **açık ve göze çarpar** şekilde söylemek zorundasın. "Results not typical" yazmak **yetmez** — FTC bunu açıkça reddediyor: aldatmayı iyileştirmiyor. | FTC Health Products Compliance Guidance |
| **Ürün varken tanıklık = reklam** | Ürünü sattığın anda, kendi n=1 sonucun "tüketici tanıklığı" hukuki statüsüne girer. Doğrudan sen söyleseydin kanıtlayamayacağın hiçbir şeyi tanıklıkla ima edemezsin. | aynı |
| **Sahiplik açıklaması** | FTC: *"If it is obvious from an influencer's endorsement that the brand is the influencer's own, no disclosure is necessary. If it's not clear... that fact should be disclosed."* | FTC Endorsement Guides FAQ |
| **Tıbbi sınır** | n=1 deneyimi anlatmak serbest; onaylı tedaviyi reddetmeye/yerine bir şey koymaya yönlendirmek YouTube tıbbi yanlış bilgi politikası ihlali. | YouTube medical misinformation |
| **Örneklem yanılgısı** | n=1 sonucun nedenselliği kanıtlamaz; izleyici kanıtladığını sanır. Bunu videoda **sen söylemezsen** yorumlarda başkası söyler ve otoritene mal olur. | — (metodolojik, kaynak yok) |

Kaynaklar: https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance · https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking · https://support.google.com/youtube/answer/13813322

## B.4 · Kameraya çıkmadan kişisel marka (soru 8)

**Güvenilir çapa:** Yok denecek kadar az. Bu alanda bulduğum kaynakların neredeyse tamamı SEO içerik çiftliği (outlierkit, fliki, vidiq, nexlev vb.) ve rakamları birbirlerinden kopyalıyor; **birincil doğrulama BULUNAMADI.**

Sık tekrarlanan ve **doğrulanamayan** iddia: "YouTube'un en büyük 1.000 kanalının %40'ından fazlası hiç sunucu göstermiyor." Kaynak zinciri kapalı, **doğrulanmadı — kullanma.**

**Doğrulanabilir mantık (kaynaklardan bağımsız):**
- Yüz göstermemek "kişisel marka yok" demek değil; ses + bakış açısı + tekrarlanan yapı marka kurar. Faceless içerikte marka taşıyıcısı **ses ve format tutarlılığı**dır.
- Sağlık/longevity temasında yüz göstermeden çalışan somut alt formatlar: ekranda veri/grafik analizi, kaynak/çalışma özeti, ellerin göründüğü mutfak/ölçüm çekimi, POV antrenman, cihaz/uygulama ekran kaydı + voice-over.
- **Ama:** Kanalın tezi "insan ana karakter" ise, yüz olmadan da **bedenin/sonuçların** görünmesi gerekir. Tam faceless değil, **"yüzsüz ama bedenli"** bir formata bakmak daha tutarlı: eller, ağırlık, tabak, tartı, saat verisi, POV. Bu 4 kişilik yurt odasında yapılabilir (masa üstü, dar kadraj).
- Peter Attia tarzı longevity içeriği (supplement stack, soğuk maruziyet, CGM deneyleri) faceless kaynaklarda tekrarlanan bir örnek; sürdürülebilir tempo olarak **haftada 2 video** öneriliyor. (SEO kaynağı, düşük güven.)

---

# C · YOUTUBE MEKANİĞİ

## C.1 · Huni öğeleri ve tıklama oranları (soru 9)

> **Uyarı:** Bu alandaki tek birinci-el rakam thumbnail CTR'ı. Kart/son ekran/açıklama linki için Google'ın yayınladığı resmi benchmark **BULUNAMADI**; aşağıdaki sayılar ajans/blog kaynaklıdır ve **düşük güvenle** işaretlenmiştir.

| Öğe | Tıklama oranı | Güven | Notlar |
| --- | --- | --- | --- |
| Thumbnail (video izlenmesi) | Kanalların/videoların yarısı **%2-10** aralığında; ortalama %4-5 | Orta (YouTube'a atfediliyor, resmi sayfada doğrulanamadı) | Nişe göre: fitness/lifestyle %4-7, finans %2-4 |
| **Sözlü CTA + eşzamanlı kart** | Video izlenmesinin **%0,5-2,5**'i | Düşük (ajans) | "Yukarıdaki karta tıkla" derken kartın belirmesi anlamlı fark yaratıyor |
| Son ekran (end screen) | Karttan **belirgin şekilde düşük** | Düşük | İzleyicinin önemli kısmı son ekrana gelmeden ayrılıyor |
| Mid-video CTA (videonun %20-50 aralığı) | Pre-roll (%0-20) ve son (%80-100) CTA'lardan **daha iyi** | Düşük | En değerli CTA bölgesi |
| Açıklama linki | Sayısal veri **BULUNAMADI** | — | Açıklamanın "daha fazla göster" öncesindeki ilk 2-3 satırına koymak dışında veri yok |
| Sabit yorum | Sayısal veri **BULUNAMADI** | — | |
| Topluluk gönderisi | Sayısal veri **BULUNAMADI** | — | |

Kaynaklar: https://influencerfee.com/blog/youtube-ctr-benchmarks/ · https://www.clickstudio.co/blog/youtube-ctr-benchmarks · https://www.overseeros.com/blog/youtube-audience-retention-9-fixes-viewer-drop-off

**Uygulanabilir sonuç:** Tek gerçekten kanıtlı kural — **CTA videonun ortasında, sözlü, ve tıklanacak öğe aynı anda ekranda.** Son ekrana güvenme. Açıklama linki tek başına huni değil, yedek.

## C.2 · Shorts → uygulama, ve mevcut 27K Türkçe kanal (soru 10)

**Shorts → abone dönüşümü:** SEO kaynaklarında dolaşan rakamlar tutarsız (aynı sayfada "1M Shorts izlenmesi → 500-5.000 abone (%0,05-0,5)" ve "10.000 izlenme → 100-300 abone (%1-3)" ifadeleri yan yana; kendi içinde çelişkili). **Güvenilir Shorts→abone dönüşüm oranı BULUNAMADI. Shorts→uygulama indirmesi dönüşüm verisi BULUNAMADI.**

Tekrarlanan ve mantıken savunulabilir nitel bulgu: **Shorts ile gelen abone, long-form ile gelen aboneden daha düşük değerli** (video başına izlenme, izlenme süresi ve abone başına gelir daha düşük). Sebebi açık: 12 dakikalık bir videoyu izleyen kişi konuya kendini seçmiş oluyor; 20 saniyelik Short'u kaydıran seçmiyor. (Kaynak: https://www.youtowire.com/blog/youtube-shorts-vs-long-videos-subscribers — düşük güven.)

**Mevcut 27K Türkçe Shorts kanalı yarar mı, zarar mı?**

YouTube'un **kendi resmi rehberi** (https://support.google.com/youtube/answer/6070467) üç strateji tanımlıyor:
1. Tek kanal, çok dil,
2. Dile göre ayrı kanallar,
3. Hibrit (global kanal + yerel destek kanalları — "en çok zaman ve emek gerektiren").

Ayrı kanal önerdiği durum: *"brand varies slightly in different countries/regions"* ve yerelleştirilmiş deneyim gerektiğinde. Tek kanal önerdiği durum: marka tutarlılığı ve ortak arama terimleri.

Sektör bulgusu (ikincil): YouTube öneri sistemi **dil pazarları arasında serbestçe geçmiyor**; kanal dili ↔ içerik dili ↔ hedef kitle hizalaması algoritmaya sinyal. Karışık dilli tek kanal hem kitleyi karıştırıyor hem sinyali bulandırıyor. (https://air.io/en/youtube-hacks/should-you-create-another-channel-for-a-different-language · https://milx.app/en/cases/can-adding-new-language-reset-a-youtube-monetization-algorithm)

> **Karar: Ayrı kanal. Mevcut Türkçe Shorts kanalını İngilizce global kanala çevirme.**
> - Kitle uyumsuz (Türkçe ↔ İngilizce), tema uyumsuz (mevcut Shorts kanalı klip/erişim odaklı), Content ID claim riski taşıyor ve CLAUDE.md'de zaten *"kaybedilebilir varlık"* olarak tanımlanmış. Yeni ana kanalı o riske bağlama.
> - **Yararı sıfır değil ama dolaylı:** (a) Levent'in thumbnail/hook/retention refleksleri zaten eğitilmiş — bu en pahalı öğrenme eğrisi ve bedava geliyor; (b) tek seferlik bir "yeni kanalımı açtım" duyurusu yapılabilir, ama düzenli çapraz tanıtım **yapılmamalı** (Türkçe izleyici İngilizce videoyu izleyip yarıda bırakırsa yeni kanalın retention sinyali bozulur — bu ölçülmüş değil ama algoritmik olarak mantıklı risk).
> - **Uygulama tanıtımını mevcut Türkçe kanaldan yapma.** Uygulama İngilizce/global; Türkçe Shorts izleyicisi indirmez, indirmeyen tıklama huniyi ve kanal sinyalini kirletir.

## C.3 · Kendi ürününü tanıtma: YouTube politikası + FTC (soru 11)

**YouTube — Ücretli tanıtım / branded content politikası** (https://support.google.com/youtube/answer/154235)
- Kural: *"branded content, sponsorships, endorsements, or other commercial relationships"* açıklanmalı → YouTube Studio > Video detayları > **Paid Promotion > "Yes, my video includes branded content"** işaretlenir, video başına otomatik "Ücretli tanıtım içerir" etiketi çıkar.
- **Kendi ürününe uygulanıp uygulanmadığı politika metninde açıkça belirtilmiyor** — metin "birlikte çalıştığın partnerler"e odaklı. **YouTube'un kendi ürününe dair net bir cümlesi BULUNAMADI.**
- Politika ayrıca yaratıcıyı yerel hukuka (FTC, ASA) uymakla açıkça sorumlu tutuyor. Yani pratikte belirleyici olan FTC.

**FTC — Endorsement Guides** (https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)
> *"If it is obvious from an influencer's endorsement that the brand is the influencer's own, no disclosure is necessary. If it's not clear or sometimes not clear that it's the influencer's brand, that fact should be disclosed."*

- Yani **material connection sen sahipsen de vardır**; sadece "apaçık" olduğunda ayrıca beyan gerekmez.
- Ölçüt izleyicinin anlaması. "Bu benim yaptığım uygulama" cümlesi videoda/açıklamada geçiyorsa apaçıklık sağlanmış olur.
- Ürün hakkında **nesnel iddialar** (kilo verdirir, uykuyu iyileştirir) ayrıca **kanıt yükümlülüğü** doğurur; tanıklıkla dolaylı yoldan söylemek de aynı yükümlülüğü doğurur.

> **Pratik kural:** (1) Videoda ağzınla "bunu ben yaptım" de — bu hem FTC'yi hem izleyici güvenini çözer. (2) Paid Promotion kutusunu **işaretle** — zorunlu olmasa da maliyeti sıfır, riski sıfırlar; ayrıca "gizlemeye çalıştı" suçlamasını imkânsız kılar. (3) Ürün hakkında ölçülebilir iddia yapma; ürünü **araç** olarak göster, **sonuç vaadi** olarak değil.

## C.4 · Ne zaman başlamalı? (soru 12)

**Doğrudan kanıt: BULUNAMADI.** "Kaç abonede ürün tanıtımına başlanmalı" sorusuna cevap veren bir çalışma yok. Erken tanıtımın zararını ölçen çalışma da **BULUNAMADI**. Elimizde şunlar var:

| Kanıt | Ne söylüyor |
| --- | --- |
| Reputation Burning (Management Science 2025) | Ceza **büyük kanallarda daha güçlü**, küçüklerde daha zayıf. Yani *ceza açısından* erken tanıtım daha ucuz. |
| Aynı çalışma | Ceza kongrüans düşükse artar. Yani belirleyici olan abone sayısı değil, **uyum**. |
| Kayla Itsines | Talep PDF ile doğrulandıktan ~18 ay sonra uygulama. |
| Thomas Frank | İkinci kanal 2020, ilk premium şablon Ağustos 2021 → **~1 yıl içerik, sonra ürün**. |
| Pieter Levels / LocalRank | Kitle ürünle **eşzamanlı** kuruldu; ürün var olan talebe düştü. |
| Kevin Kelly, 1000 True Fans | Ödeyen 1.000 kişi için çok daha büyük genel kitle gerekir; tipik lead dönüşümü %1-3. https://kk.org/thetechnium/1000-true-fans/ |

> **Sentez (kanıt değil, çıkarım):** Belirleyici eşik abone sayısı değil, **iki koşul**: (a) kanalın tezi izleyicide oturmuş mu — yani "bu kanal ne yapar" sorusunun cevabı net mi; (b) ürün, kanalda zaten anlattığın problemin çözümü mü. Bu ikisi sağlanmışsa 500 abonede de tanıtılabilir; sağlanmamışsa 50.000'de de sırıtır. Pratik olarak **8-12 video** kanal kimliğini oturtmaya yeter (aşağıdaki takvim buna göre).

---

# D · SAĞLIK İÇERİĞİ ÖZEL KISITLARI

## D.1 · YouTube tıbbi yanlış bilgi politikası (soru 13)

Kaynak: https://support.google.com/youtube/answer/13813322

**Yasak kategoriler**
| Kategori | Ne yasak |
| --- | --- |
| Prevention (önleme) | Sağlık otoritesi rehberliğine aykırı önleme/bulaşma iddiaları; onaylı aşıların güvenliği/etkinliği/içeriği hakkında aykırı iddialar (ör. "aşı otizm yapar", "tütün kanser yapmaz") |
| Treatment (tedavi) | Onaylanmamış tedavileri teşvik (kahve lavmanı, Hoxsey, sezyum klorür); onaylı tedavilerin "asla işe yaramadığı" iddiası; **profesyonel bakım yerine diyet önermek** |
| Genel | MMS, terebentin gibi maddelerin tedavi olarak tanıtımı — "ciddi bedensel zarar veya ölüm riski" |

**İstisnalar:** eğitici / belgesel / bilimsel / sanatsal bağlam; **kişisel deneyim anlatımı**; kamu yararı (parlamento oturumu, kamusal tartışma); karşıt uzman görüşünün de yer alması; yanlış bilgiyi **kınayan, çürüten veya hicveden** içerik.

**Ceza:** İlk ihlal → uyarı (kanal cezası yok), 90 gün içinde eğitim tamamlanırsa uyarı düşer. Tekrarında strike sistemi, ağır/örüntülü ihlalde kanal kapatma.

> **Fitness/beslenme tavsiyesi sınırı nerede aşılır:** Politikanın belirleyici cümlesi *"profesyonel bakım yerine diyet önermek"*. Yani "şöyle antrenman yapıyorum / şu makro dağılımını kullanıyorum" güvenli bölgede. Sınırı aşan: bir **hastalığın** (kanser, diyabet, depresyon) tedavisi/önlenmesi olarak beslenme veya egzersiz önermek, ya da onaylı tedaviyi (ilaç, aşı, kemoterapi) küçümsemek.
> **Kural: "Ben ne yaptım" anlat, "sen ne yapmalısın (tıbbi olarak)" deme.** Kişisel deneyim istisnası zaten tam olarak Levent'in formatını koruyor.

**Ek politika — Yeme bozuklukları** (https://support.google.com/youtube/answer/2802245 · https://blog.youtube/news-and-events/an-updated-approach-to-eating-disorder-related-content/)
- Yasak: **taklit edilebilir** yeme bozukluğu davranışları — kusma, **ağır kalori kısıtlaması**; yeme bozukluğu bağlamında kilo üzerinden zorbalık.
- İyileşme/eğitim bağlamındakiler kalabilir ama **yaş kısıtlaması veya kriz kaynak paneli** alır; taklit edilebilir davranış içeriyorsa 18+ ve giriş yapmış kullanıcıya kısıtlanır.
- **Levent için doğrudan risk:** "X gün su orucu", "günde 800 kalori", "şu kadar günde şu kadar kilo verdim" tipi challenge'lar bu politikanın tam ortasına düşer. **Kalori/kilo odaklı aşırılık challenge'ı yapma.** Performans/ölçüm odaklı challenge (uyku, adım, VO2max, güç, tutarlılık) aynı risk taşımaz.

## D.2 · Monetizasyon: hangi görsel sınırlı reklam yer? (soru 14)

Kaynak: https://support.google.com/youtube/answer/6162278

| Durum | Reklam statüsü |
| --- | --- |
| Sınırlı kıyafet, cinsel tatmin amacı taşımayan sunum (havuz kenarında bikini) | **Tam kazanç** |
| Sporun gereği kısmi çıplaklık (ör. boks) | **Tam kazanç** |
| Kıyafet incelemesi — odak kıyafetin biçim/işlevinde, altındaki vücut parçalarında sürekli odak yok | **Tam kazanç** |
| Eğitici/belgesel tam çıplaklık | **Sınırlı reklam** |
| Açık/asgari örtülü cinsel bölgeler, tam çıplaklık | **Reklam yok** |
| Dekolte/şişkinliğe tekrarlayan veya odaklı çekimler, tahrik amaçlı | **Reklam yok** |

> **Ayırt edici ölçüt: niyet ve odak.** Egzersiz gösteriminde tişörtsüz olmak sorun değil; **kamera vücuda odaklanıp orada kalıyorsa** sorun. Pratik kural: form gösterirken gövde kadrajda **hareket için** olsun, kesme/yakınlaştırma vücut parçasında durmasın.

**Ek risk — "yellow dollar" (sınırlı reklam):** Wellness/sağlık içeriği otomatik sistemlerce "çoğu reklamveren için uygun değil" olarak işaretlenmeye yatkın; **spesifik teşhis adı geçirmek** (depresyon, anoreksiya, diyabet…) sadece bilgilendirme amaçlı bile olsa sınırlı reklam tetikleyebiliyor. Sınırlı reklamda CPM'in $0,50-2 bandına, yani **%50-90 düşüşe** indiği bildiriliyor. (İkincil kaynaklar, düşük güven: https://www.heymarvelous.com/blog/youtube-demonetization · https://mediacube.io/en/blog/youtube-demonetization)
> **Sonuç:** Bu kanalın gelir modeli AdSense'e bağlanmamalı. Zaten plan bu — ürün gelir modeli. **Sınırlı reklam bir felaket değil, bir varsayım olarak kabul edilmeli.**

## D.3 · Before/after görselleri: YouTube + FTC + App Store (soru 15)

**YouTube tarafı**
- Öncesi/sonrası görselleri için **spesifik bir YouTube politikası BULUNAMADI.** İki dolaylı kısıt var:
  1. Reklamverene uygunluk (yukarıdaki tablo) — tişörtsüz/asgari kıyafetli kare kendi başına sorun değil, **odak** sorun.
  2. Yeme bozukluğu politikası — aşırı kilo kaybı gösteren, taklit edilebilir kısıtlama davranışıyla eşleşen before/after yaş kısıtlaması alabilir.

**FTC tarafı (en sert kısıt burada)**
Kaynak: https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance
- Before/after fotoğrafları, grafikler ve influencer tanıklıkları **yazılı metnin söylemediği etkinlik vaatlerini iletir** — yani görselin kendisi bir iddiadır ve kanıtlanmalıdır.
- Tanıklıklara **tipik tüketicinin gerçekten bekleyebileceği sonucun açık ve göze çarpan bir açıklaması** eşlik etmelidir.
- **"Results not typical" yazmak aldatmayı iyileştirmez.** FTC'nin kendi örneği: 8 haftada 16 lb veren kadının fotoğrafı + "sonuçlar tipik değildir" ibaresi; oysa iyi yürütülmüş RCT plaseboya göre 8 haftada ortalama **4 lb** gösteriyor → hâlâ aldatıcı.
- Reklamveren doğrudan söylese kanıtlayamayacağı hiçbir şeyi tanıklık yoluyla söyletemez.

**App Store tarafı**
Kaynak: https://developer.apple.com/app-store/review/guidelines/
- Before/after görselleri için **spesifik bir Apple maddesi BULUNAMADI.** İlgili dört madde:
  - **2.3.1** — Uygulamayı yanıltıcı şekilde pazarlamak (sunmadığı içerik/hizmeti vaat etmek), **App Store içinde veya dışında**, uygulamanın kaldırılması ve geliştirici hesabının feshi sebebidir. → **YouTube videosundaki abartılı vaat de bu maddenin kapsamına girer.**
  - **2.3.8** — İkon, ekran görüntüsü ve önizlemeler uygulamanın yaş derecesinden bağımsız olarak **4+ uygunluğunda** olmalı. → Tişörtsüz before/after'ı App Store ekran görüntüsüne koymak risklidir.
  - **1.4.1** — Sağlık ölçümüne dair doğruluk iddiaları için veri ve metodoloji açıkça beyan edilmeli; doğrulanamıyorsa uygulama reddedilir. Uygulama kullanıcıya **doktora danışmasını hatırlatmalı**.
  - **5.1.3(i)** — Sağlık/fitness bağlamında toplanan veri **reklam ve pazarlama** amaçlı kullanılamaz. → Kullanıcı verisini videoda pazarlama malzemesi yapmak bu maddeye çarpar; **kendi verini kullanmak sorun değil.**

> **Levent'in kendi dönüşümünü göstermesi — sınır çizgisi**
> | Yapılabilir | Yapılamaz |
> | --- | --- |
> | Kendi öncesi/sonrası fotoğrafını **uygulama satılmadan önce**, kanal içeriği olarak göstermek | Aynı fotoğrafı uygulamanın satış argümanı olarak kullanmak (tipik sonuç kanıtı gerekir) |
> | "Ben 8 ayda şunu yaptım, şöyle çalıştım" — süreç anlatımı | "Bu uygulamayla 8 ayda şunu yaptım" — ürüne atfedilen sonuç iddiası |
> | Sayıları vermek (ağırlık, tekrar, uyku, adım) | Sayıları ürünün vaadi haline getirmek |
> | Kadrajda gövde, hareket odaklı | Vücut parçasına odaklı kesme/yakınlaştırma |
> | Ölçüm/performans challenge'ı | Kalori kısıtlama / hızlı kilo verme challenge'ı |
>
> **Tek cümlelik kural:** Dönüşümünü **kanalın hikâyesi** olarak göster, **ürünün kanıtı** olarak asla. Ürünle sonucu aynı cümlede birleştirdiğin an FTC "tipik sonuç" yükümlülüğü doğar ve Apple 2.3.1'in kapsamına girersin.

---

# E · KANAL-ÜRÜN SENKRONU

## E.1 · "Challenge serisi" fikri — yapılmış mı, nasıl performans gösterdi? (soru 17)

**Evet, fitness'ta bu formatın en büyük vakası Chloe Ting.**

| Unsur | Veri |
| --- | --- |
| Yapı | "2020 2 Week Shred Challenge" — **14 günlük** program, günde 39-65 dk. Haftada **aynı 5 antrenman** karıştırılarak tekrarlanıyor. Ekipmansız, düşük etkili varyasyonlar, başlangıç seviyesine uygun. |
| Erişim | "Get Abs in Two Weeks" (Ağu 2019) **517 milyon izlenme** (Eylül 2023 itibarıyla). Kanal 19M+ abone. |
| Zirve | 2020 yazı, TikTok + YouTube'da viral. YouTube'un 2020 resmi trend raporunda ABD/İngiltere/Asya listelerinde. Google 2020 trendlerinde İngiltere'de ekipmansız antrenmanda Joe Wicks'ten sonra en çok aranan. |
| İş modeli | Programlar **ücretsiz** — web sitesinde haftalık takvim, tarif rehberi dahil. Gelir: sponsorluk (Gymshark vb.), 2022'de 3.000+ Walmart mağazasında fitness ekipmanı, ücretsiz uygulama. |

Kaynaklar: https://chloeting.com/program/2020/two-weeks-shred-challenge · https://en.wikipedia.org/wiki/Chloe_Ting · https://bettermarketing.pub/chloe-ting-the-workout-queen-of-youtube-is-really-a-marketing-genius-8e1e6e1cd573 · https://creatordb.app/creatorstats/chloe-ting/

> **Chloe Ting'den çıkan asıl yapısal ders — bu belgenin en önemli bulgusu olabilir:**
> Challenge serisi **uygulamanın reklamı değildir. Challenge serisi, uygulamanın içeriğinin YouTube'da ücretsiz teslim edilmiş halidir.** Uygulama, o challenge'ı *takip etmeyi/ölçmeyi/hatırlatmayı* kolaylaştıran katmandır.
> Bu kurulumda izleyici hiçbir zaman "bana reklam yapılıyor" hissetmez, çünkü videoyu izlerken zaten tam değeri almıştır. Uygulama, "aynı şeyi daha az sürtünmeyle yapmak isteyen" alt kümeye satılır. Tam olarak Thomas Frank'in şablon modeli, fitness'a çevrilmiş hali.
> Panels'ın yaptığı bunun tersiydi: değer uygulamanın **içine** kilitlendi, video sadece kapı görevi gördü.

**Serinin yapısal parametreleri (kanıtlanmış olan)**
- Süre: **14 gün** — bitirilebilir, "66 günde alışkanlık" literatürüne göre alışkanlık kurmaz ama *deneme/keşif* için yeterli ve **tamamlanma oranı yüksek**.
- Tekrar: az sayıda birim (5 antrenman) karıştırılarak — üretim maliyeti düşük, izleyici için tanıdık.
- Dışsal takvim: haftalık program **video dışında** (site/PDF) — geri dönüş sebebi yaratır.
- Sosyal kanıt: kullanıcıların kendi sonuçları (#etiket) → içerik motoru kullanıcıya devredilir (Kayla Itsines'te aynı mekanizma).

**Challenge video formatı — genel bulgular** (düşük güven, tek ikincil kaynak: https://vloggingpro.com/youtube-challenges/)
- Başarılı challenge videoları çoğunlukla **8-15 dk**.
- "I tried X for a week" formatı: minimum ekipman, tek başına çekilebilir, tüm nişlerde güçlü arama talebi. **Yurt odası kısıtına birebir uyuyor.**
- Yüksek CTR'ın sebebi başlık formatının doğal **merak boşluğu** yaratması.
- Retention: sonucu **ilk 30 saniyede teasle**.

## E.2 · Lansman haftası ve ritim — kanıt durumu

Creator ürün lansmanı için doğrulanmış bir "lansman haftası playbook"u **BULUNAMADI.** Aşağıdaki takvim, bu belgedeki kanıtlardan türetilmiş bir **öneri**dir, ölçülmüş bir reçete değil. Dayandığı kanıtlar her satırda işaretli.

---

# SONUÇ 1 · SIRITMAMA KURALLARI

Her kural bir vakaya/kaynağa bağlı. Sıra, ihlal edildiğinde verdiği zarara göre.

| # | Kural | Dayanak |
| --- | --- | --- |
| 1 | **Kanalda savunduğun değerle ürünün iş modeli çelişmesin.** Ücretsiz alternatifi olan bir şeyi kilitleme; "kolaylık/zaman" sat, "erişim" satma. | MKBHD/Panels: tüketici avukatı, abonelik+reklam+veri satmaya kalktı. Asıl öfke ürüne değil **tutarsızlığa**. |
| 2 | **Videoyu izleyen, uygulamayı indirmeden de tam değeri almış olsun.** Video tek başına ayakta durmuyorsa o video reklamdır. | Chloe Ting: challenge ücretsiz ve tam. Thomas Frank: eğitim ücretsiz, şablon kısayol. Panels: değer uygulamanın içine kilitliydi. |
| 3 | **Ürünü anlatma — ürünle bir şey yap.** Kanalın olağan formatını bozma. | Management Science 2025: kongrüans yüksekse ceza düşük. Ceza tabanı sponsorlu video başına **%0,19 abone**. |
| 4 | **Video başına ≤45 sn, doğal bir kırılma noktasında, videonun %20-50 bölgesinde, sözlü CTA + eşzamanlı kart.** Son ekrana güvenme. | Endüstri standardı 60-90 sn; retention düşüyorsa <45 sn. Mid-video CTA > pre-roll > son ekran. |
| 5 | **En fazla 4 videoda 1 açık tanıtım. Bir videoda tek çağrı.** | **VARSAYIM** — doğrudan çalışma yok. %0,19 ceza + "sponsored content residue" (sonraki organik videolara sızan etki) + çoklu sponsorun güveni düşürmesi bulgularından türetildi. |
| 6 | **"Bunu ben yaptım" cümlesini ağzınla söyle ve Paid Promotion kutusunu işaretle.** | FTC: sahiplik apaçık değilse beyan zorunlu. YouTube: branded content beyanı + yerel hukuka uyum sorumluluğu sende. Maliyet sıfır, "gizledi" suçlamasını imkânsız kılar. |
| 7 | **Kendi sonucunu ürünün kanıtı yapma.** Dönüşümün kanalın hikâyesi; ürünün vaadi değil. | FTC Health Products Guidance: before/after görselinin kendisi bir iddiadır; "results not typical" **aldatmayı iyileştirmez** (16 lb vs RCT'de 4 lb örneği). Apple 2.3.1 App Store *dışındaki* yanıltıcı pazarlamayı da kapsıyor. |
| 8 | **Ölçülebilir sağlık iddiası verme.** "Ben ne yaptım" anlat, "sen ne yapmalısın (tıbbi olarak)" deme. | YouTube tıbbi yanlış bilgi politikası: kişisel deneyim istisnası var; "profesyonel bakım yerine diyet önermek" yasak. |
| 9 | **Kalori/kilo aşırılığı challenge'ı yapma.** Ölçüm/performans challenge'ı yap (uyku, adım, tutarlılık, güç, VO2max). | YouTube yeme bozukluğu politikası: ağır kalori kısıtlaması dahil taklit edilebilir davranış yasak; iyileşme bağlamında bile yaş kısıtı/kriz paneli. |
| 10 | **Kadrajda vücut hareket için olsun; kesme/zoom vücut parçasında durmasın.** | Reklamverene uygunluk: "sürekli odak" ölçütü. Bikini/spor gereği kısmi çıplaklık tam kazanç; odaklı çekim reklamsız. |
| 11 | **Build-in-public'i ana kanalda yapma.** MRR grafiği sağlık kanalının kongrüansını kırar. Ayrı yere (X / ikinci kanal / newsletter) koy. | Thomas Frank'in ikinci kanal ayrımı; kongrüans bulgusu. Fitness/tüketici tarafında build-in-public'in işlediğine dair kanıt **BULUNAMADI**. |
| 12 | **Türkçe Shorts kanalını İngilizce ana kanala çevirme, oradan uygulama tanıtma.** Tek seferlik duyuru tamam, düzenli çapraz tanıtım hayır. | YouTube resmi rehberi: marka bölgeye göre değişiyorsa ayrı kanal. Öneri sistemi dil pazarları arasında serbest geçmiyor. Ayrıca o kanal claim/takedown riski taşıyan "kaybedilebilir varlık". |
| 13 | **Ürün geliştirme yayın ritmini yemesin.** Ritim kırılırsa iki taraf birden ölür. | Beme/Neistat: *"I would sort of disappear... at least I would be able to yield something."* 14 ayda kapandı. |
| 14 | **En sadık izleyici en kırılgan kesim — ilk tanıtımda onlara ayrıca konuş.** | Online Information Review 2025: sponsorluk farkındalığı **uzun süreli takipçilerde** güvenilirliği ve parasosyal ilişkiyi daha çok aşındırıyor. |
| 15 | **Yanlış yaparsan 3 hafta içinde somut değişiklikle geri dön ve açıkça itiraf et.** Savunma yapma, düzelt. | MKBHD: 23 Eylül sentiment dibi → 11 Ekim güncelleme → sentiment "accountability/transparency"e döndü. Kapanışta yıllık abonelikleri proaktif iade etti. |
| 16 | **Tanınmamış olmak avantaj — ürünü büyük marka gibi lanse etme.** Küçük, kişisel, "kendim için yaptım" çerçevesi cezayı düşürüyor. | Management Science 2025: az bilinen marka tanıtımı, yüksek profilli marka anlaşmalarından **daha az** tepki üretiyor. |
| 17 | **Satışın ağır kısmını kanaldan değil listeden yap.** Kanal ilgi toplar, e-posta/uygulama içi dönüştürür. | Ali Abdaal: segmentli e-posta ile kurs satarken "hate" almadığını söylüyor. Kanalda satış yapmak, kanalın kendisini reklam alanına çevirir. |
| 18 | **Ürünü çıkarmadan önce en ucuz formatla talebi doğrula.** | Kayla Itsines: önce PDF (2014), talep kanıtlandıktan sonra uygulama (2015-11). Uygulama ilk hafta App Store #1. |

---

# SONUÇ 2 · ZAMAN ÇİZELGESİ TASLAĞI

**Varsayımlar:** Tek kişi, yurt odası, masa başı/ekran kaydı/voice-over varsayılan, öğrenci bütçesi, ürün henüz yok/geliştiriliyor.
**Ritim varsayımı: haftada 1 video.** (Haftada 2 önerisi kaynaklarda geçiyor ama düşük güvenli SEO kaynağından; tek kişi + ders yükü + "consistency en önemli" ilkesi haftada 1'i savunuyor. Tutamayacağın ritmi seçmek, en pahalı hata.)
**Bu takvim ölçülmüş bir reçete değil, bu belgedeki kanıtlardan türetilmiş bir öneridir.**

| Faz | Zaman | Ne yapılır | Uygulamadan bahsetme düzeyi | Dayanak |
| --- | --- | --- | --- | --- |
| **0 · Sessiz hazırlık** | Lansmandan **-14 hafta** | Kanal açılır. Tez tek cümleyle yazılır ("bu kanal ne yapar"). İlk 4 video **çekilmeden** planlanır. Ses kurulumu (mikrofon ilk kez kullanılır) ve format şablonu (intro/outro sabit — YouTube politikası buna izin veriyor, gövde farklıysa sorun yok) kilitlenir. | **Sıfır** | CLAUDE.md; kanal kimliğinin oturması ürün tanıtımının önkoşulu |
| **1 · Kimlik kurma** | Hafta 1-8 (8 video) | Sadece alan içeriği. Kişisel kaynak zorunlu (CLAUDE.md kaynak kuralı). Formatlar: kendi üzerinde deney, veri analizi, çalışma özeti. Yorumlardan **sürtünme noktaları** toplanır — ürünün özellik listesi buradan çıkar. | **Sıfır.** Ürün adı geçmez. | Thomas Frank ~1 yıl içerik → ürün. Kongrüans önce kurulur. |
| **2 · Problem çerçeveleme** | Hafta 9-12 (4 video) | Ürünün çözdüğü problemi **ürünsüz** anlat: "bunu şu an nasıl takip ediyorum, neden berbat". Kendi çözümünü ekranda göster (tablo, not defteri, kağıt). İzleyici problemi kendi problemi olarak tanısın. | **Sıfır** ama problem tanımlanmış olur. Sonraki lansmanın zemini bu. | Panels dersi: ürün, tanımlanmamış bir probleme düştü. Problem önce izleyicinin kafasında olmalı. |
| **3 · İlk 14 günlük challenge (ürünsüz)** | Hafta 13-14 | İlk challenge serisi yayınlanır — **tamamen ücretsiz, tam değerli**, takvim/PDF site üzerinden. Ürün yok. Etiket verilir, kullanıcı sonuçları toplanmaya başlar. | **Sıfır** | Chloe Ting: 14 gün, ekipmansız, ücretsiz, dış takvim. Kayla Itsines: ucuz formatla talep doğrulama. |
| **4 · Talep doğrulama** | Hafta 15-16 | Challenge'ı bitirenlerden geri bildirim. E-posta listesi/bekleme listesi açılır ("bunu otomatik takip eden bir şey yapıyorum, haber vereyim mi"). **Ürüne devam kararı bu sayıya bakılarak verilir.** | **Bir cümle**, video sonunda, ısrarsız. | Kayla Itsines PDF→app; Ali Abdaal liste üzerinden satış |
| **5 · Lansman haftası** | Hafta ~20-24 (ürün hazır olunca; takvim ürünü beklemez, ürün takvime yetişmezse Faz 1-3 döngüsü sürer) | **Tek video.** Format: *"14 günlük challenge'ı bu sefer kendi yaptığım araçla yaptım — işte veriler."* Yani ürün anlatılmaz, ürünle bir şey yapılır. Video: ≤45 sn açık tanıtım, %20-50 bölgesinde, sözlü CTA + kart. Ağızdan "bunu ben yaptım". Paid Promotion işaretli. Aynı hafta: liste e-postası (asıl dönüşüm burada), sabit yorum, açıklamanın ilk 2 satırında link, topluluk gönderisi. | **Bu videoda yüksek** — ama tek video | Kural 2,3,4,6,17 |
| **6 · Sessizlik** | Lansman +1 ile +3. hafta | **Üç video boyunca üründen hiç bahsetme.** Sadece açıklama linki ve sabit yorum kalır. Bu, "kanal reklam kanalına döndü" algısının önündeki tek gerçek savunma. | **Pasif** (link/sabit yorum) | Kural 5; "sponsored content residue" bulgusu |
| **7 · Entegre ritim** | Lansman +1. ay → +3. ay | Ürün **arka planda görünür** hale gelir: ekran kaydında zaten açık, verisi grafiklerde zaten kullanılıyor, ama cümle kurulmuyor. **4 videoda 1** açık çağrı. İkinci challenge serisi başlar — bu sefer ürünle takip edilebilir ama **ürünsüz de tamamlanabilir** (PDF hâlâ ücretsiz). | Video başına ortalama düşük; her 4 videoda 1 açık | Kurucunun kendi niyeti ("içeriğin içine entegre"); Chloe Ting modeli |
| **8 · İlk denetim** | Lansman +3. ay sonu | Ölç: (a) tanıtımlı vs tanıtımsız videolarda retention farkı, (b) abone eğrisinde kırılma, (c) yorumlarda "reklam/satış" kelimelerinin frekansı, (d) indirme başına video. **Kırılma varsa Faz 6'ya geri dön, 3 hafta içinde açıkça konuş.** | — | Kural 15; MKBHD 3 haftalık toparlanma |

**Takvimin kırmızı çizgileri**
- Ürün hazır değilse **lansman ertelenir, kanal ertelenmez.** Kanal ritmi ürünün rehinesi olamaz (Beme dersi).
- Faz 1-3 tamamlanmadan lansman yapılmaz. Kimlik oturmadan yapılan tanıtım, abone sayısından bağımsız olarak sırıtır.
- Faz 5'te ürün **çıkmışsa** tanıtılır; "yakında" videosu yapılmaz — bekleme listesi bir cümleyle Faz 4'te zaten kurulmuştur.

---

## Kaynak durumu özeti

**Güçlü / birincil**
- Management Science 2025, "Reputation Burning" — %0,19 abone cezası, kongrüans ve marka bilinirliği moderatörleri
- FTC Endorsement Guides FAQ — kendi markanı tanıtma kuralı
- FTC Health Products Compliance Guidance — before/after, tipik sonuç, "results not typical" reddi
- YouTube: branded content, tıbbi yanlış bilgi, yeme bozuklukları, reklamverene uygunluk, global kitle politikaları
- Apple App Store Review Guidelines 1.4.1, 2.3.1, 2.3.8, 5.1.3

**Orta**
- MKBHD/Panels kronolojisi (birden çok bağımsız haber kaynağı teyitli), Infegy yorum analizi
- Kayla Itsines, Thomas Frank, Chloe Ting, Casey Neistat vakaları (haber/vaka çalışması kaynaklı)

**Zayıf / kullanırken dikkat**
- Kart/son ekran CTR sayıları (ajans blogları)
- Shorts→abone dönüşüm oranları (kendi içinde çelişkili SEO kaynakları)
- Faceless kanal istatistikleri (kaynak zinciri kapalı — "top 1000 kanalın %40'ı" iddiası **doğrulanmadı, kullanma**)
- Build-in-public MRR vakaları (Levels dışında doğrulanmadı)

**Bulunamayanlar**
- Ürün tanıtımı sonrası ölçülmüş izlenme/abone kaybı içeren spesifik creator vakası (Management Science'ın toplu bulgusu dışında)
- "Kaç abonede ürün tanıtımına başlanmalı" sorusuna cevap veren çalışma
- Erken ürün tanıtımının zararını ölçen çalışma
- Shorts → uygulama indirmesi dönüşüm verisi
- Açıklama linki / sabit yorum / topluluk gönderisi tıklama oranı verisi
- "Ürünle bir şey yapmak vs ürünü anlatmak" formatlarının doğrudan A/B karşılaştırması
- Fitness/tüketici nişinde build-in-public başarı vakası
- Creator ürün lansman haftası için doğrulanmış playbook
- Before/after görselleri için spesifik YouTube veya Apple maddesi
- YouTube'un "kendi ürününü tanıtma" durumuna dair açık politika cümlesi
