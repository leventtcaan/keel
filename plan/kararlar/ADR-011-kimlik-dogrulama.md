# ADR-011 · Kimlik doğrulama: Sign in with Apple
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
iOS önce. Parola saklamak güvenlik yüzeyi ve sürtünme demek. Kullanıcıdan en az iş (U9).

## Karar
- Tek giriş yöntemi **Sign in with Apple** (`expo-apple-authentication` 57.0.2, npm'de 2026-09-29 doğrulandı).
- Backend Apple kimlik token'ını Apple'ın açık anahtarlarıyla doğrular, kendi oturum token'ını (JWT) verir.
- E-posta/parola yok. Android gelirse ikinci yöntem ayrı ADR ile.

## Neden
Parola saklanmaz; tek dokunuş; Apple, kullanıcıya e-posta gizleme imkânı verir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| E-posta + parola | Parola güvenliği, sıfırlama akışı, sürtünme |
| Üçüncü taraf auth (Auth0, Clerk, Firebase Auth) | Ek sağlayıcı ve maliyet; öğrenme değeri düşük; veri dışarı çıkar |

## Geri dönmenin maliyeti
Düşük-orta.

## Etkilenen
`identity`, mobil giriş ekranı.

## Doğrulama
Geçersiz/imzasız/süresi geçmiş token'ın reddedildiğini gösteren testler.
