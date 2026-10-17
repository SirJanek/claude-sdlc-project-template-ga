/* MentorHub clickable prototype — in-memory demo database and mock REST endpoints.
   Endpoint paths match 05-Katalog-API.md one to one. */

interface Topic { id: string; name: string; icon: string; mentors: number; }
interface Mentor {
  id: string; name: string; headline: string; topics: string[]; languages: string[]; country: string;
  rate: number; rating: number; reviews: number; sessions: number; mentees: number; years: number;
  role: string; company: string; color: string; superMentor: boolean; responseHrs: number; intro: boolean;
  bio: string; experience: { period: string; title: string; org: string }[]; days: number[]; hours: number[];
  featured?: boolean;
}
interface Review { id: string; mentorId: string; author: string; rating: number; date: string; text: string; tags: string[]; reply?: string; }
interface Session {
  id: string; mentorId: string; menteeId: string; menteeName: string; start: string; minutes: number;
  type: 'intro' | 'regular'; status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'; price: number;
  reviewed: boolean; goal?: string; notes?: string; subscriptionId?: string; cancelReason?: string;
}
interface Subscription {
  id: string; mentorId: string; perWeek: number; minutes: number; credits: number; pricePerCycle: number;
  renewsOn: string; status: 'active' | 'paused' | 'ended';
}
interface Thread { id: string; withName: string; withColor: string; mentorId?: string; paidSession: boolean; unread: number; messages: { from: 'me' | 'them' | 'sys'; text: string; at: string }[]; }
interface AppNotification { id: string; kind: 'session' | 'payment' | 'message' | 'system'; text: string; at: string; read: boolean; href: string; }
interface Application {
  id: string; name: string; email: string; country: string; topics: string[]; years: number; headline: string; bio: string;
  linkedin: string; video: string; rate: number; hoursPerWeek: number; submitted: string;
  status: 'draft' | 'submitted' | 'pending' | 'changes' | 'approved' | 'rejected'; checks: { identity: boolean; linkedin: boolean; video: boolean }; note?: string;
}
interface Dispute {
  id: string; sessionId: string; kind: 'mentor_no_show' | 'quality' | 'technical' | 'payment'; opened: string; by: string; against: string;
  amount: number; status: 'open' | 'resolved'; description: string; timeline: string[]; resolution?: string;
}
interface Cart {
  kind: 'booking' | 'subscription'; mentorId: string; type?: 'intro' | 'regular'; start?: string; minutes: number;
  perWeek?: number; goal?: string; holdId?: string; holdExpires?: number; price: number; startDate?: string;
}
interface Slot { start: string; available: boolean; reason?: 'booked' | 'notice' | ''; }

/* ---------- time helpers for relative demo data ---------- */
function at(dayOffset: number, hour: number, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

/* ---------- business rules (configurable parameters, see 02-Use-case-i-przeplywy.md §Reguły) ---------- */
const RULES = {
  introMinutes: 30, introPriceFactor: 0.5, minNoticeHours: 4, freeCancelHours: 12, holdMinutes: 10,
  serviceFee: 1.5, roomOpensMinutesBefore: 10, payoutMin: 50, platformFeeTiers: [[0, 25], [50, 20], [200, 15]] as [number, number][],
};
const PROMO: Record<string, number> = { WELCOME10: 0.1 };

function freshDb() {
  const topics: Topic[] = [
    { id: 'product', name: 'Product management', icon: '🧭', mentors: 128 },
    { id: 'eng-lead', name: 'Engineering leadership', icon: '🛠️', mentors: 96 },
    { id: 'ai', name: 'AI engineering', icon: '🤖', mentors: 74 },
    { id: 'career', name: 'Career change into tech', icon: '🚀', mentors: 141 },
    { id: 'ux', name: 'UX & product design', icon: '🎨', mentors: 63 },
    { id: 'data', name: 'Data & analytics', icon: '📊', mentors: 58 },
    { id: 'startup', name: 'Startups & fundraising', icon: '💡', mentors: 41 },
    { id: 'speaking', name: 'Public speaking', icon: '🎤', mentors: 37 },
  ];
  const mentors: Mentor[] = [
    { id: 'm1', name: 'Anna Wiśniewska', headline: 'Head of Product · ex-fintech scale-up · helps PMs move to senior', topics: ['product', 'career'], languages: ['English', 'Polish'], country: 'Poland', rate: 80, rating: 4.9, reviews: 132, sessions: 812, mentees: 96, years: 12, role: 'Head of Product', company: 'Fintech scale-up', color: '#7a4fd8', superMentor: true, responseHrs: 2, intro: true, featured: true,
      bio: 'I have spent 12 years building B2B and consumer products, the last five leading product teams of up to 30 people. I help product managers grow into senior and lead roles: discovery, prioritisation, stakeholder management and preparing for interviews. Sessions are practical — we work on your real roadmap, PRD or case study.',
      experience: [{ period: '2021 – now', title: 'Head of Product', org: 'Fintech scale-up' }, { period: '2016 – 2021', title: 'Senior Product Manager', org: 'E-commerce platform' }, { period: '2013 – 2016', title: 'Business Analyst', org: 'Consulting firm' }],
      days: [1, 2, 3, 4], hours: [8, 9, 17, 18, 19] },
    { id: 'm2', name: 'Marek Zając', headline: 'Engineering Manager · 3 teams, 25 engineers · first-time managers', topics: ['eng-lead', 'career'], languages: ['English', 'Polish'], country: 'Poland', rate: 95, rating: 4.8, reviews: 87, sessions: 540, mentees: 61, years: 15, role: 'Engineering Manager', company: 'SaaS company', color: '#1f8a70', superMentor: true, responseHrs: 4, intro: true, featured: true,
      bio: 'Former staff engineer turned engineering manager. I mentor new managers and tech leads: 1:1s, feedback, hiring, delivery under pressure and building trust with product. Expect homework between sessions.',
      experience: [{ period: '2019 – now', title: 'Engineering Manager', org: 'SaaS company' }, { period: '2012 – 2019', title: 'Staff Engineer', org: 'Telecom' }],
      days: [1, 3, 5, 6], hours: [7, 12, 18, 19, 20] },
    { id: 'm3', name: 'Tomasz Lis', headline: 'AI Engineer · LLM apps in production · RAG, evals, agents', topics: ['ai', 'data'], languages: ['English', 'Polish'], country: 'Poland', rate: 120, rating: 4.7, reviews: 41, sessions: 190, mentees: 33, years: 9, role: 'Principal AI Engineer', company: 'AI consultancy', color: '#d0563b', superMentor: false, responseHrs: 6, intro: true, featured: true,
      bio: 'I build LLM-based products for enterprise clients: retrieval, evaluation pipelines, agent workflows and cost control. I can review your architecture, help you plan an AI feature or prepare for an AI engineering role.',
      experience: [{ period: '2022 – now', title: 'Principal AI Engineer', org: 'AI consultancy' }, { period: '2016 – 2022', title: 'ML Engineer', org: 'Retail analytics' }],
      days: [2, 4, 6], hours: [9, 10, 11, 16, 17] },
    { id: 'm4', name: 'Sofia Martins', headline: 'Product Designer · design systems · portfolio reviews', topics: ['ux', 'career'], languages: ['English', 'Portuguese', 'Spanish'], country: 'Portugal', rate: 60, rating: 4.9, reviews: 203, sessions: 1310, mentees: 150, years: 10, role: 'Lead Product Designer', company: 'Travel marketplace', color: '#c2417a', superMentor: true, responseHrs: 1, intro: true, featured: true,
      bio: 'Portfolio reviews, design critiques and career strategy for designers. I lead a design system used by 40 designers and love helping juniors land their first role.',
      experience: [{ period: '2020 – now', title: 'Lead Product Designer', org: 'Travel marketplace' }],
      days: [1, 2, 3, 4, 5], hours: [10, 11, 14, 15] },
    { id: 'm5', name: 'James Carter', headline: 'Data Science Manager · analytics careers · SQL to ML', topics: ['data', 'ai'], languages: ['English'], country: 'United Kingdom', rate: 110, rating: 4.6, reviews: 29, sessions: 150, mentees: 25, years: 11, role: 'Data Science Manager', company: 'Insurance group', color: '#2f6fd0', superMentor: false, responseHrs: 12, intro: false,
      bio: 'I help analysts grow into data scientists and data scientists into leads. Mock interviews, project reviews and learning plans.',
      experience: [{ period: '2018 – now', title: 'Data Science Manager', org: 'Insurance group' }],
      days: [2, 3, 4], hours: [18, 19, 20] },
    { id: 'm6', name: 'Olga Nowicka', headline: 'Startup founder (exit 2023) · fundraising · go-to-market', topics: ['startup', 'product'], languages: ['English', 'Polish', 'German'], country: 'Germany', rate: 150, rating: 5.0, reviews: 18, sessions: 70, mentees: 15, years: 14, role: 'Founder & angel investor', company: 'Independent', color: '#a8762a', superMentor: false, responseHrs: 24, intro: true,
      bio: 'Founded and sold a B2B SaaS. Now an angel investor. I help early-stage founders with pitch decks, investor pipelines and first sales.',
      experience: [{ period: '2015 – 2023', title: 'Founder & CEO', org: 'B2B SaaS (acquired)' }],
      days: [5, 6], hours: [10, 11, 12] },
    { id: 'm7', name: 'Piotr Kamiński', headline: 'Conference speaker · TEDx coach · presenting to executives', topics: ['speaking', 'career'], languages: ['Polish', 'English'], country: 'Poland', rate: 45, rating: 4.8, reviews: 66, sessions: 420, mentees: 80, years: 8, role: 'Communication coach', company: 'Own practice', color: '#5c6b7a', superMentor: false, responseHrs: 3, intro: true,
      bio: 'I coach engineers and managers to present with clarity: structure, storytelling, slides and handling tough questions.',
      experience: [{ period: '2017 – now', title: 'Communication coach', org: 'Own practice' }],
      days: [1, 2, 3, 4, 5], hours: [8, 13, 19] },
    { id: 'm8', name: 'Lena Fischer', headline: 'VP Engineering · scaling orgs 20 → 200 · tech strategy', topics: ['eng-lead', 'startup'], languages: ['English', 'German'], country: 'Germany', rate: 180, rating: 4.9, reviews: 22, sessions: 95, mentees: 19, years: 18, role: 'VP Engineering', company: 'Mobility unicorn', color: '#3b3fd6', superMentor: true, responseHrs: 8, intro: false,
      bio: 'For directors and VPs: org design, engineering strategy, working with the board and hiring leaders.',
      experience: [{ period: '2019 – now', title: 'VP Engineering', org: 'Mobility unicorn' }],
      days: [3, 5], hours: [17, 18] },
  ];
  const reviewPool = [
    ['Clear, structured and honest feedback. I left with three concrete actions.', ['Actionable advice', 'Clear communication']],
    ['Helped me prepare for a senior interview — got the offer two weeks later!', ['Career impact', 'Well prepared']],
    ['Great listener, asked the right questions instead of lecturing.', ['Good listener']],
    ['Very practical. We reviewed my real roadmap line by line.', ['Actionable advice', 'Expert knowledge']],
    ['Good session, though we ran out of time on the second topic.', ['Expert knowledge']],
  ] as [string, string[]][];
  const names = ['Ola K.', 'Michał P.', 'Jan W.', 'Eva S.', 'Daniel R.', 'Marta G.'];
  const reviews: Review[] = [];
  mentors.forEach((m, i) => {
    for (let k = 0; k < 5; k++) {
      const [text, tags] = reviewPool[(i + k) % reviewPool.length];
      reviews.push({ id: `r${m.id}${k}`, mentorId: m.id, author: names[(i + k) % names.length], rating: k === 4 ? 4 : 5, date: at(-(k * 9 + i + 3), 12), text, tags,
        reply: k === 0 ? 'Thank you — great work between sessions!' : undefined });
    }
  });

  const sessions: Session[] = [
    { id: 's1', mentorId: 'm2', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(1, 18), minutes: 60, type: 'regular', status: 'scheduled', price: 95, reviewed: false, goal: 'Prepare my first performance review cycle as a new manager.', subscriptionId: 'sub1' },
    { id: 's2', mentorId: 'm1', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(2, 17), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, goal: 'Understand what a move to Senior PM requires.' },
    { id: 's3', mentorId: 'm2', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-6, 18), minutes: 60, type: 'regular', status: 'completed', price: 95, reviewed: true, subscriptionId: 'sub1', notes: '- Agreed 1:1 template\n- Homework: write feedback for 2 people' },
    { id: 's4', mentorId: 'm3', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-2, 10), minutes: 30, type: 'intro', status: 'completed', price: 30, reviewed: false },
    { id: 's5', mentorId: 'm5', menteeId: 'u1', menteeName: 'Kasia Nowak', start: at(-10, 19), minutes: 60, type: 'regular', status: 'cancelled', price: 110, reviewed: false, cancelReason: 'Schedule conflict' },
    // Mentor-side (Anna, m1) sessions with other mentees
    { id: 's6', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(0, 17), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, goal: 'Roadmap review for Q1', subscriptionId: 'sub9' },
    { id: 's7', mentorId: 'm1', menteeId: 'u3', menteeName: 'Ola Mazur', start: at(0, 19), minutes: 30, type: 'intro', status: 'scheduled', price: 20, reviewed: false, goal: 'Switching from QA to product' },
    { id: 's8', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(3, 8), minutes: 60, type: 'regular', status: 'scheduled', price: 80, reviewed: false, subscriptionId: 'sub9' },
    { id: 's9', mentorId: 'm1', menteeId: 'u4', menteeName: 'Jan Wróbel', start: at(-3, 18), minutes: 60, type: 'regular', status: 'completed', price: 80, reviewed: true },
    { id: 's10', mentorId: 'm1', menteeId: 'u2', menteeName: 'Piotr Bąk', start: at(-4, 8), minutes: 60, type: 'regular', status: 'completed', price: 80, reviewed: true },
  ];
  const subscriptions: Subscription[] = [
    { id: 'sub1', mentorId: 'm2', perWeek: 1, minutes: 60, credits: 2, pricePerCycle: 380, renewsOn: at(12, 9), status: 'active' },
  ];
  const paymentMethods = [{ id: 'pm1', brand: 'Visa', last4: '4242', exp: '08/28', default: true }];
  const invoices = [
    { id: 'INV-2026-0141', date: at(-16, 9), desc: 'Marek Zając · 4 weeks · 1×60 min', amount: 381.5, status: 'paid' },
    { id: 'INV-2026-0157', date: at(-5, 9), desc: 'Tomasz Lis · intro session 30 min', amount: 31.5, status: 'paid' },
    { id: 'INV-2026-0163', date: at(-1, 9), desc: 'Anna Wiśniewska · session 60 min', amount: 81.5, status: 'paid' },
  ];
  const threads: Thread[] = [
    { id: 't1', withName: 'Marek Zając', withColor: '#1f8a70', mentorId: 'm2', paidSession: true, unread: 1, messages: [
      { from: 'them', text: 'Hi Kasia, before tomorrow could you send me the draft of your review template?', at: at(0, 9, 12) },
      { from: 'me', text: 'Sure, I will share it tonight.', at: at(0, 9, 40) },
      { from: 'them', text: 'Great. Also think about one person who is underperforming — we will role-play that conversation.', at: at(0, 10, 2) },
    ] },
    { id: 't2', withName: 'Anna Wiśniewska', withColor: '#7a4fd8', mentorId: 'm1', paidSession: false, unread: 0, messages: [
      { from: 'sys', text: 'Session booked for ' + fmtDT(at(2, 17)), at: at(-1, 9) },
      { from: 'them', text: 'Looking forward to our first session! Feel free to share your CV or a recent PRD beforehand.', at: at(-1, 11) },
    ] },
    { id: 't3', withName: 'Tomasz Lis', withColor: '#d0563b', mentorId: 'm3', paidSession: true, unread: 0, messages: [
      { from: 'them', text: 'Thanks for the session! Here is the evaluation checklist we discussed.', at: at(-2, 12) },
    ] },
  ];
  const mentorThreads: Thread[] = [
    { id: 't11', withName: 'Ola Mazur', withColor: '#2f6fd0', paidSession: false, unread: 2, messages: [
      { from: 'them', text: 'Hi Anna, I booked an intro for today. Should I prepare anything?', at: at(0, 8) },
      { from: 'them', text: 'I currently work as a QA engineer.', at: at(0, 8, 2) },
    ] },
    { id: 't12', withName: 'Piotr Bąk', withColor: '#1f8a70', paidSession: true, unread: 0, messages: [
      { from: 'me', text: 'Please bring the Q1 roadmap draft today.', at: at(-1, 18) },
      { from: 'them', text: 'Will do!', at: at(-1, 18, 30) },
    ] },
    { id: 't2', withName: 'Kasia Nowak', withColor: '#5b5fe0', paidSession: false, unread: 0, messages: [
      { from: 'sys', text: 'Session booked for ' + fmtDT(at(2, 17)), at: at(-1, 9) },
      { from: 'me', text: 'Looking forward to our first session! Feel free to share your CV or a recent PRD beforehand.', at: at(-1, 11) },
    ] },
  ];
  const notifications: Record<Role, AppNotification[]> = {
    guest: [],
    mentee: [
      { id: 'n1', kind: 'message', text: 'Marek Zając sent you a message', at: at(0, 10, 2), read: false, href: '/messages/t1' },
      { id: 'n2', kind: 'session', text: 'Reminder: session with Marek Zając tomorrow at 18:00', at: at(0, 8), read: false, href: '/sessions' },
      { id: 'n3', kind: 'session', text: 'How was your intro with Tomasz Lis? Leave a review', at: at(-2, 11), read: false, href: '/sessions/s4/review' },
      { id: 'n4', kind: 'payment', text: 'Payment received: $81.50 for a session with Anna Wiśniewska', at: at(-1, 9), read: true, href: '/billing' },
      { id: 'n5', kind: 'system', text: 'Welcome to MentorHub! Complete your profile to get better matches.', at: at(-20, 9), read: true, href: '/settings' },
    ],
    mentor: [
      { id: 'n11', kind: 'session', text: 'New intro booking: Ola Mazur, today at 19:00', at: at(0, 7, 50), read: false, href: '/mentor/calendar' },
      { id: 'n12', kind: 'message', text: 'Ola Mazur sent you 2 messages', at: at(0, 8, 2), read: false, href: '/messages/t11' },
      { id: 'n13', kind: 'payment', text: 'Payout of $520.00 sent to your bank account', at: at(-3, 9), read: true, href: '/mentor/earnings' },
      { id: 'n14', kind: 'system', text: 'New review from Jan W. (5★)', at: at(-3, 20), read: true, href: '/mentor/profile' },
    ],
    admin: [
      { id: 'n21', kind: 'system', text: '2 new mentor applications waiting', at: at(0, 7), read: false, href: '/admin/applications' },
      { id: 'n22', kind: 'system', text: 'Dispute D-104 opened: mentor no-show', at: at(-1, 15), read: false, href: '/admin/disputes' },
    ],
  };
  const mentees = [
    { id: 'u2', name: 'Piotr Bąk', color: '#1f8a70', plan: '2× / week · 60 min', status: 'active', done: 14, credits: 5, next: at(0, 17), goals: ['Own Q1 roadmap end to end', 'Promotion to Senior PM by June'], notes: ['Strong in delivery, needs work on saying no to stakeholders.'] },
    { id: 'u3', name: 'Ola Mazur', color: '#2f6fd0', plan: 'Intro booked', status: 'active', done: 0, credits: 0, next: at(0, 19), goals: ['Switch from QA to product'], notes: [] },
    { id: 'u1', name: 'Kasia Nowak', color: '#5b5fe0', plan: 'Single session', status: 'active', done: 0, credits: 0, next: at(2, 17), goals: ['Move to Senior PM'], notes: [] },
    { id: 'u4', name: 'Jan Wróbel', color: '#a8762a', plan: '1× / week · 60 min', status: 'paused', done: 9, credits: 1, next: '', goals: ['Prepare for PM interviews'], notes: ['Paused for holidays until next month.'] },
    { id: 'u5', name: 'Marta Gil', color: '#c2417a', plan: 'Plan ended', status: 'ended', done: 22, credits: 0, next: '', goals: ['First PM job'], notes: ['Landed the job 🎉'] },
  ];
  const availability = { // Anna (m1): weekly recurring grid, 0=Sun … 6=Sat
    timezone: tzName(), minNoticeHours: 4, horizonWeeks: 6, bufferMinutes: 15,
    weekly: { 1: [8, 9, 17, 18, 19], 2: [8, 9, 17, 18, 19], 3: [8, 9, 17, 18, 19], 4: [8, 9, 17, 18, 19] } as Record<number, number[]>,
    timeOff: [{ id: 'to1', from: isoDay(new Date(Date.now() + 20 * 864e5)), to: isoDay(new Date(Date.now() + 27 * 864e5)), reason: 'Holiday' }],
  };
  const earnings = {
    weeks: [310, 420, 380, 515, 460, 600, 545, 320].map((v, i) => ({ label: `W${i + 1}`, net: v })),
    available: 640, pending: 315, lifetime: 41860, tier: 15, hoursTaught: 812,
    payoutMethod: null as null | { iban: string; holder: string },
    transactions: [
      { date: at(-3, 19), desc: 'Session · Jan Wróbel · 60 min', gross: 80, fee: 12, net: 68, status: 'pending' },
      { date: at(-4, 9), desc: 'Session · Piotr Bąk · 60 min', gross: 80, fee: 12, net: 68, status: 'pending' },
      { date: at(-6, 9), desc: 'Intro · Marta Gil · 30 min', gross: 20, fee: 20, net: 0, status: 'paid' },
      { date: at(-8, 18), desc: 'Session · Piotr Bąk · 60 min', gross: 80, fee: 12, net: 68, status: 'paid' },
    ],
    payouts: [
      { id: 'po-31', date: at(-3, 9), amount: 520, status: 'paid' },
      { id: 'po-30', date: at(-10, 9), amount: 488, status: 'paid' },
    ],
  };
  const applications: Application[] = [
    { id: 'ap1', name: 'Karolina Duda', email: 'karolina@example.com', country: 'Poland', topics: ['product', 'career'], years: 7, headline: 'Senior PM · marketplaces · PM interviews', bio: 'Seven years in product at two marketplaces. I want to help juniors prepare for interviews and their first 90 days.', linkedin: 'https://linkedin.com/in/karolina-duda', video: 'https://youtu.be/demo1', rate: 55, hoursPerWeek: 6, submitted: at(-1, 14), status: 'pending', checks: { identity: true, linkedin: true, video: false } },
    { id: 'ap2', name: 'Rafael Gomez', email: 'rafael@example.com', country: 'Spain', topics: ['ai'], years: 4, headline: 'ML engineer · computer vision', bio: 'ML engineer working on computer vision for retail.', linkedin: 'https://linkedin.com/in/rgomez', video: '', rate: 70, hoursPerWeek: 5, submitted: at(-2, 10), status: 'pending', checks: { identity: true, linkedin: false, video: false } },
    { id: 'ap3', name: 'Igor Nowak', email: 'igor@example.com', country: 'Poland', topics: ['eng-lead'], years: 12, headline: 'CTO at a 40-person software house', bio: 'CTO and co-founder. I mentor tech leads on architecture decisions and team growth.', linkedin: 'https://linkedin.com/in/igornowak', video: 'https://vimeo.com/demo', rate: 130, hoursPerWeek: 4, submitted: at(-5, 9), status: 'changes', checks: { identity: true, linkedin: true, video: true }, note: 'Please add a short intro video (max 2 min).' },
    { id: 'ap4', name: 'Emily Chen', email: 'emily@example.com', country: 'Ireland', topics: ['ux'], years: 9, headline: 'Design manager · accessibility', bio: 'Design manager focused on accessibility.', linkedin: 'https://linkedin.com/in/emilychen', video: 'https://youtu.be/demo4', rate: 75, hoursPerWeek: 8, submitted: at(-9, 9), status: 'approved', checks: { identity: true, linkedin: true, video: true } },
  ];
  const disputes: Dispute[] = [
    { id: 'D-104', sessionId: 's-x1', kind: 'mentor_no_show', opened: at(-1, 15), by: 'Michał P. (mentee)', against: 'James Carter (mentor)', amount: 110, status: 'open',
      description: 'The mentor did not join the session. I waited 20 minutes.', timeline: ['18:58 Mentee joined the room', '19:00 Session start time', '19:20 Mentee left the room', 'Mentor never joined (no room token issued)'] },
    { id: 'D-103', sessionId: 's-x2', kind: 'quality', opened: at(-2, 11), by: 'Eva S. (mentee)', against: 'Piotr Kamiński (mentor)', amount: 45, status: 'open',
      description: 'Session ended after 25 of 60 minutes due to connection problems on the mentor side.', timeline: ['10:00 Both joined', '10:25 Mentor disconnected', '10:31 Session ended by system'] },
    { id: 'D-101', sessionId: 's-x3', kind: 'payment', opened: at(-8, 9), by: 'Daniel R. (mentee)', against: 'Platform', amount: 61.5, status: 'resolved',
      description: 'Charged twice for one intro session.', timeline: ['Two payment intents captured 2 s apart'], resolution: 'Duplicate charge refunded in full.' },
  ];
  return {
    topics, mentors, reviews, sessions, subscriptions, paymentMethods, invoices, threads, mentorThreads, notifications, mentees,
    availability, earnings, applications, disputes, favorites: ['m4'] as string[], introUsed: ['m3', 'm2'] as string[],
    myApplication: null as Application | null,
    profile: { name: 'Kasia Nowak', email: 'kasia@example.com', timezone: tzName(), language: 'English', goals: 'Grow into a Senior PM role' },
    prefs: { session_email: true, session_push: true, message_email: true, message_push: true, payment_email: true, marketing_email: false },
  };
}
let DB = freshDb();

/* ---------- helpers on the demo DB ---------- */
const mentorById = (id: string) => DB.mentors.find(m => m.id === id);
const ME_MENTOR_ID = 'm1';
function introPrice(m: Mentor): number { return Math.round(((m.rate * RULES.introMinutes) / 60) * RULES.introPriceFactor); }
function sessionPrice(m: Mentor, type: 'intro' | 'regular', minutes: number): number {
  return type === 'intro' ? introPrice(m) : Math.round((m.rate * minutes) / 60);
}
function mentorPublic(m: Mentor) {
  return { ...m, introPrice: introPrice(m), favorite: DB.favorites.includes(m.id), introAvailable: m.intro && (S.role !== 'mentee' || !DB.introUsed.includes(m.id)) };
}
function generateSlots(m: Mentor, from: Date, days: number, minutes: number): { date: string; slots: Slot[] }[] {
  const out: { date: string; slots: Slot[] }[] = [];
  const weekly = m.id === ME_MENTOR_ID ? DB.availability.weekly : null;
  for (let d = 0; d < days; d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const dow = day.getDay();
    const hours = weekly ? weekly[dow] ?? [] : m.days.includes(dow) ? m.hours : [];
    const slots: Slot[] = [];
    for (const h of hours) {
      const mins = minutes <= 30 ? [0, 30] : [0];
      for (const mm of mins) {
        const t = new Date(day);
        t.setHours(h, mm, 0, 0);
        if (t.getTime() < Date.now()) continue;
        const iso = t.toISOString();
        const booked = DB.sessions.some(s => s.mentorId === m.id && s.status === 'scheduled' && Math.abs(new Date(s.start).getTime() - t.getTime()) < 36e5)
          || hash(m.id + iso) < 0.28;
        const notice = t.getTime() < Date.now() + RULES.minNoticeHours * 36e5;
        slots.push({ start: iso, available: !booked && !notice, reason: booked ? 'booked' : notice ? 'notice' : '' });
      }
    }
    out.push({ date: isoDay(day), slots });
  }
  return out;
}
function cycleDate(days: number): string { return at(days, 9); }
function pushNotification(role: Role, n: Omit<AppNotification, 'id' | 'at' | 'read'>): void {
  DB.notifications[role].unshift({ ...n, id: 'n' + Date.now(), at: new Date().toISOString(), read: false });
}
const CONTACT_RE = /([^\s@]+@[^\s@]+\.[a-z]{2,})|(\+?\d[\d\s-]{7,}\d)|(https?:\/\/|www\.)|(whatsapp|telegram|skype)/i;

/* =====================================================================
   MOCK ENDPOINTS (method + path = contract in 05-Katalog-API.md)
   ===================================================================== */

/* --- Auth & account --- */
mock('POST', '/api/auth/register', ({ body }) => {
  if (String(body.email).toLowerCase() === 'taken@example.com') throw new ApiError(409, 'Email already registered.', { email: 'An account with this email already exists. Log in instead.' });
  return { user: { id: 'u1', name: body.name, email: body.email }, role: body.intent === 'mentor' ? 'mentee' : 'mentee', next: body.intent === 'mentor' ? '/apply' : '/home' };
});
mock('POST', '/api/auth/login', ({ body }) => {
  if (body.password === 'wrong') throw new ApiError(401, 'Email or password is incorrect.');
  const email = String(body.email).toLowerCase();
  const role: Role = email.includes('admin') ? 'admin' : email.includes('mentor') ? 'mentor' : 'mentee';
  return { user: { id: 'u1', email }, role };
});
mock('POST', '/api/auth/logout', () => ({ ok: true }));
mock('POST', '/api/auth/password-reset', () => ({ ok: true }));
mock('GET', '/api/me', () => ({ ...DB.profile, role: S.role }));
mock('PATCH', '/api/me', ({ body }) => { Object.assign(DB.profile, body); return DB.profile; });
mock('PUT', '/api/me/password', ({ body }) => {
  if (body.current === 'wrong') throw new ApiError(422, 'Current password is incorrect.', { current: 'Current password is incorrect.' });
  return { ok: true };
});
mock('GET', '/api/me/notification-preferences', () => DB.prefs);
mock('PUT', '/api/me/notification-preferences', ({ body }) => { DB.prefs = body; return DB.prefs; });
mock('POST', '/api/me/data-export', () => ({ ok: true, eta: '24 h' }));
mock('DELETE', '/api/me', () => ({ ok: true }));

/* --- Catalogue --- */
mock('GET', '/api/topics', () => DB.topics);
mock('GET', '/api/mentors', ({ query }) => {
  let list = DB.mentors.slice();
  const q = (query.get('q') || '').toLowerCase();
  const topic = query.get('topic');
  const pmin = Number(query.get('priceMin') || 0);
  const pmax = Number(query.get('priceMax') || 1e9);
  const lang = query.get('language');
  const tod = query.get('time');
  if (query.get('featured')) list = list.filter(m => m.featured);
  if (q) list = list.filter(m => (m.name + m.headline + m.bio).toLowerCase().includes(q));
  if (topic) list = list.filter(m => m.topics.includes(topic));
  list = list.filter(m => m.rate >= pmin && m.rate <= pmax);
  if (lang) list = list.filter(m => m.languages.includes(lang));
  if (query.get('super') === '1') list = list.filter(m => m.superMentor);
  if (tod === 'morning') list = list.filter(m => m.hours.some(h => h < 12));
  if (tod === 'afternoon') list = list.filter(m => m.hours.some(h => h >= 12 && h < 17));
  if (tod === 'evening') list = list.filter(m => m.hours.some(h => h >= 17));
  const sort = query.get('sort') || 'recommended';
  if (sort === 'price_asc') list.sort((a, b) => a.rate - b.rate);
  if (sort === 'price_desc') list.sort((a, b) => b.rate - a.rate);
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  if (sort === 'sessions') list.sort((a, b) => b.sessions - a.sessions);
  if (sort === 'recommended') list.sort((a, b) => Number(b.superMentor) - Number(a.superMentor) || b.rating - a.rating);
  const limit = Number(query.get('limit') || 6);
  const page = Number(query.get('page') || 1);
  return { items: list.slice(0, page * limit).map(mentorPublic), total: list.length, page };
});
mock('GET', '/api/mentors/:id', ({ params }) => {
  const m = mentorById(params.id);
  if (!m) throw new ApiError(404, 'This mentor profile does not exist or is no longer active.');
  return mentorPublic(m);
});
mock('GET', '/api/mentors/:id/reviews', ({ params, query }) => {
  const all = DB.reviews.filter(r => r.mentorId === params.id);
  const page = Number(query.get('page') || 1);
  return { items: all.slice(0, page * 3), total: all.length };
});
mock('GET', '/api/mentors/:id/availability', ({ params, query }) => {
  const m = mentorById(params.id);
  if (!m) throw new ApiError(404, 'Mentor not found.');
  const from = query.get('from') ? new Date(query.get('from') + 'T00:00:00') : new Date();
  return { timezone: tzName(), days: generateSlots(m, from, Number(query.get('days') || 7), Number(query.get('minutes') || 60)) };
});
mock('PUT', '/api/me/favorites/:mentorId', ({ params }) => { if (!DB.favorites.includes(params.mentorId)) DB.favorites.push(params.mentorId); return { favorite: true }; });
mock('DELETE', '/api/me/favorites/:mentorId', ({ params }) => { DB.favorites = DB.favorites.filter(f => f !== params.mentorId); return { favorite: false }; });
mock('GET', '/api/mentors/:id/plans', ({ params }) => {
  const m = mentorById(params.id);
  if (!m) throw new ApiError(404, 'Mentor not found.');
  return { mentor: mentorPublic(m), items: [1, 2, 3, 5].map(n => ({ perWeek: n, minutes: 60, sessionsPerCycle: n * 4, pricePerCycle: m.rate * n * 4, popular: n === 1 })) };
});

/* --- Booking & checkout --- */
mock('POST', '/api/bookings/hold', ({ body }) => {
  const m = mentorById(body.mentorId);
  if (!m) throw new ApiError(404, 'Mentor not found.');
  if (body.type === 'intro' && DB.introUsed.includes(m.id)) throw new ApiError(422, 'You already had an intro session with this mentor.');
  if (hoursUntil(body.start) < RULES.minNoticeHours) throw new ApiError(422, `Sessions must be booked at least ${RULES.minNoticeHours} hours in advance.`);
  if (hash('race' + m.id + body.start) < 0.12) throw new ApiError(409, 'Someone has just booked this time. Please pick another slot.');
  return { holdId: 'hold_' + Date.now(), expiresAt: Date.now() + RULES.holdMinutes * 60000 };
});
mock('POST', '/api/checkout/quote', ({ body }) => {
  const subtotal = Number(body.price);
  let discount = 0;
  if (body.promo) {
    const p = PROMO[String(body.promo).trim().toUpperCase()];
    if (!p) throw new ApiError(422, 'Invalid code.', { promo: 'This code is not valid or has expired.' });
    discount = Math.round(subtotal * p * 100) / 100;
  }
  return { subtotal, discount, fee: RULES.serviceFee, total: Math.round((subtotal - discount + RULES.serviceFee) * 100) / 100 };
});
mock('GET', '/api/me/payment-methods', () => DB.paymentMethods);
mock('POST', '/api/me/payment-methods', ({ body }) => {
  const pm = { id: 'pm' + Date.now(), brand: 'Card', last4: String(body.number).slice(-4), exp: body.exp, default: false };
  DB.paymentMethods.push(pm);
  return pm;
});
mock('DELETE', '/api/me/payment-methods/:id', ({ params }) => {
  const pm = DB.paymentMethods.find(p => p.id === params.id);
  if (pm?.default && DB.subscriptions.some(s => s.status === 'active')) throw new ApiError(409, 'This card pays for an active plan. Add another card and make it default first.');
  DB.paymentMethods = DB.paymentMethods.filter(p => p.id !== params.id);
  return { ok: true };
});
mock('POST', '/api/payments/intents', ({ body }) => {
  if (body.method === 'card' && String(body.number || '').replace(/\s/g, '').endsWith('0002')) throw new ApiError(402, 'Your card was declined. Try another card or payment method.');
  if (body.method === 'blik' && body.blik === '000000') throw new ApiError(402, 'The BLIK code has expired. Generate a new code in your banking app.');
  return { id: 'pi_' + Date.now(), status: 'succeeded' };
});
mock('POST', '/api/bookings', ({ body }) => {
  const m = mentorById(body.mentorId) as Mentor;
  const s: Session = { id: 's' + Date.now(), mentorId: m.id, menteeId: 'u1', menteeName: 'Kasia Nowak', start: body.start, minutes: body.minutes, type: body.type, status: 'scheduled', price: body.price, reviewed: false, goal: body.goal };
  DB.sessions.push(s);
  if (body.type === 'intro') DB.introUsed.push(m.id);
  DB.invoices.unshift({ id: 'INV-2026-0' + (170 + DB.invoices.length), date: new Date().toISOString(), desc: `${m.name} · ${body.type === 'intro' ? 'intro session' : 'session'} ${body.minutes} min`, amount: body.total, status: 'paid' });
  pushNotification('mentee', { kind: 'payment', text: `Payment received: ${money(body.total)} — session with ${m.name}`, href: '/billing' });
  if (!DB.threads.some(t => t.mentorId === m.id)) DB.threads.unshift({ id: 't' + Date.now(), withName: m.name, withColor: m.color, mentorId: m.id, paidSession: false, unread: 0, messages: [{ from: 'sys', text: `Session booked for ${fmtDT(body.start)}`, at: new Date().toISOString() }] });
  return { id: s.id };
});
mock('GET', '/api/bookings/:id', ({ params }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Booking not found.');
  return { ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) };
});
mock('POST', '/api/subscriptions', ({ body }) => {
  const m = mentorById(body.mentorId) as Mentor;
  const sub: Subscription = { id: 'sub' + Date.now(), mentorId: m.id, perWeek: body.perWeek, minutes: 60, credits: body.perWeek * 4, pricePerCycle: m.rate * body.perWeek * 4, renewsOn: cycleDate(28), status: 'active' };
  DB.subscriptions.push(sub);
  DB.invoices.unshift({ id: 'INV-2026-0' + (170 + DB.invoices.length), date: new Date().toISOString(), desc: `${m.name} · 4 weeks · ${body.perWeek}×60 min`, amount: body.total, status: 'paid' });
  return sub;
});

/* --- Sessions (mentee) --- */
mock('GET', '/api/me/sessions', ({ query }) => {
  const st = query.get('status') || 'upcoming';
  let list = DB.sessions.filter(s => s.menteeId === 'u1');
  if (st === 'upcoming') list = list.filter(s => s.status === 'scheduled').sort((a, b) => a.start.localeCompare(b.start));
  if (st === 'past') list = list.filter(s => s.status === 'completed' || s.status === 'no_show').sort((a, b) => b.start.localeCompare(a.start));
  if (st === 'cancelled') list = list.filter(s => s.status === 'cancelled');
  return { items: list.map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) })) };
});
mock('GET', '/api/me/home', () => {
  const upcoming = DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'scheduled').sort((a, b) => a.start.localeCompare(b.start));
  const toReview = DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'completed' && !s.reviewed);
  const trialsNoPlan = DB.sessions.filter(s => s.menteeId === 'u1' && s.type === 'intro' && s.status === 'completed' && !DB.subscriptions.some(x => x.mentorId === s.mentorId && x.status === 'active'));
  const wrap = (s: Session) => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) });
  return {
    upcoming: upcoming.map(wrap), toReview: toReview.map(wrap), trialsNoPlan: trialsNoPlan.map(wrap),
    subscriptions: DB.subscriptions.filter(s => s.status === 'active').map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) })),
    recommended: DB.mentors.filter(m => m.topics.includes('product') || m.topics.includes('career')).slice(0, 3).map(mentorPublic),
    stats: { sessionsDone: DB.sessions.filter(s => s.menteeId === 'u1' && s.status === 'completed').length, hours: 3.5, streakWeeks: 3 },
  };
});
mock('POST', '/api/sessions/:id/reschedule', ({ params, body }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  if (hoursUntil(s.start) < RULES.freeCancelHours) throw new ApiError(422, `Sessions can be rescheduled up to ${RULES.freeCancelHours} hours before the start.`);
  if (!body.start) throw new ApiError(422, 'Pick a new time.', { start: 'Pick a new time.' });
  s.start = body.start;
  pushNotification('mentor', { kind: 'session', text: `${s.menteeName} moved a session to ${fmtDT(body.start)}`, href: '/mentor/calendar' });
  return s;
});
mock('POST', '/api/sessions/:id/cancel', ({ params, body }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  const refund = hoursUntil(s.start) >= RULES.freeCancelHours || body.by === 'mentor';
  s.status = 'cancelled';
  s.cancelReason = body.reason;
  if (s.subscriptionId && refund) { const sub = DB.subscriptions.find(x => x.id === s.subscriptionId); if (sub) sub.credits++; }
  return { refunded: refund, refundTo: s.subscriptionId ? 'credit' : 'original payment method' };
});
mock('GET', '/api/sessions/:id', ({ params }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  return { ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) };
});
mock('POST', '/api/sessions/:id/room-token', ({ params }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  if (s.status !== 'scheduled') throw new ApiError(410, 'This session is no longer active.');
  return { token: 'rtc_' + params.id, iceServers: 2, expiresIn: 7200 };
});
mock('PUT', '/api/sessions/:id/notes', ({ params, body }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (s) s.notes = body.notes;
  return { savedAt: new Date().toISOString() };
});
mock('POST', '/api/sessions/:id/complete', ({ params }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (s) s.status = 'completed';
  return { ok: true };
});
mock('POST', '/api/sessions/:id/review', ({ params, body }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  if (s.status !== 'completed') throw new ApiError(422, 'You can review a session only after it has taken place.');
  if (s.reviewed) throw new ApiError(409, 'You have already reviewed this session.');
  s.reviewed = true;
  DB.reviews.unshift({ id: 'r' + Date.now(), mentorId: s.mentorId, author: 'Kasia N.', rating: Number(body.rating), date: new Date().toISOString(), text: body.comment || '', tags: body.tags ? String(body.tags).split(',') : [] });
  return { ok: true };
});
mock('POST', '/api/sessions/:id/report', ({ params, body }) => {
  DB.disputes.unshift({ id: 'D-' + (105 + DB.disputes.length), sessionId: params.id, kind: body.kind, opened: new Date().toISOString(), by: 'Kasia Nowak (mentee)', against: 'Mentor', amount: 0, status: 'open', description: body.description, timeline: ['Reported from My sessions'] });
  return { id: DB.disputes[0].id };
});

/* --- Billing & subscriptions --- */
mock('GET', '/api/me/billing', () => ({
  subscriptions: DB.subscriptions.map(s => ({ ...s, mentor: mentorPublic(mentorById(s.mentorId) as Mentor) })),
  paymentMethods: DB.paymentMethods, invoices: DB.invoices,
}));
mock('PATCH', '/api/subscriptions/:id', ({ params, body }) => {
  const s = DB.subscriptions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Plan not found.');
  const m = mentorById(s.mentorId) as Mentor;
  if (body.perWeek) { s.perWeek = Number(body.perWeek); s.pricePerCycle = m.rate * s.perWeek * 4; }
  if (body.status) s.status = body.status;
  return s;
});
mock('POST', '/api/subscriptions/:id/cancel', ({ params }) => {
  const s = DB.subscriptions.find(x => x.id === params.id);
  if (s) s.status = 'ended';
  return { ok: true, creditsValidUntil: s?.renewsOn };
});
mock('POST', '/api/subscriptions/:id/transfer', ({ params, body }) => {
  const s = DB.subscriptions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Plan not found.');
  if (Number(body.credits) > s.credits) throw new ApiError(422, 'Not enough credits.', { credits: `You have only ${s.credits} credits on this plan.` });
  s.credits -= Number(body.credits);
  const to = mentorById(body.toMentorId) as Mentor;
  DB.subscriptions.push({ id: 'sub' + Date.now(), mentorId: to.id, perWeek: 1, minutes: 60, credits: Number(body.credits), pricePerCycle: to.rate * 4, renewsOn: s.renewsOn, status: 'active' });
  return { ok: true };
});
mock('GET', '/api/invoices/:id/pdf', () => ({ url: 'blob:invoice.pdf' }));

/* --- Messages & notifications --- */
const myThreads = () => (S.role === 'mentor' ? DB.mentorThreads : DB.threads);
mock('GET', '/api/threads', () => myThreads().map(t => ({ ...t, last: t.messages[t.messages.length - 1] })));
mock('GET', '/api/threads/:id/messages', ({ params }) => {
  const t = myThreads().find(x => x.id === params.id);
  if (!t) throw new ApiError(404, 'Conversation not found.');
  return t;
});
mock('POST', '/api/threads/:id/messages', ({ params, body }) => {
  const t = myThreads().find(x => x.id === params.id);
  if (!t) throw new ApiError(404, 'Conversation not found.');
  if (!t.paidSession && CONTACT_RE.test(body.text)) throw new ApiError(422, 'Contact details blocked.', { text: 'For your safety, sharing emails, phone numbers or links is not allowed before your first completed session.' });
  t.messages.push({ from: 'me', text: body.text, at: new Date().toISOString() });
  return t;
});
mock('POST', '/api/threads', ({ body }) => {
  const m = mentorById(body.mentorId) as Mentor;
  let t = DB.threads.find(x => x.mentorId === m.id);
  if (!t) { t = { id: 't' + Date.now(), withName: m.name, withColor: m.color, mentorId: m.id, paidSession: false, unread: 0, messages: [] }; DB.threads.unshift(t); }
  return t;
});
mock('POST', '/api/threads/:id/read', ({ params }) => { const t = myThreads().find(x => x.id === params.id); if (t) t.unread = 0; return { ok: true }; });
mock('GET', '/api/notifications', ({ query }) => {
  const kind = query.get('kind');
  const list = DB.notifications[S.role].filter(n => !kind || kind === 'all' || n.kind === kind);
  return { items: list, unread: DB.notifications[S.role].filter(n => !n.read).length };
});
mock('POST', '/api/notifications/read-all', () => { DB.notifications[S.role].forEach(n => (n.read = true)); return { ok: true }; });

/* --- Mentor application & profile --- */
mock('POST', '/api/mentor-applications', ({ body }) => {
  DB.myApplication = { id: 'apX', name: body.name || 'Kasia Nowak', email: 'kasia@example.com', country: '', topics: [], years: 0, headline: '', bio: '', linkedin: '', video: '', rate: 50, hoursPerWeek: 0, submitted: '', status: 'draft', checks: { identity: false, linkedin: false, video: false } };
  return DB.myApplication;
});
mock('GET', '/api/mentor-applications/me', () => DB.myApplication);
mock('PATCH', '/api/mentor-applications/:id', ({ body }) => { if (DB.myApplication) Object.assign(DB.myApplication, body); return DB.myApplication; });
mock('POST', '/api/uploads', ({ body }) => ({ id: 'up_' + Date.now(), url: 'https://cdn.example/' + body.kind, kind: body.kind }));
mock('POST', '/api/mentor-applications/:id/submit', () => {
  if (!DB.myApplication) throw new ApiError(404, 'Application not found.');
  DB.myApplication.status = 'submitted';
  DB.myApplication.submitted = new Date().toISOString();
  DB.applications.unshift({ ...DB.myApplication, id: 'ap' + Date.now(), status: 'pending' });
  pushNotification('admin', { kind: 'system', text: `New mentor application: ${DB.myApplication.name}`, href: '/admin/applications' });
  return DB.myApplication;
});
mock('GET', '/api/mentor/dashboard', () => {
  const mine = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID);
  const today = mine.filter(s => s.status === 'scheduled' && isoDay(new Date(s.start)) === isoDay(new Date())).sort((a, b) => a.start.localeCompare(b.start));
  return {
    kpis: { sessionsThisWeek: 6, earningsMonth: 2140, rating: 4.9, conversion: 62, profileViews: 318 },
    today, next7: mine.filter(s => s.status === 'scheduled' && hoursUntil(s.start) > 0 && hoursUntil(s.start) < 168).length,
    tasks: [
      { text: 'Reply to Ola Mazur (2 unread messages)', href: '/messages/t11', kind: 'message' },
      { text: 'Add notes after the session with Jan Wróbel', href: '/mentor/mentees?id=u4', kind: 'notes' },
      { text: 'Set up a payout method to withdraw $640', href: '/mentor/earnings', kind: 'payout' },
    ],
    profileCompleteness: 85, missing: ['Intro video subtitles', 'Second language certificate'],
  };
});
mock('GET', '/api/mentor/sessions', ({ query }) => {
  const from = new Date(query.get('from') + 'T00:00:00');
  const to = new Date(from.getTime() + 7 * 864e5);
  return { items: DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.status !== 'cancelled' && new Date(s.start) >= from && new Date(s.start) < to) };
});
mock('POST', '/api/mentor/sessions/:id/cancel', ({ params, body }) => {
  const s = DB.sessions.find(x => x.id === params.id);
  if (!s) throw new ApiError(404, 'Session not found.');
  s.status = 'cancelled';
  s.cancelReason = body.reason;
  return { refunded: true, reliabilityImpact: hoursUntil(s.start) < 24 };
});
mock('GET', '/api/mentor/availability', () => DB.availability);
mock('PUT', '/api/mentor/availability', ({ body }) => {
  const hours = Object.values(body.weekly as Record<string, number[]>).reduce((a, h) => a + h.length, 0);
  if (hours < 2) throw new ApiError(422, 'Too little availability.', { _form: 'Keep at least 2 hours per week open, or pause your profile instead.' });
  Object.assign(DB.availability, body);
  return DB.availability;
});
mock('POST', '/api/mentor/time-off', ({ body }) => {
  const conflicts = DB.sessions.filter(s => s.mentorId === ME_MENTOR_ID && s.status === 'scheduled' && isoDay(new Date(s.start)) >= body.from && isoDay(new Date(s.start)) <= body.to);
  if (conflicts.length && !body.force) throw new ApiError(409, 'Conflicts with booked sessions.', { _form: `${plural(conflicts.length, 'booked session')} fall into this period: ${conflicts.map(c => `${c.menteeName} (${fmtDT(c.start)})`).join(', ')}. Reschedule or cancel them first.` });
  DB.availability.timeOff.push({ id: 'to' + Date.now(), from: body.from, to: body.to, reason: body.reason });
  return DB.availability;
});
mock('DELETE', '/api/mentor/time-off/:id', ({ params }) => { DB.availability.timeOff = DB.availability.timeOff.filter(t => t.id !== params.id); return DB.availability; });
mock('GET', '/api/mentor/mentees', ({ query }) => {
  const st = query.get('status');
  return { items: DB.mentees.filter(m => !st || st === 'all' || m.status === st) };
});
mock('POST', '/api/mentor/mentees/:id/notes', ({ params, body }) => {
  const m = DB.mentees.find(x => x.id === params.id);
  if (!m) throw new ApiError(404, 'Mentee not found.');
  m.notes.unshift(body.text);
  return m;
});
mock('GET', '/api/mentor/earnings', () => DB.earnings);
mock('PUT', '/api/mentor/payout-method', ({ body }) => { DB.earnings.payoutMethod = { iban: body.iban, holder: body.holder }; return DB.earnings.payoutMethod; });
mock('POST', '/api/mentor/payouts', ({ body }) => {
  const amt = Number(body.amount);
  if (!DB.earnings.payoutMethod) throw new ApiError(422, 'Add a payout method first.');
  if (amt > DB.earnings.available) throw new ApiError(422, 'Amount too high.', { amount: `You can withdraw up to ${money(DB.earnings.available)}.` });
  DB.earnings.available -= amt;
  DB.earnings.payouts.unshift({ id: 'po-' + (32 + DB.earnings.payouts.length), date: new Date().toISOString(), amount: amt, status: 'processing' });
  return { ok: true };
});
mock('GET', '/api/mentor/profile', () => mentorPublic(mentorById(ME_MENTOR_ID) as Mentor));
mock('PATCH', '/api/mentor/profile', ({ body }) => {
  const m = mentorById(ME_MENTOR_ID) as Mentor;
  const moderated = body.bio !== m.bio || body.headline !== m.headline;
  Object.assign(m, { headline: body.headline, bio: body.bio, rate: Number(body.rate), topics: String(body.topics).split(','), intro: body.intro === 'on' });
  return { ...mentorPublic(m), moderation: moderated ? 'pending' : 'none' };
});

/* --- Admin --- */
mock('GET', '/api/admin/metrics', () => ({
  gmv30: 184250, sessions30: 2310, newMentees30: 412, trialToPlan: 41, activeMentors: 318, nps: 62,
  pendingApplications: DB.applications.filter(a => a.status === 'pending').length,
  openDisputes: DB.disputes.filter(d => d.status === 'open').length,
  weekly: [118, 131, 142, 139, 155, 162, 171, 168],
  activity: [
    { at: at(0, 9, 30), text: 'Karolina Duda submitted a mentor application' },
    { at: at(-1, 15), text: 'Dispute D-104 opened (mentor no-show)' },
    { at: at(-1, 11), text: 'Emily Chen approved as mentor' },
  ],
}));
mock('GET', '/api/admin/mentor-applications', ({ query }) => {
  const st = query.get('status') || 'pending';
  return { items: DB.applications.filter(a => a.status === st), counts: { pending: DB.applications.filter(a => a.status === 'pending').length, changes: DB.applications.filter(a => a.status === 'changes').length, approved: DB.applications.filter(a => a.status === 'approved').length, rejected: DB.applications.filter(a => a.status === 'rejected').length } };
});
mock('GET', '/api/admin/mentor-applications/:id', ({ params }) => {
  const a = DB.applications.find(x => x.id === params.id);
  if (!a) throw new ApiError(404, 'Application not found.');
  return a;
});
function decide(id: string, status: Application['status'], note?: string) {
  const a = DB.applications.find(x => x.id === id);
  if (!a) throw new ApiError(404, 'Application not found.');
  if (a.status === 'approved' || a.status === 'rejected') throw new ApiError(409, 'This application has already been decided by another admin.');
  a.status = status;
  a.note = note;
  return a;
}
mock('POST', '/api/admin/mentor-applications/:id/approve', ({ params }) => decide(params.id, 'approved'));
mock('POST', '/api/admin/mentor-applications/:id/request-changes', ({ params, body }) => decide(params.id, 'changes', body.message));
mock('POST', '/api/admin/mentor-applications/:id/reject', ({ params, body }) => decide(params.id, 'rejected', `${body.reason}: ${body.note}`));
mock('GET', '/api/admin/disputes', ({ query }) => {
  const st = query.get('status') || 'open';
  return { items: DB.disputes.filter(d => d.status === st) };
});
mock('POST', '/api/admin/disputes/:id/resolve', ({ params, body }) => {
  const d = DB.disputes.find(x => x.id === params.id);
  if (!d) throw new ApiError(404, 'Dispute not found.');
  d.status = 'resolved';
  d.resolution = `${body.decision}${body.amount ? ' (' + money(Number(body.amount)) + ')' : ''} — ${body.message}`;
  return d;
});
