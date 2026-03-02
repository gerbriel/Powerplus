/**
 * LeadsPage — standalone page for the org's leads / intake form submissions CRM.
 * Extracted from AdminPage > Leads tab so it lives in the main sidebar.
 */
import { UserCheck } from 'lucide-react'
import { LeadsTab } from './AdminPage'

export function LeadsPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-purple-400" /> Leads
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Review intake form submissions, track applicants through your pipeline, and onboard new athletes.
        </p>
      </div>
      <LeadsTab />
    </div>
  )
}
