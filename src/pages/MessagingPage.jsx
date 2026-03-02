import { useState } from 'react'
import { Send, Hash, MessageSquare, Plus, Smile, Paperclip, Pin, CheckSquare } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { cn, formatRelativeTime } from '../lib/utils'
import { MOCK_CHANNELS, MOCK_DIRECT_MESSAGES, MOCK_MESSAGES } from '../lib/mockData'
import { useAuthStore } from '../lib/store'

const REACTIONS = []

export function MessagingPage() {
  const { profile } = useAuthStore()
  const [activeChannel, setActiveChannel] = useState('ch-1')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [showEmojiFor, setShowEmojiFor] = useState(null)

  const handleSend = () => {
    if (!message.trim()) return
    const newMsg = {
      id: `m${Date.now()}`,
      channel: 'general',
      sender: { id: profile.id, name: profile.full_name, role: profile.role },
      content: message.trim(),
      timestamp: new Date().toISOString(),
      reactions: [],
    }
    setMessages(prev => [...prev, newMsg])
    setMessage('')
  }

  const handleReact = (msgId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m
      const existing = m.reactions.find(r => r.emoji === emoji)
      if (existing) {
        return { ...m, reactions: m.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1 } : r) }
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1 }] }
    }))
    setShowEmojiFor(null)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-200">Messages</span>
          <button className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Channels */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">Channels</p>
            {MOCK_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors',
                  activeChannel === ch.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </div>
                {ch.unread > 0 && (
                  <span className="w-4 h-4 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center font-bold flex-shrink-0">{ch.unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* DMs */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mb-1">Direct Messages</p>
            {MOCK_DIRECT_MESSAGES.map((dm) => (
              <button
                key={dm.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={dm.with} role={dm.role} size="xs" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-zinc-900" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-zinc-300">{dm.with}</span>
                    {dm.unread > 0 && <span className="w-4 h-4 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center font-bold">{dm.unread}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{dm.last_message}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="h-14 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4 gap-3 flex-shrink-0">
          <Hash className="w-4 h-4 text-zinc-400" />
          <span className="font-semibold text-zinc-200">general</span>
          <span className="text-xs text-zinc-500 hidden sm:block">· Team-wide announcements and discussion</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
              <Pin className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.map((msg, i) => {
            const isOwn = msg.sender.id === profile?.id
            const prevMsg = messages[i - 1]
            const sameAuthor = prevMsg?.sender?.id === msg.sender.id &&
              (new Date(msg.timestamp) - new Date(prevMsg.timestamp)) < 300000

            return (
              <div
                key={msg.id}
                className={cn('group flex items-start gap-3 px-2 py-1 rounded-lg hover:bg-zinc-800/40 transition-colors', sameAuthor && 'mt-0.5')}
              >
                {!sameAuthor ? (
                  <Avatar name={msg.sender.name} role={msg.sender.role} size="sm" />
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {!sameAuthor && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-zinc-200">{msg.sender.name}</span>
                      <Badge color={roleBadge(msg.sender.role)}>{msg.sender.role}</Badge>
                      <span className="text-xs text-zinc-500">{formatRelativeTime(msg.timestamp)}</span>
                    </div>
                  )}
                  <p className="text-sm text-zinc-300 leading-relaxed break-words">{msg.content}</p>
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => handleReact(msg.id, r.emoji)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-zinc-700/60 hover:bg-zinc-700 rounded-full text-xs transition-colors"
                        >
                          <span>{r.emoji}</span>
                          <span className="text-zinc-400">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    {showEmojiFor === msg.id && (
                      <div className="absolute right-0 bottom-full mb-1 p-2 bg-zinc-800 border border-zinc-700 rounded-xl flex gap-1 z-10 shadow-xl">
                        {REACTIONS.map((e) => (
                          <button key={e} onClick={() => handleReact(msg.id, e)} className="hover:scale-125 transition-transform text-base px-1">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800 flex-shrink-0">
          <div className="flex items-end gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-zinc-600 transition-colors">
            <button className="p-1 text-zinc-500 hover:text-zinc-300 mb-0.5">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Message #general"
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-white transition-colors mb-0.5"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function roleBadge(role) {
  const map = { admin: 'purple', coach: 'blue', nutritionist: 'green', athlete: 'yellow' }
  return map[role] || 'default'
}
