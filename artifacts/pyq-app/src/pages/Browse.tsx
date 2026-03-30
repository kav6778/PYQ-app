import React from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight, Calculator, FileText } from "lucide-react";
import { useQuestionBrowser } from "@/hooks/use-questions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MathText } from "@/components/MathText";
import type { Question } from "@workspace/api-client-react/src/generated/api.schemas";

export function Browse() {
  const { data, isLoading, filters, updateFilters } = useQuestionBrowser();
  const [searchInput, setSearchInput] = React.useState(filters.search || "");
  const [showFilters, setShowFilters] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Browse and filter previous year questions.</p>
        </div>
        
        <form onSubmit={handleSearch} className="w-full md:w-96 relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search questions..." 
              className="pl-10 bg-black/20"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className="px-3">
            <Filter className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="p-4 glass-card rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Subject</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                  value={filters.subject || ""}
                  onChange={(e) => updateFilters({ subject: e.target.value })}
                >
                  <option value="">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Maths">Mathematics</option>
                  <option value="unclassified">Unclassified</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Type</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                  value={filters.question_type || ""}
                  onChange={(e) => updateFilters({ question_type: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="MCQ">Multiple Choice</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="integer">Integer</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setSearchInput("");
                    updateFilters({ subject: "", topic: "", search: "", question_type: "", page: "1" });
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 glass-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.questions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <img 
              src={`${import.meta.env.BASE_URL}images/empty-state.png`} 
              alt="No results" 
              className="w-64 h-64 object-contain opacity-50 mix-blend-screen mb-6"
            />
            <h3 className="text-xl font-display font-bold">No questions found</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              We couldn't find any questions matching your current filters. Try clearing them or searching for something else.
            </p>
            <Button className="mt-6" onClick={() => updateFilters({ search: "", subject: "", question_type: "" })}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Showing {data.questions.length} of {data.total} questions
            </p>
            {data.questions.map((q, i) => (
              <QuestionListItem key={q.question_id} question={q} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
          <Button 
            variant="outline" 
            disabled={data.page <= 1}
            onClick={() => updateFilters({ page: String(data.page - 1) })}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page <span className="text-white font-medium">{data.page}</span> of {data.total_pages}
          </span>
          <Button 
            variant="outline" 
            disabled={data.page >= data.total_pages}
            onClick={() => updateFilters({ page: String(data.page + 1) })}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function QuestionListItem({ question, index }: { question: Question, index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/question/${question.question_id}`}>
        <div className="p-5 glass-card rounded-2xl hover:border-primary/40 hover:bg-white/[0.03] transition-all cursor-pointer group block">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-black/20">{question.question_id}</Badge>
              <Badge variant={question.subject === 'unclassified' ? 'outline' : 'default'}>
                {question.subject}
              </Badge>
              <Badge variant="secondary" className="bg-white/5 text-muted-foreground">
                {question.topic}
              </Badge>
            </div>
            <div className="flex gap-2 text-muted-foreground shrink-0">
              {question.has_math && <Calculator className="w-4 h-4" />}
              {question.passage_id && <FileText className="w-4 h-4" />}
            </div>
          </div>
          
          <div className="text-foreground line-clamp-3 mb-4 text-sm leading-relaxed">
            {question.question_text}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-3">
            <div className="flex gap-4">
              <span>{question.question_type}</span>
              {question.extraction_confidence < 0.8 && (
                <span className="text-amber-400">Low confidence OCR</span>
              )}
            </div>
            <span>Source: {question.source_pdf.replace('.pdf', '')} (Pg {question.source_page})</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
