# Backend Commands
Backend commands are inputted via STDIN or if using the Utility Script by using `./musare.sh attach backend`.

## Commands
| Command | Parameters | Description |
| --- | --- | --- |
| `rs` | | Restart backend. |
| `status` | | List all modules, their states, the jobs queued, running and paused, and the concurrency. |
| `queued` | `module` | List all jobs queued for specified module. |
| `running` | `module` | List all jobs running for specified module. |
| `paused` | `module` | List all jobs paused for specified module. |
| `jobinfo` | `UUID` | Get a detailed overview of a specified job. |

## Modules
When specifying a module please use all lowercase. The available modules are as follows:

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
