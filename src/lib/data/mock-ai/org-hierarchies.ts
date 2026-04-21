export interface OrgNode {
  id: string;
  name: string;
  title: string;
  isNew?: boolean;
  children?: OrgNode[];
}

export interface HierarchySuggestion {
  tree: OrgNode;
  reportsTo: { id: string; name: string; title: string };
  confidence: number;
  rationale: string;
}

/**
 * Mock org hierarchy lookup. Given a company name + new person, returns a realistic
 * tree and a "reports to" suggestion with rationale and confidence.
 */
export function suggestHierarchy({ companyName, personName, personTitle }: {
  companyName: string; personName: string; personTitle: string;
}): HierarchySuggestion | null {
  const normalized = companyName.trim().toLowerCase();

  if (normalized.includes('meridian')) {
    const newPersonNode: OrgNode = {
      id: 'new-person-meridian',
      name: personName,
      title: personTitle || 'VP of Engineering',
      isNew: true,
      children: [
        { id: 'eng-1', name: 'Alex Rivera', title: 'Sr. Engineer' },
        { id: 'eng-2', name: 'Priya Patel', title: 'Sr. Engineer' },
      ],
    };
    return {
      tree: {
        id: 'company-meridian', name: 'Meridian Tech', title: 'Company',
        children: [
          {
            id: 'ceo-1', name: 'James Mitchell', title: 'CEO',
            children: [
              newPersonNode,
              { id: 'cfo-1', name: 'Lisa Thompson', title: 'CFO',
                children: [{ id: 'controller-1', name: 'Tom Davis', title: 'Controller' }],
              },
            ],
          },
        ],
      },
      reportsTo: { id: 'ceo-1', name: 'James Mitchell', title: 'CEO' },
      confidence: 82,
      rationale: 'Based on LinkedIn data and existing contacts, this person likely reports to James Mitchell (CEO).',
    };
  }

  if (normalized.includes('acme')) {
    const newPersonNode: OrgNode = {
      id: 'new-person-acme',
      name: personName,
      title: personTitle || 'Senior Manager',
      isNew: true,
    };
    return {
      tree: {
        id: 'company-acme', name: 'Acme Corporation', title: 'Company',
        children: [
          {
            id: 'ceo-2', name: 'John Smith', title: 'CEO',
            children: [
              { id: 'vp-prod', name: 'Mary Lee', title: 'VP Product', children: [newPersonNode] },
              { id: 'cto-acme', name: 'David Park', title: 'CTO' },
            ],
          },
        ],
      },
      reportsTo: { id: 'vp-prod', name: 'Mary Lee', title: 'VP Product' },
      confidence: 75,
      rationale: 'Based on org patterns for SaaS companies this size, product roles typically report to VP Product.',
    };
  }

  if (companyName.trim().length > 2) {
    const newPersonNode: OrgNode = {
      id: 'new-person-generic',
      name: personName,
      title: personTitle || 'Team Member',
      isNew: true,
    };
    return {
      tree: {
        id: 'company-generic', name: companyName, title: 'Company',
        children: [
          { id: 'leader-1', name: 'Leadership', title: 'Executive Team', children: [newPersonNode] },
        ],
      },
      reportsTo: { id: 'leader-1', name: 'Leadership', title: 'Executive Team' },
      confidence: 45,
      rationale: 'Limited data available for this company. Suggestion based on standard org patterns.',
    };
  }

  return null;
}
