---
guncelleme: 2026-10-03
---
# DURUM

> Oturum başında ilk okunan dosya (skill `oturum-baslat`). Oturum sonunda güncellenir (skill `oturum-kapat`).

## Şu an
**M5 Part 1 (Motor ve check-in) BİTTİ (3 Eki)** — ADR-037 işleri, K-516, K-512, K-513, K-501, K-502 (+ K-518, K-519, K-520) birleşti; aktarım bekliyor; K-430 Levent'te.
**M4 KAPANDI (2 Eki, kod)** — Part 4: K-410 bildirimler, K-411 dinlenme arka planda, K-412 Health'e yazma, K-423 tarifler
telefonda. Cihaz adımları (K-308) ve klipler (K-419) Levent'te. Sıradaki koşu **M5** (`plan/oturum-promptlari/M5.md`).
**M4 Part 1 (Bugün ve ölçüm) BİTTİ (1 Eki)** — K-231, K-230, K-420, K-401, K-409, K-402, K-404 birleşti; K-308 cihaz adımı Levent'te.
**M3 · Mobil kabuk KAPANDI (1 Eki, kod)** — cihaz derlemesi + TestFlight hariç.
Aktarım bekliyor: M1 (akşam kısmı), M2, M3 (`docs/aktarim/M3/README.md` 1-15). Sıradaki koşu **M4 · Günlük akış**, dört
part (`plan/oturum-promptlari/M4.md`, `M4-part1.md`). M0, M1, M2 kapandı.
Çalışma modu değişti → **ADR-019:** teknik işte agent karar verir, uygular, PR'ı `--auto --squash` ile birleştirir
(dal koruması: iki CI kontrolü zorunlu). Levent'i bekleyen: ürün kapsamı, para, sağlık/regülasyon, kullanıcı
verisinin dışarı gitmesi, hesap/sır, mağaza yayını, kişisel iş.

## Şu anki koşu — M1 kalanı + M2 (29 Eyl akşam, toplu mod; bağlam sıkışırsa buradan devam)
Prompt: `plan/oturum-promptlari/M2.md`. Levent paralelde başka işte; bu session M1 kalanını (ADR-020) ve M2'yi uygular,
aktarıma **başlamaz**; bitince M3 prompt'unu yazar (`plan/oturum-promptlari/M3.md`). **Session kapanmaz:** Levent dönünce
M1 (bu session'ın yaptığı kısım) ve M2 aktarımı bu sohbette yapılır.
**Her görev döngüsü:** `gorev-baslat` → test önce (geçerli RED) → kod → `./gradlew build` → pr-review-toolkit ajanları →
bulgular TDD ile + mutasyonla kanıt (betik: yedekten geri yükle, `git checkout` DEĞİL) → `docs/aktarim/<M>/<K-ID>.md` →
PR `--auto --squash` → bu tablo. Paralel iş: `git worktree` (`../keel-<iş>`).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-101 değişikliği (NO_DECISION_YET gerekçeli, U14 çapa zorunlu) | ✅ birleşti | #143 | `M1/K-101.md` › ADR-020 kısmı |
| build: `tasks.register<Test>` + deprecation = kırmızı build | ✅ birleşti | #144 | (küçük) |
| K-104 kalanı (LEA, hızlı kayıp → daralt; tek hard stop) | ✅ birleşti | #145 | `M1/K-104.md` › ADR-020 kısmı |
| K-110 basamak 3 (L-12 iki sinyal) | ✅ birleşti | #146 | `M1/K-110.md` › ADR-020 kısmı |
| K-106 omurga (+ ADR-021 "sabit" ölçümü) | ✅ birleşti | #147 | `M1/K-106.md` |
| K-107 kalori merdiveni | ✅ birleşti | #148 | `M1/K-107.md` |
| K-114 başlangıç hedefi (+ `arastirma/ham/H6` Mifflin) | ✅ birleşti | #149 | `M1/K-114.md` |
| K-112 montaj (+ ADR-022 sıra; spesifikasyon 24/24 gerçek; mini cut WC-20) | ✅ birleşti | #150 | `M1/K-112.md` |
| K-113 altın senaryolar (37 yolculuk + DataSufficiency söz hatası düzeltildi) | ✅ birleşti | #152 | `M1/K-113.md` |
| K-115 sapma kalibrasyonu (aralık: formül + tartı payı; son iki pencere anlaşmalı) | ✅ birleşti | #153 | `M1/K-115.md` |
| tooling: git guard worktree dalını görür | ✅ birleşti | #151 | (küçük) |
| **M2** K-202 PostgreSQL + Flyway (+ ADR-023) | ✅ birleşti | #154 | `M2/K-202.md` |
| K-201 sözleşme v1 (+ ADR-024) | ✅ birleşti | #155 | `M2/K-201.md` |
| K-215 ortak altyapı (hata, SafeLog, health) | ✅ birleşti (gerçek Tomcat'te V3 sızıntısı bulundu, düzeltildi) | #156 | `M2/K-215.md` |
| K-203 kimlik (+ ADR-025) | ✅ birleşti; güvenlik incelemesi 3 bulgu düzeltildi | #157 | `M2/K-203.md` |
| K-204 rıza | ✅ birleşti; inceleme: AI rızası sağlayıcıya bağlandı, `seq` sırası | #158 | `M2/K-204.md` |
| K-205 profil | ✅ birleşti; inceleme: katı JSON tipleri | #159 | `M2/K-205.md` |
| K-207 besin spike (ADR-008 güncellendi) | ✅ main | — | `M2/K-207.md` |
| K-206 ölçüm (+ ADR-026) | ✅ birleşti; inceleme 5 bulgu düzeltildi | #160 | `M2/K-206.md` |
| K-210 antrenman kaydı | ✅ birleşti; inceleme 6 bulgu düzeltildi | #161 | `M2/K-210.md` |
| K-214 gizlilik (silme, dışa aktarma, egress; V7) | ✅ birleşti; inceleme: silme tekrar denenmiyordu, silinen hesabın token'ı yazıyordu → düzeltildi | #162 | `M2/K-214.md` |
| K-218 set tipi, yük modeli, e1RM (+ H3 B15) | ✅ birleşti; inceleme: int taşması, tekrar/RIR tavanı | #163 | `M2/K-218.md` |
| K-219 hareket kataloğu (40 hareket) | ✅ birleşti; inceleme: takas deseni, T-bar, face pull; K-210 beklentisi veriye göre | #164 | `M2/K-219.md` |
| K-211 program (V8, 6 şablon taslak) | ✅ birleşti; inceleme: iç içe okuma, eşzamanlı değiştirme 500, kol hacmi K-61 | #165 | `M2/K-211.md` |
| K-208 besin aralığı + barkod (V9, + H7) | ✅ birleşti; inceleme: etiket sınırı kaynaksız yön, UPC-E, göç yorumu; CI sıralama testini yakaladı | #166 | `M2/K-208.md` |
| K-209 öğün + günlük bütçe (V10) | ✅ birleşti; inceleme: boş assertion, tekrar gönderim sırası | #167 | `M2/K-209.md` |
| K-212 Snapshot + karar kaydı (V11) | ✅ birleşti; inceleme: döngü sorusu herkesten alınıyordu, yaş 0 → 500, dışa aktarmada yağ alanı | #168 | `M2/K-212.md` |
| K-213 check-in soruları + soru bütçesi | ✅ birleşti; inceleme: sorulan soruya 400 (veri GET→POST arasında değişince), GET/POST hafta kuralı ayrıydı, `needed` sonsuz döngü riski, aynı gün iki ölçüm | #171 | `M2/K-213.md` |
| K-216 kararı hedeflere uygula + geri al (V12) | ✅ birleşti; inceleme: bayat karar, split sığmayınca apply reddi, hedefsiz plan, LEA tabanı (soru 11); CI: text block boşluğu | #172 | `M2/K-216.md` |
| K-220 uyum kayıtlardan (WeekTally) | ✅ birleşti; inceleme: adım hedefi geriye uygulanıyordu, plandan önceki haftalar, K-216 yarışı (satır kilidi) | #174 | `M2/K-220.md` |
| K-217 programa yansıma (V13 tut/deload/dinlenme, V14 sonraki seans) | ✅ birleşti (iki PR); inceleme: aynı gün tutma kapanmıyordu, check-in'de başlayan tutma önceki hedefi kaçırıyordu, tek taraflı çift artış, eksik set, geç biten antrenman hedefi geri alıyordu; CI: List.of().contains(null) | #175, #176 | `M2/K-217.md` |
| K-221 TrainingStatus (set kaydından) | ✅ birleşti; inceleme: kayıt tutmayana iki haftada bir tam mola, dinlenme haftası kendini tetikliyordu, tutma haftaları gün/7, durum her okumada | #177 | `M2/K-221.md` |
| K-225 profil: 18+ ve kısıt alanı rızada (ADR-027 #13, #14) | ✅ birleşti; inceleme: kesin-18 ADR'ye yazıldı, ADR-015 tablosu | #182 | `M2/K-225.md` |
| K-223 motor: ADR-027 #0, #1, #11b, #19 | ✅ birleşti; inceleme: L-4 LEA artışını eziyordu (güvenlik), kadın penceresi, pay sınır testi | #183 | `M2/K-223.md` |
| K-226 FDC Foundation + SR Legacy (V15) | ✅ birleşti; inceleme: negatif karb Foundation'ı düşürüyordu, fl oz, eski sürüm satırları | #184 | `M2/K-226.md` |
| K-224 iç yağ tahmini (RFM + referans görünüş, V16) | ✅ birleşti; inceleme: bel 9 → RFM −336 → +6.720 kcal (olanaksız değer artık yok sayılıyor), "küçüğü" bulk kapılarını susturuyordu (artık kurala göre alt/üst), belge "yalnız kapı" diyordu | #185 | `M2/K-224.md` |
| K-222 faz/hard stop uygulaması, DECIDE_FOR_ME, döngü sorusu (V4), genel etiket | ✅ birleşti; inceleme: hard stop geri alınıyordu (artık 409), pencerede tartı yokken cut hedefi kalıyordu, "saklanmaz" metni; soru 23, 24. Mini cut → K-227 (M3) | #186 | `M2/K-222.md` |

**M1 önceki koşu** (öğleden akşama, hepsi birleşti): K-101 #134 · K-102 #135 · K-103 #136 · K-104 ilk kısım #137 ·
K-105 #138 · K-108 #139 · K-109 #140 · K-110 ilk kısım #141 · K-111 #142. Aktarım dosyaları `docs/aktarim/M1/`.

**Kararlar:** ADR-020 (L-1…L-13, M2/M3 ön kararları). Apple kimlikleri (Team/Bundle/Services ID): Levent "sonra vereceğim"
dedi → kod değer beklemeden yazılır, yapılandırmadan okunur; session sonunda sorulacak.


**ADR-037 işleri (Part 4 sonu, cevaplardan):** K-435 mola haftası susar #268 ✅ · K-433 figür cinsiyete göre #269 ✅ ·
M5 Part 1 başına: K-429 (rıza metni `2-draft`; 26 backend test isteği tek sabite), K-428, K-430, K-431, K-432 (backend),
K-434 (onboarding adımı; akış testi yürüyüşü değişir → K1 notu). Aktarım `docs/aktarim/M4/ADR-037-isleri.md` (README 23).

## ▶ DEVAM NOKTASI (3 Eki — M5 Part 1 BİTTİ; sorular 55-72 → ADR-041)
Sıradaki koşu **M5 Part 2** (`plan/oturum-promptlari/M5-part2.md`): önce ADR-041 işleri (K-430 #273, K-523, K-525, K-526, K-527; K-524
literatür), sonra K-503, K-505, K-506, K-504, K-508 — **yalnız sahte sağlayıcı**. Aktarım bekliyor: M4 Part 2-4 + M5 Part 1
(`docs/aktarim/M5/README.md` 1-9). Açık soru: 57.

## M3 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M3.md`. Part prompt'ları `M3-part1.md`, `M3-part2.md`, `M3-part3.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Temel | 0a disk, 0b sorular → ADR-028 · K-301, K-302, K-303, K-307 · Dependabot #2 | ✅ bitti (30 Eyl) |
| 2 · Veri ve kimlik | K-311, K-304, K-305, K-310 (+ ADR-029) | ✅ bitti (30 Eyl) |
| 3 · Akış ve teslim | K-306, K-312, K-309, K-403, K-308, K-227, K-228, K-229 · M3 çıkış kontrolü · M4 part prompt'ları | ✅ bitti (1 Eki) — K-308 cihaz adımı M4 Part 1'e |

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-301 tasarım sistemi (RUBİN tema, ters yüzey, Barlow Condensed, 7 bileşen) | ✅ birleşti; inceleme: blokta soluk metin 3,67:1 ve kaybolan seçili çip düzeltildi, tarayıcılar kendini kanıtlıyor; mutasyon 10/10 | #192 | `M3/K-301.md` |
| K-302 yasaklı ifade taraması (U4/U6) + ham metin bekçisi (AST) | ✅ birleşti; inceleme: "Body fat: 18%" ve `{value}%` kaçıyordu, "Be patient" yanlış pozitif, `options={{ title }}` kaçıyordu → düzeltildi; mutasyon 6/6 | #193 | `M3/K-302.md` |
| K-303 tipli API istemcisi (openapi-fetch + Bearer ara katmanı) | ✅ birleşti; inceleme ≥80 bulgu yok; saf URL ayrıştırma + `redirect: 'error'`; mutasyon 9/9 | #194 | `M3/K-303.md` |
| K-311 tek uçuşlu oturum yenileme (ADR-025) | ✅ birleşti; inceleme: yenileme uçarken çıkış oturumu geri yazıyordu → bellek + nesil sayacı; Keychain yazma hatası r1'i tekrar yollatıyordu → bellek önce; mutasyon 21/21 | #197 | `M3/K-311.md` |
| K-304 SQLite kuyruğu (clientId idempotency, ADR-024) | ✅ birleşti; inceleme: `catch {}` her hatayı çevrimdışı sayıyordu → `NoAnswer`; boşaltma sonu mikro-görev boşluğu; Android çevrimdışı açılış; mutasyon 31/31 + 44/44 | #198 | `M3/K-304.md` |
| K-305 Apple ile giriş (nonce, Keychain, `Stack.Protected`, servislerin tek kökü) | ✅ birleşti; inceleme: reddedilen yenilemede A'nın kayıtları B'nin hesabına gidiyordu → oturum sonu kayıtları siler; ErrorBoundary; splash; çift dokunma; mutasyon 33/34 (1 eşdeğer) | #199 | `M3/K-305.md` |
| K-310 birimler (ADR-029; tek yuvarlama, tercih profil + kv önbellek) | ✅ birleşti; inceleme: yavaş refresh seçimi eziyordu → nesil sayacı; ondalık virgül; girişte hesabın birimi okunmasa testler kör → düzeltildi; parametre sözleşmeye bağlı; mutasyon 28/28 | #200 | `M3/K-310.md` |
| K-306 onboarding: yönlendirme + profil (profil durumu, 7 adım, tek PUT) | ✅ birleşti; simülatör: birim çipi çevrimdışı hiçbir şey yapmıyordu → `keepOnPhone`; inceleme 3+9 bulgu (metinde parametre, sunucu hatası ≠ bağlantı, çıkış yolu, tek uçuş okuma, saklı done + 404); mutasyon 20/20 | #202 | `M3/K-306.md` |
| K-312 onboarding: sağlık rızası, kilo/bel, gıda, Apple Health | ✅ birleşti; inceleme 7+9 bulgu (Allow/Not now yarışı, geri çekme, profil önce, sınırlar, Health yalnız rızayla, önce sayfa); mutasyon 21/21 | #203 | `M3/K-312.md` |
| K-309 Ayarlar (birim, rızalar, dışa aktarma, hesap silme, çıkış; + expo-file-system) | ✅ birleşti; simülatör: onay en dipte, geri düğmesi yok → düzeltildi; inceleme 1+13 bulgu (yeniden okuma hatasında eski durum, pendingCount hatası, 202 sonrası anahtarlık); mutasyon 17/17 | #204 | `M3/K-309.md` |
| K-403 HealthKit kütüphanesi (ADR-031, @kingstinct 16) | ✅ birleşti; inceleme: Expo Go'da Metro yükleme hatasını ölümcül gösteriyordu → `isRunningInExpoGo` kapısı; mutasyon 7/7 | #205 | `M3/K-403.md` |
| K-308 EAS (eas.json, dev client, paket kimliği yapılandırmada, runbook `docs/eas-derleme.md`) | yapılandırma ✅ birleşti; **cihaz/TestFlight adımları M4 Part 1 başında Levent'le** (ADR-030) | #206 | — |
| K-228 hard stop genel türle (CHANGE_PHASE→BULK + `safety`, V17) | ✅ birleşti; inceleme: V17 tırnak → göç kuralı kırmızı olurdu, düzeltildi; mutasyon 6/6; artık risk → ADR-030 #30 kabul | #207 | `M3/K-228.md` |
| K-229 hard stop sonrası döngü sorusu (motor `SafetyHold`, hold geçmişten) | ✅ birleşti; inceleme: hold her hafta bütün anlık görüntüleri okuyordu → `CallStore.outcomes`; döngü sorusu yalnız cevapsız kuru çalıştırmaya bakıyordu → `cycleAwaited`; CI: APPLIED fikstürü plan eksik → düzeltildi; mutasyon 11/11 + 5/5 | #209 | `M3/K-229.md` |
| K-227 mini cut plana (iştah sorusu, hedef, V18 `mini_cut_until`, bitiş, sürerken sabit) | ✅ birleşti; inceleme: faz kapısı mini cut'ı 3. haftada bitiriyordu → kapı mini cut'ta susar; sözleşme açıklamaları; enerji yoksa bakım; ADR-030 #31 onay, #32 `mini_cut_running`; mutasyon 17/17 motor + 8/9 karar (1 eşdeğer) | #211 | `M3/K-227.md` |
| chore: `backend/bin` (IDE çıktısı) izlenmez | ✅ birleşti (K-229 incelemesinde yakalandı) | #208 | — |
| K-307 gezinme (NativeTabs, koç girişi, koç sayfası) | ✅ birleşti; simülatör: koç çubuğu sekme çubuğu altındaydı → alt güvenli alan; inceleme: `keel://coach` soğuk açılış sekmesiz kalıyordu → `anchor`; mutasyon 10/10 | #195 | `M3/K-307.md` |

**Part 3 ÇIKIŞ = M3 ÇIKIŞ (1 Eki):**
- **Birleşen (Part 3):** K-306 #202 · K-312 #203 · K-309 #204 · K-403 #205 · K-308 yapılandırma #206 · K-228 #207 ·
  chore bin #208 · K-229 #209 · K-227 #211. Açık PR yok, açık worktree yok, `main` temiz. ADR-030 (sorular 25-32 + K-308).
  Backlog: K-306, K-312, K-309, K-403, K-228 `done`; K-229, K-227 `done` (bu blokla); K-308 `doing` (cihaz adımı).
- **M3 çıkış kriterleri (`plan/yol-haritasi.md › M3`), kanıtla:**
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | RUBİN token'ları (açık + koyu) + temel bileşenler | ✅ | K-301 #192, `src/theme`, `img/K-301-*` |
  | Metin sistemi | ✅ | K-302 #193, `copy-literals.test.ts`, yasaklı ifade taraması |
  | Üretilen API istemcisi | ✅ | K-303 #194, `src/api/schema.ts` (`contracts` `npm run check` CI'da) |
  | Yerel depo + senkron | ✅ | K-304 #198, K-311 #197 |
  | Giriş | ✅ | K-305 #199 (Sign in with Apple) |
  | Onboarding (Health okuma izni dahil) | ✅ | K-306 #202, K-312 #203, K-403 #205 |
  | ↳ Health **yazma** izni | ↪ M4 | ADR-031: okuma ayrı, yazma K-412 (M4 Part 4) ayrı düğmeyle |
  | ↳ **İçe aktarma** | ↪ M6 | K-609 (Apple Health kilo geçmişi, Strong/Hevy CSV) — yol haritasındaki M3 ifadesi backlog'la çelişiyor; backlog doğru kabul edildi |
  | Sistem sekme çubuğu | ✅ | K-307 #195 (NativeTabs) |
  | **Cihazda development build + dahili TestFlight** | ❌ açık | yapılandırma #206 hazır; hesap adımları Levent'te → M4 Part 1'in 0b adımı (ADR-030) |
  | Ayarlar | ✅ | K-309 #204 |
  | kg/lb | ✅ | K-310 #200 |
  Kontrol çıktısı (1 Eki, `main`): mobil `npm run check` → 38 suite, **665/665**; backend saf testler (motor + karar + mimari)
  yeşil, DB testleri CI'da yeşil (#209, #211).
- **Kalan iş:** K-308 cihaz adımları (M4 Part 1). Ekran kriterleri M4/M5 kartlarına taşındı (K-401, K-405, K-409, K-501;
  `plan/oturum-promptlari/M4.md › devralınan`). K-313 çizim bekliyor (ADR-030 #28).
- **M4'ün bilmesi gerekenler:** mini cut planı `decision.plan.mini_cut_until` (V18) — sözleşmede yok; hedefler ekranı
  göstermek isterse sözleşmeye eklenir. Soru türü APPETITE ve CYCLE_STOPPED sunucudan gelir. `safety: true` karar =
  genel etiket. Yığılmış dal akışı: alttaki birleşince `git rebase --onto origin/main <eski-taban>`. Mutasyon betiği
  yalnız saf test sınıfıyla (DB testi filtreye girerse Docker'sız her mutant "öldü" görünür — bu koşuda bir kez yanıldı).
- **Yeni sorular:** yok (25-32 cevaplandı → ADR-030). Açık: referans çizimlerin çizeri/bütçesi (K-313).


**Part 3 ara not (30 Eyl gece):** K-313 (referans görünüş adımı) M4'e ayrıldı — 7 seviye motorun iç yağ tahminini
besliyor, kaynak yalnız tek eşiği betimliyor → **soru 28** (aşağıda). AI rızası K-511 ile. Beklenti ekranı U8'e göre
(prototipin "4 hafta trend göstermem"i anayasayla çelişiyordu). Sıradaki: K-229 PR → K-227 (V18: `mini_cut_until`; iştah sorusu bütçede; mini cut açığı TÜRETİLMİŞ = K-107 ilk adım → soru 31) → bitiş (M3 çıkış kontrolü, sorular 25-31 + K-308 onayı, M4 prompt'ları).

**Part 3 başı (30 Eyl):** senkron tamam (Part 1/2 ÇIKIŞ git ile tutarlı: #192-#200 birleşik, açık PR/worktree yok).
**Disk:** 4,3 GB → Levent "önbellekler + bulut derleme" → ShipIt/dotslash/JetBrains/npm önbelleği → **5,5 GB**; K-308 EAS
bulutunda derlenir (yerel native derleme yok). **Erken cevaplar (ADR-030'a işlenecek):** Apple Developer üyeliği **var** →
K-308 cihaz + TestFlight bu part'ta (Apple girişi/onayı Levent) · soru 25 → (c) sağlık kaydı girişi rıza ister, yarışta 403
gelirse REJECTED + ekran uyarısı · soru 27 → K-231 ile (M4; K-231 kartına kriter) · soru 26 bitişte.

**Part 3 plan (30 Eyl):** K-306 (L) bölündü → **K-306** yönlendirme + profil (M) · **K-312** rızalar, başlangıç ölçümleri,
Health (M). **K-403** HealthKit spike M4'ten M3'e (K-308 "HealthKit diyaloğu cihazda" ister). Geçmiş içe aktarma zaten
K-609 (M6). Sıra: K-306 → K-312 → K-309 → K-403 → K-308 → K-228 → K-229 → K-227.

**Part 2 başı (30 Eyl):** senkron tamam (Part 1 ÇIKIŞ git ile tutarlı: #192-#195 birleşik, ADR-028 var, açık PR/worktree
yok). **Disk:** 3,7 GB → Levent "simülatör önbelleğini sil" dedi → `CoreSimulator/Caches` + `~/.npm` → **7,0 GB**.
K-304 (L) bölündü: **K-311** tek uçuşlu yenileme (#196) + K-304 kuyruk (M). Sıra: K-311 → K-304 → K-305 → K-310.
SQLite testleri gerçek SQL ile `node:sqlite` üstünde (Node ≥22.13, bağımlılıksız; CI Node 22).

**Part 1 başı (30 Eyl):** senkron tamam (K-222 #186 birleşik, açık PR/worktree yok). **Disk:** 2,0 GB boştu → Levent
"önbellekleri temizle" dedi → npm, Homebrew, pip, node-gyp, dotslash önbellekleri silindi → **4,8 GB**. Docker açılmıyor
(DB testleri yalnız CI'da). Xcode 16.1 = RN 0.86'nın en düşüğü (`min_xcode_version_supported`); simülatörde Expo Go 57.0.2
kurulu (iPhone 16 Pro Max, iOS 18.1) → Part 1 native derleme istemez. **⚠ K-308 (Part 3) native derleme ~3-5 GB ister:**
Docker 15 GB (`docker system prune`) ya da başka yer gerekecek → Levent'e sorulacak.
**0b cevapları → ADR-028:** 21 (a) sil+uyarı → K-231 (M4) · 22 (c) LEA temkinli uç → K-230 (M4) · 23 (b) yeniden sor →
K-229 (Part 3) · 24 (b) genel tür → K-228 (Part 3) · Apple kimlikleri: sonra · görseller: çizim, M3'te yer tutucu.

**Part 2 ÇIKIŞ (30 Eyl):**
- **Birleşen:** K-311 #197 · K-304 #198 · K-305 #199 · K-310 #200 (hepsi auto-merge, üç CI yeşil). `main`'e doğrudan:
  K-304 bölünmesi + K-311 kartı (#196), ADR-029, DURUM. Açık PR yok, açık worktree yok, dallar silindi.
- **Çıkış kriteri kanıtı:** çevrimdışı kayıt kuyruğa girer ve bağlantı gelince **bir kez** gider, tekrar gönderim saklı
  kaydı alır (`sync-queue.test.ts`, gerçek SQL: `node:sqlite`); aynı anda 401 alan istekler **tek** refresh yapar
  (`session-refresh.test.ts`); Apple ile giriş akışı birim testlerde uçtan uca (nonce → Apple → `/v1/auth/apple` →
  Keychain → koruma), simülatörde uygulama açılıyor, servisler kuruluyor, oturum yok → giriş ekranı
  (`docs/aktarim/M3/img/K-305-*.png`); birimler ayarlanabilir: `units.set()` profili günceller, `useUnits()` ekranı
  yeniden çizer (seçim arayüzü K-306/K-309'da). `npm run check` **462/462**.
- **Apple ile giriş — eksik olan (Levent):** Apple düğmesi bu simülatörde/Expo Go'da `isAvailableAsync() = false` →
  "kullanılamaz" yolu görünüyor. Uçtan uca giriş için: (1) Bundle ID → mobilde `ios.bundleIdentifier` (K-308, EAS/
  app.config), backend'de `KEEL_APPLE_CLIENT_ID` (aynı değer; `AppleProperties`); (2) development build (K-308) ve
  Apple Developer'da Sign in with Apple yeteneği açık App ID; (3) çalışan backend (Docker açılmıyor). Team ID/Key ID/.p8
  yalnız sunucu tarafı token iptali için (K-214), girişe gerekmez. `app.json`: `ios.usesAppleSignIn: true` eklendi.
- **Kalan iş:** yok (Part 2 kapsamı tamam). Aktarım yapılmadı (toplu mod): `docs/aktarim/M3/README.md` sırası 5-8.
- **Part 3'ün bilmesi gerekenler:**
  - **Servisler tek kökten:** `src/services/appServices.ts` (`createAppServices`: session → istemci (K-311 yenileme) →
    kayıt deposu + kuyruk (K-304) → `units`); ekranlar `useAppServices()`, `useSignedIn()`, `useUnits()`
    (`src/services/ServicesProvider.tsx`). Servisler süreç başına **bir kez** kurulur; ekrandan yeni istemci/oturum kurma.
  - **Kayıt yazmak:** `services.queue.record({ kind, body })`, `clientId` = `newClientId()` (`src/sync/send.ts`);
    kayıt SQLite'a yazılır, ağ beklenmez. Reddedilenler `queue.rejected()` (gövdesiz), bekleyenler `pendingCount()`.
  - **Çıkış:** `services.signOut()` oturumu + yerel kayıtları + birim tercihini siler, sonra sunucuya haber. **K-309:**
    çıkıştan önce `pendingCount() > 0` ise uyar (gönderilmemiş kayıt gider). Reddedilen yenileme de aynı temizliği yapar.
  - **Kök düzen:** `Stack.Protected` — oturum yoksa yalnız `sign-in`. **K-306:** `signInWithApple()` sonucu
    `newAccount: true` → onboarding'e yönlendirme henüz yok (giriş ekranı sonucu atıyor); onboarding rotası da korumalı
    grupta olmalı ve profil yokken sekmeler yerine onu göstermeli.
  - **Birimler:** `src/units/units.ts` — `parseWeightKg/parseLoadKg/parseWaistCm` (sunucu hassasiyetine bir kez yuvarlar,
    virgül kabul), `format*`, `heightCmFromImperial`. **K-306:** boy girişinde en az 3 ft 4 in (100 cm; 3 ft 3 in = 99 cm
    reddedilir), profil yokken seçilen birim `units.current()`'tan profil PUT'una girer. **K-309:** birim seçimi
    `units.set()` (çevrimdışında hata verir, yarım uygulanmaz).
  - **Metin/parametre:** yeni metin `data/copy/en.json`; telefonun okuduğu parametre `data/parameters/*.json` (ADR-029,
    köken testi `parameters.test.ts`).
  - **Test kalıpları:** kök düzeni çizen testler `@/services/ServicesProvider`'ı taklit eder (`navigation.test.tsx`);
    gerçek sağlayıcı testi `services-provider.test.tsx` (expo-sqlite → node:sqlite, SecureStore → Map). Mobil mutasyon
    betiği önce temel koşuyu doğrular (kırmızıysa durur) — kopya dizinde `data/`, `contracts/`, `arastirma/` göreli yolda
    olmalı.
  - **Disk:** 3,3 GB (simülatör cihaz verisi `CoreSimulator/Devices` 3,7 GB, açılışta yeniden oluştu). K-308 native
    derleme ~3-5 GB → Docker (15 GB) budama ya da başka yer: Part 3 başında Levent'e.
- **Yeni sorular:** 25 (CONSENT_REQUIRED kayıtları), 26 (K1 onayı), 27 (profil PUT'u ile rızası geri çekilmiş
  kullanıcının gıda listesi) — aşağıda.

**Part 1 ÇIKIŞ (30 Eyl):**
- **Birleşen:** K-301 #192 · K-302 #193 · K-303 #194 · K-307 #195 (hepsi auto-merge, iki CI yeşil). ADR-028 + K-228…K-231
  (`main`, issue'lar açık). Açık PR yok, açık worktree yok (`keel-k302`, `keel-k303` silindi).
- **Çıkış kriteri kanıtı:** uygulama simülatörde açılıyor (Expo Go 57.0.2, iPhone 16 Pro Max, iOS 18.1) — 4 native sekme,
  RUBİN açık/koyu, metinler en.json'dan, koç sayfası; `docs/aktarim/M3/img/K-301-*.png`, `K-307-*.png`. Tipli istemci
  `apps/mobile/src/api/client.ts`. `npm run check` 287/287.
- **Dependabot #2 (decode-uri-component ≤0.4.2) — kapatılamadı, gerekçe:** tek yamalı sürüm 0.5.0 yalnız ESM;
  `query-string@7` onu `require` ile yüklüyor (CJS) → override derin bağlantı ayrıştırmasını (`getStateFromPath`) kırar.
  En yeni expo-router 57.0.24 de `query-string ^7.1.3` istiyor (30 Eyl kontrol). Etki: bozuk bir derin bağlantı kullanıcının
  kendi uygulamasını dondurabilir (DoS, yerel). Uyarı açık bırakıldı; her Expo yükseltmesinde `npm ls decode-uri-component`.
- **Kalan iş:** yok (Part 1 kapsamı tamam). Aktarım yapılmadı (toplu mod): `docs/aktarim/M3/README.md` sırası.
- **Part 2'nin bilmesi gerekenler:**
  - Tema: bileşen rengi `useTheme()`'den (`src/theme/theme.tsx`); blok içi `InverseSurface`. Renk/font/büyük harf
    kuralları `src/__tests__/support/sourceScan.ts` + `scanners.test.ts`.
  - Metin: yeni metin `data/copy/en.json`; `forbidden-phrases.json` (U4/U6) ve AST ham metin bekçisi
    (`copy-literals.test.ts`) her metni tarar — bileşene düz metin yazılamaz, text prop'u (`label`, `title`…) dahil.
  - İstemci: `createApiClient({ baseUrl: apiBaseUrl(), accessToken })` (`src/api/`). **K-304:** 401 → tek uçuşlu yenileme
    + yeniden deneme `fetch`'i saran katmanda, ilk gönderimden önce `request.clone()` (onResponse'ta değil; Jest'te Node
    fetch gövdeyi tüketir) — `docs/aktarim/M3/K-303.md`. **K-305:** oturum deposu `AccessTokenSource`'u sağlar.
  - Gezinme: kök Stack (`anchor: '(tabs)'`) + `(tabs)` NativeTabs + `coach` modal. Yeni ekran/akış (onboarding K-306)
    kök Stack'e eklenir; sekme ekranları `Placeholder` gibi alt güvenli alanı almalı (native çubuk içeriğin üstünde).
  - Test: RNTL 14 (`await render`), `expo-router/testing-library` `renderRouter` sahte zamanlayıcı → `act` + `runAllTimers`;
    `testRouter.back()` yerine `router.back()` aynı `act` içinde.
  - **Worktree dersi:** worktree'de `node_modules` sembolik bağ ise orada `npm install` ÇALIŞTIRMA — paylaşılan klasörü o
    dalın package.json'ına göre budar (K-301 paketleri silindi, geri yüklendi). Bağımlılık ekleyen iş ana checkout'ta.
  - Disk ~3,9 GB. **K-308 (Part 3) native derleme ~3-5 GB** ister → Docker imajları (15 GB) budanmalı; Levent'e sorulacak.
  - Expo Go "önerilen sürüm 57.0.9" indirmesini CI modunda kendiliğinden onaylıyor → `expo start --ios` KULLANMA;
    `expo start` + `xcrun simctl openurl booted exp://127.0.0.1:8081` (kurulu 57.0.2 yeterli).
- **Yeni sorular:** yok. Açık: Apple kimlikleri (K-305 öncesi), çizim bütçesi (M4 öncesi), K-308 için disk.

**Part 0 (hazırlık) ÇIKIŞ — 30 Eyl:** M2 bitti (K-222 #186 son), açık PR/worktree yok, `main` temiz. Açık sorular 21-24 +
Apple kimlikleri + referans görsel lisansı Part 1'in 0b adımında toplu sorulacak. K-227 issue #187 (backend, Part 3).

## M4 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M4.md`. Part prompt'ları `M4-part1.md` … `M4-part4.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Bugün ve ölçüm | K-308 kalanı (cihaz), K-231, K-230, K-420, K-401, K-409, K-402, K-404 | ✅ bitti (1 Eki) — K-308 cihaz adımı Levent'te |
| 2 · Antrenman | K-414, K-405, K-406, K-417, K-415 (+ K-421, K-422 bölündü) | ✅ bitti (2 Eki) — aktarım bekliyor |
| 3 · Öğün ve hareket | K-407, K-413, K-424, K-416, K-418 (+ K-419 Levent) | ✅ bitti (2 Eki) — aktarım bekliyor; klipler Levent'te |
| 4 · Native ve teslim | K-410, K-411, K-412 (+ K-423) · M4 çıkışı · M5 prompt'ları | ✅ bitti (2 Eki) — aktarım bekliyor; K-426 Live Activity cihazla |

**Part 1 başı (1 Eki):** senkron tamam (M3 ÇIKIŞ git ile tutarlı: #211 birleşik, açık PR/worktree yok, `main` temiz).
Disk 7,9 GB. Docker hâlâ açılmıyor → DB testleri CI'da. K-308 komutları Levent'e verildi (EAS'te `leventcan` hesabıyla
giriş var; `eas init` ve Apple adımları Levent'in terminalinde) — cevap bekleniyor.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-231 rıza geri çekilince silme (backend: aynı transaction, onaylı API, ikinci geçiş, profil PUT #27) | ✅ birleşti; inceleme 4 bulgu (2 test onaysız geri çekiyordu, sayım, **zamanlanmış ikinci geçiş transaction'sız — K-214'ten beri hesap silmede de**, mobil uyum); CI'da RED önce | #212 | `M4/K-231.md` |
| K-231 mobil (uyarı + önce dışa aktar + telefondaki sağlık kayıtlarını unutma) | ✅ birleşti; mutasyon 9/9; simülatörde görülemedi (sunucu yok) | #214 | `M4/K-231.md` |
| K-230 LEA ağı RFM'in temkinli ucu (`rfm_energy_margin_pct` 5/6, `Snapshot.fatProxyEnergyPct`) | ✅ birleşti; inceleme ≥80 bulgu yok; mutasyon 10/10 | #213 | `M4/K-230.md` |
| **K-420** (K-401'den bölündü) `GET /v1/consistency` — bu hafta + dört bileşen + sayaç | ✅ birleşti; inceleme: `min()`+`single()` kararsız planda 500 → düzeltildi; mutasyon 7/7 | #216 | `M4/K-420.md` |
| K-401 Bugün ekranı (tutarlılık, karar kartı + "Why this call", liste, çipler) | ✅ birleşti; simülatör: tekrar eden başlık bulundu; inceleme: yalnız açılışta okuyordu → odak + öne gelme; mutasyon 13/13 + 2/2 | #217 | `M4/K-401.md` |
| K-409 kalan bütçe + Hedefler (Yemek sekmesi + Bugün satırı) | ✅ birleşti; inceleme: hiç yemek yokken "2300–2300" → tek sayı; mutasyon 10/10 + 1/1 | #218 | `M4/K-409.md` |
| K-402 tartı girişi + Health'ten kilo (girişte rıza, çevrimdışı rıza bilgisi, U8 grafiği) | ✅ birleşti; inceleme 3 bulgu (rıza önbelleği her yolda, giriş çevrimdışı açılır, Bugün kuyruğu bekler); mutasyon 16/16 + 5/5 | #219 | `M4/K-402.md` |
| K-404 adım/uyku/aktif enerji (iki rıza, değişen gün) | ✅ birleşti; inceleme: pencerenin en eski günü uykusuz gidip sunucudaki uykuyu siliyordu → düzeltildi; mutasyon 12/12 + 2/2 | #220 | `M4/K-404.md` |

**Part 1 ÇIKIŞ (1 Eki):**
- **Birleşen:** K-231 #212 (backend) + #214 (mobil) · K-230 #213 · K-420 #216 (K-401'den bölündü: `GET /v1/consistency`) ·
  K-401 #217 · K-409 #218 · K-402 #219 · K-404 #220. Açık PR yok, açık worktree yok, `main` temiz. Aktarım dosyaları
  `docs/aktarim/M4/` (README sırası 1-7), simülatör görüntüleri `docs/aktarim/M4/img/`.
- **Çıkış kriterleri (`M4.md › Part'lar`), kanıtla:**
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | Cihazda development build + TestFlight (M3'ten açık) | ❌ açık | komutlar Levent'e verildi (bu oturumun başı); Levent'in terminalinde, cevap yok |
  | Bugün ekranı gerçek veriyle | ✅ (fikstür sunucusuyla simülatörde) | K-401 #217, K-420 #216, `img/K-401-today.png`, `K-401-safety-why.png` |
  | Tartı + adım/uyku Health'ten | ✅ kod + test; ❌ gerçek HealthKit okuması görülmedi (Expo Go'da yok) | K-402 #219, K-404 #220; cihazda K-308 sonrası |
  | Geri çekilen rıza veriyi siler | ✅ | K-231 #212/#214 (CI'da DB testleri, `ConsentWithdrawalDeletionTests`) |
  Kontrol çıktısı (`main`): mobil `npm run check` → 46 suite, **753/753**; backend saf testler (motor + karar +
  mimari + sözleşme + göç) **757/757**; DB testleri CI'da yeşil (#220'ye kadar her PR).
- **Kalan iş:** K-308 cihaz adımları (Levent). K-313 çizim bekliyor (ADR-030 #28). Dış antrenmanlar (soru 37).
- **Part 2'nin bilmesi gerekenler:**
  - **Okuma kalıbı:** sekmeler bağlı kalır → ekran verisi `useReadOnFocus(read)` ile (odak + öne gelme; `read` yalnız `api`'ye
    bağlı olmalı, değişen servis fonksiyonları ref'ten okunur — `useToday`). Parça başına `Loaded<T>` (`src/today/today.ts`:
    ready / none 404 / consent 403 / failed). Seans ekranı (K-405) aynı kalıpla.
  - **Rıza:** sağlık kaydı girişi önce `services.consents.granted('HEALTH_DATA')` (çevrimdışında telefondaki bilgi; bilinmeyen =
    verilmedi); izin verme/geri çekme her yolda `consents.remember`. Antrenman/set rızaya bağlı değil. K-407 (öğün) girişte
    rıza ister (ADR-030 #25) — K-402'deki adımı örnek al (`src/app/weigh-in.tsx`).
  - **Bugün okuması:** önce Health eşitlemesi, sonra `queue.drain()`, sonra sunucu → yeni kayıt "yapıldı" görünür.
  - **Test kalıpları:** servis taklitleri **sabit nesne** olmalı (her çağrıda yeni nesne → sonsuz okuma/OOM); ekran
    `useFocusEffect` kullanıyorsa test `expo-router`'ı taklit eder ya da `renderRouter` içinde çizer; tarih için yalnız
    `Date` taklit edilir (`doNotFake` listesi, `today-screen.test.tsx`); `expo-crypto` jest'te boş → Node `randomUUID`.
  - **Tipli rotalar:** yeni ekran dosyası eklenince `.expo/types/router.d.ts` yerelde eskir → kısa bir `expo start` yeniler
    (gitignore'da; CI etkilenmez).
  - **Simülatör:** giriş Expo Go'da yok → kök korumada **geçici, commit'lenmeyen** yama + `scratchpad`'te fikstür sunucusu
    (`EXPO_PUBLIC_API_URL=http://127.0.0.1:8099`), sonra yedekten geri yükle; dokunuş `mcp__Claude_Code_iOS_Simulator__control`.
  - **Mobil biçim:** prettier ayarı yok; `--single-quote --print-width 150 --bracket-same-line` çevredeki kodla aynı.
  - **Backend:** `privacy.consent_withdrawal` (V19) ikinci geçiş; zamanlanmış süpürmeler `scheduled()` üstünde `@Transactional`.
- **Yeni sorular:** 33-37 (DURUM listesi) + 35'e eklenen K1 notları.

**Part 2 başı (1 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#212-#220 birleşik, açık PR/worktree yok,
`main` temiz, `M4-part1-devam.md` yok). Sorular 33-37 cevapsız (ADR yok). K-308 yapılmadı (`app.json`'da `projectId` yok) →
komutlar Part 2 sonunda yeniden verilir. Disk 3,9 GB → npm/pip/uv önbelleği + Levent'in onayıyla iPhone SE simülatörü
silindi → 4,5 GB (eşik 5 GB; Part 2'de native derleme yok, Levent "devam" dedi). Dependabot: yalnız bilinen #2.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-414 (1/2) salon profili API + katalogda `equipment` (ADR-032) | ✅ birleşti; inceleme: iki hesabın aynı id yarışı sahiplik kontrolünü atlıyordu → upsert'te koşul + atılan hata (rollback); sözleşme `barKg > 0`, 400/409 yazıldı; eşzamanlılık testleri; mutasyon 2/2 | #221 | `M4/K-414.md` |
| K-414 (2/2) yuvarlama (`LoadSteps`, ortak vakalar `contracts/fixtures/load-steps.json`) + plaka hesabı | ✅ birleşti; inceleme 2 tur + test analizi: lb'de ceza/pencere yetmedi → lb salonu lb'de sayılır; deload tutarken fazla tekrar da tutulur; CI'da tam hata çıktısı (build.gradle.kts); mutasyon 29/29 | #222 | `M4/K-414.md` |
| K-405 (1/3) veri katmanı: kuyrukta `finish`, program/katalog çevrimdışı kopyası, saf seans mantığı | ✅ birleşti; mutasyon 18/18 | #223 | `M4/K-405.md` |
| K-405 (2-3/3) Antrenman sekmesi + seans ekranı (simülatörde uçtan uca, çevrimdışı) | ✅ birleşti; inceleme + test analizi + simülatör 13 bulgu; mutasyon 13/14 | #224 | `M4/K-405.md` |
| K-406 özet (efor bazlı) + motor e1RM tek yuvarlama | ✅ #226 + #225 (motor tek yuvarlama) birleşti; inceleme: ağırlıklı vücut ağırlığında e1RM, telefon/motor 0,1 kg (motorda çift yuvarlama → #225), günü kalkan antrenmanın hedefi; mutasyon 13/13 + 2/2 + 4/4 | #226, #225 | `M4/K-406.md` |
| (yol üstü, K-414) lb hedefi ızgaraya yapıştırılıyordu (#225'in CI'ını kıran özellik testi karşı örneği: 48,77 lb → orta nokta → 47,5) | ✅ birleşti; ortak vaka + Java RED/GREEN, TS eşi K-417'de | #227 | `M4/K-417.md` § motor kusuru |
| K-417 ısınma hesaplayıcı (telefonda salon, seansta ısınma + taraf başına plaka) | ✅ birleşti; simülatör 3 kusur (kg salonda lb plaka, "+0 lb", ısınmanın antrenmanı başlatması → seans sayılır) + inceleme + test analizi düzeltildi; mutasyon 6/6 + 16/16 + 9/9 (1 eşdeğer) | #228 | `M4/K-417.md` |
| **K-422** (K-415'ten bölündü) set ve seans notu: sözleşme + V21 + sınır yapılandırmadan | ✅ birleşti; inceleme: ikinci bitiş notu siliyordu (coalesce), NUL 500 → 400; saf mutasyon 5/5; DB testleri CI'da yeşil | #231 | (K-415 aktarımında) |
| K-415 (1/2) hareket geçmişi + rekorlar (ADR-033) | ✅ birleşti; simülatör: 62,5/62,51 kg iki satır → görünen ağırlıkla kıyas; inceleme: pencere dışı yerel kayıt, K-33 gerilimi (soru 44); mutasyon 16/16 + 3/3 + 3/3 | #232 | `M4/K-415.md` |
| K-415 (2/2) set + seans notu girişi, geçmişte notlar | ✅ birleşti; inceleme: gönderilmemiş bitiş notu sunucu kopyası yüzünden atılıyordu → düzeltildi; mutasyon 8/8 + 1/1 + 2/2 | #233 | `M4/K-415.md` |
| K-421 (K-414'ten bölündü) salon profili ekranı | ✅ #234 birleşti; inceleme düzeltmeleri #234'ün auto-merge'ünden sonra geldi → #235 birleşti; simülatör: lb kullanıcı kg salonu kaydedince bar 19,96 kg olurdu → salon kendi biriminde, kayıpsız gidiş-dönüş testi; mutasyon 14/14 + 5/5 | #234, #235 | `M4/K-421.md` |

**Part 2 ÇIKIŞ (2 Eki):**
- **Birleşen:** K-414 #221 + #222 (+ #227 lb hedefi ızgaraya yapıştırılmıyor) · K-405 #223 + #224 · K-406 #226 + #225 (motor
  e1RM tek yuvarlama) · K-417 #228 · K-422 #231 (K-415'ten bölündü: not sözleşme + V21) · K-415 #232 (geçmiş + rekorlar) +
  #233 (not girişi) · K-421 #234 (K-414'ten bölündü: salon ekranı) + #235 (inceleme düzeltmeleri). Açık PR yok, açık worktree yok.
  Aktarım dosyaları `docs/aktarim/M4/` (README 8-13), görseller `img/`.
- **Çıkış kriterleri (`M4.md › Part'lar`):**
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | Seans baştan sona çevrimdışı kaydedilir | ✅ | K-405 #224 (kayıt kuyruğu, `finish` kaydı), simülatör uçtan uca (`img/K-405-*`), ısınma bekletme #228 |
  | Özet efor bazlı | ✅ | K-406 #226 (`img/K-406-summary.png`), telefon = motor Epley (#225) |
  | PR listesi | ✅ (soru 44 açık) | K-415 #232 (`img/K-415-history.png`) |
  Kontrol çıktısı (`main`, 2 Eki): mobil `npm run check` **990/990** (61 suite); backend saf testler **937/937**,
  DB testleri CI'da yeşil (#234'e kadar her PR).
- **Kalan iş:** K-308 cihaz adımları (Levent). Sorular 38-44 (Levent).
- **Part 3'ün bilmesi gerekenler:**
  - **Yuvarlama iki dilde:** `backend/.../training/LoadSteps.java` ↔ `apps/mobile/src/train/loadSteps.ts`, ortak vakalar
    `contracts/fixtures/load-steps.json` (yeni vaka → iki dilde RED). lb salonu lb'de sayılır; motorun **hedefi** ızgaraya
    yapıştırılmaz (#227). `unitsOf`/`plateUnits`: bir ağırlık listesinin girildiği birim.
  - **Fiziksel nesne kendi biriminde:** plaka/bar/dambıl metni salonun biriminde (K-417 plaka satırı, K-421 düzenleyici);
    yük kullanıcının biriminde. Kayıpsız gidiş-dönüş testi (`gym-form.test.ts`) kalıbı.
  - **Seans kayıt modeli:** antrenman ilk **çalışma setinde** tutulur; ısınmalar o zamana kadar ekranda bekler (`held`,
    `workout.tsx`) — yalnız ısınmalı antrenman seans sayılmasın diye (sunucu her antrenmanı sayıyor, soru 39). Set/finish
    kayıtları `clientId` ile, store `INSERT OR IGNORE` (aynı kimlikle yeniden yazmak zararsız).
  - **Telefondaki kopyalar** (`train/trainData.ts`): program, katalog, kullanılan salon, son `history_days` günün antrenmanları;
    oturum kapanınca kuşak sayacıyla silinir. Geçmiş = sunucu listesi + gönderilmemiş yerel kayıtlar (pencereyle süzülür);
    gönderilmemiş bitiş notu sunucu kopyasından üstün.
  - **Notlar:** sunucu kuralı (`TrainingLimits.note/fits`: trim, boş = yok, 500 kod noktası, NUL → 400, sonraki notsuz bitiş
    notu korur) = telefon `noteOf`. Not loglanmaz (V3), AI'a rızasız gitmez (V2).
  - **Özet ekranı** bitişten `router.replace` ile açılır (geri tuşu seansa dönmez).
  - **Süreç dersi:** auto-merge'ü inceleme bulguları işlenmeden açma — #234 düzeltmelerden önce birleşti (#235 ayrı PR).
    PR'ı inceleme bitince aç ya da auto-merge'ü sonra aç.
  - **Test tuzakları:** `copy-literals.test` JSX içindeki koşullu dizgileri ve TS generic'lerini (`<T>`) metin sanar → koşullu
    parçaları sabite çıkar, generic'siz yaz. Parametre `source` bir başlığa çapa ister (`dosya#Başlık …`, tek kelime başlık
    eşleşmez). `jest.mock` fabrikası dış değişken kullanamaz (`jest.requireActual`).
  - **Simülatör:** derin bağlantı `exp://127.0.0.1:8081/--/<rota>?…` dişli simgesiyle uğraşmadan ekran açar; `CI=1` Metro
    dosya izlemez → değişiklikten sonra Metro'yu yeniden başlat. Fikstür sunucusu scratchpad'te (gyms PUT/DELETE, workouts GET).
- **Yeni sorular:** 38-44 (DURUM listesi).

**Part 3 başı (2 Eki):** senkron tamam — Part 2 ÇIKIŞ git ile tutarlı (#221-#235 birleşik, açık PR/worktree yok, `main`
temiz). Bağımlılıklar `done` (K-209, K-304, K-208, K-405, K-219). Disk 5,7 GB. Dependabot: yalnız bilinen #2. Simülatör:
iPhone 16 Pro Max, Expo Go + geçici kök yaması + `scratchpad/fixture.js` (öğün uç noktaları: meals GET/POST/DELETE, foods
search, barcode-lookup, food-estimates). Ders: `data/` JSON'u değişince Metro'yu `--clear` ile, Expo Go'yu `simctl terminate`
ile yeniden başlat (eski paket kalıyor). K-418 kartındaki "bağımlılık Levent onayıyla" notu ADR-019'dan eski — K5'e göre
agent karar verir, PR'da gerekçe.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-407 (1/4) Yemek sekmesinde günün öğünleri + "dünkü gibi" tek dokunuş (`repeatOf`, kuyruk, girişte rıza) | ✅ birleşti; simülatör: FDC adları virgüllü ("Oats, rolled") → her kalem ayrı satır; inceleme: ikinci dokunuş aynı öğünü iki kez kaydediyordu (ref + okuma başına gizleme), rızasızken sessizdi, okunamayan liste "boş" deniyordu; mutasyon 24/24 + 10/10 | #236 | `M4/K-407.md` |
| K-407 (2/4) öğün ekranı: arama, miktar (boş başlar), birim/tartıldı, aralık kartı + adlı tek soru, kayıt | ✅ birleşti; simülatör: Türkçe klavye "Chıcken" → arama alanı ham metin; inceleme: 50+ kalem kuyrukta kayboluyordu, arama cevapları sırasız, rıza okunamayınca bekliyordu; mutasyon 24/24 | #237 | `M4/K-407.md` |
| (yol üstü) `GymApiTests` eşzamanlılık testi #237'de düştü: test yardımcısı `on conflict (id)` → hedefsiz | ✅ birleşti | #238 | `M4/K-407.md` |
| K-407 (3/4) düzeltme: kayıtlı öğün açılır, önce sunucuda sil sonra aynı saatle kaydet, sil (onaylı) | ✅ birleşti; simülatör: birim değişince miktar kalıyordu (1 cup → 15 g); inceleme: porsiyon gramı bilinmeyince denetim kaçıyor → iki öğün kaybı → silme ancak tahmin alındıktan sonra; kayıp DELETE cevabı; telefondaki kopya unutulur; mutasyon 17/17 | #240 | `M4/K-407.md` |
| K-407 (4/4) barkod (`expo-camera`, yalnız barkod, mikrofonsuz; yazma yedeği) | ✅ birleşti; simülatör: alan esneyip/çöküyordu → ScrollView + kare kamera; inceleme: 400 "bağlantı" diyordu, Android ilk ret açıklamasız; mutasyon 12/12 | #241 | `M4/K-407.md` |
| K-413 tarif hafızası (ADR-034, V22, `/v1/recipes`, öğünde `recipe:<id>` porsiyonla) | ✅ birleşti; CI'da RED önce (iki tur); inceleme: düşen tek malzeme bütün listeyi 400 yapıyordu, porsiyon taşması, sınırsız tarif; saf `RecipeShareTests` | #239 | `M4/K-413.md` |
| K-416 bölündü → **K-424** (training: `supersetId`, kullanıcının hareketi) + K-416 (mobil); K-413'ün telefon kısmı → **K-423** | backlog'a yazıldı | — | — |
| K-424 süperset (`supersetId`) + kullanıcının hareketi (`/v1/custom-exercises`, `custom:<id>`, sınıflama kullanıcıya sorulur; ADR-035, V23) | ✅ birleşti; CI'da RED önce; inceleme: sözleşme metni düzenlenince tipler eski kaldı (mobil CI kırmızı), kendi hareketi "temiz değil" denince bitiş tümüyle reddediliyordu → kabul, etkisiz | #244 | `M4/K-424.md` |
| K-416 (1/3) geçmiş seansı düzenle: sil (onaylı) + unutulan seti ekle (çevrimiçi), silinen setin telefondaki kopyası unutulur, geçmiş odakta yeniden okunur | ✅ birleşti; simülatör: boş alanlar görünmüyordu → son setten öneri; RIR eksikti; inceleme: süren seansta da düzenleme vardı, yeniden denemede yeni clientId (çift set), çift dokunuş onaylı silmeyi geçiyordu; hedefler değişmez → soru 48; mutasyon 11/11 + 2/2 + 7/7 | #245 | `M4/K-416.md` |
| K-416 (2/3) seansa plan dışı hareket ekle (katalogda ad/takma ad, `extraPlan`, boş sayı alanında soluk "–", Kapat) | ✅ birleşti; inceleme: eklenen harekette her setten sonra kart atlıyordu, liste sırası değişince seçim kayıyordu (seçim artık kimlikle), "4 of 3" → plan sayılır; sağ taraf boşsa bu turdaki sol set önerilir; mutasyon 17/17 | #246 | `M4/K-416.md` |
| K-416 (2b) kendi hareketi telefonda: çevrimdışı kopya (`training.own`, `saved`), adı her ekranda, seanstan oluşturma (önce eşleşmeler — katalog + kendi; motorun soruları, hiçbiri varsayılmaz) | ✅ birleşti; simülatör: form + eklenen hareket; inceleme: kaydedilen hareket kopyaya yazılmıyordu → `saved()`; aynı clientId korunur (sunucunun cevabı gösterilir); mutasyon 33/33 | #247 | `M4/K-416.md` |
| K-416 (3/3) süperset: setin kimliği, eş sırada, dinlenme tur sonunda; geçmişte "Superset with"; K-416 aktarım dosyası | ✅ birleşti; simülatör: bench → row; inceleme: çözülen grup yeniden açılınca dönüyordu → grup hareketin son setinden; tur sırası; eşler birleşir; mutasyon 25/26 (1 eşdeğer) | #248 | `M4/K-416.md` |
| K-418 hareket ekranı: kurulum (telefonda, önce), klip yer tutucusu, Güray ipuçları harekete göre (sırtta son-tekrar yok), kas haritası (`react-native-body-highlighter`, temadan renk) | ✅ birleşti; simülatör: kart içindeki boş alan görünmüyordu → kart dışı; inceleme: sırtta çelişen ipuçları, kendi hareketine klip vaadi, `defaultFill` etkisizdi (çizimin gömülü grisi), `as Slug` yazım hatası gizliyordu; mutasyon 14/14 + 9/9 + 6/6 | #250, #251 | `M4/K-418.md` |
| K-419 (teknik kısım) klip kesim betiği `tools/clip.py` (3-5 sn, sessiz, dikey 960, faststart, bütçe) + `missing` listesi; CI'da | ✅ birleşti; 40/40 hareket eksik (80 klip) — çekim + denetim Levent'in | #249 | `M4/K-418.md` |

**Part 3 ÇIKIŞ (2 Eki):**
- **Birleşen:** K-407 #236 + #237 + #240 + #241 (+ #238 test yardımcısı) · K-413 #239 · K-424 #244 · K-416 #245 + #246 + #247 +
  #248 · K-418 #250 + #251 · K-419'un teknik kısmı (kesim betiği) #249. Açık PR yok, açık worktree yok (`../keel-main` kalıcı).
  Aktarım dosyaları `docs/aktarim/M4/` (README 14-18), görseller `img/`.
- **Çıkış kriterleri (`M4.md › Part'lar`):**
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | Öğün metin/barkod/"dünkü gibi" ile ~10 sn | ✅ (süre ölçümü cihazda yapılmadı) | K-407 dört PR; "dünkü gibi" tek dokunuş, barkod `expo-camera`, aralık kartı + adlı tek soru (`img/K-407-*`) |
  | Hareket kartı kendi klipten | ⏸ klip yok | K-418 ekranı hazır (kurulum, ipuçları, kas haritası; `img/K-418-*`); 80 klibin 80'i eksik (`python3 tools/clip.py missing`), oynatma K-425 |
  Kontrol çıktısı (`main`, 2 Eki): mobil jest **1225/1225** (`--maxWorkers=3`; varsayılan işçiyle iki ağır öğün testi ilgisiz bir
  CPU yükünde 5 sn'yi aştı → ayrı görev önerildi), typecheck + lint temiz; backend saf testler 942/942, DB testleri CI'da yeşil.
- **Kalan iş:** K-419 çekim + denetim (Levent; betik hazır). K-423 tarifler telefonda (Part 4'te zaman kalırsa). K-425 klip
  oynatma (klip gelince). K-308 cihaz adımları (Levent). Sorular 38-49.
- **Part 4'ün bilmesi gerekenler:**
  - **Kendi hareketi** (`custom:<uuid>`): telefonda `training.own`/`saved` (çevrimdışı kopya), `Move` = katalog hareketi + `name`;
    adı her yerde `exerciseName(id, moves)` — yeni bir ekran hareket adı gösterecekse `movesOf(data, own)` haritasını geçir.
  - **Süperset**: yalnız setin `supersetId`'si; grup = hareketin son iş setindeki kimlik (`supersetsInForce`), tur sırası turu
    başlatan; dinlenme turun sonunda (K-411 dinlenme sayacı bunu bilmeli: süpersette sayaç yalnız tur bitince başlar).
  - **Seçili hareket kimlikle** (`picked: string`), konumla değil.
  - **Kurulum** (`training.setup`, `train.setup`) telefonda, çıkışta silinir.
  - **Bağımlılıklar:** `react-native-svg` 15.15.4 + `react-native-body-highlighter` 3.2.0 (Expo Go'da çalışıyor).
  - **Test/araç tuzakları:** yerel `.expo/types/router.d.ts` yeni rota eklenince eskir → silinir (CI'da yok); simülatörün yazma
    aracı karakter kaçırabiliyor, klavye Türkçe ("i" → "ı"); kartın içindeki boş alan görünmüyor (alan rengi = kart rengi) →
    form kart dışında; `screen.unmount()` RNTL v14'te `await` ister.
  - **Dependabot:** #3 `node-forge` ≤1.4.0 (yüksek) — `@expo/cli`'nin geliştirme bağımlılığı, yaması yok (`fix: null`),
    uygulama paketine girmiyor; #2 bilinen. Expo yükseltmesinde ikisine de bak.
- **Yeni sorular:** 45-49.

**Part 4 başı (2 Eki):** senkron tamam — Part 3 ÇIKIŞ git ile tutarlı (#236-#251 birleşik, açık PR yok, `../keel-main`
kalıcı worktree temiz, `M4-part4-devam.md` yok). Bağımlılıklar `done` (K-307, K-405, K-404). Disk 7,9 GB. Dependabot: #2, #3
bilinen. K-308 hâlâ `doing` (cihaz derlemesi yok) → K-411'in Live Activity kısmı ve K-412'nin gerçek yazması cihazda
görülemez; kod + test + Expo Go'da yetenek "kullanılamaz" yolu. Ana checkout birleşmiş `mobile/115-muscle-map` dalındaydı →
`origin/main`'den yeni dal. Not: DEVAM NOKTASI "önce Part 2 + 3 aktarımı" diyordu; Levent Part 4'ü başlattı (aktarımlar bekliyor).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-410 (1/2) üç slot: saf plan, servis (sıralı yeniden kurma, kapalı başlar, çıkışta silinir), `expo-notifications` yalnız yerel, `reminder:` öneki (ADR-036) | ✅ birleşti; inceleme: iOS sayfası açıkken çıkış "açık"ı sonraki hesaba geçiriyordu (kuşak), "done" yazılırken çıkış eski programı + `onboarded`'ı bırakıyordu (K-306'dan beri) → düzeltildi; `trackOpens` testli; mutasyon 38/38 (+1 eşdeğer) | #253 | `M4/K-410.md` |
| K-410 (2/2) Ayarlar › Reminders (önce açıklama, iOS izni, Ayarlar yolu, kendi cümlesi); simülatörde izin + gerçek bildirim görüldü | ✅ birleşti; inceleme: izin yalnız açılışta okunuyordu (iOS Ayarları'ndan dönüş), kapat/kaydet hatası yutuluyordu → düzeltildi; mutasyon 12/12 | #254 | `M4/K-410.md` |
| K-411 dinlenme arka planda (yerel "Rest's up" bandın alt ucunda; `AlertAccess` sorusuz port; süperset turu) — **Live Activity → K-426** (cihaz derlemesi + App Group) | ✅ birleşti; simülatörde arka planda bildirim geldi; inceleme: süperset 2. turunda önceki turun uyarısı çalıyordu → düzeltildi; mutasyon 11/11 + 4/4 | #256 | `M4/K-411.md` |
| K-412 Apple Health'e yazma (ayrı port, iki anahtar, tür başına izin, `keel:` işareti + sync kimliği, 240 dk sınırı, "On" yalnız iOS izinliyken) | ✅ birleşti; Expo Go'da "cihaz derlemesinde" yolu görüldü, gerçek yazma K-308 sonrası; inceleme 5 bulgu düzeltildi; mutasyon 21/21 | #257 | `M4/K-412.md` |
| K-423 (1/2) tarif öğün aramasında, porsiyonla tek kalem, tembel okuma, Türkçe katlama, düzeltmede `recipeGone` | ✅ birleşti; simülatör: "Nothing found" kusuru bulundu → düzeltildi; inceleme 3 bulgu + test boşluğu düzeltildi; mutasyon 15/15 | #258 | `M4/K-423.md` |
| K-423 (2/2) tarif listesi + giriş (öğünün kalem akışı `FoodPicker`/`ItemRows`'a çıkarıldı), onaylı silme, geri dönüş | ✅ birleşti; simülatör: geri dönüşü yoktu → eklendi; inceleme 3 bulgu (sınır/5xx metni, kaybolan cevaptan sonra değişiklik, silme sorusu ekran dışında) + 3 test boşluğu; mutasyon 19/20 (+1 eşdeğer) | #259 | `M4/K-423.md` |

**Part 4 ÇIKIŞ = M4 ÇIKIŞ (2 Eki):**
- **Birleşen:** K-410 #253 + #254 · K-411 #256 (Live Activity → **K-426**, cihaz derlemesi + App Group) · K-412 #257 · K-423 #258 +
  #259 (zaman kaldı, eklendi). Açık PR yok; worktree yalnız kalıcı `../keel-main`. Ana checkout `origin/main`'de (ayrık HEAD).
  Aktarım `docs/aktarim/M4/` README 19-22 (K-410, K-411, K-412, K-423), görseller `img/K-41*`, `img/K-423-*`.
- **M4 çıkış kriterleri** (`yol-haritasi › M4`), kanıtla:
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | Bugün ekranı · tutarlılık sayısı · kalan bütçe | ✅ | K-401 #217, K-420 #216, K-409 #218 |
  | Tartı · HealthKit (adım, uyku, kilo) | ✅ kod + test; ❌ cihazda görülmedi | K-402 #219, K-404 #220; K-308 bekliyor |
  | Antrenman seansı ve özeti · PR/geçmiş/süperset · salon profili | ✅ | K-405, K-406, K-415, K-416, K-424, K-414, K-421, K-417 (Part 2-3) |
  | Öğün kaydı: metin, barkod | ✅ | K-407 (4 PR) |
  | Öğün fotoğrafı → aralık + gram sorusu | ↪ M5 | K-408 planda M5 (AI rızası K-511, backend K-514) |
  | Hareket gösterimi (kendi çekimler, ilk/son tekrar) | ⏸ ekran hazır, **klip yok** | K-418 #250/#251; `tools/clip.py missing` → "40 of 40 moves left"; K-419 Levent, K-425 oynatma |
  | Bildirimler | ✅ (simülatörde izin + gerçek bildirim) | K-410 #253/#254, `img/K-410-quiet-banner.png` |
  | Dinlenme sayacı | ✅ (arka planda bildirim simülatörde) · Live Activity ❌ → K-426 | K-411 #256, `img/K-411-rest-banner.png` |
  | Health'e yazma | ✅ kod + test; ❌ cihazda görülmedi | K-412 #257 |
  | Tarif hafızası | ✅ (sunucu + telefon) | K-413 #239, K-423 #258/#259 |
  | (M3'ten) cihazda development build + TestFlight | ❌ açık | K-308 Levent'in terminalinde |
  | Hedef: günün ~40 saniyesi | ❌ ölçülmedi | cihazda ölçülecek (K-308 sonrası) |
  Kontrol çıktısı (`main` 2c4c81c, 2 Eki): mobil `npm run check` → **85 suite, 1361/1361**, typecheck temiz, lint 0 hata
  (1 uyarı: `exercise-screen.test.tsx` `ReadonlyArray`, Part 3'ten); backend bu part'ta değişmedi, CI'da yeşil (#259'a kadar
  her PR üç kontrolle).
- **Kalan iş (M4'ten devreden):** K-308 cihaz adımları (Levent) → onunla görülecekler: HealthKit okuma/yazma, Live Activity
  (K-426), ~40 sn ölçümü. K-419 klip çekimi (Levent) → K-425. K-313 çizimler gelince. Backend küçük iş: tarif sınırı (100)
  ayrı hata kodu taşısın (şimdi düz 400; telefon metni ikisini birlikte anıyor) — kart açılacak.
- **M5'in bilmesi gerekenler:**
  - **Bildirimler** (`apps/mobile/src/notifications/`): yalnız yerel; `reminder:` önekli hatırlatmalar tek zincirde "hepsini
    yeniden kur"; `muted` kancası K-516 için hazır (`createReminders({ muted })`). Dinlenme uyarısı ayrı kimlik (`rest`),
    `AlertAccess` sorusuz port. Yeni bildirim türü eklenmez (ADR-036); K-512 tetikleyicileri uygulama içi soru.
  - **Health yazma** (`health/healthWrite.ts`): iki anahtar, tür başına izin, `keel:` işareti + sync kimliği, `shown()`.
  - **Öğün akışı** ortak: `food/FoodPicker.tsx` (arama + barkod + isteğe bağlı tarifler), `food/ItemRows.tsx`; K-408 (fotoğraf)
    aynı kalem akışına bağlanır.
  - **Simülatör:** yazma aracı karakter düşürüyor (pano `simctl pbcopy` da güvenilmez) → ekleme akışlarını testle kanıtla;
    çalışan simülatör diski ~4 GB tüketiyor → iş bitince `xcrun simctl shutdown all`. Geçici kök koruma yaması yalnız
    korumaları değiştirir — geri alırken eski yedeği kopyalama (yeni rotaları siler), tersine çevir.
  - **Görseller** `sips -Z 1000` ile küçültülür (bir ekran görüntüsü 4 MB'tı).
- **Yeni sorular:** 50-54 (aşağıda). Hepsi (33-54) bu oturumun sonunda AskUserQuestion ile soruluyor.

## M5 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M5.md`. Part prompt'ları `M5-part1.md` … `M5-part4.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Motor ve check-in | ADR-037 işleri (K-429, K-428, K-431, K-430, K-432, K-434) · K-516, K-512, K-513, K-501, K-502 | ✅ bitti (3 Eki) — aktarım bekliyor; K-430 Levent'te (soru 55) |
| 2 · Koç altyapısı | K-503, K-505, K-506, K-504, K-508 | bekliyor |
| 3 · Koç yüzü + sağlayıcı | K-509, K-507, K-517, K-511 | bekliyor |
| 4 · Fotoğraf, cihaz, teslim | K-514, K-408, K-510, K-515 · M5 çıkışı · M6 prompt'ları | bekliyor |

**Part 1 başı (2 Eki):** senkron tamam — M4 ÇIKIŞ git ile tutarlı (K-410 #253/#254, K-411 #256, K-412 #257, K-423 #258/#259,
K-435 #268, K-433 #269 birleşik; açık PR yok; worktree yalnız kalıcı `../keel-main`; `M5-part*-devam.md` yok). 33-54 → ADR-037
işlenmiş. Bağımlılıklar `done` (K-502 ← K-501, K-513 ← K-512 bu part içinde). Disk 5,6 GB. Dependabot: #2, #3 bilinen.
`../keel-main`'de commitlenmemiş `plan/github-ids.yaml` (K-433 hash'i, önceki oturumun `sync_backlog --apply` artığı) →
DURUM ile birlikte commitlendi.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-429 rıza metni `2-draft` (geri çekince antrenman hariç silinir; telefon eski rızayı `OUTDATED` okur, geri çekilebilir; çevrimdışı kopya sürümlü; 26 test isteği tek sabite) | ✅ birleşti; CI'da RED önce; inceleme: metin antrenmanın silineceğini vaat ediyordu, eski rızalı kullanıcı Withdraw'ı kaybediyordu, çevrimdışı eski "evet" geçiyordu → düzeltildi; mutasyon 9/9 | #270 | `M5/ADR-037-isleri.md` |
| K-428 geri çekmede açık "yükü tut" biter (`TrainingCalls.endHold`, decision'ın geri çekme dinleyicisinden, aynı transaction) | ✅ birleşti; CI'da RED önce; code-reviewer ≥80 yok; test analizi birleşmeden sonra geldi (süreç kayması: auto-merge incelemeden önce açıldı) → boşluklar #275'te | #271 | `M5/ADR-037-isleri.md` |
| K-431 yalnız ısınma dışı setli antrenman seans sayılır (`TrainingLog.workoutStarts`; tutarlılık, uyum, kaçan plan haftası) | ✅ birleşti (#272: WORKING); #275: sözlüğe göre FAILURE/DROP da çalışma seti → `<> 'WARM_UP'` + `weeksPlanMissed` testleri | #272, #275 | `M5/ADR-037-isleri.md` |
| K-434 hatırlatma teklifi onboarding'de — **ayrı ekran değil**, "What to expect"te (≤12 ekran, I1 F1; K-306 kabulü) | ✅ auto-merge; inceleme: iOS kesin ret → ölü düğme, kaybolan cümle, yeniden açılınca tekrar teklif → düzeltildi; mutasyon 7/7 + 7/7 | #274 | `M5/ADR-037-isleri.md` |
| K-430 sıçrama sınırı (`load_jump_max_steps` 2, `urun`; Java + TS + ortak vakalar; `SessionProgress` bağlı) | ⏸ **Levent bekliyor (soru 55)**: kural makine yığınlarını da kapsıyor → K-414 testi kırmızı (42×8 → 35×13, K1) ve tutma sonsuz/tekrar sınırsız; PR açık, auto-merge kapalı; mutasyon 6/6 | #273 | `M5/ADR-037-isleri.md` |
| K-431 takip: FAILURE/DROP da çalışma seti (sözlük) + K-428/K-431 kenar testleri | ✅ birleşti; CI'da RED önce | #275 | `M5/ADR-037-isleri.md` |
| K-501 pazartesi check-in (sunucu güdümlü sorular, tek clientId, V4: cevaplar yalnız ekranda; Bugün'de kart) | ✅ birleşti; inceleme: rota korumasızdı, ekrandan çıkınca `back()` başka ekranı kapatabiliyordu, geri düğmesi yoktu → düzeltildi; mutasyon 13/13 + 5/5; simülatör K-502 ile birlikte | #276 | `M5/K-501.md` |
| K-432 hedefin geldiği seans düzenlenince hedef yeniden (hareket başına; V24 `unclean_exercise_ids`, `clearNext`, `Workout.setsNextTargets` + telefon notu) | ✅ birleşti; CI'da RED önce (5); inceleme: bayrak `setNext`'ten dardı, telefon notu yanlış kalacaktı, kural hareket başına → ADR notu + testler; mutasyon 3/3 + 1/1 | #277 | `M5/ADR-037-isleri.md` |
| K-516 (1/3) durum modu: `/v1/state`, V25 `decision.declared_state`, rıza + silme + dışa aktarma, hesap kilidi (ADR-038) | ✅ birleşti; CI'da RED önce (25); inceleme: göç sırası (#277 bekledi), eşzamanlı beyan, enum sözleşme testi, dışa aktarma iddiası → düzeltildi | #279 | (K-516 sonunda) |
| K-516 (2-3/3) motor: `declared_context` (güvenlik önce), duraklayan hafta (tutarlılık + uyum + kaçan plan haftası), 3. haftada `STATE_STILL` | ✅ auto-merge; inceleme: `StateStore.days` pencereden önce biten durumu ters okuyordu (ilk durum bitince her check-in 500) → CI'da RED önce, düzeltildi; döngü sorusu beyanlı haftada sabitlendi; mutasyon 6/6 + 4/4 + 3/3 | #282 | `M5/K-516.md` |
| K-518 durum modu telefonda (servis + kv, `muted`, Bugün kartı, beyan ekranı, `state.json`) | ✅ birleşti; inceleme: tarihli durum bitince hatırlatmalar uygulama açılmadan dönmüyordu → `mutedUntil` ile tarihle plan; Bugün notu başka duruma yapışıyordu → kimlik (tür+başlangıç); geri çekmede yeniden plan testli (fikstür yarışı bulundu: girişteki profil okuması); mutasyon 15/15 + 7/7 | #284 | `M5/K-518.md` |
| K-516 PR'ları | ✅ #279 + #282 birleşti | | |
| K-512 (1/2) motor `Prompts` (T-13, T-4, T-5, T-2; ADR-039) | ✅ birleşti; yeniden tasarım: takvim haftaları, duraklayan günler (beyan + mola), T-5 yalnız CUT, kararlı anahtar, açığın ilk günü; 2. inceleme: adım hedefi gün gün (K-220 dersi) → RED önce; mutasyon 19/19 + 6/6 | #283 | `M5/K-512.md` |
| K-512 (2/2) `/v1/prompts` + V26 cevaplar + V27 `training_days_since` + `DeficitStart` + modül API'leri | ✅ birleşti; inceleme: birim değişimi seans sayacını sıfırlıyordu → V27; bozuk kural 500 → 400; metin "this week"/"Two" → "last week"/"A few"; bağlantılar testsizdi → mola haftası, açlık, yük (geçen pazar) testleri; CI'da RED önce | #285 | `M5/K-512.md` |
| K-519 kararın dayanağı (`GET /v1/decisions/{id}/basis`, `DecisionBasis`, `WeeklySpine.windowMeans`, `DecisionPipeline.windowRead`) | ✅ birleşti; inceleme: pencereyi okumamış karara hafta/hız gösteriyordu → `windowRead`; hedef kalori sözleşme testine takıldı (U5) → alan çıkarıldı; uyum yalnız oran → soru 63; mutasyon 8/8 + 6/6 | #286 | `M5/K-519.md` |
| K-520 tetikleyici soruları Bugün'de (tek soru, bir kez cevap, yanıt ya da yön) | ✅ birleşti; inceleme: ret "bağlantı" diyordu, eski "gönderilemedi" notu kalıyordu, sunucu dizgisinden anahtarlar testsizdi → düzeltildi (RED 2); mutasyon 10/10 + 2/2 | #287 | `M5/K-520.md` |
| K-513 (1/2) motor `FirstWeeks` (kişinin haftası, H1 sessiz, H2-H8 içerik + antrenmansız sürüm, risk biten kullanıcı haftası 5-8 iken: herhangi bir sinyal; af `Consistency.lastWeekForgiven`; ADR-040) | ✅ birleşti; 1. inceleme 5 bulgu (pencere bir hafta kaymış, af sunucuda, 5. hafta metni herkese "eşiği geçtin", antrenmansıza kas vaadi, ADR adı) + 2. inceleme 2 (yalnız Çarşamba başlangıcı test ediliyordu, kısa liste sinyali sessizce kapatıyordu); CI'da RED önce (2 kez); mutasyon 10/10 + 12/12 + 4/4 | #289 | `M5/K-513.md` |
| K-513 (2/2) sunucu `/v1/first-weeks` (`AccountDates`, decision → identity; mola haftası da duraklatır; akış dışında/1-5. haftada kayıt okunmaz) + riskte soru bütçesi 5 (bugün gözlenemez: motor anomali dışında ≤2 soru bekler) | ✅ birleşti; CI'da RED önce (12); inceleme: akış bitince de bütün hafta okunuyordu, 1-5. haftada kullanılmayan kayıtlar → `readsRisk`; yalnız UTC test ediliyordu → İstanbul testi; mutasyon 4/4 (saf) | #290 | `M5/K-513.md` |
| K-502 (1/2) karar kartı yüzleri (hold/advice/change/wait, sunucudan okunur) + telefondan "Apply from today" (önceden hiç yoktu) | ✅ birleşti; CI'da RED önce (2 kez); inceleme 4+3 (FIX_* "değişiklik yok" diyordu, her ret "geçmiş", not yeni okumada kalıyordu, merdivende "hedeflerin değişti"); mutasyon 12/12 | #291 | `M5/K-502.md` |
| K-502 (2/2) gerekçe sayfası `/why` (veri satırları `basisRows`, kurallar + kaynak türü, güven, sonraki değerlendirme, sınır cümlesi) | ✅ birleşti; CI'da RED önce; inceleme: uyum yüzdesi kayan noktada bir puan düşük (0,58→57), değişken anahtarlar her enum için denenmiyordu; mutasyon 15/15 (**mobil mutasyon betiği deseni tek argüman veriyordu → sahte "öldü"; düzeltildi, kontrol mutantı**); simülatör: kural cümleleri yok → K-522 | #292 | `M5/K-502.md` |

**Part 1 ÇIKIŞ (3 Eki):**
- **Birleşen (Part 1):** K-429 #270 · K-428 #271 · K-431 #272/#275 · K-434 #274 · K-501 #276 · K-432 #277 · K-516 #279/#282 · K-518 #281 ·
  K-512 #283/#285 · K-519 #286 · K-520 #287 · K-513 #289/#290 · K-502 #291/#292. Açık PR: yalnız **#273 K-430** (Levent, soru 55; worktree
  `../keel-k430`, auto-merge kapalı). Kalıcı worktree `../keel-main`. Ana checkout ayrık HEAD (`origin/main`, temiz).
- **Kontrol çıktısı (3 Eki, `main` f5a7355):** mobil `npm run check` 91 suite **1500/1500**; backend saf testler **1024/1024** (336 DB testi
  yerelde Docker yok → CI'da; `main` CI yeşil).
- **Simülatör turu (Expo Go + fikstür sunucusu + geçici koruma yaması, ikisi de geri alındı):** K-501 check-in (sorular nedenleriyle, tek
  gönderim, kart kalkar), K-518 beyan + Bugün'de duraklatılan hafta, K-520 soru kartı, K-502 beş yüz + uygulama + gerekçe sayfası
  (`docs/aktarim/M5/img/`). **Bulunan:** gerekçede kural cümleleri yok → K-522 (soru 72). **Görülemeyen:** K-434 (onboarding adımı — Metro
  yamayı almadı; testleri + mutasyonu PR'ında).
- **Backlog:** K-513, K-502 `done`; K-430 `doing` (Levent); K-521 (ilk 8 hafta telefonda) ve **K-522 (kural cümleleri, yeni)** `todo`; sync ✅.
- **Part 2'nin bilmesi gerekenler:**
  - Kararın gerekçe satırları sunucuda `DecisionBasis` (K-519), telefonda `src/today/basis.ts`; karar yüzü `src/today/call.ts` `variantOf`
    (sunucunun "uygulanacak" durumundan) — koç anlatımı (K-505) bu yüzlerle ve `basisRows` sayılarıyla birebir olmalı (sadakat testi).
  - Uygulama telefonda `applyCall` (409 = geçmiş, başka ret = bizim sorunumuz); geri alma (undo) telefonda yok.
  - İlk 8 hafta `GET /v1/first-weeks` (risk sinyalleri kural kimliğiyle) — koçun "insan tonu" risk mesajı K-521'de; risk haftasında soru
    bütçesi 5 ama motor anomali dışında ≤2 soru bekler (ADR-040 #4).
  - Mobil mutasyon: jest desenini böl, "test koşmadı"yı ayır, kontrol mutantı (`plan/oturum-promptlari/M5-part1-devam.md › Dersler`).
  - Disk temizlik sonrası **4,9 GB**; çalışan simülatör ~3 GB tutar (kapatınca döner).
- **Yeni sorular:** 72 (kural cümleleri). Part 2 başında sorulacak sağlayıcı kapısı: **67-71** (hazır).

## Session sonunda Levent'e sorulacaklar
**55-72 → ADR-041 (3 Eki, M5 Part 1 sonu; AskUserQuestion).** Açık yalnız 57 (rıza metni sınıflaması — yayından önce hukuki bakış). İş doğuranlar: K-430 (#273, e1RM), K-523 (üründe kişi adı yok), K-524 (literatür), K-525, K-526, K-527 — Part 2 başında. Sağlayıcı: şimdi belgesel, gerçek ölçüm yayında; harcama yok; sıfır saklama şart. Aşağıdaki liste kayıt içindir.
**M5 Part 1 (55-59):**
55. **(K-430, ürün + K1)** ADR-037 #38 (b) "en yakın ağır yük motor adımının 2 katından uzaksa yük tutulur, tekrar artar" makine
    yığınlarına ve yalnız 10'luk plakalı bara da uygulanıyor: 7 kg adımlı makinede üst vücut (motor adımı 2,5) 35 → 42 sıçraması
    5'i aşıyor → yük 35'te kalır. (i) **K1:** K-414'ün `aMachinesOwnStepIsTheOneTheLoadIsRoundedTo` testi 42×8 bekliyor → 35×13
    olur; beklentiyi değiştirmeme onay? (ii) **Çıkış koşulu yok:** tutma sonsuz, hedef tekrar her seans +1 (35×13, 14, 15…).
    Seçenekler: (a) **önerim** — e1RM eşdeğerliği: biriken tekrarlar ağır yükü aralığın altında yapılabilir kılınca (Epley, H3
    B15) sıçra (35×14 → 42×6); (b) aralığın üstünde N tekrar sınırı (parametre, kaynak yok); (c) böyle kalsın. PR #273 açık bekliyor.
56. **(K-431, bilgi)** Sözlük "çalışma seti"ni "ısınma olmayan, tükenişe yakın" diye tanımlıyor → yalnız FAILURE/DROP setli
    antrenman da seans sayılır (`<> 'WARM_UP'`, #275). Farklı istiyorsan söyle.
57. **(K-429, ürün/hukuk)** Sağlık rızası metninin ilk cümlesi "food and training logs are health data" diyor; ADR-007'ye göre
    antrenman sağlık verisi değil ve geri çekmede silinmiyor. Yeni cümle "antrenman kaydı hariç silinir" diyerek doğru söylüyor,
    ama ilk cümledeki sınıflama kalsın mı? (metin hâlâ `-draft`)
58. **(K-434, bilgi)** Hatırlatma teklifi ayrı ekran değil "What to expect"te: K-306'nın ≤12 ekran kabulü (görünüş + AI rızası
    gelince) ayrı adımla 13 olurdu. ADR-037 #51'in "onboarding sonunda bir adım" ifadesinden bu sapma uygun mu?
59. **(K1, K-501/K-518/K-516)** Sabitleyen listeler bilerek genişledi (iddia genişledi, eskisi silinmedi): `today.test.ts` Bugün'ün
    okuduğu uç noktalar (+ check-in, + state); `CheckInPartsTests` alınan cevap türleri (+ `STATE_STILL`). Onay?
60. **(K-516, sağlık/U14)** Durum modunun iki alt maddesi kaynak bekliyor: (a) **dönüş yükü** — hastalık/moladan dönüşte ilk seans
    önceki yükün ne kadar altında (G7 K-72 "yavaş yavaş" diyor, sayı yok); (b) **yoğun hafta minimum dozu** — koruma için kas başına
    kaç set (G1 K-11 "alt sınır 4", koruma sayısı yok). Güray'a sorulabilir mi, ya da literatür taraması isteyelim mi? O zamana kadar
    uygulanmıyor.
61. **(K-516, ürün)** Bir hafta "herhangi bir günü" beyanlıysa duraklıyor (eşik yok; kötüye kullanıma sınır 3. haftanın sorusu).
    Yarım haftadan az beyan da duraklatsın mı? (ADR-038 #4)
62. **(K-516, ürün)** `STATE_STILL` 3. duraklayan haftadan sonra **her hafta** soruluyor (YES denince bir hafta sonra yine).
    "Tek soru" bir kez mi demek, haftada bir mi?
63. **(K-519, ürün/veri)** K-519 kabulü "uyum (yapılan / planlanan)" diyor; ama kararın anlık görüntüsü yalnız **oranı** saklıyor (sayılar
    değil). Şimdi gerekçe sayfası oranı gösterir (ör. %80), eski kararlar için sayı uydurulmaz. Sayılar gerekirse yeni kararların anlık
    görüntüsüne eklenir (göç değil, JSON alanı; eski kararlar oranla kalır). (a) oran yeter; (b) yeni kararlarda sayıları da sakla.
64. **(K-512, ürün)** Kaçan seans kuralı **profilin** antrenman günlerine bakıyor (`trainingDays`). Kullanıcının kendi programı (`PUT
    /v1/program`) başka hafta günlerine konmuşsa soru o günler üzerinden sorulmaz. Programın günleri mi esas alınsın? (inceleme notu, <80)
65. **(K-513, ürün)** İlk 8 haftanın metinleri taslak (`en.json › first_weeks.week2..8`; H4 nöral açıklama, H6 ilk kez "muscle"). Onay ya
    da düzeltme? Ayrıca risk 5-8. haftada okunuyor (I1 F2 "5. hafta", G2 K-63 "5.-8. hafta kritik") ve **herhangi bir sinyal** risk
    sayılıyor (kaynak ağırlık vermiyor). Kayıt düşüşü `min_logged_days_per_week`'i kullanıyor — o parametrenin kendisi de "SEÇİM,
    Levent onayı bekliyor" notlu.
66. **(K-513/K-521, ürün)** Riskli haftada telefon tek "insan tonu" mesaj gösterecek (I1 F2). Metni sen mi yazarsın, ben taslak mı
    yazayım? Ayrıca "uygulama açılmaması" sinyali yalnız telefonda bilinir — sunucuya gönderilsin mi (açılış zamanı, sağlık verisi değil)?

72. **(K-522, ürün/metin)** Gerekçe sayfası ve "Why this call" listesi kural başına cümle gösterecek (prototip 3.5: "Moving toward goal and
    training stable, so change nothing."). Şu an çoğu kararda yalnız kaynak türü görünüyor. Cümleleri ben kaynaklarından taslak yazayım
    (`en.json`, `-draft` gibi onayına), sen onaylarsın — uygun mu? Yoksa Güray'ın sözleriyle mi olsun?

**M5 Part 2 başında sorulacak — sağlayıcı kapısı (67-71; AskUserQuestion, cevap ADR'ye; cevapsız Part 2 yalnız sahte sağlayıcıyla):**
67. **(K-511, veri dışarı + marka)** Ölçülecek adaylar (en az üç, ADR-004 katman 2): Anthropic (Claude, küçük model), OpenAI (küçük model),
    Google (Gemini Flash). Model adları, fiyatlar ve veri saklama/eğitim politikaları K-511'de resmî sayfalardan doğrulanacak — şu an
    `[doğrulanmadı]`. Listeye eklemek/çıkarmak istediğin var mı (ör. Türkiye/AB'de barındırılan bir sağlayıcı)?
68. **(K-511, ölçüm planı)** Aynı set üç adaya: öğün ayrıştırma (veritabanı eşlemesiyle, U1), karar anlatım sadakati (sayılar kararla
    birebir), "hayır diyen koç" seti (K-506, ≥30 itiraz), maliyet (istek başı), gecikme. Gerçek koşular **senin terminalinde, senin
    anahtarınla**; sonuç tablosu ADR'ye. Onay ya da eklemek istediğin ölçüt?
69. **(para)** Aylık bütçe ve sağlayıcıdaki **harcama limiti** (K-503 kabulü: manuel adım). Ölçüm dönemi için ayrı bir tavan? (ADR-004:
    LLM maliyeti gelirin ~%4'ü; asıl risk kotasız kötüye kullanım — kota `quota.yaml`, K-508.)
70. **(hesap/sır, V5)** Anahtar nerede durur: geliştirmede senin terminalinde ortam değişkeni; üretimde sunucunun sır deposu (hangisi —
    barındırma kararı henüz yok). Repoda, promptta, logda asla. Anahtarı sen oluşturursun; ben yalnız değişken adını bilirim.
71. **(veri dışarı, KVKK/GDPR)** Kullanıcı verisi yurt dışındaki bir sağlayıcıya gider (V2: rıza sağlayıcıyı adıyla söyler). Sıfır saklama
    (zero data retention) seçeneği olan sağlayıcıyı şart koşalım mı? Hukuki görüş gerekirse kimden?

**33-54 → ADR-037 (2 Eki, M4 sonu).** Açık soru yok. İş doğuranlar: K-428…K-435 (mobil olanlar M4 kapanışında, backend
olanlar M5 Part 1 başında). Aşağıdaki liste kayıt içindir.
38. **(K-414, sağlık/ürün — YENİ, Part 2)** Yuvarlama "son yükten ağır, hedefe en yakın mümkün yük"ü alıyor (kart: "mümkün en yakın").
    Seyrek raflı salonda sıçrama büyük olabilir (dambıllar 10 → 20 kg: +2,5 hedefi 20 olur, +%100). Kaynaklı bir sıçrama sınırı
    yok. Seçenekler: (a) böyle kalsın; (b) en yakın ağır yük motor adımının 2 katından uzaksa tekrar artışına çevrilsin
    (TÜRETİLMİŞ sınır); (c) başka bir sınır (söyle). ADR-032 madde 5.
39. **(K-405 → K-220, ürün/veri — YENİ)** Sunucu **setsiz** antrenmanı da "yapılan seans" sayıyor (`TrainingLog.workoutStarts`:
    tutarlılık + motorun uyum okuması). Telefon artık setsiz antrenman üretmiyor (kayıt ilk sette). Sunucu da yalnız çalışma
    seti olan antrenmanı saysın mı? (a) evet (önerim; `ConsistencyApiTests` fikstürüne bir set eklenir — K1 onayı); (b) kalsın.
40. **(K-417, sağlık/ürün — YENİ)** Isınma merdiveni TÜRETİLMİŞ: kaynak yalnız sayıyı veriyor (G1 K-17: hareket başına ≥1, günün
    ilk hareketinde 3–4; tükenişe yaklaşmaz). Şimdi: ilk hareket 3 set — iş yükünün %50 × 8, %70 × 5, %85 × 3; diğerleri 1 set
    %60 × 5; vücut ağırlığında tek kolay set; salon yoksa 2,5 kg / 5 lb'ye yuvarlanır (`data/parameters/workout.json`, `urun`).
    (a) onay; (b) başka yüzde/tekrar (söyle).
41. **(K-405, ürün — YENİ)** Mola haftasında (restUntil) Antrenman sekmesi yine "Start" gösteriyor (not: "Rest is the plan this
    week"). (a) böyle kalsın (kullanıcı karar verir); (b) mola haftasında Start gizlensin; (c) Start dursun, basınca bir uyarı.
42. **(K1 onayı — YENİ, Part 2)** İddia değişmeden fikstür değişti: `SetTypeTests` hareketi ekipmanıyla kurar; `AccountFixture`
    bir salon ekler (her tabloda satır olsun diye); `navigation.test.tsx` servislere `training` ve `workoutRecords` verir.
    İddia eklendi (değişmedi): `AccountDataTests` dışa aktarmada salonu, `WorkoutLogTests` `equipment`'ı da bekler. **Bir beklenti
    değişti:** `workout-screen.test.tsx` "setli bitişte ekran kapanır" → "özet açılır" (K-406 davranışı bilerek değiştirdi;
    setsiz bitişte ekran hâlâ kapanır). (a) onay; (b) geri al.
43. **(K-417, sağlık/ürün — YENİ)** G1 K-17 "her harekete en az bir ısınma" diyor. Ama iş yükünden hafif bir yük salonda yoksa
    (ör. 4 kg curl, en hafif dambıl 4 kg) şimdi **ısınma gösterilmiyor**. (a) böyle kalsın (önerim: daha hafif yük yok); (b) iş
    yüküyle az tekrarlı bir ısınma seti önerilsin.
44. **(K-415 + K-406, ürün/kaynak — YENİ)** G6 K-33'ün metni: izole hareketlerde "kilo/tekrar takibi ve progresif overload
    aranmaz" (bir tekrar fazlası için form bozulur). Görev kartı ise "izolasyonda yük PR'ı yok, **tekrar/efor PR'ı var**"
    diyor; K-406 özeti de izolasyonda "Same weight, 2 more reps" yazıyor. Şimdi kart uygulanıyor (ADR-033). (a) böyle kalsın
    (kart); (b) izolasyonda ne rekor ne kıyas (K-33 metni) — rekor listesi ve özet satırı izolasyonda boş kalır.
45. **(K-413, veri — YENİ, Part 3)** Tarif **sağlık verisi** sayıldı (ADR-034 #5): HEALTH_DATA rızası ister, rıza geri
    çekilince silinir. Gerekçe: tarif ne yediğini anlatır; tutucu olan seçildi. (a) böyle kalsın; (b) tarif sağlık verisi
    değil (yalnız öğün kaydı öyle): rızasız da girilebilir, geri çekmede kalır.
46. **(K-407, ürün — YENİ)** Yeni öğünün varsayılan öğün türü saatten (`data/parameters/food.json` `meal_slot_starts`:
    kahvaltı 04, öğle 11, akşam 16, ara 22'den; tek dokunuşla değişir). Saatler tahminim. (a) böyle; (b) başka saatler;
    (c) varsayılan yok, her seferinde seçilsin (bir dokunuş fazla).
47. **(K-413, ürün/U5 — YENİ)** Tarifin porsiyonu kesin pay sayılıyor (4 porsiyonun 1'i = tam ¼; aralık yalnız malzemeden).
    Gerçekte tabaklar eşit değil. (a) böyle kalsın; (b) porsiyon payına da belirsizlik eklensin (ör. ±%15 — kaynak gerekir);
    (c) ileride pişmiş toplam ağırlık + tartılan porsiyon (ADR-034 alternatifi).
48. **(K-416, ürün — YENİ)** Geçmiş seans düzenlenince rekorlar ve tahmini max yeniden hesaplanır (setlerden türetiliyor),
    ama **sonraki seansın hedefi** (K-217, bitişte hesaplanır) **değişmez**. Örnek: "12 tekrar yazdım, 10'du" → yük artışı
    yürürlükte kalır. Şimdi: ekranda "buradaki değişiklik sonraki hedefleri değiştirmez" yazıyor. (a) böyle kalsın;
    (b) programın son bitmiş seansı düzenlenince hedefler yeniden hesaplansın (training görevi, backend).
49. **(K-418, ürün — YENİ)** Kas haritası çizimi kütüphanenin varsayılanı olan **erkek figürü** (`react-native-body-highlighter`
    `gender` male/female). (a) böyle kalsın (tek figür, anatomi aynı); (b) profildeki cinsiyete göre figür (profil okuması
    ekrana eklenir). Ayrıca K-418 kartındaki "bağımlılık Levent onayıyla" notu ADR-019'dan eski; K5'e göre eklendi
    (aşağıda "Eklenen bağımlılıklar"), itirazın varsa söyle.
50. **(K-410, ürün — YENİ, Part 4)** Check-in hatırlatması check-in gününün **09:00**'unda (`notifications.json`
    `check_in_reminder_time`, `urun`): kaynak (I1 F4) yalnız "Pazartesi sabah" diyor, saat yok. (a) 09:00; (b) başka saat.
51. **(K-410, ürün — YENİ)** Hatırlatmalar yalnız Ayarlar'dan açılıyor (kapalı başlar; iOS izni orada sorulur). Çoğu kullanıcı
    hiç açmayabilir. (a) böyle kalsın; (b) onboarding sonunda bir adım ("Hatırlatmalar? Aç / Şimdi değil"); (c) Bugün'de bir
    kez gösterilen kart. Ayrıca mola haftasında (`restUntil`) antrenman hatırlatması susturulsun mu? (evet/hayır)
52. **(K-411, ürün — YENİ)** Dinlenme bildirimi ("Rest's up", 2:00'de) üç hatırlatma türünden sayılmadı (kullanıcının başlattığı
    sayaç; ADR-036 Sonuçlar) ve yalnız bildirim izni varsa çalışıyor (izin Ayarlar'dan). Günün son setinden sonra da geliyor
    (ekrandaki sayaç gibi). (a) böyle; (b) son setten sonra uyarı yok; (c) dinlenme uyarısı Ayarlar'da ayrı anahtar.
53. **(K1 onayı — YENİ, Part 4)** Bir beklenti değişti: `app-config.test.ts` yazma izni metnini "K-412'ye kadar" `false`
    bekliyordu → artık `en.json › permissions.healthWrite` (K-412'nin amacı). Fikstür eklemeleri (iddia aynı):
    `settings-screen`, `navigation` (`reminders`, `healthWriting`), `workout-screen` (`restAlert`, `healthWriting`),
    `weigh-in-screen` (`healthWriting`). (a) onay; (b) geri al.
54. **(K-412, ürün/U1 — YENİ)** Health'e yazılan antrenman **enerji (kcal) içermiyor**: uygulama ölçmüyor, tahmini sayı U1'e
    aykırı. Fitness halkalarına katkısı (Move/Exercise) cihazda görülecek [doğrulanmadı]. (a) böyle kalsın; (b) kaynaklı bir
    MET formülüyle tahmini enerji yazılsın (tek sayı ister — U5 ile gerilim, senin kararın).
**25-32 → ADR-030 (1 Eki, M3 sonu).** Açık soru yok. Açık kalan: referans çizimlerin çizeri/bütçesi (K-313).
33. **(K-231, veri — YENİ, M4 Part 1)** Apple Health rızası geri çekilince ne silinsin? Şimdi: Health'ten **okuma durur**,
    sunucuda zaten tutulan tartı (`source=APPLE_HEALTH`) ve adım/uyku günleri **kalır** — bunlar sağlık verisi rızasıyla
    (HEALTH_DATA) işleniyor; o rıza geri çekilince hepsi silinir. Seçenekler: (a) böyle kalsın (önerim: Apple Health rızası
    "okuma izni", saklama dayanağı HEALTH_DATA); (b) Apple Health kaynaklı kayıtlar da silinsin (uyarıyla, onaylı).
34. **(K-231, ürün/sağlık — YENİ)** Sağlık rızası geri çekilince kararlar silinir, ama antrenmanda açık bir "yükü tut"
    (deload merdiveninin ilk basamağı, K-217) kalır; onu bitirecek karar artık gelmez (check-in rıza ister) → yük artışı
    rıza yeniden verilene kadar donabilir. Seçenekler: (a) geri çekmede açık "tut" biter, antrenman normal ilerler
    (önerim); (b) böyle kalsın (rıza dönünce merdiven kaldığı yerden sürer). Bilgi: hard stop geçmişi de kararlarla
    silinir (hesap silmedeki gibi); rıza dönünce motor gözlemle başlar, düşük enerji görürse döngü sorusu yeniden gelir.
35. **(K1 onayı — YENİ)** K-231 test **isteklerini** değiştirdi, iddiaları değil: `ConsentTests`, `ProfileApiTests`,
    `ApplyDecisionApiTests`, `DecisionServiceTests` HEALTH_DATA'yı artık `?confirmDataDeletion=true` ile geri çekiyor;
    mobilde `settings-screen` ve `onboarding-flow` düz DELETE yerine tek servisi (`withdrawHealthData`) bekliyor; K-309'un
    "metin silme demiyor (silme K-231'de)" testi, beklediği K-231 testiyle değişti. (a) onay; (b) geri al.
    K-401/K-409/K-402 de test **fikstürlerini** değiştirdi (iddialar aynı): `navigation.test.tsx` sahte sunucusu yola göre
    cevaplar, "her sekmede koç girişi" testi tek ekranlık gezgin içinde çizer; servis taklitleri `syncHealth`,
    `queue.drain`, `consents` alır; K-409 `loadToday` testi bütçe ucunu da bekler. Aynı soru: (a) onay; (b) geri al.
36. **(K-231, veri/hukuk — YENİ)** Sağlık verisi rıza metni (`consent.health_data.body`, sürüm `1-draft`) geri çekmeyi
    "calls stop until you allow it again" diye anlatıyor; K-231'den beri geri çekme bağlı veriyi **siler** (Ayarlar uyarısı
    bunu söylüyor). Rıza metni senin/hukukun (M8): (a) metne "geri çekince bu veriler silinir" eklensin (sürüm artar,
    kullanıcılar yeniden onaylar — henüz kullanıcı yok, maliyet sıfır); (b) M8'deki hukuk gözden geçirmesine kalsın.
37. **(K-404, ürün — YENİ)** Başka uygulamada kaydedilen antrenmanlar (koşu, bisiklet) Apple Health'te. Şimdi:
    yaktıkları enerji **aktif enerji** olarak sunucuya gidiyor (enerji uygunluğu U13 bunu okur); ayrı seans olarak
    gitmiyor (sözleşmede alan yok). Seçenekler: (a) böyle kalsın; (b) tutarlılıkta **antrenman** sayılsınlar (planlı
    salon günlerine karşı) — sözleşme + backend işi, ayrı görev; (c) yalnız Antrenman geçmişinde görünsünler, sayılmasınlar.
30. **(K-228 incelemesi, veri/hukuk — YENİ, Part 3)** Hard stop artık "CHANGE_PHASE → BULK + safety: true" olarak saklanıyor;
    ama `safety` işareti **yalnız** hard stop'ta çıkıyor → kaydı okuyan cevabı yine çıkarabilir (ADR-028 (b)'nin doğası).
    Seçenekler: (a) kabul (artık risk, ADR'ye yaz); (b) güvenlik ağının **tüm** kararları (hızlı kayıp, LEA daraltma) da
    `safety` taşısın → işaret tek başına cevabı söylemez, ama "CHANGE_PHASE→BULK + safety" birleşimi yine yalnız hard stop;
    (c) hard stop kararı belirli süre sonra silinsin (ADR-028'de (c) seçilmemişti).
31. **(K-227, sağlık — YENİ, Part 3)** Mini cut'ın açığı kaynakta yok (G7 K-102: "4–6 hafta defisit", sayı yok). Önerim
    (TÜRETİLMİŞ): bakım tahmini − kalori merdiveninin ilk kesim adımı (K-107), gözlem beklemeden; süre en fazla
    `mini_cut_weeks_max`, sonra bulk'a dönüş. Seçenekler: (a) onay; (b) başka bir büyüklük (söyle); (c) mini cut şimdilik
    uygulanmasın (motor önerir, plan değişmez).
28. **(K-312, sağlık — YENİ, Part 3)** Referans görünüş (7 seviye) motorun iç yağ tahminini, dolayısıyla LEA tabanını ve
    faz kapısını besliyor. ADR-028 "M3'te metin açıklamalı yer tutucu" dedi; ama kaynak yalnız bir eşiği betimliyor
    (G6 K-9: göbek görünüyorsa erkekte %20 üstü). Seçenekler: (a) çizimler gelene kadar adım **gizli**, motor bel/RFM ile
    çalışır (önerilen; kaynaksız girdi yok); (b) 7 seviyeyi metinle betimle (kaynaksız, U14 dışı — senin onayınla);
    (c) yalnız iki seçenek: "göbek görünüyor / görünmüyor" (kaynaklı tek eşik, kaba). → K-313.
29. **(K-306, ürün — YENİ, Part 3)** Takvim ekranı "gerçekçi gün" çıkarımı: şimdi plan = seçilen günler; geçen ay daha
    azsa "geçen aydan fazla, bildiğine yakın başlamak planı yürütür" der, sınır koymaz (kaynaklı sayı yok). Seçenekler:
    (a) böyle kalsın; (b) plan gün sayısını geçen aya göre sınırla (ör. geçen ay +1 — kaynaksız eşik, senin kararın).
26. **(K-310, K1 onayı — YENİ, Part 2)** `app-services.test.ts`'teki bir beklentiyi değiştirdim (#199'da yazılmıştı):
    "yavaş ağda çıkış isteği sunucu cevaplamadan gitti" testi fetch çağrısını **bir** diye sayıyordu; girişte artık profil
    de okunuyor (birim tercihi) → iki çağrı. Yeni hâli: her istek kendi adresiyle beklenir ve `/v1/auth/sign-out`'a **tam
    bir** çağrı gitmiş olmalı — aynı iddia, daha sıkı. K1 "beklenti sorulmadan değişmez" dediği için onayına: (a) onay;
    (b) geri al, başka yol (girişte profil okumayı ertelemek).
27. **(K-310 incelemesi, sağlık verisi — YENİ, Part 2)** Birim değiştirmek (ve K-309'daki her ayar) **bütün profili**
    PUT eder. Sağlık rızası geri çekilmiş kullanıcıda GET "yiyemediğim gıdalar"ı gizler → PUT onu boş yazar → rıza yeniden
    verilince liste yok. ADR-028 #21 (geri çekince silinir) ile sonuç aynı ama uyarısız, yan etkiyle. Öneri (teknik,
    K-231'e): sunucu, rıza yokken PUT'ta gelmeyen `avoid`'i korusun (ya da K-231 geri çekmede zaten silsin → tutarlı).
    Karar: K-231 ile birlikte mi, şimdi mi?
25. **(K-304 incelemesi, sağlık/rıza verisi — YENİ, Part 2)** Telefonda çevrimdışı girilen bir sağlık kaydı (tartı, bel,
    öğün…) gönderilirken sunucu **403 CONSENT_REQUIRED** derse (rıza hiç verilmemiş, geri çekilmiş ya da rıza metninin
    sürümü değişmiş ve yeniden onaylanmamış) ne olsun? Şimdi (en temkinli, geçici): kayıt REJECTED, telefonda kalır, bir
    daha gönderilmez. Seçenekler: (a) böyle kalsın, ekran "rıza olmadan kaydedilemedi" desin; (b) "rıza bekliyor" durumu:
    rıza verilince kuyruğa geri girip gönderilsin (rıza öncesi girilen veri rızadan sonra işlenir); (c) rıza yoksa kayıt
    telefonda hiç tutulmasın (giriş ekranı rıza ister). Antrenman/set rızaya bağlı değil, etkilenmez.
**0-20 → ADR-027; 21-24 → ADR-028 (30 Eyl, M3 Part 1 başı).** Açık kalan: Apple kimlikleri (K-305/K-308 öncesi), referans çizimlerin çizeri/bütçesi (M4 öncesi), K-308 için disk.
21. **(K-225 incelemesi, veri/hukuk — YENİ)** Rıza geri alınınca sağlık verisi **silinmiyor, yalnız gizleniyor**
    (`ConsentWithdrawn` olayını dinleyen modül yok; tüm sağlık verisi için aynı). GDPR Md. 7(3)/17: geri çekme silmeyi
    zorunlu kılmaz ama beklenir. Seçenekler: (a) geri çekince o rızaya bağlı veri silinsin (geri dönüşsüz, uyarıyla);
    (b) gizlensin, kullanıcı ayrıca silebilsin (şimdiki + silme düğmesi); (c) belirli süre sonra silinsin.
22. **(K-224 incelemesi, sağlık — YENİ)** ADR-027 #11 "bel/boy bandı **yalnız kapı için**" dedi. Kod RFM'i nokta tahmin
    olarak okuyor ve bu sayı faz kapısı + L-4'ün yanında **LEA tabanının kcal büyüklüğünü** de belirliyor (yağsız kütle =
    kilo × (1 − yağ); ±5 puan hata tabanı erkek 80 kg'da ~±100 kcal oynatır). İki tahmin varken alt olanı okur (temkinli).
    Seçenekler: (a) böyle kalsın — LEA ağı RFM'le de çalışsın (şimdiki; görünüş seçmeyen ama belini ölçen korunur);
    (b) LEA ağı ve tabanı yalnız görünüşle, RFM yalnız faz kapısı/L-4 için; (c) LEA'da RFM'in bandının temkinli ucu
    (alt − 5/6 puan) okunsun.
23. **(K-222 incelemesi, sağlık — YENİ)** Hard stop (adet kaybı → açık biter, plan BULK + bakım) **ne kadar sürer?** Şimdi:
    bakım gözlemi (kadında 28 gün) bitince motor normal işler; yağ tahmini bulk tavanının (%30) üstündeyse faz kapısı cut'a
    döndürür ve açık geri gelir. Döngü sorusu yalnız plan yine LOW olunca sorulur. Geri alma (undo) kapalı (L-1).
    Seçenekler: (a) hard stop'tan sonra N hafta (ör. 12) cut'a dönüş ve aşağı adım yok; (b) cut'a dönmeden önce döngü
    sorusu yeniden sorulsun ("hayır" gelirse dönülür); (c) kullanıcı "doktorum onayladı" diyene kadar sürsün.
24. **(K-222 incelemesi, veri/hukuk — YENİ)** ADR-027 #18 "karar saklanır, adet cevabının izi kalmaz" diyor; ama HARD_STOP
    yalnız "evet" cevabıyla çıkıyor → saklanan/dışa aktarılan karar türü cevabı ele veriyor (GDPR Md. 9). Şimdi: gerekçe
    genel etiket, metin "cevabın saklanmaz; planı değiştirirse o değişiklik saklanır" diyor. Seçenekler: (a) böyle kalsın
    (karar = denetim izi); (b) karar türü de genel saklansın (ör. INCREASE_CALORIES + "güvenlik" etiketi); (c) HARD_STOP
    kararı belirli süre sonra silinsin.

## Teknik kararlar (bu koşu, aktarımda anlatılacak)
- U14 çapa kuralı: çapa dosyada başlık (`### K-17 ·`, `## 3.4`, `### 🚨 L2.1 ·`) ya da kalın etiket (`**U2 ·`) olmalı;
  `SourceAnchorTests` parametreleri, spesifikasyonu ve koddaki dizgileri tarar.
- Snapshot record + wither kalıbı (`withEnergy`, `withMenstrualLossReported`); TrainingStatus aynı kalıp.
- EA bandı motordan enum olarak çıkar, sayı çıkmaz (U4); LEA sınırı "≤" (ADR metni); `leaFloorKcal` K-107'nin tabanı.
- Güvenlik fonksiyonları Snapshot/Parameters cinsiyet uyuşmazlığında hata fırlatır.
- `org.gradle.warning.mode=fail`: her Gradle deprecation CI'da kırmızı.

## Levent'i bekleyen (acil değil)
- **Design eklentisi** (claude.ai kataloğu, `design-critique`): CLI'dan kurulamıyor, karttan bir tık. Kurulmazsa
  `frontend-design` + kendi eleştiri turum yeterli.
- **Expo MCP girişi:** `expo` eklentisinin MCP sunucusu (`mcp.expo.dev`) Expo hesabıyla giriş ister; EAS derlemesi
  (K-308) gelince gerekecek.
- İsteğe bağlı: RUBİN 5 saniye testi (8 kişiden 2'den fazlası "kadın uygulaması" derse Saha `#0B7F05`).

## Otomasyon (29 Eyl, ADR-019)
- GitHub: yalnız squash, auto-merge açık, birleşen dal silinir · `main` koruması: `Backend (Gradle build)` +
  `Mobile (typecheck, lint, test)` zorunlu, doğrusal geçmiş, force push kapalı
- Dependabot: güvenlik uyarıları + güvenlik düzeltme PR'ları; Actions sürümleri haftalık (`.github/dependabot.yml`)
- Zorunlu CI kontrolleri: Backend · Mobile · **Tooling (git guard)** · action'lar SHA'ya sabit (PR #133)
- Claude Code eklentileri (proje kapsamı): `expo`, `security-guidance`, `jdtls-lsp`, `typescript-lsp`, `pr-review-toolkit`
  (yerel: `brew install jdtls`, `npm i -g typescript-language-server typescript`)
- Vendor skill'ler: `test-driven-development`, `systematic-debugging`, `verification-before-completion`,
  `property-based-testing` · Git koruması: `.claude/hooks/git_guard.py` + `.githooks/commit-msg`
- **Zamanı gelince alınacak skill'ler** (L4, görev `refs`'inde): Postgres/Flyway → K-202 · sözleşme skill'i (spectral +
  oasdiff) → K-201 · RNTL → K-301 · app-store-review + `claude-security` → K-803/K-903

## Gece kurulumu — ne yapıldı (29 Eyl)
- [x] Anayasa ve hafıza: `CLAUDE.md`, `docs/anayasa.md` (U1-U15, V1-V6, K1-K10, G1-G4), `docs/aktarim-protokolu.md`,
      `docs/sozluk.md`, 7 skill, agent hata modları tablosu
- [x] 15 ADR (2 KABUL: yığın, görsel dil · 13 ÖNERİ) + `docs/mimari.md`
- [x] Yol haritası (11 kilometre taşı) + backlog: 95 görev, her birinde neden/kabul kriteri/test/kaynak/öğrenme
- [x] Prototip: 28 ekran, görsel dil C
- [x] Backend: Spring Boot 4.1.1 + Modulith 2.1.1, Java 25, 12 modül, mimari testler (modül sınırı, satır içi sürüm
      yok, parametre kaynağı) · `./gradlew build` yeşil
- [x] Motor parametreleri: 49 parametre, her biri kaynaklı (`data/parameters/`)
- [x] Haftalık check-in spesifikasyonu: 20 satır (`backend/src/test/resources/spec/weekly-checkin.yaml`) ·
      `./gradlew pendingTest` → 20/20 kırmızı (bilerek)
- [x] Mobil: Expo SDK 57 + expo-router (js-tabs), 4 sekme, C token'ları, metin sistemi · `npm run check` yeşil ·
      iOS paketi üretildi
- [x] Sözleşme iskeleti (`contracts/openapi.yaml`) · CI (GitHub Actions) yeşil
- [x] GitHub: private repo `leventtcaan/keel` + Project + 95 issue (`tools/sync_backlog.py`)

## Eklenen bağımlılıklar (K5 — gece kapsamında, Levent'in incelemesine)
- Backend: `spring-boot-starter`, `spring-modulith-starter-core`, test: `spring-boot-starter-test`,
  `spring-modulith-starter-test`, `snakeyaml` (Boot BOM sürümü; ParameterProvenanceTests için)
- Mobil: Expo SDK 57 varsayılan şablonunun paketleri + geliştirme: `eslint`, `eslint-config-expo`, `jest`, `jest-expo`,
  `@types/jest`, `@types/node` (hepsi `npx expo install` ile SDK uyumlu)
- Mobil (M4 Part 3, K5 gerekçesi PR'larda): `expo-camera` ~57.0.6 (K-407 barkod; mikrofonsuz), `react-native-svg` 15.15.4
  (`npx expo install`, SDK 57) + `react-native-body-highlighter` 3.2.0 (K-418 kas haritası; MIT; L1 §4; tek svg kopyası).
  `expo-video` henüz yok: ilk klip denetimden geçince (K-425).

## Açık sorular (Levent'e)
1. **Dil modeli sağlayıcısı** (29 Eyl'de açıklandı): M5'te üç sağlayıcı kendi değerlendirme setimizle ölçülüp seçilecek
   (görev K-511). Rıza ekranı seçilen şirketin adını yazacak.
2. **Güray'ın kurallarının açık kural kitabında yayınlanma izni**
3. **Kaynak bekleyen motor kuralları (U14):** "zor set" hangi RIR, aradan sonra dönüş yükü, yoğun hafta kısa seans

## 29 Eyl sabah turu — sonuç
- L1-L3 araştırmaları yapıldı · **ADR-016** (RUBİN, koyu mod, Liquid Glass sistem katmanı; ADR-014'ün yerine) ·
  **ADR-017** (hareket gösterimi: Levent çeker, ilk/son tekrar) · **ADR-018** (Health'e yazma, içe aktarma) — üçü KABUL
- Backlog 95 → **129 görev**; L3'ün 16 plan hatası onarıldı; M11 eklendi; senkron aracına sıralama doğrulaması eklendi
- Prototip v2 yayınlandı (K-012 ✓): 37 ekran, RUBİN açık/koyu, hareket gösterimi, ayarlar, durum modu, kilit ekranı, "ne değiştirir" simülatörü, karar defteri, paylaşım kartı
- K-011 kapandı: 13 ADR KABUL, prototip ve renk onaylandı (Levent: "her şey kabulüm")

## Levent cevapları (29 Eyl sabah)
- **Bildirim bütçesi: 3 tür** (antrenman öncesi · Pazartesi check-in · 7 gün sessizlik), haftalık adet sınırı yok. Tetikleyiciler (K-512) push değil uygulama içi soru (Levent onayladı).
- ADR'leri okudu; eksik buldu: **hareket gösterimi** → araştırılıyor (L1)
- Renklerin başka bir uygulamadan çalıntı olmaması ve güncel/psikolojik olarak doğru tasarım → araştırılıyor (L2)
- Eksik zorunlu özellikler + yaratıcı öneriler → araştırılıyor (L3)
- **Expo resmî eklentisi: onaylandı** (+ Anthropic Design eklentisi önerildi); Levent "ne yaptığını söyleyerek inisiyatif al" dedi
- VPS: Contabo giriş segmenti, boş · Alan adı: yok, sonra alınır (K-903 geçici `dev.leventtcaan.keel`)

## Gece yakalanıp düzeltilenler (bilgi için)
- **RIR mantık hatası:** "aynı yükte düşen RIR" ilerleme diye yazılmıştı — yanlış; aynı yük ve tekrarda RIR'ın düşmesi
  setin zorlaştığını (gerilemeyi) gösterir. Prototip, backlog ve araştırma düzeltildi (araştırmada düzeltme notuyla).
- **Kalori adımı ↔ BMR tabanı:** prototipteki "60 g karb düşür" örneği Güray'ın 500 kcal minimum adımıyla çelişiyordu;
  kalori tabana yakınken motor hareketi değiştirir (spesifikasyon WC-12).
- **Bakım kalorisi gözlemi 21 → 14 gün:** 14 hem Güray'ı (1-2 hafta) hem literatürün alt sınırını sağlıyor.
- **Expo SDK 57:** `import { Tabs } from 'expo-router'` deprecated → `expo-router/js-tabs` (kurulu sürümde doğrulandı).
  TypeScript 6 `@types/*` paketlerini otomatik dahil etmiyor → `tsconfig.json › types`.

## Kapananlar
- 2026-09-08 → 11 · Faz 1-4 araştırması (Studio'da yapıldı, `arastirma/`'ya taşındı)
- 2026-09-29 · Levent kararları: yığın Spring Boot + Expo · görsel dil C · günlük sayı tutarlılık · program ikisi de ·
  sadece İngilizce · isimsiz ürün sesi · ana ekran Bugün · commit'te AI imzası yok · yalnız Claude Code (AGENTS.md yok)
- 2026-09-29 · M0 gece kurulumu (yukarıda)

## Riskler
- **Türk ürün kapsamı (K-207):** USDA FDC Branded'da Türk markaları yok denecek kadar az ("ülker" 2 ithal kayıt,
  "torku"/"tadım" 0). Barkod Türkiye'de çoğunlukla "bulunamadı"; genel gıda eşlemesi çalışır. Ürün kararı Levent'te
  (soru 10).
- **Dependabot #2 · decode-uri-component ≤0.4.2** (orta, DoS): expo-router → query-string@7 üzerinden uygulamada çalışıyor.
  Düzeltme 0.5.0 yalnız ESM, query-string@7 CJS → override kırar. Etki: bozuk bir derin bağlantı kullanıcının kendi
  uygulamasını dondurabilir. **Bekliyor:** Expo güncellemesi; her SDK yükseltmesinde kontrol. (#1 uuid kapatıldı:
  yalnız derleme zamanı, `uuid.v4()` tampon olmadan, etkilenmiyor.)
- **Retention ↔ geç değer:** Apple sıralaması retention'a bakıyor, değerimiz 4-8 haftada geliyor → U15 ve günlük
  tutarlılık sayısı bunun için var. `arastirma/05-faz4-pazarlama.md` §2
- **Apple Intelligence cihaz payı bilinmiyor** → cihaz üstü katmanın kapsamı belirsiz (ADR-004, K-510)
- **Egzersiz eşleme doğruluğu için benchmark yok** — kendimiz ölçeceğiz
- **Kadın parametrelerinin bir kısmı zayıf kanıtlı** (kas kazanım ×0,5) — `data/parameters` notlarında işaretli
