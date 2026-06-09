# Playbook — come ho rebrandato Noit in Poof (processo reale)

Questo file descrive **esattamente** cosa ho fatto, in che ordine, per trasformare l'app base **Noit**
(compagno per emotional eating) nell'app **Poof** (compagno per craving da sigaretta). Serve come
processo già provato da ripetere su un'altra app: cambia solo il dominio, la sequenza resta identica.

## Due regole che mi hanno salvato (e una che ho imparato sbagliando)
1. **Cancella i componenti base (`Noit.tsx`, `NoitMini.tsx`, `PurpleBg.tsx`) PER ULTIMI.** All'inizio li
   ho cancellati subito → l'app è diventata pagina bianca perché ~15 file li importavano ancora. Ho dovuto
   aggiornare tutti gli import prima. Quindi: prima crei i nuovi file, poi aggiorni TUTTI gli import, e
   solo alla fine cancelli i vecchi.
2. **Nella migration SQL il rename colonne va PRIMA dei `CREATE INDEX`.** Avevo messo il blocco di rename
   in fondo → errore `column "intensity_after" does not exist` perché l'indice la cercava prima del rename.
3. **Se la metrica si inverte di senso, NON riscrivere la UI: inverti il calcolo del delta.** Per Noit
   "mood alto = bene"; per Poof "craving basso = bene". Invece di rifare insights/home ho calcolato
   `delta = before − after` così "positivo = sollievo = verde", riusando la UI esistente.

---

## STEP 0 — Decisioni prese prima di toccare codice
- **Nome:** Poof. **Tagline:** "Poof, the craving's gone."
- **Palette:** dark amber (bg `#16100A`, accent oro `#D4AF5A`/`#A88828`, brace `#FF4E0C`, filtro `#CC8038`).
  Le **card interne restano bianche** (come Noit), cambia solo lo sfondo e gli accenti.
- **Mascotte:** sigaretta antropomorfa (corpo bianco + brace + banda oro + filtro), 9 stati, regge una
  mini-sigaretta in mano destra (al posto della forchetta di Noit).
- **Mappa rinomine** (l'ho usata come riferimento costante):
  `Noit→Poof` · `NoitMini→PoofMini` · `PurpleBg→DarkBg` · `NoitVariant/NoitState→PoofVariant` ·
  `noitVariantForMood→poofVariantForIntensity` · `TodayMoodDisplay→TodayIntensityDisplay` ·
  campi sessione `food→cigarette_type` (+ nuovo `trigger`), `mood_before/after→intensity_before/after` ·
  `Message.role 'noit'→'poof'` · `mode 'feed'→'chat'` · `food-registry`→eliminato (uso SVG inline).
- **Fonte verità mascotte:** `design siga/mascotte-cig.html` (geometria e colori copiati VERBATIM).

---

## STEP 1 — Foundation (types + SQL). Nessun import rotto, safe.

### `src/types/index.ts`
- `Mood = 1..5` lo ho **tenuto** (serve per `daily_moods`, che resta un mood giornaliero generico) e ho
  aggiunto `Intensity = 1..5` (il craving della sessione).
- `CravingMode` da `'feed' | 'breathe'` a **`'chat' | 'breathe'`**.
- Rimosso `NoitState`, aggiunto **`PoofVariant`** (9 stati: `idle/listening/thinking/puffing/happy/excited/wink/curious/eyes_closed` — `eating`→`puffing`).
- Aggiunto tipo **`Trigger`** (coffee/after_meal/stress/...).
- `interface Session`: `food→cigarette_type`, nuovo `trigger`, `mood_before/after→intensity_before/after`.
- `Message.role: 'user' | 'poof'`. `PriorSessionSummary` aggiornato con i campi nuovi.

### `supabase/migrations/fase4_poof_rebrand.sql` (nuovo)
Schema idempotente completo, da eseguire **a mano** in Supabase (non auto-eseguito). Ordine interno:
1. `CREATE TABLE IF NOT EXISTS` users/sessions/daily_moods/notifications (sessions già coi nomi nuovi).
2. **Blocco `DO $$ … $$` di migrazione legacy** (per chi parte da un DB Noit esistente): rinomina
   `food→cigarette_type`, `mood_*→intensity_*`, aggiunge `trigger`, fa `UPDATE … mode 'feed'→'chat'`.
   Tutto guardato da `IF EXISTS`, quindi no-op su DB pulito. **Questo blocco sta PRIMA degli indici.**
3. `CREATE INDEX` (incl. `sessions_user_intensity_after`).
4. RLS + DELETE policies (GDPR) + trigger `handle_new_user`.

---

## STEP 2 — Atoms (nessuno importa i vecchi → safe)
- **`src/components/DarkBg.tsx`** (nuovo, sostituirà `PurpleBg`): stesso layout di PurpleBg ma legge i
  gradient da `theme.ts`. NON ho ancora cancellato PurpleBg.
- **`src/components/CigaretteIcon.tsx`** (nuovo): SVG inline, 8 varianti
  (`regular/light/menthol/rollie/vape/iqos/cigar/pipe`), prop `lit`, export `CIGARETTE_VARIANTS` con label.
  Sostituisce il concetto del food-registry PNG.

## STEP 3 — Mascotte
- **`src/components/Poof.tsx`** (sostituisce `Noit.tsx`): geometria copiata da `mascotte-cig.html`.
  - Reanimated **`useAnimatedProps`** (mai `useAnimatedStyle` sugli SVG) + componenti `Animated.createAnimatedComponent(G/Ellipse/Rect)`.
  - **Split useEffect:** uno `[]` mount-only (float, blink, brace pulse, smoke wisps), uno `[state]`
    (puffing cheeks, wave braccio su listening/thinking).
  - 9 varianti via `renderEyes(state)` / `renderMouth(state)`.
  - **Braccia:** sinistro che ondeggia (`armLProps` rotazione attorno alla spalla), destro curvo verso
    l'alto che regge la **mini-sigaretta accesa angolata** davanti al petto.
  - **Gambe rimosse** su richiesta; figura termina al filtro, viewBox `-10 0 200 446`. Prop `static`/`glow`.
- **`src/components/PoofMini.tsx`** (sostituisce `NoitMini.tsx`): `<Poof static glow={false}>` +
  **`poofVariantForIntensity(1-5)`** → 1 happy, 2 wink, 3 curious, 4 thinking, 5 puffing.

## STEP 4 — Backend (gli screen dipendono da questi tipi/funzioni → vanno prima degli screen)
- **`src/lib/session-store.ts`**: `noitState→poofState` (+ `setPoofState`, `usePoof`, `usePoofState`),
  `startSession` accetta `cigarette_type/trigger/intensity_before`, opening message Poof, `mode === 'chat'`,
  `endSession/endBreatheSession` usano `intensity_after`.
- **`src/lib/gemini.ts`**: `NOIT_PERSONA→POOF_PERSONA` (companion per craving sigaretta; **mai** "smetti"/
  conta sigarette/claim medici; redirect al medico se l'utente vuole smettere davvero). `SessionContext`
  con cigarette/trigger/intensity. `generateNoitReply→generatePoofReply`. Recap su "craving arc"
  (eased/climbed/steady). Crisis keywords + nuovo **`needsQuitRedirect()`**. Emoji 💨☕🌿.
- **`src/lib/supabase-sessions.ts`**: `insertCompletedSession`, `fetchPriorSessionSummaries`,
  `fetchSessionStats` leggono/scrivono le colonne nuove; `fetchTopFoods→fetchTopCravings`. **Ho mantenuto
  i nomi pubblici di `SessionStats`** (`avgMoodBefore`, `topFoods`, `moodByFood`) per non riscrivere
  `insights.tsx`; ho solo cambiato cosa leggono e il segno del delta (`before − after`).
- **`src/lib/notification-templates.ts`**: riscritte le 14 daily + 6 streak + 3 return per contesto
  sigarette (zero terapia).
- **`src/lib/push-notifications.ts`**: titolo "💨 Poof is here".
- **`src/lib/data-export.ts`**: chiavi colonne CSV `cigarette_type/trigger/intensity_*`, titolo export.

## STEP 5 — Shared components (aggiorna import + campi + colori)
In ognuno: `Noit→Poof`, `NoitMini→PoofMini`, `PurpleBg→DarkBg`, `noitVariantForMood→poofVariantForIntensity`,
campi `food/mood_*`, copy, colori (sed hex→token).
- `MoodCheckin.tsx`, `SessionDetailModal.tsx`, `PaywallModal.tsx` (rimosso prop `crown`),
  `NotificationCenter.tsx`, `TabBar.tsx` (barra scura + accent oro), `CalendarPicker.tsx`.
- **`TodayMoodDisplay.tsx`** → ho creato **`TodayIntensityDisplay.tsx`** (nuovo file) e cancellato il vecchio.

## STEP 6 — Screen (è ciò che rompe il bundle se resta un import vecchio)
Ordine: `home → history → insights → profile → session → onboarding → index`. Pattern fisso per ognuno:
1. **import** (Poof/PoofMini/DarkBg/poofVariantForIntensity, `palette` da theme),
2. **campi** (`food→cigarette_type`, `mood_*→intensity_*`, `mode === 'chat'`),
3. **copy** (Noit→Poof, wave/water emoji → 💨, testi craving),
4. **colori** via sed (vedi sotto).
- `session.tsx` è il più grosso: l'ho **riscritto** col flow nuovo
  `cigarette → trigger → intensity → choice → active → end-intensity → reflect? → end`
  (CigarettePicker con CigaretteIcon, TriggerPicker a chip, IntensityPicker con PoofMini). Rimossa la
  vecchia animazione "eating" del cibo.
- `insights.tsx`/`home.tsx`/`profile.tsx`: dove c'era "mood alto = buono" ho invertito le label/helper
  perché "craving basso = buono".

## STEP 7 — Cleanup finale (ORA che nessuno importa più i vecchi)
- Cancellati: `Noit.tsx`, `NoitMini.tsx`, `PurpleBg.tsx`, `TodayMoodDisplay.tsx`, `food-registry.ts`.
- `index.tsx`/`onboarding.tsx`: scheme OAuth `noit→poof`, disclaimer wellness 18+.
- Aggiornato `CLAUDE.md` / questo `POOF_PLAN.md`.

## STEP 8 — Verifica (fatta in quest'ordine)
```bash
npx tsc --noEmit                                              # → 0 errori
grep -rn "Noit\|PurpleBg\|mood_before\|\.food" src/           # → nessun residuo logico
grep -rln "components/Noit\|components/PurpleBg" src/          # → nessun import a file cancellati
pnpm expo start --clear                                       # → builda e gira
```
Poi: eseguire la migration SQL in Supabase, e test manuale onboarding → sessione completa (deve salvare su
DB) → history/insights popolati.

---

## Sed di ricolorazione (l'ho usato su ogni screen)
Sostituisce i viola di Noit coi token Poof. Le card bianche restano bianche.
```bash
sed -i "s/#7B5BA9/#D4AF5A/g; s/#5C3E9C/#A88828/g; s/#4A2A80/#100A02/g; \
        s/#2B1A52/#2C1E0C/g; s/rgba(43,26,82,/rgba(44,30,12,/g; \
        s/rgba(123,91,169,/rgba(168,136,40,/g; s/rgba(92,62,156,/rgba(168,136,40,/g; \
        s/backgroundColor: '#6A4AAC'/backgroundColor: '#16100A'/g" src/app/<file>
```

## Riepilogo errori incontrati → come evitarli alla prossima app
- **Pagina bianca** = cancellati Noit/PurpleBg troppo presto → cancellali in STEP 7, non prima.
- **`column X does not exist`** (SQL) = rename dopo gli indici → blocco rename PRIMA dei CREATE INDEX.
- **Delta colore al contrario** (verde/rosso scambiati) = metrica invertita → usa `before − after`,
  non riscrivere la UI.
- **`SessionStats`**: tieni i nomi dei campi pubblici, cambia solo cosa leggono → eviti di rifare insights.
- **`daily_moods`** è separata dal craving: lasciala com'è se vuoi un check-in d'umore generico.
