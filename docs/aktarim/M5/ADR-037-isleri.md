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

K1: akış testinin yürüyüşü değişmedi (yeni adım yok); `walkTo`'ya yalnız "expectations'ta dur" eklendi.
İnceleme: code-reviewer — iOS kesin "hayır" deyince düğme kalıyor ve hiçbir şey yapmıyordu → iOS Ayarları yolu (Ayarlar'daki
gibi), "henüz karar vermedi" ayrı; yazılan cümle "Sounds good"da sessizce kayboluyordu → "yalnız açarsan saklanır" notu; adıma
geri gelince açık hatırlatmalar yeniden teklif ediliyordu → servisin durumundan başlar. Mutasyon 7/7 + 7/7.

### Soru bankası
1. Hatırlatma teklifi neden ayrı bir onboarding ekranı olmadı?
2. iOS izin sayfası neden açıklamadan **sonra** çıkıyor?
3. Profil kaydedilmeden hatırlatmaları açmak neden bir sorun değil?

## K-432 · Hedefin geldiği seans düzenlenince hedef yeniden türetilir (ADR-037 › 48) — #277
| # | Basamak | Proje yeri |
|---|---|---|
| 1 | **Türetilmiş durum:** sonraki hedef (yük/tekrar) bir seansın setlerinden türer ve `planned_exercise`'a "nereden" (`next_from` = seansın başı) ile yazılır | `SessionProgress`, `ProgramStore.setNext` |
| 2 | Bitmiş bir program seansına set eklenir/silinirse aynı türetme, seansın **şimdiki** setleriyle yeniden koşar — aynı transaction'da | `WorkoutController.log/deleteSet` (`@Transactional`), `SessionProgress.edited` |
| 3 | **Hareket başına:** `setNext` yalnız `next_from <= seansın başı` iken yazar → daha yeni seansın hedefi ezilmez; yeni seans bir hareketi atladıysa o hareketin hedefi eski seanstandır ve eski seansın düzeltmesi onu düzeltir | `ProgramStore.setNext`, ADR-037 uygulama notu |
| 4 | Kaynağı kalmayan hedef (hareketin tüm setleri silindi) silinir — silinmiş veriden hedef kalmaz | `ProgramStore.clearNext` |
| 5 | Bitişteki "form temiz değil" cevabı artık saklanır (V24): yeniden türetmede tutulan hareket tutulmaya devam eder | `V24__training_unclean_moves.sql`, `WorkoutStore.finish` |
| 6 | Telefon notu sunucunun söylediğine bağlı: `setsNextTargets` (bu seansın düzenlemesi bir hedefi oynatabilir mi — `setNext`'in koşuluyla aynı) | `Workout.setsNextTargets`, `workout-edit.tsx` |

RED: testler önce CI'da (5 kırmızı). İnceleme: code-reviewer — bayrak `setNext`'ten dar tanımlanmıştı (hedefsiz harekete set eklemek
de hedef koyar), telefon notu birleşince yanlış olacaktı (kabulün ikinci maddesi aynı PR'a alındı), kural kartta "son seans"
diyordu ama hareket başına uygulanıyor → ADR notu + test. Mutasyon 3/3 (saf `movesATarget`) + 1/1 (mobil not); DB yolları CI'da RED önce.

### Soru bankası
1. "Türetilmiş durum" nedir; hedef neden setlerden her seferinde hesaplanmıyor da saklanıyor?
2. Eski bir seansı düzenlemek neden yeni seansın hedefini bozamıyor?
3. "Form temiz değil" cevabını saklamasaydık düzenleme neyi yanlış yapardı?
