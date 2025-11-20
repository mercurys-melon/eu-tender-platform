'use client'

export default function ErrorPage({ error }: { error: Error }) {
  console.error(error)

  return (
    <div className="p-6 text-red-600 font-bold bg-white rounded-xl">
      ⚠ Der opstod en fejl: {error.message}
    </div>
  )
}
