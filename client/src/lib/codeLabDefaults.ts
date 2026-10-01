import type { CodeLanguage, CodeExamType } from '../types/db';

export type CodeLabContextDefaults = {
  language: CodeLanguage;
  examType: CodeExamType;
  topic: string;
  suggestions: string[];
};

const RULES: {
  match: RegExp;
  language: CodeLanguage;
  examType: CodeExamType;
  topic: string;
  suggestions: string[];
}[] = [
  {
    match: /\b(oop|object[- ]oriented|java|software design)\b/i,
    language: 'javascript',
    examType: 'logic_completion',
    topic: 'OOP — classes, inheritance, encapsulation',
    suggestions: [
      'Implement a simple class hierarchy (Animal → Dog) with overridden methods',
      'Explain stack vs heap allocation for objects vs primitives',
      'Write equals/hashCode correctly for a value object',
    ],
  },
  {
    match: /\b(c\+\+|cpp|systems|pointers|memory)\b/i,
    language: 'c',
    examType: 'bug_fix',
    topic: 'Pointers, ownership, and memory safety',
    suggestions: [
      'Find the use-after-free in a small C++ snippet',
      'Rewrite a raw pointer API using unique_ptr',
      'Trace stack vs heap lifetimes for a returned reference',
    ],
  },
  {
    match: /\b(c#|csharp|\.net|asp)\b/i,
    language: 'typescript',
    examType: 'output_prediction',
    topic: 'C# collections and LINQ (solve as TypeScript-equivalent)',
    suggestions: [
      'Predict LINQ deferred-execution output',
      'Fix a boxing/unboxing subtlety',
      'Implement IEquatable for a struct',
    ],
  },
  {
    match: /\b(web|javascript|typescript|node|react|frontend)\b/i,
    language: 'javascript',
    examType: 'bug_fix',
    topic: 'Async JS and closures',
    suggestions: [
      'Fix a stale closure in a loop with setTimeout',
      'Rewrite callback hell as async/await',
      'Predict Promise.allSettled vs Promise.all outcomes',
    ],
  },
  {
    match: /\b(data.?struct|algorithm|dsa|leet)\b/i,
    language: 'javascript',
    examType: 'logic_completion',
    topic: 'Arrays, stacks, and recursion',
    suggestions: [
      'Complete a stack-based parentheses matcher',
      'Trace recursive DFS vs BFS on a tiny graph',
      'Fix an off-by-one in binary search',
    ],
  },
  {
    match: /\b(database|sql|postgres|query)\b/i,
    language: 'javascript',
    examType: 'output_prediction',
    topic: 'SQL thinking in code — joins and aggregation',
    suggestions: [
      'Predict nested-loop join cardinality on toy tables',
      'Write a group-by aggregation as map/reduce',
      'Spot an N+1 query pattern in sample code',
    ],
  },
];

const FALLBACK: CodeLabContextDefaults = {
  language: 'javascript',
  examType: 'bug_fix',
  topic: '',
  suggestions: [
    'Write a function that reverses a string in-place',
    'Fix the off-by-one bug in this loop',
    'Predict the console output of this snippet',
  ],
};

/** Infer Code Lab defaults from module code + name + optional tags. */
export function codeLabDefaultsForModule(input: {
  code?: string;
  name?: string;
  tags?: string[];
}): CodeLabContextDefaults {
  const hay = [input.code, input.name, ...(input.tags || [])].filter(Boolean).join(' ');
  if (!hay.trim()) return FALLBACK;
  for (const rule of RULES) {
    if (rule.match.test(hay)) {
      return {
        language: rule.language,
        examType: rule.examType,
        topic: rule.topic,
        suggestions: rule.suggestions,
      };
    }
  }
  return {
    ...FALLBACK,
    topic: input.name?.trim() || input.code?.trim() || '',
  };
}
