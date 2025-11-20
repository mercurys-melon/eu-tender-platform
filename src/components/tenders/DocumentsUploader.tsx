'use client'

import { useState, useRef } from 'react'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { validateFile, formatFileSize, getFileIcon } from '@/lib/storage'

interface DocumentsUploaderProps {
  tenderId: string
  onUploadComplete: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export default function DocumentsUploader({ tenderId, onUploadComplete }: DocumentsUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList) => {
    const fileArray = Array.from(files)
    const validFiles: UploadingFile[] = []

    fileArray.forEach(file => {
      const validation = validateFile(file)
      if (validation.valid) {
        validFiles.push({
          file,
          progress: 0,
          status: 'uploading'
        })
      } else {
        alert(`Filen "${file.name}" blev afvist: ${validation.error}`)
      }
    })

    if (validFiles.length > 0) {
      setUploadingFiles(prev => [...prev, ...validFiles])
      uploadFiles(validFiles)
    }
  }

  const uploadFiles = async (files: UploadingFile[]) => {
    for (const uploadFile of files) {
      try {
        const formData = new FormData()
        formData.append('file', uploadFile.file)

        const response = await fetch(`/api/tenders/${tenderId}/documents/upload`, {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Kunne ikke uploade fil')
        }

        // Update progress to 100%
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadFile.file 
              ? { ...f, progress: 100, status: 'success' }
              : f
          )
        )

        // Call completion callback
        onUploadComplete()

      } catch (error: any) {
        console.error('Upload error:', error)
        setUploadingFiles(prev => 
          prev.map(f => 
            f.file === uploadFile.file 
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        )
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileToRemove: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== fileToRemove))
  }

  const retryUpload = (fileToRetry: File) => {
    const file = uploadingFiles.find(f => f.file === fileToRetry)
    if (file) {
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === fileToRetry 
            ? { ...f, progress: 0, status: 'uploading', error: undefined }
            : f
        )
      )
      uploadFiles([{ ...file, progress: 0, status: 'uploading' }])
    }
  }

  return (
    <MinecraftCard className="p-6">
      <h3 className="font-minecraft text-xl mb-4">📤 Upload Dokumenter</h3>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-4xl">📁</div>
          <div>
            <p className="font-minecraft text-lg mb-2">
              Træk filer hertil eller klik for at vælge
            </p>
            <p className="font-minecraft text-sm text-gray-600">
              Understøttede formater: PDF, DOC, DOCX, XLS, XLSX, ZIP, TXT, JPG, PNG, GIF
            </p>
            <p className="font-minecraft text-sm text-gray-600">
              Maksimal filstørrelse: {process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '10'} MB
            </p>
          </div>
          
          <MinecraftButton
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            📂 Vælg filer
          </MinecraftButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.jpg,.jpeg,.png,.gif"
        />
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-minecraft text-lg">Upload Status</h4>
          
          {uploadingFiles.map((uploadFile, index) => (
            <div
              key={`${uploadFile.file.name}-${index}`}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getFileIcon(uploadFile.file.type)}
                  </span>
                  <div>
                    <p className="font-minecraft font-medium">
                      {uploadFile.file.name}
                    </p>
                    <p className="font-minecraft text-sm text-gray-600">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {uploadFile.status === 'success' && (
                    <span className="text-green-600 text-2xl">✅</span>
                  )}
                  {uploadFile.status === 'error' && (
                    <span className="text-red-600 text-2xl">❌</span>
                  )}
                  {uploadFile.status === 'uploading' && (
                    <span className="text-blue-600 text-2xl">⏳</span>
                  )}
                </div>
              </div>

              {uploadFile.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadFile.progress}%` }}
                  />
                </div>
              )}

              {uploadFile.status === 'error' && (
                <div className="mt-2">
                  <p className="font-minecraft text-red-600 text-sm mb-2">
                    {uploadFile.error}
                  </p>
                  <div className="flex gap-2">
                    <MinecraftButton
                      onClick={() => retryUpload(uploadFile.file)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-sm"
                    >
                      🔄 Prøv igen
                    </MinecraftButton>
                    <MinecraftButton
                      onClick={() => removeFile(uploadFile.file)}
                      className="bg-red-600 hover:bg-red-700 text-sm"
                    >
                      🗑️ Fjern
                    </MinecraftButton>
                  </div>
                </div>
              )}

              {uploadFile.status === 'success' && (
                <div className="mt-2">
                  <p className="font-minecraft text-green-600 text-sm">
                    Upload gennemført!
                  </p>
                  <MinecraftButton
                    onClick={() => removeFile(uploadFile.file)}
                    className="bg-gray-600 hover:bg-gray-700 text-sm mt-2"
                  >
                    🗑️ Fjern fra liste
                  </MinecraftButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MinecraftCard>
  )
}
