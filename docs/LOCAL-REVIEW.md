# Local review

Use this to try the app on your own computer. It starts the real Next.js app and a Postgres database in the project folder. Saves stay in that database after a reload or a new tab.

This is not the Vercel site. It does not use a hosted database. It does not sign you in as a production user.

## What you need

- git
- `curl` (macOS includes `/usr/bin/curl`)
- A normal user account. Do not use `sudo`.

You do not need Homebrew, Docker, or a Postgres app. If Node is missing, or older than 20, the script downloads Node 22 into `.local-review/cache`.

## Start

From the repo:

```bash
git fetch origin
git checkout cursor/local-review-9d9b
git pull origin cursor/local-review-9d9b
sh scripts/local-review.sh
```

The first run downloads Node if needed, then Postgres, then app packages. That needs the internet once. Later runs reuse `.local-review`.

When it is ready, open:

`http://127.0.0.1:43123/`

That page signs you in as the synthetic local Lead. You do not type a password. The session is the same cookie a password login creates. It is only for `local-lead@example.com` in this local database.

Password login is still there if you want it: `http://127.0.0.1:43123/login`. The password is in `.local-review/lead-login.txt`. That file stays on your computer. It is not in git. Do not paste it into chat.

## Update a copy that is already running

Do not delete `.local-review`. Your saved programs stay in that folder.

1. Press Control-C in the terminal that is running the app.
2. In the repo:

```bash
git pull origin cursor/local-review-9d9b
sh scripts/local-review.sh
```

3. Open `http://127.0.0.1:43123/` again.

## Sign in

1. Open `http://127.0.0.1:43123/`.
2. The page signs you in as the synthetic local Lead. Reload it. Open the same address in a new tab. You stay signed in.

This branch does not add Edit. The Programs list stays read-only until that separate change is merged. Opening `/` while logged out returns you to the synthetic Lead.

## Stop and remove

Press Control-C in the terminal. That stops the app and Postgres.

Delete the `.local-review` folder to remove the local database, the downloaded Node, and the password file. That does not change Vercel, Neon, or GitHub.

## Safety

| Name | What this command does |
| --- | --- |
| `DATABASE_URL` | Set to `127.0.0.1` port `55432` only. A hosted value already in the terminal stops the script. |
| `DATABASE_URL_UNPOOLED` | The same local URL. |
| `SEED_ADMIN_EMAIL` | `local-lead@example.com` for this process. |
| `SEED_ADMIN_PASSWORD` | Read from `.local-review/lead-login.txt`. Not printed. |
| `APP_URL` | `http://127.0.0.1:43123` |
| Google, Stripe, HubSpot, Discord | Cleared for this process, even if `.env` has them. |

`.env` and `.env.local` are not the database this command uses. Do not run `npm run dev` for this review if `.env` points at a hosted database. `npm run dev` follows `.env`. `sh scripts/local-review.sh` does not.

The app listens on `127.0.0.1` only. The session cookie is not marked Secure, because this is a local `http` site. Production on Vercel marks the cookie Secure.

The first start seeds the local catalog. After the local Lead exists, later starts do not seed again, so a saved title remains. Deleting `.local-review` starts over.

## One preview per feature

The command above is the original single review. It stays on `127.0.0.1:43123` and database port `55432`. Leave it alone if someone is already using it.

A named preview is a second copy, with its own checkout, app process, and database. It does not use ports `43123`, `43124`, or `55432`. Run it from this branch. You do not add this script to the feature branch.

```bash
sh scripts/local-review.sh --label editor --branch cursor/program-lead-edit-9d9b
```

The label is a short name you choose, such as `editor` or `cleanup`. The branch is the feature you want to look at. A fresh checkout of only this tooling branch does not already have `main` or the feature branch. The command fetches that one branch from `origin` into a remote-tracking ref. It does not create a local branch, and it does not push or change the branch on `origin`. If origin has no branch by that name, it stops with that message and does not create a database. The first successful start checks out that commit in `.local-review/previews/editor/src` and creates a database in `.local-review/previews/editor/pgdata`. A later start of the same label keeps that database and does not seed again. It will not switch the label onto a different branch.

When it is ready, the terminal prints a URL like:

`http://editor.preview.localhost:43210/`

That name is the cookie boundary. A browser treats `editor.preview.localhost` and `cleanup.preview.localhost` as different sites, so a session on one is not sent to the other. Different ports on `127.0.0.1` do not do that, so named previews do not use `127.0.0.1` as their page address. You do not need a separate browser profile.

The page shows a bar with the label, branch, and commit. Opening the URL signs in the synthetic Lead for that database only. The feature branch does not have to contain this sign-in code.

Stop one preview without deleting its data:

```bash
sh scripts/local-review.sh --label editor --stop
```

Start the same command again to open the same URL and the same database. Control-C in that preview's terminal stops only that preview.

See what is recorded:

```bash
sh scripts/local-review.sh --status
```

The server listens on `127.0.0.1` and `::1`. The page address stays `http://editor.preview.localhost:<port>/`. A missing OS name is not a reason to stop, and the command does not switch that address to `127.0.0.1`.

Node on macOS can report `getaddrinfo ENOTFOUND editor.preview.localhost`. That check uses the OS resolver. Chrome and Firefox treat a name that ends in `.localhost` as loopback themselves and do not need that OS result. Safari may still use the OS resolver. This has not been confirmed on a Mac.

A read-only check, with no checkout and no app process:

```bash
node -e 'require("dns").lookup("editor.preview.localhost", {all:true}, (err, addrs) => console.log(err && err.code, addrs))'
```

`ENOTFOUND` there is expected on macOS. It does not mean the preview must fall back to `127.0.0.1`.

If the OS lookup returns a public address, the preview command refuses to start. That is the check that stays. `ENOTFOUND` does not trip it.
