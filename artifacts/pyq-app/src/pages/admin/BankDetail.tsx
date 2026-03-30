import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  CheckCircle, ArrowLeft, Eye, Loader2, ZoomIn, Trash2,
  Pencil, X, RefreshCw, AlertCircle, Clock
} from "lucide-react";

interface PageInfo { pageNumber: number; imageUrl: string; filename: string; }
interface QuestionDetail {
  id: number; questionUid: string; questionText: string;
  options: Record<string, string>; subject?: string; topic?: string;
  sourcePage?: number; needsReview: boolean; difficulty?: string;
}
interface BankDetailData {
  id: number; examId: number; paperId: number; pdfName: string;
  year: number; status: string; oddOnly: boolean;
  totalPages?: number; totalQuestions?: number;
  pages: PageInfo[]; questions: QuestionDetail[];
}

function authHeaders() {
  const token = localStorage.getItem("pyq_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function BankDetail() {
  const { bankId } = useParams<{ bankId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDetail | null>(null);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<string | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<number | null>(null);

  const { data: bank, isLoading, refetch } = useQuery<BankDetailData>({
    queryKey: ["/api/admin/banks", bankId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/banks/${bankId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    refetchInterval: (data) =>
      data?.state?.data?.status === "processing" ? 5000 : false,
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

  const deletePageMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/admin/banks/${bankId}/pages/${filename}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      return res.json();
    },
    onSuccess: () => {
      setDeleteConfirmPage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks", bankId] });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const res = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      return res.json();
    },
    onSuccess: () => {
      setDeleteConfirmQuestion(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banks", bankId] });
    },
  });

  const editQuestionMutation = useMutation({
    mutationFn: async (q: QuestionDetail) => {
      const res = await fetch(`/api/admin/questions/${q.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          questionText: q.questionText,
          options: q.options,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          needsReview: q.needsReview,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      setEditingQuestion(null);
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

  const pages = bank.pages ?? [];
  const questions = bank.questions ?? [];
  const isApproved = bank.status === "approved";
  const isProcessing = bank.status === "processing";
  const isFailed = bank.status === "failed";
  const isReady = bank.status === "ready";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{bank.pdfName}</h1>
            <p className="text-gray-400 text-sm">
              {bank.year} · {pages.length} pages shown · {questions.length} questions
              {bank.oddOnly && <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">English only</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => refetch()}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isApproved ? (
            <span className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-4 py-2 rounded-lg text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Approved & Live
            </span>
          ) : isProcessing ? (
            <span className="flex items-center gap-2 text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-lg text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" /> Processing…
            </span>
          ) : isFailed ? (
            <span className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-2 rounded-lg text-sm font-medium">
              <AlertCircle className="w-4 h-4" /> Pipeline failed
            </span>
          ) : (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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

      {isProcessing && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 flex-shrink-0" />
          Processing in background — page images and questions will appear as they complete. Auto-refreshing every 5s.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Page thumbnails */}
        <div>
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            Page Images ({pages.length})
          </h2>
          {pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-500 text-sm">
              {isProcessing ? "Pages will appear once PDF is rendered…" : "No page images available."}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[600px] overflow-y-auto pr-1">
              {pages.map((page) => (
                <div key={page.filename} className="relative group">
                  <button
                    onClick={() => setSelectedPage(page.filename === selectedPage ? null : page.filename)}
                    className={`relative w-full rounded-lg overflow-hidden border transition ${
                      selectedPage === page.filename
                        ? "border-violet-500 ring-2 ring-violet-500/30"
                        : "border-white/10 hover:border-violet-500/50"
                    }`}
                  >
                    <img
                      src={page.imageUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full object-cover aspect-[3/4] bg-gray-800"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-1 text-xs text-gray-300">
                      Pg {page.pageNumber}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </button>
                  {/* Delete page button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmPage(page.filename); }}
                    className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                    title="Delete page"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fullsize page view */}
          {selectedPage && (() => {
            const page = pages.find(p => p.filename === selectedPage);
            return page ? (
              <div className="mt-3 rounded-xl overflow-hidden border border-violet-500/30">
                <div className="bg-black/30 px-3 py-2 text-xs text-gray-400 flex justify-between items-center">
                  <span>Page {page.pageNumber}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteConfirmPage(page.filename)}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                    <button onClick={() => setSelectedPage(null)} className="text-gray-500 hover:text-white ml-2">✕</button>
                  </div>
                </div>
                <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="w-full" />
              </div>
            ) : null;
          })()}
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">
              Questions ({questions.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-500 text-sm">
                {isProcessing
                  ? "Questions will appear after processing completes."
                  : isReady || isApproved
                  ? "No questions extracted."
                  : "Approve the bank to import questions."}
              </div>
            ) : (
              questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  onEdit={() => setEditingQuestion({ ...q })}
                  onDelete={() => setDeleteConfirmQuestion(q.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete page confirm dialog */}
      {deleteConfirmPage && (
        <ConfirmDialog
          title="Delete Page Image"
          message="This will permanently remove this page image from the bank. This cannot be undone."
          onConfirm={() => deletePageMutation.mutate(deleteConfirmPage)}
          onCancel={() => setDeleteConfirmPage(null)}
          loading={deletePageMutation.isPending}
          confirmLabel="Delete Page"
        />
      )}

      {/* Delete question confirm dialog */}
      {deleteConfirmQuestion !== null && (
        <ConfirmDialog
          title="Delete Question"
          message="This will permanently remove this question from the bank."
          onConfirm={() => deleteQuestionMutation.mutate(deleteConfirmQuestion)}
          onCancel={() => setDeleteConfirmQuestion(null)}
          loading={deleteQuestionMutation.isPending}
          confirmLabel="Delete Question"
        />
      )}

      {/* Edit question modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onChange={setEditingQuestion}
          onSave={() => editQuestionMutation.mutate(editingQuestion)}
          onClose={() => setEditingQuestion(null)}
          loading={editQuestionMutation.isPending}
        />
      )}
    </div>
  );
}

function QuestionCard({ q, onEdit, onDelete }: { q: QuestionDetail; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${q.needsReview ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {(q.subject || q.topic || q.needsReview) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {q.subject && <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">{q.subject}</span>}
              {q.topic && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{q.topic}</span>}
              {q.difficulty && <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full">{q.difficulty}</span>}
              {q.needsReview && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Needs Review</span>}
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-gray-500 text-xs font-mono mt-0.5 flex-shrink-0">{q.questionUid}</span>
            <p className="text-gray-200 text-sm leading-relaxed line-clamp-3">{q.questionText}</p>
          </div>
          {Object.keys(q.options).length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-gray-500 hover:text-gray-300 transition"
            >
              {expanded ? "Hide options ▲" : "Show options ▼"}
            </button>
          )}
          {expanded && (
            <div className="mt-2 grid grid-cols-1 gap-1">
              {Object.entries(q.options).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="text-gray-500 font-mono uppercase w-4 flex-shrink-0">{key}.</span>
                  <span className="text-gray-400">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
            title="Edit question"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EditQuestionModal({
  question, onChange, onSave, onClose, loading,
}: {
  question: QuestionDetail;
  onChange: (q: QuestionDetail) => void;
  onSave: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const optionKeys = ["A", "B", "C", "D"];
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">Edit Question</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Question Text</label>
            <textarea
              value={question.questionText}
              onChange={(e) => onChange({ ...question, questionText: e.target.value })}
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Options</label>
            <div className="space-y-2">
              {optionKeys.map((key) => (
                <div key={key} className="flex gap-2 items-center">
                  <span className="text-gray-500 font-mono text-sm w-5">{key}.</span>
                  <input
                    type="text"
                    value={question.options[key] ?? ""}
                    onChange={(e) => onChange({
                      ...question,
                      options: { ...question.options, [key]: e.target.value },
                    })}
                    placeholder={`Option ${key}`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Subject</label>
              <input
                type="text"
                value={question.subject ?? ""}
                onChange={(e) => onChange({ ...question, subject: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Topic</label>
              <input
                type="text"
                value={question.topic ?? ""}
                onChange={(e) => onChange({ ...question, topic: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Difficulty</label>
              <select
                value={question.difficulty ?? ""}
                onChange={(e) => onChange({ ...question, difficulty: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">—</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={question.needsReview}
              onChange={(e) => onChange({ ...question, needsReview: e.target.checked })}
              className="accent-amber-400"
            />
            <span className="text-sm text-gray-300">Needs Review</span>
          </label>
        </div>
        <div className="p-5 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title, message, onConfirm, onCancel, loading, confirmLabel,
}: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
  loading: boolean; confirmLabel: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold mb-2">{title}</h2>
        <p className="text-gray-400 text-sm mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
