# ADR-051 · Projeksiyon modeli: Hall 2011 enerji dengesi modeli motorda saf; aralık modelin kendi belirsizliğinden (K-605)
- **Durum:** KABUL (agent, teknik — ADR-019; sayının kaynağı U1/U5, sağlık kapısı ADR-050'de)
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
K-606 şekil projeksiyonu bir kilo sayısı ve aralığı gösterecek (U12, U5). Sayı uydurulamaz (U1): yayımlanmış, doğrulanmış bir modelden
gelmeli. `H2-projeksiyon.md` §2.4 NIH Body Weight Planner'ı (Hall) önerdi ve hata payını "±1,7-2,5 kg" diye aktardı. Spike: denklemler
birincil kaynakta var mı, keel'in verisiyle çalışır mı, ne kadar yanılır — `arastirma/ham/H12-enerji-dengesi-modeli.md`.

## Karar sürücüleri
- U1/U14: her sabit yayımlanmış kaynağa bağlı; yayımlanmış örnek değerlerle sınanabilir.
- ADR-003: motor saf (ağ, saat, rastgelelik yok); aynı girdi her makinede aynı çıktı.
- U5: aralık dürüst — modelin gerçek hatasını küçük göstermez.
- Levent anlatabilmeli: 5 değişkenli bir diferansiyel denklem sistemi, kara kutu değil.

## Karar
1. **Model:** Hall ve ark. 2011 Lancet web eki, denklem 1-9 (glikojen, hücre dışı sıvı, yağ/yağsız bölüşümü Forbes ile, enerji harcaması,
   termik etki, adaptif termogenez) `engine/EnergyBalanceModel` olarak **saf** yazılır. Sayısal çözüm RK4, saatlik adım; `double` +
   `StrictMath` (platformdan bağımsız). Sabitler `data/parameters/projection.yaml` (20 parametre, hepsi `H12#M2-M5`'e çapalı; tek `urun`
   olan karbonhidrat payı). Yeni alan `PROJECTION`, yeni birimler (MJ/kg, kJ/kg, kJ/kg/gün, mg/…, Jackson terimleri `*_internal_only`).
2. **Girdi keel'in kendi tanımları:** bakım = Mifflin × aktivite katsayısı (`InitialTarget`), dinlenme = Mifflin. Hall'un PAL'i bu
   oran (denklem 8). Başlangıç yağı Jackson 2002'den modelin **içinde** kalır; çıktı yalnız ağırlık (U4).
3. **Bilinmeyenler sabit:** diyet sodyumu değişmez; karbonhidrat payı 0,5 (yalnız glikojenin oturma hızını değiştirir, kararlı değeri
   değil — H12 M2).
4. **Projeksiyonun kullanımı (K-606 uygular):**
   - **Başlangıç:** kişi diyetin ortasındaysa (projeksiyon zaten ≥4 hafta / 2 ölçümden sonra), glikojen, sıvı ve adaptif termogenez
     **şimdiki plana oturmuş** başlar — yoksa model ilk haftaların su kaybını ikinci kez sayar (~1 kg iyimser hata).
   - **Aralık:** (a) modelin kendi belirsizlik kaynağı — başlangıç harcaması bilinmiyor (Hall şekil 2A: ±1 MJ/gün → yıllar sonra ±4 kg):
     bakımın keel aralığının iki ucuyla iki koşu; (b) bunun üstüne kısa vadeli taban (gözetimli çalışmaların ortalama mutlak hatasının
     üst ucu, 2,5 kg, H12 M8). Tek "± kg" sabiti **değil**: hata zamanla büyür.
   - **Uyum senaryoları** (%60/%80/%95): modelin dışında, alım girdisi olarak; eşleme K-606'da kararlaştırılır.

## Neden
- **Doğrulama (testler, `EnergyBalanceModelTests`):** Şekil 3'ün tam tanımlı adamı (100 kg, 180 cm, 23 yaş, sedanter; başlangıç 12,65 MJ
  — makale "12,7") 5 MJ/gün eksikle 180 günde **80 ± 1 kg**'a iner, 10,9 MJ/günde 2 yıl **80 ± 1,5**'te kalır; başparmak kuralı
  (100 kJ/gün ≈ 1 kg, fazla kilolu yetişkin) **1 ± 0,25 kg**; Şekil 2B'nin yönü (daha çok yağ → daha çok ve daha yavaş kayıp); kadın, aynı
  harcamada daha çok verir (Jackson). Özellik testleri: bakımda ağırlık sabit (1e-6), az yemek hiçbir gün daha ağır yapmaz, sabit
  açıkta yalnız iner, fazlada yalnız çıkar.
- **Şekil 2A farkı (bilerek kayda):** makale "~75 kg plato" diyor ama adamın boyunu/yaşını vermiyor. Şekil 3'ün adamıyla model **78,1 kg**
  veriyor; 170-185 cm / 23-55 yaş aralığında 75,1-78,7 kg, yarı süre 0,74-0,94 yıl, %95'i 2,9-3,8 yıl. Test bu yüzden her makul kişiyi
  şeklin kendi ±4 kg bandında ve zamanlamada sınar. Ders: kişinin boyu/yaşı bile birkaç kg fark ettiriyor → aralık şart.
- **"±1,7-2,5 kg" yanlış okunmuştu:** Dent 2023'te bu sayı önceki (kısmen yatılı, alımı gözetimli) çalışmaların kısa vadeli ortalama
  mutlak hatası. Gerçek hayatta 7 haftada bile 5.-95. yüzdelik −%6,2…+%3,7; 2 yılda ort. 3,8 kg az tahmin. Sabit ±2,5 kg aralık
  aylar sonrası için yanlış güven verir (U5).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Doğrusallaştırılmış model (denklem 14, tek üstel) | İlk haftaların su/glikojen evresi yok; τ yağ değiştikçe değişir — basit ama keel'in 4 hafta sonrası "ilk evre bitti" varsayımını gizlice yapar. Tam model zaten saf ve hızlı |
| 7700 kcal/kg ("3500 kcal kuralı") | Hall 2011'in açıkça çürüttüğü kural: kaybın yavaşlamasını yok sayar, uzun vadede kaybı katlarca abartır |
| NIH-BWP'yi dışarıdan çağırmak | Genel API yok; ağ = motor saf değil (ADR-003); veri dışarı gider (V) |
| PBRC Weight Loss Predictor | Dent 2023'te NIH-BWP'den daha hatalı (MSE 117,7 vs 98,8) |
| Sabit ±2,5 kg aralık | Hata zamanla büyür; yukarıda |

## Sonuçlar
Olumlu: sayı kaynaklı, sınanmış, cihazsız/ağsız; kişi kendi boyu/yaşı/bakımıyla hesaplanır. Olumsuz (kabul edilen bedel): (a) model kas
kazanımını öngörmez — bulk projeksiyonu yalnız enerji dengesi der (K-606 metni "kas" vaat etmez); (b) doğrulama nüfusu ağırlıkla fazla
kilolu; zayıf/antrenmanlı kişide hata bilinmiyor → aralık geniş, BMI<20'de zayıflama kapalı (ADR-050); (c) `double` aritmetiği motorun
geri kalanındaki `BigDecimal`'den farklı — sonuç K-606'da gösterim hassasiyetine yuvarlanır.

## Geri dönmenin maliyeti
Düşük: tek saf sınıf + bir parametre dosyası; projeksiyon yalnız bunu okur, karar motoru okumaz (projeksiyon karar değildir — U1).

## Etkilenen
`engine/EnergyBalanceModel.java`, `engine/ParameterKey`, `engine/ParameterDomain` (+PROJECTION), `engine/Unit`, `data/parameters/projection.yaml`,
`arastirma/ham/H12-enerji-dengesi-modeli.md`; K-606 (kullanıcı); `H2-projeksiyon.md`'nin hata payı cümlesi H12 M8 ile düzeltilmiş okunur.

## Doğrulama
`EnergyBalanceModelTests` (yayımlanmış örnekler + özellikler), `ParametersLoaderTests`, `ParameterProvenanceTests`, `SourceAnchorTests`,
`EnginePurityTests` (saflık).
