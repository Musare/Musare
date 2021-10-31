const CoreClass = require("../core.js");

class APIModule extends CoreClass {
    constructor() {
        super("api");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            const app = this.moduleManager.modules["app"];

            const actions = require("./actions");

            app.runJob("GET_APP", {})
                .then((response) => {
                    response.app.get("/", (req, res) => {
                        res.json({
                            status: "success",
                            message: "Coming Soon",
                        });
                    });

                    // Object.keys(actions).forEach(namespace => {
                    //     Object.keys(actions[namespace]).forEach(action => {
                    //         let name = `/${namespace}/${action}`;

                    //         response.app.get(name, (req, res) => {
                    //             actions[namespace][action](null, result => {
                    //                 if (typeof cb === "function")
                    //                     return res.json(result);
                    //             });
                    //         });
                    //     });
                    // });

                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

module.exports = new APIModule();
