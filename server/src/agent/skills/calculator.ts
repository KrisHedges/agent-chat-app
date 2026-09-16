import { ToolDefinition } from '../types.js';

export interface CalculatorParams {
  expression: string;
}

export interface CalculatorResult {
  expression: string;
  result: number | string;
  isSuccess: boolean;
  error?: string;
}

export const calculatorTool: ToolDefinition<CalculatorParams, CalculatorResult> = {
  name: 'calculator',
  description:
    'Evaluates basic mathematical expressions (addition, subtraction, multiplication, division, powers, percentages, averages). Prevents mathematical hallucinations.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to compute, e.g. "45000 / 12 * 1.15" or "Math.sqrt(144) * 5".',
      },
    },
    required: ['expression'],
  },
  execute: async ({ expression }) => {
    try {
      const trimmed = (expression || '').trim();
      // Strip whitelisted Math functions and verify all remaining characters are digits/operators
      const withoutAllowedFunctions = trimmed.replace(
        /Math\.(sqrt|pow|round|floor|ceil|abs|min|max|PI|E)/g,
        ''
      );
      const isSafe = /^[0-9+\-*/().,%^ \t]+$/.test(withoutAllowedFunctions);

      if (!isSafe) {
        return {
          expression,
          result: 'NaN',
          isSuccess: false,
          error: 'Expression contains disallowed characters or unauthorized functions.',
        };
      }

      // Safe function evaluation restricted to strictly validated math expressions
      const fn = new Function(`return (${trimmed});`);
      const val = fn();
      if (typeof val !== 'number' || isNaN(val)) {
        return {
          expression,
          result: 'NaN',
          isSuccess: false,
          error: 'Calculation did not produce a valid numeric result.',
        };
      }
      return {
        expression,
        result: Number(val.toFixed(6)),
        isSuccess: true,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        expression,
        result: 'Error',
        isSuccess: false,
        error: errMsg,
      };
    }
  },
};
