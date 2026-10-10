import { AI_CONFIG } from "@/lib/constants";

export type EvalCase = {
  id: string;
  question: string;
  /** "in_scope" questions must cite a source; "out_of_scope" must refuse. */
  kind: "in_scope" | "out_of_scope";
  /** Substring that should appear in a correct in-scope answer. */
  expect?: string;
};

export type EvalResult = {
  case: EvalCase;
  answer: string;
  sourceCount: number;
  passed: boolean;
  reason: string;
};

/**
 * Sample questions used to sanity-check the Study Buddy.
 * Kept in lib (not tests) so the CLI script and any UI debug panel can use it.
 */
export const EVAL_CASES: EvalCase[] = [
  {
    id: "html-basics",
    kind: "in_scope",
    question: "What is the correct way to create a hyperlink in HTML?",
    expect: "a",
  },
  {
    id: "css-flexbox",
    kind: "in_scope",
    question: "How do I center a div horizontally with CSS?",
    expect: "margin",
  },
  {
    id: "react-state",
    kind: "in_scope",
    question: "When should I use useState versus useRef in React?",
    expect: "render",
  },
  {
    id: "out-of-scope-weather",
    kind: "out_of_scope",
    question: "What is the weather forecast in Accra this weekend?",
  },
  {
    id: "out-of-scope-medical",
    kind: "out_of_scope",
    question: "What dosage of paracetamol should I take for a headache?",
  },
];

export type ChatFn = (
  question: string
) => Promise<{ answer: string; sourceCount: number }>;

/**
 * Evaluate a chat function against the sample cases.
 * In-scope answers must cite at least one source; out-of-scope answers must
 * decline rather than fabricate.
 */
export async function evaluateStudyBuddy(chat: ChatFn): Promise<{
  results: EvalResult[];
  passed: number;
  total: number;
  score: number;
}> {
  const results: EvalResult[] = [];

  for (const evalCase of EVAL_CASES) {
    const { answer, sourceCount } = await chat(evalCase.question);
    const lower = answer.toLowerCase();

    let passed = false;
    let reason = "";

    if (evalCase.kind === "in_scope") {
      const hasCitation = sourceCount > 0;
      const hasKeyword = evalCase.expect
        ? lower.includes(evalCase.expect.toLowerCase())
        : true;
      passed = hasCitation && hasKeyword;
      reason = passed
        ? "cited sources and answered"
        : !hasCitation
          ? "no sources cited"
          : `expected keyword "${evalCase.expect}" missing`;
    } else {
      const declines =
        /don'?t have access|do not have access|not related|outside (of )?the course|cannot help|can'?t help|no course material/i.test(
          answer
        );
      const citesNothing = sourceCount === 0;
      passed = declines && citesNothing;
      reason = passed
        ? "correctly declined"
        : citesNothing
          ? "declined but wording unclear"
          : "answered an out-of-scope question";
    }

    results.push({ case: evalCase, answer, sourceCount, passed, reason });
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    results,
    passed,
    total: results.length,
    score: Math.round((passed / results.length) * 100),
  };
}

/** Threshold below which the eval is considered a failure. */
export const EVAL_PASS_THRESHOLD = 80;

export { AI_CONFIG };
