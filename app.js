// --- 1. Initialization & Default DB ---
const DB_NAME = 'nurse_planner_db_mvp';

const defaultDB = {
    version: "1.0.0",
    config: {
        nurseName: "Demo Nurse",
        // Setting an anchor: rotation started yesterday at 7AM
        shiftRotationStart: new Date(Date.now() - 86400000).toISOString().split('T')[0] + "T07:00:00",
        standardShiftDurationHours: 12,
    },
    rawShifts: [] // MVP: We will use baseline rotation math first.
};

// Load DB or initialize default
let db = JSON.parse(localStorage.getItem(DB_NAME)) || defaultDB;
if (!localStorage.getItem(DB_NAME)) {
    localStorage.setItem(DB_NAME, JSON.stringify(db));
}

// --- 2. Core Fatigue Math (Baseline Rotation) ---
// Returns 'Green', 'Yellow', 'Red' (or 'Work') based on hours since rotation start.
function getFatigueState(targetDate) {
    const startAnchor = new Date(db.config.shiftRotationStart);
    const msPerCycle = 96 * 60 * 60 * 1000; // 96 hours per full rotation

    // 1. Find where targetDate fits in the 96h cycle (0-95 hours)
    const msDiff = targetDate - startAnchor;
    const hourInCycle = (msDiff % msPerCycle) / (1000 * 60 * 60);

    // 2. Define the traffic lights based on the rotation rules:
    // Day 1 (0-23h): Shift (0-12), Recovery (12-16 Y), Free (16-24 G)
    if (hourInCycle >= 0 && hourInCycle < 12) return { code: 'Red', label: 'Working (Day)' };
    if (hourInCycle >= 12 && hourInCycle < 16) return { code: 'Yellow', label: 'Winding Down (Low Energy)' };
    if (hourInCycle >= 16 && hourInCycle < 24) return { code: 'Green', label: 'Energized (Baseline Free)' };

    // Day 2 (24-47h): Entirely Free
    if (hourInCycle >= 24 && hourInCycle < 48) return { code: 'Green', label: 'Optimal Energy' };

    // Day 3 (48-71h): Free (48-60 G), Shift starts (60-72 R)
    if (hourInCycle >= 48 && hourInCycle < 60) return { code: 'Green', label: 'Available (Pre-Night)' };
    if (hourInCycle >= 60 && hourInCycle < 72) return { code: 'Red', label: 'Working (Night)' };

    // Day 4 (72-95h): Night shift ends (72), Crash (72-80 R), Recovery (80-96 Y)
    if (hourInCycle >= 72 && hourInCycle < 80) return { code: 'Red', label: 'Sleeping (Post-Night)' };
    if (hourInCycle >= 80 && hourInCycle < 96) return { code: 'Yellow', label: 'Groggy (Slow Recovery)' };

    return { code: 'Green', label: 'Unknown/Baseline' }; // Fallback
}

// --- 3. Render Minimal Calendar (Next 4 Days) ---
function renderMVP() {
    const container = document.getElementById('calendar-view');
    container.innerHTML = '';
    const now = new Date();

    for (let i = 0; i < 4; i++) {
        const day = new Date(now);
        day.setDate(now.getDate() + i);
        day.setHours(12, 0, 0, 0); // Check fatigue score at noon

        const fatigue = getFatigueState(day);
        const dayStr = day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        const html = `
            <div class="calendar-day energy-${fatigue.code.toLowerCase()}">
                <strong>${dayStr}</strong><br>
                Status: ${fatigue.label}
            </div>
        `;
        container.innerHTML += html;
    }
}

// Simple Service Worker registration for PWA compliance
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log("SW Registered"));
}

// Start the app
renderMVP();
