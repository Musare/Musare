#!/bin/bash

export PATH=/usr/local/bin:/usr/bin:/bin

CYAN='\033[33;36m';
RED='\033[0;31m'
YELLOW='\033[0;93m'
GREEN='\033[0;32m'
NC='\033[0m'

scriptLocation=$(dirname -- "$(readlink -fn -- "$0"; echo x)")
cd "${scriptLocation%x}" || exit 1

if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    source .env
else
    echo -e "${RED}Error: .env does not exist${NC}"
    exit 2
fi

if [[ -z ${DOCKER_COMMAND} ]]; then
    DOCKER_COMMAND="docker"
elif [[ ${DOCKER_COMMAND} != "docker" && ${DOCKER_COMMAND} != "podman" ]]; then
    echo -e "${RED}Error: Invalid DOCKER_COMMAND${NC}"
    exit 1
fi

docker="${DOCKER_COMMAND}"
dockerCompose="${DOCKER_COMMAND}-compose"

if [[ ! -x "$(command -v ${docker})" || ! -x "$(command -v ${dockerCompose})" ]]; then
    if [[ -x "$(command -v ${docker})" && ! -x "$(command -v ${dockerCompose})" ]]; then
        echo -e "${RED}Error: ${dockerCompose} not installed.${NC}"
    elif [[ ! -x "$(command -v ${docker})" && -x "$(command -v ${dockerCompose})" ]]; then
        echo -e "${RED}Error: ${docker} not installed.${NC}"
    else
        echo -e "${RED}Error: ${docker} and ${dockerCompose} not installed.${NC}"
    fi
    exit 1
fi

composeFiles="-f docker-compose.yml"
if [[ ${CONTAINER_MODE} == "dev" ]]; then
    composeFiles="${composeFiles} -f docker-compose.dev.yml"
fi
if [[ -f docker-compose.override.yml ]]; then
    composeFiles="${composeFiles} -f docker-compose.override.yml"
fi
dockerCompose="${dockerCompose} ${composeFiles}"

handleServices()
{
    validServices=(backend frontend mongo redis)
    servicesArray=()
    invalidServices=false
    for x in "$@"; do
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

runDockerCommand()
{
    validCommands=(start stop restart pull build ps logs)
    if [[ ${validCommands[*]} =~ (^|[[:space:]])"$2"($|[[:space:]]) ]]; then
        servicesString=$(handleServices "${@:3}")
        if [[ ${servicesString:0:1} == 1 ]]; then
            if [[ ${servicesString:2:4} == "all" ]]; then
                servicesString=""
            else
                servicesString=${servicesString:2}
            fi

            if [[ ${2} == "stop" || ${2} == "restart" ]]; then
                # shellcheck disable=SC2086
                ${dockerCompose} stop ${servicesString}
            fi
            if [[ ${2} == "start" || ${2} == "restart" ]]; then
                # shellcheck disable=SC2086
                ${dockerCompose} up -d ${servicesString}
            fi
            if [[ ${2} == "pull" || ${2} == "build" || ${2} == "ps" || ${2} == "logs" ]]; then
                # shellcheck disable=SC2086
                ${dockerCompose} "${2}" ${servicesString}
            fi

            exitValue=$?
            if [[ ${exitValue} -gt 0 ]]; then
                exit ${exitValue}
            fi
        else
            echo -e "${RED}${servicesString:2}\n${YELLOW}Usage: ${1} restart [backend, frontend, mongo, redis]${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Invalid runDockerCommand input${NC}"
        exit 1
    fi
}

getContainerId()
{
    if [[ ${DOCKER_COMMAND} == "docker" ]]; then
        containerId=$(${dockerCompose} ps -q "${1}")
    else
        containerId=$(${dockerCompose} ps | sed '0,/CONTAINER/d' | awk "/${1}/ {print \$1;exit}")
    fi
    echo "${containerId}"
}

case $1 in
    start)
        echo -e "${CYAN}Musare | Start Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" start ${@:2}
        ;;

    stop)
        echo -e "${CYAN}Musare | Stop Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" stop ${@:2}
        ;;

    restart)
        echo -e "${CYAN}Musare | Restart Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" restart ${@:2}
        ;;

    build)
        echo -e "${CYAN}Musare | Build Services${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" pull ${@:2}
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" build ${@:2}
        ;;

    status)
        echo -e "${CYAN}Musare | Service Status${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" ps ${@:2}
        ;;

    reset)
        echo -e "${CYAN}Musare | Reset Services${NC}"
        servicesString=$(handleServices "${@:2}")
        if [[ ${servicesString:0:1} == 1 && ${servicesString:2:4} == "all" ]]; then
            echo -e "${RED}Resetting will remove the ${REDIS_DATA_LOCATION} and ${MONGO_DATA_LOCATION} directories.${NC}"
            echo -e "${GREEN}Are you sure you want to reset all data? ${YELLOW}[y,n]: ${NC}"
            read -r confirm
            if [[ "${confirm}" == y* ]]; then
                runDockerCommand "$(basename "$0")" stop
                ${dockerCompose} rm -v --force
                if [[ -d $REDIS_DATA_LOCATION ]]; then
                    rm -rf "${REDIS_DATA_LOCATION}"
                fi
                if [[ -d $MONGO_DATA_LOCATION ]]; then
                    rm -rf "${MONGO_DATA_LOCATION}"
                fi
            else
                echo -e "${RED}Cancelled reset${NC}"
            fi
        elif [[ ${servicesString:0:1} == 1 ]]; then
            if [[ "${servicesString:2}" == *redis* && "${servicesString:2}" == *mongo* ]]; then
                echo -e "${RED}Resetting will remove the ${REDIS_DATA_LOCATION} and ${MONGO_DATA_LOCATION} directories.${NC}"
            elif [[ "${servicesString:2}" == *redis* ]]; then
                echo -e "${RED}Resetting will remove the ${REDIS_DATA_LOCATION} directory.${NC}"
            elif [[ "${servicesString:2}" == *mongo* ]]; then
                echo -e "${RED}Resetting will remove the ${MONGO_DATA_LOCATION} directory.${NC}"
            fi
            echo -e "${GREEN}Are you sure you want to reset all data for $(echo "${servicesString:2}" | tr ' ' ',')? ${YELLOW}[y,n]: ${NC}"
            read -r confirm
            if [[ "${confirm}" == y* ]]; then
                # shellcheck disable=SC2086
                runDockerCommand "$(basename "$0")" stop ${servicesString:2}
                # shellcheck disable=SC2086
                ${dockerCompose} rm -v --force ${servicesString}
                if [[ "${servicesString:2}" == *redis* && -d $REDIS_DATA_LOCATION ]]; then
                    rm -rf "${REDIS_DATA_LOCATION}"
                fi
                if [[ "${servicesString:2}" == *mongo* && -d $MONGO_DATA_LOCATION ]]; then
                    rm -rf "${MONGO_DATA_LOCATION}"
                fi
            else
                echo -e "${RED}Cancelled reset${NC}"
            fi
        else
            echo -e "${RED}${servicesString:2}\n${YELLOW}Usage: $(basename "$0") build [backend, frontend, mongo, redis]${NC}"
            exit 1
        fi
        ;;

    attach)
        echo -e "${CYAN}Musare | Attach${NC}"
        if [[ $2 == "backend" ]]; then
            containerId=$(getContainerId backend)
            if [[ -z $containerId ]]; then
                echo -e "${RED}Error: Backend offline, please start to attach.${NC}"
                exit 1
            else
                echo -e "${YELLOW}Detach with CTRL+P+Q${NC}"
                ${docker} attach "$containerId"
            fi
        elif [[ $2 == "mongo" ]]; then
            MONGO_VERSION_INT=${MONGO_VERSION:0:1}
            if [[ -z $(getContainerId mongo) ]]; then
                echo -e "${RED}Error: Mongo offline, please start to attach.${NC}"
                exit 1
            else
                echo -e "${YELLOW}Detach with CTRL+D${NC}"
                if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                    ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry()" --shell
                else
                    ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}"
                fi
            fi
        elif [[ $2 == "redis" ]]; then
            if [[ -z $(getContainerId redis) ]]; then
                echo -e "${RED}Error: Redis offline, please start to attach.${NC}"
                exit 1
            else
                echo -e "${YELLOW}Detach with CTRL+C${NC}"
                ${dockerCompose} exec redis redis-cli -a "${REDIS_PASSWORD}"
            fi
        else
            echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename "$0") attach [backend,mongo,redis]${NC}"
            exit 1
        fi
        ;;

    lint|eslint)
        echo -e "${CYAN}Musare | Lint${NC}"
        fix=""
        if [[ $2 == "fix" || $3 == "fix" || $2 == "--fix" || $3 == "--fix" ]]; then
            fix="--fix"
            echo -e "${GREEN}Auto-fix enabled${NC}"
        fi
        case $2 in
            frontend)
                ${dockerCompose} exec -T frontend npx eslint --cache src --ext .js,.vue $fix
                exitValue=$?
                ;;
            backend)
                ${dockerCompose} exec -T backend npx eslint --cache logic $fix
                exitValue=$?
                ;;
            docs)
                ${docker} run -v "${scriptLocation}":/workdir ghcr.io/igorshubovych/markdownlint-cli:latest ".wiki" "*.md" $fix
                exitValue=$?
                ;;
            ""|fix|--fix)
                ${dockerCompose} exec -T frontend npx eslint --cache src --ext .js,.vue $fix
                frontendExitValue=$?
                ${dockerCompose} exec -T backend npx eslint --cache logic $fix
                backendExitValue=$?
                ${docker} run -v "${scriptLocation}":/workdir ghcr.io/igorshubovych/markdownlint-cli:latest ".wiki" "*.md" $fix
                docsExitValue=$?
                if [[ ${frontendExitValue} -gt 0 || ${backendExitValue} -gt 0 || ${docsExitValue} -gt 0 ]]; then
                    exitValue=1
                else
                    exitValue=0
                fi
                ;;
            *)
                echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename "$0") lint [backend, frontend, docs] [fix]${NC}"
                exitValue=1
                ;;
        esac
        if [[ ${exitValue} -gt 0 ]]; then
            exit ${exitValue}
        fi
        ;;

    update)
        echo -e "${CYAN}Musare | Update${NC}"
        git fetch
        exitValue=$?
        if [[ ${exitValue} -gt 0 ]]; then
            exit ${exitValue}
        fi
        if [[ $(git rev-parse HEAD) == $(git rev-parse @\{u\}) ]]; then
            echo -e "${GREEN}Already up to date${NC}"
        else
            dbChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "backend/logic/db/schemas")
            fcChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "frontend/dist/config/template.json")
            bcChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "backend/config/template.json")
            if [[ ( $2 == "auto" && -z $dbChange && -z $fcChange && -z $bcChange ) || -z $2 ]]; then
                echo -e "${CYAN}Updating...${NC}"
                git pull
                exitValue=$?
                if [[ ${exitValue} -gt 0 ]]; then
                    exit ${exitValue}
                fi
                runDockerCommand "$(basename "$0")" build
                runDockerCommand "$(basename "$0")" restart
                echo -e "${GREEN}Updated!${NC}"
                if [[ -n $dbChange ]]; then
                    echo -e "${RED}Database schema has changed, please run migration!${NC}"
                fi
                if [[ -n $fcChange ]]; then
                    echo -e "${RED}Frontend config has changed, please update!${NC}"
                fi
                if [[ -n $bcChange ]]; then
                    echo -e "${RED}Backend config has changed, please update!${NC}"
                fi
            elif [[ $2 == "auto" ]]; then
                echo -e "${RED}Auto Update Failed! Database and/or config has changed!${NC}"
                exit 1
            fi
        fi
        ;;

    logs)
        echo -e "${CYAN}Musare | Logs${NC}"
        # shellcheck disable=SC2068
        runDockerCommand "$(basename "$0")" logs ${@:2}
        ;;

    backup)
        echo -e "${CYAN}Musare | Backup${NC}"
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
        ;;

    restore)
        echo -e "${CYAN}Musare | Restore${NC}"
        if [[ -z $2 ]]; then
            echo -e "${GREEN}Please enter the full path of the dump you wish to restore: ${NC}"
            read -r restoreFile
        else
            restoreFile=$2
        fi
        if [[ -z ${restoreFile} ]]; then
            echo -e "${RED}Error: no restore path given, cancelled restoration.${NC}"
            exit 1
        elif [[ -d ${restoreFile} ]]; then
            echo -e "${RED}Error: restore path given is a directory, cancelled restoration.${NC}"
            exit 1
        elif [[ ! -f ${restoreFile} ]]; then
            echo -e "${RED}Error: no file at restore path given, cancelled restoration.${NC}"
            exit 1
        else
            ${dockerCompose} exec -T mongo sh -c "mongorestore --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --archive" < "${restoreFile}"
        fi
        ;;

    admin)
        echo -e "${CYAN}Musare | Add Admin${NC}"
        MONGO_VERSION_INT=${MONGO_VERSION:0:1}
        if [[ $2 == "add" ]]; then
            if [[ -z $3 ]]; then
                echo -e "${GREEN}Please enter the username of the user you wish to make an admin: ${NC}"
                read -r adminUser
            else
                adminUser=$3
            fi
            if [[ -z $adminUser ]]; then
                echo -e "${RED}Error: Username for new admin not provided.${NC}"
                exit 1
            else
                if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                    ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
                else
                    ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
                fi
            fi
        elif [[ $2 == "remove" ]]; then
            if [[ -z $3 ]]; then
                echo -e "${GREEN}Please enter the username of the user you wish to remove as admin: ${NC}"
                read -r adminUser
            else
                adminUser=$3
            fi
            if [[ -z $adminUser ]]; then
                echo -e "${RED}Error: Username for new admin not provided.${NC}"
                exit 1
            else
                if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                    ${dockerCompose} exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
                else
                    ${dockerCompose} exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
                fi
            fi
        else
            echo -e "${RED}Invalid command $2\n${YELLOW}Usage: $(basename "$0") admin [add,remove] username${NC}"
            exit 1
        fi
        ;;

    "")
        echo -e "${CYAN}Musare | Available Commands${NC}"
        echo -e "${YELLOW}start - Start services${NC}"
        echo -e "${YELLOW}stop - Stop services${NC}"
        echo -e "${YELLOW}restart - Restart services${NC}"
        echo -e "${YELLOW}status - Service status${NC}"
        echo -e "${YELLOW}logs - View logs for services${NC}"
        echo -e "${YELLOW}update - Update Musare${NC}"
        echo -e "${YELLOW}attach [backend,mongo,redis] - Attach to backend service, mongo or redis shell${NC}"
        echo -e "${YELLOW}build - Build services${NC}"
        echo -e "${YELLOW}lint - Run lint on frontend, backend and/or docs${NC}"
        echo -e "${YELLOW}backup - Backup database data to file${NC}"
        echo -e "${YELLOW}restore - Restore database data from backup file${NC}"
        echo -e "${YELLOW}reset - Reset service data${NC}"
        echo -e "${YELLOW}admin [add,remove] - Assign/unassign admin role to/from a user${NC}"
        ;;

    *)
        echo -e "${CYAN}Musare${NC}"
        echo -e "${RED}Error: Invalid Command $1${NC}"
        echo -e "${CYAN}Available Commands:${NC}"
        echo -e "${YELLOW}start - Start services${NC}"
        echo -e "${YELLOW}stop - Stop services${NC}"
        echo -e "${YELLOW}restart - Restart services${NC}"
        echo -e "${YELLOW}status - Service status${NC}"
        echo -e "${YELLOW}logs - View logs for services${NC}"
        echo -e "${YELLOW}update - Update Musare${NC}"
        echo -e "${YELLOW}attach [backend,mongo,redis] - Attach to backend service, mongo or redis shell${NC}"
        echo -e "${YELLOW}build - Build services${NC}"
        echo -e "${YELLOW}lint - Run lint on frontend, backend and/or docs${NC}"
        echo -e "${YELLOW}backup - Backup database data to file${NC}"
        echo -e "${YELLOW}restore - Restore database data from backup file${NC}"
        echo -e "${YELLOW}reset - Reset service data${NC}"
        echo -e "${YELLOW}admin [add,remove] - Assign/unassign admin role to/from a user${NC}"
        exit 1
        ;;
esac
