# M1 aktarım planı — Karar motoru

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Tek koşan örnek (bütün M1 boyunca)
Spesifikasyon satırı **WC-04** (`backend/src/test/resources/spec/weekly-checkin.yaml`): kullanıcı cut fazında,
kilosu 3 haftadır sabit, uyum %91, antrenman stabil → motor: **kaloriyi düşür**. Her görev bu senaryonun bir parçasını
kurar; M1 sonunda senaryo uçtan uca motorun içinden geçer.

## Aktarım sırası (bağımlılığa göre)
1. K-101 alan tipleri — kararın şekli
2. K-102 parametreler — eşikler nereden gelir
3. K-103 trend + veri yeterliliği — "henüz karar yok"
4. K-104 güvenlik ağı · K-105 faz kapısı
5. K-106 omurga · K-107 kalori merdiveni · K-108 makrolar
6. K-109 progresyon · K-110 deload
7. K-111 tutarlılık · K-114 başlangıç hedefi · K-115 sapma kalibrasyonu
8. K-112 montaj — bütün resim · K-113 altın senaryolar — kanıt

## Durum
| Görev | Aktarım dosyası | Kod | Anlatıldı | Levent kendi cümlesiyle | Apple Notes |
|---|---|---|---|---|---|
| K-101 alan tipleri | `K-101.md` | ✅ | — | — | — |
| K-102 parametreler | `K-102.md` | ✅ | — | — | — |
| K-103 trend + veri yeterliliği | `K-103.md` | ✅ | — | — | — |
| K-104 güvenlik ağı (+ ADR-020: LEA, hızlı kayıp, tek hard stop) | `K-104.md` | ✅ | — | — | — |
| K-105 faz kapısı | `K-105.md` | ✅ | — | — | — |
| K-108 makrolar | `K-108.md` | ✅ | — | — | — |
| K-109 progresyon | `K-109.md` | ✅ | — | — | — |
| K-110 deload (+ basamak 3) | `K-110.md` | ✅ | — | — | — |
| K-111 tutarlılık | `K-111.md` | ✅ | — | — | — |
| K-106 haftalık omurga (+ ADR-021) | `K-106.md` | ✅ | — | — | — |
| K-107 kalori merdiveni | `K-107.md` | ✅ | — | — | — |
| K-112 montaj (+ ADR-022) | `K-112.md` | ✅ | — | — | — |
| K-113 altın senaryolar (37 yolculuk, DataSufficiency söz hatası) | `K-113.md` | ✅ | — | — | — |
| K-114 başlangıç hedefi | `K-114.md` | ✅ | — | — | — |
| K-115 sapma kalibrasyonu | `K-115.md` | ✅ | — | — | — |

## Bugünün ortak dersleri (her dosyada ayrıca)
- **Test önce, ve testin kendisi de test edilir:** her görevde en az bir test "boş geçiyordu" ya da bir mutasyonu kaçırıyordu;
  mutasyon (kodu bilerek bozma) ve özellik testleri (jqwik) bunları yakaladı.
- **Öz-denetim ajanları gerçek hata buldu:** sessiz kalori aşımı (K-108), kırılan `nextReview` sözü (K-103), %800 oran riski
  (K-102), sonsuz deload (K-110), U4 değer sızıntısı (K-105), telafi mekaniği (K-111).
- **Akşam koşusu (M1 kalanı):** altın senaryolar bir motor hatası buldu (DataSufficiency "şu gün bak" sözü bir sonraki
  check-in'de kırılıyordu); K-115'te ikinci inceleme 4000 simülasyonla "sahte sapma" üretimini kanıtladı → aralık
  tartı payını da içeriyor. Git koruma kancası worktree'deki dalı göremiyordu → düzeltildi (#151).
- **Kaynak ≠ kart:** üç yerde görev kartı araştırmayla çelişti (K-104 hard stop, K-105 %15, K-110 basamak 3); kod kaynağı izledi,
  çelişki Levent'e soru oldu.
