/**
 * Runs action.yml's "Build NormalizedEvent JSON" step locally, the way the
 * runner does: the step's `env:` block is resolved from the given inputs (or
 * the inputs' defaults), and its `run:` body is executed with
 * `bash --noprofile --norc -eo pipefail`. Nothing is copied out of action.yml,
 * so the tests exercise the exact script that ships.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface ActionInput {
  default?: string;
}

interface ActionStep {
  id?: string;
  env?: Record<string, string>;
  run?: string;
}

interface ActionManifest {
  inputs: Record<string, ActionInput>;
  runs: { steps: ActionStep[] };
}

const actionPath = join(import.meta.dir, "..", "action.yml");
const action = Bun.YAML.parse(readFileSync(actionPath, "utf8")) as ActionManifest;

export const buildStep: ActionStep = (() => {
  const step = action.runs.steps.find((s) => s.id === "build");
  if (!step?.run || !step.env) throw new Error("action.yml has no `build` step with env + run");
  return step;
})();

const INPUT_EXPR = /^\$\{\{\s*inputs\.([A-Za-z0-9_-]+)\s*\}\}$/;

/** Resolve the step's env the way GitHub does: explicit input, else its default. */
function resolveEnv(inputs: Record<string, string>): Record<string, string> {
  for (const name of Object.keys(inputs)) {
    if (!(name in action.inputs)) throw new Error(`unknown action input: ${name}`);
  }
  const env: Record<string, string> = {};
  for (const [key, expr] of Object.entries(buildStep.env ?? {})) {
    const match = INPUT_EXPR.exec(expr);
    if (!match) throw new Error(`unsupported env expression for ${key}: ${expr}`);
    const name = match[1] as string;
    const input = action.inputs[name];
    if (!input) throw new Error(`env ${key} references unknown input: ${name}`);
    env[key] = inputs[name] ?? input.default ?? "";
  }
  return env;
}

/** Run the build step and return the exact bytes it wrote to event.json. */
export function runBuildStep(inputs: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "coopkit-build-"));
  try {
    const script = join(dir, "build.sh");
    const githubOutput = join(dir, "github-output");
    writeFileSync(script, buildStep.run as string);
    writeFileSync(githubOutput, "");

    const proc = Bun.spawnSync(["bash", "--noprofile", "--norc", "-eo", "pipefail", script], {
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        LANG: "C.UTF-8",
        RUNNER_TEMP: dir,
        GITHUB_OUTPUT: githubOutput,
        ...resolveEnv(inputs),
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode !== 0) {
      throw new Error(`build step failed (${proc.exitCode}):\n${proc.stderr.toString()}`);
    }

    const eventJsonPath = join(dir, "event.json");
    const outputs = readFileSync(githubOutput, "utf8");
    if (!outputs.includes(`event-json=${eventJsonPath}\n`)) {
      throw new Error(`build step did not set the event-json output:\n${outputs}`);
    }
    return readFileSync(eventJsonPath, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
