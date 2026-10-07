# ADR-079 · Görev başına aktarım yok: geliştirme ürünü bitirmeye odaklanır, öğrenme bitmiş kodun analiziyle
- **Durum:** KABUL
- **Tarih:** 2026-10-07 · **Karar veren:** Levent
- **Değiştirdiği:** ADR-019 #9 (ön/son aktarım her görevde), `docs/aktarim-protokolu.md` "Üç aşamalı sıra (her görev)"

## Bağlam
ADR-019 #9 her görevin ön ve son aktarımını zorunlu tutuyordu (`docs/aktarim/<M>/<K-ID>.md`, satır satır). Toplu modda aktarım görev bitince
yazılıyor ama Levent'e anlatılmıyordu. Sonuç olarak M8 ve M9 aktarımları birikti (DURUM: "Aktarım bekliyor"), her görev ek doküman ve token harcadı,
proje ise lansmana yaklaşmadı. Levent (7 Eki): "Aktarımı ekstra iş olarak vermeyelim, ekstra token harcatmayalım; en son analiz etmesiyle.
Proje nihayete eremiyor bile; ana odak projeyi kaliteli şekilde ilerletmek."

## Karar sürücüleri
- Ürün bitmeli: M9a, beta ve lansman önde.
- Kalite düşmez: test önce, inceleme ajanları, anayasa denetimi, CI aynen sürer.
- "Vibe coder değil" hedefi korunur, yalnız zamanı değişir.

## Karar
1. **Geliştirme sırasında aktarım yok.** `gorev-baslat`'ta ön aktarım ve "devam" beklemesi, `gorev-kapat`'ta son aktarım, `docs/aktarim/<M>/<K-ID>.md`
   dosyaları ve Apple Notes notu görev döngüsünden çıkar.
2. **Kalite kapıları aynen:** test önce (geçerli RED), `npm run check` / `./gradlew build`, `tools/anayasa-denetimi.sh`, pr-review-toolkit incelemesi,
   CI ve dal koruması, K1-K10.
3. **Sonraki öğrenmenin hammaddesi PR'da kalır:** her PR gövdesinde K10 özeti (ne değişti · neden · alternatif · hangi test neyi kanıtlıyor · kontrol
   edilmesi gereken satır) ve kabul kriteri ↔ test eşlemesi. Ayrı aktarım dosyası yazılmaz.
4. **Öğrenme en sonda, bitmiş kodun analiziyle:** proje yayına çıktıktan sonra (ya da Levent istediğinde) ayrı session'larda modül modül analiz
   yapılır (skill `aktarim`, protokolün anlatım standardı). Biriken M8/M9 aktarım listeleri bu analize girer.
5. **İstek üzerine anlatım sürer:** Levent "bunu anlat", "neden böyle" derse skill `aktarim` hemen kullanılır.

## Neden
Aktarım, yazılmış koda dayandığı için sona alınınca bir şey kaybolmuyor. Tersine, bitmiş ve kararlı kod üzerinden yapılan analiz yarım işlerin
aktarımından daha az tekrar içeriyor. Görev başına doküman, Levent okumadığı sürece maliyet üretip değer üretmiyordu.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Görev başına aktarımı sürdürmek | Token ve zaman; birikmiş, okunmamış aktarımlar |
| Kısa aktarım notu (her görevde 5 satır) | K10 özeti PR'da zaten bunu yapıyor |
| Öğrenmeyi tamamen bırakmak | "Vibe coder değil" hedefi Levent'in kariyer hedefi |

## Sonuçlar
- Olumlu: görev döngüsü kısalır, token koda gider.
- Olumsuz (kabul edilen bedel): Levent kodu geliştirme sırasında değil sonradan öğrenir. Bir karar Levent'e anlatılmadan birleşebilir; ürün,
  para, sağlık, veri kararları yine Levent'te olduğu için risk teknik ayrıntıyla sınırlı.

## Geri dönmenin maliyeti
Düşük: skill adımları geri eklenir.

## Etkilenen
`CLAUDE.md`, `.claude/skills/gorev-baslat`, `.claude/skills/gorev-kapat`, `.claude/skills/aktarim`, `docs/aktarim-protokolu.md`, ADR-019 #9,
`plan/oturum-promptlari/YENI-YUZ-kod.md`, `M9.md`, `M9-part3.md`, hafıza `toplu-mod`.

## Doğrulama
Yeni görev döngüsünde aktarım dosyası yok; PR gövdelerinde K10 özeti ve kabul ↔ test eşlemesi var.
