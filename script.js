(function() {
    'use strict';

    const state = {
        timeRemaining: 600,
        totalTime: 600,
        isRunning: false,
        isPaused: false,
        timerInterval: null,
        lastQuoteIndex: -1,
        alarmTime: null,
        alarmActive: false,
        alarmInterval: null,
        selectedTone: 0,
        celebrationPhoto: null,
        clocks: [
            { id: 1, label: 'Local', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            { id: 2, label: 'New York', timeZone: 'America/New_York' },
            { id: 3, label: 'London', timeZone: 'Europe/London' },
            { id: 4, label: 'Tokyo', timeZone: 'Asia/Tokyo' }
        ],
        clockInterval: null
    };

    const elements = {
        timeDisplay: document.getElementById('timeDisplay'),
        statusText: document.getElementById('statusText'),
        progressBar: document.getElementById('progressBar'),
        progressFill: document.getElementById('progressFill'),
        btnStart: document.getElementById('btnStart'),
        btnPause: document.getElementById('btnPause'),
        btnReset: document.getElementById('btnReset'),
        quoteText: document.getElementById('quoteText'),
        quoteContainer: document.getElementById('quoteContainer'),
        quoteEmoji: document.getElementById('quoteEmoji'),
        completionMessage: document.getElementById('completionMessage'),
        floatingEmojis: document.getElementById('floatingEmojis'),
        confettiContainer: document.getElementById('confettiContainer'),
        completionSound: document.getElementById('completionSound'),
        timerMinutes: document.getElementById('timerMinutes'),
        alarmTime: document.getElementById('alarmTime'),
        btnSetAlarm: document.getElementById('btnSetAlarm'),
        btnClearAlarm: document.getElementById('btnClearAlarm'),
        alarmStatus: document.getElementById('alarmStatus'),
        toneSelect: document.getElementById('toneSelect'),
        photoInput: document.getElementById('photoInput'),
        btnClearPhoto: document.getElementById('btnClearPhoto'),
        celebrationPhotoOverlay: document.getElementById('celebrationPhotoOverlay'),
        celebrationPhotoImg: document.getElementById('celebrationPhotoImg'),
        celebrationPhotoText: document.getElementById('celebrationPhotoText'),
        celebrationPhotoClose: document.getElementById('celebrationPhotoClose'),
        worldClockList: document.getElementById('worldClockList'),
        btnAddClock: document.getElementById('btnAddClock')
    };

    const quotes = [
        { text: "Small progress is still progress.", emoji: "🌱" },
        { text: "Focus today, succeed tomorrow.", emoji: "🌅" },
        { text: "Every minute invested builds your future.", emoji: "💎" },
        { text: "Discipline beats motivation.", emoji: "🏋️" },
        { text: "Dreams become reality through consistency.", emoji: "✨" },
        { text: "One focused session can change your day.", emoji: "☀️" },
        { text: "Keep going—you are building something amazing.", emoji: "🌟" },
        { text: "Success grows one minute at a time.", emoji: "📈" }
    ];

    const floatingEmojiPool = ['🌿', '🌸', '🌼', '☁️', '🌙', '✨', '🧘', '💙', '🌱', '🌷', '🍃', '🌸', '💫', '🌊', '🦋'];

    const statusStates = {
        ready: { text: '🟢 Ready', class: 'status-ready' },
        running: { text: '🔵 Running', class: 'status-running' },
        paused: { text: '🟡 Paused', class: 'status-paused' },
        completed: { text: '✅ Completed', class: 'status-completed' }
    };

    function init() {
        cacheElements();
        setupEventListeners();
        createFloatingEmojis();
        loadSettings();
        applyTimerDuration();
        updateDisplay();
        updateStatus('ready');
        showRandomQuote();
        setupKeyboardAccessibility();
        handleVisibilityChange();
        renderWorldClocks();
        startWorldClock();
        updateAlarmStatus();
        elements.celebrationPhotoOverlay.hidden = true;
        elements.celebrationPhotoImg.hidden = true;
    }

    function cacheElements() {
        Object.keys(elements).forEach(key => {
            if (!elements[key]) {
                console.warn(`Element not found: ${key}`);
            }
        });
    }

    function setupEventListeners() {
        elements.btnStart.addEventListener('click', startTimer);
        elements.btnPause.addEventListener('click', pauseTimer);
        elements.btnReset.addEventListener('click', resetTimer);

        elements.timerMinutes.addEventListener('change', onDurationChange);
        elements.btnSetAlarm.addEventListener('click', setAlarm);
        elements.btnClearAlarm.addEventListener('click', clearAlarm);
        elements.toneSelect.addEventListener('change', onToneChange);
        elements.photoInput.addEventListener('change', onPhotoChange);
        elements.btnClearPhoto.addEventListener('click', clearPhoto);
        elements.celebrationPhotoClose.addEventListener('click', closeCelebrationPhoto);

        elements.btnAddClock.addEventListener('click', addWorldClock);

        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function setupKeyboardAccessibility() {
        [elements.btnStart, elements.btnPause, elements.btnReset].forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    }

    function handleKeydown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                if (!state.isRunning && !state.isPaused) {
                    startTimer();
                } else if (state.isRunning) {
                    pauseTimer();
                } else if (state.isPaused) {
                    startTimer();
                }
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                resetTimer();
                break;
            case 'Escape':
                if (!elements.celebrationPhotoOverlay.hidden) {
                    closeCelebrationPhoto();
                }
                break;
        }
    }

    function handleVisibilityChange() {
        if (document.hidden && state.isRunning) {
            pauseTimer();
        }
    }

    function loadSettings() {
        try {
            const savedMinutes = localStorage.getItem('zenfocus_minutes');
            if (savedMinutes !== null) {
                elements.timerMinutes.value = savedMinutes;
            }
            const savedTone = localStorage.getItem('zenfocus_tone');
            if (savedTone !== null) {
                state.selectedTone = parseInt(savedTone, 10) || 0;
                elements.toneSelect.value = String(state.selectedTone);
            }
            const savedPhoto = localStorage.getItem('zenfocus_photo');
            if (savedPhoto) {
                state.celebrationPhoto = savedPhoto;
                elements.btnClearPhoto.hidden = false;
            }
            const savedAlarm = localStorage.getItem('zenfocus_alarm');
            if (savedAlarm) {
                state.alarmTime = savedAlarm;
                elements.alarmTime.value = savedAlarm;
                state.alarmActive = true;
                updateAlarmStatus();
            }
            const savedClocks = localStorage.getItem('zenfocus_clocks');
            if (savedClocks) {
                const parsed = JSON.parse(savedClocks);
                if (Array.isArray(parsed) && parsed.length) {
                    state.clocks = parsed;
                }
            }
        } catch (e) {
            console.log('Could not load saved settings');
        }
    }

    function saveSetting(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.log('Could not save setting');
        }
    }

    function onDurationChange() {
        let minutes = parseInt(elements.timerMinutes.value, 10);
        if (isNaN(minutes) || minutes < 1) minutes = 1;
        if (minutes > 180) minutes = 180;
        elements.timerMinutes.value = minutes;
        saveSetting('zenfocus_minutes', String(minutes));

        if (!state.isRunning && !state.isPaused) {
            applyTimerDuration();
            updateDisplay();
        }
    }

    function applyTimerDuration() {
        const minutes = parseInt(elements.timerMinutes.value, 10) || 10;
        state.totalTime = minutes * 60;
        state.timeRemaining = state.totalTime;
    }

    function startTimer() {
        if (state.isRunning) return;

        if (state.timeRemaining <= 0) {
            applyTimerDuration();
        }

        state.isRunning = true;
        state.isPaused = false;
        state.timerInterval = setInterval(tick, 1000);

        updateButtonStates();
        updateStatus('running');
        elements.timeDisplay.classList.add('pulse');
        elements.timeDisplay.classList.remove('warning', 'danger');
    }

    function pauseTimer() {
        if (!state.isRunning) return;

        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        state.isPaused = true;

        updateButtonStates();
        updateStatus('paused');
        elements.timeDisplay.classList.remove('pulse');
    }

    function resetTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        applyTimerDuration();
        state.isRunning = false;
        state.isPaused = false;

        updateButtonStates();
        updateStatus('ready');
        updateDisplay();
        elements.timeDisplay.classList.remove('pulse', 'warning', 'danger');
        elements.progressFill.classList.remove('warning', 'danger');
        elements.progressFill.style.transform = 'scaleX(1)';
        elements.completionMessage.hidden = true;
        showRandomQuote();
    }

    function tick() {
        state.timeRemaining--;

        if (state.timeRemaining <= 0) {
            completeTimer();
            return;
        }

        updateDisplay();

        if (state.timeRemaining <= 60 && state.timeRemaining > 10) {
            elements.timeDisplay.classList.add('warning');
            elements.timeDisplay.classList.remove('danger');
            elements.progressFill.classList.add('warning');
        } else if (state.timeRemaining <= 10) {
            elements.timeDisplay.classList.add('danger');
            elements.timeDisplay.classList.remove('warning');
            elements.progressFill.classList.add('danger');
            elements.progressFill.classList.remove('warning');
        }
    }

    function completeTimer() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.isRunning = false;
        state.isPaused = false;
        state.timeRemaining = 0;

        updateButtonStates();
        updateStatus('completed');
        updateDisplay();

        elements.timeDisplay.classList.remove('pulse', 'warning', 'danger');
        elements.progressFill.classList.remove('warning', 'danger');

        playTone(state.selectedTone);
        showCompletionMessage();
        showCelebrationPhoto('Great Job! You completed your focus session.');
        createConfetti();
        createFloatingCelebration();
    }

    function updateDisplay() {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        elements.timeDisplay.textContent = timeString;
        elements.timeDisplay.setAttribute('aria-label', `${minutes} minutes ${seconds} seconds remaining`);

        const progress = state.totalTime > 0 ? state.timeRemaining / state.totalTime : 0;
        elements.progressFill.style.transform = `scaleX(${progress})`;
        elements.progressBar.setAttribute('aria-valuenow', state.timeRemaining);
        elements.progressBar.setAttribute('aria-valuetext', `${minutes} minutes ${seconds} seconds remaining`);
    }

    function updateButtonStates() {
        elements.btnStart.disabled = state.isRunning;
        elements.btnPause.disabled = !state.isRunning;
        elements.btnReset.disabled = false;

        elements.btnStart.setAttribute('aria-pressed', state.isRunning);
        elements.btnPause.setAttribute('aria-pressed', state.isPaused);
    }

    function updateStatus(status) {
        const statusInfo = statusStates[status];
        elements.statusText.textContent = statusInfo.text;
        elements.statusText.className = `status-text ${statusInfo.class}`;
    }

    function showRandomQuote() {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * quotes.length);
        } while (randomIndex === state.lastQuoteIndex && quotes.length > 1);

        state.lastQuoteIndex = randomIndex;
        const quote = quotes[randomIndex];

        elements.quoteText.classList.add('fade-out');
        elements.quoteText.classList.remove('fade-in');

        setTimeout(() => {
            elements.quoteText.textContent = quote.text;
            elements.quoteEmoji.textContent = quote.emoji;
            elements.quoteText.classList.remove('fade-out');
            elements.quoteText.classList.add('fade-in');
        }, 200);
    }

    function showCompletionMessage() {
        elements.completionMessage.hidden = false;
    }

    /* ---------------- Alarm ---------------- */

    function setAlarm() {
        const value = elements.alarmTime.value;
        if (!value) return;

        state.alarmTime = value;
        state.alarmActive = true;
        saveSetting('zenfocus_alarm', value);
        updateAlarmStatus();
        startAlarmWatcher();
    }

    function clearAlarm() {
        state.alarmTime = null;
        state.alarmActive = false;
        saveSetting('zenfocus_alarm', '');
        elements.alarmTime.value = '';
        updateAlarmStatus();
    }

    function updateAlarmStatus() {
        if (state.alarmActive && state.alarmTime) {
            elements.alarmStatus.textContent = `⏰ Alarm set for ${state.alarmTime}`;
            elements.alarmStatus.classList.add('set');
            elements.btnClearAlarm.hidden = false;
        } else {
            elements.alarmStatus.textContent = 'No alarm set';
            elements.alarmStatus.classList.remove('set');
            elements.btnClearAlarm.hidden = true;
        }
    }

    function startAlarmWatcher() {
        if (state.alarmInterval) return;
        state.alarmInterval = setInterval(checkAlarm, 1000);
    }

    function checkAlarm() {
        if (!state.alarmActive || !state.alarmTime) return;

        const now = new Date();
        const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (current === state.alarmTime && now.getSeconds() === 0) {
            ringAlarm();
        }
    }

    function ringAlarm() {
        state.alarmActive = false;
        updateAlarmStatus();

        updateStatus('completed');
        elements.timeDisplay.classList.remove('pulse', 'warning', 'danger');

        playTone(state.selectedTone);
        showCompletionMessage();
        showCelebrationPhoto('⏰ Wake up! Your alarm is ringing.');
        createConfetti();
        createFloatingCelebration();
    }

    /* ---------------- Ringtones ---------------- */

    function onToneChange() {
        state.selectedTone = parseInt(elements.toneSelect.value, 10) || 0;
        saveSetting('zenfocus_tone', String(state.selectedTone));
    }

    function playTone(index) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const toneFunctions = [playChime, playPiano, playBell, playWaves, playFanfare];
            const fn = toneFunctions[index] || playChime;
            fn(audioContext);
        } catch (e) {
            console.log('Audio context not available, falling back to beep');
            createWebAudioBeep();
        }
    }

    function scheduleNote(audioContext, freq, startOffset, duration, type, peakGain) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = type || 'sine';
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + startOffset);

        const start = audioContext.currentTime + startOffset;
        gainNode.gain.setValueAtTime(0.0001, start);
        gainNode.gain.exponentialRampToValueAtTime(peakGain || 0.3, start + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.05);
    }

    function playChime(audioContext) {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            scheduleNote(audioContext, freq, i * 0.15, 0.6, 'sine', 0.3);
        });
    }

    function playPiano(audioContext) {
        const notes = [392.00, 493.88, 587.33, 783.99];
        notes.forEach((freq, i) => {
            scheduleNote(audioContext, freq, i * 0.18, 0.7, 'triangle', 0.32);
        });
    }

    function playBell(audioContext) {
        scheduleNote(audioContext, 880, 0, 1.2, 'sine', 0.35);
        scheduleNote(audioContext, 1318.51, 0.02, 1.0, 'sine', 0.2);
        scheduleNote(audioContext, 1760, 0.04, 0.8, 'sine', 0.12);
    }

    function playWaves(audioContext) {
        const duration = 2.4;
        for (let i = 0; i < 4; i++) {
            const start = i * 0.6;
            scheduleNote(audioContext, 220 + i * 30, start, 0.6, 'sine', 0.18);
            scheduleNote(audioContext, 330 + i * 30, start + 0.1, 0.55, 'sine', 0.12);
        }
    }

    function playFanfare(audioContext) {
        const notes = [523.25, 523.25, 523.25, 698.46, 880];
        const offsets = [0, 0.15, 0.3, 0.5, 0.75];
        const durations = [0.18, 0.18, 0.18, 0.25, 0.6];
        notes.forEach((freq, i) => {
            scheduleNote(audioContext, freq, offsets[i], durations[i], 'square', 0.18);
        });
    }

    function createWebAudioBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3);
            oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.45);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.8);
        } catch (e) {
            console.log('Audio context not available');
        }
    }

    /* ---------------- Celebration Photo ---------------- */

    function onPhotoChange(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            state.celebrationPhoto = evt.target.result;
            saveSetting('zenfocus_photo', state.celebrationPhoto);
            elements.btnClearPhoto.hidden = false;
        };
        reader.readAsDataURL(file);
    }

    function clearPhoto() {
        state.celebrationPhoto = null;
        elements.photoInput.value = '';
        elements.btnClearPhoto.hidden = true;
        saveSetting('zenfocus_photo', '');
    }

    function showCelebrationPhoto(text) {
        if (!state.celebrationPhoto) {
            elements.celebrationPhotoImg.hidden = true;
            return;
        }
        elements.celebrationPhotoImg.src = state.celebrationPhoto;
        elements.celebrationPhotoImg.hidden = false;
        elements.celebrationPhotoText.textContent = text || 'Great Job!';
        elements.celebrationPhotoOverlay.hidden = false;
    }

    function closeCelebrationPhoto() {
        elements.celebrationPhotoOverlay.hidden = true;
        elements.celebrationPhotoImg.src = '';
        elements.celebrationPhotoImg.hidden = true;
    }

    /* ---------------- World Clock ---------------- */

    function renderWorldClocks() {
        elements.worldClockList.innerHTML = '';

        if (!state.clocks.length) {
            const empty = document.createElement('p');
            empty.className = 'world-clock-empty';
            empty.textContent = 'No clocks added. Tap ＋ to add a city.';
            elements.worldClockList.appendChild(empty);
            return;
        }

        state.clocks.forEach(clock => {
            const item = document.createElement('div');
            item.className = 'world-clock-item';

            const info = document.createElement('div');
            info.className = 'world-clock-info';

            const name = document.createElement('span');
            name.className = 'world-clock-name';
            name.textContent = clock.label;

            const time = document.createElement('span');
            time.className = 'world-clock-time';
            time.id = `clock-time-${clock.id}`;

            const date = document.createElement('span');
            date.className = 'world-clock-date';
            date.id = `clock-date-${clock.id}`;

            info.appendChild(name);
            info.appendChild(time);
            info.appendChild(date);

            const remove = document.createElement('button');
            remove.className = 'world-clock-remove';
            remove.type = 'button';
            remove.setAttribute('aria-label', `Remove ${clock.label} clock`);
            remove.textContent = '✕';
            remove.addEventListener('click', () => removeWorldClock(clock.id));

            item.appendChild(info);
            item.appendChild(remove);
            elements.worldClockList.appendChild(item);
        });

        updateWorldClocks();
    }

    function updateWorldClocks() {
        const now = new Date();
        state.clocks.forEach(clock => {
            const timeEl = document.getElementById(`clock-time-${clock.id}`);
            const dateEl = document.getElementById(`clock-date-${clock.id}`);
            if (!timeEl || !dateEl) return;

            try {
                const timeStr = new Intl.DateTimeFormat([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: clock.timeZone
                }).format(now);

                const dateStr = new Intl.DateTimeFormat([], {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    timeZone: clock.timeZone
                }).format(now);

                timeEl.textContent = timeStr;
                dateEl.textContent = dateStr;
            } catch (e) {
                timeEl.textContent = '—';
                dateEl.textContent = clock.timeZone;
            }
        });
    }

    function startWorldClock() {
        if (state.clockInterval) clearInterval(state.clockInterval);
        state.clockInterval = setInterval(updateWorldClocks, 1000);
    }

    function addWorldClock() {
        const label = prompt('Enter a city name (e.g. Paris):');
        if (!label) return;
        const timeZone = prompt('Enter a time zone (e.g. Europe/Paris):', Intl.DateTimeFormat().resolvedOptions().timeZone);
        if (!timeZone) return;

        const id = Date.now();
        state.clocks.push({ id, label: label.trim(), timeZone: timeZone.trim() });
        saveClocks();
        renderWorldClocks();
    }

    function removeWorldClock(id) {
        state.clocks = state.clocks.filter(c => c.id !== id);
        saveClocks();
        renderWorldClocks();
    }

    function saveClocks() {
        saveSetting('zenfocus_clocks', JSON.stringify(state.clocks));
    }

    /* ---------------- Effects ---------------- */

    function createConfetti() {
        const colors = ['#f8a8c4', '#c4a8f8', '#a8f8d0', '#f8e0a8', '#a8d0f8', '#f8c4a8'];
        const shapes = ['●', '◆', '■', '▲', '★', '♥'];
        const pieceCount = 80;

        for (let i = 0; i < pieceCount; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.color = colors[Math.floor(Math.random() * colors.length)];
            piece.style.fontSize = `${Math.random() * 16 + 12}px`;
            piece.style.animationDelay = `${Math.random() * 0.5}s`;
            piece.style.animationDuration = `${Math.random() * 1.5 + 2}s`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;

            elements.confettiContainer.appendChild(piece);

            setTimeout(() => {
                piece.remove();
            }, 4000);
        }
    }

    function createFloatingCelebration() {
        const celebrationEmojis = ['🎉', '✨', '🌟', '🎊', '🌸', '🌿', '💫', '🦋'];
        const count = 20;

        for (let i = 0; i < count; i++) {
            const emoji = document.createElement('div');
            emoji.className = 'floating-emoji';
            emoji.textContent = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
            emoji.style.left = `${Math.random() * 100}%`;
            emoji.style.top = '100%';
            emoji.style.fontSize = `${Math.random() * 20 + 20}px`;
            emoji.style.animation = `celebration-float ${Math.random() * 2 + 3}s ease-out forwards`;
            emoji.style.animationDelay = `${Math.random() * 0.5}s`;

            document.body.appendChild(emoji);

            setTimeout(() => emoji.remove(), 5000);
        }
    }

    function createFloatingEmojis() {
        const count = 15;

        for (let i = 0; i < count; i++) {
            const emoji = document.createElement('span');
            emoji.className = 'bg-emoji';
            emoji.textContent = floatingEmojiPool[Math.floor(Math.random() * floatingEmojiPool.length)];
            emoji.style.left = `${Math.random() * 100}%`;
            emoji.style.top = `${Math.random() * 100}%`;
            emoji.style.fontSize = `${Math.random() * 24 + 16}px`;
            emoji.style.animationDelay = `${Math.random() * 20}s`;
            emoji.style.animationDuration = `${Math.random() * 20 + 20}s`;
            emoji.style.opacity = `${Math.random() * 0.3 + 0.1}`;

            elements.floatingEmojis.appendChild(emoji);
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes celebration-float {
            0% {
                transform: translateY(0) rotate(0deg) scale(1);
                opacity: 1;
            }
            100% {
                transform: translateY(-120vh) rotate(720deg) scale(0);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { init };
    }
})();
