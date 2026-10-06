---
guncelleme: 2026-10-07
---
# DURUM

> Oturum başında ilk okunan dosya (skill `oturum-baslat`). Oturum sonunda güncellenir (skill `oturum-kapat`).

## Şu an
**Faz 5 Part 1 (araştırma) BİTTİ (7 Eki) → sıradaki Faz 5 Part 2 · ekran envanteri + bütün ekranların artifact prototipi** (`plan/oturum-promptlari/UIUX-part2.md`, kod yok). Sentez `arastirma/06-faz5-yuz.md`; ham `arastirma/ham/M0-M4`. Apify 2,39 / 5 $ (döngü 5 Kas). 13 ADR adayı (06 §7) — prototipi etkileyenler (B4, B7, B11, B13, B8+B10) Part 2 başında Levent'e. Açık: TestFlight düştü mü → `ascAppId` (K-903). Ayrıntı: "Faz 5 ilerleme".
**M9 Part 2 (TestFlight ve cihaz) KAPANDI (7 Eki) → M9 ara · UI/UX revizyonu (ADR-067, Levent: Part 3 ertelendi).** Uygulama gerçek iPhone'da gerçek sunucuyla çalıştı (giriş, HealthKit, kamera, K-618, VoiceOver); deneyim çalışmadı. #408, #409, #410; K-308, K-618 `done`; K-909, K-910 yeni. Sıradaki: **Faz 5 · ürünün yüzü (ADR-068)** — önce araştırma (reklam istihbaratı/Apify, akış kıyası, tutundurma, sosyal döngü), sonra prototip: `plan/oturum-promptlari/UIUX.md`. Apify hazır (7 Eki): `leventcan`, FREE, aylık 5 $ kredi; anahtar `~/.keel-secrets/apify-token` (600, doğrulandı). Mağaza derlemesi 1.0.0 (2) bitti; TestFlight gönderimi EAS ücretsiz sırasında "in queue" (7 Eki ~01:00, Levent expo.dev › submissions). Sonraki oturum: düştü mü bak → `ascAppId` (ASC › App Information › Apple ID) → `eas.json › submit.production.ios`, K-903 kapanır. Takılı kalırsa: `.ipa` indir → Transporter ile Levent yükler.
**M9 Part 1 (Sunucu ayakta) BİTTİ (6 Eki)** — sunucu canlı `https://keel-beta.duckdns.org/health`; K-907 #404, K-901 #405, K-902 #407 (CI → VPS otomatik); ADR-064, ADR-065 (+ Ek 1), ADR-066 (+ Ek 1). Aktarım bekliyor: `docs/aktarim/M9/README.md` 1-3. Sıradaki: M9 Part 2 (`plan/oturum-promptlari/M9-part2.md`).
**M8 KAPANDI (5 Eki, kod)** — Part 2: K-802 #385, K-804 #389, K-810 #391, K-814 #392, K-811 #393, K-813 #394, K-807 #395, K-812 #398 + #400, K-818 #402 (+ #386); ADR-061, ADR-062, ADR-063 (Levent: fatProxy dışa aktarmada, silmede Apple yeniden onayı, kontrast M9'da prototiple). Aktarım bekliyor: `docs/aktarim/M8/README.md` 1-14. Açık: iletişim adresi (Levent). Cihaz işleri (K-308 → K-815, K-618…) ve sırlar (Apple `.p8`, RevenueCat) M9'da. Sıradaki koşu **M9 · Beta** (`plan/oturum-promptlari/M9.md`, `M9-part1.md`).
**M8 Part 1 (Metinler ve envanter) BİTTİ (4 Eki)** — ADR-059 (+ Ek 1), ADR-060; K-801 #375, K-808 #377, K-806 #378, K-809 #379, K-803 #380, #381; yasal sayfalar canlı (`leventtcaan.github.io/keel/`). Disk 20 GB (Docker budandı). Aktarım bekliyor: `docs/aktarim/M8/README.md` 1-5. Açık: iletişim adresi (Levent). Sıradaki: M8 Part 2 (`plan/oturum-promptlari/M8-part2.md`).
**M7 KAPANDI (4 Eki, kod)** — Part 2: K-705 #368, K-702 #369, K-706 #372, K-707 #373 (auto-merge); ADR-056 Ek 1, ADR-057, ADR-058 (105-107 Levent: zorunlu paywall, iOS'ta duraklatma yok, deneme hatırlatması). Cihaz/sandbox ve mağaza kurulumu Levent'te (K-308, RevenueCat, ASC). Aktarım bekliyor: M7 (`docs/aktarim/M7/README.md` 1-6). **Disk 1,5 GB** → Levent. Sıradaki koşu **M8 · Uyum ve yasal** (`plan/oturum-promptlari/M8.md`, `M8-part1.md`).
**M7 Part 1 (Yetki sunucuda) BİTTİ (4 Eki)** — ADR-056; K-701 #364, K-703 #366 birleşti; K-704 (REST tazeleme, RevenueCat hesabı sonrası) ve K-705 (durum ucu, Part 2) açıldı; para/mağaza hazır değil (ADR-012 Ek 1). Aktarım bekliyor: `docs/aktarim/M7/README.md` 1-2. Sıradaki: M7 Part 2 (`plan/oturum-promptlari/M7-part2.md`).
**M6 KAPANDI (4 Eki, kod)** — Part 4: K-615 #354, K-616 #356, K-609 #357, K-612 #358, ADR-055 metinleri #361, K-617 #362; ADR-053/054/055; sorular 87-104 cevaplı (ADR-055). Açık: K-618 (fotoğraf yedekten hariç, K-308 sonrası). Aktarım bekliyor: M6 (`docs/aktarim/M6/README.md` 1-19). **Disk 1,2 GB** (Docker 17 GB + başka uygulamaların önbellekleri — Levent). Sıradaki koşu **M7 · Abonelik** (`plan/oturum-promptlari/M7.md`, `M7-part1.md`).
**M6 Part 3 (Efor ve fotoğraf) BİTTİ (4 Eki)** — K-604 #347, K-614 #349 (K-601'den bölündü), K-601 #350, K-602 #351 birleşti; aktarım bekliyor (`docs/aktarim/M6/README.md` 11-14); sorular 97-101 (97 ve 101 veri kararı). Simülatör turu yok (disk 2,3 GB, sunucu yok). Sıradaki: M6 Part 4 (`plan/oturum-promptlari/M6-part4.md`).
**M6 Part 2 (Projeksiyon, sağlık kapılı) BİTTİ (4 Eki)** — ADR-050 (sağlık kapısı, Levent KABUL), ADR-051, ADR-052; K-605 #342, K-607 #344, K-613 #345 (K-606'dan bölündü), K-606 #346 birleşti; aktarım bekliyor (`docs/aktarim/M6/README.md` 7-10); sorular 94-96. **Repo public** (CI dakikası bitti, Levent'in kararı). Sıradaki: M6 Part 3 (`plan/oturum-promptlari/M6-part3.md`).
**M6 Part 1 (Geçmiş ve sinyaller) BİTTİ (4 Eki)** — K-535, K-534, K-608, K-603, K-611, K-610 birleşti (#333-#341); aktarım bekliyor (`docs/aktarim/M6/README.md` 1-6); sorular 87-93; Part 2 başında sağlık kapısı soruları. Sıradaki: M6 Part 2 (`plan/oturum-promptlari/M6-part2.md`).
**M5 KAPANDI (3 Eki, kod)** — Part 4: K-514 #327, K-408 #328, K-515 #329 (cihazsız kısım), spike ADR-047/048; cihaz adımları (K-308 → K-510, K-515, K-426) Levent'te. Sıradaki koşu **M6** (`plan/oturum-promptlari/M6.md`, `M6-part1.md`). Aktarım bekliyor: M5 (`docs/aktarim/M5/README.md` 1-35). 73, 78-85 → ADR-045 (hepsi önerilen; ADR-044 KABUL); K-308 yok → K-510/K-515 kod + ADR taslağı; disk: Levent Docker'ı temizleyecek (soru 80), o zamana kadar DB testi CI'da, simülatör beklemede.
**M5 Part 3 (Koç yüzü + sağlayıcı) BİTTİ (3 Eki)** — ADR-043 (koç sınıflandırır, cümle yazmaz) + 11 görev birleşti (#314-#325); aktarım bekliyor (`docs/aktarim/M5/README.md` 20-30). Simülatör turu **disk yüzünden ertelendi** (soru 80). Sorular 78-85.
**M5 Part 2 (Koç altyapısı) BİTTİ (3 Eki)** — ADR-041 işleri + K-503, K-505, K-506, K-508, K-504 birleşti; yalnız sahte sağlayıcı; aktarım bekliyor (`docs/aktarim/M5/README.md` 10-19); sorular 74-77, **76 K-509'dan önce**.
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

## ▶ DEVAM NOKTASI (3 Eki — M5 Part 3 BİTTİ; session açık, aktarım bekliyor)
Bu session'da sıradaki iş **Part 3 aktarımı** (`docs/aktarim/M5/README.md` 20-30; Part 1-2'nin 1-19'u da bekliyor). Sonra **M5 Part 4**
(`plan/oturum-promptlari/M5-part4.md`, Part 3 sonunda güncellendi): önce disk (soru 80), sorular 78-85, ertelenen simülatör turu.

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
| 2 · Koç altyapısı | ADR-041 işleri (K-430, K-523, K-525, K-526, K-527, K-524) · K-503, K-505, K-506, K-504, K-508 | ✅ bitti (3 Eki) — aktarım bekliyor; sorular 74-77 |
| 3 · Koç yüzü + sağlayıcı | ADR-043 işleri (K-529, K-530, K-531, K-532) · K-522, K-509, K-507, K-517, K-511, K-528, K-521 | ✅ bitti (3 Eki) — aktarım bekliyor; sorular 78-85 |
| 4 · Fotoğraf, cihaz, teslim | K-514, K-408, K-510, K-515 · M5 çıkışı · M6 prompt'ları | ✅ bitti (3 Eki) — aktarım bekliyor; cihaz adımları Levent'te |

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
| K-430 sıçrama sınırı (`load_jump_max_steps` 2, `urun`; Java + TS + ortak vakalar; `SessionProgress` bağlı) | → Part 2'de bitti (ADR-041 #55, aşağıda) | #273 | `M5/ADR-037-isleri.md` |
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

**Part 2 başı (3 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#270-#292 birleşik; açık PR yalnız #273; worktree `../keel-k430` +
kalıcı `../keel-main`; devam dosyası yok). Sağlayıcı kapısı ADR-041 ile cevaplı (yalnız sahte sağlayıcı). Disk 5,3 GB. Dependabot uyarıları
#2, #3 (bilinen). Ana checkout ayrık HEAD `origin/main`.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-430 bitişi (ADR-041 #55): `TooFar(kg)`; her set ağır yükte Epley'le tükenişe kadar aralık altı + planlı RIR'a eşdeğer olunca sıçra (`E1rm.repsToFailureAt`); sınır yalnız `LoadSteps.wholeLoad` (bar/dambıl/makine/kablo) | ✅ birleşti; CI'da RED önce (2 kez); inceleme: vücut ağırlıklı hareket eklenen yükle kıyaslanıyordu, setin kendi RIR'ı ters etki → düzeltildi; ulaşılamayan çıkış → **soru 73**; test analizi: plakalı, 5 kg adım, kesirli, lb vakaları; mutasyon 10/10 + 8/8 + TS 1/1 | #273 | `M5/ADR-037-isleri.md` › K-430 |
| K-523 üründe kişi adı yok: API kaynağı yalnız `{tag}` (`SourceView`; yol karar kaydında), sözleşme + tipler; `GURAY_*` → `*_SOURCE`, yorumlar nötr; `personNames` listesi (kopya, sözleşme, telefon kodu + paketlenen veri, backend kodu); mimari bekçi `ResearchPathStaysOnServerTests` | ✅ birleşti; CI'da RED önce (4); inceleme: **worktree `contracts/node_modules` sembolik bağı commit'e girmişti** (`.gitignore` sondaki `/` bağı yakalamıyor → düzeltildi, `.git/info/exclude`'a da eklendi), desen camelCase'i kaçırıyordu, mimari bekçi eksikti, `workout.json` notlarında adlar; mutasyon 3/3 | #299 | `M5/K-523.md` |
| K-525 "hâlâ öyle mi" 3 haftada bir: V28 `still_so_on`, son "evet" hesap düzeyinde (`max`), dışa aktarmada `stillSoOn` | ✅ birleşti; CI'da RED önce (4); inceleme: yeniden beyan cevabı düşürüyordu → hesap düzeyi; yalnız açık "evet" yazar, doğru satır, tekrar gönderim, durumsuz "evet", dışa aktarma biçimi testli; mutasyon 4/4 | #300 | `M5/K-525.md` |
| K-527 kaçan seans programın günlerinde (`TrainingStatusReader.programDays`; `since` günlerin kaynağından) | ⏳ auto-merge; CI'da RED önce (2); inceleme: profil değişimi programın sayacını sıfırlıyordu, test haftanın gününe bağlıydı → düzeltildi; tutarlılık/ilk haftalar profilin günlerini sayıyor → **soru 74** | #301 | `M5/K-527.md` |
| K-526 uyum sayıları: `Consistency.windowCount` (oran ondan), `StoredSnapshot.Answered.adherenceDone/Planned` (oranla çelişen sayı reddedilir), `/basis` `adherenceCount`, telefon "16 of 19 planned actions" | ✅ birleşti; CI'da RED önce (DB + mobil); inceleme hata yok, eski karar testi eklendi; mutasyon 6/6 + 1/1 | #302 | `M5/K-526.md` |
| K-524 literatür (`arastirma/ham/H9-donus-minimum-doz.md`): dönüş yükü **uygulanmaz** (test edilmiş oran yok; G7 K-72 kural ama sayısız → **soru 75**); yoğun hafta minimum dozu `BusyWeekDose` (1 seans, egzersiz başına 1 set, yük aynı; 60+ 2×2 düşük güven), bağlanması **K-528** | ✅ birleşti; inceleme: atıflar Europe PMC'de doğrulandı; Graves 1988 ikincil → işaretlendi; ADR-038 K-72 çelişkisini açık yazıyor; mutasyon 4/4 | #304 | `M5/K-524.md` |
| K-503 LLM portu: `coach.LanguageModel` (paket içi), tek yol `CoachModel` → `EgressGate.sendToAi` + `ConsentGate.requireAi` (rıza = çağrılan sağlayıcı), `keel.coach` yapılandırması, yalnız `fake` (+ ADR-042) | ✅ birleşti; CI'da RED önce; inceleme: sınır kuralı 4 yolla atlatılabiliyordu → genişletildi; rıza–sağlayıcı bağı yoktu → eklendi; mutasyon 5/5 | #303 | `M5/K-503.md` |
| K-505 karar anlatımı + itiraz: `POST /v1/coach/messages`, `decision.CallReader` (`tellable`), `ReplyCheck` (şema, normalleştirme, sayılar, tarih, taviz, çelişki, sayı sözcüğü, yasaklı ifade), her cevapta karar; amaç → rızanın veri türü (`sendToAi(…, dataType)`) | ✅ birleşti; inceleme **5 bulgu**: döngü sorusu bekleyen karar modele gidiyordu (**V4**) → `tellable`; ters yön / "no change" geçiyordu → çelişki kalıpları; ’ kesme, tam genişlik rakam, "eighteen percent", NBSP → normalleştirme; mutasyon 9+1+8 | #305 | `M5/K-505.md` |
| K-506 hayır diyen koç: 32 senaryo (dalkavuk düşer, sadık geçer) + API'de karar değişmez; `heldOut` 14 senaryo sınırı ölçer | ✅ birleşti; test analizi: ince dalkavukluk 14/14 geçiyor, sadık 14/14 düşüyor → **soru 76** | #306 | `M5/K-506.md` |
| K-508 günlük kota: V29 `subscription.daily_use`, `Quota.take/giveBack` (kullanıcının günü), aşınca koç motorun sözüyle; `subscription → profile` (ADR-015 notu) | ✅ birleşti; CI'da RED önce (9); inceleme: SQL gerçek PostgreSQL'de doğrulandı; metin yargılıyordu, geri verme yanlış güne düşebilirdi, rızasız kullanıcı kota mesajı alıyordu → düzeltildi; `quotaWords`; 10 test boşluğu | #307 | `M5/K-508.md` |
| K-504 serbest metinden öğün taslağı: `POST /v1/meals/parse`, `{"food","quantity","unit"}` (kalori alanı → atılır; ölçü grama çevrilmez), `nutrition.FoodFinder`, tam sözcük kesinliği, sırayla yedek, HEALTH_DATA + AI rızası | ✅ birleşti; inceleme **6 bulgu** (paylaşılan DB'de fikstür çakışması, 2+ ondalık, model porsiyonu grama çeviriyordu — ADR-004, yedekleri tek sözcük dolduruyordu, "egg"→"Eggnog", sağlık rızası) → düzeltildi; mutasyon 7/7 | #308 | `M5/K-504.md` |


**Part 2 ÇIKIŞ (3 Eki):**
- **Birleşen:** K-430 #273 · K-523 #299 · K-525 #300 · K-527 #301 · K-526 #302 · K-503 #303 · K-524 #304 · K-505 #305 · K-506 #306 · K-508 #307 ·
  K-504 #308. Açık PR yok. Worktree yalnız kalıcı `../keel-main`. Ana checkout ayrık HEAD `origin/main` (6ddb324), temiz.
- **Kontrol çıktısı (3 Eki, `main` 6ddb324):** backend saf testler **1160/1160** (DB testleri CI'da; `main` CI yeşil); mobil `npm run check`
  91 suite **1540/1540**. Disk 6,2 GB.
- **Kararlar:** ADR-042 (LLM portu, tek kapı, sahte sağlayıcı); ADR-038 #7 güncellendi (dönüş yükü uygulanmaz — K-72 çelişkisi açık, soru 75;
  minimum doz `BusyWeekDose`); ADR-015 notu (`subscription → profile`).
- **Backlog:** K-430, K-523..K-527, K-503..K-506, K-508 `done`; **K-528** (yoğun hafta dozu programda) yeni `todo`; sync ✅.
- **Part 3'ün bilmesi gerekenler:**
  - Koç: `POST /v1/coach/messages` → `CoachAnswer {mode, text?, copyKey?, call?}`; `POST /v1/meals/parse` → `MealDraft {mode, items[{food,
    amount, confident, candidates}]}`. Her LLM çağrısı `CoachModel.ask(account, Purpose, …)` → `EgressGate.sendToAi(account, provider,
    dataType, …)`; amaç → rızanın veri türü `keel.coach.data-types` (V2). Önce rıza (`CoachModel.mayAsk`), sonra kota (`Quota.take` gün
    döner, hata olursa `giveBack(…, gün)`), sonra model.
  - Model cevabı yalnız denetimden geçerse: `ReplyCheck` (anlatım) / `MealReplyCheck` (öğün); sınırı `pushback-scenarios.json › heldOut`
    (14/14 ince dalkavukluk geçiyor, 14/14 sadık düşüyor) → **soru 76** K-509'dan önce.
  - Anlatılamayan karar: `decision.CallFacts.tellable` (güvenlik etiketi, döngü sorusu — V4 —, güvenlik ağı) → modele hiç gitmez.
  - Sahte model: `FakeLanguageModel.answer/fail/forget/requests` (testler, K-506 seti). Gerçek sağlayıcı yok (ADR-041); K-511 belgesel.
  - Paylaşılan test veritabanı: besin fikstürleri benzersiz adlarla + temizlik (`MealParseApiTests` dersi); 32 senaryoluk API testi günü
    her senaryoda sıfırlar (kota).
  - Worktree dersi: `contracts/node_modules` sembolik bağı `.gitignore`'un sondaki `/`'ı yüzünden commit'e girmişti → düzeltildi,
    `.git/info/exclude`'a da eklendi. Squash birleşmeden sonra yığılmış dallar `git rebase --onto origin/main <eski taban>` ile taşınır.
- **Yeni sorular:** 74 (tutarlılık programın günleri mi), 75 (dönüş yükü / K-72), 76 (koçun sesi), 77 (kota geçmişi, öğün metni kotası).

**Part 3 başı (3 Eki):** senkron tamam — Part 2 ÇIKIŞ git ile tutarlı (#273, #299-#308 birleşik; açık PR yok; worktree yalnız
`../keel-main`; devam dosyası yok). Disk 5,6 GB. Dependabot uyarıları #2, #3 (bilinen). Ana checkout ayrık HEAD (6ddb324).
**74-77 → ADR-043** (dördü önerilen): 74 programın günleri (K-530), 75 ≥3 hafta molada bir adım geri (K-531), **76 (a) koç
sınıflandırır** — model yalnız `{topic, rule}`, söz `en.json`'dan (K-529, K-509'dan önce; K-522'nin kural cümlelerini kullanır),
**K1 onayı:** `ReplyCheck`/`ReplyGuards`/`guards.json` ve testleri silinir, 32 senaryo beklenen konu setine döner; 77 eski sayaçlar
gece silinir + öğün ortak kotada (K-532). K-517 artık her zaman şablon (model yok).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-522 kural cümleleri: `decision.rule.<kural>` (60), `reasonLines` → `sentenceKey` (baştaki de; güvenlik kararında yok), `RuleSentencesTests` (yansıma, iki yön) | ✅ birleşti; RED 2+4; inceleme **5 bulgu** (cümle–kural uyuşmazlığı: `cut_step` tek yön, `toward_goal` antrenman demiyor, `bulk_ceiling` ters, `plan_missed` "çoğu", `stall_window` "düz") → düzeltildi; test analizi 3 öneri işlendi; mutasyon mobil 5/5 (+kontrol), sunucu 1/1 | #314 | `M5/K-522.md` |
| K-529 koç sınıflandırır: `Topic` (11), `TopicReply` (tam şema, kural kararın kendi), modele yalnız tür + kurallar, `CoachAnswer` `topic`+`rule`, 54 itiraz beklenen konuyla; ReplyCheck/ReplyGuards/CallNumbers/guards.json silindi (K1 onaylı) | ⏳ auto-merge; RED 6; inceleme: tırnaklı `"null"` cevabı düşürürdü, HEALTH'te "karar duruyor" denmemeli (sözleşme + ADR), eski aktarım notları; test analizi: sözleşme konu listesi testi, `facts` tüm türlerde; mutasyon 6/6 (+1 eşdeğer) + 3/3 | #316 | `M5/K-529.md` |
| K-532 eski kota sayaçları gece silinir (arka plan ajanı) | ✅ birleşti | #315 | `M5/K-532.md` |
| K-509 (1/2) koç sohbeti: günün çipleri telefonda cevaplanır (model yok), mesaj → konu + kural + "karar duruyor", karar kartı → gerekçe (uygulama yok), DETERMINISTIC işaretli | ✅ birleşti; RED 23; inceleme: okunamayan karar "henüz yok" deniyordu, HEALTH'ten sonra kart görünüyordu (U6), swap çipi olmayan özelliği anlatıyordu + günsüz açıyordu, klavye kutuyu örtüyordu → düzeltildi; mutasyon 10/10 | #317 | (K-509 sonunda) |
| K-509 (2/2) sohbette öğün: üç çip (öğün çipi hep), `/v1/meals/parse` taslağı, tek dokunuş, devir **bellek içi** (`food/handoff.ts`, V3) → öğün ekranı | ✅ birleşti; RED 11; inceleme: **koçun ölçüsü ("bowl") porsiyon değilse kayıt kuyruğa girip sunucuda reddediliyordu** → tahmin geçmeden kaydetme yok; mesaj kimliği; eşleşmeyen besin öğünü kilitlemesin; mutasyon 9/9 + 3/4 (1 eşdeğer) | #319 | (K-509 sonunda) |
| K-530 planlanan seans programdan (arka plan ajanı) | ✅ birleşti; inceleme notları ajanın; **sorular 78-79** | #318 | `M5/K-530.md` |
| K-517 haftalık koç notu (telefonda şablon: karar + baştaki kural + tek odak; sohbetin ilk mesajı) | ✅ birleşti; RED 18; inceleme: **güvenlik kararı telde CHANGE_PHASE→BULK, not "building" diyordu** (U6) → duraklamanın odağı; "hedefinden 250 eksik" uygulanmış kararda çift açık (U1) → değişimin kendisi; mutasyon 6/6 + 2/2 | #320 | `M5/K-517.md` |
| K-511 sağlayıcı: ADR-044 (ÖNERİ) + `arastirma/ham/H10` + ölçüm betiği `tools/llm_eval.py` (CI testli) + K-533 (M10, gerçek ölçüm) | ✅ birleşti; inceleme: betik sunucunun düşürdüğü öğün cevaplarını kabul ediyordu, tek ret koşuyu düşürüyordu, çıktı sınırı → düzeltildi; mutasyon 8/8 + 7/7 | #321 | `M5/K-511.md` |
| K-531 uzun moladan dönüş: `engine/ReturnLoad`, `LoadSteps.lighter`, okuma anında; mola **hesabın** bugünden önceki son seansından (`TrainingLog.lastSessionBefore`), bugün yazılan hedef geri alınmaz; `Program.backAfterBreak` + not | ✅ birleşti; inceleme: **molayı program günü başına ölçüyordum** (yoğun haftada 2/4 gün yapana "dönüş" derdi, aynı hareket iki kez geri) → ADR-043'teki gibi hesabın kaydı; `knows` dalı testsizdi; CI: kendi beklentim yanlıştı (5'lik çiftle 55 yapılamaz → 50); mutasyon 4/4 + 3/3 | #322 | `M5/K-531.md` |
| K-528 yoğun hafta minimum dozu: `/v1/state` → `busyDose` (yalnız BUSY; dışa aktarmada yok), Antrenman sekmesinde öneri notu | ✅ birleşti; inceleme: doz notu "dinlenme haftası"nın üstünde onunla çelişebiliyordu → en sona, dinlenme haftasında yok; "her durum" mutantı → telefondaki gereksiz denetim kalktı | #323 | `M5/K-528.md` |
| K-507 gün içi öneriler: kendi öğünlerinden, besin başına en sık miktar, veritabanından aralık, "sığar" = üst uç ≤ kalanın ortası, kaçınılan **alt dizgi** (alerji geniş), Beslenme sekmesi + öğün devri | ✅ birleşti; mutasyon "tam sözcük" yaşadı → alt dizgi (güvenlik); inceleme: **tarif kaçınılanı atlatıyordu** (malzemeler okunur), tarif devrinde gram, dolu günde boşuna tahmin → düzeltildi | #324 | `M5/K-507.md` |
| K-521 ilk 8 hafta telefonda: `readsRisk`/`training` (sunucu), açılış günleri **yalnız telefonda**, "7 gün açılmadı" (`urun`), Bugün kartı, tek risk mesajı | ✅ birleşti; inceleme: **duraklatılmış haftada telefon yine risk diyordu** (ADR-040 #3) → `readsRisk` false; antrenmansıza "seans" → kendi metni; çıkışta silme testi | #325 | `M5/K-521.md` |


**Part 3 ÇIKIŞ (3 Eki):**
- **Birleşen:** K-522 #314 · K-529 #316 · K-532 #315 · K-509 #317/#319 · K-530 #318 · K-517 #320 · K-511 #321 (+ ADR-044 `main`'de) · K-528 #323 ·
  K-531 #322 · K-507 #324 · K-521 #325. Açık PR yok. Worktree yalnız kalıcı `../keel-main`. Ana checkout ayrık HEAD `origin/main` (b95119f).
- **Kontrol çıktısı (3 Eki, `main` b95119f):** mobil `npm run check` 96 suite **1636/1636**; sunucu saf testler **1359/1359** (408 DB testi yerelde
  Docker yok → CI; `main` CI yeşil); `tools/test_llm_eval.py` **19/19**.
- **Kararlar:** ADR-043 (74-77 + K1: koç sınıflandırır; ReplyCheck/ReplyGuards/CallNumbers/guards.json silindi), ADR-044 (ÖNERİ: sağlayıcı
  belgesel karşılaştırma, rıza metni taslağı), ADR-038 #7 notu (dönüş yükü K-531'le uygulandı).
- **Backlog:** 11 görev `done`; **K-533** (M10, sağlayıcı gerçek ölçümü) yeni `todo`; sync ✅.
- **Ertelenen:** **simülatör turu** (K-522, K-509, K-517, K-507, K-521, K-528, K-531 ekranları) — disk (~3,6 GB) simülatörü kaldırmıyor; Part 4 başında.
- **Part 4'ün bilmesi gerekenler:**
  - Koç: model yalnız `{topic, rule}` (`coach/TopicReply`, `Topic`); söz telefonda (`src/coach/conversation.ts › linesOf`); HEALTH/OFF_TOPIC kartsız.
    Öğün fotoğrafı (K-514) da yapılandırılmış çıktıyla gelmeli (K-504'ün `MealReplyCheck` deseni) ve taslağı **bellek içi devirle** (`src/food/handoff.ts`)
    öğün ekranına vermeli; koçtan gelen öğün sunucunun tahmini geçmeden kaydedilmez (`meal.tsx › mustCheck`).
  - Modele giden en az veri: kararın türü + kuralları (sayı/tarih yok) — fotoğrafta da "gereken en az".
  - Sağlayıcı: `tools/llm_eval.py` (yayında, K-533); ZDR hiçbir sağlayıcıda varsayılan değil (ADR-044).
  - Disk: Docker sanal diski 17 GB; yerelde DB testi yok, `./gradlew test` saf testleri koşar (DB testleri düşer — sayımı ayır). **Native
    derleme (K-510, K-515) 3-5 GB ister.**
  - Arka plan ajanları Docker açabiliyor → ajan talimatına "Docker/Gradle DB testi yerelde koşma" yaz.
- **Yeni sorular:** 81-85 (aşağıda).

**Part 4 başı (3 Eki):** senkron tamam — Part 3 ÇIKIŞ git ile tutarlı (#314-#325 birleşik; açık PR yok; worktree yalnız `../keel-main`;
devam dosyası yok). Ana checkout ayrık HEAD 195dd98'e çekildi (bir commit gerideydi). Disk **5,9 GB**; Docker çalışıyor (sanal disk ~17 GB).
Dependabot uyarıları 3 (braces, node-forge, decode-uri-component — bilinen geçişli). **73, 78-85 → ADR-045** (hepsi önerilen): yeni görevler
**K-534** (seyrek rafta tekrar tavanı, M6) ve **K-535** (geçmiş haftalar o haftanın program sayısıyla, M6); ADR-044 KABUL; K-509 kabulü "en çok 3
çip". **K-308 yok** → K-510 karşılaştırma + ADR taslağı, K-515 kod + test, cihaz adımları DURUM'a. **Disk:** Levent Docker'ı temizleyecek;
o zamana kadar DB testleri CI'da, simülatör turu (Part 3'ten ertelenen) yer açılınca.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-514 öğün fotoğrafı backend'i: `POST /v1/meals/photo` (base64), boyut başlıktan (>1024 → 400), sunucu yalnız piksellerden JPEG yazar (metadata gitmez), `PHOTO_MEAL` → "meal photo" rızası, `PHOTO_ANALYSIS` kotası, model yalnız göz kararı gram → `ESTIMATED` (ADR-046) | ✅ birleşti; RED 11; inceleme: **ham fotoğraf ImageIO'nun dosya önbelleğiyle diske iniyordu** (V1/V3) → bellek; rızasız fotoğraf çözülüyordu → sıra rıza → çözme → kota; başlık-önce denetimini ısıran test yoktu → PNG bombası + ayrılan bayt ölçümü; CI'da tek kırmızı: kısmi AI rızası API'den verilemiyor → test DB'ye yazar; mutasyon 16/16 | #327 | `M5/K-514.md` |
| K-408 öğün fotoğrafı telefonda: Food › "Log from a photo" → AI rızası önce (yoksa kamera açılmaz) → kamera/galeri (`expo-image-picker`) → çizilmiş boyuttan ≤1024 + JPEG'e yeniden yazma (`expo-image-manipulator`) → telefonda boyut denetimi → taslak (`DraftPicks`, koçtan çıkarıldı) → bellek içi devir `'photo'` → öğün ekranında gram sorusunun **nedeni** | ✅ birleşti; RED 8 + 10 + 9; inceleme: **`app.json`'daki plugin kamera izin metnini eziyordu** (config mod sırası) → `app.config.ts` + `en.json`; `photoTools` testsizdi (V1'in yeri) → 8 test; seçici boyutu 0 → çıkmaz → çizilmiş boyuttan; `fitWithin` %12 1023 → tam 1024; mutasyon 19/19 + kontrol | #328 | `M5/K-408.md` |
| K-510 Apple FM spike → **ADR-047** (kendi ince Expo modülü: Vision OCR + FM erişilebilirliği Apple'ın 3 nedeniyle + koç sınıflandırması cihazda; iOS 27 görüntü kapsam dışı; `expo-ai` tetikleyici) + `arastirma/ham/H11` | ◐ karar + araştırma; **cihaz denemesi bekliyor** (K-308) — kod yazılmadı | (main) | `M5/K-510.md` |
| K-515 kilit ekranı → **ADR-048** (`expo-widgets` 57; sayısız varsayılan kodda; App Intents SDK 58 stabil olunca) + `widgets/lockScreen.ts` (etiket + sonraki değerlendirme, sayı/başlık yok; güvenlik genel; sözcüklenemeyen → "ready") | ✅ birleşti; RED 6; inceleme ≥80 yok (savunma: güvenlik etiketi telefonda sabit); mutasyon 6/6 + kontrol; **widget kurulumu cihaz adımı**; soru 86 → ADR-048 #5, K-536 | #329 | `M5/K-515.md` |


**Part 4 ÇIKIŞ = M5 ÇIKIŞ (3 Eki):**
- **Birleşen (Part 4):** K-514 #327 · K-408 #328 · K-515 (cihazsız kısmı) #329. `main`'e doğrudan: ADR-045 (73, 78-85), ADR-046 (öğün
  fotoğrafı yolu), ADR-047 (cihaz üstü katman), ADR-048 (kilit ekranı), `arastirma/ham/H11`, M6 prompt'ları (`plan/oturum-promptlari/M6*.md`).
  Açık PR yok. Worktree yalnız kalıcı `../keel-main`. Ana checkout ayrık HEAD `origin/main`, temiz. K-536 (kilitten kilo intent'i, M9) yeni.
- **Kontrol çıktısı (3 Eki):** mobil `npm run check` 100 suite **1680/1680**; sunucu saf testler **1390/1390** (419 DB testi yerelde Docker yok →
  CI; #327 CI'da DB dahil yeşil).
- **M5 çıkış kriterleri (`plan/yol-haritasi.md › M5`), kanıtla:**
  | Kriter | Durum | Kanıt |
  |---|---|---|
  | Pazartesi check-in | ✅ | K-501 #276 |
  | Karar kartı varyantları + gerekçe | ✅ | K-502 #291/#292, K-519 #286, K-522 #314 |
  | LLM portu ve yapılandırılmış çıktı | ✅ | K-503 #303, K-529 #316 (model yalnız `{topic, rule}`), K-504 #308, K-514 #327 |
  | Karar anlatımı | ✅ | K-505 #305 → K-529 #316 (söz `en.json`'dan), K-509 #317/#319 |
  | Soru bütçesi | ✅ | K-512 #283/#285 (2/hafta), K-513 #290 (riskte 5) |
  | Gün içi öneriler | ✅ | K-507 #324 |
  | Kota | ✅ | K-508 #307, K-532 #315; fotoğraf kotası K-514 |
  | "Hayır diyen koç" seti CI'da | ✅ | K-506 #306 → K-529 (54 itiraz, beklenen konu) |
  | Apple FM spike | ◐ | ADR-047 + H11; **cihaz denemesi** K-308 sonrası |
  | Dil modeli sağlayıcısı seçimi (ölçümle) | ◐ | ADR-044 KABUL (belgesel, ADR-045 #81), `tools/llm_eval.py` #321; **gerçek ölçüm K-533 (yayında, ADR-041)** |
  | Proaktif tetikleyiciler | ✅ | K-512 #283/#285, K-520 #287 |
  | İlk 8 hafta + 5. hafta risk | ✅ | K-513 #289/#290, K-521 #325 |
  | Kilit ekranı karar widget'ı | ◐ | ADR-048 + `lockScreenCall` #329; **widget kurulumu + görme cihazda** |
  | Durum modu | ✅ | K-516 #279/#282, K-518 #284 |
  | Haftalık koç notu | ✅ | K-517 #320 |
  | (ek) Öğün fotoğrafı | ✅ | K-514 #327, K-408 #328 |
- **Eksikler (DURUM'da, kod değil):** K-308 cihaz derlemesi (Levent) → K-510 deneme, K-515 widget, K-426 Live Activity, HealthKit görme; K-533
  gerçek sağlayıcı ölçümü (yayında); AI rıza ekranı yok (sağlayıcı seçilince); simülatör turu (Part 3'ten ertelenen + K-408 ekranı) disk yüzünden
  yapılmadı (soru 80: Docker hâlâ 18,2 GB, boş 3,5 GB).
- **Backlog:** K-514, K-408 `done`; K-510, K-515 `doing` (cihaz adımı); K-534, K-535 (M6) yeni; sync ✅.
- **M6'nın bilmesi gerekenler:**
  - Öğün fotoğrafı: `POST /v1/meals/photo` → `MealDraft` (K-504'ün şekli, miktar `ESTIMATED` gram); sunucu fotoğrafı **bellekte** okur, yalnız
    piksellerden JPEG yazar (`coach/MealPhoto`); telefon `food/photo.ts` + `photoTools.ts`. **İlerleme fotoğrafının (K-601) bu yolla hiçbir ilgisi yok:**
    o hiç ağa gitmez (V1).
  - `food/DraftPicks.tsx` paylaşılan taslak seçicisi (koç + fotoğraf); devir `handOffMeal(items, from)`.
  - İzin metinleri yalnız `app.config.ts` + `en.json` (`app.json`'a plugin koyma: sonra çalışır, metni ezer).
  - Widget içeriği `widgets/lockScreen.ts`; `expo-widgets` kurulumu cihaz adımında (App Group).
  - Koç sınıflandırmasını cihazda yapma yönü ADR-047 #3 (cihaz adımı).
  - Disk: yerelde `DOCKER_HOST=tcp://127.0.0.1:1 ./gradlew test` saf testleri hızlı koşar, DB testleri Docker'sız düşer (sayımı ayır).
- **Sorular:** 86 → ADR-048 #5 (önce buton, sonra intent). Açık: 57 (rıza metni hukuki bakış, yayından önce).

## Faz 5 · ürünün yüzü ilerleme (ADR-067, ADR-068 — tek doğru kaynak)
Prompt'lar: `plan/oturum-promptlari/UIUX.md` (Part 1, araştırma) · `UIUX-part2.md` (Part 2, envanter + prototip).

**Part 1 başı (7 Eki):** senkron — yerel checkout `3507e91`'de kalmıştı, `origin/main` `b1e099c`'ye alındı (ayrık HEAD); açık PR yok; worktree yalnız
`../keel-main`; Dependabot aynı 3 geçişli uyarı; disk 14 GB. M9 Part 2 ÇIKIŞ git ile tutarlı.

| Hat | Dosya | Durum | Öne çıkan |
|---|---|---|---|
| 0 Rakip listesi | `ham/M0-rakip-listesi.md` | ✅ Levent onayladı (olduğu gibi) | Apple top grossing H&F (US/GB/AU/CA, 6 Eki) → 14 çekirdek + komşular; GLP-1 kapsam dışı |
| R1 Reklam (Meta, ABD) | `ham/M1-reklam-istihbarati.md` | ✅ | Aktör `apify/facebook-ads-scraper` (resmî, 0,0058 $/reklam); 13 sayfa toplam + ~420 reklam + 60 videonun ilk saniyeleri (Levent izni; videolar silindi). En çok para harcanan acı "tahmin etmek"; gerekçe gösteren yok. Fitbod 810 / Cal AI 639 aktif reklam; Hevy, Lose It!, Bevel 0. MacroFactor'a hukuk bürosu soruşturması (deneme → yıllık ücret) |
| R2 Akış | `ham/M2-akis-kiyasi.md` | ✅ (alt ajan) | 9/12: sorular → "plan hazırlanıyor" → somut sayı → paywall; bizde "Wait". Today ~105 kelime vs rakip 25-50. Karar ekranı şablonu Runna. Beslenme/koç açık tema |
| R3 Tutundurma | `ham/M3-tutundurma.md` | ✅ (alt ajan) | Haftalık + onarılabilir seri (U7 lehine); geri döneni ödüllendirmek +%27; ~%20 okunur. K5 yıllık kayıp kıyası geçersiz (06 §8) |
| R4 Sosyal | `ham/M4-sosyal-dongu.md` | ✅ (alt ajan) | Hevy Stories +%12 kurulum; kartta kilo/yağ/foto yok; karar kartının rakipte karşılığı yok. TikTok Creative Center girişsiz yalnız ilk 3 |
| Sentez | `06-faz5-yuz.md` | ✅ | Alışkanlıklara uy (akış, yoğunluk, kayıt hızı); fark tek yerde: haftanın kararı + gerekçesi. Hedef: Today ≤40, onboarding ekranı ≤25 kelime |

**Part 1 ÇIKIŞ (7 Eki):**
- **main'e (doküman):** `e35698a` (M0, M1, M3), `1d2e9ee` (M4), `a3101f9` (M2), sentez + bu kayıt (`docs(durum)`). Kod yok, PR yok.
- **Ham veri (depoda değil):** `~/.keel-research/apify/` (reklam JSON'ları, dökümler) ve `~/.keel-research/tg-*.json` (top grossing). Apify'da 7 gün sonra silinir.
- **Araçlar:** Apify anahtarı `~/.keel-secrets/apify-token` (yazdırılmadı); Ad Library girişsiz yerleşik tarayıcıda; `ffmpeg` + `whisper-cli`
  (`~/whisper.cpp/models/ggml-base.en.bin`). **Ders:** paralel ajanlar aynı tarayıcı panelini paylaşıyor → her ajana kendi sekmesi + her çağrıda `tabId`.
  Aktör `view_all_page_id` URL'sinde kimliği düşürebiliyor (Ladder) → sayfa URL'si (`facebook.com/<ad>`) ile yeniden koş; hata kaydı da ücretli.
- **Levent'e (Part 2 başında, AskUserQuestion):** 06 §7 — B4 (1. hafta anı), B7 (onboarding sonu aha), B11 (kabul/ret), B13 (deneme/paywall teklifi),
  B8+B10 (paylaşım kartı içeriği); kalanlar (B1, B3, B9, B12) session sonunda. Telefon kurulumu isteğe bağlı: MacroFactor check-in ekranı (7 gün deneme,
  ödeme yöntemi → Levent kararı), Cal AI paywall, Bevel ilk gün (ödemesiz).
- **Part 2'nin bilmesi gerekenler:** rota sayısı 32 (`apps/mobile/src/app/`); prototip artifact (skill `artifact-design`), açık varsayılan + koyu;
  karar kartı 9:16'da 3 sn'de okunmalı (06 §5); "üründe kişi adı yok" ve U10 (isimsiz ses) geçerli.

-----
## M9 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M9.md`. Part prompt'ları `M9-part1.md`, `M9-part2.md`, `M9-part3.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Sunucu ayakta | K-907, K-901, K-902 | ✅ bitti (6 Eki) — aktarım bekliyor (README 1-3) |
| 2 · TestFlight ve cihaz | K-903, K-308 kapanış, K-815, K-618 | ✅ bitti (7 Eki) — K-903/K-815 kısmen; UI/UX revizyonu araya girdi (ADR-067) |
| 3 · Kohort ve göstergeler | K-904, K-905, K-906, K-816 | ertelendi (ADR-067) — UI/UX revizyonundan sonra |

**Part 1 başı (5 Eki):** senkron tamam — M8 ÇIKIŞ git ile tutarlı (#385-#402 birleşik; açık PR yok; worktree yalnız `../keel-main`; `*-devam.md` yok).
Ana checkout ayrık HEAD → `origin/main`. Bağımlılıklar `done` (K-202, K-010). Dependabot: aynı 3 geçişli uyarı. **Disk 16 GB.**
**Dış kapılar → ADR-064 (Levent):** Contabo VPS (Almanya; IP yalnız `~/.ssh/config`te, repoda değil) — Mac'te SSH anahtarı yoktu → `~/.ssh/config › keel-vps` yazıldı,
Levent anahtarı üretip VPS'e tanıtacak (temiz kurulum önerildi); alan adı **ücretsiz alt alan** (DuckDNS, Levent açar); yedek **Levent'in Mac'ine
çekilir** (`age` şifreli, üçüncü taraf yok); Apple Developer **aktif** (`.p8` Levent'te); koç AI **kapalı** başlar; Dokploy/Appwrite **yok**.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-907 üretim profili — sunucu varsayılan **üretim** (profil unutulursa açılmaz: taban dosyadaki sahte koç + üretim); `prod`: koç `off` (`OffLanguageModel`, alanı yok), AI rızası tanımsız, SANDBOX kalır; Apple anahtarı yoksa açılmaz. İnceleme: profil unutulunca sessizce geliştirme modu (82) → fail closed; `@Value` anahtarı kaybolunca 14 test yeşil kalıyordu (8) → gerçek yükleme testleri (`ConfigDataApplicationContextInitializer`); mutantlar 4+1+3 | ✅ birleşti | #404 | `M9/K-907.md` |
| K-901 VPS — **CANLI** `https://keel-beta.duckdns.org/health` → HTTP/2 200 (Let's Encrypt, 3 Oca 2027'ye kadar, HSTS; HTTP → 308). Contabo yeniden kuruldu (Ubuntu 24.04.5, 4 vCPU, 7,8 GB, 72 GB), SSH yalnız anahtar + root kapalı (doğrulandı). İlk sürüm: 0 yeniden başlama, FDC 8.169 besin; ilk yedek → Mac → **geri yükleme provası 38 tablo / 22.817 satır eşit**. Canlı koşu 3 hata buldu (iç içe `$$`, `psql` hatada 0, openrsync + pipefail/SIGPIPE) + bellek 918/1024 MB → 1,5 GB; CI'da gerçek PostgreSQL testi. Güvenlik incelemesi 2 kritik + 9 önemli → kapandı | ✅ birleşti | #405 | `M9/K-901.md` |
| K-902 CI'dan dağıtım — CI yalnız imaj + commit gönderir; sunucu `main`'i kendisi çeker, `deploy/`'u o commit'ten alır; zorunlu komut root'a ait (ADR-066 + Ek 1: ilk tasarımda CI anahtarı = root, koşturularak kanıtlandı → yeniden tasarım). **Canlı:** CI anahtarıyla kabuk/`files`/`main` dışı commit reddedildi; #407 birleşmesi → Deploy koşusu `805150a`'yı yayına aldı (0 yeniden başlama); doküman commit'i atlandı | ✅ birleşti | #407 | `M9/K-902.md` |

**Part 2 ÇIKIŞ (7 Eki):**
- **Birleşen:** #408 (K-903 yapılandırma: EAS projesi `@leventcan/keel`, `EXPO_PUBLIC_API_URL` EAS `production`, `usesNonExemptEncryption: false`), #409 (K-618),
  #410 (K-815 kod yarısı). Açık PR yok; worktree yalnız `../keel-main`. Backlog: K-308, K-618 `done`; K-903, K-815 `doing`; yeni K-909, K-910 (sync uygulandı).
- **Apple/EAS (Levent'le, 7 Eki):** ASC kaydı **"keel (42901f)"** (ad alınmıştı; M10'da değişir), TestFlight dahili grubu "Team (Expo)" (Levent), dağıtım
  sertifikası yeniden kullanıldı (lure/kirpici ile ortak, Haz 2027), App Store profili + ad hoc profil, EAS gönderim anahtarı `D6H29K9QVT` yeniden kullanıldı;
  cihaz "Levent iPhone 11" (UDID EAS'te). Mağaza derlemesi `c2e831d5` 1.0.0 (2) FINISHED; `--auto-submit` gönderimi ~1 saat "waiting for an available
  submitter"daydı — **TestFlight'a düştüğünü teyit et**; düşünce `ascAppId` → `eas.json › submit.production.ios` (runbook). Development build `c9e4678f`
  iPhone'a `devicectl` ile kuruldu.
- **Cihaz turu:** `docs/aktarim/M9/cihaz-kontrol-listesi.md › Cihaz sonuçları` — giriş, HealthKit okuma/yazma, kamera/barkod, K-618, VoiceOver ✅; AX5 başlık kırma +
  taşma ❌, Kalın Metin kesmesi ❌ (K-910), AI kapalıyken rıza çıkmaz sokağı ⚠️ (K-909), FDC'de Türk ürünleri yok; 10/16/19 yeni tasarımdan sonra.
- **Araçlar (Mac):** `~/.venvs/pmd3` (pymobiledevice3 11.23.0) — iPhone ekranını kablodan çeker; önce Levent `sudo ~/.venvs/pmd3/bin/pymobiledevice3 remote tunneld`.
  Development build Metro'ya kendiliğinden bağlanmaz: `xcrun devicectl device process launch --payload-url "exp+keel://expo-development-client/?url=http%3A%2F%2F<Mac IP>%3A8081"`;
  gezinme `--payload-url keel:///<rota>` (**`--terminate-existing` kullanma**, bağlantı kopar).
- **Açık sorular (Levent):** K-618 Android yarısı; iletişim adresi (dış TestFlight); Part 1'in iki sorusu (geri yüklemede silinen hesap, yedek Türkiye'de).

**Part 1 ÇIKIŞ (6 Eki):**
- **Birleşen:** K-907 #404 · K-901 #405 · K-902 #407. `main`'e doğrudan: ADR-064, ADR-065 (+ Ek 1), ADR-066 (+ Ek 1), K-907/K-908 kartları,
  aktarım `docs/aktarim/M9/` README 1-3 + `K-907.md`, `K-901.md`, `K-902.md`. Worktree: yalnız `../keel-main`. Açık PR: yok.
- **Çıkış kriterleri — kanıt:** (1) `https://keel-beta.duckdns.org/health` → HTTP/2 200 `{"status":"UP"}`, Let's Encrypt `CN=keel-beta.duckdns.org`
  (3 Oca 2027'ye kadar, Caddy yeniler), HSTS, HTTP → 308. (2) Yedekten geri yüklenmiş kopya: `restore-drill.sh` → 38 tablo / 22.817 satır yedeğin
  sayımıyla eşit. (3) `main`'e birleşme → dağıtım: #407 → Deploy koşusu 37384587795 `805150a`'yı yayına aldı; 37384692867 doküman commit'ini atladı.
- **Sunucu (Levent'le, 6 Eki gece):** Contabo yeniden kuruldu (Ubuntu 24.04.5, 4 vCPU, 7,8 GB, 72 GB, IP aynı); SSH yalnız anahtar, root kapalı
  (`~/.ssh/config`: `keel-vps` → keel, `keel-backup` → yalnız yedek okuma); DuckDNS `keel-beta`; Apple App ID `dev.leventtcaan.keel` (Sign in with
  Apple, primary) + anahtar (Key ID dosya adında, `.p8` `~/.keel-secrets/`, 600); `.env` `init-env.sh` ile (değerler sohbete girmedi); yedek anahtarı
  `~/.keel-backup/age-key.txt` (Levent parola yöneticisine kopyalayacak); Mac'te saatlik çekme (launchd, `../keel-main/deploy/mac`). GitHub
  Environment `production`: sır `KEEL_DEPLOY_SSH_KEY` (Levent), değişkenler `KEEL_DEPLOY_HOST`, `KEEL_DEPLOY_KNOWN_HOSTS`.
- **Kaynak/maliyet:** boşta bellek ~1,8 / 7,8 GB (backend 1,1 / 1,5 GB sınır — 1 GB'ta 918 MB'ta duruyordu), disk 5,7 / 72 GB; imaj 511 MB
  (sunucuda yalnız `current` + `previous`), yedek ~374 KB (Mac'te en çok 14 → ~5 MB). Ek aylık maliyet **0** (DuckDNS, Let's Encrypt, Actions public,
  yedek Mac'te); Contabo VPS mevcut abonelik. İleride yedek Contabo Object Storage'a (~2,49 €/ay) taşınabilir (tek betik) — 100 MB'a yaklaşınca.
- **Kalan iş:** K-908 (`/health` hazırlık, 503 açılış bitene kadar). RevenueCat webhook sırrı **geçici rastgele** (K-704'te gerçeğiyle değişir:
  `/opt/keel/.env` + `kc up -d`). İletişim adresi (Part 2, dış TestFlight'tan önce). Levent: eski App ID'leri (kirpici, lure, selfcutspike) isterse
  kendisi siler (XC Wildcard'a dokunulmaz).
- **Part 2'nin bilmesi gerekenler:**
  - Uygulamanın API adresi `https://keel-beta.duckdns.org` (EAS profillerine girecek). Bundle ID `dev.leventtcaan.keel` Apple'da kayıtlı; Sign in
    with Apple sunucuda **canlı** (`KEEL_APPLE_CLIENT_ID` = bundle ID) — giriş akışı cihazda gerçek sunucuyla denenebilir.
  - Sunucu `prod` profilinde: koç AI **kapalı** (`off`), SANDBOX satın almaları sayılır. Kod birleşince CI kendisi dağıtır (Actions › Deploy);
    `deploy/` değişikliği de CI ile gider (sunucu `main`'den alır). Elle: `deploy/deploy.sh`, geri alma `release.sh --rollback`.
  - Sunucuya erişim: `ssh keel-vps` (Levent'in anahtarı ajanda; ajan boşsa `ssh-add --apple-use-keychain ~/.ssh/keel_vps`). Günlük:
    `ssh keel-vps 'sudo journalctl CONTAINER_NAME=keel-backend-1 --since today'`.
  - Mac'te `rsync` 3 (Homebrew) ve `age` kurulu; macOS'un `/usr/bin/rsync`'i openrsync'tir, rrsync reddeder.
- **Yeni sorular (Levent):** (a) Geri yüklemede, yedekten sonra silinen hesap geri gelir (politika söylüyor) — kabul mü, yoksa silme kayıtlarını
  yedekten ayrı tutan küçük bir iş mi? (b) Şifreli yedekler Türkiye'de, senin Mac'inde (politika söylüyor; sunucu AB'de) — kabul mü?

**Part 2 başı (6 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#404, #405, #407 birleşik; açık PR yok; worktree yalnız `../keel-main`;
`M9-part*-devam.md` yok); sunucu `/health` → `UP`. Disk 12 GB. Dependabot: aynı 3 geçişli uyarı. Bağımlılıklar: K-801, K-807, K-614 `done`; K-308 `doing`
(bu part kapatır). Xcode 16.1 yerelde (EAS bulutta derler). **Levent (AskUserQuestion):** `eas init` agent yapar → `@leventcan/keel`
(`542a7ab1-…`); ilk mağaza derlemesi Levent'in terminalinde (Apple girişi); iletişim adresi **yeni açılacak** (o zamana kadar dış TestFlight yok);
iPhone bu session'da yanında. Widget (K-515 `doing`) ve Live Activity (K-426 `todo`) native hedefleri **henüz yok** → cihaz listesinde "kapsam dışı".
RevenueCat hesabı yok → mağaza "kullanılamaz", kapı açık (ADR-058 #107); sandbox satın alma maddesi K-704 ile.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-903 (1/2) EAS projesi + `EXPO_PUBLIC_API_URL` EAS `production` ortamında + `usesNonExemptEncryption: false` | ✅ birleşti (inceleme: etkileşimsiz gönderim `ascAppId` ister → runbook) | #408 | — |
| K-618 fotoğraflar yedekten hariç — yerel modül `apps/mobile/modules/backup-exclusion` (Swift `isExcludedFromBackup`); klasör + her dosya; metin/politika/envanter tam söz. İnceleme: Android'de modül yok + Auto Backup açık → rapor yalnız iOS (**Android yarısı açık soru**); süpürme reddedilen dosyada durmaz; JS↔Swift ad testi. Mutantlar 8/8. **Kanıt:** EAS simülatör derlemesi `40e9cfce` FINISHED; simülatörde `xattr` → `com_apple_backup_excludeItem` (klasör + dosya). Kalan: cihazda modül kaydı (liste madde 8) | ✅ birleşti (cihaz teyidi bekliyor) | #409 | `M9/K-618.md` |
| K-815 (1/2) VoiceOver duyuruları — `ProblemText`/`announce`/`useProblem` (31 hata satırı + `TextField` + koç). İnceleme: aynı hata ikinci kez duyurulmuyordu (React aynı metni çizmez; temizle+hata birleşir) → **oluş kimliği**; tarama 9 satırı kaçırıyordu → genişledi; yazarken doğrulanan alanlar her tuşta duyuruyordu → `announceProblem={false}`. Mutantlar 12/12. Simülatör: giriş ekranı AX5 açık/koyu+kontrast ✅. Cihaz turu (2/2) TestFlight'ta | ✅ birleşti (cihaz turu bekliyor) | #410 | `M9/K-815.md` |

-----
## M8 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M8.md`. Part prompt'ları `M8-part1.md`, `M8-part2.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Metinler ve envanter | K-801, K-806, K-803 · yasal URL (+ K-808, K-809) | ✅ bitti (4 Eki) — aktarım bekliyor (README 1-5) |
| 2 · Denetimler ve teslim | K-802, K-804, K-807 (+ K-810, K-811, K-812, K-813, K-814, K-818) · M8 çıkışı · M9 prompt'ları | ✅ bitti (5 Eki) — aktarım bekliyor (README 6-14) |

**Part 1 başı (4 Eki):** senkron tamam — M7 ÇIKIŞ git ile tutarlı (#368, #369, #372, #373 birleşik; açık PR yok; worktree yalnız `../keel-main`;
`*-devam.md` yok). Ana checkout ayrık HEAD = `origin/main` (6028e6b). Bağımlılıklar `done` (K-214, K-503; K-803 ← K-801 bu part'ta).
Dependabot: aynı 3 geçişli uyarı (braces, node-forge, decode-uri-component). **Disk 1,5 GB** (bizim önbellekler ~270 MB; temizlenecek
büyük önbellek yok) → Levent'in onayıyla Docker budandı → **20 GB** (adlandırılmış volume'lar yerinde). K-308 hâlâ `doing`.
**Yasal/mağaza kapısı (Levent, 4 Eki) → ADR-059:** hukuki inceleme **yok** (agent kaynaklı yazar, metinler yayımlanır, "uyumlu" denmez;
risk › Riskler); soru 57 → rıza metni koda uyar (antrenman kaydı kapsam dışı, sürüm artar); yayın yeri **bu repodan GitHub Pages**
(`leventtcaan.github.io/keel/...`, agent açar); ASC beyanları **M10** (taslak şimdi, K-803); vergi K-805 → **M11** (satıştan sonra; madde açılmaz).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-801 metinler + envanter — ADR-060; envanter 37 tablo, sütun düzeyinde göçlere bağlı, katı SQL okuyucu; politika/şartlar/feragatname `docs/yasal/site/`; sayfalar U4/U6 + kişi adı taramasında (`legalNegations`); Pages (önce iki kontrol, PR'da derleme). İnceleme: olgu denetimi 15 (14 metin düzeltmesi, 1 yanlış: döngü cevabı saklanmıyor), test analizi 11 boşluk kapatıldı; mutasyon 6/6 + 9/9; envanter 22/22, `npm run check` 2520/2520. **Pages açıldı** (`leventtcaan.github.io/keel/`) | ✅ birleşti (64ba326, dört kontrol yeşil; Pages `main`'den dağıtıldı, üç adres 200) | #375 | `M8/K-801.md` |
| K-809 yasal adresler yalnız mağaza derlemesinde (`eas.json › production.env`); test adresi sayfanın permalink'ine bağlar. İnceleme: dev-client `eas.json` env'ini okumaz → çıkarıldı | ✅ birleşti | #379 | `M8/K-809.md` |
| K-806 AI sağlayıcı şartları — üç aday resmî metinden (4 Eki); politika: yalnız eğitim yok + sıfır saklama, istisnalar adıyla yazılacak. İnceleme: alıntılar canlı sayfayla doğru; OpenAI cümlesi tam, ZDR istisnası (işaretlenen görsel) | ✅ birleşti | #378 | `M8/K-806.md` |
| K-803 App Privacy etiketi + yaş anketi (9+ hesaplanır, **18+ override zorunlu** — Apple, şartlar 18+). İnceleme: Usage Data eklendi, "Medical" cevabı açık (M10) | ✅ birleşti | #380 | `M8/K-803.md` |
| K-808 sağlık rızası metni (soru 57), sürüm 3 — RED CI'da (sunucu 2018/1, mobil 1); inceleme: metin geri çekmede silinen her şeyi ve içe aktarmayı söyler | ✅ birleşti | #377 | `M8/K-808.md` |
| ADR-059 Ek 1 — sorumlu adı + sunucu bölgesi sayfalarda; kişi adı istisnası hiç çalışmıyordu (`plain()` alt çizgiyi siliyordu) → düzeltildi | ✅ birleşti | #381 | — |

**Part 1 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-801 #375 · K-808 #377 · K-806 #378 · K-809 #379 · K-803 #380 · ADR-059 Ek 1 #381. `main`'e doğrudan: ADR-059 (+ Ek 1),
  ADR-060, K-808/K-809 kartları, K-805 → M11, M8-part2 güncellemesi, aktarım README 1-5. **Pages canlı:** `https://leventtcaan.github.io/keel/`
  (`privacy/`, `terms/`, `health/` → 200). Worktree'ler: kalıcı `../keel-main` + bu part'ın `../keel-k806`, `../keel-k808`, `../keel-k809`
  (dalları birleşti; `worktree remove` Part 2 başında, `branch -D` yasak — zararsız).
- **Kontrol çıktısı:** envanter testi 27/27 (`python3 tools/test_veri_envanteri.py`); mobil `npm run check` 145 takım 2520+ yeşil; CI dört kontrol
  yeşil (#375-#380; sunucu 2018 test). Mutasyon: K-801 6/6 + 9/9.
- **Kalan iş:** iletişim adresi (Levent açacak → `docs/yasal/site/_config.yml › contact_email`; dış TestFlight ve lansmandan önce şart).
  Envanterin yedi açığı + telefon anahtarları → Part 2 (K-802, K-804; `M8-part2.md`'de). ASC beyanları M10 (`docs/yasal/app-store-beyanlari.md`).
- **Part 2'nin bilmesi gerekenler:**
  - Envanter tek kaynak: `docs/yasal/veri-envanteri.json`; yeni tablo/sütun/izin/eklenti/Health türü/bağımlılık envantere ve politikaya girmeden
    CI kırmızı. K-802'nin "her tabloya yaz, sil, hiçbiri kalmasın" testi `erased_by` içinde `account_deletion` olan tabloları okuyabilir.
  - `event_publication` düzelince: politika `#data-technical` "we are changing this" cümlesi ve envanterde `erased_by` güncellenir (test bağlar).
  - Yasal sayfalar `main`'e PR'sız girebilir ama Pages iş akışı yayından önce envanter + yasaklı ifade taramasını koşar.
  - AI bölümü `keel.coach.provider`'a kilitli: sağlayıcı `fake` değilse politika onu adıyla anmalı (test).
  - Kararsız mobil test (bir kez, adı yakalanmadı) — görülürse `--verbose`.
- **Yeni sorular / cevaplar:** başta 6 (ADR-059), sonda 5 (ADR-059 Ek 1) — hepsi cevaplı. Açık: GDPR Md. 27 temsilci (M10), "Medical or Treatment
  Information" cevabı (M10, ASC'de), iletişim adresi.

**Envanterin bulduğu açıklar → K-802 (Part 2) kabul kriterine eklenecek:**
1. `event_publication` tamamlanan olayları silmiyor (completion-mode update) → silinen hesabın UUID'si süresiz kalıyor (V1). Politika bunu dürüstçe
   söylüyor ("we are changing this"); düzeltme: `spring.modulith.events.completion-mode: delete` ya da süreli temizlik + test.
2. Sign in with Apple jetonu silmede **iptal edilmiyor** (yetki kodu alınıyor ama değiş tokuş edilmiyor, `AuthController`). Apple: "Apps that support
   Sign in with Apple should use the Sign in with Apple REST API to revoke user tokens" (developer.apple.com/support/offering-account-deletion-in-your-app,
   4 Eki). Apple istemci sırrı (anahtar) Levent'te → tasarım + sır.
3. Silme onayı aboneliğin Apple'da süreceğini söylemiyor (`settings.delete.confirmBody`); Apple aynı sayfada bunu istiyor.
4. RevenueCat'teki müşteri kaydı silmede silinmiyor (REST gizli anahtarı, K-704 ile).
5. Yenileme jetonları (iptal/süresi geçmiş) ve `webhook_event` hesap yaşarken hiç temizlenmiyor (veri en aza indirme).
6. Telefonda öğün fotoğrafı dosyaları sistem önbelleğinde bırakılıyor (`food/photo.ts`, `photoTools.ts`).
7. `FakeLanguageModel` son 100 isteği (soru, öğün notu, fotoğraf) bellekte tutuyor; üretimde `provider: fake` kalmamalı (M9 kontrol listesi).
8. **CEVAPLANDI (ADR-063 #1, K-818 #402):** her kararın `snapshot`'ında motorun iç yağ tahmini (`fatProxy*`) saklanıyor, dışa aktarmadan U4 gereği çıkarılıyor. GDPR Md. 15 (erişim) ↔ U4:
   dışa aktarmaya girsin mi (sayı olarak, açıklamalı) yoksa saklanmasın mı? Politika şu an "saklanır, hiçbir yerde sayı olarak gösterilmez, dışa aktarmada da" diyor.
9. **Kararsız test gözlemi:** K-808 dalında ilk `npm run check` 1 kırmızı verdi, 3 tekrarda yeniden üretilemedi (adı yakalanmadı; M6'daki soğuk render
   zaman aşımı olabilir). Tekrar görülürse `--verbose` çıktısıyla adı alınacak.
10. Telefon anahtarlarının (kv-store, `const KEY`) envantere bağlanması → K-804 (test analizi, puan 6).
**M9'a (K-901) politikanın verdiği sözler:** HTTPS; sunucu bölgesi politikada yazılı olmalı; yedek ve ters vekil günlüğü saklama süresi politikaya eklenmeden

**Part 2 ÇIKIŞ = M8 ÇIKIŞ (5 Eki):**
- **Birleşen:** K-802 #385 · #386 (AdherenceApiTests gece yarısı) · K-804 #389 · K-810 #391 · K-814 #392 · K-811 #393 · K-813 #394 · K-807 #395 ·
  K-812 #398 (sunucu) + #400 (mobil) · K-818 #402. `main`'e doğrudan: ADR-061 (+ Ek 1), ADR-062 (+ Ek 1), ADR-063, ADR-056 Ek 2, ADR-015 tablo satırı,
  K-810…K-818 kartları, M9 prompt'ları (`plan/oturum-promptlari/M9.md`, `M9-part1..3.md`), aktarım README 6-14. Worktree: yalnız `../keel-main`.
  Açık PR: yok. Ana checkout ayrık HEAD = `origin/main` (43fe480).
- **M8 çıkış kriterleri (yol-haritasi) — kanıt:** (1) politika/şartlar/feragatname canlı: `privacy/`, `terms/`, `health/` → 200, "Last updated: 5 October 2026"
  (hukuki inceleme yok — ADR-059). (2) silme + dışa aktarma uçtan uca: `EndToEndDeletionTests` (envantere bağlı; kimlik ve Apple kimliği hiçbir sütunda
  kalmaz; jetonlar 401; her `exported` tablo `export_key` yolunda) + Apple iptali (K-812) + telefon (K-811, K-813 çıkış testi). (3) gizlilik etiketi + yaş
  derecelendirmesi: taslak `docs/yasal/app-store-beyanlari.md` (K-803; ASC girişi M10) + Erişilebilirlik Besin Etiketi taslağı (§3). (4) yasaklı ifade
  taraması testte: `tools/anayasa-denetimi.sh` → "constitution audit: passed" (envanter 30, mobil 10 takım/316 test, sunucu mimari + 4 koç testi; 5 Eki).
  (5) vergi/W-8BEN → **M11** (ADR-059 #5), M8 dışı.
- **Kalan iş (M9'a):** K-815 erişilebilirlik cihaz turu, K-816 metin dışı kontrast (prototip → Levent), K-817 hız sınırı, K-704 (RevenueCat hesabı; müşteri
  kaydı silme), K-618, cihaz adımları (K-308), iletişim adresi (Levent, dış TestFlight'tan önce), üretim profili (Apple `.p8` anahtarı zorunlu, `fake` sağlayıcı
  yok). **SANDBOX beta boyunca kalır** (TestFlight satın almaları SANDBOX; ADR-056'ya göre App Store yayınında çıkar) — M8-part2 prompt'u M9 kapısı sayıyordu.
- **M9'un bilmesi gerekenler:**
  - Anayasa denetimi: `tools/anayasa-denetimi.sh`; yeni bir tarama ilk satırına `// constitution-audit` yazar ve listeye girer (yoksa CI kırmızı).
  - Envanter: `export_key` (dışa aktarma yolu), `kv_keys` (telefon anahtarları, AST okuyucu `kv-keys.test.ts`), `survives_sign_out`, `handled`/`time` + `kept_for`
    (yapılandırmaya bağlı Python testleri). Yeni tablo/anahtar/akış envantere ve politikaya girmeden CI kırmızı.
  - Ağa yalnız `privacy` çıkar; `EgressGate.postForm` paket içi. Apple iptali `privacy.AppleRevocation`; kimlik bilgisi `identity.AppleAccounts`.
  - Gece temizlikleri: `RefreshTokenCleanup` (03:45 UTC, aile kuralı), `WebhookEventCleanup` (04:30 UTC, 30 gün), `QuotaCleanup` (18:15 UTC). Ayar adlarında
    `token/secret/private/key` geçerse `SecretsFromEnvironmentTests` sır sayar.
  - Erişilebilirlik kuralları `accessibility.test.ts`; hareket `useReduceMotion`; kontrast `contrast.test.ts`.
  - PR `main` ile çakışırsa (DIRTY) GitHub CI başlatmaz — önce `main`'i birleştir.
- **Kontrol çıktısı:** mobil `npm run check` 152 takım 2623 test (#400 dalı); sunucu CI 2048+ test yeşil; anayasa denetimi yeşil.
- **Yeni sorular / cevaplar:** Bitiş'te 4 (ADR-063, hepsi önerilen). Açık: iletişim adresi; Apple ekranını kapatan kullanıcının silmeyi durdurması istenirse
  ürün kararı (şimdi: durdurmaz, metin söyler). Kararsız mobil test bir kez daha görüldü (K-813 dalı, 2 takım), üç tekrarda yok — adı yakalanamadı.
yedek açılmaz (politika şu an yedekten söz etmiyor).

**Part 2 başı (5 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#375, #377-#381 birleşik; açık PR yok; `*-devam.md` yok). Ana checkout
ayrık HEAD = `origin/main` (87fc154). Part 1 worktree'leri (`keel-k806/808/809`) kaldırıldı; kalan yalnız `../keel-main`. Bağımlılıklar `done`
(K-214, K-302, K-301). Dependabot: aynı 3 geçişli uyarı. **Disk 17 GB.** İletişim adresi hâlâ açık (Levent).
**Envanter açıklarının görevlere bölünmesi (agent, ADR-019 — bir görev = bir modül):** 1 → K-802 kabulü (#78) · 2 → **K-812** #384 (SIWA iptali; kod
şimdi, `.p8` anahtarı Levent'te) · 3 + 6 → **K-811** #383 (mobil) · 4 → K-704 kabulü (#363, RevenueCat gizli anahtarıyla) · 5 → **K-810** #382 ·
7 → M9 kontrol listesi · 8 (fatProxy dışa aktarma) → Bitiş'te Levent'e soru · 10 → K-804.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-802 envantere bağlı uçtan uca silme + dışa aktarma (`EndToEndDeletionTests`): kimlik + Apple kimliği **hiçbir sütunda** kalmaz, jetonlar 401, her `exported` tablo `export_key` yolunda dolu. **Hata bulundu:** Modulith işlenen olayı saklıyordu (silinen UUID 14 satırda) → `completion-mode: delete` + V34. Test analizi 7/6/5/4 kapatıldı (yeniden deneme yolu, `export_key`, V34 gerçek satırla, her sütun); kod incelemesi: politika tarihi. Mutasyon CI'da (#388) 3 mutant → 5 kırmızı. Yan: #386 (`AdherenceApiTests` Pazartesi 00-01 İstanbul) | ✅ birleşti (4042e22) | #385 | `M8/K-802.md` |
| K-804 anayasa denetimi tek komut (`tools/anayasa-denetimi.sh`: envanter + 9 mobil takım `// constitution-audit` + sunucu mimari + 4 koç metin testi) + mağaza metni taslağı `data/copy/store.en.json` (U4/U6, kişi adı, kota, Apple sınırları sabit) + her rota **doğru** korumada (doğrudan ebeveyn, gruplar sabit, `_layout`'suz klasör yok, `_sitemap` kapalı). İnceleme: mağaza metninde 2 yanlış iddia düzeltildi; liste 9'un 5'ini koruyordu → iki yönlü işaret. Mutasyon 11/11 | ✅ birleşti | #389 | `M8/K-804.md` |
| K-810 yenileme jetonu **ailesi** son jetonu da süresini doldurunca gece silinir (`RefreshTokenCleanup`, 03:45 UTC). İnceleme (82): tek tek silmek çalınan kopyanın yakalanmasını bozuyordu — RED `expected 401 but was 200` → aile kuralı. `kept_for` + politika `refresh-ttl`/saate bağlı (Python). Ayar adı `expired-cleanup` (sır testi "token"ı sır sayar) | ✅ birleşti | #391 | `M8/K-810.md` |
| K-814 işlenmiş RevenueCat olayları 30 gün sonra gece silinir (`WebhookEventCleanup`, 04:30 UTC). İnceleme: 80+ yok; gerekçe "kesinlikle daha eski olay" + panelin elle Retry'ı → ADR-056 Ek 2; olay gerçekten yeniden tartıldı assertion'ı | ✅ birleşti | #392 | `M8/K-814.md` |
| K-811 silme onayı: Apple yine ücret alacaksa (TRIAL/ACTIVE/BILLING_ISSUE/PAUSED) ya da bilinmiyorsa söyler + "Cancel or change plan"; CANCELLED'a söylemez. Öğün fotoğrafı: seçici kopyası + küçültülen dosya `finally`'de silinir (yalnız önbellekteki), oturum sonu `Caches/ImagePicker`+`ImageManipulator`. İnceleme: Android `content://` sigortası, klasör hatası, PAUSED/500 testleri | ✅ birleşti | #393 | `M8/K-811.md` |
| K-813 telefon kv anahtarları ↔ envanter (AST, sözcüksel kapsam, 26 anahtar; `kv` kaçışları/anahtarsız metotlar/başka yerde içe aktarma kırmızı) + çıkışta yalnız `projection.access` (önce doldur → başlat → 500). İnceleme: 6 kaçış yolu + boşa geçen çıkış testi + politikada Health içeriği → kapatıldı | auto-merge | #394 | `M8/K-813.md` |
| K-807 erişilebilirlik: kaynakta kurallar (`accessibility.test.ts`), kontrast eklemeleri, karşılaştırma fotoğrafları adlandı; Besin Etiketi taslağı (`app-store-beyanlari.md › 3`: 4 Evet, 3 cihaz bekliyor, Captions uygulanamaz, Audio Descriptions hayır). **Simülatör/cihaz turu yok** (oturumlu ekranlar Apple girişi ister — K-308); kontrol listesi beyan dosyasında | inceleme: Sufficient Contrast metin dışı 1.1–1.3 (alan, çip kenarı, seçili satır) → "Evet" değil; set satırı yalnız renkle (DWCA); Reduce Motion gerekçesi yanlış (coach `scrollToEnd animated`, barkod `Modal slide`); kural delikleri (erişilebilir ata düğmeyi gizler, `Text onPress`, ham `TextInput/Switch`, warn değişkende); 2 kabul kriteri cihaz → K-815'e bölünecek. Düzeltiliyor | #395 | `M8/K-807.md` |
| K-812 Apple jetonu iptali — sunucu #398 (ADR-062 + Ek 1, privacy'de, `invalid_grant`/`invalid_client`, `postForm` paket içi; hız sınırı → K-817) + mobil #400 (silmeden önce taze kod; ağ hatası/vazgeçme silmeyi durdurmaz, adıyla rapor; metin "Apple ekranını kapatmak silmeyi durdurmaz"). Levent: silmede yeniden onay (ADR-063 #2) | ✅ birleşti | #398, #400 | `M8/K-812.md` |
| K-818 iç yağ tahmini kullanıcının dışa aktarmasında (ADR-063 #1); test beklentisi kararla değişti; politika + envanter + anayasa U4 kapsam notu. RED CI → yeşil. İnceleme: sözleşme başlığı ve ADR-059 eski kuralı söylüyordu → düzeltildi; test değer ister | ✅ birleşti | #402 | `M8/K-818.md` |

## M7 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M7.md`. Part prompt'ları `M7-part1.md`, `M7-part2.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Yetki sunucuda | K-701, K-703 (+ K-704, K-705 açıldı) | ✅ bitti (4 Eki) — aktarım bekliyor (README 1-2) |
| 2 · Paywall ve teslim | K-705, K-702 (+ K-706, K-707 — ADR-058) · M7 çıkışı · M8 prompt'ları | ✅ bitti (4 Eki) — aktarım bekliyor (README 3-6) |

**Part 1 başı (4 Eki):** senkron tamam — M6 ÇIKIŞ git ile tutarlı (#354, #356, #357, #358, #361, #362 birleşik; açık PR yok; worktree yalnız
kalıcı `../keel-main`; `*-devam.md` yok). Ana checkout ayrık HEAD = `origin/main` (cf83dc5). Bağımlılıklar `done` (K-203, K-508, K-306).
Dependabot: aynı 3 geçişli uyarı (braces, node-forge, decode-uri-component). **Disk 1,1 GB → 4,5 GB** (Levent onayıyla simülatör dyld
önbelleği 3,4 GB + npm önbelleği silindi; simülatör ilk açılışta yeniden üretir). K-308 hâlâ `doing` (cihaz derlemesi Levent'te).
**Para/mağaza kapısı (Levent, 4 Eki):** hiçbiri hazır değil (RevenueCat hesabı, ASC abonelik grubu/ürünler, Paid Applications, sandbox
hesabı) → değerler yapılandırmadan okunur, kod beklemez; entitlement/ürün kimlikleri **öneri** olarak config'de. Veri dışarı: RevenueCat'e
opak hesap kimliği + SDK'nın zorunlu verisi **onaylı** → ADR-012 Ek 1.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-701 RevenueCat webhook ve yetki — ADR-056; RED v1 geçersiz (bean adı çakışması) → RED v2 12 assertion; uygulama CI'da 2 kırmızı (dışa aktarma boş bölüm, asenkron silme dinleyicisi) → 8ca3d7a; kontrol mutantı #365 üçü öldü, kapatıldı; inceleme + test analizi işlendi; birleşti (2d29812, üç CI yeşil) | ✅ birleşti | #364 | `M7/K-701.md` |
| K-703 premium uçlarda yetki — sözleşme önce, 403 ENTITLEMENT_REQUIRED; kapı rızadan, fotoğraftan, kotadan önce; motorun sözleri ve geri kalan uçlar serbest. #364'e yığılı başladı, birleşince `main`'e taşındı. RED CI'da 4 assertion; inceleme: iade testi zamanı; test analizi 6 mutant → testler | ✅ birleşti | #366 | `M7/K-703.md` |

**Part 1 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-701 #364 (2d29812) · K-703 #366 (6db9b54) — ikisi de üç CI yeşil (DB testleri dahil; #366'da 2003+ test). Kontrol mutantı #365 kapatıldı
  (üç mutant öldü). `main`'e doğrudan: ADR-056, ADR-012 Ek 1, K-704 + K-705 (backlog + issue), M7-part2 prompt güncellemesi, aktarım `docs/aktarim/M7/`
  (README 1-2). Açık PR yok. Worktree yalnız kalıcı `../keel-main`. Yerel artık dallar (squash birleşti): `subscription/74-revenuecat-webhook`,
  `subscription/76-premium-guard`, `mut/74-webhook` (`branch -D` git_guard'da yasak — zararsız).
- **Kontrol çıktısı:** birleşmiş ağaçta saf + mimari testler 135/135 (Docker'sız); tam takım CI'da yeşil. Mobil yalnız üretilen `schema.ts` yorumları
  değişti (CI Mobile yeşil).
- **Kalan iş:** yok (Part 1 kapsamı tamam). K-704 Levent'in RevenueCat hesabını bekliyor.
- **Part 2'nin bilmesi gerekenler:**
  - Telefon sunucunun **403 `ENTITLEMENT_REQUIRED`**'ını bugün "failed" gösteriyor (`apps/mobile/src/coach/conversation.ts`, `food/photo.ts` yalnız
    CONSENT_REQUIRED'ı ayırıyor) → K-702 paywall'u açmalı. Sıra sunucuda: yetki → rıza → kota → model (`coach/Explanation.java`, `MealDraft.draft`).
  - RevenueCat `appUserID` = hesabın UUID'si (kanonik, küçük harf); değilse sunucu olayı yok sayar (`identity/KnownAccounts`). `logIn` girişten sonra,
    `logOut` çıkışta.
  - Webhook 5-60 sn gecikir → satın alma sonrası durum K-705 ucundan kısa süre yeniden sorulur. Erişim yalnız `accessUntil`'den (`SubscriptionState`).
  - Yerelde ve CI'da sunucu `KEEL_REVENUECAT_WEBHOOK_SECRET` ister (yoksa açılmaz); test değeri `src/test/resources/config/application.yml`.
    Telefonda RevenueCat'in **public** SDK anahtarı da yapılandırmadan (Expo config / env), kodda değil.
  - Test yardımcısı `app.keel.subscription.TestWebhooks` (`subscribe`, `event`, `send`) — koçla ilgili her yeni sunucu testinde hesap abone edilmeli.
  - Dersler: (1) mutasyon betiği temel koşuyu doğrulamalı — test deseni DB'li sınıfı seçerse her mutant "öldü" görünür; (2) `@Bean` metot adı bir
    bileşen sınıfının bean adıyla çakışabilir (bağlam açılmaz — RED değil istisna); (3) `@ApplicationModuleListener` asenkron — testte beklenir;
    (4) yığılı dal: squash birleşmeden sonra `git rebase --onto origin/main <eski taban ucu>`; (5) push sandbox'ta osxkeychain'e erişemiyor →
    `git -c credential.helper= -c credential.helper='!gh auth git-credential' push`.
  - Disk 4,6 GB (simülatör dyld önbelleği silindi, ilk açılışta ~3 GB yeniden üretir → simülatör turu öncesi Levent'e). K-308 hâlâ `doing`.
- **Yeni sorular:** yok (para/mağaza kapısı Part 1 başında cevaplandı → ADR-012 Ek 1). Açık: 80 (Docker/disk), 57 (rıza metni hukuki bakış);
  RevenueCat hesabı + ASC ürünleri + Paid Applications + sandbox hesabı Levent'te (Part 2'nin cihaz adımları için).

**Part 2 başı (4 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#364, #366 birleşik; açık PR yok; worktree yalnız `../keel-main`;
`*-devam.md` yok). Ana checkout `origin/main`'e (1b52227) çekildi. Disk 4,6 GB. K-308 hâlâ `doing`. Para/mağaza: değişiklik yok (hazır olan yok).
Dependabot: aynı 3 geçişli uyarı.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-705 `GET /v1/subscription` — sözleşme önce (d96d11e), `appUserId` eklendi (telefon hesabın UUID'sini başka yoldan bilmiyor); ADR-056 Ek 1. RED CI'da 6 assertion (2013 test); inceleme temiz; test analizi 3 boşluk → sabit saatli saf test (`Instant.now()` mutantı öldü), ek süre, okuma yazmaz; birleşti (cd718c3, üç CI yeşil) | ✅ birleşti | #368 | `M7/K-705.md` |
| K-702 paywall — `react-native-purchases` 10.11.0 (`npx expo install`; Expo listesinde yok → npm en yenisi); ADR-057 (port, tembel configure + UUID, teyit 12×5 sn, deneme dili yalnız ELIGIBLE, iptal Apple sayfasında, ENTITLEMENT_REQUIRED → "See plans", iki yasal bağlantı yoksa satış yok, hatalar `StoreError_<kod>`). Yerel RED'ler 70 (assertion). İnceleme 3 ajan: 3 + 6 bulgu + 8 yaşayan mutant → düzeltildi; mutasyon 6/6 öldü. `npm run check` 139 takım 2447/2447. Üretim kodu ~720 satır (bölmek ölü rota/erişilemez paywall bırakırdı; gerekçe PR'da). **Bulgu:** App Store'da duraklatma yok → soru 106. Simülatör yok (disk) | ✅ birleşti | #369 | `M7/K-702.md` |
| K-706 onboarding sonunda zorunlu paywall (ADR-058 #1) — `subscription/gate.ts` (son cevap telefonda; "cevapsızsa açık" yalnız soğuk başlangıçta), `app/subscribe.tsx` (paywall `required` + hesap bölümü, 5.1.1(v)), "Continue" (kendiliğinden geçiş yok), `ledger`/`what-if` korumalı gruba (main'de korumasızdı); `PaywallView.tsx` (macOS harf çakışması). İnceleme 2 bulgu + 7 yaşayan mutant + yeniden render hatası → düzeltildi; mutasyon 7/7. `npm run check` 142 takım 2480/2480 | ✅ birleşti | #372 | `M7/K-706.md` |
| K-707 deneme hatırlatması (ADR-058 › 105) — `subscription/trialReminder.ts` (kimlik `trial`, `AlertAccess` — hatırlatma planının önekli temizliği dokunmaz; izin dokunuşta; ACTIVE/iptal → kalkar; bitiş kayarsa kayar; çıkışta yalnız kuruluysa iptal), `TrialReminderOffer.tsx` (paywall "abonesin" adımı + Ayarlar), paywall deneme satırı "if you'd like one" (parametre `trial_reminder_days_before` = 2); ADR-058 kararları başlıklara bölündü (parametre çapası). `npm run check` 144 takım 2503/2503. İnceleme: 3 bulgu + saat → düzeltildi; 4 yaşayan mutant → testler; mutasyon 7/7. `npm run check` 145 takım 2514/2514 | ⏳ auto-merge | #373 | `M7/K-707.md` |

**Part 2 soruları → ADR-058 (Levent, üçünde önerilen):** 107 onboarding sonunda **zorunlu** paywall, aboneliği biten deterministik modda → **K-706**
(#370); 106 iOS'ta duraklat düğmesi yok (K-702 kabul kriteri + prototip düzeltildi); 105 deneme bitmeden isteğe bağlı yerel hatırlatma — fatura
bildirimi, ADR-036'nın üç türünden sayılmaz → **K-707** (#371). Sıra: K-706 → K-707 → M7 çıkışı.

**Part 2 ÇIKIŞ = M7 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-705 #368 · K-702 #369 · K-706 #372 · K-707 #373 (auto-merge açık; CI'da). `main`'e doğrudan: ADR-056 Ek 1, ADR-057, ADR-058, ADR-012 sürüm
  düzeltmesi, K-706/K-707 kartları (#370, #371), prototip 1.11/5.2 "Pause" düzeltmesi, M8 prompt'ları (`M8.md`, `M8-part1.md`, `M8-part2.md`). Açık PR: yalnız
  #373 (auto-merge). Worktree yalnız kalıcı `../keel-main`. Yerel artık dallar (squash birleşti, `branch -D` yasak — zararsız).
- **M7 çıkış kriterleri (yol-haritasi, `main`'de çıktıyla kontrol edildi):** RevenueCat ✅ (webhook `RevenueCatWebhook`/`WebhookSignature`; telefon
  `react-native-purchases` 10.11.0, `subscription/revenueCat.ts`) · paywall ✅ (`app/paywall.tsx`, `app/subscribe.tsx`, `PaywallView.tsx`) · sunucu tarafı yetki ✅
  (`Entitlements.active`, 403 ENTITLEMENT_REQUIRED, `GET /v1/subscription`) · kota bağlantısı ✅ (`Explanation`: yetki → rıza → kota → model) · iptal görünür ✅
  ("Cancel or change plan" → Apple'ın sayfası; paywall iptal notu). Duraklatma: iOS'ta yok → düğme yok (ADR-058 › 106, Levent). Kodda fiyat yok (yalnız
  `store.ts`'te bir yorumda örnek dize — değer değil).
- **Eksik / dışa bağlı:** sandbox satın alma, geri yükleme, iptal **cihazda görülmedi** — K-308 (Levent) + RevenueCat hesabı/projesi, ASC abonelik grubu +
  ürünler + 7 gün deneme, Paid Applications, sandbox hesabı (hepsi Levent; ADR-012 Ek 1). K-704 (REST tazeleme) RevenueCat gizli anahtarı bekliyor. Yasal
  bağlantılar (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`) M8'de — o zamana kadar paywall "kurulmadı" der ve kapı açık kalır (bilerek).
  `showManageSubscriptions`'ın ne zaman çözüldüğü `[doğrulanmadı]`, deneme bildiriminin çaldığı → cihaz. Simülatör turu yok (disk).
- **Kontrol çıktısı:** mobil `npm run check` (Node 22) **145 takım, 2514/2514** (K-707 dalında); sunucu K-705 CI'da yeşil (2013+ test), saf + mimari yerelde yeşil.
- **M8'in bilmesi gerekenler:**
  - Yasal URL'ler iki yerde şart: paywall satışı (`subscription/links.ts` `legalComplete`) ve kapı (`gate.ts` — iki bağlantı yoksa kapı hep açık). Mağaza
    derlemesinde ikisi de ayarlanmalı (M9 kontrol listesi), yoksa zorunlu paywall devre dışı kalır.
  - Gizlilik politikası: RevenueCat (opak UUID + SDK verisi, ADR-012 Ek 1; SDK yalnız paywall/abonelik ayarı açılınca yapılandırılır — ADR-057 D1); deneme
    hatırlatması telefonda (veri gitmez); hesap silme kapı ekranından da (5.1.1(v)).
  - Kapı ekranı (`app/subscribe.tsx`) hesap bölümünü taşır — K-802 uçtan uca silme bu yolu da kapsamalı.
  - `ledger`/`what-if` korumasızdı (main'de), K-706'da korumalı gruba alındı — K-804 denetimine "her rota bir korumalı grupta" kuralı eklenebilir.
  - Hata adları: `StoreError_<kod>`, `PurchaseFailed_<kod>`, `NoPlans`, `TrialEligibilityUnread`, `StoreModuleMissing`, `SubscriptionUnread` (V3, yalnız ad).
  - macOS dosya sistemi harf duyarsız: aynı klasörde `X.tsx` + `x.ts` aynı modül sayılır (`PaywallView.tsx` dersi).
  - Disk **1,5 GB** (oturumda 4,6 → 1,4; bizim önbellekler ~400 MB, temizlendi; `~/Library/Caches` 4,5 GB başka uygulamaların) — **M8 başında Levent'e**.
- **Sorular:** 105-107 cevaplandı → ADR-058. Yeni soru yok. Açık: 80 (Docker/disk), 57 (rıza metni hukuki — M8 Part 1 0a).

## M6 ilerleme (tek doğru kaynak — her part başında okunur, sonunda yazılır)
Ortak talimat `plan/oturum-promptlari/M6.md`. Part prompt'ları `M6-part1.md` … `M6-part4.md`.

| Part | Görevler | Durum |
|---|---|---|
| 1 · Geçmiş ve sinyaller | K-535, K-534, K-608, K-603, K-611, K-610 | ✅ bitti (4 Eki) — aktarım bekliyor; sorular 87-93 |
| 2 · Projeksiyon (sağlık kapılı) | K-605, K-607, K-613 (K-606'dan bölündü), K-606 | ✅ bitti (4 Eki) — aktarım bekliyor; sorular 94-96 |
| 3 · Efor ve fotoğraf | K-604, K-614 (K-601'den bölündü), K-601, K-602 | ✅ bitti (4 Eki) — aktarım bekliyor; sorular 97-101 |
| 4 · İçe aktarma, paylaşım, teslim | K-615, K-616, K-609 (bölündü), K-612, K-617 · M6 çıkışı · M7 prompt'ları | ✅ bitti (4 Eki) — aktarım bekliyor (README 15-19) |

**Part 1 başı (3 Eki):** senkron tamam — M5 ÇIKIŞ git ile tutarlı (K-514 #327, K-408 #328, K-515 #329 birleşik; açık PR yok; worktree
yalnız kalıcı `../keel-main`; `M5-part4-devam`/`M6-*-devam` yok). Ana checkout ayrık HEAD bir commit gerideydi → `origin/main`. Bağımlılıklar
`done` (K-530, K-430, K-111, K-401, K-103, K-212, K-502, K-112). Dependabot: aynı 3 geçişli uyarı (braces, node-forge, decode-uri-component).
**Disk 3,6 GB** (npm/brew önbelleği temizlendi → 3,8 GB; gradle önbelleği 247 MB, gerekli). Docker sanal diski hâlâ **17 GB** (soru 80 açık)
→ **simülatör turu bu part'ta da yok** (M5 Part 3 + K-408 ekranı ertelenen liste aynen bekliyor); DB testleri CI'da. Soru 86 → ADR-048 #5 işlenmiş.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-535 geçmiş haftalar o haftanın program sayısıyla → **ADR-049**: `training.program_history` (V30, yalnız eklenir, tohumlu, zaman kesin artar) + `PlannedSessions.inWeek` (hafta başındaki program; hafta içinde değiştiyse **en azı**) → tutarlılık/uyum/Bugün/ilk 8 haftanın takvimi; kaçan plan haftası `judgedFrom`; ilk 8 haftanın riski `askedSince`; hedefler bugünkü programla | ✅ #333 birleşti, #336 auto-merge; RED CI 2 + yerel 6+1+1+1; inceleme: **backfill hiç koşmuyordu** (uygulama DB'si boş başlar) → ayrı DB'de göç testi; eşzamanlı değişimde geçmiş sırası (`greatest` + 1 µs); **kaçan plan haftası pazartesi değişiminde yeni sayıyla**; ilk 8 haftanın riski bugünkü programla; 5 test düzenlemesi program_history'yi de geri taşır; mutantlar CI'da (#334, #337) öldü | #333, #336 | `M6/K-535.md` |
| K-534 seyrek rafta tekrar tavanı: hedef aralığın üstü + `rep_ceiling_above_range` (5, `urun`, kaynaksız) aşmaz; **sunucu söyler** `PlannedExercise.rackEnds` (V31) — tavanda ve sonraki yük orada da ulaşılamazsa; Train sekmesinde `train.rackEnds` | ✅ #335 birleşti; RED 5+2+2, jest 6+2; inceleme: **ilk sürüm notu tekrardan çıkarıyordu** (teknik kapısı da tekrarı tavanın üstüne taşır → yanlış not, 82) → sunucu bayrağı; ulaşılabilir TOO_FAR'da not yok (mevcut test K1 yakaladı); notun ekranı testsizdi; mutasyon 11/11 + 5/5 | #335 | `M6/K-534.md` |
| K-608 tutarlılık geçmişi: "11 of 12 weeks on track · 1 forgiven week used" — `ConsistencyRecord.forgivenWeeks` (motorun aynı yürüyüşü; tek kaçış affedildiği an sayılır, **geri alınmaz**, sıfırlanmaz) → sözleşme → Bugün kartı | ✅ #338 birleşti; RED 3 + 2 + 3; inceleme: **ilk sürümde sayı ikinci kaçışta geri düşüyordu** ("kullanıldı" denmişken, 82) → affedildiği an; duraklayan hafta araya girince vakaları; K1 notu: `ConsistencyApiTests` tam eşitliği `forgivenWeeks: 0` ile genişledi (soru 87); mutasyon 4/4 + 3/3 | #338 | `M6/K-608.md` |
| K-603 kompozisyon sinyali "kilo sabit, bel düştü" (H1 §1.6, Ross 2000): `CompositionSignal` — sabitlik **spine'ın kendi hükmü** (`WeeklySpine.steady`), bel `WaistTrend` DOWN + ölçümler en az `waist_signal_min_span_days` (14, H1 §1.5) arayla; **karardan bağımsız**: "Why this call" › "Also in your data" (`DecisionBasis.signals`), güvenlik kararında yok | ⏳ #339 auto-merge; RED 2+1+1, 3; inceleme: cut'ta spine "hareket" derken "sabit" yazabiliyordu (85) → spine'ın hükmü; **bel iki gün arayla ölçülse de söylüyordu** (82) → aralık parametresi + `Answered.waistSpanDays`; mutasyon 4/4 + 4/4; soru 88 (bel düşerken cut'ta kalori kararı) | #339 | `M6/K-603.md` |
| K-611 karar defteri: `GET /v1/decisions` + `readTrendKg` (kararın okuduğu son hafta) → telefon `today/ledger.ts` + `app/ledger.tsx` "After this call: trend X → Y by <tarih>" (nedensellik yok, test), sayfalar tek liste; "Why this call"dan | ⏳ #340 auto-merge; RED 1 + 5+3+1; inceleme: **eski bekleyen karar sonsuza "Not applied yet"** (telafi borcu gibi, U7, 85) → yalnız son karar; eski sayfa hatası sessizdi (80); sunucunun pozitif yolu DB testinde; mutasyon (bekleyen durum testsizdi → vaka) | #340 | `M6/K-611.md` |
| K-610 "kararı ne değiştirir?": `WhatIf` — bugünün **canlı** anlık görüntüsü + yürürlükteki plandan bir hafta sonrası, 2×2×2 örnek (trend hedefe doğru/düz · plan tutuldu/hiç · antrenman tutuyor/düşüyor) motordan; `GET /v1/decisions/{id}/what-if` (yalnız son karar, güvenlik kararında 404), "example: true"; telefon `app/what-if.tsx` "This runs the same rules on example data, not yours. No AI involved." | ⏳ #341 auto-merge; RED 3 + 2+2+1 (+2+1 inceleme); inceleme: **örnek kararın bayat planından kuruluyordu** (uygulanmış kalori kararından sonra "−500 daha", 92) → canlı plan; **sabit adım ~73 kg altında kayıp tavanını aşıyordu** ("hedefe gidersen çok hızlı", 88) → tavanın payı (`what_if_cut_step_of_loss_cap`); "plan kaçtı" eşikte kısmi kurala düşüyordu (85); mutasyon 5/5 + 3/3 | #341 | `M6/K-610.md` |


**Part 1 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-535 #333 + #336 · K-534 #335 · K-608 #338 · K-603 #339 · K-611 #340 · K-610 #341 (auto-merge). Kontrol mutantı PR'ları #334, #337
  kapatıldı. `main`'e doğrudan: ADR-049 (+ inceleme sonrası güncelleme), aktarım dosyaları `docs/aktarim/M6/` (README 1-6). Açık PR yok (#341
  birleşince). Worktree yalnız kalıcı `../keel-main`. Yerel artık dallar (birleşti, squash): `training/331-program-history`, `mut/331-history`.
- **Kontrol çıktısı:** mobil `npm run check` 104 suite **1702/1702**; sunucu saf testler **1439/1439** (431 DB testi Docker'sız düşer → CI; her PR CI'da
  DB dahil yeşil). Disk **3,0 GB** (Gradle derlemeleri yedi; daemon günlükleri + derleme çıktısı silindi); Docker sanal diski 17 GB (soru 80 açık) → simülatör turu yine yok; 2 GB altına inerse dur.
- **Backlog:** K-535, K-534, K-608, K-603, K-611, K-610 `done`; sync ✅.
- **Part 2'nin bilmesi gerekenler:**
  - Hafta okuması (ADR-049): `PlannedSessions.byWeek/inWeek` — hafta başındaki program, hafta içinde değiştiyse **en azı**; hedefler bugünkü programla.
    Program geçmişi `training.program_history` (yalnız eklenir); program `created_at`'ini geri taşıyan test düzenlemesi geçmişi de taşımalı (CTE kalıbı).
  - Kompozisyon sinyali K-603 kararın **yanında** (`DecisionBasis.signals`, "Why this call" › "Also in your data"), kararı değiştirmez; bel aralığı
    kararla saklanır (`Answered.waistSpanDays`, eski kararlarda yok). K-606 projeksiyonu sinyalle **karıştırılmamalı**.
  - "What would change the call" (K-610) **kural** simülasyonu; K-606 şekil projeksiyonu **zaman/vücut** — ayrı (L3 Y3 notu). Örnekler canlı plandan.
  - Defter K-611: `readTrendKg` defter satırında; "after" dili testli.
  - Yeni parametreler: `rep_ceiling_above_range` (5, urun), `waist_signal_min_span_days` (14, H1 §1.5), `what_if_trend_step_margins` (1,25, urun),
    `what_if_cut_step_of_loss_cap` (0,5, urun); yeni birim `margins`.
  - Telefon tuzakları: yeni ekranda `.expo/types/router.d.ts` sil; metin bekçisi JSX içindeki dizgileri metin sayar → koşullu düğmeleri küçük
    bileşene al; test sahtesi `useAppServices` sabit nesne dönmeli (yoksa efekt döngüsü).
- **Yeni sorular:** 87-93 (aşağıda). **Part 2 başında sorulacak sağlık kapısı** (M6.md): aşağıda "Part 2 sağlık kapısı".

**Part 2 başı (4 Eki):** senkron tamam — Part 1 ÇIKIŞ git ile tutarlı (#333-#341 birleşik, açık PR yok, worktree yalnız `../keel-main`, `main` temiz;
ana checkout ayrık HEAD → `origin/main`). Bağımlılıklar `done` (K-103, K-306). Disk **9,3 GB**. Dependabot: aynı 3 geçişli uyarı.
**Sağlık kapısı cevaplandı → ADR-050 KABUL** (dördünde önerilen): SCOFF (Morgan 1999 BMJ 319:1467, **doğrulandı**; doğrulama örneklemi 18-40 kadın)
orijinal + "6 kg (one stone)"; pozitifte nötr cümle + bölge linki (US ANAD, GB Beat; D1'de doğrulanmış URL); cevap saklanmaz, sonuç yalnız cihazda,
pozitifte yeniden deneme yok; H2 §4.3 tam eşik seti.
**Ortam notları:** (1) `git push/pull` osxkeychain'de takılıyor → `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push`.
(2) Kabuktaki Node 20 → telefon testleri `node:sqlite` bulamıyor; **Node 22** ile koş (CI 22): `PATH=~/.nvm/versions/node/v22.14.0/bin:$PATH npm run check`.
(3) Paralel iş için worktree `../keel-k607` (node_modules ana checkout'a sembolik bağ; orada `npm install` yok).

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-605 spike: Hall 2011 enerji dengesi modeli → **ADR-051** + `arastirma/ham/H12` (denklem 1-9 birincil kaynaktan; "±1,7-2,5 kg" yanlış okunmuştu: gözetimli çalışmaların kısa vadeli MAE'si — gerçek hayatta hata zamanla büyür → aralık modelin belirsizliğinden + taban). `engine/EnergyBalanceModel` saf (RK4, StrictMath), `projection.yaml` 20 parametre (yeni alan PROJECTION) | ✅ #342 birleşti; RED 8; yayımlanmış örnekler (Şekil 3 80±1, kural 1±0,25, 2B yönü, 2A ±4 bandı — Şekil 3 adamıyla 78,1 kg kayıtlı) + **makalenin doğrusallaştırması** (τ %1, kalıcı kayıp %2); inceleme: negatif/NaN alım (85), PAL<1,11 (80) → reddedilir; test analizi: ilk haftalar/η/τAT testsizdi → doğrusallaştırma + sabitleyici; `Math.log` yasağı (`EnginePurityTests`); mutasyon 37/39 + saflık kuralı | #342 | `M6/K-605.md` |
| K-607 SCOFF kapısı (telefon): `projection/scoff.ts` (sonuç, bölge linki, cihaz bayrağı `projection.access`, "unavailable" kesin, çıkışta "clear" gider), `app/scoff.tsx`, `projection.json` (eşik 2, linkler), `en.json › projection` | ✅ #344 birleşti (3 CI yeşil); RED 31+7; inceleme: çift dokunuş iki `back` (85), yazma hatası sessiz (80), "clear" sonraki hesaba taşınıyor (80 → soru 94); test analizi 5 eksik → eklendi; mutasyon 5/5 + kontrol; jest 1764/1764 | #344 | `M6/K-607.md` |
| K-613 projeksiyonun motoru + ucu (K-606'dan bölündü, #343) → **ADR-052**: oturmuş başlangıç, `ShapeProjection` (kapılar + `SAFETY_HOLD` + `OUTSIDE_MODEL`, en az 100 kcal yön, BMI ondalıkta, senaryo = gün payı, aralık bakım ±1 MJ + 2,5 kg, yalnız ileri, haftalık tavan, BMI 18,5), `GET /v1/projection` | ✅ #345 birleşti (DB testleri dahil 3 CI yeşil); RED 3+12+API 4; inceleme 3 bulgu + test analizi 15 yaşayan mutant + 2 gerçek hata → hepsi kapandı; mutasyon 4/4; özellikler 3 koşuda kararlı | #345 | `M6/K-613.md` |
| K-606 projeksiyon ekranı (telefon, #71): anahtar (varsayılan kapalı, SCOFF'tan geçer, okunurken de kapıya bakar), yüzsüz figür (yalnız ileri), üç senaryo aralıkla, feragatname figürün yanında, suçlamasız güncelleme (0,5 kg eşiği, aynı senaryo), İlerleme girişi | ✅ #346 birleşti; inceleme 6 bulgu → kapandı; mutasyon 6/6 + kontrol; 1789/1789 | — | `M6/K-606.md` |

**Part 2 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-605 #342 · K-607 #344 · K-613 #345 · K-606 #346 (auto-merge, üç CI yeşil). `main`'e doğrudan: ADR-050 (+ D1 destek linkleri), backlog bölmesi
  (K-613 #343), DURUM. Açık PR yok. Worktree yalnız kalıcı `../keel-main` (`keel-k606/-k607/-k613` silindi). Yerel artık dal: `engine/70-energy-balance-model`
  (squash'la birleşti; guard `branch -D`'yi engeller, kalabilir).
- **Kontrol çıktısı:** mobil `npm run check` 108 takım **1789/1789** (Node 22); sunucu saf testler yeşil (motor + mimari; K-605 sonunda tam takım 1881 test, 431'i
  Docker'sız düşen DB testi → CI'da yeşil). Mutasyon: K-605 37/39 + saflık kuralı, K-607 5/5, K-613 4/4 (+ analizcinin 45'lik koşusu), K-606 6/6.
- **Backlog:** K-605, K-607, K-613, K-606 `done`; sync ✅.
- **Ortam:** (1) **Repo public** (4 Eki): Actions dakikası bitmişti ($0 bütçe → işler başlamıyor, dal koruması PR'ları kilitliyordu); Levent riskleri okuyup
  public'i seçti (hafıza `repo-public`). Dal koruması aynı (üç kontrol). (2) `git push/pull` osxkeychain'de takılır → `git -c credential.helper=
  -c 'credential.helper=!gh auth git-credential' …`. (3) Telefon testleri **Node 22** (`PATH=~/.nvm/versions/node/v22.14.0/bin:$PATH`); kabuktaki 20'de
  `node:sqlite` yok. (4) Disk **3,4 GB** (önbellekler temizlendi; Docker sanal diski 17 GB, soru 80) → simülatör turu yine yok; K-606 ekranı yalnız testle doğrulandı.
- **Part 3'ün bilmesi gerekenler:**
  - İlerleme sekmesi hâlâ `Placeholder`; içinde **projeksiyon girişi** var (`Placeholder` artık `children` alır, `projection/ProjectionEntry.tsx`). Part 3 sekmeyi
    kurarken bu girişi korumalı. `react-native-svg` artık kullanılıyor (`projection/Silhouette.tsx`) ve Jest'te çalışıyor — K-604 grafikleri de onunla çizilebilir.
  - Cihazda saklanan küçük ayar kalıbı: `expo-sqlite/kv-store` (`KeyValue`), çıkışta unutulacaksa `appServices` çıkış dinleyicisine, oturumsuz başlangıçta
    da temizlenecekse oradaki bloğa ekle. SCOFF bayrağı (`projection.access`) **bilerek** çıkışta "unavailable" kalır.
  - "Ağa gitmediğini gösteren test" kalıbı: K-607 ekran testi (`scoff-screen.test.tsx`) hem `api` sahtesinin hem `global.fetch`'in hiç çağrılmadığını
    `afterEach`'te doğrular — K-601 (fotoğraf yalnız cihazda) için aynısı.
  - Koşullu JSX içindeki dize props metin bekçisine takılır → küçük bileşene al (K-607 `SupportLink`, K-606 `Failed`/`Options`).
  - Motor: `EnergyBalanceModel` (Hall 2011) + `ShapeProjection` saf; `engine`'de `java.lang.Math`'in makineye bağlı fonksiyonları yasak (`StrictMath`).
    Yeni parametre alanı `PROJECTION` (`projection.yaml`), telefon parametreleri `projection.json`.
- **CI gürültüsü (izle):** public'e geçişten sonraki ilk `main` koşusunda `today-screen` ve `workout-screen`'in **ilk testi** 5 sn Jest sınırını aştı
  (soğuk render); aynı ağaç PR'da ve yeniden koşuda yeşil. Tekrarlarsa bu iki dosyada ilk render'a zaman aşımı payı ya da ısınma — kanıtla, tahminle değil.
- **Yeni sorular:** 94-96 (aşağıda).

**Part 3 başı (4 Eki):** senkron tamam — Part 2 ÇIKIŞ git ile tutarlı (#342, #344, #345, #346 birleşik; açık PR yok; worktree yalnız `../keel-main`;
`M6-*-devam` yok). Ana checkout ayrık HEAD 1 commit gerideydi → `origin/main` (ef94a13). Bağımlılıklar `done` (K-406, K-218, K-301). **K-308 hâlâ `doing`**
(cihaz derlemesi yok) → K-601 kamera kılavuzu kod + test + simülatörde galeri yolu; cihaz adımı Levent'te. Dependabot: aynı 3 geçişli uyarı. Disk **4,4 GB**
(npm/brew önbelleği temizlendi; Docker sanal diski 17 GB, soru 80). Bir simülatör (iPhone 16 Pro Max, iOS 18.1) zaten açık.
**K-604 kararı (teknik):** e1RM telefonda **yeni formülle hesaplanmaz** — K-218'in aynası `train/summary.ts › e1rm` (ADR-033'te rekorlar da onu kullanır,
`MobileParameterMirrorTests` sabitleri eşler); kaynak ADR-033'teki geçmiş (sunucu listesi 365 gün + gönderilmemiş). Sunucuya yeni uç açılmadı.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-604 efor grafiği: `progress/strength.ts` (haftanın en iyi e1RM'i, pencere 90 günün içindeki ilk pazartesiden — her hafta tam, halka = aynı yük + aynı tekrar + daha çok RIR), `chartScale.ts` (etiket = çizginin gerçek en az/en çoğu, kendi yüksekliğinde), `StrengthChart`/`StrengthSection` (VoiceOver halkaları söyler), İlerleme sekmesi gerçek ekran (projeksiyon girişi korundu; `Placeholder` silindi); parametreler `evaluation_window_days` (ayna, ayna testinin anahtar listesinde), `effort_call_window_weeks` (2, 03 §5) | ✅ #347 birleşti (CI: saat dilimi fikstürü + soğuk ilk render `beforeAll`'a — today/workout ekranı, 2192 → 14 ms; UTC'de yerel-gün mutantı yaşar, İstanbul'da ölür); RED 10+205+8; inceleme 2 önemli (yarım ilk hafta → pazartesiye hizalı; halkalar VoiceOver'da) + katalog okunmamış metni; test analizi 23/30 yaşayan → testler, yeniden 21/22 (kalan eşdeğer); ayna kontrol mutantı kırmızı; **K1 notu:** kendi birleşmemiş testimde pencere sınırı + sözlü etiket beklentisi incelemeyle değişti; 2032/2032 | #347 | `M6/K-604.md` |
| K-614 (K-601'den bölündü, #348) fotoğraf kütüphanesi yalnız cihazda: `photos/library.ts` (gün-poz adı, aynı gün değişir, hepsini sil), `photoFiles.ts` (belge klasörü `progress-photos/`, `move(overwrite)`), `window.ts` (son fotoğraftan 4 hafta sonra açılır, açık kalır; ilk fotoğraf ilk sekiz haftanın 4. haftası / akış bitti / bilinmiyor → teklif), `PhotoCard` İlerleme'de (hatırlatma kart, bildirim değil — ADR-036); çıkışta, hesap silinince, oturumsuz başlangıçta silinir; Ayarlar çıkıştan önce söyler (`Confirm` çok paragraf) | ✅ #349 birleşti — kod incelemesi: kod hatası yok, iki karar (iCloud/Android yedeği → 97; jeton reddinde sessiz silme → 101); test analizi 19/19 yaşadı: tarama `const { api } = useAppServices(); api.POST`, XHR, alt klasör kaçırıyor; oturumlu başlangıçta silme, jeton reddi/hesap silmede silme, fotoğraf okuma hatasında uyarısız çıkış, ad ayrıştırma (ay/gün ayrı, çapa, 30 Şubat kabul — gerçek hata), çevrimdışı = 'over', bayat hata metni, okuma hatası sessiz → testler + 2 gerçek hata düzeldi (30 Şubat; silinemeyen klasör uygulamayı başlatmıyordu), yeniden 17/17; metin "keel never uploads them" (yedek sorusu 97); RED 14+3+2+8+4; ağ testi: fetch + `File.upload` hiç çağrılmaz + `src/photos` kaynak taraması; sorular 97-99 | #349 | `M6/K-614.md` |
| K-601 rehberli çekim: `app/photo-capture.tsx` (önce ön sonra yan; aynı pozun son fotoğrafı soluk — `photo_ghost_opacity`; çerçeve köşeleri; eğim `photos/tilt.ts` — `expo-sensors` Accelerometer, `photo_level_tolerance_deg`; 10 sn zamanlayıcı; galeri yolu; izin yalnız dokununca), kart "Take photos" + odakta okuma, izin metinleri ilerleme fotoğrafını söylüyor; yeni bağımlılık `expo-sensors` ~57.0.3 (K5: eğim ivmeölçer ister, birinci taraf, Expo Go'da var); `data/parameters/photos.json` | ✅ #350 birleşti — test analizi 42 mutant, 27 yaşadı + **2 gerçek hata**: deklanşöre çift dokunuş iki fotoğraf + iki `back` (meşgul bayrağı çekimden sonra kuruluyordu); galeri hatası sessiz. Diğerleri: geri sayımda yeniden basma, kamera hatası, ivmeölçer aralığı/kapanış yarışı, izin yüklenirken, koyu vizör, NaN derece. **Kod incelemesi:** (95) eğim satırı açık temada koyu-tema renkleriyle (kontrast ~1,4:1); (88) `expo-sensors` eklentisi otomatik `NSMotionUsageDescription` ekliyor — en.json dışı metin, ivmeölçer izin istemez → `motionPermission: false`; (82) çift dokunuş; (80) Kapat'tan sonra geç gelen fotoğraf kaydediliyor + ikinci `back`; (80) galeri hatası. Not: galeri yolu `quality: 1`'de orijinal dosyayı (HEIC + EXIF) kopyalıyor — cihazda kalıyor, V1 ihlali değil → hepsi testle kapandı, yeniden 18/20 (kalan 2 aynı-kare koruması, RNTL'de üretilemez); 2120/2120 | #350 | `M6/K-601.md` |
| K-602 karşılaştırma çıpası: `photos/compare.ts` (aynı pozun son günü + kullanıcının seçtiği geçmiş nokta: Day 1 ya da bir önceki gün), `app/compare.tsx` (poz, çıpa, yan yana / kaydırma — sürükle + VoiceOver ayarlanabilir, `compare_slide_step`), kart "Compare" (≥2 gün); before/after dili yok (test) | ✅ #351 birleşti — kod incelemesi: (85) kaydırmada en son fotoğraf solda, başlıklar değişmiyor → yanlış tarih; (80) "en az 1 hafta" kısa aralıkta yanlış sayı → 7 günün altında gün; sürükleme sayfa kaydırmasına kaçabilir; test analizi 19/23 yaşadı + farklı pozlarda "Compare" bağlantısı (ekran boş diyordu) → testler + aynı-poz kontrolü, yeniden 17/17; 2140/2140 | #351 | `M6/K-602.md` |

**Part 3 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-604 #347 · K-614 #349 (K-601'den bölündü, issue #348) · K-601 #350 · K-602 #351 (auto-merge, üç CI yeşil). `main`'e doğrudan: backlog bölmesi,
  aktarım dosyaları `docs/aktarim/M6/` (README 11-14), DURUM. Açık PR yok. Worktree yalnız kalıcı `../keel-main` (`keel-k601` silindi). Ana checkout ayrık HEAD → `origin/main`.
- **Kontrol çıktısı:** mobil `npm run check` 119 takım **2140/2140** (Node 22, TZ=UTC, 2 işçi); lint 2 uyarı (başka dosyalarda, önceden var). Sunucu: yalnız
  `MobileParameterMirrorTests` + `ParameterProvenanceTests` (yeşil; ayna testine `evaluation_window_days` eklendi). Mutasyon: K-604 21/22 (kalan eşdeğer),
  K-614 17/17, K-601 18/20 (kalan 2 aynı-kare koruması, RNTL'de üretilemez), K-602 17/17.
- **Backlog:** K-604, K-614, K-601, K-602 `done`; sync ✅.
- **Simülatör turu yapılmadı:** disk 2,1-2,4 GB (Jest + npm önbelleği temizlendi; Docker sanal diski 17 GB, soru 80) ve oturum açmak için sunucu/Docker yok. Bir
  simülatör (iPhone 16 Pro Max, iOS 18.1) session başında açıktı, Expo Go kurulu; dokunmadım. Grafik, çekim kılavuzu ve karşılaştırma yalnız testle doğrulandı.
- **CI düzeltmesi (#347 içinde):** `today-screen`/`workout-screen` ilk testi CI'da 5 sn'yi aşıyordu (3 kez): ilk render ölçüldü (2 işçi, önbelleksiz: 2192 ms vs
  sıcak ~200 ms) → `beforeAll`'da bir kez (kendi 30 sn bütçesi), testler 5 sn'de; sonra 14 ms. Saat dilimi: testler artık yerel öğleden kurulur (UTC−10…+14 yeşil).
- **Part 4'ün bilmesi gerekenler:**
  - İlerleme sekmesi gerçek ekran (`app/(tabs)/progress.tsx`): Güç (K-604) → Fotoğraflar kartı (K-614) → projeksiyon girişi (K-606) → koç. `Placeholder` silindi.
    Odakta okuma: ekran ve kart ayrı `useFocusEffect`; test sahtesi hepsini çağırmalı (`progress-screen.test.tsx › mockFocusEffects`).
  - **Fotoğraf yolu:** `services.photos` (`photos/library.ts`, port `PhotoFiles`, gerçek `photoFiles.ts` belge klasörü). K-612 paylaşım kartında **vücut fotoğrafı yok**
    — bu kütüphaneye dokunmamalı. Kaynak taraması (`photo-files.test.ts › HANDLERS/ALLOWED/NETWORK`) fotoğrafı tutan dosyaların ağa erişemediğini zorlar; yeni bir
    fotoğraf dosyası eklenirse listeye girer.
  - K-609 içe aktarma: Strong/Hevy CSV'de e1RM **telefonda yeni formülle hesaplanmaz**; grafik `train/summary.ts › e1rm` (K-218 aynası) ve geçmişi (ADR-033) okur —
    içe aktarılan setler sunucunun antrenman listesine girerse grafik kendiliğinden gösterir.
  - Yeni parametreler: `workout.json › evaluation_window_days` (ayna), `effort_call_window_weeks` (2); yeni dosya `data/parameters/photos.json` (eğim toleransı,
    soluk opaklık, zamanlayıcı, JPEG kalitesi, eğim aralığı, kaydırma adımı — hepsi `urun`, H1 §2.4 / 01 §15).
  - Yeni bağımlılık: `expo-sensors` ~57.0.3; `app.config.ts`'te `motionPermission: false` (ivmeölçer izin istemez; eklenti kendi metnini yazıyordu).
  - Telefon tuzakları (yeni): RNTL 14'te `render` ve `unmount` **asenkron** (`await`); react-native-svg metni Jest ağacında `TSpan › content`'te (`getByText` görmez);
    `process.env.TZ` Jest içinde atanınca etkisiz — saat dilimi testini yerel saatten kur.
- **Yeni sorular:** 97-101 (aşağıda) — 97 (iCloud/Android yedeği), 101 (60 günde jeton reddi tek kopyayı siler) **veri kararı**, önce bunlar.

**Part 4 başı (4 Eki):** senkron tamam — Part 3 ÇIKIŞ git ile tutarlı (#347, #349, #350, #351 birleşik; açık PR yok; worktree yalnız `../keel-main`;
`M6-*-devam` yok). Ana checkout ayrık HEAD 2 commit gerideydi → `origin/main` (936beb5). **K-308 hâlâ `doing`** → Health okuması (K-616) kod + test + Expo Go yolu.
Disk **2,3 GB** (önbellekler zaten boş; Docker sanal diski 17 GB, soru 80) → Gradle yalnız hedefli saf testler, simülatör yok. Dependabot: aynı 3 geçişli uyarı.
Sorular 97/101 cevapsız → Bitiş 2'de.
**K-609 bölündü (teknik, ADR-053):** K-615 sunucu (#352: toplu uç + kaynak işareti + motor içe aktarılanı okumaz), K-616 Health kilo geçmişi (#353), K-609 CSV +
eşleme ekranı (#124). Biçim kaynağı `arastirma/ham/H13` — Strong/Hevy sütun **yayımlamıyor**; gerçek dosya/örnek satırla doğrulanan varyantlar okunur.

| Görev | Durum | PR | Aktarım |
|---|---|---|---|
| K-615 içe aktarılan geçmiş (sunucu): `POST /v1/workout-imports`, `training.workout.imported_from` (V32), `Workout.importedFrom`; motor IMPORT kiloyu ve içe aktarılan seansı okumaz (`TrainingLog` 3 sorgu, `Measurements.dailyWeights`, `latestKg`), trend/listeler gösterir | ✅ #354 birleşti — RED CI: içe aktarılan 3 haftalık kayıp ilk check-in'de `INCREASE_CALORIES 500` veriyordu; uygulama CI'da yeşil. Kod incelemesi: kod hatası yok; (82) ADR-053 metni `source`/LOGGED diyordu, kod `imported_from`/`importedFrom` → ADR düzeltilecek; (75) MeasurementStore yinelenen Javadoc; (60) uygulamada kayıtlı clientId ile içe aktarma testsiz. **Test analizi:** yaşayan — `TrainingLog.workingSets`/`lastSessionBefore` filtresi (program yok → hiç okunmuyor), `latestKg` filtresi (kendi tartısı hep var), 200 set sınırı, null alanlar (400 yerine 500 → kuyruk sonsuz dener), boş liste, reps 101, start==end kabulü, bodyweight 0 kg kabulü, HEVY kaynağının geri okunması, uygulamanın clientId'si; pazartesi 00-01 UTC'de oturum testi boş geçer Not: içe aktarılan seansa sonradan set eklenebilir — motor yine okumaz, ilerleme koşmaz (program günü yok). → Hepsi testle kapandı; kontrol mutantı #355 (dört filtre) CI'da 4 testle öldü | #354 | `M6/K-615.md` |
| K-616 Health kilo geçmişi (telefon): Ayarlar › "Bring in your history", `importHealthWeights` (365 gün → eşitleme penceresinin başı, `IMPORT`, clientId Health kimliği), iki rıza | ✅ #356 birleşti — RED 2+8 (+ tartı ekranı 2); `npm run check` 2153/2153. İnceleme: (95) K-615'ten önce birleşmemeli (birleşti → rebase); (85) **"They'll show in your trend" büyük ölçüde yanlış**: telefondaki tek trend 28 gün, içe aktarma 7-365 gün → geçmişi gösteren görünüm gerek (ADR-018 "geçmiş trend hemen görünür"); (85) içe aktarma tüm kuyruğun gönderilmesini bekliyor (365 istek, 1-2 dk kilitli düğme; ilgisiz bir kaydın hatası "Apple Health okunamadı" der) → arka planda gönder (K1 notu: kendi birleşmemiş testimde `drain` beklentisi değişecek); (85) "iki okuma aynı örneği okumaz" yorumu yanlış — korumayı clientId sağlıyor; ilk karar cümlesi eski kullanıcı için yanlış. Test analizi: 25 öldü; yaşayan — ServicesProvider'da iki rıza bağlantısı, bölüm Ayarlar'dan silinse, `setOutcome(null)`, `disabled={busy}`, kg üst sınırı → hepsi kapandı: arka planda gönderim, tartı ekranında "4 weeks / Year" (`weigh_in_history_days`), ilk 14 gün yalnız kendi tartısı, `bothHealthConsents`; mutantlar uygulanıp öldü; 2164/2164 | #356 | `M6/K-616.md` |
| K-609 Strong/Hevy CSV (telefon): `src/import/` (csv, formats — yalnız H13 başlıkları, match — birebir ya da 3 öneri, build — kg/dambıl/vücut ağırlığı/sınır/SHA-256 kimlik, send), `app/import.tsx`, `MoveRow` (öneri, arama, kendi hareketi), Ayarlar satırı (Expo Go'da da) | ✅ #357 birleşti — RED formats 11, match 9, build 12, send 3, ekran 13 (iskeletle), bölüm 2; sözleşme düzeltmesi (rıza yokken CONSENT_REQUIRED). **Kod incelemesi:** (92) "Pull Up (Assisted)" emin eşleşiyor, yardım ağırlığı ek yük olarak gidiyor (U5 + yanlış veri) → `assisted` ekipman kelimesi olmamalı; (85) kimlik sırası yalnız seti kalan seanslarla sayılıyor → seçimlere göre kimlik değişir (aynı başlangıçlı iki seans karışır); (82) katalog yüklenmeden dosya seçilirse hiçbir şey eşlenmez; (80) gönder eski `built`'i gönderebilir (asenkron yeniden kurulum yarışı, her dokunuşta yeniden SHA); (80) sonradan eşlenen hareketin setleri hiç gelmez (seans "zaten var") — metin söylemiyor; (80) tarama okuyucunun `./send`'i içe almasına izin veriyor; (85) `workout.sets` metni yanlışlıkla değişti ("Sets: 3"). Altında: yeniden denemede Done sayıları, Strong biriminin ön seçili gelmesi (H13 "kullanıcı seçer"), "1 sessions", rıza hatasında ekran takılı. **Ek bulgu (benim):** güç grafiği RIR'sız seti tahmin etmez → içe aktarılan setler grafikte yok, hareket geçmişinde var → ADR-053 düzeltildi, soru 102. **Test analizi:** 160 mutant, 82 öldü, 78 yaşadı (~70 gerçek). Kritik: Hevy lb dosyasında ağırlık hiç doğrulanmıyor; ekran dosyanın birimini değil kullanıcınınkini kullanabilir; dambıl "one"da yarıya bölme yakalanmıyor; kimlikte kaynak/sıra; iki birebir eşleşmede "emin"; bilinmeyen parantez kelimesi. Önemli: reps=1/ondalık, NaN ağırlık, Hevy set tipleri, bitiş<başlangıç, 30 Şubat, kesik başlık, ekipman kelimeleri, öneri sınırı, sınır eşitlikleri, send `+=`, Done sayıları, ConsentRequired, kendi hareketleri eşleşmesi, boş durum, ilerleme/kapalı düğme, tek kollu dambıl sorusu, MoveRow kaydet/reddet/çevrimdışı ve modlar  → hepsi kapandı (assisted kelime, kimlik dosyadan, eşzamanlı gövde, katalog beklenir, birim önceden seçilmez, tarama sıkı, `workout.sets` geri); anahtar mutantlar yeniden öldü; metin bekçisi JSX içi dizeleri yakaladı → değişkene alındı; 2272/2272| #357 | `M6/K-609.md` |
| K-617 jeton reddinde fotoğraflar kalır (ADR-055 › 101): sahip = Apple kimliğinin SHA-256'sı, giriş oturumdan önce sahiplenir, başarısızsa oturum yok; elle çıkış ve hesap silme siler | ✅ #362 birleşti — RED 5 + 2; inceleme: (92) başarısız sahiplenme önceki hesabın fotoğraflarını gösteriyordu → oturumdan önce, başarısız kapan; (82) kayıt temizliği hata verirse fotoğraf silinmiyordu → iç içe finally. K1: K-614'ün 3 testi Levent'in kararıyla. Mutasyon 7/7 | #362 | `M6/K-617.md` |
| ADR-055 metinleri (89 af haftası, 97 "this app never uploads", 100 eski test; arayüzde "keel" kod adı kalktı) | ✅ #361 birleşti; 2271/2271 | #361 | — |
| K-612 paylaşım kartı (birleşti #358, `M6/K-612.md`): `share/card.ts` (kayıt, son karar, güç e1RM ilk→son hafta, kilo yalnız açılırsa), `ShareCard` (SVG, toDataURL), `shareImage` (önbellek → paylaşım sayfası → sil), `app/share.tsx`, İlerleme girişi, `share-forbidden.json` | ⏳ dal `mobile/127-share-card` — RED kart 6, görüntü 3, ekran 5, giriş 1; tipografi bekçisi kart boyutlarını yakaladı → `tokens.type.share*`. **İnceleme:** (85) "last 90 days" etiketi sayılarla uyuşmuyor (ilk nokta 90 gün önce değil) → "since {date}"; (82) Android'de `Share.share({url})` url'yi atar (iOS önce; not); (85) tarama G/Ç'yi yapan ServicesProvider bloğunu görmüyor; (80) son karar kapatılamıyor, güvenlik/LEA kararları ("Your plan pauses here", hızlı kayıp) karta gidebilir → ürün/sağlık sorusu 104; (80) SVG içeriğini söylemiyor. Altında: toDataURL geri çağırmazsa düğme kilitli, çevrimdışı "nothing yet" der, kilo yoksa anahtar anlamsız, kullanılmayan `share.hideWeight`. Mutasyon: 61'de 28 yaşadı (sıra/temizlik, ref, ikinci paylaşım, hata sıfırlama, trend sorgusu, tek nokta, lift seçimi, lb, wrap sınırı, ServicesProvider bağlantısı) | — | — |

**Part 4 ÇIKIŞ = M6 ÇIKIŞ (4 Eki):**
- **Birleşen:** K-615 #354 (kontrol mutantı #355 kapatıldı) · K-616 #356 · K-609 #357 · K-612 #358 · ADR-055 metinleri #361 · K-617 #362 — hepsi üç CI yeşil. `main`'e doğrudan:
  ADR-053, ADR-054, ADR-055, H13, ADR-015 (training → consent), backlog bölmeleri (K-615, K-616, K-617, K-618), aktarım `docs/aktarim/M6/` (README 15-19), M7 prompt'ları.
  Açık PR yok. Worktree yalnız kalıcı `../keel-main`.
- **M6 çıkış kriterleri (yol-haritasi › M6), tek tek:** rehberli fotoğraf ✅ K-601/K-614 (kamera cihazda: K-308) · karşılaştırma ✅ K-602 · kompozisyon mesajı ✅ K-603 ·
  efor grafikleri + iki pencere ✅ K-604 · şekil projeksiyonu (dışlama kurallarıyla) ✅ K-605/K-607/K-613/K-606 · tutarlılık geçmişi ✅ K-608 · geçmiş içe aktarma ✅
  K-615/K-616/K-609 (Health okuması cihazda: K-308) · "kararı ne değiştirir" ✅ K-610 · karar defteri ✅ K-611 · paylaşım kartı ✅ K-612 (toDataURL + paylaşım sayfası
  cihazda görülmedi). Backlog M6: 19 `done`, 1 `todo` (K-618, K-308'e bağlı).
- **Eksik / cihaz adımları (K-308 sonrası):** HealthKit okuma (K-402/K-404/K-616) ve yazma (K-412), kamera (K-601), Apple ile giriş + fotoğraf sahibi (K-617),
  paylaşım kartı görüntüsü (K-612), K-618 yedekten hariç, Apple FM (K-510), widget (K-515), Live Activity (K-426). Simülatör turu M5 Part 3'ten beri yok (disk).
- **Kontrol çıktısı:** mobil `npm run check` birleşmiş ağaçta 133 takım **2338/2338** (K-612 + K-609 + K-616); K-617 dalında 2280/2281 → renk bekçisi düzeltildi;
  CI her PR'da üç kontrol yeşil (sunucu DB testleri dahil).
- **Disk 1,2 GB:** Jest/Gradle/npm önbelleği ve worktree'ler silindi. Kalan büyükler: Docker sanal diski 17 GB (soru 80), CoreSimulator 5,9 GB, başka uygulamaların
  önbellekleri (~4 GB: codex 1,6 GB, Google 0,9 GB, Claude güncelleyici 0,9 GB) — Levent'in kararı. **2 GB altında M7 başlamaz.**
- **M7'nin bilmesi gerekenler:** içe aktarılan veri motor okumalarında yok (`TrainingLog` `imported_from is null`, `Measurements.dailyWeights` IMPORT'suz) — yeni
  bir motor okuması eklenirse aynı kural; giriş akışı fotoğraf sahiplenmesini oturumdan önce yapar (`appleSignIn.ts › claimPhotos`, başarısızsa `PHONE`); metin
  bekçisi JSX çocuğundaki dizeleri metin sayar, renk bekçisi yorumdaki `#101` gibi şeyleri hex sanar; `gh pr edit` eski Projects API'sine takılır → `gh api -X PATCH`.
- **Yeni sorular:** yok (87-104 cevaplı, ADR-055). Açık: 80 (Docker/disk), 57 (rıza metni hukuki bakış).

## Session sonunda Levent'e sorulacaklar
**87-104 → ADR-055 (4 Eki, M6 Part 4 Bitiş; AskUserQuestion — hepsi önerilen).** İş doğuranlar: 89 metin, 100 eski test, 97 metin + K-618 (K-308 sonrası), 101 → K-617, 104 kalıcı.

**M6 Part 4 (102-) — 4 Eki:**
104. **(sağlık/ürün, K-612)** Paylaşım kartında "Latest call" satırı: güvenlik kararları ("Your plan pauses here", hızlı kayıp, düşük enerji) da karta
    girebilir — sağlık sinyali herkese açılır; hızlı kayıp kilo yönünü kilo anahtarı kapalıyken de söyler. Seçenekler: (a) **önerim** güvenlik/düşük
    enerji kararları karta hiç girmez, karar satırının da kendi anahtarı olur (varsayılan açık); (b) karar satırı varsayılan kapalı; (c) olduğu gibi.
102. **(ürün, K-609/K-604)** İçe aktarılan Strong/Hevy setlerinde RIR yok; güç grafiği (e1RM, K-218 Epley + RIR) RIR'sız seti tahmin etmez → içe aktarılan
    geçmiş grafikte görünmez (hareket geçmişinde görünür). Seçenekler: (a) böyle kalsın — sayı uydurulmaz (U1), şimdiki; (b) RIR'sız sete "en az" tahmini
    (RIR=0 → e1RM = yük × (1 + tekrar/30), alt sınır) grafikte ayrı işaretle; (c) içe aktarırken dosyadaki RPE'yi RIR'a çevir (10 − RPE; bu dosyalar için
    doğrulanmadı, çoğu boş). Önerim (a), istersen (b).
103. **(veri/ürün, K-609)** Aynı dosya ikinci kez içe aktarılırsa seanslar "zaten var" sayılır (dosyadan türeyen kimlik); ilk seferde dışarıda bırakılan
    bir hareketi sonradan eklemek o seansları güncellemez. Hevy de "tek içe aktarma, geri al ve yeniden yükle" diyor. Uyguladığım: metin bunu söyler; geri
    alma yok. İstersen: "içe aktarılanı geri al" (sunucuda kaynağa göre silme, küçük iş). Hangisi?

**M6 Part 3 (97-) — 4 Eki:**
97. **(veri dışarı/V1, K-614)** İlerleme fotoğrafları uygulamanın **belge klasöründe** (`progress-photos/`). iOS bu klasörü kullanıcının **iCloud/cihaz
    yedeğine** dahil eder; kurulu `expo-file-system` 57'de "yedekten hariç" ayarı yok. Onboarding metni "never uploaded. Not to us, not to anyone."
    Seçenekler: (a) belge klasörü — kalıcı, kullanıcının kendi yedeğine girer (şimdiki); (b) önbellek — yedeğe girmez ama iOS yer darlığında
    **silebilir** (fotoğraf kaybı); (c) K-308 sonrası küçük yerel modülle `isExcludedFromBackup` (ADR-047'deki ince modül yoluna eklenir). Önerim (c),
    o zamana kadar (a) + metni "never uploaded by this app" yönünde netleştirmek. Hangisi? (İnceleme: Android'de `allowBackup` ayarlı değil —
    varsayılan açıksa Google Drive yedeği de kopyalar [doğrulanmadı]; "There's no other copy" metni de buna bağlı.)
98. **(veri, K-614)** Fotoğraflar yalnız telefonda olduğundan **çıkışta silinmeleri kalıcı kayıp**. Uyguladığım: hesaba ait her şey gibi çıkışta ve
    hesap silinince silinir (sonraki hesap görmesin, sağlık verisi); fotoğraf varsa Ayarlar çıkıştan önce **söyler** ("only on this phone. Signing
    out deletes them from it"). Alternatif: dışa aktarma (fotoğrafları Fotoğraflar'a kaydet) önermek. Onay mı?
99. **(ürün, ADR-036, K-614)** 4 haftalık fotoğraf penceresi **bildirim değil, İlerleme kartı** (üç bildirim türü bütçesi, Levent 29 Eyl). İstersen:
    pencere açıkken pazartesi check-in bildiriminin metnine bir cümle (yeni tür değil) ya da dördüncü tür. Hangisi?
101. **(veri, K-614 incelemesi)** Oturum **sunucunun yenileme jetonunu reddetmesiyle** de biter (60 gün uygulamayı açmamak). Şimdi bu da çıkış sayılır →
    fotoğraflar (tek kopya, "Day 1" dahil) **uyarısız silinir**; sonraki açılış da oturumsuz başlangıçtır (yedekten geri yükleme koruması) ve siler.
    Seçenekler: (A) yalnız elle çıkış + hesap silme + gerçek yeni cihazda sil; jeton reddinde fotoğraflar kalır, sonraki girişte **başka hesapsa** silinir
    (hesap kimliğini telefonda tutmak gerekir; küçük iş); (B) şimdiki gibi (gizlilik öncelikli, diğer tüm hesap verisiyle tutarlı). Önerim (A). Hangisi?
100. **(K1, bilgi)** `copy-keys.test.ts › every tab placeholder has a title and a note` artık eskidi (hiçbir sekme placeholder değil, `Placeholder`
    silindi). Beklenti değişmesin diye `screens.progress.note` anahtarı (kullanılmayan) duruyor. Testi ve dört kullanılmayan notu silebilir miyim?

**M6 Part 2 (94-) — 4 Eki:**
94. **(sağlık, ADR-050 dışı durum, K-607)** Aynı telefonda başka hesap açılınca: ADR-050 "bir kez sorulur" diyor. İnceleme: A "clear" çıkıp çıkış yaparsa
    B hiç taranmadan projeksiyonu açabilir. Uyguladığım (daha sıkı): çıkışta **"clear" unutulur** (sonraki kişi sorulur), **"unavailable" kalır** (kapı
    yeniden açılmaz — B'nin projeksiyonu da kapalı kalır, metin "From your answers…" der). Onay mı, yoksa hesap başına ayrı bayrak mı?
95. **(ürün, ADR-052)** U12'nin "ilk 4 hafta / 2 ölçüm"ünü **ilk ve son tartı arası ≥ 28 gün** diye okudum (iki ölçüm noktası 4 hafta arayla).
    Bel ölçümü şartı da olsun mu?
96. **(ürün, ADR-052)** "%60 uyum" = günlerin %60'ında planın kalorisi, kalanında bakım (ortalama bakım + 0,6 × (hedef − bakım)). Uygun mu?

**M6 Part 1 (87-93) — 4 Eki:**
87. **(K1, bilgi/onay)** Sabitleyen testler bilerek değişti, beklenti değil düzenleme: (a) `ConsistencyApiTests.thisWeeksActions…` `record` tam eşitliği
    `forgivenWeeks: 0` ile genişledi (eski üç değer aynı); (b) K-530'un iki testi (`theProgramsDays…`, `aProgramDayWithoutAWeekday…`) programı
    bu hafta yapıyordu → ADR-049'a göre bu hafta en azla okunur; düzenleme "program geçen haftadan beri yürürlükte" oldu, beklenti (4) aynı;
    (c) beş test `training.program.created_at`'i geri taşırken artık geçmişi de taşıyor. Onay?
88. **(sağlık/ürün, K-603)** Cut'ta kilo pencerede sabit, bel ≥14 gün arayla ölçüm hatasının üstünde düşmüş: spine bugün **kalori düşürür** (G2 K-64
    "kilo ve bel düz" plato der; bel düşerken plato değil). Seçenekler: (a) **önerim** böyle kalsın, sinyal yalnız yanında (şimdiki); (b) bel düşüyorsa
    kalori adımı yerine bir hafta daha bekle (Ross 2000, H1 §1.6); (c) bel düşüyorsa kalori değil "devam".
89. **(ürün, metin)** İlk 8 haftanın `first_weeks.forgiven_week_used` metni "One off week is forgiven; this was that week." diyor; motor koşudaki
    **her** tek kaçışı affediyor (yalnız birini değil). Metin "A single off week doesn't end your run; this was one." olsun mu? (ADR-045 #83 metni olduğu
    gibi kabul etmişti.)
90. **(ürün, K-534)** `rep_ceiling_above_range` = 5 (8-12 aralığında 17 tekrar; kaynaksız seçim). Uygun mu?
91. **(ürün, K-610)** Örnek haftalar: "hedefe doğru" cut'ta kayıp tavanının yarısı (80 kg'da 0,4 kg), bulk'ta payın 1,25 katı; uyum "çoğunlukla
    tutuldu" (`on_track_min_ratio`) / "tutulmadı" (0); antrenman tutuyor/düşüyor. Prototipteki dokunmalı seçim yerine 8 satırlık liste. Uygun mu?
92. **(ürün, ADR-049)** Program hafta içinde değişince Bugün o haftayı **en az** programla sayar; Hedefler yeni sayıyı gösterir (ör. 3 ve 5) — bir
    sonraki pazartesi eşitlenir. Kabul mü?
93. **(ürün, K-611)** Defter yalnız son kararın "Not applied yet" durumunu gösterir; eski bekleyen kararlar durum söylemez (telafi borcu gibi
    okunmasın, U7). Kabul mü?

**Part 2 sağlık kapısı (Part 2 başında AskUserQuestion — cevap ADR'ye; o zamana kadar kapı kapalı):**
- **SCOFF metni:** 5 soru (künye [doğrulanmadı] — Morgan, Reid & Lacey 1999, BMJ olarak bilinir; Part 2 K-605/K-607 başında birincil kaynakla doğrulanacak) — hangi dil/sürüm (İngilizce orijinal mi, onaylı Türkçe uyarlama mı)? `arastirma/ham/H2-projeksiyon.md` §(tarama), `04-faz3-urun.md` satır 270.
- **Pozitifte destek kaynağı:** ülkeye göre (TR / US / genel) — hangi kuruluş, hangi metin; uygulama yönlendirir, teşhis koymaz (U6).
- **Saklama:** SCOFF cevabı saklanmasın (V4 benzeri, döngü cevabı gibi) — yalnız "kapı açık/kapalı" sonucu mu saklanır, o da mı yok?
- **Projeksiyon kapı eşikleri:** 18 yaş altı · BMI<20'de zayıflama yönü · SCOFF ≥2 → özellik açılmaz; varsayılan kapalı (`H2-projeksiyon.md` satır 477, 582). Onay ya da düzeltme.

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

**86 → ADR-048 #5 (3 Eki, Part 4 sonu; önerilen: önce buton, sonra intent).**
**M5 Part 4 (86-):**
86. **(K-515, ürün — ADR-048 #5)** Kilit ekranından kilo girişi: (a) parametreli Siri/Shortcuts intent'i ("Log 82.4 kg" — uygulama açılmadan;
    SDK 58 stabil + Swift `perform()` ister, şimdi yapılamaz) mı, (b) widget'ta uygulamayı tartı ekranına açan buton mu (SDK 57'de
    `expo-widgets` ile, cihaz adımında)? Önerim (b) şimdi, (a) SDK 58 stabil olunca.

**73, 78-85 → ADR-045 (3 Eki, Part 4 başı; hepsi önerilen).** Aşağıdaki liste kayıt içindir.
**M5 Part 3 (78-):**
81. **(K-511, veri dışarı + para — ADR-044 ÖNERİ)** Ölçüm listesi (OpenAI Luna AB, Vertex Flash-Lite eu, Mistral Ministral; Anthropic yedek), kazanma
    ölçütü (şema ≥ %99, konu doğruluğu, sonra maliyet) ve **rıza metni taslağı** onay mı? ZDR hiçbirinde varsayılan değil — başvuru ve (bazılarında)
    tüzel kişilik gerekebilir.
82. **(K-507, ürün)** "Sığar" = önerinin üst ucu, kalanın **orta noktasını** aşmaz; kaçınılan besin **alt dizgiyle** elenir ("nut" → walnuts).
    Uygun mu? (daha cömert: kalanın üst ucu.)
83. **(K-521, ürün/metin)** Risk mesajları (`first_weeks.risk`, `first_weeks.no_training.risk`) ve "7 gün açılmadı" eşiği (`urun`) — taslak.
84. **(K-531, ürün)** Dönüşte yük bir adım geri **ve tekrar aralığın altından**; yalnız ilk seans (ertesi gün normal). Uygun mu?
85. **(K-509, ürün)** Koçun çipleri: günün kendi çipleri (en çok 2) + "Log a meal in words" + "How does this work?" — gün boşsa 2 çip kalıyor
    ("3 çip" kabulü). Uygun mu?

78. **(K-530, ürün)** Programın bazı günleri haftanın gününe bağlı değilse planlanan seans **program gün sayısı** mı (seçilen; `weeksPlanMissed`
    ile aynı sayı), yalnız haftanın gününe bağlı günler mi?
79. **(K-530, ürün)** Program değişince (3 → 5 gün) **geçmiş haftalar** yeni sayıyla mı yargılansın (bugün: tutarlılık ve uyum geriye dönük
    düşer), yoksa her hafta o hafta geçerli olan sayıyla mı (program öncesi haftalara profilin sayısı — ayrı iş)?
80. **(ortam, disk)** 3 Eki öğleden sonra disk **doldu** (boş 0): Docker Desktop'ın sanal diski **17 GB** (`~/Library/Containers/com.docker.docker`).
    Oturumda DB testleri yerelde Docker'la koştu (arka plan ajanı Docker'ı açmış); ben Docker'ı kapattım, npm/Gradle/Jest önbelleklerini
    sildim (yeniden üretilebilir) → ~650 MB. Docker daemon bu boşlukla açılmıyor. **Senin kararın:** Docker'ı açıp `docker system prune`
    (başka projelerin durmuş konteynerleri/imajları da gider) ya da Docker Desktop › Troubleshoot › "Clean / Purge data". O zamana kadar DB
    testleri yalnız CI'da, yerelde Gradle koşmuyorum (bağımlılıkları yeniden indirmek yer ister).

**74-77 → ADR-043 (3 Eki, Part 3 başı).** Aşağıdaki 74-77 kayıt içindir.
**M5 Part 2 (73-):**
73. **(K-430, ürün)** Epley çıkışı seyrek raflarda çok geç ya da hiç gelmiyor: 10 → 20 kg dambılda sıçramak için 10 kg'da ~47 tekrar gerekir;
    oran ~3,4'ü aşınca (5 → 20) gereken tekrar 100'ü (API'nin set sınırı) geçer, hedef tekrar sonsuza tırmanır. Seçenekler: (a) böyle kalsın
    (oran büyükse kullanıcı rafı değiştirir/ekler); (b) gereken tekrar bir tavanı (ör. aralığın üstü + N, ya da 30) aşınca "bu salonda bu
    hareketin sonraki yükü yok" notu ve hedef tekrar orada durur (parametre `urun`, kaynaksız); (c) başka.

77. **(K-508/K-504, veri + ürün)** (i) Günlük kota sayaçları (`subscription.daily_use`) her aktif gün için bir satır olarak **süresiz**
    kalıyor; yalnız bugünkü okunuyor. Önerim: dünden eskisini her gece sil (amaçtan fazla veri tutmamak; dışa aktarma da küçülür).
    (ii) Serbest metinden öğün (`/v1/meals/parse`) şimdilik **koç mesajı** kotasından düşüyor (günde 25). Ayrı bir sayaç mı olsun
    (ör. günde 15 öğün metni), yoksa böyle mi kalsın?
76. **(K-505/K-506, ürün — koçun sesi)** Model serbest cümle yazıyor; cevabı kalıplarla (regex) denetliyoruz. Ölçüm: açık tavizler
    düşüyor ama **ince dalkavukluk geçiyor** ("It's up to you", "the call can wait" — 14/14) ve **doğru cevapların çoğu yanlışlıkla
    düşüyor** ("The call stays the same" — 14/14; kullanıcı o zaman hep motorun hazır cümlesini görür). Kalıp yarışı bitmez. Seçenekler:
    (a) **önerim** — model serbest cümle yazmaz: mesajı sınıflandırır (açlık, zaman, tartı şüphesi, hız, motivasyon, soru…) ve kararın
    ilgili gerekçesini seçer; cevap ürün metninden kurulur (U2 yapısal olarak korunur, maliyet düşer, ses biraz daha kalıp); (b) serbest
    metin + kalıplar (bugünkü; sınırı yukarıdaki gibi); (c) serbest metin + ikinci bir model hakem (maliyet 2×, gerçek sağlayıcı gerekir).
    Yayında gerçek sağlayıcı yokken risk yok; K-509 (sohbet ekranı, Part 3) bu cevaba göre kurulur.
75. **(K-524, ürün/sağlık)** Moladan dönüş yükü: literatür ilk seansın önceki yükün yüzde kaçı olacağını hiç test etmemiş; antrenmanlı
    gençte 14 günlük arada 1RM düşmüyor (Hortobágyi 1993, Hwang 2017). Güray G7 K-72 "molanın ardından tam yüke dönülmez, yavaş girilir"
    diyor ama sayı vermiyor. Motor şu an yükü düşürmüyor (sayılı kural yok). Seçenekler: (a) böyle kalsın — kısa molada literatürle
    uyumlu; (b) K-72'ye sayı ver (ör. ilk seans bir motor adımı geri) — ürün kararı, kaynağı "Güray K-72 + ürün"; (c) mola ≥ 3 hafta
    ise bir adım geri, kısa molada değil. Ayrıntı `arastirma/ham/H9-donus-minimum-doz.md` §1, ADR-038 #7.
74. **(K-527, ürün)** Kaçan seans artık programın günlerine bakıyor; ama haftalık tutarlılık (planlanan seans sayısı), ilk 8 hafta ve hedefler
    hâlâ **profilin** gün sayısını kullanıyor. Programı 4 güne kurup profilde 3 gün diyen kullanıcıda iki sayı farklı. Seçenekler: (a) hepsi
    programın günlerine geçsin (önerim — plan programdır; haftalık kararın girdisi değişir, o yüzden soruyorum); (b) böyle kalsın.

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
- **UI/UX geri bildirimi (7 Eki, ilk gerçek cihaz deneyimi — Levent):** "isteğimin uzağında"; onboarding sekansında karmaşa; koyu tema iç karartıcı, açık tema nerede bilinmiyor (uygulama iPhone ayarını izliyor, uygulama içi seçici yok — ADR-016); yazılar çok fazla ve çok düz, "insanlar kullanmaz". Kırpılacak ve düzeltilecek çok iş var. → Cihaz turundan sonra ayrı bir UI/UX revizyon oturumu: ekran ekran envanter, metin azaltma, onboarding sadeleştirme, tema seçimi; görsel dil ADR-016 yeniden ele alınır (Levent onayı).
- **M10: Claude Startups başvurusu** (6 Eki duyuru; 1.000 $ API kredisi 6 ayda yanar, 1 yıl Claude Team, ortak indirimleri, Applied AI ofis saatleri). Şart: alan adıyla eşleşen şirket e-postası → ürün adı/alan adı (M10) sonrası. Krediyi koç sağlayıcısı netleşmeden alma (V2).
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
- **GDPR Md. 27 AB temsilcisi (ADR-059 Ek 1):** AB'de yayın + sağlık verisi → temsilci gerekebilir (ücretli). Karar M10'da (ülke listesi).
- **Yasal metinler avukattan geçmedi (ADR-059 #1, Levent'in kararı):** gizlilik politikası, şartlar, feragatname agent'ın resmî kaynaklardan
  yazdığı metinler; sağlık verisi (GDPR Md. 9) + AB kullanıcısı varken hata riski Levent'te. İnceleme her an eklenebilir.
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
