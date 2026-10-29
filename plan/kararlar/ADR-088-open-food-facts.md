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
