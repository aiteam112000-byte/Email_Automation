const { Queue } = require("bullmq");
const { connection } = require("./queue");

const workflowQueue = new Queue("workflow-process", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

module.exports = { workflowQueue };
