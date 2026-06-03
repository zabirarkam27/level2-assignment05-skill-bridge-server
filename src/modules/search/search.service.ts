import { prisma } from "../../lib/prisma";

const RESULT_LIMIT = 5;

const normalizeQuery = (query: unknown) => {
  return String(query ?? "").trim();
};

const searchEverything = async (rawQuery: unknown, role?: string) => {
  const query = normalizeQuery(rawQuery);
  const canSearchUsers = role === "ADMIN";

  if (query.length < 2) {
    return {
      tutors: [],
      courses: [],
      categories: [],
      users: [],
    };
  }

  const [tutors, courses, categories, users] = await Promise.all([
    prisma.tutorProfile.findMany({
      take: RESULT_LIMIT,
      where: {
        user: { role: "TUTOR", status: "ACTIVE" },
        OR: [
          { bio: { contains: query, mode: "insensitive" } },
          { subjects: { has: query } },
          { user: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        bio: true,
        subjects: true,
        rating: true,
        user: { select: { name: true, image: true } },
      },
      orderBy: { rating: "desc" },
    }),
    prisma.course.findMany({
      take: RESULT_LIMIT,
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } },
          { tutor: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        title: true,
        image: true,
        category: { select: { name: true } },
        tutor: { select: { name: true } },
      },
      orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      take: RESULT_LIMIT,
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        description: true,
      },
      orderBy: { name: "asc" },
    }),
    canSearchUsers
      ? prisma.user.findMany({
          take: RESULT_LIMIT,
          where: {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    tutors: tutors.map((tutor) => ({
      id: tutor.id,
      title: tutor.user.name,
      subtitle: tutor.subjects.slice(0, 3).join(", ") || "Tutor",
      image: tutor.user.image,
      href: `/mentors/${tutor.id}`,
      type: "Tutor",
    })),
    courses: courses.map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: course.category.name,
      image: course.image,
      href: `/courses/${course.id}`,
      type: "Course",
    })),
    categories: categories.map((category) => ({
      id: category.id,
      title: category.name,
      subtitle: category.description ?? "Course category",
      image: category.image,
      href: `/courses?category=${category.id}`,
      type: "Category",
    })),
    users: users.map((user) => ({
      id: user.id,
      title: user.name,
      subtitle: `${user.email} - ${user.role}${user.status ? ` - ${user.status}` : ""}`,
      href: `/admin/users?search=${encodeURIComponent(user.email)}`,
      type: "User",
    })),
  };
};

export const SearchService = {
  searchEverything,
};
