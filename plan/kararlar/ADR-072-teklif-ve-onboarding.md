# ADR-072 · Teklif iki ritim ve yeni onboarding: deneyim, program dalı, başlangıç ağırlıkları, plan hazır, Health izni anında
- **Durum:** KABUL (Levent, 2026-10-07)
- **Tarih:** 2026-10-07 · **Karar veren:** Levent (prototip tur 3 onayı, 7 Eki); öneren: agent
- **Değiştirdiği:** ADR-018 (Health izninin zamanı, Ek 1), ADR-069 #2 (başlangıç kararının içeriği)

## Bağlam
Tur 1, haftalık kararı öne koyup kategorinin para kazandığı anı gömdü: **hazır antrenman** (Fitbod'un 558 gündür yayında olan "kas seç,
antrenman hazır" demosu, M1 §5, §8). Tur 3'te Levent'in eksik dediği şey, kullanıcının işe karışabilmesiydi: deneyim farkı yoktu, kendi
programı olan dinlenmiyordu. Bugünkü onboarding 10 adım ve `sessionsLastMonth` ile `usualTrainingTime` soruyor; sunucu `sessionsLastMonth`'u hiç
okumuyor. Profilde deneyim alanı yok (`contracts/openapi.yaml` Profile). Health izni onboarding'de isteniyor (ADR-018).

## Karar sürücüleri
- Reklam ile ürün aynı vaadi taşır (ADR-068); onboarding somut bir çıktıyla biter (M2 K1-K2, 12 uygulamanın 9'u).
- Ekran başına ≤25 kelime (ADR-069); her soru kararda kullanılır (U9).
- Kaynaksız motor kuralı yok (U14); deneyim yıl sayısıyla ölçülemez (G1 K-73: seviye "kendini gerçekten zorlayabilmek").

## Karar
1. **Teklif iki ritim:** her seans "bugünün antrenmanı hazır" (her setin kilosu ve tekrarı, çift ilerleme), her pazartesi "planın ayarlanır ve
   nedenini söyler". Satış cümlesi ve hoş geldin ekranı: **"Stop guessing in the gym. Every Monday your plan adjusts, and tells you why."**
   Motorun kapsamı değişmez; yüzün sırası değişir: antrenman önde, karar onun üstünde, beslenme destekte.
2. **Akış** (prototipteki `#id`'ler): `welcome` (Apple ile giriş, dönen örnek kararlar, kişisel veri yok) → `ob-goal` (Decide for me önerilen) →
   `ob-exp` → `ob-program` (Build it for me önerilen) → kendi programı varsa `ob-own` → `ob-review` (ADR-073), yoksa `ob-days` →
   `ob-consent` (GDPR Md. 9, tam metin bir dokunuşla) → `ob-about` (boy, kilo, doğum yılı; cinsiyet iki seçenek "for the energy math") →
   `ob-activity` (4 düzey) → tecrübeli ya da kendi programı olanda `ob-weights` → `ob-preparing` → `ob-plan` → `paywall` → Bu hafta.
   Hesap başta kalır: başlangıç kararını motor sunucuda verir (U1).
3. **Deneyim sorusu** (`ob-exp`): Just starting / Under a year / 1-3 years / 3+ years. Motor kuralı değiştirmez; **akışı** değiştirir:
   - Yeni başlayana ağırlık sorulmaz; ilk seans ağırlıkları bulur (kalibrasyon, ADR-075). Hareket nasıl yapılır ipuçları varsayılan açık.
   - Tecrübeliye `ob-weights` sorulur: "about 8 times" yapabildiği kilo, üç ana hareket, her biri atlanabilir.
   - 1. hafta "bir gün ekle" önerisi yalnız yeni başlamayana (G6 K-36: "yeni başlayan için 3 gün yeterli"; ADR-077).
   Sözleşme: `Profile.experience` (`NEW`, `UNDER_1Y`, `Y1_3`, `Y3_PLUS`), isteğe bağlı (eski profiller bozulmaz).
4. **Günler tek soru** (`ob-days`): kaç gün, 2-5 kutu. Günleri uygulama yerleştirir (parametre: gün sayısına göre varsayılan hafta günleri),
   kullanıcı istediği an taşır. "Geçen ay kaç seans" ve "genelde saat kaçta" soruları kalkar; sözleşmedeki alanlar isteğe bağlı kalır, telefon
   artık göndermez. 2 gün yalnız kullanıcının seçimi; motor 3'ün altını önermez (ADR-071 #8).
5. **Başlangıç ağırlıkları:** girilen her kilo o hareketin ilk hedefi olur (spor salonuna yuvarlanır, ADR-032). Girilmeyen hareketlerin kilosu
   oranla **türetilmez**; Güray'da deneyime göre başlangıç ağırlığı kuralı yok (G1 boşluk #15). O hareketler ilk seansta bulunur.
6. **Plan hazır = başlangıç kararı** (`ob-plan`), U3'ün dört parçasıyla: eylem (ilk antrenman: hareketler, set × aralık, biliniyorsa kilo;
   kardiyo satırı; başlangıç kalorisi), gerekçe (cevapların geri yansıması: hedef, gün, günler), güven ("Your scale corrects it in 14 days"),
   tarih (ilk karar pazartesi, gün sayacı). Pazartesi sabahı bildirimi teklifi burada (K-434'ün yeri). `ob-preparing`'in üç satırı sunucu
   cevabının gerçek adımlarına bağlı (sahte ilerleme yok).
7. **Paywall:** sert (ADR-058), **2 hafta deneme** (ADR-071 #1) ve zaman çizelgesi: bugün ücret yok · ilk karar tarihi · hatırlatma (isteğe
   bağlı, `trial_reminder_days_before`) · ücret günü. Plan önizlemesi, üç değer satırı, yıllık/aylık. Restore, Terms, Privacy, Account
   (5.1.1(v)) yerinde.
8. **Apple Health izni anında** (ADR-018 Ek 1): ilk tartıda ya da ilk antrenmanda bir kez (`health-jit`), "Not now" serbest. Onboarding'in
   photos, foods, expectations ve apple-health ekranları iner (ADR-069 #3); yiyecek kısıtı Ayarlar'da.
9. **Kelime hedefleri** (prototipte ölçüldü): soru ekranları ≤25-30, plan ≤55, paywall ≤70 (yasal satırlar sayılmaz).

## Neden
Hazır antrenman kategorinin kanıtlanmış satan anı; haftalık karar yalnız bizde olan şey (M1 §6; 05 §6.2). Somut çıktıyla biten onboarding
"ne nerede" karışıklığını azaltır (M2 K1-K2). Deneyim dalı Levent'in tur 3 notunu karşılar; motor kuralını yıl sayısına bağlamak G1 K-73'e
aykırı olurdu, bu yüzden deneyim yalnız akışı ve ipucu düzeyini değiştirir. Okunmayan soru (`sessionsLastMonth`) U9'a göre sorulmaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Onboarding'i kalori kararıyla bitirmek (tur 1) | Satan anı gömdü; Levent'in hükmü "yeterli değil" |
| Herkese başlangıç ağırlığı sormak | Yeni başlayan bilmez; yanlış sayı ilk seansı bozar |
| Bilinmeyen kiloları orandan türetmek | Kaynak yok (U14) |
| Health iznini onboarding'de tutmak | Değeri görülmeden izin; ekran başına değer düşük (M2 K4) |

## Sonuçlar
- Olumlu: 10 adım → yeni başlayanda 9 ekran, her biri tek soru; ilk antrenman paywall'dan önce görünür.
- Olumsuz: kendi programı dalı motora yeni iş getirir (ADR-073). Sözleşme değişikliği (`experience`, başlangıç ağırlıkları).

## Geri dönmenin maliyeti
Orta: ekranlar ve sözleşme alanı; motor değişmediği için kural maliyeti yok.

## Etkilenen
`apps/mobile/src/app/onboarding/*`, `sign-in.tsx`, `subscribe.tsx`, `PaywallView`, `contracts/openapi.yaml` (Profile.experience, başlangıç
ağırlıkları), backend profile + program (ilk hedefler), `data/copy/en.json › onboarding`, `data/parameters/onboarding.json` (varsayılan günler),
ADR-018 (Ek 1), ADR-058, ADR-069.

## Doğrulama
Onboarding rota testi: yeni başlayanda `ob-weights` yok, kendi programında `ob-review` var · sözleşme testi: `experience` isteğe bağlı, eski
profil geçerli · telefon `sessionsLastMonth`/`usualTrainingTime` göndermez · başlangıç ağırlığı girilen hareketin ilk hedefi o kilo (yuvarlanmış),
girilmeyende hedef kilo yok · copy testi: onboarding anahtarlarında kelime bütçesi.
