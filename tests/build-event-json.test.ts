/**
 * Covers the NormalizedEvent JSON the action hands to `@coopkit/meetup`.
 * Each case's output is compared byte for byte with
 * tests/fixtures/event-json/<fixture>.json.
 *
 *   bun test                        # check
 *   UPDATE_FIXTURES=1 bun test      # rewrite the fixtures from the current action.yml
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildStep, runBuildStep } from "./run-build-step";

const FIXTURES = join(import.meta.dir, "fixtures", "event-json");

const BASE = {
  title: "Self-test event",
  date: "2026-12-01T18:00:00Z",
  "venue-key": "online",
};

const cases: Array<{ name: string; fixture: string; inputs: Record<string, string> }> = [
  {
    name: "no speaker, required inputs only",
    fixture: "no-speaker-minimal",
    inputs: BASE,
  },
  {
    name: "no speaker, every pre-existing event input set",
    fixture: "no-speaker-all-fields",
    inputs: {
      ...BASE,
      duration: "PT1H30M",
      description: 'Line one with "quotes" and $dollar.\n\n- a bullet\n',
      "image-url": "https://images.example.test/banner.jpg",
      id: "custom-id",
    },
  },
  {
    // Bio, URLs and avatar mean nothing without a name, so no speaker is sent.
    name: "speaker fields without speaker-name",
    fixture: "no-speaker-minimal",
    inputs: {
      ...BASE,
      "speaker-bio": "A bio with no name attached.",
      "speaker-urls": "https://example.test/",
      "speaker-avatar-url": "https://images.example.test/avatar.png",
    },
  },
  {
    name: "speaker, name only",
    fixture: "speaker-name-only",
    inputs: { ...BASE, "speaker-name": "Jane Doe" },
  },
  {
    name: "speaker, every field (multi-line bio, messy URL list, avatar)",
    fixture: "speaker-full",
    inputs: {
      ...BASE,
      "speaker-name": "Jane Doe",
      "speaker-bio":
        "Jane works on **compilers** at Example Corp.\n\nShe maintains a `ranges` library and\nwrites about C++ at night.\n",
      "speaker-urls":
        "  https://jane.example.test/  \n\nhttps://www.linkedin.com/in/janedoe/\r\n   \n\thttps://github.com/janedoe\t\n",
      "speaker-avatar-url": "https://images.example.test/speaker-avatars/jane.png",
    },
  },
  {
    name: "speaker with a Unicode name and bio",
    fixture: "speaker-unicode",
    inputs: {
      ...BASE,
      "speaker-name": "Đorđe Šašić",
      "speaker-bio": "Đorđe Šašić — C++ developer from Niš.\nЂорђе Шашић.",
    },
  },
];

describe("Build NormalizedEvent JSON step", () => {
  test("never interpolates ${{ }} into the script body", () => {
    expect(buildStep.run).not.toContain("${{");
  });

  for (const c of cases) {
    test(c.name, () => {
      const actual = runBuildStep(c.inputs);
      const path = join(FIXTURES, `${c.fixture}.json`);
      if (process.env.UPDATE_FIXTURES) writeFileSync(path, actual);
      expect(actual).toBe(readFileSync(path, "utf8"));
    });
  }
});
