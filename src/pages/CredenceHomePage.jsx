import { useState } from "react";

// ─── CSS Variables & Global Styles ────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Mulish:wght@400;500;600;700&display=swap');

  :root {
    --en-primary-brand-50:  #F3EEFF;
    --en-primary-brand-100: #E4D4FF;
    --en-primary-brand-500: #7C3AED;
    --en-primary-brand-700: #5B21B6;

    --en-teal-50:  #F0FDFA;
    --en-teal-100: #CCFBF1;
    --en-teal-200: #99F6E4;
    --en-teal-500: #14B8A6;
    --en-teal-700: #0F766E;

    --en-grey-0:    #FFFFFF;
    --en-grey-10:   #FAFAFA;
    --en-grey-20:   #F5F5F7;
    --en-grey-100:  #F0EFF4;
    --en-grey-200:  #E5E4EB;
    --en-grey-300:  #D1CFD9;
    --en-grey-400:  #A09DB0;
    --en-grey-500:  #706D80;
    --en-grey-600:  #4B4860;
    --en-grey-700:  #3A3750;
    --en-grey-800:  #2B2840;
    --en-grey-1000: #1A1830;

    --en-success-100: #D1FAE5;
    --en-success-500: #10B981;
    --en-error-100:   #FEE2E2;
    --en-error-500:   #EF4444;
    --en-info-100:    #DBEAFE;

    --en-shadow-sm:  0 1px 3px rgba(124,58,237,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --en-shadow-md:  0 4px 16px rgba(124,58,237,0.10), 0 2px 8px rgba(0,0,0,0.06);
    --en-shadow-ceo: 0 8px 32px rgba(124,58,237,0.14);

    --en-radius-sm:   6px;
    --en-radius-md:   12px;
    --en-radius-lg:   16px;
    --en-radius-full: 9999px;

    --en-space-2xs: 4px;
    --en-space-xs:  8px;
    --en-space-sm:  12px;
    --en-space-md:  16px;
    --en-space-lg:  24px;
    --en-space-xl:  32px;
    --en-space-2xl: 48px;

    --text-h2:       1.5rem;
    --text-h3:       1.25rem;
    --text-h4:       1.125rem;
    --text-headline: 0.9375rem;
    --text-body:     0.875rem;
    --text-caption:  0.75rem;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Poppins', sans-serif;
    background: var(--en-grey-20);
    color: var(--en-grey-800);
    -webkit-font-smoothing: antialiased;
  }

  .credence-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ── SIDEBAR ──────────────────────────── */
  .credence-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid var(--en-grey-200);
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .credence-sidebar .sidebar-logo {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--en-grey-100);
    display: flex; align-items: center; gap: 10px;
  }

  .credence-sidebar .logo-mark {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, var(--en-primary-brand-500), var(--en-teal-500));
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #fff;
    font-family: 'Poppins', sans-serif;
  }

  .credence-sidebar .logo-text {
    font-size: 1.05rem; font-weight: 700;
    color: var(--en-grey-800);
    letter-spacing: -0.3px;
    font-family: 'Poppins', sans-serif;
  }

  .credence-sidebar .sidebar-nav { flex: 1; padding: 12px 12px; overflow-y: auto; }

  .credence-sidebar .nav-section-label {
    font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--en-grey-400);
    padding: 8px 8px 4px;
  }

  .credence-sidebar .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px;
    font-size: 0.825rem; font-weight: 500;
    color: var(--en-grey-600);
    cursor: pointer; transition: all 0.15s;
    margin-bottom: 2px;
  }
  .credence-sidebar .nav-item:hover { background: var(--en-grey-100); color: var(--en-grey-800); }
  .credence-sidebar .nav-item.active {
    background: var(--en-primary-brand-50);
    color: var(--en-primary-brand-500);
    font-weight: 600;
  }
  .credence-sidebar .nav-item.active svg { color: var(--en-primary-brand-500); }

  .credence-sidebar .nav-icon { width: 17px; height: 17px; flex-shrink: 0; }

  .credence-sidebar .sidebar-footer {
    padding: 12px;
    border-top: 1px solid var(--en-grey-100);
  }

  .credence-sidebar .user-card {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .credence-sidebar .user-card:hover { background: var(--en-grey-100); }

  .credence-sidebar .user-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--en-primary-brand-500), var(--en-teal-500));
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }

  .credence-sidebar .user-info { flex: 1; min-width: 0; }
  .credence-sidebar .user-name { font-size: 0.8rem; font-weight: 600; color: var(--en-grey-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .credence-sidebar .user-grade { font-size: 0.7rem; color: var(--en-grey-500); }

  /* ── MAIN CONTENT ─────────────────────── */
  .credence-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--en-grey-20);
  }

  .credence-main .topbar {
    height: 56px; flex-shrink: 0;
    background: #fff;
    border-bottom: 1px solid var(--en-grey-200);
    display: flex; align-items: center;
    padding: 0 24px;
    gap: 16px;
    position: relative;
  }

  .credence-main .topbar-title {
    font-size: 0.95rem; font-weight: 600; color: var(--en-grey-800);
    flex: 1;
  }

  .credence-main .topbar-actions { display: flex; align-items: center; gap: 8px; }

  .credence-main .topbar-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 8px;
    font-size: 0.78rem; font-weight: 500;
    border: 1px solid var(--en-grey-200);
    background: #fff; color: var(--en-grey-600);
    cursor: pointer; transition: all 0.15s;
  }
  .credence-main .topbar-btn:hover { border-color: var(--en-primary-brand-500); color: var(--en-primary-brand-500); }

  .credence-main .notif-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--en-error-500);
    position: absolute; top: 14px; right: 24px;
  }

  .credence-main .content-scroll {
    flex: 1; overflow-y: auto;
    padding: 24px;
    display: flex; flex-direction: column; gap: 20px;
  }

  .credence-main .welcome-banner {
    background: linear-gradient(120deg, var(--en-primary-brand-700) 0%, var(--en-primary-brand-500) 50%, #6D28D9 100%);
    border-radius: var(--en-radius-lg);
    padding: 24px 28px;
    color: #fff;
    position: relative;
    overflow: hidden;
  }

  .credence-main .welcome-banner::before {
    content: '';
    position: absolute; top: -40px; right: -40px;
    width: 200px; height: 200px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
  }
  .credence-main .welcome-banner::after {
    content: '';
    position: absolute; bottom: -60px; right: 80px;
    width: 160px; height: 160px;
    border-radius: 50%;
    background: rgba(20,184,166,0.15);
  }

  .credence-main .welcome-greeting {
    font-size: 1.3rem; font-weight: 700; margin-bottom: 4px;
  }

  .credence-main .welcome-subtitle {
    font-size: 0.82rem; opacity: 0.82; max-width: 480px; line-height: 1.55;
    font-family: 'Mulish', sans-serif;
  }

  .credence-main .welcome-meta {
    display: flex; gap: 20px; margin-top: 18px; flex-wrap: wrap;
  }

  .credence-main .meta-chip {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.12);
    padding: 6px 14px; border-radius: 20px;
    font-size: 0.78rem; font-weight: 500;
    backdrop-filter: blur(8px);
  }

  .credence-main .proficiency-row,
  .credence-main .panel {
    background: #fff;
    border-radius: var(--en-radius-lg);
    padding: 18px 20px;
    box-shadow: var(--en-shadow-sm);
  }

  .credence-main .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }

  .credence-main .section-title {
    font-size: 0.875rem; font-weight: 600; color: var(--en-grey-800);
  }

  .credence-main .section-badge {
    font-size: 0.7rem; font-weight: 600;
    background: var(--en-primary-brand-50);
    color: var(--en-primary-brand-500);
    padding: 3px 10px; border-radius: 20px;
  }

  .credence-main .competency-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 10px;
  }

  .credence-main .comp-card {
    background: var(--en-grey-10);
    border: 1.5px solid var(--en-grey-200);
    border-radius: var(--en-radius-md);
    padding: 14px 12px;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    overflow: hidden;
  }

  .credence-main .comp-card:hover {
    border-color: var(--en-primary-brand-500);
    box-shadow: 0 0 0 3px var(--en-primary-brand-50);
    transform: translateY(-1px);
  }

  .credence-main .comp-card.active {
    border-color: var(--en-primary-brand-500);
    background: var(--en-primary-brand-50);
  }

  .credence-main .comp-level-badge {
    display: inline-flex; align-items: center;
    font-size: 0.65rem; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 20px;
    margin-bottom: 8px;
  }

  .credence-main .level-proficient  { background: #D1FAE5; color: #065F46; }
  .credence-main .level-developing  { background: #FEF3C7; color: #92400E; }
  .credence-main .level-beginner    { background: #FEE2E2; color: #991B1B; }
  .credence-main .level-coach       { background: #EDE9FE; color: #5B21B6; }

  .credence-main .comp-name {
    font-size: 0.78rem; font-weight: 600; color: var(--en-grey-800); line-height: 1.3;
    margin-bottom: 10px;
  }

  .credence-main .comp-score-row {
    display: flex; align-items: center; justify-content: space-between;
  }

  .credence-main .comp-score {
    font-size: 1.2rem; font-weight: 700; color: var(--en-primary-brand-500);
    font-family: 'Poppins', sans-serif;
  }

  .credence-main .comp-score.no-score { color: var(--en-grey-400); font-size: 0.78rem; font-weight: 500; }

  .credence-main .comp-progress-bar {
    height: 3px; background: var(--en-grey-200); border-radius: 2px;
    margin-top: 8px; overflow: hidden;
  }
  .credence-main .comp-progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, var(--en-primary-brand-500), var(--en-teal-500));
    transition: width 0.4s ease;
  }

  .credence-main .two-col {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  }
  @media (max-width: 900px) { .credence-main .two-col { grid-template-columns: 1fr; } }

  .credence-main .perf-table { width: 100%; border-collapse: collapse; }
  .credence-main .perf-table thead tr {
    border-bottom: 1.5px solid var(--en-grey-200);
  }
  .credence-main .perf-table th {
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--en-grey-500);
    padding: 6px 8px; text-align: left;
  }
  .credence-main .perf-table td {
    font-size: 0.78rem; color: var(--en-grey-700);
    padding: 9px 8px; font-family: 'Mulish', sans-serif;
    border-bottom: 1px solid var(--en-grey-100);
  }
  .credence-main .perf-table tbody tr:last-child td { border-bottom: none; }
  .credence-main .perf-table tbody tr:hover td { background: var(--en-grey-10); }

  .credence-main .score-pill {
    display: inline-block;
    padding: 2px 8px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 700;
    background: var(--en-primary-brand-50);
    color: var(--en-primary-brand-700);
  }

  .credence-main .attempt-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--en-grey-100); font-size: 0.68rem; font-weight: 600;
    color: var(--en-grey-600);
  }

  .credence-main .progress-list { display: flex; flex-direction: column; gap: 10px; }

  .credence-main .progress-row {
    display: flex; align-items: center; gap: 10px;
  }

  .credence-main .prog-abbr {
    width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700;
    background: var(--en-primary-brand-50);
    color: var(--en-primary-brand-700);
    flex-shrink: 0;
  }

  .credence-main .prog-label {
    flex: 1; min-width: 0;
    font-size: 0.78rem; color: var(--en-grey-700); font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .credence-main .prog-bar-wrap { width: 80px; }
  .credence-main .prog-bar {
    height: 6px; background: var(--en-grey-200); border-radius: 3px; overflow: hidden;
  }
  .credence-main .prog-bar-fill {
    height: 100%; border-radius: 3px;
    background: linear-gradient(90deg, var(--en-primary-brand-500), var(--en-teal-500));
    transition: width 0.4s ease;
  }

  .credence-main .prog-pct {
    width: 32px; text-align: right;
    font-size: 0.72rem; font-weight: 600; color: var(--en-grey-600);
  }

  .credence-main .desired-banner {
    background: linear-gradient(135deg, var(--en-teal-50), #fff);
    border: 1.5px solid var(--en-teal-200);
    border-radius: var(--en-radius-md);
    padding: 12px 16px;
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 14px;
  }

  .credence-main .desired-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--en-teal-100);
    display: flex; align-items: center; justify-content: center;
    color: var(--en-teal-700); font-size: 16px;
    flex-shrink: 0;
  }

  .credence-main .desired-text { flex: 1; }
  .credence-main .desired-title { font-size: 0.8rem; font-weight: 600; color: var(--en-grey-800); margin-bottom: 2px; }
  .credence-main .desired-desc  { font-size: 0.72rem; color: var(--en-grey-500); font-family: 'Mulish', sans-serif; }

  .credence-main .desired-select {
    padding: 6px 10px; border-radius: 8px;
    border: 1.5px solid var(--en-teal-200);
    background: #fff; font-size: 0.78rem;
    color: var(--en-teal-700); font-weight: 600;
    cursor: pointer; outline: none;
    font-family: 'Poppins', sans-serif;
  }

  .credence-main .quick-actions {
    display: flex; gap: 8px; flex-wrap: wrap;
  }

  .credence-main .qa-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px;
    font-size: 0.78rem; font-weight: 500;
    border: 1.5px solid var(--en-grey-200);
    background: #fff; color: var(--en-grey-700);
    cursor: pointer; transition: all 0.15s;
    font-family: 'Poppins', sans-serif;
  }
  .credence-main .qa-btn:hover {
    border-color: var(--en-primary-brand-500);
    color: var(--en-primary-brand-500);
    background: var(--en-primary-brand-50);
  }
  .credence-main .qa-btn.primary {
    background: var(--en-primary-brand-500);
    border-color: var(--en-primary-brand-500);
    color: #fff;
  }
  .credence-main .qa-btn.primary:hover {
    background: var(--en-primary-brand-700);
    border-color: var(--en-primary-brand-700);
    color: #fff;
  }
`;

// ─── Data ──────────────────────────────────────────────────────────────────────
const competencies = [
  { id:1, name:"Customer Handling & Engagement", abbr:"CE", score:64, level:"Proficient",  levelKey:"proficient",  band:"Band I only" },
  { id:2, name:"Functional Mentorship",          abbr:"FM", score:65, level:"Proficient",  levelKey:"proficient",  band:"Band I only" },
  { id:3, name:"Interpersonal Skills",           abbr:"IS", score: 0, level:"Developing",  levelKey:"developing",  band:"Band I & T" },
  { id:4, name:"Learning Agility",               abbr:"LA", score:50, level:"Proficient",  levelKey:"proficient",  band:"Band I only" },
  { id:5, name:"Passion & Energy",               abbr:"PE", score: 0, level:"Developing",  levelKey:"developing",  band:"Band I and T" },
  { id:6, name:"Problem Solving & Solution",     abbr:"PS", score:64, level:"Proficient",  levelKey:"proficient",  band:"Band I only" },
];

const history = [
  { skill:"Problem Solving & Solution Orientation", attempt:1, start:"01 May 2023", end:"01 May 2023", score:"64%" },
  { skill:"Customer Handling and Engagement",       attempt:1, start:"25 May 2023", end:"25 May 2023", score:"64%" },
  { skill:"Learning Agility",                       attempt:1, start:"26 May 2023", end:"26 May 2023", score:"56%" },
  { skill:"Learning Agility",                       attempt:2, start:"10 Oct 2023", end:"10 Oct 2023", score:"50%" },
  { skill:"Functional Mentorship",                  attempt:1, start:"24 Jun 2024", end:"24 Jun 2024", score:"65%" },
  { skill:"People & Culture Success",               attempt:1, start:"08 Oct 2024", end:"08 Oct 2024", score:"13%" },
];

const overallProgress = [
  { abbr:"IS", name:"Interpersonal Skills",               pct:52 },
  { abbr:"PS", name:"Problem Solving & Solution",         pct:10 },
  { abbr:"CE", name:"Customer Handling and Engagement",   pct:10 },
  { abbr:"EM", name:"Emotional Mastery",                  pct: 6 },
  { abbr:"LA", name:"Learning Agility",                   pct: 5 },
  { abbr:"FM", name:"Functional Mentorship",              pct: 3 },
  { abbr:"PO", name:"Planning and Organizing",            pct: 0 },
  { abbr:"PA", name:"Passion & Energy",                   pct: 2 },
  { abbr:"PE", name:"People & Culture Success",           pct: 0 },
];

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Competency: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/>
    </svg>
  ),
  Assessment: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Reports: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:17,height:17}}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

const levelClass = (lk) => ({
  proficient: "level-proficient",
  developing: "level-developing",
  beginner:   "level-beginner",
  coach:      "level-coach",
}[lk] || "level-developing");

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CredenceHomePage() {
  const [activeNav, setActiveNav]   = useState("home");
  const [activeComp, setActiveComp] = useState(null);

  const navItems = [
    { id:"home",       label:"Dashboard",    icon:<Icons.Home /> },
    { id:"competency", label:"Competencies", icon:<Icons.Competency /> },
    { id:"assessment", label:"Assessments",  icon:<Icons.Assessment /> },
    { id:"reports",    label:"Reports",      icon:<Icons.Reports /> },
    { id:"history",    label:"My History",   icon:<Icons.History /> },
  ];

  return (
    <>
      <style>{globalStyles}</style>
      <div className="credence-layout">

        {/* ── SIDEBAR ── */}
        <aside className="credence-sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">C</div>
            <span className="logo-text">Credence</span>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Menu</div>
            {navItems.map(n => (
              <div
                key={n.id}
                className={`nav-item${activeNav === n.id ? " active" : ""}`}
                onClick={() => setActiveNav(n.id)}
              >
                {n.icon}
                {n.label}
              </div>
            ))}

            <div className="nav-section-label" style={{marginTop:16}}>Account</div>
            <div className="nav-item">
              <Icons.Settings />
              Settings
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">BK</div>
              <div className="user-info">
                <div className="user-name">Bharat Kotwani</div>
                <div className="user-grade">Grade I2 · Participant</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="credence-main">

          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-title">
              {activeNav === "home" ? "Dashboard" :
               activeNav === "competency" ? "My Competencies" :
               activeNav === "assessment" ? "Assessments" :
               activeNav === "reports" ? "Reports" : "My History"}
            </div>
            <div className="topbar-actions">
              <button className="topbar-btn"><Icons.Info /> Support</button>
              <button className="topbar-btn"><Icons.Info /> FAQ</button>
              <button className="topbar-btn" style={{position:"relative", padding:"6px 10px"}}>
                <Icons.Bell />
                <span className="notif-dot" style={{position:"absolute", top:6, right:6}}></span>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="content-scroll">

            {/* Welcome Banner */}
            <div className="welcome-banner">
              <div className="welcome-greeting">Welcome back, Bharat 👋</div>
              <div className="welcome-subtitle">
                Your competency assessment journey continues. You have 3 competencies in progress and 2 not yet started. Keep going — each assessment brings you closer to your desired proficiency level.
              </div>
              <div className="welcome-meta">
                <div className="meta-chip">
                  <Icons.Star />
                  Grade I2
                </div>
                <div className="meta-chip">
                  <Icons.Target />
                  4 of 6 Competencies Attempted
                </div>
                <div className="meta-chip">
                  <Icons.Assessment />
                  2 Assessments Pending
                </div>
              </div>
            </div>

            {/* Desired Proficiency + Competency Cards */}
            <div className="panel">
              <div className="desired-banner">
                <div className="desired-icon">🎯</div>
                <div className="desired-text">
                  <div className="desired-title">Know Your Desired Proficiency Level</div>
                  <div className="desired-desc">
                    Every Competency progresses from Beginner(B) → Developing(D) → Proficient(P) → Coach(C), depending on your grade.
                  </div>
                </div>
                <select className="desired-select">
                  <option>Current Level</option>
                  <option>Next Level</option>
                </select>
              </div>

              <div className="section-header">
                <div className="section-title">My Competencies</div>
                <div className="section-badge">6 Assigned</div>
              </div>

              <div className="competency-cards">
                {competencies.map(c => (
                  <div
                    key={c.id}
                    className={`comp-card${activeComp === c.id ? " active" : ""}`}
                    onClick={() => setActiveComp(activeComp === c.id ? null : c.id)}
                  >
                    <div className={`comp-level-badge ${levelClass(c.levelKey)}`}>
                      {c.level}
                    </div>
                    <div className="comp-name">{c.name}</div>
                    <div className="comp-score-row">
                      {c.score > 0
                        ? <div className="comp-score">{c.score}%</div>
                        : <div className="comp-score no-score">Not attempted</div>
                      }
                      <span style={{fontSize:"0.62rem",color:"var(--en-grey-400)",fontFamily:"Mulish"}}>
                        {c.band}
                      </span>
                    </div>
                    {c.score > 0 && (
                      <div className="comp-progress-bar">
                        <div className="comp-progress-fill" style={{width:`${c.score}%`}}></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{marginTop:16, paddingTop:14, borderTop:"1px solid var(--en-grey-100)"}}>
                <div className="quick-actions">
                  <button className="qa-btn primary">
                    <Icons.Assessment /> Start Assessment
                  </button>
                  <button className="qa-btn">
                    <Icons.Star /> Take Practice Test
                  </button>
                  <button className="qa-btn">
                    <Icons.Reports /> View My Reports
                  </button>
                </div>
              </div>
            </div>

            {/* Two column: History + Overall Progress */}
            <div className="two-col">

              {/* Performance History */}
              <div className="panel">
                <div className="section-header" style={{marginBottom:12}}>
                  <div className="section-title">My Performance History</div>
                  <a href="#" style={{fontSize:"0.72rem",color:"var(--en-primary-brand-500)",fontWeight:600,textDecoration:"none"}}>
                    See all →
                  </a>
                </div>
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>#</th>
                      <th>Date</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h,i) => (
                      <tr key={i}>
                        <td style={{maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                          title={h.skill}>{h.skill}</td>
                        <td><span className="attempt-badge">{h.attempt}</span></td>
                        <td style={{color:"var(--en-grey-500)",fontFamily:"Mulish",fontSize:"0.72rem"}}>{h.end}</td>
                        <td><span className="score-pill">{h.score}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Overall Progress */}
              <div className="panel">
                <div className="section-header" style={{marginBottom:12}}>
                  <div className="section-title">Overall Progress</div>
                  <span style={{fontSize:"0.72rem",color:"var(--en-grey-500)",fontFamily:"Mulish"}}>
                    Status across Comviva
                  </span>
                </div>

                <div style={{fontSize:"0.68rem",fontWeight:600,color:"var(--en-grey-400)",
                  textTransform:"uppercase",letterSpacing:"0.07em",
                  display:"grid",gridTemplateColumns:"36px 1fr 80px 32px",gap:10,
                  paddingBottom:8,borderBottom:"1px solid var(--en-grey-100)",marginBottom:8}}>
                  <span></span>
                  <span>Competency</span>
                  <span>% Completed</span>
                  <span></span>
                </div>

                <div className="progress-list">
                  {overallProgress.map((p,i) => (
                    <div key={i} className="progress-row">
                      <div className="prog-abbr">{p.abbr}</div>
                      <div className="prog-label" title={p.name}>{p.name}</div>
                      <div className="prog-bar-wrap">
                        <div className="prog-bar">
                          <div className="prog-bar-fill" style={{width:`${p.pct}%`}}></div>
                        </div>
                      </div>
                      <div className="prog-pct">{p.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>{/* /content-scroll */}
        </main>
      </div>
    </>
  );
}
