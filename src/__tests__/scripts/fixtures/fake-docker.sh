#!/bin/bash
# A tiny stateful stand-in for `docker`, sourced by deployHelpers.test.ts.
# State: one file per container in $FAKE_DIR holding "<running|stopped> <old|new>".
# Every call is appended to $FAKE_DIR/log. A container whose name is listed in
# FAKE_UNHEALTHY and whose file says "new" fails `docker exec ... curl`.

FAKE_DIR=$(mktemp -d)

fake_seed() {
    echo "$2" > "$FAKE_DIR/$1"
}

fake_state() {
    cat "$FAKE_DIR/$1" 2>/dev/null || echo "absent"
}

fake_log() {
    cat "$FAKE_DIR/log"
}

sleep() { :; }

docker() {
    echo "docker $*" >> "$FAKE_DIR/log"
    case "$1" in
        run)
            local name="" i
            local args=("$@")
            for ((i = 0; i < ${#args[@]}; i++)); do
                if [ "${args[i]}" = "--name" ]; then
                    name="${args[i+1]}"
                fi
            done
            echo "running new" > "$FAKE_DIR/$name"
            ;;
        rm)
            local arg
            for arg in "${@:2}"; do
                case "$arg" in -*) ;; *) rm -f "$FAKE_DIR/$arg" ;; esac
            done
            ;;
        rename)
            [ -f "$FAKE_DIR/$2" ] || return 1
            mv "$FAKE_DIR/$2" "$FAKE_DIR/$3"
            ;;
        stop)
            local target="${@: -1}"
            [ -f "$FAKE_DIR/$target" ] && sed -i 's/^running/stopped/' "$FAKE_DIR/$target"
            return 0
            ;;
        start)
            [ -f "$FAKE_DIR/$2" ] || return 1
            sed -i 's/^stopped/running/' "$FAKE_DIR/$2"
            ;;
        inspect)
            if [ "$2" = "-f" ]; then
                [ -f "$FAKE_DIR/$4" ] || return 1
                if grep -q '^running' "$FAKE_DIR/$4"; then echo true; else echo false; fi
            else
                [ -f "$FAKE_DIR/$2" ] || return 1
            fi
            ;;
        exec)
            local target="$2"
            grep -q '^running' "$FAKE_DIR/$target" 2>/dev/null || return 1
            if grep -q ' new$' "$FAKE_DIR/$target" && [[ " ${FAKE_UNHEALTHY:-} " == *" $target "* ]]; then
                return 1
            fi
            ;;
        *) ;;
    esac
    return 0
}
