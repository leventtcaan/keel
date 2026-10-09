# M9a Part 3 · devam (9 Eki, Levent'in token sınırında duraklatıldı)

Aynı session'da sürer: düzenleyici (ana oturum) paralel ajanlarla. Hafıza `DURUM.md › ## M9a ilerleme › Part 3 başı` tablosu; çelişkide git doğrudur.
Ortak talimat `plan/oturum-promptlari/YENI-YUZ-kod.md`; uygulayıcı ajan talimatı scratchpad `brief.md` (yoksa bu dosyadaki "Ajan kuralları"ndan yeniden yaz).

## Devam ederken ilk adımlar
1. `git fetch` · `gh pr list --state open` · `gh pr view <n> --json state` (aşağıdaki PR'lar). Ana checkout ayrık HEAD = `origin/main`.
2. Duraklatılan dört uygulayıcı ajana (K-969, K-970, K-971, K-995) "devam" mesajı; her biri raporunu verdiyse oradan, vermediyse dalının son commit'inden.
3. Bekleyen iki inceleme (#505, #506) sonucunu işle → bulguları ilgili ajana.
4. Simülatör düzeneği: `../keel-sim` + scratchpad `sim/` (fixture 8790, Metro 8081). Süreçler öldüyse `sim/run.sh <dal> <senaryo>` yeniden kurar.

## PR'lar (duraklatma anı)
| PR | Görev | Durum | Sıradaki |
|---|---|---|---|
| #494 | K-969 şerit + kahraman | inceleme bulguları ajanda (4 madde) | düzeltme → rebase → birleştir |
| #501 | K-969 bugünün kartı + yemek | inceleme + simülatör bulguları ajanda (6 madde) | #494'ten sonra, tabanı main'e |
| #500 | K-971 aktif set | inceleme (birim karışıklığında adımlayıcı takılıyor) + simülatör (aktif set ekran altında, "75.0", eksi simgesi) ajanda | düzeltme → birleştir → K-972'ye geç |
| #506 | K-970 Edit | inceleme sürüyor; simülatör (own-program) bakılmadı | bulgular → birleştir; PR 4 kardiyo ajanda |
| #505 | K-995 A (FULL/UNDO, Program.today, movedFrom/undoable/workout, V44) | inceleme sürüyor | birleşince K-969/K-970'e "Undo + bitmiş seans + Continue sunucudan" ek PR |
| (dal) | K-995 C taşı önizlemesi `training/491-move-preview-c` 5590624a (#505 üstünde, göçsüz; `WeekSession.movePreview`, ADR-073 Ek 6) | push'lu, PR açılmadı | kalan: API testi, anayasa, gövde; A birleşince rebase + aç |
| — | K-995 B PATCH /v1/program | **kod yok, tasarım hazır** (ajanın raporu: tam program gövdesi kimliklerle; satır id korunur; hareket/tekrar değişirse hedef silinir, set değişirse kalır; `PlannedExercise.id`, `AppliedReviewChange.kind`; V45 `program_review_change.kind` REVIEW/EDIT + suggestion nullable) | C'den sonra |
| #503 | infra/502 | **başka oturumun**; dokunma | |

Birleşenler: #490 K-994 · #492 K-992 · #493 K-970 kart+Change · #495 K-970 swap · #497 oturum WeekSession'dan · #498 K-996 · #499 K-971 odak modu.

## Kalan sıra (Part 3)
K-969 bitir → K-970 PR 4 + K-995 ek PR → K-971 (#500) → **K-972 → K-973** (aynı ajan, aynı ekran) → K-974 → K-978 → K-988 → K-993 → K-997 →
K-995 B, C (taşı önizlemesi) → part sonu: 6 personalı kullanıcı-gözü yürüyüşü (`prototip/kullanici-testi.md` yöntemi, simülatör düzeneğiyle) → Part 3 ÇIKIŞ.

## Levent'e sorulacaklar (part sonunda toplu, AskUserQuestion)
1. **Split seçimi** (K-995): her gün sayısının tek şablonu var; gerçek seçim için yeni şablonlar (3 gün FB, 4 gün FB, 3 gün PPL…) koçluk içeriği. Yapılsın mı, ne zaman?
2. **Koç soruları (K-520) ve ilk haftalar risk mesajı (K-521)** yeni Bu hafta'da yüzeysiz kaldı (ADR-077 #1 tek kahraman). Kalksın mı (ADR eki), yoksa yer mi?
3. Bilgi: Bu hafta'daki "Allow" rızayı doğrudan vermiyor, Ayarlar'a (rıza metni) götürüyor (prototipte doğrudan veriyordu).
4. Bilgi: dinlenme sayacı ileri sayıyor, 2:00-3:00 bandı (G1 K-49); bitirme düğmesi "Ready".
5. Bilgi: ADR-075 Ek 3 (seans başlangıcı Start anı); K1 notu #505 (mevcut bir API testi daha sıkı hale geldi, gevşemedi).

## Ajan kuralları (brief.md özeti)
Ayrı worktree, ana checkout'a dokunmaz · node_modules sembolik bağ (npm ci yok, disk dar) · Docker yok: saf testler yerelde, DB testleri CI · simülatörü kullanmaz ·
TDD (assertion RED) · metin en.json, tire yok, kelime bütçesi · telefon kural/tarih işletmez · ≈≤400 satır, gerekirse PR'a böl · Conventional + (#issue), AI imzası yok ·
auto-merge yok (düzenleyici açar) · rapor: PR, kontroller, kabul ↔ test, kararlar, simülatör için uçlar/durumlar.
Süreç dersleri: yığılı PR + squash → üstteki PR'ı yalnız kendi commit'leriyle `origin/main`'e rebase; aynı anda en çok 3 uygulayıcı; birleştirmeden önce
`gh pr update-branch`; tam jest yük altında meal/onboarding zaman aşımına düşer → `-i` ya da `-w 2 --testTimeout=20000` ile yeniden.
