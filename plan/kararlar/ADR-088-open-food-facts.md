# ADR-088 · Yemek verisi: Open Food Facts Türkiye alt kümesi, barkod ve marka (yeniden yapım Evre 3, K-8)
- **Durum:** KABUL (agent, yeniden yapım; `plan/yeniden-yapim.md` Evre 3 kaynağı agent seçer, parasız ve lisansı uygun olan)
- **Tarih:** 2026-10-29 · **Karar veren:** agent

## Bağlam
Envanter K-8 (denetim B6): 8.169 kaydın hepsi USDA (SR Legacy + Foundation), İngilizce laboratuvar adları; marka 0, barkod 0 → barkod okutma hiç
eşleşmez; Türkiye'deki ürünler yok. Araştırma: `arastirma/ham/yemek-verisi-kaynaklari-2026-10-29.md`. Ücretsiz ve içe aktarılabilir iki kaynak var:
Open Food Facts (ODbL, gecelik döküm) ve USDA Branded (CC0, çoğu ABD). TürKomp'un yeniden dağıtım lisansı yok (izinsiz alınmaz).

## Karar
1. **Kaynak: Open Food Facts gecelik JSONL dökümü**, VPS'te akış halinde süzülür (tamamı diske yazılmaz): `countries_tags` Türkiye'yi içeren
   (`en:turkey`, `en:turkiye`) ya da barkodu GS1 Türkiye öneki (869) taşıyan, adı ve 100 g başına kcal, protein, karbonhidrat, yağ alanları dolu
   ürünler. Çıktı küçük bir JSONL (`/opt/keel/off/`), sunucu açılışta FDC gibi içe aktarır (kimlik `off:<barkod>`, kaynak BRANDED, `gtin` 14 hane,
   marka, porsiyon gramı varsa). Betik depoda (`deploy/fetch-off.sh`), elle ya da zamanlayıcıyla çalışır; kullanıcı verisi dışarı gitmez (yalnız indirme).
2. **Köken sütunu:** `nutrition.food.dataset` (`FDC` | `OFF`) atıf ve güncelleme için (migration). Aramada OFF ürünleri marka adıyla görünür;
   sıralama ADR-085 ile aynı (Branded en sonda değil, kelime eşleşmesi önce gelir; kaynak önceliği yalnız eşitlikte).
3. **Atıf ve ODbL:** Ayarlar'da veri kaynakları satırı ("Food data: USDA FoodData Central, Open Food Facts (ODbL)") ve barkod sonucunda kaynak.
   Türetilmiş alt küme herkese açık kullanımın parçası sayıldığından ODbL'nin paylaşım şartı, alt kümeyi yeniden üreten süzme betiğinin (açık depo)
   ve kaynağa bağlantının sunulmasıyla karşılanır [doğrulanmadı: ODbL 4.6 değişikliklerin ya da algoritmanın sunulmasına izin verir; ilk sürümden önce
   metin okunur]. OFF görselleri alınmaz (CC-BY-SA, ayrı yükümlülük).
4. **USDA Branded** şimdilik alınmaz (ABD kapsamı, 3 GB); OFF Türkiye kapsamı yetmezse sonraki adım. **Türk yemekleri** (döner, mercimek çorbası…)
   bu kararın dışında: kaynaklı tariflerden hesaplama ayrı karar (U14).
5. Sayılar (ürün adedi, besin dolu oranı) döküm süzülünce envantere yazılır; tahmin yazılmaz.

## Sonuç
- Barkod okutma Türkiye'deki ürünlerde eşleşir; marka adıyla arama çalışır. Kanıt: gerçek sunucuda bir Türk ürününün barkodu ve adıyla arama.
- Bedel: döküm her güncellemede ~GB indirme (VPS); içe aktarım açılış süresine eklenir (ölçülür).

## Ek 1 · Ölçülen (2026-10-29, VPS, OFF gecelik dökümü)
- Döküm `openfoodfacts-products.jsonl.gz` **13 GB** (sıkıştırılmış), 4.879.695 ürün. Türkiye etiketli ya da 869 önekli: **28.050**.
  Ad + dört besin (kcal, protein, karbonhidrat, yağ / 100 g) dolu: **3.010** (%10,7); yalnız kJ'si olan 35. İçe aktarılan alt küme ≈3.000 ürün.
- Akışla indirme SSH oturumuna bağlı koşunca oturum kopunca boru hattı öldü: `fetch-off.sh` oturumdan bağımsız (`setsid`/zamanlayıcı) koşar.
- Sonuç: barkod kapsamı Türkiye'de sınırlı ama sıfırdan anlamlı; besin değeri eksik ürünler alınmaz (U5 aralığı kurulamaz). Kapsam yetmezse sonraki adım
  USDA Branded ya da kullanıcının etiketten girdiği ürün (ayrı karar).
- Üretim (2026-10-29 03:22 UTC): süzme 27.987 Türkiye ürününden 2.897'sini tuttu (ad + dört besin + makul değer), içe aktarım 2.897 / 0 atlandı.
  Süzme bitmeden açılan backend içe aktarmaz: `fetch-off.sh` sonrası backend yeniden başlatılır (ya da sonraki dağıtım).

## Ek 2 · ABD verisi, bölge, birim modeli ve arama (Evre 6 C, K-1061; ADR-090 #1 ve #5; agent, teknik karar ADR-019)
Karar 4'teki "USDA Branded şimdilik alınmaz" kalktı (ADR-090 #1): ABD kullanıcısı için markalı ürün ve barkod olmadan yemek kaydı kullanılamaz.
- **Kaynaklar:** USDA Foundation + SR Legacy (var) + **Survey/FNDDS** (pişmiş ve karışık yemekler, ev ölçüleri) + **Branded** (barkod `gtin_upc`, marka, etiket
  porsiyonu; CC0); Open Food Facts **Türkiye ve ABD** alt kümeleri (ODbL, Karar 3'teki atıf). Branded'da barkod ve OFF'ta aynı ürün varsa **USDA etiketi** kalır (OFF içe
  aktarıcısı USDA'nın tuttuğu barkodu atlar ve sayar); barkod aramasında da USDA önce, sonra kullanıcının bölgesi.
- **Bölge modeli:** `nutrition.food.region` (ISO ülke kodu; USDA satırları `US`), `import_release` (satırı yazan sürüm ya da dosya özeti). OFF her bölge için **ayrı dosya
  ve ayrı satırlar**: `off:<kod>` Türkiye (K-1042'den beri, öğünler bu kimliği tutar), `off-us:<kod>` ABD; her bölgenin içe aktarımı yalnız kendi satırlarını siler;
  `food_import.dataset` Türkiye için `OFF`, ABD için `OFF_US`. Barkod artık tablo çapında **tekil değil** (V52): aynı ürün iki bölgede iki satırdır.
- **İçe aktarma ölçeği:** CSV akış hâlinde okunur (`Csv`; 1,5 GB'lık `food_nutrient.csv` bellekte tutulmaz). Branded (~1,9 milyon ürün, 26 milyon besin satırı) üç geçiş: `branded_food.csv` (ürün başına ~64 baytlık kayıt, değerler yüzde birlik int, id'ye göre sıralı dizi;
  ~150 MB; sentetik 1 milyon ürünle 536 MB yığında 17 sn'de okundu) → `food_nutrient.csv` (yalnız enerji/protein/yağ/karbonhidrat) → `food.csv` (ad; tam ürünler yazıcıya akar).
  2.000'erlik işlemlerle yazılır; her satır sürümle damgalanır, **başka sürümün satırları en sonda silinir**; `food_import` yalnız bitmiş sürümü kaydeder → yarıda kalan
  (dağıtım arka plan içe aktarımını keser) sonraki açılışta aynı sürümle tamamlanır. Büyük içe aktarımlar `FoodImportQueue`'da **tek arka plan iş parçacığında**
  sırayla koşar (Branded, sonra OFF dosyaları), sunucu içe aktarma sürerken yanıt verir. Etiket enerjisi/makrosu 100 g başına; ml porsiyonlu ürünlerde FDC değerleri
  100 mL başınadır, 1 g/mL varsayılır [doğrulanmadı: FDC belgesi "100 g veya mL" der; porsiyonu birkaç yüzde oynatır].
- **Birim modeli:** `Food.portions` (ev ölçüleri, etiket porsiyonu; her zaman g ve oz, yoğunluk biliniyorsa ml) ve `Food.defaultAmount`. Başlangıç: ürünse etiket porsiyonu;
  yoksa sayılabilir (bedenlerin ortancası: yumurta "1 large", muz "1 medium"; yoksa ilk parça "1 slice"), sonra porsiyon, bardak/kaşık, ağırlık ölçüsü; **100 g yalnız hiç ev
  ölçüsü yoksa**. Porsiyon başına kcal ve makro tek sayı (ADR-090 #5: aralığın ortası, ürünse etiket değeri); aralıklar `per100g`'da ve tahminde kalır. `oz` tahmin uç
  noktasında ağırlık birimi. Beden sözcükleri `application.yml` `keel.nutrition.portions`.
- **Arama:** `pg_trgm` + üretilmiş `search_text` sütunu üstünde GIN dizini (V52; eklenti `public`'te, tablolar `nutrition`'da). Önek/içinde-geçme `LIKE`, çoğul (`eggs` →
  `egg`), yazım hatası (`<%` kelime benzerliği, yalnız tam eşleşme azken ve ≥4 harfli kelimede, tam eşleşmelerden sonra). Sıra puanla: ad eşleşmesi 6 basamak, genel kelimeye
  genel gıda, marka kelimesine ürün, kullanıcının bölgesi (`Accept-Language`, yoksa profil saat dilimi); sonra kullanıcının kendi kayıtları ve herkesin kayıt sayısı
  (`meal_item`; yalnız sayım). Ağırlıklar `application.yml` `keel.nutrition.search`, kural `FoodRanking`.
- **Doğrulanamayan/ölçülmeyen:** Survey `food_portion.csv` biçimi gerçek sürümün başından (amount boş, modifier sayısal kod, açıklama "1 cup") okundu; Branded sütunları
  gerçek sürümün başlığından (2026-04-30) doğrulandı. Arama süresi ve içe aktarma süresi gerçek veriyle ölçülmedi.
