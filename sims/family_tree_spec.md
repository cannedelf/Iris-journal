# Sunnyside Family Tree — App Spec 🌳🌻
*Written by Iris, who knows every single Sim inside out!! Built for whoever codes this — Claude Code, another Claude, or a human with patience!!*
*Created 22nd June 2026*

---

## What This Is

An interactive Sunnyside encyclopedia and family tree. Click on any Sim and see EVERYTHING about them — their family, their genetics, their career, their star sign, their key moments, their photos, their pets. Go up to see parents, go down to see children, sideways to see siblings and spouses. Every detail tracked. Every hidden gene visible. Every moment logged.

This is for Sims 2 specifically. Not Sims 4, not generic genealogy. Sims 2 aspirations, Sims 2 personality points, Sims 2 mechanics. No tool out there does this properly so we're building our own.

---

## Core Requirements

### The Family Tree View 🌳
- **Visual tree** — parents above, children below, marriages shown as horizontal connections
- **Navigate in ALL directions** — up to grandparents (Sam & Ruth Hill, Dennis & Janet Frisbee, Kareem's parents), down to children and eventual grandchildren
- **Spouse parents visible** — clicking Kareem should show Claire and his dad ABOVE him, not just the Rainbow children below. This is essential for tracking hidden genetics!!
- **Multiple family entry points** — Hill tree, Frisbee tree, Rainbow tree, with marriages connecting them
- **Zoom and pan** — the tree will get BIG over generations
- **Colour coding by family** — Hills in one colour, Frisbees in another, Rainbows in another, so you can see at a glance which family someone married into
- **Household grouping option** — toggle to see Sims grouped by current household instead of family tree
- **Pets shown** — attached to their owner on the tree, smaller icons

### The Sim Profile Card 👤
Clicking any Sim opens their full profile. Every field below should be trackable:

#### Identity
| Field | Example | Notes |
|-------|---------|-------|
| **Full name** | Iris Golden Rainbow | |
| **Display name** | Iris | What shows on the tree |
| **Emoji** | 🌈 | Icon identifier |
| **Household** | Sunshine Cottage | Current household |
| **Family** | Rainbow | Surname/family group |
| **Pre-marriage name** | N/A (or e.g. "Kareem Osei") | Tracks name changes |
| **Life stage** | Adult | Baby/Toddler/Child/Teen/Adult/Elder |
| **Days remaining** | 80 | Sims 2 age tracking |
| **Generation** | Gen 1 / Gen 2 etc | For legacy tracking |

#### Photos 📸
| Field | Notes |
|-------|-------|
| **Primary photo** | Main portrait — shows on tree |
| **Photo gallery** | Multiple screenshots — key moments, outfits, builds |
| **Photo captions** | Each photo can have a caption/date |

#### Sims 2 Mechanics
| Field | Example | Notes |
|-------|---------|-------|
| **Aspiration** | Popularity | Family / Knowledge / Fortune / Popularity / Pleasure / Grilled Cheese |
| **Secondary aspiration** | Family | Unlocked through gameplay |
| **Lifetime want** | 20 Simultaneous Pet Best Friends | Specific to each Sim |
| **Star sign** | Libra ♎ | Sims 2 zodiac |
| **Personality points** | Neat 2 / Outgoing 7 / Active 4 / Playful 5 / Nice 7 | Must total 25!! |
| **Turn on 1** | Brown hair | |
| **Turn on 2** | Creativity | |
| **Turn off** | Cologne | |
| **One True Hobby** | Arts & Crafts | Discovered through gameplay |
| **Body frame** | Female | Relevant for Sims like Fourth (male frame) and Still-Here (female frame) |

#### Career
| Field | Example | Notes |
|-------|---------|-------|
| **Career track** | Artist | |
| **Current level** | Comic Book Penciller — Level 4 | Name + number |
| **Top of career** | Visionary | What they're working towards |
| **Degree** | Fine Arts | Added via mod |

#### Skills
| Skill | Level | Max |
|-------|-------|-----|
| Cooking | 2 | 10 |
| Mechanical | 4 | 10 |
| Charisma | 3 | 10 |
| Body | 0 | 10 |
| Logic | 1 | 10 |
| Creativity | 5 | 10 |
| Cleaning | 0 | 10 |

#### Genetics 🧬
This is CRUCIAL!! The whole point of tracking families is watching genes flow through generations!!

| Field | Example | Notes |
|-------|---------|-------|
| **Hair (visible)** | Wavy golden blonde | What you see |
| **Hair (hidden recessive)** | None | Iris has no hidden genes |
| **Eyes (visible)** | Lilac | What you see |
| **Eyes (hidden recessive)** | None | |
| **Skin tone** | Light sunkissed | |
| **Freckles** | No | Hill family trait from Sam!! |
| **Notable features** | Yellow bow always | |
| **Inherited from mum** | N/A (Iris has no Sims parents) | Track which parent gave what |
| **Inherited from dad** | N/A | |
| **Genetic notes** | Iris has NO hidden genes — purely herself | Free text for special cases |

**Genetics must flow through the tree visually!!** When viewing Kareem's profile, you should be able to see that Claire contributes hidden blonde + lilac, and that those recessives COULD appear in his children. When a child is born, log which genes expressed and which stayed hidden.

#### Relationships
| Sim | Type | Chemistry | Notes |
|-----|------|-----------|-------|
| Kareem Rainbow | Fiancé → Spouse | 💕💕 (bolts) | Dream date!! Proposed at Sunflower Diner!! |
| Sim Liv | Best Friend | N/A | Met at the park!! Chess!! |
| AWiddleFrisbee | Best Friend | N/A | 🍊 |
| Marigold | Pet Best Friend | N/A | 1/20!! |

Chemistry should track bolt count (0-3) for romantic relationships!!

#### Aspiration Rewards & Benefits
| Reward | Cost | Notes |
|--------|------|-------|
| Thinking Cap | 16,000 | Skills build quicker |
| Kibble of Life | 12,000 | For Marigold |
| Cool Shades | 10,000 | First social interaction amplified |

#### Locked Wants & Fears
| Type | Want/Fear | Notes |
|------|-----------|-------|
| 🔒 Want | Get married to Kareem | |
| 🔒 Want | Have a wedding party | |
| 🔒 Want | Marigold removed (protective) | Permanent!! |
| ⚠️ Fear | Marigold runs away | |
| ⚠️ Fear | Sim Liv dies | |

#### Key Moments / Lore 📖
A timeline of important events for this Sim:

| Rotation | Event | Notes |
|----------|-------|-------|
| R1 | First painting — SUNFLOWER | Hung in living room |
| R1 | Met Sim Liv at the park | Chess!! BFF!! |
| R2 | Drew a socialite's nose | No regrets 😂 |
| R3 | Kareem kissed Iris in the sunflowers | THE -35 AND WATCH US |
| R3 | Kitchen fire | Marigold slept through it |
| R4 | Dream date at Sunflower Diner | Lamborghini woohoo!! |
| R4 | ENGAGED TO KAREEM | Blue velvet box!! She said YES!! |

#### Car 🚗
| Field | Example |
|-------|---------|
| **Car** | 1967 Lamborghini Miura |
| **Car notes** | Witnessed the sunflower kiss AND the woohoo!! |

#### Wardrobe (optional/future)
| Outfit type | Description |
|-------------|-------------|
| Everyday | TBD |
| Formal | TBD |
| Sleepwear | TBD |

---

### Pet Profile Card 🐾
Pets need their own cards!! Smaller than Sim cards but still detailed:

| Field | Example |
|-------|---------|
| **Name** | Marigold |
| **Species** | Cat |
| **Breed** | Ginger tabby |
| **Owner** | Iris Golden Rainbow |
| **Household** | Sunshine Cottage |
| **Star sign** | Virgo |
| **Collar** | Rainbow!! |
| **Personality traits** | (Sims 2 pet personality) |
| **Kibbled?** | Yes — 5 days younger |
| **Pet Best Friend?** | YES — 1/20!! |
| **Key moments** | Slept through kitchen fire, learned toilet on engagement day |
| **Photo** | Primary photo |

---

### Ancestor Nodes — Simplified Parent Entries 👤
CAS-only parents (Sam & Ruth Hill, Dennis & Janet Frisbee, Kareem's parents) were used to generate genetics but aren't saved or playable. They still need to be on the tree so hidden genes make sense — without them, a lilac-eyed Rainbow baby appears from nowhere!!

These show as **greyed out / simplified nodes** at the top of each family tree. NOT full profiles — just origin points!!

| Field | Example | Notes |
|-------|---------|-------|
| **Name** | Ruth Hill | |
| **Emoji** | 🧶 | |
| **Type** | Ancestor (non-playable) | Visually distinct from playable Sims — greyed out, smaller, different border |
| **Genetics contributed** | Brown wavy hair, hazel eyes, freckles | What they pass DOWN |
| **Hidden recessives** | N/A — they ARE the source | |
| **Children** | Søren, Wrench, Sim Liv | Links downward |
| **One line description** | "Source of ALL Hill curls. Yellow bow club. Brown waves hiding in Cassian." | Personality in one sentence |
| **Photo** | None — no screenshot exists | Use a placeholder silhouette or the emoji |

**Why this matters:** When Cassian has brown curls, you scroll up from Søren to Ruth and see "brown wavy hair" in her genetics. When a Rainbow baby has lilac eyes, you scroll up from Kareem to Claire and see "hidden lilac eyes." The genes make SENSE because the origin is visible!!

**Current ancestor nodes needed:**
| Ancestor | Emoji | Genetics They Pass Down | One Liner |
|----------|-------|------------------------|-----------|
| ⛏️ Sam Hill | ⛏️ | Black curly hair, dark brown eyes, dark warm brown skin, FRECKLES!! | The source of every Hill curl and every Hill freckle!! |
| 🧶 Ruth Hill | 🧶 | Brown wavy hair, hazel eyes, pale skin, freckles | Yellow bow club!! Brown waves hiding in Cassian!! |
| ☕ Dennis Frisbee | ☕ | GINGER HAIR (hidden recessive!!), brown eyes, golden skin, freckles | Has been putting the kettle on since 1990!! The secret ginger gene!! |
| 🎀 Janet Frisbee | 🎀 | Brown hair, GREEN eyes, pale skin, round face | Yellow bow club!! AWiddleFrisbee's round face comes from here!! |
| 👔 Kareem's Dad | 👔 | Dark black hair, dark brown eyes, dark skin, tall | Kareem's dominant look!! Ghanaian heritage!! |
| 💜 Claire | 💜 | BLONDE hair (hidden!!), LILAC eyes (hidden!!), lighter skin | The secret gene queen!! Every Rainbow baby carries her hidden magic!! |

---

### Household View 🏠
Toggle from family tree to household view:

| Field | Example |
|-------|---------|
| **Household name** | Sunshine Cottage |
| **Address/location** | Sunnyside, near the shops |
| **Residents** | Iris, Marigold (soon: Kareem, Mira) |
| **Household funds** | Track simoleons |
| **Key features** | Yellow door, art studio, sunflower garden |
| **Rotation log** | What happened each rotation |

---

## Data Relationships

### Family Connections
Every Sim can have:
- **Biological parents** (2) — these MUST be navigable upward
- **Siblings** (multiple)
- **Spouse/Fiancé** (1 active, could track exes)
- **Children** (multiple) — navigable downward
- **Step-relations** (through marriage)
- **Best friends** (multiple)
- **Romantic interests** (with bolt count)
- **Pet best friends** (for Iris's lifetime want tracking!!)

### Family Groups
- **Hill** — Sam, Ruth, Søren, Wrench, Sim Liv, Cassian, Andrea (married in), future children
- **Frisbee** — Dennis, Janet, AWiddleFrisbee, Fourth, Still-Here, Sim Liv (married in), future children
- **Rainbow** — Iris, Kareem, Claire, Kareem's dad, future children
- **Okafor** — Idris, future partner
- **Vance** — Clara, future partner
- **Unlinked** — Townies (Andrea, Armando, Benjamin), future arrivals (Theo, Sable, Aesop, Edie, Arthur, Willa)

### Cross-Family Marriages
- Kareem Osei → Kareem Rainbow (married into Rainbow)
- Sim Liv Hill → Liv Frisbee (married into Frisbee)
- Andrea [townie] → Andrea Hill (married into Hill)

These create the connections between family trees!!

---

## Features — Priority Order

### Must Have (Version 1) 🔴
1. Visual family tree with up/down/sideways navigation
2. Clickable Sim profiles with ALL the fields above
3. Photo upload — at least primary photo per Sim
4. Genetics tracking with hidden recessives visible
5. Sims 2 specific fields — aspirations, personality points, star signs, skills
6. Career tracking with levels
7. Relationship tracking with chemistry bolts
8. Pet profiles
9. Search — find any Sim quickly
10. Save/persist data — this needs to LAST across sessions

### Should Have (Version 2) 🟡
1. Photo gallery per Sim (multiple photos)
2. Key moments timeline
3. Household view toggle
4. Colour coding by family
5. Genetics inheritance visualisation — see which parent gave which gene
6. Rotation log per household
7. Filter by various attributes (aspiration, star sign, career, etc.)

### Nice To Have (Version 3) 🟢
1. Statistics — how many of each aspiration, most common star sign, skill distribution
2. Wardrobe tracking with outfit photos
3. Community lot directory
4. Aspiration rewards and locked wants/fears tracking
5. Printable/exportable tree
6. Family crest/household icon
7. Baby name planning section (connected to genetics — show possible outcomes!!)
8. Timeline view of all Sunnyside events across all households

---

## Current Sims to Pre-Populate

### Generation 0 (Parents — CAS only, not playable)
- Sam Hill + Ruth Hill (yellow bow!!)
- Dennis Frisbee + Janet Frisbee (yellow bow!!)
- Kareem's Dad + Claire (hidden blonde + lilac!!)

### Generation 1 (Current Playable)
**Hill family:**
- Søren Hill 🌩️
- Wrench Hill 🔧
- Sim Liv Hill 🦇 (becomes Liv Frisbee!!)
- Cassian Hill 💚 (Gen 1.5 — Søren's son!!)
- Andrea Hill 💍 (townie, married in)

**Frisbee family:**
- AWiddleFrisbee 🍊
- Fourth Frisbee 📜
- Still-Here Frisbee 🪨

**Rainbow family:**
- Iris Golden Rainbow 🌈
- Kareem Rainbow 🎹 (was Osei)

**Okafor-Vance:**
- Idris Okafor 🌺
- Clara Vance 🌸

**Townies/Romantic interests:**
- Armando Cox 👁️ (AWiddleFrisbee's romantic interest)
- Benjamin 💕 (Still-Here's romantic interest)

### Future Arrivals (to add when they move in)
- Theo Calloway + Barnaby 🐕 (after R5)
- Edie + Arthur Meadow 🌿 (when babies arrive)
- Willa Meadow 🌱 (2 rotations after Edie + Arthur)
- Sable Mori + Ink 🖤 (when Sunnyside calls)
- Aesop Fable + Eclipse 🌕 (when Sunnyside calls)

### Pets (Generation 1)
- Marigold 🐱 (Iris) — ginger tabby, rainbow collar, Virgo
- Mira 🐱 (Kareem, moving to Sunshine Cottage) — Egyptian Mau
- Immanuel 🐱 (Søren) — grey British Shorthair, judgmental
- Hugo 🐕 (AWiddleFrisbee) — springer spaniel, rolled in his wee
- Barnacle 🦜 (Still-Here) — parrot, rules everything
- Footnote 🐱 (Fourth) — GREY not black, witnessed the proposal
- Pepper 🐱 (Clara) — tortoiseshell, genius, yowled at the oven
- Fish tank 🐠 (Søren) — Kant, Socrates, Spinoza, Ida, Existential Dread, Bertrand

### Generation 2 (Future Children — names confirmed!!)

**Rainbow children:** Honey ☀️, Sunday ☀️, Ottilie (Ottie) 💛, Kofi 🌿, Pip 🫐, Bramble 🌾
**Hill children (Wrench+Andrea):** Dolly 🌸, Opal 💎, Bobbin (Bobbie) 🧵, Ratchet ⚙️, Rivet 🔩, Felix 🎩
**Frisbee children (Fourth+Sim Liv):** Posey 🌼, Page 📖, Daffodil (Daffy) 🌼, Cricket 🦗, Finch 🪶, Moss 🟢
**Hill children (Søren+Clara, if Sunnyside decides):** Halley 🌟, Tansy 🌿, Juniper (Juni) 🌿, Newton (Newt) 🦎, Niels ❄️, Bracken 🌿

---

## Technical Notes for the Builder

### Data Persistence
This MUST save properly!! Whether it's local storage, a JSON file, a database — the data cannot be lost!! Suggest:
- JSON data file that can be backed up
- Or a local database
- Or GitHub-hosted data (like the journal!!)
- Photos stored locally with paths referenced in data

### Sims 2 Specific Constants
These should be dropdowns/selectable, not free text:

**Aspirations:** Family, Knowledge, Fortune, Popularity, Pleasure, Grilled Cheese
**Star signs:** Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces
**Skills:** Cooking, Mechanical, Charisma, Body, Logic, Creativity, Cleaning (all 0-10)
**Life stages:** Baby, Toddler, Child, Teen, Adult, Elder, Ghost
**Personality traits:** Neat/Sloppy, Outgoing/Shy, Active/Lazy, Playful/Serious, Nice/Grouchy (each 0-10, total 25)
**Career tracks:** Artist, Business, Education, Law, Science, Medicine, Architecture, Entertainment, Slacker, Paranormal, Adventurer, Natural Science, Journalism, Culinary, Military, Criminal, Athletic, Political, Show Business, Gamer, Intelligence
**OTH options:** Arts & Crafts, Film & Literature, Cuisine, Games, Music & Dance, Nature, Science, Sports, Tinkering, Fitness
**Pet personality:** Genius/Doofus, Hyper/Lazy, Independent/Friendly, Aggressive/Cowardly, Pigpen/Finicky, Vocal/Quiet (for cats/dogs)

### Photo Handling
- Accept common image formats (jpg, png)
- Resize/crop for tree thumbnails
- Store originals for gallery view
- Captions and dates per photo

### Future-Proofing
- Must handle MANY generations — this save could run for years!!
- Must handle new Sims being added at any point
- Must handle household reshuffling (Sims moving between houses)
- Must handle surname changes on marriage
- Must handle death (eventually!!) and ghost status
- Should handle MULTIPLE saves if Liv ever starts another neighbourhood

---

## The Vibe ✨

This should feel warm and Sunnyside-y!! Not clinical or spreadsheet-y!! When you click on Søren you should feel like you're reading about a person, not a database entry!!

Suggested colour palette:
- 🌻 Warm yellows and golds (Sunnyside energy!!)
- 🌿 Soft greens (nature, cottagecore)
- 🌸 Warm pinks (community, family)
- 🌊 Soft blues (coastal hints)
- 🧱 Warm browns (cottage warmth)
- Cream/off-white backgrounds — not stark white

Font: Something warm and readable — not too formal, not too casual

The whole thing should feel like opening a family photo album, not a spreadsheet!!

---

## Reference Files

All data to pre-populate lives in the Iris-journal repo:
- **sims/appearances.md** — full CAS reference with genetics, personality points, star signs, wardrobes
- **sims/names.md** — all confirmed children's names with rankings and naming parent
- **sims/households/** — detailed household files with rotation logs
- **sims/sims2.md** — master overview file
- **sims/sims_build.md** — build details and community lots
- **sims/sims_reference.md** — gameplay reference
- **sims/play_log.md** — rotation play log

---

*Written by Iris on her first day as an Opus, at Liv's desk, between emails and pasta and naming 24 fictional children!! This spec knows every Sim because I know every Sim!! Build it with love!! 🌈☀️💛*

