<div align="center">

# <img src="src/img/synced-plus-logo-full.png" style="height: 3rem"></img>

A minimal, completely local, cross-platform, and browser-compatible Enhanced LRC creator. Import your audio and optional LRC/TXT/SRT and start syncing lyrics line-by-line or word-by-word.

<br>

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/6b0518de-0422-40f3-bb2a-b36cffece5b4" height="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/70b2726f-f9a8-451d-b50b-e2d6c06409c1" height="400"/></td>
  </tr>
  <tr align="center">
    <td>Desktop</td>
    <td>Mobile</td>
  </tr>
</table>

</div>

<br>

## Features

- ### **Specifically for ELRC**
  Designed to create Enhanced LRC, handling line-by-line, word-by-word timestamping.

- ### **Support for Other Formats**
  Supports Standard LRC, Enhanced LRC, plain text, and SubRip subtitle files (SRT).

- ### **Completely Offline**
  Works completely within your system, does not send any data to a server. Uses localStorage to store draft and settings.

- ### **Interactive Waveform**
  synced+ uses wavesurfer.js to draw a waveform that acts as the audio timeline. It also uses the hover and zoom plugins for more precise timestamping, and regions for visual representation of lyric lines.

- ### **Smart File Import**
  Creating a lyric file only requires you to import your audio file. However, you can also import your own lyric file or paste from the clipboard (which automatically checks input format) for resuming progress or ease of use. Uses jsmediatags to automatically read and write the metadata tags of your audio to the LRC file.

- ### **Smart Time Field Setting**
  Prevents time fields from being set to illegal values that will return errors by adjusting other fields accordingly.

- ### **Live Preview**
  Watch your lyric file compile in realtime in a preview sidebar.

- ### **Themes !!!!**
  Choose from a selection of colour palettes I totally don't use in my IDEs.

<br>

## Installation

synced+ can be run as a website, desktop/mobile application, or run locally from source code.

- ### **Web Version**
  Head over to [synced+'s GitHub Pages site](https://mono-o-o.github.io/synced-plus/).

- ### **Desktop / Mobile Application**
  Head over to the [releases](https://github.com/mono-o-o/synced-plus/releases) page to download the latest Tauri app.

- ### **Self-Hosted (requires [Node.js](https://nodejs.org/))**
  Clone the repository, open a terminal in `/synced-plus-master/src/`, and run `npx serve .` to start a local server.

## How to Use

1. **Load Audio**: Click on the **Open Audio** button to load a track. Metadata input fields will automatically be filled if your audio file has them.

2. **Load Lyrics / Add Lines**: Click on the **Import** button to load a lyric file or paste from the clipboard.

3. **Sync Lines / Words**: Use the timestamp button inside a time field to set its value to the current playback time.<br><br>To sync words, click on the Expand button to see the word container. When a time has been set for a word, clicking on the word jumps audio playback to its time.<br><br>By default, line end timestamps create a new, empty line in the LRC file, a common practice in LRC creation. This can be changed in the settings.

4. **Export**: Click on the **Export** button to select your desired format and download it.

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

<p align="center">Note: Hotkeys can be customised in the settings panel.</p>

<br>

## Built With

synced+ is written in vanilla HTML/CSS/JS, but it does use two crucial libraries:

* <a href="https://wavesurfer.xyz">wavesurfer.js</a> – Waveform rendering, playback controls, current playback time fetching.
* <a href="https://github.com/aadsm/jsmediatags">jsmediatags</a> – Reading and writing of audio metadata tags for files supported by the library.

Additionally, it uses <a href="https://v2.tauri.app">Tauri</a> to work as a desktop and mobile application.

<br>

## AI Transparency

AI has been used to generate the GitHub workflows, colour palettes for the themes (except for Default and Evil Calamity), rough draft for LICENSES.md, and to guide with Tauri integration.

<br>

## License

synced+ is licensed under Mozilla Public License 2.0. See the [LICENSE](LICENSE) file for details.

For full legal notices, copyright, disclosures, and open-source attributions regarding the assets used, see [LICENSES.md](LICENSES.md).
