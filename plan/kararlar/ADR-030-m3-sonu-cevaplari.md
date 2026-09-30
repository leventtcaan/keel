# ADR-030 · M3 sonu: Levent'in cevapları (sorular 25-32, K-308 hesap adımları)
- **Durum:** KABUL (Levent, 30 Eyl – 1 Eki 2026 — AskUserQuestion; 25 ve 27 M3 Part 3 başında, gerisi Part 3 sonunda)
- **Tarih:** 2026-10-01 · **Karar veren:** Levent (sağlık/veri/ürün/hesap); uygulama ayrıntısı agent

## Bağlam
M3 Part 2 ve Part 3'ün incelemelerinden (K-304, K-306, K-310, K-312, K-227, K-228) sekiz soru çıktı (DURUM 25-32); K-308'in
hesap adımları (Expo, Apple) Levent'in onayını bekliyordu. Hukuki değerlendirme agent'ın okumasıdır, hukuk görüşü değildir
(M8'de gözden geçirme).

## Kararlar
| # | Konu | Karar | Etki |
|---|---|---|---|
| 25 | Çevrimdışı sağlık kaydına 403 CONSENT_REQUIRED | **(c) Girişte rıza sorulur:** rıza yoksa sağlık kaydı telefonda hiç tutulmaz; giriş ekranı önce rızayı ister. Rızadan önce girilen veri sonradan işlenmez. Antrenman/set rızaya bağlı değil | Mobil: K-402/K-407 giriş ekranları rıza kapısıyla; kuyruktaki REJECTED yolu yalnız yarış durumu (rıza gönderim sırasında geri çekildi) için kalır |
| 26 | K1: `app-services.test.ts` beklentisi (K-310) | **Onay.** Yeni hâli aynı iddiayı daha sıkı kurar (her istek kendi adresiyle; `/v1/auth/sign-out`'a tam bir çağrı). K1 istisnası olarak kayıtlı | Değişiklik yok |
| 27 | Profil PUT'u rıza yokken `avoid` listesini ezer | **K-231 ile, M4'te:** rıza geri çekmede bağlı veri zaten silinir (ADR-028 #21); PUT'un rızasız davranışı K-231'de onunla tutarlı kurulur, test | K-231 kabul kriteri (M4 Part 1) |
| 28 | Referans görünüş adımı (7 seviye) | **(a) Çizimler gelene kadar gizli.** Motor bel/RFM ile çalışır; kaynaksız girdi yok (U14). Çizimler gelince K-313 açılır | K-313 M4'te **bekler** (çizim bağımlılığı); onboarding'de adım yok |
| 29 | "Gerçekçi gün" sınırı | **(a) Böyle kalsın:** uyarı var, sınır yok; kaynaksız eşik konmaz | Değişiklik yok |
| 30 | `safety` işaretinden cevabın çıkarılabilmesi | **(a) Kabul, artık risk:** kayıt sağlık rızası ve hesap erişimi arkasında; silme ve dışa aktarma kullanıcıda. ADR-028 #24'ün doğası | Değişiklik yok; M8 gizlilik gözden geçirmesinde yeniden bakılır |
| 31 | Mini cut'ın açığı | **(a) Onay:** bakım tahmini − `cut_step_min_kcal` (TÜRETİLMİŞ: G7 K-102 süre, G7 K-97 en küçük adım); taban (LEA, BMR, makro) delinirse, kadında yağ tahmini yoksa ya da taban okunamıyorsa bakım; süre en fazla `mini_cut_weeks_max`, sonra bulk'a dönüş | K-227 (#211) birleşir |
| 32 | Mini cut sürerken kalori adımı | **(a) Adım yok:** mini cut bitiş gününe kadar haftalık omurganın kalori adımı (aşağı ya da yukarı) uygulanmaz; güvenlik ağı her zaman çalışır | Motor kuralı `mini_cut_running` → K-227'ye eklendi (#211) |
| — | K-308 hesap adımları (eas init, cihaz derlemesi, TestFlight) | **M4 Part 1 başında birlikte:** komutları agent hazırlar (`docs/eas-derleme.md`), Levent kendi terminalinde onaylayıp çalıştırır; Apple girişi ve .p8 Levent'te (V5) | M3 çıkış kriteri "cihazda development build + dahili TestFlight" **açık** kalır → M4 Part 1'in ilk işi |

## Sonuç
Uygulanan: #31 ve #32 K-227'de (#211). M4'e taşınan: #25 (K-402, K-407 giriş ekranları), #27 (K-231), #28 (K-313 bekler),
K-308'in cihaz adımları (M4 Part 1 başı). Değişiklik gerektirmeyen: #26, #29, #30.
