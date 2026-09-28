---
title: Faz 1 sentezi — boşluk haritası
tarih: 2026-09-09
kaynak: _ham/A · B · C · D · E · F
durum: Faz 1 kapandı
---
# Faz 1 sentezi — boşluk haritası

## Altı hattın tek cümlede buluştuğu yer

> **Veriyi toplayan çok, karar veren yok.**

Yakınsama kanıtı:

| Hat | Bulgu | Aynı yere çıkıyor |
| --- | --- | --- |
| C | En olgun LLM koç (WHOOP) "vücudunu dinle" diyor. Sebep teknik değil, liability | Karar yok |
| A | MacroFactor TDEE'yi öğreniyor — ama ne yapacağını söylemiyor | Karar yok |
| B | 24 uygulamadan 3'ü gerçek autoregulation yapıyor; antrenman+beslenme+uyku sentezi sıfır | Karar yok |
| E | Denetimli uyum %72-81, denetimsiz %43-67. Uygulamalar denetim *taklidi* yapıyor | Karar yok |
| F | Yargı LLM'de kalırsa sycophancy'ye yeniliyor; koda taşınmalı | Kararın yeri: kod |
| D | Reklam ölü; büyükler regülasyon korkusundan karar vermiyor | Kapı açık |

**Ürün tanımı:** koç sesiyle konuşan bir **karar motoru.** Deterministik yargı katmanı
(kod) + LLM sadece dil/arayüz katmanı. Bu tek mimari kararı aynı anda dört problemi çözüyor:
sycophancy, LLM maliyeti, regülasyon sınırı, tutarlılık.

---

## Kanıtlanmış boşluklar — üç testle puanlanmış

Test: **B**ilimsel fark · **Y**azılımsal fark · **P**azarlanabilir fark. (ilke 10, `01-urun-ilkeleri.md`)

| # | Boşluk | B | Y | P | Kanıt |
| --- | --- | :-: | :-: | :-: | --- |
| 1 | **Karar katmanı** — veriye bakıp karar veren ve arkasında duran sistem | ✅ | ✅ | ✅ | C, E (Sperandei 2016) |
| 2 | **Sycophancy'ye mimari bağışıklık** — "hayır" diyebilen koç | ✅ | ✅ | ✅ | MedPRESS %84,3→%19,9 · ELEPHANT +50p |
| 3 | **Belirsizliği gösterme** — "512 ± 170 kcal", sahte kesinlik yerine | ✅ | ✅ | ✅ | NIH 2026: 250-345 kcal eksik; kimse aralık göstermiyor |
| 4 | **Fotoğraf ⊕ adaptif TDEE çelişkisinin çözümü** | ✅ | ✅ | ➖ | F — literatürde ve üründe hiç konuşulmamış |
| 5 | **Efor bazlı görselleştirme** — aynı yükte fazla tekrar ya da artan RIR, e1RM tırmanışı; total volume değil (29 Eyl düzeltmesi: ilk sürümde "RIR düşüşü" yazıyordu, yanlıştı) | ✅ | ✅ | ✅ | B/6.4 — 24 uygulamanın ana metriği total volume |
| 6 | **Antrenman + beslenme + uyku tek karar** | ✅ | ✅ | ✅ | B/6.2 — en yakını iki ayrı uygulama (MacroFactor) |
| 7 | **Gram sorma** — hatayı %56,6→%20,2 düşürüyor | ✅ | ➖ | ➖ | F — en yüksek etki, en düşük teknoloji, kimsede yok |
| 8 | **Kültürel mutfak** — Türk mutfağı hiç ölçülmemiş | ✅ | ✅ | ✅ | Asya −1520 kJ; Cal AI'da Türkçe yok |
| 9 | **Doğal dille loglama** — teknik çözülmüş, ürünleşmemiş | ➖ | ✅ | ✅ | B/6.3 — Hevy API+MCP kanıtı; ana akımda sıfır |
| 10 | **Uyumsuz kullanıcıya dayanıklılık** — plana uymak ön koşul olmamalı | ✅ | ✅ | ✅ | A/Boşluk 6 · E (program paralysis) |
| 11 | **Gün içi yönlendirme** — kalan kalori değil, ne yapacağını söylemek | ➖ | ✅ | ✅ | F/Bölüm 3 |
| 12 | **Şeffaflık** — "neden bu karar" gösterme | ➖ | ✅ | ✅ | B/7.5 — RP, Fitbod, Juggernaut, Dr. Muscle hepsi kapalı kutu |
| 13 | **Bağımsız doğrulama** — kendi iddiasını test ettiren yok | ✅ | ➖ | ✅ | A/Boşluk 8 — Noom kendi fonlu RCT, Zoe yanlış hipotez test etti |
| 14 | **Metabolik sağlık ⊕ kalori** — ayrı dünyalar | ✅ | ✅ | ⚠️ | A/Boşluk 5 · WEAR-ME (Nature 2026). ⚠️ = regülasyon sınırı, ismini koyma |

**Üç testi de geçen çekirdek:** 1, 2, 3, 5, 6, 8, 10.

---

## Rakip konumu

| Rakip | Güçlü olduğu yer | Kapatmadığı yer |
| --- | --- | --- |
| **MacroFactor + Workouts** ($89,99/yıl) — en tehlikeli | Adaptif TDEE (kategoride tek), bilimsel kredibilite, iki modül | İki ayrı uygulama, uyku yok, foto yok, sohbet yok, **karar yok** |
| Carbon / RP Diet / Avatar | "Adaptive" markası | Kural motoru; uyumsuz kullanıcıyı cezalandırıyor |
| RP Hypertrophy ($299,99/yıl) | Marka sesi | 226 oy, 4.30 puan — marka ≠ kullanıcı tabanı |
| Hevy ($24/yıl) | UX hızı, ölçek, public API | Karar vermiyor, log tutuyor |
| WHOOP / Oura | Gerçek LLM, sensör verisi | "Vücudunu dinle" — karar vermiyor |
| Future / Caliber ($200/ay) | Gerçek karar (insan) | Fiyat; ölçeklenmiyor |

**Arbitraj:** koçluk hizmeti $50-599/ay; koçun kullandığı yazılım müşteri başına $0,4-4/ay.
Değerin tamamı koçun haftada 15-30 dakikalık **yargısında.** Yargı kodlanırsa arbitraj bizim.

---

## Pazar kararı: girilir, ama tek bir yolla

**Lehte:** Health & Fitness install başına gelirde tüm kategorilerin **1.'si** ($0,63/install,
12 ay LTV $1,21). Trial→paid medyan %39,9.

**Aleyhte:** indirme büyümesi %0,8 · D30 retention %4 · uygulamaların **%5'i** iki yılda
$10K gelire ulaşıyor · CPI $4,30-5,50 vs LTV $1,21 → **ücretli reklam matematiksel zarar.**

**Sonuç:** tek işleyen yol organik dağıtım. İki kaynak:
1. **Ürün-kaynaklı** (Hevy modeli): 2 kişi, 75 gün MVP, sıfır reklam, $3/ay → ~$600K/ay
2. **Kanal** (Sweat verisi): 50M topluluk → 450K ödeyen = **%0,9.** $10K MRR ≈ 500 abone
   ≈ %1 dönüşümle 50.000 ilgili izleyici

İkisi birden olan örnek çok az. Bizim planımız ikisi birden.

**Uyarı — iFIT/Sweat dersi:** creator ayrılınca gelir gitti ($100M→$71M, 11 ay).
Ürün kişiye bağlı olmamalı: "Levent'in uygulaması" değil, **"Levent'in kurduğu sistem."**

---

## Regülasyon çerçevesi

Kapsam dışı kalma formülü — üçü birden:
**teşhis iddiası yok · klinik değer taklidi yok · tıbbi eyleme yönlendiren uyarı yok.**

| Kısıt | Karar |
| --- | --- |
| Google Play sağlık app → Organizasyon hesabı + D-U-N-S | **Önce iOS.** Android sonra |
| Apple 5.1.2(i) (13 Kas 2025) — 3. taraf AI'a veri öncesi açık onay | Mimariye ilk günden |
| EU AI Act Md. 50 (2 Ağu 2026) | Aynı gereklilik, tekrar |
| GDPR Art. 9 — özel kategori veri | Ayrı, spesifik rıza akışı |
| FDA General Wellness (6 Oca 2026) + AB MDR Rule 11 | **Klinik terim kullanma** |
| Apple yaş derecelendirmesi | Klinik terim = 13+/16+, kitleyi küçültüyor |

**"İnsülin direnci" çözümü:** kelimeyi kullanma, **bel çevresini ölç ve ona göre karar ver.**
Hoca zaten pratikte bunu yapıyor. Kullanıcı "bel çevren 4 haftada 3 cm düştü, açığı koruyoruz"
görür. Mekanizma arkada çalışır, ismi konmaz. Regülasyon burada bizi kısıtlamıyor,
doğru tasarıma zorluyor.

**Türkiye:** GVK 20/B istisnası — şirketsiz, faturasız, %15 stopaj nihai vergi,
2026 limiti 5.300.000 TL. W-8BEN → Apple kesintisi %30 yerine %0. Bağ-Kur 4/b zorunlu.

---

## Mimari kısıtlar (Faz 6'ya taşınacak)

1. **Yargı kodda, dil LLM'de.** Tek yapısal sycophancy bağışıklığı.
2. **Ağır hesap ucuz, LLM pahalı.** Fitia "Coins" krizi: yıllık premium ödeyene tarif için
   ayrıca coin sattırdı, en büyük kullanıcı isyanı bu oldu.
3. Görüntü maliyeti $0,003-0,016 → 90 foto/ay = **$0,28-1,44/kullanıcı.** Sorun değil.
4. **Ödül fonksiyonu 4 haftalık tutundurmaya bağlanmalı**, 👍'a değil.
5. **"Koç hayır demeli" eval seti + CI.** Regresyon testi olarak.
6. Fotoğraf tahmini **mutlak değer değil, sapması sabit trend** olarak modellenmeli;
   gerçek referans kilo trendi.

---

## Tuzaklar

1. **Sahte kesinlik** — "642 kcal" derken gerçek belirsizlik ±%30-50
2. **"AI arkadaşın" konumlandırması** — FTC şikâyeti + yalnızlık korelasyonu. Koç araçsaldır
3. **Telafi mekaniği** — "yarın 600 az ye" restraint-disinhibition döngüsünü besliyor.
   Sessizce haftalık ortalamaya yay
4. **Bildirim ürün kurtarmaz** — öğle saatinde seyrek bildirim +%8,8, toplam etki +%3,9
5. **Faturalandırma/iptal** — 1 yıldızların en büyük sebebi. Ürünle ilgisiz, güveni yıkıyor

---

## Kanıtlanmış davranış gerçekleri (ürün tasarımının temeli)

- **Sperandei 2016:** salonda %63 üçüncü aydan önce bırakıyor, %4'ten azı 12 ayı geçiyor
- **Denetim etkisi:** denetimli uyum %72-81, aynı kişiler denetimsiz %43-67
- **Zenoti 2026 (n=1.393):** %50'den fazlası iptal etmeden bırakıyor;
  **%80'i "beni geri getirebilecek bir şey vardı" diyor**
- **Payne 2022:** kilo kaybını **eksiksiz** loglama değil, **tutarlı** loglama öngörüyor.
  Hedef 5 gün/hafta; gerçek 2,4 gün/hafta; bağlılık 12 ayda %43→%26
- **PLOS 2024 (18 diyetisyen):** diyetisyenler kalori saymıyor, **örüntü görüyor**
- **Program paralysis:** topluluk kendi adını vermiş; *"Information Feels Like Progress"*

---

## Faz 2'ye taşınan açık sorular

1. Güray Hoca'nın karar ağacı tam olarak nasıl? (eşikler, bekleme süreleri, sıralama)
2. Minimalist hacim yaklaşımının literatürdeki tam sınırı ne? Kime uygun, kime değil?
3. Bel çevresi eşikleri ve hangi hızda değişim beklenir?
4. Kadın kullanıcı / döngü fazı — hoca ne diyor, literatür ne diyor?
5. Baseline öğrenme süresi gerçekten 1 hafta mı, kaç gün gerekiyor?
6. Deload / plato kararı hangi sinyalle veriliyor?
7. Protein hedefi dışında hangi makro kuralları kesin, hangileri esnek?

## Kapanmayan araştırma boşlukları
- Reddit erişilemedi (bloke) — E hattının frekans verisi eksik
- Türk mutfağı foto-kalori doğruluğu: **hiç ölçülmemiş.** Kendi verimizi üretebiliriz
- AI koç vs insan koç karşılaştırmalı retention: hakemli kaynak yok
- Google Play Organizasyon hesabı ↔ GVK 20/B ilişkisi: mali müşavir sorusu
