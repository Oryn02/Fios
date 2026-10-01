import { Type } from '@google/genai';

export const flashcardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: 'A concise title for the flashcard deck',
    },
    cards: {
      type: Type.ARRAY,
      description: 'List of generated flashcards',
      items: {
        type: Type.OBJECT,
        properties: {
          front: { 
            type: Type.STRING,
            description: 'Question, term, or code snippet prompt',
          },
          back: { 
            type: Type.STRING,
            description: 'Answer, definition, or code explanation',
          },
          sourcePage: {
            type: Type.INTEGER,
            description: 'Optional 1-based page number when notes use --- Page N --- markers',
          },
          sourceParagraph: {
            type: Type.INTEGER,
            description: 'Optional 1-based paragraph index within that page or section',
          },
          sourceQuote: {
            type: Type.STRING,
            description: 'Optional short verbatim quote grounding the card in the source',
          },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['title', 'cards'],
};

export const quizSchema = {
  type: Type.OBJECT,
  properties: {
    quizTitle: { 
      type: Type.STRING,
      description: 'A short title summarizing the quiz topic',
    },
    questions: {
      type: Type.ARRAY,
      description: 'List of multiple choice practice questions',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique question identifier (e.g., q1, q2)',
          },
          question: { 
            type: Type.STRING,
            description: 'The multiple-choice question text',
          },
          options: {
            type: Type.ARRAY,
            description: 'Array of exactly four multiple choice option strings',
            items: { type: Type.STRING },
          },
          correctIndex: { 
            type: Type.INTEGER,
            description: 'Zero-based index (0, 1, 2, or 3) of the correct option',
          },
          explanation: { 
            type: Type.STRING,
            description: 'Explanation detailing why the correct answer is right',
          },
        },
        required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
      },
    },
  },
  required: ['quizTitle', 'questions'],
};

export const codeExamSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A short, descriptive title for the coding challenge',
    },
    language: {
      type: Type.STRING,
      description: 'The programming language, one of: javascript, typescript, python, c',
    },
    examType: {
      type: Type.STRING,
      description: 'The challenge type: bug_fix, output_prediction, or logic_completion',
    },
    prompt: {
      type: Type.STRING,
      description: 'Clear instructions describing the task the student must complete',
    },
    starterCode: {
      type: Type.STRING,
      description: 'The code the student starts from (buggy code, snippet to trace, or incomplete function)',
    },
    solutionCode: {
      type: Type.STRING,
      description: 'The full correct solution code',
    },
    expectedOutput: {
      type: Type.STRING,
      description: 'For output_prediction challenges, the exact expected program output; otherwise an empty string',
    },
    explanation: {
      type: Type.STRING,
      description: 'A concise explanation of the correct solution and the key concept being tested',
    },
  },
  required: ['title', 'language', 'examType', 'prompt', 'starterCode', 'solutionCode', 'explanation'],
};

export const codeGradeSchema = {
  type: Type.OBJECT,
  properties: {
    correct: {
      type: Type.BOOLEAN,
      description: 'Whether the submitted solution correctly satisfies the challenge',
    },
    score: {
      type: Type.INTEGER,
      description: 'A score from 0 to 100 reflecting correctness and quality',
    },
    feedback: {
      type: Type.STRING,
      description: 'Constructive feedback explaining what is right or wrong and how to improve',
    },
  },
  required: ['correct', 'score', 'feedback'],
};

export const recallSchema = {
  type: Type.OBJECT,
  properties: {
    accuracy: {
      type: Type.INTEGER,
      description: 'Overall recall accuracy from 0 to 100',
    },
    concepts: {
      type: Type.ARRAY,
      description: 'Per-concept evaluation of the student\'s free recall',
      items: {
        type: Type.OBJECT,
        properties: {
          concept: { type: Type.STRING, description: 'The concept being evaluated' },
          status: { type: Type.STRING, description: 'One of: covered, partial, missed' },
          note: { type: Type.STRING, description: 'Brief note on how it was handled or what was missed' },
        },
        required: ['concept', 'status'],
      },
    },
  },
  required: ['accuracy', 'concepts'],
};

export const summarySchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A concise, well-structured summary of the material',
    },
    glossary: {
      type: Type.ARRAY,
      description: 'Key terms and their definitions',
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: 'The key term' },
          definition: { type: Type.STRING, description: 'A clear, concise definition' },
        },
        required: ['term', 'definition'],
      },
    },
  },
  required: ['summary', 'glossary'],
};

/** Structured notes returned from vision/audio multimodal processing. */
export const mediaNotesSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A short descriptive title for the extracted notes',
    },
    markdown: {
      type: Type.STRING,
      description: 'Structured study notes in Markdown (headings, bullets, code fences)',
    },
    codeBlocks: {
      type: Type.ARRAY,
      description: 'Any code snippets extracted or transcribed from the media',
      items: {
        type: Type.OBJECT,
        properties: {
          language: { type: Type.STRING, description: 'Programming language identifier' },
          code: { type: Type.STRING, description: 'The code content' },
        },
        required: ['language', 'code'],
      },
    },
  },
  required: ['title', 'markdown'],
};

/** Response shape for RAG chunk retrieval (documented for clients; not a Gemini schema). */
export const ragQueryResponseShape = {
  chunks: 'string[] — top-k retrieved chunk texts ranked by relevance',
  scores: 'number[] — parallel relevance scores (higher = better match)',
  query: 'string — echoed query',
} as const;

/** Mock oral exam turn — examiner question + brief rubric hint. */
export const oralExamSchema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: 'The next oral examiner question, clear and spoken aloud-friendly',
    },
    rubricHint: {
      type: Type.STRING,
      description: 'Brief notes on what a strong answer should cover (not shown as the answer)',
    },
    followUp: {
      type: Type.STRING,
      description: 'Optional follow-up probe if the student answer was incomplete; empty string if N/A',
    },
    score: {
      type: Type.INTEGER,
      description: '0-100 score for the previous student answer; use 0 if this is the opening question',
    },
    feedback: {
      type: Type.STRING,
      description: 'Short examiner feedback on the previous answer; empty for opening turn',
    },
  },
  required: ['question', 'rubricHint', 'score', 'feedback'],
};

/** Hierarchical mind-map graph from study notes. */
export const mindMapSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short title for the mind map',
    },
    nodes: {
      type: Type.ARRAY,
      description: 'Concept nodes',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Stable node id (e.g. n1)' },
          label: { type: Type.STRING, description: 'Short node label' },
          summary: { type: Type.STRING, description: 'One-sentence summary of the concept' },
          parentId: {
            type: Type.STRING,
            description: 'Parent node id; omit or empty for root',
          },
        },
        required: ['id', 'label', 'summary'],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: 'Directed edges between nodes',
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: 'Source node id' },
          target: { type: Type.STRING, description: 'Target node id' },
        },
        required: ['source', 'target'],
      },
    },
  },
  required: ['title', 'nodes', 'edges'],
};

/** Memory aids for a single flashcard. */
export const mnemonicSchema = {
  type: Type.OBJECT,
  properties: {
    acronym: {
      type: Type.STRING,
      description: 'Acronym or initialism mnemonic; empty string if not applicable',
    },
    story: {
      type: Type.STRING,
      description: 'Short vivid story linking front to back; empty if not applicable',
    },
    rhyme: {
      type: Type.STRING,
      description: 'Rhyme or jingle; empty if not applicable',
    },
    tip: {
      type: Type.STRING,
      description: 'Practical memory tip or keyword method; empty if not applicable',
    },
  },
  required: ['tip'],
};

/** Socratic tutor turn — leading questions only, never the final answer. */
export const socraticSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'Tutor reply with leading questions only; never reveal the final answer',
    },
    hintsUsed: {
      type: Type.INTEGER,
      description: 'How many gentle scaffold hints were embedded (0-3)',
    },
    studentOnTrack: {
      type: Type.BOOLEAN,
      description: 'Whether the student appears to be approaching the correct idea',
    },
  },
  required: ['reply', 'hintsUsed', 'studentOnTrack'],
};

export const clozeCardSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
          cardKind: { type: Type.STRING, description: 'cloze | qa' },
        },
        required: ['front', 'back'],
      },
    },
  },
  required: ['title', 'cards'],
};

export const groundedChatSchema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          page: { type: Type.INTEGER },
          paragraph: { type: Type.INTEGER },
          chunkIndex: { type: Type.INTEGER },
        },
        required: ['quote'],
      },
    },
  },
  required: ['answer', 'citations'],
};

export const vivaCoachSchema = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
    feedback: { type: Type.STRING },
    pacingNote: { type: Type.STRING },
    fillerNote: { type: Type.STRING },
    score: { type: Type.INTEGER },
  },
  required: ['question', 'feedback', 'score'],
};

export const feynmanSchema = {
  type: Type.OBJECT,
  properties: {
    studentReply: {
      type: Type.STRING,
      description: 'Confused first-year student response / question',
    },
    accuracyScore: { type: Type.INTEGER, description: '0-100 how accurate the teacher was' },
    edgeCases: { type: Type.ARRAY, items: { type: Type.STRING } },
    followUps: { type: Type.ARRAY, items: { type: Type.STRING } },
    feedback: { type: Type.STRING },
  },
  required: ['studentReply', 'accuracyScore', 'feedback'],
};

export const elaborateSchema = {
  type: Type.OBJECT,
  properties: {
    why: { type: Type.STRING },
    connection: { type: Type.STRING },
    prompt: { type: Type.STRING, description: 'Question for the student to elaborate on' },
  },
  required: ['why', 'connection', 'prompt'],
};

export const dualCodeSchema = {
  type: Type.OBJECT,
  properties: {
    iconHint: { type: Type.STRING, description: 'lucide-style icon name hint e.g. brain, atom' },
    diagramMermaid: { type: Type.STRING, description: 'Tiny mermaid snippet or empty' },
    audioScript: { type: Type.STRING, description: 'Short spoken mnemonic under 40 words' },
  },
  required: ['iconHint', 'audioScript'],
};

/** Spoken active-recall grade → FSRS rating 1-4. */
export const voiceGradeSchema = {
  type: Type.OBJECT,
  properties: {
    rating: {
      type: Type.INTEGER,
      description: 'FSRS rating 1=Again, 2=Hard, 3=Good, 4=Easy',
    },
    feedback: {
      type: Type.STRING,
      description: 'One or two sentences of spoken-friendly feedback',
    },
    accuracy: {
      type: Type.INTEGER,
      description: '0-100 rough coverage of the correct answer',
    },
  },
  required: ['rating', 'feedback', 'accuracy'],
};

/** Full-length mock exam with mixed question types. */
export const mockExamSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    durationMin: { type: Type.INTEGER },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, description: 'mcq | short | essay' },
          prompt: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctIndex: { type: Type.INTEGER },
          answerKey: { type: Type.STRING },
          topic: { type: Type.STRING },
          points: { type: Type.INTEGER },
          estimatedMin: { type: Type.INTEGER },
        },
        required: ['id', 'type', 'prompt', 'topic', 'points'],
      },
    },
  },
  required: ['title', 'durationMin', 'questions'],
};

/** Mock exam grading + diagnostic scorecard. */
export const mockExamGradeSchema = {
  type: Type.OBJECT,
  properties: {
    overallPercent: { type: Type.NUMBER },
    rubric: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          score: { type: Type.NUMBER },
          maxPoints: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          topic: { type: Type.STRING },
        },
        required: ['questionId', 'score', 'maxPoints', 'feedback'],
      },
    },
    weakTopics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          severity: { type: Type.STRING, description: 'high | medium | low' },
          note: { type: Type.STRING },
        },
        required: ['topic', 'severity', 'note'],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ['overallPercent', 'rubric', 'weakTopics', 'summary'],
};

/** Syllabus → dated academic events. */
export const syllabusParseSchema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: {
            type: Type.STRING,
            description: 'deadline | exam | quiz | lecture | other',
          },
          date: { type: Type.STRING, description: 'ISO date YYYY-MM-DD when known' },
          time: { type: Type.STRING, description: 'Optional HH:MM' },
          description: { type: Type.STRING },
          moduleCode: { type: Type.STRING },
        },
        required: ['title', 'type'],
      },
    },
    notes: { type: Type.STRING },
  },
  required: ['events'],
};

/** Diagram occlusion masks — bounding boxes as percentages of image width/height. */
export const occlusionMaskSchema = {
  type: Type.OBJECT,
  properties: {
    regions: {
      type: Type.ARRAY,
      description: 'Occlusion regions for study (hide/reveal labels)',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Stable region id' },
          label: { type: Type.STRING, description: 'What is hidden under this mask' },
          x: { type: Type.NUMBER, description: 'Left edge as % of image width (0-100)' },
          y: { type: Type.NUMBER, description: 'Top edge as % of image height (0-100)' },
          w: { type: Type.NUMBER, description: 'Width as % of image width' },
          h: { type: Type.NUMBER, description: 'Height as % of image height' },
        },
        required: ['id', 'label', 'x', 'y', 'w', 'h'],
      },
    },
  },
  required: ['regions'],
};
