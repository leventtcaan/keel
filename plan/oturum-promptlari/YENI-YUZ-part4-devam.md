# M9a Part 4 · BİTTİ (15 Eki gece) — kalan yalnız K-984 (Levent'e bağlı)

> Part 4 ÇIKIŞ = M9a ÇIKIŞ (kod): DURUM › M9a ilerleme › Part 4 ÇIKIŞ. Main `7f1d006d`. Açık PR yalnız Dependabot #547.

## K-984 için ön koşullar (Levent)
1. **K-983:** App Store Connect › yıllık ve aylık abonelikte introductory offer "Free, 2 weeks".
2. **K-976 (isteğe bağlı, cihaz turundan önce):** Facebook App ID → EAS ortam değişkeni `EXPO_PUBLIC_FACEBOOK_APP_ID` (değer sohbete değil). Yoksa Story düğmesi sistem paylaşım sayfasına düşer.

## Cihaz turunda bakılacaklar (Tur 4'ten kalan, simülatörde yapılamayan ya da düşük güvenli)
iPhone SE (667 pt) · onboarding plan ekranı (Apple girişi) · canlı Pause · bayat/çevrimdışı seans, gece yarısı · kamera arka planı + Story (App ID varsa) ·
Kalın Metin son bakış (K-910 sonra done) · Apple Health kardiyo Undo'suz görünümü · weigh-in nokta grafiği eksensiz mi · Weigh-in sonrası iki birincil düğme ·
Food left kartı FAB altında mı · egzersiz simgeleri · Settings başlık hiyerarşisi · sticker ön izleme boşluğu ve panel · 'Haven't trained' sonrası
toparlanma sorusu gizli · rıza metni 4 madde (v5, eski rıza yeniden sorulur).

## K-984 prompt'u (K-983 bitince)
```
oturum-baslat. Toplu mod. M9a son iş: K-984 (TestFlight derlemesi + Levent cihaz turu). Kaynak: plan/oturum-promptlari/YENI-YUZ-part4-devam.md.
Önce: K-983 yapıldı mı (RevenueCat sandbox'ta introPrice 2 hafta okunur — sen kontrol et), K-976 App ID EAS'ta mı. Disk ≥ 5 GB değilse dur, söyle.
EAS derlemesi (docs/eas-derleme.md) → TestFlight; Levent'e cihaz turu listesini (dosyadaki liste + prototip/akis-testi.md A-D) madde madde ver, notları backlog'a kart yap.
Bitiş: K-984 done → DURUM "M9a ÇIKIŞ (tam)" + yol-haritası M9a çıkış kriterleri tek tek + sıradaki M9 Part 3 (plan/oturum-promptlari/M9-part3.md) prompt'u.
```

## Sonra: M9 Part 3 (beta kohortu, K-904)
Prompt `plan/oturum-promptlari/M9-part3.md` (K-984'ten sonra).
