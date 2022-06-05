![Musare](frontend/dist/assets/blue_wordmark.png)

# Musare

Musare is an open-source collaborative music listening and catalogue curation application. Currently supporting YouTube based content.

A production demonstration instance of Musare can be found at [demo.musare.com](https://demo.musare.com).

---

## Documentation
- [Installation](./.wiki/Installation.md)
- [Upgrading](./.wiki/Upgrading.md)
- [Configuration](./.wiki/Configuration.md)
- [Utility Script](./.wiki/Utility_Script.md)
- [Backend Commands](./.wiki/Backend_Commands.md)
- [Technical Overview](./.wiki/Technical_Overview.md)
- [Value Formats](./.wiki/Value_Formats.md)

---

## Features
- **Playlists**
    - User created playlists
    - Automatically generated playlists for genres
    - Privacy configuration
    - Liked and Disliked songs playlists per user
    - Bulk import videos from YouTube playlist
    - Add songs from verified catalogue or YouTube videos
    - Ability to download in JSON format
- **Stations**
    - Requests - Toggleable module to allow users to add songs to the queue
        - Configurable access level and per user request limit
        - Automatically request songs from selected playlists
        - Ability to search for songs from verified catalogue or YouTube videos
    - Autofill - Toggleable module to allow owners to configure automatic filling of the queue from selected playlists
        - Configurable song limit
        - Play mode option to randomly play many playlists, or sequentially play one playlist
        - Ability to search for playlists on Musare
    - Ability to blacklist playlists to prevent songs within from playing
    - Themes
    - Privacy configuration
    - Favoriting
    - Official stations controlled by admins
    - User created and controlled stations
    - Pause playback just in local session
    - Station-wide pausing by admins or owners
    - Vote to skip songs
    - Force skipping song by admins or owners
- **Song Management**
    - Verify songs to allow them to be searched for and added to automatically generated genre playlists
    - Discogs integration to import metadata
    - Ability for users to report issues with songs and admins to resolve
    - Configurable skip duration and song duration to cut intros and outros
    - Import YouTube playlists or channels from admin area
    - Import Album to associate Discogs album data with media in bulk
    - Bulk admin management of songs
    - Create songs from scratch or from YouTube videos
- **YouTube**
    - Monitor and manage API requests and quota usage
    - Configure API quota limits
    - YouTube video management
- **Users**
    - Activity logs
    - Profile page showing public playlists and activity logs
    - Text or gravatar profile pictures
    - Email or Github login/registration
    - Preferences to tailor site usage
    - Password reset
    - Data deletion management
    - ActivityWatch integration
- **Punishments**
    - Ban users
    - Ban IPs
- **News**
    - Admins can add/edit/remove news items
    - Markdown editor
- **Night Mode**
- **Administration**
    - Admin area to manage instance
    - Configurable data tables
        - Reorder, resize, sort by and toggle visibilty of columns
        - Advanced queries
    - Bulk management
    - View backend statistics
---

## Contact

Get in touch with us via email at [core@musare.com](mailto:core@musare.com).
