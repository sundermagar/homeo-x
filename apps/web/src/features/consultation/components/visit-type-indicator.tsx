import { Video, Mic, RotateCcw, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';

interface VisitTypeIndicatorProps {
  visitType?: string;
  previousVisitId?: string;
}

export function VisitTypeIndicator({ visitType, previousVisitId }: VisitTypeIndicatorProps) {
  if (visitType === 'VIDEO') {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                Video Consultation
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Use your preferred video platform. Document findings in SOAP notes as usual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visitType === 'AUDIO') {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-800 dark:text-green-300">
                Audio Consultation
              </p>
              <p className="text-[11px] text-green-600 dark:text-green-400">
                Phone/audio-only consultation. Use voice capture above to auto-document.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visitType === 'FOLLOW_UP') {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Follow-up Visit
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Review previous diagnosis and treatment response.
                {previousVisitId && ' Previous visit data available.'}
              </p>
            </div>
            {previousVisitId && (
              <a
                href={`/consultation/${previousVisitId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
