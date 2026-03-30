import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { examsTable, papersTable, questionsTable, questionBanksTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const examsRouter = Router();

examsRouter.get("/", async (_req: Request, res: Response) => {
  const exams = await db.select().from(examsTable).orderBy(examsTable.name);
  res.json({ exams: exams.map(e => ({ id: e.id, name: e.name, slug: e.slug })) });
});

examsRouter.get("/:examId/papers", async (req: Request, res: Response) => {
  const examId = parseInt(req.params.examId);
  const papers = await db.select().from(papersTable).where(eq(papersTable.examId, examId)).orderBy(papersTable.name);
  res.json({ papers: papers.map(p => ({ id: p.id, examId: p.examId, name: p.name, slug: p.slug })) });
});

examsRouter.get("/:examId/papers/:paperId/subjects", async (req: Request, res: Response) => {
  const examId = parseInt(req.params.examId);
  const paperId = parseInt(req.params.paperId);

  // Get approved banks for this exam+paper
  const banks = await db
    .select({ id: questionBanksTable.id })
    .from(questionBanksTable)
    .where(and(
      eq(questionBanksTable.examId, examId),
      eq(questionBanksTable.paperId, paperId),
      eq(questionBanksTable.status, "approved")
    ));

  if (banks.length === 0) {
    res.json({ subjects: [] });
    return;
  }

  const bankIds = banks.map(b => b.id);

  // Get subjects and their counts
  const subjectRows = await db
    .select({
      subject: questionsTable.subject,
      topic: questionsTable.topic,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(questionsTable)
    .where(sql`${questionsTable.bankId} = ANY(${sql`ARRAY[${sql.join(bankIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`)
    .groupBy(questionsTable.subject, questionsTable.topic)
    .orderBy(questionsTable.subject, questionsTable.topic);

  // Build subject -> topics map
  const map = new Map<string, { count: number; topics: Map<string, number> }>();
  for (const row of subjectRows) {
    const subj = row.subject || "General";
    const topic = row.topic || "General";
    if (!map.has(subj)) map.set(subj, { count: 0, topics: new Map() });
    const entry = map.get(subj)!;
    entry.count += row.count;
    entry.topics.set(topic, (entry.topics.get(topic) || 0) + row.count);
  }

  const subjects = Array.from(map.entries()).map(([subject, data]) => ({
    subject,
    count: data.count,
    topics: Array.from(data.topics.entries()).map(([topic, count]) => ({ topic, count })),
  }));

  res.json({ subjects });
});
