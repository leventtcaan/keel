# Yeniden yapım döngüsü — talimat (her tur bunu okur)

**Hedef:** Next Call (keel) iOS uygulamasını her sayfası ve her akışıyla çalışır, tutarlı, prototiple uyumlu ve "AI slop" izinden arınmış
hale getirmek; sonunda build 6'yı TestFlight'a ve App Review'a koymak. Levent (29 Eki 2026): **ara onay yok, bitmiş hali görmek istiyor.**
Önceki sonuç (build 5) kabul edilemezdi; aynı hataya düşmemek bu döngünün varlık nedeni.

## Her tur
1. Oku: `DURUM.md › ▶ DEVAM NOKTASI`, `plan/yeniden-yapim.md` (kurallar + İlerleme), `plan/denetim-2026-10-29.md` (ilk bulgular).
   `git pull --ff-only`. Açık PR'ın varsa önce onu bitir.
2. Sıradaki **tek iş paketini** seç (İlerleme'deki ilk açık evrenin ilk açık satırı), bitir, kanıtla.
3. `plan/yeniden-yapim.md › İlerleme` ve DURUM'u güncelle, `main`'e işle. Bir sonraki turu `ScheduleWakeup` ile kur; derleme ya da CI beklerken
   uzun ara (≥1200 sn), iş varken kısa.
4. Hepsi bittiğinde (Evre 4 tamam): döngüyü durdur (`stop: true`), Levent'e tek özet: önce/sonra envanter sayfasının bağlantısı, build 6, kalan bilinen sınırlar.

## Değişmeyen kurallar
- `CLAUDE.md` ve `docs/anayasa.md` geçerli (U1-U14, V1-V5, K1-K6). Test önce; testi koda uydurmak yok; hardcode yok; kaynaksız motor kuralı yok.
- Kod `main`'e PR ile: dal `<modül>/<issue>-kisa-ad`, `gh pr merge --auto --squash`, CI yeşil. Görev `plan/backlog.yaml` → `tools/sync_backlog.py --apply`.
- **"Bitti" = gerçek sunucuya karşı simülatörde yürünmüş akış + ekran görüntüsü.** Birim testi ve sahte sunucu (`../keel-sim/.sim/fixture.js`) tek
  başına kanıt değil; sahte sunucu yalnız hata/boş durumlarını üretmek için.
- Her ekran: amacı tek bakışta görünüyor mu, çıkışı var mı (boş, hata, yavaş ağ, çevrimdışı), düğme/kart/ikon/boşluk/yazı sistemle tutarlı mı,
  AI slop var mı (anlamsız gradyan, her şey kart, her şey aynı ağırlıkta, süs ikon, belirsiz ya da uzun metin), prototiple (`prototip/yeni-yuz.html`,
  ADR-070: turkuaz, açık varsayılan, koyu odak) aynı mı. Tasarım kararlarını agent verir, ADR-070 Ek'ine yazar; prototip güncellenir.
- Disk dar: yerelde Docker/Postgres yok, tam jest yalnız gerektiğinde; simülatör derlemesi EAS bulutunda (`development-simulator`).
- Alt ajanlar: tarama/okuma işleri `model: "haiku"`, kod yazan ajanlar `sonnet`; ajan çıktısı doğrulanmadan gerçek sayılmaz. Tarayıcı işi ego lite
  (`ego-browser` skill); CAPTCHA çıkarsa Levent'e bırakılır.

## Levent'in yapacağı tek şeyler (yalnız gerçekten onun yapabileceği)
- Simülatörde Apple ID girişi (şifre). Gerektiğinde `PushNotification` ile tek cümle iste, beklerken başka paketle ilerle
  (kod, görsel sistem, sahte sunucuyla görsel tur).
- Para gerektiren her şey (ücretli veri kaynağı, ücretli servis) → dur, sor.
- App Store **Release** (yayın şekli ELLE kalır). ASC oturumu düşerse girişi.

## Bilinen başlangıç bulguları
Bkz. `plan/denetim-2026-10-29.md`. Levent'in ek gözlemleri (29 Eki): düğmeler tutarsız ve kötü; Log'da açılan seçeneklerde ikon/emoji yok;
Bu Hafta'da kardiyo vb. alt bölümler sönük; "+" düğmesi engelleyici davranıyor; Ayarlar baştan aşağı kötü ve çok veri yığılmış; Account düğmeleri
(Ayarlar'da ve paywall'daki Account) çok kötü; uygulama genel olarak karışık.
