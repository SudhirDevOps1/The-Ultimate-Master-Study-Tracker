import { useState } from "react";
import { Panel } from "@/components/common/Panel";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/utils/cn";

const EMOJIS = ["📚", "💻", "🧠", "🎨", "🧪", "🌍", "✍️", "🧬", "🔢", "⚖️", "🍎", "🎭"];

export function SubjectsPage() {
  const subjects = useAppStore((state) => state.subjects);
  const createSubject = useAppStore((state) => state.createSubject);
  const updateSubject = useAppStore((state) => state.updateSubject);
  const deleteSubject = useAppStore((state) => state.deleteSubject);

  // Create state
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [weeklyGoal, setWeeklyGoal] = useState("10");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#60a5fa");
  const [editEmoji, setEditEmoji] = useState(EMOJIS[0]);
  const [editGoal, setEditGoal] = useState("10");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void createSubject(
      name.trim(),
      color,
      emoji,
      parseFloat(weeklyGoal) * 60
    );
    setName("");
    setEmoji(EMOJIS[0]);
  };

  return (
    <div className="space-y-6">
      <Panel className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Subject Customization</h2>
          <p className="mt-1 text-sm text-slate-400">Personalize your subjects with icons and weekly hour goals.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subject Name</label>
              <input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="e.g. Mathematics"
                className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Weekly Goal (Hours)</label>
              <input
                type="number"
                value={weeklyGoal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeeklyGoal(e.target.value)}
                min="0.5"
                step="0.5"
                className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Theme Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer items-center rounded-lg border border-white/10 bg-slate-900 px-1"
                />
                <span className="text-sm font-mono text-slate-400">{color.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Icon / Emoji</label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/5 bg-slate-900/30 p-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                      emoji === e ? "bg-indigo-500 scale-110 shadow-lg text-lg" : "hover:bg-white/5 text-base"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3 font-semibold text-white shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            Create New Subject
          </button>
        </form>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => {
          const isEditing = editingId === subject.id;
          const goalHours = (subject.weeklyGoalMinutes || 0) / 60;

          return (
            <div
              key={subject.id}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 transition-all hover:bg-slate-900/60 hover:shadow-xl"
            >
              {/* Colored accent bar */}
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: subject.color }}
              />

              {isEditing ? (
                <div className="space-y-4">
                   <input
                    value={editName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
                  />
                  <div className="flex items-center gap-3">
                    <input type="number" value={editGoal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditGoal(e.target.value)} className="w-20 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-white text-sm" />
                    <span className="text-xs text-slate-500 whitespace-nowrap">Goal (Hrs)</span>
                    <input type="color" value={editColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditColor(e.target.value)} className="h-8 w-10 bg-transparent" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setEditEmoji(e)}
                        className={cn("text-lg p-1 rounded-md", editEmoji === e ? "bg-white/10" : "opacity-40")}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        void updateSubject(subject.id, editName.trim(), editColor, editEmoji, parseFloat(editGoal) * 60).then(() => setEditingId(null));
                      }}
                      className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-sm font-bold text-black"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-lg bg-white/5 py-1.5 text-sm text-slate-300">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl shadow-inner"
                        style={{ boxShadow: `inset 0 0 10px ${subject.color}15` }}
                      >
                        {subject.emoji || "📚"}
                      </div>
                      <div>
                        <h4 className="font-bold text-white line-clamp-1">{subject.name}</h4>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                          <span className="text-xs text-slate-400 capitalize">Weekly Goal: {goalHours > 0 ? `${goalHours}h` : 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        setEditingId(subject.id);
                        setEditName(subject.name);
                        setEditColor(subject.color);
                        setEditEmoji(subject.emoji || EMOJIS[0]);
                        setEditGoal(goalHours.toString());
                      }}
                      className="rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteSubject(subject.id)}
                      className="rounded-lg bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
