# Evre 7 · devam (30 Eki 2026, Levent sınava çalışıyor; "devam" deyince buradan)

Önce oku: `plan/evre-7-urun-hissi.md` (Levent'in 21 maddesi), `plan/evre-7-inceleme.md` (ekran incelemesi + "Yürüyüş bulguları (◆sim)",
292 öğelik etkileşim envanteri, 81'i açıldı), `arastirma/ham/evre7-rakip-kaliplari.md` (15 kural), ortak ajan kuralları
`~/Library/Application Support/Claude/side-session-notes/local_d65559e9-7c51-4a73-98d7-721d85d96ae0/evre6-ajan-kurallari.md` (gizlilik bölümü dahil).

## Birleşenler
- #688 Log again "+" · #689/#691 hafta gününe bağlı olmayan günler · #690 Rebuild gün sorusu + çalışıyor göstergesi · #692 antrenmanda eklenen
  harekete 3 set, Next/Finish (Levent'in 41 setlik döngüsü; gerçek veride kanıtlandı) · #693 sunucu: öğünde genelde yenenler + üç makro ·
  #694 eklenen gün hiç boş gelmez · #695 Add a move seçicisi, gün silme onayı, sıralama.
- #696 (açık, auto-merge): Edit program gruplu liste, Cardio düz yazısız, Split sayfası kalktı, Rebuild ne yaptığını söylüyor, kayıtlar banner.

## Yarım kalanlar (dallar GitHub'da yedekli, PR yok)
1. `mobile/684-log-a-meal` (worktree `keel/.claude/worktrees/agent-a56e40a25b0f9dfa8`): 2 commit — Log a meal yeniden (öğün hapı satırı, tepsi,
   tek liste, porsiyon sayfası) + Today's food günlük gibi, Food kartı ve "+" oraya götürüyor. Eksik: simülatör kanıtı, yürüyüş bulgularının
   yemek kısmı (0-0 kcal, aynı eylem iki kez, "+"sız satırlar, edit sheet, boş Quick add, hızlı kaydırma silme, öğüne göre süzme, Food kartı chevron)
   kontrolü, `npm run check`, PR.
2. `mobile/684-workout-flow` (worktree `agent-a845f0b90ce849a87`): #696'nın commit'leri + son commit "unfinished workout flow and imperial rounding,
   paused" — **doğrulanmamış, testler kırık olabilir**. Kapsam C: antrenman öncesi motivasyon (geçen sefer → bugün), Hevy tarzı set satırı, geriye
   sayan dinlenme ±15 sn ve düzen kaymasız, Imperial'de gerçek lb artışlarına yuvarlama ve lb plaka hesabı (ham "396.8 × 8" kalkar), bitişte
   yalnız başarılar ve nötr kıyas (−%94 yok, U7), Swap/End/FinishForm sayfa, History sade dil + geri, Gym busy sonrası Undo, hafta şeridi dokunulur.
   Önce `git diff HEAD~1` ile ne yapıldığına bak, `npm run check`, eksikleri tamamla, sonra PR (#696 birleştikten sonra rebase).

## Sıradaki
3. Genel bütünlük parçası (D): rehber hedefsiz ekranlarda çıkmasın, Progress düzeni (kilo trendi yukarı, tekrarlanan Calls başlıkları),
   kalan ◆sim bulguları, açılmayan 210 öğenin basma turu (dosya/foto seçicileri ve paylaşım sayfası açılmaz).
4. Build 10 → Levent TestFlight.

## Levent'e sorulacaklar (toplu, en sonda)
- Antrenmanda eklenen hareketin varsayılanı 3 set (`session_added_move_sets`, #692) — onay.
- Metinlerde 121 yerde geçen "call" kelimesi ABD'de telefon araması çağrıştırabilir; ürün adı "Next Call" — marka kararı.
- K1 listesi `.envanter/notes.md` sonunda (evre 7 girdileri).

## Notlar
- Levent'in gerçek hesabında 29 Eki 21:33'te başlayan antrenman hâlâ açık (41 calf raise seti). #692 ile ilerleyebilir; Levent'e söylenmeli
  (bitirebilir ya da silebilir).
- Simülatör portları 8081/8790 boş bırakıldı.
