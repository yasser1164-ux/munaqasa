// ---- LANGUAGE ---------------------------------------------------------------
// The whole UI in English and Arabic. One dictionary, one tr() function, one
// toggle in the header. The language flips the document direction too (Arabic
// is RTL), and every page re-renders itself through window.onLangChange.
//
// The catalog in core.js keeps its own en/ar names per material and unit —
// this file is for the chrome around the data. Content typed by users
// (titles, specs, notes) is never translated: it is shown as written.
//
// Script order: config → i18n → core → store → seed → page.

const MZ_LANG_KEY = 'munaqasa.lang';

// Arabic first: the app opens in Arabic for everyone. English is there behind
// the toggle for whoever wants it, and the choice sticks.
let MZ_LANG = (() => {
  try {
    const saved = localStorage.getItem(MZ_LANG_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch { /* private mode */ }
  return 'ar';
})();

function mzIsAr() { return MZ_LANG === 'ar'; }

const MZ_STR = {
  // ---- shared chrome --------------------------------------------------------
  'nav.post':      { en: 'Post a request', ar: 'اطرح طلبًا' },
  'nav.board':     { en: '← Board', ar: 'المنصّة' },
  'title.board':   { en: 'Munaqasa — Bid for construction materials', ar: 'مناقصة — منافسة على أسعار مواد البناء' },
  'title.post':    { en: 'Post a materials request — Munaqasa', ar: 'اطرح طلب مواد — مناقصة' },

  // ---- board ----------------------------------------------------------------
  'hero.h1':  { en: 'Let them bid the price down.', ar: 'خلّهم ينزلون السعر.' },
  'hero.p':   { en: 'Post what you need, send one link to your suppliers, and watch the price drop live. When the time is up, the cheapest offer wins by itself.',
                ar: 'انشر طلبك، أرسل رابطًا واحدًا لمورّديك، وشاهد السعر ينزل مباشرة. وعند انتهاء الوقت يفوز أرخص عرض تلقائيًا.' },
  'hero.cta1': { en: '📋 Post a request', ar: '📋 اطرح طلبًا' },
  'hero.cta2': { en: '🔎 Bid on live auctions', ar: '🔎 زايد على المزادات المباشرة' },
  'how1.t': { en: '1 · Post', ar: '١ · انشر' },
  'how1.d': { en: 'List the materials, quantities and the date you need them on site.', ar: 'اكتب المواد والكميات وتاريخ الحاجة إليها في الموقع.' },
  'how2.t': { en: '2 · They undercut', ar: '٢ · يتنافسون' },
  'how2.d': { en: 'Send one link to your suppliers. Each sees the price to beat and can go lower.', ar: 'أرسل رابطًا واحدًا لمورّديك. كلٌّ يرى السعر المطلوب كسره ويقدر ينزل تحته.' },
  'how3.t': { en: '3 · Lowest wins', ar: '٣ · الأقل يفوز' },
  'how3.d': { en: 'When the clock stops the cheapest landed cost wins automatically. You decide nothing.', ar: 'عند انتهاء الوقت تفوز أقل تكلفة واصلة تلقائيًا. أنت لا تقرر شيئًا.' },
  'sec.mine':  { en: 'Your activity', ar: 'نشاطك' },
  'sec.board': { en: 'Auctions', ar: 'المزادات' },
  'search.ph': { en: 'Search by material, city or reference…', ar: 'ابحث بالمادة أو المدينة أو رقم الطلب…' },
  'board.empty': { en: 'No requests match those filters.', ar: 'لا توجد طلبات تطابق هذه الفلاتر.' },
  'f.all':      { en: 'Everything', ar: 'الكل' },
  'f.live':     { en: 'Live now', ar: 'مباشر الآن' },
  'f.closing':  { en: 'Ending today', ar: 'ينتهي اليوم' },
  'f.ended':    { en: 'Finished', ar: 'انتهت' },
  'f.allmats':  { en: 'All materials', ar: 'كل المواد' },
  'card.neededBy': { en: 'Needed on site by {d}', ar: 'مطلوب في الموقع قبل {d}' },
  'card.noBids':   { en: 'No bids yet', ar: 'لا عروض بعد' },
  'card.best':     { en: '{bids} · lowest {p}', ar: '{bids} · الأقل {p}' },
  'badge.yours':   { en: 'YOURS', ar: 'طلبك' },
  'mine.note':     { en: '{a} posted · {b} bid on', ar: '{a} نشرتها · {b} قدّمت عليها' },
  'count.of':      { en: '{a} of {b}', ar: '{a} من {b}' },

  // ---- status + time --------------------------------------------------------
  'status.live':    { en: '🔴 LIVE', ar: '🔴 مباشر' },
  'status.closing': { en: '⏳ ENDING', ar: '⏳ ينتهي' },
  'status.ended':   { en: 'FINISHED', ar: 'انتهى' },
  'cd.closed': { en: 'closed', ar: 'أُقفل' },
  'cd.dh': { en: '{d}d {h}h left', ar: 'باقي {d} و{h}' },
  'cd.hm': { en: '{h}h {m}m left', ar: 'باقي {h} و{m}' },
  'cd.m':  { en: '{m}m left', ar: 'باقي {m}' },
  'terms.advance':  { en: 'Payment in advance', ar: 'الدفع مقدمًا' },
  'terms.delivery': { en: 'Cash on delivery', ar: 'الدفع عند التسليم' },
  'terms.net30':    { en: 'Credit 30 days', ar: 'آجل 30 يومًا' },
  'terms.net60':    { en: 'Credit 60 days', ar: 'آجل 60 يومًا' },
  'terms.net90':    { en: 'Credit 90 days', ar: 'آجل 90 يومًا' },

  // ---- post form ------------------------------------------------------------
  'p.h1':  { en: 'Post a materials request', ar: 'اطرح طلب مواد' },
  'p.sub': { en: 'Suppliers bid line by line and can keep going lower until the clock stops. The more exact the specification, the less room there is to quote you something cheaper than what you asked for.',
             ar: 'يقدّم الموردون أسعارهم بندًا ببند، ويستمرون بالنزول حتى ينتهي الوقت. كلما دقّت المواصفات، ضاق المجال لتسعير شيء أرخص مما طلبت.' },
  'p.job':   { en: 'The job', ar: 'العمل' },
  'p.job.d': { en: 'What is being bought, and where it has to land.', ar: 'ما الذي يُشترى، وأين يجب أن يصل.' },
  'p.title':    { en: 'Request title', ar: 'عنوان الطلب' },
  'p.title.ph': { en: 'e.g. Villa foundation package — 3 units', ar: 'مثال: حزمة قواعد فلل — 3 وحدات' },
  'p.city':   { en: 'City', ar: 'المدينة' },
  'p.needed': { en: 'Needed on site by', ar: 'مطلوب في الموقع قبل' },
  'p.site':    { en: 'Delivery site <em>— access, gate, offloading hours</em>', ar: 'موقع التسليم <em>— المداخل والبوابة وساعات التفريغ</em>' },
  'p.site.ph': { en: 'e.g. Al Aqrabiyah plot 44 — deliver 6–11 AM, crane on site', ar: 'مثال: العقربية قطعة 44 — التسليم 6–11 صباحًا، رافعة متوفرة' },
  'p.mats':   { en: 'Materials', ar: 'المواد' },
  'p.mats.d': { en: 'One line per item. Quantities are what suppliers price against, so put the real number — not a round one.',
                ar: 'بند لكل مادة. الكميات هي ما يسعّر عليه الموردون، فاكتب الرقم الحقيقي لا رقمًا تقريبيًا.' },
  'p.addline': { en: '+ Add material', ar: '+ أضف مادة' },
  'p.mat':     { en: 'Material', ar: 'المادة' },
  'p.spec':    { en: 'Specification <em>— grade, size, standard</em>', ar: 'المواصفات <em>— الدرجة والمقاس والمعيار</em>' },
  'p.spec.ph': { en: 'e.g. OPC Type I, 50 kg bags', ar: 'مثال: أسمنت بورتلاندي عادي، أكياس 50 كجم' },
  'p.qty':  { en: 'Quantity', ar: 'الكمية' },
  'p.unit': { en: 'Unit', ar: 'الوحدة' },
  'p.window':   { en: 'How long the auction runs', ar: 'مدة المزاد' },
  'p.window.d': { en: 'Suppliers keep lowering until the time is up. Then the cheapest wins by itself.',
                  ar: 'ينزل الموردون بالأسعار حتى ينتهي الوقت، ثم يفوز الأرخص تلقائيًا.' },
  'p.closes': { en: 'Ends {t}', ar: 'ينتهي {t}' },
  'p.in24':  { en: 'In 24 hours', ar: 'خلال 24 ساعة' },
  'p.in72':  { en: 'In 3 days', ar: 'خلال 3 أيام' },
  'p.in168': { en: 'In a week', ar: 'خلال أسبوع' },
  'p.window.hint': { en: 'Urgent pours get a day; a big package deserves a week — short windows cost you bidders, long ones cost you time.',
                     ar: 'الصبّات المستعجلة تكفيها 24 ساعة، والحزم الكبيرة تستحق أسبوعًا — الفترة القصيرة تُفقدك مورّدين، والطويلة تُفقدك وقتًا.' },
  'p.cond':   { en: 'Conditions & contact', ar: 'الشروط والتواصل' },
  'p.cond.d': { en: 'Certificates, staged deliveries, who the driver calls.', ar: 'الشهادات المطلوبة، التوريد على دفعات، ومن يتصل به السائق.' },
  'p.notes':    { en: 'Conditions <em>— optional</em>', ar: 'الشروط <em>— اختياري</em>' },
  'p.notes.ph': { en: 'e.g. Mill certificate required for rebar. Staged delivery, 15,000 blocks per week.',
                  ar: 'مثال: شهادة مصنع للحديد. توريد على دفعات، 15,000 بلكة أسبوعيًا.' },
  'p.name':       { en: 'Your name', ar: 'اسمك' },
  'p.name.ph':    { en: 'Abu Faisal', ar: 'أبو فيصل' },
  'p.company':    { en: 'Company', ar: 'الشركة' },
  'p.company.ph': { en: 'Najd Build', ar: 'بناء نجد' },
  'p.phone':    { en: 'Phone <em>— optional</em>', ar: 'الجوال <em>— اختياري</em>' },
  'p.contact.hint': { en: 'Shown to suppliers so they can ask before they quote. Leave the phone out if you would rather they use the bid notes.',
                      ar: 'تظهر للموردين ليسألوا قبل التسعير. اترك الجوال فارغًا إن كنت تفضّل أن يكتبوا في ملاحظات العرض.' },
  'p.submit':  { en: 'Start the auction & get the supplier link', ar: 'ابدأ المزاد واحصل على رابط الموردين' },
  'p.cancel':  { en: 'Cancel', ar: 'إلغاء' },
  'p.posting': { en: 'Posting…', ar: 'جارٍ النشر…' },
  'p.err.title':  { en: 'Give the request a title so suppliers know what they are bidding on.', ar: 'اكتب عنوانًا للطلب ليعرف الموردون على ماذا يقدّمون.' },
  'p.err.lines':  { en: 'Add at least one material with a quantity above zero.', ar: 'أضف مادة واحدة على الأقل بكمية أكبر من صفر.' },
  'p.err.closes': { en: 'Set a closing time for the bids.', ar: 'حدّد موعد إقفال العروض.' },
  'p.err.past':   { en: 'The closing time has already passed — pick a time in the future.', ar: 'موعد الإقفال مضى — اختر وقتًا في المستقبل.' },

  // ---- tender page ----------------------------------------------------------
  'fact.needed':  { en: 'Needed on site', ar: 'مطلوب في الموقع' },
  'fact.closes':  { en: 'Auction ends', ar: 'ينتهي المزاد' },
  'fact.bids':    { en: 'Bidders', ar: 'الموردون' },
  'fact.site':    { en: 'Delivery site', ar: 'موقع التسليم' },
  'fact.won':     { en: 'Won', ar: 'فاز' },
  'postedBy':     { en: 'posted by {c}', ar: 'نشره {c}' },
  'badge.yourReq': { en: 'YOUR REQUEST', ar: 'طلبك' },
  'cond.h': { en: 'Conditions', ar: 'الشروط' },
  'buy.h': { en: 'What is being bought', ar: 'المطلوب شراؤه' },
  'buy.d': { en: '{lines} · every line priced separately, so the request can be split between suppliers.',
             ar: '{lines} · كل بند يُسعّر على حدة، فيمكن تجزئة الطلب بين الموردين.' },
  'th.material': { en: 'Material', ar: 'المادة' },
  'th.qty':      { en: 'Quantity', ar: 'الكمية' },
  'th.unit':     { en: 'Unit', ar: 'الوحدة' },
  'market': { en: 'Median on this board: {p} per {u} ({bids})', ar: 'وسيط الأسعار في المنصّة: {p} لكل {u} ({bids})' },

  'sealed.p': { en: 'Prices stay hidden — from you too — until {t} ({cd}). Then every bid opens at once and this page becomes the comparison table. That is what keeps suppliers from shading each other\'s numbers.',
                ar: 'الأسعار مخفية — حتى عنك — إلى {t} ({cd}). عندها تُفتح كل العروض دفعة واحدة وتتحول هذه الصفحة إلى جدول المقارنة. هذا ما يمنع الموردين من مجاراة أسعار بعضهم.' },
  'share.h':  { en: 'Send it to your suppliers', ar: 'أرسله إلى مورّديك' },
  'share.d':  { en: 'One link, as many suppliers as you like. The more of them bidding, the lower it goes.',
                ar: 'رابط واحد لأي عدد من الموردين. كل ما زاد عددهم، نزل السعر أكثر.' },
  'share.wa':     { en: '💬 Share on WhatsApp', ar: '💬 شارك عبر واتساب' },
  'share.copy':   { en: '🔗 Copy link', ar: '🔗 انسخ الرابط' },
  'share.copied': { en: '✓ Copied', ar: '✓ نُسخ' },
  'share.copyPrompt': { en: 'Copy this link:', ar: 'انسخ هذا الرابط:' },
  'share.offline': { en: '⚠️ No database is reachable, so this request lives on this device only and the link will not open for anyone else. Run <code>supabase/tenders.sql</code> once to make the board shared.',
                     ar: '⚠️ لا يمكن الوصول إلى قاعدة البيانات، فهذا الطلب محفوظ على هذا الجهاز فقط ولن يفتح الرابط عند غيرك. شغّل <code>supabase/tenders.sql</code> مرة واحدة لتصبح المنصّة مشتركة.' },
  'share.text': { en: '{ref} — {title}\n{city} · needed on site by {d}\n\n{lines}\n\nLive auction, ends {t}. Lowest price wins. Bid here:',
                  ar: '{ref} — {title}\n{city} · مطلوب في الموقع قبل {d}\n\n{lines}\n\nمزاد مباشر، ينتهي {t}. أقل سعر يفوز. زايد هنا:' },

  'bid.h.new': { en: 'Send your bid', ar: 'أرسل عرضك' },
  'bid.h.rev': { en: 'Revise your bid', ar: 'عدّل عرضك' },
  'bid.d': { en: 'Prices exclude VAT and are per unit. Leave a line empty if you do not carry it — but only a bid covering every line can win the auction.',
             ar: 'الأسعار للوحدة وبدون الضريبة. اترك البند فارغًا إن كنت لا توفّره — لكن لا يفوز بالمزاد إلا عرض يغطي كل البنود.' },
  'bid.priceph':   { en: 'price / {u}', ar: 'السعر / {u}' },
  'bid.notQuoted': { en: 'not quoted', ar: 'غير مسعّر' },
  'bid.delivery': { en: 'Delivery to site <em>— total, SAR</em>', ar: 'التوصيل إلى الموقع <em>— إجمالي، ر.س</em>' },
  'bid.discount': { en: 'Discount <em>— on the full package, SAR</em>', ar: 'الخصم <em>— على كامل الطلب، ر.س</em>' },
  'bid.lead':  { en: 'Delivery in <em>— days</em>', ar: 'التوريد خلال <em>— يوم</em>' },
  'bid.valid': { en: 'Price valid for <em>— days</em>', ar: 'صلاحية السعر <em>— يوم</em>' },
  'bid.terms': { en: 'Payment terms', ar: 'شروط الدفع' },
  'tot.goods':    { en: 'Goods ({a} of {b} lines)', ar: 'البضاعة ({a} من {b} بنود)' },
  'tot.delivery': { en: 'Delivery to site', ar: 'التوصيل إلى الموقع' },
  'tot.discount': { en: 'Discount', ar: 'الخصم' },
  'tot.vat':      { en: 'VAT {p}%', ar: 'الضريبة {p}%' },
  'tot.landed':   { en: 'Landed cost', ar: 'التكلفة الواصلة' },
  'bid.name':       { en: 'Your name', ar: 'اسمك' },
  'bid.name.ph':    { en: 'Khalid', ar: 'خالد' },
  'bid.company':    { en: 'Company', ar: 'الشركة' },
  'bid.company.ph': { en: 'Eastern Cement Traders', ar: 'تجار الأسمنت الشرقية' },
  'bid.who':   { en: 'Your name or company', ar: 'اسمك أو شركتك' },
  'bid.phone': { en: 'Phone', ar: 'الجوال' },
  'bid.notes':    { en: 'Notes to the buyer <em>— optional</em>', ar: 'ملاحظات للمشتري <em>— اختياري</em>' },
  'bid.notes.ph': { en: 'e.g. Stock on the ground, can load tomorrow morning.', ar: 'مثال: البضاعة متوفرة في الساحة، نحمّل صباح الغد.' },
  'bid.send':    { en: 'Place my bid', ar: 'قدّم عرضي' },
  'bid.sendRev': { en: 'Send revised bid', ar: 'أرسل العرض المعدّل' },
  'bid.sending': { en: 'Sending…', ar: 'جارٍ الإرسال…' },
  'bid.sealedHint': { en: 'Your price is public the moment you send it, and everyone can go lower. You can drop yours again any time until {t}.',
                      ar: 'سعرك يظهر للجميع فور إرساله، وأي أحد يقدر ينزل تحته. وتقدر تنزل سعرك مرة أخرى في أي وقت حتى {t}.' },
  'bid.err.noline': { en: 'Price at least one line before sending the bid.', ar: 'سعّر بندًا واحدًا على الأقل قبل إرسال العرض.' },
  'bid.err.who':    { en: 'Add your name or company — the buyer has to know who is quoting.', ar: 'اكتب اسمك أو اسم شركتك — على المشتري أن يعرف من يقدّم السعر.' },

  'my.h': { en: '✅ Your bid is in — and sealed', ar: '✅ وصل عرضك — وهو مغلق' },
  'my.d': { en: "Sent {a}. It opens with everyone else's at {b}.", ar: 'أُرسل {a}. يُفتح مع بقية العروض في {b}.' },
  'my.lead':    { en: 'Delivery in', ar: 'التوريد خلال' },
  'my.leadVal': { en: '{n} · {t}', ar: '{n} · {t}' },
  'my.revise':  { en: 'Revise my bid', ar: 'عدّل عرضي' },

  'cmp.h': { en: 'Final standings', ar: 'الترتيب النهائي' },
  'cmp.d': { en: 'Landed cost is unit prices × quantities, plus delivery, minus any discount, plus {p}% VAT. Partial bids sit below the complete ones — they could not win the request outright, but they still compete line by line further down.',
             ar: 'التكلفة الواصلة = أسعار الوحدات × الكميات، زائد التوصيل، ناقص الخصم، زائد {p}% ضريبة. العروض الجزئية تحت الكاملة — لا تفوز بالطلب كاملًا، لكنها تظل تنافس بندًا ببند في الأسفل.' },
  'cmp.weight': { en: 'Price {p}% · speed {q}%', ar: 'السعر {p}% · السرعة {q}%' },
  'cmp.swipe':  { en: 'Swipe the table sideways for every column →', ar: 'اسحب الجدول جانبًا لبقية الأعمدة ←' },
  'th.supplier': { en: 'Supplier', ar: 'المورد' },
  'th.lead':     { en: 'Lead', ar: 'التوريد' },
  'th.terms':    { en: 'Terms', ar: 'الدفع' },
  'th.delivery': { en: 'Delivery', ar: 'التوصيل' },
  'th.landed':   { en: 'Landed cost', ar: 'التكلفة الواصلة' },
  'th.vsbest':   { en: 'vs best', ar: 'مقابل الأرخص' },
  'th.score':    { en: 'Score', ar: 'النقاط' },
  'cmp.award':     { en: 'Award', ar: 'ترسية' },
  'cmp.allLines':  { en: 'all lines', ar: 'كل البنود' },
  'cmp.someLines': { en: '{a} of {b} lines', ar: '{a} من {b} بنود' },
  'cmp.seeNote':   { en: 'see note', ar: 'انظر الملاحظة' },
  'cmp.cheapest':  { en: 'cheapest', ar: 'الأرخص' },
  'cmp.notRanked': { en: 'not ranked', ar: 'غير مصنّف' },
  'd.short': { en: '{n} d', ar: '{n} ي' },

  'lbl.h': { en: 'Line by line', ar: 'بندًا ببند' },
  'lbl.d': { en: 'Unit prices, cheapest in green. This is the view that tells you whether one supplier is genuinely cheaper or just cheaper on the big line.',
             ar: 'أسعار الوحدات، والأرخص بالأخضر. هذه الزاوية تُظهر هل المورد أرخص فعلًا أم أرخص في البند الكبير فقط.' },
  'lbl.swipe': { en: 'Swipe the table sideways for every supplier →', ar: 'اسحب الجدول جانبًا لبقية الموردين ←' },

  'split.h': { en: 'Split award — cheapest supplier per line', ar: 'ترسية مجزأة — أرخص مورد لكل بند' },
  'split.none': { en: 'No single supplier covered every line, so splitting the order is the only way to buy this request in full.',
                  ar: 'لا يوجد مورد واحد غطّى كل البنود، فتجزئة الطلب هي الطريقة الوحيدة لشرائه كاملًا.' },
  'split.save': { en: 'Split the order and save {p}', ar: 'جزّئ الطلب ووفّر {p}' },
  'split.save.d': { en: 'Against {p} from the cheapest single supplier — after paying {n} delivery charges ({d} in total). Volume discounts quoted on the full package are not counted here.',
                    ar: 'مقارنة بـ {p} من أرخص مورد واحد — بعد دفع {n} رسوم توصيل ({d} إجمالًا). خصومات الكمية المشروطة بكامل الطلب غير محسوبة هنا.' },
  'split.thin.pos': { en: 'Splitting saves only {p}', ar: 'التجزئة توفّر {p} فقط' },
  'split.thin.neg': { en: 'Splitting costs {p} more', ar: 'التجزئة تكلّف {p} زيادة' },
  'split.thin.d': { en: 'Not worth {n} separate deliveries to chase — award the whole request to the cheapest single supplier.',
                    ar: 'لا تستحق ملاحقة {n} توصيلات منفصلة — رسِّ الطلب كاملًا على أرخص مورد واحد.' },
  'split.buyFrom':   { en: 'Buy from', ar: 'اشترِ من' },
  'split.unit':      { en: 'Unit', ar: 'سعر الوحدة' },
  'split.lineTotal': { en: 'Line total', ar: 'إجمالي البند' },
  'split.total':     { en: 'Landed cost, split {n} ways', ar: 'التكلفة الواصلة موزعة على {n} موردين' },

  'aw.banner': { en: '🏆 <b>Awarded to {s}</b> — {p} landed, delivery in {d}, {t}.',
                 ar: '🏆 <b>تمت الترسية على {s}</b> — {p} واصلة، توريد خلال {d}، {t}.' },
  'aw.at':  { en: 'Awarded {t}.', ar: 'تمت الترسية {t}.' },
  'aw.msg': { en: '💬 Message them', ar: '💬 راسلهم' },
  'aw.confirm':       { en: 'Award this request to {s} for {p}?', ar: 'ترسية هذا الطلب على {s} مقابل {p}؟' },
  'aw.confirm.gap':   { en: 'This bid covers only {a} of {b} lines — the rest of the request stays unbought.',
                        ar: 'هذا العرض يغطي {a} من {b} بنود فقط — بقية الطلب تبقى دون شراء.' },
  'aw.confirm.final': { en: 'This is final and everyone bidding will see it.', ar: 'هذا قرار نهائي وسيراه كل من قدّم عرضًا.' },

  'closedEmpty':      { en: 'Bidding closed {t} with no bids.', ar: 'أُقفلت العروض {t} دون أي عرض.' },
  'closedEmpty.mine': { en: 'Post it again with a longer window, or send the link to more suppliers.',
                        ar: 'انشره من جديد بفترة أطول، أو أرسل الرابط لمزيد من الموردين.' },
  'notFound': { en: 'That request could not be found. It may have been posted on another device — requests only travel between devices once Supabase is set up.',
                ar: 'لم يُعثر على هذا الطلب. ربما نُشر من جهاز آخر — الطلبات لا تنتقل بين الأجهزة إلا بعد تهيئة Supabase.' },
  'notFound.back': { en: '← Back to the board', ar: 'العودة إلى المنصّة' },
  // ---- the live auction -----------------------------------------------------
  'live.lowest':   { en: 'Lowest price right now', ar: 'أقل سعر الآن' },
  'live.from':     { en: 'from {s}', ar: 'من {s}' },
  'live.none':     { en: 'No bids yet', ar: 'لا توجد عروض بعد' },
  'live.noneHint': { en: 'The first supplier to bid sets the price everyone else has to beat.',
                     ar: 'أول مورد يقدّم سعرًا يضع الرقم الذي على البقية كسره.' },
  'live.rule':     { en: 'Every price here is public and can be undercut. When the clock stops, the lowest complete price wins automatically — nobody picks a winner.',
                     ar: 'كل سعر هنا معلن ويمكن النزول تحته. وعند انتهاء الوقت يفوز أقل سعر كامل تلقائيًا — لا أحد يختار الفائز.' },
  'live.youLead':  { en: '🥇 You are leading', ar: '🥇 أنت المتصدر' },
  'live.youAre':   { en: 'You are #{n} — go below {p} to take the lead', ar: 'ترتيبك {n} — انزل تحت {p} لتتصدر' },
  'live.beat':     { en: 'Go below {p} to take the lead', ar: 'انزل تحت {p} لتتصدر' },
  'live.first':    { en: 'No one has bid yet — your price sets the mark', ar: 'لا أحد زايد بعد — سعرك هو الذي يضع المستوى' },
  'live.standings':{ en: 'Live standings', ar: 'الترتيب المباشر' },
  'live.history':  { en: 'Price drops', ar: 'نزول الأسعار' },
  'live.historyD': { en: 'Every price as it landed, newest first.', ar: 'كل سعر وقت وصوله، الأحدث أولًا.' },
  'live.dropped':  { en: 'dropped to', ar: 'نزل إلى' },
  'live.opened':   { en: 'opened at', ar: 'بدأ بـ' },
  'live.lowerBtn': { en: 'Lower my price', ar: 'خفّض سعري' },
  'live.myPrice':  { en: 'Your price', ar: 'سعرك' },
  'live.updating': { en: 'updating live', ar: 'يتحدّث مباشرة' },
  'bid.errHigher': { en: 'This is an auction — your new price must be below your current {p}.',
                     ar: 'هذا مزاد — سعرك الجديد يجب أن يكون أقل من سعرك الحالي {p}.' },

  // ---- the finish -----------------------------------------------------------
  'win.banner': { en: '🏆 <b>{s} won</b> at {p} landed — delivery in {d}, {t}.',
                  ar: '🏆 <b>فاز {s}</b> بمبلغ {p} واصلة — التوريد خلال {d}، {t}.' },
  'win.auto':   { en: 'Lowest complete price when the clock stopped. Nobody chose it.',
                  ar: 'أقل سعر كامل عند انتهاء الوقت. لم يخترها أحد.' },
  'win.none':   { en: 'The auction ended without a bid covering every line, so there is no winner. Post it again with a longer window, or send the link to more suppliers.',
                  ar: 'انتهى المزاد دون عرض يغطي كل البنود، فلا يوجد فائز. انشره من جديد بمدة أطول، أو أرسل الرابط لمزيد من الموردين.' },
  'win.youWon': { en: '🏆 You won this auction', ar: '🏆 فزت بهذا المزاد' },
  'card.winner': { en: '🏆 {s} · {p}', ar: '🏆 {s} · {p}' },

  'posted.live': { en: '✅ <b>{ref} is live.</b> Send the link below to every supplier you would normally call — the more of them bidding, the lower it goes. It ends {t}, and the cheapest wins by itself.',
                   ar: '✅ <b>{ref} انطلق.</b> أرسل الرابط أدناه لكل مورد كنت ستتصل به — كل ما زاد عددهم نزل السعر أكثر. ينتهي {t}، ويفوز الأرخص وحده.' }
};

function tr(key, vars) {
  const entry = MZ_STR[key];
  let s = entry ? (entry[MZ_LANG] != null ? entry[MZ_LANG] : entry.en) : key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
  return s;
}

// ---- Arabic plurals ---------------------------------------------------------
// Arabic counts real things properly: dual forms, 3–10 plural, 11+ singular
// accusative. English just gets its s.

function bidsWord(n) {
  if (!mzIsAr()) return `${n} bid${n === 1 ? '' : 's'}`;
  if (n === 0) return 'لا عروض';
  if (n === 1) return 'عرض واحد';
  if (n === 2) return 'عرضان';
  if (n <= 10) return `${n} عروض`;
  return `${n} عرضًا`;
}

function sealedBidsWord(n) {
  if (!mzIsAr()) return `${n} sealed bid${n === 1 ? '' : 's'}`;
  if (n === 0) return 'لا عروض مغلقة';
  if (n === 1) return 'عرض مغلق واحد';
  if (n === 2) return 'عرضان مغلقان';
  if (n <= 10) return `${n} عروض مغلقة`;
  return `${n} عرضًا مغلقًا`;
}

// Time words used inside countdowns and lead times: يوم/يومان/أيام etc.
function dayWord(n) {
  if (!mzIsAr()) return `${n} day${n === 1 ? '' : 's'}`;
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومان';
  if (n <= 10) return `${n} أيام`;
  return `${n} يومًا`;
}

function hourWord(n) {
  if (!mzIsAr()) return `${n} hour${n === 1 ? '' : 's'}`;
  if (n === 1) return 'ساعة';
  if (n === 2) return 'ساعتان';
  if (n <= 10) return `${n} ساعات`;
  return `${n} ساعة`;
}

function minWord(n) {
  if (!mzIsAr()) return `${n} minute${n === 1 ? '' : 's'}`;
  if (n === 1) return 'دقيقة';
  if (n === 2) return 'دقيقتان';
  if (n <= 10) return `${n} دقائق`;
  return `${n} دقيقة`;
}

function linesWord(n) {
  if (!mzIsAr()) return `${n} line${n === 1 ? '' : 's'}`;
  if (n === 1) return 'بند واحد';
  if (n === 2) return 'بندان';
  if (n <= 10) return `${n} بنود`;
  return `${n} بندًا`;
}

// ---- applying it ------------------------------------------------------------
// Static page text carries data-i18n / data-i18n-html / data-i18n-ph
// attributes and is retranslated in place — including markup that pages
// generate later, since they stamp the same attributes. Everything rendered
// from JS re-renders through window.onLangChange.

function mzApplyLang() {
  document.documentElement.lang = MZ_LANG;
  document.documentElement.dir = mzIsAr() ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = tr(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = tr(el.dataset.i18nPh); });
  const titleKey = document.body && document.body.dataset.i18nTitle;
  if (titleKey) document.title = tr(titleKey);
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = mzIsAr() ? 'English' : 'عربي';
}

function mzSetLang(lang) {
  MZ_LANG = lang;
  try { localStorage.setItem(MZ_LANG_KEY, lang); } catch { /* private mode */ }
  mzApplyLang();
  if (typeof window.onLangChange === 'function') window.onLangChange();
}

document.addEventListener('click', e => {
  if (e.target.closest('#lang-toggle')) mzSetLang(mzIsAr() ? 'en' : 'ar');
});

document.addEventListener('DOMContentLoaded', mzApplyLang);
