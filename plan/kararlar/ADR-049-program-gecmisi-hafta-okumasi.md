# ADR-049 · Program geçmişi: bir hafta, içinde geçerli olan programların en azıyla okunur (K-535)
- **Durum:** KABUL (agent, teknik — ADR-019; ADR-045 #79'un uygulaması)
- **Tarih:** 2026-10-03 · **Karar veren:** agent

## Bağlam
ADR-045 #79: "her hafta o hafta geçerli olan programın gün sayısıyla yargılanır; program öncesi haftalar profilin sayısıyla".
İki şey açık kaldı: (1) program tek satır (`training.program`) ve değişince eskisi siliniyor — geçmiş yok; (2) program **hafta
içinde** değişirse o hafta hangi sayıyla okunur?

## Karar
1. **`training.program_history`** (V30): her `replace`'te bir satır — `sessions_per_week` (program günü sayısı) ve `effective_from`.
   Satır değişmez, yalnız eklenir. Var olan programlar kendi `created_at`'leriyle tohumlanır; ondan öncesi bilinmez → profil.
   Zaman geriye gitmez: `greatest(created_at, son satır)` — aynı anda iki değişimde son kaydedilen program yürürlükte olandır.
2. **Hafta okuması** (`decision/PlannedSessions.inWeek`, saf): haftanın başında (pazartesi 00:00, kullanıcının ev saat diliminde)
   yürürlükteki programın sayısı — o an program yoksa profilin gün sayısı; hafta **içinde** yeni program geldiyse hepsinin
   **en azı**.
3. Tutarlılık, uyum (spine), Bugün'ün haftası ve ilk 8 haftanın takvimi bu okumayı kullanır (`WeekTallies.Plan.trainingSessionsIn`).
   Hedefler (`PlanTargets`) ve "antrenman isteniyor mu" bugünkü programla (`perWeek`) kalır: ileriye dönük şeyler.
4. Kaçan plan haftası (`TrainingStatuses.weeksPlanMissed`) zaten yalnız yürürlükteki programın yapıldığı günden sonraki haftaları
   sayıyor — onların hepsi bu programın haftası; değişiklik gerekmedi.

## Neden
- "En az": U7. Pazartesi 3 gün planlayıp çarşamba 5'e çıkaran kullanıcı o haftanın 3 seansını yapınca eksik görünmemeli; 5'ten 3'e
  indiren de (hayat araya girdi) o hafta 5'le yargılanmamalı. İki yönde de tek kural, ve sonuç her zaman o hafta yürürlükte
  olmuş bir programın sayısı (özellik testi).
- Geçmiş tablo, mevcut tabloya sürüm sütunu eklemekten basit: program okuması (`current`) hiç değişmedi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Haftanın başındaki program | 5 → 3 indiren kullanıcı o hafta 5'le yargılanır (U7) |
| Haftanın sonundaki program | 3 → 5 çıkaran kullanıcının o haftası 5'le — tam ADR-045 #79'un önlediği şey |
| Gün ağırlıklı ortalama | Kesirli plan; "12 haftanın 11'i" sayısını açıklanamaz kılar |
| Profilin gün geçmişini de tutmak | Profil yalnız programsız kullanıcıda okunuyor ve `training_days_since` kaçan seans için var; kapsam dışı (not) |

## Sonuçlar
Olumlu: geçmiş haftalar program değişince oynamaz; tek saf fonksiyon, özellik testli. Olumsuz: program değiştiği hafta Bugün'ün
"planned" sayısı Hedefler'deki sayıdan küçük görünebilir (ör. 3 ve 5) — bir sonraki pazartesi eşitlenir. Programsız kullanıcının
profil gün sayısı geçmişsiz (bugünkü sayı).

## Geri dönmenin maliyeti
Düşük: okuma tek fonksiyonda; tablo yalnız eklenir.

## Etkilenen
V30, `training/ProgramStore`, `TrainingStatusReader.programHistory`, `ProgramPeriod`, `decision/PlannedSessions`, `WeekTallies`, `WeekLogs`.

## Doğrulama
`ProgramHistoryTests`, `ProgramHistoryBackfillTests`, `PlannedSessionsTests` (özellik testi dahil), `WeekTallyAssemblyTests`,
`ConsistencyApiTests.aProgramRaisedFromThreeToFiveDaysLeavesTheWeeksGoneByAsTheyWere`.
