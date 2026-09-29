# M1 kural haritası — kaynak, boşluk, karar sahibi

> 29 Eyl 2026, K-103 sırasında çıkarıldı (araştırma taraması + kaynak satırı doğrulaması). Kodlamadan önce bu tabloya bak.
> Yollar `arastirma/` altına göredir. [T] = tecrübe (Güray), [L] = literatür. **L-n** = Levent kararı bekleyen madde (DURUM › Akşam).

## K-104 · Güvenlik ağı
| Kural | Kaynak | Durum |
|---|---|---|
| Haftalık kayıp tavanı min(1 kg, VA×%1) → kalori artır | `ham/guray/G2-kilo-verme.md:205-212` K-17 [T] · `ham/H3-bosluk-literatur.md:466-476` Ç1 [L] · `G2:879` | ✅ uygulanabilir |
| Kalori BMR altına inmez; inecekse kardiyo/adım (CHANGE_MOVEMENT, WC-12) | `G2:132-139` K-11 [T] · `G2:869` | ✅ — BMR **girdi** olarak gelir (Güray: "online hesaplayıcı değeri", `G2:134`); formül yok (bkz. K-114) |
| 8 haftada >%8 kayıp | `ham/J1-cinsiyet.md:272-273, 459-461` [L] | ⚠ **L-1**: kart "hard stop", kaynak "deficit'i daralt + uyar" |
| EA ≤30 kcal/kg FFM/gün | `J1:246-276` C6, `J1:455-463` L2.1 [L] | ⚠ **L-1** (aynı çelişki) · **L-2**: erkek eşiği 25 (J1:456), dosyada ikisi de 30 |
| Adet kaybı bildirimi → tek gerçek hard stop, sağlık profesyoneline yönlendirme | `J1:463-467` | ⚠ **L-3** sağlık verisi (GDPR Art. 9), soru tasarımı |
| Yağ oranı <%18 (k) / <%8 (e) → açığı durdur | `J1:459` | ⚠ **L-4** zayıf kanıtlı sağlık eşiği |
| EA hesabı yağsız kütle ister → yalnız iç yağ tahmini varsa çalışır (U4: sayı gösterilmez) | kart "hesaplanabiliyorsa" | teknik |

## K-105 · Faz kapısı
| Kural | Kaynak | Durum |
|---|---|---|
| Bulk tavanı %20 (e) / %30 (k) | `ham/guray/G6-eski-arsiv.md:196-204` K-7 [T] · `J1:117-129` B1 (+10 ofset) [L] | ✅ parametre var |
| Çalışma bandı 15-20 (e) / 25-30 (k) | `G6:206-214` K-8 [T] · `J1:146-153` B3 | ✅ yeni parametre, kaynaklı |
| Giriş kapısı: >30 bulk yasak, >25 cut, 12-25 hedefe göre, <12 fazla | `03-guray-karar-omurgasi.md:52-61` · `ham/guray/G4-ilerleme-metabolik.md:105-112` K-10 [T] | ✅ yeni parametre, kaynaklı |
| "Önce yağ ver" (yeni başlayanların çoğu) | `G4:51-58` K-4 [T] | ✅ |
| İç yağ tahmininin **üreticisi** tanımsız (foto hattı K-601/K-206) | — | teknik: Snapshot'ta isteğe bağlı iç değer |

## K-106 · Haftalık omurga
| Kural | Kaynak | Durum |
|---|---|---|
| Ağaç: yön → görüntü → antrenman → toparlanma → genetik limit | `03:82-95` [T] | ✅ |
| Kilo+bel 1 hafta sabit + uyum yüksek → bekle | `03:97-99` · `G2:625-633` K-64 [T] | ✅ yeni parametre `flat_wait_weeks: 1` |
| Uyum <%50 → kaloriye dokunma; ≥%70 iyi | `G2:589-596` K-60 · `G2:886-887` [T] | ✅ yeni parametre (0,5 / 0,7) |
| Antrenman düşüyor → cut yok | `G2:883` · `G7:449-457` K-98 · `G6:270-278` K-14 [T] | ✅ |
| "Görüntü", "toparlanma" sinyallerinin tanımı yok | `G6:172-180` K-5, `G2:885` K-87 (aday) | teknik: Snapshot'ta üç değerli sinyal (iyi/aynı/kötü/bilinmiyor), üreticisi sonraki modüller |
| **WC-04** kaynağı ağaçta yok (boşluk; H3 B3 dolduruyor) | `G2:881` B-1 | teknik: spec kaynak satırı düzeltilir |
| **WC-07** "genetik limit" yalnız bulk'a uygulanmış | `03:82-95` iki yön | ⚠ **L-5** yorum |
| Uyum tanımı: K-111 oranı mı, Güray'ın "planın %70'i" mi | — | ⚠ **L-6** ürün kapsamı |

## K-107 · Kalori merdiveni
Tamamı kaynaklı: 500 kcal min adım (`G7:438-447` K-97, `G7:890-893`), ölçüt antrenman (`G7:449-457` K-98), önce yağ 1 g/kg
(`G2:258` K-22), açığı yağdan (`G7:647-655` K-117), bulk +250 karbondan 2 hafta sabitte (`G3:115-122` K-10), ayarlar
arası 2 hafta (`H3:28`). Eksik parametre: bulk sabit hafta tetikleyicisi 2 (`G3:117`) — kaynaklı eklenir.

## K-114 · Başlangıç kalori hedefi
- Güray: bakım formülden değil **gözlemden** (`G2:105-112` K-8); başlangıç = son 2-3 ay yeme + iş aktivitesi (`G2:114-121` K-9);
  beyan +500-1000 eksik (`G2:155-166` K-13).
- `arastirma/` içinde **BMR formülü ve aktivite katsayısı yok** (Mifflin, Harris vb. hiç geçmiyor). ⚠ **L-7**: formül seçimi
  (kaynak eklenmeli) ya da Güray yöntemi (beyan + gözlem). Kadında gözlem 4 hafta (`H3:510-515` Ç5) — parametre tek değer.

## Genel
- ⚠ **L-8** `03:292-293`: "İlk sürüm erkek kararı (Levent, 9 Eylül)". ADR-003 (29 Eyl) kadın penceresini içeriyor → M1'de
  kadın kuralları kapsamda mı? (Şu an ikisi de uygulanıyor.)
- WC-15 → K-112 · WC-16..19 → K-110 · WC-20 (MINI_CUT) sahipsiz, süre parametresiz · WC-18 0,4 eşiği kaynaksız.
