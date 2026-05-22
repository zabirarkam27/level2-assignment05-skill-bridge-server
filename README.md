# SkillBridge Server

Backend for the Assignment 4 SkillBridge full-stack project.

## Live Links

Frontend Repo    : `https://github.com/zabirarkam27/level2-assignment04-skill-bridge-client`
Backend Repo     : `https://github.com/zabirarkam27/level2-assignment04-skill-bridge-server`
Frontend Live    : `https://skill-bridge-client-two-beta.vercel.app/`
Backend Live     : `https://skill-bridge-server-tan.vercel.app/`
Demo Video       : `https://drive.google.com/file/d/1eSWTzs7AbmhB9P2nNIkrv_M_C003kcoB/view`

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

## Payment Rule

No online payment gateway is integrated. Bookings follow the no-online-payment / Cash on Delivery requirement.
