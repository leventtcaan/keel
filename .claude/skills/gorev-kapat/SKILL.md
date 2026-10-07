---
name: gorev-kapat
description: keel'de bir görev bittiğinde kullan. "Görev bitti", "testler yeşil", "PR açalım", "kapatalım" dendiğinde mutlaka kullan.
---

# Görev kapat

## Adımlar
1. **Kanıt** (skill `verification-before-completion`): görevin kontrol komutu (`./gradlew build` / `npm run check`)
   **bu mesajda, taze** çalışır; çıkış kodu okunur, çıktı gösterilir. Alt-agent "bitti" dediyse `git diff` ile kanıtla.
   Her `acceptance` maddesi için: hangi test onu kanıtlıyor (`dosya:satır`). Kanıtsız madde varsa görev bitmemiştir.
2. **Kendi incelemen:** diff'i baştan oku. Hardcode (K2), uydurma API (K6), görev dışı değişiklik (K4), silinen/
   gevşetilen test (K1) var mı? Varsa düzelt ya da Levent'e söyle. Sonra ikinci göz:
   `/pr-review-toolkit:review-pr tests errors` (test boşluğu + sessiz hata). Bulguyu düzelt ya da neden düzeltmediğini yaz.
3. **Son aktarım yok** (ADR-079): ayrı aktarım dosyası ve Apple Notes notu yazılmaz. Öğrenme proje sonunda bitmiş kodun analiziyle.
4. **K10 özeti** (≤5 satır, PR gövdesinde — sonraki analizin hammaddesi): ne değişti · neden · alternatif · hangi test neyi kanıtlıyor ·
   kontrol edilmesi gereken satır.
5. **Commit + PR:** `feat(<module>): <başlık> (#<issue>)`. PR gövdesi: özet, kabul kriterleri ↔ testler, "AI kullanımı:
   AI agent kodu ve testleri yazdı" — **araç adı, imza, Co-Authored-By yok.**
   Yeni bağımlılık/şema/modül sınırı/sözleşme varsa gerekçe + alternatif. Sonra `gh pr merge --auto --squash`;
   CI yeşil olunca GitHub birleştirir (ADR-019). Kırmızıysa düzelt, testi değiştirme (K1).
6. **Backlog:** `plan/backlog.yaml` → görevin `status: done`; `python3 tools/sync_backlog.py --apply` (issue kapanır,
   Project kartı Done'a geçer).
7. Sonra `oturum-kapat` (görev sınırında; toplu modda part bitince).
