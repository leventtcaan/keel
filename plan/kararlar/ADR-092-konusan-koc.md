# ADR-092 · Konuşan koç: gerçek girer, doğrulanmış cümle çıkar
- **Durum:** KABUL (yön: Levent, 24-25 Kas 2026 — "gerçek girer, doğrulanmış cümle çıkar", sağlayıcı OpenAI, en ucuz eski model); ayrıntı parametreleri agent
- **Tarih:** 2026-11-25 · **Karar veren:** Levent (öneren: agent)
- **Yerini aldığı:** ADR-043 #76 ("model sınıflandırır, cümle yazmaz") → bu ADR. ADR-041/044'ün ZDR şartı OpenAI için ADR-091 Ek 5 ile gevşetildi.

## Bağlam
Levent: ücretli tarafta AI şart; kişiyi tanıyan, motorun kararlarıyla ona eşlik eden, konuşan bir koç. Bugün `POST /v1/coach/messages` tek turlu, model
yalnız konu seçiyor, cümleyi uygulama yazıyor; üretimde sağlayıcı kapalı (`coach.provider: "off"`). Rakipler (Whoop Coach, Bevel): veriye dayalı
cevap, hazır soru hapları, haftalık soru hakkı (`arastirma/ham/rakip-ozellik-2026-11-24.md` §8, doğrulama dosyası). Erişilebilir modeller anahtarla
listelendi (25 Kas): gpt-4o-mini, gpt-4.1-mini, gpt-5-nano, gpt-5-mini, gpt-5.4-nano/mini.

## Karar sürücüleri
- U1/U2: karar motordan; model kararı değiştiremez, sayı uyduramaz; ısrar kararı değiştirmez.
- U6 (tıbbi dil yok), U7 (suçlama yok), U10 (persona/ad yok), V1-V6 (rıza sağlayıcıyı adıyla söyler, silme, dışa aktarma).
- Maliyet: Levent "en ucuz, eski model; son modeller asla; azami sınır".

## Karar
1. **Girdi yalnız yapılandırılmış gerçek:** `CallFacts` + `ReasonFacts` (kural ve sayıları), haftalık sayımlar (`/v1/consistency`, hedefler), profil
   özeti (hedef, deneyim, antrenman günleri, birim), kişi hafızası (aşağıda) ve son N mesaj. Ham günlük, fotoğraf, tarih/saat ayrıntısı gitmez.
2. **Çıktı şemayla doğrulanır:** JSON şema `{reply, topic, numbersUsed[]}`; sunucu doğrular: (a) `reply` içindeki her sayı girdideki bir sayıyla eşleşir
   (birim ve yuvarlama toleransıyla) ve `numbersUsed`'da listelidir; (b) yasak ifade listeleri (en/tr; U4, U6, U7) temiz; (c) kararı değiştirmeyi öneren
   kalıp yok ("kaloriyi düşür" gibi motor dışı talimat); (d) uzunluk ≤ parametre. Doğrulama düşerse model cevabı **gösterilmez**, motorun kendi
   cümlesi (bugünkü `copyKey`) gösterilir. Güvenlik ağı ve döngü kararlarında model hiç çağrılmaz (`tellable=false`, bugünkü kural).
3. **Kişi hafızası:** kullanıcının söylediği kalıcı tercihler (ör. "sabah antrenman", "dizim hassas" → yalnız "kullanıcı dizini zorlamak istemiyor"
   biçiminde, tıbbi yorum yok) sunucuda en fazla `coach_memory_max_items` madde; kullanıcı görür, düzeltir, siler; konuşma geçmişi
   `coach_history_days` gün; hesap silmede ve rıza geri çekilince silinir; dışa aktarmada yer alır (V6). Hafızaya model değil, kullanıcı onaylı
   "bunu hatırlayayım mı?" adımıyla yazılır.
4. **Sağlayıcı ve maliyet:** OpenAI, `store: false`, düşük sıcaklık, çıktı tavanı `coach_max_output_tokens`. Model `coach.model` parametresi; varsayılan
   en ucuz şema destekli eski model, fiyatı resmî sayfadan doğrulanınca yazılır (K6). Kota: premium; günlük mesaj (`quota.yaml` koç 25) + **aylık
   toplam harcama tavanı** (`coach_monthly_budget_usd`, aşılınca herkes için deterministik mod) + OpenAI proje bütçe tavanı (Levent panelde ayarlar).
   Maliyet her çağrıda kaydedilir (token × fiyat parametresi), loga sağlık verisi yazılmaz.
5. **Rıza:** `consent.third_party_ai` yeni sürüm: sağlayıcı OpenAI (adıyla), giden veri türleri, eğitimde kullanılmaz, kötüye kullanım denetimi için
   sınırlı saklama; ayrı onay, geri çekilebilir. Rıza yokken koç deterministik cümleyle çalışır.
6. **Ses:** ilk sürüm cihaz içi dikte (klavye mikrofonu) ve cihaz içi okuma (iOS ses sentezi); bulut ses yok (yeni veri türü, ayrı ADR).
7. **Arayüz:** karar ekranında "Ask about this call" + 3 hazır soru hapı (neden, bu hafta ne yapmalıyım, ya şunu yaparsam), sohbet ekranı; ücretsizde
   ilk tam karar için 3 soru deneme hakkı (parametre), sonra paywall (ADR-091 yükseltme anı b).

## Neden
Kişiye özel his, veriden gelen cümleyle olur; doğrulayıcı U1'i mekanik olarak korur (sayı uyduran cevap kullanıcıya ulaşmaz). Hafıza kullanıcı onaylı
olduğu için "bizi tanıyor" hissi verir ama gizli profil oluşturmaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Yalnız sınıflandırma (ADR-043) | "Çok boş" (Levent); kişiye özel his yok |
| Serbest sohbet, doğrulamasız | U1/U6 ihlali riski, App Review ve sorumluluk |
| DeepSeek doğrudan | Veri Çin'de, ZDR/DPA yok (ADR-091 Ek 5) |

## Sonuçlar
Olumlu: ücretli katmanın somut değeri; maliyet tavanlı. Olumsuz: doğrulayıcı bazı iyi cevapları da düşürür (deterministik cümleye döner); OpenAI'ye
sağlık türevi veri gider (rıza ile).

## Geri dönmenin maliyeti
Orta: sağlayıcı kapısı (`LanguageModel`, `EgressGate`) zaten soyut; `coach.provider: off` ile anında kapanır.

## Etkilenen
`coach/` (adaptör, doğrulayıcı, hafıza, geçmiş), `consent/`, `subscription/Quota`, `contracts/openapi.yaml`, mobil koç ekranı ve karar ekranı,
`data/coach/*.md` istemleri, `data/parameters/quota.yaml`, `docs/yasal/` (gizlilik metni, envanter).

## Doğrulama
- Sayı uyduran sahte model cevabı kullanıcıya ulaşmaz (test); yasak ifade içeren cevap düşer; güvenlik kararında model çağrılmaz.
- Aylık tavan aşılınca deterministik mod (test, sahte saat).
- Hafıza silinince istemde yer almaz; hesap silmede tablo boş (AccountDataTests).
- Gerçek sağlayıcıyla duman testi yalnız sentetik veriyle (CI'da değil, elle).

## Ek 1 · Uygulama ayrıntıları (agent, 2026-11-25; PR #755 ve devamı)
- **Doğrulayıcı** (`ReplyValidator`): tam şema `{reply, topic, numbersUsed}`; her sayı (rakam ya da sözcük, en/tr) girdideki bir gerçekle eşleşir ve listelenir; kullanıcının kendi sayısı gerçek değildir, düşer. HEALTH ve OFF_TOPIC konularında model cümlesi gösterilmez (uygulamanın kendi cümlesi; U6). Kurallar: `data/coach/reply-rules.json` (örnek ve yakın-kaçak testli).
- **Bütçe:** `coach.model_spend` (ay başına tek satır, hesap yok); fiyatlar boşken her çağrı `coach_unpriced_call_cost_usd` ile sayılır. Parametreler: `data/parameters/coach.yaml`.
- **Hafıza** kullanıcının kendi cümlesidir (modelin yazdığı değil): "hatırla" onayı `POST /v1/coach/memory`; koçun söyleyemeyeceği ifade reddedilir; dolunca 409. Geçmiş ve hafıza `coach.message` / `coach.memory_item`; sağlık verisi sayılır (konuşma kararlar hakkında): HEALTH_DATA ve THIRD_PARTY_AI geri çekilince, hesap silinince silinir; dışa aktarmada `coach` bölümü.
- **Modül sınırı:** `coach` artık `consent`'e bağlı (`ConsentWithdrawn` dinlemek için); ADR-015 haritasındaki modül listesi değişmedi.
- **Rıza metni 2-draft** (OpenAI adıyla; Levent onaylayınca "-draft" kalkar). Telefonun hangi sağlayıcı ve veri adıyla rıza vereceğini sunucu söyler: `GET /v1/consents/ai-offer`.

## Ek 2 · Koç merkezde, eylem kartları motordan (Levent, 2026-11-26; 9c-6b)
Bağlam: gezinti Durak 8-9'da Levent "AI koç ücretli üyelikte çok daha merkezde olmalı, işleri kişinin üzerinden aldığını hissettirmeli" dedi. Taslak
`prototip/gorsel-yon/y5-e3.jpg`'de eylem kartı var ("Akşam yürüyüşü · 25 dk · ~3.000 adım · Plana ekle"). Bugün koça yalnız karar ekranındaki "Bu kararı sor"
düğmesiyle giriliyor; sağlayıcı üretimde kapalı. Agent üç soru sordu; Levent önerilen seçeneklerin üçünü de seçti:
1. **Giriş: Bu hafta'da koç satırı, sekme yok.** Ana ekranda kararın altında yalnız koça giden tek satır ("Message the coach" / "Koça mesaj yaz",
   koçun kendi kutusunun metni). Levent, 26 Kas: simülatörde gösterilen üç varyanttan 1'i seçti (yalnız satır; satır + 2 hap ve satır + 3 hap elendi),
   çünkü kullanıcı gözüyle hapların içeriği bu ekranda çok alakasız kalıyor. Hazır sorular koçun içinde kalır; ana ekran bütçesi 77 (K-1235). Karar
   ekranındaki düğme kalır. Antrenman bitişi ve yemek ekranı kendi bağlamlı haplarını alır. Ayrı Koç sekmesi açılmaz: ücretsiz kullanıcıya çoğu paywall'a çıkan bir
   sekme olur, sağlayıcı kapalıyken boş kalır. Ücretlilik değişmez (ADR-091 b): motorun cümleleri ücretsiz, model sorusu ücretli.
2. **Eylem kartları yalnız motorun önerileri (U1).** Koç bir eylem uydurmaz; kart, motorun zaten hesapladığı bir öneriyi gösterir, LLM yalnız anlatır:
   - Yürüyüş kartı: kalan adım, kişinin kendi rotalarıyla yürüyüş (K-1216, `readWalk`); "Plana ekle" bugünün akşam yürüyüş hatırlatmasını kurar (telefondaki
     hatırlatma; plan, hedef ya da karar değişmez).
   - Öğün kartı: `GET /v1/days/{day}/suggestions` (kalan kaloriye uyan, kişinin sık yediği öğünler); "Kaydet" öğün ekranına götürür (bugünkü taslak geçişi).
   - Görünüş: ADR-094 §3, mercan zemin (`tintSuggest`) + petrol düğme. İkisi de sağlayıcı kapalıyken çalışır.
3. **Çift soru:** koçta "Bu karar neden?" (günün çipi, telefonda ve ücretsiz cevaplanır) kalır; "Bu kararı açıkla" başlangıç sorusu yalnız sağlayıcı açık ve
   kişi ücretliyken görünür.
Etkilenen: `src/app/(tabs)/index.tsx` (ana ekran, kelime bütçesi 74 → 77), `src/app/coach.tsx`, `src/coach/conversation.ts`
(STARTERS), antrenman bitişi ve yemek ekranı, `data/copy/*` (yeni metin en+tr). Doğrulama: koç satırı ve hapların testleri; eylem kartının motorun önerisi
yokken görünmediği ve "Plana ekle"nin planı değil yalnız hatırlatmayı değiştirdiği testler; başlangıç sorusunun sağlayıcı kapalı / ücretsizken görünmediği test.
