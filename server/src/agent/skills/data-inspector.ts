import { ToolDefinition } from '../types.js';

export interface DataInspectorParams {
  data: string; // JSON string or raw text
  maxSampleValues?: number;
}

export interface ColumnProfile {
  name: string;
  inferredType: string;
  nonNullCount: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: unknown[];
  stats?: {
    min?: number;
    max?: number;
    average?: number;
  };
}

export interface DataProfileResult {
  isParsed: boolean;
  totalRecords: number;
  columnCount: number;
  columns: ColumnProfile[];
  summary: string;
}

export const dataInspectorTool: ToolDefinition<DataInspectorParams, DataProfileResult> = {
  name: 'data_inspector',
  description:
    'Profiles and inspects raw JSON data or tabular datasets. Extracts column names, inferred data types, non-null counts, distinct counts, sample values, and numeric summary statistics.',
  parameters: {
    type: 'object',
    properties: {
      data: {
        type: 'string',
        description: 'The JSON string or array of records to inspect and profile.',
      },
      maxSampleValues: {
        type: 'number',
        description: 'Maximum distinct sample values to include per column (default 5).',
      },
    },
    required: ['data'],
  },
  execute: async ({ data, maxSampleValues = 5 }) => {
    let parsed: unknown;
    try {
      parsed = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return {
        isParsed: false,
        totalRecords: 0,
        columnCount: 0,
        columns: [],
        summary: 'Failed to parse data as valid JSON. Ensure input is a valid JSON array or object.',
      };
    }

    let records: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      records = parsed.filter((r) => r !== null && typeof r === 'object') as Record<string, unknown>[];
    } else if (parsed !== null && typeof parsed === 'object') {
      records = [parsed as Record<string, unknown>];
    }

    if (records.length === 0) {
      return {
        isParsed: true,
        totalRecords: 0,
        columnCount: 0,
        columns: [],
        summary: 'Dataset is empty or contains no record objects.',
      };
    }

    const columnNames = Array.from(new Set(records.flatMap((r) => Object.keys(r))));
    const columns: ColumnProfile[] = columnNames.map((name) => {
      let nullCount = 0;
      let nonNullCount = 0;
      const values: unknown[] = [];
      const numericValues: number[] = [];

      for (const record of records) {
        const val = record[name];
        if (val === null || val === undefined || val === '') {
          nullCount++;
        } else {
          nonNullCount++;
          values.push(val);
          if (typeof val === 'number' && !isNaN(val)) {
            numericValues.push(val);
          } else if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
            numericValues.push(Number(val));
          }
        }
      }

      // Infer dominant type
      let inferredType = 'unknown';
      if (numericValues.length > nonNullCount * 0.7) {
        inferredType = 'number';
      } else if (values.some((v) => typeof v === 'boolean')) {
        inferredType = 'boolean';
      } else if (values.some((v) => typeof v === 'string' && !isNaN(Date.parse(v)) && v.length > 5)) {
        inferredType = 'datetime';
      } else if (values.some((v) => typeof v === 'string')) {
        inferredType = 'string';
      } else if (values.some((v) => Array.isArray(v))) {
        inferredType = 'array';
      } else if (values.some((v) => typeof v === 'object')) {
        inferredType = 'object';
      }

      const uniqueSet = new Set(values.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))));
      const sampleValues = Array.from(uniqueSet).slice(0, maxSampleValues);

      let stats: ColumnProfile['stats'] = undefined;
      if (inferredType === 'number' && numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        stats = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          average: Number((sum / numericValues.length).toFixed(2)),
        };
      }

      return {
        name,
        inferredType,
        nonNullCount,
        nullCount,
        uniqueCount: uniqueSet.size,
        sampleValues,
        stats,
      };
    });

    return {
      isParsed: true,
      totalRecords: records.length,
      columnCount: columns.length,
      columns,
      summary: `Successfully profiled ${records.length} records across ${columns.length} columns.`,
    };
  },
};
