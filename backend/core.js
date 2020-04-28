const async = require("async");

class DeferredPromise {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

class CoreClass {
    constructor(name) {
        this.name = name;
        this.status = "UNINITIALIZED";
        // this.log("Core constructor");
        this.jobQueue = async.priorityQueue(
            (job, callback) => this._runJob(job, callback),
            10 // How many jobs can run concurrently
        );
        this.jobQueue.pause();
        this.runningJobs = [];
        this.priorities = {};
        this.stage = 0;
    }

    setStatus(status) {
        this.status = status;
        this.log("INFO", `Status changed to: ${status}`);
        if (this.status === "READY") this.jobQueue.resume();
        else if (this.status === "FAIL" || this.status === "LOCKDOWN")
            this.jobQueue.pause();
    }

    getStatus() {
        return this.status;
    }

    setStage(stage) {
        this.stage = stage;
    }

    getStage() {
        return this.stage;
    }

    _initialize() {
        this.setStatus("INITIALIZING");
        this.initialize()
            .then(() => {
                this.setStatus("READY");
                this.moduleManager.onInitialize(this);
            })
            .catch((err) => {
                console.error(err);
                this.setStatus("FAILED");
                this.moduleManager.onFail(this);
            });
    }

    log() {
        let _arguments = Array.from(arguments);
        const type = _arguments[0];
        _arguments.splice(0, 1);
        const start = `|${this.name.toUpperCase()}|`;
        const numberOfTabsNeeded = 4 - Math.ceil(start.length / 8);
        _arguments.unshift(`${start}${Array(numberOfTabsNeeded).join("\t")}`);

        if (type === "INFO") {
            _arguments[0] = _arguments[0] + "\x1b[36m";
            _arguments.push("\x1b[0m");
            console.log.apply(null, _arguments);
        } else if (type === "ERROR") {
            _arguments[0] = _arguments[0] + "\x1b[31m";
            _arguments.push("\x1b[0m");
            console.error.apply(null, _arguments);
        }
    }

    runJob(name, payload, options = {}) {
        let deferredPromise = new DeferredPromise();
        const job = { name, payload, onFinish: deferredPromise };

        if (options.bypassQueue) {
            this._runJob(job, () => {});
        } else {
            const priority = this.priorities[name] ? this.priorities[name] : 10;
            this.jobQueue.push(job, priority);
        }

        return deferredPromise.promise;
    }

    setModuleManager(moduleManager) {
        this.moduleManager = moduleManager;
    }

    _runJob(job, cb) {
        this.log("INFO", `Running job ${job.name}`);
        this.runningJobs.push(job);
        this[job.name](job.payload)
            .then((response) => {
                this.log("INFO", `Ran job ${job.name} successfully`);
                job.onFinish.resolve(response);
            })
            .catch((error) => {
                this.log("INFO", `Running job ${job.name} failed`);
                job.onFinish.reject(error);
            })
            .finally(() => {
                this.runningJobs.splice(this.runningJobs.indexOf(job), 1);
                cb();
            });
    }
}

module.exports = CoreClass;
