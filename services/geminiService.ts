
import { GoogleGenAI, Type } from "@google/genai";
import { FileData, GradingResult } from "../types";

const gradingSchema = {
  type: Type.OBJECT,
  properties: {
    studentName: {
      type: Type.STRING,
      description: "Tên học sinh được tìm thấy trong bài làm. Nếu không thấy, hãy ghi là 'Không xác định'."
    },
    totalScore: {
      type: Type.NUMBER,
      description: "Tổng điểm của bài làm."
    },
    maxTotalScore: {
      type: Type.NUMBER,
      description: "Tổng điểm tối đa có thể đạt được theo đáp án."
    },
    questionScores: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.STRING, description: "Số thứ tự câu hỏi (ví dụ: 'Câu 1')." },
          score: { type: Type.NUMBER, description: "Điểm đạt được cho câu này." },
          maxScore: { type: Type.NUMBER, description: "Điểm tối đa của câu này." },
          feedback: { type: Type.STRING, description: "Nhận xét ngắn gọn tại sao trừ điểm hoặc khen ngợi." }
        },
        required: ["questionNumber", "score", "maxScore", "feedback"]
      }
    },
    generalFeedback: {
      type: Type.STRING,
      description: "Nhận xét tổng quát về bài làm của học sinh."
    }
  },
  required: ["studentName", "totalScore", "maxTotalScore", "questionScores", "generalFeedback"]
};

export const gradeStudentPaper = async (
  answerKeys: FileData[],
  studentFiles: FileData[]
): Promise<GradingResult> => {
  // Khởi tạo instance mới để đảm bảo lấy API Key mới nhất từ môi trường
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const model = 'gemini-3-pro-preview'; // Sử dụng model Pro cho các tác vụ suy luận phức tạp
  
  const answerParts = answerKeys.map(f => ({
    inlineData: { data: f.data, mimeType: f.mimeType }
  }));

  const studentParts = studentFiles.map(f => ({
    inlineData: { data: f.data, mimeType: f.mimeType }
  }));

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          ...answerParts,
          ...studentParts,
          { text: "Hãy chấm điểm bài làm của học sinh dựa trên đáp án đã cung cấp. Chú ý phân tích kỹ từng bước làm trong bài tự luận." }
        ]
      }
    ],
    config: {
      systemInstruction: "Bạn là một giáo viên chuyên chấm bài tự luận. Nhiệm vụ của bạn là so khớp bài làm của học sinh với đáp án, tính điểm chi tiết cho từng câu và đưa ra nhận xét công tâm. Hãy trả về kết quả dưới định dạng JSON chính xác theo cấu trúc schema.",
      responseMimeType: "application/json",
      responseSchema: gradingSchema,
      temperature: 0.1,
    },
  });

  if (!response.text) {
    throw new Error("AI không trả về kết quả.");
  }

  try {
    return JSON.parse(response.text.trim()) as GradingResult;
  } catch (error) {
    console.error("Lỗi parse JSON từ AI:", response.text);
    throw new Error("Lỗi định dạng dữ liệu từ AI.");
  }
};
