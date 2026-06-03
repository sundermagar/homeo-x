import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, Loader2, Plus, X, Stethoscope } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { api } from '../../../../lib/api-client';
import type { SuggestedRubric } from '../../../../types/ai';

interface LabReportsStageProps {
  visitId: string;
  onAnalysisComplete: (rubrics: SuggestedRubric[]) => void;
  onNextStage: () => void;
}

export function LabReportsStage({ visitId, onAnalysisComplete, onNextStage }: LabReportsStageProps) {
  const [files, setFiles] = useState<{ name: string; base64: string; type: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [extractedRubrics, setExtractedRubrics] = useState<SuggestedRubric[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setError(null);
    setSuccessMessage(null);
    
    selectedFiles.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Max 5MB allowed.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result is "data:image/png;base64,..."
        const base64 = result.split(',')[1];
        if (!base64) return;
        setFiles((prev) => [...prev, { name: file.name, base64, type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await api.post<any>('/api/ai/analyze-report', {
        visitId,
        documents: files.map(f => ({ base64: f.base64, mimeType: f.type }))
      });

      if (data && data.rubrics) {
        setExtractedRubrics(data.rubrics);
        onAnalysisComplete(data.rubrics);
        setSuccessMessage(`Analysis complete! Extracted ${data.rubrics.length} lab rubrics. Click 'Proceed to Remedy' below.`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#EAE9E5] bg-white flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#2563EB]" />
            Lab Reports Analysis
          </h2>
          <p className="text-sm text-[#737373] mt-1">Upload patient lab reports to extract Mac Repertory rubrics automatically.</p>
        </div>
      </div>

      <div className="p-6 flex-1 max-w-4xl mx-auto w-full flex flex-col gap-6">
        
        {/* Upload Zone */}
        <div className="bg-white border border-dashed border-[#CBD5E1] rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-[#EFF6FF] text-[#2563EB] rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="text-[15px] font-bold text-[#0F0F0E] mb-1">Upload Lab Reports</h3>
          <p className="text-[13px] text-[#64748B] mb-6 max-w-md">
            Upload PDF or Image files (PNG, JPG) of blood tests, scans, or other medical reports. AI will analyze them for abnormal findings.
          </p>
          
          <label className="pp-btn-primary cursor-pointer px-5 py-2.5 text-[13px] inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Select Files
            <input 
              type="file" 
              className="hidden" 
              multiple 
              accept="image/png, image/jpeg, application/pdf" 
              onChange={handleFileUpload} 
            />
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#1E293B]">Attached Files ({files.length})</h4>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F1F5F9] flex items-center justify-center text-[#64748B]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-[13px] font-medium text-[#334155]">{file.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFile(i)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] text-[13px]">
            {error}
          </div>
        )}

        {/* Success and Extracted Rubrics */}
        {successMessage && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] text-[13px] flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </div>

            {extractedRubrics.length > 0 && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">Extracted Rubrics</h4>
                <div className="flex flex-wrap gap-2">
                  {extractedRubrics.map((rubric, idx) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] text-[12px] text-[#334155] shadow-sm">
                      {rubric.description}
                      {(rubric as any).intensity ? <span className="ml-1.5 text-[#94A3B8] text-[10px]">({(rubric as any).intensity})</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analyze Button */}
        {files.length > 0 && (
          <div className="flex justify-end pt-4">
            <button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="pp-btn-primary px-6 py-2.5 text-[14px] flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing Reports...
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" />
                  Extract Lab Rubrics
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
