import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { db } from "@workspace/db";
import { questionBanksTable, questionsTable, examsTable, papersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "./auth";

export const adminRouter = Router();
adminRouter.use(requireAdmin as any);

const UPLOADS_DIR = path.resolve(process.cwd(), "../../project/uploads");
const PAGES_DIR = path.resolve(process.cwd(), "../../project/output/pages");
const QUESTIONS_DIR = path.resolve(process.cwd(), "../../project/output/questions");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ts = Date.now();
    cb(null, `${ts}_${file.originalname.replace(/\s+/g, "_")}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

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

// Get bank detail with pages
adminRouter.get("/banks/:bankId", async (req: Request, res: Response) => {
  const bankId = parseInt(req.params.bankId);
  const [bank] = await db
    .select({
      id: questionBanksTable.id,
      examId: questionBanksTable.examId,
      paperId: questionBanksTable.paperId,
      pdfName: questionBanksTable.pdfName,
      year: questionBanksTable.year,
      status: questionBanksTable.status,
      totalPages: questionBanksTable.totalPages,
      totalQuestions: questionBanksTable.totalQuestions,
    })
    .from(questionBanksTable)
    .where(eq(questionBanksTable.id, bankId))
    .limit(1);

  if (!bank) {
    res.status(404).json({ error: "Bank not found" });
    return;
  }

  // Build page image list from disk
  const pages: { pageNumber: number; imageUrl: string }[] = [];
  if (fs.existsSync(PAGES_DIR)) {
    const files = fs.readdirSync(PAGES_DIR)
      .filter(f => f.endsWith(".png") || f.endsWith(".jpg"))
      .sort();
    files.forEach((file, idx) => {
      pages.push({
        pageNumber: idx + 1,
        imageUrl: `/api/admin/pages/${bankId}/${idx + 1}`,
      });
    });
  }

  // Get preview questions from DB (first 20)
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.bankId, bankId))
    .limit(20);

  const previewQuestions = questions.map(q => formatQuestion(q, bank.year, bank.examId, bank.paperId));

  res.json({
    ...bank,
    pages,
    previewQuestions,
  });
});

// Serve page images
adminRouter.get("/pages/:bankId/:pageNum", async (req: Request, res: Response) => {
  const pageNum = parseInt(req.params.pageNum);
  if (!fs.existsSync(PAGES_DIR)) {
    res.status(404).json({ error: "No pages found" });
    return;
  }
  const files = fs.readdirSync(PAGES_DIR)
    .filter(f => f.endsWith(".png") || f.endsWith(".jpg"))
    .sort();
  const file = files[pageNum - 1];
  if (!file) {
    res.status(404).json({ error: "Page not found" });
    return;
  }
  res.sendFile(path.join(PAGES_DIR, file));
});

// Approve a bank
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

  if (bank.status === "approved") {
    res.json({ message: "Already approved" });
    return;
  }

  // If status is 'ready', import questions from JSON files
  if (bank.status === "ready") {
    const imported = await importQuestionsFromJson(bankId);
    await db
      .update(questionBanksTable)
      .set({ status: "approved", approvedAt: new Date(), totalQuestions: imported })
      .where(eq(questionBanksTable.id, bankId));
    res.json({ message: `Approved and imported ${imported} questions` });
    return;
  }

  // If pending/processing, just mark approved (questions may already exist)
  await db
    .update(questionBanksTable)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(questionBanksTable.id, bankId));
  res.json({ message: "Bank approved" });
});

// Upload PDF
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

  const [bank] = await db
    .insert(questionBanksTable)
    .values({
      examId,
      paperId,
      pdfName: req.file.originalname,
      year,
      status: "processing",
      pdfPath: req.file.path,
    })
    .returning();

  // Kick off the Python pipeline asynchronously
  const pythonArgs = [
    path.resolve(process.cwd(), "../../project/run_from_pages.py"),
    "--pdf", req.file.path,
    "--start_page", "1",
  ];
  if (skipCovers) pythonArgs.push("--skip-covers");
  if (oddOnly) pythonArgs.push("--odd-only");

  const child = spawn("python3", pythonArgs, {
    detached: true,
    stdio: "ignore",
    cwd: path.resolve(process.cwd(), "../../project"),
  });
  child.unref();

  res.status(201).json({
    bankId: bank.id,
    status: "processing",
    message: "PDF upload started. Processing in background. Refresh to see status.",
  });
});

async function importQuestionsFromJson(bankId: number): Promise<number> {
  if (!fs.existsSync(QUESTIONS_DIR)) return 0;
  const files = fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith(".json"));
  let count = 0;

  // Delete existing questions for this bank first
  await db.delete(questionsTable).where(eq(questionsTable.bankId, bankId));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(QUESTIONS_DIR, file), "utf-8");
      const data = JSON.parse(content);
      const questions = Array.isArray(data) ? data : [data];

      for (const q of questions) {
        await db.insert(questionsTable).values({
          bankId,
          questionUid: q.question_id || q.questionUid || `Q${String(count + 1).padStart(3, "0")}`,
          sourcePage: q.source_page || null,
          columnSide: q.column || null,
          passageId: q.passage_id || null,
          questionText: q.question_text || q.questionText || "",
          options: JSON.stringify(q.options || {}),
          hasMath: q.has_math ? 1 : 0,
          mathLatex: q.math_latex || null,
          questionType: q.question_type || null,
          subject: q.subject || null,
          topic: q.topic || null,
          difficulty: q.difficulty || null,
          extractionConfidence: q.extraction_confidence || null,
          needsReview: q.needs_review ? 1 : 0,
        });
        count++;
      }
    } catch (e) {
      // Skip malformed files
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
