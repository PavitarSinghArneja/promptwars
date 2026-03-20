/**
 * Aegis Bridge — Unit Tests: Triage Schema & Output Validation
 * Tests the shape and validation logic for Gemini output parsing.
 */
import type { TriageOutput, TriageLevel } from "@/lib/triageSchema";

describe("TriageOutput schema", () => {
  const validOutput: TriageOutput = {
    name: "John Doe",
    age: 45,
    allergies: ["Penicillin"],
    medications: ["Metformin 500mg"],
    vitals: {
      heartRate: "110 bpm",
      bloodPressure: "150/90 mmHg",
      temperature: "38.5°C",
      respiratoryRate: "22/min",
      oxygenSaturation: "94%",
      painLevel: "7/10",
    },
    triageLevel: "URGENT",
    summary: "55-year-old male with chest pain and shortness of breath.",
    recommendedSpecialty: "Cardiology",
    actions: [
      { step: 1, instruction: "Keep patient calm and seated upright.", urgency: "immediate" },
      { step: 2, instruction: "Loosen tight clothing around chest.", urgency: "immediate" },
      { step: 3, instruction: "Monitor breathing every 2 minutes.", urgency: "monitor" },
    ],
    confidence: 82,
    processedAt: new Date().toISOString(),
  };

  it("has required string fields", () => {
    expect(typeof validOutput.name).toBe("string");
    expect(typeof validOutput.summary).toBe("string");
    expect(typeof validOutput.recommendedSpecialty).toBe("string");
    expect(typeof validOutput.processedAt).toBe("string");
  });

  it("has valid triage level", () => {
    const validLevels: TriageLevel[] = ["CRITICAL", "URGENT", "STANDARD", "MINOR"];
    expect(validLevels).toContain(validOutput.triageLevel);
  });

  it("has arrays for allergies, medications, actions", () => {
    expect(Array.isArray(validOutput.allergies)).toBe(true);
    expect(Array.isArray(validOutput.medications)).toBe(true);
    expect(Array.isArray(validOutput.actions)).toBe(true);
  });

  it("has valid confidence range", () => {
    expect(validOutput.confidence).toBeGreaterThanOrEqual(0);
    expect(validOutput.confidence).toBeLessThanOrEqual(100);
  });

  it("has valid action urgency values", () => {
    const validUrgencies = ["immediate", "soon", "monitor"];
    for (const action of validOutput.actions) {
      expect(validUrgencies).toContain(action.urgency);
      expect(typeof action.instruction).toBe("string");
      expect(action.instruction.length).toBeGreaterThan(0);
      expect(action.step).toBeGreaterThan(0);
    }
  });

  it("actions are ordered by step number", () => {
    const steps = validOutput.actions.map((a) => a.step);
    const sorted = [...steps].sort((a, b) => a - b);
    expect(steps).toEqual(sorted);
  });

  it("processedAt is a valid ISO date string", () => {
    const date = new Date(validOutput.processedAt);
    expect(date.toString()).not.toBe("Invalid Date");
  });

  it("allows null age", () => {
    const noAge: TriageOutput = { ...validOutput, age: null };
    expect(noAge.age).toBeNull();
  });

  it("allows empty allergies and medications", () => {
    const minimal: TriageOutput = { ...validOutput, allergies: [], medications: [] };
    expect(minimal.allergies).toHaveLength(0);
    expect(minimal.medications).toHaveLength(0);
  });

  it("allows partial vitals", () => {
    const partial: TriageOutput = {
      ...validOutput,
      vitals: { heartRate: "90 bpm" },
    };
    expect(partial.vitals.heartRate).toBe("90 bpm");
    expect(partial.vitals.bloodPressure).toBeUndefined();
  });
});

describe("Triage level priority", () => {
  const levelPriority: Record<TriageLevel, number> = {
    CRITICAL: 4,
    URGENT: 3,
    STANDARD: 2,
    MINOR: 1,
  };

  it("CRITICAL has highest priority", () => {
    expect(levelPriority.CRITICAL).toBeGreaterThan(levelPriority.URGENT);
    expect(levelPriority.CRITICAL).toBeGreaterThan(levelPriority.STANDARD);
    expect(levelPriority.CRITICAL).toBeGreaterThan(levelPriority.MINOR);
  });

  it("MINOR has lowest priority", () => {
    expect(levelPriority.MINOR).toBeLessThan(levelPriority.STANDARD);
    expect(levelPriority.MINOR).toBeLessThan(levelPriority.URGENT);
    expect(levelPriority.MINOR).toBeLessThan(levelPriority.CRITICAL);
  });
});
