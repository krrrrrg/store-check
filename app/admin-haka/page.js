'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {
  const [projects, setProjects] = useState([])
  const [stores, setStores] = useState([])
  const [checks, setChecks] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreRegion, setNewStoreRegion] = useState('')
  const [tab, setTab] = useState('dashboard')
  const [tooltip, setTooltip] = useState(null)
  const [tappedStore, setTappedStore] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at'),
      supabase.from('stores').select('*').order('name'),
      supabase.from('checks').select('*'),
    ])
    setProjects(p || [])
    setStores(s || [])
    setChecks(c || [])
    if (p && p.length > 0) setSelectedProject(p[0])
  }

  function isChecked(storeId, projectId) {
    return checks.some(c => c.store_id === storeId && c.project_id === projectId)
  }

  async function toggleCheck(store) {
    if (!selectedProject) return
    const existing = checks.find(c => c.store_id === store.id && c.project_id === selectedProject.id)
    if (existing) {
      await supabase.from('checks').delete().eq('id', existing.id)
    } else {
      await supabase
        .from('checks')
        .insert({ store_id: store.id, project_id: selectedProject.id })
    }
    window.location.reload()
  }

  async function addProject() {
    if (!newProjectTitle.trim()) return
    await supabase.from('projects').insert({ title: newProjectTitle.trim() })
    setNewProjectTitle('')
    fetchAll()
  }

  async function deleteProject(id) {
    if (!confirm('프로젝트를 삭제할까요?')) return
    await supabase.from('projects').delete().eq('id', id)
    fetchAll()
  }

  async function addStore() {
    if (!newStoreName.trim()) return
    await supabase.from('stores').insert({ name: newStoreName.trim(), region: newStoreRegion.trim() || null })
    setNewStoreName('')
    setNewStoreRegion('')
    fetchAll()
  }

  async function deleteStore(id) {
    if (!confirm('매장을 삭제할까요?')) return
    await supabase.from('stores').delete().eq('id', id)
    fetchAll()
  }

  function handleMouseEnter(e, store) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      text: `${store.name}${store.region ? ` (${store.region})` : ''}`,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }

  function handleTouch(e, store) {
    e.preventDefault()
    if (tappedStore?.id === store.id) {
      toggleCheck(store)
      setTappedStore(null)
      setTooltip(null)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setTappedStore(store)
      setTooltip({
        text: `${store.name}${store.region ? ` (${store.region})` : ''} — 한 번 더 탭하면 체크`,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    }
  }

  // 지역 목록 동적 생성
  const regions = ['전체', ...Array.from(new Set(stores.map(s => s.region).filter(Boolean)))]

  // 필터된 매장
  const filteredStores = selectedRegion === '전체'
    ? stores
    : stores.filter(s => s.region === selectedRegion)

  const checkedCount = selectedProject
    ? filteredStores.filter(s => isChecked(s.id, selectedProject.id)).length
    : 0

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6" onClick={() => { setTooltip(null); setTappedStore(null) }}>
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap border border-gray-600"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🛠 관리자 대시보드</h1>
          <div className="flex gap-2">
            {['dashboard', 'projects', 'stores'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {t === 'dashboard' ? '📊 현황' : t === 'projects' ? '📁 프로젝트' : '🏪 매장'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'dashboard' && (
          <div>
            {/* 프로젝트 선택 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedProject?.id === p.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>

            {/* 지역 필터 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {regions.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRegion === r
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {r}
                  {r !== '전체' && (
                    <span className="ml-1 opacity-60">
                      {stores.filter(s => s.region === r).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {selectedProject && (
              <>
                <div className="mb-4 text-gray-400 text-sm">
                  <span className="text-green-400 font-bold text-lg">{checkedCount}</span>
                  <span className="mx-1">/</span>
                  {filteredStores.length}개 완료
                  {selectedRegion !== '전체' && (
                    <span className="ml-2 text-blue-400">({selectedRegion})</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredStores.map(store => (
                    <div
                      key={store.id}
                      onMouseEnter={e => handleMouseEnter(e, store)}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={e => { e.stopPropagation(); toggleCheck(store) }}
                      onTouchStart={e => handleTouch(e, store)}
                      className={`w-7 h-7 rounded-sm cursor-pointer transition-all hover:scale-125 ${
                        tappedStore?.id === store.id ? 'ring-2 ring-yellow-400 scale-125' : ''
                      } ${
                        isChecked(store.id, selectedProject.id)
                          ? 'bg-green-500 hover:bg-green-400'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-xs mt-3">PC: 마우스 올리면 매장명, 클릭하면 체크 | 모바일: 1번 탭=매장명, 2번 탭=체크</p>
              </>
            )}
            {projects.length === 0 && <p className="text-gray-500">프로젝트를 먼저 추가해주세요.</p>}
          </div>
        )}

        {tab === 'projects' && (
          <div>
            <div className="flex gap-2 mb-6">
              <input
                value={newProjectTitle}
                onChange={e => setNewProjectTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProject()}
                placeholder="새 프로젝트 이름..."
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 flex-1 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button onClick={addProject} className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-medium">추가</button>
            </div>
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                  <span>{p.title}</span>
                  <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'stores' && (
          <div>
            <div className="flex gap-2 mb-6">
              <input
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                placeholder="매장명..."
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 flex-1 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                value={newStoreRegion}
                onChange={e => setNewStoreRegion(e.target.value)}
                placeholder="지역 (선택)..."
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 w-32 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button onClick={addStore} className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg font-medium">추가</button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {stores.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                  <span>
                    {s.name}
                    {s.region && <span className="text-gray-400 text-sm ml-2">{s.region}</span>}
                  </span>
                  <button onClick={() => deleteStore(s.id)} className="text-red-400 hover:text-red-300 text-sm">삭제</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
