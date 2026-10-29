# Yeniden yapım — devam (29 Eki 2026 ~09:00 UTC, bağlam devri)

Önce oku: `DURUM.md › ▶ DEVAM NOKTASI`, `plan/yeniden-yapim.md › İlerleme`, `plan/envanter-2026-10-29.md`, `.envanter/notes.md` (K1 listesi + Evre 4 notları).
Döngü talimatı geçerli: `plan/oturum-promptlari/yeniden-yapim-dongu.md` (ara kapı yok; Levent'ten yalnız Apple/ASC girişi, para, Release).

## Nerede kaldık
- Evre 0-3 bitti, kodu main'de; Evre 4.1 (#643) ve 4.2 (#645) birleşti. Gerçek sunucu kanıt turu 08:23-08:27 UTC; envanter sayfası
  https://claude.ai/artifact/7Ew5GE2C1uECT7dYaCofKb (sürüm 3), prototip https://claude.ai/artifact/3w4F4AyapNksScmgmgzpD6.
- **Build 6** EAS'te bitti, ASC'ye yüklendi (EAS build f4a16260, submission 3f043f16), TestFlight'ta. **1.0 hâlâ build 5 ile incelemede; ASC'de geri
  çekme/bağlama/gönderme YAPILMADI.** Levent ego lite'ta ASC'ye girdi (09:00 UTC).
- Simülatör: gerçek sunucuya bağlı, Levent'in Apple ID'si ile test hesabı açık (oturumu düşürme: uygulamayı kapatıp açma, main'i çekme;
  bkz. DURUM "Metro dersi"). Metro `.envanter/metro.sh`.

## Levent'in TestFlight build 6 bulguları (1 dakikalık tur, 29 Eki ~09:00 UTC)
1. "+" düğmesinin **solunda blok halinde beyaz alan** (PlusEntry/yüzen düğme kapsayıcısının zemini; This Week ve diğer sekmelerde).
2. **Train sekmesi:** "This week" başlığının altındaki **Mon / Tue / Fri satırları çok güçsüz**, uygulamanın arayüzünden kopuk.
3. **Tarama (barkod) ve yemek kaydı:** her şeyin kusursuz olduğundan emin değil → uçtan uca ve kenar durumlarıyla yeniden test.
4. **Progress:** "This week's muscles" altındaki bölümler güçsüz, uygulamadan kopuk, fazla statik, modern değil.
Ders: agent'ın görsel denetimi Levent'in bir dakikada gördüğünü kaçırdı → aşağıdaki kapsamlı test düzeni.

## Levent'in istediği sıradaki iş (sırayla)
1. **Uygulama testi için kapsamlı bir skill bul:** teknik + temel + modernlik + UX + UI + mantık (logic) denetimi. Ego lite (`ego-browser` skill) ile
   YouTube, Reddit, X taraması + blog/web taraması; sonunda bir GitHub reposu ve skill'e ulaş (ör. mobil uygulama QA / UI-UX denetim / design review
   skill'leri; Claude Code skill formatında). Kaynakları künyeleyerek `arastirma/ham/` altına yaz; uydurma yok (K6).
2. **Kur** (`~/.claude/skills/` ya da proje `.claude/skills/`; lisansını ve içeriğini oku, güvenli değilse kurma; üçüncü taraf betik çalıştırmadan önce oku).
3. **Build 6 üzerinde çalıştır** (simülatörde gerçek sunucuya karşı; gerekirse TestFlight ekran görüntüleri Levent'ten), bulguları envantere ekle.
4. **Eksikleri ve geliştirilebilir noktaları tamamla** (yukarıdaki 4 bulgu dahil), her biri PR + test + simülatör kanıtı.
5. Sonra **build 7** → TestFlight → ASC'de 1.0: incelemeden geri çek, build 5 çıkar, build 7 bağla, yeniden gönder (yayın şekli ELLE; Release Levent).
6. Döngüyü durdur, Levent'e envanter sayfasıyla tek özet + K1 listesi (test silmeler dahil) onayı.
