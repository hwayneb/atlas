import type { RuleEngine, RuleExecutionResult, RuntimeContext, ValidatedCommand } from "./types.ts";

export class DefaultRuleEngine implements RuleEngine {
  async execute(command: ValidatedCommand, context: RuntimeContext): Promise<RuleExecutionResult> {
    const handler = context.pluginRegistry.getRuleHandler(command.type);

    if (!handler) {
      return {
        ok: false,
        events: [],
        diagnostics: [
          {
            code: "rule.missing_handler",
            message: `No rule handler is registered for command type "${command.type}".`,
            severity: "error",
            source: "RuleEngine"
          }
        ]
      };
    }

    const result = await handler(command, context);

    if (Array.isArray(result)) {
      return {
        ok: true,
        events: result,
        diagnostics: []
      };
    }

    return result;
  }
}
