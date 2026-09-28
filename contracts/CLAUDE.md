# contracts/ — CLAUDE.md

API sözleşmesi tek kaynaktır (K3, ADR-006). Backend bu sözleşmeyi uygular; mobil tipler `openapi-typescript` ile
bundan üretilir (K-303).
- Sözleşme değişikliği sorulur (K5) ve kendi commit'inde, kodu değiştiren commit'ten önce yapılır.
- Kalori alanları **aralıktır** (`low`/`high`, U5). Yağ yüzdesi alanı **yoktur** (U4). Hata mesajında sağlık verisi yok (V3).
- İsim uydurma: alan adı backlog görevinde ya da ADR'de yoksa sor.
