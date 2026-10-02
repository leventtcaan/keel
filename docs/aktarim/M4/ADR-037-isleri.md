# ADR-037 işleri (M4 sonu cevaplarından doğan mobil görevler) — aktarım planı

> Durum: PR'lar · **aktarılmadı**. Karar: ADR-037. Her görev küçük; birlikte anlatılır.

## K-435 · Mola haftasında antrenman hatırlatması susar (ADR-037 › 51b)
| # | Basamak | Proje yeri |
|---|---|---|
| 1 | Haftalık tetikleyici bir haftayı **atlayamaz** → mola sürerken haftalık antrenman hatırlatması hiç kurulmaz | `plan.ts` (`restUntil`) |
| 2 | Molanın ardından `rest_resume_weeks` (2) haftanın antrenman günleri **tarihli** kurulur → uygulama açılmasa da dönerler; sonraki açılış haftalığa çevirir | `plan.ts`, `notifications.json` |
| 3 | Gece yarısını geçen öne alma `new Date(y, m, d, 0, dakika − 30)` ile bir önceki akşama taşar; geçmişe düşen kurulmaz | `plan.ts` |
| 4 | Mola günü programı okuyan her yerden gelir: Bugün ve eğitim kopyası (Antrenman, seans, hareket ekranları) | `useToday.ts`, `trainData.ts` (`onProgram`) |
| 5 | Okuma çıkıştan önce başlayıp sonra biterse sonraki hesaba yazılmaz: kuşak **okuma başında** alınır (`era()`); aynı gün yeniden gelirse yeniden kurulum yok | `reminders.ts` (`era`, `keepRestUntil`) |

İnceleme: code-reviewer — Bugün'ün okuması çıkış sırasında biterse mola günü sonraki hesaba kalıyordu (önerilen "çağrı anında
kuşak" bu senaryoyu kaçırırdı; okuma başında alındı); aynı günü her ekran odağında yeniden kurmak → atlanıyor. Renk bekçisi
yorumdaki `#51b`'yi hex renk sandı → `ADR-037 › 51b`. Mutasyon 13/13 + 3/3.

### Soru bankası
1. Mola haftasında neden haftalık hatırlatmayı "bir hafta atla" diye kuramıyoruz?
2. Uygulama hiç açılmazsa mola bitince hatırlatmalar nasıl geri geliyor?
3. Kuşak sayacını neden okumanın başında alıyoruz, çağrı anında değil?
