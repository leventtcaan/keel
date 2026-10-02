# ADR-037 işleri (M5 Part 1 başı: backend + kalan mobil) — aktarım planı

> Durum: PR'lar · **aktarılmadı**. Karar: ADR-037. Her görev küçük; birlikte anlatılır. M4'teki mobil olanlar
> (K-435, K-433) `docs/aktarim/M4/ADR-037-isleri.md`'de.

## K-429 · Sağlık verisi rıza metni: geri çekince silinir, sürüm `2-draft` (ADR-037 › 36) — #270
| # | Basamak | Proje yeri |
|---|---|---|
| 1 | Rıza bir **metnin sürümüne** verilir; sunucu yalnız güncel sürümü kabul eder, kapı (gate) eski sürüme verilmiş rızayı yok sayar | `ConsentProperties.current`, `application.yml › keel.consent.versions` |
| 2 | Telefon metni ve sunucu sürümü aynı olmalı — bir test ikisini karşılaştırır (biri değişip öteki değişmezse her rıza 400) | `consent-versions.test.ts` |
| 3 | Metin K-231'in yaptığını söyler: geri çekince yukarıdakiler **antrenman kaydı hariç** silinir, geçmiş kararlar ve kaçınılan yiyecekler de | `data/copy/en.json › consent.health_data.body` |
| 4 | Telefon eski metne verilmiş rızayı `OUTDATED` okur: izin sayılmaz (yeniden sorulur), ama **geri çekilebilir** — yeni metne "evet" demeden silme (GDPR Art. 7(3)) | `consents.ts` (`PhoneConsentStatus`, `revised`), `ConsentsSection.tsx` |
| 5 | Çevrimdışı kopya sürümüyle saklanır (`GRANTED@2-draft`): güncellemeden önceki "evet" eski metne verilmiştir | `consentState.ts` (`kept`) |
| 6 | Backend testlerindeki 26 `"1-draft"` rıza isteği tek sabite bağlandı; iddialar değişmedi (K1); sabit sunucunun sürümüyle karşılaştırılır | `ConsentTextVersions.java`, `ConsentTests` |

RED: ilk commit sunucuyu `1-draft`'ta bıraktı → CI'da mobil (sürüm eşleşmesi) ve backend (rıza istekleri 400) kırmızı.
İnceleme: code-reviewer — metin "bu veri silinir" diyordu ama listede antrenman da var ve antrenman silinmiyor (ADR-007) →
metin düzeltildi + test; eski rızalı kullanıcı Ayarlar'da Withdraw'ı kaybediyordu → `OUTDATED` (iki düğme). pr-test-analyzer —
çevrimdışı ilk açılışta eski "evet" geçiyordu → sürümlü kopya; geçerli sürümde rızanın verili kaldığı test edilmemişti; GET'in
eski rızayı nasıl listelediği sabitlendi. Mutasyon 9/9.

### Soru bankası
1. Rıza neden bir metnin sürümüne verilir, "evet/hayır" olarak saklanmaz?
2. Eski metne rıza vermiş kullanıcı neden "Allow" ile birlikte "Withdraw" görür?
3. Telefon çevrimdışıyken eski bir "evet"i nasıl yeni metne verilmemiş sayar?

## K-434 · Hatırlatmalar onboarding'de, bir kez, açıklamasıyla (ADR-037 › 51) — PR aşağıda
| # | Basamak | Proje yeri |
|---|---|---|
| 1 | Karar (ADR-037 #51, agent): rutin cümlesi antrenman saatinin sorulduğu akışta kurulur (I1 C3); iOS izni bağlamıyla sorulur, sayfası bir kez çıkar | `RemindersOffer.tsx` |
| 2 | **Ayrı ekran değil:** K-306'nın kabulü "görünüş (K-313) ve AI rızası (K-511) eklenince de ≤12 ekran" (I1 F1) — ayrı adım 13 yapardı, test (`onboarding-draft.test`) yakaladı. Teklif "What to expect" ekranında: haftanın ritmi orada anlatılıyor; "Sounds good" = "Şimdi değil" (hiçbir şey sormaz, saklamaz) | `expectations.tsx` |
| 3 | "Turn on": önce cümle (`setCue`), sonra Ayarlar'la **aynı servis** (`reminders.turnOn`) → iOS sayfası; cevap ekranda (açık / iOS'ta kapalı → Ayarlar yolu) | `reminders.ts` |
| 4 | Hatırlatmalar onboarding'i hiç bekletmez: hata adıyla raporlanır (V3: cümle mesajda olabilir), ekranda söylenir | `RemindersOffer.tsx` |
| 5 | Profil henüz kaydedilmeden açılması zararsız: `reschedule` takvimsiz plan kurar, profil kaydı `keepSchedule` ile yeniden kurar | `reminders.ts` (`keepSchedule`) |

K1: akış testinin yürüyüşü değişmedi (yeni adım yok); `walkTo`'ya yalnız "expectations'ta dur" eklendi. Mutasyon 7/7.

### Soru bankası
1. Hatırlatma teklifi neden ayrı bir onboarding ekranı olmadı?
2. iOS izin sayfası neden açıklamadan **sonra** çıkıyor?
3. Profil kaydedilmeden hatırlatmaları açmak neden bir sorun değil?
