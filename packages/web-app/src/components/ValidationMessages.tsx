import type { ValidationResult } from "@stamp-generator/geometry-core";

export interface ValidationMessagesProps {
  result: ValidationResult;
}

export function ValidationMessages({ result }: ValidationMessagesProps) {
  if (result.ok) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-red-400/40 bg-red-400/5 px-5 py-4">
      <p className="font-mono text-xs text-red-300 mb-2">Validation issues</p>
      <ul className="space-y-1.5 list-disc list-inside text-red-300 text-sm">
        {result.issues.map((issue) => (
          <li key={issue.code}>{issue.message}</li>
        ))}
      </ul>
    </div>
  );
}
