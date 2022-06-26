# Backend Commands

Backend commands are inputted via STDIN or if using the Utility Script by using
`./musare.sh attach backend`.

## Commands

| Command | Parameters | Description |
| --- | --- | --- |
| `rs` | | Restart backend. |
| `status` | | Returns all modules and a sample of information including, state, jobs queued, running and paused, concurrency (amount of jobs that can run simultaneously), and (startup) stage. |
| `queued` | `module` | Returns all jobs queued for specified module. |
| `running` | `module` | Returns all jobs running for specified module. |
| `paused` | `module` | Returns all jobs paused for specified module. |
| `jobinfo` | `UUID` | Returns a detailed overview of a specified job. |
| `runjob` | `module job_name json_encoded_payload` | Run a specified job in a specified module including a JSON encoded payload, and return response. |
| `eval` | `some_javascript` | Execute JavaScript within the index.js context and return response. |
| `lockdown` | | Lockdown backend. |
| `version` | | Prints the Musare version and Git repository info. |
| `stats` | `module` | Returns job statistics for a specified module. |

## Modules

When specifying a module please use all lowercase.
The available modules are as follows:

- Cache
- DB
- Mail
- Activities
- API
- App
- WS
- Notifications
- Playlists
- Punishments
- Songs
- Stations
- Tasks
- Utils
- YouTube
