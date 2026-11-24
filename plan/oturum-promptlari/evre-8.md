# Evre 8 · Bütün ürün: oturum istemleri (24 Kas 2026)

Önce oku: `plan/evre-8-butun-urun.md` (denetim + yön), `plan/kararlar/ADR-091-evre-8-kararlari.md` (Levent'in kararları),
`plan/backlog.yaml` › M12 (K-1201..K-1224), rakip raporu `arastirma/ham/rakip-ozellik-2026-11-24.md` (+ doğrulama dosyası; VERIFIED olmayan
sayı karara girmez). Skill `oturum-baslat` ile başla. Ana kopya `main` worktree'si: `/Users/leventcanceylan/Projects/keel-main`
(`keel/` checkout'u eski bir commit'te dalsız duruyor; orada çalışma).

## Ortak kurallar (her part)
- Toplu mod (hafıza `toplu-mod`): her kart `gorev-baslat` → test önce → kod → `./gradlew build` / `npm run check` → inceleme ajanları
  (`/pr-review-toolkit:review-pr`) → `tools/anayasa-denetimi.sh` → PR `--auto --squash`. Aktarım yok (ADR-079).
- Opus düzenler, alt ajanlar Sonnet (hafıza `opus-orkestra-sonnet-ajan`); paralel mobil ajan en fazla 3; yerelde Docker/DB testi yok, DB testleri CI.
- **Araştırma Antigravity'de (Gemini 3.8 Flash), görsel/video Codex'te** (hafıza `codex-antigravity-modeller`); erişim yoksa önce onu hallet.
- **Motor kuralları (K-1203, K-1204, K-1205, K-1218, K-1214 öğrenme kuralı) sağlık kararı:** skill `kural-ekle`, kaynak önce
  `arastirma/ham/guray/`, sonra [literatür]; eşik ve kural metni part sonunda toplu Levent'e (ADR-091 #3). Golden senaryo beklenti
  değişiklikleri K1 listesi (hafıza `k1-adr-test-degisikligi`).
- Arayüz: doğrudan kod, simülatörde kanıt (hafıza `arayuz-once-prototip`); ADHD odak ilkesi: ekranda tek şey, renk = rol.
- Her part sonu: DURUM'a "Part N ÇIKIŞ", `oturumlar/levent.md`'ye 5 satır, sonraki part istemi.

## Part tablosu
| Part | Kartlar | Çıkış |
|---|---|---|
| **8a-1** | K-1201, K-1202 (para) · K-1208 (arama v2) · K-1206 (ana ekran) | ücretsiz çekirdek çalışır, simülatörde yeni hesap sekmelere ulaşır |
| **8a-2** | K-1207 (odak ekranı) · K-1203, K-1204, K-1205 (motor, Levent onayıyla) | 53 → ~10 öğe; motor kuralları onaylı ve testli |
| **8a-3** | K-1209 (1.0.1 yayını) · K-1210 (yayın sonrası rutin) | 1.0.1 App Review'da; rehber hazır |
| **8b-1** | K-1211, K-1212, K-1213 (Türkçe) | uygulama Türkçe, Türk yemekleri aranır |
| **8b-2** | K-1214, K-1215 (dinlenme) · K-1216 (adım) · K-1217 (günlük döngü) · K-1218 | 1.1 build |
| **8b-3** | K-1219 (form gösterimi, Codex) | 40 hareket görsel/video, Levent onaylı |
| **8c** | K-1221..K-1224 (konuşan koç) | ADR + sağlayıcı (Levent: para/veri) sonrası |

## Part 8a-1 istemi (yeni oturuma yapıştır)
```
keel, Evre 8 Part 8a-1. Önce plan/oturum-promptlari/evre-8.md'yi oku ve ortak kurallara uy. Çalışma kopyası
/Users/leventcanceylan/Projects/keel-main. Kartlar: K-1201 → K-1202 (kayıt bedava, karar ücretli; ADR-091 #1), K-1208 (yemek araması v2),
K-1206 (ana ekranda protein/adım/kilo, yemek kartı yukarı). K-1208 ve K-1206 K-1201'den bağımsız, paralel ajanlara verilebilir.
Bitti = üç PR birleşti, simülatörde yeni hesap paywall'suz sekmelere ulaşıyor ve ana ekranda dört sayı görünüyor, Part 8a-1 ÇIKIŞ yazıldı.
```

## Part 8a-2 istemi (yeni oturuma yapıştır)
```
keel, Evre 8 Part 8a-2. Önce plan/oturum-promptlari/evre-8.md'yi ve DURUM › Part 8a-1 ÇIKIŞ'ı oku, ortak kurallara uy. Çalışma kopyası
/Users/leventcanceylan/Projects/keel-main (worktree'leri origin/main'den aç). Kartlar: K-1207 (antrenman odak ekranı; L, önce ikiye böl: set ekranı ·
dinlenme ekranı), K-1225 (ana ekran kutuları cilası), K-1203 → K-1204 → K-1205 (motor; kural-ekle, kaynak + eşik Levent onayına toplu).
Part 8a-1'den Levent'e sorulacak 8 madde DURUM'da: part başında topla ve sor. Bitti = PR'lar birleşti, simülatörde set ekranında ≤10 öğe, motor
kuralları onaylı ve golden senaryolar güncel, Part 8a-2 ÇIKIŞ yazıldı.
```
