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
git checkout cursor/program-lead-edit-9d9b
git pull origin cursor/program-lead-edit-9d9b
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
git pull origin cursor/program-lead-edit-9d9b
sh scripts/local-review.sh
```

3. Open `http://127.0.0.1:43123/` again.

## Sign in and edit

1. Open `http://127.0.0.1:43123/`.
2. Click **Edit**. Change a title. Click **Save**.
3. Reload the page. Open the same address in a new tab. The new title should still be there.

A Student signup on this same local app does not see Edit. Log out first if you want to test that account. Opening `/` while logged out returns you to the synthetic Lead.

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
