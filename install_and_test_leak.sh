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

echo "Installing gRPC NPM module"
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
