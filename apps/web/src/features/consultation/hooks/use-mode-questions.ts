import { useMutation } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';
import { API } from '../../../lib/constants';
import type {
  SuggestQuestionsInput,
  QuestionSuggestionResult,
} from '../../../types/ai';

export function useModeQuestions() {
  return useMutation({
    mutationFn: (input: SuggestQuestionsInput) =>
      api.post<QuestionSuggestionResult>(API.AI.SUGGEST_QUESTIONS, input),
  });
}
