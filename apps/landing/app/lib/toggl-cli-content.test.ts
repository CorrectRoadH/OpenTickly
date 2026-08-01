import { describe, expect, it } from "vitest";
import {
  togglCliCommands,
  togglCliFaq,
  togglCliFeatures,
  togglCliInstallCommands,
} from "./toggl-cli-content";

describe("toggl-cli landing content", () => {
  it("gives people and agents a direct installation path", () => {
    expect(togglCliInstallCommands).toEqual({
      agent: "npx skills add CorrectRoadH/toggl-cli",
      cli: "npm install -g @correctroadh/toggl-cli",
    });
  });

  it("covers the complete daily Toggl workflow", () => {
    expect(togglCliFeatures.map((feature) => feature.title)).toEqual([
      "Track time",
      "Browse entries",
      "Manage work",
      "Run reports",
      "Choose your backend",
      "Stay fast and secure",
    ]);

    expect(togglCliCommands).toMatchObject({
      entry: expect.arrayContaining(["toggl entry start", "toggl entry stop"]),
      resources: expect.arrayContaining([
        "toggl project create",
        "toggl task create",
        "toggl tag create",
      ]),
      reports: expect.arrayContaining([
        "toggl report summary",
        "toggl report detailed",
        "toggl report weekly",
      ]),
    });
  });

  it("answers the backend and agent compatibility questions", () => {
    const questions = togglCliFaq.map((item) => item.question).join(" ");
    expect(questions).toContain("Toggl Track");
    expect(questions).toContain("OpenToggl");
    expect(questions).toContain("AI agents");
  });
});
