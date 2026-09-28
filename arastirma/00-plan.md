---
title: Uygulama projesi — araştırma hattı
baslangic: 2026-09-08
durum: Faz 1 çalışıyor
---
# Uygulama projesi — araştırma hattı

> Kural: **kod yazılmaz.** Her faz bitmeden sonrakine geçilmez. Çıktı sohbette kısa,
> detay dosyada.

## Çalışma hipotezi (Levent, 8 Eylül — henüz kanıtlanmadı)
Spor/sağlık uygulamaları çıktı hedeflemiyor; satmaya ve indirme almaya kurulmuş.
Kullanıcıyı gerçekten değiştiren, bilimsel temelli, koç gibi davranan, dinamik
bir sistem yok. İki uç kullanıcı boşta kalıyor:
- **A ucu:** temeli bilmeyen, umursamayan — küçük doğru değişikliklerle çok kazanacak
- **B ucu:** mükemmeliyetçi — hiç başlayamıyor ya da bırakıyor

## Fazlar

### Faz 1 — Pazar (ŞU AN)
5 paralel hat:
- A · Beslenme/kalori uygulamaları
- B · Antrenman/gym uygulamaları
- C · "AI koç" iddiaları + insan koçluk platformlarının iş akışı
- D · Pazar ekonomisi + regülasyon + creator-app dönüşüm verisi
- E · Kullanıcı şikâyetleri, churn sebepleri, karşılanmamış istekler

Çıktı: rakip haritası + kanıtlanmış boşluk listesi + "bu işe girilir mi" yargısı

### Faz 2 — Bilim / Güray Aydın külliyatı
Kaynaklar: YouTube videolar + **canlı yayınlar** + Instagram reels/story.
Yöntem: transkript → tekrar eden temaları ele → tema bazlı bilgi haritası.
Öncelik güncel içerik; eski içerik sadece niş feature avı için.
Boşluklar bağımsız literatürle kapatılır (hocanın yaklaşımıyla çelişmeden).
Çıktı: uygulanabilir kurallar seti + terminoloji sözlüğü (TR/EN)

### Faz 3 — Boşluk × Bilim kesişimi
Faz 1'in eksikleri ile Faz 2'nin doğrularını çakıştır. Feature adayları çıkar.
Çıktı: özellik listesi + neden var oldukları + hangi boşluğu kapattıkları

### Faz 4 — Ürün kurgusu
Kullanıcı akışı, koçluk döngüsü, dashboard × chat iş bölümü, onboarding,
baseline öğrenme (1 hafta), modülerlik (gym / koşu / Hyrox), fiyatlandırma.

### Faz 5 — Pazarlama + kanal senkronu
Konumlandırma, İngilizce anlatım, YouTube kanalı ile zamanlama, lansman.

### Faz 6 — Mimari ve implementasyon
Teknik yığın, AI orkestrasyonu, veri modeli, maliyet, regülasyon uyumu.

## Değişmez ilkeler
1. **Bilimsellik zorunlu** — manipüle edilmemiş araştırma, iddia = kaynak
2. **Karmaşıklık arkada, sadelik önde** — kullanıcı formül görmez, koç görür
3. **Agentik ve dinamik** — hayat araya girer, sistem uyum sağlar
4. **Levent kullanacak** — kendisi kullanmayacaksa özellik yoktur
5. **Kara kutu yok** — her adımın nasıl çalıştığı Levent tarafından biliniyor (portfolyo kanıtı)
