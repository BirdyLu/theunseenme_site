"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ResultPage() {
  const router = useRouter();
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const content = localStorage.getItem("quizReport");
      setReport(content);
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-10 pt-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              测评报告
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              灵魂欲望测评 · DeepSeek 生成
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="h-10 rounded-full border border-zinc-600 px-4 text-xs font-semibold text-zinc-50 transition-all hover:border-zinc-300 hover:bg-zinc-900"
          >
            返回重测
          </button>
        </header>

        {!report && (
          <div className="rounded-2xl bg-zinc-900/70 p-5 text-sm text-zinc-200 shadow-lg shadow-black/40">
            没找到报告内容，请返回重新提交一次。
          </div>
        )}

        {report && (
          <section className="rounded-2xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-950 shadow-lg shadow-black/30">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.16em] text-zinc-500">
              报告正文
            </h2>
            <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
              {report}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}

