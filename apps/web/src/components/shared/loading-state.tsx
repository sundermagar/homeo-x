import { Spinner } from '../ui/spinner';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
