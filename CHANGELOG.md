# Changelog

All notable changes to synced+ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-08-15

### Added

- Settings panel
- Region loop toggle
- Workspace autoscroll toggle
- Hotkey editor
- Rewind/fast-forward step editor

### Fixed

- Fields in the metadata/settings panel should now reflect immediately
- Set volume not immediately applying after loading new audio
- URLs not opening on Tauri versions
- Copy function not working on Tauri versions

### Changed

- Moved global offset and end line toggles into the settings panel
- Moved help & about into the settings panel
- Unified localStorage settings
- Disabled being able to press play with no audio loaded
- Copied import button disabled behaviour to export button
- Hover effect for toggle cards
- Clear metadata fields on reload

## [1.2.1] - 2026-07-22

### Added

- SRT import/export
- Toggle to disable adding blank lines as line end times
- Blank line edge casing (for stuff like instrumental breaks/between verses)

### Fixed

- Made it impossible to overlap regions
- Undo/redo should now work after dragging region start/end

## [1.2.0] - 2026-07-18

### Added

- APK version (massive headache)
- Paste import
- Update checker
- Autosave debounce
- Show file name on draft load
- Animation for word highlight and modal pop-in
- Audio loading toast
- Cute logo  animation

### Fixed

- Preview highlight not showing after undo/redo on pause
- [length:] only updating after editing a new line

### Improved

- Used float for time logic instead of converting strings
- Transitioned to O(1) lookups for the most part
- Significantly lowered draft size
- Even less DOM dependency
- Implemented error handling on some functions
- Removed autoplay when clicking on regions
- Removed fugly blue tap highlights on mobile

## [1.1.0] - 2026-07-02

### Added

- Wavesurfer regions plugin
- Undo/redo and lyric draft saving
- Replaced native alert and confirm dialogues with custom ones
- Help & About modal
- Transition when changing themes

### Fixed

- RangeError in console
- Audio file endless loading for Tauri app

### Changed

- JS code clean-up
- Added back [offset:] field (functional this time)
- Show audio file name for draft to load

## [1.0.1] - 2026-06-24

### Fixed

- Delete line not working

## [1.0.0] - 2026-06-24

### Added

- Responsive layout

## [0.9.4] - 2026-06-23

### Changed

- Moved more functions away from DOM dependency
- Clear audio from memory on new file

## [0.9.3] - 2026-06-23

### Added

- Standard LRC export

## [0.9.2] - 2026-06-23

### Added

- Playback speed controls

## [0.9.1] - 2026-06-22

### Fixed

- Fixed JS reference

## [0.9.0] - 2026-06-21

This a list of the changes since the initial commit on 2026-06-16.

### Added

- Tauri integration
- Localise fonts, wavesurfer, and jsmediatags
- Preview panel
- Offset field (placeholder)
- Various deletion/replacement prompts
- Use jsmediatags to read audio metadata and write to corresponding fields
- Keyboard controls
- Themes
- TXT import
- Ability to add blank lines by /nl
- Added a theme dedicated to the bestest friend I could ask for

### Fixed

- Word and active line highlighting
- Word edge-casing
- Removed duplicate for loop
- Lyric lines not showing on LRC import
- Line text disappearing when typing /nl
- File import dialogue for Tauri app

### Changed

- Transition from DOM lookups to state-based archi
- Hardened time validations
- Disable adding lines without audio loaded
- Removed end input
- Reimplement end input after 3 days LMAO
- Clear fields first on new audio load
- Load wavesurfer hover only on audio load
- Customised scrollbar