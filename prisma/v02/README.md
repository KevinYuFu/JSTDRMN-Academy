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

An Instructor row means instructor or mentor. A Staff row means staff. Everyone else is a student. There is no `Account.role`.

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
- `subscriptionStatus` and Announcement `status` stay text. The page does not make them enums.

**Required or empty**

- The page says these can be empty: `googleSub`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`, `photoUrl`, the four instructor links, `sessionPriceCents`, `Course.priceCents`, `series`, `completedAt`, `Booking.note`, `meetingUrl`, `Payment.courseId`, `Payment.bookingId`, `stripeId`, `paidAt`, `capacity`, `publishedAt`, `channelId`, `roleMention`, `sendAt`, `eventId`, `leadMinutes`, Announcement `status`, and Announcement `note`.
- `passwordHash` can be empty. The page does not say Optional. The note says an auth provider can be used instead.
- `subscriptionStatus` is required. The page does not say Optional.
- Other text is required, including `bio` and `Event.location`. The app can save `""`.
- `Course.instructorId` is required. The page does not say Optional.

**Defaults**

- `createdAt` is now. The page does not give a default.
- `subscriptionStatus` is the text `none`. The page does not give a default.
- `Instructor.active` and `Staff.active` are true. The page does not give a default.
- `isPublished` is false on Course and Event. The page says false means staff only.
- `Event.priceCents` is 0. The page says 0 means free.
- `isPinned` is false. The page does not give a default.
- Status enums, sort order, copied prices, durations, audience, and skill source have no default. The app must set them.

**Delete**

- Deleting an account deletes its sessions. The page says this.
- Deleting an event clears `Announcement.eventId` and keeps the announcement. The page says this.
- Cascade on pure link tables: InstructorSkill, CourseLink, CourseSkill. The page does not say.
- Restrict on every other foreign key. CourseLesson is Restrict because it also stores `sortOrder`. The page does not say.
- `onUpdate` is Cascade on every foreign key. That is Prisma's default.

**Indexes**

Indexes only. No new fields. A foreign key is indexed when it is not already the first column of a primary key or a unique key.

- `Session.accountId`
- `InstructorSkill.skillId`
- `StudentCourse.courseId`
- `Course.instructorId`
- `CourseLesson.lessonId`
- `Material.lessonId`
- `CourseLink.requiresCourseId`
- `LessonProgress.lessonId`
- `CourseSkill.skillId`
- `StudentSkill.skillId`
- `Booking.studentId`
- `Booking.instructorId`
- `Payment.studentId`
- `Payment.courseId`
- `Payment.bookingId`
- `EventRsvp.studentId`
- `Announcement.authorId`
- `Announcement.eventId`

These already have a unique key, so they have no extra index: `Student.accountId`, `Instructor.accountId`, `Staff.accountId`.

**Other choices**

- No currency column. Amounts are CAD cents.
- `Payment.bookingId` is not unique. There is no rule that a course payment must have a course, or that a course cannot require itself.
- Email, slug, skill name, and the Stripe ids are case-sensitive.
- Table names stay PascalCase, like the live database.
- Names such as `student` and `linksAsNext` are Prisma links for code. They are not columns.
- One connection setting: `V02_DATABASE_URL`. There is no second pooled URL.
- The v0.2 client is generated into `node_modules/.prisma/v02-client`, so it cannot replace the live client.
- Student has `subscriptionStatus` and `currentPeriodEnd`. It does not have `isSubscribed`. Subscribed is worked out from those two fields.
- Instructor has required `name` and optional `photoUrl`. It has no `isLead`, slug, or sort.
- Lesson is only `id` and `title`. No extra timestamps were added where the page has none.
- Event end is `startsAt` plus `durationMin`. There is no `endsAt`.
- Payment `kind` is `subscription`, `course`, or `session`. The page leaves an `event` kind as an open question, so it is not a value.
