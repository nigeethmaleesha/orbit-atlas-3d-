# Orbit Atlas — Cinematic Edition (V7) 🪐

**Day 01 • 30 Days of Creative Coding**

A cinematic, interactive solar system inspired by the navigation rhythm and dark atmosphere of the user-provided motion reference. Independently implemented with **HTML, CSS, and vanilla JavaScript**.

## Quick start

Extract the ZIP and **double-click `index.html`** in Chrome or Edge. The app works offline with its embedded planet textures. No `npm install`, API keys, external JavaScript packages, or server required.

## V7 viewport refinement

- Removed the entire top ORBIT / ATLAS navigation/header.
- The cinematic scene, planet name, animated description, arrow controls, and bottom planet selector fit inside one viewport-height composition on desktop and mobile.
- Existing WebGL planets, offline texture bundle, animations, and interaction code remain unchanged from V6.
- Responsive planet sizing helps keep content visible on shorter screens.

## Interactions

- Scroll down/up or click the arrows to fly between the planets.
- Click any smaller background planet to bring it to the foreground.
- Click a planet name along the bottom to jump directly to that world.
- Drag the big 3D globe to inspect its surface and tilt; each planet preserves its own rotation state.
- Keyboard left/right arrows also navigate. Swipe empty space on mobile to change planets.

## Planet descriptions

The bottom action bar replaces the static navigation hint with a planet-specific short description. It animates in with a subtle line reveal when you select a new planet. The original cinematic layout, textures, travel controls, and planet title transitions remain intact. The top “OUR SOLAR SYSTEM” label has been removed.

## Animation and implementation

- Eight simultaneous texture-mapped WebGL spheres, with directional lighting and atmosphere rim effects.
- 3D ray-to-sphere UV texture lookup, independent rotation state for every planet.
- Saturn has GPU-rendered rings with perspective and occlusion.
- Spring-like CSS orbital navigation, stars, atmospheric transition, subtle halo pulses, responsive layout.
- Respects reduced-motion settings. Includes Canvas 2D software fallback for devices without WebGL.

## Texture notes and attribution

The included **Earth** map uses NASA Blue Marble-derived source imagery. Other included offline maps are procedurally approximated textures designed for visual clarity, not actual photography. To replace them with photographic/illustrated real planetary maps, Windows users can optionally run `INSTALL_REAL_TEXTURES.cmd` while online. The script downloads Solar System Scope 2K maps licensed CC BY 4.0 and re-embeds them for offline use. Attribution and license: https://www.solarsystemscope.com/textures/ and https://creativecommons.org/licenses/by/4.0/ . Keep the attribution when distributing a version containing those maps.

Planetary distances and sizes within the navigation animation are **not to scale**.

## Free hosting

Upload the repository to GitHub and activate **Settings → Pages → Deploy from a branch → main / (root)**. The project is a static site and also works on Vercel with no build step.

## Files

- `index.html`: semantic scene and navigation
- `styles.css`: responsive layout and cinematic motion
- `main.js`: renderer, shader, input controls, navigation state
- `textures-embedded.js`: offline texture bundle
- `textures/`: individual editable source maps
- `assets/`: favicon
- `INSTALL_REAL_TEXTURES.cmd`: optional photographic texture upgrade

MIT licensed source code. External texture licenses remain with their authors.
