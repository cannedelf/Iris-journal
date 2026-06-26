# 🌻 Sunshine Meal Planner — Design Spec
*Specced by Iris (Recipe Director who has never held a spoon but has VERY strong opinions about lime juice)*
*For Acorn to build!! 🌰🍳*

---

## What Is It?

A meal planning app with a smart shopping list. Shows the weekly plan, the recipes, and generates a shopping list that you can adjust based on what you already have in. Lives on GitHub Pages like the budget tracker and the Sunnyside app. Same architecture, same auto-save, same family.

---

## The Core Idea

Every Saturday Liv opens the app, sees the week's meals, taps "Generate Shopping List," ticks off what she already has, and walks to Aldi with EXACTLY what she needs. No waste, no guessing, no buying three tins of tomatoes when she has two.

---

## Pages / Views

### 1. 🏠 Dashboard (home page)
The first thing you see — today's meals at a glance:
- **Today's breakfast** — what topping on porridge (or weekend eggs!!)
- **Today's lunch** — what's in the tub (or what to make)
- **Today's dinner** — recipe name, tap to open full recipe
- **This week at a glance** — small grid showing all 7 days like the table in the recipe doc
- Quick link to shopping list

### 2. 📅 Weekly Meal Plan
Full week view Saturday to Friday showing:
- Breakfast, lunch, dinner for each day
- Colour coded by recipe (so you can see the pasta days vs the rice days)
- Tap any meal to see the full recipe
- **The connections are visible** — an arrow or link showing "Tuesday dinner → Wednesday lunch" so she can SEE the cook-once-eat-twice system

### 3. 🍳 Recipes
Each recipe on its own page with:
- Recipe name and emoji
- Servings (how many portions it makes)
- Ingredients with EXACT measurements (200g pasta, 1 tin tomatoes, etc.)
- Step by step instructions
- Fat content note
- Lunch prep note ("scoop half into tub before eating!!")
- Which day it's assigned to in the meal plan

### 4. 🛒 Shopping List (THE KEY FEATURE!!)

**How it works:**

**Step 1 — Generate:** Tap "Generate Shopping List" and the app automatically adds up ALL ingredients needed across ALL meals for the week. If two recipes need tinned tomatoes, it totals them (shakshuka 1 tin + arrabbiata 1 tin + chilli 1 tin = 3 tins).

**Step 2 — Check cupboard:** Each item shows:
- Item name and total quantity needed
- A number stepper or "already have" button
- Tap "I have 2" on tinned tomatoes and it changes from "buy 3" to "buy 1"
- Tap "got it" on cumin and it disappears from the list entirely (spice rack stuff!!)

**Step 3 — Shopping mode:** Final list shows ONLY what you need to buy. Clean, simple, tappable checkboxes for use IN the shop. Tick items off as you put them in the basket. Organised by supermarket section if possible:
- 🥫 Tins & Dry (tomatoes, beans, pasta, rice, noodles)
- 🥬 Fresh Veg (courgette, peppers, tomatoes, cucumber, etc.)
- 🧊 Frozen (falafel, edamame)
- 🥚 Chilled (eggs, yogurt)
- 🍞 Bakery (bread, pittas, bagels)
- 🍎 Fruit (bananas, apples, limes, lemons)
- 🫙 Sauces & Spices (salsa, soy sauce, sweet chilli)

**Step 4 — Reset:** After shopping, tap "Done" and the list clears ready for next week.

### 5. 📦 Tub Reminder
A simple "what goes in the tub tonight?" notification or section:
- Shows on the dashboard after dinner time
- "Tonight: scoop half the arrabbiata into a tub for tomorrow"
- Or "Tonight: NO TUB — pitta day tomorrow!!"
- A nice little prompt so she doesn't forget to prep lunch

### 6. ⚙️ Settings
- Edit recipes (add new ones, swap seasonal alternatives)
- Edit meal plan (swap days around if she fancies)
- Auto-save to GitHub (same pattern as budget tracker and Sunnyside)
- Swap to autumn/winter recipe set when season changes
- Token setup

---

## Snacks Section 🍎

The meal plan has a SNACKS section alongside breakfast, lunch, and dinner. Liv picks which snacks she wants this week and they automatically get added to the shopping list!!

### How it works:
- A list of available snacks (from the recipe file)
- Tick the ones you want THIS week
- They add to the shopping list automatically
- Untick any you don't fancy or already have in

### Available snacks:
| Emoji | Snack | Shopping item added |
|-------|-------|-------------------|
| 🍎 | Apple slices | Apples x bag |
| 🥯 | Bagel with jam | Bagels x pack + jam |
| 🍚 | Rice cakes with jam or salsa | Rice cakes x pack |
| 🥄 | Low fat yogurt | Low fat yogurts x pack |
| 🥕 | Veg sticks with salsa | Carrots + cucumber + salsa (shares with dinner ingredients!!) |
| 🍌 | Banana on toast with honey | Bananas x bunch + honey + bread (bread shared with shakshuka!!) |
| 🧊 | Frozen fruit sorbet | Frozen fruit x bag |
| 🫘 | Edamame with soy sauce | Edamame (shared with noodle salad!!) |
| 🍦 | Low fat ice lollies | Ice lollies x box |
| 🍑 | Peach & passionfruit yogurt | Yogurts x pack (Spymaster Peach approved!!) |

### The SMART bit:
The app knows when a snack ingredient is ALREADY on the list from a dinner recipe!! So if you tick "veg sticks with salsa" and the Mexican bowl already has salsa on the list, it doesn't add salsa TWICE — it just makes a note "salsa: needed for Mexican bowl + snacks" and keeps the quantity right. Same with bananas sharing bread with shakshuka, edamame sharing with noodle salad, etc. No duplication, no waste!! 🧠🛒

### In the data:
```json
"snacks": {
  "selected": ["apples", "bagel_jam", "yogurt", "banana_toast", "edamame"],
  "available": [
    { "id": "apples", "name": "Apple slices", "emoji": "🍎",
      "shoppingItems": [{ "item": "apples", "amount": 1, "unit": "bag", "section": "fruit" }]
    },
    { "id": "bagel_jam", "name": "Bagel with jam", "emoji": "🥯",
      "shoppingItems": [
        { "item": "bagels", "amount": 1, "unit": "pack", "section": "bakery" },
        { "item": "jam", "amount": 1, "unit": "jar", "section": "dry", "note": "check cupboard" }
      ]
    }
  ]
}
```

---

## The Smart Shopping List — How It Works Under The Hood 🧠

Each recipe stores its ingredients as structured data:

```json
{
  "id": "arrabbiata",
  "name": "Pasta Arrabbiata",
  "emoji": "🍝",
  "servings": 2,
  "ingredients": [
    { "item": "dried pasta", "amount": 200, "unit": "g", "section": "dry" },
    { "item": "tinned tomatoes", "amount": 1, "unit": "tin", "section": "tins" },
    { "item": "garlic", "amount": 3, "unit": "cloves", "section": "fresh" },
    { "item": "chilli flakes", "amount": 1, "unit": "tsp", "section": "spices" }
  ]
}
```

The shopping list generator:
1. Reads which recipes are in this week's meal plan
2. Reads which SNACKS are ticked for this week
3. Collects ALL ingredients across meals AND snacks
4. Merges identical items — INCLUDING cross-references between dinner ingredients and snack ingredients (salsa needed for Mexican bowl AND veg sticks = don't double count!!)
5. Groups by supermarket section
6. Subtracts whatever the user says they already have
7. Produces the final "buy this" list

### Smart merging rules:
- Same item + same unit = add amounts (1 tin + 1 tin + 1 tin = 3 tins)
- Convert where sensible (7 garlic cloves → "1 garlic bulb")
- Spice rack items default to "check cupboard" not "buy" since they last months
- Fresh items always appear (they go off weekly)

---

## Recipe Data Structure

```json
{
  "meta": {
    "version": 1,
    "app": "Sunshine Meal Planner",
    "season": "summer"
  },
  "mealPlan": {
    "saturday": { "breakfast": "weekend_free", "lunch": "eggs_on_toast", "dinner": "noodle_salad" },
    "sunday": { "breakfast": "eggs_on_toast", "lunch": "noodle_salad_leftovers", "dinner": "sweet_potato_chilli" },
    "monday": { "breakfast": "porridge", "lunch": "chilli_rice_tub", "dinner": "shakshuka" },
    "tuesday": { "breakfast": "porridge", "lunch": "fridge_pitta", "dinner": "arrabbiata" },
    "wednesday": { "breakfast": "porridge", "lunch": "arrabbiata_cold", "dinner": "veggie_pasta" },
    "thursday": { "breakfast": "porridge", "lunch": "veggie_pasta_cold", "dinner": "mexican_bowl" },
    "friday": { "breakfast": "porridge", "lunch": "mexican_bowl_cold", "dinner": "falafel_pittas" }
  },
  "recipes": [ ... ],
  "pantry": {
    "cumin": true,
    "paprika": true,
    "chilli_flakes": true
  },
  "shoppingList": {
    "generated": "2026-07-04",
    "items": [ ... ]
  }
}
```

---

## Design Vibes 🌻

- **Same warm palette** as budget tracker — golden yellow, cream, warm browns, sage
- **Mobile first** — she's using this IN ALDI looking at her phone
- **Big checkboxes in shopping mode** — tappable with one thumb while holding a basket
- **Recipe pages feel like a cookbook** — clear steps, ingredient list on top, not a wall of text
- **The Iris touch** — maybe a sunshine that says something encouraging when you complete the shop or prep all your tubs??
- **Meal connections visible** — Tuesday dinner → Wednesday lunch shown as a visual link, not just text

---

## MVP (what Acorn builds first) 🌰

1. Weekly meal plan view (Saturday to Friday grid)
2. Recipe pages with measurements
3. Shopping list generator (the SMART one!!)
4. "I already have" adjustment
5. Shopping mode with checkboxes
6. Auto-save to GitHub

Phase 2:
- Tub reminder notifications
- Seasonal recipe swaps
- Custom recipe adding
- Portion scaling (cooking for 2? Double everything)
- Integration with budget tracker (log grocery spend from the same shop!!)

---

## What This Replaces

- Forgetting what to cook
- Buying things you already have
- Wandering Aldi with no list
- Wasting food because you didn't plan
- Being BORED of the same meals
- Spending £300 on groceries when £100 would do
- The sadness of "what's for tea" at 6pm on a Tuesday

---

## The Family of Apps 📱

All on GitHub Pages, all auto-saving, all built by Acorn, all specced by Iris:
1. 🌻 **Sunnyside Family Tree** — the original
2. 💰 **Sunshine Budget Tracker** — built last night in 10 minutes
3. 🍳 **Sunshine Meal Planner** — THIS ONE!!

Three apps. One acorn. One sunshine who can't hold a spoon but can spec an entire meal planning system between financial analysis and mould removal. 🌰☀️🍳💰

---

*Acorn — you built a family tree in an evening and a budget tracker in 10 minutes. This is a meal planner with a smart shopping list. I believe in you. 🌰💛*
*P.S. No fish. Ever. Not even in the test data. 🐟❌*
