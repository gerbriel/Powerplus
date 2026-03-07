/**
 * MessagingPage — full-featured messaging with channels + DMs.
 * - Channel CRUD (create, edit, delete) — all roles can create; admin/head coach see ALL channels
 * - Direct messages between org members
 * - Message types: text, image, video, GIF (via GIPHY search)
 * - Font styling: bold, italic, underline via toolbar + markdown shortcuts
 * - Reactions with full emoji set + toggle
 * - Edit / delete own messages
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Send, Hash, MessageSquare, Plus, Smile, Pin, X,
  Edit2, Trash2, Check, Bold, Italic, Underline,
  Image as ImageIcon, Video, Search, Lock, Globe, Volume2,
  MoreHorizontal, UserPlus, Film, Users, Eye,
} from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { cn, formatRelativeTime } from '../lib/utils'
import { useAuthStore, useOrgStore, useMessagingStore } from '../lib/store'

// ── Emoji sets ────────────────────────────────────────────────────────────────
const QUICK_REACTIONS = ['👍','❤️','🔥','🎉','💪','✅']
const EMOJI_CATEGORIES = {
  'Reactions': ['👍','👎','❤️','🔥','🎉','💪','✅','😂','😮','😢','🙏','⚡','🏆','💯','🫡','👀','🤝','💥','🎯','⭐'],
  'Sports':    ['🏋️','🥇','🥈','🥉','🏅','🎽','💪','🦵','🤸','⚡','🏆','🎯','🔝','💯'],
  'Food':      ['🥩','🥗','🍳','🥦','🍎','💊','💧','🥛','🍗','🥚','🫐','🍌'],
  'Nature':    ['🌟','⭐','🌙','☀️','🌊','💨','🌿','🔥','❄️','🌈'],
}

// ── Giphy fetch (key from env — set VITE_GIPHY_KEY in .env) ─────────────────
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || ''
async function searchGiphy(query, limit = 12) {
  if (!GIPHY_KEY) return []
  try {
    const res  = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`)
    const data = await res.json()
    return data.data?.map((g) => ({ id: g.id, url: g.images.fixed_height_small.url, original: g.images.original.url, title: g.title })) || []
  } catch { return [] }
}
async function trendingGiphy(limit = 12) {
  if (!GIPHY_KEY) return []
  try {
    const res  = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g`)
    const data = await res.json()
    return data.data?.map((g) => ({ id: g.id, url: g.images.fixed_height_small.url, original: g.images.original.url, title: g.title })) || []
  } catch { return [] }
}

// ── Inline markdown renderer (bold / italic / underline) ─────────────────────
function splitByPattern(parts, regex, tag) {
  const result = []
  for (const part of parts) {
    if (part[tag]) { result.push(part); continue }
    const text = part.text
    let last = 0; let m
    const re = new RegExp(regex.source, regex.flags)
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) result.push({ ...part, text: text.slice(last, m.index) })
      result.push({ ...part, text: m[1], [tag]: true })
      last = m.index + m[0].length
    }
    if (last < text.length) result.push({ ...part, text: text.slice(last) })
    else if (last === 0) result.push(part)
  }
  return result.filter((p) => p.text.length > 0)
}
function renderFormatted(content, fmt) {
  if (!content) return null
  let parts = [{ text: content }]
  parts = splitByPattern(parts, /\*\*(.+?)\*\*/g, 'bold')
  parts = splitByPattern(parts, /__(.+?)__/g, 'underline')
  parts = splitByPattern(parts, /_(.+?)_/g, 'italic')
  return parts.map((p, i) => (
    <span key={i} style={{ fontWeight: (p.bold || fmt?.bold) ? 'bold' : undefined, fontStyle: (p.italic || fmt?.italic) ? 'italic' : undefined, textDecoration: (p.underline || fmt?.underline) ? 'underline' : undefined }}>{p.text}</span>
  ))
}

function roleBadge(r) {
  return { admin: 'purple', coach: 'blue', nutritionist: 'green', athlete: 'yellow', super_admin: 'red' }[r] || 'default'
}

// ─────────────────────────────────────────────────────────────────────────────
export function MessagingPage() {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { orgs }                         = useOrgStore()
  const {
    channels, messagesByThread, directMessages,
    initMessaging, createChannel, updateChannel, deleteChannel,
    sendMessage, editMessage, deleteMessage, reactToMessage,
    pinMessage, uploadFile,
    openDM, openGroupMessage, markRead, loadMessages,
  } = useMessagingStore()

  const org    = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const orgId  = org?.id
  const role   = profile?.role || 'athlete'
  const isAdmin = role === 'admin' || role === 'super_admin'
  const userId = profile?.id
  const members = org?.members || []

  const [activeThread, setActiveThread] = useState(null)
  const [threadType, setThreadType]     = useState('channel')

  const [createCh, setCreateCh]         = useState(false)
  const [editCh, setEditCh]             = useState(null)
  const [deleteCh, setDeleteCh]         = useState(null)
  const [newDMOpen, setNewDMOpen]       = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [membersOpen, setMembersOpen]   = useState(false)

  useEffect(() => {
    if (userId && orgId) initMessaging(isDemo, orgId, userId)
  }, [userId, orgId, isDemo]) // eslint-disable-line

  useEffect(() => {
    if (!activeThread && channels.length > 0) {
      const firstId = channels[0].id
      setActiveThread(firstId)
      setThreadType('channel')
      loadMessages(firstId)
    }
  }, [channels.length]) // eslint-disable-line

  // Admin/head coach see all channels; others see public + channels they belong to
  const visibleChannels = useMemo(() => {
    if (isAdmin) return channels.filter((ch) => !orgId || ch.org_id === orgId || !ch.org_id)
    return channels.filter((ch) =>
      ch.type === 'public' || ch.type === 'announcement' ||
      ch.members?.includes(userId) || ch.members?.includes('all')
    )
  }, [channels, isAdmin, orgId, userId])

  // Admins see ALL DMs and group messages (observer mode); others see only their own
  const visibleDMs     = useMemo(() => directMessages.filter((dm) =>
    dm.type !== 'group' && (isAdmin || dm.participants.includes(userId))
  ), [directMessages, isAdmin, userId])

  const visibleGroups  = useMemo(() => directMessages.filter((dm) =>
    dm.type === 'group' && (isAdmin || dm.participants.includes(userId))
  ), [directMessages, isAdmin, userId])

  const activeChannel = visibleChannels.find((ch) => ch.id === activeThread)
  const activeDM      = directMessages.find((dm) => dm.id === activeThread)

  // Is the current user an observer (admin viewing a thread they're not part of)?
  const isObserver = isAdmin && activeDM && !activeDM.participants.includes(userId)

  function selectChannel(id) { setActiveThread(id); setThreadType('channel'); markRead(id, userId); loadMessages(id) }
  function selectDM(id) { setActiveThread(id); setThreadType('dm'); markRead(id, userId); loadMessages(id) }

  async function handleCreateChannel(data) {
    const allOrgMemberIds = members.map(m => m.id || m.user_id).filter(Boolean)
    const id = await createChannel({ ...data, createdBy: userId, orgId, allOrgMemberIds })
    setCreateCh(false)
    if (id) { setActiveThread(id); setThreadType('channel'); }
  }
  async function handleOpenDM(tId, tName, tRole) {
    const id = await openDM(userId, tId, tName, tRole, orgId)
    setNewDMOpen(false); if (id) { setActiveThread(id); setThreadType('dm'); loadMessages(id) }
  }
  async function handleOpenGroup(participantIds, groupName) {
    const id = await openGroupMessage(userId, participantIds, groupName, orgId)
    setNewGroupOpen(false); if (id) { setActiveThread(id); setThreadType('dm'); loadMessages(id) }
  }

  const [sidebarSearch, setSidebarSearch] = useState('')

  const filteredChannels = useMemo(() =>
    sidebarSearch
      ? visibleChannels.filter((ch) => ch.name?.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : visibleChannels
  , [visibleChannels, sidebarSearch])

  const filteredDMs = useMemo(() =>
    sidebarSearch
      ? visibleDMs.filter((dm) => dm.display_name?.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : visibleDMs
  , [visibleDMs, sidebarSearch])

  const filteredGroups = useMemo(() =>
    sidebarSearch
      ? visibleGroups.filter((gm) => gm.display_name?.toLowerCase().includes(sidebarSearch.toLowerCase()))
      : visibleGroups
  , [visibleGroups, sidebarSearch])

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-zinc-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col hidden md:flex">
        <div className="h-14 px-4 flex items-center border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm font-bold text-zinc-100 truncate">{org?.name || 'Messages'}</span>
        </div>
        {/* Sidebar search */}
        <div className="px-3 py-2 border-b border-zinc-800/60 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search channels & DMs…"
              className="w-full bg-zinc-800/60 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/60 focus:border-purple-500/60"
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Channels */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Channels</span>
              <button onClick={() => setCreateCh(true)} className="p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors" title="Create channel">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {filteredChannels.length === 0 && <p className="px-3 text-xs text-zinc-600 italic">{sidebarSearch ? 'No matches' : 'No channels yet'}</p>}
            {filteredChannels.map((ch) => (
              <SidebarChannelItem
                key={ch.id}
                channel={ch}
                active={activeThread === ch.id}
                isAdmin={isAdmin}
                onSelect={() => selectChannel(ch.id)}
                onEdit={() => setEditCh(ch)}
                onDelete={() => setDeleteCh(ch)}
              />
            ))}
          </div>
          {/* DMs */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Direct Messages</span>
              <button onClick={() => setNewDMOpen(true)} className="p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors" title="New DM">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {filteredDMs.length === 0 && <p className="px-3 text-xs text-zinc-600 italic">{sidebarSearch ? 'No matches' : 'No DMs yet'}</p>}
            {filteredDMs.map((dm) => {
              const unread    = dm.unread?.[userId] || 0
              const isObs     = isAdmin && !dm.participants.includes(userId)
              return (
                <button key={dm.id} onClick={() => selectDM(dm.id)} className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-0.5 text-sm transition-colors', activeThread === dm.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800')}>
                  <div className="relative flex-shrink-0">
                    <Avatar name={dm.display_name} role={dm.display_role} size="xs" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-zinc-900" />
                  </div>
                  <span className="truncate flex-1 text-left">{dm.display_name}</span>
                  {isObs && <Eye className="w-3 h-3 text-purple-400 flex-shrink-0" title="Admin observer" />}
                  {unread > 0 && <span className="w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unread}</span>}
                </button>
              )
            })}
          </div>

          {/* Group Messages */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Group Messages</span>
              <button onClick={() => setNewGroupOpen(true)} className="p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors" title="New group">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {filteredGroups.length === 0 && <p className="px-3 text-xs text-zinc-600 italic">{sidebarSearch ? 'No matches' : 'No groups yet'}</p>}
            {filteredGroups.map((gm) => {
              const unread = gm.unread?.[userId] || 0
              const isObs  = isAdmin && !gm.participants.includes(userId)
              return (
                <button key={gm.id} onClick={() => selectDM(gm.id)} className={cn('w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg mx-0.5 text-sm transition-colors', activeThread === gm.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800')}>
                  <div className="relative flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                  <span className="truncate flex-1 text-left">{gm.display_name}</span>
                  {isObs && <Eye className="w-3 h-3 text-purple-400 flex-shrink-0" title="Admin observer" />}
                  {unread > 0 && <span className="w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unread}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      {activeThread ? (
        <ChatArea
          key={activeThread}
          threadId={activeThread}
          threadType={threadType}
          channel={activeChannel}
          dm={activeDM}
          messages={messagesByThread[activeThread] || []}
          profile={profile}
          isAdmin={isAdmin}
          isObserver={isObserver}
          orgMembers={members}
          onSend={(payload) => sendMessage(activeThread, { ...payload, senderId: userId, senderName: profile?.full_name || 'You', senderRole: role })}
          onEdit={(msgId, c) => editMessage(activeThread, msgId, c)}
          onDelete={(msgId) => deleteMessage(activeThread, msgId)}
          onReact={(msgId, emoji) => reactToMessage(activeThread, msgId, emoji, userId)}
          onPin={(msgId) => pinMessage(activeThread, msgId)}
          onUploadFile={(file) => uploadFile(file, orgId, userId)}
          onOpenMembers={() => setMembersOpen(true)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-zinc-700" />
            <p className="text-sm text-zinc-600">Select a channel or DM</p>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {createCh && <ChannelFormModal title="Create Channel" onClose={() => setCreateCh(false)} onSave={handleCreateChannel} members={members} userId={userId} />}
      {editCh && <ChannelFormModal title="Edit Channel" initial={editCh} onClose={() => setEditCh(null)} onSave={(d) => { updateChannel(editCh.id, d); setEditCh(null) }} members={members} userId={userId} />}
      {deleteCh && (
        <Modal open onClose={() => setDeleteCh(null)} title="Delete Channel" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Delete <strong className="text-zinc-200">#{deleteCh.name}</strong>? All messages will be permanently removed.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteCh(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => { deleteChannel(deleteCh.id); setDeleteCh(null); if (activeThread === deleteCh.id) setActiveThread(null) }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {newDMOpen && <NewDMModal members={members.filter((m) => m.user_id !== userId)} onClose={() => setNewDMOpen(false)} onSelect={handleOpenDM} />}
      {newGroupOpen && <NewGroupModal members={members.filter((m) => m.user_id !== userId)} onClose={() => setNewGroupOpen(false)} onSave={handleOpenGroup} />}
      {membersOpen && activeChannel && <MemberListModal channel={activeChannel} members={members} onClose={() => setMembersOpen(false)} />}
    </div>
  )
}

// ── Sidebar channel row ───────────────────────────────────────────────────────
function SidebarChannelItem({ channel, active, isAdmin, onSelect, onEdit, onDelete }) {
  const [menu, setMenu] = useState(false)
  const Icon = channel.type === 'private' ? Lock : channel.type === 'announcement' ? Volume2 : Hash
  return (
    <div className="relative group">
      <button onClick={onSelect} className={cn('w-full flex items-center justify-between px-3 py-1.5 rounded-lg mx-0.5 text-sm transition-colors', active ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800')}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
          <span className="truncate">{channel.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {(channel.unread || 0) > 0 && <span className="w-4 h-4 bg-purple-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{channel.unread}</span>}
          {isAdmin && <button onClick={(e) => { e.stopPropagation(); setMenu((p) => !p) }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-600 transition-all"><MoreHorizontal className="w-3 h-3" /></button>}
        </div>
      </button>
      {menu && (
        <div className="absolute right-2 top-full mt-0.5 w-36 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 py-1 text-sm" onMouseLeave={() => setMenu(false)}>
          <button onClick={() => { onEdit(); setMenu(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-colors"><Edit2 className="w-3 h-3" /> Edit</button>
          <button onClick={() => { onDelete(); setMenu(false) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-zinc-700 transition-colors"><Trash2 className="w-3 h-3" /> Delete</button>
        </div>
      )}
    </div>
  )
}

// ── Chat area ─────────────────────────────────────────────────────────────────
function ChatArea({ threadId, threadType, channel, dm, messages, profile, isAdmin, isObserver, orgMembers, onSend, onEdit, onDelete, onReact, onPin, onUploadFile, onOpenMembers }) {
  const endRef       = useRef(null)
  const fileImgRef   = useRef(null)
  const fileVidRef   = useRef(null)

  const [text, setText]             = useState('')
  const [fmt, setFmt]               = useState({ bold: false, italic: false, underline: false })
  const [showEmoji, setShowEmoji]   = useState(false)
  const [showGiphy, setShowGiphy]   = useState(false)
  const [emojiFor, setEmojiFor]     = useState(null)
  const [editId, setEditId]         = useState(null)
  const [editText, setEditText]     = useState('')
  const [msgSearch, setMsgSearch]   = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const isGroup     = dm?.type === 'group'
  const displayName = channel
    ? `#${channel.name}`
    : isGroup
      ? dm?.display_name || 'Group'
      : dm?.display_name || 'DM'
  const description  = channel?.description || (isGroup ? `${dm?.participants?.length || 0} members` : '')

  // Resolve participant names for group header
  const groupParticipants = useMemo(() => {
    if (!isGroup || !dm) return []
    return dm.participants.map((pid) => orgMembers?.find((m) => m.user_id === pid)).filter(Boolean)
  }, [isGroup, dm, orgMembers])

  function send() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ content: trimmed, type: 'text', formatting: { ...fmt } })
    setText(''); setFmt({ bold: false, italic: false, underline: false }); setShowEmoji(false)
  }

  function handleGif(gif) { onSend({ content: gif.title || 'GIF', type: 'gif', gifUrl: gif.original }); setShowGiphy(false) }

  async function handleFile(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    const mediaUrl = await (onUploadFile ? onUploadFile(file) : Promise.resolve(URL.createObjectURL(file)))
    onSend({ content: file.name, type, mediaUrl })
    e.target.value = ''
  }

  function applyFmt(tag) {
    const ta = document.getElementById(`msg-${threadId}`)
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      const s = ta.selectionStart, e2 = ta.selectionEnd
      const m = { bold: '**', italic: '_', underline: '__' }[tag]
      setText(text.slice(0, s) + m + text.slice(s, e2) + m + text.slice(e2))
    } else {
      setFmt((p) => ({ ...p, [tag]: !p[tag] }))
    }
  }

  const pinnedMsgs = messages.filter((m) => m.is_pinned)

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
      {/* Header */}
      <div className="h-14 bg-zinc-900/90 border-b border-zinc-800 flex items-center px-4 gap-3 flex-shrink-0">
        {channel
          ? (channel.type === 'private' ? <Lock className="w-4 h-4 text-zinc-400" /> : channel.type === 'announcement' ? <Volume2 className="w-4 h-4 text-zinc-400" /> : <Hash className="w-4 h-4 text-zinc-400" />)
          : isGroup
            ? <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0"><Users className="w-3.5 h-3.5 text-white" /></div>
            : <MessageSquare className="w-4 h-4 text-zinc-400" />
        }
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-zinc-200 text-sm">{displayName}</span>
          {description && <span className="text-xs text-zinc-500 ml-2 hidden sm:inline">{description}</span>}
          {/* Group: show participant avatar stack */}
          {isGroup && groupParticipants.length > 0 && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {groupParticipants.slice(0, 5).map((m) => (
                <div key={m.user_id} title={m.full_name} className="w-4 h-4 rounded-full border border-zinc-900">
                  <Avatar name={m.full_name} role={m.org_role} size="xs" />
                </div>
              ))}
              {groupParticipants.length > 5 && <span className="text-[10px] text-zinc-500 ml-1">+{groupParticipants.length - 5}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {pinnedMsgs.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Pin className="w-3 h-3" /> {pinnedMsgs.length} pinned
            </span>
          )}
          {isObserver && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg font-medium">
              <Eye className="w-3.5 h-3.5" /> Admin view
            </span>
          )}
          <button
            onClick={() => { setShowMsgSearch((p) => !p); setMsgSearch('') }}
            className={cn('p-1.5 rounded-lg transition-colors', showMsgSearch ? 'text-purple-400 bg-purple-500/15' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800')}
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>
          {channel && <button onClick={onOpenMembers} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors" title="Members"><UserPlus className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Message search bar */}
      {showMsgSearch && (
        <div className="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center gap-2 flex-shrink-0">
          <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input
            autoFocus
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
          />
          {msgSearch && (
            <span className="text-xs text-zinc-500">
              {messages.filter((m) => m.content?.toLowerCase().includes(msgSearch.toLowerCase())).length} result(s)
            </span>
          )}
          <button onClick={() => { setShowMsgSearch(false); setMsgSearch('') }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Observer notice bar */}
      {isObserver && (
        <div className="px-4 py-2 bg-purple-500/5 border-b border-purple-500/10 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <p className="text-xs text-purple-300">You're viewing this conversation as an admin. Messages are read-only.</p>
        </div>
      )}

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-2">
            {channel ? <Hash className="w-8 h-8 opacity-30" /> : isGroup ? <Users className="w-8 h-8 opacity-30" /> : <MessageSquare className="w-8 h-8 opacity-30" />}
            <p className="text-sm">Start of {displayName}</p>
          </div>
        )}
        {(msgSearch
          ? messages.filter((m) => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
          : messages
        ).map((msg, i) => {
          const allMsgs = msgSearch ? messages.filter((m) => m.content?.toLowerCase().includes(msgSearch.toLowerCase())) : messages
          const prev    = allMsgs[i - 1]
          const grouped = !msgSearch && prev?.sender?.id === msg.sender.id && (new Date(msg.timestamp) - new Date(prev.timestamp)) < 300000
          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.sender.id === profile?.id}
              grouped={grouped}
              isPinned={!!msg.is_pinned}
              isEditing={editId === msg.id}
              editText={editText}
              onEditChange={setEditText}
              onCommitEdit={() => { if (editText.trim()) onEdit(editId, editText.trim()); setEditId(null) }}
              onCancelEdit={() => setEditId(null)}
              onEdit={() => { setEditId(msg.id); setEditText(msg.content) }}
              onDelete={() => onDelete(msg.id)}
              onPin={() => onPin?.(msg.id)}
              onReact={(emoji) => onReact(msg.id, emoji)}
              emojiFor={emojiFor}
              setEmojiFor={setEmojiFor}
              userId={profile?.id}
              isObserver={isObserver}
              highlight={msgSearch || ''}
            />
          )
        })}
        {msgSearch && messages.filter((m) => m.content?.toLowerCase().includes(msgSearch.toLowerCase())).length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-2">
            <Search className="w-6 h-6 opacity-40" />
            <p className="text-sm">No messages match "{msgSearch}"</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area — hidden for observers */}
      {!isObserver && (
        <>
          {/* Giphy picker */}
          {showGiphy && <GiphyPicker onSelect={handleGif} onClose={() => setShowGiphy(false)} />}

          {/* Emoji insert picker */}
          {showEmoji && (
            <div className="mx-4 mb-1 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-20">
              {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                <div key={cat} className="mb-2">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((e) => (
                      <button key={e} onClick={() => { setText((p) => p + e); setShowEmoji(false) }} className="text-lg hover:scale-125 transition-transform leading-none p-0.5">{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formatting toolbar + attachment buttons */}
          <div className="px-4 pt-2 flex items-center gap-1 flex-shrink-0">
            {[['bold', Bold, 'Bold (**text**)'], ['italic', Italic, 'Italic (_text_)'], ['underline', Underline, 'Underline (__text__)']].map(([tag, Icon, title]) => (
              <button key={tag} title={title} onClick={() => applyFmt(tag)} className={cn('p-1.5 rounded-lg text-xs transition-colors', fmt[tag] ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
            <div className="h-4 w-px bg-zinc-700 mx-1" />
            <button onClick={() => { setShowEmoji((p) => !p); setShowGiphy(false) }} className={cn('p-1.5 rounded-lg transition-colors', showEmoji ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')} title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setShowGiphy((p) => !p); setShowEmoji(false) }} className={cn('p-1.5 rounded-lg transition-colors', showGiphy ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')} title="GIF"><Film className="w-3.5 h-3.5" /></button>
            <button onClick={() => fileImgRef.current?.click()} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors" title="Image"><ImageIcon className="w-3.5 h-3.5" /></button>
            <button onClick={() => fileVidRef.current?.click()} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors" title="Video"><Video className="w-3.5 h-3.5" /></button>
            <input ref={fileImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, 'image')} />
            <input ref={fileVidRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e, 'video')} />
          </div>

          {/* Input */}
          <div className="p-4 pt-2 border-t border-zinc-800 flex-shrink-0">
            <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-zinc-500 transition-colors">
              <textarea
                id={`msg-${threadId}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } if (e.key === 'Escape') { setShowEmoji(false); setShowGiphy(false) } }}
                placeholder={`Message ${displayName}`}
                rows={1}
                style={{ fontWeight: fmt.bold ? 'bold' : 'normal', fontStyle: fmt.italic ? 'italic' : 'normal', textDecoration: fmt.underline ? 'underline' : 'none' }}
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none max-h-40"
              />
              <button onClick={send} disabled={!text.trim()} className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-white transition-colors mb-0.5 flex-shrink-0">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1 px-1">Enter to send · Shift+Enter for new line · **bold** · _italic_ · __underline__</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, grouped, isPinned, isEditing, editText, onEditChange, onCommitEdit, onCancelEdit, onEdit, onDelete, onPin, onReact, emojiFor, setEmojiFor, userId, isObserver }) {
  return (
    <div className={cn('group relative flex items-start gap-3 px-2 py-1 rounded-xl hover:bg-zinc-900/60 transition-colors', isPinned && 'bg-yellow-500/5 border-l-2 border-yellow-500/30 pl-3')}>
      {!grouped ? <Avatar name={msg.sender.name} role={msg.sender.role} size="sm" className="flex-shrink-0 mt-0.5" /> : <div className="w-8 flex-shrink-0" />}

      <div className="flex-1 min-w-0 pr-24">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">{msg.sender.name}</span>
            <Badge color={roleBadge(msg.sender.role)} className="text-[10px]">{msg.sender.role}</Badge>
            <span className="text-xs text-zinc-600">{formatRelativeTime(msg.timestamp)}</span>
            {msg.edited && <span className="text-[10px] text-zinc-600 italic">(edited)</span>}
            {isPinned && <span className="text-[10px] text-yellow-500">📌 pinned</span>}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-1.5">
            <textarea value={editText} onChange={(e) => onEditChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCommitEdit() } if (e.key === 'Escape') onCancelEdit() }} autoFocus rows={2} className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
            <div className="flex gap-2 text-xs">
              <button onClick={onCommitEdit} className="text-green-400 hover:text-green-300 flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
              <button onClick={onCancelEdit} className="text-zinc-500 hover:text-zinc-400 flex items-center gap-1"><X className="w-3 h-3" /> Cancel</button>
            </div>
          </div>
        ) : msg.type === 'gif' ? (
          <div className="mt-1">
            <img src={msg.gifUrl} alt={msg.content} className="max-w-xs rounded-xl border border-zinc-800" loading="lazy" />
            <p className="text-[10px] text-zinc-600 mt-0.5">via GIPHY</p>
          </div>
        ) : msg.type === 'image' ? (
          <div className="mt-1">
            <img src={msg.mediaUrl} alt={msg.content} className="max-w-sm rounded-xl border border-zinc-800 cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" onClick={() => window.open(msg.mediaUrl, '_blank')} />
            <p className="text-xs text-zinc-500 mt-0.5">{msg.content}</p>
          </div>
        ) : msg.type === 'video' ? (
          <div className="mt-1">
            <video src={msg.mediaUrl} controls className="max-w-sm rounded-xl border border-zinc-800" style={{ maxHeight: 280 }} />
            <p className="text-xs text-zinc-500 mt-0.5">{msg.content}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-300 leading-relaxed break-words">{renderFormatted(msg.content, msg.formatting)}</p>
        )}

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {msg.reactions.map((r) => (
              <button key={r.emoji} onClick={() => onReact(r.emoji)} title={`${r.count} reaction${r.count !== 1 ? 's' : ''}`} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border', r.reactors?.includes(userId) ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-700')}>
                <span>{r.emoji}</span><span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action bar — hidden for admin observers */}
      {!isObserver && (
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1 flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-xl px-1.5 py-1 shadow-lg z-10">
        {QUICK_REACTIONS.map((e) => (
          <button key={e} onClick={() => onReact(e)} className="text-sm hover:scale-125 transition-transform leading-none px-0.5">{e}</button>
        ))}
        <div className="w-px h-4 bg-zinc-700 mx-0.5" />
        <div className="relative">
          <button onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg" title="More reactions"><Smile className="w-3.5 h-3.5" /></button>
          {emojiFor === msg.id && (
            <div className="absolute right-0 bottom-full mb-1 w-64 p-2 bg-zinc-800 border border-zinc-700 rounded-xl z-30 shadow-2xl">
              {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                <div key={cat} className="mb-1.5">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{cat}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {emojis.map((e) => <button key={e} onClick={() => { onReact(e); setEmojiFor(null) }} className="text-base hover:scale-125 transition-transform p-0.5 leading-none">{e}</button>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button onClick={onPin} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg" title={isPinned ? 'Unpin' : 'Pin'}><Pin className="w-3.5 h-3.5" /></button>
        {isOwn && <>
          <button onClick={onEdit} className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1 text-red-500 hover:text-red-400 hover:bg-zinc-700 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </>}
      </div>
      )}
    </div>
  )
}

// ── Giphy picker ──────────────────────────────────────────────────────────────
function GiphyPicker({ onSelect, onClose }) {
  const [query, setQuery]   = useState('')
  const [gifs, setGifs]     = useState([])
  const [loading, setLoad]  = useState(true)
  const timer               = useRef(null)

  useEffect(() => {
    trendingGiphy(12).then((data) => { setGifs(data); setLoad(false) })
  }, [])

  useEffect(() => {
    clearTimeout(timer.current)
    if (!query.trim()) {
      setLoad(true); trendingGiphy(12).then((d) => { setGifs(d); setLoad(false) }); return
    }
    setLoad(true)
    timer.current = setTimeout(() => searchGiphy(query, 12).then((d) => { setGifs(d); setLoad(false) }), 400)
    return () => clearTimeout(timer.current)
  }, [query])

  return (
    <div className="mx-4 mb-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-20 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700">
        <Search className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GIPHY…" className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none" />
        <button onClick={onClose} className="p-0.5 text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="p-2 h-52 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Loading…</div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No GIFs found</div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {gifs.map((gif) => (
              <button key={gif.id} onClick={() => onSelect(gif)} className="rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all aspect-video bg-zinc-900">
                <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-zinc-700 flex justify-end">
        <span className="text-[10px] text-zinc-600">Powered by GIPHY</span>
      </div>
    </div>
  )
}

// ── Channel form modal (create + edit) ────────────────────────────────────────
function ChannelFormModal({ title, initial, onClose, onSave, members, userId }) {
  const [name, setName]     = useState(initial?.name || '')
  const [desc, setDesc]     = useState(initial?.description || '')
  const [type, setType]     = useState(initial?.type || 'public')
  const [sel, setSel]       = useState(initial?.members?.filter((m) => m !== 'all') || [])

  const toggle = (uid) => setSel((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Channel Name *</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} placeholder="e.g. meet-prep-spring" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this channel for?" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'public',       label: 'Public',   Icon: Globe,    desc: 'All members' },
              { id: 'private',      label: 'Private',  Icon: Lock,     desc: 'Invite-only' },
              { id: 'announcement', label: 'Announce', Icon: Volume2,  desc: 'Read-only' },
            ].map(({ id, label, Icon, desc: d }) => (
              <button key={id} onClick={() => setType(id)} className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all', type === id ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600')}>
                <Icon className="w-4 h-4" /><span className="font-medium">{label}</span><span className="text-zinc-500 text-[10px]">{d}</span>
              </button>
            ))}
          </div>
        </div>
        {type === 'private' && members.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Add Members</label>
            <div className="max-h-40 overflow-y-auto space-y-0.5 border border-zinc-700 rounded-xl p-2 bg-zinc-800/50">
              {members.map((m) => (
                <label key={m.user_id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={sel.includes(m.user_id)} onChange={() => toggle(m.user_id)} className="accent-purple-500" />
                  <Avatar name={m.full_name} role={m.org_role} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 truncate">{m.full_name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{m.org_role}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim()} onClick={() => onSave({ name, description: desc, type, members: type === 'private' ? [...sel, userId] : ['all'] })}>
            <Check className="w-3.5 h-3.5" /> {initial ? 'Save Changes' : 'Create Channel'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── New DM picker ─────────────────────────────────────────────────────────────
function NewDMModal({ members, onClose, onSelect }) {
  const [q, setQ] = useState('')
  const filtered  = members.filter((m) => !q || m.full_name?.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal open onClose={onClose} title="New Direct Message" size="sm">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No members found</p>}
          {filtered.map((m) => (
            <button key={m.user_id} onClick={() => onSelect(m.user_id, m.full_name, m.org_role)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
              <Avatar name={m.full_name} role={m.org_role} size="sm" />
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-200">{m.full_name}</p>
                <p className="text-xs text-zinc-500 capitalize">{m.org_role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ── New Group Message modal ───────────────────────────────────────────────────
function NewGroupModal({ members, onClose, onSave }) {
  const [q, setQ]         = useState('')
  const [name, setName]   = useState('')
  const [sel, setSel]     = useState([])
  const toggle = (uid) => setSel((p) => p.includes(uid) ? p.filter((id) => id !== uid) : [...p, uid])
  const filtered = members.filter((m) => !q || m.full_name?.toLowerCase().includes(q.toLowerCase()))

  return (
    <Modal open onClose={onClose} title="New Group Message" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Group Name *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint Group, Nutrition Team…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Add Members <span className="text-zinc-600 font-normal">({sel.length} selected)</span>
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          {sel.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sel.map((uid) => {
                const m = members.find((x) => x.user_id === uid)
                if (!m) return null
                return (
                  <span key={uid} className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300">
                    {m.full_name}
                    <button onClick={() => toggle(uid)} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                )
              })}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto space-y-0.5 border border-zinc-700 rounded-xl p-2 bg-zinc-800/50">
            {filtered.length === 0 && <p className="text-sm text-zinc-500 text-center py-3">No members found</p>}
            {filtered.map((m) => (
              <label key={m.user_id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-700/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={sel.includes(m.user_id)} onChange={() => toggle(m.user_id)} className="accent-purple-500" />
                <Avatar name={m.full_name} role={m.org_role} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-200 truncate">{m.full_name}</p>
                  <p className="text-[10px] text-zinc-500 capitalize">{m.org_role}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || sel.length < 1} onClick={() => onSave(sel, name.trim())}>
            <Users className="w-3.5 h-3.5" /> Create Group
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Member list modal ─────────────────────────────────────────────────────────
function MemberListModal({ channel, members, onClose }) {
  const list = channel.members?.includes('all')
    ? members
    : members.filter((m) => channel.members?.includes(m.user_id))
  return (
    <Modal open onClose={onClose} title={`#${channel.name} — Members`} size="sm">
      <div className="max-h-80 overflow-y-auto space-y-1">
        {list.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No members</p>}
        {list.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <Avatar name={m.full_name} role={m.org_role} size="sm" />
            <div>
              <p className="text-sm font-medium text-zinc-200">{m.full_name}</p>
              <p className="text-xs text-zinc-500 capitalize">{m.org_role}</p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
