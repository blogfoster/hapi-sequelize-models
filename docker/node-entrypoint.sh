#!/usr/bin/env bash

###
# This script is our regular node.js entrypoint file. We use it to install any
# node dependencies at run-time. We need to this when mounting volumes as the
# code directory, because then any build-time steps are lost when mounting it
# at the same directory.
#
# The idea of this script is to keep a copy of the package.json md5sum and every
# time it changes to re-run `npm prune` and `npm install`.
###

set -e
set -o pipefail

# calculate the md5 sum of the package.json and save it in the node_module directory
function calc_package_md5 {
  md5sum ./package.json  | awk '{print $1}' > ./node_modules/package_json_md5
}

# install / update dependencies only if necessary
function prepare {
  # ok, is there a node_modules folder?
  if [[ ! -d './node_modules' ]]; then
    npm install
    calc_package_md5
    return
  fi

  # ok, node_modules folder there, but is there an old package_json_md5 file?
  if [[ ! -f './node_modules/package_json_md5' ]]; then
    npm install
    calc_package_md5
    return
  fi

  # ok all is there, but did the package json update?
  if [[ "$(md5sum ./package.json  | awk '{print $1}')" != "$(cat ./node_modules/package_json_md5)" ]]; then
    npm prune
    npm install
    calc_package_md5
    return
  fi
}

# install / update dependencies if necessary
prepare
# run the actual command given
# - use double quotes to prevent splitting of arguments with spaces
"$@"
