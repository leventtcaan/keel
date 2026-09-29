---
name: gorev-kapat
description: keel'de bir görev bittiğinde kullan. "Görev bitti", "testler yeşil", "PR açalım", "kapatalım" dendiğinde mutlaka kullan. Kabul kriterlerini tek tek kanıtlar, son aktarımı yapar, PR'ı açar, backlog'u ve GitHub Project'i günceller.
---

# Görev kapat

## Adımlar
1. **Kanıt:** görevin kontrol komutu (`./gradlew build` / `npm run check`) — çıktıyı göster.
   Her `acceptance` maddesi için: hangi test onu kanıtlıyor (`dosya:satır`). Kanıtsız madde varsa görev bitmemiştir.
2. **Kendi incelemen:** diff'i baştan oku. Hardcode (K2), uydurma API (K6), görev dışı değişiklik (K4), silinen/
   gevşetilen test (K1) var mı? Varsa düzelt ya da Levent'e söyle.
3. **Son aktarım** (skill `aktarim`, aşama 3): dosya dosya, iş mantığında satır satır, `dosya:satır` bağlantılı.
   Kapanış: bütün resim paragrafı + soru bankası. Levent kendi cümleleriyle anlatır.
4. **K10 özeti** (≤5 satır): ne değişti · neden · alternatif · hangi test neyi kanıtlıyor · kontrol edilmesi gereken satır.
5. **Commit + PR:** `feat(<module>): <başlık> (#<issue>)`. PR gövdesi: özet, kabul kriterleri ↔ testler, "AI kullanımı:
   AI agent kodu ve testleri yazdı; son aktarım Levent'e yapıldı" — **araç adı, imza, Co-Authored-By yok.**
   Yeni bağımlılık/şema/modül sınırı/sözleşme varsa gerekçe + alternatif. Sonra `gh pr merge --auto --squash`;
   CI yeşil olunca GitHub birleştirir (ADR-019). Kırmızıysa düzelt, testi değiştirme (K1).
6. **Backlog:** `plan/backlog.yaml` → görevin `status: done`; `python3 tools/sync_backlog.py --apply` (issue kapanır,
   Project kartı Done'a geçer).
7. **Not:** aktarım tamamlandıysa Apple Notes (Keel klasörü). Sonra `oturum-kapat`.
