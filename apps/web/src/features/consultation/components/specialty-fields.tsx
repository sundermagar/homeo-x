import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import type { SoapFieldConfig, PrescriptionFieldConfig } from '../../../types/specialty';

interface SpecialtyFieldsProps {
  fields: (SoapFieldConfig | PrescriptionFieldConfig)[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function SpecialtyFields({ fields, values, onChange }: SpecialtyFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {field.type === 'textarea' ? (
            <Textarea
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : field.type === 'select' && field.options ? (
            <Select
              value={(values[field.key] as string) || ''}
              onValueChange={(v) => onChange(field.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === 'number' ? (
            <Input
              type="number"
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value ? Number(e.target.value) : '')}
            />
          ) : (
            <Input
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
