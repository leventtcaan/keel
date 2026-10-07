# M9a · Yeni yüz — kod (dört part; ortak kurallar + part prompt'ları)

> Faz 5 Part 3 (7 Eki) çıktısı. Kararlar ADR-069..078, kurallar `plan/yeni-yuz-kurallar.md`, kartlar `plan/backlog.yaml › M9a` (K-951..K-984 + K-910).
> Görsel ve akış referansı prototip: `prototip/yeni-yuz.html` (artifact https://claude.ai/artifact/RzN9fM7BLhDrHjUMntmkXK, sürüm 3), ekran
> kimlikleri `#id`, akış senaryoları `prototip/akis-testi.md`. Hafıza: `DURUM.md › ## M9a ilerleme` (yoksa aç).

## Part'lar (bağımlılık sırası)
| Part | Görevler | Not |
|---|---|---|
| 1 · Temel + motor | K-951, K-952, K-953, K-954, K-955, K-958, K-960, K-961, K-962, K-963 | Motor kuralları `kural-ekle` ile (R1-R4). K-953 K-909'u kapatır |
| 2 · Sunucu + onboarding | K-956, K-957, K-959, K-964, K-965, K-966, K-967, K-968, K-983 (Levent) | K-983 Part 2 başında Levent'e: App Store Connect'te 2 hafta |
| 3 · Ana ekranlar | K-969, K-970, K-971, K-972, K-973, K-974, K-978 | Oturum üç parça: A → B, C |
| 4 · Kalan + kapanış | K-979, K-980, K-981, K-982, K-975, K-976 (Levent: Facebook App ID), K-977 (L: böl ya da v1.x'e — Levent'e sor), K-910, K-984 | K-984 TestFlight + Levent cihaz turu |

## Senkron kuralı (her part'ın BAŞINDA — atlanmaz)
1. `oturum-baslat` (DURUM + son 3 oturum + git + açık PR'lar + Dependabot).
2. `DURUM.md › ## M9a ilerleme`: önceki part'ın **ÇIKIŞ** bloğu git ile doğru mu (`gh pr list --state merged --limit 20`, `git worktree list`, `main`
   temiz mi)? Yarım part ya da `YENI-YUZ-partN-devam.md` varsa önce onu bitir. Çelişkide git doğrudur. Ana checkout ayrık HEAD'se `origin/main`'e çek.
3. Part görevlerinin `depends_on`'ı `done` mı? Değilse dur, DURUM'a yaz.
4. Disk: `df -h ~` (5 GB altı → önbellekler; 2 GB altı → dur, sor). DB testleri yalnız CI'da (hafıza: disk-docker-ajan).

## Senkron kuralı (her part'ın SONUNDA)
`DURUM.md › ## M9a ilerleme` altına **"Part N ÇIKIŞ (tarih)"**: birleşen görevler + PR no · açık PR/worktree · kalan iş · sonraki part'ın bilmesi
gereken teknik kararlar (dosya yolu ile) · yeni sorular. Backlog `status` + `python3 tools/sync_backlog.py --apply`. `main`'e commit + push. Kısa Türkçe
özet ver, sonraki part'ın prompt'unu ver ve dur (hafıza: toplu-mod).

## Bağlam koruması (hafıza: baglam-devri, tas-partlara-bolme)
Her görev bitince DURUM tablosu; bağlam dolmaya yaklaşırsa görev sınırında dur, yarım işi dalında commit + push, `YENI-YUZ-partN-devam.md` + DURUM ›
DEVAM NOKTASI. Arka plan ajanı paneli paylaşırsa her ajana kendi sekmesi, her çağrıda `tabId` (hafıza: paralel-ajan-tarayici).

## Her görev döngüsü (ADR-079: aktarımsız; kalite kapıları değişmez)
gorev-baslat → test önce (geçerli RED: assertion) → kod → `npm run check` (Node 22) / saf testler (`DOCKER_HOST=tcp://127.0.0.1:1 ./gradlew test
--tests ...`; DB testleri CI'da) → `tools/anayasa-denetimi.sh` → ekranlarda simülatörde kendin doğrula (iki tema; odak modu koyu) ve prototiple yan
yana karşılaştır → pr-review-toolkit (code-reviewer + pr-test-analyzer) → bulgular TDD ile → PR (gövdede K10 özeti + kabul ↔ test)
`gh pr merge --auto --squash` (inceleme bitmeden auto-merge yok) → DURUM › M9a ilerleme. **Aktarım dosyası yok (ADR-079);** token koda gider.

## Kararlar ve sınırlar
- **Prototip değil ADR kazanır.** Prototipten bilerek ayrılan değerler (ADR-071): kardiyo örnek kişide **3 × 30 dk** (ADR-074), 1. hafta "3 değil 2 gün"
  **yok**, kaçan seans taşınır (ADR-077 #4), hoş geldin örneklerinde "2 days, not 3" yok, program incelemesi 4 seti işaretlemez (R1).
- **Telefon kural işletmez:** seans içi öneriler sunucunun önceden hesapladığı alanlardan (ADR-075 #3); ilerleme ve kutlama özetleri sunucudan (K-965).
- **Kaynaksız kural yok:** "aralığın altı → hafiflet" için kaynak bulunamazsa özellik yok (R3). YAG25 kuralları yalnız solo kaynakla çelişmezse.
- Metin: `en.json`, İngilizce, uzun/orta tire yok, kelime bütçesi (K-952), kişi adı yok (kaynak türü "Coaching rule"), tıbbi dil yok, aralık "610-720".
- Kod silinmez: inen ekranların rotası girişsiz kalır (ADR-069 #3).
- Yeni bağımlılık yalnız `react-native-share` (K-976, ADR-076); başka bağımlılık gerekirse gerekçe + ADR.
- **Levent'in adımları** (görev başında AskUserQuestion, engellemeyen işe geç): K-983 App Store Connect tanıtım teklifi · K-976 Meta geliştirici hesabı
  ve Facebook App ID (değer sohbete değil, `app.config`'e ortam değişkeniyle) · K-977 v1 mi v1.x mi · K-984 cihaz turu.
- Commit/PR'da AI imzası, araç adı, Co-Authored-By yok.

---

## Part 1 prompt'u
```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod, baglam-devri, tas-partlara-bolme).
M9a (yeni yüz) dört part; bu PART 1 · Temel + motor. Ortak talimat plan/oturum-promptlari/YENI-YUZ-kod.md — önce onu oku ve harfiyen uygula.
Hafıza DURUM.md › "## M9a ilerleme"de (yoksa aç); sohbete güvenme. Part'ı baştan sona uygularsın; aktarım yok (ADR-079), odak ürünü kaliteyle bitirmek.
Önce oku: ADR-069..078, plan/yeni-yuz-kurallar.md, plan/backlog.yaml › M9a kartları.
Sıra: K-951 → K-952 → K-953 → K-954 → K-955 (kural-ekle R1) → K-958 (R2) → K-960 (R3; aralık altı kaynak araması) → K-961 → K-962 (R4) → K-963.
Bitiş: "Part 1 ÇIKIŞ" + kısa Türkçe özet + Part 2 prompt'u. Session KAPANMAYACAK.
```

## Part 2 prompt'u
```
oturum-baslat. Toplu mod. M9a PART 2 · Sunucu + onboarding. Ortak talimat plan/oturum-promptlari/YENI-YUZ-kod.md (senkron kuralı başta).
Başta AskUserQuestion: K-983 (App Store Connect'te yıllık ve aylık abonelikte 'Free, 2 weeks' tanıtım teklifi — Levent yapar).
Sıra: K-956 → K-957 → K-959 → K-964 → K-965 → K-966 → K-967 → K-968. K-983 sandbox kontrolü Levent bitirince.
Bitiş: "Part 2 ÇIKIŞ" + özet + Part 3 prompt'u.
```

## Part 3 prompt'u
```
oturum-baslat. Toplu mod. M9a PART 3 · Ana ekranlar. Ortak talimat plan/oturum-promptlari/YENI-YUZ-kod.md (senkron kuralı başta).
Sıra: K-969 → K-970 → K-971 → K-972 → K-973 → K-974 → K-978. Her ekranı simülatörde iki temada prototiple yan yana doğrula;
akış testi senaryoları (prototip/akis-testi.md) uygulamada da yürür.
Bitiş: "Part 3 ÇIKIŞ" + özet + Part 4 prompt'u.
```

## Part 4 prompt'u
```
oturum-baslat. Toplu mod. M9a PART 4 · Kalan + kapanış. Ortak talimat plan/oturum-promptlari/YENI-YUZ-kod.md (senkron kuralı başta).
Başta AskUserQuestion: K-976 Facebook App ID hazır mı (Meta geliştirici hesabı Levent'te) · K-977 (hareketli çıkartma/videoya gömme) v1 mi v1.x mi.
Sıra: K-979 → K-980 → K-981 → K-982 → K-975 → K-976 → (K-977 bölünür ya da ertelenir) → K-910 → K-984 (TestFlight; Levent cihaz turu).
Bitiş: "Part 4 ÇIKIŞ = M9a ÇIKIŞ" + özet + sıradaki: M9 Part 3 (beta kohortu, K-904) prompt'u.
```
