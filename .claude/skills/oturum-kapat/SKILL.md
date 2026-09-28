---
name: oturum-kapat
description: keel deposunda oturumu kapatır ve hafızayı günceller. "Oturumu kapat", "bugünlük bu kadar", "yatıyorum", "kaydet" dendiğinde, bir görev bittiğinde ya da uzun bir çalışmanın sonunda mutlaka kullan. Kontrol komutlarını çalıştırır, oturum günlüğüne yazar, DURUM'u günceller.
---

# Oturum kapat

## Adımlar
1. **Kontrol komutları** (dokunulan alana göre) çalıştır ve **çıktıyı göster**:
   - backend: `cd backend && ./gradlew build`
   - mobil: `cd apps/mobile && npm run check`
   - backlog değiştiyse: `python3 tools/sync_backlog.py --dry-run`
   Kırmızı varsa "bitti" deme; durumu olduğu gibi yaz.
2. **Oturum günlüğü** — `oturumlar/levent.md` sonuna tam 5 satır:
   ```
   ## YYYY-AA-GG · <kısa başlık>
   - yaptım: …
   - karar: … (ADR-0NN varsa bağlantısı)
   - takıldım: …
   - sıradaki: …
   - AI: agent ne yazdı, Levent neyi onayladı
   ```
3. **DURUM.md:** "Şu an", "Aktif görev", "Sıradaki tek adım" güncel. Kapanan kilometre taşı varsa "Kapananlar"a tek satır.
4. **Karar alındıysa** ve ADR yazılmadıysa şimdi yaz (skill `karar-yaz`).
5. **Commit:** plan/doküman değişiklikleri `docs(durum): …` ile main'e. Kod değişikliği varsa dalda kalır.
6. **Ana beyin:** kilometre taşı kapandıysa `~/Documents/LeventOS/daily/<tarih>.md` içine tek satır (`CLAUDE.local.md`).
7. Levent'e: ne bitti · ne açık kaldı · bir sonraki oturumun ilk adımı.
