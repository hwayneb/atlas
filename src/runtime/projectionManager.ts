import type {
  CampaignEvent,
  ProjectionApplyResult,
  ProjectionDefinition,
  ProjectionManager,
  ProjectionSet,
  RuntimeDiagnostic
} from "./types.ts";

type StoredProjection<TState = any> = {
  definition: ProjectionDefinition<TState>;
  state: TState;
};

export class ProjectionManagerError extends Error {
  readonly diagnostics: RuntimeDiagnostic[];
  readonly result?: ProjectionApplyResult;

  constructor(message: string, diagnostics: RuntimeDiagnostic[], result?: ProjectionApplyResult) {
    super(message);
    this.name = "ProjectionManagerError";
    this.diagnostics = diagnostics;
    this.result = result;
  }
}

export class DefaultProjectionManager implements ProjectionManager {
  private readonly projections = new Map<string, StoredProjection>();
  private latestSequence = 0;

  constructor(definitions: ProjectionDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register<TState>(definition: ProjectionDefinition<TState>): void {
    validateDefinition(definition);

    if (this.projections.has(definition.name)) {
      throw new ProjectionManagerError(
        `Projection "${definition.name}" is already registered.`,
        [
          {
            code: "projection.duplicate_registration",
            message: `Projection "${definition.name}" is already registered.`,
            severity: "error",
            source: "ProjectionManager"
          }
        ]
      );
    }

    this.projections.set(definition.name, {
      definition,
      state: createInitialState(definition)
    });
  }

  reset(): void {
    for (const projection of this.projections.values()) {
      projection.state = createInitialState(projection.definition);
    }
    this.latestSequence = 0;
  }

  restore(projections: ProjectionSet): void {
    for (const [name, projection] of this.projections) {
      if (Object.hasOwn(projections, name)) {
        projection.state = cloneValue(projections[name]);
      } else {
        projection.state = createInitialState(projection.definition);
      }
    }
    this.latestSequence = 0;
  }

  apply(event: CampaignEvent): void {
    const result = this.applyEvent(event);
    if (!result.ok) {
      throw new ProjectionManagerError("Projection application failed.", result.diagnostics, result);
    }
  }

  rebuild(events: CampaignEvent[]): ProjectionSet {
    this.reset();
    for (const event of events) {
      this.apply(event);
    }
    return this.getCurrent();
  }

  get<TState = unknown>(name: string): Readonly<TState> | undefined {
    const projection = this.projections.get(name);
    if (!projection) {
      return undefined;
    }

    return cloneReadonly(projection.state) as Readonly<TState>;
  }

  has(name: string): boolean {
    return this.projections.has(name);
  }

  getCurrent(): ProjectionSet {
    const current: ProjectionSet = {};
    for (const [name, projection] of this.projections) {
      current[name] = cloneReadonly(projection.state);
    }
    return deepFreeze(current);
  }

  applyEvent(event: CampaignEvent): ProjectionApplyResult {
    const diagnostics: RuntimeDiagnostic[] = [];

    for (const [name, projection] of this.projections) {
      try {
        const previousState = projection.state;
        const nextState = projection.definition.apply(event, cloneReadonly(previousState));
        if (nextState !== undefined) {
          projection.state = cloneValue(nextState);
        }
      } catch (error) {
        diagnostics.push({
          code: "projection.apply_failed",
          message: error instanceof Error ? error.message : `Projection "${name}" failed.`,
          severity: "error",
          source: "ProjectionManager",
          sequence: event.sequence,
          eventId: event.id
        });
      }
    }

    if (diagnostics.length === 0) {
      this.latestSequence = event.sequence;
    }

    return {
      ok: diagnostics.length === 0,
      latestSequence: this.latestSequence,
      diagnostics
    };
  }
}

function validateDefinition<TState>(definition: ProjectionDefinition<TState>): void {
  if (!definition.name) {
    throw new ProjectionManagerError(
      "Projection name is required.",
      [
        {
          code: "projection.name_required",
          message: "Projection name is required.",
          severity: "error",
          source: "ProjectionManager"
        }
      ]
    );
  }

  if (typeof definition.apply !== "function") {
    throw new ProjectionManagerError(
      `Projection "${definition.name}" must provide an apply function.`,
      [
        {
          code: "projection.apply_required",
          message: `Projection "${definition.name}" must provide an apply function.`,
          severity: "error",
          source: "ProjectionManager"
        }
      ]
    );
  }
}

function createInitialState<TState>(definition: ProjectionDefinition<TState>): TState {
  const initial = typeof definition.initialState === "function"
    ? (definition.initialState as () => TState)()
    : definition.initialState;

  return cloneValue(initial);
}

function cloneReadonly<TValue>(value: TValue): Readonly<TValue> {
  return deepFreeze(cloneValue(value)) as Readonly<TValue>;
}

function cloneValue<TValue>(value: TValue): TValue {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as TValue;
}

function deepFreeze<TValue>(value: TValue): TValue {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}
