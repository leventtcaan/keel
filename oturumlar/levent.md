# Oturum günlüğü — Levent

> Her oturum sonunda 5 satır (skill `oturum-kapat`). Oturum başında son 3 girdi okunur.

## 2026-09-29 · Depo kuruluşu (gece, Levent uyurken)
- yaptım: keel deposu, anayasa (U/V/K/G), aktarım protokolü, sözlük, 7 skill; araştırma Studio'dan taşındı
- karar: AGENTS.md yok, yalnız CLAUDE.md (Levent); imza yok; görsel dil C
- takıldım: —
- sıradaki: ADR'ler, yol haritası, backlog, GitHub Project, prototip, iskelet
- AI: agent tüm dosyaları yazdı; Levent henüz incelemedi

## 2026-09-29 · M0 gece kurulumu (devam)
- yaptım: 15 ADR, mimari doküman, yol haritası, 95 görevlik backlog, 28 ekran prototip, backend + mobil iskelet, 49 kaynaklı parametre, 20 satırlık check-in spesifikasyonu (pending), CI, GitHub Project + issue'lar
- karar: ADR-001 ve ADR-014 KABUL (Levent'in önceki kararları); diğer 13 ADR ÖNERİ
- takıldım: yok. Düzeltilenler DURUM'da (RIR mantık hatası, kalori adımı ↔ BMR, gözlem süresi, Expo 57 API değişikliği)
- sıradaki: Levent incelemesi (K-011) → K-101 ön aktarımla
- AI: agent tüm dosyaları, kodu ve testleri yazdı; testlerin boşuna geçmediği bilerek bozularak doğrulandı; Levent henüz incelemedi

## 2026-09-29 · Sabah turu: L1-L3, RUBİN, prototip v2
- yaptım: L1 hareket gösterimi, L2 görsel kimlik, L3 özellik boşluğu araştırması; ADR-016/017/018; backlog 95 → 129; RUBİN token'ları + kontrast testi (PR #130); prototip v2 (37 ekran) yayında
- karar: RUBİN (Strava çakışması yüzünden turuncu bırakıldı), Levent hareketleri kendi çeker, Health'e yazma var, içe aktarmada trend hemen karar Pazartesi
- takıldım: bildirim bütçesi araştırmada kendi içinde çelişiyor (açık soru 2); eklentiler henüz kurulmadı
- sıradaki: Levent PR #130 merge + eklentiler + K-011 → K-101 ön aktarımla
- AI: prototip v2'yi subagent yazdı, ben baştan sona okuyup 8 tutarsızlık düzelttim (e1RM grafikle ledger uyuşmuyordu, gözlem 4 hafta yazılmıştı → 2, "X, not Y" kalıpları)

## 2026-09-29 · M0 kapanışı ve yetki devri
- yaptım: PR #130 merge; 13 ADR KABUL; ADR-019 (yetki devri); dal koruması, auto-merge, Dependabot; expo, security-guidance, jdtls-lsp, typescript-lsp eklentileri; CLAUDE.md, anayasa K5, 3 skill güncel; M0 kapandı
- karar: Levent: "her şey kabulüm", teknik izin + teknik ADR agent'ta, ürün/para/sağlık/veri Levent'te; bildirim 3 tür, tetikleyiciler uygulama içi
- takıldım: kendi hatam: 3 commit'e Co-Authored-By koydum (Studio'dan çalışırken keel kuralı yüklenmemişti) → soft reset + force-with-lease ile düzelttim, Levent'e söylendi
- sıradaki: K-101 motor alan tipleri, ön aktarımla
- AI: tüm ayar ve dokümanları agent yaptı; Levent kararları soru kartıyla verdi

## 2026-09-29 · Skill kaynakları ve mekanik kapılar
- yaptım: dış skill araştırması (L4); 4 disiplin skill'i vendor (superpowers, Trail of Bits); git_guard hook + commit-msg; pr-review-toolkit; 7 skill'imiz iyileşti; CI'da Tooling kontrolü zorunlu, action'lar SHA'ya sabit
- karar: dış skill plugin değil vendor (kaynak commit + lisans + keel notu); ertelenenler görev refs'ine bağlandı
- takıldım: hook testi ilk RED'de boşuna geçiyordu (eksik Python dosyası da 2 döner) → test yalnız hook'un işaretini sayıyor
- sıradaki: K-101 motor alan tipleri, ön aktarımla
- AI: tamamı agent; Levent "yapabildiğin yere kadar yap" dedi

## 2026-09-29 · M1 toplu koşu (öğleden akşama, Levent paralel işte)
- yaptım: K-101, K-102, K-103, K-104 (kısmi), K-105 birleşti; K-108, K-109 PR'da. Her görev: test önce → kod → 1-3 inceleme ajanı → düzeltme → aktarım dosyası → PR auto-merge. jqwik eklendi. M1 kural haritası + K-106 tasarım önerisi
- karar: toplu mod (Levent); eksik eşik araştırmadan kaynakla + onay listesi; teknik kararlar DURUM'da; sağlık yorumu gerektirenler (L-1…L-11) bekletildi
- takıldım: K-104 kartı kaynakla çelişiyor (hard stop vs daralt); K-106 "sabit kilo" tanımı ve uyum bandı kaynakta yok; K-114 BMR formülü kaynakta yok
- sıradaki: akşam kararlar + aktarım (DURUM › Akşam oturumu); o arada K-110, K-111
- AI: tamamı agent; öz-denetim ajanları 25+ gerçek hata buldu (ör. sessiz kalori aşımı, kırılan nextReview sözü, %800 oran riski, U4 değer sızıntısı)

## 2026-09-30 · M1 kapanışı + M2 ilk yarı (gece, toplu mod; compact öncesi durduruldu)
- yaptım: M1 kapandı (K-113 37 senaryo + DataSufficiency söz hatası, K-115 aralık); M2'de K-201 sözleşme, K-202 Postgres, K-203 kimlik, K-204 rıza, K-205 profil, K-207 spike, K-215 ortak altyapı birleşti; K-206 PR #160; K-210, K-214 dallarda
- karar: ADR-023 (JDBC, modül başına şema), ADR-024 (sözleşme v1), ADR-025 (oturum), ADR-026 (modül haritası: rıza + motor); git guard worktree düzeltmesi (#151)
- takıldım: yok; inceleme ajanları her görevde gerçek hata buldu (Tomcat'te V3 sızıntısı, AI rızası sağlayıcıya bağlı değildi, 500 dönen sınır değerleri, başka seansa düşen set)
- sıradaki: DURUM › DEVAM NOKTASI (30 Eyl) — zincir K-206 → K-210 → K-214, sonra K-218…K-217; prompt `plan/oturum-promptlari/M2-devam-2.md`
- AI: tamamı agent; Levent'e 15 soru birikti (DURUM), aktarım M1 akşam + M2 bu sohbette yapılacak

## 2026-09-30 (gece, toplu mod, compact öncesi)
- Birleşti: K-206, K-210, K-214 (silme tekrar denenir, silinen hesabın token'ı reddedilir, ikinci geçiş), K-218 (e1RM, H3 B15),
  K-219 (40 hareket), K-211 (6 program şablonu, taslak), K-208 (besin aralığı, H7, UPC-E), K-209 (öğün + bütçe), K-212 (karar kaydı).
- K-213 PR #171 açık (inceleme yapılmadı). Backlog'a K-220 (uyum) ve K-221 (TrainingStatus) eklendi.
- Disk doldu (Mac ~1 GB): Docker yok, DB testleri CI'da. Mutasyon betiğinde yeniden derleme hatası bulundu, düzeltildi.
- Yeni sorular 15-18 (program şablonları, FDC indirme izni, DECIDE_FOR_ME fazı, hard stop kararının saklanması).
- Sıradaki: K-213'ü kapat → K-216 → K-220 → K-221 → K-217 → sorular → M3 prompt'u.


## 2026-10-01 · M3 Part 3 sonu (toplu mod, compact sonrası)
- yaptım: K-228 #207, backend/bin #208, K-229 #209 (inceleme: outcomes, cycleAwaited), K-227 #211 (mini cut: iştah sorusu, hedef, V18, bitiş, sürerken sabit); M3 çıkış kontrolü; M4 dört part prompt'u
- karar: ADR-030 (Levent: 25 girişte rıza, 28 görünüş gizli, 31 mini cut açığı onay, 32 mini cut'ta adım yok, 30 artık risk, K-308 M4 başında)
- takıldım: mutasyonda DB testli filtre her mutantı "öldü" gösterdi (düzeltildi); DURUM'da eski blok içinde başlık eşleşmesi
- sıradaki: bu sohbette M3 aktarımı (docs/aktarim/M3/README.md 1-15); sonra M4 Part 1 (K-308 cihaz adımları önce)
- AI: bütün kod, test, ADR metni agent; ürün/sağlık kararları Levent (AskUserQuestion)

## 2026-10-01 · M4 Part 1 (toplu mod)
- yaptım: K-231 #212/#214 (rıza geri çekilince silme, aynı transaction, ikinci geçiş, onaylı API), K-230 #213, K-420 #216 (tutarlılık API'si, K-401'den bölündü), K-401 #217 (Bugün), K-409 #218 (kalan bütçe + Hedefler), K-402 #219 (tartı, girişte rıza, Health kilo), K-404 #220 (adım/uyku/aktif enerji)
- karar: silme düz `@EventListener` ile geri çekmenin transaction'ında (atomik); K-401 bölündü; dış antrenmanlar aktif enerjiyle (soru 37)
- takıldım: Docker yok → DB testleri CI'da (RED CI'da gösterildi); inceleme her görevde gerçek hata buldu (K-214'ten beri zamanlanmış silme geçişi transaction'sızdı; en eski günün uykusu silinecekti; Bugün eskiyordu)
- sıradaki: Part 1 aktarımı (docs/aktarim/M4 1-7); Levent: K-308 komutları, sorular 33-37; sonra Part 2
- AI: bütün kod, test, metin agent; ürün/veri soruları Levent'e (DURUM 33-37)

## 2026-10-02 · M4 Part 4 (toplu mod)
- yaptım: K-410 #253/#254 (bildirimler: yalnız yerel, saf plan, tek zincir, kuşak), K-411 #256 (dinlenme arka planda; Live Activity → K-426), K-412 #257 (Health'e yazma, tür başına izin, `keel:` işareti), K-423 #258/#259 (tarifler telefonda, `FoodPicker`/`ItemRows`), K-435 #268, K-433 #269; M4 çıkış kontrolü; M5 dört part prompt'u
- karar: ADR-036 (bildirimler), ADR-037 (33-54 cevapları; 48 ve 51 bana bırakıldı: düzenleme hedefi yeniler, onboarding'de hatırlatma adımı); ADR-031 Ek (yazma)
- takıldım: simülatörün yazma aracı karakter düşürüyor; çalışan simülatör diski ~4 GB tüketti (shutdown ile döndü); renk bekçisi `#51b` yorumunu hex sandı
- sıradaki: Levent dönünce Part 4 aktarımı (README 19-23; Part 2-3: 8-18); sonra M5 Part 1 (önce ADR-037 backend işleri + K-429, K-434)
- AI: bütün kod, test, ADR, prompt agent; ürün/sağlık/veri soruları Levent (AskUserQuestion, 23 soru)

## 2026-10-03 · M5 Part 2 (toplu mod)
- yaptım: ADR-041 işleri K-430 #273 (Epley çıkışı), K-523 #299 (üründe kişi adı yok, API kaynak yalnız tür), K-525 #300, K-527 #301, K-526 #302, K-524 #304 (literatür H9: dönüş yükü uygulanmaz, `BusyWeekDose`); koç altyapısı K-503 #303 (LLM portu, tek kapı), K-505 #305 (anlatım + itiraz, `ReplyCheck`), K-506 #306 (32 itiraz seti), K-508 #307 (günlük kota), K-504 #308 (serbest metinden öğün taslağı)
- karar: ADR-042 (LLM portu); her AI çağrısı sağlayıcı adı + veri türüyle kapıdan; "anlatılabilir karar" `decision`'da (V4); öğün ölçüsü grama modelce çevrilmez (ADR-004)
- takıldım: inceleme ajanları her görevde gerçek hata buldu — en ciddisi döngü sorusu bekleyen kararın modele gitmesi (V4); regex bekçiler ince dalkavukluğu göremiyor → soru 76; worktree sembolik bağı commit'e girdi
- sıradaki: Levent dönünce Part 2 aktarımı (README 10-19); sorular 74-77 (76 K-509'dan önce); sonra Part 3
- AI: bütün kod, test, ADR, prompt agent; ürün/sağlık/veri soruları Levent'e (74-77)

## 2026-10-03 · M5 Part 4 (toplu mod)
- yaptım: ADR-045 (73, 78-85 cevapları; K-534, K-535), K-514 #327 (öğün fotoğrafı sunucu: başlıktan boyut, piksellerden JPEG, göz kararı gram ESTIMATED), K-408 #328 (telefon: rıza önce, küçült, `DraftPicks`, gramın nedeni), K-510 spike → ADR-047 + H11, K-515 #329 (kilit ekranı metni sayısız) + ADR-048; M5 çıkışı; M6 prompt'ları
- karar: ADR-046 (fotoğraf yolu), ADR-047 (kendi ince Expo modülü, Vision OCR + FM), ADR-048 (`expo-widgets` 57, App Intents SDK 58 stabil olunca)
- takıldım: ImageIO ham fotoğrafı diske önbelleğe yazıyordu (inceleme); `app.json` plugin'i kamera izin metnini eziyordu (test analizi); "önce çöz" mutantı yığına sığdı → ayrılan bayt ölçümü; disk 3,5 GB, simülatör turu yine yapılamadı
- sıradaki: Levent dönünce M5 Part 4 aktarımı (README 31-35; Part 1-3: 1-30); Levent: Docker temizliği, K-308, soru 86; sonra M6 Part 1
- AI: bütün kod, test, ADR, prompt agent; ürün/sağlık/veri soruları Levent (AskUserQuestion; 73, 78-85 cevaplı, 86 açık)

## 2026-10-04 · M6 Part 1 (toplu mod)
- yaptım: K-535 #333/#336 (program geçmişi tablosu + hafta en azla okunur, ADR-049), K-534 #335 (seyrek rafta tekrar tavanı, sunucu "raf bitti" der), K-608 #338 (af haftaları, affedildiği an, sıfırlanmaz), K-603 #339 ("kilo sabit, bel düştü" karardan bağımsız), K-611 #340 (karar defteri, "after" dili), K-610 #341 ("kararı ne değiştirir?", canlı plandan örnek haftalar)
- karar: ADR-049 (hafta içinde değişen program en azla; kaçan plan haftası `judgedFrom`; ilk 8 haftanın riski `askedSince`); yeni parametreler `rep_ceiling_above_range`, `waist_signal_min_span_days`, `what_if_*`
- takıldım: inceleme her görevde gerçek hata buldu — en ciddileri: K-610 örneği bayat plandan kuruyordu ve 73 kg altında güvenlik ağına değiyordu; K-534 notu tekrardan çıkarıyordu (teknik kapısı yanlış not); K-608 sayısı geri düşebiliyordu; K-603 spine'la çelişebiliyordu; Docker yanıtsız, DB testleri CI'da (kontrol mutantları taslak PR'larla)
- sıradaki: Levent dönünce Part 1 aktarımı (docs/aktarim/M6/README.md 1-6); sorular 87-93; Part 2 başında sağlık kapısı (SCOFF, destek kaynağı, saklamama, eşikler)
- AI: bütün kod, test, ADR, metin agent; ürün/sağlık soruları Levent'e (87-93 + sağlık kapısı)

## 2026-10-04 · M6 Part 2 (Projeksiyon, sağlık kapılı) — toplu mod
- Sağlık kapısı → ADR-050 (Levent KABUL, dördünde önerilen): SCOFF BMJ 1999 doğrulandı; cevap saklanmaz, sonuç cihazda; bölge linki; H2 tam eşik seti.
- K-605 Hall 2011 modeli motorda (ADR-051, H12): yayımlanmış örnekler + makalenin doğrusallaştırması; "±1,7-2,5 kg" yanlış okunmuştu → aralık modelin belirsizliğinden.
- K-607 SCOFF ekranı #344 · K-613 projeksiyonun sayıları + `/v1/projection` #345 (ADR-052) · K-606 ekran #346. İncelemeler 500'ler, kayan nokta BMI, kapısız anahtar yakaladı.
- Actions dakikası bitti → Levent repoyu **public** yaptı. Disk 3,4 GB, simülatör yok. Sorular 94-96.
- Sıradaki: M6 Part 3 (K-604, K-601, K-602) — `plan/oturum-promptlari/M6-part3.md`; aktarım M6 1-10 bekliyor.


## 2026-10-04 · M6 Part 3 (Efor ve fotoğraf) — toplu mod
- K-604 #347 güç grafiği (haftanın en iyi e1RM'i, etiket = gerçek değer, iki pencere); K-614 #349 fotoğraf kütüphanesi yalnız cihazda + 4 haftalık pencere (K-601'den bölündü); K-601 #350 rehberli çekim (soluk son fotoğraf, çerçeve, eğim, zamanlayıcı, galeri); K-602 #351 karşılaştırma çıpası.
- İnceleme ve mutasyon her görevde gerçek hata buldu: yarım ilk hafta "haftanın en iyisi"; 30 Şubat; silinemeyen klasör uygulamayı açmıyordu; çift dokunuş iki fotoğraf + çift geri; kaydırmada fotoğraf/başlık ters.
- CI: soğuk ilk render 5 sn'yi aşıyordu (ölçüldü, `beforeAll`), saat dilimi fikstürleri yerel öğleden. Yeni bağımlılık `expo-sensors` (`motionPermission: false`).
- Disk 2,3 GB, sunucu yok → simülatör turu yok. Sorular 97-101 (97 iCloud yedeği, 101 jeton reddinde silme — veri kararı).
- Sıradaki: M6 Part 4 (K-609, K-612, M6 çıkışı) — `plan/oturum-promptlari/M6-part4.md`; aktarım M6 1-14 bekliyor.

## 2026-10-04 · M6 Part 4 (İçe aktarma, paylaşım, teslim) — toplu mod
- yaptım: K-609 bölündü → K-615 #354 (sunucu: toplu uç, içe aktarılan motorca okunmaz), K-616 #356 (Health kilo geçmişi + tartı "Year"), K-609 #357 (Strong/Hevy CSV, eşleme), K-612 #358 (paylaşım kartı), K-617 #362 (jeton reddinde fotoğraf kalır), metinler #361; M6 çıkışı; M7 prompt'ları
- karar: ADR-053 (içe aktarılan görülür, karara girmez), ADR-054 (kart), ADR-055 (87-104 Levent: hepsi önerilen); H13 (Strong/Hevy biçimleri gerçek dosyalardan — üreticiler yayımlamıyor)
- takıldım: içe aktarılan 3 haftalık kayıp ilk gün kalori kararı veriyordu (RED); "Assisted" barfiks emin eşleşiyordu; başarısız sahiplenme eski fotoğrafları gösteriyordu; RIR'sız set güç grafiğinde yok; disk 839 MB → 1,2 GB
- sıradaki: Levent dönünce M6 Part 4 aktarımı (README 15-19; Part 1-3: 1-14); disk (Docker, önbellekler); K-308; sonra M7 Part 1
- AI: bütün kod, test, ADR, prompt agent; ürün/sağlık/veri soruları Levent (AskUserQuestion, 87-104)

## 2026-10-04 · M7 Part 1 (Yetki sunucuda) — toplu mod
- yaptım: ADR-056; K-701 #364 (RevenueCat webhook'u HMAC imzalı, olay → saf durum makinesi, tekil + geri götürmez, `Entitlements.active`, V33, silme/dışa aktarma), K-703 #366 (koç ve öğün uçları 403 ENTITLEMENT_REQUIRED, kapı rızadan/kotadan önce); K-704, K-705 açıldı
- karar: HMAC (sabit başlık değil), webhook `/v1` dışı + sözleşme dışı, erişim yalnız `accessUntil`, SANDBOX yayında çıkar; para/mağaza hiçbiri hazır değil → ADR-012 Ek 1 (Levent: RevenueCat'e opak kimlik onaylı)
- takıldım: RED v1 geçersizdi (bean adı çakışması — ajanlar kaçırdı, CI yakaladı); mutasyon betiği DB testini seçiyordu → temel kontrolü eklendi; ortam alanı yoksa 500; iade testi satın almadan önce damgalıydı; disk 1,1 → 4,5 GB (simülatör önbelleği)
- sıradaki: Levent dönünce M7 Part 1 aktarımı (docs/aktarim/M7/README.md 1-2); sonra M7 Part 2 (K-705, K-702) — `plan/oturum-promptlari/M7-part2.md`
- AI: bütün kod, test, ADR, prompt agent; para/veri soruları Levent (AskUserQuestion, Part 1 başı)


## 2026-10-04 · M7 Part 2 (Paywall ve teslim) — toplu mod
- yaptım: K-705 #368 (`GET /v1/subscription` + `appUserId`), K-702 #369 (paywall, port, RevenueCat 10.11.0, geri yükleme, iptal Apple'da, 403 → See plans), K-706 #372 (onboarding sonu zorunlu paywall, kapı), K-707 #373 (deneme hatırlatması); M7 çıkışı; M8 prompt'ları
- karar: ADR-056 Ek 1, ADR-057 (port, tembel configure + UUID, teyit döngüsü, iki yasal bağlantı yoksa satış yok), ADR-058 (Levent 105-107: zorunlu paywall, iOS'ta duraklatma yok, hatırlatma fatura bildirimi)
- takıldım: App Store'da duraklatma yok (kabul kriteri düzeltildi); inceleme her görevde gerçek hata buldu — girişte tek başarısız istek kapıyı açıyordu, `ledger`/`what-if` korumasızdı, Apple ücret aldıktan sonra "olmadı" diyebiliyordu, ayarlar satın almadan sonra tazelenmiyordu, hatırlatma satın alma saatinde çalıyordu; macOS harf çakışması (`Paywall.tsx`↔`paywall.ts`); disk 4,6 → 1,5 GB
- sıradaki: Levent dönünce M7 Part 2 aktarımı (README 3-6; Part 1: 1-2); disk; K-308 + RevenueCat/ASC kurulumu; sonra M8 Part 1
- AI: bütün kod, test, ADR, prompt agent; ürün soruları Levent (AskUserQuestion, 105-107)

## 2026-10-04 · M8 Part 1 (Metinler ve envanter) — toplu mod
- yaptım: ADR-059 (Levent: hukuki inceleme yok, Pages bu repodan, ASC M10, vergi M11) + Ek 1; ADR-060; K-801 #375 (envanter 37 tablo sütun düzeyinde göçlere bağlı, politika/şartlar/feragatname, Pages canlı), K-808 #377 (rıza metni, soru 57), K-806 #378, K-809 #379, K-803 #380, #381 (sorumlu adı, sunucu bölgesi)
- karar: metinler koddan; katı SQL okuyucu; sağlık sınıfı sunucunun şemalarına bağlı; feragat istisnası cümle cümle; yayından önce iki kontrol; 18+ override zorunlu (Apple)
- takıldım: olgu denetimi 14 yanlış/eksik cümle buldu (oturum süresi, sayaç, RevenueCat, güvenlik durağı geri alınmaz, yağ tahmini saklı); envanter 7 gerçek açık (silinen UUID event_publication'da, Apple jetonu iptal yok…) → K-802; kişi adı istisnası hiç çalışmamıştı; Docker budandı 1,5 → 20 GB
- sıradaki: Levent dönünce M8 Part 1 aktarımı (docs/aktarim/M8/README.md 1-5); iletişim adresi; sonra M8 Part 2 (`plan/oturum-promptlari/M8-part2.md`)
- AI: bütün kod, test, ADR, metin agent; ürün/hukuk/para soruları Levent (AskUserQuestion, başta 6 + sonda 5)

## 2026-10-05 · M8 Part 2 (Denetimler ve teslim) — toplu mod
- yaptım: K-802 #385 (envantere bağlı uçtan uca silme; Modulith işlenen olayı saklıyordu → `completion-mode: delete`), K-804 #389 (tek anayasa komutu, mağaza metni, rota koruması), K-810 #391, K-814 #392, K-811 #393, K-813 #394, K-807 #395, K-812 #398 + #400 (Apple iptali), K-818 #402, #386; M8 çıkışı; M9 prompt'ları
- karar: ADR-061 (+ Ek 1), ADR-062 (+ Ek 1: privacy'de, privacy → identity), ADR-063 (Levent: fatProxy dışa aktarmada, silmede yeniden onay, kontrast M9'da), ADR-056 Ek 2 (olay kaydı 30 gün)
- takıldım: jeton temizliği yeniden kullanım tespitini bozuyordu (aile kuralı); kv okuyucusunda 6 kaçış yolu; iki "Evet" fazla iddialı (kontrast, renk); Apple'ın 400'ü bizim hatamızı gizliyordu; çakışan PR'da CI başlamıyor; SANDBOX beta'da kalmalı (prompt aksini diyordu)
- sıradaki: Levent dönünce M8 Part 2 aktarımı (docs/aktarim/M8/README.md 6-14; Part 1: 1-5); iletişim adresi; sonra M9 Part 1 (`plan/oturum-promptlari/M9-part1.md`)
- AI: bütün kod, test, ADR, metin, prompt agent; ürün/sağlık/veri soruları Levent (AskUserQuestion, Bitiş'te 4)

## 2026-10-06 · M9 Part 1 (Sunucu ayakta) — toplu mod + Levent'le canlı kurulum
- yaptım: ADR-064 (dış kapılar), K-907 #404 (üretim profili, fail closed), K-901 #405 (Compose + Caddy + şifreli yedek + prova), K-902 #407 (CI → VPS, zorunlu komut); Contabo yeniden kurulum, DuckDNS, Apple App ID + anahtar (Chrome'da birlikte); sunucu canlı
- karar: Dokploy/Appwrite yok; yedek Mac'e (age, rrsync -ro); ADR-065/066 (+ Ek 1); CI yalnız imaj + commit, sunucu `main`'i kendisi çeker
- takıldım: profil unutulunca sessiz geliştirme modu; ilk CI tasarımı anahtarı root yapıyordu; canlı koşu: iç içe `$$`, psql hatada 0, openrsync, pipefail/SIGPIPE, 1 GB bellek dar — hepsi testle kapandı
- sıradaki: Levent dönünce M9 Part 1 aktarımı (docs/aktarim/M9/README.md 1-3); iki soru (geri yüklemede silinen hesap, yedek Türkiye'de); sonra M9 Part 2 (`plan/oturum-promptlari/M9-part2.md`)
- AI: bütün kod, test, ADR, betik agent; para/hesap/sır adımları Levent (Contabo parolası, Apple girişi, .p8 indirme, GitHub sırrı)

## 2026-10-06/07 · M9 Part 2 (TestFlight ve cihaz) — toplu mod + Levent'le canlı cihaz turu
- yaptım: #408 EAS projesi + sunucu adresi; #409 K-618 (yerel Swift modülü, simülatörde `xattr` kanıtı); #410 K-815 VoiceOver duyuruları (inceleme: tekrar eden hata → oluş kimliği); mağaza derlemesi 1.0.0 (2) + ASC kaydı + development build iPhone'da; cihaz turu (giriş, HealthKit, kamera, K-618, VoiceOver ✅)
- karar: ADR-067 (Levent) — UI/UX revizyonu beta kohortundan önce, M9 Part 3 ertelendi; K-909, K-910 yeni
- takıldım: CDP ile simülatörde uygulama içi çağrı (1006); `--terminate-existing` development build'i Metro'dan kopardı; EAS gönderim sırası ~1 saat; Levent'in ilk gerçek deneyimi: "insanlar kullanmaz"
- sıradaki: TestFlight'a düştüğünü teyit + `ascAppId`; sonra UI/UX revizyonu (`plan/oturum-promptlari/UIUX.md`) — önce Levent'in örnek uygulamaları, ekran envanteri, artifact prototip
- AI: bütün kod, test, ADR, kayıt agent; Apple girişi/2FA, sudo, cihazda dokunuşlar ve ürün kararı Levent
