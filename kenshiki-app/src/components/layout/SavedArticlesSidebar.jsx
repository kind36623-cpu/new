import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, Trash2, Clock, FileText, ChevronRight } from 'lucide-react';

export default function SavedArticlesSidebar() {
  const [saved, setSaved] = useState([]);
  const navigate = useNavigate();

  const load = () => {
    const items = JSON.parse(localStorage.getItem('kenshiki_saved_articles') || '[]');
    setSaved(items);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('storage',       handler);
    window.addEventListener('kenshiki-saved', handler);
    return () => {
      window.removeEventListener('storage',       handler);
      window.removeEventListener('kenshiki-saved', handler);
    };
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const updated = saved.filter(a => a.id !== id);
    localStorage.setItem('kenshiki_saved_articles', JSON.stringify(updated));
    setSaved(updated);
  };

  const handleOpen = (item) => {
    navigate('/article', {
      state: {
        article: {
          id: item.id,
          title: item.title,
          source: item.source,
          pubDate: item.pubDate,
          thumbnail: item.thumbnail,
          link: '#',
          description: '',
        },
        prefetchedContent: item.content,
      }
    });
  };

  const fmt = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  return (
    <aside style={{
      width: 260,
      minWidth: 260,
      height: '100%',
      // Transparent to allow the ArticleView backdrop blur to show through natively
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', 'Outfit', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3730A3, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(109,40,217,0.25)' }}>
            <BookmarkCheck size={18} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em', lineHeight: 1.2 }}>Saved Briefs</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>
              {saved.length} {saved.length === 1 ? 'Archive' : 'Archives'}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', scrollbarWidth: 'none' }}>
        {saved.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(241,245,249,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1' }}>
              <FileText size={22} style={{ color: '#94a3b8' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#64748b', fontSize: 13, fontFamily: "'Cinzel', serif", letterSpacing: '0.03em' }}>Vault Empty</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.5 }}>
                Bookmark intelligent briefs to store them securely.
              </div>
            </div>
          </div>
        ) : (
          saved.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpen(item)}
              style={{
                padding: '14px', borderRadius: 16, cursor: 'pointer',
                marginBottom: 10, position: 'relative',
                border: '1.5px solid transparent', background: 'rgba(255,255,255,0.7)',
                transition: 'all 0.25s cubic-bezier(.22,1,.36,1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.background = '#fff'; 
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; 
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(109,40,217,0.08)'; 
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; 
                e.currentTarget.style.borderColor = 'transparent'; 
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, rgba(55,48,163,0.1), rgba(168,85,247,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <BookmarkCheck size={16} style={{ color: '#6d28d9' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {item.source && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: 'linear-gradient(135deg, #3730A3, #7c3aed)', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {item.source.split(' ')[0]}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                      <Clock size={10} /> {fmt(item.savedAt)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, item.id)}
                style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 8, color: '#cbd5e1', transition: 'all 0.2s', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#cbd5e1'; }}
                title="Remove archive"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
