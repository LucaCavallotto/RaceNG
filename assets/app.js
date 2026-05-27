let units = 'metric'; // fixed

// Utilities
const round = (x, d = 2) => Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : NaN;
const num = id => parseFloat(document.getElementById(id).value);
const val = id => document.getElementById(id).value;

const showGrid = id => document.getElementById(id).style.display = 'grid';
const hide = id => document.getElementById(id).style.display = 'none';
const showBlock = id => document.getElementById(id).style.display = 'block';
const showResult = (id, html) => { const el = document.getElementById(id); el.style.display = 'block'; el.innerHTML = html };
const hideResult = id => { const el = document.getElementById(id); el.style.display = 'none'; el.innerHTML = '' };

const calcBrakeDuctDelta = (before, after) => {
    if (Number.isNaN(before) || Number.isNaN(after)) return 0;
    let delta = 0;
    const start = Math.min(before, after);
    const end = Math.max(before, after);
    const sign = after >= before ? 1 : -1;
    for (let i = start; i < end; i++) {
        if (i === 2) {
            delta += 0.3; // step between 2 and 3
        } else {
            delta += 0.2; // all other steps
        }
    }
    return sign * delta;
};

// Header title/desc per tab
const pageTitle = document.getElementById('pageTitle');
const pageDesc = document.getElementById('pageDesc');
function setHeaderFor(tab) {
    if (tab === 'tab-fuel') {
        pageTitle.textContent = 'Fuel Calculator';
        pageDesc.textContent = 'Calculate fuel requirements for your race. Use Basic for fixed laps, Normal for time-based, or Pro for full strategy with pitstops.';
    } else if (tab === 'tab-temp') {
        pageTitle.textContent = 'Tyre Pressures Calculator';
        pageDesc.textContent = 'Input current cold pressures and ambient temperature before/after, brake duct settings before/after, or both to estimate adjusted pressures.';
    }
}

// Tabs logic
const tabs = [
    { btn: 'tab-fuel', panel: 'panel-fuel', col: 'col-fuel' },
    { btn: 'tab-temp', panel: 'panel-temp', col: 'col-temp' }
];

function activateTab(key) {
    tabs.forEach(t => {
        const btn = document.getElementById(t.btn);
        const panel = document.getElementById(t.panel);
        const col = document.querySelector(`[id="${t.col}"]`) || document.getElementById(t.panel).parentElement;
        const isActive = t.btn === key;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
        if (isActive) {
            col.classList.remove('inactive-panel');
            panel.style.display = 'block';
            panel.focus({ preventScroll: true });
        } else {
            col.classList.add('inactive-panel');
            panel.style.display = 'none';
        }
    });
    setHeaderFor(key);
    hide('fuel-copy-container');
    hide('temp-copy-container');
    hide('fuel-laps-summary');
    updateInputErrors(); // Validate inputs when switching tabs
}

tabs.forEach(t => { document.getElementById(t.btn).addEventListener('click', () => activateTab(t.btn)); });

// Init header labels
setHeaderFor('tab-fuel');

// ========== FUEL MODE SYSTEM (3 modes: basic / normal / pro) ==========
const basicBtn = document.getElementById('mode-basic');
const normalBtn = document.getElementById('mode-normal');
const proBtn = document.getElementById('mode-pro');
const basicForm = document.getElementById('fuel-form-basic');
const normalForm = document.getElementById('fuel-form-normal');
const proForm = document.getElementById('fuel-form-pro');

let currentFuelMode = 'normal';

function getActiveFuelMode() { return currentFuelMode; }

function setMode(mode) {
    currentFuelMode = mode;
    const modes = [
        { key: 'basic', btn: basicBtn, form: basicForm },
        { key: 'normal', btn: normalBtn, form: normalForm },
        { key: 'pro', btn: proBtn, form: proForm }
    ];
    modes.forEach(m => {
        const isActive = m.key === mode;
        m.btn.setAttribute('aria-pressed', String(isActive));
        m.form.style.display = isActive ? '' : 'none';
        m.form.setAttribute('aria-hidden', String(!isActive));
    });
    // Hide results when switching mode
    hide('fuel-callout');
    hide('pitstop-grid');
    hide('fuel-copy-container');
    hide('fuel-laps-summary');
    hideResult('outFuel');
    hide('fuel-result-card');
    updateInputErrors();
}

basicBtn.addEventListener('click', () => setMode('basic'));
normalBtn.addEventListener('click', () => setMode('normal'));
proBtn.addEventListener('click', () => setMode('pro'));

// Initialize default fuel mode
setMode('normal');

// ========== SESSION STORAGE ==========
function saveInputsToStorage() {
    const mode = getActiveFuelMode();
    sessionStorage.setItem('fuelMode', mode);

    // Save all input values
    allFuelInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
            sessionStorage.setItem(`input_${id}`, el.checked);
        } else {
            sessionStorage.setItem(`input_${id}`, el.value);
        }
    });

    // Save temp inputs
    const tempInputs = readTempInputs();
    const tempData = {
        pFR: tempInputs.pFR, pFL: tempInputs.pFL, pRL: tempInputs.pRL, pRR: tempInputs.pRR,
        tBefore: tempInputs.tBefore, tAfter: tempInputs.tAfter,
        bdFBefore: tempInputs.bdFBefore, bdFAfter: tempInputs.bdFAfter,
        bdRBefore: tempInputs.bdRBefore, bdRAfter: tempInputs.bdRAfter
    };
    Object.entries(tempData).forEach(([key, value]) => sessionStorage.setItem(`input_${key}`, value));
}

function loadInputsFromStorage() {
    // Load fuel mode
    const savedMode = sessionStorage.getItem('fuelMode');
    if (savedMode && ['basic', 'normal', 'pro'].includes(savedMode)) {
        setMode(savedMode);
    }

    // Load all input fields
    const fields = [
        ...allFuelInputIds.filter(id => id !== 'includeFormation' && id !== 'includeCooldown'),
        'pFR', 'pFL', 'pRL', 'pRR', 'tBefore', 'tAfter',
        'bdFBefore', 'bdFAfter', 'bdRBefore', 'bdRAfter'
    ];
    fields.forEach(id => {
        const value = sessionStorage.getItem(`input_${id}`);
        if (value !== null && document.getElementById(id)) document.getElementById(id).value = value;
    });
    ['includeFormation', 'includeCooldown'].forEach(id => {
        const value = sessionStorage.getItem(`input_${id}`);
        if (value !== null && document.getElementById(id)) document.getElementById(id).checked = value === 'true';
    });
    updateInputErrors();
}

// ========== INPUT READING ==========
function readFuelInputs() {
    const mode = getActiveFuelMode();
    const read = (id, def = 0) => { const el = document.getElementById(id); if (!el) return def; const v = parseFloat(el.value); return isNaN(v) ? def : v; };

    if (mode === 'basic') {
        return {
            mode: 'basic',
            fixedLaps: read('lapsFixed_b'),
            fuelLap: read('fuelLap_b'),
            // Defaults for unused fields
            raceH: 0, raceM: 0, lapM: 0, lapS: 0,
            safetyMargin: 0, tank: 0,
            includeFormation: false, includeCooldown: false, mandStops: 0
        };
    } else if (mode === 'normal') {
        return {
            mode: 'normal',
            raceH: read('raceH'), raceM: read('raceM'),
            lapM: read('lapM'), lapS: read('lapS'),
            fuelLap: read('fuelLap'),
            safetyMargin: read('safetyMargin', 5),
            // Defaults for unused fields
            fixedLaps: 0, tank: 0,
            includeFormation: false, includeCooldown: false, mandStops: 0
        };
    } else { // pro
        return {
            mode: 'pro',
            raceH: read('raceH_p'), raceM: read('raceM_p'),
            lapM: read('lapM_p'), lapS: read('lapS_p'),
            fuelLap: read('fuelLap_p'),
            tank: read('tank_p'),
            mandStops: parseInt(val('mandStops')) || 0,
            safetyMargin: read('safetyMargin_p', 5),
            includeFormation: document.getElementById('includeFormation').checked,
            includeCooldown: document.getElementById('includeCooldown').checked,
            fixedLaps: 0
        };
    }
}

// ========== VALIDATION ==========
function validateFuelInputs() {
    const inp = readFuelInputs();
    const errors = {};

    if (inp.mode === 'basic') {
        if (Number.isNaN(inp.fixedLaps) || inp.fixedLaps <= 0) errors.lapsFixed_b = 'Must be positive';
        if (Number.isNaN(inp.fuelLap) || inp.fuelLap <= 0) errors.fuelLap_b = 'Must be positive';
        return errors;
    }

    if (inp.mode === 'normal') {
        // Race time
        if (Number.isNaN(inp.raceH) || inp.raceH < 0) errors.raceH = 'Must be non-negative';
        if (Number.isNaN(inp.raceM) || inp.raceM < 0) errors.raceM = 'Must be non-negative';
        // Lap time
        if (Number.isNaN(inp.lapM) || inp.lapM < 0) errors.lapM = 'Must be non-negative';
        if (Number.isNaN(inp.lapS) || inp.lapS < 0) errors.lapS = 'Must be non-negative';
        // Fuel
        if (Number.isNaN(inp.fuelLap) || inp.fuelLap <= 0) errors.fuelLap = 'Must be positive';
        // Safety margin
        if (Number.isNaN(inp.safetyMargin) || inp.safetyMargin < 0) errors.safetyMargin = 'Must be non-negative';
        // Must have valid race + lap time
        const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
        const lapSeconds = (inp.lapM * 60) + inp.lapS;
        if (raceSeconds <= 0) {
            errors.raceH = errors.raceM = 'Enter race time';
        }
        if (lapSeconds <= 0) {
            errors.lapM = errors.lapS = 'Enter lap time';
        }
        return errors;
    }

    // Pro mode
    if (Number.isNaN(inp.raceH) || inp.raceH < 0) errors.raceH_p = 'Must be non-negative';
    if (Number.isNaN(inp.raceM) || inp.raceM < 0) errors.raceM_p = 'Must be non-negative';
    if (Number.isNaN(inp.lapM) || inp.lapM < 0) errors.lapM_p = 'Must be non-negative';
    if (Number.isNaN(inp.lapS) || inp.lapS < 0) errors.lapS_p = 'Must be non-negative';
    if (Number.isNaN(inp.fuelLap) || inp.fuelLap <= 0) errors.fuelLap_p = 'Must be positive';
    if (Number.isNaN(inp.tank) || inp.tank <= 0) errors.tank_p = 'Must be positive';
    if (Number.isNaN(inp.mandStops) || inp.mandStops < 0) errors.mandStops = 'Must be non-negative';
    if (Number.isNaN(inp.safetyMargin) || inp.safetyMargin < 0) errors.safetyMargin_p = 'Must be non-negative';

    const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
    const lapSeconds = (inp.lapM * 60) + inp.lapS;
    if (raceSeconds <= 0) {
        errors.raceH_p = errors.raceM_p = 'Enter race time';
    }
    if (lapSeconds <= 0) {
        errors.lapM_p = errors.lapS_p = 'Enter lap time';
    }

    return errors;
}

function validateTempInputs() {
    const inp = readTempInputs();
    const errors = {};

    if (Number.isNaN(inp.pFR) || inp.pFR <= 0) errors.pFR = 'Must be positive';
    if (Number.isNaN(inp.pFL) || inp.pFL <= 0) errors.pFL = 'Must be positive';
    if (Number.isNaN(inp.pRL) || inp.pRL <= 0) errors.pRL = 'Must be positive';
    if (Number.isNaN(inp.pRR) || inp.pRR <= 0) errors.pRR = 'Must be positive';

    const isFieldEmpty = id => document.getElementById(id).value.trim() === '';
    const tBeforeEmpty = isFieldEmpty('tBefore');
    const tAfterEmpty = isFieldEmpty('tAfter');
    const bdFBeforeEmpty = isFieldEmpty('bdFBefore');
    const bdFAfterEmpty = isFieldEmpty('bdFAfter');
    const bdRBeforeEmpty = isFieldEmpty('bdRBefore');
    const bdRAfterEmpty = isFieldEmpty('bdRAfter');

    if (!tBeforeEmpty || !tAfterEmpty) {
        if (tBeforeEmpty) errors.tBefore = 'Must be filled';
        else if (Number.isNaN(inp.tBefore)) errors.tBefore = 'Must be a valid number';

        if (tAfterEmpty) errors.tAfter = 'Must be filled';
        else if (Number.isNaN(inp.tAfter)) errors.tAfter = 'Must be a valid number';
    }

    if (!bdFBeforeEmpty || !bdFAfterEmpty) {
        if (bdFBeforeEmpty) errors.bdFBefore = 'Must be filled';
        else if (Number.isNaN(inp.bdFBefore) || inp.bdFBefore < 0) errors.bdFBefore = 'Must be non-negative';

        if (bdFAfterEmpty) errors.bdFAfter = 'Must be filled';
        else if (Number.isNaN(inp.bdFAfter) || inp.bdFAfter < 0) errors.bdFAfter = 'Must be non-negative';
    }

    if (!bdRBeforeEmpty || !bdRAfterEmpty) {
        if (bdRBeforeEmpty) errors.bdRBefore = 'Must be filled';
        else if (Number.isNaN(inp.bdRBefore) || inp.bdRBefore < 0) errors.bdRBefore = 'Must be non-negative';

        if (bdRAfterEmpty) errors.bdRAfter = 'Must be filled';
        else if (Number.isNaN(inp.bdRAfter) || inp.bdRAfter < 0) errors.bdRAfter = 'Must be non-negative';
    }

    if (tBeforeEmpty && tAfterEmpty && bdFBeforeEmpty && bdFAfterEmpty && bdRBeforeEmpty && bdRAfterEmpty) {
        errors.tBefore = 'Provide Temp or BD change';
        errors.bdFBefore = 'Provide Temp or BD change';
        errors.bdRBefore = 'Provide Temp or BD change';
    }

    return errors;
}

// ========== ERROR DISPLAY ==========
function updateInputErrors() {
    const activeTab = tabs.find(t => document.getElementById(t.btn).classList.contains('active')).btn;
    let errors = {};

    if (activeTab === 'tab-fuel') {
        errors = validateFuelInputs();
        const mode = getActiveFuelMode();
        let fields;
        if (mode === 'basic') {
            fields = ['lapsFixed_b', 'fuelLap_b'];
        } else if (mode === 'normal') {
            fields = ['raceH', 'raceM', 'lapM', 'lapS', 'fuelLap', 'safetyMargin'];
        } else {
            fields = ['raceH_p', 'raceM_p', 'lapM_p', 'lapS_p', 'fuelLap_p', 'tank_p', 'mandStops', 'safetyMargin_p'];
        }
        fields.forEach(id => {
            const input = document.getElementById(id);
            const errorEl = document.getElementById(`error-${id}`);
            if (!input || !errorEl) return;
            if (errors[id]) {
                input.parentElement.classList.add('input-error');
                errorEl.textContent = errors[id];
                errorEl.classList.add('show');
            } else {
                input.parentElement.classList.remove('input-error');
                errorEl.textContent = '';
                errorEl.classList.remove('show');
            }
        });
        document.getElementById('btnFuel').disabled = Object.keys(errors).length > 0;
    } else if (activeTab === 'tab-temp') {
        errors = validateTempInputs();
        const fields = ['pFR', 'pFL', 'pRL', 'pRR', 'tBefore', 'tAfter', 'bdFBefore', 'bdFAfter', 'bdRBefore', 'bdRAfter'];
        fields.forEach(id => {
            const input = document.getElementById(id);
            const errorEl = document.getElementById(`error-${id}`);
            if (errors[id]) {
                input.parentElement.classList.add('input-error');
                errorEl.textContent = errors[id];
                errorEl.classList.add('show');
            } else {
                input.parentElement.classList.remove('input-error');
                errorEl.textContent = '';
                errorEl.classList.remove('show');
            }
        });
        document.getElementById('btnTemp').disabled = Object.keys(errors).length > 0;
    }
}

// ========== TEMP CALC INPUT READING ==========
function readTempInputs() {
    const getVal = id => {
        const raw = document.getElementById(id).value;
        return raw.trim() === '' ? NaN : parseFloat(raw);
    };
    return {
        pFR: num('pFR'), pFL: num('pFL'), pRL: num('pRL'), pRR: num('pRR'),
        tBefore: getVal('tBefore'), tAfter: getVal('tAfter'),
        bdFBefore: getVal('bdFBefore'), bdFAfter: getVal('bdFAfter'),
        bdRBefore: getVal('bdRBefore'), bdRAfter: getVal('bdRAfter')
    };
}

function fuelDisplay(liters) { return round(liters, 2); }

// ========== FUEL CALCULATION ==========
function calcFuel() {
    const inp = readFuelInputs();
    const mode = inp.mode;
    const pitstopGrid = document.getElementById('pitstop-grid');
    const marginNote = document.getElementById('margin-note');

    // Validate
    const errors = validateFuelInputs();
    if (Object.keys(errors).length > 0) {
        hide('pitstop-grid');
        hide('fuel-callout');
        hide('fuel-copy-container');
        hide('fuel-laps-summary');
        showBlock('fuel-result-card');
        showResult('outFuel', '❌ <span class="err">Please correct invalid inputs.</span>');
        return;
    }

    const fuelLapL = inp.fuelLap;
    const safetyFactor = 1 + (inp.safetyMargin / 100);

    // Clear previous pitstop grid
    pitstopGrid.innerHTML = '';
    hide('pitstop-grid');

    if (mode === 'basic') {
        // ===== BASIC MODE: laps × fuel/lap =====
        const totalFuelL = inp.fixedLaps * fuelLapL;
        document.getElementById('start-fuel').textContent = fuelDisplay(totalFuelL).toFixed(1);
        document.getElementById('fuel-laps-count').textContent = inp.fixedLaps;
        marginNote.textContent = '';
        showBlock('fuel-laps-summary');
        showBlock('fuel-callout');

    } else if (mode === 'normal') {
        // ===== NORMAL MODE: time-based with safety margin =====
        const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
        const lapSeconds = (inp.lapM * 60) + inp.lapS;
        const raceLaps = Math.ceil(raceSeconds / lapSeconds);
        const totalFuelL = raceLaps * fuelLapL * safetyFactor;

        document.getElementById('start-fuel').textContent = fuelDisplay(totalFuelL).toFixed(1);
        document.getElementById('fuel-laps-count').textContent = raceLaps;
        marginNote.textContent = inp.safetyMargin > 0 ? `Includes ${inp.safetyMargin}% safety margin` : '';
        showBlock('fuel-laps-summary');
        showBlock('fuel-callout');

    } else {
        // ===== PRO MODE: full strategy with optimal pitstop planning =====
        hide('fuel-callout');
        const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
        const lapSeconds = (inp.lapM * 60) + inp.lapS;
        const raceLaps = Math.ceil(raceSeconds / lapSeconds);

        // Total laps including formation/cooldown
        let totalLaps = raceLaps;
        if (inp.includeFormation) totalLaps += 1;
        if (inp.includeCooldown) totalLaps += 1;

        // Total fuel needed (with safety margin)
        const totalFuelL = totalLaps * fuelLapL * safetyFactor;
        const tankL = inp.tank;

        document.getElementById('fuel-laps-count').textContent = totalLaps;
        showBlock('fuel-laps-summary');

        const stints = [];
        let lapCounter = inp.includeFormation ? 1 : 0; // Formation lap counted at start

        if (inp.mandStops === 0) {
            // === CASE 1: No mandatory pitstops (greedy maximum stint capacity) ===
            const maxLapsPerStint = Math.floor(tankL / (fuelLapL * safetyFactor));
            const safeMaxLaps = Math.max(1, maxLapsPerStint);

            let remainingLaps = totalLaps;
            let stintIndex = 0;

            while (remainingLaps > 0) {
                // If remaining laps fit in the tank, it's the last stint
                if (remainingLaps * fuelLapL * safetyFactor <= tankL) {
                    const stintLaps = remainingLaps;
                    const stintFuel = round(stintLaps * fuelLapL * safetyFactor, 2);
                    stints.push({
                        index: stintIndex,
                        laps: stintLaps,
                        fuel: stintFuel,
                        startLap: lapCounter + 1,
                        endLap: lapCounter + stintLaps
                    });
                    lapCounter += stintLaps;
                    remainingLaps = 0;
                } else {
                    // Fill tank to 100% capacity (safeMaxLaps)
                    const stintLaps = safeMaxLaps;
                    const stintFuel = tankL;
                    stints.push({
                        index: stintIndex,
                        laps: stintLaps,
                        fuel: stintFuel,
                        startLap: lapCounter + 1,
                        endLap: lapCounter + stintLaps
                    });
                    lapCounter += stintLaps;
                    remainingLaps -= stintLaps;
                }
                stintIndex++;
            }
        } else {
            // === CASE 2: With mandatory pitstops (equally splitting fuel under tank capacity) ===
            const maxLapsPerStint = Math.floor(tankL / (fuelLapL * safetyFactor));
            const safeMaxLaps = Math.max(1, maxLapsPerStint);
            const minStintsFromFuel = Math.ceil(totalLaps / safeMaxLaps);
            const minStopsFromFuel = minStintsFromFuel - 1;
            const actualStops = Math.max(inp.mandStops, minStopsFromFuel);
            const numStints = actualStops + 1;

            // Distribute laps evenly across stints
            const baseLaps = Math.floor(totalLaps / numStints);
            const remainder = totalLaps % numStints;

            for (let i = 0; i < numStints; i++) {
                const stintLaps = baseLaps + (i < remainder ? 1 : 0);
                const stintFuel = round(stintLaps * fuelLapL * safetyFactor, 2);
                const cappedFuel = Math.min(stintFuel, tankL);

                stints.push({
                    index: i,
                    laps: stintLaps,
                    fuel: cappedFuel,
                    startLap: lapCounter + 1,
                    endLap: lapCounter + stintLaps
                });

                lapCounter += stintLaps;
            }
        }

        // Generate stint cards
        for (let i = 0; i < stints.length; i++) {
            const s = stints[i];
            const card = document.createElement('div');
            card.className = 'pitstop-card';
            const stintLabel = `Stint ${i + 1} · Laps ${s.startLap}–${s.endLap}`;
            card.innerHTML = `
                <strong>${fuelDisplay(s.fuel)} <span class="unit-inline" data-u="volume">L</span></strong>
                <div class="text-uppercase small" style="color:var(--muted)">${stintLabel}</div>
            `;
            pitstopGrid.appendChild(card);
        }

        // Total fuel summary card
        const totalCard = document.createElement('div');
        totalCard.className = 'pitstop-card total-fuel';
        totalCard.innerHTML = `
            <strong>${fuelDisplay(totalFuelL)} <span class="unit-inline" data-u="volume">L</span></strong>
            <div class="text-uppercase small" style="color:var(--muted)">Total Fuel${inp.safetyMargin > 0 ? ` (+${inp.safetyMargin}% margin)` : ''}</div>
        `;
        pitstopGrid.appendChild(totalCard);

        showGrid('pitstop-grid');
    }

    // Clear errors
    hideResult('outFuel');
    showBlock('fuel-copy-container');
    showBlock('fuel-result-card');

    // Trigger entrance animation
    const callout = document.getElementById('fuel-callout');
    if (callout) { callout.classList.remove('animate-in'); void callout.offsetWidth; callout.classList.add('animate-in'); }
}

// ========== TEMP → PRESSURE CALCULATION ==========
function calcTemp() {
    const inp = readTempInputs();

    // Should be validated by button disable, but double-check
    const errors = validateTempInputs();
    if (Object.keys(errors).length > 0) {
        hide('temp-wrap');
        hide('temp-copy-container');
        showBlock('temp-result-card');
        showResult('outTemp', '❌ <span class="err">Please correct invalid inputs.</span>');
        return;
    }

    // 1. Temp adjustment
    let dP_temp = 0;
    if (!Number.isNaN(inp.tBefore) && !Number.isNaN(inp.tAfter)) {
        const dT = inp.tAfter - inp.tBefore;
        dP_temp = -0.1 * dT;
    }

    // 2. Front Brake duct adjustment
    let dP_bdF = 0;
    if (!Number.isNaN(inp.bdFBefore) && !Number.isNaN(inp.bdFAfter)) {
        dP_bdF = calcBrakeDuctDelta(inp.bdFBefore, inp.bdFAfter);
    }

    // 3. Rear Brake duct adjustment
    let dP_bdR = 0;
    if (!Number.isNaN(inp.bdRBefore) && !Number.isNaN(inp.bdRAfter)) {
        dP_bdR = calcBrakeDuctDelta(inp.bdRBefore, inp.bdRAfter);
    }

    const correctedFL = round(inp.pFL + dP_temp + dP_bdF, 2);
    const correctedFR = round(inp.pFR + dP_temp + dP_bdF, 2);
    const correctedRL = round(inp.pRL + dP_temp + dP_bdR, 2);
    const correctedRR = round(inp.pRR + dP_temp + dP_bdR, 2);

    // Update tyres
    document.getElementById('tp-fl').textContent = correctedFL.toFixed(2);
    document.getElementById('tp-fr').textContent = correctedFR.toFixed(2);
    document.getElementById('tp-rl').textContent = correctedRL.toFixed(2);
    document.getElementById('tp-rr').textContent = correctedRR.toFixed(2);

    hideResult('outTemp');
    showGrid('temp-wrap');
    showGrid('temp-tyre-grid');
    showBlock('temp-copy-container');
    showBlock('temp-result-card');

    // Trigger entrance animation
    const tyreGrid = document.getElementById('temp-tyre-grid');
    if (tyreGrid) { tyreGrid.classList.remove('animate-in'); void tyreGrid.offsetWidth; tyreGrid.classList.add('animate-in'); }
}

// ========== INPUT LISTENERS ==========
const allFuelInputIds = [
    // Basic
    'lapsFixed_b', 'fuelLap_b',
    // Normal
    'raceH', 'raceM', 'lapM', 'lapS', 'fuelLap', 'safetyMargin',
    // Pro
    'raceH_p', 'raceM_p', 'lapM_p', 'lapS_p', 'fuelLap_p', 'tank_p', 'mandStops', 'safetyMargin_p',
    'includeFormation', 'includeCooldown'
];

const allTempInputIds = [
    'pFR', 'pFL', 'pRL', 'pRR', 'tBefore', 'tAfter',
    'bdFBefore', 'bdFAfter', 'bdRBefore', 'bdRAfter'
];

const allInputIds = [...allFuelInputIds, ...allTempInputIds];

allInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            updateInputErrors();
            saveInputsToStorage();
        });
    }
});

// ========== BUTTON HANDLERS ==========
document.getElementById('btnFuel').addEventListener('click', calcFuel);

document.getElementById('btnFuelReset').addEventListener('click', () => {
    // Clear all fuel inputs across all modes except checkboxes and safety margins
    allFuelInputIds.filter(id => id !== 'includeFormation' && id !== 'includeCooldown' && id !== 'safetyMargin' && id !== 'safetyMargin_p').forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const sm = document.getElementById('safetyMargin'); if (sm) sm.value = '5';
    const smp = document.getElementById('safetyMargin_p'); if (smp) smp.value = '5';
    const f = document.getElementById('includeFormation'); if (f) f.checked = true;
    const c = document.getElementById('includeCooldown'); if (c) c.checked = true;
    document.getElementById('start-fuel').textContent = '0.0';
    document.getElementById('margin-note').textContent = '';
    hide('pitstop-grid');
    hide('fuel-callout');
    hide('fuel-copy-container');
    hide('fuel-laps-summary');
    hideResult('outFuel');
    hide('fuel-result-card');
    allInputIds.forEach(id => sessionStorage.removeItem(`input_${id}`));
    sessionStorage.removeItem('fuelMode');
    updateInputErrors();
});

document.getElementById('btnTemp').addEventListener('click', calcTemp);
document.getElementById('btnTempReset').addEventListener('click', () => {
    ['pFL', 'pFR', 'pRL', 'pRR', 'tBefore', 'tAfter', 'bdFBefore', 'bdFAfter', 'bdRBefore', 'bdRAfter'].forEach(id => document.getElementById(id).value = '');
    hide('temp-wrap'); hideResult('outTemp');
    hide('temp-copy-container');
    hide('temp-result-card');
    allInputIds.forEach(id => sessionStorage.removeItem(`input_${id}`));
    updateInputErrors();
});

// ========== NAVBAR BEHAVIOR ==========
// Auto-collapse hamburger when selecting a nav item
(function () {
    const navCollapseEl = document.getElementById('primaryNav');
    if (!navCollapseEl) return;
    const bsCollapse = new bootstrap.Collapse(navCollapseEl, { toggle: false });
    navCollapseEl.addEventListener('click', (e) => {
        const clickedItem = e.target.closest('.nav-link');
        if (clickedItem && window.getComputedStyle(navCollapseEl).display !== 'none') {
            bsCollapse.hide();
        }
    });
})();

// Navbar mobile overlay: compute height and update CSS var
(function () {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    function setNavH() {
        const h = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--navH', `${Math.round(h)}px`);
    }
    window.addEventListener('load', setNavH);
    window.addEventListener('resize', setNavH);
    window.addEventListener('orientationchange', setNavH);
    setNavH();
})();

// Toggle class to hide navbar border when overlay menu is open
(function () {
    const nav = document.querySelector('.navbar');
    const collapseEl = document.getElementById('primaryNav');
    if (!nav || !collapseEl) return;
    collapseEl.addEventListener('show.bs.collapse', () => nav.classList.add('overlay-open'));
    collapseEl.addEventListener('hidden.bs.collapse', () => nav.classList.remove('overlay-open'));
})();

// ========== COPY TO CLIPBOARD ==========
function copyToClipboard(text, buttonId) {
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(buttonId);
        const span = btn.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copied!';
        btn.style.borderColor = 'var(--brand)';
        setTimeout(() => {
            span.textContent = originalText;
            btn.style.borderColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function getFuelCopyText() {
    const inp = readFuelInputs();
    const mode = inp.mode;
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let text = `RACETECH ASSISTANT - FUEL STRATEGY\nDate: ${dateStr}\n\n`;
    
    text += `INPUTS:\n`;
    if (mode === 'basic') {
        text += `- Mode: Basic\n`;
        text += `- Fixed Laps: ${inp.fixedLaps}\n`;
        text += `- Fuel per Lap: ${inp.fuelLap.toFixed(2)} L\n\n`;
        
        const totalFuel = inp.fixedLaps * inp.fuelLap;
        text += `OUTPUTS:\n`;
        text += `- Total Fuel Required: ${totalFuel.toFixed(2)} L`;
    } else if (mode === 'normal') {
        text += `- Mode: Normal\n`;
        text += `- Race Duration: ${inp.raceH}h ${inp.raceM}m\n`;
        text += `- Lap Pace: ${inp.lapM}m ${inp.lapS}s\n`;
        text += `- Fuel per Lap: ${inp.fuelLap.toFixed(2)} L\n`;
        text += `- Safety Margin: ${inp.safetyMargin}%\n\n`;
        
        const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
        const lapSeconds = (inp.lapM * 60) + inp.lapS;
        const raceLaps = Math.ceil(raceSeconds / lapSeconds);
        const safetyFactor = 1 + (inp.safetyMargin / 100);
        const totalFuel = raceLaps * inp.fuelLap * safetyFactor;
        
        text += `OUTPUTS:\n`;
        text += `- Total Laps: ${raceLaps}\n`;
        text += `- Total Fuel Required: ${totalFuel.toFixed(2)} L`;
    } else { // pro
        text += `- Mode: Pro\n`;
        text += `- Race Duration: ${inp.raceH}h ${inp.raceM}m\n`;
        text += `- Lap Pace: ${inp.lapM}m ${inp.lapS}s\n`;
        text += `- Fuel per Lap: ${inp.fuelLap.toFixed(2)} L\n`;
        text += `- Tank Capacity: ${inp.tank.toFixed(2)} L\n`;
        text += `- Mandatory Pitstops: ${inp.mandStops}\n`;
        text += `- Safety Margin: ${inp.safetyMargin}%\n`;
        text += `- Formation Lap: ${inp.includeFormation ? 'Yes' : 'No'}\n`;
        text += `- Cool-down Lap: ${inp.includeCooldown ? 'Yes' : 'No'}\n\n`;
        
        const safetyFactor = 1 + (inp.safetyMargin / 100);
        const raceSeconds = (inp.raceH * 3600) + (inp.raceM * 60);
        const lapSeconds = (inp.lapM * 60) + inp.lapS;
        const raceLaps = Math.ceil(raceSeconds / lapSeconds);
        let totalLaps = raceLaps;
        if (inp.includeFormation) totalLaps += 1;
        if (inp.includeCooldown) totalLaps += 1;
        const totalFuelL = totalLaps * inp.fuelLap * safetyFactor;
        const tankL = inp.tank;

        const stints = [];
        let lapCounter = inp.includeFormation ? 1 : 0;

        if (inp.mandStops === 0) {
            const maxLapsPerStint = Math.floor(tankL / (inp.fuelLap * safetyFactor));
            const safeMaxLaps = Math.max(1, maxLapsPerStint);
            let remainingLaps = totalLaps;
            let stintIndex = 0;
            while (remainingLaps > 0) {
                if (remainingLaps * inp.fuelLap * safetyFactor <= tankL) {
                    const stintLaps = remainingLaps;
                    const stintFuel = stintLaps * inp.fuelLap * safetyFactor;
                    stints.push({ index: stintIndex, laps: stintLaps, fuel: stintFuel, startLap: lapCounter + 1, endLap: lapCounter + stintLaps });
                    lapCounter += stintLaps;
                    remainingLaps = 0;
                } else {
                    const stintLaps = safeMaxLaps;
                    const stintFuel = tankL;
                    stints.push({ index: stintIndex, laps: stintLaps, fuel: stintFuel, startLap: lapCounter + 1, endLap: lapCounter + stintLaps });
                    lapCounter += stintLaps;
                    remainingLaps -= stintLaps;
                }
                stintIndex++;
            }
        } else {
            const maxLapsPerStint = Math.floor(tankL / (inp.fuelLap * safetyFactor));
            const safeMaxLaps = Math.max(1, maxLapsPerStint);
            const minStintsFromFuel = Math.ceil(totalLaps / safeMaxLaps);
            const minStopsFromFuel = minStintsFromFuel - 1;
            const actualStops = Math.max(inp.mandStops, minStopsFromFuel);
            const numStints = actualStops + 1;
            const baseLaps = Math.floor(totalLaps / numStints);
            const remainder = totalLaps % numStints;
            for (let i = 0; i < numStints; i++) {
                const stintLaps = baseLaps + (i < remainder ? 1 : 0);
                const stintFuel = stintLaps * inp.fuelLap * safetyFactor;
                stints.push({ index: i, laps: stintLaps, fuel: stintFuel, startLap: lapCounter + 1, endLap: lapCounter + stintLaps });
                lapCounter += stintLaps;
            }
        }

        text += `OUTPUTS:\n`;
        text += `- Total Laps: ${totalLaps}\n`;
        stints.forEach(s => {
            text += `- Stint ${s.index + 1}: ${s.fuel.toFixed(2)} L (Laps ${s.startLap}–${s.endLap})\n`;
        });
        text += `- Total Fuel Required: ${totalFuelL.toFixed(2)} L`;
    }
    
    return text;
}

function getTempCopyText() {
    const inp = readTempInputs();
    const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let text = `RACETECH ASSISTANT - TYRE PRESSURES\nDate: ${dateStr}\n\n`;
    
    text += `INPUTS:\n`;
    text += `- Cold Pressures:\n`;
    text += `  - Front Left: ${inp.pFL.toFixed(2)} psi\n`;
    text += `  - Front Right: ${inp.pFR.toFixed(2)} psi\n`;
    text += `  - Rear Left: ${inp.pRL.toFixed(2)} psi\n`;
    text += `  - Rear Right: ${inp.pRR.toFixed(2)} psi\n`;
    
    if (!Number.isNaN(inp.tBefore) || !Number.isNaN(inp.tAfter)) {
        text += `- Ambient Temperature:\n`;
        text += `  - Before: ${Number.isNaN(inp.tBefore) ? '-' : inp.tBefore + ' °C'}\n`;
        text += `  - After: ${Number.isNaN(inp.tAfter) ? '-' : inp.tAfter + ' °C'}\n`;
    }
    if (!Number.isNaN(inp.bdFBefore) || !Number.isNaN(inp.bdFAfter)) {
        text += `- Brake Ducts (Front):\n`;
        text += `  - Before: ${inp.bdFBefore}\n`;
        text += `  - After: ${inp.bdFAfter}\n`;
    }
    if (!Number.isNaN(inp.bdRBefore) || !Number.isNaN(inp.bdRAfter)) {
        text += `- Brake Ducts (Rear):\n`;
        text += `  - Before: ${inp.bdRBefore}\n`;
        text += `  - After: ${inp.bdRAfter}\n`;
    }
    
    text += `\nOUTPUTS:\n`;
    
    let dP_temp = 0;
    if (!Number.isNaN(inp.tBefore) && !Number.isNaN(inp.tAfter)) {
        dP_temp = -0.1 * (inp.tAfter - inp.tBefore);
    }
    let dP_bdF = 0;
    if (!Number.isNaN(inp.bdFBefore) && !Number.isNaN(inp.bdFAfter)) {
        dP_bdF = calcBrakeDuctDelta(inp.bdFBefore, inp.bdFAfter);
    }
    let dP_bdR = 0;
    if (!Number.isNaN(inp.bdRBefore) && !Number.isNaN(inp.bdRAfter)) {
        dP_bdR = calcBrakeDuctDelta(inp.bdRBefore, inp.bdRAfter);
    }
    
    const correctedFL = inp.pFL + dP_temp + dP_bdF;
    const correctedFR = inp.pFR + dP_temp + dP_bdF;
    const correctedRL = inp.pRL + dP_temp + dP_bdR;
    const correctedRR = inp.pRR + dP_temp + dP_bdR;
    
    const changeFL = dP_temp + dP_bdF;
    const changeFR = dP_temp + dP_bdF;
    const changeRL = dP_temp + dP_bdR;
    const changeRR = dP_temp + dP_bdR;
    
    text += `- Front Left: ${correctedFL.toFixed(2)} psi (Change: ${changeFL >= 0 ? '+' : ''}${changeFL.toFixed(2)})\n`;
    text += `- Front Right: ${correctedFR.toFixed(2)} psi (Change: ${changeFR >= 0 ? '+' : ''}${changeFR.toFixed(2)})\n`;
    text += `- Rear Left: ${correctedRL.toFixed(2)} psi (Change: ${changeRL >= 0 ? '+' : ''}${changeRL.toFixed(2)})\n`;
    text += `- Rear Right: ${correctedRR.toFixed(2)} psi (Change: ${changeRR >= 0 ? '+' : ''}${changeRR.toFixed(2)})`;
    
    return text;
}

document.getElementById('btnFuelCopy').addEventListener('click', () => {
    copyToClipboard(getFuelCopyText(), 'btnFuelCopy');
});

document.getElementById('btnTempCopy').addEventListener('click', () => {
    copyToClipboard(getTempCopyText(), 'btnTempCopy');
});

// ========== GLOBAL KEY HOTKEYS ==========
document.addEventListener('keydown', (e) => {
    // Ignore if modifier keys are pressed to avoid conflicts with browser/system shortcuts (e.g. Cmd+C, Cmd+R, Shift+R)
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    // Helper to safely find the active tab key
    const getActiveTab = () => {
        const activeTabEl = tabs.find(t => {
            const el = document.getElementById(t.btn);
            return el && el.classList.contains('active');
        });
        return activeTabEl ? activeTabEl.btn : 'tab-fuel';
    };

    // 1. Enter key: press to Calculate when focusing an input field
    if (e.key === 'Enter') {
        if (e.target.tagName === 'INPUT') {
            const activeTab = getActiveTab();
            if (activeTab === 'tab-fuel') {
                const btn = document.getElementById('btnFuel');
                if (btn && !btn.disabled) {
                    e.preventDefault();
                    calcFuel();
                }
            } else if (activeTab === 'tab-temp') {
                const btn = document.getElementById('btnTemp');
                if (btn && !btn.disabled) {
                    e.preventDefault();
                    calcTemp();
                }
            }
        }
    }
    
    // 2. Hotkeys (only when NOT typing in input/textarea/select fields)
    const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT';
    if (!isTyping) {
        const key = e.key.toLowerCase();
        if (key === 'r') {
            // R: Reset active tab
            const activeTab = getActiveTab();
            if (activeTab === 'tab-fuel') {
                const resetBtn = document.getElementById('btnFuelReset');
                if (resetBtn) resetBtn.click();
            } else if (activeTab === 'tab-temp') {
                const resetBtn = document.getElementById('btnTempReset');
                if (resetBtn) resetBtn.click();
            }
        } else if (key === 'c') {
            // C: Copy active tab results (if visible, calling copyToClipboard directly to preserve user gesture)
            const activeTab = getActiveTab();
            if (activeTab === 'tab-fuel') {
                const container = document.getElementById('fuel-copy-container');
                if (container && container.style.display !== 'none') {
                    copyToClipboard(getFuelCopyText(), 'btnFuelCopy');
                }
            } else if (activeTab === 'tab-temp') {
                const container = document.getElementById('temp-copy-container');
                if (container && container.style.display !== 'none') {
                    copyToClipboard(getTempCopyText(), 'btnTempCopy');
                }
            }
        }
    }
});

// Load saved inputs on page load
window.addEventListener('load', loadInputsFromStorage);