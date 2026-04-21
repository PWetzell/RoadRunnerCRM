export interface PrivacyAdvisoryItem {
  id: string;
  title: string;
  icon: 'strength' | 'privacy' | 'engagement' | 'tags';
  body: string;
  severity: 'info' | 'warning' | 'success';
}

export function getPrivacyAdvisory({ relationshipType, companyName, isPrivate }: {
  relationshipType: string; companyName: string; isPrivate: boolean;
}): PrivacyAdvisoryItem[] {
  const items: PrivacyAdvisoryItem[] = [];

  // Relationship Strength
  items.push({
    id: 'rel-strength',
    icon: 'strength',
    title: 'Relationship Strength',
    body: relationshipType === 'Client'
      ? `Strong client relationship with ${companyName || 'this company'}. Existing deal pipeline and steady communication history.`
      : relationshipType === 'Prospect'
      ? 'Early-stage relationship. Focus on discovery and needs assessment before commitment.'
      : relationshipType === 'Partner'
      ? 'Strategic partnership. Requires executive alignment and co-marketing opportunities.'
      : 'Relationship strength depends on interaction frequency and deal history.',
    severity: 'info',
  });

  // Privacy Consideration
  items.push({
    id: 'privacy-consideration',
    icon: 'privacy',
    title: 'Privacy Consideration',
    body: isPrivate
      ? 'This contact is marked private. Only you and specified team members will have access. Ideal for confidential candidates or sensitive deals.'
      : 'This contact will be visible to all team members by default. Consider marking private for candidates or sensitive relationships.',
    severity: isPrivate ? 'warning' : 'info',
  });

  // Engagement Score
  items.push({
    id: 'engagement',
    icon: 'engagement',
    title: 'Engagement Score',
    body: 'Predicted engagement: High. Based on role seniority and company size. Expect 2-3 touchpoints per quarter.',
    severity: 'success',
  });

  // Suggested Tags
  const suggestedTags = [];
  if (relationshipType === 'Client') suggestedTags.push('VIP', 'Follow Up');
  if (relationshipType === 'Prospect') suggestedTags.push('Prospect', 'Follow Up');
  if (relationshipType === 'Partner') suggestedTags.push('Partner');
  if (relationshipType === 'Vendor') suggestedTags.push('Vendor');

  items.push({
    id: 'suggested-tags',
    icon: 'tags',
    title: 'Suggested Tags',
    body: suggestedTags.length > 0
      ? `Based on classification, consider adding: ${suggestedTags.join(', ')}`
      : 'No specific tags recommended. Add based on your workflow.',
    severity: 'info',
  });

  return items;
}
