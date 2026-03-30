import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { questionsTable, questionBanksTable } from "@workspace/db/schema";
import { eq, and, gte, lte, like, sql, inArray } from "drizzle-orm";

export const questionsRouter = Router();

questionsRouter.get("/stats", async (req: Request, res: Response) => {
  const { examId, paperId } = req.query;

  const bankFilter = await getApprovedBankIds(
    examId ? parseInt(examId as string) : undefined,
    paperId ? parseInt(paperId as string) : undefined
  );
  if (bankFilter.length === 0) {
    res.json({ total: 0, bySubject: {}, byTopic: {}, byYear: {}, needsReviewCount: 0, mathCount: 0 });
    return;
  }

  const allQuestions = await db
    .select({
      subject: questionsTable.subject,
      topic: questionsTable.topic,
      hasMath: questionsTable.hasMath,
      needsReview: questionsTable.needsReview,
      year: questionBanksTable.year,
    })
    .from(questionsTable)
    .innerJoin(questionBanksTable, eq(questionsTable.bankId, questionBanksTable.id))
    .where(inArray(questionsTable.bankId, bankFilter));

  const bySubject: Record<string, number> = {};
  const byTopic: Record<string, number> = {};
  const byYear: Record<string, number> = {};
  let needsReviewCount = 0;
  let mathCount = 0;

  for (const q of allQuestions) {
    const subj = q.subject || "General";
    const topic = q.topic || "General";
    const year = String(q.year);
    bySubject[subj] = (bySubject[subj] || 0) + 1;
    byTopic[topic] = (byTopic[topic] || 0) + 1;
    byYear[year] = (byYear[year] || 0) + 1;
    if (q.needsReview === 1) needsReviewCount++;
    if (q.hasMath === 1) mathCount++;
  }

  res.json({ total: allQuestions.length, bySubject, byTopic, byYear, needsReviewCount, mathCount });
});

questionsRouter.get("/:questionId", async (req: Request, res: Response) => {
  const questionId = parseInt(req.params.questionId);
  if (isNaN(questionId)) {
    res.status(400).json({ error: "Invalid question ID" });
    return;
  }
  const [row] = await db
    .select()
    .from(questionsTable)
    .innerJoin(questionBanksTable, eq(questionsTable.bankId, questionBanksTable.id))
    .where(eq(questionsTable.id, questionId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json(formatQuestion(row.questions, row.question_banks));
});

questionsRouter.get("/", async (req: Request, res: Response) => {
  const {
    examId,
    paperId,
    subject,
    topic,
    yearStart,
    yearEnd,
    search,
    page = "1",
    limit = "20",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const bankFilter = await getApprovedBankIds(
    examId ? parseInt(examId) : undefined,
    paperId ? parseInt(paperId) : undefined,
    yearStart ? parseInt(yearStart) : undefined,
    yearEnd ? parseInt(yearEnd) : undefined
  );

  if (bankFilter.length === 0) {
    res.json({ questions: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
    return;
  }

  const conditions: any[] = [inArray(questionsTable.bankId, bankFilter)];
  if (subject) conditions.push(eq(questionsTable.subject, subject));
  if (topic) conditions.push(eq(questionsTable.topic, topic));
  if (search) conditions.push(like(questionsTable.questionText, `%${search}%`));

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(questionsTable)
    .where(whereClause);

  const total = countResult.count;
  const totalPages = Math.ceil(total / limitNum);

  const rows = await db
    .select()
    .from(questionsTable)
    .innerJoin(questionBanksTable, eq(questionsTable.bankId, questionBanksTable.id))
    .where(whereClause)
    .orderBy(questionBanksTable.year, questionsTable.sourcePage, questionsTable.questionUid)
    .limit(limitNum)
    .offset(offset);

  const questions = rows.map(r => formatQuestion(r.questions, r.question_banks));

  res.json({ questions, total, page: pageNum, limit: limitNum, totalPages });
});

async function getApprovedBankIds(examId?: number, paperId?: number, yearStart?: number, yearEnd?: number): Promise<number[]> {
  const conditions: any[] = [eq(questionBanksTable.status, "approved")];
  if (examId) conditions.push(eq(questionBanksTable.examId, examId));
  if (paperId) conditions.push(eq(questionBanksTable.paperId, paperId));
  if (yearStart) conditions.push(gte(questionBanksTable.year, yearStart));
  if (yearEnd) conditions.push(lte(questionBanksTable.year, yearEnd));

  const banks = await db
    .select({ id: questionBanksTable.id })
    .from(questionBanksTable)
    .where(and(...conditions));

  return banks.map(b => b.id);
}

function formatQuestion(q: any, bank: any) {
  let options: Record<string, string> = {};
  try {
    options = typeof q.options === "string" ? JSON.parse(q.options) : q.options || {};
  } catch {}
  return {
    id: q.id,
    bankId: q.bankId,
    year: bank.year,
    examId: bank.examId,
    paperId: bank.paperId,
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
