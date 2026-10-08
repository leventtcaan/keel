# M9a Part 2 — devam (8 Eki, kullanım sınırında kesildi)

Önce: `oturum-baslat` + DURUM › M9a ilerleme › Part 2 tablosu. Çelişkide git doğrudur (`gh pr list --state open`).

## Açık PR'lar (hiçbiri birleştirilmedi; birleştirmeden önce dal güncel main'de + CI yeşil — `strict: false`, `gh pr update-branch N` sonra `--auto --squash`)
- **#472 K-964** (V41): bitti, auto-merge açık (8 Eki) → birleştiyse backlog `done`.
- **#474 / #475 K-967** (B1 / B2, B2 #474'e yığılı): inceleme bulguları ajana gönderildi (öldür-devam işareti + testler a-f, paywall ≤70 kelime, ay sonu ücret tarihi, rızasız 3. satır, Monday yalnız pazartesi, küçükler). Bitince kısa yeniden inceleme → birleştir; sonra B2'yi main'e taşı.
- **#473 / #477 K-968** (+ 3. PR "Type it in" düzenleyicisi `mobile/431-type-it-in` yapılıyordu): #473/#477 incelemesi koşuyordu — sonucu yoksa yeniden başlat (`scratchpad` brifleri kayboldu: ortak brif ve inceleme brifi için bu dosyanın sonuna bak).
  K-967 ile dikiş: `draft.ownProgram` doluysa hazırlık `generate` çağırmaz, yalnız profil + başlangıç ağırlıkları.
- **K-989 #478** (`GET /v1/targets/starting`, salt okuma, `firstPlan` ile aynı sayı; `observationDays` erkek 14 / kadın 28 → metin '14' sabit olamaz): incelenmedi → inceleme ajanı + `ContractTests` tek sayı listesine `StartingTarget.targetKcal` eklendi (hedef, U5 izinli; K1 onayı agent'ta, gerekçe PR'da) + ADR-072 Ek (teknik). Sonra K-967'ye kalori satırı. Sonra K-967 plan ekranına kalori satırı + "14 gün" satırı.

## K-968 son durum (8 Eki)
#473 → sonra #477 ve #479 ("Type it in", `src/train/ProgramEditor.tsx`, K-970 yeniden kullanır), üçü #473 dalına yığılı; inceleme düzeltmeleri yapıldı, CI yeşil.
#479 incelenmedi. K-967 entegrasyonu (kendi dalında generate yok, ağırlık adımı programdaki hareketler, plan'da kendi hareket adları, 9 adım) ikinci birleşen PR'da.
Levent'e: elle girilen harekette başlangıç set sayısı 3 (`program_new_move_sets`, urun).

## Yeni iş (henüz kart yok)
- **İlk karar tarihi sunucuda** (K-967 incelemesi madde 4): sunucu ilk haftayı hesap açılışından sayıyor, telefon onboarding bitişinden; "current check-in" hemen sunuluyor. Sunucu ilk karar tarihini göndersin (K-989 sözleşmesiyle), ilk hafta onboarding bitişinden başlasın, o tarihe kadar check-in tutulsun. Kart aç (K-990).

## Kalan Part 2 sonu
K-986 (rıza ikinci yürüyüş) · K-983 sandbox (Levent ASC'yi yapınca) · backlog `done` + sync · DURUM "Part 2 ÇIKIŞ" · Part 3 prompt'u (K-988 Part 3'te; K-970 "Type it in" düzenleyicisini yeniden kullanır).

## Kurallar (bu oturumda öğrenilen)
- Göçlü PR'lar sırayla: V41 (#472) sıradaki; Flyway outOfOrder kapalı, numara boşluksuz.
- İnceleme ajanı ortak checkout'ta asla `git checkout` yapmaz (bir kez yaptı, test commit'i PR'sız main'e düştü). Doküman push'undan önce `HEAD == origin/main` kontrolü.
- Üretilen programlar artık inceleme önerisi almaz (K-985): öneri uygulayan testler kendi programını ya da 6 günü kullanır, öneriyi türüyle seçer.
- Her uygulayıcı ajana: TDD, sözleşme ayrı commit + schema.ts, DB testleri yalnız CI, AI imzası yok, birleştirme yok; her PR'a inceleme ajanı.
