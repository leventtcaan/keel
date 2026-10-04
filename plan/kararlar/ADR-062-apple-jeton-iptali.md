# ADR-062 · Hesap silmede Sign in with Apple jetonu: silme anında yeniden yetki, sakla değil (K-812)
- **Durum:** KABUL (agent, teknik — ADR-019; `.p8` anahtarı ve Apple hesabı Levent'te)
- **Tarih:** 2026-10-05 · **Karar veren:** agent

## Bağlam
Apple: "Apps that support Sign in with Apple should use the Sign in with Apple REST API to revoke user tokens"
(developer.apple.com/support/offering-account-deletion-in-your-app). İptal (`POST https://appleid.apple.com/auth/revoke`) bir **refresh ya da
access token** ister; jeton ancak bir yetki kodunun (`authorizationCode`, tek kullanımlık, 5 dakika) `POST /auth/token` ile değiş tokuşundan çıkar.
İki istek de bir **istemci sırrı** ister: `.p8` özel anahtarıyla ES256 imzalı JWT — başlık `alg: ES256`, `kid` (10 karakter anahtar kimliği);
gövde `iss` (10 karakter Team ID), `iat`, `exp` (en fazla altı ay), `aud: https://appleid.apple.com`, `sub` (App ID). Kaynak: Apple REST API
belgeleri "Revoke tokens", "Generate and validate tokens", "Creating a client secret" (5 Eki, developer.apple.com JSON). TN3194 iki yol tanır:
girişte jeton yanıtını güvenle saklamak; ya da elde jeton/kod yoksa elle iptal talimatı. Bugün sunucu yetki kodunu alıyor ama kullanmıyor
(`AuthController.AppleSignIn.authorizationCode`), hiçbir Apple jetonu saklanmıyor.

## Karar sürücüleri
- Veri en aza indirme (V1, GDPR Md. 5(1)(c)): saklanmayan jeton sızamaz.
- Yeni bir şifreleme anahtarı ve onun döndürülmesi işi açmamak.
- Silme hiçbir koşulda iptale bağlı kalmaz (V6): Apple'a ulaşılamaz, anahtar yok, kullanıcı Apple sayfasını kapatır → hesap yine silinir.
- Sır ortamdan (V5); log'da kod, jeton, sır yok.

## Karar
1. **Silmede yeniden yetki:** telefon silme onaylanınca Sign in with Apple'ı bir kez daha açar (Face ID), taze `authorizationCode`'u
   `POST /v1/account/apple-revocation`'a gönderir, ardından `DELETE /v1/account`. Kullanıcı Apple sayfasını kapatırsa ya da istek başarısızsa silme
   sürer; sorun adıyla raporlanır.
2. **Sunucu (identity):** kodu `/auth/token`'da jetona çevirir; dönen `id_token`'ı mevcut doğrulayıcıyla (imza, `iss`, `aud`) doğrular ve `sub`'ı
   oturumdaki hesabın `apple_subject`'iyle karşılaştırır — eşleşmezse iptal yok (400). Eşleşirse refresh token'ı `/auth/revoke` ile iptal eder
   (`token_type_hint=refresh_token`); 204. Hiçbir jeton saklanmaz, yanıt gövdesi loglanmaz.
3. **İstemci sırrı:** her istekte kısa ömürlü (5 dakika) JWT, `.p8`'den (PKCS#8, P-256) ES256 ile. Ayarlar: `keel.apple.revocation.team-id`,
   `key-id`, `private-key` (PEM metni) — `KEEL_APPLE_TEAM_ID`, `KEEL_APPLE_KEY_ID`, `KEEL_APPLE_PRIVATE_KEY`; `base-uri` Apple'ın adresi.
   Biri yoksa iptal **kullanılamaz**: uç nokta 503 `APPLE_REVOCATION_UNAVAILABLE`, telefon silmeye devam eder. Yayın öncesi kontrol listesi (M9):
   üretim ortamında üçü de dolu, aksi hâlde sunucu açılmaz (o profil için ayrı iş).
4. **Politika:** silme cümlesi Apple girişinin de sonlandırıldığını; olmazsa Ayarlar › Apple Kimliği › Apple ile Giriş'ten elle durdurulabileceğini söyler.

## Neden
- Saklamak (TN3194'ün önerisi) kullanıcı başına uzun ömürlü bir Apple jetonu ve onu koruyan bir anahtar demek; tek kullanımı silmedeki iptal.
  Silme anında yeniden yetki aynı sonucu hiçbir şey saklamadan verir; bedeli silmede bir Face ID onayı.
- `sub` eşleşmesi: oturum açmış biri başkasının kodunu gönderip onun Apple oturumunu düşüremesin.

## Alternatifler ve neden o değil
- **Girişte jeton yanıtını şifreli saklamak:** yeni kolon + anahtar yönetimi + envanter/politika maddesi; kazanç yalnız silmede Face ID'siz iptal.
- **Yalnız elle iptal talimatı:** Apple'ın "should use the REST API" beklentisini karşılamaz.

## Sonuçlar
- `contracts/openapi.yaml`: yeni uç nokta + hata kodu; mobil tipler yeniden üretilir.
- Silme akışı telefonda bir adım uzar (Apple sayfası); kapatılabilir.

## Geri dönmenin maliyeti
Orta: saklama yoluna geçilirse giriş akışı ve şema değişir; uç nokta kalabilir.

## Etkilenen
`backend/src/main/java/app/keel/identity/` (iptal istemcisi, uç nokta), `application.yml`, `contracts/openapi.yaml`, `apps/mobile` (silme akışı),
`docs/yasal/site/privacy.md`, `docs/yasal/veri-envanteri.json` (dışarı akış: Apple, silmede).

## Doğrulama
Sahte Apple sunucusuyla: doğru form alanları, geçerli ES256 istemci sırrı, `sub` eşleşmezse iptal yok, anahtar yoksa 503, Apple hata verirse
hesap silmesi etkilenmez; mobilde Apple sayfası kapatılınca silme sürer.
