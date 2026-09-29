---
name: karar-yaz
description: keel'de bir mimari, teknik ya da ürün kararı alındığında ADR yazar. "Karar verelim", "bunu kayda geç", "ADR yaz", "neden böyle yaptık" dendiğinde, iki seçenek arasında bir tercih yapıldığında ya da mevcut bir kararı değiştiren bir iş çıktığında mutlaka kullan.
---

# Karar yaz (ADR)

## Dosya
`plan/kararlar/ADR-0NN-kisa-ad.md` — numara `plan/kararlar.md` dizinindeki son numaranın bir fazlası.

## Şablon
```markdown
# ADR-0NN · <Başlık>
- **Durum:** ÖNERİ | KABUL | YERİNİ ALDI → ADR-0MM
- **Tarih:** YYYY-AA-GG · **Karar veren:** Levent (öneren: agent)

## Bağlam
Hangi problem, hangi kısıt. Araştırma kaynağı (`arastirma/...`).

## Karar sürücüleri
Seçimi belirleyen 2-4 ölçüt (ör. "Levent anlatabilmeli", "tek VPS", "App Review 5.1.2").

## Karar
Tek paragraf, net.

## Neden
Kanıtlı gerekçe.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |

## Sonuçlar
Olumlu · olumsuz (kabul edilen bedel).

## Geri dönmenin maliyeti
Düşük / orta / yüksek — neden.

## Etkilenen
Modüller, dosyalar, diğer ADR'ler.

## Doğrulama
Bu kararın doğru uygulandığını hangi test ya da kontrol gösterir.
```

## Kurallar
- **ADR gerekmez:** geri dönüşü ucuz, tek dosyalık, başka kararı etkilemeyen seçim → PR gövdesinde gerekçe yeter.
  ADR gerekir: şema, modül sınırı, sözleşme, bağımlılık ailesi, güvenlik/gizlilik, ürün davranışı.
- Teknik ADR'yi (mimari, altyapı, test, araç) agent yazıp KABUL eder. Ürün kapsamı, para, sağlık/regülasyon,
  veri paylaşımı ve görsel/marka ADR'si ÖNERİ olarak yazılır, **KABUL'e Levent çevirir** (ADR-019).
- Mevcut bir ADR'yi değiştiren karar: eskisi "YERİNİ ALDI → ADR-0MM" olur, silinmez.
- `plan/kararlar.md` dizinine tek satır eklenir.
- Sürüm, kütüphane, API iddiası varsa doğrulandığı kaynak ve tarih yazılır (K6).
