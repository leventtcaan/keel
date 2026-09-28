# ADR-014 · Görsel dil: C — cesur, enerjik
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent

## Bağlam
Bugün ekranı üç yönde çizildi (`prototip/today-directions.html`): A koyu/veri, B açık/klinik, C cesur/enerjik.

## Karar
**Yön C.** Beyaz zemin, siyah metin, tek vurgu `#FF4F12`; kararlar siyah blok üstünde beyaz; başlıklar Barlow Condensed
(büyük harf, dar), gövde Barlow; radius 6px (kart) / 4px (buton). Token'lar tek dosyada (ADR-006).

## Neden
Levent'in seçimi. Risk (motivasyon ürünü gibi okunma) kopyada dengelenir: sert görünüm, ölçülü ve kanıtlı dil.

## Alternatifler ve neden o değil
A ve B — Levent seçmedi.

## Geri dönmenin maliyeti
Düşük (token'lar tek dosyada).

## Etkilenen
`apps/mobile/src/theme/`, `prototip/`.

## Doğrulama
Bileşenlerde renk/font sabiti yok; hepsi token'dan (lint kuralı veya test).
