import { db } from "@workspace/db";
import { questionBanksTable, questionsTable, examsTable, papersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function importExisting() {
  // Find UPSC Prelims + GS Paper I
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.slug, "upsc-prelims")).limit(1);
  if (!exam) throw new Error("UPSC Prelims not found in DB");

  const [paper] = await db
    .select()
    .from(papersTable)
    .where(and(eq(papersTable.examId, exam.id), eq(papersTable.slug, "gs1")))
    .limit(1);
  if (!paper) throw new Error("GS Paper I not found");

  const QUESTIONS_DIR = path.resolve("../../project/output/questions");
  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.log("No questions dir found at", QUESTIONS_DIR);
    process.exit(0);
  }

  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${files.length} question files`);

  for (const file of files) {
    const pdfName = file.replace(".json", ".pdf");
    const yearMatch = pdfName.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2025;

    // Check if bank already exists
    const existing = await db
      .select()
      .from(questionBanksTable)
      .where(and(eq(questionBanksTable.pdfName, pdfName), eq(questionBanksTable.examId, exam.id)))
      .limit(1);

    let bankId: number;
    if (existing.length > 0) {
      bankId = existing[0].id;
      console.log(`Bank already exists: id=${bankId}`);
    } else {
      const [bank] = await db
        .insert(questionBanksTable)
        .values({
          examId: exam.id,
          paperId: paper.id,
          pdfName,
          year,
          status: "ready",
        })
        .returning();
      bankId = bank.id;
      console.log(`Created bank: id=${bankId} for ${pdfName}`);
    }

    // Import questions
    const raw = fs.readFileSync(path.join(QUESTIONS_DIR, file), "utf-8");
    const questions = JSON.parse(raw);

    // Delete existing questions for this bank
    await db.delete(questionsTable).where(eq(questionsTable.bankId, bankId));

    let count = 0;
    for (const q of questions) {
      await db.insert(questionsTable).values({
        bankId,
        questionUid: q.question_id || `Q${String(count + 1).padStart(3, "0")}`,
        sourcePage: q.source_page || null,
        columnSide: q.column || null,
        passageId: q.passage_id || null,
        questionText: q.question_text || "",
        options: JSON.stringify(q.options || {}),
        hasMath: q.has_math ? 1 : 0,
        mathLatex: q.math_latex || null,
        questionType: q.question_type || null,
        subject: q.subject !== "unclassified" ? q.subject : "General Studies",
        topic: q.topic || "General",
        difficulty: q.difficulty !== "unclassified" ? q.difficulty : null,
        extractionConfidence: q.extraction_confidence || null,
        needsReview: q.needs_review ? 1 : 0,
      });
      count++;
    }

    // Update bank with totals and approve
    await db
      .update(questionBanksTable)
      .set({ status: "approved", totalQuestions: count, approvedAt: new Date() })
      .where(eq(questionBanksTable.id, bankId));

    console.log(`Imported and approved ${count} questions for bank ${bankId}`);
  }

  console.log("Done!");
  process.exit(0);
}

importExisting().catch(err => {
  console.error(err);
  process.exit(1);
});
