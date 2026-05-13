import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Gavel, Shield, Lock, Eye, FileText, ChevronLeft, Download, Database, Share2, 
  Clock, UserCheck, Cookie, ExternalLink, UserMinus, RefreshCw, Mail, CheckCircle2, 
  ShieldCheck, Globe, Zap, MessageSquare, Activity, FlaskConical, Stethoscope, 
  Building2, AlertCircle, RefreshCcw, Scale, BookOpen, CheckCircle, ChevronRight, 
  UserPlus, Ban, Terminal, Trash2, MessageCircle, AlertTriangle, CreditCard, 
  LayoutDashboard, HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

// ─── SOFT ERROR BOUNDARY ──────────────────
class LegalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Legal Module Render Error:", error, info);
    toast({
      title: "Navigation Sync Issue",
      description: "A legal module component failed to render. We've preserved your session.",
      variant: "error"
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-24 bg-pp-warm-1 rounded-[40px] m-12 border border-dashed border-pp-warm-4 animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-black text-pp-ink">Legal Display Interrupted</h3>
          <p className="text-pp-text-2 mt-2 mb-8 max-w-sm mx-auto text-sm text-center px-6">
            We encountered a minor visual rendering issue while loading this document. Your access remains secure.
          </p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="bg-pp-blue hover:bg-pp-blue/90 text-white px-8 h-12 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-pp-blue/20 transition-all active:scale-95"
          >
            <RefreshCcw size={16} />
            Reconnect View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(1);

  const coreModules = [
    { title: "EMR / EHR", desc: "Digital Health Records", icon: <Stethoscope size={18} /> },
    { title: "WABA Messaging", desc: "Clinical WhatsApp", icon: <MessageCircle size={18} /> },
    { title: "AI Diagnostics", desc: "Remedy Intelligence", icon: <Activity size={18} /> },
    { title: "Cloud Security", desc: "AES-256 Encryption", icon: <Shield size={18} /> }
  ];

  const sections = [
    {
      id: 1,
      title: "Acceptance of Terms",
      icon: <CheckCircle size={20} />,
      color: "from-blue-500 to-indigo-600",
      content: "By accessing or using Kreed.health (\"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you disagree with any part of the terms, you may not access the Service. These terms constitute a legally binding agreement between you and Kreed.health."
    },
    {
      id: 2,
      title: "Description of Service",
      icon: <LayoutDashboard size={20} />,
      color: "from-emerald-500 to-teal-600",
      content: (
        <div className="space-y-4">
          <p>Kreed.health is a clinical management platform that provides tools for:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Electronic Medical Records (EMR)",
              "WhatsApp Clinical Messaging",
              "Appointment & Token Management",
              "Billing & Financial Reporting",
              "Inventory & Stock Tracking",
              "Telehealth & AI Assistance"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-pp-warm-1 rounded-xl border border-pp-warm-4/50">
                <div className="w-1.5 h-1.5 rounded-full bg-pp-blue" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Account Registration",
      icon: <UserPlus size={20} />,
      color: "from-purple-500 to-violet-600",
      content: (
        <div className="space-y-4">
          <p>To use our Service, you must:</p>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-pp-purple shrink-0" />
              <span>Be a licensed healthcare professional or authorized clinic representative.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-pp-purple shrink-0" />
              <span>Provide accurate and complete registration information.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-pp-purple shrink-0" />
              <span>Maintain the security of your account credentials (MFA is strongly recommended).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-pp-purple shrink-0" />
              <span>Accept responsibility for all activities under your account.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 4,
      title: "WhatsApp & Messaging",
      icon: <MessageCircle size={20} />,
      color: "from-success to-emerald-700",
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-success-bg/30 border border-success-border/30 rounded-2xl">
            <h4 className="font-bold text-success mb-2 flex items-center gap-2">
              <ShieldCheck size={16} />
              Meta Cloud API Standards
            </h4>
            <p className="text-sm text-secondary leading-relaxed">
              Kreed.health utilizes the official Meta WhatsApp Cloud API. Users must comply with WhatsApp's Business Policy. Automated clinical reminders must use approved templates.
            </p>
          </div>
          <p className="text-xs text-muted italic">
            * Note: Promotional messages are subject to strict opt-in requirements and regional telecommunication laws.
          </p>
        </div>
      )
    },
    {
      id: 5,
      title: "Subscription & Payments",
      icon: <CreditCard size={20} />,
      color: "from-pp-blue to-pp-blue-deep",
      content: (
        <div className="space-y-4">
          <p>We offer various subscription tiers tailored to clinic size and volume.</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-secondary">
            <li><strong>Billing Cycle:</strong> Subscriptions are billed in advance on a monthly or annual basis.</li>
            <li><strong>Taxes:</strong> All fees are exclusive of GST and other applicable taxes.</li>
            <li><strong>Refunds:</strong> Payments are non-refundable except where required by law.</li>
            <li><strong>Changes:</strong> We reserve the right to modify pricing with a 30-day notice.</li>
          </ul>
        </div>
      )
    },
    {
      id: 6,
      title: "Acceptable Use",
      icon: <Ban size={20} />,
      color: "from-rose-500 to-red-600",
      content: (
        <div className="space-y-3">
          <p>You agree NOT to use the Service for:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Unauthorized medical data scraping",
              "Spamming clinical contacts",
              "Reverse engineering platform logic",
              "Hosting malicious code",
              "Impersonating other medical entities",
              "Bypassing security protocols"
            ].map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg text-xs font-bold text-rose-700 border border-rose-100">
                <AlertCircle size={14} />
                {rule}
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Medical Disclaimer",
      icon: <Scale size={20} />,
      color: "from-amber-500 to-orange-600",
      content: (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1 tracking-tight">Clinical Software Warning</h4>
              <p className="text-sm text-amber-800 leading-relaxed">
                Kreed.health is a clinical management tool, NOT a medical advice service. All AI recommendations and clinical charts must be verified by a licensed medical practitioner. The practitioner remains solely responsible for patient diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 8,
      title: "Intellectual Property",
      icon: <Globe size={20} />,
      color: "from-slate-600 to-slate-800",
      content: "The Service and its original content, features, and functionality (including logo, design, and clinical logic) are and will remain the exclusive property of Kreed.health. Our trademarks and trade dress may not be used without prior written consent."
    },
    {
      id: 9,
      title: "Data Privacy",
      icon: <Shield size={20} />,
      color: "from-blue-600 to-cyan-600",
      content: "Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as outlined in the policy, including clinical data processing via secure cloud infrastructure."
    },
    {
      id: 10,
      title: "Confidentiality",
      icon: <Terminal size={20} />,
      color: "from-indigo-600 to-pp-purple",
      content: "Both parties agree to protect and maintain the confidentiality of any non-public information disclosed during the term of service. This includes patient data, business logic, and financial records."
    },
    {
      id: 11,
      title: "Termination",
      icon: <Trash2 size={20} />,
      color: "from-red-600 to-pp-ink",
      content: "We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of Terms. Upon termination, your right to use the Service will immediately cease."
    },
    {
      id: 12,
      title: "Limitation of Liability",
      icon: <AlertCircle size={20} />,
      color: "from-slate-700 to-black",
      content: "In no event shall Kreed.health, its directors, or employees be liable for any indirect, incidental, special, or consequential damages resulting from your use or inability to use the Service."
    },
    {
      id: 13,
      title: "Governing Law",
      icon: <Gavel size={20} />,
      color: "from-blue-900 to-indigo-950",
      content: "These Terms shall be governed by and construed in accordance with the laws of Maharashtra, India. Any legal action or proceeding shall be brought exclusively in the courts of Mumbai."
    },
    {
      id: 14,
      title: "Changes to Terms",
      icon: <RefreshCw size={20} />,
      color: "from-cyan-600 to-pp-blue",
      content: "We reserve the right to modify these terms at any time. We will provide at least 30 days' notice for any material changes. Continued use after changes constitutes acceptance of the new Terms."
    },
  ];

  const scrollToSection = (id: number) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      for (const section of sections) {
        const element = document.getElementById(`section-${section.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* ─── PREMIUM BRANDED HEADER ────────────────── */}
      <nav className="h-24 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[100] px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-[42px] h-[42px] bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-[12px] flex items-center justify-center text-white shadow-[0_6px_16px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-all duration-300">
              <Building2 size={24} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-[800] tracking-[-0.03em] text-[#1e3a8a]">
                Kreed<span className="text-[#2563eb]">.health</span>
              </span>
              <span className="text-[9px] font-bold text-[#2563eb] uppercase tracking-widest -mt-1 pl-0.5">ONE PLATFORM FOR CLINICAL SUCCESS</span>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-8">
            <Link to="/privacy-policy" className="text-sm font-black text-[#1e3a8a] hover:text-[#2563eb] transition-colors">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="text-sm font-black text-[#1e3a8a] hover:text-[#2563eb] transition-colors">
              Terms
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/login')}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3 rounded-xl text-sm font-extrabold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      <LegalErrorBoundary>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 py-12 px-6">
            <div className="max-w-[1000px] mx-auto">
              <div className="flex flex-col gap-12">
                <main className="flex-1">
                  <div className="bg-white rounded-[40px] border border-pp-warm-4 shadow-2xl shadow-pp-purple/5 overflow-hidden">
                    {/* Premium Header */}
                    <div className="relative p-12 lg:p-20 border-b border-pp-warm-4 bg-gradient-to-br from-pp-purple/5 via-transparent to-transparent">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                        <Gavel size={240} />
                      </div>
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pp-purple/10 text-pp-purple rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 shadow-sm">
                          <ShieldCheck size={12} />
                          Platform Governance
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-[900] text-pp-ink mb-4 tracking-tight">Terms of Service</h1>
                        <p className="text-lg text-pp-text-2 max-w-2xl leading-relaxed font-medium">
                          Operational standards for the modern digital clinic. Ensuring security, ethics, and professional excellence in healthcare management.
                        </p>
                        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                          {coreModules.map((mod, idx) => (
                            <div key={idx} className="flex flex-col gap-2 group">
                              <div className="w-9 h-9 rounded-lg bg-pp-purple/10 text-pp-purple flex items-center justify-center group-hover:scale-110 transition-transform">
                                {React.cloneElement(mod.icon as any, { size: 16 })}
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-pp-ink">{mod.title}</div>
                                <div className="text-[9px] font-bold text-pp-text-3">{mod.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-10 flex flex-wrap items-center gap-6 text-[10px] font-extrabold text-pp-text-3 uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <Terminal size={12} className="text-pp-purple" />
                            Policy Rev: B4-2026
                          </div>
                          <div className="flex items-center gap-2">
                            <Scale size={12} className="text-pp-purple" />
                            Mumbai Jurisdiction
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Sections */}
                    <div className="p-10 lg:p-16 space-y-16">
                      {sections.map((section) => (
                        <section key={section.id} id={`section-${section.id}`} className="scroll-mt-12 group">
                          <div className="flex flex-col gap-4">
                            <div className="flex-1">
                              <h2 className="text-xl font-black text-pp-ink mb-4 tracking-tight flex items-center gap-3">
                                <span className="opacity-20 text-2xl">{String(section.id).padStart(2, '0')}</span>
                                {section.title}
                              </h2>
                              <div className="text-pp-text-2 leading-[1.7] text-[14px] font-medium selection:bg-pp-purple/10">
                                {section.content}
                              </div>
                            </div>
                          </div>
                        </section>
                      ))}

                      {/* Help & Contact */}
                      <section id="section-15" className="scroll-mt-12 group">
                        <div className="flex flex-col gap-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-black text-pp-ink mb-6 tracking-tight flex items-center gap-3">
                              <span className="opacity-20 text-2xl">15</span>
                              Help & Contact
                            </h2>
                            <div className="flex flex-col items-center text-center group">
                              <div className="w-16 h-16 bg-pp-purple/5 rounded-2xl flex items-center justify-center text-pp-purple mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Mail size={28} />
                              </div>
                              <h3 className="text-xl font-black text-pp-ink mb-3">Legal Support Desk</h3>
                              <p className="text-[15px] text-pp-text-2 max-w-sm mb-8 leading-relaxed font-medium">
                                For legal inquiries, dispute resolution, or compliance questions, our dedicated support desk is ready to assist.
                              </p>
                              <a href="mailto:legal@kreed.health" className="text-2xl font-black text-pp-purple hover:text-pp-purple/80 transition-colors tracking-tight">
                                legal@kreed.health
                              </a>
                              <div className="mt-4 w-12 h-1 bg-pp-purple/20 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Contractual Integrity */}
                      <div className="pt-24 border-t border-pp-warm-4/60">
                        <div className="relative flex flex-col items-center text-center">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none text-pp-ink">
                            <Gavel size={180} />
                          </div>
                          
                          <div className="relative z-10">
                            <div className="w-16 h-1 bg-pp-purple/30 rounded-full mb-10 mx-auto" />
                            <h3 className="text-2xl font-black text-pp-ink mb-4 tracking-tight">Contractual Integrity</h3>
                            <p className="text-pp-text-2 max-w-2xl text-[15px] leading-relaxed font-medium">
                              By proceeding with account creation, you acknowledge that you have read, understood, and agreed to be bound by these clinical operation standards. This agreement constitutes a legally binding contract between you and Kreed.health.
                            </p>
                            <div className="mt-12 flex items-center justify-center gap-10 opacity-60">
                              <div className="flex items-center gap-2.5 text-[11px] font-black text-pp-ink uppercase tracking-[0.2em]">
                                <ShieldCheck size={14} className="text-pp-purple" />
                                Verified Identity
                              </div>
                              <div className="w-1.5 h-1.5 rounded-full bg-pp-warm-4" />
                              <div className="flex items-center gap-2.5 text-[11px] font-black text-pp-ink uppercase tracking-[0.2em]">
                                <Gavel size={14} className="text-pp-purple" />
                                Legally Bound
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
          {/* Visual background decorations */}
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
            <div className="absolute top-[20%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-pp-purple/5 blur-[120px]" />
            <div className="absolute bottom-[20%] left-[10%] w-[35vw] h-[35vw] rounded-full bg-pp-blue/5 blur-[120px]" />
          </div>
        </div>
      </LegalErrorBoundary>
    </div>
  );
};

export default TermsOfServicePage;

