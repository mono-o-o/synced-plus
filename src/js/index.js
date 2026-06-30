document.addEventListener('DOMContentLoaded', () => {
    const accentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    const accentSecondary = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary');
    const accentSurface = getComputedStyle(document.documentElement).getPropertyValue('--accent-srf');
    const accentText = getComputedStyle(document.documentElement).getPropertyValue('--accent-txt');

    const currTime = document.getElementById('currentTime');
    const duration = document.getElementById('duration');

    let loadedAudio = null;

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '00:00.00';
        const totalMsec = Math.round(seconds * 100);
        const mins = Math.floor(totalMsec / 6000);
        const secs = Math.floor((totalMsec % 6000) / 100);
        const msec = totalMsec % 100;
        if (msec === 100) return formatTime(seconds + 1);
        const fMins = String(mins).padStart(2, '0');
        const fSecs = String(secs).padStart(2, '0');
        const fMsec = String(msec).padStart(2, '0');
        return `${fMins}:${fSecs}.${fMsec}`;
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
            document.getElementById('confirmMsg').textContent = msg;
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

    let wsRegions;
    const wavesurfer = WaveSurfer.create({
        container: '#waveform',
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

    let undoStack = [];
    let redoStack = [];
    const maxHistory = 20;

    const saveProgress = () => {
        const progress = JSON.stringify(lineArray);
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === progress) return;

        undoStack.push(progress);
        if (undoStack.length > maxHistory) undoStack.shift();
        redoStack = [];
        localStorage.setItem('draft', progress);
    }

    const undo = () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        lineArray = JSON.parse(undoStack[undoStack.length - 1]);
        renderWorkspace();
        updatePreview();
    }

    const redo = () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);
        lineArray = JSON.parse(state);
        renderWorkspace();
        updatePreview();
    }

    let lineArray = [];
    const createNewLine = (defaultTime = "00:00.00") => {
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
            const startSec = parseTime(l.start);
            const endSec = parseTime(l.end);
            if (endSec > startSec) {
                const region = wsRegions.addRegion({
                    id: l.id,
                    start: startSec,
                    end: endSec,
                    color: `rgb(from var(--accent-txt) r g b / 0.2)`,
                    drag: false,
                    resize: true
                })
                region.element.title = l.text;
            }
        })
    }

    wsRegions.on('region-updated', (r) => {
        const lineData = lineArray.find(l => l.id === r.id);
        if (lineData) {
            lineData.start = formatTime(r.start);
            lineData.end = formatTime(r.end);
            renderWorkspace();
            saveProgress();
        }
    })

    wsRegions.on('region-clicked', (r, e) => {
        e.stopPropagation();
        wavesurfer.setTime(r.start);
        r.play(true);
    })

    const renderWorkspace = () => {
        const linesContainer = document.getElementById('lines');
        const existingCards = Array.from(linesContainer.querySelectorAll('.line-card'));
        existingCards.forEach(c => {if (!lineArray.find(l => l.id === c.dataset.id)) c.remove();})

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
            if (startInput.value !== line.start) startInput.value = line.start;

            const endInput = lineCard.querySelector('.line-end');
            if (endInput.value !== line.end) endInput.value = line.end;

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
                    if (wordInput.value !== wordData.time) wordInput.value = wordData.time;
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

        const lineData = lineArray.find(l => l.id === card.dataset.id);

        if (e.target.classList.contains('lyric-input')) {
            if (/[<>]/.test(e.target.value)) e.target.value = e.target.value.replace(/[<>]/g, '');
            lineData.text = e.target.value;
            const text = lineData.text.trim();
            const wordStrings = text ? text.split(/\s+/) : [];

            lineData.words = wordStrings.map((w, i) => {
                const existing = lineData.words[i];
                return {
                    id: existing ? existing.id : crypto.randomUUID(),
                    time: existing ? existing.time : (i === 0 ? lineData.start : ''),
                    text: w
                }
            })
            renderWorkspace();
        }

        if (e.target.classList.contains('time-input')) {
            let digits = e.target.value.replace(/\D/g, '');
            digits = digits.substring(0, 6);
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

            if (e.target.classList.contains('line-start')) lineData.start = formatted;
            if (e.target.classList.contains('line-end')) lineData.end = formatted;
            if (e.target.classList.contains('word-start')) {
                const wCard = e.target.closest('.word-card');
                lineData.words.find(w => w.id === wCard.dataset.id).time = formatted;
            }
        }
    });

    linesContainer.addEventListener('focusin', (e) => {
        if (e.target.classList.contains('lyric-input')) {
            const card = e.target.closest('.line-card');
            lineArray.find(l => l.id === card.dataset.id).isEditing = true;
            renderWorkspace();
        }
    });

    const validateTimes = (startIndex) => {
        const duration = wavesurfer.getDuration();
        for (let i = startIndex; i < lineArray.length; i++) {
            const currentLine = lineArray[i];
            const prevLine = lineArray[i-1];
            let startSec = parseTime(currentLine.start);
            let endSec = parseTime(currentLine.end);

            if (duration > 0 && startSec > duration) startSec = duration;
            if (prevLine) {
                const prevEnd = parseTime(prevLine.end);
                if (startSec < prevEnd) startSec = prevEnd;
            }
            if (endSec < startSec) endSec = startSec;
            if (duration > 0 && endSec > duration) endSec = duration;

            currentLine.start = formatTime(startSec);
            currentLine.end = formatTime(endSec);

            if (currentLine.words.length > 0) {
                const firstWordSec = parseTime(currentLine.words[0].time);
                if (currentLine.words[0].time && firstWordSec < startSec) currentLine.words[0].time = currentLine.start;

                currentLine.words.forEach((w, i) => {
                    if (w.time.trim() === '') return;
                    let wordSec = parseTime(w.time);
                    if (duration > 0 && wordSec > duration) wordSec = duration;

                    const prevWord = currentLine.words[i-1];
                    if (prevWord && prevWord.time.trim() !== '') {
                        const prevWordSec = parseTime(prevWord.time);
                        if (wordSec < prevWordSec) wordSec = prevWordSec;
                    } else if (wordSec < startSec) wordSec = startSec;

                    const nextWord = currentLine.words[i+1];
                    if (nextWord && nextWord.time.trim() !== '') {
                        if (wordSec > parseTime(nextWord.time)) {
                            nextWord.time = formatTime(wordSec);
                        }
                    } else if (wordSec > endSec) wordSec = endSec;
                    w.time = formatTime(wordSec);
                })
            }
        }
    }

    linesContainer.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('lyric-input')) {
            const card = e.target.closest('.line-card');
            lineArray.find(l => l.id === card.dataset.id).isEditing = false;
            renderWorkspace();
            saveProgress();
        }

        if (e.target.classList.contains('time-input')) {
            const card = e.target.closest('.line-card');
            const lineIndex = lineArray.findIndex(l => l.id === card.dataset.id);
            if (lineIndex === -1) {
                validateTimes(lineIndex);
                renderWorkspace();
            }
        }
    })

    linesContainer.addEventListener('mousedown', async (e) => {
        const card = e.target.closest('.line-card');
        if (!card) return;
        const lineData = lineArray.find(l => l.id === card.dataset.id);

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
            lineData.start = formatTime(wavesurfer.getCurrentTime());
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            saveProgress();
        }

        if (e.target.closest('.get-end-btn')) {
            lineData.end = formatTime(wavesurfer.getCurrentTime());
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            saveProgress();
        }

        if (e.target.closest('.delete-btn')) {
            if (await customConfirm("Are you sure you want to delete this line?")) {
                lineArray = lineArray.filter(l => l.id !== card.dataset.id);
                renderWorkspace();
                saveProgress();
            }
        }

        if (e.target.closest('.play-line-btn')) {
            if (wavesurfer.getDuration() > 0) {
                const calcedTime = Math.max(0, parseTime(lineData.start) - getOffset());
                wavesurfer.setTime(calcedTime);
                wavesurfer.play();
            }
        }

        if (e.target.closest('.get-word-btn')) {
            const wordCard = e.target.closest('.word-card');
            const word = lineData.words.find(w => w.id === wordCard.dataset.id);
            word.time = formatTime(wavesurfer.getCurrentTime());
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
            saveProgress();
            return;
        }

        const wordCardClick = e.target.closest('.word-card');
        if (wordCardClick && e.target.tagName.toLowerCase() !== 'input') {
            const word = lineData.words.find(w => w.id === wordCardClick.dataset.id);
            const timeStr = word.time.trim() === '' ? lineData.start : word.time;
            if (wavesurfer.getDuration() > 0) {
                const calcedTime = Math.max(0, parseTime(timeStr) - getOffset());
                wavesurfer.setTime(calcedTime);
                wavesurfer.play();
            }
        }
    })

    let skipAudioConfirm = false;
    const audioFile = document.getElementById('audioFile');
    audioFile.addEventListener('click', async (e) => {
        if (skipAudioConfirm) {skipAudioConfirm = false; return;}
        if (lineArray.length > 0) {
            e.preventDefault();
            const proceed = await customConfirm("Workspace is not empty. Load a new audio file?");
            if (proceed) {
                lineArray = [];
                renderWorkspace();
                if (wavesurfer.getDuration() > 0) wavesurfer.setTime(0);
                document.dispatchEvent(new Event('input', {bubbles:true}));
                undoStack = [];
                redoStack = [];
                localStorage.removeItem('draft');
                skipAudioConfirm = true;
                audioFile.click();
            }
        }
    })

    audioFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (loadedAudio) URL.revokeObjectURL(loadedAudio);

            const titleInput = document.getElementById('trackTitle');
            const artistInput = document.getElementById('trackArtist');
            const albumInput = document.getElementById('trackAlbum');

            titleInput.value = ''; artistInput.value = ''; albumInput.value = '';
            titleInput.dispatchEvent(new Event('input', {bubbles:true}));

            loadedAudio = URL.createObjectURL(file);
            wavesurfer.load(loadedAudio);
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
    });

    const importLRC = document.getElementById('importLRC');
    const lrcFile = document.getElementById('lrcFile');
    importLRC.classList.add('disabled');
    importLRC.title = "Please open an audio file first!";
    lrcFile.disabled = true;
    let hoverPlugin;
    wavesurfer.on('ready', async () => {
        duration.textContent = formatTime(wavesurfer.getDuration());
        currTime.textContent = formatTime(0);
        addLineBtn.disabled = false;
        addLineBtn.removeAttribute('title');
        importLRC.classList.remove('disabled');
        importLRC.removeAttribute('title');
        lrcFile.disabled = false;

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

        const savedDraft = localStorage.getItem('draft');
        if (savedDraft && lineArray.length === 0) {
            if (await customConfirm("You have a draft saved. Load it?")) {
                try {
                    lineArray = JSON.parse(savedDraft);
                    undoStack = [savedDraft];
                    redoStack = [];
                    renderWorkspace();
                    updatePreview();
                } catch (err) {
                    console.error('Error loading draft:', err);
                }
            } else {
                localStorage.removeItem('draft');
            }
        }
    });

    const parseTime = (timeString) => {
        const match = timeString.match(/^(\d{2}):(\d{2})\.(\d{2})$/);
        if (!match) return 0;
        return parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
    }

    const getOffset = () => {
        const offsetMs = parseInt(document.getElementById('offset').value) || 0;
        return offsetMs / 1000;
    }

    let animFrameId = null;
    let lastActiveLineId = null;
    wavesurfer.on('timeupdate', (currentTime) => {
        if (animFrameId) return;
        animFrameId = requestAnimationFrame(() => {
            animFrameId = null;
            currTime.textContent = formatTime(currentTime);

            const calcedTime = currentTime + getOffset();

            const activeIndex = lineArray.findIndex(l => {
                const start = parseTime(l.start);
                const end = parseTime(l.end) || wavesurfer.getDuration();
                return calcedTime >= start && calcedTime <= end;
            });

            const activeLine = activeIndex !== -1 ? lineArray[activeIndex] : null;

            if (lastActiveLineId !== (activeLine ? activeLine.id : null)) {
                document.querySelectorAll('.current-line').forEach(el => el.classList.remove('current-line'));
                document.querySelectorAll('.active-word').forEach(el => el.classList.remove('active-word'));
                document.querySelectorAll('.active-word-card').forEach(el => el.classList.remove('active-word-card'));
                document.querySelectorAll('.active-preview-word').forEach(el => el.classList.remove('active-preview-word'));
                lastActiveLineId = activeLine ? activeLine.id : null;
            }

            if (!activeLine) return;
            const lineCard = document.querySelector(`.line-card[data-id="${activeLine.id}"]`);
            if (!lineCard) return;
            lineCard.classList.add('current-line');

            const wordCards = lineCard.querySelectorAll('.word-card');
            const dispSpans = lineCard.querySelectorAll('.lyric-display span');
            const prevLineSpan = document.getElementById(`prev-l${activeIndex}`);
            if (prevLineSpan && activeLine.words.length === 0) prevLineSpan.classList.add('active-preview-word');
            let hasWordTime = activeLine.words.some(w => w.time.trim() !== '');
            let activeTime = -1;

            for (let index = activeLine.words.length-1; index >= 0; index--) {
                if (activeLine.words[index].time.trim() !== '') {
                    const ws = parseTime(activeLine.words[index].time);
                    if (calcedTime >= ws) {activeTime = ws; break;}
                }
            }

            activeLine.words.forEach((wordData, index) => {
                const wsStr = wordData.time.trim();
                const spanEl = dispSpans[index];
                const wordCard = wordCards[index];
                const prevWordSpan = document.getElementById(`prev-l${activeIndex}-w${index}`);
                const highlight = !hasWordTime || (wsStr !== '' && parseTime(wsStr) === activeTime);

                if (highlight) {
                    if (wordCard) wordCard.classList.add('active-word-card');
                    if (spanEl) spanEl.classList.add('active-word');
                    if (prevWordSpan) prevWordSpan.classList.add('active-preview-word');
                } else {
                    if (wordCard) wordCard.classList.remove('active-word-card');
                    if (spanEl) spanEl.classList.remove('active-word');
                    if (prevWordSpan) prevWordSpan.classList.remove('active-preview-word');
                }
            })
        });
    })

    wavesurfer.on('seeking', (currentTime) => {
        currTime.textContent = formatTime(currentTime);
    });

    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.addEventListener('click', () => {wavesurfer.playPause();})
    wavesurfer.on('play', () => {playPauseBtn.classList.add('playing');})
    wavesurfer.on('pause', () => {playPauseBtn.classList.remove('playing');})

    const rewindBtn = document.getElementById('rewindBtn');
    const fastFwdBtn = document.getElementById('fastForwardBtn');
    rewindBtn.addEventListener('click', () => {if (wavesurfer.decodedData) wavesurfer.setTime(Math.max(0, wavesurfer.getCurrentTime() - 1));});
    fastFwdBtn.addEventListener('click', () => {if (wavesurfer.decodedData) wavesurfer.setTime(Math.max(0, wavesurfer.getCurrentTime() + 1))});

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
        if (activeInput === 'input') return;
        if (e.code === 'Space') {
            e.preventDefault();
            document.getElementById('playPauseBtn').click();
        }

        if (e.code === 'ArrowLeft') document.getElementById('rewindBtn').click();
        if (e.code === 'ArrowRight') document.getElementById('fastForwardBtn').click();

        if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            redo();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        }

        if (e.key === '<') document.getElementById('slowDownBtn').click();
        if (e.key === '>') document.getElementById('speedUpBtn').click();
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
        let defaultTime = '00:00.00';
        if (lineArray.length > 0) {
            const lastLine = lineArray[lineArray.length-1];
            defaultTime = lastLine.words.length > 0 ? lastLine.words[lastLine.words.length-1].time : lastLine.start || '00:00.00';
        }
        lineArray.push(createNewLine(defaultTime));
        renderWorkspace();
        saveProgress();
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
        const length = formatTime(wavesurfer.getDuration());
        elrc += `[length:${length}]\n[re:synced+ (https://github.com/mono-o-o/synced-plus)]\n[ve:v1.1.0]\n\n`;

        lineArray.forEach((l, i) => {
            if (l.words.length > 0) {
                let lineStr = `[${l.start}]`;
                l.words.forEach((w, j) => {
                    let time = w.time.trim();
                    if (j === 0 && time === '') time = l.start;
                    if (forPreview) lineStr += `<span id="prev-l${i}-w${j}">${time ? `&lt;${time}&gt;` : ''}${w.text}</span> `;
                    else {
                        if (type === 'enhanced') lineStr += `${time ? `<${time}>` : ''}${w.text} `;
                        else lineStr += `${w.text} `;
                    }
                });
                elrc += lineStr.trimEnd() + '\n';
            } else {
                if (forPreview) elrc += `<span id="prev-l${i}">[${l.start}]${l.text}</span>\n`;
                else elrc += `[${l.start}]${l.text}\n`;
            }

            if (l.end && l.end !== '00:00.00' && l.end !== l.start) {
                if (forPreview) elrc += `<span>[${l.end}]</span>\n`;
                else elrc += `[${l.end}]\n`;
            }
        })
        return elrc;
    }

    const updatePreview = () => previewContainer.innerHTML = generateELRC(true);

    document.addEventListener('input', (e) => {
        if (e.target.closest('#lines') || e.target.closest('.track-info')) updatePreview();
    })

    const saveFile = async (lyricData, filename) => {
        if (window.__TAURI_INTERNALS__) {
            try {
                const filePath = await window.__TAURI_INTERNALS__.invoke('plugin:dialog|save', {
                    options: {
                        defaultPath: `${filename}.lrc`,
                        filters: [{ name: 'lyrics', extensions: ['lrc', 'txt'] }]
                    }
                });

                if (filePath) {
                    await window.__TAURI_INTERNALS__.invoke('plugin:fs|write_text_file', {
                        path: filePath,
                        data: lyricData
                    });
                    alert("File saved successfully!");
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
                a.download = `${filename}.lrc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Downloading failed: ", err);
            }
        }
    }

    const themeSwitchBtn = document.getElementById('themeSwitch');
    const themeOverlay = document.querySelector('.theme-overlay');
    const previewHeader = document.querySelector('.preview-header');
    const previewHeaderText = previewHeader.querySelector('p');
    const previewHeaderIcon = previewHeader.querySelector('svg');

    const originalHeaderText = previewHeaderText.textContent;
    const originalHeaderIcon = previewHeaderIcon.innerHTML;

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
            localStorage.setItem('theme', theme.id);
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
            el: themeOverlay,
            title: 'Theme Selection',
            icon: getIcon('#themeSwitch')
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
        }
    }

    let activePanel = null;

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
    document.getElementById('exportELRC').addEventListener('click', () => togglePanel('export'));
    document.getElementById('metaBtn').addEventListener('click', () => togglePanel('meta'));

    const exportHandler = async (type) => {
        if (!loadedAudio) {await customAlert("Please load an audio file first!"); return;}
        if (lineArray.length === 0) {await customAlert("Empty workspace. Add at least one lyric line first before exporting."); return;}

        const data = generateELRC(false, type);
        if (!data) return;
        const audio = document.getElementById('audioFile');
        let title = 'synced_lyrics';
        if (audio.files.length > 0) title = audio.files[0].name.replace(/\.[^/.]+$/, "");
        else {
            const titleInput = document.getElementById('trackTitle').value.trim();
            if (titleInput) title = titleInput;
        }

        await saveFile(data, title);
        togglePanel(null);
    }

    document.getElementById('exportStandard').addEventListener('click', () => exportHandler('standard'));
    document.getElementById('exportEnhanced').addEventListener('click', () => exportHandler('enhanced'));

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
            const savedThemeId = localStorage.getItem('theme');
            if (savedThemeId) {
                const found = themes.find(t => t.id === savedThemeId);
                if (found) applyTheme(found);
            }
        })
        .catch(err => console.error('Error fetching themes.jSON :sob: :', err));

    const savedThemeId = localStorage.getItem('theme');
    if (savedThemeId) {
        fetch('themes.json')
            .then(res => res.json())
            .then(themes => {
                const found = themes.find(t => t.id === savedThemeId);
                if (found) applyTheme(found);
            }).catch(err => console.error(err));
    }

    document.getElementById('lrcFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const lines = text.split('\n');
        const titleInput = document.getElementById('trackTitle');
        const artistInput = document.getElementById('trackArtist');
        const albumInput = document.getElementById('trackAlbum');
        const byInput = document.getElementById('author');
        const offsetInput = document.getElementById('offset');

        lineArray = [];

        if (file.name.endsWith('.txt')) {
            let lastTime = '00:00.00';
            lines.forEach(l => {
                const trimmed = l.trim();
                if (!trimmed) return;
                const newLine = createNewLine(lastTime);
                newLine.text = trimmed;
                newLine.words = trimmed.split(/\s+/).map(word => ({id: crypto.randomUUID(), time: '', text: word}));
                lineArray.push(newLine);
            });
        } else {
            lines.forEach(l => {
                l = l.trim();
                if (!l) return;

                const metaMatch = l.match(/^\[(ti|ar|al):(.*?)\]$/);
                if (metaMatch) {
                    if (metaMatch[1] === 'ti') titleInput.value = metaMatch[2];
                    if (metaMatch[1] === 'ar') artistInput.value = metaMatch[2];
                    if (metaMatch[1] === 'al') albumInput.value = metaMatch[2];
                    if (metaMatch[1] === 'by') byInput.value = metaMatch[2];
                    if (metaMatch[1] === 'offset') offsetInput.value = metaMatch[2];
                    titleInput.dispatchEvent(new Event('input', {bubbles:true}));
                    return;
                }

                const lineMatch = l.match(/^\[(\d{2}:\d{2}\.\d{2,3})\](.*)$/);
                if (lineMatch) {
                    const lineTime = lineMatch[1];
                    let content = lineMatch[2];

                    if (content.trim() === '') {
                        if (lineArray.length > 0) lineArray[lineArray.length - 1].end = lineTime;
                        return;
                    }

                    const newLine = createNewLine(lineTime);
                    const wordRegex = /<(\d{2}:\d{2}\.\d{2,3})>([^<]*)/g;
                    let wordMatch;

                    if (content.includes('<') && content.includes('>')) {
                        while ((wordMatch = wordRegex.exec(content)) !== null) {
                            newLine.words.push({id: crypto.randomUUID(), time: wordMatch[1], text: wordMatch[2].trim()});
                        }
                    }

                    if (newLine.words.length > 0) newLine.text = newLine.words.map(w => w.text).join(' ');
                    else {
                        newLine.text = content;
                        newLine.words = content.split(/\s+/).map(word => ({id: crypto.randomUUID(), time: '', text: word}));
                    }
                    lineArray.push(newLine);
                }
            })
        }
        renderWorkspace();
        updatePreview();
        e.target.value = '';
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

        const btnWrapper = document.querySelector('.header-btn-wrapper');
        const trackInfo = document.querySelector('.track-info');
        const previewHeader = document.querySelector('.preview-header');
        const preview = document.querySelector('.preview');
        const themeOverlay = document.querySelector('.theme-overlay');
        const exportOverlay = document.querySelector('.export-overlay');
        const metaOverlay = document.querySelector('.meta-overlay');
        const placeholders = {
            btnWrapper: document.createComment('btnWrapper'),
            trackInfo: document.createComment('trackInfo'),
            previewHeader: document.createComment('previewHeader'),
            preview: document.createComment('preview'),
            themeOverlay: document.createComment('themeOverlay'),
            exportOverlay: document.createComment('exportOverlay'),
            metaOverlay: document.createComment('metaOverlay')
        }

        btnWrapper.after(placeholders.btnWrapper);
        trackInfo.after(placeholders.trackInfo);
        previewHeader.after(placeholders.previewHeader);
        preview.after(placeholders.preview);
        themeOverlay.after(placeholders.themeOverlay);
        exportOverlay.after(placeholders.exportOverlay);
        metaOverlay.after(placeholders.metaOverlay);

        const mobileHandler = (e) => {
            if (e.matches) {
                sidebar.appendChild(btnWrapper);
                sidebar.appendChild(trackInfo);
                sidebar.appendChild(previewHeader);
                sidebar.appendChild(preview);
                sidebar.appendChild(themeOverlay);
                sidebar.appendChild(exportOverlay);
                sidebar.appendChild(metaOverlay);
            } else {
                placeholders.btnWrapper.before(btnWrapper);
                placeholders.trackInfo.before(trackInfo);
                placeholders.previewHeader.before(previewHeader);
                placeholders.preview.before(preview);
                placeholders.themeOverlay.before(themeOverlay);
                placeholders.exportOverlay.before(exportOverlay);
                placeholders.metaOverlay.before(metaOverlay);
                document.body.classList.remove('menu-open');
            }
        }

        mobileQuery.addEventListener('change', mobileHandler);
        mobileHandler(mobileQuery);

        menuBtn.addEventListener('click', () => document.body.classList.add('menu-open'));
        overlay.addEventListener('click', () => document.body.classList.remove('menu-open'));
    }

    sidebarHandler();
});