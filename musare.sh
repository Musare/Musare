#!/bin/bash

set -e

export PATH=/usr/local/bin:/usr/bin:/bin

# Color variables
CYAN='\033[33;36m';
RED='\033[0;31m'
YELLOW='\033[0;93m'
GREEN='\033[0;32m'
NC='\033[0m'

# Print provided formatted error and exit with code (default 1)
throw()
{
    echo -e "${RED}${1}${NC}"
    exit "${2:-1}"
}

# Navigate to repository
scriptLocation=$(dirname -- "$(readlink -fn -- "$0"; echo x)")
cd "${scriptLocation%x}"

# Import environment variables
if [[ ! -f .env ]]; then
    throw "Error: .env does not exist" 2
fi
# shellcheck disable=SC1091
source .env

# Define docker command
docker="${DOCKER_COMMAND:-docker}"
if [[ ${docker} != "docker" && ${docker} != "podman" ]]; then
    throw "Error: Invalid DOCKER_COMMAND"
fi

set +e

# Check if docker is installed
${docker} --version > /dev/null 2>&1
dockerInstalled=$?

# Define docker compose command
dockerCompose="${docker} compose"

# Check if docker compose is installed
${dockerCompose} version > /dev/null 2>&1
composeInstalled=$?
if [[ ${composeInstalled} -gt 0 ]]; then
    dockerCompose="${docker}-compose"
    ${dockerCompose} --version > /dev/null 2>&1
    composeInstalled=$?
fi

set -e

# Exit if docker and/or docker compose is not installed
if [[ ${dockerInstalled} -gt 0 || ${composeInstalled} -gt 0 ]]; then
    if [[ ${dockerInstalled} -eq 0 && ${composeInstalled} -gt 0 ]]; then
        throw "Error: ${dockerCompose} not installed."
    fi

    if [[ ${dockerInstalled} -gt 0 && ${composeInstalled} -eq 0 ]]; then
        throw "Error: ${docker} not installed."
    fi

    throw "Error: ${docker} and ${dockerCompose} not installed."
fi

# Add docker compose file arguments to command
composeFiles="-f compose.yml"
if [[ ${APP_ENV} == "development" ]]; then
    composeFiles="${composeFiles} -f compose.dev.yml"
fi
if [[ ${CONTAINER_MODE} == "local" ]]; then
    composeFiles="${composeFiles} -f compose.local.yml"
fi
if [[ -f compose.override.yml ]]; then
    composeFiles="${composeFiles} -f compose.override.yml"
elif [[ -f docker-compose.override.yml ]]; then
    composeFiles="${composeFiles} -f docker-compose.override.yml"
fi
dockerCompose="${dockerCompose} ${composeFiles}"

# Parse services from arguments string
handleServices()
{
    # shellcheck disable=SC2206
    validServices=($1)
    servicesArray=()
    invalidServices=false

    for x in "${@:2}"; do
        if [[ ${validServices[*]} =~ (^|[[:space:]])"$x"($|[[:space:]]) ]]; then
            if ! [[ ${servicesArray[*]} =~ (^|[[:space:]])"$x"($|[[:space:]]) ]]; then
                servicesArray+=("${x}")
            fi
        else
            if [[ $invalidServices == false ]]; then
                invalidServices="${x}"
            else
                invalidServices="${invalidServices} ${x}"
            fi
        fi
    done

    if [[ $invalidServices == false && ${#servicesArray[@]} -gt 0 ]]; then
        echo "1|${servicesArray[*]}"
    elif [[ $invalidServices == false ]]; then
        echo "1|all"
    else
        echo "0|Invalid Service(s): ${invalidServices}"
    fi
}

# Execute a docker command
runDockerCommand()
{
    validCommands=(start stop restart pull build ps logs)
    if ! [[ ${validCommands[*]} =~ (^|[[:space:]])"$2"($|[[:space:]]) ]]; then
        throw "Error: Invalid runDockerCommand input"
    fi

    servicesString=$(handleServices "server postgres backend frontend mongo redis" "${@:3}")
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [server, postgres, backend, frontend, mongo, redis]"
    fi

    if [[ ${servicesString:2:4} == "all" ]]; then
        servicesString=""
        pullServices="postgres mongo redis"
        buildServices="server backend frontend"
    else
        servicesString=${servicesString:2}
        pullArray=()
        buildArray=()

        if [[ "${servicesString}" == *server* ]]; then
            buildArray+=("server")
        fi

        if [[ "${servicesString}" == *postgres* ]]; then
            pullArray+=("postgres")
        fi

        if [[ "${servicesString}" == *mongo* ]]; then
            pullArray+=("mongo")
        fi

        if [[ "${servicesString}" == *redis* ]]; then
            pullArray+=("redis")
        fi

        if [[ "${servicesString}" == *backend* ]]; then
            buildArray+=("backend")
        fi

        if [[ "${servicesString}" == *frontend* ]]; then
            buildArray+=("frontend")
        fi

        pullServices="${pullArray[*]}"
        buildServices="${buildArray[*]}"
    fi

    if [[ ${2} == "stop" || ${2} == "restart" ]]; then
        # shellcheck disable=SC2086
        ${dockerCompose} stop ${servicesString}
    fi

    if [[ ${2} == "start" || ${2} == "restart" ]]; then
        # shellcheck disable=SC2086
        ${dockerCompose} up -d ${servicesString}
    fi

    if [[ ${2} == "pull" && ${pullServices} != "" ]]; then
        # shellcheck disable=SC2086
        ${dockerCompose} pull ${pullServices}
    fi

    if [[ ${2} == "build" && ${buildServices} != "" ]]; then
        # shellcheck disable=SC2086
        ${dockerCompose} build ${buildServices}
    fi

    if [[ ${2} == "ps" || ${2} == "logs" ]]; then
        # shellcheck disable=SC2086
        ${dockerCompose} "${2}" ${servicesString}
    fi
}

# Get docker container id
getContainerId()
{
    if [[ $docker == "docker" ]]; then
        containerId=$(${dockerCompose} ps -q "${1}")
    else
        containerId=$(${dockerCompose} ps \
            | sed '0,/CONTAINER/d' \
            | awk "/${1}/ {print \$1;exit}")
    fi
    echo "${containerId}"
}

# Reset services
handleReset()
{
    servicesString=$(handleServices "server postgres backend frontend mongo redis" "${@:2}")
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [server, postgres, backend, frontend, mongo, redis]"
    fi

    confirmMessage="${GREEN}Are you sure you want to reset all data"
    if [[ ${servicesString:2:4} != "all" ]]; then
        confirmMessage="${confirmMessage} for $(echo "${servicesString:2}" | tr ' ' ',')"
    fi
    echo -e "${confirmMessage}? ${YELLOW}[y,n]: ${NC}"

    read -r confirm
    if [[ "${confirm}" != y* ]]; then
        throw "Cancelled reset"
    fi

    if [[ ${servicesString:2:4} == "all" ]]; then
        runDockerCommand "$(basename "$0") $1" stop
        ${dockerCompose} rm -v --force
    else
        # shellcheck disable=SC2086
        runDockerCommand "$(basename "$0") $1" stop ${servicesString:2}
        # shellcheck disable=SC2086
        ${dockerCompose} rm -v --force ${servicesString:2}
    fi
}

# Attach to service in docker container
attachContainer()
{
    containerId=$(getContainerId "${2}")
    if [[ -z $containerId ]]; then
        throw "Error: ${2} offline, please start to attach."
    fi

    case $2 in
        server)
            echo -e "${YELLOW}Detach with CTRL+P+Q${NC}"
            ${docker} attach "$containerId"
            ;;

        postgres)
            echo -e "${YELLOW}Detach with CTRL+D${NC}"
            PGPASSWORD="${POSTGRES_PASSWORD}" ${dockerCompose} exec postgres psql "${POSTGRES_USERNAME}" musare
            ;;

        backend)
            echo -e "${YELLOW}Detach with CTRL+P+Q${NC}"
            ${docker} attach "$containerId"
            ;;

        mongo)
            MONGO_VERSION_INT=${MONGO_VERSION:0:1}
            echo -e "${YELLOW}Detach with CTRL+D${NC}"
            if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry()" --shell
            else
                ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}"
            fi
            ;;

        redis)
            echo -e "${YELLOW}Detach with CTRL+C${NC}"
            ${dockerCompose} exec redis redis-cli -a "${REDIS_PASSWORD}"
            ;;

        *)
            throw "Invalid service ${2}\n${YELLOW}Usage: ${1} [postgres, server, backend, mongo, redis]"
            ;;
    esac
}

# Lint codebase, docs, scripts, etc
handleLinting()
{
    set +e
    # shellcheck disable=SC2001
    services=$(sed "s/\(\ \)\{0,1\}\(-\)\{0,2\}fix//g;t;q1" <<< "${@:2}")
    fixFound=$?
    if [[ $fixFound -eq 0 ]]; then
        fix="--fix"
        echo -e "${GREEN}Auto-fix enabled${NC}"
    fi
    # shellcheck disable=SC2001
    services=$(sed "s/\(\ \)\{0,1\}\(-\)\{0,2\}no-cache//g;t;q1" <<< "${services}")
    noCacheFound=$?
    cache="--cache"
    if [[ $noCacheFound -eq 0 ]]; then
        cache=""
        echo -e "${YELLOW}ESlint cache disabled${NC}"
    fi
    set -e

    # shellcheck disable=SC2068
    servicesString=$(handleServices "backend frontend docs shell" ${services[@]})
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [backend, frontend, docs, shell] [fix]"
    fi

    set +e
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *frontend* ]]; then
        echo -e "${CYAN}Running frontend lint...${NC}"
        # shellcheck disable=SC2086
        ${dockerCompose} exec -T frontend npm run lint -- ${cache} ${fix}
        frontendExitValue=$?
    fi
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *backend* ]]; then
        echo -e "${CYAN}Running backend lint...${NC}"
        # shellcheck disable=SC2086
        ${dockerCompose} exec -T backend npm run lint -- ${cache} ${fix}
        backendExitValue=$?
    fi
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *docs* ]]; then
        echo -e "${CYAN}Running docs lint...${NC}"
        # shellcheck disable=SC2086
        ${docker} run --rm -v "${scriptLocation}":/workdir ghcr.io/igorshubovych/markdownlint-cli:latest ".wiki" "*.md" ${fix}
        docsExitValue=$?
    fi
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *shell* ]]; then
        echo -e "${CYAN}Running shell lint...${NC}"
        ${docker} run --rm -v "${scriptLocation}":/mnt koalaman/shellcheck:stable ./*.sh ./**/*.sh
        shellExitValue=$?
    fi
    set -e
    if [[ ${frontendExitValue} -gt 0 || ${backendExitValue} -gt 0 || ${docsExitValue} -gt 0 || ${shellExitValue} -gt 0 ]]; then
        exit 1
    fi
}

# Validate typescript in services
handleTypescript()
{
    set +e
    # shellcheck disable=SC2001
    services=$(sed "s/\(\ \)\{0,1\}\(-\)\{0,2\}strict//g;t;q1" <<< "${@:2}")
    strictFound=$?
    if [[ $strictFound -eq 0 ]]; then
        strict="--strict"
        echo -e "${GREEN}Strict mode enabled${NC}"
    fi
    set -e

    # shellcheck disable=SC2068
    servicesString=$(handleServices "backend frontend" ${services[@]})
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [backend, frontend] [strict]"
    fi

    set +e
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *frontend* ]]; then
        echo -e "${CYAN}Running frontend typescript check...${NC}"
        # shellcheck disable=SC2086
        ${dockerCompose} exec -T frontend npm run typescript -- ${strict}
        frontendExitValue=$?
    fi
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *backend* ]]; then
        echo -e "${CYAN}Running backend typescript check...${NC}"
        # shellcheck disable=SC2086
        ${dockerCompose} exec -T backend npm run typescript -- ${strict}
        backendExitValue=$?
    fi
    set -e
    if [[ ${frontendExitValue} -gt 0 || ${backendExitValue} -gt 0 ]]; then
        exit 1
    fi
}

# Execute automated tests in services
handleTests()
{
    # shellcheck disable=SC2068
    servicesString=$(handleServices "frontend" ${services[@]})
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [frontend]"
    fi

    set +e
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *frontend* ]]; then
        echo -e "${CYAN}Running frontend tests...${NC}"
        ${dockerCompose} exec -T frontend npm run test -- --run
        frontendExitValue=$?
    fi
    set -e
    if [[ ${frontendExitValue} -gt 0 ]]; then
        exit 1
    fi
}

# Execute test coverage in services
handleTestCoverage()
{
    servicesString=$(handleServices "frontend" "${@:2}")
    if [[ ${servicesString:0:1} != 1 ]]; then
        throw "${servicesString:2}\n${YELLOW}Usage: ${1} [frontend]"
    fi

    set +e
    if [[ ${servicesString:2:4} == "all" || "${servicesString:2}" == *frontend* ]]; then
        echo -e "${CYAN}Running frontend test coverage report...${NC}"
        ${dockerCompose} exec -T frontend npm run coverage
        frontendExitValue=$?
    fi
    set -e
    if [[ ${frontendExitValue} -gt 0 ]]; then
        exit 1
    fi
}

# Update Musare
handleUpdate()
{
    musareshModified=$(git diff HEAD -- musare.sh)

    git fetch

    updated=$(git log --name-only --oneline HEAD..@\{u\})
    if [[ ${updated} == "" ]]; then
        echo -e "${GREEN}Already up to date${NC}"
        exit 0
    fi

    set +e
    breakingConfigChange=$(git rev-list "$(git rev-parse HEAD)" | grep d8b73be1de231821db34c677110b7b97e413451f)
    set -e
    if [[ -f backend/config/default.json && -z $breakingConfigChange ]]; then
        throw "Configuration has breaking changes. Please rename or remove 'backend/config/default.json' and run the update command again to continue."
    fi

    set +e
    musareshChange=$(echo "${updated}" | grep "musare.sh")
    dbChange=$(echo "${updated}" | grep "backend/logic/db/schemas")
    bcChange=$(echo "${updated}" | grep "backend/config/default.json")
    envChange=$(echo "${updated}" | grep ".env.example")
    set -e
    if [[ ( $2 == "auto" && -z $dbChange && -z $bcChange && -z $musareshChange && -z $envChange ) || -z $2 ]]; then
        if [[ -n $musareshChange && $(git diff @\{u\} -- musare.sh) != "" ]]; then
            if [[ $musareshModified != "" ]]; then
                throw "musare.sh has been modified, please reset these changes and run the update command again to continue."
            else
                git checkout @\{u\} -- musare.sh
                throw "${YELLOW}musare.sh has been updated, please run the update command again to continue."
            fi
        else
            git pull
            echo -e "${CYAN}Updating...${NC}"
            runDockerCommand "$(basename "$0") $1" pull
            runDockerCommand "$(basename "$0") $1" build
            runDockerCommand "$(basename "$0") $1" restart
            echo -e "${GREEN}Updated!${NC}"
            if [[ -n $dbChange ]]; then
                echo -e "${RED}Database schema has changed, please run migration!${NC}"
            fi
            if [[ -n $bcChange ]]; then
                echo -e "${RED}Backend config has changed, please update!${NC}"
            fi
            if [[ -n $envChange ]]; then
                echo -e "${RED}Environment config has changed, please update!${NC}"
            fi
        fi
    elif [[ $2 == "auto" ]]; then
        throw "Auto Update Failed! musare.sh, database and/or config has changed!"
    fi
}

# Backup the database
handleBackup()
{
    if [[ -z "${BACKUP_LOCATION}" ]]; then
        backupLocation="${scriptLocation%x}/backups"
    else
        backupLocation="${BACKUP_LOCATION%/}"
    fi
    if [[ ! -d "${backupLocation}" ]]; then
        echo -e "${YELLOW}Creating backup directory at ${backupLocation}${NC}"
        mkdir "${backupLocation}"
    fi
    if [[ -z "${BACKUP_NAME}" ]]; then
        backupLocation="${backupLocation}/musare-$(date +"%Y-%m-%d-%s").dump"
    else
        backupLocation="${backupLocation}/${BACKUP_NAME}"
    fi
    echo -e "${YELLOW}Creating backup at ${backupLocation}${NC}"
    ${dockerCompose} exec -T mongo sh -c "mongodump --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} -d musare --archive" > "${backupLocation}"
}

# Restore database from dump
handleRestore()
{
    if [[ -z $2 ]]; then
        echo -e "${GREEN}Please enter the full path of the dump you wish to restore: ${NC}"
        read -r restoreFile
    else
        restoreFile=$2
    fi

    if [[ -z ${restoreFile} ]]; then
        throw "Error: no restore path given, cancelled restoration."
    elif [[ -d ${restoreFile} ]]; then
        throw "Error: restore path given is a directory, cancelled restoration."
    elif [[ ! -f ${restoreFile} ]]; then
        throw "Error: no file at restore path given, cancelled restoration."
    else
        ${dockerCompose} exec -T mongo sh -c "mongorestore --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --archive" < "${restoreFile}"
    fi
}

# Toggle user admin role
handleAdmin()
{
    MONGO_VERSION_INT=${MONGO_VERSION:0:1}

    case $2 in
        add)
            if [[ -z $3 ]]; then
                echo -e "${GREEN}Please enter the username of the user you wish to make an admin: ${NC}"
                read -r adminUser
            else
                adminUser=$3
            fi
            if [[ -z $adminUser ]]; then
                throw "Error: Username for new admin not provided."
            fi

            if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
            else
                ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
            fi
            ;;
        remove)
            if [[ -z $3 ]]; then
                echo -e "${GREEN}Please enter the username of the user you wish to remove as admin: ${NC}"
                read -r adminUser
            else
                adminUser=$3
            fi
            if [[ -z $adminUser ]]; then
                throw "Error: Username for new admin not provided."
            fi

            if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
            else
                ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
            fi
            ;;
        *)
            throw "Invalid command $2\n${YELLOW}Usage: ${1} [add,remove] username"
            ;;
    esac
}

availableCommands=$(cat << COMMANDS
start - Start services
stop - Stop services
restart - Restart services
status - Service status
logs - View logs for services
update - Update Musare
attach [backend,mongo,redis] - Attach to backend service, mongo or redis shell
build - Build services
lint - Run lint on frontend, backend, docs and/or shell
backup - Backup database data to file
restore - Restore database data from backup file
reset - Reset service data
admin [add,remove] - Assign/unassign admin role to/from a user
typescript - Run typescript checks on frontend and/or backend
COMMANDS
)

# Handle command
case $1 in
    start)
        echo -e "${CYAN}Musare | Start Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" start ${@:2}
        ;;

    stop)
        echo -e "${CYAN}Musare | Stop Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" stop ${@:2}
        ;;

    restart)
        echo -e "${CYAN}Musare | Restart Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" restart ${@:2}
        ;;

    build)
        echo -e "${CYAN}Musare | Build Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" pull ${@:2}
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" build ${@:2}
        ;;

    status)
        echo -e "${CYAN}Musare | Service Status${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" ps ${@:2}
        ;;

    reset)
        echo -e "${CYAN}Musare | Reset Services${NC}"
        # shellcheck disable=SC2068
        handleReset "$(basename "$0") $1" ${@:2}
        ;;

    attach)
        echo -e "${CYAN}Musare | Attach${NC}"
        attachContainer "$(basename "$0") $1" "$2"
        ;;

    lint|eslint)
        echo -e "${CYAN}Musare | Lint${NC}"
        # shellcheck disable=SC2068
        handleLinting "$(basename "$0") $1" ${@:2}
        ;;

    typescript|ts)
        echo -e "${CYAN}Musare | TypeScript Check${NC}"
        # shellcheck disable=SC2068
        handleTypescript "$(basename "$0") $1" ${@:2}
        ;;

    test)
        echo -e "${CYAN}Musare | Test${NC}"
        # shellcheck disable=SC2068
        handleTests "$(basename "$0") $1" ${@:2}
        ;;

    test:coverage)
        echo -e "${CYAN}Musare | Test Coverage${NC}"
        # shellcheck disable=SC2068
        handleTestCoverage "$(basename "$0") $1" ${@:2}
        ;;

    update)
        echo -e "${CYAN}Musare | Update${NC}"
        # shellcheck disable=SC2068
        handleUpdate "$(basename "$0") $1" ${@:2}
        ;;

    logs)
        echo -e "${CYAN}Musare | Logs${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0") $1" logs ${@:2}
        ;;

    backup)
        echo -e "${CYAN}Musare | Backup${NC}"
        # shellcheck disable=SC2068
        handleBackup "$(basename "$0") $1" ${@:2}
        ;;

    restore)
        echo -e "${CYAN}Musare | Restore${NC}"
        # shellcheck disable=SC2068
        handleRestore "$(basename "$0") $1" ${@:2}
        ;;

    admin)
        echo -e "${CYAN}Musare | Add Admin${NC}"
        # shellcheck disable=SC2068
        handleAdmin "$(basename "$0") $1" ${@:2}
        ;;

    "")
        echo -e "${CYAN}Musare | Available Commands${NC}"
        echo -e "${YELLOW}${availableCommands}${NC}"
        ;;

    *)
        echo -e "${CYAN}Musare${NC}"
        echo -e "${RED}Error: Invalid Command $1${NC}"
        echo -e "${CYAN}Available Commands:${NC}"
        echo -e "${YELLOW}${availableCommands}${NC}"
        exit 1
        ;;
esac
