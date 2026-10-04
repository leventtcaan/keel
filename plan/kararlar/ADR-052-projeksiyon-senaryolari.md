# ADR-052 · Projeksiyonun sayıları: senaryo = planın tutulduğu gün payı, aralık = modelin belirsizliği + taban, yalnız ileri (K-613)
- **Durum:** KABUL (agent, teknik — ADR-019; ürün yorumu gerektiren iki nokta soru 95-96'da Levent'e)
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
U12 ve ADR-050 kapıları ve üç uyum senaryosunu (%60/%80/%95) koydu; ADR-051 sayının modelini (Hall 2011). Açık kalanlar: "%60 uyum"
modele nasıl girer, aralık nasıl kurulur, "yalnız ileri yön" sayıda ne demek, "4 hafta / 2 ölçüm" neyle ölçülür, sayı nerede hesaplanır.

## Karar
1. **Yer:** motor (`engine/ShapeProjection`, saf) hesaplar; `decision` modülü `GET /v1/projection` ile sunar (sağlık verisi rızası);
   telefon yalnız çizer (K-606). SCOFF sonucu sunucuya hiç gelmez (ADR-050).
2. **Kapılar sırasıyla:** 18 yaş altı → `UNDER_AGE` · güvenlik ağı planı tutuyorsa → `SAFETY_HOLD` (U13; ek, H2'de yoktu) · ilk ve son
   tartı arası < 28 gün → `TOO_EARLY` ("4 hafta / 2 ölçüm"ün okunuşu — soru 95) · bu hafta tartı yok → `NO_RECENT_WEIGHT` · plan hedefe
   gitmiyor (cut'ta hedef ≥ bakım, bulk'ta ≤) → `NO_DIRECTION` · BMI < 20 ve kayıp → `LOW_BMI_LOSS` (kazanım açık) · hiç güvenli senaryo
   kalmadı → `NO_SAFE_SCENARIO`. Plan yoksa ya da hedefi yoksa `TOO_EARLY`.
3. **Senaryo:** planın %p tutulması = günlerin %p'sinde planın kalorisi, kalanında bakım → ortalama alım `bakım + p × (hedef − bakım)`
   (soru 96). Bakım keel'in tahmini (Mifflin × aktivite, bugünkü trend kilosunda). Model bugünkü trend kilosundan, **plana oturmuş**
   başlar (ADR-051 §4). Ufuk 26 hafta (H2 §4.2'nin "6 ay"ı).
4. **Aralık:** aynı yemek, gerçek bakım ±1 MJ/gün (Hall şekil 2A'nın belirsizliği; modelin fizyolojik alt sınırı PAL 1/(1−βTEF)) iki koşu;
   sonra her iki yanda en az 2,5 kg (H12 M8). Ağırlıklar 0,1 kg'a yuvarlanır.
5. **Yalnız ileri:** aralığın hedefe ters ucu bugünkü kiloda durur (cut'ta üst uç ≤ bugün, bulk'ta alt uç ≥ bugün); orta sayı her zaman
   hedef yönünde (yön kapısı bunu garanti eder). Daha çok tutulan senaryo hiçbir zaman hedefe daha uzak değil (özellik testi).
6. **Güvenli olmayan senaryo yapılmaz:** modelin herhangi bir haftasında planın kendi haftalık tavanından (safety.yaml: min(1 kg, %1))
   hızlı kayıp, ya da aralığın alt ucu BMI 18,5 altı (H2 §4.3 "tehlikeli hedefi normalleştirmeme").

## Neden
- Gün payı tanımı: "uyum %60" davranıştır (H2 §4.4), keel'in uyum kaydı da gün sayar (`on_track_min_ratio`); kalori yüzdesi olarak
  tanımlamak açıklanamaz olurdu. Kaçan günü bakımda saymak iyimser değil: telafi/ceza olmadan (U7) "o gün planın dışında ama aşırı değil".
- Aralık: keel'in bakım hatası ±%15 (H6 A4) 3000 kcal'de ±450 kcal — 26 haftada aralığı anlamsızlaştırır (ve cut'ta kazanım gösterir);
  Hall'un ±1 MJ'si bu modelin kendi belirsizliği ve kaynaklı. Taban kısa ufukta aralığın sıfıra inmesini önler.
- Güvenlik ağı kapısı: sert durdurmada "şu kadar verirsin" demek U13'ün tersi.
- 400 rastgele cut'ta (60-140 kg, 155-200 cm, 18-75 yaş, 100-1200 kcal açık): %84'ünde üç senaryo, %6'sında bir-iki, %4 `NO_SAFE_SCENARIO`,
  %6 `LOW_BMI_LOSS`; aralıklar tipik ±3,3 kg.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Telefonda hesaplamak | Sayı motordan (U1); model ve parametreler sunucuda tek kaynak |
| Uyumu kalori yüzdesi saymak (%60 = açığın %60'ı) | Sayısal olarak aynı ortalama ama "günlerin %60'ı" söylenebilir, kalori yüzdesi söylenemez |
| Aralık = ±%15 bakım | Yukarıda |
| Ters uçlu aralığı göstermek | U12/H2 §4.5: kötüleşen beden çizilmez; sayı bunu ima etmemeli |
| BMI 18,5'i geçen senaryoyu kırpmak | Kırpılmış sayı modelin sayısı değil (U1); senaryo hiç yapılmaz |

## Sonuçlar
Olumlu: kapılar ve senaryolar motor testleriyle (`ProjectionGateTests`, `ForwardOnlyTests`) sabit; telefon yalnız çizer. Olumsuz: (a) bakım
tahmini gözlenmiş bakımı (K-115 kalibrasyonu) henüz kullanmıyor — gözlem varsa aralık daralabilir (sonraki iş); (b) yaş, doğum yılından
üst sınırla hesaplanır — uygulama zaten yalnız kesin yetişkine profil açar (`profile.AgeGate`), motor kapısı ikinci bekçi.

## Geri dönmenin maliyeti
Düşük: parametreler `projection.yaml`, mantık tek sınıf; sözleşme alanları eklenebilir.

## Etkilenen
`engine/ShapeProjection`, `engine/EnergyBalanceModel` (oturmuş başlangıç), `decision/DecisionService.projection`, `DecisionController`,
`contracts/openapi.yaml` (`/v1/projection`, `Projection`), `apps/mobile/src/api/schema.ts` (üretilmiş), `data/parameters/projection.yaml`.

## Doğrulama
`ProjectionGateTests`, `ForwardOnlyTests` (jqwik), `EnergyBalanceModelTests` (oturmuş başlangıç eş. 14 eğimiyle), `ProjectionApiTests` (CI, DB),
`ContractTests`.
