"use client";

import { FeaturePicker } from "@/components/FeaturePicker";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { InputTypePicker } from "@/components/InputTypePicker";
import { LoadingBar } from "@/components/LoadingBar";
import { MessageTextarea } from "@/components/MessageTextarea";
import { PdfUploadField } from "@/components/PdfUploadField";
import { ScamResultView } from "@/components/ScamResultView";
import { SummarizeResultView } from "@/components/SummarizeResultView";
import { useAnalysisFlow } from "@/hooks/useAnalysisFlow";
import { isScamResult, isSummarizeResult } from "@/lib/app-types";

export default function AnalysisApp() {
  const flow = useAnalysisFlow();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          הבנת הודעות ובדיקת הונאה
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          סיכום ברור או בדיקת סיכון פישינג — בעברית, בלי רעש.
        </p>
      </header>

      <div className="space-y-8">
        {!flow.result ? (
          <>
            <FeaturePicker
              selected={flow.selectedFeature}
              disabled={flow.locked}
              onSelect={flow.selectFeature}
            />

            {flow.selectedFeature ? (
              <InputTypePicker
                selected={flow.selectedInputType}
                disabled={flow.locked}
                showShortOption={flow.showShortOption}
                onSelect={flow.selectInputType}
              />
            ) : null}

            {flow.showInputArea ? (
              <section className="space-y-4">
                {flow.selectedInputType === "pdf" ? (
                  <PdfUploadField
                    locked={flow.locked}
                    pdfLoading={flow.pdfLoading}
                    pdfFileName={flow.pdfFileName}
                    contextText={flow.inputText}
                    onFileSelect={(file) => void flow.handlePdfUpload(file)}
                    onContextChange={(value) => {
                      flow.setInputText(value);
                      if (flow.feedback) flow.clearFeedback();
                    }}
                  />
                ) : (
                  <MessageTextarea
                    locked={flow.locked}
                    value={flow.inputText}
                    maxLength={flow.textLimits?.max ?? 80_000}
                    placeholder={
                      flow.selectedInputType === "short"
                        ? "הדביקו הודעה קצרה: SMS, וואטסאפ, התראה..."
                        : "הדביקו מייל, מסמך או טקסט ארוך..."
                    }
                    onChange={(value) => {
                      flow.setInputText(value);
                      if (flow.feedback) flow.clearFeedback();
                    }}
                  />
                )}

                {flow.feedback ? (
                  <FeedbackMessage
                    message={flow.feedback.message}
                    eventCode={flow.feedback.eventCode}
                    variant={flow.feedback.variant}
                    onRetry={
                      flow.feedback.variant === "error"
                        ? () => void flow.runAnalysis()
                        : undefined
                    }
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => void flow.runAnalysis()}
                  disabled={flow.isAnalyzing || flow.pdfLoading}
                  className="btn-primary w-full rounded-lg px-6 py-3.5 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {flow.isAnalyzing ? flow.loadingLabel : flow.primaryLabel}
                </button>
              </section>
            ) : null}
          </>
        ) : null}

        {flow.isAnalyzing && !flow.result ? (
          <LoadingBar label={flow.loadingLabel} />
        ) : null}

        {flow.result &&
        flow.selectedFeature === "scam" &&
        isScamResult("scam", flow.result) ? (
          <ScamResultView result={flow.result} onReset={flow.resetAll} />
        ) : null}

        {flow.result &&
        flow.selectedFeature === "summarizer" &&
        isSummarizeResult("summarizer", flow.result) ? (
          <SummarizeResultView result={flow.result} onReset={flow.resetAll} />
        ) : null}
      </div>

      <footer className="mt-16 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-600">
        ההודעות והתשובות נשמרות לשיפור המודל. במקרה של ספק — אמתו מול הגוף הרשמי.
      </footer>
    </div>
  );
}
