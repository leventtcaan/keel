# Kararlar (ADR dizini)

> Şablon ve kurallar: skill `karar-yaz`. KABUL yetkisi (ADR-019): teknik ADR agent'ta; ürün, para, sağlık/regülasyon,
> veri paylaşımı ve görsel/marka ADR'leri Levent'te.

| No | Karar | Durum |
|---|---|---|
| [ADR-001](kararlar/ADR-001-yigin.md) | Yığın: Spring Boot 4.1 + Modulith 2.1 + Expo SDK 57 | KABUL |
| [ADR-002](kararlar/ADR-002-depo-ve-surec.md) | Depo yapısı ve süreç (tek kaynak backlog, yalnız Claude Code, imza yok) | KABUL |
| [ADR-003](kararlar/ADR-003-karar-motoru.md) | Karar motoru: saf, deterministik, kurallar veri olarak | KABUL |
| [ADR-004](kararlar/ADR-004-hesaplama-katmanlari-llm.md) | Dört hesaplama katmanı, LLM portu, sunucu kotası, tek egress | KABUL |
| [ADR-005](kararlar/ADR-005-veri-modeli.md) | PostgreSQL + Flyway, zaman serisi, karar denetim kaydı | KABUL |
| [ADR-006](kararlar/ADR-006-mobil-mimari.md) | Mobil: expo-router, offline-first, üretilen tipler, token'lar | KABUL |
| [ADR-007](kararlar/ADR-007-gizlilik-ve-riza.md) | Fotoğraf cihazda, üç ayrı rıza, sağlık verisi logda yok | KABUL |
| [ADR-008](kararlar/ADR-008-besin-verisi.md) | USDA FDC + Open Food Facts, aralık, sapma kalibrasyonu | KABUL |
| [ADR-009](kararlar/ADR-009-test-stratejisi.md) | TDD, `pending` spesifikasyon testleri, mimari testler, CI | KABUL |
| [ADR-010](kararlar/ADR-010-parametre-ve-metin.md) | Kaynaklı parametre dosyaları, metin anahtarları | KABUL |
| [ADR-011](kararlar/ADR-011-kimlik-dogrulama.md) | Sign in with Apple | KABUL |
| [ADR-012](kararlar/ADR-012-abonelik-ve-kota.md) | RevenueCat, sunucu tarafı yetki ve kota | KABUL |
| [ADR-013](kararlar/ADR-013-barindirma.md) | Mevcut VPS + Docker Compose | KABUL |
| [ADR-014](kararlar/ADR-014-gorsel-dil.md) | Görsel dil C — cesur, enerjik (turuncu) | YERİNİ ALDI → ADR-016 |
| [ADR-015](kararlar/ADR-015-modul-haritasi.md) | Backend modül haritası (12 modül) | KABUL |
| [ADR-016](kararlar/ADR-016-gorsel-dil-rubin.md) | Görsel dil: C iskeleti + RUBİN paleti + koyu mod + sistem katmanı | KABUL |
| [ADR-017](kararlar/ADR-017-hareket-gosterimi.md) | Hareket gösterimi: kendi çekimler, ilk tekrar / son tekrar | KABUL |
| [ADR-018](kararlar/ADR-018-health-yazma-ve-ice-aktarma.md) | Apple Health'e antrenman yazma, geçmiş içe aktarma | KABUL |
| [ADR-019](kararlar/ADR-019-yetki-devri-ve-otomasyon.md) | Yetki devri: agent birleştirir (CI kapısı), teknik izin ve teknik ADR agent'ta | KABUL |
| [ADR-020](kararlar/ADR-020-m1-kural-kararlari.md) | M1 kural kararları (L-1…L-13, eşik onayları) + M2/M3 ön kararları | KABUL |
| [ADR-021](kararlar/ADR-021-omurga-sabit-olcumu.md) | Haftalık omurga: "sabit" ve "bekle" ölçümü (K-106) | KABUL (madde 2 ADR-027 ile değişti) |
| [ADR-022](kararlar/ADR-022-karar-sirasi-ayrintisi.md) | Karar sırasının ayrıntısı: antrenman kötüyse yemekten önce, sakin haftada plato (ADR-003 §4'ü genişletir) | KABUL |
| [ADR-023](kararlar/ADR-023-kalicilik-teknolojisi.md) | Kalıcılık: Spring Data JDBC, modül başına şema, olay kaydı göçle (K-202) | KABUL |
| [ADR-024](kararlar/ADR-024-api-sozlesmesi-v1.md) | API sözleşmesi v1: /v1, clientId idempotency, Decision birebir, aralıklar, araç zinciri (K-201) | KABUL |
| [ADR-025](kararlar/ADR-025-oturum-tasarimi.md) | Oturum: 15 dk JWT + dönen refresh (hash'li), Apple'dan yalnız `sub` (K-203) | KABUL |
| [ADR-026](kararlar/ADR-026-modul-bagimliliklari-riza-ve-motor.md) | Modül haritası: sağlık verisi tutanlar rıza kapısına, ölçüm motora bağlı; parametreler çalışma anında (K-206) | KABUL |
| [ADR-027](kararlar/ADR-027-m2-sonu-cevaplari.md) | M2 sonu: Levent'in cevapları (sorular 0-20) — yağ tahmini, LEA, hard stop etiketi, yaş 18+, FDC | KABUL |
| [ADR-028](kararlar/ADR-028-m3-basi-cevaplari.md) | M3 başı: sorular 21-24 (rıza geri çekince silme, LEA temkinli uç, hard stop sonrası yeniden sor, genel karar türü), referans görseller çizim | KABUL |
| [ADR-029](kararlar/ADR-029-birimler-ve-mobil-parametreleri.md) | Birimler: depolama metrik, dönüşüm telefonda, tek yuvarlama noktası; telefonun okuduğu parametreler JSON (aynı şema) | KABUL |
| [ADR-030](kararlar/ADR-030-m3-sonu-cevaplari.md) | M3 sonu: sorular 25-32 (girişte rıza, görünüş adımı gizli, mini cut açığı ve adımsızlık, safety işareti artık risk), K-308 M4 başında | KABUL |
| [ADR-031](kararlar/ADR-031-healthkit-kutuphanesi.md) | Apple Health: @kingstinct/react-native-healthkit, HealthAccess arayüzünün arkasında, yalnız okuma, izin metni en.json'dan | KABUL |
| [ADR-032](kararlar/ADR-032-salon-profili-ve-yuvarlama.md) | Salon profili, ekipman türü (dambıl = tek ağırlık), artış seans sonunda mümkün en yakın yüke yuvarlanır, plaka DP | KABUL |
| [ADR-033](kararlar/ADR-033-hareket-gecmisi-ve-rekorlar.md) | Geçmiş sunucudan (+ gönderilmemiş yerel kayıtlar), rekor yalnız çalışma setinden, izolasyonda yük rekoru yok, hacim rekoru yok | KABUL |
| [ADR-034](kararlar/ADR-034-tarif-hafizasi.md) | Tarif = malzemeler + porsiyon; sayı her seferinde veritabanından; öğünde `recipe:<id>` tek kalem, porsiyonla ölçeklenir; sağlık verisi | KABUL |
| [ADR-035](kararlar/ADR-035-superset-ve-kendi-hareket.md) | Süperset = setin üstünde `supersetId`; kullanıcının hareketi sınıflamasıyla (`custom:<id>`), programa girmez, silinmez | KABUL |
| [ADR-036](kararlar/ADR-036-bildirimler.md) | Bildirimler yalnız yerel (expo-notifications), üç tür telefonda planlanır, her değişiklik sırayla hepsini yeniden kurar, kapalı başlar | KABUL |
| [ADR-037](kararlar/ADR-037-m4-sonu-cevaplari.md) | M4 sonu cevapları (33-54): rıza metni silmeyi söyler, sıçrama sınırı → tekrar, setsiz antrenman sayılmaz, düzenleme hedefi yeniler, cinsiyete göre figür, onboarding'de hatırlatma adımı, mola haftası susturur | KABUL |
| [ADR-038](kararlar/ADR-038-durum-modu.md) | Durum modu: beş beyan, hafta duraklar (af yanmaz), karar `declared_context` ile bekler (güvenlik önce), 3. hafta tek soru; dönüş yükü/minimum doz kaynak bekler | KABUL |
| [ADR-039](kararlar/ADR-039-proaktif-tetikleyiciler.md) | Proaktif tetikleyiciler: saf motor kuralı, dört soru (G5 T-13, T-4, T-5, T-2), uygulama içi, bir kez, cevap karar değiştirmez | KABUL |
| [ADR-040](kararlar/ADR-040-ilk-sekiz-hafta.md) | İlk 8 hafta: kişinin haftası, H1 sessiz, antrenmansız sürüm, risk biten kullanıcı haftası 5-8 iken (herhangi bir sinyal, ağırlık yok), af takvim haftasıyla (tek Pazar), riskte soru bütçesi 5 | KABUL |
| [ADR-041](kararlar/ADR-041-m5-part1-sonu-cevaplari.md) | M5 Part 1 sonu cevapları (55-72): e1RM ile sıçrama, literatür taraması, 3 haftada bir "hâlâ öyle mi", uyum sayıları, programın günleri, sağlayıcı şimdi belgesel (gerçek ölçüm yayında), sıfır saklama şart, üründe kişi adı yok | KABUL |
| [ADR-042](kararlar/ADR-042-llm-portu.md) | LLM portu: `coach.LanguageModel` (paket içi), tek yol `CoachModel` → privacy kapısı, `keel.coach` yapılandırması, yalnız sahte sağlayıcı (ADR-041) | KABUL |
| [ADR-043](kararlar/ADR-043-m5-part2-sonu-cevaplari.md) | M5 Part 2 sonu cevapları (74-77): koç sınıflandırır, cümle yazmaz (serbest metin denetimi silinir); planlanan seans programdan; ≥3 hafta molada bir adım geri; eski kota sayaçları gece silinir | KABUL |
| [ADR-044](kararlar/ADR-044-llm-saglayici-belgesel.md) | Dil modeli sağlayıcısı (K-511): belgesel karşılaştırma — hiçbirinde ZDR varsayılan değil; ölçüm listesi OpenAI Luna (AB), Vertex Flash-Lite (eu), Mistral Ministral; Gemini Dev API elenir; rıza metni taslağı | KABUL (ADR-045) |
| [ADR-045](kararlar/ADR-045-m5-part3-sonu-cevaplari.md) | M5 Part 3 sonu cevapları (73, 78-85): seyrek rafta tekrar tavanı + not, geçmiş haftalar kendi program sayısıyla, ADR-044 kabul, çipler en çok 3; Part 4'te cihaz yok, disk Levent'te | KABUL |
| [ADR-046](kararlar/ADR-046-ogun-fotografi-yolu.md) | Öğün fotoğrafı yolu: `/v1/meals/photo` base64, sunucu >1024 px'i reddeder ve yalnız piksellerden JPEG yazar (metadata gitmez), model yalnız göz kararı gram (ESTIMATED → geniş aralık + gram sorusu), `meal photo` rızası, fotoğraf kotası | KABUL |
| [ADR-047](kararlar/ADR-047-cihaz-ustu-katman.md) | Cihaz üstü katman (K-510): kendi ince Expo modülümüz — Vision OCR (Apple Intelligence'sız) + Foundation Models erişilebilirliği Apple'ın nedenleriyle + koç sınıflandırması cihazda; iOS 27 görüntü kapsam dışı; `expo-ai` yayımlanınca yeniden bak; cihaz denemesi bekliyor | KABUL |
| [ADR-048](kararlar/ADR-048-kilit-ekrani-widget.md) | Kilit ekranı (K-515, K-426): `expo-widgets` 57 (kurulum cihaz adımında), widget metni saf fonksiyondan, sayısız varsayılan kodda (Apple'ın gizlemesi varsayılan değil); App Intents ve SDK 58 stabil olunca | KABUL |
| [ADR-049](kararlar/ADR-049-program-gecmisi-hafta-okumasi.md) | Program geçmişi (K-535): `training.program_history`, her değişimde bir satır; bir hafta içinde geçerli olan programların en azıyla okunur (U7); hedefler bugünkü programla | KABUL |
| [ADR-050](kararlar/ADR-050-projeksiyon-saglik-kapisi.md) | Projeksiyonun sağlık kapısı (K-607, K-606): SCOFF (Morgan 1999 BMJ, doğrulandı) orijinal + metrik; pozitifte nötr cümle + bölge linki (ABD ANAD, UK Beat); cevap saklanmaz, bayrak yalnız cihazda; H2 §4.3 tam eşik seti | KABUL |
| [ADR-051](kararlar/ADR-051-projeksiyon-modeli.md) | Projeksiyon modeli (K-605): Hall 2011 Lancet web eki denklem 1-9 motorda saf (`EnergyBalanceModel`, RK4, StrictMath); sabitler `projection.yaml`; yayımlanmış örneklerle sınandı (Şekil 2A farkı kayıtlı); aralık modelin belirsizliğinden + 2,5 kg taban, sabit ±kg değil | KABUL |
| [ADR-052](kararlar/ADR-052-projeksiyon-senaryolari.md) | Projeksiyonun sayıları (K-613): motorda; senaryo = planın tutulduğu gün payı (kalanı bakım); aralık = bakım ±1 MJ/gün + 2,5 kg taban; yalnız ileri; kapılar + güvenlik ağı; güvensiz senaryo yapılmaz | KABUL |
| [ADR-053](kararlar/ADR-053-gecmis-ice-aktarma.md) | Geçmiş içe aktarma (K-609, K-615, K-616): içe aktarılan görülür, karara girmez (motor IMPORT kiloyu ve içe aktarılan seansı okumaz); toplu antrenman ucu sağlık rızasıyla; dosya telefonda ayrıştırılır, yalnız H13'te doğrulanan sütunlar; birim ve dambıl yükü sorulur | KABUL |
| [ADR-054](kararlar/ADR-054-paylasim-karti.md) | Paylaşım kartı (K-612): yalnız kelimeler (kayıt, son karar, güç, kilo yalnız açılırsa), SVG → PNG telefonda, önbellek → paylaşım sayfası → sil; güvenlik kararları karta girmez (ADR-055 #104) | KABUL |
| [ADR-055](kararlar/ADR-055-m6-cevaplari.md) | M6 soruları 87-104 (Levent): hepsi önerilen; iş doğuranlar 89 metin, 97 yedek (K-618, K-308 sonrası), 100 eski test, 101 jeton reddinde fotoğraf silinmez (K-617), 104 kart kalıcı | KABUL |
| [ADR-056](kararlar/ADR-056-yetki-sunucuda.md) | Yetki sunucuda (K-701, K-703): RevenueCat webhook'u HMAC imzasıyla (sır ortamda, 5 dk tolerans, 401), `/webhooks/revenuecat` sözleşme dışı; durum saf makine, erişim yalnız `accessUntil`; olay kimliğiyle tekil, eski olay geri götürmez; `Entitlements.active`; koç/öğün uçları 403 ENTITLEMENT_REQUIRED, motor uçları açık; REST tazeleme K-704 | KABUL |
| [ADR-057](kararlar/ADR-057-paywall-telefonda.md) | Paywall telefonda (K-702): satın alma portu (`react-native-purchases` 10.11.0; Expo Go'da ve anahtarsız yok), SDK ilk gerektiğinde hesabın UUID'siyle (anonim kimlik yok); satın alma sonrası sunucu 12×5 sn sorulur; fiyat ve deneme mağazadan, deneme dili yalnız uygunken; iptal Apple'ın sayfasında iki dokunuş, iOS'ta duraklatma yok; ENTITLEMENT_REQUIRED → "See plans" | KABUL |
| [ADR-058](kararlar/ADR-058-m7-part2-cevaplari.md) | M7 Part 2 cevapları (105-107, Levent): onboarding sonunda zorunlu paywall, aboneliği biten deterministik modda (K-706); iOS'ta duraklat düğmesi yok; deneme bitmeden isteğe bağlı yerel hatırlatma — fatura bildirimi, üç türden sayılmaz (K-707) | KABUL |
| [ADR-059](kararlar/ADR-059-m8-basi-cevaplari.md) | M8 başı cevapları (Levent): hukuki inceleme yok (agent kaynaklı yazar, "uyumlu" demez; risk kayıtlı); soru 57 → rıza metni koda uyar; yasal metinler bu repodan GitHub Pages'te (geçici); ASC beyanları M10'da (taslak şimdi); vergi (K-805) satıştan sonra, M11; Docker budandı | KABUL · kısmen → ADR-063 |
| [ADR-060](kararlar/ADR-060-veri-envanteri-ve-yasal-metinler.md) | Veri envanteri koddan (`docs/yasal/veri-envanteri.json`, sütun düzeyinde göçlere bağlı, CI'da test); politika/şartlar/feragatname `docs/yasal/site/` → GitHub Pages; yasaklı ifade taraması metinlerde, feragat istisnası cümle cümle | KABUL |
| [ADR-061](kararlar/ADR-061-anayasa-denetimi.md) | Anayasa denetimi tek komut (`tools/anayasa-denetimi.sh`), kural tek uygulamada (Jest); mağaza metni taslağı `data/copy/store.en.json` aynı taramada + Apple sınırları; her rota korumalı grupta; telefon kv anahtarları envantere bağlı (K-813) | KABUL |
| [ADR-062](kararlar/ADR-062-apple-jeton-iptali.md) | Hesap silmede Sign in with Apple jetonu: silme anında yeniden yetki (taze kod → `/auth/token` → `/auth/revoke`), hiçbir Apple jetonu saklanmaz; `id_token`'ın `sub`'ı hesapla eşleşmeli; anahtar yoksa 503 ve silme sürer | KABUL |
| [ADR-063](kararlar/ADR-063-m8-part2-cevaplari.md) | M8 Part 2 cevapları (Levent): iç yağ tahmini dışa aktarmaya girer (U4 arayüz için aynen, K-818); silmede Apple için yeniden onay; metin dışı kontrast M9'da prototiple (K-816); iletişim adresi açık | KABUL |
| [ADR-064](kararlar/ADR-064-m9-basi-cevaplari.md) | M9 başı cevapları (Levent): Contabo VPS anahtarla giriş; beta için ücretsiz alt alan; şifreli yedek Levent'in Mac'ine çekilir (üçüncü taraf yok); Apple Developer aktif; koç AI beta'da kapalı; Dokploy/Appwrite yok (düz Compose + Caddy) | KABUL |
| [ADR-065](kararlar/ADR-065-vps-kurulumu.md) | VPS kurulumu (K-901): Compose (postgres + backend `prod` + Caddy), imaj repo kökünden, sırlar `/opt/keel/keel.env` 600; Caddy erişim günlüğü kapalı, journald 14 gün; günlük `pg_dump` `age` ile şifreli, VPS 7 gün, Mac'e salt okunur çekme 14 gün; geri yükleme provası betikli; SSH yalnız anahtar | KABUL |
