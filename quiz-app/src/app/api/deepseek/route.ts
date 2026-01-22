import { NextResponse } from "next/server";

const DEEPSEEK_API_URL =
  "https://api.deepseek.com/v1/chat/completions";

type AnswerRecord = {
  questionId: number;
  questionText: string;
  selectedOptionKey: string;
  selectedOptionText: string;
};

type RequestBody = {
  systemPrompt: string;
  answers: AnswerRecord[];
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RequestBody;

    // 优化：使用紧凑的 JSON 格式，减少 token 数
    const userContent = JSON.stringify({
      type: "灵魂欲望测评 - 答案记录",
      description: "下面是用户在 12 道题中的选择，请基于这些内容生成测评报告。",
      answers: body.answers,
    });

    // 不设置超时，确保用户能拿到完整的报告
    const dsResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: body.systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        // 优化参数以提升响应速度
        temperature: 0.7, // 降低随机性，加快生成
        max_tokens: 600, // 限制最大 token 数（7句×3部分≈600 tokens）
      }),
    });

    if (!dsResponse.ok) {
      const errorText = await dsResponse.text();
      return NextResponse.json(
        {
          error: "DeepSeek API 调用失败",
          details: errorText.slice(0, 500),
        },
        { status: 500 },
      );
    }

    const json = (await dsResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content =
      json.choices?.[0]?.message?.content ??
      "未能从 DeepSeek 返回内容，请稍后重试。";

    return NextResponse.json({ content });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: "服务器异常", details: message.slice(0, 300) },
      { status: 500 },
    );
  }
}

