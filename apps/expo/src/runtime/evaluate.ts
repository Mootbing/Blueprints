import { Parser } from "expr-eval";

const parser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    concatenate: true,
    conditional: true,
    assignment: false,
  },
});

export function evaluate(
  expression: string,
  context: { variables: Record<string, unknown> }
): unknown {
  try {
    const expr = parser.parse(expression);
    return expr.evaluate(context as any);
  } catch {
    return undefined;
  }
}
