# Uygulama QA skill'i araştırması (29 Eki 2026)

Soru (Levent): build 6'yı teknik, temel akış, UI, UX, mantık ve modernlik açısından test edecek kapsamlı bir skill; YouTube, Reddit, X, blog
taraması, sonunda GitHub reposu. Tarama ego lite ile iki alt ajanda yapıldı; ham notlar künyeleriyle:
`uygulama-qa-skill-2026-10-29-github.md` (repo, lisans, yıldız, SKILL.md yolu) ve `uygulama-qa-skill-2026-10-29-sosyal.md` (video, başlık, gönderi).
Repo üst verileri (yıldız, son itme, lisans) 29 Eki'de `gh api` ile ayrıca doğrulandı.

## Sonuç
Tek başına her boyutu kapsayan bir skill yok. Kurulan set (hepsi MIT, yalnız markdown, betik yok; içerik okunduktan sonra `~/.claude/skills/`):
- **obatried/mobile-taste**: `mobile-ui-audit` + `mobile-ui-elevate` + `mobile-design-lab`. RN/Expo için simülatörde piksel denetimi;
  3 katmanlı rubrik (F işlev, S yapı ve durum matrisi, D tasarım sistemi ve AI-slop), 12 eksenli kaynaklı başvuru dosyaları. Modernlik
  ve "AI üretimi gibi görünüyor" ölçüsü en güçlü olan. 0 yıldız, tek yazar; rubrik kaynaklarıyla birlikte okundu.
- **orbitextechlab/mobile-app-studio**: akış envanteri (koddan), her akışı her veri durumunda yürütme, UX/hareket kontrol listeleri, düzelt ve
  cihazda yeniden test. Kural farkı: "tek tek UI düzeltmesi için onay isteme" der; keel'de ürün kapsamı, para, sağlık, kullanıcı verisi
  kararları yine Levent'te (ADR-019), bu skill o sınırı geçemez.
- Zaten var: Expo'nun resmî `expo-design-system` (native-slop listesi, token kayması denetimi) ve `expo-native-ui`.

Kurulmayanlar ve neden:
- **conorluddy/ios-simulator-skill** (1302 yıldız, MIT): en olgun araç katmanı (log, erişilebilirlik denetimi, Dynamic Type, kontrast) ama
  Python 3.12 + idb ister ve tasarım yargısı yok. Simülatör sürüşü için keel'in kendi düzeni (`xcrun simctl`, simülatör aracı,
  `.envanter/*.sh`) yetiyor; erişilebilirlik ve Dynamic Type geçişi `xcrun simctl ui` ile yapılabilir.
- **software-mansion/argent**: sosyal kaynaklarda en çok anılan simülatör sürücüsü (6 bağımsız kaynak); MCP, ayrı kurulum. Aynı gerekçe.
- **pbakaus/impeccable**, **anthropics/skills frontend-design**, **ui-ux-pro-max**: tasarım bilgisi ağırlıklı ve web odaklı.

## Build 6'da ilk tur (gerçek sunucu, simülatör, 29 Eki)
| Bulgu | Rubrik | Önem | İş |
|---|---|---|---|
| "+" tam genişlik şeridin içinde, solu beyaz blok, içerik kesiliyor (Levent) | S2, D6 | P1 | K-1050, PR #647 birleşti |
| Altta kalan sekme kayıttan sonra bayat (Progress öğün sonrası 0 kcal) | F3 | P0 | K-1051, PR #652 |
| Yemek aramasında hızlı yazınca harf düşüyor (14 yazıldı, 1 kaldı) | F5 | P1 | K-1052, PR #653 |
| Train > This week satırları çıplak, kopuk (Levent) | D6, D7, D17 | P2 | K-1053 |
| Progress kas haritası altı düz metin, statik nokta sırası; Steps değersiz "/ 7,000" (Levent) | D6, D7, S3, D17 | P2 | K-1054 |
| OFF verisinde akla yatmayan enerji: "Lezita Chicken breast" 397-531 kcal / 100 g | mantık | P2 | açık (makro ile enerji tutarlılık süzgeci) |
| Öğün ekranında tek seçenekli "Unit" çipi; arama boşken sayfa bomboş | D6, S3 | P3 | açık |
| Dev'de bir kez SIGSEGV (art arda Fast Refresh sonrası hızlı ekleme); temiz açılışta 3 denemede yok | F | izle | build 7'de TestFlight'ta tekrar dene |

Doğru çıkanlar: arama sonuçları, öğün aralığı (tartılmadı ±%50, tartıldı ±%5), hızlı ekleme + Undo (POST 201, DELETE 204), çökme sonrası kuyruğun
kaydı göndermesi, This week'in odakla tazelenmesi.
