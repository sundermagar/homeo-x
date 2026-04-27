import { AlertTriangle, XOctagon, AlertCircle, Info } from 'lucide-react';
import type { DrugInteractionWarning } from '../../../types/ai';

interface DrugInteractionAlertProps {
  interactions: DrugInteractionWarning[];
}

const severityConfig = {
  CONTRAINDICATED: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: XOctagon,
    iconColor: 'text-red-600',
    label: 'CONTRAINDICATED',
  },
  MAJOR: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    label: 'MAJOR',
  },
  MODERATE: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    label: 'MODERATE',
  },
  MINOR: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: Info,
    iconColor: 'text-blue-600',
    label: 'MINOR',
  },
  UNKNOWN: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-800',
    icon: Info,
    iconColor: 'text-gray-600',
    label: 'UNKNOWN',
  },
};

export function DrugInteractionAlert({ interactions }: DrugInteractionAlertProps) {
  if (interactions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Drug Interaction Warnings</h4>
      {interactions.map((interaction, idx) => {
        const config = severityConfig[interaction.severity] || severityConfig.UNKNOWN;
        const Icon = config.icon;

        return (
          <div
            key={idx}
            className={`rounded-lg border p-3 ${config.bg} ${config.border}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.iconColor}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium ${config.text}`}>
                  {config.label}: {interaction.drugA} + {interaction.drugB}
                </div>
                <p className={`mt-0.5 text-xs ${config.text} opacity-80`}>
                  {interaction.description}
                </p>
                {interaction.management && (
                  <p className="mt-1 text-xs text-gray-600">
                    Management: {interaction.management}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
