# ADR-076 · Paylaşım: antrenman sonundan şeffaf çıkartma + kendi foto/videon, haftalık karar paylaşılmaz, Instagram Story yolu
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (tur 2: Strava kalıbı ve kendi foto; tur 3: "the call" paylaşılmaz, video; B12: logo
  kalıcı); öneren: agent
- **Yerine geçtiği:** ADR-054 (paylaşım kartı). ADR-054'ün güvenlik kararlarını dışarıda tutma ilkesi (ADR-055 #104) karar hiç paylaşılmadığı için
  kendiliğinden karşılanır.

## Bağlam
ADR-054 kartı yalnız kelimelerden, 4:5, İlerleme'den paylaşılan bir görüntüydü; Levent tur 2'de "çocuk eğler gibi" dedi. Ölçülmüş tek paylaşım
etkisi Hevy'nin Story entegrasyonu: kurulum +%12, paylaşım +%42 (Meta vaka çalışması, şirket beyanı, orta-zayıf; M4). Strava'yı Levent hiç
indirmeden reels ve story'lerden tanıyor (ADR-071 #6). Bugün paylaşım RN `Share.share({url})` ile; `react-native-share`, `expo-sharing`,
`react-native-view-shot` kurulu değil.

## Karar
1. **Giriş:** antrenman sonu "Share your workout". Haftalık karar paylaşılmaz ("the call" çıktı, Levent); B8+B10'un karar kartı yerine
   antrenman verisi.
2. **Dört çıkartma** (şeffaf PNG, ürünün sesiyle):
   - **Workout:** seans adı, dakika, kaldırılan toplam kilo, set sayısı, rekor ya da ilk seansta "Baseline set".
   - **PR:** hareket, gerçek en iyi set ("100 × 8"), ilk aydan bu yana kilo farkı.
   - **Streak:** "11 of 12" weeks on track ve 12 haftalık ızgara (af haftası görünür).
   - **Progress:** "12 weeks in" ve en çok artan üç hareketin kilo farkı.
   Hiçbirinde vücut ağırlığı, yağ yüzdesi, beden görseli, kalori, e1RM yok (U4, U5/B10, V3). Metin `en.json`'da; yasaklı ifade taramaları
   (`forbidden-phrases.json`, `share-forbidden.json`) sürer.
3. **Arka plan:** kullanıcının foto ya da videosu (galeri ya da kamera; telefonda kalır), "In Instagram" (yalnız çıkartma gider, arka planı
   Instagram'da seçer), düz koyu. İlerleme fotoğrafları (K-614'ün uygulama içi deposu) seçicide yok.
4. **Logo her zaman** çıkartmada (ADR-071 #6); logo belirlenene kadar kelime işareti. Otomatik paylaşım yok.
5. **Hedefler:**
   - **Share to Story** (birincil): Instagram'ın `instagram-stories://share?source_application={appId}` yolu; çıkartma `stickerImage`,
     arka plan `backgroundImage` ya da `backgroundVideo` (H.264/H.265, en çok 20 sn; Meta "Sharing to Stories", 7 Eki'de doğrulandı).
     **Facebook App ID gerekir** (Ocak 2023'ten beri; Levent, Story görevine gelince, ADR-071 #2). Kütüphane `react-native-share` (npm'de
     12.3.1, 7 Eki'de doğrulandı; Expo uyumu ve config plugin kurulumda doğrulanacak). `LSApplicationQueriesSchemes`'e `instagram-stories`.
   - **TikTok, Save, More:** sistem paylaşım sayfası (TikTok SDK yok). Foto arka planda çıkartma telefonda birleştirilir.
6. **Görüntü telefonda üretilir** (ADR-054 #2 kalıbı): çıkartma react-native-svg ile, foto arka planla birleşim aynı SVG'de, `toDataURL` →
   önbellek dosyası → paylaşım → dosya silinir. Sunucuya hiçbir şey gitmez. Yeni bağımlılık yalnız Story için `react-native-share`.
7. **Video ve hareketli çıkartma iki aşamalı:**
   - v1: Story'de video arka plan Instagram'ın kendi birleşimiyle (çıkartma ayrı katman). Diğer hedeflerde video arka plan yerine foto ya da
     yalnız çıkartma.
   - Ayrı görev: hareketli sayılar ve çıkartmanın videoya gömülmesi (yerel Swift modülü, AVFoundation; K-618 emsali). Bu görev v1.x'e
     kayabilir; kayarsa Levent'e sorulur.
8. **Boyut:** önizleme ve kayıt 9:16 (1080 × 1920); çıkartma şeffaf, Story'de kullanıcı yerleştirir.

## Neden
Strava kalıbı (şeffaf istatistik + kendi görüntün) paylaşımı insanın anına bağlar, uygulamanın reklamına değil; logo markayı taşır. Antrenman
anı kategorinin paylaşılan anı (Hevy, Strava). Kararın paylaşılmaması sağlık sinyali taşıyan kararların (güvenlik ağı) dışarı çıkma riskini de
sıfırlar.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Karar kartı (ADR-054, B8) | Levent: "the call" paylaşılmaz |
| `react-native-view-shot` | SVG `toDataURL` yetiyor; ek native bağımlılık |
| TikTok Share Kit | Geliştirici hesabı ve SDK; sistem sayfası yetiyor |
| Videoya gömmeyi v1'e zorlamak | Yerel modül, büyük iş; Story yolu Instagram'ın birleşimiyle bugün çalışır |

## Sonuçlar
- Olumlu: paylaşım alışkanlık anında; Story tek dokunuş; kullanıcı verisi telefonda.
- Olumsuz: Story için Meta hesabı (Levent); Android'de Story yolu ayrı iş.

## Geri dönmenin maliyeti
Düşük-orta: çıkartmalar telefonda; tek yeni bağımlılık.

## Etkilenen
`apps/mobile/src/share/` (yeniden), `app/share.tsx`, `workout-summary`, `app.json` (`LSApplicationQueriesSchemes`, config plugin),
`apps/mobile/package.json` (`react-native-share`), `data/copy/en.json › share`, `data/parameters/share.json` (`share_withheld_rules` artık
kullanılmaz; kaldırılır), ADR-054 (YERİNİ ALDI), ADR-055 #104.

## Doğrulama
Çıkartma testleri: dört şablonun metni yasaklı ifade taramasından geçer, sayılar gerçek değer, kilo/kalori/yağ yok, logo her şablonda · paylaşım
servisi testi: dosya her durumda silinir · Story: App ID yoksa düğme sistem sayfasına düşer (çökmez) · cihazda Story'ye foto ve video arka
planla bir paylaşım (Levent).
