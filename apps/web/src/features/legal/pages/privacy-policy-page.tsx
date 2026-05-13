import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  Shield, Lock, Eye, FileText, ChevronLeft, Download, Database, Share2, Clock, 
  UserCheck, Cookie, ExternalLink, UserMinus, RefreshCw, Mail, CheckCircle2, 
  ShieldCheck, Globe, Zap, MessageSquare, Activity, FlaskConical, Stethoscope, 
  Building2, AlertCircle, RefreshCcw 
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

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(1);

  const platformFeatures = [
    { title: "Clinical EMR", desc: "Digital health records & prescriptions", icon: <Stethoscope size={18} /> },
    { title: "WABA Messaging", desc: "Meta Cloud API integrations", icon: <MessageSquare size={18} /> },
    { title: "AI Analytics", desc: "Disease pattern & clinic growth", icon: <Activity size={18} /> },
    { title: "Secure Vault", desc: "AES-256 encrypted storage", icon: <Lock size={18} /> }
  ];

  const sections = [
    {
      id: 1,
      title: "Introduction",
      icon: <Eye size={20} />,
      color: "from-blue-500 to-indigo-600",
      content: "Kreed.health (\"we\", \"our\", or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our clinical management platform."
    },
    {
      id: 2,
      title: "Information We Collect",
      icon: <Database size={20} />,
      color: "from-emerald-500 to-teal-600",
      content: (
        <div className="space-y-6">
          <div className="bg-success-bg/30 p-4 rounded-xl border border-success-border/30">
            <h4 className="font-extrabold text-pp-ink mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              2.1 Personal Information
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-secondary">
              <li className="flex items-center gap-2"><span>•</span> Name and email address</li>
              <li className="flex items-center gap-2"><span>•</span> Business/clinic information</li>
              <li className="flex items-center gap-2"><span>•</span> Payment and billing information</li>
              <li className="flex items-center gap-2"><span>•</span> WhatsApp Business credentials</li>
            </ul>
          </div>
          <div>
            <h4 className="font-extrabold text-pp-ink mb-2">2.2 Usage Data</h4>
            <p className="text-sm text-secondary leading-relaxed mb-3">Our systems automatically collect technical metrics during your sessions to ensure stability and security.</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-secondary">
              <li>Log data and analytics</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
            </ul>
          </div>
          <div>
            <h4 className="font-extrabold text-pp-ink mb-2">2.3 Clinical & Communication Data</h4>
            <p className="text-sm text-secondary leading-relaxed">When you use our messaging services, we access data permitted by the platform providers (Meta Cloud API), including message status, delivery metrics, and patient contact information for clinical follow-ups.</p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "How We Use Data",
      icon: <FileText size={20} />,
      color: "from-purple-500 to-violet-600",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Provide and maintain our services",
            "Process transactions and billing",
            "Send clinical WhatsApp messages",
            "Generate clinical reports",
            "Customer support and inquiries",
            "Service improvement & R&D"
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-pp-warm-1 rounded-lg border border-pp-warm-4/50">
              <div className="w-2 h-2 rounded-full bg-pp-purple" />
              <span className="text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 4,
      title: "Information Sharing",
      icon: <Share2 size={20} />,
      color: "from-rose-500 to-pink-600",
      content: (
        <div className="space-y-4">
          <p>We may share your information with:</p>
          <div className="space-y-3">
            <div className="p-4 bg-white border border-pp-warm-4 rounded-xl shadow-sm">
              <span className="font-bold block mb-1">Service Providers</span>
              <span className="text-sm text-secondary">Third parties that help us operate our platform (payment processors, cloud hosting).</span>
            </div>
            <div className="p-4 bg-white border border-pp-warm-4 rounded-xl shadow-sm">
              <span className="font-bold block mb-1">Messaging Platforms</span>
              <span className="text-sm text-secondary">Meta Cloud API systems when you authorize clinical communications.</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-pp-ink text-white rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-success" />
              <span className="font-bold text-sm tracking-wide">WE NEVER SELL YOUR DATA</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Data Security",
      icon: <Lock size={20} />,
      color: "from-blue-600 to-cyan-600",
      content: (
        <div className="space-y-6">
          <p>We implement appropriate technical and organizational measures to protect your data:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pp-blue/5 to-transparent border border-pp-blue/10">
              <div className="font-extrabold text-pp-blue mb-2 uppercase text-[10px] tracking-widest">Transit</div>
              <div className="text-sm font-bold mb-1">TLS 1.3 Encryption</div>
              <div className="text-xs text-muted">Military-grade protection for all data in motion.</div>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pp-purple/5 to-transparent border border-pp-purple/10">
              <div className="font-extrabold text-pp-purple mb-2 uppercase text-[10px] tracking-widest">Storage</div>
              <div className="text-sm font-bold mb-1">AES-256 at Rest</div>
              <div className="text-xs text-muted">Data remains unreadable even if physical access is gained.</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Data Retention",
      icon: <Clock size={20} />,
      color: "from-orange-500 to-amber-600",
      content: "We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us, subject to medical record retention laws."
    },
    {
      id: 7,
      title: "Your Rights",
      icon: <UserCheck size={20} />,
      color: "from-emerald-600 to-green-600",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "Right to Access",
            "Right to Rectification",
            "Right to Erasure",
            "Right to Object",
            "Data Portability",
            "Withdraw Consent"
          ].map((right, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-pp-warm-4 rounded-lg">
              <CheckCircle2 size={16} className="text-success" />
              <span className="text-sm font-medium">{right}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 8,
      title: "Cookies",
      icon: <Cookie size={20} />,
      color: "from-purple-600 to-fuchsia-600",
      content: "We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts. You can control cookies through your browser settings."
    },
    {
      id: 9,
      title: "Third-Party Links",
      icon: <ExternalLink size={20} />,
      color: "from-slate-600 to-slate-800",
      content: "Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites."
    },
    {
      id: 10,
      title: "Children's Privacy",
      icon: <UserMinus size={20} />,
      color: "from-rose-600 to-red-700",
      content: "Our services are not intended for individuals under 18 years of age without parental consent. We do not knowingly collect personal information from children without proper authorization."
    },
    {
      id: 11,
      title: "Policy Changes",
      icon: <RefreshCw size={20} />,
      color: "from-blue-700 to-indigo-900",
      content: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the \"Last updated\" date."
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
                  <div className="bg-white rounded-[40px] border border-pp-warm-4 shadow-2xl shadow-pp-blue/5 overflow-hidden">
                    {/* Premium Header */}
                    <div className="relative p-12 lg:p-20 border-b border-pp-warm-4 bg-gradient-to-br from-pp-blue/5 via-transparent to-transparent">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                        <Shield size={240} />
                      </div>
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pp-blue/10 text-pp-blue rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 shadow-sm">
                          <ShieldCheck size={12} />
                          Clinical Privacy Protocol
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-[900] text-pp-ink mb-4 tracking-tight">Privacy Policy</h1>
                        <p className="text-lg text-pp-text-2 max-w-2xl leading-relaxed font-medium">
                          Trust is the foundation of healthcare. We protect your clinical data with industry-leading security and absolute transparency.
                        </p>
                        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                          {platformFeatures.map((feat, idx) => (
                            <div key={idx} className="flex flex-col gap-2 group">
                              <div className="w-9 h-9 rounded-lg bg-pp-blue/10 text-pp-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                                {React.cloneElement(feat.icon as any, { size: 16 })}
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-pp-ink">{feat.title}</div>
                                <div className="text-[9px] font-bold text-pp-text-3">{feat.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-10 flex flex-wrap items-center gap-6 text-[10px] font-extrabold text-pp-text-3 uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-pp-blue" />
                            Updated: Feb 4, 2026
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe size={12} className="text-pp-blue" />
                            Compliance v3.0
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
                              <div className="text-pp-text-2 leading-[1.7] text-[14px] font-medium selection:bg-pp-blue/10">
                                {section.content}
                              </div>
                            </div>
                          </div>
                        </section>
                      ))}

                      {/* Help & Contact */}
                      <section id="section-11" className="scroll-mt-12 group">
                        <div className="flex flex-col gap-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-black text-pp-ink mb-6 tracking-tight flex items-center gap-3">
                              <span className="opacity-20 text-2xl">11</span>
                              Help & Contact
                            </h2>
                            <div className="flex flex-col items-center text-center group">
                              <div className="w-16 h-16 bg-pp-blue/5 rounded-2xl flex items-center justify-center text-pp-blue mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Mail size={28} />
                              </div>
                              <h3 className="text-xl font-black text-pp-ink mb-3">Legal Support Desk</h3>
                              <p className="text-[15px] text-pp-text-2 max-w-sm mb-8 leading-relaxed font-medium">
                                Our legal team is available to assist with inquiries regarding data compliance, clinical ethics, or GDPR/DPD requirements.
                              </p>
                              <a href="mailto:privacy@kreed.health" className="text-2xl font-black text-pp-blue hover:text-pp-blue/80 transition-colors tracking-tight">
                                privacy@kreed.health
                              </a>
                              <div className="mt-4 w-12 h-1 bg-pp-blue/20 rounded-full" />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Enterprise Governance */}
                      <div className="pt-24 border-t border-pp-warm-4/60">
                        <div className="relative flex flex-col items-center text-center">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-[0.03] pointer-events-none text-pp-ink">
                            <ShieldCheck size={180} />
                          </div>
                          
                          <div className="relative z-10">
                            <div className="w-16 h-1 bg-pp-blue/30 rounded-full mb-10 mx-auto" />
                            <h3 className="text-2xl font-black text-pp-ink mb-4 tracking-tight">Enterprise Governance</h3>
                            <p className="text-pp-text-2 max-w-2xl text-[15px] leading-relaxed font-medium">
                              Kreed.health's governance framework ensures that every clinical interaction is logged, every byte is encrypted, and every patient's privacy is respected. By using this platform, you join a network committed to the highest standards of digital medicine.
                            </p>
                            <div className="mt-12 flex items-center justify-center gap-10 opacity-60">
                              <div className="flex items-center gap-2.5 text-[11px] font-black text-pp-ink uppercase tracking-[0.2em]">
                                <Lock size={14} className="text-pp-blue" />
                                AES-256 Encrypted
                              </div>
                              <div className="w-1.5 h-1.5 rounded-full bg-pp-warm-4" />
                              <div className="flex items-center gap-2.5 text-[11px] font-black text-pp-ink uppercase tracking-[0.2em]">
                                <Shield size={14} className="text-pp-blue" />
                                GDPR Compliant
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
            <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] rounded-full bg-pp-blue/5 blur-[120px]" />
            <div className="absolute bottom-[10%] right-[5%] w-[30vw] h-[30vw] rounded-full bg-pp-purple/5 blur-[120px]" />
          </div>
        </div>
      </LegalErrorBoundary>
    </div>
  );
};

export default PrivacyPolicyPage;
