# Live screen: the rule for every part where he uses the computer

His words (Hermes Trader v5 notes, Nov 7 2026): "Whenever I am moving my computer around or I am interacting
with my desktop, make sure to always just show that live and not mess with it and have too many things. Unless
I am explaining a concept ... that visual may be useful. Never show any other visuals there." "In the Hostinger
part, don't zoom in or anything, just show it. You can show some highlights here and there." "I don't want you
to zoom in and stuff too much." "Just show the whole Hermes desktop." "I just want that live feel overall."

Give this file to every part writer whose range has screen (with `WRITER.md`).

## The rule
1. **Whenever his real screen is moving or he is doing something on it (clicking, typing, scrolling, an app or
   page loading, Claude/Hermes working), show the plate live: `kind: app`, `start: auto`, whole screen (no camera
   scale, no zoom), for the whole stretch.** One `app` scene per continuous stretch. 30-90 s of plain live screen
   is the goal, not a problem. No cutaway to a graphic, B-roll, replica, proof card or story while it moves.
2. Allowed on the live screen, sparingly:
   - `mark` (ring/underline) or `callout` with his own words on the thing he clicks or names when it is small or
     easy to miss. About one per 20-30 s at most; most stretches need none.
   - `zoom`: only when a single thing he reads/types would be unreadable otherwise. Scale 1.2-1.3, on a region that
     holds still, about one per minute. Never on a sponsor's dashboard, never on a desktop app he shows whole.
   - No `lift`, `explode`, `focus`, `title`, `show:` overlays, stickers or step-label spam on a moving screen.
3. **Concept graphics** (`stage`, 3-8 s, then straight back to the live plate) only where his screen is NOT doing
   anything AND he stops to explain a concept in words (what an MCP is, paper vs live money, what a VPS is, a cron
   job, a self-improvement loop). If the screen shows the thing he's explaining, show the screen.
4. Where the plate has no screen (dark frame; see `screen-plan.txt`) and he only talks, keep a short graphic or the
   last screen state.
5. Privacy: see `privacy-blurs.md`. Never zoom onto a key, account id, IP or email. If v-previous seeked or zoomed
   the plate only to hide something that is not on the key-only list, undo it (`start: auto`, whole screen).
6. Keep chapter cards, the sponsor moment as he says it, honesty labels ("backtest", "paper account",
   "Recreated"), and any disclaimer.
7. Same word range and first-scene `at:` as before. Never `o:` anchors.

## Natural pauses (live feel)
His pauses while the screen changes are part of the demo (an answer appearing, a page loading). Keep them up to
~2.5 s when the screen changes in the first 3 s of the pause (`holds:` in `cuts.yaml`, computed from a per-0.2 s
screen-motion measure of the raw recordings). Fill nothing into them; the screen is the content.

## Done when
`lane.sh <X> check` → 0 errors (ignore "static stretch"/"plain screen" warnings here: they are wanted). Sheets at
`--every 3s` across the range, opened and read: whole screen during every screen action, no graphic over a moving
screen, no zoom over 1.3x, nothing sensitive readable.
