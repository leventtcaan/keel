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
| Görev | Aktarım dosyası | Anlatıldı | Levent kendi cümlesiyle | Apple Notes |
|---|---|---|---|---|
