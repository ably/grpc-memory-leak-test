# gRPC Node.js memory leak tests

This script was created to work out when a gRPC Node.js memory leak was introduced, see https://github.com/grpc/grpc/issues/10445

This script was designed to use with `git bisect` to determine which commit is responsible for the memory leak. To use this:

### 1. Install gRPC in a sub-folder

`git clone git@github.com:grpc/grpc.git`

### 2. Install this git repo in a sibling folder

Ensure this repo and the gRPC repo share the same parent folders (i.e. they are siblings)

`git clone git@github.com:ably/grpc-memory-leak-test.git`

### 3. Run the tests

Find a good commit. For example, `v1.1.0` is a known good commit, however you want to use the most recently known good commit.
Then find the failing commit SHA, for example you may just use `master`.

Then let `git bisect` do it's thing

```
# change working dir to the gRPC git folder
cd grpc

# Start a bisect and set the good and bad SHAs
git bisect start
git good [your-good-commit-SHA]
git bad [your-bad-commit-SHA]

# Run the git best tests until a good SHA is found
git bisect run ../grpc-memory-leak-test/install_and_test_leak.sh
```

Git will return the first SHA that caused the memory leak

## About

[Ably is a realtime data distribution platform-as-a-service](https://www.ably.io).  We use [gRPC](https://github.com/grpc/grpc) extensively to communicate between different services across a number of languages.

## License

Copyright (c) 2017 Ably Real-time Ltd, Licensed under the Apache License, Version 2.0.  Refer to [LICENSE](LICENSE) for the license terms.
