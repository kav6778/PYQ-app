import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, ChevronLeft, ChevronRight, Loader2, BookOpen } from "lucide-react";
import QuestionCard from "./QuestionCard";
import PassageGroupCard from "./PassageGroupCard";

interface QuestionDetail {
  id: number; bankId: number; year: number; examId: number; paperId: number;
  questionUid: string; sourcePage?: number; passageId?: string;
  questionText: string; options: Record<string, string>;
  hasMath: boolean; mathLatex?: string; questionType?: string;
  subject?: string; topic?: string; difficulty?: string;
  extractionConfidence?: number; needsReview: boolean;
}

interface Props {
  examId: number | null; paperId: number | null;
  subject: string | null; topic: string | null;
  yearStart: number; yearEnd: number; search: string;
}

const PAGE_SIZE = 20;

function buildQueryParams(params: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

export default function BrowseMode({ examId, paperId, subject, topic, yearStart, yearEnd, search }: Props) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [page, setPage] = useState(1);

  const queryParams = buildQueryParams({
    examId, paperId, subject, topic, yearStart, yearEnd, search, page, limit: PAGE_SIZE
  });

  const { data, isLoading, isFetching } = useQuery<{
    questions: QuestionDetail[]; total: number; page: number; limit: number; totalPages: number;
  }>({
    queryKey: ["/api/questions", queryParams],
    queryFn: () => fetch(`/api/questions?${queryParams}`).then((r) => r.json()),
  });

  const questions = data?.questions ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Group questions by passageId (preserve order)
  const groups = useMemo(() => {
    const result: Array<{ type: "single"; question: QuestionDetail } | { type: "passage"; passageId: string; questions: QuestionDetail[] }> = [];
    const passageMap = new Map<string, QuestionDetail[]>();

    for (const q of questions) {
      if (q.passageId) {
        if (!passageMap.has(q.passageId)) {
          passageMap.set(q.passageId, []);
          result.push({ type: "passage", passageId: q.passageId, questions: passageMap.get(q.passageId)! });
        }
        passageMap.get(q.passageId)!.push(q);
      } else {
        result.push({ type: "single", question: q });
      }
    }
    return result;
  }, [questions]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          {isLoading ? (
            <span>Loading...</span>
          ) : (
            <span>{total.toLocaleString()} question{total !== 1 ? "s" : ""} found</span>
          )}
        </div>
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
            showAnswers
              ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
              : "text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
          }`}
        >
          {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showAnswers ? "Hide Answers" : "Show Answers"}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <span>Loading questions...</span>
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No questions found</p>
          <p className="text-gray-600 text-sm mt-1">Try adjusting your filters or selecting a different exam</p>
        </div>
      ) : (
        <>
          {isFetching && !isLoading && (
            <div className="text-center py-2 text-xs text-violet-400 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Refreshing...
            </div>
          )}

          <div className="space-y-4">
            {groups.map((group, i) =>
              group.type === "single" ? (
                <QuestionCard
                  key={group.question.id}
                  question={group.question}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  showAnswers={showAnswers}
                  onToggleAnswer={() => {}}
                />
              ) : (
                <PassageGroupCard
                  key={group.passageId}
                  questions={group.questions}
                  showAnswers={showAnswers}
                />
              )
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40 transition text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-gray-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-40 transition text-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
