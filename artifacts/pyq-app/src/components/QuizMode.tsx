import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, CheckCircle, XCircle, RefreshCw, Trophy, SkipForward, Loader2 } from "lucide-react";
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
  examId: number | null; paperId: number | null;
  subject: string | null; topic: string | null;
  yearStart: number; yearEnd: number;
}

type AnswerState = "unanswered" | "answered";

function buildQueryParams(params: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

export default function QuizMode({ examId, paperId, subject, topic, yearStart, yearEnd }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [quizComplete, setQuizComplete] = useState(false);

  const queryParams = buildQueryParams({
    examId, paperId, subject, topic, yearStart, yearEnd, page: 1, limit: 50
  });

  const { data, isLoading } = useQuery<{
    questions: QuestionDetail[]; total: number;
  }>({
    queryKey: ["/api/questions/quiz", queryParams],
    queryFn: () => fetch(`/api/questions?${queryParams}`).then((r) => r.json()),
  });

  const questions = data?.questions ?? [];
  const currentQ = questions[currentIdx];

  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setRevealed({});
    setQuizComplete(false);
  }, [queryParams]);

  const handleSelectOption = (key: string) => {
    if (answers[currentQ.id]) return; // already answered
    setAnswers((prev) => ({ ...prev, [currentQ.id]: key }));
    setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1);
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setAnswers({});
    setRevealed({});
    setQuizComplete(false);
  };

  // Calculate score
  const score = questions.reduce((acc, q) => {
    const userAns = answers[q.id];
    if (!userAns) return acc;
    // We don't store the correct answer server-side yet; for now just count answered
    // In a real app, the server would return the correct answer key
    return acc + 1;
  }, 0);
  const attempted = Object.keys(answers).length;
  const skipped = questions.length - attempted;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-24 text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span>Loading quiz questions...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-24">
        <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">No questions to quiz on</p>
        <p className="text-gray-600 text-sm mt-1">Adjust your filters or select a different exam/paper</p>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-gray-400 mb-6">
            You attempted {attempted} out of {questions.length} questions.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{attempted}</div>
              <div className="text-gray-500 text-sm">Attempted</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-amber-400">{skipped}</div>
              <div className="text-gray-500 text-sm">Skipped</div>
            </div>
          </div>

          {/* Answer review */}
          <div className="text-left mb-6 space-y-2 max-h-64 overflow-y-auto">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                <span className="text-gray-500 text-xs w-6 flex-shrink-0">Q{i + 1}</span>
                <p className="text-gray-300 truncate flex-1">{q.questionText.slice(0, 60)}...</p>
                {answers[q.id] ? (
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full flex-shrink-0">
                    {answers[q.id].toUpperCase()}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600 flex-shrink-0">Skipped</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleRestart}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const userAnswer = answers[currentQ.id] ?? null;
  const isRevealed = revealed[currentQ.id] ?? false;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{attempted} answered · {skipped} skipped</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question navigation dots (compact, up to 20) */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {questions.slice(0, 20).map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIdx(i)}
            className={`w-7 h-7 rounded-full text-xs font-medium transition ${
              i === currentIdx
                ? "bg-violet-600 text-white"
                : answers[q.id]
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
            }`}
          >
            {i + 1}
          </button>
        ))}
        {questions.length > 20 && (
          <span className="text-xs text-gray-600 self-center">+{questions.length - 20} more</span>
        )}
      </div>

      {/* Question card */}
      <QuestionCard
        question={currentQ}
        showAnswers={isRevealed}
        selectedOption={userAnswer}
        onSelectOption={handleSelectOption}
        showResult={isRevealed}
      />

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition text-sm"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2">
          {!userAnswer && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition text-sm"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition"
          >
            {currentIdx === questions.length - 1 ? (
              <>Finish Quiz →</>
            ) : (
              <>Next →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
