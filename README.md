# SkillBridge Server

Backend for the Assignment 5 SkillBridge full-stack project.

## Live Links

Frontend Repo : `https://github.com/zabirarkam27/level2-assignment04-skill-bridge-client`
Backend Repo : `https://github.com/zabirarkam27/level2-assignment04-skill-bridge-server`
Frontend Live : `https://skil-bridge-client-v2.vercel.app/`
Backend Live : `https://skil-bridge-server-v2.vercel.app/`
Demo Video : `https://drive.google.com/file/d/1eSWTzs7AbmhB9P2nNIkrv_M_C003kcoB/view`

## Admin Credentials

- Email: `admin@skillbridge.com`
- Password: `admin1234`

Run `npm run db:seed:admin` after `npm run db:push` to create/update this admin account.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Push the Prisma schema with `npm run db:push`.
4. Seed the admin with `npm run db:seed:admin`.
5. Optional: seed categories with `npm run db:seed:categories`.
6. Start the API with `npm run dev`.

## Environment Variables

- `DATABASE_URL`: PostgreSQL database connection string.
- `APP_URL`: frontend URL used for CORS and email links.
- `BETTER_AUTH_URL`: backend auth/API URL.
- `BETTER_AUTH_SECRET`: Better Auth secret.
- `APP_USER` and `APP_PASSWORD`: SMTP credentials.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials.
- `CLOUDINARY_*`: Cloudinary image upload credentials.
- `API_PUBLIC_URL`: public backend URL used for payment callbacks.
- `STRIPE_SECRET_KEY`: Stripe secret key used to create checkout sessions.
- `STRIPE_CURRENCY`: payment currency, defaults to `bdt`.
- `ADMIN_PASSWORD`: password used by the admin seed script.

## API Areas

- Better Auth endpoints: `/api/auth/*`
- Tutors: `/mentors`
- Bookings: `/bookings`
- Reviews: `/reviews`
- Categories: `/categories`
- Courses: `/courses`
- Availability: `/availability`
- Admin: `/admin`
- Payments: `/payments`

## Payment Rule

Stripe Checkout is integrated before booking creation. Students select a tutor,
course, availability slot, and date, then pay through Stripe. The booking is
created only after Stripe confirms the checkout session as paid, and the tutor
can confirm the paid pending booking afterward.
