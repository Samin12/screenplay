# Brief for the whole-video reviewer

You review the assembled master of "<title>" before it ships. You did not make it. You return numbered
findings. You fix nothing. `W` = `<work dir>`.

Review: `W/out/master-<v>-720.mp4` (watch and listen), `W/out/master-<v>.mp4` (full-size frames),
`.segments.json`, `.chapters.txt`, `.sfx.json`, `.srt`, and `W/out/master-<v>.joins.txt` if it exists.
Rules: `W/PLAN.md`, `W/FACTS.md`, `W/STORY-CUT.md`, `W/PROOF-FIRST.md`, `W/LAYOUT.md`. Write to
`W/review/FINAL-<v>.md`.

## Pass 1: listen only (the whole file)
Whisper on the full audio. Loudness per segment and per full clip. `silencedetect`. Listen to every join in
`.segments.json` and every changed join in `.joins.txt` (rate each natural / not, three listens). Listen to
every chapter breather: room tone, no dead silence, no breath or laugh, click inside the pause. Flow: does
the whole arc follow by ear; repeated points across parts; references to anything no longer in the video.

## Pass 2: watch
1 fps contact sheets of the whole file, all opened. 5 fps strips across every segment join and every
chapter card. Full-size frames of every recreated window, proof card and number. Check: flashes or blank
frames at joins; the badge reading the right chapter; every card (right tile lit, done ones dimmed,
upcoming locked); "Recreated" in frame on every recreated window including zoomed ones; framing (white
windows, proof under 85% width); dark dips at layout switches; captions on the wrong side of a breather;
anything untrue against `W/FACTS.md`; any whoosh.

## If this is a re-check
Start with a table of every earlier blocker and major: fixed / partly / not, with the time and evidence.
Then audit anything rebuilt since, then a fresh full pass.

## Output
Numbered findings, most important first, each: time, segment id, `blocker` / `major` / `minor`, what is
wrong, the concrete fix, the evidence file. Then "Passed checks". Then the table of joins. Then one verdict
line: SHIP / SHIP AFTER MAJORS / SHIP AFTER BLOCKERS AND MAJORS.
Edit nothing but your review file and your own temp folder. Do not start other agents.

Reply (under 250 words): the verdict, the counts, and the five most important findings.
