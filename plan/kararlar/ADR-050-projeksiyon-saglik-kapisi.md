# ADR-050 · Projeksiyonun sağlık kapısı: SCOFF metni, destek kaynağı, saklama, eşikler (K-607, K-606)
- **Durum:** KABUL (Levent, 4 Eki — M6 Part 2 başı, AskUserQuestion; dört soruda da önerilen seçenek)
- **Tarih:** 2026-10-04 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Şekil projeksiyonu (K-606, U12) vücut görseli ve kilo hedefi gösterir; yeme bozukluğu riski taşıyan kullanıcıda zarar kanıtı var,
risk düşük grupta yok (`arastirma/ham/H2-projeksiyon.md` §4.3). Kapı sağlık/regülasyon kararıdır (ADR-019) → Levent. Part 1 soruları
hazırladı (DURUM › "Part 2 sağlık kapısı"); SCOFF künyesi orada `[doğrulanmadı]` idi (K6).

**Doğrulanan kaynak (4 Eki):** Morgan JF, Reid F, Lacey JH. *The SCOFF questionnaire: assessment of a new screening tool for eating
disorders.* BMJ 1999;319(7223):1467 (PMC28290, PMID 10582927). Beş evet/hayır sorusu; her "evet" 1 puan, **≥2 = olası anoreksiya ya da
bulimia vakası**; ≥2 eşiğinde duyarlılık %100, özgüllük %87,5. Doğrulama örneklemi **yalnız 18-40 yaş kadınlar** (116 vaka, 96 kontrol) —
erkeklerde ve başka yaşlarda aynı doğrulukta olduğu bu kaynakta gösterilmemiş (kabul edilen sınır, aşağıda). Türkçe uyarlaması var
(Celal Bayar Üniv., SCOFF Türkçe formu geçerlik-güvenirlik) — künyesi tam doğrulanmadı, şimdilik kullanılmıyor.

## Karar sürücüleri
- U6 (tıbbi dil yok, teşhis yok), U12 (kapılar), V4 (hassas cevap saklanmaz), K6 (kaynak doğrulanmış).
- Pozitif kişi özelliği cevabını değiştirerek açamamalı; negatif kişi her açılışta yeniden sorgulanmamalı.

## Karar
1. **SCOFF metni:** Morgan 1999'un beş sorusu **kelimesi kelimesine** İngilizce; tek uyarlama 3. soruda birim: "one stone" yerine
   "more than 6 kg (one stone)". Metin `data/copy/en.json`'da, kaynak ve sürüm bu ADR. Eşik **≥2** (`data/parameters/projection.json`).
2. **Pozitifte destek:** herkese aynı nötr cümle — bir doktorla ya da yemeyle ilgili çalışan bir uzmanla konuşmanın yardımcı olabileceği;
   teşhis, hastalık adı, skor gösterilmez (U6). **Cihaz bölgesine göre** doğrulanmış bir kuruluş linki: ABD → ANAD yardım hattı
   (`anad.org/get-support/eating-disorders-helpline/`), Birleşik Krallık → Beat (`beateatingdisorders.org.uk`); TR ve diğerleri →
   yalnız nötr cümle. Linkler veri dosyasında (K2); 4 Eki'de ikisi de HTTP 200. Bölge cihazdan okunur, sunucuya gitmez.
3. **Saklama:** beş cevap **hiçbir yere yazılmaz** (bellekte hesaplanır, atılır). Yalnız "projeksiyon kullanılamaz" bayrağı **cihazda**
   kalır; sunucuya gitmez, gerekçe ("SCOFF pozitif") yazmaz. Pozitifte uygulama içinde yeniden deneme yok. Negatif sonuç da cihazda
   (bir kez sorulur).
4. **Kapı eşikleri (H2 §4.3 tam set):** 18 yaş altı → kapalı · SCOFF ≥2 → kapalı · BMI<20 → **zayıflama yönü** kapalı (kas kazanımı
   yönü açık) · hedef kilo BMI<18,5'e denk geliyorsa reddeder ve gerekçesini söyler · haftada vücut ağırlığının %1'inden hızlı kayıp
   senaryosu üretilmez · özellik **varsayılan kapalı**, kullanıcı bilinçli açar, kapatabilir. Ek (U12): ilk 4 hafta / 2 ölçümden önce yok.

## D1 · Destek kaynakları (doğrulandı 4 Eki 2026)
Uygulamanın gösterdiği kuruluşlar ve linkleri; değerler `data/parameters/projection.json › eating_support_links`. Kuruluşun tam adı
gösterilmez (ANAD'ın açılımı hastalık adı içerir — U6); yalnız kısa ad ve link.
| Bölge (cihaz) | Kuruluş | Link | Kontrol |
|---|---|---|---|
| US | ANAD — ücretsiz yardım hattı, hafta içi | `https://anad.org/get-support/eating-disorders-helpline/` | HTTP 200, 4 Eki |
| GB | Beat | `https://www.beateatingdisorders.org.uk/get-information-and-support/get-help-for-myself/` | HTTP 200, 4 Eki |
| diğer (TR dahil) | — | — | yalnız nötr cümle |

## Neden
- Orijinal metin: doğrulanmış olan odur; çeviri ya da yeniden yazım ölçeği değiştirir. Birim notu anlamı değiştirmez (1 stone = 6,35 kg).
- Bölge linki: ABD hattı TR kullanıcısına yaramaz; doğrulayamadığımız kuruluşu göstermek yanlış yönlendirme olur → nötr cümle.
- Cihazda bayrak: sunucuda "SCOFF pozitif" bir sağlık çıkarımıdır (V4). Hiç saklamamak pozitif kişinin cevabı değiştirip açmasına izin
  verirdi — kapıyı anlamsız kılar.
- BMI<20 yalnız zayıflama: H2 §4.3 — zarar mekanizması zayıflama görseli; kazanım yönü düşük kilolu kişiye kapatılırsa korunmuş olmaz.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| "one stone" harfiyen | ABD/TR kullanıcısı birimi bilmez; yanlış cevap riski |
| İngilizce + Türkçe uyarlama | Türkçe künye doğrulanmadı; arayüz İngilizce (TR yerelleştirme gelince yeniden bak) |
| Yalnız nötr cümle / tek uluslararası link | Linkli yönlendirme bulunabildiği yerde daha yararlı; tek ABD linki TR'ye yaramaz |
| Hiç saklamamak / sunucuda saklamak | Biri kapıyı delinebilir yapar, öteki hassas çıkarımı sunucuya taşır |
| BMI<20'de tüm özellik kapalı | Kas kazanımı yönünü gereksiz kapatır (H2) |

## Sonuçlar
Olumlu: kapı kaynaklı, cevap hiçbir yerde kalmaz, pozitif kişi özelliği açamaz. Olumsuz (kabul edilen bedel): (a) bayrak cihazda —
uygulamayı silip kuran ya da başka cihaza geçen kişiye yeniden sorulur; (b) SCOFF'un doğrulaması 18-40 kadınlarda, erkeklerde daha az
duyarlı olabilir (projeksiyonun öteki kapıları ve varsayılan kapalı olması bunu kısmen karşılar); (c) linkler zamanla bayatlar — her
mağaza sürümünden önce kontrol (DURUM riski).

## Geri dönmenin maliyeti
Düşük-orta: metin ve linkler veri dosyasında; saklama yeri değişirse (sunucuya taşımak) yeni rıza metni ve göç gerekir.

## Etkilenen
K-607 (`apps/mobile` SCOFF akışı, cihaz bayrağı), K-606 (motor kapıları + ekran), `data/copy/en.json`, `data/parameters/projection.json`,
U12 (`docs/anayasa.md`) — değişmedi, uygulandı.

## Doğrulama
`ScoffGateTests` (≥2 kapalı, 1 açık; cevap depoya yazılmaz; pozitifte yeniden deneme yok; bölgeye göre link, TR'de linksiz),
`ProjectionGateTests` (18 yaş, BMI<20 zayıflama yönü, hedef BMI<18,5, %1/hafta, varsayılan kapalı, 4 hafta/2 ölçüm).
