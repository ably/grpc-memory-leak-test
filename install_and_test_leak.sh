#!/usr/bin/env bash

export DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export GRPC_FOLDER="${DIR}/../grpc"
export GRPC_SHA=`git --git-dir ${GRPC_FOLDER}/.git  rev-parse HEAD`

if [ -z "${GRPC_SHA}" ]; then
  echo "SHA could not be determined for folder ${GRPC_FOLDER}"
  exit 1
fi

echo "Using GRPC SHA ${GRPC_SHA}"

pushd ${DIR}

echo "Clearing any artifacts from the node_modules folder"
rm -rf node_modules

echo "Ensuring that a clean build is done as opposed to using a pre-built binary"
cp "${GRPC_FOLDER}/package.json" "${DIR}/package.json.bak"
function restore_package {
  mv "${DIR}/package.json.bak" "${GRPC_FOLDER}/package.json"
}
trap restore_package EXIT

pckg_json=$(sed 's/node-pre-gyp install --fallback-to-build/node-pre-gyp configure build/g' "${GRPC_FOLDER}/package.json")
printf "%s" "$pckg_json" > "${GRPC_FOLDER}/package.json"

echo "Installing the gRPC module directly from the gRPC folder '${GRPC_FOLDER}'"
npm install ${GRPC_FOLDER}

echo "Running leak test"
node ./test_grpc_leak.js
test_code=$?

popd

# Don't let the exit code be simply passed onto git bisect
# as it only accepts 0 <= code <= 127
# Some SEGFAULT / assertion errors have exit codes higher than his
if [[ $test_code != 0 ]]; then
  exit 1
fi
