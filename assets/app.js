let units = 'metric'; // fixed

// Utilities
const round = (x,d=2)=>Number.isFinite(x)?Math.round(x*10**d)/10**d:NaN;
const num = id => parseFloat(document.getElementById(id).value);
const val = id => document.getElementById(id).value;

const showGrid  = id => document.getElementById(id).style.display='grid';
const hide      = id => document.getElementById(id).style.display='none';
const showBlock = id => document.getElementById(id).style.display='block';
const showResult=(id,html)=>{const el=document.getElementById(id); el.style.display='block'; el.innerHTML=html};
const hideResult=id=>{const el=document.getElementById(id); el.style.display='none'; el.innerHTML=''};

// Header title/desc per tab
const pageTitle = document.getElementById('pageTitle');
const pageDesc  = document.getElementById('pageDesc');
function setHeaderFor(tab){
    if(tab==='tab-fuel'){
    pageTitle.textContent = 'Fuel Calculator';
    pageDesc.textContent  = 'Enter race time and lap pace (or fixed laps), then Calculate. Use Pro for tank size, formation/cool-down laps, and mandatory pitstops.';
    } else if(tab==='tab-temp'){
    pageTitle.textContent = 'Tyre Pressures — Temperature Change';
    pageDesc.textContent  = 'Input current cold pressures and ambient before/after. We apply 0.1 psi per °C and preview corrected pressures vs target window.';
    } else if(tab==='tab-brake'){
    pageTitle.textContent = 'Tyre Pressures — Brake Duct Change';
    pageDesc.textContent  = 'Enter current pressures and brake-duct settings before/after. We apply 0.2 psi per step to estimate new pressures.';
    }
}

// Tabs logic
const tabs = [
    {btn:'tab-fuel', panel:'panel-fuel', col:'col-fuel'},
    {btn:'tab-temp', panel:'panel-temp', col:'col-temp'},
    {btn:'tab-brake', panel:'panel-brake', col:'col-brake'}
];

function activateTab(key){
    tabs.forEach(t=>{
    const btn = document.getElementById(t.btn);
    const panel = document.getElementById(t.panel);
    const col = document.querySelector(`[id="${t.col}"]`) || document.getElementById(t.panel).parentElement;
    const isActive = t.btn===key;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    if (isActive) {
        col.classList.remove('inactive-panel');
        panel.style.display = 'block';
        panel.focus({preventScroll:true});
    } else {
        col.classList.add('inactive-panel');
        panel.style.display = 'none';
    }
    });
    setHeaderFor(key);
    updateInputErrors(); // Validate inputs when switching tabs
}

tabs.forEach(t=>{ document.getElementById(t.btn).addEventListener('click', ()=>activateTab(t.btn)); });

// Init header labels
setHeaderFor('tab-fuel');

// Fuel: mode toggle
const normalBtn = document.getElementById('mode-normal');
const proBtn = document.getElementById('mode-pro');
const normalForm = document.getElementById('fuel-form-normal');
const proForm = document.getElementById('fuel-form-pro');

function setMode(mode){
    const isPro = mode==='pro';
    normalBtn.setAttribute('aria-pressed', String(!isPro));
    proBtn.setAttribute('aria-pressed', String(isPro));
    normalForm.style.display = isPro? 'none' : '';
    normalForm.setAttribute('aria-hidden', String(isPro));
    proForm.style.display = isPro? '' : 'none';
    proForm.setAttribute('aria-hidden', String(!isPro));
    updateInputErrors();
}
normalBtn.addEventListener('click', ()=>setMode('normal'));
proBtn.addEventListener('click', ()=>setMode('pro'));

// Session Storage
function saveInputsToStorage(){
    const inputs = readFuelInputs();
    const tempInputs = readTempInputs();
    const brakeInputs = readBrakeInputs();
    const data = {
    raceH: inputs.raceH, raceM: inputs.raceM, lapM: inputs.lapM, lapS: inputs.lapS,
    fuelLap: inputs.fuelLap, lapsFixed: inputs.fixedLaps, safetyMargin: inputs.safetyMargin,
    raceH_p: inputs.raceH, raceM_p: inputs.raceM, lapM_p: inputs.lapM, lapS_p: inputs.lapS,
    fuelLap_p: inputs.fuelLap, lapsFixed_p: inputs.fixedLaps, tank_p: inputs.tank,
    mandStops: inputs.mandStops, safetyMargin_p: inputs.safetyMargin,
    includeFormation: inputs.includeFormation, includeCooldown: inputs.includeCooldown,
    pFR: tempInputs.pFR, pFL: tempInputs.pFL, pRL: tempInputs.pRL, pRR: tempInputs.pRR,
    tBefore: tempInputs.tBefore, tAfter: tempInputs.tAfter, targetMin: tempInputs.targetMin, targetMax: tempInputs.targetMax,
    bFR: brakeInputs.bFR, bFL: brakeInputs.bFL, bRL: brakeInputs.bRL, bRR: brakeInputs.bRR,
    bdBefore: brakeInputs.bdBefore, bdAfter: brakeInputs.bdAfter
    };
    Object.entries(data).forEach(([key, value]) => sessionStorage.setItem(`input_${key}`, value));
}

function loadInputsFromStorage(){
    const fields = [
    'raceH','raceM','lapsFixed','lapM','lapS','fuelLap','safetyMargin',
    'raceH_p','raceM_p','lapsFixed_p','lapM_p','lapS_p','fuelLap_p','tank_p','mandStops','safetyMargin_p',
    'pFR','pFL','pRL','pRR','tBefore','tAfter','targetMin','targetMax',
    'bFR','bFL','bRL','bRR','bdBefore','bdAfter'
    ];
    fields.forEach(id => {
    const value = sessionStorage.getItem(`input_${id}`);
    if (value !== null && document.getElementById(id)) document.getElementById(id).value = value;
    });
    ['includeFormation','includeCooldown'].forEach(id => {
    const value = sessionStorage.getItem(`input_${id}`);
    if (value !== null && document.getElementById(id)) document.getElementById(id).checked = value === 'true';
    });
    updateInputErrors();
}

// Input Validation
function validateFuelInputs(){
    const inp = readFuelInputs();
    const isPro = proBtn.getAttribute('aria-pressed')==='true';
    const errors = {};

    // Common validations
    if (Number.isNaN(inp.fuelLap) || inp.fuelLap <= 0) errors.fuelLap = errors.fuelLap_p = 'Must be positive';
    if (Number.isNaN(inp.safetyMargin) || inp.safetyMargin < 0) errors.safetyMargin = errors.safetyMargin_p = 'Must be non-negative';
    if (inp.lapM < 0 || Number.isNaN(inp.lapM)) errors.lapM = errors.lapM_p = 'Must be non-negative';
    if (inp.lapS < 0 || Number.isNaN(inp.lapS)) errors.lapS = errors.lapS_p = 'Must be non-negative';
    if (inp.raceH < 0 || Number.isNaN(inp.raceH)) errors.raceH = errors.raceH_p = 'Must be non-negative';
    if (inp.raceM < 0 || Number.isNaN(inp.raceM)) errors.raceM = errors.raceM_p = 'Must be non-negative';
    if (inp.fixedLaps < 0 || Number.isNaN(inp.fixedLaps)) errors.lapsFixed = errors.lapsFixed_p = 'Must be non-negative';

    // Pro mode specific
    if (isPro) {
    if (Number.isNaN(inp.tank) || inp.tank <= 0) errors.tank_p = 'Must be positive';
    if (Number.isNaN(inp.mandStops) || inp.mandStops < 0) errors.mandStops = 'Must be non-negative';
    }

    // Check if race duration or fixed laps are provided
    const raceSeconds = (inp.raceH*3600) + (inp.raceM*60);
    const lapSeconds = (inp.lapM*60) + inp.lapS;
    if (inp.fixedLaps <= 0 && (raceSeconds <= 0 || lapSeconds <= 0)) {
    if (raceSeconds <= 0) {
        errors.raceH = errors.raceH_p = errors.raceM = errors.raceM_p = 'Enter race time or fixed laps';
    }
    if (lapSeconds <= 0 && raceSeconds > 0) {
        errors.lapM = errors.lapM_p = errors.lapS = errors.lapS_p = 'Enter lap time or fixed laps';
    }
    }

    return errors;
}

function validateTempInputs(){
    const inp = readTempInputs();
    const errors = {};

    if (Number.isNaN(inp.pFR) || inp.pFR <= 0) errors.pFR = 'Must be positive';
    if (Number.isNaN(inp.pFL) || inp.pFL <= 0) errors.pFL = 'Must be positive';
    if (Number.isNaN(inp.pRL) || inp.pRL <= 0) errors.pRL = 'Must be positive';
    if (Number.isNaN(inp.pRR) || inp.pRR <= 0) errors.pRR = 'Must be positive';
    if (Number.isNaN(inp.tBefore)) errors.tBefore = 'Must be a valid number';
    if (Number.isNaN(inp.tAfter)) errors.tAfter = 'Must be a valid number';
    if (!Number.isNaN(inp.targetMin) && inp.targetMin < 0) errors.targetMin = 'Must be non-negative';
    if (!Number.isNaN(inp.targetMax) && inp.targetMax < 0) errors.targetMax = 'Must be non-negative';
    if (!Number.isNaN(inp.targetMin) && !Number.isNaN(inp.targetMax) && inp.targetMin > inp.targetMax) {
    errors.targetMin = errors.targetMax = 'Min must be less than or equal to Max';
    }

    return errors;
}

function validateBrakeInputs(){
    const inp = readBrakeInputs();
    const errors = {};

    if (Number.isNaN(inp.bFR) || inp.bFR <= 0) errors.bFR = 'Must be positive';
    if (Number.isNaN(inp.bFL) || inp.bFL <= 0) errors.bFL = 'Must be positive';
    if (Number.isNaN(inp.bRL) || inp.bRL <= 0) errors.bRL = 'Must be positive';
    if (Number.isNaN(inp.bRR) || inp.bRR <= 0) errors.bRR = 'Must be positive';
    if (Number.isNaN(inp.bdBefore) || inp.bdBefore < 0) errors.bdBefore = 'Must be non-negative';
    if (Number.isNaN(inp.bdAfter) || inp.bdAfter < 0) errors.bdAfter = 'Must be non-negative';

    return errors;
}

function updateInputErrors(){
    const activeTab = tabs.find(t => document.getElementById(t.btn).classList.contains('active')).btn;
    let errors = {};

    if (activeTab === 'tab-fuel') {
    errors = validateFuelInputs();
    const isPro = proBtn.getAttribute('aria-pressed')==='true';
    const fields = isPro ? 
        ['raceH_p','raceM_p','lapsFixed_p','lapM_p','lapS_p','fuelLap_p','tank_p','mandStops','safetyMargin_p'] :
        ['raceH','raceM','lapsFixed','lapM','lapS','fuelLap','safetyMargin'];
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
    document.getElementById('btnFuel').disabled = Object.keys(errors).length > 0;
    } else if (activeTab === 'tab-temp') {
    errors = validateTempInputs();
    const fields = ['pFR','pFL','pRL','pRR','tBefore','tAfter','targetMin','targetMax'];
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
    } else if (activeTab === 'tab-brake') {
    errors = validateBrakeInputs();
    const fields = ['bFR','bFL','bRL','bRR','bdBefore','bdAfter'];
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
    document.getElementById('btnBrake').disabled = Object.keys(errors).length > 0;
    }
}

// Fuel calc
function readFuelInputs(){
    const isPro = proBtn.getAttribute('aria-pressed')==='true';
    const read = (id, def=0)=>{ const v = parseFloat(val(id)); return isNaN(v)? def : v; };
    if(!isPro){
    return {
        raceH: read('raceH'), raceM: read('raceM'), lapM: read('lapM'), lapS: read('lapS'),
        fuelLap: read('fuelLap'), fixedLaps: read('lapsFixed'), safetyMargin: read('safetyMargin', 5),
        tank: 0, includeFormation: false, includeCooldown: false, mandStops: 0
    };
    } else {
    return {
        raceH: read('raceH_p'), raceM: read('raceM_p'), lapM: read('lapM_p'), lapS: read('lapS_p'),
        fuelLap: read('fuelLap_p'), fixedLaps: read('lapsFixed_p'), tank: read('tank_p', 120),
        includeFormation: document.getElementById('includeFormation').checked,
        includeCooldown: document.getElementById('includeCooldown').checked,
        mandStops: parseInt(val('mandStops'))||0, safetyMargin: read('safetyMargin_p', 5)
    };
    }
}

// Temp calc
function readTempInputs(){
    return {
    pFR: num('pFR'), pFL: num('pFL'), pRL: num('pRL'), pRR: num('pRR'),
    tBefore: num('tBefore'), tAfter: num('tAfter'),
    targetMin: num('targetMin'), targetMax: num('targetMax')
    };
}

// Brake calc
function readBrakeInputs(){
    return {
    bFR: num('bFR'), bFL: num('bFL'), bRL: num('bRL'), bRR: num('bRR'),
    bdBefore: num('bdBefore'), bdAfter: num('bdAfter')
    };
}

function fuelDisplay(liters){ return round(liters,2); }

function calcFuel(){
    const inp = readFuelInputs();
    const isPro = proBtn.getAttribute('aria-pressed')==='true';
    const pitstopGrid = document.getElementById('pitstop-grid');
    const marginNote = document.getElementById('margin-note');

    // Should be validated by button disable, but double-check
    const errors = validateFuelInputs();
    if (Object.keys(errors).length > 0){
    hide('pitstop-grid');
    hide('fuel-callout');
    showResult('outFuel','❌ <span class="err">Please correct invalid inputs.</span>');
    return;
    }

    const fuelLapL = inp.fuelLap;
    const tankL = inp.tank || 120;
    const raceSeconds = (inp.raceH*3600) + (inp.raceM*60);
    const lapSeconds = (inp.lapM*60) + inp.lapS;
    const safetyFactor = 1 + (inp.safetyMargin / 100);

    let raceLaps;
    if (inp.fixedLaps>0){ raceLaps = inp.fixedLaps; }
    else { raceLaps = Math.ceil(raceSeconds / lapSeconds); }

    // Total laps
    let totalLaps = raceLaps;
    if (isPro){
    if (inp.includeFormation) totalLaps += 1;
    if (inp.includeCooldown) totalLaps += 1;
    }

    // Base total fuel
    let totalFuelL = totalLaps * fuelLapL;

    // Apply safety margin
    totalFuelL *= safetyFactor;

    // Mandatory stops: pit-in lap ~90% consumption (Pro mode only)
    const PIT_LAP_FACTOR = 0.9;
    if (isPro && inp.mandStops>0){ totalFuelL -= inp.mandStops * (1 - PIT_LAP_FACTOR) * fuelLapL; }

    // Clear previous pitstop grid
    pitstopGrid.innerHTML = '';
    hide('pitstop-grid');

    if (isPro){
    let startFuelL, totalPitstops, stintFuelL, finalFuelL, stintLaps, finalLaps;

    if (totalFuelL <= tankL && inp.mandStops > 0){
        // Case: Single tank sufficient, but mandatory pitstops required
        totalPitstops = inp.mandStops;
        const totalStints = totalPitstops + 1;
        stintLaps = Math.floor(totalLaps / totalStints);
        finalLaps = totalLaps - (stintLaps * totalPitstops);
        stintFuelL = round(totalFuelL / totalStints, 2);
        finalFuelL = round(totalFuelL - (stintFuelL * (totalStints - 1)), 2);
        startFuelL = stintFuelL; // First stint fuel
    } else {
        // Case: Multiple tanks needed or no mandatory pitstops
        stintLaps = Math.floor(tankL / fuelLapL);
        totalPitstops = Math.max(inp.mandStops, Math.floor(totalLaps / Math.max(stintLaps, 1)));
        finalLaps = totalLaps - (stintLaps * totalPitstops);
        stintFuelL = round(stintLaps * fuelLapL * safetyFactor, 2);
        finalFuelL = round(finalLaps * fuelLapL * safetyFactor, 2);
        startFuelL = totalPitstops > 0 ? Math.min(tankL, totalFuelL) : totalFuelL;
    }

    // Generate pitstop schedule
    let lapsCovered = inp.includeFormation ? 1 : 0; // Start after formation lap if included
    for (let i = 0; i < totalPitstops; i++){
        const isFinalStint = (i === totalPitstops - 1 && finalLaps > 0);
        const lapsThisStint = isFinalStint ? finalLaps : stintLaps;
        const fuelThisStint = isFinalStint ? finalFuelL : stintFuelL;
        const pitLap = lapsCovered + lapsThisStint;

        // Create pitstop card
        const card = document.createElement('div');
        card.className = 'pitstop-card';
        card.innerHTML = `
        <strong>${fuelDisplay(fuelThisStint)} <span class="unit-inline" data-u="volume">L</span></strong>
        <div class="text-uppercase small" style="color:var(--muted)">Pitstop ${i + 1} at lap ${pitLap}</div>
        `;
        pitstopGrid.appendChild(card);

        lapsCovered += lapsThisStint;
    }

    // Update big callout
    document.getElementById('start-fuel').textContent = fuelDisplay(startFuelL).toFixed(1);
    marginNote.textContent = inp.safetyMargin > 0 ? `Includes ${inp.safetyMargin}% safety margin` : '';
    showBlock('fuel-callout');

    // Add total fuel card
    const totalCard = document.createElement('div');
    totalCard.className = 'pitstop-card total-fuel';
    totalCard.innerHTML = `
        <strong>${fuelDisplay(totalFuelL)} <span class="unit-inline" data-u="volume">L</span></strong>
        <div class="text-uppercase small" style="color:var(--muted)">Total Fuel${inp.safetyMargin > 0 ? ` (+${inp.safetyMargin}% margin)` : ''}</div>
    `;
    pitstopGrid.appendChild(totalCard);

    if (totalPitstops > 0 || totalFuelL > 0){
        showGrid('pitstop-grid');
    }
    } else {
    // Normal mode: Only show total fuel in callout
    document.getElementById('start-fuel').textContent = fuelDisplay(totalFuelL).toFixed(1);
    marginNote.textContent = inp.safetyMargin > 0 ? `Includes ${inp.safetyMargin}% safety margin` : '';
    showBlock('fuel-callout');
    }

    // Clear errors
    hideResult('outFuel');
}

// Temp → Pressure
function calcTemp(){
    const inp = readTempInputs();

    // Should be validated by button disable, but double-check
    const errors = validateTempInputs();
    if (Object.keys(errors).length > 0){
    hide('temp-wrap');
    showResult('outTemp','❌ <span class="err">Please correct invalid inputs.</span>');
    return;
    }

    const dT = inp.tAfter - inp.tBefore; // °C
    const dP = -0.1 * dT; // psi per °C (+1°C ambient = -0.1 psi pressure adjustment)
    const corrected = [inp.pFL, inp.pFR, inp.pRL, inp.pRR].map(v=>round(v + dP,2)); // FL,FR,RL,RR

    // Update tyres
    document.getElementById('tp-fl').textContent = corrected[0];
    document.getElementById('tp-fr').textContent = corrected[1];
    document.getElementById('tp-rl').textContent = corrected[2];
    document.getElementById('tp-rr').textContent = corrected[3];

    let status = '—';
    if (!Number.isNaN(inp.targetMin) && !Number.isNaN(inp.targetMax)){
    const allOk = corrected.every(v=>v>=inp.targetMin && v<=inp.targetMax);
    status = allOk ? 'Within window' : 'Adjust needed';
    }

    hideResult('outTemp');
    showGrid('temp-wrap');
    showGrid('temp-tyre-grid');
}

// Brake ducts → Pressure
function calcBrake(){
    const inp = readBrakeInputs();

    // Should be validated by button disable, but double-check
    const errors = validateBrakeInputs();
    if (Object.keys(errors).length > 0){
    hide('brake-wrap');
    showResult('outBrake','❌ <span class="err">Please correct invalid inputs.</span>');
    return;
    }

    const dBD = inp.bdAfter - inp.bdBefore;
    const dP = 0.2 * dBD;

    const corrected = [inp.bFR, inp.bFL, inp.bRL, inp.bRR].map(v=>round(v + dP,2));
    document.getElementById('bd-fr').textContent = corrected[0];
    document.getElementById('bd-fl').textContent = corrected[1];
    document.getElementById('bd-rl').textContent = corrected[2];
    document.getElementById('bd-rr').textContent = corrected[3];

    hideResult('outBrake');
    showGrid('brake-wrap');
    showGrid('brake-tyre-grid');
}

// Attach input listeners for validation and storage
const inputIds = [
    'raceH','raceM','lapsFixed','lapM','lapS','fuelLap','safetyMargin',
    'raceH_p','raceM_p','lapsFixed_p','lapM_p','lapS_p','fuelLap_p','tank_p','mandStops','safetyMargin_p',
    'includeFormation','includeCooldown',
    'pFR','pFL','pRL','pRR','tBefore','tAfter','targetMin','targetMax',
    'bFR','bFL','bRL','bRR','bdBefore','bdAfter'
];
inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
    el.addEventListener('input', () => {
        updateInputErrors();
        saveInputsToStorage();
    });
    }
});

document.getElementById('btnFuel').addEventListener('click', calcFuel);
document.getElementById('btnFuelReset').addEventListener('click', ()=>{
    ['raceH','raceM','lapsFixed','lapM','lapS','fuelLap','safetyMargin','raceH_p','raceM_p','lapsFixed_p','lapM_p','lapS_p','fuelLap_p','tank_p','mandStops','safetyMargin_p'].forEach(id=>{
    const el=document.getElementById(id); 
    if(el) el.value='';
    });
    const f=document.getElementById('includeFormation'); if(f) f.checked=true;
    const c=document.getElementById('includeCooldown'); if(c) c.checked=true;
    document.getElementById('start-fuel').textContent='0.0';
    document.getElementById('margin-note').textContent='';
    hide('pitstop-grid');
    hide('fuel-callout');
    hideResult('outFuel');
    inputIds.forEach(id => sessionStorage.removeItem(`input_${id}`));
    updateInputErrors();
});

document.getElementById('btnTemp').addEventListener('click', calcTemp);
document.getElementById('btnTempReset').addEventListener('click', ()=>{
    ['pFL','pFR','pRL','pRR','tBefore','tAfter','targetMin','targetMax'].forEach(id=>document.getElementById(id).value='');
    hide('temp-wrap'); hideResult('outTemp');
    inputIds.forEach(id => sessionStorage.removeItem(`input_${id}`));
    updateInputErrors();
});

document.getElementById('btnBrake').addEventListener('click', calcBrake);
document.getElementById('btnBrakeReset').addEventListener('click', ()=>{
    ['bFL','bFR','bRL','bRR','bdBefore','bdAfter'].forEach(id=>document.getElementById(id).value='');
    hide('brake-wrap'); hideResult('outBrake');
    inputIds.forEach(id => sessionStorage.removeItem(`input_${id}`));
    updateInputErrors();
});

// Auto-collapse hamburger when selecting a nav item
(function(){
    const navCollapseEl = document.getElementById('primaryNav');
    if(!navCollapseEl) return;
    const bsCollapse = new bootstrap.Collapse(navCollapseEl, { toggle: false });
    navCollapseEl.addEventListener('click', (e)=>{
    const clickedItem = e.target.closest('.nav-link');
    if(clickedItem && window.getComputedStyle(navCollapseEl).display !== 'none'){
        bsCollapse.hide();
    }
    });
})();

// Navbar mobile overlay: compute height and update CSS var
(function(){
    const nav = document.querySelector('.navbar');
    if(!nav) return;
    function setNavH(){
    const h = nav.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--navH', `${Math.round(h)}px`);
    }
    window.addEventListener('load', setNavH);
    window.addEventListener('resize', setNavH);
    window.addEventListener('orientationchange', setNavH);
    setNavH();
})();

// Toggle class to hide navbar border when overlay menu is open
(function(){
    const nav = document.querySelector('.navbar');
    const collapseEl = document.getElementById('primaryNav');
    if(!nav || !collapseEl) return;
    collapseEl.addEventListener('show.bs.collapse', ()=> nav.classList.add('overlay-open'));
    collapseEl.addEventListener('hidden.bs.collapse', ()=> nav.classList.remove('overlay-open'));
})();

// Load saved inputs on page load
window.addEventListener('load', loadInputsFromStorage);