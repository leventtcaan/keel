# Faz 5 · Part 3 — prototipten ADR'lere ve görev kartlarına (kod yok) — session prompt'u

Part 2 bitti: prototip tur 3 Levent onaylı (7 Eki), akış testi 10/10. Artifact https://claude.ai/artifact/RzN9fM7BLhDrHjUMntmkXK (kaynak
`prototip/yeni-yuz.html`). Bu session **kod yazmaz**; çıktısı ADR'ler + backlog görev kartları + kod session'ının prompt'u.

```
oturum-baslat. Bu session Faz 5 Part 3 · yeni yüzün ADR'leri ve görev kartları. Kod yok.
Önce oku: DURUM.md (Şu an + DEVAM NOKTASI), plan/faz5-rota.md §8 (son madde), prototip/tur2-strateji.md (tur 2 + tur 3 bölümleri),
prototip/envanter.md, prototip/akis-testi.md, arastirma/ham/M5-renk-olcumu.md, ADR-069, ADR-016, ADR-054, ADR-058, docs/anayasa.md §U.
Prototipi gerektiğinde `Artifact read` ile aç (yeni-yuz.html yerelde de var).

Sırayla:
0) Levent'e (AskUserQuestion): deneme 2 hafta onayı; Meta App ID (Story) zamanı; 06 §7 kalanları B1 (telafi tanımı), B3 (rekabet),
   B9 (pazarlamada önce/sonra yasağı açıkça), B12 (dış paylaşım imzası).
1) ADR'ler (skill karar-yaz; ürün olanlar Levent onayıyla): görsel dil (ADR-016 yerine: turkuaz, açık zemin, koyu odak modu, tipografi,
   tire yok) · teklif iki ritim + onboarding (deneyim, kendi programı, başlangıç ağırlıkları, plan hazır, Health anında) · program incelemesi
   (K-11, K-21, K-22, K-36) · kardiyo reçetesi (G2 K-29..K-36, Ç-4 kararı) · oturum (analiz satırı, çok ağır/aralık altı G1 #61, kalibrasyon
   G1 K-5, duraklat/sonra doldur/düzelt) · geç kayıt sayar (U7 yorumu) · paylaşım (ADR-054 yerine: çıkartma + foto/video, karar paylaşılmaz,
   IG Stories teknik yolu) · deneme süresi (ADR-058 eki) · "neden" katmanı ve karar ekranı · ilerleme (hedefler, kas haritası, efor satırı).
2) Kural işleri için parametre/kaynak listesi (kural-ekle kod session'ında): kardiyo, program incelemesi, kalibrasyon, aralık altı, 1. hafta davranış ayarı (B4).
3) plan/backlog.yaml → "M9 ara · Yeni yüz" kilometre taşı: görev kartları (kabul kriteriyle, ekran ekran; prototipteki #id'ler referans),
   bağımlılık sırası; tools/sync_backlog.py --dry-run sonra --apply.
4) Kod session'ının prompt'u (plan/oturum-promptlari/YENI-YUZ-kod.md), DURUM + oturum günlüğü.
Bitiş: DURUM + sıradaki tek adım. Bağlam dolmadan dur (DURUM › DEVAM NOKTASI).
```
