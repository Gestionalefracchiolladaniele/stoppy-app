# STOPPY — NoFap Urge Wellness App

Panda mascot **Stoppy** helps ride out urges via 10-min AI chat. Rebrand of NOIT (axolotl/viola → panda/verde, food→trigger, mood→urge intensity). Store-safe, zero shame, never clinical. Target 18-28 EN.
**Stack:** Expo 54 / RN 0.81 / TS strict / Expo Router / Supabase+Google OAuth (web+native) · Zustand · AsyncStorage · **Gemini 2.5 Flash-Lite** (single-shot + synthetic typewriter) · Reanimated 4 · **@shopify/react-native-skia 2.2.12 (mascotte)** · react-native-svg (solo SVG leggeri non-mascotte) · expo-linear-gradient · RevenueCat (TODO) · **pnpm**. Fasi 1-4 + migrazione Skia completate (`tsc --noEmit` exit 0). Source di verità design: `pandafap/mascotte-nofap.html` + `paywall-nofap.html`.

## Mascot — Stoppy
Chubby panda **seduto in meditazione** (gambe incrociate lotus, mani sul ginocchio, sguardo sicuro/concentrato, bambù appoggiato di lato come ancora di mindfulness). Body/head radial `#FFFFFF→#F7F2EA(60%)→#ECE4D6` · Tummy `#FFFFFF→#EDE6DA` · Black parts (ears/patches/arms/legs/nose/mouth/brows) `BLACK #0F0F0F` outer + `BLACK_SOFT #1A1A1A` inner-ear · **Iris forest green `#1C3E24`** · Cheek blush peach `rgba(255,148,128,0.27)` (variable `cheekFlush`) · Bamboo seg A `#8ED84A→#60AC2E→#3C7215` / seg B `#72BC36→#4C9020→#2C6010` / node `#3E8C1A→#246010` / leaves `#60AC2E`/`#4C9020`. **viewBox `2 44 224 380`** (`VB_X/Y/W/H`, render height `size*(380/224)≈size·1.70`) — croppa lo spazio morto sopra/sotto la figura seduta. Aura riposizionata sul baricentro (`top = renderH*0.41 − auraSize/2`).
**9 variants** (`StoppyVariant`, alias `NoitVariant` per compat): `idle` · `listening` (head tilt) · `thinking` (pupille su) · `eating`→semantica **"resisting"** (occhi `><` stretti + 4 stress-lines, NON X-eyes da KO) · `happy` (^^ arc eyes + open mouth) · `excited` (star eyes) · `wink` · `curious` (pupils up-left) · `eyes_closed` (meditation, downward arc, BreatheScreen).
**Animations** (Reanimated `useAnimatedProps` for SVG — NOT `useAnimatedStyle`): `cFloat` 0→-13px @4.2s · `cBlink` scaleY 1→0.02→1 @5.5s (lid dx sfasato +0.14s) · `cBambooSway` rotate 3.5°↔1° @3.8s pivot `(183,360)` (base a terra) · `breathe` 1→1.034 @3.6s.
**useEffect split (critical):** `[state]` → `breathe`/wobble (re-trigger); `[]` mount only → blink/float/sway. **Static mode** (`static` prop): skip all `useEffect`, force `glow=false` + `showSparkles=false`. Safe per liste/chip — usata via `<StoppyMini>`.

**Geometria (posa seduta — coordinate reali):**
- **Head:** `circle cx 100 cy 152 r 76` (disegnata DOPO il body così lo copre → **testa attaccata, niente collo/gap**). **Ears:** outer `cx 44/156 cy 92 r 27`, inner `r 17`.
- **Body seduto:** ellisse `cx 100 cy 288 rx 72 ry 78` che risale fino a sovrapporsi al fondo della testa (body top y210 vs head bottom y228). **Tummy** bianco al centro + **2 chest spots** neri ai lati (panda markings).
- **Gambe lotus:** ginocchia allargate `cx 52/148 cy 356`, stinchi incrociati al centro `cy 372`, piante verso l'interno + polpastrelli rosa. Tonalità lasciate non-uniformate (`#0F0F0F`/`#1A1A1A`/`#262626`/`#2A2A2A`) per richiesta esplicita.
- **Braccia:** banda nera spalle+collo (path testa→spalle, panda yoke) da cui escono **2 braccia distinte** che curvano verso l'interno-basso fino a posare la **mano (palmo-in-basso) sul ginocchio** (paw `cx 60/140 cy 346`, ellisse nera liscia, dorso appoggiato).
- **Eye patches** angolati `cx 75/125 cy 158 rx 29 ry 22 rotate(∓12)` · **Eyes white** r 17 · **pupil** r 11 · **iris** r 6.6 `#1C3E24` convergenti dritte in avanti · **1 catchlight** r 3 · **Eyebrows** Q-curves `#0F0F0F` sw 4.2 piatte/angolate (calmo/determinato) · **Nose** rx 9 ry 6.5 + highlight · **Mouth** `M 86 208 Q 100 226 114 208` sw 3.6.
- **Bambù** appoggiato a terra di lato (x≈157), 7 segmenti A/B alternati con nodi, 2 foglie (sx ~cy 52, dx ~cy 167), highlight stripe `rgba(255,255,255,0.26)` full-height.

**✦ Signature (4):** Bambù verticale (sostituisce la forchetta) · Eye patches rotate ±12° · Iris verde forest `#1C3E24` · Cheek blush peach. (Bib + stella gialla di Noit RIMOSSI — un panda con bib è strano.)

**Espressioni per-stato (occhi BIANCHI sopra le occhiaie nere — contrasto leggibile a 42px):** ogni stato ha forma occhio + sopracciglia + bocca completamente diverse (non più solo pupille spostate).
- `happy` → archi `^^` su + sorriso aperto · `excited` → star eyes gialle + bocca O aperta · `wink` → sx tondo + dx arco wink + smirk asimmetrico · `curious` → tondi pupille up-left + O piccola sorpresa · `eyes_closed` → archi `⌣` giù + linea serena · `eating` → `><` stretti + 4 stress-lines + **V-furrow forte** sw 5.5 + **barra denti serrati** (Rect nero + denti `#E8E0D0` + 3 linee) · `thinking` → aperti pupille su + bocca laterale · `idle`/`listening` → tondi dritti + sorriso dolce con fossette (blink lids animati solo qui).
- **Marker rapidi:** goccia sudore `#7FD7FF` su `eating` (resistenza) · scintilla verde `#9DF0C0` su `happy`/`excited` (calma). **cheekFlush:** 0.50 eating · 0.32 eyes_closed · 0.35 happy/excited/wink · 0.18 default.
- **⚠️ Rendering: ora Skia, non più SVG** — la geometria sotto (coordinate, viewBox, path) resta valida 1:1, ma il rendering è migrato a `@shopify/react-native-skia` in `stoppy-skia.tsx` (vedi **§Skia Migration**). Il fix `useId()`/`url(#...)` per la collisione gradienti web **non serve più** (Skia usa shader inline, niente id globali). `Stoppy.tsx` è ora solo un wrapper.

**Props:** `state` · `size` · `static?` · `glow?` · `crown?`/`showSparkles?` (legacy no-op `@deprecated`).

## Skia Migration — mascotte SVG → Skia (2026-06-07)
**Perché (obbligatorio, non ottimizzazione):** la mascotte `react-native-svg` (~150 nodi: 39 Circle, 27 Ellipse, 30 Path, 13 Rect, 9 Line + gradienti, **2.5× il Noit base**) + shared value Reanimated animati ogni frame **crasha NATIVAMENTE** su Android low-end (Xiaomi) — nessun ErrorBoundary JS lo cattura. Ogni `useAnimatedProps` su nodo SVG forza il bridge nativo per-attributo; con N nodi + driver attivi → crash secco. Skia disegna su **una sola surface GPU** → niente N nodi nativi, niente bridge per-attributo. **Lezione (handoff Noit): finché c'è UN solo nodo SVG dentro la mascotte, quella schermata può crashare → ZERO nodi SVG residui nella mascotte.**

**Scope:** **Stoppy → 100% Skia, zero nodi `react-native-svg`** (verificato elemento-per-elemento contro il backup). Gli **altri SVG dell'app restano SVG** (stelle bg `index.tsx`, icona Google): leggeri + statici, non causavano il crash, convertirli sarebbe inutile.

**Architettura (wrapper sottile, D8 shim pattern):**
- **`src/components/stoppy-skia.tsx`** (`StoppySkia`) — TUTTA la logica Skia, 9 varianti, base condivisa + sotto-componenti `Eyebrows`/`Eyes`/`Mouth` per-stato (path inline SVG rifattorizzati in helper `stroke()`/`arc()` — stessa resa, meno righe).
- **`src/components/Stoppy.tsx`** — ora **wrapper di 2 righe**: `export { StoppySkia as Stoppy }` + re-export `StoppyVariant`/`StoppyProps`. **API identica → i 13 consumer + `StoppyMini` invariati** (continuano `import { Stoppy as Noit }`).
- **`Stoppy.svg.bak.txt`** — backup SVG originale (`.txt` → `tsc` lo ignora). ⏳ Cancellare DOPO conferma build su device.

**Metodo conversione 1:1** (coordinate e path string identici all'SVG, non ri-tarati): `<Ellipse cx cy rx ry>`→`<Oval rect={rect(cx-rx,cy-ry,2rx,2ry)}>` (helper `ovalRect`) · `<Path d>`→`<Path path={d}>` (stessa stringa) · `<Circle>`→`<Circle>` · `<Rect rx>`→`<RoundedRect rect={rrect(rect(...),rx,rx)}>` · `<Line>`→`<Line p1 p2 style="stroke">` · `fill`→`color` · `stroke`+`strokeWidth`→`style="stroke"`+`color`+`strokeWidth`+`strokeCap="round"`.
**ViewBox → root Group** (Skia non ha viewBox): `scale = size/VB_W`, `rootTransform = [{translateX:-VB_X*scale},{translateY:(-VB_Y+floatY)*scale},{scale}]`. Ogni coord interna resta lo STESSO numero. `renderH = size*(VB_H/VB_W)`.
**Gradienti = shader inline** figli dello shape (`<RadialGradient c r colors positions>` / `<LinearGradient start end ...>`): **spariscono `useId` + `url(#...)`** (erano fix collisione DOM web di react-native-svg; Skia non ha id globali → problema inesistente). ⚠️ Le `%` SVG objectBoundingBox convertite in coord assolute sul bbox; in Skia il radial è **circolare** (non si deforma sull'ellisse) → su body/head (quasi quadrati) differenza minima, belly leggermente diversa, solo shading bianco→crema (da rifinire a occhio su device).

**Animazioni (stesse 3 shared value, stesso timing)** via `useDerivedValue<Transforms3d>` legato al `transform` del `<Group>` (NON più `useAnimatedProps`): `floatY` (0↔-13 @2100ms → translateY root) · `bamboo` (3.5↔1° @1900ms) · `blink` (scaleY sequence, solo idle/listening). **Richiede `react-native-reanimated/plugin` in babel** (presente). `<Canvas>` nativo NON richiede Provider.
**⚠️ Regola transform Skia (bug blink Noit):** **scale-around-point** (blink @y157) → `[{translateY:cy},{scaleY:v},{translateY:-cy}]` **SENZA `origin`**; **rotate-around-point** (bamboo @183,360; gambe/zampe/patches/foglie) → `[{rotateZ:rad}]` + `origin={vec(x,y)}` **SENZA translate manuale**. Mettere entrambi = doppio offset = "occhi che cadono".

**Fix applicati in migrazione:** (1) `pointerEvents="none"` su View + entrambi i `<Canvas>` — il panda è dentro `<Pressable>` (home check-in → `/session`); senza, il Canvas nativo mangia il tap del genitore. (2) `bamboo` uniformato a `rotateZ`+`origin` (era translate manuale). (3) recuperata 1 highlight stripe bianca del 3° nodo bambù (saltata → Rect 12≠13, ora 13=13).
**Verifica:** `tsc --noEmit` exit 0 · grep nodi SVG residui nella mascotte = 0 (solo 1 match in commento) · conteggio elementi SVG vs Skia allineato (differenze Path 30→7 = refactoring inline→helper; Circle +3 = ellissi rx=ry→Circle, legittimo). `StoppyMini` invariato (`static glow={false}` → salta useEffect+aura).
**⏳ Da validare SOLO su device (build):** resa visiva (specie gradienti body/belly/head) · fluidità liste con molti `StoppyMini` (History/Insights, decine di Canvas statici) · conferma crash sparito.
**TODO(web):** Skia su web richiede `LoadSkiaWeb()` (CanvasKit WASM) prima del primo render — gate in `_layout.tsx` guardato `Platform.OS==='web'`. **Rimandato di proposito** (crash era Android-nativo only); finché manca, panda vuoto su login/onboarding web. TODO annotato in `Stoppy.tsx`.

## Colors & Typography (verde — sostituisce il viola di Noit)
`<ForestBg />` (sostituisce `<PurpleBg />`), gradient 160°: `#0F2218→#0A180F(52%)→#070D09` + top glow overlay (40% h) `rgba(56,201,122,0.18)→0.05→transparent`. | **Primary mint `#38C97A`** (= ruolo `#5C3E9C`) | **Deep green `#1F6B4D`/`#1A8044`** CTA (= `#7B5BA9`) | Bamboo `#60AC2E` · Azzurro `#2B7DB8` charts | Text primary `#E8F5EE` · muted `rgba(232,245,238,0.52)`/`0.42` · inverse `#0F2218` | **Card bianche preservate** (D5) `rgba(255,255,255,0.92)` — cambia solo bg+accenti | CTA gradient `135° #38C97A→#1A8044` testo `#051008` shadow `rgba(56,201,122,0.28)` |
**Mood/delta chips INVARIATI** (semantica universale verde=good/up, red=hard/down): up `#1A6B44/rgba(26,107,68,0.12)` · down `#8A1840/rgba(138,24,64,0.12)` · neutral. Danger `#E05C5C` crisis. **DM Sans** 500-700. Radii: cards 20-26px · btn 18-22px · tag 12-14px.
Color sweep viola→verde: **267 sostituzioni in 14 file** (`#5C3E9C→#1A8044`, `#7B5BA9→#38C97A`, `#A484D4→#5BB87E`, `#1E1240/#2B1A52→#0F2218`, + manuale `#9B7DC8` clock onboarding). Card bianche + semantica delta/mood intatte.

## Tabs (4): Home · History · Insights · Profile
**PulseCard ovunque** (`useSyncPulse`): wrap a tutte le card. TabBar (`src/components/TabBar.tsx`): bg `rgba(255,255,255,0.92)` · active `#1A8044` · inactive `rgba(56,201,122,0.38)` · h=88 absolute. Session opens as `/session` modal (no Stoppy tab).

**Home** — greeting + check-in card (idle/happy → `/session`) + `<TodayIntensityDisplay />` in PulseCard (**urge BEFORE → AFTER** ultima sessione: StoppyMini before+after via `stoppyVariantForIntensity`, freccia con delta pill +/- colorata, meta row con trigger+duration+timeAgo) + streak row (3 cards) + week bars + recent top 5. All `useSyncPulse()`. `useFocusEffect` reload. *(clean-streak hero + "I relapsed" = post-migrazione, D4)*

**History** — range `2W/1W/1M` + 📅 `<CalendarPicker>` + "+" → `/session`. **Mode tabs** `All N / 💬 Feed N / 🌬️ Breathe N` + **trash icon** (`marginLeft:'auto'`) → **select mode**. Row: date badge + mode icon + trigger + recap preview + `formatDuration · time` + **urge column** (StoppyMini before 26px → freccia → after 32px). **Tap row → `<SessionDetailModal>`.** Tutte in `<PulseCard>`. Filter client-side da `useRecentSessions()`.
**Select mode (multi-delete):** trash toggle → header "N selected" + Cancel/Delete, checkbox `#38C97A` per row, tap row → toggle. Delete confirm Alert → `Promise.all(deleteSession())` parallelo → reload. Border verde 2px su row selezionate.

**SessionDetailModal** (`src/components/SessionDetailModal.tsx`) — full-screen `ForestBg` + hero (back + mode chip + date + time). Card: trigger title + **urge row** (Before StoppyMini 56px → freccia + delta → After 56px) + stats (Duration, **Urge shift**, delta invertito). **Recap-only** ("Stoppy's recap"). Niente sezione Conversation (messages non persistiti).

**Insights** — range + calendar + Mode tabs. Cards:
- **Urge chart adattivo** (dual line): bucket adattivi al range via `buildMoodSeries(rows, since, now)` (1W=7gg, 2W=7×2d, 1M=7×~4d). Linea **after solida** `#1A8044` + fill, **before tratteggiata** `rgba(56,201,122,0.5)` dash `4 5`. Label "Urge before vs after".
- **Average urge card** con switch interno (Urge / Best time) `<SwitchTabs>`: view `mood` Before→freccia+deltaPill→After + "Average across N sessions"; view `bestTime` `<BestTimePanel>` "You feel best after sessions started" + range orario + mini bar chart 6 bucket. Empty se <3.
- **Heatmap weekday × hour bucket** ("When urges hit", 7×6 fasce `12a/4a/8a/12p/4p/8p`, color scale 0→0.28→0.58→`#1A8044`, count se >0).
- **Cravings card** ("Top triggers") con switch (Top / Relief): view `top` bar list `trigger · barBg · N×`; view `mood` `<MoodByCravingPanel>` per top 5 trigger: count, avg before→after, delta pill ("Relief by trigger").

**Profile** — first name + 🔔 bell (`NotificationCenter`, badge rosso unread) + Stoppy hero (`streak` 🔥 + total sessions) + 3 stat cards (avg urge, total time, member since) + menu. `useFocusEffect` → `loadStreak` + `loadRecentSessions`.

**Settings (4 voci):** **Notifications** `<Switch>` → `user.notifications_enabled` + `registerForPushNotifications()` + schedula reminder. ON: inline TimePicker con **3 preset editabili** (☀️/🌤/🌙) — tap card seleziona (set `check_in_time` + ri-schedula), 2° tap su card già selezionata apre edit inline (TextInput HH:MM autoFocus → `normalizeTime` + persist `user.reminder_presets` JSONB). Chip `overflow:'hidden'` + `minWidth:0`, TextInput `width:'100%'` (no overflow). Long-press apre edit su qualsiasi chip. **Subscription** → `PaywallModal`. **Privacy & data** → `PrivacyModal` full-screen `ForestBg` (Export CSV + Delete account + policy). **Help & Support** → `HelpModal` + Stoppy `happy` + 5 FAQ + `support@stoppy.app`.

**Sign out** — `Alert.alert` → `cancelSessionReminder()` fire-and-forget → `signOut()` (auth-store clear locale IMMEDIATO prima di `supabase.auth.signOut()` per evitare race) → `router.replace('/')` belt-and-suspenders. `_layout.tsx` listener gestisce comunque il redirect.

## Session Flow (`src/app/session.tsx`)
```
trigger → urge-before → choice (Talk | Breathe + Continue) →
  ├─ Talk:    Gemini chat (+ Focus Ring mini-game) → urge-after → end (AI recap from chat)
  └─ Breathe: 5min inhale/hold/exhale → urge-after → reflect (text) → end (AI from reflection)
```
`Phase`: `trigger → mood → choice → active → end-mood → reflect? → end`. Direzione metrica: **urge basso = bene → `delta = before − after`** (positivo = relief = verde).
**Zero-orphan DB pattern:** `startSession({trigger})` NON inserisce in DB (sessione in-memory `id:'local-...'`). INSERT SOLO a fine flusso via `insertCompletedSession(args)` (incl. `created_at` originale + `context:{balanceRounds}`). Qualsiasi exit → zero righe orfane. `discardActiveSession()` = solo reset in-memory. `deleteSession` esportato.
**Exit safety — `ExitConfirmModal`:** durante `active`, tap back → modal "Leave session?" con Stoppy `curious` 64px + "Keep going" / "Exit without saving". Tap exit → reset + `router.replace('/(tabs)/home')`.
**TriggerPicker** (sostituisce FoodPicker, no PNG): Stoppy `curious` + **6 card preset emoji** `📱🌙😮‍💨🥱🫥😴` 2-per-riga (`width 48.5%`, icone 20px, label 12.5px) + **7ª card "Other" (✏️)** full-width: quando selezionata mostra `TextInput` inline (`autoFocus`) SULLA card al posto della label; il testo libero finisce nello stesso campo `trigger` (no SQL). Stato locale `otherMode`/`otherSelected` + `selectPreset`/`selectOther`.
**Urge picker (StoppyMini swap):** 5 card con `<StoppyMini state={stoppyVariantForIntensity(o.m)} />` (urge basso = panda sereno). Mascotte grande in alto cambia faccia col mood selezionato (`idle` finché non selezioni). Titolo "How strong is the urge?", label Barely→Mild→Medium→Strong→Intense. Reused before/after.
**Choice screen:** 2 card (Talk/Breathe) select-then-Continue. `starting` flag → "Starting…" + opacity 0.5.
**ChatScreen (Talk):** Stoppy 128px sullo stage (`noitStage` paddingTop 18 / bottom 34, `chatArea` paddingTop 12 → arioso). Eating-animation cibo **disattivata** (`foodSource=null`, ~90 righe di `playEatingSequence`/wind rings/replay/timeout rimosse). Opening message Stoppy ("That urge showing up is okay…"). "Talk to Stoppy", header "Stoppy". 10-min progress bar · Crisis banner static.
**BreatheScreen:** 5-min countdown. Stoppy 150px (no sparkles): `happy` inhale/exhale, `eyes_closed` hold. Cerchi ricalibrati (wrap 310, aura outer 300, inner 250) per contenere la figura seduta. Body puff scale 1.1↔0.95. Breath cloud. Phases inhale 4s/hold 4s/exhale 6s auto-advance. 3 dots, active 22px pill. "Finish".
**ReflectScreen (Breathe only):** Stoppy `curious` 130px + "What just happened?" + StoppyMini recap row ("came in feeling [28px] · now [32px]"). Multiline TextInput. "Save reflection"/"Skip" → `endBreatheSession(mood_after, reflection)` → `interpretBreatheReflection()`.
**EndScreen:** talk `endSession(moodAfter)`; breathe `endBreatheSession(moodAfter, reflection)`. End chip con StoppyMini 24px + label.
**Messages NON persistiti:** salvano `messages:[]` in DB. Solo `recap_text` resta (privacy + storage).

### Focus Ring mini-game (`FocusRingButton`, post-migrazione — sostituisce Balance)
Difendi Stoppy dai pensieri intrusivi intrecciando un **anello di bambù** a furia di tap, **inline** sullo stage (chat resta visibile/scrivibile, timer + reply Gemini non si interrompono — niente Modal).
- **Anello SVG ATTORNO al bottone 🎋** (basso-destra): `AnimatedCircle` r=27 via `useAnimatedProps` + `strokeDasharray`/`strokeDashoffset`, invisibile finché non tappi, + faint track + burst halo (`ringFlash`) allo snap + badge conteggio.
- **Tap/decay:** `RING_FILL_PER_TAP 0.14` (~8 tap) · decay continuo loop `setInterval` ~30fps verso 0. Progress su shared value (UI thread per SVG) + mirror `useRef` JS. **Difficoltà crescente:** `decayRate = RING_BASE_DECAY(0.22) + rounds·RING_DECAY_STEP(0.08)`, cap `RING_MAX_DECAY(1.1)`.
- **Completo →** burst, `onComplete()` bumpa `balanceRounds`, reset 0, Stoppy torna `listening`.
- **Mood per riempimento (INVERTITO calmo→teso)** `moodForProgress`: 0=`listening` · <0.25=`happy` · <0.5=`wink` · <0.75=`curious` · ≥0.75=`eating`. `onBand` solo al cambio fascia.
- **Status pill legata alla %** (non timer): `Listening`(0) → `Mmm`(>0,<0.75) → `Keep going`(≥0.75); 3 dots a soglie .34/.67. `onProgress` solo al cambio bucket (no re-render a ogni tick).
- Store: `balanceRounds` + `incrementBalanceRound()` (reset in start/discard/reset), `context:{balanceRounds}` in `endSession` → colonna `sessions.context` jsonb (già in schema, no migration).

## Onboarding (`src/app/onboarding.tsx`) — 7 steps
Render-conditional `{step===N && <Step/>}` in `<SlideStep key={step}>` (translateX dir×60→0 + opacity, 460ms). Save solo step 7: upserts `subscription_status='plus'` + `role_completed=true`.
(1) Meet Stoppy `idle` (2) How it works `happy` 3 feature cards (3) Name+Birth year `curious` hard block <18 (4) Urge time `wink` (5) Feeling topics `excited` 10 chips (6) Disclaimer `idle` 2 checkboxes (7) Paywall `happy` → `<PaywallSheet>` (Annual €3.99/mo · Monthly €7.99/mo · 7-day trial). Single source `src/components/PaywallModal.tsx`.

## Key Features
**Streak:** giorni consecutivi ≥1 session. Milestones 3/7/14/30/60/100. `fetchStreak(userId)` — `toLocalYmd()` (NON UTC) + Set O(1) + handles "started yesterday" + while-loop backward. Rising-edge milestone in `loadStreak`: `prevStreak` vs nuovo → `pickStreakMilestone` + `insertNotification`. *(clean-streak da relapse = `daysSinceRelapse`/`markRelapse`, hero UI post-migrazione)*
**MoodCheckin (StoppyMini swap):** 5 card con `<StoppyMini state={stoppyVariantForMood(o.mood)} size={36}>`. `AnimatedMoodNoit` wrappa in `Animated.View` scale (idle=shared pulse, selected=spring 1.25→1.07). btn 56px. Upserts `daily_moods`. `flat` prop per PulseCard.
**Sync pulse** (`use-pulse.ts`): module-level `makeMutable(1.0)`, single anim drive tutti i `PulseCard`.
**Crisis** (`checkCrisis()`): client-side BEFORE ogni Gemini call. Keywords suicide/kill myself/self harm/ecc. → redirect a pro.

## Pricing
| Free €0 — 1 session/day, 7 days history | Plus Annual €3.99/mo yearly — unlimited, insights, custom Stoppy | Plus Monthly €7.99/mo — same |

## Database (`supabase/schema.sql` + `migrations/fase3_*.sql` + `fase4_stoppy.sql`)
- **`users`** — id, email, name, avatar_url, role, role_completed, subscription_status(`free|plus|pro`), premium_expires_at, notifications_enabled, check_in_time, push_token, reminder_presets jsonb (`{morning,afternoon,evening}` def `09:00/14:00/21:00`), birth_year, craving_time, topics(text[]), disclaimer_accepted, **last_relapse_date date**, created_at
- **`sessions`** — id, user_id, **trigger** (rename da `food`), mode(`feed|breathe`), duration(sec), mood_before/after(1-5 = urge intensity), recap_text, messages(jsonb — sempre `[]`), context(jsonb — `{balanceRounds}`), created_at
- **`daily_moods`** — id, user_id, date, mood(1-5), unique(user_id, date)
- **`notifications`** — id, user_id, type(`session_reminder|daily_check_in|streak_milestone`), title, message, read, data(jsonb), created_at

RLS `auth.uid()=user_id` + DELETE policies (GDPR). Trigger `on_auth_user_created` → auto-crea `users` row. **`fase4_stoppy.sql`:** `DO $$` guard `RENAME food→trigger` (idempotente, no-op se già trigger, add column su DB fresco) **PRIMA** di `CREATE INDEX sessions_user_trigger_created`; `ALTER users ADD last_relapse_date`. ⏳ **Va ancora eseguita su Supabase** o le nuove sessioni falliscono INSERT su `trigger`. Read usano fallback `row.trigger ?? row.food` per righe pre-migration.

## Gemini (`src/lib/gemini.ts`)
**Model `gemini-2.5-flash-lite`** (1000 req/day free vs 20 di flash, $0.10/$0.40 per 1M tok). `temperature 0.95` + `topP 0.95`, `ABSOLUTE_MAX_WORDS 120`.

**`STOPPY_PERSONA` (alias `NOIT_PERSONA`) — companion NoFap store-safe:**
- WHO: chubby panda, emotional support friend riding out an urge with you, like a buddy texting at midnight
- BOUNDARIES (store-safe): **clean/non-explicit** (no contenuto sessuale), **mai dire "smetti"/"quit"**, no conta-giorni, no diagnosi, no shame, crisis → redirect a pro/feelings
- VOICE: real person not chatbot, contractions, casual, match energy · HOW: 2-3 sentences **40-60 words**, end every sentence `.!?` (NO trailing dots/ellipsis), one natural open question
- DO NOT quote user's words in quotes · don't analyze every line · redirect advice-requests a ciò che c'è sotto · stay calm if harsh
- EMOJI: occasional max 1× quando fits (`🌿 🐼 💚 🌊 😅 ☁️ ✨`)
- AVOID: clinical jargon (triggers/coping), "you should", moralizing, "...", "…"
- `MOOD_LABEL` reinterpretato come **intensità urge** (barely…overwhelming). `needsQuitRedirect()` intercetta richieste "come smetto" → redirect.

**Single-shot + synthetic typewriter** (eliminato streaming raw che tagliava parole / "......"):
1. `generateNoitReply(ctx, signal)` → `generateContent` (un solo shot)
2. **Auto-retry** budget maggiore se `finishReason==='MAX_TOKENS'` || trailing dots || no terminator (first `maxOutputTokens 300`, retry 500)
3. **Cleanup deterministico:** `truncateToWordLimit(120)` + `trimDanglingClause` (strip `[.…]{2,}\s*$`, collapse internal, close con `.`)
4. `streamConversation` → `generateNoitReply` → `playbackAsTypewriter(text, onChunk, signal)` (split `/\S+\s*/g`, 35ms/token) — typing naturale ma testo sempre validato
5. AbortSignal interrompe gen+playback · Fallback "Sorry, I got distracted…" su eccezione (429)

**`generateRecap` v2 (70-80w):** filtra messaggi vuoti, `moodArc` invertito (eased/climbed/steady da delta urge), journal entry FOR you FROM Stoppy. Quote ONE concrete user word (no invent), name emotion under urge, reference arc honestly, NO advice/"next time", se breve/silent → be honest. `maxOutputTokens 180` temp 0.7, `truncateToWordLimit(80)`.
**Functions:** `streamConversation` · `generateNoitReply` (retry) · `playbackAsTypewriter` · `streamBreathingGuide` · `generateRecap` · `interpretBreatheReflection` · `generateInsight` · `generateMilestoneMessage` · `needsQuitRedirect` · `checkCrisis` · `truncateToWordLimit` · `trimDanglingClause`. `SessionContext.trigger` · role `'stoppy'`.
**Session-store integration:** `sendMessage` riceve `onDone(finalCleanText?)` — safety net per rimpiazzare bubble se cleanup ha modificato (raramente triggera ormai). `noitState → stoppyState` (+ `setStoppyState`/`useStoppy`/`useStoppyState`).

## Notifications system
Tipi `session_reminder · daily_check_in · streak_milestone`. **Message UUID** (`session-store.newMsgId()`). `Message.id` obbligatorio.
**NotificationCenter** (~165 righe) — Modal full-screen `ForestBg`. Header back + "Mark all read". White cards (unread bordo verde). Item: emoji + title + body 2-line + timeAgo + dot. Long-press → delete. Empty Stoppy `happy`.
**Push** (`src/lib/push-notifications.ts`): `registerForPushNotifications` · `savePushToken` · `scheduleDailySessionReminder` (Expo DAILY) · `cancelSessionReminder` · `sendLocalNotification`. Titolo "🌿 Stoppy is here".
**Templates** (`src/lib/notification-templates.ts`, zero Gemini): 14 daily + 6 streak + 3 return riscritti voce Stoppy NoFap (clean days, urge/wave, no shame), `{topFood}`→"the urge". Token replacer `{name}`/`{streak}`/`{days}`.
**Daily runner** (`maybeCreateDailyNotification`): idempotente via storage key `noit.last_daily_notif` (lasciata invariata — rinominarla orfanizzerebbe il dedup). Inactivity ≥3 → return notif, else daily by weekday.
**Bootstrap `_layout.tsx`** post profile load: realtime subscribe + preload + savePushToken + maybeCreateDailyNotification. Cleanup `realtimeUnsub` on sign-out.

## Data export & Account deletion (GDPR)
**CSV espanso** (`src/lib/data-export.ts`) — `exportUserDataAsCsv(userId)`: parallel fetch + `fetchSessionStats` 3 range. Sezioni: `=== ACCOUNT ===` · `=== HISTORY — SESSIONS ===` (colonna `trigger`, fallback `food`) · `DAILY MOODS` · `INSIGHTS — SUMMARY` · `TOP TRIGGERS` (mood by trigger) · `URGE SERIES OVER TIME` · `BEST TIME OF DAY` · `WHEN URGES HIT` (heatmap). Via `expo-file-system/legacy` UTF8 + `Sharing.shareAsync`. Header/filename/dialog "Stoppy".
**Account deletion** (`src/lib/account-deletion.ts`) — `Promise.allSettled` su sessions+daily_moods+notifications → `DELETE FROM users`. NON cancella `auth.users` (richiede Edge Function `delete_own_auth_user()` service_role — placeholder commentato).

## SessionStats — extended (`src/lib/supabase-sessions.ts`)
`fetchSessionStats(userId, since, mode?)` client-side. Campi: `total`, `feedCount`, `breatheCount`, `avgMoodBefore/After/Delta` (**delta `before − after`** invertito = relief), `totalDurationSec`, `byWeekdayHour: number[7][6]` heatmap (`HOUR_BUCKETS` 12a/4a/8a/12p/4p/8p), `moodSeries: MoodPoint[]` (7 bucket adattivi via `buildMoodSeries`), `topFoods: TopFood[]` (campo legacy name, dati = trigger), `deltaByHourBucket: (number|null)[6]`, `bestTimeBucket: {label,avgDelta}|null`, `moodByFood: {food,count,avgBefore,avgAfter,delta}[]`. `WEEKDAY_LABELS=['Mo'..'Su']`. Read leggono `row.trigger ?? row.food`. `fetchLastRelapseDate()`/`daysSinceRelapse()`/`markRelapse()`. **Campi pubblici `topFoods`/`moodByFood`/`f.food` tenuti apposta** (rinominarli rifarebbe insights — solo la label è legacy, i dati sono trigger).

## Auth web
- **`src/app/index.tsx`** — `handleLogin` platform-aware: web `supabase.auth.signInWithOAuth({provider:'google', redirectTo:window.location.origin})`, nativo `GoogleSignin` (`.configure` solo `if (Platform.OS!=='web')`).
- **`src/lib/supabase.ts`** — `flowType:'pkce'`.
- **`src/app/_layout.tsx`** — `handleSession(session)` condiviso + oltre a `onAuthStateChange` un **check proattivo** `getSession()` + `exchangeCodeForSession()` se URL ha `?code=` (su web l'evento può scattare prima del listener → utente bloccato su login con sessione valida). URL ripulito `history.replaceState`. Log `[auth] …`.

## File Structure
```
src/app/_layout.tsx (auth listener+handleSession+exchangeCode) · index.tsx (Google OAuth web+native) · onboarding.tsx (7 steps) · session.tsx (trigger→urge→choice→active→end-mood→reflect?→end + ExitConfirmModal + TriggerPicker + FocusRingButton, messages NOT persisted)
src/app/(tabs)/ home.tsx (PulseCard+TodayIntensityDisplay) · history.tsx (range+calendar+ModeTabs+SessionDetailModal+select-mode) · insights.tsx (urge chart+heatmap+switch panels) · profile.tsx (hero/stats/menu · Notifications · Privacy/Help · CSV · delete · sign out)
src/components/ stoppy-skia.tsx (panda seduto 100% Skia, 9 variants, espressioni per-stato, gradient inline, anim via useDerivedValue) · Stoppy.tsx (wrapper sottile → re-export StoppySkia as Stoppy + tipi, API invariata) · Stoppy.svg.bak.txt (backup SVG, da cancellare post-build) · StoppyMini.tsx (static wrapper + stoppyVariantForMood + stoppyVariantForIntensity) · ForestBg.tsx · SessionDetailModal · TabBar · MoodCheckin · TodayIntensityDisplay · CalendarPicker · PaywallModal
src/features/notifications/ NotificationCenter.tsx · notification-store.ts
src/lib/ auth-store · session-store (trigger, stoppyState, balanceRounds, messages:[]) · supabase (pkce) · supabase-sessions (trigger I/O, delta invertito, relapse) · supabase-notifications · push-notifications · notification-templates · daily-notification-runner · data-export (trigger cols) · account-deletion · gemini (STOPPY_PERSONA store-safe, needsQuitRedirect) · format · use-pulse · storage · i18n
src/translations/ en.json + it.json (name Stoppy + tagline NoFap)
src/types/index.ts StoppyState 9 (+alias NoitState) · Intensity 1..5 · Trigger · Session.trigger/.context · Message.role 'stoppy' · User.last_relapse_date
supabase/migrations/ schema.sql + fase3_*.sql + fase4_stoppy.sql (food→trigger rename, last_relapse_date, index)
CLAUDE.md (questo file — spec + stato Stoppy, file di verità)
pandafap/ mascotte-nofap.html · paywall-nofap.html (design source) · promptimplement.md (playbook rebrand)
```
**Cancellati nel cleanup (Fase 4):** `Noit.tsx`/`NoitMini.tsx`/`PurpleBg.tsx` (shim), `TodayMoodDisplay.tsx`, `FoodIcon.tsx`, `food-registry.ts` + intera `assets/food-kit/` (~200 PNG Kenney).

## Key Patterns
**Zustand atomic selectors** · **Mascotte Skia** (no più SVG): `<Canvas>` + primitive Skia, anim via **`useDerivedValue<Transforms3d>`** legato al `transform` del `<Group>` (NON `useAnimatedProps`) · **regola transform Skia:** scale-around-point = translate-scale-translate manuale SENZA `origin`; rotate-around-point = `rotateZ`+`origin` SENZA translate manuale · **gradient inline Skia** (no `useId`/`url(#)` — niente collisione id) · **`pointerEvents="none"` sui Canvas** (mascotte dentro Pressable) · **wrapper sottile `Stoppy.tsx`→`StoppySkia`** (API invariata, swap trasparente) · **mascotte 100% Skia, zero SVG residui** (un solo nodo SVG → crash nativo Android) · **Stoppy useEffect split + static prop** · **espressioni per-stato** occhi bianchi + sopracciglia + bocche ternarie · **StoppyMini = Stoppy static** wrapper safe per liste · **stoppyVariantForMood** (5 distinti) + **stoppyVariantForIntensity** `(N)=stoppyVariantForMood(6−N)` (urge basso = panda sereno): Barely=`happy` · Mild=`wink` · Medium=`eyes_closed` · Strong=`curious` · Intense=`eating` · **PulseCard ovunque** via `useSyncPulse` · **Crisis** client-side BEFORE sendMessage · **needsQuitRedirect** store-safe · **Choice** select-then-Continue · **TriggerPicker** 6 chip + "Other" scrivibile sulla card (no SQL) · **Zero-orphan DB** in-memory finché non completa → `insertCompletedSession()` · **Messages NOT persisted** · **Single-shot Gemini + typewriter** (validato, 35ms/token, AbortSignal) · **Auto-retry on truncation** · **Recap v2 moodArc invertito** · **delta `before − after`** invertito ovunque (urge basso = relief = verde, lezione playbook: NON riscrivere UI, inverti il calcolo) · **Focus Ring inline** (no Modal, chat non si interrompe) · **Editable reminders** tap-select tap-again-edit · **Multi-delete History** select mode · **Insights stats client-side** · **CSV multi-section** · **SignOut** clear locale FIRST · **shim retrocompat poi cleanup PER ULTIMO** (alias `Stoppy as Noit` → zero modifiche JSX) · **campi pubblici `topFoods`/`moodByFood` legacy-name tenuti** · **fallback DB `trigger ?? food`** per righe pre-migration · **viewBox seduta `2 44 224 380`** render×1.70.

## Environment
```
EXPO_PUBLIC_SUPABASE_URL= · EXPO_PUBLIC_SUPABASE_ANON_KEY= · EXPO_PUBLIC_GEMINI_API_KEY= · EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID= · EXPO_PUBLIC_REVENUECAT_IOS_KEY= (TODO) · EXPO_PUBLIC_REVENUECAT_ANDROID_KEY= (TODO)
```
Branding store: `package.json` name `stoppy` · `env.ts` (source di `app.config.ts`) NAME `Stoppy`, scheme `stoppy`/`stoppy.preview`, bundleId/package `com.stoppy.app(.development/.preview)` · `app.config.ts` **slug `stoppy-app`** + **projectId `f6803869-91b0-4a05-ad3c-a42939c6852a`** (EAS owner `praticantisokagakkai`) + icona/splash/adaptiveIcon `#0F2218` · `app.json` fallback statico idem.

## Build & Deploy (EAS) — 2026-06-11
**Repo GitHub:** `github.com/Gestionalefracchiolladaniele/stoppy-app` (remote `stoppy`, branch `main`). Il vecchio `origin → noit-` è lasciato intatto. `.env` gitignorato (zero segreti nel repo).
**App icon = mascotte Stoppy:** `assets/icon.png` (1024², sfondo `#0F2218` pieno, opaco) · `assets/adaptive-icon.png` (1024², **alpha**, panda scalato ~58% per safe-zone circolare Android — config aggiunge bg `#0F2218`) · `assets/splash.png` (1024², alpha). **Generati da `pandafap/stoppy-happy.svg` via Chrome headless** (`--headless=new --screenshot --default-background-color=00000000` per l'alpha, path nativi Windows in PowerShell — Git Bash falliva) → resa fedele (gradienti/blush/bambù perfetti, motore di rendering reale, zero nuove dipendenze). ⚠️ In build non-production il plugin `app-icon-badge` sovrappone un banner env+version sull'icona (`.expo/app-icon-badge/icon.png`) — **normale**, in production l'icona è pulita.
**OTA = EAS Update** (`expo-updates@~29.0.18`, **installato 2026-06-11**): `runtimeVersion: { policy: 'appVersion' }` + `updates.url: https://u.expo.dev/${EAS_PROJECT_ID}` in `app.config.ts` (fonte di verità) + `app.json` (fallback). `eas update:configure` **non scrive su config dinamica** → aggiunte a mano. Post-build: `eas update --channel preview` spinge JS senza ribuild. **Prima del fix non c'era OTA** (`expo-updates` assente → APK era già standalone, ok per APK condivisibile).
**eas.json:** profilo `preview` = `buildType: apk` + `environment: preview` (channel preview) — APK standalone condivisibile, JS cotto dentro, no Metro. `production` = `app-bundle` (AAB store). `development` = `developmentClient: true`.
**EAS env (environment `preview`, verificato `eas env:list`):** `EXPO_PUBLIC_SUPABASE_URL` · `_SUPABASE_ANON_KEY` · `_GEMINI_API_KEY` · `_GOOGLE_WEB_CLIENT_ID` presenti (visibilità `plaintext` → meglio `sensitive`). **`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` dichiarata in `env.ts` ma NON usata nel codice** (su Android l'Android Client ID NON va nel bundle: è una registrazione Google Cloud package+SHA-1 verificata a runtime; il codice usa solo `webClientId`). → la sua assenza nel build è **irrilevante**, NON serve rebuild.
**🩺 Debug "network error" login su device (2026-06-11):** sintomo = login fallisce DOPO la scelta account Google (Google ok → fallisce `signInWithIdToken`). Causa = **progetto Supabase IN PAUSA** (free tier, pausa dopo ~1 sett. inattività → DNS host deprovisionato → `HTTP 000` / `Could not resolve host`). **Fix = Restore dal dashboard Supabase, NESSUN rebuild** (URL invariato). **Lezione: `signInWithIdToken` "network error" + `curl` host Supabase = `HTTP 000`/NXDOMAIN → progetto in pausa, non un bug app.** `supabase.ts` legge URL/key da `process.env` con `!` → valori vuoti/host morto NON danno errore di tipo, esplodono solo a runtime sulla prima chiamata.

## Decisioni di prodotto — ✅ CONFERMATE
| D1 Metrica | **Clean streak** (giorni dall'ultimo relapse) + "I relapsed" — *feature post-migrazione* |
| D2 `food`→? | **`trigger`** (phone/night/stressed/bored/lonely) — niente PNG |
| D3 Flow | `trigger → urge-before → choice → active → urge-after → reflect? → end` |
| D4 Mini-game | ✅ **Focus Ring** (incanali l'energia dell'urge, store-safe; era "Balance") |
| D5 Card style | ✅ **Card bianche** (cambia solo ForestBg + accenti verdi) |
| D6 Persona | Stoppy NoFap **store-safe** (no sessuale, no "smetti", redirect feelings) |
| D7 Direzione | ✅ **Urge basso = bene** → `delta = before − after` |
| D8 Naming | shim retrocompat (`Noit.tsx`→`Stoppy`) per velocità, cleanup PER ULTIMO |

## ✅ Done
**Build & Deploy + OTA + app icon** (2026-06-11): repo pushato su `stoppy-app` (remote `stoppy`, `origin→noit-` intatto) · config riallineata a slug `stoppy-app` + projectId `f6803869-…` (era `stoppy`/`c3a711e8-…`, mismatch col progetto EAS dove sono le env) · **app icon/splash/adaptiveIcon = mascotte Stoppy** rasterizzata da `stoppy-happy.svg` via Chrome headless (3 PNG 1024², alpha dove serve) · **OTA**: installato `expo-updates`, `runtimeVersion`+`updates.url` in app.config.ts/app.json · `tsc` exit 0 · **diagnosi network-error login = Supabase in pausa** (non bug app, fix=Restore, no rebuild). Vedi §Build & Deploy.
**Migrazione Skia mascotte** (2026-06-07): `stoppy-skia.tsx` (panda 100% Skia, 9 varianti, 1:1 da SVG, gradient inline, anim via `useDerivedValue`) · `Stoppy.tsx` → wrapper sottile (API invariata, 13 consumer + `StoppyMini` intatti) · backup `Stoppy.svg.bak.txt` · fix `pointerEvents="none"` (tap-through Pressable) + bamboo `rotateZ`+origin + recupero highlight stripe bambù · `tsc` exit 0 · zero nodi SVG residui nella mascotte. ⏳ validazione device + crash-fix da confermare con build. Vedi §Skia Migration.
**Fase 1 — Mascotte + colori:** `Stoppy.tsx` (port SVG da `mascotte-nofap.html`, iris verde, blush peach, 9 varianti) · `StoppyMini.tsx` · `ForestBg.tsx` · shim retrocompat (13 consumer zero modifiche) · color sweep 267 sost. 14 file (card bianche + semantica delta intatte) · `tsc` exit 0, zero residui viola.
**Redesign mascotte SEDUTA** (2026-05-30 bis): viewBox `2 44 224 380`, testa attaccata (no collo), gambe lotus, banda spalle+2 braccia → mani sul ginocchio, chest spots, sguardo sicuro (pupille r11 + 1 catchlight + sopracciglia piatte), mani palmo-in-basso, bambù a terra, costanti `BLACK`/`BLACK_SOFT`.
**TriggerPicker** (2026-05-30 bis): 6 card emoji 2-per-riga + card "Other" (✏️) scrivibile inline sulla card (no textbox sempre visibile, no SQL).
**Espressioni distinte** (2026-05-30 ter): occhi BIANCHI sopra occhiaie (contrasto a 42px), forma occhio + sopracciglia + bocca per-stato, marker sudore/scintilla, cheekFlush variabile, swap mapping urge Mild↔Strong.
**Fase 2 — Foundation NoFap** (2026-05-30): `fase4_stoppy.sql` (food→trigger rename + last_relapse_date + index) · types (Intensity/Trigger/StoppyState/Session.trigger/Message.role'stoppy'/User.last_relapse_date) · `supabase-sessions` (trigger I/O + delta invertito + relapse fns) · `gemini` (STOPPY_PERSONA store-safe + needsQuitRedirect + arc invertito) · `session-store` (trigger/stoppyState) · notification-templates/push/data-export voce Stoppy NoFap.
**Fase 3 — UI/copy** (migrazione 1:1): TriggerPicker, eating-anim disattivata, urge labels, copy sweep "Noit"→"Stoppy" in tutti gli screen, insights label/switch reinterpretati, `stoppyVariantForIntensity`.
**Fase 4 — Cleanup + branding** (2026-05-29): switch import a componenti reali (alias `Stoppy as Noit`, JSX intatto), `TodayMoodDisplay → TodayIntensityDisplay`, cancellati shim+legacy+food-kit, branding store (package/env/app.config/app.json/translations).
**Focus Ring mini-game** (2026-05-30 quater, sostituisce Balance): anello SVG sul bottone, tap/decay accelerante per round, mood invertito calmo→teso, completa→`listening`, status pill legata alla %, inline (no Modal). + pulizia eating morto (~90 righe).
**Fix proporzioni** (2026-05-30 quater): Stoppy chat 128px · Breathe 150px + cerchi 310/300/250 · ExitModal 64px · mood picker mascotte dinamica.
**Auth web:** Google OAuth web+native platform-aware + pkce + getSession/exchangeCode fallback. **Fix mascotte web:** gradient id univoci via `useId`.
**Done precedenti (ereditati NOIT):** Auth · Onboarding 7 steps · Supabase schema+RLS+trigger · 4 tabs · Streak (toLocalYmd) · useSyncPulse · CalendarPicker · PaywallModal · Crisis · ExitConfirmModal · Notifications+TimePicker · NotificationCenter · Push+template+daily runner · Streak milestone · Bootstrap · Account deletion · Privacy/Help modal · SessionDetailModal · Insights switch panels · SessionStats extended · PulseCard ovunque · Reminder editable · Sign out fix · Recap v2 · Messages NOT persisted · CSV export espanso.

## 🚧 TODO
**Build su device + validare migrazione Skia** (confermare crash Android sparito + resa visiva panda, specie gradienti body/belly/head + fluidità liste `StoppyMini`) → poi **cancellare `Stoppy.svg.bak.txt`** · **Skia su web** (`LoadSkiaWeb()` CanvasKit WASM gate in `_layout.tsx`, `Platform.OS==='web'`) — finché manca panda vuoto su login/onboarding web · **Eseguire `fase4_stoppy.sql` su Supabase** (necessario o nuove sessioni falliscono INSERT su `trigger`) · clean-streak hero + "I relapsed" su home (D1) · privacy policy URL reale · rating 17+ · RevenueCat · `delete_own_auth_user()` Edge Function · Push server-side · IT translations polish · milestone celebration UI · share card 9:16 · diversificare ulteriormente le 9 varianti.
**Deploy/sicurezza:** sostituire `iosUrlScheme: com.googleusercontent.apps.PLACEHOLDER` in `app.json` col Client ID iOS reale (solo se build iOS) · **ruotare le chiavi passate in chat** (Gemini key = quota a carico, Supabase anon, Google secret) post-test · EAS env `EXPO_PUBLIC_*` da `plaintext` → `sensitive` · ⚠️ **Supabase free in pausa dopo ~1 sett. inattività** → se torna "network error" sul device, controlla che il progetto sia Active prima di sospettare l'app.

## ✦ Playbook rebrand (dal `pandafap/promptimplement.md` — ordine d'oro, evita "pagina bianca")
**Ordine 8 step:** (1) Foundation (types + SQL migration, nessun import rotto) → (2) Atoms nuovi (`ForestBg`, `TriggerIcon`) → (3) Mascotte (`Stoppy.tsx` da HTML + `StoppyMini`) → (4) Backend (session-store, gemini persona, supabase-sessions, notification-templates, data-export) → (5) Shared components (import + colori) → (6) Screens (home→history→insights→profile→session→onboarding→index) → (7) **Cleanup finale** (cancella `Noit.tsx`/`NoitMini.tsx`/`PurpleBg.tsx`/`food-registry.ts` PER ULTIMI) → (8) Verifica (`tsc --noEmit` + grep residui + run).
**3 regole anti-disastro:**
1. **Cancella i componenti base per ULTIMI** (toglierli prima di aggiornare i ~21 import → pagina bianca).
2. **Nella migration SQL i rename colonna vanno PRIMA dei `CREATE INDEX`** (altrimenti `column does not exist`).
3. **Se la metrica si inverte di senso, NON riscrivere la UI: inverti il calcolo del delta** (`before − after`).
