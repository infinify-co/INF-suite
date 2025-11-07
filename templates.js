// Database Templates focused on AI-first, business-oriented workflows
// Crafted to help teams move quickly on OpenAI-style operating rhythms

const DATABASE_TEMPLATES = {
  // AI & Product
  'prompt-operations-hub': {
    id: 'prompt-operations-hub',
    name: 'Prompt Operations Hub',
    category: 'AI & Product',
    description: 'Centralize prompt versions, guardrails, and ownership for every AI surface.',
    icon: '✨',
    fields: [
      { name: 'prompt_name', type: 'text', label: 'Prompt Name', required: true, default: '' },
      { name: 'use_case', type: 'text', label: 'Use Case / Surface', required: true, default: '' },
      { name: 'model_target', type: 'text', label: 'Model Target', required: false, default: 'gpt-4.1' },
      { name: 'version', type: 'text', label: 'Prompt Version', required: true, default: 'v1' },
      { name: 'owner', type: 'text', label: 'DRI', required: true, default: '' },
      { name: 'expected_behavior', type: 'text', label: 'Expected Behavior', required: false, default: '' },
      { name: 'guardrails', type: 'text', label: 'Guardrails / Redlines', required: false, default: '' },
      { name: 'last_reviewed', type: 'date', label: 'Last Reviewed', required: false, default: '' }
    ],
    sampleData: [
      {
        prompt_name: 'Chat Compose v2',
        use_case: 'Workspace Messaging',
        model_target: 'gpt-4.1',
        version: 'v2.3',
        owner: 'Sasha Patel',
        expected_behavior: 'Return 3 actionable suggestions within 80 tokens.',
        guardrails: 'No personal data, always include CTA.',
        last_reviewed: '2025-02-14'
      },
      {
        prompt_name: 'Docs Autocomplete',
        use_case: 'Editor Copilot',
        model_target: 'gpt-4.1-mini',
        version: 'v1.6',
        owner: 'Luis Romero',
        expected_behavior: 'Complete paragraph in author voice with citations.',
        guardrails: 'Respect section-level permissions.',
        last_reviewed: '2025-02-08'
      }
    ],
    instructions: 'Use this hub to manage every production prompt. Track ownership, versions, and guardrails before rollout.'
  },

  'model-eval-suite': {
    id: 'model-eval-suite',
    name: 'Model Evaluation Suite',
    category: 'AI & Product',
    description: 'Track evaluation datasets, metrics, and outcomes for model and prompt changes.',
    icon: '🧪',
    fields: [
      { name: 'eval_name', type: 'text', label: 'Evaluation Name', required: true, default: '' },
      { name: 'scenario', type: 'text', label: 'Scenario', required: true, default: '' },
      { name: 'metric', type: 'text', label: 'Primary Metric', required: true, default: '' },
      { name: 'target', type: 'number', label: 'Target Score', required: false, default: '' },
      { name: 'result', type: 'number', label: 'Latest Result', required: false, default: '' },
      { name: 'owner', type: 'text', label: 'DRI', required: true, default: '' },
      { name: 'run_date', type: 'date', label: 'Run Date', required: true, default: '' },
      { name: 'notes', type: 'text', label: 'Notes / Observations', required: false, default: '' }
    ],
    sampleData: [
      {
        eval_name: 'Code Review Baseline',
        scenario: 'Python PR review',
        metric: 'Pass@1',
        target: 0.78,
        result: 0.82,
        owner: 'Joy Kim',
        run_date: '2025-02-12',
        notes: 'v2 prompt cleared regression gates; ready for rollout.'
      },
      {
        eval_name: 'Safety Adversarial Set',
        scenario: 'Content moderation escalation',
        metric: 'Recall',
        target: 0.92,
        result: 0.88,
        owner: 'Malik Harris',
        run_date: '2025-02-10',
        notes: 'Fails on finance disallowed content; adding new examples.'
      }
    ],
    instructions: 'Capture every evaluation run. Compare against targets before promoting models or prompts into production.'
  },

  'ai-roadmap-portfolio': {
    id: 'ai-roadmap-portfolio',
    name: 'AI Roadmap Portfolio',
    category: 'AI & Product',
    description: 'Organize AI initiatives, confidence levels, and launch moments across product areas.',
    icon: '🗺️',
    fields: [
      { name: 'initiative', type: 'text', label: 'Initiative', required: true, default: '' },
      { name: 'product_area', type: 'text', label: 'Product Area', required: true, default: '' },
      { name: 'leader', type: 'text', label: 'DRI', required: true, default: '' },
      { name: 'stage', type: 'text', label: 'Lifecycle Stage', required: true, default: 'Discovery' },
      { name: 'launch_target', type: 'date', label: 'Target Launch', required: false, default: '' },
      { name: 'confidence', type: 'text', label: 'Confidence', required: false, default: 'Medium' },
      { name: 'north_star_metric', type: 'text', label: 'North Star Metric', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Narrative / Context', required: false, default: '' }
    ],
    sampleData: [
      {
        initiative: 'Meetings Copilot Summaries',
        product_area: 'Collaboration',
        leader: 'Devon Li',
        stage: 'Build',
        launch_target: '2025-03-31',
        confidence: 'High',
        north_star_metric: 'Weekly active copilots',
        notes: 'Launch gated to E5 accounts; exec reviews weekly.'
      },
      {
        initiative: 'Insight API',
        product_area: 'Platform',
        leader: 'Riya Bose',
        stage: 'Discovery',
        launch_target: '2025-05-15',
        confidence: 'Medium',
        north_star_metric: 'API revenue',
        notes: 'Design partners identified; pricing workstream in-flight.'
      }
    ],
    instructions: 'Create one record per initiative. Review stage and confidence weekly during product reviews.'
  },

  // Go-To-Market
  'enterprise-account-plan': {
    id: 'enterprise-account-plan',
    name: 'Enterprise Account Plan',
    category: 'Go-To-Market',
    description: 'Structure executive relationships, health scores, and expansion plays for top accounts.',
    icon: '🏢',
    fields: [
      { name: 'account_name', type: 'text', label: 'Account Name', required: true, default: '' },
      { name: 'segment', type: 'text', label: 'Segment', required: false, default: 'Enterprise' },
      { name: 'exec_sponsor', type: 'text', label: 'Exec Sponsor', required: false, default: '' },
      { name: 'health_score', type: 'number', label: 'Health Score (0-100)', required: false, default: '' },
      { name: 'arr', type: 'number', label: 'ARR ($)', required: false, default: '' },
      { name: 'renewal_date', type: 'date', label: 'Renewal Date', required: false, default: '' },
      { name: 'next_action', type: 'text', label: 'Next Strategic Action', required: true, default: '' },
      { name: 'notes', type: 'text', label: 'Notes / Risks', required: false, default: '' }
    ],
    sampleData: [
      {
        account_name: 'Lumina Industries',
        segment: 'Enterprise',
        exec_sponsor: 'Anita Rao',
        health_score: 86,
        arr: 1250000,
        renewal_date: '2025-06-01',
        next_action: 'Confirm executive briefing on roadmap Q2.',
        notes: 'Security review complete; expansion in EMEA pending.'
      },
      {
        account_name: 'Northwind Retail',
        segment: 'Upper Mid-Market',
        exec_sponsor: 'Marcus Lee',
        health_score: 72,
        arr: 420000,
        renewal_date: '2025-04-15',
        next_action: 'Deploy pilot of analytics copilot to ops team.',
        notes: 'Need updated reference from AI safety lead.'
      }
    ],
    instructions: 'Align GTM and product on each account. Review next actions in weekly revenue standups.'
  },

  'deal-desk-pipeline': {
    id: 'deal-desk-pipeline',
    name: 'Deal Desk Pipeline',
    category: 'Go-To-Market',
    description: 'Operationalize high-touch deals with ARR, stage, and risk visibility.',
    icon: '📈',
    fields: [
      { name: 'opportunity_name', type: 'text', label: 'Opportunity Name', required: true, default: '' },
      { name: 'rep', type: 'text', label: 'Account Executive', required: true, default: '' },
      { name: 'region', type: 'text', label: 'Region', required: false, default: '' },
      { name: 'stage', type: 'text', label: 'Stage', required: true, default: 'Discovery' },
      { name: 'arr', type: 'number', label: 'Projected ARR ($)', required: false, default: '' },
      { name: 'close_date', type: 'date', label: 'Forecast Close', required: false, default: '' },
      { name: 'probability', type: 'number', label: 'Probability %', required: false, default: '' },
      { name: 'blockers', type: 'text', label: 'Key Blockers', required: false, default: '' }
    ],
    sampleData: [
      {
        opportunity_name: 'Helios Energy Platform',
        rep: 'Jordan Baker',
        region: 'NAMER',
        stage: 'Negotiation',
        arr: 980000,
        close_date: '2025-03-21',
        probability: 65,
        blockers: 'Security architecture sign-off in progress.'
      },
      {
        opportunity_name: 'Atlas Health Network',
        rep: 'Priya Singh',
        region: 'EMEA',
        stage: 'Evaluation',
        arr: 560000,
        close_date: '2025-05-02',
        probability: 40,
        blockers: 'Awaiting procurement redlines on data residency.'
      }
    ],
    instructions: 'Keep the deal desk in sync. Update stage, forecast, and blockers before weekly commits.'
  },

  'customer-signal-archive': {
    id: 'customer-signal-archive',
    name: 'Customer Signal Archive',
    category: 'Go-To-Market',
    description: 'Capture qualitative feedback, sentiment, and product asks from customers and partners.',
    icon: '🛰️',
    fields: [
      { name: 'signal_title', type: 'text', label: 'Signal Title', required: true, default: '' },
      { name: 'source', type: 'text', label: 'Source (Customer / Partner)', required: true, default: '' },
      { name: 'sentiment', type: 'text', label: 'Sentiment', required: false, default: 'Neutral' },
      { name: 'product_area', type: 'text', label: 'Product Area', required: true, default: '' },
      { name: 'impact', type: 'text', label: 'Business Impact', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Triaged' },
      { name: 'owner', type: 'text', label: 'Follow-up DRI', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Details', required: false, default: '' }
    ],
    sampleData: [
      {
        signal_title: 'Need SOC 3 summary for procurement',
        source: 'Vega Capital',
        sentiment: 'Positive',
        product_area: 'Security',
        impact: 'Critical to close FY25 renewal',
        status: 'In Progress',
        owner: 'Eleanor Watts',
        notes: 'Security team preparing executive summary this week.'
      },
      {
        signal_title: 'Prompt analytics in admin suite',
        source: 'Orbit Labs',
        sentiment: 'Neutral',
        product_area: 'Admin',
        impact: 'Unlocks upsell to creator tier',
        status: 'Triaged',
        owner: 'Daniel Cho',
        notes: 'Add to roadmap review for April product forum.'
      }
    ],
    instructions: 'Log every meaningful customer signal. Sync with product monthly to inform roadmap bets.'
  },

  // Operations
  'financial-ops-ledger': {
    id: 'financial-ops-ledger',
    name: 'Financial Ops Ledger',
    category: 'Operations',
    description: 'Track spend, cost centers, and approvals across GTM, product, and infra.',
    icon: '💳',
    fields: [
      { name: 'transaction_name', type: 'text', label: 'Transaction', required: true, default: '' },
      { name: 'category', type: 'text', label: 'Category', required: true, default: '' },
      { name: 'cost_center', type: 'text', label: 'Cost Center', required: false, default: '' },
      { name: 'amount', type: 'number', label: 'Amount ($)', required: true, default: 0 },
      { name: 'owner', type: 'text', label: 'Budget Owner', required: true, default: '' },
      { name: 'invoice_url', type: 'text', label: 'Invoice / Link', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Pending' },
      { name: 'purchase_date', type: 'date', label: 'Purchase Date', required: false, default: '' }
    ],
    sampleData: [
      {
        transaction_name: 'Synthetic data labeling',
        category: 'Model Ops',
        cost_center: 'R&D',
        amount: 18500,
        owner: 'Maya Chen',
        invoice_url: 'https://drive.example.com/invoice-883',
        status: 'Approved',
        purchase_date: '2025-01-27'
      },
      {
        transaction_name: 'Enterprise analytics tooling',
        category: 'GTM Enablement',
        cost_center: 'Sales',
        amount: 6200,
        owner: 'Alex Morgan',
        invoice_url: '',
        status: 'Pending Approval',
        purchase_date: '2025-02-03'
      }
    ],
    instructions: 'Log spend as soon as requests land. Keep owners accountable for approvals and documentation.'
  },

  'vendor-risk-register': {
    id: 'vendor-risk-register',
    name: 'Vendor Risk Register',
    category: 'Operations',
    description: 'Monitor third-party vendors, renewal cycles, and mitigation plans.',
    icon: '🛡️',
    fields: [
      { name: 'vendor_name', type: 'text', label: 'Vendor Name', required: true, default: '' },
      { name: 'service_area', type: 'text', label: 'Service Area', required: true, default: '' },
      { name: 'contract_value', type: 'number', label: 'Contract Value ($)', required: false, default: '' },
      { name: 'renewal_date', type: 'date', label: 'Renewal Date', required: false, default: '' },
      { name: 'risk_level', type: 'text', label: 'Risk Level', required: false, default: 'Medium' },
      { name: 'mitigation_plan', type: 'text', label: 'Mitigation Plan', required: false, default: '' },
      { name: 'owner', type: 'text', label: 'Vendor Owner', required: true, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Active' }
    ],
    sampleData: [
      {
        vendor_name: 'CloudScale AI',
        service_area: 'GPU Infrastructure',
        contract_value: 2400000,
        renewal_date: '2025-08-01',
        risk_level: 'High',
        mitigation_plan: 'Negotiate backup capacity with second supplier.',
        owner: 'Noah Fields',
        status: 'Active'
      },
      {
        vendor_name: 'Signal Metrics',
        service_area: 'Product Analytics',
        contract_value: 180000,
        renewal_date: '2025-04-30',
        risk_level: 'Medium',
        mitigation_plan: 'Security team performing data residency review.',
        owner: 'Mina Torres',
        status: 'Under Review'
      }
    ],
    instructions: 'Keep risk profiles current. Review renewals quarterly with legal, finance, and security stakeholders.'
  },

  'people-ops-rituals': {
    id: 'people-ops-rituals',
    name: 'People Ops Rituals',
    category: 'Operations',
    description: 'Track hiring funnels, onboarding rituals, and team health cadences.',
    icon: '🤝',
    fields: [
      { name: 'ritual_name', type: 'text', label: 'Ritual / Program', required: true, default: '' },
      { name: 'leader', type: 'text', label: 'Program Owner', required: true, default: '' },
      { name: 'cadence', type: 'text', label: 'Cadence', required: false, default: '' },
      { name: 'audience', type: 'text', label: 'Audience', required: false, default: '' },
      { name: 'next_session', type: 'date', label: 'Next Session', required: false, default: '' },
      { name: 'status', type: 'text', label: 'Status', required: false, default: 'Active' },
      { name: 'success_metric', type: 'text', label: 'Success Metric', required: false, default: '' },
      { name: 'notes', type: 'text', label: 'Notes / Follow-ups', required: false, default: '' }
    ],
    sampleData: [
      {
        ritual_name: 'Staff Onboarding Cohort',
        leader: 'Heather Flynn',
        cadence: 'Bi-weekly',
        audience: 'New hires (staff+)',
        next_session: '2025-02-18',
        status: 'Active',
        success_metric: 'Time-to-productivity < 21 days',
        notes: 'Integrate AI policy briefing module.'
      },
      {
        ritual_name: 'Product + GTM Weekly Sync',
        leader: 'Omar Aziz',
        cadence: 'Weekly',
        audience: 'Product, Sales, CS leads',
        next_session: '2025-02-13',
        status: 'Active',
        success_metric: 'Feature adoption rate',
        notes: 'Add section on customer signal archive highlights.'
      }
    ],
    instructions: 'Document the rituals that keep teams aligned. Revisit cadence and success metrics during quarterly planning.'
  }
};

// Helper function to get templates by category
function getTemplatesByCategory() {
  const categorized = {};

  Object.values(DATABASE_TEMPLATES).forEach(template => {
    if (!categorized[template.category]) {
      categorized[template.category] = [];
    }
    categorized[template.category].push(template);
  });

  const categoryOrder = ['AI & Product', 'Go-To-Market', 'Operations'];
  const ordered = {};

  categoryOrder.forEach(category => {
    if (categorized[category]) {
      ordered[category] = categorized[category];
      delete categorized[category];
    }
  });

  Object.keys(categorized)
    .sort()
    .forEach(category => {
      ordered[category] = categorized[category];
    });

  return ordered;
}

// Helper function to get template by ID
function getTemplateById(templateId) {
  return DATABASE_TEMPLATES[templateId] || null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DATABASE_TEMPLATES, getTemplatesByCategory, getTemplateById };
}

// Make available globally
window.DATABASE_TEMPLATES = DATABASE_TEMPLATES;
window.getTemplatesByCategory = getTemplatesByCategory;
window.getTemplateById = getTemplateById;

