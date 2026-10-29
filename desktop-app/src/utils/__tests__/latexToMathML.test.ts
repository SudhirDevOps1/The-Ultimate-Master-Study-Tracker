import { describe, it, expect } from "vitest";
import { latexToMathML, parseLatexToMathMLNodes } from "../latexToMathML";

describe("Native LaTeX to MathML Engine (Zero External Libs)", () => {
  it("renders simple variables and numbers", () => {
    const mathml = latexToMathML("x + 5 = 10");
    expect(mathml).toContain("<mi>x</mi>");
    expect(mathml).toContain("<mo>+</mo>");
    expect(mathml).toContain("<mn>5</mn>");
    expect(mathml).toContain("<mo>=</mo>");
    expect(mathml).toContain("<mn>10</mn>");
  });

  it("handles fractions correctly (\\frac{num}{den})", () => {
    const mathml = latexToMathML("\\frac{1}{2}");
    expect(mathml).toContain("<mfrac>");
    expect(mathml).toContain("<mn>1</mn>");
    expect(mathml).toContain("<mn>2</mn>");
    expect(mathml).toContain("</mfrac>");
  });

  it("handles complex multi-term fractions", () => {
    const mathml = latexToMathML("\\frac{a + b}{c - d}");
    expect(mathml).toContain("<mfrac>");
    expect(mathml).toContain("<mi>a</mi>");
    expect(mathml).toContain("<mi>c</mi>");
  });

  it("handles nested fractions", () => {
    const mathml = latexToMathML("\\frac{1}{\\frac{2}{3}}");
    expect((mathml.match(/<mfrac>/g) || []).length).toBe(2);
  });

  it("handles superscripts (^2, ^{10})", () => {
    const mathml = latexToMathML("x^2 + y^{10}");
    expect(mathml).toContain("<msup>");
    expect(mathml).toContain("<mn>2</mn>");
    expect(mathml).toContain("<mn>10</mn>");
  });

  it("handles subscripts (a_i, a_{ij})", () => {
    const mathml = latexToMathML("a_i + a_{ij}");
    expect(mathml).toContain("<msub>");
    expect(mathml).toContain("<mi>i</mi>");
  });

  it("handles combined subscript and superscript (x_i^2)", () => {
    const mathml = latexToMathML("x_i^2");
    expect(mathml).toContain("<msubsup>");
    expect(mathml).toContain("<mi>x</mi>");
    expect(mathml).toContain("<mi>i</mi>");
    expect(mathml).toContain("<mn>2</mn>");
  });

  it("handles square roots (\\sqrt{x})", () => {
    const mathml = latexToMathML("\\sqrt{x + 1}");
    expect(mathml).toContain("<msqrt>");
    expect(mathml).toContain("<mi>x</mi>");
  });

  it("handles n-th roots (\\sqrt[3]{x})", () => {
    const mathml = latexToMathML("\\sqrt[3]{x}");
    expect(mathml).toContain("<mroot>");
    expect(mathml).toContain("<mn>3</mn>");
  });

  it("handles comparison operators (\\le, \\ge, \\ne, \\approx)", () => {
    const mathml = latexToMathML("a \\le b \\ge c \\ne d \\approx e");
    expect(mathml).toContain("<mo>≤</mo>");
    expect(mathml).toContain("<mo>≥</mo>");
    expect(mathml).toContain("<mo>≠</mo>");
    expect(mathml).toContain("<mo>≈</mo>");
  });

  it("handles arithmetic operators (\\times, \\div, \\cdot, \\pm)", () => {
    const mathml = latexToMathML("a \\times b \\div c \\cdot d \\pm e");
    expect(mathml).toContain("<mo>×</mo>");
    expect(mathml).toContain("<mo>÷</mo>");
    expect(mathml).toContain("<mo>·</mo>");
    expect(mathml).toContain("<mo>±</mo>");
  });

  it("handles calculus and big operators (\\sum, \\prod, \\int, \\lim)", () => {
    const mathml = latexToMathML("\\sum_{i=1}^n i");
    expect(mathml).toContain("<mo>∑</mo>");
  });

  it("handles infinity and arrows (\\infty, \\to)", () => {
    const mathml = latexToMathML("x \\to \\infty");
    expect(mathml).toContain("<mo>→</mo>");
    expect(mathml).toContain("<mo>∞</mo>");
  });

  it("converts Greek lowercase letters (\\alpha, \\beta, \\pi, \\theta)", () => {
    const mathml = latexToMathML("\\alpha + \\beta = \\pi");
    expect(mathml).toContain("<mi>α</mi>");
    expect(mathml).toContain("<mi>β</mi>");
    expect(mathml).toContain("<mi>π</mi>");
  });

  it("converts Greek uppercase letters (\\Delta, \\Omega)", () => {
    const mathml = latexToMathML("\\Delta x + \\Omega");
    expect(mathml).toContain("<mi>Δ</mi>");
    expect(mathml).toContain("<mi>Ω</mi>");
  });

  it("handles mathematical functions (\\sin, \\cos, \\log, \\ln)", () => {
    const mathml = latexToMathML("\\sin(x) + \\log(n)");
    expect(mathml).toContain('<mi mathvariant="normal">sin</mi>');
    expect(mathml).toContain('<mi mathvariant="normal">log</mi>');
  });

  it("handles delimiters (\\left( ... \\right))", () => {
    const mathml = latexToMathML("\\left( \\frac{a}{b} \\right)");
    expect(mathml).toContain('<mo fence="true">(</mo>');
    expect(mathml).toContain('<mo fence="true">)</mo>');
  });

  it("handles bracket delimiters (\\left[ ... \\right])", () => {
    const mathml = latexToMathML("\\left[ x \\right]");
    expect(mathml).toContain('<mo fence="true">[</mo>');
    expect(mathml).toContain('<mo fence="true">]</mo>');
  });

  it("supports displayMode block vs inline", () => {
    const inlineMath = latexToMathML("x^2", false);
    expect(inlineMath).toContain('display="inline"');

    const blockMath = latexToMathML("x^2", true);
    expect(blockMath).toContain('display="block"');
  });

  it("gracefully falls back for unsupported commands without throwing", () => {
    const mathml = latexToMathML("\\unknowncmd{test}");
    expect(mathml).toContain("unsupported-math");
    expect(mathml).toContain("\\unknowncmd");
  });

  it("safely handles unclosed braces without crashing", () => {
    expect(() => latexToMathML("\\frac{1}{2")).not.toThrow();
  });

  it("handles empty or whitespace-only formulas", () => {
    expect(latexToMathML("")).toBe("");
    expect(latexToMathML("   ")).toBe("");
  });

  it("handles text blocks inside formulas (\\text{cost})", () => {
    const mathml = latexToMathML("O(n) + \\text{constant}");
    expect(mathml).toContain("<mtext>constant</mtext>");
  });

  it("handles partial derivatives (\\partial)", () => {
    const mathml = latexToMathML("\\frac{\\partial y}{\\partial x}");
    expect(mathml).toContain("<mo>∂</mo>");
  });

  it("renders quadratic formula completely", () => {
    const formula = "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}";
    const mathml = latexToMathML(formula, true);
    expect(mathml).toContain('display="block"');
    expect(mathml).toContain("<mfrac>");
    expect(mathml).toContain("<msqrt>");
    expect(mathml).toContain("<mo>±</mo>");
  });
});
