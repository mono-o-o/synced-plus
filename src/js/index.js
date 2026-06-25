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
                wsRegions.addRegion({
                    id: l.id,
                    start: startSec,
                    end: endSec,
                    color: `rgb(from var(--accent-txt) r g b / 0.2)`,
                    drag: false,
                    resize: true
                })
            }
        })
    }

    wsRegions.on('region-updated', (r) => {
        const lineData = lineArray.find(l => l.id === r.id);
        if (lineData) {
            lineData.start = formatTime(r.start);
            lineData.end = formatTime(r.end);
            renderWorkspace();
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

    linesContainer.addEventListener('mousedown', (e) => {
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
        }

        if (e.target.closest('.get-end-btn')) {
            lineData.end = formatTime(wavesurfer.getCurrentTime());
            validateTimes(lineArray.findIndex(l => l.id === card.dataset.id));
            renderWorkspace();
        }

        if (e.target.closest('.delete-btn')) {
            if (confirm("Are you sure you want to delete this line?")) {
                lineArray = lineArray.filter(l => l.id !== card.dataset.id);
                renderWorkspace();
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

    const audioFile = document.getElementById('audioFile');
    audioFile.addEventListener('click', (e) => {
        const existingLines = document.querySelectorAll('.line-card');
        if (existingLines.length > 0) {
            if (confirm("Workspace is not empty. Load a new audio file?")) {
                lineArray = [];
                renderWorkspace();
                if (wavesurfer.getDuration() > 0) wavesurfer.setTime(0);
                document.dispatchEvent(new Event('input', {bubbles:true}));
            } else e.preventDefault();
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
    wavesurfer.on('ready', () => {
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
        } else if (e.code === 'ArrowLeft') document.getElementById('rewindBtn').click();
        else if (e.code === 'ArrowRight') document.getElementById('fastForwardBtn').click();
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
        elrc += `[length:${length}]\n[re:synced+ (https://github.com/mono-o-o/synced-plus)]\n[ve:v1.0.2]\n\n`;

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

    document.addEventListener('input', updatePreview);
    document.addEventListener('click', updatePreview);
    document.addEventListener('focusout', updatePreview);

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

    const paletteIconHTML = `<path style="fill: var(--accent-primary)" d="M12 22q-2.05 0-3.875-.788t-3.187-2.15t-2.15-3.187T2 12q0-2.075.813-3.9t2.2-3.175T8.25 2.788T12.2 2q2 0 3.775.688t3.113 1.9t2.125 2.875T22 11.05q0 2.875-1.75 4.413T16 17h-1.85q-.225 0-.312.125t-.088.275q0 .3.375.863t.375 1.287q0 1.25-.687 1.85T12 22m-4.425-9.425Q8 12.15 8 11.5t-.425-1.075T6.5 10t-1.075.425T5 11.5t.425 1.075T6.5 13t1.075-.425m3-4Q11 8.15 11 7.5t-.425-1.075T9.5 6t-1.075.425T8 7.5t.425 1.075T9.5 9t1.075-.425m5 0Q16 8.15 16 7.5t-.425-1.075T14.5 6t-1.075.425T13 7.5t.425 1.075T14.5 9t1.075-.425m3 4Q19 12.15 19 11.5t-.425-1.075T17.5 10t-1.075.425T16 11.5t.425 1.075T17.5 13t1.075-.425M12 20q.225 0 .363-.125t.137-.325q0-.35-.375-.825T11.75 17.3q0-1.05.725-1.675T14.25 15H16q1.65 0 2.825-.962T20 11.05q0-3.025-2.312-5.038T12.2 4Q8.8 4 6.4 6.325T4 12q0 3.325 2.338 5.663T12 20"/>`;

    const applyTheme = (theme) => {
        const root = document.documentElement;
        for (const [prop,value] of Object.entries(theme.colors)) root.style.setProperty(prop,value);

        const newPrimary = getComputedStyle(root).getPropertyValue('--accent-primary');
        const newSecondary = getComputedStyle(root).getPropertyValue('--accent-secondary');
        const newSrf = getComputedStyle(root).getPropertyValue('--accent-srf');
        const newText = getComputedStyle(root).getPropertyValue('--accent-txt');

        wavesurfer.setOptions({
            waveColor: newSecondary,
            progressColor: newPrimary,
            backgroundColor: newSrf,
            cursorColor: newText
        });

        localStorage.setItem('theme', theme.id);
    }

    let isThemeMenuOpen = false;
    let isExportMenuOpen = false;
    let isMetaMenuOpen = false;

    const exportOverlay = document.querySelector('.export-overlay');
    const metaOverlay = document.querySelector('.meta-overlay');
    const exportIconHTML = `<path style="fill: var(--accent-primary)" d="m12 16l-5-5l1.4-1.45l2.6 2.6V4h2v8.15l2.6-2.6L17 11zm-6 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/>`;
    const metaIconHTML = `<path style="fill: var(--accent-primary)" d="M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" />`;

    const toggleThemeMenu = (s) => {
        isThemeMenuOpen = s !== undefined ? s : !isThemeMenuOpen;
        if (isThemeMenuOpen) {
            if (isExportMenuOpen) toggleExportMenu(false);
            if (isMetaMenuOpen) toggleMetaMenu(false);
            themeOverlay.classList.add('is-active');
            previewHeaderText.textContent = 'Theme Selection';
            previewHeaderIcon.innerHTML = paletteIconHTML;
        } else {
            themeOverlay.classList.remove('is-active');
            previewHeaderText.textContent = originalHeaderText;
            previewHeaderIcon.innerHTML = originalHeaderIcon;
        }
        document.querySelector('.preview').style.display = (isThemeMenuOpen || isExportMenuOpen || isMetaMenuOpen) ? 'none' : '';
    }

    const toggleExportMenu = (s) => {
        isExportMenuOpen = s !== undefined ? s : !isExportMenuOpen;
        if (isExportMenuOpen) {
            if (isThemeMenuOpen) toggleThemeMenu(false);
            if (isMetaMenuOpen) toggleMetaMenu(false);
            exportOverlay.classList.add('is-active');
            previewHeaderText.textContent = 'Export Options';
            previewHeaderIcon.innerHTML = exportIconHTML;
        } else {
            exportOverlay.classList.remove('is-active');
            previewHeaderText.textContent = originalHeaderText;
            previewHeaderIcon.innerHTML = originalHeaderIcon;
        }
        document.querySelector('.preview').style.display = (isThemeMenuOpen || isExportMenuOpen || isMetaMenuOpen) ? 'none' : '';
    }

    const toggleMetaMenu = (s) => {
        isMetaMenuOpen = s !== undefined ? s : !isMetaMenuOpen;
        if (isMetaMenuOpen) {
            if (isThemeMenuOpen) toggleThemeMenu(false);
            if (isExportMenuOpen) toggleExportMenu(false);
            metaOverlay.classList.add('is-active');
            previewHeaderText.textContent = 'Metadata';
            previewHeaderIcon.innerHTML = metaIconHTML;
        } else {
            metaOverlay.classList.remove('is-active');
            previewHeaderText.textContent = originalHeaderText;
            previewHeaderIcon.innerHTML = originalHeaderIcon;
        }
        document.querySelector('.preview').style.display = (isThemeMenuOpen || isExportMenuOpen || isMetaMenuOpen) ? 'none' : '';
    }

    document.getElementById('exportELRC').addEventListener('click', () => toggleExportMenu());
    document.getElementById('metaBtn').addEventListener('click', () => toggleMetaMenu());

    const exportHandler = (type) => {
        const data = generateELRC(false, type);
        if (!data) return;
        const audio = document.getElementById('audioFile');
        let title = 'synced_lyrics';
        if (audio.files.length > 0) title = audio.files[0].name.replace(/\.[^/.]+$/, "");
        else {
            const titleInput = document.getElementById('trackTitle').value.trim();
            if (titleInput) title = titleInput;
        }

        saveFile(data, title);
        toggleExportMenu(false);
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
                    toggleThemeMenu(false);
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

    themeSwitchBtn.addEventListener('click', () => toggleThemeMenu());

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