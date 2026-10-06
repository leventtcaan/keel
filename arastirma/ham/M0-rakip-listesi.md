# M0 · Rakip listesi — Faz 5 · ürünün yüzü (ADR-068)

- **Tarih:** 2026-10-07 · **Durum:** ONAYLI (Levent, 7 Eki — olduğu gibi)
- **Amaç:** R1 (reklam), R2 (akış), R3 (tutundurma), R4 (sosyal döngü) hatlarının **ortak** rakip kümesi.
- **Pazar:** global İngilizce — ABD, UK, AU, CA (ADR-068 madde 2).
- **Kanıt etiketleri:** **[RESMÎ]** Apple'ın kendi akışı / Meta Ad Library'nin kendisi · **[3.P]** üçüncü taraf takipçi ·
  **[doğrulanmadı]** henüz ölçülmedi, R1'de ölçülecek.

## 1 · Kaynak ve yöntem

**Top grossing [RESMÎ]:** Apple'ın eski iTunes RSS akışı, Sağlık ve Fitness türü (`genre=6013`), dört ülke:
`https://itunes.apple.com/{us,gb,au,ca}/rss/topgrossingapplications/limit=200/genre=6013/json`.
Akışın `updated` alanı **2026-10-06 15:03 (PDT)**. `limit=200` istense de akış **100** kayıt döndürüyor → "—" = ilk 100'de yok.
Ham JSON depoda değil, Levent'in Mac'inde: `~/.keel-research/tg-*.json`. Yiyecek ve İçecek türü (`genre=6023`) de çekildi:
ilk 30'unda kalori/makro uygulaması **yok** (tarif, şarap, yemek planı) → kategori Sağlık ve Fitness'ta.

**Reklam veren [3.P]:** admakeai.com "Health & Fitness Apps" sayfası (Meta aktif reklam sayısı, "her 24 saatte tazelenir",
tarih damgası yok, yöntemini söylemiyor; 7 Eki'de okundu): WeightWatchers 2.101 · Join ZOE 1.606 · BetterMe 1.169 · Sleep Cycle 312 ·
Daily Burn 274 · BodyFast 139 · Fastic 129 · YAZIO 99 · Sweat 75. Kapsamı dar (Cal AI, Noom, Ladder hiç yok) → **yalnız ipucu.**
Gerçek sayı R1'de Meta Ad Library'den alınır (`onlyTotal`, her sayfa için bir kayıt).

**Sıralama ölçüsü:** dört ülkedeki sıraların toplamı (yoksa 101). Sıra = gelir sırası, indirme değil.

## 2 · Önerilen çekirdek — 14 uygulama (R1 reklam taraması + R2 akış kıyası)

| # | Uygulama (App Store adı) | Kategori | US | GB | AU | CA | Neden listede |
|---|---|---|---|---|---|---|---|
| 1 | MyFitnessPal: Calorie Counter | makro/kalori | 1 | 3 | 1 | 3 | Kategori lideri; kullanıcının "alışkın olduğu" kalıp |
| 2 | MacroFactor - Macro Tracker | makro/kalori + algoritmik koç | 10 | 13 | 8 | 10 | Teze en yakın (haftalık algoritmik ayar); doğrudan rakip |
| 3 | Cal AI - Calorie Tracker | makro/kalori (AI fotoğraf) | 12 | 21 | 12 | 15 | Reklamla büyüyen AI ürünü; R1 deneme taraması bununla yapıldı |
| 4 | Lose It! – Calorie Counter | kalori + kilo | 22 | 32 | 39 | 12 | Eski kuşak kilo/kalori; akış kıyası için taban |
| 5 | Calorie Counter by Numify | kalori (yeni giren) | 33 | 44 | 21 | 39 | Yeni giren (App ID 64742…, çıkış tarihi [doğrulanmadı]); dört ülkede ilk 50 — reklam güdümlü mü? [doğrulanmadı] |
| 6 | LADDER Strength Training Plans | antrenman planı (koç takımı) | 2 | 8 | 5 | 2 | ABD'de **2. en çok kazanan** fitness uygulaması; "plan veren" model |
| 7 | Fitbod: Gym & Fitness Planner | antrenman (algoritmik plan) | 20 | 22 | 24 | 11 | "AI Personal Trainer" alt başlığı; kararı algoritma verir |
| 8 | Hevy - Workout Tracker Gym Log | antrenman günlüğü (sosyal) | 39 | 16 | 17 | 28 | Kayıt hızı + takip akışı (R4) |
| 9 | Gymverse: Gym Workout Planner | antrenman planı | 32 | 62 | 46 | — | Fitness22 (Couch to 5K) — büyük reklamcı mı? [doğrulanmadı] |
| 10 | BetterMe Well-Being Coach | AI/kişisel koç + kilo | 26 | 29 | 25 | 30 | Meta'da en çok reklam verenlerden (1.169, [3.P]); quiz-huni onboarding |
| 11 | Noom Weight Loss, Food Tracker | kilo (davranış koçu) | 16 | 70 | 66 | 18 | Uzun onboarding'in örneği; iptal davası (05 §6.7) |
| 12 | WeightWatchers Program | kilo | 24 | — | — | 51 | Meta'da en çok aktif reklam (2.101, [3.P]) |
| 13 | Bevel: AI Health Coach | AI koç | 57 | 27 | 32 | 44 | Adında "AI Health Coach" — yükselen AI koç |
| 14 | Muscle Booster Workout Planner | antrenman + kilo | 48 | — | 86 | 73 | Welltech (WalkFit de onların) — quiz-huni reklamcısı [doğrulanmadı] |

## 3 · Komşular — reklam taraması yok, R2-R4'te referans

| Uygulama | US | GB | AU | CA | Hangi hat | Neden |
|---|---|---|---|---|---|---|
| Strava | 3 | 1 | 2 | 1 | R4 | Sosyal döngünün kategori lideri (kudos, paylaşım kartı) |
| Runna: Running Plans & Coach | 15 | 2 | 3 | 7 | R2, R3 | "Planı uygulama verir" modelinin koşudaki karşılığı; Strava'nın |
| Finch: Self-Care Pet | 13 | 38 | 38 | 19 | R3 | Streak'siz tutundurma (evcil hayvan) — U7 açısından ilginç |
| Liftoff - Ranked Gym Workouts | 50 | 46 | 29 | 48 | R3, R4 | Rütbe/oyunlaştırma ile antrenman günlüğü |
| Strong Workout Tracker Gym Log | 56 | 30 | 53 | 65 | R2 | Kayıt hızı referansı (en sade günlük) |
| Cronometer: Calorie Counter | 18 | 51 | 22 | 20 | R2 | Doğruluk odaklı kitle |
| Calo / BitePal / Foodvisor | 42 / — / 47 | 24 / 75 / 33 | 41 / 56 / 67 | 34 / 49 / 31 | R1 (yedek) | Cal AI taklitçileri — reklam kalıbı kopyalanıyor mu? |
| MeAgain / Shotsy (GLP-1 izleyici) | 41 / 71 | — / 86 | 72 / 81 | 26 / 52 | yalnız not | Yeni kilo dalgası; ilaç → tıbbi dil (U6) riski, kapsam dışı öneriyorum |

**Listede yok ama K6'da vardı:** Carbon (US 94, CA 74), RP Hypertrophy (AU 94), MacroFactor Workouts (CA 80), Gravl (US 80);
Zing, FitnessAI, Caliber, JuggernautAI dört ülkenin ilk 100'ünde **yok**.
**Kapsam dışı (önerim):** meditasyon/uyku, adet takibi, koşu/bisiklet navigasyonu, kalp ritmi uygulamaları, donanım (Hume, Fitbit, Peloton,
Withings) — kategori dışı.

## 4 · Açık
- Levent onayladı (7 Eki): 14 çekirdek + komşular, GLP-1 kapsam dışı. R1 video indirme izni de verildi (M1 §4).
