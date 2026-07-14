/* VocaPoP 도메인 예문 팩 생성 파이프라인 — Supabase Edge Function.
 *
 * ★ 왜 파이프라인인가: 무검증 LLM 생성은 불량률이 높다.
 *   생성 → 평가(answerability·proficiency) → 근거 기반 재생성(≤2회) → 탈락 루프로
 *   품질을 확보한 문항만 저장한다.
 *
 * ★ 품질 리스크 최소화 설계: 문항의 보기(quiz_bank, 손검수)는 건드리지 않고
 *   "예문 문장"만 도메인화 — answerability 평가는 동결 오답 3개를 그대로 넣고
 *   "빈칸에 정답만 유일하게 들어맞는가"를 검증한다.
 *
 * 호출: 배치 러너(scripts/generate-domain-pack.js)가 service_role 키로 POST.
 *   body = { domain, words: [{ id, word, pos, meanings: string[], distractors: string[3], cefr }] }
 * 시크릿: ANTHROPIC_API_KEY (supabase secrets set), GEN_MODEL(선택, 기본 claude-opus-4-8)
 */
import Anthropic from "npm:@anthropic-ai/sdk@0.65.0";

const MODEL = Deno.env.get("GEN_MODEL") || "claude-opus-4-8";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "" });

const DOMAIN_DESC: Record<string, string> = {
  dev: "software development and IT — programming, systems, APIs, product engineering",
  med: "medicine and biosciences — clinical practice, patient care, medical research",
  biz: "business — strategy, marketing, finance, workplace and client communication",
  news: "current affairs and journalism — politics, economy, society, world events",
  academic: "academic writing — research papers, scholarly argument, citations",
};

const GEN_SCHEMA = {
  type: "object",
  properties: {
    example: { type: "string", description: "One natural English sentence (8-22 words) using the target word in the given domain." },
    example_kor: { type: "string", description: "Natural Korean translation. Mark the part translating the target word with «guillemets», e.g. 그는 «휴식»이 필요했다." },
  },
  required: ["example", "example_kor"],
  additionalProperties: false,
};

const EVAL_SCHEMA = {
  type: "object",
  properties: {
    answerability: { type: "boolean" },
    proficiency: { type: "boolean" },
    rationale: { type: "string", description: "왜 통과/실패했는지 한국어로. 실패 시 어느 부분이 문제인지 명시." },
  },
  required: ["answerability", "proficiency", "rationale"],
  additionalProperties: false,
};

type WordIn = { id: number; word: string; pos?: string; meanings?: string[]; distractors?: string[]; cefr?: string };

// 굴절형 포함 매칭 — 앱의 blankExample()과 동일 원리 (생성 예문이 빈칸화 가능해야 함)
function containsWord(sentence: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const forms = [w];
  if (/y$/i.test(word)) forms.push(w.slice(0, -1) + "ies", w.slice(0, -1) + "ied");
  if (/e$/i.test(word)) forms.push(w.slice(0, -1) + "ing", w.slice(0, -1) + "ed");
  try { return new RegExp(`\\b(?:${forms.join("|")})\\w*\\b`, "i").test(sentence); } catch { return sentence.toLowerCase().includes(word.toLowerCase()); }
}

async function callJson(prompt: string, schema: object): Promise<any> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: prompt }],
  } as any);
  if ((res as any).stop_reason === "refusal") throw new Error("refusal");
  const text = (res.content as any[]).find((b) => b.type === "text")?.text || "{}";
  return JSON.parse(text);
}

function genPrompt(w: WordIn, domain: string, feedback?: string): string {
  return [
    `You write example sentences for a TOEFL vocabulary app used by Korean learners.`,
    `Target word: "${w.word}"${w.pos ? ` ${w.pos}` : ""}${w.cefr ? ` (CEFR ${w.cefr})` : ""}`,
    `Korean meanings: ${(w.meanings || []).join(" / ")}`,
    `Domain: ${DOMAIN_DESC[domain] || domain}`,
    ``,
    `TASK: Write ONE natural English sentence (8-22 words) situated in the domain above,`,
    `using the target word (inflected forms allowed) exactly once, in one of the Korean meanings given.`,
    `The sentence will also be used as a fill-in-the-blank quiz stem where the target word is blanked out,`,
    `so the context must make the target word clearly recoverable. These similar words must NOT fit the blank:`,
    `${(w.distractors || []).join(", ") || "(none)"} — write context that excludes them.`,
    `Register: professional but readable. No proper nouns that date quickly. English sentence must contain no Korean.`,
    feedback ? `\nPREVIOUS ATTEMPT FAILED EVALUATION — fix with MINIMAL changes:\n${feedback}` : ``,
  ].join("\n");
}

// answerability·proficiency 이중 평가 기준 (동결 오답 3개 대상 빈칸 검증)
function evalPrompt(w: WordIn, example: string): string {
  return [
    `You are a strict evaluator of fill-in-the-blank English quiz stems.`,
    `Stem (blank the target word): "${example.replace(new RegExp(`\\b${w.word}\\w*\\b`, "i"), "_____")}"`,
    `Key: "${w.word}" · Distractors: ${(w.distractors || []).join(", ")}`,
    ``,
    `ANSWERABILITY — pass only if BOTH hold:`,
    `1. The key is the ONLY grammatically and semantically correct fill for the blank.`,
    `2. Every distractor is clearly wrong in this context. If more than one alternative could reasonably fit, FAIL.`,
    `Test each alternative in the blank individually before judging.`,
    ``,
    `PROFICIENCY — pass if the stem feels appropriately challenging for non-native learners:`,
    `not trivially easy (e.g. the sentence defines the word outright), but has a clear correct answer.`,
    ``,
    `Also FAIL answerability if the sentence uses the target word more than once or not at all.`,
  ].join("\n");
}

async function upsertRow(row: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/vocapop_domain_bank?on_conflict=domain,word_id`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`upsert failed: ${r.status} ${await r.text()}`);
}

Deno.serve(async (req: Request) => {
  // 쓰기 함수 — service_role 전용 (verify_jwt에 더해 이중 잠금)
  const auth = req.headers.get("authorization") || "";
  if (!auth.includes(SERVICE_KEY)) return new Response("forbidden", { status: 403 });
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  const { domain, words } = await req.json() as { domain: string; words: WordIn[] };
  if (!DOMAIN_DESC[domain]) return new Response("bad domain", { status: 400 });
  if (!Array.isArray(words) || words.length === 0 || words.length > 12) return new Response("words: 1-12 per batch", { status: 400 });

  const results: any[] = [];
  for (const w of words) {
    let feedback: string | undefined;
    let ex: any = null, ev: any = null, ok = false, attempts = 0;
    // 생성 → 평가 → 근거 재생성 루프 (초기 1회 + 재생성 2회)
    for (attempts = 1; attempts <= 3; attempts++) {
      try {
        ex = await callJson(genPrompt(w, domain, feedback), GEN_SCHEMA);
        if (!ex?.example || !containsWord(ex.example, w.word) || /[가-힣]/.test(ex.example)) {
          feedback = "The sentence must contain the target word exactly once (inflections OK) and no Korean.";
          continue;
        }
        ev = await callJson(evalPrompt(w, ex.example), EVAL_SCHEMA);
        if (ev.answerability && ev.proficiency) { ok = true; break; }
        feedback = ev.rationale;
      } catch (e) {
        feedback = `generation error: ${e instanceof Error ? e.message : e}`;
      }
    }
    await upsertRow({
      domain, word_id: w.id,
      example: ok ? ex.example : (ex?.example || ""),
      example_kor: ok ? (ex.example_kor || "") : "",
      status: ok ? "ok" : "rejected",
      gen_meta: { attempts, model: MODEL, rationale: ev?.rationale || feedback || "" },
    });
    results.push({ id: w.id, ok, attempts });
  }
  return new Response(JSON.stringify({ domain, results }), { headers: { "Content-Type": "application/json" } });
});
