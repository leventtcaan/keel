# M9a Part 4 · devam-2 (15 Eki akşam — Levent yer değiştirdi, sağlıklı noktada durdu)

> Hafıza: `DURUM.md › ## M9a ilerleme › Part 4 başı` (tablo + K1 listesi + Levent soruları). Ortak talimat `YENI-YUZ-kod.md`, ajan talimatı `ajan-brief.md`.

## Durum (main `1898746d`, son göç V49)
- Birleşti: #577 (K-979 İlerleme B), #583 (Cardio kutusu → `/cardio`). Arka planda çalışan ajan yok.
- **#582 K-976 Story:** doğrulama PASS; koruma testi güçlendi (`1071c220`, `jest.mock(..., {virtual: true})` fırlatır; kırmızı/yeşil kanıtlı). CI yeşil, MERGEABLE. **Tur 4 bitti → artık birleştirilebilir** (`gh pr update-branch 582` → `gh pr merge 582 --squash`).
- **Tur 4 bitti** (`prototip/kullanici-testi.md › Tur 4`): engelleyici/çökme/U4-U8 ihlali yok; 3 önemli + 26 küçük. Ham bulgular `../keel-sim/.sim/tur4-bulgular.md`, kanıt `../keel-sim/.sim/shots/tur4-*.png`. Fikstür 23 senaryo, 1353 yanıt 0 hata (yedek `fixture.p3.js`, `validate.p3.py`).
- Backlog senkronu onarıldı: Project "Work type" alanına `fix` eklendi (id'ler korunarak); K-1022..K-1030 issue'ları açıldı (#584-#592).

## Açık iş (sıra)
1. #582 birleştir (yukarıda).
2. **K-1027** (#589, dal `mobile/589-small-button-touch-share`, uzakta; WIP `9b318080`: yalnız testler + en.json, kod yok — testler kırmızı olmalı). Devam: Button sm dokunma alanı ≥ size.touch (hitSlop/minHeight), SHARE kapat + busy etiketi. Yeni ajan bu dalı alır, testleri okur, kodu yazar.
3. **K-1028** (#590) İlerleme Strength grafik önce, ızgara açıklaması, bodyweight, rızasız hero — başlamadı.
4. **K-1030** (#592) dönüş haftasında antrenman sorusu (B14, sunucu mu telefon mu: araştır; ADR-077 ile çelişirse dur), hero nextCallOn, bodyweight ısınma, sayaç = şerit, B28 bandı — başlamadı.
5. **K-1029** (#591) Recent onay + Undo, porsiyon yazımı, This week kardiyo satırı — başlamadı.
6. K-910 kartı: Tur 4'te Kalın Metin temiz → cihazda (K-984) son bakış, sonra done.
7. Dependabot #547 beklemede; güvenlik uyarıları bilinen 4'lü (mobil lock, geliştirme bağımlılığı).
Her PR'a inceleme ajanı; birleştirmeden önce `gh pr update-branch`; ajan brief'leri bu sohbette K-1027/28/30 için yazılmıştı: kart + Tur 4 bulgu kodları (B1..B29) + `ajan-brief.md` + `jest -w 1`.

## Sonra
K-984 hazırlığı (TestFlight; K-983 Levent ASC bekler). Cihaz turunda yeniden bakılacak düşük güvenli bulgular: weigh-in nokta grafiği eksensiz, iki birincil düğme, Food left kartı FAB altında, egzersiz simgeleri, Settings başlık hiyerarşisi, sticker ön izleme boşluğu, SE ölçüsü, canlı Pause, kamera arka planı, Story.

## Levent'e sorulacaklar (part sonunda, AskUserQuestion)
- K1 listesi (DURUM › Part 4 başı) toplu onay.
- İlerleme hero "Day 1." yerine "Today's targets." (ADR-078 #1).
- Koç "The call stands until its next look" → nextCallOn'a geçsin mi.
- İlerleme › Calls yalnız son 12 karar; "Show older" gerekir mi.
- Tur 4: rıza metni (Sick/In pain) tek paragraf ~19 satır — maddelere bölünsün mü (metin sürümü 4, değişirse 5 olur).
- Tur 4 B2: İlerleme ızgarasında kaçan hafta sade hücre, açıklamada adı yok (bilinçli, #577 incelemesi); Tur 4'te 'gri hücre açıklamasız' bulundu — açıklamaya nötr bir satır (ör. 'Other weeks') eklensin mi, yoksa böyle mi kalsın.
- Tur 4 B14 (motor/ürün): 8 gün kayıtsız dönüşte check-in 'How did training go this week? Getting weaker' soruyor. Denenen çözüm (soruyu seans yoksa sorma) geri alındı: kesimde kalori kararı antrenman cevabına bağlı (G7 K-98), soru kalkınca hafta 'henüz karar yok' ile harcanıyor ve başka yerde çalışıp kaydetmeyen kullanıcı cevap veremiyor. Seçenekler: (a) soruya 'Haven't trained' seçeneği, motor bunu 'antrenman yok' bilgisi olarak okur (öneri: kullanıcı yine cevap verebilir, veri dürüst); (b) soru sorulmaz, motor kendi 'önce bir seans kaydet' bekleme kuralıyla yazar; (c) böyle kalsın. Kalori kararının en çok kaç hafta bekleyebileceği de Levent'te.
- Tur 4: paylaşım sekmesi adı "Streak" (içerik haftalık "Weeks on track") — ad değişsin mi.
- Story gizlilik satırı privacy.md'ye; iOS pasteboard 5 dk.
- K-976 Facebook App ID (`EXPO_PUBLIC_FACEBOOK_APP_ID`, EAS ortam değişkeni) · K-983 ASC deneme.

## Bitiş
"Part 4 ÇIKIŞ = M9a ÇIKIŞ" (DURUM) + backlog sync + özet + sıradaki: M9 Part 3 (beta kohortu, K-904) prompt'u.

## Devam prompt'u
```
oturum-baslat. Toplu mod. M9a PART 4 devam-2: plan/oturum-promptlari/YENI-YUZ-part4-devam.md (önce #582 birleştir, sonra K-1027 dalı + K-1028 + K-1030, ardından K-1029; sonra K-984 hazırlığı ve ÇIKIŞ).
Ortak talimat YENI-YUZ-kod.md, ajan talimatı ajan-brief.md. Opus düzenleyici; uygulayıcı ve inceleme ajanları Sonnet (model: sonnet).
Paralel en çok 3 uygulayıcı (mobil jest -w 1/2); her PR'a inceleme; birleştirmeden önce gh pr update-branch; göçlü PR'lar tek tek (sıradaki V50).
Bitiş: "Part 4 ÇIKIŞ = M9a ÇIKIŞ" + özet + Levent'e biriken sorular + sıradaki: M9 Part 3 (beta kohortu, K-904) prompt'u.
```
