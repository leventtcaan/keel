# ADR-033 · Hareket geçmişi, rekorlar (PR) ve notlar
- **Durum:** KABUL (teknik/sunum, agent — ADR-019; rekor türleri Levent onayında, soru 44)
- **Tarih:** 2026-10-01 · **Karar veren:** agent

## Bağlam
K-415 (L3 §1 #6, #8, masa bahsi): hareket bazında geçmiş, rekor listesi, set ve seans notu. Kısıtlar: izolasyonda yük
rekoru yok, tekrar/efor rekoru var (G6 K-33); ana metrik efor, hacim değil (B §6.4, K-406); telefon çevrimdışı çalışır
(ADR-006); notlar sunucuda K-422 ile (#231). Bugün telefonun yerel kayıtları yalnız o telefonda yapılanları tutuyor;
sunucu `GET /v1/workouts?from&to` (en çok `keel.api.max-range-days` = 400 gün) her şeyi veriyor.

## Karar · geçmişin kaynağı, rekor türleri, notlar
1. **Geçmişin kaynağı:** sunucunun antrenman listesi, son `history_days` gün (`data/parameters/workout.json`), telefonda
   kopyası tutulur (çevrimdışı; K-405 kalıbı) + telefonda henüz gönderilmemiş kayıtlar. İkisi `clientId` ile birleşir:
   aynı antrenman bir kez, setleri `clientId` birleşimi. Bir telefonun kendi kayıtları tek kaynak **değildir** (yeni
   telefon, yeniden kurulum).
2. **Yalnız çalışma setleri** rekor sayılır (`WORKING`; sözleşme SetType: efor ve e1RM yalnız onlardan). Isınma, drop,
   tükeniş seti geçmişte görünür, rekora girmez.
3. **Rekor türleri** (hareketin `kind` ve `load`'una göre):
   - Bileşik, harici yük: **en ağır** (o yükteki en çok tekrar), **en yüksek tahmini max** (motorun Epley'i, RIR'li setten,
     K-218 — telefonda `summary.ts` `e1rm`), **yük başına en çok tekrar**.
   - İzolasyon, harici yük: **yalnız yük başına en çok tekrar** (G6 K-33: yük takibi yok; aynı yükte fazla tekrar efordur).
   - Vücut ağırlığı: **en çok tekrar**.
   - Ağırlıklı vücut ağırlığı: **en ağır eklenen yük** + **vücut ağırlığıyla en çok tekrar**; tahmini max yok (motor vücut
     ağırlığını ekler, telefon okumaz — K-406 ile aynı gerekçe).
   - **Hacim rekoru yok** (B §6.4). Tek taraflı harekette taraflar ayrı sayılmaz (iki tarafın iyisi).
4. **Notlar:** set notu set girişinde isteğe bağlı (tek dokunuş akışını bozmaz: varsayılan kapalı), seans notu bitişte.
   Geçmişte setin ve seansın yanında görünür. Uzunluk sınırı sözleşmede (500), telefonda parametre aynası.

## Sonuçlar
- Rekorlar türetilmiş metrik: saklanmaz, her açılışta kayıtlardan hesaplanır → yanlış bir set silinince rekor da düzelir.
- Geçmiş penceresi dışındaki rekor görünmez (bilinçli; 365 gün yeter, sunucu sınırı 400).
- Rekor türleri bir sunum kararı; Levent başka tür isterse (ör. "aynı tekrarda daha fazla RIR") parametre değil kod değişir.
