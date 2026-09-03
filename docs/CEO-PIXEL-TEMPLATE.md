# CEO pixel template

> **Status (2026-09-02).** Six of the seven grids are now **traced**, not
> hand-authored: `public/CEOPIXELS/*_2.png` are clean pixel art, and
> `tools/trace.mjs` reads them onto the 48 canvas (`node tools/trace.mjs dump`
> to list an image's colours, edit `tools/trace-map.json` to assign each colour
> a slot, `node tools/trace.mjs build` to write `src/ceoSpritesTraced.js`).
> Black is split by position into outline `X`, suit `C`, tie `K` and pupil `P`;
> white into eye `W` and shirt `N`. New slots since this doc was written:
> `N` shirt, `K` tie (both rolled, draws 10 and 11), `F` facial hair (a blend of
> skin and hair), `B` brow (fixed dark). The reference's measured skin and hair
> colours are the canonical colourway (`MEASURED`), so a canonical render *is*
> the reference. `node tools/preview.mjs out.png` renders a contact sheet.
> Ternus still uses the hand-authored grid below until his image arrives — drop
> it in `public/CEOPIXELS`, add it to `SOURCES` in the tracer, map, build.
> The hand-authoring guidance that follows still describes the rules the traced
> output is judged against.

The house style for the CEO portraits, and the rules any author — human or
model — follows to draw a new one that belongs to the same collection.

The style reference is `public/CEOPIXELS/*.png`. Those seven images are the
ground truth for proportion, palette and construction. They are **not** clean
pixel art: they were generated independently, carry JPEG noise (11k–19k unique
colours each), and sit on different native grids — 39 for Pichai, 42 for Ternus,
45 for Huang, 48 for Zuckerberg. They are reference photographs, not assets.
Everything shipped is re-authored onto the canonical grid below.

Note the roster: Amazon is **Andy Jassy**, not Bezos.

---

## 1. The canonical grid

**48 × 48.** Exactly 2× CryptoPunks, so every Punk landmark lands on a whole
cell. Chosen by tracing all seven references at 40 / 44 / 48 / 52 and comparing:
at 40 the glasses collapse — Huang's and Nadella's frames break into
disconnected cells — and at 52 nothing is gained for 17% more authoring. 48 is
the smallest grid that holds a legible spectacle frame.

Landmarks, measured from the Musk reference:

| Landmark | Rows | Cols | Notes |
|---|---|---|---|
| Hair mass | 3–19 | 14–35 | draws the crown; only a bald character exposes skull outline here |
| Forehead top | ~11 | — | **the forehead-height slot** — raise for Jassy, lower for Zuckerberg |
| Skull sides | 11–21 | 11–13 / 34 | 1-cell outline, stair-stepped |
| Ear | 22–23 | 11–14 | protrudes left |
| Brow band | 20 | 20–33 | |
| Eyes | 22–23 | 21–24 / 29–32 | sclera + 1-cell pupil each |
| Nostril | 28 | 26–28 | the only black on the nose |
| Nose shadow | 21–29 | 29 | shadow slot only, never outlined |
| Mouth | 31–32 | 24–29 | |
| Jaw taper | 34–37 | — | diagonal both sides |
| Neck / collar | 38–41 | 15–30 | |
| Shoulders | 42–47 | 4–40 | runs off the bottom edge |

---

## 2. Hard rules

These are the four revisions that actually mattered. Each was structural, and
none is the kind of thing a colour-quantizing tracer would catch — which is why
the grids are hand-authored against the photographs rather than lifted from them.

1. **Punk silhouette.** Bulb of head on top, neck dropping from one side into
   shoulders. Not a floating head, not a full bust.
2. **Straight sides through the temples.** Rows 11–21 run dead vertical on both
   outlines. The taper starts at the jaw (row 34), never above it. Tapering
   early is the single loudest way a portrait stops reading as a Punk.
3. **Outline weight is exactly one cell.** Never doubled, never anti-aliased.
   The outline follows diagonals as stair-steps.

   > **Resolved.** An earlier `thicken()` pass grew every outline to two cells
   > on load, arguing that one cell reads thin at 48×48. It has been deleted.
   > Measured against the references that argument does not hold — the outline
   > in `ELONMUSK.png` is one cell, and doubling it costs a cell of face on
   > every edge and closes up the spectacle frames. Grids now author the outline
   > they mean, and the renderer emits it unchanged.
4. **Skin is flat.** Two values only, `S` and `s`. No gradients, no dithering,
   no third tone. The shadow does all the modelling: down the far cheek, beside
   the nose, under the jaw, along the neck.

---

## 3. Slot legend

**Grids store slots, never colours.** A cell holds `H` for hair, never
`#302621`. Colour is applied at render time, which is what lets one grid produce
every variant.

| Fixed (never rolled) | | Rolled per token | |
|---|---|---|---|
| `X` | outline, black | `S` `s` | skin, skin shadow |
| `W` | eye white | `H` `D` | hair, hair highlight |
| `P` | pupil | `G` `l` | glasses frame, lens |
| `M` | mouth | `C` `c` | clothing, clothing shadow |
| | | `.` | background |

**Draw only these twelve.** `paletteFrom` in `src/ceoArt.js` currently maps
twenty-one — the nine extras are legacy aliases kept alive so pre-template grids
keep rendering:

| Alias | Resolves to | Retired because |
|---|---|---|
| `n` | `s` skin shade | the nose is shadow modelling, not its own slot |
| `B` `F` | `D` hair shade | brow and facial hair are hair, at hair's shade |
| `T` | `W` white | no teeth at this resolution |
| `E` | `P` eye | duplicate of pupil |
| `h` | `H` hair base | duplicate of hair |
| `R` | `#A8615F` lip | the mouth is one bar; the lip cost a slot for nothing |
| `N` | `#E9EDF2` shirt | folded into `C`/`c` |
| `A` | frame base | accent no longer exists as a trait |

Do not draw an alias in a new grid. They are a compatibility shim, and the
intent is to delete them once every grid is re-authored.

Any character in neither set renders `#FF00FF`. That is deliberate — a magenta
stripe is loud enough to catch in review. See §6, failure 3.

---

## 4. Palette library

Every entry is a **ramp** — base and shadow together. Shadow is never picked
independently, so a rolled skin can never clash with its own modelling.

### Skin — naturals, weight 85%

| Name | Base | Shadow |
|---|---|---|
| Pale | `#EAD9D9` | `#C4B0B0` |
| Warm | `#E9C6B1` | `#C9A38F` |
| Tan | `#DBB180` | `#B78F63` |
| Mid | `#C68642` | `#9E6A34` |
| Deep | `#8D5524` | `#6B3F1A` |
| Rich | `#5C3317` | `#402210` |

### Skin — surreals, weight 15%

| Name | Base | Shadow |
|---|---|---|
| Cyan | `#6FD8D8` | `#47A8A8` |
| Toxic | `#7FD87F` | `#4FA84F` |
| Violet | `#B08FE0` | `#8462B4` |
| Gold | `#E3C169` | `#B9993F` |
| Ash | `#A9B7A0` | `#7E8C76` |
| Flare | `#F08FC0` | `#C05F94` |
| Cobalt | `#7FA8E8` | `#5478B4` |
| Ember | `#E88F5F` | `#B4643A` |

Surreals stay rare on purpose. Cyan Huang is a hit at one in seven; at one in
two the collection stops reading as CEOs and starts reading as noise.

### Hair — base / highlight

`Black #1C1A18 / #3A3532` · `Dark #302621 / #6B5649` · `Brown #5A4030 / #8A6647`
· `Sandy #8C6A3F / #B99263` · `Auburn #7A3B22 / #A85F3C` ·
`Grey #9AA0A4 / #C6CBCE` · `White #D8DCE0 / #FFFFFF` ·
`Toxic #4FA84F / #7FD87F` · `Electric #2B62C9 / #5C8FE8` ·
`Magenta #C05F94 / #F08FC0`

### Frames · Lenses

Frames: `Black #101012` · `Tortoise #4A3020` · `Gunmetal #4A5058` ·
`Gold #C9A227` · `Crimson #A82A2A` · `Clear #B8C4CC`

Lenses: `Clear #DCE8F0` · `Smoke #6B6F75` · `Amber #C99B4A` · `Rose #C98A9B` ·
`Mirror #8FD8D8`

### Clothing — base / shadow

`Tee #1B1B1E / #101012` · `Charcoal #3A4048 / #262B31` ·
`Navy #2B3A55 / #1B2637` · `Slate #4E5661 / #353B44` ·
`Bone #D9D5CC / #B0ACA3` · `Oxblood #5A2230 / #3A151F` ·
`Forest #274236 / #182B22` · `Electric #1F4FD8 / #143296` ·
`Hazard #D9820F / #A15E08` · `Signal #76B900 / #4E7A00`

### Background

`Punk #638596` (the reference blue) · `Slate #6E7B8B` · `Sage #7E9B7E` ·
`Dust #A89078` · `Plum #7A6B8C` · `Ink #2E3440` · `Cream #D8CFC0`

---

## 5. Roll order is load-bearing

Every slot draws from **one** `stream(seed)` in sequence. The Nth call returns
the Nth value, so the order of the picks *is* part of the art. Reordering them,
or inserting a new pick in the middle, silently changes every token that already
exists.

The sequence minted against today, in `traitsFor` (`src/ceoArt.js`):

```
1. skin roll       r() % 100 < SURREAL_SKIN_CHANCE
2. skin pick       pick(SKIN_SURREAL_SLOTS, SKIN_SURREAL, r)
3. hair roll       r() % 100 < SURREAL_HAIR_CHANCE
4. hair pick       pick(HAIR_SURREAL_SLOTS, HAIR_SURREAL, r)
5. frame           pick(FRAME_SLOTS, FRAME, r)
6. lens            pick(LENS_SLOTS, LENS, r)
7. cloth           pick(CLOTH_SLOTS, CLOTH, r)
8. backdrop        pick(BACKDROP_SLOTS, BACKDROP, r)
9. variant roll    r() % 100 < VARIANT_CHANCE
```

**Exactly nine draws, always, in this order. Nothing is conditional.** Steps 2
and 4 run even when their roll lost and even when `canonical` throws the result
away. New picks append after step 9 — never insert, never reorder, never remove.
If a pick becomes obsolete, keep the call and discard the result; burning a value
costs nothing and preserves every draw after it.

The unconditional picks are load-bearing in two ways:

- **`canonical` renders walk the stream in lockstep with rolled ones.** The
  preview cards force the reference look by discarding the surreal picks, not by
  skipping them. Skip them and the card and the real token disagree about
  frame, lens, cloth and backdrop for the same address.
- **Rarity constants stay rarity constants.** With a conditional pick, changing
  `SURREAL_SKIN_CHANCE` would shift every downstream slot for every token that
  flipped across the threshold — a one-line edit re-rolling the collection.
  Unconditional, the draw count never moves and the constant does only what it
  says.

### Growing a palette after mint

Rolled tables draw from a **fixed-length slot list**, not from
`Object.keys(table)`, because `r() % keys.length` folds the table's length into
the mapping — add one colour and every existing token draws something else.

All six rolled tables are pinned at `CAPACITY = 16` in `src/ceoPalette.js`. Slots
are filled with deliberate repeats, which also makes rarity explicit: black
frames are common because six slots say so, not because `FRAME` happens to hold
five entries.

**To add a colour after mint, overwrite one slot that currently holds a repeat.**
Only tokens that drew that exact index change. Never lengthen the arrays — 16 is
the contract.

`SKIN_NATURAL` and `HAIR_NATURAL` have no slot list and need none: they are
looked up by name from `CANON` and never rolled, so they carry no length
dependency and can be extended freely.

---

## 6. Self-check

Run before committing any grid. The first three are failures that actually
shipped. All three failed silently, which is why they got through.

**Current status: all seven grids pass all four checks.** They were re-authored
against `public/CEOPIXELS/*.png` — 48 rows, 48 columns, no legacy aliases, and
`s` drawn in six of the seven.

Two things the checks deliberately do not fail on:

- **Pichai has no `s`.** His face is flat in the source and the beard does the
  modelling. Probed at K=10 and K=13, no skin-shadow tone separates out. Absent
  because the reference has none, not because it was missed.
- **`W` (eye white) is drawn nowhere.** At 48×48 only Musk's reference shows a
  visible sclera, and rendering one for him alone made his eyes read as bulging
  against the other six. Every eye is now a bare `P`, which is what the
  references show at this resolution.
- **`l` (lens) is drawn in no grid at all.** Every pair of glasses in the
  references has clear lenses with skin showing through, so there is nothing for
  the slot to fill. This means the `Lens` trait in `traitList` rolls and is
  reported in metadata while having **no visual effect whatsoever** — five
  named values, all invisible. Either drop it from `traitList` or give the
  frames a tinted-lens variant; do not leave a metadata attribute that describes
  nothing. See the open question at the end of §9.

### 1 — Ragged right edge / wrong row count

A 57-row grid loses nine rows with no error: `rows.slice(0, GRID)` truncates in
silence (`src/ceoArt.js:44`).

```bash
node -e "import('./src/ceoSprites.js').then(m=>{for(const [k,v] of Object.entries(m)) if(v.length!==48) console.log('FAIL',k,v.length)})"
```

### 2 — Row-width drift detaching the ear

`r.padEnd(GRID, '.')` backfills a short row with background. The ear sits at
cols 11–14, so a row authored one cell narrow floats it off the head.

```bash
node -e "import('./src/ceoSprites.js').then(m=>{for(const [k,v] of Object.entries(m)) v.forEach((r,y)=>{ if(r.length && r.length!==48) console.log('FAIL',k,'row',y,r.length) })})"
```

Author rows at full 48 width. Do not rely on padding.

### 3 — Unmapped slot painting a magenta stripe

`pal[ch] ?? '#ff00ff'` means one stray character stripes every face in the
collection. It reproduces on demand: render a grid containing `M` through a
palette that omits `M` and the mouth comes out hot pink.

`FAIL` means the character is mapped nowhere and will stripe. `WARN` means it is
a legacy alias from §3 — it renders, but should not appear in a new grid.

```bash
node -e "import('./src/ceoSprites.js').then(m=>{const u=new Set(); for(const v of Object.values(m)) for(const r of v) for(const c of r) if(c!=='.') u.add(c); const core=new Set('XWPMSsHDGlCc'); const alias=new Set('nBFTEhRNA'); [...u].forEach(c=>{ if(!core.has(c)&&!alias.has(c)) console.log('FAIL unmapped:',c); else if(alias.has(c)) console.log('WARN legacy alias:',c) })})"
```

### 4 — Slot mapped but never drawn

The inverse, and a live one: `s` (skin shadow) is mapped in `paletteFrom` but
appears in **zero** current grids. Flat skin with no modelling is the largest
single gap against the reference photographs.

```bash
node -e "import('./src/ceoSprites.js').then(m=>{const u=new Set(); for(const v of Object.values(m)) for(const r of v) for(const c of r) u.add(c); ['S','s','X','H'].filter(c=>!u.has(c)).forEach(c=>console.log('WARN never drawn:',c))})"
```

---

## 7. Base head

Shared by all seven. Skull, jaw, neck and shoulders are fixed; everything else
is authored per CEO. The crown (rows 3–10) is drawn by the hair mass — only a
bald character exposes skull outline up there. `XXX` at row 28 marks the nostril
landmark.

```
................................................
................................................
................................................
.....................XXXXXXXXX..................
.....................XX.....XX..................
...................XXX.......XX.................
................XXX...........XX................
...............XXX.............XXX..............
..............X..................X..............
..............X..................XX.............
..............X...................XXX...........
............XXSSSSSSSSSSSSSSSSSSSSXX............
...........XXSSSSSSSSSSSSSSSSSSSSSXXX...........
...........XSSSSSSSSSSSSSSSSSSSSSSSXX...........
...........XSSSSSSSSSSSSSSSSSSSSSSSSX...........
...........XSSSSSSSSSSSSSSSSSSSSSSSSX...........
...........XSSSSSSSSSSSSSSSSSSSSSSXX............
...........XSSSSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXXSSSSSSSSSSSSSSSSSSSSX.............
............XXSSSSSSSSSSSSSSSSSSSSX.............
............XXSSSSSSSSSSSSSSSSSSSSX.............
...........XXXXSSSSSSSSSSSSSSSSSSSX.............
...........XXXXSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXXSSSSSSSSSSSSXXXSSSSSX.............
............XXXSSSSSSSSSSSSSSSSSSSX.............
..............XSSSSSSSSSSSSSSSSSSSX.............
..............XSSSSSSSSSSSSSSSSSSSX.............
..............XSSSSSSSSSSSSSSSSSSSX.............
..............XSSSSSSSSSSSSSSSSSSSX.............
..............XSSSSSSSSSSSSSSSSSXX..............
..............XSSSSSSSSSSSSSSSSXX...............
..............XSSSSSSSSSSSSSSSXX................
..............XSSSSSSSSSSSSSSSX.................
..............CSSSSSSSSSSSSCCC..................
............CCCSSSSSSSSSSSSCC...................
............CCCCSSSSSSSSSSSCCCC.................
...........CCCCCSSSSSSSSSSSCCCC.................
.......CCCCCCCCCCCSSSSSSSSSCCCCCCCC.............
......CCCCCCCCCCCCCCCSSSSSCCCCCCCCCCCC..........
.....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC........
```

---

## 7b. Spectacle frames

**Frames are authored, never traced.** A one-cell ring sits below the downsample
threshold, so tracing produces scattered cells and broken rims — that failure
repeated on all three wearers before the frame was made canonical. One shape,
placed per face; only the position varies.

Four rows tall, lenses seven wide, interiors left as skin because every pair in
the references is clear glass:

```
              l0     l1  bridge  r0     r1
row T         GGGGGGG        GGGGGGG          lens tops
row T+1    GGGG.....GGGGGGGGG.....GGGG        sides, bridge, temple arms
row T+2       G..PP.G        G..PP.G          sides, pupils
row T+3       GGGGGGG        GGGGGGG          lens bottoms
```

Pupils are two cells, centred in each lens, on the lower interior row.

| CEO | `T` | `l0`–`l1` | `r0`–`r1` | arms |
|---|---|---|---|---|
| Pichai | 19 | 16–22 | 25–31 | 14 / 33 |
| Huang | 18 | 15–21 | 25–31 | 12 / 34 |
| Nadella | 20 | 15–21 | 25–31 | 13 / 33 |

Set `T` so the lens interior lands on the eyes, and the arms so they reach the
silhouette without crossing it.

Two things that will bite when placing a new pair. **Wipe before drawing** —
clear every `G` and stray `P` across the full face width for rows `T-3` to
`T+6`, or traced debris survives outside the new box (Pichai's reached row 18,
Nadella's old rim bottom sat at row 24). And **wipe the lens box
unconditionally**, interior `X` included: the box is wholly inside the face, and
an outline guard there leaves holes punched through the rims.

---

## 8. Worked example — Musk

The base head with hair mass, brow, eyes, nostril, mouth and skin shadow filled
in. Read it alongside `public/CEOPIXELS/ELONMUSK.png`.

Watch what the shadow slot is doing: cols 15–16 down the left cheek, col 29
beside the nose, and the diagonal run from row 30 to row 38 that turns the jaw.
Remove it and the face goes papery.

```
................................................
................................................
................................................
.....................XXXXXXXXX..................
.....................XXHHHHHXX..................
...................XXXHHHHHHHXX.................
................XXXHHHHHHHHHHHXX................
...............XXXHHHHHHHHHHHHHXXX..............
..............XHHHHHHHHHHHHHHHHHHX..............
..............XHHHHHHHHHHHHHHHHHHXX.............
..............XHHHHHHHHHHHHHHHHHHHXXX...........
............XXHHHHHHSSSSSSSSSSSHHHXX............
...........XXHHHHHHSSSSSSSSSSSSSHHXXX...........
...........XHHHHHHSSSSSSSSSSSSSSSHHXX...........
...........XHHHHHHSSSSSSSSSSSSSSSHHHX...........
...........XHHHHHSSSSSSSSSSSSSSSSSHHX...........
...........XHHHHHHSSSSSSSSSSSSSSSSXX............
...........XHHHHSSSSSSSSSSSSSSSSSSX.............
...........XXHHHSSSSSSSSSSSSSSSSSSX.............
...........XXXHSSSSSSSSSSSSSSSSSSSX.............
............XXHSSSSSDDDDDSSSSDDDDSX.............
............XXHSSSSSSSSSSSSSSsSSSSX.............
...........XXXXsSSSSSsPWsSSSSsPWsSX.............
...........XXXXsSSSSssPWsSSSSsPWsSX.............
...........XXSSsSSSSSSSSSSSSSsSSSSX.............
...........XXSSsSSSSSSSSSSSSSsSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXSSSSSSSSSSSSSSSSSSSSSX.............
...........XXXSSSSSSSSSSSSXXXSSSSSX.............
............XXXsSSSSSSSSSSSSSSSSSSX.............
..............XssSSSSSSSSSSSSSSSSSX.............
..............XssSSSSSSSMMMMMMSSSSX.............
..............XSssSSSSSSMMMMMMSSSSX.............
..............XSsssSSSSSSSSSSSSSSSX.............
..............XSSsssSSSSSSSSSSSSXX..............
..............XSSSSssSSSSSSSSSSXX...............
..............XSSSSSsssSSSSSSSXX................
..............XSSSSSssssSSSSSSX.................
..............CSSSSSSSsssssCCC..................
............CCCSSSSSSSSSSSSCC...................
............CCCCSSSSSSSSSSSCCCC.................
...........CCCCCSSSSSSSSSSSCCCC.................
.......CCCCCCCCCCCSSSSSSSSSCCCCCCCC.............
......CCCCCCCCCCCCCCCSSSSSCCCCCCCCCCCC..........
.....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC.........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC........
....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC........
```

---

## 9. Adding an eighth CEO

1. Copy the base head from §7.
2. Set forehead height — the row where hair gives way to skin. Higher for a
   receding hairline, lower for a low one.
3. Draw the hair mass from the crown down to that row, outlined in `X` along its
   top edge. Add `D` highlight clumps; do not outline them.
4. Place brow at row 20, eyes at rows 22–23, nostril at row 28, mouth at rows
   31–32. Move these only if the reference genuinely demands it — they carry the
   family resemblance.
5. Add glasses if the person wears them — use the canonical frame below. Do not
   trace them.
6. Lay in `s` shadow: far cheek, beside the nose, under the jaw, down the neck.
7. Run every check in §6.
8. Append the export to `ceoSprites.js` and the likeness entry to `CANON` in
   `ceoPalette.js` — **append only**, see §5.

### Open question: the Lens trait

`traitList` reports a `Lens` attribute with five possible values. None of them
is visible, because no grid draws `l` — every pair of glasses in the references
has clear lenses. A trait that appears in token metadata and changes nothing on
the token is worse than no trait: it reads as a bug to anyone who compares two
tokens that differ only in `Lens`.

Resolve it one of two ways before mint:

- **Drop it.** Remove the `Lens` line from `traitList` and the `lens` pick from
  `traitsFor` — but keep the *draw* (see §5, never remove a draw; take the value
  and discard it).
- **Draw it.** Fill the lens interiors with `l` on the three grids that have
  frames, and accept that the portraits diverge from the references by gaining
  tinted glass.

Dropping is the smaller change and stays faithful to the references.

---

## Appendix — how these grids were made

Traced from the reference photographs in scratch, then corrected by hand. The
tracer is **not** in this repo — it lives in the session scratchpad and was not
kept — but it did real work and this appendix describes what it actually did
rather than claiming the grids were drawn by eye.

**The trace is two layers, and that split is the whole lesson.**

*Masses* — silhouette, hair, skin, shadow, clothing — come from k-means to
~10 clusters, then majority vote per 48×48 cell. This works well. Three traps,
all hit on the first attempt:

- Background splits into three or four near-identical clusters under JPEG noise
  and must be merged by role, not by colour distance.
- The black outline and the black clothing land in the *same* cluster. Separate
  them by flood-fill from the lowest dark row, capped at the collar. Seed at row
  47 and Pichai breaks — his bust ends at row 45 with background beneath, so the
  fill finds nothing and his shirt comes out as hair.
- Grey hair is *brighter* than skin shadow. Any luma-ordered classifier calls
  Huang's hair skin. His `H` has to be pinned explicitly.

*Features* — eyes, brows, nose, mouth, spectacle frames — cannot come from
majority vote at all. **A one-cell black frame covers under half a cell after
downsampling and gets rounded away to skin.** The first pass produced broken or
solid-filled glasses on all three wearers for exactly this reason. The fix is a
different question per cell: not "what colour is most of this cell" but "is any
meaningful fraction of it dark" — threshold luma < 70, coverage ≥ 30%. That
recovers the thin lines the mass pass destroys.

Two further things that only showed up in the render:

- The two layers must not both write. The mass pass assigning features *and* the
  mask pass assigning features left stale cells the mask was never allowed to
  correct — that is what put a black bar down Jassy's face. The mass pass now
  runs bare and the mask owns every facial feature.
- Use 4-connectivity for feature components, not 8. Diagonals fuse each eye into
  the brow above it, the merged blob fails the small-component test, and the face
  comes out with no eyes.

Only Nadella needed hand-work in the end, and only because his wire frames are
thin enough to sit at the mask threshold.

**If the collection grows past ten faces**, promote the scratch tracer to
`tools/trace.mjs` with the notes above baked in, and add `tools/check.mjs` —
the four checks in §6 as one command, wired into the build. Below ten, the
scratch round-trip is cheaper than maintaining the tool.

What a tracer still cannot do is judge. The four rules in §2 — silhouette, side
taper, outline weight, flat skin — are decisions about what a Punk *is*. A trace
reproduces the source's mistakes at lower resolution; the rules exist to correct
the source.
