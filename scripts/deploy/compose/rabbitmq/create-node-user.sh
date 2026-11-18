#!/bin/sh
set -eu

# Creates the one application user on the /pulse vhost, limited to resources whose
# names start with "pulse.", with no administrator or management tag, and removes
# the default guest user. Safe to run again: an existing user only gets its
# password and permissions reset.
#
# Run inside the container, with the password passed in the environment (never as
# an argument of the docker command):
#   docker compose exec -e RABBITMQ_NODE_PASSWORD rabbitmq sh /etc/rabbitmq/create-node-user.sh

: "${RABBITMQ_NODE_PASSWORD:?RABBITMQ_NODE_PASSWORD must be set}"

if rabbitmqctl -q list_users | cut -f1 | grep -qx pulse_node; then
    rabbitmqctl -q change_password pulse_node "$RABBITMQ_NODE_PASSWORD"
else
    rabbitmqctl -q add_user pulse_node "$RABBITMQ_NODE_PASSWORD"
fi

rabbitmqctl -q set_user_tags pulse_node
rabbitmqctl -q set_permissions -p /pulse pulse_node '^pulse\.' '^pulse\.' '^pulse\.'

if rabbitmqctl -q list_users | cut -f1 | grep -qx guest; then
    rabbitmqctl -q delete_user guest
fi
