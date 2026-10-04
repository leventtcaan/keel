# H12 — Enerji dengesi modeli: Hall / NIH Body Weight Planner denklemleri (K-605 spike, literatür)

> Durum: **TAMAMLANDI** · 2026-10-04
> Soru: şekil projeksiyonunun (K-606, U12) kilo sayısı hangi yayımlanmış modelden gelir, model ne kadar yanılır?
> Bağlam: `H2-projeksiyon.md` §2.4 "NIH Body Weight Planner (Kevin Hall), hata ±1,7-2,5 kg" diyordu; bu dosya denklemleri
> birincil kaynaktan çıkarır ve hata payını yeniden okur (aşağıda M8: o sayı başka bir şeyi ölçüyor).
> Doğrulama yöntemi: web eki NIDDK'nın sitesinden PDF olarak indirilip sayfa sayfa okundu; ana metin PMC3880593 (yazar
> el yazması) NCBI E-utilities ile; Dent 2023 tam metni PMC10356859. Hepsi 4 Eki 2026'da açıldı.

---

## M1 · Kaynak ve kapsam

**Ana makale:** Hall KD, Sacks G, Chandramohan D, Chow CC, Wang YC, Gortmaker SL, Swinburn BA. *Quantification of the effect of
energy imbalance on bodyweight.* Lancet 2011;378(9793):826-837. doi:10.1016/S0140-6736(11)60812-X · PMID 21872751 · PMC3880593.

**Denklemler:** aynı makalenin hakemli web eki — *Dynamic Mathematical Model of Body Weight Change in Adults*
(`niddk.nih.gov/-/media/Files/BWP/Hall_Lancet_Web_Appendix.pdf`, 8 sayfa; denklemler s. 1-3, doğrusallaştırma s. 4-5).
NIH Body Weight Planner bu modelin web uygulamasıdır (ek s. 3: "implemented using Java in a web-based simulation tool").

**Kapsam:** yetişkin. Model durum değişkenleri: yağ kütlesi F, yağsız doku L, glikojen G, hücre dışı sıvı ECF, adaptif termogenez AT.
Çıktı: zamana göre vücut ağırlığı. Antrenmanın kas kazanımına etkisi **modelde yok** (yağsız doku yalnız enerji dengesinden
Forbes eğrisiyle ayrılır) — projeksiyon kas kazanımı vaat edemez.

## M2 · Glikojen (ek s. 1, denklem 1)

`ρG · dG/dt = CI − kG · G²`

- ρG = **17,6 MJ/kg** (glikojenin enerji yoğunluğu)
- kG = CIb / G_init² — başlangıç karbonhidrat alımı CIb'de glikojen sabit kalsın diye
- G_init ≈ **0,5 kg** ("at baseline, the body contains ~500 g of glycogen")
- Her gram glikojenle **~2,7 g su** depolanır (McBride 1941) → glikojenin ağırlığa katkısı (1 + 2,7) × G
- Not (keel): CI, alımın karbonhidrat payı. Kararlı durumda G = G_init·√(CI/CIb) — pay sabitse yalnız alım oranına bağlıdır;
  payın kendisi yalnız hızı (saatler-günler) değiştirir.

## M3 · Hücre dışı sıvı (ek s. 1, denklem 2)

`dECF/dt = (1/[Na]) · (ΔNa_diet − ξNa·(ECF − ECF_init) − ξCI·(1 − CI/CIb))`

- [Na] = **3,22 mg/ml** (hücre dışı sodyum yoğunluğu)
- ξNa = **3000 mg/L/gün**, ξCI = **4000 mg/gün** (karbonhidrat alımı değişiminin böbrekten sodyum atımına etkisi)
- ΔNa_diet: diyetteki sodyum değişimi — keel bunu bilmiyor → **0** (varsayım, ADR-051).

## M4 · Enerjinin yağ ve yağsız dokuya bölünmesi (ek s. 2, denklem 3 ve 4)

`ρF · dF/dt = (1 − p) · (EI − EE − ρG·dG/dt)`
`ρL · dL/dt = p · (EI − EE − ρG·dG/dt)`

- ρF = **39,5 MJ/kg**, ρL = **7,6 MJ/kg** (Hall 2008 IJO)
- p = C / (C + F), C = **10,4 kg** × ρL/ρF (Forbes eğrisi, Chow & Hall 2008; Hall 2007)
- **Başlangıç yağ kütlesi** bilinmiyorsa Jackson ve ark. 2002 regresyonu (BW kg, H metre, yaş yıl):
  - Erkek: F = BW/100 · [**0,14**·yaş + **37,31**·ln(BW/H²) − **103,94**]
  - Kadın: F = BW/100 · [**0,14**·yaş + **39,96**·ln(BW/H²) − **102,01**]
- Başlangıç yağsız doku = BW − F − ECF − glikojen ve suyu.
- **keel notu (U4):** F modelin içinde kalır; hiçbir çıktıya, loga ya da ekrana yazılmaz.

## M5 · Enerji harcaması (ek s. 2-3, denklem 5-9)

`EE = K + γF·F + γL·L + δ·BW + TEF + AT + ηL·dL/dt + ηF·dF/dt` (5)

- γF = **13 kJ/kg/gün**, γL = **92 kJ/kg/gün** (dinlenme metabolizmasının yağ ve yağsız kütleye göre eğimi, Nelson 1992)
- ηF = **750 kJ/kg**, ηL = **960 kJ/kg** (yağ ve protein sentezinin biyokimyasal verimi, Hall 2010)
- K: başlangıç enerji dengesinden belirlenen sabit
- TEF = βTEF · ΔEI, βTEF = **0,1** (6)
- τAT · dAT/dt = βAT · ΔEI − AT, βAT = **0,14**, τAT = **14 gün** (7)
- Fiziksel aktivite: δ = [(1 − βTEF) · PAL − 1] · RMR / BW (8); RMR Mifflin-St Jeor (`H6-baslangic-kalori.md` A1 ile aynı
  formül), PAL = toplam harcama / RMR. Sedanter varsayılan PAL 1,5.
- EE, dF/dt ve dL/dt'ye bağlı olduğu için kapalı biçim (9):
  `EE = [K + γF·F + γL·L + δ·BW + TEF + AT + (EI − ρG·dG/dt)·X] / (1 + X)`, X = p·ηL/ρL + (1 − p)·ηF/ρF

**keel türetmesi:** başlangıçta denge (EI = EE = EIb, dG/dt = 0, TEF = AT = 0) → **K = EIb − γF·F0 − γL·L0 − δ·BW0**.
EIb = PAL·RMR, yani keel'de bakım kalorisi (`InitialTarget`, Mifflin × aktivite katsayısı) ile aynı tanım.

## M6 · Zaman ölçeği (ek s. 4-5, denklem 10-17)

İlk birkaç haftadan sonra glikojen ve ECF dengelenir, AT → βAT·ΔEI. İkinci evre doğrusallaşır:
`dBW/dt = ΔEI/ρ − (BW − BW0)/τ`, τ = [ηF + ρF + α(ηL + ρL)] / [γF + δ + α(γL + δ)], α ≈ 10,4 kg / F0 (15).
Sonuçlar: daha çok fiziksel aktivite → τ kısalır; daha çok başlangıç yağı → τ uzar (16) ve aynı ΔEI'de kalıcı kayıp büyür (17).

## M7 · Yayımlanmış örnek değerler (karşılaştırma testinin çıpası)

Ana makale (PMC3880593), şekil 2-3 ve tartışma:
1. **Şekil 3 (web simülatörü ekran görüntüsü):** 100 kg, 180 cm, 23 yaşında, **sedanter** erkek; başlangıç alımı **12,7 MJ/gün**
   (3000 kcal). 6 ayda (180 gün) 20 kg vermek için alım **5 MJ/gün** (1200 kcal) düşürülür; sonra kaybı korumak için kalıcı
   **10,9 MJ/gün** (2600 kcal).
2. **Şekil 2A:** 100 kg sedanter erkek, alımda **2 MJ/gün** (480 kcal) kalıcı düşüş → 10 yıllık simülasyonda **~75 kg**'da plato;
   en büyük kaybın **yarısına ~1 yılda**, **%95'ine ~3 yılda** varılır. Başlangıç harcamasında ±1 MJ/gün belirsizlik birkaç yıl
   sonra **±4 kg** bireysel farka dönüşür (kesik eğriler).
3. **Şekil 2B:** aynı 2 MJ/gün düşüşte 100 kg erkek 80 kg erkekten **daha çok** kalıcı kayıp yaşar ve yarı süresi **daha uzundur**
   (başlangıç yağı fazla).
4. **Başparmak kuralı (ortalama fazla kilolu yetişkin):** alımdaki her **100 kJ/gün** kalıcı değişim sonunda **~1 kg** ağırlık
   değişimi; yarısı ~1 yılda, %95'i ~3 yılda.

## M8 · Hata payı — "±1,7-2,5 kg" yeniden okundu

**Kaynak:** Dent R, Harris N, van Walraven C. *Validity of two weight prediction models for community-living patients participating
in a weight loss program.* Sci Rep 2023;13(1):11629 · doi:10.1038/s41598-023-38683-9 · PMID 37468655 · PMC10356859.

- "±1,7-2,5 kg" bu çalışmanın **kendi** sonucu değil: girişte önceki çalışmalar için "short-term mean absolute errors ranging from
  3.7 to 5.5 lbs (1.7–2.5 kg)" — o çalışmaların bir kısmında alım **gözetim altındaydı** (yatılı).
- **Kendi sonucu** (3701 kişi, ort. BMI 42, 7 hafta, 900 kcal/gün sıvı diyet, uyumsuzlar dışlanmış): NIH-BWP göreli fark
  (gözlenen − beklenen)/beklenen **ort. −%1,5 (SD 3,8)**; **5.-95. yüzdelik −%6,2 … +%3,7**.
- Aynı yazarların aktardığı CALERIE karşılaştırması: 2 yılda NIH-BWP ağırlığı ort. **3,8 kg** az tahmin etti.
- **Sonuç (keel):** gerçek hayatta (alım gözlenmez) hata, gözetimli çalışmaların ±1,7-2,5 kg'ından geniştir ve zamanla büyür. Aralık
  tek bir sabit "± kg" ile değil, modelin kendi belirsizlik kaynağından (başlangıç harcaması, M7-2) **ve** kısa vadeli bir tabanla
  kurulmalıdır (ADR-051).

## M9 · Uygulanabilirlik (keel için)

- **Girdi** keel'de var: cinsiyet, yaş (doğum yılı), boy, ağırlık trendi, bakım kalorisi (RMR × aktivite, `InitialTarget`), plan
  hedefi. Karbonhidrat payı ve sodyum yok → glikojen/ECF yalnız ilk haftaların su payını etkiler (M2 notu), varsayımla.
- **Saf hesap:** adi diferansiyel denklem sistemi; durum 5 değişken, sayısal çözüm (RK4) milisaniyeler. Ağ, model sunucusu yok.
- **Sınırlar:** (a) model enerji dengesidir, kas kazanımını öngörmez; (b) uyum (alımın plana ne kadar uyduğu) modelin dışında —
  senaryo girdisi; (c) doğrulama nüfusu ağırlıklı olarak fazla kilolu/obez yetişkin; zayıf ve çok aktif kişide hata bilinmiyor;
  (d) başlangıç dengesi varsayılır — diyetin ortasındaki kişi için başlangıç durumu ayrıca kurulmalı (ADR-051).

## BULUNAMADI

- Web simülatörünün tam sayısal çıktısı (tablo) — yalnız şekiller ve metindeki yuvarlak değerler; test bu yuvarlak değerlere
  "yaklaşık" toleransla bağlanır.
- NIH-BWP'nin varsayılan karbonhidrat payı ve sodyum varsayımı için birincil yazılı kaynak.
- Normal kilolu, antrenmanlı kişilerde bağımsız doğrulama.
