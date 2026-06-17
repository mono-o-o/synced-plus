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
    audioFile.addEventListener('click', (e) => {
        const existingLines = document.querySelectorAll('.line-card');
        if (existingLines.length > 0) {
            if (confirm("Workspace is not empty. Load a new audio file?")) {
                existingLines.forEach(l => l.remove());
                if (wavesurfer.getDuration() > 0) wavesurfer.setTime(0);
                document.dispatchEvent(new Event('input', {bubbles:true}));
            } else e.preventDefault();
        }
    })

    audioFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const blobURL = URL.createObjectURL(file);
            wavesurfer.load(blobURL);
            window.jsmediatags.read(file, {
                onSuccess: function(tag) {
                    const tags = tag.tags;
                    if (tags.title) document.getElementById('trackTitle').value = tags.title;
                    if (tags.artist) document.getElementById('trackArtist').value = tags.artist;
                    if (tags.album) document.getElementById('trackAlbum').value = tags.album;
                    document.getElementById('trackTitle').dispatchEvent(new Event('input', {bubbles:true}));
                }
            })
        }
    });

    wavesurfer.on('ready', () => {
        duration.textContent = formatTime(wavesurfer.getDuration());
        currTime.textContent = formatTime(0);
        addLineBtn.disabled = false;
        addLineBtn.removeAttribute('title');
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

            document.querySelectorAll('.active-preview-word').forEach(w => w.classList.remove('active-preview-word'));

            const lines = document.querySelectorAll('.line-card');
            lines.forEach((line,index) => {
                const start = parseTime(line.querySelector('.line-start').value);
                const end = (index + 1 < lines.length) ? parseTime(lines[index+1].querySelector('.line-start').value) : wavesurfer.getDuration();
                if (currentTime >= start && currentTime < end) {
                    line.classList.add('current-line');

                    const wordCards = line.querySelectorAll('.word-card');
                    const displaySpans = line.querySelectorAll('.lyric-display span');

                    const prevLineSpan = document.getElementById(`prev-l${index}`);
                    if (prevLineSpan && wordCards.length === 0) prevLineSpan.classList.add('active-preview-word');

                    for (let i = 0; i < wordCards.length; i++) {
                        let activeTimestamp = -1;
                        for (let i = wordCards.length - 1; i >= 0; i--) {
                            const wsStr = wordCards[i].querySelector('.word-start').value.trim();
                            if (wsStr !== '') {
                                const ws = parseTime(wsStr);
                                if (currentTime >= ws) {
                                    activeTimestamp = ws;
                                    break;
                                }
                            }
                        }

                        for (let i = 0; i < wordCards.length; i++) {
                            const wsStr = wordCards[i].querySelector('.word-start').value.trim();
                            const spanEl = displaySpans[i];

                            if (wsStr !== '' && parseTime(wsStr) === activeTimestamp) {
                                wordCards[i].classList.add('active-word-card');
                                if (spanEl) spanEl.classList.add('active-word');
                                const prevWordSpan = document.getElementById(`prev-l${index}-w${i}`);
                                if (prevWordSpan) prevWordSpan.classList.add('active-preview-word');
                            } else {
                                wordCards[i].classList.remove('active-word-card');
                                if (spanEl) spanEl.classList.remove('active-word');
                            }
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

    const linesContainer = document.getElementById('lines');
    const addLineBtn = document.getElementById('addLineBtn');
    addLineBtn.disabled = true;
    addLineBtn.title = "Please open an audio file first!";
    const setTimeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1.25em" height="1.25em" viewBox="0 0 24 24"><path fill="currentColor" d="m12 11.6l2.5 2.5q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-2.8-2.8q-.15-.15-.225-.337T10 11.975V8q0-.425.288-.712T11 7t.713.288T12 8zM18 6h-2q-.425 0-.712-.287T15 5t.288-.712T16 4h2V2q0-.425.288-.712T19 1t.713.288T20 2v2h2q.425 0 .713.288T23 5t-.288.713T22 6h-2v2q0 .425-.288.713T19 9t-.712-.288T18 8zM7.488 20.3q-1.638-.7-2.863-1.925T2.7 15.512T2 12t.7-3.512t1.925-2.863T7.488 3.7T11 3q.275 0 .513.013t.512.062q.425 0 .713.288t.287.712t-.288.713t-.712.287q-.275 0-.513-.038T11 5Q8.05 5 6.025 7.025T4 12t2.025 4.975T11 19t4.975-2.025T18 12q0-.425.288-.712T19 11t.713.288T20 12q0 1.875-.7 3.513t-1.925 2.862t-2.863 1.925T11 21t-3.512-.7" /></svg>`

    const enforceFormat = (el) => {
        el.addEventListener('input', (e) => {
            let digits = e.target.value.replace(/\D/g, '');
            digits = digits.substring(0,6);
            let formatted = '';
            for (let i = 0; i < digits.length; i++) {
                if (i === 2) {
                    formatted += ':';
                    if (parseInt(digits[i]) > 5) {
                        digits = digits.substring(0,i) + '5' + digits.substring(i+1);
                    }
                }
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
            const lastWords = lastLine.querySelectorAll('.word-start');
            defaultTime = lastWords.length > 0 ? lastWords[lastWords.length-1].value : lastLine.querySelector('.line-start').value || "00:00.00";
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
        enforceFormat(startInput);
        const getStartBtn = lineCard.querySelector('.get-start-btn');
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
            const duration = wavesurfer.getDuration();
            const nextCard = lineCard.nextElementSibling;

            if (duration > 0 && currStartSec > duration) {
                currStartSec = duration;
                startInput.value = formatTime(duration);
            }

            if (prevCard && prevCard.classList.contains('line-card')) {
                const prevWords = prevCard.querySelectorAll('.word-start');
                const prevLimit = prevWords.length > 0 ? parseTime(prevWords[prevWords.length-1].value) : parseTime(prevCard.querySelector('.line-start').value);
                if (currStartSec < prevLimit) {
                    startInput.value = formatTime(prevLimit);
                    currStartSec = prevLimit;
                }
            }

            const firstWord = lineCard.querySelector('.word-start');
            if (firstWord) {
                firstWord.value = formatTime(currStartSec);
                firstWord.dispatchEvent(new Event('blur'));
            }

            if (nextCard && nextCard.classList.contains('line-card')) {
                const nextStartInput = nextCard.querySelector('.line-start');
                if (currStartSec > parseTime(nextStartInput.value)) {
                    nextStartInput.value = formatTime(currStartSec);
                    nextStartInput.dispatchEvent(new Event('blur'));
                }
            }
        }

        startInput.addEventListener('blur', validateStartTime);
        getStartBtn.addEventListener('click', () => {
            setTime(startInput);
            validateStartTime();
        });

        playLineBtn.addEventListener('click', (e) => {
            const startSec = parseTime(startInput.value);
            if (wavesurfer.getDuration() > 0 && startSec <= wavesurfer.getDuration()) {
                wavesurfer.setTime(startSec);
                wavesurfer.play();
            }
            e.currentTarget.blur();
        });

        deleteBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to delete this line?")) {
                lineCard.remove();
                document.dispatchEvent(new Event('input', {bubbles:true}))
            }
        });

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

            words.forEach((word, index) => {
                const defaultWordTime = index === 0 ? startInput.value : '';
                const displaySpan = document.createElement('span');
                displaySpan.textContent = word;
                displayContainer.appendChild(displaySpan);

                const wordCard = document.createElement('div');
                wordCard.className = 'word-card';
                wordCard.title = `Jump to word`;
                wordCard.innerHTML = `
                    <span class="word-text" title="Jump to word">${word}</span>
                    <div class="time-field">
                        <input type="text" class="time-input word-start" placeholder="00:00.00" value="${defaultWordTime}">
                        <button type="button" class="time-btn get-word-btn">${setTimeIcon}</button>
                    </div>
                `;

                const wordTimeInput = wordCard.querySelector('.word-start');
                const getWordBtn = wordCard.querySelector('.get-word-btn');
                enforceFormat(wordTimeInput);

                const validateWordTime = () => {
                    let wordSec = parseTime(wordTimeInput.value);
                    const lineStartSec = parseTime(startInput.value);
                    const nextCard = lineCard.nextElementSibling;
                    const duration = wavesurfer.getDuration();

                    if (duration > 0 && wordSec > duration) {
                        wordSec = duration;
                        wordTimeInput.value = formatTime(duration);
                    }

                    const prevWord = wordCard.previousElementSibling;
                    if (prevWord && prevWord.classList.contains('word-card')) {
                        const prevWordSec = parseTime(prevWord.querySelector('.word-start').value);
                        if (wordSec< prevWordSec) {
                            wordSec = prevWordSec;
                            wordTimeInput.value = formatTime(prevWordSec);
                        }
                    } else if (wordSec < lineStartSec) {
                        wordSec = lineStartSec;
                        wordTimeInput.value = formatTime(lineStartSec);
                    }

                    const nextWord = wordCard.nextElementSibling;
                    if (nextWord && nextWord.classList.contains('word-card')) {
                        const nextWordInput = nextWord.querySelector('.word-start');
                        if (wordSec > parseTime(nextWordInput.value)) {
                            nextWordInput.value = formatTime(wordSec);
                            nextWordInput.dispatchEvent(new Event('blur'));
                        }
                    } else if (nextCard && nextCard.classList.contains('line-card')) {
                        const nextStartInput = nextCard.querySelector('.line-start');
                        if (wordSec > parseTime(nextStartInput.value)) {
                            nextStartInput.value = formatTime(wordSec);
                            nextStartInput.dispatchEvent(new Event('blur'));
                        }
                    }
                }

                wordTimeInput.addEventListener('blur', validateWordTime);
                getWordBtn.addEventListener('click', () => {
                    setTime(wordTimeInput);
                    validateWordTime();
                });

                wordCard.addEventListener('click', (e) => {
                    if (e.target.closest('input') || e.target.closest('button')) return;
                    const wordStartSec = parseTime(wordTimeInput.value);
                    if (wordStartSec >= 0 && wavesurfer.getDuration() > 0) {
                        wavesurfer.setTime(wordStartSec);
                        wavesurfer.play();
                    }
                })

                wordContainer.appendChild(wordCard);
            });
        });
        linesContainer.appendChild(lineCard);
    });

    const previewContainer = document.querySelector('.preview')

    const generateELRC = (forPreview = false) => {
        const title = document.getElementById('trackTitle').value.trim();
        const artist = document.getElementById('trackArtist').value.trim();
        const album = document.getElementById('trackAlbum').value.trim();

        let elrc = '';
        if (title) elrc += `[ti:${title}]\n`;
        if (artist) elrc += `[ar:${artist}]\n`;
        if (album) elrc += `[al:${album}]\n`;

        document.querySelectorAll('.line-card').forEach((l, lineI) => {
            const start = l.querySelector('.line-start').value;
            const words = l.querySelectorAll('.word-card');

            if (words.length > 0) {
                let lineStr = `[${start}]`;
                words.forEach((w, wordI) => {
                    const time = w.querySelector('.word-start').value.trim();
                    const text = w.querySelector('.word-text').textContent;
                    if (forPreview) lineStr += `<span id="prev-l${lineI}-w${wordI}">${time ? `&lt;${time}&gt;` : ''}${text}</span> `;
                    else lineStr += `${time ? `<${time}>` : ''}${text} `;
                });
                elrc += lineStr.trimEnd() + '\n';
            } else {
                const text = l.querySelector('.lyric-input').value.trim();
                if (text) {
                    if (forPreview) elrc += `<span id="prev-l${lineI}">[${start}]${text}</span>\n`;
                    else elrc += `[${start}]${text}\n`;
                }
            }
        });
        return elrc;
    }

    const updatePreview = () => previewContainer.innerHTML = generateELRC(true);

    document.addEventListener('input', updatePreview);
    document.addEventListener('click', updatePreview);
    document.addEventListener('focusout', updatePreview);

    document.getElementById('exportELRC').addEventListener('click', () => {
        const data = generateELRC();
        if (!data) return;
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const title = document.getElementById('trackTitle').value.trim() || 'synced_lyrics';
        a.download = `${title}.lrc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});