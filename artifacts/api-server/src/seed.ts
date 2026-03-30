import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, examsTable, papersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
  if (!existingAdmin) {
    await db.insert(usersTable).values({ username: "admin", passwordHash: adminHash, role: "admin" });
    console.log("Created admin user (admin / admin123)");
  } else {
    console.log("Admin user already exists");
  }

  // Create default user
  const userHash = await bcrypt.hash("student123", 10);
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.username, "student")).limit(1);
  if (!existingUser) {
    await db.insert(usersTable).values({ username: "student", passwordHash: userHash, role: "user" });
    console.log("Created student user (student / student123)");
  } else {
    console.log("Student user already exists");
  }

  // Seed exams
  const exams = [
    { name: "UPSC Prelims", slug: "upsc-prelims" },
    { name: "UPSC Mains", slug: "upsc-mains" },
    { name: "TNPSC Group 1", slug: "tnpsc-group-1" },
    { name: "JEE Advanced", slug: "jee-advanced" },
    { name: "NEET UG", slug: "neet-ug" },
    { name: "CAT", slug: "cat" },
  ];

  for (const exam of exams) {
    const [existing] = await db.select().from(examsTable).where(eq(examsTable.slug, exam.slug)).limit(1);
    if (!existing) {
      await db.insert(examsTable).values(exam);
      console.log(`Created exam: ${exam.name}`);
    }
  }

  // Seed papers
  const allExams = await db.select().from(examsTable);
  const examMap = new Map(allExams.map(e => [e.slug, e.id]));

  const papers: { examSlug: string; name: string; slug: string }[] = [
    { examSlug: "upsc-prelims", name: "GS Paper I", slug: "gs1" },
    { examSlug: "upsc-prelims", name: "GS Paper II (CSAT)", slug: "csat" },
    { examSlug: "upsc-mains", name: "GS Paper I", slug: "gs1" },
    { examSlug: "upsc-mains", name: "GS Paper II", slug: "gs2" },
    { examSlug: "upsc-mains", name: "GS Paper III", slug: "gs3" },
    { examSlug: "upsc-mains", name: "GS Paper IV", slug: "gs4" },
    { examSlug: "tnpsc-group-1", name: "General Studies", slug: "gs" },
    { examSlug: "tnpsc-group-1", name: "Aptitude & Mental Ability", slug: "aptitude" },
    { examSlug: "jee-advanced", name: "Paper 1", slug: "paper1" },
    { examSlug: "jee-advanced", name: "Paper 2", slug: "paper2" },
    { examSlug: "neet-ug", name: "Biology", slug: "biology" },
    { examSlug: "neet-ug", name: "Physics", slug: "physics" },
    { examSlug: "neet-ug", name: "Chemistry", slug: "chemistry" },
    { examSlug: "cat", name: "Verbal Ability & RC", slug: "varc" },
    { examSlug: "cat", name: "Data Interpretation & LR", slug: "dilr" },
    { examSlug: "cat", name: "Quantitative Aptitude", slug: "qa" },
  ];

  for (const paper of papers) {
    const examId = examMap.get(paper.examSlug);
    if (!examId) continue;
    const [existing] = await db
      .select()
      .from(papersTable)
      .where(eq(papersTable.examId, examId))
      .limit(1);
    // Simple check - just insert if table is sparse
    try {
      await db.insert(papersTable).values({ examId, name: paper.name, slug: paper.slug });
      console.log(`Created paper: ${paper.examSlug} -> ${paper.name}`);
    } catch {
      // Might already exist, continue
    }
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
