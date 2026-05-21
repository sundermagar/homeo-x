import { useEffect, useRef } from 'react';

export default function DoctorScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Parallax tilt on mouse move
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const parent = scene.parentElement;
    if (!parent) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      scene.style.transform = `rotateY(${dx * 8}deg) rotateX(${-dy * 6}deg)`;
    };
    const onLeave = () => { scene.style.transform = 'rotateY(0deg) rotateX(0deg)'; };

    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseleave', onLeave);
    return () => {
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className="doctor-scene-wrapper">
      <div className="doctor-scene" ref={sceneRef}>
        {/* Glow blob behind doctor */}
        <div className="doc-glow" />

        {/* Doctor SVG character */}
        <svg
          className="doctor-svg"
          viewBox="0 0 220 380"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shadow ellipse */}
          <ellipse cx="110" cy="370" rx="60" ry="8" fill="rgba(0,0,0,0.25)" />

          {/* Lab coat body */}
          <rect x="55" y="170" width="110" height="160" rx="18" fill="#F0F4FF" />
          {/* Coat lapels */}
          <path d="M110 170 L80 220 L110 210 L140 220 Z" fill="#D8E4FF" />
          {/* Coat buttons */}
          <circle cx="110" cy="240" r="4" fill="#B0C4FF" />
          <circle cx="110" cy="260" r="4" fill="#B0C4FF" />
          <circle cx="110" cy="280" r="4" fill="#B0C4FF" />
          {/* Coat pocket */}
          <rect x="130" y="225" width="28" height="20" rx="4" fill="#D8E4FF" />
          <line x1="144" y1="225" x2="144" y2="245" stroke="#B0C4FF" strokeWidth="1.5" />

          {/* Scrubs / shirt under coat */}
          <rect x="75" y="175" width="70" height="40" rx="8" fill="#3B82F6" />

          {/* Stethoscope */}
          <path
            d="M90 200 Q85 230 95 245 Q105 258 110 255 Q115 258 125 245 Q135 230 130 200"
            stroke="#1E3A8A" strokeWidth="4" strokeLinecap="round" fill="none"
          />
          <circle cx="110" cy="258" r="7" fill="#1E3A8A" />
          <circle cx="110" cy="258" r="4" fill="#60A5FA" />
          {/* Ears of stethoscope */}
          <circle cx="88" cy="200" r="4" fill="#1E3A8A" />
          <circle cx="132" cy="200" r="4" fill="#1E3A8A" />

          {/* Neck */}
          <rect x="98" y="150" width="24" height="25" rx="8" fill="#FDBA74" />

          {/* Head */}
          <ellipse cx="110" cy="130" rx="38" ry="42" fill="#FED7AA" />

          {/* Hair */}
          <path
            d="M72 115 Q75 80 110 78 Q145 80 148 115 Q140 95 110 93 Q80 95 72 115Z"
            fill="#1C1917"
          />
          {/* Sideburns */}
          <rect x="72" y="110" width="8" height="20" rx="4" fill="#1C1917" />
          <rect x="140" y="110" width="8" height="20" rx="4" fill="#1C1917" />

          {/* Eyes */}
          <ellipse cx="97" cy="128" rx="6" ry="7" fill="white" />
          <ellipse cx="123" cy="128" rx="6" ry="7" fill="white" />
          <circle cx="98" cy="129" r="4" fill="#1C1917" />
          <circle cx="124" cy="129" r="4" fill="#1C1917" />
          {/* Eye shine */}
          <circle cx="100" cy="127" r="1.5" fill="white" />
          <circle cx="126" cy="127" r="1.5" fill="white" />
          {/* Eyebrows */}
          <path d="M91 120 Q97 116 103 120" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M117 120 Q123 116 129 120" stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Nose */}
          <ellipse cx="110" cy="138" rx="4" ry="3" fill="#FDBA74" />
          <path d="M106 140 Q110 144 114 140" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Smile */}
          <path d="M100 148 Q110 158 120 148" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Ears */}
          <ellipse cx="72" cy="132" rx="7" ry="9" fill="#FED7AA" />
          <ellipse cx="148" cy="132" rx="7" ry="9" fill="#FED7AA" />

          {/* Left arm holding clipboard */}
          <rect x="28" y="175" width="28" height="80" rx="14" fill="#F0F4FF" />
          <rect x="24" y="248" width="36" height="14" rx="7" fill="#FED7AA" />
          {/* Clipboard */}
          <rect x="10" y="230" width="52" height="68" rx="6" fill="#E2E8F0" />
          <rect x="10" y="230" width="52" height="68" rx="6" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="28" y="225" width="16" height="10" rx="3" fill="#94A3B8" />
          {/* Clipboard lines */}
          <line x1="20" y1="252" x2="52" y2="252" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="20" y1="263" x2="52" y2="263" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="20" y1="274" x2="44" y2="274" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="20" y1="285" x2="50" y2="285" stroke="#94A3B8" strokeWidth="1.5" />
          {/* Pen */}
          <rect x="52" y="248" width="6" height="28" rx="3" fill="#3B82F6" />

          {/* Right arm */}
          <rect x="164" y="175" width="28" height="80" rx="14" fill="#F0F4FF" />
          <rect x="160" y="248" width="36" height="14" rx="7" fill="#FED7AA" />

          {/* Legs */}
          <rect x="75" y="325" width="32" height="45" rx="12" fill="#1E40AF" />
          <rect x="113" y="325" width="32" height="45" rx="12" fill="#1E40AF" />
          {/* Shoes */}
          <ellipse cx="91" cy="368" rx="20" ry="8" fill="#1C1917" />
          <ellipse cx="129" cy="368" rx="20" ry="8" fill="#1C1917" />

          {/* Name badge */}
          <rect x="80" y="195" width="60" height="28" rx="5" fill="white" />
          <rect x="80" y="195" width="60" height="28" rx="5" stroke="#DBEAFE" strokeWidth="1" />
          <text x="110" y="208" textAnchor="middle" fill="#3B82F6" fontSize="7" fontWeight="700" fontFamily="sans-serif">DR. SMITH</text>
          <text x="110" y="218" textAnchor="middle" fill="#64748B" fontSize="6" fontFamily="sans-serif">Homeopathy</text>
        </svg>

        {/* Floating stat cards */}
        <div className="doc-float-card doc-float-card--left">
          <div className="doc-float-icon">🩺</div>
          <div className="doc-float-info">
            <div className="doc-float-val">142</div>
            <div className="doc-float-label">Patients Today</div>
          </div>
        </div>

        <div className="doc-float-card doc-float-card--right">
          <div className="doc-float-icon">✅</div>
          <div className="doc-float-info">
            <div className="doc-float-val">98%</div>
            <div className="doc-float-label">Satisfaction</div>
          </div>
        </div>

        <div className="doc-float-card doc-float-card--bottom">
          <div className="doc-float-icon">💊</div>
          <div className="doc-float-info">
            <div className="doc-float-val">24 Rx</div>
            <div className="doc-float-label">Prescribed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
