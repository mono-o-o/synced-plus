document.addEventListener('DOMContentLoaded', () => {
    let loadedAudio = null;
    let currTrackName = '';

    const metaName = document.getElementById('trackTitle');
    const metaArtist = document.getElementById('trackArtist');
    const metaAlbum = document.getElementById('trackAlbum');
    if (!loadedAudio) {metaName.value = ''; metaArtist.value = ''; metaAlbum.value = '';}

    const accentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    const accentSecondary = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary');
    const accentSurface = getComputedStyle(document.documentElement).getPropertyValue('--accent-srf');
    const accentText = getComputedStyle(document.documentElement).getPropertyValue('--accent-txt');

    const toast = document.getElementById('loadingToast');

    const currTime = document.getElementById('currentTime');
    const duration = document.getElementById('duration');

    const TIME_REGEX = /^(\d{2}):(\d{2})\.(\d{2,3})$/;
    const SRT_TIME_REGEX = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
    const LINE_FORBIDDEN_CHARS_REGEX = /[<>]/g;
    const METADATA_REGEX = /^\[(ti|ar|al|by|offset):(.*?)]$/;
    const LINE_MATCH_REGEX = /^\[(\d{2}:\d{2}\.\d{2,3})](.*)$/;
    const WORD_SPLIT_REGEX = /<(\d{2}:\d{2}\.\d{2,3})>([^<]*)/g;

    const CURRENT_VERSION = '1.3.0';

    const DEFAULT_SETTINGS = {
        seekStep: 1,
        autoScroll: true,
        regionLoop: false,
        trailingTag: false,
        theme: 'default',
        previewFormat: 'enhanced',
        hotkeys: {
            playPause: 'Space',
            rewind: 'ArrowLeft',
            fastForward: 'ArrowRight',
            slowDown: '<',
            speedUp: '>'
        }
    }

    let appSettings = {};
    const loadSettings = () => {
        const saved = localStorage.getItem('syncedplus:settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                appSettings = {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    hotkeys: {...DEFAULT_SETTINGS.hotkeys, ...(parsed.hotkeys || {})}
                }
            } catch (err) {
                console.warn('failed to load settings, failling back: ', err);
                appSettings = {...DEFAULT_SETTINGS};
            }
        } else {
            appSettings = {...DEFAULT_SETTINGS};
        }
    }

    const saveSettings = () => localStorage.setItem('syncedplus:settings', JSON.stringify(appSettings));
    loadSettings();

    const hotkeysModal = document.getElementById('hotkeysModal');
    if (hotkeysModal) {
        hotkeysModal.addEventListener('click', (e) => {
            if (e.target === hotkeysModal) {
                const rect = e.target.getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) hotkeysModal.close();
            }
        })
    }

    const closeHotkeysBtn = document.getElementById('closeHotkeysBtn');
    if (closeHotkeysBtn) closeHotkeysBtn.addEventListener('click', () => {if (hotkeysModal) hotkeysModal.close()});

    const seekStepInput = document.getElementById('seekStep');
    const seekStepDec = document.getElementById('seekStepDec');
    const seekStepInc = document.getElementById('seekStepInc');

    if (seekStepInput) {
        seekStepInput.value = appSettings.seekStep;
        const updSeekStep = (val) => {
            let parsed = parseFloat(val);
            if (isNaN(parsed) || parsed <= 0) parsed = 0.1;
            parsed = Math.round(parsed * 100) / 100;
            appSettings.seekStep = parsed;
            seekStepInput.value = parsed;
            saveSettings();
            renderHotkeys();
        }
        seekStepInput.addEventListener('input', (e) => updSeekStep(e.target.value));
        seekStepDec.addEventListener('click', () => updSeekStep(appSettings.seekStep - 1 > 0 ? appSettings.seekStep - 1 : 0.1));
        seekStepInc.addEventListener('click', () => updSeekStep(appSettings.seekStep + 1));
    }

    const resetHotkeysBtn = document.getElementById('resetHotkeysBtn');
    if (resetHotkeysBtn) {
        resetHotkeysBtn.addEventListener('click', () => {
            appSettings.hotkeys = {...DEFAULT_SETTINGS.hotkeys};
            saveSettings();
            renderHotkeys();
        })
    }

    const renderHotkeys = () => {
        const settingsTable = document.getElementById('hotkeysTable');
        const aboutTable = document.querySelector('#about-hotkeys table');
        const hotkeyLabels = {
            playPause: 'Play/Pause',
            rewind: 'Rewind',
            fastForward: 'Fast Forward',
            slowDown: 'Slow Down (-0.25x)',
            speedUp: 'Speed Up (+0.25x)',
        }
        const formatKey = (key) => key === ' ' ? 'Space' : key;

        if (settingsTable) {
            settingsTable.innerHTML = '';
            Object.keys(appSettings.hotkeys).forEach(k => {
                const tr = document.createElement('tr');
                const labelTd = document.createElement('td');
                labelTd.textContent = hotkeyLabels[k];
                const valTd = document.createElement('td');
                const btn = document.createElement('button');
                btn.className = 'hotkey-btn';
                btn.textContent = formatKey(appSettings.hotkeys[k]);

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    btn.textContent = 'Press any key...';
                    btn.classList.add('listening');
                    const controller = new AbortController();
                    const cleanup = () => {
                        controller.abort();
                        renderHotkeys();
                    }

                    document.addEventListener('keydown', (event) => {
                        event.preventDefault();
                        if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return;
                        let combo = [];
                        if (event.ctrlKey) combo.push('Ctrl');
                        if (event.altKey) combo.push('Alt');
                        if (event.metaKey) combo.push('Meta');
                        if (event.shiftKey && (combo.length > 0 || event.key.length > 1)) combo.push('Shift');
                        let mainKey = event.code === 'Space' ? 'Space' : (event.key.length === 1 ? event.key.toUpperCase() : event.key);
                        combo.push(mainKey);
                        appSettings.hotkeys[k] = combo.join(' + ');
                        saveSettings();
                        cleanup();
                    },{signal: controller.signal});

                    document.addEventListener('click', (event) => {
                        if (event.target !== btn) cleanup();
                    }, {signal: controller.signal});
                })
                valTd.appendChild(btn);
                tr.appendChild(labelTd);
                tr.appendChild(valTd);
                settingsTable.appendChild(tr);
            })
        }
        if (aboutTable) {
            aboutTable.innerHTML = `
                <tr><td>${formatKey(appSettings.hotkeys.playPause)}</td><td>Play/Pause</td></tr>
                <tr><td>${formatKey(appSettings.hotkeys.rewind)}<br>${formatKey(appSettings.hotkeys.fastForward)}</td><td>Jump ${appSettings.seekStep}s backward/forward</td></tr>
                <tr><td>Ctrl + Z</td><td>Undo</td></tr>
                <tr><td>Ctrl + Shift + Z<br>Ctrl + Y</td><td>Redo</td></tr>
                <tr><td>${formatKey(appSettings.hotkeys.slowDown)}</td><td>Slow Down -0.25x</td></tr>
                <tr><td>${formatKey(appSettings.hotkeys.speedUp)}</td><td>Speed Up +0.25x</td></tr>
            `;
        }
    }

    renderHotkeys();

    const autoScrollToggle = document.getElementById('autoScrollToggle');
    const autoScrollToggleCard = document.getElementById('autoScrollToggleCard');
    if (autoScrollToggle) {
        autoScrollToggle.checked = appSettings.autoScroll;
        autoScrollToggle.addEventListener('change', (e) => {
            appSettings.autoScroll = e.target.checked;
            saveSettings();
            if (!appSettings.autoScroll) autoScrollSuspended = false;
            if (resumeScrollingBtn) resumeScrollingBtn.classList.remove('is-visible');
        })
    }
    if (autoScrollToggleCard && autoScrollToggle) {
        autoScrollToggleCard.addEventListener('click', (e) => {
            if (e.target !== autoScrollToggle) {
                autoScrollToggle.checked = !autoScrollToggle.checked;
                autoScrollToggle.dispatchEvent(new Event('change'));
            }
        })
    }

    let autoScrollSuspended = false;
    const resumeScrollingBtn = document.getElementById('resumeScrollingBtn');
    const mainWorkspace = document.querySelector('.main-workspace');

    const suspendAutoScroll = () => {
        if (appSettings.autoScroll && !autoScrollSuspended) {
            autoScrollSuspended = true;
            if (resumeScrollingBtn && lineArray.length !== 0) resumeScrollingBtn.classList.add('is-visible');
        }
    }

    if (mainWorkspace) {
        mainWorkspace.addEventListener('wheel', suspendAutoScroll, {passive: true});
        mainWorkspace.addEventListener('touchmove', suspendAutoScroll, {passive: true});
        mainWorkspace.addEventListener('mousedown', (e) => {if (e.offsetX > mainWorkspace.clientWidth - 20) suspendAutoScroll()});
    }

    if (resumeScrollingBtn) {
        resumeScrollingBtn.addEventListener('click', () => {
            autoScrollSuspended = false;
            resumeScrollingBtn.classList.remove('is-visible');
            if (activeLineEl) activeLineEl.scrollIntoView({behavior: 'smooth', block: 'center'});
        })
    }

    window.openExtLink = async function(url) {
        if (window.__TAURI_INTERNALS__?.invoke) {
            try {
                await window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url', { url: url });
            } catch (err) {
                console.error('Tauri opener failed, falling back to new tab:', err);
            }
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    const githubBtn = document.getElementById('githubBtn');
    if (githubBtn) githubBtn.addEventListener('click', () => window.openExtLink('https://github.com/mono-o-o/synced-plus'));

    const creditLink = document.querySelectorAll('.credit-link');
    if (creditLink) creditLink.forEach(l => l.addEventListener('click', (e) => window.openExtLink(l.dataset.url)))

    const formatTime = (seconds, precision = 3) => {
        if (isNaN(seconds)) return precision === 3 ? '00:00.000' : '00:00.00';
        const factor = precision === 3 ? 1000 : 100;
        const totalMs = Math.round(seconds * factor);
        const mins = Math.floor(totalMs / (60 * factor));
        const secs = Math.floor((totalMs % (60 * factor)) / factor);
        const ms = totalMs % factor;
        const fMins = String(mins).padStart(2, '0');
        const fSecs = String(secs).padStart(2, '0');
        const fMs = String(ms).padStart(precision, '0');
        return `${fMins}:${fSecs}.${fMs}`;
    }

    const formatSRTTime = (seconds) => {
        if (isNaN(seconds)) return '00:00:00,000';
        const totalMs = Math.round(seconds * 1000);
        const hrs = Math.floor(totalMs / 3600000);
        const mins = Math.floor((totalMs % 3600000) / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const ms = totalMs % 1000;
        const fHrs = String(hrs).padStart(2, '0');
        const fMins = String(mins).padStart(2, '0');
        const fSecs = String(secs).padStart(2, '0');
        const fMs = String(ms).padStart(3, '0');
        return `${fHrs}:${fMins}:${fSecs},${fMs}`;
    }

    const parseTime = (timeString) => {
        const match = timeString.match(TIME_REGEX);
        if (!match) return 0;
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const fracStr = match[3];
        const frac = parseInt(fracStr, 10) / Math.pow(10, fracStr.length);
        return mins * 60 + secs + frac;
    }

    const parseSRTTime = (timeString) => {
        const match = timeString.match(SRT_TIME_REGEX);
        if (!match) return 0;
        const hrs = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const secs = parseInt(match[3], 10);
        const ms = parseInt(match[4], 10);
        return (hrs * 3600) + (mins * 60) + secs + (ms / 1000);
    }

    currTime.textContent = formatTime(0);
    duration.textContent = formatTime(0);

    const customAlert = (msg) => {
        return new Promise((resolve) => {
            const dialogue = document.getElementById('alertDialogue');
            document.getElementById('alertMsg').textContent = msg;
            const okBtn = document.getElementById('alertOkBtn');
            const closeAlert = () => {
                dialogue.close();
                okBtn.removeEventListener('click', closeAlert);
                resolve();
            }
            okBtn.addEventListener('click', closeAlert);
            dialogue.showModal();
        })
    }

    const customConfirm = (msg) => {
        return new Promise((resolve) => {
            const dialogue = document.getElementById('confirmDialogue');
            document.getElementById('confirmMsg').innerHTML = msg;
            const yesBtn = document.getElementById('confirmYesBtn');
            const noBtn = document.getElementById('confirmNoBtn');
            const closeConfirm = () => {
                dialogue.close();
                yesBtn.removeEventListener('click', yes);
                noBtn.removeEventListener('click', no);
            }

            const yes = () => {closeConfirm(); resolve(true);}
            const no = () => {closeConfirm(); resolve(false);}

            yesBtn.addEventListener('click', yes);
            noBtn.addEventListener('click', no);
            dialogue.showModal();
        })
    }

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        }
    }

    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    const checkUpdateBtn = document.getElementById('checkUpdateBtn');
    const versionDisp = document.getElementById('versionDisp');
    versionDisp.textContent = `v${CURRENT_VERSION}`;

    const checkUpdates = async (manualCheck = false) => {
        if (checkUpdateBtn) {
            checkUpdateBtn.disabled = true;
            checkUpdateBtn.textContent = "Checking for updates...";
        }
        try {
            const response = await Promise.race([
                fetch('https://api.github.com/repos/mono-o-o/synced-plus/releases/latest'),
                timeout(10000)
            ]);
            if (!response.ok) throw new Error('failed to fetch latest release');
            const relData = await response.json();
            const latestVer = relData.tag_name.replace(/^v/, '');
            const compareVer = (oldVer, newVer) => {
                const partsOld = oldVer.split('.').map(Number);
                const partsNew = newVer.split('.').map(Number);
                for (let i = 0; i < 3; i++) {
                    if (partsOld[i] < partsNew[i]) return -1;
                    if (partsOld[i] > partsNew[i]) return 1;
                }
                return 0;
            }
            if (compareVer(latestVer, CURRENT_VERSION) > 0) {
                const apk = relData.assets.find(a => a.name.endsWith('.apk'));
                const dlUrl = apk ? apk.browser_download_url : relData.html_url;
                const confirmed = await customConfirm(`
                    <p style="margin: 0">A new version is available!</p><br>
                    <strong>Current:</strong> <code>v${CURRENT_VERSION}</code><br>
                    <strong class="accent">Latest:</strong> <code>v${latestVer}</code><br><br>
                    <p style="margin: 0">Download the latest version?</p>
                `)
                if (confirmed) {
                    if (window.__TAURI_INTERNALS__) await window.__TAURI_INTERNALS__.invoke('plugin:opener|open_url', {url:dlUrl});
                    else window.open(dlUrl, '_blank');
                }
            } else if (manualCheck) await customAlert('You are already on the latest version!');
        } catch (err) {
            console.error('failed to check for updates: ', err);
            if (manualCheck) await customAlert('Unable to check for updates. Please check your internet connection.');
        } finally {
            if (checkUpdateBtn) {
                checkUpdateBtn.disabled = false;
                checkUpdateBtn.textContent = "Check for updates";
            }
        }
    }

    if (checkUpdateBtn) checkUpdateBtn.addEventListener('click', () => checkUpdates(true));

    let wsRegions;
    const wavesurfer = WaveSurfer.create({
        container: '#waveform',
        backend: 'MediaElement',
        waveColor: accentSecondary,
        progressColor: accentPrimary,
        backgroundColor: accentSurface,
        cursorColor: accentText,
        height: 150,
        cursorWidth: 2,
        barHeight: 0.5,
        barWidth: 4,
        barGap: 3,
        barRadius: 4,
        minPxPerSec: 30,
        autoCenter: true,
        fillParent: true,

        plugins: [
            WaveSurfer.Zoom.create({
                exponentialZooming: true,
                maxZoom: 500
            }),
            wsRegions = WaveSurfer.Regions.create()
        ]
    });

    const loopToggle = document.getElementById('loopToggle');
    const loopToggleCard = document.getElementById('loopToggleCard');
    let activeLoopRegion = null;

    if (loopToggle) {
        loopToggle.checked = appSettings.regionLoop;
        loopToggle.addEventListener('change', (e) => {
            appSettings.regionLoop = e.target.checked;
            saveSettings();
            activeLoopRegion = null;
        })
    }

    if (loopToggleCard && loopToggle) {
        loopToggleCard.addEventListener('click', (e) => {
            if (e.target !== loopToggle) {
                loopToggle.checked = !loopToggle.checked;
                loopToggle.dispatchEvent(new Event('change'));
            }
        })
    }

    wsRegions.on('region-clicked', (r, e) => {
        if (!appSettings.regionLoop) return;
        e.stopPropagation();
        activeLoopRegion = r.id;
        r.play();
    })

    wsRegions.on('region-out', (r) => {
        if (appSettings.regionLoop && activeLoopRegion === r.id) r.play();
    })

    document.querySelectorAll('.about-tab').forEach(t => {
        t.addEventListener('click', (e) => {
            document.querySelectorAll('.about-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.about-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        })
    })

    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                const rect = e.target.getBoundingClientRect();
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) aboutModal.close();
            }
        })
    }

    window.copyToClipboard = function(btn, text) {
        navigator.clipboard.writeText(text);
        const copyNotif = btn.querySelector('.copied-text');
        copyNotif.classList.add('show-copied');
        setTimeout(() => copyNotif.classList.remove('show-copied'), 1000);
    }

    const copyDiscordBtn = document.getElementById('copyDiscordBtn');
    if (copyDiscordBtn) {
        copyDiscordBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const txt = copyDiscordBtn.dataset.copytxt;
            copyToClipboard(this, txt);
        })
    }

    const compressLines = (lines) => {return lines.map(l => [l.start, l.end, l.text, l.words.map(w => w.time)])}
    const decompressLines = (compressedLines) => {
        return compressedLines.map(p => {
            const [start, end, text, wordTimes] = p;
            const trimmedText = text.trim();
            const timesArray = wordTimes || [];
            const words = trimmedText ? trimmedText.split(/\s+/).map((w, i) => ({
                id: crypto.randomUUID(),
                time: timesArray[i] !== undefined && timesArray[i] !== null ? timesArray[i] : null,
                text: w
            })) : [];

            return {
                id: crypto.randomUUID(),
                start: start,
                end: end,
                text: text,
                isEditing: false,
                isWordSyncExpanded: false,
                words: words
            }
        })
    }

    let undoStack = [];
    let redoStack = [];
    const maxHistory = 20;

    const saveProgress = () => {
        const compressed = compressLines(lineArray);
        const progress = JSON.stringify(compressed);
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === progress) return;

        undoStack.push(progress);
        if (undoStack.length > maxHistory) undoStack.shift();

        const draftData = {
            audioName: currTrackName,
            lines: compressed
        }

        try {
            localStorage.setItem('syncedplus:draft', JSON.stringify(draftData));
        } catch (err) {
            console.warn('unable to save draft: ', err);
        }
    }

    const saveWithDebounce = debounce(saveProgress, 300);
    const saveImmediately = () => saveProgress();

    const undo = () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        const compressed = JSON.parse(undoStack[undoStack.length - 1]);
        lineArray = decompressLines(compressed);
        currentPlaybackIndex = -1;
        lastActiveLineId = null;
        activeLineEl = null;
        renderWorkspace();
        updatePreview();
    }

    const redo = () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);
        const compressed = JSON.parse(state);
        lineArray = decompressLines(compressed);
        currentPlaybackIndex = -1;
        lastActiveLineId = null;
        activeLineEl = null;
        renderWorkspace();
        updatePreview();
    }

    let animFrameId = null;
    let lastActiveLineId = null;
    let currentPlaybackIndex = -1;
    let activeLineEl = null;
    let activeWordEl = [];
    let lineArray = [];

    const lineMap = new Map();
    const rebuildLineMap = () => {
        lineMap.clear();
        lineArray.forEach(l => lineMap.set(l.id, l));
    }
    const createNewLine = (defaultTime = 0) => {
        return {
            id: crypto.randomUUID(),
            start: defaultTime,
            end: defaultTime,
            text: '',
            isEditing: false,
            isWordSyncExpanded: false,
            words: []
        }
    }

    const syncRegions = () => {
        wsRegions.clearRegions();
        lineArray.forEach((l) => {
            if (l.end > l.start) {
                const region = wsRegions.addRegion({
                    id: l.id,
                    start: l.start,
                    end: l.end,
                    color: `rgb(from var(--accent-txt) r g b / 0.2)`,
                    drag: false,
                    resize: true
                })
                region.element.title = l.text;
            }
        })
    }

    let isValidatingRegion = false;
    let preDragState = null;
    wsRegions.on('region-update', (r) => {
        if (isValidatingRegion) return;
        if (!preDragState) preDragState = JSON.stringify(compressLines(lineArray));
        const index = lineArray.findIndex(l => l.id === r.id);
        if (index !== -1) {
            const line = lineArray[index];
            const prevLine = lineArray[index - 1];
            const nextLine =lineArray[index + 1];
            let newStart = r.start;
            let newEnd = r.end;
            const oldDuration = line.end - line.start;
            const newDuration = newEnd - newStart;
            const isMoving = Math.abs(oldDuration - newDuration) < 0.05;

            const minStart = prevLine ? prevLine.end : 0;
            const maxEnd = nextLine ? nextLine.start : (wavesurfer.getDuration() || Infinity);

            if (isMoving) {
                if (newStart < minStart) {
                    newStart = minStart;
                    newEnd = newStart + oldDuration;
                } else if (newEnd > maxEnd) {
                    newEnd = maxEnd;
                    newStart = newEnd - oldDuration;
                }
            } else {
                if (newStart < minStart) newStart = minStart;
                if (newEnd > maxEnd) newEnd = maxEnd;
                if (newEnd < newStart) newEnd = newStart;
            }

            lineArray[index].start = newStart;
            lineArray[index].end = newEnd;
            validateTimes(index);
            isValidatingRegion = true;
            r.setOptions({start: lineArray[index].start, end: lineArray[index].end});
            const lineCard = document.querySelector(`.line-card[data-id="${lineArray[index].id}"]`);
            if (lineCard) {
                lineCard.querySelector('.line-start').value = formatTime(lineArray[index].start);
                lineCard.querySelector('.line-end').value = formatTime(lineArray[index].end);
            }
            isValidatingRegion = false;
        }
    })

    wsRegions.on('region-updated', (r) => {
        const lineData = lineMap.get(r.id);
        if (lineData) {
            validateTimes(lineArray.findIndex(l => l.id === r.id));

            if (preDragState) {
                const currState = JSON.stringify(compressLines(lineArray));
                if (currState !== preDragState && (undoStack.length === 0 || undoStack[undoStack.length - 1] !== preDragState)) {
                    undoStack.push(preDragState);
                    if (undoStack.length > maxHistory) undoStack.shift();
                    redoStack = [];
                }
                preDragState = null;
            }

            renderWorkspace();
            updatePreview();
            saveImmediately();
        }
    })

    const renderWorkspace = () => {
        rebuildLineMap();
        const linesContainer = document.getElementById('lines');
        const existingCards = Array.from(linesContainer.querySelectorAll('.line-card'));
        existingCards.forEach(c => {if (!lineMap.has(c.dataset.id)) c.remove();})

        lineArray.forEach((line) => {
            let lineCard = linesContainer.querySelector(`.line-card[data-id="${line.id}"]`);
            if (!lineCard) {
                lineCard = document.createElement('div');
                lineCard.className = 'line-card';
                lineCard.dataset.id = line.id;
                lineCard.innerHTML = `
                    <div class="line-main-row">
                        <div class="time-wrapper">
                            <div class="time-field" title="Line start time">
                                <input type="text" class="time-input line-start" placeholder="00:00.00">
                                <button type="button" class="time-btn get-start-btn">${setTimeIcon}</button>
                            </div>
                            <div class="time-field" title="Line end time">
                                <input type="text" class="time-input line-end" placeholder="00:00.00">
                                <button type="button" class="time-btn get-end-btn">${setTimeIcon}</button>
                            </div>
                        </div>
                        <div class="lyric-wrapper">
                            <input type="text" class="lyric-input" placeholder="Enter lyric line here...">
                            <div class="lyric-display"></div>
                        </div>
                        <div class="line-actions">
                            <button type="button" class="action-btn play-line-btn" title="Play from line">
                                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="currentColor" d="m10.65 15.75l4.875-3.125q.35-.225.35-.625t-.35-.625L10.65 8.25q-.375-.25-.763-.038t-.387.663v6.25q0 .45.388.663t.762-.038M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/></svg>
                            </button>
                            <button type="button" class="action-btn delete-btn" title="Delete line">
                                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM7 6v13zm5 7.9l1.9 1.9q.275.275.7.275t.7-.275t.275-.7t-.275-.7l-1.9-1.9l1.9-1.9q.275-.275.275-.7t-.275-.7t-.7-.275t-.7.275L12 11.1l-1.9-1.9q-.275-.275-.7-.275t-.7.275t-.275.7t.275.7l1.9 1.9l-1.9 1.9q-.275.275-.275.7t.275.7t.7.275t.7-.275z"/></svg>
                            </button>
                            <button type="button" class="action-btn expand-btn" title="Word-by-word syncing">
                                <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="currentColor" d="m6.8 13l2.9 2.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.213-.325T3.426 12t.063-.375t.212-.325l4.6-4.6q.275-.275.7-.275t.7.275t.275.7t-.275.7L6.8 11H19V8q0-.425.288-.712T20 7t.713.288T21 8v3q0 .825-.587 1.413T19 13z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="word-sync-container" style="display: none;"></div>
                `;
                linesContainer.appendChild(lineCard);
            }

            const startInput = lineCard.querySelector('.line-start');
            if (startInput.value !== formatTime(line.start)) startInput.value = formatTime(line.start);

            const endInput = lineCard.querySelector('.line-end');
            if (endInput.value !== formatTime(line.end)) endInput.value = formatTime(line.end);

            const lyricInput = lineCard.querySelector('.lyric-input');
            if (lyricInput.value !== line.text) lyricInput.value = line.text;

            if (line.isEditing) lineCard.classList.add('is-editing');
            else lineCard.classList.remove('is-editing');

            const displayContainer = lineCard.querySelector('.lyric-display');
            displayContainer.innerHTML = '';
            line.words.forEach(w => {
                const span = document.createElement('span');
                span.textContent = w.text;
                displayContainer.appendChild(span);
            });

            const wordContainer = lineCard.querySelector('.word-sync-container');
            wordContainer.style.display = line.isWordSyncExpanded ? 'flex' : 'none';
            if (line.words.length === 0) wordContainer.innerHTML = '';
            else {
                const existingWords = Array.from(wordContainer.querySelectorAll('.word-card'));
                existingWords.forEach(wn => {if (!line.words.find(word => word.id === wn.dataset.id)) wn.remove();})
                line.words.forEach((wordData) => {
                    let wordCard = wordContainer.querySelector(`.word-card[data-id="${wordData.id}"]`);
                    if (!wordCard) {
                        wordCard = document.createElement('div');
                        wordCard.className = 'word-card';
                        wordCard.dataset.id = wordData.id;
                        wordCard.innerHTML = `
                            <span class="word-text" title="Jump to word"></span>
                            <div class="time-field">
                                <input type="text" class="time-input word-start" placeholder="00:00.00">
                                <button type="button" class="time-btn get-word-btn">${setTimeIcon}</button>
                            </div>
                        `;
                        wordContainer.appendChild(wordCard);
                    }
                    const wordInput = wordCard.querySelector('.word-start');
                    const formattedWordTime = wordData.time !== null && wordData.time !== '' ? formatTime(wordData.time) : '';
                    if (wordInput.value !== formattedWordTime) wordInput.value = formattedWordTime;
                    const wordText = wordCard.querySelector('.word-text');
                    if (wordText.textContent !== wordData.text) wordText.textContent = wordData.text;
                })
            }
        });
        syncRegions();
    }

    const linesContainer = document.getElementById('lines');
    linesContainer.addEventListener('input', (e) => {
        const card = e.target.closest('.line-card');
        if (!card) return;

        const lineData = lineMap.get(card.dataset.id);

        if (e.target.classList.contains('lyric-input')) {
            if (LINE_FORBIDDEN_CHARS_REGEX.test(e.target.value)) e.target.value = e.target.value.replace(LINE_FORBIDDEN_CHARS_REGEX, '');
            lineData.text = e.target.value;
            const text = lineData.text.trim();
            const wordStrings = text ? text.split(/\s+/) : [];

            lineData.words = wordStrings.map((w, i) => {
                const existing = lineData.words[i];
                return {
                    id: existing ? existing.id : crypto.randomUUID(),
                    time: existing ? existing.time : (i === 0 ? lineData.start : null),
                    text: w
                }
            })
            renderWorkspace();
            saveWithDebounce();
        }

        if (e.target.classList.contains('time-input')) {
            let digits = e.target.value.replace(/\D/g, '');
            digits = digits.substring(0, 7);
            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i === 2) {
                    formatted += ':';
                    if (parseInt(digits[i]) > 5) digits = digits.substring(0, i) + '5' + digits.substring(i + 1);
                }
                if (i === 4) formatted += '.';
                formatted += digits[i];
            }
            e.target.value = formatted;

            if (e.target.classList.contains('line-start')) lineData.start = parseTime(formatted);
            if (e.target.classList.contains('line-end')) lineData.end = parseTime(formatted);
            if (e.target.classList.contains('word-start')) {
                const wCard = e.target.closest('.word-card');
                lineData.words.find(w => w.id === wCard.dataset.id).time = parseTime(formatted);
            }
            saveWithDebounce();
        }
    });

    linesContainer.addEventListener('focusin', (e) => {
        if (e.target.classList.contains('lyric-input')) {
            const card = e.target.closest('.line-card');
            lineMap.get(card.dataset.id).isEditing = true;
            renderWorkspace();
        }
    });

    const validateTimes = (startIndex) => {
        const duration = wavesurfer.getDuration();
        for (let i = startIndex; i < lineArray.length; i++) {
            const currentLine = lineArray[i];
            const prevLine = lineArray[i-1];
            const nextLine = lineArray[i+1];

            let startSec = currentLine.start;
            let endSec = currentLine.end;

            if (duration > 0 && startSec > duration) startSec = duration;
            if (prevLine && startSec < prevLine.end) startSec = prevLine.end;
            if (nextLine && endSec > nextLine.start) endSec = nextLine.start;

            if (endSec < startSec) endSec = startSec;
            if (duration > 0 && endSec > duration) endSec = duration;

            currentLine.start = startSec;
            currentLine.end = endSec;

            if (currentLine.words.length > 0) {
                const firstWordSec = currentLine.words[0].time;
                if (currentLine.words[0].time !== null && currentLine.words[0].time !== '' && firstWordSec < startSec) currentLine.words[0].time = currentLine.start;

                currentLine.words.forEach((w, i) => {
                    if (w.time === null || w.time === '') return;
                    let wordSec = w.time;
                    if (duration > 0 && wordSec > duration) wordSec = duration;

                    const prevWord = currentLine.words[i-1];
                    if (prevWord && prevWord.time !== null && prevWord.time !== '') {
                        if (wordSec < prevWord.time) wordSec = prevWord.time;
                    } else if (wordSec < startSec) wordSec = startSec;

                    const nextWord = currentLine.words[i+1];
                    if (nextWord && nextWord.time !== null && nextWord.time !== '') {
                        if (wordSec > nextWord.time) wordSec = nextWord.time;
                    } else if (wordSec > endSec) wordSec = endSec;
                    w.time = wordSec;
                })
            }
        }
    }

    linesContainer.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('lyric-input')) {
            const card = e.target.closest('.line-card');
            lineMap.get(card.dataset.id).isEditing = false;
            renderWorkspace();
            saveImmediately();
        }

        if (e.target.classList.contains('time-input')) {
            const card = e.target.closest('.line-card');
            const lineIndex = lineArray.findIndex(l => l.id === card.dataset.id);
            if (lineIndex !== -1) {
                validateTimes(lineIndex);
                renderWorkspace();
                updatePreview();
            }
        }
    })

    linesContainer.addEventListener('mousedown', async (e) => {
        const card = e.target.closest('.line-card');
        if (!card) return;
        const lineData = lineMap.get(card.dataset.id);

        if (e.target.closest('.lyric-display')) {
            e.preventDefault();
            lineData.isEditing = true;
            renderWorkspace();
            card.querySelector('.lyric-input').focus();
        }

        if (e.target.closest('.expand-btn')) {
            lineData.isWordSyncExpanded = !lineData.isWordSyncExpanded;
            renderWorkspace();
        }

        if (e.target.closest('.get-start-btn')) {
            lineData.start = wavesurfer.getCurrentTime();
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            updatePreview();
            saveImmediately();
        }

        if (e.target.closest('.get-end-btn')) {
            lineData.end = wavesurfer.getCurrentTime();
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            updatePreview();
            saveImmediately();
        }

        if (e.target.closest('.delete-btn')) {
            if (await customConfirm("Are you sure you want to delete this line?")) {
                lineArray = lineArray.filter(l => l.id !== card.dataset.id);
                renderWorkspace();
                updatePreview();
                saveImmediately();
            }
        }

        if (e.target.closest('.play-line-btn')) {
            if (wavesurfer.getDuration() > 0) {
                const calcedTime = Math.max(0, lineData.start - getOffset());
                wavesurfer.setTime(calcedTime);
                wavesurfer.play();
            }
        }

        if (e.target.closest('.get-word-btn')) {
            const wordCard = e.target.closest('.word-card');
            const word = lineData.words.find(w => w.id === wordCard.dataset.id);
            word.time = wavesurfer.getCurrentTime();
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            updatePreview();
            saveImmediately();
            return;
        }

        const wordCardClick = e.target.closest('.word-card');
        if (wordCardClick && e.target.tagName.toLowerCase() !== 'input') {
            const word = lineData.words.find(w => w.id === wordCardClick.dataset.id);
            const timeNum = (word.time === null || word.time === '') ? lineData.start : word.time;
            if (wavesurfer.getDuration() > 0) {
                const calcedTime = Math.max(0, timeNum - getOffset());
                wavesurfer.setTime(calcedTime);
                wavesurfer.play();
            }
        }
    })

    const audioFile = document.getElementById('audioFile');
    const importAudioBtn = document.getElementById('importAudio');

    const resetWorkspace = () => {
        toast.classList.add('is-visible');
        lineArray = [];
        currentPlaybackIndex = -1;
        undoStack = []; redoStack = [];
        renderWorkspace();

        if (wavesurfer.getDuration() > 0) wavesurfer.setTime(0);
        document.dispatchEvent(new Event('input', {bubbles:true}));

        if (loadedAudio && loadedAudio.startsWith('blob:')) URL.revokeObjectURL(loadedAudio);

        const titleInput = document.getElementById('trackTitle');
        const artistInput = document.getElementById('trackArtist');
        const albumInput = document.getElementById('trackAlbum');

        titleInput.value = ''; artistInput.value = ''; albumInput.value = '';
        titleInput.dispatchEvent(new Event('input', {bubbles:true}));
    }

    const processMetadata = (file) => {
        window.jsmediatags.read(file, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                if (tags.title) document.getElementById('trackTitle').value = tags.title;
                if (tags.artist) document.getElementById('trackArtist').value = tags.artist;
                if (tags.album) document.getElementById('trackAlbum').value = tags.album;
                document.getElementById('trackTitle').dispatchEvent(new Event('input', {bubbles:true}));
            }, onError: function(err) {console.warn('Problem reading audio metadata: ', err.info);}
        })
    }

    importAudioBtn.addEventListener('click', async () => {
        if (lineArray.length > 0 && !await customConfirm("Workspace is not empty. Overwrite?")) return;
        const isAndroid = navigator.userAgent.toLowerCase().includes('android');
        if (window.__TAURI_INTERNALS__ && !isAndroid) {
            try {
                const filePath = await window.__TAURI_INTERNALS__.invoke('plugin:dialog|open', {
                    options: {filters: [{name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a']}]}
                })
                if (filePath) {
                    currTrackName = filePath.split(/[\\/]/).pop();
                    resetWorkspace();
                    const assetUrl = window.__TAURI_INTERNALS__.convertFileSrc ? window.__TAURI_INTERNALS__.convertFileSrc(filePath) : `http://asset.localhost/${filePath}`;
                    loadedAudio = assetUrl;
                    try {
                        await Promise.race([
                            wavesurfer.load(loadedAudio),
                            timeout(20000)
                        ])
                        const file = new File([], currTrackName);
                        processMetadata(file);
                    } catch (err) {
                        console.error('audio loading failed or timed out: ', err);
                        wavesurfer.empty();
                        toast.classList.remove('is-visible');
                        await customAlert('Audio loading failed or timed out. The audio may be too large or corrupted.');
                    }
                }
            } catch (err) {
                console.error('yet ANOTHER tauri error: ', err);
                toast.classList.remove('is-visible');
            }
        } else audioFile.click();
    })

    audioFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        currTrackName = file.name;
        resetWorkspace();
        loadedAudio = URL.createObjectURL(file);
        try {
            await Promise.race([
                wavesurfer.load(loadedAudio),
                timeout(20000)
            ])
            processMetadata(file);
        } catch (err) {
            console.error('audio loading failed or timed out: ', err);
            wavesurfer.empty();
            toast.classList.remove('is-visible');
            await customAlert('Audio loading failed or timed out. The audio may be too large or corrupted.');
        }
    });

    const importBtn = document.getElementById('importBtn');
    importBtn.classList.add('disabled');
    importBtn.title = "Please open an audio file first!";
    importBtn.addEventListener('click', (e) => {
        if (e.currentTarget.classList.contains('disabled')) return;
        togglePanel('import');
    });

    let hoverPlugin;
    wavesurfer.on('ready', async () => {
        toast.classList.remove('is-visible');
        duration.textContent = formatTime(wavesurfer.getDuration());
        currTime.textContent = formatTime(0);
        addLineBtn.disabled = false;
        addLineBtn.removeAttribute('title');
        importBtn.classList.remove('disabled');
        importBtn.removeAttribute('title');
        exportBtn.classList.remove('disabled');
        exportBtn.removeAttribute('title');
        updatePreview();

        const volSlider = document.getElementById('volume');
        if (volSlider) wavesurfer.setVolume(parseFloat(volSlider.value));

        if (!hoverPlugin) {
            hoverPlugin = wavesurfer.registerPlugin(
                WaveSurfer.Hover.create({
                    lineColor: 'var(--accent-txt)',
                    lineWidth: 1,
                    labelColor: 'var(--accent-primary)',
                    labelFontSize: 12,
                    formatTimeCallback: (seconds) => formatTime(seconds)
                })
            )
        }

        const savedDraft = localStorage.getItem('syncedplus:draft');
        if (savedDraft && lineArray.length === 0) {
            try {
                const draftData = JSON.parse(savedDraft);
                if (draftData.audioName && draftData.audioName === currTrackName) {
                    if (await customConfirm(`<p style="line-height: 2">You have a draft saved for: <br><code style="padding: var(--space-1); background-color: var(--accent-bg);">${draftData.audioName}</code><br>Load it?</p>`)) {
                        lineArray = decompressLines(draftData.lines);
                        undoStack = [JSON.stringify(draftData.lines)];
                        redoStack = [];
                        renderWorkspace();
                        updatePreview();
                    } else localStorage.removeItem('syncedplus:draft');
                }
            } catch (err) {console.error('Error loading draft: ', err);}
        }
    });

    const getOffset = () => {
        const offsetMs = parseInt(document.getElementById('offset').value) || 0;
        return offsetMs / 1000;
    }

    wavesurfer.on('timeupdate', (currentTime) => {
        if (animFrameId) return;
        animFrameId = requestAnimationFrame(() => {
            animFrameId = null;
            currTime.textContent = formatTime(currentTime);

            const calcedTime = currentTime + getOffset();
            let activeIndex = -1;

            if (currentPlaybackIndex >= 0 && currentPlaybackIndex < lineArray.length) {
                const currentLine = lineArray[currentPlaybackIndex];
                const start = currentLine.start;
                const end = currentLine.end || wavesurfer.getDuration();

                if (calcedTime >=start && calcedTime <= end) activeIndex = currentPlaybackIndex;
                else if (currentPlaybackIndex + 1 < lineArray.length) {
                    const nextLine = lineArray[currentPlaybackIndex + 1];
                    const nextStart = nextLine.start;
                    const nextEnd = nextLine.end || wavesurfer.getDuration();
                    if (calcedTime >= nextStart && calcedTime <= nextEnd) activeIndex = currentPlaybackIndex + 1;
                }
            }

            if (activeIndex === -1) {
                activeIndex = lineArray.findIndex(l => {
                    const start = l.start;
                    const end = l.end || wavesurfer.getDuration();
                    return calcedTime >= start && calcedTime <= end;
                })
            }

            currentPlaybackIndex = activeIndex;

            const activeLine = activeIndex !== -1 ? lineArray[activeIndex] : null;

            if (lastActiveLineId !== (activeLine ? activeLine.id : null)) {
                if (activeLineEl) {
                    activeLineEl.classList.remove('current-line');
                    activeLineEl = null;
                }
                activeWordEl.forEach(el => el.classList.remove('active-word', 'active-word-card', 'active-preview-word'));
                activeWordEl = [];
                lastActiveLineId = activeLine ? activeLine.id : null;

                if (activeLine) {
                    const newLineCard = document.querySelector(`.line-card[data-id="${activeLine.id}"]`);
                    if (newLineCard) {
                        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
                        const isTyping = activeTag === 'input' || activeTag === 'textarea';
                        if (appSettings.autoScroll && !autoScrollSuspended && !isTyping) {newLineCard.scrollIntoView({behavior: 'smooth', block: 'center'});}
                    }
                }
            }

            if (!activeLine) return;
            const lineCard = document.querySelector(`.line-card[data-id="${activeLine.id}"]`);
            if (!lineCard) return;
            lineCard.classList.add('current-line');
            activeLineEl = lineCard;

            const wordCards = lineCard.querySelectorAll('.word-card');
            const dispSpans = lineCard.querySelectorAll('.lyric-display span');
            const prevLineSpan = document.getElementById(`prev-l${activeIndex}`);
            const format = appSettings.previewFormat || 'enhanced';

            if (prevLineSpan && (format !== 'enhanced' || activeLine.words.length === 0)) {
                if (!prevLineSpan.classList.contains('active-preview-word')) {
                    prevLineSpan.classList.add('active-preview-word');
                    activeWordEl.push(prevLineSpan);
                }
            }

            let hasWordTime = activeLine.words.some(w => w.time !== null && w.time !== '');
            let activeTime = -1;

            for (let index = activeLine.words.length-1; index >= 0; index--) {
                if (activeLine.words[index].time !== null && activeLine.words[index].time !== '') {
                    const ws = activeLine.words[index].time;
                    if (calcedTime >= ws) {activeTime = ws; break;}
                }
            }

            activeLine.words.forEach((wordData, index) => {
                const wsNum = wordData.time;
                const highlight = !hasWordTime || (wsNum !== null && wsNum !== '' && wsNum === activeTime);

                const elements = [
                    {el: wordCards[index], cls: 'active-word-card', track: true},
                    {el: dispSpans[index], cls: 'active-word', track: true},
                ]

                if (format === 'enhanced') elements.push({el: document.getElementById(`prev-l${activeIndex}-w${index}`), cls: 'active-preview-word', track: true})

                elements.forEach(({ el, cls }) => {
                    if (!el) return;
                    if (highlight) {
                        if (!el.classList.contains(cls)) {
                            el.classList.add(cls);
                            activeWordEl.push(el);
                        }
                    } else el.classList.remove(cls);
                })
            })
        });
    })

    wavesurfer.on('seeking', (currentTime) => {
        currTime.textContent = formatTime(currentTime);
        currentPlaybackIndex = -1;
    });

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (!loadedAudio) return;
            wavesurfer.playPause();
        })
    }
    wavesurfer.on('play', () => {playPauseBtn.classList.add('playing');})
    wavesurfer.on('pause', () => {playPauseBtn.classList.remove('playing');})

    const rewindBtn = document.getElementById('rewindBtn');
    const fastFwdBtn = document.getElementById('fastForwardBtn');
    rewindBtn.addEventListener('click', () => {if (wavesurfer.decodedData) wavesurfer.setTime(Math.max(0, wavesurfer.getCurrentTime() - appSettings.seekStep))});
    fastFwdBtn.addEventListener('click', () => {if (wavesurfer.decodedData) wavesurfer.setTime(Math.max(0, wavesurfer.getCurrentTime() + appSettings.seekStep))});

    const slowDownBtn = document.getElementById('slowDownBtn');
    const speedUpBtn = document.getElementById('speedUpBtn');
    const speedDisplay = document.getElementById('speedDisplay');
    speedDisplay.textContent = `${wavesurfer.getPlaybackRate().toFixed(2)}x`;
    slowDownBtn.addEventListener('click', () => {
        wavesurfer.setPlaybackRate(wavesurfer.getPlaybackRate() - 0.25);
        speedDisplay.textContent = `${wavesurfer.getPlaybackRate().toFixed(2)}x`;
    });
    speedUpBtn.addEventListener('click', () => {wavesurfer.setPlaybackRate(
        wavesurfer.getPlaybackRate() + 0.25);
        speedDisplay.textContent = `${wavesurfer.getPlaybackRate().toFixed(2)}x`;
    });


    const volumeSlider = document.getElementById('volume');
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {muteBtn.classList.add('vol-full')}

    document.addEventListener('keydown', (e) => {
        const activeInput = document.activeElement.tagName.toLowerCase();
        if (activeInput === 'input' || activeInput === 'textarea') return;

        if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'].includes(e.key)) suspendAutoScroll();

        let combo = [];
        if (e.ctrlKey) combo.push('Ctrl');
        if (e.altKey) combo.push('Alt');
        if (e.metaKey) combo.push('Meta');
        if (e.shiftKey && (combo.length > 0 || e.key.length > 1)) combo.push('Shift');

        let mainKey = e.code === 'Space' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) combo.push(mainKey);
        const pressedKey = combo.join(' + ');

        if (pressedKey === appSettings.hotkeys.playPause) {
            e.preventDefault();
            document.getElementById('playPauseBtn').click();
        } else if (pressedKey === appSettings.hotkeys.rewind) {
            e.preventDefault();
            document.getElementById('rewindBtn').click();
        } else if (pressedKey === appSettings.hotkeys.fastForward) {
            e.preventDefault();
            document.getElementById('fastForwardBtn').click();
        } else if (pressedKey === appSettings.hotkeys.slowDown) {
            e.preventDefault();
            document.getElementById('slowDownBtn').click();
        } else if (pressedKey === appSettings.hotkeys.speedUp) {
            e.preventDefault();
            document.getElementById('speedUpBtn').click();
        }
        else if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            redo();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }
    });

    const updSliderFill = (el, val) => {
        const min = el.min || 0;
        const max = el.max || 1;
        const percent = ((val-min) / (max-min)) * 100;
        el.style.background = `linear-gradient(to right, var(--accent-primary) ${percent}%, var(--accent-srf) ${percent}%)`;
    }

    const switchVolIcon = (vol) => {
        if (!muteBtn) return;
        muteBtn.classList.remove('vol-full', 'vol-half', 'vol-muted');
        if (vol <= 0.01) muteBtn.classList.add('vol-muted');
        else if (vol > 0.01 && vol <= 0.5) muteBtn.classList.add('vol-half');
        else muteBtn.classList.add('vol-full');
    }

    updSliderFill(volumeSlider, volumeSlider.value);
    volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        wavesurfer.setVolume(val);
        switchVolIcon(val);
        updSliderFill(volumeSlider, volumeSlider.value);
    });

    let savedVol = 1;
    muteBtn.addEventListener('click', () => {
        const currVol = parseFloat(volumeSlider.value);
        if (currVol > 0) {
            savedVol = currVol;
            volumeSlider.value = 0;
            wavesurfer.setVolume(0);
            switchVolIcon(0);
            updSliderFill(volumeSlider, 0);
        } else {
            volumeSlider.value = savedVol;
            wavesurfer.setVolume(savedVol);
            switchVolIcon(savedVol);
            updSliderFill(volumeSlider, savedVol);
        }
    });

    const addLineBtn = document.getElementById('addLineBtn');
    addLineBtn.disabled = true;
    addLineBtn.title = "Please open an audio file first!";
    const setTimeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1.25em" height="1.25em" viewBox="0 0 24 24"><path fill="currentColor" d="m12 11.6l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T10 11.975V8q0-.425.288-.712T11 7t.713.288T12 8zM18 6h-2q-.425 0-.712-.287T15 5t.288-.712T16 4h2V2q0-.425.288-.712T19 1t.713.288T20 2v2h2q.425 0 .713.288T23 5t-.288.713T22 6h-2v2q0 .425-.288.713T19 9t-.712-.288T18 8zM7.488 20.3q-1.638-.7-2.863-1.925T2.7 15.512T2 12t.7-3.512t1.925-2.863T7.488 3.7T11 3q.275 0 .513.013t.512.062q.425 0 .713.288t.287.712t-.288.713t-.712.287q-.275 0-.513-.038T11 5Q8.05 5 6.025 7.025T4 12t2.025 4.975T11 19t4.975-2.025T18 12q0-.425.288-.712T19 11t.713.288T20 12q0 1.875-.7 3.513t-1.925 2.862t-2.863 1.925T11 21t-3.512-.7" /></svg>`

    addLineBtn.addEventListener('click', () => {
        let defaultTime = 0;
        if (lineArray.length > 0) {
            const lastLine = lineArray[lineArray.length-1];
            if (lastLine.end > lastLine.start) defaultTime = lastLine.end;
            else if (lastLine.words.length > 0 && lastLine.words[lastLine.words.length-1].time !== null && lastLine.words[lastLine.words.length-1].time !== '') defaultTime = lastLine.words[lastLine.words.length-1].time;
            else defaultTime = lastLine.start || 0;
        }
        lineArray.push(createNewLine(defaultTime));
        renderWorkspace();
        updatePreview();
        saveImmediately();
    });

    const previewContainer = document.querySelector('.preview')

    const generateELRC = (forPreview = false, type = 'enhanced') => {
        const title = document.getElementById('trackTitle').value.trim();
        const artist = document.getElementById('trackArtist').value.trim();
        const album = document.getElementById('trackAlbum').value.trim();
        const by = document.getElementById('author').value.trim();
        const offset = document.getElementById('offset').value.trim();

        let elrc = '';
        if (title) elrc += `[ti:${title}]\n`;
        if (artist) elrc += `[ar:${artist}]\n`;
        if (album) elrc += `[al:${album}]\n`;
        if (by) elrc += `[by:${by}]\n`;
        if (offset) elrc += `[offset:${offset}]\n`;
        const length = formatTime(wavesurfer.getDuration(), 2);
        elrc += `[length:${length}]\n[re:synced+ (https://github.com/mono-o-o/synced-plus)]\n[ve:${CURRENT_VERSION}]\n\n`;

        lineArray.forEach((l, i) => {
            const startStr = formatTime(l.start, 2);
            const endStr = formatTime(l.end, 2);

            if (forPreview && type === 'standard') {
                let lineText = l.words.length > 0 ? l.words.map(w => w.text).join(' ') : l.text;
                elrc += `<span id="prev-l${i}">[${startStr}]${lineText}</span>`
            } else if (l.words.length > 0) {
                let lineStr = `[${startStr}]`;
                l.words.forEach((w, j) => {
                    let time = w.time !== null && w.time !== '' ? formatTime(w.time) : '';
                    if (j === 0 && time === '') time = startStr;
                    if (forPreview) lineStr += `<span id="prev-l${i}-w${j}">${time ? `&lt;${time}&gt;` : ''}${w.text}</span> `;
                    else {
                        if (type === 'enhanced') lineStr += `${time ? `<${time}>` : ''}${w.text} `;
                        else lineStr += `${w.text} `;
                    }
                });

                if (appSettings.trailingTag && type === 'enhanced' && l.end && l.end > l.start) {
                    if (forPreview) lineStr += `<span style="color: var(--accent-muted);" title="line end indicator">&lt;${endStr}&gt;</span>`;
                    else lineStr += `<${endStr}>`;
                }

                elrc += lineStr.trimEnd() + '\n';
            } else {
                if (forPreview) elrc += `<span id="prev-l${i}">[${startStr}]${l.text}</span>\n`;
                else elrc += `[${startStr}]${l.text}\n`;
            }

            if (!appSettings.trailingTag && l.end && l.end > l.start) {
                if (forPreview) elrc += `<span style="color: var(--accent-muted);" title="line end indicator">[${endStr}]</span>\n`;
                else elrc += `[${endStr}]\n`;
            }
        })
        return elrc;
    }

    const generateSRT = (forPreview = false) => {
        let srt = '';
        let seq = 1;

        lineArray.forEach((l, i) => {
            let start = l.start; let end = l.end;
            if (!end || end === start) {
                const nextLine = lineArray[i+1];
                end = nextLine ? nextLine.start : start + 2;
            }

            const formattedText = l.text.replace(/\\n/g, '\n');
            if (forPreview) srt += `<span id="prev-l${i}">${seq}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${formattedText}</span>\n\n`;
            else srt += `${seq}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${formattedText}\n\n`;
            seq++;
        })

        return srt.trim();
    }

    const updatePreview = () => {
        if (appSettings.previewFormat === 'srt') previewContainer.innerHTML = generateSRT(true);
        else previewContainer.innerHTML = generateELRC(true, appSettings.previewFormat);
        lastActiveLineId = null;
        if (wavesurfer) wavesurfer.emit('timeupdate', wavesurfer.getCurrentTime());
    }

    document.addEventListener('input', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;
        if (e.target.closest('#lines') || e.target.closest('.track-info' || e.target.closest('.meta-overlay') || e.target.closest('.settings-overlay'))) updatePreview();
    })

    const saveFile = async (lyricData, filename, ext = 'lrc') => {
        if (window.__TAURI_INTERNALS__) {
            try {
                const filePath = await window.__TAURI_INTERNALS__.invoke('plugin:dialog|save', {
                    options: {
                        defaultPath: `${filename}.${ext}`,
                        filters: [{
                            name: ext === 'srt' ? 'SubRip Text (.srt)' : 'LRC (.lrc)',
                            extensions: [ext, 'txt']
                        }]
                    }
                });

                if (filePath) {
                    await window.__TAURI_INTERNALS__.invoke('plugin:fs|write_text_file', {
                        path: filePath,
                        data: lyricData
                    });
                    await customAlert("Downloading now!");
                }
            } catch (err) {
                console.error("Downloading failed: ", err);
            }
        } else {
            try {
                const blob = new Blob([lyricData], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                await customAlert("Downloading now!");
            } catch (err) {
                console.error("Downloading failed: ", err);
            }
        }
    }

    const themeOverlay = document.querySelector('.theme-overlay');
    const previewHeader = document.querySelector('.preview-header');
    const previewHeaderText = previewHeader.querySelector('p');
    const previewHeaderIcon = previewHeader.querySelector('svg');

    let originalHeaderText = previewHeaderText.textContent;
    const originalHeaderIcon = previewHeaderIcon.innerHTML;

    let activePanel = null;

    const updatePreviewTitle = () => {
        const formatNames = {
            'standard': 'LRC Preview',
            'enhanced': 'ELRC Preview',
            'srt': 'SRT Preview'
        }
        originalHeaderText = formatNames[appSettings.previewFormat] || 'ELRC Preview';
        if (!activePanel) previewHeaderText.textContent = originalHeaderText;
    }
    updatePreviewTitle();

    const applyTheme = (theme) => {
        const update = () => {
            Object.entries(theme.colors).forEach(([prop, val]) => document.documentElement.style.setProperty(prop, val))
            const root = document.documentElement;
            wavesurfer.setOptions({
                waveColor: getComputedStyle(root).getPropertyValue('--accent-secondary'),
                progressColor: getComputedStyle(root).getPropertyValue('--accent-primary'),
                backgroundColor: getComputedStyle(root).getPropertyValue('--accent-srf'),
                cursorColor: getComputedStyle(root).getPropertyValue('--accent-txt')
            });
            appSettings.theme = theme.id;
            saveSettings();
        }

        if (document.startViewTransition) document.startViewTransition(update);
        else update();
    }

    const getIcon = (el) => {
        const path = document.querySelector(el).querySelector('path').cloneNode();
        path.removeAttribute('fill');
        path.style.fill = 'var(--accent-primary)';
        return path.outerHTML;
    }

    const panels = {
        theme: {
            el: document.querySelector('.theme-overlay'),
            title: 'Theme Selection',
            icon: getIcon('#themeSwitch')
        },
        import: {
            el: document.querySelector('.import-overlay'),
            title: 'Import Options',
            icon: getIcon('#importBtn')
        },
        export: {
            el: document.querySelector('.export-overlay'),
            title: 'Export Options',
            icon: getIcon('#exportELRC')
        },
        meta: {
            el: document.querySelector('.meta-overlay'),
            title: 'Metadata',
            icon: getIcon('.track-info-header')
        },
        settings: {
            el: document.querySelector('.settings-overlay'),
            title: 'Settings',
            icon: getIcon('#settingsBtn')
        },
        view: {
            el: document.querySelector('.view-overlay'),
            title: 'Switch View',
            icon: '<path d="M12.075 15.475q-.725.025-1.387-.237t-1.163-.763t-.763-1.125t-.262-1.325q0-.25.025-.487t.1-.463q.1-.3-.012-.6t-.388-.425q-.3-.125-.587 0t-.388.425q-.125.375-.187.75T7 12q0 1 .388 1.913t1.087 1.612q.675.7 1.588 1.075t1.887.4l-.425.425q-.225.225-.225.525t.225.525t.525.225t.525-.225l1.6-1.6q.3-.3.3-.7t-.3-.7l-1.6-1.6q-.225-.225-.525-.225t-.525.225t-.225.525t.225.525zM11.9 8.5q.725 0 1.4.263t1.175.762t.763 1.125t.262 1.325q0 .25-.025.487t-.1.463q-.1.3.013.612t.387.438q.3.125.588 0t.387-.425q.125-.375.188-.763T17 12q0-1-.363-1.912T15.55 8.45q-.7-.7-1.612-1.062t-1.888-.363l.45-.45q.2-.225.2-.525t-.225-.525t-.525-.225t-.525.225l-1.6 1.6q-.3.3-.3.7t.3.7l1.6 1.6q.225.225.525.225t.525-.225t.225-.525t-.225-.525zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" style="fill: var(--accent-primary);"></path>'
        }
    }

    const togglePanel = (p) => {
        Object.values(panels).forEach(p => p.el.classList.remove('is-active'));
        if (activePanel === p || !p) {
            activePanel = null;
            previewHeaderText.textContent = originalHeaderText;
            previewHeaderIcon.innerHTML = originalHeaderIcon;
            document.querySelector('.preview').style.display = '';
        } else {
            activePanel = p;
            const selectedPanel = panels[p];
            selectedPanel.el.classList.add('is-active');
            previewHeaderText.textContent = selectedPanel.title;
            previewHeaderIcon.innerHTML = selectedPanel.icon;
            document.querySelector('.preview').style.display = 'none';
        }
    }

    document.getElementById('themeSwitch').addEventListener('click', () => togglePanel('theme'));
    const exportBtn = document.getElementById('exportELRC');
    exportBtn.classList.add('disabled');
    exportBtn.title = "Please open an audio file first!";
    exportBtn.addEventListener('click', (e) => {
        if (e.currentTarget.classList.contains('disabled')) return;
        togglePanel('export');
    });
    document.getElementById('metaBtn').addEventListener('click', () => togglePanel('meta'));
    document.getElementById('settingsBtn').addEventListener('click', () => togglePanel('settings'));
    document.getElementById('previewFormatBtn').addEventListener('click', () => togglePanel('view'));
    document.querySelectorAll('.view-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            appSettings.previewFormat = e.currentTarget.dataset.view;
            saveSettings();
            updatePreviewTitle();
            updatePreview();
            togglePanel(null);
        })
    })

    const lineEndToggle = document.getElementById('lineEndToggle');
    const lineEndToggleCard = document.getElementById('lineEndToggleCard');

    if (lineEndToggle) {
        lineEndToggle.checked = appSettings.trailingTag;
        lineEndToggle.addEventListener('change', (e) => {
            appSettings.trailingTag = e.target.checked;
            saveSettings();
            updatePreview();
        });
    }

    if (lineEndToggleCard && lineEndToggle) {
        lineEndToggleCard.addEventListener('click', (e) => {
            if (e.target !== lineEndToggle) {
                lineEndToggle.checked = !lineEndToggle.checked;
                lineEndToggle.dispatchEvent(new Event('change'));
            }
        });
    }

    const exportHandler = async (type) => {
        if (lineArray.length === 0) {await customAlert("Empty workspace. Add at least one lyric line first before exporting."); return;}

        let data = '';
        let ext = 'lrc';
        if (type === 'srt') {
            data = generateSRT();
            ext = 'srt';
        } else data = generateELRC(false, type);

        if (!data) return;
        let title = 'synced_lyrics';
        if (currTrackName) title = currTrackName.replace(/\.[^/.]+$/, "");
        else {
            const titleInput = document.getElementById('trackTitle').value.trim();
            if (titleInput) title = titleInput;
        }

        await saveFile(data, title, ext);
        togglePanel(null);
    }

    document.getElementById('exportStandard').addEventListener('click', () => exportHandler('standard'));
    document.getElementById('exportEnhanced').addEventListener('click', () => exportHandler('enhanced'));
    document.getElementById('exportSRT').addEventListener('click', () => exportHandler('srt'));

    fetch('themes.json')
        .then(res => res.json())
        .then (themes => {
            themes.forEach((t) => {
                const card = document.createElement('div');
                card.className = 'theme-card';
                for (const [prop,value] of Object.entries(t.colors)) card.style.setProperty(prop,value);
                card.innerHTML = `
                    <div class="theme-circle"></div>
                    <span class="theme-name">${t.name}</span>
                `;
                card.addEventListener('click', () => {
                    applyTheme(t);
                    togglePanel(null);
                });
                themeOverlay.appendChild(card);
            });
            if (appSettings.theme) {
                const found = themes.find(t => t.id === appSettings.theme);
                if (found) applyTheme(found);
            }
        })
        .catch(err => console.error('Error fetching themes.jSON :sob: :', err));

    const processImport = (text, format) => {
        const lines = text.split('\n');
        const titleInput = document.getElementById('trackTitle');
        const artistInput = document.getElementById('trackArtist');
        const albumInput = document.getElementById('trackAlbum');
        const byInput = document.getElementById('author');
        const offsetInput = document.getElementById('offset');
        lineArray = [];

        const isSRT = lines.some(l => SRT_TIME_REGEX.test(l));
        const isLRC = lines.some(l => LINE_MATCH_REGEX.test(l.trim()) || METADATA_REGEX.test(l.trim()));
        const isRawText = !isSRT && !isLRC;

        if (isSRT) {
            const blocks = text.trim().split(/\r?\n\r?\n/);
            blocks.forEach(b => {
                const blockLines = b.split(/\r?\n/);
                if (blockLines.length >= 3) {
                    const timeMatch = blockLines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
                    if (timeMatch) {
                        const start = parseSRTTime(timeMatch[1]);
                        const end = parseSRTTime(timeMatch[2]);
                        const content = blockLines.slice(2).join('\\n');
                        const newLine = createNewLine(start);
                        newLine.end = end;
                        newLine.text = content;
                        newLine.words = content.split(/\s+/).map(w => ({
                            id: crypto.randomUUID(),
                            time: null,
                            text: w
                        }))
                        lineArray.push(newLine);
                    }
                }
            })
        } else if (isRawText) {
            let lastTime = 0;
            lines.forEach(l => {
                const trimmed = l.trim();
                if (!trimmed) return;
                const newLine = createNewLine(lastTime);
                newLine.text = trimmed;
                newLine.words = trimmed.split(/\s+/).map(w => ({id: crypto.randomUUID(), time: null, text: w}));
                lineArray.push(newLine);
            })
        } else {
            lines.forEach(l => {
                l = l.trim();
                if (!l) return;

                const metaMatch = l.match(METADATA_REGEX);
                if (metaMatch) {
                    if (metaMatch[1] === 'ti') titleInput.value = metaMatch[2];
                    if (metaMatch[1] === 'ar') artistInput.value = metaMatch[2];
                    if (metaMatch[1] === 'al') albumInput.value = metaMatch[2];
                    if (metaMatch[1] === 'by') byInput.value = metaMatch[2];
                    if (metaMatch[1] === 'offset') offsetInput.value = metaMatch[2];
                    titleInput.dispatchEvent(new Event('input', {bubbles:true}));
                    return;
                }

                const lineMatch = l.match(LINE_MATCH_REGEX);
                if (lineMatch) {
                    const lineTime = parseTime(lineMatch[1]);
                    let content = lineMatch[2];

                    if (content.trim() === '') {
                        if (lineArray.length > 0) {
                            const lastLine = lineArray[lineArray.length-1];
                            if (!lastLine.end || lastLine.end <= lastLine.start) {
                                lastLine.end = lineTime;
                                return;
                            }
                        }

                        lineArray.push(createNewLine(lineTime));
                        return;
                    }

                    const newLine = createNewLine(lineTime);
                    WORD_SPLIT_REGEX.lastIndex = 0;
                    let wordMatch;

                    if (content.includes('<') && content.includes('>')) {
                        while ((wordMatch = WORD_SPLIT_REGEX.exec(content)) !== null) newLine.words.push({id: crypto.randomUUID(), time: parseTime(wordMatch[1]), text: wordMatch[2].trim()});
                        if (newLine.words.length > 0) {
                            const lastWord = newLine.words[newLine.words.length - 1];
                            if (lastWord.text === '') {
                                newLine.end = lastWord.time;
                                newLine.words.pop();
                            }
                        }
                    }

                    if (newLine.words.length > 0) newLine.text = newLine.words.map(w => w.text).join(' ');
                    else {
                        newLine.text = content;
                        newLine.words = content.split(/\s+/).map(word => ({id: crypto.randomUUID(), time: null, text: word}));
                    }
                    lineArray.push(newLine);
                }
            })
        }

        currentPlaybackIndex = -1;
        renderWorkspace();
        updatePreview();
        saveImmediately();
    }

    const handleFileImport = async (e, format) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            processImport(text, format);
            togglePanel(null);
        } catch (err) {
            console.error('failed to read file: ', err);
            await customAlert('Failed to read file.');
        } finally {
            e.target.value = '';
        }
    }

    document.getElementById('lrcFileInput').addEventListener('change', (e) => handleFileImport(e, 'lrc'));
    document.getElementById('txtFileInput').addEventListener('change', (e) => handleFileImport(e, 'txt'));
    document.getElementById('srtFileInput').addEventListener('change', (e) => handleFileImport(e, 'srt'));

    document.getElementById('importLRCCard').addEventListener('click', () => document.getElementById('lrcFileInput').click());
    document.getElementById('importTXTCard').addEventListener('click', () => document.getElementById('txtFileInput').click());
    document.getElementById('importSRTCard').addEventListener('click', () => document.getElementById('srtFileInput').click());

    const pasteDialogue = document.getElementById('pasteDialogue');
    const pasteInput = document.getElementById('pasteInput');

    document.getElementById('importPasteCard').addEventListener('click', () => {
        pasteInput.value = '';
        pasteDialogue.showModal();
    })

    document.getElementById('pasteCancelBtn').addEventListener('click', () => pasteDialogue.close());
    document.getElementById('pasteImportBtn').addEventListener('click', () => {
        const text = pasteInput.value.trim();
        if (!text) {
            pasteDialogue.close();
            return;
        }
        processImport(text, 'paste');
        pasteDialogue.close();
        togglePanel(null);
    })

    const sidebarHandler = () => {
        const mobileQuery = window.matchMedia('(max-width: 1024px)');
        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';
        document.body.appendChild(sidebar);
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        sidebar.appendChild(overlay);

        const menuBtn = document.createElement('button');
        menuBtn.className = 'sidebar-btn';
        menuBtn.title = 'Menu';
        menuBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="currentColor" d="M4 18q-.425 0-.712-.288T3 17t.288-.712T4 16h16q.425 0 .713.288T21 17t-.288.713T20 18zm0-5q-.425 0-.712-.288T3 12t.288-.712T4 11h16q.425 0 .713.288T21 12t-.288.713T20 13zm0-5q-.425 0-.712-.288T3 7t.288-.712T4 6h16q.425 0 .713.288T21 7t-.288.713T20 8z"/></svg>`

        const header = document.querySelector('header');
        header.insertBefore(menuBtn, header.firstChild);

        const panels = [
            '.header-btn-wrapper',
            '.track-info',
            '.preview-header',
            '.preview',
            '.theme-overlay',
            '.import-overlay',
            '.export-overlay',
            '.meta-overlay',
            '.settings-overlay',
            '.view-overlay'
        ]
        const nodes = panels.map(p => document.querySelector(p));
        const placeholders = nodes.map((n, i) => {
            const comment = document.createComment(`placeholder-${i}`);
            n.after(comment);
            return comment;
        })

        const mobileHandler = (e) => {
            nodes.forEach((n, i) => {
                if (e.matches) sidebar.appendChild(n);
                else placeholders[i].before(n);
            })
            if (!e.matches) document.body.classList.remove('menu-open');
        }

        mobileQuery.addEventListener('change', mobileHandler);
        mobileHandler(mobileQuery);

        menuBtn.addEventListener('click', () => document.body.classList.add('menu-open'));
        overlay.addEventListener('click', () => document.body.classList.remove('menu-open'));
    }

    sidebarHandler();
});