# ADR-018 · Apple Health'e antrenman yazma ve geçmiş içe aktarma
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)
- **Değiştirdiği:** ADR-007 (yalnız "okuma" varsayımı)

## Bağlam
ADR-007 ve prototip "Nothing is written back" diyordu. Sektör standardı tersi: Hevy ve Strong antrenmanı HealthKit'e yazıyor;
Apple Watch Fitness halkaları ancak böyle kredi alıyor. RED-S güvenlik kontrolü (U13, K-104) egzersiz harcaması istiyor ama
okuma listesinde yoktu. Geçmişi olan kullanıcıyı iki hafta bekletmek geçiş maliyeti yaratıyor.
Kaynak: `arastirma/ham/L3-ozellik-boslugu.md` §2, §3, P8, P9.

## Karar
1. **Yazma (seçimli):** tamamlanan seans HealthKit'e antrenman olarak yazılır; elle girilen tartı isteğe bağlı yazılır. Ayrı izin,
   ayrı toggle, geri alınabilir.
2. **Okuma listesine active energy ve dış antrenmanlar eklenir** (enerji mevcudiyeti girdisi).
3. **İçe aktarma:** Apple Health kilo geçmişi · Strong / Hevy CSV. **Geçmiş trend hemen görünür; ilk karar yine en erken ilk
   pazartesi check-in'de gelir** (U8'in "ölç sık, yorumla seyrek" ilkesi korunur).
4. Okunmayanlar değişmez: kalp verisi dışındaki klinik kayıtlar, döngü, ilaç, sağlık kayıtları, konum.

## Neden
Kullanıcının verisi tek merkezde toplanır, halka kredisi kaybolmaz, güvenlik ağı hesaplanabilir hale gelir; içe aktarma rakipten
geçişin en ucuz yolu.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Yalnız okuma | Fitness halkası kaybı, sektörle ters |
| İçe aktarılan veriyle hemen karar | U8 ihlali; tek seferlik veri kalitesini doğrulamadan karar |

## Geri dönmenin maliyeti
Düşük.

## Etkilenen
ADR-007, onboarding Apple Health ekranı, K-404, K-104, yeni içe aktarma görevi.

## Doğrulama
Yazma izni yokken yazma çağrısı yapılmadığını gösteren test; içe aktarmadan sonra ilk kararın ilk pazartesiden önce gelmediğini
gösteren motor testi.

## Ek 1 · İzin zamanı (2026-10-07 — ADR-069 #3, ADR-072 #8)
Onboarding'deki Apple Health ekranı kalkar. İzin **ilk kullanıldığı anda** bir kez istenir: ilk tartıda ya da ilk antrenmanda (`health-jit`);
"Not now" serbest, Ayarlar'dan sonra verilir. Okunan türler aynı; antrenman penceresinde aktif enerji (ADR-074 #5, ADR-075 #7) ve kardiyo için
antrenman okuması eklenir. Yazma ayrı anahtarla sürer.

## Ek 2 · İzin kartı ve tartının geri alınması (K-980, #443, 2026-10-15, agent, teknik)
- **Kart sayfa değil, satır içi:** `HealthJit` ilk tartının **kaydından sonra**, kaydın altında ve ilk antrenmanın bitiş ekranında çıkar. Tartı kart
  sorulmadan önce telefona yazılır; Apple'ın sayfası açılmasa, rıza kaydedilemese ya da "Not now" denince tartı kaybolmaz. Reddedilen: prototipteki gibi
  Save'i bloklayan sayfa (izin hatası kaydı yutardı).
- **"Bir kez":** kv anahtarı `health.asked` (hesaba aittir, çıkışta silinir, `docs/yasal/veri-envanteri.json`'da). "Not now" ya da bağlanma işaretler;
  Apple'ın sayfası açılmazsa ya da rıza kaydedilemezse işaretlenmez (tekrar sorulabilir). Sorulmaz: bu yapıda Health yok (Expo Go), sağlık verisi rızası
  yok (okunan sağlık verisi), Apple Health zaten açık, daha önce soruldu. Sıra Ayarlar'dakiyle aynı: önce Apple sayfası, sonra rıza (`connectAppleHealth`).
- **Bilgilendirilmiş rıza:** kart neyin okunup yazıldığını iki satırda söyler; rıza metni "What we read" ile bir dokunuş uzaktadır.
- **Tartıyı geri alma** (`takeBack`, `src/sync/takeBack.ts`; kardiyo da kullanır, ADR-074 Ek 3): kuyruk tutulur; hiç denenmemiş kayıt yerelden gider;
  denenmiş ama sonucu bilinmeyen kayıt önce gönderilir (sunucu kimliği bilinsin), sonra `DELETE /v1/weigh-ins/{id}` ile silinir ve yerel kopya
  **ve bekleyen kopya** düşer (silme fiziksel; aynı `clientId` satırı yeniden yazardı, ADR-074 Ek 2). 404 = alındı; 409 ya da cevapsızlık hiçbir şeyi
  değiştirmez. Apple Health'e yazılmış tartı (K-412) geri alınmaz: `HealthWriteAccess`'te silme yok; kullanıcının Health kopyası kalır.
