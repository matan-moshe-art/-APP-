"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  inputModeFromSelection,
  type AppResult,
  type InputMode,
  type SelectedFeature,
  type SelectedInputType,
} from "@/lib/app-types";
import { limitsForMode } from "@/lib/prompt-routing";
import { isScamPayload, isSummarizePayload } from "@/lib/result-validators";

const CLIENT_TIMEOUT_MS = 180_000;

export type FeedbackState = {
  message: string;
  eventCode: string | null;
  variant: "validation" | "error";
} | null;

export function useAnalysisFlow() {
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeature | null>(
    null,
  );
  const [selectedInputType, setSelectedInputType] =
    useState<SelectedInputType | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfExtractedText, setPdfExtractedText] = useState("");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AppResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const locked = isAnalyzing || result !== null;
  const inputMode: InputMode | null = inputModeFromSelection(selectedInputType);
  const textLimits = inputMode ? limitsForMode(inputMode) : null;
  const showInputArea =
    selectedFeature !== null && selectedInputType !== null && result === null;
  const showShortOption =
    selectedInputType !== "pdf" && !pdfFileName;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSelectedFeature(null);
    setSelectedInputType(null);
    setPdfFileName(null);
    setPdfExtractedText("");
    setInputText("");
    setIsAnalyzing(false);
    setResult(null);
    setFeedback(null);
    setPdfLoading(false);
  }, []);

  const selectFeature = useCallback(
    (feature: SelectedFeature) => {
      if (locked) return;
      setSelectedFeature(feature);
      setSelectedInputType(null);
      setPdfFileName(null);
      setPdfExtractedText("");
      setInputText("");
      setResult(null);
      setFeedback(null);
    },
    [locked],
  );

  const selectInputType = useCallback(
    (type: SelectedInputType) => {
      if (locked) return;
      setSelectedInputType(type);
      setFeedback(null);
      if (type !== "pdf") {
        setPdfFileName(null);
        setPdfExtractedText("");
      }
    },
    [locked],
  );

  const handlePdfUpload = useCallback(
    async (file: File) => {
      if (locked) return;
      setFeedback(null);
      setPdfLoading(true);
      setPdfFileName(file.name);
      setSelectedInputType("pdf");

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/pdf-text", { method: "POST", body: form });
        const data: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof (data as { message: unknown }).message === "string"
              ? (data as { message: string }).message
              : "לא הצלחנו לקרוא את ה-PDF.";
          setFeedback({ message, eventCode: null, variant: "validation" });
          setPdfFileName(null);
          setPdfExtractedText("");
          return;
        }

        if (
          data &&
          typeof data === "object" &&
          "text" in data &&
          typeof (data as { text: unknown }).text === "string"
        ) {
          setPdfExtractedText((data as { text: string }).text);
        }
      } catch {
        setFeedback({
          message: "לא הצלחנו לקרוא את ה-PDF. נסו שנית.",
          eventCode: null,
          variant: "validation",
        });
        setPdfFileName(null);
        setPdfExtractedText("");
      } finally {
        setPdfLoading(false);
      }
    },
    [locked],
  );

  const runAnalysis = useCallback(async () => {
    setFeedback(null);

    if (!selectedFeature) {
      setFeedback({
        message: "בחרו תחילה: סיכום או בדיקת הונאה.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }
    if (!selectedInputType) {
      setFeedback({
        message: "בחרו את סוג התוכן תחילה.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }

    const mode = inputModeFromSelection(selectedInputType);
    if (!mode) return;

    const limits = limitsForMode(mode);
    const coreText =
      selectedInputType === "pdf"
        ? pdfExtractedText.trim()
        : inputText.trim();
    const optionalNote =
      selectedInputType === "pdf" ? inputText.trim() : "";
    const combined =
      optionalNote.length > 0
        ? `${coreText}\n\n--- הקשר נוסף ---\n${optionalNote}`
        : coreText;

    if (!combined) {
      setFeedback({
        message: "הוסיפו הודעה או PDF לפני ההתחלה.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }
    if (selectedInputType === "pdf" && !pdfExtractedText.trim()) {
      setFeedback({
        message: "הוסיפו הודעה או PDF לפני ההתחלה.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }
    if (combined.length < limits.min) {
      setFeedback({
        message: "הטקסט קצר מדי לניתוח.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }
    if (combined.length > limits.max) {
      setFeedback({
        message: "הטקסט ארוך מדי. קצרו או העלו קובץ קטן יותר.",
        eventCode: null,
        variant: "validation",
      });
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFeedback({
        message: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.",
        eventCode: selectedFeature === "scam" ? "AN-001" : "SM-001",
        variant: "error",
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    setIsAnalyzing(true);
    setResult(null);

    const endpoint =
      selectedFeature === "scam" ? "/api/analyze" : "/api/summarize";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combined, inputType: mode }),
        signal: controller.signal,
      });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : "לא הצלחנו להשלים את הבקשה. נסו שנית.";
        const eventCode =
          data &&
          typeof data === "object" &&
          "eventCode" in data &&
          typeof (data as { eventCode: unknown }).eventCode === "string"
            ? (data as { eventCode: string }).eventCode
            : selectedFeature === "scam"
              ? "AN-500"
              : "SM-500";

        setFeedback({
          message,
          eventCode,
          variant: "error",
        });
        return;
      }

      if (selectedFeature === "scam" && isScamPayload(data)) {
        setResult(data);
        return;
      }

      if (selectedFeature === "summarizer" && isSummarizePayload(data)) {
        setResult(data);
        return;
      }

      setFeedback({
        message: "לא הצלחנו להשלים את הבקשה. נסו שנית.",
        eventCode: selectedFeature === "scam" ? "AN-501" : "SM-501",
        variant: "error",
      });
    } catch (err) {
      if (controller.signal.aborted) {
        setFeedback({
          message: "העיבוד לוקח יותר מדי זמן. נסו שנית.",
          eventCode: selectedFeature === "scam" ? "AN-203" : "SM-203",
          variant: "error",
        });
      } else {
        setFeedback({
          message: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שנית.",
          eventCode: selectedFeature === "scam" ? "AN-002" : "SM-002",
          variant: "error",
        });
      }
      void err;
    } finally {
      clearTimeout(timeoutId);
      setIsAnalyzing(false);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [
    inputText,
    pdfExtractedText,
    selectedFeature,
    selectedInputType,
  ]);

  const primaryLabel =
    selectedFeature === "summarizer" ? "צור סיכום" : "בדוק בטיחות";
  const loadingLabel =
    selectedFeature === "summarizer"
      ? "יוצר סיכום..."
      : "בודק בטיחות...";

  return {
    selectedFeature,
    selectedInputType,
    pdfFileName,
    inputText,
    setInputText,
    isAnalyzing,
    result,
    feedback,
    pdfLoading,
    locked,
    textLimits,
    showInputArea,
    showShortOption,
    primaryLabel,
    loadingLabel,
    clearFeedback,
    resetAll,
    selectFeature,
    selectInputType,
    handlePdfUpload,
    runAnalysis,
  };
}
