/**
 * NAICS 2022 taxonomy — a realistic subset covering the sectors most
 * commonly attached to B2B contacts. The Industry editor on a contact
 * cascades through Sector (2-digit) → Subsector (3) → Industry Group (4)
 * → Industry (5), each level filtered by the parent selection.
 *
 * Data sourced from the US Census Bureau's public NAICS manual. We
 * intentionally don't ship all ~1,000 national-industry codes — the
 * demo only needs a credible slice to show the cascading UX working.
 */

export interface NaicsNode {
  code: string;
  name: string;
  children?: NaicsNode[];
}

export const NAICS: NaicsNode[] = [
  {
    code: '11', name: 'Agriculture, Forestry, Fishing and Hunting',
    children: [
      { code: '111', name: 'Crop Production', children: [
        { code: '1111', name: 'Oilseed and Grain Farming', children: [
          { code: '11111', name: 'Soybean Farming' },
          { code: '11114', name: 'Wheat Farming' },
        ]},
        { code: '1112', name: 'Vegetable and Melon Farming', children: [
          { code: '11121', name: 'Vegetable and Melon Farming' },
        ]},
      ]},
      { code: '112', name: 'Animal Production and Aquaculture', children: [
        { code: '1121', name: 'Cattle Ranching and Farming', children: [
          { code: '11211', name: 'Beef Cattle Ranching and Farming' },
          { code: '11212', name: 'Dairy Cattle and Milk Production' },
        ]},
      ]},
    ],
  },
  {
    code: '21', name: 'Mining, Quarrying, and Oil and Gas Extraction',
    children: [
      { code: '211', name: 'Oil and Gas Extraction', children: [
        { code: '2111', name: 'Oil and Gas Extraction', children: [
          { code: '21112', name: 'Crude Petroleum Extraction' },
          { code: '21113', name: 'Natural Gas Extraction' },
        ]},
      ]},
    ],
  },
  {
    code: '22', name: 'Utilities',
    children: [
      { code: '221', name: 'Utilities', children: [
        { code: '2211', name: 'Electric Power Generation, Transmission and Distribution', children: [
          { code: '22111', name: 'Electric Power Generation' },
          { code: '22112', name: 'Electric Power Transmission, Control, and Distribution' },
        ]},
        { code: '2213', name: 'Water, Sewage and Other Systems', children: [
          { code: '22131', name: 'Water Supply and Irrigation Systems' },
        ]},
      ]},
    ],
  },
  {
    code: '23', name: 'Construction',
    children: [
      { code: '236', name: 'Construction of Buildings', children: [
        { code: '2361', name: 'Residential Building Construction', children: [
          { code: '23611', name: 'Residential Building Construction' },
        ]},
        { code: '2362', name: 'Nonresidential Building Construction', children: [
          { code: '23621', name: 'Industrial Building Construction' },
          { code: '23622', name: 'Commercial and Institutional Building Construction' },
        ]},
      ]},
      { code: '237', name: 'Heavy and Civil Engineering Construction', children: [
        { code: '2371', name: 'Utility System Construction', children: [
          { code: '23711', name: 'Water and Sewer Line and Related Structures Construction' },
        ]},
      ]},
      { code: '238', name: 'Specialty Trade Contractors', children: [
        { code: '2382', name: 'Building Equipment Contractors', children: [
          { code: '23821', name: 'Electrical Contractors and Other Wiring Installation Contractors' },
          { code: '23822', name: 'Plumbing, Heating, and Air-Conditioning Contractors' },
        ]},
      ]},
    ],
  },
  {
    code: '31-33', name: 'Manufacturing',
    children: [
      { code: '311', name: 'Food Manufacturing', children: [
        { code: '3111', name: 'Animal Food Manufacturing', children: [
          { code: '31111', name: 'Animal Food Manufacturing' },
        ]},
        { code: '3118', name: 'Bakeries and Tortilla Manufacturing', children: [
          { code: '31181', name: 'Bread and Bakery Product Manufacturing' },
        ]},
      ]},
      { code: '325', name: 'Chemical Manufacturing', children: [
        { code: '3254', name: 'Pharmaceutical and Medicine Manufacturing', children: [
          { code: '32541', name: 'Pharmaceutical and Medicine Manufacturing' },
        ]},
      ]},
      { code: '334', name: 'Computer and Electronic Product Manufacturing', children: [
        { code: '3341', name: 'Computer and Peripheral Equipment Manufacturing', children: [
          { code: '33411', name: 'Computer and Peripheral Equipment Manufacturing' },
        ]},
        { code: '3342', name: 'Communications Equipment Manufacturing', children: [
          { code: '33421', name: 'Telephone Apparatus Manufacturing' },
        ]},
        { code: '3344', name: 'Semiconductor and Other Electronic Component Manufacturing', children: [
          { code: '33441', name: 'Semiconductor and Other Electronic Component Manufacturing' },
        ]},
      ]},
      { code: '336', name: 'Transportation Equipment Manufacturing', children: [
        { code: '3361', name: 'Motor Vehicle Manufacturing', children: [
          { code: '33611', name: 'Automobile and Light Duty Motor Vehicle Manufacturing' },
        ]},
      ]},
    ],
  },
  {
    code: '42', name: 'Wholesale Trade',
    children: [
      { code: '423', name: 'Merchant Wholesalers, Durable Goods', children: [
        { code: '4234', name: 'Professional and Commercial Equipment and Supplies Merchant Wholesalers', children: [
          { code: '42343', name: 'Computer and Computer Peripheral Equipment and Software Merchant Wholesalers' },
        ]},
      ]},
    ],
  },
  {
    code: '44-45', name: 'Retail Trade',
    children: [
      { code: '445', name: 'Food and Beverage Retailers', children: [
        { code: '4451', name: 'Grocery and Convenience Retailers', children: [
          { code: '44511', name: 'Supermarkets and Other Grocery Retailers' },
        ]},
      ]},
      { code: '449', name: 'Furniture, Home Furnishings, Electronics, and Appliance Retailers', children: [
        { code: '4491', name: 'Furniture and Home Furnishings Retailers', children: [
          { code: '44911', name: 'Furniture Retailers' },
        ]},
      ]},
    ],
  },
  {
    code: '48-49', name: 'Transportation and Warehousing',
    children: [
      { code: '481', name: 'Air Transportation', children: [
        { code: '4811', name: 'Scheduled Air Transportation', children: [
          { code: '48111', name: 'Scheduled Air Transportation' },
        ]},
      ]},
      { code: '484', name: 'Truck Transportation', children: [
        { code: '4841', name: 'General Freight Trucking', children: [
          { code: '48411', name: 'General Freight Trucking, Local' },
          { code: '48412', name: 'General Freight Trucking, Long-Distance' },
        ]},
      ]},
      { code: '493', name: 'Warehousing and Storage', children: [
        { code: '4931', name: 'Warehousing and Storage', children: [
          { code: '49311', name: 'General Warehousing and Storage' },
          { code: '49312', name: 'Refrigerated Warehousing and Storage' },
        ]},
      ]},
    ],
  },
  {
    code: '51', name: 'Information',
    children: [
      { code: '511', name: 'Publishing Industries', children: [
        { code: '5111', name: 'Newspaper, Periodical, Book, and Directory Publishers', children: [
          { code: '51112', name: 'Periodical Publishers' },
          { code: '51113', name: 'Book Publishers' },
        ]},
        { code: '5112', name: 'Software Publishers', children: [
          { code: '51321', name: 'Software Publishers' },
        ]},
      ]},
      { code: '512', name: 'Motion Picture and Sound Recording Industries', children: [
        { code: '5121', name: 'Motion Picture and Video Industries', children: [
          { code: '51211', name: 'Motion Picture and Video Production' },
        ]},
      ]},
      { code: '516', name: 'Broadcasting and Content Providers', children: [
        { code: '5161', name: 'Radio and Television Broadcasting Stations', children: [
          { code: '51611', name: 'Radio Broadcasting Stations' },
          { code: '51612', name: 'Television Broadcasting Stations' },
        ]},
      ]},
      { code: '517', name: 'Telecommunications', children: [
        { code: '5173', name: 'Wired and Wireless Telecommunications Carriers', children: [
          { code: '51731', name: 'Wired and Wireless Telecommunications Carriers' },
        ]},
      ]},
      { code: '518', name: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services', children: [
        { code: '5182', name: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services', children: [
          { code: '51821', name: 'Computing Infrastructure Providers, Data Processing, Web Hosting, and Related Services' },
        ]},
      ]},
      { code: '519', name: 'Web Search Portals, Libraries, Archives, and Other Information Services', children: [
        { code: '5192', name: 'Web Search Portals, Libraries, Archives, and Other Information Services', children: [
          { code: '51921', name: 'Libraries and Archives' },
          { code: '51929', name: 'Web Search Portals and All Other Information Services' },
        ]},
      ]},
    ],
  },
  {
    code: '52', name: 'Finance and Insurance',
    children: [
      { code: '521', name: 'Monetary Authorities-Central Bank', children: [
        { code: '5211', name: 'Monetary Authorities-Central Bank', children: [
          { code: '52111', name: 'Monetary Authorities-Central Bank' },
        ]},
      ]},
      { code: '522', name: 'Credit Intermediation and Related Activities', children: [
        { code: '5221', name: 'Depository Credit Intermediation', children: [
          { code: '52211', name: 'Commercial Banking' },
          { code: '52213', name: 'Credit Unions' },
        ]},
        { code: '5222', name: 'Nondepository Credit Intermediation', children: [
          { code: '52222', name: 'Sales Financing' },
          { code: '52229', name: 'Other Nondepository Credit Intermediation' },
        ]},
      ]},
      { code: '523', name: 'Securities, Commodity Contracts, and Other Financial Investments and Related Activities', children: [
        { code: '5231', name: 'Securities and Commodity Contracts Intermediation and Brokerage', children: [
          { code: '52312', name: 'Securities Brokerage' },
          { code: '52315', name: 'Investment Banking and Securities Intermediation' },
        ]},
        { code: '5239', name: 'Other Financial Investment Activities', children: [
          { code: '52391', name: 'Miscellaneous Intermediation' },
          { code: '52393', name: 'Investment Advice' },
        ]},
      ]},
      { code: '524', name: 'Insurance Carriers and Related Activities', children: [
        { code: '5241', name: 'Insurance Carriers', children: [
          { code: '52411', name: 'Direct Life, Health, and Medical Insurance Carriers' },
          { code: '52412', name: 'Direct Insurance (except Life, Health, and Medical) Carriers' },
        ]},
        { code: '5242', name: 'Agencies, Brokerages, and Other Insurance Related Activities', children: [
          { code: '52421', name: 'Insurance Agencies and Brokerages' },
        ]},
      ]},
      { code: '525', name: 'Funds, Trusts, and Other Financial Vehicles', children: [
        { code: '5251', name: 'Insurance and Employee Benefit Funds', children: [
          { code: '52511', name: 'Pension Funds' },
        ]},
        { code: '5259', name: 'Other Investment Pools and Funds', children: [
          { code: '52591', name: 'Open-End Investment Funds' },
          { code: '52599', name: 'Other Financial Vehicles' },
        ]},
      ]},
    ],
  },
  {
    code: '53', name: 'Real Estate and Rental and Leasing',
    children: [
      { code: '531', name: 'Real Estate', children: [
        { code: '5311', name: 'Lessors of Real Estate', children: [
          { code: '53111', name: 'Lessors of Residential Buildings and Dwellings' },
          { code: '53112', name: 'Lessors of Nonresidential Buildings (except Miniwarehouses)' },
        ]},
        { code: '5312', name: 'Offices of Real Estate Agents and Brokers', children: [
          { code: '53121', name: 'Offices of Real Estate Agents and Brokers' },
        ]},
      ]},
    ],
  },
  {
    code: '54', name: 'Professional, Scientific, and Technical Services',
    children: [
      { code: '541', name: 'Professional, Scientific, and Technical Services', children: [
        { code: '5411', name: 'Legal Services', children: [
          { code: '54111', name: 'Offices of Lawyers' },
          { code: '54112', name: 'Offices of Notaries' },
        ]},
        { code: '5412', name: 'Accounting, Tax Preparation, Bookkeeping, and Payroll Services', children: [
          { code: '54121', name: 'Accounting, Tax Preparation, Bookkeeping, and Payroll Services' },
        ]},
        { code: '5413', name: 'Architectural, Engineering, and Related Services', children: [
          { code: '54131', name: 'Architectural Services' },
          { code: '54133', name: 'Engineering Services' },
        ]},
        { code: '5414', name: 'Specialized Design Services', children: [
          { code: '54143', name: 'Graphic Design Services' },
        ]},
        { code: '5415', name: 'Computer Systems Design and Related Services', children: [
          { code: '54151', name: 'Computer Systems Design and Related Services' },
        ]},
        { code: '5416', name: 'Management, Scientific, and Technical Consulting Services', children: [
          { code: '54161', name: 'Management Consulting Services' },
          { code: '54162', name: 'Environmental Consulting Services' },
        ]},
        { code: '5417', name: 'Scientific Research and Development Services', children: [
          { code: '54171', name: 'Research and Development in the Physical, Engineering, and Life Sciences' },
        ]},
        { code: '5418', name: 'Advertising, Public Relations, and Related Services', children: [
          { code: '54181', name: 'Advertising Agencies' },
          { code: '54182', name: 'Public Relations Agencies' },
        ]},
      ]},
    ],
  },
  {
    code: '55', name: 'Management of Companies and Enterprises',
    children: [
      { code: '551', name: 'Management of Companies and Enterprises', children: [
        { code: '5511', name: 'Management of Companies and Enterprises', children: [
          { code: '55111', name: 'Management of Companies and Enterprises' },
        ]},
      ]},
    ],
  },
  {
    code: '56', name: 'Administrative and Support and Waste Management and Remediation Services',
    children: [
      { code: '561', name: 'Administrative and Support Services', children: [
        { code: '5613', name: 'Employment Services', children: [
          { code: '56131', name: 'Employment Placement Agencies and Executive Search Services' },
          { code: '56132', name: 'Temporary Help Services' },
        ]},
        { code: '5614', name: 'Business Support Services', children: [
          { code: '56141', name: 'Document Preparation Services' },
          { code: '56142', name: 'Telephone Call Centers' },
        ]},
      ]},
    ],
  },
  {
    code: '61', name: 'Educational Services',
    children: [
      { code: '611', name: 'Educational Services', children: [
        { code: '6111', name: 'Elementary and Secondary Schools', children: [
          { code: '61111', name: 'Elementary and Secondary Schools' },
        ]},
        { code: '6113', name: 'Colleges, Universities, and Professional Schools', children: [
          { code: '61131', name: 'Colleges, Universities, and Professional Schools' },
        ]},
      ]},
    ],
  },
  {
    code: '62', name: 'Health Care and Social Assistance',
    children: [
      { code: '621', name: 'Ambulatory Health Care Services', children: [
        { code: '6211', name: 'Offices of Physicians', children: [
          { code: '62111', name: 'Offices of Physicians' },
        ]},
        { code: '6212', name: 'Offices of Dentists', children: [
          { code: '62121', name: 'Offices of Dentists' },
        ]},
      ]},
      { code: '622', name: 'Hospitals', children: [
        { code: '6221', name: 'General Medical and Surgical Hospitals', children: [
          { code: '62211', name: 'General Medical and Surgical Hospitals' },
        ]},
      ]},
      { code: '623', name: 'Nursing and Residential Care Facilities', children: [
        { code: '6231', name: 'Nursing Care Facilities (Skilled Nursing Facilities)', children: [
          { code: '62311', name: 'Nursing Care Facilities (Skilled Nursing Facilities)' },
        ]},
      ]},
    ],
  },
  {
    code: '71', name: 'Arts, Entertainment, and Recreation',
    children: [
      { code: '711', name: 'Performing Arts, Spectator Sports, and Related Industries', children: [
        { code: '7111', name: 'Performing Arts Companies', children: [
          { code: '71111', name: 'Theater Companies and Dinner Theaters' },
        ]},
      ]},
    ],
  },
  {
    code: '72', name: 'Accommodation and Food Services',
    children: [
      { code: '721', name: 'Accommodation', children: [
        { code: '7211', name: 'Traveler Accommodation', children: [
          { code: '72111', name: 'Hotels (except Casino Hotels) and Motels' },
        ]},
      ]},
      { code: '722', name: 'Food Services and Drinking Places', children: [
        { code: '7225', name: 'Restaurants and Other Eating Places', children: [
          { code: '72251', name: 'Restaurants and Other Eating Places' },
        ]},
      ]},
    ],
  },
  {
    code: '81', name: 'Other Services (except Public Administration)',
    children: [
      { code: '811', name: 'Repair and Maintenance', children: [
        { code: '8111', name: 'Automotive Repair and Maintenance', children: [
          { code: '81111', name: 'Automotive Mechanical and Electrical Repair and Maintenance' },
        ]},
      ]},
      { code: '813', name: 'Religious, Grantmaking, Civic, Professional, and Similar Organizations', children: [
        { code: '8131', name: 'Religious Organizations', children: [
          { code: '81311', name: 'Religious Organizations' },
        ]},
        { code: '8132', name: 'Grantmaking and Giving Services', children: [
          { code: '81321', name: 'Grantmaking and Giving Services' },
        ]},
      ]},
    ],
  },
  {
    code: '92', name: 'Public Administration',
    children: [
      { code: '921', name: 'Executive, Legislative, and Other General Government Support', children: [
        { code: '9211', name: 'Executive, Legislative, and Other General Government Support', children: [
          { code: '92111', name: 'Executive Offices' },
          { code: '92114', name: 'Legislative Bodies' },
        ]},
      ]},
    ],
  },
];

/**
 * Flat lookup used by getNodeByCode. Built once at module load.
 */
const FLAT_INDEX: Record<string, NaicsNode> = (() => {
  const idx: Record<string, NaicsNode> = {};
  const walk = (nodes: NaicsNode[]) => {
    nodes.forEach((n) => {
      idx[n.code] = n;
      if (n.children) walk(n.children);
    });
  };
  walk(NAICS);
  return idx;
})();

export function getNodeByCode(code: string): NaicsNode | undefined {
  return FLAT_INDEX[code];
}

/**
 * Parent-code chain lookup. Sectors and subsectors share the first
 * 2/3 digits, but sectors 31-33, 44-45, and 48-49 use hyphenated codes
 * so we walk the tree instead of slicing strings.
 */
export function getAncestors(code: string): NaicsNode[] {
  const findPath = (nodes: NaicsNode[], target: string, path: NaicsNode[]): NaicsNode[] | null => {
    for (const n of nodes) {
      const next = [...path, n];
      if (n.code === target) return next;
      if (n.children) {
        const found = findPath(n.children, target, next);
        if (found) return found;
      }
    }
    return null;
  };
  return findPath(NAICS, code, []) || [];
}

export function getSectors(): NaicsNode[] {
  return NAICS;
}

export function getChildren(parentCode: string): NaicsNode[] {
  return FLAT_INDEX[parentCode]?.children || [];
}

/** Formatted "code — name" label used by the Industries card. */
export function formatCodeLabel(n: NaicsNode): string {
  return `${n.code} — ${n.name}`;
}
