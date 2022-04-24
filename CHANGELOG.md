# Changelog

## [v3.5.0-rc2] - 2022-04-24

## Added
- chore: Added docker-compose.override.yml documentation

### Fixed
- fix: Unable to compile frontend in production mode
- fix: Homepage admin filter keyboard shortcut not always registering
- fix: Docker will create folders if default.json files do not exist
- fix: Station info box has white corners in dark mode
- fix: Advanced Table filter operator label border-radius not squared on right
- fix: Prevent migration 18 running once migration 20 has been run
- fix: docker-compose.override.yml not included in musare.sh commands
- fix: musare.sh reset container not passing full servicesString

## [v3.5.0-rc1] - 2022-04-14

### Added
- feat: Station autofill configurable limit
- feat: Station requests configurable access level
- feat: Station requests configurable per user request limit
- feat: Added redis attach command to musare.sh
- feat: Added podman support to musare.sh
- feat: Added view station button to admin/stations
- feat: Added info icon component

### Changed
- refactor: No longer showing unlisted stations on homepage if not owned by user unless toggled by admin
- refactor: Renamed station excludedPlaylists to blacklist
- refactor: Unified station update functions and events
- refactor: Replaced Manage Station settings dropdowns with select elements
- refactor: Use a local object to edit stations before saving
- refactor: Replace station modes with 2 modules which are independently toggleable and configurable on every station
    - Requests: Replaces party mode, users can request songs or auto request from playlists
    - Autofill: Replaces playlist mode, owners select songs to autofill queue. Also includes old playMode and includedPlaylist functionality
- refactor: Update active team
- refactor: Separate docker container modes
- refactor: Improve musare.sh exit code usage and other tweaks
- refactor: Made Main Header/Footer, Modal, QuickConfirm and UserIdToUsername global components
- refactor: Use crypto random values instead of math.random to create UUID
- refactor: Added trailing slash to URL startsWith check
- chore: Updated frontend package-lock.json version from 1 to 2
- refactor: Increased site name configuration usage
- refactor: Disable pseudo-tty for musare.sh eslint commands
- refactor: Migrated all modals to new more modular system
- refactor: Made station info box a component for Station and Manage Station

### Fixed
- fix: Changing station privacy does not kick out newly-unauthorized users

### Removed
- refactor: Removed station queue lock

## [v3.4.0] - 2022-03-27

### **Breaking Changes**
This release makes the MongoDB version configurable in the .env file. Prior to this release, the MongoDB version was 4.0. We recommend upgrading to 5.0 or 4.4. Upgrade instructions can be found in [.wiki/Upgrading](.wiki/Upgrading.md#Upgrade/downgradeMongoDB).

Please run the Update All Songs job after upgrading to ensure playlist and station song data accuracy.

### Added
- feat: Scroll to next song item in Edit Songs queue
- feat: Reset Advanced Table bulk actions popup position on screen resize if in initial position
- feat: Global LESS variables
- refactor: Configurable Main Footer links
- feat: Configurable Docker container restart policy
- feat: Backend job to create a song
- feat: Create song from scratch with Edit Song
- chore: Added CodeQL analysis GitHub action
- feat: Ability to select track position in Edit Song player
- feat: Ability to select playback rate in Edit Song player
- feat: Login with username or email
- chore: Added CHANGELOG.md
- feat: Added view profile button to admin/users table
- feat: Ability to delete reports
- feat: Added resolved attribute to reports Advanced Table
- feat: Option to edit songs after import in Import Playlist
- feat: Configurable MongoDB and Redis Docker container data directories
- feat: Ability to toggle report resolution status
- feat: Ability to show news items to new users on first visit
- feat: Added warning label to thumbnails in Edit Song if not square
- chore: Added Upgrading wiki page
- feat: Configurable MongoDB container image version

### Changed
- refactor: Replaced night mode toggle slider in Main Header with day/night icons
- refactor: Replaced SASS/SCCS with LESS
- refactor: Hide registration buttons and prevent opening register modal if registration is disabled
- refactor: Trim certain user modifiable strings in playlists, songs, reports and stations
- refactor: Allow title to wrap to a 2nd line if no there are no artists in Song Item
- refactor: Consistent border-radius
- refactor: Consistent box-shadow
- refactor: Replace deprecated /deep/ selector with :deep()
- chore: Update frontend and backend packages, and docker images
- refactor: Move Edit Song verify toggle button to in-form toggle switch
- refactor: Volume slider styling improvements
- refactor: Replaced admin secondary nav with sidebar
- refactor: Moved Request Song import youtube playlist to Import Playlist modal
- refactor: Select input styling consistency
- refactor: Show notice that song has been deleted in Edit Song
- refactor: Reduce dropdown toggle button width
- refactor: Set title and thumbnail on YouTube video selection in Create Song
- refactor: Show YouTube tab by default in Create Song
- refactor: Move admin tab routing to vue router
- refactor: Pull images in musare.sh build command
- refactor: Delete user sessions when account is deleted

### Fixed
- fix: Relative homepage header height causing overlay of content on non-standard resolutions
- fix: Unable to toggle nightmode on mobile logged out on homepage
- fix: Station card top row should not wrap
- fix: Advanced Table CTRL/SHIFT select rows does not work
- fix: Station not automatically removed from favorite stations on homepage on deletion
- fix: Playlist songs do not contain verified attribute
- fix: Newest news should only fetch published items
- fix: Deleting a song as an admin adds activity item that you deleted a song from genre playlists
- fix: News item divider has no top/bottom margin
- fix: Edit Song failing to fetch song reports
- fix: Station refill can include current song
- fix: Lofig can not be loaded from deep path
- fix: CTRL/SHIFT+select Advanced Table rows no longer working
- fix: Entering station with volume previously set to 0 is handled as muted
- fix: Genre playlists are created even if the song is unverified
- fix: Importing YouTube playlist throws URL invalid
- fix: Song validation should not require genres or artists for unverified songs
- fix: Station player not unloaded if queue runs empty
- fix: Edit Song player state not reset on close or next song
- fix: Playlists could sometimes not be created due to restrictive MongoDB index
- fix: Add tags to songs doesn't give any feedback to the user
- fix: AdvancedTable checkboxes overlay mobile navbar dropdown
- fix: Nightmode -> EditSong -> Discogs API Result release on hover style is messed up
- fix: Station creation validation always failing
- fix: Station info display name and description overflow horizontally
- fix: Volume slider incorrect sensitivity
- fix: Song thumbnail loading causes jumpiness on admin/songs
- fix: Manage Station go to station throws an error
- fix: Edit Song seekTo does not apply if video is stopped
- fix: Changing password in Settings does not create success toast
- fix: Invalid user sessions could sometimes break actions
- fix: Add To Playlist Dropdown create playlist button not full width

### Removed
- refactor: Removed skip to last 10s button from Edit Song player
- refactor: Removed Request Song modal

## [v3.4.0-rc2] - 2022-03-19

### Added
- feat: Re-added ability to hard stop player in Edit Song

### Changed
- refactor: Delete user sessions when account is deleted

### Fixed
- fix: Changing password in Settings does not create success toast
- fix: Invalid user sessions could sometimes break actions
- fix: Add To Playlist Dropdown create playlist button not full width

## [v3.4.0-rc1] - 2022-03-06

### **Breaking Changes**
This release makes the MongoDB version configurable in the .env file. Prior to this release, the MongoDB version was 4.0. We recommend upgrading to 5.0 or 4.4. Upgrade instructions can be found in [.wiki/Upgrading](.wiki/Upgrading.md#Upgrade/downgradeMongoDB).

Please run the Update All Songs job after upgrading to ensure playlist and station song data accuracy.

### Added
- feat: Scroll to next song item in Edit Songs queue
- feat: Reset Advanced Table bulk actions popup position on screen resize if in initial position
- feat: Global LESS variables
- refactor: Configurable Main Footer links
- feat: Configurable Docker container restart policy
- feat: Backend job to create a song
- feat: Create song from scratch with Edit Song
- chore: Added CodeQL analysis GitHub action
- feat: Ability to select track position in Edit Song player
- feat: Ability to select playback rate in Edit Song player
- feat: Login with username or email
- chore: Added CHANGELOG.md
- feat: Added view profile button to admin/users table
- feat: Ability to delete reports
- feat: Added resolved attribute to reports Advanced Table
- feat: Option to edit songs after import in Import Playlist
- feat: Configurable MongoDB and Redis Docker container data directories
- feat: Ability to toggle report resolution status
- feat: Ability to show news items to new users on first visit
- feat: Added warning label to thumbnails in Edit Song if not square
- chore: Added Upgrading wiki page
- feat: Configurable MongoDB container image version

### Changed
- refactor: Replaced night mode toggle slider in Main Header with day/night icons
- refactor: Replaced SASS/SCCS with LESS
- refactor: Hide registration buttons and prevent opening register modal if registration is disabled
- refactor: Trim certain user modifiable strings in playlists, songs, reports and stations
- refactor: Allow title to wrap to a 2nd line if no there are no artists in Song Item
- refactor: Consistent border-radius
- refactor: Consistent box-shadow
- refactor: Replace deprecated /deep/ selector with :deep()
- chore: Update frontend and backend packages, and docker images
- refactor: Move Edit Song verify toggle button to in-form toggle switch
- refactor: Volume slider styling improvements
- refactor: Replaced admin secondary nav with sidebar
- refactor: Moved Request Song import youtube playlist to Import Playlist modal
- refactor: Select input styling consistency
- refactor: Show notice that song has been deleted in Edit Song
- refactor: Reduce dropdown toggle button width
- refactor: Set title and thumbnail on YouTube video selection in Create Song
- refactor: Show YouTube tab by default in Create Song
- refactor: Move admin tab routing to vue router
- refactor: Pull images in musare.sh build command

### Fixed
- fix: Relative homepage header height causing overlay of content on non-standard resolutions
- fix: Unable to toggle nightmode on mobile logged out on homepage
- fix: Station card top row should not wrap
- fix: Advanced Table CTRL/SHIFT select rows does not work
- fix: Station not automatically removed from favorite stations on homepage on deletion
- fix: Playlist songs do not contain verified attribute
- fix: Newest news should only fetch published items
- fix: Deleting a song as an admin adds activity item that you deleted a song from genre playlists
- fix: News item divider has no top/bottom margin
- fix: Edit Song failing to fetch song reports
- fix: Station refill can include current song
- fix: Lofig can not be loaded from deep path
- fix: CTRL/SHIFT+select Advanced Table rows no longer working
- fix: Entering station with volume previously set to 0 is handled as muted
- fix: Genre playlists are created even if the song is unverified
- fix: Importing YouTube playlist throws URL invalid
- fix: Song validation should not require genres or artists for unverified songs
- fix: Station player not unloaded if queue runs empty
- fix: Edit Song player state not reset on close or next song
- fix: Playlists could sometimes not be created due to restrictive MongoDB index
- fix: Add tags to songs doesn't give any feedback to the user
- fix: AdvancedTable checkboxes overlay mobile navbar dropdown
- fix: Nightmode -> EditSong -> Discogs API Result release on hover style is messed up
- fix: Station creation validation always failing
- fix: Station info display name and description overflow horizontally
- fix: Volume slider incorrect sensitivity
- fix: Song thumbnail loading causes jumpiness on admin/songs
- fix: Manage Station go to station throws an error
- fix: Edit Song seekTo does not apply if video is stopped

### Removed
- refactor: Removed skip to last 10s button from Edit Song player
- refactor: Removed Request Song modal

## [v3.3.1] - 2022-02-03

### Fixes
- fix: migration18 doesnt migrate playlist and queue songs

## [v3.3.0] - 2022-01-22

### Added
- feat: Admin ability to edit another users playlist
- feat: Admin/Users ability to delete user, resend verify email and resend reset password email
- feat: Bulk Actions modal for admin/songs bulk editing tags, genres and artists.
- feat: Button and job to recalculate all song likes and dislikes
- feat: Confirm modal, for more detailed confirmation of actions
- feat: Create missing genre playlists button and job
- feat: Delete songs
- feat: Edit Songs modal
- feat: Import Album styling improvements and prefill Discogs data option
- feat: MediaSession controls (experimental)
- feat: New admin area advanced table
    - Advanced filter/search functionality with autocomplete for certain attributes
    - Bulk update actions popup for songs. Ability to bulk edit, verify, unverify, delete, update tags, genres and artists.
    - Hide columns
    - Keyboard shortcuts
    - Local and query storage of table configuration
    - Manage columns dropdown
    - Pagination and configurable page size
    - Reorder columns
    - Resize columns
    - Row update and removed event handling
    - Select rows with checkboxes
    - Sort by column
- feat: Open Manage Station from homepage
- feat: Open Station Queue from homepage
- feat: Redirect /admin to tab route
- feat: Run jobs dropdown in admin area pages to replace buttons
- feat: Song tagging
- feat: Store the latest admin tab in localStorage and reopen that tab next time you go to admin
- feat: View Musare version and Git info from backend/frontend
- chore: Security.md file

### Changed
- refactor: Auto suggest component
- refactor: Renamed confirm component to quick confirm
- refactor: Song status is now a verified boolean, with hidden songs migrated to unverified with a hidden tag
- refactor: Treat liked/disliked playlists more like normal user playlists, except the ability to rename and delete
- refactor: Unify song update socket events
- refactor: web-kit scrollbars and support Firefox scrollbar styling
- chore: Update material icons font
- chore: Use npm for can-autoplay and lofig packages

### Fixed
- fix: Any logged in user can perform certain actions on any playlist
- fix: Changing your username does not update your username stored locally
- fix: Clicking outside of the edit song modal whilst its loading, or attempt to close in any other way, will prevent you from closing the modal
- fix: Data request emails are always sent from musare.com
- fix: Frontend ws.js, when onConnect is called right after the socket connects (within 150ms), the onConnect callback is called twice
- fix: Header logo and modal close icon does not have user-select: none;
- fix: Home header min-height not set
- fix: Importing YouTube playlist has errors
- fix: Indexing reports prints "string" in backend logs
- fix: Memory leak on the frontend, where every time the backend restarts the homepage tries to index the stations X times the server has restarted whilst the homepage has been active
- fix: Modal footer overflow cropped
- fix: Move song to bottom of queue does not work on occasion
- fix: News items on news page overflow horizontally on mobile
- fix: Opening edit song modal whilst loading prevents closing modal
- fix: Queue does not have user-select set to none
- fix: Removed legacy editSong right container styling
- fix: Select dropdown arrow outside of container in create playlist
- fix: Spam closing EditSong modals from ImportAlbum causes weird issues
- fix: Tippy tooltips get cropped by modal overflow

## [v3.2.2] - 2021-12-11

### Changed
- refactor: Self host santa seeker icon

## [v3.2.1] - 2021-12-01

### Fixed
- fix: Jumpy candy cane seeker bar
- fix: Christmas lights on home header when logged out and on mobile aren't on bottom of element
- fix: Christmas lights hover just below main header
- fix: Christmas lights box shadow cropped

## [v3.2.0] - 2021-11-20

### Added
- feat: Added christmas theme
    - Enable with frontend config option
    - Red primary color
    - Candycane station seekerbar
    - Santa on sleigh seeker icon
    - Christmas lights below main and modal header
    - Snow falling in the background
- feat: Added new featured playlist feature to manage station, specify with backend config option
- feat: Added red station theme

### Changed
- refactor: Replaced standard red with darker red, except for christmas and red station themes.

## [v3.1.1] - 2021-11-15

### Fixed
- fix: Not logging in other open tabs automatically
- fix: blacklistedCommunityStationNames issues

## [v3.1.0] - 2021-11-14

### Added
- feat: New config option for blacklisted station names

### Changed
- refactor: Removed bulma dependency
- refactor: Patched missing styling after removing bulma
- refactor: Refactored createStation modal to allow for official station creation from admin area
- refactor: Refactored login and register modals to open on top of homepage from route

### Fixed
- Various bug fixes

## [v3.0.0] - 2021-10-31
Major update including feature changes, improvements and bug fixes. Changelog not completed for this release.