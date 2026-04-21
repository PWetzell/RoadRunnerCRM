/**
 * SAM.gov — US federal contractor entity registry.
 *
 * Docs: https://open.gsa.gov/api/entity-api/
 * Cost: free with API key. Set SAM_GOV_TOKEN in .env.local.
 * Gracefully returns [] when no token is configured.
 *
 * The Entity Management API covers every business that's ever done federal
 * contracting — post-2022 this includes the UEI (which replaced DUNS).
 */

import { getCache } from './cache';
import { PROVIDER_CONFIG, fetchWithTimeout } from './config';
import type { ExternalCompany } from './types';

interface SamEntity {
  entityRegistration?: {
    ueiSAM?: string;
    legalBusinessName?: string;
    dbaName?: string;
    cageCode?: string;
    entityStructureCode?: string;
    registrationDate?: string;
    registrationStatus?: string;
  };
  coreData?: {
    physicalAddress?: { city?: string; stateOrProvinceCode?: string; countryCode?: string; addressLine1?: string };
    businessTypes?: { businessTypeList?: { businessTypeDesc?: string }[] };
  };
}

interface SamResponse {
  entityData?: SamEntity[];
}

const cache = getCache<SamEntity[]>('sam-gov', 200, 60 * 60 * 1000);

export async function searchSamGov(query: string): Promise<ExternalCompany[]> {
  if (!PROVIDER_CONFIG.samGov.token) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const key = q.toLowerCase();
  let rows = cache.get(key);
  if (!rows) {
    try {
      const url = `${PROVIDER_CONFIG.samGov.baseUrl}/entities?api_key=${encodeURIComponent(PROVIDER_CONFIG.samGov.token)}&q=${encodeURIComponent(q)}&registrationStatus=A&includeSections=entityRegistration,coreData&size=5`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return [];
      const json = (await res.json()) as SamResponse;
      rows = json.entityData || [];
      cache.set(key, rows);
    } catch {
      return [];
    }
  }

  return rows.map((e, i): ExternalCompany => {
    const reg = e.entityRegistration;
    const core = e.coreData;
    const addr = core?.physicalAddress;
    const hq = addr ? [addr.city, addr.stateOrProvinceCode, addr.countryCode].filter(Boolean).join(', ') : undefined;
    return {
      id: `sam-gov:${reg?.ueiSAM || i}`,
      source: 'sam-gov',
      sourceUrl: reg?.ueiSAM ? `https://sam.gov/entity/${reg.ueiSAM}` : undefined,
      name: reg?.legalBusinessName || reg?.dbaName || 'Unknown',
      legalName: reg?.legalBusinessName,
      country: addr?.countryCode || 'US',
      region: addr?.stateOrProvinceCode,
      city: addr?.city,
      hq,
      founded: reg?.registrationDate,
      identifiers: { 'sam-gov': reg?.ueiSAM || '' },
      confidence: Math.max(55, 82 - i * 6),
      matchedFields: ['name'],
    };
  });
}
