import { isoAgo } from './seedBuilder'

// Exactly 280 characters, the message limit.
const LONG_NOTE =
  'Hi! I am taking CHEM 201 next spring and this kit is exactly what the syllabus lists. Could you do $6? I know it is below asking, but I can meet you anywhere on campus, any day this week, and I will bring exact change. If not, no worries at all, and thank you for listing it here.'

const offer = (
  id,
  listingId,
  buyerId,
  amountCents,
  status,
  daysAgo,
  now,
  extra = {},
) => ({
  id,
  listingId,
  buyerId,
  amountCents,
  message: '',
  status,
  counterCents: null,
  createdAt: isoAgo(now, daysAgo),
  ...extra,
})

/**
 * Offers in every status. usr_demo both sends and receives: lst_002 has six offers (four
 * waiting), lst_027 is reserved through an accepted offer, lst_005 sold through one.
 */
export function buildOffers(now) {
  const o = (id, listingId, buyerId, amountCents, status, daysAgo, extra) =>
    offer(id, listingId, buyerId, amountCents, status, daysAgo, now, extra)
  return [
    // Received by usr_demo
    o('off_001', 'lst_002', 'usr_jad', 700, 'pending', 1, {
      message: 'Would you do $7? Can meet today after 3.',
    }),
    o('off_002', 'lst_002', 'usr_lina', 800, 'pending', 0.5),
    o('off_003', 'lst_003', 'usr_nour', 3500, 'pending', 2, {
      message: 'Is it the international edition?',
    }),
    // Sent by usr_demo
    o('off_004', 'lst_001', 'usr_demo', 4000, 'pending', 1, {
      message: 'Can pick up Thursday.',
    }),
    o('off_005', 'lst_008', 'usr_demo', 2500, 'declined', 5),
    o('off_006', 'lst_012', 'usr_demo', 5000, 'countered', 3, {
      message: 'Still available?',
      counterCents: 5200,
    }),
    // More on lst_002 (usr_demo's kit)
    o('off_007', 'lst_002', 'usr_nour', 600, 'pending', 0.2, { message: LONG_NOTE }),
    o('off_008', 'lst_002', 'usr_max', 850, 'pending', 1.5, {
      message: 'I can come to the science building lobby at noon.',
    }),
    o('off_009', 'lst_002', 'usr_sara', 500, 'declined', 4),
    o('off_010', 'lst_002', 'usr_omar', 750, 'withdrawn', 3.5, {
      message: 'Found one from a friend, sorry!',
    }),
    // lst_003 and lst_004 (usr_demo)
    o('off_011', 'lst_003', 'usr_rami', 3000, 'countered', 2.5, { counterCents: 3600 }),
    o('off_012', 'lst_003', 'usr_jad', 2500, 'declined', 4),
    o('off_013', 'lst_004', 'usr_sara', 3800, 'pending', 0.8, {
      message: 'Does it include the access code?',
    }),
    o('off_014', 'lst_004', 'usr_lina', 3000, 'withdrawn', 6),
    // lst_005 sold, lst_027 reserved (usr_demo)
    o('off_015', 'lst_005', 'usr_jad', 1500, 'accepted', 12),
    o('off_016', 'lst_005', 'usr_omar', 1000, 'declined', 13),
    o('off_017', 'lst_027', 'usr_max', 3000, 'accepted', 3, {
      message: 'Could we meet Monday morning?',
    }),
    o('off_018', 'lst_027', 'usr_rami', 2500, 'declined', 4),
    o('off_019', 'lst_027', 'usr_nour', 2800, 'declined', 3.5),
    // More sent by usr_demo
    o('off_020', 'lst_032', 'usr_demo', 3800, 'accepted', 2, {
      message: 'Need it for the CHEM 202 lab reports.',
    }),
    o('off_021', 'lst_031', 'usr_demo', 4500, 'withdrawn', 9),
    o('off_022', 'lst_009', 'usr_demo', 1500, 'pending', 0.3),
    // Between other users
    o('off_023', 'lst_001', 'usr_jad', 4200, 'pending', 0.7),
    o('off_024', 'lst_006', 'usr_rami', 1000, 'pending', 0.4, {
      message: 'Is it size M?',
    }),
    o('off_025', 'lst_012', 'usr_nour', 5000, 'pending', 1.2),
    o('off_026', 'lst_014', 'usr_omar', 1000, 'accepted', 5),
    o('off_027', 'lst_014', 'usr_jad', 900, 'declined', 6),
    o('off_028', 'lst_016', 'usr_rami', 9000, 'pending', 1, {
      message: 'Would you split the bundle? I only need the book.',
    }),
    o('off_029', 'lst_021', 'usr_omar', 80000, 'countered', 4, { counterCents: 90000 }),
    o('off_030', 'lst_011', 'usr_sara', 2000, 'withdrawn', 7),
    o('off_031', 'lst_018', 'usr_jad', 1800, 'pending', 0.6),
  ]
}
