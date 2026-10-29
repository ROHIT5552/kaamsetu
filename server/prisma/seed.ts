import { PrismaClient, Skill, Availability, Role } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// High quality work photo samples from prototype
const SAMPLE_WORK_PHOTOS: Record<string, string[]> = {
  plumber: [
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
  ],
  electrician: [
    'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=600&q=80',
  ],
  carpenter: [
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
  ],
  painter: [
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1574359411659-15573a27fd0c?auto=format&fit=crop&w=600&q=80',
  ],
  mason: [
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80',
  ],
  helper: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
  ],
};

const SEED_WORKERS = [
  {
    id: 1,
    name: 'Ramesh Pawar',
    skill: Skill.plumber,
    yearsExp: 12,
    area: 'Garkheda',
    ratePerDay: 700,
    visitCharge: 100,
    ratingAvg: 4.8,
    jobsCount: 146,
    availability: Availability.today,
    verified: true,
    about: 'Leaks, taps, bathroom fittings, tank connections.',
    reviews: [
      { rating: 5, text: 'Fixed the kitchen leak in 40 minutes. Fair price.' },
      { rating: 5, text: 'Came on time and cleaned up after.' },
    ],
  },
  {
    id: 2,
    name: 'Sunil Gaikwad',
    skill: Skill.electrician,
    yearsExp: 9,
    area: 'Jalna Road',
    ratePerDay: 800,
    visitCharge: 150,
    ratingAvg: 4.6,
    jobsCount: 98,
    availability: Availability.today,
    verified: true,
    about: 'Wiring, fans, switchboards, inverter and MCB work.',
    reviews: [
      { rating: 5, text: 'Replaced old switchboards neatly.' },
      { rating: 4, text: 'Explained the fault clearly before starting.' },
    ],
  },
  {
    id: 3,
    name: 'Dattu Shinde',
    skill: Skill.carpenter,
    yearsExp: 18,
    area: 'Osmanpura',
    ratePerDay: 900,
    visitCharge: 0,
    ratingAvg: 4.9,
    jobsCount: 212,
    availability: Availability.week,
    verified: true,
    about: 'Doors, locks, wardrobes, repairs and small furniture.',
    reviews: [
      { rating: 5, text: 'Repaired three doors perfectly.' },
      { rating: 5, text: 'Excellent finishing, worth the wait.' },
    ],
  },
  {
    id: 4,
    name: 'Vikas More',
    skill: Skill.painter,
    yearsExp: 7,
    area: 'Beed Bypass',
    ratePerDay: 650,
    visitCharge: 0,
    ratingAvg: 4.4,
    jobsCount: 64,
    availability: Availability.tomorrow,
    verified: true,
    about: 'Touch-ups, 1–2 room painting, waterproofing coats.',
    reviews: [
      { rating: 4, text: 'Clean edges, no mess on the floor.' },
      { rating: 5, text: 'Good colour advice.' },
    ],
  },
  {
    id: 5,
    name: 'Ganesh Jadhav',
    skill: Skill.mason,
    yearsExp: 15,
    area: 'Samarth Nagar',
    ratePerDay: 850,
    visitCharge: 0,
    ratingAvg: 4.5,
    jobsCount: 77,
    availability: Availability.tomorrow,
    verified: true,
    about: 'Tile fixing, plaster repair, small wall and platform work.',
    reviews: [
      { rating: 5, text: 'Tiles are perfectly level.' },
      { rating: 4, text: 'Honest about material needed.' },
    ],
  },
  {
    id: 6,
    name: 'Anil Kale',
    skill: Skill.plumber,
    yearsExp: 5,
    area: 'CIDCO N-3',
    ratePerDay: 550,
    visitCharge: 80,
    ratingAvg: 4.2,
    jobsCount: 31,
    availability: Availability.today,
    verified: false,
    about: 'Basic plumbing and tap repair at low rates.',
    reviews: [
      { rating: 4, text: 'Quick and affordable.' },
    ],
  },
  {
    id: 7,
    name: 'Prakash Deshmukh',
    skill: Skill.electrician,
    yearsExp: 14,
    area: 'Jalna Road',
    ratePerDay: 950,
    visitCharge: 200,
    ratingAvg: 4.9,
    jobsCount: 180,
    availability: Availability.week,
    verified: true,
    about: 'Full flat wiring, geysers, AC points, safety checks.',
    reviews: [
      { rating: 5, text: 'Very professional, tested everything.' },
      { rating: 5, text: 'Best electrician we have used.' },
    ],
  },
  {
    id: 8,
    name: 'Mahesh Wagh',
    skill: Skill.helper,
    yearsExp: 3,
    area: 'Waluj',
    ratePerDay: 450,
    visitCharge: 0,
    ratingAvg: 4.3,
    jobsCount: 52,
    availability: Availability.today,
    verified: true,
    about: 'Shifting, cleaning, carrying, assisting other workers.',
    reviews: [
      { rating: 4, text: 'Hardworking and polite.' },
    ],
  },
  {
    id: 9,
    name: 'Santosh Pawar',
    skill: Skill.painter,
    yearsExp: 11,
    area: 'Garkheda',
    ratePerDay: 800,
    visitCharge: 0,
    ratingAvg: 4.7,
    jobsCount: 120,
    availability: Availability.today,
    verified: true,
    about: 'Interior and exterior painting, putty, texture finishes.',
    reviews: [
      { rating: 5, text: 'Our flat looked new after two days.' },
      { rating: 4, text: 'Paid fairly for the quality.' },
    ],
  },
  {
    id: 10,
    name: 'Yogesh Khairnar',
    skill: Skill.carpenter,
    yearsExp: 6,
    area: 'Harsul',
    ratePerDay: 700,
    visitCharge: 0,
    ratingAvg: 4.3,
    jobsCount: 45,
    availability: Availability.tomorrow,
    verified: false,
    about: 'Window and door repair, shelves, hinges and locks.',
    reviews: [
      { rating: 4, text: 'Good for small jobs.' },
    ],
  },
  {
    id: 11,
    name: 'Bhausaheb Thorat',
    skill: Skill.mason,
    yearsExp: 22,
    area: 'Osmanpura',
    ratePerDay: 1000,
    visitCharge: 0,
    ratingAvg: 4.8,
    jobsCount: 260,
    availability: Availability.week,
    verified: true,
    about: 'Renovation masonry, bathroom redo, waterproofing.',
    reviews: [
      { rating: 5, text: 'Solid, experienced work.' },
    ],
  },
  {
    id: 12,
    name: 'Rahul Ghule',
    skill: Skill.helper,
    yearsExp: 2,
    area: 'Waluj',
    ratePerDay: 400,
    visitCharge: 0,
    ratingAvg: 4.1,
    jobsCount: 28,
    availability: Availability.tomorrow,
    verified: false,
    about: 'General labour, loading and site cleaning.',
    reviews: [
      { rating: 4, text: 'On time every day.' },
    ],
  },
];

async function main() {
  console.log('Seeding KaamSetu database...');

  // 1. Seed/Upsert Admin from Environment Variables
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPhone = process.env.ADMIN_PHONE?.trim();

  if (adminEmail || adminPhone) {
    console.log('Seeding Admin user securely from environment variables...');
    const adminUser = await prisma.user.upsert({
      where: adminPhone ? { phone: adminPhone } : { email: adminEmail! },
      update: {
        role: Role.ADMIN,
        name: 'System Admin',
        email: adminEmail || null,
        phone: adminPhone || null,
        phoneVerifiedAt: adminPhone ? new Date() : null,
        emailVerifiedAt: adminEmail ? new Date() : null,
      },
      create: {
        role: Role.ADMIN,
        name: 'System Admin',
        email: adminEmail || null,
        phone: adminPhone || null,
        phoneVerifiedAt: adminPhone ? new Date() : null,
        emailVerifiedAt: adminEmail ? new Date() : null,
      },
    });
    console.log(`Admin user created/verified (ID: ${adminUser.id})`);
  } else {
    console.warn('Warning: ADMIN_EMAIL / ADMIN_PHONE not specified in .env, skipping admin seed.');
  }

  // 2. Seed a sample customer user for reviews
  const sampleCustomer = await prisma.user.upsert({
    where: { phone: '9000000999' },
    update: {},
    create: {
      role: Role.CUSTOMER,
      name: 'Anand Kulkarni',
      phone: '9000000999',
      phoneVerifiedAt: new Date(),
    },
  });

  // 3. Seed the 12 sample workers with fake phone numbers (9000000001 - 9000000012)
  for (const w of SEED_WORKERS) {
    const fakePhone = `9000000${String(w.id).padStart(3, '0')}`;
    const fakeEmail = `worker${w.id}@kaamsetu.sample`;

    const user = await prisma.user.upsert({
      where: { phone: fakePhone },
      update: {
        name: w.name,
        role: Role.WORKER,
        phoneVerifiedAt: w.verified ? new Date() : null,
      },
      create: {
        name: w.name,
        phone: fakePhone,
        email: fakeEmail,
        role: Role.WORKER,
        phoneVerifiedAt: w.verified ? new Date() : null,
      },
    });

    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        skill: w.skill,
        yearsExp: w.yearsExp,
        area: w.area,
        ratePerDay: w.ratePerDay,
        visitCharge: w.visitCharge,
        about: w.about,
        availability: w.availability,
        verified: w.verified,
        ratingAvg: w.ratingAvg,
        jobsCount: w.jobsCount,
      },
      create: {
        userId: user.id,
        skill: w.skill,
        yearsExp: w.yearsExp,
        area: w.area,
        ratePerDay: w.ratePerDay,
        visitCharge: w.visitCharge,
        about: w.about,
        availability: w.availability,
        verified: w.verified,
        ratingAvg: w.ratingAvg,
        jobsCount: w.jobsCount,
      },
    });

    // Seed work photos
    const photos = SAMPLE_WORK_PHOTOS[w.skill] || [];
    await prisma.workPhoto.deleteMany({ where: { workerId: profile.id } });
    for (let i = 0; i < photos.length; i++) {
      await prisma.workPhoto.create({
        data: {
          workerId: profile.id,
          url: photos[i],
          order: i,
        },
      });
    }

    // Seed customer reviews
    await prisma.review.deleteMany({ where: { workerId: profile.id } });
    for (const r of w.reviews) {
      await prisma.review.create({
        data: {
          workerId: profile.id,
          customerId: sampleCustomer.id,
          rating: r.rating,
          text: r.text,
        },
      });
    }
  }

  console.log('Seeded 12 workers with photos, reviews, and fake phone numbers successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
