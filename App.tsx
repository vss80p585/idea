
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { IdeaCard } from './components/IdeaCard';
import { Idea, BrainstormMode, MODES_CONFIG, Session, ViewType, PRD, RawRequirement, WebPRD } from './types';
import { generateIdeas, generatePRD, generateWebPRD } from './geminiService';

const App: React.FC = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('ideaspark_auth') === 'true');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- App State ---
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('ideaspark_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          webPrds: s.webPrds || [],
          rawRequirements: s.rawRequirements || [],
          ideas: s.ideas || [],
          prds: s.prds || []
        }));
      } catch (e) { console.error(e); }
    }
    return [{
      id: 'session-1',
      title: '主工作区',
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

  const selectedIdea = useMemo(() => currentSession.ideas.find(i => i.id === selectedIdeaId), [currentSession, selectedIdeaId]);
  const selectedPrd = useMemo(() => currentSession.prds.find(p => p.id === selectedPrdId), [currentSession, selectedPrdId]);
  const selectedWebPrd = useMemo(() => currentSession.webPrds?.find(p => p.id === selectedWebPrdId), [currentSession, selectedWebPrdId]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem('ideaspark_sessions', JSON.stringify(sessions));
  }, [sessions, isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === '123' && loginForm.password === '123') {
      setIsLoggedIn(true);
      localStorage.setItem('ideaspark_auth', 'true');
    } else {
      setLoginError('账号或密码不正确');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ideaspark_auth');
  };

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
    updateSession(s => ({ ...s, rawRequirements: [raw, ...(s.rawRequirements || [])] }));
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
        authorName: 'AI',
        tags: item.tags || [],
        isFavorite: false,
        priority: 'Medium',
        createdAt: Date.now(),
        category: item.category
      }));
      updateSession(s => ({ ...s, ideas: [...newIdeas, ...s.ideas] }));
      setInputValue('');
    } catch(e) { console.error(e); } finally {
      setTimeout(() => { setIsGenerating(false); setGenType(null); }, 1500);
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
        ideaId: 'direct',
        title: `需求文档: ${title}`,
        content,
        createdAt: Date.now()
      };
      updateSession(s => ({ ...s, prds: [newPrd, ...s.prds] }));
      setActiveTab('prds');
      setInputValue('');
    } catch(e) { console.error(e); } finally {
      setTimeout(() => { setIsGenerating(false); setGenType(null); }, 1500);
    }
  };

  const handleConvertToWebPRD = async (prd: PRD) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenType('WEB_PRD');
    try {
      const webContent = await generateWebPRD(prd.content);
      const newWebPrd: WebPRD = {
        id: Math.random().toString(36).substr(2, 9),
        prdId: prd.id,
        title: `Web落地: ${prd.title.replace('需求文档: ', '')}`,
        content: webContent,
        createdAt: Date.now()
      };
      updateSession(s => ({ ...s, webPrds: [newWebPrd, ...(s.webPrds || [])] }));
      setActiveTab('web');
      setSelectedPrdId(null);
    } catch(e) { console.error(e); } finally {
      setTimeout(() => { setIsGenerating(false); setGenType(null); }, 1500);
    }
  };

  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b pb-2">{line.replace('# ', '')}</h1>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-5 mb-3 text-gray-800">{line.replace('## ', '')}</h2>;
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-700">{line.replace('### ', '')}</h3>;
      return <p key={i} className="mb-3 leading-relaxed text-gray-600">{line}</p>;
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-500">
          <div className="p-10">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white text-2xl font-black">IS</div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">欢迎回到灵感工坊</h2>
            <p className="text-gray-400 text-center mb-8 text-sm">单点登录：123 / 123</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" placeholder="账户名称" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5" />
              <input type="password" placeholder="访问密码" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-black/5" />
              {loginError && <p className="text-rose-500 text-xs text-center font-bold animate-pulse">{loginError}</p>}
              <button type="submit" className="w-full py-5 bg-black text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-black/10">进入工厂</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7]">
      <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-[60] flex items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <div onClick={() => { setView('session'); setActiveTab('ideas'); }} className="flex items-center space-x-2 cursor-pointer group">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-bold text-white text-sm">IS</div>
            <h1 className="text-lg font-bold">IdeaSpark</h1>
          </div>
          <div className="flex space-x-1">
            <button onClick={() => setView('session')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'session' ? 'bg-black text-white' : 'text-gray-400'}`}>工作台</button>
            <button onClick={handleLogout} className="px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 hover:text-rose-500">登出</button>
          </div>
        </div>
        <div className="text-right px-4 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ACTIVE SESSION</p>
           <p className="text-xs font-bold text-gray-900">{currentSession.title}</p>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="lg:w-80 bg-white border-r border-gray-200 p-8 space-y-10 flex-shrink-0 overflow-y-auto custom-scrollbar">
          <section>
            <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest mb-6">灵感策略</h3>
            <div className="flex flex-col space-y-3">
               {Object.entries(MODES_CONFIG).map(([key, config]) => (
                 <div key={key} onClick={() => updateSession(s => ({...s, currentMode: key as BrainstormMode}))} className={`group cursor-pointer p-4 rounded-3xl border-2 transition-all flex items-center space-x-4 ${currentSession.currentMode === key ? 'border-black bg-black text-white' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                       <p className={`font-bold text-sm ${currentSession.currentMode === key ? 'text-white' : 'text-gray-900'}`}>{config.name}</p>
                       <p className="text-[10px] opacity-60 leading-tight">{config.description}</p>
                    </div>
                    {currentSession.currentMode === key && <div className="w-2 h-2 bg-white rounded-full"></div>}
                 </div>
               ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest">爆发系数</h3>
              <span className="text-xs font-black text-gray-900">{genCount} Ideas</span>
            </div>
            <input type="range" min="1" max="20" value={genCount} onChange={e => setGenCount(parseInt(e.target.value))} className="w-full accent-black cursor-pointer mb-2" />
            <p className="text-[10px] text-gray-400 leading-relaxed font-medium">调整AI生成灵感的单次批量规模，以获得更聚焦或更广泛的结果。</p>
          </section>

          <section className="pt-6 border-t border-gray-100">
             <div className="bg-indigo-50 p-6 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-4xl opacity-10 group-hover:rotate-12 transition-transform">💎</div>
                <p className="text-[11px] font-black text-indigo-600 mb-3 uppercase tracking-tighter">创意全生命周期</p>
                <div className="space-y-3">
                   <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                      <p className="text-[10px] text-indigo-500 font-bold">1. 联想激发灵感</p>
                   </div>
                   <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                      <p className="text-[10px] text-indigo-500 font-bold">2. 生成需求文档</p>
                   </div>
                   <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                      <p className="text-[10px] text-indigo-500 font-bold">3. 输出Web架构</p>
                   </div>
                </div>
             </div>
          </section>
        </aside>

        {/* Content Area */}
        <div className="flex-1 p-10 overflow-y-auto relative custom-scrollbar">
          {/* Central Ads / Onboarding if empty */}
          {currentSession.ideas.length === 0 && currentSession.prds.length === 0 && (
            <div className="max-w-4xl mx-auto py-20 animate-in fade-in slide-in-from-top-10 duration-1000">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="text-4xl mb-4 animate-bounce">🌈</div>
                    <h3 className="font-bold text-lg mb-2">激发灵感</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">基于顶尖方法论，让点子喷薄而出。每一个关键词都是新大陆。</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="text-4xl mb-4" style={{animation: 'pulse 2s infinite'}}>📄</div>
                    <h3 className="font-bold text-lg mb-2">深度需求</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">点子到文档的跃迁。一键生成逻辑严密的专业PRD需求文档。</p>
                 </div>
                 <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="text-4xl mb-4 animate-spin-slow">🚀</div>
                    <h3 className="font-bold text-lg mb-2">Web落地</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">让构想成为现实。导出具体到页面、UI和技术选型的Web文档。</p>
                 </div>
              </div>
            </div>
          )}

          <div className="max-w-6xl mx-auto space-y-12">
            {/* Action Bar */}
            <div className="relative group w-full">
              <div className="absolute -inset-2 bg-black rounded-[3rem] blur opacity-[0.01] group-hover:opacity-[0.03] transition duration-1000"></div>
              <div className="relative bg-white rounded-[2.5rem] p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-4">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={e => setInputValue(e.target.value)} 
                  placeholder="输入一段初步构想..." 
                  className="flex-1 px-8 py-5 bg-transparent border-none focus:ring-0 text-gray-800 font-medium text-xl placeholder:text-gray-200" 
                />
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <button onClick={handleAiBoost} disabled={isGenerating || !inputValue.trim()} className={`flex-1 md:flex-none px-10 py-5 rounded-[1.5rem] font-bold transition-all ${isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-black text-white hover:scale-[1.02] shadow-xl shadow-black/10'}`}>AI 联想</button>
                   <button onClick={handleCreatePRDFromInput} disabled={isGenerating || !inputValue.trim()} className={`flex-1 md:flex-none px-10 py-5 rounded-[1.5rem] font-bold border border-indigo-100 transition-all ${isGenerating ? 'bg-indigo-50 text-indigo-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>生成需求</button>
                </div>
              </div>
              
              {/* Animation Layer */}
              {genType === 'AI' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center animate-in zoom-in-50 fade-in duration-500">
                  <div className="text-9xl animate-bounce">💡</div>
                  <div className="bg-black/90 text-white px-8 py-2 rounded-full font-bold mt-6 shadow-2xl backdrop-blur-xl">正在碰撞灵感火花...</div>
                </div>
              )}
              {(genType === 'PRD' || genType === 'WEB_PRD') && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center animate-in zoom-in-50 fade-in duration-500">
                  <div className="flex space-x-4 mb-4">
                     <span className="text-7xl animate-bounce" style={{animationDelay: '0s'}}>🥘</span>
                     <span className="text-7xl animate-bounce" style={{animationDelay: '0.2s'}}>🔥</span>
                     <span className="text-7xl animate-bounce" style={{animationDelay: '0.4s'}}>🍲</span>
                  </div>
                  <div className="bg-indigo-600 text-white px-8 py-2 rounded-full font-bold shadow-2xl backdrop-blur-xl">正在深度渲染文档内容...</div>
                </div>
              )}
            </div>

            {/* Main Tabs and Content */}
            <div className="space-y-8">
               <div className="flex items-center space-x-1 border-b border-gray-200 sticky top-0 bg-[#F5F5F7]/80 backdrop-blur-md z-40 py-2">
                 <button onClick={() => setActiveTab('ideas')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'ideas' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>点子池 ({currentSession.ideas.length})</button>
                 <button onClick={() => setActiveTab('prds')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'prds' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>需求库 ({currentSession.prds.length})</button>
                 <button onClick={() => setActiveTab('web')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'web' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>Web落地库 ({(currentSession.webPrds || []).length})</button>
                 <button onClick={() => setActiveTab('raw')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'raw' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>记录</button>
               </div>

               <div className="animate-in fade-in duration-700">
                 {activeTab === 'ideas' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {currentSession.ideas.map(i => <IdeaCard key={i.id} idea={i} onFavorite={() => {}} onClick={idea => setSelectedIdeaId(idea.id)} />)}
                   </div>
                 )}
                 {activeTab === 'prds' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {currentSession.prds.map(p => (
                       <div key={p.id} onClick={() => setSelectedPrdId(p.id)} className="bg-white p-8 rounded-[3rem] border border-gray-100 hover:border-black cursor-pointer shadow-sm transition-all group">
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-4">PRD DOCUMENT</span>
                         <h3 className="font-bold text-gray-900 mb-2 leading-tight line-clamp-2">{p.title}</h3>
                         <p className="text-xs text-gray-300 mt-4">{new Date(p.createdAt).toLocaleDateString()}</p>
                       </div>
                     ))}
                   </div>
                 )}
                 {activeTab === 'web' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {(currentSession.webPrds || []).map(w => (
                       <div key={w.id} onClick={() => setSelectedWebPrdId(w.id)} className="bg-white p-8 rounded-[3rem] border border-emerald-100 hover:border-emerald-500 cursor-pointer shadow-sm transition-all group">
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-4">WEB SPECIFICATION</span>
                         <h3 className="font-bold text-gray-900 mb-2 leading-tight line-clamp-2">{w.title}</h3>
                         <p className="text-xs text-gray-300 mt-4">{new Date(w.createdAt).toLocaleDateString()}</p>
                       </div>
                     ))}
                   </div>
                 )}
                 {activeTab === 'raw' && (
                   <div className="space-y-4 max-w-3xl mx-auto">
                     {(currentSession.rawRequirements || []).map(r => (
                       <div key={r.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start space-x-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${r.type === 'AI_BOOST' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>{r.type === 'AI_BOOST' ? 'AI' : 'PRD'}</span>
                          <div className="flex-1">
                             <p className="text-sm text-gray-800 font-medium leading-relaxed">{r.content}</p>
                             <p className="text-[10px] text-gray-300 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {selectedIdea && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400">
             <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedIdea.title}</h3>
                <button onClick={() => setSelectedIdeaId(null)} className="p-3 hover:bg-gray-200 rounded-full transition-all"><svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="p-12 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <p className="text-gray-600 text-xl leading-relaxed whitespace-pre-wrap italic font-light">"{selectedIdea.content}"</p>
                <div className="flex gap-4">
                   <button onClick={() => { setInputValue(selectedIdea.content); handleCreatePRDFromInput(); setSelectedIdeaId(null); }} className="flex-1 py-6 bg-black text-white rounded-[1.5rem] font-bold shadow-xl shadow-black/10 hover:scale-[1.01] transition-all">将此点子转化为需求文档</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {selectedPrd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-400">
             <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Standard PRD</span>
                   <h3 className="text-3xl font-black text-gray-900">{selectedPrd.title}</h3>
                </div>
                <button onClick={() => setSelectedPrdId(null)} className="p-4 hover:bg-gray-100 rounded-full transition-all"><svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 p-16 overflow-y-auto custom-scrollbar bg-gray-50/20">
                <div className="max-w-3xl mx-auto prose prose-indigo">{formatMarkdown(selectedPrd.content)}</div>
             </div>
             <div className="p-10 border-t border-gray-100 bg-white flex justify-end space-x-6">
                <button onClick={() => handleConvertToWebPRD(selectedPrd)} className="px-10 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center space-x-3"><span className="text-xl">🚀</span><span>生成 Web 落地需求</span></button>
                <button onClick={() => setSelectedPrdId(null)} className="px-12 py-4 bg-black text-white rounded-2xl font-bold">关闭</button>
             </div>
          </div>
        </div>
      )}

      {selectedWebPrd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[4rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-400 border border-emerald-100">
             <div className="p-10 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/10">
                <div>
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Web Technical Spec</span>
                   <h3 className="text-3xl font-black text-gray-900">{selectedWebPrd.title}</h3>
                </div>
                <button onClick={() => setSelectedWebPrdId(null)} className="p-4 hover:bg-emerald-50 rounded-full transition-all"><svg className="h-8 w-8 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 p-16 overflow-y-auto custom-scrollbar bg-emerald-50/5">
                <div className="max-w-3xl mx-auto prose prose-emerald">{formatMarkdown(selectedWebPrd.content)}</div>
             </div>
             <div className="p-10 border-t border-emerald-100 bg-white flex justify-end">
                <button onClick={() => setSelectedWebPrdId(null)} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200">确定</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
};

export default App;
