# ADR-096 · Para haritası: çekirdek herkese, derinlik aboneye (Evre 9d)
- **Durum:** KABUL (Levent, 28 Kas 2026: "A · Derinlik ücretli" + "Fotoğraf çekimi sınırsız")
- **Tarih:** 2026-11-28 · **Karar veren:** Levent (öneren: agent; dış göz: Codex gpt-6.1-sol, Antigravity Gemini 3.8 Flash)

## Bağlam
Levent'in para ilkesi (Durak 4, `plan/tasarim-gezinti-notlari.md:71-73`; `plan/evre-9-tasarim.md` ilke 5-6): her özelliğin çekirdeği ücretsiz;
devamı, fazlası, dahası ücretli; AI koç ücretlinin merkezi. ADR-091'in başlığı "kayıt bedava, karar ücretli". 9d'nin işi her özellik için
"ücretsiz nerede biter, dahası ne" sorusunu tek tabloda cevaplamak. Fiyat değişmiyor: $12,99/ay, $59,99/yıl, 2 hafta deneme, lifetime yok, reklam yok.

Bugünkü durum (28 Kas, kodda doğrulandı):
- Kilitli olanlar: ilk tam karardan sonraki kararlar (`DecisionService.java:258`, `quota.yaml` free_full_calls 1), koç model soruları (3 ömür boyu
  deneme, `coach.yaml` coach_free_trial_questions; `Explanation.java:136`), koç hafızası (`CoachConversationController.java:91`), yazıdan/fotoğraftan
  öğün (`MealDraft.java:114`), yürüyüş haritası (`walks/mapAccess.ts:14`).
- Kilitsiz olanlar: ilerleme fotoğrafı (sınırsız, cihazda), grafik ve geçmiş (kilo 84 gün `progress.json`, güç 90 gün ve geçmiş 365 gün
  `workout.json`), paylaş kartı, "Too heavy?" (yalnız alandaki kiloyu düşürür, `app/workout.tsx:1094`; sonucu hiçbir yere gitmez).

Pano: claude.ai Artifact "keel Para Haritası" (özel). Dış göz brifi ve iki ham cevap paylaşılan not klasöründe (`9d-dis-goz/`), depoda değil.

## Karar sürücüleri
- **Bugün ücretsiz olan hiçbir şey kilitlenmez.** Kilit yalnız yeni derinlikte (Apple 3.1.2(a) "ongoing value", MyFitnessPal 2022 barkod tepkisi
  `arastirma/ham/rakip-ozellik-2026-11-24.md:318-320`).
- **Güvenlik ve yük azaltma asla kilitli değil** (ADR-091 Ek 3).
- **Kişi kendi verisine hep erişir:** kayıt listesi, çekilmiş fotoğraf, rekor, dışa aktarma, hesap silme (ADR-091 Ek 3 dışa aktarma notu, V6).
- **Maliyet:** fotoğraf ve grafik cihazda ya da hazır veride; yeni sunucu ya da model maliyeti yok. Koç tavanları aynen (ADR-092).

## Karar
**A · Derinlik ücretli.** Harita:

| Özellik | Ücretsiz | Abonelik | Durum |
|---|---|---|---|
| Haftalık karar | başlangıç + ilk tam karar, gerekçesiyle; güvenlik, döngü sorusu, yük azaltan her karar | her hafta karar, "neden" ayrıntısı, what-if | ADR-091 (aynen) |
| Koç | motorun kendi cümleleri + ilk karara 3 model cevabı; **hak yalnız geçerli model cevabında düşer** | sohbet (günde 25, tavanlı), koç hafızası | ADR-092 (aynen) + #3 |
| Öğün: yazıdan/fotoğraftan | adla kayıt, arama, barkod | yazıdan ya da fotoğraftan taslak | ADR-091 (aynen) |
| Yürüyüş | kalan adım, dakika, elle yürüyüşler, hangisi kapatır | harita, rota, yer arama, adım ölçümü | ADR-094 Ek 6 (aynen) |
| İlerleme fotoğrafı | **çekim sınırsız**; hepsini görmek ve silmek; son set ile Gün 1 ya da bir önceki set yan yana (bugünkü karşılaştırma) | istediğin iki günü karşılaştırma, zaman şeridinde oynatma | yeni |
| Geçmiş ve grafik | bugünkü grafik aralıkları (kilo 84 gün, güç 90 gün), tam kayıt listesi (sayfalı, süresiz), tüm zaman rekorları | 6 ay, 1 yıl, tümü; iki dönemi ya da iki hareketi yan yana | yeni |
| "Çok ağır mı?" | şimdi hafifle; cevap sonraki antrenmanın önerisine gider | koç neden ağır geldiğini motorun okuduğu zorlanma eğiliminden (RIR, K-1218) anlatır | yeni |
| Paylaş kartı | fotoğraflı kart; video gelince (K-1245) temel video da | ileride ek kart şablonları (bugün yok) | Ek 2 #10 genişledi |

Ayrıntılar:
1. **Kilit nerede görünür (yükseltme anları, en çok üç):** sonraki karar hazır olduğunda (kilitli kart, uygunsa deneme teklifi; ADR-091 Ek 7);
   dördüncü koç sorusunda (yazılan soru silinmez); grafikte uzun aralık seçildiğinde (bugünkü grafik çalışmaya devam eder). Kendiliğinden açılan
   paywall yok. Güvenlik ya da yük azaltma anında satış yok (agy'nin "yükü düşürdükten sonra yükseltme" önerisi reddedildi).
2. **Kilit görünüşü** yürüyüş haritasının kalıbıyla aynı: kum kilit grubu, tek cümle + "Planları gör"; abonelik okunamazsa kilit değil
   "yüklenemedi". Abonelik telefonda `GET /v1/subscription` `.active` ile okunur (ADR-012); ücretsiz aralıklar parametrede (K2).
3. **Koç denemesi:** bugün doğrulayıcı model cevabını reddettiğinde (`Explanation.java:174-176`) kişi motorun cümlesini görür ama deneme hakkı
   düşmüş kalır; model ulaşılamazken geri veriliyor (`:166`). Hak yalnız geçerli model cevabında düşer.
4. **"Neden ağır geldi" yalnız motorun bildiğiyle:** motor uyku ve yemeği okumaz (`training.yaml:287` notu), zorlanma eğilimini okur. Koç
   motorun desteklemediği bir neden söylemez (U1, U3).
5. **Paywall metni** "günde 25 soru"yu koşulsuz vaat etmez: global aylık tavan dolunca model herkes için kapanır (`coach.yaml` coach_monthly_budget_usd).
6. **Sonra (kart yok, aday):** cihazda rapor paketi (seçili haftalar + isteğe bağlı fotoğraf, PDF; ham dışa aktarma ücretsiz kalır), adlandırılmış
   grafik görünümleri, birden fazla salon düzeni. Fotoğraf hizalama gölgesi ve karşılaştırma kaydırıcısı zaten var ve ücretsiz kalır
   (`photos.json` photo_ghost_opacity, compare_slide_step); ısınma ve plaka hesabı zaten var ve ücretsiz kalır (`en.json` workout.warmup, plates).

## Neden
- Levent'in ilkesini (çekirdek ücretsiz, dahası ücretli) ADR-091'i bozmadan uygular; B'de aboneliğin değeri karar haftası dışında görünmüyordu.
- Kategori kalıbı: Hevy ücretsiz grafik geçmişini 3 ayla sınırlar, yıl ve tüm zaman Pro'dadır; Strong "your workout data will always be
  available" der (resmî sayfalar, 28 Kas okundu: hevyapp.com/features/gym-performance, help.strongapp.io/article/132-strong-pro).
- Fotoğrafta çekim sınırsız: 4 haftalık pencere literatür aralığıdır (`onboarding.json` photo_interval_weeks, tag literatur); daha sık çekim az
  değişim gösterir, kilidi orada koymak değeri az bir şeyi satar ve kayıt alışkanlığını ücretli kapıya çevirir (Codex). Değer karşılaştırmada.
- İki dış göz de C'yi reddetti; A'da hemfikir, yalnız fotoğrafta ayrıştılar (agy: 4 haftada bir set ücretsiz). Levent sınırsız çekimi seçti.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| B · Yalnız akıl ücretli (fotoğraf, grafik, paylaş tamamen ücretsiz) | Tek cümlelik mesaj, ama abonelik karar haftası dışında değer göstermiyor; Levent'in "dahası ücretli" ilkesini karşılamıyor |
| C · Geniş kilit (ilk fotoğraf setinden sonrası, 4 haftadan eski grafik, video kart ücretli; koç denemesi 1) | Bugün ücretsiz olanı geri alır; kendi fotoğrafına erişemiyor hissi; MyFitnessPal barkod tepkisi; iki dış göz de reddetti |
| Fotoğrafta 4 haftada bir set ücretsiz (Levent'in ilk fikri, agy) | Literatür aralığı zaten 4 hafta; kilit seyrek ve değeri az bir şeyde çıkar, kayıt alışkanlığını keser |
| "Yükü düşürdükten sonra" yükseltme anı (agy) | Güvenlik anında satış baskıdır (U7 ruhu) |

## Sonuçlar
- Olumlu: yükseltme anı karar dışında iki yere daha çıkar (uzun grafik, serbest fotoğraf karşılaştırması); yeni maliyet yok; ücretsiz kullanıcı
  bugün sahip olduğu hiçbir şeyi kaybetmez.
- Olumsuz (kabul edilen bedel): istemci tarafı kilit (grafik aralığı, fotoğraf karşılaştırması) teknik olarak aşılabilir; veri zaten kişinin,
  sunucu kapısı gereksiz. Ölçüm yok (analitik yok, ADR-091 #4): hangi anın dönüştürdüğü bilinmiyor.

## Geri dönmenin maliyeti
Düşük-orta. Ücretsiz aralıklar parametrede; kilidi kaldırmak kolay. Kilitlenmiş bir şeyi sonradan ücretsize açmak kolay, tersi zor
(bugün ücretsiz olanı kilitlemek bu ADR'nin sürücüsüne aykırı).

## Etkilenen
- Kartlar: K-1259 (geçmiş sayfalı, rekor düşmez), K-1260 (uzun aralık grafik), K-1261 (serbest fotoğraf karşılaştırması), K-1262 / K-1263
  ("Çok ağır mı?" cevabı sonraki öneriye), K-1264 (koç denemesi geçerli cevapta düşer), K-1265 (koç "neden ağır geldi"); K-1245 notu (video ücretsiz).
- ADR-091 (değişmez, haritanın ilk satırları), ADR-092 #7 (deneme sayımı inceltildi), ADR-094 Ek 2 #10 (video da ücretsiz), Ek 6 (aynen).
- `data/parameters/progress.json`, `workout.json` (ücretsiz aralıklar), `subscription/words.ts` (abone satırı yeni yüzeyleri adlandırır).

## Doğrulama
- Her kart testi: ücretsizde bugünkü aralık ve karşılaştırma çalışır, uzun aralık/serbest karşılaştırma kilit grubunu gösterir; abonelik
  okunamazsa kilit görünmez; güvenlik ve yük azaltan yollar abonelik okumaz.
- `tools/anayasa-denetimi.sh` (K2: aralıklar koda gömülü değil).
- Simülatörde Levent'e gösterilir (önizleme modu, K-1253).
