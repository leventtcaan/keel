# H13 — Strong ve Hevy CSV biçimleri (K-609, kaynak denetimi)

> Durum: **TAMAMLANDI** · 2026-10-04
> Soru: Strong ve Hevy'nin antrenman dışa aktarma CSV'si hangi sütunları, hangi ayraç, tarih ve birimle yazar? Ayrıştırıcı
> yalnız doğrulanmış sütunları okur (K6 — uydurma sütun yok).
> Doğrulama yöntemi: resmî yardım sayfaları Zendesk API'sinden (`help.hevyapp.com/api/v2/help_center/...`) ve
> `help.strongapp.io`'dan okundu; sütunlar **gerçek dışa aktarma dosyası ya da tarihli gerçek örnek satır** içeren bağımsız açık
> kaynak depolardan çapraz doğrulandı (4 Eki 2026'da klonlandı).

---

## B1 · Resmî kaynaklar ne diyor (ve ne demiyor)

- **Strong** (help.strongapp.io/article/235-export-workout-data): iOS Settings → "Export Strong Data", Android "Export Data";
  "spreadsheet friendly CSV". "Exported files cannot be imported back into Strong." **Sütun listesi yok.**
- **Hevy, dışa aktarma** (makale 43708290987415, güncelleme 2026-10-01): Profile > Settings > Export & Import Data > Export Data >
  "Export Workouts" / "Export Measurements". **Sütun listesi yok.**
- **Hevy, Strong içe alma** (makale 38001424401943 ve "Importing Strong Data into Hevy", 2026-10-02): yalnız Strong CSV'si;
  "The file must be in English"; "directly exported from Strong"; "not manually edited"; süpersetler taşınmaz; eşleşmeyen hareket
  için özel hareket oluşturulur; "Only one CSV import can be active at a time" ve geri alınabilir.

Sonuç: iki üretici de biçimi **yayımlamıyor**. Sütunlar ancak gerçek dosyalardan doğrulanabilir.

## B2 · Strong — doğrulanan biçim (V1, virgüllü)

```
Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
```

Gerçek örnek satır (Strong iOS 5.15.23 (7825), 24 Ocak 2025'te alınmış; `marcostevanon/hevy-converter` `src/models/StrongV1.ts`):

```
2025-01-18 18:05:28,"Training Title",200s,"Bench Press (Barbell)",1,20.0,20,0,0,"","",
```

Aynı başlık dört bağımsız ayrıştırıcıda: `marcostevanon/hevy-converter`, `jake-walker/workout-converter` (`src/adapters/strong.ts`),
`DaKheera47/strong-statistics` (`app/processors/strong_processor.py`), `smyrick/sugarwod-to-hevy` (`docs/STRONG_FORMAT.md`).

| Sütun | Okunan | Not |
|---|---|---|
| `Date` | seansın başlangıcı, yerel saat, saat dilimi yok | Örnek `2025-01-18 18:05:28` (24 saat). `jake-walker` 12 saatlik `h:mm:ss a` biçimini de okuyor `[doğrulanmadı — örnek satır görülmedi]` → **okunmaz**, satır reddedilir |
| `Workout Name` | seans adı | Bir seans = aynı `Date` |
| `Duration` | seans süresi | `200s`, `45m`, `1h 15m` belirteçleri (örnek + iki ayrıştırıcı). Okunamazsa seans süresi bilinmez |
| `Exercise Name` | hareket adı | "Hareket (Ekipman)" deseni: `Bench Press (Barbell)` |
| `Set Order` | hareket içinde 1'den sıra | — |
| `Weight` | yük | **Birim dosyada yok** (dört kaynak da aynı: uygulamanın ayarı). Kullanıcı seçer (kg/lb) |
| `Reps` | tekrar | 0 = tekrarsız (süre/mesafe) → içe alınmaz |
| `Distance`, `Seconds` | kardiyo/süre | Okunmaz (katalogda süre hareketi yok) |
| `Notes`, `Workout Notes` | serbest metin | **Okunmaz, gönderilmez** (veri en azı) |
| `RPE` | çoğu zaman boş | Okunmaz: RPE → RIR çevirisi bu dosyalar için doğrulanmadı |

Dosyada **olmayanlar** (dört kaynak): ağırlık birimi, ısınma seti işareti, süperset, setler arası dinlenme.

### Doğrulanmayan Strong varyantları — okunmaz
- Noktalı virgüllü, sonda `Weight Unit` sütunlu ("as of 2024+", `TraceApps/lifttrace` yorumu) — örnek satır yok.
- `Workout #;Date;Workout Name;Duration (sec);…;Weight (kg);…` — yalnız arama özetlerinde; dosya görülmedi.
Ayrıştırıcı başlığı tanımazsa dosyayı reddeder ("tanımadığımız bir dosya"), sütun tahmin etmez. Levent'ten ya da bir kullanıcıdan
güncel gerçek dosya gelirse bu bölüm güncellenir.

## B3 · Hevy — doğrulanan biçim (metrik)

```
"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
```

Gerçek dışa aktarma dosyası: `mouadja02/Hevy-Coach` `workout_data.csv` (330 satır, 13 May – 30 Haz 2025). Aynı sütunlar
`TraceApps/lifttrace` (`src/lib/workout-import/hevy.js`) ve `adamad44/Hevy-App-Data-Visualiser` (`calculations.js`) içinde.

| Sütun | Okunan | Not |
|---|---|---|
| `title` | seans adı | Bir seans = aynı `title` + `start_time` |
| `start_time`, `end_time` | `30 Jun 2025, 19:56` | İngilizce ay kısaltması, yerel saat, saat dilimi yok, saniye yok |
| `exercise_title` | hareket adı | "Hareket (Ekipman)" deseni |
| `set_index` | hareket içinde **0'dan** sıra | Gerçek dosyada 0-5 |
| `set_type` | `normal`, `warmup` | Gerçek dosyada yalnız `normal`; `warmup` iki ayrıştırıcıda. Başka değer (`dropset`, `failure` `[doğrulanmadı]`) çalışma seti sayılır |
| `weight_kg` | yük, kg | Bu varyantta birim başlıkta |
| `reps` | tekrar | — |
| `superset_id` | boş ya da `0`, `1`… | Okunmaz (keel'de süperset telefonda yapılır, K-424; içe aktarılan seansta gerek yok) |
| `description`, `exercise_notes` | serbest metin | **Okunmaz, gönderilmez** |
| `distance_km`, `duration_seconds`, `rpe` | — | Okunmaz |

Dosya **yeniden eskiye** sıralı (ilk satır en yeni seans) — sıra okunmaz, seanslar zamana göre sıralanır.

### İmperyal varyant
`weight_lbs`, `distance_miles` başlıkları: üç ikincil kaynakta (Taper ve Gript yardım yazıları, `ndeast/hevy-history-mcp`
`sample_data.csv` — dosyanın kendisi açılamadı) `[ikincil — gerçek dosya görülmedi]`. Yalnız ağırlık başlığı farklı; değer
lb → kg tam çarpanla (0,45359237, tanım) çevrilir. Başka hiçbir sütun bu varyant için varsayılmaz.

## B4 · Dambıl yükü — dosya söylemiyor
Keel'de DUMBBELL yükü **tek dambıl** (ADR-032). Ne Strong ne Hevy dosyası yükün tek dambıl mı iki dambılın toplamı mı olduğunu
söylüyor. Gerçek Hevy dosyasında `Lateral Raise (Dumbbell)` 28 kg × 20, `Bench Press (Dumbbell)` 72 kg × 15 — bu kişi büyük
olasılıkla **toplamı** yazmış; ama bu bir kişinin alışkanlığı, üreticinin kuralı değil `[doğrulanmadı]`. Sonuç: içe aktarmada
kullanıcıya **bir kez** sorulur ("one dumbbell / both together"), varsayılan tek dambıl; tahmin edilmez.

## B5 · Taraf (tek kollu hareket)
Keel'de tek taraflı hareket seti LEFT/RIGHT ister. İki dosyada da taraf yok. İçe aktarılan setin tarafı **bilinmez** olarak
saklanır; uydurulmaz.

## B6 · Hareket adı eşleme
Rakip pratiği: Hevy eşleşmeyen Strong hareketi için özel hareket oluşturur (B1). "Egzersiz eşleme benchmark'ı yok" (04 §8.2,
L3 Y10). Keel'in katalog adları ve arama takma adları `data/copy/en.json › exercises.<id>.aliases`'ta; ekipman
`data/exercises/<id>.yaml`'da. Klasik deadlift katalogda yok (yalnız Romanian deadlift) — eşleme güveni düşük çıkmalı, kullanıcı
seçmeli (U5).
