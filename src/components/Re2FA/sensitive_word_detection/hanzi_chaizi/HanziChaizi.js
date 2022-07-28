// import fs from "fs";
// const fs = require("fs");
// const path=require("path");
class HanziChaizi {
    constructor() {
        // let reader = new FileReader(), _that = this;
        // reader.onload = () => {
        //     _that.data = reader.result;
        // }
        // reader.readAsText("./data/data.json");
        this.data = require("./data/data.json");
        // console.log(this.data["你"])
        // this.data = JSON.parse(fs.readFileSync(path.join(__dirname,"data/data.json")));
    }

    query(input) {
        return this.data[input]
    }
}

export {HanziChaizi}
// let hc=new HanziChaizi()
// console.log(hc.query("你"))
