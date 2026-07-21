import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Zap } from 'lucide-react';
import { STUDY_TEMPLATES, getTemplatesByCategory, getAllCategories, StudyTemplate } from '../../data/studyTemplates';

interface TemplateSelectorProps {
  onSelectTemplate: (template: StudyTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelectTemplate, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<StudyTemplate | null>(null);

  const categories = getAllCategories();
  const categoryNames: Record<string, { label: string; icon: string; color: string }> = {
    languages: { label: 'Languages', icon: '🌍', color: 'from-red-500 to-orange-500' },
    stem: { label: 'STEM', icon: '🔬', color: 'from-cyan-500 to-blue-500' },
    business: { label: 'Business', icon: '💼', color: 'from-yellow-500 to-green-500' },
    creative: { label: 'Creative', icon: '🎨', color: 'from-purple-500 to-pink-500' },
    professional: { label: 'Professional', icon: '📈', color: 'from-orange-500 to-red-500' },
  };

  const displayedTemplates = selectedCategory
    ? getTemplatesByCategory(selectedCategory as any)
    : STUDY_TEMPLATES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Quick Start Templates</h2>
                <p className="text-sm text-slate-400 mt-1">Choose a template to get started instantly</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {!selectedTemplate ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!selectedCategory ? (
                  // Category Selection
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-300 mb-4">Select a category</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categories.map(category => {
                        const info = categoryNames[category];
                        const count = STUDY_TEMPLATES.filter(t => t.category === category).length;
                        
                        return (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`group p-4 rounded-xl border border-white/10 hover:border-white/30 transition text-left bg-slate-800/50 hover:bg-slate-800`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-2xl">{info.icon}</span>
                                  <h3 className="font-semibold text-white">{info.label}</h3>
                                </div>
                                <p className="text-xs text-slate-400">{count} templates</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Template Selection within Category
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1"
                    >
                      ← Back to categories
                    </button>
                    <p className="text-sm font-medium text-slate-300 mb-3">
                      {categoryNames[selectedCategory]?.label} Templates
                    </p>
                    <div className="space-y-2">
                      {displayedTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className="w-full p-4 rounded-xl border border-white/10 hover:border-white/30 transition text-left bg-slate-800/50 hover:bg-slate-800 group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">{template.icon}</span>
                                <div>
                                  <h3 className="font-semibold text-white">{template.name}</h3>
                                  <p className="text-xs text-slate-400">{template.description}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                {template.tags.map(tag => (
                                  <span key={tag} className="px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-300">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white flex-shrink-0 mt-2 group-hover:translate-x-1 transition" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              // Template Preview
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                >
                  ← Back to templates
                </button>

                <div className="space-y-4">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10">
                    <div className="flex items-start gap-4">
                      <span className="text-5xl">{selectedTemplate.icon}</span>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-1">{selectedTemplate.name}</h2>
                        <p className="text-slate-300 mb-4">{selectedTemplate.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedTemplate.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-lg text-sm bg-white/10 text-slate-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Recommended Goal</p>
                      <p className="text-2xl font-bold text-white">{selectedTemplate.recommendedGoal}m</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-white/10">
                      <p className="text-xs text-slate-400 mb-1">Color Theme</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-8 h-8 rounded-lg border border-white/20"
                          style={{
                            backgroundColor: selectedTemplate.color === 'red' ? '#ef4444' :
                                          selectedTemplate.color === 'blue' ? '#3b82f6' :
                                          selectedTemplate.color === 'green' ? '#22c55e' :
                                          selectedTemplate.color === 'yellow' ? '#eab308' :
                                          selectedTemplate.color === 'purple' ? '#a855f7' :
                                          selectedTemplate.color === 'orange' ? '#f97316' :
                                          selectedTemplate.color === 'cyan' ? '#06b6d4' : '#6366f1'
                          }}
                        />
                        <span className="text-sm text-slate-300">{selectedTemplate.color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t border-white/10 p-6 flex gap-3 bg-slate-900/50"
          >
            <button
              onClick={() => setSelectedTemplate(null)}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelectTemplate(selectedTemplate)}
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:from-cyan-600 hover:to-blue-600 transition"
            >
              Use This Template
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
