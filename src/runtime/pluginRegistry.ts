import type {
  CommandDefinition,
  CommandValidator,
  EventSchema,
  EventMetadataSchema,
  PluginRegistry,
  ProjectionReducer,
  RuleHandler,
  RuntimePlugin,
  PluginInitContext,
  StartupHook
} from "./types.ts";

export class DefaultPluginRegistry implements PluginRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly validators = new Map<string, CommandValidator[]>();
  private readonly ruleHandlers = new Map<string, RuleHandler>();
  private readonly eventSchemas = new Map<string, EventSchema>();
  private readonly metadataSchemas = new Map<number, EventMetadataSchema>();
  private readonly projectionReducers: ProjectionReducer[] = [];
  private readonly startupHooks: StartupHook[] = [];

  load(plugin: RuntimePlugin, context: PluginInitContext): void {
    plugin.initialize(context);
    plugin.register(this);
  }

  registerCommand(definition: CommandDefinition): void {
    this.commands.set(definition.type, definition);
  }

  registerValidator(commandType: string, validator: CommandValidator): void {
    const validators = this.validators.get(commandType) ?? [];
    validators.push(validator);
    this.validators.set(commandType, validators);
  }

  registerRuleHandler(commandType: string, handler: RuleHandler): void {
    this.ruleHandlers.set(commandType, handler);
  }

  registerEventSchema(schema: EventSchema): void {
    this.eventSchemas.set(schemaKey(schema.type, schema.schemaVersion), schema);
  }

  registerMetadataSchema(schema: EventMetadataSchema): void {
    this.metadataSchemas.set(schema.metadataVersion, schema);
  }

  registerProjectionReducer(reducer: ProjectionReducer): void {
    this.projectionReducers.push(reducer);
  }

  registerStartupHook(hook: StartupHook): void {
    this.startupHooks.push(hook);
  }

  hasCommand(commandType: string): boolean {
    return this.commands.has(commandType);
  }

  getValidators(commandType: string): CommandValidator[] {
    return [...(this.validators.get(commandType) ?? [])];
  }

  getRuleHandler(commandType: string): RuleHandler | undefined {
    return this.ruleHandlers.get(commandType);
  }

  getEventSchema(eventType: string, schemaVersion: number): EventSchema | undefined {
    return this.eventSchemas.get(schemaKey(eventType, schemaVersion));
  }

  getMetadataSchema(metadataVersion: number): EventMetadataSchema | undefined {
    return this.metadataSchemas.get(metadataVersion);
  }

  getProjectionReducers(): ProjectionReducer[] {
    return [...this.projectionReducers];
  }

  getStartupHooks(): StartupHook[] {
    return [...this.startupHooks];
  }
}

function schemaKey(type: string, schemaVersion: number): string {
  return `${type}@${schemaVersion}`;
}
