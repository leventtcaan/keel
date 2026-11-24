# ADR-091 · Evre 8 kararları: kayıt bedava, karar ücretli; motor düzeltmeleri; AI form gösterimi
- **Durum:** KABUL (Levent, 2026-11-24, sohbette dört soruya cevap) · K-3 kuralları tek tek ayrıca onaylanır
- **Tarih:** 2026-11-24 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Levent 1.0'ı bir süre kullandı: "rakiplerinin yaptığı işi yapamıyor ve para istiyoruz, acımasız." Dört kod denetimi bunu doğruladı
(`plan/evre-8-butun-urun.md` §1): premium yalnız AI yollarını açıyor (`coach/Explanation.java:92`, `coach/MealDraft.java:114`), AI ise üretimde
kapalı (`application-prod.yml` › `coach.provider: "off"`); hiç abone olmamış hesap kapatılamayan paywall görüyor (ADR-058 #107), aboneliği
bitmiş hesap ise her şeyi bedava kullanıyor. Motorun ilk yemek kararı ~5. haftada; haftada 4 tartı şartı tek kaçan sabahta 3 check-in'i
düşürüyor; hedef kayıp hızı yok. Rakip araştırması: `arastirma/ham/rakip-ozellik-2026-11-24.md` (doğrulama turu ayrı dosyada).

## Karar sürücüleri
- Ücretsiz katmanın sunucu maliyeti ≈0 olmalı (AI dışında; `arastirma/ham/K5-fiyat-kota-maliyet.md`).
- Satılan şey taklit edilmesi zor olmalı: motor (pazar-kullanici-sesi #6: insanlar verilerini zaten ChatGPT'ye döküyor).
- Ücretsiz katman rakip ücretsizleri seviyesinde olmalı (Hevy, Strong, Cronometer: sınırsız kayıt, ücretsiz barkod).
- U1, U2, U14 aynen: karar motordan, kural kaynaktan.

## Karar
1. **Para modeli B: kayıt bedava, karar ücretli.** Zorunlu paywall kalkar. Ücretsiz: antrenman kaydı ve program, dinlenme sayacı, yemek kaydı,
   arama ve barkod, kilo trendi, adım, Türkçe, **başlangıç kararı ve ilk tam haftalık karar**. Ücretli (`premium`): sonraki haftalık kararlar
   (kalori, hacim, deload), "neden" ve what-if, konuşan koç, fotoğraf/metinle öğün, ses. Kota bitince deterministik mod ve "kredi" sözcüğü
   yasağı (ADR-012) korunur. Yükseltme anları: ilk tam karardan sonraki karar günü, "neden?" dokunuşu, elle üçüncü öğün kaydında fotoğraf önerisi.
2. **1.0 yayında** (Levent, 24 Kas). Evre 8a düzeltmeleri **1.0.1 güncellemesi** olarak gider; yayından sonra Levent geliştirici alışkanlıklarını
   (uygulamayı izleme, tanıdığa verme, test) öğrenmek istiyor → ayrı araştırma ve rehber.
3. **Motor düzeltmeleri önerilecek (sağlık):** ilk açık 1. günden, eldeki tartıların ortalamasıyla esnek veri yeterliliği, kiloya oranlı hedef
   kayıp hızı (%0,5-1/hafta aralığı). Her kural `kural-ekle` ile: önce `arastirma/ham/guray/`, yoksa [literatür] kaynak; ADR eki + test;
   **eşik ve kural metni Levent onayına gelir**.
4. **ADR-017'nin AI yasağı kalkar, video dahil.** Codex ile üretilen form görseli ve kısa döngü videosu kullanılabilir; her biri
   `docs/hareket-cekim-kontrol-listesi.md`'den geçer, `review` kaydına Levent'in onayı yazılır (`by: levent`). Yüz yok, gerçek kişiye
   benzeyen figür yok; üretildiği ve modeli dosya kaydına yazılır.

## Neden
Ödenen şeyin bugün karşılığı yok: bu hem kullanıcıya haksızlık hem App Review/yorum riski. B, tek benzersiz varlığı (motor) ücretli tutar,
"kayıt bedava" ile rakip seviyesinde kullanılabilir bir uygulama bırakır. Sert paywall'un dönüşüm avantajı (RevenueCat: %10,7'ye %2,1,
35. gün; K5'te ve rakip raporunda, doğrulama turunda yeniden bakılıyor) çekirdek değer kilitli kaldığı için kısmen korunur.
Motor bulguları golden senaryolarla gösterildi (GS-01/02, GS-07, GS-20). Klip çekimi 40 hareketin 40'ında bekliyor; pilot
(`~/Documents/keel-arastirma/hareket-pilot/lat_pulldown_v1.png`) çizim kalitesinin kurulum kartına yettiğini gösterdi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| A · motor bedava, AI ücretli | Satılan şey metalaşan ve her kullanıcıda LLM maliyeti taşıyan şey; motorun değeri bedava dağılır |
| Zorunlu paywall'u koru | Ödenen şeyin karşılığı yok; Levent "acımasız" dedi |
| Motoru olduğu gibi bırak | İlk karar 5. haftada, haftada bir tartan hiç karar almıyor |
| Klipleri yalnız Levent çeksin (ADR-017) | 40/40 bekliyor; Levent kararı değiştirdi |

## Sonuçlar
Olumlu: ücretsiz kullanıcı gerçek bir uygulama alır, ücretli kullanıcı karar alır; form gösterimi kısa sürede 40 harekete çıkar.
Olumsuz: dönüşüm sert paywall'dan düşük olabilir (ölçülecek); AI videoda biyomekanik hata riski (Stanford HumanScore, Nisan 2026, ADR-017)
insan denetimine yüklenir; karar kilidi ilk tam karardan sonra geldiği için motor düzeltmeleri önce bitmeli.

## Geri dönmenin maliyeti
Orta. Kilit bir sunucu kontrolü + `gate.ts` dalı; paywall metni ve mağaza açıklaması değişir. Medya katalogdan bağımsız (ADR-017).

## Etkilenen
ADR-058 #107 (YERİNİ ALDI → ADR-091 #1), ADR-012 (kota kuralları kalır; "kota bitince deterministik mod" ücretsiz katmanın tanımına dönüşür),
ADR-017 "AI üretimi kullanılmaz" maddesi (YERİNİ ALDI → ADR-091 #4), ADR-069 (aha = başlangıç kararı, bedava kalır).
Kod: `subscription/gate.ts`, `subscription/Entitlements`, `decision/` okuma uçları, `data/exercises/*.yaml`, `tools/clip.py`, `data/copy/en.json`, `store.en.json`.

## Doğrulama
- Hiç abone olmamış hesap onboarding'den sonra sekmelere ulaşır (gate testi); ikinci tam haftalık kararın ayrıntısı premium yokken 403 `ENTITLEMENT_REQUIRED`.
- Barkod, arama, kayıt, trend premium olmadan çalışır (sunucu testleri).
- Her yeni motor kuralı `kural-ekle` testleriyle ve kaynağıyla; golden senaryolar güncellenir (beklenti değişikliği K1 listesinde Levent'e).
- Her medya dosyasında `review: {by: levent, checklist: pass}` ve üretim notu; katalog testi.

---

## Ek 1 · K-1201: kayıt bedava, karar ücretli, sunucu yetkisi
- **Durum:** KABUL (agent, teknik karar, ADR-019; ürün kararı #1 Levent'indir ve yukarıda kabul edildi) · **Tarih:** 2026-11-24 · **Kart:** K-1201 (#709)

### Ne kilitlenir, ne kilitlenmez
Bedava kalan (hiçbirine yetki kontrolü eklenmez): antrenman/set, yemek, barkod, arama, tartı, kardiyo kaydı; kilo trendi; hedefler
(`/v1/targets`, `/v1/targets/starting`); onboarding'in başlangıç kararı; dışa aktarma ve hesap silme (App Review 5.1.1(v)).
Kilitlenebilen tek şey: **tam karar** ("full call") — ayrıntısı, gerekçesi, `/basis`, `/what-if`, planı değiştirmesi.

### "Tam karar" ayrımı
Tam karar = kararın verildiği hafta **karar penceresi okunmuş** olan check-in kararı: `DecisionPipeline.windowRead(snapshot, parameters)`
true (haftalık omurga çalıştı, K-519 aynı bayrağı "neden"in satırları için kullanır; ikinci bir koşul kopyası yok). Bu yüzden sayılmaz:
ilk haftayı kapatan antrenman-yalnız karar (`firstWeek`), "bakımda gözlem" ve `window_not_full` / `data_insufficient` "henüz yok"
kararları, bildirilen durum haftası, mini kesim dönüşü, faz kapısı, antrenman merdiveninin dinlenme/toparlanma çağrıları.
Bunlar `windowRead = false` döner ve **asla kilitlenmez**. Güvenlik ağı (`SafetyNet`, kalıcı kayıtta `safety` işareti ya da
`SafetyNet.RULES` içinde bir gerekçe; `SafetyCalls.restsOnTheSafetyNet`) ve döngü sorusu bekleyen karar (`CYCLE_CHECK_NEEDED`, V4) tam
karar olsa bile **hiçbir hesapta kilitlenmez, her zaman uygulanır** (U6, sağlık) ve ücretsiz hakkı da harcamaz.

### Ücretsiz hak
`data/parameters/quota.yaml › free_full_calls: 1` (tag `urun`, kaynak ADR-091 #1; K2: kodda sayı yok). Hesabın ömür boyu ilk
`free_full_calls` tam kararı kilitsizdir (ilk tam haftalık karar, ADR-091 #1). Sonrakiler, **o an** `Entitlements.active` değilse
kilitlidir (`held_back`). Abonelik bitince yeni tam kararlar yine kilitlenir; hak yenilenmez (abone iken verilen tam kararlar da sayılır).
Harcanan hak **sağlık verisinin dışında**, `subscription.free_call_use` sayacında tutulur (`FreeCallUse`, `checkIn` her tam karar
saklandığında artırır): kararlar sağlık verisidir ve onay geri çekilince silinir; sayım onlardan yapılsaydı veriyi silmek hakkı yenilerdi.
Yük azaltan çağrılar (`DELOAD`, `FULL_REST_WEEK`, `STOP_LOAD_INCREASE`, `FIX_RECOVERY`) tam karar sayılmaz: asla tutulmaz, hakkı harcamaz
(yorgun kullanıcıya deload esirgenmez; **Levent'in onayı gerekir**; ADR-091 #1 "deload ücretli" demişti, bu istisna onunla çelişir).
Sayaç yalnız hesapla birlikte silinir (V6), dışa aktarmada `freeCallsUsed`, veri envanterinde sağlık-dışı hesap verisi.

### Kilit istemciye değil hesaba bağlı (sürüm uyumu ve tehdit modeli)
Mağazadaki 1.0 kilitli görünümü tanımaz (`.action` okur). Ama `X-Keel-Features: locked-calls` başlığı istemcinin kendi sözüdür: kapı
olamaz, yoksa başlığı göndermeyen herkes duvarı sonsuza dek aşar. Bu yüzden:
- Başlığı bir kez gönderen hesap sunucuda **işaretlenir** (`subscription.locked_calls_client`, sağlık dışı hesap verisi, hesapla silinir;
  `LockedCallsClients`). İşaretli hesapta başlık sonradan eksik olsa da kilit açıktır; check-in eskisi gibi tutar.
- `quota.yaml › legacy_clients_unlocked_until` (tırnaklı tarih, başlangıç **2027-01-15**, **Levent'in onayı gerekir**; 1.0.1 benimsenince
  Levent ayarlar): o günün sonuna dek hiç işaretlenmemiş hesap (yalnız 1.0 kullanan) bugünkü gibi sunulur: tutulmaz, tam görünüm,
  403 yok. Tarihten sonra başlık önemsizdir: ücretsiz hakkı geçmiş her abonesiz hesap kilitlidir. Başlık adı ve belirteç de
  `quota.yaml`'da (`client_features_header`, `locked_calls_feature_token`; K2); sözleşmede `ClientFeatures` isteğe bağlı başlık.
- Kilitli bir kararı başlıksız (eski) istemci okuyunca indirgenmiş şekil **verilmez** (çökerdi): 1.0'ın zaten işlediği 403
  `ENTITLEMENT_REQUIRED` (current, `/{id}`, `/basis`, `/what-if`, apply/undo/decline ve o kararı üreten check-in cevabı); defter o çağrıyı
  atlar. Kilitsiz çağrılar tam görünümde gelir. Başlıklı (yeni) istemci indirgenmiş görünümü alır.
- apply/undo/decline/basis/what-if tutulan çağrıda başlığa bakmadan 403 verir: abonesiz hesapta tutulan çağrı asla uygulanmaz.
- Başlıksız ve işaretsiz istemcinin (tarihten önce) tam kararı da **sayılır** (hak cihazlar arasında tutarlı), yalnız tutulmaz.

### Kilit nerede
Karar yine **hesaplanır ve saklanır** (abone olunca açılsın). Kilit sunucuda, üç yerde:
1. **Yazma:** `DecisionService.checkIn` kilitli kararı saklar ama `appliedByDefault` çağırmaz: plan hedefleri olduğu gibi kalır
   (`application` PENDING ya da NOT_NEEDED, değişmez). `apply` / `undo` / `decline` kilitli karar için 403 `ENTITLEMENT_REQUIRED`.
2. **Okuma:** `GET /v1/decisions/current`, `/v1/decisions/{id}` ve defter (`/v1/decisions`) kilitli çağrıyı indirgenmiş biçimde
   döner: `id`, `madeOn`, `weekOf`, `nextCallOn`, `locked: true`; `action`, `changes`, `reasons`, `confidence`, `application` yok.
   `/basis` ve `/what-if` 403 `ENTITLEMENT_REQUIRED` (mevcut hata şekli). Koç (`CallReader`) kilitli çağrıyı hiç görmez.
3. **Hedefler:** kilitli karar uygulanmadığı için `/v1/targets` değişmez; bedava katman bugünkü planla çalışır.

Kilit **okuma anında** hesaplanır (`held_back` ve abonelik şimdi), kayıtta kalıcı "kilitli" hüküm yok: abonelik webhook'u zaten
`Entitlements`'ı belirler (ADR-056).

### Abone olunca
Karar okuma uçlarından biri ya da check-in cevabı çağrıldığında (`releaseHeld`, tek işlemde; hatası `HeldRelease` ile warn olarak, hesapsız
loglanır ve okumayı düşürmez, çağrılar tutulu kalıp sonraki okumada yeniden denenir; abonelik süresi dolunca kilit geri gelir, yenilenince açılır): abone hesabın bütün `held_back` işaretleri kalkar; **yalnız
en son çağrı ve yalnız içinde bulunulan hafta ise** normal varsayılan-uygula yoluyla uygulanır. Eski kilitli çağrılar geçmiş olarak
görünür hâle gelir ama geriye dönük uygulanmaz (`apply` zaten yalnız en son çağrıyı kabul eder). Abonelik sonra düşse bile
işareti kalkmış çağrılar açık kalır: ödenmiş şeydir.

### Veri ve bağımlılık
- Göçler: `V55__decision_held_back_calls.sql` (`decision.weekly_call.held_back`, varsayılan false), `V56__subscription_free_call_use.sql`
  (sayaç). Sayaç eski hesaplar için 0'dan başlar: 1.0 kullanıcıları bir ücretsiz tam karar daha alır (kabul).
- Modül sınırı: `decision` → `subscription` bağımlılığı `allowedDependencies`'e eklenir (K5; `subscription` `decision`'a bağlı değil, döngü yok).
- Dışa aktarma: kullanıcının kendi verisi olarak kilitli çağrılar dahil **olduğu gibi** çıkar (veri sahibinin erişim hakkı, 5.1.1(v)).
  Bu, ücret duvarını dışa aktarmayla aşmanın yolunu açık bırakır; **bilinçli** (erişim hakkı), Levent'in bilgisine.

### Doğrulama
`FreeCallsTests` (tam karar ayrımı, hak, güvenlik ağı hiç kilitlenmez), `LockedCallViewTests` (indirgenmiş şekil), `ClientFeaturesTests` (başlık, eski istemci), `FreeCallUseTests`, `LockedCallsApiTests` (eski istemci değişmez; sağlık verisi silinince hak yenilenmez;
ikinci tam karar 403/okuma/uygulanmama, abone olunca açılma; veritabanı, CI), `ContractTests` (`locked` alanı), parametre kaynağı.

---

## Ek 2 · K-1202: telefon tarafı, paywall isteğe bağlı
- **Durum:** KABUL (agent, teknik karar, ADR-019) · **Tarih:** 2026-11-24 · **Kart:** K-1202 (#710)

### Karar
1. **Kapı kalkar.** `subscription/gate.ts` hiç abone olmamış hesabı artık kapatmaz (`required` üretilmez); onboarding sonrası sekmeler açılır.
   **Yumuşak teklif (ADR-072 #7):** onboarding biter bitmez kapatılabilir `/paywall` bir kez, kullanıcının az önce gördüğü plan önizlemesiyle açılır
   (`planPreviews.takeOffer`, yalnız bellekte); Kapat → sekmeler; kendiliğinden bir daha açılmaz, yeni açılışta hiç açılmaz.
   Gate yalnız "hesabın aboneliği ne" sorusunu sorar (deneme hatırlatması okur, K-707). Kök yerleşimde `subscribe` ekranı emekli grupta;
   `/paywall` sıradan, kapatılabilir ekran, deneme teklifi aynı.
2. **Başlık tek yerde:** `api/client.ts` her isteğe `X-Keel-Features: locked-calls` koyar (fetch sarmalayıcısında; 401 sonrası yeniden denemede de).
   Ad ve belirteç `data/parameters/subscription.json`'da (telefon YAML okuyamaz); sunucunun `quota.yaml` değerleriyle aynı olduğunu
   `api-client.test.ts` tutar (kayma olursa kırılır).
3. **Sözleşme `oneOf`:** karar okuyan 200 cevapları `CallView` = `Decision | LockedDecision`. Telefon cevabı alınan yerde
   `readCall` ile böler (`ready` tam karar, `locked` kilitli); `action`/`reasons`'a `locked` dalı olmadan dokunan kod derlenmez.
4. **Kilitli karar arayüzü:** This week kahramanı ve karar ekranı aynı bileşeni (`LockedCallView`) gösterir: "Your call is ready", hafta tarihi, tek satır, tek
   düğme (See plans). Eylem, sayı, gerekçe yok; "kredi" sözcüğü yok.
5. **Yükseltme anları:** (a) kilitli karar kendisi, (b) "neden"/what-if'te 403 `ENTITLEMENT_REQUIRED` → paywall'a giden not + düğme (kodlandı ama `why` ve `what-if` ekranları emekli olduğu sürece **ulaşılamaz**; ekranlar dönünce çalışır), (c) günün elle üçüncü
   öğününde fotoğraf/cümle önerisi: `photo_suggestion_after_manual_meals: 3`, yalnız AI açıksa. AI açıklığı: telefonda tek anahtar, `meal-photo` ekranının
   emekli listesinden (`RETIRED`) çıkması (`food/aiLogging.ts`); bugün kapalı, hiçbir şey çizilmez.
6. **Paywall metni:** satılan şey haftalık karar ("Every call after your first one"); kayıt, program, ağırlıklar ücretsiz olduğu için satılmaz; koç yalnız ekranı açıksa
   anılır. Mağaza açıklaması aynı çizgiye çekildi.

### Açık nokta
Hukuk sitesi `terms.md` "Coaching needs a subscription" diyor; ücretsiz katmanla uyum için Levent'in gözünden geçmeli (metin ürün/hukuk).

## Ek 3 · Levent onayları (2026-11-24, Part 8a-1 sonu)
- Ücretsiz katmanda ilk tam haftalık karardan sonraki kararlar saklanır ama plana **uygulanmaz** (plan donar); abone olunca yalnız bu haftanın kararı açılır ve uygulanır (Ek 1). **KABUL.**
- Yükü azaltan kararlar (deload, tam dinlenme, yük artışını durdur, toparlanmayı düzelt) ücretsizde de açık, kilitlenmez ve ücretsiz hakkı harcamaz (#1'deki "deload ücretli" ifadesinin yerine). **KABUL.**
- `legacy_clients_unlocked_until: "2027-01-15"`. **KABUL.**
- Onboarding sonunda kullanıcının kendi plan önizlemesiyle kapatılabilir teklif bir kez (ADR-072 #7 yumuşak hâli); ana ekran sözcük bütçesi 68 → 70. **KABUL.**
- Agent kararı (bilgi için): dışa aktarma kilitli kararları da içerir (kullanıcının kendi verisine erişim hakkı). Bekleyen: `terms.md` taslağı (`plan/evre-8-terms-taslak.diff`) 1.0.1 gönderiminde (K-1209) Levent'e.

## Ek 4 · Motor kararları (Levent, 2026-11-24; öneri `plan/evre-8-motor-onerisi.md`)
- **K-1203:** Güray G2 K-8'e sadık kalınır: maintenance gözlemi **en çok 2 hafta** (K-8'in üst sınırı); kilo sabitse açık 15. günde başlar. "1. günden açık" seçilmedi (kaynaksız, K-8'e aykırı).
- **K-1204:** Veri yeterliliği esner: gürültü payı kenar haftalardaki gerçek tartı sayısıyla hesaplanır (ADR-020 L-10 türetiminin n'e genellemesi, H1 §3.4), veri seyrekse pencere en çok 6 haftaya uzar. Güray sessiz (G2 B-7); parametreler [türetilmiş]/[seçim] etiketli. Kayıp tavanı (SafetyNet) yoğun veri şartını korur.
- **K-1205:** Kesimde kiloya oranlı hedef hız tabanı %0,5/hafta ([literatür] H3 B3; G2 K-15 konuşmacısı belirsiz olduğu için "Güray kuralı" diye etiketlenmez); tabanın altında ve uyum iyiyse kalori adımı 500 kcal (Güray G7 K-97); adım güvenlik tavanını aşacaksa atılmaz. GS-23'ün "devam" beklentisi "-500"e döner (ADR-027 #0 bu noktada yerini aldı; K1, Levent onaylı). Uygulama notu (motor incelemesi): K-97'nin 500 kcal adımı ve tavan koruması birlikte olunca kural yalnız hız ≤ min(1,0; 0,01·VA) − 0,5 olduğunda tetiklenir (80 kg'da ≈0,29-0,30 kg/hafta, ≤60 kg'da hiç); "tutarlı yavaş" ayrıca her hafta spine'ın hareket payı (0,29) ile taban arasında ve tüm pencere haftaları yoğun tartılı olmalı. Zararsız bırakıldı, Levent için işaretlendi.
- **Ek 4 devamı (Levent, 2026-11-24):** K-1203'e "emin değilsek kesme" koruması (`observation_flat_fraction: 0.5`; kilo hedefe doğru payın yarısından fazla oynadıysa 21 günlük okuma sürer) ve bunun 8 golden sonucu (GS-03/04/05/21/22/33/34/35) **KABUL**. Kayıp tavanı seyrek veriyle de çalışacak → K-1226. K-1205'e süreklilik şartı (`cut_pace_slow_weeks: 2`, agent kararı: tek duraklayan hafta adım attırmaz).
- **K-1226 uygulaması (agent kararı, Levent onayı kapsamında):** seyrek veride (son iki haftanın biri `min_weighins_per_week`'ten az) kayıp tavanı 1..`loss_cap_sparse_max_span_weeks` (5) hafta geriye bakar; k haftalık kayıp, k·tavan + NoiseMargin(kenar tartı sayıları) değerini aşarsa ve trend hâlâ bir hafta öncesinden düşükse güvenlik kararı. Tek haftalık fark seyrekte tavanı gürültüden ayıramaz (2+2 tartıda pay 0,82 kg; GS-27'nin 1,2 kg'ı tavanın yalnız 0,2 üstünde), k hafta geriye bakınca haftalık pay 1/k'ya düşer. Yoğun veri aynen eski kural (payı yok). Kalori adımı AŞAĞI için yoğun veri şartı (#740) bu PR'da korundu; kaldırmak ayrı iş. GS-27: tavan 9. hafta yerine 5. haftada yakalar (golden değişti, K1).
- **K1 onayı (Levent, 2026-11-24):** #740, #742, #744, #738, #741 PR gövdelerindeki test beklentisi değişiklikleri **KABUL**. K-1205'in dar çalışma aralığı şimdilik kalır (gerçek kullanımda yeniden bakılır).

## Ek 5 · AI sağlayıcısı, adım önerisi, yürüyüş hatırlatması (Levent, 2026-11-25)
- **AI koç sağlayıcısı: OpenAI.** Doğrudan DeepSeek API'si reddedildi (veri Çin'de, ZDR ve DPA yok, Garante yasağı: `arastirma/ham/deepseek-dogrulama-2026-11-24.md`). Levent: "uğraşmayalım" → OpenAI'nin standart API koşulları (API verisi eğitimde kullanılmaz; kötüye kullanım izleme için sınırlı saklama) kabul; ZDR başvurusu zorunlu değil (ADR-041/044'ün ZDR şartı bu sağlayıcı için gevşetildi, rıza metni sağlayıcıyı adıyla ve saklama koşuluyla söyler, V2). **Maliyet kuralı:** en düşük maliyetli, eski nesil küçük model; en yeni/büyük modeller kullanılmaz; aylık harcama tavanı ve kullanıcı başına kota zorunlu. Model adı ve fiyatı resmî dokümandan doğrulanmadan koda girmez (K6). Anahtar `~/.secrets/nextcall/openai-api-key` (600), depoda/logda yok (V5); VPS'e `KEEL_OPENAI_API_KEY` olarak Levent onayıyla.
- **Adım önerisi ilk ekranda** (ana ekran bütçesi 70 → 74). **Yürüyüş hatırlatması** beşinci tür, varsayılan kapalı (ADR-090'ın dört tür sınırı bu kadar genişler).
- **Yeni istek (K-1227):** kayıtlı yerler (ev, salon) arasında harita üzerinde noktalı yürüme rotası ve adım karşılığı; yerler cihazda, konum takibi yok, rıza metni güncellenir.
