# ADR-025 · Oturum: kısa ömürlü JWT + dönen refresh token, Apple kimliği yalnız `sub`
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-30 · **Karar veren:** agent

## Bağlam
ADR-011: tek giriş Sign in with Apple; sunucu Apple'ın kimlik token'ını doğrular, kendi oturumunu verir. K-203 bunun
biçimini seçer. Apple'ın "Verifying a user" sayfası (developer.apple.com, 2026-09-30 okundu): imza (Apple'ın
anahtarları — canlı JWKS'te `RS256`), `nonce`, `iss = https://appleid.apple.com`, `aud = client_id`, `exp`. Apple'ın
hesap silme sayfası: Sign in with Apple kullanan uygulamalar silmede token'ları REST API ile iptal etmeli.

## Karar sürücüleri
- Mobil istemci, çevrimdışı dönemler: oturum uzun yaşamalı ama çalınan bir kopya sınırlı zarar vermeli.
- V5: anahtar ortamdan; V3/veri azaltma: gereksiz kişisel veri tutulmaz.
- Levent anlatabilmeli: az hareketli parça.

## Karar
1. **Erişim token'ı:** bizim JWT'miz, HS256, anahtar `KEEL_SESSION_SECRET` (≥ 256 bit, yoksa uygulama açılmaz), 15 dk,
   içinde yalnız hesap kimliği (`sub`) ve `iss = keel`. Her istekte Spring Security'nin resource server'ı doğrular.
2. **Refresh token:** 256 bit rastgele, telefona bir kez verilir, veritabanında **yalnız SHA-256'sı**; 60 gün.
   Her yenilemede eskisi iptal, yenisi aynı **ailede** verilir; iptal edilmiş bir token tekrar gelirse (biri kopyasını
   kullanıyor) bütün aile iptal, kullanıcı yeniden giriş yapar. Çıkış ailenin tamamını bitirir.
3. **Hesap:** yalnız Apple'ın `sub`'ı (ekibimize özel, kalıcı). Ad ve e-posta **saklanmaz** (kullanımı yok; veri azaltma).
4. **Apple'ın `authorizationCode`'u** alınır ama henüz takas edilmez: takas ve silmede iptal Apple istemci sırrı ister
   (Team ID + Key ID + `.p8` anahtarıyla imzalı JWT) → Levent'in hesap bilgisi (DURUM soru 7), K-214'te.
5. **Yetki:** `/health`, `/v1/auth/*` açık; `/v1/**` oturum ister; `/v1` dışı 404'e düşer. Sunucu tarafı oturum ve
   çerez yok (CSRF yüzeyi yok). Modüller oturumdan yalnız `AccountId` görür (denetleyici parametresi).

## Neden
- Kısa erişim + dönen refresh: çalınan erişim token'ı 15 dk'da ölür; çalınan refresh ilk yeniden kullanımda bütün
  zinciri düşürür (OAuth 2.0 Security BCP'deki "refresh token rotation" deseni).
- HS256 tek sunucuda yeterli ve basit (tek anahtar); birden çok servis doğrularsa RS256'ya geçiş ayrı ADR.
- Hash'li saklama: veritabanı sızıntısı oturum açtırmaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Sunucu oturumu + çerez | Mobil istemci için çerez ve CSRF yükü; yatay ölçekte paylaşılan oturum deposu |
| Uzun ömürlü tek JWT | Çalınırsa iptal edilemez |
| Refresh'i düz metin saklamak | Veritabanı kopyası = oturum |
| RS256 oturum token'ı | Tek doğrulayıcı varken anahtar çifti yönetimi fazlalık |
| Apple e-postasını saklamak | Kullanılmıyor; özel röle adresi bile kişisel veri |

## Sonuçlar
Olumlu: çalınan token'ın zararı sınırlı; kişisel veri yok denecek kadar az. Olumsuz: Apple token iptali (App Store
şartı) Levent'in `.p8` anahtarını bekliyor; o gelene dek hesap silme Apple tarafını iptal edemez.

## Geri dönmenin maliyeti
Düşük: token biçimi ve süreler yapılandırma; şema küçük.

## Etkilenen
`identity` (K-203), `privacy` (K-214 iptal), mobil (K-3xx oturum saklama: Keychain), sözleşme `Session`.
