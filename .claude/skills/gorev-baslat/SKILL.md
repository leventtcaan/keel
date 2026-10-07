---
name: gorev-baslat
description: keel'de bir backlog görevine (K-ID, ör. K-012) başlarken kullan. "Şu göreve başlayalım", "K-012", "sıradaki görev", "motoru yazalım" gibi bir uygulama işi başladığında mutlaka kullan.
---

# Görev başlat

## Ön koşullar — biri eksikse DUR ve söyle
- Görev `plan/backlog.yaml`'da var ve `acceptance` listesi dolu.
- `depends_on` içindeki görevlerin hepsi `done`.
- Görevin `module` alanı tek bir modül. İki modüle dokunuyorsa bölünmesi gerekir.
- Görev bir karara dokunuyorsa (`refs` içinde ADR) o ADR KABUL durumunda. ÖNERİ ise: teknikse kabul et ve ADR'ye yaz, ürün/para/sağlık/veri/marka ise Levent'e sor.

## Adımlar
1. **Görev kartını oku:** başlık, `why`, `acceptance`, `tests`, `refs`, `learn`.
   `refs` içindeki araştırma dosyasının yalnız ilgili bölümünü aç.
2. **Dal:** `git switch -c <module>/<issue>-<kisa-ad>` (issue numarası backlog kaydındaki `issue` alanı).
3. **Ön aktarım yok** (ADR-079): görev kartı ve ilgili ADR okunduysa doğrudan teste geç. Levent "anlat" derse skill `aktarim`.
4. **Test önce** (skill `test-driven-development`): her kabul kriteri için test. `pending` etiketli hazır spesifikasyon
   testi varsa etiketi kaldır, testin kırmızı olduğunu **çıktıyla göster.**
   **Geçerli RED:** test beklenen assertion ile kırmızı; derleme hatası ya da exception RED sayılmaz. İlk koşuda yeşilse
   var olan davranışı test ediyordur → testi düzelt. Saf fonksiyonlarda (motor) özellik testi de yaz (skill
   `property-based-testing`).
5. **Kod:** testleri geçiren en basit kod. Parametre ve metin dosyadan (K2). Görev dışına taşma.
6. DURUM.md → "Aktif görev: K-0NN · <başlık> · dal `<dal>`".
