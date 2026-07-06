import type { CampaignCommand, RuntimeContext, RuntimeDiagnostic, ValidationPipeline, ValidationResult } from "./types.ts";

export class DefaultValidationPipeline implements ValidationPipeline {
  async validate(command: CampaignCommand, context: RuntimeContext): Promise<ValidationResult> {
    const diagnostics: RuntimeDiagnostic[] = [];

    if (!context.pluginRegistry.hasCommand(command.type)) {
      diagnostics.push({
        code: "command.unknown",
        message: `Command type "${command.type}" is not registered.`,
        severity: "error",
        source: "ValidationPipeline"
      });
      return { ok: false, diagnostics };
    }

    for (const validator of context.pluginRegistry.getValidators(command.type)) {
      const validatorDiagnostics = (await validator(command, context)) ?? [];
      diagnostics.push(...validatorDiagnostics);
    }

    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      return { ok: false, diagnostics };
    }

    return {
      ok: true,
      command: { ...command, validated: true },
      diagnostics
    };
  }
}
