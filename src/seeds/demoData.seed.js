/**
 * Demo data seed — run with: node src/seeds/demoData.seed.js
 * Drops and recreates all demo data. Safe to re-run.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../config/db');
const Counter    = require('../modules/counter/counter.model');
const Organization = require('../modules/organization/organization.model');
const User       = require('../modules/user/user.model');
const AdminArea  = require('../modules/adminArea/adminArea.model');
const Ward       = require('../modules/ward/ward.model');
const Category   = require('../modules/category/category.model');
const Group      = require('../modules/group/group.model');
const Training   = require('../modules/training/training.model');
const GroupTraining = require('../modules/groupTraining/groupTraining.model');
const MemberTraining = require('../modules/memberTraining/memberTraining.model');
const Certificate = require('../modules/certificate/certificate.model');
const Fund       = require('../modules/fund/fund.model');
const Installment = require('../modules/installment/installment.model');

// ─── helpers ─────────────────────────────────────────────────────────────────

const hash = (p) => bcrypt.hash(p, 12);

const nextSeq = async (id) => {
  const c = await Counter.findByIdAndUpdate(id, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
};

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d; };
const monthsFromNow = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d; };

// ─── data definitions ────────────────────────────────────────────────────────

const BD_PHONES = [
  '01711234501','01711234502','01711234503','01711234504','01711234505',
  '01811234506','01811234507','01811234508','01811234509','01811234510',
  '01911234511','01911234512','01911234513','01911234514','01911234515',
  '01611234516','01611234517','01611234518','01611234519','01611234520',
  '01511234521','01511234522','01511234523','01511234524','01511234525',
  '01311234526','01311234527','01311234528','01311234529','01311234530',
  '01411234531','01411234532','01411234533','01411234534','01411234535',
];

const MEMBER_DATA = [
  { fullName: 'Mohammad Rafiqul Islam',  gender: 'Male'   },
  { fullName: 'Fatema Begum',            gender: 'Female' },
  { fullName: 'Md. Abdul Karim',         gender: 'Male'   },
  { fullName: 'Rokeya Khatun',           gender: 'Female' },
  { fullName: 'Shahadat Hossain',        gender: 'Male'   },
  { fullName: 'Shamima Akter',           gender: 'Female' },
  { fullName: 'Mizanur Rahman',          gender: 'Male'   },
  { fullName: 'Nasrin Sultana',          gender: 'Female' },
  { fullName: 'Abul Kalam Azad',         gender: 'Male'   },
  { fullName: 'Moriam Begum',            gender: 'Female' },
  { fullName: 'Jahangir Alam',           gender: 'Male'   },
  { fullName: 'Dilara Begum',            gender: 'Female' },
  { fullName: 'Faruk Hossain',           gender: 'Male'   },
  { fullName: 'Razia Sultana',           gender: 'Female' },
  { fullName: 'Nurul Islam',             gender: 'Male'   },
  { fullName: 'Kulsum Akter',            gender: 'Female' },
  { fullName: 'Kamal Uddin Ahmed',       gender: 'Male'   },
  { fullName: 'Nargis Begum',            gender: 'Female' },
  { fullName: 'Rezaul Karim',            gender: 'Male'   },
  { fullName: 'Taslima Khatun',          gender: 'Female' },
  { fullName: 'Monir Hossain',           gender: 'Male'   },
  { fullName: 'Rahela Begum',            gender: 'Female' },
  { fullName: 'Alamgir Kabir',           gender: 'Male'   },
  { fullName: 'Kohinoor Akter',          gender: 'Female' },
  { fullName: 'Shafiqur Rahman',         gender: 'Male'   },
  { fullName: 'Parveen Akter',           gender: 'Female' },
  { fullName: 'Belal Hossain Talukder',  gender: 'Male'   },
  { fullName: 'Bilkis Begum',            gender: 'Female' },
  { fullName: 'Rashidul Hasan',          gender: 'Male'   },
  { fullName: 'Amena Khatun',            gender: 'Female' },
];

// ─── main seed ───────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();

  // ── 1. wipe existing demo data (keep super admin) ────────────────────────
  console.log('🧹  Clearing existing data…');
  await Promise.all([
    Organization.deleteMany({}),
    AdminArea.deleteMany({}),
    Ward.deleteMany({}),
    Category.deleteMany({}),
    Group.deleteMany({}),
    Training.deleteMany({}),
    GroupTraining.deleteMany({}),
    MemberTraining.deleteMany({}),
    Certificate.deleteMany({}),
    Fund.deleteMany({}),
    Installment.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  // Remove all users except the seeded super-admin phone
  await User.deleteMany({ phone: { $ne: '+8801966362744' } });
  console.log('✅  Cleared.');

  // ── 2. organization ──────────────────────────────────────────────────────
  console.log('🏢  Creating organization…');
  const org = await Organization.create({
    title: 'গ্রামীণ উন্নয়ন সংস্থা (GUS)',
    isActive: true,
  });

  // ── 3. staff users ───────────────────────────────────────────────────────
  console.log('👤  Creating staff users…');
  const pw = await hash('123456');

  const mkUser = async (data) => {
    const seq = await nextSeq('user');
    return User.create({ ...data, password: pw, org: org._id, userId: `USR-${String(seq).padStart(6,'0')}` });
  };

  const orgOwner = await mkUser({ fullName: 'Md. Aminul Islam', phone: '01700000001', gender: 'Male', role: 'Org Owner' });
  const mgr1    = await mkUser({ fullName: 'Khaleda Akter',     phone: '01700000002', gender: 'Female', role: 'Manager' });
  const mgr2    = await mkUser({ fullName: 'Iqbal Hossain',     phone: '01700000003', gender: 'Male',   role: 'Manager' });
  const inst1   = await mkUser({ fullName: 'Shireen Sultana',   phone: '01700000004', gender: 'Female', role: 'Instructor' });
  const inst2   = await mkUser({ fullName: 'Mahbub Alam',       phone: '01700000005', gender: 'Male',   role: 'Instructor' });
  const inst3   = await mkUser({ fullName: 'Sabina Yasmin',     phone: '01700000006', gender: 'Female', role: 'Instructor' });
  const acct1   = await mkUser({ fullName: 'Habibur Rahman',    phone: '01700000007', gender: 'Male',   role: 'Accountant' });
  const acct2   = await mkUser({ fullName: 'Lutfun Nahar',      phone: '01700000008', gender: 'Female', role: 'Accountant' });

  // Update org owners
  await Organization.findByIdAndUpdate(org._id, { $push: { owners: orgOwner._id } });

  // ── 4. member users ──────────────────────────────────────────────────────
  console.log('👥  Creating 30 members…');
  const members = [];
  for (let i = 0; i < MEMBER_DATA.length; i++) {
    const seq = await nextSeq('user');
    const u = await User.create({
      ...MEMBER_DATA[i],
      phone: BD_PHONES[i],
      password: pw,
      role: 'Member',
      org: org._id,
      userId: `USR-${String(seq).padStart(6,'0')}`,
    });
    members.push(u);
  }

  // ── 5. admin areas ───────────────────────────────────────────────────────
  console.log('🗺️   Creating admin areas…');

  // Divisions
  const [divDhaka, divCTG, divRAJ, divKhulna, divSylhet] = await AdminArea.insertMany([
    { name: 'ঢাকা',       type: 'Division', org: org._id },
    { name: 'চট্টগ্রাম',  type: 'Division', org: org._id },
    { name: 'রাজশাহী',    type: 'Division', org: org._id },
    { name: 'খুলনা',      type: 'Division', org: org._id },
    { name: 'সিলেট',      type: 'Division', org: org._id },
  ]);

  // Districts
  const [dstDhaka, dstGazipur, dstCTG, dstCoxs, dstRajshahi, dstBogura, dstKhulna, dstJessore, dstSylhet, dstHabiganj] = await AdminArea.insertMany([
    { name: 'ঢাকা সদর',         type: 'District', parent: divDhaka._id,   org: org._id },
    { name: 'গাজীপুর',           type: 'District', parent: divDhaka._id,   org: org._id },
    { name: 'চট্টগ্রাম সদর',     type: 'District', parent: divCTG._id,     org: org._id },
    { name: "কক্সবাজার",         type: 'District', parent: divCTG._id,     org: org._id },
    { name: 'রাজশাহী সদর',       type: 'District', parent: divRAJ._id,     org: org._id },
    { name: 'বগুড়া',             type: 'District', parent: divRAJ._id,     org: org._id },
    { name: 'খুলনা সদর',         type: 'District', parent: divKhulna._id,  org: org._id },
    { name: 'যশোর',              type: 'District', parent: divKhulna._id,  org: org._id },
    { name: 'সিলেট সদর',         type: 'District', parent: divSylhet._id,  org: org._id },
    { name: 'হবিগঞ্জ',           type: 'District', parent: divSylhet._id,  org: org._id },
  ]);

  // Upazilas
  const [upzDhamrai, upzSavar, upzGazipur, upzChandgaon, upzCoxs, upzPaba, upzBogura, upzDumuria, upzJessore, upzSylhet] = await AdminArea.insertMany([
    { name: 'ধামরাই',        type: 'Upazila', parent: dstDhaka._id,     org: org._id },
    { name: 'সাভার',         type: 'Upazila', parent: dstDhaka._id,     org: org._id },
    { name: 'গাজীপুর সদর',  type: 'Upazila', parent: dstGazipur._id,   org: org._id },
    { name: 'চান্দগাঁও',    type: 'Upazila', parent: dstCTG._id,       org: org._id },
    { name: "কক্সবাজার সদর", type: 'Upazila', parent: dstCoxs._id,     org: org._id },
    { name: 'পবা',           type: 'Upazila', parent: dstRajshahi._id,  org: org._id },
    { name: 'বগুড়া সদর',    type: 'Upazila', parent: dstBogura._id,    org: org._id },
    { name: 'ডুমুরিয়া',     type: 'Upazila', parent: dstKhulna._id,    org: org._id },
    { name: 'যশোর সদর',     type: 'Upazila', parent: dstJessore._id,   org: org._id },
    { name: 'সিলেট সদর',    type: 'Upazila', parent: dstSylhet._id,    org: org._id },
  ]);

  // Unions
  await AdminArea.insertMany([
    { name: 'কালামপুর',     type: 'Union', parent: upzDhamrai._id,    org: org._id },
    { name: 'শিমুলবাইদ',   type: 'Union', parent: upzSavar._id,      org: org._id },
    { name: 'বাসান',        type: 'Union', parent: upzGazipur._id,    org: org._id },
    { name: 'ফতেহাবাদ',    type: 'Union', parent: upzChandgaon._id,  org: org._id },
    { name: 'ঝিলওয়াঞ্জা',  type: 'Union', parent: upzCoxs._id,       org: org._id },
    { name: 'নওহাটা',      type: 'Union', parent: upzPaba._id,        org: org._id },
    { name: 'এরুলী',       type: 'Union', parent: upzBogura._id,      org: org._id },
    { name: 'আটলিয়া',     type: 'Union', parent: upzDumuria._id,     org: org._id },
    { name: 'চুড়ামনকাঠি', type: 'Union', parent: upzJessore._id,     org: org._id },
    { name: 'টুকেরবাজার',  type: 'Union', parent: upzSylhet._id,      org: org._id },
  ]);

  // ── 6. wards ─────────────────────────────────────────────────────────────
  console.log('📍  Creating wards…');
  const [zDhaka, zGazipur, zCTG, zRajshahi, zKhulna, zSylhet] = await Ward.insertMany([
    { title: 'ঢাকা উত্তর জোন',         division: divDhaka._id,   district: dstDhaka._id,    upazila: upzSavar._id,     org: org._id },
    { title: 'গাজীপুর জোন',             division: divDhaka._id,   district: dstGazipur._id,  upazila: upzGazipur._id,   org: org._id },
    { title: 'চট্টগ্রাম উপকূল জোন',    division: divCTG._id,     district: dstCTG._id,      upazila: upzChandgaon._id, org: org._id },
    { title: 'রাজশাহী কৃষি জোন',        division: divRAJ._id,     district: dstRajshahi._id, upazila: upzPaba._id,      org: org._id },
    { title: 'খুলনা দক্ষিণ জোন',        division: divKhulna._id,  district: dstKhulna._id,   upazila: upzDumuria._id,   org: org._id },
    { title: 'সিলেট চা বাগান জোন',      division: divSylhet._id,  district: dstSylhet._id,   upazila: upzSylhet._id,    org: org._id },
  ]);

  // ── 7. categories ─────────────────────────────────────────────────────────
  console.log('🏷️   Creating categories…');
  const [catAgri, catLive, catFish, catWomen, catYouth, catMicro] = await Category.insertMany([
    { title: 'কৃষি উন্নয়ন',            org: org._id },
    { title: 'পশুপালন',                 org: org._id },
    { title: 'মৎস্য চাষ',              org: org._id },
    { title: 'নারী ক্ষমতায়ন',          org: org._id },
    { title: 'যুব উন্নয়ন',             org: org._id },
    { title: 'ক্ষুদ্রঋণ ও সঞ্চয়',     org: org._id },
  ]);

  // ── 8. groups ─────────────────────────────────────────────────────────────
  console.log('👨‍👩‍👦  Creating groups…');
  const m = members; // shorthand

  const [grpA, grpB, grpC, grpD, grpE, grpF] = await Group.insertMany([
    {
      title: 'সবুজ বাংলা কৃষক দল',
      ward: zDhaka._id, category: catAgri._id,
      members: [m[0],m[1],m[2],m[3],m[4]].map(u=>u._id),
      org: org._id,
    },
    {
      title: 'আলোর পথ মহিলা সমিতি',
      ward: zGazipur._id, category: catWomen._id,
      members: [m[5],m[6],m[7],m[8],m[9]].map(u=>u._id),
      org: org._id,
    },
    {
      title: 'মেঘনা মৎস্যজীবী সমবায়',
      ward: zCTG._id, category: catFish._id,
      members: [m[10],m[11],m[12],m[13],m[14]].map(u=>u._id),
      org: org._id,
    },
    {
      title: 'পদ্মা পশুপালন গোষ্ঠী',
      ward: zRajshahi._id, category: catLive._id,
      members: [m[15],m[16],m[17],m[18],m[19]].map(u=>u._id),
      org: org._id,
    },
    {
      title: 'সুন্দরবন তরুণ উদ্যোক্তা দল',
      ward: zKhulna._id, category: catYouth._id,
      members: [m[20],m[21],m[22],m[23],m[24]].map(u=>u._id),
      org: org._id,
    },
    {
      title: 'চা শ্রমিক উন্নয়ন সমিতি',
      ward: zSylhet._id, category: catMicro._id,
      members: [m[25],m[26],m[27],m[28],m[29]].map(u=>u._id),
      org: org._id,
    },
  ]);

  // ── 9. trainings ──────────────────────────────────────────────────────────
  console.log('📚  Creating trainings…');
  const [
    trAgri, trIrr, trFish, trLive, trOrg,
    trWomen, trYouth, trAcct, trSafe, trCompost,
  ] = await Training.insertMany([
    { title: 'আধুনিক কৃষি প্রযুক্তি',          purpose: 'কৃষকদের উন্নত চাষাবাদ পদ্ধতি শেখানো এবং ফসলের উৎপাদন বৃদ্ধি করা।', org: org._id },
    { title: 'সেচ ব্যবস্থাপনা ও পানি সংরক্ষণ',  purpose: 'সঠিক সেচ পদ্ধতি এবং পানির দক্ষ ব্যবহার সম্পর্কে প্রশিক্ষণ।',      org: org._id },
    { title: 'মৎস্য চাষ ও পুকুর ব্যবস্থাপনা',  purpose: 'বাণিজ্যিক মাছ চাষ এবং পুকুর ব্যবস্থাপনার আধুনিক পদ্ধতি।',        org: org._id },
    { title: 'গবাদি পশু পালন ও স্বাস্থ্যসেবা',  purpose: 'গরু, ছাগল ও হাঁস-মুরগি পালনের উন্নত কৌশল ও টিকা প্রদান।',      org: org._id },
    { title: 'সমবায় সংগঠন ব্যবস্থাপনা',         purpose: 'সমবায় সমিতি পরিচালনা, হিসাব রক্ষণ ও নেতৃত্ব উন্নয়ন।',          org: org._id },
    { title: 'নারী উদ্যোক্তা উন্নয়ন',           purpose: 'নারীদের ক্ষুদ্র ব্যবসা পরিচালনা ও আয় বৃদ্ধির দক্ষতা তৈরি।',    org: org._id },
    { title: 'যুব নেতৃত্ব ও দক্ষতা বিকাশ',      purpose: 'তরুণদের নেতৃত্বগুণ, যোগাযোগ দক্ষতা ও উদ্যোক্তা মানসিকতা গড়া।', org: org._id },
    { title: 'হিসাব ও আর্থিক ব্যবস্থাপনা',      purpose: 'সাধারণ বুককিপিং, ব্যয় নিয়ন্ত্রণ এবং সঞ্চয় পরিকল্পনা।',       org: org._id },
    { title: 'খাদ্য নিরাপত্তা ও পুষ্টি',         purpose: 'পুষ্টিকর খাদ্যাভ্যাস, নিরাপদ খাদ্য উৎপাদন ও সংরক্ষণ পদ্ধতি।', org: org._id },
    { title: 'জৈব সার ও কম্পোস্ট তৈরি',          purpose: 'রাসায়নিক সার ছাড়া জৈব পদ্ধতিতে মাটির উর্বরতা বৃদ্ধির কৌশল।', org: org._id },
  ]);

  // ── 10. group trainings ───────────────────────────────────────────────────
  console.log('📋  Creating group trainings…');

  const gt = (group, training, status, scheduledDate, startedAt, completedAt, instructors) => ({
    group, training, org: org._id, instructors,
    status,
    statusHistory: [
      { status: 'Pending', note: 'নির্ধারিত', updatedBy: orgOwner._id, date: daysAgo(90) },
      ...(status !== 'Pending' ? [{ status: 'Started', note: 'প্রশিক্ষণ শুরু', updatedBy: inst1._id, date: startedAt || daysAgo(60) }] : []),
      ...(status === 'Completed' ? [{ status: 'Completed', note: 'সফলভাবে সম্পন্ন', updatedBy: inst1._id, date: completedAt || daysAgo(10) }] : []),
    ],
    scheduledDate: scheduledDate || daysAgo(80),
    startedAt: startedAt || (status !== 'Pending' ? daysAgo(60) : null),
    completedAt: completedAt || (status === 'Completed' ? daysAgo(10) : null),
  });

  const [gt1, gt2, gt3, gt4, gt5, gt6, gt7, gt8] = await GroupTraining.insertMany([
    gt(grpA._id, trAgri._id,    'Completed', daysAgo(100), daysAgo(80), daysAgo(30), [inst1._id]),
    gt(grpA._id, trCompost._id, 'Started',   daysAgo(40),  daysAgo(20), null,        [inst2._id]),
    gt(grpB._id, trWomen._id,   'Completed', daysAgo(120), daysAgo(90), daysAgo(20), [inst3._id]),
    gt(grpB._id, trOrg._id,     'Started',   daysAgo(30),  daysAgo(15), null,        [inst1._id]),
    gt(grpC._id, trFish._id,    'Completed', daysAgo(110), daysAgo(85), daysAgo(15), [inst2._id]),
    gt(grpD._id, trLive._id,    'Completed', daysAgo(95),  daysAgo(70), daysAgo(5),  [inst3._id]),
    gt(grpE._id, trYouth._id,   'Started',   daysAgo(25),  daysAgo(10), null,        [inst1._id, inst2._id]),
    gt(grpF._id, trAcct._id,    'Pending',   daysFromNow(14), null,     null,        [inst3._id]),
  ]);

  // ── 11. member trainings ──────────────────────────────────────────────────
  console.log('🎯  Enrolling members in trainings…');

  const enroll = (member, groupTraining, group, training, rating) => ({
    member, groupTraining, group, training, org: org._id,
    rating: rating || null,
    ratedBy: rating ? inst1._id : null,
    ratedAt: rating ? daysAgo(8) : null,
  });

  const mtDocs = [
    // Group A – trAgri (Completed) — 5 members rated
    ...([m[0],m[1],m[2],m[3],m[4]].map((u, i) => enroll(u._id, gt1._id, grpA._id, trAgri._id, [8,9,7,9,8][i]))),
    // Group A – trCompost (Started) — 5 members not rated yet
    ...([m[0],m[1],m[2],m[3],m[4]].map(u => enroll(u._id, gt2._id, grpA._id, trCompost._id, null))),
    // Group B – trWomen (Completed) — 5 members rated
    ...([m[5],m[6],m[7],m[8],m[9]].map((u, i) => enroll(u._id, gt3._id, grpB._id, trWomen._id, [9,8,10,7,9][i]))),
    // Group B – trOrg (Started)
    ...([m[5],m[6],m[7],m[8],m[9]].map(u => enroll(u._id, gt4._id, grpB._id, trOrg._id, null))),
    // Group C – trFish (Completed) — rated
    ...([m[10],m[11],m[12],m[13],m[14]].map((u, i) => enroll(u._id, gt5._id, grpC._id, trFish._id, [7,8,8,9,7][i]))),
    // Group D – trLive (Completed) — rated
    ...([m[15],m[16],m[17],m[18],m[19]].map((u, i) => enroll(u._id, gt6._id, grpD._id, trLive._id, [9,8,7,10,8][i]))),
    // Group E – trYouth (Started)
    ...([m[20],m[21],m[22],m[23],m[24]].map(u => enroll(u._id, gt7._id, grpE._id, trYouth._id, null))),
    // Group F – trAcct (Pending)
    ...([m[25],m[26],m[27],m[28],m[29]].map(u => enroll(u._id, gt8._id, grpF._id, trAcct._id, null))),
  ];

  await MemberTraining.insertMany(mtDocs);

  // ── 12. certificates ──────────────────────────────────────────────────────
  console.log('🏅  Issuing certificates for completed trainings…');

  const completedEnrollments = [
    // Group A – trAgri
    ...[m[0],m[1],m[2],m[3],m[4]].map(u => ({ member: u._id, training: trAgri._id, groupTraining: gt1._id, group: grpA._id })),
    // Group B – trWomen
    ...[m[5],m[6],m[7],m[8],m[9]].map(u => ({ member: u._id, training: trWomen._id, groupTraining: gt3._id, group: grpB._id })),
    // Group C – trFish
    ...[m[10],m[11],m[12],m[13],m[14]].map(u => ({ member: u._id, training: trFish._id, groupTraining: gt5._id, group: grpC._id })),
    // Group D – trLive (4 of 5 issued, 1 skipped to simulate partial)
    ...[m[15],m[16],m[17],m[18]].map(u => ({ member: u._id, training: trLive._id, groupTraining: gt6._id, group: grpD._id })),
  ];

  for (const cert of completedEnrollments) {
    const seq = await nextSeq('certificate');
    await Certificate.create({
      ...cert,
      certificateNo: `CERT-${String(seq).padStart(6,'0')}`,
      org: org._id,
      issuedBy: orgOwner._id,
      issuedAt: daysAgo(Math.floor(Math.random() * 15) + 2),
      status: 'Active',
    });
  }

  // Revoke one certificate to show revoked state
  await Certificate.findOneAndUpdate(
    { member: m[2]._id, training: trAgri._id },
    { status: 'Revoked' }
  );

  // ── 13. funds ─────────────────────────────────────────────────────────────
  console.log('💰  Creating funds…');

  // Fund 1 — Active, started 6 months ago, 12-month loan
  const fund1Start = monthsAgo(6);
  const fund1Members = [
    { user: m[0]._id, loanAmount: 15000, monthlyInstallment: 1354.17, totalPayable: 16250, totalPaid: 0 },
    { user: m[1]._id, loanAmount: 12000, monthlyInstallment: 1083.33, totalPayable: 13000, totalPaid: 0 },
    { user: m[2]._id, loanAmount: 18000, monthlyInstallment: 1625,    totalPayable: 19500, totalPaid: 0 },
    { user: m[3]._id, loanAmount: 10000, monthlyInstallment: 902.78,  totalPayable: 10833, totalPaid: 0 },
    { user: m[4]._id, loanAmount: 20000, monthlyInstallment: 1805.56, totalPayable: 21667, totalPaid: 0 },
  ];
  const fund1 = await Fund.create({
    title: 'সবুজ বাংলা কৃষক ঋণ তহবিল',
    description: 'কৃষকদের জন্য কৃষি উপকরণ ক্রয় ও মৌসুমী চাষাবাদের জন্য ঋণ সহায়তা।',
    org: org._id, sourceGroup: grpA._id,
    members: fund1Members,
    totalAmount: 75000, interestRate: 10, interestType: 'annual', timeline: 12,
    dueDay: 10, startDate: fund1Start, status: 'Active',
    createdBy: orgOwner._id,
    notes: 'বার্ষিক ১০% সুদে ১২ মাসের কিস্তিতে পরিশোধযোগ্য।',
  });

  // Fund 2 — Active, started 3 months ago, 6-month loan
  const fund2Start = monthsAgo(3);
  const fund2Members = [
    { user: m[5]._id,  loanAmount: 8000,  monthlyInstallment: 1400, totalPayable: 8400,  totalPaid: 0 },
    { user: m[6]._id,  loanAmount: 10000, monthlyInstallment: 1750, totalPayable: 10500, totalPaid: 0 },
    { user: m[7]._id,  loanAmount: 12000, monthlyInstallment: 2100, totalPayable: 12600, totalPaid: 0 },
    { user: m[8]._id,  loanAmount: 8000,  monthlyInstallment: 1400, totalPayable: 8400,  totalPaid: 0 },
    { user: m[9]._id,  loanAmount: 10000, monthlyInstallment: 1750, totalPayable: 10500, totalPaid: 0 },
  ];
  const fund2 = await Fund.create({
    title: 'আলোর পথ নারী উদ্যোক্তা তহবিল',
    description: 'নারী সদস্যদের ক্ষুদ্র ব্যবসা শুরু ও পরিচালনার জন্য স্বল্পমেয়াদি ঋণ।',
    org: org._id, sourceGroup: grpB._id,
    members: fund2Members,
    totalAmount: 48000, interestRate: 10.5, interestType: 'annual', timeline: 6,
    dueDay: 15, startDate: fund2Start, status: 'Active',
    createdBy: mgr1._id,
    notes: '৬ মাসের কিস্তিতে পরিশোধ। মাসের ১৫ তারিখ কিস্তির শেষ তারিখ।',
  });

  // Fund 3 — Active, started 4 months ago, 12-month loan
  const fund3Start = monthsAgo(4);
  const fund3Members = [
    { user: m[10]._id, loanAmount: 20000, monthlyInstallment: 1805.56, totalPayable: 21667, totalPaid: 0 },
    { user: m[11]._id, loanAmount: 15000, monthlyInstallment: 1354.17, totalPayable: 16250, totalPaid: 0 },
    { user: m[12]._id, loanAmount: 25000, monthlyInstallment: 2256.94, totalPayable: 27083, totalPaid: 0 },
    { user: m[13]._id, loanAmount: 18000, monthlyInstallment: 1625,    totalPayable: 19500, totalPaid: 0 },
    { user: m[14]._id, loanAmount: 22000, monthlyInstallment: 1986.11, totalPayable: 23833, totalPaid: 0 },
  ];
  const fund3 = await Fund.create({
    title: 'মেঘনা মৎস্যচাষ সম্প্রসারণ তহবিল',
    description: 'মৎস্যচাষ সম্প্রসারণ ও আধুনিক সরঞ্জাম কেনার জন্য দীর্ঘমেয়াদি ঋণ।',
    org: org._id, sourceGroup: grpC._id,
    members: fund3Members,
    totalAmount: 100000, interestRate: 10, interestType: 'annual', timeline: 12,
    dueDay: 5, startDate: fund3Start, status: 'Active',
    createdBy: mgr2._id,
  });

  // Fund 4 — Draft (not yet activated)
  await Fund.create({
    title: 'পদ্মা পশুপালন ঋণ তহবিল (খসড়া)',
    description: 'গবাদি পশু ক্রয় ও পশুপালন সম্প্রসারণের জন্য পরিকল্পিত ঋণ।',
    org: org._id, sourceGroup: grpD._id,
    members: [
      { user: m[15]._id, loanAmount: 12000, monthlyInstallment: 1083.33, totalPayable: 13000, totalPaid: 0 },
      { user: m[16]._id, loanAmount: 15000, monthlyInstallment: 1354.17, totalPayable: 16250, totalPaid: 0 },
      { user: m[17]._id, loanAmount: 10000, monthlyInstallment: 902.78,  totalPayable: 10833, totalPaid: 0 },
    ],
    totalAmount: 37000, interestRate: 10, interestType: 'annual', timeline: 12,
    dueDay: 10, startDate: daysFromNow(15), status: 'Draft',
    createdBy: acct1._id,
    notes: 'এখনো সক্রিয় হয়নি। অনুমোদনের অপেক্ষায়।',
  });

  // ── 14. installments ──────────────────────────────────────────────────────
  console.log('📅  Generating installments…');

  const mkInstallments = async (fund, members, paidMonths) => {
    const installments = [];
    const start = new Date(fund.startDate);

    for (const fm of members) {
      let memberPaid = 0;
      for (let i = 1; i <= fund.timeline; i++) {
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + i);
        dueDate.setDate(fund.dueDay);

        const isPaid   = i <= paidMonths;
        const isOverdue = !isPaid && dueDate < new Date();
        const isPartial = !isPaid && !isOverdue && i === paidMonths + 1 && Math.random() > 0.7;

        const totalDue = fm.monthlyInstallment;
        const principal = +(fm.loanAmount / fund.timeline).toFixed(2);
        const interest  = +(totalDue - principal).toFixed(2);

        let paidAmount = 0;
        let status = 'Pending';
        let paidAt = null;

        if (isPaid) {
          paidAmount = totalDue;
          status = 'Paid';
          const pd = new Date(dueDate);
          pd.setDate(pd.getDate() - Math.floor(Math.random() * 5));
          paidAt = pd;
          memberPaid += paidAmount;
        } else if (isPartial) {
          paidAmount = +(totalDue * 0.5).toFixed(2);
          status = 'Partial';
          paidAt = new Date();
          memberPaid += paidAmount;
        } else if (isOverdue) {
          status = 'Overdue';
        }

        installments.push({
          fund: fund._id,
          member: fm.user,
          org: fund.org,
          installmentNumber: i,
          dueDate,
          principalAmount: principal,
          interestAmount: interest,
          totalDue: +totalDue.toFixed(2),
          paidAmount: +paidAmount.toFixed(2),
          status,
          paidAt,
          collectedBy: isPaid || isPartial ? acct1._id : null,
          notes: isPaid ? 'নগদে পরিশোধ' : null,
        });
      }

      // Update totalPaid in fund members array
      await Fund.updateOne(
        { _id: fund._id, 'members.user': fm.user },
        { $set: { 'members.$.totalPaid': +memberPaid.toFixed(2) } }
      );
    }

    await Installment.insertMany(installments);
  };

  // Fund 1: 6 months paid (exactly matches the 6 months since start)
  await mkInstallments(fund1, fund1Members, 6);
  // Fund 2: 3 months paid (started 3 months ago)
  await mkInstallments(fund2, fund2Members, 3);
  // Fund 3: 4 months paid (started 4 months ago)
  await mkInstallments(fund3, fund3Members, 4);

  // ── done ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Demo data seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Login credentials (all passwords: 123456)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Super Admin    : +8801966362744 / admin123');
  console.log('  Org Owner      : 01700000001    / 123456');
  console.log('  Manager        : 01700000002    / 123456');
  console.log('  Manager        : 01700000003    / 123456');
  console.log('  Instructor     : 01700000004    / 123456');
  console.log('  Instructor     : 01700000005    / 123456');
  console.log('  Accountant     : 01700000007    / 123456');
  console.log('  Member (sample): 01711234501    / 123456');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n  Organization : গ্রামীণ উন্নয়ন সংস্থা (GUS)');
  console.log('  Members      : 30  |  Groups : 6  |  Trainings : 10');
  console.log('  Certificates : 18 (1 revoked)');
  console.log('  Funds        : 4 (3 Active + 1 Draft)');
  console.log('  Installments : generated for all active funds');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
