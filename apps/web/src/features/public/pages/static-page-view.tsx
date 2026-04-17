import React from 'react';
import { useParams } from 'react-router-dom';
import { usePublicPage } from '../hooks/use-public-api';
import { Clock, Share2, Printer } from 'lucide-react';

export const StaticPageView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading } = usePublicPage(slug || '');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-12 w-2/3 bg-gray-200 rounded-lg animate-pulse mb-8" />
        <div className="space-y-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you are looking for does not exist or has been moved.</p>
        <a href="/" className="inline-block px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all">
          Go Back Home
        </a>
      </div>
    );
  }

  return (
    <div className="cms-container">
      <header className="static-page-header">
        <div className="static-page-category">
          <span style={{width: 32, height: 2, background: 'var(--primary)'}} />
          {page.category || 'Information'}
        </div>
        <h1 className="static-page-title">
          {page.title}
        </h1>
        
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.5rem 0', marginTop: '1.5rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem'}}>
              <Clock size={16} />
              <span>Last updated: {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <button className="btn-ghost" style={{padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)'}} title="Print page">
              <Printer size={20} />
            </button>
            <button className="btn-ghost" style={{padding: '0.5rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)'}} title="Share page">
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="static-page-content">
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>

      <footer style={{marginTop: '6rem', paddingTop: '3rem', borderTop: '1px solid var(--border)'}}>
        <div style={{background: 'var(--bg-main)', borderRadius: '1.5rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div>
            <h4 style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem'}}>Was this page helpful?</h4>
            <p style={{color: 'var(--text-muted)'}}>Your feedback helps us improve our service.</p>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button className="btn" style={{background: 'white', border: '1px solid var(--border)', color: 'var(--text-main)'}}>
              Yes, thanks!
            </button>
            <button className="btn" style={{background: 'white', border: '1px solid var(--border)', color: 'var(--text-main)'}}>
              Not quite
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
