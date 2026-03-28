import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { db } from "@workspace/db";
import { questionBanksTable, questionsTable, examsTable, papersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./auth";

export const adminRouter = Router();
adminRouter.use(requireAdmin as any);

const PROJECT_DIR = path.resolve(process.cwd(), "../../project");
const UPLOADS_DIR = path.resolve(PROJECT_DIR, "uploads");
const PAGES_DIR = path.resolve(PROJECT_DIR, "output/pages");
const QUESTIONS_DIR = path.resolve(PROJECT_DIR, "output/questions");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(PAGES_DIR, { recursive: true });
fs.mkdirSync(QUESTIONS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ts = Date.now();
    cb(null, `${ts}_${file.originalname.replace(/\s+/g, "_")}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

function getPagesForBank(pdfStem: string, oddOnly: boolean): { pageNumber: number; filename: string }[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  const prefix = `${pdfStem}_page_`;
  const files = fs.readdirSync(PAGES_DIR)
    .filter(f => f.startsWith(prefix) && (f.endsWith(".png") || f.endsWith(".jpg")))
    .sort();

  return files
    .map((file, idx) => ({ pageNumber: idx + 1, filename: file, pageIdx: idx }))
    .filter(({ pageNumber }) => !oddOnly || pageNumber % 2 === 1)
    .map(({ pageNumber, filename }, idx) => ({ pageNumber: idx + 1, filename }));
}

// List all banks
adminRouter.get("/banks", async (_req: Request, res: Response) => {
  const banks = await db
    .select({
      id: questionBanksTable.id,
      examId: questionBanksTable.examId,
      paperId: questionBanksTable.paperId,
      pdfName: questionBanksTable.pdfName,
      year: questionBanksTable.year,
      status: questionBanksTable.status,
      totalPages: questionBanksTable.totalPages,
      totalQuestions: questionBanksTable.totalQuestions,
      createdAt: questionBanksTable.createdAt,
      examName: examsTable.name,
      paperName: papersTable.name,
    })
    .from(questionBanksTable)
    .leftJoin(examsTable, eq(questionBanksTable.examId, examsTable.id))
    .leftJoin(papersTable, eq(questionBanksTable.paperId, papersTable.id))
    .orderBy(questionBanksTable.createdAt);

  res.json({
    banks: banks.map(b => ({
      ...b,
      createdAt: b.createdAt?.toISOString() ?? null,
    })),
  });
});

// Get bank detail with pages + questions
adminRouter.get("/banks/:bankId", async (req: Request, res: Response) => {
  const bankId = parseInt(req.params.bankId);
  const [bank] = await db
    .select()
    .from(questionBanksTable)
    .where(eq(questionBanksTable.id, bankId))
    .limit(1);

  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }

  const pdfStem = bank.pdfStem ?? (bank.pdfPath ? path.basename(bank.pdfPath, ".pdf") : null);
  const oddOnly = bank.oddOnly === 1;

  const pages = pdfStem
    ? getPagesForBank(pdfStem, oddOnly).map(({ pageNumber, filename }) => ({
        pageNumber,
        imageUrl: `/api/admin/pages/${bankId}/${filename}`,
        filename,
      }))
    : [];

  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.bankId, bankId));

  res.json({
    id: bank.id,
    examId: bank.examId,
    paperId: bank.paperId,
    pdfName: bank.pdfName,
    year: bank.year,
    status: bank.status,
    oddOnly: bank.oddOnly === 1,
    totalPages: bank.totalPages ?? pages.length,
    totalQuestions: bank.totalQuestions ?? questions.length,
    pages,
    questions: questions.map(q => formatQuestion(q, bank.year, bank.examId, bank.paperId)),
  });
});

// Serve page images by filename
adminRouter.get("/pages/:bankId/:filename", async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(PAGES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.sendFile(filePath);
});

// Delete a page image
adminRouter.delete("/banks/:bankId/pages/:filename", async (req: Request, res: Response) => {
  const bankId = parseInt(req.params.bankId);
  const filename = req.params.filename;

  const [bank] = await db.select().from(questionBanksTable).where(eq(questionBanksTable.id, bankId)).limit(1);
  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }

  const pdfStem = bank.pdfStem ?? (bank.pdfPath ? path.basename(bank.pdfPath, ".pdf") : "");
  if (!filename.startsWith(pdfStem + "_page_")) {
    res.status(403).json({ error: "Page does not belong to this bank" });
    return;
  }

  const filePath = path.join(PAGES_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ message: "Page deleted" });
});

// Approve a bank (imports questions from JSON if not already done)
adminRouter.post("/banks/:bankId/approve", async (req: Request, res: Response) => {
  const bankId = parseInt(req.params.bankId);
  const [bank] = await db
    .select()
    .from(questionBanksTable)
    .where(eq(questionBanksTable.id, bankId))
    .limit(1);

  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }

  // Check if there are existing questions in DB already
  const [existingQ] = await db.select().from(questionsTable).where(eq(questionsTable.bankId, bankId)).limit(1);

  if (!existingQ) {
    // Try to import from JSON output file
    const pdfStem = bank.pdfStem ?? (bank.pdfPath ? path.basename(bank.pdfPath, ".pdf") : null);
    if (pdfStem) {
      const imported = await importQuestionsFromJson(bankId, pdfStem);
      await db
        .update(questionBanksTable)
        .set({ status: "approved", approvedAt: new Date(), totalQuestions: imported })
        .where(eq(questionBanksTable.id, bankId));
      res.json({ message: `Approved and imported ${imported} questions` });
      return;
    }
  }

  await db
    .update(questionBanksTable)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(questionBanksTable.id, bankId));
  res.json({ message: "Bank approved" });
});

// Edit a question
adminRouter.patch("/questions/:questionId", async (req: Request, res: Response) => {
  const questionId = parseInt(req.params.questionId);
  const { questionText, options, subject, topic, difficulty, needsReview } = req.body as {
    questionText?: string;
    options?: Record<string, string>;
    subject?: string;
    topic?: string;
    difficulty?: string;
    needsReview?: boolean;
  };

  const updates: Record<string, any> = {};
  if (questionText !== undefined) updates.questionText = questionText;
  if (options !== undefined) updates.options = JSON.stringify(options);
  if (subject !== undefined) updates.subject = subject;
  if (topic !== undefined) updates.topic = topic;
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (needsReview !== undefined) updates.needsReview = needsReview ? 1 : 0;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  await db.update(questionsTable).set(updates).where(eq(questionsTable.id, questionId));
  const [updated] = await db.select().from(questionsTable).where(eq(questionsTable.id, questionId)).limit(1);
  if (!updated) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(updated);
});

// Delete a question
adminRouter.delete("/questions/:questionId", async (req: Request, res: Response) => {
  const questionId = parseInt(req.params.questionId);
  await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
  res.json({ message: "Question deleted" });
});

// Upload PDF and start pipeline
adminRouter.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const examId = parseInt(req.body.examId);
  const paperId = parseInt(req.body.paperId);
  const year = parseInt(req.body.year);
  const skipCovers = req.body.skipCovers === "true";
  const oddOnly = req.body.oddOnly === "true";

  if (!examId || !paperId || !year) {
    res.status(400).json({ error: "examId, paperId, year are required" });
    return;
  }

  const pdfStem = path.basename(req.file.path, ".pdf");

  const [bank] = await db
    .insert(questionBanksTable)
    .values({
      examId,
      paperId,
      pdfName: req.file.originalname,
      pdfStem,
      year,
      status: "processing",
      pdfPath: req.file.path,
      oddOnly: oddOnly ? 1 : 0,
      skipCovers: skipCovers ? 1 : 0,
    })
    .returning();

  // Run main.py — full pipeline: renders PDF to pages then OCRs them
  const mainScript = path.join(PROJECT_DIR, "main.py");
  const pythonArgs = [mainScript, req.file.path];
  if (skipCovers) pythonArgs.push("--skip-covers");
  if (oddOnly) pythonArgs.push("--odd-only");

  const child = spawn("python3", pythonArgs, {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    cwd: PROJECT_DIR,
    env: { ...process.env },
  });

  child.on("error", async (err) => {
    req.log.error({ err, bankId: bank.id }, "Python pipeline spawn failed");
    await db
      .update(questionBanksTable)
      .set({ status: "failed" })
      .where(eq(questionBanksTable.id, bank.id));
  });

  child.on("exit", async (code) => {
    if (code === 0) {
      // Auto-import questions from JSON output
      const imported = await importQuestionsFromJson(bank.id, pdfStem);
      await db
        .update(questionBanksTable)
        .set({ status: "ready", totalQuestions: imported })
        .where(eq(questionBanksTable.id, bank.id));
    } else if (code !== null) {
      await db
        .update(questionBanksTable)
        .set({ status: "failed" })
        .where(eq(questionBanksTable.id, bank.id));
    }
  });

  child.unref();

  res.status(201).json({
    bankId: bank.id,
    status: "processing",
    message: "PDF uploaded. Processing in background — check back in a few minutes.",
  });
});

async function importQuestionsFromJson(bankId: number, pdfStem: string): Promise<number> {
  const jsonPath = path.join(QUESTIONS_DIR, `${pdfStem}.json`);
  if (!fs.existsSync(jsonPath)) return 0;

  let data: any[];
  try {
    const content = fs.readFileSync(jsonPath, "utf-8");
    data = JSON.parse(content);
    if (!Array.isArray(data)) data = [data];
  } catch {
    return 0;
  }

  // Delete existing questions for this bank first
  await db.delete(questionsTable).where(eq(questionsTable.bankId, bankId));

  let count = 0;
  for (const q of data) {
    try {
      await db.insert(questionsTable).values({
        bankId,
        questionUid: q.question_id || q.questionUid || `Q${String(count + 1).padStart(3, "0")}`,
        sourcePage: q.source_page ?? null,
        columnSide: q.column ?? null,
        passageId: q.passage_id ?? null,
        questionText: q.question_text || q.questionText || "",
        options: JSON.stringify(q.options || {}),
        hasMath: q.has_math ? 1 : 0,
        mathLatex: q.math_latex ?? null,
        questionType: q.question_type ?? null,
        subject: q.subject ?? null,
        topic: q.topic ?? null,
        difficulty: q.difficulty ?? null,
        extractionConfidence: q.extraction_confidence ?? null,
        needsReview: q.needs_review ? 1 : 0,
      });
      count++;
    } catch {
      // Skip malformed entries
    }
  }
  return count;
}

function formatQuestion(q: any, year: number, examId: number, paperId: number) {
  let options: Record<string, string> = {};
  try {
    options = typeof q.options === "string" ? JSON.parse(q.options) : q.options || {};
  } catch {}
  return {
    id: q.id,
    bankId: q.bankId,
    year,
    examId,
    paperId,
    questionUid: q.questionUid,
    sourcePage: q.sourcePage ?? null,
    passageId: q.passageId ?? null,
    questionText: q.questionText,
    options,
    hasMath: q.hasMath === 1,
    mathLatex: q.mathLatex ?? null,
    questionType: q.questionType ?? null,
    subject: q.subject ?? null,
    topic: q.topic ?? null,
    difficulty: q.difficulty ?? null,
    extractionConfidence: q.extractionConfidence ?? null,
    needsReview: q.needsReview === 1,
  };
}
