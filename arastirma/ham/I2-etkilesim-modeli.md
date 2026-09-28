# I2 · Etkileşim Modeli — Sohbet + Dashboard Hibrit (Ham Araştırma)

**Tarih:** 2026-09-10 · **Durum:** araştırma sürüyor (canlı dosya)
**Tasarım hedefi:** kullanıcıdan en az iş, en çok veri. Sadece gerçekten gereken veriyi,
gerçekten gerektiğinde iste. Kalanı arka planda hallet.

**Kapsam:** A) doğal dille veri girişi · B) chat vs dashboard iş bölümü · C) "veri talebi"
(progressive disclosure / aktif öğrenme) modeli · D) pasif veri · E) fotoğraf akışı ·
F) anti-kalıplar · G) somut model önerisi

---

# A · Doğal dille veri girişi — gerçek durum

## A0 · Baş bulgu: SnappyMeal (Kasım 2025, arXiv) — bizim tasarımın birebir denenmiş hâli

Bu makale bizim planladığımız şeyin neredeyse tamamını (çok modlu giriş + **hedefe bağlı
takip sorusu** + veritabanı/fiş RAG'i) kurup 3 hafta sahada test etmiş. Bu yüzden en ağır
kanıt burada.

**Kaynak:** [SnappyMeal: Design and Longitudinal Evaluation of a Multimodal AI Food Logging
Application, arXiv:2511.03907](https://arxiv.org/abs/2511.03907) · [tam metin](https://arxiv.org/html/2511.03907v1)

**Kurulum:** 12 uygun katılımcı → 8 indirdi → **6 kişi** 3 haftayı tamamladı. 502 öğün kaydı.
Giriş modları: fotoğraf · metin · **ses** · barkod. Gemini tabanlı; her kayıtta varsayılan
olarak takip sorusu soruyor.

| Bulgu | Sayı | Neden önemli |
| --- | --- | --- |
| **Ses kullanımı** | **%0 — hiçbir kullanıcı sesi seçmedi**, 3 hafta boyunca düz sıfır | Ses-öncelikli tasarım hipotezine doğrudan darbe |
| Tercih dağılımı | 3 kişi fotoğraf, 3 kişi metin (verimlilik gerekçesiyle) | Metin, sesin işlevini üstleniyor |
| Bağlama göre kendiliğinden ayrışma | Öğünlerde fotoğraf baskın, **atıştırmalıkta metin** baskın | Mod seçimi kullanıcıya bırakılmalı, dayatılmamalı |
| Düzeltme oranı | 502 kaydın **104'ü (%20,7) düzenlendi**, 29'u (%5,8) silindi | Her 5 kayıttan 1'i yanlış → düzeltme akışı birinci sınıf özellik |
| Düzenleyebilme memnuniyeti | x̄ = 4,33 / 5 ("kaydı düzenleyebilmeyi takdir ettim") | Düzeltme = güven kaynağı, utanç kaynağı değil |
| Takip sorusunun ilgililiği | x̄ = 3,83 / 5 (hem yiyeceğe hem kişisel hedefe ilgili) | Sorular kabul görüyor… |
| **Ama:** genel yargı | *"follow-up questions did not make the process easier than traditional methods"* | …ama **yükü azaltmıyor** |
| Takip sorusunun doğruluğa etkisi | RAG+fiş: MAE **123,96 kcal** · RAG+fiş+**takip sorusu**: MAE **153,00 kcal** (daha kötü) | Takip sorusu doğruluğu **düşürdü** (n=100 alt küme) |
| Nutrition5k benchmark (n=3.466) | Kalori MAE ~120 kcal, protein ~7,7 g, yağ ~8,0 g, karb ~12,3 g | Referans hata seviyesi |
| Bağlılık | 6/6 21 günü bitirdi; 4/6 her gün, 1/6 haftada 5–6, 1/6 haftada 1–2 | Küçük örneklem, gönüllü yanlılığı yüksek |
| Kaçırılan kayıt sebebi | "çok zaman alıcı/külfetli" (n=3) · "unutmak" (n=3) | İki ayrı sorun: sürtünme ve tetikleyici |

**Kullanıcı şikâyetleri (aynen):**
- *"it would default to 'how much chicken did you bake' which was frustrating to edit"* → varsayılan
  varsayım yanlışsa düzeltmek, baştan yazmaktan pahalı.
- Metinle girdiği hâlde **fotoğraf için yazılmış** takip sorusu almış → soru üretimi giriş modunu
  bilmiyor.
- Kullanıcılar **basit tek malzemeli yiyeceklerde takip sorusunu atlayabilmeyi** istedi (örn. muz).

> **Bizim için üç ders:**
> 1. **Her kayda soru sorma.** Soru bir maliyet; sadece belirsizlik gerçekten yüksekse ve o
>    belirsizlik kararı değiştirecekse sor. SnappyMeal'in "varsayılan olarak hep sor" kurulumu
>    hem doğruluğu düşürdü hem yükü azaltmadı.
> 2. **Sesi varsayılan yapma.** Sahada %0 kullanıldı. Ses bir *seçenek* olabilir; omurga olamaz.
> 3. **Düzeltme akışı ana akış.** %20,7 düzenleme oranı gerçekçi taban. Düzeltme 1 dokunuş olmalı.

⚠️ **Sınırlılık:** n=6, 18–24 yaş ağırlıklı, 3 hafta. Yön gösterir, kesin sayı vermez.

## A1 · Ürün taraması — kim ne yapıyor

| Ürün | Ne yapıyor | Kanıt/ölçek | Kaynak |
| --- | --- | --- | --- |
| **GhostFit** | Ses-öncelikli antrenman kaydı; konuşunca set/tekrar/kilo log'a dönüyor. Ayrıca AI koç + beslenme | Bağımsız ölçek verisi **bulunamadı**; site kendi pazarlaması | [ghostfit.ai](https://ghostfit.ai/) · [Google Play](https://play.google.com/store/apps/details?id=com.fytlog.app) |
| **Vora** | Ses-öncelikli, ElevenLabs ile 6 koç kişiliği, Apple Watch'ta sesli kayıt | Bağımsız ölçek verisi **bulunamadı** | [askvora.com/voice-coaching](https://askvora.com/voice-coaching) · [App Store](https://apps.apple.com/us/app/vora-ai-health-fitness/id6754351240) |
| **Hevy** | Doğal dili **kayıt için değil**, plan üretimi ve sonrası analiz için kullanıyor: HevyGPT ile ChatGPT'de program üret → Hevy'ye aktar; bitirme ekranından antrenmanı ChatGPT/Claude'a gönder | Hevy ana kayıt akışı hâlâ **yapılandırılmış tablo** | [hevyapp.com/features/hevy-gpt](https://www.hevyapp.com/features/hevy-gpt/) |
| **MacroFactor** | "Photo & Text": fotoğrafa serbest metin açıklaması ekleyerek analizi iyileştirme. Kritik tasarım kararı: LLM'e tahmin ettirmek yerine **kendi araştırma tabanlı gıda veritabanından gerçek kayıt** eşliyor; kullanıcı **loglamadan önce gözden geçirip onaylıyor** | Resmî yardım dokümanı: "herkesin AI sonucunu loglamadan önce incelemesini öneriyoruz" | [MacroFactor AI Food Logging](https://help.macrofactorapp.com/en/articles/258-ai-food-logging) · [duyuru](https://macrofactor.com/ai-food-logging/) |

**Örüntü:** Ciddi ürünlerin hiçbiri doğal dili **tek başına kayıt yolu** yapmıyor.
Doğal dil ya (a) yapılandırılmış girdiyi *zenginleştiren* bir katman (MacroFactor), ya (b) kayıt
dışı işler için (Hevy: plan üretimi, sonrası analiz). Ses-öncelikli olanlar (GhostFit, Vora)
küçük ve bağımsız doğrulaması yok.

## A2 · Doğruluk — ölçülmüş veri

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| **Sadece metinden** kalori/makro tahmini, ham (vanilla) açık kaynak LLM: kötü | Kalori **MAE 652 kcal**, Lin's CCC < 0,46 | [arXiv:2509.13268 (NHANES, 11.281 ergen)](https://arxiv.org/abs/2509.13268) |
| Aynı model, chain-of-thought 10-shot + PEFT ince ayar | Kalori **MAE 171–191 kcal**, tüm çıktılarda **CCC > 0,89** | aynı |
| Çok modlu (fotoğraf) sistemin sahada kalori MAE'si | ~120 kcal (Nutrition5k) | SnappyMeal |

> **Bu iki sayı bizim için en kritik teknik bulgu:** ham bir LLM'e "ne yedim" diye yazmak
> **652 kcal hata** demek — kullanılamaz. Aynı görev, alan-uyarlı model + zincirleme akıl
> yürütme + veritabanı eşlemesiyle **171–191 kcal**'a iniyor. Yani doğal dil girişi çalışır,
> ama **çıplak LLM ile çalışmaz.** MacroFactor'ün "LLM tahmin etmesin, veritabanına eşlesin"
> kararı bu bulguyla birebir örtüşüyor.

⚠️ Egzersiz eşlemesi ("üstten çekmeli alet" → lat pulldown) için **ölçülmüş doğruluk verisi
bulunamadı.** Beslenme tarafında sayı var, egzersiz tarafında yayınlanmış benchmark yok.
Bu bizim kendi ölçmemiz gereken bir boşluk (bkz. G bölümü).

## A3 · Sesli giriş gerçekte kullanılıyor mu?

| Bulgu | Kaynak |
| --- | --- |
| SnappyMeal sahada: **%0** ses kullanımı, 3 hafta, 502 kayıt | [arXiv:2511.03907](https://arxiv.org/html/2511.03907v1) |
| Kullanıcılar sesli asistanı **kamusal alanda kullanırken utanç/rahatsızlık** bildiriyor; *shame* tüm sosyal durumlarda anlamlı etki gösteriyor | [Self-conscious emotions & continuance intention of voice assistants, ScienceDirect 2024](https://www.sciencedirect.com/science/article/pii/S2451958824000836) |
| Özel bilgi aktarımında dikkat artıyor; **kamusal konumda ve göze çarpan giriş yöntemiyle bu etki büyüyor**; katılımcılar sesli asistanı özel mekânda kullanmayı tercih ediyor | [Privacy Concerns for Use of Voice Activated Personal Assistant in the Public Space, IJHCI 31(4)](https://www.tandfonline.com/doi/abs/10.1080/10447318.2014.986642) |

**Spor salonu bağlamı:** gürültülü **ve** sosyal. Yukarıdaki iki mekanizma (ASR gürültü hatası +
sosyal utanç) aynı anda çalışıyor. Salon için sesli giriş varsayılan yapılamaz.
⚠️ Doğrudan "spor salonunda sesli kayıt" üzerine yayınlanmış çalışma **bulunamadı** — çıkarım
genel sesli arayüz literatüründen.

**Ne zaman ses işe yarar:** eller dolu + yalnız + sessiz. Yani **araba, mutfak, yürüyüş, ev**.
Salon değil.

---

## A4 · Serbest metnin düzeltme maliyeti

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Sahada AI kayıtlarının **%20,7'si düzenlendi**, %5,8'i silindi | 502 kayıt / 3 hafta | [SnappyMeal](https://arxiv.org/html/2511.03907v1) |
| Kullanıcılar "yanlış varsayılanı düzeltmek" i açıkça sinir bozucu buldu (*"frustrating to edit"*) | nitel | aynı |
| AI görsel üretiminde kullanıcıların neredeyse hiçbiri **tek denemede durmadı**; çoğu prompt'u yineledi | 100+ prompt gözlemi | [NN/g — Articulation Barrier](https://www.nngroup.com/articles/ai-articulation-barrier/) |

⚠️ **"Kaç kere yanlış anlaşılınca bırakır" sorusuna doğrudan sayı bulunamadı.** Yayınlanmış bir
"tolerans eşiği" çalışması yok. Elimizdeki en yakın vekil: SnappyMeal'de %20,7 düzeltme oranına
rağmen 6/6 katılımcı 21 günü tamamladı — ama bu ücretli çalışma katılımcısı, gerçek kullanıcı değil.

**Tasarım sonucu:** Düzeltme maliyetini ölçülebilir tut. İki tasarım kuralı:
1. **Yanlış varsayılan, boş alandan pahalıdır.** Emin olmadığın alanı doldurma; boş bırak ve işaretle.
2. **Düzeltme, yeniden yazmak olmasın.** Yanlış eşlenen egzersiz/yiyecek tek dokunuşla değişebilmeli
   (alternatif listesi hazır beklesin, arama açtırma).

---

# B · Sohbet mi dashboard mı — iş bölümü

## B1 · Chat'in yapısal zayıflığı: "keyhole effect"

**Kaynak:** [The Keyhole Effect: Why Chat Interfaces Fail at Data Analysis, arXiv:2602.00947](https://arxiv.org/abs/2602.00947)

Woods'un 1984 "keyhole effect" kavramı (büyük bilgi uzayına dar bir delikten bakmanın bilişsel
maliyeti) üzerine kurulu. İddia: **çok adımlı, duruma bağlı analitik işlerde chat sistematik olarak
performansı düşürüyor.** Beş mekanizma:

1. **Sürekli içerik yer değiştirmesi** mekânsal hafızayı bozar (kaydırdıkça önceki kayboluyor).
2. **Gizli durum değişkenleri** çalışma belleğini aşar (yük altında ~4 parça kapasite).
3. **Zorunlu sözelleştirme** *verbal overshadowing* tetikler → görsel örüntü tanımayı bozar.
4. **Doğrusal metin akışı** epistemik eylemi ve bilişsel dışsallaştırmayı engeller.
5. **Serileştirme cezası** veri boyutuyla birlikte büyür.

Formalize ettiği aşırı yük: **O = max(0, m − v − W)** (m = işle ilgili öğe, v = görünen öğe,
W = çalışma belleği).

⚠️ **Bu bir kuram makalesi** — yanlışlanabilir hipotezler ve deney tasarımı öneriyor, ampirik
sonuç sunmuyor. Argüman güçlü ama "kanıtlanmış" değil.

**Bizim ürüne çevirisi:** "Son 8 haftada bench press nasıl gitti", "bu hafta protein nerede
kaldı", "programın neresindeyim" — hepsi **çok öğeli, durum bağımlı** sorular. Chat'te cevaplamak
kullanıcıyı deliğe bakmaya zorlar. Bunlar **kalıcı, kaydırılabilir, yan yana görülebilir** bir
yüzeye ait.

## B2 · Chat'in ikinci zayıflığı: keşfedilebilirlik / artikülasyon bariyeri

| Bulgu | Kaynak |
| --- | --- |
| Doğal dil arayüzlerinin **kronik sorunu girdi keşfedilebilirliği**; yeni kullanıcılar özellikle yetenekleri bilinmeyen sistemlerde etkili soru soramıyor | [Enhancing Discoverability in Enterprise Conversational Systems with Proactive Question Suggestions, arXiv:2412.10933](https://arxiv.org/pdf/2412.10933) |
| Chat arayüzleri **teknik işi teknik olmayan kullanıcıya yıkıyor**; ideal çıktı ancak öğrenilmiş komutlarla alınıyor | [NN/g — Designing for AI Beyond Conversational Interfaces (Smashing derlemesi)](https://www.smashingmagazine.com/2024/02/designing-ai-beyond-conversational-interfaces/) |
| **Artikülasyon bariyeri:** kullanıcı istediğini kelimeye dökemiyor. İki maliyet: (a) etkili prompt kurmanın bilişsel yükü, (b) yazma eforu. Gözlemde neredeyse hiç kimse tek denemede durmuyor | [NN/g](https://www.nngroup.com/articles/ai-articulation-barrier/) |
| NN/g'nin çözümü: **hibrit arayüz** — terim bilmeyi gerektiren seçim GUI'ye (küçük resim galerisi: adını bilmeden efekti seç), serbestlik gerektiren kısım metne. Metin tarafında **öneri özelliği** hatırlama yükünü tanımaya çevirir | aynı |
| Öneri çipleri / hızlı yanıtlar: sohbet içinde yapılandırılmış seçenek sunarak serbest metin yazmayı gereksizleştirir | [Conversational UI best practices derlemesi](https://www.onething.design/post/best-practices-for-conversational-ui-design) ⚠️ vendor |

> **"Recognition over recall" kuralı chat'e de uygulanır.** Bizim kullanıcı "üstten çekmeli alet"
> diyebiliyorsa iyi; ama "geçen ay lat pulldown'da 1RM tahminim ne oldu" diye sormayı **akıl
> edemez.** Bu soruyu ürünün *kendisi sormalı* — ya kart olarak göstererek ya çip olarak önererek.

## B3 · Hibrit tuzağı: chat'i GUI'nin yerine koymak

| Bulgu | Kaynak |
| --- | --- |
| Chat **ikame** olarak (augmentation değil) konumlandığında kafa karışıklığı yaratıyor, kullanıcıyı yavaşlatıyor ve benimsenmeyi düşürüyor | [Markswebb — Conversational UI & AI Agents: the Hybrid Trap](https://markswebb.com/insights/conversational-ui-ai-agents-hybrid-trap/) ⚠️ danışmanlık blogu |
| Görsel bilgi çoğu zaman metinden **daha kolay anlaşılır ve daha hızlı** etkileşilir; karmaşık form doldurmayı (banka hesabı, otel rezervasyonu) konuşarak yapmak ileri AI'la bile zor — tıklama/dokunma sezgisel | [NN/g — AI: First New UI Paradigm in 60 Years](https://www.nngroup.com/articles/ai-paradigm/) |
| Gelecek: saf chat ya da saf GUI değil, **hibrit** — niyet tabanlı ve komut tabanlı arayüzün birleşimi, GUI öğeleri korunarak. AI bir form/taslak üretir, kullanıcı klasik araçlarla düzenler | aynı |
| Bugünkü chatbot'lar hâlâ **doğrusal akışa** dayanıyor ve kullanıcı akıştan saptığında zorlanıyor | NN/g |

## B4 · Hangi iş hangi yüzeyde — kanıta dayalı iş bölümü

Aşağıdaki tablo yukarıdaki bulgulardan türetilmiş **çıkarımdır**; her satır için ayrı RCT yok.
Gerekçe sütunu hangi bulguya dayandığını gösterir.

| İş | Nerede | Gerekçe |
| --- | --- | --- |
| **Veri girme — rutin, tekrarlayan** (set/tekrar/kilo) | **Yapılandırılmış** (önceki set önceden doldurulmuş, +/− tuşları) | Salonda hız + eldiven/ter + sosyal ortam; ses %0 kullanıldı (SnappyMeal); tıklama sezgisel (NN/g) |
| **Veri girme — düzensiz, tanımı zor** (dışarıda yenen öğün, yeni alet, "bugün böyle bir şey oldu") | **Serbest metin / fotoğraf** | Yapılandırılmış arayüz bu uzun kuyruğu kapsayamaz; SnappyMeal'de atıştırmalıkta metin baskın çıktı |
| **Geçmişe bakma / trend** | **Dashboard, kesinlikle** | Keyhole effect'in tam hedefi: çok öğeli, durum bağımlı, görsel örüntü |
| **Tek bir sayı sorma** ("dün kaç protein") | Chat kabul edilir | Tek öğe → keyhole sorunu yok |
| **Kararı öğrenme** ("neden bu hafta hacim düştü") | **Karma: dashboard kartı + chat'te derinleşme** | Kararın kendisi kalıcı yüzeyde görünmeli (doğrulanabilirlik); *neden*i konuşma açılabilir |
| **Plan değiştirme** | **Yapılandırılmış onay ekranı**, chat'ten tetiklenebilir | Geri dönülmez/yapılandırılmış eylem; NN/g: "AI form üretir, kullanıcı klasik araçla düzenler" |
| **Motivasyon / bağlam anlatma** ("dizim ağrıyor", "sınav haftası") | **Chat** | Yapılandırılmış arayüzün asla kapsayamayacağı alan; ürünün asıl kazancı burada |
| **Soru sorma** | **Chat + öneri çipleri** | Keşfedilebilirlik sorunu çipsiz çözülmüyor |
| **Sistemin kullanıcıya soru sorması** | **Chat** (ama seyrek — bkz. C) | Doğal yer burası |

## B5 · Sohbet içinde yapılandırılmış çıktı

Kanıtlanmış tek genel ilke: NN/g'nin *"AI bir form ya da taslak üretir, kullanıcı bunu klasik
araçlarla düzenler"* kalıbı. Yani sohbetin içindeki kart **okunacak bir metin değil,
dokunulacak bir nesne** olmalı — düzenlenebilir, onaylanabilir, dashboard'a sabitlenebilir.

⚠️ "Sohbet içi kart tasarımının ölçülmüş etkisi" üzerine hakemli kaynak **bulunamadı.**
Bu alandaki her şey vendor blogu / desen kataloğu seviyesinde.

---

# C · "Veri talebi" modeli — asıl yenilik burada

## C1 · Bu model zaten var ve ölçülmüş: Computerized Adaptive Testing (CAT)

Bizim aradığımız şeyin ("hangi soruyu sormak en çok belirsizliği azaltır") **50 yıllık,
ürünleşmiş, klinikte kullanılan** karşılığı bu. Item Response Theory + Fisher bilgi
maksimizasyonu: her adımda **kalan belirsizliği en çok düşürecek maddeyi** seç, hedef
kesinliğe ulaşınca **dur**.

**Kaynak:** [Reducing patient burden of PROMs through advanced CAT stopping rules,
Qual Life Res (PMC12681468)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12681468/) ·
[IRT, CAT and PROMIS: Assessment of Physical Function, J Rheumatol 41(1)](https://www.jrheum.org/content/41/1/153)

| Bulgu | Sayı |
| --- | --- |
| Anksiyete madde bankası — varsayılan durdurma kuralı | ortalama **9,98 madde** |
| Aynı banka — optimize edilmiş durdurma (SER 0,027) | ortalama **5,58 madde** → **%44 azalma** |
| Depresyon bankası: 8,13 → **4,79 madde** | **%41 azalma** |
| Semptomsuz katılımcılar | 12 maddeden **~4 maddeye** |
| Kesinlik bedeli | T-skor farkı **0,04–0,58 puan** (semptomsuzlarda ~3 puan) |
| Kullanılan güvenilirlik eşiği | SE(θ) < 0,32 ≈ güvenilirlik **0,90** (pediatrik PROMIS CAT'te SE < 0,40 ≈ 0,80) |
| 6 PROMIS alanı ölçmek | 72 maddeden (6×12) **24 maddeye** (6×4) — kısa form uzunluğu, ama semptomlularda daha iyi kesinlik |
| PROMIS PF CAT, sMFA'ya kıyasla tamamlama süresi | **onda birinden az**, sonuçlar denk | [J Orthop Trauma](https://www.ovid.com/jnls/jorthotrauma/abstract/10.1097/bot.0000000000000059~computerized-adaptive-testing-using-the-promis-physical) |

> **Bu tablo bizim tasarımın omurgası olabilir.** Mekanizma birebir taşınabilir:
> her kullanıcı için bir **belirsizlik durumu** tut (kalori dengesi? uyku? teknik? bağlılık?),
> her potansiyel sorunun **beklenen bilgi kazancını** hesapla, **en yüksek olanı sor**,
> **eşiğe inince sus.** Kritik nokta: CAT'in asıl kazancı soru seçmek değil, **durma kuralı**.
> "Kaç soru sorulur" değil, "ne zaman susulur" tasarlanıyor.

**Bir uyarı:** Aynı çalışma, semptomsuz (= "her şey yolunda") kişilerde daha agresif durmanın
T-skorunu ~3 puan kaydırdığını gösteriyor. Bizim karşılığı: **iyi giden kullanıcıda az soru sor,
ama tamamen kör kalma.** Sorun çıkan kullanıcıda soru bütçesini artır.

## C2 · Tıbbi triyaj: soru sayısı bir rekabet ekseni

**Kaynak:** [Evaluating the Diagnostic Performance of Symptom Checkers: Clinical Vignette Study,
JMIR AI 2024;1:e46875](https://ai.jmir.org/2024/1/e46875) — 400 vignette, her biri 7 hekimden
en az 5'inin onayıyla; 6 semptom kontrolcüsü (Ada, Avey, WebMD, K Health, Buoy, Babylon).

| Bulgu | Sayı |
| --- | --- |
| Avey, Ada'ya kıyasla **%17,2 daha az soru** sorarak, precision dışındaki **tüm** metriklerde onu geçti | %17,2 |
| Ada precision'da Avey'i geçiyor | ortalama %0,9 |
| Avey'in M1 metriğinde üstünlüğü: Ada %24,5 · WebMD %175,5 · K Health %142,8 · Buoy %159,6 · Babylon %2.968,1 | — |

⚠️ Bu çalışma Avey ekibinin dahil olduğu bir karşılaştırma — çıkar çatışması riski var
([medRxiv ön baskısı](https://www.medrxiv.org/content/10.1101/2022.03.08.22272076v1)).
Yine de **"daha az soruyla daha iyi sonuç mümkün"** iddiası bizim için yön verici, ve
Ada'nın **hekim anamnezi gibi önceki cevaba göre uyarlanan** soru akışı sektör standardı.

**Diğer ürünleşmiş örnekler (progressive disclosure):**
- **Vergi yazılımı (TurboTax vb.):** karmaşık formu "röportaj" akışına çeviriyor; kullanıcı
  formu görmüyor, sistem arkada eşliyor. ⚠️ Ölçülmüş dönüşüm verisi bulunamadı; desen
  literatürde kanonik örnek olarak geçiyor ([progressive disclosure derlemesi, IxDF](https://ixdf.org/literature/topics/progressive-disclosure)).
- **Koşullu form alanları:** alan ancak önceki cevap onu ilgili kıldığında görünür.

## C3 · Soru sormanın maliyeti — sayılar (dikkat: kaynak kalitesi zayıf)

| Bulgu | Sayı | Kaynak | Uyarı |
| --- | --- | --- | --- |
| 7'den fazla alan istendiğinde ortalama form terk oranı **%67,8** | %67,8 | Formstack 2025, 1.500 B2B karar verici (aktarım) | ⚠️ ikincil aktarım |
| Dönüşüm: 3 alanda %23,1 → 5 alanda %17,0 → 7 alanda %11,4 → 10+ alanda %6,9 | — | [Digital Applied derlemesi](https://www.digitalapplied.com/blog/form-conversion-rate-benchmarks-2026-data-points) | ⚠️ **kaynak atfı yok** — doğrulanamadı |
| "5→7 uçurumu": bu aralıkta her ek alan ~2,8 puan, öncesinde ~1,5 puan | — | aynı | ⚠️ aynı |
| Her ek alan dönüşümü ortalama %4,1 düşürüyor | %4,1 | vendor derlemesi | ⚠️ |
| Takip sorusunu **sadece ilgiliyken** sormak (telefonu zorunlu yerine opsiyonel yapmak): terk **%39 → %4** | %39→%4 | vendor derlemesi | ⚠️ tek vaka, doğrulanamadı |
| B2B için optimum 3–5 alan | Forrester 2024 (aktarım) | ⚠️ |

> **Dürüst değerlendirme:** Bu bölümdeki sayıların hiçbirinin birincil kaynağına ulaşılamadı.
> Digital Applied kendi sayfasında "HubSpot, Unbounce, Baymard, Hotjar, Contentsquare" diyor
> ama **hangi sayının hangi çalışmadan geldiğini söylemiyor.** Bunları **yön** olarak kullan,
> hedef olarak değil. Yönün kendisi tutarlı ve SnappyMeal'in nitel bulgusuyla örtüşüyor:
> **her ek soru maliyetli, ve maliyet doğrusal değil — bir eşikten sonra dikleşiyor.**

## C4 · Belirsizliği kullanıcıya göstermek — burası düşündüğümüzden karmaşık

Bu bizim varsaydığımız farklılaşma alanı. Kanıt **karışık** ve naif uygulamayı desteklemiyor.

| Bulgu | Sayı / detay | Kaynak |
| --- | --- | --- |
| **Sözel çekince (hedging)** — katılımcılar hedge'li ve hedge'siz AI'ı **eşit güvenilir** buldu, ama hedge'li tavsiyeye uymaya **anlamlı ölçüde daha az** meyilliydi | — | [Linguistic Uncertainty Markers for Trust Calibration, ACM CUI '26](https://dl.acm.org/doi/10.1145/3816046.3816231) ⚠️ tam metne erişilemedi (403), özet üzerinden |
| Sözel hedging **uyumu ve memnuniyeti düşürdü** ve tüm koşullar içinde **en zayıf güven–doğruluk ayrımını** verdi | — | aynı hat |
| Aşırı hedging **algılanan yetkinliği aşındırıyor**; aşırı güven ise sınırları gizliyor | — | derleme |
| **Görsel** belirsizlik: AI'a karşı olumsuz tutumu olanların **%58'inde güveni anlamlı artırdı** | %58 | [Trusting AI: does uncertainty visualization affect decision-making?, Front. Comput. Sci. 2025](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1464348/full) · N=147, 3 oyun / 9 senaryo |
| Ama **tüm** örneklemde: güven %48'de arttı, **%52'de azaldı** | 48/52 | aynı |
| %33'ü belirsizlik görselleştirmesini gördükten sonra **kararını değiştirdi** | %33 | aynı |
| Karara güven: %44'te arttı, **%56'da azaldı** | 44/56 | aynı |
| En etkili görsel kodlama **boyut** (M=1,00) vs şeffaflık (M=−0,020); ama **renk doygunluğu** en sezgisel ve en çok tercih edilen bulundu | — | aynı |
| Nokta tahmin **+ güven aralığı** birlikte sunmak, yalnız nokta tahminden daha iyi karar sağlıyor | — | derleme |
| Doğruluk, güven ve bağımlılığın **baskın belirleyicisi** olarak kaldı — belirsizlik sunum biçiminden bağımsız | — | derleme |

> **Ders — ve bu bizim tasarımı doğrudan değiştiriyor:**
> "Bu tahminden emin değilim" demek **tek başına iyi bir hamle değil.** Literatür net:
> çıplak sözel çekince (a) tavsiyeye uyumu düşürüyor, (b) yetkinlik algısını aşındırıyor,
> (c) güven kalibrasyonunda en zayıf performansı veriyor.
>
> **İşe yarayan formül:** belirsizliği *ifade etme*, **çözülebilir hâle getir.**
> ✗ "Emin değilim, belki lat pulldown."
> ✓ "**Lat pulldown** olarak kaydettim — %85. Alternatif: seated cable row. [Değiştir]"
> Yani: bir **karar ver** (yetkinlik korunur) + **belirsizliği nicelle** (kalibrasyon) +
> **tek dokunuşluk çıkış yolu ver** (aksiyon). Belirsizlik bir *itiraf* değil, bir
> **kontrol öğesi** olarak sunulmalı.

## C5 · SnappyMeal'in uyarısı — soru sormak her zaman kazandırmıyor

Tekrar altını çiziyorum çünkü C bölümünün en tehlikeli varsayımını kırıyor:
**varsayılan olarak her kayda takip sorusu soran sistem, hem doğruluğu düşürdü
(MAE 123,96 → 153,00 kcal) hem "geleneksel yöntemden kolay" bulunmadı.**

Fark nerede? CAT'te soru **bilgi kazancına göre seçiliyor ve eşiğe inince duruluyor.**
SnappyMeal'de soru **her zaman** soruluyordu. Bizim modelin tamamı bu farkta.

---

# D · Pasif veri toplama

## D1 · Telefon tek başına ne kadar güvenilir?

| Veri | Güvenilirlik | Kaynak |
| --- | --- | --- |
| **Adım — sadece telefon** | MAPE **%29,6** — serbest yaşam koşullarında **güvenilir değil** | [Apple Watch 6 vs Galaxy Watch 4 adım geçerlilik çalışması (PMC11281039)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11281039/) |
| **Adım — akıllı saat** | MAPE **%6,4** — güçlü geçerlilik | aynı |
| iPhone'un serbest yaşamda adım ölçümü | ayrı doğrulama çalışması mevcut | [How Well iPhones Measure Steps in Free-Living Conditions (PMC6329418)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6329418/) |
| Kalp hızı / HRV / uyku evreleri | **cihaz gerektirir** (saat/yüzük); telefonla pasif toplama sınırlı | [Sahha — passive health data collection](https://sahha.ai/blog/passive-health-data-collection/) ⚠️ vendor |

> **Karar:** Telefon adımı bir **trend sinyali** olarak kullanılabilir (aktif mi, hareketsiz mi),
> **mutlak sayı olarak kullanılamaz** (%29,6 hata). Kullanıcıya "bugün 7.412 adım" demek yanlış;
> "bu hafta geçen haftadan hareketlisin" demek savunulabilir.

## D2 · Akıllı tartı

| Bulgu | Kaynak |
| --- | --- |
| Withings Body Smart: Wi-Fi üzerinden **uygulama açmadan** HealthKit'e kilo + vücut kompozisyonu yazıyor | [derleme](https://thegreatreviewer.com/health-wellness-reviews/best-smart-scales-2026/) ⚠️ vendor |
| Renpho, Eufy: Apple Health / Google Fit / Fitbit entegrasyonu var | aynı ⚠️ |
| **Wi-Fi'li tartı** telefon başka odadayken bile senkronize oluyor → tutarlılık artıyor | ⚠️ vendor iddiası, **ölçülmüş bağlılık verisi bulunamadı** |

⚠️ **"Akıllı tartı günlük tartılma alışkanlığını gerçekten kolaylaştırıyor mu"** sorusunun
hakemli cevabı **bulunamadı.** Bulunanlar ürün karşılaştırma sayfaları. Bu bir boşluk.
Mekanizma makul (adım sayısı: tartıya çık → bitti, uygulama açmak yok), ama kanıtlanmadı.

## D3 · Konum / bağlam — Q Sense kanıtı

Sağlık uygulamasında geofence kullanan en iyi belgelenmiş çalışma sigara bırakma alanından:
**[A Context-Sensing Mobile Phone App (Q Sense) for Smoking Cessation, PMC5045522](https://pmc.ncbi.nlm.nih.gov/articles/PMC5045522/)** — N=15, karma yöntem.

| Bulgu | Sayı |
| --- | --- |
| Konum yakalama başarısı | raporların **%97,0**'sinde konum verisi vardı |
| Konum doğruluğu | ortalama **31,6 m** (SD 16,8), %68 güven |
| Geofence tetikli mesaj alan uygun katılımcı | **%56** |
| Bildirimlerin 30 dk içinde açılma oranı | **%50** |
| **Gizlilik kaygısı** | katılımcılar **oybirliğiyle kaygısız** |
| Ama: kurumsal güven belirleyici | *"I would have been happy to give more personal data...if it was a university, but...not if...a commercial pharmacy"* |
| Kayıt başına medyan süre | **12,9 saniye** |
| Uyum: bırakma öncesi %60, sonrası **%39** | düşüyor |
| Eksik bildirim | katılımcılar günlerin **≥%56,2**'sinde eksik bildirdi |
| Terk sebebi | unutmak, telefona erişememek, **sosyal çekince**, amacın belirsizliği — **aşırı yük değil** |

> **Üç ders:**
> 1. **Geofence teknik olarak çalışıyor** (~32 m doğruluk salon tespiti için yeterli).
> 2. **Gizlilik kabulü kurumsal güvene bağlı** — "ticari eczane"ye hayır, "üniversite"ye evet.
>    Biz ticari bir uygulamayız; bu yüzden **veriyi ne için kullandığımızı görünür kılmak**
>    izin oranını doğrudan etkiler.
> 3. **Terk sebebi yük değil, amaç belirsizliği ve sosyal çekince.** Yani "az soru sor"
>    yetmiyor; **"neden sorduğunu söyle"** de gerekiyor.

## D4 · Otomatik veri vs kullanıcı girdisi — hangisine güvenilmeli?

Bu sorunun net bir cevabı var ve kullanıcı sezgisinin tersi.

| Bulgu | Sayı | Kaynak |
| --- | --- | --- |
| Beyan edilen enerji alımı, doubly labeled water'a karşı: iki büyük veri setinde (NDNS + NHANES) yanlış bildirim düzeyi **%27,4** | %27,4 | [Nature Food, 6.497 DLW ölçümünden türetilen denklem](https://www.nature.com/articles/s43016-024-01089-5) |
| Bir çalışmada tüm deneklerde **%20** eksik bildirim | %20 | [Am J Physiol Endocrinol Metab](https://journals.physiology.org/doi/full/10.1152/ajpendo.2001.281.5.E891) |
| **Kontrollü besleme** çalışmasında (yediği bilinen 59 yetişkin, 12 gün): yine de **%5–21** eksik bildirim | %5–21 | [PMC10722558](https://pmc.ncbi.nlm.nih.gov/articles/PMC10722558/) |
| Eksik bildirim BMI, bel çevresi ve yağ kütlesiyle **artıyor** | — | [ScienceDirect, psikososyal yordayıcılar](https://www.sciencedirect.com/science/article/pii/S0002916522039211) |
| Hiçbir öz-bildirim aracı DLW'ye karşı diğerlerinden **daha doğru değil** | — | aynı hat |
| Q Sense: sigara içimini günlerin **≥%56,2**'sinde eksik bildirdi | %56,2 | PMC5045522 |

> **Kritik tasarım sonucu — bu tek başına bir özellik doğuruyor:**
> Kullanıcı girdisi **sistematik olarak ve öngörülebilir yönde yanlıştır** (eksik bildirim,
> %20–27 seviyesinde, ve kilo arttıkça artıyor). Sistem buna göre davranmalı:
> - **Ölçülen sonuç (kilo trendi) > beyan edilen girdi (kalori).** MacroFactor'ün tüm mimarisi
>   bu: harcama ve hedef **kilo trendinden** hesaplanıyor, beyandan değil
>   ([MacroFactor algoritma felsefesi](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/)).
> - Beyan ile ölçüm çeliştiğinde **kullanıcıyı suçlama** — "yanlış giriyorsun" deme. Beyanı
>   *kalibre edilecek bir sinyal* olarak ele al. Bu hem doğru hem de bırakma riskini düşürür.
> - **Kullanıcı otomatik veriye daha çok güveniyor** ama sistem **sonuç ölçümüne** güvenmeli.
>   İkisi aynı şey değil: adım sayacı otomatik ama %29,6 hatalı; kilo trendi "manuel" ama
>   fizik yasasına bağlı.

---

# E · Fotoğraf akışı UX

## E1 · Sektörde yerleşmiş desen: ghost overlay

Bu artık standart. En az 5 ürün aynı deseni uyguluyor:

| Ürün | Ne yapıyor | Kaynak |
| --- | --- | --- |
| **Fitness Camera** | Overlay kamera + **otomatik poz eşleşince deklanşör** (auto pose-match shutter) + AI poz kılavuzu | [Google Play](https://play.google.com/store/apps/details?id=com.fitnesscamera) |
| **PhotoJourney** | Ghost Mode + kamera kılavuzları, aynı çerçeveleme | [App Store](https://apps.apple.com/us/app/-/id6499454966) |
| **GainFrame** | Canlı vizörün üstünde önceki fotoğrafın şeffaf katmanı | [gainframe.app](https://gainframe.app/blog/best-progress-photo-apps/) |
| **EZ Progress** | Önceki kareyi yarı saydam "çapa fotoğraf" olarak sabitleme | [App Store](https://apps.apple.com/dm/app/ez-progress/id6748616451) |
| **Progress Pictures: Then & Now** | Ghost overlay + **ön/arka/yan için vücut siluet şablonları** | [App Store](https://apps.apple.com/cn/app/id6758411454) |

**Eksik olan (fırsat):** hiçbirinde **telefon eğim/açı göstergesi** (jiroskop) belgelenmemiş.
Ghost overlay pozu hizalıyor ama **kamera açısını** hizalamıyor — oysa 5 derecelik eğim farkı
gövde görünümünü belirgin değiştirir. ⚠️ Bunun ölçülmüş etkisi üzerine kaynak bulunamadı,
ama H1-olcum'daki "foto eşiği 1,2 kg yağ" bulgusuyla birlikte düşünüldüğünde: **ölçüm gürültüsünü
azaltan her şey eşiği düşürür.**

## E2 · Mahremiyet — asıl darboğaz burada

| Bulgu | Kaynak |
| --- | --- |
| Vücut dönüşüm görüntüleri **yüksek hassasiyetli kişisel veri**; birçok uygulama yerel fotoğrafları üçüncü taraf sunuculara yüklüyor | [LocalOneLabs derlemesi](https://localonelabs.com/pages/blog/best-fitness-progress-photo-apps) ⚠️ rakip blogu |
| Rekabetin ayrıştığı nokta **"sadece cihazda"** vaadi: Metamorph, SnapTrack, LocalOne Gym Pics — bulut yedeği yok, hesap yok | aynı ⚠️ |
| Bir ürün açıkça: fotoğraflar **ana Fotoğraflar uygulamasına bile girmiyor**, uygulama içinde kalıyor; "hiç kimse erişemez" | [Progress app](https://progresspics.me/) ⚠️ pazarlama |

⚠️ **Kullanıcıların fotoğraf çekmekten kaçınma oranı üzerine hakemli veri bulunamadı.**
Ama pazarın "private" etrafında konumlanması (birden fazla ürün bunu ana satış argümanı
yapmış) talebin varlığına dolaylı kanıt.

## E3 · Sürdürülebilirlik

⚠️ **"Fotoğraf çekmek kaç saniye sürmeli"** üzerine ölçüm **bulunamadı.**
En yakın vekil: Q Sense'te kayıt başına **medyan 12,9 saniye** ve bu "aşırı yük" olarak
görülmedi — terk sebepleri unutmak/erişememek/sosyal çekinceydi. Fotoğraf akışı için
**< 15 saniye** makul bir hedef; ama bu bir çıkarım, ölçüm değil.

**Terk sebeplerinin fotoğrafa çevirisi (Q Sense'ten):**
| Q Sense'teki sebep | Fotoğraf akışındaki karşılığı | Çözüm |
| --- | --- | --- |
| Unutmak | "bugün foto günü" aklına gelmiyor | Sabit gün + tek hatırlatma (bkz. F) |
| Telefona erişememek | — | Fotoğraf zaten telefonla |
| **Sosyal çekince** | Evde yalnız olmama (Levent'in 4 kişilik yurt odası!) | **Esnek pencere**: "bu hafta içinde" — sabit gün değil |
| Amacın belirsizliği | "Neden fotoğraf çekiyorum" | Her fotoğrafta **ne için kullanıldığını** göster |

> Levent'in kendi kısıtı burada birebir geçerli: 4 kişilik yurt odasında haftanın belirli bir
> günü belirli bir saatte yarı çıplak fotoğraf çekmek **mümkün değil.** Sabit gün dayatan
> her tasarım bu kullanıcıyı kaybeder. **Pencere ver, gün dayatma.**

---

# F · Anti-kalıplar

| # | Anti-kalıp | Kanıt | Kaynak |
| --- | --- | --- | --- |
| 1 | **Aşırı bildirim** | Bildirim etkisi zaten **küçük**: 24 saat içinde etkileşim olasılığı sadece **%3,9** artıyor (RR 1,039, %95 GA 1,01–1,08). Hafta sonu %8,7, hafta içi %2,5 (anlamsız). Yani bildirim bütçesi harcanacak kadar değerli değil | [Microrandomized trial, N=1.255, 89 gün, 534 karar noktası (PMC6293241)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6293241/) |
| | (İlginç yan bulgu) | Aynı çalışmada **alışma (habituation) istatistiksel olarak anlamlı değildi** (P=,84) — etki zamanla sönmedi. Yani sorun "etki söner" değil, **etki en baştan küçük** | aynı |
| | ⚠️ Yaygın alıntı | "Fitness uygulaması silenlerin %68'i bildirim yorgunluğunu sebep gösteriyor" — **birincil kaynağı bulunamadı**, vendor blogunda atıfsız | [ContextSDK](https://contextsdk.com/blogposts/avoiding-push-fatigue-common-user-turn-offs) ⚠️ **kullanma** |
| 2 | **Zorunlu alanlar** | Takip sorusunu zorunlu yerine ilgiliyken sormak terk oranını **%39 → %4** düşürmüş (⚠️ atıfsız vendor sayısı). Doğrulanmış olan: SnappyMeal'de kullanıcılar **basit yiyeceklerde soruyu atlayabilmeyi istedi** | [SnappyMeal](https://arxiv.org/html/2511.03907v1) |
| 3 | **Her girdiye anında yorum basma** | Aşağıda F1'de ayrı ele alındı | — |
| 4 | **Yanlış varsayılanla doldurma** | *"it would default to 'how much chicken did you bake' which was frustrating to edit"* — yanlış varsayılanı düzeltmek boş alandan pahalı | SnappyMeal |
| 5 | **Giriş modunu bilmeyen sistem** | Kullanıcı metinle girdiği hâlde **fotoğraf için yazılmış** takip sorusu aldı | SnappyMeal |
| 6 | **Aşırı sözel çekince (hedging)** | Hedge'li tavsiyeye uyum **anlamlı ölçüde düşük**; hedging memnuniyeti ve güven–doğruluk ayrımını **kötüleştirdi**; aşırı hedging **yetkinlik algısını aşındırıyor** | [ACM CUI '26](https://dl.acm.org/doi/10.1145/3816046.3816231) |
| 7 | **Belirsizliği görselleştirmeyi her yere serpmek** | Örneklemin **%52'sinde güven azaldı**, **%56'sında karara güven azaldı**. Belirsizlik göstergesi ücretsiz değil | [Front. Comput. Sci. 2025, N=147](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1464348/full) |
| 8 | **Chat'i GUI'nin yerine koymak** | "Hibrit tuzağı": chat ikame olarak konumlanınca kafa karışıklığı, yavaşlama, benimseme düşüşü. Karmaşık form doldurmayı konuşarak yapmak ileri AI'la bile zor | [NN/g](https://www.nngroup.com/articles/ai-paradigm/) · [Markswebb](https://markswebb.com/insights/conversational-ui-ai-agents-hybrid-trap/) ⚠️ |
| 9 | **Zor iptal (dark pattern)** | FTC, Fitness International'a dava açtı: **online kayıt olunabiliyor ama iptal için** sınırlı hafta içi saatlerinde **salona gitmek ya da taahhütlü mektup** göndermek gerekiyordu | [Goodwin](https://www.goodwinlaw.com/en/insights/publications/2026/02/alerts-practices-ba-ftcs-click-to-cancel-rule-gets-new-life) · [Jones Day](https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses) |
| | Regülasyon durumu (2026 Eylül) | Click-to-Cancel kuralı 2025'te temyizde **iptal edildi** (APA ihlali); FTC Mart 2026'da **ANPRM ile yeniden başlattı**. Kural yürürlükte değil ama FTC **Section 5 ve ROSCA** ile aldatıcı arayüz tasarımını hâlâ kovuşturabiliyor | aynı |
| 10 | **Sahte aciliyet** | ⚠️ Fitness uygulaması bağlamında ölçülmüş kanıt **bulunamadı** | — |

## F1 · "Her girdiye anında yorum basma" — bizim kural: ölç sık, yorumla seyrek

**Bunu uygulayan ürün var mı? Evet — MacroFactor.**

| MacroFactor'ün yaptığı | Kaynak |
| --- | --- |
| Kullanıcı **her gün** tartılır ve **her gün** yer (yüksek frekanslı ölçüm) | [MacroFactor Weight Trend](https://help.macrofactorapp.com/en/articles/21-weight-trend) |
| Ama algoritma **haftada bir** check-in yapar; kullanıcı check-in gününü kendi seçer. Her hafta plan **küçük** ayarlanır | [Check-Ins & Coaching Modules](https://help.macrofactorapp.com/en/articles/247-introduction-to-check-ins-and-coaching-modules) |
| Hesaplamalar **tartı kilosu değil, trend kilosu** üzerinden: *"trend kilosu kullanmak kalori önerilerimizin tartı kilosundaki dalgalanmalara aşırı tepki vererek vahşice sallanmamasını sağlıyor"* | [MacroFactor algoritma felsefesi](https://macrofactor.com/macrofactors-algorithms-and-core-philosophy/) |
| Ayarlamalar **kademeli ve veriye dayalı, günlük dalgalanmaya tepkisel değil** | [ayarlama dokümanı](https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal) |

Bu, "ölç sık / yorumla seyrek"in **ürünleşmiş ve ticari olarak başarılı** kanıtı.
Ayrıca H1-olcum'daki fizikle örtüşüyor: kilo gürültüsü SD 0,42 kg → **günlük yorum matematiksel
olarak gürültüye yorum yapmaktır.**

**"Sessiz kalma → uygulama beni takip etmiyor" riski nasıl yönetilir?**
Doğrudan kanıt **bulunamadı.** Ama üç mekanizma kanıtlardan türetilebilir:

1. **Sessizlik ≠ görünmezlik.** Yorum yapma, ama **kaydettiğini göster.** MacroFactor günlük
   veriyi grafikte gösteriyor, sadece *hüküm vermiyor*. Dashboard'un işlevi tam olarak bu:
   "seni görüyorum" mesajını **konuşmadan** verir. (B1'deki keyhole argümanı: kalıcı görsel
   yüzey chat'ten üstün.)
2. **Sessizliği ilan et.** Q Sense'te terk sebeplerinden biri **"amacın belirsizliği"**ydi.
   Karşılığı: "Bu hafta veri topluyorum, cuma günü değerlendireceğim" demek. Sessizlik
   *açıklanmış* olduğunda ihmal değil, yöntem olarak okunur.
3. **Yorumu tetiğe bağla, takvime değil.** Yorum ancak (a) trend eşiği aşıldığında,
   (b) kullanıcı sorduğunda, (c) plan değişeceğinde çıksın. CAT'in "durma kuralı" mantığının
   yorum tarafına uygulanmış hâli.

---

# G · Somut etkileşim modeli önerisi

Aşağıdaki her karar yukarıdaki bir bulguya bağlı. Bağlanmayan yerde **"kanıt yok, hipotez"**
yazıyor.

## G0 · Bir cümlede model

> **Sistem ölçer, tahmin eder, kararını gösterir; kullanıcı yalnızca onaylar ya da düzeltir.
> Soru, ancak belirsizlik bir kararı değiştirecek kadar yüksekse sorulur ve eşiğe inince durulur.**

Bu, "kullanıcıya form doldurtma" modelinin tersi. Kullanıcının işi **hatırlamak** değil
**tanımak** ([recognition over recall](https://ixdf.org/literature/topics/recognition-vs-recall)).

## G1 · Veri katmanları — hangi veri nasıl gelir

| Katman | Veri | Yöntem | Gerekçe |
| --- | --- | --- | --- |
| **P — Pasif (kullanıcı hiçbir şey yapmaz)** | Adım/hareket **trendi** (mutlak değil), uyku, kalp hızı, egzersiz seansı, kilo (Wi-Fi tartı → HealthKit/Health Connect) | HealthKit / Health Connect okuma | Telefon adımı %29,6 MAPE → sadece trend; Wi-Fi tartı uygulama açtırmıyor |
| **P+ — Pasif bağlam (izin gerekir)** | Salona giriş tespiti (geofence ~32 m yeterli), öğün saati örüntüsü | Geofence + zaman | Q Sense: %97 yakalama, gizlilik kaygısı yok — **ama kurumsal güvene bağlı** |
| **A — Aktif, düşük maliyet (1–3 dokunuş)** | Set/tekrar/kilo, RIR, öğün onayı | Yapılandırılmış, **önceden doldurulmuş** | Salonda hız; ses %0 kullanıldı |
| **A+ — Aktif, serbest (yazılı/fotoğraf)** | Yeni alet, dışarıda öğün, "bugün böyle oldu" | Metin + fotoğraf, ses **opsiyonel** | Uzun kuyruk; SnappyMeal'de atıştırmalıkta metin baskın |
| **T — Talep üzerine (sistem sorar)** | Sadece belirsizlik eşiği aşıldığında | Chat, tek soru | CAT durma kuralı |

**Ses kararı:** ses **var ama varsayılan değil, salonda öne çıkarılmaz.** Araba/mutfak/
yürüyüş bağlamında (telefon kilitli, kullanıcı yalnız) teklif edilir. Kanıt: sahada %0
kullanım + kamusal alanda utanç etkisi.

## G2 · "Veri talebi" motoru — CAT'in fitness'a çevrilmesi

Dört bileşen. Üçü CAT'ten birebir alınabilir.

**1 · Belirsizlik durumu (state).** Her kullanıcı için birkaç gizli değişken ve her birinin
**güven aralığı** tutulur:
`bakım kalorisi` · `gerçek hacim toleransı` · `toparlanma kapasitesi` · `bağlılık örüntüsü` ·
`teknik güvenilirliği (RIR kalibrasyonu)`.

**2 · Soru havuzu + beklenen bilgi kazancı.** Her soru adayı için: bu cevabı almak hangi
değişkenin aralığını ne kadar daraltır? En yüksek kazançlı soru seçilir. CAT'te bu Fisher
bilgisi; bizde başlangıçta **elle kalibre edilmiş bir tablo** yeterli (kara kutu yok kuralı:
tablo Levent tarafından okunabilir olmalı).

**3 · Durma kuralı — asıl tasarım burası.** CAT'in kazancı soru seçmekten değil **susmaktan**
geliyor: 9,98 → 5,58 madde (%44 azalma), kesinlik bedeli T-skorda 0,04–0,58 puan.
Bizim karşılığı: **belirsizlik eşiğin altındaysa soru sorulmaz.**
Ve CAT'in uyarısı da alınır: semptomsuzlarda daha agresif durmak ~3 puan kayma yarattı →
**iyi giden kullanıcıda az sor, ama tamamen kör kalma.**

**4 · Soru bütçesi.** Haftalık üst sınır. Öneri: **normal haftada ≤ 2 soru**, plan
değişikliği/anomali haftasında ≤ 5. Gerekçe: form literatüründe 5→7 alan aralığında maliyet
dikleşiyor (⚠️ o sayılar doğrulanamadı — bütçenin *varlığı* kanıtlı, *değeri* hipotez).
**Bu bütçe ürünün ölçülecek bir metriği olmalı:** soru/hafta ve soru başına yanıt oranı.

**SnappyMeal'in negatif dersi motora yazılı:** "her kayda takip sorusu" hem MAE'yi 123,96 →
153,00 kcal'e **yükseltti** hem yükü azaltmadı. Yani **soru sormak varsayılan değil, istisna.**

## G3 · Doğal dil girişinin mimarisi — çıplak LLM yasak

Kanıt net: ham LLM metinden kalori tahmininde **MAE 652 kcal** (kullanılamaz);
alan-uyarlı + zincirleme akıl yürütme + veritabanı eşlemesiyle **171–191 kcal**.
MacroFactor aynı sonuca ürün tarafından varmış: *LLM tahmin etmesin, veritabanına eşlesin.*

**Zorunlu boru hattı:**
```
serbest metin/ses/foto
  → varlık çıkarımı (egzersiz / yiyecek / miktar / bağlam)
  → KANONİK VERİTABANINA EŞLEME (LLM sayı uydurmaz)
  → her eşleme için güven skoru
  → güven yüksek: sessizce kaydet, kartta göster
  → güven düşük: KARAR VER + alternatif sun (soru sorma)
  → gerçekten çözülemiyorsa: TEK soru (bütçeden düşer)
```

**"Üstten çekmeli alet" vakası — doğru davranış:**

> ✗ Yanlış: *"Emin değilim, hangi aleti kastettiniz?"* → hedging; uyum ve yetkinlik algısı düşer.
> ✗ Yanlış: sessizce "lat pulldown" yazıp geçmek → %20,7 düzeltme oranı görünmez hâle gelir.
> ✓ Doğru: **`Lat pulldown` olarak kaydettim · %85 · [Bu değil mi? → Seated row · Pullover]**

Yani: **karar + nicel güven + tek dokunuşluk çıkış.** Bu formül üç bulgunun kesişimi —
hedging'in zararı (ACM CUI), belirsizlik göstergesinin faydasının koşullu olması
(%48 artıyor/%52 azalıyor), ve "düzenleyebilme"nin en yüksek memnuniyet skoru (4,33/5).

⚠️ **Ölçülmemiş risk:** egzersiz adı eşlemesi için **yayınlanmış hiçbir benchmark yok.**
Beslenmede sayı var (MAE ~120–190 kcal), egzersizde yok
([LLM egzersiz koçluğu değerlendirme derlemesi, PMC12520646](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12520646/):
standart benchmark'lar koçluk için yetersiz). **Bu bir fırsat:** kendi eşleme doğruluğumuzu
ölçüp yayınlamak hem ürünü kalibre eder hem portfolyo kanıtı olur (500 gerçek ifade →
elle etiketlenmiş doğru eşleme → top-1 / top-3 isabet).

## G4 · Chat × Dashboard iş bölümü — nihai tablo

**Ayırıcı ilke (Keyhole Effect'ten):** Bir iş **birden fazla öğeyi aynı anda** görmeyi
gerektiriyorsa **dashboard**. Tek öğelik ya da yapılandırılamayan bir ifade ise **chat**.

| İş | Yüzey | Not |
| --- | --- | --- |
| Rutin kayıt (set/tekrar/kilo) | **Dashboard/yapılandırılmış** | Önceki set önceden dolu; ≤3 dokunuş |
| Düzensiz kayıt (yeni alet, dışarıda öğün) | **Chat/serbest** | Kart olarak geri döner |
| Trend, geçmiş, program konumu | **Dashboard** | Chat'te asla |
| Tek sayı sorusu | **Chat** | Keyhole sorunu yok |
| "Neden böyle karar verdin" | **Karar kartı dashboard'da + chat'te derinleşme** | Karar kalıcı yüzeyde durmalı (doğrulanabilirlik) |
| Plan değişikliği | **Yapılandırılmış onay ekranı** | Chat tetikler, GUI onaylatır (NN/g: AI form üretir, kullanıcı düzenler) |
| Bağlam anlatma ("dizim ağrıyor", "sınav haftası") | **Chat** | Ürünün asıl kazancı; yapılandırılmış arayüz kapsayamaz |
| Sistemin soru sorması | **Chat**, ≤2/hafta | Bütçeli |
| Motivasyon / kriz | **Chat** | — |

**Keşfedilebilirlik zorunluluğu:** chat asla boş bir kutu olmayacak. Her açılışta
**bağlama duyarlı 3 çip** (o günün verisinden türetilmiş). Kanıt: artikülasyon bariyeri +
keşfedilebilirlik literatürü; kullanıcı "1RM tahminim ne oldu" diye sormayı **akıl edemez**.

## G5 · Günlük / haftalık akış

**Antrenman olmayan gün — kullanıcı işi: 0–1 dokunuş**
1. Pasif katman sessizce yazar (tartı, adım trendi, uyku).
2. Dashboard güncellenir. **Yorum yok.**
3. Bildirim yok. (Bildirimin etkisi zaten RR 1,039 — bütçe harcamaya değmez.)

**Antrenman günü — kullanıcı işi: set başına ≤3 dokunuş**
1. Geofence salonu tanır (izin verildiyse) → uygulama bugünün seansını açar. Hatırlatma değil,
   **hazırlık**.
2. Her set önceki değerlerle **önceden dolu**; kullanıcı onaylar ya da değiştirir.
3. Yeni/tanınmayan alet: tek satır yaz → sistem eşler, güven skoruyla gösterir.
4. Seans sonu: **tek** özet kartı. Yorum yok, sadece kayıt teyidi.

**Haftalık check-in — tek gerçek "konuşma" anı**
MacroFactor deseni: kullanıcı **günü kendi seçer**; sistem trend üzerinden değerlendirir,
plan **küçük** ayarlanır, ve **soru bütçesi burada harcanır** (varsa ≤2 soru).
Gerekçe: kilo gürültüsü SD 0,42 kg → günlük yorum matematiksel olarak gürültüye yorumdur.

**Fotoğraf — haftalık pencere, sabit gün değil**
Ghost overlay + siluet şablonu + (fırsat) eğim göstergesi. **Varsayılan: sadece cihazda.**
Gerekçe: sosyal çekince Q Sense'te terk sebebi; Levent'in yurt odası kısıtı birebir aynı.

## G6 · Sessizliği yönetme protokolü

"Yorumla seyrek" kararının bilinen riski: kullanıcı ihmal edildiğini sanır. Üç savunma
(⚠️ mekanizmalar kanıtlardan türetildi, doğrudan test edilmedi):

1. **Kaydettiğini göster, hüküm verme.** Dashboard "seni görüyorum"u konuşmadan söyler.
2. **Sessizliği ilan et.** "Bu hafta veri topluyorum, cuma değerlendiriyorum." Q Sense'te
   terk sebeplerinden biri **amacın belirsizliği**ydi — sessizlik açıklanınca yöntem olur.
3. **Yorumu tetiğe bağla, takvime değil.** Yorum çıkar: trend eşiği aşıldığında · kullanıcı
   sorduğunda · plan değişeceğinde. Aksi hâlde sus.

## G7 · Ölçülecekler (portfolyo kanıtı)

| Metrik | Neden | Referans taban |
| --- | --- | --- |
| Kayıt başına dokunuş / saniye | Asıl vaat bu | Q Sense: medyan 12,9 sn kabul edilebilir bulundu |
| **Düzeltme oranı** | Eşleme kalitesinin gerçek ölçüsü | SnappyMeal: %20,7 |
| Eşleme top-1 / top-3 isabet | Yayınlanmış benchmark yok — kendimiz kuracağız | — |
| Soru/hafta · soru başına yanıt oranı | Bütçe disiplini | hedef ≤2 (hipotez) |
| Pasif/aktif veri oranı | "Az iş" vaadinin sayısı | — |
| Bildirim/hafta | Anti-kalıp #1 | etkisi RR 1,039 |

## G8 · Açık kalan sorular (araştırmada bulunamayanlar)

1. Egzersiz adı eşlemesinde **ölçülmüş doğruluk** — yayın yok.
2. **Kaç yanlış anlaşılmadan sonra kullanıcı bırakır** — tolerans eşiği çalışması yok.
3. Akıllı tartının **günlük tartılma bağlılığına** etkisi — hakemli kanıt yok.
4. Fotoğraf akışında **hedef süre** ve terk oranı — ölçüm yok.
5. Sohbet içi **kart tasarımının** ölçülmüş etkisi — hakemli kaynak yok.
6. **Sahte aciliyet** anti-kalıbının fitness'ta ölçülmüş zararı — yok.
7. Form alan sayısı → dönüşüm sayılarının **birincil kaynakları** — doğrulanamadı.

---

## Kaynak kalitesi özeti

**Güçlü (hakemli / birincil):** SnappyMeal (arXiv:2511.03907) · NHANES LLM beslenme
(arXiv:2509.13268) · PROMIS CAT durdurma kuralları (PMC12681468) · Q Sense (PMC5045522) ·
mikro-randomize bildirim denemesi (PMC6293241) · belirsizlik görselleştirme (Front. Comput.
Sci. 2025, N=147) · DLW eksik bildirim literatürü · adım geçerlilik (PMC11281039)

**Orta (kuram / hakemli ama ampirik değil / çıkar çatışması):** Keyhole Effect
(arXiv:2602.00947, kuram) · NN/g makaleleri (uzman gözlemi) · JMIR AI semptom kontrolcü
karşılaştırması (Avey ekibi dahil) · ACM CUI hedging (tam metne erişilemedi)

**Zayıf (vendor / atıfsız — yön için kullan, sayı için kullanma):** form dönüşüm
benchmark'ları · akıllı tartı karşılaştırmaları · fotoğraf uygulaması derlemeleri ·
"%68 bildirim yorgunluğu" iddiası (**kullanma**)
