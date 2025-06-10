const fs = require('fs');

const hex = "00000004C40000054480003D31660065305500653044036547777780041F0018510088510092" +
           "8A2031110E2228822233322234443298229998888920001130770199886804981118778134" +
           "119CFF018287828000613055072144444321777788E048FD48B04387700718A8005E007180";

const bytes = [];
for (let i = 0; i < hex.length; i += 2) {
    if (i + 1 < hex.length) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
}

fs.writeFileSync('test-sample.map.jim', Buffer.from(bytes));
console.log(`Created test-sample.map.jim (${bytes.length} bytes)`);
