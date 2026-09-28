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

## Karar
Tek paragraf, net.

## Neden
Kanıtlı gerekçe.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |

## Geri dönmenin maliyeti
Düşük / orta / yüksek — neden.

## Etkilenen
Modüller, dosyalar, diğer ADR'ler.

## Doğrulama
Bu kararın doğru uygulandığını hangi test ya da kontrol gösterir.
```

## Kurallar
- Agent ÖNERİ yazar; **KABUL'e yalnız Levent çevirir.**
- Mevcut bir ADR'yi değiştiren karar: eskisi "YERİNİ ALDI → ADR-0MM" olur, silinmez.
- `plan/kararlar.md` dizinine tek satır eklenir.
- Sürüm, kütüphane, API iddiası varsa doğrulandığı kaynak ve tarih yazılır (K6).
