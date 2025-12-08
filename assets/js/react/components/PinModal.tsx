import React from "react"

type Props = {
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  mode: "add" | "edit"
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete?: boolean
}

export default function PinModal({ title, setTitle, description, setDescription, mode, onCancel, onSave, onDelete, canDelete }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="pin-modal-content rounded-lg min-w-[300px] shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{mode === "edit" ? "Edit Pin" : "Add Pin"}</h2>
        <input
          id="pin-title"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded border"
        />
        <textarea
          id="pin-description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded border"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn">Cancel</button>
          {mode === "edit" && canDelete && (
            <button onClick={onDelete} className="btn btn-error">Delete</button>
          )}
          <button onClick={onSave} className="btn btn-success">{mode === "edit" ? "Save" : "Add"}</button>
        </div>
      </div>
    </div>
  )
}


