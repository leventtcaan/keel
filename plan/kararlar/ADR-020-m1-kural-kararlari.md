# ADR-020 · M1 kural kararları ve M2/M3 ön kararları (L-1…L-13)
- **Durum:** KABUL (Levent, 2026-09-29 akşam)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
M1 toplu koşusunda görev kartları ile araştırma üç yerde çelişti; bazı eşikler araştırmada yoktu, türetildi. Sağlık ve ürün
yorumu gerektirenler Levent'e bırakıldı (ADR-019). Kaynak satırları: `plan/m1-kural-haritasi.md`,
`plan/m1-k106-tasarim-onerisi.md`.

## Karar — M1 motoru
| No | Karar | Uygulama notu |
|---|---|---|
| L-1 | 8 haftada >%8 kayıp ve EA ≤ eşik → **açığı daralt + uyar** (hard stop değil). **Tek hard stop:** kullanıcı adet kaybı bildirirse — kesim durur, bakım, sağlık profesyoneline yönlendirme | J1 C6/L2.1 (`J1:455-467`). K-104 kartı ve WC-11 buna göre güncellenir (spesifikasyon satırı değişir). Adet sorusu: LEA bandına girince tek dokunuşluk, cevap saklanmaz (J1:463-467, GDPR Art. 9) |
| L-2 | LEA eşiği **erkek 25, kadın 30** kcal/kg FFM/gün | `safety.yaml › lea_threshold_kcal_per_kg_ffm` by_sex; uyarı eşiği (erkek 30, kadın 35, J1:456-457) da parametre |
| L-5 | "Genetik limit → kaloriyi geri çek" **iki yönde** (bulk: fazlayı azalt, cut: açığı azalt) | 03 §2.4 ağacı; WC-07 tek yönlü kalmaz |
| L-6 | Karar motorunun **uyumu = K-111 tutarlılık oranı** (tek sayı) | `on_track_min_ratio` ile aynı çizgi |
| L-7 | Başlangıç kalorisi: **Mifflin-St Jeor + aktivite katsayısı** başlangıç tahmini [literatür], **gözlemle düzeltilir** (erkek 14, kadın 28 gün) | Literatür kaynağı önce `arastirma/`'ya eklenir (K6/U14); Güray K-8 "gözlem formülü yener" ile uyumlu: formül yalnız başlangıç |
| L-9 | Uyum %50-70 ve kilo hedef yönde değil → **kalori sabit, FIX_ADHERENCE** (yumuşak metin); kaloriye ancak ≥%70'te dokunulur | G2 K-60 |
| L-10 | "Sabit" = pencerenin ilk ve son haftası ortalama farkı **türetilmiş gürültü payının** (~0,58 kg, n=4) altında | Parametre olarak, `min_weighins_per_week` türetmesiyle aynı hesap, notunda |
| L-11 | Kalori hedefi makro tabanlarının altında (`TargetTooLow`) → **CHANGE_MOVEMENT** (BMR tabanıyla aynı mantık, G2:869) | |
| L-12 | Deload 3. basamak **iki ayrı sinyal:** "geçen haftanın kilosu kalkmadı" → FIX_RECOVERY (G7 K-68) · "planlanan seanslar iki hafta üst üste planlandığı gibi yapılamadı" → FULL_REST_WEEK (G7 K-70/K-73) | WC-18'in kaynaksız 0,4 eşiği kalkar, K-73'ün ikili testi kullanılır |
| L-13 | Ekranda **yalnız kümülatif** tutarlılık ("12'de 9"); seri motorda kalır, gösterilmez | |
| Eşikler | Onaylandı: `min_weighins_per_week: 4`, `plateau_sessions: 3`, `on_track_min_ratio: 0.7`, faz çizgileri (<%12/%22 · %20/%30 · %25/%35) | "onay bekliyor" notları kaldırılır |
| K-101 | **NO_DECISION_YET de en az bir gerekçe taşır** (U2: neyin kararı değiştireceği hep söylenebilsin) | Kabul kriteri + `DecisionTests.acceptsNoDecisionYetWithoutAReason` değişir — K1 onayı bu ADR |
| U14 | Kaynakta **kural numarası (#çapa) zorunlu** | Eksik çapalar tamamlanır; `Source` ve parametre testi zorunlu kılar |
| Kapsam | **Kadın kuralları M1'de kapsamda** (9 Eylül'deki "ilk sürüm erkek" kararının yerine) | |

## Karar — M2/M3 ön kararları
- **Apple Developer hesabı var.** Sign in with Apple ve TestFlight gerçek kimliklerle kurulur; Team ID / Bundle ID / Services ID
  Levent'ten istenir, anahtar dosyası repoya girmez (V5).
- **Besin verisi yalnız USDA FoodData Central** (kamu malı). Open Food Facts (ODbL) kullanılmaz; Türk ürün kapsamı zayıflığı
  bilinen risk olarak DURUM'a yazılır.
- **Rıza metinleri:** agent kaynaklı taslak yazar, `draft` işaretli kalır, Levent onaylar; mağaza öncesi hukuk gözden geçirmesi not edilir.
- **Yerel veritabanı:** Docker Compose + testlerde Testcontainers (CI ile aynı).

## Neden
Kaynağa sadakat (U14), gereksiz sert durdurmadan kaçınma (L-1), kullanıcıya tek ve tutarlı sayı (L-6, L-13), uydurma yerine
açık sınır (L-11), lisans yükünden kaçınma (USDA).

## Alternatifler ve neden o değil
Her maddenin alternatifleri soru kartlarında sunuldu (hard stop, ikisi de 30, yalnız tam mola, Güray beyan yöntemi, ODbL
kabulü, Homebrew Postgres…); gerekçeler yukarıda.

## Geri dönmenin maliyeti
Düşük-orta: çoğu parametre ya da tek kural dalı. L-1 ve L-7 sağlık davranışını değiştirir; değişirse ADR ile.

## Etkilenen
`engine` (K-104, K-106, K-107, K-110, K-112, K-114), `data/parameters/*`, `backend/src/test/resources/spec/weekly-checkin.yaml`,
`data/copy/en.json`, M2 `identity`, `nutrition`, `consent`, K-202.
