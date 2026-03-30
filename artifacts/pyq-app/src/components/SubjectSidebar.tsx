import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, BookMarked } from "lucide-react";
import { useState } from "react";

interface TopicCount { topic: string; count: number; }
interface SubjectWithTopics { subject: string; count: number; topics: TopicCount[]; }

interface Props {
  examId: number | null;
  paperId: number | null;
  selectedSubject: string | null;
  selectedTopic: string | null;
  onSelect: (subject: string | null, topic: string | null) => void;
}

export default function SubjectSidebar({ examId, paperId, selectedSubject, selectedTopic, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<{ subjects: SubjectWithTopics[] }>({
    queryKey: ["/api/exams", examId, "papers", paperId, "subjects"],
    queryFn: async () => {
      if (!examId || !paperId) return { subjects: [] };
      const res = await fetch(`/api/exams/${examId}/papers/${paperId}/subjects`);
      return res.json();
    },
    enabled: !!(examId && paperId),
  });

  const subjects = data?.subjects ?? [];

  const toggleExpand = (subject: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Subjects</div>

        {/* All subjects button */}
        <button
          onClick={() => onSelect(null, null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition mb-1 ${
            !selectedSubject
              ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5" />
            All Subjects
          </span>
        </button>

        {!examId || !paperId ? (
          <p className="text-gray-600 text-xs px-2 mt-4">
            Select an exam and paper to see subjects.
          </p>
        ) : isLoading ? (
          <div className="px-2 mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <p className="text-gray-600 text-xs px-2 mt-4">No approved questions yet for this paper.</p>
        ) : (
          <div className="space-y-0.5">
            {subjects.map((s) => {
              const isActive = selectedSubject === s.subject;
              const isOpen = expanded.has(s.subject);

              return (
                <div key={s.subject}>
                  <button
                    onClick={() => {
                      onSelect(s.subject, null);
                      if (s.topics.length > 0) toggleExpand(s.subject);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="text-left truncate">{s.subject}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs opacity-60">{s.count}</span>
                      {s.topics.length > 0 && (
                        isOpen
                          ? <ChevronDown className="w-3 h-3" />
                          : <ChevronRight className="w-3 h-3" />
                      )}
                    </div>
                  </button>

                  {/* Topics */}
                  {isOpen && s.topics.length > 0 && (
                    <div className="ml-3 border-l border-white/10 pl-2 mt-0.5 space-y-0.5">
                      {s.topics.map((t) => {
                        const isTopicActive = isActive && selectedTopic === t.topic;
                        return (
                          <button
                            key={t.topic}
                            onClick={(e) => { e.stopPropagation(); onSelect(s.subject, t.topic); }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                              isTopicActive
                                ? "bg-blue-600/20 text-blue-300 border border-blue-500/20"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                            }`}
                          >
                            <span className="text-left truncate">{t.topic}</span>
                            <span className="opacity-60 flex-shrink-0 ml-1">{t.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
