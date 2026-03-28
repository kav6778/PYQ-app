import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  useListQuestions, 
  useGetQuestionStats, 
  useGetQuestion 
} from "@workspace/api-client-react";

// Wrapper for the generated hooks to add some local state management for the UI

export function useQuestionBrowser() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const page = parseInt(searchParams.get("page") || "1", 10);
  const subject = searchParams.get("subject") || undefined;
  const topic = searchParams.get("topic") || undefined;
  const search = searchParams.get("search") || undefined;
  const question_type = searchParams.get("question_type") || undefined;

  const queryParams = {
    page,
    limit: 20,
    ...(subject && { subject }),
    ...(topic && { topic }),
    ...(search && { search }),
    ...(question_type && { question_type })
  };

  const { data, isLoading, isError, error } = useListQuestions(queryParams);

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(window.location.search);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    
    // Reset to page 1 on filter change, unless we explicitly changed page
    if (!updates.page) {
      newParams.set("page", "1");
    }

    setLocation(`/?${newParams.toString()}`);
  };

  return {
    data,
    isLoading,
    isError,
    error,
    filters: { page, subject, topic, search, question_type },
    updateFilters
  };
}

export function useDashboardStats() {
  return useGetQuestionStats();
}

export function useQuestionDetail(id: string) {
  return useGetQuestion(id, {
    query: {
      enabled: !!id,
    }
  });
}
