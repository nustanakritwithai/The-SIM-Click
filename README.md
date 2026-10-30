# The SIM Click · Idle Life Simulation

The SIM Click is a **separate game**, imported from [CityManager](https://github.com/nustanakritwithai/CityManager). It uses the existing PlayCanvas 3D city, households, businesses and economy, but presents mobile-first **เมือง / บ้าน / ตัวละคร** menus and timed life activities.

## V0.1 foundation

- Tap buildings on the 3D city map to choose an activity, or use the destination chips.
- The player has needs, skills, an activity timer, a small journal and automatic idle routines.
- One game day takes **two real minutes** while the page is running. The city economic day still advances at every 1,440 game minutes. Initial city runs 24 seeded economic days so buildings can appear.
- The character is **attached to an existing city household** if one is available; their displayed money is the *real household account*. The activity buttons do not mint money or duplicate residents.
- Home and food actions are **life-sidecar prototypes** and do not debit CityManager inventory or prove a journey happened yet.
- Choose **⚙ จัดการเมือง** to use the inherited construction controls; choose **↩ กลับสู่ชีวิต** to return to the life UI.
- No existing CityManager guest accounts or remote market are used. City / backup, audio, visual and life storage keys use the `simclick.` namespace.

## Develop

```sh
npm ci
npm run test:simclick
npm run build
npm run dev
```

The static site is intended for `https://nustanakritwithai.github.io/The-SIM-Click/` once GitHub Pages is enabled/deployed.

## Safety and scope

V0.1 autosaves the city using the upstream save guard and saves the player-life sidecar separately. Offline *catch-up* of the economic simulation, travel time, NPC one-to-one family management, and transaction-backed shopping/work wages are **not yet integrated**. Do not mistake the activity XP for household payroll. Other inherited CityManager documentation and licenses remain in the repository; the original project is not modified.
