
import React from 'react';
import { Idea } from '../types';

interface IdeaCardProps {
  idea: Idea;
  onFavorite: (id: string) => void;
  onClick: (idea: Idea) => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onFavorite, onClick }) => {
  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-100 text-gray-600';
    const lower = category.toLowerCase();
    if (lower.includes('white') || lower.includes('事实')) return 'bg-slate-100 text-slate-800 border border-slate-200';
    if (lower.includes('red') || lower.includes('情感')) return 'bg-red-50 text-red-600 border border-red-100';
    if (lower.includes('black') || lower.includes('风险')) return 'bg-neutral-800 text-white';
    if (lower.includes('yellow') || lower.includes('效益')) return 'bg-amber-50 text-amber-600 border border-amber-100';
    if (lower.includes('green') || lower.includes('创意')) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    if (lower.includes('blue') || lower.includes('控制')) return 'bg-blue-50 text-blue-600 border border-blue-100';
    return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  };

  return (
    <div 
      onClick={() => onClick(idea)}
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-gray-100 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 relative"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(idea.category)}`}>
          {idea.category || 'IDEA'}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onFavorite(idea.id); }}
          className={`p-1.5 rounded-full transition-all ${idea.isFavorite ? 'text-rose-500 bg-rose-50' : 'text-gray-300 hover:text-rose-400 bg-gray-50'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={idea.isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-2 leading-tight group-hover:text-black">{idea.title}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed italic">
        {idea.content.replace(/[#*`]/g, '').trim()}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {idea.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};
