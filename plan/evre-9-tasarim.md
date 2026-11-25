# Evre 9 · Tasarım ve mantık: "içimize her noktası sinmeden çıkarmayalım"

Kaynak: Levent'in simülatör gezintisi (25 Kas 2026) → `plan/tasarim-gezinti-notlari.md` (her durak, Levent'in sözleriyle) ve
`plan/tasarim-antrenman-dugme-denetimi.md` (antrenman düğmelerinin nereye yazıp kimin okuduğu).

**Karar (Levent):** 1.0.1 tasarım bitene kadar çıkmaz. Production derlemesi, TestFlight ve onaylar (#770) bekler.
**Çıkış kriteri:** Levent her ekranı simülatörde (ya da TestFlight'ta) kendisi gezer ve "içime sindi" der. Körlemesine onay yok.

## İlkeler (Levent'in sözlerinden)
1. **Az yazı.** Metin boğmaz; Türkçe uzun metin dar alana sığmayıp düzeni kaydırıyor. Her cümle "gerekli mi?" sorusundan geçer.
2. **Sakin, tutarlı renk ve görsel dil.** Bugünkü siyah kart + doygun turkuaz "sert, tutarsız, itici". Yeni yön ADR-070'in yerini alır (Levent ADR'si).
3. **İnsana dokunan ekranlar.** Gün şeridi, karar kartı, geçmiş: sayı saymak değil, "neredeyim, iyi miyim, nereye gidiyorum" hissi; grafik, sade.
4. **Her düğme bir yere bağlanır, bağlanmıyorsa alan almaz.** Denetimde bağlanmayanlar: "Çok ağır mı?", dinlenme süresi, "Dolu", atla, "Kurulumun".
5. **Dahası ücretli.** Her özelliğin çekirdeği ücretsiz; devamı, fazlası, artısı ücretli ("bir nevi freemium ama tam da değil").
6. **AI koç ücretlinin merkezi.** İşi kişinin üzerinden aldığı hissedilmeli. Güvenilir ve maliyet etkin; kısıtlı (patlamaz).

## Aşamalar
### 9a · Görsel yön (önce, kod yok)
1. Antigravity (Gemini 3.8 Flash): lider uygulamaların görsel dili: ana ekran, haftalık karar/özet, koç sohbeti, paylaşım kartı, renk ve tipografi.
   Mevcut özellik raporu (`arastirma/ham/rakip-ozellik-2026-11-24.md` › her bölümün "(a) Ekran tasarımı") girdi; doğrulama turu şart.
2. Codex (görsel): **3 yön × 3 ekran** (ana ekran, karar detayı, koç) taslak. Gerçek veriyle, Türkçe, az metin.
3. Levent seçer (ya da karıştırır) → yeni görsel dil ADR'si (ADR-070 YERİNİ ALDI), token'lar (`src/theme/tokens.ts`).

### 9b · Mantık temizliği (9a ile paralel yürüyebilir)
- **Cepte kalan tekrar** önceden dolu gelmesin (varsayım gerçek cevap gibi gidiyor; K-1218 sinyalini körleştiriyor). Metin: "yedek tekrar" → "cepte kalan tekrar".
- **Dinlenme:** kaydedilen gerçek süre bir yere bağlansın (öğrenen aralık, toparlanma sinyali) ya da yük olmaktan çıksın. Erken "Hazır" ayrı bilgi.
- **"Çok ağır mı?":** 1-2 denemeden sonra ve set sonrası hissiyatla; sonucu bir sonraki öneriye bağlansın, yoksa kalksın.
- **Not:** bir yere bağlansın (koç, geçmiş özeti) ya da küçülsün; set kaydedildikten sonra da eklenebilsin.
- **Form sorusu** antrenman sonunda değil, hareketin bitiminde; yalnız etkisi olan harekette.
- **Atla / Dolu / Kurulumun:** sunucuya anlamıyla gitsin ya da alan bırakılsın; kurulum set ekranında görünsün.
- **Geçmiş:** sayfalama, 365 gün sınırı (rekorlar düşüyor), grafiksel özet.
- **Süperset:** mantık doğru (üyeler arası dinlenme yok); yalnız görünüş.
- **Yemek araması:** gerçek sunucuya karşı Türkçe sorgu testi; simülatör fixture'ı gerçek veriyle beslensin.
- **Abonelik önizleme modu** (yalnız geliştirme derlemesi, örnek fiyat) ki tasarım simülatörde görülsün.
- "+" düğmesi boşluğu (`FoodLine › PLUS_GUTTER`) ve "Kardiyo" satırını örtmesi.

### 9c · Ekran ekran (seçilen yönle; her biri bir parça, Levent simülatörde bakar)
1. Ana ekran: gün şeridi, karar kartı, sayılar, bugünün antrenmanı.
2. Karar detayı ("Bu karar neden"): cümle yığını değil, tasarlanmış sayfa.
3. Koç: AI merkezde (ücretli), sohbet ve klavye düzeni, "işi senin yerine yapar" hissi.
4. Antrenman sekmesi + set, dinlenme, süperset, bitiş ekranı, **paylaş** (pazarlanabilir kart), alttaki düğmeler.
5. Gelişim: kısalt; "Düzen" kartı kalkar; kas başına set küçülür; bu haftanın kasları etkileşimli; kararlar listesi kısalır; fotoğraf girişi öne çıkar.
6. Yemek: öğün kaydetme (font kayması), arama, ev ölçüleri.
7. Yürüyüş haritası: Ayarlar'dan çıkar, kardiyo ve günlük yürüyüş akışına, ücretli.
8. Abonelik ekranı (önizleme modunda tasarlanır, TestFlight'ta gerçek).
9. Ayarlar (gezilmedi).

### 9d · Para haritası
Her özellik için "ücretsiz nerede biter, dahası ne" tablosu: koç, fotoğraf (aralık + ücretli), harita, geçmiş/grafik derinliği, "Çok ağır mı" gibi zeki
eklentiler. Levent onaylar.

## Levent'i bekleyen kararlar
- **Görsel dil** (9a sonunda): ADR-070'in yerine.
- **Fotoğrafa AI:** anayasa **V1 "fotoğraf cihazda kalır"** ile çelişir; değişirse ADR + sağlayıcıyı adıyla söyleyen ayrı onay + Apple kuralları; kısıt ve maliyet tavanı.
- **Para haritası** (9d).
- **Koçun açılışı:** OpenAI fiyatı resmî sayfada doğrulanır, panelde proje tavanı ($25) konur; sonra üretimde açılır.
- **Onaylar (#770):** görseller, döngüler, rıza metni, şartlar, Türkçe metinler gerçek bir bakışla yeniden.

## Sonra
1.0.1: #770 (gerçek onaylarla) · production derlemesi · TestFlight · ASC (`docs/magaza/1.0.1.md`) · Submit (Levent).
