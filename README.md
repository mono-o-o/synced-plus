# <img src="src/img/synced-plus-logo-full.png" style="height: 3rem"></img>

A minimal, completely local, cross-platform, and browser compatible Enhanced LRC creator. Simply import your audio and optional LRC/TXT, and start syncing lyrics line-by-line and/or word-by-word.

## Screenshots

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/d8b1911c-3a4a-419e-be73-2b8a4bb706f9" /></td>
    <td><img src="https://github.com/user-attachments/assets/e01c62c4-85ae-4bdb-9417-c62e14f5f4ce" /></td>
  </tr>
  <tr align="center">
    <td>Workspace</td>
    <td>Themes</td>
  </tr>
</table>

## Features

### <strong>Specifically for ELRC</strong>

Designed to create Enhanced LRC, handling line-by-line, word-by-word timestamping.

### <strong>Completely Offline</strong>

Works completely within your system, does not send any data into a server.

### <strong>Interactive Waveform</strong>

Uses wavesurfer.js to draw a waveform that acts as the audio timeline. Uses the hover and zoom plugins for more precise timestamping. Includes playback buttons, too, obviously.

### <strong>Smart File Import</strong>

Creating an LRC only requires you to import your audio file. However, you can also import your own ELRC/LRC and TXT for resuming progress or ease of use. Uses jsmediatags to automatically read and write the metadata tags of your audio into the LRC file.

### <strong>Smart Time Field Setting</strong>

Prevents time fields from being set to illegal values that will return errors by adjusting other fields accordingly.

### <strong>Live Preview</strong>

Watch your ELRC file compile in realtime in a preview sidebar.

### <strong>Themes !!!!</strong>

Choose from a selection of colour palettes that I totally do not use in my IDEs.

## How to Use

1. <strong>Load Audio</strong>: Click on the <strong>Open Audio</strong> button to load a track. Metadata input fields will automatically be filled if your audio files have them.
2. <strong>Load Lyrics / Add Lines</strong>: Click on the <strong>Open LRC/TXT</strong> button to load an existing ELRC/LRC or TXT file.

   In the case of importing a TXT file, synced+ will read per line and add a lyric line card in the main workspace for each.

   Alternatively, you can opt not to import a text/lrc file and manually add lyric lines yourself.

3. <strong>Sync Lines / Words</strong>: Use the timestamp button inside a time field to set its value to the current playback time. To sync words, click on the expand button to see the word container. When a time has been set for a word, clicking on the word jumps audio playback to its time.

   Line end timestamps create a new, empty line in the LRC file, a common practice in LRC creation.

4. <strong>Export</strong>: Click on the <strong>Export</strong> button to download your fully formatted .lrc file.

## Built With

synced+ is written in vanilla HTML/CSS/JS, but it does use two crucial libraries:

* <a href="https://wavesurfer.xyz">wavesurfer.js</a> - Waveform rendering, playback controls, current playback time fetching.
* <a href="https://github.com/aadsm/jsmediatags">jsmediatags</a> - Reading and writing of audio metadata tags for files supported by the library.

Additionally, it uses <a href="https://v2.tauri.app">Tauri</a> to work as a desktop application.

## License

synced+ is licensed under the GNU AGPLv3 License. See the [LICENSE](LICENSE) file for details.

For full legal notices, copyright, disclosures, and open-source attributions regarding the assets used, see [LICENSES.md](LICENSES.md).
