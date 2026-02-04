'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { debounce } from '@/lib/frontend-utils'
import { ZOOM_MEETING_URL, ZOOM_MEETING_ID_DISPLAY } from '@/lib/meeting-config'
import type { Member, CheckinRecord } from '@/types'

export default function CheckinPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [checkins, setCheckins] = useState<Record<number, CheckinRecord>>({})
  const [selectedMember, setSelectedMember] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [meetingStatus, setMeetingStatus] = useState('今日無例會')
  const [nextMeeting, setNextMeeting] = useState<{ date: string } | null>(null)
  const [countdown, setCountdown] = useState<string>('')
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const submitCheckin = useCallback(async () => {
    if (!selectedMember) {
      alert('請選擇您的名字')
      return
    }

    // 检查是否有会议
    if (meetingStatus === '今日無例會') {
      alert('今日無例會，無法進行簽到')
      return
    }

    // 防止重复提交
    if (submitting) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedMember,
          date: today,
          message: message.trim(),
          status: 'present',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '簽到失敗')
      }

      const data = await response.json()
      if (data.success) {
        // 重新載入數據以確保與後台同步（不緩存）
        const checkinsRes = await fetch(`/api/checkins?date=${today}&_t=${Date.now()}`, { cache: 'no-store' })
        if (checkinsRes.ok) {
          const checkinsData = await checkinsRes.json()
          const checkinMap: Record<number, CheckinRecord> = {}
          if (checkinsData.checkins) {
            checkinsData.checkins.forEach((checkin: CheckinRecord & { member_id: number }) => {
              checkinMap[checkin.member_id] = checkin
            })
          }
          setCheckins(checkinMap)
        }
        
        setMessage('')
        setSelectedMember(null)
        alert('簽到成功！')
      } else {
        alert('簽到失敗，請重試')
      }
    } catch (error) {
      console.error('Error checking in:', error)
      alert(error instanceof Error ? error.message : '簽到失敗，請重試')
    } finally {
      setSubmitting(false)
    }
  }, [selectedMember, meetingStatus, today, message, submitting])

  // 防抖處理搜尋詞
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 過濾會員（使用防抖後的搜尋詞）
  const filteredMembers = useMemo(() => {
    if (!debouncedSearchTerm) return members
    
    const searchLower = debouncedSearchTerm.toLowerCase()
    return members.filter(member => 
      member.name.toLowerCase().includes(searchLower) ||
      member.profession.toLowerCase().includes(searchLower) ||
      member.id.toString().includes(searchLower)
    )
  }, [members, debouncedSearchTerm])

  // 計算下個週四日期（例會固定每週四）
  const getNextThursdayDate = useCallback((): string | null => {
    const d = new Date()
    const day = d.getDay()
    const thursday = 4
    let daysUntil = (thursday - day + 7) % 7
    if (daysUntil === 0) daysUntil = 7
    const next = new Date(d)
    next.setDate(d.getDate() + daysUntil)
    return next.toISOString().split('T')[0]
  }, [])

  // 一律不快取，避免例會當天 6:30 後仍顯示舊的「今日無例會」或跨日未更新
  const noStore = { cache: 'no-store' as RequestCache }

  // 加载数据的函数
  const loadData = useCallback(async () => {
    setLoadError(null)
    try {
      const todayDate = new Date().toISOString().split('T')[0]
      setToday(todayDate)

      // 获取会员列表（不快取，確保名單與後台一致）
      const membersRes = await fetch('/api/members', noStore)
      const membersData = await membersRes.json().catch(() => ({}))
      if (!membersRes.ok) {
        const errMsg = membersData?.error || '無法載入會員名單'
        throw new Error(errMsg)
      }
      setMembers(membersData.members || [])

      // 获取今天的签到记录（不快取 + 時間戳防快取，例會當天時間一到即可正確顯示可簽到）
      const checkinsRes = await fetch(`/api/checkins?date=${todayDate}&_t=${Date.now()}`, noStore)
      if (!checkinsRes.ok) {
        throw new Error('Failed to fetch checkins')
      }
      const checkinsData = await checkinsRes.json()
      
      const checkinMap: Record<number, CheckinRecord> = {}
      if (checkinsData.checkins) {
        checkinsData.checkins.forEach((checkin: CheckinRecord & { member_id: number }) => {
          checkinMap[checkin.member_id] = checkin
        })
      }
      setCheckins(checkinMap)
      
      // 檢查會議狀態
      if (checkinsData.meeting) {
        setMeetingStatus(`今日會議：${checkinsData.meeting.date}`)
        setNextMeeting(null)
      } else {
        setMeetingStatus('今日無例會')
        // 取得下次例會（最早一場 date > 今天），若無則計算下個週四
        const meetingsRes = await fetch('/api/meetings?_t=' + Date.now(), noStore)
        const meetingsData = await meetingsRes.json().catch(() => ({}))
        const allMeetings = meetingsData.meetings || []
        const futureMeetings = allMeetings.filter((m: { date: string }) => m.date > todayDate)
        let next = futureMeetings.length > 0
          ? futureMeetings.reduce((a: { date: string }, b: { date: string }) => (a.date < b.date ? a : b))
          : null
        if (!next) {
          // 無未來會議時，以「下個週四」為預估
          const nextThu = getNextThursdayDate()
          next = nextThu ? { date: nextThu } : null
        }
        setNextMeeting(next)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setLoadError(err instanceof Error ? err.message : '載入資料失敗')
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [getNextThursdayDate])

  // 初始載入 + 定時刷新（20 秒），確保跨日或例會 6:30 後不久即可更新會議狀態，避免快取導致無法簽到
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 20000)
    return () => clearInterval(interval)
  }, [loadData])

  // 分頁重新可見時立即重拉資料（例：從其他分頁切回時已過 6:30 或跨日）
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadData])

  // 倒數計時（會議室 6:30 開放，每分鐘更新）
  useEffect(() => {
    if (!nextMeeting?.date) {
      setCountdown('')
      return
    }
    const tick = () => {
      const now = new Date()
      const target = new Date(nextMeeting.date + 'T06:30:00+08:00')
      if (now >= target) {
        setCountdown('例會已開始或已結束')
        return
      }
      const diff = target.getTime() - now.getTime()
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
      const parts = []
      if (days > 0) parts.push(`${days} 天`)
      parts.push(`${hours} 小時`)
      parts.push(`${mins} 分`)
      setCountdown(parts.join(' '))
    }
    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [nextMeeting?.date])

  // 鍵盤快捷鍵：Ctrl/Cmd+Enter 提交簽到（獨立 effect，用 ref 避免 deps 導致重跑）
  const submitCheckinRef = useRef(submitCheckin)
  const selectedMemberRef = useRef(selectedMember)
  const submittingRef = useRef(submitting)
  submitCheckinRef.current = submitCheckin
  selectedMemberRef.current = selectedMember
  submittingRef.current = submitting
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && selectedMemberRef.current && !submittingRef.current) {
        e.preventDefault()
        submitCheckinRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const getCheckinStatus = useCallback((memberId: number) => {
    const checkin = checkins[memberId]
    if (!checkin) return { status: '缺席', time: '', isPresent: false }
    return {
      status: checkin.status === 'present' ? '已簽到' : '缺席',
      time: checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleString('zh-TW') : '',
      isPresent: checkin.status === 'present',
    }
  }, [checkins])

  // 排序：已签到的在前面 - 使用 useMemo 优化（使用過濾後的會員）
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const aStatus = getCheckinStatus(a.id)
      const bStatus = getCheckinStatus(b.id)
      if (aStatus.isPresent && !bStatus.isPresent) return -1
      if (!aStatus.isPresent && bStatus.isPresent) return 1
      return a.id - b.id
    })
  }, [filteredMembers, getCheckinStatus])

  // 统计数据 - 使用 useMemo 优化
  const stats = useMemo(() => {
    const presentCount = Object.values(checkins).filter(c => c.status === 'present').length
    return {
      total: members.length,
      present: presentCount,
      absent: members.length - presentCount,
    }
  }, [members.length, checkins])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header - 優雅設計 */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 drop-shadow-sm">
                ⛧=Good Morning=⛧｜華地產線上鑽石分會⏃付出者收穫
              </h1>
            </div>
            <div className="flex gap-2">
              <a
                href="/admin/login"
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium text-sm border border-white/30 shadow-sm"
              >
                🔐 後台管理
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Meeting Status - 優雅卡片設計 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-xl">📅</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">{meetingStatus}</h2>
          </div>
          {meetingStatus !== '今日無例會' && (
            <div className="ml-13 pl-1 mt-3 flex flex-wrap items-center gap-3">
              <a
                href={ZOOM_MEETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                🎥 加入 Zoom 會議室
              </a>
              <span className="text-gray-600 text-xs font-medium">
                會議 ID: {ZOOM_MEETING_ID_DISPLAY}
              </span>
            </div>
          )}
          {meetingStatus === '今日無例會' && (
            <div className="ml-13 pl-1 space-y-3">
              <p className="text-red-600 text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">💤</span>
                <span>今天沒有安排例會，無法進行簽到</span>
              </p>
              {nextMeeting && (
                <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 space-y-2">
                  <p className="text-indigo-800 font-semibold text-sm flex items-center gap-2">
                    <span>📅</span>
                    下次例會：{new Date(nextMeeting.date + 'T12:00:00').toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    })}
                  </p>
                  {countdown && (
                    <p className="text-indigo-600 font-bold text-lg flex items-center gap-2">
                      <span className="text-xl">⏱</span>
                      距離會議室開放還有 {countdown}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-indigo-100">
                    <a
                      href={ZOOM_MEETING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      🎥 加入 Zoom 會議室
                    </a>
                    <span className="text-indigo-600/80 text-xs font-medium">
                      會議 ID: {ZOOM_MEETING_ID_DISPLAY}
                    </span>
                  </div>
                </div>
              )}
              {!nextMeeting && (
                <p className="text-gray-500 text-xs mt-2 ml-6">
                  請聯繫管理員確認會議時間安排
                </p>
              )}
            </div>
          )}
        </div>

        {/* Checkin Form - 簽到區（例會日可簽到，非例會日顯示提示） */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 sm:p-6 border border-white/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
              <span className="text-xl">👋</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                {meetingStatus === '今日無例會' ? '簽到區（例會當天開放）' : '簽到前留言一下吧'}
              </h2>
              <p className="text-gray-600 text-sm mt-0.5">
                {meetingStatus === '今日無例會'
                  ? (nextMeeting ? `例會當天開放簽到` : '例會當天開放')
                  : '告訴我們，您的事業需要什麼幫助？'}
              </p>
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-4 border-l-2 border-indigo-300 pl-3">
            會議室 6:30 開放｜簽到 6:30～8:45｜7:00 前簽到才進獎品區
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="sm:col-span-3 w-full">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                選擇您的名字
              </label>
              <select
                value={selectedMember || ''}
                onChange={(e) => setSelectedMember(e.target.value ? parseInt(e.target.value) : null)}
                disabled={meetingStatus === '今日無例會'}
                className="w-full h-[42px] px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white shadow-sm hover:border-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">請選擇您的名字</option>
                {filteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id} {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-7 w-full">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                留言（選填）
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setMessage(e.target.value)
                  }
                }}
                maxLength={500}
                disabled={meetingStatus === '今日無例會'}
                className="w-full min-h-[42px] px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y text-sm bg-white shadow-sm hover:border-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={meetingStatus === '今日無例會' ? '例會當天開放' : '輸入您的留言...（最多500字）'}
                rows={1}
              />
              {message.length > 0 && (
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {message.length} / 500
                </div>
              )}
            </div>
            <div className="sm:col-span-2 flex flex-row sm:flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setSelectedMember(null)
                }}
                disabled={meetingStatus === '今日無例會'}
                className="px-4 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-300 shadow-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button
                onClick={submitCheckin}
                disabled={meetingStatus !== '今日無例會' && (!selectedMember || submitting)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>簽到中...</span>
                  </>
                ) : meetingStatus === '今日無例會' ? (
                  '例會當天開放'
                ) : (
                  '送出並簽到'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Checkin Table - 優雅設計 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 sm:p-6 border border-white/50 overflow-hidden">
          <div className="mb-5">
            {meetingStatus === '今日無例會' ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                    <span className="text-xl">🐾</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-800">
                    {nextMeeting
                      ? `下次例會 ${nextMeeting.date}｜會員清單僅供查看，無法簽到`
                      : '今日無例會｜會員清單僅供查看，無法簽到'}
                  </h2>
                </div>
                <p className="text-gray-500 text-sm italic ml-13 pl-1">
                  {nextMeeting ? '記得準時出席哦！' : '曾經有一份真摯的選單在我面前，我沒有簽到，等到過了七點才後悔莫及'}
                </p>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                  <span className="text-xl">✅</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-gray-800">簽到</h2>
              </div>
            )}
          </div>
          
          {/* 會員列表 - 響應式設計 */}
          <div className="space-y-4">
            {/* 名單為空時的提示 */}
            {!loading && sortedMembers.length === 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
                <p className="text-amber-800 font-semibold mb-2">
                  {loadError ? '⚠️ 無法載入會員名單' : '暫無會員資料'}
                </p>
                <p className="text-amber-700 text-sm mb-4">
                  {loadError || '請聯繫管理員匯入會員'}
                </p>
                <button
                  onClick={() => { setLoading(true); loadData() }}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
                >
                  重新載入
                </button>
              </div>
            )}
            {/* 桌面版表格 */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 shadow-inner">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">編號</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">名字</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">專業別 (下方為留言)</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">簽到時間</th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedMembers.map((member, index) => {
                    const checkinInfo = getCheckinStatus(member.id)
                    return (
                      <tr 
                        key={member.id} 
                        className={`transition-colors ${
                          checkinInfo.isPresent 
                            ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/30 hover:from-green-50 hover:to-emerald-50' 
                            : 'hover:bg-gray-50'
                        } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">{member.id}</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm font-bold text-gray-900">{member.name}</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-700">
                          <div className="font-medium">{member.profession}</div>
                          {checkins[member.id]?.message && (
                            <div className="text-xs text-gray-500 mt-1.5 italic pl-2 border-l-2 border-gray-300">
                              {checkins[member.id].message}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-600">{checkinInfo.time || ''}</td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            checkinInfo.status === '已簽到' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {checkinInfo.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 行動裝置卡片式顯示 */}
            <div className="md:hidden space-y-3">
              {sortedMembers.map((member) => {
                const checkinInfo = getCheckinStatus(member.id)
                return (
                  <div
                    key={member.id}
                    className={`bg-white rounded-lg border-2 shadow-md p-4 ${
                      checkinInfo.isPresent 
                        ? 'border-green-300 bg-gradient-to-br from-green-50/50 to-emerald-50/30' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-600">#{member.id}</span>
                          <span className="text-base font-bold text-gray-900">{member.name}</span>
                        </div>
                        {member.profession && (
                          <p className="text-sm text-gray-600 mb-2">{member.profession}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        checkinInfo.status === '已簽到' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {checkinInfo.status}
                      </span>
                    </div>
                    {checkinInfo.time && (
                      <p className="text-xs text-gray-500 mb-2">⏰ {checkinInfo.time}</p>
                    )}
                    {checkins[member.id]?.message && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 italic">💬 {checkins[member.id].message}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>


        {/* Footer - 優雅設計 */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            本系統由 <strong className="text-gray-700 font-semibold">華地產資訊長 蔡濬瑒</strong> 開發 
            <span className="text-indigo-600 font-medium"> v4.5.1</span>
          </p>
        </div>
      </div>
    </div>
  )
}
