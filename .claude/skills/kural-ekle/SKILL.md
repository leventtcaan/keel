---
name: kural-ekle
description: keel karar motoruna yeni bir kural ya da parametre eklerken kullan. "Şu kuralı ekleyelim", "motor şunu da yapsın", "eşiği değiştir", "Güray şöyle diyor, bunu koda dökelim" dendiğinde ya da data/parameters altındaki bir dosyaya dokunulacağında mutlaka kullan.
---

# Kural ekle

Motor kuralı **kanıt + parametre + test** üçlüsüdür. Biri eksikse kural eklenmez (U14).

## Adımlar
1. **Kaynak bul:** kural hangi araştırmadan? `arastirma/ham/guray/G1-G7` (Güray, `[tecrübe]`) ya da
   `arastirma/ham/H*`, `J1` (`[literatür]`). Kural numarasını ve alıntıyı bul. **Bulamıyorsan dur** — kaynaksız kural yok.
2. **Çelişki kontrolü:** aynı konuda Güray kuralı ile literatür çelişiyorsa **Güray kazanır**, literatür sadece boşluğu
   doldurur. Çelişkiyi parametre dosyasında `note:` alanına yaz.
3. **Parametre:** sayısal her şey `data/parameters/<alan>.yaml`'a. Her parametre:
   ```yaml
   - key: weekly_loss_cap_kg
     value: 1.0
     unit: kg/week
     tag: tecrube            # tecrube | literatur
     source: "arastirma/ham/guray/G2-kilo-verme.md#K-3"
     note: "Mutlak tavan. Literatür %0,5-1,0 VA/hafta diyor; min(1 kg, VA×%1) ile ikisi birden sağlanır."
   ```
   Cinsiyete göre değişiyorsa `by_sex: { male: …, female: … }` (`arastirma/ham/J1-cinsiyet.md`).
4. **Test önce:** kuralın davranışını tablo halinde test et (girdi → beklenen karar). Sınır değerleri dahil
   (eşiğin tam altı, tam kendisi, tam üstü). Test kodunda sayı yok; parametre dosyasından okunur.
5. **Kod:** kural motorun `engine` modülünde saf fonksiyon; Spring'e, veritabanına, saate bağımlı değil
   (zaman girdi olarak gelir).
6. **Gerekçe metni:** kararın kullanıcıya görünen nedeni `data/copy/en.json`'da; kod yalnız anahtarı döner.
