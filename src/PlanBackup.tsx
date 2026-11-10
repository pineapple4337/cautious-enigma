import { useRef, useState, type ChangeEvent } from 'react'

const KEYS = {
  plan: 'nus-degree-plan',
  profile: 'nus-academic-profile',
  utcp: 'nus-utcp-pathway',
  subjectColors: 'nus-subject-colors',
} as const

type Backup = {
  format: 'nus-degree-planner-backup'
  version: 1
  exportedAt: string
  data: { plan: unknown; profile: unknown; utcp: unknown; subjectColors: unknown }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validBackup(value: unknown): value is Backup {
  if (!isObject(value) || value.format !== 'nus-degree-planner-backup' || value.version !== 1 || !isObject(value.data)) return false
  const { plan, profile, utcp, subjectColors } = value.data
  if (!Array.isArray(plan) || !isObject(profile) || !isObject(utcp) || !isObject(subjectColors)) return false
  if (!Number.isInteger(profile.matriculationYear) || typeof profile.primaryMajor !== 'string' || !Array.isArray(profile.minors)) return false
  if (!profile.minors.every(x => typeof x === 'string')) return false
  if (typeof utcp.enrolled !== 'boolean' || !isObject(utcp.courseCodes)) return false
  if (!plan.every(c => isObject(c) && typeof c.code === 'string' && typeof c.title === 'string' &&
      typeof c.semester === 'string' && typeof c.units === 'number' && Number.isFinite(c.units) && c.units > 0 &&
      ['completed', 'current', 'planned'].includes(String(c.status)) && typeof c.suExercised === 'boolean')) return false
  if (!Object.values(subjectColors).every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0)) return false
  return true
}

export function PlanBackup() {
  const picker = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  function exportPlan() {
    try {
      const read = (key: string, fallback: unknown): unknown => {
        const raw = localStorage.getItem(key)
        return raw === null ? fallback : JSON.parse(raw) as unknown
      }
      const backup: Backup = {
        format: 'nus-degree-planner-backup', version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          plan: read(KEYS.plan, []), profile: read(KEYS.profile, {}),
          utcp: read(KEYS.utcp, {}), subjectColors: read(KEYS.subjectColors, {}),
        },
      }
      if (!validBackup(backup)) throw new Error('Current saved data is incomplete. Open the planner and try again.')
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `nus-degree-plan-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Backup downloaded. Keep the JSON file somewhere safe.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export your plan.')
    }
  }

  async function importPlan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('Backup file is too large.')
      const parsed: unknown = JSON.parse(await file.text())
      if (!validBackup(parsed)) throw new Error('Invalid or unsupported NUS Degree Planner backup file.')
      const count = (parsed.data.plan as unknown[]).length
      const confirmImport = window.confirm(
        `Import ${count} courses from this backup? This will REPLACE the current plan, profile, UTCP settings and colours on this website. Export your current plan first if you want to keep it.`
      )
      if (!confirmImport) return
      const values = [
        [KEYS.plan, parsed.data.plan], [KEYS.profile, parsed.data.profile],
        [KEYS.utcp, parsed.data.utcp], [KEYS.subjectColors, parsed.data.subjectColors],
      ] as const
      // Commit all values together; reload so React reads the newly imported state.
      const oldValues = values.map(([key]) => [key, localStorage.getItem(key)] as const)
      try {
        for (const [key, value] of values) localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        for (const [key, previous] of oldValues) {
          if (previous === null) localStorage.removeItem(key)
          else localStorage.setItem(key, previous)
        }
        throw error
      }
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not import this file.')
    }
  }

  return <section className="plan-backup-section">
    <div className="plan-backup-header">
      <div><h2>Save or transfer your plan</h2><p>Move your courses and settings between localhost and GitHub Pages.</p></div>
      <div className="plan-backup-actions">
        <button type="button" onClick={exportPlan}>↓ Export JSON</button>
        <button type="button" onClick={() => picker.current?.click()}>↑ Import JSON</button>
        <input ref={picker} type="file" accept=".json,application/json" hidden onChange={importPlan} aria-label="Choose degree plan backup" />
      </div>
    </div>
    {message && <p className="plan-backup-message" role="status">{message}</p>}
  </section>
}
