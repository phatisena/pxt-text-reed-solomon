
//%block="reed solomon"
//%color="#31debe"
//%icon="\uf1c6"
namespace reedSolomon {

        let anmt = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        function decEncode(nvl: number, bvl: number, dvl: number): string {
            let sti = ""
            let ani = nvl
            if (ani > 0) {
                while (ani > 0) {
                    sti = "" + anmt.charAt(ani % bvl) + sti
                    ani = Math.floor(ani / bvl)
                }
            } else {
                sti = anmt.charAt(0)
            }
            if (dvl <= 0) {
                return sti
            }
            if (dvl - sti.length > 0) {
                while (dvl - sti.length > 0) {
                    sti = "" + anmt.charAt(0) + sti
                }
            }
            return sti
        }

        function decDecode(tvl: string, bvl: number): number {
            let stl = tvl.length
            let vld = 0
            let nvl = 0
            let vix = 0
            for (let nix = stl - 1; nix >= 0; nix--) {
                vix = anmt.indexOf(tvl.charAt(nix))
                if (vld == 0) {
                    nvl += vix
                    vld = bvl
                } else {
                    nvl += vix * vld
                    vld = vld * bvl
                }
            }
            return nvl
        }
    
    function remsplit(input:string[],text:string,rem:number) {
        let ustr = ""
        for (let i = 0; i < text.length ; i += rem) {
            ustr = text.substr(i,rem)
            input.push(ustr)
        }
        return input
    }

    // แปลงข้อความเป็นบิท (Binary)
    function stringToBits(input: string,mybit:number): string {
        let bits = "";
        for (let i = 0; i < input.length; i++) {
            let binary = decEncode(input.charCodeAt(i),2,mybit); // แปลงเป็นบิท 8 บิต
            bits += binary;
        }
        return bits;
    }

    // แปลงบิทกลับเป็นข้อความ
    function bitsToString(bits: string,mybit:number): string {
        let str = "";
        for (let i = 0; i < bits.length; i += mybit) {
            let byte = bits.substr(i, mybit);
            let charCode = decDecode(byte, 2);
            str += String.fromCharCode(charCode);
        }
        return str;
    }

    // สร้าง Generator Polynomial (โพลีนอร์มอลล์)
    function generateGeneratorPolynomial(redundancy: number, fieldSize: number): number[] {
        const poly: number[] = [1]; // เริ่มต้นด้วย 1
        for (let i = 0; i < redundancy; i++) {
            let root = Math.pow(fieldSize, i + 1);
            poly.push(root);
        }
        return poly;
    }

    // สร้างข้อมูลสำรอง (Redundant Data) โดยใช้ Generator Polynomial
    function generateRedundantData(data: string[], generatorPolynomial: number[], fieldSize: number): string[] {
        let dataValues = data.map(char => char.charCodeAt(0));
        let remainder = dataValues;
        let bitd = decEncode(fieldSize - 1, 2, 0).length
        for (let i = 0; i < generatorPolynomial.length; i++) {
            remainder = remainder.map((value, index) => value ^ generatorPolynomial[i]);
        }

        return remainder.map(value => decEncode(value, 2, bitd));
    }

    // ฟังก์ชัน Reed-Solomon Encode: การเข้ารหัสข้อมูลและเพิ่มข้อมูลสำรอง
    //%blockid=reedSolomon_encode
    //%block="rs encode $input redund $redundancy field $fieldSize"
    //%group="rs encrypt"
    //%weight=10
    export function reedSolomonEncode(input: string, redundancy: number, fieldSize: number): string {
        let bitd = decEncode(fieldSize - 1, 2, 0).length
        const originalData = stringToBits(input,bitd);
        const encodedData: string[] = remsplit([], originalData, bitd);

        // สร้าง Generator Polynomial
        const generatorPolynomial = generateGeneratorPolynomial(redundancy, fieldSize);

        // สร้างข้อมูลสำรอง (Redundant Data)
        const redundantData = generateRedundantData(originalData.split(''), generatorPolynomial, fieldSize);

        // เพิ่มข้อมูลสำรองลงในข้อมูลที่เข้ารหัส
        for (let i = 0; i < redundantData.join('').length; i++) {
            encodedData.push(redundantData.join('').charAt(i))
        }

        return encodedData.join('');
    }

    // ฟังก์ชัน Reed-Solomon Decode: การถอดรหัสและกู้ข้อมูล
    //%blockid=reedSolomon_decode
    //%block="rs decode $encodedData redund $redundancy field $fieldSize"
    //%group="rs encrypt"
    //%weight=5
    export function reedSolomonDecode(encodedData: string, redundancy: number, fieldSize: number): string {
        let bitd = decEncode(fieldSize - 1, 2, 0).length
        const originalDataLength = encodedData.length - redundancy;
        const originalData = encodedData.slice(0, originalDataLength);
        const recoveredData: string[] = originalData.split('');
        
        // สร้าง Generator Polynomial
        const generatorPolynomial = generateGeneratorPolynomial(redundancy, fieldSize);

        // ตรวจสอบและกู้ข้อมูลสำรองหากข้อมูลบางส่วนเสียหาย
        for (let i = 0; i < redundancy; i++) {
            const redundantData = encodedData[originalDataLength + i];
            if (!verifyRedundantData(redundantData, recoveredData, generatorPolynomial)) {
                // หากข้อมูลสำรองไม่ตรงจะทำการกู้ข้อมูลจากข้อมูลสำรอง
                recoveredData[i] = recoverDataFromBackup(redundantData);
            }
        }

        return bitsToString(recoveredData.join(''), bitd);
    }

    // ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลสำรอง
    function verifyRedundantData(redundantData: string, data: string[], generatorPolynomial: number[]): boolean {
        const dataValues = data.map(char => char.charCodeAt(0));
        const redundantValue = parseInt(redundantData, 2);

        return redundantValue === dataValues.reduce((sum, value, index) => sum ^ value, 0);
    }

    // ฟังก์ชันกู้ข้อมูลจากข้อมูลสำรอง
    function recoverDataFromBackup(redundantData: string): string {
        return String.fromCharCode(parseInt(redundantData, 2));
    }

    let redundLevel = 3; // จำนวนข้อมูลสำรอง
    let fieldS = 256; // ขนาดฟิลด์ (เช่น 256 สำหรับ GF(256))

    export enum fbitsize { bit8 = 8, bit12 = 12, bit16 = 16, bit24 = 24, bit32 = 32}

    function sumlen(bitc: number):number {
        let val = 0
        for (let i = 0;i < bitc;i++) {
            if (val <= 0) {
                val = 2
            } else {
                val *= 2
            }
        }
        return val
    }

    export interface rsfield {
        redun:number,
        fsize:number
    }

    //%blockid=reedSolomon_setfield
    //%block="get $fsize as redund and field"
    //%group="field"
    //%weight=10
    export function setfield(fsize: fbitsize) {
        redundLevel = Math.floor(Math.map(redundLevel,0,fieldS,0,sumlen(fsize)))
        fieldS = sumlen(fsize)
        let myrsf:rsfield = null; 
        myrsf.redun = redundLevel
        myrsf.fsize = fieldS
        return myrsf
    }

    export enum fetype { redund = 1, fieldsize = 2}

    //%blockid=reedSolomon_getfield
    //%block="get $myrsf in $ft"
    //%group="field"
    //%weight=5
    export function getfield(myrsf:rsfield,ft:fetype) {
        switch (ft) {
            case 1:
            return myrsf.redun
            case 2:
            return myrsf.fsize
            default:
            return -1
        }
    }
}
