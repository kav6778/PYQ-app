import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Hash } from "lucide-react";

interface QuestionDetail {
  id: number; bankId: number; year: number; examId: number; paperId: number;
  questionUid: string; sourcePage?: number; passageId?: string;
  questionText: string; options: Record<string, string>;
  hasMath: boolean; mathLatex?: string; questionType?: string;
  subject?: string; topic?: string; difficulty?: string;
  extractionConfidence?: number; needsReview: boolean;
}

interface Props {
  question: QuestionDetail;
  index?: number;
  showAnswers: boolean;
  onToggleAnswer?: () => void;
  compact?: boolean;
  selectedOption?: string | null;
  onSelectOption?: (key: string) => void;
  showResult?: boolean;
  correctKey?: string;
}

const OPTION_COLORS: Record<string, string> = {
  a: "hover:border-violet-500/50 hover:bg-violet-500/10",
  b: "hover:border-blue-500/50 hover:bg-blue-500/10",
  c: "hover:border-emerald-500/50 hover:bg-emerald-500/10",
  d: "hover:border-amber-500/50 hover:bg-amber-500/10",
};

const SELECTED_COLORS: Record<string, string> = {
  a: "border-violet-500 bg-violet-500/15 text-violet-200",
  b: "border-blue-500 bg-blue-500/15 text-blue-200",
  c: "border-emerald-500 bg-emerald-500/15 text-emerald-200",
  d: "border-amber-500 bg-amber-500/15 text-amber-200",
};

export default function QuestionCard({
  question,
  index,
  showAnswers,
  onToggleAnswer,
  compact = false,
  selectedOption = null,
  onSelectOption,
  showResult = false,
  correctKey,
}: Props) {
  const [localShow, setLocalShow] = useState(false);
  const revealed = showAnswers || localShow;
  const optionKeys = Object.keys(question.options).sort();
  const isQuizMode = !!onSelectOption;

  return (
    <div className={`rounded-xl border bg-white/5 transition ${question.needsReview ? "border-amber-500/20" : "border-white/10"} ${compact ? "p-3" : "p-5"}`}>
      {/* Tags row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {index && (
          <span className="text-xs text-gray-600 font-mono flex items-center gap-0.5">
            <Hash className="w-3 h-3" />{index}
          </span>
        )}
        <span className="text-xs bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full">{question.year}</span>
        {question.subject && (
          <span className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">
            {question.subject}
          </span>
        )}
        {question.topic && (
          <span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full">
            {question.topic}
          </span>
        )}
        {question.needsReview && (
          <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Review
          </span>
        )}
      </div>

      {/* Question text */}
      <p className={`text-gray-100 leading-relaxed mb-4 ${compact ? "text-sm" : "text-base"}`}>
        {question.questionText}
      </p>

      {/* Options */}
      {optionKeys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {optionKeys.map((key) => {
            const isSelected = selectedOption === key;
            const isCorrect = correctKey === key;
            const isWrong = showResult && isSelected && !isCorrect;
            const showCorrectHighlight = showResult && isCorrect && (selectedOption !== null || revealed);

            let className = `flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm transition text-left `;
            if (showCorrectHighlight) {
              className += "border-emerald-500 bg-emerald-500/15 text-emerald-200";
            } else if (isWrong) {
              className += "border-red-500 bg-red-500/15 text-red-200";
            } else if (isSelected && !showResult) {
              className += SELECTED_COLORS[key.toLowerCase()] || "border-violet-500 bg-violet-500/15 text-violet-200";
            } else {
              className += `border-white/10 text-gray-300 ${isQuizMode ? (OPTION_COLORS[key.toLowerCase()] || "hover:border-white/20") + " cursor-pointer" : ""}`;
            }

            return (
              <button
                key={key}
                onClick={() => isQuizMode && !showResult && onSelectOption?.(key)}
                disabled={!isQuizMode || showResult}
                className={className}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-semibold uppercase mt-0.5 ${
                  isSelected || showCorrectHighlight || isWrong ? "border-current" : "border-white/20 text-gray-500"
                }`}>
                  {key}
                </span>
                <span className="flex-1">{question.options[key]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Show answer toggle (browse mode only) */}
      {!isQuizMode && onToggleAnswer !== undefined && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setLocalShow(!localShow)}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition"
          >
            {localShow ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {localShow ? "Hide answer" : "Show answer"}
          </button>
        </div>
      )}
    </div>
  );
}
