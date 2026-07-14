/* VocaPoP 내 단어 사전 생성 — Supabase Edge Function.
 *
 * 공유 시트로 수집한 커리큘럼 미등재 단어의 뜻·예문을 생성한다.
 * 앱(anon 키)이 supabase.functions.invoke('lookup-word', { body: { word } })로 호출,
 * 결과는 vocab_merged.json과 같은 필드 형태라 WordDetail/단어장 렌더에 그대로 얹힌다.
 * 시크릿: ANTHROPIC_API_KEY, GEN_MODEL(선택, 기본 claude-opus-4-8)
 */
import Anthropic from "npm:@anthropic-ai/sdk@0.65.0";

const MODEL = Deno.env.get("GEN_MODEL") || "claude-opus-4-8";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "" });

const DICT_SCHEMA = {
  type: "object",
  properties: {
    word: { type: "string" },
    pronunciation: { type: "string", description: "IPA, e.g. /ˈwɜːrd/. Empty string if unsure." },
    pos: { type: "string", description: "Korean POS chip like (명), (동), (형), (명)(동)" },
    korean: { type: "string", description: "짧은 한국어 뜻. 여러 뜻은 '; '로 구분 (앱 표시 형식)" },
    example: { type: "string", description: "One natural English example sentence (8-18 words) using the word." },
    example_kor: { type: "string", description: "예문의 자연스러운 한국어 해석. 단어에 해당하는 부분을 «»로 표시." },
    valid: { type: "boolean", description: "false if the input is not a real English word." },
  },
  required: ["word", "pronunciation", "pos", "korean", "example", "example_kor", "valid"],
  additionalProperties: false,
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  let word = "";
  try { word = String((await req.json()).word || "").trim().toLowerCase(); } catch { /* fallthrough */ }
  // 단어 하나만 — 문장/프롬프트 주입 차단
  if (!/^[a-z][a-z'’-]{1,29}$/.test(word)) return json({ error: "invalid word" }, 400);

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: DICT_SCHEMA } },
      messages: [{
        role: "user",
        content: `Create a Korean learner's dictionary entry for the English word "${word}". Follow the schema. If it is not a real English word, set valid=false and leave other fields empty.`,
      }],
    } as any);
    if ((res as any).stop_reason === "refusal") return json({ error: "refused" }, 422);
    const text = (res.content as any[]).find((b) => b.type === "text")?.text || "{}";
    const out = JSON.parse(text);
    if (!out.valid) return json({ error: "not a word" }, 404);
    return json(out);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "generation failed" }, 500);
  }
});
