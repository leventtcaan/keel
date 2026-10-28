# ADR-083 · App Review 1.0 reddi: izin öncesi düğmeler "Continue", mağaza görsellerinde fiyat yok (K-1036)
- **Durum:** KABUL (agent, App Review uyumu; rıza mekaniği değişmedi, düğme metni Levent'e bildirildi)
- **Tarih:** 2026-10-28 · **Karar veren:** agent

## Bağlam
1.0 (build 4) 28 Eki'de iki gerekçeyle reddedildi (gönderim `87ef804d-6877-45f2-b941-84d2486734cf`, inceleme cihazı iPad Air 11" M3):
1. **2.3.7 Accurate Metadata:** mağaza görsellerinde fiyat atfı. 6. kare "Try it free for 2 weeks. Then a subscription. Cancel any time."
   Apple: ücretsiz ya da indirimli hizmet atfı da fiyat sayılır; yeri açıklama metnidir.
2. **5.1.1(iv) Data Collection and Storage:** HealthKit izninden önce özel bir mesaj ve "Allow" düğmesi. Apple: düğmede "Continue" ya da
   "Next" gibi bir söz kullanılmalı; izin isteği kullanıcının kararıdır, uygulama yönlendirmez.

Akış: sağlık verisi rızası (GDPR md. 9, ADR-007/ADR-072) Apple Health'in önünde durur, çünkü Apple Health'in getirdiği her şey sağlık
verisidir. Apple bu rıza ekranını HealthKit'in ön mesajı olarak okuyor. Aynı kalıp kamera izninde de var ("Allow camera").

## Karar
1. **İzin ya da sağlık rızası öncesi her özel ekranda ana düğme "Continue".** Kapsam (`data/copy/en.json`):
   `onboarding.healthData.allow` "Allow" → "Continue" · `onboarding.appleHealth.connect` "Connect" → "Continue" ·
   `weighIn.consent.allow`, `meal.consent.allow`, `state.consent.allow` "Allow and continue" → "Continue" (ADR-077 #6'daki düğme adı
   böylece değişir) · `capture.allow` "Allow camera" → "Continue" · `meal.barcode.askAgain` "Allow the camera" → "Try the camera again".
   Apple Health'in ilk kullanım sorusu (`health.jit.continue`) zaten "Continue".
2. **Ayarlar'daki rıza satırı** (`settings.consents.allow`) "Allow" → "Turn on": orası bir ön mesaj değil, durumu gösteren bir ayar satırı;
   Ayarlar'daki diğer anahtarlar da "Turn on" der (hatırlatmalar, Apple Health'e yazma).
3. **Bu Hafta'daki kilit satırı** (`thisWeek.food.allow`) "Allow" → "Settings": düğme Ayarlar'ı açar, bir şeye izin vermez; erişilebilirlik
   etiketi "Health data consent in Settings".
4. **Rıza mekaniği aynı:** ayrı ekran, metin görünür, tam metin bir dokunuşta, kaydedilen sürüm aynı, yanında "Continue without" / "Not now",
   geri çekme Ayarlar'da. GDPR açık rızası düğmenin adından değil, ekranın ne için onay istediğini söylemesinden ve olumlu eylemden gelir
   ("Kept only with your OK" satırı ekranda). Rıza metinlerinin sürümü değişmez.
5. **Mağaza görselleri:** fiyat, deneme süresi, "free", indirim ya da iptal atfı görsellerde yok. 6. kare ürün tezini söyler
   ("Data in, call out" / "Other apps show you the data. This one makes the call."). Deneme ve fiyat yalnız açıklama metninde ve paywall'da.

## Reddedilen
- (a) Sağlık rızasını Apple Health'ten ayırıp Apple Health'i önce sormak: GDPR md. 9 sırası bozulur (rızasız sağlık verisi okunur).
- (b) Yalnız Apple'ın gördüğü ekranı değiştirmek: kamera ve öteki rıza ekranları aynı kalıpta, ikinci bir red turu demek.
- (c) Ayarlar satırında da "Continue": bir ayar satırında anlamsız; iOS'un kendi Ayarlar dili "Turn on".

## Sonuç
Yeni derleme (build 5) gerekir; metin değişikliği JS paketine girer. Kaynak: App Review mesajı 28 Eki 2026 (ASC › App Review).
