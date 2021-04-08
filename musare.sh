#!/bin/bash

export PATH=/usr/local/bin:/usr/bin:/bin

CYAN='\033[33;36m';
RED='\033[0;31m'
YELLOW='\033[0;93m'
GREEN='\033[0;32m'
NC='\033[0m'

scriptLocation="$(dirname -- $(readlink -fn -- "$0"; echo x))"
cd "${scriptLocation%x}"

handleServices()
{
    validServices=(backend frontend mongo redis)
    services=()
    invalidServices=false
    for x in $@; do
        if [[ ${validServices[@]} =~ (^|[[:space:]])"$x"($|[[:space:]]) ]]; then
            if ! [[ ${services[@]} =~ (^|[[:space:]])"$x"($|[[:space:]]) ]]; then
                services+=("${x}")
            fi
        else
            if [[ $invalidServices == false ]]; then
                invalidServices="${x}"
            else
                invalidServices="${invalidServices} ${x}"
            fi
        fi
    done
    if [[ $invalidServices == false && ${#services[@]} > 0 ]]; then
        echo "1|${services[@]}"
    elif [[ $invalidServices == false ]]; then
        echo "1|all"
    else
        echo "0|Invalid Service(s): ${invalidServices}"
    fi
}

if [[ -x "$(command -v docker)" && -x "$(command -v docker-compose)" ]]; then
    case $1 in
    start)
        echo -e "${CYAN}Musare | Start Services${NC}"
        services=$(handleServices "${@:2}")
        if [[ ${services:0:1} == 1 && ${services:2:4} == "all" ]]; then
            docker-compose up -d
        elif [[ ${services:0:1} == 1 ]]; then
            docker-compose up -d ${services:2}
        else
            echo -e "${RED}${services:2}\n${YELLOW}Usage: $(basename $0) start [backend, frontend, mongo, redis]${NC}"
        fi
        ;;

    stop)
        echo -e "${CYAN}Musare | Stop Services${NC}"
        services=$(handleServices "${@:2}")
        if [[ ${services:0:1} == 1 && ${services:2:4} == "all" ]]; then
            docker-compose stop
        elif [[ ${services:0:1} == 1 ]]; then
            docker-compose stop ${services:2}
        else
            echo -e "${RED}${services:2}\n${YELLOW}Usage: $(basename $0) stop [backend, frontend, mongo, redis]${NC}"
        fi
        ;;

    restart)
        echo -e "${CYAN}Musare | Restart Services${NC}"
        services=$(handleServices "${@:2}")
        if [[ ${services:0:1} == 1 && ${services:2:4} == "all" ]]; then
            docker-compose restart
        elif [[ ${services:0:1} == 1 ]]; then
            docker-compose restart ${services:2}
        else
            echo -e "${RED}${services:2}\n${YELLOW}Usage: $(basename $0) restart [backend, frontend, mongo, redis]${NC}"
        fi
        ;;

    build)
        echo -e "${CYAN}Musare | Build Services${NC}"
        services=$(handleServices "${@:2}")
        if [[ ${services:0:1} == 1 && ${services:2:4} == "all" ]]; then
            docker-compose build
        elif [[ ${services:0:1} == 1 ]]; then
            docker-compose build ${services:2}
        else
            echo -e "${RED}${services:2}\n${YELLOW}Usage: $(basename $0) build [backend, frontend, mongo, redis]${NC}"
        fi
        ;;

    reset)
        echo -e "${CYAN}Musare | Reset Services${NC}"
        services=$(handleServices "${@:2}")
        if [[ ${services:0:1} == 1 && ${services:2:4} == "all" ]]; then
            echo -e "${GREEN}Are you sure you want to reset all data? ${YELLOW}[y,n]: ${NC}"
            read confirm
            if [[ "${confirm}" == y* ]]; then
                docker-compose stop
                docker-compose rm -v --force
                if [[ -d ".redis" ]]; then
                    rm -rf .redis
                fi
                if [[ -d ".db" ]]; then
                    rm -rf .db
                fi
            else
                echo -e "${RED}Cancelled reset${NC}"
            fi
        elif [[ ${services:0:1} == 1 ]]; then
            echo -e "${GREEN}Are you sure you want to reset all data for $(echo ${services:2} | tr ' ' ',')? ${YELLOW}[y,n]: ${NC}"
            read confirm
            if [[ "${confirm}" == y* ]]; then
                docker-compose stop ${services:2}
                docker-compose rm -v --force ${services:2}
                if [[ "${services:2}" == *redis* && -d ".redis" ]]; then
                    rm -rf .redis
                fi
                if [[ "${services:2}" == *mongo* && -d ".db" ]]; then
                    rm -rf .db
                fi
            else
                echo -e "${RED}Cancelled reset${NC}"
            fi
        else
            echo -e "${RED}${services:2}\n${YELLOW}Usage: $(basename $0) build [backend, frontend, mongo, redis]${NC}"
        fi
        ;;

    attach)
        echo -e "${CYAN}Musare | Attach${NC}"
        if [[ $2 == "backend" ]]; then
            containerId=$(docker-compose ps -q backend)
            if [[ -z $containerId ]]; then
                echo -e "${RED}Error: Backend offline, please start to attach.${NC}"
            else
                docker attach $containerId
            fi
        else
            echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename $0) attach backend${NC}"
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
                echo -e "${RED}Invalid service $2\n${YELLOW}Usage: $(basename $0) eslint [backend, frontend] [fix]${NC}"
                ;;
        esac
        ;;

    update)
        echo -e "${CYAN}Musare | Update${NC}"
        git fetch
        if [[ $(git rev-parse HEAD) == $(git rev-parse @{u}) ]]; then
            echo -e "${GREEN}Already up to date${NC}"
        else
            git pull
            docker-compose build
            docker-compose up -d
        fi
        ;;

    logs)
        echo -e "${CYAN}Musare | Logs${NC}"
        docker-compose logs ${@:2}
        ;;

    backup)
        echo -e "${CYAN}Musare | Backup${NC}"
        if [[ -f .env ]]; then
            source .env
            echo -e "${YELLOW}Creating backup at ${PWD}/musare-$(date +"%Y-%m-%d-%s").dump${NC}"
            docker-compose exec -T mongo sh -c "mongodump --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} -d musare --archive" > musare-$(date +"%Y-%m-%d-%s").dump
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    restore)
        echo -e "${CYAN}Musare | Restore${NC}"
        if [[ -f .env ]]; then
            source .env
            if [[ -z $2 ]]; then
                echo -e "${GREEN}Please enter the full path of the dump you wish to restore: ${NC}"
                read restoreFile
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
                docker-compose exec -T mongo sh -c "mongorestore --authenticationDatabase musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --archive" < ${restoreFile}
            fi
        else
            echo -e "${RED}Error: .env does not exist${NC}"
        fi
        ;;

    admin)
        echo -e "${CYAN}Musare | Add Admin${NC}"
        if [[ -f .env ]]; then
            source .env
            if [[ $2 == "add" ]]; then
                if [[ -z $3 ]]; then
                    echo -e "${GREEN}Please enter the username of the user you wish to make an admin: ${NC}"
                    read adminUser
                else
                    adminUser=$3
                fi
                if [[ -z $adminUser ]]; then
                    echo -e "${RED}Error: Username for new admin not provided.${NC}"
                else
                    docker-compose exec mongo mongo musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --eval "db.users.update({username: '${adminUser}'}, {\$set: {role: 'admin'}})"
                fi
            elif [[ $2 == "remove" ]]; then
                if [[ -z $3 ]]; then
                    echo -e "${GREEN}Please enter the username of the user you wish to remove as admin: ${NC}"
                    read adminUser
                else
                    adminUser=$3
                fi
                if [[ -z $adminUser ]]; then
                    echo -e "${RED}Error: Username for new admin not provided.${NC}"
                else
                    docker-compose exec mongo mongo musare -u ${MONGO_USER_USERNAME} -p ${MONGO_USER_PASSWORD} --eval "db.users.update({username: '${adminUser}'}, {\$set: {role: 'default'}})"
                fi
            else
                echo -e "${RED}Invalid command $2\n${YELLOW}Usage: $(basename $0) admin [add,remove] username${NC}"
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
        echo -e "${YELLOW}logs - View logs for services${NC}"
        echo -e "${YELLOW}update - Update Musare${NC}"
        echo -e "${YELLOW}attach backend - Attach to backend service${NC}"
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
        echo -e "${YELLOW}logs - View logs for services${NC}"
        echo -e "${YELLOW}update - Update Musare${NC}"
        echo -e "${YELLOW}attach backend - Attach to backend service${NC}"
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