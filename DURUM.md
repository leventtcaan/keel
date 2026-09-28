---
guncelleme: 2026-09-29
---
# DURUM

> Oturum başında ilk okunan dosya (skill `oturum-baslat`). Oturum sonunda güncellenir (skill `oturum-kapat`).

## Şu an
**M0 · Temel** kuruluyor. Araştırma (Faz 1-4) bitti ve `arastirma/`'da. Kod henüz yazılmadı.

## Aktif görev
Yok — gece kurulumu (aşağıdaki liste) sürüyor.

## Gece planı (29 Eyl gecesi, Levent uyurken)
- [x] Depo + anayasa: `CLAUDE.md`, `docs/anayasa.md`, `docs/aktarim-protokolu.md`, `docs/sozluk.md`, 7 skill
- [ ] Mimari ADR'ler (`plan/kararlar/`) — hepsi ÖNERİ, Levent sabah KABUL'e çevirir
- [ ] `docs/mimari.md` — bütün resim
- [ ] Yol haritası (`plan/yol-haritasi.md`) + backlog (`plan/backlog.yaml`, görev başına kabul kriteri)
- [ ] GitHub: private repo + Project + issue'lar (`tools/sync_backlog.py`)
- [ ] Prototip: onboarding+paywall · günlük akış · karar anları · ilerleme — görsel dil C
- [ ] İskelet: backend (Spring Boot + Modulith) · mobil (Expo) · contracts · data · CI yeşil · motor spesifikasyon
      testleri `pending`

## Sıradaki tek adım
Gece planı bitince: **Levent ADR'leri okuyup KABUL/değişiklik der.** Sonra M1'in ilk görevi (karar motoru
omurgası) ön aktarımla başlar.

## Açık sorular (Levent'e)
_(gece biriken sorular buraya yazılır)_

## Kapananlar
- 2026-09-08 → 11 · Faz 1-4 araştırması (Studio'da yapıldı, `arastirma/`'ya taşındı)
- 2026-09-29 · Levent kararları: yığın Spring Boot + Expo · görsel dil C · günlük sayı tutarlılık · program ikisi de ·
  sadece İngilizce · isimsiz ürün sesi · ana ekran Bugün · commit'te AI imzası yok · yalnız Claude Code (AGENTS.md yok)

## Riskler
- **Retention ↔ geç değer:** Apple sıralaması retention'a bakıyor, değerimiz 4-8 haftada geliyor → U15 (1. hafta değer
  anı) ve günlük tutarlılık sayısı bunun için var. `arastirma/05-faz4-pazarlama.md` §2
- **Apple Intelligence cihaz payı bilinmiyor** → cihaz üstü katmanın kapsamı belirsiz (ADR-004)
- **Egzersiz eşleme doğruluğu için benchmark yok** — kendimiz ölçeceğiz
