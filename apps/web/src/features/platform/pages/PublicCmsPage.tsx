import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api-client';
import { ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PublicCmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/settings/cms/public/pages/slug/${slug}`);
        if (data.success) {
          setPage(data.data);
        } else {
          setError('Page not found');
        }
      } catch (err) {
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Not Found</h1>
        <p className="text-gray-600 mb-6">{error || 'The page you are looking for does not exist.'}</p>
        <Link to="/login" className="inline-flex items-center gap-2 text-[#2563EB] font-bold hover:underline">
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Login</span>
          </Link>
          <div className="flex items-center gap-2 text-[#2563EB]">
            <ShieldCheck size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Secure Portal</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-6">
              {page.title}
            </h1>
            
            <div className="prose prose-blue max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600">
              <ReactMarkdown>{page.content}</ReactMarkdown>
            </div>
          </div>
          
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-medium">Last Updated: {new Date(page.updatedAt).toLocaleDateString()}</span>
            <span className="text-[10px] text-gray-400 font-medium">© 2026 Kreed.health Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
