# ADR-085 · Yemek araması: yazarken arama, kelime sıralaması, çift kayıt (yeniden yapım Evre 1, K-4)
- **Durum:** KABUL (agent, yeniden yapım; Levent 29 Eki: ara kapı yok, tasarım ve kapsam kararını agent verir)
- **Tarih:** 2026-10-29 · **Karar veren:** agent

## Bağlam
Envanter K-4 ve denetim B4, B5, B7, B8, gerçek sunucuda doğrulandı:
- Arama yalnız "Search" düğmesi ya da klavyedeki Search ile çalışır; yazı değişince eski sonuç ekranda kalır, "aranıyor" durumu yoktur.
- Sunucu her kelimeyi `%kelime%` ile eşler, adı ilk kelimeyle başlayanı öne alır, sonra kısayı: "egg" → Eggnog, Eggplant önce; "rice" → pirinç unu önce.
  Türkçe klavyedeki "ı" katlanmaz ("chıcken" bulunmaz).
- Aynı ad iki kez listelenir: veri SR Legacy ile Foundation'dan gelir (`nutrition.food.source`), aynı yemeğin iki ölçümü ayırt edilmeden.
- Sonuç satırında kalori yoktur; seçilen yemeğin birimi ilk porsiyondur (kurutulmuş yumurta için "1 cup, sifted"), miktar alanı boş gelir.
- "Searching needs a connection" sunucu hatasında da çıkar.
Yemek verisinin kendisi (USDA dışı kaynak, marka, barkod, Türkçe) Evre 3'ün işidir; bu karar veriden bağımsız arama davranışını kurar.

## Karar
**İstemci (FoodPicker):**
1. Yazarken arama: her değişiklikten sonra kısa bir bekleme (parametre dosyasında, K2) ve en az karakter sınırı (mevcut `searchMinChars`).
   Klavyedeki Search beklemeden arar; ayrı "Search" düğmesi kalkar (Scan kalır).
2. Sorgu değişince eski sonuçlar hemen kalkar, "aranıyor" durumu görünür; geç gelen eski cevap yenisinin üstüne yazılmaz (sıra numarası).
3. Bağlantı yok ile sunucu hatası ayrı metin.
4. Sonuç satırı yemeğin adının yanında 100 g başına kaloriyi gösterir; aralık mevcut aralık hesabıyla (U5), tek sayı değil.
5. Seçilen yemeğin varsayılan birimi: hacim ölçüsü olmayan ilk porsiyon (cup, tbsp, tsp, fl oz, ml dışı; ör. "1 large"), yoksa gram. Miktar
   boş gelmez: porsiyonda 1, gramda 100; tahmin hemen görünür, kullanıcı değiştirir.
6. Arama kutusu boşken ipucu metni (ne yazılabileceği); son kullanılanlar zaten "Recent" altında.

**Sunucu (FoodStore.search):**
7. Katlama: küçük harf (`Locale.ROOT`) ve "ı" → "i", "İ" → "i"; hem sorguda hem adda.
8. Sıralama, kelimenin sınırına bakarak: (a) ad sorgunun aynısı; (b) adın ilk kelimesi ilk sorgu kelimesine eşit ve ardından virgül
   (USDA'nın "Egg, whole" genel yemek yazımı); (c) adın ilk kelimesi eşit; (d) ad ilk sorgu kelimesiyle başlar; (e) adın herhangi bir kelimesi
   sorgu kelimesiyle başlar; (f) içinde geçer. Eşitlikte kaynak Foundation > SR Legacy > Branded, sonra kısa ad.
9. Aynı katlanmış ad bir kez döner: en iyi kaynaklı kayıt (Foundation önce).
Sözleşme değişmez (aynı uç, aynı şema). Evre 3'te veri değişince (b) kuralı yeni veriye göre yeniden bakılır.

## Sonuç
- "egg" → önce "Egg, whole…" ailesi, Eggnog ve Eggplant arkada; "rice" → "Rice, white…" önce; "chıcken" bulunur; çift satır yok.
- Kanıt: gerçek sunucuya karşı simülatörde "egg", "rice", "chıcken" yazılarak (Search'e basmadan) sonuçlar + seçince tahmin; ekran görüntüleri envanterde.
