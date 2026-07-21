import { Subject } from '../types/models';

export interface StudyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: Subject['color'];
  tags: string[];
  recommendedGoal: number; // in minutes
  category: 'languages' | 'stem' | 'business' | 'creative' | 'professional';
}

export const STUDY_TEMPLATES: StudyTemplate[] = [
  // Languages Category
  {
    id: 'spanish-101',
    name: 'Spanish 101',
    description: 'Beginner Spanish - vocabulary, grammar, and conversation',
    icon: '🇪🇸',
    color: 'red',
    tags: ['vocabulary', 'grammar', 'speaking'],
    recommendedGoal: 45,
    category: 'languages',
  },
  {
    id: 'french-101',
    name: 'French 101',
    description: 'French language fundamentals and cultural context',
    icon: '🇫🇷',
    color: 'blue',
    tags: ['vocabulary', 'grammar', 'accent'],
    recommendedGoal: 45,
    category: 'languages',
  },
  {
    id: 'german-101',
    name: 'German 101',
    description: 'German basics and complex grammar structures',
    icon: '🇩🇪',
    color: 'yellow',
    tags: ['vocabulary', 'grammar', 'pronunciation'],
    recommendedGoal: 50,
    category: 'languages',
  },
  {
    id: 'japanese-101',
    name: 'Japanese 101',
    description: 'Japanese characters, grammar, and cultural nuances',
    icon: '🇯🇵',
    color: 'red',
    tags: ['kanji', 'hiragana', 'katakana'],
    recommendedGoal: 60,
    category: 'languages',
  },

  // STEM Category
  {
    id: 'mathematics-101',
    name: 'Mathematics',
    description: 'Algebra, calculus, geometry, and problem solving',
    icon: '🔢',
    color: 'purple',
    tags: ['algebra', 'geometry', 'calculus'],
    recommendedGoal: 50,
    category: 'stem',
  },
  {
    id: 'physics-101',
    name: 'Physics',
    description: 'Classical mechanics, electromagnetism, and waves',
    icon: '⚛️',
    color: 'cyan',
    tags: ['mechanics', 'electricity', 'thermodynamics'],
    recommendedGoal: 55,
    category: 'stem',
  },
  {
    id: 'chemistry-101',
    name: 'Chemistry',
    description: 'Organic, inorganic, and analytical chemistry',
    icon: '🧪',
    color: 'green',
    tags: ['reactions', 'bonding', 'equations'],
    recommendedGoal: 50,
    category: 'stem',
  },
  {
    id: 'biology-101',
    name: 'Biology',
    description: 'Cell biology, genetics, ecology, and evolution',
    icon: '🧬',
    color: 'green',
    tags: ['cells', 'genetics', 'ecology'],
    recommendedGoal: 45,
    category: 'stem',
  },
  {
    id: 'computer-science-101',
    name: 'Computer Science',
    description: 'Algorithms, data structures, and programming logic',
    icon: '💻',
    color: 'blue',
    tags: ['algorithms', 'coding', 'data-structures'],
    recommendedGoal: 60,
    category: 'stem',
  },

  // Business Category
  {
    id: 'economics-101',
    name: 'Economics',
    description: 'Microeconomics, macroeconomics, and market analysis',
    icon: '📊',
    color: 'yellow',
    tags: ['supply-demand', 'markets', 'analytics'],
    recommendedGoal: 45,
    category: 'business',
  },
  {
    id: 'accounting-101',
    name: 'Accounting',
    description: 'Financial statements, bookkeeping, and reporting',
    icon: '📋',
    color: 'blue',
    tags: ['ledger', 'balance-sheet', 'statements'],
    recommendedGoal: 50,
    category: 'business',
  },
  {
    id: 'finance-101',
    name: 'Finance',
    description: 'Investment analysis, portfolio management, risk assessment',
    icon: '💰',
    color: 'green',
    tags: ['investing', 'portfolio', 'risk'],
    recommendedGoal: 50,
    category: 'business',
  },
  {
    id: 'business-strategy-101',
    name: 'Business Strategy',
    description: 'Strategic planning, competition analysis, growth frameworks',
    icon: '🎯',
    color: 'red',
    tags: ['strategy', 'planning', 'market-analysis'],
    recommendedGoal: 45,
    category: 'business',
  },

  // Creative Category
  {
    id: 'writing-101',
    name: 'Creative Writing',
    description: 'Fiction, poetry, storytelling, and narrative techniques',
    icon: '✍️',
    color: 'orange',
    tags: ['fiction', 'poetry', 'storytelling'],
    recommendedGoal: 40,
    category: 'creative',
  },
  {
    id: 'music-101',
    name: 'Music Theory',
    description: 'Harmony, rhythm, composition, and musical analysis',
    icon: '🎵',
    color: 'purple',
    tags: ['harmony', 'rhythm', 'composition'],
    recommendedGoal: 40,
    category: 'creative',
  },
  {
    id: 'art-design-101',
    name: 'Art & Design',
    description: 'Color theory, composition, digital design, and illustration',
    icon: '🎨',
    color: 'purple',
    tags: ['color-theory', 'composition', 'design'],
    recommendedGoal: 50,
    category: 'creative',
  },
  {
    id: 'photography-101',
    name: 'Photography',
    description: 'Composition, lighting, editing, and visual storytelling',
    icon: '📸',
    color: 'blue',
    tags: ['composition', 'lighting', 'editing'],
    recommendedGoal: 45,
    category: 'creative',
  },

  // Professional Development Category
  {
    id: 'project-management-101',
    name: 'Project Management',
    description: 'Planning, execution, risk management, and team leadership',
    icon: '📈',
    color: 'cyan',
    tags: ['planning', 'execution', 'leadership'],
    recommendedGoal: 45,
    category: 'professional',
  },
  {
    id: 'communication-101',
    name: 'Communication Skills',
    description: 'Public speaking, writing, presentation, and interpersonal skills',
    icon: '🎤',
    color: 'orange',
    tags: ['speaking', 'writing', 'presentation'],
    recommendedGoal: 40,
    category: 'professional',
  },
  {
    id: 'leadership-101',
    name: 'Leadership',
    description: 'Team management, decision making, and organizational leadership',
    icon: '👔',
    color: 'red',
    tags: ['management', 'decision-making', 'teamwork'],
    recommendedGoal: 45,
    category: 'professional',
  },
  {
    id: 'sales-101',
    name: 'Sales & Negotiation',
    description: 'Sales techniques, negotiation strategies, and client management',
    icon: '🤝',
    color: 'green',
    tags: ['sales', 'negotiation', 'closing'],
    recommendedGoal: 45,
    category: 'professional',
  },
];

export function getTemplatesByCategory(category: StudyTemplate['category']): StudyTemplate[] {
  return STUDY_TEMPLATES.filter(template => template.category === category);
}

export function getTemplateById(id: string): StudyTemplate | undefined {
  return STUDY_TEMPLATES.find(template => template.id === id);
}

export function getAllCategories(): StudyTemplate['category'][] {
  const categories = new Set(STUDY_TEMPLATES.map(t => t.category));
  return Array.from(categories) as StudyTemplate['category'][];
}
