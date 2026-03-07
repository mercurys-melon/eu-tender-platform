'use client'

import { useState, useEffect } from 'react'
import type { PublicationJob } from '@/lib/publication/types'

interface PublicationButtonProps {
  tenderId: string
  className?: string
}

/**
 * Simple component to trigger publication and show status
 * Can be integrated into any tender management page
 */
export default function PublicationButton({ tenderId, className = '' }: PublicationButtonProps) {
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState<{
    jobId?: string
    status?: string
    message?: string
    errors?: Array<{ field?: string; message: string }>
  } | null>(null)
  const [jobs, setJobs] = useState<PublicationJob[]>([])

  // Fetch publication status on mount
  useEffect(() => {
    fetchPublicationStatus()
  }, [tenderId])

  const fetchPublicationStatus = async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/publish`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        
        // Set latest job as status
        if (data.jobs && data.jobs.length > 0) {
          const latestJob = data.jobs[0]
          setStatus({
            jobId: latestJob.id,
            status: latestJob.status,
            message: latestJob.last_error || 'Status opdateret',
          })
        }
      }
    } catch (error) {
      console.error('Error fetching publication status:', error)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setStatus(null)

    try {
      const response = await fetch(`/api/tenders/${tenderId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus({
          jobId: data.jobId,
          status: data.status,
          message: data.message || 'Publikation startet',
        })
        // Refresh status after a short delay
        setTimeout(() => {
          fetchPublicationStatus()
        }, 1000)
      } else {
        setStatus({
          jobId: data.jobId,
          status: data.status,
          message: data.message || 'Publikation fejlede',
          errors: data.errors,
        })
      }
    } catch (error: any) {
      setStatus({
        message: 'Netværksfejl ved publikation',
        errors: [{ message: error.message || 'Ukendt fejl' }],
      })
    } finally {
      setPublishing(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'processing':
      case 'retrying':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Publiceret'
      case 'failed':
        return 'Fejlet'
      case 'processing':
        return 'Behandler...'
      case 'retrying':
        return 'Forsøger igen...'
      case 'pending':
        return 'Afventer'
      default:
        return 'Ukendt status'
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? 'Publicerer...' : 'Publicer til udbud.dk'}
        </button>

        {status && (
          <div className="flex flex-col gap-1">
            <span className={`font-medium ${getStatusColor(status.status)}`}>
              {getStatusText(status.status)}
            </span>
            {status.message && (
              <span className="text-sm text-gray-600">{status.message}</span>
            )}
            {status.errors && status.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600">Fejl:</p>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {status.errors.map((error, idx) => (
                    <li key={idx}>
                      {error.field && <span className="font-medium">{error.field}: </span>}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {jobs.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Publikationshistorik:</p>
          <div className="space-y-2">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="text-sm border-l-2 pl-2 border-gray-300">
                <span className="font-medium">{getStatusText(job.status)}</span>
                {job.last_error && (
                  <span className="text-red-600 ml-2">- {job.last_error}</span>
                )}
                <span className="text-gray-500 ml-2">
                  ({new Date(job.created_at).toLocaleString('da-DK')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
