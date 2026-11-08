# Screen plates and privacy blurs

## Plates
A plate is his raw screen recordings re-timed to OUTPUT time: frame T shows what was on his screen while he said
the word at output time T. Build it from the cut map (`aroll.json` segments `{srcStart, srcEnd, outStart}`) and the
Borumi source timeline (each screen clip's start on the combined source timeline). Frames with no screen are a dark
frame. Encode at 2/3 of the recording size, 30 fps CFR, keyframe every 30 frames, no B-frames (cheap seeks for
Remotion). One plate per recording size (`media/screen-a.mp4`, `screen-b.mp4`) and a `screen-plan.txt` listing
when each plate has screen. Part YAML uses `screen: media/screen-a.mp4`, `size: [<recording w>, <h>]`,
`start: auto`, and rects in recording pixels (plate px × 1.5).

Also render an unblurred `media/.raw-<plate>.mp4` (same timing) for scanning and for writers' eyes only; never
reference it in YAML.

## Finding what to blur
- **OCR scan** (`scripts/ocr.swift`, macOS Vision; `swiftc -O ocr.swift -o .ocr`): OCR the raw plate every 1/3 s,
  then every frame within 0.6 s of a hit (scrolling text moves). Each hit becomes a box only where the text is,
  held while it's on screen. Union boxes (one box over everywhere the text moved) blurred whole chat windows for
  minutes; don't do that.
- **Regexes** for the kinds: API keys/tokens (`sk-`, `PK`, `fc-`, long base62), account ids, public IPv4 (not
  127.x/192.168.x), hostnames of his servers, emails, server passwords, OAuth codes.
- **Named sets** for things OCR finds as plain words (a contact list, a tab title) between two times.
- **Hand rects** for what OCR can't read, last.
- Store every interval with a `kind` (`api_key: ...`, `email: ...`, `discord: ...`) in source seconds, rects
  normalised 0..1 to the recording, so a policy can filter by kind later without re-scanning.

## Policy (his rule, Nov 7 2026)
"Unless it's like an API key or something super, super sensitive, just don't blur it."
- **Blur**: API keys, tokens, broker key ids and account ids, server password, OAuth codes, public IPs, his VPS
  hostname, emails, other people's private DMs/contact lists.
- **Show**: Discord servers and channels, his chat/session titles, localhost/LAN addresses, repo names, code.
- **Cut instead of blur**: logins and authentication flows (he asked for the Discord login to be cut, not blurred).
`scripts/blur_policy.py` keeps a `.v<prev>.json` copy of the full list and writes the filtered one, so loosening or
tightening is a re-run, not a re-scan.

## Leak checks
- After re-rendering a plate: OCR it and fail on any readable key/account/IP/email/password.
- After rendering the video: OCR a frame every 0.5 s of the final file; frozen stills, crops and replicas can show
  what the plate check didn't.
- A scene-level `blur:` rect reads as a grey slab; prefer cropping/framing the private area out.
