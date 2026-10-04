# ADR-063 · M8 Part 2 cevapları (Levent, 5 Eki)
- **Durum:** KABUL (Levent — ürün/sağlık/veri; dördü de önerilen)
- **Tarih:** 2026-10-05 · **Karar veren:** Levent (AskUserQuestion, M8 Part 2 Bitiş)

## Kararlar
1. **İç yağ tahmini (fatProxy) dışa aktarmaya girer.** Her kararın kaydındaki motor girdisi (`fatProxyPct`, `fatProxyHighPct`, `fatProxyEnergyPct`)
   kullanıcının kendi dışa aktarma dosyasında, kaydedildiği gibi yer alır; politika bunun bel ölçüsü ve seçilen görünümden hesaplanan bir **motor
   girdisi** olduğunu, ölçüm olmadığını söyler. Uygulamanın hiçbir ekranında, bildiriminde, koç metninde sayı olarak görünmez — **U4 arayüz ve ürün
   metni için aynen geçerli**; dışa aktarma dosyası GDPR Md. 15 erişim hakkı için ham veridir (gerekçe: çıkarımla üretilen kişisel veri erişim hakkı
   kapsamında [EDPB 01/2022 — doğrulanmadı]). Uygulama: **K-818**.
2. **Silmede Apple girişini iptal: silme anında yeniden onay** (ADR-062 olduğu gibi). Hiçbir Apple jetonu saklanmaz.
3. **Metin dışı kontrast (K-816):** M9'da prototipte iki temada gösterilir, Levent onaylarsa uygulanır. O zamana kadar Besin Etiketi'nde "Sufficient
   Contrast" işaretlenmez.
4. **İletişim adresi:** henüz yok; M9 Part 2'de (dış TestFlight'tan önce) tekrar sorulur.

## Etkilenen
`backend/.../decision/DecisionAccountData.java`, `AccountDataTests` (U4 dışa aktarma beklentisi bu karara göre değişir), `docs/yasal/site/privacy.md`,
`docs/yasal/veri-envanteri.json`, `docs/anayasa.md › U4` (kapsam notu).
