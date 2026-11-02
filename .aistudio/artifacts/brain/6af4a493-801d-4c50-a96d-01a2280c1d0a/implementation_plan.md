# Critical Care Clinical Workstation: Philips IntelliVue MX800 & B. Braun Space Infusion Suite

An interactive critical care bedside simulation coupling a real-time **Philips IntelliVue MX800 Patient Monitor** (with an embedded Clinical Informatics PC) and a docked **B. Braun SpaceStation** infusion rack. Clinicians and trainees can titrate vasoactive and sedative infusions, inspect live molecular and regulatory drug profiles via **PubChem** and **openFDA**, and manage synchronized hemodynamic responses and device alarms in real time.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices incorporate your confirmed selections and define the simulation defaults before implementation begins.

- **Confirmed — Bioscience & Pharmacology Scope**: The MX800 Clinical Informatics PC (`iPC`) and smart pump Drug Library inspector will query **PubChem PUG REST / PUG View** (chemical structures, CIDs, SMILES, physicochemical properties, Lipinski/Veber metrics) and **openFDA** (SPL boxed warnings, indications, dosing guidelines, and FAERS adverse event profiles) exclusively, complete with provenance badges and direct source links.
- **Confirmed — 4-Bay B. Braun SpaceStation Configuration**: The lower docking station will house **Channel 1: Perfusor Space** (syringe pump), **Channel 2: Infusomat Space** (volumetric pump), **Bay 3: SpaceControl** (centralized master supervisor and fluid/therapy overview module), and **Bay 4: Standby Expansion Slot** (with interactive locking lever and power/bus rail telemetry).
- **Confirmed — Clinical Scenarios & Muted-by-Default Audio**: An interactive **Scenario Selector** will trigger clinical and mechanical emergencies (Septic Shock, Downstream Occlusion, Syringe Empty, Low Battery, Ventricular Tachycardia, Asystole) while **Web Audio IEC 60601-1-8 acoustic alarms start muted by default** until explicitly enabled via the monitor audio toggle.
- **Default — Accelerated Bedside PK/PD Time Constant**: Real vasoactive onset takes 30–90 seconds clinically; the simulation models realistic multi-compartment onset lag compressed to an observable **8–15 second equilibration window** so rate changes and boluses visibly remodel arterial pressure and heart rate without tedious waiting.

---

## 1. Overview & Core Concept

- **What It Does**: Delivers a unified, full-viewport ICU bedside workstation split into an upper physiological monitoring console (70% viewport height) and a lower modular smart-pump docking station (30% viewport height), linked by a continuous physiological and pharmacokinetic-pharmacodynamic (PK/PD) engine.
- **Target Audience / Persona**: Critical care clinicians, ICU nurses, anesthesiology trainees, biomedical engineers, and clinical pharmacology educators practicing vasoactive titration, pump safety workflows, and crisis troubleshooting.
- **Key Value**: Bridges device-level operation (authentic B. Braun keypad navigation, 3-second power hold, L1–L9 occlusion thresholds, Data Lock PIN `9119`, MX800 SmartKeys) with molecular/regulatory drug intelligence (live PubChem + openFDA monographs) and closed-loop physiological consequences.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Zero-State Bedside Arrival**: The workstation opens immediately into an active post-operative ICU patient profile (sinus rhythm ECG, pulsatile ABP/CVP, SpO₂ plethysmograph, impedance respiration) with Channel 1 (`Perfusor Space` running Norepinephrine in `mcg/kg/min`) and Channel 2 (`Infusomat Space` running balanced crystalloid maintenance in `mL/h`) actively infusing and audio safely muted.
2. **Infusion Titration & Bolus Delivery**: Selecting either pump or using its tactile B. Braun keypad (`Up/Down/Left/Right`, `C`, `OK`, `Start/Stop`, `Bolus`) adjusts flow/dose rates or administers a measured bolus. As the syringe plunger advances or drip chamber accelerates, the `SpaceControl` master module updates total fluid balance, and after a realistic circulation lag, the MX800 arterial waveform and MAP/HR numerics respond.
3. **Clinical Informatics (`iPC`) & Bioscience Lookup**: Toggling the MX800 **iPC Window** opens a split-screen clinical informatics workbench alongside live vitals. Selecting an active pump medication (or quick-try ICU drug chips such as `Norepinephrine`, `Vasopressin`, `Propofol`, `Dobutamine`, `Amiodarone`, `Fentanyl`) fetches live 2D chemical depictions and properties from **PubChem** plus boxed warnings, dosing excerpts, and top FAERS reactions from **openFDA**.
4. **Crisis Scenario & Alarm Resolution**: Launching a scenario (e.g., *Downstream Occlusion* or *Ventricular Tachycardia*) flashes synchronized visual banners (`*** RED ALARM` / `** YELLOW WARNING`) andpump LEDs. For occlusion, downstream pressure exceeds the configured `L1–L9` limit, halting flow and triggering an automatic anti-bolus pressure rewind upon latch/line clearance; on the MX800, clinicians use **Silence** (2-minute pause timer) or **Alarms Reset** after stabilizing physiology.

### Visual Identity & Theme
- **Aesthetic Direction**: High-precision clinical instrumentation pairing an authentic low-glare dark physiological monitor surface with a tactile medical-device docking bay and a crisp, publication-grade light scientific workbench inside the embedded `iPC` window.
- **Color Palette & Semantic Encoding (60-30-10 Discipline)**:
  - *MX800 Monitor Canvas (Dark Instrumentation)*: Deep low-glare obsidian `#111318` background with `#1A1E26` parameter cells and `1px solid #262C3A` hairline dividers. Signal channels follow strict clinical color standards paired with text/glyph labels (never hue-only):
    - **ECG / HR**: Phosphor Green (`#22C55E`)
    - **SpO₂ / Pleth**: Clinical Cyan (`#06B6D4`)
    - **ABP (Arterial)**: Arterial Red (`#EF4444`) · **CVP (Venous)**: Venous Blue (`#3B82F6`) · **NBP**: Crisp White (`#F8FAFC`)
    - **RESP (Impedance)**: Telemetry Yellow (`#EAB308`) · **Core Temp**: Soft Emerald/White (`#A7F3D0`)
  - *Embedded iPC Bioscience Workbench (Publication-Grade Light Surface)*: Laboratory canvas `#F8FAFC` and `#FFFFFF` cards with `1px solid #E2E8F0` borders, DeepMind Scientific Blue (`#0B57D0`) and Teal (`#0D9488`) interactive accents, and crimson (`#DC2626`) / amber (`#D97706`) regulatory warning indicators.
  - *B. Braun SpaceStation Dock*: Industrial medical warm-slate chassis (`#1E2430` rack housing with brushed `#E2E8F0` / `#CBD5E1` pump faceplates, backlit monochrome/LCD pump screens, and tri-state LED indicators: `● INFUSING` `#16A34A`, `▲ PRE-ALARM` `#D97706`, `✖ ALARM` `#DC2626`).
- **Typography & Hierarchy (2+1 Font Rule)**:
  - *UI Chrome, Clinical Headers & Labels*: **Plus Jakarta Sans** (400 Regular, 600 SemiBold, 700 Bold) with optical tracking compensation on dark monitor panels.
  - *Vital Numerics, Pump Rates, Doses, SMILES & Thresholds*: **JetBrains Mono** with `font-variant-numeric: tabular-nums` enforced across all fluctuating vitals, countdown timers, infusion rates, and physicochemical metrics to eliminate horizontal jitter.
  - *Metric Separation*: Prominent numeric readouts (`clamp(1.75rem, 2.6vw, 3rem)` on Standard view; `clamp(3rem, 4.5vw, 4.5rem)` in Big Numbers mode) paired with quiet muted unit labels (`bpm`, `mmHg`, `%`, `rpm`, `mL/h`, `mcg/kg/min`).
- **Spatial Composition & Layout Integrity**:
  - Designed for a full `1440px+` desktop clinical workstation (`100vh` locked viewport with internal scrollable popups/drawers so neither monitor nor pump dock collapses).
  - Top MX800 panel occupies **70% height** (patient/alarm header bar + sweeping multi-channel Canvas waveforms on left + aligned numeric parameter column on right + bottom SmartKey ribbon).
  - Bottom B. Braun SpaceStation occupies **30% height** (4-bay horizontal modular rack with mechanical side latches, power/CAN rail status, live syringe/drip animations, and an expandable precision keypad overlay when programming a bay so every button maintains a comfortable `>= 40px` touch target).

### Interactive Feedback & Motion
- **60 FPS Sweeping Erase-Bar Waveforms**: Real-time HTML5 `<canvas>` sweep bar with subtle phosphor persistence and anti-aliased grid lines (`25 mm/s` equivalent sweep speed), dynamically morphing QRS width, ST segment offset, dicrotic notch amplitude, and respiratory baseline with patient physiology.
- **Mechanical & Tactile Micro-Interactions (`<= 200ms`)**:
  - Holding **On/Off** renders a live 3.0-second progress bar before powering a pump module up or down.
  - Opening the Infusomat door latch or releasing a SpaceStation bay locking lever immediately triggers mechanical safety interlocks and status indicators.
  - Clearing a downstream occlusion runs a visible **anti-bolus rewind animation** before allowing infusion restart.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Sweeping Erase-Bar HTML5 Canvas vs. Scrolling DOM/SVG for Waveforms**
  - *Chosen Approach*: Dedicated `requestAnimationFrame` HTML5 `<canvas>` engine with a moving erase gap (classic bedside monitor sweep) for real-time ECG, SpO₂ Pleth, ABP, CVP, and RESP waves, paired with crisp SVG/DOM overlays for ST meters, scales, and numeric blocks.
  - *Why*: Authentic Philips IntelliVue monitors use a fixed-grid sweeping erase bar rather than shifting the entire chart leftward; Canvas delivers zero-garbage-collection 60 FPS rendering across 5 simultaneous traces while keeping numeric readouts accessible in crisp tabular DOM text.
  - *Alternatives Considered*: SVG path re-computation at 60 Hz causes layout thrashing and jagged frame drops during multi-channel alarms.
- **Decision 2: Compact Rack View + Focused Keypad Programming Drawer for B. Braun Pumps**
  - *Chosen Approach*: Within the 30% bottom dock, all 4 SpaceStation bays remain simultaneously visible (showing live syringe plunger/drip motion, LEDs, rate, VTBI, pressure bar, and quick Start/Stop + Bolus controls), while clicking **Keypad / Program** on Perfusor or Infusomat elevates an authentic full-size B. Braun tactile keypad & LCD menu bezel (`Up/Down/Left/Right`, `C`, `OK`, `Bolus`, `3s On/Off`, Drug Library, Occlusion `L1–L9`, Data Lock `9119`).
  - *Why*: Squeezing 10+ miniature buttons inside a 30%-height horizontal strip would violate the `>= 40px` accessibility target rule and cause misclicks; an inline pop-up programming faceplate preserves the 70/30 split while providing crisp, full-scale keypad ergonomics.
- **Decision 3: Direct CORS + Resilient Retry Caching for PubChem & openFDA**
  - *Chosen Approach*: Query PubChem (`pubchem.ncbi.nlm.nih.gov/rest/pug` & `pug_view`) and openFDA (`api.fda.gov/drug/label.json` & `event.json`) using an exponential-backoff `fetchWithRetry` client with in-memory session caching, backed by optional server-side `/api/openfda/*` proxy support if `FDA_API_KEY` is configured later.
  - *Why*: Both databases are public and CORS-enabled out of the box without blocking the user on an API key prompt, while session caching prevents redundant network calls when switching rapidly between pump channels and the MX800 `iPC` panel.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   CLINICAL SIMULATION & PK/PD PHYSIOLOGY ENGINE                      │
│  ┌─────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────┐  │
│  │ Hemodynamic & ECG Model │◄──┤ Effect-Site PK/PD Queue  │◄──┤ Scenario & Alarm  │  │
│  │ (HR, Rhythm, ST, ABP,   │   │ (Delayed α1/β1/V1/GABA   │   │ Arbitrator        │  │
│  │  CVP, SpO2, PI, Temp,RR)│   │  Dose-Response Curves)   │   │ (IEC Priority+Web │  │
│  └───────────┬─────────────┘   └────────────▲─────────────┘   │  Audio Synth)     │  │
└──────────────┼──────────────────────────────┼─────────────────┴─────────┬─────────┘  │
               │ 60Hz Sample Stream           │ Infusion / Bolus Deltas   │            │
               ▼                              │                           ▼            │
┌─────────────────────────────────────────────┴────────────────────────────────────────┐
│ TOP WORKSPACE (70% VH): PHILIPS INTELLIVUE MX800 PATIENT MONITOR (#111318)           │
│ ┌───────────────┬─────────────────────────────────────────┬────────────────────────┐ │
│ │ Patient &     │ Multi-Channel Sweep Canvas              │ Color-Coded Numerics   │ │
│ │ Alarm Header  │ • ECG (Lead I/II/III/V1/V5 + Arrhythmia)│ • HR + ST Meters (mm)  │ │
│ │ • Bed / Wt    │ • SpO2 Plethysmograph (Dicrotic Notch)  │ • SpO2 % + PI Bar      │ │
│ │ • *** Red /   │ • ABP (Red) & CVP (Blue) Pressure Waves │ • ABP / NBP / CVP      │ │
│ │   ** Yellow   │ • RESP Impedance Wave                   │ • RESP (rpm) & Temp    │ │
│ │ • Silence 2m  ├─────────────────────────────────────────┴────────────────────────┤ │
│ │ • Reset + Mute│ Embedded iPC Split Window (Toggleable Light Scientific Workbench)│ │
│ │               │ • Quick-Try ICU Drug Bar (Norepi, Vasopressin, Propofol, etc.)   │ │
│ │               │ • PubChem 2D Structure, CID, SMILES, MW, XLogP, TPSA, Lipinski   │ │
│ │               │ • openFDA Boxed Warnings, Dosing Label & Top FAERS Reactions     │ │
│ └───────────────┴──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MX800 SmartKeys Bar: [Layouts: Std | Big Num | Bed-to-Bed] [Alarm Limits]        │ │
│ │ [Trends: 1h/2h/4h] [Drug Calc] [Start NBP] [Zero ABP/CVP] [iPC Toggle] [Scenarios]│ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ BOTTOM DOCK (30% VH): B. BRAUN SPACESTATION 4-BAY MODULAR INFUSION RACK              │
│ ┌────────────────────┬────────────────────┬────────────────────┬───────────────────┐ │
│ │ BAY 1: PERFUSOR    │ BAY 2: INFUSOMAT   │ BAY 3: SPACECONTROL│ BAY 4: STANDBY    │ │
│ │ Syringe Pump       │ Volumetric Pump    │ Master Supervisor  │ Expansion Bay     │ │
│ │ • SVG 50mL Omnifix │ • Drip + Peristalt │ • Active Therapy   │ • Rail Bus Status │ │
│ │   Plunger Motion   │   & Door Interlock │   Matrix & Totals  │ • Latch Interlock │ │
│ │ • Rate / VTBI /    │ • Rate / VTBI / KVO│ • Quick Drug Push  │ • Battery / Mains │ │
│ │   Dose (mcg/kg/min)│ • Pressure (L1–L9) │   to iPC Monograph │   Power Toggle    │ │
│ └─────────┬──────────┴─────────┬──────────┴────────────────────┴───────────────────┘ │
│           └─────────┬──────────┘                                                     │
│                     ▼                                                                │
│      ┌────────────────────────────────────────────────────────────────────┐          │
│      │ Tactile B. Braun Keypad & LCD Menu Modal/Drawer                    │          │
│      │ [3s Hold On/Off] [Start/Stop] [Bolus] [▲▼◄►] [C] [OK]              │          │
│      │ Menus: Drug Library | Occlusion L1(75)–L9(900 mmHg) | Data Lock 1/2│          │
│      └────────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State
- **Patient & Hemodynamic State**: Patient weight (`kg`, default `75 kg`, editable in Drug Calculator/Header), baseline and current targets for `HR`, `rhythm` (`Sinus`, `VTach`, `AFib`, `Asystole`), `ST` offsets (`I`, `II`, `V5`), `ABP` (`sys`, `dia`, `map`), `NBP` (`lastSys`, `lastDia`, `lastMap`, `cuffInflating`, `timestamp`), `CVP`, `SpO2`, `perfusionIndex`, `RR`, and `coreTempC` (with `°C/°F` display unit).
- **PK/PD Effect-Site Compartments**: Each active infusion maintains a normalized effect-site concentration $C_e(t)$ governed by first-order equilibration ($\frac{dC_e}{dt} = k_{e0}(C_{\text{target}} - C_e)$) plus transient bolus impulse decay:
  - *Norepinephrine*: Raises systemic vascular resistance (`ABP Sys/Dia/MAP` $\uparrow$) with mild baroreceptor reflex `HR` modulation.
  - *Vasopressin*: Pure V1 vascular smooth muscle tone (`MAP` $\uparrow$, minimal chronotropic spike).
  - *Dobutamine*: $\beta_1$ inotropic/chronotropic drive (`HR` $\uparrow$, pulse pressure $\uparrow$, `ST` demand shift at high dose).
  - *Propofol / Fentanyl*: Sympatholysis and respiratory depression (`MAP` $\downarrow$, `RR` $\downarrow$, mild `SpO2` drift if `RR < 8`).
  - *Balanced Crystalloid (Normal Saline / Ringer's)*: Intravascular volume expansion (`CVP` $\uparrow$, preload-mediated `ABP` support).
- **Pump Channel State (`Perfusor` & `Infusomat`)**: Power state (`off`, `booting`, `on`, `poweringOff` with `holdProgress`), mechanical locks (`bayLatchLocked`, `syringeClampLocked` / `doorClosed`), disposable spec (`50 mL Omnifix` / `20 mL Omnifix` or `1000 mL IV Bag`), `drugId`, `concentration`, `rateMlH`, `doseRate`, `vtbiMl`, `volumeInfusedMl`, `kvoActive` (`1.0 mL/h` when `VTBI` reaches `0`), `linePressureMmHg`, `occlusionLevel` (`L1` = `75 mmHg` through `L9` = `900 mmHg`), `antiBolusRewinding`, `dataLockLevel` (`0`, `1`, `2`, PIN `9119`), and `batteryPct` + `acConnected`.
- **Historical Trends Buffer**: Rolling circular ring buffer recording timestamped vitals and active pump rates at regular intervals to populate the **1h, 2h, and 4h Graphical & Tabular Trends** views (pre-seeded on initial load with 4 hours of realistic post-op ICU admission history so trend views are immediately rich).
- **Bioscience Cache (`PubChem` + `openFDA`)**: Keyed by generic compound name (`norepinephrine`, `vasopressin`, `propofol`, `dobutamine`, `amiodarone`, `fentanyl`, `epinephrine`, `furosemide`), storing resolved PubChem `CID`, 2D structure PNG URL, `IUPACName`, `MolecularFormula`, `MolecularWeight`, `CanonicalSMILES`, `InChIKey`, `XLogP`, `TPSA`, `HBondDonorCount`, `HBondAcceptorCount`, `RotatableBondCount`, Lipinski/Veber pass status, plus openFDA `boxed_warning`, `indications_and_usage`, `dosage_and_administration`, `contraindications`, and top 8 FAERS `reactionmeddrapt` counts with provenance tags.

### Interactive Component & State Mapping
- **MX800 Screen Layouts**: Switching between *Standard* (5-wave + numeric column), *Big Numbers* (high-visibility 4-quadrant giant vital readouts + primary ECG/ABP traces), and *Bed-to-Bed* (split view monitoring current Bed 04 alongside neighboring ICU Bed 05 summary telemetry) instantaneously reconfigures the 70% monitor stage.
- **Alarm Limits & Acoustic Synthesizer**: Adjusting high/low thresholds in the *Alarm Limits* popup immediately re-evaluates active vitals; breaches flash red (`***` life-threatening: Asystole, VTach, extreme hypotension `MAP < 50`, `SpO2 < 85%`) or yellow (`**` threshold warning). When the user unmutes audio, a Web Audio API oscillator schedules IEC-cadence chime bursts that pause for 120 seconds upon clicking **Silence** or clear upon **Alarms Reset** once resolved.
- **B. Braun Keypad & Data Lock Enforcement**:
  - When `Data Lock Level 1` is active, attempting to edit rate/VTBI or trigger a bolus prompts for PIN `9119`, while `Start/Stop` and menu inspection remain accessible.
  - When `Data Lock Level 2` is active, disposable/syringe replacement and latch changes are additionally locked until unlocked with `9119`.
  - Navigating with `▲/▼/◄/►` highlights individual digits or menu rows on the B. Braun monochrome LCD, `C` backs out or clears edits, and `OK` commits the new rate into the PK/PD queue.
