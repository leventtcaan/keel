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
