---
name: aktarim
description: keel'de Levent'e kod, kavram ya da mimari anlatırken kullan. Proje sonundaki kod analizinde (ADR-079), "bunu anlat", "nasıl çalışıyor", "neden böyle", "anlamadım", "satır satır geç" dendiğinde kullan. Geliştirme döngüsünde kendiliğinden çalışmaz.
---

# Aktarım

Tam standart: `docs/aktarim-protokolu.md` — önce onu oku. **Görev başına zorunlu değil (ADR-079):** geliştirmede yalnız Levent
isterse; asıl kullanım proje sonunda bitmiş kodun modül modül analizi.

## Kısa kontrol listesi
- [ ] Hedef seviye ve **basamak listesi** gösterildi mi? Basamak 0 gündelik bilgi mi?
- [ ] Somut örnek kavramın adından **önce** mi geliyor?
- [ ] Her basamak: ne · hangi sorunu çözüyor · sektörde nasıl · bu projede nerede (`dosya:satır`) · başka yerde nasıl.
- [ ] Bir mesajda **en fazla 2-3 basamak**, sonunda "devam / burayı aç".
- [ ] Tek koşan örnek senaryo üzerinden mi gidiyor?
- [ ] Her iddia tıklanabilir `dosya:satır` ile mi?
- [ ] İş mantığı **satır satır** anlatıldı mı?
- [ ] Mümkünse canlı kanıt (kuralı boz → test yakalasın) gösterildi mi?
- [ ] Kapanış: bütün resim + soru bankası + Levent'in kendi cümleleri.
- [ ] Apple Notes (Keel klasörü) — **en son**.

## Yapma
Uzun tablo ve terim yığını · "bunu biliyorsundur" · Levent geçirmeden sonraki basamağa geçmek.
