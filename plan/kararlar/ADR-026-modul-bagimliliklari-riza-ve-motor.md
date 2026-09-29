# ADR-026 · Modül haritası güncellemesi: sağlık verisi tutan modüller rıza kapısını, ölçüm motoru kullanır
- **Durum:** KABUL (teknik, agent — ADR-019; ADR-015'in tablosunu değiştirir)
- **Tarih:** 2026-09-30 · **Karar veren:** agent

## Bağlam
ADR-007 madde 3(a): sağlık verisi işleme ayrı rızaya bağlı; V3 sağlık verisini sayar: kilo, ölçü, uyku, nabız,
beslenme, fotoğraf. K-204 `ConsentGate`'i kurdu. Onu çağırması gereken modüller ADR-015'te `consent`'e bağlanamıyor.
K-206'nın kabul kriteri: "Trend sorgusu motorun trend fonksiyonunu kullanır" — `measurement` `engine`'e bağlanamıyor.
Motor parametreleri (`data/parameters/*.yaml`) çalışma anında yüklenmiyordu (yalnız testler okuyordu).

## Karar
1. **İzinli bağımlılıklar:** `measurement` → profile, **consent, engine** · `nutrition` → profile, **consent** ·
   `decision` → engine, profile, measurement, nutrition, training, **consent**. (Diğer satırlar aynı.)
2. **Sağlık verisi uç noktaları** her istekte `ConsentGate.require(account, HEALTH_DATA)` çağırır; yoksa 403
   CONSENT_REQUIRED. Kapsam: kilo, bel, fotoğraf kontrolü, aktivite günü (adım/uyku/enerji), trend; öğünler (K-209),
   check-in cevapları (K-213). Profil (boy, cinsiyet, doğum yılı) V3 listesinde değil → kapısız.
3. **Motor parametreleri çalışma anında:** Gradle `data/parameters/*.yaml`'ı sınıf yoluna (`data/parameters/`) kopyalar;
   modül dışındaki kök yapılandırma (`app.keel.EngineParametersConfiguration`) tek bir `ParameterSet` bean'i yükler
   (motor Spring'siz kalır, ADR-003). Sürüm karması (`versionHash`) kararlarla saklanacak (K-212).

## Neden
Rıza kapısı özelliğin kendisinde, her istekte: geri alma anında etkili (GDPR Md. 7(3)). Motorun trend fonksiyonunu
kullanmak, ekrandaki trendle kararın trendini aynı kılar (tek tanım). Kök yapılandırma, motorun saflığını bozmadan
tüm modüllere aynı parametreleri verir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Merkezi yol listesiyle rıza filtresi | Hangi uç noktanın kapılı olduğu kodda görünmez; yeni uç nokta sessizce kapısız kalır |
| Trendi ölçüm modülünde yeniden yazmak | İki tanım zamanla ayrışır; ekran ile karar farklı trend gösterir |
| Parametreleri `decision` modülünde yüklemek | `measurement` `decision`'a bağlanamaz (döngü) |

## Geri dönmenin maliyeti
Düşük.

## Etkilenen
`measurement`, `nutrition`, `decision` package-info; `ModularityTests`; `build.gradle.kts`; ADR-015 tablosu.

## Ek (30 Eyl 2026, K-211)
`training` → **engine** eklendi (`training` → profile, engine). Program üretimi motorun parametrelerini okur (tekrar
aralığı, hedef RIR: `data/parameters/training.yaml`); motor saf olduğu için döngü yok, `measurement` → engine ile aynı
gerekçe. Motorun karar fonksiyonlarını training çağırmaz; kararı `decision` verir.

## Ek (30 Eyl 2026, K-208)
`nutrition` → **engine** eklendi (`nutrition` → profile, consent, engine): besin aralığının oranları (miktar ve veri hatası,
`arastirma/ham/H7-besin-araligi.md`) motorun parametre dosyasında (`nutrition.yaml`), gram sorusu eşiği motorun en küçük
kalori adımı (`bulk_step_kcal`). Besin araması ve tahmin **rıza istemez**: hiçbir şey saklanmaz, dışarı gitmez; öğün kaydı
(K-209) sağlık verisidir ve HEALTH_DATA ister.
