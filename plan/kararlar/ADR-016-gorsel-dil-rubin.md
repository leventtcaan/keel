# ADR-016 · Görsel dil: C iskeleti + RUBİN paleti + koyu mod + sistem katmanı
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)
- **Yerine geçtiği:** ADR-014 (vurgu rengi ve tipografi kısmı)

## Bağlam
ADR-014'teki vurgu `#FF4F12`, Strava'nın turuncusuyla pratikte aynı: ΔE00 1,3 (`#FC4C02`) / 2,0 (`#FC5200`, güncel resmî).
Strava'nın resmî paleti de turuncu + beyaz + siyah ve turuncuyu "az ve vurgu olarak" kullanıyor — C tam olarak bu.
Turuncu bölge komple dolu (Orangetheory, Zwift ΔE ~2). Ayrıca: beyaz metin turuncu üstünde 3,29:1 (WCAG AA başarısız),
uyarı rengi vurguyla aynıydı. Kanıtlı renk bulgusu: kırmızı/turuncuyla verilen düzeltici geri bildirim daha sert algılanıyor
(Dukes & Albanesi 2013) — kararlarımız çoğunlukla düzeltici. "Turuncu enerji verir" iddiasının hakemli kanıtı yok.
Kaynak: `arastirma/ham/L2-gorsel-kimlik.md`. Karşılaştırma: `prototip/palette-options.html`.

## Karar
**İskelet C olarak kalır:** beyaz zemin, siyah karar bloğu, Barlow Condensed başlık, radius 6/4px.
**Değişenler:**
| Token | Açık | Koyu |
|---|---|---|
| accent (dolgu) | `#B0129A` (üstünde beyaz, 6,18:1) | `#F07BE0` (üstünde `#0E0E0E`) |
| accent-ink (karar bloğu içi) | `#F07BE0` | `#B0129A` |
| warn (ayrı, yalnız gerçek uyarı) | `#D12F1F` | `#FF6B5A` |
| karar bloğu | `#0E0E0E` + beyaz | **ters:** `#F4F4F2` + `#0E0E0E` |
- **Koyu mod zorunlu**, varsayılan telefonun sistem ayarı; uygulama içinde ayrı tema ayarı yok (Apple HIG).
- **Gövde fontu sistem fontu** (SF Pro → Dynamic Type bedava); başlık/büyük rakam Barlow Condensed.
- **Büyük harf yalnız iki yerde:** ekran başlığı ve karar başlığı.
- **Sistem katmanı (tab bar, toolbar) Liquid Glass**, nötr: expo-router Native Tabs. Marka rengi içerik katmanında; içerikte
  cam/bulanıklık/gölge yok.
- 11pt altı metin yok. Çip radius 4px.

## Neden
RUBİN en yakın fitness rakibine ΔE ≥ 18, Strava'ya 44; kategoride boş kalan tek sıcak, doygun bölge. Enerjiyi korur,
uyarı/hata anlamı taşımaz, metin olarak da AA geçer.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Turuncuyu korumak (`#FF4F12`) | Strava ile algısal çakışma; AA başarısız |
| Koyu turuncu "Kor" `#B83800` | Strava'ya 13,2; kahverengiye kayıyor, koyu tonu Gentler Streak'e yakın |
| Yeşil "Saha" `#0B7F05` | En uzak renk ama enerjisi düşük, "sağlık uygulaması" kalıbına yakın — yedek |

## Risk ve test
Pembeye kayarsa "kadın uygulaması" okunması (Sweat, Flo pembe). Önlem: kırmızı tarafta kal, pastel ve yuvarlak form yok.
Test: 8 kişiye 5 saniye göster — 2'den fazlası "kadın uygulaması" derse Saha'ya geçilir (token tek dosyada, maliyet düşük).

## Geri dönmenin maliyeti
Düşük (token'lar tek dosyada).

## Etkilenen
`apps/mobile/src/theme/tokens.ts`, `prototip/`, K-301, ekran görüntüleri (K-1003).

## Doğrulama
`tokens.test.ts` (renk yalnız token dosyasında) · kontrast testi (dolgu üstü metin ≥4,5:1) · her iki temada ekran testi.
