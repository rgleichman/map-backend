import React from "react"

type Props = {
  title: string
  setTitle: (t: string) => void
  description: string
  setDescription: (d: string) => void
  tags: string[]
  setTags: (tags: string[]) => void
  mode: "add" | "edit"
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  canDelete?: boolean
}

export default function PinModal({ title, setTitle, description, setDescription, tags, setTags, mode, onCancel, onSave, onDelete, canDelete }: Props) {
  const [tagInput, setTagInput] = React.useState("");

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

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
          autoFocus={mode === "add"}
          className="w-full mb-4 px-3 py-2 rounded border"
        />
        <textarea
          id="pin-description"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded border"
        />
        <div className="mb-4">
          <label className="block font-medium mb-1">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
              className="px-2 py-1 rounded border flex-1"
              placeholder="Add tag"
            />
            <button type="button" onClick={handleAddTag} className="btn btn-sm btn-primary">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center bg-base-200 text-base-content rounded px-2 py-1 text-sm">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 text-red-500 hover:text-red-700">×</button>
              </span>
            ))}
          </div>
        </div>
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


