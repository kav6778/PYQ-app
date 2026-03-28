import { useState } from "react";
import { ChevronLeft, ChevronRight, AlignLeft } from "lucide-react";
import QuestionCard from "./QuestionCard";

interface QuestionDetail {
  id: number; bankId: number; year: number; examId: number; paperId: number;
  questionUid: string; sourcePage?: number; passageId?: string;
  questionText: string; options: Record<string, string>;
  hasMath: boolean; mathLatex?: string; questionType?: string;
  subject?: string; topic?: string; difficulty?: string;
  extractionConfidence?: number; needsReview: boolean;
}

interface Props {
  questions: QuestionDetail[];
  showAnswers: boolean;
}

// Naive: treat first question's text up to first "?" as passage if it's long
// (In a real app the passage comes from the PDF extraction)
function extractPassageText(q: QuestionDetail): string | null {
  const text = q.questionText;
  // If it's very long (>300 chars) and has no clear question marker, treat it as a passage
  if (text.length > 300) {
    const questionStart = text.search(/\n\s*Q[0-9]/i);
    if (questionStart > 100) return text.slice(0, questionStart).trim();
  }
  return null;
}

export default function PassageGroupCard({ questions, showAnswers }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (questions.length === 0) return null;

  // Try to extract a passage from the first question text
  const passageText = extractPassageText(questions[0]);
  const currentQ = questions[currentIdx];

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border-b border-cyan-500/20">
        <AlignLeft className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-300 text-sm font-medium">Passage Group</span>
        <span className="ml-auto text-xs text-cyan-500">{questions.length} questions</span>
      </div>

      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/10">
        {/* Left: passage */}
        {passageText && (
          <div className="lg:w-1/2 p-4 overflow-y-auto max-h-[500px]">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Passage</div>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{passageText}</p>
          </div>
        )}

        {/* Right: current question */}
        <div className={`${passageText ? "lg:w-1/2" : "w-full"} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2">
                {currentIdx + 1}/{questions.length}
              </span>
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <QuestionCard
            question={currentQ}
            showAnswers={showAnswers}
            compact
            onToggleAnswer={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
