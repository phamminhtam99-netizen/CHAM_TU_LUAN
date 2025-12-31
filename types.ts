
export interface FileData {
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  files: FileData[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: GradingResult;
  error?: string;
}

export interface QuestionScore {
  questionNumber: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface GradingResult {
  studentName: string;
  totalScore: number;
  maxTotalScore: number;
  questionScores: QuestionScore[];
  generalFeedback: string;
}

export enum AppStep {
  ANSWER_KEY = 0,
  STUDENT_SUBMISSIONS = 1,
  GRADING = 2,
  RESULTS = 3
}
