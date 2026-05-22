import { WidgetConfig, HelpCategory, TeamMember, QuickAction } from './types';

export const DEFAULT_HELP_CATEGORIES: HelpCategory[] = [
  {
    id: '1',
    icon: 'book-open',
    label: 'Getting Started',
    description: 'Learn the basics',
  },
  {
    id: '2',
    icon: 'users',
    label: 'Team Setup',
    description: 'Manage your team',
  },
  {
    id: '3',
    icon: 'file-text',
    label: 'Billing',
    description: 'Plans & payments',
  },
  {
    id: '4',
    icon: 'help-circle',
    label: 'FAQs',
    description: 'Common questions',
  },
];

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Dr. Sarah', avatar: '', role: 'Consultant' },
  { id: '2', name: 'Mike', avatar: '', role: 'Support' },
  { id: '3', name: 'Lisa', avatar: '', role: 'Help Desk' },
];

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: '1',
    icon: 'calendar',
    label: 'Book a demo',
    url: '',
    description: 'Schedule a personalized demo',
    enabled: true,
  },
  {
    id: '2',
    icon: 'play',
    label: 'Product tour',
    url: '',
    description: 'See how it works',
    enabled: true,
  },
  {
    id: '3',
    icon: 'book',
    label: 'Documentation',
    url: '',
    description: 'Browse our guides',
    enabled: true,
  },
  {
    id: '4',
    icon: 'phone',
    label: 'Schedule a call',
    url: '',
    description: 'Talk to an expert',
    enabled: false,
  },
];

export function createDefaultConfig(brandTitle?: string): WidgetConfig {
  return {
    primaryColor: '#075e54',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#0066cc',
    position: 'bottom-right',
    logoUrl: '',

    title: 'Homeo-X Support',
    subtitle: 'How can we help?',
    greeting: 'Hi! Welcome to Homeo-X. How can we help you today?',
    appName: brandTitle || 'Homeo-X',

    tenantId: '',
    name: 'My Widget',
    domain: '',

    homeScreen: 'messenger',
    showSearch: true,
    showTeamAvatars: true,
    showQuickActions: true,
    showRecentArticles: true,

    messengerButtonText: 'Chat on WhatsApp',
    messengerSearchPlaceholder: 'Search our FAQs',
    articlesCount: 3,

    helpSearchPlaceholder: 'Search for answers...',
    helpCategoriesTitle: 'Browse by category',
    helpCtaText: 'Chat with us',
    helpCategories: DEFAULT_HELP_CATEGORIES,
    categoriesCount: 6,

    contactTitle: 'How can we help?',
    contactCtaText: 'Start a conversation',
    contactStatusMessage: 'We typically reply within a few minutes',
    showContactStatus: true,

    teamMembers: DEFAULT_TEAM_MEMBERS,
    responseTime: 'A few minutes',

    quickActions: DEFAULT_QUICK_ACTIONS,

    enableChat: true,
    enableVoiceCall: false,
    enableVideoCall: false,
    enableKnowledgeBase: true,
    enableEmailCapture: false,
    enableAiAutoReply: true,

    widgetStyle: 'classic',
    buttonSize: 'large',
    roundedCorners: 'lg',
    showPoweredBy: true,

    fontFamily: 'system',
    buttonStyle: 'solid',
    shadowIntensity: 'medium',
    animationSpeed: 'normal',
    enableSoundEffects: false,
    aiTone: 'friendly',
    aiMaxResponseLength: 200,
    aiFallbackMessage: "I'm sorry, I don't have the information you're looking for.",
    systemPrompt:
      "You are a helpful clinical support assistant. Guidelines: - Be friendly and professional- Keep responses concise- If you don't know something, admit it- Direct users to human support for complex issues- Use the patient's name when provided",
    trainFromKB: false,
    escalationRules: {
      enabled: true,
      maxAttempts: 3,
      triggerPhrases: ['speak to agent', 'talk to doctor', 'real person'],
      escalationMessage: 'Let me connect you with a clinical coordinator who can help you better.',
    },
  };
}
