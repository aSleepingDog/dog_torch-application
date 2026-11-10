const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const clipboard = electron.clipboard;
const { Menu, MenuItem } = require('electron');
const path=require('path');
const fs = require('fs');
const fsp = require('fs/promises');
var root_path = null;
if(app.isPackaged){
    root_path = path.dirname(__dirname);
}
else{
    root_path = path.join(__dirname, '.');
}
// console.log(root_path)
var dog_torch = require(path.join(root_path,"native/dog_torch_napi.node"));

// console.log(dog_torch.crypto.sym.stream.algorithm.all());
// console.log(dog_torch.crypto.sym.block.algorithm.all());

var config = {
    log:"",
    tmp:""
}
try{
    // console.log(path.join(root_path,"config.json"))
    config = JSON.parse(fs.readFileSync(path.join(root_path,"config.json"),"utf8"));
}
catch(e){}
// console.log(config);
function todayLocal() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0'); // 月份从0开始
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function nowLocal() {
    const d = new Date();
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.` +
        `${p(d.getMilliseconds(), 3)}`;
}
function readLog(msg){
    let log = config.log;
    fs.access(log,fs.constants.F_OK | fs.constants.W_OK, (err) => {
        if (!err) {
            fs.appendFile(path.join(log,`log_${todayLocal()}.log`),`[${nowLocal()}] ${msg}\n`,'utf8',(e)=>{})
        }
    });
}

var afterTaskHandler = new Map();
var afterTaskResultsLock = false;
var afterTaskResults = [];
var taskPool = new dog_torch.async.ThreadPool();
taskPool.start();
function createWindow(){
    const win = new BrowserWindow({
        width: 1200,
        height: 750,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile("main.html");
    win.webContents.on('before-input-event', (event, input) => {
        if (!app.isPackaged && ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12')) {
            event.preventDefault();
            win.webContents.toggleDevTools();
        }
    });
}
Menu.setApplicationMenu(null)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(() => {
    createWindow()
})

async function handleError(error) {
    return {type: 'error', message: error.message};
}
function handleSuccess(result) {
    return {type: 'success', result: result};
}

async function saveClipBoard(text){
    clipboard.writeText(text);
    return true;
}
ipcMain.handle("saveClipBoard:run",async (event, text) => {
    return await saveClipBoard(text);
});
function fmtInput(input){
    let ft = "";
    if(input.type===0){
        ft = "UTF-8";
    }
    else if(input.type===1){
        ft = "Bin";
    }
    else if(input.type===2){
        ft = "Hex";
    }
    else if(input.type===3){
        ft = "Base64";
    }
    return `${input.input}:${ft}`;
}
function transParam(output){
    if(output.type===0 || output.type===1){
        return new dog_torch.BinaryParams(output.type);
    }
    else if(output.type===2){
        return new dog_torch.BinaryParams(output.type,output.isUpper);
    }
    else if(output.type===3){
        return new dog_torch.BinaryParams(output.type,output.replace0,output.replace1,output.replace2);
    }
    return null;
}
function transBinaryData(input){
    return new dog_torch.BinaryData(input.input,input.type);
}
function transObject(params){
    let result = {};
    Object.entries(params).forEach(([key,value]) => {
        if(value.type!==undefined){
            result[key]=transBinaryData(value);
        }
        else{
            result[key]=value;
        }
    })
    return result;
}

async function exchange(input,output){
    try{
        let bin = transBinaryData(input);
        let fmter = transParam(output);
        let r = fmter.fmtBinary(bin);
        readLog(
            `${fmtInput(input)} --[${fmter.fmtString()}]--> ${r}`
        )
        return r;
    }
    catch(err){
        readLog(
            `${fmtInput(input)}\n${err.message}`
        )
        throw err;
    }
    return "";
}
ipcMain.handle('exchange:run', async (event, input, output) => {
    return await exchange(input, output)
})

async function allTaskInfo(){
    let t = taskPool.taskDetails();
    // console.log(t);
    return t;
}
ipcMain.handle('allTaskInfo:run', async (event) => {
    return await allTaskInfo();
})
var resultLock = false;
async function allTaskResult(){
    if(resultLock){
        return [];
    }
    let results = [];
    if(!afterTaskResultsLock && afterTaskResults.length > 0){
        afterTaskResultsLock = true;
        results = afterTaskResults;
        afterTaskResults = [];
        afterTaskResultsLock = false;
    }
    let temp = taskPool.taskResults();
    for(let task of temp){
        if(afterTaskHandler.has(task.taskId)){
            if(task.result==="success"){
                let handle = afterTaskHandler.get(task.taskId);
                await handle.func(task.taskId,handle.args);
            }
            afterTaskHandler.delete(task.taskId);
        }
        else{
            results.push(task);
            readLog(
                `${task.taskId} : ${task.result}`
            )
        }
    }
    return results;
}
ipcMain.handle('allTaskResult:run', async (event) => {
    return await allTaskResult();
})
async function pause(taskId){
    return taskPool.pause(taskId);
}
ipcMain.handle('pause:run', async (event, taskId) => {
    return await pause(taskId);
})
async function resume(taskId){
    return taskPool.resume(taskId);
}
ipcMain.handle('resume:run', async (event, taskId) => {
    return await resume(taskId);
})
async function cancel(taskId){
    return taskPool.cancel(taskId);
}
ipcMain.handle('cancel:run', async (event, taskId) => {
    return await cancel(taskId);
})

async function allHash(){
    let list = {}
    dog_torch.crypto.hash.all().forEach((config)=>{
        let result = {};
        result.region = []
        region = new dog_torch.NumberIterator(config.region);
        while(region.hasNext()){
            result.region.push(region.next());
        }
        result.params = {};
        Object.entries(config.params).forEach(([k,v])=>{
            result.params[k]={
                type:v.type,
                msg:v.msg,
            }
        })
        list[config.name] = result;
    })
    return list
}
ipcMain.handle('allHash:run', async (event) => {
    return await allHash();
})
async function hashData(input,hash,output){
    let name = hash.name;
    let region = hash.region;
    let params = transObject(hash.params);
    let alg = dog_torch.crypto.hash.create(name,region,params);
    let gen = new dog_torch.crypto.hash.Generator(alg);
    let fmter = transParam(output);
    if(input.type!==4){
        let binput = transBinaryData(input);
        let result = gen.calcuateBinary(binput);
        result = fmter.fmtBinary(result);
        readLog(
            `${fmtInput(input)} --[${gen.fmtString()}]--> ${result}:${fmter.fmtString()}`
        )
        return handleSuccess(result);
    }
    else{
        let id = taskPool.addHashTask(gen, input.input, fmter);
        readLog(
            `${input.input} --[${gen.fmtString()}]--> ${fmter.fmtString()} [${id}]`
        );
        return handleSuccess(id);
    }
}
ipcMain.handle('hashData:run', async (event,input,hash,output) => {
    try{
        return await hashData(input,hash,output);
    }
    catch(e){
        return await handleError(e);
    }
})

async function allStreamCrypto(){
    let list = {};
    dog_torch.crypto.sym.stream.algorithm.all().forEach((config)=>{
        list[config.name] = {};
        list[config.name].effectives = [];
        let effectiveIt = new dog_torch.NumberIterator(config.effectiveRegion);
        while(effectiveIt.hasNext()){
            list[config.name].effectives.push(effectiveIt.next());
        }
        list[config.name].keys = [];
        let keyIt = new dog_torch.NumberIterator(config.keyRegion);
        while(keyIt.hasNext()){
            list[config.name].keys.push(keyIt.next());
        }
    });
    // console.log(list)
    return list;
}
// allStreamCrypto().then(list=>{console.log(list)})
ipcMain.handle('allStreamCrypto:run', async (event) => {
    return await allStreamCrypto();
})

async function allBlockCrypto(){
    let list = {}
    dog_torch.crypto.sym.block.algorithm.all().forEach((config)=>{
        let result = {};
        let blockIt = new dog_torch.NumberIterator(config.blockRegion);
        let blocks = [];
        while(blockIt.hasNext()){
            blocks.push(blockIt.next());
        }
        result["blocks"] = blocks;
        let keyIt = new dog_torch.NumberIterator(config.keyRegion);
        let keys = [];
        while (keyIt.hasNext()){
            keys.push(keyIt.next());
        }
        result["keys"] = keys;
        list[config.name] = result;
    })
    return list;
}
// allBlockCrypto().then(list => {console.log(list)});
ipcMain.handle('allBlockCrypto:run', async (event) => {
    return await allBlockCrypto();
})
async function allBlockMode(){
    let list = {};
    dog_torch.crypto.sym.block.mode.all().forEach((config)=>{
        list[config.name] = {};
        let result = {};
        result.params = {};
        Object.entries(config.params).forEach(([k,v])=>{
            result.params[k]={
                type:v.type,
                msg:v.msg,
            }
        })
        list[config.name] = result;
    })
    // console.log(list);
    return list;
}
ipcMain.handle('allBlockMode:run', async (event) => {
    return await allBlockMode();
})
async function allBlockPadding(){
    return dog_torch.crypto.sym.block.padding.all()
}
ipcMain.handle('allBlockPadding:run', async (event) => {
    return await allBlockPadding();
})

function packageEncryptFile(id,args){
    let name_ = args.name;
    name_ = name_.replaceAll(".","_");
    let target = path.join(args.path, `${name_}.exe`);
    let basePath = path.join(root_path, "native", `${args.platform}.bin`);

    let fd = fs.openSync(target, "w");

    let msg = "success";
    try {
        // 1. base 逐块写入
        const baseFd = fs.openSync(basePath, "r");
        const buf = Buffer.allocUnsafe(64 * 1024);
        let n;
        while ((n = fs.readSync(baseFd, buf, 0, buf.length, null)) > 0) {
            fs.writeSync(fd, buf, 0, n);
        }
        fs.closeSync(baseFd);

        // 2. nameBin 直接写入
        let nameBin = new dog_torch.TlvObject(
            dog_torch.TlvType.String,
            args.name
        ).serialize();
        fs.writeSync(fd, Buffer.from(nameBin));

        // 3. crypt 文件逐块写入
        const cryptFd = fs.openSync(args.crypt, "r");
        while ((n = fs.readSync(cryptFd, buf, 0, buf.length, null)) > 0) {
            fs.writeSync(fd, buf, 0, n);
        }
        fs.closeSync(cryptFd);
    }
    catch(err){
        msg = err.message;
    }
    finally {
        fs.closeSync(fd);
    }
    readLog(
        `${id} : ${msg}`
    )
    while(afterTaskResultsLock){}
    afterTaskResultsLock = true;
    afterTaskResults.push({taskId:id,result:msg});
    afterTaskResultsLock = false;
}
async function encryptData(input,key,header,type,cipher,output,package_){
    input_ = input;
    key_ = key;
    key = transBinaryData(key);
    if(type==="block"){
        let alg = dog_torch.crypto.sym.block.algorithm.create(cipher.algorithm.name,cipher.algorithm.block,cipher.algorithm.key);
        cipher.mode.params = transObject(cipher.mode.params)
        let padding = dog_torch.crypto.sym.block.padding.create(cipher.mode.padding);
        let mode = dog_torch.crypto.sym.block.mode.create(cipher.mode.name,padding,cipher.mode.params);
        cipher = new dog_torch.crypto.sym.block.Cipher(alg,mode);
    }
    else if(type==="stream"){
        let alg = dog_torch.crypto.sym.stream.algorithm.create(cipher.algorithm.name,cipher.algorithm.effective,cipher.algorithm.key);
        cipher = new dog_torch.crypto.sym.stream.Cipher(alg);
    }
    else{
        throw Error("unknown type");
    }
    cipher.setKey(key);
    cipher.init();
    if(input.type!==4){
        input = transBinaryData(input);
        let crypt = cipher.encrypt(input);
        header_ = header;
        if(header){
            header = cipher.serialize();
            crypt = dog_torch.BinaryData.concat(header,crypt);
        }
        output = transParam(output);
        crypt = output.fmtBinary(crypt)
        readLog(
            `${fmtInput(input_)} --${header_?"[header]":""}[${fmtInput(key_)}][${cipher.fmtString()}:encrypt]--> ${crypt}:${output.fmtString()}`
        );
        return handleSuccess(crypt);
    }
    else if(input.type===4){
        resultLock = true;
        let id = taskPool.addEncryptTask(cipher,header,input.input,output.path);
        readLog(
            `${input.input} --${header?"[header]":""}[${fmtInput(key_)}][${cipher.fmtString()}:encrypt]--> ${output.path} [${id}]`
        );
        if(package_.platform!==""){
            //修饰name
            let args = {}
            args.name = "";
            args.path = "";
            let i = output.path.length-1;
            while(output.path.charAt(i) !== "\\" && output.path.charAt(i) !== "/" && i > 1){
                i--;
            }
            if(package_.name===""){
                args.name = output.path.substring(i+1);
            }
            else {
                args.name = package_.name;
            }
            args.path = output.path.substring(0,i);
            args.platform = package_.platform;
            args.crypt = output.path;
            //添加任务
            afterTaskHandler.set(id,{
                func: packageEncryptFile,
                args: args
            });
        }
        resultLock = false;
        return handleSuccess(id);
    }
}
ipcMain.handle("encryptData:run", async (event,args) => {
    try{
        return await encryptData(args.input,args.key,args.header,args.type,args.cipher,args.output,args.package);
    }
    catch(e){
        return await handleError(e);
    }
})
async function decryptData(input,key,header,type,cipher,output){
    key_ = key;
    input_ = input;
    header_ = header;
    key = transBinaryData(key);
    if(!header){
        if(type==="block"){
            let alg = dog_torch.crypto.sym.block.algorithm.create(cipher.algorithm.name,cipher.algorithm.block,cipher.algorithm.key);
            cipher.mode.params = transObject(cipher.mode.params)
            let padding = dog_torch.crypto.sym.block.padding.create(cipher.mode.padding);
            let mode = dog_torch.crypto.sym.block.mode.create(cipher.mode.name,padding,cipher.mode.params);
            cipher = new dog_torch.crypto.sym.block.Cipher(alg,mode);
        }
        else if(type==="stream"){
            let alg = dog_torch.crypto.sym.stream.algorithm.create(cipher.algorithm.name,cipher.algorithm.effective,cipher.algorithm.key);
            cipher = new dog_torch.crypto.sym.stream.Cipher(alg);
        }
        else{
            throw Error("unknown type");
        }
        cipher.setKey(key);
        cipher.init();
        if(input.type!==4){
            input = transBinaryData(input);
            let plain = cipher.decrypt(input);
            output = transParam(output);
            plain = output.fmtBinary(plain);
            readLog(
                `${fmtInput(input_)} --[${fmtInput(key_)}][${cipher.fmtString()}:decrypt]--> ${plain}:${output.fmtString()}`
            )
            return handleSuccess(plain);
        }else if(input.type===4){
            let id = taskPool.addDecryptTask(cipher,input.input,output.path);
            readLog(
                `${fmtInput(input_)} --[${fmtInput(key_)}][${cipher.fmtString()}:decrypt]--> ${output.fmtString()} [${id}]`
            )
            return handleSuccess(id);
        }
    }
    else{
        if(input.type!==4){
            input = transBinaryData(input);
            let cipher_set = null;
            try{
                cipher_set = dog_torch.crypto.sym.block.parse(input);
            }
            catch(err){
                try{
                    cipher_set = dog_torch.crypto.sym.stream.parse(input);
                }
                catch(err){
                    throw new Error("invalid header")
                }
            }
            cipher_set.cipher.setKey(key);
            cipher_set.cipher.init();
            let plain = cipher_set.cipher.decrypt(input,cipher_set.length)
            output = transParam(output);
            plain = output.fmtBinary(plain);
            readLog(
                `${fmtInput(input_)} --[${fmtInput(key_)}][${cipher_set.cipher.fmtString()}:decrypt]--> ${plain}:${output.fmtString()}`
            )
            return handleSuccess(plain);
        }
        else{
            let id = taskPool.addDecryptTask(key,input.input,output.path);
            readLog(
                `${input.input} --[auto:decrypt]--> ${output.path} [${id}]`
            )
            return handleSuccess(id);
        }
    }
}
ipcMain.handle("decryptData:run", async (event,args) => {
    try{
        return await decryptData(args.input,args.key,args.header,args.type,args.cipher,args.output);
    }
    catch(e){
        return await handleError(e);
    }
})

async function loadSettingJson(){
    return config;
}
ipcMain.handle("loadSettingJson:run", async (event) => {
    return await loadSettingJson();
})
async function saveSettingJson(newConfig){
    try{
        config = newConfig;
        fs.writeFileSync(path.join(root_path,"config.json"),JSON.stringify(config,null,4),"utf8")
        return true;
    }catch(err){
        return err;
    }
}
ipcMain.handle("saveSettingJson:run", async (event,args) => {
    return await saveSettingJson(args.config);
})

