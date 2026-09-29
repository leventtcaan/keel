# ADR-019 · Yetki devri ve otomasyon
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)
- **Değiştirdiği:** ADR-002 madde 4 (birleştirme), anayasa K5, `karar-yaz` ve `gorev-kapat` skill'leri

## Bağlam
Levent 29 Eyl'de: "Bundan sonra major olarak sen aksiyon al; onay ya da kişisel bir şey gerekirse beni bekle. Hafıza
dosyalarda kalır, tutarlılık ve güvenlikten şaşmayız, canlı ürüne çıkacak özende devam ederiz." Tek geliştiricili
projede her PR ve her teknik iznin Levent'i beklemesi akışı durduruyordu. Otomasyon, yerini insan onayına değil
**mekanik kapılara** bırakmalı: CI, dal koruması, mimari testler.

## Karar
1. **Birleştirme agent'ta.** Kod yine `main`'e PR ile girer. Agent PR'ı açar ve `gh pr merge --auto --squash` ile
   işaretler; GitHub, iki zorunlu CI kontrolü (Backend, Mobile) yeşil olunca kendisi birleştirir.
2. **Dal koruması (`main`):** zorunlu kontroller `Backend (Gradle build)` + `Mobile (typecheck, lint, test)`, doğrusal
   geçmiş, force push ve dal silme kapalı, açık konuşma çözülmeden birleşme yok. Yalnız squash; birleşen dal silinir.
   Yönetici (Levent'in token'ı) plan/doküman için doğrudan `main`'e yazabilir (ADR-002 madde 4 aynen).
3. **Teknik izinleri agent verir, gerekçeyle:** yeni bağımlılık, şema/migration, modül sınırı, API sözleşmesi.
   PR gövdesinde gerekçe + alternatif; kalıcı etkisi olan (şema, modül sınırı, sözleşme) ayrıca ADR.
4. **ADR kabulü bölündü:** teknik ADR'yi (mimari, altyapı, test, araç) agent KABUL'e çevirir. Ürün kapsamı, para,
   sağlık/regülasyon, kullanıcı verisinin paylaşımı ve görsel/marka ADR'leri **Levent'te** kalır.
5. **Her zaman Levent'i bekleyen işler:** para harcayan ya da abonelik/fiyat değiştiren her şey · dışarıya kullanıcı
   verisi gönderen ya da üçüncü taraf AI sağlayıcısı seçen karar · hesap, giriş, sır, API anahtarı · mağaza yayını ·
   sağlık ve regülasyon riski · ürün kapsamı · `main` üzerinde force push ya da geçmiş yeniden yazma · kişisel iş
   (çekim, Güray ile iletişim, hesap açma).
6. **Güvenlik otomasyonu:** Dependabot güvenlik uyarıları ve güvenlik düzeltme PR'ları açık; GitHub Actions sürümleri
   haftalık (`.github/dependabot.yml`). npm ve Gradle için sürüm PR'ı yok (Expo SDK uyumu `npx expo install` ile,
   Gradle sürümleri version catalog'da). Dependabot PR'larını agent oturum başında inceler; CI yeşil ve yama düzeyiyse
   birleştirir, değilse DURUM'a yazar.
7. **Claude Code eklentileri (proje kapsamı, `.claude/settings.json`):** `expo` (resmî Expo becerileri),
   `security-guidance` (düzenleme uyarıları + tur sonu ve commit'te güvenlik incelemesi), `jdtls-lsp`,
   `typescript-lsp`. Expo'nun telemetrisi varsayılan kapalı; açılmaz, geri bildirim gönderilmez.
8. **Öğrenme bozulmaz:** ön/son aktarım (`docs/aktarim-protokolu.md`) aynen sürer. Levent PR'ı onaylamasa da her
   görevin aktarımını alır; "vibe coder değil" hedefi değişmedi.

## Neden
Kapı insan dikkatine bağlıysa yorgunlukla gevşer; CI ve dal koruması gevşemez. Mimari testler (modül sınırı, satır içi
sürüm, parametre kaynağı) ve kontrast testi zaten kural ihlalini CI'da yakalıyor. Levent'in kararı değerli olduğu
yerde kalıyor: ürün, para, sağlık, veri.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Her PR'ı Levent birleştirir (eski) | Tek geliştiricide akışı durduruyor; Levent açıkça devretti |
| Doğrudan `main`'e kod | CI kapısı ve geri alınabilir PR kaydı kaybolur |
| Tüm Dependabot sürüm PR'ları | Expo SDK uyumunu bozar, gürültü üretir |
| Güvenlik eklentisi yok | Sağlık verisi işleyen üründe ikinci göz ucuz; maliyeti oturum kotası |

## Sonuçlar
- `security-guidance` her tur ve commit'te model çağrısı yapar (Levent'in kotası). Kapatma: `SECURITY_GUIDANCE_DISABLE=1`.
- Expo MCP sunucusu (`mcp.expo.dev`) Levent'in Expo hesabıyla giriş ister; giriş Levent'te (madde 5).
- Agent'ın hatası artık PR'da insan gözüne takılmadan `main`'e girebilir → önlem: test önce (K1), CI, oturum sonu
  kontrol çıktısı, gerektiğinde `/code-review`.
