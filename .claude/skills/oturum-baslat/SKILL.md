---
name: oturum-baslat
description: keel deposunda her oturumun ilk adımı. Oturum başında, "nerede kalmıştık", "devam edelim", "sıradaki ne" dendiğinde ya da yeni bir session açıldığında mutlaka kullan — Levent adını anmasa da. Hafızayı dosyalardan yükler, git durumunu doğrular ve sıradaki tek adımı söyler.
---

# Oturum başlat

Bu depoda hafıza dosyalardadır; konuşma geçmişine güvenme.

## Adımlar
1. **Oku:** `DURUM.md` (tamamı) → `oturumlar/levent.md` (son 3 girdi).
2. **Git durumu:** `git status -sb` ve `git log --oneline -5`. Uzak depo varsa `git pull --ff-only`.
   Commitlenmemiş değişiklik varsa **dokunma**, Levent'e söyle ve sor.
3. **Aktif görev:** DURUM'daki "Aktif görev" satırı. Varsa `plan/backlog.yaml`'da o görevin kaydını oku
   (kabul kriterleri, bağımlılıklar, `refs`). Görev yoksa sıradaki görevi öner, başlatma.
4. **Tutarlılık kontrolü:** DURUM'un söylediği ile git'in gösterdiği çelişiyorsa (ör. "görev açık" ama dal yok) çelişkiyi
   söyle; kendin çözme.
5. **Levent'e üç satır:** şu an ne durumdayız · son oturumda ne oldu · sıradaki tek adım (ve bu adım neden şimdi).

## Yapma
- DURUM'u okumadan kod açma.
- Ham araştırmayı (`arastirma/ham/`) baştan okuma; görev `refs` alanı hangi dosyayı gösteriyorsa onu aç.
