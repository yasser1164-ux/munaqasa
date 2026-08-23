// ---- SAMPLE BOARD -----------------------------------------------------------
// A worked example so the app is never an empty screen: auctions running right
// now with suppliers undercutting each other, and finished ones showing who won.
// It is demo data, priced in plausible Eastern Province ranges, and it vanishes
// the moment there is anything real on the board (see mzLoadBoard in store.js).
//
// Several suppliers appear twice on purpose — an opening price and a later,
// lower one. That is the whole shape of the thing: only the latest price
// competes, the earlier ones become the price-drop history.

const mzDay = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};
const mzDate = n => mzDay(n).slice(0, 10);
const mzHours = n => new Date(Date.now() + n * 3600 * 1000).toISOString();

// One finished auction belongs to whoever is looking, so the buyer's side —
// watching your own auction and seeing who won — can be seen without waiting
// three days for a clock to run out.
const MZ_DEMO_OWNER = mzMe().key;
const MZ_OTHER = 'demo-other-buyer';

const MZ_SEED = {
  tenders: [
    {
      id: 'seed-slab', ref: 'RFQ-4830',
      title: 'صبّة خرسانة جاهزة — أرضية مستودع، الدمام',
      buyerName: 'المشتريات', buyerCompany: 'أعمال الخليج للحديد', buyerPhone: '',
      city: 'Dammam', site: 'المدينة الصناعية الثانية — دخول المضخة من البوابة الشمالية',
      neededBy: mzDate(9), closesAt: mzHours(72), createdAt: mzHours(-30),
      items: [
        { material: 'readymix', spec: 'C35، هبوط 100 مم، مع مؤخّر تصلب لصبّة 4 ساعات', qty: 180, unit: 'm3' },
        { material: 'steel', spec: 'شبك A393، ألواح 6م × 2.4م', qty: 3.5, unit: 'tonne' }
      ],
      notes: 'صب متواصل من الساعة 5 فجرًا. سعّروا المضخة في الملاحظات.',
      ownerKey: MZ_OTHER, bidCount: 3, demo: true
    },
    {
      id: 'seed-blocks', ref: 'RFQ-4834',
      title: 'بلك — 40,000 بلكة، القطيف',
      buyerName: 'أبو فيصل', buyerCompany: 'بناء نجد', buyerPhone: '',
      city: 'Qatif', site: 'مخطط العوامية السكني — على دفعات خلال ثلاثة أسابيع',
      neededBy: mzDate(11), closesAt: mzHours(6), createdAt: mzDay(-2),
      items: [
        { material: 'blocks', spec: 'مفرّغ 20 سم، قوة 7 نيوتن/مم²', qty: 40000, unit: 'piece' },
        { material: 'cement', spec: 'أسمنت بناء للمونة', qty: 250, unit: 'bag' },
        { material: 'sand', spec: 'رمل لياسة مغسول', qty: 60, unit: 'm3' }
      ],
      notes: 'توريد على دفعات — 15,000 بلكة أسبوعيًا، لا توجد ساحة تخزين لأكثر.',
      ownerKey: MZ_OTHER, bidCount: 3, demo: true
    },
    {
      id: 'seed-cable', ref: 'RFQ-4836',
      title: 'كيابل وتمديدات كهربائية — الجبيل',
      buyerName: 'قسم الكهرباء', buyerCompany: 'خدمات الأحواض البحرية', buyerPhone: '',
      city: 'Jubail', site: 'الجبيل الصناعية — بوابة 3، التصريح قبل 24 ساعة',
      neededBy: mzDate(14), closesAt: mzHours(120), createdAt: mzHours(-6),
      items: [
        { material: 'electrical', spec: 'كيبل 3 أطراف 4مم² XLPE، لفات 100م', qty: 40, unit: 'roll' },
        { material: 'plumbing', spec: 'ليّات UPVC مقاس 25مم، أطوال 3م', qty: 600, unit: 'piece' }
      ],
      notes: 'كيابل بعلامة ساسو فقط.',
      ownerKey: MZ_OTHER, bidCount: 1, demo: true
    },
    {
      id: 'seed-foundation', ref: 'RFQ-4821',
      title: 'حزمة قواعد فلل — 3 وحدات، الخبر',
      buyerName: 'مكتب الموقع', buyerCompany: 'مقاولات البحر', buyerPhone: '',
      city: 'Al Khobar', site: 'العقربية، قطعة 44 — رافعة متوفرة، التسليم 6–11 صباحًا',
      neededBy: mzDate(6), closesAt: mzHours(-14), createdAt: mzDay(-5),
      items: [
        { material: 'cement', spec: 'أسمنت بورتلاندي عادي، أكياس 50 كجم', qty: 400, unit: 'bag' },
        { material: 'rebar', spec: 'درجة 60، قطر 16مم — قص وثني حسب الجدول', qty: 12, unit: 'tonne' },
        { material: 'aggregate', spec: 'بحص 3/4 بوصة مغسول', qty: 40, unit: 'm3' }
      ],
      notes: 'شهادة مصنع للحديد مطلوبة. التفريغ علينا.',
      ownerKey: MZ_DEMO_OWNER, bidCount: 4, demo: true
    },
    {
      id: 'seed-tiles', ref: 'RFQ-4802',
      title: 'بلاط 12 شقة — الدمام',
      buyerName: 'فريق التشطيب', buyerCompany: 'تطوير الساحل', buyerPhone: '',
      city: 'Dammam', site: 'الفيصلية — يوجد مصعد، المستودع بالدور الرابع',
      neededBy: mzDate(4), closesAt: mzHours(-40), createdAt: mzDay(-8),
      items: [
        { material: 'tiles', spec: 'بورسلان 60×60 مطفي، رمادي فاتح', qty: 1450, unit: 'm2' },
        { material: 'tiles', spec: 'جدران حمامات 30×60 أبيض لامع', qty: 620, unit: 'm2' }
      ],
      notes: 'زيادة 5% احتياط فوق الكميات، نفس الدفعة.',
      ownerKey: MZ_OTHER, bidCount: 3, demo: true
    },
    {
      id: 'seed-fitout', ref: 'RFQ-4788',
      title: 'جبس وعوازل — تشطيب مكاتب، الظهران',
      buyerName: 'المشاريع', buyerCompany: 'ميريديان للتشطيبات', buyerPhone: '',
      city: 'Dhahran', site: 'حي الدوحة — التسليم بعد الدوام فقط',
      neededBy: mzDate(2), closesAt: mzHours(-96), createdAt: mzDay(-12),
      items: [
        { material: 'gypsum', spec: 'مقاوم للرطوبة 12.5مم، 1.2×2.4م', qty: 900, unit: 'sheet' },
        { material: 'insulation', spec: 'صوف صخري 50مم، كثافة 60 كجم/م³', qty: 1600, unit: 'm2' }
      ],
      notes: 'شهادة مقاومة حريق مع إشعار التسليم.',
      ownerKey: MZ_OTHER, bidCount: 2, demo: true
    }
  ],

  bids: [
    // --- RFQ-4830, LIVE: three ready-mix suppliers walking each other down.
    //     Two of them have already dropped once; the lead has changed hands.
    {
      id: 'seed-slab-a1', tenderId: 'seed-slab',
      supplierName: 'أحمد', supplierCompany: 'خرسانة الخليج الجاهزة', supplierPhone: '',
      lines: [238, 3200], deliveryFee: 1800, discount: 0,
      leadDays: 4, validityDays: 14, terms: 'net30',
      notes: 'المضخة تُسعّر منفصلة — 2,400 ريال لليوم.',
      bidderKey: 'demo-r1', createdAt: mzHours(-26), demo: true
    },
    {
      id: 'seed-slab-b1', tenderId: 'seed-slab',
      supplierName: 'سعد', supplierCompany: 'شركة الدمام للخرسانة', supplierPhone: '',
      lines: [232, 3180], deliveryFee: 1200, discount: 0,
      leadDays: 3, validityDays: 10, terms: 'delivery',
      notes: 'مضختان متوفرتان، والبدء الساعة 5 فجرًا لا مشكلة.',
      bidderKey: 'demo-r2', createdAt: mzHours(-22), demo: true
    },
    {
      id: 'seed-slab-c1', tenderId: 'seed-slab',
      supplierName: 'وليد', supplierCompany: 'خلطات الشرقية', supplierPhone: '',
      lines: [230, 3250], deliveryFee: 900, discount: 0,
      leadDays: 5, validityDays: 30, terms: 'net30', notes: '',
      bidderKey: 'demo-r3', createdAt: mzHours(-18), demo: true
    },
    {
      id: 'seed-slab-a2', tenderId: 'seed-slab',
      supplierName: 'أحمد', supplierCompany: 'خرسانة الخليج الجاهزة', supplierPhone: '',
      lines: [228, 3150], deliveryFee: 1500, discount: 0,
      leadDays: 4, validityDays: 14, terms: 'net30',
      notes: 'المضخة تُسعّر منفصلة — 2,400 ريال لليوم.',
      bidderKey: 'demo-r1', createdAt: mzHours(-9), demo: true
    },
    {
      id: 'seed-slab-b2', tenderId: 'seed-slab',
      supplierName: 'سعد', supplierCompany: 'شركة الدمام للخرسانة', supplierPhone: '',
      lines: [225, 3100], deliveryFee: 1200, discount: 0,
      leadDays: 3, validityDays: 10, terms: 'delivery',
      notes: 'مضختان متوفرتان، والبدء الساعة 5 فجرًا لا مشكلة.',
      bidderKey: 'demo-r2', createdAt: mzHours(-3), demo: true
    },

    // --- RFQ-4834, LIVE and ending within the hour.
    {
      id: 'seed-blocks-a1', tenderId: 'seed-blocks',
      supplierName: 'حسين', supplierCompany: 'مصنع بلك القطيف', supplierPhone: '',
      lines: [2.85, 14.2, 45], deliveryFee: 2500, discount: 0,
      leadDays: 5, validityDays: 14, terms: 'delivery',
      notes: 'توريد أسبوعي على دفعات كما طلبتم.',
      bidderKey: 'demo-q1', createdAt: mzHours(-30), demo: true
    },
    {
      id: 'seed-blocks-b1', tenderId: 'seed-blocks',
      supplierName: 'فهد', supplierCompany: 'بلك الخليج', supplierPhone: '',
      lines: [2.78, 14.6, 48], deliveryFee: 3000, discount: 0,
      leadDays: 7, validityDays: 21, terms: 'net30', notes: '',
      bidderKey: 'demo-q2', createdAt: mzHours(-20), demo: true
    },
    {
      id: 'seed-blocks-c1', tenderId: 'seed-blocks',
      supplierName: 'مبارك', supplierCompany: 'رمال القطيف', supplierPhone: '',
      lines: [null, null, 38], deliveryFee: 600, discount: 0,
      leadDays: 2, validityDays: 30, terms: 'delivery',
      notes: 'رمل فقط — لا نوفر بلكًا ولا أسمنتًا.',
      bidderKey: 'demo-q3', createdAt: mzHours(-12), demo: true
    },

    // --- RFQ-4836, LIVE with a single bidder so far: nobody to push them down.
    {
      id: 'seed-cable-a1', tenderId: 'seed-cable',
      supplierName: 'رامي', supplierCompany: 'الجبيل للتوريدات الكهربائية', supplierPhone: '',
      lines: [430, 8.5], deliveryFee: 700, discount: 0,
      leadDays: 6, validityDays: 14, terms: 'net30', notes: '',
      bidderKey: 'demo-e1', createdAt: mzHours(-4), demo: true
    },

    // --- RFQ-4821, FINISHED. The lead changed hands twice and the last drop
    //     won it: 52,417 → 51,106 → 50,991 → 49,519 → 48,300.
    {
      id: 'seed-found-b1a', tenderId: 'seed-foundation',
      supplierName: 'خالد', supplierCompany: 'تجار الأسمنت الشرقية', supplierPhone: '',
      lines: [13.5, 3050, 72], deliveryFee: 700, discount: 0,
      leadDays: 4, validityDays: 14, terms: 'net30',
      notes: 'الأسمنت من المصنع مباشرة — والسعر ثابت لكامل الـ400 كيس.',
      bidderKey: 'demo-s1', createdAt: mzDay(-4), demo: true
    },
    {
      id: 'seed-found-b3a', tenderId: 'seed-foundation',
      supplierName: 'يوسف', supplierCompany: 'الدمام للحديد والتوريدات', supplierPhone: '',
      lines: [15.8, 2850, 78], deliveryFee: 800, discount: 0,
      leadDays: 6, validityDays: 7, terms: 'advance',
      notes: 'قص وثني حسب جدول التسليح — الستة أيام تشمل الثني.',
      bidderKey: 'demo-s3', createdAt: mzDay(-3), demo: true
    },
    {
      id: 'seed-found-b1', tenderId: 'seed-foundation',
      supplierName: 'خالد', supplierCompany: 'تجار الأسمنت الشرقية', supplierPhone: '',
      lines: [12.9, 2980, 68], deliveryFee: 700, discount: 0,
      leadDays: 4, validityDays: 14, terms: 'net30',
      notes: 'الأسمنت من المصنع مباشرة — والسعر ثابت لكامل الـ400 كيس.',
      bidderKey: 'demo-s1', createdAt: mzDay(-3), demo: true
    },
    {
      id: 'seed-found-b2', tenderId: 'seed-foundation',
      supplierName: 'ماجد', supplierCompany: 'مواد بناء الراشد', supplierPhone: '',
      lines: [14.6, 2860, 70], deliveryFee: 600, discount: 0,
      leadDays: 3, validityDays: 21, terms: 'delivery',
      notes: 'شاحنة واحدة، كل شيء مع بعض.',
      bidderKey: 'demo-s2', createdAt: mzDay(-2), demo: true
    },
    {
      id: 'seed-found-b4', tenderId: 'seed-foundation',
      supplierName: 'ناصر', supplierCompany: 'كسارات القطيف', supplierPhone: '',
      lines: [null, null, 49], deliveryFee: 250, discount: 0,
      leadDays: 2, validityDays: 30, terms: 'delivery',
      notes: 'بحص فقط — لا نوفر أسمنتًا ولا حديدًا.',
      bidderKey: 'demo-s4', createdAt: mzDay(-2), demo: true
    },
    {
      id: 'seed-found-b3', tenderId: 'seed-foundation',
      supplierName: 'يوسف', supplierCompany: 'الدمام للحديد والتوريدات', supplierPhone: '',
      lines: [15.2, 2680, 74], deliveryFee: 800, discount: 0,
      leadDays: 6, validityDays: 7, terms: 'advance',
      notes: 'قص وثني حسب جدول التسليح — الستة أيام تشمل الثني.',
      bidderKey: 'demo-s3', createdAt: mzHours(-20), demo: true
    },

    // --- RFQ-4802, FINISHED: gives the market check enough samples to be real.
    {
      id: 'seed-tiles-b1', tenderId: 'seed-tiles',
      supplierName: 'هشام', supplierCompany: 'سيراميكا الخليج', supplierPhone: '',
      lines: [46, 38], deliveryFee: 750, discount: 0,
      leadDays: 6, validityDays: 30, terms: 'net30', notes: '',
      bidderKey: 'demo-s5', createdAt: mzDay(-6), demo: true
    },
    {
      id: 'seed-tiles-b2', tenderId: 'seed-tiles',
      supplierName: 'عمر', supplierCompany: 'بلاط الناجي', supplierPhone: '',
      lines: [52, 34], deliveryFee: 400, discount: 0,
      leadDays: 4, validityDays: 15, terms: 'delivery',
      notes: 'نفس الدفعة مضمونة للصنفين.',
      bidderKey: 'demo-s6', createdAt: mzDay(-6), demo: true
    },
    {
      id: 'seed-tiles-b3', tenderId: 'seed-tiles',
      supplierName: 'فيصل', supplierCompany: 'أسطح الرياض', supplierPhone: '',
      lines: [43, 41], deliveryFee: 1400, discount: 0,
      leadDays: 12, validityDays: 30, terms: 'net60',
      notes: 'التوريد من الرياض — اثنا عشر يومًا شاملة الإجراءات.',
      bidderKey: 'demo-s7', createdAt: mzDay(-5), demo: true
    },

    // --- RFQ-4788, FINISHED.
    {
      id: 'seed-fitout-b1', tenderId: 'seed-fitout',
      supplierName: 'طارق', supplierCompany: 'شركة التجهيزات الداخلية', supplierPhone: '',
      lines: [24.5, 21], deliveryFee: 500, discount: 0,
      leadDays: 4, validityDays: 30, terms: 'net30',
      notes: 'شهادات الحريق تصدر مع كل إشعار تسليم.',
      bidderKey: 'demo-s8', createdAt: mzDay(-10), demo: true
    },
    {
      id: 'seed-fitout-b2', tenderId: 'seed-fitout',
      supplierName: 'بلال', supplierCompany: 'بيت الجبس', supplierPhone: '',
      lines: [26, 19.5], deliveryFee: 900, discount: 0,
      leadDays: 9, validityDays: 20, terms: 'net60', notes: '',
      bidderKey: 'demo-s9', createdAt: mzDay(-10), demo: true
    }
  ]
};
