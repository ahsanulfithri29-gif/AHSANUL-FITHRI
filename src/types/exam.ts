export interface StudentInfo {
  nisn: string;
  name: string;
  gradeClass: string;
  deviceId: string;
}

export type ViolationType = 
  | 'TAB_SWITCH' 
  | 'WINDOW_BLUR' 
  | 'FULLSCREEN_EXIT' 
  | 'SHORTCUT_ATTEMPT' 
  | 'DEVTOOLS_ATTEMPT' 
  | 'RIGHT_CLICK';

export interface ViolationEvent {
  id: string;
  studentNisn: string;
  studentName: string;
  timestamp: number;
  type: ViolationType;
  description: string;
  strikeCount: number;
  details?: string;
  encryptedHash?: string;
}

export type DeviceState = 'NORMAL' | 'WARNING' | 'LOCKED' | 'COMPLETED' | 'OFFLINE';

export interface StudentSession {
  student: StudentInfo;
  status: DeviceState;
  strikes: number;
  lastHeartbeat: number;
  currentQuestionIndex: number;
  answeredCount: number;
  isOnline: boolean;
  isFullscreen: boolean;
  isFocused: boolean;
  violations: ViolationEvent[];
  startedAt: number;
  submittedAt?: number;
  score?: number;
}

export interface MathQuestion {
  id: number;
  topic: string;
  question: string;
  formula?: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
    formula?: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  points: number;
  explanation: string;
}

export interface ExamAnswer {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isDoubtful: boolean;
  answeredAt: number;
}

export interface EncryptedPacket {
  version: string;
  algorithm: 'AES-256-GCM';
  iv: string;
  ciphertext: string;
  authTag?: string;
  timestamp: number;
  checksum: string;
}

export interface ProctorBroadcast {
  id: string;
  targetNisn: string | 'ALL';
  message: string;
  timestamp: number;
  type: 'WARNING' | 'INFO' | 'ACTION';
}
