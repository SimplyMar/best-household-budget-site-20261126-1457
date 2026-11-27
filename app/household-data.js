// Multi-month household budget dataset for the Mercer-Lin family (Maya, Sam, and Leo).
// Every envelope balance, account total, bill status, and pace curve is computed live from these records.

export const HOUSEHOLD_PROFILE = {
  name: "Mercer-Lin Household",
  subtitle: "Maya, Sam & Leo · Dual-income household ledger",
  currency: "USD",
  activeMonth: "2026-11",
  asOfDate: "2026-11-26",
  members: ["Joint", "Maya", "Sam"],
  coreMonthlyExpensesBaseline: 4890,
};

export const ACCOUNTS = [
  { id: "checking", name: "Joint Checking ••4810", institution: "Pecan Creek Credit Union", type: "checking", startingBalance: 4195.20, lastReconciled: "2026-11-24" },
  { id: "hysa", name: "Emergency & Sinking HYSA ••1104", institution: "Harborlight Direct (4.35% APY)", type: "savings", startingBalance: 17867.70, lastReconciled: "2026-11-25" },
  { id: "visa", name: "Everyday Cashback Visa ••9022", institution: "Civic Rewards Card", type: "credit", startingBalance: -412.40, lastReconciled: "2026-11-24" },
];

export const ENVELOPE_GROUPS = [
  { id: "essentials", title: "Fixed Essentials", bucket: "needs", description: "Contractual housing, care, utilities, and commuting costs." },
  { id: "flexible", title: "Flexible Living", bucket: "wants", description: "Day-to-day groceries, household supplies, family outings, and dining." },
  { id: "sinking", title: "True-Expense Reserves", bucket: "savings", description: "Monthly set-asides for irregular annual bills, repairs, and holidays." },
  { id: "wealth_debt", title: "Debt Paydown & Future", bucket: "savings", description: "Accelerated debt payoff plus emergency and education savings." },
];

export const ENVELOPES = [
  { id: "mortgage", groupId: "essentials", name: "Mortgage, Tax & HOA Escrow", dueDay: 1, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 2180, "2026-10": 2180, "2026-11": 2180 }, note: "Fixed 30-yr at 5.625%; drafts 1st of month." },
  { id: "childcare", groupId: "essentials", name: "Preschool & Aftercare (Leo)", dueDay: 3, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 980, "2026-10": 980, "2026-11": 980 }, note: "Oakwood Early Learning tuition." },
  { id: "utilities", groupId: "essentials", name: "Electric, Water & Natural Gas", dueDay: 18, autoPay: false, rolloverByMonth: { "2026-09": 12, "2026-10": 15.2, "2026-11": 18.4 }, assignedByMonth: { "2026-09": 260, "2026-10": 245, "2026-11": 245 }, note: "Gas bill ($46.00) due Nov 28." },
  { id: "internet_phone", groupId: "essentials", name: "Fiber Internet & Family Mobile", dueDay: 27, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 135, "2026-10": 135, "2026-11": 135 }, note: "Fiber $70 paid; Mobile $65 drafts Nov 27." },
  { id: "transit_fuel", groupId: "essentials", name: "EV Charging, Fuel & Transit", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 8, "2026-10": 11, "2026-11": 14 }, assignedByMonth: { "2026-09": 220, "2026-10": 215, "2026-11": 215 }, note: "Commute pass + weekend fuel." },
  { id: "health_rx", groupId: "essentials", name: "Medical Copays & Pharmacy", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 30, "2026-10": 38, "2026-11": 45 }, assignedByMonth: { "2026-09": 210, "2026-10": 210, "2026-11": 210 }, note: "Pediatric visits, dental & prescriptions." },

  { id: "groceries", groupId: "flexible", name: "Groceries & Farmers Market", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 14, "2026-10": 18.5, "2026-11": 22.5 }, assignedByMonth: { "2026-09": 750, "2026-10": 760, "2026-11": 760 }, note: "Target ~$185/week meal-planned." },
  { id: "dining", groupId: "flexible", name: "Dining Out & Coffee", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 0, "2026-10": 6, "2026-11": 0 }, assignedByMonth: { "2026-09": 250, "2026-10": 240, "2026-11": 240 }, note: "Includes Friday takeout & work coffee." },
  { id: "household_supplies", groupId: "flexible", name: "Household Goods & Pet Care", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 9, "2026-10": 10, "2026-11": 12 }, assignedByMonth: { "2026-09": 195, "2026-10": 195, "2026-11": 195 }, note: "Cleaning staples + Bramble kibble." },
  { id: "kids_activities", groupId: "flexible", name: "Kids Clothes, Books & Swim", dueDay: 12, autoPay: false, rolloverByMonth: { "2026-09": 10, "2026-10": 14, "2026-11": 16 }, assignedByMonth: { "2026-09": 165, "2026-10": 165, "2026-11": 165 }, note: "YMCA Saturday swim + winter boots." },
  { id: "recreation", groupId: "flexible", name: "Family Outings & Media", dueDay: 20, autoPay: false, rolloverByMonth: { "2026-09": 18, "2026-10": 20, "2026-11": 24 }, assignedByMonth: { "2026-09": 180, "2026-10": 180, "2026-11": 180 }, note: "Museum pass, streaming & date night." },
  { id: "personal_care", groupId: "flexible", name: "Maya & Sam Personal Money", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 140, "2026-10": 140, "2026-11": 140 }, note: "$70 each no-questions allowance." },

  { id: "home_repair", groupId: "sinking", name: "Home Maintenance Reserve", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 390, "2026-10": 515, "2026-11": 640 }, assignedByMonth: { "2026-09": 250, "2026-10": 250, "2026-11": 250 }, note: "1% annual home upkeep buffer." },
  { id: "auto_ins_maint", groupId: "sinking", name: "Auto Insurance & Tire Sinking", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 280, "2026-10": 400, "2026-11": 520 }, assignedByMonth: { "2026-09": 220, "2026-10": 220, "2026-11": 220 }, note: "6-month policy ($780) renews Jan 15." },
  { id: "holiday_gifts", groupId: "sinking", name: "Holidays, Hosting & Gifts", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 180, "2026-10": 290, "2026-11": 380 }, assignedByMonth: { "2026-09": 240, "2026-10": 250, "2026-11": 260 }, note: "Thanksgiving dinner + winter travel." },
  { id: "annual_vet_subs", groupId: "sinking", name: "Annual Vet & Memberships", dueDay: null, autoPay: false, rolloverByMonth: { "2026-09": 95, "2026-10": 145, "2026-11": 190 }, assignedByMonth: { "2026-09": 120, "2026-10": 120, "2026-11": 120 }, note: "Annual vaccinations & roadside renewal." },

  { id: "debt_auto", groupId: "wealth_debt", name: "Credit Union Auto Loan (6.4%)", dueDay: 10, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 385, "2026-10": 385, "2026-11": 385 }, note: "$285 minimum + $100 principal boost." },
  { id: "debt_card", groupId: "wealth_debt", name: "Roof & Patio Card Paydown (18.9%)", dueDay: 14, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 310, "2026-10": 310, "2026-11": 310 }, note: "$95 minimum + $215 avalanche extra." },
  { id: "emergency_reserve", groupId: "wealth_debt", name: "6-Month Emergency HYSA", dueDay: 16, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 400, "2026-10": 400, "2026-11": 400 }, note: "Building $16,400 -> $24,000 target." },
  { id: "college_529", groupId: "wealth_debt", name: "Leo 529 & Roth Contribution", dueDay: 16, autoPay: true, rolloverByMonth: { "2026-09": 0, "2026-10": 0, "2026-11": 0 }, assignedByMonth: { "2026-09": 250, "2026-10": 250, "2026-11": 250 }, note: "Automated mid-month investment." },
];

export const RECURRING_BILLS = [
  { id: "bill-mortgage", name: "Pecan Creek Mortgage & Escrow", envelopeId: "mortgage", amount: 2180.00, dueDay: 1, autoPay: true, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-preschool", name: "Oakwood Early Learning Tuition", envelopeId: "childcare", amount: 980.00, dueDay: 3, autoPay: true, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-water", name: "City Water, Wastewater & Recycling", envelopeId: "utilities", amount: 68.40, dueDay: 8, autoPay: true, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-autoloan", name: "Credit Union Auto Loan", envelopeId: "debt_auto", amount: 385.00, dueDay: 10, autoPay: true, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-fiber", name: "Bluebonnet Municipal Fiber 1Gbps", envelopeId: "internet_phone", amount: 70.00, dueDay: 12, autoPay: true, accountId: "visa", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-swim", name: "YMCA Youth Swim Lessons", envelopeId: "kids_activities", amount: 64.00, dueDay: 12, autoPay: false, accountId: "visa", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-roofcard", name: "Home Repair Card Paydown", envelopeId: "debt_card", amount: 310.00, dueDay: 14, autoPay: true, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-electric", name: "Austin Energy Co-op", envelopeId: "utilities", amount: 94.40, dueDay: 18, autoPay: false, accountId: "checking", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-streaming", name: "Family Music & Public TV Passport", envelopeId: "recreation", amount: 24.00, dueDay: 20, autoPay: true, accountId: "visa", paidMonths: ["2026-09", "2026-10", "2026-11"] },
  { id: "bill-mobile", name: "Mint Family Wireless (2 Lines)", envelopeId: "internet_phone", amount: 65.00, dueDay: 27, autoPay: true, accountId: "visa", paidMonths: ["2026-09", "2026-10"] },
  { id: "bill-gas", name: "Texas Gas Service Winter Heating", envelopeId: "utilities", amount: 46.00, dueDay: 28, autoPay: false, accountId: "checking", paidMonths: ["2026-09", "2026-10"] },
];

export const ANNUAL_IRREGULAR_EXPENSES = [
  { id: "irr-auto-ins", name: "6-Month Two-Car Insurance Policy", renewalMonth: "Jan & Jul", cost: 780, saved: 740, monthlySetAside: 130 },
  { id: "irr-holidays", name: "Thanksgiving & Winter Family Travel", renewalMonth: "Nov & Dec", cost: 1250, saved: 640, monthlySetAside: 105 },
  { id: "irr-hvac-home", name: "HVAC Tune-Up, Gutter & Exterior Care", renewalMonth: "Apr & Oct", cost: 960, saved: 772, monthlySetAside: 80 },
  { id: "irr-vet-dental", name: "Bramble Annual Wellness & Vaccines", renewalMonth: "March", cost: 420, saved: 310, monthlySetAside: 35 },
];

export const SINKING_GOALS = [
  { id: "goal-efund", name: "6-Month Core Emergency Reserve", category: "Safety Net", saved: 16400, target: 24000, monthlyPlan: 400, targetDate: "2028-06", priority: "High", notes: "Held in 4.35% APY HYSA ••1104; covers 3.35 months today." },
  { id: "goal-auto-ins", name: "January Auto Insurance Renewal", category: "True Expense", saved: 740, target: 780, monthlyPlan: 220, targetDate: "2027-01", priority: "Due Soon", notes: "95% funded ahead of Jan 15 semi-annual renewal." },
  { id: "goal-waterheater", name: "Heat-Pump Water Heater Replacement", category: "Home Capital", saved: 1480, target: 2600, monthlyPlan: 250, targetDate: "2027-04", priority: "Medium", notes: "Current tank is 11 years old; buying cash before failure." },
  { id: "goal-summer-trip", name: "Colorado National Parks Road Trip", category: "Family Memory", saved: 920, target: 2400, monthlyPlan: 185, targetDate: "2027-07", priority: "Flexible", notes: "Cabin deposit + park passes paid without credit cards." },
];

export const DEBTS = [
  { id: "debt-patio-card", name: "Storm Fence & Roof Repair Card", lender: "Civic Credit Line", balance: 2480.00, apr: 18.9, minPayment: 95.00, currentBudgeted: 310.00 },
  { id: "debt-subaru", name: "2023 Family Wagon Auto Loan", lender: "Pecan Creek CU", balance: 6940.00, apr: 6.4, minPayment: 285.00, currentBudgeted: 385.00 },
  { id: "debt-solar", name: "Attic Insulation Efficiency Loan", lender: "Austin Green Lending", balance: 1820.00, apr: 4.2, minPayment: 85.00, currentBudgeted: 85.00 },
];

export const SEED_TRANSACTIONS = [
  { id: "tx-1101-inc1", date: "2026-11-01", payee: "City Planning Dept Payroll", type: "income", amount: 2310.00, envelopeId: null, accountId: "checking", member: "Maya", cleared: true, memo: "Paycheck #1 (net after 401k & health)" },
  { id: "tx-1101-inc2", date: "2026-11-01", payee: "Ridgeway Acoustic Lab Payroll", type: "income", amount: 1610.00, envelopeId: null, accountId: "checking", member: "Sam", cleared: true, memo: "Paycheck #1 direct deposit" },
  { id: "tx-1115-inc3", date: "2026-11-15", payee: "City Planning Dept Payroll", type: "income", amount: 2310.00, envelopeId: null, accountId: "checking", member: "Maya", cleared: true, memo: "Paycheck #2 direct deposit" },
  { id: "tx-1115-inc4", date: "2026-11-15", payee: "Ridgeway Acoustic Lab Payroll", type: "income", amount: 1610.00, envelopeId: null, accountId: "checking", member: "Sam", cleared: true, memo: "Paycheck #2 direct deposit" },

  { id: "tx-1101-mtg", date: "2026-11-01", payee: "Pecan Creek Mortgage", type: "expense", amount: 2180.00, envelopeId: "mortgage", accountId: "checking", member: "Joint", cleared: true, memo: "November principal, interest & escrow" },
  { id: "tx-1102-gro1", date: "2026-11-02", payee: "H-E-B Curbside Market", type: "expense", amount: 194.60, envelopeId: "groceries", accountId: "visa", member: "Joint", cleared: true, memo: "Week 1 produce, dairy, pantry staples" },
  { id: "tx-1103-care", date: "2026-11-03", payee: "Oakwood Early Learning", type: "expense", amount: 980.00, envelopeId: "childcare", accountId: "checking", member: "Joint", cleared: true, memo: "November tuition" },
  { id: "tx-1105-fuel", date: "2026-11-05", payee: "ChargePoint & Shell Station", type: "expense", amount: 64.50, envelopeId: "transit_fuel", accountId: "visa", member: "Sam", cleared: true, memo: "Tank fill-up + L2 charger" },
  { id: "tx-1106-din1", date: "2026-11-06", payee: "Tarka Indian Kitchen", type: "expense", amount: 74.80, envelopeId: "dining", accountId: "visa", member: "Joint", cleared: true, memo: "Friday family takeout night" },
  { id: "tx-1108-wat", date: "2026-11-08", payee: "City Water & Recycling", type: "expense", amount: 68.40, envelopeId: "utilities", accountId: "checking", member: "Joint", cleared: true, memo: "Auto-draft utility bill" },
  { id: "tx-1109-split1", date: "2026-11-09", payee: "Target Household Run (Split 1/2)", type: "expense", amount: 168.20, envelopeId: "groceries", accountId: "visa", member: "Maya", cleared: true, splitGroup: "target-1109", memo: "Split receipt: pantry & school snacks" },
  { id: "tx-1109-split2", date: "2026-11-09", payee: "Target Household Run (Split 2/2)", type: "expense", amount: 62.80, envelopeId: "kids_activities", accountId: "visa", member: "Maya", cleared: true, splitGroup: "target-1109", memo: "Split receipt: Leo winter fleece & boots" },
  { id: "tx-1110-auto", date: "2026-11-10", payee: "Pecan Creek Auto Loan", type: "expense", amount: 385.00, envelopeId: "debt_auto", accountId: "checking", member: "Joint", cleared: true, memo: "$285 min + $100 principal boost" },
  { id: "tx-1112-fib", date: "2026-11-12", payee: "Bluebonnet Fiber 1Gbps", type: "expense", amount: 70.00, envelopeId: "internet_phone", accountId: "visa", member: "Joint", cleared: true, memo: "Monthly home fiber" },
  { id: "tx-1112-swim", date: "2026-11-12", payee: "YMCA Youth Aquatics", type: "expense", amount: 64.00, envelopeId: "kids_activities", accountId: "visa", member: "Sam", cleared: true, memo: "November Saturday swim session" },
  { id: "tx-1114-card", date: "2026-11-14", payee: "Civic Credit Line Paydown", type: "expense", amount: 310.00, envelopeId: "debt_card", accountId: "checking", member: "Joint", cleared: true, memo: "Avalanche payment ($215 above minimum)" },
  { id: "tx-1115-gro2", date: "2026-11-15", payee: "Mueller Farmers Market", type: "expense", amount: 172.40, envelopeId: "groceries", accountId: "visa", member: "Joint", cleared: true, memo: "Week 3 groceries & fruit" },
  { id: "tx-1116-efund", date: "2026-11-16", payee: "Harborlight HYSA Transfer", type: "expense", amount: 400.00, envelopeId: "emergency_reserve", accountId: "checking", member: "Joint", cleared: true, memo: "Scheduled emergency reserve transfer" },
  { id: "tx-1116-529", date: "2026-11-16", payee: "Vanguard 529 & Roth Contribution", type: "expense", amount: 250.00, envelopeId: "college_529", accountId: "checking", member: "Joint", cleared: true, memo: "Monthly automated investing" },
  { id: "tx-1117-pet", date: "2026-11-17", payee: "Tomlinson Feed & Hardware", type: "expense", amount: 154.20, envelopeId: "household_supplies", accountId: "visa", member: "Sam", cleared: true, memo: "Dog food 30lb bag, detergent & bulbs" },
  { id: "tx-1118-elec", date: "2026-11-18", payee: "Austin Energy Co-op", type: "expense", amount: 94.40, envelopeId: "utilities", accountId: "checking", member: "Joint", cleared: true, memo: "282 kWh autumn billing cycle" },
  { id: "tx-1119-rx", date: "2026-11-19", payee: "Austin Pediatric & Peoples Rx", type: "expense", amount: 92.00, envelopeId: "health_rx", accountId: "visa", member: "Maya", cleared: true, memo: "Ear check copay + prescription" },
  { id: "tx-1120-rec", date: "2026-11-20", payee: "Thinkery Museum & Public TV", type: "expense", amount: 98.20, envelopeId: "recreation", accountId: "visa", member: "Joint", cleared: true, memo: "Sunday science museum + streaming" },
  { id: "tx-1121-home", date: "2026-11-21", payee: "Breed & Co Hardware", type: "expense", amount: 118.00, envelopeId: "home_repair", accountId: "visa", member: "Sam", cleared: true, memo: "MERV-13 filters & door weatherstripping" },
  { id: "tx-1122-din2", date: "2026-11-22", payee: "Pinthouse Pizza & Coffee", type: "expense", amount: 112.40, envelopeId: "dining", accountId: "visa", member: "Joint", cleared: true, memo: "Friends lunch + coffee beans" },
  { id: "tx-1123-gro3", date: "2026-11-23", payee: "H-E-B Fresh Market", type: "expense", amount: 133.20, envelopeId: "groceries", accountId: "visa", member: "Maya", cleared: true, memo: "Week 4 groceries" },
  { id: "tx-1124-hol", date: "2026-11-24", payee: "Central Market & BookPeople", type: "expense", amount: 284.00, envelopeId: "holiday_gifts", accountId: "visa", member: "Joint", cleared: true, memo: "Thanksgiving turkey, pies & niece books" },
  { id: "tx-1124-tran2", date: "2026-11-24", payee: "CapMetro Pass & Highway Fuel", type: "expense", amount: 104.00, envelopeId: "transit_fuel", accountId: "visa", member: "Maya", cleared: true, memo: "Monthly transit reload + road fuel" },
  { id: "tx-1125-pers", date: "2026-11-25", payee: "Running Shoes & Guitar Strings", type: "expense", amount: 96.00, envelopeId: "personal_care", accountId: "visa", member: "Sam", cleared: false, memo: "Maya & Sam personal allowance spend" },
  { id: "tx-1125-din3", date: "2026-11-25", payee: "Veracruz All Natural Tacos", type: "expense", amount: 81.30, envelopeId: "dining", accountId: "visa", member: "Joint", cleared: false, memo: "Pre-holiday dinner out (pushed Dining over)" },

  { id: "tx-1001-inc", date: "2026-10-01", payee: "Combined October Paychecks #1", type: "income", amount: 3920.00, envelopeId: null, accountId: "checking", member: "Joint", cleared: true, memo: "Oct 1 payroll deposits" },
  { id: "tx-1015-inc", date: "2026-10-15", payee: "Combined October Paychecks #2", type: "income", amount: 3920.00, envelopeId: null, accountId: "checking", member: "Joint", cleared: true, memo: "Oct 15 payroll deposits" },
  { id: "tx-1001-mtg", date: "2026-10-01", payee: "Pecan Creek Mortgage", type: "expense", amount: 2180.00, envelopeId: "mortgage", accountId: "checking", member: "Joint", cleared: true, memo: "October mortgage" },
  { id: "tx-1003-care", date: "2026-10-03", payee: "Oakwood Early Learning", type: "expense", amount: 980.00, envelopeId: "childcare", accountId: "checking", member: "Joint", cleared: true, memo: "October tuition" },
  { id: "tx-1012-gro", date: "2026-10-12", payee: "October Groceries & Market Total", type: "expense", amount: 736.50, envelopeId: "groceries", accountId: "visa", member: "Joint", cleared: true, memo: "4 weekly grocery runs" },
  { id: "tx-1018-util", date: "2026-10-18", payee: "October Utilities & Fiber", type: "expense", amount: 376.80, envelopeId: "utilities", accountId: "checking", member: "Joint", cleared: true, memo: "Electric, water, gas & fiber" },
  { id: "tx-1022-flex", date: "2026-10-22", payee: "October Dining, Transit & Kids", type: "expense", amount: 864.00, envelopeId: "dining", accountId: "visa", member: "Joint", cleared: true, memo: "Combined flexible household spend" },
  { id: "tx-1025-save", date: "2026-10-25", payee: "October Debt & HYSA Transfers", type: "expense", amount: 1345.00, envelopeId: "emergency_reserve", accountId: "checking", member: "Joint", cleared: true, memo: "Auto loan, card avalanche, HYSA & 529" },

  { id: "tx-0901-inc", date: "2026-09-01", payee: "Combined September Paychecks", type: "income", amount: 7690.00, envelopeId: null, accountId: "checking", member: "Joint", cleared: true, memo: "September household take-home" },
  { id: "tx-0901-mtg", date: "2026-09-01", payee: "Pecan Creek Mortgage & Care", type: "expense", amount: 3160.00, envelopeId: "mortgage", accountId: "checking", member: "Joint", cleared: true, memo: "Housing + preschool" },
  { id: "tx-0915-gro", date: "2026-09-15", payee: "September Groceries & Utilities", type: "expense", amount: 1128.00, envelopeId: "groceries", accountId: "visa", member: "Joint", cleared: true, memo: "Late-summer cooling & groceries" },
  { id: "tx-0924-save", date: "2026-09-24", payee: "September Debt & Savings Transfers", type: "expense", amount: 1345.00, envelopeId: "emergency_reserve", accountId: "checking", member: "Joint", cleared: true, memo: "Scheduled debt + savings" },
];