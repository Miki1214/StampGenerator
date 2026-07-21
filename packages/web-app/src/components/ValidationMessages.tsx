import type { ValidationResult } from "@stamp-generator/geometry-core";

export interface ValidationMessagesProps {
  result: ValidationResult;
}

export function ValidationMessages({ result }: ValidationMessagesProps) {
  if (result.ok) {
    return null;
  }

  return (
    <ul>
      {result.issues.map((issue) => (
        <li key={issue.code}>{issue.message}</li>
      ))}
    </ul>
  );
}
