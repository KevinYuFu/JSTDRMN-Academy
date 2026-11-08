# Navigation trace

This records a real menu click through to the real page. It does not make navigation faster, and it does not change what the page draws.

It runs only while the app is in development (`next dev`, which is what the named preview starts). A production build does not install the listeners, and `/nav-trace` is a 404 there.

The trace stores paths, durations, byte sizes, and yes/no flags in `sessionStorage` for this tab. It does not store names, cookies, the session token, page text, or the `_rsc` query.

## Disk

A named preview copies `node_modules` into `.local-review/previews/<label>/src` (`cp -a` in `scripts/local-preview.mjs`, `ensureWorktreeModules`) or runs `npm install` when the launcher has no `node_modules`. It also creates a new Postgres directory for that label.

Reported Mac state, not rechecked from here: the disk was full, about 199 MiB free, and the Programs editor preview failed while copying dependencies (`ENOSPC`). That report is not a measurement of navigation, and it is not established as the cause of the slow clicks. Do not delete other previews or stop their processes to make room.

If this command stops with `ENOSPC` or “No space left on device”, the preview did not start. There is no trace to collect. Send that terminal text. A failed start is not a fast or slow navigation.

## Start a new preview

Use a new label. Do not reuse `nav-feedback-fixed`. That label is pinned to the branch it already checked out, and a later start will not switch it.

From the checkout that already has `scripts/local-review.sh` (the current launcher, or `main`):

```bash
sh scripts/local-review.sh --label nav-trace --branch cursor/nav-click-trace-cde0
```

Leave the other previews running. This label gets its own port, database, and checkout. Open the URL the command prints. It looks like:

`http://nav-trace.preview.localhost:<port>/`

Opening that URL signs in the synthetic Lead for this database only. The header then has the purple Dashboard tab after My Courses. The logo still goes to `/`. Programs still goes to `/programs`.

## What to click

Stay in one tab. Use the desktop header, not the phone menu, for the main pass. The phone menu is a normal link and loads a new document; the trace records that as `reload`.

Signed in, two passes:

1. First visit of each target in this order: Programs, Skill Tree, Events, My Courses, Dashboard, then the logo.
2. The same order again, without a reload. This is the warm pass. Do not skip a row that feels stuck. Wait it out. A click that never shows the real page is kept, with `timed out` set, for 15 seconds.

Then reload the tab once and click Events once. That is the document-load row.

Guest, in a private window so this Lead session is not sent:

Open `http://nav-trace.preview.localhost:<port>/programs` directly. Do not open `/` first. `/` signs the synthetic Lead back in. The header should show Log in and Sign up (`signed in` is `no`). Click Programs, Skill Tree, Events, and My Courses. My Courses and a typed `/teacher` should land on Log in (`auth redirect`).

Do not paste cookies or the lead password.

## Read it

After the clicks, open:

`http://nav-trace.preview.localhost:<port>/nav-trace`

Press Refresh if the last click is missing. Copy JSON and send that file. Do not send a screenshot of the account menu.

## How to read a row

| Column | Meaning |
| --- | --- |
| `requestMs` | How long the fetch for that path lasted. On this preview that fetch is the dev server, including a compile when the terminal logs one. |
| `waitedForResponseMs` | How long after the click that response came back. |
| `clickToCommitMs` | Click until the address changed to that page, or to Log in. |
| `clickToUsableMs` | Click until the real marker is in the document. Home is the welcome heading. Programs is the catalog. Skill Tree is the map stage. Events and Private Sessions are the page heading. My Courses and Dashboard are the page title, not the loading line. |
| `loading` | My Courses showed “Loading your courses” before the title. The usable time is the title. |
| `long tasks` | Main-thread tasks of at least 50ms between the click and the end of the wait. A large total with a small `requestMs` is the browser after the response, not the server. |
| `in flight` | Other fetches already running at the click. |
| `prefetch` | A fetch for that path had already finished before the click. |
| `reload` | On a click row, the click loaded a new document instead of staying in the page. `clock` is `wall` for that row. |
| `timed out` | The marker was not there after 15 seconds. The row is kept. Usable is empty. |

`kind: document` is the load of the tab itself. Its `ttfbMs` is the document response, the same kind of number a curl reports. It is not a click.

The dev terminal’s compile line is still the compile time. This page does not replace that log. Put the two next to each other when a `requestMs` is large.

## What this cannot show

A cloud run of this repo is not the Mac. Curl of the HTML document is not a click. This trace is the click, and it has to be copied from the Mac tab that felt slow.
