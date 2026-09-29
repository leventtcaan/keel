# Motor parametreleri

Karar motorunun her eşiği, penceresi ve oranı burada — kodda değil (anayasa K2, ADR-010).

Her parametre:
| Alan | Zorunlu | Anlam |
|---|---|---|
| `key` | ✓ | Kodun okuduğu ad (snake_case) |
| `value` ya da `by_sex` | ✓ | Değer; cinsiyete göre değişiyorsa `by_sex: {male, female}` |
| `unit` | ✓ | Birim (`kg`, `kcal`, `g_per_kg`, `days`, `ratio`, `count`…) |
| `tag` | ✓ | `tecrube` (Güray) · `literatur` · `urun` (ürün kararı) |
| `source` | ✓ | `arastirma/...md#kural` — çapa zorunlu ve dosyada bir başlık (`### K-17 ·`, `## 3.4`) olmalı (ADR-020) |
| `note` | — | Çelişki, türetme, sınır |

Çelişkide **Güray kazanır**, literatür boşluk doldurur (U14). Değişiklik: skill `kural-ekle`.
Doğrulama: `ParameterProvenanceTests` + `SourceAnchorTests` (backend).
