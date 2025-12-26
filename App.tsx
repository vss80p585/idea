
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { IdeaCard } from './components/IdeaCard';
import { Idea, BrainstormMode, MODES_CONFIG, Session, ViewType, PRD, RawRequirement, WebPRD } from './types';
import { generateIdeas, generatePRD, generateWebPRD } from './geminiService';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('ideaspark_sessions');
    return saved ? JSON.parse(saved) : [{
      id: 'session-1',
      title: '点子工厂',
      goal: '在这里开启你的任何创意实验',
      currentMode: BrainstormMode.FREE,
      ideas: [],
      prds: [],
      webPrds: [],
      rawRequirements: [],
      createdAt: Date.now(),
      isArchived: false
    }];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(sessions[0]?.id || 'session-1');
  const [view, setView] = useState<ViewType>('session');
  const [activeTab, setActiveTab] = useState<'ideas' | 'prds' | 'web' | 'raw'>('ideas');
  const [inputValue, setInputValue] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genType, setGenType] = useState<'AI' | 'PRD' | 'WEB_PRD' | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [selectedPrdId, setSelectedPrdId] = useState<string | null>(null);
  const [selectedWebPrdId, setSelectedWebPrdId] = useState<string | null>(null);

  const currentSession = useMemo(() => 
    sessions.find(s => s.id === currentSessionId) || sessions[0], 
  [sessions, currentSessionId]);

  const selectedIdea = useMemo(() => 
    currentSession.ideas.find(i => i.id === selectedIdeaId),
  [currentSession, selectedIdeaId]);

  const selectedPrd = useMemo(() => 
    currentSession.prds.find(p => p.id === selectedPrdId),
  [currentSession, selectedPrdId]);

  const selectedWebPrd = useMemo(() => 
    currentSession.webPrds?.find(p => p.id === selectedWebPrdId),
  [currentSession, selectedWebPrdId]);

  useEffect(() => {
    localStorage.setItem('ideaspark_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const updateSession = (updater: (s: Session) => Session) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? updater(s) : s));
  };

  const saveRawRequirement = (content: string, type: 'AI_BOOST' | 'PRD_GEN') => {
    const raw: RawRequirement = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      type,
      createdAt: Date.now()
    };
    updateSession(s => ({
      ...s,
      rawRequirements: [raw, ...(s.rawRequirements || [])]
    }));
  };

  const handleAiBoost = async () => {
    if (isGenerating || !inputValue.trim()) return;
    setIsGenerating(true);
    setGenType('AI');
    saveRawRequirement(inputValue, 'AI_BOOST');
    
    try {
      const result = await generateIdeas(currentSession.goal, currentSession.currentMode, genCount, inputValue);
      const newIdeas: Idea[] = result.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        content: item.content,
        authorId: 'ai',
        authorName: 'AI 联想',
        tags: item.tags || [],
        isFavorite: false,
        priority: 'Medium',
        createdAt: Date.now(),
        category: item.category
      }));
      updateSession(s => ({ ...s, ideas: [...newIdeas, ...s.ideas] }));
      setInputValue('');
    } catch(err) {
        console.error(err);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenType(null);
      }, 1000);
    }
  };

  const handleCreatePRDFromInput = async () => {
    if (!inputValue.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenType('PRD');
    saveRawRequirement(inputValue, 'PRD_GEN');

    try {
      const title = inputValue.split('\n')[0].substr(0, 30);
      const content = await generatePRD(title, inputValue);
      const newPrd: PRD = {
        id: Math.random().toString(36).substr(2, 9),
        ideaId: 'direct-input',
        title: `需求文档: ${title}`,
        content,
        createdAt: Date.now()
      };
      updateSession(s => ({ ...s, prds: [newPrd, ...s.prds] }));
      setActiveTab('prds');
      setInputValue('');
    } catch(err) {
        console.error(err);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenType(null);
      }, 1000);
    }
  };

  const handleConvertToWebPRD = async (prd: PRD) => {
    setIsGenerating(true);
    setGenType('WEB_PRD');
    try {
      const webContent = await generateWebPRD(prd.content);
      const newWebPrd: WebPRD = {
        id: Math.random().toString(36).substr(2, 9),
        prdId: prd.id,
        title: `Web网站文档: ${prd.title.replace('需求文档: ', '')}`,
        content: webContent,
        createdAt: Date.now()
      };
      updateSession(s => ({ 
        ...s, 
        webPrds: [newWebPrd, ...(s.webPrds || [])] 
      }));
      setActiveTab('web');
      setSelectedPrdId(null);
    } catch(err) {
        console.error(err);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenType(null);
      }, 1000);
    }
  };

  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b pb-2">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-5 mb-3 text-gray-800">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-700">{line.replace('### ', '')}</h3>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-2 text-gray-600 list-disc">{line.replace(/^[*-]\s/, '')}</li>;
      return <p key={i} className="mb-3 leading-relaxed text-gray-600">{line}</p>;
    });
  };

  const renderBoard = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-1 border-b border-gray-200 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('ideas')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'ideas' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>灵感板 ({currentSession.ideas.length})</button>
        <button onClick={() => setActiveTab('prds')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'prds' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>需求库 ({currentSession.prds.length})</button>
        <button onClick={() => setActiveTab('web')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'web' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>网站需求库 ({(currentSession.webPrds || []).length})</button>
        <button onClick={() => setActiveTab('raw')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'raw' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>原始记录 ({(currentSession.rawRequirements || []).length})</button>
      </div>

      {activeTab === 'ideas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {currentSession.ideas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onFavorite={() => {}} onClick={(i) => setSelectedIdeaId(i.id)} />
          ))}
          {currentSession.ideas.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 italic">尚未产生灵感火花</div>}
        </div>
      )}

      {activeTab === 'prds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {currentSession.prds.map(prd => (
            <div key={prd.id} onClick={() => setSelectedPrdId(prd.id)} className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-black cursor-pointer shadow-sm hover:shadow-md transition-all group">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-3">DOC</span>
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{prd.title}</h3>
              <p className="text-xs text-gray-400 mt-4">{new Date(prd.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {currentSession.prds.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 italic">暂无需求文档</div>}
        </div>
      )}

      {activeTab === 'web' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {(currentSession.webPrds || []).map(webPrd => (
            <div key={webPrd.id} onClick={() => setSelectedWebPrdId(webPrd.id)} className="bg-white p-6 rounded-3xl border border-emerald-100 hover:border-emerald-500 cursor-pointer shadow-sm hover:shadow-md transition-all group">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-3">WEB SPEC</span>
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{webPrd.title}</h3>
              <p className="text-xs text-gray-400 mt-4">{new Date(webPrd.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
          {(!currentSession.webPrds || currentSession.webPrds.length === 0) && <div className="col-span-full py-20 text-center text-gray-300 italic">暂无网站技术文档</div>}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          {(currentSession.rawRequirements || []).map(raw => (
            <div key={raw.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${raw.type === 'AI_BOOST' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {raw.type === 'AI_BOOST' ? 'AI 联想' : '生成需求'}
                  </span>
                  <span className="text-[10px] text-gray-300 font-bold">{new Date(raw.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{raw.content}</p>
              </div>
            </div>
          ))}
          {(!currentSession.rawRequirements || currentSession.rawRequirements.length === 0) && (
            <div className="py-20 text-center text-gray-400 italic">暂无原始需求记录</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-[60] flex items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <div onClick={() => { setView('session'); setActiveTab('ideas'); }} className="flex items-center space-x-2 cursor-pointer group">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-bold text-white text-sm">IS</div>
            <h1 className="text-lg font-bold">点子工厂</h1>
          </div>
          <div className="hidden sm:flex space-x-2">
            <button onClick={() => setView('history')} className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 hover:text-black transition-all">历史</button>
            <button onClick={() => setView('favorites')} className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 hover:text-black transition-all">收藏</button>
          </div>
        </div>
        <div className="text-right px-4 py-1 bg-gray-50 rounded-xl border border-gray-100 hidden md:block">
          <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{currentSession.title}</p>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        <aside className="lg:w-72 bg-white border-r border-gray-200 p-6 space-y-8 flex-shrink-0 overflow-y-auto">
          <section>
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">脑暴模式</h3>
            <div className="space-y-2">
              {Object.entries(MODES_CONFIG).map(([key, config]) => (
                <button key={key} onClick={() => updateSession(s => ({...s, currentMode: key as BrainstormMode}))} className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center space-x-3 ${currentSession.currentMode === key ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-500'}`}>
                  <span className="text-xl">{config.icon}</span>
                  <span className="text-sm font-bold">{config.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">灵感生成量 ({genCount})</h3>
            <div className="flex flex-col space-y-4 px-2">
              <input type="range" min="1" max="20" value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value))} className="w-full accent-black cursor-pointer" />
              <div className="flex justify-between text-[10px] text-gray-400 font-black px-1">
                <span>1</span>
                <span>10</span>
                <span>20</span>
              </div>
            </div>
          </section>
        </aside>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto relative custom-scrollbar">
          {/* AI Effect Overlay */}
          {genType === 'AI' && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none animate-in zoom-in-50 fade-in duration-500 flex flex-col items-center">
              <div className="text-9xl animate-bounce">💡</div>
              <div className="bg-black/90 backdrop-blur-xl text-white px-8 py-3 rounded-full font-bold mt-6 shadow-2xl border border-white/20">
                正在捕捉灵感火花...
              </div>
            </div>
          )}

          {/* Web PRD / PRD Effect Overlay */}
          {(genType === 'PRD' || genType === 'WEB_PRD') && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none animate-in zoom-in-50 fade-in duration-500 flex flex-col items-center">
              <div className="flex space-x-4 mb-4">
                 <span className="text-7xl animate-bounce" style={{animationDelay: '0.1s'}}>🥘</span>
                 <span className="text-7xl animate-bounce" style={{animationDelay: '0.2s'}}>🔥</span>
                 <span className="text-7xl animate-bounce" style={{animationDelay: '0.3s'}}>🍲</span>
              </div>
              <div className="bg-indigo-600/95 backdrop-blur-xl text-white px-8 py-3 rounded-full font-bold shadow-2xl border border-indigo-400/30">
                {genType === 'WEB_PRD' ? '正在渲染 Web 网站架构...' : '正在烹饪您的需求文档...'}
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto space-y-10">
            {/* Input Zone */}
            <div className="relative group w-full">
              <div className="absolute -inset-1 bg-black rounded-[2.5rem] blur opacity-[0.02] group-hover:opacity-[0.05] transition duration-1000"></div>
              <div className="relative bg-white rounded-[2.5rem] p-3 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-3">
                <textarea 
                  rows={1}
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder="在此输入您的初步点子..." 
                  className="flex-1 px-6 py-4 bg-transparent border-none focus:ring-0 text-gray-800 font-medium text-lg placeholder:text-gray-300 resize-none overflow-hidden" 
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                />
                <div className="flex items-center gap-2 w-full md:w-auto p-1">
                  <button 
                    onClick={handleAiBoost} 
                    disabled={isGenerating || !inputValue.trim()} 
                    className={`flex-1 md:flex-none px-8 py-4 rounded-[1.5rem] transition-all flex items-center justify-center space-x-2 ${isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-black text-white hover:shadow-lg active:scale-95'}`}
                  >
                    <span className="text-base font-bold whitespace-nowrap">AI 联想 ({genCount})</span>
                  </button>
                  <button 
                    onClick={handleCreatePRDFromInput} 
                    disabled={isGenerating || !inputValue.trim()} 
                    className={`flex-1 md:flex-none px-8 py-4 rounded-[1.5rem] transition-all flex items-center justify-center space-x-2 ${isGenerating ? 'bg-indigo-50 text-indigo-300' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'}`}
                  >
                    <span className="text-base font-bold whitespace-nowrap">生成需求</span>
                  </button>
                </div>
              </div>
            </div>

            {renderBoard()}
          </div>
        </div>
      </main>

      {/* Idea Modal */}
      {selectedIdea && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-2xl font-bold">{selectedIdea.title}</h3>
              <button onClick={() => setSelectedIdeaId(null)} className="p-3 hover:bg-gray-200 rounded-full transition-all">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">{selectedIdea.content}</div>
              <div className="flex gap-4">
                 <button onClick={() => { setInputValue(selectedIdea.content); handleCreatePRDFromInput(); setSelectedIdeaId(null); }} className="flex-1 py-5 bg-black text-white rounded-[1.5rem] font-bold shadow-lg">转化为 需求文档</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRD Modal */}
      {selectedPrd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
               <div>
                 <span className="text-[10px] font-black text-indigo-500 block mb-1">通用需求文档</span>
                 <h3 className="text-2xl font-bold">{selectedPrd.title}</h3>
               </div>
               <button onClick={() => setSelectedPrdId(null)} className="p-3 hover:bg-gray-100 rounded-full transition-all"><svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-gray-50/20">
              <div className="max-w-3xl mx-auto prose prose-indigo">{formatMarkdown(selectedPrd.content)}</div>
            </div>
            <div className="p-8 border-t border-gray-100 flex justify-end space-x-4 px-12 bg-white">
               <button 
                 onClick={() => handleConvertToWebPRD(selectedPrd)} 
                 className="px-8 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold border border-emerald-100 hover:bg-emerald-100"
               >
                 转换为 Web 网站需求
               </button>
               <button onClick={() => setSelectedPrdId(null)} className="px-10 py-3 bg-black text-white rounded-2xl font-bold shadow-lg">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* Web PRD Modal */}
      {selectedWebPrd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/20">
               <div>
                 <span className="text-[10px] font-black text-emerald-600 block mb-1">网站技术文档库</span>
                 <h3 className="text-2xl font-bold">{selectedWebPrd.title}</h3>
               </div>
               <button onClick={() => setSelectedWebPrdId(null)} className="p-3 hover:bg-gray-100 rounded-full transition-all"><svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar bg-emerald-50/10">
              <div className="max-w-3xl mx-auto prose prose-emerald">{formatMarkdown(selectedWebPrd.content)}</div>
            </div>
            <div className="p-8 border-t border-gray-100 flex justify-end px-12 bg-white">
               <button onClick={() => setSelectedWebPrdId(null)} className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200">确定</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { left: -100%; width: 30%; }
          50% { left: 0%; width: 60%; }
          100% { left: 100%; width: 30%; }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
