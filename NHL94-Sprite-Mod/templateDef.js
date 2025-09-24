export const global = {
    "palette": {
        "brown": "144 108 0",
        "black": "0 0 0",
        "blackMedium": "36 36 36",
        "darkBrown": "108 72 36",
        "flesh": "216 144 108",
        "flesh2": "216 144 108",
        "flesh3": "180 108 72",
        "flesh3bit": "216 144 108",
        "flesh3bit2": "180 108 72",
        "white": "252 252 252",
        "whiteMedium": "216 216 216",
    },
    "mapping": {
        "stick": "brown",
        "equipment": "black",
        "eyes": "darkBrown",
        "skin1": "flesh3bit",
        "skin2": "flesh3bit2",
        "skin3": "flesh3bit2",
        "skateBlade": "white"
    }
};

export const homePals = [ 
    { name: 'BOS', template: 'universal'}, 
    { name: 'BUF', template: 'universal'}, 
    { name: 'CGY', template: 'universal'}, 
    { name: 'CHI', template: 'universal'}, 
    { name: 'DET', template: 'universal'}, 
    { name: 'EDM', template: 'universal'}, 
    { name: 'HFD', template: 'universal'}, 
    { name: 'LA', template: 'universal'}, 
    { name: 'DAL', template: 'longArms'}, 
    { name: 'MTL', template: 'universal'}, 
    { name: 'NJ', template: 'universal'}, 
    { name: 'NYI', template: 'universal'}, 
    { name: 'NYR', template: 'universal'}, 
    { name: 'OTT', template: 'universal'}, 
    { name: 'PHI', template: 'armSwoop'}, 
    { name: 'PIT', template: 'universal'}, 
    { name: 'QUE', template: 'waistDots'}, 
    { name: 'STL', template: 'universal'}, 
    { name: 'SJ', template: 'universal'}, 
    { name: 'TB', template: 'universal'}, 
    { name: 'TOR', template: 'universal'}, 
    { name: 'VAN', template: 'universal'}, 
    { name: 'WSH', template: 'armDots'}, 
    { name: 'WPG', template: 'universal'}, 
    { name: 'ANA', template: 'vArm'}, 
    { name: 'FLA', template: 'aArm'}, 
    { name: 'ASW', template: 'star'}, 
    { name: 'ASE', template: 'star'}, 
];

export const awayPals = [ 
    { name: 'BOS', template: 'universal'}, 
    { name: 'BUF', template: 'universal'}, 
    { name: 'CGY', template: 'universal'}, 
    { name: 'CHI', template: 'universal'}, 
    { name: 'DET', template: 'universal'}, 
    { name: 'EDM', template: 'universal'}, 
    { name: 'HFD', template: 'universal'}, 
    { name: 'LA', template: 'universal'}, 
    { name: 'DAL', template: 'universal'}, 
    { name: 'MTL', template: 'universal'}, 
    { name: 'NJ', template: 'universal'}, 
    { name: 'NYI', template: 'universal'}, 
    { name: 'NYR', template: 'universal'}, 
    { name: 'OTT', template: 'universal'}, 
    { name: 'PHI', template: 'armSwoop'}, 
    { name: 'PIT', template: 'universal'}, 
    { name: 'QUE', template: 'waistDots'}, 
    { name: 'STL', template: 'universal'}, 
    { name: 'SJ', template: 'universal'}, 
    { name: 'TB', template: 'universal'}, 
    { name: 'TOR', template: 'universal'}, 
    { name: 'VAN', template: 'universal'}, 
    { name: 'WSH', template: 'armDots'}, 
    { name: 'WPG', template: 'universal'}, 
    { name: 'ANA', template: 'vArm'}, 
    { name: 'FLA', template: 'aArm'}, 
    { name: 'ASW', template: 'star'}, 
    { name: 'ASE', template: 'star'}, 
];

export const templates = [
    { name: 'universal', 
        components: ['forearm', 'armStripe1', 'armStripe2', 'armStripe3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'waistDots', 
        components: ['forearm', 'armStripe1', 'armStripe2', 'armStripe3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waistDots', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'vArm', 
        components: ['forearm', 'vArmStripe1', 'vArmStripe2', 'vArmStripe3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'aArm', 
        components: ['forearm', 'aArmStripe1', 'aArmStripe2', 'aArmStripe3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'armSwoop', 
        components: ['armSwoopInner', 'armSwoopBorder', 'armSwoopOuter', 'vArmStripe1', 'vArmStripe2', 'vArmStripe3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'star', 
        components: ['forearm', 'starArmLower', 'starArmInnerStripe', 'starArmOuterStripe', 'starArmUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'starWaist2', 'starWaist3', 'starWaist4','pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    { name: 'longArms',
        components: ['armOuterStripe', 'armMiddleStripe', 'armInnerStripe', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
    // armDots
    { name: 'armDots', 
        components: ['forearm', 'armDot1', 'armDot2', 'armDot3', 'armUpper', 'yolkCorner', 'shoulderPatch', 'yolk3', 'yolk1', 'yolk2', 'goalieMask', 'jersey', 
        'waist1', 'waist2', 'waist3', 'pants', 'pantsStripe2', 'pantsStripe1', 'socks', 'socksStripe1', 'socksStripe2', 'helmet'] },
];

   
    // Jersey component mapping (colors 144-191)
export const jerseyMapping = [
    // 144-146: forearm (dark, medium, light)
    { name: 'forearm', indices: [144, 145, 146], shades: ['dark', 'medium', 'light'] },
    // 147-149: armStripe3 (light, medium, dark)  
    { name: 'armStripe3', indices: [147, 148, 149], shades: ['light', 'medium', 'dark'] },
    // 150-152: armStripe2 (dark, medium, light)
    { name: 'armStripe2', indices: [150, 151, 152], shades: ['dark', 'medium', 'light'] },
    // 153-155: armStripe1 (light, medium, dark)
    { name: 'armStripe1', indices: [153, 154, 155], shades: ['light', 'medium', 'dark'] },
    // 147-149: armDot3 (light, medium, dark)  
    { name: 'armDot3', indices: [147], shades: ['light'] },
    // 150-152: armDot2 (dark, medium, light)
    { name: 'armDot2', indices: [152], shades: ['light'] },
    // 153-155: armDot1 (light, medium, dark)
    { name: 'armDot1', indices: [153], shades: ['light'] },
    // vArmStripe3 (light, medium)  
    { name: 'vArmStripe3', indices: [147, 148], shades: ['light', 'medium'] },
    // vArmStripe2 (dark, medium, light)
    { name: 'vArmStripe2', indices: [149, 151, 152], shades: ['dark', 'medium', 'light'] },
    // vArmStripe1 (light, medium, dark)
    { name: 'vArmStripe1', indices: [153, 154, 150], shades: ['light', 'medium', 'dark'] },
    // aArmStripe3 (medium, dark)  
    { name: 'aArmStripe3', indices: [148, 149], shades: ['medium', 'dark'] },
    // aArmStripe2 (dark, medium, light)
    { name: 'aArmStripe2', indices: [150, 151, 147], shades: ['dark', 'medium', 'light'] },
    // aArmStripe1 (light, medium, dark)
    { name: 'aArmStripe1', indices: [152, 154, 155], shades: ['light', 'medium', 'dark'] },
    // 156-158: armUpper (light, medium, dark)
    { name: 'armUpper', indices: [156, 157, 158], shades: ['light', 'medium', 'dark'] },
    // armSwoopInner
    { name: 'armSwoopInner', indices: [158], shades: ['dark'] },
    // armSwoopBorder
    { name: 'armSwoopBorder', indices: [157, 155], shades: ['medium', 'dark'] },
    // armSwoopOuter
    { name: 'armSwoopOuter', indices: [156], shades: ['light'] },
    // armOuterStripe 146l, 147l, 152l, 153l, 156l,
    { name: 'armOuterStripe', indices: [146, 147, 152, 153, 156], shades: ['light', 'light', 'light', 'light', 'light'] },
    // armMiddleStripe 145m, 148m, 151m, 154m, 157m,
    { name: 'armMiddleStripe', indices: [145, 148, 151, 154, 157], shades: ['medium', 'medium', 'medium', 'medium', 'medium'] },
    // armInnerStripe 144d, 149d, 150d, 155d, 158d
    { name: 'armInnerStripe', indices: [144, 149, 150, 155, 158], shades: ['dark', 'dark', 'dark', 'dark', 'dark'] },
    // 148m, 149d, 150d  - starArmLower
    { name: 'starArmLower', indices: [148, 149, 150], shades: ['medium', 'dark', 'dark'] },
    // 155d, 151m, 147l, 158d - starArmInnerStripe
    { name: 'starArmInnerStripe', indices: [155, 151, 147, 158], shades: ['dark', 'medium', 'light', 'dark'] },
    // 152l, 154m - starArmOuterStripe
    { name: 'starArmOuterStripe', indices: [152, 154], shades: ['light', 'medium'] },
    // 153l, 156l, 157m - armcolor -- starArmUpper
    { name: 'starArmUpper', indices: [153, 156, 157], shades: ['light', 'light', 'medium'] },
    // starWaist2 - 172m, 173d
    { name: 'starWaist2', indices: [172, 173], shades: ['medium', 'dark'] },
    // starWaist3 - 171l, 175m, 176d
    { name: 'starWaist3', indices: [171, 175, 176], shades: ['light', 'medium', 'dark'] },
    // starWaist4 - 174l
    { name: 'starWaist4', indices: [174], shades: ['light'] },
    // 159: yolkCorner
    { name: 'yolkCorner', indices: [159], shades: ['medium'] },
    // 160: shoulderPatch
    { name: 'shoulderPatch', indices: [160], shades: ['medium'] },
    // 161: yolk3
    { name: 'yolk3', indices: [161], shades: ['medium'] },
    // 162: yolk1
    { name: 'yolk1', indices: [162], shades: ['medium'] },
    // 163: yolk2
    { name: 'yolk2', indices: [163], shades: ['medium'] },
    // 164-167: jersey (goalieMask, light, medium, dark)
    { name: 'goalieMask', indices: [164], shades: ['medium'] },
    { name: 'jersey', indices: [165, 166, 167], shades: ['light', 'medium', 'dark'] },
    // waistDots (odd, even, hidden)
    { name: 'waistDots', indices: [168], shades: ['light'] },
    // 168-170: waist1 (odd, even, hidden)
    { name: 'waist1', indices: [168, 169, 170], shades: ['light', 'medium', 'dark'] },
    // 171-173: waist2 (light, medium, dark)
    { name: 'waist2', indices: [171, 172, 173], shades: ['light', 'medium', 'dark'] },
    // 174-176: waist3 (light, medium, dark)
    { name: 'waist3', indices: [174, 175, 176], shades: ['light', 'medium', 'dark'] },
    // 177-180: pants (dark, pantsStripe2, pantsStripe1, medium)
    { name: 'pants', indices: [177, 180], shades: ['dark', 'medium'] }, // 177 and 180 for dark and medium
    { name: 'pantsStripe2', indices: [178], shades: ['medium'] },
    { name: 'pantsStripe1', indices: [179], shades: ['medium'] },
    // 181-183: socks (light, medium, dark)
    { name: 'socks', indices: [181, 182, 183], shades: ['light', 'medium', 'dark'] },
    // 184-186: socksStripe1 (light, medium, dark)
    { name: 'socksStripe1', indices: [184, 185, 186], shades: ['light', 'medium', 'dark'] },
    // 187-189: socksStripe2 (light, medium, dark)
    { name: 'socksStripe2', indices: [187, 188, 189], shades: ['light', 'medium', 'dark'] },
    // 190-191: helmet (medium, dark)
    { name: 'helmet', indices: [190, 191], shades: ['medium', 'dark'] }
];

// module.exports = [global, homePals, awayP];