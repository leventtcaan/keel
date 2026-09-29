# H7 — Bir öğünün kalorisi neden aralıktır: miktar hatası ve veri hatası (literatür)

> Durum: **TAMAMLANDI** · 2026-09-30 (K-208 için)
> Soru: Kullanıcı "200 g tavuk göğsü" ya da "bir tabak pilav" yazdığında, veritabanındaki tek sayıdan (FDC, 100 g'da kcal)
> dürüst bir **aralık** nasıl çıkar (U5: tahmin daima aralık)?
> Doğrulama: her sayı aşağıdaki URL'de açılıp okundu (PMC tam metin, eCFR resmî metin). `[doğrulanmadı]` işaretli olan okunmadı.

---

## 1 · Aralığın iki kaynağı
Bir kaydın kalorisi = **miktar** × **birim başına enerji**. İkisi de hatalı:
1. **Miktar hatası** — kullanıcının gramı ne kadar bildiği: tarttı mı, kaşık/bardakla mı ölçtü, göz kararı mı?
2. **Veri hatası** — veritabanındaki 100 g değerinin o yiyeceğin gerçeğinden ne kadar saptığı: etiket mi, analiz ortalaması mı?

Aralık, ikisinin çarpımı: `[m × (1 − a) × e × (1 − dₐ), m × (1 + a) × e × (1 + dᵤ)]` (m miktar, e enerji yoğunluğu, a miktar
hatası oranı, dₐ/dᵤ veri hatasının alt/üst oranı). Çarpım bilerek muhafazakâr: iki hatanın aynı yöne gittiği en kötü durum.

## 2 · Göz kararı (miktar tahmini)
Nutrition5k (Thames ve ark., CVPR 2021; bu depoda `F-surtunme-ve-his.md` §1.1): tabakların bileşenleri tartılmış; aynı
fotoğraflardan **uzman olmayan insan ortalama %53, profesyonel diyetisyen %41** kalori hatası yaptı. Hata ağırlıkla
porsiyondan geliyor (§1.0: "Porsiyon/kütle tahmini çözülmemiş"). Ağırlık bilgisi verilince model hatası yarıdan fazla
düşüyor (§1.4c).
→ **Göz kararı miktar ±%50** (uzman olmayanın ortalama hatası, yuvarlanmış). Ortalama hata olduğu için bazı kayıtlar bunu
aşar; aralık "tipik yayılım", kesin sınır değil.

## 3 · Kaşık / bardak (ev ölçüsü)
Gibson, Hsu, Rangan ve ark. 2016, *Journal of Nutritional Science* 5:e29 ("Accuracy of hands v. household measures as
portion size estimation aids", https://pmc.ncbi.nlm.nih.gov/articles/PMC4976119/): 67 katılımcı, 42 tartılmış yiyecek.
Ev ölçüleriyle (kaşık/bardak) yapılan tahminlerin yalnız **%29'u gerçek ağırlığın ±%25'i içinde**, %8'i ±%10 içinde.
→ Ev ölçüsü göz kararından iyi ama sanıldığı kadar değil. **Ev ölçüsü miktar ±%25** seçildi; çalışmaya göre tahminlerin
çoğu bunun **dışında** kalıyor, yani bu değer iyimser tarafta. Onay listesinde (`tag: urun`).

## 4 · Tartı
Mutfak tartısında miktar hatası birkaç gram; 150-300 g'lık porsiyonda %1-2. Tabakta kalan, pişince değişen ağırlık (çiğ/
pişmiş) daha büyük sapma getirir `[doğrulanmadı: çiğ/pişmiş dönüşüm hatası için kaynak okunmadı]`.
→ **Tartılmış miktar ±%5** — ölçümden değil tartının ve çiğ/pişmiş karışıklığının payından seçildi (`tag: urun`).

## 5 · Etiket değeri (FDC Branded)
ABD mevzuatı, 21 CFR 101.9(g)(5) (https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9):
kalori, toplam yağ, şeker, doymuş yağ… için ürün, gerçek içerik etiketteki değeri **%20'den fazla aşarsa** yanlış etiketli
sayılır. (g)(4): protein, toplam karbonhidrat gibi "Class II" besinler etiketin **en az %80'i** olmalı.
→ Sınır tek yönlü ve besine göre farklı: **enerji ve yağda** gerçek değer etiketin en fazla %20 üstünde (alt sınır yok:
fazla beyan tüketiciyi yanıltmaz) → aralık `[etiket, etiket × 1,20]`; **protein ve karbonhidratta** gerçek değer etiketin
en az %80'i (üst sınır yok) → aralık `[etiket × 0,80, etiket]`. Tek parametre: `label_value_tolerance_ratio` = 0,20.

## 6 · Analiz ortalaması (FDC Foundation, SR Legacy)
Laboratuvar analizi ortalaması; aynı yiyeceğin örnekleri arasında doğal değişkenlik var (çeşit, mevsim, yağ oranı)
`[doğrulanmadı: FDC Foundation örnek-içi değişkenliği için sayısal kaynak okunmadı]`.
→ **Analiz verisi ±%10** (`tag: urun`, onay listesinde; kaynak bulunana kadar seçim).

## 7 · Gram sorusu
Belirsizlik büyük ve öğün günü domine ediyorsa kullanıcıya "kaç gram?" sorulur (K-208 kabulü). Ağırlık bilgisi hatayı
yarıdan fazla düşürüyor (§2, F §1.4c) — sorulacak tek soru bu. Eşik yeni bir sayı değil: **tek bir kalemin aralık
genişliği motorun en küçük kalori adımına (`bulk_step_kcal`, 250 kcal) ulaşırsa** sor — o kalemin belirsizliği tek başına
bir karar adımı kadar demektir. Tartılmış kalem için sorulmaz; soru en geniş aralıklı kalem için, en fazla bir tane.

## Karar motoru için özet
| Parametre | Değer | Kaynak | Etiket |
|---|---|---|---|
| amount_error_estimated_ratio | 0.50 | §2 Nutrition5k | literatür |
| amount_error_measured_ratio | 0.25 | §3 Gibson 2016 | ürün (iyimser) |
| amount_error_weighed_ratio | 0.05 | §4 | ürün |
| label_value_tolerance_ratio | 0.20 | §5 21 CFR 101.9(g)(4)-(5) | literatür (mevzuat) |
| analysed_value_error_ratio | 0.10 | §6 | ürün |
| (gram sorusu eşiği) | bulk_step_kcal | §7 | mevcut parametre |
