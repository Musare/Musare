# Utility Script
The utility script is a tool that allows for the simple management of a Musare Docker instance.

Please follow the [Docker Installation Guide](./Installation.md#Docker) before using this script.

## Usage
Linux (Bash):
```bash
./musare.sh command [parameters]
```

## Commands
| Command | Parameters | Description |
| --- | --- | --- |
| `start` | `[frontend backend redis mongo]` | Start service(s). |
| `stop` | `[frontend backend redis mongo]` | Stop service(s). |
| `restart` | `[frontend backend redis mongo]` | Restart service(s). |
| `status` | `[frontend backend redis mongo]` | View status for service(s). |
| `logs` | `[frontend backend redis mongo]` | View logs for service(s). |
| `update` | `[auto]` | Update Musare. When auto is specified the update will be cancelled if there are any changes requiring manual intervention, allowing you to run this unattended. |
| `attach` | `<backend,mongo,redis>` | Attach to backend server, mongodb or redis shell. |
| `build` | `[frontend backend]` | Build service(s). |
| `eslint` | `[frontend backend] [fix]` | Run eslint on frontend and/or backend. Specify fix to auto fix issues where possible. |
| `backup` | | Backup database data to file. Configured in .env file. |
| `restore` | `[file]` | Restore database from file. If file is not specified you will be prompted. |
| `reset` | `[frontend backend redis mongo]` | Reset all data for service(s). |
| `admin` | `<add,remove> [username]` | Assign/unassign admin role to/from user. If the username is not specified you will be prompted. |

### Services
There are currently 4 services; frontend, backend, redis and mongo. Where services is a parameter you can specify any of these, or multiple seperated by spaces, for example `./musare.sh restart frontend backend` to restart the frontend and backend. If no services are specified all will be selected.
