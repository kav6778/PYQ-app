import React from "react";
import { useRoute, Link } from "wouter";
import { ChevronLeft, Flag, CheckCircle, FileText } from "lucide-react";
import { useQuestionDetail } from "@/hooks/use-questions";
import { MathText } from "@/components/MathText";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function QuestionDetail() {
  const [, params] = useRoute("/question/:id");
  const id = params?.id || "";
  
  const { data: question, isLoading, isError } = useQuestionDetail(id);
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
        <div className="h-64 glass-card rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (isError || !question) {
    return (
      <div className="p-6 md:p-12 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold">Question Not Found</h2>
        <Button asChild className="mt-4"><Link href="/browse">Back to Browse</Link></Button>
      </div>
    );
  }

  const hasOptions = question.options && Object.keys(question.options).length > 0 && Object.values(question.options).some(v => v.trim() !== "");

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-32">
      <Button variant="ghost" asChild className="mb-6 -ml-4">
        <Link href="/browse"><ChevronLeft className="w-4 h-4 mr-1"/> Back</Link>
      </Button>

      {/* Header Info */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold">{question.question_id}</h1>
        <Badge variant="default">{question.subject}</Badge>
        <Badge variant="secondary">{question.topic}</Badge>
        <Badge variant="outline" className="ml-auto bg-black/20 text-xs">
          Confidence: {Math.round(question.extraction_confidence * 100)}%
        </Badge>
      </div>

      {/* Passage (if any) */}
      {question.passage_id && (
        <div className="mb-6 p-5 rounded-2xl bg-primary/5 border border-primary/20 flex gap-4 items-start">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-primary mb-1">Passage Based Question ({question.passage_id})</h4>
            <p className="text-sm text-primary/80">This question is part of a larger comprehension passage.</p>
          </div>
        </div>
      )}

      {/* Main Question Body */}
      <div className="glass-card rounded-3xl p-6 md:p-10 mb-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10">
          <MathText 
            text={question.question_text} 
            latex={question.math_latex} 
            className="text-lg md:text-xl text-foreground font-medium leading-relaxed"
          />
        </div>
      </div>

      {/* Options */}
      {hasOptions ? (
        <div className="space-y-4 mb-10">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pl-2">Select an option</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(question.options).map(([letter, text]) => {
              if (!text.trim()) return null;
              
              const isSelected = selectedOption === letter;
              // In study mode, we simulate 'A' as correct just to show UI capability
              const isMockCorrect = letter === 'A'; 
              
              let cardClass = "glass-card border-white/5 hover:border-primary/50 cursor-pointer";
              if (isSelected && !showAnswer) cardClass = "bg-primary/20 border-primary ring-1 ring-primary";
              if (showAnswer) {
                if (isMockCorrect) cardClass = "bg-green-500/20 border-green-500 text-green-50";
                else if (isSelected && !isMockCorrect) cardClass = "bg-red-500/20 border-red-500 text-red-50 opacity-70";
                else cardClass = "opacity-50 grayscale border-white/5";
              }

              return (
                <div 
                  key={letter}
                  onClick={() => !showAnswer && setSelectedOption(letter)}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex gap-4 items-start ${cardClass}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border ${showAnswer && isMockCorrect ? 'bg-green-500 text-black border-transparent' : isSelected && !showAnswer ? 'bg-primary text-white border-transparent' : 'bg-black/40 border-white/20'}`}>
                    {letter}
                  </div>
                  <div className="mt-1 flex-1">
                    <MathText text={text} />
                  </div>
                  {showAnswer && isMockCorrect && <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-10 p-6 glass-card rounded-2xl border-dashed border-2 border-white/10 text-center">
          <p className="text-muted-foreground">This is a {question.question_type} question. No options provided.</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="fixed bottom-0 md:bottom-auto left-0 md:left-auto right-0 md:right-auto md:w-full max-w-4xl bg-background/80 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-white/10 md:border-none p-4 md:p-0 z-20 flex items-center justify-between">
        <Button variant="outline" className="text-muted-foreground">
          <Flag className="w-4 h-4 mr-2" /> Report Error
        </Button>
        
        <Button 
          size="lg" 
          onClick={() => setShowAnswer(!showAnswer)}
          className={showAnswer ? "bg-white text-black hover:bg-gray-200" : ""}
        >
          {showAnswer ? "Hide Answer" : "Reveal Answer"}
        </Button>
      </div>

      {showAnswer && (
        <div className="mt-8 p-6 rounded-2xl bg-secondary border border-white/5 animate-in fade-in slide-in-from-bottom-4">
          <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Solution Context
          </h4>
          <p className="text-muted-foreground leading-relaxed text-sm">
            <strong className="text-white">Mock Note:</strong> The current API schema does not provide a definitive 'correct_answer' key. For demonstration purposes, Option A is highlighted. In a real scenario, this section would explain the step-by-step solution.
          </p>
          <div className="mt-4 pt-4 border-t border-white/5 flex text-xs text-muted-foreground gap-4">
            <span>Source: {question.source_pdf}</span>
            <span>Page: {question.source_page}</span>
          </div>
        </div>
      )}
    </div>
  );
}
