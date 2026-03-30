import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // 'UPSC Prelims', 'TNPSC Group 1'
  slug: text("slug").notNull().unique(), // 'upsc-prelims', 'tnpsc-group-1'
  createdAt: timestamp("created_at").defaultNow(),
});

export const papersTable = pgTable("papers", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id),
  name: text("name").notNull(), // 'GS1', 'GS2/CSAT'
  slug: text("slug").notNull(), // 'gs1', 'csat'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true });
export const insertPaperSchema = createInsertSchema(papersTable).omit({ id: true, createdAt: true });

export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Exam = typeof examsTable.$inferSelect;
export type Paper = typeof papersTable.$inferSelect;
