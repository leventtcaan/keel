# M9a Part 2 — devam (8 Eki akşam, Levent'in isteğiyle sağlıklı noktada durdu)

Önce: `oturum-baslat` + DURUM › M9a ilerleme. Çelişkide git doğrudur (`gh pr list --state open`).

## Birleşenler (8 Eki)
K-956 #462 (V39) · K-957 #460 · K-959 #464 (V40) · K-964 #472 (V41) · K-965 #469 · K-966 #461 #463 · K-967 B1 #474 · K-968 #473 #477 ·
K-985 #470 · K-987 (651dd851) · K-989 #478 · #481 (ob-type bütçe satırı). Sıradaki göç V42.

## Açık
- **#475 K-967 B2 (paywall):** inceleme temiz, CI yeşil, auto-merge açık. Birleştiyse K-967 `done`.
- **#479 K-968 "Type it in" düzenleyicisi:** iki inceleme düzeltildi, CI yeşil (303af97f). **Levent'in prototip onayını bekliyor** (`#ob-type`, artifact).
  Onay gelince: `gh pr update-branch 479` → `--auto --squash` → K-968 `done`. Prototip tur 2'de "Type it in" tek boş günle başlıyor; app de öyle.
- **Prototip tur 2 (ajan çalışıyordu):** `prototip/yeni-yuz.html` ana checkout'ta **commitlenmemiş değişiklik** olabilir → `git status`; doluysa
  `node` sözdizimi + `cd apps/mobile && npx jest src/__tests__/copy-budget.test.ts` → commit → artifact'i yeniden yayımla (RzN9fM7BLhDrHjUMntmkXK) →
  Levent'e "bak" de. `prototip/kullanici-testi.md`'ye "Tur 2" bölümü ekleniyordu. Yerel önizleme: `.claude/launch.json` "prototype" (8791, scratchpad/proto).
- **Levent'e:** #479 için `#ob-type` onayı.

## Kalan Part 2 işleri (kart var)
K-986 rıza ikinci yürüyüş · K-990 ilk karar tarihi sunucudan (K-989 yanıtına ekle) · K-991 sabit tekrar 5×5 (Levent 8 Eki) · K-988 kilo değişimi (Part 3) ·
K-983 Levent ASC'yi yapınca sandbox. Sonra "Part 2 ÇIKIŞ" + Part 3 prompt'u (Part 3 görevlerine `prototip/kullanici-testi.md` notları girer).

## Bu oturumun kararları (ADR/dosyada)
ADR-070 Ek 1, ADR-077 Ek 1 KABUL · ADR-035 Ek 1 (OWN programda kendi hareketi) · ADR-072 Ek 1 (`/v1/targets/starting`) · ADR-073 Ek 1-3 · ADR-074 Ek 1
(HIIT sayılır, koçun varsayılanına dön) · ADR-075 Ek 2 (rekor = baskın olmayan set) · şablonlar incelemeye uyar, 1 gün = 6 bileşik × 4 (K-985) ·
yeni hareket 3 set (R6) · bilinmeyen ekipman süzülmez · "Type it in" ayrı adım sayılmaz (≤12 ekran).

## Dersler
- `strict: false`: birleştirmeden önce `gh pr update-branch N` (CI birleşik halde koşsun).
- Prototip, `copy-budget.test.ts`'in girdisi: ekran ekleyen prototip değişikliği önce `word-budgets.json` satırıyla.
- İnceleme ajanı ana checkout'ta checkout yapmaz; doküman push'undan önce `HEAD == origin/main`.
- Kullanıcı gözüyle yürüyüş (persona) mekanik akış testinin yakalamadığını yakalar; UI işinde her prototip turundan sonra.
