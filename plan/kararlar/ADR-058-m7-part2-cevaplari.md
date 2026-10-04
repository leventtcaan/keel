# ADR-058 · M7 Part 2 cevapları (105-107): zorunlu paywall, iOS'ta duraklatma yok, deneme hatırlatması
- **Durum:** KABUL (Levent, 2026-10-04 — üçünde önerilen)
- **Tarih:** 2026-10-04 · **Karar veren:** Levent (öneren: agent)

## Bağlam
K-702 (ADR-057) paywall'u yalnız kullanıcı dokununca açıyordu (koç/fotoğraf 403'ü, Ayarlar) — pratikte freemium. ADR-012 "ücretsiz katman
yok" diyor; araştırma (05 §7.3) sert paywall: 35. gün dönüşüm %10,7 vs freemium %2,1, kurulum başına gelir 8×, 12 aylık tutundurma aynı.
K-703 aboneliği **biten** kullanıcıya deterministik modu açık bıraktı (veri rehin değil). App Store'da abonelik duraklatma yok (yalnız Google
Play; ADR-056 `SUBSCRIPTION_PAUSED`'ı Play'e özgü yazıyor; ADR-057). Prototip paywall'ı "Day 5: we remind you" ve "Pause up to 3 months" diyordu.

## Karar
### 107 · Onboarding sonunda zorunlu paywall (K-706)
Hiç abone olmamış hesap onboarding'i bitirince paywall'a gelir; deneme başlatmadan
(ya da geri yüklemeden) sekmelere geçemez. Kapatma düğmesi yok; Restore ve yasal bağlantılar var. **Aboneliği biten** (sunucuda bir durumu
olan: EXPIRED, REFUNDED, CANCELLED süresi geçmiş…) kullanıcı kapıya takılmaz: deterministik mod (K-703, ADR-056 #10) — kaydı, geçmişi,
kararı, dışa aktarma ve silme ona açık. Mağaza derlemede yoksa (Expo Go, anahtarsız) ya da yasal bağlantılar eksikse kapı kapanmaz
(geliştirme derlemesi kilitlenmez; mağaza derlemesinde ikisi de yapılandırmada olur — M9 kontrol listesi).
### 106 · iOS'ta duraklat düğmesi yok
Ayarlar'da yalnız "Cancel or change plan" (Apple'ın sayfası, iki dokunuş). K-702'nin kabul kriteri ve
prototipin "Pause" satırları buna göre düzeltilir; Android gelince Play duraklatması ayrı iş.
### 105 · Deneme bitmeden yerel hatırlatma (K-707)
Denemedeki kullanıcı isterse ("Remind me before it ends") deneme bitmeden
`trial_reminder_days_before` gün önce telefonda bir yerel bildirim. **Fatura bildirimidir, ADR-036'nın üç hatırlatma türünden sayılmaz**
(dinlenme sayacı emsali): kendi kimliğiyle kurulur, hatırlatma planının temizliği ona dokunmaz; izni kullanıcının dokunuşu ister. Sunucuya,
üçüncü tarafa veri gitmez. Deneme ACTIVE'e döner ya da iptal edilirse kaldırılır; çıkışta unutulur. Paywall'ın deneme satırları bunu söyler
("if you'd like one" — izin vermeyene söz verilmez).

## Sonuçlar
- Yeni görevler: **K-706** (kapı: telefonda `SubscriptionGate`, kök düzende korumalı grup; çevrimdışında son bilinen cevap — uçak modu kapıyı
  açmaz, abonenin kilidini de kapatmaz), **K-707** (hatırlatma: `AlertAccess` kalıbı, parametre `trial_reminder_days_before`).
- K-706 uygulaması (agent): kapı ekranı (`app/subscribe.tsx`) paywall'ın yanında **hesap bölümünü** de taşır — dışa aktarma, hesap silme,
  çıkış: App Review 5.1.1(v) silmeyi uygulama içinde ister ve ödeme yapmadan ulaşılabilmelidir. Kapı servisi `subscription/gate.ts`;
  ilk açılışta cevap yoksa (`unknown`) kapı ekranı sorar ve bekler.
- K-702 kabul kriteri: "Duraklat ve iptal iki dokunuşta" → "İptal iki dokunuşta (iOS'ta duraklatma yok — ADR-058)".
- Prototip 1.11 ve 5.2: "Pause" satırları kaldırıldı; "Day 5" satırı K-707'nin diliyle.
