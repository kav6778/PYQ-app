import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examsTable, papersTable } from "./exams";

export const questionBanksTable = pgTable("question_banks", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id),
  paperId: integer("paper_id").notNull().references(() => papersTable.id),
  pdfName: text("pdf_name").notNull(),
  pdfStem: text("pdf_stem"),
  year: integer("year").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | ready | approved | failed
  totalPages: integer("total_pages"),
  totalQuestions: integer("total_questions"),
  pdfPath: text("pdf_path"),
  oddOnly: integer("odd_only").notNull().default(0), // 0|1
  skipCovers: integer("skip_covers").notNull().default(0), // 0|1
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  bankId: integer("bank_id").notNull().references(() => questionBanksTable.id),
  questionUid: text("question_uid").notNull(), // Q001 etc
  sourcePage: integer("source_page"),
  columnSide: text("column_side"),
  passageId: text("passage_id"),
  questionText: text("question_text").notNull(),
  options: text("options").notNull().default("{}"), // JSON string
  hasMath: integer("has_math").notNull().default(0), // 0|1
  mathLatex: text("math_latex"),
  questionType: text("question_type"),
  subject: text("subject"),
  topic: text("topic"),
  difficulty: text("difficulty"),
  extractionConfidence: real("extraction_confidence"),
  needsReview: integer("needs_review").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBankSchema = createInsertSchema(questionBanksTable).omit({ id: true, createdAt: true, approvedAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });

export type InsertBank = z.infer<typeof insertBankSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type QuestionBank = typeof questionBanksTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
