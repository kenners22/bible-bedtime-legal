// Search guides. Each targets one cluster of real Google autocomplete
// queries (checked 2026-09-18); keep one page per intent to avoid
// cannibalising each other or the homepage.
export interface Guide {
  href: string;
  title: string;
  blurb: string;
}

export const guides: Guide[] = [
  {
    href: '/bible-sleep-stories/',
    title: 'Bible sleep stories',
    blurb: 'Calm, faithful retellings of Scripture to fall asleep to.',
  },
  {
    href: '/bible-verses-for-sleep/',
    title: 'Bible verses about sleep and rest',
    blurb: 'What the Bible says about sleep, in King James verses.',
  },
  {
    href: '/psalms-for-sleep/',
    title: 'Psalms for sleep',
    blurb: 'Seven evening psalms to read slowly before bed.',
  },
  {
    href: '/bedtime-prayers-for-adults/',
    title: 'Bedtime prayers for adults',
    blurb: 'Short prayers for peace, worry, protection and thanks.',
  },
  {
    href: '/bible-bedtime-stories-for-kids/',
    title: 'Bible bedtime stories for kids',
    blurb: 'Calm Bible stories for families to listen to together.',
  },
  {
    href: '/christian-sleep-app-comparison/',
    title: 'Christian sleep apps compared',
    blurb: 'Bible Bedtimes, Abide, Hallow, Glorify and Calm, side by side.',
  },
];
