# M9 · Part 3 — Kohort ve göstergeler (session prompt'u)

> Part 2 bittikten (ve aktarıldıktan) sonra, yeni session `~/Projects/keel` klasöründen açılır.

```
oturum-baslat. Bu session toplu modda çalışır (hafıza: toplu-mod-aktarim, baglam-devri, tas-partlara-bolme).
M9 üç part hâlinde yapılıyor; bu PART 3 (son). Ortak talimat plan/oturum-promptlari/M9.md — önce onu oku ve harfiyen uygula.
Hafıza DURUM.md › "## M9 ilerleme"de; sohbete güvenme. Part'ı baştan sona uygularsın, aktarıma BAŞLAMAZSIN.

Başta:
0) Senkron: "Part 2 ÇIKIŞ" git ile doğru mu? Dış TestFlight onaylandı mı?
1) Kapılar (AskUserQuestion, toplu): beta başvuru formu nerede ve ne sorar (kullanıcı verisi dışarı — Levent), kohort büyüklüğü (~%15'i 8. haftada kalır
   varsayımıyla), geri bildirim kanalı.

Kapsam, sırayla:
1) K-905 öncü göstergeler: ilk değere kadar süre, 2. hafta retention, "plan değişti" anını gören %. Kendi sunucumuzda, olay tablosundan; sağlık verisi yok
   (V3, test: olay şemasında sağlık alanı yok); üçüncü taraf analitik yok (politika). Olay saklama süresi + silmede silinir (envanter + politika + K-802
   testi). ADR (olay şeması, hesaplama).
2) K-904 beta kohortu: başvuru formu (Levent'in onayladığı yerde), 8 hafta taahhüdü açıkça; seçim ölçütleri yazılı; form verisi politikada.
3) K-906 geri bildirim döngüsü: haftalık toplama → backlog'a görev (kaynak: beta), `sync_backlog`.
4) K-816 metin dışı kontrast 3:1 (görsel dil belirteci — prototipte göster, Levent onayı; `contrast.test.ts`).
5) K-536 yalnız Expo SDK 58 stabil + `expo-app-intents` ≥ beta ise; değilse M11'e taşı (backlog).

Bitiş:
1) plan/yol-haritasi.md › M9 çıkış kriterlerini tek tek kontrol et, çıktıyla göster; eksikleri DURUM'a yaz.
2) Birikmiş soruları AskUserQuestion ile toplu sor, cevapları ADR'ye işle.
3) M10 · Lansman part prompt'larını bu yapının kalıbıyla yaz (M10 kapıları: ürün adı + marka kontrolü, ASO, ASC beyanları — gizlilik etiketi, yaş,
   erişilebilirlik; SANDBOX'ı ortamlardan çıkar; mağaza metni `data/copy/store.en.json` ürün adıyla). Commit.
4) DURUM › M9 ilerleme › "Part 3 ÇIKIŞ = M9 ÇIKIŞ"; kısa Türkçe özet + M10 Part 1 prompt'u ver.
Session KAPANMAYACAK: döndüğümde Part 3'ü aktarırsın (docs/aktarim/M9/).
```
