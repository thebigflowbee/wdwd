/* -------------------------------------------------
   WDWD – What Did We Drink?
   Pure‑JavaScript client‑side logic
-------------------------------------------------- */

/* ------------------ Global Session Data ------------------ */
const STORAGE_KEY = 'WDWD_session_v1';
const FIVE_MIN   = 5 * 60 * 1000;
const DAY_MS     = 24 * 60 * 60 * 1000;

let session = {
        startTime: Date.now(),
        users: {},           // { nickname: drinkCount }
        sets: [],            // [{type:3|5, time:ms}]
        log: [],             // String messages
        achievements: []     // Names already unlocked
};

// Tracks whether the manage panel is visible
let manageVisible = false;

/* ------------------ Helper Functions ------------------ */
function saveSession() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
function loadSession() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return;  // Nothing saved yet
	try {
		const data = JSON.parse(raw);
		// Auto‑reset after 24 hours
		if (Date.now() - data.startTime >= DAY_MS) {
			localStorage.removeItem(STORAGE_KEY);
		} else {
			session = data;
		}
	} catch { /* Ignore corrupted data */ }
}
function resetSession() {
	localStorage.removeItem(STORAGE_KEY);
	location.reload(); // Simplest way to reset UI
}
function log(msg) {
	session.log.unshift(`${new Date().toLocaleTimeString()} – ${msg}`);
}

/* ------------------ UI Elements ------------------ */
const joinSection  = document.querySelector('#join-section');
const nicknameInput = document.querySelector('#nickname-input');
const joinBtn      = document.querySelector('#join-btn');

const actionSection = document.querySelector('#action-section');
const add3Btn      = document.querySelector('#add-set-3');
const add5Btn      = document.querySelector('#add-set-5');
const toggleManageBtn = document.querySelector('#toggle-manage');

const manageSection = document.querySelector('#manage-section');
const removeLastSetBtn = document.querySelector('#remove-last-set');
const userSelect = document.querySelector('#manage-user-select');
const subtractDrinkBtn = document.querySelector('#subtract-drink');
const removeUserBtn = document.querySelector('#remove-user');

const usersSection = document.querySelector('#users-section');
const usersContainer = document.querySelector('#users-container');

const dashboardSection = document.querySelector('#dashboard-section');
const totalSetsEl   = document.querySelector('#total-sets');
const totalDrinksEl = document.querySelector('#total-drinks');
const leaderboardBody = document.querySelector('#leaderboard-table tbody');

const achievementsSection = document.querySelector('#achievements-section');
const achievementsList = document.querySelector('#achievements-list');

const logSection = document.querySelector('#log-section');
const logList    = document.querySelector('#log-list');

const resetBtn   = document.querySelector('#reset-btn');
const resetFooter = document.querySelector('#reset-footer');
const manageFooter = document.querySelector('#manage-footer');

/* ------------------ Achievements Config ------------------ */
const ACHIEVEMENTS = [
	{
		name: 'Set Slayer',
		check: () => session.sets.length >= 3
	},
	{
		name: 'Thirsty Thursday',
		check: () => Object.values(session.users).some(c => c >= 10)
	},
	{
		name: 'Weekend Warrior',
		check: () => {
			const day = new Date(session.startTime).getDay(); // 0 = Sun
			const isWeekend = day === 0 || day === 6;
			const total = Object.values(session.users).reduce((a, b) => a + b, 0);
			return isWeekend && total >= 15;
		}
	}
];

/* ------------------ Initialization ------------------ */
loadSession();
updateUI();

/* ------------------ Event Listeners ------------------ */
// 1) Join / Add User
joinBtn.addEventListener('click', () => {
	const name = nicknameInput.value.trim();
	if (!name) { alert('Please enter a nickname.'); return; }
	if (Object.keys(session.users).length >= 15) {
		alert('Maximum 15 users reached.');
		return;
	}
	if (!session.users[name]) {
		session.users[name] = 0;
		log(`${name} joined the session`);
		saveSession();
		updateUI();
	}
	nicknameInput.value = '';
});

// 2) Add Set Buttons
add3Btn.addEventListener('click', () => handleAddSet(3));
add5Btn.addEventListener('click', () => handleAddSet(5));
toggleManageBtn.addEventListener('click', () => {
        manageVisible = !manageVisible;
        updateUI();
});

removeLastSetBtn.addEventListener('click', () => {
        if (session.sets.length === 0) return;
        const removed = session.sets.shift();
        log(`Removed last set of ${removed.type}`);
        saveSession();
        updateUI();
});

subtractDrinkBtn.addEventListener('click', () => {
        const name = userSelect.value;
        if (!name) return;
        if (session.users[name] > 0) {
                session.users[name] -= 1;
                log(`Corrected drink for ${name}`);
                saveSession();
                updateUI();
                updateManageState();
        }
});

userSelect.addEventListener('change', updateManageState);

removeUserBtn.addEventListener('click', () => {
        const name = userSelect.value;
        if (!name) return;
        if (confirm(`Remove user ${name}?`)) {
                delete session.users[name];
                log(`${name} was removed`);
                saveSession();
                updateUI();
                updateManageSelect();
                updateManageState();
        }
});

function handleAddSet(size) {
	const now = Date.now();
	const last = session.sets[0];
	// Confirm if last set < 5 minutes ago
	if (last && now - last.time < FIVE_MIN) {
		const sure = confirm('Are you sure this is a separate set?');
		if (!sure) return;
	}
        session.sets.unshift({ type: size, time: now });
        log(`New set ordered: ${size === 3 ? '3‑Pint' : '5‑Glass'} Set`);
        const sourceBtn = size === 3 ? add3Btn : add5Btn;
        triggerAnimation(sourceBtn); // quick pop on whichever button was used
        saveSession();
        updateUI();
}

// 3) Reset Button
resetBtn.addEventListener('click', () => {
	if (confirm('Reset and clear all session data?')) resetSession();
});

/* ------------------ Dynamic User Drink Buttons ------------------ */
function createUserButtons() {
        usersContainer.innerHTML = ''; // Clear
        for (const [name, count] of Object.entries(session.users)) {
                const btn = document.createElement('button');
                btn.textContent = `${name} (${count})`;
                btn.addEventListener('click', () => {
                        session.users[name] += 1;
                        log(`${name} drank one!`);
                        saveSession();
                        updateUI();
                        triggerAnimation(btn);
                });
                usersContainer.appendChild(btn);
                triggerFade(btn);
        }
}

function updateManageSelect() {
        userSelect.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select User';
        userSelect.appendChild(opt);
        Object.keys(session.users).forEach(name => {
                const o = document.createElement('option');
                o.value = name;
                o.textContent = name;
                userSelect.appendChild(o);
        });
        updateManageState();
}

function updateManageState() {
        const name = userSelect.value;
        const count = session.users[name] || 0;
        subtractDrinkBtn.disabled = !name || count === 0;
        removeUserBtn.disabled = !name;
}

/* ------------------ Leaderboard & Stats ------------------ */
function updateDashboard() {
	// Totals
	totalSetsEl.textContent   = session.sets.length;
	const totalDrinks = Object.values(session.users).reduce((a, b) => a + b, 0);
	totalDrinksEl.textContent = totalDrinks;

	// Leaderboard
	const sorted = Object.entries(session.users)
		.sort((a, b) => b[1] - a[1]);
	leaderboardBody.innerHTML = '';
	sorted.forEach(([name, count], idx) => {
		const row = document.createElement('tr');
		row.innerHTML = `<td>#${idx + 1}</td><td>${name}</td><td>${count}</td>`;
		leaderboardBody.appendChild(row);
	});
}

/* ------------------ Achievements ------------------ */
function checkAchievements() {
	ACHIEVEMENTS.forEach(({ name, check }) => {
		if (check() && !session.achievements.includes(name)) {
			session.achievements.push(name);
			log(`🏆 Achievement unlocked: ${name}`);
			popAchievement(name);
			saveSession();
		}
	});
	// Refresh list
	achievementsList.innerHTML = '';
	session.achievements.forEach(a => {
		const li = document.createElement('li');
		li.textContent = a;
		achievementsList.appendChild(li);
	});
}
function popAchievement(name) {
	// Simple toast‑like animation
	const toast = document.createElement('div');
	toast.className = 'stat-card pop';
	toast.style.position = 'fixed';
	toast.style.top = '20%';
	toast.style.left = '50%';
	toast.style.transform = 'translateX(-50%)';
	toast.style.zIndex = '999';
	toast.textContent = `🏅 ${name}!`;
	document.body.appendChild(toast);
	setTimeout(() => toast.remove(), 2500);
}

/* ------------------ Session Log ------------------ */
function updateLog() {
	logList.innerHTML = '';
	session.log.forEach(item => {
		const li = document.createElement('li');
		li.textContent = item;
		li.classList.add('slide-in');
		logList.appendChild(li);
	});
}

/* ------------------ UI Refresh ------------------ */
function updateUI() {
        // Toggle hidden sections based on whether we have any users
        const hasUsers = Object.keys(session.users).length > 0;

       [ actionSection, usersSection, dashboardSection,
         achievementsSection, logSection, resetFooter,
         manageFooter
       ].forEach(el => el.classList.toggle('hidden', !hasUsers));

        const wasHidden = manageSection.classList.contains('hidden');
        manageSection.classList.toggle('hidden', !hasUsers || !manageVisible);
        const nowVisible = !manageSection.classList.contains('hidden');
        if (nowVisible && wasHidden) {
                triggerFade(manageSection);
        }
        toggleManageBtn.textContent = manageVisible ? '❌ Close Tools' : '🛠️ Tools';

        createUserButtons();
        updateManageSelect();
        updateDashboard();
        checkAchievements();
        updateLog();
}

/* ------------------ Tiny Animation Helper ------------------ */
function triggerAnimation(el) {
        el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 600);
}

function triggerFade(el) {
        el.classList.add('fade-up');
        el.addEventListener('animationend', () => el.classList.remove('fade-up'), { once: true });
}
