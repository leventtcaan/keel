# K2 — App Store'da Sıfırdan Keşfedilme ve Soğuk Başlangıç

> Araştırma tarihi: 2026-09-11 · Durum: **TAMAMLANDI**
> Bağlam: iOS-önce, ~sıfır bütçe, kitle yok, Health & Fitness, koçluk uygulaması,
> değer 4-8 haftada görünüyor. Kategoride ücretli reklam matematiksel zarar
> (CPI $4,30-5,50 vs LTV $1,21).
>
> **Kaynak etiketleri:**
> **[APPLE]** Apple resmi dokümanı · **[VERİ]** bağımsız/geniş örneklemli ölçüm ·
> **[VENDOR]** ASO aracı satan şirketin blogu (seçilim yanlılığı yüksek, satış amaçlı) ·
> **[VAKA]** tekil geliştirici vakası (n=1) · **[BULUNAMADI]** araştırıldı, kanıt yok

---
# BÖLÜM A — KEŞFEDİLME MEKANİĞİ

## A1 · App Store arama algoritması: gerçekte ne biliniyor?

**Önce dürüst çerçeve:** Apple sıralama algoritmasının ağırlıklarını **hiçbir zaman yayımlamadı**.
Ağırlık iddiası veren her kaynak — istisnasız — ASO aracı satan şirketlerin kendi gözlemleri
(veya pazarlaması). Aşağıda hangi sinyalin *var olduğu* ile hangi *ağırlığa sahip olduğu*
ayrı tutuldu. **Sayısal ağırlık dağılımı bulunamadı** ve veren kaynak varsa uydurmuştur.

Apple'ın kendi resmi ifadesi iki sinyal ailesi tanımlıyor **[APPLE]**:
- **Textual relevance** — metadata'nın aramaya semantik uyumu
- **Behavioral relevance** — kullanıcının arama sonucuyla ne yaptığı: tıklama, indirme,
  ve **indirme sonrası elde tutma**

### Sinyaller — var olma kanıtı ve güç tahmini

| Sinyal | Var mı? | Tahmini güç | Not |
| --- | --- | --- | --- |
| **Başlık (App Name, 30 kr)** | Evet, kesin | **En yüksek metin ağırlığı** | Tüm ASO kaynakları hemfikir; Apple doğrudan onaylamadı ama tartışma yok |
| **Alt başlık (Subtitle, 30 kr)** | Evet, kesin | İkinci en yüksek | Başlıkla eşit değil, yakın |
| **Keyword alanı (100 kr)** | Evet, kesin **[APPLE]** | Üçüncü | Kullanıcıya görünmez, sadece indekslenir |
| **İndirme hızı (velocity)** | Evet | Yüksek | "Kısa sürede çok indirme" güçlü sinyal **[VENDOR]** |
| **Elde tutma / retention** | Evet **[APPLE]** — "post-install retention" Apple'ın kendi behavioral relevance tanımında | Yüksek | Bizim için kritik: 4-8 haftalık değer gecikmesi burada **doğrudan** cezalandırılabilir |
| **Puan ortalaması** | Evet | Yüksek, **eşikli** | 4,0'ın altı görünürlük cezası; aşağıda A5 |
| **Puan sayısı** | Evet | Orta | Az puanlı bir uygulama yüksek ortalamayla da az güven sinyali üretir |
| **Arama sonucundan dönüşüm (tap→install)** | Evet | Yüksek | Ekran görüntüsü kalitesi buradan sıralamaya döner |
| **Ekran görüntüsü caption metni** | 2025 ortasından beri iddia ediliyor **[VENDOR]** | Bilinmiyor | Apple onaylamadı. **[BULUNAMADI]** — bağımsız doğrulama yok |
| **Güncelleme sıklığı** | Dolaylı | Düşük-orta | Doğrudan sıralama faktörü olduğuna dair Apple kanıtı yok; 2-4 haftada bir öneriliyor **[VENDOR]** |
| **Çökme oranı / performans** | Evet | Orta | Kötü performans görünürlük düşürüyor **[VENDOR]** |
| **In-App Events** | Evet, indeksleniyor **[APPLE]** | Düşük-orta | Ücretsiz görünürlük yüzeyi |
| **Kategori** | Evet | Yüksek (Top Charts için) | Health & Fitness sıralamaları ayrı bir keşif yüzeyi |

**Ana çıkarım:** 2026'da denge davranışsal sinyale kaydı. Keyword doldurma tek başına
"page one" getirmiyor; **indirme sonrası tutulma** artık kapıda duruyor. Bizim ürünümüz için
bu iyi bir haber değil — değer 4-8 haftada geliyor, ilk hafta silinme oranı yüksek olacak.
Bölüm B15 bunun çözümünü tartışıyor.

Kaynaklar:
- https://developer.apple.com/app-store/search/ (Apple, arama ve keşif)
- https://www.apptweak.com/en/aso-blog/app-store-ranking-factors
- https://appradar.com/academy/app-store-ranking-factors
- https://respectlytics.com/blog/app-store-ranking-factors-2026/

---

## A2 · Anahtar kelime stratejisi: üç alan, üç iş

### Alanların mekaniği

| Alan | Karakter | Görünür mü? | İndeksleniyor mu? | Nasıl doldurulur |
| --- | --- | --- | --- | --- |
| **App Name** | 30 | Evet | Evet, en ağır | Marka + **1 güçlü keyword**. `MarkaAdı: kelime kelime` |
| **Subtitle** | 30 | Evet | Evet | Başlıkta olmayan 2-3 keyword + değer önerisi. İnsan cümlesi olmalı, robot listesi değil |
| **Keyword field** | 100 | Hayır | Evet | Virgülle ayrılmış **tekil kelimeler**, boşluksuz |
| **Promotional text** | 170 | Evet | **HAYIR** | İndekslenmiyor. Sadece dönüşüm için. Ama App Review'sız değiştirilebilir — tek esnek alan |
| **Description** | 4000 | Evet | **HAYIR** (iOS'ta) | Apple, Google Play'in aksine açıklamayı indekslemiyor. Sadece dönüşüm |
| **In-App Purchase adları** | 30 | Evet | Evet, düşük ağırlık | Bedava ekstra keyword alanı — çoğu geliştirici boşa harcıyor |
| **Developer adı** | — | Evet | Evet | Marka adında keyword taşıyabilir |

### 100 karakterlik alanın kuralları (uzlaşı, **[VENDOR]** ama tutarlı)
1. **Virgülden sonra boşluk yok.** `fitness,workout,plan` — her boşluk 1 karakter israfı.
2. **Çoğul yazma.** Apple tekil/çoğul eşleştirmesini kendi yapıyor.
3. **Başlık ve alt başlıkta geçen kelimeyi tekrarlama.** Apple kredi vermiyor — ziyan.
4. **Kelime öbeği yazma, tekil kelime yaz.** Apple kelimeleri kendi kombine ediyor:
   `home,workout,plan` girersen `home workout plan` sorgusuna girersin.
5. **Kategori adını yazma** (Health, Fitness) — zaten kategoriden indeksleniyorsun.
6. **"app", "free", "best" yazma** — Apple bunları zaten ekliyor / değersiz.
7. **Rakip marka adı yazma** — App Review reddi ve hukuki risk.

### Health & Fitness'ta doymuş vs. boş — somut
**Uyarı:** Aşağıdaki "doymuş/boş" ayrımı ASO araç bloglarının ortak gözlemi **[VENDOR]**.
Gerçek zorluk skorunu **kendi ürününle** ölçmelisin (A2-araç bölümü altında).

| Doymuş (indie için matematiksel olarak kayıp) | Neden |
| --- | --- |
| `workout` · `fitness` · `gym` · `calorie counter` · `running` · `weight loss` · `meditation` | Tek kelimelik head term. On binlerce uygulama. Zorluk skoru 67+ |
| `workout tracker` · `fitness app` · `diet plan` | İki kelimelik ama hâlâ head. MyFitnessPal/Strava/Nike sınıfı oyuncular tutuyor |

| Görece boş / kazanılabilir (3+ kelime, niyet yüksek) | Örnek desen |
| --- | --- |
| Ekipman-özel | `kettlebell workout log` · `dumbbell only program` · `resistance band plan` |
| Seviye-özel | `beginner strength program` · `first pull up plan` |
| Hedef-özel | `body recomposition tracker` · `progressive overload log` · `deload week planner` |
| Kısıt-özel | `home workout no equipment` · `15 minute strength` · `dorm room workout` |
| Yöntem-özel | `rpe training log` · `rir tracker` · `evidence based training` |
| Popülasyon-özel | `strength training for women beginners` · `student fitness plan` |

**Bizim ürünümüz için doğal aday havuzu** (koçluk + kanıt temelli + kişiselleştirme):
`coach`, `coaching`, `adaptive`, `progressive`, `overload`, `rpe`, `rir`, `hypertrophy`,
`recomposition`, `deload`, `autoregulation`, `evidence`, `science`, `macro`, `cut`, `bulk`,
`maintenance`, `plateau`, `program`, `periodization`. Bunlar **düşük hacimli ama düşük
rekabetli**; ilk 6 ay için doğru tabaka bu.

**Zorluk skoru kaba eşik [VENDOR]:** 0-33 kolay (indie kazanabilir) · 34-66 rekabetli ·
67-100 zor (yerleşikler tutuyor). **Bu skorlar araç şirketlerinin kendi modelleri, Apple verisi
değil** — mutlak sayı değil, sıralama aracı olarak kullan.

### Ücretsiz keyword araştırma yolu (sıfır bütçe)
1. **App Store arama otomatik tamamlama** — iPhone'da yaz, çıkan öneriler Apple'ın *gerçek*
   arama hacmi sıralaması. En dürüst ücretsiz sinyal, tool yok.
2. **Apple Search Ads Search Match / keyword öneri aracı** — kampanya *oluşturmadan*
   arama popülerlik skoru (5-100) görebiliyorsun. Hesap bedava, harcama zorunlu değil.
   Bu **Apple'ın kendi verisi** — en güvenilir ücretsiz kaynak.
3. Rakip başlık/alt başlıklarını elle topla; hangi kelimeleri kimse kullanmıyor onu ara.

Kaynaklar:
- https://www.mobileaction.co/blog/ios-keywords-field/
- https://www.applaunchflow.com/blog/app-store-keyword-field-guide-2026
- https://www.apptweak.com/en/aso-blog/app-store-keyword-research-aso
- https://semnexus.com/aso-for-fitness-apps-keyword-patterns-drive-category-rankings

---

## A3 · Apple Featured: başvuru mekanizması gerçek

**Evet, resmî bir başvuru formu var** ve ücretsiz **[APPLE]**. Kasım 2024'te açıldı.
App Store Connect → uygulaman → kenar çubuğu **Featuring → Nominations**.

| Konu | Gerçek **[APPLE]** |
| --- | --- |
| Kim gönderebilir | Account Holder, Admin, App Manager veya **Marketing** rolü |
| Nomination tipleri | **New Content** · **App Enhancements** · **App Launch** |
| Zorunlu alanlar | Ad · tip · detaylı açıklama · yayın tarihi (veya tarih aralığı) |
| Opsiyonel ama önemli | 5 adede kadar **destekleyici URL** (TestFlight linki dahil!) · erişilebilirlik ve kapsayıcılık detayı · öncelik seviyesi · ekibin/uygulamanın benzersiz yanı |
| **Minimum ön süre** | **3 hafta.** Apple "mümkün olduğunca erken" diyor |
| Nomination sayısı sınırı | Belirtilmemiş — pratikte sınırsız |
| Sonuç bildirimi | **Yok.** Sadece "Submitted" durumu. Featuring garantisi yok |
| Düzenleme | Gönderdikten sonra da düzenlenebilir (tip ve ilişkili uygulamalar hariç) |

### Editör ekibi neye bakıyor
Apple bunu bir puanlama listesi olarak yayımlamadı. Ekosistem uzlaşısı **[VENDOR]**,
Apple'ın kendi featuring rehberliğiyle tutarlı olarak:
1. **Tasarım kalitesi ve HIG uyumu** — jenerik şablon görünüm eliyor.
2. **Yeni Apple teknolojisi kullanımı** — SwiftUI, WidgetKit, App Intents, Live Activities,
   Apple Health entegrasyonu, Apple Watch, Dynamic Island. **Indie'nin en büyük kozu bu:**
   büyük şirketler yeni framework'leri geç adapte eder, sen 1. gün adapte edebilirsin.
3. **Erişilebilirlik** — VoiceOver, Dynamic Type, kontrast. Apple bunu formda ayrıca soruyor.
4. **Editoryal tema uyumu** — takvim: Ocak (New Year/health), Mayıs (Mental Health Month),
   Eylül (yeni iOS lansmanı), Kasım-Aralık (holiday). Health & Fitness için **Ocak**
   editoryal olarak en yoğun ve en rekabetli pencere.
5. **Hikâye** — "kim yaptı, neden yaptı". Indie kurucu hikâyesi burada avantaj.
6. **Teknik sağlamlık** — çökme yok, hızlı.
7. **Yerelleştirme** — çok dilli uygulamalar daha geniş vitrine girebiliyor.

### Featured olmanın ölçülmüş etkisi
**[BULUNAMADI] — 2025/2026 için güvenilir, geniş örneklemli bir "featuring lift" çalışması yok.**
Dolaşan sayılar (%100-%800 indirme artışı) tekil vaka anlatıları **[VAKA]** ve genellikle
ASO ajanslarının müşteri vitrinleri. Tutarlı olan tek nitel bulgu: **etki geçici** —
featuring penceresi boyunca (genelde 1-7 gün) sivri bir artış, sonra hızlı düşüş; kalıcı
etki ancak elde tutma iyiyse oluşuyor. Hevy örneği (K1) tam bunu gösteriyor: 2020 başında
Apple feature aldılar, ama COVID kapanmasıyla momentum kayboldu.

**Karar:** Featuring bir *bonus*, bir *plan* değil. Ama formu doldurmak **30 dakika ve bedava**.
Beklenen değeri düşük ama maliyeti de öyle. Yap.

Kaynak:
- https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/
- https://techcrunch.com/2024/11/13/apple-now-lets-app-developers-apply-to-be-featured-on-the-app-store
- https://asomobile.net/en/blog/featuring-in-the-app-store-a-detailed-guide-updated/

---

## A4 · Ekran görüntüsü ve önizleme videosu

### Mekanik (Apple, kesin)
- Arama sonuçlarında **ilk 1-3 görsel** satır içinde görünür — kullanıcı sayfaya *girmeden*.
  Yani ilk kare bir ürün fotoğrafı değil, **bir reklam kreatifi**.
- **Dikey (portrait) app preview video** varsa galeride **1. sırayı** alır: video + sonraki 2 görsel.
- **Yatay (landscape) app preview video** varsa arama sonucunda **yalnız o** görünür — 3 slot yerine
  1 büyük video. Riskli: tek karta indirgersin.
- 3 adede kadar app preview video, 10 adede kadar ekran görüntüsü.
- iOS 18+ ile Apple ekran görüntüsü gereksinimlerini sadeleştirdi (tek boyut seti yeterli).

### Ölçülmüş etki
| Bulgu | Kaynak / güven |
| --- | --- |
| Kreatif değişikliği içinde **ekran görüntüsü**, ikon/başlık/açıklama değişikliklerinin toplamından daha büyük dönüşüm deltası üretiyor | SplitMetrics, 1,5 milyar+ gösterim **[VENDOR, geniş örneklem]** |
| **Dikey** ekran görüntüleri vakaların ~%80'inde daha iyi dönüşüyor | Gummicube **[VENDOR]** |
| Kullanıcı görselden 50 ms'de karar veriyor | Google araştırması (genel web, uygulama-özel değil) **[ZAYIF transfer]** |
| İlk 2 görselin dönüşümün büyük kısmını taşıdığı | Tüm ASO kaynakları hemfikir, **kesin sayı [BULUNAMADI]** |

**Uygulanabilir kural seti (uzlaşı, çelişkisiz):**
1. **İlk 2 görsel = tüm mesaj.** Kullanıcıların çoğu kaydırmıyor. İlk ikisi tek başına
   "bu ne, bana ne katıyor" sorusunu cevaplamalı.
2. **Metin (caption) zorunlu.** Metinsiz ham UI ekran görüntüsü en kötü performans gösteren desen.
   Caption 3-5 kelime, fayda odaklı, **sıralamaya da girebilir** (2025 iddiası **[VENDOR]**).
3. **Dikey kullan.** Fitness uygulaması yatay değil.
4. **5-6 görsel yeterli.** 10 doldurmak fayda göstermiyor; ilk 3 kritik.
5. **Video opsiyonel ve pahalı.** Kanıt: video *her zaman* dönüşüm artırmıyor — bazı testlerde
   düşürüyor. Sıfır bütçeyle **önce görselleri çöz, videoyu sonra ekle.**

Bizim durumumuz: görsel üretimi **Codex/Antigravity'ye gider** (CLAUDE.md tool dağılımı).
Buradan çıkan tek şey brief.

Kaynaklar:
- https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots
- https://splitmetrics.com/blog/app-store-screenshots-aso-guide/
- https://semnexus.com/app-store-visual-hierarchy-screenshot-order-conversion
- https://www.gummicube.com/blog/are-landscape-or-portrait-screenshots-better-for-app-store-optimization/

---

## A5 · Puan ve yorum: eşikler, zamanlama, etik sınır

### Kaç puan gerekiyor?
**Sıralamaya girmek için bir "minimum puan sayısı" eşiği [BULUNAMADI]** — Apple böyle bir eşik
yayımlamadı, bağımsız ölçüm de yok. Pratikte gözlenen: **puan sayısı bir güven sinyali**,
sıralama kapısı değil. Ama dönüşümde belirleyici.

### Puan ortalamasının dönüşüme etkisi — ölçülmüş
| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| 4,5 yıldız vs 4,0 yıldız | **~%16 daha iyi dönüşüm** | Sektör analizi **[VENDOR]** |
| 4,5+ vs 4,0 altı | Kurulum dönüşümü **~2 katı** | **[VENDOR]** |
| **4,0 uçurumu** | 4,0 → 3,9 arası düşüş beklenen %2-3 değil, **%15-20** — doğrusal değil, eşikli | **[VENDOR, 2026]** |
| 3 yıldız → 4 yıldız | Dönüşümde **+%89** | Apptentive **[VENDOR]** |
| Kullanıcıların %79'u indirmeden önce puana bakıyor | — | Apptentive 2024 |
| %50 kullanıcı 3 yıldızlı uygulamayı **hiç değerlendirmiyor**; %85 iki yıldızlıyı; %96 dört yıldızlıyı değerlendiriyor | — | Apptentive |

**Not:** Bu sayıların hepsi puan-yönetimi yazılımı satan şirketlerden geliyor. Yön kesinlikle
doğru, büyüklük abartılı olabilir. Ama **4,0 eşiği** birden fazla bağımsız kaynakta çıkıyor —
buna güven. **Operasyonel kural: 4,0'ın altına asla düşme. 4,5 hedefle.**

### Puan isteme mekaniği — Apple'ın kesin kuralları **[APPLE]**
- `SKStoreReviewController` (modern: `requestReview(in:)`) — **365 günde en fazla 3 kez** gösterilir.
  Fazlası sessizce yok sayılır. Sen kaç kez çağırdığını **bilemezsin**; gösterilip
  gösterilmediğini de öğrenemezsin.
- Kullanıcı uygulamadan çıkmadan puan ve yorum yazabilir.
- **Puan ortalaması ülke bazlı** — ABD'deki puanın Almanya'daki sayfada görünmez.
- **Yeni sürümde puan sıfırlanabilir** (App Store Connect'te seçenek). Apple "az kullan" diyor.
  **Yazılı yorumlar sıfırlanmaz** — sadece ortalama sıfırlanır. Sıfır puanla başlamak da kötü.
- Geliştirici **her yoruma cevap yazabilir**; cevap sonrası kullanıcı bildirim alır ve
  **puanını güncelleyebilir**. → Bu en ucuz puan yükseltme kaldıracı. Kötü yorumu düzelt,
  kullanıcıya yaz, çoğu puanını yükseltiyor.

### Etik sınır — Apple'ın yazılı kuralı
- **3.2.2(x):** *"Apps must not force users to rate the app, review the app, download other apps,
  or other store-related actions in order to access functionality, content, or use of the app."*
  → Puan karşılığı özellik açmak **yasak**.
- **Developer Code of Conduct:** yorum manipülasyonu, ücretli/teşvikli/**filtrelenmiş**/sahte
  geri bildirim → **Apple Developer Program'dan atılma**.
- **"Filtered" kelimesi önemli.** Yaygın "pre-prompt" taktiği — önce uygulama içinde
  "Memnun musun?" diye sorup **sadece mutlu olanları** Apple prompt'una yönlendirmek —
  Apple'ın "filtered feedback" tanımına giriyor. ASO blogları bunu "0,5-1,0 yıldız kazandırır"
  diye pazarlıyor **[VENDOR]**; **bu gri alan, tavsiye etmiyorum.**
  Güvenli versiyonu: memnuniyetsiz kullanıcıya **ayrıca** destek kanalı sun, ama
  memnun olanı da Apple prompt'undan mahrum bırakma — yani **filtreleme yok, ek kanal var**.

### En iyi zamanlama — kanıt durumu
Kesin, deneysel kanıt **[BULUNAMADI]**. Uzlaşı desenleri:
- **Uygulama açılışında asla sorma.**
- **Pozitif bir eylemden hemen sonra** sor: bir hedefe ulaşma, bir seri tamamlama, bir PR kırma.
- **Kurulumdan en az 7 gün sonra** — dönen kullanıcıya sor.
- Sürüm başına en fazla 1 kez.
- Prompt'u tetiklemeden **2 saniye bekle** (kullanıcı bir animasyonun ortasındaysa kaçırıyor).

**Bizim ürünümüz için doğru an:** ilk ölçülebilir ilerleme anı — ör. 4. hafta "ilk kilo/güç
değişimin grafikte göründüğü" ekranı. Bu aynı zamanda ürünün değer teslim anı. Ondan **önce**
sormak 4,0'ın altına düşme riskidir.

Kaynaklar:
- https://developer.apple.com/app-store/ratings-and-reviews/
- https://developer.apple.com/documentation/storekit/skstorereviewcontroller
- https://developer.apple.com/app-store/review/guidelines/
- https://screenfast.app/blog/app-rating-impact-on-downloads
- https://www.appalize.com/da/blog/app-marketing/app-store-ratings-impact-on-downloads-data-driven-analysis

---

## A6 · Custom Product Pages (CPP) ve Product Page Optimization (PPO)

Her ikisi de **tamamen ücretsiz** ve Apple'ın kendi araçları **[APPLE]**.

### Custom Product Pages
| Özellik | Detay **[APPLE]** |
| --- | --- |
| Kaç adet | **70'e kadar** ek sayfa |
| Neyi değiştirebilirsin | Ekran görüntüleri · promosyon metni · app preview · **keyword** · deep link (iOS 18+) |
| Neyi **değiştiremezsin** | Uygulama adı, alt başlık, ikon, açıklama, fiyat |
| Erişim | `?customProductPageId=...` parametreli benzersiz URL |
| Arama sonucunda çıkar mı | **Evet** — CPP'ler arama sonuçlarında ve editoryal koleksiyonlarda görünebiliyor |
| İnceleme | Metadata App Review'den geçmeli, ama **uygulama güncellemesinden bağımsız** |

**Indie için değeri:** yüksek ve az kullanılıyor. Trafik kaynağı başına ayrı sayfa yapabilirsin:
YouTube linki → "video izleyicileri" sayfası; e-posta listesi → başka sayfa. Uygulama
güncellemesi göndermeden ekran görüntüsü değiştirebiliyorsun. **Bizim için: YouTube kanalından
gelen trafiğe özel bir CPP** neredeyse bedava bir dönüşüm kazancı.

### Product Page Optimization (A/B testi)
| Özellik | Detay **[APPLE]** |
| --- | --- |
| Kaç varyant | **3 alternatif treatment** + orijinal |
| Aynı anda kaç test | **1** |
| Test edilebilenler | **İkon · ekran görüntüleri · app preview video**. Başlık/alt başlık/açıklama **test edilemez** |
| Süre | En fazla **90 gün** |
| Trafik | Yüzdesini sen seçiyorsun; kullanıcı test boyunca **aynı varyantı** görüyor |
| Ne zaman karar | En az bir treatment **%90 güven** seviyesine ulaşınca |
| Maliyet | Ücretsiz |
| İnceleme | Alternatif metadata App Review'den geçmeli. Alternatif ikon **binary'nin içinde** olmalı |

**⚠️ Indie için kritik uyarı:** PPO **hacim istiyor**. Günde 1.000'den az ürün sayfası
görüntülemesi olan uygulamalarda ince bir farkı yakalamak **4-6 hafta** sürebiliyor; günde
10.000+ görüntülemede 7-14 gün yetiyor **[VENDOR]**. Biz sıfırdan başlıyoruz → **ilk 6 ay
PPO çalıştırmak anlamsız.** Testin istatistiksel gücü yok, gürültü okursun.

**Karar:**
- **CPP: gün 1'den kullan.** Bedava, hacim gerektirmiyor.
- **PPO: günlük ~500+ sayfa görüntülemesine ulaşana kadar erteleme listesinde.**

Kaynaklar:
- https://developer.apple.com/app-store/custom-product-pages/
- https://developer.apple.com/app-store/product-page-optimization/
- https://developer.apple.com/help/app-store-connect-analytics/acquisition/product-page-optimization/
- https://www.mobileaction.co/blog/product-page-optimization/

---

## A7 · Yerelleştirme: kaç dil, hangi pazar

### Pazar gerçeği
| Pazar | İndirme payı | Gelir payı | Not |
| --- | --- | --- | --- |
| **ABD** | ~%22,5 (6,8 mlr) | **Küresel App Store harcamasının ~%40-50'si** | Tek başına en büyük. Öncelik doğru |
| Çin | 4,2 mlr indirme | Büyük ama App Store Connect ayrı süreç, ICP kaydı gerekiyor | Indie için pratik değil |
| Japonya | Top 5 | **2. en büyük gelir pazarı**, indirme başına gelirde çok yüksek | Yüksek ROI, ama çeviri kalitesi zor |
| G. Kore, BK | Top 5 | ABD+JP+CN+KR+UK = **küresel gelirin ~%75'i** | |
| Hindistan, Brezilya, Endonezya | Çok yüksek indirme | Düşük ARPU | İndirme sayısı gelir demek değil |

### Yerelleştirmenin getirisi
Sıkça alıntılanan **"%128 daha fazla indirme"** rakamı eski bir Distomo/Localize çalışmasından
geliyor ve bugünkü App Store'a doğrudan taşınamaz **[VENDOR, eski]**. Yön doğru, büyüklük şüpheli.

**Ama bir mekanik gerçek var ve daha önemli:** App Store keyword alanı **dil başına ayrı**.
Yani her yeni yerelleştirme = **ek 100 karakter keyword alanı + ek 30 kr başlık + ek 30 kr alt
başlık**. Üstelik bazı diller aynı ülkede eşzamanlı indeksleniyor (ör. ABD'de
**English (U.S.)** ve **Spanish (Mexico)** ikisi de indeksleniyor → ABD'de keyword alanını
etkin olarak ikiye katlıyorsun). Bu, indie'nin bildiği en ucuz ASO hilesi.

### Sıfır bütçe için sıralama (öneri)
| Aşama | Diller | Gerekçe |
| --- | --- | --- |
| **Gün 1** | English (U.S.) **+ English (U.K.)** + **Spanish (Mexico)** | Üçü de ABD'de indeksleniyor → keyword alanı 3x. Metin çevirisi minimum |
| **3-6. ay** | Almanca, Fransızca, İspanyolca (İspanya), Portekizce (Brezilya) | Avrupa hacmi, düşük çeviri maliyeti |
| **PMF sonrası** | Japonca, Korece | En yüksek ARPU ama **kaliteli çeviri zorunlu** — kötü Japonca aktif zarar |
| Yapma | Çince (Basitleştirilmiş) | ICP kaydı, ayrı süreç, indie için erken |

**Kritik kural:** yerelleştirme = sadece metadata çevirisi olabilir (uygulama içi İngilizce
kalabilir) — Apple bunu yasaklamıyor, ama **kullanıcı beklentisi kırılırsa 1 yıldız yer**.
Sadece metadata çevirirsen ekran görüntülerinde bunu belli et.

Kaynaklar:
- https://www.apptweak.com/en/reports/app-downloads-by-country
- https://localizelistings.com/blog/12-highest-revenue-app-store-markets
- https://appdrift.co/blog/best-languages-app-localization
- https://theapplaunchpad.com/blog/app-store-localization/

---

## A8 · Apple Search Ads: gerçekten zarar mı?

### Sayılar (AppTweak, ~3.500 uygulama · 50.000 kampanya · 1 milyar $ harcama, 2025 verisi)
| Metrik | Health & Fitness, ABD |
| --- | --- |
| CPT (tıklama başı) | **$1,59** |
| CPI (kurulum başı) | **$3,83** |
| Dönüşüm oranı (tap→install) | %48 |

Diğer kaynaklar Health & Fitness CPI'ını **$2,00-$7,00** aralığında veriyor **[VENDOR]**.
Senin verdiğin $4,30-5,50 bu aralığın içinde — **tutarlı**.

### Matematik
Verilen LTV **$1,21**. CPI $3,83 alalım.
- **CAC/LTV = 3,17.** Sağlıklı eşik genelde **LTV/CAC ≥ 3** — yani hedefin **tersi** durumdayız:
  her kullanıcıda **~$2,62 zarar**, ve bu *kurulum* başına, *ödeyen kullanıcı* başına değil.
- Ödeyen kullanıcı başına bakarsak daha kötü: Health & Fitness'ta hard paywall
  indirme→ödeyen medyanı **%10,7**, freemium **%2,1** **[RevenueCat]**. Freemium'da
  ödeyen kullanıcı başına edinim maliyeti = $3,83 / 0,021 ≈ **$182**.
- **Sonuç: geniş keyword'lerde Apple Search Ads bu ürün için matematiksel olarak kayıp. Doğrulandı.**

### Marka koruma (brand defense) mantıklı mı?
**Şu an: hayır.** Gerekçe:
1. Marka koruma, **rakip senin marka adına teklif veriyorsa** anlamlı. Kimsenin bilmediği bir
   marka adına kimse teklif vermez. Rakip yok → korunacak bir şey yok.
2. **Kanibalizasyon:** marka aramanı zaten organik olarak %100'e yakın kazanıyorsun.
   Reklamla, bedava alacağın kurulumun parasını ödersin.
3. Marka kampanyalarının CPA'sı düşük ve ROAS'ı yüksek görünür — bu bir **ölçüm yanılsaması**,
   gerçek artımsal (incremental) değer değil. AppTweak bile bunu yazıyor.

**Ne zaman evet:** aylık marka aramanda anlamlı hacim oluştuğunda (App Store Connect'te
"Search term" verisinde marka adın görünmeye başladığında) **ve** o aramada rakip reklamı
gördüğünde. O gün günlük **$3-5** bütçeyle exact-match marka kampanyası aç. Ondan önce değil.

**Sıfır bütçeyle yine de Apple Ads hesabı aç:** kampanya çalıştırmadan **keyword popülerlik
skorlarını** görebiliyorsun — Apple'ın kendi arama hacmi verisi, bedava. Bu tek başına
ASO araçlarının aylık $50-100'lük abonelik değerinin büyük kısmını veriyor.

Kaynaklar:
- https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks
- https://adapty.io/blog/apple-ads-benchmarks-2026/
- https://www.apptweak.com/en/aso-blog/should-you-run-brand-defense-campaigns-in-apple-search-ads
- https://www.rocketshiphq.com/bid-competitor-keywords-apple-search-ads/
- https://www.revenuecat.com/state-of-subscription-apps

---

## A9 · Ocak etkisi: mevsimsellik ne kadar sert?

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Ocak 2025 küresel Health & Fitness indirmesi | **3,6 milyar** (iOS+Play), YoY +%6, Ocak 2022'den beri en yüksek | Sensor Tower |
| Ocak kurulumları H1 ortalamasına göre | **+%34** | Adjust |
| Şubat | Ocak'a göre **-%6** | Adjust |
| Nisan | **-%20** | Adjust |
| Mayıs | **-%44** | Adjust |
| En dip | **Kasım-Aralık** (tatil sezonu) | Apptweak / Sensor Tower |

**Yani evet, sert.** Ocak-Mayıs arası kabaca **2 kat** fark var. Bu iki şeyi aynı anda söylüyor:

**Ocak lehine:**
- Arama hacmi 2 katı → aynı sıralamada 2 katı indirme.
- Apple editoryal takvimi Ocak'ta Health & Fitness'a **koleksiyon açıyor** → featuring şansı en yüksek pencere.
- "New year" keyword'leri kısa süreli olarak açılıyor.

**Ocak aleyhine:**
- **Rekabet de 2 katı.** Bütçesi olan herkes o ay reklama basıyor; CPT'ler yükseliyor.
- **"Resolutioner" kullanıcısı en kötü kullanıcı.** Ocak kohortu en yüksek churn'e sahip
  (Health & Fitness aylık churn ~%9,2; Ocak kohortu bunun üstünde). Bizim ürünümüz
  **4-8 haftada** değer gösteriyor — Ocak kullanıcısının medyan ömrü bunun altında.
  Yani Ocak, **retention sinyalimizi bozar** ve retention artık bir sıralama faktörü (A1).
- Yeni bir uygulama Ocak'ta gürültünün içinde kaybolur.

### Lansman ayı seçimi ölçülmüş bir fark yaratıyor mu?
**Doğrudan bunu test eden çalışma [BULUNAMADI].** Ama mekanik çıkarım savunulabilir:

**Öneri: Ocak'ta lansman yapma. Ekim-Kasım'da lansman yap, Ocak'a hazır gir.**
Gerekçe:
1. Ekim-Kasım = en düşük rekabet, en ucuz öğrenme. Hatalarını kimse görmüyorken yap.
2. Ocak'a girerken elinde: puan sayısı, keyword sıralaması, düzeltilmiş onboarding, gerçek
   retention verisi olur. Ocak dalgası **var olan** sıralamanı çarpar; yoktan sıralama yaratmaz.
3. Featuring nomination'ı Ocak koleksiyonu için **3 hafta önceden** (yani en geç Aralık başı)
   gönderirsin — ama ancak canlı ve puanlı bir uygulaman varsa şansın olur.

Kaynaklar:
- https://sensortower.com/blog/state-of-mobile-health-and-fitness-in-2025
- https://www.adjust.com/blog/health-tracker-installs-and-retention-data/
- https://www.apptweak.com/en/reports/most-downloaded-health-fitness-apps
- https://retentioncheck.com/churn-benchmarks/fitness-apps

---

# BÖLÜM B — SOĞUK BAŞLANGIÇ

## B10 · İlk 100 gerçek kullanıcı

### Önce taban çizgisi: hiçbir şey yapmazsan ne olur?
| Vaka | Sonuç |
| --- | --- |
| Indie geliştirici, ilk ay, pazarlama yok | **4.000 gösterim → 185 sayfa görüntüleme → 38 indirme** **[VAKA]** |
| Başka bir indie uygulama, ilk ay | **693 gösterim** **[VAKA]** |
| Hevy (K1), lansman sonrası | **günde 5-10 indirme**, temel ASO ile **[VAKA]** |

**Yani "sadece yayınla" = ayda ~30-50 indirme.** 100 kullanıcıya 2-3 ayda ulaşırsın ve hiçbiri
ürününü umursamayan tesadüfi indirmeler olur. Bu taban çizgisi kabul edilemez değil ama
**öğrenme hızı sıfır**. Soğuk başlangıcın amacı indirme sayısı değil, **konuşabileceğin
100 kişi** bulmak.

### Kanal envanteri — getiri ve maliyet
| Taktik | Ölçülmüş getiri | Maliyet | Bizim için |
| --- | --- | --- | --- |
| **Kişisel ağ + doğrudan davet** | Tek sayı yok, ama her indie vakasında ilk 10-30 kullanıcı buradan | Saatler | **Zorunlu ilk adım** |
| **Niş topluluk (Discord / Facebook grubu / forum)** | Ürün-topluluk uyumu varsa **en yüksek dönüşüm oranlı kanal**; hacim düşük **[VENDOR uzlaşısı]** | Haftalar, itibar gerekiyor | **En yüksek beklenen değer**. Fitness Discord'ları, üniversite spor kulüpleri, salon toplulukları |
| **Product Hunt** | #1-3: **5.000-15.000 ziyaret → 100-400 kayıt**. #4-10: 1.000-3.000 ziyaret → 30-100. #11-30: 300-700 ziyaret → 10-30. #31+: <300 ziyaret. Top-3 için **400+ upvote**, çoğu ilk 4 saatte | 1 gün + hazırlık haftası | **Orta**. Kitlesiz top-3 olmak zor. #11-30 gerçekçi → ~20 kullanıcı |
| **Hacker News (Show HN)** | Başarılı gönderi **3.500-43.000 ziyaret**; ama **~%90 gönderi hiç öne çıkmıyor** | 1 saat | **Düşük-orta**. Kitle geliştirici, fitness tüketicisi değil. Ama "kanıt temelli koçluk motoru" teknik hikâyesi HN'de tutabilir |
| **Indie Hackers** | Hacim düşük, dönüşüm HN'den yüksek **[VENDOR]** | Saatler | Düşük. Kitle yanlış |
| **X / build-in-public** | Pieter Levels sınıfı vakalar var ama **hayatta kalan yanlılığı**. Uyarı net: *"Your build-in-public audience is not your market"* — takipçi kitlesi geliştirici, müşteri değil | Aylar, sürekli | **Düşük**. Bizim durumumuzda YouTube zaten var, X'e ayrıca yatırım yapma |
| **Mevcut YouTube Shorts kanalı (~27K)** | — | Zaten var | **En büyük tek kaldıraç.** Bkz. aşağı |
| **App Store organik (ASO)** | Yavaş ama bileşik. Hevy: 3 yılda 1M | Sürekli | Uzun vade motoru |

### ⚠️ Bizim durumumuzun görülmeyen varlığı: **~27K abonelik Shorts kanalı**
Görev tanımı "kitle yok" diyor ama CLAUDE.md'ye göre **27K abonelik bir Shorts kanalı var.**
Bu, çoğu indie'nin sahip olmadığı bir şey. Kritik soru: **o kitle Türkçe ve bu uygulama
İngilizce/global mi?** Eğer öyleyse doğrudan taşınmaz — ama:
- **İlk 100 beta kullanıcısı için fazlasıyla yeterli.** Beta'nın dili sorun değil; sinyal
  toplamak için 27K'dan %0,4 dönüşüm bile 100 kişi demek.
- ASO/App Store sıralaması **ülke bazlı**. Türkiye'den gelen indirme dalgası **Türkiye
  App Store'unda** sıralama yaratır, ABD'de değil. Bunu bilerek kullan: Türkiye'de
  kategori sıralamasına girmek, ilk puanları toplamak ve **sosyal kanıt** üretmek için iyi.
- Ama **ABD sıralaması için ABD'li kullanıcı gerekiyor.** İki kohortu karıştırma.

### Somut ilk-100 planı (öncelik sırası)
1. **20-30 kişi: doğrudan davet.** Tanıdıkların, spor yapan arkadaşların. Konuşabileceğin kişiler.
2. **30-40 kişi: Shorts kanalı.** Tek bir video/community post → TestFlight public link.
3. **10-20 kişi: 2-3 niş topluluk.** Katılıp 2-4 hafta gerçekten katkı ver, sonra paylaş.
   Spam atarsan atılırsın ve kanal kapanır.
4. **10-20 kişi: Product Hunt + Show HN** lansman günü.
5. Kalan: organik App Store.

Kaynaklar:
- https://hub.causo.ai/guides/product-hunt-traffic-data-2026
- https://www.shno.co/marketing-statistics/product-hunt-launch-statistics
- https://syften.com/blog/hacker-news-marketing/
- https://superframeworks.com/articles/build-in-public-audience-is-not-your-market
- https://medium.com/@1qazster/can-indie-developers-still-make-money-i-tested-it-with-my-own-app-3340251320dd

---

## B11 · TestFlight: sınırlar ve strateji

### Sınırlar (Apple, kesin) **[APPLE]**
| Sınır | Değer |
| --- | --- |
| **Harici (external) test kullanıcısı** | **10.000** |
| **Dahili (internal) test kullanıcısı** | **100** (App Store Connect kullanıcısı olmak zorunda, incelemesiz anında build alır) |
| Test kullanıcısı başına cihaz | 30 |
| Aynı anda aktif build | 100 |
| **Build ömrü** | **90 gün** — sonra tester uygulamayı açamaz. Uzatılamaz, yeni build yüklemen gerekir |
| Public link kapasitesi | 10.000 |
| **Beta App Review** | Her **yeni sürümün ilk build'i** harici teste çıkmadan önce incelemeden geçmeli. Aynı sürüm numarası altındaki sonraki build'ler genelde incelemesiz geçer |

**Pratik sonuç:** 90 günlük build ömrü, uzun beta için **her ~3 ayda bir build yüklemek zorunda
olduğun** anlamına geliyor. Bizim 4-8 haftalık değer penceremiz bunun içinde — ama 12 haftalık
bir beta yürütürsen ortada build yenilemen gerekir.

### Beta stratejisi — indie için doğru boyut
10.000 kişilik kapasite bir tuzak. Kanıt: iyi yönetilen, **elle seçilmiş** beta programları
**%90+ katılım** görüyor; açık public link betaları çok daha düşük **[VENDOR]**.
Beta uygulamalarında beklenen retention: **1. hafta ~%30, 1. ay ~%20** **[VENDOR]** —
yani 100 kişiyle başlarsan 30 gün sonra elinde ~20 aktif kişi kalır.

**Doğru boyut: 30-80 elle seçilmiş kişi.** Gerekçe:
- 100 kişiden fazlasıyla **birebir konuşamazsın**; birebir konuşamıyorsan beta'nın amacı yok.
- Beta'nın çıktısı "bug listesi" değil, **hangi kullanıcı neden bıraktı** bilgisi.

### Beta → üretim geçiş oranı
**[BULUNAMADI]** — TestFlight beta kullanıcısının üretime/ödemeye geçiş oranı için
kamuya açık bir benchmark yok. Bu metrik şirket-içi kalıyor. **Kendi sayını üretmen gerekecek.**

Kaynaklar:
- https://developer.apple.com/testflight/
- https://www.centercode.com/blog/dont-need-10000-beta-testers
- https://betadrop.app/blog/what-is-testflight-public-link/

---

## B12 · Bekleme listesi (waitlist)

| Metrik | Değer | Kaynak |
| --- | --- | --- |
| Waitlist → **ödeyen** kullanıcı | **%5-25**, medyan ~%20 **eğer 1 aydan kısa sürede aktive edersen** | **[VENDOR]** |
| 3 aydan uzun beklerse | **%10'un altına** düşüyor | **[VENDOR]** |
| Landing page → waitlist kaydı (soğuk trafik) | Tüketici uygulaması ~%4,1 · SaaS ~%3,4 | **[VENDOR]** |
| Landing page → kayıt (**sıcak** trafik: kendi kitlen, bülten) | **%15-35** | **[VENDOR]** |
| Ortalama waitlist dönüşümü (genel) | %13,3 | **[VENDOR]** |
| Çift taraflı ödül (hem davet eden hem edilen) | Referans katılımını **+%29** | **[VENDOR]** |
| Kademeli ödül vs sabit ödül | **+%27 referans** | **[VENDOR]** |
| Optimal ön-lansman süresi | **8-16 hafta.** <4 hafta referans döngüsü çalışmıyor; >6 ay heves ölüyor | **[VENDOR]** |

**Not:** Bu sayıların tamamı waitlist yazılımı satan şirketlerden (LaunchList, Waitlister,
GetWaitlist). Seçilim yanlılığı yüksek — bu araçları kullanan projeler zaten organize projeler.
Yön güvenilir, mutlak değerler abartılı.

### İşe yarıyor mu — dürüst cevap
**Kitlen varsa evet, yoksa hayır.** Waitlist bir **trafik dönüştürücü**, trafik üretici değil.
Sıcak trafikte %15-35, soğuk trafikte %4. Yani waitlist'in değeri **tamamen üstüne akıttığın
trafiğe bağlı**.

**Bizim için:** Shorts kanalı sıcak trafik. Waitlist mantıklı. Ama **kritik kural: bekletme.**
Veri, 1 aydan uzun bekletmenin dönüşümü yarıya indirdiğini söylüyor. Yani waitlist açtığın gün
TestFlight'ı da açık tut — "waitlist" sadece bir sıraya sokma değil, **kademeli davet** olsun.

### Etkili mekanikler
- **Sıra numarası göster** (Robinhood modeli) — davet edince yukarı çık.
- **Çift taraflı ödül** (+%29): davet eden 1 ay ücretsiz, davet edilen sıra atlıyor.
- **Kademeli ödül** (+%27): 3 davet = X, 10 davet = Y.
- ⚠️ **Ödülü App Store puanına bağlama** — Apple yasağı (bkz. B14).

Kaynaklar:
- https://getlaunchlist.com/tools/waitlist-benchmark
- https://waitlister.me/growth-hub/blog/waitlist-and-product-launch-statistics
- https://getwaitlist.com/blog/waitlist-benchmarks-conversion-rates
- https://speedrun.substack.com/p/the-growth-meta-how-to-build-a-waitlist

---

## B13 · Product Hunt / HN / Indie Hackers / X — 2026'da hâlâ işe yarıyor mu?

### Product Hunt
**Kısa cevap: evet ama beklediğinden çok daha az.**

| Sıralama | Ziyaret | Kayıt |
| --- | --- | --- |
| #1-3 | 5.000-15.000 | 100-400 |
| #4-10 | 1.000-3.000 | 30-100 |
| #11-30 | 300-700 | 10-30 |
| #31+ | <300 | <10 |

- Top-3 için **400+ upvote**, çoğu **ilk 4 saatte** gelmeli. 2023 algoritma değişikliğinden
  sonra ham oy sayısı yetmiyor — **hız ve hesap kalitesi** sayılıyor.
- Trafiğin **%60'ı 0. günde**, %25'i 1-7. gün, %15'i 8-30. gün. SEO kuyruğu sadece top-3'e.
- Tüketici uygulamasında ziyaret→kayıt dönüşümü **%2-4**.
- **En sert bulgu:** OpenHunts 2024 anketinde **kurucuların %89'u "tekrar Product Hunt'ta
  lansman yapmam" demiş** — ama aynı anda SEO backlink ve güvenilirlik rozetinin değerli
  olduğunu kabul ediyorlar. **[VENDOR anketi, örneklem belirsiz]**
- 2026'da yatırımcı gözünde "#1 on Product Hunt" **aktivasyon sayısı olmadan negatif sinyal**.

**Karar:** Yap, ama **beklentini #11-30 → ~20 kayıt** olarak ayarla. Değeri kayıtta değil,
**backlink + bir kereye mahsus dikkat + lansman gününe yoğunluk katmakta**.

### Hacker News (Show HN)
- Başarılı gönderi **3.500-43.000 ziyaret**; #1 olursa günde 10.000+.
- **~%90 gönderi hiç öne çıkmıyor.** Yüksek varyans, sıfır maliyet.
- Kitle geliştirici → **fitness tüketici uygulaması için yanlış kitle**.
- **Ama:** "kanıt temelli antrenman motorunu nasıl yazdım" gibi **teknik/bilimsel** bir açı
  HN'de tutabilir. Uygulamayı değil, **mühendisliği** anlat.
- Maliyet: 1 saat. Beklenen değer düşük ama pozitif. Yap.

### Indie Hackers
Kitle yanlış (kurucu/geliştirici), hacim düşük. **Atla** — sadece feedback almak için kullan.

### X / build-in-public
- Hayatta kalan yanlılığı yüksek. Levels/Postma sınıfı örnekler istisna.
- En dürüst uyarı: *"An audience claps, a market pays, and they almost never sit in the
  same room."* — build-in-public takipçileri geliştirici, senin müşterin değil.
- Sürekli emek istiyor ve **ürün çalışmasından çalıyor**.
- **Bizim için: hayır.** YouTube zaten var ve o kitle *gerçek hedef kitleye daha yakın*.
  İki içerik kanalı birden yürütmek 4 kişilik yurt odasında imkânsız.

Kaynaklar:
- https://hub.causo.ai/guides/product-hunt-traffic-data-2026
- https://www.shno.co/marketing-statistics/product-hunt-launch-statistics
- https://www.analook.com/blog/product-hunt-launch-strategy.html
- https://www.stackmatix.com/blog/launching-on-hacker-news
- https://www.indiehackers.com/post/your-build-in-public-audience-is-not-your-market-i-learned-the-difference-the-slow-way-2cbea1089d

---

## B14 · İlk 10-50 puanı toplamak

### Etik sınır — kesin çizgi
| Yapılabilir | Yasak |
| --- | --- |
| Uygulama içinde `requestReview` ile sorma (yılda 3x) | Puan karşılığı özellik/içerik/indirim vermek → **uygulama kaldırılır** (Guideline 3.2.2x) |
| Beta kullanıcılarına **e-posta ile** "beğendiysen puan verir misin" demek | Sahte/satın alınmış puan → **Developer Program'dan atılma** |
| Kötü yoruma cevap yazıp sorunu çözmek, kullanıcıyı puanını güncellemeye davet etmek | **Filtrelenmiş** geri bildirim (sadece mutlu kullanıcıyı Apple prompt'una yönlendirmek) — Apple'ın yasak listesinde "filtered" kelimesi geçiyor |
| Puanın *ne işe yaradığını* dürüstçe açıklamak ("indie'yim, puan görünürlüğüm demek") | Puan istemeyi işlevin önüne koymak |

**Gri alan uyarısı:** "pre-prompt / happiness check" deseni ASO blogları tarafından yaygın
tavsiye ediliyor ve çoğu büyük uygulama yapıyor. Apple bunu **yaptırım olarak** nadiren
kovalıyor ama **yazılı kural buna karşı**. Kendi kararın; ben tavsiye etmiyorum. Uygulaman
zaten iyiyse gerekmiyor.

### İlk puanları toplamanın gerçek yolu (sırayla)
1. **Beta kullanıcılarına lansman günü kişisel e-posta.** Bu en verimli kanal — 50 kişilik
   iyi bir betadan **10-20 puan** çıkar. TestFlight kullanıcısı App Store'da puan **veremez**
   (TestFlight'tan puanlama App Store'a gitmiyor), o yüzden **üretim sürümünü indirmelerini
   ayrıca istemen gerekiyor.** Bu adımı unutan çok geliştirici var.
2. **Doğru anda in-app prompt.** Yılda 3 hakkın var — israf etme. Değer teslim anına bağla.
3. **Her yoruma cevap yaz.** Apple cevap sonrası kullanıcıya bildirim gönderiyor ve kullanıcı
   puanını güncelleyebiliyor. Tek başına en yüksek ROI'li puan taktiği, ve %100 kurallara uygun.
4. **Puanı sıfırlama.** Yeni sürümde ortalamayı sıfırlama seçeneği var ama az puanla başlamak
   dönüşümü öldürüyor (A5). Sadece ortalama 3,x'e düştüyse ve büyük bir düzeltme yaptıysan.

**Hedef:** ilk 90 günde **4,5+ ortalama, 25-50 puan**. 4,0'ın altına düşersen dur ve ürünü düzelt.

Kaynaklar:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/ratings-and-reviews/
- https://storelit.co/blog/how-to-get-more-app-store-reviews

---

## B15 · BİZE ÖZEL PROBLEM: 4-8 haftalık değer gecikmesi

### Sorunun büyüklüğü
| Gerçek | Sonuç |
| --- | --- |
| Health & Fitness aktivasyon: 1. günde %26, 28. günde **%10** **[Adjust]** | Kullanıcıların %90'ı bizim değer anımıza **hiç ulaşmıyor** |
| Health & Fitness 30. gün retention ~%3 (2023) **[Adjust]** | Kohortun %97'si gitmiş |
| Health & Fitness aylık churn ~%9,2 **[VENDOR]** | |
| Apple'ın behavioral relevance'ı **post-install retention** içeriyor **[APPLE]** | Düşük retention → düşük sıralama → daha az indirme. **Kısır döngü** |
| Yıllık aboneliklerin ~%30'u ilk ayda iptal ediliyor **[RevenueCat]** | |

**Yani problem sadece "beta kullanıcısı bekler mi" değil. Problem şu: App Store algoritması
4-8 haftalık değer gecikmesini aktif olarak cezalandırıyor.**

### Beta kullanıcısı 4-8 hafta bekler mi?
Beta retention beklentisi: 1. hafta ~%30, 1. ay ~%20 **[VENDOR]**. Yani **hayır, çoğu beklemez.**
100 kişiyle başlarsan 8. haftada ~15 kişi kalır. Bu bir başarısızlık değil — **planlanması
gereken bir gerçek**. 8 haftalık sinyal için 15 kişi istiyorsan **80-100 ile başla**.

### Çözüm mimarisi: değeri parçala, ölçümü öne al

**1 · Değer merdiveni kur — 4-8 hafta tek bir uçurum olmasın.**
| Zaman | Teslim edilen değer | Neden işe yarıyor |
| --- | --- | --- |
| **0-5 dk** | Kişiselleştirilmiş plan çıktısı. "Senin durumunda şu, çünkü şu." | Duolingo deseni: hedef belirle (15sn) → test (30sn) → ilk dersi bitir. Anlık sahiplik hissi |
| **1. gün** | İlk antrenman/öğün tamamlandı, sistem bir şey *öğrendi* ve bunu **gösterdi** | "Ürün beni tanıyor" sinyali |
| **1. hafta** | İlk uyarlama: sistem planı **değiştirdi** ve nedenini söyledi | Koçluk hissi burada doğuyor, sonuçta değil |
| **2-3. hafta** | İlk ölçülebilir alt-metrik (hacim artışı, tutarlılık serisi, RPE düşüşü) | Sonuç değil ama **öncü gösterge** |
| **4-8. hafta** | Gerçek çıktı (güç/kompozisyon değişimi) | Asıl değer |

**Anahtar fikir:** 4-8 hafta *sonucun* geldiği süre; *koçluk hissinin* gelmesi 1 hafta olmalı.
Kullanıcı sonucu beklemiyor — **ilerlediğine dair kanıtı** bekliyor. Bunlar farklı şeyler.

**2 · Öncü gösterge (leading indicator) ile ölç, sonucu bekleme.**
Beta'da ölçülecek şey "8 haftada kaç kişi kilo verdi" değil. Ölçülecekler:
| Metrik | Neden |
| --- | --- |
| **Time to first value** — ilk anlamlı çıktıya kadar geçen süre | Aktivasyon |
| **Time to core value** — alışkanlık davranışının ilk tekrarı | Alışkanlık başlangıcı |
| **Stickiness / haftalık tekrar oranı** — hedef davranışı yapan kullanıcı yüzdesi | Uzun retention'ın en güçlü öncü göstergesi |
| **2. hafta retention** | 8. hafta retention'ın proxy'si. 8 hafta bekleyemezsin |
| **"Sistem planımı değiştirdi" anını gören kullanıcı %'si** | Bizim ürünümüzün asıl vaadi |

**3 · Bağlılık aracı (commitment device) kur.**
Kanıt zayıf ama yön tutarlı: sembolik bile olsa bir "yatırım" hissi olan yüksek niyetli
kullanıcılar daha uzun kalıyor **[VENDOR]**. Uygulanabilir versiyonlar:
- Beta'ya **başvuru formu** koy (herkes giremesin). Seçilmiş olmak bir yatırımdır.
- Beta kullanıcısına **8 haftalık bir taahhüt** açıkça sor: "bu 8 haftalık bir deney,
  haftada 1 kısa anket". Reddedenleri en baştan ele.
- **Ücretsizliği geçici yap** — "beta bitince ömür boyu %50" gibi bir kazanılmış hak.

**4 · Kohortu doğru seç.** Whoop dersi: Will Ahmed ilk 100 kullanıcıyı **performans
sporcularından** seçti — antrenörler aracılığıyla. Oura biyohacker'ları çekti. Ortak nokta:
**zaten uzun vadeli ölçüm yapan, sabırlı, veriyi seven insanlar.** Bunlar 8 hafta bekler.
Ocak resolutioner'ı beklemez.
→ **Bizim beta kohortumuz: zaten antrenman defteri tutan, kendi verisini seven, program
takip eden insanlar.** Yeni başlayanla beta yapma — beta'yı yeni başlayan için *tasarla*,
ama **test etmeyi ileri kullanıcıyla yap**.

**5 · Lansman kohortunu betadan ayır.** Beta 8 hafta sürer, lansman ondan sonra olur.
Yani beta bir *ön koşul*, lansmanın parçası değil. Beta bittiğinde elinde: düzeltilmiş
onboarding, 8 haftalık gerçek retention eğrisi, 15-20 gerçek savunucu ve **ilk puanların
kaynağı** olur.

### Benzer ürünler ne yapmış — özet
| Ürün | Uzun değer gecikmesi çözümü |
| --- | --- |
| **Whoop** | Değeri günlük "recovery score"a indirgedi — asıl fayda aylar sonra ama **her sabah bir sayı** var. İlk 100 kullanıcı: antrenörler üzerinden elit sporcular |
| **Oura** | Aynı desen: gecelik "sleep score". Kickstarter ile ön-satış → 15 saatte $100K. **Ödeme = bağlılık aracı** |
| **Duolingo** | Değeri **günlük derse** ve seriye (streak) indirgedi. Dil öğrenmek yıllar sürer; ürün her gün bir "kazanma" veriyor |
| **Terapi uygulamaları** | Aynı: seans/egzersiz tamamlama ve mood grafiği — sonucu değil **ilerlemeyi** görünür kılıyor |

**Ortak mekanizma ve bizim için tek cümlelik ders:**
**Uzun değer gecikmesini "bekleme" ile değil, "günlük/haftalık ölçülebilir bir skor" ile
çözüyorlar. Ürün, sonucu beklerken izlenecek bir şey vermeli.**

Kaynaklar:
- https://www.adjust.com/blog/health-tracker-installs-and-retention-data/
- https://www.revenuecat.com/blog/growth/pre-product-market-fit-metrics
- https://ringingthebell.substack.com/p/whoop-vs-oura-the-10-billion-question
- https://www.revenuecat.com/state-of-subscription-apps
- https://retentioncheck.com/churn-benchmarks/fitness-apps

---

# BÖLÜM C — ÖLÇÜM

## C16 · Hangi metrikler, hangi eşikler

### Huni ve her katmanın anlamı
```
Gösterim (Impression)      → App Store'da göründün mü?          [ASO / keyword sıralaması]
    ↓
Ürün sayfası görüntüleme   → Tıklandı mı?                       [ikon + başlık + ilk görsel]
    ↓
İndirme (Download)         → Sayfa ikna etti mi?                [ekran görüntüleri + puan]
    ↓
Aktivasyon                 → İlk değeri gördü mü?               [onboarding]
    ↓
2. hafta retention         → Geri geldi mi?                     [ürün]
    ↓
Ödeme                      → Değer parayı hak etti mi?          [paywall + gerçek değer]
```
**Her katmanda ayrı teşhis var.** Sadece "indirme" izlersen hangi katmanın kırık olduğunu bilemezsin.

### Gerçekçi hedefler — indie, kitlesiz, Health & Fitness
⚠️ Bu eşikler literatürden **türetilmiş tahminler**, doğrudan ölçülmüş bir "indie benchmark
tablosu" **[BULUNAMADI]**. Karar aracı olarak kullan, kanıt olarak değil.

| Dönem | Metrik | "Kötü" | "Normal" | "İşliyor" |
| --- | --- | --- | --- | --- |
| **1. hafta** | Toplam indirme | <30 | 50-150 | 300+ |
| | Puan sayısı | 0 | 3-10 | 15+ |
| | Puan ortalaması | <4,0 | 4,0-4,4 | 4,5+ |
| | Çökme oranı | >%1 | %0,5-1 | <%0,5 |
| | Gösterim→sayfa (tap-through) | <%2 | %2-5 | %5+ |
| | Sayfa→indirme (dönüşüm) | <%15 | %20-30 | %35+ |
| **1. ay** | Toplam indirme | <100 | 200-600 | 1.000+ |
| | 1. gün retention | <%20 | %25-30 | %40+ |
| | 7. gün retention | <%8 | %10-15 | %20+ |
| | Aktivasyon (ilk plan tamamlandı) | <%25 | %30-45 | %55+ |
| | Puan sayısı | <10 | 20-40 | 60+ |
| | En az 1 keyword'de ilk 10 | Hayır | 1-2 keyword | 5+ keyword |
| **1. çeyrek** | Aylık indirme (organik) | Düşüyor | Düz | **Aydan aya artıyor** |
| | 30. gün retention | <%3 | %5-8 | %12+ |
| | 8. haftada hâlâ aktif kullanıcı | <%2 | %3-6 | %10+ |
| | İndirme→ödeyen dönüşüm | <%1 | %2-4 (freemium) | %8+ (hard paywall medyanı %10,7) |
| | Ücretsiz→ücretli deneme dönüşümü | — | — | Kendi taban çizgini kur |

**Referans noktaları [gerçek veri]:**
- Health & Fitness 30. gün retention sektör medyanı **~%3** (2023, Adjust) — yani %5 bile
  ortalamanın üstü.
- Health & Fitness aktivasyon: 1. günde %26, 28. günde %10 (Adjust).
- İndirme→ödeyen medyanı: hard paywall **%10,7**, freemium **%2,1** (RevenueCat).
- Health & Fitness yıllık aboneliklerin ~%30'u **ilk ayda** iptal (RevenueCat).
- Health & Fitness D60 revenue-per-install **$0,66** — kategoriler arası en yüksekler arasında.

### Tek bir "işliyor mu" testi
Eğer 90 günün sonunda **organik indirmelerin aydan aya artıyorsa ve 30. gün retention %5'in
üstündeyse**, motor çalışıyor. Bu ikisinden biri yoksa daha fazla trafik almanın anlamı yok —
kova delik.

---

## C17 · Ücretsiz analytics: ne var, ne yok

### App Store Connect'in kendi verisi (App Analytics)
**Veriyor [APPLE]:**
- Gösterim, ürün sayfası görüntüleme, indirme, redownload — **kaynak bazında** (App Store Search,
  App Store Browse, Web Referrer, App Referrer)
- **Arama terimleri** (hangi kelimeyle bulundun) — 2024'ten beri geniş
- Retention (peer group karşılaştırmalı), çökme oranı
- 2026'da eklenen **100+ metrik**: In-App Purchase ve abonelik verisi, teklif performansı
- **Kohort analizi**: indirme tarihi, indirme kaynağı, teklif başlangıç tarihine göre
- **Peer group benchmark** — kendi kategorinde nerede olduğun (dönüşüm, retention, çökme,
  download-to-paid, proceeds per download). **Bu özellik indie için çok değerli ve bedava.**

**Vermiyor / kısıtlı:**
- ⚠️ **En büyük kısıt: App Analytics sadece "Share App Analytics" seçeneğini açan kullanıcıları
  görüyor — kullanıcı tabanının tahminen %20-30'u** **[VENDOR tahmini, Apple resmi oran
  yayımlamıyor]**. Yani retention sayıların bir örneklem, tam sayım değil.
- Uygulama **içi** davranış: onboarding adımları, paywall görüntüleme, nerede takıldığı — **hiç yok**
- Trial→paid dönüşümünün mekaniği, fiyat/paketleme tepkileri
- Cihazlar arası, kanallar arası (web/e-posta/CRM) yolculuk
- Bireysel kullanıcı düzeyi hiçbir şey
- Veri gecikmeli (genelde 1-2 gün, bazen daha fazla)

**Özet: App Store Connect sana *sonucu* söyler, *mekanizmayı* söylemez.**

### Ücretsiz tamamlayıcılar
| Araç | Ücretsiz sınır | Ne veriyor | Not |
| --- | --- | --- | --- |
| **RevenueCat** | **Aylık $2.500 gelire kadar ücretsiz** | Abonelik altyapısı + kohort, LTV, churn, trial dönüşümü, paywall A/B | **Bizim durumumuz için doğru seçim.** Abonelik kodunu kendin yazma |
| **TelemetryDeck** | Ayda 100K sinyal (eski sınır 50K) | Gizlilik-öncelikli uygulama içi olay analizi. **ATT prompt gerektirmiyor**, SDK küçük, GDPR temiz | Indie iOS geliştiricisi tarafından, indie için yazılmış. RevenueCat entegrasyonu var |
| **Firebase Analytics + Crashlytics** | **Spark planında tamamen ücretsiz ve sınırsız** | En geniş özellik seti, çökme raporlama | ⚠️ IDFA/IDFV, IP, cihaz kimliği topluyor → **ATT prompt** ve gizlilik yükü. Reklam yapmıyorsan bu maliyeti boşuna ödersin |
| **Apple Search Ads hesabı** (harcama yapmadan) | Bedava | Keyword arama popülerlik skoru — **Apple'ın kendi arama hacmi verisi** | En değerli ücretsiz ASO verisi |
| **App Store otomatik tamamlama** | Bedava | Gerçek arama önerileri, hacme göre sıralı | Araç yok, telefon yeter |
| **Xcode Organizer** | Bedava | Çökme, hang, enerji, disk metrikleri — gerçek kullanıcılardan | Çoğu geliştirici unutuyor |

### Önerilen minimum yığın (sıfır bütçe)
**RevenueCat (ücretsiz) + TelemetryDeck (ücretsiz) + App Store Connect + Xcode Organizer.**
Firebase'i **sadece** Crashlytics için düşün, o da Xcode Organizer yetmezse.

Kaynaklar:
- https://developer.apple.com/app-store-connect/analytics/
- https://developer.apple.com/news/?id=hh6v4b55
- https://blog.funnelfox.com/app-store-analytics-limits/
- https://respectlytics.com/blog/app-store-connect-analytics-vs-third-party/
- https://telemetrydeck.com/blog/pricing-update-2026/
- https://www.revenuecat.com/docs/integrations/third-party-integrations/telemetrydeck

---

# BÖLÜM D — SIFIR BÜTÇELİ ASO + LANSMAN KONTROL LİSTESİ

> Varsayım: hedef lansman **Ekim-Kasım**, Ocak dalgasına hazır girmek için (A9).
> Süreler tek kişi içindir. "Etki" sütunu **beklenen** etkidir, garanti değil.
> ⏱ Toplam ~45-60 saat, dağıtılmış.

## FAZ 0 · Lansmandan 10-12 hafta önce — TEMEL

| # | Adım | Süre | Beklenen etki | Not |
| --- | --- | --- | --- | --- |
| 0.1 | Apple Developer hesabı aktif, App Store Connect'te uygulama kaydı aç | 1 sa | Zorunlu | Bundle ID ve isim rezerve olur |
| 0.2 | **Apple Search Ads hesabı aç** (harcama yapma) | 30 dk | **Yüksek** — Apple'ın keyword hacim verisine bedava erişim | Tek en değerli ücretsiz ASO kaynağı |
| 0.3 | Keyword araştırması: App Store otomatik tamamlama + ASA popülerlik skoru + 15 rakip metadata'sını elle dök | 4-6 sa | **Yüksek** | Çıktı: 60-100 aday kelime, hacim ve tahmini zorlukla |
| 0.4 | RevenueCat + TelemetryDeck entegrasyonu | 3-4 sa | Yüksek (ölçüm olmadan öğrenme yok) | İkisi de ücretsiz katmanda |
| 0.5 | Aktivasyon olaylarını tanımla ve enstrümante et (time-to-first-value, plan tamamlandı, ilk uyarlama görüldü) | 2-3 sa | **Yüksek** | C16 huninin ölçülebilmesi buna bağlı |
| 0.6 | Erişilebilirlik geçişi: VoiceOver, Dynamic Type, kontrast | 3-4 sa | Orta (featuring kriteri + gerçek kullanıcı) | Featuring nomination formunda ayrıca soruluyor |

## FAZ 1 · 8-10 hafta önce — BETA

| # | Adım | Süre | Beklenen etki | Not |
| --- | --- | --- | --- | --- |
| 1.1 | TestFlight kurulumu, harici grup, ilk build Beta App Review'e | 2 sa | Zorunlu | Build **90 gün** geçerli — takvime not düş |
| 1.2 | **Beta başvuru formu** (Google Form yeter): kim, ne kadar süre taahhüt ediyor | 1 sa | Orta — bağlılık aracı, kohort kalitesini yükseltir | Herkesi alma |
| 1.3 | 60-100 beta kullanıcısı topla: kişisel ağ (20-30) + Shorts kanalı (30-40) + 2-3 niş topluluk (10-20) | 8-12 sa | **Çok yüksek** | 8. haftada ~15-20 aktif kalır — bu normal, buna göre boyutlandır |
| 1.4 | Haftalık 3 soruluk anket + 8-10 kişiyle **birebir görüşme** | Haftada 2 sa | **En yüksek öğrenme getirisi** | Beta'nın asıl çıktısı bu, bug listesi değil |
| 1.5 | Değer merdivenini kur ve ölç (B15): 5 dk / 1 gün / 1 hafta / 3 hafta değer noktaları | 10-15 sa geliştirme | **Kritik** — 4-8 haftalık gecikme problemi burada çözülüyor | "Günlük/haftalık bir skor" ver |
| 1.6 | **2. hafta retention'ı** öncü gösterge olarak izle | Sürekli | Yüksek | 8 hafta bekleyemezsin |

## FAZ 2 · 4-6 hafta önce — MAĞAZA SAYFASI

| # | Adım | Süre | Beklenen etki | Not |
| --- | --- | --- | --- | --- |
| 2.1 | **Başlık (30 kr)**: `Marka: en güçlü keyword` | 1 sa | **En yüksek tek ASO kaldıracı** | Bir kere doğru yap |
| 2.2 | **Alt başlık (30 kr)**: başlıkta olmayan 2-3 keyword + fayda cümlesi | 1 sa | Yüksek | İnsan cümlesi, kelime çorbası değil |
| 2.3 | **Keyword alanı (100 kr)**: virgülle ayrılmış, boşluksuz, tekil, başlık/alt başlıkta olmayan | 1-2 sa | Yüksek | Çoğul yazma, "app/free/best" yazma, kategori adı yazma |
| 2.4 | **IAP ürün adlarına** (30 kr her biri) keyword yerleştir | 30 dk | Düşük-orta, **bedava** | Çoğu geliştirici boşa harcıyor |
| 2.5 | Ekran görüntüleri: 5-6 dikey, **ilk 2'si tüm mesajı taşısın**, her birinde 3-5 kelimelik caption | Brief: 2 sa · üretim: **Codex/Antigravity** | **Dönüşümde en büyük tek kaldıraç** | Metinsiz ham UI = en kötü desen |
| 2.6 | Açıklama (4000 kr) — **indekslenmiyor**, sadece dönüşüm. İlk 3 satır kritik (kırpılıyor) | 2 sa | Orta | |
| 2.7 | Promosyon metni (170 kr) — indekslenmiyor ama **App Review'sız değişebiliyor** | 30 dk | Düşük-orta | Tek esnek alan, kampanya için sakla |
| 2.8 | **Yerelleştirme: English (U.S.) + English (U.K.) + Spanish (Mexico)** | 3-4 sa | **Yüksek, düşük maliyet** | Üçü de ABD'de indeksleniyor → keyword alanı ~3x |
| 2.9 | **Custom Product Page** #1: YouTube trafiği için | 2 sa | Orta | Bedava, hacim gerektirmiyor |
| 2.10 | App Preview videosu | ❌ **Erteleme** | Kanıtı belirsiz, maliyeti yüksek | Önce görselleri çöz |

## FAZ 3 · 3-4 hafta önce — LANSMAN HAZIRLIĞI

| # | Adım | Süre | Beklenen etki | Not |
| --- | --- | --- | --- | --- |
| 3.1 | **Featuring Nomination gönder** (App Store Connect → Featuring → Nominations), tip: **App Launch** | 1-2 sa | Düşük olasılık, **çok yüksek getiri**. Maliyeti neredeyse sıfır | **Minimum 3 hafta ön süre zorunlu.** 5 destekleyici URL ekle, erişilebilirlik ve indie hikâyesini yaz |
| 3.2 | App Review'e gönder — **reddi hesaba kat**, 1-2 hafta tampon bırak | 2 sa | Zorunlu | Health & Fitness'ta tıbbi iddia dili en sık ret sebebi |
| 3.3 | Waitlist / davet listesi kur (sıra numarası + çift taraflı ödül) | 3 sa | Orta — sıcak trafikte %15-35 dönüşüm | **1 aydan uzun bekletme** — dönüşüm yarıya iniyor |
| 3.4 | Product Hunt sayfası hazırla: görseller, ilk yorum, "hunter" gerekmez | 3-4 sa | Düşük-orta (~20 kayıt beklentisi) | Top-3 için 400+ upvote gerekiyor, ilk 4 saat kritik |
| 3.5 | Show HN taslağı — **uygulamayı değil, mühendisliği/bilimi** anlat | 1 sa | Yüksek varyans, sıfır maliyet | %90 gönderi öne çıkmıyor |
| 3.6 | Lansman e-postası + Shorts videosu hazırla | 3 sa | **Yüksek** — en büyük kanalın | |
| 3.7 | `requestReview` tetikleyicisini **değer teslim anına** bağla (ilk ölçülebilir ilerleme ekranı) | 1 sa | **Yüksek** | Yılda 3 hakkın var. Açılışta sorma. Kurulumdan 7+ gün sonra |

## FAZ 4 · Lansman haftası — YOĞUNLAŞTIR

| # | Adım | Süre | Beklenen etki |
| --- | --- | --- | --- |
| 4.1 | Her şeyi **aynı 48 saate** sıkıştır: PH + Show HN + e-posta + Shorts + topluluklar | 2 gün | **Yüksek** — indirme *hızı* (velocity) sıralama sinyali. Aya yayarsan sinyal ölür |
| 4.2 | Beta kullanıcılarına ayrı e-posta: **"üretim sürümünü indirin ve puan verin"** | 1 sa | **Çok yüksek** — ilk 10-20 puanın kaynağı. TestFlight puanı App Store'a gitmiyor | |
| 4.3 | Her yoruma 24 saat içinde cevap yaz | Günde 30 dk | **En yüksek ROI'li puan taktiği**, %100 kurallara uygun. Kullanıcı bildirim alıyor ve puanını güncelleyebiliyor |
| 4.4 | Çökme oranını günlük izle (Xcode Organizer) | 15 dk/gün | Yüksek — çökme hem puanı hem sıralamayı vuruyor |

## FAZ 5 · Lansman sonrası 90 gün — BİLEŞİK FAİZ

| # | Adım | Ritim | Beklenen etki |
| --- | --- | --- | --- |
| 5.1 | **App Store Connect → arama terimleri raporu**: hangi kelimeyle bulunuyorsun? Keyword alanını buna göre revize et | 2 haftada 1, 1 sa | **Yüksek** — gerçek veriye dayalı tek ASO döngüsü |
| 5.2 | Peer group benchmark'lara bak (dönüşüm, retention, download-to-paid) | Ayda 1, 30 dk | Orta — kendi kategorinde nerede olduğunu bedava söylüyor |
| 5.3 | Güncelleme yayınla (2-4 haftada bir) | Sürekli | Düşük-orta; canlılık sinyali + her sürüm yeni featuring nomination fırsatı |
| 5.4 | Featuring Nomination'ı **her anlamlı güncellemede** tekrar gönder (tip: App Enhancements) | Her sürüm, 30 dk | Düşük olasılık, sıfır maliyet |
| 5.5 | Yeni CPP'ler ekle (trafik kaynağı başına) | Gerektikçe, 1 sa | Orta |
| 5.6 | 4,0 puan eşiğini izle — **altına düşerse dur ve ürünü düzelt** | Sürekli | **Kritik.** 4,0 altı dönüşümde uçurum |
| 5.7 | Aralık başı: **Ocak koleksiyonu için featuring nomination** | 2 sa | Orta — Health & Fitness'ın en yoğun editoryal penceresi |
| 5.8 | Günlük ~500+ sayfa görüntülemesine ulaşınca **PPO A/B testini başlat** (ilk test: ekran görüntüsü seti) | 3 sa | Orta-yüksek, ama **hacim gelmeden anlamsız** |
| 5.9 | ❌ **Apple Search Ads: hayır.** Marka aramanda rakip reklamı görene kadar sıfır harcama | — | CPI $3,83 vs LTV $1,21 → matematiksel zarar |

---

## Yapılmayacaklar listesi (bilinçli)
| Yapma | Neden |
| --- | --- |
| Apple Search Ads (geniş keyword) | CPI $3,83 vs LTV $1,21. Ödeyen kullanıcı başına ~$182 (freemium) |
| Ocak'ta lansman | Rekabet 2x, resolutioner kohortu bizim 4-8 haftalık değer penceremizden kısa yaşıyor, retention sinyalimizi bozar |
| PPO'yu gün 1'de açmak | Hacim yok → istatistiksel güç yok → gürültü okursun |
| App preview videosu (ilk sürüm) | Kanıtı belirsiz, maliyeti yüksek |
| X/build-in-public'e ayrı yatırım | Kitle geliştirici, müşteri değil. YouTube zaten var, iki kanal yürütülemez |
| Indie Hackers'ta lansman | Kitle yanlış |
| 10.000 kişilik açık beta | 100'den fazlasıyla birebir konuşamazsın; beta'nın amacı bu |
| "Pre-prompt / happiness check" ile puan filtreleme | Apple'ın yazılı yasağında "filtered feedback" geçiyor |
| Puan karşılığı özellik/indirim | Guideline 3.2.2(x) → uygulama kaldırılır |
| Çince (Basitleştirilmiş) yerelleştirme | ICP kaydı, ayrı süreç, indie için erken |
| Firebase (reklam yapmıyorsan) | ATT prompt + gizlilik yükü, kullanmayacağın özellikler için |

---

## Bulunamayanlar (dürüstlük notu)
- App Store sıralama faktörlerinin **sayısal ağırlıkları** — Apple hiç yayımlamadı, kimse bilmiyor.
- **Featured olmanın ölçülmüş etkisi** — 2025/2026 için geniş örneklemli çalışma yok, sadece vaka anlatıları.
- **Sıralamaya girmek için minimum puan sayısı** — böyle bir eşik yayımlanmadı.
- **TestFlight beta → üretim/ödeme geçiş oranı** benchmark'ı — kamuya açık veri yok.
- **Lansman ayının etkisini doğrudan test eden** çalışma — yok; A9'daki öneri mekanik çıkarım.
- **Ekran görüntüsü caption'ının sıralama faktörü olduğunun** bağımsız doğrulaması — sadece vendor iddiası.
- **İndie Health & Fitness için ölçülmüş benchmark tablosu** — C16'daki eşikler türetilmiş tahmin.
- `requestReview` **zamanlamasının** deneysel kanıtı — sadece uzlaşı desenleri.
