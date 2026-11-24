# Evre 8 · Motor önerileri K-1203, K-1204, K-1205 (TASLAK, Levent onayı bekliyor)

> 24 Kas 2026. Kod yazılmadı. Tarihler ve senaryo etkileri koddan/GS dosyasından **elle türetildi, çalıştırılmadı** `[doğrulanmadı]`.
> Gün 1 = plan başlangıcı; check-in her 7. günün sonunda. Uyarı: üç öneri tek zincir (K-1204 → K-1205), K-1203 bağımsız.

## K-1203 · İlk açık 1. günden

**1. Bugün.** Kesim planı bakım tahminiyle başlar (`InitialTarget.java:57-67`, 14 gün erkek / 28 kadın). `DataSufficiency.java:53,58`:
ilk 14 gün yorum yok, plan 21 günlük pencereyi doldurmadan karar yok. Düz kilolu erkekte ilk açık 3. check-in'de (gün 21, uygulama gün 22),
o açığın ilk okunuşu gün 42 (GS-21 ile aynı akış; denetimin "5./7. hafta"sı bundan biraz geç).

**2. Önerilen kural.** Kesimde plan, bakım tahmininin `initial_cut_deficit_kcal` altından başlar; gözlem durmaz, açığın üstünde çalışır.
Hedef `CalorieLadder.floor` (BMR, düşük enerji, makro tabanları) ve haftalık kayıp tavanı altına inemez; inecekse bakımdan başlar (bugünkü davranış).
Kadında yağ tahmini yoksa bakımdan başlar (GS-38, ADR-027 #11b). Hafta 1'in suyu/glikojeni yorumu bozar: pencere açılışın 7. gününden sayılır.

| Parametre | Değer | Birim | Etiket |
|---|---|---|---|
| `initial_cut_deficit_kcal` | 500 | kcal/gün | tecrube |
| `deficit_start_skip_days` | 7 | gün | literatur |
| koşul | açık/7 ≤ min(1 kg, %1 VA) | | türetilmiş |

**3. KAYNAK.** **Güray K-8 bu öneriyle ÇELİŞİR:** G2 `#K-8` "kalori düşürmeye ancak bu bulunduktan sonra başlanır"; `03 §2.2` "Formül YOK. Gözlem var";
G2 karar tablosu "2 hafta üst üste kilo aynı → Maintenance bulundu, açık oluşturmaya geç". U14: Güray kazanır, yani **bu öneri Levent'in açık geçersiz kılmasıyla
ve ADR ile** girebilir. Destek: açık büyüklüğü G2 `#K-14` (500-600 kcal) ve G7 `#K-97` (en az 500) `[tecrübe]`; kilo izlemenin formül hatasını düzelttiği
H6 `#A4` (Thomas 2010: 41 ± 118 kcal/gün; Sanghvi 2015) `[literatür]`; ilk hafta su/glikojen: G2 `#K-19`, H12 `#M2` (0,5 kg glikojen × 3,7). "Açığa 1. günden başla" diyen
doğrudan kaynak **yok** `[kaynak yok]`; gerekli: açıkla başlayan kullanıcıda gözlemle maintenance bulmayı doğrulayan çalışma (MacroFactor/Thomas 2014, H6'da `[doğrulanmadı]`).

**4. Persona (erkek 80 kg).**

| Persona | Bugün | Öneri |
|---|---|---|
| 4 tartı/hafta | açık gün 22, ilk okuma gün 42 | açık gün 1, ilk okuma gün 28 |
| 1 tartı/hafta, 3/7 öğün | açık hiç (karar yok) | açık gün 1, geri bildirimsiz (bkz. K-1204) |
| Yeni başlayan gün 1/7/14 | gün 1 bakım; 7 observing; 14 window_not_full | gün 1 açıklı plan; 7 ve 14 "henüz karar yok"; ilk okuma gün 28 |
| 3 hafta durgun | ikinci adım gün 43 | ikinci adım gün 29 |

**5. K1 listesi.** Cut'taki bütün `observing` beklentileri (GS-01…09, 19-27, 38, 39 ve cut olan diğerleri; bulk GS-10…18 etkilenmez), başlangıç sayıları (2848 → 2348),
GS-21 (BMR tabanı hafta 6 yerine hafta 3-4), GS-08/38 (enerji tabanı, yağ tahmini), `InitialTargetTests`, `DeficitStartTests`, `DataSufficiencyTests` (pencere +7).

**6. Güvenlik.** SafetyNet önce çalışır (U13), kod değişmez. İlk 14 günde kayıp tavanı ölçülemez (`SafetyNet.java:168`); bu yüzden 500 ≤ tavan×1000 şartı (50 kg altı bakımdan başlar).
Düşük enerji tabanı ve BMR tabanı aynen; kadın gözlem kuralı (28 gün) aynen.

**7. Levent'e soru.** Güray K-8'i ("açık, bakım bulunduktan sonra") bu iş için geçersiz kılıyor muyuz? **(a)** Evet, 500 kcal açıkla 1. günden · **(b)** Hayır, K-8 kalsın (yalnız K-1204 ile bekleme kısalır) · **(c)** Yalnız kullanıcı "hemen başla" derse.

## K-1204 · Esnek veri yeterliliği

**1. Bugün.** Pencerenin her 7 günlük bloğu ≥ `min_weighins_per_week` 4 tartı (`DataSufficiency.java:62-69`, `windows.yaml:31`). Tek kaçan sabah 3 check-in'i düşürür (`earliestEnoughDay`, GS-26/39);
haftada 1-2 tartan sonsuza dek `data_insufficient` (GS-20). Kayıp tavanı da yoğun veri ister (`SafetyNet.java:168`).

**2. Önerilen kural.** (i) Her haftada en az 1 tartı (boş hafta ortalama vermez). (ii) Gürültü payı kenar haftaların gerçek tartı sayısına göre:
`margin = 0,58 × √((1/n_ilk + 1/n_son) / 0,5)`, n en çok 4 sayılır (yoğun veri bugünkü 0,58'i korur). (iii) Pay/(hafta−1) ≤ `detectable_rate_kg_per_week` olana kadar pencere
birer hafta uzar (en çok 6); yetmezse gerçek "henüz karar yok" (U3). (iv) Spine ve "sabit" tanımı aynı payı okur.

| Kenar haftalarda tartı | pay (kg) | pencere (erkek) | ilk karar (planla başlayan) |
|---|---|---|---|
| 4 + 4 | 0,58 | 3 hafta | hafta 3 |
| 3 + 3 | 0,67 | 3 hafta | hafta 3 (bugün: yok, hafta 5) |
| 2 + 2 | 0,82 | 4 hafta | hafta 4 |
| 1 + 1 | 1,16 | 5 hafta | hafta 5 |

| Parametre | Değer | Birim | Etiket |
|---|---|---|---|
| `min_weighins_floor_per_week` | 1 | tartı/hafta | urun |
| `full_margin_weighins` (eski `min_weighins_per_week`) | 4 | tartı | literatur (ADR-020) |
| `detectable_rate_kg_per_week` | 0,34 | kg/hafta | urun (3+3 tartıda pay/2 = 0,335) |
| `decision_window_max_weeks` | 6 | hafta | urun |

**3. KAYNAK.** Güray tartı sıklığı hakkında **sessiz**: G2 B-7 "günlük tartı mı, haftalık ortalama mı hiçbir yerde geçmiyor"; yalnız K-3 (haftalık sabit gün) ve `03 §8` ("her sabah tartıl").
Dayanak literatür: H1 `§3.4` (1 günlük fark SD %0,53; 7 günlük %0,69) ve ADR-020 L-10 türetimi (1,96 · 0,42 · √(2/n)); formülün n'e genellenmesi **türetilmiştir**, atıf değildir.
0,34 ve 6 için kaynak yok `[kaynak yok]` (ürün seçimi, notunda söylenir). Gerekli: seyrek tartıda trend doğruluğunu ölçen çalışma (H1 `§3.4` MacroFactor "3. gün başlar, ~30 günde olgunlaşır" yalnız ticari beyan).

**4. Persona.** 4/hafta: değişmez. **1/hafta:** bugün hiç; öneriyle hafta 5 (K-1203 (a) de gelirse okuma gün 42). **3/hafta, bir bloğu kaçak:** hafta 5 → hafta 4 (GS-39). Yeni başlayan: gün 1-14 aynı.
Durgun 3 hafta: aynı. Seyrek tartanda "durgun" yanlış pozitif riski var: pay büyüdükçe "sabit" okuması kolaylaşır; bu yüzden (iii) pencereyi uzatır, payı büyütüp bırakmaz.

**5. K1 listesi.** GS-20 (sonsuz `data_insufficient` biter), GS-26, GS-27, GS-39 (+ GS-11 güven seviyesi), `DataSufficiencyTests`, `WeeklySpineTests` (tek sabit pay), ADR-089 sayacı "N of 4" ve `weighInWeek.needed`.

**6. Güvenlik.** SafetyNet kayıp tavanı yoğun veri şartıyla kalır; ama seyrek tartan artık karar alır ve GS-27'deki (haftada 1,2 kg) koruma yalnız 8 haftalık kayıpta tetiklenir.
**Şart:** seyrek veride tavan, `hız − pay/(hafta−1) > tavan` ise (kesinlikle aştıysa) tetiklenir. Bu SafetyNet değişikliği ayrı onay ister.

**7. Levent'e soru.** Seyrek tartana ne olsun? **(a)** Pencere uzar, 1 tartı/haftaya kadar karar (önerilen) · **(b)** Alt sınır 2 tartı/hafta · **(c)** Kural aynı, yalnız tek kaçan sabah tolerans (3+3).

## K-1205 · Kiloya oranlı hedef kayıp hızı ve adım büyüklüğü (M8)

**1. Bugün.** "Hareket" = pencere farkı > 0,58 kg (`WeeklySpine.java:76`, `windows.yaml:49`), ≈0,3 kg/hafta, kiloya bağlı değil; 90 kg'da 0,3 kg/hafta sonsuza dek "devam" (ADR-027 #0, GS-23).
Adım sabit 500 (`CalorieLadder.java:62`, `cut_step_min_kcal`). Tavan zaten kiloya oranlı: min(1 kg, %1 VA) (`SafetyNet.java:242`).

**2. Önerilen kural.** Cut'ta hareket ediyor ama hız < `pace_floor` (kg/hafta = oran × trend kilosu) ise: uyum ≥ %70 ve antrenman düşmüyorsa (bugünkü kapılar) kalori adımı, gerekçe `below_target_pace`.
Adım **sabit 500 kalır** (K-97'nin "en az 500"ü); yerine koruma: `hız + 500×7/7000 > tavan` ise adım atılmaz, `continue/pace_step_past_cap`. Hız = (ilk − son haftalık ortalama)/(hafta−1).

| Parametre | Değer | Birim | Etiket |
|---|---|---|---|
| `cut_pace_floor_pct_bodyweight` (yağ tahmini ≥ %15 ya da yok) | 0,005 | VA/hafta | literatur |
| aynı, %12-15 | 0,004 | VA/hafta | tecrube |
| `cut_pace_floor_kg_lean` (< %12) | 0,10 | kg/hafta | tecrube |
| `kcal_per_kg_fat` | 7000 | kcal/kg | tecrube |

**3. KAYNAK.** Hedef hız: **Güray G2 `#K-15`** (yağ oranına göre %1-1,25 / ~%1 / ~%0,7 / %0,4-0,5 / 100-150 g) `[tecrübe]`; ama G2 "konuşmacı belirsiz — konuğun kendi infografiği", `03 §2.5` "doğrulanmalı".
Güray satırları 0,7-1,25 olduğundan tabanı Güray'ın **alt ucu + literatür** olarak aldım: H3 `#B3` "hedef kayıp hızı %0,5-1,0 VA/hafta (Helms 2014)" `[literatür]`; %12-15 ve < %12 için K-15 aynen. Tavan G2 `#K-17` ve H3 Ç1, SafetyNet'te zaten.
Adım: G7 `#K-97` ("300-400 gürültüdür, en az 500") `[tecrübe]` kazanır; H3 `#B3` "%5-10 alımdan, 100-250 kcal, yüzde mi mutlak mı → yüzde" `[literatür]` çelişir, kullanılmadı. 1 kg ≈ 7000 kcal: G2 `#K-18`. (`energy_per_kg_weight_change` 7700'ün notu karar kuralında kullanmayı yasaklar.)

**4. Persona (80 kg erkek, 4 tartı).** Taban 0,40 kg/hafta, tavan 0,80; adım ancak hız ≤ 0,30 iken geçer (0,30+0,50 ≤ 0,80). Yani 80 kg'da pratik etki **neredeyse sıfır**: 0,30-0,40 arası "devam" kalır, < 0,29 zaten durgun sayılıyor.
Etki ≥ 90 kg'da: 0,3-0,4 kg/hafta kayıp artık "devam" değil (90 kg: taban 0,45, adım hız ≤ 0,40'ta). Tarih: karar anı K-1204 ile aynı; durgun 3 hafta için değişmez. Hız tahmin hatası 3 haftalık pencerede ≈ ±0,15 kg/hafta (1σ): sınırda yazı-tura; bu yüzden koruma ve uyum kapısı şart.

**5. K1 listesi.** GS-23 (0,29 kg/hafta: `continue` → `adjust_calories:-500`; ADR-027 #0'ın bilinçli kararını tersine çevirir), GS-39 (0,4 kg/hafta @87 kg, hafta 5-6) ve 0,4 kg/hafta altı diğer cut senaryoları (elle taranmalı), `WeeklySpineTests`, `CalorieLadderTests` (koruma).

**6. Güvenlik.** Tavan (`min(1 kg, %1 VA)`), düşük enerji, BMR tabanları aynen önce çalışır; yeni adım yalnız bu kontrollerden **sonra** ve tavanı aşacaksa hiç atılmaz. GS-25'teki (adım → tavan geri verir) salınım bu korumayla önlenir.

**7. Levent'e soru.** **(a)** Taban ve koruma önerildiği gibi, adım 500 sabit (önerilen) · **(b)** Adım kiloya göre ölçeklensin (hafif kişide < 500; Güray K-97'yi geçersiz kılar, H3 B3 %5-10 kullanılır) · **(c)** Hedef hız yok, mevcut "hareket ediyor" kalsın. Ayrıca: GS-23'ün (yavaş kaybeden "hareket ediyor") tersine dönmesini kabul ediyor musun?
