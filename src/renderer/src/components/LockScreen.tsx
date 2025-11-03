import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useStore } from '../store/store'

export default function LockScreen() {
  const { setLocked } = useStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    // In a real implementation, verify PIN with Keytar
    // For now, accept any 4+ digit PIN
    if (pin.length >= 4) {
      setLocked(false)
      setPin('')
      setError('')
    } else {
      setError('PIN must be at least 4 digits')
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <Lock size={64} className="mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-white mb-2">WTStation is locked</h1>
          <p className="text-gray-400">Enter your PIN to unlock</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="Enter PIN"
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-accent focus:outline-none"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUnlock()
              }
            }}
            autoFocus
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleUnlock}
            className="w-full px-4 py-3 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  )
}
