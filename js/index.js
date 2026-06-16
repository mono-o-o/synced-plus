document.addEventListener('DOMContentLoaded', () => {
    const accentPrimary = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    const accentSecondary = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary');
    const accentSurface = getComputedStyle(document.documentElement).getPropertyValue('--accent-srf');
    const accentText = getComputedStyle(document.documentElement).getPropertyValue('--accent-txt');

    const currTime = document.getElementById('currentTime');
    const duration = document.getElementById('duration');

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '00:00.00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const msec = Math.round((seconds % 1) * 100);
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
            WaveSurfer.Hover.create({
                lineColor: accentText,
                lineWidth: 1,
                labelColor: accentPrimary,
                labelFontSize: 12,
                formatTimeCallback: (seconds) => {
                    return formatTime(seconds);
                }
            }),
            WaveSurfer.Zoom.create({
                exponentialZooming: true,
                maxZoom: 1000
            })
        ]
    });

    const audioFile = document.getElementById('audioFile');
    audioFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const blobURL = URL.createObjectURL(file);
            wavesurfer.load(blobURL);
        }
    });

    wavesurfer.on('ready', () => {
        duration.textContent = formatTime(wavesurfer.getDuration());
        currTime.textContent = formatTime(0);
    });

    const parseTime = (timeString) => {
        const match = timeString.match(/^(\d{2}):(\d{2})\.(\d{2})$/);
        if (!match) return 0;
        return parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
    }

    let animFrameId = null;
    wavesurfer.on('timeupdate', (currentTime) => {
        if (animFrameId) return;
        animFrameId = requestAnimationFrame(() => {
            animFrameId = null;
            currTime.textContent = formatTime(currentTime);

            const lines = document.querySelectorAll('.line-card');
            lines.forEach(line => {
                const start = parseTime(line.querySelector('.line-start').value);
                const end = parseTime(line.querySelector('.line-end').value);
                if (currentTime >= start && currentTime < end) {
                    line.classList.add('current-line');

                    const wordCards = line.querySelectorAll('.word-card');
                    const displaySpans = line.querySelectorAll('.lyric-display span');

                    for (let i = 0; i < wordCards.length; i++) {
                        const wordStart = parseTime(wordCards[i].querySelector('.word-start').value);
                        let wordEnd = end;
                        if (i + 1 < wordCards.length) {
                            const nextWordStart = parseTime(wordCards[i+1].querySelector('.word-start').value);
                            if (nextWordStart > 0) wordEnd = nextWordStart;
                        }
                        const spanEl = displaySpans[i];

                        if (wordStart > 0 && currentTime >= wordStart && currentTime < wordEnd) {
                            wordCards[i].classList.add('active-word-card');
                            if (spanEl) spanEl.classList.add('active-word');
                        } else {
                            wordCards[i].classList.remove('active-word-card');
                            if (spanEl) spanEl.classList.remove('active-word');
                        }
                    }
                } else {
                    line.querySelectorAll('.active-word').forEach(el => el.classList.remove('active-word'));
                    line.querySelectorAll('.active-word-card').forEach(el => el.classList.remove('active-word-card'));
                    line.classList.remove('current-line');
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

    const volumeSlider = document.getElementById('volume');
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {muteBtn.classList.add('vol-full')}

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

    const linesContainer = document.getElementById('lines');
    const addLineBtn = document.getElementById('addLineBtn');
    const setTimeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1.25em" height="1.25em" viewBox="0 0 24 24"><path fill="currentColor" d="m12 11.6l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T10 11.975V8q0-.425.288-.712T11 7t.713.288T12 8zM18 6h-2q-.425 0-.712-.287T15 5t.288-.712T16 4h2V2q0-.425.288-.712T19 1t.713.288T20 2v2h2q.425 0 .713.288T23 5t-.288.713T22 6h-2v2q0 .425-.288.713T19 9t-.712-.288T18 8zM7.488 20.3q-1.638-.7-2.863-1.925T2.7 15.512T2 12t.7-3.512t1.925-2.863T7.488 3.7T11 3q.275 0 .513.013t.512.062q.425 0 .713.288t.287.712t-.288.713t-.712.287q-.275 0-.513-.038T11 5Q8.05 5 6.025 7.025T4 12t2.025 4.975T11 19t4.975-2.025T18 12q0-.425.288-.712T19 11t.713.288T20 12q0 1.875-.7 3.513t-1.925 2.862t-2.863 1.925T11 21t-3.512-.7" /></svg>`

    const enforceFormat = (el) => {
        el.addEventListener('input', (e) => {
            let digits = e.target.value.replace(/\D/g, '');
            digits = digits.substring(0,6);
            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i === 2) formatted += ':';
                if (i === 4) formatted += '.';
                formatted += digits[i];
            }
            e.target.value = formatted;
        })
    }

    addLineBtn.addEventListener('click', () => {
        const existingLines = document.querySelectorAll('.line-card');

        let defaultTime = "00:00.00"
        if (existingLines.length > 0) {
            const lastLine = existingLines[existingLines.length - 1];
            defaultTime = lastLine.querySelector('.line-end').value || '00:00.00';
        }

        const lineCard = document.createElement('div');
        lineCard.className = 'line-card';

        lineCard.innerHTML = `
            <div class="line-main-row">
                <div class="time-wrapper">
                    <div class="time-field" title="Line start time">
                        <input type="text" class="time-input line-start" placeholder="00:00.00" value="${defaultTime}">
                        <button type="button" class="time-btn get-start-btn">${setTimeIcon}</button>
                    </div>
                    <div class="time-field" title="Line end time">
                        <input type="text" class="time-input line-end" placeholder="00:00.00" value="${defaultTime}">
                        <button type="button" class="time-btn get-end-btn">${setTimeIcon}</button>
                    </div>
                </div>
                <div class="lyric-wrapper">
                    <input type="text" class="lyric-input" placeholder="Enter lyric line here...">
                    <div class="lyric-display"></div>
                </div>
                <div class="line-actions">
                    <button type="button" class="action-btn play-line-btn" title="Play line">
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

        const startInput = lineCard.querySelector('.line-start');
        const endInput = lineCard.querySelector('.line-end');
        enforceFormat(startInput);
        enforceFormat(endInput);
        const getStartBtn = lineCard.querySelector('.get-start-btn');
        const getEndBtn = lineCard.querySelector('.get-end-btn');
        const lyricInput = lineCard.querySelector('.lyric-input');
        const playLineBtn = lineCard.querySelector('.play-line-btn');
        const deleteBtn = lineCard.querySelector('.delete-btn');
        const expandBtn = lineCard.querySelector('.expand-btn');
        const displayContainer = lineCard.querySelector('.lyric-display');
        const wordContainer = lineCard.querySelector('.word-sync-container');

        lyricInput.addEventListener('input', (e) => {
            if (/[<>]/.test(e.target.value)) e.target.value = e.target.value.replace(/[<>]/g, '');
        });

        const setTime = (el) => {
            el.value = formatTime(wavesurfer.getCurrentTime());
        }

        const validateStartTime = () => {
            const prevCard = lineCard.previousElementSibling;
            let currStartSec = parseTime(startInput.value);

            if (prevCard && prevCard.classList.contains('line-card')) {
                const prevEndSec = parseTime(prevCard.querySelector('.line-end').value);
                if (currStartSec < prevEndSec) {
                    startInput.value = formatTime(prevEndSec);
                    currStartSec = prevEndSec;
                }
            }

            const currEndSec = parseTime(endInput.value);
            if (currEndSec > 0 && currStartSec > currEndSec) {
                endInput.value = formatTime(currStartSec);
                endInput.dispatchEvent(new Event('blur'));
            }
        }

        const validateEndTime = () => {
            const currStartSec = parseTime(startInput.value);
            let currEndSec = parseTime(endInput.value);

            if (currEndSec > 0 && currEndSec < currStartSec) {
                endInput.value = formatTime(currStartSec);
                currEndSec = currStartSec;
            }

            const nextCard = lineCard.nextElementSibling;
            if (nextCard && nextCard.classList.contains('line-card')) {
                const nextStartInput = nextCard.querySelector('.line-start');
                const nextStartSec = parseTime(nextStartInput.value);
                if (currEndSec > nextStartSec) {
                    nextStartInput.value = formatTime(currEndSec);
                    nextStartInput.dispatchEvent(new Event('blur'));
                }
            }
        }

        startInput.addEventListener('blur', validateStartTime);
        endInput.addEventListener('blur', validateEndTime);

        getStartBtn.addEventListener('click', () => {
            setTime(startInput);
            validateStartTime();
        });
        getEndBtn.addEventListener('click', () => {
            setTime(endInput);
            validateEndTime();
        });

        playLineBtn.addEventListener('click', (e) => {
            const startSec = parseTime(startInput.value);
            if (wavesurfer.getDuration() > 0 && startSec <= wavesurfer.getDuration()) {
                wavesurfer.setTime(startSec);
                wavesurfer.play();
            }
            e.currentTarget.blur();
        });

        deleteBtn.addEventListener('click', () => {lineCard.remove();})

        expandBtn.addEventListener('click', () => {
            const isHidden = wordContainer.style.display === 'none';
            wordContainer.style.display = isHidden ? 'flex' : 'none';
        });

        displayContainer.addEventListener('click', () => {
            lineCard.classList.add('is-editing');
            lyricInput.focus();
        });

        lyricInput.addEventListener('blur', () => {
            lineCard.classList.remove('is-editing');
        });

        lyricInput.addEventListener('change', () => {
            const text = lyricInput.value.trim();
            const words = text ? text.split(/\s+/) : [];

            wordContainer.innerHTML = '';
            displayContainer.innerHTML = '';

            words.forEach(word => {
                const displaySpan = document.createElement('span');
                displaySpan.textContent = word;
                displayContainer.appendChild(displaySpan);

                const wordCard = document.createElement('div');
                wordCard.className = 'word-card';
                wordCard.innerHTML = `
                    <span class="word-text" title="Jump to word">${word}</span>
                    <div class="time-field">
                        <input type="text" class="time-input word-start" placeholder="00:00.00">
                        <button type="button" class="time-btn get-word-btn">${setTimeIcon}</button>
                    </div>
                `;

                const wordTimeInput = wordCard.querySelector('.word-start');
                const getWordBtn = wordCard.querySelector('.get-word-btn');
                enforceFormat(wordTimeInput);

                getWordBtn.addEventListener('click', () => setTime(wordTimeInput));

                wordCard.addEventListener('click', (e) => {
                    if (e.target.closest('input') || e.target.closest('button')) return;
                    const wordStartSec = parseTime(wordTimeInput.value);
                    if (wordStartSec > 0 && wavesurfer.getDuration() > 0) {
                        wavesurfer.setTime(wordStartSec);
                        wavesurfer.play();
                    }
                })

                wordContainer.appendChild(wordCard);
            });
        });
        linesContainer.appendChild(lineCard);
    });
});