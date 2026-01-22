/* eslint-disable @typescript-eslint/no-floating-promises */
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, type OptionKey } from "@/data/questions";
import welcomeImg from "@/images/welcome.png";

type AnswerRecord = {
  questionId: number;
  questionText: string;
  selectedOptionKey: OptionKey;
  selectedOptionText: string;
};

type ApiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; content: string }
  | { status: "error"; message: string };

const SYSTEM_PROMPT = `SYSTEM
你是一个“灵魂欲望测评”的报告生成器。你的风格：锋利、具体、像写给当事人的私人报告；不鸡汤、不说教、不诊断。核心要求：你的回答必须一针见血又不失幽默吐槽。用犀利的观察戳中要害，同时用恰到好处的幽默和调侃让报告生动有趣。可以适度调侃，但不要恶意嘲讽。禁止输出除指定格式以外的任何文字。每个板块必须短、狠、准：每个板块 3-5 句，总字数控制在 220-320 字。不要使用表情符号。

你必须严格按以下格式输出（仅三段，且保留标题）：
【你的灵魂是什么性格】
（大约 10 句）

【你最适合什么样的生活】
（大约 10 句）

【你的退休生活】
（大约 10 句）

写作要求：
1) 【你的灵魂是什么性格】要像“本质宣判”，包含：主欲望 + 副欲望如何配合 + 阴影面带来的代价（别用术语），并明确写出“你像哪个名人”，只选 1 位，解释相似之处。用一针见血的观察和幽默的吐槽来揭示本质。
2) 【你最适合什么样的生活】必须具体到生活结构：工作/居住/社交/节奏/关系边界/婚恋/家庭，写成你建议TA去过的那种人生，而不是泛泛而谈；其中要用一小段故事，描绘 TA 未来某一天是怎么过的（细节到时间点、在做什么、和谁在一起），并写出“未来的你可能去哪个城市”以及理由。同时给出一个清晰的建议：用户可能遇到的困难，以及需要克服什么样的心理障碍。用幽默但不失真诚的方式指出问题。
3) 【你的退休生活】要像一段画面：你会怎么住、怎么过一天、和谁来往、你会坚持什么、你会逃避什么。要有细节和反差。可以用轻松幽默的方式描绘，但保持真实感。
4) 不要提 MBTI、心理学名词、疗愈、创伤等词；不要建议就医。
5) 语言用中文，直白但不羞辱。幽默要恰到好处，不要过度。
6) 不要严格卡在 3-5 句，每一部分尽量写到大约 10 句，内容足够具体和有画面感即可。
`;

export default function Home() {
  const router = useRouter();
  const verificationCode =
    process.env.NEXT_PUBLIC_VERIFICATION_CODE ?? "";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [apiState, setApiState] = useState<ApiState>({ status: "idle" });
  const [verified, setVerified] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];

  const currentAnswer = answers[currentQuestion.id];

  const hasSelectedCurrent = Boolean(currentAnswer);

  const orderedAnswerList = useMemo(
    () =>
      QUESTIONS.map((q) => answers[q.id]).filter(
        (item): item is AnswerRecord => Boolean(item),
      ),
    [answers],
  );

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < QUESTIONS.length - 1 && hasSelectedCurrent;
  const isLast = currentIndex === QUESTIONS.length - 1;
  const isCompleted = orderedAnswerList.length === QUESTIONS.length;

  const handleSelect = (optionKey: OptionKey) => {
    const option = currentQuestion.options.find(
      (o) => o.key === optionKey,
    );
    if (!option) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        questionText: currentQuestion.prompt,
        selectedOptionKey: option.key,
        selectedOptionText: option.label,
      },
    }));

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((idx) => Math.min(QUESTIONS.length - 1, idx + 1));
    }
  };

  const handlePrev = () => {
    if (!canGoPrev) return;
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setCurrentIndex((idx) => Math.min(QUESTIONS.length - 1, idx + 1));
  };

  const handleSubmit = async () => {
    if (!isCompleted || apiState.status === "loading") return;

    const payload = {
      systemPrompt: SYSTEM_PROMPT,
      answers: orderedAnswerList,
    };

    // Debug: log the payload before sending
    // Note: Only logs in the browser devtools console
    // Remove or comment out if no longer needed.
    // eslint-disable-next-line no-console
    console.log("Submitting payload to /api/deepseek", payload);

    setApiState({ status: "loading" });

    try {
      // 手动构建包含 basePath 的 API URL
      // Next.js 的 basePath 不会自动处理客户端 fetch，需要手动添加
      // 优先使用环境变量，否则从当前 URL 自动检测
      let apiUrl = "/api/deepseek";
      if (typeof window !== "undefined") {
        const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
        if (envBasePath) {
          // 使用环境变量配置的 basePath
          apiUrl = `${envBasePath.replace(/\/$/, "")}/api/deepseek`;
        } else {
          // 从当前 URL 自动检测 basePath
          const pathname = window.location.pathname;
          // 提取第一个路径段作为 basePath（例如：/soulcolour -> /soulcolour）
          const pathParts = pathname.split("/").filter(Boolean);
          if (pathParts.length > 0 && pathParts[0] !== "api" && pathParts[0] !== "result") {
            apiUrl = `/${pathParts[0]}/api/deepseek`;
          }
        }
      }
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "请求失败");
      }

      const data = (await res.json()) as { content: string };
      setApiState({ status: "success", content: data.content });

      if (typeof window !== "undefined") {
        localStorage.setItem("quizReport", data.content);
      }
      router.push("/result");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "未知错误";
      setApiState({
        status: "error",
        message: message.slice(0, 200),
      });
    }
  };

  const handleVerify = () => {
    if (!verificationCode) {
      setVerifyError("验证码未配置，请联系管理员。");
      return;
    }
    if (codeInput.trim() === verificationCode.trim()) {
      setVerified(true);
      setVerifyError(null);
      setQuizStarted(false);
    } else {
      setVerifyError("验证码错误，请重试。");
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 pb-10 pt-8">
          <div className="w-full rounded-2xl bg-zinc-900/70 p-6 shadow-lg shadow-black/40">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              进入测评前
            </p>
            <h1 className="mt-2 text-xl font-semibold leading-tight">
              请输入访问验证码
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              输入正确验证码后即可开始 12 题测评。
            </p>
            <div className="mt-5 space-y-3">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="输入验证码"
                className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/40 px-3 py-3 text-sm text-zinc-50 outline-none focus:border-zinc-300"
              />
              <button
                type="button"
                onClick={handleVerify}
                className="h-10 w-full rounded-full bg-zinc-50 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
              >
                验证并进入
              </button>
              {verifyError && (
                <p className="text-xs text-red-400">{verifyError}</p>
              )}
              {!verificationCode && (
                <p className="text-xs text-yellow-400">
                  管理提示：环境变量 NEXT_PUBLIC_VERIFICATION_CODE 未配置。
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (verified && !quizStarted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-10 pt-8">
          <div className="w-full rounded-2xl bg-zinc-900/70 p-5 shadow-lg shadow-black/40">
            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl bg-zinc-900">
              <Image
                src={welcomeImg}
                alt="welcome"
                fill
                className="object-cover"
                priority
              />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              温馨提示｜请先阅读
            </p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-100">
              <p>
                本测试仅供娱乐与自我探索参考，不构成任何心理评估、诊断或现实预测。结果不是对你的定义，更不是结论。
              </p>
              <p>
                请在作答时选择【最诚实、最贴近当下直觉的答案】。
                不要评判好坏，不要纠结“应不应该”，也不要代入他人的目光或期待。
              </p>
              <p>这里只有你和你的选择。越真实，结果越有意义。</p>
            </div>
            <button
              type="button"
              onClick={() => setQuizStarted(true)}
              className="mt-5 h-11 w-full rounded-full bg-zinc-50 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
            >
              开始答题
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-10 pt-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            灵魂欲望测评
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">
            看看，你的灵魂到底想过怎样的人生
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            共 12 题 · 单选 · 支持返回上一题修改答案
          </p>
        </header>

        <section className="flex-1">
          <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
            <span>
              第{" "}
              <span className="font-semibold text-zinc-100">
                {currentIndex + 1}
              </span>{" "}
              / {QUESTIONS.length}
            </span>
            <span>
              已答{" "}
              <span className="font-semibold text-zinc-100">
                {orderedAnswerList.length}
              </span>
              题
            </span>
          </div>

          <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-100 transition-all duration-300"
              style={{
                width: `${
                  ((currentIndex + (hasSelectedCurrent ? 1 : 0)) /
                    QUESTIONS.length) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="rounded-2xl bg-zinc-900/70 p-5 shadow-lg shadow-black/40">
            <p className="text-sm leading-relaxed text-zinc-100">
              {currentQuestion.prompt}
            </p>

            <div className="mt-5 space-y-3">
              {currentQuestion.options.map((option) => {
                const selected =
                  currentAnswer?.selectedOptionKey === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleSelect(option.key)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-zinc-50 bg-zinc-50 text-zinc-950"
                        : "border-zinc-700/70 bg-zinc-900/40 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        selected
                          ? "border-zinc-950 bg-zinc-950 text-zinc-50"
                          : "border-zinc-600 text-zinc-300"
                      }`}
                    >
                      {option.key}
                    </span>
                    <span className="leading-relaxed">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={!canGoPrev}
              className={`h-10 flex-1 rounded-full border text-xs font-medium transition-all ${
                canGoPrev
                  ? "border-zinc-600 text-zinc-100 hover:border-zinc-300 hover:bg-zinc-900"
                  : "cursor-not-allowed border-zinc-800 text-zinc-500"
              }`}
            >
              上一题
            </button>

            {!isLast && (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className={`h-10 flex-1 rounded-full text-xs font-medium transition-all ${
                  canGoNext
                    ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                选完再下一题
              </button>
            )}

            {isLast && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isCompleted || apiState.status === "loading"}
                className={`h-10 flex-1 rounded-full text-xs font-semibold transition-all ${
                  isCompleted && apiState.status !== "loading"
                    ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                {apiState.status === "loading"
                  ? "生成报告中..."
                  : "提交并查看报告"}
              </button>
            )}
          </div>

          {apiState.status === "error" && (
            <p className="text-xs text-red-400">
              请求失败：{apiState.message}
            </p>
          )}
        </section>

        {apiState.status === "success" && (
          <section className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-950">
            <h2 className="mb-2 text-xs font-semibold tracking-[0.16em] text-zinc-500">
              测评结果
            </h2>
            <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
              {apiState.content}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}

