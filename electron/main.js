var extend = ".other"

function setLight(){
    document.documentElement.setAttribute("theme","light");
}
function setDark(){
    document.documentElement.setAttribute("theme","dark");
}
function changeTheme(){
    if(document.documentElement.getAttribute("theme")==="dark"){
        setLight();
    }else {
        setDark();
    }
}
function defaultTheme(){
    // console.log(document.documentElement);
    if (!window.matchMedia){
        setLight();
        return;
    }
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(isDark){
        setDark();
        return;
    }
    else{
        setLight();
        return;
    }
}
function getTheme(){
    return document.documentElement.getAttribute("theme");
}
defaultTheme();
function initCss(){
    document.querySelector("link").setAttribute("href",`main_${getTheme()}.css`);
    // document.querySelector("link").setAttribute("href",`main_dark.css`);
}
initCss();


function fmtTheme(elem){
    let theme = "light";
    if(getComputedStyle(elem).getPropertyValue('--theme').trim() === "dark"){
        theme = "dark";
    }
    return theme;
}
function fmtIdBar(id){
    return id===null||id===undefined||id===""?"":`${id}-`;
}

class FileSelect extends HTMLElement {
    static get observedAttributes() {
        return [];
    }
    constructor(){
        super();
        this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue && this.isConnected) {
            this.render();
        }
    }

    id = "";
    theme = "";
    file_paths = [];
    bindOutput = "";
    dragCounter = 0;
    field = null;
    showing = null;
    input = null;
    render(){
        let theme = fmtTheme(this);
        const id = this.getAttribute('id');
        const idbar = fmtIdBar(id);
        const inner_str=`
        <style>
        .file_input_field{
            display: flex;
            margin: 0 auto 1% auto;
            flex-direction: column;
            align-items: center;
            width: 98%;
            height: 100%;
            border-radius: 5px;
            border: 1px solid;
            background-color: ${theme!=="dark"?"#3e474d":"#cae6f5"};
        }
        .file_input_field_active{
            display: flex;
            margin: 0 auto 1% auto;
            flex-direction: column;
            align-items: center;
            width: 98%;
            height: 100%;
            border-radius: 5px;
            border: 1px solid;
            background-color: ${theme!=="dark"?"#7a8a95":"#6e95aa"};
        }
        .file_input_label{
            text-align: center;
        }
        </style>
        <div id="${idbar}file_input_field" class="file_input_field">
            <p>请点击选择文件或将文件拖拽至窗口</p>
            <p id="${idbar}file_text">当前文件:</p>
            <input type="file" id="${idbar}file_input" hidden>
        </div>`;
        if(this.getAttribute("bind-output")!==undefined){
            this.bindOutput = this.getAttribute("bind-output");
        }
        this.shadowRoot.innerHTML = inner_str;

        const input = this.shadowRoot.getElementById(`${idbar}file_input`);
        input.addEventListener("change", (event) => {
            this.file_paths = [];
            const files = event.target.files;
            for (const file of event.target.files) {
                this.file_paths.push(window.electron.getFilePath(file));
            }
            let text = this.shadowRoot.getElementById(`${idbar}file_text`);
            text.textContent = `当前文件:${this.file_paths[0]}`
            if(this.bindOutput!==""){
                let output = document.querySelector(`binary-textarea#${this.bindOutput}`)
                if(output){
                    output.setFile(this.file_paths[0]+extend);
                }
            }
        })
        const field = this.shadowRoot.getElementById(`${idbar}file_input_field`);
        this.addEventListener("click", (event) => {
            input.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        });
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.addEventListener(eventName, (e)=> {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        this.addEventListener("dragenter", (event) => {
            this.dragCounter++;
            field.className = "file_input_field_active";
        })
        this.addEventListener("dragleave", (event) => {
            this.dragCounter--;
            if (this.dragCounter <= 0) {
                this.dragCounter = 0;
                field.className = "file_input_field";
            }
        })
        this.addEventListener("dragend", (event) => {
            this.dragCounter = 0;
            field.className = "file_input_field";
        })
        this.addEventListener("drop", (event) => {
            this.dragCounter = 0;
            field.className = "file_input_field";
            input.files = event.dataTransfer.files;
            input.dispatchEvent(new Event('change', {}));
        })
    }

    get file_paths(){
        return this.file_paths;
    }
    get files(){
        return this.shadowRoot.getElementById(`${idbar}file_input`).files;
    }
    clear(){
        const id = this.getAttribute('id');
        const idbar = id===null || id===""?"":id+"-";
        const input = this.shadowRoot.getElementById(`${idbar}file_input`);
        input.value = '';
        this.file_paths = [];
        let text = this.shadowRoot.getElementById(`${idbar}file_text`);
        text.textContent = "当前文件:";
    }
    hidden_self(h){
        const id = this.getAttribute('id');
        const idbar = id===null || id===""?"":id+"-";
        if(h){
            this.removeAttribute("hidden");
        }
        else{
            this.setAttribute("hidden","");
        }
        this.shadowRoot.getElementById(`${idbar}file_input_field`).hidden = h;
    }
}
customElements.define('file-input', FileSelect);

class SidebarItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['icon', 'icon-alt', 'id', "active"];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const isActive = this.hasAttribute('active');
        const iconSrc = this.getAttribute('icon');
        const title = this.textContent.trim();
        const iconAlt = this.getAttribute('icon-alt');
        const elementId = this.getAttribute('id');
        const elementIdbar = elementId===null || elementId===""?"":elementId+"-";

        let iconClass = isActive ? "sidebar_icon_active" : "sidebar_icon";
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        
        .sidebar_item {
          transition:background-color 0.75s;
          width: 95%;
          aspect-ratio: 1 / 1;
          border-radius: 10px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          align-content: center;
          flex-wrap: nowrap;
          position: relative;
          cursor: pointer;
          box-sizing: border-box;
        }

        .sidebar_icon {
          transition: background-color 0.75s;
          height: 60%;
          padding: 10%;
          border-radius: 10px;
          display: block;
        }
        
        .sidebar_icon_active {
          transition: background-color 0.75s;
          height: 60%;
          padding: 10%;
          border-radius: 10px;
          display: block;
          background-color: #39C5BB80;
          border: #003366 1px solid;
        }

        .sidebar_title {
          padding: 2px;
          display: none;
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          font-size: 100%;
          color: #FFFFFF;
          text-align: center;
          background-color: rgba(128, 128, 128, 0.75);
          border-radius: 5px;
          width: 75%;
          white-space: nowrap;
          margin-left: 5px;
        }

        .sidebar_item:hover .sidebar_icon {
          background-color: #66DDFF;
        }

        .sidebar_item:hover .sidebar_title {
          display: block;
          animation: title_showing 0.5s;
        }
        
        @keyframes title_showing{
            0%{
                opacity: 0;
                visibility: hidden;
            }
            100%{
                opacity: 1;
                visibility: visible;
            }
        }
      </style>
      
      <div class="sidebar_item" part="item" id="${elementIdbar}field">
        <img class="${iconClass}" id="${elementIdbar}img" src="${iconSrc}" alt="${iconAlt}" part="icon">
        <div class="sidebar_title" id="${elementIdbar}title" part="title">${title}</div>
      </div>
    `;
    }

    setupEventListeners() {
        const item = this.shadowRoot.querySelector(".sidebar_item");

        // 触发自定义点击事件
        item.addEventListener('click', (e) => {
            this.dispatchEvent(new CustomEvent('sidebar-click', {
                bubbles: true,
                composed: true,
                detail: {
                    id: this.getAttribute('id') || '',
                    title: this.textContent.trim()
                }
            }));
        });
    }

    // 公共方法：获取标题（从文本内容）
    get name() {
        return this.textContent.trim();
    }

    set name(value) {
        this.textContent = value;
    }

    // 公共方法：获取或设置图标
    get icon() {
        return this.getAttribute('icon');
    }

    set icon(value) {
        this.setAttribute('icon', value);
    }

    // 公共方法：获取或设置 id
    get elementId() {
        return this.getAttribute('id') || '';
    }

    set elementId(value) {
        this.setAttribute('id', value);
    }
}
customElements.define('sidebar-item', SidebarItem);

class BinaryTextarea extends HTMLElement {
    id=""
    output= false;
    bindOutput = "";
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    static get observedAttributes() {
        return ['id', "output"];
    }
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    setupEventListeners(){
        const id = this.getAttribute('id');
        const idbar = id===null || id===""?"":id+"-";
        let textarea = this.shadowRoot.querySelector(`#${idbar}input_text`);
        textarea.addEventListener("dblclick",(event)=>{
            if(event.target.value===""){
                return;
            }
            window.electron.saveClipBoard(event.target.value).then(result=>{
                showing("0","已复制")
            })
        });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        let theme = fmtTheme(this);
        const id = this.getAttribute('id');
        if(this.getAttribute("bind-output")!==undefined){
            this.bindOutput = this.getAttribute("bind-output");
        }
        this.id = id;
        const idbar = id===null || id===""?"":id+"-";
        const file = this.hasAttribute('file');
        const output = this.hasAttribute('output');
        this.output = output;
        let default_type = this.getAttribute('default-type');
        if(default_type===undefined || default_type===null){
            default_type = "utf8";
        }
        this.default_type = default_type;
        const inner_str = `
            <style>
                @font-face {
                    font-family: "msyh";
                    src: url("resource/msyhl.ttc");
                }
                .binary_input{
                    padding: 5px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    background-color: #39C5BB80;
                }
                .type_choice_field{
                    width: 100%;
                    height: 30%;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: center;
                    justify-content: flex-start;
                }
                .type_choice_label{
                    margin-right: 5px;
                }
                .type_param_field{
                    height: 30%;
                    display: flex;
                    flex-direction: column;
                    flex-wrap: wrap;
                    align-items: center;
                    align-content: flex-start;
                }
                .base64_replace_field{
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: flex-start;
                }
                .base64_replace_field_hidden{
                    display: none;
                }
                .hex_field{
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: flex-start;
                }
                .hex_field_hidden{
                    display: none;
                }
                .input_field{
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .input_text{
                    width: 95%;
                }
                textarea{
                    font-family: "msyh";
                    font-size: 15px;
                    background-color: ${theme!=="dark"?"#303030":"#FFFFFF"};
                    color: ${theme!=="dark"?"#FFFFFF":"#000000"};
                }
                select{
                    background-color: ${theme!=="dark"?"#303030":"#FFFFFF"};
                    color: ${theme!=="dark"?"#FFFFFF":"#000000"};
                }
            </style>
            <div class="binary_input" id="${idbar}binary_input">
                <div class="type_choice_field" id="${idbar}type_choice_field">
                    <input type="radio" name="${idbar}input_type" value="0" id="${idbar}input_type_utf8" ${default_type.toLowerCase() === "utf8" ? "checked" : ""}>
                    <label class="type_choice_label" for="${idbar}input_type_utf8">UTF-8</label>
                    <input type="radio" name="${idbar}input_type" value="1" id="${idbar}input_type_bin" ${default_type.toLowerCase() === "bin" ? "checked" : ""}>
                    <label class="type_choice_label" for="${idbar}input_type_bin">Bin</label>
                    <input type="radio" name="${idbar}input_type" value="2" id="${idbar}input_type_hex" ${default_type.toLowerCase() === "hex" ? "checked" : ""}>
                    <label class="type_choice_label" for="${idbar}input_type_hex">Hex</label>
                    <input type="radio" name="${idbar}input_type" value="3" id="${idbar}input_type_base64" ${default_type.toLowerCase() === "base64" ? "checked" : ""}>
                    <label class="type_choice_label" for="${idbar}input_type_base64">Base64</label>
                    ${
            file ? `<input type="radio" name="${idbar}input_type" value="4" id="${idbar}input_type_file">
                                <label class="type_choice_label" for="${idbar}input_type_file">file</label>` : ""
        }
                </div>
                <div id="${idbar}type_param_field" class="type_param_field">
                    ${output ? `<div class="${default_type.toLowerCase() === "hex" ? "hex_field" : "hex_field_hidden"}" id="${idbar}hex_field">
                        <input type="radio" name="${idbar}hex_param" id="${idbar}hex_param_upper" value="1" checked>
                        <label for="${idbar}hex_param_upper">大写</label>
                        <input type="radio" name="${idbar}hex_param" id="${idbar}hex_param_lower" value="0">
                        <label for="${idbar}hex_param_lower">小写</label>
                    </div>` : ""}
                    <div class="${default_type.toLowerCase() === "base64" ? "base64_replace_field" : "base64_replace_field_hidden"}" id="${idbar}base64_replace_field">
                        <label for="${idbar}base64_replace_add">替换+</label>
                        <select class="replace_char" id="${idbar}base64_replace_add"></select>
                        <label for="${idbar}base64_replace_backslash">替换/</label>
                        <select class="replace_char" id="${idbar}base64_replace_backslash"></select>
                        <label for="${idbar}base64_replace_equal">替换=</label>
                        <select class="replace_char" id="${idbar}base64_replace_equal"></select>
                    </div>
                </div>
                <div class="input_field">
                    <textarea class="input_text" id="${idbar}input_text" rows="5" ${output ? "readonly" : ""}></textarea>
                    ${file ?
            output ? `<input placeholder="输入输出路径" id="${idbar}output_path" type="text" hidden>` :
                `<file-input id="${idbar}input_file" bind-output="${this.bindOutput}" hidden></file-input>`
            : ``}
                </div>
            </div>
        `;
        this.shadowRoot.innerHTML = inner_str;
        const replace_list = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"

        const rs = this.shadowRoot.querySelectorAll("select.replace_char");
        rs.forEach(select => {
            for (let i = 0; i < replace_list.length; i++) {
                let option = document.createElement("option");
                option.value = replace_list.charAt(i);
                option.textContent = replace_list.charAt(i);
                select.appendChild(option);
            }
        });
        const r0 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_add`);
        r0.children[replace_list.indexOf("+")].selected=true;
        const r1 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_backslash`);
        r1.children[replace_list.indexOf("/")].selected=true;
        const r2 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_equal`);
        r2.children[replace_list.indexOf("=")].selected=true;

        const typeChoiceField = this.shadowRoot.querySelector(`#${idbar}type_choice_field`);
        const base64ReplaceField = this.shadowRoot.querySelector(`#${idbar}base64_replace_field`);

        typeChoiceField.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    base64ReplaceField.className = event.target.value !== '3' ? "base64_replace_field_hidden" : "base64_replace_field";
                    if(output){
                        const hexParamField = this.shadowRoot.querySelector(`#${idbar}hex_field`);
                        hexParamField.className = event.target.value !== '2' ? "hex_field_hidden" : "hex_field";
                    }
                }
            });
        });
        if(file){
            const input_text = this.shadowRoot.querySelector(`#${idbar}input_text`);
            const file_input = this.shadowRoot.querySelector(`#${idbar}input_file`);
            const file_output = this.shadowRoot.querySelector(`#${idbar}output_path`);
            typeChoiceField.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', (event) => {
                    if (event.target.checked) {
                        input_text.hidden = event.target.value === '4';
                        if(!output){
                            file_input.hidden_self(event.target.value === '4');
                            if(this.bindOutput!=="" && document.querySelector(`binary-textarea#${this.bindOutput}`)!==null){
                                if(event.target.value === '4'){
                                    document.querySelector(`binary-textarea#${this.bindOutput}`).lockFile();
                                }else{
                                    document.querySelector(`binary-textarea#${this.bindOutput}`).unlockFile();
                                }
                            }
                        }
                        else{
                            file_output.hidden = event.target.value !== '4';
                        }
                    }
                });
            });
        }
    }

    get value(){
        const idbar = this.id === null || this.id === "" ? "" : this.id + "-";
        let selectedValue = this.shadowRoot.querySelector(`input[name="${idbar}input_type"]:checked`).value;
        selectedValue = parseInt(selectedValue);
        if(!this.output){
            let data = {
                type: selectedValue,
                input: this.shadowRoot.getElementById(`${idbar}input_text`).value
            }
            if (selectedValue === 1) {
                data.input = data.input.trim();
                for (let i = 0; i < data.input.length; i++) {
                    if (data.input.charAt(i) !== "1" && data.input.charAt(i) !== "0") {
                        throw new Error('binary string only contain 0 or 1');
                    }
                }
            }
            else if (selectedValue === 2) {
                data.input = data.input.trim();
                const list = "0123456789ABCDEFabcdef";
                for (let i = 0; i < data.input.length; i++) {
                    if (!list.includes(data.input.charAt(i))) {
                        throw new Error('the char of hex string must be in 0123456789ABCDEFabcdef');
                    }
                }
            }
            else if (selectedValue === 3) {
                data.input = data.input.trim();
                let c0, c1, c2;
                const r0 = this.shadowRoot.querySelector(`#${idbar}base64_replace_add`);
                c0 = r0.value;
                const r1 = this.shadowRoot.querySelector(`#${idbar}base64_replace_backslash`);
                c1 = r1.value;
                const r2 = this.shadowRoot.querySelector(`#${idbar}base64_replace_equal`);
                c2 = r2.value;
                if (c0 === c1 || c1 == c2 || c2 == c1) {
                    throw new Error('invalid char string');
                }
                while (data.input.indexOf(c0) !== -1 && c0!=='+') {
                    data.input.replace(c0, '+');
                }
                while (data.input.indexOf(c1) !== -1 && c1!=='/') {
                    data.input.replace(c1, '/');
                }
                while (data.input.indexOf(c2) !== -1 && c2!=='=') {
                    data.input.replace(c2, '=');
                }
                const list = "+/=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
                for (let i = 0; i < data.input.length; i++) {
                    if (!list.includes(data.input.charAt(i))) {
                        throw new Error('the char of base64 string must be in ' + list);
                    }
                }
            }
            else if (selectedValue === 4) {
                data.input = this.shadowRoot.getElementById(`${idbar}input_file`).file_paths[0];
                this.shadowRoot.getElementById(`${idbar}input_file`).clear()
            }
            return data;
        }
        else{
            let data = {
                type: selectedValue,
            }
            if (selectedValue === 2) {
                data.isUpper = this.shadowRoot.querySelector(`input[name="${idbar}hex_param"]:checked`).value === "1";
            }
            else if (selectedValue === 3) {
                let c0, c1, c2;
                const r0 = this.shadowRoot.querySelector(`#${idbar}base64_replace_add`);
                c0 = r0.value;
                const r1 = this.shadowRoot.querySelector(`#${idbar}base64_replace_backslash`);
                c1 = r1.value;
                const r2 = this.shadowRoot.querySelector(`#${idbar}base64_replace_equal`);
                c2 = r2.value;
                if (c0 === c1 || c1 == c2 || c2 == c1) {
                    throw new Error('invalid char string');
                }
                data.replace0 = c0;
                data.replace1 = c1;
                data.replace2 = c2;
            }
            else if (selectedValue === 4) {
                data.path = this.shadowRoot.querySelector(`#${idbar}output_path`).value;
            }
            return data;
        }
    }

    setText(string) {
        if(!this.output){
            throw new Error('can not change in input mode');
        }
        const idbar = this.id===null || this.id===""?"":this.id+"-";
        this.shadowRoot.getElementById(`${idbar}input_text`).removeAttribute("readonly");
        this.shadowRoot.getElementById(`${idbar}input_text`).value = string;
        this.shadowRoot.getElementById(`${idbar}input_text`).setAttribute("readonly","");
    }

    setFile(path){
        if(!this.output){
            throw new Error('can not change in input mode');
        }
        const idbar = this.id===null || this.id===""?"":this.id+"-";
        this.shadowRoot.getElementById(`${idbar}output_path`).value = path;
    }

    lockFile(){
        let idbar = this.id===null || this.id===""?"":this.id+"-";
        let file_opinion = this.shadowRoot.getElementById(`${idbar}input_type_file`);
        if(file_opinion){
            file_opinion.checked = true;
            file_opinion.dispatchEvent(new Event('change'));
            this.shadowRoot.querySelector(`#${idbar}type_choice_field`).querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.disabled = true;
            });
        }
    }

    unlockFile(){
        let idbar = this.id===null || this.id===""?"":this.id+"-";
        let default_opinion = this.shadowRoot.getElementById(`${idbar}input_type_${this.default_type}`);
        if(default_opinion){
            default_opinion.checked = true;
            default_opinion.dispatchEvent(new Event('change'));
            this.shadowRoot.querySelector(`#${idbar}type_choice_field`).querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.disabled = false;
            });
        }
    }
}
customElements.define('binary-textarea', BinaryTextarea);

class BinaryInput extends HTMLElement {
    id=""
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    static get observedAttributes() {
        return ['id','password'];
    }
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    setupEventListeners(){ }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            if (this.isConnected) {
                this.render();
            }
        }
    }

    render() {
        let theme = fmtTheme(this);
        const id = this.getAttribute('id');
        console.log(id,theme);
        this.id = id;
        const idbar = id===null || id===""?"":id+"-";
        const password = this.hasAttribute("password");
        const inner_str = `
            <style>
                .binary_input{
                    padding: 5px;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .type_choice_field{
                    width: 100%;
                    height: 30%;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: nowrap;
                    align-items: center;
                    justify-content: flex-start;
                }
                .type_choice_label{
                    margin-right: 5px;
                }
                .type_param_field{
                    height: 30%;
                    display: flex;
                    flex-direction: column;
                    flex-wrap: wrap;
                    align-items: center;
                    align-content: flex-start;
                }
                .base64_replace_field{
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: flex-start;
                }
                .base64_replace_field_hidden{
                    display: none;
                }
                .input_field{
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .input_text{
                    width: 95%;
                }
                select,
                input[type="text"]{
                    background-color: ${theme!=="dark"?"#303030":"#FFFFFF"};
                    color: ${theme!=="dark"?"#FFFFFF":"#000000"};
                }
            </style>
            <div class="binary_input" id="${idbar}binary_input">
                <div class="type_choice_field" id="${idbar}type_choice_field">
                    <input type="radio" name="${idbar}input_type" value="0" id="${idbar}input_type_utf8" checked>
                    <label class="type_choice_label" for="${idbar}input_type_utf8">UTF-8</label>
                    <input type="radio" name="${idbar}input_type" value="1" id="${idbar}input_type_bin">
                    <label class="type_choice_label" for="${idbar}input_type_bin">Bin</label>
                    <input type="radio" name="${idbar}input_type" value="2" id="${idbar}input_type_hex">
                    <label class="type_choice_label" for="${idbar}input_type_hex">Hex</label>
                    <input type="radio" name="${idbar}input_type" value="3" id="${idbar}input_type_base64">
                    <label class="type_choice_label" for="${idbar}input_type_base64">Base64</label>
                </div>
                <div id="${idbar}type_param_field" class="type_param_field">
                    <div class="base64_replace_field_hidden" id="${idbar}base64_replace_field" hidden>
                        <label for="${idbar}base64_replace_add">替换+</label>
                        <select class="replace_char" id="${idbar}base64_replace_add"></select>
                        <label for="${idbar}base64_replace_backslash">替换/</label>
                        <select class="replace_char" id="${idbar}base64_replace_backslash"></select>
                        <label for="${idbar}base64_replace_equal">替换=</label>
                        <select class="replace_char" id="${idbar}base64_replace_equal"></select>
                    </div>
                </div>
                <div class="input_field">
                    <input type=${password?"password":"text"} class="input_text" type="text" id="${idbar}input_text" rows="5">
                </div>
            </div>
        `;
        this.shadowRoot.innerHTML = inner_str;
        const replace_list = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"

        const rs = this.shadowRoot.querySelectorAll("select.replace_char");
        rs.forEach(select => {
            for (let i = 0; i < replace_list.length; i++) {
                let option = document.createElement("option");
                option.value = replace_list.charAt(i);
                option.textContent = replace_list.charAt(i);
                select.appendChild(option);
            }
        });
        const r0 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_add`);
        r0.children[replace_list.indexOf("+")].selected=true;
        const r1 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_backslash`);
        r1.children[replace_list.indexOf("/")].selected=true;
        const r2 = this.shadowRoot.querySelector(`select#${idbar}base64_replace_equal`);
        r2.children[replace_list.indexOf("=")].selected=true;

        const typeChoiceField = this.shadowRoot.querySelector(`#${idbar}type_choice_field`);
        const base64ReplaceField = this.shadowRoot.querySelector(`#${idbar}base64_replace_field`);

        typeChoiceField.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (event.target.checked) {
                    base64ReplaceField.className = event.target.value !== '3' ? "base64_replace_field_hidden" : "base64_replace_field"
                }
            });
        });
    }

    get value(){
        const idbar = this.id === null || this.id === "" ? "" : this.id + "-";
        let selectedValue = this.shadowRoot.querySelector(`input[name="${idbar}input_type"]:checked`).value;
        selectedValue = parseInt(selectedValue);
        let data = {
            type: selectedValue,
            input: this.shadowRoot.getElementById(`${idbar}input_text`).value
        }
        if (selectedValue === 1) {
            data.input = data.input.trim();
            for (let i = 0; i < data.input.length; i++) {
                if (data.input.charAt(i) !== "1" && data.input.charAt(i) !== "1") {
                    throw new Error('binary string only contain 0 or 1');
                }
            }
        }
        else if (selectedValue === 2) {
            data.input = data.input.trim();
            const list = "0123456789ABCDEFabcdef";
            for (let i = 0; i < data.input.length; i++) {
                if (!list.includes(data.input.charAt(i))) {
                    throw new Error('the char of hex string must be in 0123456789ABCDEFabcdef');
                }
            }
        }
        else if (selectedValue === 3) {
            data.input = data.input.trim();
            let c0, c1, c2;
            const r0 = this.shadowRoot.querySelector(`#${idbar}base64_replace_add`);
            c0 = r0.value;
            const r1 = this.shadowRoot.querySelector(`#${idbar}base64_replace_backslash`);
            c1 = r1.value;
            const r2 = this.shadowRoot.querySelector(`#${idbar}base64_replace_equal`);
            c2 = r2.value;
            if (c0 === c1 || c1 == c2 || c2 == c1) {
                throw new Error('invalid char string');
            }
            while (data.input.indexOf(c0) !== -1 && c0!=='+') {
                data.input.replace(c0, '+');
            }
            while (data.input.indexOf(c1) !== -1 && c1!=='/') {
                data.input.replace(c1, '/');
            }
            while (data.input.indexOf(c2) !== -1 && c2!=='=') {
                data.input.replace(c2, '=');
            }
            const list = "+/=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            for (let i = 0; i < data.input.length; i++) {
                if (!list.includes(data.input.charAt(i))) {
                    throw new Error('the char of base64 string must be in ' + list);
                }
            }
        }
        return data;
    }
}
customElements.define('binary-input', BinaryInput);

class MessageBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    setupEventListeners(){
        let close = this.shadowRoot.querySelector('.msg_close');
        close.addEventListener('click', (event) => {
            this.remove();
        });
        let area = this.shadowRoot.querySelector('.msg_area');
        area.addEventListener("dblclick", (event) => {
            let text = this.shadowRoot.querySelector(".msg_content");
            window.electron.saveClipBoard(text.textContent).then(result => {
                if(result){
                    text.textContent = "已复制到剪贴板";
                }
            })
        })
        setTimeout(()=>{this.remove();},1500);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }
    render(){
        const theme = fmtTheme(this);
        const type = this.getAttribute("type");
        const type_icon = type==="0"?"✔️":type==="1"?"❌":"⚠️";
        const type_title = type==="0"?"成功":type==="1"?"错误":"警告";
        const text = this.textContent.trim();
        const inner_str=`
        <style>
        @font-face {
            font-family: "single";
            src: url("resource/NotoSansSC-VF.ttf");
        }
        @font-face{
            font-family: "emoji";
            src: url("resource/NotoColorEmoji.ttf");
        }
        .msg_title_emoji{
            font-family : "emoji";
        }
        @keyframes title_showing{
            0%{
                opacity: 0;
                visibility: hidden;
            }
            100%{
                opacity: 1;
                visibility: visible;
            }
        }
        .msg_area{
            animation: title_showing 0.5s;
            width: 95%;
            background-color: ${theme!=="dark"?"#1E1F2D":"#FFFFFF"};
            color: ${theme!=="dark"?"#FFFFFF":"#000000"};
            font-family: "single";
            margin: 1%;
            border: 2px solid ${theme!=="dark"?"#22b590":"#000000"};
            border-radius: 10px;
            display: flex;
            flex-direction: column;
        }
        .msg_title_field{
            margin: 0 5% 0 5%;
            width: 90%;
            display: flex;
            flex-direction: row;
        }
        .msg_close{
            margin-left: auto;
            border-radius: 50%;
            cursor:pointer;
        }
        .msg_content{
            margin: 0 5% 0 5%;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .msg_progress_field{
            margin: 0 5% 0 5%;
            display: flex;
            justify-content: center;
        }
        .msg_progress{
            width: 100%;
            height: 2px;
            background-color: #6060d6;
            animation: progress 1.5s;
        }
        @keyframes progress {
            0%{
                width: 100%;
            }
            100%{
                width: 0;
            }
        }
        
        </style>
        <div class="msg_area">
            <div class="msg_title_field">
                <a class="msg_title_emoji">${type_icon}</a>
                <div class="msg_title">${type_title}</div>
                <div class="msg_close">×</div>
            </div>
            <div class="msg_content">${text}</div>
            <div class="msg_progress_field">
                <div class="msg_progress"></div>
            </div>
        </div>
        `;
        this.shadowRoot.innerHTML = inner_str;
    }
}
customElements.define('message-box', MessageBox);

class TaskTag extends HTMLElement {
    taskId = 0;
    status = "";
    params = {};
    result = {};
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.addEventListener("click", (e) => {
            document.querySelectorAll("task-tag").forEach(elem=>{
                elem.choose(false);
            });
            this.choose(true);

            let taskTimePoint = document.getElementById("task_time_point");
            taskTimePoint.setLabel("提交时间");
            taskTimePoint.setValue(this.params.timePoint);

            let taskType = document.getElementById("task_type");
            let type_text = "";
            if(this.params.type === 0) {
                type_text = "文件数据散列"
            }
            else if(this.params.type === 1) {
                type_text = "文本数据加密"
            }
            else if(this.params.type === 2) {
                type_text = "文本数据解密"
            }
            taskType.setLabel("任务类型")
            taskType.setValue(type_text);

            let taskInput = document.getElementById("task_input");
            taskInput.setLabel("任务输入")
            taskInput.setValue(this.params.input);

            let taskOper = document.getElementById("task_operator");
            taskOper.setLabel("任务操作")
            taskOper.setValue(this.params.operator);

            let taskOutput = document.getElementById("task_output");
            taskOutput.setLabel("任务输出");
            taskOutput.setValue(this.params.output);

            if(task_result_map.has(this.taskId)){
                let taskResult = document.getElementById("task_result");
                taskResult.setLabel("任务结果")
                taskResult.setValue(task_result_map.get(this.taskId).result);
            }
            let taskBack = document.getElementById("task_back");
            taskBack.style.display = "none";
        });
        this.addEventListener("dblclick", (e) => {
            let area = this.shadowRoot.querySelector(".task_area_active");
            if(area===null) return;
            area.className = "task_area";
            document.querySelectorAll("task-label").forEach(elem=>{
                elem.setLabel("");
                elem.setValue("");
            });
            let taskBack = document.getElementById("task_back");
            taskBack.style.display = "block";
        })
    }
    static get observedAttributes() {
        return ['id','class',"status"];
    }
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    render(){
        const theme = fmtTheme(this);
        let taskId = parseInt(this.getAttribute("taskId"));
        this.taskId = taskId;
        let type = this.getAttribute("type");//hash encrypt decrypt
        let type_text = "";
        {
            if (type === "0") {
                type_text = "文件数据散列";
            } else if (type === "1") {
                type_text = "文件数据加密";
            } else if (type === "2") {
                type_text = "文件数据解密";
            }
        }
        let status = this.getAttribute("status");
        this.status = status;
        let status_text = "";
        {
            if (status === "0") {
                status_text = "等待";
            } else if (status === "2") {
                status_text = "运行";
            } else if (status === "3") {
                status_text = "暂停";
            } else if (status === "4") {
                status_text = "停止";
            }
        }
        let inner_str= `
        <style>
            .task_area{
                display: flex;
                flex-direction: column;
                border: 1px solid black;
                background-color: ${theme==="dark"?"#504d73":"#66CCFF"};
                border-radius: 10px;
                border-color: ${theme==="dark"?"#4188aa":"#000000"};
                padding: 10px;
                margin: 2%;
            }
            .task_area_active{
                display: flex;
                flex-direction: column;
                border: 1px solid #027c02;
                background-color: ${theme==="dark"?"#706ca3":"#3bbbfa"};
                border-radius: 10px;
                padding: 10px;
                margin: 2%;
            }
            #task_progress_field{
                position: relative;
                height: 15px;
                border-radius: 10px;
                border: ${theme==="dark"?"#66CCFF":"#12432a"} solid 1px ;
                display: flex;
            }
            #task_progress{
                width: 0;
                background-color: #2ba668;
                height: 15px;
                border-radius: 10px;
            }
            #task_progress_text{
                position: absolute;
                font-size: 12px;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
            }
            #task_operators{
                display: flex;
                flex-direction: row;
                justify-content: space-evenly;
            }
            #task_status{
                color: #ff0000;
            }
            .task_operator{
                background-color: ${theme==="dark"?"#8784a6":"#37e0e6"};
                padding: 2px;
                border-radius: 5px;
            }
            .task_operator:hover{
                background-color: ${theme==="dark"?"#9f9cba":"#2db0b5"};
            }
        </style>
        <div class="task_area">
            <div class="task_line">${type_text}</div>
            <div id="task_status" class="task_line">${status_text}</div>
            ${status === "0" || status === "4" ? "" : `
            <div id="task_progress_field" class="task_line">
                <div id="task_progress"></div>
                <div id="task_progress_text">0%</div>
            </div>
            <div id="task_excepted" class="task_line">预计剩余:</div>
            `}
            <div id="task_operators" class="task_line">
                ${status === "0" ? `<div id="task_cancel" class="task_operator">取消</div>` : ""}
                ${status === "2" ? `<div id="task_pause" class="task_operator">暂停</div>` : ""}
                ${status === "3" ? `<div id="task_resume" class="task_operator">恢复</div>` : ""}
                ${status === "3" || status === "2" ? `<div id="task_stop" class="task_operator">停止</div>` : ""}
                ${status === "4" ? `<div id="task_delete" class="task_operator">移除</div>` : ""}
            </div>
        </div>`;
        this.shadowRoot.innerHTML = inner_str;
    }

    setupEventListeners() {
        let taskId = this.taskId;
        if (this.status === "0") {
            let cancel = this.shadowRoot.getElementById("task_cancel");
            if(cancel){
                cancel.addEventListener("click", (event)=>{
                    window.electron.cancel(taskId).then(()=>{
                        task_info_map.delete(taskId);
                        showing("0","取消成功");
                        this.remove();
                    })
                });
            }
        }
        else if (this.status === "2") {
            let pause = this.shadowRoot.getElementById("task_pause");
            if(pause){
                pause.addEventListener("click", (event)=>{
                    window.electron.pause(taskId).then(()=>{
                        showing("0","暂停成功");
                    })
                });
            }
            let stop = this.shadowRoot.getElementById("task_stop");
            if(stop){
                stop.addEventListener("click", (event)=>{
                    window.electron.cancel(taskId).then(()=>{
                        showing("0","停止成功");
                    })
                })
            }
        }
        else if (this.status === "3") {
            let resume = this.shadowRoot.getElementById("task_resume");
            if(resume){
                resume.addEventListener("click", (event)=>{
                    window.electron.resume(taskId).then(()=>{
                        showing("0","恢复成功");
                    })
                });
            }
            let stop = this.shadowRoot.getElementById("task_stop");
            if(stop){
                stop.addEventListener("click", (event)=>{
                    window.electron.cancel(taskId).then(()=>{
                        showing("0","停止成功");
                    })
                })
            }
        }
        else if (this.status === "4") {
            let delete_ = this.shadowRoot.getElementById("task_delete");
            if(delete_){
                delete_.addEventListener("click", (event)=>{
                    task_info_map.delete(taskId);
                    this.remove();
                    document.querySelectorAll("task-label").forEach(elem=>{
                        elem.setLabel("");
                        elem.setValue("");
                    });
                    let taskBack = document.getElementById("task_back");
                    taskBack.style.display = "block";
                    showing("0","成功移除")
                    event.stopPropagation();
                })
            }
        }
    }
    get taskId(){
        return this.taskId;
    }

    updateTaskStatus(status){
        this.setAttribute("status",status+"");
        this.status=(status+"");
    }

    updateExcepted(excepted){
        let excepted_line = this.shadowRoot.getElementById("task_excepted");
        if(excepted_line!==null){
            excepted_line.textContent = `预计剩余:${excepted}`;
        }
    }

    updateProgress(progress){
        let task_progress = this.shadowRoot.getElementById("task_progress");
        let task_progress_text = this.shadowRoot.getElementById("task_progress_text");
        let persent = `${progress*100}`.slice(0,5)+"%";
        if(task_progress!==null){
            task_progress.style.width = persent;
        }
        if(task_progress_text!==null){
            task_progress_text.textContent = persent;
        }
    }

    choose(should){
        if(should){
            let area = this.shadowRoot.querySelector(".task_area");
            if(area===null) return;
            area.className = "task_area_active";
        }
        else{
            let area = this.shadowRoot.querySelector(".task_area_active");
            if(area===null) return;
            area.className = "task_area";
        }
    }

    get status(){
        return this.status;
    }

    get params(){
        return this.params;
    }
    set params(params){
        this.params = params;
    }

    get result(){
        return this.result;
    }
    set result(result){
        this.result = result;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(oldValue!==newValue){
            this.render();
            this.setupEventListeners();
            if(oldValue==="0"){
                let running = document.getElementById("task_running_lists");
                if(running){
                    running.appendChild(this);
                }
            }
        }
    }
}
customElements.define('task-tag', TaskTag);

class TaskLable extends HTMLElement{
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    render(){
        const theme = fmtTheme(this);
        let label = this.getAttribute("label");
        label = label===null?"":label;
        let text = this.textContent;
        const innst_str=`
            <style>
            .task_label{
                margin: 0 2%;
                padding: 0 0 3px 5px;
                font-size: 13px;
                color: ${theme!=="dark"?"#39C5BB":"#666666"};
            }
            .task_line_context_field{
                margin: 0 5%;
                padding: 0 5px;
            }
            .task_line_context{
                width: 100%;
                font-size: 17px;
                background-color: #00000000;
                border: none;
            }
            .task_line_context:focus{
                outline: none;
            }
            </style>
            <div class="task_label">${label}</div>
            <div class="task_line_context_field">
                <div class="task_line_context"></div>
            </div>
        `;
        this.shadowRoot.innerHTML=innst_str;
        let value_con = this.shadowRoot.querySelector(".task_line_context");
        if(text===""){
            value_con.style.cursor="default"
        }
        else{
            value_con.style.cursor = "text";
        }
    }
    connectedCallback() {
        this.render();
    }
    setLabel(label){
        let label_con = this.shadowRoot.querySelector(".task_label");
        label_con.textContent = label;
    }
    setValue(value){
        let value_con = this.shadowRoot.querySelector(".task_line_context");
        if(value===""){
            value_con.style.cursor="default"
        }
        else{
            value_con.style.cursor = "text";
        }
        // value_con.removeAttribute("readonly");
        // value_con.value = value;
        // value_con.setAttribute("readonly","");
        value_con.textContent = value;
    }
}
customElements.define('task-label', TaskLable);

var task_info_map = new Map();
function updateTask(){
    let running = document.getElementById("task_running_lists");
    let waiting = document.getElementById("task_waiting_lists");
    // console.log("info",task_info_map);
    for(const [k,v] of task_info_map){
        let task_tag = document.querySelector(`task-tag[taskId="${k+""}"]`)
        if(task_tag){
            task_tag.updateTaskStatus(v.status);
            task_tag.updateProgress(v.progress);
            task_tag.updateExcepted(v.expected);
        }
        else if(v.status===0){
            task_tag = document.createElement("task-tag");
            task_tag.setAttribute("taskId",v.taskId);
            task_tag.setAttribute("status",v.status);
            task_tag.setAttribute("type",v.params.type);
            task_tag.params = v.params;
            waiting.appendChild(task_tag);
        }
        else if(v.status===2 || v.status===4){
            task_tag = document.createElement("task-tag");
            task_tag.setAttribute("taskId",v.taskId);
            task_tag.setAttribute("status",v.status);
            task_tag.setAttribute("type",v.params.type);
            task_tag.params = v.params;
            running.appendChild(task_tag);
        }

    }
}
function aUpdateTask(){
    window.electron.allTaskInfo().then(list=>{
        list.forEach(info=>{
            if(info.taskId!==undefined){
                task_info_map.set(info.taskId,info);
            }
        })
        updateTask();
    })
}
var task_result_map = new Map();
function updateResult(){
    // console.log("result",task_result_map);
    for(const [k,v] of task_result_map){
        let task_tag = document.querySelector(`task-tag[taskId="${k+""}"]`);
        if(task_tag){
            task_tag.result = v;
            // console.log(task_tag);
        }
    }
}
function aUpdateResult(){
    window.electron.allTaskResult().then(list=>{
        list.forEach(info=>{
            if(info.taskId!==undefined){
                task_result_map.set(info.taskId,info);
            }
        })
        updateResult();
    })
}
setInterval(() => {
    aUpdateTask();
    aUpdateResult();
}, 500);
//弹窗显示
function showing(type,msg){
    let msgDialog = document.getElementById("msg_dialog");
    let message_box = document.createElement("message-box");
    message_box.setAttribute("type",type);
    message_box.textContent = msg;
    msgDialog.appendChild(message_box);
    msgDialog.show()
    msgDialog.style.setProperty("pointer-events","auto");
    setTimeout(()=>{
        let msgDialog = document.getElementById("msg_dialog");
        if(msgDialog.children.length === 0){
            msgDialog.close();
            msgDialog.style.setProperty("pointer-events","none");
        }
    },1500)
}

document.querySelectorAll('sidebar-item').forEach(item => {
    item.addEventListener("click",(event)=>{
        document.querySelectorAll('sidebar-item').forEach(item=>{
            item.removeAttribute("active");
            let frame = document.getElementById(item.id.split("-")[0]+"-frame");
            frame.className = "context_frame";
        })
        event.target.setAttribute("active","");
        let frame = document.getElementById(event.target.id.split("-")[0]+"-frame");
        frame.className = "context_frame_active";
    })
})

document.getElementById("exchange_button").addEventListener('click', (event)=>{
    let input = document.getElementById("exchange_input");
    let output = document.getElementById("exchange_output");
    let input_data,output_data;
    try{
        input_data = input.value;
        output_data = output.value;
        // console.log(input_data);
        // console.log(output_data);
    }
    catch(err){
        // console.log(err);
        showing(1,err);
        return;
    }
    if(input_data.input===""){
        showing(2,"输入为空");
    }
    window.electron.exchange(input_data, output_data)
        .then(data=>{
            output.setText(data);
            showing(0,"操作成功");
        })
        .catch(error=>{
            showing(1,error.message);
        })
})

var hash_list;
function hash_init(result){
    let hash_name = document.getElementById("hash_name");
    hash_list = result;
    // console.log(result);
    for (const key of Object.keys(hash_list)) {
        let option = document.createElement("option");
        option.textContent = key;
        option.value = key;
        hash_name.appendChild(option);
    }
    let hash_region = document.getElementById("hash_region");
    Object.values(hash_list).at(0).region.forEach((item)=>{
        let option = document.createElement("option");
        option.textContent = item;
        option.value = item;
        hash_region.appendChild(option);
    });
    let hash_param = document.getElementById("hash_param");
    hash_name.addEventListener("change", (event)=>{
        while(hash_region.firstChild){
            hash_region.firstChild.remove();
        }
        hash_list[event.target.value].region.forEach((item)=>{
            let option = document.createElement("option");
            option.textContent = item;
            option.value = item;
            hash_region.appendChild(option);
        });
        while(hash_param.firstChild){
            hash_param.firstChild.remove();
        }
        for(let [key,value] of Object.entries(hash_list[event.target.value].params)){
            // console.log(key,value);
            let label = document.createElement("div")
            label.textContent = key;
            hash_param.appendChild(label);
            if(value.type===0){
                let input = document.createElement("input");
                input.setAttribute("type","checkbox");
                input.setAttribute("id",`hash_param-${key}`);
                hash_param.appendChild(input);
            }
            else if(value.type===1){
                let input = document.createElement("input");
                input.setAttribute("id",`hash_param-${key}`);
                input.defaultValue = 0;
                input.setAttribute("type","number");
                input.setAttribute("min","0");
                input.setAttribute("step","1");
                hash_param.appendChild(input);
            }
            else if(value.type===2){
                let input = document.createElement("input");
                input.setAttribute("id",`hash_param-${key}`);
                input.setAttribute("type","text");
                hash_param.appendChild(input);
            }
            else if(value.type===3){
                let input = document.createElement("binary-input");
                input.setAttribute("id",`hash_param-${key}`);
                hash_param.appendChild(input);
            }
        }
    })
}
function ahash_init(){
    window.electron.allHash().then(hash_init);
}
ahash_init();

document.getElementById("hash_button").addEventListener('click', (event)=>{
    try{
        let input = document.getElementById("hash_input");
        let output = document.getElementById("hash_output");
        let hash_name = document.getElementById("hash_name");
        let hash_region = document.getElementById("hash_region");
        let hash = {};
        hash.name = hash_name.value;
        hash.region = parseInt(hash_region.value);
        let params_input = [];
        document.querySelectorAll("#hash_param input").forEach(item=>{
            params_input.push(item);
        })
        document.querySelectorAll("#hash_param binary-input").forEach(item=>{
            params_input.push(item);
        })
        hash.params = {};
        params_input.forEach(item=>{
            // hash.params[item.id.split("-")[1]] = item.value;
            if(item.tagName.toLowerCase()==="input"){
                if(item.type==="number"){
                    hash.params[item.id.split("-")[1]] = parseInt(item.value);
                }
                else if(item.type==="checkbox"){
                    hash.params[item.id.split("-")[1]] = item.checked;
                }
                else if(item.type==="text"){
                    hash.params[item.id.split("-")[1]] = item.value;
                }
            }
            else{
                hash.params[item.id.split("-")[1]] = item.value;
            }
        })
        if(output.value.type===0){
            showing(2,"output with UTF8 string after hash may be mojibake or unreadable string")
        }
        window.electron.hashData(input.value,hash,output.value).then(data=>{
            if(data.type==="success"){
                if(typeof(data.result)==="string"){
                    output.setText(data.result);
                    showing("0","操作成功");
                }
                else if(typeof(data.result)==="number"){
                    showing("0",`已添加至任务${data.result}`);}
            }
            else if(data.type==="error"){
                showing("1", data.message);
            }
        })
    }
    catch(error){
        showing(1,error.message);
    }
})

var crypto_stream_list = {};
function init_crypto_stream(list){
    // console.log(list);
    crypto_stream_list = list;
    {
        let alg_select = document.getElementById("encrypt_stream_algorithm_name");
        for(const key of Object.keys(list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            alg_select.appendChild(option);
        }
        let effs = document.getElementById("encrypt_stream_algorithm_effective");
        Object.values(crypto_stream_list).at(0).effectives.forEach(item=>{
            let option = document.createElement("option");
            option.textContent = item;
            option.value = item;
            effs.appendChild(option);
        });
        let keys = document.getElementById("encrypt_stream_algorithm_key_size");
        Object.values(crypto_stream_list).at(0).keys.forEach(item=>{
            let option = document.createElement("option");
            option.textContent = item;
            option.value = item;
            keys.appendChild(option);
        })
        alg_select.addEventListener("change", (event)=>{
            let effs = document.getElementById("encrypt_stream_algorithm_effective");
            while(effs.firstChild){
                effs.firstChild.remove();
            }
            crypto_stream_list[event.target.value].effectives.forEach(item=>{
                let option = document.createElement("option");
                option.textContent = item;
                option.value = item;
                effs.appendChild(option);
            });
            let keys = document.getElementById("encrypt_stream_algorithm_key_size");
            while(keys.firstChild){
                keys.firstChild.remove();
            }
            crypto_stream_list[event.target.value].keys.forEach(item=>{
                let option = document.createElement("option");
                option.textContent = item;
                option.value = item;
                keys.appendChild(option);
            })
        })
    }
    {
        let alg_select = document.getElementById("decrypt_stream_algorithm_name");
        for(const key of Object.keys(list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            alg_select.appendChild(option);
        }
        let effs = document.getElementById("decrypt_stream_algorithm_effective");
        Object.values(crypto_stream_list).at(0).effectives.forEach(item=>{
            let option = document.createElement("option");
            option.textContent = item;
            option.value = item;
            effs.appendChild(option);
        });
        let keys = document.getElementById("decrypt_stream_algorithm_key_size");
        Object.values(crypto_stream_list).at(0).keys.forEach(item=>{
            let option = document.createElement("option");
            option.textContent = item;
            option.value = item;
            keys.appendChild(option);
        })
        alg_select.addEventListener("change", (event)=>{
            let effs = document.getElementById("decrypt_stream_algorithm_effective");
            while(effs.firstChild){
                effs.firstChild.remove();
            }
            crypto_stream_list[event.target.value].effectives.forEach(item=>{
                let option = document.createElement("option");
                option.textContent = item;
                option.value = item;
                effs.appendChild(option);
            });
            let keys = document.getElementById("decrypt_stream_algorithm_key_size");
            while(keys.firstChild){
                keys.firstChild.remove();
            }
            crypto_stream_list[event.target.value].keys.forEach(item=>{
                let option = document.createElement("option");
                option.textContent = item;
                option.value = item;
                keys.appendChild(option);
            })
        })
    }
}
function ainit_crypto_stream(){
    window.electron.allStreamCrypto().then(init_crypto_stream);
}
ainit_crypto_stream();

var crypto_block_list = {};
function init_crypto_block(list){
    crypto_block_list = list;
    {
        let algorithm_name = document.getElementById("encrypt_block_algorithm_name");
        for(let key of Object.keys(crypto_block_list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            algorithm_name.appendChild(option);
        }
        let block_select = document.getElementById("encrypt_block_algorithm_block_size");
        let key_select = document.getElementById("encrypt_block_algorithm_key_size");
        Object.values(crypto_block_list).at(0).blocks.forEach(block=>{
            let option = document.createElement("option");
            option.textContent = block;
            option.value = block;
            block_select.appendChild(option);
        })
        Object.values(crypto_block_list).at(0).keys.forEach(key=>{
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            key_select.appendChild(option);
        })
        algorithm_name.addEventListener("change", event=>{
            while(block_select.firstChild){
                block_select.firstChild.remove();
            }
            crypto_block_list[event.target.value].blocks.forEach((block)=>{
                let option = document.createElement("option");
                option.textContent = block;
                option.value = block;
                block_select.appendChild(option);
            })
            while(key_select.firstChild){
                key_select.firstChild.remove();
            }
            crypto_block_list[event.target.value].keys.forEach((key)=>{
                let option = document.createElement("option");
                option.textContent = key;
                option.value = key;
                key_select.appendChild(option);
            })
        })
    }
    {
        let algorithm_name = document.getElementById("decrypt_block_algorithm_name");
        for(let key of Object.keys(crypto_block_list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            algorithm_name.appendChild(option);
        }
        let block_select = document.getElementById("decrypt_block_algorithm_block_size");
        let key_select = document.getElementById("decrypt_block_algorithm_key_size");
        Object.values(crypto_block_list).at(0).blocks.forEach(block=>{
            let option = document.createElement("option");
            option.textContent = block;
            option.value = block;
            block_select.appendChild(option);
        })
        Object.values(crypto_block_list).at(0).keys.forEach(key=>{
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            key_select.appendChild(option);
        })
        algorithm_name.addEventListener("change", event=>{
            while(block_select.firstChild){
                block_select.firstChild.remove();
            }
            crypto_block_list[event.target.value].blocks.forEach((block)=>{
                let option = document.createElement("option");
                option.textContent = block;
                option.value = block;
                block_select.appendChild(option);
            })
            while(key_select.firstChild){
                key_select.firstChild.remove();
            }
            crypto_block_list[event.target.value].keys.forEach((key)=>{
                let option = document.createElement("option");
                option.textContent = key;
                option.value = key;
                key_select.appendChild(option);
            })
        })
    }
}
function ainit_crypto_block(){
    window.electron.allBlockCrypto().then(init_crypto_block);
}
ainit_crypto_block();

var crypto_mode_list = {}
function init_crypto_mode(list){
    crypto_mode_list = list;
    // console.log(crypto_mode_list);
    {
        let mode_name = document.getElementById("encrypt_block_mode_name");
        for(let [key,value] of Object.entries(crypto_mode_list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            mode_name.appendChild(option);
        }
        mode_name.addEventListener("change", event=>{
            let mode_params = document.getElementById("encrypt_block_mode_params_field");
            let params = crypto_mode_list[event.target.value].params;
            if(Object.keys(params).length===0){
                mode_params.style.display="none";
            }
            else{
                mode_params.style.display="block";
                while(mode_params.firstChild){
                    mode_params.firstChild.remove();
                }
                mode_params.innerHTML=`<div class="crypto_field_title">工作模式额外参数</div>`;
                for(let [key,value] of Object.entries(params)){
                    let label = document.createElement("div")
                    label.textContent = key;
                    mode_params.appendChild(label);
                    if(value.type===0){
                        let input = document.createElement("input");
                        input.setAttribute("type","checkbox");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        mode_params.appendChild(input);
                    }
                    else if(value.type===1){
                        let input = document.createElement("input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        input.defaultValue = 0;
                        input.setAttribute("type","number");
                        input.setAttribute("min","0");
                        input.setAttribute("step","1");
                        mode_params.appendChild(input);
                    }
                    else if(value.type===2){
                        let input = document.createElement("input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        input.setAttribute("type","text");
                        mode_params.appendChild(input);
                    }
                    else if(value.type===3){
                        let input = document.createElement("binary-input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        mode_params.appendChild(input);
                    }
                }
            }
        });
    }
    {
        let mode_name = document.getElementById("decrypt_block_mode_name");
        for(let [key,value] of Object.entries(crypto_mode_list)){
            let option = document.createElement("option");
            option.textContent = key;
            option.value = key;
            mode_name.appendChild(option);
        }
        mode_name.addEventListener("change", event=>{
            let mode_params = document.getElementById("decrypt_block_mode_params_field");
            let params = crypto_mode_list[event.target.value].params;
            if(Object.keys(params).length===0){
                mode_params.style.display="none";
            }
            else{
                mode_params.style.display="block";
                while(mode_params.firstChild){
                    mode_params.firstChild.remove();
                }
                mode_params.innerHTML=`<div class="crypto_field_title">工作模式额外参数</div>`;
                for(let [key,value] of Object.entries(params)){
                    let label = document.createElement("div")
                    label.textContent = key;
                    mode_params.appendChild(label);
                    if(value.type===0){
                        let input = document.createElement("input");
                        input.setAttribute("type","checkbox");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        mode_params.appendChild(input);
                    }
                    else if(value.type===1){
                        let input = document.createElement("input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        input.defaultValue = 0;
                        input.setAttribute("type","number");
                        input.setAttribute("min","0");
                        input.setAttribute("step","1");
                        mode_params.appendChild(input);
                    }
                    else if(value.type===2){
                        let input = document.createElement("input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        input.setAttribute("type","text");
                        mode_params.appendChild(input);
                    }
                    else if(value.type===3){
                        let input = document.createElement("binary-input");
                        input.setAttribute("id",`en_mode_param-${key}`);
                        mode_params.appendChild(input);
                    }
                }
            }
        });
    }
}
function ainit_crypto_mode(){
    window.electron.allBlockMode().then(init_crypto_mode);
}
ainit_crypto_mode();

var crypto_padding_list = [];
function init_crypto_padding(list){
    crypto_padding_list = list;
    {
        let paddings = document.getElementById("encrypt_block_padding_name");
        crypto_padding_list.forEach((padding)=>{
            let option = document.createElement("option");
            option.textContent = padding;
            option.value = padding;
            paddings.appendChild(option);
        })
    }
    {
        let paddings = document.getElementById("decrypt_block_padding_name");
        crypto_padding_list.forEach((padding)=>{
            let option = document.createElement("option");
            option.textContent = padding;
            option.value = padding;
            paddings.appendChild(option);
        })
    }
}
function ainit_crypto_padding(){
    window.electron.allBlockPadding().then(init_crypto_padding);
}
ainit_crypto_padding();

var encrypt_types = document.getElementsByName("encrypt_type");
encrypt_types.forEach((encrypt_type)=>{
    encrypt_type.addEventListener("change", event=>{
        let enc_areas = document.querySelectorAll(".crypto_area");
        enc_areas.forEach((item)=>{
            if(`encrypt_${event.target.value}_area`===item.id){
                item.style.display="block";
            }
            else{
                item.style.display="none";
            }
        })
    })
})
var decrypt_types = document.getElementsByName("decrypt_type");
decrypt_types.forEach((encrypt_type)=>{
    encrypt_type.addEventListener("change", event=>{
        let enc_areas = document.querySelectorAll(".crypto_area");
        enc_areas.forEach((item)=>{
            if(`decrypt_${event.target.value}_area`===item.id){
                item.style.display="block";
            }
            else{
                item.style.display="none";
            }
        })
    })
})
document.getElementById("decrypt_with_header").addEventListener("change", event=>{
    let cipher_choose = document.getElementById("decrypt_cipher");
    if(event.target.checked){
        cipher_choose.style.display="none";
    }
    else{
        cipher_choose.style.display="block";
    }
})


document.getElementById("encrypt_button").addEventListener("click", (event)=>{
    let args = {};
    try{
        let input = document.getElementById("encrypt_input").value;
        let output = document.getElementById("encrypt_output").value;
        let header = document.getElementById("encrypt_with_header").checked;
        if((input.type===4 && output.type!==4) ||(input.type!==4 && output.type===4)){
            throw Error("input type must match output when input file");
        }
        let key = document.getElementById("encrypt_key").value;
        // console.log(key);
        let encrypt_type = document.querySelector("input[type=\"radio\"][name=\"encrypt_type\"]:checked").value;
        args.input = input;
        args.output = output;
        args.key = key;
        args.type = encrypt_type;
        args.header = header;
        if(encrypt_type==="block"){
            let alg_name = document.getElementById("encrypt_block_algorithm_name").value;
            let alg_bs = document.getElementById("encrypt_block_algorithm_block_size").value;
            alg_bs = parseInt(alg_bs);
            let alg_ks = document.getElementById("encrypt_block_algorithm_key_size").value;
            alg_ks = parseInt(alg_ks);
            let alg = {
                name: alg_name,
                block: alg_bs,
                key: alg_ks
            }
            // console.log(alg);

            let mode_name = document.getElementById("encrypt_block_mode_name").value;
            let padding_name = document.getElementById("encrypt_block_padding_name").value;
            let params = {};
            document.getElementById("encrypt_block_mode_params_field").querySelectorAll("input").forEach((item)=>{
                let name = item.id.split("-")[1];
                let value = null;
                if(item.getAttribute("type")==="checkbox"){
                    value = item.checked;
                }
                else if(item.getAttribute("type")==="number"){
                    value = parseInt(item.value)
                }
                else if(item.getAttribute("type")==="text"){
                    value = item.getAttribute("value");
                }
                params[name] = value;
            })
            document.getElementById("encrypt_block_mode_params_field").querySelectorAll("binary-input").forEach((item)=>{
                let name = item.id.split("-")[1];
                params[name] = item.value;
            })
            let mode = {
                name:mode_name,
                padding:padding_name,
                params:params
            }
            // console.log(mode);
            args.cipher = {};
            args.cipher.algorithm = alg;
            args.cipher.mode = mode;
        }
        else if(encrypt_type==="stream"){
            let alg_name = document.getElementById("encrypt_stream_algorithm_name").value;
            let alg_bs = document.getElementById("encrypt_stream_algorithm_effective").value;
            alg_bs = parseInt(alg_bs);
            let alg_ks = document.getElementById("encrypt_stream_algorithm_key_size").value;
            alg_ks = parseInt(alg_ks);
            let alg = {
                name: alg_name,
                effective: alg_bs,
                key: alg_ks
            }
            args.cipher = {};
            args.cipher.algorithm = alg;
        }
        console.log(args)
    }
    catch(e){
        showing("1",e.message)
    }
    window.electron.encryptData(args).then((data)=>{
        if(data.type==="success"){
            if(typeof(data.result)==="string"){
                output.setText(data.result);
                showing("0","操作成功");
            }
            else if(typeof(data.result)==="number"){
                showing("0",`已添加至任务${data.result}`);}
        }
        else if(data.type==="error"){
            showing("1", data.message);
        }
    })
})
document.getElementById("decrypt_button").addEventListener("click", (event)=>{
    let args = {};
    try{
        let input = document.getElementById("decrypt_input").value;
        let output = document.getElementById("decrypt_output").value;
        let header = document.getElementById("decrypt_with_header").checked;
        if((input.type===4 && output.type!==4) ||(input.type!==4 && output.type===4)){
            throw Error("input type must match output when input file");
        }
        let key = document.getElementById("decrypt_key").value;
        // console.log(key);
        let encrypt_type = document.querySelector("input[type=\"radio\"][name=\"encrypt_type\"]:checked").value;
        args.input = input;
        args.output = output;
        args.key = key;
        args.type = encrypt_type;
        args.header = header;
        if(encrypt_type==="block"){
            let alg_name = document.getElementById("decrypt_block_algorithm_name").value;
            let alg_bs = document.getElementById("decrypt_block_algorithm_block_size").value;
            alg_bs = parseInt(alg_bs);
            let alg_ks = document.getElementById("decrypt_block_algorithm_key_size").value;
            alg_ks = parseInt(alg_ks);
            let alg = {
                name: alg_name,
                block: alg_bs,
                key: alg_ks
            }
            // console.log(alg);

            let mode_name = document.getElementById("decrypt_block_mode_name").value;
            let padding_name = document.getElementById("decrypt_block_padding_name").value;
            let params = {};
            document.getElementById("decrypt_block_mode_params_field").querySelectorAll("input").forEach((item)=>{
                let name = item.id.split("-")[1];
                let value = null;
                if(item.getAttribute("type")==="checkbox"){
                    value = item.checked;
                }
                else if(item.getAttribute("type")==="number"){
                    value = parseInt(item.value)
                }
                else if(item.getAttribute("type")==="text"){
                    value = item.getAttribute("value");
                }
                params[name] = value;
            })
            document.getElementById("decrypt_block_mode_params_field").querySelectorAll("binary-input").forEach((item)=>{
                let name = item.id.split("-")[1];
                params[name] = item.value;
            })
            let mode = {
                name:mode_name,
                padding:padding_name,
                params:params
            }
            // console.log(mode);
            args.cipher = {};
            args.cipher.algorithm = alg;
            args.cipher.mode = mode;
        }
        else if(encrypt_type==="stream"){
            let alg_name = document.getElementById("decrypt_stream_algorithm_name").value;
            let alg_bs = document.getElementById("decrypt_stream_algorithm_effective").value;
            alg_bs = parseInt(alg_bs);
            let alg_ks = document.getElementById("decrypt_stream_algorithm_key_size").value;
            alg_ks = parseInt(alg_ks);
            let alg = {
                name: alg_name,
                effective: alg_bs,
                key: alg_ks
            }
            args.cipher = {};
            args.cipher.algorithm = alg;
        }
        console.log(args)
    }
    catch(e){
        showing("1",e.message)

    }
    window.electron.decryptData(args).then((data)=>{
        if(data.type==="success"){
            if(typeof(data.result)==="string"){
                output.setText(data.result);
                showing("0","操作成功");
            }
            else if(typeof(data.result)==="number"){
                showing("0",`已添加至任务${data.result}`);}
        }
        else if(data.type==="error"){
            showing("1", data.message);
        }
    })
})

function rerender(elem){
    elem.render();
}
function reflush(){
    document.querySelectorAll("file-select").forEach(rerender);
    document.querySelectorAll("binary-textarea").forEach(rerender);
    document.querySelectorAll("binary-input").forEach(rerender);
    document.querySelectorAll("message-box").forEach(rerender);
    document.querySelectorAll("task-tag").forEach(rerender);
    document.querySelectorAll("task-label").forEach(rerender);
}
document.getElementById("setting_theme").addEventListener("change", (event)=>{
    changeTheme();
    initCss();
    reflush();
})
