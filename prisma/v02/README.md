# Academy database v0.2

This is a **new** database. It does not replace the live one.

The live site still uses `prisma/schema.prisma` and `DATABASE_URL`. Do not point `V02_DATABASE_URL` at that database.

## Apply these tables

1. Create an empty Postgres database.
2. Set `V02_DATABASE_URL` to that database.
3. From the repo root, run:

```bash
prisma migrate deploy --schema prisma/v02/schema.prisma
```

That creates the v0.2 tables in the new database only.

Do not commit the URL. Do not commit a `.env` file.

## Check the schema file

`prisma validate` does not connect. It only checks that `V02_DATABASE_URL` is set. A local placeholder is enough for the check. Still do not use the live database URL.

```bash
npm run db:v02:validate
```
