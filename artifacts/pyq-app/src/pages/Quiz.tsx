import React from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Play, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useListQuestions, useGetQuestionStats } from "@workspace/api-client-react";
import { Button } from "@/components/ui/Button";
import { MathText } from "@/components/MathText";

export function Quiz() {
  const [isStarted, setIsStarted] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<string>("Physics");
  
  const { data: stats } = useGetQuestionStats();

  if (!isStarted) {
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
          
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl font-display font-bold mb-2">Quiz Mode</h2>
          <p className="text-muted-foreground mb-8">Test your knowledge with random questions from the database.</p>
          
          <div className="space-y-4 mb-8">
            <label className="block text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Subject</label>
            <div className="grid grid-cols-2 gap-3">
              {stats?.by_subject && Object.keys(stats.by_subject).map(sub => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedSubject === sub 
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                      : "bg-black/20 border-white/10 hover:border-white/30 text-muted-foreground"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
          
          <Button size="lg" className="w-full h-14 text-lg" onClick={() => setIsStarted(true)}>
            Start Session <Play className="w-5 h-5 ml-2 fill-current" />
          </Button>
        </div>
      </div>
    );
  }

  return <ActiveQuiz subject={selectedSubject} onExit={() => setIsStarted(false)} />;
}

function ActiveQuiz({ subject, onExit }: { subject: string, onExit: () => void }) {
  const { data, isLoading } = useListQuestions({ subject, limit: 10 });
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [score, setScore] = React.useState(0);

  const questions = data?.questions || [];
  const currentQ = questions[currentIndex];

  const handleSelect = (opt: string) => {
    if (isRevealed) return;
    setSelectedOption(opt);
  };

  const handleReveal = () => {
    if (!selectedOption) return;
    setIsRevealed(true);
    // Mock logic: assume A is correct
    if (selectedOption === 'A') {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
      setIsRevealed(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!currentQ) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <h2 className="text-3xl font-display font-bold mb-4">Quiz Complete!</h2>
        <p className="text-xl text-muted-foreground mb-8">You scored {score} out of {questions.length}</p>
        <Button onClick={onExit}>Back to Setup</Button>
      </div>
    );
  }

  const progress = ((currentIndex) / questions.length) * 100;
  const isMockCorrect = selectedOption === 'A'; // Simulated

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 min-h-full flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={onExit} className="text-muted-foreground">Exit</Button>
        <div className="flex-1 max-w-xs mx-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>Score: {score}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.question_id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col"
        >
          {/* Question */}
          <div className="glass-card p-6 md:p-8 rounded-3xl mb-8 border border-white/5">
            <MathText text={currentQ.question_text} latex={currentQ.math_latex} className="text-lg md:text-xl font-medium" />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-4 mb-10">
            {Object.entries(currentQ.options || {}).map(([letter, text]) => {
              if (!text.trim()) return null;
              
              const isSelected = selectedOption === letter;
              const isCorrectOpt = letter === 'A'; // Simulated correct answer
              
              let bg = "bg-black/20 hover:bg-white/5 border-white/10";
              let textCol = "text-foreground";
              
              if (isSelected && !isRevealed) {
                bg = "bg-primary/20 border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]";
              } else if (isRevealed) {
                if (isCorrectOpt) {
                  bg = "bg-green-500/20 border-green-500";
                  textCol = "text-green-50";
                } else if (isSelected && !isCorrectOpt) {
                  bg = "bg-red-500/20 border-red-500";
                  textCol = "text-red-50";
                } else {
                  bg = "bg-black/10 border-transparent opacity-50";
                }
              }

              return (
                <button
                  key={letter}
                  onClick={() => handleSelect(letter)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${bg} ${textCol}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-sm font-bold ${
                    isRevealed && isCorrectOpt ? 'bg-green-500 text-black border-transparent' :
                    isRevealed && isSelected && !isCorrectOpt ? 'bg-red-500 text-black border-transparent' :
                    isSelected ? 'bg-primary border-transparent text-white' : 'border-white/20'
                  }`}>
                    {letter}
                  </div>
                  <div className="flex-1">
                    <MathText text={text} />
                  </div>
                  {isRevealed && isCorrectOpt && <CheckCircle2 className="w-6 h-6 text-green-400" />}
                  {isRevealed && isSelected && !isCorrectOpt && <XCircle className="w-6 h-6 text-red-400" />}
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-6 flex justify-end">
            {!isRevealed ? (
              <Button size="lg" disabled={!selectedOption} onClick={handleReveal} className="w-full md:w-auto">
                Check Answer
              </Button>
            ) : (
              <Button size="lg" onClick={handleNext} className="w-full md:w-auto bg-white text-black hover:bg-gray-200">
                Next Question <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
