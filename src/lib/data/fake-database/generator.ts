/**
 * Deterministic fake contact database generator.
 * Generates 2,847 contacts every time using a seeded PRNG.
 * Includes intentional near-duplicates for AI dedup demos.
 */

import { ContactWithEntries } from '@/types/contact';
import { INTENTIONAL_DUPLICATES } from './intentional-duplicates';

// ─── Mulberry32 PRNG (seeded) ────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42); // fixed seed for deterministic output
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ─── Name pools ──────────────────────────────────────────────────
const FIRST_NAMES = [
  'Aaron','Abigail','Adam','Adrian','Aiden','Alex','Alexa','Alexander','Alice','Alicia','Allison','Amanda','Amber','Amy','Andrea','Andrew','Angela','Anna','Anthony','April',
  'Ariana','Arthur','Ashley','Aubrey','Audrey','Austin','Ava','Bailey','Barbara','Beatrice','Benjamin','Beverly','Bianca','Blake','Bonnie','Bradley','Brandon','Brenda','Brian','Brianna',
  'Brittany','Brooke','Bruce','Bryan','Caleb','Cameron','Camila','Carl','Carlos','Carol','Caroline','Carter','Catherine','Cathy','Chad','Charles','Charlotte','Chase','Chelsea','Cheryl',
  'Chris','Christian','Christina','Christine','Christopher','Cindy','Claire','Cody','Cole','Colin','Connor','Cooper','Corey','Craig','Crystal','Curtis','Cynthia','Daniel','Danielle','Dante',
  'Daria','Darren','David','Dawn','Dean','Deborah','Denise','Dennis','Derek','Diana','Diane','Donald','Donna','Doris','Dorothy','Douglas','Dustin','Dylan','Edward','Eileen',
  'Elaine','Eleanor','Elena','Eli','Elijah','Elizabeth','Ella','Ellen','Emily','Emma','Eric','Erica','Erin','Ethan','Eva','Evan','Evelyn','Faith','Felix','Fiona',
  'Frances','Frank','Gabriel','Gabriella','Gary','George','Georgia','Gerald','Gloria','Grace','Grant','Gregory','Hailey','Hannah','Harold','Harper','Harry','Hayden','Heather','Helen',
  'Henry','Holly','Ian','Iris','Isaac','Isabel','Isabella','Jack','Jackson','Jacob','Jacqueline','James','Jamie','Jane','Janet','Janice','Jared','Jasmine','Jason','Jay',
  'Jean','Jeffrey','Jenna','Jennifer','Jeremy','Jesse','Jessica','Jill','Jim','Joan','Joel','John','Jonathan','Jordan','Joseph','Joshua','Joy','Joyce','Juan','Judith',
  'Judy','Julia','Julian','Julie','Justin','Karen','Katherine','Kathleen','Kathy','Katie','Kayla','Keith','Kelly','Kenneth','Kevin','Kim','Kimberly','Kristen','Kyle','Larry',
  'Laura','Lauren','Lawrence','Leah','Leo','Leonard','Leslie','Lily','Linda','Lisa','Logan','Lori','Louis','Lucas','Lucy','Luke','Lydia','Madison','Marcus','Margaret',
  'Maria','Marie','Marilyn','Mark','Martha','Martin','Mary','Mason','Matthew','Maya','Megan','Melanie','Melissa','Mia','Michael','Michelle','Mike','Miranda','Molly','Monica',
  'Morgan','Nancy','Natalie','Nathan','Nicholas','Nicole','Noah','Norma','Olivia','Oscar','Owen','Pamela','Patricia','Patrick','Paul','Paula','Peter','Philip','Phyllis','Rachel',
  'Ralph','Randy','Raymond','Rebecca','Reed','Regina','Renee','Richard','Riley','Robert','Robin','Roger','Ronald','Rose','Ruby','Russell','Ruth','Ryan','Sabrina','Samantha',
  'Samuel','Sandra','Sara','Sarah','Scott','Sean','Sebastian','Sergio','Seth','Shannon','Sharon','Shirley','Sierra','Simon','Sofia','Sophia','Stanley','Stephanie','Stephen','Steven',
  'Susan','Sydney','Sylvia','Tanya','Taylor','Teresa','Terri','Terry','Theodore','Theresa','Thomas','Tiffany','Timothy','Tina','Todd','Tony','Tracy','Travis','Trevor','Tyler',
  'Valerie','Vanessa','Veronica','Victor','Victoria','Vincent','Virginia','Walter','Wayne','Wendy','William','Willie','Xavier','Yvonne','Zachary','Zoe',
];

const LAST_NAMES = [
  'Adams','Aguilar','Alexander','Allen','Alvarez','Anderson','Andrews','Armstrong','Arnold','Bailey','Baker','Banks','Barnes','Bell','Bennett','Black','Bradley','Brooks','Brown','Bryant',
  'Burns','Butler','Campbell','Carpenter','Carroll','Carter','Castillo','Castro','Chavez','Chen','Clark','Cole','Coleman','Collins','Cook','Cooper','Cox','Crawford','Cruz','Cunningham',
  'Daniels','Davidson','Davis','Day','Dean','Diaz','Dixon','Duncan','Edwards','Elliott','Ellis','Evans','Ferguson','Fernandez','Fisher','Fletcher','Flores','Ford','Foster','Fox',
  'Franklin','Freeman','Garcia','Gardner','Gibson','Gomez','Gonzalez','Graham','Grant','Gray','Green','Griffin','Gutierrez','Hall','Hamilton','Hansen','Harper','Harris','Harrison','Hart',
  'Harvey','Hayes','Henderson','Henry','Hernandez','Herrera','Hicks','Hill','Holmes','Howard','Hudson','Hughes','Hunt','Hunter','Jackson','Jacobs','James','Jenkins','Jensen','Jimenez',
  'Johnson','Jones','Jordan','Kelly','Kennedy','Kim','King','Knight','Lawrence','Lee','Lewis','Long','Lopez','Lynch','Marshall','Martin','Martinez','Mason','Matthews','McCarthy',
  'McDonald','Medina','Mendez','Mendoza','Meyer','Miller','Mills','Mitchell','Moore','Morales','Moreno','Morgan','Morris','Murphy','Murray','Myers','Nelson','Nguyen','Nichols','Olson',
  'Ortiz','Owens','Palmer','Park','Parker','Patel','Patterson','Payne','Pearson','Perez','Perry','Peters','Peterson','Phillips','Pierce','Porter','Powell','Price','Ramirez','Ramos',
  'Reed','Reyes','Reynolds','Rice','Richardson','Rivera','Roberts','Robinson','Rodriguez','Rogers','Romero','Rose','Ross','Ruiz','Russell','Ryan','Sanchez','Sanders','Schmidt','Schneider',
  'Schultz','Scott','Shaw','Silva','Simmons','Simpson','Singh','Smith','Snyder','Soto','Spencer','Stanley','Stevens','Stewart','Stone','Sullivan','Taylor','Thomas','Thompson','Torres',
  'Tucker','Turner','Vargas','Vasquez','Wagner','Walker','Wallace','Ward','Warren','Washington','Watson','Weaver','Webb','Welch','Wells','West','Wheeler','White','Williams','Wilson',
  'Wood','Woods','Wright','Yang','Young','Zhang',
];

// ─── Company pools ───────────────────────────────────────────────
const COMPANY_NAMES = [
  'Meridian Capital Group','Vertex Analytics','Clearpath Advisors','Harborline Financial','Apex Industries','Stellar Logistics','Pinnacle Software','Crestwood Partners','Brightline Health',
  'Cypress Trading','Northbeam Tech','Riverstone Bank','Granite Manufacturing','Acme Corporation','Beacon Consulting','Cobalt Systems','Drift Marketing','Echo Robotics','Forge Foundry',
  'Glacier Insurance','Helix Pharmaceuticals','Ironclad Security','Juniper Foods','Keystone Energy','Lighthouse Media','Mosaic Architects','Nexus Mobility','Oak Tree Realty','Phoenix Aerospace',
  'Quantum Devices','Redwood Holdings','Sapphire Networks','Tidal Wave Studios','Union Square Ventures','Verdant Agriculture','Wellspring Wellness','Xenith Materials','Yardley Brewing','Zephyr Cloud',
  'Aldrich Logistics','Bramble Foods','Coastline Realty','Dunwell Industries','Emberly Designs','Fairmont Hospitality','Glasswing Optics','Hawthorn Legal','Indigo Valley Wines','Jasper Mining',
  'Karst Geological','Lakeshore Marine','Maplewood Furniture','Northgate Properties','Olympia Sports','Patagonia Outdoors','Quincy Bookstore','Ridgeline Camping','Sierra Pacific Lumber','Tundra Telecom',
  'Uptown Couture','Valley Brewing Co','Westport Capital','Yorkshire Tea','Zenith Audio','Anchor Maritime','Bedrock Construction','Cascade Pharmacy','Driftwood Realty','Equinox Fitness',
  'Fountainhead Press','Gateway Solutions','Harvester Foods','Isolde Cosmetics','Jubilee Toys','Kingsway Apparel','Lantern Brewing','Monarch Mortgage','Notable Records','Outpost Adventure',
  'Parable Education','Quartermaster Supply','Ravenwood Studios','Salt Marsh Foods','Telegraph Media','Underwood Stationery','Vanguard Defense','Westridge Mining','Xavier Holdings','Yellowstone Outfitters',
  'Zion National Tours','Atlas Aerospace','Belmont Records','Cinnabar Refining','Dauntless Marine','Ember Lighting','Frontier Telecom','Gemstone Jewelry','Hilltop Coffee','Ivory Tower Books',
  'Jet Stream Aviation','Kestrel Drone','Liberty Fuel','Marquis Hotels','Nightshade Cosmetics','Onyx Properties','Polaris Navigation','Quill Publishing','Roanoke Wines','Saltwater Surf',
  'Tempest Sailing','Underground Vinyl','Vintage Cellar','Whitewater Rafting','Xenon Lighting','Yarn & Loom','Zydeco Records','Aspen Resorts','Bluestone Builders','Cypress Cove Hotels',
  'Driftwood Beach Co','Evergreen Forestry','Falconer Audio','Goldleaf Bakery','Highlander Tea','Iceberg Refrigeration','Jadestone Imports','Kindling Stoves','Lighthouse Tours','Mosswood Camping',
  'Norse Steel','Oasis Spas','Petalsmith Florals','Quay Logistics','Riverboat Tours','Snowdrift Apparel','Twilight Inns','Underbrush Trails','Voyageur Outfitters','Westcliff Homes',
  'Xanadu Resorts','Yuletide Decor','Zealand Wool',
];

const COMPANY_DOMAINS = COMPANY_NAMES.map((c) =>
  c.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com'
);

const INDUSTRIES = [
  'Financial Services','Software','Healthcare','Manufacturing','Logistics','Real Estate','Energy','Media','Consulting','Aerospace',
  'Pharmaceuticals','Insurance','Construction','Hospitality','Retail','Transportation','Telecommunications','Education','Entertainment','Agriculture',
];

const TITLES_BY_LEVEL = {
  'C-Suite': ['CEO','CFO','CTO','COO','CMO','CIO','Chief Strategy Officer','Chief People Officer'],
  'VP': ['VP of Engineering','VP of Sales','VP of Marketing','VP of Operations','VP of Product','VP of Finance','VP of Customer Success'],
  'Director': ['Director of Engineering','Director of Sales','Director of Marketing','Director of Operations','Director of Finance','Director of People'],
  'Manager': ['Engineering Manager','Sales Manager','Marketing Manager','Product Manager','Operations Manager','Finance Manager','HR Manager'],
  'IC': ['Senior Engineer','Software Engineer','Product Designer','Account Executive','Marketing Specialist','Financial Analyst','Operations Analyst','Customer Success Manager'],
};

const DEPARTMENTS = ['Engineering','Sales','Marketing','Operations','Finance','HR','Customer Success','Product','Legal','Research','Compliance'];

const STATES = ['NY','CA','MA','TX','IL','FL','WA','CO','GA','PA','OH','NC','MI','VA','NJ','AZ','TN','IN','MO','MD','WI','MN','SC','AL','LA','KY','OR','OK','CT','UT','NV','AR','MS','KS','NM','NE','WV','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WY'];

const CITIES = [
  ['New York','NY','10001'],['San Francisco','CA','94102'],['Boston','MA','02108'],['Austin','TX','73301'],['Chicago','IL','60601'],['Miami','FL','33101'],
  ['Seattle','WA','98101'],['Denver','CO','80202'],['Atlanta','GA','30301'],['Philadelphia','PA','19101'],['Columbus','OH','43215'],['Charlotte','NC','28201'],
  ['Detroit','MI','48201'],['Richmond','VA','23218'],['Newark','NJ','07101'],['Phoenix','AZ','85001'],['Nashville','TN','37201'],['Indianapolis','IN','46201'],
  ['St. Louis','MO','63101'],['Baltimore','MD','21201'],['Milwaukee','WI','53201'],['Minneapolis','MN','55401'],['Charleston','SC','29401'],['Birmingham','AL','35201'],
];

const AVATAR_COLORS = ['#1955A6','#3BAFC4','#6A0FB8','#D96FA8','#247A8A','#D4A61A','#4A6741','#B8543E','#5C7CFA','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

// ─── Helpers ─────────────────────────────────────────────────────
function pad(n: number, len = 4) { return String(n).padStart(len, '0'); }

function makePhone(): string {
  const area = 200 + Math.floor(rand() * 700);
  const mid = 100 + Math.floor(rand() * 900);
  const last = 1000 + Math.floor(rand() * 9000);
  return `+1 (${area}) ${mid}-${last}`;
}

function makeEmail(first: string, last: string, companyDomain: string): string {
  const formats = [
    `${first}.${last}`,
    `${first[0]}${last}`,
    `${first}${last[0]}`,
    `${first}_${last}`,
  ];
  return `${pick(formats).toLowerCase()}@${companyDomain}`;
}

function makeAddress() {
  const streetNum = 100 + Math.floor(rand() * 9900);
  const streets = ['Main St','Elm Ave','Park Blvd','Oak Dr','Pine Ln','Maple Ct','Cedar Way','Washington Ave','Lake Rd','Hill St'];
  const [city, state, zip] = pick(CITIES);
  return { street: `${streetNum} ${pick(streets)}`, city, state, zip };
}

function pickLevel(): keyof typeof TITLES_BY_LEVEL {
  // Realistic distribution: more ICs and managers than C-suite
  const r = rand();
  if (r < 0.05) return 'C-Suite';
  if (r < 0.20) return 'VP';
  if (r < 0.40) return 'Director';
  if (r < 0.65) return 'Manager';
  return 'IC';
}

function makePerson(seq: number, companyIdx: number): ContactWithEntries {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const company = COMPANY_NAMES[companyIdx];
  const domain = COMPANY_DOMAINS[companyIdx];
  const level = pickLevel();
  const title = pick(TITLES_BY_LEVEL[level]);
  const department = pick(DEPARTMENTS);
  const phone = makePhone();
  const email = makeEmail(firstName, lastName, domain);
  const address = makeAddress();
  const fullName = `${firstName} ${lastName}`;

  return {
    id: `fake-per-${pad(seq, 5)}`,
    type: 'person',
    name: fullName,
    title, department,
    orgId: `fake-org-${pad(companyIdx, 4)}`,
    orgName: company,
    email, phone,
    status: 'active',
    lastUpdated: '2026-04-01',
    stale: rand() < 0.08,
    aiStatus: rand() < 0.05 ? 'new' : 'verified',
    avatarColor: pick(AVATAR_COLORS),
    createdBy: 'System',
    entries: {
      addresses: [{ id: `a-${seq}`, type: 'Work', value: address.street, city: address.city, state: address.state, zip: address.zip, primary: true }],
      emails: [{ id: `e-${seq}`, type: 'Work', value: email, primary: true }],
      phones: [{ id: `p-${seq}`, type: 'Mobile', value: phone, primary: true }],
      websites: [],
      names: [{ id: `n-${seq}`, type: 'Primary · Legal', value: fullName, primary: true, firstName, lastName }],
      identifiers: [],
      industries: [],
    },
  } as ContactWithEntries;
}

function makeOrg(seq: number, idx: number): ContactWithEntries {
  const name = COMPANY_NAMES[idx];
  const domain = COMPANY_DOMAINS[idx];
  const industry = pick(INDUSTRIES);
  const employees = pick(['25-50','50-100','100-250','250-500','500-1000','1000-5000','5000+']);
  const address = makeAddress();
  const phone = makePhone();

  return {
    id: `fake-org-${pad(idx, 4)}`,
    type: 'org',
    name,
    industry, employees,
    hq: `${address.city}, ${address.state}`,
    website: domain,
    description: `${industry} company specializing in ${pick(['enterprise solutions','consumer products','B2B services','strategic partnerships','custom implementations'])}.`,
    status: 'active',
    lastUpdated: '2026-03-15',
    stale: rand() < 0.06,
    aiStatus: rand() < 0.04 ? 'new' : 'verified',
    avatarColor: pick(AVATAR_COLORS),
    createdBy: 'System',
    entries: {
      addresses: [{ id: `a-${seq}`, type: 'HQ', value: address.street, city: address.city, state: address.state, zip: address.zip, primary: true }],
      emails: [{ id: `e-${seq}`, type: 'Work', value: `info@${domain}`, primary: true }],
      phones: [{ id: `p-${seq}`, type: 'Office', value: phone, primary: true }],
      websites: [{ id: `w-${seq}`, type: 'Primary', value: domain, primary: true }],
      names: [{ id: `n-${seq}`, type: 'Primary · Legal', value: name, primary: true }],
      identifiers: [],
      industries: [],
    },
  } as ContactWithEntries;
}

// ─── Generator ────────────────────────────────────────────────────
let _cached: ContactWithEntries[] | null = null;

export function getFakeContacts(): ContactWithEntries[] {
  if (_cached) return _cached;

  const out: ContactWithEntries[] = [];

  // 1) Generate one org per company name (~150)
  for (let i = 0; i < COMPANY_NAMES.length; i++) {
    out.push(makeOrg(i, i));
  }

  // 2) Generate persons until we hit 2,847 total
  let seq = 0;
  const targetTotal = 2847;
  while (out.length < targetTotal - INTENTIONAL_DUPLICATES.length) {
    const companyIdx = Math.floor(rand() * COMPANY_NAMES.length);
    out.push(makePerson(seq++, companyIdx));
  }

  // 3) Insert intentional duplicate clusters
  for (const dup of INTENTIONAL_DUPLICATES) {
    out.push(dup);
  }

  _cached = out;
  return out;
}

export function getFakeContactCount(): number {
  return getFakeContacts().length;
}
