# ADR-047 · Cihaz üstü katman (Katman 1): kendi ince Expo modülümüz — Vision OCR + Foundation Models (K-510)
- **Durum:** KABUL (agent, teknik — ADR-019) · **cihaz denemesi bekliyor** (K-308; kartın "cihazda deneme kaydı")
- **Tarih:** 2026-10-03 · **Karar veren:** agent

## Bağlam
ADR-004 dört katman koydu; Katman 1 (cihaz üstü: barkod/OCR, kısa yapılandırma, fotoğraf ön-eleme — Apple Foundation Models)
"kendi ince Expo Module'ümüz mü, topluluk paketi mi" sorusunu bu spike'a bıraktı. Araştırma: `arastirma/ham/H11-cihaz-ustu-ve-widget.md`
§0, §A1-A5 (tüm iddialar URL + 3 Eki 2026). Cihaz derlemesi (K-308) yok; disk dar → kod yazılmadı, karar ve kapsam yazıldı.

## Karar sürücüleri
- Levent her satırı anlatabilmeli (tek geliştirici); bağımlılık ailesi az.
- **Zarif geri düşüş** (kart): Apple'ın üç "kullanılamaz" nedeni ayrı kalmalı — `appleIntelligenceNotEnabled` kullanıcıya "Ayarlar'dan
  açılabilir" demeyi, `deviceNotEligible` demeyi gerektirir.
- Geniş cihaz kapsamı: Foundation Models yalnız Apple Intelligence cihazlarında; OCR herkese lazım.
- ADR-004'ün kendi `LanguageModel` portu var; ikinci bir soyutlama (Vercel AI SDK) istemiyoruz.

## Karar
1. **Kendi ince Expo modülümüz** `apps/mobile/modules/on-device/` (`npx create-expo-module --local`; Swift, Expo Modules API — `AsyncFunction`
   async Swift'i doğrudan bekler, kurulu `expo-modules-core` 57.0.19'da doğrulandı). Yalnız development build'de (Expo Go'da yok).
2. **OCR: Vision `RecognizeTextRequest`** (iOS 18) — Apple Intelligence gerektirmez. Besin etiketinden ham metin → telefondaki
   deterministik ayrıştırıcı → sunucuya yalnız sayılar (V1). `OCRTool` (iOS 27) **değil**.
3. **Foundation Models:** `availability()` Apple'ın nedenlerini **birebir** taşır: `available` · `deviceNotEligible` ·
   `appleIntelligenceNotEnabled` · `modelNotReady` · `unsupportedOs` (iOS < 26) · `unknown` (`@unknown default`). Tek **dar** görev,
   Swift'te sabit `@Generable` yapı: koçun mesaj sınıflandırması (`{topic, rule}` — ADR-043'ün `TopicReply`'ı). Böylece Apple
   Intelligence cihazında kullanıcının mesajı **telefondan çıkmaz** (V2'nin en güçlü hâli); sunucu yine kararın sahibi (U1) ve
   cihazdan gelen sınıflandırmayı sunucudaki gibi denetler.
4. **Geri düşüş:** `available` dışındaki her durumda Katman 2 (sunucu, AI rızası ve kotayla) ya da deterministik mod; Expo Go/eski
   iOS'ta modül yok → aynı yol (K-403'ün "kullanılamaz" kalıbı). `appleIntelligenceNotEnabled` için tek satırlık Ayarlar ipucu.
5. **Barkod** bugün `expo-camera` ile cihazda ve ağsız (AVFoundation `AVCaptureMetadataOutput`; H11 §A4) — yeniden yazılmaz. Kartın
   "Barkod/OCR (Vision) cihazda çalıştı" maddesi "barkod + OCR cihazda, ağsız" olarak okunur (teknik netleştirme).
6. **Kapsam dışı (şimdi):** iOS 27 görüntü girdisi (`Attachment`) ve `OCRTool` — Xcode 27 + UIScene ister (SDK 57'de
   `expo-build-properties › ios.enableSceneSupport` ya da SDK 58; ADR-048 ile aynı karar noktası).
7. **Yeniden değerlendirme tetikleyicisi:** Expo'nun resmî `expo-ai` paketi npm'de yayımlanıp beta'dan çıkınca (bugün `private`,
   alpha; H11 §A3). Modülün durum adları onun şekline yakın tutulur → geçiş ucuz.

## Neden
- Paketlerin hepsi tek kişilik; çoğu Ocak 2026'dan beri yayın almadı (`expo-apple-foundation-models`, `react-native-apple-llm`,
  `@react-native-ai/apple`); çoğu `deviceNotEligible` ile `appleIntelligenceNotEnabled`'ı birleştiriyor (Callstack yalnız Bool).
- ~200 satır Swift + ~50 satır TS: anlatılabilir, bağımlılıksız; `LanguageModel` portuna oturur.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `expo-local-llm` 0.7.0 (en aktif; SDK 57 örneği, nedenleri ayırıyor) | Tek geliştirici, 14★; kendi modülümüz başarısız olursa **yedek** |
| `@react-native-ai/apple` | Yalnız `isAvailable()` (neden yok); Vercel AI SDK + zod getirir |
| `expo-ai` (Expo resmî) | Yayımlanmamış (`private`, alpha) — tetikleyici (madde 7) |
| `OCRTool` (iOS 27) | Yalnız Apple Intelligence cihazları + Xcode 27; Vision OCR herkese |

## Sonuçlar
Olumlu: Apple Intelligence cihazında koç mesajı ve OCR ücretsiz ve cihazda. Olumsuz: Swift + Expo Modules öğrenme yükü; iOS 26/27
farklarını biz yönetiriz; cihaz olmadan hiçbir satır doğrulanamaz.

## Geri dönmenin maliyeti
Düşük — modül tek dizin; JS tarafı bir port arkasında; `expo-ai`/`expo-local-llm`'e geçiş bir adaptör.

## Etkilenen
`apps/mobile/modules/on-device/` (yeni, cihaz adımında), koç (`src/coach/conversation.ts` — cihazda sınıflandırma varsa önce o),
besin etiketi OCR (yeni iş, M6 sonrası), ADR-004 (Katman 1 kapsamı netleşti), ADR-043 (`TopicReply` şeması cihazda da).

## Doğrulama (cihaz adımı — DURUM'da)
K-308 sonrası: (1) Apple Intelligence cihazında `availability() == available` ve sınıflandırma şemaya uyuyor (koçun 54 itiraz
setinden örnekler); (2) Apple Intelligence kapalı / uygun olmayan cihazda doğru neden + sunucu yoluna düşüş; (3) Expo Go'da modül yok →
düşüş; (4) besin etiketinden OCR metni. Kayıt `docs/aktarim/M5/K-510.md`.
