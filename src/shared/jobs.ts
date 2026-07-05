/** Job.type conventions for the lightweight queue stand-in. */
export const JOB_TYPES = [
  "import",
  "export",
  "automation_register",
  "automation_run"
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export function isValidJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}
