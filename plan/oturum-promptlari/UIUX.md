# M9 ara · UI/UX revizyonu (ADR-067) — session prompt'u

```
oturum-baslat. Bu session M9 ara durağı: UI/UX revizyonu (ADR-067). Hafıza DURUM.md › "## M9 ilerleme" (Part 2 ÇIKIŞ) ve
"Levent'i bekleyen" › UI/UX geri bildirimi. Önce oku: plan/kararlar/ADR-067-uiux-revizyonu-once.md, ADR-016 (görsel dil), prototip/,
docs/aktarim/M9/cihaz-kontrol-listesi.md (cihaz sonuçları + img/). Kod yazma; bu session'ın çıktısı onaylanmış tasarım.

Sırayla:
1) Levent'e sor (AskUserQuestion, tek seferde): sevdiği/örnek aldığı 2-3 uygulama; tema (açık varsayılan mı, uygulama içi seçici mi);
   onboarding'de neyin şart olduğu; ton (ne kadar az metin). Cevaplar ADR taslağına.
2) Ekran envanteri: apps/mobile/src/app altındaki her rota — amacı, metin miktarı (kelime), aksiyon sayısı, cihazda görülen sorun
   (img/ bağlantısı), öneri (kalsın / birleşsin / gitsin). Tek tablo, docs/tasarim/ekran-envanteri.md.
3) Bütün ekranların tıklanabilir artifact prototipi (Artifact quickstart "design"; telefonda gezilebilir): onboarding → Today → kayıt
   (tartı/set/öğün) → karar + Why → koç → Progress → Ayarlar. Gerçek metinler data/copy/en.json'dan, kısaltılmış öneriyle.
4) Levent telefonda gezer, ekran ekran "kalsın/gitsin/değişsin" der; tur tur güncelle. Onaylanınca: görsel dil ADR'si (ADR-016'nın yerine/eki),
   metin değişiklik listesi, görev kartları (backlog) — sonra kod (ayrı session'lar, görev görev).
Kişi adı yok (hafıza urunde-kisi-adi-yok), U4/U6 kuralları prototipte de geçerli. Aktarım yok; Bitiş: DURUM + sıradaki adım.
```
