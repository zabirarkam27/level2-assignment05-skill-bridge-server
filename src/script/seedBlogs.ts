import { prisma } from "../lib/prisma";

const blogs = [
  {
    title: "How to choose the right tutor for a focused learning goal",
    excerpt:
      "A practical guide for comparing mentor expertise, price, reviews, and availability before booking a MentorForge session.",
    content: `Choosing a tutor becomes easier when the learning goal is specific. Instead of searching for a broad subject, start by writing down the exact outcome you want from the session. For example, a student learning web development may need help with React state management, deployment, debugging, or project planning. Each goal points to a slightly different tutor profile.

After the goal is clear, compare mentors by subject match, course experience, session price, and availability. MentorForge shows tutor profiles, assigned courses, booking slots, and reviews so students can make this decision without jumping between tools.

The best tutor for a session is not always the most expensive one. A good match is someone who teaches the exact topic, explains in a style that fits the student, and has available slots before the deadline. Students should also read reviews carefully because they often reveal communication style and follow-up quality.

Before booking, check the course connected to the tutor and confirm that the selected slot gives enough time to prepare. A well-chosen tutor helps students leave the session with a clear next step, not just a quick answer.`,
    tags: ["students", "booking", "mentors"],
  },
  {
    title: "What students should prepare before a live tutoring session",
    excerpt:
      "Use this checklist to make every paid session more productive and easier for the tutor to guide.",
    content: `A tutoring session works best when the student arrives with context. Before the meeting, collect the project files, screenshots, error messages, links, and exact questions that need attention. This saves the first ten minutes from becoming a search exercise.

Students should also decide what a successful session looks like. Sometimes the goal is to fix one bug. Sometimes it is to understand a topic well enough to continue independently. Sharing that expectation helps the tutor choose the right pace and explanation depth.

If the session is connected to a course, review the course summary and write down the parts that felt unclear. For technical topics, prepare the development environment in advance and make sure the code runs locally.

After the session, use the booking dashboard to track status, review the tutor, and download certificates when the course is completed. A short follow-up note with what was learned can make future sessions much easier.`,
    tags: ["learning", "sessions", "productivity"],
  },
  {
    title: "How tutors can keep their MentorForge profile booking-ready",
    excerpt:
      "Tutors can improve booking quality by keeping subjects, courses, availability, and profile details accurate.",
    content: `A strong tutor profile answers the student's first questions before a message is sent. The bio should explain what the tutor teaches, who the sessions are best for, and what kind of outcomes students can expect.

Subjects and categories should stay accurate because they affect discovery and course matching. If a tutor changes focus from mobile development to backend APIs, the profile and course list should reflect that change.

Availability is just as important as expertise. Students often book around deadlines, so outdated slots create frustration. Tutors should update availability regularly and confirm paid pending sessions only when they can attend the selected time.

Reviews, completed sessions, and assigned courses build trust over time. A tutor who keeps their profile clean, responds to bookings, and guides students clearly will usually receive better reviews and more repeat bookings.`,
    tags: ["tutors", "profile", "dashboard"],
  },
];

async function seedBlogs() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@mentorforge.com" },
    select: { id: true },
  });

  if (!admin) {
    throw new Error("Admin user not found. Run seedAdmin first.");
  }

  for (const blog of blogs) {
    await prisma.blogPost.upsert({
      where: {
        id: `seed-${blog.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      },
      update: {
        ...blog,
        isPublished: true,
        authorId: admin.id,
      },
      create: {
        id: `seed-${blog.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
        ...blog,
        isPublished: true,
        authorId: admin.id,
      },
    });
  }
}

seedBlogs()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
