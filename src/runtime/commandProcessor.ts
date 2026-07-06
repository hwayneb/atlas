import { DefaultRuleEngine } from "./ruleEngine.ts";
import { DefaultValidationPipeline } from "./validationPipeline.ts";
import type {
  CampaignCommand,
  CommandResult,
  RuleEngine,
  RuntimeContext,
  RuntimeDiagnostic,
  ValidationPipeline
} from "./types.ts";

export type CommandProcessorOptions = {
  validationPipeline?: ValidationPipeline;
  ruleEngine?: RuleEngine;
};

export class CommandProcessor {
  private readonly validationPipeline: ValidationPipeline;
  private readonly ruleEngine: RuleEngine;
  private readonly context: RuntimeContext;

  constructor(context: RuntimeContext, options: CommandProcessorOptions = {}) {
    this.context = context;
    this.validationPipeline = options.validationPipeline ?? new DefaultValidationPipeline();
    this.ruleEngine = options.ruleEngine ?? new DefaultRuleEngine();
  }

  async execute(command: CampaignCommand): Promise<CommandResult> {
    const validation = await this.validationPipeline.validate(command, this.context);
    if (!validation.ok || !validation.command) {
      return failure(command.id, validation.diagnostics);
    }

    const rules = await this.ruleEngine.execute(validation.command, this.context);
    if (!rules.ok) {
      return failure(command.id, rules.diagnostics);
    }

    const append = await this.context.eventStore.append(rules.events);
    if (!append.ok) {
      return failure(command.id, append.diagnostics);
    }

    try {
      for (const event of append.events) {
        await this.context.projectionManager.apply(event);
      }
    } catch (error) {
      return failure(command.id, [
        {
          code: "projection.update_failed",
          message: error instanceof Error ? error.message : "Projection update failed.",
          severity: "error",
          source: "CommandProcessor"
        }
      ]);
    }

    return {
      ok: true,
      commandId: command.id,
      appendedEvents: append.events,
      diagnostics: [...validation.diagnostics, ...rules.diagnostics, ...append.diagnostics]
    };
  }
}

function failure(commandId: string, diagnostics: RuntimeDiagnostic[]): CommandResult {
  return {
    ok: false,
    commandId,
    appendedEvents: [],
    diagnostics
  };
}
