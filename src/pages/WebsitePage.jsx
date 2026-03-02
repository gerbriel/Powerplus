/**
 * WebsitePage — standalone page for the org's public website / landing page editor.
 * Extracted from AdminPage > Public Page tab so it lives in the main sidebar.
 */
import { Globe } from 'lucide-react'
import { PublicPageTab } from './AdminPage'

export function WebsitePage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-400" /> Website
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Build and publish your public recruitment page, manage your domain, and customize your org's website.
        </p>
      </div>
      <PublicPageTab />
    </div>
  )
}
