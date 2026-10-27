const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const clipboard = electron.clipboard;
const { Menu, MenuItem } = require('electron');
const path=require('path');
var dog_torch = null;
if(app.isPackaged){
    dog_torch = require(path.join(path.dirname(__dirname),"native/dog_torch_napi.node"));
}
else{
    dog_torch = require(path.join(__dirname,"native/dog_torch_napi.node"));
}
// console.log(dog_torch.crypto.sym.stream.algorithm.all());
// console.log(dog_torch.crypto.sym.block.algorithm.all());
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
        if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
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
    let bin = transBinaryData(input);
    let fmter = transParam(output);
    return fmter.fmtBinary(bin);
}
ipcMain.handle('exchange:run', async (event, input, output) => {
    return await exchange(input, output)
})

async function allTaskInfo(){
    // console.log(taskPool.taskDetails());
    return taskPool.taskDetails();
}
ipcMain.handle('allTaskInfo:run', async (event) => {
    return await allTaskInfo();
})
async function allTaskResult(){
    return taskPool.taskResults();
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
        while(region.haveNext()){
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
        return handleSuccess(fmter.fmtBinary(result));
    }
    else{
        return handleSuccess(taskPool.addHashTask(gen, input.input, fmter));
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
        while(effectiveIt.haveNext()){
            list[config.name].effectives.push(effectiveIt.next());
        }
        list[config.name].keys = [];
        let keyIt = new dog_torch.NumberIterator(config.keyRegion);
        while(keyIt.haveNext()){
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
        while(blockIt.haveNext()){
            blocks.push(blockIt.next());
        }
        result["blocks"] = blocks;
        let keyIt = new dog_torch.NumberIterator(config.keyRegion);
        let keys = [];
        while (keyIt.haveNext()){
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

async function encryptData(input,key,header,type,cipher,output){
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
        if(header){
            header = cipher.serialize();
            crypt = dog_torch.BinaryData.concat(header,crypt);
        }
        output = transParam(output);
        return handleSuccess(output.fmtBinary(crypt));
    }else if(input.type===4){
        return handleSuccess(taskPool.addEncryptTask(cipher,header,input.input,output.path));
    }
}
ipcMain.handle("encryptData:run", async (event,args) => {
    try{
        return await encryptData(args.input,args.key,args.header,args.type,args.cipher,args.output);
    }
    catch(e){
        return await handleError(e);
    }
})
async function decryptData(input,key,header,type,cipher,output){
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
            let crypt = cipher.encrypt(input);
            output = transParam(output);
            return handleSuccess(output.fmtBinary(crypt));
        }else if(input.type===4){
            return handleSuccess(taskPool.addDecryptTask(cipher,input.input,output.path));
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
            return handleSuccess(output.fmtBinary(plain));
        }
        else{
            return handleSuccess(taskPool.addDecryptTask(key,input.input,output.path));
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