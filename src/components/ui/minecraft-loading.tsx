export function MinecraftLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="font-minecraft text-2xl text-white mb-4">
          Indlæser...
        </div>
        <div className="flex justify-center space-x-1">
          <div className="w-3 h-3 bg-green-500 animate-bounce"></div>
          <div className="w-3 h-3 bg-green-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
} 