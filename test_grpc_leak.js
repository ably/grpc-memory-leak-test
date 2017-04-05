'use strict';

/**
 * This script will start a gRPC server and execute a high number of gRPC client calls
 * When there is not a memory leak, the memory usage will climb and then stabilise
 * When there is a memory leak, the RSS memory usage (not Node heap memory) keeps climbing
 *  or the process exists with a SEGFAULT such as "assertion failed: pthread_mutex_lock(mu) == 0"
 **/

const RepeatCount = 200000;
const BatchSize = 250;
const ExampleProtoPath = process.env.GRPC_FOLDER + '/examples/protos/helloworld.proto';

const fs = require('fs');
if (!fs.existsSync(ExampleProtoPath)) {
  console.error('Proto file ' + ExampleProtoPath + ' does not exist. Have you set the GRPC_FOLDER env var?');
  process.exit(1);
}

const serverGrpc = require('grpc');
const serverProto = serverGrpc.load(ExampleProtoPath).helloworld;
const server = new serverGrpc.Server();

server.addProtoService(serverProto.Greeter.service, {
  sayHello: function (call, callback) {
    callback(null, { message: 'Hello ' + call.request.name });
  }
});
server.bind('0.0.0.0:50051', serverGrpc.ServerCredentials.createInsecure());
server.start();

const clientGrpc = require('grpc');
const clientProto = clientGrpc.load(ExampleProtoPath).helloworld;
const client = new clientProto.Greeter('localhost:50051', clientGrpc.credentials.createInsecure());

function runClientTestBatch(totalCompleted, done) {
  let completed = 0;
  for (let i = 0; i < BatchSize; i++) {
    client.sayHello({name: 'gRPC'}, function(err, response) {
      completed++;
      if (completed === BatchSize) {
        let mem = process.memoryUsage();
        console.log(`Iteration ${totalCompleted + completed}. rss ${mem.rss} heap ${mem.heapTotal}`);
        if (mem.rss >= mem.heapTotal * 3) {
          console.error('Memory leak detected');
          server.forceShutdown();
          process.exit(1);
        }
        done();
      }
    });
  }
}

function runClientTests() {
  let completed = 0;
  let nextBatch = function() {
    runClientTestBatch(completed, function() {
      completed += BatchSize;
      if (completed >= RepeatCount) {
        console.info('gPRC test succeeded');
        server.forceShutdown();
        process.exit();
      } else {
        setTimeout(nextBatch, 5);
      }
    });
  }
  nextBatch();
}

runClientTests();
