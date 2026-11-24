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
Sayaç yalnız hesapla birlikte silinir (V6), dışa aktarmada `freeCallsUsed`, veri envanterinde sağlık-dışı hesap verisi.

### Kilit yalnız bunu bildiren istemci için (sürüm uyumu)
Mağazadaki 1.0 kilitli görünümü tanımaz (`.action` okur). Bu yüzden kilit **yalnız `X-Keel-Features` istek başlığında `locked-calls`
belirteci olan** istemciye uygulanır (virgülle ayrılmış liste, büyük/küçük harf duyarsız; başlık adı ve belirteç `quota.yaml`'da
`client_features_header` / `locked_calls_feature_token`, K2; sözleşmede `ClientFeatures` isteğe bağlı başlık parametresi). Başlıksız istemci
(1.0) için sunucu bugünkü gibi davranır:
- Check-in: karar **tam karar sayılır** (hak cihazlar arasında tutarlı kalır) ama **hiç tutulmaz**: varsayılan-uygula, tam görünüm.
- Okuma, `/basis`, `/what-if`, apply/undo/decline: eskisi gibi; 403 yok.
- Kenar durum (kabul): yeni istemciyle tutulmuş bir kararı eski istemci tam görünümde okur; eski istemcinin kilit göstermesi mümkün değil.
Aynı hesabın eski telefonda verdiği ikinci tam karar hakkı harcar ama kilitlenmez; kilit yalnız yeni istemciyle verilen karara gelir.

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
Karar okuma uçlarından biri çağrıldığında (`releaseHeld`, tek işlemde): abone hesabın bütün `held_back` işaretleri kalkar; **yalnız
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
