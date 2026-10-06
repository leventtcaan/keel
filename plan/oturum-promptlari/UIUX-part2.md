# Faz 5 · Part 2 — ekran envanteri ve prototip (ADR-067, ADR-068) — session prompt'u

Part 1 (araştırma) bitti: `arastirma/06-faz5-yuz.md` + `arastirma/ham/M0-M4`. Bu session **kod yazmaz**.

```
oturum-baslat. Bu session Faz 5 Part 2 · ekran envanteri + bütün ekranların artifact prototipi (ADR-067, ADR-068). Kod yok.
Hafıza: DURUM.md (Şu an + Faz 5 ilerleme › Part 1 ÇIKIŞ), hafıza arayuz-once-prototip.
Önce oku: arastirma/06-faz5-yuz.md (tamamı — §3 metin, §4 akış, §5 reklam anı, §6 görsel dil, §7 ADR adayları),
ADR-016 (görsel dil, yeniden ele alınacak), arastirma/ham/L2-gorsel-kimlik.md (§0, §8 RUBİN), docs/anayasa.md §U,
data/copy/en.json (bugünkü metin), docs/aktarim/M9/cihaz-kontrol-listesi.md (cihaz sonuçları).

Sırayla:
0) Levent'e tek seferde (AskUserQuestion): prototipi doğrudan etkileyen ADR adayları — 06 §7 B4 (1. hafta anı: davranış
   verisinden karar), B7 (onboarding sonu "aha": başlangıç kararı mı, projeksiyon mu), B11 (kararı kabul/ret), B13 (deneme/paywall
   teklifi), B8+B10 (paylaşım kartında ne var). Kalan B'ler session sonunda toplu.
1) Ekran envanteri → prototip/envanter.md: apps/mobile/src/app/ altındaki her rota (32) için amaç, gösterdiği veri, girdiği
   akış, kelime sayısı (data/copy/en.json), öneri: kalsın / birleşsin / gitsin / yeni — 06 §4 iskeletine göre. Yeni ekranlar
   (başlangıç kararı, "+" girişi, dönüş akışı, karar kartı paylaşımı) listede ayrıca.
2) Bütün ekranların tıklanabilir artifact prototipi (skill artifact-design; telefon genişliği, açık varsayılan + koyu, gerçek
   İngilizce metin, 06 §3 hedefleri: Today ilk görünüm ≤40 kelime, onboarding ekranı ≤25 kelime, tek kahraman öğe, "+" tek giriş).
   Karar kartı 9:16 kırpmada 3 saniyede okunmalı (06 §5). Anayasa: U1-U7, U9, U10, U12 ekranda ihlal edilmez.
3) Levent telefonda gezer, ekran ekran "kalsın/gitsin/değiştir" der → değişiklikleri işle, yeniden yayınla.
4) Onay → görsel dil ADR'si (ADR-016'nın yerine) + 06 §7 ADR'leri (karar-yaz) → kod görevleri backlog'a (kart, kabul kriteri).
Bitiş: DURUM + sıradaki tek adım. Bağlam dolmadan dur (DURUM › DEVAM NOKTASI + *-devam.md).
```
