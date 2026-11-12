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

## Choices made

**Ids**

- Every id is a uuid, including tables the page only called `id`.
- `SiteSetting.id` is the text `default`, not a uuid. Nothing stops a second row with a different id.
- Link tables have no id column. The pair is the primary key, so it is also unique: InstructorSkill, StudentCourse, CourseLesson, CourseLink, LessonProgress, CourseSkill, StudentSkill, EventRsvp.
- Prisma fills uuids in the app. The database column has no default. A hand-written insert must pass the id.
- `updatedAt` is filled by Prisma, not by the database.

**Types**

- `timestamp` and `datetime` are both DateTime (`timestamp(3)`, no time zone). Same as the live schema.
- `boolean` and `bool` are Boolean.
- `url` is text.
- `int` is a whole number.

**Required or empty**

- Ids, foreign keys, and the unique pairs are required.
- Empty is allowed where the page says Optional, empty, or only-for-one-kind: `passwordHash`, `stripeCustomerId`, `stripeSubscriptionId`, the four instructor links, `sessionPriceCents`, `Course.priceCents`, `series`, `completedAt`, `Payment.courseId`, `Payment.bookingId`, `capacity`, `publishedAt`.
- These can also be empty: `currentPeriodEnd` (no paid end date yet), `Booking.note` (nothing written), `meetingUrl` (link comes later), `stripeId` (unique, empty until Stripe sends one), `paidAt` (empty until paid).
- Other text is required, including `bio` and `Event.location`. The app can save `""`.
- `Course.instructorId` is required.

**Defaults**

- `createdAt` is now.
- `isSubscribed` is false.
- `subscriptionStatus` is the text `none`.
- `Instructor.active` and `Staff.active` are true.
- `isPublished` is false on Course and Event.
- `Event.priceCents` is 0.
- `isPinned` is false.
- `role` is `student`.
- Status enums, sort order, copied prices, durations, audience, and skill source have no default. The app must set them.

**Delete**

- Cascade only on pure link tables: InstructorSkill, CourseLink, CourseSkill. Those tables store only the two ids.
- Cascade on Session, same as today's login table.
- Restrict on every other foreign key. CourseLesson is Restrict because it also stores `sortOrder`.
- `onUpdate` is Cascade on every foreign key. That is Prisma's default, and it matches the live schema.

**Enums**

- Real Postgres enums where the page lists the values.
- `subscriptionStatus` stays text. `none`, `active`, `past_due`, and `cancelled` are examples, not an enum.

**Other choices**

- No currency column. Amounts are CAD cents.
- `Payment.bookingId` is not unique. There is no rule that a course payment must have a course, or that a course cannot require itself.
- Email, slug, and skill name are case-sensitive.
- Table names stay PascalCase, like the live database.
- Names such as `student` and `linksAsNext` are Prisma links for code. They are not columns.
- One connection setting: `V02_DATABASE_URL`. There is no second pooled URL.
- The v0.2 client is generated into `node_modules/.prisma/v02-client`, so it cannot replace the live client.
- Student keeps `isSubscribed`, `subscriptionStatus`, and `currentPeriodEnd`.
- Instructor has no name, photo, slug, or sort.
- `Course.delivery` is only `prerecorded` or `in_person`.
- Lesson is only `id` and `title`. No extra timestamps were added where the page has none.
- Announcement has no Discord fields. `authorId` points at Account, not Staff.
- Event uses `durationMin`. It has no `endsAt`, type, recurrence, or cohort.
- Foreign keys come from the field tables. That includes Staff, Booking, SiteSetting, Payment, Event, EventRsvp, and Announcement, which the diagram leaves out.
- The Notion page, including the latest field edits, is the source for this schema.
