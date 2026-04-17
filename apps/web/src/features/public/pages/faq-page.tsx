import React from 'react';
import { usePublicFaqs } from '../hooks/use-public-api';
import { 
  ChevronDown, 
  HelpCircle, 
  MessageSquare,
  Search
} from 'lucide-react';

export const FaqPage: React.FC = () => {
  const { data: faqs, isLoading } = usePublicFaqs();
  const [searchTerm, setSearchTerm] = React.useState('');

  const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.trim().length > 0);

  const filteredFaqs = faqs?.filter(f => {
    if (searchWords.length === 0) return true;
    const textToSearch = ((f.question || '') + ' ' + (f.ans || '') + ' ' + (f.answer || '')).toLowerCase();
    // Return true if AT LEAST ONE word from the search query is found in the question or answer
    return searchWords.some(word => textToSearch.includes(word));
  });

  return (
    <div className="cms-container">
      <div className="cms-header">
        <h1 className="cms-header-title">
          How can we help you?
        </h1>
        <p className="cms-header-subtitle">
          Search our frequently asked questions for quick answers to common inquiries.
        </p>
      </div>

      <div className="search-box">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Search for questions..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="faq-list">
          {[1,2,3].map(i => (
            <div key={i} style={{height: 80, background: 'var(--bg-main)', borderRadius: '1.5rem'}} />
          ))}
        </div>
      ) : (
        <div className="faq-list">
          {filteredFaqs?.map((faq: any) => (
            <details key={faq.id} className="faq-item">
              <summary className="faq-summary">
                <div className="faq-question-group">
                  <div className="faq-icon">
                    <HelpCircle size={20} />
                  </div>
                  <span className="faq-question">{faq.question}</span>
                </div>
                <ChevronDown size={20} style={{color: 'var(--text-disabled)'}} />
              </summary>
              <div className="faq-answer">
                {faq.answer}
              </div>
            </details>
          ))}
          
          {filteredFaqs?.length === 0 && (
            <div className="empty-state">
              <MessageSquare size={48} style={{color: 'var(--border)', margin: '0 auto 1rem auto'}} />
              <p style={{color: 'var(--text-muted)', fontWeight: 600}}>No answers found for your search.</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="btn-link"
                style={{marginTop: '1rem'}}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      )}

      <div className="banner-card" style={{marginTop: '5rem', textAlign: 'center'}}>
        <div style={{width: '100%'}}>
          <h3 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem'}}>Still have questions?</h3>
          <p style={{color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem'}}>Our support team is always ready to help you with your health journey.</p>
          <button 
            className="btn btn-primary" 
            style={{background: 'white', color: 'var(--primary)'}}
            onClick={() => window.location.href = 'mailto:support@homeox.com'}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};
