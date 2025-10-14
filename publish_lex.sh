#!/usr/bin/env bash

set -euo pipefail

source .env.lex

goat account login --username $LEXICON_USERNAME --app-password $LEXICON_PASSWORD --pds-host $LEXICON_SERVICE

goat lex publish ./lexicons/net/altq/aqfile.json

goat account logout

echo "Published lexicons to $LEXICON_SERVICE"
