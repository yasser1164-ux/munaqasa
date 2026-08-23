// ---- SAMPLE BOARD -----------------------------------------------------------
// A worked example so the app is never an empty screen: six requests at every
// stage of the cycle — open, closing tonight, opened for comparison, awarded.
// It is demo data, priced in plausible Eastern Province ranges, and it vanishes
// the moment there is anything real on the board (see mzLoadBoard in store.js).
//
// Dates are relative to right now, so the demo is never stale.

const mzDay = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};
const mzDate = n => mzDay(n).slice(0, 10);
const mzHours = n => new Date(Date.now() + n * 3600 * 1000).toISOString();

// One request belongs to whoever is looking, so the buyer's side of the app —
// the sealed bids opening, the comparison table, the award — can be seen
// without waiting three days for a tender to close.
const MZ_DEMO_OWNER = mzMe().key;
const MZ_OTHER = 'demo-other-buyer';

const MZ_SEED = {
  tenders: [
    {
      id: 'seed-foundation', ref: 'RFQ-4821',
      title: 'Villa foundation package — 3 units, Al Khobar',
      buyerName: 'Site office', buyerCompany: 'Al Bahr Contracting', buyerPhone: '',
      city: 'Al Khobar', site: 'Al Aqrabiyah, plot 44 — crane on site, deliver 6–11 AM',
      neededBy: mzDate(6), closesAt: mzHours(-14), createdAt: mzDay(-5),
      items: [
        { material: 'cement', spec: 'OPC Type I, 50 kg bags', qty: 400, unit: 'bag' },
        { material: 'rebar', spec: 'Grade 60, 16 mm — cut & bent to schedule', qty: 12, unit: 'tonne' },
        { material: 'aggregate', spec: '3/4" washed', qty: 40, unit: 'm3' }
      ],
      notes: 'Mill certificate required for the rebar. Offloading is on us.',
      ownerKey: MZ_DEMO_OWNER, bidCount: 4, awardedBidId: null, demo: true
    },
    {
      id: 'seed-slab', ref: 'RFQ-4830',
      title: 'Ready-mix pour — warehouse slab, Dammam',
      buyerName: 'Procurement', buyerCompany: 'Gulf Steel Works', buyerPhone: '',
      city: 'Dammam', site: 'Second Industrial City — pump access from the north gate',
      neededBy: mzDate(9), closesAt: mzHours(72), createdAt: mzDay(-1),
      items: [
        { material: 'readymix', spec: 'C35, 100 mm slump, retarder for a 4-hour pour', qty: 180, unit: 'm3' },
        { material: 'steel', spec: 'Mesh A393, 6 m x 2.4 m sheets', qty: 3.5, unit: 'tonne' }
      ],
      notes: 'Continuous pour from 5 AM. Quote the pump separately in the notes.',
      ownerKey: MZ_OTHER, bidCount: 5, awardedBidId: null, demo: true
    },
    {
      id: 'seed-blocks', ref: 'RFQ-4834',
      title: 'Block work — 40,000 blocks, Qatif',
      buyerName: 'Abu Faisal', buyerCompany: 'Najd Build', buyerPhone: '',
      city: 'Qatif', site: 'Awamiyah housing scheme — staged over three weeks',
      neededBy: mzDate(11), closesAt: mzHours(6), createdAt: mzDay(-2),
      items: [
        { material: 'blocks', spec: '20 cm hollow, 7 N/mm²', qty: 40000, unit: 'piece' },
        { material: 'cement', spec: 'Masonry cement for mortar', qty: 250, unit: 'bag' },
        { material: 'sand', spec: 'Washed plaster sand', qty: 60, unit: 'm3' }
      ],
      notes: 'Staged delivery — 15,000 blocks per week, no yard space for more.',
      ownerKey: MZ_OTHER, bidCount: 3, awardedBidId: null, demo: true
    },
    {
      id: 'seed-tiles', ref: 'RFQ-4802',
      title: 'Tiles for 12 apartments — Dammam',
      buyerName: 'Fit-out team', buyerCompany: 'Sahel Development', buyerPhone: '',
      city: 'Dammam', site: 'Al Faisaliyah — lift available, 4th floor store',
      neededBy: mzDate(4), closesAt: mzHours(-40), createdAt: mzDay(-8),
      items: [
        { material: 'tiles', spec: '60x60 porcelain, matt, light grey', qty: 1450, unit: 'm2' },
        { material: 'tiles', spec: 'Bathroom wall 30x60, white gloss', qty: 620, unit: 'm2' }
      ],
      notes: '5% attic stock on top of the quantities above, same batch.',
      ownerKey: MZ_OTHER, bidCount: 3, awardedBidId: null, demo: true
    },
    {
      id: 'seed-fitout', ref: 'RFQ-4788',
      title: 'Gypsum & insulation — office fit-out, Dhahran',
      buyerName: 'Projects', buyerCompany: 'Meridian Interiors', buyerPhone: '',
      city: 'Dhahran', site: 'Doha district — after-hours delivery only',
      neededBy: mzDate(2), closesAt: mzHours(-96), createdAt: mzDay(-12),
      items: [
        { material: 'gypsum', spec: '12.5 mm moisture-resistant, 1.2 x 2.4 m', qty: 900, unit: 'sheet' },
        { material: 'insulation', spec: '50 mm rockwool, 60 kg/m³', qty: 1600, unit: 'm2' }
      ],
      notes: 'Fire certificate needed with the delivery note.',
      ownerKey: MZ_OTHER, bidCount: 2, awardedBidId: 'seed-fitout-b1', demo: true
    },
    {
      id: 'seed-cable', ref: 'RFQ-4836',
      title: 'Site cable & conduit — Jubail',
      buyerName: 'Electrical', buyerCompany: 'Marine Yard Services', buyerPhone: '',
      city: 'Jubail', site: 'Jubail Industrial — gate 3, pass needed 24h ahead',
      neededBy: mzDate(14), closesAt: mzHours(120), createdAt: mzHours(-6),
      items: [
        { material: 'electrical', spec: '3-core 4 mm² XLPE, 100 m rolls', qty: 40, unit: 'roll' },
        { material: 'plumbing', spec: '25 mm UPVC conduit, 3 m lengths', qty: 600, unit: 'piece' }
      ],
      notes: 'SASO-marked cable only.',
      ownerKey: MZ_OTHER, bidCount: 1, awardedBidId: null, demo: true
    }
  ],

  bids: [
    // --- RFQ-4821, opened for comparison: the interesting case. The cheapest
    // single supplier is not the fastest, no one is cheapest on everything, and
    // one bid is deliberately partial (a sand yard that does not sell steel) —
    // so the ranking, the price/speed slider and the split award all have
    // something real to show.
    {
      id: 'seed-found-b1', tenderId: 'seed-foundation',
      supplierName: 'Khalid', supplierCompany: 'Eastern Cement Traders', supplierPhone: '',
      lines: [12.9, 2980, 68], deliveryFee: 700, discount: 0,
      leadDays: 4, validityDays: 14, terms: 'net30',
      notes: 'Cement direct from the plant — the price holds for the full 400 bags.',
      bidderKey: 'demo-s1', createdAt: mzDay(-3), demo: true
    },
    {
      id: 'seed-found-b2', tenderId: 'seed-foundation',
      supplierName: 'Majed', supplierCompany: 'Al Rashid Building Materials', supplierPhone: '',
      lines: [14.6, 2860, 70], deliveryFee: 600, discount: 500,
      leadDays: 3, validityDays: 21, terms: 'delivery',
      notes: 'One truck, everything together. Discount applies to the full package only.',
      bidderKey: 'demo-s2', createdAt: mzDay(-3), demo: true
    },
    {
      id: 'seed-found-b3', tenderId: 'seed-foundation',
      supplierName: 'Yousef', supplierCompany: 'Dammam Steel & Supply', supplierPhone: '',
      lines: [15.2, 2680, 74], deliveryFee: 800, discount: 0,
      leadDays: 6, validityDays: 7, terms: 'advance',
      notes: 'Cut and bent to your bar schedule — six days includes the bending.',
      bidderKey: 'demo-s3', createdAt: mzDay(-2), demo: true
    },
    {
      id: 'seed-found-b4', tenderId: 'seed-foundation',
      supplierName: 'Nasser', supplierCompany: 'Qatif Aggregates', supplierPhone: '',
      lines: [null, null, 49], deliveryFee: 250, discount: 0,
      leadDays: 2, validityDays: 30, terms: 'delivery',
      notes: 'Aggregate only — we do not carry cement or steel.',
      bidderKey: 'demo-s4', createdAt: mzDay(-2), demo: true
    },

    // --- RFQ-4802, opened: gives the market check enough samples to be real.
    {
      id: 'seed-tiles-b1', tenderId: 'seed-tiles',
      supplierName: 'Hisham', supplierCompany: 'Ceramica Gulf', supplierPhone: '',
      lines: [46, 38], deliveryFee: 750, discount: 0,
      leadDays: 6, validityDays: 30, terms: 'net30', notes: '',
      bidderKey: 'demo-s5', createdAt: mzDay(-6), demo: true
    },
    {
      id: 'seed-tiles-b2', tenderId: 'seed-tiles',
      supplierName: 'Omar', supplierCompany: 'Al Naji Tiles', supplierPhone: '',
      lines: [52, 34], deliveryFee: 400, discount: 0,
      leadDays: 4, validityDays: 15, terms: 'delivery',
      notes: 'Same batch guaranteed for both items.',
      bidderKey: 'demo-s6', createdAt: mzDay(-6), demo: true
    },
    {
      id: 'seed-tiles-b3', tenderId: 'seed-tiles',
      supplierName: 'Faisal', supplierCompany: 'Riyadh Surfaces', supplierPhone: '',
      lines: [43, 41], deliveryFee: 1400, discount: 0,
      leadDays: 12, validityDays: 30, terms: 'net60',
      notes: 'Coming from Riyadh — twelve days including customs paperwork.',
      bidderKey: 'demo-s7', createdAt: mzDay(-5), demo: true
    },

    // --- RFQ-4788, already awarded.
    {
      id: 'seed-fitout-b1', tenderId: 'seed-fitout',
      supplierName: 'Tareq', supplierCompany: 'Interior Supply Co', supplierPhone: '',
      lines: [24.5, 21], deliveryFee: 500, discount: 0,
      leadDays: 4, validityDays: 30, terms: 'net30',
      notes: 'Fire certificates issued with each delivery note.',
      bidderKey: 'demo-s8', createdAt: mzDay(-10), demo: true
    },
    {
      id: 'seed-fitout-b2', tenderId: 'seed-fitout',
      supplierName: 'Bilal', supplierCompany: 'Gypsum House', supplierPhone: '',
      lines: [26, 19.5], deliveryFee: 900, discount: 0,
      leadDays: 9, validityDays: 20, terms: 'net60', notes: '',
      bidderKey: 'demo-s9', createdAt: mzDay(-10), demo: true
    }
  ]
};
