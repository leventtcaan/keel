# ADR-002 · Depo yapısı ve çalışma süreci
- **Durum:** ÖNERİ (içindeki Levent kararları: yalnız Claude Code, AI imzası yok, GitHub Projects, Azure yok)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Solo proje ama büyüdükçe hafıza kaçmamalı, Levent hâkimiyeti kaybetmemeli, agent oturumlar arası unutmamalı.
NutriScan süreci ekip için tasarlandı (Azure Boards, sahip/vekil onayı); keel için hafifletilmiş hali gerekiyor.

## Karar
1. **Monorepo:** `backend/`, `apps/mobile/`, `contracts/`, `data/`, `plan/`, `docs/`, `arastirma/`, `prototip/`, `tools/`.
2. **Hafıza:** `CLAUDE.md` (kısa, işaretçi) + `docs/anayasa.md` (kurallar) + `DURUM.md` (şu an) + `oturumlar/levent.md`
   (günlük) + ADR'ler. Kod dizinlerinde iç içe `CLAUDE.md`. **AGENTS.md yok** — yalnız Claude Code.
3. **Görevler — tek kaynak `plan/backlog.yaml`.** GitHub Issues + Project bundan üretilir (`tools/sync_backlog.py`);
   GitHub'da elle başlık/kapsam değiştirilmez, önce yaml değişir. Project görsel görünümdür.
4. **Git:** kod `main`'e PR ile; dal `<modül>/<issue>-kisa-ad`; Conventional Commit + `(#issue)`; plan/doküman
   `main`'e doğrudan. **AI imzası ve araç adı yok** (`.claude/settings.json` attribution boş).
5. **Skill'ler** (`.claude/skills/`): oturum-baslat, oturum-kapat, gorev-baslat, gorev-kapat, karar-yaz, kural-ekle, aktarim.

## Neden
Agent'ın en sık üç hatası — unutma, kapsam kayması, kanıtsız "bitti" — dosya tabanlı hafıza, tek-kaynak görev kartı
(kabul kriterli) ve prosedür skill'leriyle mekanik olarak engellenir. Tek kaynak, GitHub ile yaml'ın birbirinden
kopmasını önler.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| NutriScan birebir (Azure Boards) | Solo projede tören yükü hızı yer (Levent) |
| Görevler yalnız GitHub'da | Agent'ın okuyabildiği, sürümlenen, diff'lenebilir tek kaynak kaybolur |
| Hafif (sadece DURUM + ADR) | İş büyüdükçe "neredeydik" sorusu zorlaşır |

## Geri dönmenin maliyeti
Düşük — dosyalar yerinde kalır, araç değişir.

## Etkilenen
`CLAUDE.md`, `plan/`, `tools/`, `.claude/`.

## Doğrulama
`tools/sync_backlog.py --dry-run` GitHub ile yaml arasında fark göstermiyor.
