import type { ValidationResult } from "@stamp-generator/geometry-core";

export interface ValidationMessagesProps {
  result: ValidationResult;
}

export function ValidationMessages({ result }: ValidationMessagesProps) {
  const issues = result.ok ? [] : result.issues;

  return (
    <ul>
      {issues.map((issue) => (
        <li key={issue.code}>{issue.message}</li>
      ))}
    </ul>
  );
}
