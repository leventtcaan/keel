# H8 · İç yağ tahmini: referans görsel + bel/boy (RFM) — kaynak notu (K-224, ADR-027 #11)

> Salt okunur kaynak. U4: bu tahmin **yalnız motorun içinde** kullanılır; hiçbir yerde sayı olarak gösterilmez.

## A. Bel/boy'dan: Relative Fat Mass (RFM)
**Kaynak:** Woolcott OO, Bergman RN. *Relative fat mass (RFM) as a new estimator of whole-body fat percentage ─ A
cross-sectional study in American adult individuals.* Scientific Reports 2018;8:10980. doi:10.1038/s41598-018-29362-1,
PMID 30030479, PMCID PMC6054651 (Europe PMC tam metninden okundu, 30 Eyl 2026).

### A1 · Denklem
**RFM = 64 − (20 × boy / bel) + (12 × cinsiyet)**; cinsiyet: erkek 0, kadın 1; boy ve bel aynı birimde. Geliştirme NHANES
1999-2004 (n = 12.581), doğrulama NHANES 2005-2006 (n = 3.456); referans yöntem **DXA**.

### A2 · Doğruluk
- R² (doğrulama): kadın 0,69, erkek 0,75 (BMI: 0,65 / 0,61).
- Yanlılık (medyan fark): kadın +0,9, erkek +0,5 yüzde puanı.
- Kesinlik (farkın çeyrekler arası genişliği, IQR): **kadın 4,9, erkek 4,2 puan**.
- Doğruluk (DXA'dan göreli farkı < %20 olan oran): kadın %91,5, erkek %88,9.
- Sınırlılık (makalenin kendisi): DXA dört bölmeli yönteme göre düşük yağda ve erkekte **az**, yüksek yağda ve kadında
  **fazla** ölçer.

### A3 · Ürün için türetme (TÜRETİLMİŞ — kaynakta yok)
IQR = 1,349 σ (normal dağılım varsayımı) → σ ≈ erkek 3,1, kadın 3,6 puan; %90 bant ≈ ± 1,645 σ → **erkek ±5, kadın ±6
puan**. Tek sayı değil bant (U5); "kaba bant yalnız kapı için" (ADR-027 #11) bu genişlikle okunur.

## B. Referans görselden (göbek testi)
**Kaynak:** `arastirma/04-faz3-urun.md` Ö-4 ("yağ oranı görsel proxy ile: %20 tavan (göbek testi), %15-20 bant, %12
fit") ve `arastirma/ham/guray/G6-eski-arsiv.md` K-7/K-9 (göbek testi, sayı yerine görüntü). Kadında +10 puan (J1 B1).
Görseller bir **varlık** konusudur (lisans, çekim: M3/M4); sunucu yalnız seçilen **seviyeyi** saklar.

## C. İkisi çelişince
ADR-027 #11: "temkinli olan". Motorun bu sayıyı okuyan kuralları (LEA, L-4 alt yağ sınırı, surplus bölgesine dönüş)
**düşük** tahminde daha korumacı davranır (daha az yağsız kütle değil — daha çok: düşük yağ → yüksek yağsız kütle → düşük
enerji uygunluğu → daha erken güvenlik). Bu yüzden iki tahmin varken **küçüğü** kullanılır. Bulk tavanı (yüksek yağda
cut'a dönüş) bu seçimde biraz geç kalabilir: sağlık değil verim konusu, bilinçli bedel.
