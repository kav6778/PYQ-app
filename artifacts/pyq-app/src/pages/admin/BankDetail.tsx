import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { CheckCircle, ArrowLeft, Eye, Loader2, ZoomIn } from "lucide-react";

interface PageInfo { pageNumber: number; imageUrl: string; }
interface QuestionDetail { id: number; questionUid: string; questionText: string; options: Record<string, string>; subject?: string; topic?: string; sourcePage?: number; needsReview: boolean; }
interface BankDetailData { id: number; examId: number; paperId: number; pdfName: string; year: number; status: string; totalPages?: number; totalQuestions?: number; pages: PageInfo[]; previewQuestions: QuestionDetail[]; }

function authHeaders() {
  const token = localStorage.getItem("pyq_token");
  return { Authorization: `Bearer ${token}` };
}

export default function BankDetail() {
  const { bankId } = useParams<{ bankId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const { data: bank, isLoading } = useQuery<BankDetailData>({
    queryKey: ["/api/admin/banks", bankId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/banks/${bankId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/banks/${bankId}/approve`, {
        method: "POST",
        headers: authHeaders(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks", bankId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!bank) {
    return <div className="p-6 text-gray-400">Bank not found.</div>;
  }

  const isApproved = bank.status === "approved";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{bank.pdfName}</h1>
            <p className="text-gray-400 text-sm">
              {bank.year} · {bank.totalPages ?? bank.pages.length} pages · {bank.totalQuestions ?? bank.previewQuestions.length} questions extracted
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isApproved ? (
            <span className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Approved & Live
            </span>
          ) : (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {approveMutation.isPending ? "Approving..." : "Approve & Publish"}
            </button>
          )}
        </div>
      </div>

      {approveMutation.isSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {approveMutation.data?.message || "Bank approved successfully!"}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Page thumbnails */}
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            Page Images ({bank.pages.length})
          </h2>
          {bank.pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-500 text-sm">
              No page images available yet. Processing may still be in progress.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[600px] overflow-y-auto pr-1">
              {bank.pages.map((page) => (
                <button
                  key={page.pageNumber}
                  onClick={() => setSelectedPage(page.pageNumber === selectedPage ? null : page.pageNumber)}
                  className={`relative rounded-lg overflow-hidden border transition group ${
                    selectedPage === page.pageNumber
                      ? "border-violet-500 ring-2 ring-violet-500/30"
                      : "border-white/10 hover:border-violet-500/50"
                  }`}
                >
                  <img
                    src={page.imageUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full object-cover aspect-[3/4] bg-gray-800"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-1 text-xs text-gray-300">
                    Pg {page.pageNumber}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Fullsize page view */}
          {selectedPage && (
            <div className="mt-3 rounded-xl overflow-hidden border border-violet-500/30">
              <div className="bg-black/30 px-3 py-2 text-xs text-gray-400 flex justify-between">
                <span>Page {selectedPage}</span>
                <button onClick={() => setSelectedPage(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <img
                src={bank.pages.find(p => p.pageNumber === selectedPage)?.imageUrl}
                alt={`Page ${selectedPage}`}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Extracted questions preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              Extracted Questions ({bank.previewQuestions.length} preview)
            </h2>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1 rounded-full transition"
            >
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
          </div>
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {bank.previewQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-500 text-sm">
                No questions extracted yet.
              </div>
            ) : (
              bank.previewQuestions.map((q) => (
                <QuestionPreviewCard key={q.id} q={q} showAnswers={showAnswers} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionPreviewCard({ q, showAnswers }: { q: QuestionDetail; showAnswers: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${q.needsReview ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
      {(q.subject || q.topic) && (
        <div className="flex gap-2 mb-2">
          {q.subject && <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{q.subject}</span>}
          {q.topic && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{q.topic}</span>}
          {q.needsReview && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Needs Review</span>}
        </div>
      )}
      <div className="flex gap-2">
        <span className="text-gray-500 text-xs font-mono mt-0.5 flex-shrink-0">{q.questionUid}</span>
        <p className="text-gray-200 text-sm leading-relaxed">{q.questionText}</p>
      </div>
      {showAnswers && Object.keys(q.options).length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-1">
          {Object.entries(q.options).map(([key, val]) => (
            <div key={key} className="flex gap-2 text-xs">
              <span className="text-gray-500 font-mono uppercase">{key}.</span>
              <span className="text-gray-400">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
