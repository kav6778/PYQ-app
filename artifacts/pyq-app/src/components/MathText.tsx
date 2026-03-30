import React from "react";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  latex?: string | null;
  className?: string;
}

export function MathText({ text, latex, className }: MathTextProps) {
  // A simple heuristic to detect if text itself contains inline math.
  // Real implementation might need a robust regex parser to split text and math.
  // For this app, we'll render text normally, and if math_latex is provided, render it below as a block.
  
  return (
    <div className={className}>
      <div className="whitespace-pre-wrap leading-relaxed">
        {text}
      </div>
      {latex && (
        <div className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5 overflow-x-auto">
          <BlockMath math={latex} />
        </div>
      )}
    </div>
  );
}
