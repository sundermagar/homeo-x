import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { WidgetConfig } from './types';

interface WidgetCodeSnippetProps {
  config: WidgetConfig;
  widgetCode: string;
  copyCode: () => void;
  onSave: () => void;
  isSaving: boolean;
  channelId?: string;
}

export default function WidgetCodeSnippet({
  config,
  widgetCode,
  copyCode,
  onSave,
  isSaving,
  channelId = 'WABA_CHANNEL_ID',
}: WidgetCodeSnippetProps) {
  return (
    <Card className="rounded-3xl border border-pp-border shadow-sm overflow-hidden bg-[var(--bg-card)] dark:bg-[#0f0f12]">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-main">Embed Code</CardTitle>
        <CardDescription className="text-sm text-secondary">
          Copy this script and place it in your HTML to activate the widget.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wide">
              HTML HEAD
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
              onClick={copyCode}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre>
              <div className="font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1">
                <div>
                  <span className="text-zinc-500 font-normal">
                    &lt;!-- Homeo-X WhatsApp Floating Support Widget --&gt;
                  </span>
                </div>
                <div>
                  <span className="text-purple-400">&lt;</span>
                  <span className="text-pink-400">script</span>
                  <span className="text-purple-400">&gt;</span>
                </div>
                <div className="pl-4">
                  <span className="text-blue-400">window</span>
                  <span className="text-zinc-400">.</span>
                  <span className="text-amber-300">HomeoxWidgetId</span>
                  <span className="text-zinc-400"> = </span>
                  <span className="text-emerald-400">"{channelId}"</span>
                  <span className="text-zinc-400">;</span>
                </div>
                <div>
                  <span className="text-purple-400">&lt;/</span>
                  <span className="text-pink-400">script</span>
                  <span className="text-purple-400">&gt;</span>
                </div>
                <div>
                  <span className="text-purple-400">&lt;</span>
                  <span className="text-pink-400">script</span>
                  <span className="text-zinc-400"> </span>
                  <span className="text-cyan-400">src</span>
                  <span className="text-zinc-400">=</span>
                  <span className="text-emerald-400">
                    "{window.location.origin}/widgets/whatsapp-chat-widget.js"
                  </span>
                  <span className="text-zinc-400"> </span>
                  <span className="text-cyan-400">async</span>
                  <span className="text-purple-400">&gt;&lt;/</span>
                  <span className="text-pink-400">script</span>
                  <span className="text-purple-400">&gt;</span>
                </div>
              </div>
            </pre>
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full bg-pp-blue hover:bg-pp-blue/90 text-white rounded-xl h-11 text-sm font-semibold shadow-sm transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
