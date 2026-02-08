
import { Question } from "../types";

// Serviço de IA desativado conforme solicitação.
// Esta função agora é apenas um placeholder para compatibilidade, caso ainda seja importada.

export const generateDetailedExplanation = async (question: Question): Promise<string> => {
  return Promise.resolve(question.explanation);
};
