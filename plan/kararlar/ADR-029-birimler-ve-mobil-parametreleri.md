# ADR-029 · Birimler: depolama metrik, dönüşüm telefonda; telefonun okuduğu parametreler JSON
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-30 · **Karar veren:** agent

## Bağlam
K-310 (L3 §7 #10, P10): hedef pazar ABD; lb/in kullanıcısı için giriş engeli olmasın. Motor ve sunucu metrik çalışır
(`Profile.units` METRIC/IMPERIAL yalnız tercih). K2: eşik ve kural koda gömülmez; parametreler `data/parameters/*.yaml`
ve köken testleri (`ParameterProvenanceTests`, `SourceAnchorTests`) backend'de. Telefon (Metro) JSON'u yerel olarak
paketler, YAML'ı paketlemez.

## Karar
1. **Depolama ve motor metrik.** Telefon kullanıcının birimiyle gösterir ve alır; sunucuya daima metrik gider. Girişten
   dönen değer sunucunun sakladığı hassasiyete yuvarlanır (kg 2 ondalık, bel cm 1 ondalık, boy tam cm — sözleşme), başka
   yerde yuvarlama yok.
2. **Dönüşüm katsayıları kodda adlı sabit:** 1 lb = 0,45359237 kg ve 1 in = 2,54 cm tanım gereği kesin (1959
   uluslararası yard ve pound anlaşması); ayarlanabilir eşik değildir.
3. **Yuvarlama kuralları parametre:** gösterim ondalıkları, sunucu hassasiyeti, varsayılan emperyal bölgeler
   `data/parameters/units.json`'da, YAML dosyalarıyla **aynı alan şemasıyla** (key, value, unit, tag, source, note).
   Telefonun okuduğu parametreler JSON'dur; köken kuralı (kaynak dosyası var, çapası başlık ya da dosyada geçiyor) mobil
   testinde uygulanır.
4. **Tercih:** sunucu profili (`Profile.units`) gerçek kaynak; telefon son bilinen değeri `expo-sqlite/kv-store`'da
   önbelleğe alır (çevrimdışı ve açılışta gösterim için). Profil yokken (onboarding öncesi) cihaz bölgesinden varsayılan.

## Neden
- Tek hassasiyet noktası: yuvarlama hatası birikmez; lb ile girilen değer, lb ile geri gösterildiğinde aynıdır
  (0,01 kg = 0,022 lb < 0,05 lb) — testle kanıtlı.
- JSON: yeni bağımlılık (YAML dönüştürücü) yok; şema aynı kaldığı için ileride tek biçime taşımak mekanik.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Sunucu kullanıcının biriminde saklasın | Motor her hesapta dönüştürmek zorunda kalır; kayıt birimi değişince geçmiş karışır |
| Parametreyi YAML'da tutup Metro'ya dönüştürücü eklemek | Bağımlılık + derleme yapılandırması; tek dosya için |
| Katsayıları parametre dosyasına koymak | Tanımdır, ayarlanmaz; "kaynak" çapası anlamsız olur |

## Geri dönmenin maliyeti
Düşük: dönüşüm tek modülde (`apps/mobile/src/units/`).

## Etkilenen
`apps/mobile` (K-310, K-306 onboarding, K-309 ayarlar, M4 kayıt ekranları), `data/parameters/units.json`.
