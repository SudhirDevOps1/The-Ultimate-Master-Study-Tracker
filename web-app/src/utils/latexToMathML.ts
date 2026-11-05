/**
 * Clean, lightweight, native LaTeX-to-MathML converter.
 * Converts LaTeX expressions into Chromium/WebKit native MathML markup
 * with zero external dependencies, no CDN fonts, and guaranteed error safety.
 */

const GREEK_MAP: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const SYMBOL_MAP: Record<string, string> = {
  times: "×",
  div: "÷",
  cdot: "·",
  pm: "±",
  mp: "∓",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  sim: "∼",
  infty: "∞",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  iff: "⇔",
  sum: "∑",
  prod: "∏",
  int: "∫",
  iint: "∬",
  iiint: "∭",
  oint: "∮",
  partial: "∂",
  nabla: "∇",
  forall: "∀",
  exists: "∃",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  cup: "∪",
  cap: "∩",
  empty: "∅",
  emptyset: "∅",
  ldots: "…",
  cdots: "⋯",
};

const FUNCTION_NAMES = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc",
  "arcsin", "arccos", "arctan",
  "sinh", "cosh", "tanh",
  "log", "ln", "lg", "exp",
  "lim", "min", "max", "sup", "inf", "det", "gcd", "deg"
]);

function extractBracedGroup(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== "{") {
    // If not a brace, single token or character
    let i = startIndex;
    if (str[i] === "\\") {
      i++;
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        i++;
      }
      return { content: str.slice(startIndex, i), endIndex: i };
    }
    return { content: str[startIndex], endIndex: startIndex + 1 };
  }

  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: str.slice(startIndex + 1, i), endIndex: i + 1 };
      }
    }
  }

  // Unclosed brace
  return { content: str.slice(startIndex + 1), endIndex: str.length };
}

function extractBracketGroup(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== "[") return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === "[") depth++;
    else if (str[i] === "]") {
      depth--;
      if (depth === 0) {
        return { content: str.slice(startIndex + 1, i), endIndex: i + 1 };
      }
    }
  }
  return { content: str.slice(startIndex + 1), endIndex: str.length };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converts inner LaTeX tokens to MathML content.
 */
export function parseLatexToMathMLNodes(latex: string): string {
  let result = "";
  let i = 0;
  const len = latex.length;

  while (i < len) {
    const ch = latex[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Command
    if (ch === "\\") {
      i++;
      let cmdName = "";
      while (i < len && /[a-zA-Z]/.test(latex[i])) {
        cmdName += latex[i];
        i++;
      }

      // If escaped symbol like \{ or \} or \,
      if (cmdName === "" && i < len) {
        const symbol = latex[i];
        i++;
        if (symbol === "{" || symbol === "}") {
          result += `<mo>${symbol}</mo>`;
          continue;
        } else if (symbol === "," || symbol === ";" || symbol === " ") {
          result += `<mspace width="0.22em"/>`;
          continue;
        }
      }

      // \frac{num}{den}
      if (cmdName === "frac") {
        while (i < len && /\s/.test(latex[i])) i++;
        const num = extractBracedGroup(latex, i);
        if (num) {
          i = num.endIndex;
          while (i < len && /\s/.test(latex[i])) i++;
          const den = extractBracedGroup(latex, i);
          if (den) {
            i = den.endIndex;
            result += `<mfrac><mrow>${parseLatexToMathMLNodes(num.content)}</mrow><mrow>${parseLatexToMathMLNodes(den.content)}</mrow></mfrac>`;
            continue;
          }
        }
      }

      // \sqrt[n]{x} or \sqrt{x}
      if (cmdName === "sqrt") {
        while (i < len && /\s/.test(latex[i])) i++;
        if (latex[i] === "[") {
          const rootDegree = extractBracketGroup(latex, i);
          if (rootDegree) {
            i = rootDegree.endIndex;
            while (i < len && /\s/.test(latex[i])) i++;
            const radicand = extractBracedGroup(latex, i);
            if (radicand) {
              i = radicand.endIndex;
              result += `<mroot><mrow>${parseLatexToMathMLNodes(radicand.content)}</mrow><mrow>${parseLatexToMathMLNodes(rootDegree.content)}</mrow></mroot>`;
              continue;
            }
          }
        }
        const radicand = extractBracedGroup(latex, i);
        if (radicand) {
          i = radicand.endIndex;
          result += `<msqrt><mrow>${parseLatexToMathMLNodes(radicand.content)}</mrow></msqrt>`;
          continue;
        }
      }

      // \left ... \right delimiters
      if (cmdName === "left" || cmdName === "right") {
        while (i < len && /\s/.test(latex[i])) i++;
        let delim = latex[i] || "";
        i++;
        if (delim === "\\") {
          delim = latex[i] || "";
          i++;
        }
        result += `<mo fence="true">${escapeXml(delim)}</mo>`;
        continue;
      }

      // Greek letters
      if (GREEK_MAP[cmdName]) {
        result += `<mi>${GREEK_MAP[cmdName]}</mi>`;
        continue;
      }

      // Math Symbols
      if (SYMBOL_MAP[cmdName]) {
        result += `<mo>${SYMBOL_MAP[cmdName]}</mo>`;
        continue;
      }

      // Functions (sin, cos, log, etc.)
      if (FUNCTION_NAMES.has(cmdName)) {
        result += `<mi mathvariant="normal">${cmdName}</mi>`;
        continue;
      }

      // Formatting text like \text{abc}
      if (cmdName === "text" || cmdName === "mathrm" || cmdName === "mathbf") {
        while (i < len && /\s/.test(latex[i])) i++;
        const textGroup = extractBracedGroup(latex, i);
        if (textGroup) {
          i = textGroup.endIndex;
          result += `<mtext>${escapeXml(textGroup.content)}</mtext>`;
          continue;
        }
      }

      // Unsupported command fallback chip
      result += `<span class="unsupported-math font-mono text-[11px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">\\${escapeXml(cmdName)}</span>`;
      continue;
    }

    // Subscript & Superscript binding
    if (ch === "_" || ch === "^") {
      const isSub = ch === "_";
      i++;
      while (i < len && /\s/.test(latex[i])) i++;
      const firstGroup = extractBracedGroup(latex, i);
      if (firstGroup) {
        i = firstGroup.endIndex;
        while (i < len && /\s/.test(latex[i])) i++;

        // Check if immediately followed by complementary ^ or _ (e.g. x_i^2)
        if (i < len && ((isSub && latex[i] === "^") || (!isSub && latex[i] === "_"))) {
          i++;
          while (i < len && /\s/.test(latex[i])) i++;
          const secondGroup = extractBracedGroup(latex, i);
          if (secondGroup) {
            i = secondGroup.endIndex;
            const subContent = isSub ? firstGroup.content : secondGroup.content;
            const supContent = isSub ? secondGroup.content : firstGroup.content;
            result = wrapLastTokenWithSubSup(result, parseLatexToMathMLNodes(subContent), parseLatexToMathMLNodes(supContent));
            continue;
          }
        }

        if (isSub) {
          result = wrapLastTokenWithSub(result, parseLatexToMathMLNodes(firstGroup.content));
        } else {
          result = wrapLastTokenWithSup(result, parseLatexToMathMLNodes(firstGroup.content));
        }
        continue;
      }
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (i < len && /[0-9.]/.test(latex[i])) {
        num += latex[i];
        i++;
      }
      result += `<mn>${num}</mn>`;
      continue;
    }

    // Letters / Variables
    if (/[a-zA-Z]/.test(ch)) {
      result += `<mi>${ch}</mi>`;
      i++;
      continue;
    }

    // Operators and delimiters
    if ("+-*/=<>!?:()[]|,".includes(ch)) {
      result += `<mo>${escapeXml(ch)}</mo>`;
      i++;
      continue;
    }

    // Fallback single character
    result += `<mo>${escapeXml(ch)}</mo>`;
    i++;
  }

  return result;
}

function wrapLastTokenWithSub(html: string, sub: string): string {
  const match = html.match(/(<m[a-z]+>.*?<\/m[a-z]+>)$/);
  if (match) {
    const base = match[1];
    const prefix = html.slice(0, html.length - base.length);
    return `${prefix}<msub>${base}<mrow>${sub}</mrow></msub>`;
  }
  return `<msub><mi></mi><mrow>${sub}</mrow></msub>`;
}

function wrapLastTokenWithSup(html: string, sup: string): string {
  const match = html.match(/(<m[a-z]+>.*?<\/m[a-z]+>)$/);
  if (match) {
    const base = match[1];
    const prefix = html.slice(0, html.length - base.length);
    return `${prefix}<msup>${base}<mrow>${sup}</mrow></msup>`;
  }
  return `<msup><mi></mi><mrow>${sup}</mrow></msup>`;
}

function wrapLastTokenWithSubSup(html: string, sub: string, sup: string): string {
  const match = html.match(/(<m[a-z]+>.*?<\/m[a-z]+>)$/);
  if (match) {
    const base = match[1];
    const prefix = html.slice(0, html.length - base.length);
    return `${prefix}<msubsup>${base}<mrow>${sub}</mrow><mrow>${sup}</mrow></msubsup>`;
  }
  return `<msubsup><mi></mi><mrow>${sub}</mrow><mrow>${sup}</mrow></msubsup>`;
}

/**
 * Main entrance to convert LaTeX string into complete MathML string.
 * Supports inline mode and display (block) mode. Never throws.
 */
export function latexToMathML(latex: string, displayMode = false): string {
  try {
    if (!latex || !latex.trim()) return "";
    const cleanLatex = latex.trim();
    const displayAttr = displayMode ? ' display="block"' : ' display="inline"';
    const innerMathML = parseLatexToMathMLNodes(cleanLatex);
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}>${innerMathML}</math>`;
  } catch (err) {
    console.warn("[latexToMathML] Error parsing formula:", err);
    return `<span class="unsupported-math font-mono text-[11px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">${escapeXml(latex)}</span>`;
  }
}
