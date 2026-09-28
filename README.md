# keel

A coaching app that looks at your training, food, weight and progress photos and **makes the weekly call** —
what to change, what to keep, and why. The decision comes from a deterministic engine; the language model only
explains it.

Working name. iOS first.

## Layout
| Path | What |
|---|---|
| `backend/` | Spring Boot + Spring Modulith (Java 25) — decision engine and API |
| `apps/mobile/` | Expo (React Native, TypeScript) — iOS app |
| `contracts/` | OpenAPI contract; the mobile client is generated from it |
| `data/parameters/` | Engine thresholds and windows, each with its source |
| `data/copy/` | User-facing strings (English) |
| `plan/` | Roadmap, backlog (single source of tasks), architecture decision records |
| `docs/` | Rules, architecture overview, glossary |
| `arastirma/` | Research behind every rule (Turkish) |
| `prototip/` | Screen prototypes |

Planning documents are in Turkish; code, commits and the app are in English.
