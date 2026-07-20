<div align="center">

# <img src="src/img/synced-plus-logo-full.png" style="height: 3rem"></img>

A minimal, completely local, cross-platform, and browser-compatible Enhanced LRC creator. Simply import your audio and optional LRC/TXT and start syncing lyrics line-by-line and/or word-by-word.

<br>

## Screenshots

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/f19ebc27-1b43-4af7-b46d-e3dae767d527" /></td>
    <td><img src="https://github.com/user-attachments/assets/4380c3c4-d4de-4876-bfcc-4e4496e9e018" /></td>
  </tr>
  <tr align="center">
    <td>Workspace</td>
    <td>Themes</td>
  </tr>
</table>

</div>

<br>

## Features

- ### <strong>Specifically for ELRC</strong>
  Designed to create Enhanced LRC, handling line-by-line, word-by-word timestamping.

- ### <strong>Completely Offline</strong>
  Works completely within your system, does not send any data into a server.

- ### <strong>Interactive Waveform</strong>
  Uses wavesurfer.js to draw a waveform that acts as the audio timeline. Uses the hover and zoom plugins for more precise timestamping, and regions for visual representation of lyric lines.

- ### <strong>Smart File Import</strong>
  Creating an LRC only requires you to import your audio file. However, you can also import your own ELRC/LRC, TXT, or paste from the clipboard (which automatically checks if input is lrc/plaintext) for resuming progress or ease of use. Uses jsmediatags to automatically read and write the metadata tags of your audio into the LRC file.

- ### <strong>Smart Time Field Setting</strong>
  Prevents time fields from being set to illegal values that will return errors by adjusting other fields accordingly.

- ### <strong>Live Preview</strong>
  Watch your ELRC file compile in realtime in a preview sidebar.

- ### <strong>Themes !!!!</strong>
  Choose from a selection of colour palettes that I totally do not use in my IDEs.

<br>

## How to Use

1. <strong>Load Audio</strong>: Click on the <strong>Open Audio</strong> button to load a track. Metadata input fields will automatically be filled if your audio files have them.
2. <strong>Load Lyrics / Add Lines</strong>: Click on the <strong>Open LRC/TXT</strong> button to load an existing ELRC/LRC or TXT file.

   If importing plaintext, synced+ will read per line and add a lyric line card in the main workspace for each.

   Alternatively, you can opt not to import any text entirely and manually add each lyric line yourself.

3. <strong>Sync Lines / Words</strong>: Use the timestamp button inside a time field to set its value to the current playback time. To sync words, click on the Expand button to see the word container. When a time has been set for a word, clicking on the word jumps audio playback to its time.

   Line end timestamps create a new, empty line in the LRC file, a common practice in LRC creation.

4. <strong>Export</strong>: Click on the <strong>Export</strong> button to choose your preferred format and download your .lrc file.

<br>

<table align="center">
   <thead>
       <tr><th colspan="2"><strong>Hotkeys</strong></th></tr>
   </thead>
   <tbody>
       <tr>
          <td><strong>Space</strong></td>
          <td>Play/Pause</td>
       </tr>
       <tr>
          <td><strong>Left/Right Arrow</strong></td>
          <td>Jump 1 second forward/backward</td>
       </tr>
       <tr>
          <td><strong>Ctrl + Z</strong></td>
          <td>Undo</td>
       </tr>
       <tr>
          <td><strong>Ctrl + Shift + Z / Ctrl + Y</strong></td>
          <td>Redo</td>
       </tr>
       <tr>
          <td><strong>&lt;</strong></td>
          <td>Slow Down +0.25x</td>
       </tr>
       <tr>
          <td><strong>&gt;</strong></td>
          <td>Speed Up +0.25x</td>
       </tr>
   </tbody>
</table>

<br>

## Built With

synced+ is written in vanilla HTML/CSS/JS, but it does use two crucial libraries:

* <a href="https://wavesurfer.xyz">wavesurfer.js</a> – Waveform rendering, playback controls, current playback time fetching.
* <a href="https://github.com/aadsm/jsmediatags">jsmediatags</a> – Reading and writing of audio metadata tags for files supported by the library.

Additionally, it uses <a href="https://v2.tauri.app">Tauri</a> to work as a desktop application.

<br>

## AI Transparency

AI has been used to generate the GitHub workflows, colour palettes for the themes (except for Default and Evil Calamity), rough draft for LICENSES.md, and to guide with Tauri integration.

<br>

## License

synced+ is licensed under the GNU AGPLv3 License. See the [LICENSE](LICENSE) file for details.

For full legal notices, copyright, disclosures, and open-source attributions regarding the assets used, see [LICENSES.md](LICENSES.md).