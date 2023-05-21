# Changelog

## [v3.10.0] - 2023-05-21

This release includes all changes from v3.10.0-rc1, v3.10.0-rc2 and v3.10.0-rc3,
in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Stations created with empty song object

## [v3.10.0-rc3] - 2023-05-14

This release includes all changes from v3.10.0-rc1 and v3.10.0-rc2,
in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Finished basic implementation of showing jobs on statistics admin page
- feat: Exclude disliked songs from being autorequested,
if "Automatically vote to skip disliked songs" preference is enabled

### Changed

- refactor: Increased playlist displayname max length to 64
- refactor: Improved song thumbnail fallback logic

### Fixed

- fix: SoundCloud player not destroyed properly
- fix: getPlayerState is not a function thrown in browser console
- fix: Activity items `<youtubeId>` payload message not migrated
- fix: Import playlist from file never finishes
- fix: Tippy can be null and throw an error in console

## [v3.10.0-rc2] - 2023-04-30

This release includes all changes from v3.10.0-rc1, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: SoundcloudPlayer component
- feat: Add extra user station state for unavailable media
- feat: Add support for SoundCloud media track state in user station state

### Changed

- refactor: Change youtubeId to mediaSource in some GET_DATA special properties
- refactor: Improve login, register and reset password form and autocompletion
- refactor: Improve SoundCloud unavailable track handling, to match YouTube

### Fixed

- fix: Unable to add YouTube search result song to station queue
- fix: Large Docker build context
- fix: Some jobs available in run admin page job dropdowns did not return result
- fix: Skipping station can pause/resume local station
- fix: Cookie expiry not refreshed causes issues in some browsers
- fix: Autofilling playlist skips station in some cases
- fix: Unable to open View Media modal from SoundCloud tracks admin page
- fix: Password managers submitting login form before inputs filled
- fix: Song unavailable toast does not automatically disappear
- fix: Don't count participating users in vote to skip users
(unless they vote-skipped themselves)
- fix: SoundCloud player doesn't work correctly twice on the same page

## [v3.10.0-rc1] - 2023-04-15

### **Breaking Changes**

This release includes breaking changes to our configuration handling.
The `backend/config/default.json` previously used as the means of configuring
the backend is now tracked and serves as the source of all default values.

Before updating or pulling changes please make a full backup and rename or
remove the `backend/config/default.json` file to avoid it being overwritten.
Please refer to the [Configuration documentation](.wiki/Configuration.md)
for more information on how you should now configure the application.

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Import playlist media from export file
- feat: Added additional station settings to configure autorequest functionality:
  - Allow autorequest toggle
  - Per user autorequest limit
  - Disallow recent functionality toggle
  (requires experimental station history to be enabled)
  - Disallow recent amount
  (requires experimental station history to be enabled)
- feat: Display count of station users and autorequesting playlist in tags
within tabs
- feat: Added experimental station history
- feat: Store and display user playback state in station users tab
- feat: Added experimental option to restrict registrations to emails matching
specific regex patterns
- feat: Allow DJ's in official stations
- feat: Display the reason media was added to queue
- feat: Added "Add song to queue" button to station queue
- feat: Added link to a user's own playlists in header/navbar
- feat: Added experimental support for SoundCloud media
- feat: Added experimental support for parsing and converting Spotify media
- feat: Added experimental support for storing YouTube channel API data
(requires experimental Spotify integration to be enabled)

### Changed

- refactor: Replace youtubeId usage with mediaSource internally
- refactor: Serve application configuration from backend
  - Replaced frontend config with both environment variables and backend config
  - Define default backend config values in `default.json` and
  overwrite with `local.json` files or environment variables
- style: Changed font to Nunito

### Fixed

- fix: Git debug not functional in production
- fix: Successfully saving station settings via Manage Station does not show a toast

## [v3.9.0] - 2023-01-01

This release includes all changes from v3.9.0-rc1, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Draggable list items sometimes had wrong key
- fix: Downgraded axios to 1.1.3 to fix Discogs API requests
- fix: YouTube API_CALL job would improperly pause the current job
whilst not waiting for child jobs
- fix: Add/remove song to/from playlist could throw error if not an official song

## [v3.9.0-rc1] - 2022-12-10

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Added station setting to configure skip vote threshold
- feat: Added experimental configuration of song weight when autofilling station
- feat: Added experimental configuration to prevent repeating recently played
songs in stations
- feat: Added experimental configuration to add user requested songs above
autofilled songs in queue
- feat: Added experimental station mode to allow users to close player
- feat: Added ability to add songs to queue and playlist with YouTube URL
- feat: Added experimental configuration to disable YouTube search

### Changed

- refactor: Renamed frontend configuration option `siteSettings.mediasession`
to `experimental.media_session`

### Fixed

- fix: Unable to bulk update song genres and artists
- fix: Auto suggest results blocking input
- fix: useForm original value can be reactive
- fix: Unable to open Edit Playlist with christmas theme in frontend production
- fix: Blue profile picture becomes red with christmas theme
- fix: Christmas lights can overlay and be overlayed by incorrect elements

## [v3.8.0] - 2022-11-11

This release includes all changes from v3.8.0-rc1 and v3.8.0-rc2.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

## [v3.8.0-rc2] - 2022-10-31

This release includes all changes from v3.8.0-rc1, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Add/remove media to/from admin playlist from admin/songs/import

### Changed

- refactor: Do not send ActivtyWatch watch event when video is buffering
- refactor: Include playback rate in ActivtyWatch watch event

### Fixed

- fix: Toggling night mode does not update other tabs if logged out
- fix: User not removed as DJ from station on deletion
- fix: Clicking view YouTube video in song item does not close actions tippy
- fix: ActivityWatch integration event started at was broken
- fix: AddToPlaylistDropdown missing song added and removed event handling
- fix: User logged out after removing another user
- fix: Paused station elapsed duration incorrectly set

## [v3.8.0-rc1] - 2022-10-16

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Added moderator user role
- feat: Added station DJ role
- feat: Started implementing frontend component and unit testing
- feat: Started migrating raw text to i18n-backed locales
- feat: Completed implementing confirmation of closing modal with unsaved changes
- feat: Added confirmation of saving form if source data has been updated
- feat: Added support for docker compose v2 to musare.sh
- feat: Store and display YouTube video upload date for newly created videos
- feat: Added admin playlist type and ability to add/remove media
in bulk from admin pages

### Changed

- refactor: Replaced admin and owner authentication with permission nodes
- refactor: On user role change ensure user is still authorized to view route
and generally improved handling
- refactor: Made vote skip toggleable
- refactor: Refactored CustomWebSocket into SocketHandler
and improved socket connection handling
- refactor: Added stage to musare.sh update command to
update itself before continuing with update

### Fixed

- fix: Unable to update with musare.sh if git pull fails
- fix: musare.sh update command does not pull docker images
- fix: Edit Song modal does not close on song deletion if not in bulk mode
- fix: Opening and closing modal will reset scroll position
- fix: Invalid TypeScript in frontend
- fix: Stations can pick up other stations current song
and/or become out of sync after socket reconnection
- fix: Site becomes unusable upon socket reconnection
- fix: Profile page activity sets not loaded on scroll
- fix: Adding/removing media from liked/disliked playlist does not emit ratings update
- fix: Edit Song parsing YouTube duration as int rather than float
- fix: Updating YouTube ID in Edit Song does not always update duration

## [v3.7.1] - 2022-09-02

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Added update events to view punishment modal

### Fixed

- fix: Unable to resume station with no current song
- fix: Unable to create new songs with editSong modal
- fix: Unable to change casing of username

### Removed

- chore: Removed dependabot action

## [v3.7.0] - 2022-08-27

This release contains mostly internal refactors, and includes all
changes from v3.7.0-rc1 and v3.7.0-rc2, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Unable to login with username if it contains uppercase characters
- fix: Profile page not responsive
- fix: Don't use npx within package scripts

## [v3.7.0-rc2] - 2022-08-21

This release includes all changes from v3.7.0-rc1, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Changed

- refactor: Migrated from sortablejs-vue3 to vue-draggable-list
- refactor: Disabled user preference activity items
- refactor: Allowed for YouTube channel imports in to playlists

### Fixed

- fix: Invalid settings store getters
- fix: EditSong song items scrollIntoView not functioning
- fix: Cache/notifications module falsely reporting readiness

## [v3.7.0-rc1] - 2022-08-07

This release contains mostly internal refactors.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Added TypeScript to frontend and backend
- feat: Added TypeScript check command to musare.sh
- feat: Added markdown lint command to musare.sh
- feat: Added config option to enable/disable GitHub authentication
- feat: Added resolved column, filter and update event
to Data Requests admin page
- feat: Added ability to deactivate punishments
- feat: Added songId column and filter to YouTube Videos admin page

### Changed

- refactor: Started migrating frontend to TypeScript, with inferred types
- refactor: Migrated from Vue Options to Vue Composition API
- refactor: Migrated from Webpack to Vite
- refactor: Migrated from VueX to Pinia
- refactor: Migrated from vue-draggable to sortablejs-vue3
- refactor: Enabled eslint cache
- refactor: Split docker npm install build steps
- refactor: Merged Edit Songs into Edit Song modal
- refactor: Converted global components back to normal components

### Fixed

- fix: toGMTString deprecated
- fix: First letter of Activity Item title duplicated
- fix: getRatings not available to logged out users
- fix: Opening station with active floating box breaks styling
- fix: GET_SONGS returns out-of-order array
- fix: Previous migration didn't properly migrate reports
- fix: Banning users causing backend crash and continuous reconnection attempts
- fix: Edit Songs does not work in production
- fix: Close modal keyboard shortcut does not work in Edit Song modal
- fix: Station and modal playback toggles not handled properly
- fix: MediaSession breaks station if a YouTube video plays instead of a song

## [v3.6.0] - 2022-06-12

This release includes all changes from v3.6.0-rc1, in addition to the following.
Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Removed tag="transition-group" from draggable components

## [v3.6.0-rc1] - 2022-06-05

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Added

- feat: Added tab-completion to backend commands
- feat: Added YouTube quota usage tracking
- feat: Added YouTube API requests tracking, caching and management
- feat: Added YouTube channel import functionality
- feat: Added YouTube title and artists prefill button to Edit Song modal
- feat: Warn if thumbnail fails to load in Edit Song modal
- feat: Added Import Songs admin page
- feat: Added YouTube API requests admin page with charts and an advanced table
- feat: Added YouTube videos admin page with an advanced table
- feat: Added View API Request modal
- feat: Added View YouTube Video modal
- feat: Added long jobs handling and monitoring

### Changed

- refactor: Display user display names instead of usernames in links and station
user list
- refactor: Use YouTube thumbnail as a fallback to song thumbnails
- refactor: Use song thumbnail component in Edit Song modal, with fallback
disabled
- refactor: Edit Song positioning and styling tweaks
- refactor: Moved vote skip processing to dedicated job
- refactor: Prevent auto vote to skip if locally paused
- refactor: Added info header card to admin pages
- refactor: Allowed for song style usage of YouTube videos in playlists and
station queues
- refactor: Moved ratings to dedicated model within media module, with YouTube
video support
- refactor: Replace songs with YouTube videos in playlists, station queues and
ratings on removal
- refactor: Moved drag box handling to mixin
- refactor: Floating box logic and styling improvements
- refactor: Added support for creation of songs from YouTube videos in
Edit Song(s) modals
- refactor: Compile production frontend as part of docker image build
- refactor: Changed default frontend docker mode to prod
- refactor: Import Album can now use a selection of songs or YouTube videos in
addition to YouTube playlist importing.

### Fixed

- fix: musare.sh attach not working with podman-compose
- fix: Station autofill not run after removal from queue
- fix: AdvancedTable multi-row select with left ctrl/shift doesnt work
- fix: YouTube search actions don't require login

## [v3.5.2] - 2022-05-12

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Assert package.json import as json
- fix: Limited NodeJS version to v16.15
- fix: Temporarily disabled eslint for moduleManager import

## [v3.5.1] - 2022-05-06

Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Fixed

- fix: Songs requestSet could return null songs
- fix: Prevent adding duplicate items with bulk actions
- fix: Throw error if unknown job is called
- fix: EditSongs missing modalUuid socket parameter
- fix: Unable to focus/blur AdvancedTable rows
- fix: EditSong song duration can reset on video state change
- fix: Backend exception if an empty playlist is updated
- fix: False-positive like/dislike playlist activity
- fix: Removed debug console.log
- fix: Station current/next song items requestedAt not updated on song changing
- fix: AdvancedTable max-width not a number
- fix: AdvancedTable history.replaceState throws warning

## [v3.5.0] - 2022-04-28

This release includes all changes from v3.5.0-rc1 and v3.5.0-rc2, in addition to
the following. Upgrade instructions can be found at [.wiki/Upgrading](.wiki/Upgrading.md).

### Changed

- refactor: close all modals upon route change

### Fixed

- fix: Autofilling station queue would reset requestedAt
- fix: Station time elapsed would show false if 0

## [v3.5.0-rc2] - 2022-04-24

This release includes all changes from v3.5.0-rc1, in addition to the following.

### Added

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

- refactor: No longer showing unlisted stations on homepage if not owned by user
unless toggled by admin
- refactor: Renamed station excludedPlaylists to blacklist
- refactor: Unified station update functions and events
- refactor: Replaced Manage Station settings dropdowns with select elements
- refactor: Use a local object to edit stations before saving
- refactor: Replace station modes with 2 modules which are independently
toggleable and configurable on every station
  - Requests: Replaces party mode, users can request songs or auto request from
  playlists
  - Autofill: Replaces playlist mode, owners select songs to autofill queue.
  Also includes old playMode and includedPlaylist functionality
- refactor: Update active team
- refactor: Separate docker container modes
- refactor: Improve musare.sh exit code usage and other tweaks
- refactor: Made Main Header/Footer, Modal, QuickConfirm and UserIdToUsername
global components
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

This release makes the MongoDB version configurable in the .env file. Prior to
this release, the MongoDB version was 4.0. We recommend upgrading to 5.0 or 4.4.
Upgrade instructions can be found in [.wiki/Upgrading](.wiki/Upgrading.md#Upgrade/downgradeMongoDB).

Please run the Update All Songs job after upgrading to ensure playlist and
station song data accuracy.

### Added

- feat: Scroll to next song item in Edit Songs queue
- feat: Reset Advanced Table bulk actions popup position on screen resize if in
initial position
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
- refactor: Hide registration buttons and prevent opening register modal if
registration is disabled
- refactor: Trim certain user modifiable strings in playlists, songs, reports
and stations
- refactor: Allow title to wrap to a 2nd line if no there are no artists in
Song Item
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

- fix: Relative homepage header height causing overlay of content on
non-standard resolutions
- fix: Unable to toggle nightmode on mobile logged out on homepage
- fix: Station card top row should not wrap
- fix: Advanced Table CTRL/SHIFT select rows does not work
- fix: Station not automatically removed from favorite stations on homepage on
deletion
- fix: Playlist songs do not contain verified attribute
- fix: Newest news should only fetch published items
- fix: Deleting a song as an admin adds activity item that you deleted a song
from genre playlists
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
- fix: Nightmode -> EditSong -> Discogs API Result release on hover style is
messed up
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

This release makes the MongoDB version configurable in the .env file. Prior to
this release, the MongoDB version was 4.0. We recommend upgrading to 5.0 or 4.4.
Upgrade instructions can be found in [.wiki/Upgrading](.wiki/Upgrading.md#Upgrade/downgradeMongoDB).

Please run the Update All Songs job after upgrading to ensure playlist and
station song data accuracy.

### Added

- feat: Scroll to next song item in Edit Songs queue
- feat: Reset Advanced Table bulk actions popup position on screen resize if in
initial position
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
- refactor: Hide registration buttons and prevent opening register modal if
registration is disabled
- refactor: Trim certain user modifiable strings in playlists, songs, reports
and stations
- refactor: Allow title to wrap to a 2nd line if no there are no artists in
Song Item
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

- fix: Relative homepage header height causing overlay of content on
non-standard resolutions
- fix: Unable to toggle nightmode on mobile logged out on homepage
- fix: Station card top row should not wrap
- fix: Advanced Table CTRL/SHIFT select rows does not work
- fix: Station not automatically removed from favorite stations on homepage on
deletion
- fix: Playlist songs do not contain verified attribute
- fix: Newest news should only fetch published items
- fix: Deleting a song as an admin adds activity item that you deleted a song
from genre playlists
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
- fix: Nightmode -> EditSong -> Discogs API Result release on hover style is
messed up
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
- feat: Admin/Users ability to delete user, resend verify email and resend reset
password email
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
  - Bulk update actions popup for songs. Ability to bulk edit, verify, unverify,
  delete, update tags, genres and artists.
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
- feat: Store the latest admin tab in localStorage and reopen that tab next time
you go to admin
- feat: View Musare version and Git info from backend/frontend
- chore: Security.md file

### Changed

- refactor: Auto suggest component
- refactor: Renamed confirm component to quick confirm
- refactor: Song status is now a verified boolean, with hidden songs migrated to
unverified with a hidden tag
- refactor: Treat liked/disliked playlists more like normal user playlists,
except the ability to rename and delete
- refactor: Unify song update socket events
- refactor: web-kit scrollbars and support Firefox scrollbar styling
- chore: Update material icons font
- chore: Use npm for can-autoplay and lofig packages

### Fixed

- fix: Any logged in user can perform certain actions on any playlist
- fix: Changing your username does not update your username stored locally
- fix: Clicking outside of the edit song modal whilst its loading, or attempt to
close in any other way, will prevent you from closing the modal
- fix: Data request emails are always sent from musare.com
- fix: Frontend ws.js, when onConnect is called right after the socket connects
(within 150ms), the onConnect callback is called twice
- fix: Header logo and modal close icon does not have user-select: none;
- fix: Home header min-height not set
- fix: Importing YouTube playlist has errors
- fix: Indexing reports prints "string" in backend logs
- fix: Memory leak on the frontend, where every time the backend restarts the
homepage tries to index the stations X times the server has restarted whilst the
homepage has been active
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
- fix: Christmas lights on home header when logged out and on mobile aren't on
bottom of element
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
- feat: Added new featured playlist feature to manage station, specify with
backend config option
- feat: Added red station theme

### Changed

- refactor: Replaced standard red with darker red, except for christmas and red
station themes.

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
- refactor: Refactored createStation modal to allow for official station
creation from admin area
- refactor: Refactored login and register modals to open on top of homepage from
route

### Fixed

- Various bug fixes

## [v3.0.0] - 2021-10-31

Major update including feature changes, improvements and bug fixes.
Changelog not completed for this release.
