'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedStore, setSelectedStore] = useState(null)
  const [projects, setProjects] = useState([])
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [pendingAdds, setPendingAdds] = useState([])
  const [pendingDeletes, setPendingDeletes] = useState([])

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    setProjects(data || [])
  }

  async function searchStores(e) {
    const val = e.target.value
    setQuery(val)
    if (val.length < 1) { setResults([]); return }
    const { data } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', `%${val}%`)
      .limit(10)
    setResults(data || [])
  }

  async function selectStore(store) {
    setSelectedStore(store)
    setResults([])
    setQuery(store.name)
    setLoading(true)
    setPendingAdds([])
    setPendingDeletes([])
    const { data: checkData } = await supabase
      .from('checks')
      .select('*')
      .eq('store_id', store.id)
    setChecks(checkData || [])
    setLoading(false)
  }

  function toggleCheck(project) {
    const existing = checks.find(c => c.project_id === project.id)
    if (existing) {
      // 이미 DB에 있는 체크 → 삭제 대기열에 추가/제거
      if (pendingDeletes.includes(existing.id)) {
        setPendingDeletes(pendingDeletes.filter(id => id !== existing.id))
      } else {
        setPendingDeletes([...pendingDeletes, existing.id])
      }
    } else {
      // DB에 없는 체크 → 추가 대기열에 추가/제거
      const idx = pendingAdds.findIndex(a => a.project_id === project.id)
      if (idx >= 0) {
        setPendingAdds(pendingAdds.filter((_, i) => i !== idx))
      } else {
        setPendingAdds([...pendingAdds, { store_id: selectedStore.id, project_id: project.id }])
      }
    }
  }

  async function confirmChanges() {
    if (pendingDeletes.length > 0) {
      await supabase.from('checks').delete().in('id', pendingDeletes)
    }
    if (pendingAdds.length > 0) {
      await supabase.from('checks').insert(pendingAdds)
    }
    window.location.reload()
  }

  const hasPendingChanges = pendingAdds.length > 0 || pendingDeletes.length > 0

  function isChecked(projectId) {
    const dbChecked = checks.some(c => c.project_id === projectId)
    const dbCheck = checks.find(c => c.project_id === projectId)
    if (dbChecked) {
      // DB에 있지만 삭제 대기중이면 unchecked
      return !pendingDeletes.includes(dbCheck.id)
    }
    // DB에 없지만 추가 대기중이면 checked
    return pendingAdds.some(a => a.project_id === projectId)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">매장 체크 시스템</h1>
        <p className="text-gray-500 mb-6">매장명을 검색해서 프로젝트를 확인해주세요</p>

        {/* 프로젝트 목록 (항상 표시) */}
        {projects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              전체 프로젝트
            </h2>
            <div className="space-y-2">
              {projects.map(project => {
                const checked = isChecked(project.id)
                return (
                  <div
                    key={project.id}
                    onClick={() => selectedStore && toggleCheck(project)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      checked
                        ? 'bg-green-500 border-green-500 text-white cursor-pointer'
                        : selectedStore
                        ? 'bg-white border-gray-200 text-gray-700 hover:border-green-300 cursor-pointer'
                        : 'bg-white border-gray-100 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{checked ? '✅' : '⬜'}</span>
                      <span className="font-medium text-sm">{project.title}</span>
                    </div>
                    <span className="text-xs opacity-70">
                      {!selectedStore
                        ? '매장 선택 후 체크 가능'
                        : checked
                        ? '확인 완료'
                        : '미확인'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={searchStores}
            placeholder="매장명 검색..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {results.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
              {results.map(store => (
                <li
                  key={store.id}
                  onClick={() => selectStore(store)}
                  className="px-4 py-3 hover:bg-green-50 cursor-pointer text-gray-700 border-b last:border-0"
                >
                  <span className="font-medium">{store.name}</span>
                  {store.region && <span className="text-gray-400 text-sm ml-2">{store.region}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedStore && loading && (
          <p className="text-gray-400 mt-4">불러오는 중...</p>
        )}

        {selectedStore && !loading && (
          <p className="text-green-600 text-sm mt-3 font-medium">
            ✅ {selectedStore.name} 선택됨 — 위 목록을 클릭해서 체크해주세요
          </p>
        )}

        {hasPendingChanges && (
          <button
            onClick={confirmChanges}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-full shadow-lg font-bold text-lg transition-all z-50"
          >
            확인 ({pendingAdds.length + pendingDeletes.length}건 변경)
          </button>
        )}
      </div>
    </main>
  )
}
