import React, { useState } from 'react';
import { Copy, Bot, Check, ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const WidgetBuilder = () => {
  const [config, setConfig] = useState({
    title: 'Homeo-X Support',
    greeting: 'Welcome! How can we help you today?',
    phone: '+917082158240',
    position: 'right',
    color: '#075e54',
    buttonText: 'Chat on WhatsApp',
  });

  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const colors = [
    { name: 'WhatsApp Green', hex: '#075e54' },
    { name: 'Clinical Blue', hex: '#0066cc' },
    { name: 'Premium Purple', hex: '#7c3aed' },
    { name: 'Sleek Dark', hex: '#1e293b' },
  ];

  const embedCode = `<!-- Homeo-X WhatsApp Floating Support Widget -->
<script>
  window.HomeoxChatConfig = {
    title: "${config.title}",
    greeting: "${config.greeting}",
    phone: "${config.phone}",
    position: "${config.position}",
    color: "${config.color}",
    buttonText: "${config.buttonText}"
  };
</script>
<script src="${window.location.origin}/widgets/whatsapp-chat-widget.js" async></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast({
      title: 'Code Copied!',
      description: 'The embed code snippet has been copied to your clipboard.',
      variant: 'success',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Customizer settings panel */}
        <div className="bg-white p-8 rounded-3xl border border-pp-border shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-main">Widget Customization</h3>
            <p className="text-sm text-secondary">Style and customize your floating clinical support widget.</p>
          </div>

          <div className="space-y-4">
            
            {/* Title */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Widget Header Title</label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                className="pp-input w-full h-11"
              />
            </div>

            {/* Greeting */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Welcome Greeting Message</label>
              <textarea
                rows={3}
                value={config.greeting}
                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                className="pp-input w-full p-3 font-sans text-sm"
              />
            </div>

            {/* Support Phone */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Destination WhatsApp Number</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                className="pp-input w-full h-11"
                placeholder="+91..."
              />
            </div>

            {/* Button text */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Button CTA Text</label>
              <input
                type="text"
                value={config.buttonText}
                onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                className="pp-input w-full h-11"
              />
            </div>

            {/* Color selection */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Brand Color Theme</label>
              <div className="flex gap-4">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setConfig({ ...config, color: c.hex })}
                    className="w-10 h-10 rounded-full border-2 transition-all relative flex items-center justify-center shrink-0"
                    style={{ 
                      backgroundColor: c.hex,
                      borderColor: config.color === c.hex ? 'var(--pp-blue)' : 'transparent',
                      transform: config.color === c.hex ? 'scale(1.1)' : 'scale(1)'
                    }}
                    title={c.name}
                  >
                    {config.color === c.hex && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Floating Placement</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfig({ ...config, position: 'right' })}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold border transition-all ${
                    config.position === 'right'
                      ? 'border-pp-blue bg-blue-50 text-pp-blue'
                      : 'border-pp-border bg-white text-secondary hover:bg-pp-bg-subtle'
                  }`}
                >
                  Bottom Right
                </button>
                <button
                  onClick={() => setConfig({ ...config, position: 'left' })}
                  className={`flex-1 h-11 rounded-xl text-sm font-semibold border transition-all ${
                    config.position === 'left'
                      ? 'border-pp-blue bg-blue-50 text-pp-blue'
                      : 'border-pp-border bg-white text-secondary hover:bg-pp-bg-subtle'
                  }`}
                >
                  Bottom Left
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Live Mockup and Code Generator Panel */}
        <div className="space-y-6">
          
          {/* Visual Embed code block card */}
          <div className="bg-white p-8 rounded-3xl border border-pp-border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-main">Integrate on Website</h4>
                <p className="text-xs text-secondary">Copy and paste this snippet right before the closing &lt;/body&gt; tag.</p>
              </div>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-pp-bg-subtle rounded-xl text-secondary hover:text-main transition-all flex items-center gap-1.5 font-semibold text-xs border border-pp-border"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-[11px] leading-relaxed select-all overflow-x-auto shadow-inner border border-slate-950">
              <pre>{embedCode}</pre>
            </div>
          </div>

          {/* simulated visual site preview container */}
          <div className="bg-[#f8fafc] border border-pp-border rounded-3xl h-[360px] relative overflow-hidden flex flex-col justify-between shadow-inner">
            
            {/* Header simulation */}
            <div className="bg-white border-b border-pp-border p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-pp-blue rounded-lg" />
                <span className="font-bold text-xs text-main">Your Clinic Website</span>
              </div>
              <div className="flex gap-3">
                <span className="w-12 h-2 bg-pp-border rounded-full" />
                <span className="w-12 h-2 bg-pp-border rounded-full" />
              </div>
            </div>

            {/* site body mock text */}
            <div className="p-8 space-y-4 flex-1">
              <div className="w-[140px] h-4 bg-pp-border rounded-full" />
              <div className="space-y-2">
                <div className="w-full h-3 bg-pp-border/50 rounded-full" />
                <div className="w-[85%] h-3 bg-pp-border/50 rounded-full" />
              </div>
              
              <div className="p-6 bg-white border border-pp-border rounded-2xl inline-flex items-center gap-3 mt-6 shadow-sm">
                <Sparkles size={16} className="text-pp-blue" />
                <span className="text-xs font-semibold text-secondary">Click the floating WhatsApp chat widget below to test interaction!</span>
              </div>
            </div>

            {/* Interactive Float Widget placement inside simulated site */}
            <div className={`absolute bottom-6 ${config.position === 'right' ? 'right-6' : 'left-6'} z-10`}>
              
              {/* Opened Widget Container */}
              {isOpen && (
                <div className="bg-white w-[230px] rounded-2xl shadow-2xl border border-pp-border overflow-hidden mb-3 animate-fade-in flex flex-col">
                  
                  {/* Header bar */}
                  <div className="p-4 text-white flex items-center justify-between shrink-0" style={{ backgroundColor: config.color }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[9px] font-bold">W</div>
                      <div className="truncate">
                        <h5 className="font-bold text-[10px] truncate leading-tight">{config.title}</h5>
                        <span className="text-[7px] text-white/70 block uppercase tracking-wide">Online</span>
                      </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-[10px]">✕</button>
                  </div>

                  {/* Bubble content */}
                  <div className="p-3 bg-[#efeae2] text-[9px] leading-relaxed text-main space-y-3 min-h-[92px] max-h-[160px] overflow-y-auto">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-black/5 self-start max-w-[95%]">
                      {config.greeting}
                    </div>
                  </div>

                  {/* CTA Click button to open actual WhatsApp chat window */}
                  <a 
                    href={`https://wa.me/${config.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="m-3 p-2 text-white font-bold text-[9px] text-center rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all hover:brightness-95"
                    style={{ backgroundColor: config.color }}
                  >
                    <MessageCircle size={10} />
                    {config.buttonText}
                    <ArrowRight size={8} />
                  </a>

                </div>
              )}

              {/* Floating trigger button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 rounded-full text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: config.color }}
              >
                {isOpen ? '✕' : '💬'}
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
