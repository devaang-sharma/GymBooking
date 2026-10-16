# Gym Slot Booking

Members book and cancel one-hour gym sessions online. Admins create sessions and mark who turned up using a check-in code.

- Frontend: https://gymbooking-frontend.vercel.app
- API: https://gymbooking-production-a366.up.railway.app (health check: `/health`)

## Test credentials

Password for every account: `Password123!`

| Email | Role |
|---|---|
| `admin1@gym.test` | admin |
| `admin2@gym.test` | admin |
| `member1@gym.test` | member |
| `member2@gym.test` | member |
| `member3@gym.test` | member |

Check-in only works during a session's hour. To try it: as an admin, create a session that starts in the current hour, book it as a member, copy the code from My bookings, and enter it on the admin page.

## Design note

1. Backend: Node.js + Express, plain SQL through `pg`. Frontend: vanilla HTML/CSS/JS with a hash router, no build step.
2. Database: PostgreSQL on Neon. Four tables: `users`, `sessions`, `bookings`, `waitlist`.
3. `users.email` is unique (case-insensitive) and `role` is `member` or `admin`. Passwords are stored as bcrypt hashes.
4. `sessions.start_time` is unique, so two sessions cannot share a start. Capacity defaults to 20.
5. `bookings` has a `status` (`confirmed` or `cancelled`), a unique `checkin_code` and `checked_in_at`. Cancelled rows are kept.
6. A partial unique index on `(session_id, user_id) WHERE status = 'confirmed'` allows one active booking per member per session, and rebooking after a cancel.
7. `waitlist` has `UNIQUE (session_id, user_id)`. Queue order is by `created_at`.
8. Booking, cancelling, joining the waitlist and promotion run in one transaction that first locks the session row (`SELECT ... FOR UPDATE`), so two people cannot take the last seat.
9. Cancelling promotes the first waitlisted member inside the same transaction. Check-in is one atomic `UPDATE` with every rule in its `WHERE` clause.
10. Auth is a JWT in the `Authorization` header. Middleware checks the token, then the role, and services check ownership.

## Run locally

Backend:

```bash
cd backend
cp .env.example .env     # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate          # creates the tables
npm run seed             # 2 admins, 3 members, no sessions
npm run dev
```



Frontend:

```bash
# set API_URL in frontend/config.js (http://localhost:3000 for local)
npx serve frontend
```

Environment variables (see `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `PORT`.

Admin accounts are created directly in the database (the seed script does this). Registration only creates members.

## Assumptions

- The gym's timezone is fixed at Asia/Kolkata. The admin picks a date and an hour, and the server builds the timestamp.
- Capacity is always 20, set by the database default. Clients cannot choose it.
- Sessions cannot be created in the past.
- Registration always creates a member. Unknown fields such as `role` in the request body are dropped by the validator.
- The token is returned in the JSON body and sent as an `Authorization: Bearer` header, not a cookie, because the frontend and API are on different origins. It expires after 8 hours and is kept in `localStorage`.
- The server trusts the role inside the token until it expires, so a demoted admin keeps access until then.
- Invalid input returns 422. A body that is not valid JSON returns 400.
- Wrong email and wrong password return the same 401, so the API does not reveal which emails are registered.
- Cancelling sets the booking's status to `cancelled` and never deletes it. Rebooking creates a new row.
- Cancelling another member's booking returns 403.
- Members see only upcoming sessions. Admins see all sessions, including ones in progress and finished.
- A member can join the waitlist only when the session is full and they have no booking there. Joining twice returns 409.
- Nobody is promoted into a session that has started. Waitlist rows of started sessions stay in the table.
- Check-in codes are 6 characters from a 32-character alphabet without look-alike characters, generated with Node's `crypto`. Codes are accepted in any case.
- A code works once, from the session's start until one hour later, and never for a cancelled booking.
- Admin booking lists do not show check-in codes, so the code stays proof that the member was present.
- Seat counts refresh by polling every 10 seconds. Booking updates the count immediately and rolls it back if the server refuses.
- The frontend route guard is a convenience. Authorization is enforced by the server on every route.
- There is no rate limiting, and tokens cannot be revoked before they expire.