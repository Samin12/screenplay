#!/usr/bin/env python3 -I
"""Key-only privacy policy for the screen plates: filter the full OCR blur list down to what must stay hidden.

  python3 -I blur_policy.py <tools dir>      # reads blur_src.full.json, writes blur_src.json, prints the counts

Each interval in the list has a `kind` like "api_key: sk-..." or "ocr: Dashboard" (head before the colon).
The full list is kept beside it, so changing the policy is a re-run plus a plate re-render, never a re-scan.
Edit KEEP / DROP / SAFE_TEXT for the video.
"""
import collections
import json
import os
import shutil
import sys

# Always blurred: keys, tokens, broker ids, passwords, OAuth codes, public IPs, server hostnames, emails, and
# other people's DMs.
KEEP = {'api_key', 'token', 'broker-key-id', 'broker-account', 'server-password', 'oauth-code', 'ipv4',
        'vps-host', 'email', 'contacts'}
# Shown since his Nov 7 2026 note ("unless it's an API key or something super sensitive, don't blur it").
DROP = {'discord', 'chats', 'creds', 'full-name'}
# Generic OCR hits whose text starts with one of these are safe (localhost, LAN, his own UI labels).
SAFE_TEXT = ('127.0', '192.168', 'http://127', 'http://192', 'Dashboard')


def keep(iv):
    head, _, text = str(iv.get('kind', '')).partition(':')
    text = text.strip().rstrip('.')
    if head in KEEP:
        return True
    if head in DROP:
        return False
    if head in ('ocr', 'leakfix', 'leakline'):
        return not text.startswith(SAFE_TEXT)
    return True  # unknown kinds and hand-placed boxes stay until someone looks at them


def main():
    tools = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    out, full = os.path.join(tools, 'blur_src.json'), os.path.join(tools, 'blur_src.full.json')
    if not os.path.exists(full):
        shutil.copy(out, full)
    d = json.load(open(full))
    ivs = d['intervals']
    kept = [i for i in ivs if keep(i)]
    c = collections.Counter((('KEEP ' if keep(i) else 'drop ') + str(i.get('kind', ''))[:22]) for i in ivs)
    for k, n in sorted(c.items()):
        print(f'{n:5d}  {k}')
    print(f'{len(kept)} of {len(ivs)} kept')
    json.dump({**d, 'intervals': kept}, open(out, 'w'))


if __name__ == '__main__':
    main()
