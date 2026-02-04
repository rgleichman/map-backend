import React from "react"

export default function LoginRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="pin-modal-content rounded-lg min-w-[300px] shadow-xl p-6 bg-base-100 text-base-content border border-base-300">
        <h2 className="text-lg font-semibold mb-4">Login Required</h2>
        <p className="mb-6">You must be logged in to add new locations to the map.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
    </div>
  )
}
