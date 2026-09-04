import { useCallback, useEffect, useState } from 'react'
import {
  fetchTasks,
  fetchJobs,
  fetchModules,
  fetchWorkbenchSummary,
  type ApiError,
} from '@/lib/api-client'
import {
  adaptJob,
  adaptModule,
  adaptTask,
  aggregateProjects,
  adaptWorkbenchSummaryToAnnouncements,
} from '@/lib/workbench-adapters'
import type { Job, Service, Project, PlanCard, Announcement } from '../types'

interface UseWorkbenchDataOptions {
  onDataLoaded?: (counts: { tasks: number; jobs: number; modules: number }) => void
  onError?: (message: string) => void
}

interface UseWorkbenchDataReturn {
  jobs: Job[]
  services: Service[]
  projects: Project[]
  plan: PlanCard[]
  announcements: Announcement[]
  loading: boolean
  error: string | undefined
  refetch: () => Promise<void>
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  setServices: React.Dispatch<React.SetStateAction<Service[]>>
  setPlan: React.Dispatch<React.SetStateAction<PlanCard[]>>
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>
}

/**
 * 工作台数据加载 Hook
 * 负责从 API 获取并适配所有工作台核心数据
 */
export function useWorkbenchData({ onDataLoaded, onError }: UseWorkbenchDataOptions = {}): UseWorkbenchDataReturn {
  const [jobs, setJobs] = useState<Job[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [plan, setPlan] = useState<PlanCard[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const [tasksData, jobsData, modulesData, summaryData] = await Promise.all([
        fetchTasks(),
        fetchJobs(),
        fetchModules(),
        fetchWorkbenchSummary(),
      ])
      const nextJobs = jobsData.map(adaptJob)
      setJobs(nextJobs)
      setServices(modulesData.map(adaptModule))
      setPlan(tasksData.map(adaptTask))
      setProjects(aggregateProjects(tasksData, jobsData))
      setAnnouncements(adaptWorkbenchSummaryToAnnouncements(summaryData))
      onDataLoaded?.({ tasks: tasksData.length, jobs: jobsData.length, modules: modulesData.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载工作台数据失败，请重试'
      setError(message)
      onError?.(message)
    } finally {
      setLoading(false)
    }
  }, [onDataLoaded, onError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    jobs,
    services,
    projects,
    plan,
    announcements,
    loading,
    error,
    refetch: loadData,
    setJobs,
    setServices,
    setPlan,
    setAnnouncements,
  }
}
