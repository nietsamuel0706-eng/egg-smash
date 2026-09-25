#!/usr/bin/env python3
"""Add the Egg Smasher game to the Samsites landing page.

Idempotent: running it twice changes nothing the second time. Takes a backup
before editing and prints a unified diff of what it changed.
"""
import difflib
import os
import re
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else "/var/www/html/index.html"
NAME = "Egg Smasher"
URL = "https://samuel-thuis.duckdns.org/smashegg/"

if not os.path.exists(PATH):
    sys.exit(f"✗ {PATH} does not exist")

with open(PATH, encoding="utf-8") as fh:
    original = fh.read()

ENTRY = re.compile(r'(\{ name: "%s", url: ")([^"]*)(")' % re.escape(NAME))

if NAME in original:
    # already linked — repair the URL if an earlier run used a different one
    match = ENTRY.search(original)
    if not match:
        print(f"! found “{NAME}” but not in the expected {{ name, url }} form — left untouched")
        sys.exit(1)
    if match.group(2) == URL:
        print(f"✓ already linked with the right URL — {PATH} left untouched")
        sys.exit(0)
    # replace only the URL — the rest of the line (quotes, comma, newline) is preserved
    fixed = ENTRY.sub(lambda m: m.group(1) + URL + m.group(3), original, count=1)
    if fixed.count("\n") != original.count("\n"):
        sys.exit("✗ line count changed, nothing written")
    backup = PATH + ".bak"
    if not os.path.exists(backup):
        os.replace(PATH, backup)
        print(f"  backup written to {backup}")
    with open(PATH, "w", encoding="utf-8") as fh:
        fh.write(fixed)
    sys.stdout.writelines(difflib.unified_diff(
        original.splitlines(keepends=True), fixed.splitlines(keepends=True),
        fromfile=PATH, tofile=PATH, n=1))
    print(f"\n✓ link updated: {match.group(2)} -> {URL}")
    sys.exit(0)
    sys.exit(0)

lines = original.splitlines(keepends=True)

# find the line that closes the `sites` array
close = None
for i, line in enumerate(lines):
    if line.strip() == "];":          # the only standalone "];" in the file
        close = i
if close is None:
    sys.exit("✗ could not find the end of the sites array — edit it by hand")

# last non-blank line inside the array needs a trailing comma
last = close - 1
while last >= 0 and not lines[last].strip():
    last -= 1
if not lines[last].rstrip().endswith(","):
    lines[last] = lines[last].rstrip() + ",\n"

entry = f'      {{ name: "{NAME}", url: "{URL}" }},\n'
lines.insert(close, entry)
patched = "".join(lines)

# sanity checks before touching the file
problems = []
if patched.count(f'name: "{NAME}"') != 1:
    problems.append("entry was not inserted exactly once")
if f'name: "{NAME}"' in original:
    problems.append("entry was already present")
if patched.count("{ name:") != original.count("{ name:") + 1:
    problems.append("site count did not increase by exactly one")
if "<title>Samsites</title>" not in patched:
    problems.append("page title went missing")
if patched.count("{") != patched.count("}"):
    problems.append("braces are unbalanced")
if problems:
    sys.exit("✗ " + "; ".join(problems))

backup = PATH + ".bak"
if not os.path.exists(backup):
    os.replace(PATH, backup)
    print(f"  backup written to {backup}")

with open(PATH, "w", encoding="utf-8") as fh:
    fh.write(patched)

diff = difflib.unified_diff(
    original.splitlines(keepends=True),
    patched.splitlines(keepends=True),
    fromfile=PATH, tofile=PATH, n=1,
)
sys.stdout.writelines(diff)
print(f"\n✓ added “{NAME}” → {URL}  ({original.count('{ name:')} sites → {patched.count('{ name:')})")
