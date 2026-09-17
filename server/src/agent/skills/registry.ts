import { ToolDefinition, Skill } from '../types.js';
import { dataInspectorTool } from './data-inspector.js';
import { calculatorTool } from './calculator.js';
import { promptArchitectTool } from './prompt-architect.js';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.register(dataInspectorTool as unknown as ToolDefinition);
    this.register(calculatorTool as unknown as ToolDefinition);
    this.register(promptArchitectTool as unknown as ToolDefinition);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerSkill(skill: Skill): void {
    for (const tool of skill.tools) {
      this.register(tool);
    }
  }

  get(name: string): ToolDefinition | undefined {
    if (this.tools.has(name)) {
      return this.tools.get(name);
    }
    const cleanName = name.includes(':') ? name.split(':').pop()! : name;
    return this.tools.get(cleanName);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Formats registered tools for the @google/genai SDK
   */
  toGeminiTools(): Array<{ functionDeclarations: Array<Record<string, unknown>> }> {
    const declarations = this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    if (declarations.length === 0) {
      return [];
    }

    return [{ functionDeclarations: declarations }];
  }
}

export const defaultToolRegistry = new ToolRegistry();
