const hex = "00000004C40000054480003D31660065305500653044036547777780041F0018510088510092" +
            "8A2031110E2228822233322234443298229998888920001130770199886804981118778134" +
            "119CFF018287828000613055072144444321777788E048FD48B04387700718A8005E007180";

const bytes = [];
for (let i = 0; i < hex.length; i += 2) {
    if (i + 1 < hex.length) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
}

console.log('Bytes around offset 45 (where 0x82 command is):');
for (let i = 40; i < 55; i++) {
    console.log(`${i}: 0x${bytes[i].toString(16).padStart(2, '0')}`);
}

console.log('\nFull hex analysis:');
console.log('Offset 12 (start): 0x31 0x66 0x00 0x65 (31 66 00 65)');
console.log('Offset 43: 0x22 (copy from offset)');
console.log('Offset 45: 0x82 (long repeat command)');
console.log('Offset 46: 0x22 (parameter 1)');
console.log('Offset 47: 0x33 (parameter 2)');
console.log('Offset 48: 0x32 (next command)');
