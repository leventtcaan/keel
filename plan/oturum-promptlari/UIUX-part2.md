# Faz 5 · Part 2 — yeni yüzün prototipi (ADR-067, ADR-068, ADR-069) — session prompt'u

Part 1 (araştırma) bitti: `arastirma/06-faz5-yuz.md` + `arastirma/ham/M0-M4`. Yön ve kapsam kararı verildi: **ADR-069**, rota `plan/faz5-rota.md`
(odak salonda ağırlık çalışan; vaat "haftanın kararı ve nedeni"; 3 sekme + tek "+"; başlangıç kararı; inen ekranlar listede). Bu session **kod yazmaz**.

```
oturum-baslat. Bu session Faz 5 Part 2 · yeni yüzün tıklanabilir prototipi (ADR-069). Kod yok.
Hafıza: DURUM.md (Şu an + Faz 5 ilerleme), hafıza arayuz-once-prototip.
Önce oku: plan/faz5-rota.md (tamamı — kes/değiştir/ekle/kalsın), ADR-069, arastirma/06-faz5-yuz.md §3-§6,
ADR-016 (görsel dil, yeniden ele alınacak), arastirma/ham/L2-gorsel-kimlik.md (§0, §8 RUBİN), docs/anayasa.md §U,
data/copy/en.json (bugünkü metin, yeniden yazılacak), docs/aktarim/M9/cihaz-kontrol-listesi.md.

Sırayla:
0) Levent'e tek seferde (AskUserQuestion): 06 §7 B4 (1. hafta anı davranış verisinden mi), B11 (kararı kabul/ret), B13 (deneme/paywall teklifi),
   B8+B10 (paylaşım kartında ne var). Cevaplar → plan/faz5-rota.md §8.
1) Ekran listesi → prototip/envanter.md: rotadaki iskelete göre her ekran (kalan, birleşen, yeni) — amaç, gösterdiği veri, giriş noktası,
   hedef kelime sayısı. İnen ekranlar (ADR-069 #3) "giriş yok" diye listede.
2) Bütün ekranların tıklanabilir artifact prototipi (skill artifact-design; telefon genişliği; açık varsayılan + koyu; gerçek İngilizce metin):
   onboarding (~7 adım → "planın hazırlanıyor" → başlangıç kararı → paywall), "Bu hafta" (kahraman karar + geri sayım + hafta şeridi, ≤40 kelime),
   "+" (tartı ≤4, öğün 2-3, antrenman başlat), Antrenman, İlerleme, pazartesi check-in + Neden (Runna şablonu, U3'ün dört parçası, paylaş),
   dönüş akışı, paylaşım kartı (9:16, 3 saniyede okunur), ayarlar. Anayasa: U1-U7, U9, U10, U12 ekranda ihlal edilmez.
3) Levent telefonda gezer, ekran ekran "kalsın/gitsin/değiştir" → işle, yeniden yayınla (aynı URL).
4) Onay → görsel dil ADR'si (ADR-016'nın yerine) + 06 §7'nin kalan ADR'leri (karar-yaz) → "M9 ara · Yeni yüz" görev kartları backlog'a
   (kabul kriteriyle) → kod session'ının prompt'u.
Bitiş: DURUM + sıradaki tek adım. Bağlam dolmadan dur (DURUM › DEVAM NOKTASI + *-devam.md).
```
