#!/bin/bash

export PATH=/usr/local/bin:/usr/bin:/bin

CYAN='\033[33;36m';
RED='\033[0;31m'
YELLOW='\033[0;93m'
GREEN='\033[0;32m'
NC='\033[0m'

scriptLocation=$(dirname -- "$(readlink -fn -- "$0"; echo x)")
cd "${scriptLocation%x}" || exit

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

dockerCommand()
{
    validCommands=(start stop restart pull build ps)
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
                docker-compose stop ${servicesString}
            fi
            if [[ ${2} == "start" || ${2} == "restart" ]]; then
                # shellcheck disable=SC2086
                docker-compose up -d ${servicesString}
            fi
            if [[ ${2} == "pull" || ${2} == "build" || ${2} == "ps" ]]; then
                # shellcheck disable=SC2086
                docker-compose "${2}" ${servicesString}
            fi
        else
            echo -e "${RED}${servicesString:2}\n${YELLOW}Usage: ${1} restart [backend, frontend, mongo, redis]${NC}"
        fi
    else
        echo -e "${RED}Error: Invalid dockerCommand input${NC}"
    fi
}

if [[ -x "$(command -v docker)" && -x "$(command -v docker-compose)" ]]; then
    case $1 in
    start)
        echo -e "${CYAN}Musare | Start Services${NC}"
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" start ${@:2}
        ;;

    stop)
        echo -e "${CYAN}Musare | Stop Services${NC}"
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" stop ${@:2}
        ;;

    restart)
        echo -e "${CYAN}Musare | Restart Services${NC}"
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" restart ${@:2}
        ;;

    build)
        echo -e "${CYAN}Musare | Build Services${NC}"
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" pull ${@:2}
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" build ${@:2}
        ;;

    status)
        echo -e "${CYAN}Musare | Service Status${NC}"
        # shellcheck disable=SC2068
        dockerCommand "$(basename "$0")" ps ${@:2}
        ;;

    reset)
        echo -e "${CYAN}Musare | Reset Services${NC}"
        if [[ -f .env ]]; then
            # shellcheck disable=SC1091
            source .env
            servicesString=$(handleServices "${@:2}")
            if [[ ${servicesString:0:1} == 1 && ${servicesString:2:4} == "all" ]]; then
                echo -e "${RED}Resetting will remove the ${REDIS_DATA_LOCATION} and ${MONGO_DATA_LOCATION} directories.${NC}"
                echo -e "${GREEN}Are you sure you want to reset all data? ${YELLOW}[y,n]: ${NC}"
                read -r confirm
                if [[ "${confirm}" == y* ]]; then
                    docker-compose stop
                    docker-compose rm -v --force
                    if [[ -d $REDIS_DATA_LOCATION ]]; then
                        rm -rf $REDIS_DATA_LOCATION
                    fi
                    if [[ -d $MONGO_DATA_LOCATION ]]; then
                        rm -rf $MONGO_DATA_LOCATION
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
                    docker-compose stop ${servicesString:2}
                    # shellcheck disable=SC2086
                    docker-compose rm -v --force ${servicesString:2}
                    if [[ "${servicesString:2}" == *redis* && -d $REDIS_DATA_LOCATION ]]; then
                        rm -rf $REDIS_DATA_LOCATION
                    fi
                    if [[ "${servicesString:2}" == *mongo* && -d $MONGO_DATA_LOCATION ]]; then
                        rm -rf $MONGO_DATA_LOCATION
                    fi
                else
                    echo -e "${RED}Cancelled reset${NC}"
                fi
            else
                echo -e "${RED}${servicesString:2}\n${YELLOW}Usage: $(basename "$0") build [backend, frontend, mongo, redis]${NC}"
            fi
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    attach)
        echo -e "${CYAN}Musare | Attach${NC}"
        if [[ -f .env ]]; then
            # shellcheck disable=SC1091
            source .env
            if [[ $2 == "backend" ]]; then
                containerId=$(docker-compose ps -q backend)
                if [[ -z $containerId ]]; then
                    echo -e "${RED}Error: Backend offline, please start to attach.${NC}"
                else
                    echo -e "${YELLOW}Detach with CTRL+P+Q${NC}"
                    docker attach "$containerId"
                fi
            elif [[ $2 == "mongo" ]]; then
                MONGO_VERSION_INT=${MONGO_VERSION:0:1}
                if [[ -z $(docker-compose ps -q mongo) ]]; then
                    echo -e "${RED}Error: Mongo offline, please start to attach.${NC}"
                else
                    echo -e "${YELLOW}Detach with CTRL+D${NC}"
                    if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                        docker-compose exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry()" --shell
                    else
                        docker-compose exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}"
                    fi
                fi
            elif [[ $2 == "redis" ]]; then
                if [[ -z $(docker-compose ps -q redis) ]]; then
                    echo -e "${RED}Error: Redis offline, please start to attach.${NC}"
                else
                    echo -e "${YELLOW}Detach with CTRL+C${NC}"
                    docker-compose exec redis redis-cli -a "${REDIS_PASSWORD}"
                fi
            else
                echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename "$0") attach [backend,mongo,redis]${NC}"
            fi
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    eslint)
        echo -e "${CYAN}Musare | ESLint${NC}"
        fix=""
        if [[ $2 == "fix" || $3 == "fix" || $2 == "--fix" || $3 == "--fix" ]]; then
            fix="--fix"
            echo -e "${GREEN}Auto-fix enabled${NC}"
        fi
        case $2 in
            frontend)
                docker-compose exec frontend npx eslint app/src --ext .js,.vue $fix
                ;;
            backend)
                docker-compose exec backend npx eslint app/logic $fix
                ;;
            ""|fix|--fix)
                docker-compose exec frontend npx eslint app/src --ext .js,.vue $fix
                docker-compose exec backend npx eslint app/logic $fix
                ;;
            *)
                echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename "$0") eslint [backend, frontend] [fix]${NC}"
                ;;
        esac
        ;;

    update)
        echo -e "${CYAN}Musare | Update${NC}"
        git fetch
        if [[ $(git rev-parse HEAD) == $(git rev-parse @\{u\}) ]]; then
            echo -e "${GREEN}Already up to date${NC}"
        else
            dbChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "backend/logic/db/schemas")
            fcChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "frontend/dist/config/template.json")
            bcChange=$(git log --name-only --oneline HEAD..origin/"$(git rev-parse --abbrev-ref HEAD)" | grep "backend/config/template.json")
            if [[ ( $2 == "auto" && -z $dbChange && -z $fcChange && -z $bcChange ) || -z $2 ]]; then
                echo -e "${CYAN}Updating...${NC}"
                git pull
                docker-compose build
                docker-compose stop
                docker-compose up -d
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
            fi
        fi
        ;;

    logs)
        echo -e "${CYAN}Musare | Logs${NC}"
        docker-compose logs "${@:2}"
        ;;

    backup)
        echo -e "${CYAN}Musare | Backup${NC}"
        if [[ -f .env ]]; then
            # shellcheck disable=SC1091
            source .env
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
            docker-compose exec -T mongo sh -c "mongodump --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} -d musare --archive" > "${backupLocation}"
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    restore)
        echo -e "${CYAN}Musare | Restore${NC}"
        if [[ -f .env ]]; then
            # shellcheck disable=SC1091
            source .env
            if [[ -z $2 ]]; then
                echo -e "${GREEN}Please enter the full path of the dump you wish to restore: ${NC}"
                read -r restoreFile
            else
                restoreFile=$2
            fi
            if [[ -z ${restoreFile} ]]; then
                echo -e "${RED}Error: no restore path given, cancelled restoration.${NC}"
            elif [[ -d ${restoreFile} ]]; then
                echo -e "${RED}Error: restore path given is a directory, cancelled restoration.${NC}"
            elif [[ ! -f ${restoreFile} ]]; then
                echo -e "${RED}Error: no file at restore path given, cancelled restoration.${NC}"
            else
                docker-compose exec -T mongo sh -c "mongorestore --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --archive" < "${restoreFile}"
            fi
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    admin)
        echo -e "${CYAN}Musare | Add Admin${NC}"
        if [[ -f .env ]]; then
            # shellcheck disable=SC1091
            source .env
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
                else
                    if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                        docker-compose exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
                    else
                        docker-compose exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
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
                else
                    if [[ $MONGO_VERSION_INT -ge 5 ]]; then
                        docker-compose exec mongo mongosh musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "disableTelemetry(); db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
                    else
                        docker-compose exec mongo mongo musare -u "${MONGO_USER_USERNAME}" -p "${MONGO_USER_PASSWORD}" --eval "db.users.updateOne({username: '${adminUser}'}, {\$set: {role: 'default'}})"
                    fi
                fi
            else
                echo -e "${RED}Invalid command $2\n${YELLOW}Usage: $(basename "$0") admin [add,remove] username${NC}"
            fi
        else
            echo -e "${RED}Error: .env does not exist${NC}"
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
        echo -e "${YELLOW}eslint - Run eslint on frontend and/or backend${NC}"
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
        echo -e "${YELLOW}eslint - Run eslint on frontend and/or backend${NC}"
        echo -e "${YELLOW}backup - Backup database data to file${NC}"
        echo -e "${YELLOW}restore - Restore database data from backup file${NC}"
        echo -e "${YELLOW}reset - Reset service data${NC}"
        echo -e "${YELLOW}admin [add,remove] - Assign/unassign admin role to/from a user${NC}"
        ;;

    esac
elif [[ -x "$(command -v docker)" && ! -x "$(command -v docker-compose)" ]]; then
    echo -e "${RED}Error: docker-compose not installed.${NC}"
elif [[ ! -x "$(command -v docker)" && -x "$(command -v docker-compose)" ]]; then
    echo -e "${RED}Error: docker not installed.${NC}"
else
    echo -e "${RED}Error: docker and docker-compose not installed.${NC}"
fi
