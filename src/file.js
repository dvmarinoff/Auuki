//
// File Handler
//
import { dateToDashString } from './utils.js';

class FileHandler {
    Type = {
        OctetStream: 'application/octet-stream',
        textPlain: 'text/plain',
    }

    constructor(args) {}
    readTextFile(file) {
        const self = this;
        const reader = new FileReader();
        reader.readAsText(file);

        return new Promise((resolve, reject) => {
            reader.onload = function(event) {
                return resolve(reader.result);
            };
            reader.onerror = function(event) {
                return reject(reader.error);
            };
        });
    }
    readBinaryFile(file) {
        const self = this;
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        return new Promise((resolve, reject) => {
            reader.onload = function(event) {
                return resolve(reader.result);
            };
            reader.onerror = function(event) {
                return reject(reader.error);
            };
        });
    }
    unsupporedFormat() {
        console.warn(`.fit workout files and other binary formats are not yet supported!`);
    }
    read(file) {
        const self = this;
        let ext = file.name.split('.').pop();
        switch(ext) {
            case 'zwo': return self.readTextFile(file); break;
            case 'erg': return self.readTextFile(file); break;
            case 'mrc': return self.readTextFile(file); break;
            case 'fit': return self.readBinaryFile(file); break;
            case 'gpx': return self.readTextFile(file); break;
            default:           self.unsupportedFormat(); break;
        }
    }
    toBlob(buffer, type) {
        const self = this;
        return new Blob([buffer], {type: type ?? self.Type.OctetStream});
    }
    download() {
        const self = this;
        let a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        return function (buffer, name, type) {
            let url = window.URL.createObjectURL(self.toBlob(buffer, type));
            a.href = url;
            a.download = name;
            a.click();
            window.URL.revokeObjectURL(url);
        };
    };
}

const fileHandler = new FileHandler();

export { fileHandler };
