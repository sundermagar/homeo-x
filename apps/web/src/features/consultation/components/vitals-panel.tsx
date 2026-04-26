import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { useRecordVitals } from '../../../hooks/use-visits';
import { toast } from '../../../hooks/use-toast';
import type { Vitals } from '../../../types/visit';

const vitalsSchema = z.object({
  heightCm: z.coerce.number().positive().optional().or(z.literal('')),
  weightKg: z.coerce.number().positive().optional().or(z.literal('')),
  temperatureF: z.coerce.number().positive().optional().or(z.literal('')),
  pulseRate: z.coerce.number().positive().optional().or(z.literal('')),
  systolicBp: z.coerce.number().positive().optional().or(z.literal('')),
  diastolicBp: z.coerce.number().positive().optional().or(z.literal('')),
  respiratoryRate: z.coerce.number().positive().optional().or(z.literal('')),
  oxygenSaturation: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  bloodSugar: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type VitalsForm = z.infer<typeof vitalsSchema>;

interface VitalsPanelProps {
  visitId: string;
  existingVitals?: Vitals | null;
  onComplete: () => void;
}

export function VitalsPanel({ visitId, existingVitals, onComplete }: VitalsPanelProps) {
  const recordVitals = useRecordVitals(visitId);

  const { register, handleSubmit, watch } = useForm<VitalsForm>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: existingVitals
      ? {
          heightCm: existingVitals.heightCm ?? '',
          weightKg: existingVitals.weightKg ?? '',
          temperatureF: existingVitals.temperatureF ?? '',
          pulseRate: existingVitals.pulseRate ?? '',
          systolicBp: existingVitals.systolicBp ?? '',
          diastolicBp: existingVitals.diastolicBp ?? '',
          respiratoryRate: existingVitals.respiratoryRate ?? '',
          oxygenSaturation: existingVitals.oxygenSaturation ?? '',
          bloodSugar: existingVitals.bloodSugar ?? '',
          notes: existingVitals.notes ?? '',
        }
      : {},
  });

  const height = watch('heightCm');
  const weight = watch('weightKg');
  const bmi =
    height && weight && typeof height === 'number' && typeof weight === 'number'
      ? (weight / ((height / 100) ** 2)).toFixed(1)
      : null;

  const onSubmit = async (data: VitalsForm) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );
    try {
      await recordVitals.mutateAsync(cleaned as Record<string, number>);
      toast({ title: 'Vitals recorded', variant: 'success' });
      onComplete();
    } catch (err) {
      toast({ title: 'Failed to record vitals', description: err instanceof Error ? err.message : '', variant: 'error' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Vitals</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input id="heightCm" type="number" step="0.1" {...register('heightCm')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input id="weightKg" type="number" step="0.1" {...register('weightKg')} />
            </div>
            <div className="space-y-1">
              <Label>BMI (auto)</Label>
              <Input value={bmi || '-'} disabled />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="temperatureF">Temperature (°F)</Label>
              <Input id="temperatureF" type="number" step="0.1" {...register('temperatureF')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pulseRate">Pulse Rate (bpm)</Label>
              <Input id="pulseRate" type="number" {...register('pulseRate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
              <Input id="respiratoryRate" type="number" {...register('respiratoryRate')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="systolicBp">Systolic BP (mmHg)</Label>
              <Input id="systolicBp" type="number" {...register('systolicBp')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="diastolicBp">Diastolic BP (mmHg)</Label>
              <Input id="diastolicBp" type="number" {...register('diastolicBp')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oxygenSaturation">SpO2 (%)</Label>
              <Input id="oxygenSaturation" type="number" {...register('oxygenSaturation')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="bloodSugar">Blood Sugar (mg/dL)</Label>
              <Input id="bloodSugar" type="number" {...register('bloodSugar')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="vitalsNotes">Notes</Label>
            <Textarea id="vitalsNotes" {...register('notes')} placeholder="Any notes about vitals..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onComplete}>
              Skip
            </Button>
            <Button type="submit" disabled={recordVitals.isPending}>
              {recordVitals.isPending ? 'Saving...' : 'Save Vitals'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
