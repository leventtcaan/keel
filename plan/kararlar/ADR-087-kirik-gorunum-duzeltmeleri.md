# ADR-087 · Onaylar ekranda, paywall güvenli alanda, ilerleme çubuğu tek satırda (yeniden yapım Evre 1, K-5, K-6, K-7)
- **Durum:** KABUL (agent, yeniden yapım; Levent 29 Eki: ara kapı yok)
- **Tarih:** 2026-10-29 · **Karar veren:** agent

## Bağlam
Envanter (gerçek sunucu, simülatör): (K-5) Ayarlar'da Sign out ve Delete account onayı listenin sonunda, ekranın dışında açılır; dokununca görünürde
hiçbir şey olmaz. (K-6) Paywall kaydırılınca içerik durum çubuğunun altına girer. (K-7) Antrenmanın hareket ilerleme çubuğu 10 hareketle iki satıra
taşar; dinlenme kartı açılınca ilk satırın üstüne biner.

## Karar
1. **Yıkıcı onaylar sistem uyarısıdır** (iOS HIG: yıkıcı eylemin onayı uyarıyla): Sign out ("Sign out anyway" yıkıcı, "Stay signed in" iptal; fotoğraflar
   telefondaysa uyarı metni bunu söyler), Delete account ("Delete everything" yıkıcı, "Keep my account" iptal; metin kısa: ne silinir, geri alınamaz,
   aboneliği Apple'ın sürdürdüğü ve iptalin nerede yapıldığı). Delete'te "Cancel or change plan" ayrı satır olarak Ayarlar'da kalır. Metinler en.json'da;
   akışın geri kalanı (Apple yeniden onayı, sunucu silme) aynı. Account sheet'i (paywall) aynı uyarıları kullanır.
2. **Paywall üst güvenli alanı** korur: kaydırılan içerik durum çubuğunun altına girmez (güvenli alan ya da yapışkan üst bant).
3. **İlerleme çubuğu tek satır:** parçalar satırı paylaşır (esnek genişlik), hareket sayısı ne olursa olsun taşmaz; dinlenme kartı çubuğun altında durur,
   üstüne binmez.

## Sonuç
- Kanıt: gerçek sunucuya karşı simülatörde Sign out onayı görünür (iptal ile), paywall kaydırma, 10 hareketli antrenman; ekran görüntüleri envanterde.
  Delete'in yıkıcı ucu kanıtta yalnız uyarının görünmesine kadar yürünür (hesap silinmez).
