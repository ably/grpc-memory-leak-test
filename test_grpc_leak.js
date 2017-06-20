'use strict';

/**
 * This script will start a gRPC server and execute a high number of gRPC client calls
 * When there is not a memory leak, the memory usage will climb and then stabilise
 * When there is a memory leak, the RSS memory usage (not Node heap memory) keeps climbing
 *  or the process exists with a SEGFAULT such as "assertion failed: pthread_mutex_lock(mu) == 0"
 **/

const StableAfterIterations = 75000;
const TotalIterations = 200000;
const BatchSize = 250;
const LogEvery = 2000;
const ExampleProtoPath = process.env.GRPC_FOLDER + '/examples/protos/helloworld.proto';
const OneMb = 1024 * 1024;

const fs = require('fs');
if (!fs.existsSync(ExampleProtoPath)) {
  console.error('Proto file ' + ExampleProtoPath + ' does not exist. Have you set the GRPC_FOLDER env var?');
  process.exit(1);
}

const grpc = require(process.env.GRPC_FOLDER + '/src/node/index.js');
const serverProto = grpc.load(ExampleProtoPath).helloworld;
const server = new grpc.Server();

server.addProtoService(serverProto.Greeter.service, {
  sayHello: function (call, callback) {
    callback(null, { message: 'Hello ' + call.request.name });
  }
});
server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
server.start();

const clientProto = grpc.load(ExampleProtoPath).helloworld;
const client = new clientProto.Greeter('localhost:50051', grpc.credentials.createInsecure());

function runClientTestBatch(done) {
  let completed = 0;
  for (let i = 0; i < BatchSize; i++) {
    client.sayHello({name: 'gRPC'}, function(err, response) {
      completed++;
      if (completed === BatchSize) {
        done();
      }
    });
  }
}

let stableRss;

function runClientTests() {
  let completed = 0;
  const nextBatch = function() {
    runClientTestBatch(function() {
      completed += BatchSize;
      const mem = process.memoryUsage();

      if(completed % LogEvery === 0) {
        console.log(`Iteration ${completed}. rss ${Math.floor(mem.rss / OneMb)}MB, heap ${Math.floor(mem.heapTotal /  OneMb)}MB`);
      }

      if (!stableRss && (completed >= StableAfterIterations)) {
        stableRss = mem.rss;
      }

      if (completed >= TotalIterations) {
        const rssPctIncrease = ((mem.rss - stableRss) / stableRss) * 100;
        /* Some variation is expected due to garbage collection etc, but a >10%
         * increase likely means a memory leak */
        const failed = rssPctIncrease > 10;
        console.info(`gRPC test ${failed ? 'failed' : 'passed'}; rss increase from stable point: ${rssPctIncrease}%`);
        server.forceShutdown();
        process.exit(failed ? 1 : 0);
      }

      setTimeout(nextBatch, 5);
    });
  }
  nextBatch();
}

runClientTests();
