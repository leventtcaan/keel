# M9 · Part 2 — DEVAM (6 Eki gece, haftalık kullanım %97'de durdu)

```
oturum-baslat. Toplu mod (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme). M9 Part 2'nin DEVAMI.
Ortak talimat plan/oturum-promptlari/M9.md; Part 2 kapsamı M9-part2.md. Hafıza DURUM.md › "## M9 ilerleme" (Part 2 başı + tablo). Aktarıma BAŞLAMA.
```

## Nerede kalındı (git ile doğrula)
- **#408 birleşti** (EAS projesi `@leventcan/keel`, `EXPO_PUBLIC_API_URL` EAS `production`'da, `usesNonExemptEncryption: false`).
- **#409 K-618** (worktree `../keel-k618`, dal `mobile/360-photo-backup-exclusion`): kod + inceleme düzeltmeleri push'lu, **auto-merge açılmadı**.
  EAS simülatör derlemesi `40e9cfce` **FINISHED** (Swift derlendi) ve simülatöre kuruldu. Kalan: `xattr` kanıtı —
  Metro'yu worktree'den başlat (`EXPO_PUBLIC_API_URL=https://keel-beta.duckdns.org … npx expo start --dev-client`), uygulamayı bağla,
  `xcrun simctl get_app_container booted dev.leventtcaan.keel data` altında `Documents/progress-photos/x.jpg` oluştur, CDP ile
  (`scratchpad/cdp-eval.mjs` mantığı: Metro `/json/list` → `Runtime.evaluate`) `globalThis.expo.modules.BackupExclusion.exclude('file://…')`,
  sonra Mac'te `xattr -l` → `com.apple.metadata:com_apple_backup_excludeItem` görülmeli. Sonucu PR gövdesine → `gh pr merge 409 --auto --squash`.
- **#410 K-815 kod yarısı** (worktree `../keel-k815`, dal `mobile/396-voiceover-announcements`): push'lu; code-reviewer ajanı sonucu
  alınamadıysa yeniden çalıştır (talimat PR gövdesinde), bulgular TDD ile → auto-merge.
- **K-903 mağaza derlemesi Levent'te:** `cd ~/Projects/keel/apps/mobile && eas build -p ios --profile production --auto-submit` (Apple girişi).
  Sonra `ascAppId` → `eas.json › submit.production.ios` (runbook `docs/eas-derleme.md`). Dış TestFlight iletişim adresi bekliyor (Levent yeni açacak).
- **Cihaz kontrol listesi** `docs/aktarim/M9/cihaz-kontrol-listesi.md` (20 madde, silme en sonda) — TestFlight derlemesi gelince Levent'le.
- Kalan: aktarım dosyaları `docs/aktarim/M9/K-903.md`, `K-618.md`, `K-815.md` + README 4-6; Part 2 ÇIKIŞ; Part 3 prompt'u.
- Açık soru (Levent): K-618'in Android yarısı (Auto Backup açık; Android derlemesi yok).
